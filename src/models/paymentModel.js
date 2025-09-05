import mongoose from 'mongoose';

const paymentSchema = new mongoose.Schema(
  {
    bookingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Booking',
      required: [true, 'Booking ID is required']
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required']
    },
    amount: {
      type: Number,
      required: [true, 'Amount is required']
    },
    currency: {
      type: String,
      default: 'INR'
    },
    razorpayOrderId: {
      type: String,
      required: [true, 'Razorpay order ID is required']
    },
    razorpayPaymentId: {
      type: String
    },
    razorpaySignature: {
      type: String
    },
    status: {
      type: String,
      enum: ['created', 'authorized', 'captured', 'refunded', 'failed'],
      default: 'created'
    },
    paymentMethod: {
      type: String,
      enum: ['card', 'netbanking', 'wallet', 'upi', 'emi'],
    },
    paymentDetails: {
      type: Object
    },
    notes: {
      type: Object
    },
    receiptId: {
      type: String
    },
    refundId: {
      type: String
    },
    refundAmount: {
      type: Number
    },
    refundStatus: {
      type: String,
      enum: ['pending', 'processed', 'failed']
    },
    errorCode: {
      type: String
    },
    errorDescription: {
      type: String
    },
    webhookEvents: [{
      eventId: String,
      eventType: String,
      timestamp: Date,
      payload: Object
    }]
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Indexes for faster queries
paymentSchema.index({ userId: 1 });
paymentSchema.index({ bookingId: 1 });
paymentSchema.index({ razorpayOrderId: 1 }, { unique: true });
paymentSchema.index({ razorpayPaymentId: 1 }, { sparse: true });

// Virtual for calculating refund percentage
paymentSchema.virtual('refundPercentage').get(function() {
  if (!this.refundAmount || !this.amount) return 0;
  return (this.refundAmount / this.amount) * 100;
});

const Payment = mongoose.model('Payment', paymentSchema);

export default Payment;