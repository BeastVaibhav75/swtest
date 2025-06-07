import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useCallback, useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    RefreshControl,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { installmentsAPI, loansAPI } from '../../services/api';

export default function PaymentHistory() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [payments, setPayments] = useState([]);
  const [refreshing, setRefreshing] = useState(false);

  const fetchPayments = async () => {
    try {
      if (!user?._id) {
        console.log('No user ID available');
        return;
      }

      // Debug: Check token
      const token = await AsyncStorage.getItem('token');
      console.log('Token available:', !!token);

      const [installmentsRes, loansRes] = await Promise.all([
        installmentsAPI.getMyInstallments(),
        loansAPI.getMyLoans()
      ]);

      // Debug: Log the loan data structure
      console.log('Loans data:', JSON.stringify(loansRes.data, null, 2));

      // Combine and sort all outgoing payments
      const allPayments = [
        ...(installmentsRes.data || []).map(payment => ({
          ...payment,
          type: 'Installment',
          date: new Date(payment.date)
        })),
        ...(loansRes.data || []).flatMap(loan => {
          return [
            ...(loan.repayments || []).map(repayment => {
              // Calculate interest as 1% of the outstanding amount before repayment
              const interestAmount = loan.outstanding * 0.01;
              
              return [
                {
                  ...repayment,
                  type: 'Loan Repayment',
                  date: new Date(repayment.date)
                },
                {
                  _id: `${repayment._id}-interest`,
                  amount: interestAmount,
                  type: 'Loan Interest',
                  date: new Date(repayment.date)
                }
              ];
            }).flat()
          ];
        })
      ].sort((a, b) => b.date - a.date);

      console.log('Final payments array:', JSON.stringify(allPayments, null, 2));
      setPayments(allPayments);
    } catch (error) {
      console.error('Error fetching payments:', error);
      console.error('Error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
        headers: error.response?.headers
      });
      Alert.alert(
        'Error',
        'Failed to load payment history. Please try logging out and logging back in.'
      );
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchPayments();
    setRefreshing(false);
  }, [fetchPayments]);

  useEffect(() => {
    fetchPayments();
  }, [user]);

  const renderPaymentItem = ({ item }) => (
    <View style={styles.paymentItem}>
      <View>
        <Text style={styles.paymentDate}>
          {item.date.toLocaleDateString()}
        </Text>
        <Text style={styles.paymentType}>{item.type}</Text>
      </View>
      <Text style={styles.paymentAmount}>₹{item.amount}</Text>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading payment history...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Payment History</Text>
      </View>

      {payments.length === 0 ? (
        <Text style={styles.noData}>No payment history available</Text>
      ) : (
        <FlatList
          data={payments}
          renderItem={renderPaymentItem}
          keyExtractor={(item, index) => `${item.type}-${item.date}-${index}`}
          contentContainerStyle={styles.listContainer}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
            />
          }
        />
      )}
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
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: 'white',
  },
  listContainer: {
    padding: 15,
  },
  paymentItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  paymentDate: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  paymentType: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  paymentAmount: {
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
}); 