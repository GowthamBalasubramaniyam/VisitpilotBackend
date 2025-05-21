// backend/routes/PendingVisitRoutes.js
const express = require('express');
const router = express.Router();
const SubmittedVisit = require('../models/SubmittedVisit');
const { authenticateToken } = require('../middleware/authMiddleware');

router.get('/approval-pending', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'Admin') {
      return res.status(403).json({ message: 'Unauthorized access' });
    }

    const visits = await SubmittedVisit.find({ status: 'approval pending' })
      .sort({ createdAt: -1 })
      .lean();

    res.json({
      count: visits.length,
      visits,
    }); 
  } catch (error) {
    console.error('Error fetching approval pending visits:', error);
    res.status(500).json({ message: 'Failed to fetch approval pending visits' });
  }
});

module.exports = router;
