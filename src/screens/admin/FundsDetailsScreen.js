import React, { useCallback, useState } from 'react';
import {
    ActivityIndicator,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { fundAPI } from '../../services/api';

export default function FundsDetailsScreen({ navigation }) {
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [fundData, setFundData] = useState({
    totalFund: 0,
    totalLoans: 0,
    totalExpenses: 0,
    breakdown: {
      loans: [],
      expenses: []
    }
  });

  const fetchFundDetails = async () => {
    try {
      setLoading(true);
      const [fundRes, loansRes, expensesRes] = await Promise.all([
        fundAPI.getFundSummary(),
        fundAPI.getLoans(),
        fundAPI.getExpenses()
      ]);

      setFundData({
        totalFund: fundRes.data?.totalFund || 0,
        totalLoans: fundRes.data?.totalLoans || 0,
        totalExpenses: fundRes.data?.totalExpenses || 0,
        breakdown: {
          loans: loansRes.data || [],
          expenses: expensesRes.data || []
        }
      });
    } catch (error) {
      console.error('Error fetching fund details:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchFundDetails();
  }, []);

  React.useEffect(() => {
    fetchFundDetails();
  }, []);

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
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="arrow-left" size={28} color="#007AFF" />
        </TouchableOpacity>
        <Text style={styles.title}>Funds Details</Text>
      </View>

      <View style={styles.summarySection}>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>Total Fund</Text>
          <Text style={styles.summaryValue}>₹{fundData.totalFund.toFixed(2)}</Text>
        </View>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>Total Loans</Text>
          <Text style={styles.summaryValue}>₹{fundData.totalLoans.toFixed(2)}</Text>
        </View>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>Total Expenses</Text>
          <Text style={styles.summaryValue}>₹{fundData.totalExpenses.toFixed(2)}</Text>
        </View>
      </View>

      <View style={styles.graphSection}>
        <Text style={styles.graphLabel}>Loans & Expenses Breakdown</Text>
        {fundData.breakdown.loans.length === 0 && fundData.breakdown.expenses.length === 0 ? (
          <View style={styles.graphPlaceholder}>
            <Text style={styles.graphPlaceholderText}>No data available</Text>
          </View>
        ) : (
          <View style={styles.graphPlaceholder}>
            <Text style={styles.graphPlaceholderText}>[Breakdown Graph Placeholder]</Text>
          </View>
        )}
      </View>

      <View style={styles.listSection}>
        <Text style={styles.listTitle}>Recent Loans</Text>
        {fundData.breakdown.loans.length === 0 ? (
          <Text style={styles.emptyText}>No recent loans</Text>
        ) : (
          fundData.breakdown.loans.slice(0, 5).map((loan, index) => (
            <View key={loan._id} style={styles.listItem}>
              <Text style={styles.listItemTitle}>{loan.memberName}</Text>
              <Text style={styles.listItemValue}>₹{loan.amount.toFixed(2)}</Text>
            </View>
          ))
        )}
      </View>

      <View style={styles.listSection}>
        <Text style={styles.listTitle}>Recent Expenses</Text>
        {fundData.breakdown.expenses.length === 0 ? (
          <Text style={styles.emptyText}>No recent expenses</Text>
        ) : (
          fundData.breakdown.expenses.slice(0, 5).map((expense, index) => (
            <View key={expense._id} style={styles.listItem}>
              <Text style={styles.listItemTitle}>{expense.description}</Text>
              <Text style={styles.listItemValue}>₹{expense.amount.toFixed(2)}</Text>
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
    marginTop: 30,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#007AFF',
    marginLeft: 16,
  },
  summarySection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#fff',
    marginTop: 16,
    marginHorizontal: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  summaryItem: {
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  graphSection: {
    marginHorizontal: 16,
    marginTop: 32,
  },
  graphLabel: {
    fontSize: 16,
    color: '#333',
    marginBottom: 12,
  },
  graphPlaceholder: {
    height: 220,
    backgroundColor: '#E5E5EA',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  graphPlaceholderText: {
    color: '#999',
    fontSize: 16,
    fontStyle: 'italic',
  },
  listSection: {
    marginHorizontal: 16,
    marginTop: 24,
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  listTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  listItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  listItemTitle: {
    fontSize: 16,
    color: '#333',
  },
  listItemValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  emptyText: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
    textAlign: 'center',
    padding: 10,
  },
}); 