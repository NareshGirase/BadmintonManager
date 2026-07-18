import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Modal, TextInput } from 'react-native';
import { useAuth } from '@/src/contexts/AuthContext';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

export default function ProfileScreen() {
  const { user, logout, updateBalance } = useAuth();
  const router = useRouter();
  const [depositModalVisible, setDepositModalVisible] = useState(false);
  const [depositAmount, setDepositAmount] = useState('');
  const [logoutModalVisible, setLogoutModalVisible] = useState(false);

  const handleLogout = () => {
    setLogoutModalVisible(true);
  };

  const confirmLogout = async () => {
    setLogoutModalVisible(false);
    await logout();
    router.replace('/');
  };

  const handleAddDeposit = async () => {
    if (!user || !depositAmount) return;

    const amount = parseFloat(depositAmount);
    if (isNaN(amount) || amount <= 0) {
      Alert.alert('Error', 'Please enter a valid amount');
      return;
    }

    try {
      const response = await fetch(`${BACKEND_URL}/api/deposits`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: user.id,
          amount: amount,
        }),
      });

      if (response.ok) {
        Alert.alert('Success', 'Deposit added successfully');
        updateBalance(user.balance + amount);
        setDepositModalVisible(false);
        setDepositAmount('');
      } else {
        Alert.alert('Error', 'Failed to add deposit');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to add deposit');
    }
  };

  const viewTransactions = () => {
    router.push('/transactions' as any);
  };

  const viewMonthlyReport = () => {
    router.push('/monthly-report' as any);
  };

  const getBalanceColor = (balance: number) => {
    if (balance < 100) return '#ef4444';
    if (balance < 300) return '#f59e0b';
    return '#10b981';
  };

  const getBalanceStatus = (balance: number) => {
    if (balance < 100) return 'Critical';
    if (balance < 300) return 'Low';
    return 'Good';
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView style={styles.scrollView}>
        {/* Profile Header */}
        <View style={styles.profileHeader}>
          <View style={[styles.avatar, { backgroundColor: user?.role === 'admin' ? '#8b5cf6' : '#3b82f6' }]}>
            <Ionicons name="person" size={48} color="#fff" />
          </View>
          <Text style={styles.userName}>{user?.name}</Text>
          {user?.role === 'admin' && (
            <View style={styles.roleBadge}>
              <Ionicons name="shield-checkmark" size={16} color="#8b5cf6" />
              <Text style={styles.roleBadgeText}>Admin</Text>
            </View>
          )}
          {user?.phone && (
            <Text style={styles.userPhone}>{user.phone}</Text>
          )}
        </View>

        {/* Balance Card - only for players (admin has no balance to track) */}
        {user?.role !== 'admin' && (
          <View style={styles.balanceCard}>
            <View style={styles.balanceHeader}>
              <Text style={styles.balanceLabel}>Current Balance</Text>
              <View style={[styles.statusBadge, { backgroundColor: getBalanceColor(user?.balance || 0) + '20' }]}>
                <Text style={[styles.statusText, { color: getBalanceColor(user?.balance || 0) }]}>
                  {getBalanceStatus(user?.balance || 0)}
                </Text>
              </View>
            </View>
            <Text style={[styles.balanceAmount, { color: getBalanceColor(user?.balance || 0) }]}>
              ₹{user?.balance.toFixed(2)}
            </Text>
          </View>
        )}

        {/* Menu Options */}
        <View style={styles.menuSection}>
          <TouchableOpacity style={styles.menuItem} onPress={viewTransactions}>
            <View style={styles.menuIconContainer}>
              <Ionicons name="receipt" size={24} color="#10b981" />
            </View>
            <View style={styles.menuContent}>
              <Text style={styles.menuTitle}>Transaction History</Text>
              <Text style={styles.menuSubtitle}>View all your transactions</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#6b7280" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem} onPress={viewMonthlyReport}>
            <View style={styles.menuIconContainer}>
              <Ionicons name="bar-chart" size={24} color="#3b82f6" />
            </View>
            <View style={styles.menuContent}>
              <Text style={styles.menuTitle}>Monthly Report</Text>
              <Text style={styles.menuSubtitle}>View monthly summary</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#6b7280" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem} onPress={handleLogout}>
            <View style={[styles.menuIconContainer, { backgroundColor: '#7f1d1d' }]}>
              <Ionicons name="log-out" size={24} color="#ef4444" />
            </View>
            <View style={styles.menuContent}>
              <Text style={styles.menuTitle}>Logout</Text>
              <Text style={styles.menuSubtitle}>Sign out of your account</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#6b7280" />
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Deposit Modal */}
      <Modal
        visible={depositModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setDepositModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Add Deposit</Text>
            <Text style={styles.modalSubtitle}>Add funds to your account</Text>

            <View style={styles.inputContainer}>
              <Ionicons name="cash" size={20} color="#9ca3af" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Enter amount"
                placeholderTextColor="#6b7280"
                value={depositAmount}
                onChangeText={setDepositAmount}
                keyboardType="numeric"
              />
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => {
                  setDepositModalVisible(false);
                  setDepositAmount('');
                }}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.confirmButton]}
                onPress={handleAddDeposit}
              >
                <Text style={styles.confirmButtonText}>Add Deposit</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Logout Confirmation Modal */}
      <Modal
        visible={logoutModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setLogoutModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.logoutIconContainer}>
              <Ionicons name="log-out" size={40} color="#ef4444" />
            </View>
            <Text style={styles.modalTitle}>Logout?</Text>
            <Text style={styles.modalSubtitle}>Are you sure you want to sign out?</Text>
            <View style={styles.modalButtons}>
              <TouchableOpacity
                testID="cancel-logout"
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setLogoutModalVisible(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                testID="confirm-logout"
                style={[styles.modalButton, styles.logoutConfirmButton]}
                onPress={confirmLogout}
              >
                <Text style={styles.confirmButtonText}>Logout</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  scrollView: {
    flex: 1,
  },
  profileHeader: {
    alignItems: 'center',
    padding: 32,
  },
  avatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  userName: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e1b4b',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginBottom: 8,
  },
  roleBadgeText: {
    color: '#8b5cf6',
    marginLeft: 4,
    fontWeight: '600',
  },
  userPhone: {
    fontSize: 16,
    color: '#9ca3af',
  },
  balanceCard: {
    backgroundColor: '#1e293b',
    margin: 16,
    padding: 24,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#334155',
  },
  balanceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  balanceLabel: {
    fontSize: 16,
    color: '#9ca3af',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  balanceAmount: {
    fontSize: 42,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  depositButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#10b981',
    height: 48,
    borderRadius: 12,
  },
  depositButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  menuSection: {
    padding: 16,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e293b',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  menuIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#0f172a',
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuContent: {
    flex: 1,
    marginLeft: 16,
  },
  menuTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 2,
  },
  menuSubtitle: {
    fontSize: 14,
    color: '#9ca3af',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalContent: {
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    borderWidth: 1,
    borderColor: '#334155',
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  modalSubtitle: {
    fontSize: 16,
    color: '#9ca3af',
    marginBottom: 24,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0f172a',
    borderRadius: 12,
    marginBottom: 24,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#334155',
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    height: 56,
    color: '#fff',
    fontSize: 16,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#334155',
  },
  cancelButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  confirmButton: {
    backgroundColor: '#10b981',
  },
  confirmButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  logoutConfirmButton: {
    backgroundColor: '#ef4444',
  },
  logoutIconContainer: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#7f1d1d',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    alignSelf: 'center',
  },
});