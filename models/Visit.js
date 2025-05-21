const mongoose = require('mongoose');

const photoSchema = new mongoose.Schema({
  data: Buffer,
  contentType: String,
}, { _id: false });

const visitSchema = new mongoose.Schema({
  place: { 
    type: String, 
    required: true,
    trim: true
  },
  location: { 
    type: String, 
    required: true,
    trim: true
  },
  instructions: { 
    type: String,
    trim: true
  },
  postedTo: { 
    type: String, 
    required: true,
    trim: true
  },
  deadline: { 
    type: Date, 
    required: true 
  },
  status: {
    type: String,
    enum: ['pending', 'in-progress', 'submitted', 'approved', 'rejected', 'completed'],
    default: 'pending'
  },
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  startedAt: {
    type: Date
  },
  completedAt: {
    type: Date
  },
  completedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  submittedAt: {
    type: Date
  },
  submittedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  approvedAt: {
    type: Date
  },
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  rejectedAt: {
    type: Date
  },
  rejectedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  rejectionReason: {
    type: String,
    trim: true
  },
  report: {
    type: String,
    trim: true
  },
  photos: [photoSchema],
  createdAt: { 
    type: Date, 
    default: Date.now 
  }
}, { 
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes
visitSchema.index({ status: 1 });
visitSchema.index({ assignedTo: 1 });
visitSchema.index({ deadline: 1 });
visitSchema.index({ postedTo: 1 });
visitSchema.index({ submittedAt: 1 });

// Virtuals
visitSchema.virtual('isOverdue').get(function() {
  return this.deadline < new Date() && 
         !['completed', 'approved'].includes(this.status);
});

// Pre-save hooks
visitSchema.pre('save', function(next) {
  // Auto-set timestamps when status changes
  const statusChangeActions = {
    'in-progress': () => this.startedAt = new Date(),
    'submitted': () => this.submittedAt = new Date(),
    'completed': () => this.completedAt = new Date(),
    'approved': () => this.approvedAt = new Date(),
    'rejected': () => this.rejectedAt = new Date()
  };

  if (this.isModified('status') && statusChangeActions[this.status]) {
    statusChangeActions[this.status]();
  }
  next();
});

// Static Methods
visitSchema.statics.findPendingVisits = function(userId) {
  return this.find({ 
    $or: [
      { assignedTo: userId, status: 'pending' },
      { status: 'pending' }
    ]
  }).sort({ deadline: 1 });
};

visitSchema.statics.findSubmittedVisits = function() {
  return this.find({ status: 'submitted' })
    .sort({ submittedAt: -1 });
};

// Instance Methods
visitSchema.methods.completeVisit = function(report, userId) {
  this.status = 'completed';
  this.report = report;
  this.completedBy = userId;
  return this.save();
};

visitSchema.methods.submitForApproval = function(userId) {
  if (this.status !== 'completed') {
    throw new Error('Visit must be completed before submission');
  }
  this.status = 'submitted';
  this.submittedBy = userId;
  return this.save();
};

visitSchema.methods.approveVisit = function(userId) {
  if (this.status !== 'submitted') {
    throw new Error('Only submitted visits can be approved');
  }
  this.status = 'approved';
  this.approvedBy = userId;
  return this.save();
};

visitSchema.methods.rejectVisit = function(userId, reason) {
  if (this.status !== 'submitted') {
    throw new Error('Only submitted visits can be rejected');
  }
  this.status = 'rejected';
  this.rejectedBy = userId;
  this.rejectionReason = reason;
  return this.save();
};

module.exports = mongoose.model('Visit', visitSchema);