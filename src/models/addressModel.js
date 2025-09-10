import mongoose from "mongoose";

const addressSchema = new mongoose.Schema(
  {
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    name: {
      type: String,
      required: [true, "Name is required"]
    },
    address: {
      type: String,
      required: [true, "Street is required"]
    },
    landmark: {
      type: String,
    },
    city: {
      type: String,
    },
    pincode: {
      type: String,
      validate: {
        validator: val => /^\d{6}$/.test(val),
        message: "Pincode must be exactly 6 digits"
      }
    },
    isDefault: {
      type: Boolean,
      default: false,
    },
    coordinates: {
      type: [Number], // [longitude, latitude]
      index: "2dsphere"
    }
  },
  { timestamps: true }
);

const Address = mongoose.model("Address", addressSchema);
export default Address;
