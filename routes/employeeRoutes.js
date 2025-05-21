const express = require('express');
const { body } = require('express-validator');
const employeeController = require('../controllers/employeeController');
const { validateRequest, authenticateToken, authorizeAdmin } = require('../middleware/authMiddleware');

const router = express.Router();

// Validate employee ID - public route for registration
router.get('/validate/:id', employeeController.validateEmployeeId);

// Create employee - protected admin route
router.post(
  '/',
  authenticateToken,
  authorizeAdmin,
  [
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('officialId').trim().notEmpty().withMessage('Official ID is required'),
    body('designation').trim().notEmpty().withMessage('Designation is required'),
    body('department').trim().notEmpty().withMessage('Department is required')
  ],
  validateRequest,
  employeeController.createEmployee
);

// Get all employees - protected admin route
router.get('/', authenticateToken, authorizeAdmin, employeeController.getAllEmployees);

module.exports = router;