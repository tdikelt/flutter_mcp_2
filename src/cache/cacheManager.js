import Database from 'better-sqlite3';
import NodeCache from 'node-cache';
import { createHash } from 'crypto';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export class CacheManager {
  constructor(options = {}) {
    this.cacheDir = options.cacheDir || join(__dirname, '../../.cache');
    this.memoryCache = new NodeCache({ 
      stdTTL: options.memoryTTL || 300, // 5 minutes default
      checkperiod: 120 
    });
    
    // Ensure cache directory exists
    if (!fs.existsSync(this.cacheDir)) {
      fs.mkdirSync(this.cacheDir, { recursive: true });
    }

    // Initialize SQLite database
    this.db = new Database(join(this.cacheDir, 'flutter_mcp.db'));
    this.initDatabase();
    
    // TTL configurations (in seconds)
    this.ttlConfig = {
      widgetAnalysis: options.widgetAnalysisTTL || 86400, // 24 hours
      pubPackage: options.pubPackageTTL || 43200, // 12 hours
      flutterDocs: options.flutterDocsTTL || 86400, // 24 hours
      performance: options.performanceTTL || 3600, // 1 hour
      default: options.defaultTTL || 7200 // 2 hours
    };

    // Cache statistics
    this.stats = {
      hits: 0,
      misses: 0,
      writes: 0,
      evictions: 0
    };
  }

  initDatabase() {
    // Create cache table if not exists
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS cache (
        key TEXT PRIMARY KEY,
        value TEXT,
        type TEXT,
        created_at INTEGER,
        expires_at INTEGER,
        hit_count INTEGER DEFAULT 0,
        last_accessed INTEGER,
        size INTEGER
      );
      
      CREATE INDEX IF NOT EXISTS idx_expires_at ON cache(expires_at);
      CREATE INDEX IF NOT EXISTS idx_type ON cache(type);
      CREATE INDEX IF NOT EXISTS idx_last_accessed ON cache(last_accessed);
    `);

    // Create metadata table for cache statistics
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS cache_metadata (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        total_hits INTEGER DEFAULT 0,
        total_misses INTEGER DEFAULT 0,
        total_writes INTEGER DEFAULT 0,
        total_evictions INTEGER DEFAULT 0,
        last_cleanup INTEGER
      );
      
      INSERT OR IGNORE INTO cache_metadata (id) VALUES (1);
    `);

    // Clean up expired entries on startup
    this.cleanup();
  }

  generateKey(type, params) {
    const keyData = JSON.stringify({ type, ...params });
    return createHash('sha256').update(keyData).digest('hex');
  }

  async get(type, params) {
    const key = this.generateKey(type, params);
    
    // Check memory cache first
    const memoryResult = this.memoryCache.get(key);
    if (memoryResult) {
      this.stats.hits++;
      this.updateStats('hits');
      return memoryResult;
    }

    // Check database cache
    const stmt = this.db.prepare(`
      SELECT value, expires_at FROM cache 
      WHERE key = ? AND expires_at > ?
    `);
    
    const now = Date.now();
    const row = stmt.get(key, now);
    
    if (row) {
      // Update hit count and last accessed
      this.db.prepare(`
        UPDATE cache 
        SET hit_count = hit_count + 1, last_accessed = ? 
        WHERE key = ?
      `).run(now, key);
      
      const value = JSON.parse(row.value);
      
      // Store in memory cache for faster subsequent access
      this.memoryCache.set(key, value, 300); // 5 minutes in memory
      
      this.stats.hits++;
      this.updateStats('hits');
      return value;
    }
    
    this.stats.misses++;
    this.updateStats('misses');
    return null;
  }

  async set(type, params, value) {
    const key = this.generateKey(type, params);
    const ttl = this.ttlConfig[type] || this.ttlConfig.default;
    const now = Date.now();
    const expiresAt = now + (ttl * 1000);
    const valueStr = JSON.stringify(value);
    const size = Buffer.byteLength(valueStr);

    // Store in memory cache
    this.memoryCache.set(key, value, ttl);

    // Store in database
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO cache 
      (key, value, type, created_at, expires_at, hit_count, last_accessed, size)
      VALUES (?, ?, ?, ?, ?, 0, ?, ?)
    `);
    
    stmt.run(key, valueStr, type, now, expiresAt, now, size);
    
    this.stats.writes++;
    this.updateStats('writes');
    
    // Trigger cleanup if needed
    if (this.stats.writes % 100 === 0) {
      this.cleanup();
    }
  }

  async invalidate(type, params = null) {
    if (params) {
      // Invalidate specific entry
      const key = this.generateKey(type, params);
      this.memoryCache.del(key);
      this.db.prepare('DELETE FROM cache WHERE key = ?').run(key);
    } else {
      // Invalidate all entries of a type
      this.memoryCache.flushAll();
      this.db.prepare('DELETE FROM cache WHERE type = ?').run(type);
    }
  }

  cleanup() {
    const now = Date.now();
    
    // Remove expired entries
    const result = this.db.prepare('DELETE FROM cache WHERE expires_at < ?').run(now);
    const evicted = result.changes;
    
    if (evicted > 0) {
      this.stats.evictions += evicted;
      this.updateStats('evictions', evicted);
    }

    // Update last cleanup time
    this.db.prepare('UPDATE cache_metadata SET last_cleanup = ? WHERE id = 1').run(now);
    
    // If cache is too large, remove least recently used entries
    const maxSize = 100 * 1024 * 1024; // 100MB
    const totalSize = this.db.prepare('SELECT SUM(size) as total FROM cache').get().total || 0;
    
    if (totalSize > maxSize) {
      // Remove least recently used entries until we're under the limit
      const stmt = this.db.prepare(`
        DELETE FROM cache 
        WHERE key IN (
          SELECT key FROM cache 
          ORDER BY last_accessed ASC 
          LIMIT 100
        )
      `);
      
      while (totalSize > maxSize * 0.8) { // Keep 80% capacity
        const result = stmt.run();
        this.stats.evictions += result.changes;
        this.updateStats('evictions', result.changes);
      }
    }
  }

  getStats() {
    // Get stats from database
    const dbStats = this.db.prepare(
      'SELECT * FROM cache_metadata WHERE id = 1'
    ).get();
    
    // Get cache size info
    const cacheInfo = this.db.prepare(`
      SELECT 
        COUNT(*) as entries,
        SUM(size) as total_size,
        AVG(hit_count) as avg_hits,
        MAX(hit_count) as max_hits
      FROM cache
    `).get();

    // Get type distribution
    const typeStats = this.db.prepare(`
      SELECT type, COUNT(*) as count, SUM(size) as size
      FROM cache
      GROUP BY type
    `).all();

    return {
      memory: {
        hits: this.stats.hits,
        misses: this.stats.misses,
        writes: this.stats.writes,
        evictions: this.stats.evictions
      },
      database: {
        totalHits: dbStats.total_hits,
        totalMisses: dbStats.total_misses,
        totalWrites: dbStats.total_writes,
        totalEvictions: dbStats.total_evictions,
        lastCleanup: new Date(dbStats.last_cleanup).toISOString()
      },
      cache: {
        entries: cacheInfo.entries,
        totalSize: this.formatBytes(cacheInfo.total_size || 0),
        avgHits: Math.round(cacheInfo.avg_hits || 0),
        maxHits: cacheInfo.max_hits || 0
      },
      types: typeStats.map(t => ({
        type: t.type,
        count: t.count,
        size: this.formatBytes(t.size || 0)
      })),
      hitRate: this.calculateHitRate()
    };
  }

  calculateHitRate() {
    const total = this.stats.hits + this.stats.misses;
    if (total === 0) return 0;
    return Math.round((this.stats.hits / total) * 100);
  }

  formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  updateStats(type, count = 1) {
    const stmt = this.db.prepare(`
      UPDATE cache_metadata 
      SET total_${type} = total_${type} + ? 
      WHERE id = 1
    `);
    stmt.run(count);
  }

  // Decorator for automatic caching
  withCache(type, fn) {
    return async (params) => {
      // Try to get from cache
      const cached = await this.get(type, params);
      if (cached) {
        return cached;
      }

      // Execute function and cache result
      const result = await fn(params);
      if (result) {
        await this.set(type, params, result);
      }
      
      return result;
    };
  }

  close() {
    this.memoryCache.flushAll();
    this.db.close();
  }
}

// Singleton instance
let cacheInstance = null;

export function getCacheManager(options) {
  if (!cacheInstance) {
    cacheInstance = new CacheManager(options);
  }
  return cacheInstance;
}