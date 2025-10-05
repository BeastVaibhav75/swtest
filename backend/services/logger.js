const TransactionLog = require('../models/TransactionLog');
const LoginLog = require('../models/LoginLog');
const MemberLog = require('../models/MemberLog');
const User = require('../models/User');
const Fund = require('../models/Fund');

class Logger {
  // Helper method to get current system balances
  static async getSystemBalances(memberId = null) {
    const fund = await Fund.findOne();
    const fundBalance = fund ? fund.totalFund : 0;
    
    let memberInvestmentBalance = 0;
    let memberInterestEarned = 0;
    
    if (memberId) {
      const member = await User.findById(memberId);
      if (member) {
        memberInvestmentBalance = member.investmentBalance || 0;
        memberInterestEarned = member.interestEarned || 0;
      }
    }
    
    return {
      fundBalance,
      memberInvestmentBalance,
      memberInterestEarned
    };
  }

  // Transaction Logging
  static async logTransaction(data) {
    try {
      const log = new TransactionLog({
        type: data.type,
        action: data.action,
        amount: data.amount,
        memberId: data.memberId,
        memberName: data.memberName,
        memberIdCode: data.memberIdCode,
        referenceId: data.referenceId,
        referenceType: data.referenceType,
        description: data.description,
        performedBy: data.performedBy,
        performedByName: data.performedByName,
        previousAmount: data.previousAmount,
        newAmount: data.newAmount,
        fundImpact: data.fundImpact,
        balancesBefore: data.balancesBefore,
        balancesAfter: data.balancesAfter,
        additionalData: {
          ...data.additionalData,
          balancesBefore: data.balancesBefore,
          balancesAfter: data.balancesAfter
        }
      });
      await log.save();
      console.log(`Transaction logged: ${data.type} - ${data.action} - ₹${data.amount}`);
    } catch (error) {
      console.error('Error logging transaction:', error);
    }
  }

  // Login Logging
  static async logLogin(data) {
    try {
      const log = new LoginLog({
        userId: data.userId,
        userName: data.userName,
        userRole: data.userRole,
        action: data.action,
        ipAddress: data.ipAddress,
        userAgent: data.userAgent,
        deviceInfo: data.deviceInfo,
        success: data.success,
        failureReason: data.failureReason,
        sessionDuration: data.sessionDuration,
        activities: data.activities || [],
        additionalData: data.additionalData
      });
      await log.save();
      console.log(`Login logged: ${data.action} - ${data.userName} (${data.userRole})`);
    } catch (error) {
      console.error('Error logging login:', error);
    }
  }

  // Member Logging
  static async logMember(data) {
    try {
      const log = new MemberLog({
        memberId: data.memberId,
        memberName: data.memberName,
        memberIdCode: data.memberIdCode,
        action: data.action,
        fieldChanges: data.fieldChanges || [],
        performedBy: data.performedBy,
        performedByName: data.performedByName,
        performedByRole: data.performedByRole,
        reason: data.reason,
        memberDetails: data.memberDetails,
        additionalData: data.additionalData
      });
      await log.save();
      console.log(`Member logged: ${data.action} - ${data.memberName} (${data.memberIdCode})`);
    } catch (error) {
      console.error('Error logging member:', error);
    }
  }

  // Helper methods for common logging scenarios
  static async logInstallmentCreated(installment, performedBy) {
    const user = await User.findById(performedBy);
    const member = await User.findById(installment.memberId);
    
    // Get balances before transaction
    const balancesBefore = await this.getSystemBalances(installment.memberId);
    
    // Get balances after transaction (simulate the effect)
    const balancesAfter = {
      fundBalance: balancesBefore.fundBalance + installment.amount,
      memberInvestmentBalance: balancesBefore.memberInvestmentBalance + installment.amount,
      memberInterestEarned: balancesBefore.memberInterestEarned
    };
    
    await this.logTransaction({
      type: 'installment',
      action: 'created',
      amount: installment.amount,
      memberId: installment.memberId,
      memberName: member.name,
      memberIdCode: member.memberId,
      referenceId: installment._id.toString(),
      referenceType: 'installment',
      description: `Installment of ₹${installment.amount} recorded for ${member.name}`,
      performedBy: performedBy,
      performedByName: user.name,
      fundImpact: installment.amount,
      balancesBefore,
      balancesAfter,
      additionalData: {
        date: installment.date,
        installmentId: installment._id
      }
    });
  }

  static async logInstallmentUpdated(installment, oldAmount, performedBy) {
    const user = await User.findById(performedBy);
    const member = await User.findById(installment.memberId);
    
    // Get balances before transaction
    const balancesBefore = await this.getSystemBalances(installment.memberId);
    
    // Get balances after transaction (simulate the effect)
    const amountDifference = installment.amount - oldAmount;
    const balancesAfter = {
      fundBalance: balancesBefore.fundBalance + amountDifference,
      memberInvestmentBalance: balancesBefore.memberInvestmentBalance + amountDifference,
      memberInterestEarned: balancesBefore.memberInterestEarned
    };
    
    await this.logTransaction({
      type: 'installment',
      action: 'updated',
      amount: Math.abs(installment.amount - oldAmount),
      memberId: installment.memberId,
      memberName: member.name,
      memberIdCode: member.memberId,
      referenceId: installment._id.toString(),
      referenceType: 'installment',
      description: `Installment updated for ${member.name}: ₹${oldAmount} → ₹${installment.amount}`,
      performedBy: performedBy,
      performedByName: user.name,
      previousAmount: oldAmount,
      newAmount: installment.amount,
      fundImpact: installment.amount - oldAmount,
      balancesBefore,
      balancesAfter,
      additionalData: {
        date: installment.date,
        installmentId: installment._id
      }
    });
  }

  static async logInstallmentDeleted(installment, performedBy) {
    const user = await User.findById(performedBy);
    const member = await User.findById(installment.memberId);
    
    // Get balances before transaction
    const balancesBefore = await this.getSystemBalances(installment.memberId);
    
    // Get balances after transaction (simulate the effect)
    const balancesAfter = {
      fundBalance: balancesBefore.fundBalance - installment.amount,
      memberInvestmentBalance: balancesBefore.memberInvestmentBalance - installment.amount,
      memberInterestEarned: balancesBefore.memberInterestEarned
    };
    
    await this.logTransaction({
      type: 'installment',
      action: 'deleted',
      amount: installment.amount,
      memberId: installment.memberId,
      memberName: member.name,
      memberIdCode: member.memberId,
      referenceId: installment._id.toString(),
      referenceType: 'installment',
      description: `Installment of ₹${installment.amount} deleted for ${member.name}`,
      performedBy: performedBy,
      performedByName: user.name,
      fundImpact: -installment.amount,
      balancesBefore,
      balancesAfter,
      additionalData: {
        date: installment.date,
        installmentId: installment._id
      }
    });
  }

  static async logLoanApproved(loan, performedBy) {
    const user = await User.findById(performedBy);
    const member = await User.findById(loan.memberId);
    
    // Get balances before transaction
    const balancesBefore = await this.getSystemBalances(loan.memberId);
    
    // Get balances after transaction (simulate the effect)
    const balancesAfter = {
      fundBalance: balancesBefore.fundBalance + loan.deduction, // Deduction adds to fund
      memberInvestmentBalance: balancesBefore.memberInvestmentBalance,
      memberInterestEarned: balancesBefore.memberInterestEarned + (loan.deduction / 46) // Assuming 46 members
    };
    
    await this.logTransaction({
      type: 'loan_approved',
      action: 'created',
      amount: loan.amount,
      memberId: loan.memberId,
      memberName: member.name,
      memberIdCode: member.memberId,
      referenceId: loan._id.toString(),
      referenceType: 'loan',
      description: `Loan of ₹${loan.amount} approved for ${member.name}`,
      performedBy: performedBy,
      performedByName: user.name,
      fundImpact: loan.deduction, // Deduction adds to fund
      balancesBefore,
      balancesAfter,
      additionalData: {
        loanAmount: loan.amount,
        deduction: loan.deduction,
        netAmount: loan.netAmount,
        interestRate: loan.interestRate,
        loanId: loan._id
      }
    });
  }

  static async logRepayment(loan, repaymentAmount, performedBy) {
    const user = await User.findById(performedBy);
    const member = await User.findById(loan.memberId);
    
    // Get balances before transaction
    const balancesBefore = await this.getSystemBalances(loan.memberId);
    
    // Get balances after transaction (simulate the effect)
    const balancesAfter = {
      fundBalance: balancesBefore.fundBalance + repaymentAmount,
      memberInvestmentBalance: balancesBefore.memberInvestmentBalance,
      memberInterestEarned: balancesBefore.memberInterestEarned
    };
    
    await this.logTransaction({
      type: 'repayment',
      action: 'created',
      amount: repaymentAmount,
      memberId: loan.memberId,
      memberName: member.name,
      memberIdCode: member.memberId,
      referenceId: loan._id.toString(),
      referenceType: 'loan',
      description: `Repayment of ₹${repaymentAmount} received from ${member.name}`,
      performedBy: performedBy,
      performedByName: user.name,
      fundImpact: repaymentAmount,
      balancesBefore,
      balancesAfter,
      additionalData: {
        loanAmount: loan.amount,
        outstanding: loan.outstanding,
        loanId: loan._id
      }
    });
  }

  static async logInterestPayment(loan, interestAmount, performedBy) {
    const user = await User.findById(performedBy);
    const member = await User.findById(loan.memberId);
    
    // Get balances before transaction
    const balancesBefore = await this.getSystemBalances(loan.memberId);
    
    // Get balances after transaction (simulate the effect)
    const balancesAfter = {
      fundBalance: balancesBefore.fundBalance + interestAmount,
      memberInvestmentBalance: balancesBefore.memberInvestmentBalance,
      memberInterestEarned: balancesBefore.memberInterestEarned + (interestAmount / 46) // Assuming 46 members
    };
    
    await this.logTransaction({
      type: 'interest_payment',
      action: 'created',
      amount: interestAmount,
      memberId: loan.memberId,
      memberName: member.name,
      memberIdCode: member.memberId,
      referenceId: loan._id.toString(),
      referenceType: 'loan',
      description: `Interest of ₹${interestAmount} calculated for ${member.name}'s loan`,
      performedBy: performedBy,
      performedByName: user.name,
      fundImpact: interestAmount,
      balancesBefore,
      balancesAfter,
      additionalData: {
        loanAmount: loan.amount,
        outstanding: loan.outstanding,
        loanId: loan._id
      }
    });
  }

  static async logInterestDistributed(amount, memberCount, performedBy) {
    const user = await User.findById(performedBy);
    
    // Get balances before transaction
    const balancesBefore = await this.getSystemBalances();
    
    // Get balances after transaction (simulate the effect)
    const balancesAfter = {
      fundBalance: balancesBefore.fundBalance + amount,
      memberInvestmentBalance: balancesBefore.memberInvestmentBalance,
      memberInterestEarned: balancesBefore.memberInterestEarned + (amount / memberCount)
    };
    
    await this.logTransaction({
      type: 'interest_distributed',
      action: 'created',
      amount: amount,
      description: `Interest of ₹${amount} distributed among ${memberCount} members`,
      performedBy: performedBy,
      performedByName: user.name,
      fundImpact: amount,
      balancesBefore,
      balancesAfter,
      additionalData: {
        memberCount: memberCount,
        perMemberAmount: amount / memberCount
      }
    });
  }

  static async logExpenseCreated(expense, performedBy) {
    const user = await User.findById(performedBy);
    
    // Get balances before transaction
    const balancesBefore = await this.getSystemBalances();
    
    // Get balances after transaction (simulate the effect)
    const balancesAfter = {
      fundBalance: balancesBefore.fundBalance - expense.amount,
      memberInvestmentBalance: balancesBefore.memberInvestmentBalance,
      memberInterestEarned: balancesBefore.memberInterestEarned - (expense.amount / 46) // Assuming 46 members
    };
    
    await this.logTransaction({
      type: 'expense',
      action: 'created',
      amount: expense.amount,
      description: `Expense of ₹${expense.amount} added: ${expense.description}`,
      performedBy: performedBy,
      performedByName: user.name,
      fundImpact: -expense.amount,
      balancesBefore,
      balancesAfter,
      additionalData: {
        description: expense.description,
        date: expense.date,
        expenseId: expense._id
      }
    });
  }

  static async logExpenseUpdated(expense, oldAmount, performedBy) {
    const user = await User.findById(performedBy);
    
    // Get balances before transaction
    const balancesBefore = await this.getSystemBalances();
    
    // Get balances after transaction (simulate the effect)
    const amountDifference = expense.amount - oldAmount;
    const balancesAfter = {
      fundBalance: balancesBefore.fundBalance - amountDifference,
      memberInvestmentBalance: balancesBefore.memberInvestmentBalance,
      memberInterestEarned: balancesBefore.memberInterestEarned - (amountDifference / 46) // Assuming 46 members
    };
    
    await this.logTransaction({
      type: 'expense',
      action: 'updated',
      amount: Math.abs(amountDifference),
      description: `Expense updated: ₹${oldAmount} → ₹${expense.amount} - ${expense.description}`,
      performedBy: performedBy,
      performedByName: user.name,
      previousAmount: oldAmount,
      newAmount: expense.amount,
      fundImpact: -amountDifference,
      balancesBefore,
      balancesAfter,
      additionalData: {
        description: expense.description,
        date: expense.date,
        expenseId: expense._id
      }
    });
  }

  static async logExpenseDeleted(expense, performedBy) {
    const user = await User.findById(performedBy);
    
    // Get balances before transaction
    const balancesBefore = await this.getSystemBalances();
    
    // Get balances after transaction (simulate the effect)
    const balancesAfter = {
      fundBalance: balancesBefore.fundBalance + expense.amount,
      memberInvestmentBalance: balancesBefore.memberInvestmentBalance,
      memberInterestEarned: balancesBefore.memberInterestEarned + (expense.amount / 46) // Assuming 46 members
    };
    
    await this.logTransaction({
      type: 'expense',
      action: 'deleted',
      amount: expense.amount,
      description: `Expense of ₹${expense.amount} deleted: ${expense.description}`,
      performedBy: performedBy,
      performedByName: user.name,
      fundImpact: expense.amount, // Deleting expense adds back to fund
      balancesBefore,
      balancesAfter,
      additionalData: {
        description: expense.description,
        date: expense.date,
        expenseId: expense._id
      }
    });
  }

  static async logLoanUpdated(loan, oldData, performedBy) {
    const user = await User.findById(performedBy);
    const member = await User.findById(loan.memberId);
    
    // Get balances before transaction
    const balancesBefore = await this.getSystemBalances(loan.memberId);
    
    // Calculate changes
    const amountDifference = loan.amount - oldData.amount;
    const deductionDifference = loan.deduction - oldData.deduction;
    
    // Get balances after transaction (simulate the effect)
    const balancesAfter = {
      fundBalance: balancesBefore.fundBalance + deductionDifference,
      memberInvestmentBalance: balancesBefore.memberInvestmentBalance,
      memberInterestEarned: balancesBefore.memberInterestEarned + (deductionDifference / 46) // Assuming 46 members
    };
    
    await this.logTransaction({
      type: 'loan_approved',
      action: 'updated',
      amount: Math.abs(amountDifference),
      memberId: loan.memberId,
      memberName: member.name,
      memberIdCode: member.memberId,
      referenceId: loan._id.toString(),
      referenceType: 'loan',
      description: `Loan updated for ${member.name}: ₹${oldData.amount} → ₹${loan.amount}`,
      performedBy: performedBy,
      performedByName: user.name,
      previousAmount: oldData.amount,
      newAmount: loan.amount,
      fundImpact: deductionDifference,
      balancesBefore,
      balancesAfter,
      additionalData: {
        loanAmount: loan.amount,
        oldLoanAmount: oldData.amount,
        deduction: loan.deduction,
        oldDeduction: oldData.deduction,
        netAmount: loan.netAmount,
        interestRate: loan.interestRate,
        loanId: loan._id
      }
    });
  }

  static async logLoanDeleted(loan, performedBy) {
    const user = await User.findById(performedBy);
    const member = await User.findById(loan.memberId);
    
    // Get balances before transaction
    const balancesBefore = await this.getSystemBalances(loan.memberId);
    
    // Get balances after transaction (simulate the effect)
    const balancesAfter = {
      fundBalance: balancesBefore.fundBalance - loan.deduction, // Deleting loan removes deduction from fund
      memberInvestmentBalance: balancesBefore.memberInvestmentBalance,
      memberInterestEarned: balancesBefore.memberInterestEarned - (loan.deduction / 46) // Assuming 46 members
    };
    
    await this.logTransaction({
      type: 'loan_approved',
      action: 'deleted',
      amount: loan.amount,
      memberId: loan.memberId,
      memberName: member.name,
      memberIdCode: member.memberId,
      referenceId: loan._id.toString(),
      referenceType: 'loan',
      description: `Loan of ₹${loan.amount} deleted for ${member.name}`,
      performedBy: performedBy,
      performedByName: user.name,
      fundImpact: -loan.deduction, // Deleting loan removes deduction from fund
      balancesBefore,
      balancesAfter,
      additionalData: {
        loanAmount: loan.amount,
        deduction: loan.deduction,
        netAmount: loan.netAmount,
        interestRate: loan.interestRate,
        loanId: loan._id
      }
    });
  }

  static async logRepaymentUpdated(loan, repaymentId, oldAmount, newAmount, performedBy) {
    const user = await User.findById(performedBy);
    const member = await User.findById(loan.memberId);
    
    // Get balances before transaction
    const balancesBefore = await this.getSystemBalances(loan.memberId);
    
    // Get balances after transaction (simulate the effect)
    const amountDifference = newAmount - oldAmount;
    const balancesAfter = {
      fundBalance: balancesBefore.fundBalance + amountDifference,
      memberInvestmentBalance: balancesBefore.memberInvestmentBalance,
      memberInterestEarned: balancesBefore.memberInterestEarned
    };
    
    await this.logTransaction({
      type: 'repayment',
      action: 'updated',
      amount: Math.abs(amountDifference),
      memberId: loan.memberId,
      memberName: member.name,
      memberIdCode: member.memberId,
      referenceId: loan._id.toString(),
      referenceType: 'loan',
      description: `Repayment updated for ${member.name}: ₹${oldAmount} → ₹${newAmount}`,
      performedBy: performedBy,
      performedByName: user.name,
      previousAmount: oldAmount,
      newAmount: newAmount,
      fundImpact: amountDifference,
      balancesBefore,
      balancesAfter,
      additionalData: {
        loanAmount: loan.amount,
        outstanding: loan.outstanding,
        loanId: loan._id,
        repaymentId: repaymentId
      }
    });
  }

  static async logRepaymentDeleted(loan, repaymentAmount, performedBy) {
    const user = await User.findById(performedBy);
    const member = await User.findById(loan.memberId);
    
    // Get balances before transaction
    const balancesBefore = await this.getSystemBalances(loan.memberId);
    
    // Get balances after transaction (simulate the effect)
    const balancesAfter = {
      fundBalance: balancesBefore.fundBalance - repaymentAmount,
      memberInvestmentBalance: balancesBefore.memberInvestmentBalance,
      memberInterestEarned: balancesBefore.memberInterestEarned
    };
    
    await this.logTransaction({
      type: 'repayment',
      action: 'deleted',
      amount: repaymentAmount,
      memberId: loan.memberId,
      memberName: member.name,
      memberIdCode: member.memberId,
      referenceId: loan._id.toString(),
      referenceType: 'loan',
      description: `Repayment of ₹${repaymentAmount} deleted for ${member.name}`,
      performedBy: performedBy,
      performedByName: user.name,
      fundImpact: -repaymentAmount,
      balancesBefore,
      balancesAfter,
      additionalData: {
        loanAmount: loan.amount,
        outstanding: loan.outstanding,
        loanId: loan._id
      }
    });
  }

  static async logMemberCreated(member, performedBy) {
    if (!member) {
      console.error('logMemberCreated: member is null or undefined');
      return;
    }

    const user = await User.findById(performedBy);
    if (!user) {
      console.error('logMemberCreated: user not found for performedBy:', performedBy);
      return;
    }
    
    await this.logMember({
      memberId: member._id,
      memberName: member.name,
      memberIdCode: member.memberId,
      action: 'created',
      performedBy: performedBy,
      performedByName: user.name,
      performedByRole: user.role,
      memberDetails: {
        name: member.name,
        phone: member.phone,
        memberId: member.memberId,
        role: member.role,
        paused: member.paused,
        investmentBalance: member.investmentBalance,
        interestEarned: member.interestEarned,
        createdAt: member.createdAt
      },
      additionalData: {
        memberId: member._id
      }
    });
  }

  static async logMemberUpdated(member, oldData, performedBy) {
    if (!member) {
      console.error('logMemberUpdated: member is null or undefined');
      return;
    }

    const user = await User.findById(performedBy);
    if (!user) {
      console.error('logMemberUpdated: user not found for performedBy:', performedBy);
      return;
    }
    
    // Track field changes
    const fieldChanges = [];
    if (oldData) {
      Object.keys(oldData).forEach(key => {
        if (oldData[key] !== member[key]) {
          fieldChanges.push({
            field: key,
            oldValue: oldData[key],
            newValue: member[key]
          });
        }
      });
    }
    
    await this.logMember({
      memberId: member._id,
      memberName: member.name,
      memberIdCode: member.memberId,
      action: 'updated',
      fieldChanges: fieldChanges,
      performedBy: performedBy,
      performedByName: user.name,
      performedByRole: user.role,
      memberDetails: {
        name: member.name,
        phone: member.phone,
        memberId: member.memberId,
        role: member.role,
        paused: member.paused,
        investmentBalance: member.investmentBalance,
        interestEarned: member.interestEarned,
        createdAt: member.createdAt
      },
      additionalData: {
        memberId: member._id
      }
    });
  }

  static async logMemberPaused(member, reason, performedBy) {
    if (!member) {
      console.error('logMemberPaused: member is null or undefined');
      return;
    }

    const user = await User.findById(performedBy);
    if (!user) {
      console.error('logMemberPaused: user not found for performedBy:', performedBy);
      return;
    }
    
    await this.logMember({
      memberId: member._id,
      memberName: member.name,
      memberIdCode: member.memberId,
      action: 'paused',
      performedBy: performedBy,
      performedByName: user.name,
      performedByRole: user.role,
      reason: reason,
      memberDetails: {
        name: member.name,
        phone: member.phone,
        memberId: member.memberId,
        role: member.role,
        paused: member.paused,
        investmentBalance: member.investmentBalance,
        interestEarned: member.interestEarned,
        createdAt: member.createdAt
      },
      additionalData: {
        memberId: member._id
      }
    });
  }

  static async logMemberUnpaused(member, reason, performedBy) {
    if (!member) {
      console.error('logMemberUnpaused: member is null or undefined');
      return;
    }

    const user = await User.findById(performedBy);
    if (!user) {
      console.error('logMemberUnpaused: user not found for performedBy:', performedBy);
      return;
    }
    
    await this.logMember({
      memberId: member._id,
      memberName: member.name,
      memberIdCode: member.memberId,
      action: 'unpaused',
      performedBy: performedBy,
      performedByName: user.name,
      performedByRole: user.role,
      reason: reason,
      memberDetails: {
        name: member.name,
        phone: member.phone,
        memberId: member.memberId,
        role: member.role,
        paused: member.paused,
        investmentBalance: member.investmentBalance,
        interestEarned: member.interestEarned,
        createdAt: member.createdAt
      },
      additionalData: {
        memberId: member._id
      }
    });
  }

  static async logUserLogin(user, action, ipAddress, userAgent, success = true, failureReason = null) {
    if (user && user._id) {
      await this.logLogin({
        userId: user._id,
        userName: user.name,
        userRole: user.role,
        action: action,
        ipAddress: ipAddress,
        userAgent: userAgent,
        success: success,
        failureReason: failureReason,
        additionalData: {
          memberId: user.memberId
        }
      });
    } else {
      console.warn('logUserLogin called without valid user; skipping strict schema log');
    }
  }
}

module.exports = Logger; 