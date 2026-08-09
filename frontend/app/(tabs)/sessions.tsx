import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, ActivityIndicator, Alert, Modal } from 'react-native';
import { useAuth } from '@/src/contexts/AuthContext';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
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
  const params = useLocalSearchParams<{ newSessionAmount?: string }>();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [successBanner, setSuccessBanner] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      router.replace('/');
      return;
    }
    fetchSessions();
  }, [user]);
  
  useFocusEffect(
  useCallback(() => {
    if (user) {
      fetchSessions();
    }
  }, [user])
);

  useEffect(() => {
    if (params.newSessionAmount) {
      setSuccessBanner(`Session created! ₹${params.newSessionAmount} deducted per player`);
      const t = setTimeout(() => setSuccessBanner(null), 4000);
      // Clear param
      router.setParams({ newSessionAmount: undefined });
      return () => clearTimeout(t);
    }
  }, [params.newSessionAmount]);

  const fetchSessions = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/sessions`);
      const data = await response.json();

  const sortedSessions = data.sort(
  (a: Session, b: Session) =>
    new Date(b.date).getTime() - new Date(a.date).getTime()
);

setSessions(sortedSessions);
    } catch (error) {
      console.error('Error fetching sessions:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchSessions();
    setRefreshing(false);
  }, []);

  const confirmDelete = async () => {
    if (!deleteTargetId) return;
    setDeleting(true);
    try {
      const response = await fetch(`${BACKEND_URL}/api/sessions/${deleteTargetId}?admin_id=${user?.id}`, {
        method: 'DELETE',
      });
      if (response.ok) {
        setDeleteTargetId(null);
        await fetchSessions();
      } else {
        Alert.alert('Error', 'Failed to delete session');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to delete session');
    } finally {
      setDeleting(false);
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
      {successBanner && (
        <View style={styles.successBanner}>
          <Ionicons name="checkmark-circle" size={20} color="#fff" />
          <Text style={styles.successBannerText}>{successBanner}</Text>
        </View>
      )}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Sessions History</Text>
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
    <Text style={styles.sessionDate}>
      {formatDate(session.date)}
    </Text>
  </View>

  {user?.role === 'admin' && (
  <View style={styles.adminActions}>
    <TouchableOpacity
      style={styles.editIconButton}
      activeOpacity={0.7}
      onPress={() =>
        router.push({
          pathname: '/edit-session',
          params: {
            sessionId: session.id,
          },
        } as any)
      }
    >
      <Ionicons
        name="create-outline"
        size={22}
        color="#10b981"
      />
    </TouchableOpacity>

    <TouchableOpacity
      testID={`delete-session-${session.id}`}
      style={styles.deleteIconButton}
      activeOpacity={0.7}
      onPress={() => setDeleteTargetId(session.id)}
    >
      <Ionicons
        name="trash-outline"
        size={22}
        color="#ef4444"
      />
    </TouchableOpacity>
  </View>
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

      {/* Delete Confirmation Modal */}
      <Modal
        visible={deleteTargetId !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setDeleteTargetId(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalIconContainer}>
              <Ionicons name="warning" size={40} color="#ef4444" />
            </View>
            <Text style={styles.modalTitle}>Delete Session?</Text>
            <Text style={styles.modalMessage}>
              This will refund the amount to all players who were present. This action cannot be undone.
            </Text>
            <View style={styles.modalButtons}>
              <TouchableOpacity
                testID="cancel-delete-session"
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setDeleteTargetId(null)}
                disabled={deleting}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                testID="confirm-delete-session"
                style={[styles.modalButton, styles.deleteConfirmButton]}
                onPress={confirmDelete}
                disabled={deleting}
              >
                {deleting ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.deleteConfirmButtonText}>Delete</Text>
                )}
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
  successBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#10b981',
    padding: 12,
    paddingHorizontal: 16,
  },
  successBannerText: {
    color: '#fff',
    marginLeft: 8,
    fontWeight: '600',
    flex: 1,
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
  deleteIconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#7f1d1d20',
    justifyContent: 'center',
    alignItems: 'center',
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
    backgroundColor: '#7f1d1d',
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
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
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
  deleteConfirmButton: {
    backgroundColor: '#ef4444',
  },
  deleteConfirmButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },

  editIconButton: {
  width: 40,
  height: 40,
  borderRadius: 20,
  backgroundColor: '#064e3b',
  justifyContent: 'center',
  alignItems: 'center',
  marginRight: 8,
},
  adminActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
});
