const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const SubmittedVisit = require('../models/SubmittedVisit');
const { authenticateToken } = require('../middleware/authMiddleware');


// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function(req, file, cb) {
    cb(null, 'uploads/visits/');
  },
  filename: function(req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: function(req, file, cb) {
    const filetypes = /jpeg|jpg|png|gif/;
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = filetypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb('Error: Images only!');
    }
  }
});

// @route   GET /api/submitted-visits
// @desc    Get all submitted visits (for admin)
// @access  Private
router.get('/', authenticateToken, async (req, res) => {
  try {
    
    const visits = await SubmittedVisit.find()
      .populate('postedTo', 'name')
      .sort({ createdAt: -1 });

    res.json({ 
      success: true,
      count: visits.length,
      visits: visits.map(visit => ({
        _id: visit._id,
        completedBy: visit.postedTo?.name || visit.postedTo,
        place: visit.place,
        location: visit.location,
        status: visit.status || 'Submitted',
        createdAt: visit.createdAt,
        photos: visit.photos
      }))
    });
  } catch (error) {
    console.error('Error fetching submitted visits:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error while fetching visits' 
    });
  }
});

// @route   POST /api/submitted-visits/submit
// @desc    Submit a visit report
// @access  Private
router.post('/submit', authenticateToken, upload.array('photos', 5), async (req, res) => {
  try {
    const { visitId, place, location } = req.body;
    
    // Get uploaded file paths
    const photos = req.files ? req.files.map(file => file.path) : [];
    
    const newVisit = new SubmittedVisit({
      visitId,
      place,
      location,
      userId: req.user.id,
      username: req.user.username,
      postedTo: req.user.postedTo, // Assuming this field exists
      photos,
      status: 'Submitted' // Explicitly set status
    });

    await newVisit.save();
    res.status(201).json({ 
      success: true, 
      message: 'Visit submitted successfully!',
      visit: newVisit
    });
  } catch (error) {
    console.error('Error submitting visit:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message || 'Failed to submit visit. Please try again.' 
    });
  }
});

// @route   PUT /api/submitted-visits/approve/:id
// @desc    Approve a submitted visit
// @access  Private (Admin)
router.put('/approve/:id', authenticateToken, async (req, res) => {
  try {
    const visit = await SubmittedVisit.findByIdAndUpdate(
      req.params.id,
      { status: 'Approved' },
      { new: true }
    ).populate('postedTo', 'name');

    if (!visit) {
      return res.status(404).json({ 
        success: false, 
        message: 'Visit not found' 
      });
    }

    res.json({ 
      success: true,
      message: 'Visit approved successfully',
      visit: {
        _id: visit._id,
        officerName: visit.postedTo?.name || visit.postedTo,
        place: visit.place,
        location: visit.location,
        status: visit.status,
        createdAt: visit.createdAt,
        photos: visit.photos,
        completedBy: visit.completedBy,
        completedAt: visit.completedAt,
        deadline: visit.deadline,
        report: visit.report
      }
    });
  } catch (error) {
    console.error('Error approving visit:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error while approving visit' 
    });
  }
});

// Add this to your backend routes
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const visit = await SubmittedVisit.findById(req.params.id)
      .populate('postedTo', 'name');

    if (!visit) {
      return res.status(404).json({ 
        success: false, 
        message: 'Visit not found' 
      });
    }

    res.json({ 
      success: true,
      visit: {
        _id: visit._id,
        officerName: visit.postedTo?.name || visit.postedTo,
        place: visit.place,
        location: visit.location,
        status: visit.status || 'Submitted',
        createdAt: visit.createdAt,
        photos: visit.photos?.map(photo => {
      const base64 = photo?.data?.toString('base64') || photo?.data?.$binary?.base64;
      const contentType = photo?.contentType || 'image/jpeg';
      return `data:${contentType};base64,${base64}`;
    }) || [],
        completedBy: visit.completedBy,
        completedAt: visit.completedAt,
        deadline: visit.deadline,
        report: visit.report
      }
    });
  } catch (error) {
    console.error('Error fetching visit details:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error while fetching visit details' 
    });
  }
});

module.exports = router;