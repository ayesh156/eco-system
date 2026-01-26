/**
 * Authentication Service
 * Handles all auth-related API calls with automatic token refresh
 */

import axios from 'axios';
import type { AxiosInstance, InternalAxiosRequestConfig, AxiosError, AxiosResponse } from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1';

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

// Response interceptor - Handle 401 errors and refresh token
apiClient.interceptors.response.use(
  (response: AxiosResponse) => response,
  async (error: AxiosError<ApiError>) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };
    
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
   */
  restoreSession: async (): Promise<User | null> => {
    try {
      const response = await authService.refresh();
      return response.data.user;
    } catch {
      return null;
    }
  },
};

export default authService;
