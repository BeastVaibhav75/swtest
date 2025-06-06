import React from 'react';
import {
    ScrollView,
    StyleSheet,
    Text,
    View,
} from 'react-native';

// Mock data for testing
const mockInterestData = {
  totalInterestEarned: 5000,
  totalMembers: 5,
  interestPerMember: 1000,
  distributionHistory: [
    {
      id: '1',
      month: 'March 2024',
      totalInterest: 500,
      distributedTo: 5,
      amountPerMember: 100,
    },
    {
      id: '2',
      month: 'February 2024',
      totalInterest: 450,
      distributedTo: 5,
      amountPerMember: 90,
    },
    {
      id: '3',
      month: 'January 2024',
      totalInterest: 400,
      distributedTo: 5,
      amountPerMember: 80,
    },
  ],
};

export default function InterestDistributionScreen() {
  const {
    totalInterestEarned,
    totalMembers,
    interestPerMember,
    distributionHistory,
  } = mockInterestData;

  const renderDistributionItem = (item) => (
    <View key={item.id} style={styles.distributionItem}>
      <View style={styles.distributionHeader}>
        <Text style={styles.distributionMonth}>{item.month}</Text>
        <Text style={styles.distributionAmount}>₹{item.totalInterest}</Text>
      </View>
      <View style={styles.distributionDetails}>
        <Text style={styles.distributionDetail}>
          Distributed to {item.distributedTo} members
        </Text>
        <Text style={styles.distributionDetail}>
          ₹{item.amountPerMember} per member
        </Text>
      </View>
    </View>
  );

  return (
    <ScrollView style={styles.container}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Interest Distribution Summary</Text>
        <View style={styles.summaryItem}>
          <Text style={styles.label}>Total Interest Earned</Text>
          <Text style={styles.value}>₹{totalInterestEarned}</Text>
        </View>
        <View style={styles.summaryItem}>
          <Text style={styles.label}>Total Members</Text>
          <Text style={styles.value}>{totalMembers}</Text>
        </View>
        <View style={styles.summaryItem}>
          <Text style={styles.label}>Interest Per Member</Text>
          <Text style={styles.value}>₹{interestPerMember}</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Distribution History</Text>
        {distributionHistory.map(renderDistributionItem)}
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
  distributionItem: {
    backgroundColor: '#f8f8f8',
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
  },
  distributionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 5,
  },
  distributionMonth: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  distributionAmount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#34C759',
  },
  distributionDetails: {
    marginTop: 5,
  },
  distributionDetail: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
}); 