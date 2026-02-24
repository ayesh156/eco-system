import React, { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';

type Theme = 'light' | 'dark';
type AccentColor = 'emerald' | 'blue' | 'purple' | 'rose' | 'amber' | 'indigo';

// ── RGB colour values for every accent colour ────────────────────────────
// Each accent maps to:
//   primary  – shades 50‥950 (overrides Tailwind `emerald-*`)
//   secondary – shades 50‥950 (overrides Tailwind `teal-*`, used for gradient endpoints)
// Values are space‑separated RGB triples for use with `rgb(var(…) / <alpha>)`.
type RGBScale = Record<number, string>;
interface AccentPalette { primary: RGBScale; secondary: RGBScale }

const ACCENT_PALETTES: Record<AccentColor, AccentPalette> = {
  emerald: {
    primary:   { 50:'236 253 245',100:'209 250 229',200:'167 243 208',300:'110 231 183',400:'52 211 153',500:'16 185 129',600:'5 150 105',700:'4 120 87',800:'6 95 70',900:'6 78 59',950:'2 44 34' },
    secondary: { 50:'240 253 250',100:'204 251 241',200:'153 246 228',300:'94 234 212',400:'45 212 191',500:'20 184 166',600:'13 148 136',700:'15 118 110',800:'17 94 89',900:'20 78 74',950:'4 47 46' },
  },
  blue: {
    primary:   { 50:'239 246 255',100:'219 234 254',200:'191 219 254',300:'147 197 253',400:'96 165 250',500:'59 130 246',600:'37 99 235',700:'29 78 216',800:'30 64 175',900:'30 58 138',950:'23 37 84' },
    secondary: { 50:'236 254 255',100:'207 250 254',200:'165 243 252',300:'103 232 249',400:'34 211 238',500:'6 182 212',600:'8 145 178',700:'14 116 144',800:'21 94 117',900:'22 78 99',950:'8 51 68' },
  },
  purple: {
    primary:   { 50:'250 245 255',100:'243 232 255',200:'233 213 255',300:'216 180 254',400:'192 132 252',500:'168 85 247',600:'147 51 234',700:'126 34 206',800:'107 33 168',900:'88 28 135',950:'59 7 100' },
    secondary: { 50:'253 242 248',100:'252 231 243',200:'251 207 232',300:'249 168 212',400:'244 114 182',500:'236 72 153',600:'219 39 119',700:'190 24 93',800:'157 23 77',900:'131 24 67',950:'80 7 36' },
  },
  rose: {
    primary:   { 50:'255 241 242',100:'255 228 230',200:'254 205 211',300:'253 164 175',400:'251 113 133',500:'244 63 94',600:'225 29 72',700:'190 18 60',800:'159 18 57',900:'136 19 55',950:'76 5 25' },
    secondary: { 50:'253 242 248',100:'252 231 243',200:'251 207 232',300:'249 168 212',400:'244 114 182',500:'236 72 153',600:'219 39 119',700:'190 24 93',800:'157 23 77',900:'131 24 67',950:'80 7 36' },
  },
  amber: {
    primary:   { 50:'255 251 235',100:'254 243 199',200:'253 230 138',300:'252 211 77',400:'251 191 36',500:'245 158 11',600:'217 119 6',700:'180 83 9',800:'146 64 14',900:'120 53 15',950:'69 26 3' },
    secondary: { 50:'255 247 237',100:'255 237 213',200:'254 215 170',300:'253 186 116',400:'251 146 60',500:'249 115 22',600:'234 88 12',700:'194 65 12',800:'154 52 18',900:'124 45 18',950:'67 20 7' },
  },
  indigo: {
    primary:   { 50:'238 242 255',100:'224 231 255',200:'199 210 254',300:'165 180 252',400:'129 140 248',500:'99 102 241',600:'79 70 229',700:'67 56 202',800:'55 48 163',900:'49 46 129',950:'30 27 75' },
    secondary: { 50:'250 245 255',100:'243 232 255',200:'233 213 255',300:'216 180 254',400:'192 132 252',500:'168 85 247',600:'147 51 234',700:'126 34 206',800:'107 33 168',900:'88 28 135',950:'59 7 100' },
  },
};

// Accent color CSS class mappings for use throughout the app
export const ACCENT_COLOR_MAP: Record<AccentColor, {
  gradient: string;
  gradientButton: string;
  text: string;
  textDark: string;
  bg: string;
  bgDark: string;
  border: string;
  borderDark: string;
  ring: string;
  shadow: string;
  from: string;
  to: string;
}> = {
  emerald: {
    gradient: 'from-emerald-500 to-teal-500',
    gradientButton: 'from-emerald-500 to-blue-500',
    text: 'text-emerald-600',
    textDark: 'text-emerald-400',
    bg: 'bg-emerald-500',
    bgDark: 'bg-emerald-500/20',
    border: 'border-emerald-500',
    borderDark: 'border-emerald-500/50',
    ring: 'ring-emerald-500',
    shadow: 'shadow-emerald-500/25',
    from: 'from-emerald-500',
    to: 'to-teal-500',
  },
  blue: {
    gradient: 'from-blue-500 to-cyan-500',
    gradientButton: 'from-blue-500 to-cyan-500',
    text: 'text-blue-600',
    textDark: 'text-blue-400',
    bg: 'bg-blue-500',
    bgDark: 'bg-blue-500/20',
    border: 'border-blue-500',
    borderDark: 'border-blue-500/50',
    ring: 'ring-blue-500',
    shadow: 'shadow-blue-500/25',
    from: 'from-blue-500',
    to: 'to-cyan-500',
  },
  purple: {
    gradient: 'from-purple-500 to-pink-500',
    gradientButton: 'from-purple-500 to-pink-500',
    text: 'text-purple-600',
    textDark: 'text-purple-400',
    bg: 'bg-purple-500',
    bgDark: 'bg-purple-500/20',
    border: 'border-purple-500',
    borderDark: 'border-purple-500/50',
    ring: 'ring-purple-500',
    shadow: 'shadow-purple-500/25',
    from: 'from-purple-500',
    to: 'to-pink-500',
  },
  rose: {
    gradient: 'from-rose-500 to-pink-500',
    gradientButton: 'from-rose-500 to-pink-500',
    text: 'text-rose-600',
    textDark: 'text-rose-400',
    bg: 'bg-rose-500',
    bgDark: 'bg-rose-500/20',
    border: 'border-rose-500',
    borderDark: 'border-rose-500/50',
    ring: 'ring-rose-500',
    shadow: 'shadow-rose-500/25',
    from: 'from-rose-500',
    to: 'to-pink-500',
  },
  amber: {
    gradient: 'from-amber-500 to-orange-500',
    gradientButton: 'from-amber-500 to-orange-500',
    text: 'text-amber-600',
    textDark: 'text-amber-400',
    bg: 'bg-amber-500',
    bgDark: 'bg-amber-500/20',
    border: 'border-amber-500',
    borderDark: 'border-amber-500/50',
    ring: 'ring-amber-500',
    shadow: 'shadow-amber-500/25',
    from: 'from-amber-500',
    to: 'to-orange-500',
  },
  indigo: {
    gradient: 'from-indigo-500 to-purple-500',
    gradientButton: 'from-indigo-500 to-violet-500',
    text: 'text-indigo-600',
    textDark: 'text-indigo-400',
    bg: 'bg-indigo-500',
    bgDark: 'bg-indigo-500/20',
    border: 'border-indigo-500',
    borderDark: 'border-indigo-500/50',
    ring: 'ring-indigo-500',
    shadow: 'shadow-indigo-500/25',
    from: 'from-indigo-500',
    to: 'to-purple-500',
  },
};

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
  accentColor: AccentColor;
  setAccentColor: (color: AccentColor) => void;
  accent: typeof ACCENT_COLOR_MAP[AccentColor];
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
      return 'dark';
    }
    return 'dark';
  });

  const [accentColor, setAccentColorState] = useState<AccentColor>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('accentColor') as AccentColor;
      if (saved && saved in ACCENT_COLOR_MAP) return saved;
      return 'emerald';
    }
    return 'emerald';
  });

  const [aiAutoFillEnabled, setAiAutoFillEnabled] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('eco_system_ai_autofill');
      return saved !== 'false';
    }
    return true;
  });

  useEffect(() => {
    localStorage.setItem('theme', theme);
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);

  useEffect(() => {
    localStorage.setItem('accentColor', accentColor);

    // Apply the accent's RGB values as CSS custom properties on :root so that
    // Tailwind's `emerald-*` and `teal-*` classes resolve to the chosen accent.
    const palette = ACCENT_PALETTES[accentColor];
    const root = document.documentElement;
    const shades = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950];
    for (const s of shades) {
      root.style.setProperty(`--accent-${s}`, palette.primary[s]);
      root.style.setProperty(`--accent2-${s}`, palette.secondary[s]);
    }
  }, [accentColor]);

  useEffect(() => {
    localStorage.setItem('eco_system_ai_autofill', String(aiAutoFillEnabled));
  }, [aiAutoFillEnabled]);

  const toggleTheme = () => {
    setThemeState(prev => prev === 'dark' ? 'light' : 'dark');
  };

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
  };

  const setAccentColor = useCallback((color: AccentColor) => {
    setAccentColorState(color);
  }, []);

  const accent = ACCENT_COLOR_MAP[accentColor];

  const toggleAiAutoFill = () => {
    setAiAutoFillEnabled(prev => !prev);
  };

  const setAiAutoFill = (enabled: boolean) => {
    setAiAutoFillEnabled(enabled);
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, setTheme, accentColor, setAccentColor, accent, aiAutoFillEnabled, toggleAiAutoFill, setAiAutoFill }}>
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
