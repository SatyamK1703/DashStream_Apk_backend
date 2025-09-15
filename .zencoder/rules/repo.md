---
description: Repository Information Overview
alwaysApply: true
---

# DashStream Backend Information

## Summary
DashStream is a backend API for a mobile application that provides on-demand services. It's built with Node.js, Express, and MongoDB, featuring authentication, user management, service booking, notifications, and payment processing.

## Structure
- **src/**: Core application code (controllers, models, routes, middleware)
- **public/**: Static files served in production
- **scripts/**: Utility scripts for seeding data
- **config/**: Configuration files for different environments

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
- bcryptjs: ^2.4.3 - Password hashing
- firebase-admin: ^13.5.0 - Firebase integration
- twilio: ^5.8.0 - SMS services
- razorpay: ^2.9.6 - Payment processing
- express-validator: ^7.2.1 - Input validation
- helmet: ^7.1.0 - Security headers
- compression: ^1.7.4 - Response compression

**Development Dependencies**:
- nodemon: ^3.0.2 - Development server
- jest: ^29.7.0 - Testing framework
- supertest: ^6.3.3 - API testing
- axios: ^1.6.2 - HTTP client for tests

## Build & Installation
```bash
# Install dependencies
npm install

# Development server
npm run dev

# Production server
npm start
```

## Deployment
**Platform**: Vercel
**Configuration**: vercel.json
**Entry Point**: src/server.js
**Environment**: Production

## Testing
**Framework**: Custom integration testing
**Test Files**: test-integration.js, run-tests.js
**Test Command**:
```bash
npm run test:api
```

## API Structure
**Authentication**: Phone-based OTP with JWT
**Main Routes**:
- /api/auth - Authentication endpoints
- /api/users - User management
- /api/bookings - Booking operations
- /api/services - Service catalog
- /api/payments - Payment processing
- /api/notifications - User notifications
- /api/admin - Admin operations

## Database
**Type**: MongoDB
**Connection**: Mongoose ODM
**Models**: User, Booking, Service, Payment, Notification, etc.
**Configuration**: Production optimized with connection pooling