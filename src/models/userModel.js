import mongoose from "mongoose";
import validator from "validator";

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      trim: true,
    },
    email: {
      type: String,
      lowercase: true,
      sparse: true,
      validate: {
        validator: function (val) {
          return !val || validator.isEmail(val);
        },
        message: "Please provide a valid email address",
      },
    },
    phone: {
      type: String,
      required: [true, "Phone number is required"],
      validate: {
        validator: function (val) {
          return /^\+?[1-9]\d{9,14}$/.test(val);
        },
        message: "Please provide a valid phone number",
      },
    },
    otp: {
      type: String,
    },
    otpExpires: {
      type: Date,
    },
    vehicle: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Vehicle",
    },
    role: {
      type: String,
      enum: ["customer", "professional", "admin"],
      default: "customer",
    },
    profileComplete: {
      type: Boolean,
      default: false,
    },
    isPhoneVerified: {
      type: Boolean,
      default: false,
    },
    // Professional specific fields
    isAvailable: {
      type: Boolean,
      default: true,
    },
    status: {
      type: String,
      enum: ["available", "busy", "offline"],
      default: "available",
    },
    totalRatings: {
      type: Number,
      default: 0,
    },
    trackingEnabled: {
      type: Boolean,
      default: false,
    },
    trackingSettings: {
      updateInterval: {
        type: Number,
        default: 10000, // 10 seconds in milliseconds
      },
      significantChangeThreshold: {
        type: Number,
        default: 10, // 10 meters
      },
      batteryOptimizationEnabled: {
        type: Boolean,
        default: true,
      },
      maxHistoryItems: {
        type: Number,
        default: 100,
      },
    },
    locationSubscribers: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    addresses: [
      {
        name: String,
        address: String,
        city: String,
        landmark: String,
        pincode: String,
        isDefault: Boolean,
      },
    ],
    fcmToken: {
      type: String,
      default: null,
    },
    lastActive: {
      type: Date,
      default: Date.now,
    },
    profileImage: {
      public_id: String,
      url: String,
    },
    active: {
      type: Boolean,
      default: true,
      select: false,
    },
    faqs: [
      {
        question: String,
        answer: String,
        type: {
          type: String,
          enum: ["general", "membership", "payment", "booking", "other"],
          default: "general",
        },
      },
    ],
    reviews: [
      {
        reviewerName: String,
        reviewText: String,
        rating: {
          type: Number,
          default: 0,
          min: 0,
          max: 5,
        },
      },
    ],
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// PERFORMANCE OPTIMIZATION: Critical Indexes for DashStream
// Primary lookup indexes
userSchema.index({ phone: 1 }, { unique: true }); // Phone number lookups (auth)
userSchema.index({ email: 1 }, { sparse: true }); // Email lookups (sparse for optional field)
userSchema.index({ role: 1 }); // Role-based queries (professional, customer, admin)

// Professional-specific indexes
userSchema.index({ role: 1, isAvailable: 1 }); // Find available professionals
userSchema.index({ role: 1, status: 1 }); // Professional status queries
userSchema.index({ role: 1, totalRatings: -1 }); // Sort professionals by rating

// Location and tracking indexes
userSchema.index({ trackingEnabled: 1 }); // Active tracking users
userSchema.index({ locationSubscribers: 1 }); // Location subscription queries

// Authentication and session indexes
userSchema.index({ isPhoneVerified: 1 }); // Verified users
userSchema.index({ lastActive: -1 }); // Sort by activity
userSchema.index({ active: 1 }); // Active user filter

// Profile and status indexes
userSchema.index({ profileComplete: 1 }); // Profile completion checks
userSchema.index({ "addresses.pincode": 1 }); // Address-based location queries
userSchema.index({ "addresses.isDefault": 1 }); // Default address lookup

// Compound indexes for common query patterns
userSchema.index({ role: 1, active: 1, isAvailable: 1 }); // Active available professionals
userSchema.index({ phone: 1, isPhoneVerified: 1 }); // Auth verification
userSchema.index({ role: 1, lastActive: -1 }); // Recent active professionals

const User = mongoose.model("User", userSchema);
export default User;
