/**
 * Persistent Cache Manager
 * Stores API data in localStorage/sessionStorage for instant page loads
 * Works alongside the in-memory DataCacheContext
 */

const CACHE_PREFIX = 'ecotec_cache_';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  shopId: string | null;
  version: number;
}

// Cache version - bump this to invalidate all caches on deploy
const CACHE_DATA_VERSION = 1;

// Cache TTL defaults (in milliseconds)
const CACHE_TTL = {
  products: 10 * 60 * 1000,    // 10 minutes
  customers: 10 * 60 * 1000,   // 10 minutes
  invoices: 5 * 60 * 1000,     // 5 minutes
  categories: 30 * 60 * 1000,  // 30 minutes
  brands: 30 * 60 * 1000,      // 30 minutes
  suppliers: 15 * 60 * 1000,   // 15 minutes
  grns: 5 * 60 * 1000,         // 5 minutes
  settings: 60 * 60 * 1000,    // 1 hour
} as const;

type CacheKey = keyof typeof CACHE_TTL;

/**
 * Get cached data from localStorage
 */
export function getCachedData<T>(key: CacheKey, shopId: string | null): T | null {
  try {
    const raw = localStorage.getItem(`${CACHE_PREFIX}${key}`);
    if (!raw) return null;

    const entry: CacheEntry<T> = JSON.parse(raw);

    // Check version
    if (entry.version !== CACHE_DATA_VERSION) {
      localStorage.removeItem(`${CACHE_PREFIX}${key}`);
      return null;
    }

    // Check shop ID matches
    if (entry.shopId !== shopId) {
      return null;
    }

    // Check TTL
    const ttl = CACHE_TTL[key];
    if (Date.now() - entry.timestamp > ttl) {
      return null; // Expired but don't delete - might be useful as stale fallback
    }

    return entry.data;
  } catch {
    // Corrupted cache, remove it
    localStorage.removeItem(`${CACHE_PREFIX}${key}`);
    return null;
  }
}

/**
 * Get stale cached data (expired but still available as fallback)
 */
export function getStaleCachedData<T>(key: CacheKey, shopId: string | null): T | null {
  try {
    const raw = localStorage.getItem(`${CACHE_PREFIX}${key}`);
    if (!raw) return null;

    const entry: CacheEntry<T> = JSON.parse(raw);
    if (entry.version !== CACHE_DATA_VERSION || entry.shopId !== shopId) return null;

    return entry.data;
  } catch {
    return null;
  }
}

/**
 * Store data in localStorage cache
 */
export function setCachedData<T>(key: CacheKey, data: T, shopId: string | null): void {
  try {
    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      shopId,
      version: CACHE_DATA_VERSION,
    };

    localStorage.setItem(`${CACHE_PREFIX}${key}`, JSON.stringify(entry));
  } catch (e) {
    // localStorage full - clear old entries and retry
    clearOldCaches();
    try {
      const entry: CacheEntry<T> = {
        data,
        timestamp: Date.now(),
        shopId,
        version: CACHE_DATA_VERSION,
      };
      localStorage.setItem(`${CACHE_PREFIX}${key}`, JSON.stringify(entry));
    } catch {
      console.warn('[Cache] localStorage is full, cannot cache:', key);
    }
  }
}

/**
 * Invalidate specific cache key
 */
export function invalidateCache(key: CacheKey): void {
  localStorage.removeItem(`${CACHE_PREFIX}${key}`);
}

/**
 * Invalidate all caches for a specific shop
 */
export function invalidateShopCaches(shopId: string): void {
  const keys = Object.keys(CACHE_TTL) as CacheKey[];
  keys.forEach((key) => {
    try {
      const raw = localStorage.getItem(`${CACHE_PREFIX}${key}`);
      if (raw) {
        const entry = JSON.parse(raw);
        if (entry.shopId === shopId) {
          localStorage.removeItem(`${CACHE_PREFIX}${key}`);
        }
      }
    } catch {
      localStorage.removeItem(`${CACHE_PREFIX}${key}`);
    }
  });
}

/**
 * Clear all ECOTEC caches
 */
export function clearAllCaches(): void {
  const keysToRemove: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key?.startsWith(CACHE_PREFIX)) {
      keysToRemove.push(key);
    }
  }
  keysToRemove.forEach((key) => localStorage.removeItem(key));
}

/**
 * Clear expired caches to free up space
 */
function clearOldCaches(): void {
  const keys = Object.keys(CACHE_TTL) as CacheKey[];
  keys.forEach((key) => {
    try {
      const raw = localStorage.getItem(`${CACHE_PREFIX}${key}`);
      if (raw) {
        const entry = JSON.parse(raw);
        // Remove entries older than 1 hour regardless of TTL
        if (Date.now() - entry.timestamp > 60 * 60 * 1000) {
          localStorage.removeItem(`${CACHE_PREFIX}${key}`);
        }
      }
    } catch {
      localStorage.removeItem(`${CACHE_PREFIX}${key}`);
    }
  });
}

/**
 * Save auth session data with longer TTL
 */
export function saveSessionData(key: string, data: unknown): void {
  try {
    sessionStorage.setItem(`ecotec_session_${key}`, JSON.stringify({
      data,
      timestamp: Date.now(),
    }));
  } catch {
    // Session storage full
  }
}

/**
 * Get auth session data
 */
export function getSessionData<T>(key: string): T | null {
  try {
    const raw = sessionStorage.getItem(`ecotec_session_${key}`);
    if (!raw) return null;
    const entry = JSON.parse(raw);
    // Session data valid for 24 hours
    if (Date.now() - entry.timestamp > 24 * 60 * 60 * 1000) return null;
    return entry.data;
  } catch {
    return null;
  }
}

/**
 * Get cache stats (for debugging)
 */
export function getCacheStats(): Record<string, { size: number; age: string; shopId: string | null }> {
  const stats: Record<string, { size: number; age: string; shopId: string | null }> = {};
  const keys = Object.keys(CACHE_TTL) as CacheKey[];
  
  keys.forEach((key) => {
    const raw = localStorage.getItem(`${CACHE_PREFIX}${key}`);
    if (raw) {
      try {
        const entry = JSON.parse(raw);
        const ageMs = Date.now() - entry.timestamp;
        const ageMin = Math.round(ageMs / 60000);
        stats[key] = {
          size: raw.length,
          age: ageMin < 60 ? `${ageMin}m ago` : `${Math.round(ageMin / 60)}h ago`,
          shopId: entry.shopId,
        };
      } catch {
        stats[key] = { size: raw.length, age: 'corrupted', shopId: null };
      }
    }
  });
  
  return stats;
}
