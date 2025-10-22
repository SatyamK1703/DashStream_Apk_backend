import mongoose from 'mongoose';

const serviceAreaSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Service area name is required'],
    trim: true,
    unique: true,
  },
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

export default ServiceArea;
