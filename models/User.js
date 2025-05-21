// backend/models/User.js
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const validator = require('validator');

const UserSchema = new mongoose.Schema({
googleId: { type: String },
    username: {
        type: String,
        required: [true, 'Username is required'],
        unique: true,
        trim: true,
        minlength: [3, 'Username must be at least 3 characters long'],
    },
    email: {
        type: String,
        required: [true, 'Email is required'],
        unique: true,
        lowercase: true,
        trim: true,
        validate: [validator.isEmail, 'Please provide a valid email address'],
    },
    password: {
        type: String,
        required: [true, 'Password is required'],
        minlength: [6, 'Password must be at least 6 characters long'],
        select: false,
     required: false // Don't send password back in queries by default
    },
    role: {
        type: String,
        enum: ['User', 'Admin'],
        default: 'User',
        required: true,
    },
    employeeId: { // Reference to the Employee ID if the user is an Admin
        type: String,
        required: function() { return this.role === 'Admin'; }, // Only required if role is Admin
        trim: true,
        // Optionally add a ref if you want to populate employee details later
        // ref: 'Employee'
    },
    designation: {
  type: String,
  required: true
},

}, { timestamps: true });

// Password Hashing Middleware (before saving)
UserSchema.pre('save', async function(next) {
    // Only run this function if password was actually modified
    if (!this.isModified('password')) return next();

    // Hash the password with cost of 12
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
});

// Method to compare entered password with hashed password in DB (for login later)
UserSchema.methods.comparePassword = async function(candidatePassword) {
    return await bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('User', UserSchema);