import mongoose from "mongoose";

const paymentSchema = new mongoose.Schema(
  {
    bookingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Booking",
      required: [true, "Booking ID is required"],
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "User ID is required"],
    },
    amount: {
      type: Number,
      required: [true, "Amount is required"],
    },
    currency: {
      type: String,
      default: "INR",
    },
    razorpayOrderId: {
      type: String,
      required: [true, "Razorpay order ID is required"],
    },
    razorpayPaymentId: {
      type: String,
    },
    razorpaySignature: {
      type: String,
    },
    status: {
      type: String,
      enum: ["created", "authorized", "captured", "refunded", "failed"],
      default: "created",
    },
    paymentMethod: {
      type: String,
      enum: ["card", "netbanking", "wallet", "upi", "emi"],
    },
    paymentDetails: {
      type: Object,
    },
    notes: {
      type: Object,
    },
    receiptId: {
      type: String,
    },
    refundId: {
      type: String,
    },
    refundAmount: {
      type: Number,
    },
    refundStatus: {
      type: String,
      enum: ["pending", "processed", "failed"],
    },
    errorCode: {
      type: String,
    },
    errorDescription: {
      type: String,
    },
    webhookEvents: [
      {
        eventId: String,
        eventType: String,
        timestamp: Date,
        payload: Object,
      },
    ],
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// PERFORMANCE OPTIMIZATION: Enhanced Payment Indexes
// Primary lookup indexes
paymentSchema.index({ userId: 1 }); // User payment history
paymentSchema.index({ bookingId: 1 }); // Booking payment lookup
paymentSchema.index({ razorpayOrderId: 1 }, { unique: true }); // Razorpay order tracking
paymentSchema.index({ razorpayPaymentId: 1 }, { sparse: true }); // Payment ID lookup

// Additional critical indexes
paymentSchema.index({ status: 1 }); // Payment status queries
paymentSchema.index({ createdAt: -1 }); // Recent payments
paymentSchema.index({ paymentMethod: 1 }); // Payment method analytics
paymentSchema.index({ currency: 1 }); // Currency-based queries

// Compound indexes for complex queries
paymentSchema.index({ userId: 1, status: 1 }); // User payment status
paymentSchema.index({ userId: 1, createdAt: -1 }); // User payment history
paymentSchema.index({ status: 1, createdAt: -1 }); // Payment status timeline
paymentSchema.index({ bookingId: 1, status: 1 }); // Booking payment verification

// Financial reporting indexes
paymentSchema.index({ amount: -1 }); // Revenue analytics
paymentSchema.index({ createdAt: -1, amount: -1 }); // Revenue by time
paymentSchema.index({ paymentMethod: 1, status: 1 }); // Payment method success rates

// Refund tracking indexes
paymentSchema.index({ refundStatus: 1 }, { sparse: true }); // Refund processing
paymentSchema.index({ refundId: 1 }, { sparse: true }); // Refund lookup

// Virtual for calculating refund percentage
paymentSchema.virtual("refundPercentage").get(function () {
  if (!this.refundAmount || !this.amount) return 0;
  return (this.refundAmount / this.amount) * 100;
});

const Payment = mongoose.model("Payment", paymentSchema);

export default Payment;
