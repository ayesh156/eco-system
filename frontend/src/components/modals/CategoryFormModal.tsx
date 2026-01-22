import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../ui/dialog';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { FolderTree, Tag, FileText, Save, Plus, Cpu, Monitor, HardDrive, MemoryStick, Keyboard, Headphones, Wifi, Package, Upload, X, Loader2, Image as ImageIcon } from 'lucide-react';

// Image compression utility
const compressImage = (file: File, maxWidth: number = 200, quality: number = 0.8): Promise<string> => {
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
  
  const [formData, setFormData] = useState<CategoryFormData>({
    name: '',
    description: '',
    icon: 'package',
    image: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    if (category) {
      setFormData({
        name: category.name,
        description: category.description || '',
        icon: category.icon || 'package',
        image: category.image || '',
      });
    } else {
      setFormData({
        name: '',
        description: '',
        icon: 'package',
        image: '',
      });
    }
    setErrors({});
    setIsUploading(false);
    setUploadProgress(0);
  }, [category, isOpen]);

  // Handle image upload
  const handleImageUpload = useCallback(async (file: File) => {
    if (!file.type.startsWith('image/')) return;
    
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) return;

    setIsUploading(true);
    setUploadProgress(0);

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

      const compressedImage = await compressImage(file);
      
      clearInterval(progressInterval);
      setUploadProgress(100);
      
      setTimeout(() => {
        setFormData(prev => ({ ...prev, image: compressedImage }));
        setIsUploading(false);
        setUploadProgress(0);
      }, 300);
    } catch {
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
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.name.trim()) {
      newErrors.name = 'Category name is required';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateForm()) {
      const newCategory: Category = {
        id: category?.id || `cat-${Date.now()}`,
        name: formData.name,
        description: formData.description,
        icon: formData.icon,
        image: formData.image,
        productCount: category?.productCount || 0,
      };
      onSave(newCategory);
      onClose();
    }
  };

  const handleChange = (field: keyof CategoryFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const isEditing = !!category;

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

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
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
            </Label>
            <div
              ref={dropZoneRef}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => !isUploading && fileInputRef.current?.click()}
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
                    Compressing image...
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
                    />
                  </div>
                  <div className="flex-1">
                    <p className={`text-sm font-medium ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                      Image uploaded
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
                    className={`p-2 rounded-lg transition-colors ${
                      theme === 'dark' ? 'hover:bg-red-500/10 text-red-400' : 'hover:bg-red-50 text-red-500'
                    }`}
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
          </div>

          {/* Category Name */}
          <div className="space-y-2">
            <Label htmlFor="name" className={`flex items-center gap-2 ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
              <Tag className="w-4 h-4" />
              Category Name <span className="text-red-500">*</span>
            </Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => handleChange('name', e.target.value)}
              placeholder="Enter category name"
              className={`${
                theme === 'dark' 
                  ? 'bg-slate-800 border-slate-700 text-white placeholder:text-slate-500' 
                  : 'bg-white border-slate-200'
              } ${errors.name ? 'border-red-500' : ''}`}
            />
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
                    className={`p-3 rounded-lg border transition-all flex flex-col items-center gap-1 ${
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
              className="flex-1 px-4 py-2.5 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-700 hover:to-emerald-600 text-white rounded-xl font-medium transition-all flex items-center justify-center gap-2"
            >
              <Save className="w-4 h-4" />
              {isEditing ? 'Update Category' : 'Add Category'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className={`flex-1 px-4 py-2.5 rounded-xl font-medium transition-colors border ${
                theme === 'dark'
                  ? 'bg-slate-700/50 hover:bg-slate-700 text-white border-slate-600/50'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-900 border-slate-300'
              }`}
            >
              Cancel
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
