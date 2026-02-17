/**
 * Authenticated Fetch Utility
 * Wraps native fetch() with automatic token refresh on 401 errors
 * All services using raw fetch() should use this instead
 * 
 * Features:
 * - Automatic access token injection
 * - 401 → token refresh → retry (same as axios interceptor)
 * - Request queuing during refresh (prevents multiple refresh calls)
 * - Forced logout when refresh fails
 * - Handles response parsing and error extraction
 */

import {
  getAccessToken,
  setAccessToken,
  setRefreshToken,
  setCachedUser,
  authService,
} from '../services/authService';

// Flag to prevent multiple simultaneous refresh attempts
let isRefreshing = false;

// Queue of requests waiting for token refresh
let refreshQueue: Array<{
  resolve: (token: string) => void;
  reject: (error: Error) => void;
}> = [];

const processQueue = (error: Error | null, token: string | null = null): void => {
  refreshQueue.forEach((promise) => {
    if (error) {
      promise.reject(error);
    } else if (token) {
      promise.resolve(token);
    }
  });
  refreshQueue = [];
};

/**
 * Force logout - clears all auth state and dispatches event
 */
export function forceLogout(reason: string = 'session_expired'): void {
  setAccessToken(null);
  setRefreshToken(null);
  setCachedUser(null);
  
  // Clear persistent data caches
  try {
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith('ecotec_cache_')) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach((key) => localStorage.removeItem(key));
  } catch { /* ignore */ }
  
  // Dispatch logout event for AuthContext
  window.dispatchEvent(new CustomEvent('auth:logout', {
    detail: { reason },
  }));
}

/**
 * Get auth headers with current access token
 */
// Re-export getAccessToken for services that need the raw token (e.g., URL builders)
export { getAccessToken };

export function getAuthHeaders(): Record<string, string> {
  const token = getAccessToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

/**
 * Authenticated fetch with automatic token refresh
 * Drop-in replacement for fetch() in services
 */
export async function fetchWithAuth(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  // Inject auth headers
  const token = getAccessToken();
  const headers = new Headers(options.headers || {});
  
  if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }
  
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(url, { ...options, headers });

  // If not 401, return as-is
  if (response.status !== 401) {
    return response;
  }

  // Got 401 — try to refresh token
  // Don't retry refresh or login endpoints
  if (url.includes('/auth/refresh') || url.includes('/auth/login')) {
    return response;
  }

  // If already refreshing, queue this request
  if (isRefreshing) {
    return new Promise<Response>((resolve, reject) => {
      refreshQueue.push({
        resolve: async (newToken: string) => {
          try {
            headers.set('Authorization', `Bearer ${newToken}`);
            const retryResponse = await fetch(url, { ...options, headers });
            resolve(retryResponse);
          } catch (err) {
            reject(err);
          }
        },
        reject: (err: Error) => reject(err),
      });
    });
  }

  // Start refresh
  isRefreshing = true;

  try {
    const refreshResponse = await authService.refresh();
    const newToken = refreshResponse.data.accessToken;

    // Process queued requests
    processQueue(null, newToken);

    // Retry original request with new token
    headers.set('Authorization', `Bearer ${newToken}`);
    return await fetch(url, { ...options, headers });
  } catch (refreshError) {
    // Refresh failed — force logout
    processQueue(refreshError as Error, null);
    forceLogout('token_refresh_failed');
    
    // Return the original 401 response
    return response;
  } finally {
    isRefreshing = false;
  }
}

/**
 * Handle response - parse JSON and throw on error
 * Includes 401 detection for forced logout
 */
export async function handleAuthResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    // If still 401 after refresh attempt, the forceLogout was already called
    if (response.status === 401) {
      const error = await response.json().catch(() => ({ message: 'Access token has expired' }));
      throw new Error(error.message || 'Unauthorized');
    }
    
    const error = await response.json().catch(() => ({ message: 'Network error' }));
    throw new Error(error.message || `HTTP error! status: ${response.status}`);
  }
  return response.json();
}
