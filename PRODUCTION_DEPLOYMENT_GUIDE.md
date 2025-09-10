# DashStream Backend - Production Deployment Guide

## 🚀 Quick Fix for Your Current Issues

Your mobile app was getting "session expired" errors because of authentication token issues. Here's what was fixed:

### ✅ Issues Fixed:

1. **Consolidated Authentication Logic** - Removed duplicate auth functions
2. **Improved Token Handling** - Added refresh token mechanism
3. **Production-Ready Configuration** - Added proper security headers and optimizations
4. **Better Error Messages** - Clear error responses for debugging
5. **Mobile App Integration** - Optimized for React Native/Expo apps

## 🔧 Immediate Steps to Fix Your Current Issues:

### 1. Update Your Environment Variables

Copy `.env.production` to `.env` and update with your actual values:

```bash
# Update these critical settings:
JWT_SECRET=your-super-secure-jwt-secret-key-min-32-characters
SESSION_SECRET=your-super-secure-session-secret-key
NODE_ENV=production
```

### 2. Test the Fixed Authentication

```bash
# Install dependencies
npm install

# Test in development
npm run dev

# Test the auth endpoints
curl -X POST http://localhost:5000/api/auth/send-otp \
  -H "Content-Type: application/json" \
  -d '{"phone": "+1234567890"}'
```

### 3. Mobile App Integration

Update your mobile app to handle the new response format:

```javascript
// When calling /api/auth/verify-otp, you'll now get:
{
  "status": "success",
  "message": "OTP verified successfully. Welcome to DashStream!",
  "data": {
    "user": { /* user data */ },
    "token": "jwt-token-here",
    "refreshToken": "refresh-token-here",
    "expiresIn": "90d"
  },
  "meta": {
    "tokenType": "Bearer",
    "tokenExpiry": "2024-12-10T14:52:40.000Z",
    "refreshTokenExpiry": "2024-11-10T14:52:40.000Z"
  }
}
```

## 🏗️ Production Deployment Options

### Option 1: Simple Production Start

```bash
# Production start (recommended for immediate fix)
npm start
```

### Option 2: Docker Deployment

```bash
# Build and run with Docker
docker-compose up -d

# Check health
curl http://localhost:5000/health
```

### Option 3: PM2 Cluster Mode

```bash
# Install PM2 globally
npm install -g pm2

# Start with clustering
npm run pm2:start

# Monitor
npm run pm2:logs
```

## 🔍 Debugging Your Current Issues

### Check Authentication Flow:

1. **Send OTP**: `POST /api/auth/send-otp`
2. **Verify OTP**: `POST /api/auth/verify-otp` (returns JWT token)
3. **Use Token**: Include `Authorization: Bearer <token>` in subsequent requests
4. **Refresh Token**: `POST /api/auth/refresh-token` when token expires

### Mobile App Token Storage:

```javascript
// Store token after successful OTP verification
import * as SecureStore from 'expo-secure-store';

// Save tokens
await SecureStore.setItemAsync('authToken', response.data.token);
await SecureStore.setItemAsync('refreshToken', response.data.refreshToken);

// Use in API calls
const token = await SecureStore.getItemAsync('authToken');
fetch('/api/users/me', {
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  }
});
```

## 🛠️ Configuration Details

### New Middleware Features:

- **Token Refresh**: Automatic token renewal
- **Better Error Handling**: Clear error messages
- **Rate Limiting**: Prevents abuse
- **Security Headers**: Production-ready security
- **Health Checks**: Monitor application status

### API Endpoints Added:

- `POST /api/auth/refresh-token` - Refresh expired tokens
- `GET /api/auth/verify-token` - Check token validity
- `GET /api/auth/health` - Auth service health check
- `GET /health` - Overall system health

## 📱 Mobile App Integration Guide

### 1. Update API Service:

```javascript
// api/authService.js
export const AuthAPI = {
  sendOTP: async (phone) => {
    const response = await fetch('/api/auth/send-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone })
    });
    return response.json();
  },

  verifyOTP: async (phone, otp) => {
    const response = await fetch('/api/auth/verify-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone, otp })
    });
    return response.json();
  },

  refreshToken: async (refreshToken) => {
    const response = await fetch('/api/auth/refresh-token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken })
    });
    return response.json();
  }
};
```

### 2. Implement Token Management:

```javascript
// utils/tokenManager.js
import * as SecureStore from 'expo-secure-store';

export const TokenManager = {
  async saveTokens(tokens) {
    await SecureStore.setItemAsync('authToken', tokens.token);
    await SecureStore.setItemAsync('refreshToken', tokens.refreshToken);
    await SecureStore.setItemAsync('tokenExpiry', tokens.meta.tokenExpiry);
  },

  async getToken() {
    return await SecureStore.getItemAsync('authToken');
  },

  async isTokenExpired() {
    const expiry = await SecureStore.getItemAsync('tokenExpiry');
    return new Date() > new Date(expiry);
  },

  async refreshTokenIfNeeded() {
    if (await this.isTokenExpired()) {
      const refreshToken = await SecureStore.getItemAsync('refreshToken');
      const response = await AuthAPI.refreshToken(refreshToken);
      
      if (response.status === 'success') {
        await this.saveTokens(response.data);
        return response.data.token;
      }
    }
    return await this.getToken();
  },

  async clearTokens() {
    await SecureStore.deleteItemAsync('authToken');
    await SecureStore.deleteItemAsync('refreshToken');
    await SecureStore.deleteItemAsync('tokenExpiry');
  }
};
```

## 🔐 Security Best Practices Implemented

1. **JWT Security**: Proper token signing and validation
2. **Rate Limiting**: Prevents brute force attacks
3. **CORS Configuration**: Secure cross-origin requests
4. **Input Validation**: Sanitizes user input
5. **Error Handling**: Doesn't leak sensitive information
6. **Security Headers**: Helmet.js configuration
7. **Session Security**: Secure session configuration

## 🚀 Performance Optimizations

1. **Compression**: Gzip compression enabled
2. **Connection Pooling**: Optimized database connections
3. **Caching**: Redis integration ready
4. **Clustering**: PM2 cluster mode support
5. **Memory Management**: Proper memory limits
6. **Graceful Shutdown**: Clean application termination

## 📊 Monitoring and Health Checks

### Health Check Endpoints:

- `GET /health` - Basic health status
- `GET /api/health` - Detailed health with database status
- `GET /api/auth/health` - Authentication service health

### Monitoring Features:

- Request logging with Morgan
- Error tracking
- Performance metrics
- Database connection monitoring
- Memory usage tracking

## 🐳 Docker Deployment

```bash
# Build the image
docker build -t dashstream-api .

# Run with docker-compose
docker-compose up -d

# View logs
docker-compose logs -f dashstream-api

# Scale the application
docker-compose up -d --scale dashstream-api=3
```

## 🔄 Auto-Deployment with PM2

```bash
# Production deployment with auto-restart
pm2 start ecosystem.config.js --env production

# Monitor in real-time
pm2 monit

# View logs
pm2 logs dashstream-api

# Restart all instances
pm2 restart all
```

## 🧪 Testing the Fixed Authentication

### Test Script:

```bash
#!/bin/bash
# test-auth.sh

echo "Testing DashStream Authentication..."

# Test health check
echo "1. Health Check:"
curl -s http://localhost:5000/health | jq

# Test OTP sending
echo "2. Send OTP:"
curl -s -X POST http://localhost:5000/api/auth/send-otp \
  -H "Content-Type: application/json" \
  -d '{"phone": "+1234567890"}' | jq

# You would then manually verify OTP and test token usage
```

## 🚨 Troubleshooting Common Issues

### Issue 1: "Session Expired" Alerts

**Cause**: Mobile app not storing/sending tokens properly

**Fix**: 
- Implement proper token storage with SecureStore
- Add token refresh logic
- Check Authorization header format

### Issue 2: CORS Errors

**Cause**: Frontend origin not allowed

**Fix**: Update CORS configuration in production config

### Issue 3: Database Connection Issues

**Cause**: MongoDB connection string or network issues

**Fix**: 
- Verify MONGODB_URI environment variable
- Check network connectivity
- Review database logs

### Issue 4: Rate Limiting

**Cause**: Too many requests from same IP

**Fix**: 
- Implement exponential backoff in mobile app
- Consider IP whitelisting for development

## 📞 Support and Maintenance

### Log Locations:
- Application logs: `./logs/`
- PM2 logs: `~/.pm2/logs/`
- Docker logs: `docker-compose logs`

### Performance Monitoring:
- Memory usage: `GET /api/health`
- Response times: Check application logs
- Error rates: Monitor error logs

### Backup Strategy:
- Database: Regular MongoDB backups
- Code: Git repository with proper branching
- Environment: Backup .env files securely

---

## 🎯 Next Steps for Full Production

1. **SSL/TLS Setup**: Configure HTTPS with proper certificates
2. **Load Balancer**: Set up Nginx or cloud load balancer
3. **CDN Integration**: For static assets
4. **Database Scaling**: MongoDB cluster or cloud database
5. **Monitoring Stack**: Prometheus + Grafana or cloud monitoring
6. **CI/CD Pipeline**: Automated testing and deployment
7. **Backup Strategy**: Automated database and file backups

---

**Need Help?** Check the logs in `./logs/` directory or health check endpoints for current system status.