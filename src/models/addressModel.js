import mongoose from 'mongoose';

const addressSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    required: true,
  },
  name: {
    type: String,
    required: [true, 'Address name is required'],
    trim: true,
  },
  address: {
    type: String,
    required: [true, 'Address line is required'],
    trim: true,
  },
  city: {
    type: String,
    required: [true, 'City is required'],
    trim: true,
  },
  pincode: {
    type: String,
    required: [true, 'Pincode is required'],
    trim: true,
  },
  isDefault: {
    type: Boolean,
    default: false,
  },
}, {
  timestamps: true,
});

addressSchema.pre('save', async function (next) {
  if (this.isModified('isDefault') && this.isDefault) {
    await this.constructor.updateMany({ user: this.user, _id: { $ne: this._id } }, { isDefault: false });
  }
  next();
});

const Address = mongoose.model('Address', addressSchema);

export default Address;