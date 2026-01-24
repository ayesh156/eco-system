import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { mockWhatsAppSettings } from '../data/mockData';

interface WhatsAppSettings {
  enabled: boolean;
  paymentReminderTemplate: string;
  overdueReminderTemplate: string;
}

interface WhatsAppSettingsContextType {
  settings: WhatsAppSettings;
  updateSettings: (newSettings: Partial<WhatsAppSettings>) => void;
  saveSettings: () => Promise<void>;
  isLoading: boolean;
}

const WhatsAppSettingsContext = createContext<WhatsAppSettingsContextType | undefined>(undefined);

const STORAGE_KEY = 'whatsapp_settings';

export const WhatsAppSettingsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [settings, setSettings] = useState<WhatsAppSettings>(() => {
    // Load from localStorage on init
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return mockWhatsAppSettings;
      }
    }
    return mockWhatsAppSettings;
  });
  const [isLoading, setIsLoading] = useState(false);

  // Save to localStorage whenever settings change
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  }, [settings]);

  const updateSettings = (newSettings: Partial<WhatsAppSettings>) => {
    setSettings(prev => ({ ...prev, ...newSettings }));
  };

  const saveSettings = async () => {
    setIsLoading(true);
    try {
      // Save to localStorage
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
      // In the future, save to API/database here
      await new Promise(resolve => setTimeout(resolve, 500));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <WhatsAppSettingsContext.Provider value={{ settings, updateSettings, saveSettings, isLoading }}>
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
