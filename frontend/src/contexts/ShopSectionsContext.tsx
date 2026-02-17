import React, { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { useAuth } from './AuthContext';

// All available sections with their paths and display names
export interface SectionConfig {
  path: string;
  label: string;
  description: string;
  icon?: string;
  // Related paths that should also be hidden when this section is hidden
  relatedPaths?: string[];
}

// All configurable sections
export const ALL_SECTIONS: SectionConfig[] = [
  {
    path: '/',
    label: 'Dashboard',
    description: 'Main dashboard and overview',
    icon: '📊',
  },
  {
    path: '/invoices',
    label: 'Invoices',
    description: 'Invoice management and creation',
    relatedPaths: ['/invoices/create'],
    icon: '📄',
  },
  {
    path: '/job-notes',
    label: 'Job Notes',
    description: 'Job note tracking for repairs and services',
    relatedPaths: ['/job-notes/create'],
    icon: '🔧',
  },
  {
    path: '/products',
    label: 'All Products',
    description: 'View and manage product inventory',
    relatedPaths: ['/products/add', '/products/labels'],
    icon: '📦',
  },
  {
    path: '/categories',
    label: 'Categories',
    description: 'Product category management',
    icon: '🏷️',
  },
  {
    path: '/brands',
    label: 'Brands',
    description: 'Product brand management',
    icon: '🎨',
  },
  {
    path: '/services',
    label: 'All Services',
    description: 'View and manage service offerings',
    relatedPaths: ['/services/add'],
    icon: '⚙️',
  },
  {
    path: '/service-categories',
    label: 'Service Categories',
    description: 'Service category management',
    icon: '🔖',
  },
  {
    path: '/quotations',
    label: 'Quotations',
    description: 'Customer quotations',
    relatedPaths: ['/quotations/create'],
    icon: '💰',
  },
  {
    path: '/estimates',
    label: 'Estimates',
    description: 'Cost estimates for customers',
    relatedPaths: ['/estimates/create'],
    icon: '📋',
  },
  {
    path: '/warranties',
    label: 'Warranties',
    description: 'Warranty tracking and management',
    icon: '🛡️',
  },
  {
    path: '/customers',
    label: 'Customers',
    description: 'Customer database and management',
    icon: '👥',
  },
  {
    path: '/suppliers',
    label: 'Suppliers',
    description: 'Supplier management',
    icon: '🚚',
  },
  {
    path: '/grn',
    label: 'Goods Received Notes',
    description: 'Track incoming inventory',
    relatedPaths: ['/grn/create'],
    icon: '📥',
  },
  {
    path: '/cash-management/transactions',
    label: 'Transactions',
    description: 'View and manage financial transactions',
    icon: '💳',
  },
  {
    path: '/cash-management/accounts',
    label: 'Manage Accounts',
    description: 'Bank and cash account management',
    icon: '🏦',
  },
  {
    path: '/cash-management/insights',
    label: 'Financial Insights',
    description: 'Financial analytics and insights',
    icon: '📈',
  },
  {
    path: '/reports',
    label: 'Reports',
    description: 'Business analytics and reports',
    icon: '📊',
  },
  {
    path: '/pricing-proposals',
    label: 'Pricing Proposals',
    description: 'Pricing proposals and templates',
    icon: '💵',
  },
  {
    path: '/notes',
    label: 'Notes',
    description: 'Personal notes and reminders',
    icon: '📝',
  },
  {
    path: '/calendar',
    label: 'Calendar',
    description: 'Event and appointment calendar',
    icon: '📅',
  },
  {
    path: '/data-export',
    label: 'Data Export',
    description: 'Export business data',
    icon: '📤',
  },
  {
    path: '/settings',
    label: 'Settings',
    description: 'System settings and configuration',
    icon: '⚙️',
  },
];

interface ShopSectionsContextType {
  // Hidden section paths (SuperAdmin managed - affects ADMIN + USER)
  hiddenSections: string[];
  
  // Admin hidden section paths (Shop ADMIN managed - affects USER only)
  adminHiddenSections: string[];
  
  // Loading state
  isLoading: boolean;
  
  // Check if a path is hidden by SuperAdmin (completely hidden from ADMIN + USER)
  isSuperAdminHidden: (path: string) => boolean;
  
  // Check if a path is hidden by Shop ADMIN (hidden from USER only)
  isAdminHidden: (path: string) => boolean;
  
  // Check if a path is hidden for the current user
  isSectionHidden: (path: string) => boolean;
  
  // Update hidden sections (Super Admin only - affects everyone)
  updateHiddenSections: (sections: string[]) => Promise<void>;
  
  // Update admin hidden sections (Shop ADMIN - affects USER only)
  updateAdminHiddenSections: (sections: string[]) => Promise<void>;
  
  // Refresh from server
  refreshSections: () => Promise<void>;
  
  // Get all sections with visibility status
  getAllSections: () => (SectionConfig & { isHidden: boolean; isAdminHidden: boolean })[];
  
  // Get sections visible to Shop ADMIN (not hidden by SuperAdmin)
  getAdminVisibleSections: () => (SectionConfig & { isHidden: boolean })[];
}

const ShopSectionsContext = createContext<ShopSectionsContextType | undefined>(undefined);

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api/v1';

export const ShopSectionsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { user, viewingShop, isViewingShop, getAccessToken } = useAuth();
  const [hiddenSections, setHiddenSections] = useState<string[]>([]);
  const [adminHiddenSections, setAdminHiddenSections] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true); // Start with loading true to prevent flash
  const [hasInitialized, setHasInitialized] = useState(false);
  const [lastFetchedShopId, setLastFetchedShopId] = useState<string | null>(null);

  // Get effective shop ID (viewing shop for Super Admin, own shop otherwise)
  const effectiveShopId = isViewingShop && viewingShop ? viewingShop.id : user?.shop?.id;

  // Fetch hidden sections from API
  const fetchHiddenSections = useCallback(async (forceRefresh = false) => {
    const token = getAccessToken();
    console.log('🔍 Fetching hidden sections for shop:', effectiveShopId, 'token:', token ? 'present' : 'missing', 'forceRefresh:', forceRefresh);
    
    if (!effectiveShopId || !token) {
      console.log('⏭️ Skipping fetch - no shop or token');
      setHiddenSections([]);
      setAdminHiddenSections([]);
      setIsLoading(false);
      setHasInitialized(true);
      return;
    }

    // Skip if we already fetched for this shop (unless forcing refresh)
    if (!forceRefresh && hasInitialized && lastFetchedShopId === effectiveShopId) {
      console.log('⏭️ Already fetched for this shop, skipping');
      return;
    }

    setIsLoading(true);
    try {
      // Use standard shop fetch endpoint which includes full shop details
      const url = `${API_BASE_URL}/shops/${effectiveShopId}`;
      console.log('📡 [ShopSections] API_BASE_URL:', API_BASE_URL);
      console.log('📡 [ShopSections] Fetching sections from:', url);
      
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        // Use cache: 'no-store' to prevent caching instead of headers (avoids CORS preflight issues)
        cache: 'no-store',
      });

      if (response.ok) {
        const responseData = await response.json();
        const data = responseData.data; // Shop object is in .data
        console.log('📦 [ShopSections] API Response shop.id:', data.id);
        console.log('📦 [ShopSections] API Response shop.name:', data.name);
        console.log('📦 [ShopSections] hiddenSections:', data.hiddenSections);
        console.log('📦 [ShopSections] hiddenSections count:', data.hiddenSections?.length || 0);
        console.log('📦 [ShopSections] adminHiddenSections:', data.adminHiddenSections);
        console.log('📦 [ShopSections] adminHiddenSections count:', data.adminHiddenSections?.length || 0);
        setHiddenSections(data.hiddenSections || []);
        setAdminHiddenSections(data.adminHiddenSections || []);
        setLastFetchedShopId(effectiveShopId);
      } else {
        const errorData = await response.json().catch(() => ({}));
        console.warn('⚠️ [ShopSections] Failed to fetch - Status:', response.status, 'Error:', errorData);
        setHiddenSections([]);
        setAdminHiddenSections([]);
      }
    } catch (error) {
      console.warn('⚠️ Error fetching hidden sections:', error);
      setHiddenSections([]);
      setAdminHiddenSections([]);
    } finally {
      setIsLoading(false);
      setHasInitialized(true);
    }
  }, [effectiveShopId, getAccessToken, hasInitialized, lastFetchedShopId]);

  // Load sections when shop changes - use effectiveShopId directly to trigger re-fetch
  useEffect(() => {
    console.log('🔄 Shop changed, fetching sections. effectiveShopId:', effectiveShopId, 'lastFetchedShopId:', lastFetchedShopId);
    // Force refresh if shop changed
    if (effectiveShopId && effectiveShopId !== lastFetchedShopId) {
      fetchHiddenSections(true);
    } else if (effectiveShopId && !hasInitialized) {
      fetchHiddenSections(false);
    } else if (!effectiveShopId) {
      // No shop/auth - clear loading state so UI doesn't hang on login page
      setHiddenSections([]);
      setAdminHiddenSections([]);
      setIsLoading(false);
      setHasInitialized(true);
    }
  }, [effectiveShopId, lastFetchedShopId, hasInitialized, fetchHiddenSections]);

  // Helper to check if path matches any in a list (including related paths)
  const isPathInList = useCallback((path: string, list: string[]): boolean => {
    // Direct match
    if (list.includes(path)) {
      return true;
    }

    // Check if path starts with a hidden section
    for (const hiddenPath of list) {
      if (path.startsWith(hiddenPath + '/')) {
        return true;
      }
    }

    // Check related paths
    for (const section of ALL_SECTIONS) {
      if (list.includes(section.path)) {
        if (section.relatedPaths?.some(rp => path === rp || path.startsWith(rp + '/'))) {
          return true;
        }
      }
    }

    return false;
  }, []);

  // Check if a section is hidden by SuperAdmin (hidden from ADMIN + USER)
  const isSuperAdminHidden = useCallback((path: string): boolean => {
    return isPathInList(path, hiddenSections);
  }, [hiddenSections, isPathInList]);

  // Check if a section is hidden by Shop ADMIN (hidden from USER only)
  const isAdminHidden = useCallback((path: string): boolean => {
    return isPathInList(path, adminHiddenSections);
  }, [adminHiddenSections, isPathInList]);

  // Check if a path is hidden for the CURRENT USER based on their role
  const isSectionHidden = useCallback((path: string): boolean => {
    // SuperAdmin: See everything, nothing is hidden
    if (user?.role === 'SUPER_ADMIN') {
      return false;
    }
    
    // Shop ADMIN: Only SuperAdmin hidden sections are hidden
    if (user?.role === 'ADMIN') {
      return isSuperAdminHidden(path);
    }
    
    // Regular USER: Both SuperAdmin AND Admin hidden sections are hidden
    return isSuperAdminHidden(path) || isAdminHidden(path);
  }, [user?.role, isSuperAdminHidden, isAdminHidden]);

  // Update hidden sections (Super Admin only - affects ADMIN + USER)
  const updateHiddenSections = useCallback(async (sections: string[]): Promise<void> => {
    const token = getAccessToken();
    console.log('🔧 Updating SuperAdmin sections. ShopId:', effectiveShopId, 'Sections:', sections);
    
    if (!effectiveShopId || !token) {
      throw new Error('No shop selected');
    }

    if (user?.role !== 'SUPER_ADMIN') {
      throw new Error('Only Super Admin can update section visibility');
    }

    setIsLoading(true);
    try {
      // Use standard shop update endpoint instead of dedicated sections endpoint
      const url = `${API_BASE_URL}/shops/${effectiveShopId}`;
      console.log('📡 Updating SuperAdmin sections via:', url);
      
      const response = await fetch(url, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ hiddenSections: sections }),
      });

      if (!response.ok) {
        const error = await response.json();
        console.error('❌ Failed to update sections:', error);
        throw new Error(error.message || error.error || 'Failed to update sections');
      }

      // Backend returns full shop object in data property
      const responseData = await response.json();
      const updatedData = responseData.data;
      
      console.log('✅ Updated SuperAdmin hidden sections. New state:', updatedData.hiddenSections);
      setHiddenSections(updatedData.hiddenSections || []);
    } finally {
      setIsLoading(false);
    }
  }, [effectiveShopId, getAccessToken, user?.role]);

  // Update admin hidden sections (Shop ADMIN - affects USER only)
  const updateAdminHiddenSections = useCallback(async (sections: string[]): Promise<void> => {
    const token = getAccessToken();
    console.log('🔧 Updating Admin sections. ShopId:', effectiveShopId, 'Sections:', sections);
    
    if (!effectiveShopId || !token) {
      throw new Error('No shop selected');
    }

    if (user?.role !== 'ADMIN' && user?.role !== 'SUPER_ADMIN') {
      throw new Error('Only Shop Admin can update user section visibility');
    }

    setIsLoading(true);
    try {
      // Use standard shop update endpoint instead of dedicated sections endpoint
      const url = `${API_BASE_URL}/shops/${effectiveShopId}`;
      console.log('📡 Updating Admin sections via:', url);

      const response = await fetch(url, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ adminHiddenSections: sections }),
      });

      if (!response.ok) {
        const error = await response.json();
        console.error('❌ Failed to update admin sections:', error);
        throw new Error(error.message || error.error || 'Failed to update admin sections');
      }

      // Backend returns full shop object in data property
      const responseData = await response.json();
      const updatedData = responseData.data;
      
      console.log('✅ Updated Admin hidden sections. New state:', updatedData.adminHiddenSections);
      setAdminHiddenSections(updatedData.adminHiddenSections || []);
    } finally {
      setIsLoading(false);
    }
  }, [effectiveShopId, getAccessToken, user?.role]);

  // Get all sections with visibility status (for SuperAdmin view)
  const getAllSections = useCallback(() => {
    return ALL_SECTIONS.map(section => ({
      ...section,
      isHidden: hiddenSections.includes(section.path),
      isAdminHidden: adminHiddenSections.includes(section.path),
    }));
  }, [hiddenSections, adminHiddenSections]);

  // Get sections visible to Shop ADMIN (only those NOT hidden by SuperAdmin)
  // This is what ADMIN sees in their Sections tab
  const getAdminVisibleSections = useCallback(() => {
    return ALL_SECTIONS
      .filter(section => !hiddenSections.includes(section.path))
      .map(section => ({
        ...section,
        isHidden: adminHiddenSections.includes(section.path),
      }));
  }, [hiddenSections, adminHiddenSections]);

  return (
    <ShopSectionsContext.Provider
      value={{
        hiddenSections,
        adminHiddenSections,
        isLoading,
        isSuperAdminHidden,
        isAdminHidden,
        isSectionHidden,
        updateHiddenSections,
        updateAdminHiddenSections,
        refreshSections: () => fetchHiddenSections(true), // Force refresh when called manually
        getAllSections,
        getAdminVisibleSections,
      }}
    >
      {children}
    </ShopSectionsContext.Provider>
  );
};

export const useShopSections = () => {
  const context = useContext(ShopSectionsContext);
  if (!context) {
    throw new Error('useShopSections must be used within ShopSectionsProvider');
  }
  return context;
};
