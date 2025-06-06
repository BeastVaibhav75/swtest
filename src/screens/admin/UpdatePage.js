import DateTimePicker from '@react-native-community/datetimepicker';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Modal, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { installmentsAPI, loansAPI, membersAPI } from '../../services/api';

export default function UpdatePage({ navigation }) {
  const [selectedMember, setSelectedMember] = useState(null);
  const [installment, setInstallment] = useState('');
  const [interest, setInterest] = useState('');
  const [loanRepayment, setLoanRepayment] = useState('');
  const [loading, setLoading] = useState(false);
  const [date, setDate] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showMemberModal, setShowMemberModal] = useState(false);
  const [members, setMembers] = useState([]);
  const [membersLoading, setMembersLoading] = useState(false);
  const [hasActiveLoan, setHasActiveLoan] = useState(false);
  const [activeLoans, setActiveLoans] = useState([]);
  const [selectedLoan, setSelectedLoan] = useState(null);
  const [showLoanModal, setShowLoanModal] = useState(false);

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

  const handleDateChange = (event, selectedDate) => {
    setShowDatePicker(false);
    if (selectedDate) {
      setDate(selectedDate.toISOString().slice(0, 10));
    }
  };

  const checkActiveLoan = async (member) => {
    setSelectedMember(member);
    setShowMemberModal(false);
    setActiveLoans([]);
    setSelectedLoan(null);
    try {
      const loans = await loansAPI.getByMember(member._id);
      const actives = loans.data.filter(loan => loan.status === 'active');
      setActiveLoans(actives);
      if (actives.length === 1) {
        setSelectedLoan(actives[0]);
      }
    } catch (e) {
      setActiveLoans([]);
      setSelectedLoan(null);
    }
  };

  const renderMemberItem = ({ item }) => (
    <TouchableOpacity
      style={styles.memberItem}
      onPress={() => checkActiveLoan(item)}
    >
      <Text style={styles.memberName}>{item.name}</Text>
      <Text style={styles.memberId}>ID: {item.memberId}</Text>
    </TouchableOpacity>
  );

  const handleUpdate = async () => {
    if (!selectedMember) {
      Alert.alert('Error', 'Please select a member');
      return;
    }

    if (!installment) {
      Alert.alert('Error', 'Please enter installment amount');
      return;
    }

    // Validate loan repayment amount if it's provided
    if (selectedLoan && loanRepayment) {
      const repaymentAmount = parseFloat(loanRepayment);
      if (isNaN(repaymentAmount)) {
        Alert.alert('Error', 'Invalid loan repayment amount');
        return;
      }
    }

    setLoading(true);
    try {
      const saveDate = date ? date : new Date().toISOString().slice(0, 10);
      
      // Create installment record using installmentsAPI
      await installmentsAPI.create({
        memberId: selectedMember._id,
        amount: parseFloat(installment),
        date: saveDate
      });

      // If member has active loan, update loan repayment
      if (selectedLoan && loanRepayment) {
        await loansAPI.addRepayment(selectedLoan._id, parseFloat(loanRepayment));
      }

      Alert.alert('Success', 'Update successful', [
        { 
          text: 'OK', 
          onPress: () => {
            setInstallment('');
            setInterest('');
            setLoanRepayment('');
            setDate('');
            setSelectedMember(null);
            // Navigate back to dashboard to refresh data
            navigation.navigate('AdminDashboard');
          }
        }
      ]);
    } catch (error) {
      Alert.alert('Error', error.response?.data?.message || 'Failed to update');
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
        <Text style={styles.title}>Update Member</Text>
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
      {/* Installment input */}
      <Text style={styles.label}>Installment</Text>
      <TextInput
        style={styles.input}
        placeholder="Enter installment amount"
        value={installment}
        onChangeText={setInstallment}
        keyboardType="numeric"
      />
      {/* If member has active loan(s), show loan picker and interest/repayment inputs */}
      {activeLoans.length > 0 && (
        <>
          <Text style={styles.label}>Select Loan</Text>
          <TouchableOpacity style={styles.selectBox} onPress={() => setShowLoanModal(true)}>
            <Text style={styles.selectText}>
              {selectedLoan ? `₹${selectedLoan.amount} (Outstanding: ₹${selectedLoan.outstanding})` : 'Select Loan'}
            </Text>
            <Icon name="chevron-down" size={24} color="#007AFF" />
          </TouchableOpacity>

          <Modal
            visible={showLoanModal}
            animationType="slide"
            transparent={true}
            onRequestClose={() => setShowLoanModal(false)}
          >
            <View style={styles.modalOverlay}>
              <View style={styles.modalContent}>
                <Text style={styles.modalTitle}>Select Loan</Text>
                <FlatList
                  data={activeLoans}
                  keyExtractor={item => item._id}
                  renderItem={({ item }) => (
                    <TouchableOpacity
                      style={styles.memberItem}
                      onPress={() => {
                        setSelectedLoan(item);
                        setShowLoanModal(false);
                      }}
                    >
                      <Text style={styles.memberName}>₹{item.amount}</Text>
                      <Text style={styles.memberId}>Outstanding: ₹{item.outstanding}</Text>
                    </TouchableOpacity>
                  )}
                  contentContainerStyle={{ paddingBottom: 20 }}
                />
                <TouchableOpacity style={styles.closeModalBtn} onPress={() => setShowLoanModal(false)}>
                  <Text style={styles.closeModalText}>Close</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Modal>

          {selectedLoan && (
            <View style={styles.loanDetails}>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Outstanding Amount:</Text>
                <Text style={styles.detailValue}>₹{selectedLoan.outstanding}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Interest (1%):</Text>
                <Text style={styles.detailValue}>₹{(selectedLoan.outstanding * 0.01).toFixed(2)}</Text>
              </View>
            </View>
          )}

          <Text style={styles.label}>Loan Repayment</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter loan repayment amount"
            value={loanRepayment}
            onChangeText={(text) => {
              setLoanRepayment(text);
              // Calculate interest as 1% of outstanding amount
              const repaymentAmount = parseFloat(text) || 0;
              setInterest((selectedLoan.outstanding * 0.01).toString());
            }}
            keyboardType="numeric"
          />

          <Text style={styles.label}>Interest</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter interest amount"
            value={interest}
            onChangeText={setInterest}
            keyboardType="numeric"
            editable={false} // Make it read-only since it's auto-calculated
          />
        </>
      )}
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
      <TouchableOpacity 
        style={styles.updateButton} 
        onPress={handleUpdate}
        disabled={loading}
      >
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.updateButtonText}>Update</Text>}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5', marginTop: 30 },
  header: { flexDirection: 'row', alignItems: 'center', padding: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#E5E5E5' },
  title: { fontSize: 20, fontWeight: 'bold', color: '#007AFF', marginLeft: 16 },
  selectBox: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: '#fff', 
    borderRadius: 8, 
    margin: 16, 
    borderWidth: 1, 
    borderColor: '#E5E5E5', 
    justifyContent: 'space-between',
    padding: 16,
    minHeight: 50
  },
  selectText: { 
    fontSize: 16, 
    color: '#333',
    flex: 1,
    marginRight: 8
  },
  label: { fontSize: 16, color: '#333', marginLeft: 16, marginTop: 16 },
  input: { backgroundColor: '#fff', borderRadius: 8, padding: 16, margin: 16, borderWidth: 1, borderColor: '#E5E5E5', fontSize: 16 },
  updateButton: { backgroundColor: '#007AFF', padding: 16, borderRadius: 10, alignItems: 'center', margin: 16 },
  updateButtonText: { color: 'white', fontSize: 16, fontWeight: 'bold' },
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
    width: '90%',
    maxHeight: '80%',
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
    padding: 16,
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
  loanDetails: {
    backgroundColor: '#f8f8f8',
    padding: 15,
    borderRadius: 8,
    marginVertical: 10,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  detailLabel: {
    fontSize: 16,
    color: '#666',
  },
  detailValue: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
}); 