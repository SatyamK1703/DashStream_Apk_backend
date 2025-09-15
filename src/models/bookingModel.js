import mongoose from "mongoose";

const bookingSchema = new mongoose.Schema(
  {
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Booking must belong to a customer"],
    },
    professional: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    service: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Service",
        required: [true, "Booking must include a service"],
      },
    ],
    vehicle: {
      type: {
        type: String,
        enum: ["2 Wheeler", "4 Wheeler"],
        required: [true, "Vehicle type is required"],
      },
      brand: {
        type: String,
      },
      model: {
        type: String,
      },
    },
    scheduledDate: {
      type: Date,
      required: [true, "Booking must have a scheduled date"],
    },
    scheduledTime: {
      type: String,
      required: [true, "Booking must have a scheduled time"],
    },
    location: {
      address: {
        name: { type: String, required: true },
        address: { type: String, required: true },
        city: { type: String, required: true },
        landmark: String,
        pincode: { type: String, required: true },
      },
      coordinates: {
        type: [Number], // [longitude, latitude]
      },
    },

    status: {
      type: String,
      enum: [
        "pending",
        "confirmed",
        "assigned",
        "in-progress",
        "completed",
        "cancelled",
        "rejected",
      ],
      default: "pending",
    },
    trackingUpdates: [
      {
        status: {
          type: String,
          enum: [
            "pending",
            "confirmed",
            "assigned",
            "in-progress",
            "completed",
            "cancelled",
            "rejected",
          ],
        },
        message: String,
        timestamp: {
          type: Date,
          default: Date.now,
        },
        updatedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
      },
    ],
    price: {
      type: Number,
      required: [true, "Booking must have a price"],
    },
    paymentStatus: {
      type: String,
      enum: ["pending", "paid", "failed", "refunded"],
      default: "pending",
    },
    paymentMethod: {
      type: String,
      enum: ["cash", "card", "upi"],
      default: "cash",
    },
    paymentId: String,
    notes: String,
    rating: {
      score: {
        type: Number,
        min: 1,
        max: 5,
      },
      review: String,
      createdAt: Date,
    },
    additionalServices: [
      {
        service: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Service",
        },
        price: Number,
      },
    ],
    totalAmount: {
      type: Number,
      required: [true, "Booking must have a total amount"],
    },
    estimatedDuration: {
      type: Number, // in minutes
      required: [true, "Booking must have an estimated duration"],
    },
    actualStartTime: Date,
    actualEndTime: Date,
    cancellationReason: String,
    cancellationTime: Date,
    isRescheduled: {
      type: Boolean,
      default: false,
    },
    previousSchedule: {
      date: Date,
      time: String,
    },
    trackingUpdates: [
      {
        status: String,
        timestamp: {
          type: Date,
          default: Date.now,
        },
        description: String,
        updatedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
      },
    ],
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// PERFORMANCE OPTIMIZATION: Enhanced Indexes for Booking Operations
// Primary lookup indexes
bookingSchema.index({ customer: 1, createdAt: -1 }); // Customer booking history
bookingSchema.index({ professional: 1, status: 1 }); // Professional active bookings
bookingSchema.index({ scheduledDate: 1, status: 1 }); // Date-based booking queries
bookingSchema.index({ "location.coordinates": "2dsphere" }); // Geospatial queries

// Additional critical indexes
bookingSchema.index({ status: 1, scheduledDate: 1 }); // Status-based scheduling
bookingSchema.index({ customer: 1, status: 1 }); // Customer booking status
bookingSchema.index({ professional: 1, scheduledDate: 1 }); // Professional schedule
bookingSchema.index({ paymentStatus: 1 }); // Payment tracking
bookingSchema.index({ service: 1 }); // Service-based analytics

// Time-based indexes for scheduling and analytics
bookingSchema.index({ createdAt: -1 }); // Recent bookings
bookingSchema.index({ actualStartTime: 1, actualEndTime: 1 }); // Duration analytics
bookingSchema.index({ scheduledDate: 1, scheduledTime: 1 }); // Scheduling conflicts

// Compound indexes for complex queries
bookingSchema.index({ status: 1, customer: 1, createdAt: -1 }); // Customer active bookings
bookingSchema.index({ status: 1, professional: 1, scheduledDate: 1 }); // Professional schedule management
bookingSchema.index({ customer: 1, paymentStatus: 1 }); // Customer payment tracking
bookingSchema.index({ "location.address.pincode": 1, status: 1 }); // Area-based booking management

// Performance indexes for common dashboard queries
bookingSchema.index({ createdAt: -1, status: 1 }); // Recent bookings by status
bookingSchema.index({ totalAmount: -1 }); // Revenue analytics
bookingSchema.index({ rating: { score: -1 } }); // Rating-based queries (sparse)

// Text search for booking notes and addresses
bookingSchema.index({
  "location.address.address": "text",
  "location.address.landmark": "text",
  notes: "text",
});

// Virtual property for booking duration
bookingSchema.virtual("duration").get(function () {
  if (this.actualStartTime && this.actualEndTime) {
    return Math.round(
      (this.actualEndTime - this.actualStartTime) / (1000 * 60)
    );
  }
  return this.estimatedDuration;
});

// Middleware to populate details
bookingSchema.pre(/^find/, function (next) {
  this.populate({
    path: "customer",
    select: "name phone email",
  })
    .populate({
      path: "professional",
      select: "name phone email rating",
    })
    .populate({
      path: "service",
      select: "name description price duration",
    });
  next();
});

// Middleware to track status changes
bookingSchema.pre("save", function (next) {
  if (this.isModified("status")) {
    this.trackingUpdates.push({
      status: this.status,
      timestamp: Date.now(),
      description: `Booking status updated to ${this.status}`,
    });
  }
  next();
});

const Booking = mongoose.model("Booking", bookingSchema);
export default Booking;
