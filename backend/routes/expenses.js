const express = require('express');
const router = express.Router();
const Expense = require('../models/Expense');
const User = require('../models/User');
const EarningsDistribution = require('../models/EarningsDistribution');
const authenticate = require('../middleware/authenticate');
const Fund = require('../models/Fund');
const InvestmentHistory = require('../models/InvestmentHistory');

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

// Get all expenses
router.get('/', authenticate, isAdmin, async (req, res) => {
  try {
    const expenses = await Expense.find()
      .populate('recordedBy', 'name');
    res.json(expenses);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Create new expense
router.post('/', authenticate, isAdmin, async (req, res) => {
  try {
    const { amount, description } = req.body;

    // Create expense
    const expense = new Expense({
      amount,
      description,
      recordedBy: req.user.userId
    });

    await expense.save();

    // Update fund
    const fund = await Fund.findOne();
    if (fund) {
      fund.totalFund = (fund.totalFund || 0) - amount;
      await fund.save();
    } else {
      // Create new fund if it doesn't exist
      const newFund = new Fund({
        totalFund: -amount
      });
      await newFund.save();
        }

    // Get only active (non-paused) members for distribution
    const activeMembers = await User.find({ role: 'member', paused: false });
    const perMemberAmount = -amount / activeMembers.length;

    // Create earnings distribution for expense
    const earningsDistribution = new EarningsDistribution({
      type: 'expense',
      totalAmount: -amount,
      perMemberAmount,
      memberIds: activeMembers.map(m => m._id),
      refId: expense._id.toString()
    });

    await earningsDistribution.save();

    // Update each member's investment balance
    for (const member of activeMembers) {
      member.investmentBalance = (member.investmentBalance || 0) + perMemberAmount;
      await member.save();

      // Create investment history entry for each member
      const memberHistory = new InvestmentHistory({
        memberId: member._id,
        amount: perMemberAmount,
        type: 'deduction',
        refId: expense._id.toString()
      });
      await memberHistory.save();
    }

    res.status(201).json(expense);
  } catch (error) {
    console.error('Expense creation error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete an expense
router.delete('/:id', authenticate, isAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const expense = await Expense.findById(id);

    if (!expense) {
      return res.status(404).json({ message: 'Expense not found' });
    }

    // Revert fund deduction
    const fund = await Fund.findOne();
    if (fund) {
      fund.totalFund = (fund.totalFund || 0) + expense.amount; // Add back the deducted amount
      await fund.save();
    }

    // Revert member investment balances and delete related earnings distribution/investment history
    const earningsDistribution = await EarningsDistribution.findOne({ refId: id, type: 'expense' });
    console.log('Expense being deleted:', expense);
    console.log('Found EarningsDistribution:', earningsDistribution);

    if (earningsDistribution) {
      // Revert investment balance for each affected member
      for (const memberId of earningsDistribution.memberIds) {
        const member = await User.findById(memberId);
        if (member) {
          console.log(`Member ${member.name} (ID: ${member._id}) - Balance BEFORE: ${member.investmentBalance}`);
          console.log(`EarningsDistribution perMemberAmount: ${earningsDistribution.perMemberAmount}`);
          member.investmentBalance = (member.investmentBalance || 0) + Math.abs(earningsDistribution.perMemberAmount); // Add the absolute amount back
          await member.save();
          console.log(`Member ${member.name} (ID: ${member._id}) - Balance AFTER: ${member.investmentBalance}`);
        }
      }
      // Delete associated InvestmentHistory entries
      await InvestmentHistory.deleteMany({ refId: id });

      // Delete the earnings distribution entry
      await EarningsDistribution.findByIdAndDelete(earningsDistribution._id);
    }

    // Delete the expense
    await Expense.findByIdAndDelete(id);

    res.status(200).json({ message: 'Expense deleted successfully' });
  } catch (error) {
    console.error('Expense deletion error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router; 