import React, { createContext, useContext, useState, useEffect, type ReactNode } from 'react';

interface TaxSettings {
  enabled: boolean;
  defaultPercentage: number;
}

interface TaxSettingsContextType {
  settings: TaxSettings;
  updateSettings: (settings: Partial<TaxSettings>) => void;
  saveSettings: () => Promise<void>;
}

const TaxSettingsContext = createContext<TaxSettingsContextType | undefined>(undefined);

const DEFAULT_TAX_SETTINGS: TaxSettings = {
  enabled: true,
  defaultPercentage: 8,
};

export const TaxSettingsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [settings, setSettings] = useState<TaxSettings>(DEFAULT_TAX_SETTINGS);

  // Load settings from localStorage on mount
  useEffect(() => {
    const loadSettings = () => {
      try {
        const stored = localStorage.getItem('taxSettings');
        if (stored) {
          const parsed = JSON.parse(stored);
          setSettings(parsed);
          console.log('✅ Tax settings loaded from localStorage:', parsed);
        }
      } catch (error) {
        console.error('❌ Failed to load tax settings:', error);
      }
    };

    loadSettings();
  }, []);

  const updateSettings = (newSettings: Partial<TaxSettings>) => {
    setSettings(prev => {
      const updated = { ...prev, ...newSettings };
      console.log('📝 Tax settings updated:', updated);
      return updated;
    });
  };

  const saveSettings = async (): Promise<void> => {
    try {
      localStorage.setItem('taxSettings', JSON.stringify(settings));
      console.log('💾 Tax settings saved to localStorage:', settings);
      
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
    <TaxSettingsContext.Provider value={{ settings, updateSettings, saveSettings }}>
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
