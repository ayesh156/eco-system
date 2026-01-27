import React, { useState, useEffect, useRef, useCallback } from 'react';
import type { Product } from '../../data/mockData';
import { generateSerialNumber } from '../../data/mockData';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../ui/dialog';
import { Label } from '../ui/label';
import { SearchableSelect } from '../ui/searchable-select';
import { 
  Package, Save, Tag, DollarSign, Boxes, FileText, Hash, 
  Loader2, AlertCircle, Sparkles, Brain, Wand2, RefreshCw, Shield,
  ImageIcon, Upload, X, CheckCircle2, Clipboard
} from 'lucide-react';
import { productService, type CreateProductDTO, type APIProduct, type ProductSuggestion } from '../../services/productService';
import { categoryService, type APICategory } from '../../services/categoryService';
import { brandService, type APIBrand } from '../../services/brandService';
import { geminiService } from '../../services/geminiService';
import * as productImageService from '../../services/productImageService';

interface ProductFormModalProps {
  isOpen: boolean;
  product?: Product;
  onClose: () => void;
  onSave: (product: Product) => void;
  autoAddToInvoice?: boolean; // If true, the product will be auto-added to invoice items
  shopId?: string; // For SuperAdmin viewing other shops
}

interface ProductFormData {
  name: string;
  serialNumber: string;
  barcode: string;
  category: string;
  categoryId: string;
  brand: string;
  brandId: string;
  price: number;
  costPrice: number;
  stock: number;
  description: string;
  image: string;
  warranty: string;
  lowStockThreshold: number;
}

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

export const ProductFormModal: React.FC<ProductFormModalProps> = ({
  isOpen,
  product,
  onClose,
  onSave,
  autoAddToInvoice = true,
  shopId,
}) => {
  const { theme, aiAutoFillEnabled } = useTheme();
  const authContext = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [formData, setFormData] = useState<ProductFormData>({
    name: '',
    serialNumber: generateSerialNumber(),
    barcode: '',
    category: '',
    categoryId: '',
    brand: '',
    brandId: '',
    price: 0,
    costPrice: 0,
    stock: 1,
    description: '',
    image: '',
    warranty: '',
    lowStockThreshold: 10,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  
  // API data
  const [apiCategories, setApiCategories] = useState<APICategory[]>([]);
  const [apiBrands, setApiBrands] = useState<APIBrand[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(true);
  
  // AI Features State
  const [suggestions, setSuggestions] = useState<ProductSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isSearchingSuggestions, setIsSearchingSuggestions] = useState(false);
  const [isGeneratingDescription, setIsGeneratingDescription] = useState(false);
  const [aiAutoFillSuccess, setAiAutoFillSuccess] = useState(false);
  const suggestionTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);
  
  // Image upload state
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isAnalyzingImage, setIsAnalyzingImage] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [pasteSuccess, setPasteSuccess] = useState(false);

  // Load categories and brands
  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen]);

  const loadData = async () => {
    setIsLoadingData(true);
    try {
      const [categoriesResult, brandsResult] = await Promise.all([
        categoryService.getAll(),
        brandService.getAll(),
      ]);
      setApiCategories(categoriesResult.categories);
      setApiBrands(brandsResult.brands);
    } catch (error) {
      console.error('Failed to load categories/brands:', error);
    } finally {
      setIsLoadingData(false);
    }
  };

  // Reset form when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      if (product) {
        // Editing existing product - find categoryId and brandId by name
        const categoryMatch = apiCategories.find(c => c.name === product.category);
        const brandMatch = apiBrands.find(b => b.name === product.brand);
        
        setFormData({
          name: product.name,
          serialNumber: product.serialNumber || generateSerialNumber(),
          barcode: product.barcode || '',
          category: product.category || '',
          categoryId: categoryMatch?.id || '',
          brand: product.brand || '',
          brandId: brandMatch?.id || '',
          price: product.price || 0,
          costPrice: product.costPrice || 0,
          stock: product.stock || 1,
          description: product.description || '',
          image: product.image || '',
          warranty: product.warranty || '',
          lowStockThreshold: product.lowStockThreshold || 10,
        });
      } else {
        // New product
        setFormData({
          name: '',
          serialNumber: generateSerialNumber(),
          barcode: '',
          category: '',
          categoryId: '',
          brand: '',
          brandId: '',
          price: 0,
          costPrice: 0,
          stock: 1,
          description: '',
          image: '',
          warranty: '',
          lowStockThreshold: 10,
        });
      }
      setErrors({});
      setApiError(null);
      setSuggestions([]);
      setShowSuggestions(false);
      setAiAutoFillSuccess(false);
      setIsUploading(false);
      setUploadProgress(0);
      setIsAnalyzingImage(false);
    }
  }, [isOpen, product, apiCategories, apiBrands]);

  // AI Auto-fill: Search suggestions when name changes
  const handleNameChange = async (name: string) => {
    setFormData(prev => ({ ...prev, name }));
    setShowSuggestions(false);
    setSuggestions([]);
    
    if (!aiAutoFillEnabled || name.length < 2) return;
    
    // Debounce the search
    if (suggestionTimeoutRef.current) {
      clearTimeout(suggestionTimeoutRef.current);
    }
    
    suggestionTimeoutRef.current = setTimeout(async () => {
      setIsSearchingSuggestions(true);
      try {
        const results = await productService.getSuggestions(name);
        if (results.length > 0) {
          setSuggestions(results);
          setShowSuggestions(true);
        }
      } catch (error) {
        console.error('Failed to get suggestions:', error);
      } finally {
        setIsSearchingSuggestions(false);
      }
    }, 500);
  };

  // Apply suggestion to form
  const applySuggestion = (suggestion: ProductSuggestion) => {
    setFormData(prev => ({
      ...prev,
      name: suggestion.name,
      description: suggestion.description || prev.description,
      price: suggestion.price || prev.price,
      costPrice: suggestion.costPrice || prev.costPrice,
      category: suggestion.categoryName || prev.category,
      categoryId: suggestion.categoryId || prev.categoryId,
      brand: suggestion.brandName || prev.brand,
      brandId: suggestion.brandId || prev.brandId,
      warranty: suggestion.warranty || prev.warranty,
    }));
    setShowSuggestions(false);
    setAiAutoFillSuccess(true);
    setTimeout(() => setAiAutoFillSuccess(false), 3000);
  };

  // Generate AI description
  const generateDescription = async () => {
    if (!formData.name) return;
    
    setIsGeneratingDescription(true);
    try {
      const description = await geminiService.generateProductDescription(
        formData.name,
        formData.brand || 'Generic',
        formData.category || 'General'
      );
      setFormData(prev => ({ ...prev, description }));
    } catch (error) {
      console.error('Failed to generate description:', error);
    } finally {
      setIsGeneratingDescription(false);
    }
  };

  // Helper function to find best matching brand
  const findBestBrandMatch = (aiBrandName: string) => {
    if (!apiBrands.length || !aiBrandName) return undefined;
    const s1 = aiBrandName.toLowerCase().trim();
    
    for (const brand of apiBrands) {
      const s2 = brand.name.toLowerCase().trim();
      if (s1 === s2 || s1.includes(s2) || s2.includes(s1)) {
        return brand;
      }
    }
    return undefined;
  };

  // Helper function to find best matching category
  const findBestCategoryMatch = (aiCategoryName: string) => {
    if (!apiCategories.length || !aiCategoryName) return undefined;
    const s1 = aiCategoryName.toLowerCase().trim();
    
    for (const category of apiCategories) {
      const s2 = category.name.toLowerCase().trim();
      if (s1 === s2 || s1.includes(s2) || s2.includes(s1)) {
        return category;
      }
    }
    return undefined;
  };

  // Handle image upload with AI analysis
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

    // Check Supabase configuration
    if (!productImageService.isSupabaseConfigured()) {
      setErrors(prev => ({ ...prev, image: 'Image storage not configured. Please contact administrator.' }));
      return;
    }

    const shopId = authContext?.user?.shop?.id;
    if (!shopId) {
      setErrors(prev => ({ ...prev, image: 'Shop ID required for upload. Please log in again.' }));
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);
    setErrors(prev => ({ ...prev, image: '' }));

    try {
      // Step 1: Compress the image
      setUploadProgress(20);
      const compressedFile = await productImageService.compressImage(file, 800, 0.8);
      
      // Step 2: Analyze image with AI (only for new products)
      if (!product && aiAutoFillEnabled) {
        setUploadProgress(40);
        setIsAnalyzingImage(true);
        try {
          const base64Image = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target?.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(compressedFile);
          });
          
          const analysisResult = await geminiService.analyzeProductImage(base64Image);
          
          if (analysisResult) {
            // First check database for existing product
            try {
              const dbResults = await productService.getSuggestions(analysisResult.name);
              
              if (dbResults.length > 0) {
                const bestDbMatch = dbResults[0];
                const matchedBrand = findBestBrandMatch(bestDbMatch.brandName || analysisResult.brand);
                const matchedCategory = findBestCategoryMatch(bestDbMatch.categoryName || analysisResult.category);

                setFormData(prev => ({
                  ...prev,
                  name: bestDbMatch.name || analysisResult.name || prev.name,
                  description: bestDbMatch.description || analysisResult.description || prev.description,
                  price: bestDbMatch.price || analysisResult.estimatedPrice || prev.price,
                  costPrice: bestDbMatch.costPrice || analysisResult.costPrice || prev.costPrice,
                  warranty: bestDbMatch.warranty || analysisResult.warranty || prev.warranty,
                  brand: matchedBrand?.name || bestDbMatch.brandName || analysisResult.brand || prev.brand,
                  brandId: matchedBrand?.id || '',
                  category: matchedCategory?.name || bestDbMatch.categoryName || analysisResult.category || prev.category,
                  categoryId: matchedCategory?.id || '',
                }));
                
                setAiAutoFillSuccess(true);
                setTimeout(() => setAiAutoFillSuccess(false), 3000);
              } else {
                // Use AI analysis result
                const matchedBrand = findBestBrandMatch(analysisResult.brand);
                const matchedCategory = findBestCategoryMatch(analysisResult.category);

                setFormData(prev => ({
                  ...prev,
                  name: analysisResult.name || prev.name,
                  description: analysisResult.description || prev.description,
                  price: analysisResult.estimatedPrice || prev.price,
                  costPrice: analysisResult.costPrice || prev.costPrice,
                  warranty: analysisResult.warranty || prev.warranty,
                  brand: matchedBrand?.name || analysisResult.brand || prev.brand,
                  brandId: matchedBrand?.id || '',
                  category: matchedCategory?.name || analysisResult.category || prev.category,
                  categoryId: matchedCategory?.id || '',
                }));
                
                setAiAutoFillSuccess(true);
                setTimeout(() => setAiAutoFillSuccess(false), 3000);
              }
            } catch (dbError) {
              console.log('DB search failed, using AI result:', dbError);
              const matchedBrand = findBestBrandMatch(analysisResult.brand);
              const matchedCategory = findBestCategoryMatch(analysisResult.category);

              setFormData(prev => ({
                ...prev,
                name: analysisResult.name || prev.name,
                description: analysisResult.description || prev.description,
                price: analysisResult.estimatedPrice || prev.price,
                costPrice: analysisResult.costPrice || prev.costPrice,
                brand: matchedBrand?.name || analysisResult.brand || prev.brand,
                brandId: matchedBrand?.id || '',
                category: matchedCategory?.name || analysisResult.category || prev.category,
                categoryId: matchedCategory?.id || '',
              }));
              
              setAiAutoFillSuccess(true);
              setTimeout(() => setAiAutoFillSuccess(false), 3000);
            }
          }
        } catch (analysisError) {
          console.log('Image analysis failed:', analysisError);
        } finally {
          setIsAnalyzingImage(false);
        }
      }
      
      // Step 3: Upload to Supabase
      setUploadProgress(50);
      const uploadResult = await productImageService.uploadProductImage(
        compressedFile,
        shopId,
        product?.id
      );
      
      if (!uploadResult.success) {
        setErrors(prev => ({ ...prev, image: uploadResult.error || 'Failed to upload image' }));
        setIsUploading(false);
        setUploadProgress(0);
        return;
      }

      setUploadProgress(100);
      setTimeout(() => {
        setFormData(prev => ({ ...prev, image: uploadResult.url || '' }));
        setIsUploading(false);
        setUploadProgress(0);
      }, 300);
    } catch {
      setErrors(prev => ({ ...prev, image: 'Failed to process image' }));
      setIsUploading(false);
      setUploadProgress(0);
    }
  }, [authContext?.user?.shop?.id, product, aiAutoFillEnabled, apiBrands, apiCategories]);

  // Handle file input change
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleImageUpload(file);
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
    if (file) handleImageUpload(file);
  };

  // Handle paste from clipboard (Google image paste)
  const handlePaste = useCallback(async (e: ClipboardEvent) => {
    // Only handle paste when modal is open
    if (!isOpen) return;
    
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
  }, [handleImageUpload, isOpen]);

  // Add paste event listener
  useEffect(() => {
    if (isOpen) {
      document.addEventListener('paste', handlePaste);
      return () => document.removeEventListener('paste', handlePaste);
    }
  }, [handlePaste, isOpen]);

  // Remove image
  const handleRemoveImage = async () => {
    if (formData.image && formData.image.includes('supabase')) {
      try {
        await productImageService.deleteProductImage(formData.image);
      } catch (error) {
        console.error('Failed to delete image:', error);
      }
    }
    setFormData(prev => ({ ...prev, image: '' }));
  };

  // Validate form
  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.name.trim()) {
      newErrors.name = 'Product name is required';
    }
    if (formData.price <= 0) {
      newErrors.price = 'Price must be greater than 0';
    }
    if (formData.stock < 0) {
      newErrors.stock = 'Stock cannot be negative';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsLoading(true);
    setApiError(null);

    try {
      // Find category/brand IDs if names are provided
      let categoryId = formData.categoryId;
      let brandId = formData.brandId;
      
      if (formData.category && !categoryId) {
        const cat = apiCategories.find(c => c.name.toLowerCase() === formData.category.toLowerCase());
        categoryId = cat?.id || '';
      }
      if (formData.brand && !brandId) {
        const br = apiBrands.find(b => b.name.toLowerCase() === formData.brand.toLowerCase());
        brandId = br?.id || '';
      }

      const createData: CreateProductDTO = {
        name: formData.name.trim(),
        price: formData.price,
        costPrice: formData.costPrice || undefined,
        stock: formData.stock,
        description: formData.description.trim() || undefined,
        serialNumber: formData.serialNumber.trim() || undefined,
        barcode: formData.barcode.trim() || undefined,
        warranty: formData.warranty || undefined,
        lowStockThreshold: formData.lowStockThreshold,
        categoryId: categoryId || undefined,
        brandId: brandId || undefined,
        image: formData.image || undefined,
      };

      let savedProduct: APIProduct;
      
      if (product) {
        // Update existing
        savedProduct = await productService.update(product.id, createData, shopId);
      } else {
        // Create new
        savedProduct = await productService.create(createData, shopId);
      }

      // Convert to frontend format
      const frontendProduct: Product = {
        id: savedProduct.id,
        name: savedProduct.name,
        serialNumber: savedProduct.serialNumber || formData.serialNumber,
        barcode: savedProduct.barcode,
        category: savedProduct.category?.name || formData.category,
        brand: savedProduct.brand?.name || formData.brand,
        price: savedProduct.price,
        costPrice: savedProduct.costPrice,
        sellingPrice: savedProduct.price,
        stock: savedProduct.stock,
        description: savedProduct.description,
        image: savedProduct.image,
        warranty: savedProduct.warranty,
        lowStockThreshold: savedProduct.lowStockThreshold,
        profitMargin: savedProduct.price && savedProduct.costPrice 
          ? ((savedProduct.price - savedProduct.costPrice) / savedProduct.costPrice) * 100 
          : 0,
        createdAt: savedProduct.createdAt || new Date().toISOString(),
      };

      onSave(frontendProduct);
      onClose();
    } catch (error) {
      console.error('Failed to save product:', error);
      setApiError(error instanceof Error ? error.message : 'Failed to save product');
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (field: keyof ProductFormData, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  // Category and Brand options for dropdowns
  const categorySelectOptions = apiCategories.map(c => ({ value: c.id, label: c.name }));
  const brandSelectOptions = apiBrands.map(b => ({ value: b.id, label: b.name }));

  const inputClass = `w-full px-4 py-2.5 rounded-xl border transition-all ${
    theme === 'dark'
      ? 'bg-slate-800/50 border-slate-700/50 text-white placeholder-slate-500 focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/20'
      : 'bg-white border-slate-200 text-slate-900 placeholder-slate-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20'
  }`;

  const labelClass = `block text-sm font-medium mb-1.5 ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className={`max-w-2xl max-h-[90vh] overflow-y-auto ${
        theme === 'dark' ? 'bg-slate-900 border-slate-700/50' : 'bg-white border-slate-200'
      }`}>
        <DialogHeader>
          <DialogTitle className={`text-xl font-semibold flex items-center gap-2 ${
            theme === 'dark' ? 'text-white' : 'text-slate-900'
          }`}>
            <Package className="w-5 h-5 text-teal-500" />
            {product ? 'Edit Product' : 'Add New Product'}
          </DialogTitle>
          <DialogDescription className={theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}>
            {product ? 'Update product details' : 'Add a new product to inventory'}
            {autoAddToInvoice && !product && (
              <span className="ml-1 text-emerald-500">• Will be auto-added to invoice</span>
            )}
          </DialogDescription>
        </DialogHeader>

        {apiError && (
          <div className="flex items-center gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-sm">
            <AlertCircle className="w-4 h-4" />
            {apiError}
          </div>
        )}

        {aiAutoFillSuccess && (
          <div className="flex items-center gap-2 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-sm">
            <Sparkles className="w-4 h-4" />
            AI auto-filled product details!
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          {/* Product Name with AI Suggestions */}
          <div className="relative">
            <Label className={labelClass}>
              Product Name <span className="text-red-500">*</span>
            </Label>
            <div className="relative">
              <Tag className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${
                theme === 'dark' ? 'text-slate-500' : 'text-slate-400'
              }`} />
              <input
                ref={nameInputRef}
                type="text"
                value={formData.name}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder="Enter product name..."
                className={`${inputClass} pl-10 pr-10`}
              />
              {isSearchingSuggestions && (
                <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-emerald-500" />
              )}
              {aiAutoFillEnabled && !isSearchingSuggestions && formData.name.length >= 2 && (
                <Brain className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-500" />
              )}
            </div>
            {errors.name && <p className="mt-1 text-xs text-red-500">{errors.name}</p>}
            
            {/* AI Suggestions Dropdown */}
            {showSuggestions && suggestions.length > 0 && (
              <div className={`absolute z-50 w-full mt-1 rounded-xl border shadow-lg max-h-60 overflow-y-auto ${
                theme === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'
              }`}>
                <div className={`px-3 py-2 text-xs font-medium border-b ${
                  theme === 'dark' ? 'text-slate-400 border-slate-700' : 'text-slate-500 border-slate-200'
                }`}>
                  <Sparkles className="w-3 h-3 inline mr-1" />
                  AI Suggestions
                </div>
                {suggestions.map((suggestion, index) => (
                  <button
                    key={index}
                    type="button"
                    onClick={() => applySuggestion(suggestion)}
                    className={`w-full px-3 py-2 text-left transition-colors ${
                      theme === 'dark' ? 'hover:bg-slate-700' : 'hover:bg-slate-50'
                    }`}
                  >
                    <p className={`font-medium text-sm ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                      {suggestion.name}
                    </p>
                    <p className={`text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                      {suggestion.brandName} • {suggestion.categoryName} • Rs. {suggestion.price?.toLocaleString()}
                    </p>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Category & Brand Row */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className={labelClass}>Category</Label>
              <SearchableSelect
                options={categorySelectOptions}
                value={formData.categoryId}
                onValueChange={(value) => {
                  const selectedCategory = apiCategories.find(c => c.id === value);
                  setFormData(prev => ({ 
                    ...prev, 
                    categoryId: value, 
                    category: selectedCategory?.name || '' 
                  }));
                }}
                placeholder="Select category"
                theme={theme}
              />
            </div>
            <div>
              <Label className={labelClass}>Brand</Label>
              <SearchableSelect
                options={brandSelectOptions}
                value={formData.brandId}
                onValueChange={(value) => {
                  const selectedBrand = apiBrands.find(b => b.id === value);
                  setFormData(prev => ({ 
                    ...prev, 
                    brandId: value, 
                    brand: selectedBrand?.name || '' 
                  }));
                }}
                placeholder="Select brand"
                theme={theme}
              />
            </div>
          </div>

          {/* Product Image Upload */}
          <div>
            <Label className={`flex items-center gap-2 ${labelClass}`}>
              <ImageIcon className="w-4 h-4" />
              Product Image
              {!product && aiAutoFillEnabled && (
                <span className={`text-xs ${theme === 'dark' ? 'text-emerald-400' : 'text-emerald-600'}`}>
                  (AI will auto-fill details)
                </span>
              )}
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
                  className="w-full h-32 object-contain"
                />
                <button
                  type="button"
                  onClick={handleRemoveImage}
                  className="absolute top-2 right-2 p-1.5 rounded-lg bg-red-500 text-white hover:bg-red-600 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              /* Upload Drop Zone */
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`relative rounded-xl border-2 border-dashed p-4 text-center cursor-pointer transition-all ${
                  isDragOver
                    ? 'border-emerald-500 bg-emerald-500/10'
                    : theme === 'dark' 
                      ? 'border-slate-700 bg-slate-800/50 hover:border-slate-600 hover:bg-slate-800' 
                      : 'border-slate-200 bg-slate-50 hover:border-slate-300 hover:bg-slate-100'
                }`}
              >
                {isUploading ? (
                  /* Upload Progress */
                  <div className="space-y-2">
                    {isAnalyzingImage ? (
                      /* AI Analysis Loader */
                      <div className="space-y-3 py-2">
                        <div className="relative w-12 h-12 mx-auto">
                          <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-emerald-500 border-r-blue-500 animate-spin" />
                          <div className={`absolute inset-2 rounded-full flex items-center justify-center ${
                            theme === 'dark' ? 'bg-gradient-to-br from-emerald-500/20 to-blue-500/20' : 'bg-gradient-to-br from-emerald-50 to-blue-50'
                          }`}>
                            <Brain className="w-5 h-5 text-emerald-500 animate-pulse" />
                          </div>
                          <Sparkles className="absolute -top-1 -right-1 w-3 h-3 text-amber-400 animate-ping" />
                        </div>
                        <p className={`text-xs font-medium bg-gradient-to-r from-emerald-500 to-blue-500 bg-clip-text text-transparent`}>
                          AI Analyzing Image...
                        </p>
                      </div>
                    ) : (
                      <>
                        <Upload className="w-6 h-6 mx-auto text-emerald-500 animate-pulse" />
                        <div className={`w-full h-1.5 rounded-full overflow-hidden ${
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
                      </>
                    )}
                  </div>
                ) : (
                  /* Upload Instructions */
                  <div className="space-y-2">
                    <Upload className={`w-6 h-6 mx-auto ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`} />
                    <p className={`text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                      Drop, click, or <span className="font-medium">Ctrl+V</span> to paste image
                    </p>
                    {geminiService.hasApiKey() && aiAutoFillEnabled && !product && (
                      <div className={`flex items-center justify-center gap-1 text-xs ${
                        theme === 'dark' ? 'text-emerald-400' : 'text-emerald-600'
                      }`}>
                        <Brain className="w-3 h-3" />
                        AI auto-fills all fields
                      </div>
                    )}
                    <div className={`flex items-center justify-center gap-2 pt-2 border-t ${
                      theme === 'dark' ? 'border-slate-700' : 'border-slate-200'
                    }`}>
                      <Clipboard className={`w-3 h-3 ${theme === 'dark' ? 'text-emerald-400' : 'text-emerald-600'}`} />
                      <span className={`text-xs ${theme === 'dark' ? 'text-emerald-400' : 'text-emerald-600'}`}>
                        Paste from Google Images
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )}
            {errors.image && <p className="mt-1 text-xs text-red-500">{errors.image}</p>}
          </div>

          {/* AI Auto-Fill Success Message */}
          {aiAutoFillSuccess && (
            <div className={`flex items-center gap-2 p-3 rounded-xl ${
              theme === 'dark' ? 'bg-emerald-500/10 border border-emerald-500/20' : 'bg-emerald-50 border border-emerald-200'
            }`}>
              <CheckCircle2 className="w-5 h-5 text-emerald-500" />
              <div>
                <p className={`text-sm font-medium ${theme === 'dark' ? 'text-emerald-400' : 'text-emerald-700'}`}>
                  AI Auto-Fill Complete!
                </p>
                <p className={`text-xs ${theme === 'dark' ? 'text-emerald-400/70' : 'text-emerald-600'}`}>
                  Product details filled automatically
                </p>
              </div>
            </div>
          )}

          {/* Price & Cost Row */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className={labelClass}>
                Selling Price (Rs.) <span className="text-red-500">*</span>
              </Label>
              <div className="relative">
                <DollarSign className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${
                  theme === 'dark' ? 'text-slate-500' : 'text-slate-400'
                }`} />
                <input
                  type="number"
                  value={formData.price || ''}
                  onChange={(e) => handleChange('price', parseFloat(e.target.value) || 0)}
                  placeholder="0.00"
                  className={`${inputClass} pl-10`}
                />
              </div>
              {errors.price && <p className="mt-1 text-xs text-red-500">{errors.price}</p>}
            </div>
            <div>
              <Label className={labelClass}>Cost Price (Rs.)</Label>
              <div className="relative">
                <DollarSign className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${
                  theme === 'dark' ? 'text-slate-500' : 'text-slate-400'
                }`} />
                <input
                  type="number"
                  value={formData.costPrice || ''}
                  onChange={(e) => handleChange('costPrice', parseFloat(e.target.value) || 0)}
                  placeholder="0.00"
                  className={`${inputClass} pl-10`}
                />
              </div>
            </div>
          </div>

          {/* Stock & Serial Row */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className={labelClass}>Stock Quantity</Label>
              <div className="relative">
                <Boxes className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${
                  theme === 'dark' ? 'text-slate-500' : 'text-slate-400'
                }`} />
                <input
                  type="number"
                  value={formData.stock}
                  onChange={(e) => handleChange('stock', parseInt(e.target.value) || 0)}
                  placeholder="0"
                  min="0"
                  className={`${inputClass} pl-10`}
                />
              </div>
              {errors.stock && <p className="mt-1 text-xs text-red-500">{errors.stock}</p>}
            </div>
            <div>
              <Label className={labelClass}>Serial Number</Label>
              <div className="relative">
                <Hash className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${
                  theme === 'dark' ? 'text-slate-500' : 'text-slate-400'
                }`} />
                <input
                  type="text"
                  value={formData.serialNumber}
                  onChange={(e) => handleChange('serialNumber', e.target.value)}
                  placeholder="Auto-generated"
                  className={`${inputClass} pl-10`}
                />
                <button
                  type="button"
                  onClick={() => handleChange('serialNumber', generateSerialNumber())}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-slate-700/50"
                  title="Generate new serial"
                >
                  <RefreshCw className="w-3 h-3 text-slate-400" />
                </button>
              </div>
            </div>
          </div>

          {/* Warranty */}
          <div>
            <Label className={labelClass}>Warranty Period</Label>
            <div className="relative">
              <Shield className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${
                theme === 'dark' ? 'text-slate-500' : 'text-slate-400'
              }`} />
              <select
                value={formData.warranty}
                onChange={(e) => handleChange('warranty', e.target.value)}
                className={`${inputClass} pl-10 appearance-none cursor-pointer`}
              >
                {warrantyOptions.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Description with AI Generate */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <Label className={`${labelClass} mb-0`}>Description</Label>
              {aiAutoFillEnabled && formData.name && (
                <button
                  type="button"
                  onClick={generateDescription}
                  disabled={isGeneratingDescription}
                  className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium transition-all ${
                    theme === 'dark' 
                      ? 'bg-purple-500/20 text-purple-400 hover:bg-purple-500/30' 
                      : 'bg-purple-50 text-purple-600 hover:bg-purple-100'
                  }`}
                >
                  {isGeneratingDescription ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <Wand2 className="w-3 h-3" />
                  )}
                  AI Generate
                </button>
              )}
            </div>
            <div className="relative">
              <FileText className={`absolute left-3 top-3 w-4 h-4 ${
                theme === 'dark' ? 'text-slate-500' : 'text-slate-400'
              }`} />
              <textarea
                value={formData.description}
                onChange={(e) => handleChange('description', e.target.value)}
                placeholder="Product description..."
                rows={3}
                className={`${inputClass} pl-10 resize-none`}
              />
            </div>
          </div>

          {/* Profit Margin Display */}
          {formData.price > 0 && formData.costPrice > 0 && (
            <div className={`p-3 rounded-xl ${
              theme === 'dark' ? 'bg-slate-800/50' : 'bg-slate-50'
            }`}>
              <div className="flex items-center justify-between text-sm">
                <span className={theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}>
                  Profit Margin
                </span>
                <span className={`font-semibold ${
                  ((formData.price - formData.costPrice) / formData.costPrice) * 100 >= 20
                    ? 'text-emerald-500'
                    : 'text-amber-500'
                }`}>
                  {(((formData.price - formData.costPrice) / formData.costPrice) * 100).toFixed(1)}%
                  <span className={`ml-2 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                    (Rs. {(formData.price - formData.costPrice).toLocaleString()} profit)
                  </span>
                </span>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className={`flex justify-end gap-3 pt-4 border-t ${
            theme === 'dark' ? 'border-slate-700/50' : 'border-slate-200'
          }`}>
            <button
              type="button"
              onClick={onClose}
              className={`px-4 py-2.5 rounded-xl font-medium transition-colors ${
                theme === 'dark' 
                  ? 'bg-slate-800 text-slate-300 hover:bg-slate-700' 
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading || isLoadingData}
              className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-teal-500 to-emerald-500 text-white rounded-xl font-medium shadow-lg hover:shadow-teal-500/25 transition-all disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  {product ? 'Update Product' : autoAddToInvoice ? 'Add to Invoice' : 'Save Product'}
                </>
              )}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
