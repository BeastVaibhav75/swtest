import React from 'react';
import {
    ScrollView,
    StyleSheet,
    Text,
    View,
} from 'react-native';

// Mock data for testing
const mockFundData = {
  totalFund: 50000,
  activeLoans: 15000,
  availableFund: 35000,
  recentTransactions: [
    {
      id: '1',
      type: 'installment',
      amount: 1000,
      member: 'John Doe',
      date: '2024-03-01',
    },
    {
      id: '2',
      type: 'loan',
      amount: 5000,
      member: 'Jane Smith',
      date: '2024-02-28',
    },
    {
      id: '3',
      type: 'repayment',
      amount: 2000,
      member: 'Bob Johnson',
      date: '2024-02-27',
    },
  ],
};

export default function FundScreen() {
  const { totalFund, activeLoans, availableFund, recentTransactions } = mockFundData;

  const renderTransaction = (transaction) => (
    <View key={transaction.id} style={styles.transactionItem}>
      <View style={styles.transactionInfo}>
        <Text style={styles.transactionType}>
          {transaction.type.charAt(0).toUpperCase() + transaction.type.slice(1)}
        </Text>
        <Text style={styles.transactionMember}>{transaction.member}</Text>
        <Text style={styles.transactionDate}>{transaction.date}</Text>
      </View>
      <Text style={[
        styles.transactionAmount,
        transaction.type === 'loan' ? styles.negative : styles.positive
      ]}>
        {transaction.type === 'loan' ? '-' : '+'}₹{transaction.amount}
      </Text>
    </View>
  );

  return (
    <ScrollView style={styles.container}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Fund Summary</Text>
        <View style={styles.summaryItem}>
          <Text style={styles.label}>Total Fund</Text>
          <Text style={styles.value}>₹{totalFund}</Text>
        </View>
        <View style={styles.summaryItem}>
          <Text style={styles.label}>Active Loans</Text>
          <Text style={[styles.value, styles.negative]}>₹{activeLoans}</Text>
        </View>
        <View style={styles.summaryItem}>
          <Text style={styles.label}>Available Fund</Text>
          <Text style={[styles.value, styles.positive]}>₹{availableFund}</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Recent Transactions</Text>
        {recentTransactions.map(renderTransaction)}
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
  summaryItem: {
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
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  positive: {
    color: '#34C759',
  },
  negative: {
    color: '#FF3B30',
  },
  transactionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  transactionInfo: {
    flex: 1,
  },
  transactionType: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  transactionMember: {
    fontSize: 14,
    color: '#666',
  },
  transactionDate: {
    fontSize: 12,
    color: '#999',
  },
  transactionAmount: {
    fontSize: 16,
    fontWeight: 'bold',
  },
}); 