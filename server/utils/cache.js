/**
 * Advanced In-Memory Cache Engine
 * Built to prevent API rate-limiting and drop response latency.
 * Provides hard numbers for ATS resume tracking.
 */

class CacheManager {
  constructor(defaultTtlSeconds = 300) { // 5 mins default TTL
    this.cache = new Map();
    this.defaultTtl = defaultTtlSeconds * 1000;
    
    // Resume Metrics Tracking
    this.metrics = {
      hits: 0,
      misses: 0,
      totalQueries: 0,
      savedLatencyMs: 0, // Assume 3000ms saved per hit
      bytesProcessed: 0
    };
  }

  get(key) {
    this.metrics.totalQueries++;
    
    const item = this.cache.get(key);
    if (!item) {
      this.metrics.misses++;
      return null;
    }

    // Check TTL
    if (Date.now() > item.expiry) {
      this.cache.delete(key);
      this.metrics.misses++;
      return null;
    }

    this.metrics.hits++;
    // Assume an external API call to CF takes ~3000ms. A cache hit saves this.
    this.metrics.savedLatencyMs += 3000; 
    
    return item.value;
  }

  set(key, value, ttlSeconds = null) {
    const ttl = ttlSeconds ? (ttlSeconds * 1000) : this.defaultTtl;
    const sizeInBytes = Buffer.byteLength(JSON.stringify(value), 'utf8');
    
    this.metrics.bytesProcessed += sizeInBytes;

    this.cache.set(key, {
      value,
      expiry: Date.now() + ttl,
      size: sizeInBytes
    });
  }

  getMetrics() {
    return {
      ...this.metrics,
      hitRate: this.metrics.totalQueries === 0 
        ? 0 
        : ((this.metrics.hits / this.metrics.totalQueries) * 100).toFixed(2) + '%',
      totalCachedKeys: this.cache.size,
      uptimeSeconds: process.uptime()
    };
  }
}

// Export a singleton instance
export const apiCache = new CacheManager(300); // 5 mins TTL
