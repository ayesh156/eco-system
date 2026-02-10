import React, { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { mockWhatsAppSettings } from '../data/mockData';
import { useAuth } from './AuthContext';
import { getAccessToken } from '../services/authService';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api/v1';

interface ShopDetails {
  name: string;
  phone: string;
  email: string;
  address: string;
}

interface WhatsAppSettings {
  // Invoice Reminders
  enabled: boolean;
  paymentReminderTemplate: string;
  overdueReminderTemplate: string;
  // GRN/Supplier Reminders
  grnReminderEnabled: boolean;
  grnPaymentReminderTemplate: string;
  grnOverdueReminderTemplate: string;
  // Supplier Order Template
  supplierOrderTemplate: string;
}

interface WhatsAppSettingsContextType {
  settings: WhatsAppSettings;
  shopDetails: ShopDetails | null;
  updateSettings: (newSettings: Partial<WhatsAppSettings>) => void;
  saveSettings: () => Promise<void>;
  loadSettings: () => Promise<void>;
  resetToDefaults: () => void;
  resetGrnToDefaults: () => void;
  resetSupplierOrderToDefaults: () => void;
  defaultTemplates: { payment: string; overdue: string; grnPayment: string; grnOverdue: string; supplierOrder: string };
  isLoading: boolean;
  isSaving: boolean;
  error: string | null;
  currentShopId: string | null;
}

const WhatsAppSettingsContext = createContext<WhatsAppSettingsContextType | undefined>(undefined);

// Default shop details - use null/empty for actual message generation
// These placeholders should only be shown in UI previews, not used in real messages
const DEFAULT_SHOP_DETAILS: ShopDetails = {
  name: '',
  phone: '',
  email: '',
  address: '',
};

// Preview-only defaults (for Settings page preview display)
export const PREVIEW_SHOP_DETAILS: ShopDetails = {
  name: 'Your Shop',
  phone: '0XX XXX XXXX',
  email: 'shop@example.com',
  address: 'Shop Address',
};

// Helper to get auth headers using proper token management
const getAuthHeaders = (): HeadersInit => {
  const token = getAccessToken();
  return {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
  };
};

export const WhatsAppSettingsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { user, isViewingShop, viewingShop } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [shopDetails, setShopDetails] = useState<ShopDetails | null>(null);
  
  // Get effective shop ID (viewed shop for SUPER_ADMIN, or user's own shop)
  const effectiveShopId = isViewingShop && viewingShop ? viewingShop.id : user?.shop?.id || null;

  const [settings, setSettings] = useState<WhatsAppSettings>(mockWhatsAppSettings);

  // Load settings from API
  const loadSettings = useCallback(async () => {
    if (!effectiveShopId) {
      console.log('📝 No shop ID, using default WhatsApp settings');
      setSettings(mockWhatsAppSettings);
      setShopDetails(DEFAULT_SHOP_DETAILS);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const url = `${API_BASE_URL}/shop-admin/whatsapp-settings?shopId=${effectiveShopId}`;
      console.log(`🔄 Loading WhatsApp settings for shop ${effectiveShopId}`);
      
      const response = await fetch(url, {
        headers: getAuthHeaders(),
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success && result.data) {
          const { 
            enabled, paymentReminderTemplate, overdueReminderTemplate, 
            grnReminderEnabled, grnPaymentReminderTemplate, grnOverdueReminderTemplate,
            supplierOrderTemplate,
            shopDetails: apiShopDetails 
          } = result.data;
          
          // Use API data, fallback to defaults only if null/undefined (not empty string)
          setSettings({
            enabled: enabled ?? true,
            paymentReminderTemplate: paymentReminderTemplate ?? mockWhatsAppSettings.paymentReminderTemplate,
            overdueReminderTemplate: overdueReminderTemplate ?? mockWhatsAppSettings.overdueReminderTemplate,
            grnReminderEnabled: grnReminderEnabled ?? true,
            grnPaymentReminderTemplate: grnPaymentReminderTemplate ?? mockWhatsAppSettings.grnPaymentReminderTemplate,
            grnOverdueReminderTemplate: grnOverdueReminderTemplate ?? mockWhatsAppSettings.grnOverdueReminderTemplate,
            supplierOrderTemplate: supplierOrderTemplate ?? mockWhatsAppSettings.supplierOrderTemplate,
          });
          
          // Set shop details from API (may contain empty values if not configured)
          if (apiShopDetails) {
            setShopDetails(apiShopDetails);
          }
          
          console.log(`✅ WhatsApp settings loaded for shop ${effectiveShopId}`);
        }
      } else {
        // API error, use defaults
        console.warn('⚠️ API error loading WhatsApp settings, using defaults');
        setSettings(mockWhatsAppSettings);
      }
    } catch (err) {
      console.error('❌ Failed to load WhatsApp settings:', err);
      setError('Failed to load settings');
      // Fallback to defaults
      setSettings(mockWhatsAppSettings);
    } finally {
      setIsLoading(false);
    }
  }, [effectiveShopId]);

  // Load settings when shop changes
  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  // Update local settings state
  const updateSettings = (newSettings: Partial<WhatsAppSettings>) => {
    setSettings(prev => ({ ...prev, ...newSettings }));
  };

  // Reset invoice templates to defaults
  const resetToDefaults = useCallback(() => {
    setSettings(prev => ({
      ...prev,
      paymentReminderTemplate: mockWhatsAppSettings.paymentReminderTemplate,
      overdueReminderTemplate: mockWhatsAppSettings.overdueReminderTemplate,
    }));
  }, []);

  // Reset GRN templates to defaults
  const resetGrnToDefaults = useCallback(() => {
    setSettings(prev => ({
      ...prev,
      grnPaymentReminderTemplate: mockWhatsAppSettings.grnPaymentReminderTemplate,
      grnOverdueReminderTemplate: mockWhatsAppSettings.grnOverdueReminderTemplate,
    }));
  }, []);

  // Reset supplier order template to defaults
  const resetSupplierOrderToDefaults = useCallback(() => {
    setSettings(prev => ({
      ...prev,
      supplierOrderTemplate: mockWhatsAppSettings.supplierOrderTemplate,
    }));
  }, []);

  // Expose default templates for reference
  const defaultTemplates = {
    payment: mockWhatsAppSettings.paymentReminderTemplate,
    overdue: mockWhatsAppSettings.overdueReminderTemplate,
    grnPayment: mockWhatsAppSettings.grnPaymentReminderTemplate,
    grnOverdue: mockWhatsAppSettings.grnOverdueReminderTemplate,
    supplierOrder: mockWhatsAppSettings.supplierOrderTemplate,
  };

  // Save settings to API
  const saveSettings = async () => {
    if (!effectiveShopId) {
      console.warn('⚠️ No shop ID, cannot save WhatsApp settings');
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      const url = `${API_BASE_URL}/shop-admin/whatsapp-settings?shopId=${effectiveShopId}`;
      console.log(`💾 Saving WhatsApp settings for shop ${effectiveShopId}`);
      
      const response = await fetch(url, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify(settings),
      });
      
      if (response.ok) {
        const result = await response.json();
        console.log(`✅ WhatsApp settings saved for shop ${effectiveShopId}`);
        
        // Update local state with response data (preserve the saved templates)
        if (result.data) {
          setSettings({
            enabled: result.data.enabled ?? true,
            paymentReminderTemplate: result.data.paymentReminderTemplate ?? '',
            overdueReminderTemplate: result.data.overdueReminderTemplate ?? '',
            grnReminderEnabled: result.data.grnReminderEnabled ?? true,
            grnPaymentReminderTemplate: result.data.grnPaymentReminderTemplate ?? '',
            grnOverdueReminderTemplate: result.data.grnOverdueReminderTemplate ?? '',
            supplierOrderTemplate: result.data.supplierOrderTemplate ?? '',
          });
          if (result.data.shopDetails) {
            setShopDetails(result.data.shopDetails);
          }
        }
      } else {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to save settings');
      }
    } catch (err) {
      console.error('❌ Failed to save WhatsApp settings:', err);
      setError(err instanceof Error ? err.message : 'Failed to save settings');
      throw err;
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <WhatsAppSettingsContext.Provider value={{ 
      settings, 
      shopDetails,
      updateSettings, 
      saveSettings, 
      loadSettings,
      resetToDefaults,
      resetGrnToDefaults,
      resetSupplierOrderToDefaults,
      defaultTemplates,
      isLoading, 
      isSaving,
      error,
      currentShopId: effectiveShopId 
    }}>
      {children}
    </WhatsAppSettingsContext.Provider>
  );
};

export const useWhatsAppSettings = () => {
  const context = useContext(WhatsAppSettingsContext);
  if (!context) {
    throw new Error('useWhatsAppSettings must be used within WhatsAppSettingsProvider');
  }
  return context;
};
