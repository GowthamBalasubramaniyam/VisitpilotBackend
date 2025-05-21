const express = require('express');
const { authenticateToken } = require('../middleware/authMiddleware');
const Visit = require('../models/SubmittedVisit');

const router = express.Router();

/**
 * @route GET /api/approved-visits
 * @desc Get all approved visits with optional filtering and pagination
 */
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { 
      place, 
      location, 
      officer,
      before, 
      after, 
      sortBy = 'updatedAt', 
      sortOrder = 'desc',
      page = 1,
      limit = 10
    } = req.query;

    const query = { status: 'Approved' };

    if (place) query.place = { $regex: new RegExp(place, 'i') };
    if (location) query.location = { $regex: new RegExp(location, 'i') };
    if (officer) query.completedBy = { $regex: new RegExp(officer, 'i') };

    if (before || after) {
      query.updatedAt = {};
      if (before) query.updatedAt.$lte = new Date(before);
      if (after) query.updatedAt.$gte = new Date(after);
    }

    const skip = (page - 1) * limit;

    const visits = await Visit.find(query)
      .sort({ [sortBy]: sortOrder === 'desc' ? -1 : 1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    const total = await Visit.countDocuments(query);

    // Convert Date objects to ISO strings
    const visitsWithStringDates = visits.map(visit => ({
      ...visit,
      createdAt: visit.createdAt ? visit.createdAt.toISOString() : null,
      updatedAt: visit.updatedAt ? visit.updatedAt.toISOString() : null,
      completedAt: visit.completedAt ? visit.completedAt.toISOString() : null,
      deadline: visit.deadline ? visit.deadline.toISOString() : null
    }));

    res.json({
      total,
      page: parseInt(page),
      pages: Math.ceil(total / limit),
      limit: parseInt(limit),
      visits: visitsWithStringDates
    });

  } catch (err) {
    console.error('Error fetching approved visits:', err);
    res.status(500).json({
      message: 'Failed to fetch approved visits',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
});

module.exports = router;
