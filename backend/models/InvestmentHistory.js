const mongoose = require('mongoose');

const investmentHistorySchema = new mongoose.Schema({
  memberId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  amount: Number, // positive for addition, negative for withdrawal
  type: { type: String, enum: ['installment', 'interest', 'deduction', 'withdrawal'] },
  date: { type: Date, default: Date.now },
  refId: String, // reference to installment, earnings_distributions, etc.
});

module.exports = mongoose.model('InvestmentHistory', investmentHistorySchema); 