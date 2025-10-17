import { asyncHandler, AppError } from '../middleware/errorMiddleware.js';
import FirebaseService from '../services/FirebaseService.js';
import User from '../models/userModel.js';



// Location Controllers
export const updateLocation = asyncHandler(async (req, res, next) => {
  try {
    const { latitude, longitude, accuracy, speed, heading } = req.body;
    const userId = req.user.id;
    
    await FirebaseService.updateLocation(userId, {
      latitude,
      longitude,
      accuracy,
      speed,
      heading
    });
    
    return res.status(200).json({
      success: true,
      message: 'Location updated successfully'
    });
  } catch (error) {
    console.error('Error updating location:', error);
    return next(new AppError(error.message || 'Failed to update location', error.statusCode || 500));
  }
});

export const updateStatus = asyncHandler(async (req, res, next) => {
  try {
    const { status } = req.body;
    const userId = req.user.id;
    
    await FirebaseService.updateStatus(userId, status);
    
    return res.status(200).json({
      success: true,
      message: 'Status updated successfully'
    });
  } catch (error) {
    console.error('Error updating status:', error);
    return next(new AppError(error.message || 'Failed to update status', error.statusCode || 500));
  }
});

export const setTrackingEnabled = asyncHandler(async (req, res, next) => {
  try {
    const { enabled } = req.body;
    const userId = req.user.id;
    
    if (enabled === undefined) {
      return next(new AppError('Enabled flag is required', 400));
    }
    
    // Get user data to check if they're a professional
    const user = await User.findById(userId);
    
    if (!user || user.role !== 'professional') {
      return next(new AppError('Only professionals can update tracking settings', 403));
    }
    
    // Update tracking settings in Firebase
    await FirebaseService.updateTrackingEnabled(userId, enabled);
    
    return res.status(200).json({
      success: true,
      message: `Tracking ${enabled ? 'enabled' : 'disabled'} successfully`
    });
  } catch (error) {
    console.error('Error setting tracking enabled:', error);
    return next(new AppError(error.message || 'Failed to update tracking settings', error.statusCode || 500));
  }
});

// Notification Controllers
export const sendNotification = asyncHandler(async (req, res, next) => {
  try {
    const { token, title, body, data } = req.body;
    
    if (!token || !title || !body) {
      return next(new AppError('Token, title and body are required', 400));
    }
    
    const result = await FirebaseService.sendNotification(token, {
      title,
      body,
      data: data || {}
    });
    
    return res.status(200).json({
      success: true,
      message: 'Notification sent successfully',
      data: result
    });
  } catch (error) {
    console.error('Error sending notification:', error);
    return next(new AppError(error.message || 'Failed to send notification', error.statusCode || 500));
  }
});

export const sendMulticastNotification = asyncHandler(async (req, res, next) => {
  try {
    const { tokens, title, body, data } = req.body;
    
    if (!tokens || !Array.isArray(tokens) || tokens.length === 0 || !title || !body) {
      return next(new AppError('Tokens array, title and body are required', 400));
    }
    
    const result = await FirebaseService.sendMulticastNotification(tokens, {
      title,
      body,
      data: data || {}
    });
    
    return res.status(200).json({
      success: true,
      message: 'Multicast notification sent successfully',
      data: result
    });
  } catch (error) {
    console.error('Error sending multicast notification:', error);
    return next(new AppError(error.message || 'Failed to send multicast notification', error.statusCode || 500));
  }
});

