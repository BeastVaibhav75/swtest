import { useFocusEffect } from '@react-navigation/native';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    Modal,
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
import { fundAPI, installmentsAPI, loansAPI } from '../../services/api';

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
  const { user, logout, accounts, loginByPhone, phone, tempPassword } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [interestEarned, setInterestEarned] = useState(0);
  const [shareValue, setShareValue] = useState(0);
  const [investmentBalance, setInvestmentBalance] = useState(0);
  const [error, setError] = useState(null);
  const [totalExpenses, setTotalExpenses] = useState(0);
  const [recentInstallments, setRecentInstallments] = useState([]);
  const [loans, setLoans] = useState(0);
  const [totalFund, setTotalFund] = useState(0);
  const [monthlyInterestEarned, setMonthlyInterestEarned] = useState(0);
  const [showAccountModal, setShowAccountModal] = useState(false);
  const { updating } = useUpdateCheck();

  const fetchDashboardData = async () => {
    try {
      if (!user?.id) {
        console.log('No user ID available');
        return;
      }

      console.log('Fetching dashboard data for user:', user.id);
      
      // Fetch all data in parallel
      const [interestRes, shareValueRes, investmentRes, installmentsRes, loansRes, totalFundRes] = await Promise.all([
        fundAPI.getInterest(user.id),
        fundAPI.getShareValue(),
        fundAPI.getInvestment(user.id),
        installmentsAPI.getMyInstallments(),
        loansAPI.getTotalOutstanding(),
        fundAPI.getTotalFund()
      ]);

      setInterestEarned(user.interestEarned || 0);
      setShareValue((investmentRes.data?.investmentBalance || 0) + (user.interestEarned || 0) - (shareValueRes.data?.expensesPerMember || 0));
      setInvestmentBalance(investmentRes.data?.investmentBalance || 0);
      setTotalExpenses(shareValueRes.data?.expensesPerMember || 0);
      setRecentInstallments(installmentsRes.data?.slice(0, 3) || []);
      setLoans(loansRes.data?.totalOutstanding || 0);
      setTotalFund(totalFundRes.data?.totalFund || 0);

      // Calculate monthly interest earned for the member
      const now = new Date();
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
      const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
      
      const monthlyDistributions = (interestRes.data.distributions || []).filter(dist => {
        const distDate = new Date(dist.date);
        return distDate >= firstDay && distDate <= lastDay;
      });

      const calculatedMonthlyInterest = monthlyDistributions.reduce((sum, dist) => {
        if (dist.type === 'interest' || dist.type === 'deduction') {
          return sum + (dist.perMemberAmount || 0);
        }
        return sum;
      }, 0);

      setMonthlyInterestEarned(calculatedMonthlyInterest);

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
      setLoans(0);
      setTotalFund(0);
      setMonthlyInterestEarned(0);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (user?.id) {
      fetchDashboardData();
    } else {
      console.log('No user ID available');
      setLoading(false);
    }
  }, [user]);

  useFocusEffect(
    React.useCallback(() => {
      if (user?.id) {
        fetchDashboardData();
      }
    }, [user?.id])
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

  const handleAccountSwitch = async (selectedAccount) => {
    setShowAccountModal(false);
    setLoading(true);
    try {
      if (!phone) {
        Alert.alert('Error', 'Unable to switch accounts - please log in again');
        return;
      }
      
      console.log('Switching to account:', selectedAccount.memberId);
      console.log('Using phone:', phone);
      
      // Switch accounts without password (backend handles this securely)
      await loginByPhone(phone, '', selectedAccount.memberId);
      // Refresh dashboard data
      fetchDashboardData();
    } catch (error) {
      console.error('Account switch error:', error.response?.data || error.message);
      Alert.alert('Error', `Unable to switch to ${selectedAccount.name}: ${error.response?.data?.message || 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  if (loading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading dashboard data...</Text>
      </View>
    );
  }

  if (!user?.id) {
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
          <TouchableOpacity 
            onPress={() => {
              if (accounts && accounts.length > 1) {
                setShowAccountModal(true);
              }
            }}
            disabled={!accounts || accounts.length <= 1}
          >
            <Text style={[styles.headerSubtitle, accounts && accounts.length > 1 && styles.clickableText]}>
              Welcome, {user?.name || 'Member'}
              {accounts && accounts.length > 1 && ' (Tap to switch)'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Cash in Hand Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Cash in Hand</Text>
          <View style={styles.cashInHandValueContainer}>
            <Text style={styles.cashInHandValue}>₹{(totalFund - loans).toFixed(2)}</Text>
          </View>

          <View style={styles.breakdownContainer}>
            <View style={styles.breakdownRow}>
              <Text style={styles.breakdownLabel}>Total Fund</Text>
              <Text style={styles.breakdownValue}>₹{totalFund.toFixed(2)}</Text>
            </View>
            <View style={styles.breakdownRow}>
              <Text style={styles.breakdownLabel}>Total Loans</Text>
              <Text style={[styles.breakdownValue, styles.negativeValue]}>- ₹{loans.toFixed(2)}</Text>
            </View>
          </View>
        </View>

        {/* Balance Breakdown Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Your Share Value</Text>
          <View style={styles.cashInHandValueContainer}>
            <Text style={styles.cashInHandValue}>₹{shareValue.toFixed(2)}</Text>
          </View>
          <View style={styles.breakdownContainer}>
            <View style={styles.breakdownRow}>
              <Text style={styles.breakdownLabel}>Your Investment</Text>
              <Text style={styles.breakdownValue}>₹{investmentBalance.toFixed(2)}</Text>
            </View>
            <View style={styles.breakdownRow}>
              <Text style={styles.breakdownLabel}>Interest Earned</Text>
              <Text style={[styles.breakdownValue, styles.positiveValue]}>+ ₹{interestEarned.toFixed(2)}</Text>
            </View>
          </View>
        </View>

        {/* Profit Section */}
        <TouchableOpacity 
          style={styles.section}
          onPress={() => navigation.navigate('MemberTabs', { screen: 'Earnings' })}
        >
          <Text style={styles.sectionTitle}>Profit (This Month)</Text>
          <View style={styles.cashInHandValueContainer}>
            <Text style={[styles.cashInHandValue, styles.positiveValue]}>+ ₹{monthlyInterestEarned.toFixed(2)}</Text>
          </View>
        </TouchableOpacity>

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
      
      {/* Account Switcher Modal */}
      <Modal
        visible={showAccountModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowAccountModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Switch Account</Text>
            <FlatList
              data={accounts}
              keyExtractor={item => item.memberId}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.accountItem,
                    item.memberId === user.memberId && styles.selectedAccountItem
                  ]}
                  onPress={() => handleAccountSwitch(item)}
                >
                  <Text style={styles.accountName}>{item.name} ({item.memberId})</Text>
                  {item.memberId === user.memberId && (
                    <Text style={styles.currentAccountText}>Current</Text>
                  )}
                </TouchableOpacity>
              )}
            />
            <TouchableOpacity 
              onPress={() => setShowAccountModal(false)} 
              style={styles.cancelButton}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
    fontSize: 16,
    color: '#555',
  },
  header: {
    padding: 20,
    backgroundColor: '#007AFF',
    borderBottomLeftRadius: 15,
    borderBottomRightRadius: 15,
    alignItems: 'center',
    marginBottom: 15,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#fff',
    marginTop: 5,
  },
  section: {
    backgroundColor: '#fff',
    borderRadius: 10,
    marginHorizontal: 15,
    marginBottom: 15,
    padding: 15,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.41,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  breakdownContainer: {
    marginTop: 5,
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  breakdownLabel: {
    fontSize: 16,
    color: '#555',
  },
  breakdownValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  positiveValue: {
    color: '#28a745',
  },
  negativeValue: {
    color: '#dc3545',
  },
  totalRow: {
    borderTopWidth: 2,
    borderTopColor: '#007AFF',
    paddingTop: 10,
    marginTop: 10,
  },
  totalLabel: {
    fontSize: 17,
    fontWeight: 'bold',
    color: '#333',
  },
  totalValue: {
    fontSize: 17,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  noData: {
    fontStyle: 'italic',
    color: '#888',
    textAlign: 'center',
    paddingVertical: 10,
  },
  installmentItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  installmentDate: {
    fontSize: 15,
    fontWeight: '500',
    color: '#333',
  },
  installmentType: {
    fontSize: 13,
    color: '#888',
  },
  installmentAmount: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 5,
    backgroundColor: '#e6f2ff',
  },
  viewAllText: {
    color: '#007AFF',
    marginRight: 5,
    fontWeight: '600',
  },
  updateOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center'
  },
  updateText: {
    color: '#FFFFFF',
    marginTop: 10,
    fontSize: 16,
  },
  cashInHandValueContainer: {
    alignItems: 'center',
    marginVertical: 20,
  },
  cashInHandValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  clickableText: {
    textDecorationLine: 'underline',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 20,
    width: '80%',
    maxHeight: '70%',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    textAlign: 'center',
  },
  accountItem: {
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  selectedAccountItem: {
    backgroundColor: '#f0f8ff',
  },
  accountName: {
    fontSize: 16,
    flex: 1,
  },
  currentAccountText: {
    fontSize: 12,
    color: '#007AFF',
    fontWeight: 'bold',
  },
  cancelButton: {
    marginTop: 15,
    padding: 10,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#dc3545',
    fontSize: 16,
  },
}); 