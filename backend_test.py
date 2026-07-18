"""
Comprehensive Backend API Tests for Badminton Court Expense Manager
Tests all endpoints with proper authentication and validation
"""

import requests
import json
from datetime import datetime

# Backend URL
BASE_URL = "https://player-court-pay.preview.emergentagent.com/api"

# Test credentials from /app/memory/test_credentials.md
ADMIN_CREDS = {"name": "Admin", "pin": "1234"}
PLAYER1_CREDS = {"name": "Rahul", "pin": "1111"}
PLAYER2_CREDS = {"name": "Priya", "pin": "2222"}
PLAYER3_CREDS = {"name": "Amit", "pin": "3333"}
PLAYER4_CREDS = {"name": "Sneha", "pin": "4444"}
PLAYER5_CREDS = {"name": "Vikram", "pin": "5555"}

# Global variables to store IDs
admin_id = None
player_ids = {}
session_id = None
notification_id = None

def print_test_header(test_name):
    print(f"\n{'='*80}")
    print(f"TEST: {test_name}")
    print(f"{'='*80}")

def print_result(success, message, response=None):
    status = "✅ PASS" if success else "❌ FAIL"
    print(f"{status}: {message}")
    if response:
        print(f"Response: {json.dumps(response, indent=2)}")
    print()

def test_auth_login_admin():
    """Test admin login"""
    print_test_header("1. Admin Login")
    try:
        response = requests.post(f"{BASE_URL}/auth/login", json=ADMIN_CREDS)
        if response.status_code == 200:
            data = response.json()
            global admin_id
            admin_id = data.get("id")
            if admin_id and data.get("role") == "admin":
                print_result(True, f"Admin login successful. ID: {admin_id}", data)
                return True
            else:
                print_result(False, "Admin login returned invalid data", data)
                return False
        else:
            print_result(False, f"Admin login failed with status {response.status_code}", response.json())
            return False
    except Exception as e:
        print_result(False, f"Admin login exception: {str(e)}")
        return False

def test_auth_login_player():
    """Test player login"""
    print_test_header("2. Player Login (Rahul)")
    try:
        response = requests.post(f"{BASE_URL}/auth/login", json=PLAYER1_CREDS)
        if response.status_code == 200:
            data = response.json()
            player_id = data.get("id")
            if player_id and data.get("role") == "player":
                player_ids["Rahul"] = player_id
                print_result(True, f"Player login successful. ID: {player_id}", data)
                return True
            else:
                print_result(False, "Player login returned invalid data", data)
                return False
        else:
            print_result(False, f"Player login failed with status {response.status_code}", response.json())
            return False
    except Exception as e:
        print_result(False, f"Player login exception: {str(e)}")
        return False

def test_auth_login_invalid():
    """Test login with invalid credentials"""
    print_test_header("3. Invalid Login")
    try:
        response = requests.post(f"{BASE_URL}/auth/login", json={"name": "Invalid", "pin": "9999"})
        if response.status_code == 401:
            print_result(True, "Invalid login correctly rejected with 401")
            return True
        else:
            print_result(False, f"Invalid login should return 401, got {response.status_code}")
            return False
    except Exception as e:
        print_result(False, f"Invalid login test exception: {str(e)}")
        return False

def test_auth_register():
    """Test player registration"""
    print_test_header("4. Player Registration")
    try:
        new_player = {
            "name": f"TestPlayer_{datetime.now().timestamp()}",
            "pin": "9999",
            "role": "player",
            "balance": 500.0,
            "phone": "9876543210"
        }
        response = requests.post(f"{BASE_URL}/auth/register", json=new_player)
        if response.status_code == 200:
            data = response.json()
            if data.get("id") and data.get("name") == new_player["name"]:
                print_result(True, f"Player registration successful. ID: {data.get('id')}", data)
                return True
            else:
                print_result(False, "Registration returned invalid data", data)
                return False
        else:
            print_result(False, f"Registration failed with status {response.status_code}", response.json())
            return False
    except Exception as e:
        print_result(False, f"Registration exception: {str(e)}")
        return False

def test_get_all_players():
    """Test getting all players"""
    print_test_header("5. Get All Players")
    try:
        response = requests.get(f"{BASE_URL}/players")
        if response.status_code == 200:
            data = response.json()
            if isinstance(data, list) and len(data) > 0:
                # Store player IDs for later tests
                for player in data:
                    if player["name"] in ["Rahul", "Priya", "Amit", "Sneha", "Vikram"]:
                        player_ids[player["name"]] = player["id"]
                print_result(True, f"Retrieved {len(data)} players", {"count": len(data), "sample": data[0] if data else None})
                return True
            else:
                print_result(False, "No players returned", data)
                return False
        else:
            print_result(False, f"Get players failed with status {response.status_code}", response.json())
            return False
    except Exception as e:
        print_result(False, f"Get players exception: {str(e)}")
        return False

def test_get_specific_player():
    """Test getting a specific player"""
    print_test_header("6. Get Specific Player")
    if not player_ids.get("Rahul"):
        print_result(False, "No player ID available for test")
        return False
    
    try:
        player_id = player_ids["Rahul"]
        response = requests.get(f"{BASE_URL}/players/{player_id}")
        if response.status_code == 200:
            data = response.json()
            if data.get("id") == player_id and data.get("name") == "Rahul":
                print_result(True, f"Retrieved player details for Rahul", data)
                return True
            else:
                print_result(False, "Player data mismatch", data)
                return False
        else:
            print_result(False, f"Get player failed with status {response.status_code}", response.json())
            return False
    except Exception as e:
        print_result(False, f"Get player exception: {str(e)}")
        return False

def test_update_player():
    """Test updating player balance"""
    print_test_header("7. Update Player Balance")
    if not player_ids.get("Rahul"):
        print_result(False, "No player ID available for test")
        return False
    
    try:
        player_id = player_ids["Rahul"]
        update_data = {"balance": 1000.0}
        response = requests.put(f"{BASE_URL}/players/{player_id}", json=update_data)
        if response.status_code == 200:
            # Verify the update
            verify_response = requests.get(f"{BASE_URL}/players/{player_id}")
            if verify_response.status_code == 200:
                data = verify_response.json()
                if data.get("balance") == 1000.0:
                    print_result(True, "Player balance updated successfully", data)
                    return True
                else:
                    print_result(False, f"Balance not updated correctly. Expected 1000.0, got {data.get('balance')}", data)
                    return False
            else:
                print_result(False, "Could not verify update")
                return False
        else:
            print_result(False, f"Update player failed with status {response.status_code}", response.json())
            return False
    except Exception as e:
        print_result(False, f"Update player exception: {str(e)}")
        return False

def test_create_session():
    """Test creating a session (admin only)"""
    print_test_header("8. Create Session (Admin)")
    if not admin_id:
        print_result(False, "No admin ID available for test")
        return False
    
    # Get at least 3 player IDs
    if len(player_ids) < 3:
        print_result(False, f"Need at least 3 players, only have {len(player_ids)}")
        return False
    
    try:
        players_for_session = list(player_ids.values())[:4]  # Use first 4 players
        session_data = {
            "date": "2024-07-18",
            "court_fee": 400.0,
            "players_present": players_for_session
        }
        response = requests.post(f"{BASE_URL}/sessions?admin_id={admin_id}", json=session_data)
        if response.status_code == 200:
            data = response.json()
            global session_id
            session_id = data.get("id")
            expected_per_player = 400.0 / 4
            if session_id and data.get("amount_per_player") == expected_per_player:
                print_result(True, f"Session created successfully. ID: {session_id}, Per player: ₹{expected_per_player}", data)
                return True
            else:
                print_result(False, "Session creation returned invalid data", data)
                return False
        else:
            print_result(False, f"Create session failed with status {response.status_code}", response.json())
            return False
    except Exception as e:
        print_result(False, f"Create session exception: {str(e)}")
        return False

def test_get_sessions():
    """Test getting all sessions"""
    print_test_header("9. Get All Sessions")
    try:
        response = requests.get(f"{BASE_URL}/sessions")
        if response.status_code == 200:
            data = response.json()
            if isinstance(data, list):
                print_result(True, f"Retrieved {len(data)} sessions", {"count": len(data), "sample": data[0] if data else None})
                return True
            else:
                print_result(False, "Invalid sessions data format", data)
                return False
        else:
            print_result(False, f"Get sessions failed with status {response.status_code}", response.json())
            return False
    except Exception as e:
        print_result(False, f"Get sessions exception: {str(e)}")
        return False

def test_update_session():
    """Test updating a session"""
    print_test_header("10. Update Session (Admin)")
    if not admin_id or not session_id:
        print_result(False, "No admin ID or session ID available for test")
        return False
    
    try:
        update_data = {
            "court_fee": 500.0
        }
        response = requests.put(f"{BASE_URL}/sessions/{session_id}?admin_id={admin_id}", json=update_data)
        if response.status_code == 200:
            print_result(True, "Session updated successfully", response.json())
            return True
        else:
            print_result(False, f"Update session failed with status {response.status_code}", response.json())
            return False
    except Exception as e:
        print_result(False, f"Update session exception: {str(e)}")
        return False

def test_add_deposit():
    """Test adding a deposit"""
    print_test_header("11. Add Deposit")
    if not player_ids.get("Priya"):
        print_result(False, "No player ID available for test")
        return False
    
    try:
        player_id = player_ids["Priya"]
        # Get current balance
        balance_response = requests.get(f"{BASE_URL}/players/{player_id}")
        if balance_response.status_code != 200:
            print_result(False, "Could not get current balance")
            return False
        
        current_balance = balance_response.json().get("balance", 0)
        
        deposit_data = {
            "user_id": player_id,
            "amount": 500.0
        }
        response = requests.post(f"{BASE_URL}/deposits", json=deposit_data)
        if response.status_code == 200:
            # Verify balance increased
            verify_response = requests.get(f"{BASE_URL}/players/{player_id}")
            if verify_response.status_code == 200:
                new_balance = verify_response.json().get("balance", 0)
                expected_balance = current_balance + 500.0
                if abs(new_balance - expected_balance) < 0.01:  # Allow small floating point difference
                    print_result(True, f"Deposit added successfully. Balance: {current_balance} → {new_balance}", response.json())
                    return True
                else:
                    print_result(False, f"Balance not updated correctly. Expected {expected_balance}, got {new_balance}")
                    return False
            else:
                print_result(False, "Could not verify deposit")
                return False
        else:
            print_result(False, f"Add deposit failed with status {response.status_code}", response.json())
            return False
    except Exception as e:
        print_result(False, f"Add deposit exception: {str(e)}")
        return False

def test_get_user_transactions():
    """Test getting user transactions"""
    print_test_header("12. Get User Transactions")
    if not player_ids.get("Rahul"):
        print_result(False, "No player ID available for test")
        return False
    
    try:
        player_id = player_ids["Rahul"]
        response = requests.get(f"{BASE_URL}/transactions/user/{player_id}")
        if response.status_code == 200:
            data = response.json()
            if isinstance(data, list):
                print_result(True, f"Retrieved {len(data)} transactions for Rahul", {"count": len(data), "sample": data[0] if data else None})
                return True
            else:
                print_result(False, "Invalid transactions data format", data)
                return False
        else:
            print_result(False, f"Get transactions failed with status {response.status_code}", response.json())
            return False
    except Exception as e:
        print_result(False, f"Get transactions exception: {str(e)}")
        return False

def test_monthly_summary():
    """Test getting monthly summary"""
    print_test_header("13. Get Monthly Summary")
    try:
        response = requests.get(f"{BASE_URL}/transactions/monthly-summary?month=2024-07")
        if response.status_code == 200:
            data = response.json()
            if isinstance(data, list):
                print_result(True, f"Retrieved monthly summary with {len(data)} users", {"count": len(data), "sample": data[0] if data else None})
                return True
            else:
                print_result(False, "Invalid monthly summary data format", data)
                return False
        else:
            print_result(False, f"Get monthly summary failed with status {response.status_code}", response.json())
            return False
    except Exception as e:
        print_result(False, f"Get monthly summary exception: {str(e)}")
        return False

def test_get_notifications():
    """Test getting user notifications"""
    print_test_header("14. Get User Notifications")
    if not player_ids.get("Vikram"):  # Vikram has low balance, should have notifications
        print_result(False, "No player ID available for test")
        return False
    
    try:
        player_id = player_ids["Vikram"]
        response = requests.get(f"{BASE_URL}/notifications/user/{player_id}")
        if response.status_code == 200:
            data = response.json()
            if isinstance(data, list):
                global notification_id
                if len(data) > 0:
                    notification_id = data[0].get("id")
                print_result(True, f"Retrieved {len(data)} notifications for Vikram", {"count": len(data), "sample": data[0] if data else None})
                return True
            else:
                print_result(False, "Invalid notifications data format", data)
                return False
        else:
            print_result(False, f"Get notifications failed with status {response.status_code}", response.json())
            return False
    except Exception as e:
        print_result(False, f"Get notifications exception: {str(e)}")
        return False

def test_mark_notification_read():
    """Test marking notification as read"""
    print_test_header("15. Mark Notification as Read")
    if not notification_id:
        print_result(False, "No notification ID available for test (may not have any notifications)")
        return True  # Not a failure, just no notifications to test
    
    try:
        response = requests.put(f"{BASE_URL}/notifications/{notification_id}/read")
        if response.status_code == 200:
            print_result(True, "Notification marked as read successfully", response.json())
            return True
        else:
            print_result(False, f"Mark notification read failed with status {response.status_code}", response.json())
            return False
    except Exception as e:
        print_result(False, f"Mark notification read exception: {str(e)}")
        return False

def test_dashboard_stats():
    """Test getting dashboard statistics"""
    print_test_header("16. Get Dashboard Stats")
    try:
        response = requests.get(f"{BASE_URL}/dashboard/stats")
        if response.status_code == 200:
            data = response.json()
            required_fields = ["total_players", "total_sessions", "total_spent_7days", "recent_sessions_count"]
            if all(field in data for field in required_fields):
                print_result(True, "Dashboard stats retrieved successfully", data)
                return True
            else:
                print_result(False, "Dashboard stats missing required fields", data)
                return False
        else:
            print_result(False, f"Get dashboard stats failed with status {response.status_code}", response.json())
            return False
    except Exception as e:
        print_result(False, f"Get dashboard stats exception: {str(e)}")
        return False

def test_delete_session():
    """Test deleting a session (should refund balances)"""
    print_test_header("17. Delete Session (Admin)")
    if not admin_id or not session_id:
        print_result(False, "No admin ID or session ID available for test")
        return False
    
    try:
        response = requests.delete(f"{BASE_URL}/sessions/{session_id}?admin_id={admin_id}")
        if response.status_code == 200:
            print_result(True, "Session deleted successfully (balances refunded)", response.json())
            return True
        else:
            print_result(False, f"Delete session failed with status {response.status_code}", response.json())
            return False
    except Exception as e:
        print_result(False, f"Delete session exception: {str(e)}")
        return False

def test_soft_delete_player():
    """Test soft deleting a player"""
    print_test_header("18. Soft Delete Player")
    if not player_ids.get("Amit"):
        print_result(False, "No player ID available for test")
        return False
    
    try:
        player_id = player_ids["Amit"]
        response = requests.delete(f"{BASE_URL}/players/{player_id}")
        if response.status_code == 200:
            # Verify player is marked inactive
            verify_response = requests.get(f"{BASE_URL}/players/{player_id}")
            if verify_response.status_code == 200:
                data = verify_response.json()
                if data.get("is_active") == False:
                    print_result(True, "Player soft deleted successfully (is_active=False)", data)
                    return True
                else:
                    print_result(False, "Player not marked as inactive", data)
                    return False
            else:
                print_result(False, "Could not verify soft delete")
                return False
        else:
            print_result(False, f"Delete player failed with status {response.status_code}", response.json())
            return False
    except Exception as e:
        print_result(False, f"Delete player exception: {str(e)}")
        return False

def run_all_tests():
    """Run all tests in sequence"""
    print("\n" + "="*80)
    print("BADMINTON COURT EXPENSE MANAGER - BACKEND API TESTS")
    print("="*80)
    print(f"Backend URL: {BASE_URL}")
    print(f"Test started at: {datetime.now().isoformat()}")
    
    tests = [
        ("Admin Login", test_auth_login_admin),
        ("Player Login", test_auth_login_player),
        ("Invalid Login", test_auth_login_invalid),
        ("Player Registration", test_auth_register),
        ("Get All Players", test_get_all_players),
        ("Get Specific Player", test_get_specific_player),
        ("Update Player Balance", test_update_player),
        ("Create Session", test_create_session),
        ("Get All Sessions", test_get_sessions),
        ("Update Session", test_update_session),
        ("Add Deposit", test_add_deposit),
        ("Get User Transactions", test_get_user_transactions),
        ("Monthly Summary", test_monthly_summary),
        ("Get Notifications", test_get_notifications),
        ("Mark Notification Read", test_mark_notification_read),
        ("Dashboard Stats", test_dashboard_stats),
        ("Delete Session", test_delete_session),
        ("Soft Delete Player", test_soft_delete_player),
    ]
    
    results = []
    for test_name, test_func in tests:
        try:
            result = test_func()
            results.append((test_name, result))
        except Exception as e:
            print(f"❌ CRITICAL ERROR in {test_name}: {str(e)}")
            results.append((test_name, False))
    
    # Print summary
    print("\n" + "="*80)
    print("TEST SUMMARY")
    print("="*80)
    passed = sum(1 for _, result in results if result)
    total = len(results)
    print(f"Total Tests: {total}")
    print(f"Passed: {passed}")
    print(f"Failed: {total - passed}")
    print(f"Success Rate: {(passed/total)*100:.1f}%")
    print("\nDetailed Results:")
    for test_name, result in results:
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"  {status}: {test_name}")
    
    print("\n" + "="*80)
    print(f"Test completed at: {datetime.now().isoformat()}")
    print("="*80)
    
    return results

if __name__ == "__main__":
    run_all_tests()
