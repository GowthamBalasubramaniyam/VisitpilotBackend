// backend/routes/employees.js
const express = require('express');
const { validateEmployeeId } = require('../controllers/employeeController');
const router = express.Router();
const { authenticateToken } = require('../middleware/authMiddleware');
const Employee = require('../models/Employee');
const auth = require('../middleware/auth');
// Route: GET /api/employees/validate/:employeeId
// Desc:  Validate if an Employee ID exists and belongs to a District Collector
// Access: Public (or protected if needed)
router.get('/validate/:employeeId', validateEmployeeId);
router.post('/verify', authenticateToken, async (req, res) => {
  const { employeeId, requiredPosition } = req.body;
  
  const employee = await Employee.findOne({ 
    officialId: employeeId,
    position: requiredPosition 
  });

  res.json({ 
    success: !!employee,
    employee: employee || null 
  });
});
module.exports = router;