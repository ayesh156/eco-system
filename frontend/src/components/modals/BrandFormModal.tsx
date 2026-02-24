import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../ui/dialog';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Skeleton, SkeletonInput } from '../ui/skeleton';
import { brandService } from '../../services/brandService';
import type { BrandSuggestion } from '../../services/brandService';
import { 
  uploadBrandImage, 
  deleteBrandImage,
  isSupabaseConfigured,
  isSupabaseUrl,
  isBase64DataUrl,
  base64ToFile 
} from '../../services/brandCategoryImageService';
import { Building2, Tag, FileText, Save, Plus, Globe, Mail, Phone, Upload, X, Loader2, Image as ImageIcon, AlertCircle, Database, Sparkles } from 'lucide-react';

export interface Brand {
  id: string;
  name: string;
  description?: string;
  website?: string;
  contactEmail?: string;
  contactPhone?: string;
  image?: string;
  productCount: number;
}

interface BrandFormModalProps {
  isOpen: boolean;
  brand?: Brand | null;
  onClose: () => void;
  onSave: (brand: Brand) => void;
  shopId?: string;  // For SuperAdmin shop viewing
}

interface BrandFormData {
  name: string;
  description: string;
  website: string;
  contactEmail: string;
  contactPhone: string;
  image: string;
}

export const BrandFormModal: React.FC<BrandFormModalProps> = ({
  isOpen,
  brand,
  onClose,
  onSave,
  shopId,
}) => {
  const { theme } = useTheme();
  const { user } = useAuth();
  
  const [formData, setFormData] = useState<BrandFormData>({
    name: '',
    description: '',
    website: '',
    contactEmail: '',
    contactPhone: '',
    image: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isLoadingBrand, setIsLoadingBrand] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  
  // Track if we have a pending image file to upload to Supabase
  const [pendingImageFile, setPendingImageFile] = useState<File | null>(null);
  
  // Track original image URL for deletion when replacing
  const [originalImageUrl, setOriginalImageUrl] = useState<string>('');
  
  // Brand name suggestions from database
  const [brandSuggestions, setBrandSuggestions] = useState<BrandSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const [isFillingFromSuggestion, setIsFillingFromSuggestion] = useState(false);
  const [fillProgress, setFillProgress] = useState(0);
  const [selectedSuggestionName, setSelectedSuggestionName] = useState<string | null>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  // Load brand data from API when editing
  useEffect(() => {
    const loadBrandData = async () => {
      if (!isOpen) return;
      
      if (brand) {
        // Editing existing brand - load fresh data from API
        setIsLoadingBrand(true);
        setLoadError(null);
        
        try {
          const freshBrandData = await brandService.getById(brand.id, shopId);
          setFormData({
            name: freshBrandData.name,
            description: freshBrandData.description || '',
            website: freshBrandData.website || '',
            contactEmail: (freshBrandData as any).contactEmail || '',
            contactPhone: (freshBrandData as any).contactPhone || '',
            image: freshBrandData.image || '',
          });
          // Track original image for deletion if changed
          setOriginalImageUrl(freshBrandData.image || '');
        } catch (error) {
          console.error('Failed to load brand data:', error);
          setLoadError(error instanceof Error ? error.message : 'Failed to load brand details');
          // Fallback to passed brand data
          setFormData({
            name: brand.name,
            description: brand.description || '',
            website: brand.website || '',
            contactEmail: '',
            contactPhone: '',
            image: brand.image || '',
          });
          setOriginalImageUrl(brand.image || '');
        } finally {
          setIsLoadingBrand(false);
        }
      } else {
        // Adding new brand - reset form
        setFormData({
          name: '',
          description: '',
          website: '',
          contactEmail: '',
          contactPhone: '',
          image: '',
        });
        setIsLoadingBrand(false);
      }
      
      setErrors({});
      setUploadError(null);
      setIsUploading(false);
      setUploadProgress(0);
      setPendingImageFile(null);
      if (!brand) setOriginalImageUrl('');
    };
    
    loadBrandData();
  }, [brand, isOpen]);

  // Compress image to base64 for preview
  const compressImageToBase64 = (file: File, maxWidth: number = 400, quality: number = 0.85): Promise<string> => {
    return new Promise((resolve, reject) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();
      
      img.onload = () => {
        let { width, height } = img;
        
        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }
        
        canvas.width = width;
        canvas.height = height;
        
        ctx?.drawImage(img, 0, 0, width, height);
        
        const compressedBase64 = canvas.toDataURL('image/jpeg', quality);
        resolve(compressedBase64);
      };
      
      img.onerror = reject;
      img.src = URL.createObjectURL(file);
    });
  };

  // Handle image upload (stores file for later Supabase upload)
  const handleImageUpload = useCallback(async (file: File) => {
    if (!file.type.startsWith('image/')) {
      setUploadError('Please select an image file');
      return;
    }
    
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      setUploadError('Image must be less than 10MB');
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);
    setUploadError(null);

    try {
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return prev;
          }
          return prev + Math.random() * 15;
        });
      }, 100);

      // Compress for preview
      const compressedBase64 = await compressImageToBase64(file);
      
      clearInterval(progressInterval);
      setUploadProgress(100);
      
      setTimeout(() => {
        // Store compressed preview and original file
        setFormData(prev => ({ ...prev, image: compressedBase64 }));
        setPendingImageFile(file);
        setIsUploading(false);
        setUploadProgress(0);
      }, 300);
    } catch (error) {
      console.error('Image processing error:', error);
      setUploadError('Failed to process image');
      setIsUploading(false);
      setUploadProgress(0);
    }
  }, []);

  // Handle paste from clipboard
  const handlePaste = useCallback(async (e: ClipboardEvent) => {
    if (!isOpen) return;
    
    const items = e.clipboardData?.items;
    if (!items) return;

    for (const item of items) {
      if (item.type.startsWith('image/')) {
        e.preventDefault();
        const file = item.getAsFile();
        if (file) {
          await handleImageUpload(file);
        }
        break;
      }
    }
  }, [isOpen, handleImageUpload]);

  useEffect(() => {
    document.addEventListener('paste', handlePaste);
    return () => document.removeEventListener('paste', handlePaste);
  }, [handlePaste]);

  // Handle drag and drop
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const file = e.dataTransfer.files[0];
    if (file) {
      await handleImageUpload(file);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleImageUpload(file);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removeImage = () => {
    setFormData(prev => ({ ...prev, image: '' }));
    setPendingImageFile(null);
    setUploadError(null);
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.name.trim()) {
      newErrors.name = 'Brand name is required';
    }
    
    if (formData.website && !formData.website.match(/^https?:\/\/.+/)) {
      newErrors.website = 'Website must be a valid URL (starting with http:// or https://)';
    }
    
    if (formData.contactEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.contactEmail)) {
      newErrors.contactEmail = 'Invalid email format';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    
    setIsSaving(true);
    setUploadError(null);
    
    try {
      let finalImageUrl = formData.image;
      const hasNewImage = pendingImageFile || (isBase64DataUrl(formData.image) && formData.image !== originalImageUrl);
      const imageWasRemoved = !formData.image && originalImageUrl;
      
      // Delete old Supabase image if replacing with new one or removing
      if ((hasNewImage || imageWasRemoved) && originalImageUrl && isSupabaseUrl(originalImageUrl) && isSupabaseConfigured()) {
        console.log('🗑️ Deleting old brand image from Supabase:', originalImageUrl);
        await deleteBrandImage(originalImageUrl);
      }
      
      // Upload new image to Supabase if we have a pending file or base64 image
      if (pendingImageFile && isSupabaseConfigured() && user?.shop?.id) {
        const uploadResult = await uploadBrandImage(
          pendingImageFile,
          user.shop.id,
          brand?.id
        );
        
        if (uploadResult.success && uploadResult.url) {
          finalImageUrl = uploadResult.url;
          console.log('✅ Brand image uploaded to Supabase:', finalImageUrl);
        } else if (uploadResult.error) {
          console.warn('Image upload to Supabase failed, using base64:', uploadResult.error);
          // Continue with base64 as fallback
        }
      } else if (isBase64DataUrl(formData.image) && isSupabaseConfigured() && user?.shop?.id) {
        // Convert base64 to file and upload
        const file = base64ToFile(formData.image, `brand_${Date.now()}.jpg`);
        const uploadResult = await uploadBrandImage(file, user.shop.id, brand?.id);
        
        if (uploadResult.success && uploadResult.url) {
          finalImageUrl = uploadResult.url;
          console.log('✅ Brand image (from base64) uploaded to Supabase:', finalImageUrl);
        }
      }
      
      // If image was removed, ensure we send empty/null
      if (imageWasRemoved) {
        finalImageUrl = '';
      }
      
      const newBrand: Brand = {
        id: brand?.id || `brand-${Date.now()}`,
        name: formData.name,
        description: formData.description,
        website: formData.website,
        image: finalImageUrl,
        productCount: brand?.productCount || 0,
      };
      
      // Hand off saving to parent. Parent will call the API and update the list.
      onSave({
        ...newBrand,
        website: formData.website,
        contactEmail: formData.contactEmail,
        contactPhone: formData.contactPhone,
        image: finalImageUrl,
      });
      onClose();
    } catch (error) {
      console.error('Failed to save brand:', error);
      setUploadError(error instanceof Error ? error.message : 'Failed to save brand');
    } finally {
      setIsSaving(false);
    }
  };

  const handleChange = (field: keyof BrandFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  // Fetch brand suggestions when name changes
  useEffect(() => {
    const fetchSuggestions = async () => {
      if (!formData.name || formData.name.length < 2 || brand) {
        setBrandSuggestions([]);
        setShowSuggestions(false);
        return;
      }
      
      setIsLoadingSuggestions(true);
      setShowSuggestions(true); // Show dropdown while loading
      try {
        const suggestions = await brandService.getSuggestions(formData.name);
        const filtered = suggestions.filter(s => 
          s.name.toLowerCase().includes(formData.name.toLowerCase())
        );
        setBrandSuggestions(filtered);
        setShowSuggestions(filtered.length > 0);
      } catch (error) {
        console.log('Failed to fetch suggestions:', error);
        setBrandSuggestions([]);
        setShowSuggestions(false);
      } finally {
        setIsLoadingSuggestions(false);
      }
    };

    const debounce = setTimeout(fetchSuggestions, 300);
    return () => clearTimeout(debounce);
  }, [formData.name, brand]);

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (suggestionsRef.current && !suggestionsRef.current.contains(event.target as Node) &&
          nameInputRef.current && !nameInputRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Handle selecting a suggestion with animated loading
  const handleSelectSuggestion = async (suggestion: BrandSuggestion) => {
    setShowSuggestions(false);
    setBrandSuggestions([]);
    setSelectedSuggestionName(suggestion.name);
    setIsFillingFromSuggestion(true);
    setFillProgress(0);

    // Animated progress simulation for premium feel
    const steps = [
      { progress: 15, delay: 100 },
      { progress: 35, delay: 150 },
      { progress: 55, delay: 120 },
      { progress: 75, delay: 130 },
      { progress: 90, delay: 100 },
      { progress: 100, delay: 80 },
    ];

    for (const step of steps) {
      await new Promise(resolve => setTimeout(resolve, step.delay));
      setFillProgress(step.progress);
    }

    // Fill form data with ALL fields
    setFormData(prev => ({
      ...prev,
      name: suggestion.name,
      description: suggestion.description || prev.description,
      image: suggestion.image || prev.image,
      website: suggestion.website || prev.website,
      contactEmail: suggestion.contactEmail || prev.contactEmail,
      contactPhone: suggestion.contactPhone || prev.contactPhone,
    }));

    // Brief delay before hiding loader for smooth transition
    await new Promise(resolve => setTimeout(resolve, 300));
    setIsFillingFromSuggestion(false);
    setSelectedSuggestionName(null);
    setFillProgress(0);
  };

  const isEditing = !!brand;

  // Skeleton Loading UI for Edit Mode
  const renderSkeletonForm = () => (
    <div className="p-6 space-y-6">
      {/* Image Upload Skeleton */}
      <div className="space-y-2">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-32 w-full rounded-xl" />
      </div>
      
      {/* Brand Name Skeleton */}
      <div className="space-y-2">
        <Skeleton className="h-4 w-28" />
        <SkeletonInput />
      </div>
      
      {/* Website Skeleton */}
      <div className="space-y-2">
        <Skeleton className="h-4 w-20" />
        <SkeletonInput />
      </div>
      
      {/* Contact Email Skeleton */}
      <div className="space-y-2">
        <Skeleton className="h-4 w-28" />
        <SkeletonInput />
      </div>
      
      {/* Contact Phone Skeleton */}
      <div className="space-y-2">
        <Skeleton className="h-4 w-28" />
        <SkeletonInput />
      </div>
      
      {/* Description Skeleton */}
      <div className="space-y-2">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-20 w-full rounded-xl" />
      </div>
      
      {/* Action Buttons Skeleton */}
      <div className={`flex gap-3 pt-4 border-t ${theme === 'dark' ? 'border-slate-700' : 'border-slate-200'}`}>
        <Skeleton className="h-10 flex-1 rounded-xl" />
        <Skeleton className="h-10 flex-1 rounded-xl" />
      </div>
    </div>
  );

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className={`max-w-md max-h-[90vh] overflow-y-auto p-0 ${
        theme === 'dark' ? 'bg-slate-900 border-slate-700/50' : 'bg-white border-slate-200'
      }`}>
        <DialogHeader className="sr-only">
          <DialogTitle>{isEditing ? 'Edit Brand' : 'Add New Brand'}</DialogTitle>
          <DialogDescription>
            {isEditing ? 'Update brand information' : 'Add a new brand'}
          </DialogDescription>
        </DialogHeader>

        {/* Gradient Header */}
        <div className={`p-4 sm:p-6 text-white ${isEditing 
          ? 'bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-500' 
          : 'bg-gradient-to-r from-emerald-500 via-teal-500 to-teal-500'
        }`} aria-hidden="true">
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="w-10 h-10 sm:w-14 sm:h-14 bg-white/20 backdrop-blur rounded-lg sm:rounded-xl flex items-center justify-center flex-shrink-0">
              {isEditing ? <Building2 className="w-5 h-5 sm:w-7 sm:h-7" /> : <Plus className="w-5 h-5 sm:w-7 sm:h-7" />}
            </div>
            <div className="min-w-0">
              <h2 className="text-lg sm:text-2xl font-bold truncate">
                {isEditing ? 'Edit Brand' : 'Add New Brand'}
              </h2>
              <p className="text-xs sm:text-sm text-emerald-100">
                {isEditing ? 'Update brand details' : 'Create a new product brand'}
              </p>
            </div>
          </div>
        </div>

        {/* Show skeleton when loading brand data */}
        {isLoadingBrand ? (
          renderSkeletonForm()
        ) : loadError ? (
          <div className="p-6">
            <div className={`p-4 rounded-xl flex items-center gap-3 ${
              theme === 'dark' ? 'bg-red-500/10 border border-red-500/20' : 'bg-red-50 border border-red-200'
            }`}>
              <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
              <div>
                <p className={`text-sm font-medium ${theme === 'dark' ? 'text-red-400' : 'text-red-700'}`}>
                  Failed to load brand
                </p>
                <p className={`text-xs ${theme === 'dark' ? 'text-red-400/70' : 'text-red-600'}`}>
                  {loadError}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className={`mt-4 w-full px-4 py-2.5 rounded-xl font-medium transition-colors border ${
                theme === 'dark'
                  ? 'bg-slate-700/50 hover:bg-slate-700 text-white border-slate-600/50'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-900 border-slate-300'
              }`}
            >
              Close
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4 sm:space-y-6 relative">
            {/* Suggestion Fill Loading Overlay */}
            {isFillingFromSuggestion && (
              <div className="absolute inset-0 z-50 bg-gradient-to-br from-slate-900/95 via-slate-900/98 to-slate-950/95 backdrop-blur-sm flex flex-col items-center justify-center rounded-b-2xl">
                {/* Animated rings */}
                <div className="relative w-32 h-32 mb-6">
                  <div className="absolute inset-0 rounded-full border-4 border-emerald-500/20 animate-ping" style={{ animationDuration: '2s' }} />
                  <div className="absolute inset-2 rounded-full border-4 border-teal-500/30 animate-ping" style={{ animationDuration: '1.5s', animationDelay: '0.2s' }} />
                  <div className="absolute inset-4 rounded-full border-4 border-cyan-500/40 animate-ping" style={{ animationDuration: '1s', animationDelay: '0.4s' }} />
                  
                  {/* Center icon with glow */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="relative">
                      <div className="absolute inset-0 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full blur-xl opacity-60 animate-pulse" />
                      <div className="relative w-16 h-16 bg-gradient-to-br from-emerald-500 via-teal-500 to-teal-500 rounded-full flex items-center justify-center shadow-2xl">
                        <Building2 className="w-8 h-8 text-white animate-pulse" />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="w-48 mb-4">
                  <div className="h-2 bg-slate-700/50 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-emerald-500 via-teal-500 to-teal-500 rounded-full transition-all duration-200 ease-out"
                      style={{ width: `${fillProgress}%` }}
                    />
                  </div>
                  <p className="text-center text-xs text-slate-400 mt-2">{fillProgress}%</p>
                </div>

                {/* Loading text */}
                <div className="text-center">
                  <h3 className="text-lg font-semibold text-white mb-1 flex items-center gap-2 justify-center">
                    <Sparkles className="w-5 h-5 text-emerald-400 animate-pulse" />
                    Loading Brand Details
                  </h3>
                  <p className="text-sm text-slate-400">
                    Fetching <span className="text-emerald-400 font-medium">{selectedSuggestionName}</span>
                  </p>
                </div>

                {/* Floating particles effect */}
                <div className="absolute inset-0 overflow-hidden pointer-events-none">
                  {[...Array(6)].map((_, i) => (
                    <div
                      key={i}
                      className="absolute w-2 h-2 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full opacity-40"
                      style={{
                        left: `${15 + i * 15}%`,
                        bottom: '-10px',
                        animation: `float ${2 + i * 0.3}s ease-in-out infinite`,
                        animationDelay: `${i * 0.2}s`,
                      }}
                    />
                  ))}
                </div>
                
                <style>{`
                  @keyframes float {
                    0%, 100% { transform: translateY(0) scale(1); opacity: 0.4; }
                    50% { transform: translateY(-100px) scale(1.5); opacity: 0; }
                  }
                `}</style>
              </div>
            )}

            {/* Hidden file input */}
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileInputChange}
              accept="image/*"
              className="hidden"
            />

            {/* Brand Logo Upload */}
            <div className="space-y-2">
              <Label className={`flex items-center gap-2 ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                <ImageIcon className="w-4 h-4" />
                Brand Logo
                {isSupabaseConfigured() && (
                  <span className="text-xs text-emerald-500">(Uploads to cloud)</span>
                )}
              </Label>
              <div
                ref={dropZoneRef}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => !isUploading && !isSaving && fileInputRef.current?.click()}
                className={`relative rounded-xl border-2 border-dashed transition-all cursor-pointer ${
                  isDragging
                    ? 'border-emerald-500 bg-emerald-500/10'
                    : theme === 'dark'
                      ? 'border-slate-700 hover:border-slate-600 bg-slate-800/50'
                      : 'border-slate-300 hover:border-slate-400 bg-slate-50'
                }`}
              >
                {isUploading ? (
                  <div className="p-8 flex flex-col items-center justify-center gap-3">
                    <div className="relative">
                      <Loader2 className="w-10 h-10 text-emerald-500 animate-spin" />
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-xs font-bold text-emerald-500">{Math.round(uploadProgress)}%</span>
                      </div>
                    </div>
                    <p className={`text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                      Processing image...
                    </p>
                  </div>
                ) : formData.image ? (
                  <div className="p-4 flex items-center gap-4">
                    <div className={`w-20 h-20 rounded-xl overflow-hidden bg-white border flex items-center justify-center ${
                      theme === 'dark' ? 'border-slate-700' : 'border-slate-200'
                    }`}>
                      <img 
                        src={formData.image} 
                        alt="Brand logo" 
                        className="w-full h-full object-contain p-1"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = '';
                        }}
                      />
                    </div>
                    <div className="flex-1">
                      <p className={`text-sm font-medium ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                        Logo {pendingImageFile ? 'ready to upload' : 'uploaded'}
                      </p>
                      <p className={`text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                        Click to change or drag a new image
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeImage();
                      }}
                      disabled={isSaving}
                      className={`p-2 rounded-lg transition-colors ${
                        theme === 'dark' ? 'hover:bg-red-500/10 text-red-400' : 'hover:bg-red-50 text-red-500'
                      } disabled:opacity-50`}
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                ) : (
                  <div className="p-8 flex flex-col items-center justify-center gap-3">
                    <div className={`p-3 rounded-xl ${theme === 'dark' ? 'bg-slate-700' : 'bg-slate-200'}`}>
                      <Upload className={`w-6 h-6 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`} />
                    </div>
                    <div className="text-center">
                      <p className={`text-sm font-medium ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                        Drop logo here or click to upload
                      </p>
                      <p className={`text-xs mt-1 ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>
                        Or paste from clipboard (Ctrl+V)
                      </p>
                    </div>
                  </div>
                )}
              </div>
              
              {/* Upload Error */}
              {uploadError && (
                <p className="text-xs text-red-500 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  {uploadError}
                </p>
              )}
            </div>

            {/* Brand Name */}
            <div className="space-y-2 relative">
              <Label htmlFor="name" className={`flex items-center gap-2 ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                <Tag className="w-4 h-4" />
                Brand Name <span className="text-red-500">*</span>
              </Label>
              <div className="relative">
                <Input
                  ref={nameInputRef}
                  id="name"
                  value={formData.name}
                  onChange={(e) => handleChange('name', e.target.value)}
                  onFocus={() => formData.name.length >= 2 && !brand && setShowSuggestions(true)}
                  placeholder="Enter brand name"
                  disabled={isSaving}
                  autoComplete="off"
                  className={`${
                    theme === 'dark' 
                      ? 'bg-slate-800 border-slate-700 text-white placeholder:text-slate-500' 
                      : 'bg-white border-slate-200'
                  } ${errors.name ? 'border-red-500' : ''}`}
                />
                {isLoadingSuggestions && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <Loader2 className="w-4 h-4 animate-spin text-emerald-500" />
                  </div>
                )}
              </div>
              
              {/* Suggestions Dropdown */}
              {showSuggestions && !brand && (
                <div 
                  ref={suggestionsRef}
                  className={`absolute z-50 w-full mt-1 rounded-xl border shadow-lg max-h-60 overflow-auto ${
                    theme === 'dark' 
                      ? 'bg-slate-800 border-slate-700' 
                      : 'bg-white border-slate-200'
                  }`}
                >
                  <div className={`px-3 py-2 text-xs font-medium border-b flex items-center gap-2 ${
                    theme === 'dark' ? 'text-slate-400 border-slate-700' : 'text-slate-500 border-slate-200'
                  }`}>
                    <Database className="w-3 h-3" />
                    {isLoadingSuggestions ? 'Searching brands...' : 'Existing Brands in System'}
                    {isLoadingSuggestions && <Loader2 className="w-3 h-3 animate-spin text-emerald-500" />}
                  </div>
                  
                  {/* Loading State */}
                  {isLoadingSuggestions && brandSuggestions.length === 0 && (
                    <div className="p-4 flex flex-col items-center gap-3">
                      <div className="relative">
                        <div className="w-10 h-10 rounded-full border-2 border-emerald-500/20 border-t-emerald-500 animate-spin" />
                      </div>
                      <p className={`text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                        Finding matching brands...
                      </p>
                    </div>
                  )}
                  
                  {/* No Results */}
                  {!isLoadingSuggestions && brandSuggestions.length === 0 && (
                    <div className="p-4 text-center">
                      <p className={`text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                        No existing brands found
                      </p>
                      <p className={`text-xs mt-1 ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>
                        This will be created as a new brand
                      </p>
                    </div>
                  )}
                  
                  {/* Results */}
                  {brandSuggestions.map((suggestion, index) => (
                    <button
                      key={index}
                      type="button"
                      onClick={() => handleSelectSuggestion(suggestion)}
                      className={`w-full px-4 py-3 text-left transition-colors flex items-center gap-3 ${
                        theme === 'dark' 
                          ? 'hover:bg-slate-700/50 text-white' 
                          : 'hover:bg-slate-50 text-slate-900'
                      }`}
                    >
                      {suggestion.image ? (
                        <img 
                          src={suggestion.image} 
                          alt={suggestion.name} 
                          className="w-8 h-8 rounded-lg object-contain bg-white border"
                        />
                      ) : (
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                          theme === 'dark' ? 'bg-slate-700' : 'bg-slate-100'
                        }`}>
                          <Building2 className="w-4 h-4 text-emerald-500" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium truncate">{suggestion.name}</span>
                          {suggestion.existsInYourShop ? (
                            <span className="text-xs px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-500 whitespace-nowrap">
                              Already in your shop
                            </span>
                          ) : (
                            <span className="text-xs px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-500 flex items-center gap-1 whitespace-nowrap">
                              <Sparkles className="w-3 h-3" />
                              From other shop
                            </span>
                          )}
                        </div>
                        {suggestion.description && (
                          <p className={`text-xs truncate ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                            {suggestion.description}
                          </p>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}
              
              {errors.name && <p className="text-xs text-red-500">{errors.name}</p>}
            </div>

            {/* Website */}
            <div className="space-y-2">
              <Label htmlFor="website" className={`flex items-center gap-2 ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                <Globe className="w-4 h-4" />
                Website
              </Label>
              <Input
                id="website"
                type="url"
                value={formData.website}
                onChange={(e) => handleChange('website', e.target.value)}
                placeholder="https://www.example.com"
                disabled={isSaving}
                className={`${
                  theme === 'dark' 
                    ? 'bg-slate-800 border-slate-700 text-white placeholder:text-slate-500' 
                    : 'bg-white border-slate-200'
                } ${errors.website ? 'border-red-500' : ''}`}
              />
              {errors.website && <p className="text-xs text-red-500">{errors.website}</p>}
            </div>

            {/* Contact Email */}
            <div className="space-y-2">
              <Label htmlFor="contactEmail" className={`flex items-center gap-2 ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                <Mail className="w-4 h-4" />
                Contact Email
              </Label>
              <Input
                id="contactEmail"
                type="email"
                value={formData.contactEmail}
                onChange={(e) => handleChange('contactEmail', e.target.value)}
                placeholder="contact@brand.com"
                disabled={isSaving}
                className={`${
                  theme === 'dark' 
                    ? 'bg-slate-800 border-slate-700 text-white placeholder:text-slate-500' 
                    : 'bg-white border-slate-200'
                } ${errors.contactEmail ? 'border-red-500' : ''}`}
              />
              {errors.contactEmail && <p className="text-xs text-red-500">{errors.contactEmail}</p>}
            </div>

            {/* Contact Phone */}
            <div className="space-y-2">
              <Label htmlFor="contactPhone" className={`flex items-center gap-2 ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                <Phone className="w-4 h-4" />
                Contact Phone
              </Label>
              <Input
                id="contactPhone"
                value={formData.contactPhone}
                onChange={(e) => handleChange('contactPhone', e.target.value)}
                placeholder="Enter contact phone number"
                disabled={isSaving}
                className={`${
                  theme === 'dark' 
                    ? 'bg-slate-800 border-slate-700 text-white placeholder:text-slate-500' 
                    : 'bg-white border-slate-200'
                }`}
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description" className={`flex items-center gap-2 ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                <FileText className="w-4 h-4" />
                Description
              </Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => handleChange('description', e.target.value)}
                placeholder="Enter brand description (optional)"
                rows={3}
                disabled={isSaving}
                className={`${
                  theme === 'dark' 
                    ? 'bg-slate-800 border-slate-700 text-white placeholder:text-slate-500' 
                    : 'bg-white border-slate-200'
                }`}
              />
            </div>

            {/* Action Buttons */}
            <div className={`flex gap-2 sm:gap-3 pt-3 sm:pt-4 border-t ${theme === 'dark' ? 'border-slate-700' : 'border-slate-200'}`}>
              <button
                type="submit"
                disabled={isSaving}
                className="flex-1 px-3 sm:px-4 py-2 sm:py-2.5 text-sm sm:text-base bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-700 hover:to-emerald-600 text-white rounded-xl font-medium transition-all flex items-center justify-center gap-1.5 sm:gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    {isEditing ? 'Update Brand' : 'Add Brand'}
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={onClose}
                disabled={isSaving}
                className={`flex-1 px-3 sm:px-4 py-2 sm:py-2.5 text-sm sm:text-base rounded-xl font-medium transition-colors border ${
                  theme === 'dark'
                    ? 'bg-slate-700/50 hover:bg-slate-700 text-white border-slate-600/50'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-900 border-slate-300'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                Cancel
              </button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
};
