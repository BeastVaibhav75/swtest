import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import { format } from 'date-fns';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, LayoutAnimation, Modal, RefreshControl, ScrollView, StyleSheet, Switch, Text, TextInput, TouchableOpacity, View } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useAuth } from '../../context/AuthContext';
import { useUpdateCheck } from '../../hooks/useUpdateCheck';
import { expensesAPI, fundAPI, installmentsAPI, loansAPI, membersAPI } from '../../services/api';

// For Android Emulator
// const API_URL = 'http://10.0.2.2:5000/api';
// For iOS Simulator
// const API_URL = 'http://localhost:5000/api';
// For physical device (replace with your computer's IP address)
const API_URL = 'https://swanidhi-backend.onrender.com/api';

export default function AdminDashboard() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [fund, setFund] = useState(0);
  const [loans, setLoans] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [shareValue, setShareValue] = useState(0);
  const [totalInterest, setTotalInterest] = useState(0);
  const [expanded, setExpanded] = useState(false);
  const [totalFund, setTotalFund] = useState(0);
  const [totalMembers, setTotalMembers] = useState(0);
  const [recentActivities, setRecentActivities] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [interestFromLoans, setInterestFromLoans] = useState(0);
  const [deductionFromLoans, setDeductionFromLoans] = useState(0);
  const [baseFund, setBaseFund] = useState(0);
  const [totalExpenses, setTotalExpenses] = useState(0);
  const [earningsDistribution, setEarningsDistribution] = useState(null);
  const [calculatedInterest, setCalculatedInterest] = useState(0);
  const [calculatedDeduction, setCalculatedDeduction] = useState(0);
  const [isExpenseModalVisible, setIsExpenseModalVisible] = useState(false);
  const [expenseAmount, setExpenseAmount] = useState('');
  const [expenseReason, setExpenseReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showCashInHand, setShowCashInHand] = useState(true);
  const [cashInHand, setCashInHand] = useState(0);
  const [totalLoans, setTotalLoans] = useState(0);
  const [todayActivitiesCount, setTodayActivitiesCount] = useState(0);
  const [diagnosticData, setDiagnosticData] = useState(null);
  const [showDiagnosticModal, setShowDiagnosticModal] = useState(false);
  const navigation = useNavigation();
  const route = useRoute();
  const { user, logout } = useAuth();
  const { updating } = useUpdateCheck();

  useEffect(() => {
    fetchDashboardData();
  }, []);

  // Use useFocusEffect to refresh data when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      if (route.params?.refresh) {
        fetchDashboardData();
        // Clear the refresh parameter
        navigation.setParams({ refresh: undefined });
      }
    }, [route.params?.refresh])
  );

  const fetchDashboardData = async () => {
    try {
      setIsLoading(true);
      const [fundRes, loansRes, expensesRes, membersRes, installmentsRes, earningsRes, totalInterestRes] = await Promise.all([
        fundAPI.getTotalFund(),
        loansAPI.getAll(),
        expensesAPI.getAll(),
        membersAPI.getAll(),
        installmentsAPI.getAll(),
        fundAPI.getTotalInterestThisMonth(),
        fundAPI.getTotalInterest()
      ]);

      // Use total interest everywhere except for 'This Month's Interest'
      const totalInterest = totalInterestRes.data?.totalInterest || 0;
      const totalMembers = membersRes.data.length || 1;
      setEarningsDistribution({
        totalAmount: totalInterest,
        perMemberAmount: totalInterest / totalMembers
      });

      // Calculate base fund from installments
      const totalInstallments = installmentsRes.data.reduce((sum, inst) => sum + (inst.amount || 0), 0);
      setBaseFund(totalInstallments);

      // Calculate total expenses
      const calculatedExpenses = expensesRes.data.reduce((sum, e) => sum + (e.amount || 0), 0);
      setTotalExpenses(calculatedExpenses);

      // Calculate deduction from loans
      const calculatedDeduction = loansRes.data.reduce((sum, loan) => {
        return sum + (loan.deduction || 0);
      }, 0);
      setDeductionFromLoans(calculatedDeduction);

      // Use total interest for all calculations except this month's interest
      setInterestFromLoans(totalInterest);
      setTotalInterest(totalInterest);

      // Total fund is base fund + total interest + deduction - expenses
      const totalFundAmount = totalInstallments + totalInterest + calculatedDeduction - calculatedExpenses;
      setTotalFund(totalFundAmount);
      setFund(totalFundAmount);

      setTotalMembers(totalMembers);

      // Get today's date string (YYYY-MM-DD)
      const todayStr = format(new Date(), 'yyyy-MM-dd');
      // Find all activities
      const allLoans = loansRes.data.map(loan => ({ type: 'Loan Approved', date: loan.date, details: loan }));
      const allRepayments = loansRes.data.flatMap(loan =>
        (loan.repayments || []).map(r => ({ type: 'Repayment', date: r.date, details: { ...r, loan } }))
      );
      const allExpenses = expensesRes.data.map(exp => ({ type: 'Expense Added', date: exp.date, details: exp }));
      const allInstallments = installmentsRes.data.map(inst => ({ 
        type: 'Installment Added', 
        date: typeof inst.date === 'string' ? inst.date : inst.date.toISOString(), 
        details: inst 
      }));

      // Combine and label activities
      const activities = [
        ...allLoans,
        ...allRepayments,
        ...allExpenses,
        ...allInstallments,
      ];
      // Sort by date/time descending
      activities.sort((a, b) => new Date(b.date) - new Date(a.date));
      setRecentActivities(activities);

      // Get today's activities count
      const todayActivities = activities.filter(a => a.date && a.date.slice(0, 10) === todayStr);
      setTodayActivitiesCount(todayActivities.length);

      // Calculate share value using the perMemberAmount from total interest
      const interestPerMember = totalInterest / totalMembers;
      const deductionPerMember = calculatedDeduction / totalMembers;
      const expensesPerMember = calculatedExpenses / totalMembers;
      const baseShareValue = totalInstallments / totalMembers;
      setShareValue(baseShareValue + interestPerMember + deductionPerMember - expensesPerMember);

      // Calculate total loans using outstanding amounts
      const totalLoans = loansRes.data.reduce((sum, l) => sum + (l.outstanding || 0), 0);
      setTotalLoans(totalLoans);
      const cashInHandValue = totalFundAmount - totalLoans;
      setCashInHand(cashInHandValue);

      // Set this month's interest for the 'This Month's Interest' section only
      setCalculatedInterest(earningsRes.data?.totalInterestThisMonth || 0);

    } catch (err) {
      // Check for 401 Unauthorized error specifically
      if (err.response && err.response.status === 401) {
        console.log('AdminDashboard: 401 Unauthorized, logging out.');
        logout();
        navigation.reset({
          index: 0,
          routes: [{ name: 'Login' }],
        });
      } else {
        setError('Failed to load dashboard data');
        console.error('Dashboard data error:', err);
      }
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    fetchDashboardData();
  }, []);

  const toggleExpand = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpanded((prev) => !prev);
  };

  const handleAddExpense = async () => {
    if (!expenseAmount || !expenseReason) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    const amount = parseFloat(expenseAmount);
    if (isNaN(amount) || amount <= 0) {
      Alert.alert('Error', 'Please enter a valid amount');
      return;
    }

    try {
      setIsSubmitting(true);
      await expensesAPI.create({
        amount,
        reason: expenseReason
      });

      // Clear form and close modal
      setExpenseAmount('');
      setExpenseReason('');
      setIsExpenseModalVisible(false);

      // Refresh dashboard data
      fetchDashboardData();

      Alert.alert('Success', 'Expense added successfully');
    } catch (error) {
      console.error('Add expense error:', error);
      Alert.alert('Error', 'Failed to add expense');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#0066cc" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {updating && (
        <View style={styles.updateOverlay}>
          <ActivityIndicator size="large" color="#FFFFFF" />
          <Text style={styles.updateText}>Updating...</Text>
        </View>
      )}
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
        {/* Dashboard Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Admin Dashboard</Text>
          <Text style={styles.headerSubtitle}>Welcome, {user?.name || 'Admin'}</Text>
        </View>

        {/* Cash in Hand / Total Fund Section with Toggle */}
        <View style={styles.section}>
          <View style={styles.row}>
            <Text style={styles.sectionTitle}>{showCashInHand ? 'Cash in Hand' : 'Total Fund'}</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Text style={{ marginRight: 8, color: '#666', fontSize: 14 }}>{showCashInHand ? 'Show Total Fund' : 'Show Cash in Hand'}</Text>
              <Switch
                value={!showCashInHand}
                onValueChange={() => setShowCashInHand((prev) => !prev)}
                thumbColor={showCashInHand ? '#007AFF' : '#34C759'}
                trackColor={{ false: '#ccc', true: '#007AFF' }}
              />
            </View>
          </View>
          <View style={styles.valueRow}>
            {isLoading ? (
              <ActivityIndicator size="small" color="#007AFF" />
            ) : (
              <Text style={styles.shareValueText}>₹{(showCashInHand ? cashInHand : totalFund).toFixed(2)}</Text>
            )}
          </View>
          <View style={styles.breakupContainer}>
            {showCashInHand ? (
              <>
                <View style={styles.breakupRow}>
                  <Text style={styles.breakupLabel}>Total Fund</Text>
                  <Text style={styles.breakupValue}>₹{totalFund.toFixed(2)}</Text>
                </View>
                <View style={styles.breakupRow}>
                  <Text style={styles.breakupLabel}>- Total Loans</Text>
                  <Text style={[styles.breakupValue, styles.negativeValue]}>- ₹{totalLoans.toFixed(2)}</Text>
                </View>
                <View style={styles.breakupRow}>
                  <Text style={styles.breakupLabel}>= Cash in Hand</Text>
                  <Text style={[styles.breakupValue, { color: '#007AFF', fontWeight: 'bold' }]}>₹{cashInHand.toFixed(2)}</Text>
                </View>
              </>
            ) : (
              <>
                <View style={styles.breakupRow}>
                  <Text style={styles.breakupLabel}>Base Fund (Installments)</Text>
                  <Text style={styles.breakupValue}>₹{baseFund.toFixed(2)}</Text>
                </View>
                <View style={styles.breakupRow}>
                  <Text style={styles.breakupLabel}>+ Interest (1% from repayments)</Text>
                  <Text style={[styles.breakupValue, styles.positiveValue]}>+ ₹{interestFromLoans.toFixed(2)}</Text>
                </View>
                <View style={styles.breakupRow}>
                  <Text style={styles.breakupLabel}>+ Deduction (2% from loans)</Text>
                  <Text style={[styles.breakupValue, styles.positiveValue]}>+ ₹{deductionFromLoans.toFixed(2)}</Text>
                </View>
                <View style={styles.breakupRow}>
                  <Text style={styles.breakupLabel}>- Expenses</Text>
                  <Text style={[styles.breakupValue, styles.negativeValue]}>- ₹{totalExpenses.toFixed(2)}</Text>
                </View>
                <View style={styles.breakupRow}>
                  <Text style={styles.breakupLabel}>= Total Fund</Text>
                  <Text style={[styles.breakupValue, { color: '#007AFF', fontWeight: 'bold' }]}>₹{totalFund.toFixed(2)}</Text>
                </View>
              </>
            )}
          </View>
        </View>

        {/* Value of Share Section */}
        <View style={styles.section}>
          <View style={styles.row}>
            <Text style={styles.sectionTitle}>Share Value</Text>
          </View>
          <View style={styles.valueRow}>
            {isLoading ? (
              <ActivityIndicator size="small" color="#007AFF" />
            ) : (
              <Text style={styles.shareValueText}>₹{shareValue.toFixed(2)}</Text>
            )}
          </View>
          <Text style={styles.valueLabel}>Per Member Share</Text>
          <View style={styles.breakupContainer}>
            <View style={styles.breakupRow}>
              <Text style={styles.breakupLabel}>Base Share</Text>
              <Text style={styles.breakupValue}>₹{(baseFund / totalMembers || 0).toFixed(2)}</Text>
            </View>
            <View style={styles.breakupRow}>
              <Text style={styles.breakupLabel}>+ Interest Share</Text>
              <Text style={[styles.breakupValue, styles.positiveValue]}>+ ₹{(interestFromLoans / totalMembers || 0).toFixed(2)}</Text>
            </View>
            <View style={styles.breakupRow}>
              <Text style={styles.breakupLabel}>+ Deduction Share</Text>
              <Text style={[styles.breakupValue, styles.positiveValue]}>+ ₹{(deductionFromLoans / totalMembers || 0).toFixed(2)}</Text>
            </View>
            <View style={styles.breakupRow}>
              <Text style={styles.breakupLabel}>- Shared Expense</Text>
              <Text style={[styles.breakupValue, styles.negativeValue]}>- ₹{(totalExpenses / totalMembers || 0).toFixed(2)}</Text>
            </View>
          </View>
        </View>

        {/* Total Interest Section */}
        <View style={styles.section}>
          <View style={styles.row}>
            <Text style={styles.sectionTitle}>Total Interest</Text>
          </View>
          <View style={styles.valueRow}>
            {isLoading ? (
              <ActivityIndicator size="small" color="#007AFF" />
            ) : (
              <Text style={styles.shareValueText}>₹{(totalInterest + deductionFromLoans).toFixed(2)}</Text>
            )}
          </View>
          <Text style={styles.valueLabel}>Total Interest</Text>
          <View style={styles.breakupRow}>
            <Text style={styles.breakupLabel}>1% Interest from Loans</Text>
            <Text style={styles.breakupValue}>₹{interestFromLoans.toFixed(2)}</Text>
          </View>
          <View style={styles.breakupRow}>
            <Text style={styles.breakupLabel}>2% Deduction from Loans</Text>
            <Text style={styles.breakupValue}>₹{deductionFromLoans.toFixed(2)}</Text>
          </View>
          <Text style={[styles.valueLabel, { marginTop: 10, fontSize: 12, color: '#666' }]}>
            Note: Both interest and deduction are added equally to all members' share values
          </Text>
        </View>

        {/* Recent Activities Section */}
        <View style={styles.section}>
          <View style={styles.row}>
            <Text style={styles.sectionTitle}>Recent Activities</Text>
            <TouchableOpacity onPress={() => navigation.navigate('Activities', { activities: recentActivities })} style={styles.arrowBtn}>
              <Icon name="chevron-right" size={28} color="#007AFF" />
            </TouchableOpacity>
          </View>
          <View style={styles.valueRow}>
            {isLoading ? (
              <ActivityIndicator size="small" color="#007AFF" />
            ) : (
              <Text style={styles.shareValueText}>{todayActivitiesCount} activities today</Text>
            )}
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionButtonsContainer}>
          <View style={styles.actionButtonsTopRow}>
            <TouchableOpacity style={styles.actionButton} onPress={() => navigation.navigate('UpdatePage')}>
              <Text style={styles.actionButtonText}>Update</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionButton} onPress={() => navigation.navigate('GiveLoanPage')}>
              <Text style={styles.actionButtonText}>Give Loan</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.actionButtonsBottomRow}>
            <TouchableOpacity style={[styles.actionButton, styles.bottomButton]} onPress={() => setIsExpenseModalVisible(true)}>
              <Text style={styles.actionButtonText}>Add Expense</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.actionButtonsBottomRowSpaced}>
            <TouchableOpacity 
              style={[styles.actionButton, styles.bottomButton, { backgroundColor: '#FF9500' }]} 
              onPress={async () => {
                try {
                  const response = await installmentsAPI.diagnostic();
                  setDiagnosticData(response.data);
                  setShowDiagnosticModal(true);
                } catch (error) {
                  Alert.alert('Error', 'Failed to get diagnostic data');
                }
              }}
            >
              <Text style={styles.actionButtonText}>Check Installments</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Expense Modal */}
        <Modal
          visible={isExpenseModalVisible}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setIsExpenseModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Add Expense</Text>
                <TouchableOpacity onPress={() => setIsExpenseModalVisible(false)}>
                  <Icon name="close" size={24} color="#333" />
                </TouchableOpacity>
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Amount (₹)</Text>
                <TextInput
                  style={styles.input}
                  value={expenseAmount}
                  onChangeText={setExpenseAmount}
                  placeholder="Enter amount"
                  keyboardType="numeric"
                  editable={!isSubmitting}
                />
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Reason</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={expenseReason}
                  onChangeText={setExpenseReason}
                  placeholder="Enter reason for expense"
                  multiline
                  numberOfLines={3}
                  editable={!isSubmitting}
                />
              </View>

              <Text style={styles.modalNote}>
                Note: This expense will be equally divided among all members
              </Text>

              <TouchableOpacity
                style={[styles.modalButton, isSubmitting && styles.disabledButton]}
                onPress={handleAddExpense}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <Text style={styles.modalButtonText}>Add Expense</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* Diagnostic Modal */}
        <Modal
          visible={showDiagnosticModal}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setShowDiagnosticModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { maxHeight: '80%' }]}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Installments Diagnostic</Text>
                <TouchableOpacity onPress={() => setShowDiagnosticModal(false)}>
                  <Icon name="close" size={24} color="#333" />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.diagnosticScrollView}>
                <View style={styles.diagnosticContainer}>
                  <Text style={styles.diagnosticSectionTitle}>Summary</Text>
                  <Text style={styles.diagnosticLabel}>Total Installments: {diagnosticData?.summary.totalInstallments}</Text>
                  <Text style={styles.diagnosticLabel}>Total Amount: ₹{diagnosticData?.summary.totalAmount.toFixed(2)}</Text>
                  <Text style={styles.diagnosticLabel}>Expected Amount: ₹{diagnosticData?.summary.expectedAmount.toFixed(2)}</Text>
                  <Text style={[styles.diagnosticLabel, { color: diagnosticData?.summary.difference !== 0 ? '#FF3B30' : '#34C759' }]}>
                    Difference: ₹{diagnosticData?.summary.difference.toFixed(2)}
                  </Text>
                  <Text style={styles.diagnosticLabel}>Total Members: {diagnosticData?.summary.totalMembers}</Text>
                  <Text style={styles.diagnosticLabel}>Expected Members: {diagnosticData?.summary.expectedMembers}</Text>
                  <Text style={styles.diagnosticLabel}>Standard Amount: ₹{diagnosticData?.summary.standardInstallmentAmount}</Text>
                </View>

                {diagnosticData?.membersWithoutInstallments.length > 0 && (
                  <View style={styles.diagnosticContainer}>
                    <Text style={styles.diagnosticSectionTitle}>Members Without Installments ({diagnosticData.membersWithoutInstallments.length})</Text>
                    {diagnosticData.membersWithoutInstallments.map((member, index) => (
                      <Text key={index} style={styles.diagnosticItem}>
                        • {member.name} ({member.memberId})
                      </Text>
                    ))}
                  </View>
                )}

                {diagnosticData?.membersWithOneInstallment.length > 0 && (
                  <View style={styles.diagnosticContainer}>
                    <Text style={styles.diagnosticSectionTitle}>Members With Only 1 Installment ({diagnosticData.membersWithOneInstallment.length})</Text>
                    {diagnosticData.membersWithOneInstallment.map((member, index) => (
                      <Text key={index} style={styles.diagnosticItem}>
                        • {member.name} ({member.memberId})
                      </Text>
                    ))}
                  </View>
                )}

                {diagnosticData?.nonStandardInstallments.length > 0 && (
                  <View style={styles.diagnosticContainer}>
                    <Text style={styles.diagnosticSectionTitle}>Non-Standard Installments ({diagnosticData.nonStandardInstallments.length})</Text>
                    {diagnosticData.nonStandardInstallments.map((inst, index) => (
                      <View key={index} style={styles.nonStandardItem}>
                        <Text style={styles.diagnosticItem}>
                          • {inst.memberName} ({inst.memberId})
                        </Text>
                        <Text style={[styles.diagnosticItem, { color: '#FF3B30' }]}>
                          Amount: ₹{inst.amount} (Expected: ₹{diagnosticData.summary.standardInstallmentAmount})
                        </Text>
                        <Text style={styles.diagnosticItem}>
                          Date: {new Date(inst.date).toLocaleDateString()}
                        </Text>
                      </View>
                    ))}
                  </View>
                )}

                {diagnosticData?.summary.difference === 0 && 
                 diagnosticData?.membersWithoutInstallments.length === 0 && 
                 diagnosticData?.membersWithOneInstallment.length === 0 && 
                 diagnosticData?.nonStandardInstallments.length === 0 && (
                  <View style={styles.diagnosticContainer}>
                    <Text style={[styles.diagnosticSectionTitle, { color: '#34C759' }]}>✅ All Installments Are Correct!</Text>
                    <Text style={styles.diagnosticLabel}>No discrepancies found in the installments data.</Text>
                  </View>
                )}
              </ScrollView>

              <TouchableOpacity
                style={styles.modalButton}
                onPress={() => setShowDiagnosticModal(false)}
              >
                <Text style={styles.modalButtonText}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </ScrollView>
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
  section: {
    backgroundColor: 'white',
    margin: 10,
    padding: 15,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  arrowBtn: {
    padding: 5,
  },
  breakupContainer: {
    backgroundColor: '#f8f8f8',
    padding: 15,
    borderRadius: 8,
    marginTop: 10,
  },
  breakupRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  breakupLabel: {
    fontSize: 14,
    color: '#666',
  },
  breakupValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
  positiveValue: {
    color: '#34C759',
  },
  negativeValue: {
    color: '#FF3B30',
  },
  detailsContainer: {
    marginTop: 15,
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  detailsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  detailItem: {
    backgroundColor: '#f8f8f8',
    padding: 10,
    borderRadius: 5,
    marginBottom: 5,
  },
  detailText: {
    fontSize: 14,
    color: '#666',
  },
  noData: {
    fontSize: 14,
    color: '#999',
    fontStyle: 'italic',
  },
  valueRow: {
    alignItems: 'center',
    marginVertical: 10,
  },
  shareValueText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  valueLabel: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  actionButtonsContainer: {
    padding: 20,
    backgroundColor: 'white',
    marginTop: 10,
    marginHorizontal: 10,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  actionButtonsTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 12,
  },
  actionButtonsBottomRow: {
    alignItems: 'center',
  },
  actionButtonsBottomRowSpaced: {
    alignItems: 'center',
    marginTop: 12,
  },
  actionButton: {
    flex: 1,
    backgroundColor: '#007AFF',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    minWidth: 100,
  },
  bottomButton: {
    width: '50%',
    minWidth: 150,
  },
  actionButtonText: {
    color: 'white',
    fontSize: 15,
    fontWeight: '600',
  },
  header: {
    backgroundColor: '#007AFF',
    padding: 20,
    paddingTop: 40,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    marginBottom: 10,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 5,
  },
  headerSubtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
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
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  modalNote: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
    marginBottom: 20,
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
  updateOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  updateText: {
    color: '#FFFFFF',
    marginTop: 10,
    fontSize: 16,
  },
  diagnosticContainer: {
    marginBottom: 20,
  },
  diagnosticLabel: {
    fontSize: 16,
    color: '#333',
    marginBottom: 5,
  },
  diagnosticSectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  diagnosticItem: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  },
  nonStandardItem: {
    backgroundColor: '#f8f8f8',
    padding: 10,
    borderRadius: 5,
    marginBottom: 8,
  },
  diagnosticScrollView: {
    maxHeight: '80%',
  },
}); 