"""
Seed script to initialize the database with test data
Run this script to create an admin user and some test players
"""

import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import os
from dotenv import load_dotenv
from pathlib import Path

# Load environment variables
ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]


async def seed_database():
    print("Starting database seeding...")
    
    # Clear existing data
    await db.users.delete_many({})
    await db.sessions.delete_many({})
    await db.transactions.delete_many({})
    await db.notifications.delete_many({})
    print("✓ Cleared existing data")
    
    # Create admin user
    admin = {
        "name": "Admin",
        "pin": "1234",
        "role": "admin",
        "balance": 500.0,
        "phone": "9876543210",
        "is_active": True,
    }
    admin_result = await db.users.insert_one(admin)
    print(f"✓ Created admin user: {admin['name']} (PIN: {admin['pin']})")
    
    # Create test players
    players = [
        {
            "name": "Rahul",
            "pin": "1111",
            "role": "player",
            "balance": 800.0,
            "phone": "9876543211",
            "is_active": True,
        },
        {
            "name": "Priya",
            "pin": "2222",
            "role": "player",
            "balance": 600.0,
            "phone": "9876543212",
            "is_active": True,
        },
        {
            "name": "Amit",
            "pin": "3333",
            "role": "player",
            "balance": 450.0,
            "phone": "9876543213",
            "is_active": True,
        },
        {
            "name": "Sneha",
            "pin": "4444",
            "role": "player",
            "balance": 250.0,
            "phone": "9876543214",
            "is_active": True,
        },
        {
            "name": "Vikram",
            "pin": "5555",
            "role": "player",
            "balance": 100.0,
            "phone": "9876543215",
            "is_active": True,
        },
    ]
    
    for player in players:
        await db.users.insert_one(player)
        print(f"✓ Created player: {player['name']} (PIN: {player['pin']}, Balance: ₹{player['balance']})")
    
    print("\n" + "="*60)
    print("Database seeded successfully!")
    print("="*60)
    print("\nLogin Credentials:")
    print("-" * 60)
    print(f"Admin: Name='Admin', PIN='1234'")
    print(f"Player 1: Name='Rahul', PIN='1111'")
    print(f"Player 2: Name='Priya', PIN='2222'")
    print(f"Player 3: Name='Amit', PIN='3333'")
    print(f"Player 4: Name='Sneha', PIN='4444' (Low balance)")
    print(f"Player 5: Name='Vikram', PIN='5555' (Very low balance)")
    print("-" * 60)


if __name__ == "__main__":
    asyncio.run(seed_database())
    client.close()
