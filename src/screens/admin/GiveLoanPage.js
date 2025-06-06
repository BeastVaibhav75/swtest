import DateTimePicker from '@react-native-community/datetimepicker';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Modal, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { loansAPI, membersAPI } from '../../services/api';

export default function GiveLoanPage({ navigation }) {
  const [selectedMember, setSelectedMember] = useState(null);
  const [loanAmount, setLoanAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [date, setDate] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showMemberModal, setShowMemberModal] = useState(false);
  const [members, setMembers] = useState([]);
  const [membersLoading, setMembersLoading] = useState(false);

  useEffect(() => {
    const fetchMembers = async () => {
      setMembersLoading(true);
      try {
        const res = await membersAPI.getAll();
        setMembers(res.data);
      } catch (e) {
        setMembers([]);
      } finally {
        setMembersLoading(false);
      }
    };
    fetchMembers();
  }, []);

  const deduction = loanAmount ? (parseFloat(loanAmount) * 0.02).toFixed(2) : '0.00';
  const netAmount = loanAmount ? (parseFloat(loanAmount) * 0.98).toFixed(2) : '0.00';

  const handleDateChange = (event, selectedDate) => {
    setShowDatePicker(false);
    if (selectedDate) {
      setDate(selectedDate.toISOString().slice(0, 10));
    }
  };

  const renderMemberItem = ({ item }) => (
    <TouchableOpacity
      style={styles.memberItem}
      onPress={() => {
        setSelectedMember(item);
        setShowMemberModal(false);
      }}
    >
      <Text style={styles.memberName}>{item.name}</Text>
      <Text style={styles.memberId}>ID: {item.memberId}</Text>
    </TouchableOpacity>
  );

  const handleApprove = async () => {
    if (!selectedMember) {
      Alert.alert('Error', 'Please select a member');
      return;
    }

    if (!loanAmount) {
      Alert.alert('Error', 'Please enter loan amount');
      return;
    }

    setLoading(true);
    try {
      const saveDate = date ? date : new Date().toISOString().slice(0, 10);
      const amount = parseFloat(loanAmount);
      
      // Calculate deduction (2% of amount)
      const deduction = amount * 0.02;
      const netAmount = amount - deduction;

      // Create loan with 1% interest rate
      await loansAPI.create({
        memberId: selectedMember._id,
        amount: amount, // Original amount
        netAmount: netAmount, // Amount after 2% deduction
        deduction: deduction, // 2% deduction
        interestRate: 1, // 1% interest rate
        date: saveDate
      });

      Alert.alert('Success', 'Loan approved successfully', [
        { text: 'OK', onPress: () => {
          setLoanAmount('');
          setDate('');
          setSelectedMember(null);
          navigation.navigate('DashboardMain', { refresh: true });
        }}
      ]);
    } catch (error) {
      Alert.alert('Error', error.response?.data?.message || 'Failed to approve loan');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="arrow-left" size={28} color="#007AFF" />
        </TouchableOpacity>
        <Text style={styles.title}>Give Loan</Text>
      </View>
      {/* Member selection */}
      <TouchableOpacity style={styles.selectBox} onPress={() => setShowMemberModal(true)}>
        <Text style={styles.selectText}>{selectedMember ? selectedMember.name : 'Select Member'}</Text>
        <Icon name="chevron-down" size={24} color="#007AFF" />
      </TouchableOpacity>
      <Modal
        visible={showMemberModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowMemberModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Select Member</Text>
            {membersLoading ? (
              <ActivityIndicator size="large" color="#007AFF" />
            ) : (
              <FlatList
                data={members}
                keyExtractor={item => item._id}
                renderItem={renderMemberItem}
                contentContainerStyle={{ paddingBottom: 20 }}
              />
            )}
            <TouchableOpacity style={styles.closeModalBtn} onPress={() => setShowMemberModal(false)}>
              <Text style={styles.closeModalText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
      {/* Loan amount input */}
      <Text style={styles.label}>Loan Amount</Text>
      <TextInput
        style={styles.input}
        placeholder="Enter loan amount"
        value={loanAmount}
        onChangeText={setLoanAmount}
        keyboardType="numeric"
      />
      {/* Date input (optional) with calendar icon */}
      <Text style={styles.label}>Date (optional)</Text>
      <View style={styles.dateInputRow}>
        <TextInput
          style={[styles.input, { flex: 1, marginRight: 8 }]}
          placeholder="YYYY-MM-DD (leave blank for today)"
          value={date}
          onChangeText={setDate}
        />
        <TouchableOpacity onPress={() => setShowDatePicker(true)}>
          <Icon name="calendar" size={28} color="#007AFF" />
        </TouchableOpacity>
      </View>
      {showDatePicker && (
        <DateTimePicker
          value={date ? new Date(date) : new Date()}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={handleDateChange}
        />
      )}
      {/* Deduction and net amount */}
      <View style={styles.deductionRow}>
        <Text style={styles.deductionLabel}>2% Deduction</Text>
        <Text style={styles.deductionValue}>-₹{deduction}</Text>
      </View>
      <View style={styles.deductionRow}>
        <Text style={[styles.deductionLabel, { fontWeight: 'bold' }]}>Net Amount to Member</Text>
        <Text style={[styles.deductionValue, { fontWeight: 'bold', color: '#34C759' }]}>₹{netAmount}</Text>
      </View>
      <TouchableOpacity 
        style={styles.approveButton} 
        onPress={handleApprove}
        disabled={loading}
      >
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.approveButtonText}>Approve</Text>}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5', marginTop: 30 },
  header: { flexDirection: 'row', alignItems: 'center', padding: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#E5E5E5' },
  title: { fontSize: 20, fontWeight: 'bold', color: '#007AFF', marginLeft: 16 },
  selectBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 8, padding: 16, margin: 16, borderWidth: 1, borderColor: '#E5E5E5', justifyContent: 'space-between' },
  selectText: { fontSize: 16, color: '#333' },
  label: { fontSize: 16, color: '#333', marginLeft: 16, marginTop: 16 },
  input: { backgroundColor: '#fff', borderRadius: 8, padding: 16, margin: 16, borderWidth: 1, borderColor: '#E5E5E5', fontSize: 16 },
  deductionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginHorizontal: 16, marginTop: 8 },
  deductionLabel: { fontSize: 16, color: '#333' },
  deductionValue: { fontSize: 16, color: '#333' },
  approveButton: { backgroundColor: '#007AFF', padding: 16, borderRadius: 10, alignItems: 'center', margin: 16 },
  approveButtonText: { color: 'white', fontSize: 16, fontWeight: 'bold' },
  dateInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    width: '85%',
    maxHeight: '70%',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#007AFF',
  },
  closeModalBtn: {
    marginTop: 16,
    backgroundColor: '#eee',
    padding: 10,
    borderRadius: 8,
    alignItems: 'center',
    width: '100%',
  },
  closeModalText: {
    color: '#007AFF',
    fontWeight: 'bold',
    fontSize: 16,
  },
  memberItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    width: '100%',
  },
  memberName: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  memberId: {
    fontSize: 14,
    color: '#666',
  },
}); 