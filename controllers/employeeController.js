// backend/controllers/employeeController.js
const Employee = require('../models/Employee');

exports.validateEmployeeId = async (req, res) => {
    const { employeeId: rawId } = req.params; // Get raw ID from URL parameter

    if (!rawId) {
        return res.status(400).json({ isValid: false, message: 'Employee ID parameter is missing.' });
    }

    try {
        const employee = await Employee.findOne({ employeeId: rawId });

        if (!employee) {
            return res.status(400).json({ isValid: false, message: 'Employee ID not found.' });
        }

        // CRUCIAL CHECK: Validate if the employee has the required designation
        if (employee.designation !== 'District Collector') {
            return res.status(400).json({ isValid: false, message: 'Only District Collector ID is accepted for Admin role.' });
        }

        // If found and designation is correct
        res.status(200).json({
            isValid: true,
            message: 'Employee ID is valid.',
            employee: {
                employeeId: employee.employeeId,
                // Add any other non-sensitive info if needed by frontend
                // name: employee.name // Example
            }
        });

    } catch (error) {
        console.error('Employee validation error:', error);
        res.status(500).json({ isValid: false, message: 'Server error during employee validation.' });
    }
};