# Badminton Court Expense & Balance Manager

A mobile-first expense management app for badminton groups to track court fees and player balances.

## 🎯 Features

### For All Users
- **Secure Authentication** - PIN-based login system
- **Balance Tracking** - Real-time balance updates with color-coded indicators
- **Transaction History** - View all deposits and deductions
- **Monthly Reports** - Detailed breakdown of expenses by player
- **Notifications** - Low balance alerts
- **Responsive Design** - Beautiful dark-themed mobile UI

### For Admin
- **Mark Attendance** - Record daily sessions with automatic cost calculation
- **Player Management** - Add/remove players
- **Session History** - Edit or delete past sessions
- **Deposit Management** - Add funds for any player
- **Dashboard** - Overview of all player balances

### Key Business Logic
- ✅ Court fee automatically divided among **only players who are present**
- ✅ Absent players are **not charged**
- ✅ Balances updated in real-time
- ✅ Session edits automatically recalculate and adjust balances
- ✅ Session deletion refunds all deducted amounts

## 🛠️ Tech Stack

### Frontend
- **Expo/React Native** - Cross-platform mobile development
- **React Navigation (Bottom Tabs)** - Tab-based navigation
- **Zustand** - State management (via AuthContext)
- **Expo Router** - File-based routing
- **TypeScript** - Type safety

### Backend
- **FastAPI** - Modern Python web framework
- **MongoDB** - NoSQL database via Motor (async)
- **Pydantic** - Data validation

## 📱 App Structure

```
/app/frontend/app/
├── (tabs)/                    # Tab Navigation
│   ├── home.tsx              # Dashboard with balances
│   ├── sessions.tsx          # Session history
│   ├── players.tsx           # Player management
│   └── profile.tsx           # User profile & settings
├── mark-attendance.tsx       # Admin: Create session
├── add-player.tsx           # Admin: Add new player
├── transactions.tsx         # Transaction history
├── monthly-report.tsx       # Monthly summary
└── index.tsx               # Login screen
```

## 🚀 Getting Started

### Login Credentials

**Admin Account:**
- Name: `Admin`
- PIN: `1234`

**Player Accounts:**
| Name   | PIN  | Balance |
|--------|------|---------|
| Rahul  | 1111 | ₹800    |
| Priya  | 2222 | ₹600    |
| Amit   | 3333 | ₹450    |
| Sneha  | 4444 | ₹250    |
| Vikram | 5555 | ₹100    |

### Backend API Base URL
```
Development: http://localhost:8001
Production: {EXPO_PUBLIC_BACKEND_URL}/api
```

## 📊 API Endpoints

### Authentication
- `POST /api/auth/login` - Login with name and PIN
- `POST /api/auth/register` - Register new player (admin only)

### Players
- `GET /api/players` - List all players
- `GET /api/players/{id}` - Get player details
- `PUT /api/players/{id}` - Update player
- `DELETE /api/players/{id}` - Soft delete player

### Sessions
- `POST /api/sessions?admin_id={id}` - Create session (admin)
- `GET /api/sessions` - List all sessions
- `PUT /api/sessions/{id}?admin_id={id}` - Edit session (admin)
- `DELETE /api/sessions/{id}?admin_id={id}` - Delete session (admin)

### Deposits
- `POST /api/deposits` - Add deposit
  ```json
  {
    "user_id": "player_id",
    "amount": 500
  }
  ```

### Transactions
- `GET /api/transactions/user/{id}` - User transaction history
- `GET /api/transactions/monthly-summary?month=YYYY-MM` - Monthly report

### Notifications
- `GET /api/notifications/user/{id}` - User notifications
- `PUT /api/notifications/{id}/read` - Mark as read

### Dashboard
- `GET /api/dashboard/stats` - Overall statistics

## 💾 Database Schema

### Users Collection
```javascript
{
  _id: ObjectId,
  name: String,
  pin: String,
  role: "admin" | "player",
  balance: Number,
  phone: String,
  is_active: Boolean,
  created_at: DateTime
}
```

### Sessions Collection
```javascript
{
  _id: ObjectId,
  date: String,
  court_fee: Number,
  players_present: [String],  // User IDs
  amount_per_player: Number,
  created_by: String,         // Admin ID
  created_at: DateTime
}
```

### Transactions Collection
```javascript
{
  _id: ObjectId,
  user_id: String,
  amount: Number,
  type: "deposit" | "deduction",
  session_id: String,
  description: String,
  date: DateTime
}
```

### Notifications Collection
```javascript
{
  _id: ObjectId,
  user_id: String,
  message: String,
  type: "low_balance" | "payment_reminder",
  read: Boolean,
  created_at: DateTime
}
```

## 🎨 UI/UX Features

### Balance Indicators
- 🟢 **Green** (₹300+) - Good balance
- 🟡 **Yellow** (₹100-299) - Low balance warning
- 🔴 **Red** (<₹100) - Critical balance alert

### Navigation
- **Bottom Tabs** - Easy access to main sections
- **Back Navigation** - Standard mobile patterns
- **Pull to Refresh** - Update data on all list screens

### Responsive Design
- Safe area handling for notches
- Keyboard-aware input forms
- Touch-friendly 44px+ targets
- Dark theme optimized for readability

## 🔧 Development

### Reset Database
```bash
cd /app/backend
python seed.py
```

### Restart Services
```bash
sudo supervisorctl restart backend expo
```

### Check Logs
```bash
# Backend logs
tail -f /var/log/supervisor/backend.out.log

# Frontend logs
tail -f /var/log/supervisor/expo.out.log
```

## 📝 Business Rules

1. **Session Creation:**
   - Admin selects date, court fee, and present players
   - System calculates: `amount_per_player = court_fee ÷ number_of_present_players`
   - Automatically deducts from each present player's balance
   - Creates transaction records

2. **Session Editing:**
   - Reverses original transactions
   - Recalculates with new values
   - Applies new transactions

3. **Session Deletion:**
   - Refunds all deducted amounts
   - Removes all related transactions

4. **Deposit Addition:**
   - Increases player balance
   - Creates deposit transaction
   - Available to all users for self-deposits

5. **Low Balance Alerts:**
   - Notification created when balance drops below ₹200
   - Visible on home screen and notifications

## 🎯 User Workflows

### Admin Workflow
1. Login with admin credentials
2. Mark today's attendance from home quick actions
3. Select players who played
4. Enter court fee
5. Confirm - balances auto-deducted
6. View session history to edit/delete if needed

### Player Workflow
1. Login with player credentials
2. View current balance on home screen
3. Check transaction history
4. Add deposit if balance is low
5. View monthly reports
6. Check notifications for alerts

## 🔒 Security

- PIN-based authentication
- Admin-only operations validated server-side
- Soft deletes for player accounts
- CORS enabled for cross-origin requests
- Input validation on all endpoints

## ✨ Future Enhancements

- Push notifications for low balances
- Export reports to PDF
- Multiple courts/venues support
- Recurring player groups
- Payment integration (UPI)
- Photo uploads for players
- Session booking system

---

**Built with ❤️ for the Badminton Community**
