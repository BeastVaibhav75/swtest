import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Modal, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useAuth } from '../../context/AuthContext';
import { membersAPI } from '../../services/api';

export default function ManageMembers({ navigation }) {
  const { user } = useAuth();
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showMembers, setShowMembers] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [selectedMember, setSelectedMember] = useState(null);
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editPassword, setEditPassword] = useState('');
  const [editLoading, setEditLoading] = useState(false);
  const [adminPassword, setAdminPassword] = useState('');
  const [showPasswordModal, setShowPasswordModal] = useState(false);

  const fetchMembers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await membersAPI.getAll();
      setMembers(res.data);
      setShowMembers(true);
    } catch (e) {
      setMembers([]);
      Alert.alert('Error', 'Failed to fetch members');
    } finally {
      setLoading(false);
    }
  }, []);

  const handlePauseMember = async (memberId) => {
    Alert.alert(
      'Pause Member',
      'Are you sure you want to pause this member? This will block their share from the funds but keep their record.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Pause', style: 'destructive', onPress: async () => {
            try {
              setLoading(true);
              await membersAPI.pause(memberId);
              fetchMembers();
              Alert.alert('Success', 'Member paused successfully');
            } catch (e) {
              Alert.alert('Error', 'Failed to pause member');
            } finally {
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  const handleUnpauseMember = async (memberId) => {
    Alert.alert(
      'Unpause Member',
      'Are you sure you want to unpause this member? This will restore their share in the funds.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Unpause', style: 'default', onPress: async () => {
            try {
              setLoading(true);
              await membersAPI.unpause(memberId);
              fetchMembers();
              Alert.alert('Success', 'Member unpaused successfully');
            } catch (e) {
              Alert.alert('Error', 'Failed to unpause member');
            } finally {
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  const handleEditMember = (member) => {
    setSelectedMember(member);
    setEditName(member.name);
    setEditPhone(member.phone);
    setEditPassword('');
    setShowEditForm(true);
  };

  const handleUpdateMember = async () => {
    if (!selectedMember) return;

    const updateData = {};
    if (editName !== selectedMember.name) updateData.name = editName;
    if (editPhone !== selectedMember.phone) updateData.phone = editPhone;
    if (editPassword) updateData.password = editPassword;

    if (Object.keys(updateData).length === 0) {
      Alert.alert('Info', 'No changes to update');
      return;
    }

    // Show password verification modal
    setShowPasswordModal(true);
  };

  const verifyAndUpdate = async () => {
    if (!adminPassword) {
      Alert.alert('Error', 'Please enter admin password');
      return;
    }

    setEditLoading(true);
    try {
      const updateData = {};
      if (editName !== selectedMember.name) updateData.name = editName;
      if (editPhone !== selectedMember.phone) updateData.phone = editPhone;
      if (editPassword) updateData.password = editPassword;

      // Add admin password to the update request
      updateData.adminPassword = adminPassword;

      await membersAPI.update(selectedMember._id, updateData);
      Alert.alert('Success', 'Member updated successfully');
      setShowEditForm(false);
      setShowPasswordModal(false);
      setAdminPassword('');
      fetchMembers();
    } catch (error) {
      Alert.alert('Error', error.response?.data?.message || 'Failed to update member');
    } finally {
      setEditLoading(false);
    }
  };

  const renderMember = ({ item }) => (
    <View style={styles.memberRow}>
      <View style={styles.memberInfo}>
        <Text style={styles.memberName}>{item.name}</Text>
        <Text style={styles.memberId}>ID: {item.memberId}</Text>
        {item.paused && <Text style={styles.pausedText}>Paused</Text>}
      </View>
      <View style={styles.memberActions}>
        <TouchableOpacity
          style={styles.editButton}
          onPress={() => handleEditMember(item)}
        >
          <Icon name="pencil" size={20} color="#007AFF" />
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.pauseButton,
            item.paused ? styles.unpauseButton : styles.pauseButton
          ]}
          onPress={() => item.paused ? handleUnpauseMember(item._id) : handlePauseMember(item._id)}
        >
          <Text style={styles.pauseButtonText}>
            {item.paused ? 'Unpause' : 'Pause'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Manage Members</Text>
      
      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={styles.button}
          onPress={() => navigation.navigate('AddMember')}
        >
          <Text style={styles.buttonText}>Add Member</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.viewButton]}
          onPress={fetchMembers}
          disabled={loading}
        >
          <Text style={styles.buttonText}>
            {loading ? 'Loading...' : 'View Members'}
          </Text>
        </TouchableOpacity>
      </View>

      {showMembers && (
        <>
          <Text style={styles.subtitle}>Pause a member to block their share from the funds:</Text>
          <FlatList
            data={members}
            keyExtractor={item => item._id}
            renderItem={renderMember}
            refreshing={loading}
            onRefresh={fetchMembers}
          />
        </>
      )}

      <Modal
        visible={showEditForm}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowEditForm(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Edit Member</Text>
            
            <Text style={styles.label}>Name</Text>
            <TextInput
              style={styles.input}
              value={editName}
              onChangeText={setEditName}
              placeholder="Enter name"
            />

            <Text style={styles.label}>Phone Number</Text>
            <TextInput
              style={styles.input}
              value={editPhone}
              onChangeText={setEditPhone}
              placeholder="Enter phone number"
              keyboardType="phone-pad"
            />

            <Text style={styles.label}>New Password (leave blank to keep current)</Text>
            <TextInput
              style={styles.input}
              value={editPassword}
              onChangeText={setEditPassword}
              placeholder="Enter new password"
              secureTextEntry
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => {
                  setShowEditForm(false);
                  setAdminPassword('');
                }}
                disabled={editLoading}
              >
                <Text style={styles.modalButtonText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalButton, styles.updateButton]}
                onPress={handleUpdateMember}
                disabled={editLoading}
              >
                {editLoading ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.modalButtonText}>Update</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={showPasswordModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowPasswordModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Admin Verification</Text>
            <Text style={styles.modalSubtitle}>Please enter your admin password to confirm changes</Text>
            
            <TextInput
              style={styles.input}
              value={adminPassword}
              onChangeText={setAdminPassword}
              placeholder="Enter admin password"
              secureTextEntry
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => {
                  setShowPasswordModal(false);
                  setAdminPassword('');
                }}
                disabled={editLoading}
              >
                <Text style={styles.modalButtonText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalButton, styles.updateButton]}
                onPress={verifyAndUpdate}
                disabled={editLoading}
              >
                {editLoading ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.modalButtonText}>Verify & Update</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5', padding: 24, marginTop: 30 },
  title: { fontSize: 22, fontWeight: 'bold', marginBottom: 24, color: '#333' },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  button: {
    backgroundColor: '#007AFF',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    flex: 1,
    marginHorizontal: 8,
  },
  viewButton: {
    backgroundColor: '#34C759',
  },
  buttonText: { color: 'white', fontSize: 16, fontWeight: 'bold' },
  subtitle: { fontSize: 16, color: '#666', marginBottom: 16 },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 8,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  memberInfo: {
    flex: 1,
  },
  memberName: { fontSize: 16, color: '#333', fontWeight: 'bold' },
  memberId: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  pausedText: {
    fontSize: 14,
    color: '#FF3B30',
    marginTop: 4,
    fontWeight: 'bold',
  },
  memberActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  editButton: {
    padding: 8,
    marginRight: 8,
  },
  pauseButton: {
    backgroundColor: '#FF3B30',
    paddingVertical: 8,
    paddingHorizontal: 18,
    borderRadius: 8,
  },
  unpauseButton: {
    backgroundColor: '#34C759',
  },
  pauseButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 15,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 24,
    width: '90%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#333',
  },
  label: {
    fontSize: 16,
    color: '#666',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    fontSize: 16,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 8,
  },
  modalButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    marginLeft: 12,
  },
  cancelButton: {
    backgroundColor: '#E5E5EA',
  },
  updateButton: {
    backgroundColor: '#007AFF',
  },
  modalButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 20,
    textAlign: 'center',
  },
}); 