const mongoose = require('mongoose');
const photoSchema = new mongoose.Schema({
  data: Buffer,  // Store the binary data of the photo
  contentType: String,  // MIME type of the photo (e.g., 'image/jpeg')
});

const submittedVisitSchema = new mongoose.Schema({
  place: { type: String, required: true },
  location: { type: String, required: true },
  instructions: { type: String },
  postedTo: { type: String },
  deadline: { type: Date },
  report: { type: String },
  photos:[photoSchema],
  status: { type: String, default: 'approval pending' },
  completedAt: { type: Date, default: Date.now },
  completedBy: {
    type: String,
    ref: 'User'
  },
  createdAt: { type: Date, default: Date.now }
}, { collection: 'submittedvisits' }, { timestamps: true });

module.exports = mongoose.model('SubmittedVisit', submittedVisitSchema);
