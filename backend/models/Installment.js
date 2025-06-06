const mongoose = require('mongoose');

const installmentSchema = new mongoose.Schema({
  memberId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  amount: Number,
  date: { type: Date, default: Date.now },
  type: { type: String, default: 'installment' },
  recordedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
});

module.exports = mongoose.model('Installment', installmentSchema); 