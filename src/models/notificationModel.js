import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema(
  {
    recipient: {
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
      enum: ['booking', 'promo', 'payment', 'system', 'chat'],
      required: true
    },
    relatedId: {
      type: String
    },
    read: {
      type: Boolean,
      default: false
    },
    readAt: {
      type: Date
    },
    actionType: {
      type: String,
      enum: ['open_booking', 'open_chat', 'open_profile', 'open_service', 'open_payment', 'none'],
      default: 'none'
    },
    actionParams: {
      type: Object // Parameters for the action like bookingId, chatId, etc.
    },
    priority: {
      type: String,
      enum: ['high', 'default', 'low'],
      default: 'default'
    },
    image: {
      type: String // URL to an image to display in the notification
    },
    expiresAt: {
      type: Date
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