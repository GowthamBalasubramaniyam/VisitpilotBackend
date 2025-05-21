const { validationResult } = require('express-validator');
const jwt = require('jsonwebtoken');

// Validate request using express-validator
exports.validateRequest = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ 
      success: false,
      message: 'Validation error', 
      errors: errors.array().map(error => ({
        field: error.path,
        message: error.msg
      })) 
    });
  }
  next();
};

// Authenticate JWT token
exports.authenticateToken = (req, res, next) => {
  // Get token from header
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ message: 'Access denied. No token provided.' });
  }

  try {
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    console.log('Decoded Token:', req.user);
    next();
  } catch (err) {
console.error("JWT Verification Error:", err);
    return res.status(403).json({ message: 'Invalid token' });
  }
};

// Authorize admin role
exports.authorizeAdmin = (req, res, next) => {
  if (req.user && req.user.role === 'Admin') {

    next();
  } else {
    return res.status(403).json({ message: 'Access denied. Admin role required.' });
  }
};

// Authorize specific roles
exports.authorizeRoles = (roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required' });
    }
    
    if (roles.includes(req.user.role)) {
      next();
    } else {
      return res.status(403).json({ message: 'Access denied. Insufficient permissions.' });
    }
  };
};