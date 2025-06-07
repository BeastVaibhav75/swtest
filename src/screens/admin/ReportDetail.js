import DateTimePicker from '@react-native-community/datetimepicker';
import { Picker } from '@react-native-picker/picker';
import * as FileSystem from 'expo-file-system';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { fundAPI, installmentsAPI, loansAPI, membersAPI } from '../../services/api';

export default function ReportDetail({ route, navigation }) {
  const { reportType, viewType, selectedMemberId, selectedMemberIds } = route.params;
  const [loading, setLoading] = useState(true);
  const [reportData, setReportData] = useState(null);
  const [error, setError] = useState(null);
  const [members, setMembers] = useState([]);
  const [selectedLoan, setSelectedLoan] = useState(null);
  const [allLoans, setAllLoans] = useState([]);
  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(new Date());
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchReportDetail();
  }, [reportType, viewType, selectedMemberId, selectedMemberIds, startDate, endDate]);

  const fetchReportDetail = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch members data for individual and collective views
      if (viewType !== 'overall') {
        const membersRes = await membersAPI.getAll();
        setMembers(membersRes.data);
      }

      // Helper function to check if a date is within the selected range
      const isDateInRange = (date) => {
        const itemDate = new Date(date);
        // Set time to midnight for comparison to include the entire day
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);

        return itemDate >= start && itemDate <= end;
      };

      // Construct date query parameters
      const dateQueryParams = {};
      if (startDate) {
        dateQueryParams.startDate = startDate.toISOString();
      }
      if (endDate) {
        dateQueryParams.endDate = endDate.toISOString();
      }

      switch (reportType) {
        case '1': // Monthly Interest Report
          // Use the new API endpoint for date range
          const [interestRes, membersRes] = await Promise.all([
            fundAPI.getTotalInterestByRange(startDate.toISOString(), endDate.toISOString()),
            membersAPI.getAll(),
          ]);
          const totalInterest = interestRes.data?.totalInterest || 0; // Get totalInterest from the new API response
          
          if (viewType === 'overall') {
            const perMemberInterest = totalInterest / (membersRes.data.length || 1);
            setReportData({
              title: 'Monthly Interest Report',
              totalAmount: totalInterest,
              perMemberAmount: perMemberInterest,
              totalMembers: membersRes.data.length,
              date: new Date().toISOString(),
              startDate: startDate.toISOString(),
              endDate: endDate.toISOString(),
            });
          } else if (viewType === 'individual') {
            const member = membersRes.data.find(m => m._id === selectedMemberId);
            // For individual view, we still use total interest / total members as per the existing logic
            const perMemberInterest = totalInterest / (membersRes.data.length || 1);
            setReportData({
              title: `Monthly Interest Report - ${member?.name || 'Member'}`,
              totalAmount: perMemberInterest,
              date: new Date().toISOString(),
              startDate: startDate.toISOString(),
              endDate: endDate.toISOString(),
            });
          } else if (viewType === 'collective') {
            const selectedMembers = membersRes.data.filter(m => selectedMemberIds.includes(m._id));
             // For collective view, we still use total interest / total members * selected members as per the existing logic
            const perMemberInterest = totalInterest / (membersRes.data.length || 1);
            const totalSelectedInterest = perMemberInterest * selectedMembers.length;
            setReportData({
              title: 'Monthly Interest Report - Selected Members',
              totalAmount: totalSelectedInterest,
              perMemberAmount: perMemberInterest,
              totalMembers: selectedMembers.length,
              members: selectedMembers.map(m => ({
                name: m.name,
                amount: perMemberInterest,
              })),
              date: new Date().toISOString(),
              startDate: startDate.toISOString(),
              endDate: endDate.toISOString(),
            });
          }
          break;

        case '2': // Loan Status Report (No date filtering on loans API)
          const loansRes = await loansAPI.getAll(); // No date params needed for this API call
          let relevantLoans = [];
          
          if (viewType === 'individual') {
            relevantLoans = loansRes.data.filter(loan => loan.memberId?._id === selectedMemberId);
          } else if (viewType === 'collective') {
            relevantLoans = loansRes.data.filter(loan => selectedMemberIds.includes(loan.memberId?._id));
          } else {
            relevantLoans = loansRes.data;
          }

          setAllLoans(relevantLoans);
          
          if (relevantLoans.length === 0) {
            setReportData({
              title: viewType === 'individual' 
                ? `Loan Status Report - ${members.find(m => m._id === selectedMemberId)?.name || 'Unknown'}`
                : 'Loan Status Report',
              noLoans: true,
              message: 'No loans found for the selected member(s)'
            });
          } else {
            // Sort loans by date in descending order and set the latest loan as selected
            const sortedLoans = [...relevantLoans].sort((a, b) => new Date(b.date) - new Date(a.date));
            setSelectedLoan(sortedLoans[0]);
            updateReportData(sortedLoans[0]);
          }
          break;

        case '3': // Member Activity Report
          // Fetch members, and filter loans and installments by date range using the updated APIs
          const [allMembers, allLoans, allInstallments] = await Promise.all([
            membersAPI.getAll(),
            loansAPI.getAll(dateQueryParams), // Pass date params to loans API (if applicable, though filtering is by activity date)
            installmentsAPI.getAll(dateQueryParams), // Pass date params to installments API
          ]);

          // Filter loans and installments based on the response from the date-aware APIs
          // No need for isDateInRange check here if the APIs handle filtering
          const filteredLoans = allLoans.data;
          const filteredInstallments = allInstallments.data;

          if (viewType === 'overall') {
            const memberActivity = allMembers.data.map(member => {
              // Filter already filtered data by member ID
              const memberLoans = filteredLoans.filter(loan => loan.memberId?._id === member._id);
              const memberInstallments = filteredInstallments.filter(inst => inst.memberId?._id === member._id);
              
              // Find last activity within the filtered range
              let lastActivity = null;
              const lastLoanDate = memberLoans.length > 0 ? new Date(Math.max(...memberLoans.map(l => new Date(l.date)))) : null;
              const lastInstallmentDate = memberInstallments.length > 0 ? new Date(Math.max(...memberInstallments.map(i => new Date(i.date)))) : null;

              if (lastLoanDate && lastInstallmentDate) {
                  lastActivity = new Date(Math.max(lastLoanDate, lastInstallmentDate));
              } else if (lastLoanDate) {
                  lastActivity = lastLoanDate;
              } else if (lastInstallmentDate) {
                  lastActivity = lastInstallmentDate;
              }

              return {
                name: member.name,
                memberId: member.memberId,
                activeLoans: memberLoans.filter(loan => loan.status === 'active').length,
                totalInstallments: memberInstallments.length,
                lastActivity: lastActivity,
              };
            });

            // Filter members who had activity within the date range
             const activeMembersInRange = memberActivity.filter(m => 
                (m.activeLoans > 0 || m.totalInstallments > 0 || (m.lastActivity && isDateInRange(m.lastActivity)))
            );

            setReportData({
              title: 'Member Activity Report',
              totalMembers: allMembers.data.length,
              activeMembers: activeMembersInRange.length,
              members: activeMembersInRange, // Only include members with activity in range for overall view
              startDate: startDate.toISOString(),
              endDate: endDate.toISOString(),
            });
          } else if (viewType === 'individual') {
            const member = allMembers.data.find(m => m._id === selectedMemberId);
             // Filter already filtered data by member ID
            const memberLoans = filteredLoans.filter(loan => loan.memberId?._id === selectedMemberId);
            const memberInstallments = filteredInstallments.filter(inst => inst.memberId?._id === selectedMemberId);

             // Find last activity within the filtered range
              let lastActivity = null;
              const lastLoanDate = memberLoans.length > 0 ? new Date(Math.max(...memberLoans.map(l => new Date(l.date)))) : null;
              const lastInstallmentDate = memberInstallments.length > 0 ? new Date(Math.max(...memberInstallments.map(i => new Date(i.date)))) : null;

              if (lastLoanDate && lastInstallmentDate) {
                  lastActivity = new Date(Math.max(lastLoanDate, lastInstallmentDate));
              } else if (lastLoanDate) {
                  lastActivity = lastLoanDate;
              } else if (lastInstallmentDate) {
                  lastActivity = lastInstallmentDate;
              }

            setReportData({
              title: `Member Activity Report - ${member?.name || 'Member'}`,
              activeLoans: memberLoans.filter(loan => loan.status === 'active').length,
              totalInstallments: memberInstallments.length,
              lastActivity: lastActivity,
              loans: memberLoans.map(loan => ({
                amount: loan.amount,
                outstanding: loan.outstanding,
                date: loan.date,
              })),
              installments: memberInstallments.map(inst => ({
                amount: inst.amount,
                date: inst.date,
              })),
              startDate: startDate.toISOString(),
              endDate: endDate.toISOString(),
            });
          } else if (viewType === 'collective') {
            const selectedMemberActivity = allMembers.data
              .filter(member => selectedMemberIds.includes(member._id))
              .map(member => {
                // Filter already filtered data by member ID
                const memberLoans = filteredLoans.filter(loan => loan.memberId?._id === member._id);
                const memberInstallments = filteredInstallments.filter(inst => inst.memberId?._id === member._id);
                 // Find last activity within the filtered range
                let lastActivity = null;
                const lastLoanDate = memberLoans.length > 0 ? new Date(Math.max(...memberLoans.map(l => new Date(l.date)))) : null;
                const lastInstallmentDate = memberInstallments.length > 0 ? new Date(Math.max(...memberInstallments.map(i => new Date(i.date)))) : null;
  
                if (lastLoanDate && lastInstallmentDate) {
                    lastActivity = new Date(Math.max(lastLoanDate, lastInstallmentDate));
                } else if (lastLoanDate) {
                    lastActivity = lastLoanDate;
                } else if (lastInstallmentDate) {
                    lastActivity = lastInstallmentDate;
                }
                return {
                  name: member.name,
                  memberId: member.memberId,
                  activeLoans: memberLoans.filter(loan => loan.status === 'active').length,
                  totalInstallments: memberInstallments.length,
                  lastActivity: lastActivity,
                };
              });
             // Filter members who had activity within the date range for collective view
            const activeSelectedMembersInRange = selectedMemberActivity.filter(m => 
                (m.activeLoans > 0 || m.totalInstallments > 0 || (m.lastActivity && isDateInRange(m.lastActivity)))
            );
            setReportData({
              title: 'Member Activity Report - Selected Members',
              totalMembers: selectedMemberIds.length, // Total selected members count
              activeMembers: activeSelectedMembersInRange.length, // Count of selected members with activity in range
              members: activeSelectedMembersInRange, // Only include selected members with activity in range
              startDate: startDate.toISOString(),
              endDate: endDate.toISOString(),
            });
          }
          break;

        case '4': // Installment Collection Report
          // Fetch installments filtered by date range using the updated API
          const installmentsRes = await installmentsAPI.getAll(dateQueryParams); // Pass date params
          
          // Data is already filtered by the API
          const filteredInstallmentsCollection = installmentsRes.data;

          if (viewType === 'overall') {
            const totalCollection = filteredInstallmentsCollection.reduce((sum, inst) => sum + inst.amount, 0);
            setReportData({
              title: 'Installment Collection Report',
              totalCollection,
              totalInstallments: filteredInstallmentsCollection.length,
              installments: filteredInstallmentsCollection.map(inst => ({
                memberName: inst.memberId?.name || 'Unknown',
                amount: inst.amount,
                date: inst.date,
              })),
              startDate: startDate.toISOString(),
              endDate: endDate.toISOString(),
            });
          } else if (viewType === 'individual') {
            const memberInstallments = filteredInstallmentsCollection.filter(inst => inst.memberId?._id === selectedMemberId);
            const totalCollection = memberInstallments.reduce((sum, inst) => sum + inst.amount, 0);
            setReportData({
              title: `Installment Collection Report - ${members.find(m => m._id === selectedMemberId)?.name || 'Member'}`,
              totalCollection,
              totalInstallments: memberInstallments.length,
              installments: memberInstallments.map(inst => ({
                amount: inst.amount,
                date: inst.date,
              })),
              startDate: startDate.toISOString(),
              endDate: endDate.toISOString(),
            });
          } else if (viewType === 'collective') {
            const selectedMemberInstallments = filteredInstallmentsCollection.filter(inst => 
              selectedMemberIds.includes(inst.memberId?._id)
            );
            const totalCollection = selectedMemberInstallments.reduce((sum, inst) => sum + inst.amount, 0);
            setReportData({
              title: 'Installment Collection Report - Selected Members',
              totalCollection,
              totalInstallments: selectedMemberInstallments.length,
              installments: selectedMemberInstallments.map(inst => ({
                memberName: inst.memberId?.name || 'Unknown',
                amount: inst.amount,
                date: inst.date,
              })),
              startDate: startDate.toISOString(),
              endDate: endDate.toISOString(),
            });
          }
          break;

        default:
          setError('Invalid report type');
      }
    } catch (error) {
      console.error('Error fetching report detail:', error);
      setError('Failed to load report data');
    } finally {
      setLoading(false);
    }
  };

  const updateReportData = async (loan) => {
    try {
      setLoading(true);
      setError(null);

      // Calculate installment details
      const installmentDetails = {
        total: Math.ceil(loan.amount / 1000), // Assuming 1000 per installment
        paid: (loan.repayments || []).length,
        pending: Math.ceil(loan.amount / 1000) - (loan.repayments || []).length,
        installments: (loan.repayments || []).map((repayment, index) => ({
          amount: repayment.amount || 0,
          date: repayment.date,
          installmentNumber: index + 1,
          type: 'principal'
        }))
      };

      // Calculate interest details from loan's interest payments
      const interestDetails = {
        totalInterest: (loan.interestPayments || []).reduce((sum, payment) => sum + (payment.amount || 0), 0),
        interestPayments: (loan.interestPayments || []).map((payment, index) => ({
          amount: payment.amount || 0,
          date: payment.date,
          installmentNumber: index + 1,
          type: 'interest'
        }))
      };

      // Create combined payment history with principal and interest together
      const paymentHistory = (loan.repayments || []).map((principal, index) => {
        const interest = (loan.interestPayments || [])[index] || null;
        return {
          installmentNumber: index + 1,
          date: principal.date,
          repayment: {
            amount: principal.amount || 0,
            date: principal.date
          },
          interest: interest ? {
            amount: interest.amount || 0,
            date: interest.date
          } : null
        };
      });

      const loanData = {
        title: viewType === 'individual' 
          ? `Loan Status Report - ${loan.memberId?.name || 'Unknown'}`
          : viewType === 'collective'
            ? 'Loan Status Report - Selected Members'
            : 'Loan Status Report',
        loanDetails: {
          memberName: loan.memberId?.name || 'Unknown',
          memberId: loan.memberId?.memberId || 'N/A',
          amount: loan.amount,
          outstanding: loan.outstanding || 0,
          repaid: loan.amount - (loan.outstanding || 0),
          interestPaid: interestDetails.totalInterest,
          paymentHistory: paymentHistory,
          date: loan.date,
          status: loan.status,
          completionDate: loan.completionDate,
          installments: installmentDetails.installments,
          totalInstallments: installmentDetails.total,
          paidInstallments: installmentDetails.paid,
          pendingInstallments: installmentDetails.pending,
          nextInstallmentDate: loan.nextInstallmentDate,
          interestRate: '1',
          loanDuration: loan.duration || 'N/A',
          loanPurpose: loan.purpose || 'N/A'
        }
      };

      setReportData(loanData);
    } catch (error) {
      console.error('Error updating report data:', error);
      setError('Failed to update report data');
    } finally {
      setLoading(false);
    }
  };

  const handleLoanSelect = (loanId) => {
    const selected = allLoans.find(loan => loan._id === loanId);
    setSelectedLoan(selected);
    updateReportData(selected);
  };

  const onDateChange = (event, selectedDate, type) => {
    const currentDate = selectedDate || new Date();
    if (type === 'start') {
      setShowStartDatePicker(Platform.OS === 'ios');
      setStartDate(currentDate);
    } else {
      setShowEndDatePicker(Platform.OS === 'ios');
      setEndDate(currentDate);
    }
  };

  const showDatePicker = (type) => {
    if (type === 'start') {
      setShowStartDatePicker(true);
    } else {
      setShowEndDatePicker(true);
    }
  };

  const generatePDF = async () => {
    try {
      setLoading(true);

      // Generate HTML content based on report type
      let htmlContent = '';
      switch (reportType) {
        case '1':
          htmlContent = generateMonthlyInterestPDF();
          break;
        case '2':
          htmlContent = generateLoanStatusPDF();
          break;
        case '3':
          htmlContent = generateMemberActivityPDF();
          break;
        case '4':
          htmlContent = generateInstallmentCollectionPDF();
          break;
        default:
          throw new Error('Invalid report type');
      }

      // Always generate PDF
      const { uri } = await Print.printToFileAsync({
        html: htmlContent,
        width: 612, // US Letter width in points
        height: 792, // US Letter height in points
        base64: false
      });
      return { filePath: uri, isHtml: false };
    } catch (error) {
      console.error('Report Generation Error:', error);
      Alert.alert('Error', 'Failed to generate report: ' + error.message);
      return null;
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async () => {
    try {
      console.log('Starting download process...');
      const result = await generatePDF();
      
      if (result) {
        if (await Sharing.isAvailableAsync()) {
          // For download, we'll save to downloads folder on Android
          if (Platform.OS === 'android') {
            const downloadsPath = `${FileSystem.documentDirectory}Downloads/`;
            const newPath = `${downloadsPath}${reportData.title.replace(/\s+/g, '_')}_${new Date().getTime()}.${result.isHtml ? 'html' : 'pdf'}`;
            
            // Create Downloads directory if it doesn't exist
            const dirInfo = await FileSystem.getInfoAsync(downloadsPath);
            if (!dirInfo.exists) {
              await FileSystem.makeDirectoryAsync(downloadsPath, { intermediates: true });
            }
            
            // Copy file to Downloads
            await FileSystem.copyAsync({
              from: result.filePath,
              to: newPath
            });
            
            Alert.alert('Success', 'Report saved to Downloads folder');
          } else {
            // For iOS, we'll use the share sheet with save option
            await Sharing.shareAsync(result.filePath, {
              mimeType: result.isHtml ? 'text/html' : 'application/pdf',
              dialogTitle: 'Save Report',
              UTI: result.isHtml ? 'public.html' : 'com.adobe.pdf'
            });
          }
        } else {
          Alert.alert('Error', 'Sharing is not available on this device');
        }
      }
    } catch (error) {
      console.error('Download Error:', error);
      Alert.alert('Error', 'Failed to download report');
    }
  };

  const handleShare = async () => {
    try {
      console.log('Starting share process...');
      const result = await generatePDF();
      
      if (result) {
        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(result.filePath, {
            mimeType: result.isHtml ? 'text/html' : 'application/pdf',
            dialogTitle: 'Share Report',
            UTI: result.isHtml ? 'public.html' : 'com.adobe.pdf'
          });
        } else {
          Alert.alert('Error', 'Sharing is not available on this device');
        }
      }
    } catch (error) {
      console.error('Share Error:', error);
      Alert.alert('Error', 'Failed to share report');
    }
  };

  const generateMonthlyInterestPDF = () => {
    const reportStartDate = reportData.startDate ? new Date(reportData.startDate).toLocaleDateString() : 'N/A';
    const reportEndDate = reportData.endDate ? new Date(reportData.endDate).toLocaleDateString() : 'N/A';
    const generatedDate = new Date().toLocaleDateString();

    return `
      <html>
        <head>
          <style>
            body { font-family: Arial; }
            table { width: 100%; border-collapse: collapse; margin: 20px 0; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #f5f5f5; }
            .app-header { 
                position: relative; /* Use relative positioning for containing absolute children */
                height: 60px; /* Give the header a defined height */
                margin-bottom: 20px; 
                padding-bottom: 10px; 
                border-bottom: 1px solid #ccc; 
            }
            .app-logo { 
                position: absolute; 
                left: 0; top: 0;
                height: 50px; 
                /* margin-right: 10px; */ /* Remove margin since we are using absolute positioning */
            }
            .app-name { 
                position: absolute; 
                left: 60px; /* Position next to logo */
                top: 10px; /* Adjust vertical alignment */
                font-size: 24px; 
                font-weight: bold; 
                color: #007AFF; 
                margin: 0; 
            }
            .report-title { 
                font-size: 20px; 
                text-align: center; 
                margin: 10px 0; 
                margin-top: 60px; /* Add margin to push content below absolute header */
            }
            .report-date { 
                font-size: 14px; 
                text-align: center; 
                color: #666; 
                margin-bottom: 20px; 
            }
            .date-range { 
                font-size: 12px; 
                text-align: center; 
                color: #666; 
                margin-bottom: 20px; 
            }
          </style>
        </head>
        <body>
          <div class="app-header">
            <img src="assets/images/logo.png" class="app-logo" />
            <h1 class="app-name">Swanidhi</h1>
          </div>
          <h2 class="report-title">${reportData.title}</h2>
          <p class="report-date">Generated on: ${generatedDate}</p>
          ${reportData.startDate ? `<p class="date-range">Date Range: ${reportStartDate} - ${reportEndDate}</p>` : ''}
          <div class="summary">
            <h2>Summary</h2>
            <table>
              <tr>
                <th>Total Interest</th>
                <td>₹{reportData.totalAmount.toFixed(2)}</td>
              </tr>
              ${viewType !== 'individual' ? `
                <tr>
                  <th>Per Member</th>
                  <td>₹{reportData.perMemberAmount.toFixed(2)}</td>
                </tr>
                <tr>
                  <th>Total Members</th>
                  <td>{reportData.totalMembers}</td>
                </tr>
              ` : ''}
            </table>
          </div>
          ${viewType === 'collective' && reportData.members ? `
            <h2>Member Details</h2>
            <table>
              <tr>
                <th>Member Name</th>
                <th>Amount</th>
              </tr>
              ${reportData.members.map(member => `
                <tr>
                  <td>{member.name}</td>
                  <td>₹{member.amount.toFixed(2)}</td>
                </tr>
              `).join('')}
            </table>
          ` : ''}
        </body>
      </html>
    `;
  };

  const generateLoanStatusPDF = () => {
    if (!reportData || reportData.noLoans) {
      const generatedDate = new Date().toLocaleDateString();
      return `
        <html>
          <head>
            <style>
              body { font-family: Arial; }
              .app-header { display: flex; align-items: center; margin-bottom: 20px; padding-bottom: 10px; border-bottom: 1px solid #ccc; }
              .app-logo { height: 50px; margin-right: 10px; }
              .app-name { font-size: 24px; font-weight: bold; color: #007AFF; margin: 0; }
              .report-title { font-size: 20px; text-align: center; margin: 10px 0; }
              .report-date { font-size: 14px; text-align: center; color: #666; margin-bottom: 20px; }
            </style>
          </head>
          <body>
            <div class="app-header">
              <img src="assets/images/logo.png" class="app-logo" />
              <h1 class="app-name">Swanidhi</h1>
            </div>
            <h2 class="report-title">${reportData.title}</h2>
            <p class="report-date">Generated on: ${generatedDate}</p>
            <p>${reportData.message}</p>
          </body>
        </html>
      `;
    }

    const reportStartDate = reportData.startDate ? new Date(reportData.startDate).toLocaleDateString() : 'N/A';
    const reportEndDate = reportData.endDate ? new Date(reportData.endDate).toLocaleDateString() : 'N/A';
    const generatedDate = new Date().toLocaleDateString();

    return `
      <html>
        <head>
          <style>
            body { font-family: Arial; }
            table { width: 100%; border-collapse: collapse; margin: 20px 0; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #f5f5f5; }
            .header { text-align: center; margin-bottom: 20px; }
            .section { margin-bottom: 20px; }
            .app-header { display: flex; align-items: center; margin-bottom: 20px; padding-bottom: 10px; border-bottom: 1px solid #ccc; }
            .app-logo { height: 50px; margin-right: 10px; }
            .app-name { font-size: 24px; font-weight: bold; color: #007AFF; margin: 0; }
            .report-title { font-size: 20px; text-align: center; margin: 10px 0; }
            .report-date { font-size: 14px; text-align: center; color: #666; margin-bottom: 20px; }
            .date-range { 
                font-size: 12px; 
                text-align: center; 
                color: #666; 
                margin-bottom: 20px; 
            }
          </style>
        </head>
        <body>
          <div class="app-header">
            <img src="assets/images/logo.png" class="app-logo" />
            <h1 class="app-name">Swanidhi</h1>
          </div>
          <h2 class="report-title">${reportData.title}</h2>
          <p class="report-date">Generated on: ${generatedDate}</p>
          ${reportData.startDate ? `<p class="date-range">Date Range: ${reportStartDate} - ${reportEndDate}</p>` : ''}

          <div class="section">
            <h2>Member Information</h2>
            <table>
              <tr>
                <th>Member Name</th>
                <td>${reportData.loanDetails.memberName}</td>
              </tr>
              <tr>
                <th>Member ID</th>
                <td>${reportData.loanDetails.memberId}</td>
              </tr>
            </table>
          </div>

          <div class="section">
            <h2>Loan Information</h2>
            <table>
              <tr>
                <th>Loan Amount</th>
                <td>₹${reportData.loanDetails.amount.toFixed(2)}</td>
              </tr>
              <tr>
                <th>Status</th>
                <td>${reportData.loanDetails.status.toUpperCase()}</td>
              </tr>
              <tr>
                <th>Interest Rate</th>
                <td>${reportData.loanDetails.interestRate}%</td>
              </tr>
              <tr>
                <th>Loan Duration</th>
                <td>${reportData.loanDetails.loanDuration}</td>
              </tr>
              <tr>
                <th>Loan Purpose</th>
                <td>${reportData.loanDetails.loanPurpose}</td>
              </tr>
            </table>
          </div>

          <div class="section">
            <h2>Payment Information</h2>
            <table>
              ${reportData.loanDetails.status === 'active' ? `
                <tr>
                  <th>Outstanding</th>
                  <td>₹${reportData.loanDetails.outstanding.toFixed(2)}</td>
                </tr>
              ` : ''}
              <tr>
                <th>Repaid</th>
                <td>₹${reportData.loanDetails.repaid.toFixed(2)}</td>
              </tr>
              <tr>
                <th>Interest Paid</th>
                <td>₹${reportData.loanDetails.interestPaid.toFixed(2)}</td>
              </tr>
            </table>
          </div>

          <div class="section">
            <h2>Payment History</h2>
            <table>
              <tr>
                <th>Date</th>
                <th>Payment #</th>
                <th>Principal</th>
                <th>Interest</th>
              </tr>
              ${reportData.loanDetails.paymentHistory.map(payment => `
                <tr>
                  <td>${new Date(payment.date).toLocaleDateString()}</td>
                  <td>${payment.installmentNumber}</td>
                  <td>₹${payment.repayment.amount.toFixed(2)}</td>
                  <td>${payment.interest ? `₹${payment.interest.amount.toFixed(2)}` : '-'}</td>
                </tr>
              `).join('')}
            </table>
          </div>

          <div class="section">
            <h2>Important Dates</h2>
            <table>
              <tr>
                <th>Start Date</th>
                <td>${new Date(reportData.loanDetails.date).toLocaleDateString()}</td>
              </tr>
              ${reportData.loanDetails.status === 'completed' ? `
                <tr>
                  <th>Completion Date</th>
                  <td>${new Date(reportData.loanDetails.completionDate).toLocaleDateString()}</td>
                </tr>
              ` : ''}
            </table>
          </div>
        </body>
      </html>
    `;
  };

  const generateMemberActivityPDF = () => {
    const reportStartDate = reportData.startDate ? new Date(reportData.startDate).toLocaleDateString() : 'N/A';
    const reportEndDate = reportData.endDate ? new Date(reportData.endDate).toLocaleDateString() : 'N/A';
    const generatedDate = new Date().toLocaleDateString();

    return `
      <html>
        <head>
          <style>
            body { font-family: Arial; }
            table { width: 100%; border-collapse: collapse; margin: 20px 0; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #f5f5f5; }
            .header { text-align: center; margin-bottom: 20px; }
            .section { margin-bottom: 20px; }
            .app-header { display: flex; align-items: center; margin-bottom: 20px; padding-bottom: 10px; border-bottom: 1px solid #ccc; }
            .app-logo { height: 50px; margin-right: 10px; }
            .app-name { font-size: 24px; font-weight: bold; color: #007AFF; margin: 0; }
            .report-title { font-size: 20px; text-align: center; margin: 10px 0; }
            .report-date { font-size: 14px; text-align: center; color: #666; margin-bottom: 20px; }
            .date-range { 
                font-size: 12px; 
                text-align: center; 
                color: #666; 
                margin-bottom: 20px; 
            }
          </style>
        </head>
        <body>
          <div class="app-header">
            <img src="assets/images/logo.png" class="app-logo" />
            <h1 class="app-name">Swanidhi</h1>
          </div>
          <h2 class="report-title">${reportData.title}</h2>
          <p class="report-date">Generated on: ${generatedDate}</p>
          ${reportData.startDate ? `<p class="date-range">Date Range: ${reportStartDate} - ${reportEndDate}</p>` : ''}

          <div class="section">
            <h2>Summary</h2>
            <table>
              ${viewType !== 'individual' ? `
                <tr>
                  <th>Total Members</th>
                  <td>{reportData.totalMembers}</td>
                </tr>
                <tr>
                  <th>Active Members</th>
                  <td>{reportData.activeMembers}</td>
                </tr>
              ` : `
                <tr>
                  <th>Active Loans</th>
                  <td>{reportData.activeLoans}</td>
                </tr>
                <tr>
                  <th>Total Installments</th>
                  <td>{reportData.totalInstallments}</td>
                </tr>
                ${reportData.lastActivity ? `
                  <tr>
                    <th>Last Activity</th>
                    <td>{new Date(reportData.lastActivity).toLocaleDateString()}</td>
                  </tr>
                ` : ''}
              `}
            </table>
          </div>

          ${viewType !== 'individual' ? `
            <div class="section">
              <h2>Member Details</h2>
              <table>
                <tr>
                  <th>Name</th>
                  <th>Member ID</th>
                  <th>Active Loans</th>
                  <th>Total Installments</th>
                  <th>Last Activity</th>
                </tr>
                ${reportData.members.map(member => `
                  <tr>
                    <td>{member.name}</td>
                    <td>{member.memberId}</td>
                    <td>{member.activeLoans}</td>
                    <td>{member.totalInstallments}</td>
                    <td>{member.lastActivity ? new Date(member.lastActivity).toLocaleDateString() : '-'}</td>
                  </tr>
                `).join('')}
              </table>
            </div>
          ` : `
            <div class="section">
              <h2>Active Loans</h2>
              <table>
                <tr>
                  <th>Amount</th>
                  <th>Outstanding</th>
                  <th>Date</th>
                </tr>
                ${reportData.loans.map(loan => `
                  <tr>
                    <td>₹{loan.amount.toFixed(2)}</td>
                    <td>₹{loan.outstanding.toFixed(2)}</td>
                    <td>{new Date(loan.date).toLocaleDateString()}</td>
                  </tr>
                `).join('')}
              </table>
            </div>

            <div class="section">
              <h2>Recent Installments</h2>
              <table>
                <tr>
                  <th>Amount</th>
                  <th>Date</th>
                </tr>
                ${reportData.installments.map(inst => `
                  <tr>
                    <td>₹{inst.amount.toFixed(2)}</td>
                    <td>{new Date(inst.date).toLocaleDateString()}</td>
                  </tr>
                `).join('')}
              </table>
            </div>
          `}
        </body>
      </html>
    `;
  };

  const generateInstallmentCollectionPDF = () => {
    const reportStartDate = reportData.startDate ? new Date(reportData.startDate).toLocaleDateString() : 'N/A';
    const reportEndDate = reportData.endDate ? new Date(reportData.endDate).toLocaleDateString() : 'N/A';
    const generatedDate = new Date().toLocaleDateString();

    return `
      <html>
        <head>
          <style>
            body { font-family: Arial; }
            table { width: 100%; border-collapse: collapse; margin: 20px 0; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #f5f5f5; }
            .header { text-align: center; margin-bottom: 20px; }
            .section { margin-bottom: 20px; }
            .app-header { display: flex; align-items: center; margin-bottom: 20px; padding-bottom: 10px; border-bottom: 1px solid #ccc; }
            .app-logo { height: 50px; margin-right: 10px; }
            .app-name { font-size: 24px; font-weight: bold; color: #007AFF; margin: 0; }
            .report-title { font-size: 20px; text-align: center; margin: 10px 0; }
            .report-date { font-size: 14px; text-align: center; color: #666; margin-bottom: 20px; }
            .date-range { 
                font-size: 12px; 
                text-align: center; 
                color: #666; 
                margin-bottom: 20px; 
            }
          </style>
        </head>
        <body>
          <div class="app-header">
            <img src="assets/images/logo.png" class="app-logo" />
            <h1 class="app-name">Swanidhi</h1>
          </div>
          <h2 class="report-title">${reportData.title}</h2>
          <p class="report-date">Generated on: ${generatedDate}</p>
          ${reportData.startDate ? `<p class="date-range">Date Range: ${reportStartDate} - ${reportEndDate}</p>` : ''}

          <div class="section">
            <h2>Summary</h2>
            <table>
              <tr>
                <th>Total Collection</th>
                <td>₹{reportData.totalCollection.toFixed(2)}</td>
              </tr>
              <tr>
                <th>Total Installments</th>
                <td>{reportData.totalInstallments}</td>
              </tr>
            </table>
          </div>

          <div class="section">
            <h2>Recent Installments</h2>
            <table>
              <tr>
                ${viewType !== 'individual' ? '<th>Member Name</th>' : ''}
                <th>Amount</th>
                <th>Date</th>
              </tr>
              ${reportData.installments.map(inst => `
                <tr>
                  ${viewType !== 'individual' ? `<td>{inst.memberName}</td>` : ''}
                  <td>₹{inst.amount.toFixed(2)}</td>
                  <td>{new Date(inst.date).toLocaleDateString()}</td>
                </tr>
              `).join('')}
            </table>
          </div>
        </body>
      </html>
    `;
  };

  const renderReportContent = () => {
    if (!reportData) return null;

    // Conditionally render date range picker for applicable reports
    const showDatePickers = reportType !== '2';

    return (
      <View>
        {showDatePickers && (
          <View style={styles.dateRangeContainer}>
            <Text style={styles.sectionTitle}>Select Date Range</Text>
            <View style={styles.datePickerRow}>
              <TouchableOpacity onPress={() => showDatePicker('start')} style={styles.datePickerButton}>
                <Text style={styles.datePickerButtonText}>Start Date: {startDate.toLocaleDateString()}</Text>
              </TouchableOpacity>
              {showStartDatePicker && (
                <DateTimePicker
                  testID="startDatePicker"
                  value={startDate}
                  mode="date"
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  onChange={(event, date) => onDateChange(event, date, 'start')}
                />
              )}
              <TouchableOpacity onPress={() => showDatePicker('end')} style={styles.datePickerButton}>
                <Text style={styles.datePickerButtonText}>End Date: {endDate.toLocaleDateString()}</Text>
              </TouchableOpacity>
              {showEndDatePicker && (
                <DateTimePicker
                  testID="endDatePicker"
                  value={endDate}
                  mode="date"
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  onChange={(event, date) => onDateChange(event, date, 'end')}
                />
              )}
            </View>
          </View>
        )}
        {renderReportContentInner()}
      </View>
    );
  };

  const renderReportContentInner = () => {
    if (!reportData) return null;
    switch (reportType) {
      case '1': // Monthly Interest Report
        return (
          <View style={styles.section}>
            <View style={styles.summaryItem}>
              <Text style={styles.label}>Total Interest</Text>
              <Text style={styles.value}>₹{reportData.totalAmount.toFixed(2)}</Text>
            </View>
            {viewType !== 'individual' && (
              <View style={styles.summaryItem}>
                <Text style={styles.label}>Per Member</Text>
                <Text style={styles.value}>₹{reportData.perMemberAmount.toFixed(2)}</Text>
              </View>
            )}
            {viewType !== 'individual' && (
              <View style={styles.summaryItem}>
                <Text style={styles.label}>Total Members</Text>
                <Text style={styles.value}>{reportData.totalMembers}</Text>
              </View>
            )}
            <View style={styles.summaryItem}>
              <Text style={styles.label}>Date</Text>
              <Text style={styles.value}>{new Date(reportData.date).toLocaleDateString()}</Text>
            </View>
            {viewType === 'collective' && reportData.members && (
              <>
                <Text style={styles.sectionTitle}>Member Details</Text>
                {reportData.members.map((member, index) => (
                  <View key={index} style={styles.memberItem}>
                    <Text style={styles.memberName}>{member.name}</Text>
                    <Text style={styles.memberAmount}>₹${member.amount.toFixed(2)}</Text>
                  </View>
                ))}
              </>
            )}
          </View>
        );

      case '2': // Loan Status Report
        return renderLoanStatusReport();

      case '3': // Member Activity Report
        return (
          <View style={styles.section}>
            {viewType !== 'individual' && (
              <View style={styles.summaryItem}>
                <Text style={styles.label}>Total Members</Text>
                <Text style={styles.value}>{reportData.totalMembers}</Text>
              </View>
            )}
            {viewType !== 'individual' && (
              <View style={styles.summaryItem}>
                <Text style={styles.label}>Active Members</Text>
                <Text style={styles.value}>{reportData.activeMembers}</Text>
              </View>
            )}
            {viewType === 'individual' && (
              <>
                <View style={styles.summaryItem}>
                  <Text style={styles.label}>Active Loans</Text>
                  <Text style={styles.value}>{reportData.activeLoans}</Text>
                </View>
                <View style={styles.summaryItem}>
                  <Text style={styles.label}>Total Installments</Text>
                  <Text style={styles.value}>{reportData.totalInstallments}</Text>
                </View>
                {reportData.lastActivity && (
                  <View style={styles.summaryItem}>
                    <Text style={styles.label}>Last Activity</Text>
                    <Text style={styles.value}>{new Date(reportData.lastActivity).toLocaleDateString()}</Text>
                  </View>
                )}
              </>
            )}
            {viewType !== 'individual' ? (
              <>
                <Text style={styles.sectionTitle}>Member Details</Text>
                {reportData.members.map((member, index) => (
                  <View key={index} style={styles.memberItem}>
                    <Text style={styles.memberName}>{member.name}</Text>
                    <Text style={styles.memberId}>ID: {member.memberId}</Text>
                    <View style={styles.memberStats}>
                      <Text style={styles.memberStat}>Active Loans: {member.activeLoans}</Text>
                      <Text style={styles.memberStat}>Installments: {member.totalInstallments}</Text>
                    </View>
                    {member.lastActivity && (
                      <Text style={styles.lastActivity}>
                        Last Activity: {new Date(member.lastActivity).toLocaleDateString()}
                      </Text>
                    )}
                  </View>
                ))}
              </>
            ) : (
              <>
                <Text style={styles.sectionTitle}>Active Loans</Text>
                {reportData.loans.map((loan, index) => (
                  <View key={index} style={styles.loanItem}>
                    <Text style={styles.loanAmount}>₹{loan.outstanding.toFixed(2)}</Text>
                    <Text style={styles.loanDate}>{new Date(loan.date).toLocaleDateString()}</Text>
                  </View>
                ))}
                <Text style={styles.sectionTitle}>Recent Installments</Text>
                {reportData.installments.map((inst, index) => (
                  <View key={index} style={styles.installmentItem}>
                    <Text style={styles.installmentAmount}>₹{inst.amount.toFixed(2)}</Text>
                    <Text style={styles.installmentDate}>{new Date(inst.date).toLocaleDateString()}</Text>
                  </View>
                ))}
              </>
            )}
          </View>
        );

      case '4': // Installment Collection Report
        return (
          <View style={styles.section}>
            <View style={styles.summaryItem}>
              <Text style={styles.label}>Total Collection</Text>
              <Text style={styles.value}>₹{reportData.totalCollection.toFixed(2)}</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.label}>Total Installments</Text>
              <Text style={styles.value}>{reportData.totalInstallments}</Text>
            </View>
            <Text style={styles.sectionTitle}>Recent Installments</Text>
            {reportData.installments.map((inst, index) => (
              <View key={index} style={styles.installmentItem}>
                {viewType !== 'individual' && (
                  <Text style={styles.installmentMember}>{inst.memberName}</Text>
                )}
                <Text style={styles.installmentAmount}>₹{inst.amount.toFixed(2)}</Text>
                <Text style={styles.installmentDate}>{new Date(inst.date).toLocaleDateString()}</Text>
              </View>
            ))}
          </View>
        );

      default:
        return null;
    }
  };

  const renderLoanStatusReport = () => {
    if (!reportData) return null;

    if (reportData.noLoans) {
      return (
        <View style={styles.noLoansContainer}>
          <Icon name="alert-circle-outline" size={48} color="#8E8E93" />
          <Text style={styles.noLoansText}>{reportData.message}</Text>
        </View>
      );
    }

    return (
      <View style={styles.section}>
        <View style={styles.loanSelector}>
          <Text style={styles.selectorLabel}>Select Loan:</Text>
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={selectedLoan?._id}
              onValueChange={handleLoanSelect}
              style={styles.picker}
            >
              {allLoans.map((loan) => (
                <Picker.Item
                  key={loan._id}
                  label={`${loan.memberId?.name || 'Unknown'} - ₹${loan.amount} (${loan.status})`}
                  value={loan._id}
                />
              ))}
            </Picker>
          </View>
        </View>

        <View style={styles.loanDetailsContainer}>
          {/* Member Information */}
          <Text style={styles.sectionTitle}>Member Information</Text>
          <View style={styles.summaryItem}>
            <Text style={styles.label}>Member Name</Text>
            <Text style={styles.value}>{reportData.loanDetails.memberName}</Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={styles.label}>Member ID</Text>
            <Text style={styles.value}>{reportData.loanDetails.memberId}</Text>
          </View>

          {/* Loan Information */}
          <Text style={styles.sectionTitle}>Loan Information</Text>
          <View style={styles.summaryItem}>
            <Text style={styles.label}>Loan Amount</Text>
            <Text style={styles.value}>₹{reportData.loanDetails.amount.toFixed(2)}</Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={styles.label}>Status</Text>
            <Text style={[
              styles.value,
              { color: reportData.loanDetails.status === 'active' ? '#34C759' : '#FF9500' }
            ]}>
              {reportData.loanDetails.status.toUpperCase()}
            </Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={styles.label}>Interest Rate</Text>
            <Text style={styles.value}>{reportData.loanDetails.interestRate}%</Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={styles.label}>Loan Duration</Text>
            <Text style={styles.value}>{reportData.loanDetails.loanDuration} months</Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={styles.label}>Loan Purpose</Text>
            <Text style={styles.value}>{reportData.loanDetails.loanPurpose}</Text>
          </View>

          {/* Payment Information */}
          <Text style={styles.sectionTitle}>Payment Information</Text>
          {reportData.loanDetails.status === 'active' && (
            <View style={styles.summaryItem}>
              <Text style={styles.label}>Outstanding</Text>
              <Text style={styles.value}>₹{reportData.loanDetails.outstanding.toFixed(2)}</Text>
            </View>
          )}
          <View style={styles.summaryItem}>
            <Text style={styles.label}>Repaid</Text>
            <Text style={styles.value}>₹{reportData.loanDetails.repaid.toFixed(2)}</Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={styles.label}>Interest Paid</Text>
            <Text style={styles.value}>₹{reportData.loanDetails.interestPaid.toFixed(2)}</Text>
          </View>

          {/* Installment Information */}
          <Text style={styles.sectionTitle}>Installment Information</Text>
          <View style={styles.summaryItem}>
            <Text style={styles.label}>Total Installments</Text>
            <Text style={styles.value}>{reportData.loanDetails.totalInstallments}</Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={styles.label}>Paid Installments</Text>
            <Text style={styles.value}>{reportData.loanDetails.paidInstallments}</Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={styles.label}>Pending Installments</Text>
            <Text style={styles.value}>{reportData.loanDetails.pendingInstallments}</Text>
          </View>
          {reportData.loanDetails.status === 'active' && (
            <View style={styles.summaryItem}>
              <Text style={styles.label}>Next Installment Date</Text>
              <Text style={styles.value}>
                {new Date(reportData.loanDetails.nextInstallmentDate).toLocaleDateString()}
              </Text>
            </View>
          )}

          {/* Payment History */}
          <Text style={styles.sectionTitle}>Payment History</Text>
          {reportData.loanDetails.paymentHistory.length > 0 ? (
            reportData.loanDetails.paymentHistory.map((payment, index) => (
              <View key={index} style={styles.paymentItem}>
                <View style={styles.paymentHeader}>
                  <Text style={styles.paymentDate}>
                    {new Date(payment.date).toLocaleDateString()}
                  </Text>
                  <Text style={styles.paymentNumber}>
                    Payment #{payment.installmentNumber}
                  </Text>
                </View>
                <View style={styles.paymentDetails}>
                  <View style={styles.paymentRow}>
                    <Text style={styles.paymentLabel}>Repayment:</Text>
                    <Text style={[styles.paymentAmount, { color: '#34C759' }]}>
                      ₹{payment.repayment.amount.toFixed(2)}
                    </Text>
                  </View>
                  {payment.interest && (
                    <View style={styles.paymentRow}>
                      <Text style={styles.paymentLabel}>Interest:</Text>
                      <Text style={[styles.paymentAmount, { color: '#007AFF' }]}>
                        ₹{payment.interest.amount.toFixed(2)}
                      </Text>
                    </View>
                  )}
                </View>
              </View>
            ))
          ) : (
            <Text style={styles.noPaymentsText}>No payments recorded</Text>
          )}

          {/* Dates */}
          <Text style={styles.sectionTitle}>Important Dates</Text>
          <View style={styles.summaryItem}>
            <Text style={styles.label}>Start Date</Text>
            <Text style={styles.value}>{new Date(reportData.loanDetails.date).toLocaleDateString()}</Text>
          </View>
          {reportData.loanDetails.status === 'completed' && (
            <View style={styles.summaryItem}>
              <Text style={styles.label}>Completion Date</Text>
              <Text style={styles.value}>
                {new Date(reportData.loanDetails.completionDate).toLocaleDateString()}
              </Text>
            </View>
          )}
        </View>
      </View>
    );
  };

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    fetchReportDetail().finally(() => setRefreshing(false));
  }, []);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Generating Report...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Icon name="alert-circle" size={48} color="#FF3B30" />
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={fetchReportDetail}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
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
          tintColor="#007AFF"
        />
      }
    >
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Icon name="arrow-left" size={24} color="#007AFF" />
        </TouchableOpacity>
        <Text style={styles.title}>{reportData?.title}</Text>
        <View style={styles.headerButtons}>
          <TouchableOpacity 
            style={styles.headerButton} 
            onPress={handleDownload}
            accessibilityLabel="Download Report"
          >
            <Icon name="download" size={24} color="#007AFF" />
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.headerButton} 
            onPress={handleShare}
            accessibilityLabel="Share Report"
          >
            <Icon name="share-variant" size={24} color="#007AFF" />
          </TouchableOpacity>
        </View>
      </View>
      {renderReportContent()}
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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F2F2F7',
    marginTop: 30,
    padding: 20,
  },
  errorText: {
    marginTop: 10,
    color: '#FF3B30',
    textAlign: 'center',
    fontSize: 16,
  },
  retryButton: {
    marginTop: 20,
    padding: 10,
    backgroundColor: '#007AFF',
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  backButton: {
    marginRight: 16,
  },
  title: {
    flex: 1,
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000000',
    marginRight: 8,
  },
  section: {
    backgroundColor: '#FFFFFF',
    margin: 8,
    padding: 16,
    borderRadius: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000000',
    marginTop: 20,
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
    paddingBottom: 8,
  },
  summaryItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  label: {
    fontSize: 16,
    color: '#666666',
  },
  value: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000000',
  },
  loanItem: {
    backgroundColor: '#F8F8F8',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  loanMember: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000000',
  },
  loanAmount: {
    fontSize: 14,
    color: '#007AFF',
    marginTop: 4,
  },
  loanDate: {
    fontSize: 12,
    color: '#666666',
    marginTop: 4,
  },
  memberItem: {
    backgroundColor: '#F8F8F8',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  memberName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000000',
  },
  memberId: {
    fontSize: 14,
    color: '#666666',
    marginTop: 4,
  },
  memberStats: {
    flexDirection: 'row',
    marginTop: 8,
  },
  memberStat: {
    fontSize: 14,
    color: '#007AFF',
    marginRight: 16,
  },
  lastActivity: {
    fontSize: 12,
    color: '#666666',
    marginTop: 8,
  },
  installmentItem: {
    backgroundColor: '#F8F8F8',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  installmentMember: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000000',
  },
  installmentAmount: {
    fontSize: 14,
    color: '#34C759',
    marginTop: 4,
  },
  installmentDate: {
    fontSize: 12,
    color: '#666666',
    marginTop: 4,
  },
  memberAmount: {
    fontSize: 14,
    color: '#007AFF',
    marginTop: 4,
  },
  loanDetailsContainer: {
    backgroundColor: '#F8F8F8',
    borderRadius: 8,
    padding: 16,
  },
  noLoansContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#FFFFFF',
    margin: 8,
    borderRadius: 8,
  },
  noLoansText: {
    marginTop: 10,
    fontSize: 16,
    color: '#8E8E93',
    textAlign: 'center',
  },
  loanSelector: {
    marginBottom: 20,
  },
  selectorLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#000000',
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#E5E5E5',
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
  },
  picker: {
    height: 50,
  },
  interestPaymentItem: {
    backgroundColor: '#F8F8F8',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  interestPaymentDate: {
    fontSize: 14,
    color: '#666666',
  },
  interestPaymentAmount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#007AFF',
    marginTop: 4,
  },
  interestPaymentNumber: {
    fontSize: 14,
    color: '#666666',
    marginTop: 4,
  },
  noInterestText: {
    fontSize: 14,
    color: '#8E8E93',
    fontStyle: 'italic',
    textAlign: 'center',
    marginVertical: 12,
  },
  paymentItem: {
    backgroundColor: '#F8F8F8',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  paymentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  paymentDate: {
    fontSize: 14,
    color: '#666666',
  },
  paymentNumber: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#000000',
  },
  paymentDetails: {
    marginTop: 4,
  },
  paymentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  paymentLabel: {
    fontSize: 14,
    color: '#666666',
  },
  paymentAmount: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  noPaymentsText: {
    fontSize: 14,
    color: '#8E8E93',
    fontStyle: 'italic',
    textAlign: 'center',
    marginVertical: 12,
  },
  headerButtons: {
    flexDirection: 'row',
    marginLeft: 'auto',
    gap: 8,
  },
  headerButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#F2F2F7',
  },
  dateRangeContainer: {
    backgroundColor: '#FFFFFF',
    margin: 8,
    padding: 16,
    borderRadius: 8,
  },
  datePickerRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 10,
  },
  datePickerButton: {
    backgroundColor: '#F2F2F7',
    padding: 10,
    borderRadius: 8,
  },
  datePickerButtonText: {
    color: '#007AFF',
    fontSize: 14,
    fontWeight: '500',
  },
}); 