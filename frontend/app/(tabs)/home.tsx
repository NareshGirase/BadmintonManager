import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, ActivityIndicator, Alert } from 'react-native';
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

interface Notification {
  id: string;
  message: string;
  type: string;
  read: boolean;
}

export default function HomeScreen() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [players, setPlayers] = useState<Player[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      router.replace('/');
      return;
    }
    fetchData();
  }, [user]);

  const fetchData = async () => {
    try {
      const [playersRes, notificationsRes] = await Promise.all([
        fetch(`${BACKEND_URL}/api/players`),
        fetch(`${BACKEND_URL}/api/notifications/user/${user?.id}`),
      ]);

      const playersData = await playersRes.json();
      const notificationsData = await notificationsRes.json();

      // Exclude admin from the players list (admin doesn't play)
      setPlayers(playersData.filter((p: Player) => p.role !== 'admin'));
      setNotifications(notificationsData.filter((n: Notification) => !n.read));
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  }, []);

  const getBalanceColor = (balance: number) => {
    if (balance < 100) return '#ef4444';
    if (balance < 300) return '#f59e0b';
    return '#10b981';
  };

  const getBalanceIcon = (balance: number) => {
    if (balance < 100) return 'alert-circle';
    if (balance < 300) return 'warning';
    return 'checkmark-circle';
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
      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#10b981" />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Welcome back,</Text>
            <Text style={styles.userName}>{user?.name}</Text>
          </View>
          <Ionicons name="tennisball" size={40} color="#10b981" />
        </View>

        {/* Balance Card - players see own; admin sees total team balance */}
        {user?.role !== 'admin' ? (
          <View style={styles.balanceCard}>
            <View style={styles.balanceHeader}>
              <Text style={styles.balanceLabel}>Your Balance</Text>
              <Ionicons 
                name={getBalanceIcon(user?.balance || 0) as any} 
                size={24} 
                color={getBalanceColor(user?.balance || 0)} 
              />
            </View>
            <Text style={[styles.balanceAmount, { color: getBalanceColor(user?.balance || 0) }]}>
              ₹{user?.balance.toFixed(2)}
            </Text>
            {user && user.balance < 300 && (
              <View style={styles.warningBanner}>
                <Ionicons name="warning" size={16} color="#f59e0b" />
                <Text style={styles.warningText}>Low balance - ask admin to add funds</Text>
              </View>
            )}
          </View>
        ) : (
          <View style={styles.balanceCard}>
            <View style={styles.balanceHeader}>
              <Text style={styles.balanceLabel}>Total Team Balance</Text>
              <Ionicons name="wallet" size={24} color="#10b981" />
            </View>
            <Text style={[styles.balanceAmount, { color: '#10b981' }]}>
              ₹{players.reduce((sum, p) => sum + p.balance, 0).toFixed(2)}
            </Text>
            <Text style={styles.balanceSubtext}>
              Across {players.length} {players.length === 1 ? 'player' : 'players'}
            </Text>
          </View>
        )}

        {/* Notifications */}
        {notifications.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Notifications</Text>
            {notifications.slice(0, 3).map((notification) => (
              <View key={notification.id} style={styles.notificationCard}>
                <Ionicons name="notifications" size={20} color="#f59e0b" />
                <Text style={styles.notificationText}>{notification.message}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Admin Quick Actions */}
        {user?.role === 'admin' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Quick Actions</Text>
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={() => router.push('/mark-attendance' as any)}
            >
              <View style={styles.actionIcon}>
                <Ionicons name="add-circle" size={24} color="#10b981" />
              </View>
              <View style={styles.actionContent}>
                <Text style={styles.actionTitle}>Mark Attendance</Text>
                <Text style={styles.actionSubtitle}>Record today's session</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#6b7280" />
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.actionButton}
              onPress={() => router.push('/add-player' as any)}
            >
              <View style={styles.actionIcon}>
                <Ionicons name="person-add" size={24} color="#3b82f6" />
              </View>
              <View style={styles.actionContent}>
                <Text style={styles.actionTitle}>Add Player</Text>
                <Text style={styles.actionSubtitle}>Register new member</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#6b7280" />
            </TouchableOpacity>
          </View>
        )}

        {/* Team Balance Overview - Admin only */}
        {user?.role === 'admin' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Team Balance Overview</Text>
            {players.map((player) => (
              <View key={player.id} style={styles.playerCard}>
                <View style={styles.playerInfo}>
                  <View style={[styles.playerAvatar, { backgroundColor: player.role === 'admin' ? '#8b5cf6' : '#3b82f6' }]}>
                    <Ionicons name="person" size={20} color="#fff" />
                  </View>
                  <View style={styles.playerDetails}>
                    <Text style={styles.playerName}>
                      {player.name}
                      {player.role === 'admin' && <Text style={styles.adminBadge}> • Admin</Text>}
                    </Text>
                  </View>
                </View>
                <Text style={[styles.playerBalance, { color: getBalanceColor(player.balance) }]}>
                  ₹{player.balance.toFixed(2)}
                </Text>
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
  scrollView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 24,
  },
  greeting: {
    fontSize: 16,
    color: '#9ca3af',
  },
  userName: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 4,
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
  balanceAmount: {
    fontSize: 42,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  balanceSubtext: {
    fontSize: 14,
    color: '#9ca3af',
    marginTop: 4,
  },
  warningBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#78350f',
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  warningText: {
    color: '#fbbf24',
    marginLeft: 8,
    fontSize: 14,
  },
  section: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 16,
  },
  notificationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e293b',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#334155',
  },
  notificationText: {
    flex: 1,
    marginLeft: 12,
    color: '#e5e7eb',
    fontSize: 14,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e293b',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  actionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#0f172a',
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionContent: {
    flex: 1,
    marginLeft: 16,
  },
  actionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  actionSubtitle: {
    fontSize: 14,
    color: '#9ca3af',
    marginTop: 2,
  },
  playerCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#1e293b',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#334155',
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
    flex: 1,
  },
  playerName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  adminBadge: {
    color: '#8b5cf6',
    fontSize: 14,
  },
  playerBalance: {
    fontSize: 18,
    fontWeight: 'bold',
  },
});