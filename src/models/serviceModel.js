import mongoose from "mongoose";

const serviceSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Service must have a title'],
      trim: true,
      unique: true
    },
    description: {
      type: String,
      required: [true, 'Service must have a description'],
      trim: true
    },
    longDescription: {
      type: String,
      trim: true
    },
    category: {
      type: String,
      enum: [
        'car wash',
        'bike wash',
        'detailing',
        'maintenance',
        'customization',
        'other'
      ],
      default: 'car wash'
    },
    price: {
      type: Number,
      required: [true, 'Service must have a price']
    },
    discountPrice: Number,
    duration: {
      type: String, // Keep as string like "45 mins"
      required: [true, 'Service must have a duration']
    },
    image: {
      type:String,
      required:true
    },
    banner:{type:String,
    required:true
    },
    vehicleType: {
      type: String,
      enum: ['2 Wheeler', '4 Wheeler', 'Both'],
      default: 'Both'
    },
    isPopular: {
      type: Boolean,
      default: false
    },
    isActive: {
      type: Boolean,
      default: true
    },
    rating: {
      type: Number,
      default: 5,
      min: [1, 'Rating must be at least 1.0'],
      max: [5, 'Rating must be at most 5.0'],
      set: val => Math.round(val * 10) / 10
    },
    numReviews: {
      type: Number,
      default: 0
    }, // For compatibility with your current data
    tags: [String],
    estimatedTime: {
      type: Number,  // in minutes
      default: 60
    },
    features: [String], 
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    avaliableAreas:[{
      pincode:String,
    }]
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Indexes for faster queries
serviceSchema.index({ price: 1, rating: -1 });
serviceSchema.index({ category: 1 });
serviceSchema.index({ vehicleType: 1 });
serviceSchema.index({ title: 'text', description: 'text', tags: 'text' });

// Virtual populate for reviews
serviceSchema.virtual('reviews', {
  ref: 'Review',
  foreignField: 'service',
  localField: '_id'
});

// Static method to calculate average rating
serviceSchema.statics.calcAverageRating = async function (serviceId) {
  const stats = await this.model('Review').aggregate([
    { $match: { service: serviceId } },
    {
      $group: {
        _id: '$service',
        nRating: { $sum: 1 },
        avgRating: { $avg: '$rating' }
      }
    }
  ]);

  if (stats.length > 0) {
    await this.findByIdAndUpdate(serviceId, {
      numReviews: stats[0].nRating,
      rating: stats[0].avgRating
    });
  } else {
    await this.findByIdAndUpdate(serviceId, {
      numReviews: 0,
      rating: 5
    });
  }
};

const Service = mongoose.model('Service', serviceSchema);

export default Service;
