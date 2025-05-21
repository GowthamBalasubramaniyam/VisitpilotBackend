const express = require('express');
const router = express.Router();
const Visit = require('../models/Visit');
const { authenticateToken } = require('../middleware/authMiddleware');
const Employee = require('../models/Employee');
const mongoose = require('mongoose');
const multer = require('multer');
const path = require('path');
const SubmittedVisit = require('../models/SubmittedVisit');
const fs = require('fs');
const cors = require('cors');
// Configure multer for file uploads
const storage = multer.memoryStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  }
});

const upload = multer({ 
  storage,
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

// Test route
router.get('/test-route', (req, res) => {
    console.log('Hit the /test-route!');
    res.send('Test route works!');
});

// Employee verification
router.get('/verify-employee', authenticateToken, async (req, res) => {
    try {
      const { visitId, employeeId, requiredPosition } = req.query;

      if (!visitId || !employeeId || !requiredPosition) {
        return res.status(400).json({
          success: false,
          message: 'Missing required parameters'
        });
      }

      const employee = await Employee.findOne({
        employeeId: employeeId,
        designation: requiredPosition
      });

      if (!employee) {
        return res.status(400).json({
          success: false,
          message: 'Invalid employee ID or position mismatch'
        });
      }

      let objectIdVisitId;
      try {
        objectIdVisitId = new mongoose.Types.ObjectId(visitId);
      } catch (error) {
        return res.status(400).json({
          success: false,
          message: 'Invalid visit ID format'
        });
      }

      const visit = await Visit.findById(objectIdVisitId);
      if (!visit) {
        return res.status(404).json({
          success: false,
          message: 'Visit not found'
        });
      }

      res.json({
        success: true,
        message: 'Verification successful',
        employeeName: employee.name
      });

    } catch (err) {
      console.error('Verification error:', err);
      res.status(500).json({
        success: false,
        message: 'Server error during verification'
      });
    }
});

// Create new visit with file uploads
router.post('/', authenticateToken, upload.array('photos', 5), async (req, res) => {
    try {
      const {
        place = '',
        location = '',
        instructions = '',
        assignedTo = '',
        deadline
      } = req.body;

      // Validate required fields
      if (!place.trim() || !location.trim() || !assignedTo || !deadline) {
        return res.status(400).json({
          message: 'Place, location, assignedTo, and deadline are required'
        });
      }

      // Validate deadline
      const deadlineDate = new Date(deadline);
      if (isNaN(deadlineDate.getTime())) {
        return res.status(400).json({
          message: 'Invalid deadline format'
        });
      }

      // Process uploaded files
      const photos = req.files?.map(file => file.path) || [];

      const newVisit = new Visit({
        place: place.trim(),
        location: location.trim(),
        instructions: instructions.trim(),
        postedTo: assignedTo,
        deadline: deadlineDate,
        photos,
        status: 'pending',
        createdBy: req.user.username,
        role: req.user.role,
        assignedTo: req.user._id
      });

      const savedVisit = await newVisit.save();

      res.status(201).json({
        message: 'Visit created successfully',
        visit: savedVisit
      });

    } catch (err) {
      console.error('Error creating visit:', err);
      res.status(500).json({
        message: 'Failed to create visit',
        error: process.env.NODE_ENV === 'development' ? err.message : undefined
      });
    }
});

// Get pending visits
router.get('/pending', authenticateToken, async (req, res) => {
    try {
      const query = {
        status: 'pending',
        ...(req.user.role !== 'admin' && { assignedTo: req.user._id })
      };

      const visits = await Visit.find(query)
        .sort({ deadline: 1 })
        .populate('assignedTo', 'username email')
        .lean();

      res.json({
        count: visits.length,
        visits: visits.map(v => ({
          ...v,
          isOverdue: new Date(v.deadline) < new Date() && v.status === 'pending'
        }))
      });

    } catch (err) {
      console.error('Error fetching pending visits:', err);
      res.status(500).json({
        message: 'Failed to fetch pending visits',
        error: process.env.NODE_ENV === 'development' ? err.message : undefined
      });
    }
});

// Get submitted visits
router.get('/submitted-visits', authenticateToken, async (req, res) => {
  try {
    console.log('Fetching submitted visits...'); // Debug log
    
    const visits = await SubmittedVisit.find()
      .populate('postedTo', 'name')
      .sort({ createdAt: -1 });

    console.log('Found visits:', visits.length); // Debug log
    
    res.json(visits.map(visit => ({
      _id: visit._id,
      officerName: visit.postedTo?.name || visit.postedTo,
      place: visit.place,
      location: visit.location,
      status: visit.status || 'Not Specified',
      createdAt: visit.createdAt
    })));
    
  } catch (err) {
    console.error('Server error:', err);
    res.status(500).json({ 
      message: 'Server error',
      error: err.message 
    });
  }
});


// Complete a visit with full details
router.post('/submit', upload.array('photos', 5), async (req, res) => {
  const visitId = req.body.visitId;
  try {
    const {
      place,
      location,
      deadline,
      postedTo,
      userId,
      username,
      report = '',
    } = req.body; 

    if (!place || !location || !deadline || !postedTo || !userId || !username) {
      return res.status(400).json({ success: false, message: 'Missing required fields' });
    }

    // Handle photo files
    const photos = req.files.map(file => ({
      // Store file as binary data and include its MIME type for later reference
      data: file.buffer,
      contentType: file.mimetype,
    }));

    // Create new SubmittedVisit document with status "approval pending"
    const newSubmittedVisit = new SubmittedVisit({
      place,
      location,
      deadline: new Date(deadline),
      postedTo,
      completedBy: username,
      report,
      photos,  // Store the photos array
      status: 'approval pending',  // Added status field
    });

    // Save the new visit to the database
    await newSubmittedVisit.save();

    // Update the original visit status to 'submitted' if visitId is provided
    if (visitId) {
      await Visit.findByIdAndUpdate(visitId, {
        status: 'submitted',
        updatedAt: new Date(),
      });
    }

    // Send a success response
    res.status(201).json({ success: true, message: 'Visit submitted successfully' });
    //    console.log('Uploaded files:', req.files);

  } catch (error) {
    console.error('Error submitting visit:', error);
    res.status(500).json({ success: false, message: 'Server error during visit submission' });
  }
});
// Update visit status (admin only)
router.put('/approve/:id', authenticateToken, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({ msg: 'Not authorized' });
    }

    // Validate ID format
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ msg: 'Invalid visit ID format' });
    }

    // Find and update visit
    const visit = await Visit.findByIdAndUpdate(
      req.params.id,
      { status: 'Approved', approvedBy: req.user.id, approvedAt: Date.now() },
      { new: true }
    );

    if (!visit) {
      return res.status(404).json({ msg: 'Visit not found' });
    }

    res.json(visit);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// PATCH route to update visit status to "overdue"
router.patch('/:id/status', authenticateToken, async (req, res) => {
 console.log('PATCH /visits/:id/status hit');
    console.log('req.params.id:', req.params.id);
    console.log('req.body:', req.body);
    try {
        const visitId = req.params.id;
        const { status } = req.body;

        // Validate status
        if (!status) {
            return res.status(400).json({ message: 'Status is required' });
        }

        if (status !== 'overdue') {
            return res.status(400).json({ message: 'Invalid status.  Only "overdue" is allowed in this route.'});
        }

        // Check if the ID is valid
        if (!mongoose.Types.ObjectId.isValid(visitId)) {
            return res.status(400).json({ message: 'Invalid visit ID' });
        }

        const visit = await Visit.findByIdAndUpdate(
            visitId,
            { status: 'overdue' }, // Hardcode the status to 'overdue'
            { new: true } // Return the modified document
        );

        if (!visit) {
            return res.status(404).json({ message: 'Visit not found' });
        }

        res.json({ message: 'Visit status updated to overdue', visit });


    } catch (error) {
        console.error("Error updating visit status:", error);
        res.status(500).json({ message: 'Server error updating visit status', error: error.message });
    }
});

// Get overdue visits
// Get overdue visits
router.get('/overdue', async (req, res) => {
    console.log('Fetching overdue visits...');
    console.log('Current date:', new Date());
    try {
        const currentDate = new Date();
        const overdueVisits = await Visit.find({
            deadline: { $lt: currentDate },
            status: 'overdue'
        })
            .populate('postedTo')       // Populate 'postedTo' to get the entire object
            .populate('place')       // Populate 'place' to get its details - changed from placeData
            .sort({ deadline: 1 });

        console.log('Found:', overdueVisits.length);

        const result = overdueVisits.map(visit => {
            let postedToName = 'N/A';
            if (visit.postedTo) {
                // Check if name exists and is not null
                if (visit.postedTo.name) {
                    postedToName = visit.postedTo.name;
                } else if (visit.postedTo.username) {
                    postedToName = visit.postedTo.username;
                } else {
                  postedToName = visit.postedTo;
                }
            }

            return {
                _id: visit._id,
                visitId: visit._id,
                postedTo: postedToName,
                location: visit.location,
                visitDate: visit.createdAt,
                dueDate: visit.deadline,
                deadline: visit.deadline,
                place: visit.place ? visit.place : 'N/A'
            };
        });
        res.json(result);
    } catch (err) {
        console.error('Error fetching overdue visits:', err);
        res.status(500).json({ message: 'Failed to fetch overdue visits' });
    }
});

// PATCH /api/visits/:visitId/repost
router.patch('/:visitId/repost', authenticateToken, async (req, res) => {
    const { visitId } = req.params;
    const { deadline } = req.body;

    try {
        // 1. Validate the visitId
        if (!visitId) {
            return res.status(400).json({ error: 'Visit ID is required.' });
        }

        // 2. Validate the deadline
        if (!deadline) {
            return res.status(400).json({ error: 'Deadline is required.' });
        }

        const parsedDeadline = new Date(deadline);
        if (isNaN(parsedDeadline.getTime())) {
          return res.status(400).json({ error: 'Invalid deadline format.  Use a valid date string.' });
        }

        // 3. Find the visit by ID
        const visit = await Visit.findById(visitId);

        if (!visit) {
            return res.status(404).json({ error: 'Visit not found.' });
        }

        // 4. Update the visit's deadline and status
        visit.deadline = parsedDeadline;
        visit.status = 'pending';  // Set the status to "Pending"
        await visit.save();

        // 5. Respond with the updated visit data (optional, but good practice)
        res.json({ message: 'Visit reposted successfully', visit });

    } catch (error) {
        // 6. Handle errors
        console.error('Error reposting visit:', error);
        res.status(500).json({ error: 'Failed to repost visit.', details: error.message });
    }
});

// Update visit by ID
router.put('/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;

        // Validate the deadline is not in the past
        if (new Date(updates.deadline) < new Date()) {
            return res.status(400).json({ message: 'Deadline cannot be in the past' });
        }

        const updatedVisit = await Visit.findByIdAndUpdate(
            id,
            {
                $set: {
                    place: updates.place,
                    location: updates.location,
                    postedTo: updates.postedTo,
                    deadline: updates.deadline,
                    instructions: updates.instructions,
                    status: updates.status
                }
            },
            { new: true, runValidators: true }
        );

        if (!updatedVisit) {
            return res.status(404).json({ message: 'Visit not found' });
        }

        res.json({
            message: 'Visit updated successfully',
            visit: updatedVisit
        });
    } catch (error) {
        console.error('Error updating visit:', error);
        res.status(500).json({ 
            message: 'Failed to update visit',
            error: error.message 
        });
    }
});

// Get visit counts (final optimized version)
router.get('/counts', authenticateToken, async (req, res) => {
    try {
        const baseQuery = {};
        const isAdmin = req.user.role === 'Admin';
        
        // For non-admin users, filter by their designation
        if (!isAdmin && req.user.designation) {
            baseQuery.postedTo = { $regex: new RegExp(escapeRegex(req.user.designation), 'i') };
        }

        // For admins - only check SubmittedVisit collection for pending approvals
        // For non-admins - only check Visit collection for pending visits
        const counts = {
            totalVisits: await Visit.countDocuments(baseQuery),
            pendingApprovals: isAdmin 
                ? await SubmittedVisit.countDocuments({ 
                    ...baseQuery, 
                    status: 'approval pending' 
                  })
                : await Visit.countDocuments({ 
                    ...baseQuery, 
                    status: 'pending' 
                  }),
            approvedReports: await SubmittedVisit.countDocuments({
                ...baseQuery,
                status: 'Approved'
            }),
            repostRequests: await Visit.countDocuments({
                ...baseQuery,
                status: 'overdue'
            })
        };
        
        res.json(counts);
    } catch (error) {
        console.error('Error fetching visit counts:', error);
        res.status(500).json({ 
            success: false,
            message: 'Failed to fetch visit counts',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});
// Get all visits with filtering options
router.get('/', authenticateToken, async (req, res) => {
  try {
    // Extract query parameters
    const { 
      status, 
      assignedTo, 
      place, 
      location, 
      before, 
      after, 
      sortBy = 'deadline', 
      sortOrder = 'asc',
      page = 1,
      limit = 10,
      designation // New parameter for designation filtering
    } = req.query;

    // Build the base query
    const query = {};
    
    // Add status filter if provided
    if (status) {
      query.status = { $in: status.split(',') };
    }

    // Handle different filtering based on user role
    if (req.user.role !== 'Admin') {
      // For non-admin users, filter by their designation in postedTo field
      if (req.user.designation) {
        query.postedTo = { $regex: new RegExp(escapeRegex(req.user.designation), 'i') };
      }
    } else {
      // Admin-specific filters
      if (assignedTo) {
        query.assignedTo = assignedTo;
      }
      if (designation) {
        query.postedTo = { $regex: new RegExp(escapeRegex(designation), 'i') };
      }
    }

    // Add place/location search (case-insensitive)
    if (place) {
      query.place = { $regex: new RegExp(place, 'i') };
    }
    if (location) {
      query.location = { $regex: new RegExp(location, 'i') };
    }

    // Add date range filters
    if (before || after) {
      query.deadline = {};
      if (before) query.deadline.$lte = new Date(before);
      if (after) query.deadline.$gte = new Date(after);
    }

    // Calculate pagination
    const skip = (page - 1) * limit;

    // Execute query with sorting and pagination
    const visits = await Visit.find(query)
      .sort({ [sortBy]: sortOrder === 'desc' ? -1 : 1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    // Get total count for pagination
    const total = await Visit.countDocuments(query);

    // Enhance visits with additional calculated fields
    const enhancedVisits = visits.map(v => ({
      ...v,
      isOverdue: new Date(v.deadline) < new Date() && v.status === 'pending',
      daysRemaining: Math.ceil((new Date(v.deadline) - new Date()) / (1000 * 60 * 60 * 24)),
      // Add human-readable status
      statusDisplay: getStatusDisplay(v.status)
    }));

    res.json({
      success: true,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / limit),
      limit: parseInt(limit),
      visits: enhancedVisits
    });

  } catch (err) {
    console.error('Visit fetch error:', err);
    res.status(500).json({ 
      success: false,
      message: 'Failed to fetch visits',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
});

// Helper function to escape regex special characters
function escapeRegex(text) {
  return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
}

// Helper function to get display text for status
function getStatusDisplay(status) {
  const statusMap = {
    'pending': 'Pending Approval',
    'approved': 'Approved',
    'completed': 'Completed',
    'overdue': 'Overdue',
    'rejected': 'Rejected'
  };
  return statusMap[status] || status;
}

// GET status=approvalpending
router.get('/approval-pending', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
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
