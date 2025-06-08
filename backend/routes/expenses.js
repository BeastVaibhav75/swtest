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

    console.log('Expense _id after saving:', expense._id.toString());

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

    console.log('EarningsDistribution refId before saving:', earningsDistribution.refId);

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

// Update an expense
router.patch('/:id', authenticate, isAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { amount } = req.body; // New amount for the expense

    if (typeof amount === 'undefined' || isNaN(parseFloat(amount))) {
      return res.status(400).json({ message: 'New amount is required and must be a number.' });
    }

    const newAmount = parseFloat(amount);

    const expense = await Expense.findById(id);
    if (!expense) {
      return res.status(404).json({ message: 'Expense not found' });
    }

    const oldAmount = expense.amount; // Store the old amount
    const amountDifference = newAmount - oldAmount; // Positive if new > old, negative if new < old

    // 1. Update the expense document
    expense.amount = newAmount;
    await expense.save();

    // 2. Adjust the total fund
    const fund = await Fund.findOne();
    if (fund) {
      fund.totalFund = (fund.totalFund || 0) - amountDifference; // Subtracting difference updates fund correctly
      await fund.save();
    }

    // 3. Update EarningsDistribution and member investment balances
    const earningsDistribution = await EarningsDistribution.findOne({ refId: id, type: 'expense' });

    if (earningsDistribution) {
      // Revert old impact on members' balances
      for (const memberId of earningsDistribution.memberIds) {
        const member = await User.findById(memberId);
        if (member) {
          member.investmentBalance = (member.investmentBalance || 0) + Math.abs(earningsDistribution.perMemberAmount);
          await member.save();
        }
      }

      // Update earningsDistribution for the new amount
      const activeMembers = await User.find({ role: 'member', paused: false }); // Fetch active members again if needed
      const newPerMemberAmount = -newAmount / activeMembers.length;

      earningsDistribution.totalAmount = -newAmount;
      earningsDistribution.perMemberAmount = newPerMemberAmount;
      await earningsDistribution.save();

      // Apply new impact on members' balances
      for (const member of activeMembers) {
        member.investmentBalance = (member.investmentBalance || 0) + newPerMemberAmount; // Add the new negative amount
        await member.save();
      }

      // Update InvestmentHistory entries as well (optional, depending on granularity needed)
      // For now, we will update existing ones or create new if not found
      for (const member of activeMembers) {
        let history = await InvestmentHistory.findOne({ memberId: member._id, refId: id, type: 'deduction' });
        if (history) {
          history.amount = newPerMemberAmount; // Update existing history entry
          await history.save();
        } else {
          // Create new history entry if not found (e.g., for very old expenses)
          const memberHistory = new InvestmentHistory({
            memberId: member._id,
            amount: newPerMemberAmount,
            type: 'deduction',
            refId: expense._id.toString()
          });
          await memberHistory.save();
        }
      }
    }

    res.status(200).json(expense);
  } catch (error) {
    console.error('Expense update error:', error);
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

    if (earningsDistribution) {
      // Revert investment balance for each affected member
      for (const memberId of earningsDistribution.memberIds) {
        const member = await User.findById(memberId);
        if (member) {
          member.investmentBalance = (member.investmentBalance || 0) + Math.abs(earningsDistribution.perMemberAmount); // Add the absolute amount back
          await member.save();
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