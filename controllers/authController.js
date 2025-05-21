const User = require('../models/User');
const Employee = require('../models/Employee');
const validator = require('validator');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose'); // Added missing mongoose import

// Utility function to generate JWT token
const generateToken = (user) => {
  return jwt.sign(
    {
      id: user._id,
      role: user.role,
      designation: user.designation
    },
    process.env.JWT_SECRET,
    { expiresIn: '1d' }
  );
};

exports.register = async (req, res) => {
console.log('Incoming Register Request:', req.body);

    const { username, email, password, role, employeeId, employeeRole } = req.body;

    // Enhanced Basic Validation
    if (!username || !email || !password || !role) {
        return res.status(400).json({ success: false, message: 'Please provide all required fields: username, email, password, and role.' });
    }
    
    if (!validator.isEmail(email)) {
        return res.status(400).json({ success: false, message: 'Please provide a valid email address.' });
    }
    
    if (password.length < 8) { // Increased from 6 to 8 for better security
        return res.status(400).json({ 
            success: false, 
            message: 'Password must be at least 8 characters long.' 
        });
    }
    
    if (!['User', 'Admin'].includes(role)) {
        return res.status(400).json({ 
            success: false, 
            message: 'Invalid role specified. Must be either "User" or "Admin".' 
        });
    }
    
    // Additional validation for employee fields
    if (!employeeId) {
        return res.status(400).json({ 
            success: false, 
            message: 'Employee ID is required for registration.' 
        });
    }
    
    if (role === 'User' && !employeeRole) {
        return res.status(400).json({ 
            success: false, 
            message: 'Employee role is required for User registration.' 
        });
    }

    try {
        // Case insensitive check for existing username/email
        const existingUser = await User.findOne({
            $or: [
                { email: { $regex: `^${email}$`, $options: 'i' } },
                { username: { $regex: `^${username}$`, $options: 'i' } }
            ]
        });

        if (existingUser) {
            const conflictField = existingUser.email.toLowerCase() === email.toLowerCase() 
                ? 'Email' 
                : 'Username';
            return res.status(409).json({
                success: false,
                message: `${conflictField} is already registered. Please use a different ${conflictField.toLowerCase()}.`
            });
        }

        // Check for existing employee ID (exact match)
        const existingEmployeeId = await User.findOne({ 
            employeeId: employeeId.trim() 
        });

        if (existingEmployeeId) {
            return res.status(409).json({
                success: false,
                message: 'This employee ID is already registered. If this is your ID, please contact support.'
            });
        }

        // Role-specific employee validation
        let employee;
        if (role === 'Admin') {
            employee = await Employee.findOne({ 
                employeeId: employeeId.trim(),
                designation: 'District Collector'
            });
            
            if (!employee) {
                return res.status(403).json({ // Changed from 400 to 403 for forbidden access
                    success: false,
                    message: 'Only District Collectors with valid employee IDs can register as Admin.'
                });
            }
        } else if (role === 'User') {
            employee = await Employee.findOne({
                employeeId: employeeId.trim(),
                designation: employeeRole
            });
            
            if (!employee) {
                return res.status(403).json({
                    success: false,
                    message: `The provided employee ID doesn't match any ${employeeRole} in our records. Please verify your ID and position.`
                });
            }
        }

        const newUser = new User({
    username,
    email: email.toLowerCase(),
    password,
    role,
    employeeId: employeeId.trim(),
    designation: role === 'Admin' ? 'District Collector' : employeeRole,
    ...(role === 'User' && { employeeRole })
});

const savedUser = await newUser.save();

const token = generateToken(savedUser);

return res.status(201).json({
    success: true,
    token,
    user: {
        id: savedUser._id,
        username: savedUser.username,
        email: savedUser.email,
        role: savedUser.role,
        designation: savedUser.designation,
        employeeId: savedUser.employeeId
    }
});


    } catch (error) {
        console.error('Registration Error:', error);
        
        if (error.name === 'ValidationError') {
            const messages = Object.values(error.errors).map(val => val.message);
            return res.status(400).json({ 
                success: false, 
                message: 'Validation error: ' + messages.join('. ') 
            });
        }
        
        if (error.code === 11000) {
            return res.status(409).json({ // Changed from 400 to 409 for conflict
                success: false,
                message: 'This employee ID or user credentials are already registered. Please try different credentials.'
            });
        }

        res.status(500).json({ 
            success: false, 
            message: 'An unexpected error occurred during registration. Please try again later.' 
        });
    }
};

exports.getCurrentUser = async (req, res) => {
    try {
        const user = req.user;

        if (!user) {
            return res.status(401).json({ 
                success: false, 
                message: 'Unauthorized: No user information found.' 
            });
        }

        // Omit sensitive fields from response
        const userResponse = {
            id: user._id,
            username: user.username,
            email: user.email,
            role: user.role,
            designation: user.designation,
            ...(user.employeeId && { employeeId: user.employeeId }),
            ...(user.employeeRole && { employeeRole: user.employeeRole }),
            ...(user.district && { district: user.district }) // Added if you have district field
        };

        res.status(200).json({
            success: true,
            user: userResponse
        });
    } catch (error) {
        console.error('Error fetching current user:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to retrieve user information. Please try again.' 
        });
    }
};

exports.login = async (req, res) => {
  const { username, password, role, employeeId, employeeRole } = req.body; // Using employeeRole here

  // Basic input validation
  if (!username || !password) {
    return res.status(400).json({
      message: 'Username and password are required.',
    });
  }

  try {
    const user = await User.findOne({ username }).select('+password');

    if (!user) {
console.log('User not found');
      return res.status(401).json({
        message: 'Invalid credentials. Please check your username and password.',
      });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
console.log('Password mismatch');
      return res.status(401).json({
        message: 'Invalid credentials. Please check your username and password.',
      });
    }

    // Additional role validation if provided
    if (role && user.role !== role) {
      return res.status(403).json({
        message: `Access denied. Your account is registered as ${user.role}, not ${role}.`,
      });
    }

    // Designation validation for Users
    if (user.role === 'User' && employeeRole) { // Checking against employeeRole here
      if (!user.designation) {
        return res.status(400).json({
          message:
            'Your account is missing required designation information. Please contact support.',
        });
      }

      if (user.designation !== employeeRole) { // Comparing against designation in user
        return res.status(403).json({
          message: `Access denied. You are registered as ${user.designation}, not ${employeeRole}.`,
        });
      }
    }

    // Employee ID validation if provided
    if (employeeId && user.employeeId !== employeeId) {
      return res.status(403).json({
        message: 'Access denied. The provided employee ID does not match your registration.',
      });
    }

    const token = generateToken(user);

    // Omit sensitive fields from response
    const userResponse = {
      id: user._id,
      username: user.username,
      email: user.email,
      role: user.role,
      designation: user.designation,
      employeeId: user.employeeId,
    };

    res.json({
      success: true,
      token,
      user: userResponse,
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      message: 'Login failed due to a server error. Please try again later.',
    });
  }
};
