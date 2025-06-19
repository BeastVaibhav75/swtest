const logDb = require('../services/logDb');
const mongoose = require('mongoose');

const memberLogSchema = new mongoose.Schema({
  memberId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  memberName: {
    type: String,
    required: true
  },
  memberIdCode: {
    type: String,
    required: true
  },
  action: {
    type: String,
    enum: ['created', 'updated', 'paused', 'unpaused', 'deleted', 'password_changed', 'profile_updated'],
    required: true
  },
  fieldChanges: [{
    field: String,
    oldValue: mongoose.Schema.Types.Mixed,
    newValue: mongoose.Schema.Types.Mixed
  }],
  performedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  performedByName: {
    type: String,
    required: true
  },
  performedByRole: {
    type: String,
    enum: ['admin', 'member'],
    required: true
  },
  reason: {
    type: String,
    required: false
  },
  memberDetails: {
    name: String,
    phone: String,
    memberId: String,
    role: String,
    paused: Boolean,
    investmentBalance: Number,
    interestEarned: Number,
    createdAt: Date
  },
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
memberLogSchema.index({ memberId: 1, date: -1 });
memberLogSchema.index({ action: 1, date: -1 });
memberLogSchema.index({ performedBy: 1, date: -1 });

module.exports = logDb.model('MemberLog', memberLogSchema); 