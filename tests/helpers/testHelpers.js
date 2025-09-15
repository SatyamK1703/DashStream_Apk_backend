import jwt from "jsonwebtoken";
import User from "../../src/models/userModel.js";

/**
 * Generate a test JWT token
 */
export const generateTestToken = (userId, role = "customer") => {
  return jwt.sign(
    { id: userId, role },
    process.env.JWT_SECRET || "test-secret",
    { expiresIn: "1d" }
  );
};

/**
 * Create a test user
 */
export const createTestUser = async (userData = {}) => {
  const defaultUser = {
    name: "Test User",
    email: "test@example.com",
    phone: "+1234567890",
    role: "customer",
    isPhoneVerified: true,
    ...userData,
  };

  const user = await User.create(defaultUser);
  return user;
};

/**
 * Create a test professional user
 */
export const createTestProfessional = async (userData = {}) => {
  const defaultProfessional = {
    name: "Test Professional",
    email: "professional@example.com",
    phone: "+1234567891",
    role: "professional",
    isPhoneVerified: true,
    professionalProfile: {
      skills: ["plumbing"],
      experience: 5,
      rating: 4.5,
      available: true,
    },
    ...userData,
  };

  const professional = await User.create(defaultProfessional);
  return professional;
};

/**
 * Create a test admin user
 */
export const createTestAdmin = async (userData = {}) => {
  const defaultAdmin = {
    name: "Test Admin",
    email: "admin@example.com",
    phone: "+1234567892",
    role: "admin",
    isPhoneVerified: true,
    ...userData,
  };

  const admin = await User.create(defaultAdmin);
  return admin;
};

/**
 * Generate authentication headers
 */
export const getAuthHeaders = (token) => ({
  Authorization: `Bearer ${token}`,
});

/**
 * Clean up test data
 */
export const cleanupTestData = async () => {
  const models = [
    "User",
    "Booking",
    "Service",
    "Payment",
    "Notification",
    "Offer",
    "Membership",
    "Vehicle",
    "DeviceToken",
  ];

  for (const modelName of models) {
    try {
      const mongoose = await import("mongoose");
      const model = mongoose.default.model(modelName);
      await model.deleteMany({});
    } catch (error) {
      // Model might not exist, continue
    }
  }
};

/**
 * Wait for a specified time
 */
export const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Mock OTP verification
 */
export const mockOTPVerification = () => {
  return "123456"; // Fixed OTP for testing
};

/**
 * Generate test phone number
 */
export const generateTestPhone = () => {
  return `+1${Math.floor(Math.random() * 9000000000) + 1000000000}`;
};

/**
 * Generate test email
 */
export const generateTestEmail = () => {
  return `test${Date.now()}@example.com`;
};
