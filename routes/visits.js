// backend/routes/visits.js
const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const jwt = require('jsonwebtoken');
const Visit = require('../models/Visit');
const Employee = require('../models/Employee');

// 1. Define verifyToken middleware directly in this file
const verifyToken = (req, res, next) => {
  const token = req.headers['authorization']?.split(' ')[1];
  
  if (!token) {
    return res.status(403).json({ message: 'No token provided' });
  }

  jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key', (err, decoded) => {
    if (err) {
      return res.status(403).json({ message: 'Invalid or expired token' });
    }
    req.user = decoded;
    next();
  });
};

// 2. Configure Multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  }
});

const upload = multer({ 
  storage,
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

// 3. Define routes

// GET all visits
router.get('/', verifyToken, async (req, res) => {
  try {
    const visits = await Visit.find().sort({ createdAt: -1 });
    res.json(visits);
  } catch (err) {
    console.error('Error fetching visits:', err);
    res.status(500).json({ message: 'Failed to fetch visits' });
  }
});

// Verify employee
router.post('/verify-employee', verifyToken, async (req, res) => {
  try {
    const { visitId, employeeId, requiredPosition } = req.body;

    const employee = await Employee.findOne({ 
      officialId: employeeId,
      position: requiredPosition
    });

    if (!employee) {
      return res.status(400).json({ 
        success: false,
        message: 'Invalid employee ID or position mismatch' 
      });
    }

    const visit = await Visit.findById(visitId);
    if (!visit) {
      return res.status(404).json({
        success: false,
        message: 'Visit not found'
      });
    }

    res.json({
      success: true,
      message: 'Verification successful',
      employeeName: employee.name
    });

  } catch (err) {
    console.error('Verification error:', err);
    res.status(500).json({
      success: false,
      message: 'Server error during verification'
    });
  }
});

// Submit visit report
router.post('/submit', verifyToken, upload.array('photos', 5), async (req, res) => {
  try {
    const { visitId, place, location, userId, username } = req.body;
    const photos = req.files?.map(file => file.path) || [];

    const newVisit = new Visit({
      visitId,
      place,
      location,
      userId,
      username,
      submittedAt: new Date(),
      photos,
      status: 'pending'
    });

    await newVisit.save();

    res.status(201).json({
      success: true,
      message: 'Visit submitted successfully',
      data: newVisit
    });
  } catch (error) {
    console.error('Error submitting visit:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to submit visit'
    });
  }
});

module.exports = router;