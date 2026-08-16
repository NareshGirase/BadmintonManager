import React, {
  useState,
  useEffect,
  useRef,
} from 'react';

import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  Modal,
  Platform,
} from 'react-native';

import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/src/contexts/AuthContext';
import DateTimePicker from '@react-native-community/datetimepicker';

const BACKEND_URL =
  process.env.EXPO_PUBLIC_BACKEND_URL;

interface Expense {
  id: string;
  amount: number;
  description: string;
  created_by?: string;
  expense_date?: string;
  created_at?: string;
}

type ToastType =
  | 'success'
  | 'error'
  | 'warning';

interface ToastData {
  type: ToastType;
  message: string;
}

export default function OtherExpenseScreen() {
  const router = useRouter();
  const { user } = useAuth();

  // =========================
  // FORM STATE
  // =========================

  const [amount, setAmount] =
    useState('');

  const [description, setDescription] =
    useState('');

  const [selectedDate, setSelectedDate] =
    useState(new Date());

  const [showDatePicker, setShowDatePicker] =
    useState(false);

  const [saving, setSaving] =
    useState(false);

  // =========================
  // EXPENSE STATE
  // =========================

  const [expenses, setExpenses] =
    useState<Expense[]>([]);

  const [deleteTargetId, setDeleteTargetId] =
    useState<string | null>(null);

  const [deleting, setDeleting] =
    useState(false);

  // =========================
  // TOAST
  // =========================

  const [toast, setToast] =
    useState<ToastData | null>(null);

  const toastTimerRef = useRef<
    ReturnType<typeof setTimeout> | null
  >(null);

  // =========================
  // WEB DATE INPUT REF
  // =========================

  const webDateInputRef =
    useRef<HTMLInputElement | null>(
      null
    );

  // =========================
  // TOAST
  // =========================

  const showToast = (
    type: ToastType,
    message: string
  ) => {
    if (toastTimerRef.current) {
      clearTimeout(
        toastTimerRef.current
      );
    }

    setToast({
      type,
      message,
    });

    toastTimerRef.current =
      setTimeout(() => {
        setToast(null);
      }, 3000);
  };

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) {
        clearTimeout(
          toastTimerRef.current
        );
      }
    };
  }, []);

  // =========================
  // DATE FORMAT
  // =========================

  const formatSelectedDate = (
    date: Date
  ) => {
    return date.toLocaleDateString(
      'en-IN',
      {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      }
    );
  };

  const formatDateForBackend = (
    date: Date
  ) => {
    const year =
      date.getFullYear();

    const month = String(
      date.getMonth() + 1
    ).padStart(2, '0');

    const day = String(
      date.getDate()
    ).padStart(2, '0');

    return `${year}-${month}-${day}`;
  };

  // =========================
  // OPEN DATE PICKER
  // =========================

  const openDatePicker = () => {
    if (saving) {
      return;
    }

    // WEB
    if (Platform.OS === 'web') {
      const input =
        webDateInputRef.current;

      if (!input) {
        console.log(
          'WEB DATE INPUT NOT FOUND'
        );

        return;
      }

      try {
        // Modern browsers
        if (
          typeof (
            input as any
          ).showPicker ===
          'function'
        ) {
          (
            input as any
          ).showPicker();
        } else {
          // Fallback
          input.focus();
          input.click();
        }
      } catch (error) {
        console.log(
          'SHOW PICKER ERROR:',
          error
        );

        input.focus();
        input.click();
      }

      return;
    }

    // ANDROID / IOS
    setShowDatePicker(true);
  };

  // =========================
  // WEB DATE CHANGE
  // =========================

  const handleWebDateChange = (
    event: any
  ) => {
    const value =
      event?.target?.value;

    if (!value) {
      return;
    }

    const parts =
      value.split('-');

    if (parts.length !== 3) {
      return;
    }

    const year =
      Number(parts[0]);

    const month =
      Number(parts[1]);

    const day =
      Number(parts[2]);

    if (
      !year ||
      !month ||
      !day
    ) {
      return;
    }

    const newDate = new Date(
      year,
      month - 1,
      day
    );

    setSelectedDate(
      newDate
    );
  };

  // =========================
  // FETCH EXPENSES
  // =========================

  const fetchExpenses =
    async () => {
      if (!user?.id) {
        console.log(
          'FETCH EXPENSES STOPPED: No user ID'
        );

        return;
      }

      if (!BACKEND_URL) {
        showToast(
          'error',
          'Backend URL is missing.'
        );

        return;
      }

      try {
        const url =
          `${BACKEND_URL}/api/expenses` +
          `?admin_id=${user.id}`;

        console.log(
          'FETCH EXPENSES URL:',
          url
        );

        const response =
          await fetch(url);

        const data =
          await response.json();

        console.log(
          'FETCH EXPENSES STATUS:',
          response.status
        );

        if (!response.ok) {
          throw new Error(
            data.detail ||
              'Failed to load expenses'
          );
        }

        setExpenses(
          Array.isArray(data)
            ? data
            : []
        );
      } catch (error) {
        console.error(
          'Error fetching expenses:',
          error
        );

        showToast(
          'error',
          error instanceof Error
            ? error.message
            : 'Failed to load expenses.'
        );
      }
    };

  useEffect(() => {
    fetchExpenses();
  }, [user]);

  // =========================
  // ADD EXPENSE
  // =========================

  const handleAddExpense =
    async () => {
      if (saving) {
        return;
      }

      // =========================
      // AMOUNT
      // =========================

      if (!amount.trim()) {
        showToast(
          'error',
          'Please enter the expense amount.'
        );

        return;
      }

      const expenseAmount =
        parseFloat(amount);

      if (
        isNaN(expenseAmount) ||
        expenseAmount <= 0
      ) {
        showToast(
          'error',
          'Please enter a valid amount greater than 0.'
        );

        return;
      }

      // =========================
      // DESCRIPTION
      // =========================

      if (!description.trim()) {
        showToast(
          'error',
          'Please enter a description for this expense.'
        );

        return;
      }

      // =========================
      // USER
      // =========================

      if (!user?.id) {
        showToast(
          'error',
          'Admin information is missing.'
        );

        return;
      }

      if (!BACKEND_URL) {
        showToast(
          'error',
          'Backend URL is missing.'
        );

        return;
      }

      try {
        setSaving(true);

        const url =
          `${BACKEND_URL}/api/expenses` +
          `?admin_id=${user.id}`;

        const requestBody = {
          amount:
            expenseAmount,

          description:
            description.trim(),

          created_by:
            user.id,

          expense_date:
            formatDateForBackend(
              selectedDate
            ),
        };

        console.log(
          'ADD EXPENSE URL:',
          url
        );

        console.log(
          'ADD EXPENSE BODY:',
          requestBody
        );

        const response =
          await fetch(
            url,
            {
              method: 'POST',

              headers: {
                'Content-Type':
                  'application/json',
              },

              body:
                JSON.stringify(
                  requestBody
                ),
            }
          );

        const responseText =
          await response.text();

        let data: any = {};

        try {
          data =
            responseText
              ? JSON.parse(
                  responseText
                )
              : {};
        } catch {
          data = {};
        }

        console.log(
          'ADD EXPENSE STATUS:',
          response.status
        );

        if (!response.ok) {
          throw new Error(
            data.detail ||
              data.message ||
              `Failed to add expense (${response.status})`
          );
        }

        // Clear form
        setAmount('');
        setDescription('');
        setSelectedDate(
          new Date()
        );

        // Refresh
        await fetchExpenses();

        showToast(
          'success',
          `₹${expenseAmount.toFixed(
            2
          )} expense added successfully.`
        );
      } catch (error) {
        console.error(
          'Error adding expense:',
          error
        );

        showToast(
          'error',
          error instanceof Error
            ? error.message
            : 'Something went wrong while adding the expense.'
        );
      } finally {
        setSaving(false);
      }
    };

  // =========================
  // DELETE EXPENSE
  // =========================

  const confirmDelete =
    async () => {
      if (!deleteTargetId) {
        return;
      }

      if (!user?.id) {
        showToast(
          'error',
          'Admin information is missing.'
        );

        return;
      }

      if (!BACKEND_URL) {
        showToast(
          'error',
          'Backend URL is missing.'
        );

        return;
      }

      setDeleting(true);

      try {
        const deleteUrl =
          `${BACKEND_URL}/api/expenses/` +
          `${deleteTargetId}` +
          `?admin_id=${user.id}`;

        const response =
          await fetch(
            deleteUrl,
            {
              method: 'DELETE',
            }
          );

        const responseText =
          await response.text();

        let data: any = {};

        try {
          data =
            responseText
              ? JSON.parse(
                  responseText
                )
              : {};
        } catch {
          data = {};
        }

        if (!response.ok) {
          throw new Error(
            data.detail ||
              data.message ||
              `Failed to delete expense (${response.status})`
          );
        }

        setExpenses(
          currentExpenses =>
            currentExpenses.filter(
              expense =>
                expense.id !==
                deleteTargetId
            )
        );

        setDeleteTargetId(null);

        showToast(
          'success',
          'Expense deleted successfully.'
        );

        await fetchExpenses();
      } catch (error) {
        console.error(
          'Error deleting expense:',
          error
        );

        showToast(
          'error',
          error instanceof Error
            ? error.message
            : 'Something went wrong while deleting the expense.'
        );
      } finally {
        setDeleting(false);
      }
    };

  // =========================
  // TOAST COLORS
  // =========================

  const getToastBackgroundColor =
    () => {
      switch (toast?.type) {
        case 'success':
          return '#16a34a';

        case 'warning':
          return '#d97706';

        case 'error':
        default:
          return '#dc2626';
      }
    };

  const getToastIcon = () => {
    switch (toast?.type) {
      case 'success':
        return 'checkmark-circle';

      case 'warning':
        return 'warning';

      case 'error':
      default:
        return 'alert-circle';
    }
  };

  // =========================
  // SCREEN
  // =========================

  return (
    <SafeAreaView
      style={styles.container}
      edges={['top']}
    >
      {/* HEADER */}

      <View
        style={styles.header}
      >
        <TouchableOpacity
          onPress={() =>
            router.replace('/')
          }
          style={
            styles.backButton
          }
          activeOpacity={0.7}
        >
          <Ionicons
            name="arrow-back"
            size={24}
            color="#fff"
          />
        </TouchableOpacity>

        <Text
          style={styles.headerTitle}
        >
          Other Expense
        </Text>

        <View
          style={{ width: 40 }}
        />
      </View>

      {/* TOAST */}

      {toast && (
        <View
          style={[
            styles.toast,
            {
              backgroundColor:
                getToastBackgroundColor(),
            },
          ]}
        >
          <Ionicons
            name={
              getToastIcon() as any
            }
            size={22}
            color="#fff"
          />

          <Text
            style={
              styles.toastText
            }
          >
            {toast.message}
          </Text>

          <TouchableOpacity
            onPress={() =>
              setToast(null)
            }
          >
            <Ionicons
              name="close"
              size={20}
              color="#fff"
            />
          </TouchableOpacity>
        </View>
      )}

      {/* CONTENT */}

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={
          styles.scrollContent
        }
        keyboardShouldPersistTaps="handled"
      >
        <View
          style={styles.content}
        >
          {/* =========================
              DATE
              ========================= */}

          <Text
            style={styles.label}
          >
            Expense Date
          </Text>

          {Platform.OS === 'web' ? (
            /*
             * WEB VERSION
             *
             * The actual HTML date input
             * is NOT visible.
             *
             * The user clicks our normal
             * React Native styled button,
             * which calls showPicker().
             */

            <View
              style={
                styles.webDateContainer
              }
            >
              <TouchableOpacity
                style={
                  styles.datePickerButton
                }
                onPress={
                  openDatePicker
                }
                disabled={saving}
                activeOpacity={0.7}
              >
                <Ionicons
                  name="calendar-outline"
                  size={21}
                  color="#10b981"
                />

                <Text
                  style={
                    styles.datePickerText
                  }
                >
                  {formatSelectedDate(
                    selectedDate
                  )}
                </Text>
              </TouchableOpacity>

              <input
                ref={
                  webDateInputRef
                }
                type="date"
                value={formatDateForBackend(
                  selectedDate
                )}
                onChange={
                  handleWebDateChange
                }
                disabled={saving}
                tabIndex={-1}
                style={
                  {
                    position:
                      'absolute',
                    width: 1,
                    height: 1,
                    opacity: 0,
                    pointerEvents:
                      'none',
                  } as React.CSSProperties
                }
              />
            </View>
          ) : (
            <>
              <TouchableOpacity
                style={
                  styles.datePickerButton
                }
                onPress={
                  openDatePicker
                }
                disabled={saving}
                activeOpacity={0.7}
              >
                <Ionicons
                  name="calendar-outline"
                  size={21}
                  color="#10b981"
                />

                <Text
                  style={
                    styles.datePickerText
                  }
                >
                  {formatSelectedDate(
                    selectedDate
                  )}
                </Text>
              </TouchableOpacity>

              {showDatePicker && (
                <DateTimePicker
                  value={
                    selectedDate
                  }
                  mode="date"
                  display={
                    Platform.OS ===
                    'ios'
                      ? 'spinner'
                      : 'default'
                  }
                  onChange={(
                    event,
                    date
                  ) => {
                    setShowDatePicker(
                      false
                    );

                    if (date) {
                      setSelectedDate(
                        date
                      );
                    }
                  }}
                />
              )}
            </>
          )}

          {/* =========================
              AMOUNT
              ========================= */}

          <Text
            style={styles.label}
          >
            Expense Amount
          </Text>

          <TextInput
            style={styles.input}
            placeholder="Enter amount"
            placeholderTextColor="#64748b"
            value={amount}
            onChangeText={
              setAmount
            }
            keyboardType="decimal-pad"
            editable={!saving}
          />

          {/* =========================
              DESCRIPTION
              ========================= */}

          <Text
            style={styles.label}
          >
            Description
          </Text>

          <TextInput
            style={[
              styles.input,
              styles.descriptionInput,
            ]}
            placeholder="What was this expense for?"
            placeholderTextColor="#64748b"
            value={description}
            onChangeText={
              setDescription
            }
            multiline
            textAlignVertical="top"
            editable={!saving}
          />

          {/* INFO */}

          <View
            style={styles.infoBox}
          >
            <Ionicons
              name="information-circle-outline"
              size={22}
              color="#3b82f6"
            />

            <Text
              style={styles.infoText}
            >
              This expense will be split
              equally among all active
              team members, including the
              admin.
            </Text>
          </View>

          {/* ADD BUTTON */}

          <TouchableOpacity
            style={[
              styles.saveButton,
              saving &&
                styles.disabledButton,
            ]}
            onPress={
              handleAddExpense
            }
            disabled={saving}
            activeOpacity={0.8}
          >
            {saving ? (
              <ActivityIndicator
                color="#fff"
              />
            ) : (
              <>
                <Ionicons
                  name="checkmark-circle-outline"
                  size={22}
                  color="#fff"
                />

                <Text
                  style={
                    styles.saveButtonText
                  }
                >
                  Add Expense
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* =========================
            PREVIOUS EXPENSES
            ========================= */}

        <View
          style={
            styles.expensesSection
          }
        >
          <Text
            style={
              styles.sectionTitle
            }
          >
            Previous Expenses
          </Text>

          {expenses.length ===
          0 ? (
            <Text
              style={styles.emptyText}
            >
              No expenses recorded yet.
            </Text>
          ) : (
            expenses.map(
              expense => (
                <View
                  key={
                    expense.id
                  }
                  style={
                    styles.expenseCard
                  }
                >
                  <View
                    style={
                      styles.expenseInfo
                    }
                  >
                    <View
                      style={
                        styles.expenseDetails
                      }
                    >
                      <Text
                        style={
                          styles.expenseDescription
                        }
                      >
                        {
                          expense.description
                        }
                      </Text>

                      {expense.expense_date && (
                        <Text
                          style={
                            styles.expenseDate
                          }
                        >
                          {
                            expense.expense_date
                          }
                        </Text>
                      )}

                      <Text
                        style={
                          styles.expenseAmount
                        }
                      >
                        ₹
                        {Number(
                          expense.amount
                        ).toFixed(
                          2
                        )}
                      </Text>
                    </View>

                    <TouchableOpacity
                      testID={`delete-expense-${expense.id}`}
                      style={[
                        styles.deleteIconButton,
                        deleting &&
                          deleteTargetId ===
                            expense.id &&
                          styles.disabledDeleteButton,
                      ]}
                      onPress={() =>
                        setDeleteTargetId(
                          expense.id
                        )
                      }
                      disabled={
                        deleting &&
                        deleteTargetId ===
                          expense.id
                      }
                      activeOpacity={0.7}
                    >
                      <Ionicons
                        name="trash-outline"
                        size={22}
                        color="#ef4444"
                      />
                    </TouchableOpacity>
                  </View>
                </View>
              )
            )
          )}
        </View>
      </ScrollView>

      {/* =========================
          DELETE MODAL
          ========================= */}

      <Modal
        visible={
          deleteTargetId !== null
        }
        transparent
        animationType="fade"
        onRequestClose={() => {
          if (!deleting) {
            setDeleteTargetId(
              null
            );
          }
        }}
      >
        <View
          style={
            styles.modalOverlay
          }
        >
          <View
            style={
              styles.modalContent
            }
          >
            <View
              style={
                styles.modalIconContainer
              }
            >
              <Ionicons
                name="warning"
                size={40}
                color="#ef4444"
              />
            </View>

            <Text
              style={
                styles.modalTitle
              }
            >
              Delete Expense?
            </Text>

            <Text
              style={
                styles.modalMessage
              }
            >
              This will refund the expense
              amount to the players. This
              action cannot be undone.
            </Text>

            <View
              style={
                styles.modalButtons
              }
            >
              <TouchableOpacity
                testID="cancel-delete-expense"
                style={[
                  styles.modalButton,
                  styles.cancelButton,
                ]}
                onPress={() =>
                  setDeleteTargetId(
                    null
                  )
                }
                disabled={deleting}
                activeOpacity={0.8}
              >
                <Text
                  style={
                    styles.cancelButtonText
                  }
                >
                  Cancel
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                testID="confirm-delete-expense"
                style={[
                  styles.modalButton,
                  styles.deleteConfirmButton,
                ]}
                onPress={
                  confirmDelete
                }
                disabled={deleting}
                activeOpacity={0.8}
              >
                {deleting ? (
                  <ActivityIndicator
                    color="#fff"
                  />
                ) : (
                  <Text
                    style={
                      styles.deleteConfirmButtonText
                    }
                  >
                    Delete
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// =========================
// STYLES
// =========================

const styles =
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor:
        '#0f172a',
    },

    scrollView: {
      flex: 1,
    },

    scrollContent: {
      paddingBottom: 40,
    },

    // =========================
    // HEADER
    // =========================

    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent:
        'space-between',
      paddingHorizontal: 20,
      paddingVertical: 16,
      borderBottomWidth: 1,
      borderBottomColor:
        '#334155',
    },

    backButton: {
      width: 40,
      height: 40,
      justifyContent:
        'center',
      alignItems: 'center',
    },

    headerTitle: {
      fontSize: 20,
      fontWeight: 'bold',
      color: '#fff',
    },

    // =========================
    // TOAST
    // =========================

    toast: {
      minHeight: 52,
      marginHorizontal: 16,
      marginTop: 12,
      marginBottom: 4,
      borderRadius: 12,
      paddingHorizontal: 14,
      paddingVertical: 12,
      flexDirection: 'row',
      alignItems: 'center',

      shadowColor: '#000',
      shadowOffset: {
        width: 0,
        height: 3,
      },
      shadowOpacity: 0.3,
      shadowRadius: 5,
      elevation: 5,
    },

    toastText: {
      flex: 1,
      color: '#fff',
      fontSize: 14,
      fontWeight: '600',
      marginLeft: 10,
      marginRight: 10,
    },

    // =========================
    // FORM
    // =========================

    content: {
      padding: 20,
    },

    label: {
      fontSize: 15,
      fontWeight: '600',
      color: '#e2e8f0',
      marginBottom: 8,
      marginTop: 12,
    },

    input: {
      backgroundColor:
        '#1e293b',
      borderWidth: 1,
      borderColor:
        '#334155',
      borderRadius: 12,
      paddingHorizontal: 16,
      paddingVertical: 14,
      fontSize: 16,
      color: '#fff',
    },

    descriptionInput: {
      minHeight: 110,
    },

    // =========================
    // DATE PICKER
    // =========================

    webDateContainer: {
      position: 'relative',
      width: '100%',
    },

    datePickerButton: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor:
        '#1e293b',
      borderWidth: 1,
      borderColor:
        '#334155',
      borderRadius: 12,
      paddingHorizontal: 16,
      height: 52,
      width: '100%',
    },

    datePickerText: {
      flex: 1,
      color: '#fff',
      fontSize: 16,
      marginLeft: 12,
    },

    // =========================
    // INFO BOX
    // =========================

    infoBox: {
      flexDirection: 'row',
      alignItems:
        'flex-start',
      backgroundColor:
        '#172554',
      borderRadius: 12,
      padding: 14,
      marginTop: 24,
    },

    infoText: {
      flex: 1,
      color: '#bfdbfe',
      fontSize: 14,
      lineHeight: 20,
      marginLeft: 10,
    },

    // =========================
    // SAVE
    // =========================

    saveButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent:
        'center',
      backgroundColor:
        '#10b981',
      borderRadius: 12,
      paddingVertical: 16,
      marginTop: 24,
    },

    disabledButton: {
      opacity: 0.6,
    },

    saveButtonText: {
      color: '#fff',
      fontSize: 17,
      fontWeight: 'bold',
      marginLeft: 8,
    },

    // =========================
    // EXPENSE LIST
    // =========================

    expensesSection: {
      paddingHorizontal: 20,
      marginTop: 12,
    },

    sectionTitle: {
      fontSize: 20,
      fontWeight: 'bold',
      color: '#fff',
      marginBottom: 16,
    },

    emptyText: {
      color: '#9ca3af',
      fontSize: 14,
    },

    expenseCard: {
      backgroundColor:
        '#1e293b',
      borderWidth: 1,
      borderColor:
        '#334155',
      borderRadius: 12,
      padding: 16,
      marginBottom: 10,
    },

    expenseInfo: {
      flexDirection: 'row',
      alignItems: 'center',
    },

    expenseDetails: {
      flex: 1,
    },

    expenseDescription: {
      color: '#fff',
      fontSize: 16,
      fontWeight: '600',
      marginBottom: 6,
    },

    expenseDate: {
      color: '#94a3b8',
      fontSize: 13,
      marginBottom: 5,
    },

    expenseAmount: {
      color: '#ef4444',
      fontSize: 17,
      fontWeight: 'bold',
    },

    deleteIconButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor:
        '#7f1d1d20',
      justifyContent:
        'center',
      alignItems: 'center',
      marginLeft: 12,
    },

    disabledDeleteButton: {
      opacity: 0.5,
    },

    // =========================
    // MODAL
    // =========================

    modalOverlay: {
      flex: 1,
      backgroundColor:
        'rgba(0, 0, 0, 0.8)',
      justifyContent:
        'center',
      alignItems: 'center',
      padding: 24,
    },

    modalContent: {
      backgroundColor:
        '#1e293b',
      borderRadius: 16,
      padding: 24,
      width: '100%',
      maxWidth: 400,
      borderWidth: 1,
      borderColor:
        '#334155',
      alignItems: 'center',
    },

    modalIconContainer: {
      width: 72,
      height: 72,
      borderRadius: 36,
      backgroundColor:
        '#7f1d1d',
      justifyContent:
        'center',
      alignItems: 'center',
      marginBottom: 16,
    },

    modalTitle: {
      fontSize: 22,
      fontWeight: 'bold',
      color: '#fff',
      marginBottom: 8,
    },

    modalMessage: {
      fontSize: 14,
      color: '#9ca3af',
      textAlign: 'center',
      marginBottom: 24,
      lineHeight: 20,
    },

    modalButtons: {
      flexDirection: 'row',
      gap: 12,
      width: '100%',
    },

    modalButton: {
      flex: 1,
      height: 48,
      borderRadius: 12,
      justifyContent:
        'center',
      alignItems: 'center',
    },

    cancelButton: {
      backgroundColor:
        '#334155',
    },

    cancelButtonText: {
      color: '#fff',
      fontSize: 16,
      fontWeight: '600',
    },

    deleteConfirmButton: {
      backgroundColor:
        '#ef4444',
    },

    deleteConfirmButtonText: {
      color: '#fff',
      fontSize: 16,
      fontWeight: '600',
    },
  });