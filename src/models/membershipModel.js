import mongoose from 'mongoose';

const membershipPlanSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Plan name is required'],
      trim: true
    },
    price: {
      type: Number,
      required: [true, 'Plan price is required'],
      min: 0
    },
    duration: {
      type: String,
      required: [true, 'Plan duration is required'],
      enum: ['monthly', 'quarterly', 'yearly']
    },
    durationDays: {
      type: Number,
      required: [true, 'Duration in days is required']
    },
    features: [{
      type: String,
      required: [true, 'At least one feature is required']
    }],
    popular: {
      type: Boolean,
      default: false
    },
    active: {
      type: Boolean,
      default: true
    }
  },
  {
    timestamps: true
  }
);

const userMembershipSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required'],
      index: true
    },
    planId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'MembershipPlan',
      required: [true, 'Plan ID is required']
    },
    active: {
      type: Boolean,
      default: true
    },
    startDate: {
      type: Date,
      default: Date.now
    },
    endDate: {
      type: Date,
      required: [true, 'End date is required']
    },
    autoRenew: {
      type: Boolean,
      default: false
    },
    paymentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Payment'
    },
    usedServices: {
      type: Number,
      default: 0
    },
    totalServices: {
      type: Number,
      default: 0
    },
    savings: {
      type: Number,
      default: 0
    },
    cancellationDate: {
      type: Date
    },
    cancellationReason: {
      type: String
    }
  },
  {
    timestamps: true
  }
);

// Virtual for checking if membership is expired
userMembershipSchema.virtual('isExpired').get(function() {
  return this.endDate < new Date();
});

// Virtual for calculating remaining days
userMembershipSchema.virtual('remainingDays').get(function() {
  const today = new Date();
  const diffTime = this.endDate - today;
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
});

// Method to update usage statistics
userMembershipSchema.methods.updateUsage = async function(servicePrice) {
  this.usedServices += 1;
  this.savings += servicePrice * 0.15; // Assuming 15% discount on services
  await this.save();
  return this;
};

const MembershipPlan = mongoose.model('MembershipPlan', membershipPlanSchema);
const UserMembership = mongoose.model('UserMembership', userMembershipSchema);

export { MembershipPlan, UserMembership };