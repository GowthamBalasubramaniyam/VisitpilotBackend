const express = require('express');
const router = express.Router();
const Visit = require('../models/Visit');
const { authenticateToken } = require('../middleware/authMiddleware');
const Employee = require('../models/Employee');
const mongoose = require('mongoose');
const multer = require('multer');
const path = require('path');
const SubmittedVisit = require('../models/SubmittedVisit');
const User = require('../models/User');
const bcrypt = require('bcrypt');

// In your backend routes (e.g., userRoutes.js)
router.put('/update-profile', authenticateToken, async (req, res) => {
  console.log('[PUT] /update-profile HIT');

  try {
    const { username, email, password } = req.body;
    const userId = req.user.id;
    console.log('User ID from token:', userId);
    console.log('Request body:', req.body);

    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized: No user ID found in token' });
    }

    const updateFields = {};
    if (username) updateFields.username = username;
    if (email) {
      // Optional email regex validation:
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({ message: 'Invalid email format' });
      }
      updateFields.email = email;
    }
    if (password) {
      const hashedPassword = await bcrypt.hash(password, 10);
      updateFields.password = hashedPassword;
    }

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { $set: updateFields },
      { new: true, select: '-password' }
    );

    if (!updatedUser) {
      console.log('No user found with that ID');
      return res.status(404).json({ message: 'User not found' });
    }

    console.log('User updated successfully:', updatedUser);

    res.json({
      message: 'Profile updated successfully',
      username: updatedUser.username,
      email: updatedUser.email
    });
  } catch (error) {
    console.error('Error updating profile:', error.message, error.stack);
    res.status(500).json({ message: 'Failed to update profile' });
  }
});

module.exports = router;