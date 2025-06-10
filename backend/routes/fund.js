const express = require('express');
const router = express.Router();
const Fund = require('../models/Fund');
const User = require('../models/User');
const EarningsDistribution = require('../models/EarningsDistribution');
const authenticate = require('../middleware/authenticate');
const mongoose = require('mongoose');

// Get fund information
router.get('/', authenticate, async (req, res) => {
  try {
    const fund = await Fund.findOne();
    res.json({ totalFund: fund ? fund.totalFund : 0 });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Get total interest distributed (for admin dashboard)
router.get('/total-interest', authenticate, async (req, res) => {
  try {
    const allDistributions = await EarningsDistribution.find({
      type: 'interest'
    });
    const totalInterest = allDistributions.reduce((sum, dist) => sum + dist.totalAmount, 0);
    res.json({ totalInterest });
  } catch (error) {
    console.error('Total interest error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get interest earned by a member
router.get('/interest/:memberId', authenticate, async (req, res) => {
  try {
    const memberId = req.params.memberId;
    const distributions = await EarningsDistribution.find({
      memberIds: new mongoose.Types.ObjectId(memberId),
      type: 'interest'
    });
    const totalInterest = distributions.reduce((sum, dist) => sum + dist.perMemberAmount, 0);
    res.json({ interest: totalInterest, distributions });
  } catch (error) {
    console.error('Member interest error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get share value
router.get('/share-value', authenticate, async (req, res) => {
  try {
    const fund = await Fund.findOne();
    const totalMembers = await User.countDocuments({ role: 'member' });
    
    // Get total interest distributed
    const allDistributions = await EarningsDistribution.find({
      type: 'interest'
    });
    const totalInterest = allDistributions.reduce((sum, dist) => sum + dist.totalAmount, 0);

    // Get total expenses
    const allExpenses = await EarningsDistribution.find({
      type: 'expense'
    });
    const totalExpenses = allExpenses.reduce((sum, exp) => sum + exp.totalAmount, 0);
    
    let shareValue = 0;
    if (fund && totalMembers > 0) {
      // Base share value from total fund (installments)
      const baseShareValue = fund.totalFund / totalMembers;
      
      // Add interest per member
      const interestPerMember = totalInterest / totalMembers;
      
      // Subtract expenses per member
      const expensesPerMember = totalExpenses / totalMembers;
      
      // Total share value = (Installments + Interest - Expenses) / Number of Members
      shareValue = baseShareValue + interestPerMember - expensesPerMember;
    }

    // Debug log
    console.log('[Share Value API]', {
      fund: fund ? fund.totalFund : null,
      totalMembers,
      totalInterest,
      totalExpenses,
      shareValue,
      baseShareValue: fund ? fund.totalFund / totalMembers : 0,
      interestPerMember: totalInterest / totalMembers,
      expensesPerMember: totalExpenses / totalMembers
    });

    res.json({ 
      shareValue, 
      fund: fund ? fund.totalFund : null, 
      totalMembers,
      totalInterest,
      totalExpenses,
      baseShareValue: fund ? fund.totalFund / totalMembers : 0,
      interestPerMember: totalInterest / totalMembers,
      expensesPerMember: totalExpenses / totalMembers
    });
  } catch (error) {
    console.error('Share value error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get total interest distributed this month (for admin dashboard)
router.get('/total-interest-this-month', authenticate, async (req, res) => {
  try {
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    
    const allDistributions = await EarningsDistribution.find({
      type: 'interest',
      date: { $gte: firstDay, $lte: lastDay }
    });
    
    const totalInterestThisMonth = allDistributions.reduce((sum, dist) => sum + dist.totalAmount, 0);
    res.json({ totalInterestThisMonth });
  } catch (error) {
    console.error('Monthly interest error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get total interest distributed by date range
router.get('/total-interest-by-range', authenticate, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const query = { type: 'interest' };

    if (startDate || endDate) {
      query.date = {};
      if (startDate) {
        // Set start date to beginning of the day
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        query.date.$gte = start;
      }
      if (endDate) {
        // Set end date to end of the day
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        query.date.$lte = end;
      }
    }
    
    console.log('Interest query:', query); // Debug log
    
    const allDistributions = await EarningsDistribution.find(query);
    console.log('Found distributions:', allDistributions.length); // Debug log
    
    const totalInterest = allDistributions.reduce((sum, dist) => sum + dist.totalAmount, 0);
    res.json({ totalInterest, distributions: allDistributions }); // Include distributions in response
  } catch (error) {
    console.error('Total interest by range error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get member's investment balance
router.get('/investment/:memberId', authenticate, async (req, res) => {
  try {
    const memberId = req.params.memberId;
    const member = await User.findById(memberId);
    
    if (!member) {
      return res.status(404).json({ message: 'Member not found' });
    }

    res.json({ 
      investmentBalance: member.investmentBalance || 0,
      memberId: member.memberId,
      name: member.name
    });
  } catch (error) {
    console.error('Investment balance error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router; 