const mongoose = require('mongoose');

const appConfigSchema = new mongoose.Schema({
  key: { type: String, required: true, unique: true, index: true },
  value: { type: mongoose.Schema.Types.Mixed, required: true },
  updatedAt: { type: Date, default: Date.now }
});

appConfigSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

module.exports = mongoose.model('AppConfig', appConfigSchema);


