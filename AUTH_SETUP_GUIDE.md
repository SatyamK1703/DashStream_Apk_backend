# DashStream Authentication Setup Guide

## Overview
This guide helps you set up and troubleshoot the authentication system between your React Native frontend and Node.js backend.

## Backend Setup

### 1. Start the Backend Server
```bash
cd "C:\Users\hp\OneDrive\Desktop\New folder\DashStream_Apk_backend"
npm run dev
```

The server should start on `http://localhost:5000`

### 2. Verify Backend is Running
- Backend should display: "Server running in development mode on 0.0.0.0:5000"
- MongoDB should connect successfully
- No errors in the console

### 3. Test Backend Endpoints

#### Test Public Endpoint (Services)
```bash
curl http://localhost:5000/api/services
```

#### Test Authentication Flow
```bash
# Send OTP
curl -X POST http://localhost:5000/api/auth/send-otp \
  -H "Content-Type: application/json" \
  -d '{"phone": "+911234567890"}'

# Check protected endpoint (should return 401)
curl http://localhost:5000/api/users/me
```

## Frontend Setup

### 1. Update API Configuration
Ensure your frontend is pointing to the local backend:
- File: `src/config/environment.ts`
- Development API URL: `http://localhost:5000/api`

### 2. Network Configuration
For React Native to connect to localhost:

#### Android Emulator:
Use `http://10.0.2.2:5000/api`

#### iOS Simulator:
Use `http://localhost:5000/api`

#### Physical Device:
Use your computer's IP address: `http://192.168.1.X:5000/api`

## Common Issues and Solutions

### Issue 1: 401 Authentication Errors
**Symptoms:** 
- "You are not logged in" errors
- API calls failing with 401 status

**Solutions:**
1. **Check Token Storage:** Ensure the frontend is storing the JWT token correctly
2. **Verify Token Format:** Token should be sent as `Authorization: Bearer <token>`
3. **Check Token Expiry:** Tokens expire after 90 days by default

### Issue 2: CORS Errors
**Symptoms:**
- Network errors in React Native
- Blocked by CORS policy

**Solutions:**
1. **Backend CORS:** Already configured for localhost and React Native
2. **Network Access:** Ensure you're using the correct IP address

### Issue 3: Connection Refused
**Symptoms:**
- "Connection refused" or "Network error"
- Cannot reach backend

**Solutions:**
1. **Backend Running:** Ensure backend is running on port 5000
2. **Firewall:** Check Windows Firewall settings
3. **Network:** Use correct IP address for your setup

### Issue 4: Missing Endpoints
**Symptoms:**
- 404 errors for specific endpoints
- "Cannot GET /api/users/me"

**Solutions:**
1. **Added Missing Endpoints:** `/users/me` endpoint has been added
2. **Route Protection:** Offers endpoint now accessible to authenticated users
3. **Authentication Required:** Most endpoints require valid JWT token

## Authentication Flow

### 1. Send OTP
```javascript
POST /api/auth/send-otp
{
  "phone": "+911234567890"
}
```

### 2. Verify OTP
```javascript
POST /api/auth/verify-otp
{
  "phone": "+911234567890",
  "otp": "123456"
}
```

### 3. Use Token
```javascript
Authorization: Bearer <jwt_token>
```

## API Endpoints

### Public Endpoints (No Authentication Required)
- `GET /api/services` - Get all services
- `GET /api/offers/active` - Get active offers
- `GET /api/offers/featured` - Get featured offers
- `POST /api/auth/send-otp` - Send OTP
- `POST /api/auth/verify-otp` - Verify OTP

### Protected Endpoints (Authentication Required)
- `GET /api/users/me` - Get current user info
- `GET /api/offers` - Get all offers for authenticated user
- `GET /api/notifications` - Get user notifications
- `PATCH /api/users/update-profile` - Update user profile

## Testing the Setup

### 1. Backend Test
```bash
node test-auth.js
```

### 2. Frontend Test
```bash
node test-backend-connection.js
```

## Environment Variables

Ensure these are set in your `.env` file:
```env
NODE_ENV=development
PORT=5000
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret
JWT_EXPIRES_IN=90d
TWILIO_ACCOUNT_SID=your_twilio_sid
TWILIO_AUTH_TOKEN=your_twilio_token
TWILIO_SERVICE_SID=your_twilio_service_sid
```

## Security Notes

1. **JWT Secret:** Keep JWT_SECRET secure and unique
2. **HTTPS:** Use HTTPS in production
3. **Token Storage:** Store tokens securely in React Native
4. **CORS:** Restrict CORS origins in production
5. **Rate Limiting:** API rate limiting is configured

## Troubleshooting Commands

### Check if backend is accessible:
```bash
curl http://localhost:5000/api/services
```

### Check authentication endpoint:
```bash
curl -X POST http://localhost:5000/api/auth/send-otp \
  -H "Content-Type: application/json" \
  -d '{"phone": "+911234567890"}'
```

### Test protected endpoint:
```bash
curl -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  http://localhost:5000/api/users/me
```

## Support

If you continue to experience issues:
1. Check the backend console logs
2. Check the React Native debugger
3. Verify network connectivity
4. Ensure all dependencies are installed
5. Check MongoDB connection
