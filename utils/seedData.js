require('dotenv').config();
const mongoose = require('mongoose');
const Employee = require('../models/Employee');

mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/fieldvisit', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const generateEmployeeId = (prefix) => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // readable characters only
  let id = '';
  for (let i = 0; i < 6; i++) {
    id += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `${prefix}-${id}`;
};

const officials = [
  { role: 'District Collector', prefix: 'IAS' },
  { role: 'Revenue Divisional Officer (RDO)', prefix: 'RDO' },
  { role: 'Tahsildar', prefix: 'TAH' },
  { role: 'Block Development Officer (BDO)', prefix: 'BDO' },
  { role: 'Chief/District Educational Officer (CEO/DEO)', prefix: 'EDU' },
  { role: 'Deputy Director of Health Services (DDHS)', prefix: 'DDHS' },
  { role: 'District Social Welfare Officer (DSWO)', prefix: 'DSWO' },
  { role: 'Executive Engineer (PWD/Highways/Rural Dev)', prefix: 'ENG' },
  { role: 'District Supply Officer (DSO)', prefix: 'DSO' },
];

const employees = officials.map((official) => ({
  name: official.role,
  employeeId: generateEmployeeId(official.prefix), // ✅ correct field name
  designation: official.role,
  department: 'District Administration',
  active: true,
}));

const seedEmployees = async () => {
  try {
    await Employee.deleteMany({});
    console.log('✅ Cleared existing employee records');

    const createdEmployees = await Employee.insertMany(employees);
    console.log('\n🌟 District-level employee IDs created:');
    console.table(
      createdEmployees.map((emp) => ({
        Name: emp.name,
        'Employee ID': emp.employeeId,
        Designation: emp.designation,
      }))
    );

    console.log('\n📌 Use these IDs for testing admin registration.\n');
    mongoose.disconnect();
  } catch (err) {
    console.error('❌ Error seeding data:', err);
    mongoose.disconnect();
    process.exit(1);
  }
};

seedEmployees();
