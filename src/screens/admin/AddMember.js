import React, { useState } from 'react';
import { Alert, Modal, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { membersAPI } from '../../services/api';

export default function AddMember({ navigation }) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [investmentBalance, setInvestmentBalance] = useState('');
  const [loading, setLoading] = useState(false);
  const [credentials, setCredentials] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);

  const handleAdd = async () => {
    if (!name || !phone) {
      Alert.alert('Error', 'Please enter all fields');
      return;
    }
    setLoading(true);
    try {
      const res = await membersAPI.create({ name, phone, investmentBalance: parseFloat(investmentBalance) || 0 });
      setCredentials(res.data);
      setModalVisible(true);
      setName('');
      setPhone('');
      setInvestmentBalance('');
    } catch (e) {
      Alert.alert('Error', 'Failed to add member');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Add Member</Text>
      <TextInput
        style={[styles.input, { color: 'black' }]}
        placeholder="Name"
        placeholderTextColor="black"
        value={name}
        onChangeText={setName}
      />
      <TextInput
        style={[styles.input, { color: 'black' }]}
        placeholder="Phone"
        placeholderTextColor="black"
        value={phone}
        onChangeText={setPhone}
        keyboardType="phone-pad"
      />
      <TextInput
        style={[styles.input, { color: 'black' }]}
        placeholder="Initial Balance (Optional)"
        placeholderTextColor="black"
        value={investmentBalance}
        onChangeText={setInvestmentBalance}
        keyboardType="numeric"
      />
      <TouchableOpacity style={styles.button} onPress={handleAdd} disabled={loading}>
        <Text style={styles.buttonText}>{loading ? 'Adding...' : 'Add'}</Text>
      </TouchableOpacity>

      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Member Added Successfully</Text>
            <Text style={styles.modalText}>Member ID: {credentials?.memberId}</Text>
            <Text style={styles.modalText}>Password: {credentials?.password}</Text>
            <Text style={styles.modalNote}>
              Please save these credentials securely. They will be needed for the member to log in.
            </Text>
            <TouchableOpacity
              style={styles.button}
              onPress={() => {
                setModalVisible(false);
                navigation.goBack();
              }}
            >
              <Text style={styles.buttonText}>OK</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5', padding: 24, marginTop: 30 },
  title: { fontSize: 22, fontWeight: 'bold', marginBottom: 24, color: '#333' },
  input: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E5E5E5',
    fontSize: 16,
  },
  button: {
    backgroundColor: '#007AFF',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonText: { color: 'white', fontSize: 16, fontWeight: 'bold' },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContent: {
    backgroundColor: 'white',
    padding: 24,
    borderRadius: 10,
    alignItems: 'center',
    width: '80%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#333',
    textAlign: 'center',
  },
  modalText: {
    fontSize: 16,
    marginBottom: 10,
    color: '#333',
  },
  modalNote: {
    fontSize: 14,
    color: '#666',
    marginTop: 10,
    marginBottom: 20,
    fontStyle: 'italic',
    textAlign: 'center',
  },
}); 