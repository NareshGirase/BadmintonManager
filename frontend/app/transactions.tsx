import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, ActivityIndicator } from 'react-native';
import { useAuth } from '@/src/contexts/AuthContext';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { storage } from '@/src/utils/storage';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

interface Transaction {
  id: string;
  user_id?: string;
  user_name?: string;
  amount: number;
  type: 'deposit' | 'deduction';
  description: string;
  date: string;
}

export default function TransactionsScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      router.replace('/');
      return;
    }
    fetchTransactions();
  }, [user]);

  const fetchTransactions = async () => {
  try {
    console.log("CURRENT USER:", user);
    let url = '';

    if (user?.role === 'admin') {
      url = `${BACKEND_URL}/api/transactions`;
    } else {
      url = `${BACKEND_URL}/api/transactions/my`;
    }

    console.log("Fetching:", url);

    const token = await storage.secureGet('token', null);

if (!token || typeof token !== 'string') {
  console.error('TRANSACTIONS: JWT token is missing');
  return;
}

console.log('TOKEN RECEIVED: yes');
//console.log('TOKEN LENGTH:', token.length);

const response = await fetch(url, {
  method: 'GET',
  headers: {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  },
});
    const data = await response.json();

    console.log("Transactions:", data);

    setTransactions(data);
  } catch (error) {
    console.error('Error fetching transactions:', error);
  } finally {
    setLoading(false);
  }
};

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchTransactions();
    setRefreshing(false);
  }, []);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', { 
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
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
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Transaction History</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#10b981" />
        }
      >
        {transactions.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="receipt-outline" size={64} color="#6b7280" />
            <Text style={styles.emptyText}>No transactions yet</Text>
            <Text style={styles.emptySubtext}>Your transactions will appear here</Text>
          </View>
        ) : (
          <View style={styles.transactionsList}>
            {transactions.map((transaction) => (
              <View key={transaction.id} style={styles.transactionCard}>
                <View style={styles.transactionIcon}>
                  <Ionicons 
                    name={transaction.type === 'deposit' ? 'arrow-down' : 'arrow-up'} 
                    size={24} 
                    color={transaction.type === 'deposit' ? '#10b981' : '#ef4444'} 
                  />
                </View>
                <View style={styles.transactionDetails}>
                  {transaction.user_name && (
  <Text style={styles.playerName}>
    {transaction.user_name}
  </Text>
)}

<Text style={styles.transactionDescription}>
  {transaction.description.replace(/ for .*/, '')}
</Text>

<Text style={styles.transactionType}>
  {transaction.type === 'deposit' ? 'Deposit' : 'Deduction'}
</Text>
                  <Text style={styles.transactionDate}>{formatDate(transaction.date)}</Text>
                </View>
                <Text style={[
                  styles.transactionAmount,
                  { color: transaction.type === 'deposit' ? '#10b981' : '#ef4444' }
                ]}>
                  {transaction.type === 'deposit' ? '+' : '-'}₹{transaction.amount.toFixed(2)}
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

  transactionsList: {
    padding: 16,
  },

  transactionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },

  transactionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#0f172a',
    justifyContent: 'center',
    alignItems: 'center',
  },

  transactionDetails: {
    flex: 1,
    marginLeft: 16,
  },

  playerName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#60a5fa',
    marginBottom: 4,
  },

  transactionDescription: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 4,
  },

  transactionType: {
    fontSize: 12,
    color: '#9ca3af',
    marginTop: 4,
  },

  transactionDate: {
    fontSize: 12,
    color: '#9ca3af',
    marginTop: 4,
  },

  transactionAmount: {
    fontSize: 18,
    fontWeight: 'bold',
  },
});