# Production Setup Guide for DashStream Backend

## 🚀 Quick Start

### 1. Environment Setup
```bash
# Copy environment template
cp env.example .env

# Edit environment variables
nano .env
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Start Development Server
```bash
npm run dev
```

### 4. Test All Routes
```bash
npm run test:routes
```

## 📋 Environment Variables

### Required Variables
```env
NODE_ENV=production
PORT=5000
MONGODB_URI=mongodb+srv://your-connection-string
JWT_SECRET=your-super-secure-jwt-secret
SESSION_SECRET=your-super-secure-session-secret
```

### Optional Variables
```env
# CORS
CORS_ORIGIN=https://your-frontend-domain.com

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX=100

# Email (Optional)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password

# Payment
RAZORPAY_KEY_ID=your-razorpay-key-id
RAZORPAY_KEY_SECRET=your-razorpay-key-secret

# Google Maps
GOOGLE_MAPS_API_KEY=your-google-maps-api-key

# Firebase (Optional)
FIREBASE_PROJECT_ID=your-firebase-project-id
FIREBASE_PRIVATE_KEY=your-firebase-private-key
FIREBASE_CLIENT_EMAIL=your-firebase-client-email
```

## 🔧 Available Scripts

### Development
```bash
npm run dev          # Start development server with nodemon
npm run start:dev    # Start development server
```

### Production
```bash
npm start            # Start production server
npm run prod         # Start production server with nodemon
```

### Testing
```bash
npm run test:routes      # Test all API routes
npm run test:integration # Run integration tests
npm test                 # Run unit tests
```

### Setup
```bash
npm run setup        # Run initial setup
npm run quick-start  # Quick start with setup
```

## 🌐 API API_ENDPOINTS

### Public API_ENDPOINTS
- `GET /api/health` - Health check
- `GET /api/services` - Get all services
- `GET /api/services/popular` - Get popular services
- `GET /api/services/categories` - Get service categories
- `GET /api/services/search` - Search services
- `GET /api/offers` - Get all offers
- `GET /api/offers/active` - Get active offers
- `GET /api/locations/search` - Search locations
- `GET /api/locations/nearby` - Get nearby locations

### Protected API_ENDPOINTS (Require Authentication)
- `GET /api/auth/me` - Get current user
- `GET /api/users/profile` - Get user profile
- `PATCH /api/users/profile` - Update user profile
- `GET /api/bookings` - Get user bookings
- `POST /api/bookings` - Create booking
- `GET /api/notifications` - Get notifications
- `GET /api/professionals/profile` - Get professional profile
- `GET /api/vehicles/my-vehicles` - Get user vehicles

### Admin API_ENDPOINTS (Require Admin Role)
- `GET /api/admins/dashboard` - Admin dashboard
- `GET /api/admins/services` - Manage services
- `POST /api/admins/services` - Create service
- `GET /api/admins/bookings` - Manage bookings
- `GET /api/admins/users` - Manage users

## 🔒 Security Features

- JWT Authentication
- Role-based Access Control
- Rate Limiting
- CORS Protection
- Input Validation
- SQL Injection Protection
- XSS Protection

## 📊 Monitoring

### Health Check
```bash
curl http://localhost:5000/api/health
```

### Route Testing
```bash
npm run test:routes
```

## 🚀 Deployment

### Local Development
1. Start MongoDB
2. Copy `env.example` to `.env`
3. Configure environment variables
4. Run `npm run dev`

### Production Deployment
1. Set up production environment variables
2. Configure database connection
3. Set up reverse proxy (nginx)
4. Configure SSL certificates
5. Run `npm start`

## 🐛 Troubleshooting

### Common Issues

1. **MongoDB Connection Error**
   - Check MongoDB is running
   - Verify connection string
   - Check network connectivity

2. **CORS Errors**
   - Update CORS_ORIGIN in .env
   - Check frontend URL configuration

3. **Authentication Errors**
   - Verify JWT_SECRET is set
   - Check token expiration
   - Validate user permissions

4. **Rate Limiting**
   - Adjust RATE_LIMIT_MAX in .env
   - Check request frequency

### Debug Mode
```bash
DEBUG=* npm run dev
```

## 📝 API Documentation

### Request Format
```json
{
  "Content-Type": "application/json",
  "Authorization": "Bearer <token>"
}
```

### Response Format
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Success",
  "data": { ... }
}
```

### Error Format
```json
{
  "success": false,
  "statusCode": 400,
  "message": "Error message",
  "error": { ... }
}
```

## 🔄 Frontend Integration

### Development
- Frontend URL: `http://192.168.1.22:5000/api`
- CORS enabled for localhost

### Production
- Frontend URL: `https://your-backend-domain.com/api`
- CORS configured for production domains

## 📞 Support

For issues and support:
1. Check this documentation
2. Run `npm run test:routes` to verify setup
3. Check logs for error details
4. Verify environment variables
