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

// Delete an installment
router.delete('/:id', authenticate, isAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const installment = await Installment.findById(id);
    if (!installment) {
      return res.status(404).json({ message: 'Installment not found' });
    }

    // Revert member's investment balance
    const member = await User.findById(installment.memberId);
    if (member) {
      member.investmentBalance = (member.investmentBalance || 0) - installment.amount;
      await member.save();
    }

    // Revert total fund
    const fund = await Fund.findOne();
    if (fund) {
      fund.totalFund = (fund.totalFund || 0) - installment.amount;
      await fund.save();
    }

    // Delete associated InvestmentHistory entry
    await InvestmentHistory.deleteMany({ refId: id, type: 'installment' });

    // Delete the installment
    await Installment.findByIdAndDelete(id);

    res.status(200).json({ message: 'Installment deleted successfully' });
  } catch (error) {
    console.error('Installment deletion error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update an installment
router.patch('/:id', authenticate, isAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { amount } = req.body; // New amount for the installment

    if (typeof amount === 'undefined' || isNaN(parseFloat(amount))) {
      return res.status(400).json({ message: 'New installment amount is required and must be a number.' });
    }
    const newAmount = parseFloat(amount);

    const installment = await Installment.findById(id);
    if (!installment) {
      return res.status(404).json({ message: 'Installment not found' });
    }

    const oldAmount = installment.amount; // Store the old amount
    const amountDifference = newAmount - oldAmount; // Positive if new > old, negative if new < old

    // 1. Update the installment document
    installment.amount = newAmount;
    await installment.save();

    // 2. Adjust member's investment balance
    const member = await User.findById(installment.memberId);
    if (member) {
      member.investmentBalance = (member.investmentBalance || 0) + amountDifference;
      await member.save();
    }

    // 3. Adjust total fund
    const fund = await Fund.findOne();
    if (fund) {
      fund.totalFund = (fund.totalFund || 0) + amountDifference;
      await fund.save();
    }

    // 4. Update associated InvestmentHistory entry
    const investmentHistory = await InvestmentHistory.findOne({ refId: id, type: 'installment' });
    if (investmentHistory) {
      investmentHistory.amount = newAmount;
      await investmentHistory.save();
    } else {
      // This case should ideally not happen if history is always created with installment
      // but as a fallback, create a new one if not found.
      const newInvestmentHistory = new InvestmentHistory({
        memberId: installment.memberId,
        amount: newAmount,
        type: 'installment',
        refId: installment._id.toString()
      });
      await newInvestmentHistory.save();
    }

    res.status(200).json(installment);

  } catch (error) {
    console.error('Installment update error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router; 