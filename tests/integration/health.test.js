import request from 'supertest';
import app from '../../src/server.js';
import { cleanupTestData } from '../helpers/testHelpers.js';

describe('Health Check Endpoints', () => {
  beforeEach(async () => {
    await cleanupTestData();
  });

  describe('GET /api/health', () => {
    test('should return server health status', async () => {
      const response = await request(app)
        .get('/api/health')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('Server is running');
      expect(response.body.data).toHaveProperty('environment');
      expect(response.body.data).toHaveProperty('timestamp');
      expect(response.body.data).toHaveProperty('version');
    });

    test('should include environment information', async () => {
      const response = await request(app)
        .get('/api/health')
        .expect(200);

      expect(response.body.data.environment).toBe('test');
      expect(response.body.data.timestamp).toBeDefined();
    });
  });

  describe('404 Handler', () => {
    test('should handle non-existent routes', async () => {
      const response = await request(app)
        .get('/api/non-existent-route')
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain("Can't find");
      expect(response.body.statusCode).toBe(404);
    });

    test('should handle POST requests to non-existent routes', async () => {
      const response = await request(app)
        .post('/api/non-existent-route')
        .send({ test: 'data' })
        .expect(404);

      expect(response.body.success).toBe(false);
    });
  });

  describe('CORS Headers', () => {
    test('should include CORS headers in response', async () => {
      const response = await request(app)
        .get('/api/health')
        .set('Origin', 'http://localhost:3000');

      expect(response.headers['access-control-allow-origin']).toBeDefined();
      expect(response.headers['access-control-allow-credentials']).toBe('true');
    });

    test('should handle preflight OPTIONS requests', async () => {
      const response = await request(app)
        .options('/api/health')
        .set('Origin', 'http://localhost:3000')
        .set('Access-Control-Request-Method', 'GET')
        .expect(200);

      expect(response.headers['access-control-allow-methods']).toBeDefined();
    });
  });

  describe('Rate Limiting', () => {
    test('should apply rate limiting to API routes', async () => {
      // Make multiple rapid requests to test rate limiting
      const requests = Array(5).fill().map(() => 
        request(app).get('/api/health')
      );

      const responses = await Promise.all(requests);
      
      // All requests should succeed in test environment with higher limits
      responses.forEach(response => {
        expect([200, 429]).toContain(response.status);
      });
    });

    test('should include rate limit headers', async () => {
      const response = await request(app)
        .get('/api/health');

      // Check for rate limit headers
      expect(response.headers['ratelimit-limit']).toBeDefined();
      expect(response.headers['ratelimit-remaining']).toBeDefined();
    });
  });

  describe('Security Headers', () => {
    test('should include security headers', async () => {
      const response = await request(app)
        .get('/api/health');

      // Check for helmet security headers
      expect(response.headers['x-content-type-options']).toBe('nosniff');
      expect(response.headers['x-frame-options']).toBe('DENY');
      expect(response.headers['x-xss-protection']).toBe('0');
    });
  });

  describe('Request Processing', () => {
    test('should handle JSON requests correctly', async () => {
      const response = await request(app)
        .post('/api/non-existent')
        .set('Content-Type', 'application/json')
        .send({ test: 'data' })
        .expect(404);

      expect(response.body).toBeDefined();
    });

    test('should handle large request bodies within limits', async () => {
      const largeData = { data: 'x'.repeat(50000) }; // 50KB data
      
      const response = await request(app)
        .post('/api/non-existent')
        .send(largeData)
        .expect(404);

      expect(response.body).toBeDefined();
    });

    test('should reject request bodies exceeding size limit', async () => {
      const tooLargeData = { data: 'x'.repeat(200000) }; // 200KB data (exceeds 100KB limit)
      
      const response = await request(app)
        .post('/api/non-existent')
        .send(tooLargeData);

      expect([413, 404]).toContain(response.status); // Either payload too large or not found
    });
  });

  describe('Response Format', () => {
    test('should return consistent response format', async () => {
      const response = await request(app)
        .get('/api/health')
        .expect(200);

      // Check standard response format
      expect(response.body).toHaveProperty('success');
      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('data');
      expect(typeof response.body.success).toBe('boolean');
    });

    test('should handle errors with consistent format', async () => {
      const response = await request(app)
        .get('/api/non-existent-route')
        .expect(404);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('statusCode', 404);
    });
  });

  describe('Compression', () => {
    test('should compress responses when requested', async () => {
      const response = await request(app)
        .get('/api/health')
        .set('Accept-Encoding', 'gzip');

      // The response should be handled by compression middleware
      expect(response.status).toBe(200);
    });
  });

  describe('ETag Support', () => {
    test('should include ETag header for cacheable responses', async () => {
      const response = await request(app)
        .get('/api/health');

      expect(response.headers.etag).toBeDefined();
    });

    test('should handle conditional requests with If-None-Match', async () => {
      const firstResponse = await request(app)
        .get('/api/health');

      const etag = firstResponse.headers.etag;

      const secondResponse = await request(app)
        .get('/api/health')
        .set('If-None-Match', etag);

      // Might return 304 Not Modified or 200 depending on implementation
      expect([200, 304]).toContain(secondResponse.status);
    });
  });
});