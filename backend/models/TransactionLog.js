const logDb = require('../services/logDb');
const mongoose = require('mongoose');

const transactionLogSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['installment', 'loan_approved', 'repayment', 'interest_payment', 'interest_distributed', 'expense', 'deduction'],
    required: true
  },
  action: {
    type: String,
    enum: ['created', 'updated', 'deleted'],
    required: true
  },
  amount: {
    type: Number,
    required: true
  },
  memberId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false // For expenses, might not have a specific member
  },
  memberName: {
    type: String,
    required: false
  },
  memberIdCode: {
    type: String,
    required: false
  },
  referenceId: {
    type: String, // ID of the related document (loan, installment, etc.)
    required: false
  },
  referenceType: {
    type: String, // 'loan', 'installment', 'expense', etc.
    required: false
  },
  description: {
    type: String,
    required: true
  },
  performedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  performedByName: {
    type: String,
    required: true
  },
  date: {
    type: Date,
    default: Date.now
  },
  previousAmount: {
    type: Number,
    required: false // For updates, store the previous amount
  },
  newAmount: {
    type: Number,
    required: false // For updates, store the new amount
  },
  fundImpact: {
    type: Number, // How this transaction affects the total fund
    required: false
  },
  balancesBefore: {
    fundBalance: { type: Number, default: 0 },
    memberInvestmentBalance: { type: Number, default: 0 },
    memberInterestEarned: { type: Number, default: 0 }
  },
  balancesAfter: {
    fundBalance: { type: Number, default: 0 },
    memberInvestmentBalance: { type: Number, default: 0 },
    memberInterestEarned: { type: Number, default: 0 }
  },
  additionalData: {
    type: mongoose.Schema.Types.Mixed, // For any additional data
    required: false
  }
});

// Index for better query performance
transactionLogSchema.index({ type: 1, date: -1 });
transactionLogSchema.index({ memberId: 1, date: -1 });
transactionLogSchema.index({ performedBy: 1, date: -1 });

module.exports = logDb.model('TransactionLog', transactionLogSchema); 