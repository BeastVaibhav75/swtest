import DateTimePicker from '@react-native-community/datetimepicker';
import React, { useState } from 'react';
import { Alert, FlatList, Modal, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useAuth } from '../../context/AuthContext';
import { expensesAPI, loansAPI } from '../../services/api';

export default function ActivitiesScreen({ route }) {
  const allActivities = route.params?.activities || [];
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showPicker, setShowPicker] = useState(false);
  const [activitiesState, setActivitiesState] = useState(allActivities);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editActivity, setEditActivity] = useState(null);
  const [editAmount, setEditAmount] = useState('');
  const [saving, setSaving] = useState(false);
  const { user } = useAuth();

  // Format date to yyyy-mm-dd
  const formatDate = (date) => date.toISOString().slice(0, 10);
  const selectedDateStr = formatDate(selectedDate);

  // Filter activities for the selected date
  const activities = activitiesState.filter(a => {
    if (!a.date) return false;
    const activityDate = new Date(a.date);
    const selectedDateObj = new Date(selectedDate);
    return activityDate.toDateString() === selectedDateObj.toDateString();
  });

  const handleEdit = (activity) => {
    setEditActivity(activity);
    setEditAmount(activity.details.amount.toString());
    setEditModalVisible(true);
  };

  const handleSave = async () => {
    if (!editAmount || isNaN(parseFloat(editAmount))) {
      Alert.alert('Error', 'Please enter a valid amount');
      return;
    }

    try {
      setSaving(true);
      const amount = parseFloat(editAmount);

      if (editActivity.type === 'Expense Added') {
        await expensesAPI.update(editActivity.details._id, { amount });
      } else if (editActivity.type === 'Repayment') {
        await loansAPI.updateRepayment(editActivity.details.loan._id, editActivity.details._id, { amount });
      }

      // Update local state
      const updatedActivities = activitiesState.map(a => {
        if (a === editActivity) {
          return {
            ...a,
            details: { ...a.details, amount }
          };
        }
        return a;
      });
      setActivitiesState(updatedActivities);
      setEditModalVisible(false);
      Alert.alert('Success', 'Activity updated successfully');
    } catch (error) {
      console.error('Update error:', error);
      Alert.alert('Error', 'Failed to update activity');
    } finally {
      setSaving(false);
    }
  };

  const renderItem = ({ item }) => {
    let member = '';
    let amount = '';
    if (item.type === 'Loan Approved' && item.details.memberId) {
      member = item.details.memberId.name || item.details.memberId.memberId || '';
      amount = `₹${item.details.amount}`;
    } else if (item.type === 'Repayment' && item.details.loan && item.details.loan.memberId) {
      member = item.details.loan.memberId.name || item.details.loan.memberId.memberId || '';
      amount = `₹${item.details.amount}`;
    } else if (item.type === 'Expense Added') {
      member = item.details.recordedBy?.name || '';
      amount = `₹${item.details.amount}`;
    } else if (item.type === 'Installment Added' && item.details.memberId) {
      member = item.details.memberId.name || item.details.memberId.memberId || '';
      amount = `₹${item.details.amount}`;
    }

    const canEdit = item.type === 'Expense Added' || item.type === 'Repayment';

    return (
      <View style={styles.item}>
        <View style={styles.itemRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.type}>{item.type}</Text>
            <Text style={styles.date}>{new Date(item.date).toLocaleString()}</Text>
            {member ? <Text style={styles.detail}>Member: {member}</Text> : null}
            {amount ? <Text style={styles.detail}>Amount: {amount}</Text> : null}
          </View>
          {canEdit && (
            <TouchableOpacity onPress={() => handleEdit(item)} style={styles.editButton}>
              <Icon name="pencil" size={20} color="#007AFF" />
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  const onChange = (event, date) => {
    setShowPicker(false);
    if (date) setSelectedDate(date);
  };

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.header}>Activities</Text>
        <TouchableOpacity onPress={() => setShowPicker(true)}>
          <Icon name="calendar" size={28} color="#007AFF" />
        </TouchableOpacity>
      </View>
      <Text style={styles.selectedDate}>Showing for: {selectedDate.toLocaleDateString()}</Text>
      {showPicker && (
        <DateTimePicker
          value={selectedDate}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={onChange}
        />
      )}
      <FlatList
        data={activities}
        keyExtractor={(_, idx) => idx.toString()}
        renderItem={renderItem}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.empty}>No activities for {selectedDate.toLocaleDateString()}</Text>
          </View>
        }
      />

      {/* Edit Modal */}
      <Modal
        visible={editModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setEditModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit {editActivity?.type}</Text>
              <TouchableOpacity onPress={() => setEditModalVisible(false)}>
                <Icon name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Amount (₹)</Text>
              <TextInput
                style={styles.input}
                value={editAmount}
                onChangeText={setEditAmount}
                placeholder="Enter amount"
                keyboardType="numeric"
                editable={!saving}
              />
            </View>

            <TouchableOpacity
              style={[styles.modalButton, saving && styles.disabledButton]}
              onPress={handleSave}
              disabled={saving}
            >
              {saving ? (
                <Text style={styles.modalButtonText}>Saving...</Text>
              ) : (
                <Text style={styles.modalButtonText}>Save Changes</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', padding: 16, marginTop: 30 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  header: { fontSize: 20, fontWeight: 'bold' },
  selectedDate: { fontSize: 15, color: '#007AFF', marginBottom: 8 },
  item: { marginBottom: 16, padding: 12, backgroundColor: '#f5f5f5', borderRadius: 8 },
  itemRow: { flexDirection: 'row', alignItems: 'center' },
  type: { fontSize: 16, fontWeight: 'bold' },
  date: { fontSize: 14, color: '#666' },
  detail: { fontSize: 15, color: '#333', marginTop: 2 },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    marginTop: 20,
  },
  empty: {
    textAlign: 'center',
    color: '#666',
    fontSize: 16,
  },
  editButton: {
    padding: 8,
    marginLeft: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 20,
    width: '90%',
    maxWidth: 400,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  inputContainer: {
    marginBottom: 15,
  },
  inputLabel: {
    fontSize: 16,
    color: '#666',
    marginBottom: 5,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 10,
    fontSize: 16,
  },
  modalButton: {
    backgroundColor: '#007AFF',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  disabledButton: {
    opacity: 0.7,
  },
  modalButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '500',
  },
}); 