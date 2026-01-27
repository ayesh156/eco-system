import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { generateSerialNumber } from '../data/mockData';
import { useTheme } from '../contexts/ThemeContext';
import { useDataCache } from '../contexts/DataCacheContext';
import { geminiService } from '../services/geminiService';
import { productService, type CreateProductDTO, type APIProduct, type ProductSuggestion } from '../services/productService';
import { categoryService, type APICategory } from '../services/categoryService';
import { brandService, type APIBrand } from '../services/brandService';
import * as productImageService from '../services/productImageService';
import { useAuth } from '../contexts/AuthContext';
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

// Image compression utility - uses Supabase service

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
  const { loadProducts, currentShopId } = useDataCache();
  const authContext = useAuth();
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditing = !!id;
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);
  
  // Track if name was manually cleared to prevent re-triggering AI
  const nameWasCleared = useRef(false);
  const previousName = useRef('');

  // Product being edited (fetched from API)
  const [existingProduct, setExistingProduct] = useState<APIProduct | null>(null);
  const [isLoadingProduct, setIsLoadingProduct] = useState(false);

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
  
  // API State for categories and brands
  const [apiCategories, setApiCategories] = useState<APICategory[]>([]);
  const [apiBrands, setApiBrands] = useState<APIBrand[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  
  // AI Features State
  const [suggestions, setSuggestions] = useState<Array<{ name: string; brand: string; category: string; estimatedPrice?: number }>>([]);
  const [dbSuggestions, setDbSuggestions] = useState<ProductSuggestion[]>([]); // Database suggestions
  const [isSearchingSuggestions, setIsSearchingSuggestions] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isGeneratingDescription, setIsGeneratingDescription] = useState(false);
  const [aiAutoFillSuccess, setAiAutoFillSuccess] = useState(false);
  const [isAnalyzingImage, setIsAnalyzingImage] = useState(false);
  const suggestionTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dbSuggestionTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);
  
  // Pending brand/category to be created (when selecting from other shop's product)
  const [pendingBrandName, setPendingBrandName] = useState<string | null>(null);
  const [pendingCategoryName, setPendingCategoryName] = useState<string | null>(null);
  // Full brand/category details from suggestion for auto-creation
  const [pendingBrandData, setPendingBrandData] = useState<{
    name: string;
    description?: string;
    image?: string;
    website?: string;
    contactEmail?: string;
    contactPhone?: string;
  } | null>(null);
  const [pendingCategoryData, setPendingCategoryData] = useState<{
    name: string;
    description?: string;
    image?: string;
  } | null>(null);

  // Load categories, brands, and product (if editing) from API
  useEffect(() => {
    const loadData = async () => {
      setIsLoadingData(true);
      if (isEditing && id) {
        setIsLoadingProduct(true);
      }
      try {
        const [categoriesResult, brandsResult] = await Promise.all([
          categoryService.getAll({ shopId: currentShopId || undefined }),
          brandService.getAll({ shopId: currentShopId || undefined })
        ]);
        setApiCategories(categoriesResult.categories);
        setApiBrands(brandsResult.brands);

        // Fetch product if editing
        if (isEditing && id) {
          try {
            const product = await productService.getById(id, currentShopId || undefined);
            setExistingProduct(product);
            
            // Populate form with product data
            setFormData({
              name: product.name || '',
              serialNumber: product.serialNumber || generateSerialNumber(),
              barcode: product.barcode || '',
              category: product.categoryId || product.category?.id || '',
              brand: product.brandId || product.brand?.id || '',
              price: product.price || 0,
              costPrice: product.costPrice || 0,
              sellingPrice: product.price || 0,
              stock: product.stock || 0,
              description: product.description || '',
              image: product.image || '',
              warranty: product.warranty || '',
              lowStockThreshold: product.lowStockThreshold || 10,
            });
          } catch (err) {
            console.error('Failed to load product:', err);
            setApiError('Failed to load product details');
          }
        }
      } catch (error) {
        console.error('Failed to load categories/brands:', error);
        // Fall back to hardcoded options if API fails
        setApiError('Failed to load categories and brands from server');
      } finally {
        setIsLoadingData(false);
        setIsLoadingProduct(false);
      }
    };
    loadData();
  }, [isEditing, id, currentShopId]);

  // Dynamic category options from API or fallback
  const dynamicCategoryOptions = apiCategories.length > 0 
    ? apiCategories.map(c => ({ value: c.id, label: c.name }))
    : categoryOptions;

  // Dynamic brand options from API or fallback  
  const dynamicBrandOptions = apiBrands.length > 0
    ? apiBrands.map(b => ({ value: b.id, label: b.name }))
    : brandOptions;

  // No longer need this useEffect since we load product data in the main loadData effect
  // The form is populated directly when the product is fetched from API

  // Handle image upload with compression and Supabase upload (required)
  const handleImageUpload = useCallback(async (file: File) => {
    // Helper function to calculate string similarity (0-1)
    const calculateSimilarity = (str1: string, str2: string): number => {
      const s1 = str1.toLowerCase().trim();
      const s2 = str2.toLowerCase().trim();
      
      // Exact match
      if (s1 === s2) return 1;
      
      // Contains match
      if (s1.includes(s2) || s2.includes(s1)) return 0.85;
      
      // Word overlap matching (e.g., "Intel Core" vs "Intel")
      const words1 = s1.split(/[\s\-\/]+/).filter(w => w.length > 2);
      const words2 = s2.split(/[\s\-\/]+/).filter(w => w.length > 2);
      
      if (words1.length > 0 && words2.length > 0) {
        const matchedWords = words1.filter(w1 => words2.some(w2 => w2.includes(w1) || w1.includes(w2)));
        if (matchedWords.length > 0) {
          return matchedWords.length / Math.max(words1.length, words2.length);
        }
      }
      
      // Levenshtein distance based similarity
      const maxLen = Math.max(s1.length, s2.length);
      const len1 = s1.length;
      const len2 = s2.length;
      
      // Quick approximation of Levenshtein distance
      if (Math.abs(len1 - len2) > maxLen * 0.5) return 0;
      
      let matches = 0;
      for (let i = 0; i < Math.min(len1, len2); i++) {
        if (s1[i] === s2[i]) matches++;
      }
      
      return Math.min(1, matches / maxLen);
    };

    // Find best matching brand by similarity
    const findBestBrandMatch = (aiBrandName: string) => {
      if (!apiBrands.length) return undefined;
      
      let bestMatch = apiBrands[0];
      let bestScore = calculateSimilarity(aiBrandName, bestMatch.name);
      
      for (const brand of apiBrands) {
        const score = calculateSimilarity(aiBrandName, brand.name);
        if (score > bestScore) {
          bestScore = score;
          bestMatch = brand;
        }
      }
      
      // Only return match if similarity is significant (> 40%)
      return bestScore > 0.4 ? bestMatch : undefined;
    };

    // Find best matching category by similarity
    const findBestCategoryMatch = (aiCategoryName: string) => {
      if (!apiCategories.length) return undefined;
      
      let bestMatch = apiCategories[0];
      let bestScore = calculateSimilarity(aiCategoryName, bestMatch.name);
      
      for (const category of apiCategories) {
        const score = calculateSimilarity(aiCategoryName, category.name);
        if (score > bestScore) {
          bestScore = score;
          bestMatch = category;
        }
      }
      
      // Only return match if similarity is significant (> 40%)
      return bestScore > 0.4 ? bestMatch : undefined;
    };

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

    // Check shopId
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
      
      // Step 2: Analyze image with Gemini Vision to extract product details
      // Skip AI analysis when editing a product (user might just want to change image)
      if (!isEditing && aiAutoFillEnabled) {
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
            // First, check if this product already exists in database
            try {
              const dbResults = await productService.getSuggestions(analysisResult.name);
              
              if (dbResults.length > 0) {
                // Found matching product in database - use that data
                const bestDbMatch = dbResults[0]; // First result is best match
                
                // Match brand and category by NAME to current shop's data
                const matchedBrand = findBestBrandMatch(bestDbMatch.brandName || analysisResult.brand);
                const matchedCategory = findBestCategoryMatch(bestDbMatch.categoryName || analysisResult.category);

                const brandNameFromDb = bestDbMatch.brandName || analysisResult.brand;
                const categoryNameFromDb = bestDbMatch.categoryName || analysisResult.category;

                console.log('📦 Found in Database:', bestDbMatch.name);
                console.log('   Brand:', brandNameFromDb, '→', matchedBrand?.name || 'Will be created');
                console.log('   Category:', categoryNameFromDb, '→', matchedCategory?.name || 'Will be created');

                // Store pending brand/category if not found in current shop
                if (!matchedBrand && brandNameFromDb) {
                  setPendingBrandName(brandNameFromDb);
                } else {
                  setPendingBrandName(null);
                }
                
                if (!matchedCategory && categoryNameFromDb) {
                  setPendingCategoryName(categoryNameFromDb);
                } else {
                  setPendingCategoryName(null);
                }

                setFormData(prev => ({
                  ...prev,
                  name: bestDbMatch.name || analysisResult.name || prev.name,
                  description: bestDbMatch.description || analysisResult.description || prev.description,
                  price: bestDbMatch.price || analysisResult.estimatedPrice || prev.price,
                  costPrice: bestDbMatch.costPrice || analysisResult.costPrice || prev.costPrice,
                  warranty: bestDbMatch.warranty || analysisResult.warranty || prev.warranty,
                  brand: matchedBrand?.id || '',
                  category: matchedCategory?.id || '',
                }));

                // Show info about pending creation
                if (!matchedBrand && brandNameFromDb && !matchedCategory && categoryNameFromDb) {
                  setApiError(`ℹ️ Brand "${brandNameFromDb}" and Category "${categoryNameFromDb}" will be created when you save.`);
                  setTimeout(() => setApiError(null), 5000);
                } else if (!matchedBrand && brandNameFromDb) {
                  setApiError(`ℹ️ Brand "${brandNameFromDb}" will be created when you save.`);
                  setTimeout(() => setApiError(null), 5000);
                } else if (!matchedCategory && categoryNameFromDb) {
                  setApiError(`ℹ️ Category "${categoryNameFromDb}" will be created when you save.`);
                  setTimeout(() => setApiError(null), 5000);
                } else if (bestDbMatch.existsInYourShop) {
                  setApiError('⚠️ This product already exists in your shop!');
                  setTimeout(() => setApiError(null), 5000);
                } else {
                  setAiAutoFillSuccess(true);
                  setTimeout(() => setAiAutoFillSuccess(false), 3000);
                }
                
                console.log('✅ Product found in database and form auto-filled!');
              } else {
                // Not in database - use AI analysis result
                const matchedBrand = findBestBrandMatch(analysisResult.brand);
                const matchedCategory = findBestCategoryMatch(analysisResult.category);

                console.log('🔍 New Product (AI) - Brand:', matchedBrand?.name || analysisResult.brand || 'None', '| Category:', matchedCategory?.name || analysisResult.category || 'None');

                // Store pending brand/category if AI suggests but not found in current shop
                if (!matchedBrand && analysisResult.brand) {
                  setPendingBrandName(analysisResult.brand);
                } else {
                  setPendingBrandName(null);
                }
                
                if (!matchedCategory && analysisResult.category) {
                  setPendingCategoryName(analysisResult.category);
                } else {
                  setPendingCategoryName(null);
                }

                setFormData(prev => ({
                  ...prev,
                  name: analysisResult.name || prev.name,
                  description: analysisResult.description || prev.description,
                  price: analysisResult.estimatedPrice || prev.price,
                  costPrice: analysisResult.costPrice || prev.costPrice,
                  warranty: analysisResult.warranty || prev.warranty,
                  brand: matchedBrand?.id || '',
                  category: matchedCategory?.id || '',
                }));

                // Show info about pending creation
                if (!matchedBrand && analysisResult.brand && !matchedCategory && analysisResult.category) {
                  setApiError(`ℹ️ Brand "${analysisResult.brand}" and Category "${analysisResult.category}" will be created when you save.`);
                  setTimeout(() => setApiError(null), 5000);
                } else if (!matchedBrand && analysisResult.brand) {
                  setApiError(`ℹ️ Brand "${analysisResult.brand}" will be created when you save.`);
                  setTimeout(() => setApiError(null), 5000);
                } else if (!matchedCategory && analysisResult.category) {
                  setApiError(`ℹ️ Category "${analysisResult.category}" will be created when you save.`);
                  setTimeout(() => setApiError(null), 5000);
                } else {
                  setAiAutoFillSuccess(true);
                  setTimeout(() => setAiAutoFillSuccess(false), 3000);
                }
                console.log('✅ New product - AI details extracted and form auto-filled!');
              }
            } catch (dbError) {
              // Database search failed - fall back to pure AI result
              console.log('DB search failed, using AI result:', dbError);
              
              const matchedBrand = findBestBrandMatch(analysisResult.brand);
              const matchedCategory = findBestCategoryMatch(analysisResult.category);

              // Store pending brand/category if AI suggests but not found in current shop
              if (!matchedBrand && analysisResult.brand) {
                setPendingBrandName(analysisResult.brand);
              } else {
                setPendingBrandName(null);
              }
              
              if (!matchedCategory && analysisResult.category) {
                setPendingCategoryName(analysisResult.category);
              } else {
                setPendingCategoryName(null);
              }

              setFormData(prev => ({
                ...prev,
                name: analysisResult.name || prev.name,
                description: analysisResult.description || prev.description,
                price: analysisResult.estimatedPrice || prev.price,
                costPrice: analysisResult.costPrice || prev.costPrice,
                warranty: analysisResult.warranty || prev.warranty,
                brand: matchedBrand?.id || '',
                category: matchedCategory?.id || '',
              }));

              // Show info about pending creation
              if (!matchedBrand && analysisResult.brand && !matchedCategory && analysisResult.category) {
                setApiError(`ℹ️ Brand "${analysisResult.brand}" and Category "${analysisResult.category}" will be created when you save.`);
                setTimeout(() => setApiError(null), 5000);
              } else if (!matchedBrand && analysisResult.brand) {
                setApiError(`ℹ️ Brand "${analysisResult.brand}" will be created when you save.`);
                setTimeout(() => setApiError(null), 5000);
              } else if (!matchedCategory && analysisResult.category) {
                setApiError(`ℹ️ Category "${analysisResult.category}" will be created when you save.`);
                setTimeout(() => setApiError(null), 5000);
              } else {
                setAiAutoFillSuccess(true);
                setTimeout(() => setAiAutoFillSuccess(false), 3000);
              }
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
        isEditing ? id : undefined
      );
      
      if (!uploadResult.success) {
        setErrors(prev => ({ ...prev, image: uploadResult.error || 'Failed to upload image' }));
        setIsUploading(false);
        setUploadProgress(0);
        return;
      }

      setUploadProgress(100);
      setTimeout(() => {
        // Store the Supabase URL
        setFormData(prev => ({ ...prev, image: uploadResult.url || '' }));
        setIsUploading(false);
        setUploadProgress(0);
      }, 300);
    } catch {
      setErrors(prev => ({ ...prev, image: 'Failed to process image' }));
      setIsUploading(false);
      setUploadProgress(0);
    }
  }, [authContext?.user?.shop?.id, isEditing, id, aiAutoFillEnabled, apiBrands, apiCategories]);

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

  // Handle product name change with AI suggestions and database suggestions
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

    // Clear previous timeouts
    if (suggestionTimeoutRef.current) {
      clearTimeout(suggestionTimeoutRef.current);
    }
    if (dbSuggestionTimeoutRef.current) {
      clearTimeout(dbSuggestionTimeoutRef.current);
    }

    // Only search if query is at least 2 characters
    if (value.length < 2) {
      setSuggestions([]);
      setDbSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    setShowSuggestions(true);

    // Always search database for existing products (to avoid duplicates)
    dbSuggestionTimeoutRef.current = setTimeout(async () => {
      try {
        const dbResults = await productService.getSuggestions(value);
        setDbSuggestions(dbResults);
      } catch (error) {
        console.error('Database suggestion error:', error);
        setDbSuggestions([]);
      }
    }, 300); // Faster for database (local)

    // Only search AI if AI Auto-Fill is enabled
    if (aiAutoFillEnabled) {
      suggestionTimeoutRef.current = setTimeout(async () => {
        if (!geminiService.hasApiKey()) return;
        
        setIsSearchingSuggestions(true);
        
        try {
          const results = await geminiService.suggestProducts(value);
          setSuggestions(results);
        } catch (error) {
          console.error('AI Suggestion error:', error);
          setSuggestions([]);
        } finally {
          setIsSearchingSuggestions(false);
        }
      }, 600); // Longer delay for AI API
    } else {
      setSuggestions([]);
    }
  }, [errors.name, aiAutoFillEnabled]);

  // Handle suggestion selection - Updated to use similarity matching
  const handleSelectSuggestion = useCallback((suggestion: { name: string; brand: string; category: string; estimatedPrice?: number }) => {
    // Helper function to calculate string similarity (0-1)
    const calculateSimilarity = (str1: string, str2: string): number => {
      const s1 = str1.toLowerCase().trim();
      const s2 = str2.toLowerCase().trim();
      
      // Exact match
      if (s1 === s2) return 1;
      
      // Contains match
      if (s1.includes(s2) || s2.includes(s1)) return 0.85;
      
      // Word overlap matching (e.g., "Intel Core" vs "Intel")
      const words1 = s1.split(/[\s\-\/]+/).filter(w => w.length > 2);
      const words2 = s2.split(/[\s\-\/]+/).filter(w => w.length > 2);
      
      if (words1.length > 0 && words2.length > 0) {
        const matchedWords = words1.filter(w1 => words2.some(w2 => w2.includes(w1) || w1.includes(w2)));
        if (matchedWords.length > 0) {
          return matchedWords.length / Math.max(words1.length, words2.length);
        }
      }
      
      // Character-based similarity
      const maxLen = Math.max(s1.length, s2.length);
      if (Math.abs(s1.length - s2.length) > maxLen * 0.5) return 0;
      
      let matches = 0;
      for (let i = 0; i < Math.min(s1.length, s2.length); i++) {
        if (s1[i] === s2[i]) matches++;
      }
      
      return Math.min(1, matches / maxLen);
    };

    // Find best matching brand by similarity
    const findBestBrandMatch = (aiBrandName: string) => {
      if (!apiBrands.length) return undefined;
      
      let bestMatch = apiBrands[0];
      let bestScore = calculateSimilarity(aiBrandName, bestMatch.name);
      
      for (const brand of apiBrands) {
        const score = calculateSimilarity(aiBrandName, brand.name);
        if (score > bestScore) {
          bestScore = score;
          bestMatch = brand;
        }
      }
      
      // Only return match if similarity is significant (> 30%)
      return bestScore > 0.3 ? bestMatch : undefined;
    };

    // Find best matching category by similarity
    const findBestCategoryMatch = (aiCategoryName: string) => {
      if (!apiCategories.length) return undefined;
      
      // Normalize category name (remove dashes, etc.)
      const normalizedName = aiCategoryName.replace(/-/g, ' ');
      
      let bestMatch = apiCategories[0];
      let bestScore = calculateSimilarity(normalizedName, bestMatch.name);
      
      for (const category of apiCategories) {
        const score = calculateSimilarity(normalizedName, category.name);
        if (score > bestScore) {
          bestScore = score;
          bestMatch = category;
        }
      }
      
      // Only return match if similarity is significant (> 30%)
      return bestScore > 0.3 ? bestMatch : undefined;
    };

    // Find best matching brand and category
    const matchedBrand = findBestBrandMatch(suggestion.brand);
    const matchedCategory = findBestCategoryMatch(suggestion.category);
    
    // Calculate cost price as ~80% of selling price (typical markup)
    const sellingPrice = suggestion.estimatedPrice || 0;
    const costPrice = Math.round(sellingPrice * 0.80);

    console.log('🎯 AI Suggestion - Brand match:', matchedBrand?.name || 'None', '(from:', suggestion.brand, ') | Category match:', matchedCategory?.name || 'None', '(from:', suggestion.category, ')');

    setFormData(prev => ({
      ...prev,
      name: suggestion.name,
      // Use matched API ID if found, otherwise keep previous selection
      category: matchedCategory?.id || prev.category,
      brand: matchedBrand?.id || prev.brand,
      sellingPrice: sellingPrice || prev.sellingPrice,
      price: sellingPrice || prev.price,
      costPrice: costPrice || prev.costPrice,
    }));

    setSuggestions([]);
    setShowSuggestions(false);
    setAiAutoFillSuccess(true);
    setTimeout(() => setAiAutoFillSuccess(false), 3000);
  }, [apiBrands, apiCategories]);

  // Handle database suggestion selection - uses existing product data
  const handleSelectDbSuggestion = useCallback((suggestion: ProductSuggestion) => {
    // Helper function to calculate string similarity (0-1)
    const calculateSimilarity = (str1: string, str2: string): number => {
      const s1 = str1.toLowerCase().trim();
      const s2 = str2.toLowerCase().trim();
      
      if (s1 === s2) return 1;
      if (s1.includes(s2) || s2.includes(s1)) return 0.85;
      
      const words1 = s1.split(/[\s\-\/]+/).filter(w => w.length > 2);
      const words2 = s2.split(/[\s\-\/]+/).filter(w => w.length > 2);
      
      if (words1.length > 0 && words2.length > 0) {
        const matchedWords = words1.filter(w1 => words2.some(w2 => w2.includes(w1) || w1.includes(w2)));
        if (matchedWords.length > 0) {
          return matchedWords.length / Math.max(words1.length, words2.length);
        }
      }
      
      const maxLen = Math.max(s1.length, s2.length);
      if (Math.abs(s1.length - s2.length) > maxLen * 0.5) return 0;
      
      let matches = 0;
      for (let i = 0; i < Math.min(s1.length, s2.length); i++) {
        if (s1[i] === s2[i]) matches++;
      }
      
      return Math.min(1, matches / maxLen);
    };

    // Find best matching brand in current shop by name
    const findBestBrandMatch = (brandName: string) => {
      if (!brandName || !apiBrands.length) return undefined;
      
      let bestMatch = apiBrands[0];
      let bestScore = calculateSimilarity(brandName, bestMatch.name);
      
      for (const brand of apiBrands) {
        const score = calculateSimilarity(brandName, brand.name);
        if (score > bestScore) {
          bestScore = score;
          bestMatch = brand;
        }
      }
      
      return bestScore > 0.3 ? bestMatch : undefined;
    };

    // Find best matching category in current shop by name
    const findBestCategoryMatch = (categoryName: string) => {
      if (!categoryName || !apiCategories.length) return undefined;
      
      let bestMatch = apiCategories[0];
      let bestScore = calculateSimilarity(categoryName, bestMatch.name);
      
      for (const category of apiCategories) {
        const score = calculateSimilarity(categoryName, category.name);
        if (score > bestScore) {
          bestScore = score;
          bestMatch = category;
        }
      }
      
      return bestScore > 0.3 ? bestMatch : undefined;
    };

    // Match brand and category by NAME to find current shop's equivalent
    const matchedBrand = findBestBrandMatch(suggestion.brandName || '');
    const matchedCategory = findBestCategoryMatch(suggestion.categoryName || '');
    
    // Calculate cost price if not provided
    const costPrice = suggestion.costPrice || Math.round((suggestion.price || 0) * 0.80);

    console.log('📦 DB Suggestion - Using product:', suggestion.name);
    console.log('   Brand:', suggestion.brandName, '→', matchedBrand?.name || 'Will be created');
    console.log('   Category:', suggestion.categoryName, '→', matchedCategory?.name || 'Will be created');

    // Store pending brand/category names if not found in current shop
    // Also store full data for creating with all details
    if (!matchedBrand && suggestion.brandName) {
      setPendingBrandName(suggestion.brandName);
      setPendingBrandData(suggestion.brand || { name: suggestion.brandName });
    } else {
      setPendingBrandName(null);
      setPendingBrandData(null);
    }
    
    if (!matchedCategory && suggestion.categoryName) {
      setPendingCategoryName(suggestion.categoryName);
      setPendingCategoryData(suggestion.category || { name: suggestion.categoryName });
    } else {
      setPendingCategoryName(null);
      setPendingCategoryData(null);
    }

    setFormData(prev => ({
      ...prev,
      name: suggestion.name,
      description: suggestion.description || prev.description,
      // Use matched IDs from current shop (not other shop's IDs)
      category: matchedCategory?.id || '',
      brand: matchedBrand?.id || '',
      sellingPrice: suggestion.price || prev.sellingPrice,
      price: suggestion.price || prev.price,
      costPrice: costPrice || prev.costPrice,
      image: suggestion.image || prev.image,
      warranty: suggestion.warranty || prev.warranty,
    }));

    setDbSuggestions([]);
    setSuggestions([]);
    setShowSuggestions(false);
    
    // Show info about pending brand/category creation
    if (!matchedBrand && suggestion.brandName && !matchedCategory && suggestion.categoryName) {
      setApiError(`ℹ️ Brand "${suggestion.brandName}" and Category "${suggestion.categoryName}" will be created when you save.`);
      setTimeout(() => setApiError(null), 5000);
    } else if (!matchedBrand && suggestion.brandName) {
      setApiError(`ℹ️ Brand "${suggestion.brandName}" will be created when you save.`);
      setTimeout(() => setApiError(null), 5000);
    } else if (!matchedCategory && suggestion.categoryName) {
      setApiError(`ℹ️ Category "${suggestion.categoryName}" will be created when you save.`);
      setTimeout(() => setApiError(null), 5000);
    } else if (suggestion.existsInYourShop) {
      // Show warning if product already exists in shop
      setApiError('⚠️ This product already exists in your shop. Consider updating the existing product instead.');
      setTimeout(() => setApiError(null), 5000);
    } else {
      setAiAutoFillSuccess(true);
      setTimeout(() => setAiAutoFillSuccess(false), 3000);
    }
  }, [apiBrands, apiCategories]);

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
    // Allow pending category name to satisfy validation
    if (!formData.category && !pendingCategoryName) {
      newErrors.category = 'Category is required';
    }
    // Allow pending brand name to satisfy validation
    if (!formData.brand && !pendingBrandName) {
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsSaving(true);
    setApiError(null);

    try {
      // Find the category and brand IDs (if using API data)
      let categoryId: string | undefined;
      let brandId: string | undefined;

      // Check if we're using API categories/brands (UUIDs) or fallback (names)
      const categoryFromApi = apiCategories.find(c => c.id === formData.category || c.name === formData.category);
      const brandFromApi = apiBrands.find(b => b.id === formData.brand || b.name === formData.brand);

      categoryId = categoryFromApi?.id;
      brandId = brandFromApi?.id;

      // If category not found and we have a pending category name from DB suggestion, create it
      // Use full category data if available (from other shop's product suggestion)
      if (!categoryId && (formData.category || pendingCategoryName)) {
        const categoryNameToCreate = pendingCategoryName || formData.category;
        if (categoryNameToCreate) {
          try {
            console.log('🆕 Creating category:', categoryNameToCreate);
            // Use full category data from suggestion if available
            const categoryCreateData = pendingCategoryData || { name: categoryNameToCreate };
            console.log('   With data:', categoryCreateData);
            const newCategory = await categoryService.create(categoryCreateData, currentShopId || undefined);
            categoryId = newCategory.id;
            setApiCategories(prev => [...prev, newCategory]);
            setPendingCategoryName(null);
            setPendingCategoryData(null);
          } catch (err) {
            console.log('Category may already exist, continuing...');
          }
        }
      }

      // If brand not found and we have a pending brand name from DB suggestion, create it
      // Use full brand data if available (from other shop's product suggestion)
      if (!brandId && (formData.brand || pendingBrandName)) {
        const brandNameToCreate = pendingBrandName || formData.brand;
        if (brandNameToCreate) {
          try {
            console.log('🆕 Creating brand:', brandNameToCreate);
            // Use full brand data from suggestion if available
            const brandCreateData = pendingBrandData || { name: brandNameToCreate };
            console.log('   With data:', brandCreateData);
            const newBrand = await brandService.create(brandCreateData, currentShopId || undefined);
            brandId = newBrand.id;
            setApiBrands(prev => [...prev, newBrand]);
            setPendingBrandName(null);
            setPendingBrandData(null);
          } catch (err) {
            console.log('Brand may already exist, continuing...');
          }
        }
      }

      // Parse warranty months from warranty string
      let warrantyMonths: number | undefined;
      if (formData.warranty) {
        const match = formData.warranty.match(/(\d+)/);
        if (match) {
          const num = parseInt(match[1]);
          if (formData.warranty.toLowerCase().includes('year')) {
            warrantyMonths = num * 12;
          } else if (formData.warranty.toLowerCase().includes('month')) {
            warrantyMonths = num;
          }
        }
      }

      const productData: CreateProductDTO = {
        name: formData.name.trim(),
        price: formData.sellingPrice || formData.price,
        description: formData.description.trim() || undefined,
        costPrice: formData.costPrice || undefined,
        stock: formData.stock,
        lowStockThreshold: formData.lowStockThreshold,
        serialNumber: formData.serialNumber.trim() || undefined,
        barcode: formData.barcode.trim() || undefined,
        warranty: formData.warranty || undefined,
        warrantyMonths,
        image: formData.image || undefined,
        categoryId,
        brandId,
      };

      let savedProductId: string;
      let savedProductName: string = formData.name.trim();

      if (isEditing && existingProduct) {
        // Update existing product
        const updated = await productService.update(existingProduct.id, productData, currentShopId || undefined);
        savedProductId = updated.id;
      } else {
        // Create new product
        const created = await productService.create(productData, currentShopId || undefined);
        savedProductId = created.id;
      }

      // Force refresh the product cache for other pages (CreateInvoice, etc.)
      loadProducts(true);

      // Navigate back to products list with the saved product ID for highlighting
      navigate('/products', { 
        state: { 
          highlightProductId: savedProductId,
          highlightProductName: savedProductName
        } 
      });
    } catch (error) {
      console.error('Failed to save product:', error);
      setApiError(error instanceof Error ? error.message : 'Failed to save product');
    } finally {
      setIsSaving(false);
    }
  };

  const handleChange = (field: keyof ProductFormData, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
    
    // Clear pending names and data when user manually selects a brand/category
    if (field === 'brand' && value) {
      setPendingBrandName(null);
      setPendingBrandData(null);
    }
    if (field === 'category' && value) {
      setPendingCategoryName(null);
      setPendingCategoryData(null);
    }
  };

  const handleGenerateSerialNumber = () => {
    setFormData(prev => ({ ...prev, serialNumber: generateSerialNumber() }));
  };

  return (
    <div className="space-y-6">
      {/* API Error Alert */}
      {apiError && (
        <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-red-500 font-medium">Error</p>
            <p className={`text-sm ${theme === 'dark' ? 'text-red-400' : 'text-red-600'}`}>{apiError}</p>
          </div>
        </div>
      )}

      {/* Page Title Header - Similar to ServiceForm */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 px-0">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/products')}
            disabled={isSaving}
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
        {/* Loading Skeleton - Show while editing and product is loading */}
        {isEditing && isLoadingProduct && (
          <div className="space-y-6">
            {/* Header Skeleton */}
            <div className="space-y-3">
              <div className={`h-8 rounded-xl ${theme === 'dark' ? 'bg-slate-700/50' : 'bg-slate-200'} w-1/3 animate-pulse`} />
              <div className={`h-4 rounded-lg ${theme === 'dark' ? 'bg-slate-700/30' : 'bg-slate-100'} w-1/2 animate-pulse`} />
            </div>

            {/* Image Section Skeleton */}
            <div className="space-y-3">
              <div className={`h-5 rounded-lg ${theme === 'dark' ? 'bg-slate-700/50' : 'bg-slate-200'} w-1/4 animate-pulse`} />
              <div className={`h-48 rounded-2xl ${theme === 'dark' ? 'bg-slate-700/30' : 'bg-slate-100'} animate-pulse`} />
            </div>

            {/* Name Field Skeleton */}
            <div className="space-y-2">
              <div className={`h-4 rounded-lg ${theme === 'dark' ? 'bg-slate-700/50' : 'bg-slate-200'} w-1/6 animate-pulse`} />
              <div className={`h-10 rounded-xl ${theme === 'dark' ? 'bg-slate-700/30' : 'bg-slate-100'} animate-pulse`} />
            </div>

            {/* Two Column Fields Skeleton */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className={`h-4 rounded-lg ${theme === 'dark' ? 'bg-slate-700/50' : 'bg-slate-200'} w-1/3 animate-pulse`} />
                <div className={`h-10 rounded-xl ${theme === 'dark' ? 'bg-slate-700/30' : 'bg-slate-100'} animate-pulse`} />
              </div>
              <div className="space-y-2">
                <div className={`h-4 rounded-lg ${theme === 'dark' ? 'bg-slate-700/50' : 'bg-slate-200'} w-1/4 animate-pulse`} />
                <div className={`h-10 rounded-xl ${theme === 'dark' ? 'bg-slate-700/30' : 'bg-slate-100'} animate-pulse`} />
              </div>
            </div>

            {/* Two Column Fields Skeleton */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className={`h-4 rounded-lg ${theme === 'dark' ? 'bg-slate-700/50' : 'bg-slate-200'} w-1/3 animate-pulse`} />
                <div className={`h-10 rounded-xl ${theme === 'dark' ? 'bg-slate-700/30' : 'bg-slate-100'} animate-pulse`} />
              </div>
              <div className="space-y-2">
                <div className={`h-4 rounded-lg ${theme === 'dark' ? 'bg-slate-700/50' : 'bg-slate-200'} w-1/4 animate-pulse`} />
                <div className={`h-10 rounded-xl ${theme === 'dark' ? 'bg-slate-700/30' : 'bg-slate-100'} animate-pulse`} />
              </div>
            </div>

            {/* Price Info Skeleton */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className={`h-4 rounded-lg ${theme === 'dark' ? 'bg-slate-700/50' : 'bg-slate-200'} w-1/3 animate-pulse`} />
                <div className={`h-10 rounded-xl ${theme === 'dark' ? 'bg-slate-700/30' : 'bg-slate-100'} animate-pulse`} />
              </div>
              <div className="space-y-2">
                <div className={`h-4 rounded-lg ${theme === 'dark' ? 'bg-slate-700/50' : 'bg-slate-200'} w-1/3 animate-pulse`} />
                <div className={`h-10 rounded-xl ${theme === 'dark' ? 'bg-slate-700/30' : 'bg-slate-100'} animate-pulse`} />
              </div>
            </div>

            {/* Margin Info Skeleton */}
            <div className={`p-3 rounded-xl border ${
              theme === 'dark' 
                ? 'border-slate-700/50 bg-slate-700/20' 
                : 'border-slate-200 bg-slate-100'
            }`}>
              <div className="flex items-center justify-between">
                <div className={`h-4 rounded-lg ${theme === 'dark' ? 'bg-slate-700/50' : 'bg-slate-200'} w-1/4 animate-pulse`} />
                <div className="flex items-center gap-4">
                  <div className={`h-5 rounded-lg ${theme === 'dark' ? 'bg-slate-700/50' : 'bg-slate-200'} w-24 animate-pulse`} />
                  <div className={`h-6 rounded-lg ${theme === 'dark' ? 'bg-slate-700/50' : 'bg-slate-200'} w-16 animate-pulse`} />
                </div>
              </div>
            </div>

            {/* Stock Fields Skeleton */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className={`h-4 rounded-lg ${theme === 'dark' ? 'bg-slate-700/50' : 'bg-slate-200'} w-1/3 animate-pulse`} />
                <div className={`h-10 rounded-xl ${theme === 'dark' ? 'bg-slate-700/30' : 'bg-slate-100'} animate-pulse`} />
              </div>
              <div className="space-y-2">
                <div className={`h-4 rounded-lg ${theme === 'dark' ? 'bg-slate-700/50' : 'bg-slate-200'} w-1/2 animate-pulse`} />
                <div className={`h-10 rounded-xl ${theme === 'dark' ? 'bg-slate-700/30' : 'bg-slate-100'} animate-pulse`} />
              </div>
            </div>

            {/* Description Skeleton */}
            <div className="space-y-2">
              <div className={`h-4 rounded-lg ${theme === 'dark' ? 'bg-slate-700/50' : 'bg-slate-200'} w-1/6 animate-pulse`} />
              <div className="space-y-2">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className={`h-4 rounded-lg ${theme === 'dark' ? 'bg-slate-700/30' : 'bg-slate-100'} ${i === 3 ? 'w-1/2' : 'w-full'} animate-pulse`} />
                ))}
              </div>
            </div>

            {/* Buttons Skeleton */}
            <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-slate-700/50">
              <div className={`flex-1 h-10 rounded-xl ${theme === 'dark' ? 'bg-slate-700/30' : 'bg-slate-100'} animate-pulse`} />
              <div className={`flex-1 h-10 rounded-xl ${theme === 'dark' ? 'bg-slate-700/30' : 'bg-slate-100'} animate-pulse`} />
            </div>
          </div>
        )}

        {/* Actual Form - Hidden while loading */}
        {!(isEditing && isLoadingProduct) && (
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
              Product Image {!isEditing && aiAutoFillEnabled && <span className={`text-xs ml-1 ${theme === 'dark' ? 'text-emerald-400' : 'text-emerald-600'}`}>(AI will auto-fill details)</span>}
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
                  Click the X to remove and upload a new image
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
                    {isAnalyzingImage ? (
                      /* Creative AI Analysis Loader */
                      <div className="space-y-4 py-2">
                        {/* Animated AI Brain Icon */}
                        <div className="relative w-16 h-16 mx-auto">
                          {/* Outer spinning ring */}
                          <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-emerald-500 border-r-blue-500 animate-spin" />
                          {/* Inner pulsing circle */}
                          <div className={`absolute inset-2 rounded-full flex items-center justify-center ${
                            theme === 'dark' ? 'bg-gradient-to-br from-emerald-500/20 to-blue-500/20' : 'bg-gradient-to-br from-emerald-50 to-blue-50'
                          }`}>
                            <Brain className="w-6 h-6 text-emerald-500 animate-pulse" />
                          </div>
                          {/* Sparkle effects */}
                          <Sparkles className="absolute -top-1 -right-1 w-4 h-4 text-amber-400 animate-ping" />
                          <Sparkles className="absolute -bottom-1 -left-1 w-3 h-3 text-blue-400 animate-ping" style={{ animationDelay: '0.5s' }} />
                        </div>
                        
                        {/* Analysis text with typing effect */}
                        <div className="text-center space-y-2">
                          <p className={`text-sm font-semibold bg-gradient-to-r from-emerald-500 to-blue-500 bg-clip-text text-transparent`}>
                            AI Analyzing Product Image...
                          </p>
                          <div className="flex items-center justify-center gap-1">
                            <span className={`inline-block w-2 h-2 rounded-full bg-emerald-500 animate-bounce`} style={{ animationDelay: '0ms' }} />
                            <span className={`inline-block w-2 h-2 rounded-full bg-teal-500 animate-bounce`} style={{ animationDelay: '150ms' }} />
                            <span className={`inline-block w-2 h-2 rounded-full bg-blue-500 animate-bounce`} style={{ animationDelay: '300ms' }} />
                          </div>
                          <p className={`text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                            Extracting name, brand, category & LKR prices
                          </p>
                        </div>
                        
                        {/* Progress steps */}
                        <div className={`flex items-center justify-center gap-3 text-xs ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>
                          <span className="flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3 text-emerald-500" /> Uploaded
                          </span>
                          <span className="flex items-center gap-1">
                            <Loader2 className="w-3 h-3 animate-spin text-blue-500" /> Analyzing
                          </span>
                          <span className="flex items-center gap-1 opacity-50">
                            <Wand2 className="w-3 h-3" /> Auto-fill
                          </span>
                        </div>
                      </div>
                    ) : (
                      /* Standard upload progress */
                      <>
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
                      </>
                    )}
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
                    {geminiService.hasApiKey() && aiAutoFillEnabled && !isEditing && (
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
            
            {/* AI Auto-fill Success Notification */}
            {aiAutoFillSuccess && (
              <div className={`flex items-center gap-3 p-3 rounded-xl border animate-pulse ${
                theme === 'dark' 
                  ? 'bg-gradient-to-r from-emerald-500/10 to-blue-500/10 border-emerald-500/30' 
                  : 'bg-gradient-to-r from-emerald-50 to-blue-50 border-emerald-200'
              }`}>
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-emerald-500/20">
                  <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                </div>
                <div className="flex-1">
                  <p className={`text-sm font-semibold ${theme === 'dark' ? 'text-emerald-400' : 'text-emerald-600'}`}>
                    ✨ AI Auto-fill Complete!
                  </p>
                  <p className={`text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                    All product details have been extracted from image
                  </p>
                </div>
                <Sparkles className="w-5 h-5 text-amber-400" />
              </div>
            )}
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
            
            {/* Suggestions Dropdown - Database + AI */}
            {showSuggestions && (dbSuggestions.length > 0 || suggestions.length > 0 || isSearchingSuggestions) && (
              <div className={`absolute z-50 w-full mt-1 rounded-xl border shadow-xl overflow-hidden ${
                theme === 'dark' 
                  ? 'bg-slate-800 border-slate-700' 
                  : 'bg-white border-slate-200'
              }`}>
                {/* Database Suggestions Section */}
                {dbSuggestions.length > 0 && (
                  <>
                    <div className={`px-3 py-2 text-xs font-medium flex items-center gap-2 ${
                      theme === 'dark' ? 'bg-blue-500/10 text-blue-400 border-b border-slate-700' : 'bg-blue-50 text-blue-600 border-b border-slate-200'
                    }`}>
                      <Boxes className="w-3 h-3" />
                      Existing Products in Database
                    </div>
                    <div className="max-h-40 overflow-y-auto">
                      {dbSuggestions.map((suggestion, index) => (
                        <button
                          key={`db-${index}`}
                          type="button"
                          onClick={() => handleSelectDbSuggestion(suggestion)}
                          className={`w-full px-3 py-2.5 text-left transition-colors ${
                            theme === 'dark' 
                              ? 'hover:bg-slate-700/50' 
                              : 'hover:bg-slate-50'
                          } ${suggestion.existsInYourShop ? 'opacity-60' : ''}`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <p className={`text-sm font-medium truncate ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                                  {suggestion.name}
                                </p>
                                {suggestion.existsInYourShop && (
                                  <span className="px-1.5 py-0.5 rounded text-[10px] bg-amber-500/20 text-amber-500 font-medium">
                                    Already in your shop
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-2 mt-0.5">
                                {suggestion.brandName && (
                                  <span className={`text-xs ${theme === 'dark' ? 'text-emerald-400' : 'text-emerald-600'}`}>
                                    {suggestion.brandName}
                                  </span>
                                )}
                                {suggestion.categoryName && (
                                  <>
                                    <span className={`text-xs ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>•</span>
                                    <span className={`text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                                      {suggestion.categoryName}
                                    </span>
                                  </>
                                )}
                              </div>
                            </div>
                            {suggestion.price > 0 && (
                              <span className={`text-xs font-medium ml-2 ${theme === 'dark' ? 'text-blue-400' : 'text-blue-600'}`}>
                                Rs. {suggestion.price.toLocaleString()}
                              </span>
                            )}
                          </div>
                        </button>
                      ))}
                    </div>
                  </>
                )}

                {/* AI Suggestions Section */}
                {(suggestions.length > 0 || isSearchingSuggestions) && aiAutoFillEnabled && (
                  <>
                    <div className={`px-3 py-2 text-xs font-medium flex items-center gap-2 ${
                      theme === 'dark' ? 'bg-emerald-500/10 text-emerald-400 border-b border-slate-700' : 'bg-emerald-50 text-emerald-600 border-b border-slate-200'
                    } ${dbSuggestions.length > 0 ? 'border-t' : ''}`}>
                      <Globe className="w-3 h-3" />
                      AI-Powered Global Suggestions
                      {isSearchingSuggestions && <Loader2 className="w-3 h-3 animate-spin ml-auto" />}
                    </div>
                    {isSearchingSuggestions && suggestions.length === 0 ? (
                      <div className="p-4 text-center">
                        <Loader2 className="w-5 h-5 mx-auto text-emerald-500 animate-spin mb-2" />
                        <p className={`text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                          Searching global products with AI...
                        </p>
                      </div>
                    ) : (
                      <div className="max-h-40 overflow-y-auto">
                        {suggestions.map((suggestion, index) => (
                          <button
                            key={`ai-${index}`}
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
                                  <span className={`text-xs ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>•</span>
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
                  </>
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
                options={dynamicCategoryOptions}
                value={formData.category}
                onValueChange={(value) => handleChange('category', value)}
                placeholder="Select category..."
                searchPlaceholder="Search categories..."
                emptyMessage="No categories found"
                theme={theme}
              />
              {pendingCategoryName && !formData.category && (
                <p className="text-xs text-blue-500 flex items-center gap-1">
                  <span className="inline-block w-2 h-2 bg-blue-500 rounded-full animate-pulse"></span>
                  Will create: "{pendingCategoryName}"
                </p>
              )}
              {errors.category && <p className="text-xs text-red-500">{errors.category}</p>}
            </div>

            {/* Brand */}
            <div className="space-y-2">
              <Label className={`flex items-center gap-2 text-sm ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                <Building2 className="w-4 h-4" />
                Brand <span className="text-red-500">*</span>
              </Label>
              <SearchableSelect
                options={dynamicBrandOptions}
                value={formData.brand}
                onValueChange={(value) => handleChange('brand', value)}
                placeholder="Select brand..."
                searchPlaceholder="Search brands..."
                emptyMessage="No brands found"
                theme={theme}
              />
              {pendingBrandName && !formData.brand && (
                <p className="text-xs text-blue-500 flex items-center gap-1">
                  <span className="inline-block w-2 h-2 bg-blue-500 rounded-full animate-pulse"></span>
                  Will create: "{pendingBrandName}"
                </p>
              )}
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
              disabled={isSaving || isLoadingData}
              className={`flex-1 px-4 py-2.5 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-700 hover:to-emerald-600 text-white rounded-xl font-medium transition-all flex items-center justify-center gap-2 order-1 sm:order-1 ${
                (isSaving || isLoadingData) ? 'opacity-70 cursor-not-allowed' : ''
              }`}
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  {isEditing ? 'Update Product' : 'Add Product'}
                </>
              )}
            </button>
            <button
              type="button"
              onClick={() => navigate('/products')}
              disabled={isSaving}
              className={`flex-1 px-4 py-2.5 rounded-xl font-medium transition-colors border order-2 sm:order-2 ${
                theme === 'dark'
                  ? 'bg-slate-700/50 hover:bg-slate-700 text-white border-slate-600/50'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-900 border-slate-300'
              } ${isSaving ? 'opacity-70 cursor-not-allowed' : ''}`}
            >
              Cancel
            </button>
          </div>
        </form>
        )}
      </div>
    </div>
  );
};

export default ProductForm;
