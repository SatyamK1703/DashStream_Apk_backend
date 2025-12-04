
import Joi from 'joi';

// Auth validation schemas
export const authSchemas = {
  sendOtp: Joi.object({
    phone: Joi.string()
      .pattern(/^(\+[1-9]\d{10,14}|[0-9]{10})$/)
      .required()
      .messages({
        'string.pattern.base': 'Phone number must be a valid format with or without country code',
        'any.required': 'Phone number is required'
      })
  }),

  verifyOtp: Joi.object({
    phone: Joi.string()
      .pattern(/^(\+[1-9]\d{10,14}|[0-9]{10})$/)
      .required()
      .messages({
        'string.pattern.base': 'Phone number must be a valid format with or without country code',
        'any.required': 'Phone number is required'
      }),
    otp: Joi.string()
      .length(4)
      .pattern(/^[0-9]+$/)
      .required()
      .messages({
        'string.length': 'OTP must be 4 digits',
        'string.pattern.base': 'OTP must contain only numbers',
        'any.required': 'OTP is required'
      })
  }),

  // Removed Firebase Phone Authentication schemas as we've migrated to Twilio
};

// Payment validation schemas
export const paymentSchemas = {
  createOrder: Joi.object({
    bookingId: Joi.string()
      .pattern(/^[0-9a-fA-F]{24}$/)
      .required()
      .messages({
        'string.pattern.base': 'Booking ID must be a valid MongoDB ObjectId',
        'any.required': 'Booking ID is required'
      }),
    amount: Joi.number()
      .positive()
      .required()
      .messages({
        'number.base': 'Amount must be a number',
        'number.positive': 'Amount must be positive',
        'any.required': 'Amount is required'
      }),
    notes: Joi.object().optional()
  }),

  verifyPayment: Joi.object({
    razorpay_order_id: Joi.string().required(),
    razorpay_payment_id: Joi.string().required(),
    razorpay_signature: Joi.string().required()
  }).messages({
    'any.required': 'All payment verification parameters are required'
  })
};

// Location validation schemas
export const locationSchemas = {
  updateLocation: Joi.object({
    latitude: Joi.number()
      .min(-90).max(90)
      .required()
      .messages({
        'number.base': 'Latitude must be a number',
        'number.min': 'Latitude must be between -90 and 90',
        'number.max': 'Latitude must be between -90 and 90',
        'any.required': 'Latitude is required'
      }),
    longitude: Joi.number()
      .min(-180).max(180)
      .required()
      .messages({
        'number.base': 'Longitude must be a number',
        'number.min': 'Longitude must be between -180 and 180',
        'number.max': 'Longitude must be between -180 and 180',
        'any.required': 'Longitude is required'
      }),
    accuracy: Joi.number().positive().optional(),
    speed: Joi.number().min(0).optional(),
    heading: Joi.number().min(0).max(360).optional(),
    batteryLevel: Joi.number().min(0).max(100).optional(),
    networkType: Joi.string().optional()
  }),

  updateStatus: Joi.object({
    status: Joi.string()
      .valid('online', 'offline', 'busy', 'away')
      .required()
      .messages({
        'any.only': 'Status must be one of: online, offline, busy, away',
        'any.required': 'Status is required'
      })
  }),

  setTrackingEnabled: Joi.object({
    enabled: Joi.boolean()
      .required()
      .messages({
        'boolean.base': 'Enabled must be a boolean value',
        'any.required': 'Enabled flag is required'
      })
  }),

  updateTrackingSettings: Joi.object({
    updateInterval: Joi.number().integer().min(5).optional(),
    significantChangeThreshold: Joi.number().min(0).optional(),
    batteryOptimizationEnabled: Joi.boolean().optional(),
    maxHistoryItems: Joi.number().integer().min(1).optional()
  })
};

// Booking validation schemas
export const bookingSchemas = {
  createBooking: Joi.object({
    serviceId: Joi.string()
      .pattern(/^[0-9a-fA-F]{24}$/)
      .required()
      .messages({
        'string.pattern.base': 'Service ID must be a valid MongoDB ObjectId',
        'any.required': 'Service ID is required'
      }),
    professionalId: Joi.string()
      .pattern(/^[0-9a-fA-F]{24}$/)
      .required()
      .messages({
        'string.pattern.base': 'Professional ID must be a valid MongoDB ObjectId',
        'any.required': 'Professional ID is required'
      }),
    scheduledDate: Joi.date()
      .min('now')
      .required()
      .messages({
        'date.base': 'Scheduled date must be a valid date',
        'date.min': 'Scheduled date must be in the future',
        'any.required': 'Scheduled date is required'
      }),
    scheduledTime: Joi.string()
      .pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
      .required()
      .messages({
        'string.pattern.base': 'Scheduled time must be in HH:MM format',
        'any.required': 'Scheduled time is required'
      }),
    addressId: Joi.string()
      .pattern(/^[0-9a-fA-F]{24}$/)
      .required()
      .messages({
        'string.pattern.base': 'Address ID must be a valid MongoDB ObjectId',
        'any.required': 'Address ID is required'
      }),
    vehicleId: Joi.string()
      .pattern(/^[0-9a-fA-F]{24}$/)
      .optional()
      .messages({
        'string.pattern.base': 'Vehicle ID must be a valid MongoDB ObjectId'
      }),
    notes: Joi.string().max(500).optional()
  }),

  updateBookingStatus: Joi.object({
    status: Joi.string()
      .valid('pending', 'confirmed', 'in_progress', 'completed', 'cancelled')
      .required()
      .messages({
        'any.only': 'Status must be one of: pending, confirmed, in_progress, completed, cancelled',
        'any.required': 'Status is required'
      }),
    reason: Joi.string().max(500).when('status', {
      is: 'cancelled',
      then: Joi.required(),
      otherwise: Joi.optional()
    })
  }),

  addTrackingUpdate: Joi.object({
    status: Joi.string()
      .valid('on_the_way', 'arrived', 'started', 'completed')
      .required()
      .messages({
        'any.only': 'Status must be one of: on_the_way, arrived, started, completed',
        'any.required': 'Status is required'
      }),
    message: Joi.string().max(200).optional(),
    location: Joi.object({
      latitude: Joi.number().min(-90).max(90).required(),
      longitude: Joi.number().min(-180).max(180).required()
    }).optional()
  }),

  rateBooking: Joi.object({
    rating: Joi.number()
      .min(1)
      .max(5)
      .required()
      .messages({
        'number.base': 'Rating must be a number',
        'number.min': 'Rating must be at least 1',
        'number.max': 'Rating must be at most 5',
        'any.required': 'Rating is required'
      }),
    review: Joi.string().max(500).optional()
  })
};

// User validation schemas
export const userSchemas = {
  updateProfile: Joi.object({
    name: Joi.string().min(2).max(50).optional(),
    email: Joi.string().email().optional(),
    profileImage: Joi.string().uri().optional()
  }),

  updateProfessionalProfile: Joi.object({
    bio: Joi.string().max(500).optional(),
    experience: Joi.number().integer().min(0).optional(),
    specializations: Joi.array().items(Joi.string()).optional(),
    servicesOffered: Joi.array().items(
      Joi.string().pattern(/^[0-9a-fA-F]{24}$/)
    ).optional(),
    workingHours: Joi.object({
      monday: Joi.object({
        start: Joi.string().pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
        end: Joi.string().pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
        closed: Joi.boolean()
      }).optional(),
      tuesday: Joi.object({
        start: Joi.string().pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
        end: Joi.string().pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
        closed: Joi.boolean()
      }).optional(),
      wednesday: Joi.object({
        start: Joi.string().pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
        end: Joi.string().pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
        closed: Joi.boolean()
      }).optional(),
      thursday: Joi.object({
        start: Joi.string().pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
        end: Joi.string().pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
        closed: Joi.boolean()
      }).optional(),
      friday: Joi.object({
        start: Joi.string().pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
        end: Joi.string().pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
        closed: Joi.boolean()
      }).optional(),
      saturday: Joi.object({
        start: Joi.string().pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
        end: Joi.string().pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
        closed: Joi.boolean()
      }).optional(),
      sunday: Joi.object({
        start: Joi.string().pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
        end: Joi.string().pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
        closed: Joi.boolean()
      }).optional()
    }).optional()
  }),

  createAddress: Joi.object({
    type: Joi.string().valid('home', 'work', 'other').default('home'),
    name: Joi.string().min(1).max(100).required(),
    address: Joi.string().min(1).max(200).required(),
    landmark: Joi.string().max(200).optional().allow(''),
    city: Joi.string().min(1).max(100).required(),
    pincode: Joi.string().min(4).max(10).required(),
    country: Joi.string().max(50).default('IN'),
    coordinates: Joi.object({
      latitude: Joi.number().min(-90).max(90).default(0),
      longitude: Joi.number().min(-180).max(180).default(0)
    }).optional(),
    isDefault: Joi.boolean().optional()
  }),

  updateAddress: Joi.object({
    type: Joi.string().valid('home', 'work', 'other').optional(),
    name: Joi.string().min(1).max(100).optional(),
    address: Joi.string().min(1).max(200).optional(),
    landmark: Joi.string().max(200).optional().allow(''),
    city: Joi.string().min(1).max(100).optional(),
    pincode: Joi.string().min(4).max(10).optional(),
    country: Joi.string().max(50).optional(),
    coordinates: Joi.object({
      latitude: Joi.number().min(-90).max(90),
      longitude: Joi.number().min(-180).max(180)
    }).optional(),
    isDefault: Joi.boolean().optional()
  })
};

// Service validation schemas
export const serviceSchemas = {
  createService: Joi.object({
    title: Joi.string().min(3).max(100).required(),
    description: Joi.string().min(10).max(1000).required(),
    category: Joi.string()
      .valid('car wash', 'bike wash', 'detailing', 'maintenance', 'customization', 'other')
      .required(),
    price: Joi.number().positive().required(),
    discountPrice: Joi.number().positive().less(Joi.ref('price')).optional(),
    duration: Joi.string().required(),
    image: Joi.string().uri().optional(),
    vehicleType: Joi.string().valid('2 Wheeler', '4 Wheeler', 'Both').required(),
    isPopular: Joi.boolean().optional(),
    tags: Joi.array().items(Joi.string()).optional(),
    estimatedTime: Joi.string().optional()
  }),

  updateService: Joi.object({
    title: Joi.string().min(3).max(100).optional(),
    description: Joi.string().min(10).max(1000).optional(),
    category: Joi.string()
      .valid('car wash', 'bike wash', 'detailing', 'maintenance', 'customization', 'other')
      .optional(),
    price: Joi.number().positive().optional(),
    discountPrice: Joi.number().positive().less(Joi.ref('price')).optional(),
    duration: Joi.string().optional(),
    image: Joi.string().uri().optional(),
    vehicleType: Joi.string().valid('2 Wheeler', '4 Wheeler', 'Both').optional(),
    isPopular: Joi.boolean().optional(),
    isActive: Joi.boolean().optional(),
    tags: Joi.array().items(Joi.string()).optional(),
    estimatedTime: Joi.string().optional()
  })
};

// Offer validation schemas
export const offerSchemas = {
  createOffer: Joi.object({
    title: Joi.string()
      .min(3)
      .max(100)
      .required()
      .messages({
        'string.min': 'Offer title must be at least 3 characters long',
        'string.max': 'Offer title cannot exceed 100 characters',
        'any.required': 'Offer title is required'
      }),
    description: Joi.string()
      .min(10)
      .max(500)
      .required()
      .messages({
        'string.min': 'Offer description must be at least 10 characters long',
        'string.max': 'Offer description cannot exceed 500 characters',
        'any.required': 'Offer description is required'
      }),
    discount: Joi.number()
      .min(0)
      .max(100)
      .required()
      .messages({
        'number.min': 'Discount cannot be negative',
        'number.max': 'Discount cannot exceed 100%',
        'any.required': 'Discount value is required'
      }),
    discountType: Joi.string()
      .valid('percentage', 'fixed')
      .default('percentage')
      .messages({
        'any.only': 'Discount type must be either percentage or fixed'
      }),
    maxDiscountAmount: Joi.number()
      .positive()
      .optional()
      .messages({
        'number.positive': 'Maximum discount amount must be positive'
      }),
    minOrderAmount: Joi.number()
      .min(0)
      .default(0)
      .messages({
        'number.min': 'Minimum order amount cannot be negative'
      }),
    validFrom: Joi.date()
      .default(Date.now)
      .messages({
        'date.base': 'Valid from date must be a valid date'
      }),
    validUntil: Joi.date()
      .greater(Joi.ref('validFrom'))
      .required()
      .messages({
        'date.base': 'Valid until date must be a valid date',
        'date.greater': 'Valid until date must be after valid from date',
        'any.required': 'Valid until date is required'
      }),
    image: Joi.string().uri().optional(),
    bannerImage: Joi.string().uri().optional(),
    offerCode: Joi.string()
      .max(20)
      .uppercase()
      .optional()
      .messages({
        'string.max': 'Offer code cannot exceed 20 characters'
      }),
    usageLimit: Joi.number()
      .positive()
      .optional()
      .messages({
        'number.positive': 'Usage limit must be positive'
      }),
    userUsageLimit: Joi.number()
      .positive()
      .default(1)
      .messages({
        'number.positive': 'User usage limit must be positive'
      }),
    applicableServices: Joi.array()
      .items(Joi.string().pattern(/^[0-9a-fA-F]{24}$/))
      .optional()
      .messages({
        'string.pattern.base': 'Service ID must be a valid MongoDB ObjectId'
      }),
    applicableCategories: Joi.array()
      .items(Joi.string().valid('car wash', 'bike wash', 'detailing', 'maintenance', 'customization', 'other'))
      .optional()
      .messages({
        'any.only': 'Category must be one of: car wash, bike wash, detailing, maintenance, customization, other'
      }),
    vehicleType: Joi.string()
      .valid('2 Wheeler', '4 Wheeler', 'Both')
      .default('Both')
      .messages({
        'any.only': 'Vehicle type must be one of: 2 Wheeler, 4 Wheeler, Both'
      }),
    isFeatured: Joi.boolean().default(false),
    priority: Joi.number()
      .min(0)
      .default(0)
      .messages({
        'number.min': 'Priority cannot be negative'
      }),
    terms: Joi.string().max(1000).optional()
  }),

  updateOffer: Joi.object({
    title: Joi.string()
      .min(3)
      .max(100)
      .optional()
      .messages({
        'string.min': 'Offer title must be at least 3 characters long',
        'string.max': 'Offer title cannot exceed 100 characters'
      }),
    description: Joi.string()
      .min(10)
      .max(500)
      .optional()
      .messages({
        'string.min': 'Offer description must be at least 10 characters long',
        'string.max': 'Offer description cannot exceed 500 characters'
      }),
    discount: Joi.number()
      .min(0)
      .max(100)
      .optional()
      .messages({
        'number.min': 'Discount cannot be negative',
        'number.max': 'Discount cannot exceed 100%'
      }),
    discountType: Joi.string()
      .valid('percentage', 'fixed')
      .optional()
      .messages({
        'any.only': 'Discount type must be either percentage or fixed'
      }),
    maxDiscountAmount: Joi.number()
      .positive()
      .optional()
      .messages({
        'number.positive': 'Maximum discount amount must be positive'
      }),
    minOrderAmount: Joi.number()
      .min(0)
      .optional()
      .messages({
        'number.min': 'Minimum order amount cannot be negative'
      }),
    validFrom: Joi.date()
      .optional()
      .messages({
        'date.base': 'Valid from date must be a valid date'
      }),
    validUntil: Joi.date()
      .greater(Joi.ref('validFrom'))
      .optional()
      .messages({
        'date.base': 'Valid until date must be a valid date',
        'date.greater': 'Valid until date must be after valid from date'
      }),
    image: Joi.string().uri().optional(),
    bannerImage: Joi.string().uri().optional(),
    offerCode: Joi.string()
      .max(20)
      .uppercase()
      .optional()
      .messages({
        'string.max': 'Offer code cannot exceed 20 characters'
      }),
    usageLimit: Joi.number()
      .positive()
      .optional()
      .messages({
        'number.positive': 'Usage limit must be positive'
      }),
    userUsageLimit: Joi.number()
      .positive()
      .optional()
      .messages({
        'number.positive': 'User usage limit must be positive'
      }),
    applicableServices: Joi.array()
      .items(Joi.string().pattern(/^[0-9a-fA-F]{24}$/))
      .optional()
      .messages({
        'string.pattern.base': 'Service ID must be a valid MongoDB ObjectId'
      }),
    applicableCategories: Joi.array()
      .items(Joi.string().valid('car wash', 'bike wash', 'detailing', 'maintenance', 'customization', 'other'))
      .optional()
      .messages({
        'any.only': 'Category must be one of: car wash, bike wash, detailing, maintenance, customization, other'
      }),
    vehicleType: Joi.string()
      .valid('2 Wheeler', '4 Wheeler', 'Both')
      .optional()
      .messages({
        'any.only': 'Vehicle type must be one of: 2 Wheeler, 4 Wheeler, Both'
      }),
    isActive: Joi.boolean().optional(),
    isFeatured: Joi.boolean().optional(),
    priority: Joi.number()
      .min(0)
      .optional()
      .messages({
        'number.min': 'Priority cannot be negative'
      }),
    terms: Joi.string().max(1000).optional()
  })
};

// Notification validation schemas
export const notificationSchemas = {
  createNotification: Joi.object({
    userId: Joi.string()
      .pattern(/^[0-9a-fA-F]{24}$/)
      .required()
      .messages({
        'string.pattern.base': 'User ID must be a valid MongoDB ObjectId',
        'any.required': 'User ID is required'
      }),
    title: Joi.string().min(3).max(100).required(),
    message: Joi.string().min(5).max(500).required(),
    type: Joi.string()
      .valid('booking', 'payment', 'system', 'promotion')
      .required(),
    data: Joi.object().optional()
  }),

  registerDeviceToken: Joi.object({
    token: Joi.string().required(),
    deviceType: Joi.string().valid('ios', 'android', 'web').required(),
    deviceName: Joi.string().optional()
  })
};

// Membership validation schemas
export const membershipSchemas = {
  purchaseMembership: Joi.object({
    planId: Joi.string()
      .valid('silver', 'gold', 'platinum')
      .required()
      .messages({
        'any.only': 'Plan ID must be one of: silver, gold, platinum',
        'any.required': 'Plan ID is required'
      }),
    amount: Joi.number()
      .positive()
      .required()
      .messages({
        'number.positive': 'Amount must be a positive number',
        'any.required': 'Amount is required'
      }),
    autoRenew: Joi.boolean().optional()
  }),

  createPlan: Joi.object({
    name: Joi.string().min(3).max(50).required(),
    description: Joi.string().min(10).max(500).required(),
    price: Joi.number().positive().required(),
    duration: Joi.number().integer().positive().required(),
    durationType: Joi.string().valid('days', 'months', 'years').required(),
    features: Joi.array().items(Joi.string()).min(1).required(),
    isActive: Joi.boolean().optional()
  })
};

