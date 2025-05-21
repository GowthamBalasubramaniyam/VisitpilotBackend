// backend/models/Employee.js
const mongoose = require('mongoose');

const EmployeeSchema = new mongoose.Schema({
    employeeId: {
        type: String,
        required: [true, 'Employee ID is required'],
        unique: true,
        trim: true,
    },
    name: {
        type: String,
        required: [true, 'Employee name is required'],
        trim: true,
    },
    designation: {
    type: String,
    required: true,
    enum: [
      'District Collector',
      'Revenue Divisional Officer (RDO)',
      'Tahsildar',
      'Block Development Officer (BDO)',
      'Chief/District Educational Officer (CEO/DEO)',
      'Deputy Director of Health Services (DDHS)',
      'District Social Welfare Officer (DSWO)',
      'Executive Engineer (PWD/Highways/Rural Dev)',
      'District Supply Officer (DSO)'
    ]
  },
employeeRole: { // For backward compatibility
    type: String,
    enum: [
      'Revenue Divisional Officer (RDO)',
      'Tahsildar',
      'Block Development Officer (BDO)',
      'Chief/District Educational Officer (CEO/DEO)',
      'Deputy Director of Health Services (DDHS)',
      'District Social Welfare Officer (DSWO)',
      'Executive Engineer (PWD/Highways/Rural Dev)',
      'District Supply Officer (DSO)'
    ]
  }
    // Add other relevant fields like department, joining date, etc.
}, { timestamps: true }); // Adds createdAt and updatedAt fields

module.exports = mongoose.model('Employee', EmployeeSchema);