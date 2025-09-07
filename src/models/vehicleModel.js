import mongoose from 'mongoose';

const vehicleSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Vehicle must belong to a user']
  },
  type: {
    type: String,
    enum: ['car', 'motorcycle', 'scooter', 'truck', 'van'],
    required: [true, 'Vehicle type is required']
  },
  brand: {
    type: String,
    required: [true, 'Vehicle brand is required'],
    trim: true
  },
  model: {
    type: String,
    required: [true, 'Vehicle model is required'],
    trim: true
  },
  image: {
    public_id: String,
    url: String
  },
  isDefault: {
    type: Boolean,
    default: false
  },
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes
vehicleSchema.index({ user: 1 });
vehicleSchema.index({ user: 1, isDefault: 1 });


// Virtual for vehicle display name
vehicleSchema.virtual('displayName').get(function() {
  return `${this.brand} ${this.model} `;
});

// Pre-save middleware to ensure only one default vehicle per user
vehicleSchema.pre('save', async function(next) {
  if (this.isDefault && this.isModified('isDefault')) {
    await this.constructor.updateMany(
      { user: this.user, _id: { $ne: this._id } },
      { isDefault: false }
    );
  }
  next();
});

// Static method to get user's vehicles
vehicleSchema.statics.getUserVehicles = function(userId) {
  return this.find({ user: userId }).sort({ isDefault: -1, createdAt: -1 });
};

// Static method to get user's default vehicle
vehicleSchema.statics.getUserDefaultVehicle = function(userId) {
  return this.findOne({ user: userId, isDefault: true });
};

// Instance method to set as default
vehicleSchema.methods.setAsDefault = async function() {
  await this.constructor.updateMany(
    { user: this.user, _id: { $ne: this._id } },
    { isDefault: false }
  );
  this.isDefault = true;
  return this.save();
};

const Vehicle = mongoose.model('Vehicle', vehicleSchema);

export default Vehicle;
