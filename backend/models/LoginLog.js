const logDb = require('../services/logDb');
const mongoose = require('mongoose');

const loginLogSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  userName: {
    type: String,
    required: true
  },
  userRole: {
    type: String,
    enum: ['admin', 'member'],
    required: true
  },
  action: {
    type: String,
    enum: ['login', 'logout', 'failed_login', 'password_change', 'profile_update', 'session_timeout'],
    required: true
  },
  ipAddress: {
    type: String,
    required: false
  },
  userAgent: {
    type: String,
    required: false
  },
  deviceInfo: {
    type: String,
    required: false
  },
  success: {
    type: Boolean,
    default: true
  },
  failureReason: {
    type: String,
    required: false
  },
  sessionDuration: {
    type: Number, // in minutes
    required: false
  },
  activities: [{
    action: String,
    description: String,
    timestamp: {
      type: Date,
      default: Date.now
    },
    details: mongoose.Schema.Types.Mixed
  }],
  date: {
    type: Date,
    default: Date.now
  },
  additionalData: {
    type: mongoose.Schema.Types.Mixed,
    required: false
  }
});

// Index for better query performance
loginLogSchema.index({ userId: 1, date: -1 });
loginLogSchema.index({ action: 1, date: -1 });
loginLogSchema.index({ userRole: 1, date: -1 });

module.exports = logDb.model('LoginLog', loginLogSchema); 