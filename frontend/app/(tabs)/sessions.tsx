import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, ActivityIndicator, Alert, Platform } from 'react-native';
import { useAuth } from '@/src/contexts/AuthContext';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

interface Session {
  id: string;
  date: string;
  court_fee: number;
  players_present: string[];
  player_names: string[];
  amount_per_player: number;
  created_at: string;
}

export default function SessionsScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      router.replace('/');
      return;
    }
    fetchSessions();
  }, [user]);

  const fetchSessions = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/sessions`);
      const data = await response.json();
      setSessions(data);
    } catch (error) {
      console.error('Error fetching sessions:', error);
      Alert.alert('Error', 'Failed to load sessions');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchSessions();
    setRefreshing(false);
  }, []);

  const handleDeleteSession = async (sessionId: string) => {
    const confirmed = Platform.OS === 'web'
      ? window.confirm('Delete this session? Balances will be refunded to all present players.')
      : await new Promise<boolean>((resolve) => {
          Alert.alert(
            'Delete Session',
            'Are you sure you want to delete this session? Balances will be refunded.',
            [
              { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
              { text: 'Delete', style: 'destructive', onPress: () => resolve(true) },
            ]
          );
        });

    if (!confirmed) return;

    try {
      const response = await fetch(`${BACKEND_URL}/api/sessions/${sessionId}?admin_id=${user?.id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        if (Platform.OS === 'web') {
          window.alert('Session deleted successfully');
        } else {
          Alert.alert('Success', 'Session deleted successfully');
        }
        fetchSessions();
      } else {
        const err = Platform.OS === 'web' ? window.alert : (m: string) => Alert.alert('Error', m);
        err('Failed to delete session');
      }
    } catch (error) {
      const err = Platform.OS === 'web' ? window.alert : (m: string) => Alert.alert('Error', m);
      err('Failed to delete session');
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', { 
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
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
        <Text style={styles.headerTitle}>Sessions History</Text>
        {user?.role === 'admin' && (
          <TouchableOpacity 
            style={styles.addButton}
            onPress={() => router.push('/mark-attendance' as any)}
          >
            <Ionicons name="add" size={24} color="#fff" />
          </TouchableOpacity>
        )}
      </View>

      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#10b981" />
        }
      >
        {sessions.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="calendar-outline" size={64} color="#6b7280" />
            <Text style={styles.emptyText}>No sessions yet</Text>
            <Text style={styles.emptySubtext}>Sessions will appear here once added</Text>
          </View>
        ) : (
          <View style={styles.sessionsList}>
            {sessions.map((session) => (
              <View key={session.id} style={styles.sessionCard}>
                <View style={styles.sessionHeader}>
                  <View style={styles.dateContainer}>
                    <Ionicons name="calendar" size={20} color="#10b981" />
                    <Text style={styles.sessionDate}>{formatDate(session.date)}</Text>
                  </View>
                  {user?.role === 'admin' && (
                    <TouchableOpacity onPress={() => handleDeleteSession(session.id)}>
                      <Ionicons name="trash-outline" size={20} color="#ef4444" />
                    </TouchableOpacity>
                  )}
                </View>

                <View style={styles.sessionDetails}>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Court Fee:</Text>
                    <Text style={styles.detailValue}>₹{session.court_fee.toFixed(2)}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Per Player:</Text>
                    <Text style={styles.detailValue}>₹{session.amount_per_player.toFixed(2)}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Players:</Text>
                    <Text style={styles.detailValue}>{session.players_present.length}</Text>
                  </View>
                </View>

                <View style={styles.playersContainer}>
                  <Text style={styles.playersLabel}>Present:</Text>
                  <View style={styles.playerTags}>
                    {session.player_names.map((name, index) => (
                      <View key={index} style={styles.playerTag}>
                        <Text style={styles.playerTagText}>{name}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
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
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 64,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#9ca3af',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 8,
  },
  sessionsList: {
    padding: 16,
  },
  sessionCard: {
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#334155',
  },
  sessionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  dateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sessionDate: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    marginLeft: 8,
  },
  sessionDetails: {
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  detailLabel: {
    fontSize: 14,
    color: '#9ca3af',
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  playersContainer: {
    marginTop: 8,
  },
  playersLabel: {
    fontSize: 14,
    color: '#9ca3af',
    marginBottom: 8,
  },
  playerTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  playerTag: {
    backgroundColor: '#0f172a',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#334155',
  },
  playerTagText: {
    fontSize: 12,
    color: '#10b981',
    fontWeight: '500',
  },
});