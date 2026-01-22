import React, { createContext, useContext, useState, useEffect, type ReactNode } from 'react';

type Theme = 'light' | 'dark';

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
  aiAutoFillEnabled: boolean;
  toggleAiAutoFill: () => void;
  setAiAutoFill: (enabled: boolean) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<Theme>(() => {
    if (typeof window !== 'undefined') {
      const savedTheme = localStorage.getItem('theme') as Theme;
      if (savedTheme) return savedTheme;
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return 'dark';
  });

  const [aiAutoFillEnabled, setAiAutoFillEnabled] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('ecotec_ai_autofill');
      return saved !== 'false'; // Default is true (ON)
    }
    return true;
  });

  useEffect(() => {
    localStorage.setItem('theme', theme);
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);

  useEffect(() => {
    localStorage.setItem('ecotec_ai_autofill', String(aiAutoFillEnabled));
  }, [aiAutoFillEnabled]);

  const toggleTheme = () => {
    setThemeState(prev => prev === 'dark' ? 'light' : 'dark');
  };

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
  };

  const toggleAiAutoFill = () => {
    setAiAutoFillEnabled(prev => !prev);
  };

  const setAiAutoFill = (enabled: boolean) => {
    setAiAutoFillEnabled(enabled);
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, setTheme, aiAutoFillEnabled, toggleAiAutoFill, setAiAutoFill }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
