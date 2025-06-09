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
    const { memberId, amount, interestRate, date } = req.body;
    
    // Calculate deduction (2% of amount)
    const deduction = amount * 0.02;
    const netAmount = amount - deduction;

    // Create loan with provided date or current date
    const loan = new Loan({
      memberId,
      amount,
      interestRate,
      deduction,
      netAmount,
      outstanding: amount,
      approvedBy: req.user.userId,
      date: date ? new Date(date) : new Date() // Use provided date or current date
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
      memberIds: activeMembers.map(m => m._id),
      refId: loan._id.toString()
    });

    await earningsDistribution.save();

    // Update each member's investment balance and interest earned
    for (const member of activeMembers) {
      // Only update interestEarned, not investmentBalance
      member.interestEarned = Number(member.interestEarned || 0) + perMemberAmount;
      await member.save();

      // Create investment history entry for each member
      const memberHistory = new InvestmentHistory({
        memberId: member._id,
        amount: perMemberAmount,
        type: 'deduction',
        refId: loan._id.toString()
      });
      await memberHistory.save();
    }

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

// Delete a repayment from a loan
router.delete('/:loanId/repayment/:repaymentId', authenticate, isAdmin, async (req, res) => {
  try {
    const { loanId, repaymentId } = req.params;

    const loan = await Loan.findById(loanId);
    if (!loan) {
      return res.status(404).json({ message: 'Loan not found' });
    }

    const repaymentIndex = loan.repayments.findIndex(r => r._id.toString() === repaymentId);
    if (repaymentIndex === -1) {
      return res.status(404).json({ message: 'Repayment not found' });
    }

    const deletedRepayment = loan.repayments[repaymentIndex];

    // 1. Revert loan outstanding amount
    loan.outstanding = Number(loan.outstanding || 0) + deletedRepayment.amount;

    // 2. Adjust total fund
    const fund = await Fund.findOne();
    if (fund) {
      fund.totalFund = Number(fund.totalFund || 0) - deletedRepayment.amount; // Repayment decreases fund upon deletion
      await fund.save();
    }

    // 3. Revert interest distribution if any
    const interestPaymentIndex = loan.interestPayments.findIndex(ip => ip.date.getTime() === deletedRepayment.date.getTime()); // Assuming matching date for now

    if (interestPaymentIndex !== -1) {
      const deletedInterestPayment = loan.interestPayments[interestPaymentIndex];
      const earningsDistribution = await EarningsDistribution.findById(deletedInterestPayment.distributionId);

      if (earningsDistribution) {
        // Revert members' interestEarned
        for (const memberId of earningsDistribution.memberIds) {
          const member = await User.findById(memberId);
          if (member) {
            member.interestEarned = Number(member.interestEarned || 0) - earningsDistribution.perMemberAmount;
            await member.save();
          }
        }
        // Delete associated InvestmentHistory entries for this interest distribution
        await InvestmentHistory.deleteMany({ refId: earningsDistribution._id.toString(), type: 'interest' }); // Assuming refId for interest history

        // Delete the EarningsDistribution entry
        await EarningsDistribution.findByIdAndDelete(earningsDistribution._id);

        // Also revert the fund for the interest amount
        if (fund) {
          fund.totalFund = Number(fund.totalFund || 0) - deletedInterestPayment.amount; // Interest also decreases fund upon deletion
          await fund.save();
        }
      }
      // Remove the interest payment from the loan
      loan.interestPayments.splice(interestPaymentIndex, 1);
    }

    // 4. Remove the repayment from the loan
    loan.repayments.splice(repaymentIndex, 1);

    await loan.save();

    res.status(200).json({ message: 'Repayment deleted successfully', loan });
  } catch (error) {
    console.error('Repayment deletion error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update a repayment on a loan
router.patch('/:loanId/repayment/:repaymentId', authenticate, isAdmin, async (req, res) => {
  try {
    const { loanId, repaymentId } = req.params;
    const { amount } = req.body; // New amount for the repayment

    if (typeof amount === 'undefined' || isNaN(parseFloat(amount))) {
      return res.status(400).json({ message: 'New repayment amount is required and must be a number.' });
    }
    const newRepaymentAmount = parseFloat(amount);

    const loan = await Loan.findById(loanId);
    if (!loan) {
      return res.status(404).json({ message: 'Loan not found' });
    }

    const repaymentIndex = loan.repayments.findIndex(r => r._id.toString() === repaymentId);
    if (repaymentIndex === -1) {
      return res.status(404).json({ message: 'Repayment not found' });
    }

    const oldRepayment = loan.repayments[repaymentIndex];
    const oldRepaymentAmount = oldRepayment.amount;
    const amountDifference = newRepaymentAmount - oldRepaymentAmount;

    // 1. Update loan outstanding amount
    loan.outstanding = Number(loan.outstanding || 0) - amountDifference; // If new > old, outstanding decreases more

    // 2. Adjust total fund
    const fund = await Fund.findOne();
    if (fund) {
      fund.totalFund = Number(fund.totalFund || 0) + amountDifference; // If new > old, fund increases more
      await fund.save();
    }

    // 3. Revert old interest distribution if any, and apply new interest distribution
    const oldInterestPaymentIndex = loan.interestPayments.findIndex(ip => ip.date.getTime() === oldRepayment.date.getTime());
    let oldInterestAmount = 0;
    let oldEarningsDistributionId = null;

    if (oldInterestPaymentIndex !== -1) {
      const oldInterestPayment = loan.interestPayments[oldInterestPaymentIndex];
      oldInterestAmount = oldInterestPayment.amount;
      oldEarningsDistributionId = oldInterestPayment.distributionId;

      // Revert members' interestEarned for the old interest amount
      const oldEarningsDistribution = await EarningsDistribution.findById(oldEarningsDistributionId);
      if (oldEarningsDistribution) {
        for (const memberId of oldEarningsDistribution.memberIds) {
          const member = await User.findById(memberId);
          if (member) {
            member.interestEarned = Number(member.interestEarned || 0) - oldEarningsDistribution.perMemberAmount;
            await member.save();
          }
        }
        // Delete associated InvestmentHistory entries for old interest
        await InvestmentHistory.deleteMany({ refId: oldEarningsDistribution._id.toString(), type: 'interest' });
        await EarningsDistribution.findByIdAndDelete(oldEarningsDistribution._id); // Delete old earnings distribution
      }
      loan.interestPayments.splice(oldInterestPaymentIndex, 1); // Remove old interest payment from loan

      // Also revert the fund for the old interest amount
      if (fund) {
        fund.totalFund = Number(fund.totalFund || 0) - oldInterestAmount;
        await fund.save();
      }
    }

    // Calculate new interest based on the loan's outstanding before this repayment
    // This assumes interest is calculated on the outstanding amount *before* the current repayment is applied
    const interestAmount = Number(loan.outstanding) * 0.01; // Recalculate interest based on current outstanding

    if (interestAmount > 0) {
      const activeMembers = await User.find({ role: 'member', paused: false });
      if (activeMembers.length > 0) {
        const earningsDistribution = new EarningsDistribution({
          type: 'interest',
          totalAmount: interestAmount,
          perMemberAmount: interestAmount / activeMembers.length,
          memberIds: activeMembers.map(m => m._id),
          refId: loan._id.toString() // Link interest to loan
        });
        await earningsDistribution.save();

        loan.interestPayments.push({
          amount: interestAmount,
          date: new Date(),
          distributionId: earningsDistribution._id,
        });

        if (fund) {
          fund.totalFund = Number(fund.totalFund || 0) + interestAmount;
          await fund.save();
        }

        const perMemberAmount = interestAmount / activeMembers.length;
        for (const member of activeMembers) {
          member.interestEarned = Number(member.interestEarned || 0) + perMemberAmount;
          await member.save();

          const memberHistory = new InvestmentHistory({
            memberId: member._id,
            amount: perMemberAmount,
            type: 'interest',
            refId: earningsDistribution._id.toString() // Link history to earnings distribution
          });
          await memberHistory.save();
        }
      }
    }

    // 4. Update the repayment in the loan's repayments array
    loan.repayments[repaymentIndex].amount = newRepaymentAmount;
    loan.repayments[repaymentIndex].date = new Date(); // Update date to current date as well

    await loan.save();

    res.status(200).json({ message: 'Repayment updated successfully', loan });

  } catch (error) {
    console.error('Repayment update error:', error);
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
          // Only update interestEarned, not investmentBalance
          member.interestEarned = Number(member.interestEarned || 0) + perMemberAmount;
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

    // Add repayment to loan if amount is not 0
    if (repaymentAmount > 0) {
      loan.repayments.push({ amount: repaymentAmount, date: new Date() });
    }
    
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

// Update a loan
router.patch('/:loanId', authenticate, isAdmin, async (req, res) => {
  try {
    const { loanId } = req.params;
    const updateData = req.body;

    const loan = await Loan.findById(loanId);
    if (!loan) {
      return res.status(404).json({ message: 'Loan not found' });
    }

    // Check if loan has any repayments or interest payments
    if (loan.repayments && loan.repayments.length > 0) {
      return res.status(400).json({ 
        message: 'Cannot edit loan amount. Loan has existing repayments.' 
      });
    }

    if (loan.interestPayments && loan.interestPayments.length > 0) {
      return res.status(400).json({ 
        message: 'Cannot edit loan amount. Loan has existing interest payments.' 
      });
    }

    // If amount is being updated, handle deduction changes
    if (updateData.amount && updateData.amount !== loan.amount) {
      const oldDeduction = Number(loan.deduction.toFixed(2));
      const newDeduction = Number((updateData.amount * 0.02).toFixed(2));
      const deductionDifference = Number((newDeduction - oldDeduction).toFixed(2));

      // Update fund with deduction difference
      const fund = await Fund.findOne();
      if (fund) {
        fund.totalFund = Number((Number(fund.totalFund || 0) + deductionDifference).toFixed(2));
        await fund.save();
      }

      // Get active members for distribution
      const activeMembers = await User.find({ role: 'member', paused: false });
      const perMemberAmount = Number((deductionDifference / activeMembers.length).toFixed(2));

      // Update each member's interest earned
      for (const member of activeMembers) {
        const oldInterestEarned = Number(member.interestEarned || 0);
        member.interestEarned = Number((oldInterestEarned + perMemberAmount).toFixed(2));
        await member.save();

        // Create investment history entry for each member
        const memberHistory = new InvestmentHistory({
          memberId: member._id,
          amount: perMemberAmount,
          type: 'deduction',
          refId: loan._id.toString()
        });
        await memberHistory.save();
      }

      // Delete ALL earnings distribution entries related to this loan
      await EarningsDistribution.deleteMany({
        $or: [
          { refId: loan._id.toString() },
          { type: 'deduction', refId: loan._id.toString() },
          { type: 'interest', refId: loan._id.toString() }
        ]
      });

      // Create new earnings distribution for deduction difference
      const earningsDistribution = new EarningsDistribution({
        type: 'deduction',
        totalAmount: deductionDifference,
        perMemberAmount,
        memberIds: activeMembers.map(m => m._id),
        refId: loan._id.toString()
      });
      await earningsDistribution.save();
    }

    // Update loan fields
    Object.keys(updateData).forEach(key => {
      if (key !== '_id' && key !== 'memberId' && key !== 'approvedBy') {
        loan[key] = updateData[key];
      }
    });

    await loan.save();
    res.status(200).json(loan);
  } catch (error) {
    console.error('Loan update error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete a loan
router.delete('/:loanId', authenticate, isAdmin, async (req, res) => {
  try {
    const { loanId } = req.params;

    const loan = await Loan.findById(loanId);
    if (!loan) {
      return res.status(404).json({ message: 'Loan not found' });
    }

    // Check if loan has any repayments or interest payments
    if (loan.repayments && loan.repayments.length > 0) {
      return res.status(400).json({ 
        message: 'Cannot delete loan. Loan has existing repayments.' 
      });
    }

    if (loan.interestPayments && loan.interestPayments.length > 0) {
      return res.status(400).json({ 
        message: 'Cannot delete loan. Loan has existing interest payments.' 
      });
    }

    // Calculate current deduction based on current loan amount
    const currentDeduction = Number((loan.amount * 0.02).toFixed(2));

    // Revert the deduction from the fund
    const fund = await Fund.findOne();
    if (fund) {
      fund.totalFund = Number((Number(fund.totalFund || 0) - currentDeduction).toFixed(2));
      await fund.save();
    }

    // Get active members for deduction reversal
    const activeMembers = await User.find({ role: 'member', paused: false });
    const perMemberDeduction = Number((currentDeduction / activeMembers.length).toFixed(2));

    // Revert deduction from each member's interest earned
    for (const member of activeMembers) {
      const oldInterestEarned = Number(member.interestEarned || 0);
      member.interestEarned = Number((oldInterestEarned - perMemberDeduction).toFixed(2));
      await member.save();

      // Create investment history entry for deduction reversal
      const memberHistory = new InvestmentHistory({
        memberId: member._id,
        amount: -perMemberDeduction,
        type: 'deduction',
        refId: loan._id.toString()
      });
      await memberHistory.save();
    }

    // Delete all earnings distribution entries related to this loan
    await EarningsDistribution.deleteMany({
      $or: [
        { refId: loan._id.toString() },
        { type: 'deduction', refId: loan._id.toString() }
      ]
    });

    // Delete associated InvestmentHistory entries
    await InvestmentHistory.deleteMany({
      $or: [
        { refId: loan._id.toString() },
        { type: 'deduction', refId: loan._id.toString() }
      ]
    });

    // Delete the loan
    await Loan.findByIdAndDelete(loanId);

    res.status(200).json({ message: 'Loan deleted successfully' });
  } catch (error) {
    console.error('Loan deletion error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router; 