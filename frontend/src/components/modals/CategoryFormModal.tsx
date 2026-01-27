import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../ui/dialog';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Skeleton, SkeletonInput } from '../ui/skeleton';
import { categoryService } from '../../services/categoryService';
import type { CategorySuggestion } from '../../services/categoryService';
import { 
  uploadCategoryImage, 
  isSupabaseConfigured,
  isBase64DataUrl,
  base64ToFile 
} from '../../services/brandCategoryImageService';
import { FolderTree, Tag, FileText, Save, Plus, Cpu, Monitor, HardDrive, MemoryStick, Keyboard, Headphones, Wifi, Package, Upload, X, Loader2, Image as ImageIcon, AlertCircle, Database, Sparkles } from 'lucide-react';

export interface Category {
  id: string;
  name: string;
  description?: string;
  icon?: string;
  image?: string;
  productCount: number;
}

// Category icon options for computer shop
const categoryIconOptions = [
  { value: 'cpu', label: 'Processors', icon: Cpu },
  { value: 'monitor', label: 'Monitors', icon: Monitor },
  { value: 'harddrive', label: 'Storage', icon: HardDrive },
  { value: 'memory', label: 'Memory', icon: MemoryStick },
  { value: 'keyboard', label: 'Peripherals', icon: Keyboard },
  { value: 'headphones', label: 'Audio', icon: Headphones },
  { value: 'wifi', label: 'Networking', icon: Wifi },
  { value: 'package', label: 'Other', icon: Package },
];

interface CategoryFormModalProps {
  isOpen: boolean;
  category?: Category | null;
  onClose: () => void;
  onSave: (category: Category) => void;
}

interface CategoryFormData {
  name: string;
  description: string;
  icon: string;
  image: string;
}

export const CategoryFormModal: React.FC<CategoryFormModalProps> = ({
  isOpen,
  category,
  onClose,
  onSave,
}) => {
  const { theme } = useTheme();
  const { user } = useAuth();
  
  const [formData, setFormData] = useState<CategoryFormData>({
    name: '',
    description: '',
    icon: 'package',
    image: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isLoadingCategory, setIsLoadingCategory] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  
  // Track if we have a pending image file to upload to Supabase
  const [pendingImageFile, setPendingImageFile] = useState<File | null>(null);
  
  // Category name suggestions from database
  const [categorySuggestions, setCategorySuggestions] = useState<CategorySuggestion[]>([]);
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

  // Load category data from API when editing
  useEffect(() => {
    const loadCategoryData = async () => {
      if (!isOpen) return;
      
      if (category) {
        // Editing existing category - load fresh data from API
        setIsLoadingCategory(true);
        setLoadError(null);
        
        try {
          const freshCategoryData = await categoryService.getById(category.id);
          setFormData({
            name: freshCategoryData.name,
            description: freshCategoryData.description || '',
            icon: 'package',
            image: freshCategoryData.image || '',
          });
        } catch (error) {
          console.error('Failed to load category data:', error);
          setLoadError(error instanceof Error ? error.message : 'Failed to load category details');
          // Fallback to passed category data
          setFormData({
            name: category.name,
            description: category.description || '',
            icon: category.icon || 'package',
            image: category.image || '',
          });
        } finally {
          setIsLoadingCategory(false);
        }
      } else {
        // Adding new category - reset form
        setFormData({
          name: '',
          description: '',
          icon: 'package',
          image: '',
        });
        setIsLoadingCategory(false);
      }
      
      setErrors({});
      setUploadError(null);
      setIsUploading(false);
      setUploadProgress(0);
      setPendingImageFile(null);
    };
    
    loadCategoryData();
  }, [category, isOpen]);

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
      newErrors.name = 'Category name is required';
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
      
      // Upload image to Supabase if we have a pending file
      if (pendingImageFile && isSupabaseConfigured() && user?.shop?.id) {
        const uploadResult = await uploadCategoryImage(
          pendingImageFile,
          user.shop.id,
          category?.id
        );
        
        if (uploadResult.success && uploadResult.url) {
          finalImageUrl = uploadResult.url;
        } else if (uploadResult.error) {
          console.warn('Image upload to Supabase failed, using base64:', uploadResult.error);
          // Continue with base64 as fallback
        }
      } else if (isBase64DataUrl(formData.image) && isSupabaseConfigured() && user?.shop?.id) {
        // Convert base64 to file and upload
        const file = base64ToFile(formData.image, `category_${Date.now()}.jpg`);
        const uploadResult = await uploadCategoryImage(file, user.shop.id, category?.id);
        
        if (uploadResult.success && uploadResult.url) {
          finalImageUrl = uploadResult.url;
        }
      }
      
      const newCategory: Category = {
        id: category?.id || `cat-${Date.now()}`,
        name: formData.name,
        description: formData.description,
        icon: formData.icon,
        image: finalImageUrl,
        productCount: category?.productCount || 0,
      };
      
      onSave(newCategory);
      onClose();
    } catch (error) {
      console.error('Failed to save category:', error);
      setUploadError(error instanceof Error ? error.message : 'Failed to save category');
    } finally {
      setIsSaving(false);
    }
  };

  const handleChange = (field: keyof CategoryFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  // Fetch category suggestions when name changes
  useEffect(() => {
    const fetchSuggestions = async () => {
      if (!formData.name || formData.name.length < 2 || category) {
        setCategorySuggestions([]);
        setShowSuggestions(false);
        return;
      }
      
      setIsLoadingSuggestions(true);
      setShowSuggestions(true); // Show dropdown while loading
      try {
        const suggestions = await categoryService.getSuggestions(formData.name);
        const filtered = suggestions.filter(s => 
          s.name.toLowerCase().includes(formData.name.toLowerCase())
        );
        setCategorySuggestions(filtered);
        setShowSuggestions(filtered.length > 0);
      } catch (error) {
        console.log('Failed to fetch suggestions:', error);
        setCategorySuggestions([]);
        setShowSuggestions(false);
      } finally {
        setIsLoadingSuggestions(false);
      }
    };

    const debounce = setTimeout(fetchSuggestions, 300);
    return () => clearTimeout(debounce);
  }, [formData.name, category]);

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
  const handleSelectSuggestion = async (suggestion: CategorySuggestion) => {
    setShowSuggestions(false);
    setCategorySuggestions([]);
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

    // Fill form data with smooth transition
    setFormData(prev => ({
      ...prev,
      name: suggestion.name,
      description: suggestion.description || prev.description,
      image: suggestion.image || prev.image,
    }));

    // Brief delay before hiding loader for smooth transition
    await new Promise(resolve => setTimeout(resolve, 300));
    setIsFillingFromSuggestion(false);
    setSelectedSuggestionName(null);
    setFillProgress(0);
  };

  const isEditing = !!category;

  // Skeleton Loading UI for Edit Mode
  const renderSkeletonForm = () => (
    <div className="p-6 space-y-6">
      {/* Image Upload Skeleton */}
      <div className="space-y-2">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-32 w-full rounded-xl" />
      </div>
      
      {/* Category Name Skeleton */}
      <div className="space-y-2">
        <Skeleton className="h-4 w-32" />
        <SkeletonInput />
      </div>
      
      {/* Icon Selection Skeleton */}
      <div className="space-y-2">
        <Skeleton className="h-4 w-16" />
        <div className="grid grid-cols-4 gap-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-16 rounded-lg" />
          ))}
        </div>
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
          <DialogTitle>{isEditing ? 'Edit Category' : 'Add New Category'}</DialogTitle>
          <DialogDescription>
            {isEditing ? 'Update category information' : 'Add a new category'}
          </DialogDescription>
        </DialogHeader>

        {/* Gradient Header */}
        <div className={`p-6 text-white ${isEditing 
          ? 'bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-500' 
          : 'bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500'
        }`} aria-hidden="true">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-white/20 backdrop-blur rounded-xl flex items-center justify-center">
              {isEditing ? <FolderTree className="w-7 h-7" /> : <Plus className="w-7 h-7" />}
            </div>
            <div>
              <h2 className="text-2xl font-bold">
                {isEditing ? 'Edit Category' : 'Add New Category'}
              </h2>
              <p className="text-sm text-emerald-100">
                {isEditing ? 'Update category details' : 'Create a new product category'}
              </p>
            </div>
          </div>
        </div>

        {/* Show skeleton when loading category data */}
        {isLoadingCategory ? (
          renderSkeletonForm()
        ) : loadError ? (
          <div className="p-6">
            <div className={`p-4 rounded-xl flex items-center gap-3 ${
              theme === 'dark' ? 'bg-red-500/10 border border-red-500/20' : 'bg-red-50 border border-red-200'
            }`}>
              <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
              <div>
                <p className={`text-sm font-medium ${theme === 'dark' ? 'text-red-400' : 'text-red-700'}`}>
                  Failed to load category
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
          <form onSubmit={handleSubmit} className="p-6 space-y-6 relative">
            {/* Suggestion Fill Loading Overlay */}
            {isFillingFromSuggestion && (
              <div className="absolute inset-0 z-50 bg-gradient-to-br from-slate-900/95 via-slate-900/98 to-slate-950/95 backdrop-blur-sm flex flex-col items-center justify-center rounded-b-2xl">
                {/* Animated rings */}
                <div className="relative w-32 h-32 mb-6">
                  <div className="absolute inset-0 rounded-full border-4 border-blue-500/20 animate-ping" style={{ animationDuration: '2s' }} />
                  <div className="absolute inset-2 rounded-full border-4 border-indigo-500/30 animate-ping" style={{ animationDuration: '1.5s', animationDelay: '0.2s' }} />
                  <div className="absolute inset-4 rounded-full border-4 border-purple-500/40 animate-ping" style={{ animationDuration: '1s', animationDelay: '0.4s' }} />
                  
                  {/* Center icon with glow */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="relative">
                      <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full blur-xl opacity-60 animate-pulse" />
                      <div className="relative w-16 h-16 bg-gradient-to-br from-blue-500 via-indigo-500 to-purple-500 rounded-full flex items-center justify-center shadow-2xl">
                        <FolderTree className="w-8 h-8 text-white animate-pulse" />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="w-48 mb-4">
                  <div className="h-2 bg-slate-700/50 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 rounded-full transition-all duration-200 ease-out"
                      style={{ width: `${fillProgress}%` }}
                    />
                  </div>
                  <p className="text-center text-xs text-slate-400 mt-2">{fillProgress}%</p>
                </div>

                {/* Loading text */}
                <div className="text-center">
                  <h3 className="text-lg font-semibold text-white mb-1 flex items-center gap-2 justify-center">
                    <Sparkles className="w-5 h-5 text-blue-400 animate-pulse" />
                    Loading Category Details
                  </h3>
                  <p className="text-sm text-slate-400">
                    Fetching <span className="text-blue-400 font-medium">{selectedSuggestionName}</span>
                  </p>
                </div>

                {/* Floating particles effect */}
                <div className="absolute inset-0 overflow-hidden pointer-events-none">
                  {[...Array(6)].map((_, i) => (
                    <div
                      key={i}
                      className="absolute w-2 h-2 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full opacity-40"
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

            {/* Category Image Upload */}
            <div className="space-y-2">
              <Label className={`flex items-center gap-2 ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                <ImageIcon className="w-4 h-4" />
                Category Image
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
                        alt="Category image" 
                        className="w-full h-full object-contain p-1"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = '';
                        }}
                      />
                    </div>
                    <div className="flex-1">
                      <p className={`text-sm font-medium ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                        Image {pendingImageFile ? 'ready to upload' : 'uploaded'}
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
                        Drop image here or click to upload
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

            {/* Category Name */}
            <div className="space-y-2 relative">
              <Label htmlFor="name" className={`flex items-center gap-2 ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                <Tag className="w-4 h-4" />
                Category Name <span className="text-red-500">*</span>
              </Label>
              <div className="relative">
                <Input
                  ref={nameInputRef}
                  id="name"
                  value={formData.name}
                  onChange={(e) => handleChange('name', e.target.value)}
                  onFocus={() => formData.name.length >= 2 && !category && setShowSuggestions(true)}
                  placeholder="Enter category name"
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
                    <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
                  </div>
                )}
              </div>
              
              {/* Suggestions Dropdown */}
              {showSuggestions && !category && (
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
                    {isLoadingSuggestions ? 'Searching categories...' : 'Existing Categories in System'}
                    {isLoadingSuggestions && <Loader2 className="w-3 h-3 animate-spin text-blue-500" />}
                  </div>
                  
                  {/* Loading State */}
                  {isLoadingSuggestions && categorySuggestions.length === 0 && (
                    <div className="p-4 flex flex-col items-center gap-3">
                      <div className="relative">
                        <div className="w-10 h-10 rounded-full border-2 border-blue-500/20 border-t-blue-500 animate-spin" />
                      </div>
                      <p className={`text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                        Finding matching categories...
                      </p>
                    </div>
                  )}
                  
                  {/* No Results */}
                  {!isLoadingSuggestions && categorySuggestions.length === 0 && (
                    <div className="p-4 text-center">
                      <p className={`text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                        No existing categories found
                      </p>
                      <p className={`text-xs mt-1 ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>
                        This will be created as a new category
                      </p>
                    </div>
                  )}
                  
                  {/* Results */}
                  {categorySuggestions.map((suggestion, index) => (
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
                          <FolderTree className="w-4 h-4 text-blue-500" />
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
                            <span className="text-xs px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-500 flex items-center gap-1 whitespace-nowrap">
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

            {/* Icon Selection */}
            <div className="space-y-2">
              <Label className={`flex items-center gap-2 ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                <Package className="w-4 h-4" />
                Icon
              </Label>
              <div className="grid grid-cols-4 gap-2">
                {categoryIconOptions.map((option) => {
                  const IconComponent = option.icon;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => handleChange('icon', option.value)}
                      disabled={isSaving}
                      className={`p-3 rounded-lg border transition-all flex flex-col items-center gap-1 disabled:opacity-50 ${
                        formData.icon === option.value
                          ? theme === 'dark'
                            ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400'
                            : 'bg-emerald-50 border-emerald-500 text-emerald-600'
                          : theme === 'dark'
                            ? 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-600'
                            : 'bg-slate-50 border-slate-200 text-slate-500 hover:border-slate-300'
                      }`}
                    >
                      <IconComponent className="w-5 h-5" />
                      <span className="text-xs">{option.label}</span>
                    </button>
                  );
                })}
              </div>
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
                placeholder="Enter category description (optional)"
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
            <div className={`flex gap-3 pt-4 border-t ${theme === 'dark' ? 'border-slate-700' : 'border-slate-200'}`}>
              <button
                type="submit"
                disabled={isSaving}
                className="flex-1 px-4 py-2.5 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-700 hover:to-emerald-600 text-white rounded-xl font-medium transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    {isEditing ? 'Update Category' : 'Add Category'}
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={onClose}
                disabled={isSaving}
                className={`flex-1 px-4 py-2.5 rounded-xl font-medium transition-colors border ${
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
