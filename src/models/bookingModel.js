import mongoose from "mongoose";

const { Schema } = mongoose;

const serviceItemSchema = new Schema(
  {
    serviceId: { type: Schema.Types.ObjectId, ref: "Service", required: true },
    title: { type: String },
    price: { type: Number, required: true },
    duration: { type: Number },
  },
  { _id: false }
);

const locationSchema = new Schema(
  {
    address: { type: String },
    lat: { type: Number },
    lng: { type: Number },
  },
  { _id: false }
);

const trackingUpdateSchema = new Schema(
  {
    status: { type: String },
    message: { type: String, required: true },
    updatedBy: { type: Schema.Types.ObjectId, ref: "User" },
    timestamp: { type: Date, default: Date.now },
  },
  { _id: false }
);

const bookingSchema = new Schema(
  {
    customer: { type: Schema.Types.ObjectId, ref: "User", required: true },
    professional: { type: Schema.Types.ObjectId, ref: "Professional" },
    services: { type: [serviceItemSchema], default: [] },
    vehicle: {
      make: String,
      model: String,
      year: Number,
      regNo: String,
    },
    scheduledDate: { type: Date },
    scheduledTime: { type: String },
    location: { type: locationSchema },
    status: { type: String, default: "pending" },
    trackingUpdates: { type: [trackingUpdateSchema], default: [] },
    price: { type: Number, default: 0 },
    paymentStatus: { type: String, default: "unpaid" },
    paymentMethod: { type: String },
    paymentId: { type: Schema.Types.ObjectId, ref: "Payment" },
    totalAmount: { type: Number, default: 0 },
    estimatedDuration: { type: Number, default: 0 },
    notes: { type: String },
  },
  { timestamps: true }
);

bookingSchema.virtual("duration").get(function () {
  return this.estimatedDuration || 0;
});

bookingSchema.pre("save", function (next) {
  if (!this.trackingUpdates) this.trackingUpdates = [];

  // Only add automatic tracking update if this is a status change (not initial creation)
  if (this.isModified("status") && !this.isNew) {
    this.trackingUpdates.push({
      status: this.status,
      message: `Status updated to ${this.status}`,
      timestamp: new Date(),
    });
  }

  next();
});

export default mongoose.models.Booking ||
  mongoose.model("Booking", bookingSchema);
