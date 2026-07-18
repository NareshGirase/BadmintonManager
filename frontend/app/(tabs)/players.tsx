import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, ActivityIndicator, Alert, TextInput, Modal } from 'react-native';
import { useAuth } from '@/src/contexts/AuthContext';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

interface Player {
  id: string;
  name: string;
  balance: number;
  role: string;
  phone?: string;
}

export default function PlayersScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const [players, setPlayers] = useState<Player[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [depositModalVisible, setDepositModalVisible] = useState(false);
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
  const [depositAmount, setDepositAmount] = useState('');

  useEffect(() => {
    if (!user) {
      router.replace('/');
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
      Alert.alert('Error', 'Failed to load players');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchPlayers();
    setRefreshing(false);
  }, []);

  const handleAddDeposit = async () => {
    if (!selectedPlayer || !depositAmount) return;

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
          user_id: selectedPlayer.id,
          amount: amount,
        }),
      });

      if (response.ok) {
        Alert.alert('Success', 'Deposit added successfully');
        setDepositModalVisible(false);
        setDepositAmount('');
        setSelectedPlayer(null);
        fetchPlayers();
      } else {
        Alert.alert('Error', 'Failed to add deposit');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to add deposit');
    }
  };

  const handleDeletePlayer = async (playerId: string) => {
    Alert.alert(
      'Remove Player',
      'Are you sure you want to remove this player?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              const response = await fetch(`${BACKEND_URL}/api/players/${playerId}`, {
                method: 'DELETE',
              });

              if (response.ok) {
                Alert.alert('Success', 'Player removed successfully');
                fetchPlayers();
              } else {
                Alert.alert('Error', 'Failed to remove player');
              }
            } catch (error) {
              Alert.alert('Error', 'Failed to remove player');
            }
          },
        },
      ]
    );
  };

  const getBalanceColor = (balance: number) => {
    if (balance < 100) return '#ef4444';
    if (balance < 300) return '#f59e0b';
    return '#10b981';
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#10b981" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Players</Text>
        {user?.role === 'admin' && (
          <TouchableOpacity 
            style={styles.addButton}
            onPress={() => router.push('/add-player' as any)}
          >
            <Ionicons name="person-add" size={24} color="#fff" />
          </TouchableOpacity>
        )}
      </View>

      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#10b981" />
        }
      >
        <View style={styles.playersList}>
          {players.map((player) => (
            <View key={player.id} style={styles.playerCard}>
              <View style={styles.playerMain}>
                <View style={[styles.playerAvatar, { backgroundColor: player.role === 'admin' ? '#8b5cf6' : '#3b82f6' }]}>
                  <Ionicons name="person" size={28} color="#fff" />
                </View>
                <View style={styles.playerInfo}>
                  <Text style={styles.playerName}>
                    {player.name}
                    {player.role === 'admin' && <Text style={styles.adminBadge}> • Admin</Text>}
                  </Text>
                  {player.phone && (
                    <Text style={styles.playerPhone}>{player.phone}</Text>
                  )}
                  <Text style={[styles.playerBalance, { color: getBalanceColor(player.balance) }]}>
                    ₹{player.balance.toFixed(2)}
                  </Text>
                </View>
              </View>

              <View style={styles.playerActions}>
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => {
                    setSelectedPlayer(player);
                    setDepositModalVisible(true);
                  }}
                >
                  <Ionicons name="cash" size={20} color="#10b981" />
                  <Text style={styles.actionButtonText}>Add Funds</Text>
                </TouchableOpacity>

                {user?.role === 'admin' && player.role !== 'admin' && (
                  <TouchableOpacity
                    style={[styles.actionButton, styles.deleteButton]}
                    onPress={() => handleDeletePlayer(player.id)}
                  >
                    <Ionicons name="trash-outline" size={20} color="#ef4444" />
                  </TouchableOpacity>
                )}
              </View>
            </View>
          ))}
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
            <Text style={styles.modalSubtitle}>Add funds for {selectedPlayer?.name}</Text>

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
                  setSelectedPlayer(null);
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 24,
    paddingBottom: 16,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
  },
  addButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#10b981',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
  },
  playersList: {
    padding: 16,
  },
  playerCard: {
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#334155',
  },
  playerMain: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  playerAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  playerInfo: {
    marginLeft: 16,
    flex: 1,
  },
  playerName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  adminBadge: {
    color: '#8b5cf6',
    fontSize: 14,
  },
  playerPhone: {
    fontSize: 14,
    color: '#9ca3af',
    marginBottom: 8,
  },
  playerBalance: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  playerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0f172a',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#334155',
  },
  actionButtonText: {
    color: '#10b981',
    fontWeight: '600',
    marginLeft: 8,
  },
  deleteButton: {
    flex: 0,
    paddingHorizontal: 16,
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
});