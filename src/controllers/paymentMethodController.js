import PaymentMethod from "../models/paymentMethodModel.js";
import { asyncHandler } from "../middleware/errorMiddleware.js";
import { AppError } from "../utils/appError.js";

// GET /api/payment-methods - Get all available payment methods
export const getPaymentMethods = asyncHandler(async (req, res, next) => {
  const { serviceIds, orderValue } = req.query;
  
  let query = { isActive: true };
  
  // Build query to filter payment methods based on service and order value constraints
  const andConditions = [];
  
  if (serviceIds) {
    const serviceIdArray = Array.isArray(serviceIds) ? serviceIds : [serviceIds];
    andConditions.push({
      $or: [
        { "availability.enabledForServices": { $exists: false } },
        { "availability.enabledForServices": { $size: 0 } },
        { "availability.enabledForServices": { $in: serviceIdArray } }
      ]
    });
    
    andConditions.push({
      "availability.disabledForServices": { $nin: serviceIdArray }
    });
  }
  
  if (orderValue) {
    const value = parseFloat(orderValue);
    andConditions.push({
      $or: [
        { "availability.minOrderValue": { $lte: value } },
        { "availability.minOrderValue": { $exists: false } }
      ]
    });
    
    andConditions.push({
      $or: [
        { "availability.maxOrderValue": { $gte: value } },
        { "availability.maxOrderValue": { $exists: false } }
      ]
    });
  }
  
  if (andConditions.length > 0) {
    query.$and = andConditions;
  }
  
  const paymentMethods = await PaymentMethod.find(query)
    .sort({ displayOrder: 1, createdAt: 1 })
    .select('-config.gateway.keyId'); // Don't expose sensitive gateway keys
  
  // Filter and format payment methods for frontend
  const formattedMethods = paymentMethods.map(method => ({
    id: method._id,
    type: method.type,
    name: method.name,
    description: method.description,
    icon: method.icon,
    isDefault: method.isDefault,
    fees: method.config?.fees || {},
    
    // COD specific information
    ...(method.type === 'cod' && {
      codSettings: {
        minAmount: method.config?.codSettings?.minAmount || 0,
        maxAmount: method.config?.codSettings?.maxAmount,
        collectBeforeService: method.config?.codSettings?.collectBeforeService || false,
        allowPartialPayment: method.config?.codSettings?.allowPartialPayment || false
      }
    })
  }));
  
  res.status(200).json({
    status: "success",
    data: {
      paymentMethods: formattedMethods
    }
  });
});

// POST /api/payment-methods - Create new payment method (Admin only)
export const createPaymentMethod = asyncHandler(async (req, res, next) => {
  const paymentMethod = await PaymentMethod.create(req.body);
  
  res.status(201).json({
    status: "success",
    data: {
      paymentMethod
    }
  });
});

// PUT /api/payment-methods/:id - Update payment method (Admin only)
export const updatePaymentMethod = asyncHandler(async (req, res, next) => {
  const paymentMethod = await PaymentMethod.findByIdAndUpdate(
    req.params.id,
    req.body,
    { new: true, runValidators: true }
  );
  
  if (!paymentMethod) {
    return next(new AppError("No payment method found with that ID", 404));
  }
  
  res.status(200).json({
    status: "success",
    data: {
      paymentMethod
    }
  });
});

// DELETE /api/payment-methods/:id - Delete payment method (Admin only)
export const deletePaymentMethod = asyncHandler(async (req, res, next) => {
  const paymentMethod = await PaymentMethod.findByIdAndDelete(req.params.id);
  
  if (!paymentMethod) {
    return next(new AppError("No payment method found with that ID", 404));
  }
  
  res.status(204).json({
    status: "success",
    data: null
  });
});

// POST /api/payment-methods/seed - Seed default payment methods
export const seedPaymentMethods = asyncHandler(async (req, res, next) => {
  // Check if payment methods already exist
  const existingMethods = await PaymentMethod.countDocuments();
  
  if (existingMethods > 0) {
    return res.status(200).json({
      status: "success",
      message: "Payment methods already seeded"
    });
  }
  
  const defaultMethods = [
    {
      type: 'razorpay',
      name: 'Online Payment',
      description: 'Pay online using cards, UPI, wallets & more',
      icon: 'card-outline',
      isDefault: true,
      displayOrder: 1,
      config: {
        gateway: {
          provider: 'razorpay',
          isLive: false
        },
        fees: {
          percentage: 2.5,
          maxFee: 50
        }
      },
      availability: {
        enabled: true,
        minOrderValue: 1
      }
    },
    {
      type: 'cod',
      name: 'Cash on Delivery',
      description: 'Pay cash after service completion',
      icon: 'cash-outline',
      isDefault: false,
      displayOrder: 2,
      config: {
        codSettings: {
          minAmount: 50,
          maxAmount: 5000,
          collectBeforeService: false,
          allowPartialPayment: false
        },
        fees: {
          percentage: 0,
          fixed: 0
        }
      },
      availability: {
        enabled: true,
        minOrderValue: 50,
        maxOrderValue: 5000
      }
    },
    {
      type: 'upi',
      name: 'UPI Payment',
      description: 'Pay using UPI apps like GPay, PhonePe',
      icon: 'phone-portrait-outline',
      isDefault: false,
      displayOrder: 3,
      config: {
        gateway: {
          provider: 'razorpay',
          isLive: false
        },
        fees: {
          percentage: 1.5
        }
      },
      availability: {
        enabled: true,
        minOrderValue: 1
      }
    }
  ];
  
  const created = await PaymentMethod.insertMany(defaultMethods);
  
  res.status(201).json({
    status: "success",
    data: {
      paymentMethods: created,
      count: created.length
    }
  });
});