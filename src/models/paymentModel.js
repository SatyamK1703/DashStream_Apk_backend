import mongoose from "mongoose";

const { Schema } = mongoose;

const webhookEventSchema = new Schema(
  {
    eventId: { type: String, required: true },
    eventType: { type: String, required: true },
    timestamp: { type: Date, default: Date.now },
    payload: { type: Schema.Types.Mixed },
  },
  { _id: false }
);

const paymentSchema = new Schema(
  {
    bookingId: { type: Schema.Types.ObjectId, ref: "Booking", required: true },
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    amount: { type: Number, required: true },
    currency: { type: String, default: "INR" },
    razorpayOrderId: { type: String },
    razorpayPaymentId: { type: String },
    razorpayPaymentLinkId: { type: String },
    razorpaySignature: { type: String },
    status: { type: String, default: "created" },
    paymentMethod: { type: String },
    paymentDetails: { type: Schema.Types.Mixed },
    notes: { type: Schema.Types.Mixed },
    receiptId: { type: String },
    refundId: { type: String },
    refundAmount: { type: Number, default: 0 },
    refundStatus: { type: String },
    errorCode: { type: String },
    errorDescription: { type: String },
    capturedAt: { type: Date },
    webhookEvents: { type: [webhookEventSchema], default: [] },
  },
  { timestamps: true }
);

paymentSchema.virtual("refundPercentage").get(function () {
  if (!this.refundAmount || !this.amount) return 0;
  return (this.refundAmount / this.amount) * 100;
});

// Add indexes explicitly to have full control over index options
// Using sparse indexes to allow multiple null values (important for payment links)
paymentSchema.index({ bookingId: 1, status: 1 });
paymentSchema.index({ razorpayOrderId: 1 }, { sparse: true, unique: true });
paymentSchema.index({ razorpayPaymentId: 1 }, { sparse: true });
paymentSchema.index({ razorpayPaymentLinkId: 1 }, { sparse: true });

export default mongoose.models.Payment ||
  mongoose.model("Payment", paymentSchema);
