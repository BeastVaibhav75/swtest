import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import axios from 'axios';
import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  StyleSheet,
  Text,
  View,
} from 'react-native';

const API_URL = 'http://192.168.1.11:5000/api';

export default function HistoryScreen({ route, navigation }) {
  const { memberId, type, memberName } = route.params;
  const [loading, setLoading] = useState(true);
  const [history, setHistory] = useState([]);

  const fetchHistory = async () => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem('token');
      let response;

      if (type === 'loan') {
        response = await axios.get(`${API_URL}/loans/member/${memberId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        // Transform loan data to include repayments
        const loanHistory = response.data.flatMap(loan => [
          {
            _id: loan._id,
            type: 'Loan',
            amount: loan.amount,
            date: loan.date,
            status: loan.status
          },
          ...(loan.repayments || []).map(repayment => ({
            _id: `${loan._id}-repayment-${repayment._id}`,
            type: 'Repayment',
            amount: repayment.amount,
            date: repayment.date
          }))
        ]);
        setHistory(loanHistory);
      } else {
        response = await axios.get(`${API_URL}/installments/member/${memberId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setHistory(response.data);
      }
    } catch (error) {
      console.error('Error fetching history:', error);
      Alert.alert('Error', 'Failed to fetch history');
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchHistory();
    }, [])
  );

  const renderItem = ({ item }) => (
    <View style={styles.historyItem}>
      <View style={styles.historyItemLeft}>
        <Text style={styles.historyType}>{item.type}</Text>
        <Text style={styles.historyDate}>
          {new Date(item.date).toLocaleDateString()}
        </Text>
      </View>
      <Text style={styles.historyAmount}>₹{item.amount}</Text>
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
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>
          {memberName}'s {type === 'loan' ? 'Loan' : 'Installment'} History
        </Text>
      </View>

      {history.length === 0 ? (
        <Text style={styles.noData}>No history available</Text>
      ) : (
        <FlatList
          data={history}
          renderItem={renderItem}
          keyExtractor={item => item._id}
          contentContainerStyle={styles.listContainer}
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
  header: {
    backgroundColor: '#007AFF',
    padding: 20,
    paddingTop: 40,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
  },
  listContainer: {
    padding: 15,
  },
  historyItem: {
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
  historyItemLeft: {
    flex: 1,
  },
  historyType: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  historyDate: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  historyAmount: {
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