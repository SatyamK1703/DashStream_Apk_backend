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
    isdefault: {
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

// 🔹 Pre-save hook to ensure only one default address per user
addressSchema.pre("save", async function (next) {
  if (this.isdefault) {
    await this.constructor.updateMany(
      { customer: this.customer, _id: { $ne: this._id } },
      { $set: { isdefault: false } }
    );
  }
  next();
});

const Address = mongoose.model("Address", addressSchema);
export default Address;
