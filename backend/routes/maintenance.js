const express = require('express');
const router = express.Router();
const AppConfig = require('../models/AppConfig');
const authenticate = require('../middleware/authenticate');
const User = require('../models/User');

// Admin check middleware
const isAdmin = async (req, res, next) => {
  try {
    const user = await User.findById(req.user?.userId);
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied' });
    }
    next();
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

// Get maintenance status (public so client can read before login)
router.get('/', async (req, res) => {
  try {
    const doc = await AppConfig.findOne({ key: 'maintenance' });
    res.json({ enabled: Boolean(doc?.value?.enabled), message: doc?.value?.message || 'The app is under maintenance.' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Set maintenance status (admin only)
router.post('/', authenticate, isAdmin, async (req, res) => {
  try {
    const { enabled, message } = req.body;
    const value = {
      enabled: Boolean(enabled),
      message: message || 'The app is under maintenance.'
    };
    const doc = await AppConfig.findOneAndUpdate(
      { key: 'maintenance' },
      { key: 'maintenance', value },
      { upsert: true, new: true }
    );
    res.json({ enabled: Boolean(doc.value.enabled), message: doc.value.message });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;


