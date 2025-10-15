import mongoose from "mongoose";
import validator from "validator";




// Import bcrypt for password hashing
import bcrypt from "bcryptjs";

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
      unique: true,
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
      default: 'available'
    },
    totalRatings: {
      type: Number,
      default: 0
    },
    password: {
      type: String,
      select: false,
    },
    professionalInfo: {
      skills: [String],
      serviceAreas: [String],
      experience: String,
      vehicleInfo: {
        type: {
          type: String,
          enum: ["bike", "car", "van", "truck"],
          default: "bike"
        },
        model: String,
        year: Number,
        licensePlate: String
      },
      availability: {
        monday: { available: Boolean, slots: [{ start: String, end: String }] },
        tuesday: { available: Boolean, slots: [{ start: String, end: String }] },
        wednesday: { available: Boolean, slots: [{ start: String, end: String }] },
        thursday: { available: Boolean, slots: [{ start: String, end: String }] },
        friday: { available: Boolean, slots: [{ start: String, end: String }] },
        saturday: { available: Boolean, slots: [{ start: String, end: String }] },
        sunday: { available: Boolean, slots: [{ start: String, end: String }] }
      }
    },
    trackingEnabled: {
      type: Boolean,
      default: false
    },
    trackingSettings: {
      updateInterval: {
        type: Number,
        default: 10000 // 10 seconds in milliseconds
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
    },
    locationSubscribers: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }],
    addresses: [{
      type: {
        type: String,
        enum: ["home", "work", "other"],
        default: "home"
      },
      name: String,
      address: String,
      landmark: String,
      city: String,
      pincode: String,
      country: {
        type: String,
        default: "IN"
      },
      coordinates: {
        latitude: Number,
        longitude: Number
      },
      isDefault: Boolean
    }],
    fcmToken: {
      type: String,
      default: null
    },
    lastActive: {
      type: Date,
      default: Date.now
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
          default: "general"
        }
      }
    ],
    reviews: [{
      reviewerName: String,
      reviewText: String,
      rating: {
        type: Number,
        default: 0,
        min: 0,
        max: 5
      },
    }],
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Pre-save hook to hash password
userSchema.pre('save', async function(next) {
  // Only hash the password if it's modified (or new)
  if (!this.isModified('password')) return next();
  
  try {
    // Generate a salt
    const salt = await bcrypt.genSalt(10);
    // Hash the password along with the new salt
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Method to check if password is correct
userSchema.methods.correctPassword = async function(candidatePassword) {
  // Load password field which is not selected by default
  const user = await User.findById(this._id).select('+password');
  if (!user || !user.password) return false;
  
  return await bcrypt.compare(candidatePassword, user.password);
};

const User = mongoose.model("User", userSchema);
export default User;
