import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Platform } from 'react-native';
import { useAuth } from '@/src/contexts/AuthContext';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import DateTimePicker from '@react-native-community/datetimepicker';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

interface UserSummary {
  user_name: string;
  total_deposits: number;
  total_deductions: number;
  net: number;
}

export default function MonthlyReportScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const [summary, setSummary] = useState<UserSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);

  const month = `${selectedDate.getFullYear()}-${String(
    selectedDate.getMonth() + 1
  ).padStart(2, '0')}`;

  useEffect(() => {
    if (!user) {
      router.replace('/');
      return;
    }
    fetchSummary();
  }, [user, month]);

  const fetchSummary = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${BACKEND_URL}/api/transactions/monthly-summary?month=${month}`);
      const data = await response.json();
      // Exclude admin from breakdown (not a player)
      const nonAdminData = data.filter((s: UserSummary) => s.user_name !== 'Admin');
      // Non-admins only see their own summary
      if (user?.role === 'admin') {
        setSummary(nonAdminData);
      } else {
        setSummary(nonAdminData.filter((s: UserSummary) => s.user_name === user?.name));
      }
    } catch (error) {
      console.error('Error fetching summary:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatMonth = (monthString: string) => {
    const date = new Date(monthString + '-01');
    return date.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
  };

  const totalDeposits = summary.reduce((sum, s) => sum + s.total_deposits, 0);
  const totalDeductions = summary.reduce((sum, s) => sum + s.total_deductions, 0);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Monthly Report</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Month Selector */}
      <View style={styles.monthSelector}>
        <Text style={styles.monthLabel}>
          Select Month:
        </Text>

        {Platform.OS === 'web' ? (
          <View style={styles.datePickerButton}>
            <Ionicons
              name="calendar"
              size={20}
              color="#10b981"
            />

            <input
              type="month"
              value={month}
              onChange={(e) => {
                const [year, monthValue] = e.target.value
                  .split('-')
                  .map(Number);

                setSelectedDate(
                  new Date(year, monthValue - 1, 1)
                );
              }}
              style={{
                flex: 1,
                height: 46,
                marginLeft: 12,
                backgroundColor: 'transparent',
                border: 'none',
                outline: 'none',
                color: '#ffffff',
                fontSize: 16,
                fontFamily: 'inherit',
                colorScheme: 'dark',
              }}
            />
          </View>
        ) : (
          <>
            <TouchableOpacity
              style={styles.datePickerButton}
              onPress={() => setShowDatePicker(true)}
              activeOpacity={0.7}
            >
              <Ionicons
                name="calendar"
                size={20}
                color="#10b981"
              />

              <Text style={styles.datePickerText}>
                {selectedDate.toLocaleDateString('en-IN', {
                  month: 'long',
                  year: 'numeric',
                })}
              </Text>

              <Ionicons
                name="chevron-down"
                size={20}
                color="#9ca3af"
              />
            </TouchableOpacity>

            {showDatePicker && (
              <DateTimePicker
                value={selectedDate}
                mode="date"
                display={
                  Platform.OS === 'ios'
                    ? 'spinner'
                    : 'default'
                }
                onChange={(event, date) => {
                  setShowDatePicker(false);

                  if (date) {
                    setSelectedDate(date);
                  }
                }}
              />
            )}
          </>
        )}
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#10b981" />
        </View>
      ) : (
        <ScrollView style={styles.scrollView}>
          {/* Overall Summary */}
          <View style={styles.overallCard}>
            <Text style={styles.cardTitle}>{formatMonth(month)}</Text>
            <View style={styles.summaryRow}>
              <View style={styles.summaryItem}>
                <Ionicons name="arrow-down" size={24} color="#10b981" />
                <Text style={styles.summaryLabel}>Total Deposits</Text>
                <Text style={[styles.summaryValue, { color: '#10b981' }]}>
                  ₹{totalDeposits.toFixed(2)}
                </Text>
              </View>
              <View style={styles.summaryDivider} />
              <View style={styles.summaryItem}>
                <Ionicons name="arrow-up" size={24} color="#ef4444" />
                <Text style={styles.summaryLabel}>Total Spent</Text>
                <Text style={[styles.summaryValue, { color: '#ef4444' }]}>
                  ₹{totalDeductions.toFixed(2)}
                </Text>
              </View>
            </View>
          </View>

          {/* Individual Summaries */}
          {summary.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="document-text-outline" size={64} color="#6b7280" />
              <Text style={styles.emptyText}>No data for this month</Text>
              <Text style={styles.emptySubtext}>Try selecting a different month</Text>
            </View>
          ) : (
            <View style={styles.usersList}>
              <Text style={styles.sectionTitle}>{user?.role === 'admin' ? 'Player Breakdown' : 'My Summary'}</Text>
              {summary.map((userSum, index) => (
                <View key={index} style={styles.userCard}>
                  <View style={styles.userHeader}>
                    <View style={styles.userAvatar}>
                      <Ionicons name="person" size={20} color="#fff" />
                    </View>
                    <Text style={styles.userName}>{userSum.user_name}</Text>
                  </View>
                  <View style={styles.userDetails}>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Deposits:</Text>
                      <Text style={[styles.detailValue, { color: '#10b981' }]}>
                        +₹{userSum.total_deposits.toFixed(2)}
                      </Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Deductions:</Text>
                      <Text style={[styles.detailValue, { color: '#ef4444' }]}>
                        -₹{userSum.total_deductions.toFixed(2)}
                      </Text>
                    </View>
                    <View style={[styles.detailRow, styles.netRow]}>
                      <Text style={styles.netLabel}>Net:</Text>
                      <Text style={[
                        styles.netValue,
                        { color: userSum.net >= 0 ? '#10b981' : '#ef4444' }
                      ]}>
                        {userSum.net >= 0 ? '+' : ''}₹{userSum.net.toFixed(2)}
                      </Text>
                    </View>
                  </View>
                </View>
              ))}
            </View>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
  monthSelector: {
    padding: 16,
  },
  monthLabel: {
    fontSize: 14,
    color: '#9ca3af',
    marginBottom: 8,
  },
  datePickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e293b',
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 48,
    borderWidth: 1,
    borderColor: '#334155',
  },

  datePickerText: {
    flex: 1,
    color: '#fff',
    fontSize: 16,
    fontWeight: '400',
    marginLeft: 12,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
  },
  overallCard: {
    backgroundColor: '#1e293b',
    margin: 16,
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#334155',
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 20,
    textAlign: 'center',
  },
  summaryRow: {
    flexDirection: 'row',
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
  },
  summaryDivider: {
    width: 1,
    backgroundColor: '#334155',
    marginHorizontal: 16,
  },
  summaryLabel: {
    fontSize: 12,
    color: '#9ca3af',
    marginTop: 8,
    marginBottom: 4,
  },
  summaryValue: {
    fontSize: 20,
    fontWeight: 'bold',
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
  usersList: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 16,
  },
  userCard: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  userHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  userAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#3b82f6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginLeft: 12,
  },
  userDetails: {
    backgroundColor: '#0f172a',
    borderRadius: 8,
    padding: 12,
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
  },
  netRow: {
    marginTop: 4,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#334155',
    marginBottom: 0,
  },
  netLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  netValue: {
    fontSize: 16,
    fontWeight: 'bold',
  },
});