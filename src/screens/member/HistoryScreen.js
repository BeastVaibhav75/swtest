import React, { useCallback, useState } from 'react';
import {
    ActivityIndicator,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { memberAPI } from '../../services/api';

export default function HistoryScreen() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [historyData, setHistoryData] = useState({
    loans: [],
    installments: [],
    interestDistributions: []
  });

  const fetchHistoryData = async () => {
    try {
      setLoading(true);
      const [loansRes, installmentsRes, interestRes] = await Promise.all([
        memberAPI.getLoans(user.memberId),
        memberAPI.getInstallments(user.memberId),
        memberAPI.getInterestDistributions(user.memberId)
      ]);

      setHistoryData({
        loans: loansRes.data || [],
        installments: installmentsRes.data || [],
        interestDistributions: interestRes.data || []
      });
    } catch (error) {
      console.error('Error fetching history data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchHistoryData();
  }, []);

  React.useEffect(() => {
    fetchHistoryData();
  }, []);

  if (loading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  const { loans, installments, interestDistributions } = historyData;

  const renderLoanItem = (loan) => (
    <View key={loan._id} style={styles.historyItem}>
      <View style={styles.historyHeader}>
        <Text style={styles.historyTitle}>Loan</Text>
        <Text style={[
          styles.historyStatus,
          loan.status === 'active' ? styles.activeStatus : styles.completedStatus
        ]}>
          {loan.status.toUpperCase()}
        </Text>
      </View>
      <View style={styles.historyDetails}>
        <Text style={styles.historyDate}>{new Date(loan.date).toLocaleDateString()}</Text>
        <Text style={styles.historyAmount}>₹{loan.amount}</Text>
      </View>
      {loan.status === 'active' && (
        <Text style={styles.remainingAmount}>
          Remaining: ₹{loan.remainingAmount}
        </Text>
      )}
    </View>
  );

  const renderInstallmentItem = (installment) => (
    <View key={installment._id} style={styles.historyItem}>
      <View style={styles.historyHeader}>
        <Text style={styles.historyTitle}>Installment</Text>
        <Text style={styles.installmentType}>{installment.type}</Text>
      </View>
      <View style={styles.historyDetails}>
        <Text style={styles.historyDate}>{new Date(installment.date).toLocaleDateString()}</Text>
        <Text style={styles.historyAmount}>₹{installment.amount}</Text>
      </View>
    </View>
  );

  const renderInterestItem = (interest) => (
    <View key={interest._id} style={styles.historyItem}>
      <View style={styles.historyHeader}>
        <Text style={styles.historyTitle}>Interest Distribution</Text>
        <Text style={styles.interestMonth}>{new Date(interest.date).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</Text>
      </View>
      <View style={styles.historyDetails}>
        <Text style={styles.historyDate}>{new Date(interest.date).toLocaleDateString()}</Text>
        <Text style={styles.historyAmount}>₹{interest.amount}</Text>
      </View>
    </View>
  );

  return (
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
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Loan History</Text>
        {loans.length === 0 ? (
          <Text style={styles.emptyText}>No loan history available</Text>
        ) : (
          loans.map(renderLoanItem)
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Installment History</Text>
        {installments.length === 0 ? (
          <Text style={styles.emptyText}>No installment history available</Text>
        ) : (
          installments.map(renderInstallmentItem)
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Interest Distribution History</Text>
        {interestDistributions.length === 0 ? (
          <Text style={styles.emptyText}>No interest distribution history available</Text>
        ) : (
          interestDistributions.map(renderInterestItem)
        )}
      </View>
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
    marginBottom: 15,
    color: '#333',
  },
  historyItem: {
    backgroundColor: '#f8f8f8',
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 5,
  },
  historyTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  historyStatus: {
    fontSize: 12,
    fontWeight: 'bold',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  activeStatus: {
    backgroundColor: '#34C759',
    color: 'white',
  },
  completedStatus: {
    backgroundColor: '#8E8E93',
    color: 'white',
  },
  historyDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  historyDate: {
    fontSize: 14,
    color: '#666',
  },
  historyAmount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  remainingAmount: {
    fontSize: 14,
    color: '#666',
    marginTop: 5,
  },
  installmentType: {
    fontSize: 12,
    color: '#666',
    backgroundColor: '#E5E5EA',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  interestMonth: {
    fontSize: 12,
    color: '#666',
  },
  emptyText: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
    textAlign: 'center',
    padding: 10,
  },
}); 