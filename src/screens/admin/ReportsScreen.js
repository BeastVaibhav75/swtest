import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { Checkbox } from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { installmentsAPI, loansAPI, membersAPI } from '../../services/api';

const reportItems = [
  {
    id: '1',
    title: 'Interest Report',
    description: 'View interest earned',
    icon: 'cash-multiple',
    color: '#34C759',
  },
  {
    id: '2',
    title: 'Loan Status Report',
    description: 'View active loans and outstanding amounts',
    icon: 'handshake',
    color: '#007AFF',
  },
  {
    id: '3',
    title: 'Member Activity Report',
    description: 'View member activity and engagement',
    icon: 'account-group',
    color: '#FF9500',
  },
  {
    id: '4',
    title: 'Installment Collection Report',
    description: 'View installment collection status',
    icon: 'cash-check',
    color: '#5856D6',
  },
];

export default function ReportsScreen({ navigation }) {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalMembers: 0,
    activeLoans: 0,
    pendingInstallments: 0,
  });
  const [members, setMembers] = useState([]);
  const [selectedMember, setSelectedMember] = useState(null);
  const [selectedMembers, setSelectedMembers] = useState([]);
  const [viewType, setViewType] = useState(null); // null, 'overall', 'individual', 'collective'
  const [showMemberModal, setShowMemberModal] = useState(false);
  const [selectedReport, setSelectedReport] = useState(null);

  useEffect(() => {
    fetchReportData();
  }, []);

  const fetchReportData = async () => {
    try {
      setLoading(true);
      const [membersRes, loansRes, installmentsRes] = await Promise.all([
        membersAPI.getAll(),
        loansAPI.getAll(),
        installmentsAPI.getAll(),
      ]);

      setMembers(membersRes.data);

      // Calculate active loans
      const activeLoans = loansRes.data.filter(loan => loan.status === 'active');

      // Calculate pending installments (installments due this month)
      const today = new Date();
      const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      const pendingInstallments = installmentsRes.data.filter(inst => 
        new Date(inst.date) >= firstDayOfMonth && new Date(inst.date) <= today
      ).length;

      setStats({
        totalMembers: membersRes.data.length,
        activeLoans: activeLoans.length,
        pendingInstallments,
      });
    } catch (error) {
      console.error('Error fetching report data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleViewTypeSelect = (type) => {
    setViewType(type);
    if (type === 'individual' || type === 'collective') {
      setShowMemberModal(true);
    }
  };

  const handleReportPress = (reportId) => {
    setSelectedReport(reportId);
    navigation.navigate('ReportDetail', {
      reportType: reportId,
      viewType,
      selectedMemberId: viewType === 'individual' ? selectedMember?._id : null,
      selectedMemberIds: viewType === 'collective' ? selectedMembers : []
    });
  };

  const handleMemberSelection = () => {
    if (viewType === 'individual' && !selectedMember) {
      // Show error or alert
      return;
    }
    if (viewType === 'collective' && selectedMembers.length === 0) {
      // Show error or alert
      return;
    }
    setShowMemberModal(false);
    // Just close the modal and stay on the reports page
  };

  const handleMemberSelect = (member) => {
    if (viewType === 'individual') {
      setSelectedMember(member);
    } else if (viewType === 'collective') {
      setSelectedMembers(prev => {
        if (prev.includes(member._id)) {
          return prev.filter(id => id !== member._id);
        } else {
          return [...prev, member._id];
        }
      });
    }
  };

  const renderViewTypeSelector = () => (
    <View style={styles.viewTypeContainer}>
      <Text style={styles.sectionTitle}>Select View Type</Text>
      <View style={styles.viewTypeButtons}>
        <TouchableOpacity
          style={[styles.viewTypeButton, viewType === 'overall' && styles.viewTypeButtonActive]}
          onPress={() => handleViewTypeSelect('overall')}
        >
          <Text style={[styles.viewTypeButtonText, viewType === 'overall' && styles.viewTypeButtonTextActive]}>
            Overall
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.viewTypeButton, viewType === 'individual' && styles.viewTypeButtonActive]}
          onPress={() => handleViewTypeSelect('individual')}
        >
          <Text style={[styles.viewTypeButtonText, viewType === 'individual' && styles.viewTypeButtonTextActive]}>
            Individual
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.viewTypeButton, viewType === 'collective' && styles.viewTypeButtonActive]}
          onPress={() => handleViewTypeSelect('collective')}
        >
          <Text style={[styles.viewTypeButtonText, viewType === 'collective' && styles.viewTypeButtonTextActive]}>
            Collective
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderMemberSelectionModal = () => (
    <Modal
      visible={showMemberModal}
      animationType="slide"
      transparent={true}
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>
            {viewType === 'individual' ? 'Select Member' : 'Select Members'}
          </Text>
          <ScrollView style={styles.memberList}>
            {members.map(member => (
              <TouchableOpacity
                key={member._id}
                style={styles.memberItem}
                onPress={() => handleMemberSelect(member)}
              >
                <Checkbox
                  status={
                    viewType === 'individual'
                      ? selectedMember?._id === member._id ? 'checked' : 'unchecked'
                      : selectedMembers.includes(member._id) ? 'checked' : 'unchecked'
                  }
                  onPress={() => handleMemberSelect(member)}
                />
                <Text style={styles.memberName}>{member.name}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
          <View style={styles.modalButtons}>
            <TouchableOpacity
              style={[styles.modalButton, styles.cancelButton]}
              onPress={() => {
                setShowMemberModal(false);
                if (!selectedReport) {
                  setViewType(null);
                }
              }}
            >
              <Text style={styles.modalButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modalButton, styles.confirmButton]}
              onPress={handleMemberSelection}
            >
              <Text style={[styles.modalButtonText, styles.confirmButtonText]}>Confirm</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  const renderReportItem = (item) => (
    <TouchableOpacity
      key={item.id}
      style={styles.reportItem}
      onPress={() => handleReportPress(item.id)}
    >
      <View style={[styles.iconContainer, { backgroundColor: item.color }]}>
        <Icon name={item.icon} size={24} color="#FFFFFF" />
      </View>
      <View style={styles.reportContent}>
        <Text style={styles.reportTitle}>{item.title}</Text>
        <Text style={styles.reportDescription}>{item.description}</Text>
      </View>
      <Icon name="chevron-right" size={24} color="#8E8E93" />
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading reports...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Reports</Text>
      </View>

      {!viewType ? (
        renderViewTypeSelector()
      ) : (
        <>
          {/* Quick Stats Section */}
          <View style={styles.statsSection}>
            <Text style={styles.sectionTitle}>Quick Stats</Text>
            <View style={styles.statsGrid}>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{stats.totalMembers}</Text>
                <Text style={styles.statLabel}>Total Members</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{stats.activeLoans}</Text>
                <Text style={styles.statLabel}>Active Loans</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{stats.pendingInstallments}</Text>
                <Text style={styles.statLabel}>Pending Installments</Text>
              </View>
            </View>
          </View>

          {/* Available Reports Section */}
          <View style={styles.reportsSection}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Available Reports</Text>
              <TouchableOpacity
                style={styles.changeViewButton}
                onPress={() => setViewType(null)}
              >
                <Text style={styles.changeViewButtonText}>Change View</Text>
              </TouchableOpacity>
            </View>
            {reportItems.map(renderReportItem)}
          </View>
        </>
      )}

      {renderMemberSelectionModal()}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F2F2F7',
    marginTop: 30,
  },
  loadingText: {
    marginTop: 10,
    color: '#666',
  },
  header: {
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000000',
  },
  statsSection: {
    backgroundColor: '#FFFFFF',
    margin: 8,
    padding: 16,
    borderRadius: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000000',
    marginBottom: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  statItem: {
    width: '48%',
    backgroundColor: '#F8F8F8',
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#007AFF',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 14,
    color: '#666666',
    textAlign: 'center',
  },
  reportsSection: {
    backgroundColor: '#FFFFFF',
    margin: 8,
    padding: 16,
    borderRadius: 8,
  },
  reportItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  reportContent: {
    flex: 1,
  },
  reportTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000000',
    marginBottom: 4,
  },
  reportDescription: {
    fontSize: 14,
    color: '#666666',
  },
  viewTypeContainer: {
    backgroundColor: '#FFFFFF',
    margin: 8,
    padding: 16,
    borderRadius: 8,
  },
  viewTypeButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  viewTypeButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#F2F2F7',
    marginHorizontal: 4,
    alignItems: 'center',
  },
  viewTypeButtonActive: {
    backgroundColor: '#007AFF',
  },
  viewTypeButtonText: {
    color: '#666666',
    fontWeight: '500',
  },
  viewTypeButtonTextActive: {
    color: '#FFFFFF',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    width: '90%',
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  memberList: {
    maxHeight: '70%',
  },
  memberItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  memberName: {
    fontSize: 16,
    marginLeft: 8,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  modalButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    marginHorizontal: 8,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#F2F2F7',
  },
  confirmButton: {
    backgroundColor: '#007AFF',
  },
  modalButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#666666',
  },
  confirmButtonText: {
    color: '#FFFFFF',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  changeViewButton: {
    padding: 8,
    backgroundColor: '#F2F2F7',
    borderRadius: 8,
  },
  changeViewButtonText: {
    color: '#007AFF',
    fontSize: 14,
    fontWeight: '500',
  },
}); 