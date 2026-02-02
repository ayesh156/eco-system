import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { SearchableSelect } from '../components/ui/searchable-select';
import { 
  Store, 
  MapPin, 
  Phone, 
  Mail, 
  Globe, 
  FileText,
  Building2,
  Percent,
  ArrowRight,
  Loader2,
  CheckCircle,
  AlertCircle
} from 'lucide-react';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api/v1';

export const ShopSetup: React.FC = () => {
  const { theme } = useTheme();
  const { user, refreshUser, getAccessToken } = useAuth();
  const navigate = useNavigate();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [formData, setFormData] = useState({
    shopName: '',
    shopDescription: '',
    address: '',
    phone: '',
    shopEmail: '',
    website: '',
    businessRegNo: '',
    taxId: '',
    currency: 'LKR',
    taxRate: 0,
  });

  // If user already has a shop, redirect to dashboard
  useEffect(() => {
    if (user?.shop) {
      navigate('/dashboard', { replace: true });
    }
  }, [user, navigate]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ 
      ...prev, 
      [name]: name === 'taxRate' ? parseFloat(value) || 0 : value 
    }));
    if (error) setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const token = getAccessToken();
      if (!token) {
        throw new Error('Not authenticated. Please login again.');
      }

      const response = await fetch(`${API_BASE_URL}/shops/create-for-user`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create shop');
      }

      setSuccess(true);
      
      // Refresh user data to get the new shopId
      await refreshUser();
      
      // Redirect to dashboard after short delay
      setTimeout(() => {
        navigate('/dashboard', { replace: true });
      }, 2000);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create shop');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className={`min-h-screen flex items-center justify-center p-4 ${
        theme === 'dark' 
          ? 'bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950' 
          : 'bg-gradient-to-br from-slate-50 to-white'
      }`}>
        <div className={`text-center p-8 rounded-2xl border ${
          theme === 'dark' 
            ? 'bg-slate-800/50 border-slate-700/50' 
            : 'bg-white border-slate-200 shadow-lg'
        }`}>
          <div className="w-20 h-20 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-10 h-10 text-emerald-500" />
          </div>
          <h2 className={`text-2xl font-bold mb-2 ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
            Shop Created Successfully! 🎉
          </h2>
          <p className={`mb-4 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
            Redirecting you to the dashboard...
          </p>
          <Loader2 className={`w-6 h-6 animate-spin mx-auto ${theme === 'dark' ? 'text-emerald-400' : 'text-emerald-500'}`} />
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen py-8 px-4 ${
      theme === 'dark' 
        ? 'bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950' 
        : 'bg-gradient-to-br from-slate-50 to-white'
    }`}>
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
            <Store className="w-8 h-8 text-white" />
          </div>
          <h1 className={`text-3xl font-bold mb-2 ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
            Welcome, {user?.name}! 👋
          </h1>
          <p className={`text-lg ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
            Let's set up your shop to get started
          </p>
        </div>

        {/* Form Card */}
        <div className={`rounded-2xl border p-6 lg:p-8 ${
          theme === 'dark' 
            ? 'bg-slate-800/50 border-slate-700/50' 
            : 'bg-white border-slate-200 shadow-lg'
        }`}>
          {error && (
            <div className={`mb-6 p-4 rounded-xl flex items-center gap-3 ${
              theme === 'dark' 
                ? 'bg-red-500/10 border border-red-500/30 text-red-400' 
                : 'bg-red-50 border border-red-200 text-red-600'
            }`}>
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Shop Name - Required */}
            <div>
              <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                Shop Name <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Store className={`absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 ${
                  theme === 'dark' ? 'text-slate-500' : 'text-slate-400'
                }`} />
                <input
                  type="text"
                  name="shopName"
                  value={formData.shopName}
                  onChange={handleChange}
                  required
                  placeholder="e.g., ECOTEC Computer Shop"
                  className={`w-full pl-10 pr-4 py-3 rounded-xl border transition-all ${
                    theme === 'dark'
                      ? 'bg-slate-800/50 border-slate-700/50 text-white placeholder-slate-500 focus:border-emerald-500/50'
                      : 'bg-white border-slate-200 text-slate-900 placeholder-slate-400 focus:border-emerald-500'
                  } focus:ring-2 focus:ring-emerald-500/20`}
                />
              </div>
            </div>

            {/* Description */}
            <div>
              <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                Description
              </label>
              <div className="relative">
                <FileText className={`absolute left-3 top-3 w-5 h-5 ${
                  theme === 'dark' ? 'text-slate-500' : 'text-slate-400'
                }`} />
                <textarea
                  name="shopDescription"
                  value={formData.shopDescription}
                  onChange={handleChange}
                  rows={3}
                  placeholder="Brief description of your shop..."
                  className={`w-full pl-10 pr-4 py-3 rounded-xl border transition-all resize-none ${
                    theme === 'dark'
                      ? 'bg-slate-800/50 border-slate-700/50 text-white placeholder-slate-500 focus:border-emerald-500/50'
                      : 'bg-white border-slate-200 text-slate-900 placeholder-slate-400 focus:border-emerald-500'
                  } focus:ring-2 focus:ring-emerald-500/20`}
                />
              </div>
            </div>

            {/* Two Column Layout */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Phone */}
              <div>
                <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                  Phone Number
                </label>
                <div className="relative">
                  <Phone className={`absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 ${
                    theme === 'dark' ? 'text-slate-500' : 'text-slate-400'
                  }`} />
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    placeholder="077-1234567"
                    className={`w-full pl-10 pr-4 py-3 rounded-xl border transition-all ${
                      theme === 'dark'
                        ? 'bg-slate-800/50 border-slate-700/50 text-white placeholder-slate-500 focus:border-emerald-500/50'
                        : 'bg-white border-slate-200 text-slate-900 placeholder-slate-400 focus:border-emerald-500'
                    } focus:ring-2 focus:ring-emerald-500/20`}
                  />
                </div>
              </div>

              {/* Email */}
              <div>
                <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                  Shop Email
                </label>
                <div className="relative">
                  <Mail className={`absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 ${
                    theme === 'dark' ? 'text-slate-500' : 'text-slate-400'
                  }`} />
                  <input
                    type="email"
                    name="shopEmail"
                    value={formData.shopEmail}
                    onChange={handleChange}
                    placeholder="shop@example.com"
                    className={`w-full pl-10 pr-4 py-3 rounded-xl border transition-all ${
                      theme === 'dark'
                        ? 'bg-slate-800/50 border-slate-700/50 text-white placeholder-slate-500 focus:border-emerald-500/50'
                        : 'bg-white border-slate-200 text-slate-900 placeholder-slate-400 focus:border-emerald-500'
                    } focus:ring-2 focus:ring-emerald-500/20`}
                  />
                </div>
              </div>
            </div>

            {/* Address */}
            <div>
              <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                Address
              </label>
              <div className="relative">
                <MapPin className={`absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 ${
                  theme === 'dark' ? 'text-slate-500' : 'text-slate-400'
                }`} />
                <input
                  type="text"
                  name="address"
                  value={formData.address}
                  onChange={handleChange}
                  placeholder="Shop address"
                  className={`w-full pl-10 pr-4 py-3 rounded-xl border transition-all ${
                    theme === 'dark'
                      ? 'bg-slate-800/50 border-slate-700/50 text-white placeholder-slate-500 focus:border-emerald-500/50'
                      : 'bg-white border-slate-200 text-slate-900 placeholder-slate-400 focus:border-emerald-500'
                  } focus:ring-2 focus:ring-emerald-500/20`}
                />
              </div>
            </div>

            {/* Website */}
            <div>
              <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                Website
              </label>
              <div className="relative">
                <Globe className={`absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 ${
                  theme === 'dark' ? 'text-slate-500' : 'text-slate-400'
                }`} />
                <input
                  type="url"
                  name="website"
                  value={formData.website}
                  onChange={handleChange}
                  placeholder="https://yourshop.lk"
                  className={`w-full pl-10 pr-4 py-3 rounded-xl border transition-all ${
                    theme === 'dark'
                      ? 'bg-slate-800/50 border-slate-700/50 text-white placeholder-slate-500 focus:border-emerald-500/50'
                      : 'bg-white border-slate-200 text-slate-900 placeholder-slate-400 focus:border-emerald-500'
                  } focus:ring-2 focus:ring-emerald-500/20`}
                />
              </div>
            </div>

            {/* Business Details */}
            <div className={`p-4 rounded-xl ${theme === 'dark' ? 'bg-slate-900/50' : 'bg-slate-50'}`}>
              <h3 className={`text-sm font-semibold mb-4 flex items-center gap-2 ${
                theme === 'dark' ? 'text-slate-300' : 'text-slate-700'
              }`}>
                <Building2 className="w-4 h-4" />
                Business Details (Optional)
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Business Reg No */}
                <div>
                  <label className={`block text-xs font-medium mb-1.5 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                    Business Registration No
                  </label>
                  <input
                    type="text"
                    name="businessRegNo"
                    value={formData.businessRegNo}
                    onChange={handleChange}
                    placeholder="BR/2024/12345"
                    className={`w-full px-3 py-2 rounded-xl border text-sm transition-all ${
                      theme === 'dark'
                        ? 'bg-slate-800/50 border-slate-700/50 text-white placeholder-slate-500'
                        : 'bg-white border-slate-200 text-slate-900 placeholder-slate-400'
                    }`}
                  />
                </div>

                {/* Tax ID */}
                <div>
                  <label className={`block text-xs font-medium mb-1.5 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                    Tax ID
                  </label>
                  <input
                    type="text"
                    name="taxId"
                    value={formData.taxId}
                    onChange={handleChange}
                    placeholder="123456789V"
                    className={`w-full px-3 py-2 rounded-xl border text-sm transition-all ${
                      theme === 'dark'
                        ? 'bg-slate-800/50 border-slate-700/50 text-white placeholder-slate-500'
                        : 'bg-white border-slate-200 text-slate-900 placeholder-slate-400'
                    }`}
                  />
                </div>

                {/* Currency */}
                <div>
                  <label className={`block text-xs font-medium mb-1.5 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                    Currency
                  </label>
                                  <SearchableSelect
                    value={formData.currency}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, currency: value }))}
                    options={[
                      { value: 'LKR', label: 'LKR (Rs.)' },
                      { value: 'USD', label: 'USD ($)' },
                      { value: 'EUR', label: 'EUR (€)' },
                      { value: 'GBP', label: 'GBP (£)' },
                      { value: 'INR', label: 'INR (₹)' },
                      { value: 'AUD', label: 'AUD (A$)' },
                      { value: 'CAD', label: 'CAD (C$)' },
                    ]}
                    placeholder="Select currency"
                    className="text-sm"
                    theme={theme}
                  />
                </div>

                {/* Tax Rate */}
                <div>
                  <label className={`block text-xs font-medium mb-1.5 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                    Default Tax Rate (%)
                  </label>
                  <div className="relative">
                    <Percent className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${
                      theme === 'dark' ? 'text-slate-500' : 'text-slate-400'
                    }`} />
                    <input
                      type="number"
                      name="taxRate"
                      value={formData.taxRate}
                      onChange={handleChange}
                      min="0"
                      max="100"
                      step="0.1"
                      placeholder="0"
                      className={`w-full pl-9 pr-3 py-2 rounded-xl border text-sm transition-all ${
                        theme === 'dark'
                          ? 'bg-slate-800/50 border-slate-700/50 text-white placeholder-slate-500'
                          : 'bg-white border-slate-200 text-slate-900 placeholder-slate-400'
                      }`}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting || !formData.shopName.trim()}
              className={`w-full flex items-center justify-center gap-2 py-3.5 rounded-xl font-medium text-white transition-all ${
                isSubmitting || !formData.shopName.trim()
                  ? 'bg-slate-500 cursor-not-allowed'
                  : 'bg-gradient-to-r from-emerald-500 to-teal-500 hover:shadow-lg hover:shadow-emerald-500/25'
              }`}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Creating Shop...
                </>
              ) : (
                <>
                  Create Shop & Get Started
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>
          </form>
        </div>

        {/* Footer Note */}
        <p className={`text-center mt-6 text-sm ${theme === 'dark' ? 'text-slate-500' : 'text-slate-500'}`}>
          You can update these details later from Settings
        </p>
      </div>
    </div>
  );
};

export default ShopSetup;
