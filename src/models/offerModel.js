import mongoose from "mongoose";

const offerSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Offer must have a title'],
      trim: true,
      maxlength: [100, 'Offer title cannot exceed 100 characters']
    },
    description: {
      type: String,
      required: [true, 'Offer must have a description'],
      trim: true,
      maxlength: [500, 'Offer description cannot exceed 500 characters']
    },
    discount: {
      type: Number,
      required: [true, 'Offer must have a discount value'],
      min: [0, 'Discount cannot be negative'],
      validate: {
        validator: function(value) {
          if (this.discountType === 'percentage') {
            return value <= 100;
          }
          return value > 0; // For fixed discounts, just ensure it's positive
        },
        message: function(props) {
          if (this.discountType === 'percentage') {
            return 'Percentage discount cannot exceed 100%';
          }
          return 'Fixed discount must be positive';
        }
      }
    },
    discountType: {
      type: String,
      enum: ['percentage', 'fixed'],
      default: 'percentage'
    },
    maxDiscountAmount: {
      type: Number,
      default: null // For percentage discounts, cap the maximum discount amount
    },
    minOrderAmount: {
      type: Number,
      default: 0,
      min: [0, 'Minimum order amount cannot be negative']
    },
    validFrom: {
      type: Date,
      required: [true, 'Offer must have a valid from date'],
      default: Date.now
    },
    validUntil: {
      type: Date,
      required: [true, 'Offer must have a valid until date'],
      validate: {
        validator: function(value) {
          return value > this.validFrom;
        },
        message: 'Valid until date must be after valid from date'
      }
    },
    image: {
      type: String,
      default: null
    },
    bannerImage: {
      type: String,
      default: null
    },
    offerCode: {
      type: String,
      unique: true,
      sparse: true, // Allows multiple null values
      uppercase: true,
      trim: true,
      maxlength: [20, 'Offer code cannot exceed 20 characters']
    },
    usageLimit: {
      type: Number,
      default: null // null means unlimited usage
    },
    usageCount: {
      type: Number,
      default: 0,
      min: [0, 'Usage count cannot be negative']
    },
    userUsageLimit: {
      type: Number,
      default: 1, // How many times a single user can use this offer
      min: [1, 'User usage limit must be at least 1']
    },
    applicableServices: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Service'
    }],
    applicableCategories: [{
      type: String,
      enum: [
        'car wash',
        'bike wash', 
        'detailing',
        'maintenance',
        'customization',
        'other'
      ]
    }],
    vehicleType: {
      type: String,
      enum: ['2 Wheeler', '4 Wheeler', 'Both'],
      default: 'Both'
    },
    isActive: {
      type: Boolean,
      default: true
    },
    isFeatured: {
      type: Boolean,
      default: false
    },
    priority: {
      type: Number,
      default: 0, // Higher number = higher priority for display
      min: [0, 'Priority cannot be negative']
    },
    terms: {
      type: String,
      default: ''
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    usedBy: [{
      user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      usageCount: {
        type: Number,
        default: 1
      },
      lastUsed: {
        type: Date,
        default: Date.now
      }
    }]
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Indexes for better performance
offerSchema.index({ validFrom: 1, validUntil: 1 });
offerSchema.index({ isActive: 1, isFeatured: -1, priority: -1 });
offerSchema.index({ offerCode: 1 });
offerSchema.index({ applicableCategories: 1 });
offerSchema.index({ vehicleType: 1 });
offerSchema.index({ title: 'text', description: 'text' });

// Virtual to check if offer is currently valid
offerSchema.virtual('isValid').get(function() {
  const now = new Date();
  return this.isActive && 
         this.validFrom <= now && 
         this.validUntil >= now &&
         (this.usageLimit === null || this.usageCount < this.usageLimit);
});

// Virtual to check if offer is expired
offerSchema.virtual('isExpired').get(function() {
  return new Date() > this.validUntil;
});

// Virtual to get remaining usage count
offerSchema.virtual('remainingUsage').get(function() {
  if (this.usageLimit === null) return null;
  return Math.max(0, this.usageLimit - this.usageCount);
});

// Pre-save middleware to generate offer code if not provided
offerSchema.pre('save', function(next) {
  if (!this.offerCode && this.isNew) {
    // Generate a random offer code
    const randomCode = Math.random().toString(36).substring(2, 8).toUpperCase();
    this.offerCode = `OFFER${randomCode}`;
  }
  next();
});

// Static method to get active offers
offerSchema.statics.getActiveOffers = function(filters = {}) {
  const now = new Date();
  return this.find({
    isActive: true,
    validFrom: { $lte: now },
    validUntil: { $gte: now },
    $or: [
      { usageLimit: null },
      { $expr: { $lt: ['$usageCount', '$usageLimit'] } }
    ],
    ...filters
  }).sort({ priority: -1, isFeatured: -1, createdAt: -1 });
};

// Static method to check if user can use offer
offerSchema.statics.canUserUseOffer = function(offerId, userId) {
  return this.findOne({
    _id: offerId,
    isActive: true,
    validFrom: { $lte: new Date() },
    validUntil: { $gte: new Date() },
    $or: [
      { usageLimit: null },
      { $expr: { $lt: ['$usageCount', '$usageLimit'] } }
    ],
    $or: [
      { 'usedBy.user': { $ne: userId } },
      { 
        'usedBy': {
          $elemMatch: {
            user: userId,
            $expr: { $lt: ['$usageCount', '$userUsageLimit'] }
          }
        }
      }
    ]
  });
};

// Instance method to use offer
offerSchema.methods.useOffer = function(userId) {
  // Increment total usage count
  this.usageCount += 1;
  
  // Update user-specific usage
  const userUsage = this.usedBy.find(usage => usage.user.toString() === userId.toString());
  if (userUsage) {
    userUsage.usageCount += 1;
    userUsage.lastUsed = new Date();
  } else {
    this.usedBy.push({
      user: userId,
      usageCount: 1,
      lastUsed: new Date()
    });
  }
  
  return this.save();
};

const Offer = mongoose.model('Offer', offerSchema);

export default Offer;