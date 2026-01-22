import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { mockProducts, generateSerialNumber } from '../data/mockData';
import { useTheme } from '../contexts/ThemeContext';
import { geminiService } from '../services/geminiService';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { SearchableSelect } from '../components/ui/searchable-select';
import { 
  Tag, DollarSign, Boxes, FileText, Save, ArrowLeft, 
  Building2, Layers, Hash, Barcode, RefreshCw, ImageIcon, Upload, X, Shield, AlertCircle, Clipboard, CheckCircle2,
  Search, Sparkles, Brain, Loader2, Wand2, Globe, TrendingUp
} from 'lucide-react';

// Computer shop categories
const categoryOptions = [
  { value: 'Processors', label: 'Processors' },
  { value: 'Graphics Cards', label: 'Graphics Cards' },
  { value: 'Memory', label: 'Memory' },
  { value: 'Storage', label: 'Storage' },
  { value: 'Motherboards', label: 'Motherboards' },
  { value: 'Power Supply', label: 'Power Supply' },
  { value: 'Cooling', label: 'Cooling' },
  { value: 'Cases', label: 'Cases' },
  { value: 'Monitors', label: 'Monitors' },
  { value: 'Peripherals', label: 'Peripherals' },
  { value: 'Networking', label: 'Networking' },
  { value: 'Software', label: 'Software' },
];

// Computer hardware brands
const brandOptions = [
  { value: 'AMD', label: 'AMD' },
  { value: 'Intel', label: 'Intel' },
  { value: 'NVIDIA', label: 'NVIDIA' },
  { value: 'ASUS', label: 'ASUS' },
  { value: 'MSI', label: 'MSI' },
  { value: 'Gigabyte', label: 'Gigabyte' },
  { value: 'Corsair', label: 'Corsair' },
  { value: 'Samsung', label: 'Samsung' },
  { value: 'Western Digital', label: 'Western Digital' },
  { value: 'Seagate', label: 'Seagate' },
  { value: 'G.Skill', label: 'G.Skill' },
  { value: 'NZXT', label: 'NZXT' },
  { value: 'Lian Li', label: 'Lian Li' },
  { value: 'LG', label: 'LG' },
  { value: 'Logitech', label: 'Logitech' },
  { value: 'Razer', label: 'Razer' },
  { value: 'SteelSeries', label: 'SteelSeries' },
];

// Warranty period options
const warrantyOptions = [
  { value: '', label: 'No Warranty' },
  { value: '3 months', label: '3 Months' },
  { value: '6 months', label: '6 Months' },
  { value: '1 year', label: '1 Year' },
  { value: '2 years', label: '2 Years' },
  { value: '3 years', label: '3 Years' },
  { value: '5 years', label: '5 Years' },
  { value: 'lifetime', label: 'Lifetime' },
];

// Image compression utility
const compressImage = (file: File, maxWidth: number = 800, quality: number = 0.7): Promise<string> => {
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

interface ProductFormData {
  name: string;
  serialNumber: string;
  barcode: string;
  category: string;
  brand: string;
  price: number;
  costPrice: number;
  sellingPrice: number;
  stock: number;
  description: string;
  image: string;
  warranty: string;
  lowStockThreshold: number;
}

export const ProductForm: React.FC = () => {
  const { theme, aiAutoFillEnabled } = useTheme();
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditing = !!id;
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);
  
  // Track if name was manually cleared to prevent re-triggering AI
  const nameWasCleared = useRef(false);
  const previousName = useRef('');

  // Find existing product if editing
  const existingProduct = isEditing 
    ? mockProducts.find(p => p.id === id) 
    : undefined;

  const [formData, setFormData] = useState<ProductFormData>({
    name: '',
    serialNumber: generateSerialNumber(),
    barcode: '',
    category: '',
    brand: '',
    price: 0,
    costPrice: 0,
    sellingPrice: 0,
    stock: 0,
    description: '',
    image: '',
    warranty: '',
    lowStockThreshold: 10,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [isUploading, setIsUploading] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [pasteSuccess, setPasteSuccess] = useState(false);
  
  // AI Features State
  const [suggestions, setSuggestions] = useState<Array<{ name: string; brand: string; category: string; estimatedPrice?: number }>>([]);
  const [isSearchingSuggestions, setIsSearchingSuggestions] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isAnalyzingImage, setIsAnalyzingImage] = useState(false);
  const [isGeneratingDescription, setIsGeneratingDescription] = useState(false);
  const [aiAutoFillSuccess, setAiAutoFillSuccess] = useState(false);
  const suggestionTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (existingProduct) {
      setFormData({
        name: existingProduct.name,
        serialNumber: existingProduct.serialNumber,
        barcode: existingProduct.barcode || '',
        category: existingProduct.category,
        brand: existingProduct.brand,
        price: existingProduct.price,
        costPrice: existingProduct.costPrice || 0,
        sellingPrice: existingProduct.sellingPrice || existingProduct.price,
        stock: existingProduct.stock,
        description: existingProduct.description || '',
        image: existingProduct.image || '',
        warranty: existingProduct.warranty || '',
        lowStockThreshold: existingProduct.lowStockThreshold || 10,
      });
    }
  }, [existingProduct]);

  // Handle image upload with compression and progress
  const handleImageUpload = useCallback(async (file: File) => {
    if (!file.type.startsWith('image/')) {
      setErrors(prev => ({ ...prev, image: 'Please select an image file' }));
      return;
    }

    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      setErrors(prev => ({ ...prev, image: 'Image must be less than 10MB' }));
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);
    setErrors(prev => ({ ...prev, image: '' }));

    try {
      // Simulate upload progress
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return prev;
          }
          return prev + Math.random() * 15;
        });
      }, 100);

      // Compress the image
      const compressedImage = await compressImage(file);
      
      clearInterval(progressInterval);
      setUploadProgress(100);
      
      setTimeout(() => {
        setFormData(prev => ({ ...prev, image: compressedImage }));
        setIsUploading(false);
        setUploadProgress(0);
        
        // Trigger AI image analysis if API key is available AND AI Auto-Fill is enabled
        if (geminiService.hasApiKey() && aiAutoFillEnabled) {
          handleAIImageAnalysis(compressedImage);
        }
      }, 300);
    } catch {
      setErrors(prev => ({ ...prev, image: 'Failed to process image' }));
      setIsUploading(false);
      setUploadProgress(0);
    }
  }, [aiAutoFillEnabled]);

  // Handle file input change
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleImageUpload(file);
    }
  };

  // Handle drag and drop
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleImageUpload(file);
    }
  };

  // Handle paste from clipboard (Google image paste)
  const handlePaste = useCallback(async (e: ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    for (const item of items) {
      if (item.type.startsWith('image/')) {
        e.preventDefault();
        const file = item.getAsFile();
        if (file) {
          setPasteSuccess(true);
          setTimeout(() => setPasteSuccess(false), 2000);
          handleImageUpload(file);
        }
        break;
      }
    }
  }, [handleImageUpload]);

  // Add paste event listener
  useEffect(() => {
    document.addEventListener('paste', handlePaste);
    return () => document.removeEventListener('paste', handlePaste);
  }, [handlePaste]);

  // Handle product name change with AI suggestions
  const handleNameChange = useCallback(async (value: string) => {
    // Track if name was cleared (went from having content to empty)
    if (previousName.current.length > 0 && value.length === 0) {
      nameWasCleared.current = true;
    }
    // Reset the cleared flag if user starts typing again
    if (value.length > 0 && nameWasCleared.current) {
      nameWasCleared.current = false;
    }
    previousName.current = value;
    
    setFormData(prev => ({ ...prev, name: value }));
    if (errors.name) {
      setErrors(prev => ({ ...prev, name: '' }));
    }

    // Clear previous timeout
    if (suggestionTimeoutRef.current) {
      clearTimeout(suggestionTimeoutRef.current);
    }

    // Only search if:
    // - Query is at least 2 characters
    // - AI Auto-Fill is enabled
    // - Name was not just cleared (to minimize API requests)
    if (value.length < 2 || !aiAutoFillEnabled) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    // Debounce the search with longer delay to reduce API calls
    suggestionTimeoutRef.current = setTimeout(async () => {
      if (!geminiService.hasApiKey()) return;
      
      setIsSearchingSuggestions(true);
      setShowSuggestions(true);
      
      try {
        const results = await geminiService.suggestProducts(value);
        setSuggestions(results);
      } catch (error) {
        console.error('Suggestion error:', error);
        setSuggestions([]);
      } finally {
        setIsSearchingSuggestions(false);
      }
    }, 600); // Increased debounce to 600ms to reduce API calls
  }, [errors.name, aiAutoFillEnabled]);

  // Handle suggestion selection
  const handleSelectSuggestion = useCallback((suggestion: { name: string; brand: string; category: string; estimatedPrice?: number }) => {
    // Map to our category/brand options
    const categoryMap: Record<string, string> = {
      'processors': 'Processors', 'cpu': 'Processors',
      'graphics-cards': 'Graphics Cards', 'gpu': 'Graphics Cards',
      'memory': 'Memory', 'ram': 'Memory',
      'storage': 'Storage', 'ssd': 'Storage', 'hdd': 'Storage',
      'motherboards': 'Motherboards', 'motherboard': 'Motherboards',
      'power-supply': 'Power Supply', 'psu': 'Power Supply',
      'cooling': 'Cooling', 'cases': 'Cases', 'case': 'Cases',
      'monitors': 'Monitors', 'monitor': 'Monitors',
      'peripherals': 'Peripherals', 'networking': 'Networking', 'software': 'Software',
      'laptops': 'Peripherals', 'smartphones': 'Peripherals', 'tablets': 'Peripherals',
      'accessories': 'Peripherals',
    };

    const brandMap: Record<string, string> = {
      'amd': 'AMD', 'intel': 'Intel', 'nvidia': 'NVIDIA',
      'asus': 'ASUS', 'msi': 'MSI', 'gigabyte': 'Gigabyte',
      'corsair': 'Corsair', 'samsung': 'Samsung',
      'western digital': 'Western Digital', 'wd': 'Western Digital',
      'seagate': 'Seagate', 'g.skill': 'G.Skill', 'gskill': 'G.Skill',
      'nzxt': 'NZXT', 'lian li': 'Lian Li', 'lg': 'LG',
      'logitech': 'Logitech', 'razer': 'Razer', 'steelseries': 'SteelSeries',
      'apple': 'Peripherals', 'dell': 'Peripherals', 'hp': 'Peripherals', 'lenovo': 'Peripherals',
    };

    const categoryKey = suggestion.category.toLowerCase().replace(/ /g, '-');
    const brandKey = suggestion.brand.toLowerCase();
    
    // Calculate cost price as ~80% of selling price (typical markup)
    const sellingPrice = suggestion.estimatedPrice || 0;
    const costPrice = Math.round(sellingPrice * 0.80);

    setFormData(prev => ({
      ...prev,
      name: suggestion.name,
      category: categoryMap[categoryKey] || prev.category,
      brand: brandMap[brandKey] || suggestion.brand || prev.brand,
      sellingPrice: sellingPrice || prev.sellingPrice,
      price: sellingPrice || prev.price,
      costPrice: costPrice || prev.costPrice,
    }));

    setSuggestions([]);
    setShowSuggestions(false);
    setAiAutoFillSuccess(true);
    setTimeout(() => setAiAutoFillSuccess(false), 3000);
  }, []);

  // Handle AI image analysis
  const handleAIImageAnalysis = useCallback(async (base64Image: string) => {
    if (!geminiService.hasApiKey() || !aiAutoFillEnabled) return;

    setIsAnalyzingImage(true);
    
    try {
      const result = await geminiService.analyzeProductImage(base64Image);
      
      if (result) {
        const categoryMap: Record<string, string> = {
          'processors': 'Processors', 'graphics-cards': 'Graphics Cards',
          'memory': 'Memory', 'storage': 'Storage', 'motherboards': 'Motherboards',
          'power-supply': 'Power Supply', 'cooling': 'Cooling', 'cases': 'Cases',
          'monitors': 'Monitors', 'peripherals': 'Peripherals',
          'networking': 'Networking', 'software': 'Software',
          'laptops': 'Peripherals', 'smartphones': 'Peripherals', 
          'tablets': 'Peripherals', 'accessories': 'Peripherals',
        };

        const brandMap: Record<string, string> = {
          'amd': 'AMD', 'intel': 'Intel', 'nvidia': 'NVIDIA',
          'asus': 'ASUS', 'msi': 'MSI', 'gigabyte': 'Gigabyte',
          'corsair': 'Corsair', 'samsung': 'Samsung',
          'western digital': 'Western Digital', 'seagate': 'Seagate',
          'g.skill': 'G.Skill', 'nzxt': 'NZXT', 'lian li': 'Lian Li',
          'lg': 'LG', 'logitech': 'Logitech', 'razer': 'Razer', 'steelseries': 'SteelSeries',
          'apple': 'Peripherals', 'dell': 'Peripherals', 'hp': 'Peripherals', 'lenovo': 'Peripherals',
        };

        const categoryKey = result.category?.toLowerCase().replace(/ /g, '-') || '';
        const brandKey = result.brand?.toLowerCase() || '';

        let description = result.description || '';
        if (result.specs && result.specs.length > 0) {
          description += '\n\nKey Specifications:\n• ' + result.specs.join('\n• ');
        }

        // Map warranty value to our options
        const warrantyMap: Record<string, string> = {
          '1 year': '1 year', '2 years': '2 years', '3 years': '3 years',
          '5 years': '5 years', 'lifetime': 'lifetime',
          '6 months': '6 months', '3 months': '3 months',
        };
        const warrantyKey = result.warranty?.toLowerCase() || '';
        const mappedWarranty = warrantyMap[warrantyKey] || result.warranty || '';

        // Calculate cost price if not provided (80% of selling)
        const sellingPrice = result.estimatedPrice || 0;
        const costPrice = (result as { costPrice?: number }).costPrice || Math.round(sellingPrice * 0.80);

        setFormData(prev => ({
          ...prev,
          name: result.name || prev.name,
          category: categoryMap[categoryKey] || result.category || prev.category,
          brand: brandMap[brandKey] || result.brand || prev.brand,
          sellingPrice: sellingPrice || prev.sellingPrice,
          price: sellingPrice || prev.price,
          costPrice: costPrice || prev.costPrice,
          description: description.trim() || prev.description,
          warranty: mappedWarranty || prev.warranty,
          barcode: (result as { barcode?: string }).barcode || prev.barcode,
        }));

        setAiAutoFillSuccess(true);
        setTimeout(() => setAiAutoFillSuccess(false), 3000);
      }
    } catch (error) {
      console.error('AI image analysis error:', error);
    } finally {
      setIsAnalyzingImage(false);
    }
  }, [aiAutoFillEnabled]);

  // Generate AI description
  const handleGenerateDescription = useCallback(async () => {
    if (!geminiService.hasApiKey() || !formData.name) return;

    setIsGeneratingDescription(true);
    
    try {
      const description = await geminiService.generateProductDescription(
        formData.name,
        formData.brand,
        formData.category
      );
      
      if (description) {
        setFormData(prev => ({ ...prev, description }));
      }
    } catch (error) {
      console.error('Description generation error:', error);
    } finally {
      setIsGeneratingDescription(false);
    }
  }, [formData.name, formData.category, formData.brand]);

  // Remove image
  const handleRemoveImage = () => {
    setFormData(prev => ({ ...prev, image: '' }));
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.name.trim()) {
      newErrors.name = 'Product name is required';
    }
    if (!formData.serialNumber.trim()) {
      newErrors.serialNumber = 'Serial number is required';
    }
    if (!formData.category) {
      newErrors.category = 'Category is required';
    }
    if (!formData.brand) {
      newErrors.brand = 'Brand is required';
    }
    if (formData.costPrice < 0) {
      newErrors.costPrice = 'Cost price cannot be negative';
    }
    if (formData.sellingPrice <= 0) {
      newErrors.sellingPrice = 'Selling price must be greater than 0';
    }
    if (formData.sellingPrice < formData.costPrice) {
      newErrors.sellingPrice = 'Selling price should be greater than cost price';
    }
    if (formData.stock < 0) {
      newErrors.stock = 'Stock cannot be negative';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateForm()) {
      // In a real app, this would save to a database/API
      // Product data would be: {
      //   id: existingProduct?.id || `prod-${Date.now()}`,
      //   name, serialNumber, barcode, category, brand, price, stock, etc.
      // }
      
      // Navigate back to products list after successful save
      navigate('/products');
    }
  };

  const handleChange = (field: keyof ProductFormData, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleGenerateSerialNumber = () => {
    setFormData(prev => ({ ...prev, serialNumber: generateSerialNumber() }));
  };

  return (
    <div className="space-y-6">
      {/* Page Title Header - Similar to ServiceForm */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 px-0">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/products')}
            className={`p-2 rounded-xl transition-colors ${
              theme === 'dark' 
                ? 'hover:bg-slate-800 text-slate-400 hover:text-white' 
                : 'hover:bg-slate-100 text-slate-600 hover:text-slate-900'
            }`}
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <div>
            <h1 className={`text-2xl sm:text-3xl font-bold bg-gradient-to-r from-emerald-500 to-teal-500 bg-clip-text text-transparent`}>
              {isEditing ? 'Edit Product' : 'Add New Product'}
            </h1>
            <p className={`mt-1 text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
              {isEditing ? 'Update product information' : 'Add a new product to inventory'}
            </p>
          </div>
        </div>
      </div>

      {/* Form Card */}
      {/* Form Container */}
      <div className={`rounded-2xl border p-4 sm:p-6 ${
        theme === 'dark' 
          ? 'bg-slate-800/50 border-slate-700/50' 
          : 'bg-white border-slate-200'
      }`}>
        <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
          {/* AI Auto-Fill Success Banner */}
          {aiAutoFillSuccess && (
            <div className="flex items-center gap-3 p-3 rounded-xl bg-gradient-to-r from-emerald-500/20 to-teal-500/20 border border-emerald-500/30">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-emerald-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-emerald-400">AI Auto-Fill Complete!</p>
                <p className="text-xs text-emerald-400/70">Product details have been filled automatically</p>
              </div>
            </div>
          )}

          {/* Product Image */}
          <div className="space-y-2">
            <Label className={`flex items-center gap-2 text-sm ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
              <ImageIcon className="w-4 h-4" />
              Product Image {aiAutoFillEnabled && <span className={`text-xs ml-1 ${theme === 'dark' ? 'text-emerald-400' : 'text-emerald-600'}`}>(AI will auto-fill details)</span>}
              {pasteSuccess && (
                <span className="flex items-center gap-1 text-xs text-emerald-500 ml-2">
                  <CheckCircle2 className="w-3 h-3" />
                  Image pasted!
                </span>
              )}
            </Label>
            
            {/* Hidden file input */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="hidden"
            />

            {formData.image ? (
              /* Image Preview */
              <div className={`relative rounded-xl border-2 border-dashed overflow-hidden ${
                theme === 'dark' ? 'border-slate-700 bg-slate-800/50' : 'border-slate-200 bg-slate-50'
              }`}>
                <img 
                  src={formData.image} 
                  alt="Product preview" 
                  className="w-full h-48 object-contain"
                />
                
                {/* AI Scanning Overlay */}
                {isAnalyzingImage && (
                  <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm flex flex-col items-center justify-center">
                    <div className="relative">
                      <div className="w-16 h-16 rounded-full border-4 border-emerald-500/30 border-t-emerald-500 animate-spin" />
                      <Brain className="w-6 h-6 text-emerald-400 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                    </div>
                    <p className="mt-3 text-sm font-medium text-white">AI Analyzing Image...</p>
                    <p className="text-xs text-slate-400 mt-1">Detecting product details & LKR prices</p>
                  </div>
                )}
                
                <button
                  type="button"
                  onClick={handleRemoveImage}
                  className="absolute top-2 right-2 p-1.5 rounded-lg bg-red-500 text-white hover:bg-red-600 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
                <div className={`absolute bottom-0 left-0 right-0 px-3 py-2 text-xs ${
                  theme === 'dark' ? 'bg-slate-900/80 text-slate-300' : 'bg-white/80 text-slate-600'
                }`}>
                  {isAnalyzingImage ? 'AI is analyzing this image...' : 'Click the X to remove and upload a new image'}
                </div>
              </div>
            ) : (
              /* Upload Drop Zone */
              <div
                ref={dropZoneRef}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`relative rounded-xl border-2 border-dashed p-6 text-center cursor-pointer transition-all ${
                  isDragOver
                    ? 'border-emerald-500 bg-emerald-500/10'
                    : theme === 'dark' 
                      ? 'border-slate-700 bg-slate-800/50 hover:border-slate-600 hover:bg-slate-800' 
                      : 'border-slate-200 bg-slate-50 hover:border-slate-300 hover:bg-slate-100'
                }`}
              >
                {isUploading ? (
                  /* Upload Progress */
                  <div className="space-y-3">
                    <div className={`w-12 h-12 mx-auto rounded-xl flex items-center justify-center ${
                      theme === 'dark' ? 'bg-emerald-500/20' : 'bg-emerald-50'
                    }`}>
                      <Upload className="w-6 h-6 text-emerald-500 animate-pulse" />
                    </div>
                    <div className="space-y-2">
                      <p className={`text-sm font-medium ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                        Compressing & Uploading...
                      </p>
                      <div className={`w-full h-2 rounded-full overflow-hidden ${
                        theme === 'dark' ? 'bg-slate-700' : 'bg-slate-200'
                      }`}>
                        <div 
                          className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 transition-all duration-300"
                          style={{ width: `${uploadProgress}%` }}
                        />
                      </div>
                      <p className={`text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                        {Math.round(uploadProgress)}% complete
                      </p>
                    </div>
                  </div>
                ) : (
                  /* Upload Instructions */
                  <div className="space-y-3">
                    <div className={`w-12 h-12 mx-auto rounded-xl flex items-center justify-center ${
                      theme === 'dark' ? 'bg-slate-700' : 'bg-slate-100'
                    }`}>
                      <Upload className={`w-6 h-6 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`} />
                    </div>
                    <div>
                      <p className={`text-sm font-medium ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                        Drop image here or click to upload
                      </p>
                      <p className={`text-xs mt-1 ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>
                        PNG, JPG up to 10MB. Images will be compressed automatically.
                      </p>
                    </div>
                    
                    {/* AI Feature Highlight */}
                    {geminiService.hasApiKey() && aiAutoFillEnabled && (
                      <div className={`mx-auto max-w-xs p-2 rounded-lg ${
                        theme === 'dark' ? 'bg-gradient-to-r from-emerald-500/10 to-blue-500/10 border border-emerald-500/20' : 'bg-gradient-to-r from-emerald-50 to-blue-50 border border-emerald-200'
                      }`}>
                        <div className="flex items-center justify-center gap-2">
                          <Brain className="w-4 h-4 text-emerald-500" />
                          <span className={`text-xs font-medium ${theme === 'dark' ? 'text-emerald-400' : 'text-emerald-600'}`}>
                            AI will auto-fill ALL fields with LKR prices
                          </span>
                        </div>
                      </div>
                    )}
                    
                    <div className={`flex items-center justify-center gap-2 pt-2 border-t ${
                      theme === 'dark' ? 'border-slate-700' : 'border-slate-200'
                    }`}>
                      <Clipboard className={`w-4 h-4 ${theme === 'dark' ? 'text-emerald-400' : 'text-emerald-600'}`} />
                      <span className={`text-xs ${theme === 'dark' ? 'text-emerald-400' : 'text-emerald-600'}`}>
                        Pro tip: Copy image from Google and press Ctrl+V to paste
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )}
            {errors.image && <p className="text-xs text-red-500">{errors.image}</p>}
          </div>

          {/* Product Name with AI Suggestions */}
          <div className="space-y-2 relative">
            <div className="flex items-center justify-between">
              <Label htmlFor="name" className={`flex items-center gap-2 text-sm ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                <Tag className="w-4 h-4" />
                Product Name <span className="text-red-500">*</span>
              </Label>
              {geminiService.hasApiKey() && aiAutoFillEnabled && (
                <span className={`flex items-center gap-1 text-xs ${theme === 'dark' ? 'text-emerald-400' : 'text-emerald-600'}`}>
                  <Brain className="w-3 h-3" />
                  AI Suggestions Active
                </span>
              )}
            </div>
            <div className="relative">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 z-10">
                {isSearchingSuggestions ? (
                  <Loader2 className="w-4 h-4 text-emerald-500 animate-spin" />
                ) : (
                  <Search className={`w-4 h-4 ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`} />
                )}
              </div>
              <Input
                ref={nameInputRef}
                id="name"
                value={formData.name}
                onChange={(e) => handleNameChange(e.target.value)}
                onFocus={() => formData.name.length >= 2 && suggestions.length > 0 && setShowSuggestions(true)}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                placeholder="Start typing to get AI suggestions..."
                className={`pl-10 ${
                  theme === 'dark' 
                    ? 'bg-slate-800 border-slate-700 text-white placeholder:text-slate-500' 
                    : 'bg-white border-slate-200'
                } ${errors.name ? 'border-red-500' : ''}`}
              />
            </div>
            
            {/* AI Suggestions Dropdown */}
            {showSuggestions && (suggestions.length > 0 || isSearchingSuggestions) && (
              <div className={`absolute z-50 w-full mt-1 rounded-xl border shadow-xl overflow-hidden ${
                theme === 'dark' 
                  ? 'bg-slate-800 border-slate-700' 
                  : 'bg-white border-slate-200'
              }`}>
                <div className={`px-3 py-2 text-xs font-medium flex items-center gap-2 ${
                  theme === 'dark' ? 'bg-slate-700/50 text-slate-400' : 'bg-slate-50 text-slate-500'
                }`}>
                  <Globe className="w-3 h-3" />
                  Global Product Suggestions
                </div>
                {isSearchingSuggestions ? (
                  <div className="p-4 text-center">
                    <Loader2 className="w-5 h-5 mx-auto text-emerald-500 animate-spin mb-2" />
                    <p className={`text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                      Searching global products...
                    </p>
                  </div>
                ) : (
                  <div className="max-h-60 overflow-y-auto">
                    {suggestions.map((suggestion, index) => (
                      <button
                        key={index}
                        type="button"
                        onClick={() => handleSelectSuggestion(suggestion)}
                        className={`w-full px-3 py-2.5 text-left transition-colors ${
                          theme === 'dark' 
                            ? 'hover:bg-slate-700/50' 
                            : 'hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1 min-w-0">
                            <p className={`text-sm font-medium truncate ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                              {suggestion.name}
                            </p>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className={`text-xs ${theme === 'dark' ? 'text-emerald-400' : 'text-emerald-600'}`}>
                                {suggestion.brand}
                              </span>
                              <span className={`text-xs ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>\u2022</span>
                              <span className={`text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                                {suggestion.category}
                              </span>
                            </div>
                          </div>
                          {suggestion.estimatedPrice && (
                            <div className="flex items-center gap-1 ml-2">
                              <TrendingUp className="w-3 h-3 text-amber-500" />
                              <span className={`text-xs font-medium ${theme === 'dark' ? 'text-amber-400' : 'text-amber-600'}`}>
                                ~Rs. {suggestion.estimatedPrice.toLocaleString()}
                              </span>
                            </div>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
            
            {errors.name && <p className="text-xs text-red-500">{errors.name}</p>}
          </div>

          {/* Serial Number & Barcode Row */}
          <div className="grid grid-cols-1 gap-4">
            {/* Serial Number */}
            <div className="space-y-2">
              <Label htmlFor="serialNumber" className={`flex items-center gap-2 text-sm ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                <Hash className="w-4 h-4" />
                Serial Number <span className="text-red-500">*</span>
              </Label>
              <div className="flex gap-2">
                <Input
                  id="serialNumber"
                  value={formData.serialNumber}
                  onChange={(e) => handleChange('serialNumber', e.target.value)}
                  placeholder="Enter serial number"
                  className={`flex-1 ${
                    theme === 'dark' 
                      ? 'bg-slate-800 border-slate-700 text-white placeholder:text-slate-500' 
                      : 'bg-white border-slate-200'
                  } ${errors.serialNumber ? 'border-red-500' : ''}`}
                />
                <button
                  type="button"
                  onClick={handleGenerateSerialNumber}
                  className={`px-3 py-2 rounded-xl transition-colors flex items-center gap-2 flex-shrink-0 ${
                    theme === 'dark'
                      ? 'bg-slate-700 hover:bg-slate-600 text-slate-300'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                  }`}
                  title="Generate new serial number"
                >
                  <RefreshCw className="w-4 h-4" />
                  <span className="hidden sm:inline text-sm">Generate</span>
                </button>
              </div>
              {errors.serialNumber && <p className="text-xs text-red-500">{errors.serialNumber}</p>}
            </div>

            {/* Barcode */}
            <div className="space-y-2">
              <Label htmlFor="barcode" className={`flex items-center gap-2 text-sm ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                <Barcode className="w-4 h-4" />
                Barcode <span className={`text-xs ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>(optional)</span>
              </Label>
              <Input
                id="barcode"
                value={formData.barcode}
                onChange={(e) => handleChange('barcode', e.target.value)}
                placeholder="Enter barcode (optional)"
                className={`${
                  theme === 'dark' 
                    ? 'bg-slate-800 border-slate-700 text-white placeholder:text-slate-500' 
                    : 'bg-white border-slate-200'
                }`}
              />
            </div>
          </div>

          {/* Category & Brand Row */}
          <div className="grid grid-cols-1 gap-4">
            {/* Category */}
            <div className="space-y-2">
              <Label className={`flex items-center gap-2 text-sm ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                <Layers className="w-4 h-4" />
                Category <span className="text-red-500">*</span>
              </Label>
              <SearchableSelect
                options={categoryOptions}
                value={formData.category}
                onValueChange={(value) => handleChange('category', value)}
                placeholder="Select category..."
                searchPlaceholder="Search categories..."
                emptyMessage="No categories found"
                theme={theme}
              />
              {errors.category && <p className="text-xs text-red-500">{errors.category}</p>}
            </div>

            {/* Brand */}
            <div className="space-y-2">
              <Label className={`flex items-center gap-2 text-sm ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                <Building2 className="w-4 h-4" />
                Brand <span className="text-red-500">*</span>
              </Label>
              <SearchableSelect
                options={brandOptions}
                value={formData.brand}
                onValueChange={(value) => handleChange('brand', value)}
                placeholder="Select brand..."
                searchPlaceholder="Search brands..."
                emptyMessage="No brands found"
                theme={theme}
              />
              {errors.brand && <p className="text-xs text-red-500">{errors.brand}</p>}
            </div>
          </div>

          {/* Cost Price & Selling Price Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
            {/* Cost Price */}
            <div className="space-y-2">
              <Label htmlFor="costPrice" className={`flex items-center gap-2 text-sm ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                <DollarSign className="w-4 h-4 text-amber-500" />
                <span>Cost Price (LKR)</span>
              </Label>
              <Input
                id="costPrice"
                type="number"
                min="0"
                step="0.01"
                value={formData.costPrice}
                onChange={(e) => handleChange('costPrice', parseFloat(e.target.value) || 0)}
                placeholder="Enter cost price"
                className={`w-full ${
                  theme === 'dark' 
                    ? 'bg-slate-800 border-slate-700 text-amber-400 placeholder:text-slate-500' 
                    : 'bg-white border-slate-200 text-amber-600'
                } ${errors.costPrice ? 'border-red-500' : ''}`}
              />
              {errors.costPrice && <p className="text-xs text-red-500">{errors.costPrice}</p>}
            </div>

            {/* Selling Price */}
            <div className="space-y-2">
              <Label htmlFor="sellingPrice" className={`flex items-center gap-2 text-sm ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                <DollarSign className="w-4 h-4 text-emerald-500" />
                <span>Selling Price (LKR)</span>
                <span className="text-red-500">*</span>
              </Label>
              <Input
                id="sellingPrice"
                type="number"
                min="0"
                step="0.01"
                value={formData.sellingPrice}
                onChange={(e) => {
                  const value = parseFloat(e.target.value) || 0;
                  handleChange('sellingPrice', value);
                  handleChange('price', value); // Keep price in sync for backward compatibility
                }}
                placeholder="Enter selling price"
                className={`w-full ${
                  theme === 'dark' 
                    ? 'bg-slate-800 border-slate-700 text-emerald-400 placeholder:text-slate-500' 
                    : 'bg-white border-slate-200 text-emerald-600'
                } ${errors.sellingPrice ? 'border-red-500' : ''}`}
              />
              {errors.sellingPrice && <p className="text-xs text-red-500">{errors.sellingPrice}</p>}
            </div>
          </div>

          {/* Profit Margin Display */}
          {formData.costPrice > 0 && formData.sellingPrice > 0 && (
            <div className={`p-3 rounded-xl border ${
              theme === 'dark' 
                ? 'bg-gradient-to-r from-emerald-900/20 to-teal-900/20 border-emerald-500/30' 
                : 'bg-gradient-to-r from-emerald-50 to-teal-50 border-emerald-200'
            }`}>
              <div className="flex items-center justify-between">
                <span className={`text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                  Profit Margin
                </span>
                <div className="flex items-center gap-4">
                  <span className={`font-semibold ${
                    formData.sellingPrice >= formData.costPrice 
                      ? 'text-emerald-500' 
                      : 'text-red-500'
                  }`}>
                    Rs. {(formData.sellingPrice - formData.costPrice).toLocaleString()}
                  </span>
                  <span className={`px-2 py-1 rounded-lg text-sm font-bold ${
                    formData.sellingPrice >= formData.costPrice 
                      ? theme === 'dark' 
                        ? 'bg-emerald-500/20 text-emerald-400' 
                        : 'bg-emerald-100 text-emerald-600'
                      : theme === 'dark'
                        ? 'bg-red-500/20 text-red-400'
                        : 'bg-red-100 text-red-600'
                  }`}>
                    {formData.costPrice > 0 
                      ? `${(((formData.sellingPrice - formData.costPrice) / formData.costPrice) * 100).toFixed(1)}%`
                      : '0%'
                    }
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Stock Row */}
          <div className="grid grid-cols-2 gap-3 sm:gap-4">
            {/* Stock */}
            <div className="space-y-2">
              <Label htmlFor="stock" className={`flex items-center gap-2 text-sm ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                <Boxes className="w-4 h-4" />
                <span className="hidden sm:inline">Stock Quantity</span>
                <span className="sm:hidden">Stock</span>
                <span className="text-red-500">*</span>
              </Label>
              <Input
                id="stock"
                type="number"
                min="0"
                value={formData.stock}
                onChange={(e) => handleChange('stock', parseInt(e.target.value) || 0)}
                placeholder="Enter stock"
                className={`${
                  theme === 'dark' 
                    ? 'bg-slate-800 border-slate-700 text-white placeholder:text-slate-500' 
                    : 'bg-white border-slate-200'
                } ${errors.stock ? 'border-red-500' : ''}`}
              />
              {errors.stock && <p className="text-xs text-red-500">{errors.stock}</p>}
            </div>

            {/* Low Stock Threshold - Moved here for better layout */}
            <div className="space-y-2">
              <Label htmlFor="lowStockThreshold" className={`flex items-center gap-2 text-sm ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                <AlertCircle className="w-4 h-4" />
                <span className="hidden sm:inline">Low Stock Alert</span>
                <span className="sm:hidden">Alert</span>
              </Label>
              <Input
                id="lowStockThreshold"
                type="number"
                min="1"
                value={formData.lowStockThreshold}
                onChange={(e) => handleChange('lowStockThreshold', parseInt(e.target.value) || 10)}
                placeholder="Alert threshold"
                className={`${
                  theme === 'dark' 
                    ? 'bg-slate-800 border-slate-700 text-white placeholder:text-slate-500' 
                    : 'bg-white border-slate-200'
                }`}
              />
            </div>
          </div>

          {/* Warranty Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Warranty */}
            <div className="space-y-2">
              <Label className={`flex items-center gap-2 text-sm ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                <Shield className="w-4 h-4" />
                Warranty Period
              </Label>
              <SearchableSelect
                options={warrantyOptions}
                value={formData.warranty}
                onValueChange={(value) => handleChange('warranty', value)}
                placeholder="Select warranty..."
                searchPlaceholder="Search warranty..."
                emptyMessage="No options found"
                theme={theme}
              />
            </div>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="description" className={`flex items-center gap-2 text-sm ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                <FileText className="w-4 h-4" />
                Description <span className={`text-xs ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>(optional)</span>
              </Label>
              {geminiService.hasApiKey() && formData.name && (
                <button
                  type="button"
                  onClick={handleGenerateDescription}
                  disabled={isGeneratingDescription}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    isGeneratingDescription
                      ? 'bg-slate-500/50 cursor-not-allowed text-slate-400'
                      : theme === 'dark'
                        ? 'bg-gradient-to-r from-purple-500/20 to-blue-500/20 hover:from-purple-500/30 hover:to-blue-500/30 text-purple-400'
                        : 'bg-gradient-to-r from-purple-100 to-blue-100 hover:from-purple-200 hover:to-blue-200 text-purple-700'
                  }`}
                >
                  {isGeneratingDescription ? (
                    <>
                      <Loader2 className="w-3 h-3 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Wand2 className="w-3 h-3" />
                      AI Generate
                    </>
                  )}
                </button>
              )}
            </div>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => handleChange('description', e.target.value)}
              placeholder="Enter product description or click 'AI Generate' for auto-generated description"
              rows={8}
              className={`${
                theme === 'dark' 
                  ? 'bg-slate-800 border-slate-700 text-white placeholder:text-slate-500' 
                  : 'bg-white border-slate-200'
              }`}
            />
          </div>

          {/* Action Buttons */}
          <div className={`flex flex-col sm:flex-row gap-3 pt-4 border-t ${theme === 'dark' ? 'border-slate-700' : 'border-slate-200'}`}>
            <button
              type="submit"
              className="flex-1 px-4 py-2.5 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-700 hover:to-emerald-600 text-white rounded-xl font-medium transition-all flex items-center justify-center gap-2 order-1 sm:order-1"
            >
              <Save className="w-4 h-4" />
              {isEditing ? 'Update Product' : 'Add Product'}
            </button>
            <button
              type="button"
              onClick={() => navigate('/products')}
              className={`flex-1 px-4 py-2.5 rounded-xl font-medium transition-colors border order-2 sm:order-2 ${
                theme === 'dark'
                  ? 'bg-slate-700/50 hover:bg-slate-700 text-white border-slate-600/50'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-900 border-slate-300'
              }`}
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ProductForm;
