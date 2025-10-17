import mongoose from 'mongoose';

const locationHistorySchema = new mongoose.Schema({
  latitude: {
    type: Number,
    required: true,
    min: -90,
    max: 90
  },
  longitude: {
    type: Number,
    required: true,
    min: -180,
    max: 180
  },
  accuracy: {
    type: Number,
    default: 0
  },
  speed: {
    type: Number,
    default: 0
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
});

const locationSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  current: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point'
    },
    coordinates: {
      type: [Number], // [longitude, latitude]
      required: true
    },
    latitude: {
      type: Number,
      required: true,
      min: -90,
      max: 90
    },
    longitude: {
      type: Number,
      required: true,
      min: -180,
      max: 180
    },
    accuracy: {
      type: Number,
      default: 0
    },
    speed: {
      type: Number,
      default: 0
    },
    heading: {
      type: Number,
      default: 0
    },
    timestamp: {
      type: Date,
      default: Date.now
    }
  },
  status: {
    type: String,
    enum: ['available', 'busy', 'offline'],
    default: 'offline'
  },
  history: [locationHistorySchema],
  lastUpdated: {
    type: Date,
    default: Date.now
  },
  trackingEnabled: {
    type: Boolean,
    default: false
  },
  settings: {
    updateInterval: {
      type: Number,
      default: 30000 // 30 seconds in milliseconds
    },
    significantChangeThreshold: {
      type: Number,
      default: 10 // 10 meters
    },
    batteryOptimizationEnabled: {
      type: Boolean,
      default: true
    },
    maxHistoryItems: {
      type: Number,
      default: 100
    }
  }
}, {
  timestamps: true
});

// Index for geospatial queries
locationSchema.index({ 'current': '2dsphere' });

// Create a pre-save hook to ensure current location is formatted as GeoJSON
locationSchema.pre('save', function(next) {
  // Convert current location to GeoJSON format if it exists
  if (this.current && this.current.latitude && this.current.longitude) {
    this.current.type = 'Point';
    this.current.coordinates = [this.current.longitude, this.current.latitude];
  }
  next();
});

// Method to update current location and add to history
locationSchema.methods.updateLocation = async function(locationData) {
  // Update current location with GeoJSON format
  this.current = {
    type: 'Point',
    coordinates: [locationData.longitude, locationData.latitude],
    latitude: locationData.latitude,
    longitude: locationData.longitude,
    accuracy: locationData.accuracy || 0,
    speed: locationData.speed || 0,
    heading: locationData.heading || 0,
    timestamp: new Date()
  };
  
  // Add to history if history tracking is enabled
  if (this.settings.maxHistoryItems > 0) {
    this.history.push({
      latitude: locationData.latitude,
      longitude: locationData.longitude,
      accuracy: locationData.accuracy || 0,
      speed: locationData.speed || 0,
      timestamp: new Date()
    });
    
    // Limit history size
    if (this.history.length > this.settings.maxHistoryItems) {
      this.history = this.history.slice(-this.settings.maxHistoryItems);
    }
  }
  
  this.lastUpdated = new Date();
  return this.save();
};

// Method to update status
locationSchema.methods.updateStatus = async function(status) {
  this.status = status;
  this.lastUpdated = new Date();
  return this.save();
};

// Method to update tracking settings
locationSchema.methods.updateSettings = async function(settings) {
  if (settings.updateInterval !== undefined) {
    this.settings.updateInterval = settings.updateInterval;
  }
  
  if (settings.significantChangeThreshold !== undefined) {
    this.settings.significantChangeThreshold = settings.significantChangeThreshold;
  }
  
  if (settings.batteryOptimizationEnabled !== undefined) {
    this.settings.batteryOptimizationEnabled = settings.batteryOptimizationEnabled;
  }
  
  if (settings.maxHistoryItems !== undefined) {
    this.settings.maxHistoryItems = settings.maxHistoryItems;
  }
  
  return this.save();
};

// Static method to find professionals by proximity
locationSchema.statics.findNearbyProfessionals = async function(coordinates, maxDistance = 10000, status = 'available') {
  const { latitude, longitude } = coordinates;
  
  // Find professionals with the given status within the specified distance
  return this.aggregate([
    {
      $geoNear: {
        near: { type: 'Point', coordinates: [longitude, latitude] },
        distanceField: 'distance',
        maxDistance: maxDistance,
        query: { status: status, trackingEnabled: true },
        spherical: true,
        distanceMultiplier: 0.001 // Convert distance to kilometers
      }
    },
    {
      $lookup: {
        from: 'users',
        localField: 'user',
        foreignField: '_id',
        as: 'userDetails'
      }
    },
    {
      $unwind: '$userDetails'
    },
    {
      $project: {
        _id: 1,
        user: 1,
        current: 1,
        status: 1,
        lastUpdated: 1,
        distance: 1,
        'userDetails.name': 1,
        'userDetails.phone': 1,
        'userDetails.specialization': 1,
        'userDetails.rating': 1,
        'userDetails.totalRatings': 1
      }
    }
  ]);
};

const Location = mongoose.model('Location', locationSchema);

export default Location;