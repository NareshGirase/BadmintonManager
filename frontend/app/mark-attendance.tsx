import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { useAuth } from '@/src/contexts/AuthContext';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { SafeAreaView } from 'react-native-safe-area-context';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

interface Player {
  id: string;
  name: string;
  balance: number;
  role: string;
}

export default function MarkAttendanceScreen() {
  const { user, logout } = useAuth();
  const router = useRouter();

  const [players, setPlayers] = useState<Player[]>([]);
  const [selectedPlayers, setSelectedPlayers] = useState<string[]>([]);
  const [courtFee, setCourtFee] = useState('');
  const [date, setDate] = useState(
    new Date().toISOString().split('T')[0]
  );

  const [showDatePicker, setShowDatePicker] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [staleSessionModal, setStaleSessionModal] = useState(false);

  useEffect(() => {
    if (!user) {
      router.replace('/');
      return;
    }

    if (user.role !== 'admin') {
      setErrorMessage('Only admin can mark attendance');

      setTimeout(() => {
        router.back();
      }, 1500);

      return;
    }

    fetchPlayers();
  }, [user]);

  const fetchPlayers = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/players`);
      const data = await response.json();

      setPlayers(data);
    } catch (error) {
      console.error('Error fetching players:', error);
      setErrorMessage('Failed to load players');
    } finally {
      setLoading(false);
    }
  };

  const parseDate = (dateString: string) => {
    if (!dateString) {
      return new Date();
    }

    const [year, month, day] = dateString.split('-').map(Number);

    return new Date(year, month - 1, day);
  };

  const formatDateForBackend = (selectedDate: Date) => {
    const year = selectedDate.getFullYear();
    const month = String(
      selectedDate.getMonth() + 1
    ).padStart(2, '0');

    const day = String(
      selectedDate.getDate()
    ).padStart(2, '0');

    return `${year}-${month}-${day}`;
  };

  const formatDateForDisplay = (dateString: string) => {
    if (!dateString) {
      return 'Select date';
    }

    return parseDate(dateString).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  const handleDateChange = (
    event: any,
    selectedDate?: Date
  ) => {
    console.log('DATE PICKER EVENT:', event);
    console.log('SELECTED DATE:', selectedDate);

    if (selectedDate) {
      const formattedDate =
        formatDateForBackend(selectedDate);

      console.log('NEW DATE:', formattedDate);

      setDate(formattedDate);
    }

    setShowDatePicker(false);
  };

  const togglePlayer = (playerId: string) => {
    if (selectedPlayers.includes(playerId)) {
      setSelectedPlayers(
        selectedPlayers.filter(
          id => id !== playerId
        )
      );
    } else {
      setSelectedPlayers([
        ...selectedPlayers,
        playerId,
      ]);
    }
  };

  const handleSubmit = async () => {
    if (selectedPlayers.length === 0) {
      setErrorMessage(
        'Please select at least one player'
      );
      return;
    }

    const fee = parseFloat(courtFee);

    if (isNaN(fee) || fee <= 0) {
      setErrorMessage(
        'Please enter a valid court fee'
      );
      return;
    }

    setSubmitting(true);
    setErrorMessage(null);

    try {
      const response = await fetch(
        `${BACKEND_URL}/api/sessions?admin_id=${user?.id}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            date,
            court_fee: fee,
            players_present: selectedPlayers,
          }),
        }
      );

      if (response.ok) {
        const result = await response.json();

        router.replace({
          pathname: '/(tabs)/sessions' as any,
          params: {
            newSessionAmount:
              result.amount_per_player.toFixed(2),
          },
        });
      } else if (
        response.status === 403 ||
        response.status === 404
      ) {
        setStaleSessionModal(true);
      } else {
        const error = await response.json();

        setErrorMessage(
          error.detail ||
            'Failed to create session'
        );
      }
    } catch (error) {
      console.error('Create session error:', error);

      setErrorMessage(
        'Network error. Please check your connection.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleReLogin = async () => {
    setStaleSessionModal(false);

    await logout();

    router.replace('/');
  };

  if (loading) {
    return (
      <SafeAreaView
        style={styles.loadingContainer}
        edges={['top']}
      >
        <ActivityIndicator
          size="large"
          color="#10b981"
        />

        <Text style={styles.loadingText}>
          Loading players...
        </Text>
      </SafeAreaView>
    );
  }

  const amountPerPlayer =
    selectedPlayers.length > 0 &&
    courtFee &&
    !isNaN(parseFloat(courtFee))
      ? (
          parseFloat(courtFee) /
          selectedPlayers.length
        ).toFixed(2)
      : '0.00';

  return (
    <SafeAreaView
      style={styles.container}
      edges={['top']}
    >
      <KeyboardAvoidingView
        style={styles.container}
        behavior={
          Platform.OS === 'ios'
            ? 'padding'
            : 'height'
        }
      >
        {/* HEADER */}

        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backButton}
          >
            <Ionicons
              name="arrow-back"
              size={24}
              color="#fff"
            />
          </TouchableOpacity>

          <Text style={styles.headerTitle}>
            Mark Attendance
          </Text>

          <View style={{ width: 40 }} />
        </View>

        {/* ERROR */}

        {errorMessage && (
          <View style={styles.errorBanner}>
            <Ionicons
              name="alert-circle"
              size={20}
              color="#fff"
            />

            <Text style={styles.errorBannerText}>
              {errorMessage}
            </Text>

            <TouchableOpacity
              onPress={() =>
                setErrorMessage(null)
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

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={
            styles.scrollContent
          }
          keyboardShouldPersistTaps="handled"
        >
          {/* DATE SECTION */}

          <View style={styles.section}>
            <Text style={styles.label}>
              Date
            </Text>

            {Platform.OS === 'web' ? (
              <View
                style={
                  styles.dateInputContainer
                }
              >
                <Ionicons
                  name="calendar"
                  size={20}
                  color="#9ca3af"
                  style={styles.inputIcon}
                />

                <input
                  type="date"
                  value={date}
                  onChange={(e) =>
                    setDate(e.target.value)
                  }
                  style={{
                    flex: 1,
                    height: 54,
                    backgroundColor:
                      'transparent',
                    border: 'none',
                    outline: 'none',
                    color: '#ffffff',
                    fontSize: 16,
                    fontFamily:
                      'inherit',
                    colorScheme: 'dark',
                  }}
                />
              </View>
            ) : (
              <>
                <TouchableOpacity
                  style={
                    styles.dateInputContainer
                  }
                  onPress={() =>
                    setShowDatePicker(true)
                  }
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name="calendar"
                    size={20}
                    color="#9ca3af"
                    style={
                      styles.inputIcon
                    }
                  />

                  <Text
                    style={styles.dateText}
                  >
                    {formatDateForDisplay(
                      date
                    )}
                  </Text>

                  <Ionicons
                    name="chevron-down"
                    size={20}
                    color="#9ca3af"
                  />
                </TouchableOpacity>

                {showDatePicker && (
                  <DateTimePicker
                    value={parseDate(date)}
                    mode="date"
                    display={
                      Platform.OS === 'ios'
                        ? 'spinner'
                        : 'default'
                    }
                    onChange={
                      handleDateChange
                    }
                  />
                )}
              </>
            )}
          </View>

          {/* COURT FEE */}

          <View style={styles.section}>
            <Text style={styles.label}>
              Court Fee (₹)
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
                value={courtFee}
                onChangeText={setCourtFee}
                placeholder="Enter court fee"
                placeholderTextColor="#6b7280"
                keyboardType="numeric"
              />
            </View>
          </View>

          {/* COST PER PLAYER */}

          {selectedPlayers.length > 0 &&
            courtFee !== '' &&
            !isNaN(parseFloat(courtFee)) && (
              <View
                style={styles.costCard}
              >
                <Text
                  style={styles.costLabel}
                >
                  Cost per player:
                </Text>

                <Text
                  style={styles.costAmount}
                >
                  ₹{amountPerPlayer}
                </Text>

                <Text
                  style={styles.costSubtext}
                >
                  {selectedPlayers.length}{' '}
                  {selectedPlayers.length ===
                  1
                    ? 'player'
                    : 'players'}{' '}
                  selected
                </Text>
              </View>
            )}

          {/* PLAYERS */}

          <View style={styles.section}>
            <Text style={styles.label}>
              Select Players Present
            </Text>

            {players.map((player) => (
              <TouchableOpacity
                key={player.id}
                style={[
                  styles.playerItem,
                  selectedPlayers.includes(
                    player.id
                  )
                    ? styles.playerItemSelected
                    : null,
                ]}
                onPress={() =>
                  togglePlayer(
                    player.id
                  )
                }
              >
                <View
                  style={
                    styles.playerInfo
                  }
                >
                  <View
                    style={[
                      styles.playerAvatar,
                      {
                        backgroundColor:
                          player.role ===
                          'admin'
                            ? '#8b5cf6'
                            : '#3b82f6',
                      },
                    ]}
                  >
                    <Ionicons
                      name="person"
                      size={20}
                      color="#fff"
                    />
                  </View>

                  <View
                    style={
                      styles.playerDetails
                    }
                  >
                    <Text
                      style={
                        styles.playerName
                      }
                    >
                      {String(
                        player.name || ''
                      )}
                    </Text>

                    <Text
                      style={
                        styles.playerBalance
                      }
                    >
                      Balance: ₹
                      {Number(
                        player.balance ||
                          0
                      ).toFixed(2)}
                    </Text>
                  </View>
                </View>

                <View
                  style={[
                    styles.checkbox,
                    selectedPlayers.includes(
                      player.id
                    )
                      ? styles.checkboxSelected
                      : null,
                  ]}
                >
                  {selectedPlayers.includes(
                    player.id
                  ) && (
                    <Ionicons
                      name="checkmark"
                      size={20}
                      color="#fff"
                    />
                  )}
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>

        {/* FOOTER */}

        <View style={styles.footer}>
          <TouchableOpacity
            style={[
              styles.submitButton,
              submitting
                ? styles.submitButtonDisabled
                : null,
            ]}
            onPress={handleSubmit}
            disabled={submitting}
          >
            {submitting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <View
                style={styles.submitContent}
              >
                <Ionicons
                  name="checkmark-circle"
                  size={24}
                  color="#fff"
                />

                <Text
                  style={
                    styles.submitButtonText
                  }
                >
                  Create Session
                </Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* SESSION EXPIRED MODAL */}

        <Modal
          visible={staleSessionModal}
          transparent
          animationType="fade"
          onRequestClose={() =>
            setStaleSessionModal(false)
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
                  styles.modalIconContainer
                }
              >
                <Ionicons
                  name="warning"
                  size={40}
                  color="#f59e0b"
                />
              </View>

              <Text
                style={styles.modalTitle}
              >
                Session Expired
              </Text>

              <Text
                style={
                  styles.modalMessage
                }
              >
                Your session appears to be
                outdated. Please login again
                to continue.
              </Text>

              <TouchableOpacity
                style={[
                  styles.modalButton,
                  styles.modalButtonPrimary,
                ]}
                onPress={
                  handleReLogin
                }
              >
                <Text
                  style={
                    styles.modalButtonText
                  }
                >
                  Login Again
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },

  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0f172a',
  },

  loadingText: {
    color: '#9ca3af',
    marginTop: 12,
    fontSize: 14,
  },

  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ef4444',
    padding: 12,
    paddingHorizontal: 16,
    gap: 8,
  },

  errorBannerText: {
    color: '#fff',
    fontWeight: '600',
    flex: 1,
    fontSize: 14,
  },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },

  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },

  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },

  scrollView: {
    flex: 1,
  },

  scrollContent: {
    paddingBottom: 20,
  },

  section: {
    padding: 16,
  },

  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 12,
  },

  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e293b',
    borderRadius: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#334155',
  },

  dateInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e293b',
    borderRadius: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#334155',
    height: 56,
  },

  dateText: {
    flex: 1,
    color: '#fff',
    fontSize: 16,
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

  costCard: {
    backgroundColor: '#1e293b',
    margin: 16,
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#10b981',
  },

  costLabel: {
    fontSize: 14,
    color: '#9ca3af',
    marginBottom: 8,
  },

  costAmount: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#10b981',
    marginBottom: 4,
  },

  costSubtext: {
    fontSize: 12,
    color: '#6b7280',
  },

  playerItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#1e293b',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 2,
    borderColor: '#334155',
  },

  playerItemSelected: {
    borderColor: '#10b981',
    backgroundColor: '#134e4a',
  },

  playerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },

  playerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },

  playerDetails: {
    marginLeft: 12,
  },

  playerName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 2,
  },

  playerBalance: {
    fontSize: 14,
    color: '#9ca3af',
  },

  checkbox: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: '#6b7280',
    justifyContent: 'center',
    alignItems: 'center',
  },

  checkboxSelected: {
    backgroundColor: '#10b981',
    borderColor: '#10b981',
  },

  footer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#334155',
  },

  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#10b981',
    height: 56,
    borderRadius: 12,
  },

  submitButtonDisabled: {
    opacity: 0.6,
  },

  submitContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },

  submitButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    marginLeft: 8,
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
    alignItems: 'center',
  },

  modalIconContainer: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#78350f',
    justifyContent: 'center',
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

  modalButton: {
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },

  modalButtonPrimary: {
    backgroundColor: '#10b981',
  },

  modalButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});