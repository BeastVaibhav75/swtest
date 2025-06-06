const express = require('express');
const router = express.Router();
const Loan = require('../models/Loan');
const User = require('../models/User');
const InvestmentHistory = require('../models/InvestmentHistory');
const EarningsDistribution = require('../models/EarningsDistribution');
const Fund = require('../models/Fund');
const authenticate = require('../middleware/authenticate');

// Middleware to check if user is admin
const isAdmin = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied' });
    }
    next();
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

// Get all loans
router.get('/', authenticate, isAdmin, async (req, res) => {
  try {
    const loans = await Loan.find()
      .populate('memberId', 'name memberId')
      .populate('approvedBy', 'name');
    res.json(loans);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Get loans for a specific member
router.get('/member/:memberId', authenticate, isAdmin, async (req, res) => {
  try {
    const loans = await Loan.find({ memberId: req.params.memberId })
      .populate('memberId', 'name memberId')
      .populate('approvedBy', 'name');
    res.json(loans);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Get loans for a specific member (for members to view their own loans)
router.get('/my-loans', authenticate, async (req, res) => {
  try {
    const loans = await Loan.find({ memberId: req.user.userId })
      .populate('memberId', 'name memberId')
      .populate('approvedBy', 'name');
    res.json(loans);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Create new loan
router.post('/', authenticate, isAdmin, async (req, res) => {
  try {
    const { memberId, amount, interestRate } = req.body;
    
    // Calculate deduction (2% of amount)
    const deduction = amount * 0.02;
    const netAmount = amount - deduction;

    // Create loan
    const loan = new Loan({
      memberId,
      amount,
      interestRate,
      deduction,
      netAmount,
      outstanding: amount,
      approvedBy: req.user.userId
    });

    await loan.save();

    // Create investment history entry for deduction
    const investmentHistory = new InvestmentHistory({
      memberId,
      amount: -deduction,
      type: 'deduction',
      refId: loan._id.toString()
    });

    await investmentHistory.save();

    // Get only active (non-paused) members for distribution
    const activeMembers = await User.find({ role: 'member', paused: false });
    const perMemberAmount = deduction / activeMembers.length;

    // Create earnings distribution for deduction
    const earningsDistribution = new EarningsDistribution({
      type: 'deduction',
      totalAmount: deduction,
      perMemberAmount,
      memberIds: activeMembers.map(m => m._id)
    });

    await earningsDistribution.save();

    // Update total fund with deduction
    const fund = await Fund.findOne();
    if (fund) {
      fund.totalFund = (fund.totalFund || 0) + deduction;
      await fund.save();
    } else {
      // Create new fund if it doesn't exist
      const newFund = new Fund({
        totalFund: deduction
      });
      await newFund.save();
    }

    res.status(201).json(loan);
  } catch (error) {
    console.error('Loan creation error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Add repayment to loan
router.post('/:loanId/repayment', authenticate, isAdmin, async (req, res) => {
  try {
    const { amount } = req.body;
    const loan = await Loan.findById(req.params.loanId);
    
    if (!loan) {
      return res.status(404).json({ message: 'Loan not found' });
    }

    // Convert amount to number and validate
    const repaymentAmount = Number(amount);
    if (isNaN(repaymentAmount)) {
      return res.status(400).json({ message: 'Invalid repayment amount' });
    }

    // If repayment amount is 0, skip adding it to repayments
    if (repaymentAmount === 0) {
      return res.status(200).json({ message: 'Repayment amount is 0, no update made.' });
    }

    // Calculate 1% interest on the outstanding amount before repayment
    const interestAmount = Number(loan.outstanding) * 0.01;
    let interestDistributed = false;

    // If there's interest to distribute
    if (interestAmount > 0) {
      // Get only active (non-paused) members
      const activeMembers = await User.find({ role: 'member', paused: false });
      
      if (activeMembers.length > 0) {
        // Store the full interest amount in earnings distribution
        const earningsDistribution = new EarningsDistribution({
          type: 'interest',
          totalAmount: interestAmount,
          perMemberAmount: interestAmount / activeMembers.length,
          memberIds: activeMembers.map(m => m._id)
        });
        await earningsDistribution.save();

        // Add interest payment record to the loan
        loan.interestPayments.push({
          amount: interestAmount,
          date: new Date(),
          distributionId: earningsDistribution._id
        });

        // Update total fund with full interest amount
        const fund = await Fund.findOne();
        if (fund) {
          fund.totalFund = Number(fund.totalFund || 0) + interestAmount;
          await fund.save();
        } else {
          const newFund = new Fund({
            totalFund: interestAmount
          });
          await newFund.save();
        }

        // Update each member's investment balance with their share
        const perMemberAmount = interestAmount / activeMembers.length;
        for (const member of activeMembers) {
          member.investmentBalance = Number(member.investmentBalance || 0) + perMemberAmount;
          await member.save();

          // Create investment history entry for each member
          const memberHistory = new InvestmentHistory({
            memberId: member._id,
            amount: perMemberAmount,
            type: 'interest',
            refId: earningsDistribution._id.toString()
          });
          await memberHistory.save();
        }
        interestDistributed = true;
      }
    }

    // Add repayment to loan
    loan.repayments.push({ amount: repaymentAmount, date: new Date() });
    
    // Calculate new outstanding amount - ensure all numbers are properly converted
    const totalRepayments = loan.repayments.reduce((sum, r) => sum + Number(r.amount || 0), 0);
    const newOutstanding = Math.max(0, Number(loan.amount) - totalRepayments);
    loan.outstanding = newOutstanding;
    
    if (loan.outstanding <= 0) {
      loan.status = 'closed';
    }
    
    await loan.save();
    res.status(200).json(loan);
  } catch (error) {
    console.error('Repayment error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router; 