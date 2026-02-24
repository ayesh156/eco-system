/**
 * Shop Branding Tab Component
 * Integrated into Shop Admin Panel for logo, branding, and PDF header customization
 * Features: Image compression, Supabase storage, copy-paste support, header preview
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import { useShopBranding } from '../../contexts/ShopBrandingContext';
import { compressImage, validateImageFile, formatFileSize } from '../../lib/imageCompression';
import { replaceLogo, isSupabaseConfigured } from '../../services/supabaseStorageService';
import {
  Building2,
  Image,
  Upload,
  Trash2,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Phone,
  Mail,
  Globe,
  MapPin,
  Eye,
  Clipboard,
  Info,
} from 'lucide-react';
import toast from 'react-hot-toast';

export const ShopBrandingTab: React.FC = () => {
  const { theme } = useTheme();
  const { user } = useAuth();
  const {
    branding,
    updateBranding,
    hasUnsavedChanges,
  } = useShopBranding();

  // Local form state
  const [formData, setFormData] = useState({
    name: '',
    subName: '',
    tagline: '',
    address: '',
    phone: '',
    email: '',
    website: '',
  });

  // Logo state
  const [logoPreview, setLogoPreview] = useState<string | undefined>(branding.logo);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [compressionInfo, setCompressionInfo] = useState<{
    original: number;
    compressed: number;
    ratio: number;
  } | null>(null);

  // UI state
  const [isDragOver, setIsDragOver] = useState(false);

  // Refs
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);

  // Check if user can edit
  const canEdit = user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN';
  const shopId = user?.shop?.id;

  // Initialize form with branding data
  useEffect(() => {
    setFormData({
      name: branding.name || '',
      subName: branding.subName || '',
      tagline: branding.tagline || '',
      address: branding.address || '',
      phone: branding.phone || '',
      email: branding.email || '',
      website: branding.website || '',
    });
    setLogoPreview(branding.logo);
  }, [branding]);

  // Handle form field changes
  const handleChange = (field: keyof typeof formData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    updateBranding({ [field]: value });
  };

  // Process image file (shared between file select, drag-drop, and paste)
  const processImageFile = useCallback(async (file: File) => {
    // Validate file
    const validation = validateImageFile(file);
    if (!validation.valid) {
      toast.error(validation.error || 'Invalid file');
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
  }, [shopId, branding.logo, updateBranding]);

  // Handle file input change
  const handleLogoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    await processImageFile(file);

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Handle drag and drop
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (canEdit && !isUploadingLogo) {
      setIsDragOver(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    if (!canEdit || isUploadingLogo) return;

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      await processImageFile(files[0]);
    }
  };

  // Handle paste from clipboard
  const handlePaste = useCallback(async (e: ClipboardEvent) => {
    if (!canEdit || isUploadingLogo) return;

    const items = e.clipboardData?.items;
    if (!items) return;

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.type.startsWith('image/')) {
        e.preventDefault();
        const file = item.getAsFile();
        if (file) {
          toast.loading('Processing pasted image...', { id: 'paste-processing' });
          await processImageFile(file);
          toast.dismiss('paste-processing');
        }
        break;
      }
    }
  }, [canEdit, isUploadingLogo, processImageFile]);

  // Add paste event listener
  useEffect(() => {
    document.addEventListener('paste', handlePaste);
    return () => {
      document.removeEventListener('paste', handlePaste);
    };
  }, [handlePaste]);

  // Handle logo removal
  const handleRemoveLogo = () => {
    setLogoPreview(undefined);
    updateBranding({ logo: undefined });
    setCompressionInfo(null);
    toast('Logo removed. Save to apply changes.');
  };

  return (
    <div className="space-y-6">
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
            <h3
              className={`text-lg font-semibold ${
                theme === 'dark' ? 'text-white' : 'text-slate-900'
              }`}
            >
              Shop Logo
            </h3>
          </div>

          <div className="flex flex-col sm:flex-row items-start gap-6">
            {/* Logo Preview & Drop Zone */}
            <div
              ref={dropZoneRef}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => canEdit && !isUploadingLogo && fileInputRef.current?.click()}
              className={`relative w-32 h-32 rounded-xl border-2 border-dashed flex items-center justify-center overflow-hidden cursor-pointer transition-all ${
                isDragOver
                  ? theme === 'dark'
                    ? 'border-emerald-500 bg-emerald-500/10 scale-105'
                    : 'border-emerald-500 bg-emerald-50 scale-105'
                  : theme === 'dark'
                    ? 'border-slate-600 bg-slate-800/50 hover:border-slate-500'
                    : 'border-slate-300 bg-slate-50 hover:border-slate-400'
              } ${!canEdit || isUploadingLogo ? 'cursor-not-allowed opacity-60' : ''}`}
            >
              {isUploadingLogo ? (
                <div className="flex flex-col items-center gap-2">
                  <Loader2 className={`w-8 h-8 animate-spin ${theme === 'dark' ? 'text-emerald-400' : 'text-emerald-600'}`} />
                  <span className={`text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                    Processing...
                  </span>
                </div>
              ) : logoPreview ? (
                <img
                  src={logoPreview}
                  alt="Shop Logo"
                  className="w-full h-full object-contain"
                />
              ) : (
                <div className="flex flex-col items-center gap-2 p-2 text-center">
                  <Building2
                    className={`w-10 h-10 ${
                      theme === 'dark' ? 'text-slate-600' : 'text-slate-400'
                    }`}
                  />
                  <span className={`text-xs ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>
                    Click or Drop
                  </span>
                </div>
              )}

              {/* Drag overlay */}
              {isDragOver && (
                <div className={`absolute inset-0 flex items-center justify-center ${
                  theme === 'dark' ? 'bg-emerald-500/20' : 'bg-emerald-500/10'
                }`}>
                  <Upload className={`w-8 h-8 ${theme === 'dark' ? 'text-emerald-400' : 'text-emerald-600'}`} />
                </div>
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
                  Upload
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

              {/* Paste Hint */}
              <div className={`flex items-center gap-2 text-sm ${
                theme === 'dark' ? 'text-slate-400' : 'text-slate-500'
              }`}>
                <Clipboard className="w-4 h-4" />
                <span>Tip: You can also <strong>Ctrl+V</strong> to paste an image from clipboard!</span>
              </div>

              <p
                className={`text-sm ${
                  theme === 'dark' ? 'text-slate-400' : 'text-slate-500'
                }`}
              >
                Recommended: Square image, 400x400px or larger. Max 5MB.
                <br />
                Formats: JPEG, PNG, WebP, GIF
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
            <h3
              className={`text-lg font-semibold ${
                theme === 'dark' ? 'text-white' : 'text-slate-900'
              }`}
            >
              Shop Information
            </h3>
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

            {/* Sub Name */}
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
              <p className={`text-xs mt-1 ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>
                Appears below shop name
              </p>
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
                placeholder="e.g., Your Trusted Tech Partner"
                className={`w-full px-4 py-2.5 rounded-xl border transition-all ${
                  theme === 'dark'
                    ? 'bg-slate-800/50 border-slate-700/50 text-white placeholder-slate-500 focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/20'
                    : 'bg-white border-slate-200 text-slate-900 placeholder-slate-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              />
              <p className={`text-xs mt-1 ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>
                Stylish slogan below header
              </p>
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
            <h3
              className={`text-lg font-semibold ${
                theme === 'dark' ? 'text-white' : 'text-slate-900'
              }`}
            >
              Contact Information
            </h3>
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
                Phone
              </label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => handleChange('phone', e.target.value)}
                disabled={!canEdit}
                placeholder="e.g., 0711453111"
                className={`w-full px-4 py-2.5 rounded-xl border transition-all ${
                  theme === 'dark'
                    ? 'bg-slate-800/50 border-slate-700/50 text-white placeholder-slate-500'
                    : 'bg-white border-slate-200 text-slate-900 placeholder-slate-400'
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
                Email
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => handleChange('email', e.target.value)}
                disabled={!canEdit}
                placeholder="e.g., info@ecotec.lk"
                className={`w-full px-4 py-2.5 rounded-xl border transition-all ${
                  theme === 'dark'
                    ? 'bg-slate-800/50 border-slate-700/50 text-white placeholder-slate-500'
                    : 'bg-white border-slate-200 text-slate-900 placeholder-slate-400'
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
                    ? 'bg-slate-800/50 border-slate-700/50 text-white placeholder-slate-500'
                    : 'bg-white border-slate-200 text-slate-900 placeholder-slate-400'
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
                    ? 'bg-slate-800/50 border-slate-700/50 text-white placeholder-slate-500'
                    : 'bg-white border-slate-200 text-slate-900 placeholder-slate-400'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Document Header Preview - At Bottom */}
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
          <div className="flex items-center gap-3">
            <div
              className={`p-2 rounded-lg ${
                theme === 'dark' ? 'bg-amber-500/20' : 'bg-amber-100'
              }`}
            >
              <Eye
                className={`w-4 h-4 ${
                  theme === 'dark' ? 'text-amber-400' : 'text-amber-600'
                }`}
              />
            </div>
            <div>
              <h3
                className={`font-semibold ${
                  theme === 'dark' ? 'text-white' : 'text-slate-900'
                }`}
              >
                Document Header Preview
              </h3>
              <p
                className={`text-xs ${
                  theme === 'dark' ? 'text-slate-400' : 'text-slate-500'
                }`}
              >
                How your header will appear on invoices and documents
              </p>
            </div>
          </div>
        </div>

        {/* Header Only Preview */}
        <div className="p-3 sm:p-4 md:p-6">
          <div className="rounded-xl border p-3 sm:p-4 md:p-6 bg-white border-slate-300">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 sm:gap-4 border-b-2 border-black pb-3 sm:pb-4">
              {/* Left - Company Section */}
              <div className="flex items-center gap-2 sm:gap-3">
                {/* Logo */}
                <div className="flex items-center justify-center bg-white flex-shrink-0" style={{ width: 'auto', maxWidth: '80px', maxHeight: '56px' }}>
                  {logoPreview ? (
                    <img
                      src={logoPreview}
                      alt="Logo"
                      className="sm:max-w-[120px] sm:max-h-[80px]"
                      style={{ width: 'auto', height: 'auto', maxWidth: '80px', maxHeight: '56px', objectFit: 'contain' }}
                    />
                  ) : (
                    <Building2 className="w-8 h-8 sm:w-10 sm:h-10 text-gray-400" />
                  )}
                </div>

                {/* Company Info */}
                <div className="min-w-0">
                  <h1 className="text-sm sm:text-base md:text-lg font-bold text-black leading-tight truncate">
                    {formData.name || 'SHOP NAME'}
                  </h1>
                  {formData.subName && (
                    <div className="text-[10px] sm:text-xs font-semibold text-black truncate">
                      {formData.subName}
                    </div>
                  )}
                  <div className="text-[10px] sm:text-xs text-black mt-0.5 sm:mt-1 leading-relaxed line-clamp-2 sm:line-clamp-none">
                    {formData.address
                      ?.split(',')
                      .map((line, i) => (
                        <React.Fragment key={i}>
                          {line.trim()}
                          {i < (formData.address?.split(',').length || 0) - 1 && <br />}
                        </React.Fragment>
                      )) || 'Address'}
                  </div>
                </div>
              </div>

              {/* Right - Contact Box */}
              <div className="text-left sm:text-right flex flex-col justify-center border-t sm:border-t-0 border-gray-200 pt-2 sm:pt-0 flex-shrink-0">
                <h3 className="text-[10px] sm:text-xs font-semibold text-black underline mb-0.5 sm:mb-1">
                  Contact information
                </h3>
                <div className="text-[10px] sm:text-xs text-black leading-relaxed">
                  {formData.email || 'email@example.com'}
                  <br />
                  {formData.phone || '0XX-XXXXXXX'}
                </div>
              </div>
            </div>
            
            {/* Creative Tagline Banner */}
            {formData.tagline && (
              <div className="mt-2 sm:mt-3 text-center">
                <span className="inline-block px-2 sm:px-4 py-1 sm:py-1.5 text-[10px] sm:text-xs font-medium text-gray-600 italic tracking-wide border-t border-b border-gray-300">
                  ✨ {formData.tagline} ✨
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ShopBrandingTab;
