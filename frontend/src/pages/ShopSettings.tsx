import React, { useState, useRef, useEffect } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { useShopBranding } from '../contexts/ShopBrandingContext';
import { toast } from 'sonner';
import {
  Building2,
  Upload,
  Trash2,
  Save,
  Image,
  Phone,
  Mail,
  MapPin,
  Globe,
  FileText,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Info,
  Eye,
} from 'lucide-react';
import {
  compressImage,
  validateImageFile,
  formatFileSize,
} from '../lib/imageCompression';
import {
  replaceLogo,
  isSupabaseConfigured,
} from '../services/supabaseStorageService';
import { PrintableInvoice } from '../components/PrintableInvoice';

// Mock invoice for preview
const mockInvoiceForPreview = {
  id: 'INV-20260001',
  customerId: 'c1',
  customerName: 'Sample Customer',
  customerPhone: '077-1234567',
  date: new Date().toISOString().split('T')[0],
  dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
  subtotal: 25000,
  discount: 500,
  tax: 0,
  total: 24500,
  paidAmount: 10000,
  status: 'halfpay' as const,
  paymentMethod: 'cash' as const,
  createdAt: new Date().toISOString(),
  notes: 'Thank you for your business!',
  items: [
    {
      productId: 'p1',
      productName: 'Sample Product',
      quantity: 2,
      unitPrice: 12500,
      total: 25000,
    },
  ],
};

export const ShopSettings: React.FC = () => {
  const { theme } = useTheme();
  const { user } = useAuth();
  const {
    branding,
    updateBranding,
    saveBranding,
    isLoading: isSavingBranding,
    hasUnsavedChanges,
  } = useShopBranding();

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Local form state
  const [formData, setFormData] = useState({
    name: '',
    subName: '',
    address: '',
    phone: '',
    email: '',
    website: '',
    tagline: '',
  });

  // Logo states
  const [logoPreview, setLogoPreview] = useState<string | undefined>(undefined);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [compressionInfo, setCompressionInfo] = useState<{
    original: number;
    compressed: number;
    ratio: number;
  } | null>(null);

  // UI states
  const [isSaving, setIsSaving] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  // Check if user can edit
  const canEdit = user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN';
  const shopId = user?.shop?.id;

  // Initialize form with branding data
  useEffect(() => {
    setFormData({
      name: branding.name || '',
      subName: branding.subName || '',
      address: branding.address || '',
      phone: branding.phone || '',
      email: branding.email || '',
      website: branding.website || '',
      tagline: branding.tagline || '',
    });
    setLogoPreview(branding.logo);
  }, [branding]);

  // Handle form field changes
  const handleChange = (field: keyof typeof formData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    updateBranding({ [field]: value });
  };

  // Handle logo selection
  const handleLogoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file
    const validation = validateImageFile(file);
    if (!validation.valid) {
      toast.error(validation.error);
      return;
    }

    setIsUploadingLogo(true);
    setCompressionInfo(null);

    try {
      // Compress image
      const compressed = await compressImage(file, {
        maxWidth: 400,
        maxHeight: 400,
        quality: 0.85,
        mimeType: 'image/jpeg',
      });

      setCompressionInfo({
        original: compressed.originalSize,
        compressed: compressed.compressedSize,
        ratio: compressed.compressionRatio,
      });

      // Check if Supabase is configured
      if (!isSupabaseConfigured()) {
        // Use local data URL if Supabase not configured
        setLogoPreview(compressed.dataUrl);
        updateBranding({ logo: compressed.dataUrl });
        toast.success('Logo updated (local mode - Supabase not configured)');
        setIsUploadingLogo(false);
        return;
      }

      // Upload to Supabase
      if (!shopId) {
        toast.error('Shop not found. Please set up your shop first.');
        setIsUploadingLogo(false);
        return;
      }

      const result = await replaceLogo(
        compressed.file,
        shopId,
        branding.logo
      );

      if (result.success && result.url) {
        setLogoPreview(result.url);
        updateBranding({ logo: result.url });
        toast.success('Logo uploaded successfully!');
      } else {
        toast.error(result.error || 'Failed to upload logo');
      }
    } catch (err) {
      console.error('Logo upload error:', err);
      toast.error('Failed to process logo');
    } finally {
      setIsUploadingLogo(false);
    }

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Handle logo removal
  const handleRemoveLogo = () => {
    setLogoPreview(undefined);
    updateBranding({ logo: undefined });
    setCompressionInfo(null);
    toast.info('Logo removed. Save to apply changes.');
  };

  // Handle save
  const handleSave = async () => {
    if (!canEdit) {
      toast.error('You do not have permission to edit shop settings');
      return;
    }

    setIsSaving(true);

    try {
      await saveBranding();
      toast.success('Shop settings saved successfully!');
    } catch {
      toast.error('Failed to save settings');
    } finally {
      setIsSaving(false);
    }
  };

  // Get preview branding for PrintableInvoice
  const getPreviewBranding = () => ({
    name: formData.name,
    subName: formData.subName,
    logo: logoPreview,
    address: formData.address,
    phone: formData.phone,
    email: formData.email,
    tagline: formData.tagline,
  });

  return (
    <div className="space-y-6 pb-8">
      {/* Page Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1
            className={`text-2xl lg:text-3xl font-bold ${
              theme === 'dark' ? 'text-white' : 'text-slate-900'
            }`}
          >
            Shop Branding & Settings
          </h1>
          <p
            className={`mt-1 ${
              theme === 'dark' ? 'text-slate-400' : 'text-slate-600'
            }`}
          >
            Customize your shop's branding for invoices and documents
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowPreview(!showPreview)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border transition-all ${
              theme === 'dark'
                ? 'bg-slate-800/50 border-slate-700/50 hover:bg-slate-700/50 text-slate-300'
                : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-700'
            }`}
          >
            <Eye className="w-5 h-5" />
            {showPreview ? 'Hide Preview' : 'Preview Invoice'}
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving || isSavingBranding || !hasUnsavedChanges}
            className={`flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-xl font-medium shadow-lg hover:shadow-emerald-500/25 transition-all disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            {isSaving || isSavingBranding ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Save className="w-5 h-5" />
            )}
            Save Changes
          </button>
        </div>
      </div>

      {/* Permission Warning */}
      {!canEdit && (
        <div
          className={`flex items-center gap-3 p-4 rounded-xl border ${
            theme === 'dark'
              ? 'bg-amber-500/10 border-amber-500/20 text-amber-400'
              : 'bg-amber-50 border-amber-200 text-amber-700'
          }`}
        >
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <p>Only shop administrators can edit these settings.</p>
        </div>
      )}

      {/* Unsaved Changes Indicator */}
      {hasUnsavedChanges && (
        <div
          className={`flex items-center gap-3 p-4 rounded-xl border ${
            theme === 'dark'
              ? 'bg-blue-500/10 border-blue-500/20 text-blue-400'
              : 'bg-blue-50 border-blue-200 text-blue-700'
          }`}
        >
          <Info className="w-5 h-5 flex-shrink-0" />
          <p>You have unsaved changes. Click "Save Changes" to apply them.</p>
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Left Column - Form */}
        <div className="space-y-6">
          {/* Logo Upload Section */}
          <div
            className={`relative overflow-hidden rounded-2xl border p-6 ${
              theme === 'dark'
                ? 'bg-gradient-to-br from-slate-800/50 to-slate-900/50 border-slate-700/50'
                : 'bg-white border-slate-200 shadow-sm'
            }`}
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-emerald-500/20 to-teal-500/10 rounded-full blur-3xl" />
            <div className="relative">
              <div className="flex items-center gap-3 mb-6">
                <div
                  className={`p-2.5 rounded-xl ${
                    theme === 'dark' ? 'bg-emerald-500/20' : 'bg-emerald-100'
                  }`}
                >
                  <Image
                    className={`w-5 h-5 ${
                      theme === 'dark' ? 'text-emerald-400' : 'text-emerald-600'
                    }`}
                  />
                </div>
                <h2
                  className={`text-lg font-semibold ${
                    theme === 'dark' ? 'text-white' : 'text-slate-900'
                  }`}
                >
                  Shop Logo
                </h2>
              </div>

              <div className="flex flex-col sm:flex-row items-start gap-6">
                {/* Logo Preview */}
                <div
                  className={`w-32 h-32 rounded-xl border-2 border-dashed flex items-center justify-center overflow-hidden ${
                    theme === 'dark'
                      ? 'border-slate-600 bg-slate-800/50'
                      : 'border-slate-300 bg-slate-50'
                  }`}
                >
                  {logoPreview ? (
                    <img
                      src={logoPreview}
                      alt="Shop Logo"
                      className="w-full h-full object-contain"
                    />
                  ) : (
                    <Building2
                      className={`w-12 h-12 ${
                        theme === 'dark' ? 'text-slate-600' : 'text-slate-400'
                      }`}
                    />
                  )}
                </div>

                {/* Upload Controls */}
                <div className="flex-1 space-y-4">
                  <div className="flex flex-wrap gap-3">
                    <input
                      type="file"
                      ref={fileInputRef}
                      accept="image/jpeg,image/png,image/webp,image/gif"
                      onChange={handleLogoSelect}
                      className="hidden"
                      disabled={!canEdit || isUploadingLogo}
                    />
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      disabled={!canEdit || isUploadingLogo}
                      className={`flex items-center gap-2 px-4 py-2 rounded-xl border transition-all ${
                        theme === 'dark'
                          ? 'bg-slate-700/50 border-slate-600 hover:bg-slate-600/50 text-white'
                          : 'bg-slate-100 border-slate-200 hover:bg-slate-200 text-slate-700'
                      } disabled:opacity-50 disabled:cursor-not-allowed`}
                    >
                      {isUploadingLogo ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Upload className="w-4 h-4" />
                      )}
                      {isUploadingLogo ? 'Processing...' : 'Upload Logo'}
                    </button>

                    {logoPreview && (
                      <button
                        onClick={handleRemoveLogo}
                        disabled={!canEdit || isUploadingLogo}
                        className={`flex items-center gap-2 px-4 py-2 rounded-xl border transition-all ${
                          theme === 'dark'
                            ? 'bg-red-500/10 border-red-500/30 text-red-400 hover:bg-red-500/20'
                            : 'bg-red-50 border-red-200 text-red-600 hover:bg-red-100'
                        } disabled:opacity-50 disabled:cursor-not-allowed`}
                      >
                        <Trash2 className="w-4 h-4" />
                        Remove
                      </button>
                    )}
                  </div>

                  <p
                    className={`text-sm ${
                      theme === 'dark' ? 'text-slate-400' : 'text-slate-500'
                    }`}
                  >
                    Recommended: Square image, 400x400px or larger. Max 5MB.
                    <br />
                    Supported formats: JPEG, PNG, WebP, GIF
                  </p>

                  {/* Compression Info */}
                  {compressionInfo && (
                    <div
                      className={`flex items-center gap-2 text-sm ${
                        theme === 'dark' ? 'text-emerald-400' : 'text-emerald-600'
                      }`}
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      Compressed: {formatFileSize(compressionInfo.original)} →{' '}
                      {formatFileSize(compressionInfo.compressed)} (
                      {compressionInfo.ratio}% smaller)
                    </div>
                  )}

                  {/* Supabase Status */}
                  {!isSupabaseConfigured() && (
                    <div
                      className={`flex items-center gap-2 text-sm ${
                        theme === 'dark' ? 'text-amber-400' : 'text-amber-600'
                      }`}
                    >
                      <AlertCircle className="w-4 h-4" />
                      Supabase not configured. Using local storage.
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Shop Information */}
          <div
            className={`relative overflow-hidden rounded-2xl border p-6 ${
              theme === 'dark'
                ? 'bg-gradient-to-br from-slate-800/50 to-slate-900/50 border-slate-700/50'
                : 'bg-white border-slate-200 shadow-sm'
            }`}
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-blue-500/20 to-purple-500/10 rounded-full blur-3xl" />
            <div className="relative">
              <div className="flex items-center gap-3 mb-6">
                <div
                  className={`p-2.5 rounded-xl ${
                    theme === 'dark' ? 'bg-blue-500/20' : 'bg-blue-100'
                  }`}
                >
                  <Building2
                    className={`w-5 h-5 ${
                      theme === 'dark' ? 'text-blue-400' : 'text-blue-600'
                    }`}
                  />
                </div>
                <h2
                  className={`text-lg font-semibold ${
                    theme === 'dark' ? 'text-white' : 'text-slate-900'
                  }`}
                >
                  Shop Information
                </h2>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Shop Name */}
                <div className="sm:col-span-2">
                  <label
                    className={`block text-sm font-medium mb-2 ${
                      theme === 'dark' ? 'text-slate-300' : 'text-slate-700'
                    }`}
                  >
                    Shop Name *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => handleChange('name', e.target.value)}
                    disabled={!canEdit}
                    placeholder="e.g., ECOTEC COMPUTER"
                    className={`w-full px-4 py-2.5 rounded-xl border transition-all ${
                      theme === 'dark'
                        ? 'bg-slate-800/50 border-slate-700/50 text-white placeholder-slate-500 focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/20'
                        : 'bg-white border-slate-200 text-slate-900 placeholder-slate-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20'
                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                  />
                </div>

                {/* Sub Name / Tagline */}
                <div>
                  <label
                    className={`block text-sm font-medium mb-2 ${
                      theme === 'dark' ? 'text-slate-300' : 'text-slate-700'
                    }`}
                  >
                    Sub Name
                  </label>
                  <input
                    type="text"
                    value={formData.subName}
                    onChange={(e) => handleChange('subName', e.target.value)}
                    disabled={!canEdit}
                    placeholder="e.g., SOLUTIONS"
                    className={`w-full px-4 py-2.5 rounded-xl border transition-all ${
                      theme === 'dark'
                        ? 'bg-slate-800/50 border-slate-700/50 text-white placeholder-slate-500 focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/20'
                        : 'bg-white border-slate-200 text-slate-900 placeholder-slate-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20'
                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                  />
                </div>

                {/* Tagline */}
                <div>
                  <label
                    className={`block text-sm font-medium mb-2 ${
                      theme === 'dark' ? 'text-slate-300' : 'text-slate-700'
                    }`}
                  >
                    Tagline
                  </label>
                  <input
                    type="text"
                    value={formData.tagline}
                    onChange={(e) => handleChange('tagline', e.target.value)}
                    disabled={!canEdit}
                    placeholder="e.g., Computer Solutions"
                    className={`w-full px-4 py-2.5 rounded-xl border transition-all ${
                      theme === 'dark'
                        ? 'bg-slate-800/50 border-slate-700/50 text-white placeholder-slate-500 focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/20'
                        : 'bg-white border-slate-200 text-slate-900 placeholder-slate-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20'
                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Contact Information */}
          <div
            className={`relative overflow-hidden rounded-2xl border p-6 ${
              theme === 'dark'
                ? 'bg-gradient-to-br from-slate-800/50 to-slate-900/50 border-slate-700/50'
                : 'bg-white border-slate-200 shadow-sm'
            }`}
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-purple-500/20 to-pink-500/10 rounded-full blur-3xl" />
            <div className="relative">
              <div className="flex items-center gap-3 mb-6">
                <div
                  className={`p-2.5 rounded-xl ${
                    theme === 'dark' ? 'bg-purple-500/20' : 'bg-purple-100'
                  }`}
                >
                  <Phone
                    className={`w-5 h-5 ${
                      theme === 'dark' ? 'text-purple-400' : 'text-purple-600'
                    }`}
                  />
                </div>
                <h2
                  className={`text-lg font-semibold ${
                    theme === 'dark' ? 'text-white' : 'text-slate-900'
                  }`}
                >
                  Contact Information
                </h2>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Phone */}
                <div>
                  <label
                    className={`block text-sm font-medium mb-2 ${
                      theme === 'dark' ? 'text-slate-300' : 'text-slate-700'
                    }`}
                  >
                    <Phone className="w-4 h-4 inline-block mr-2" />
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => handleChange('phone', e.target.value)}
                    disabled={!canEdit}
                    placeholder="e.g., 0711453111"
                    className={`w-full px-4 py-2.5 rounded-xl border transition-all ${
                      theme === 'dark'
                        ? 'bg-slate-800/50 border-slate-700/50 text-white placeholder-slate-500 focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/20'
                        : 'bg-white border-slate-200 text-slate-900 placeholder-slate-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20'
                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                  />
                </div>

                {/* Email */}
                <div>
                  <label
                    className={`block text-sm font-medium mb-2 ${
                      theme === 'dark' ? 'text-slate-300' : 'text-slate-700'
                    }`}
                  >
                    <Mail className="w-4 h-4 inline-block mr-2" />
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleChange('email', e.target.value)}
                    disabled={!canEdit}
                    placeholder="e.g., info@ecotec.lk"
                    className={`w-full px-4 py-2.5 rounded-xl border transition-all ${
                      theme === 'dark'
                        ? 'bg-slate-800/50 border-slate-700/50 text-white placeholder-slate-500 focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/20'
                        : 'bg-white border-slate-200 text-slate-900 placeholder-slate-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20'
                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                  />
                </div>

                {/* Website */}
                <div>
                  <label
                    className={`block text-sm font-medium mb-2 ${
                      theme === 'dark' ? 'text-slate-300' : 'text-slate-700'
                    }`}
                  >
                    <Globe className="w-4 h-4 inline-block mr-2" />
                    Website
                  </label>
                  <input
                    type="url"
                    value={formData.website}
                    onChange={(e) => handleChange('website', e.target.value)}
                    disabled={!canEdit}
                    placeholder="e.g., www.ecotec.lk"
                    className={`w-full px-4 py-2.5 rounded-xl border transition-all ${
                      theme === 'dark'
                        ? 'bg-slate-800/50 border-slate-700/50 text-white placeholder-slate-500 focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/20'
                        : 'bg-white border-slate-200 text-slate-900 placeholder-slate-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20'
                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                  />
                </div>

                {/* Address */}
                <div className="sm:col-span-2">
                  <label
                    className={`block text-sm font-medium mb-2 ${
                      theme === 'dark' ? 'text-slate-300' : 'text-slate-700'
                    }`}
                  >
                    <MapPin className="w-4 h-4 inline-block mr-2" />
                    Address
                  </label>
                  <textarea
                    value={formData.address}
                    onChange={(e) => handleChange('address', e.target.value)}
                    disabled={!canEdit}
                    rows={2}
                    placeholder="e.g., No.14, Mulatiyana junction, Mulatiyana, Matara."
                    className={`w-full px-4 py-2.5 rounded-xl border transition-all resize-none ${
                      theme === 'dark'
                        ? 'bg-slate-800/50 border-slate-700/50 text-white placeholder-slate-500 focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/20'
                        : 'bg-white border-slate-200 text-slate-900 placeholder-slate-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20'
                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column - Preview */}
        <div className="space-y-6">
          {/* Preview Card */}
          <div
            className={`relative overflow-hidden rounded-2xl border p-6 ${
              theme === 'dark'
                ? 'bg-gradient-to-br from-slate-800/50 to-slate-900/50 border-slate-700/50'
                : 'bg-white border-slate-200 shadow-sm'
            }`}
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-amber-500/20 to-orange-500/10 rounded-full blur-3xl" />
            <div className="relative">
              <div className="flex items-center gap-3 mb-6">
                <div
                  className={`p-2.5 rounded-xl ${
                    theme === 'dark' ? 'bg-amber-500/20' : 'bg-amber-100'
                  }`}
                >
                  <FileText
                    className={`w-5 h-5 ${
                      theme === 'dark' ? 'text-amber-400' : 'text-amber-600'
                    }`}
                  />
                </div>
                <h2
                  className={`text-lg font-semibold ${
                    theme === 'dark' ? 'text-white' : 'text-slate-900'
                  }`}
                >
                  PDF Header Preview
                </h2>
              </div>

              {/* Simulated PDF Header */}
              <div
                className={`rounded-xl border p-6 ${
                  theme === 'dark'
                    ? 'bg-white border-slate-600'
                    : 'bg-white border-slate-300'
                }`}
              >
                <div className="flex justify-between items-start border-b-2 border-black pb-4">
                  {/* Left - Company Section */}
                  <div className="flex items-start gap-3">
                    {/* Logo */}
                    <div className="w-12 h-12 rounded-full border-2 border-black flex items-center justify-center overflow-hidden bg-white flex-shrink-0">
                      {logoPreview ? (
                        <img
                          src={logoPreview}
                          alt="Logo"
                          className="w-10 h-10 object-contain rounded-full"
                        />
                      ) : (
                        <Building2 className="w-6 h-6 text-gray-400" />
                      )}
                    </div>

                    {/* Company Info */}
                    <div>
                      <h1 className="text-lg font-bold text-black leading-tight">
                        {formData.name || 'SHOP NAME'}
                      </h1>
                      {formData.subName && (
                        <div className="text-xs font-semibold text-black">
                          {formData.subName}
                        </div>
                      )}
                      <div className="text-xs text-black mt-1 leading-relaxed">
                        {formData.address
                          ?.split(',')
                          .map((line, i) => (
                            <React.Fragment key={i}>
                              {line.trim()}
                              {i <
                                (formData.address?.split(',').length || 0) -
                                  1 && <br />}
                            </React.Fragment>
                          )) || 'Address'}
                      </div>
                    </div>
                  </div>

                  {/* Right - Contact Box */}
                  <div className="text-right">
                    <h3 className="text-xs font-semibold text-black underline mb-1">
                      Contact information
                    </h3>
                    <div className="text-xs text-black leading-relaxed">
                      {formData.email || 'email@example.com'}
                      <br />
                      {formData.phone || '0XX-XXXXXXX'}
                    </div>
                  </div>
                </div>

                <p className="text-center text-xs text-gray-500 mt-4">
                  This is how your header will appear on invoices and documents
                </p>
              </div>
            </div>
          </div>

          {/* Full Invoice Preview */}
          {showPreview && (
            <div
              className={`relative overflow-hidden rounded-2xl border ${
                theme === 'dark'
                  ? 'bg-slate-800/50 border-slate-700/50'
                  : 'bg-white border-slate-200 shadow-sm'
              }`}
            >
              <div
                className={`p-4 border-b ${
                  theme === 'dark' ? 'border-slate-700' : 'border-slate-200'
                }`}
              >
                <h3
                  className={`font-semibold ${
                    theme === 'dark' ? 'text-white' : 'text-slate-900'
                  }`}
                >
                  Full Invoice Preview
                </h3>
                <p
                  className={`text-sm ${
                    theme === 'dark' ? 'text-slate-400' : 'text-slate-500'
                  }`}
                >
                  Scroll to see the full invoice layout
                </p>
              </div>
              <div className="max-h-[600px] overflow-y-auto p-4 bg-gray-100">
                <div className="transform scale-[0.6] origin-top">
                  <PrintableInvoice
                    invoice={mockInvoiceForPreview}
                    branding={getPreviewBranding()}
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ShopSettings;
