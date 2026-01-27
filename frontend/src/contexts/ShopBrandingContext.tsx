import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { ReactNode } from 'react';
import { useAuth } from './AuthContext';

// ===================================
// Type Definitions
// ===================================

export interface ShopBranding {
  id: string;
  name: string;
  subName?: string; // e.g., "SOLUTIONS" under "ECOTEC COMPUTER"
  logo?: string; // URL or base64 data
  address?: string;
  phone?: string;
  email?: string;
  website?: string;
  tagline?: string; // e.g., "Computer Solutions"
}

interface ShopBrandingContextType {
  branding: ShopBranding;
  isLoading: boolean;
  error: string | null;
  updateBranding: (updates: Partial<ShopBranding>) => void;
  saveBranding: () => Promise<void>;
  setLogo: (logoUrl: string | undefined) => void;
  clearError: () => void;
  hasUnsavedChanges: boolean;
}

interface ShopBrandingProviderProps {
  children: ReactNode;
}

// Default branding values
const DEFAULT_BRANDING: ShopBranding = {
  id: '',
  name: 'ECOTEC COMPUTER',
  subName: 'SOLUTIONS',
  logo: undefined,
  address: 'No.14, Mulatiyana junction, Mulatiyana, Matara.',
  phone: '0711453111',
  email: 'ecoteccomputersolutions@gmail.com',
  website: '',
  tagline: 'Computer Solutions',
};

// ===================================
// Context Creation
// ===================================

const ShopBrandingContext = createContext<ShopBrandingContextType | undefined>(undefined);

// ===================================
// API Functions
// ===================================

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api/v1';

async function fetchShopBranding(shopId: string, token: string): Promise<ShopBranding> {
  const response = await fetch(`${API_BASE_URL}/shops/${shopId}`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error('Failed to fetch shop branding');
  }

  const data = await response.json();
  const shop = data.data;

  return {
    id: shop.id,
    name: shop.name || DEFAULT_BRANDING.name,
    subName: shop.subName || DEFAULT_BRANDING.subName,
    logo: shop.logo || undefined,
    address: shop.address || DEFAULT_BRANDING.address,
    phone: shop.phone || DEFAULT_BRANDING.phone,
    email: shop.email || DEFAULT_BRANDING.email,
    website: shop.website || '',
    tagline: shop.tagline || DEFAULT_BRANDING.tagline,
  };
}

async function updateShopBranding(
  shopId: string,
  branding: Partial<ShopBranding>,
  token: string
): Promise<ShopBranding> {
  const response = await fetch(`${API_BASE_URL}/shops/${shopId}`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name: branding.name,
      subName: branding.subName,
      tagline: branding.tagline,
      logo: branding.logo,
      address: branding.address,
      phone: branding.phone,
      email: branding.email,
      website: branding.website,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to update shop branding');
  }

  const data = await response.json();
  const shop = data.data;

  return {
    id: shop.id,
    name: shop.name || DEFAULT_BRANDING.name,
    subName: shop.subName || DEFAULT_BRANDING.subName,
    logo: shop.logo || undefined,
    address: shop.address || DEFAULT_BRANDING.address,
    phone: shop.phone || DEFAULT_BRANDING.phone,
    email: shop.email || DEFAULT_BRANDING.email,
    website: shop.website || '',
    tagline: shop.tagline || DEFAULT_BRANDING.tagline,
  };
}

// ===================================
// Provider Component
// ===================================

export const ShopBrandingProvider: React.FC<ShopBrandingProviderProps> = ({ children }) => {
  const { user, getAccessToken, isViewingShop, viewingShop } = useAuth();
  const [branding, setBranding] = useState<ShopBranding>(DEFAULT_BRANDING);
  const [originalBranding, setOriginalBranding] = useState<ShopBranding>(DEFAULT_BRANDING);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Check for unsaved changes
  const hasUnsavedChanges = JSON.stringify(branding) !== JSON.stringify(originalBranding);
  
  // Get effective shop ID - for SUPER_ADMIN viewing a shop, use viewingShop.id
  const effectiveShopId = isViewingShop && viewingShop ? viewingShop.id : user?.shop?.id;

  // Fetch branding on mount when user has a shop or SUPER_ADMIN is viewing a shop
  useEffect(() => {
    const loadBranding = async () => {
      const shopId = effectiveShopId;
      const token = getAccessToken();

      if (!shopId || !token) {
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const fetchedBranding = await fetchShopBranding(shopId, token);
        setBranding(fetchedBranding);
        setOriginalBranding(fetchedBranding);
      } catch (err) {
        console.error('Error loading shop branding:', err);
        // Don't show error to user, just use defaults
      } finally {
        setIsLoading(false);
      }
    };

    loadBranding();
  }, [effectiveShopId, getAccessToken]);

  // Update branding locally
  const updateBranding = useCallback((updates: Partial<ShopBranding>) => {
    setBranding((prev) => ({ ...prev, ...updates }));
  }, []);

  // Set logo specifically
  const setLogo = useCallback((logoUrl: string | undefined) => {
    setBranding((prev) => ({ ...prev, logo: logoUrl }));
  }, []);

  // Save branding to server
  const saveBranding = useCallback(async () => {
    const shopId = effectiveShopId;
    const token = getAccessToken();

    if (!shopId || !token) {
      setError('No shop found. Please set up your shop first.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const updatedBranding = await updateShopBranding(shopId, branding, token);
      setBranding(updatedBranding);
      setOriginalBranding(updatedBranding);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to save branding';
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [effectiveShopId, getAccessToken, branding]);

  // Clear error
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return (
    <ShopBrandingContext.Provider
      value={{
        branding,
        isLoading,
        error,
        updateBranding,
        saveBranding,
        setLogo,
        clearError,
        hasUnsavedChanges,
      }}
    >
      {children}
    </ShopBrandingContext.Provider>
  );
};

// ===================================
// Custom Hook
// ===================================

export const useShopBranding = (): ShopBrandingContextType => {
  const context = useContext(ShopBrandingContext);
  if (context === undefined) {
    throw new Error('useShopBranding must be used within a ShopBrandingProvider');
  }
  return context;
};

export default ShopBrandingContext;
