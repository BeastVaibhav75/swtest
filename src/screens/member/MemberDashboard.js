import { useFocusEffect } from '@react-navigation/native';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useAuth } from '../../context/AuthContext';
import { useUpdateCheck } from '../../hooks/useUpdateCheck';
import { fundAPI, installmentsAPI } from '../../services/api';

// Mock data for testing
const mockMemberData = {
  name: 'John Doe',
  memberId: 'M001',
  activeLoan: {
    amount: 5000,
    interest: 50,
    remainingAmount: 4500,
    nextPayment: '2024-04-01',
  },
  lastInstallment: {
    date: '2024-03-01',
    amount: 1000,
  },
  availableFund: 35000,
  nextDue: '2024-04-01',
};

export default function MemberDashboard({ navigation }) {
  const { user, logout } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [interestEarned, setInterestEarned] = useState(0);
  const [shareValue, setShareValue] = useState(0);
  const [investmentBalance, setInvestmentBalance] = useState(0);
  const [error, setError] = useState(null);
  const [totalExpenses, setTotalExpenses] = useState(0);
  const [recentInstallments, setRecentInstallments] = useState([]);
  const { updating } = useUpdateCheck();

  const fetchDashboardData = async () => {
    try {
      if (!user?._id) {
        console.log('No user ID available');
        return;
      }

      console.log('Fetching dashboard data for user:', user._id);
      
      // Fetch all data in parallel
      const [interestRes, shareValueRes, investmentRes, installmentsRes] = await Promise.all([
        fundAPI.getInterest(user._id),
        fundAPI.getShareValue(),
        fundAPI.getInvestment(user._id),
        installmentsAPI.getMyInstallments()
      ]);

      setInterestEarned(user.interestEarned || 0);
      setShareValue(shareValueRes.data?.shareValue || 0);
      setInvestmentBalance(investmentRes.data?.investmentBalance || 0);
      setTotalExpenses(shareValueRes.data?.expensesPerMember || 0);
      setRecentInstallments(installmentsRes.data?.slice(0, 3) || []);

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      if (error.response?.status === 401) {
        Alert.alert(
          'Session Expired',
          'Please log in again to continue.',
          [
            {
              text: 'OK',
              onPress: () => {
                logout();
                navigation.reset({
                  index: 0,
                  routes: [{ name: 'Login' }],
                });
              },
            },
          ]
        );
      } else {
        Alert.alert('Error', 'Failed to load dashboard data. Please try again.');
      }
      setInterestEarned(0);
      setShareValue(0);
      setInvestmentBalance(0);
      setTotalExpenses(0);
      setRecentInstallments([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (user?._id) {
      fetchDashboardData();
    } else {
      console.log('No user ID available');
      setLoading(false);
    }
  }, [user]);

  useFocusEffect(
    React.useCallback(() => {
      if (user?._id) {
        fetchDashboardData();
      }
    }, [user?._id])
  );

  const onRefresh = React.useCallback(() => {
    if (!user?._id) {
      console.log('Cannot refresh: No user ID available');
      setRefreshing(false);
      return;
    }
    setRefreshing(true);
    fetchDashboardData();
  }, [user]);

  if (loading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading dashboard data...</Text>
      </View>
    );
  }

  if (!user?._id) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Please login to view your dashboard</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {updating && (
        <View style={styles.updateOverlay}>
          <ActivityIndicator size="large" color="#FFFFFF" />
          <Text style={styles.updateText}>Updating...</Text>
        </View>
      )}
      <ScrollView 
        style={styles.container}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#007AFF']}
          />
        }
      >
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Member Dashboard</Text>
          <Text style={styles.headerSubtitle}>Welcome, {user?.name || 'Member'}</Text>
        </View>

        {/* Balance Breakdown Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Balance Breakdown</Text>
          <View style={styles.breakdownContainer}>
            <View style={styles.breakdownRow}>
              <Text style={styles.breakdownLabel}>Your Investment</Text>
              <Text style={styles.breakdownValue}>₹{investmentBalance.toFixed(2)}</Text>
            </View>
            <View style={styles.breakdownRow}>
              <Text style={styles.breakdownLabel}>Interest Earned</Text>
              <Text style={[styles.breakdownValue, styles.positiveValue]}>+ ₹{interestEarned.toFixed(2)}</Text>
            </View>
            <View style={styles.breakdownRow}>
              <Text style={styles.breakdownLabel}>Expenses (Shared)</Text>
              <Text style={[styles.breakdownValue, styles.negativeValue]}>- ₹{Math.abs(totalExpenses).toFixed(2)}</Text>
            </View>
            <View style={[styles.breakdownRow, styles.totalRow]}>
              <Text style={styles.totalLabel}>Your Share Value</Text>
              <Text style={[styles.breakdownValue, styles.totalValue]}>₹{shareValue.toFixed(2)}</Text>
            </View>
          </View>
        </View>

        {/* Recent Installments Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent Installments</Text>
            <TouchableOpacity 
              style={styles.viewAllButton}
              onPress={() => navigation.navigate('PaymentHistory')}
            >
              <Text style={styles.viewAllText}>View All</Text>
              <Icon name="chevron-right" size={20} color="#007AFF" />
            </TouchableOpacity>
          </View>
          {recentInstallments.length === 0 ? (
            <Text style={styles.noData}>No recent installments</Text>
          ) : (
            recentInstallments.map((installment, index) => (
              <View key={index} style={styles.installmentItem}>
                <View>
                  <Text style={styles.installmentDate}>
                    {new Date(installment.date).toLocaleDateString()}
                  </Text>
                  <Text style={styles.installmentType}>Installment</Text>
                </View>
                <Text style={styles.installmentAmount}>₹{installment.amount}</Text>
              </View>
            ))
          )}
        </View>

        {/* Quick Actions */}
        {/*
        <View style={styles.actionButtonsRow}>
          <TouchableOpacity 
            style={[styles.actionButton, { marginRight: 8 }]} 
            onPress={() => navigation.navigate('Earnings')}
          >
            <Text style={styles.actionButtonText}>View Earnings</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.actionButton} 
            onPress={() => navigation.navigate('Loans')}
          >
            <Text style={styles.actionButtonText}>View Loans</Text>
          </TouchableOpacity>
        </View>
        */}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    color: '#666',
  },
  header: {
    backgroundColor: '#007AFF',
    padding: 20,
    paddingTop: 40,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    marginBottom: 10,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 5,
  },
  headerSubtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  section: {
    backgroundColor: 'white',
    margin: 10,
    padding: 15,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  breakdownContainer: {
    backgroundColor: '#f8f8f8',
    padding: 15,
    borderRadius: 8,
    marginTop: 10,
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  breakdownLabel: {
    fontSize: 14,
    color: '#666',
  },
  breakdownValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
  positiveValue: {
    color: '#34C759',
  },
  negativeValue: {
    color: '#FF3B30',
  },
  totalRow: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#ddd',
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  totalValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  actionButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 10,
    marginBottom: 20,
  },
  actionButton: {
    flex: 1,
    backgroundColor: '#007AFF',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
  },
  actionButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '500',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  viewAllText: {
    color: '#007AFF',
    fontSize: 14,
    fontWeight: '500',
    marginRight: 4,
  },
  installmentItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  installmentDate: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  installmentType: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  installmentAmount: {
    fontSize: 16,
    fontWeight: '500',
    color: '#007AFF',
  },
  noData: {
    textAlign: 'center',
    color: '#666',
    fontStyle: 'italic',
    padding: 20,
  },
  updateOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  updateText: {
    color: '#FFFFFF',
    marginTop: 10,
    fontSize: 16,
  },
}); 