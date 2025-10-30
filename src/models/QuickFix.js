import mongoose from 'mongoose';

const QuickFixSchema = new mongoose.Schema({
  label: {
    type: String,
    required: true,
  },
  image: {
    type: String,
    required: true,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  // You can add more fields here as needed, for example:
  // description: String,
  // price: Number,
});

export default mongoose.model('QuickFix', QuickFixSchema);
