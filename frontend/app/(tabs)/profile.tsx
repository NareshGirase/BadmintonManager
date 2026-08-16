import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  TextInput,
} from 'react-native';
import { useAuth } from '@/src/contexts/AuthContext';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useToast } from '@/src/contexts/ToastContext';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

export default function ProfileScreen() {
  const { user, logout, updateBalance } = useAuth();
  const { showToast } = useToast();
  const router = useRouter();

  const [depositModalVisible, setDepositModalVisible] =
    useState(false);

  const [depositAmount, setDepositAmount] =
    useState('');

  const [logoutModalVisible, setLogoutModalVisible] =
    useState(false);

  const [isAddingDeposit, setIsAddingDeposit] =
    useState(false);

  // -------------------------
  // LOGOUT
  // -------------------------
  const handleLogout = () => {
    setLogoutModalVisible(true);
  };

  const confirmLogout = async () => {
    setLogoutModalVisible(false);

    try {
      await logout();

      router.replace('/');

      setTimeout(() => {
        showToast(
          'Logged out successfully',
          'success'
        );
      }, 300);
    } catch (error) {
      console.error('LOGOUT ERROR:', error);

      setTimeout(() => {
        showToast(
          'Failed to logout',
          'error'
        );
      }, 300);
    }
  };

  // -------------------------
  // ADD DEPOSIT
  // -------------------------
  const handleAddDeposit = async () => {
    if (isAddingDeposit) {
      return;
    }

    // Extra frontend permission check
    if (user?.role !== 'admin') {
      setDepositModalVisible(false);

      setTimeout(() => {
        showToast(
          'Only admin can add deposits',
          'error'
        );
      }, 200);

      return;
    }

    if (!user) {
      setDepositModalVisible(false);

      setTimeout(() => {
        showToast(
          'User information is unavailable',
          'error'
        );
      }, 200);

      return;
    }

    if (!depositAmount.trim()) {
      setDepositModalVisible(false);

      setTimeout(() => {
        showToast(
          'Please enter a deposit amount',
          'warning'
        );
      }, 200);

      return;
    }

    const amount = parseFloat(depositAmount);

    if (isNaN(amount) || amount <= 0) {
      setDepositModalVisible(false);

      setTimeout(() => {
        showToast(
          'Please enter a valid amount',
          'error'
        );
      }, 200);

      return;
    }

    if (!BACKEND_URL) {
      setDepositModalVisible(false);

      console.error(
        'BACKEND URL IS MISSING'
      );

      setTimeout(() => {
        showToast(
          'Backend URL is missing',
          'error'
        );
      }, 200);

      return;
    }

    try {
      setIsAddingDeposit(true);

      console.log('ADDING DEPOSIT:', {
        user_id: user.id,
        amount,
        backend: BACKEND_URL,
      });

      const response = await fetch(
        `${BACKEND_URL}/api/deposits`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            user_id: user.id,
            amount,
          }),
        }
      );

      console.log(
        'DEPOSIT STATUS:',
        response.status
      );

      if (response.ok) {
        const data = await response
          .json()
          .catch(() => null);

        console.log(
          'DEPOSIT SUCCESS:',
          data
        );

        updateBalance(
          (user.balance || 0) + amount
        );

        setDepositModalVisible(false);
        setDepositAmount('');

        setTimeout(() => {
          showToast(
            `₹${amount.toFixed(
              2
            )} deposit added successfully!`,
            'success'
          );
        }, 300);

        return;
      }

      const errorText =
        await response.text();

      console.error(
        'DEPOSIT FAILED:',
        response.status,
        errorText
      );

      setDepositModalVisible(false);
      setDepositAmount('');

      setTimeout(() => {
        showToast(
          'Failed to add deposit',
          'error'
        );
      }, 300);
    } catch (error) {
      console.error(
        'DEPOSIT ERROR:',
        error
      );

      setDepositModalVisible(false);
      setDepositAmount('');

      setTimeout(() => {
        showToast(
          'Failed to add deposit. Please try again.',
          'error'
        );
      }, 300);
    } finally {
      setIsAddingDeposit(false);
    }
  };

  // -------------------------
  // NAVIGATION
  // -------------------------
  const viewTransactions = () => {
    router.push(
      '/transactions' as any
    );
  };

  const viewMonthlyReport = () => {
    router.push(
      '/monthly-report' as any
    );
  };

  // -------------------------
  // BALANCE HELPERS
  // -------------------------
  const getBalanceColor = (
    balance: number
  ) => {
    if (balance < 100) {
      return '#ef4444';
    }

    if (balance < 300) {
      return '#f59e0b';
    }

    return '#10b981';
  };

  const getBalanceStatus = (
    balance: number
  ) => {
    if (balance < 100) {
      return 'Critical';
    }

    if (balance < 300) {
      return 'Low';
    }

    return 'Good';
  };

  const currentBalance =
    user?.balance || 0;

  return (
    <SafeAreaView
      style={styles.container}
      edges={['top']}
    >
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
      >
        {/* PROFILE HEADER */}
        <View
          style={styles.profileHeader}
        >
          <View
            style={[
              styles.avatar,
              {
                backgroundColor:
                  user?.role === 'admin'
                    ? '#8b5cf6'
                    : '#3b82f6',
              },
            ]}
          >
            <Ionicons
              name="person"
              size={48}
              color="#fff"
            />
          </View>

          <Text
            style={styles.userName}
          >
            {user?.name || 'User'}
          </Text>

          {user?.role === 'admin' && (
            <View
              style={styles.roleBadge}
            >
              <Ionicons
                name="shield-checkmark"
                size={16}
                color="#8b5cf6"
              />

              <Text
                style={
                  styles.roleBadgeText
                }
              >
                Admin
              </Text>
            </View>
          )}

          {user?.phone && (
            <Text
              style={styles.userPhone}
            >
              {user.phone}
            </Text>
          )}
        </View>

        {/* BALANCE CARD */}
        <View
          style={styles.balanceCard}
        >
          <View
            style={styles.balanceHeader}
          >
            <Text
              style={styles.balanceLabel}
            >
              Current Balance
            </Text>

            {/* Status badge only for players */}
            {user?.role !== 'admin' && (
              <View
                style={[
                  styles.statusBadge,
                  {
                    backgroundColor:
                      getBalanceColor(
                        currentBalance
                      ) + '20',
                  },
                ]}
              >
                <Text
                  style={[
                    styles.statusText,
                    {
                      color:
                        getBalanceColor(
                          currentBalance
                        ),
                    },
                  ]}
                >
                  {getBalanceStatus(
                    currentBalance
                  )}
                </Text>
              </View>
            )}
          </View>

          <Text
            style={[
              styles.balanceAmount,
              {
                color:
                  getBalanceColor(
                    currentBalance
                  ),
              },
            ]}
          >
            ₹{currentBalance.toFixed(2)}
          </Text>

          {/* ADD DEPOSIT - ADMIN ONLY */}
          {user?.role === 'admin' && (
            <TouchableOpacity
              style={[
                styles.depositButton,
                isAddingDeposit &&
                  styles.disabledButton,
              ]}
              onPress={() => {
                if (!isAddingDeposit) {
                  setDepositModalVisible(
                    true
                  );
                }
              }}
              activeOpacity={0.8}
              disabled={isAddingDeposit}
            >
              <Ionicons
                name="add-circle-outline"
                size={22}
                color="#fff"
              />

              <Text
                style={
                  styles.depositButtonText
                }
              >
                Add Deposit
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* MENU OPTIONS */}
        <View
          style={styles.menuSection}
        >
          {/* TRANSACTIONS */}
          <TouchableOpacity
            style={styles.menuItem}
            onPress={
              viewTransactions
            }
            activeOpacity={0.8}
          >
            <View
              style={
                styles.menuIconContainer
              }
            >
              <Ionicons
                name="receipt"
                size={24}
                color="#10b981"
              />
            </View>

            <View
              style={styles.menuContent}
            >
              <Text
                style={styles.menuTitle}
              >
                Transaction History
              </Text>

              <Text
                style={
                  styles.menuSubtitle
                }
              >
                View all your transactions
              </Text>
            </View>

            <Ionicons
              name="chevron-forward"
              size={20}
              color="#6b7280"
            />
          </TouchableOpacity>

          {/* MONTHLY REPORT */}
          <TouchableOpacity
            style={styles.menuItem}
            onPress={
              viewMonthlyReport
            }
            activeOpacity={0.8}
          >
            <View
              style={
                styles.menuIconContainer
              }
            >
              <Ionicons
                name="bar-chart"
                size={24}
                color="#3b82f6"
              />
            </View>

            <View
              style={styles.menuContent}
            >
              <Text
                style={styles.menuTitle}
              >
                Monthly Report
              </Text>

              <Text
                style={
                  styles.menuSubtitle
                }
              >
                View monthly summary
              </Text>
            </View>

            <Ionicons
              name="chevron-forward"
              size={20}
              color="#6b7280"
            />
          </TouchableOpacity>

          {/* LOGOUT */}
          <TouchableOpacity
            style={styles.menuItem}
            onPress={handleLogout}
            activeOpacity={0.8}
          >
            <View
              style={[
                styles.menuIconContainer,
                {
                  backgroundColor:
                    '#7f1d1d',
                },
              ]}
            >
              <Ionicons
                name="log-out"
                size={24}
                color="#ef4444"
              />
            </View>

            <View
              style={styles.menuContent}
            >
              <Text
                style={styles.menuTitle}
              >
                Logout
              </Text>

              <Text
                style={
                  styles.menuSubtitle
                }
              >
                Sign out of your account
              </Text>
            </View>

            <Ionicons
              name="chevron-forward"
              size={20}
              color="#6b7280"
            />
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* DEPOSIT MODAL - ADMIN ONLY */}
      <Modal
        visible={
          depositModalVisible &&
          user?.role === 'admin'
        }
        transparent
        animationType="fade"
        onRequestClose={() => {
          if (!isAddingDeposit) {
            setDepositModalVisible(
              false
            );

            setDepositAmount('');
          }
        }}
      >
        <View
          style={styles.modalOverlay}
        >
          <View
            style={styles.modalContent}
          >
            <Text
              style={styles.modalTitle}
            >
              Add Deposit
            </Text>

            <Text
              style={styles.modalSubtitle}
            >
              Add funds to your account
            </Text>

            <View
              style={styles.inputContainer}
            >
              <Ionicons
                name="cash"
                size={20}
                color="#9ca3af"
                style={styles.inputIcon}
              />

              <TextInput
                style={styles.input}
                placeholder="Enter amount"
                placeholderTextColor="#6b7280"
                value={depositAmount}
                onChangeText={
                  setDepositAmount
                }
                keyboardType="decimal-pad"
                autoFocus
                editable={
                  !isAddingDeposit
                }
              />
            </View>

            <View
              style={styles.modalButtons}
            >
              {/* CANCEL */}
              <TouchableOpacity
                style={[
                  styles.modalButton,
                  styles.cancelButton,
                  isAddingDeposit &&
                    styles.disabledButton,
                ]}
                onPress={() => {
                  if (!isAddingDeposit) {
                    setDepositModalVisible(
                      false
                    );

                    setDepositAmount('');
                  }
                }}
                disabled={isAddingDeposit}
              >
                <Text
                  style={
                    styles.cancelButtonText
                  }
                >
                  Cancel
                </Text>
              </TouchableOpacity>

              {/* ADD DEPOSIT */}
              <TouchableOpacity
                style={[
                  styles.modalButton,
                  styles.confirmButton,
                  isAddingDeposit &&
                    styles.disabledButton,
                ]}
                onPress={
                  handleAddDeposit
                }
                disabled={isAddingDeposit}
              >
                <Text
                  style={
                    styles.confirmButtonText
                  }
                >
                  {isAddingDeposit
                    ? 'Adding...'
                    : 'Add Deposit'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* LOGOUT CONFIRMATION MODAL */}
      <Modal
        visible={logoutModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() =>
          setLogoutModalVisible(
            false
          )
        }
      >
        <View
          style={styles.modalOverlay}
        >
          <View
            style={styles.modalContent}
          >
            <View
              style={
                styles.logoutIconContainer
              }
            >
              <Ionicons
                name="log-out"
                size={40}
                color="#ef4444"
              />
            </View>

            <Text
              style={[
                styles.modalTitle,
                styles.logoutTitle,
              ]}
            >
              Logout?
            </Text>

            <Text
              style={styles.modalSubtitle}
            >
              Are you sure you want to
              sign out?
            </Text>

            <View
              style={styles.modalButtons}
            >
              {/* CANCEL */}
              <TouchableOpacity
                testID="cancel-logout"
                style={[
                  styles.modalButton,
                  styles.cancelButton,
                ]}
                onPress={() =>
                  setLogoutModalVisible(
                    false
                  )
                }
              >
                <Text
                  style={
                    styles.cancelButtonText
                  }
                >
                  Cancel
                </Text>
              </TouchableOpacity>

              {/* LOGOUT */}
              <TouchableOpacity
                testID="confirm-logout"
                style={[
                  styles.modalButton,
                  styles.logoutConfirmButton,
                ]}
                onPress={
                  confirmLogout
                }
              >
                <Text
                  style={
                    styles.confirmButtonText
                  }
                >
                  Logout
                </Text>
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

  disabledButton: {
    opacity: 0.6,
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
    backgroundColor:
      'rgba(0, 0, 0, 0.8)',
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

  logoutTitle: {
    textAlign: 'center',
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