import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { ReactNode } from 'react';
import { 
  authService,
  onTokenChange,
  getAccessToken,
  setAccessToken,
} from '../services/authService';
import type { 
  User, 
  LoginCredentials, 
  RegisterData,
} from '../services/authService';

// ===================================
// Type Definitions
// ===================================

// Shop info for viewing mode
interface ViewingShop {
  id: string;
  name: string;
  slug: string;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  website?: string | null;
  logo?: string | null;
  currency?: string;
  taxRate?: number;
  businessRegNo?: string | null;
}

interface AuthContextType {
  // State
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  hasShop: boolean; // Whether user has an associated shop
  
  // Shop Viewing (SUPER_ADMIN only)
  viewingShop: ViewingShop | null; // The shop being viewed by SUPER_ADMIN
  isViewingShop: boolean; // Whether SUPER_ADMIN is viewing another shop
  
  // Actions
  login: (credentials: LoginCredentials) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => Promise<void>;
  logoutAll: () => Promise<void>;
  updateProfile: (data: { name?: string; email?: string }) => Promise<void>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
  clearError: () => void;
  refreshUser: () => Promise<void>;
  getAccessToken: () => string | null;
  
  // Shop Viewing Actions (SUPER_ADMIN only)
  setViewingShop: (shop: ViewingShop | null) => void;
  exitViewingShop: () => void;
}

interface AuthProviderProps {
  children: ReactNode;
}

// ===================================
// Context Creation
// ===================================

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// ===================================
// Auth Provider Component
// ===================================

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true); // Start true for initial session check
  const [error, setError] = useState<string | null>(null);
  const [viewingShop, setViewingShopState] = useState<ViewingShop | null>(null);

  // Computed property
  const isAuthenticated = user !== null && getAccessToken() !== null;
  const hasShop = user?.shop !== null && user?.shop !== undefined;
  const isViewingShop = viewingShop !== null && user?.role === 'SUPER_ADMIN';

  // Set viewing shop (SUPER_ADMIN only)
  const setViewingShop = useCallback((shop: ViewingShop | null) => {
    if (user?.role === 'SUPER_ADMIN') {
      setViewingShopState(shop);
      if (shop) {
        // Store in sessionStorage so it persists during navigation
        sessionStorage.setItem('viewingShop', JSON.stringify(shop));
      } else {
        sessionStorage.removeItem('viewingShop');
      }
    }
  }, [user?.role]);

  // Exit viewing shop mode
  const exitViewingShop = useCallback(() => {
    setViewingShopState(null);
    sessionStorage.removeItem('viewingShop');
  }, []);

  // Clear error
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Handle logout event (from interceptor when session expires)
  useEffect(() => {
    const handleLogoutEvent = (event: CustomEvent<{ reason: string }>) => {
      console.log('🔒 Session expired, logging out...', event.detail.reason);
      setUser(null);
      setAccessToken(null);
    };

    window.addEventListener('auth:logout', handleLogoutEvent as EventListener);
    return () => {
      window.removeEventListener('auth:logout', handleLogoutEvent as EventListener);
    };
  }, []);

  // Sync token changes with state
  useEffect(() => {
    onTokenChange((token) => {
      if (!token) {
        // Token cleared, but don't clear user yet (might be refreshing)
        console.log('🔑 Access token cleared');
      }
    });
  }, []);

  // Try to restore session on mount
  useEffect(() => {
    const restoreSession = async () => {
      try {
        console.log('🔄 Attempting to restore session...');
        const restoredUser = await authService.restoreSession();
        if (restoredUser) {
          setUser(restoredUser);
          console.log('✅ Session restored for:', restoredUser.email);
          
          // Restore viewing shop for SUPER_ADMIN
          if (restoredUser.role === 'SUPER_ADMIN') {
            const savedViewingShop = sessionStorage.getItem('viewingShop');
            if (savedViewingShop) {
              try {
                setViewingShopState(JSON.parse(savedViewingShop));
                console.log('✅ Viewing shop restored');
              } catch {
                sessionStorage.removeItem('viewingShop');
              }
            }
          }
        } else {
          console.log('ℹ️ No active session');
        }
      } catch (err) {
        console.log('ℹ️ No valid session found');
      } finally {
        setIsLoading(false);
      }
    };

    restoreSession();
  }, []);

  // Login
  const login = useCallback(async (credentials: LoginCredentials) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await authService.login(credentials);
      setUser(response.data.user);
      console.log('✅ Login successful:', response.data.user.email);
    } catch (err: unknown) {
      const message = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Login failed. Please try again.';
      setError(message);
      throw new Error(message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Register
  const register = useCallback(async (data: RegisterData) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await authService.register(data);
      setUser(response.data.user);
      console.log('✅ Registration successful:', response.data.user.email);
    } catch (err: unknown) {
      const message = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Registration failed. Please try again.';
      setError(message);
      throw new Error(message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Logout
  const logout = useCallback(async () => {
    setIsLoading(true);
    try {
      await authService.logout();
      console.log('✅ Logout successful');
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      setUser(null);
      setViewingShopState(null);
      sessionStorage.removeItem('viewingShop');
      setIsLoading(false);
    }
  }, []);

  // Logout from all devices
  const logoutAll = useCallback(async () => {
    setIsLoading(true);
    try {
      await authService.logoutAll();
      console.log('✅ Logged out from all devices');
    } catch (err) {
      console.error('Logout all error:', err);
    } finally {
      setUser(null);
      setViewingShopState(null);
      sessionStorage.removeItem('viewingShop');
      setIsLoading(false);
    }
  }, []);

  // Update profile
  const updateProfile = useCallback(async (data: { name?: string; email?: string }) => {
    setError(null);
    try {
      const response = await authService.updateProfile(data);
      setUser(response.data.user);
      console.log('✅ Profile updated');
    } catch (err: unknown) {
      const message = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Profile update failed.';
      setError(message);
      throw new Error(message);
    }
  }, []);

  // Change password
  const changePassword = useCallback(async (currentPassword: string, newPassword: string) => {
    setError(null);
    try {
      await authService.changePassword({ currentPassword, newPassword });
      setUser(null); // Force re-login
      console.log('✅ Password changed, please login again');
    } catch (err: unknown) {
      const message = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Password change failed.';
      setError(message);
      throw new Error(message);
    }
  }, []);

  // Refresh user data
  const refreshUser = useCallback(async () => {
    try {
      const response = await authService.getMe();
      setUser(response.data.user);
    } catch (err) {
      console.error('Failed to refresh user:', err);
    }
  }, []);

  const value: AuthContextType = {
    user,
    isAuthenticated,
    isLoading,
    error,
    hasShop,
    viewingShop,
    isViewingShop,
    login,
    register,
    logout,
    logoutAll,
    updateProfile,
    changePassword,
    clearError,
    refreshUser,
    getAccessToken,
    setViewingShop,
    exitViewingShop,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

// ===================================
// Custom Hook
// ===================================

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// ===================================
// Higher-Order Component for Protected Routes
// ===================================

interface ProtectedRouteProps {
  children: ReactNode;
  requiredRoles?: Array<'SUPER_ADMIN' | 'ADMIN' | 'MANAGER' | 'STAFF'>;
  fallback?: ReactNode;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ 
  children, 
  requiredRoles,
  fallback 
}) => {
  const { isAuthenticated, isLoading, user, hasShop } = useAuth();

  // Show loading spinner while checking auth
  if (isLoading) {
    return fallback || (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 text-emerald-400">
            <svg className="animate-spin" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          </div>
          <p className="text-slate-400">Loading...</p>
        </div>
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    // Use window.location for full page redirect to login
    window.location.href = '/login';
    return null;
  }

  // Redirect to shop setup if user doesn't have a shop
  if (!hasShop && window.location.pathname !== '/shop-setup') {
    window.location.href = '/shop-setup';
    return null;
  }

  // Check role-based access
  if (requiredRoles && user && !requiredRoles.includes(user.role)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <div className="text-center">
          <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-red-500/20 flex items-center justify-center">
            <svg className="w-10 h-10 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Access Denied</h2>
          <p className="text-slate-400">You don't have permission to access this page.</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

export default AuthContext;
