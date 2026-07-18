import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
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
}

export default function MarkAttendanceScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const [players, setPlayers] = useState<Player[]>([]);
  const [selectedPlayers, setSelectedPlayers] = useState<string[]>([]);
  const [courtFee, setCourtFee] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!user || user.role !== 'admin') {
      Alert.alert('Access Denied', 'Only admin can mark attendance');
      router.back();
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

  const togglePlayer = (playerId: string) => {
    if (selectedPlayers.includes(playerId)) {
      setSelectedPlayers(selectedPlayers.filter(id => id !== playerId));
    } else {
      setSelectedPlayers([...selectedPlayers, playerId]);
    }
  };

  const handleSubmit = async () => {
    if (selectedPlayers.length === 0) {
      Alert.alert('Error', 'Please select at least one player');
      return;
    }

    const fee = parseFloat(courtFee);
    if (isNaN(fee) || fee <= 0) {
      Alert.alert('Error', 'Please enter a valid court fee');
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch(`${BACKEND_URL}/api/sessions?admin_id=${user?.id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          date,
          court_fee: fee,
          players_present: selectedPlayers,
        }),
      });

      if (response.ok) {
        const result = await response.json();
        // Navigate immediately - success shown as toast-like via router push
        router.replace({
          pathname: '/(tabs)/sessions' as any,
          params: { newSessionAmount: result.amount_per_player.toFixed(2) },
        });
      } else {
        const error = await response.json();
        Alert.alert('Error', error.detail || 'Failed to create session');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to create session');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#10b981" />
      </View>
    );
  }

  const amountPerPlayer = selectedPlayers.length > 0 && courtFee ? 
    (parseFloat(courtFee) / selectedPlayers.length).toFixed(2) : '0.00';

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <KeyboardAvoidingView 
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Mark Attendance</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView style={styles.scrollView}>
          {/* Date Input */}
          <View style={styles.section}>
            <Text style={styles.label}>Date</Text>
            <View style={styles.inputContainer}>
              <Ionicons name="calendar" size={20} color="#9ca3af" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                value={date}
                onChangeText={setDate}
                placeholder="YYYY-MM-DD"
                placeholderTextColor="#6b7280"
              />
            </View>
          </View>

          {/* Court Fee Input */}
          <View style={styles.section}>
            <Text style={styles.label}>Court Fee (₹)</Text>
            <View style={styles.inputContainer}>
              <Ionicons name="cash" size={20} color="#9ca3af" style={styles.inputIcon} />
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

          {/* Cost Per Player Display */}
          {selectedPlayers.length > 0 && courtFee && (
            <View style={styles.costCard}>
              <Text style={styles.costLabel}>Cost per player:</Text>
              <Text style={styles.costAmount}>₹{amountPerPlayer}</Text>
              <Text style={styles.costSubtext}>
                ({selectedPlayers.length} {selectedPlayers.length === 1 ? 'player' : 'players'} selected)
              </Text>
            </View>
          )}

          {/* Players Selection */}
          <View style={styles.section}>
            <Text style={styles.label}>Select Players Present</Text>
            {players.map((player) => (
              <TouchableOpacity
                key={player.id}
                style={[
                  styles.playerItem,
                  selectedPlayers.includes(player.id) && styles.playerItemSelected,
                ]}
                onPress={() => togglePlayer(player.id)}
              >
                <View style={styles.playerInfo}>
                  <View style={[styles.playerAvatar, { backgroundColor: player.role === 'admin' ? '#8b5cf6' : '#3b82f6' }]}>
                    <Ionicons name="person" size={20} color="#fff" />
                  </View>
                  <View style={styles.playerDetails}>
                    <Text style={styles.playerName}>{player.name}</Text>
                    <Text style={styles.playerBalance}>Balance: ₹{player.balance.toFixed(2)}</Text>
                  </View>
                </View>
                <View style={[
                  styles.checkbox,
                  selectedPlayers.includes(player.id) && styles.checkboxSelected,
                ]}>
                  {selectedPlayers.includes(player.id) && (
                    <Ionicons name="checkmark" size={20} color="#fff" />
                  )}
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>

        {/* Submit Button */}
        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={submitting}
          >
            {submitting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons name="checkmark-circle" size={24} color="#fff" />
                <Text style={styles.submitButtonText}>Create Session</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
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
  submitButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    marginLeft: 8,
  },
});