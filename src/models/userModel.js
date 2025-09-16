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
    vehicle:{
      type: mongoose.Schema.Types.ObjectId,
      ref: "Vehicle",
    },
    role: {
      type: String,
      enum: ["customer", "professional","admin"],
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
      name: String,
      address: String,
      city: String,
      landmark:String,
      pincode: String,
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
        type:{
          type:String,
          enum:["general","membership","payment","booking","other"],
          default:"general"
        }
      }
    ],
    reviews:[{
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

const User = mongoose.model("User", userSchema);
export default User;
