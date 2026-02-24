import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { Eye, EyeOff, Mail, Lock, LogIn, AlertCircle, CheckCircle, Zap, Shield, BarChart3, Smartphone } from 'lucide-react';
import { getRefreshToken, getCachedUser } from '../services/authService';
import logo from '../assets/logo.png';

export const Login: React.FC = () => {
  const { theme } = useTheme();
  const { login, isAuthenticated, isLoading, error, clearError } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [formData, setFormData] = useState({ email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    const state = location.state as { message?: string } | null;
    if (state?.message) {
      setSuccessMessage(state.message);
      window.history.replaceState({}, document.title);
    }
  }, [location]);

  useEffect(() => {
    if (isAuthenticated && !isLoading) navigate('/dashboard', { replace: true });
  }, [isAuthenticated, isLoading, navigate]);

  useEffect(() => { return () => clearError(); }, [clearError]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (error) clearError();
    if (successMessage) setSuccessMessage(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSuccessMessage(null);
    try {
      await login(formData);
      navigate('/dashboard', { replace: true });
    } catch { /* handled by context */ } finally {
      setIsSubmitting(false);
    }
  };

  const hasPossibleSession = !!getRefreshToken() || !!getCachedUser();
  if (isLoading && hasPossibleSession) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${theme === 'dark' ? 'bg-slate-950' : 'bg-slate-50'}`}>
        <div className="text-center">
          <div className={`w-16 h-16 mx-auto mb-4 ${theme === 'dark' ? 'text-emerald-400' : 'text-emerald-500'}`}>
            <svg className="animate-spin" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
          </div>
          <p className={theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}>Checking session...</p>
        </div>
      </div>
    );
  }

  const features = [
    { icon: Zap, title: 'Lightning Fast', desc: 'Process invoices and manage inventory in seconds' },
    { icon: Shield, title: 'Secure & Reliable', desc: 'Enterprise-grade security for your business data' },
    { icon: BarChart3, title: 'Smart Analytics', desc: 'Real-time insights to grow your business' },
    { icon: Smartphone, title: 'Mobile Ready', desc: 'Manage your shop from anywhere, any device' },
  ];

  return (
    <div
      className={`min-h-screen flex ${theme === 'dark' ? 'bg-slate-950' : 'bg-slate-50'}`}
      style={{
        '--accent-50': '236 253 245',
        '--accent-100': '209 250 229',
        '--accent-200': '167 243 208',
        '--accent-300': '110 231 183',
        '--accent-400': '52 211 153',
        '--accent-500': '16 185 129',
        '--accent-600': '5 150 105',
        '--accent-700': '4 120 87',
        '--accent-800': '6 95 70',
        '--accent-900': '6 78 59',
        '--accent-950': '2 44 34',
        '--accent2-50': '240 253 250',
        '--accent2-100': '204 251 241',
        '--accent2-200': '153 246 228',
        '--accent2-300': '94 234 212',
        '--accent2-400': '45 212 191',
        '--accent2-500': '20 184 166',
        '--accent2-600': '13 148 136',
        '--accent2-700': '15 118 110',
        '--accent2-800': '17 94 89',
        '--accent2-900': '19 78 74',
        '--accent2-950': '4 47 46',
      } as React.CSSProperties}
    >

      {/* ─── Left Panel: Illustration / Branding (hidden on mobile) ─── */}
      <div className="hidden lg:flex lg:w-1/2 xl:w-[55%] relative overflow-hidden">
        {/* Background image with fallback gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-600 via-emerald-500 to-teal-500" />
        <img
          src="https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=1920&q=80"
          alt=""
          className="absolute inset-0 w-full h-full object-cover"
          loading="eager"
        />
        <div className="absolute inset-0 bg-gradient-to-br from-slate-900/80 via-emerald-900/50 to-teal-900/60" />

        {/* Accent glow effects */}
        <div className="absolute top-20 left-20 w-72 h-72 bg-emerald-500/15 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-32 right-16 w-96 h-96 bg-teal-400/10 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/3 w-40 h-40 bg-emerald-400/15 rounded-full blur-2xl" />

        {/* Content */}
        <div className="relative z-10 flex flex-col justify-between w-full p-12 xl:p-16">
          {/* Top: Logo */}
          <div className="flex items-center gap-3">
            <img src={logo} alt="Eco System" className="w-12 h-12 rounded-xl shadow-lg" />
            <div>
              <h2 className="text-2xl font-bold text-white">Eco System</h2>
              <p className="text-emerald-100 text-sm">Shop Management System</p>
            </div>
          </div>

          {/* Center: Hero text + features */}
          <div className="space-y-10">
            <div>
              <h1 className="text-4xl xl:text-5xl font-extrabold text-white leading-tight">
                Manage Your <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-300 to-teal-200">
                  Business Smarter
                </span>
              </h1>
              <p className="mt-4 text-lg text-emerald-100 max-w-md leading-relaxed">
                The all-in-one platform for computer & mobile shops. Invoicing, inventory, customers, and analytics — all in one place.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {features.map((f) => (
                <div key={f.title} className="group p-4 rounded-2xl bg-white/[0.07] backdrop-blur-md border border-white/[0.12] hover:bg-white/[0.12] hover:border-emerald-400/30 hover:shadow-lg hover:shadow-emerald-500/10 transition-all duration-500">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-400/25 to-teal-400/25 border border-white/10 flex items-center justify-center mb-3 group-hover:scale-110 group-hover:shadow-lg group-hover:shadow-emerald-400/20 transition-all duration-300">
                    <f.icon className="w-5 h-5 text-emerald-300" />
                  </div>
                  <h3 className="font-semibold text-white text-sm">{f.title}</h3>
                  <p className="text-slate-300/80 text-xs mt-1 leading-relaxed">{f.desc}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Bottom: Trust indicator */}
          <div className="flex items-center gap-4">
            <div className="flex -space-x-3">
              {['A', 'K', 'S', 'D'].map((letter, i) => (
                <div key={letter} className="w-10 h-10 rounded-full bg-gradient-to-br from-white/30 to-white/10 border-2 border-white/30 flex items-center justify-center text-white text-xs font-bold shadow-lg"
                  style={{ zIndex: 4 - i }}>
                  {letter}
                </div>
              ))}
            </div>
            <div>
              <p className="text-white font-medium text-sm">Trusted by 500+ shops</p>
              <p className="text-emerald-100/70 text-xs">across Sri Lanka</p>
            </div>
          </div>
        </div>
      </div>

      {/* ─── Right Panel: Login Form ─── */}
      <div className="flex-1 flex items-center justify-center p-4 sm:p-6 lg:p-12 relative overflow-hidden">
        {/* Decorative accent blurs */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-24 -left-24 w-72 h-72 bg-emerald-500/10 rounded-full blur-3xl" />
          <div className="absolute -bottom-24 -right-24 w-72 h-72 bg-teal-500/10 rounded-full blur-3xl" />
          <div className="absolute top-1/3 right-0 w-64 h-64 bg-emerald-500/[0.05] rounded-full blur-3xl hidden lg:block" />
        </div>

        <div className="relative w-full max-w-md">
          {/* Mobile logo */}
          <div className="flex items-center justify-center gap-3 mb-8 lg:hidden">
            <img src={logo} alt="Eco System" className="w-12 h-12 rounded-xl shadow-lg" />
            <div>
              <h2 className={`text-xl font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>Eco System</h2>
              <p className={`text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>Shop Management System</p>
            </div>
          </div>

          {/* Card */}
          <div className={`p-6 sm:p-8 rounded-2xl sm:rounded-3xl border shadow-2xl transition-colors ${
            theme === 'dark'
              ? 'bg-gradient-to-br from-slate-800/90 via-emerald-950/40 to-slate-900/90 border-emerald-500/15 backdrop-blur-xl shadow-emerald-500/5'
              : 'bg-gradient-to-br from-white via-emerald-50/30 to-teal-50/20 border-emerald-200/50 shadow-emerald-500/10'
          }`}>
            {/* Header */}
            <div className="mb-7">
              <h1 className={`text-2xl sm:text-3xl font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                Welcome back
              </h1>
              <p className={`mt-2 text-sm sm:text-base ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                Sign in to continue to your dashboard
              </p>
            </div>

            {/* Success message */}
            {successMessage && (
              <div className="mb-5 p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center gap-3">
                <CheckCircle className="w-5 h-5 text-emerald-500 shrink-0" />
                <p className={`text-sm ${theme === 'dark' ? 'text-emerald-400' : 'text-emerald-600'}`}>{successMessage}</p>
              </div>
            )}

            {/* Error message */}
            {error && (
              <div className={`mb-5 p-3.5 rounded-xl flex items-center gap-3 ${
                error.includes('starting up')
                  ? 'bg-amber-500/10 border border-amber-500/20'
                  : 'bg-red-500/10 border border-red-500/20'
              }`}>
                <AlertCircle className={`w-5 h-5 shrink-0 ${error.includes('starting up') ? 'text-amber-400' : 'text-red-400'}`} />
                <p className={`text-sm ${error.includes('starting up') ? 'text-amber-400' : 'text-red-400'}`}>{error}</p>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Email */}
              <div>
                <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                  Email Address
                </label>
                <div className="relative">
                  <Mail className={`absolute left-3.5 top-1/2 -translate-y-1/2 w-[18px] h-[18px] ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`} />
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    required
                    autoComplete="email"
                    placeholder="you@example.com"
                    className={`w-full pl-11 pr-4 py-3 rounded-xl border text-sm transition-all ${
                      theme === 'dark'
                        ? 'bg-slate-800/60 border-slate-700/60 text-white placeholder-slate-500 focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/20'
                        : 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:bg-white'
                    }`}
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                  Password
                </label>
                <div className="relative">
                  <Lock className={`absolute left-3.5 top-1/2 -translate-y-1/2 w-[18px] h-[18px] ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`} />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    required
                    autoComplete="current-password"
                    placeholder="••••••••"
                    className={`w-full pl-11 pr-12 py-3 rounded-xl border text-sm transition-all ${
                      theme === 'dark'
                        ? 'bg-slate-800/60 border-slate-700/60 text-white placeholder-slate-500 focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/20'
                        : 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:bg-white'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className={`absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-lg transition-colors ${
                      theme === 'dark' ? 'text-slate-500 hover:text-slate-300 hover:bg-slate-700/50' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Forgot */}
              <div className="flex justify-end">
                <Link
                  to="/forgot-password"
                  className={`text-sm font-medium transition-colors ${
                    theme === 'dark' ? 'text-emerald-400 hover:text-emerald-300' : 'text-emerald-600 hover:text-emerald-700'
                  }`}
                >
                  Forgot password?
                </Link>
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={isSubmitting}
                className={`w-full py-3 px-4 rounded-xl font-semibold text-white text-sm transition-all flex items-center justify-center gap-2 ${
                  isSubmitting
                    ? 'bg-slate-500 cursor-not-allowed'
                    : 'bg-gradient-to-r from-emerald-500 to-teal-500 hover:shadow-lg hover:shadow-emerald-500/25 hover:scale-[1.01] active:scale-[0.99]'
                }`}
              >
                {isSubmitting ? (
                  <>
                    <svg className="animate-spin w-5 h-5" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Signing in...
                  </>
                ) : (
                  <>
                    <LogIn className="w-5 h-5" />
                    Sign In
                  </>
                )}
              </button>
            </form>

            {/* Divider */}
            <div className="relative my-7">
              <div className="absolute inset-0 flex items-center">
                <div className={`w-full border-t ${theme === 'dark' ? 'border-slate-800' : 'border-slate-200'}`} />
              </div>
              <div className="relative flex justify-center text-xs">
                <span className={`px-3 rounded ${theme === 'dark' ? 'bg-slate-900 text-slate-500' : 'bg-white text-slate-400'}`}>
                  New to Eco System?
                </span>
              </div>
            </div>

            {/* Register link */}
            <Link
              to="/register"
              className={`w-full py-3 px-4 rounded-xl font-semibold text-sm transition-all flex items-center justify-center gap-2 border ${
                theme === 'dark'
                  ? 'border-slate-700 text-emerald-400 hover:bg-emerald-500/10 hover:border-emerald-500/30'
                  : 'border-slate-200 text-emerald-600 hover:bg-emerald-50 hover:border-emerald-300'
              }`}
            >
              Create a free account
            </Link>
          </div>

          {/* Footer */}
          <p className={`mt-6 text-center text-xs ${theme === 'dark' ? 'text-slate-600' : 'text-slate-400'}`}>
            © {new Date().getFullYear()} Eco System. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
