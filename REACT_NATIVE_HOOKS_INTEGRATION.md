# 🎣 React Native Hooks Integration for DashStream API

**Easy state management hooks for all your backend routes**

## 🚀 Custom Hooks for API Integration

### 1. Authentication Hook

Create `src/hooks/useAuth.js`:

```javascript
import { useState, useEffect, useContext, createContext } from 'react';
import { authService, TokenManager } from '../services';

// Auth Context
const AuthContext = createContext({});

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isGuest, setIsGuest] = useState(true);

  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      setIsLoading(true);
      const authStatus = await authService.checkAuthStatus();
      
      setIsAuthenticated(authStatus.isAuthenticated);
      setUser(authStatus.user);
      setIsGuest(!authStatus.isAuthenticated);
      
    } catch (error) {
      console.error('Auth check failed:', error);
      setIsAuthenticated(false);
      setUser(null);
      setIsGuest(true);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (phone, otp) => {
    try {
      const response = await authService.verifyOtp(phone, otp);
      
      if (response.status === 'success') {
        setUser(response.data.user);
        setIsAuthenticated(true);
        setIsGuest(false);
        return { success: true, data: response.data };
      }
      
      return { success: false, error: response.message };
    } catch (error) {
      console.error('Login failed:', error);
      return { success: false, error: error.message };
    }
  };

  const logout = async () => {
    try {
      await authService.logout();
    } finally {
      setUser(null);
      setIsAuthenticated(false);
      setIsGuest(true);
    }
  };

  const sendOtp = async (phone) => {
    try {
      const response = await authService.sendOtp(phone);
      return { success: true, data: response };
    } catch (error) {
      console.error('Send OTP failed:', error);
      return { success: false, error: error.message };
    }
  };

  const updateUser = (userData) => {
    setUser(userData);
  };

  const value = {
    user,
    isAuthenticated,
    isLoading,
    isGuest,
    login,
    logout,
    sendOtp,
    updateUser,
    checkAuthStatus
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
```

### 2. Services Hook

Create `src/hooks/useServices.js`:

```javascript
import { useState, useEffect } from 'react';
import { servicesService } from '../services';

export const useServices = (initialLoad = true) => {
  const [services, setServices] = useState([]);
  const [popularServices, setPopularServices] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (initialLoad) {
      loadServices();
      loadPopularServices();
      loadCategories();
    }
  }, [initialLoad]);

  const loadServices = async (filters = {}) => {
    try {
      setLoading(true);
      setError(null);
      const response = await servicesService.getAllServices(filters);
      setServices(response.data.services || []);
      return { success: true, data: response.data };
    } catch (err) {
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  };

  const loadPopularServices = async (limit = 10) => {
    try {
      const response = await servicesService.getPopularServices(limit);
      setPopularServices(response.data.services || []);
      return { success: true, data: response.data };
    } catch (err) {
      setError(err.message);
      return { success: false, error: err.message };
    }
  };

  const loadCategories = async () => {
    try {
      const response = await servicesService.getServiceCategories();
      setCategories(response.data.categories || []);
      return { success: true, data: response.data };
    } catch (err) {
      setError(err.message);
      return { success: false, error: err.message };
    }
  };

  const searchServices = async (query, filters = {}) => {
    try {
      setLoading(true);
      setError(null);
      const response = await servicesService.searchServices(query, filters);
      setServices(response.data.services || []);
      return { success: true, data: response.data };
    } catch (err) {
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  };

  const getServicesByCategory = async (category, filters = {}) => {
    try {
      setLoading(true);
      setError(null);
      const response = await servicesService.getServicesByCategory(category, filters);
      setServices(response.data.services || []);
      return { success: true, data: response.data };
    } catch (err) {
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  };

  return {
    services,
    popularServices,
    categories,
    loading,
    error,
    loadServices,
    loadPopularServices,
    loadCategories,
    searchServices,
    getServicesByCategory,
    refreshServices: loadServices
  };
};

export const useService = (serviceId) => {
  const [service, setService] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (serviceId) {
      loadService();
    }
  }, [serviceId]);

  const loadService = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await servicesService.getService(serviceId);
      setService(response.data.service);
      return { success: true, data: response.data };
    } catch (err) {
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  };

  return {
    service,
    loading,
    error,
    loadService,
    refreshService: loadService
  };
};
```

### 3. Bookings Hook

Create `src/hooks/useBookings.js`:

```javascript
import { useState, useEffect } from 'react';
import { bookingService } from '../services';

export const useBookings = (initialLoad = true) => {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (initialLoad) {
      loadBookings();
    }
  }, [initialLoad]);

  const loadBookings = async (filters = {}) => {
    try {
      setLoading(true);
      setError(null);
      const response = await bookingService.getMyBookings(filters);
      setBookings(response.data.bookings || []);
      return { success: true, data: response.data };
    } catch (err) {
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  };

  const createBooking = async (bookingData) => {
    try {
      setLoading(true);
      setError(null);
      const response = await bookingService.createBooking(bookingData);
      
      // Add new booking to the list
      setBookings(prev => [response.data.booking, ...prev]);
      
      return { success: true, data: response.data };
    } catch (err) {
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  };

  const updateBookingStatus = async (bookingId, status, notes = '') => {
    try {
      setLoading(true);
      setError(null);
      const response = await bookingService.updateBookingStatus(bookingId, status, notes);
      
      // Update booking in the list
      setBookings(prev => prev.map(booking => 
        booking.id === bookingId 
          ? { ...booking, status, ...response.data.booking }
          : booking
      ));
      
      return { success: true, data: response.data };
    } catch (err) {
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  };

  const rateBooking = async (bookingId, ratingData) => {
    try {
      setLoading(true);
      setError(null);
      const response = await bookingService.rateBooking(bookingId, ratingData);
      
      // Update booking in the list
      setBookings(prev => prev.map(booking => 
        booking.id === bookingId 
          ? { ...booking, rating: ratingData.rating, review: ratingData.review }
          : booking
      ));
      
      return { success: true, data: response.data };
    } catch (err) {
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  };

  return {
    bookings,
    loading,
    error,
    loadBookings,
    createBooking,
    updateBookingStatus,
    rateBooking,
    refreshBookings: loadBookings
  };
};

export const useBooking = (bookingId) => {
  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (bookingId) {
      loadBooking();
    }
  }, [bookingId]);

  const loadBooking = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await bookingService.getBooking(bookingId);
      setBooking(response.data.booking);
      return { success: true, data: response.data };
    } catch (err) {
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  };

  return {
    booking,
    loading,
    error,
    loadBooking,
    refreshBooking: loadBooking
  };
};
```

### 4. Offers Hook

Create `src/hooks/useOffers.js`:

```javascript
import { useState, useEffect } from 'react';
import { offersService } from '../services';

export const useOffers = (initialLoad = true) => {
  const [offers, setOffers] = useState([]);
  const [activeOffers, setActiveOffers] = useState([]);
  const [featuredOffers, setFeaturedOffers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (initialLoad) {
      loadActiveOffers();
      loadFeaturedOffers();
    }
  }, [initialLoad]);

  const loadActiveOffers = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await offersService.getActiveOffers();
      setActiveOffers(response.data.offers || []);
      return { success: true, data: response.data };
    } catch (err) {
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  };

  const loadFeaturedOffers = async () => {
    try {
      const response = await offersService.getFeaturedOffers();
      setFeaturedOffers(response.data.offers || []);
      return { success: true, data: response.data };
    } catch (err) {
      setError(err.message);
      return { success: false, error: err.message };
    }
  };

  const loadAllOffers = async (filters = {}) => {
    try {
      setLoading(true);
      setError(null);
      const response = await offersService.getAllOffers(filters);
      setOffers(response.data.offers || []);
      return { success: true, data: response.data };
    } catch (err) {
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  };

  const validateOfferCode = async (code) => {
    try {
      setLoading(true);
      setError(null);
      const response = await offersService.validateOfferCode(code);
      return { success: true, data: response.data };
    } catch (err) {
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  };

  const useOffer = async (offerId, bookingData) => {
    try {
      setLoading(true);
      setError(null);
      const response = await offersService.useOffer(offerId, bookingData);
      return { success: true, data: response.data };
    } catch (err) {
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  };

  return {
    offers,
    activeOffers,
    featuredOffers,
    loading,
    error,
    loadActiveOffers,
    loadFeaturedOffers,
    loadAllOffers,
    validateOfferCode,
    useOffer,
    refreshOffers: loadActiveOffers
  };
};
```

### 5. User Profile Hook

Create `src/hooks/useUser.js`:

```javascript
import { useState, useEffect } from 'react';
import { userService } from '../services';
import { useAuth } from './useAuth';

export const useUser = () => {
  const { user, updateUser, isAuthenticated } = useAuth();
  const [addresses, setAddresses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isAuthenticated) {
      loadAddresses();
    }
  }, [isAuthenticated]);

  const updateProfile = async (profileData) => {
    try {
      setLoading(true);
      setError(null);
      const response = await userService.updateProfile(profileData);
      
      if (response.status === 'success') {
        updateUser(response.data.user);
      }
      
      return { success: true, data: response.data };
    } catch (err) {
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  };

  const updateProfileImage = async (imageData) => {
    try {
      setLoading(true);
      setError(null);
      const response = await userService.updateProfileImage(imageData);
      
      if (response.status === 'success') {
        updateUser(response.data.user);
      }
      
      return { success: true, data: response.data };
    } catch (err) {
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  };

  const loadAddresses = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await userService.getAddresses();
      setAddresses(response.data.addresses || []);
      return { success: true, data: response.data };
    } catch (err) {
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  };

  const createAddress = async (addressData) => {
    try {
      setLoading(true);
      setError(null);
      const response = await userService.createAddress(addressData);
      
      // Add new address to the list
      setAddresses(prev => [...prev, response.data.address]);
      
      return { success: true, data: response.data };
    } catch (err) {
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  };

  const updateAddress = async (addressId, addressData) => {
    try {
      setLoading(true);
      setError(null);
      const response = await userService.updateAddress(addressId, addressData);
      
      // Update address in the list
      setAddresses(prev => prev.map(addr => 
        addr.id === addressId ? response.data.address : addr
      ));
      
      return { success: true, data: response.data };
    } catch (err) {
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  };

  const deleteAddress = async (addressId) => {
    try {
      setLoading(true);
      setError(null);
      await userService.deleteAddress(addressId);
      
      // Remove address from the list
      setAddresses(prev => prev.filter(addr => addr.id !== addressId));
      
      return { success: true };
    } catch (err) {
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  };

  const setDefaultAddress = async (addressId) => {
    try {
      setLoading(true);
      setError(null);
      await userService.setDefaultAddress(addressId);
      
      // Update addresses to reflect new default
      setAddresses(prev => prev.map(addr => ({
        ...addr,
        isDefault: addr.id === addressId
      })));
      
      return { success: true };
    } catch (err) {
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  };

  return {
    user,
    addresses,
    loading,
    error,
    updateProfile,
    updateProfileImage,
    loadAddresses,
    createAddress,
    updateAddress,
    deleteAddress,
    setDefaultAddress,
    refreshAddresses: loadAddresses
  };
};
```

### 6. Notifications Hook

Create `src/hooks/useNotifications.js`:

```javascript
import { useState, useEffect } from 'react';
import { notificationService } from '../services';

export const useNotifications = (initialLoad = true) => {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (initialLoad) {
      loadNotifications();
      loadUnreadCount();
    }
  }, [initialLoad]);

  const loadNotifications = async (filters = {}) => {
    try {
      setLoading(true);
      setError(null);
      const response = await notificationService.getMyNotifications(filters);
      setNotifications(response.data.notifications || []);
      return { success: true, data: response.data };
    } catch (err) {
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  };

  const loadUnreadCount = async () => {
    try {
      const response = await notificationService.getUnreadCount();
      setUnreadCount(response.data.count || 0);
      return { success: true, data: response.data };
    } catch (err) {
      setError(err.message);
      return { success: false, error: err.message };
    }
  };

  const markAsRead = async (notificationId) => {
    try {
      await notificationService.markAsRead(notificationId);
      
      // Update notification in the list
      setNotifications(prev => prev.map(notif => 
        notif.id === notificationId 
          ? { ...notif, isRead: true }
          : notif
      ));
      
      // Update unread count
      setUnreadCount(prev => Math.max(0, prev - 1));
      
      return { success: true };
    } catch (err) {
      setError(err.message);
      return { success: false, error: err.message };
    }
  };

  const markAllAsRead = async () => {
    try {
      setLoading(true);
      await notificationService.markAllAsRead();
      
      // Mark all notifications as read
      setNotifications(prev => prev.map(notif => ({ ...notif, isRead: true })));
      setUnreadCount(0);
      
      return { success: true };
    } catch (err) {
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  };

  const deleteNotification = async (notificationId) => {
    try {
      await notificationService.deleteNotification(notificationId);
      
      // Remove notification from the list
      const notificationToDelete = notifications.find(n => n.id === notificationId);
      setNotifications(prev => prev.filter(notif => notif.id !== notificationId));
      
      // Update unread count if the deleted notification was unread
      if (notificationToDelete && !notificationToDelete.isRead) {
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
      
      return { success: true };
    } catch (err) {
      setError(err.message);
      return { success: false, error: err.message };
    }
  };

  const registerDeviceToken = async (tokenData) => {
    try {
      const response = await notificationService.registerDeviceToken(tokenData);
      return { success: true, data: response.data };
    } catch (err) {
      setError(err.message);
      return { success: false, error: err.message };
    }
  };

  return {
    notifications,
    unreadCount,
    loading,
    error,
    loadNotifications,
    loadUnreadCount,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    registerDeviceToken,
    refreshNotifications: loadNotifications
  };
};
```

## 🎯 Usage Examples in Components

### Login Screen Example:

```javascript
import React, { useState } from 'react';
import { View, TextInput, TouchableOpacity, Text, Alert } from 'react-native';
import { useAuth } from '../hooks/useAuth';

export default function LoginScreen({ navigation }) {
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState('phone'); // 'phone' or 'otp'
  const [loading, setLoading] = useState(false);
  
  const { login, sendOtp } = useAuth();

  const handleSendOtp = async () => {
    if (!phone) {
      Alert.alert('Error', 'Please enter your phone number');
      return;
    }

    setLoading(true);
    const result = await sendOtp(phone);
    
    if (result.success) {
      setStep('otp');
      Alert.alert('Success', 'OTP sent successfully');
    } else {
      Alert.alert('Error', result.error);
    }
    setLoading(false);
  };

  const handleVerifyOtp = async () => {
    if (!otp) {
      Alert.alert('Error', 'Please enter the OTP');
      return;
    }

    setLoading(true);
    const result = await login(phone, otp);
    
    if (result.success) {
      Alert.alert('Success', `Welcome ${result.data.user.name}!`);
      navigation.replace('Main');
    } else {
      Alert.alert('Error', result.error);
    }
    setLoading(false);
  };

  return (
    <View style={{ flex: 1, padding: 20, justifyContent: 'center' }}>
      {step === 'phone' ? (
        <>
          <Text style={{ fontSize: 24, marginBottom: 20 }}>Enter Phone Number</Text>
          <TextInput
            value={phone}
            onChangeText={setPhone}
            placeholder="Enter your phone number"
            keyboardType="phone-pad"
            style={{ borderWidth: 1, padding: 15, marginBottom: 20, borderRadius: 8 }}
          />
          <TouchableOpacity
            onPress={handleSendOtp}
            disabled={loading}
            style={{ 
              backgroundColor: '#007AFF', 
              padding: 15, 
              borderRadius: 8, 
              alignItems: 'center',
              opacity: loading ? 0.6 : 1 
            }}
          >
            <Text style={{ color: 'white', fontSize: 18 }}>
              {loading ? 'Sending...' : 'Send OTP'}
            </Text>
          </TouchableOpacity>
        </>
      ) : (
        <>
          <Text style={{ fontSize: 24, marginBottom: 20 }}>Enter OTP</Text>
          <Text style={{ marginBottom: 15, color: '#666' }}>
            OTP sent to {phone}
          </Text>
          <TextInput
            value={otp}
            onChangeText={setOtp}
            placeholder="Enter OTP"
            keyboardType="number-pad"
            maxLength={6}
            style={{ borderWidth: 1, padding: 15, marginBottom: 20, borderRadius: 8 }}
          />
          <TouchableOpacity
            onPress={handleVerifyOtp}
            disabled={loading}
            style={{ 
              backgroundColor: '#007AFF', 
              padding: 15, 
              borderRadius: 8, 
              alignItems: 'center',
              opacity: loading ? 0.6 : 1 
            }}
          >
            <Text style={{ color: 'white', fontSize: 18 }}>
              {loading ? 'Verifying...' : 'Verify OTP'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setStep('phone')}
            style={{ marginTop: 15, alignItems: 'center' }}
          >
            <Text style={{ color: '#007AFF' }}>Change Phone Number</Text>
          </TouchableOpacity>
        </>
      )}
    </View>
  );
}
```

### Services Screen Example:

```javascript
import React, { useState } from 'react';
import { 
  View, 
  Text, 
  FlatList, 
  TouchableOpacity, 
  TextInput,
  RefreshControl,
  ActivityIndicator 
} from 'react-native';
import { useServices } from '../hooks/useServices';

export default function ServicesScreen({ navigation }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  
  const { 
    services, 
    categories, 
    popularServices,
    loading, 
    error,
    searchServices,
    getServicesByCategory,
    refreshServices
  } = useServices();

  const handleSearch = async () => {
    if (searchQuery.trim()) {
      await searchServices(searchQuery);
    } else {
      await refreshServices();
    }
  };

  const handleCategoryFilter = async (category) => {
    setSelectedCategory(category);
    if (category === 'all') {
      await refreshServices();
    } else {
      await getServicesByCategory(category);
    }
  };

  const renderService = ({ item }) => (
    <TouchableOpacity
      style={{
        backgroundColor: 'white',
        padding: 16,
        marginHorizontal: 16,
        marginVertical: 8,
        borderRadius: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3
      }}
      onPress={() => navigation.navigate('ServiceDetails', { serviceId: item.id })}
    >
      <Text style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 4 }}>
        {item.name}
      </Text>
      <Text style={{ color: '#666', marginBottom: 8 }}>
        {item.description}
      </Text>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#007AFF' }}>
          ₹{item.price}
        </Text>
        <Text style={{ color: '#666' }}>
          {item.duration} mins
        </Text>
      </View>
      {item.rating && (
        <Text style={{ color: '#FF6B35', marginTop: 4 }}>
          ⭐ {item.rating} ({item.reviewCount} reviews)
        </Text>
      )}
    </TouchableOpacity>
  );

  const renderCategory = ({ item }) => (
    <TouchableOpacity
      style={{
        paddingHorizontal: 16,
        paddingVertical: 8,
        marginHorizontal: 4,
        backgroundColor: selectedCategory === item.slug ? '#007AFF' : '#f0f0f0',
        borderRadius: 20
      }}
      onPress={() => handleCategoryFilter(item.slug)}
    >
      <Text style={{ 
        color: selectedCategory === item.slug ? 'white' : '#333',
        fontWeight: selectedCategory === item.slug ? 'bold' : 'normal'
      }}>
        {item.name}
      </Text>
    </TouchableOpacity>
  );

  if (loading && services.length === 0) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={{ marginTop: 16, fontSize: 16 }}>Loading services...</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#f5f5f5' }}>
      {/* Header */}
      <View style={{ backgroundColor: 'white', padding: 16, paddingTop: 60 }}>
        <Text style={{ fontSize: 28, fontWeight: 'bold', marginBottom: 16 }}>
          Services
        </Text>
        
        {/* Search Bar */}
        <View style={{ flexDirection: 'row', marginBottom: 16 }}>
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search services..."
            style={{
              flex: 1,
              borderWidth: 1,
              borderColor: '#ddd',
              padding: 12,
              borderRadius: 8,
              marginRight: 8
            }}
          />
          <TouchableOpacity
            onPress={handleSearch}
            style={{
              backgroundColor: '#007AFF',
              paddingHorizontal: 16,
              paddingVertical: 12,
              borderRadius: 8,
              justifyContent: 'center'
            }}
          >
            <Text style={{ color: 'white', fontWeight: 'bold' }}>Search</Text>
          </TouchableOpacity>
        </View>

        {/* Categories */}
        <FlatList
          data={[{ name: 'All', slug: 'all' }, ...categories]}
          keyExtractor={(item) => item.slug}
          renderItem={renderCategory}
          horizontal
          showsHorizontalScrollIndicator={false}
        />
      </View>

      {/* Popular Services Section */}
      {popularServices.length > 0 && (
        <View style={{ backgroundColor: 'white', marginVertical: 8 }}>
          <Text style={{ fontSize: 20, fontWeight: 'bold', padding: 16 }}>
            Popular Services
          </Text>
          <FlatList
            data={popularServices.slice(0, 5)}
            keyExtractor={(item) => `popular-${item.id}`}
            renderItem={renderService}
            horizontal
            showsHorizontalScrollIndicator={false}
          />
        </View>
      )}

      {/* Services List */}
      <FlatList
        data={services}
        keyExtractor={(item) => item.id}
        renderItem={renderService}
        refreshControl={
          <RefreshControl
            refreshing={loading}
            onRefresh={refreshServices}
            colors={['#007AFF']}
          />
        }
        ListEmptyComponent={() => (
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 100 }}>
            <Text style={{ fontSize: 18, color: '#666' }}>
              {error ? `Error: ${error}` : 'No services found'}
            </Text>
            {error && (
              <TouchableOpacity
                onPress={refreshServices}
                style={{
                  backgroundColor: '#007AFF',
                  paddingHorizontal: 20,
                  paddingVertical: 10,
                  borderRadius: 8,
                  marginTop: 16
                }}
              >
                <Text style={{ color: 'white', fontWeight: 'bold' }}>Retry</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      />
    </View>
  );
}
```

### Bookings Screen Example:

```javascript
import React, { useState } from 'react';
import { 
  View, 
  Text, 
  FlatList, 
  TouchableOpacity,
  RefreshControl,
  Alert 
} from 'react-native';
import { useBookings } from '../hooks/useBookings';
import { useAuth } from '../hooks/useAuth';

export default function BookingsScreen({ navigation }) {
  const [filter, setFilter] = useState('all'); // 'all', 'pending', 'completed', 'cancelled'
  const { user } = useAuth();
  
  const { 
    bookings, 
    loading, 
    error,
    refreshBookings,
    updateBookingStatus,
    rateBooking
  } = useBookings();

  const filteredBookings = bookings.filter(booking => {
    if (filter === 'all') return true;
    return booking.status === filter;
  });

  const handleCancelBooking = (booking) => {
    Alert.alert(
      'Cancel Booking',
      'Are you sure you want to cancel this booking?',
      [
        { text: 'No', style: 'cancel' },
        { 
          text: 'Yes', 
          style: 'destructive',
          onPress: () => updateBookingStatus(booking.id, 'cancelled') 
        }
      ]
    );
  };

  const handleRateBooking = async (booking) => {
    // Navigate to rating screen or show rating modal
    navigation.navigate('RateBooking', { bookingId: booking.id });
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return '#FFA500';
      case 'confirmed': return '#007AFF';
      case 'in-progress': return '#00CED1';
      case 'completed': return '#32CD32';
      case 'cancelled': return '#FF6347';
      default: return '#666';
    }
  };

  const renderBooking = ({ item: booking }) => (
    <View
      style={{
        backgroundColor: 'white',
        margin: 16,
        padding: 16,
        borderRadius: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3
      }}
    >
      {/* Service Info */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
        <Text style={{ fontSize: 18, fontWeight: 'bold', flex: 1 }}>
          {booking.service.name}
        </Text>
        <Text 
          style={{ 
            color: getStatusColor(booking.status),
            fontWeight: 'bold',
            textTransform: 'capitalize'
          }}
        >
          {booking.status.replace('-', ' ')}
        </Text>
      </View>

      {/* Booking Details */}
      <Text style={{ color: '#666', marginBottom: 4 }}>
        📅 {new Date(booking.scheduledDate).toLocaleDateString()} at {new Date(booking.scheduledDate).toLocaleTimeString()}
      </Text>
      
      <Text style={{ color: '#666', marginBottom: 4 }}>
        📍 {booking.location.address}
      </Text>

      {booking.professional && (
        <Text style={{ color: '#666', marginBottom: 8 }}>
          👨‍🔧 {booking.professional.name}
        </Text>
      )}

      {/* Amount */}
      <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#007AFF', marginBottom: 12 }}>
        Total: ₹{booking.totalAmount}
      </Text>

      {/* Actions */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <TouchableOpacity
          onPress={() => navigation.navigate('BookingDetails', { bookingId: booking.id })}
          style={{
            backgroundColor: '#f0f0f0',
            paddingHorizontal: 16,
            paddingVertical: 8,
            borderRadius: 8
          }}
        >
          <Text style={{ color: '#333', fontWeight: 'bold' }}>View Details</Text>
        </TouchableOpacity>

        <View style={{ flexDirection: 'row' }}>
          {booking.status === 'pending' && (
            <TouchableOpacity
              onPress={() => handleCancelBooking(booking)}
              style={{
                backgroundColor: '#FF6347',
                paddingHorizontal: 16,
                paddingVertical: 8,
                borderRadius: 8,
                marginLeft: 8
              }}
            >
              <Text style={{ color: 'white', fontWeight: 'bold' }}>Cancel</Text>
            </TouchableOpacity>
          )}

          {booking.status === 'completed' && !booking.rating && (
            <TouchableOpacity
              onPress={() => handleRateBooking(booking)}
              style={{
                backgroundColor: '#FFA500',
                paddingHorizontal: 16,
                paddingVertical: 8,
                borderRadius: 8,
                marginLeft: 8
              }}
            >
              <Text style={{ color: 'white', fontWeight: 'bold' }}>Rate</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Rating (if exists) */}
      {booking.rating && (
        <View style={{ marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: '#eee' }}>
          <Text style={{ color: '#FFA500' }}>
            ⭐ Your Rating: {booking.rating}/5
          </Text>
          {booking.review && (
            <Text style={{ color: '#666', fontStyle: 'italic', marginTop: 4 }}>
              "{booking.review}"
            </Text>
          )}
        </View>
      )}
    </View>
  );

  const filterButtons = [
    { key: 'all', label: 'All' },
    { key: 'pending', label: 'Pending' },
    { key: 'confirmed', label: 'Confirmed' },
    { key: 'completed', label: 'Completed' },
    { key: 'cancelled', label: 'Cancelled' }
  ];

  return (
    <View style={{ flex: 1, backgroundColor: '#f5f5f5' }}>
      {/* Header */}
      <View style={{ backgroundColor: 'white', padding: 16, paddingTop: 60 }}>
        <Text style={{ fontSize: 28, fontWeight: 'bold', marginBottom: 16 }}>
          My Bookings
        </Text>
        
        {/* Filter Buttons */}
        <FlatList
          data={filterButtons}
          keyExtractor={(item) => item.key}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={{
                paddingHorizontal: 16,
                paddingVertical: 8,
                marginRight: 8,
                backgroundColor: filter === item.key ? '#007AFF' : '#f0f0f0',
                borderRadius: 20
              }}
              onPress={() => setFilter(item.key)}
            >
              <Text style={{ 
                color: filter === item.key ? 'white' : '#333',
                fontWeight: filter === item.key ? 'bold' : 'normal'
              }}>
                {item.label}
              </Text>
            </TouchableOpacity>
          )}
          horizontal
          showsHorizontalScrollIndicator={false}
        />
      </View>

      {/* Bookings List */}
      <FlatList
        data={filteredBookings}
        keyExtractor={(item) => item.id}
        renderItem={renderBooking}
        refreshControl={
          <RefreshControl
            refreshing={loading}
            onRefresh={refreshBookings}
            colors={['#007AFF']}
          />
        }
        ListEmptyComponent={() => (
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 100 }}>
            <Text style={{ fontSize: 18, color: '#666', textAlign: 'center' }}>
              {error ? `Error: ${error}` : 
               filter === 'all' ? 'No bookings yet' : `No ${filter} bookings`}
            </Text>
            {!error && (
              <TouchableOpacity
                onPress={() => navigation.navigate('Services')}
                style={{
                  backgroundColor: '#007AFF',
                  paddingHorizontal: 20,
                  paddingVertical: 10,
                  borderRadius: 8,
                  marginTop: 16
                }}
              >
                <Text style={{ color: 'white', fontWeight: 'bold' }}>
                  Book a Service
                </Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      />
    </View>
  );
}
```

## 🎯 Setup Instructions

### 1. Install the hooks in your app:
```bash
mkdir src/hooks
# Copy all the hook files above into src/hooks/
```

### 2. Wrap your app with AuthProvider:

```javascript
// App.js
import React from 'react';
import { AuthProvider } from './src/hooks/useAuth';
import MainNavigator from './src/navigation/MainNavigator';

export default function App() {
  return (
    <AuthProvider>
      <MainNavigator />
    </AuthProvider>
  );
}
```

### 3. Use hooks in any component:

```javascript
import { useAuth } from '../hooks/useAuth';
import { useServices } from '../hooks/useServices';
import { useBookings } from '../hooks/useBookings';

// In your component
const { user, isAuthenticated, login, logout } = useAuth();
const { services, loading, loadServices } = useServices();
const { bookings, createBooking } = useBookings();
```

## 🎉 Benefits

✅ **Easy State Management** - No more manual API calls and state management
✅ **Automatic Loading States** - Built-in loading and error handling
✅ **Real-time Updates** - State updates automatically after API calls
✅ **Reusable Logic** - Use the same hooks across multiple components
✅ **Type Safety** - Full TypeScript support (if using TypeScript)
✅ **Performance Optimized** - Efficient re-renders and caching

Your mobile app now has complete, easy-to-use integration with all your backend routes! 🚀