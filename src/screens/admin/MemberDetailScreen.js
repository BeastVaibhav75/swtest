import AsyncStorage from '@react-native-async-storage/async-storage';
import { Picker } from '@react-native-picker/picker';
import { useFocusEffect } from '@react-navigation/native';
import axios from 'axios';
import React, { useCallback, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

const API_URL = 'http://192.168.1.11:5000/api';

export default function MemberDetailScreen({ route, navigation }) {
  const { member: initialMember } = route.params;
  const [member, setMember] = useState(initialMember);
  const [loading, setLoading] = useState(false);
  const [installments, setInstallments] = useState([]);
  const [installmentsLoading, setInstallmentsLoading] = useState(true);
  const [activeLoans, setActiveLoans] = useState([]);
  const [selectedLoan, setSelectedLoan] = useState(null);
  const [loanLoading, setLoanLoading] = useState(true);

  const fetchMemberData = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      const response = await axios.get(`${API_URL}/auth/members`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      // Find the specific member from the response
      const memberData = response.data.find(m => m.memberId === initialMember.memberId);
      if (memberData) {
        setMember(memberData);
      } else {
        Alert.alert('Error', 'Member not found');
      }
    } catch (error) {
      console.error('Error fetching member data:', error);
      Alert.alert('Error', 'Failed to fetch member data');
    }
  };

  const fetchActiveLoans = async () => {
    try {
      setLoanLoading(true);
      const token = await AsyncStorage.getItem('token');
      console.log('Fetching loans for member ID:', initialMember._id);
      const response = await axios.get(`${API_URL}/loans/member/${initialMember._id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      // Find all active loans
      const actives = response.data.filter(loan => loan.status === 'active');
      setActiveLoans(actives);
      if (actives.length > 0) {
        setSelectedLoan(actives[0]);
      } else {
        setSelectedLoan(null);
      }
    } catch (error) {
      console.error('Error fetching active loans:', error);
      Alert.alert('Error', 'Failed to fetch active loans');
    } finally {
      setLoanLoading(false);
    }
  };

  const fetchInstallments = async () => {
    try {
      setInstallmentsLoading(true);
      const token = await AsyncStorage.getItem('token');
      console.log('Fetching installments for member ID:', initialMember._id);
      const response = await axios.get(`${API_URL}/installments/member/${initialMember._id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setInstallments(response.data);
    } catch (error) {
      console.error('Error fetching installments:', error);
      Alert.alert('Error', 'Failed to fetch installments');
    } finally {
      setInstallmentsLoading(false);
    }
  };

  // Refresh data when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      fetchMemberData();
      fetchActiveLoans();
      fetchInstallments();
    }, [])
  );

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#FF3B30" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Member Information</Text>
        <View style={styles.infoItem}>
          <Text style={styles.label}>Name</Text>
          <Text style={styles.value}>{member.name}</Text>
        </View>
        <View style={styles.infoItem}>
          <Text style={styles.label}>Phone</Text>
          <Text style={styles.value}>{member.phone}</Text>
        </View>
        <View style={styles.infoItem}>
          <Text style={styles.label}>Member ID</Text>
          <Text style={styles.value}>{member.memberId}</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Active Loan</Text>
        {loanLoading ? (
          <ActivityIndicator size="small" color="#007AFF" />
        ) : activeLoans.length > 0 ? (
          <>
            <Text style={styles.label}>Select Loan</Text>
            <View style={styles.selectBox}>
              <Picker
                selectedValue={selectedLoan ? selectedLoan._id : ''}
                onValueChange={(itemValue) => {
                  const loan = activeLoans.find(l => l._id === itemValue);
                  setSelectedLoan(loan);
                }}>
                {activeLoans.map(loan => (
                  <Picker.Item
                    key={loan._id}
                    label={`₹${loan.amount} | ${loan.date ? new Date(loan.date).toLocaleDateString() : ''}`}
                    value={loan._id}
                  />
                ))}
              </Picker>
            </View>
            {selectedLoan && (
              <>
                <View style={styles.infoItem}>
                  <Text style={styles.label}>Original Amount</Text>
                  <Text style={styles.value}>₹{selectedLoan.amount}</Text>
                </View>
                <View style={styles.infoItem}>
                  <Text style={styles.label}>Deduction (2%)</Text>
                  <Text style={styles.value}>₹{selectedLoan.deduction}</Text>
                </View>
                <View style={styles.infoItem}>
                  <Text style={styles.label}>Net Amount</Text>
                  <Text style={styles.value}>₹{selectedLoan.netAmount}</Text>
                </View>
                <View style={styles.infoItem}>
                  <Text style={styles.label}>Interest Rate</Text>
                  <Text style={styles.value}>{selectedLoan.interestRate}%</Text>
                </View>
                <View style={styles.infoItem}>
                  <Text style={styles.label}>Outstanding Amount</Text>
                  <Text style={styles.value}>₹{selectedLoan.outstanding}</Text>
                </View>
                <View style={styles.infoItem}>
                  <Text style={styles.label}>Date</Text>
                  <Text style={styles.value}>{new Date(selectedLoan.date).toLocaleDateString()}</Text>
                </View>
              </>
            )}
          </>
        ) : (
          <Text style={styles.noData}>No active loan</Text>
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Recent Installments</Text>
        {installmentsLoading ? (
          <ActivityIndicator size="small" color="#007AFF" />
        ) : installments.length > 0 ? (
          <>
            {installments.slice(0, 5).map((installment) => (
              <View key={installment._id} style={styles.installmentItem}>
                <Text style={styles.installmentAmount}>₹{installment.amount}</Text>
                <Text style={styles.installmentDate}>
                  {new Date(installment.date).toLocaleDateString()}
                </Text>
              </View>
            ))}
            <View style={styles.infoItem}>
              <Text style={styles.label}>Total Installments</Text>
              <Text style={styles.value}>{installments.length}</Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.label}>Total Amount</Text>
              <Text style={styles.value}>
                ₹{installments.reduce((sum, inst) => sum + inst.amount, 0)}
              </Text>
            </View>
          </>
        ) : (
          <Text style={styles.noData}>No installments recorded</Text>
        )}
      </View>

      <View style={styles.actions}>
        <TouchableOpacity
          style={[styles.actionButton, styles.historyButton]}
          onPress={() => navigation.navigate('History', { 
            memberId: member._id,
            type: 'loan',
            memberName: member.name
          })}
        >
          <Text style={styles.actionButtonText}>View Loan History</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionButton, styles.historyButton]}
          onPress={() => navigation.navigate('History', { 
            memberId: member._id,
            type: 'installment',
            memberName: member.name
          })}
        >
          <Text style={styles.actionButtonText}>View Installment History</Text>
        </TouchableOpacity>
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
    padding: 15,
    marginBottom: 10,
    borderRadius: 10,
    marginHorizontal: 10,
    marginTop: 10,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#333',
  },
  infoItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
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
  selectBox: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 5,
    marginBottom: 15,
  },
  noData: {
    textAlign: 'center',
    color: '#666',
    fontStyle: 'italic',
    padding: 10,
  },
  installmentItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  installmentAmount: {
    fontSize: 16,
    fontWeight: '500',
    color: '#007AFF',
  },
  installmentDate: {
    fontSize: 14,
    color: '#666',
  },
  actions: {
    padding: 15,
    marginBottom: 20,
  },
  actionButton: {
    backgroundColor: '#007AFF',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 10,
  },
  historyButton: {
    backgroundColor: '#34C759',
  },
  actionButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
}); 