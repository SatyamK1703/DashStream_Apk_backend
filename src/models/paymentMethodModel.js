import mongoose from "mongoose";

const { Schema } = mongoose;

const paymentMethodSchema = new Schema(
  {
    type: {
      type: String,
      enum: ['razorpay', 'cod', 'upi', 'card', 'wallet'],
      required: true
    },
    name: {
      type: String,
      required: true
    },
    description: {
      type: String
    },
    icon: {
      type: String
    },
    isActive: {
      type: Boolean,
      default: true
    },
    isDefault: {
      type: Boolean,
      default: false
    },
    
    // Configuration for different payment methods
    config: {
      // For COD
      codSettings: {
        minAmount: { type: Number, default: 0 },
        maxAmount: { type: Number, default: 10000 },
        allowedServiceTypes: [{ type: String }],
        collectBeforeService: { type: Boolean, default: false },
        allowPartialPayment: { type: Boolean, default: false }
      },
      
      // For online payments
      gateway: {
        provider: { type: String }, // 'razorpay', 'stripe', etc.
        keyId: { type: String },
        isLive: { type: Boolean, default: false }
      },
      
      // Processing fees
      fees: {
        percentage: { type: Number, default: 0 },
        fixed: { type: Number, default: 0 },
        maxFee: { type: Number }
      }
    },
    
    // Availability settings
    availability: {
      enabled: { type: Boolean, default: true },
      enabledForServices: [{ type: Schema.Types.ObjectId, ref: "Service" }],
      disabledForServices: [{ type: Schema.Types.ObjectId, ref: "Service" }],
      minOrderValue: { type: Number, default: 0 },
      maxOrderValue: { type: Number }
    },
    
    displayOrder: { type: Number, default: 0 },
    
  },
  { timestamps: true }
);

// Ensure only one default payment method
paymentMethodSchema.pre('save', async function(next) {
  if (this.isDefault && this.isModified('isDefault')) {
    await this.constructor.updateMany(
      { _id: { $ne: this._id } },
      { isDefault: false }
    );
  }
  next();
});

// Add indexes for better performance
paymentMethodSchema.index({ type: 1, isActive: 1 });
paymentMethodSchema.index({ isDefault: 1 });
paymentMethodSchema.index({ displayOrder: 1 });

export default mongoose.models.PaymentMethod ||
  mongoose.model("PaymentMethod", paymentMethodSchema);