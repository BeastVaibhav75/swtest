const express = require('express');
const router = express.Router();
const Installment = require('../models/Installment');
const User = require('../models/User');
const InvestmentHistory = require('../models/InvestmentHistory');
const Fund = require('../models/Fund');
const authenticate = require('../middleware/authenticate');

// Test endpoint
router.get('/test', (req, res) => {
  res.json({ message: 'Installments route is working' });
});

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

// Get all installments (admin only)
router.get('/', authenticate, isAdmin, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const query = {};

    if (startDate || endDate) {
      query.date = {};
      if (startDate) {
        query.date.$gte = new Date(startDate);
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        query.date.$lte = end;
      }
    }

    const installments = await Installment.find(query)
      .populate('memberId', 'name memberId')
      .populate('recordedBy', 'name');
    res.json(installments);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Get installments for a specific member (admin only)
router.get('/member/:memberId', authenticate, isAdmin, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const query = { memberId: req.params.memberId };

    if (startDate || endDate) {
      query.date = {};
      if (startDate) {
        query.date.$gte = new Date(startDate);
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        query.date.$lte = end;
      }
    }

    const installments = await Installment.find(query)
      .populate('memberId', 'name memberId')
      .populate('recordedBy', 'name');
    res.json(installments);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Get member's own installments
router.get('/my-installments', authenticate, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const query = { memberId: req.user.userId };

    if (startDate || endDate) {
      query.date = {};
      if (startDate) {
        query.date.$gte = new Date(startDate);
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        query.date.$lte = end;
      }
    }

    const installments = await Installment.find(query)
      .populate('memberId', 'name memberId')
      .populate('recordedBy', 'name')
      .sort({ date: -1 });
    res.json(installments);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Create new installment
router.post('/', authenticate, isAdmin, async (req, res) => {
  try {
    const { memberId, amount, date } = req.body;

    // Create installment
    const installment = new Installment({
      memberId,
      amount,
      date: date || new Date(),
      recordedBy: req.user.userId
    });

    await installment.save();

    // Update member's investment balance
    const member = await User.findById(memberId);
    if (member) {
      member.investmentBalance += amount;
      await member.save();

      // Create investment history entry
      const investmentHistory = new InvestmentHistory({
        memberId,
        amount,
        type: 'installment',
        refId: installment._id.toString()
      });
      await investmentHistory.save();
    }

    // Update total fund
    const fund = await Fund.findOne();
    if (fund) {
      fund.totalFund = (fund.totalFund || 0) + amount;
      await fund.save();
    } else {
      // Create new fund if it doesn't exist
      const newFund = new Fund({
        totalFund: amount
      });
      await newFund.save();
    }

    res.status(201).json(installment);
  } catch (error) {
    console.error('Installment creation error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router; 