import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTheme } from '../contexts/ThemeContext';
import { 
  Mail, 
  Lock, 
  ArrowLeft, 
  Send, 
  KeyRound, 
  CheckCircle, 
  AlertCircle,
  RefreshCw,
  Eye,
  EyeOff,
  ShieldCheck
} from 'lucide-react';

// API URL from environment
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api/v1';

// ===================================
// Types
// ===================================

type Step = 'email' | 'otp' | 'password' | 'success';

interface FormState {
  email: string;
  otp: string[];
  resetToken: string;
  newPassword: string;
  confirmPassword: string;
}

// ===================================
// OTP Input Component
// ===================================

interface OTPInputProps {
  value: string[];
  onChange: (value: string[]) => void;
  disabled?: boolean;
}

const OTPInput: React.FC<OTPInputProps> = ({ value, onChange, disabled }) => {
  const { theme } = useTheme();
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const handleChange = (index: number, digit: string) => {
    if (!/^\d*$/.test(digit)) return;

    const newValue = [...value];
    newValue[index] = digit.slice(-1);
    onChange(newValue);

    // Auto-focus next input
    if (digit && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !value[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasteData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    const newValue = [...value];
    pasteData.split('').forEach((digit, i) => {
      if (i < 6) newValue[i] = digit;
    });
    onChange(newValue);
    
    // Focus appropriate input after paste
    const focusIndex = Math.min(pasteData.length, 5);
    inputRefs.current[focusIndex]?.focus();
  };

  return (
    <div className="flex justify-center gap-2 sm:gap-3">
      {value.map((digit, index) => (
        <input
          key={index}
          ref={el => { inputRefs.current[index] = el; }}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={digit}
          onChange={e => handleChange(index, e.target.value)}
          onKeyDown={e => handleKeyDown(index, e)}
          onPaste={handlePaste}
          disabled={disabled}
          className={`w-11 h-14 sm:w-14 sm:h-16 text-center text-2xl sm:text-3xl font-bold rounded-xl border-2 transition-all outline-none ${
            theme === 'dark'
              ? 'bg-slate-800/50 border-slate-600 text-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20'
              : 'bg-white border-slate-300 text-slate-900 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20'
          } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
        />
      ))}
    </div>
  );
};

// ===================================
// Main Component
// ===================================

export const ForgotPassword: React.FC = () => {
  const { theme } = useTheme();
  const navigate = useNavigate();

  // State
  const [step, setStep] = useState<Step>('email');
  const [formData, setFormData] = useState<FormState>({
    email: '',
    otp: ['', '', '', '', '', ''],
    resetToken: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(0);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Countdown timer for resend OTP
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  // Clear error when changing steps or form data
  useEffect(() => {
    setError(null);
  }, [step]);

  // ===================================
  // API Handlers
  // ===================================

  const handleRequestOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_URL}/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: formData.email }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to send OTP');
      }

      setStep('otp');
      setCountdown(60); // 60 seconds cooldown for resend
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send OTP');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    const otp = formData.otp.join('');
    
    if (otp.length !== 6) {
      setError('Please enter the complete 6-digit code');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_URL}/auth/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          email: formData.email,
          otp,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Invalid OTP');
      }

      setFormData(prev => ({ ...prev, resetToken: data.data.resetToken }));
      setStep('password');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to verify OTP');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (formData.newPassword !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (formData.newPassword.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_URL}/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: formData.email,
          resetToken: formData.resetToken,
          newPassword: formData.newPassword,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to reset password');
      }

      setStep('success');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reset password');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendOTP = async () => {
    if (countdown > 0) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_URL}/auth/resend-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: formData.email }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to resend OTP');
      }

      setCountdown(60);
      setFormData(prev => ({ ...prev, otp: ['', '', '', '', '', ''] }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to resend OTP');
    } finally {
      setIsLoading(false);
    }
  };

  // ===================================
  // Step Indicators
  // ===================================

  const StepIndicator: React.FC = () => (
    <div className="flex items-center justify-center gap-2 mb-8">
      {['email', 'otp', 'password'].map((s, index) => {
        const steps: Step[] = ['email', 'otp', 'password'];
        const currentIndex = steps.indexOf(step);
        const isCompleted = index < currentIndex || step === 'success';
        const isActive = s === step;

        return (
          <React.Fragment key={s}>
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold transition-all ${
                isCompleted
                  ? 'bg-gradient-to-r from-emerald-500 to-blue-500 text-white'
                  : isActive
                  ? `border-2 ${theme === 'dark' ? 'border-emerald-400 text-emerald-400' : 'border-emerald-500 text-emerald-600'}`
                  : theme === 'dark'
                  ? 'bg-slate-700 text-slate-400'
                  : 'bg-slate-200 text-slate-500'
              }`}
            >
              {isCompleted ? <CheckCircle className="w-5 h-5" /> : index + 1}
            </div>
            {index < 2 && (
              <div
                className={`w-12 sm:w-16 h-1 rounded-full transition-all ${
                  index < currentIndex || step === 'success'
                    ? 'bg-gradient-to-r from-emerald-500 to-blue-500'
                    : theme === 'dark'
                    ? 'bg-slate-700'
                    : 'bg-slate-200'
                }`}
              />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );

  // ===================================
  // Render
  // ===================================

  return (
    <div className={`min-h-screen flex items-center justify-center p-4 ${
      theme === 'dark' 
        ? 'bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950' 
        : 'bg-gradient-to-br from-slate-50 to-white'
    }`}>
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-to-r from-emerald-500/5 to-blue-500/5 rounded-full blur-3xl" />
      </div>

      <div className={`relative w-full max-w-md p-8 rounded-2xl border shadow-2xl ${
        theme === 'dark' 
          ? 'bg-slate-800/50 border-slate-700/50 backdrop-blur-xl' 
          : 'bg-white border-slate-200'
      }`}>
        {/* Back button */}
        <Link
          to="/login"
          className={`absolute top-4 left-4 p-2 rounded-lg transition-colors ${
            theme === 'dark'
              ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/50'
              : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100'
          }`}
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>

        {/* Logo & Header */}
        <div className="text-center mb-6">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-emerald-500 to-blue-500 flex items-center justify-center shadow-lg shadow-emerald-500/20">
            {step === 'success' ? (
              <CheckCircle className="w-8 h-8 text-white" />
            ) : step === 'password' ? (
              <ShieldCheck className="w-8 h-8 text-white" />
            ) : step === 'otp' ? (
              <KeyRound className="w-8 h-8 text-white" />
            ) : (
              <Mail className="w-8 h-8 text-white" />
            )}
          </div>
          <h1 className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
            {step === 'success' ? 'Password Reset!' : 
             step === 'password' ? 'Create New Password' :
             step === 'otp' ? 'Enter Verification Code' :
             'Forgot Password?'}
          </h1>
          <p className={`mt-2 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
            {step === 'success' ? 'Your password has been reset successfully' :
             step === 'password' ? 'Choose a strong password for your account' :
             step === 'otp' ? `We sent a 6-digit code to ${formData.email}` :
             'Enter your email to receive a verification code'}
          </p>
        </div>

        {/* Step Indicator (not shown on success) */}
        {step !== 'success' && <StepIndicator />}

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
            <p className="text-sm text-red-400">{error}</p>
          </div>
        )}

        {/* ===================================
            STEP 1: Email Form
        =================================== */}
        {step === 'email' && (
          <form onSubmit={handleRequestOTP} className="space-y-5">
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
                  value={formData.email}
                  onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
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

            <button
              type="submit"
              disabled={isLoading}
              className={`w-full py-3 px-4 rounded-xl font-medium text-white transition-all flex items-center justify-center gap-2 ${
                isLoading
                  ? 'bg-slate-500 cursor-not-allowed'
                  : 'bg-gradient-to-r from-emerald-500 to-blue-500 hover:shadow-lg hover:shadow-emerald-500/25'
              }`}
            >
              {isLoading ? (
                <>
                  <RefreshCw className="w-5 h-5 animate-spin" />
                  Sending Code...
                </>
              ) : (
                <>
                  <Send className="w-5 h-5" />
                  Send Verification Code
                </>
              )}
            </button>
          </form>
        )}

        {/* ===================================
            STEP 2: OTP Verification
        =================================== */}
        {step === 'otp' && (
          <form onSubmit={handleVerifyOTP} className="space-y-6">
            <OTPInput
              value={formData.otp}
              onChange={(value) => setFormData(prev => ({ ...prev, otp: value }))}
              disabled={isLoading}
            />

            {/* Timer & Resend */}
            <div className="text-center">
              {countdown > 0 ? (
                <p className={`text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                  Resend code in <span className="font-semibold text-emerald-500">{countdown}s</span>
                </p>
              ) : (
                <button
                  type="button"
                  onClick={handleResendOTP}
                  disabled={isLoading}
                  className={`text-sm font-medium transition-colors ${
                    theme === 'dark'
                      ? 'text-emerald-400 hover:text-emerald-300'
                      : 'text-emerald-600 hover:text-emerald-700'
                  } ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  Didn't receive code? Resend
                </button>
              )}
            </div>

            <button
              type="submit"
              disabled={isLoading || formData.otp.some(d => !d)}
              className={`w-full py-3 px-4 rounded-xl font-medium text-white transition-all flex items-center justify-center gap-2 ${
                isLoading || formData.otp.some(d => !d)
                  ? 'bg-slate-500 cursor-not-allowed'
                  : 'bg-gradient-to-r from-emerald-500 to-blue-500 hover:shadow-lg hover:shadow-emerald-500/25'
              }`}
            >
              {isLoading ? (
                <>
                  <RefreshCw className="w-5 h-5 animate-spin" />
                  Verifying...
                </>
              ) : (
                <>
                  <KeyRound className="w-5 h-5" />
                  Verify Code
                </>
              )}
            </button>

            {/* Change Email */}
            <button
              type="button"
              onClick={() => {
                setStep('email');
                setFormData(prev => ({ ...prev, otp: ['', '', '', '', '', ''] }));
              }}
              className={`w-full text-center text-sm ${
                theme === 'dark' ? 'text-slate-400 hover:text-slate-300' : 'text-slate-600 hover:text-slate-700'
              }`}
            >
              Use a different email address
            </button>
          </form>
        )}

        {/* ===================================
            STEP 3: New Password Form
        =================================== */}
        {step === 'password' && (
          <form onSubmit={handleResetPassword} className="space-y-5">
            {/* New Password */}
            <div>
              <label className={`block text-sm font-medium mb-2 ${
                theme === 'dark' ? 'text-slate-300' : 'text-slate-700'
              }`}>
                New Password
              </label>
              <div className="relative">
                <Lock className={`absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 ${
                  theme === 'dark' ? 'text-slate-500' : 'text-slate-400'
                }`} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={formData.newPassword}
                  onChange={(e) => setFormData(prev => ({ ...prev, newPassword: e.target.value }))}
                  required
                  minLength={8}
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
              <p className={`mt-2 text-xs ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>
                Min 8 characters with uppercase, lowercase & number
              </p>
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
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                  required
                  minLength={8}
                  placeholder="••••••••"
                  className={`w-full pl-11 pr-12 py-3 rounded-xl border transition-all ${
                    theme === 'dark'
                      ? 'bg-slate-900/50 border-slate-700/50 text-white placeholder-slate-500 focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/20'
                      : 'bg-white border-slate-200 text-slate-900 placeholder-slate-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20'
                  }`}
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
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className={`w-full py-3 px-4 rounded-xl font-medium text-white transition-all flex items-center justify-center gap-2 ${
                isLoading
                  ? 'bg-slate-500 cursor-not-allowed'
                  : 'bg-gradient-to-r from-emerald-500 to-blue-500 hover:shadow-lg hover:shadow-emerald-500/25'
              }`}
            >
              {isLoading ? (
                <>
                  <RefreshCw className="w-5 h-5 animate-spin" />
                  Resetting Password...
                </>
              ) : (
                <>
                  <ShieldCheck className="w-5 h-5" />
                  Reset Password
                </>
              )}
            </button>
          </form>
        )}

        {/* ===================================
            STEP 4: Success
        =================================== */}
        {step === 'success' && (
          <div className="text-center space-y-6">
            {/* Success Animation */}
            <div className="relative mx-auto w-24 h-24">
              <div className="absolute inset-0 bg-gradient-to-r from-emerald-500 to-blue-500 rounded-full animate-ping opacity-20" />
              <div className="relative w-24 h-24 bg-gradient-to-r from-emerald-500 to-blue-500 rounded-full flex items-center justify-center">
                <CheckCircle className="w-12 h-12 text-white" />
              </div>
            </div>

            <div>
              <p className={`text-lg ${theme === 'dark' ? 'text-slate-300' : 'text-slate-600'}`}>
                You can now sign in with your new password
              </p>
            </div>

            <button
              onClick={() => navigate('/login', { state: { message: 'Password reset successful. Please sign in.' } })}
              className="w-full py-3 px-4 rounded-xl font-medium text-white bg-gradient-to-r from-emerald-500 to-blue-500 hover:shadow-lg hover:shadow-emerald-500/25 transition-all flex items-center justify-center gap-2"
            >
              Continue to Sign In
              <ArrowLeft className="w-5 h-5 rotate-180" />
            </button>
          </div>
        )}

        {/* Footer */}
        <p className={`mt-6 text-center text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
          Remember your password?{' '}
          <Link
            to="/login"
            className={`font-medium transition-colors ${
              theme === 'dark'
                ? 'text-emerald-400 hover:text-emerald-300'
                : 'text-emerald-600 hover:text-emerald-700'
            }`}
          >
            Sign In
          </Link>
        </p>
      </div>
    </div>
  );
};

export default ForgotPassword;
