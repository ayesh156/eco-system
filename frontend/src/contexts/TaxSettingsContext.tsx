import React, { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { useAuth } from './AuthContext';

interface TaxSettings {
  enabled: boolean;
  defaultPercentage: number;
}

interface TaxSettingsContextType {
  settings: TaxSettings;
  updateSettings: (settings: Partial<TaxSettings>) => void;
  saveSettings: () => Promise<void>;
  currentShopId: string | null;
}

const TaxSettingsContext = createContext<TaxSettingsContextType | undefined>(undefined);

const DEFAULT_TAX_SETTINGS: TaxSettings = {
  enabled: true,
  defaultPercentage: 8,
};

// Helper to get storage key for a shop
const getStorageKey = (shopId: string | null) => {
  return shopId ? `taxSettings_${shopId}` : 'taxSettings';
};

export const TaxSettingsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { user, isViewingShop, viewingShop } = useAuth();
  const [settings, setSettings] = useState<TaxSettings>(DEFAULT_TAX_SETTINGS);
  
  // Get effective shop ID (viewed shop for SUPER_ADMIN, or user's own shop)
  const effectiveShopId = isViewingShop && viewingShop ? viewingShop.id : user?.shop?.id || null;

  // Load settings from localStorage when shop changes
  useEffect(() => {
    const loadSettings = () => {
      try {
        const storageKey = getStorageKey(effectiveShopId);
        const stored = localStorage.getItem(storageKey);
        if (stored) {
          const parsed = JSON.parse(stored);
          setSettings(parsed);
          console.log(`✅ Tax settings loaded for shop ${effectiveShopId}:`, parsed);
        } else {
          // Reset to defaults when switching to a shop without saved settings
          setSettings(DEFAULT_TAX_SETTINGS);
          console.log(`📝 Using default tax settings for shop ${effectiveShopId}`);
        }
      } catch (error) {
        console.error('❌ Failed to load tax settings:', error);
        setSettings(DEFAULT_TAX_SETTINGS);
      }
    };

    loadSettings();
  }, [effectiveShopId]);

  const updateSettings = (newSettings: Partial<TaxSettings>) => {
    setSettings(prev => {
      const updated = { ...prev, ...newSettings };
      console.log('📝 Tax settings updated:', updated);
      return updated;
    });
  };

  const saveSettings = async (): Promise<void> => {
    try {
      const storageKey = getStorageKey(effectiveShopId);
      localStorage.setItem(storageKey, JSON.stringify(settings));
      console.log(`💾 Tax settings saved for shop ${effectiveShopId}:`, settings);
      
      // TODO: Save to API when backend is ready
      // await fetch('/api/v1/settings/tax', {
      //   method: 'PUT',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(settings),
      // });
      
    } catch (error) {
      console.error('❌ Failed to save tax settings:', error);
      throw error;
    }
  };

  return (
    <TaxSettingsContext.Provider value={{ settings, updateSettings, saveSettings, currentShopId: effectiveShopId }}>
      {children}
    </TaxSettingsContext.Provider>
  );
};

export const useTaxSettings = (): TaxSettingsContextType => {
  const context = useContext(TaxSettingsContext);
  if (!context) {
    throw new Error('useTaxSettings must be used within TaxSettingsProvider');
  }
  return context;
};
