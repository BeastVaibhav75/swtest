import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { loansAPI } from '../../services/api';

export default function MemberLoans() {
  const [loading, setLoading] = useState(true);
  const [activeLoans, setActiveLoans] = useState([]);
  const [pastLoans, setPastLoans] = useState([]);
  const { user } = useAuth();
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchLoans();
  }, []);

  const fetchLoans = async () => {
    try {
      setLoading(true);
      const res = await loansAPI.getMyLoans();
      setActiveLoans(res.data.filter(loan => loan.status === 'active'));
      setPastLoans(res.data.filter(loan => loan.status === 'closed'));
    } catch (error) {
      console.error('Error fetching loans:', error);
      setActiveLoans([]);
      setPastLoans([]);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchLoans();
    setRefreshing(false);
  }, [fetchLoans]);

  const calculateInterest = (loan) => {
    // Calculate 1% interest on the outstanding amount
    return loan.outstanding * 0.01;
  };

  const calculateTotalInterestPaid = (loan) => {
    // Calculate total interest paid from all repayments
    return loan.repayments.reduce((total, repayment) => {
      const interestAmount = repayment.amount * 0.01; // 1% of repayment amount
      return total + interestAmount;
    }, 0);
  };

  const calculateNextPayment = (loan) => {
    const lastPayment = loan.repayments[loan.repayments.length - 1];
    const lastPaymentDate = lastPayment ? new Date(lastPayment.date) : new Date(loan.date);
    const nextPaymentDate = new Date(lastPaymentDate);
    nextPaymentDate.setMonth(nextPaymentDate.getMonth() + 1);
    return nextPaymentDate;
  };

  const renderLoanCard = (loan) => (
    <View key={loan._id} style={styles.section}>
      <View style={styles.loanHeader}>
        <Text style={styles.loanAmount}>₹{loan.amount}</Text>
        <Text style={styles.loanDate}>
          Taken on {new Date(loan.date).toLocaleDateString()}
        </Text>
      </View>

      <View style={styles.loanDetails}>
        <View style={styles.detailRow}>
          <Text style={styles.label}>Outstanding Amount</Text>
          <Text style={styles.value}>₹{loan.outstanding}</Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.label}>Total Interest Paid</Text>
          <Text style={styles.value}>₹{calculateTotalInterestPaid(loan).toFixed(2)}</Text>
        </View>
        {loan.status === 'active' && (
          <>
            <View style={styles.detailRow}>
              <Text style={styles.label}>Monthly Interest</Text>
              <Text style={styles.value}>₹{calculateInterest(loan)}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.label}>Next Payment Due</Text>
              <Text style={styles.value}>
                {calculateNextPayment(loan).toLocaleDateString()}
              </Text>
            </View>
          </>
        )}
      </View>

      {/* Repayment History */}
      <View style={styles.repaymentHistory}>
        <Text style={styles.historyTitle}>Recent Payments</Text>
        {loan.repayments.length === 0 ? (
          <Text style={styles.noPayments}>No payments made yet</Text>
        ) : (
          loan.repayments.slice(-3).map((repayment, index) => {
            const interestAmount = repayment.amount * 0.01; // 1% of repayment amount
            const totalAmount = repayment.amount + interestAmount;
            return (
              <View key={index} style={styles.repaymentItem}>
                <View>
                  <Text style={styles.repaymentDate}>
                    {new Date(repayment.date).toLocaleDateString()}
                  </Text>
                  <Text style={styles.repaymentBreakdown}>
                    Principal: ₹{repayment.amount} | Interest: ₹{interestAmount.toFixed(2)}
                  </Text>
                </View>
                <Text style={styles.repaymentAmount}>Total: ₹{totalAmount.toFixed(2)}</Text>
              </View>
            );
          })
        )}
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
        />
      }
    >
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Your Loans</Text>
      </View>

      {/* Active Loans Section */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Active Loans</Text>
      </View>
      {activeLoans.length === 0 ? (
        <View style={styles.section}>
          <Text style={styles.noData}>No active loans</Text>
        </View>
      ) : (
        activeLoans.map(renderLoanCard)
      )}

      {/* Past Loans Section */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Past Loans</Text>
      </View>
      {pastLoans.length === 0 ? (
        <View style={styles.section}>
          <Text style={styles.noData}>No past loans</Text>
        </View>
      ) : (
        pastLoans.map(renderLoanCard)
      )}
    </ScrollView>
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
  header: {
    padding: 20,
    backgroundColor: '#007AFF',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
  },
  sectionHeader: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
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
  loanHeader: {
    marginBottom: 15,
  },
  loanAmount: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
  },
  loanDate: {
    fontSize: 14,
    color: '#666',
    marginTop: 5,
  },
  loanDetails: {
    backgroundColor: '#f8f8f8',
    padding: 15,
    borderRadius: 8,
    marginBottom: 15,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  label: {
    fontSize: 16,
    color: '#666',
  },
  value: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  repaymentHistory: {
    borderTopWidth: 1,
    borderTopColor: '#eee',
    paddingTop: 15,
  },
  historyTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  repaymentItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: 8,
  },
  repaymentDate: {
    fontSize: 14,
    color: '#666',
  },
  repaymentBreakdown: {
    fontSize: 12,
    color: '#888',
    marginTop: 2,
  },
  repaymentAmount: {
    fontSize: 14,
    fontWeight: '500',
    color: '#34C759',
  },
  noData: {
    fontSize: 16,
    color: '#999',
    fontStyle: 'italic',
    textAlign: 'center',
    padding: 20,
  },
  noPayments: {
    fontSize: 14,
    color: '#999',
    fontStyle: 'italic',
    textAlign: 'center',
    padding: 10,
  },
}); 