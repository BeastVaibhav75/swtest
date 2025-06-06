const mongoose = require('mongoose');

const earningsDistributionSchema = new mongoose.Schema({
  type: { type: String, enum: ['interest', 'deduction', 'expense'] },
  totalAmount: Number,
  date: { type: Date, default: Date.now },
  perMemberAmount: Number,
  memberIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
});

module.exports = mongoose.model('EarningsDistribution', earningsDistributionSchema); 