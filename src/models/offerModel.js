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
      trim: true,
      maxlength: [500, 'Offer description cannot exceed 500 characters']
    },
    discount: {
      type: Number,
      min: [0, 'Discount cannot be negative'],
      max: [100, 'Discount cannot exceed 100%']
    },
    discountType: {
      type: String,
      enum: ['percentage', 'fixed'],
      default: 'percentage'
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
    isPromo:{
      type: Boolean,
      default: false
   },
    offerCode: {
      type: String,
      unique: true,
      sparse: true,
      uppercase: true,
      trim: true,
      maxlength: [20, 'Offer code cannot exceed 20 characters']
    },
    usageLimit: {
      type: Number,
      default: null 
    },
    usageCount: {
      type: Number,
      default: 0,
      min: [0, 'Usage count cannot be negative']
    },
    userUsageLimit: {
      type: Number,
      default: 1, 
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

// Pre-save middleware to handle empty offerCode
offerSchema.pre('save', function(next) {
  // Convert empty string offerCode to null to work with sparse unique index
  if (this.offerCode === '') {
    this.offerCode = undefined;
  }
  next();
});

// Static method to get active offers
offerSchema.statics.getActiveOffers = function(additionalFilters = {}) {
  const now = new Date();
  return this.find({
    isActive: true,
    validFrom: { $lte: now },
    validUntil: { $gte: now },
    ...additionalFilters
  });
};

// Static method to check if user can use offer
offerSchema.statics.canUserUseOffer = function(offerId, userId) {
  return this.findOne({
    _id: offerId,
    isActive: true,
    validFrom: { $lte: new Date() },
    validUntil: { $gte: new Date() },
    $and: [
      {
        $or: [
          { usageLimit: null },
          { $expr: { $lt: ['$usageCount', '$usageLimit'] } }
        ]
      },
      {
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
