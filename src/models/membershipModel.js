import mongoose from 'mongoose';

const MembershipSchema = new mongoose.Schema({
  planId: { type: String, required: true },
  userId: { type: String, required: true },
  orderId: { type: String, required: true },
  paymentLinkId: { type: String },
  paymentId: { type: String },
  signature: { type: String },
  status: { type: String, default: 'pending' },
  validUntil: { type: Date },
  autoRenew: { type: Boolean, default: false },
});

export default mongoose.model('Membership', MembershipSchema);
