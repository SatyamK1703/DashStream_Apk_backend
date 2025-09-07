import User from '../models/userModel.js';
import cloudinary from '../utils/cloudinary.js';
import { AppError } from '../middleware/errorMiddleware.js';

/**
 * UserService - Shared user management functionality
 * This service consolidates common user operations used across userController and professionalController
 */
class UserService {
 //Update user profile
 
  static async updateUserProfile(userId, updateData) {
    // Find user by ID
    const user = await User.findById(userId);
    
    if (!user) {
      throw new AppError('User not found', 404);
    }
    
    // Update user fields
    Object.keys(updateData).forEach(key => {
      if (updateData[key] !== undefined) {
        user[key] = updateData[key];
      }
    });
    
    // Mark profile as complete if all required fields are filled
    if (user.name && user.email) {
      user.profileComplete = true;
    }
    
    // Save user
    await user.save({ validateBeforeSave: false });
    
    return user;
  }
  
//Upload profile image to Cloudinary
 
  static async uploadProfileImage(file, userId) {
    if (!file) {
      throw new AppError('Please upload an image', 400);
    }
    
    // Find user
    const user = await User.findById(userId);
    
    if (!user) {
      throw new AppError('User not found', 404);
    }
    
    // Delete old image if exists
    if (user.profileImage && user.profileImage.public_id) {
      await cloudinary.uploader.destroy(user.profileImage.public_id);
    }
    
    // Upload new image
    const result = await cloudinary.uploader.upload(file.path, {
      folder: 'dashstream/profiles',
      width: 500,
      crop: 'scale'
    });
    
    // Update user profile image
    user.profileImage = {
      public_id: result.public_id,
      url: result.secure_url
    };
    
    await user.save({ validateBeforeSave: false });
    
    return user;
  }
  
  //Format user data for response
  static formatUserData(user) {
    return {
      id: user._id,
      name: user.name || '',
      email: user.email || '',
      phone: user.phone,
      role: user.role,
      profileImage: user.profileImage?.url || '',
      profileComplete: user.profileComplete || false,
      isPhoneVerified: user.isPhoneVerified || false,
      // Add additional fields based on role if needed
      ...(user.role === 'professional' ? {
        professionalDetails: user.professionalDetails || {},
        location: user.location || {},
        isAvailable: user.isAvailable || false
      } : {})
    };
  }
  
  //Get user by ID with role validation
 
  static async getUserById(userId, role = null) {
    const user = await User.findById(userId);
    
    if (!user) {
      throw new AppError('User not found', 404);
    }
    
    // Validate role if specified
    if (role && user.role !== role) {
      throw new AppError(`User is not a ${role}`, 403);
    }
    
    return user;
  }
}

export default UserService;