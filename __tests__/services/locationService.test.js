import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import {
  updateProfessionalLocation,
  updateProfessionalStatus,
  setTrackingEnabled,
  updateTrackingSettings,
  getProfessionalLocation,
  getProfessionalLocationHistory,
  findNearbyProfessionals,
  subscribeToLocationUpdates,
  unsubscribeFromLocationUpdates
} from '../../src/services/locationService';
import Location from '../../src/models/locationModel';
import User from '../../src/models/userModel';

// Mock Firebase admin
jest.mock('../../src/config/firebase', () => ({
  database: () => ({
    ref: jest.fn().mockReturnThis(),
    child: jest.fn().mockReturnThis(),
    set: jest.fn().mockResolvedValue(true),
    update: jest.fn().mockResolvedValue(true),
    remove: jest.fn().mockResolvedValue(true),
    once: jest.fn().mockResolvedValue({
      val: () => ({
        latitude: 37.7749,
        longitude: -122.4194,
        status: 'available'
      })
    })
  })
}));

let mongoServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

beforeEach(async () => {
  await Location.deleteMany({});
  await User.deleteMany({});
});

describe('Location Service', () => {
  let testUser;
  let testLocation;

  beforeEach(async () => {
    // Create test user
    testUser = new User({
      name: 'Test Professional',
      email: 'test@example.com',
      phone: '1234567890',
      role: 'professional'
    });
    await testUser.save();

    // Create test location
    testLocation = new Location({
      professional: testUser._id,
      currentLocation: {
        latitude: 37.7749,
        longitude: -122.4194,
        accuracy: 10,
        timestamp: new Date()
      },
      status: 'available',
      trackingEnabled: true,
      trackingSettings: {
        updateInterval: 30000,
        significantChangeThreshold: 10,
        batteryOptimizationEnabled: true,
        maxHistoryItems: 100
      }
    });
    await testLocation.save();
  });

  describe('updateProfessionalLocation', () => {
    it('should update a professional\'s location', async () => {
      const newLocation = {
        latitude: 37.7750,
        longitude: -122.4195,
        accuracy: 5,
        speed: 0,
        heading: 90
      };

      const result = await updateProfessionalLocation(testUser._id, newLocation);

      expect(result).toBeDefined();
      expect(result.currentLocation.latitude).toBe(newLocation.latitude);
      expect(result.currentLocation.longitude).toBe(newLocation.longitude);
      expect(result.currentLocation.accuracy).toBe(newLocation.accuracy);
      expect(result.currentLocation.speed).toBe(newLocation.speed);
      expect(result.currentLocation.heading).toBe(newLocation.heading);
      expect(result.locationHistory.length).toBe(1);
    });

    it('should create a new location document if one doesn\'t exist', async () => {
      const newUserId = new mongoose.Types.ObjectId();
      const newLocation = {
        latitude: 37.7750,
        longitude: -122.4195
      };

      const result = await updateProfessionalLocation(newUserId, newLocation);

      expect(result).toBeDefined();
      expect(result.professional.toString()).toBe(newUserId.toString());
      expect(result.currentLocation.latitude).toBe(newLocation.latitude);
      expect(result.currentLocation.longitude).toBe(newLocation.longitude);
    });
  });

  describe('updateProfessionalStatus', () => {
    it('should update a professional\'s status', async () => {
      const newStatus = 'busy';

      const result = await updateProfessionalStatus(testUser._id, newStatus);

      expect(result).toBeDefined();
      expect(result.status).toBe(newStatus);
    });
  });

  describe('setTrackingEnabled', () => {
    it('should enable or disable tracking', async () => {
      const result = await setTrackingEnabled(testUser._id, false);

      expect(result).toBeDefined();
      expect(result.trackingEnabled).toBe(false);

      const enabledResult = await setTrackingEnabled(testUser._id, true);
      expect(enabledResult.trackingEnabled).toBe(true);
    });
  });

  describe('updateTrackingSettings', () => {
    it('should update tracking settings', async () => {
      const newSettings = {
        updateInterval: 60000,
        significantChangeThreshold: 20,
        batteryOptimizationEnabled: false,
        maxHistoryItems: 50
      };

      const result = await updateTrackingSettings(testUser._id, newSettings);

      expect(result).toBeDefined();
      expect(result.trackingSettings.updateInterval).toBe(newSettings.updateInterval);
      expect(result.trackingSettings.significantChangeThreshold).toBe(newSettings.significantChangeThreshold);
      expect(result.trackingSettings.batteryOptimizationEnabled).toBe(newSettings.batteryOptimizationEnabled);
      expect(result.trackingSettings.maxHistoryItems).toBe(newSettings.maxHistoryItems);
    });

    it('should only update provided settings', async () => {
      const partialSettings = {
        updateInterval: 60000
      };

      const result = await updateTrackingSettings(testUser._id, partialSettings);

      expect(result).toBeDefined();
      expect(result.trackingSettings.updateInterval).toBe(partialSettings.updateInterval);
      expect(result.trackingSettings.significantChangeThreshold).toBe(testLocation.trackingSettings.significantChangeThreshold);
      expect(result.trackingSettings.batteryOptimizationEnabled).toBe(testLocation.trackingSettings.batteryOptimizationEnabled);
      expect(result.trackingSettings.maxHistoryItems).toBe(testLocation.trackingSettings.maxHistoryItems);
    });
  });

  describe('getProfessionalLocation', () => {
    it('should get a professional\'s current location', async () => {
      const result = await getProfessionalLocation(testUser._id);

      expect(result).toBeDefined();
      expect(result.professional.toString()).toBe(testUser._id.toString());
      expect(result.currentLocation).toBeDefined();
      expect(result.status).toBe(testLocation.status);
    });

    it('should return null if location not found', async () => {
      const nonExistentId = new mongoose.Types.ObjectId();
      const result = await getProfessionalLocation(nonExistentId);

      expect(result).toBeNull();
    });
  });

  describe('getProfessionalLocationHistory', () => {
    it('should get a professional\'s location history', async () => {
      // Add some history items
      testLocation.locationHistory.push({
        latitude: 37.7751,
        longitude: -122.4196,
        accuracy: 8,
        timestamp: new Date(Date.now() - 60000)
      });
      testLocation.locationHistory.push({
        latitude: 37.7752,
        longitude: -122.4197,
        accuracy: 7,
        timestamp: new Date(Date.now() - 120000)
      });
      await testLocation.save();

      const result = await getProfessionalLocationHistory(testUser._id);

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(2);
    });

    it('should limit history items based on parameter', async () => {
      // Add some history items
      for (let i = 0; i < 10; i++) {
        testLocation.locationHistory.push({
          latitude: 37.7751 + (i * 0.0001),
          longitude: -122.4196 - (i * 0.0001),
          accuracy: 8,
          timestamp: new Date(Date.now() - (i * 60000))
        });
      }
      await testLocation.save();

      const result = await getProfessionalLocationHistory(testUser._id, 5);

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(5);
    });
  });

  describe('findNearbyProfessionals', () => {
    it('should find professionals near a location', async () => {
      // Create additional professionals at different locations
      const professional2 = new User({
        name: 'Nearby Pro',
        email: 'nearby@example.com',
        phone: '2345678901',
        role: 'professional'
      });
      await professional2.save();

      const location2 = new Location({
        professional: professional2._id,
        currentLocation: {
          latitude: 37.7751, // Very close to test location
          longitude: -122.4195,
          accuracy: 10,
          timestamp: new Date()
        },
        status: 'available',
        trackingEnabled: true
      });
      await location2.save();

      const professional3 = new User({
        name: 'Far Pro',
        email: 'far@example.com',
        phone: '3456789012',
        role: 'professional'
      });
      await professional3.save();

      const location3 = new Location({
        professional: professional3._id,
        currentLocation: {
          latitude: 38.5816, // San Francisco to Sacramento (~140km)
          longitude: -121.4944,
          accuracy: 10,
          timestamp: new Date()
        },
        status: 'available',
        trackingEnabled: true
      });
      await location3.save();

      const result = await findNearbyProfessionals(
        { latitude: 37.7749, longitude: -122.4194 },
        1000, // 1km radius
        'available'
      );

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(2); // Should find testUser and professional2, but not professional3
      
      // Check that results include distance
      expect(result[0].distance).toBeDefined();
      expect(typeof result[0].distance).toBe('number');
    });

    it('should filter by status', async () => {
      // Update test location status
      testLocation.status = 'busy';
      await testLocation.save();

      // Create additional professional with available status
      const professional2 = new User({
        name: 'Available Pro',
        email: 'available@example.com',
        phone: '2345678901',
        role: 'professional'
      });
      await professional2.save();

      const location2 = new Location({
        professional: professional2._id,
        currentLocation: {
          latitude: 37.7751,
          longitude: -122.4195,
          accuracy: 10,
          timestamp: new Date()
        },
        status: 'available',
        trackingEnabled: true
      });
      await location2.save();

      const result = await findNearbyProfessionals(
        { latitude: 37.7749, longitude: -122.4194 },
        1000,
        'available'
      );

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(1); // Should only find professional2
      expect(result[0].name).toBe('Available Pro');
    });
  });

  describe('subscribeToLocationUpdates', () => {
    it('should subscribe a user to location updates', async () => {
      const userId = new mongoose.Types.ObjectId();
      
      const result = await subscribeToLocationUpdates(userId, testUser._id);
      
      expect(result).toBeDefined();
      expect(result.success).toBe(true);
    });
  });

  describe('unsubscribeFromLocationUpdates', () => {
    it('should unsubscribe a user from location updates', async () => {
      const userId = new mongoose.Types.ObjectId();
      
      // First subscribe
      await subscribeToLocationUpdates(userId, testUser._id);
      
      // Then unsubscribe
      const result = await unsubscribeFromLocationUpdates(userId, testUser._id);
      
      expect(result).toBeDefined();
      expect(result.success).toBe(true);
    });
  });
});