import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { fundAPI } from '../../services/api';

export default function MemberEarnings() {
  const [loading, setLoading] = useState(true);
  const [totalInterest, setTotalInterest] = useState(0);
  const [monthlyInterest, setMonthlyInterest] = useState(0);
  const [distributions, setDistributions] = useState([]);
  const { user } = useAuth();
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchEarningsData();
  }, []);

  const fetchEarningsData = async () => {
    try {
      setLoading(true);
      // Fetch both interest and share value for consistency
      const [interestRes, shareValueRes] = await Promise.all([
        fundAPI.getInterest(user._id),
        fundAPI.getShareValue()
      ]);
      // Use interestEarned from user data
      setTotalInterest(user.interestEarned || 0);
      setDistributions(interestRes.data.distributions || []);

      // Calculate monthly interest from distributions
      const now = new Date();
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
      const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
      
      // Filter distributions for current month
      const monthlyDistributions = interestRes.data.distributions.filter(dist => {
        const distDate = new Date(dist.date);
        return distDate >= firstDay && distDate <= lastDay;
      });

      // Calculate total monthly interest
      const monthlyTotal = monthlyDistributions.reduce((sum, dist) => {
        // Only include interest and deduction types
        if (dist.type === 'interest' || dist.type === 'deduction') {
          return sum + (dist.perMemberAmount || 0);
        }
        return sum;
      }, 0);

      setMonthlyInterest(monthlyTotal);
    } catch (error) {
      console.error('Error fetching earnings data:', error);
      setTotalInterest(0);
      setMonthlyInterest(0);
      setDistributions([]);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchEarningsData();
    setRefreshing(false);
  }, [fetchEarningsData]);

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
        <Text style={styles.headerTitle}>Your Earnings</Text>
      </View>

      {/* Summary Section */}
      <View style={styles.section}>
        <View style={styles.summaryRow}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Total Interest</Text>
            <Text style={styles.summaryValue}>₹{totalInterest.toFixed(2)}</Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>This Month</Text>
            <Text style={styles.summaryValue}>₹{monthlyInterest.toFixed(2)}</Text>
          </View>
        </View>
      </View>

      {/* Distribution History */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Distribution History</Text>
        {distributions.length === 0 ? (
          <Text style={styles.noData}>No distributions yet</Text>
        ) : (
          distributions.map((dist, index) => (
            <View key={index} style={styles.distributionItem}>
              <View style={styles.distributionHeader}>
                <Text style={styles.distributionDate}>
                  {new Date(dist.date).toLocaleDateString()}
                </Text>
                <Text style={styles.distributionAmount}>
                  ₹{dist.perMemberAmount.toFixed(2)}
                </Text>
              </View>
              <Text style={styles.distributionDetail}>
                From total distribution of ₹{dist.totalAmount.toFixed(2)}
              </Text>
            </View>
          ))
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
  header: {
    padding: 20,
    backgroundColor: '#007AFF',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
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
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
    padding: 10,
  },
  summaryLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  },
  summaryValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
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
  distributionDate: {
    fontSize: 16,
    color: '#333',
  },
  distributionAmount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#34C759',
  },
  distributionDetail: {
    fontSize: 14,
    color: '#666',
  },
  noData: {
    fontSize: 14,
    color: '#999',
    fontStyle: 'italic',
    textAlign: 'center',
    padding: 20,
  },
}); 