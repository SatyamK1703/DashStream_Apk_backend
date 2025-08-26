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
    category: {
      type: String,
      enum: [
        'car wash',
        'bke wash',
        'detailing',
        'maintenance',
        'detailing',
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
    image: String,
    vehicleType: {
      type: [String],
      enum: ['2 Wheeler', '4 Wheeler', 'Both'],
      default: ['Both']
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
    },
    reviewCount: Number, // For compatibility with your current data
    tags: [String],
    features: [String], // Matches your current array of features
    inclusions: [String],
    exclusions: [String],
    faqs: [
      {
        question: String,
        answer: String
      }
    ],
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
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
