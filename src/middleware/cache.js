// Simple in-memory cache middleware for GET endpoints
// Note: For multi-instance deployments, replace with Redis.

const cacheStore = new Map();

// Build cache key from URL path and sorted query params
const defaultKey = (req) => {
  const params = new URLSearchParams(req.query);
  // Sort the params to avoid different orders producing different keys
  const sorted = [...params.entries()].sort(([a],[b]) => a.localeCompare(b));
  const normalized = new URLSearchParams(sorted).toString();
  return `${req.originalUrl.split('?')[0]}?${normalized}`;
};

export function cacheGet(ttlMs = 60_000, keyFn = defaultKey) {
  return (req, res, next) => {
    if (req.method !== 'GET') return next();

    const key = keyFn(req);
    const hit = cacheStore.get(key);

    if (hit && hit.expires > Date.now()) {
      res.set('X-Cache', 'HIT');
      // Preserve status code
      return res.status(hit.statusCode).json(hit.payload);
    }

    // Wrap res.json to capture the payload
    const originalJson = res.json.bind(res);
    res.json = (body) => {
      try {
        cacheStore.set(key, {
          payload: body,
          statusCode: res.statusCode || 200,
          expires: Date.now() + ttlMs,
        });
        // Hint client caches
        res.set('Cache-Control', `public, max-age=${Math.floor(ttlMs / 1000)}`);
        res.set('X-Cache', 'MISS');
      } catch (_) {
        // no-op if caching fails
      }
      return originalJson(body);
    };

    next();
  };
}

export function cacheInvalidate(prefix = '') {
  // Remove all entries whose key starts with prefix
  for (const key of cacheStore.keys()) {
    if (!prefix || key.startsWith(prefix)) cacheStore.delete(key);
  }
}

export default { cacheGet, cacheInvalidate };