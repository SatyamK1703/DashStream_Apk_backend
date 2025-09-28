---
description: Repository Information Overview
alwaysApply: true
---

# DashStream Backend API Information

## Summary
DashStream Backend API is a Node.js-based RESTful API service for a mobile application that provides on-demand services. It handles authentication, user management, service bookings, notifications, and payments. The backend is built with Express.js and MongoDB.

## Structure
- **src/**: Core application code (controllers, models, routes, services)
- **public/**: Static assets and public files
- **scripts/**: Utility scripts for seeding data
- **config/**: Configuration files for various services

## Language & Runtime
**Language**: JavaScript (ES Modules)
**Version**: Node.js >= 18.0.0
**Build System**: npm
**Package Manager**: npm

## Dependencies
**Main Dependencies**:
- express: ^4.18.2 - Web framework
- mongoose: ^8.0.3 - MongoDB ODM
- jsonwebtoken: ^9.0.2 - Authentication
- passport: ^0.7.0 - Authentication middleware
- firebase-admin: ^13.5.0 - Firebase integration
- twilio: ^5.8.0 - SMS services
- razorpay: ^2.9.6 - Payment processing
- cloudinary: ^1.41.3 - Media storage

**Development Dependencies**:
- nodemon: ^3.0.2 - Development server
- jest: ^29.7.0 - Testing framework
- supertest: ^6.3.3 - API testing
- axios: ^1.6.2 - HTTP client

## Build & Installation
```bash
# Install dependencies
npm install

# Development mode
npm run dev

# Production mode
npm start

# Windows-specific start
npm run start:windows
```

## Testing
**Framework**: Jest with custom integration testing
**Test Location**: Custom test files in root directory
**Run Command**:
```bash
# Run unit tests
npm test

# Run API integration tests
npm run test:api
```

## Main Entry Points
**Server Entry**: src/index.js (development), src/index (production)
**API Routes**:
- /api/auth - Authentication endpoints
- /api/users - User management
- /api/bookings - Booking operations
- /api/services - Service catalog
- /api/payments - Payment processing
- /api/notifications - User notifications

## Database
**Type**: MongoDB
**Models**: User, Booking, Service, Payment, Notification, Offer, Membership
**Connection**: Configured via MONGODB_URI environment variable

## Authentication
**Method**: JWT tokens with Passport.js
**Strategies**: Local (username/password), JWT
**Security**: Rate limiting, helmet security headers