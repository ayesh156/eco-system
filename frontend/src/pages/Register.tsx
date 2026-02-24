import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { Eye, EyeOff, Mail, Lock, User, UserPlus, AlertCircle, Check, Package, Receipt, Users, TrendingUp } from 'lucide-react';
import { getRefreshToken, getCachedUser } from '../services/authService';
import logo from '../assets/logo.png';

export const Register: React.FC = () => {
  const { theme } = useTheme();
  const { register, isAuthenticated, isLoading, error, clearError } = useAuth();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  const passwordRequirements = [
    { id: 'length', label: 'At least 8 characters', test: (p: string) => p.length >= 8 },
    { id: 'uppercase', label: 'One uppercase letter', test: (p: string) => /[A-Z]/.test(p) },
    { id: 'lowercase', label: 'One lowercase letter', test: (p: string) => /[a-z]/.test(p) },
    { id: 'number', label: 'One number', test: (p: string) => /\d/.test(p) },
  ];

  useEffect(() => {
    if (isAuthenticated && !isLoading) navigate('/dashboard', { replace: true });
  }, [isAuthenticated, isLoading, navigate]);

  useEffect(() => { return () => clearError(); }, [clearError]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (error) clearError();
    setValidationErrors([]);
  };

  const validateForm = (): boolean => {
    const errors: string[] = [];
    if (formData.name.trim().length < 2) errors.push('Name must be at least 2 characters');
    if (!formData.email.includes('@')) errors.push('Please enter a valid email address');
    const failedReqs = passwordRequirements.filter(req => !req.test(formData.password));
    if (failedReqs.length > 0) errors.push('Password does not meet all requirements');
    if (formData.password !== formData.confirmPassword) errors.push('Passwords do not match');
    setValidationErrors(errors);
    return errors.length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    setIsSubmitting(true);
    try {
      await register({ name: formData.name, email: formData.email, password: formData.password });
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
          <p className={theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}>Loading...</p>
        </div>
      </div>
    );
  }

  const highlights = [
    { icon: Package, title: 'Inventory Management', desc: 'Track stock, serial numbers & IMEI with ease' },
    { icon: Receipt, title: 'Smart Invoicing', desc: 'Beautiful invoices with warranty tracking' },
    { icon: Users, title: 'Customer CRM', desc: 'Manage customer data, credit & loyalty' },
    { icon: TrendingUp, title: 'Business Insights', desc: 'Profit reports, sales trends & forecasts' },
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

      {/* ─── Left Panel: Branding (hidden on mobile) ─── */}
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
        <div className="absolute top-32 right-20 w-64 h-64 bg-emerald-500/15 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-20 left-12 w-80 h-80 bg-teal-400/10 rounded-full blur-3xl" />
        <div className="absolute top-1/3 right-1/3 w-48 h-48 bg-emerald-400/15 rounded-full blur-2xl" />

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

          {/* Center: Hero + highlights */}
          <div className="space-y-10">
            <div>
              <h1 className="text-4xl xl:text-5xl font-extrabold text-white leading-tight">
                Start Growing <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-300 to-teal-200">
                  Your Business
                </span>
              </h1>
              <p className="mt-4 text-lg text-emerald-100 max-w-md leading-relaxed">
                Join hundreds of Sri Lankan shops using Eco System to streamline operations and boost profitability.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {highlights.map((h) => (
                <div key={h.title} className="group p-4 rounded-2xl bg-white/[0.07] backdrop-blur-md border border-white/[0.12] hover:bg-white/[0.12] hover:border-emerald-400/30 hover:shadow-lg hover:shadow-emerald-500/10 transition-all duration-500">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-400/25 to-teal-400/25 border border-white/10 flex items-center justify-center mb-3 group-hover:scale-110 group-hover:shadow-lg group-hover:shadow-emerald-400/20 transition-all duration-300">
                    <h.icon className="w-5 h-5 text-emerald-300" />
                  </div>
                  <h3 className="font-semibold text-white text-sm">{h.title}</h3>
                  <p className="text-slate-300/80 text-xs mt-1 leading-relaxed">{h.desc}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Bottom: Quick stats */}
          <div className="flex items-center gap-8">
            {[
              { value: '500+', label: 'Active Shops' },
              { value: '50K+', label: 'Invoices/mo' },
              { value: '99.9%', label: 'Uptime' },
            ].map((stat) => (
              <div key={stat.label}>
                <p className="text-2xl font-bold text-white">{stat.value}</p>
                <p className="text-emerald-100/70 text-xs">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ─── Right Panel: Register Form ─── */}
      <div className="flex-1 flex items-center justify-center p-4 sm:p-6 lg:p-12 relative overflow-hidden">
        {/* Decorative accent blurs */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-24 -right-24 w-72 h-72 bg-emerald-500/10 rounded-full blur-3xl" />
          <div className="absolute -bottom-24 -left-24 w-72 h-72 bg-teal-500/10 rounded-full blur-3xl" />
          <div className="absolute top-1/3 left-0 w-64 h-64 bg-emerald-500/[0.05] rounded-full blur-3xl hidden lg:block" />
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
            <div className="mb-6">
              <h1 className={`text-2xl sm:text-3xl font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                Create account
              </h1>
              <p className={`mt-2 text-sm sm:text-base ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                Get started with Eco System for free
              </p>
            </div>

            {/* Errors */}
            {(error || validationErrors.length > 0) && (
              <div className="mb-5 p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                <div className="text-sm text-red-400 space-y-0.5">
                  {error && <p>{error}</p>}
                  {validationErrors.map((err, i) => <p key={i}>{err}</p>)}
                </div>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Name */}
              <div>
                <label className={`block text-sm font-medium mb-1.5 ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                  Full Name
                </label>
                <div className="relative">
                  <User className={`absolute left-3.5 top-1/2 -translate-y-1/2 w-[18px] h-[18px] ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`} />
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    required
                    autoComplete="name"
                    placeholder="John Doe"
                    className={`w-full pl-11 pr-4 py-2.5 rounded-xl border text-sm transition-all ${
                      theme === 'dark'
                        ? 'bg-slate-800/60 border-slate-700/60 text-white placeholder-slate-500 focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/20'
                        : 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:bg-white'
                    }`}
                  />
                </div>
              </div>

              {/* Email */}
              <div>
                <label className={`block text-sm font-medium mb-1.5 ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
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
                    className={`w-full pl-11 pr-4 py-2.5 rounded-xl border text-sm transition-all ${
                      theme === 'dark'
                        ? 'bg-slate-800/60 border-slate-700/60 text-white placeholder-slate-500 focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/20'
                        : 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:bg-white'
                    }`}
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label className={`block text-sm font-medium mb-1.5 ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
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
                    autoComplete="new-password"
                    placeholder="••••••••"
                    className={`w-full pl-11 pr-12 py-2.5 rounded-xl border text-sm transition-all ${
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

                {/* Requirements */}
                {formData.password && (
                  <div className="mt-2.5 grid grid-cols-2 gap-x-3 gap-y-1">
                    {passwordRequirements.map(req => (
                      <div key={req.id} className="flex items-center gap-1.5 text-xs">
                        {req.test(formData.password) ? (
                          <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        ) : (
                          <div className={`w-3.5 h-3.5 rounded-full border shrink-0 ${theme === 'dark' ? 'border-slate-600' : 'border-slate-300'}`} />
                        )}
                        <span className={req.test(formData.password) ? 'text-emerald-400' : theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}>
                          {req.label}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Confirm Password */}
              <div>
                <label className={`block text-sm font-medium mb-1.5 ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                  Confirm Password
                </label>
                <div className="relative">
                  <Lock className={`absolute left-3.5 top-1/2 -translate-y-1/2 w-[18px] h-[18px] ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`} />
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    required
                    autoComplete="new-password"
                    placeholder="••••••••"
                    className={`w-full pl-11 pr-12 py-2.5 rounded-xl border text-sm transition-all ${
                      formData.confirmPassword && formData.password !== formData.confirmPassword
                        ? `border-red-500/50 focus:border-red-500/50 focus:ring-2 focus:ring-red-500/20 ${theme === 'dark' ? 'bg-slate-800/60 text-white placeholder-slate-500' : 'bg-slate-50 text-slate-900 placeholder-slate-400'}`
                        : theme === 'dark'
                          ? 'bg-slate-800/60 border-slate-700/60 text-white placeholder-slate-500 focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/20'
                          : 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:bg-white'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className={`absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-lg transition-colors ${
                      theme === 'dark' ? 'text-slate-500 hover:text-slate-300 hover:bg-slate-700/50' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {formData.confirmPassword && formData.password !== formData.confirmPassword && (
                  <p className="mt-1 text-xs text-red-400">Passwords do not match</p>
                )}
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={isSubmitting}
                className={`w-full py-3 px-4 rounded-xl font-semibold text-white text-sm transition-all flex items-center justify-center gap-2 mt-2 ${
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
                    Creating account...
                  </>
                ) : (
                  <>
                    <UserPlus className="w-5 h-5" />
                    Create Account
                  </>
                )}
              </button>
            </form>

            {/* Divider */}
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className={`w-full border-t ${theme === 'dark' ? 'border-slate-800' : 'border-slate-200'}`} />
              </div>
              <div className="relative flex justify-center text-xs">
                <span className={`px-3 rounded ${theme === 'dark' ? 'bg-slate-900 text-slate-500' : 'bg-white text-slate-400'}`}>
                  Already have an account?
                </span>
              </div>
            </div>

            {/* Login link */}
            <Link
              to="/login"
              className={`w-full py-3 px-4 rounded-xl font-semibold text-sm transition-all flex items-center justify-center gap-2 border ${
                theme === 'dark'
                  ? 'border-slate-700 text-emerald-400 hover:bg-emerald-500/10 hover:border-emerald-500/30'
                  : 'border-slate-200 text-emerald-600 hover:bg-emerald-50 hover:border-emerald-300'
              }`}
            >
              Sign in instead
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

export default Register;
