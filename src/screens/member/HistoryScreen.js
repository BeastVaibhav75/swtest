import React from 'react';
import {
    ScrollView,
    StyleSheet,
    Text,
    View,
} from 'react-native';

// Mock data for testing
const mockHistoryData = {
  loans: [
    {
      id: '1',
      date: '2024-03-01',
      amount: 5000,
      status: 'active',
      remainingAmount: 4500,
    },
    {
      id: '2',
      date: '2023-12-01',
      amount: 3000,
      status: 'completed',
      remainingAmount: 0,
    },
  ],
  installments: [
    {
      id: '1',
      date: '2024-03-01',
      amount: 1000,
      type: 'regular',
    },
    {
      id: '2',
      date: '2024-02-01',
      amount: 1000,
      type: 'regular',
    },
    {
      id: '3',
      date: '2024-01-01',
      amount: 1000,
      type: 'regular',
    },
  ],
  interestDistributions: [
    {
      id: '1',
      date: '2024-03-15',
      amount: 100,
      month: 'March 2024',
    },
    {
      id: '2',
      date: '2024-02-15',
      amount: 90,
      month: 'February 2024',
    },
  ],
};

export default function HistoryScreen() {
  const { loans, installments, interestDistributions } = mockHistoryData;

  const renderLoanItem = (loan) => (
    <View key={loan.id} style={styles.historyItem}>
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
        <Text style={styles.historyDate}>{loan.date}</Text>
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
    <View key={installment.id} style={styles.historyItem}>
      <View style={styles.historyHeader}>
        <Text style={styles.historyTitle}>Installment</Text>
        <Text style={styles.installmentType}>{installment.type}</Text>
      </View>
      <View style={styles.historyDetails}>
        <Text style={styles.historyDate}>{installment.date}</Text>
        <Text style={styles.historyAmount}>₹{installment.amount}</Text>
      </View>
    </View>
  );

  const renderInterestItem = (interest) => (
    <View key={interest.id} style={styles.historyItem}>
      <View style={styles.historyHeader}>
        <Text style={styles.historyTitle}>Interest Distribution</Text>
        <Text style={styles.interestMonth}>{interest.month}</Text>
      </View>
      <View style={styles.historyDetails}>
        <Text style={styles.historyDate}>{interest.date}</Text>
        <Text style={styles.historyAmount}>₹{interest.amount}</Text>
      </View>
    </View>
  );

  return (
    <ScrollView style={styles.container}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Loan History</Text>
        {loans.map(renderLoanItem)}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Installment History</Text>
        {installments.map(renderInstallmentItem)}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Interest Distribution History</Text>
        {interestDistributions.map(renderInterestItem)}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
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
}); 