/**
 * Authentication Service
 * Handles all auth-related API calls with automatic token refresh
 */

import axios from 'axios';
import type { AxiosInstance, InternalAxiosRequestConfig, AxiosError, AxiosResponse } from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api/v1';

// ===================================
// Type Definitions
// ===================================

export interface User {
  id: string;
  email: string;
  name: string;
  role: 'SUPER_ADMIN' | 'ADMIN' | 'MANAGER' | 'STAFF';
  shop?: {
    id: string;
    name: string;
    slug: string;
    logo?: string;
    email?: string | null;
    phone?: string | null;
    address?: string | null;
    website?: string | null;
  } | null;
}

export interface AuthResponse {
  success: boolean;
  message: string;
  data: {
    user: User;
    accessToken: string;
    refreshToken?: string; // Also returned in body for cookie fallback
  };
}

export interface RefreshResponse {
  success: boolean;
  message: string;
  data: {
    user: User;
    accessToken: string;
    refreshToken?: string; // Also returned in body for cookie fallback
  };
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  email: string;
  password: string;
  name: string;
  shopSlug?: string;
}

export interface ApiError {
  success: false;
  message: string;
  code?: string;
}

// ===================================
// Token Management (In-Memory Storage)
// ===================================

// Store access token in memory only (more secure than localStorage)
let accessToken: string | null = null;

// Refresh token fallback storage key (for environments where cookies don't work)
const REFRESH_TOKEN_KEY = 'eco_refresh_token';

// Callback to notify when token changes (for React state sync)
let tokenChangeCallback: ((token: string | null) => void) | null = null;

export const setAccessToken = (token: string | null): void => {
  accessToken = token;
  if (tokenChangeCallback) {
    tokenChangeCallback(token);
  }
};

export const getAccessToken = (): string | null => accessToken;

// Refresh token fallback for development/mobile
export const setRefreshToken = (token: string | null): void => {
  if (token) {
    localStorage.setItem(REFRESH_TOKEN_KEY, token);
  } else {
    localStorage.removeItem(REFRESH_TOKEN_KEY);
  }
};

export const getRefreshToken = (): string | null => {
  return localStorage.getItem(REFRESH_TOKEN_KEY);
};

export const onTokenChange = (callback: (token: string | null) => void): void => {
  tokenChangeCallback = callback;
};

// ===================================
// Axios Instance with Interceptors
// ===================================

// Create axios instance with default config
export const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true, // Important: Send cookies with requests
  headers: {
    'Content-Type': 'application/json',
  },
});

// Flag to prevent multiple simultaneous refresh attempts
let isRefreshing = false;

// Queue of failed requests to retry after token refresh
let failedQueue: Array<{
  resolve: (token: string) => void;
  reject: (error: Error) => void;
}> = [];

const processQueue = (error: Error | null, token: string | null = null): void => {
  failedQueue.forEach((promise) => {
    if (error) {
      promise.reject(error);
    } else if (token) {
      promise.resolve(token);
    }
  });
  failedQueue = [];
};

// Request interceptor - Attach access token to every request
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig): InternalAxiosRequestConfig => {
    if (accessToken && config.headers) {
      config.headers.Authorization = `Bearer ${accessToken}`;
    }
    return config;
  },
  (error: AxiosError) => Promise.reject(error)
);

// Response interceptor - Handle 401 errors, refresh token, and 503 retries
apiClient.interceptors.response.use(
  (response: AxiosResponse) => response,
  async (error: AxiosError<ApiError>) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean; _retryCount?: number };
    
    // Handle 502/503 (Render cold start) - retry with backoff
    if (
      (error.response?.status === 503 || error.response?.status === 502) &&
      !originalRequest.url?.includes('/auth/refresh') && // restoreSession handles its own retries
      (originalRequest._retryCount || 0) < 2
    ) {
      originalRequest._retryCount = (originalRequest._retryCount || 0) + 1;
      const delay = 2000 * originalRequest._retryCount;
      console.log(`⏳ Server waking up (${error.response?.status})... retrying in ${delay / 1000}s`);
      await new Promise(resolve => setTimeout(resolve, delay));
      return apiClient(originalRequest);
    }
    
    // Check if it's a 401 error and not a refresh request itself
    if (
      error.response?.status === 401 &&
      !originalRequest._retry &&
      !originalRequest.url?.includes('/auth/refresh') &&
      !originalRequest.url?.includes('/auth/login')
    ) {
      // Check the error code to determine if we should refresh
      const errorCode = error.response?.data?.code;
      
      // Only refresh if token is expired, not for other auth errors
      if (errorCode === 'TOKEN_EXPIRED' || !errorCode) {
        if (isRefreshing) {
          // If already refreshing, queue this request
          return new Promise((resolve, reject) => {
            failedQueue.push({ resolve, reject });
          })
            .then((token) => {
              if (originalRequest.headers) {
                originalRequest.headers.Authorization = `Bearer ${token}`;
              }
              return apiClient(originalRequest);
            })
            .catch((err) => Promise.reject(err));
        }

        originalRequest._retry = true;
        isRefreshing = true;

        try {
          // Attempt to refresh the token
          const response = await authService.refresh();
          const newToken = response.data.accessToken;
          
          // Update the stored token
          setAccessToken(newToken);
          
          // Process queued requests
          processQueue(null, newToken);
          
          // Retry the original request
          if (originalRequest.headers) {
            originalRequest.headers.Authorization = `Bearer ${newToken}`;
          }
          return apiClient(originalRequest);
        } catch (refreshError) {
          // Refresh failed - clear token and redirect to login
          processQueue(refreshError as Error, null);
          setAccessToken(null);
          
          // Dispatch custom event for auth context to handle
          window.dispatchEvent(new CustomEvent('auth:logout', { 
            detail: { reason: 'session_expired' } 
          }));
          
          return Promise.reject(refreshError);
        } finally {
          isRefreshing = false;
        }
      }
    }
    
    return Promise.reject(error);
  }
);

// ===================================
// Auth Service Methods
// ===================================

export const authService = {
  /**
   * Register a new user
   */
  register: async (data: RegisterData): Promise<AuthResponse> => {
    const response = await apiClient.post<AuthResponse>('/auth/register', data);
    const { accessToken: token, refreshToken } = response.data.data;
    setAccessToken(token);
    if (refreshToken) setRefreshToken(refreshToken);
    return response.data;
  },

  /**
   * Login user
   */
  login: async (credentials: LoginCredentials): Promise<AuthResponse> => {
    const response = await apiClient.post<AuthResponse>('/auth/login', credentials);
    const { accessToken: token, refreshToken } = response.data.data;
    setAccessToken(token);
    if (refreshToken) setRefreshToken(refreshToken);
    return response.data;
  },

  /**
   * Refresh access token using refresh token cookie (with localStorage fallback)
   */
  refresh: async (): Promise<RefreshResponse> => {
    // Send refresh token in body as fallback for cookie issues
    const storedRefreshToken = getRefreshToken();
    const response = await apiClient.post<RefreshResponse>('/auth/refresh', {
      refreshToken: storedRefreshToken,
    });
    const { accessToken: token, refreshToken } = response.data.data;
    setAccessToken(token);
    if (refreshToken) setRefreshToken(refreshToken);
    return response.data;
  },

  /**
   * Logout user (revokes refresh token)
   */
  logout: async (): Promise<void> => {
    try {
      await apiClient.post('/auth/logout');
    } finally {
      setAccessToken(null);
      setRefreshToken(null);
    }
  },

  /**
   * Logout from all devices
   */
  logoutAll: async (): Promise<void> => {
    try {
      await apiClient.post('/auth/logout-all');
    } finally {
      setAccessToken(null);
      setRefreshToken(null);
    }
  },

  /**
   * Get current user profile
   */
  getMe: async (): Promise<{ success: boolean; data: { user: User } }> => {
    const response = await apiClient.get('/auth/me');
    return response.data;
  },

  /**
   * Update current user profile
   */
  updateProfile: async (data: { name?: string; email?: string }): Promise<{ success: boolean; data: { user: User } }> => {
    const response = await apiClient.put('/auth/me', data);
    return response.data;
  },

  /**
   * Change password
   */
  changePassword: async (data: { currentPassword: string; newPassword: string }): Promise<{ success: boolean; message: string }> => {
    const response = await apiClient.put('/auth/password', data);
    setAccessToken(null); // Force re-login after password change
    return response.data;
  },

  /**
   * Check if user is authenticated (has valid token)
   */
  isAuthenticated: (): boolean => {
    return accessToken !== null;
  },

  /**
   * Try to restore session on app load
   * Uses refresh token cookie to get new access token
   * Retries with exponential backoff for 503/network errors (Render cold start)
   */
  restoreSession: async (): Promise<User | null> => {
    const maxRetries = 3;
    const baseDelay = 2000; // 2s, 4s, 8s

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const response = await authService.refresh();
        return response.data.user;
      } catch (error: unknown) {
        const axiosErr = error as { response?: { status?: number }; code?: string };
        const status = axiosErr?.response?.status;
        const isRetryable = status === 503 || status === 502 || !axiosErr?.response; // 503, 502, or network error

        if (isRetryable && attempt < maxRetries) {
          const delay = baseDelay * Math.pow(2, attempt);
          console.log(`⏳ Server waking up... retrying in ${delay / 1000}s (attempt ${attempt + 1}/${maxRetries})`);
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }

        // Non-retryable error or max retries exhausted
        return null;
      }
    }
    return null;
  },
};

export default authService;
