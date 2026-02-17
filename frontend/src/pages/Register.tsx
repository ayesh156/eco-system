import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { Eye, EyeOff, Mail, Lock, User, UserPlus, AlertCircle, Check } from 'lucide-react';
import { getRefreshToken, getCachedUser } from '../services/authService';

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

  // Password requirements
  const passwordRequirements = [
    { id: 'length', label: 'At least 8 characters', test: (p: string) => p.length >= 8 },
    { id: 'uppercase', label: 'One uppercase letter', test: (p: string) => /[A-Z]/.test(p) },
    { id: 'lowercase', label: 'One lowercase letter', test: (p: string) => /[a-z]/.test(p) },
    { id: 'number', label: 'One number', test: (p: string) => /\d/.test(p) },
  ];

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated && !isLoading) {
      navigate('/dashboard', { replace: true });
    }
  }, [isAuthenticated, isLoading, navigate]);

  // Clear error when component unmounts
  useEffect(() => {
    return () => clearError();
  }, [clearError]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (error) clearError();
    setValidationErrors([]);
  };

  const validateForm = (): boolean => {
    const errors: string[] = [];

    if (formData.name.trim().length < 2) {
      errors.push('Name must be at least 2 characters');
    }

    if (!formData.email.includes('@')) {
      errors.push('Please enter a valid email address');
    }

    const failedRequirements = passwordRequirements.filter(req => !req.test(formData.password));
    if (failedRequirements.length > 0) {
      errors.push('Password does not meet all requirements');
    }

    if (formData.password !== formData.confirmPassword) {
      errors.push('Passwords do not match');
    }

    setValidationErrors(errors);
    return errors.length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      await register({
        name: formData.name,
        email: formData.email,
        password: formData.password,
      });
      navigate('/dashboard', { replace: true });
    } catch {
      // Error is handled by context
    } finally {
      setIsSubmitting(false);
    }
  };

  // Show loading ONLY if there's a possible session to restore
  const hasPossibleSession = !!getRefreshToken() || !!getCachedUser();
  if (isLoading && hasPossibleSession) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${
        theme === 'dark' 
          ? 'bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950' 
          : 'bg-gradient-to-br from-slate-50 to-white'
      }`}>
        <div className="text-center">
          <div className={`w-16 h-16 mx-auto mb-4 ${theme === 'dark' ? 'text-emerald-400' : 'text-emerald-500'}`}>
            <svg className="animate-spin" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          </div>
          <p className={theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}>Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen flex items-center justify-center p-4 ${
      theme === 'dark' 
        ? 'bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950' 
        : 'bg-gradient-to-br from-slate-50 to-white'
    }`}>
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl" />
      </div>

      <div className={`relative w-full max-w-md p-8 rounded-2xl border shadow-2xl ${
        theme === 'dark' 
          ? 'bg-slate-800/50 border-slate-700/50 backdrop-blur-xl' 
          : 'bg-white border-slate-200'
      }`}>
        {/* Logo & Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-emerald-500 to-blue-500 flex items-center justify-center">
            <span className="text-2xl font-bold text-white">E</span>
          </div>
          <h1 className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
            Create Account
          </h1>
          <p className={`mt-2 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
            Join ECOTEC to manage your business
          </p>
        </div>

        {/* Error Messages */}
        {(error || validationErrors.length > 0) && (
          <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
              <div className="text-sm text-red-400">
                {error && <p>{error}</p>}
                {validationErrors.map((err, i) => (
                  <p key={i}>{err}</p>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Register Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Name */}
          <div>
            <label className={`block text-sm font-medium mb-2 ${
              theme === 'dark' ? 'text-slate-300' : 'text-slate-700'
            }`}>
              Full Name
            </label>
            <div className="relative">
              <User className={`absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 ${
                theme === 'dark' ? 'text-slate-500' : 'text-slate-400'
              }`} />
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
                placeholder="John Doe"
                className={`w-full pl-11 pr-4 py-3 rounded-xl border transition-all ${
                  theme === 'dark'
                    ? 'bg-slate-900/50 border-slate-700/50 text-white placeholder-slate-500 focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/20'
                    : 'bg-white border-slate-200 text-slate-900 placeholder-slate-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20'
                }`}
              />
            </div>
          </div>

          {/* Email */}
          <div>
            <label className={`block text-sm font-medium mb-2 ${
              theme === 'dark' ? 'text-slate-300' : 'text-slate-700'
            }`}>
              Email Address
            </label>
            <div className="relative">
              <Mail className={`absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 ${
                theme === 'dark' ? 'text-slate-500' : 'text-slate-400'
              }`} />
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                required
                placeholder="you@example.com"
                className={`w-full pl-11 pr-4 py-3 rounded-xl border transition-all ${
                  theme === 'dark'
                    ? 'bg-slate-900/50 border-slate-700/50 text-white placeholder-slate-500 focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/20'
                    : 'bg-white border-slate-200 text-slate-900 placeholder-slate-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20'
                }`}
              />
            </div>
          </div>

          {/* Password */}
          <div>
            <label className={`block text-sm font-medium mb-2 ${
              theme === 'dark' ? 'text-slate-300' : 'text-slate-700'
            }`}>
              Password
            </label>
            <div className="relative">
              <Lock className={`absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 ${
                theme === 'dark' ? 'text-slate-500' : 'text-slate-400'
              }`} />
              <input
                type={showPassword ? 'text' : 'password'}
                name="password"
                value={formData.password}
                onChange={handleChange}
                required
                placeholder="••••••••"
                className={`w-full pl-11 pr-12 py-3 rounded-xl border transition-all ${
                  theme === 'dark'
                    ? 'bg-slate-900/50 border-slate-700/50 text-white placeholder-slate-500 focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/20'
                    : 'bg-white border-slate-200 text-slate-900 placeholder-slate-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20'
                }`}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className={`absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-lg transition-colors ${
                  theme === 'dark' 
                    ? 'text-slate-500 hover:text-slate-300' 
                    : 'text-slate-400 hover:text-slate-600'
                }`}
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
            
            {/* Password Requirements */}
            {formData.password && (
              <div className="mt-3 space-y-1">
                {passwordRequirements.map(req => (
                  <div key={req.id} className="flex items-center gap-2 text-xs">
                    {req.test(formData.password) ? (
                      <Check className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <div className={`w-4 h-4 rounded-full border ${
                        theme === 'dark' ? 'border-slate-600' : 'border-slate-300'
                      }`} />
                    )}
                    <span className={req.test(formData.password) 
                      ? 'text-emerald-400' 
                      : theme === 'dark' ? 'text-slate-500' : 'text-slate-400'
                    }>
                      {req.label}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Confirm Password */}
          <div>
            <label className={`block text-sm font-medium mb-2 ${
              theme === 'dark' ? 'text-slate-300' : 'text-slate-700'
            }`}>
              Confirm Password
            </label>
            <div className="relative">
              <Lock className={`absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 ${
                theme === 'dark' ? 'text-slate-500' : 'text-slate-400'
              }`} />
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                required
                placeholder="••••••••"
                className={`w-full pl-11 pr-12 py-3 rounded-xl border transition-all ${
                  formData.confirmPassword && formData.password !== formData.confirmPassword
                    ? 'border-red-500/50 focus:border-red-500/50 focus:ring-2 focus:ring-red-500/20'
                    : theme === 'dark'
                      ? 'bg-slate-900/50 border-slate-700/50 text-white placeholder-slate-500 focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/20'
                      : 'bg-white border-slate-200 text-slate-900 placeholder-slate-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20'
                } ${theme === 'dark' ? 'bg-slate-900/50 text-white placeholder-slate-500' : 'bg-white text-slate-900 placeholder-slate-400'}`}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className={`absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-lg transition-colors ${
                  theme === 'dark' 
                    ? 'text-slate-500 hover:text-slate-300' 
                    : 'text-slate-400 hover:text-slate-600'
                }`}
              >
                {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
            {formData.confirmPassword && formData.password !== formData.confirmPassword && (
              <p className="mt-1 text-xs text-red-400">Passwords do not match</p>
            )}
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isSubmitting}
            className={`w-full py-3 px-4 rounded-xl font-medium text-white transition-all flex items-center justify-center gap-2 ${
              isSubmitting
                ? 'bg-slate-500 cursor-not-allowed'
                : 'bg-gradient-to-r from-emerald-500 to-blue-500 hover:shadow-lg hover:shadow-emerald-500/25'
            }`}
          >
            {isSubmitting ? (
              <>
                <svg className="animate-spin w-5 h-5" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
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

        {/* Login Link */}
        <p className={`mt-6 text-center text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
          Already have an account?{' '}
          <Link 
            to="/login" 
            className={`font-medium transition-colors ${
              theme === 'dark' 
                ? 'text-emerald-400 hover:text-emerald-300' 
                : 'text-emerald-600 hover:text-emerald-700'
            }`}
          >
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
};

export default Register;
