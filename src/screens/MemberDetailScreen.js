import { useNavigation, useRoute } from '@react-navigation/native';
import React, { useCallback, useEffect, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useApi } from '../hooks/useApi';
import { installmentsAPI, loansAPI } from '../services/api';

const MemberDetailScreen = () => {
  const route = useRoute();
  const navigation = useNavigation();
  const { member } = route.params;
  const [refreshing, setRefreshing] = useState(false);

  const { data: loans, loading: loansLoading, error: loansError, execute: fetchLoans } = useApi(() => loansAPI.getByMember(member._id));
  const { data: installments, loading: installmentsLoading, error: installmentsError, execute: fetchInstallments } = useApi(() => installmentsAPI.getByMember(member._id));

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([fetchLoans(), fetchInstallments()]);
    setRefreshing(false);
  }, [fetchLoans, fetchInstallments]);

  useEffect(() => {
    fetchLoans();
    fetchInstallments();
  }, []);

  const handleGiveLoan = () => {
    navigation.navigate('GiveLoan', { member });
  };

  const handleRecordInstallment = () => {
    navigation.navigate('RecordInstallment', { member });
  };

  const renderLoanItem = (loan) => (
    <View key={loan._id} style={styles.loanItem}>
      <Text style={styles.loanAmount}>₹{loan.amount}</Text>
      <Text style={styles.loanDate}>Date: {new Date(loan.date).toLocaleDateString()}</Text>
      <Text style={styles.loanStatus}>Status: {loan.status}</Text>
      <Text style={styles.loanOutstanding}>Outstanding: ₹{loan.outstanding}</Text>
    </View>
  );

  const renderInstallmentItem = (installment) => (
    <View key={installment._id} style={styles.installmentItem}>
      <Text style={styles.installmentAmount}>₹{installment.amount}</Text>
      <Text style={styles.installmentDate}>Date: {new Date(installment.date).toLocaleDateString()}</Text>
    </View>
  );

  if (loansLoading || installmentsLoading) {
    return (
      <View style={styles.container}>
        <Text>Loading...</Text>
      </View>
    );
  }

  if (loansError || installmentsError) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Error loading data</Text>
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
        <Text style={styles.name}>{member.name}</Text>
        <Text style={styles.memberId}>ID: {member.memberId}</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Active Loans</Text>
        {loans?.filter(loan => loan.status === 'active').map(renderLoanItem)}
        {loans?.filter(loan => loan.status === 'active').length === 0 && (
          <Text style={styles.noData}>No active loans</Text>
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Last Installments</Text>
        {installments?.slice(0, 5).map(renderInstallmentItem)}
        {installments?.length === 0 && (
          <Text style={styles.noData}>No installments recorded</Text>
        )}
      </View>

      <View style={styles.buttonContainer}>
        <TouchableOpacity style={styles.button} onPress={handleGiveLoan}>
          <Text style={styles.buttonText}>Give Loan</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.button} onPress={handleRecordInstallment}>
          <Text style={styles.buttonText}>Record Installment</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    paddingTop: 20,
  },
  header: {
    backgroundColor: 'white',
    padding: 16,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  name: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  memberId: {
    fontSize: 16,
    color: '#666',
  },
  section: {
    backgroundColor: 'white',
    padding: 16,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  loanItem: {
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    paddingVertical: 12,
  },
  loanAmount: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  loanDate: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  loanStatus: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  loanOutstanding: {
    fontSize: 14,
    color: '#666',
  },
  installmentItem: {
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    paddingVertical: 12,
  },
  installmentAmount: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  installmentDate: {
    fontSize: 14,
    color: '#666',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
  },
  button: {
    backgroundColor: '#007AFF',
    padding: 12,
    borderRadius: 8,
    flex: 1,
    marginHorizontal: 8,
  },
  buttonText: {
    color: 'white',
    textAlign: 'center',
    fontSize: 16,
    fontWeight: 'bold',
  },
  noData: {
    textAlign: 'center',
    color: '#666',
    fontStyle: 'italic',
    padding: 16,
  },
  errorText: {
    color: '#ff4444',
    textAlign: 'center',
    margin: 16,
  },
});

export default MemberDetailScreen; 