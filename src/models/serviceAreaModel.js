const mongoose = require('mongoose');

const serviceAreaSchema = new mongoose.Schema({
  pincode: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    match: [/^\d{6}$/, 'Please fill a valid 6-digit pincode'],
  },
  isActive: {
    type: Boolean,
    default: true,
  },
}, { timestamps: true });

const ServiceArea = mongoose.model('ServiceArea', serviceAreaSchema);

module.exports = ServiceArea;
