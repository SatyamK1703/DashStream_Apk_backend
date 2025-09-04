import mongoose from "mongoose";
import validator from "validator";


const vehicleSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ["2 Wheeler", "4 Wheeler"],
  },
  brand: {
    type: String,
  },
  model: {
    type: String,
  },
});

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
    rating: {
      type: Number,
      default: 0,
      min: 0,
      max: 5
    },
    totalRatings: {
      type: Number,
      default: 0
    },
    specialization: {
      type: [String],
      default: []
    },
    experience: {
      type: Number, // Years of experience
      default: 0
    },
    // Customer specific fields
    vehicle: vehicleSchema,
    addresses: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Address",
      },
    ],
    // Common fields
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
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

userSchema.virtual("defaultAddress", {
  ref: "Address",
  localField: "_id",
  foreignField: "customer",
  justOne: true,
  match: { isdefault: true },
});

// Method: Set default address
userSchema.methods.setDefaultAddress = async function (addressId) {
  await mongoose.model("Address").updateMany(
    { customer: this._id },
    { $set: { isdefault: false } }
  );

  await mongoose.model("Address").findByIdAndUpdate(addressId, {
    $set: { isdefault: true },
  });

  return this.populate("addresses");
};

const User = mongoose.model("User", userSchema);
export default User;
