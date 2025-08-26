import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    title: {
      type: String,
      required: true
    },
    message: {
      type: String,
      required: true
    },
    type: {
      type: String,
      enum: ['booking', 'promo', 'payment', 'system'],
      required: true
    },
    relatedId: {
      type: String
    },
    isRead: {
      type: Boolean,
      default: false
    },
    readAt: {
      type: Date
    },
    actionUrl: {
      type: String
    },
    meta: {
      type: Object // For extra data like discount code, estimated time, etc.
    }
  },
  {
    timestamps: true
  }
);

// Indexes for faster queries
notificationSchema.index({ recipient: 1, createdAt: -1 });
notificationSchema.index({ recipient: 1, isRead: 1 });
notificationSchema.index({ type: 1 });

// Middleware to populate recipient details
notificationSchema.pre(/^find/, function(next) {
  this.populate({
    path: 'recipient',
    select: 'name role'
  });
  
  next();
});

// Static method to create a new notification
notificationSchema.statics.createNotification = async function(notificationData) {
  return await this.create(notificationData);
};

// Static method to mark all notifications as read for a user
notificationSchema.statics.markAllAsRead = async function(userId) {
  return await this.updateMany(
    { recipient: userId, isRead: false },
    { isRead: true }
  );
};

// Static method to delete expired notifications
notificationSchema.statics.deleteExpired = async function() {
  const now = new Date();
  return await this.deleteMany({
    expiresAt: { $lt: now }
  });
};

const Notification = mongoose.model('Notification', notificationSchema);

export default Notification;