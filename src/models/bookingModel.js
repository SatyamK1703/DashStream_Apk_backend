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
    professional: { type: Schema.Types.ObjectId, ref: "User" },
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
    paymentMethod: { 
      type: String, 
      enum: ['razorpay', 'cod', 'wallet', 'upi', 'card'],
      default: 'razorpay'
    },
    paymentId: { type: Schema.Types.ObjectId, ref: "Payment" },
    totalAmount: { type: Number, default: 0 },
    estimatedDuration: { type: Number, default: 0 },
    notes: { type: String },
    rating: {
      rating: { type: Number, min: 1, max: 5 },
      review: { type: String },
      createdAt: { type: Date, default: Date.now },
    },
    
    // COD specific fields
    codAmount: { type: Number, default: 0 },
    codStatus: { 
      type: String, 
      enum: ['pending', 'collected', 'failed', 'cancelled'],
      default: function() {
        return this.paymentMethod === 'cod' ? 'pending' : undefined;
      }
    },
    codCollectedAt: { type: Date },
    codCollectedBy: { type: Schema.Types.ObjectId, ref: "Professional" },
    
    // Service completion fields
    serviceStartedAt: { type: Date },
    serviceCompletedAt: { type: Date },
    completionNotes: { type: String },
  },
  { timestamps: true }
);

bookingSchema.virtual("duration").get(function () {
  return this.estimatedDuration || 0;
});

bookingSchema.pre("save", function (next) {
  if (!this.trackingUpdates) this.trackingUpdates = [];

  // Set COD amount when payment method is COD
  if (this.paymentMethod === 'cod' && this.isModified('paymentMethod')) {
    this.codAmount = this.totalAmount;
    this.codStatus = 'pending';
  }

  // Update payment status based on payment method and COD status
  if (this.paymentMethod === 'cod') {
    if (this.codStatus === 'collected') {
      this.paymentStatus = 'paid';
    } else if (this.codStatus === 'failed' || this.codStatus === 'cancelled') {
      this.paymentStatus = 'failed';
    }
  }

  // Only add automatic tracking update if this is a status change (not initial creation)
  if (this.isModified("status") && !this.isNew) {
    const statusMessages = {
      pending: 'Booking created and waiting for confirmation',
      confirmed: 'Booking confirmed and professional assigned',
      'in-progress': 'Service is in progress',
      completed: 'Service completed successfully',
      cancelled: 'Booking cancelled',
    };

    this.trackingUpdates.push({
      status: this.status,
      message: statusMessages[this.status] || `Status updated to ${this.status}`,
      timestamp: new Date(),
    });
  }

  next();
});

export default mongoose.models.Booking ||
  mongoose.model("Booking", bookingSchema);
