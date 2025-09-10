# Mobile App Integration Guide - Fixed Authentication

This guide shows you how to integrate your React Native/Expo app with the fixed DashStream backend to eliminate the "session expired" errors.

## 🎯 Quick Fix for Session Expired Issues

The backend now provides proper JWT tokens with refresh functionality. Here's how to implement it in your mobile app:

## 1. Install Required Dependencies

```bash
npm install @react-native-async-storage/async-storage
# OR if using Expo:
expo install expo-secure-store
```

## 2. Create Token Manager Service

```javascript
// services/TokenManager.js
import * as SecureStore from 'expo-secure-store'; // For Expo
// import AsyncStorage from '@react-native-async-storage/async-storage'; // For React Native

const TOKEN_KEY = 'auth_token';
const REFRESH_TOKEN_KEY = 'refresh_token';
const TOKEN_EXPIRY_KEY = 'token_expiry';

export class TokenManager {
  // Save tokens after successful authentication
  static async saveTokens(tokenData) {
    try {
      await SecureStore.setItemAsync(TOKEN_KEY, tokenData.token);
      await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, tokenData.refreshToken);
      await SecureStore.setItemAsync(TOKEN_EXPIRY_KEY, tokenData.meta.tokenExpiry);
      console.log('✅ Tokens saved successfully');
    } catch (error) {
      console.error('❌ Error saving tokens:', error);
    }
  }

  // Get current access token
  static async getToken() {
    try {
      return await SecureStore.getItemAsync(TOKEN_KEY);
    } catch (error) {
      console.error('❌ Error getting token:', error);
      return null;
    }
  }

  // Check if token is expired
  static async isTokenExpired() {
    try {
      const expiry = await SecureStore.getItemAsync(TOKEN_EXPIRY_KEY);
      if (!expiry) return true;
      
      const expiryDate = new Date(expiry);
      const now = new Date();
      const timeUntilExpiry = expiryDate.getTime() - now.getTime();
      
      // Consider token expired if less than 5 minutes remaining
      return timeUntilExpiry < 5 * 60 * 1000;
    } catch (error) {
      console.error('❌ Error checking token expiry:', error);
      return true;
    }
  }

  // Get refresh token
  static async getRefreshToken() {
    try {
      return await SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
    } catch (error) {
      console.error('❌ Error getting refresh token:', error);
      return null;
    }
  }

  // Clear all tokens (logout)
  static async clearTokens() {
    try {
      await SecureStore.deleteItemAsync(TOKEN_KEY);
      await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
      await SecureStore.deleteItemAsync(TOKEN_EXPIRY_KEY);
      console.log('✅ Tokens cleared successfully');
    } catch (error) {
      console.error('❌ Error clearing tokens:', error);
    }
  }

  // Get valid token (refreshes if needed)
  static async getValidToken() {
    try {
      const isExpired = await this.isTokenExpired();
      
      if (isExpired) {
        console.log('🔄 Token expired, refreshing...');
        const refreshed = await this.refreshToken();
        if (!refreshed) {
          console.log('❌ Token refresh failed');
          return null;
        }
      }
      
      return await this.getToken();
    } catch (error) {
      console.error('❌ Error getting valid token:', error);
      return null;
    }
  }

  // Refresh token
  static async refreshToken() {
    try {
      const refreshToken = await this.getRefreshToken();
      if (!refreshToken) {
        console.log('❌ No refresh token available');
        return false;
      }

      const response = await fetch(`${API_BASE_URL}/api/auth/refresh-token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ refreshToken }),
      });

      const data = await response.json();

      if (data.status === 'success') {
        await this.saveTokens(data.data);
        console.log('✅ Token refreshed successfully');
        return true;
      } else {
        console.log('❌ Token refresh failed:', data.message);
        await this.clearTokens(); // Clear invalid tokens
        return false;
      }
    } catch (error) {
      console.error('❌ Error refreshing token:', error);
      return false;
    }
  }
}
```

## 3. Create API Service with Auto-Retry

```javascript
// services/ApiService.js
import { TokenManager } from './TokenManager';

const API_BASE_URL = 'http://your-backend-url.com'; // Update this!
// For local development: 'http://localhost:5000'
// For production: 'https://your-production-url.com'

export class ApiService {
  static async request(endpoint, options = {}) {
    const url = `${API_BASE_URL}${endpoint}`;
    let attempt = 0;
    const maxRetries = 2;

    while (attempt <= maxRetries) {
      try {
        // Get valid token (auto-refreshes if needed)
        const token = await TokenManager.getValidToken();
        
        const headers = {
          'Content-Type': 'application/json',
          ...options.headers,
        };

        // Add authorization header if token exists
        if (token) {
          headers['Authorization'] = `Bearer ${token}`;
        }

        const requestOptions = {
          ...options,
          headers,
        };

        console.log(`🌐 API Request (attempt ${attempt + 1}): ${options.method || 'GET'} ${endpoint}`);

        const response = await fetch(url, requestOptions);
        const data = await response.json();

        // Log response for debugging
        console.log(`📊 API Response: ${response.status}`, data.status || 'unknown');

        if (response.ok) {
          return { success: true, data, status: response.status };
        }

        // Handle 401 errors (authentication issues)
        if (response.status === 401 && attempt < maxRetries) {
          console.log('🔄 Got 401, attempting token refresh...');
          const refreshed = await TokenManager.refreshToken();
          if (refreshed) {
            attempt++;
            continue; // Retry with new token
          } else {
            // Refresh failed, redirect to login
            await TokenManager.clearTokens();
            return { success: false, data, status: response.status, requiresLogin: true };
          }
        }

        return { success: false, data, status: response.status };

      } catch (error) {
        console.error(`❌ API Error (attempt ${attempt + 1}):`, error);
        
        if (attempt === maxRetries) {
          return { 
            success: false, 
            error: error.message, 
            status: 500,
            isNetworkError: true 
          };
        }
        
        attempt++;
        // Wait before retry
        await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
      }
    }
  }

  // Authentication methods
  static async sendOTP(phone) {
    return await this.request('/api/auth/send-otp', {
      method: 'POST',
      body: JSON.stringify({ phone }),
    });
  }

  static async verifyOTP(phone, otp) {
    const result = await this.request('/api/auth/verify-otp', {
      method: 'POST',
      body: JSON.stringify({ phone, otp }),
    });

    // Save tokens if verification successful
    if (result.success && result.data.data) {
      await TokenManager.saveTokens(result.data.data);
    }

    return result;
  }

  static async getCurrentUser() {
    return await this.request('/api/users/me');
  }

  static async logout() {
    const result = await this.request('/api/auth/logout', { method: 'POST' });
    await TokenManager.clearTokens();
    return result;
  }

  // Other API methods
  static async getServices(params = {}) {
    const queryString = new URLSearchParams(params).toString();
    const endpoint = `/api/services${queryString ? `?${queryString}` : ''}`;
    return await this.request(endpoint);
  }

  static async getOffers() {
    return await this.request('/api/offers');
  }

  static async createBooking(bookingData) {
    return await this.request('/api/bookings', {
      method: 'POST',
      body: JSON.stringify(bookingData),
    });
  }
}
```

## 4. Update Your Authentication Context

```javascript
// context/AuthContext.js
import React, { createContext, useContext, useState, useEffect } from 'react';
import { ApiService } from '../services/ApiService';
import { TokenManager } from '../services/TokenManager';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      setLoading(true);
      const token = await TokenManager.getValidToken();
      
      if (token) {
        const result = await ApiService.getCurrentUser();
        
        if (result.success) {
          setUser(result.data.data.user);
          setIsAuthenticated(true);
          console.log('✅ User authenticated:', result.data.data.user.name || result.data.data.user.phone);
        } else if (result.requiresLogin) {
          // Token is invalid, clear everything
          await TokenManager.clearTokens();
          setUser(null);
          setIsAuthenticated(false);
        }
      } else {
        setUser(null);
        setIsAuthenticated(false);
      }
    } catch (error) {
      console.error('❌ Auth check failed:', error);
      setUser(null);
      setIsAuthenticated(false);
    } finally {
      setLoading(false);
    }
  };

  const sendOTP = async (phone) => {
    try {
      const result = await ApiService.sendOTP(phone);
      return result;
    } catch (error) {
      console.error('❌ Send OTP failed:', error);
      return { success: false, error: error.message };
    }
  };

  const verifyOTP = async (phone, otp) => {
    try {
      const result = await ApiService.verifyOTP(phone, otp);
      
      if (result.success) {
        setUser(result.data.data.user);
        setIsAuthenticated(true);
        console.log('✅ Login successful:', result.data.data.user.name || result.data.data.user.phone);
      }
      
      return result;
    } catch (error) {
      console.error('❌ Verify OTP failed:', error);
      return { success: false, error: error.message };
    }
  };

  const logout = async () => {
    try {
      await ApiService.logout();
      setUser(null);
      setIsAuthenticated(false);
      console.log('✅ Logout successful');
    } catch (error) {
      console.error('❌ Logout failed:', error);
      // Clear local data anyway
      await TokenManager.clearTokens();
      setUser(null);
      setIsAuthenticated(false);
    }
  };

  const value = {
    user,
    isAuthenticated,
    loading,
    sendOTP,
    verifyOTP,
    logout,
    refreshAuth: checkAuthStatus,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
```

## 5. Update Your Login Screen

```javascript
// screens/LoginScreen.js
import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, StyleSheet } from 'react-native';
import { useAuth } from '../context/AuthContext';

export const LoginScreen = () => {
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState('phone'); // 'phone' or 'otp'
  const [loading, setLoading] = useState(false);
  const { sendOTP, verifyOTP } = useAuth();

  const handleSendOTP = async () => {
    if (!phone.trim()) {
      Alert.alert('Error', 'Please enter your phone number');
      return;
    }

    setLoading(true);
    try {
      const result = await sendOTP(phone);
      
      if (result.success) {
        setStep('otp');
        Alert.alert('Success', 'OTP sent successfully!');
      } else {
        Alert.alert('Error', result.data?.message || 'Failed to send OTP');
      }
    } catch (error) {
      Alert.alert('Error', 'Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async () => {
    if (!otp.trim()) {
      Alert.alert('Error', 'Please enter the OTP');
      return;
    }

    setLoading(true);
    try {
      const result = await verifyOTP(phone, otp);
      
      if (result.success) {
        // Navigation will happen automatically via AuthContext
        console.log('✅ Login successful!');
      } else {
        Alert.alert('Error', result.data?.message || 'Invalid OTP');
      }
    } catch (error) {
      Alert.alert('Error', 'Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (step === 'phone') {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Enter Your Phone Number</Text>
        <TextInput
          style={styles.input}
          placeholder="+1234567890"
          value={phone}
          onChangeText={setPhone}
          keyboardType="phone-pad"
          autoFocus
        />
        <TouchableOpacity 
          style={styles.button} 
          onPress={handleSendOTP}
          disabled={loading}
        >
          <Text style={styles.buttonText}>
            {loading ? 'Sending...' : 'Send OTP'}
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Enter OTP</Text>
      <Text style={styles.subtitle}>Sent to {phone}</Text>
      <TextInput
        style={styles.input}
        placeholder="Enter 6-digit OTP"
        value={otp}
        onChangeText={setOtp}
        keyboardType="numeric"
        maxLength={6}
        autoFocus
      />
      <TouchableOpacity 
        style={styles.button} 
        onPress={handleVerifyOTP}
        disabled={loading}
      >
        <Text style={styles.buttonText}>
          {loading ? 'Verifying...' : 'Verify OTP'}
        </Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={() => setStep('phone')}>
        <Text style={styles.linkText}>Change Phone Number</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 30,
    color: '#666',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    padding: 15,
    borderRadius: 8,
    fontSize: 16,
    marginBottom: 20,
  },
  button: {
    backgroundColor: '#007AFF',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 15,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  linkText: {
    color: '#007AFF',
    textAlign: 'center',
    fontSize: 16,
  },
});
```

## 6. App.js Integration

```javascript
// App.js
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { AuthProvider, useAuth } from './context/AuthContext';
import { LoginScreen } from './screens/LoginScreen';
import { HomeScreen } from './screens/HomeScreen';
import { LoadingScreen } from './screens/LoadingScreen';

const Stack = createStackNavigator();

const AppNavigator = () => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return <LoadingScreen />;
  }

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {isAuthenticated ? (
        <Stack.Screen name="Home" component={HomeScreen} />
      ) : (
        <Stack.Screen name="Login" component={LoginScreen} />
      )}
    </Stack.Navigator>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <NavigationContainer>
        <AppNavigator />
      </NavigationContainer>
    </AuthProvider>
  );
}
```

## 🚀 Testing the Integration

1. **Start your backend:**
   ```bash
   npm run quick-start
   ```

2. **Update API_BASE_URL in ApiService.js:**
   ```javascript
   const API_BASE_URL = 'http://localhost:5000'; // For development
   // const API_BASE_URL = 'https://your-production-url.com'; // For production
   ```

3. **Test the flow:**
   - Enter phone number → Should receive OTP
   - Enter OTP → Should login successfully  
   - App should remember login status
   - API calls should work without "session expired" errors

## 🐛 Troubleshooting

### Still getting session expired?

1. **Clear app storage:**
   ```javascript
   // Add this to your dev menu
   const clearStorage = async () => {
     await TokenManager.clearTokens();
     // Restart app
   };
   ```

2. **Check network requests:**
   - Enable network debugging in React Native
   - Verify Authorization headers are being sent

3. **Backend logs:**
   - Check server logs for authentication errors
   - Visit `http://localhost:5000/health` to verify server status

### Common Issues:

- **CORS errors**: Update backend CORS configuration
- **Network timeout**: Increase request timeout
- **Token format**: Ensure "Bearer " prefix is included

## 📱 Next Steps

- Implement biometric authentication
- Add offline support
- Implement push notifications
- Add error reporting (Sentry, Bugsnag)

---

**Need Help?** Check the backend logs at `./logs/` or health status at `/health` endpoint.