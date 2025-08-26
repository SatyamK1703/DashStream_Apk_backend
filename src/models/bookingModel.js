import mongoose from "mongoose";

const bookingSchema = new mongoose.Schema(
  {
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Booking must belong to a customer"]
    },
    professional: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User"
    },
    service: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Service",
      required: [true, "Booking must include a service"]
    },
    vehicle: {
      type: {
        type: String,
        enum: ["2 Wheeler", "4 Wheeler"]
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
      required: [true, "Booking must have a scheduled date"]
    },
    scheduledTime: {
      type: String,
      required: [true, "Booking must have a scheduled time"]
    },
    location: {
      address: {
        type: String,
        required: [true, "Booking must have a location address"]
      },
      coordinates: {
        type: [Number] // [longitude, latitude]
      }
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
        "rejected"
      ],
      default: "pending"
    },
    price: {
      type: Number,
      required: [true, "Booking must have a price"]
    },
    paymentStatus: {
      type: String,
      enum: ["pending", "paid", "failed", "refunded"],
      default: "pending"
    },
    paymentMethod: {
      type: String,
      enum: ["cash", "card", "upi", "wallet"],
      default: "cash"
    },
    paymentId: String,
    notes: String,
    rating: {
      score: {
        type: Number,
        min: 1,
        max: 5
      },
      review: String,
      createdAt: Date
    },
    additionalServices: [
      {
        service: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Service"
        },
        price: Number
      }
    ],
    totalAmount: {
      type: Number,
      required: [true, "Booking must have a total amount"]
    },
    estimatedDuration: {
      type: Number, // in minutes
      required: [true, "Booking must have an estimated duration"]
    },
    actualStartTime: Date,
    actualEndTime: Date,
    cancellationReason: String,
    cancellationTime: Date,
    isRescheduled: {
      type: Boolean,
      default: false
    },
    previousSchedule: {
      date: Date,
      time: String
    },
    trackingUpdates: [
      {
        status: String,
        timestamp: {
          type: Date,
          default: Date.now
        },
        description: String,
        updatedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User"
        }
      }
    ]
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Indexes
bookingSchema.index({ customer: 1, createdAt: -1 });
bookingSchema.index({ professional: 1, status: 1 });
bookingSchema.index({ scheduledDate: 1, status: 1 });
bookingSchema.index({ "location.coordinates": "2dsphere" });

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
    select: "name phone email"
  })
    .populate({
      path: "professional",
      select: "name phone email rating"
    })
    .populate({
      path: "service",
      select: "name description price duration"
    });
  next();
});

// Middleware to track status changes
bookingSchema.pre("save", function (next) {
  if (this.isModified("status")) {
    this.trackingUpdates.push({
      status: this.status,
      timestamp: Date.now(),
      description: `Booking status updated to ${this.status}`
    });
  }
  next();
});

const Booking = mongoose.model("Booking", bookingSchema);
export default Booking;
