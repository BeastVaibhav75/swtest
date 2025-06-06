const mongoose = require('mongoose');

const repaymentSchema = new mongoose.Schema({
  amount: Number,
  date: Date,
});

const interestPaymentSchema = new mongoose.Schema({
  amount: Number,
  date: Date,
  distributionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Distribution' }
});

const loanSchema = new mongoose.Schema({
  memberId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  amount: Number,
  date: { type: Date, default: Date.now },
  interestRate: Number,
  status: { type: String, enum: ['active', 'closed'], default: 'active' },
  deduction: Number, // 2% of amount
  netAmount: Number, // amount after deduction
  repayments: [repaymentSchema],
  interestPayments: [interestPaymentSchema],
  outstanding: Number, // current principal = amount - sum(repayments)
  approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
});

module.exports = mongoose.model('Loan', loanSchema); 