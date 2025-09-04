import mongoose from "mongoose";

const deviceTokenSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    token: {
      type: String,
      required: true,
      unique: true
    },
    deviceType: {
      type: String,
      enum: ['ios', 'android', 'web'],
      required: true
    },
    deviceInfo: {
      type: Object,
      default: {}
    },
    isActive: {
      type: Boolean,
      default: true
    },
    lastUsed: {
      type: Date,
      default: Date.now
    }
  },
  {
    timestamps: true
  }
);

// Indexes for faster queries
deviceTokenSchema.index({ user: 1 });
deviceTokenSchema.index({ token: 1 }, { unique: true });

// Static method to register a new device token
deviceTokenSchema.statics.registerToken = async function(userId, tokenData) {
  const { token, deviceType, deviceInfo } = tokenData;
  
  // Upsert the token (update if exists, insert if not)
  return await this.findOneAndUpdate(
    { token },
    { 
      user: userId,
      token,
      deviceType,
      deviceInfo,
      isActive: true,
      lastUsed: Date.now()
    },
    { upsert: true, new: true }
  );
};

// Static method to deactivate a token
deviceTokenSchema.statics.deactivateToken = async function(token) {
  return await this.findOneAndUpdate(
    { token },
    { isActive: false },
    { new: true }
  );
};

// Static method to get all active tokens for a user
deviceTokenSchema.statics.getActiveTokensForUser = async function(userId) {
  return await this.find({
    user: userId,
    isActive: true
  });
};

// Static method to clean up old tokens
deviceTokenSchema.statics.cleanupOldTokens = async function(daysOld = 90) {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysOld);
  
  return await this.deleteMany({
    lastUsed: { $lt: cutoffDate }
  });
};

const DeviceToken = mongoose.model('DeviceToken', deviceTokenSchema);

export default DeviceToken;