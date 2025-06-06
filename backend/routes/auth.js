const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { generateMemberId } = require('../utils/helpers');

// Login route
router.post('/login', async (req, res) => {
  try {
    const { memberId, password } = req.body;

    // Find user by memberId
    const user = await User.findOne({ memberId });
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Check password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Generate JWT token
    const token = jwt.sign(
      { 
        id: user._id,
        memberId: user.memberId,
        role: user.role 
      },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '24h' }
    );

    // Return user data and token
    const userData = {
      id: user._id,
      memberId: user.memberId,
      name: user.name,
      role: user.role,
      investmentBalance: user.investmentBalance || 0,
      token
    };

    res.json(userData);
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Create member route
router.post('/members', async (req, res) => {
  try {
    const { name, phone } = req.body;

    // Validate phone number
    if (!/^[6-9]\d{9}$/.test(phone)) {
      return res.status(400).json({ message: 'Invalid phone number format' });
    }

    // Check if phone number already exists
    const existingUser = await User.findOne({ phone });
    if (existingUser) {
      return res.status(400).json({ message: 'Phone number already registered' });
    }

    // Generate unique member ID
    const memberId = await generateMemberId();
    
    // Generate random password (8 characters)
    const password = Math.random().toString(36).slice(-8);

    // Create new user
    const user = new User({
      memberId,
      password,
      name,
      phone,
      role: 'member',
    });

    await user.save();

    // Return member ID and password
    res.json({
      memberId,
      password,
      name,
    });
  } catch (error) {
    console.error('Create member error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Change password route (for members)
router.post('/change-password', async (req, res) => {
  try {
    const { memberId, currentPassword, newPassword } = req.body;

    // Find user
    const user = await User.findOne({ memberId });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Verify current password
    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      return res.status(401).json({ message: 'Current password is incorrect' });
    }

    // Update password
    user.password = newPassword;
    await user.save();

    res.json({ message: 'Password changed successfully' });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Request password reset (for admin)
router.post('/request-reset', async (req, res) => {
  try {
    const { phone } = req.body;

    // Find admin user
    const admin = await User.findOne({ phone, role: 'admin' });
    if (!admin) {
      return res.status(404).json({ message: 'Admin not found' });
    }

    // Generate reset token
    const resetToken = Math.random().toString(36).slice(-8);
    admin.resetPasswordToken = resetToken;
    admin.resetPasswordExpires = Date.now() + 3600000; // 1 hour
    await admin.save();

    // In a real application, you would send this token via SMS
    // For now, we'll return it in the response
    res.json({ 
      message: 'Reset token generated',
      resetToken,
      expiresIn: '1 hour'
    });
  } catch (error) {
    console.error('Request reset error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Reset password (for admin)
router.post('/reset-password', async (req, res) => {
  try {
    const { phone, resetToken, newPassword } = req.body;

    // Find admin user
    const admin = await User.findOne({
      phone,
      role: 'admin',
      resetPasswordToken: resetToken,
      resetPasswordExpires: { $gt: Date.now() }
    });

    if (!admin) {
      return res.status(400).json({ message: 'Invalid or expired reset token' });
    }

    // Update password
    admin.password = newPassword;
    admin.resetPasswordToken = undefined;
    admin.resetPasswordExpires = undefined;
    await admin.save();

    res.json({ message: 'Password reset successful' });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get all members route
router.get('/members', async (req, res) => {
  try {
    // Get token from header
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ message: 'No authentication token, access denied' });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    
    // Check if user is admin
    if (decoded.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied. Admin only.' });
    }

    const members = await User.find({ role: 'member' })
      .select('memberId name phone')
      .sort({ createdAt: -1 });
    res.json(members);
  } catch (error) {
    console.error('Get members error:', error);
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ message: 'Invalid token' });
    }
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router; 