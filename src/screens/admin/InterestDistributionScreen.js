import React, { useCallback, useState } from 'react';
import {
    ActivityIndicator,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    View
} from 'react-native';
import { fundAPI } from '../../services/api';

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
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [interestData, setInterestData] = useState({
    totalInterestEarned: 0,
    totalMembers: 0,
    interestPerMember: 0,
    distributionHistory: []
  });

  const fetchInterestData = async () => {
    try {
      setLoading(true);
      const [interestRes, membersRes] = await Promise.all([
        fundAPI.getInterestDistribution(),
        fundAPI.getMembers()
      ]);

      setInterestData({
        totalInterestEarned: interestRes.data?.totalInterest || 0,
        totalMembers: membersRes.data?.length || 0,
        interestPerMember: interestRes.data?.interestPerMember || 0,
        distributionHistory: interestRes.data?.distributions || []
      });
    } catch (error) {
      console.error('Error fetching interest data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchInterestData();
  }, []);

  React.useEffect(() => {
    fetchInterestData();
  }, []);

  const {
    totalInterestEarned,
    totalMembers,
    interestPerMember,
    distributionHistory,
  } = interestData;

  const renderDistributionItem = (item) => (
    <View key={item._id} style={styles.distributionItem}>
      <View style={styles.distributionHeader}>
        <Text style={styles.distributionMonth}>
          {new Date(item.date).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
        </Text>
        <Text style={styles.distributionAmount}>₹{item.totalAmount}</Text>
      </View>
      <View style={styles.distributionDetails}>
        <Text style={styles.distributionDetail}>
          Distributed to {item.distributedTo} members
        </Text>
        <Text style={styles.distributionDetail}>
          ₹{item.perMemberAmount} per member
        </Text>
      </View>
    </View>
  );

  if (loading && !refreshing) {
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
          colors={['#007AFF']}
        />
      }
    >
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
        {distributionHistory.length === 0 ? (
          <Text style={styles.noData}>No distribution history available</Text>
        ) : (
          distributionHistory.map(renderDistributionItem)
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
  noData: {
    fontSize: 14,
    color: '#999',
    fontStyle: 'italic',
    textAlign: 'center',
    padding: 20,
  },
}); 