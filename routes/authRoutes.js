const express = require('express');
const { body } = require('express-validator');
const authController = require('../controllers/authController');
const User = require('../models/User');
const { validateRequest, authenticateToken } = require('../middleware/authMiddleware');
const router = express.Router();
// Register user
router.post(
  '/register',
  [
    body('username')
      .trim()
      .notEmpty().withMessage('Username is required')
      .isLength({ min: 3 }).withMessage('Username must be at least 3 characters long'),
    body('email')
      .trim()
      .notEmpty().withMessage('Email is required')
      .isEmail().withMessage('Please provide a valid email'),
    body('password')
      .trim()
      .notEmpty().withMessage('Password is required')
      .isLength({ min: 6 }).withMessage('Password must be at least 6 characters long'),
    body('role')
      .trim()
      .notEmpty().withMessage('Role is required')
      .isIn(['User', 'Admin']).withMessage('Role must be either User or Admin'),
    body('employeeId')
      .if((value, { req }) => req.body.role === 'Admin' || req.body.role === 'User')
      .trim()
      .notEmpty().withMessage('Employee ID is required'),
    body('employeeRole')
      .if((value, { req }) => req.body.role === 'User')
      .trim()
      .notEmpty().withMessage('Employee role is required for Users')
      .isIn([
        'Revenue Divisional Officer (RDO)',
        'Tahsildar',
        'Block Development Officer (BDO)',
        'Chief/District Educational Officer (CEO/DEO)',
        'Deputy Director of Health Services (DDHS)',
        'District Social Welfare Officer (DSWO)',
        'Executive Engineer (PWD/Highways/Rural Dev)',
        'District Supply Officer (DSO)'
      ]).withMessage('Invalid employee role selected')
  ],
  validateRequest,
  authController.register
);



// Login user
router.post(
  '/login',
  [
    body('username')
      .trim()
      .notEmpty().withMessage('Username is required'),
    body('password')
      .trim()
      .notEmpty().withMessage('Password is required'),
    body('role')
      .trim()
      .notEmpty().withMessage('Role is required')
      .isIn(['User', 'Admin']).withMessage('Role must be either User or Admin'),
    body('employeeId')
      .if((value, { req }) => req.body.role === 'Admin' || req.body.role === 'User')
      .trim()
      .notEmpty().withMessage('Employee ID is required'),
    body('employeeRole')
      .if((value, { req }) => req.body.role === 'User')
      .trim()
      .notEmpty().withMessage('Employee role is required for Users')
      .isIn([
        'Revenue Divisional Officer (RDO)',
        'Tahsildar',
        'Block Development Officer (BDO)',
        'Chief/District Educational Officer (CEO/DEO)',
        'Deputy Director of Health Services (DDHS)',
        'District Social Welfare Officer (DSWO)',
        'Executive Engineer (PWD/Highways/Rural Dev)',
        'District Supply Officer (DSO)'
      ]).withMessage('Invalid employee role selected')
  ],
  validateRequest,
  authController.login
);


// Get current user
router.get('/me', authenticateToken, authController.getCurrentUser);
router.get('/check-employee-id/:employeeId', async (req, res) => {
  try {
    const user = await User.findOne({ employeeId: req.params.employeeId });
    res.json({ exists: !!user });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});
module.exports = router;