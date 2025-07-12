const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const authenticate = require('../middleware/authenticate');
const { generateMemberId } = require('../utils/helpers');
const Logger = require('../services/logger');

// Middleware to check if user is admin
const isAdmin = async (req, res, next) => {
  try {
    console.log('isAdmin middleware: Checking user for admin access');
    const user = await User.findById(req.user?.userId);
    if (!user) {
      console.log('isAdmin middleware: No user found');
    } else {
      console.log('isAdmin middleware: User found:', user.memberId, 'Role:', user.role);
    }
    if (!user || user.role !== 'admin') {
      console.log('isAdmin middleware: Access denied');
      return res.status(403).json({ message: 'Access denied' });
    }
    next();
  } catch (error) {
    console.log('isAdmin middleware: Server error', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get all members
router.get('/', authenticate, isAdmin, async (req, res) => {
  try {
    console.log('GET /api/members called');
    const members = await User.find({ role: 'member' }).select('-password');
    console.log('GET /api/members: Found', members.length, 'members');
    res.json(members);
  } catch (error) {
    console.log('GET /api/members: Server error', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Add new member
router.post('/', authenticate, isAdmin, async (req, res) => {
  try {
    const { name, phone } = req.body;

    // Validate phone number
    if (!/^[6-9]\d{9}$/.test(phone)) {
      return res.status(400).json({ message: 'Invalid phone number format' });
    }

    // Check if phone number already exists
    // const existingUser = await User.findOne({ phone });
    // if (existingUser) {
    //   return res.status(400).json({ message: 'Phone number already registered' });
    // }

    // Generate unique member ID
    const memberId = await generateMemberId();
    
    // Generate random password (8 characters)
    const password = Math.random().toString(36).slice(-8);

    // Create new member
    const member = new User({
      memberId,
      password,
      name,
      phone,
      role: 'member',
    });

    await member.save();

    // Log the member creation
    await Logger.logMemberCreated(member, req.user.userId);

    res.status(201).json({
      memberId,
      password,
      name,
    });
  } catch (error) {
    console.error('Create member error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete member
router.delete('/:id', authenticate, isAdmin, async (req, res) => {
  try {
    const member = await User.findOne({ _id: req.params.id, role: 'member' });
    if (!member) {
      return res.status(404).json({ message: 'Member not found' });
    }

    await member.remove();
    res.json({ message: 'Member deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Pause member
router.post('/:id/pause', authenticate, isAdmin, async (req, res) => {
  try {
    const member = await User.findOne({ _id: req.params.id, role: 'member' });
    if (!member) {
      return res.status(404).json({ message: 'Member not found' });
    }

    member.paused = true;
    await member.save();
    
    // Log the member pause
    await Logger.logMemberPaused(member, 'Member paused by admin', req.user.userId);
    
    res.json({ message: 'Member paused successfully' });
  } catch (error) {
    console.error('Pause member error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Unpause member
router.post('/:id/unpause', authenticate, isAdmin, async (req, res) => {
  try {
    const member = await User.findOne({ _id: req.params.id, role: 'member' });
    if (!member) {
      return res.status(404).json({ message: 'Member not found' });
    }

    member.paused = false;
    await member.save();
    
    // Log the member unpause
    await Logger.logMemberUnpaused(member, 'Member unpaused by admin', req.user.userId);
    
    res.json({ message: 'Member unpaused successfully' });
  } catch (error) {
    console.error('Unpause member error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update member
router.patch('/:id', authenticate, isAdmin, async (req, res) => {
  try {
    const { name, phone, password, adminPassword } = req.body;
    const member = await User.findOne({ _id: req.params.id, role: 'member' });
    
    if (!member) {
      return res.status(404).json({ message: 'Member not found' });
    }

    // Verify admin password
    const admin = await User.findById(req.user.userId);
    if (!admin) {
      return res.status(404).json({ message: 'Admin not found' });
    }

    const isPasswordValid = await admin.comparePassword(adminPassword);
    if (!isPasswordValid) {
      return res.status(401).json({ message: 'Invalid admin password' });
    }

    // Validate phone number if provided
    if (phone && !/^[6-9]\d{9}$/.test(phone)) {
      return res.status(400).json({ message: 'Invalid phone number format' });
    }

    // Check if new phone number already exists for another user
    // if (phone && phone !== member.phone) {
    //   const existingUser = await User.findOne({ phone });
    //   if (existingUser) {
    //     return res.status(400).json({ message: 'Phone number already registered' });
    //   }
    // }

    // Store old data for logging
    const oldData = {
      name: member.name,
      phone: member.phone,
      password: member.password
    };

    // Update fields if provided
    if (name) member.name = name;
    if (phone) member.phone = phone;
    if (password) member.password = password;

    await member.save();
    
    // Log the member update
    await Logger.logMemberUpdated(member, oldData, req.user.userId);
    
    res.json({ message: 'Member updated successfully' });
  } catch (error) {
    console.error('Update member error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router; 