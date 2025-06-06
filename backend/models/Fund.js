const mongoose = require('mongoose');

const fundSchema = new mongoose.Schema({
  totalFund: { type: Number, default: 0 },
  lastUpdated: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Fund', fundSchema); 