from fastapi import FastAPI, APIRouter, HTTPException, status, Depends
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime, date, timedelta
from bson import ObjectId
from jose import jwt
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials



ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]
JWT_SECRET = os.environ.get("JWT_SECRET", "change_this_secret")
JWT_ALGORITHM = os.environ.get("JWT_ALGORITHM", "HS256")
#print("JWT SECRET:", JWT_SECRET)
#print("JWT ALGORITHM:", JWT_ALGORITHM)

def create_access_token(data: dict):
    token_data = data.copy()

    expire = datetime.utcnow() + timedelta(days=30)

    token_data.update({
        "exp": expire
    })

    return jwt.encode(
        token_data,
        JWT_SECRET,
        algorithm=JWT_ALGORITHM
    )
security = HTTPBearer()


async def verify_token(
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    token = credentials.credentials

    print("TOKEN RECEIVED:")
    print(token)

    try:
        payload = jwt.decode(
            token,
            JWT_SECRET,
            algorithms=[JWT_ALGORITHM]
        )

        print("TOKEN PAYLOAD:")
        print(payload)

        return payload

    except Exception as e:
        print("JWT ERROR:")
        print(str(e))

        raise HTTPException(
            status_code=401,
            detail="Invalid or expired token"
        )
    
# Create the main app without a prefix
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")


# Helper function to convert ObjectId to string
def serialize_doc(doc):
    if doc and "_id" in doc:
        doc["_id"] = str(doc["_id"])
    return doc


# Define Models
class User(BaseModel):
    name: str
    pin: str
    role: str = "player"  # admin or player
    balance: float = 0.0
    phone: Optional[str] = None
    is_active: bool = True
    created_at: datetime = Field(default_factory=datetime.utcnow)


class UserResponse(BaseModel):
    id: str
    name: str
    role: str
    balance: float
    phone: Optional[str]
    is_active: bool


class LoginRequest(BaseModel):
    name: str
    pin: str


class Session(BaseModel):
    date: str
    court_fee: float
    players_present: List[str]  # List of user IDs
    amount_per_player: float
    created_by: str
    created_at: datetime = Field(default_factory=datetime.utcnow)


class SessionCreate(BaseModel):
    date: str
    court_fee: float
    players_present: List[str]


class SessionUpdate(BaseModel):
    date: Optional[str] = None
    court_fee: Optional[float] = None
    players_present: Optional[List[str]] = None
    
class OtherExpense(BaseModel):
    amount: float
    description: str
    created_by: str
    created_at: datetime = Field(default_factory=datetime.utcnow)
    amount_per_player: float = 0.0
    players_charged: List[str] = []


class Transaction(BaseModel):
    user_id: str
    amount: float
    type: str  # deposit, deduction
    session_id: Optional[str] = None
    expense_id: Optional[str] = None
    description: str
    date: datetime = Field(default_factory=datetime.utcnow)


class DepositRequest(BaseModel):
    user_id: str
    amount: float


class Notification(BaseModel):
    user_id: str
    message: str
    type: str  # low_balance, payment_reminder
    read: bool = False
    created_at: datetime = Field(default_factory=datetime.utcnow)


# Auth Routes
@api_router.post("/auth/login")
async def login(request: LoginRequest):
    print("LOGIN RECEIVED:", request.name, request.pin)
    # Case-insensitive name match, trim whitespace
    name_clean = request.name.strip()
    pin_clean = request.pin.strip()
    user = await db.users.find_one({
        "name": name_clean,
        "pin": pin_clean,
        "is_active": True
    })
    if not user:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    token = create_access_token({
    "user_id": str(user["_id"]),
    "role": user["role"]
})

    return {
    "token": token,
    "id": str(user["_id"]),
    "name": user["name"],
    "role": user["role"],
    "balance": user["balance"],
    "phone": user.get("phone"),
    "is_active": user["is_active"]
}


@api_router.post("/auth/register")
async def register(user: User):
    print("Register request received:", user.model_dump())

    # Check existing user by phone number
    existing = await db.users.find_one(
        {
            "phone": user.phone
        }
    )

    if existing and existing.get("is_active"):
        raise HTTPException(
            status_code=400,
            detail="User already exists with this phone number"
        )

    # Create user
    user_dict = user.model_dump()

    result = await db.users.insert_one(user_dict)

    # Create initial balance transaction only if balance > 0
    if user.balance > 0:
        initial_transaction = Transaction(
            user_id=str(result.inserted_id),
            amount=user.balance,
            type="deposit",
            description="Initial balance"
        )

        await db.transactions.insert_one(
            initial_transaction.model_dump()
        )

    return {
        "id": str(result.inserted_id),
        "name": user.name,
        "role": user.role,
        "balance": user.balance,
        "phone": user.phone,
        "is_active": user.is_active
    }


# Player Routes
@api_router.get("/players")
async def get_players():
    players = await db.users.find({"is_active": True}).to_list(1000)
    return [
        {
            "id": str(p["_id"]),
            "name": p["name"],
            "role": p["role"],
            "balance": p["balance"],
            "phone": p.get("phone"),
            "is_active": p["is_active"]
        }
        for p in players
    ]


@api_router.get("/players/{player_id}")
async def get_player(player_id: str):
    player = await db.users.find_one({"_id": ObjectId(player_id)})
    if not player:
        raise HTTPException(status_code=404, detail="Player not found")
    
    return {
        "id": str(player["_id"]),
        "name": player["name"],
        "role": player["role"],
        "balance": player["balance"],
        "phone": player.get("phone"),
        "is_active": player["is_active"]
    }


@api_router.put("/players/{player_id}")
async def update_player(player_id: str, update_data: dict):
    result = await db.users.update_one(
        {"_id": ObjectId(player_id)},
        {"$set": update_data}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Player not found")
    
    return {"message": "Player updated successfully"}


@api_router.delete("/players/{player_id}")
async def delete_player(player_id: str):
    # Soft delete
    result = await db.users.update_one(
        {"_id": ObjectId(player_id)},
        {"$set": {"is_active": False}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Player not found")
    
    return {"message": "Player deleted successfully"}


# Session Routes
@api_router.post("/sessions")
async def create_session(session_data: SessionCreate, admin_id: str):
    # Verify admin
    admin = await db.users.find_one({"_id": ObjectId(admin_id)})
    if not admin or admin["role"] != "admin":
        raise HTTPException(status_code=403, detail="Only admin can create sessions")
    
    # Calculate amount per player
    num_players = len(session_data.players_present)
    if num_players == 0:
        raise HTTPException(status_code=400, detail="No players marked present")
    
    amount_per_player = session_data.court_fee / num_players
    
    # Create session
    session = Session(
        date=session_data.date,
        court_fee=session_data.court_fee,
        players_present=session_data.players_present,
        amount_per_player=amount_per_player,
        created_by=admin_id
    )
    
    result = await db.sessions.insert_one(session.dict())
    session_id = str(result.inserted_id)
    
    # Deduct from each player and create transactions
    for player_id in session_data.players_present:
        # Deduct balance
        await db.users.update_one(
            {"_id": ObjectId(player_id)},
            {"$inc": {"balance": -amount_per_player}}
        )
        
        # Create transaction
        transaction = Transaction(
            user_id=player_id,
            amount=amount_per_player,
            type="deduction",
            session_id=session_id,
            description=f"Court fee for {session_data.date}"
        )
        await db.transactions.insert_one(transaction.dict())
        
        # Check balance and create tiered notification
        player = await db.users.find_one({"_id": ObjectId(player_id)})
        if player:
            balance = player["balance"]
            message = None
            if balance < 0:
                message = f"Critical! Your balance is ₹{balance:.2f} (negative). Please add funds immediately."
            elif balance == 0:
                message = "Your balance is ₹0. Please add funds to continue playing."
            elif balance < 100:
                message = f"Very low balance! Only ₹{balance:.2f} left. Please add funds."
            elif balance < 200:
                message = f"Low balance alert. Your balance is ₹{balance:.2f}. Consider adding funds."
            
            if message:
                notification = Notification(
                    user_id=player_id,
                    message=message,
                    type="low_balance"
                )
                await db.notifications.insert_one(notification.dict())
    
    return {
        "id": session_id,
        "message": "Session created successfully",
        "amount_per_player": amount_per_player
    }


@api_router.get("/sessions")
async def get_sessions(
    user=Depends(verify_token),
    limit: int = 50
):
    # Admins can see all sessions
    if user.get("role") == "admin":
        query = {}
    else:
        # Players can only see sessions where they were present
        query = {
            "players_present": user["user_id"]
        }
        print("AUTH USER:", user)
        print("USER ID:", user.get("user_id"))
        print("USER ID TYPE:", type(user.get("user_id")))
        print("ROLE:", user.get("role"))
        print("SESSION QUERY:", query)

    sessions = await db.sessions.find(query).sort(
        "created_at", -1
    ).limit(limit).to_list(limit)

    result = []

    for session in sessions:
        # Get player names
        player_names = []

        for player_id in session["players_present"]:
            player = await db.users.find_one({
                "_id": ObjectId(player_id)
            })

            if player:
                player_names.append(player["name"])

        result.append({
            "id": str(session["_id"]),
            "date": session["date"],
            "court_fee": session["court_fee"],
            "players_present": session["players_present"],
            "player_names": player_names,
            "amount_per_player": session["amount_per_player"],
            "created_at": session["created_at"].isoformat()
        })

    return result

@api_router.get("/sessions/{session_id}")
async def get_session(session_id: str):
    session = await db.sessions.find_one({"_id": ObjectId(session_id)})

    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    return {
        "id": str(session["_id"]),
        "date": session["date"],
        "court_fee": session["court_fee"],
        "players_present": session["players_present"],
        "amount_per_player": session["amount_per_player"],
        "created_at": session["created_at"].isoformat(),
    }

@api_router.put("/sessions/{session_id}")
async def update_session(session_id: str, update_data: SessionUpdate, admin_id: str):
    # Verify admin
    admin = await db.users.find_one({"_id": ObjectId(admin_id)})
    if not admin or admin["role"] != "admin":
        raise HTTPException(status_code=403, detail="Only admin can update sessions")
    
    # Get old session
    old_session = await db.sessions.find_one({"_id": ObjectId(session_id)})
    if not old_session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    # Reverse old transactions
    for player_id in old_session["players_present"]:
        await db.users.update_one(
            {"_id": ObjectId(player_id)},
            {"$inc": {"balance": old_session["amount_per_player"]}}
        )
    
    # Delete old transactions
    await db.transactions.delete_many({"session_id": session_id})
    
    # Calculate new amount per player
    new_court_fee = update_data.court_fee if update_data.court_fee else old_session["court_fee"]
    new_players = update_data.players_present if update_data.players_present else old_session["players_present"]
    new_date = update_data.date if update_data.date else old_session["date"]
    
    amount_per_player = new_court_fee / len(new_players)
    
    # Update session
    await db.sessions.update_one(
        {"_id": ObjectId(session_id)},
        {"$set": {
            "date": new_date,
            "court_fee": new_court_fee,
            "players_present": new_players,
            "amount_per_player": amount_per_player
        }}
    )
    
    # Create new transactions
    for player_id in new_players:
        await db.users.update_one(
            {"_id": ObjectId(player_id)},
            {"$inc": {"balance": -amount_per_player}}
        )
        
        transaction = Transaction(
            user_id=player_id,
            amount=amount_per_player,
            type="deduction",
            session_id=session_id,
            description=f"Court fee for {new_date}"
        )
        await db.transactions.insert_one(transaction.dict())
    
    return {"message": "Session updated successfully"}


@api_router.delete("/sessions/{session_id}")
async def delete_session(
    session_id: str,
    user=Depends(verify_token)
):
    # Verify admin from JWT
    if user.get("role") != "admin":
        raise HTTPException(
            status_code=403,
            detail="Only admin can delete sessions"
        )

    # Get session
    try:
        session = await db.sessions.find_one({
            "_id": ObjectId(session_id)
        })
    except Exception:
        raise HTTPException(
            status_code=400,
            detail="Invalid session ID"
        )

    if not session:
        raise HTTPException(
            status_code=404,
            detail="Session not found"
        )

    # Refund each player
    amount_per_player = session["amount_per_player"]

    for player_id in session["players_present"]:
        await db.users.update_one(
            {"_id": ObjectId(player_id)},
            {"$inc": {"balance": amount_per_player}}
        )

    # Delete transactions belonging to this session
    await db.transactions.delete_many({
        "session_id": session_id
    })

    # Delete session
    await db.sessions.delete_one({
        "_id": ObjectId(session_id)
    })

    return {
        "message": "Session deleted successfully",
        "refunded_amount_per_player": amount_per_player,
        "players_refunded": len(session["players_present"])
    }

# Other Expense Routes
@api_router.post("/expenses")
async def add_expense(expense: OtherExpense, admin_id: str):
    # Verify admin
    admin = await db.users.find_one({
        "_id": ObjectId(admin_id)
    })

    if not admin or admin["role"] != "admin":
        raise HTTPException(
            status_code=403,
            detail="Only admin can add expenses"
        )

    # Validate amount
    if expense.amount <= 0:
        raise HTTPException(
            status_code=400,
            detail="Expense amount must be greater than 0"
        )

    # Get all active players
    players = await db.users.find({
        "is_active": True
    }).to_list(1000)

    if not players:
        raise HTTPException(
            status_code=400,
            detail="No active players found"
        )

    # Split expense equally
    amount_per_player = expense.amount / len(players)

    # Create expense record
    expense_data = expense.model_dump()
    expense_data["amount_per_player"] = amount_per_player
    expense_data["players_charged"] = [
    str(player["_id"]) for player in players
]
    result = await db.expenses.insert_one(expense_data)

    expense_id = str(result.inserted_id)

    # Deduct from every player
    for player in players:
        player_id = str(player["_id"])

        await db.users.update_one(
            {"_id": player["_id"]},
            {"$inc": {"balance": -amount_per_player}}
        )

        # Create separate transaction for each player
        transaction = Transaction(
            user_id=player_id,
            amount=amount_per_player,
            type="deduction",
            expense_id=expense_id,
            description=f"Other expense: {expense.description}"
        )

        await db.transactions.insert_one(
            transaction.model_dump()
        )

    return {
        "id": expense_id,
        "message": "Expense added successfully",
        "total_amount": expense.amount,
        "players_count": len(players),
        "amount_per_player": amount_per_player,
        "description": expense.description
    }

@api_router.delete("/expenses/{expense_id}")
async def delete_expense(expense_id: str, admin_id: str):
    # Verify admin
    try:
        admin = await db.users.find_one({
            "_id": ObjectId(admin_id)
        })
    except Exception:
        raise HTTPException(
            status_code=400,
            detail="Invalid admin ID"
        )

    if not admin or admin["role"] != "admin":
        raise HTTPException(
            status_code=403,
            detail="Only admin can delete expenses"
        )

    # Find expense
    try:
        expense = await db.expenses.find_one({
            "_id": ObjectId(expense_id)
        })
    except Exception:
        raise HTTPException(
            status_code=400,
            detail="Invalid expense ID"
        )

    if not expense:
        raise HTTPException(
            status_code=404,
            detail="Expense not found"
        )

    amount_per_player = expense.get("amount_per_player")

    players_charged = expense.get("players_charged", [])

    # Make sure old expenses can still be handled safely
    if amount_per_player is None or not players_charged:
        raise HTTPException(
            status_code=400,
            detail="This expense cannot be deleted because player charge information is missing"
        )

    # Refund each player
    for player_id in players_charged:
        try:
            await db.users.update_one(
                {"_id": ObjectId(player_id)},
                {"$inc": {"balance": amount_per_player}}
            )
        except Exception:
            continue

    # Delete transactions belonging to this expense
    await db.transactions.delete_many({
        "expense_id": expense_id
    })

    # Delete expense
    await db.expenses.delete_one({
        "_id": ObjectId(expense_id)
    })

    return {
        "message": "Expense deleted successfully",
        "refunded_amount_per_player": amount_per_player,
        "players_refunded": len(players_charged)
    }

@api_router.get("/expenses")
async def get_expenses(admin_id: str):
    # Verify admin
    try:
        admin = await db.users.find_one({
            "_id": ObjectId(admin_id)
        })
    except Exception:
        raise HTTPException(
            status_code=400,
            detail="Invalid admin ID"
        )

    if not admin or admin["role"] != "admin":
        raise HTTPException(
            status_code=403,
            detail="Only admin can view expenses"
        )

    expenses = await db.expenses.find().sort(
        "created_at", -1
    ).to_list(1000)

    return [
        {
            "id": str(expense["_id"]),
            "amount": expense["amount"],
            "description": expense["description"],
            "created_by": expense["created_by"],
            "amount_per_player": expense.get("amount_per_player", 0),
            "players_charged": expense.get("players_charged", []),
            "created_at": expense["created_at"].isoformat(),
        }
        for expense in expenses
    ]

# Deposit Routes
@api_router.post("/deposits")
async def add_deposit(deposit: DepositRequest):
    # Update balance
    result = await db.users.update_one(
        {"_id": ObjectId(deposit.user_id)},
        {"$inc": {"balance": deposit.amount}}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Create transaction
    transaction = Transaction(
        user_id=deposit.user_id,
        amount=deposit.amount,
        type="deposit",
        description="Monthly deposit"
    )
    await db.transactions.insert_one(transaction.dict())
    
    return {"message": "Deposit added successfully"}


# Transaction Routes
@api_router.get("/transactions/my")
async def get_my_transactions(
    user=Depends(verify_token),
    limit: int = 100
):
    user_id = user["user_id"]

    transactions = await db.transactions.find(
        {"user_id": user_id}
    ).sort("date", -1).limit(limit).to_list(limit)
    print("USER ID:", user_id)
    print("TRANSACTIONS:", transactions)

    return [
        {
            "id": str(t["_id"]),
            "amount": t["amount"],
            "type": t["type"],
            "description": t["description"],
            "date": t["date"].isoformat()
        }
        for t in transactions
    ]

@api_router.get("/transactions/monthly-summary")
async def get_monthly_summary(month: str):
    # month format: "2024-01"
    start_date = datetime.strptime(f"{month}-01", "%Y-%m-%d")
    if start_date.month == 12:
        end_date = datetime(start_date.year + 1, 1, 1)
    else:
        end_date = datetime(start_date.year, start_date.month + 1, 1)
    
    # Get all transactions in the month
    transactions = await db.transactions.find({
        "date": {"$gte": start_date, "$lt": end_date}
    }).to_list(1000)
    
    # Calculate summary per user
    user_summary = {}
    for t in transactions:
        user_id = t["user_id"]
        if user_id not in user_summary:
            user = await db.users.find_one({"_id": ObjectId(user_id)})
            user_summary[user_id] = {
                "user_name": user["name"] if user else "Unknown",
                "total_deposits": 0,
                "total_deductions": 0,
                "net": 0
            }
        
        if t["type"] == "deposit":
            user_summary[user_id]["total_deposits"] += t["amount"]
        else:
            user_summary[user_id]["total_deductions"] += t["amount"]
        
        user_summary[user_id]["net"] = user_summary[user_id]["total_deposits"] - user_summary[user_id]["total_deductions"]
    
    return list(user_summary.values())


@api_router.get("/transactions")
async def get_all_transactions(user=Depends(verify_token)):
    transactions = await db.transactions.find().sort("date", -1).to_list(1000)

    result = []

    for t in transactions:
        user = await db.users.find_one({"_id": ObjectId(t["user_id"])})

        result.append({
            "id": str(t["_id"]),
            "user_id": t["user_id"],
            "user_name": user["name"] if user else "Unknown",
            "amount": t["amount"],
            "type": t["type"],
            "description": t["description"],
            "date": t["date"].isoformat()
        })

    return result


# Notification Routes
@api_router.get("/notifications/user/{user_id}")
async def get_user_notifications(user_id: str):
    notifications = await db.notifications.find(
    {
        "user_id": user_id,
        "read": False
    }
).sort("created_at", -1).to_list(100)
    
    return [
        {
            "id": str(n["_id"]),
            "message": n["message"],
            "type": n["type"],
            "read": n["read"],
            "created_at": n["created_at"].isoformat()
        }
        for n in notifications
    ]


@api_router.put("/notifications/{notification_id}/read")
async def mark_notification_read(notification_id: str):
    print("MARK READ ID:", notification_id)
    result = await db.notifications.update_one(
        {"_id": ObjectId(notification_id)},
        {"$set": {"read": True}}
    )
    print("MATCHED:", result.matched_count)
    print("MODIFIED:", result.modified_count)
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Notification not found")
    
    return {"message": "Notification marked as read"}

@api_router.put("/notifications/user/{user_id}/read-all")
async def mark_all_notifications_read(user_id: str):
    result = await db.notifications.update_many(
        {
            "user_id": user_id,
            "read": False
        },
        {
            "$set": {"read": True}
        }
    )

    return {
        "message": "All notifications marked as read",
        "updated_count": result.modified_count
    }


@api_router.get("/notifications/count/{user_id}")
async def get_notification_count(user_id: str):

    count = await db.notifications.count_documents(
        {
            "user_id": user_id,
            "read": False
        }
    )

    return {
        "count": count
    }


# Dashboard Routes

@api_router.get("/dashboard/stats")
async def get_dashboard_stats():
    total_players = await db.users.count_documents({
        "is_active": True
    })

    total_sessions = await db.sessions.count_documents({})

    # Only active players, not admin accounts
    active_players = await db.users.find({
        "is_active": True,
    }).to_list(1000)

    # Current total balance of the team
    team_balance = sum(
        player.get("balance", 0)
        for player in active_players
    )

    # Get recent sessions (last 7 days)
    seven_days_ago = datetime.utcnow().replace(
        hour=0,
        minute=0,
        second=0,
        microsecond=0
    )

    recent_sessions = await db.sessions.find({
        "created_at": {"$gte": seven_days_ago}
    }).to_list(1000)

    total_spent_7days = sum(
        s["court_fee"] for s in recent_sessions
    )

    return {
        "total_players": total_players,
        "total_sessions": total_sessions,
        "total_spent_7days": total_spent_7days,
        "recent_sessions_count": len(recent_sessions),
        "team_balance": team_balance
    }

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
