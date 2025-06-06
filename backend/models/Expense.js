const mongoose = require('mongoose');

const expenseSchema = new mongoose.Schema({
  amount: Number,
  date: { type: Date, default: Date.now },
  description: String,
  recordedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
});

module.exports = mongoose.model('Expense', expenseSchema); 