const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Enhanced authentication middleware with additional user verification
const authenticateToken = async (req, res, next) => {
  // 1. Extract token from header (existing functionality)
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ 
      success: false, 
      message: 'Access token missing' 
    });
  }

  try {
    // 2. Verify token (existing)
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'yoursecretkey');
    
    // 3. Enhanced user verification - fetch fresh user data
    const user = await User.findById(decoded.userId)
      .select('-password')
      .lean();
    
    if (!user) {
      return res.status(403).json({ 
        success: false, 
        message: 'User account not found' 
      });
    }

    // 4. Attach full user object to request (enhanced from original)
    req.user = {
      ...user,
      id: user._id, // Ensure consistent ID access
      role: user.role // Maintain role verification
    };

    // 5. Proceed to route handler
    next();
  } catch (err) {
    // Enhanced error handling
    console.error('Authentication error:', err.message);
    
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        success: false, 
        message: 'Token expired' 
      });
    }
    
    return res.status(403).json({ 
      success: false, 
      message: 'Invalid token',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
};

// Role-based access control middleware (new addition)
const authorizeRoles = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Role ${req.user.role} is not authorized to access this resource`
      });
    }
    next();
  };
};

module.exports = {
  verifyToken: authenticateToken, // Alias for backward compatibility
  authenticateToken,             // New recommended name
  authorizeRoles                // New role authorization middleware
};