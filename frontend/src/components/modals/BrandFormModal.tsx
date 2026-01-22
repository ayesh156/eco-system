import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../ui/dialog';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Building2, Tag, FileText, Save, Plus, Globe, Mail, Phone, Upload, X, Loader2, Image as ImageIcon } from 'lucide-react';

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

export interface Brand {
  id: string;
  name: string;
  description?: string;
  website?: string;
  image?: string;
  productCount: number;
}

interface BrandFormModalProps {
  isOpen: boolean;
  brand?: Brand | null;
  onClose: () => void;
  onSave: (brand: Brand) => void;
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
}) => {
  const { theme } = useTheme();
  
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
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    if (brand) {
      setFormData({
        name: brand.name,
        description: brand.description || '',
        website: brand.website || '',
        contactEmail: '',
        contactPhone: '',
        image: brand.image || '',
      });
    } else {
      setFormData({
        name: '',
        description: '',
        website: '',
        contactEmail: '',
        contactPhone: '',
        image: '',
      });
    }
    setErrors({});
    setIsUploading(false);
    setUploadProgress(0);
  }, [brand, isOpen]);

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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateForm()) {
      const newBrand: Brand = {
        id: brand?.id || `brand-${Date.now()}`,
        name: formData.name,
        description: formData.description,
        website: formData.website,
        image: formData.image,
        productCount: brand?.productCount || 0,
      };
      onSave(newBrand);
      onClose();
    }
  };

  const handleChange = (field: keyof BrandFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const isEditing = !!brand;

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
        <div className={`p-6 text-white ${isEditing 
          ? 'bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-500' 
          : 'bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500'
        }`} aria-hidden="true">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-white/20 backdrop-blur rounded-xl flex items-center justify-center">
              {isEditing ? <Building2 className="w-7 h-7" /> : <Plus className="w-7 h-7" />}
            </div>
            <div>
              <h2 className="text-2xl font-bold">
                {isEditing ? 'Edit Brand' : 'Add New Brand'}
              </h2>
              <p className="text-sm text-emerald-100">
                {isEditing ? 'Update brand details' : 'Create a new product brand'}
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

          {/* Brand Logo Upload */}
          <div className="space-y-2">
            <Label className={`flex items-center gap-2 ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
              <ImageIcon className="w-4 h-4" />
              Brand Logo
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
                      alt="Brand logo" 
                      className="w-full h-full object-contain p-1"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = '';
                      }}
                    />
                  </div>
                  <div className="flex-1">
                    <p className={`text-sm font-medium ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                      Logo uploaded
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
                      Drop logo here or click to upload
                    </p>
                    <p className={`text-xs mt-1 ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>
                      Or paste from clipboard (Ctrl+V)
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Brand Name */}
          <div className="space-y-2">
            <Label htmlFor="name" className={`flex items-center gap-2 ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
              <Tag className="w-4 h-4" />
              Brand Name <span className="text-red-500">*</span>
            </Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => handleChange('name', e.target.value)}
              placeholder="Enter brand name"
              className={`${
                theme === 'dark' 
                  ? 'bg-slate-800 border-slate-700 text-white placeholder:text-slate-500' 
                  : 'bg-white border-slate-200'
              } ${errors.name ? 'border-red-500' : ''}`}
            />
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
              {isEditing ? 'Update Brand' : 'Add Brand'}
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
