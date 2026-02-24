import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTheme } from '../contexts/ThemeContext';
import { useDataCache } from '../contexts/DataCacheContext';
import { useAuth } from '../contexts/AuthContext';
import { mockProducts, productCategories, productBrands } from '../data/mockData';
import type { Product } from '../data/mockData';
import { productService, type APIProduct, type SalesHistoryItem, type SalesStats, type StockMovement, type PriceHistoryRecord } from '../services/productService';
import { categoryService, type APICategory } from '../services/categoryService';
import { brandService, type APIBrand } from '../services/brandService';
import { DeleteConfirmationModal } from '../components/modals/DeleteConfirmationModal';
import { SearchableSelect } from '../components/ui/searchable-select';
import { 
  Package, Search, Plus, Edit, Trash2,
  Cpu, Monitor, HardDrive, MemoryStick, Keyboard,
  Calendar, DollarSign, X, Filter, ChevronLeft, ChevronRight,
  LayoutGrid, List, ChevronsLeft, ChevronsRight, History, Clock,
  User, Receipt, Percent, TrendingUp, AlertTriangle, SortAsc, SortDesc,
  Barcode, ArrowUpCircle, ArrowDownCircle, ShoppingCart, Eye,
  BadgeDollarSign, PieChart, Loader2, AlertCircle, CheckCircle2
} from 'lucide-react';

// Helper to convert API Product to frontend Product format
const convertAPIProductToFrontend = (apiProduct: APIProduct): Product => ({
  id: apiProduct.id,
  name: apiProduct.name,
  serialNumber: apiProduct.serialNumber || '',
  barcode: apiProduct.barcode || '',
  category: apiProduct.category?.name || 'Uncategorized',
  brand: apiProduct.brand?.name || 'Unknown',
  price: apiProduct.price,
  costPrice: apiProduct.costPrice || 0,
  stock: apiProduct.stock,
  lowStockThreshold: apiProduct.lowStockThreshold || 10,
  warranty: apiProduct.warranty || '',
  description: apiProduct.description || '',
  image: apiProduct.image || '',
  createdAt: apiProduct.createdAt,
  status: apiProduct.stock > 0 ? 'In Stock' : 'Out of Stock',
});

export const Products: React.FC = () => {
  const { theme } = useTheme();
  const { products: cachedProducts, setProducts: setCachedProducts } = useDataCache();
  const { isViewingShop, viewingShop } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  
  // Get effective shopId for SUPER_ADMIN viewing a shop
  const effectiveShopId = isViewingShop && viewingShop ? viewingShop.id : undefined;
  
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedBrand, setSelectedBrand] = useState('all');
  
  // Price filter states
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  
  // Date filter states
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  
  // Low stock filter state
  const [showLowStockOnly, setShowLowStockOnly] = useState(false);
  
  // Filter visibility state
  const [showFilters, setShowFilters] = useState(false);
  
  // Sort state
  const [sortBy, setSortBy] = useState<'date-desc' | 'date-asc'>('date-desc');
  
  // View mode state (table or card)
  const [viewMode, setViewMode] = useState<'table' | 'card'>('card');
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(12);
  
  // Calendar states
  const [showStartCalendar, setShowStartCalendar] = useState(false);
  const [showEndCalendar, setShowEndCalendar] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState(new Date());
  const startCalendarRef = useRef<HTMLDivElement>(null);
  const endCalendarRef = useRef<HTMLDivElement>(null);
  
  // Modal states
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  
  // Stock & Pricing Details Modal states
  const [isPricingModalOpen, setIsPricingModalOpen] = useState(false);
  const [selectedProductForPricing, setSelectedProductForPricing] = useState<Product | null>(null);
  const [pricingActiveTab, setPricingActiveTab] = useState<'overview' | 'stock-movements' | 'price-history'>('overview');
  const [stockMovements, setStockMovements] = useState<StockMovement[]>([]);
  const [priceHistory, setPriceHistory] = useState<PriceHistoryRecord[]>([]);
  const [isLoadingPricingData, setIsLoadingPricingData] = useState(false);
  
  // Sales History Modal states
  const [isSalesHistoryOpen, setIsSalesHistoryOpen] = useState(false);
  const [selectedProductForHistory, setSelectedProductForHistory] = useState<Product | null>(null);
  const [productSalesHistory, setProductSalesHistory] = useState<SalesHistoryItem[]>([]);
  const [salesStats, setSalesStats] = useState<SalesStats | null>(null);
  const [isLoadingSalesHistory, setIsLoadingSalesHistory] = useState(false);
  const [salesHistoryStartDate, setSalesHistoryStartDate] = useState('');
  const [salesHistoryEndDate, setSalesHistoryEndDate] = useState('');
  const [salesHistorySearchQuery, setSalesHistorySearchQuery] = useState('');
  const [showSalesHistoryStartCalendar, setShowSalesHistoryStartCalendar] = useState(false);
  const [showSalesHistoryEndCalendar, setShowSalesHistoryEndCalendar] = useState(false);
  const [salesHistoryCalendarMonth, setSalesHistoryCalendarMonth] = useState(new Date());
  const salesHistoryStartCalendarRef = useRef<HTMLDivElement>(null);
  const salesHistoryEndCalendarRef = useRef<HTMLDivElement>(null);
  
  // Local products state - loads from API
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [apiError, setApiError] = useState<string | null>(null);
  
  // Highlighted product (newly created/updated)
  const [highlightedProductId, setHighlightedProductId] = useState<string | null>(null);
  
  // API Categories and Brands for dynamic filters (used for future dynamic filtering)
  const [_apiCategories, setApiCategories] = useState<APICategory[]>([]);
  const [_apiBrands, setApiBrands] = useState<APIBrand[]>([]);

  // Load products from API (only on mount or shop change - NOT on navigation state changes)
  useEffect(() => {
    const loadProducts = async () => {
      setIsLoading(true);
      setApiError(null);
      
      try {
        const [productsResult, categoriesResult, brandsResult] = await Promise.all([
          productService.getAll({ shopId: effectiveShopId }),
          categoryService.getAll({ shopId: effectiveShopId }).catch(() => ({ categories: [], pagination: { page: 1, limit: 10, total: 0, totalPages: 0 } })),
          brandService.getAll({ shopId: effectiveShopId }).catch(() => ({ brands: [], pagination: { page: 1, limit: 10, total: 0, totalPages: 0 } })),
        ]);
        
        // Convert API products to frontend format
        const frontendProducts = productsResult.products.map(convertAPIProductToFrontend);
        setProducts(frontendProducts);
        setCachedProducts(frontendProducts); // Sync with cache for other pages
        setApiCategories(categoriesResult.categories);
        setApiBrands(brandsResult.brands);
      } catch (error) {
        console.error('Failed to load products:', error);
        setApiError(error instanceof Error ? error.message : 'Failed to load products');
        // Fallback to mock data
        setProducts(mockProducts);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadProducts();
  }, [effectiveShopId, setCachedProducts]);

  // Handle navigation state from ProductForm (create/edit) - update locally without full reload
  useEffect(() => {
    const state = location.state as { 
      highlightProductId?: string; 
      highlightProductName?: string;
      savedProduct?: APIProduct;
      isEdit?: boolean;
    } | null;
    
    if (!state?.highlightProductId) return;
    
    // If we have the full saved product data, update locally instead of reloading
    if (state.savedProduct) {
      const frontendProduct = convertAPIProductToFrontend(state.savedProduct);
      
      if (state.isEdit) {
        // Edit: replace the existing product in the list
        const updater = (prev: Product[]) => prev.map(p => 
          p.id === frontendProduct.id ? frontendProduct : p
        );
        setProducts(updater);
        setCachedProducts(updater);
      } else {
        // Create: add to the beginning of the list
        const updater = (prev: Product[]) => [frontendProduct, ...prev];
        setProducts(updater);
        setCachedProducts(updater);
      }
    }
    
    // Highlight the saved product
    setHighlightedProductId(state.highlightProductId);
    setTimeout(() => setHighlightedProductId(null), 5000);
    // Clear the location state so it doesn't re-trigger
    window.history.replaceState({}, document.title);
  }, [location.state, setCachedProducts]);

  // Sync local products state with cached products when cache changes
  // This ensures stock updates from invoice create/edit reflect here in real-time
  useEffect(() => {
    if (cachedProducts.length > 0 && !isLoading) {
      // Merge cached stock values into local products
      setProducts(prevProducts => {
        // If we don't have local products yet, use cached
        if (prevProducts.length === 0) return cachedProducts;
        
        // Update only the stock values from cache (to preserve any local edits in progress)
        return prevProducts.map(localProduct => {
          const cachedProduct = cachedProducts.find(cp => cp.id === localProduct.id);
          if (cachedProduct && cachedProduct.stock !== localProduct.stock) {
            console.log(`🔄 Synced ${localProduct.name} stock from cache: ${localProduct.stock} → ${cachedProduct.stock}`);
            return { ...localProduct, stock: cachedProduct.stock };
          }
          return localProduct;
        });
      });
    }
  }, [cachedProducts, isLoading]);

  // Close calendar when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (startCalendarRef.current && !startCalendarRef.current.contains(event.target as Node)) {
        setShowStartCalendar(false);
      }
      if (endCalendarRef.current && !endCalendarRef.current.contains(event.target as Node)) {
        setShowEndCalendar(false);
      }
      if (salesHistoryStartCalendarRef.current && !salesHistoryStartCalendarRef.current.contains(event.target as Node)) {
        setShowSalesHistoryStartCalendar(false);
      }
      if (salesHistoryEndCalendarRef.current && !salesHistoryEndCalendarRef.current.contains(event.target as Node)) {
        setShowSalesHistoryEndCalendar(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredProducts = products.filter(product => {
    // Search filter - includes name, serial number, and barcode
    const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         product.serialNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         (product.barcode && product.barcode.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesCategory = selectedCategory === 'all' || product.category === selectedCategory;
    const matchesBrand = selectedBrand === 'all' || product.brand === selectedBrand;
    
    // Price filter
    const minPriceNum = minPrice ? parseFloat(minPrice) : 0;
    const maxPriceNum = maxPrice ? parseFloat(maxPrice) : Infinity;
    const matchesPrice = product.price >= minPriceNum && product.price <= maxPriceNum;
    
    // Date filter
    let matchesDate = true;
    if (startDate || endDate) {
      const productDate = new Date(product.createdAt);
      if (startDate) {
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        if (productDate < start) matchesDate = false;
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        if (productDate > end) matchesDate = false;
      }
    }
    
    // Low stock filter
    const threshold = product.lowStockThreshold || 10;
    const matchesLowStock = !showLowStockOnly || product.stock <= threshold;
    
    return matchesSearch && matchesCategory && matchesBrand && matchesPrice && matchesDate && matchesLowStock;
  }).sort((a, b) => {
    const dateA = new Date(a.createdAt).getTime();
    const dateB = new Date(b.createdAt).getTime();
    return sortBy === 'date-desc' ? dateB - dateA : dateA - dateB;
  });

  // Pagination calculations
  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedProducts = filteredProducts.slice(startIndex, endIndex);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedCategory, selectedBrand, minPrice, maxPrice, startDate, endDate, sortBy]);

  // Reset items per page when view mode changes
  useEffect(() => {
    if (viewMode === 'table') {
      setItemsPerPage(10);
    } else {
      setItemsPerPage(12);
    }
    setCurrentPage(1);
  }, [viewMode]);

  // Generate page numbers for pagination
  const getPageNumbers = useMemo(() => {
    const pages: (number | string)[] = [];
    const maxVisiblePages = 5;
    
    if (totalPages <= maxVisiblePages) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      if (currentPage <= 3) {
        for (let i = 1; i <= 4; i++) pages.push(i);
        pages.push('...');
        pages.push(totalPages);
      } else if (currentPage >= totalPages - 2) {
        pages.push(1);
        pages.push('...');
        for (let i = totalPages - 3; i <= totalPages; i++) pages.push(i);
      } else {
        pages.push(1);
        pages.push('...');
        for (let i = currentPage - 1; i <= currentPage + 1; i++) pages.push(i);
        pages.push('...');
        pages.push(totalPages);
      }
    }
    return pages;
  }, [currentPage, totalPages]);

  const formatCurrency = (amount: number) => `Rs. ${amount.toLocaleString('en-LK')}`;

  // Compact currency format for mobile cards
  const formatCompactCurrency = (amount: number): { prefix: string; value: string; suffix: string } => {
    if (amount >= 1_000_000) {
      const val = (amount / 1_000_000);
      return { prefix: 'Rs.', value: val % 1 === 0 ? val.toFixed(0) : val.toFixed(1), suffix: 'M' };
    }
    if (amount >= 1_000) {
      const val = (amount / 1_000);
      return { prefix: 'Rs.', value: val % 1 === 0 ? val.toFixed(0) : val.toFixed(1), suffix: 'K' };
    }
    return { prefix: 'Rs.', value: amount.toLocaleString('en-LK'), suffix: '' };
  };

  // Check if product is low stock
  const isLowStock = (product: Product) => {
    const threshold = product.lowStockThreshold || 10;
    return product.stock <= threshold;
  };

  // Render product image or fallback avatar
  const renderProductImage = (product: Product, size: 'sm' | 'md' | 'lg' = 'md') => {
    const sizeClasses = {
      sm: 'w-8 h-8',
      md: 'w-10 h-10',
      lg: 'w-12 h-12'
    };
    
    if (product.image) {
      return (
        <img 
          src={product.image} 
          alt={product.name}
          className={`${sizeClasses[size]} rounded-lg object-cover flex-shrink-0`}
        />
      );
    }
    
    return (
      <div className={`${sizeClasses[size]} rounded-lg flex items-center justify-center flex-shrink-0 ${
        theme === 'dark' ? 'bg-slate-800' : 'bg-slate-100'
      }`}>
        {getProductIcon(product.category)}
      </div>
    );
  };

  const getProductIcon = (category: string) => {
    switch (category) {
      case 'Processors': return <Cpu className="w-5 h-5 text-emerald-500" />;
      case 'Graphics Cards': return <Monitor className="w-5 h-5 text-purple-500" />;
      case 'Storage': return <HardDrive className="w-5 h-5 text-blue-500" />;
      case 'Memory': return <MemoryStick className="w-5 h-5 text-amber-500" />;
      case 'Peripherals': return <Keyboard className="w-5 h-5 text-pink-500" />;
      default: return <Package className="w-5 h-5 text-emerald-500" />;
    }
  };

  // Category options for searchable select
  const categoryOptions = [
    { value: 'all', label: 'All Categories', count: products.length },
    ...productCategories.map(cat => ({
      value: cat,
      label: cat,
      count: products.filter(p => p.category === cat).length
    }))
  ];

  // Brand options for searchable select
  const brandOptions = [
    { value: 'all', label: 'All Brands', count: products.length },
    ...productBrands.map(brand => ({
      value: brand,
      label: brand,
      count: products.filter(p => p.brand === brand).length
    }))
  ];

  // Calendar helper functions
  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDay = firstDay.getDay();
    return { daysInMonth, startingDay };
  };

  const formatDateDisplay = (dateStr: string) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const renderCalendar = (
    selectedDate: string, 
    setSelectedDate: (date: string) => void, 
    setShowCalendar: (show: boolean) => void
  ) => {
    const { daysInMonth, startingDay } = getDaysInMonth(calendarMonth);
    const days = [];
    const selectedDateObj = selectedDate ? new Date(selectedDate) : null;

    // Empty cells for days before the first day of month
    for (let i = 0; i < startingDay; i++) {
      days.push(<div key={`empty-${i}`} className="w-8 h-8" />);
    }

    // Days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const currentDate = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth(), day);
      const isSelected = selectedDateObj && 
        currentDate.getDate() === selectedDateObj.getDate() &&
        currentDate.getMonth() === selectedDateObj.getMonth() &&
        currentDate.getFullYear() === selectedDateObj.getFullYear();
      const isToday = new Date().toDateString() === currentDate.toDateString();

      days.push(
        <button
          key={day}
          onClick={() => {
            const dateStr = `${currentDate.getFullYear()}-${(currentDate.getMonth() + 1).toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
            setSelectedDate(dateStr);
            setShowCalendar(false);
          }}
          className={`w-8 h-8 rounded-lg text-sm font-medium transition-all ${
            isSelected
              ? 'bg-emerald-500 text-white'
              : isToday
              ? theme === 'dark' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-emerald-100 text-emerald-600'
              : theme === 'dark' ? 'hover:bg-slate-700 text-slate-300' : 'hover:bg-slate-100 text-slate-700'
          }`}
        >
          {day}
        </button>
      );
    }

    return (
      <>
      <div className="fixed inset-0 bg-black/40 z-[59] sm:hidden" onClick={() => setShowCalendar(false)} />
      <div className={`fixed sm:absolute bottom-0 sm:bottom-auto left-0 sm:left-0 right-0 sm:right-auto sm:top-full sm:mt-2 p-4 pt-3 rounded-t-3xl sm:rounded-2xl border-t sm:border shadow-2xl z-[60] w-full sm:w-[280px] ${
        theme === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'
      }`}>
        <div className="w-10 h-1 bg-slate-600 rounded-full mx-auto mb-3 sm:hidden" />
        {/* Calendar Header */}
        <div className="flex items-center justify-between mb-3">
          <button
            onClick={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() - 1, 1))}
            className={`p-1 rounded-lg transition-colors ${
              theme === 'dark' ? 'hover:bg-slate-700 text-slate-400' : 'hover:bg-slate-100 text-slate-600'
            }`}
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className={`text-sm font-semibold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
            {calendarMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
          </span>
          <button
            onClick={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 1))}
            className={`p-1 rounded-lg transition-colors ${
              theme === 'dark' ? 'hover:bg-slate-700 text-slate-400' : 'hover:bg-slate-100 text-slate-600'
            }`}
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
        
        {/* Weekday Headers */}
        <div className="grid grid-cols-7 gap-1 mb-2">
          {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((day) => (
            <div key={day} className={`w-8 h-8 flex items-center justify-center text-xs font-medium ${
              theme === 'dark' ? 'text-slate-500' : 'text-slate-400'
            }`}>
              {day}
            </div>
          ))}
        </div>
        
        {/* Calendar Days */}
        <div className="grid grid-cols-7 gap-1">
          {days}
        </div>

        {/* Clear Button */}
        <button
          onClick={() => {
            setSelectedDate('');
            setShowCalendar(false);
          }}
          className={`w-full mt-3 py-2 text-sm font-medium rounded-lg transition-colors ${
            theme === 'dark' 
              ? 'bg-slate-700 hover:bg-slate-600 text-slate-300' 
              : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
          }`}
        >
          Clear
        </button>
      </div>
      </>
    );
  };

  // Handlers
  const handleAddProduct = () => {
    navigate('/products/add');
  };

  const handleEditProduct = (product: Product) => {
    navigate(`/products/edit/${product.id}`);
  };

  const handleDeleteClick = (product: Product) => {
    setProductToDelete(product);
    setDeleteError(null);
    setIsDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!productToDelete) return;
    
    setIsDeleting(true);
    setDeleteError(null);
    
    try {
      await productService.delete(productToDelete.id, effectiveShopId);
      const updater = (prev: Product[]) => prev.filter(p => p.id !== productToDelete.id);
      setProducts(updater);
      setCachedProducts(updater); // Sync with cache for other pages
      setIsDeleteModalOpen(false);
      setProductToDelete(null);
    } catch (error) {
      console.error('Failed to delete product:', error);
      setDeleteError(error instanceof Error ? error.message : 'Failed to delete product');
    } finally {
      setIsDeleting(false);
    }
  };

  const clearAdvancedFilters = () => {
    setMinPrice('');
    setMaxPrice('');
    setStartDate('');
    setEndDate('');
    setShowLowStockOnly(false);
  };

  const advancedFiltersCount = [minPrice, maxPrice, startDate, endDate, showLowStockOnly].filter(Boolean).length;
  
  // Count of low stock products
  const lowStockCount = products.filter(p => p.stock <= (p.lowStockThreshold || 10)).length;

  // Sales History Handler - Now fetches from API
  const handleViewSalesHistory = async (product: Product) => {
    setSelectedProductForHistory(product);
    setProductSalesHistory([]);
    setSalesStats(null);
    setSalesHistoryStartDate('');
    setSalesHistoryEndDate('');
    setSalesHistorySearchQuery('');
    setShowSalesHistoryStartCalendar(false);
    setShowSalesHistoryEndCalendar(false);
    setIsSalesHistoryOpen(true);
    setIsLoadingSalesHistory(true);
    
    try {
      const result = await productService.getSalesHistory(product.id);
      setProductSalesHistory(result.items);
      setSalesStats(result.stats);
    } catch (error) {
      console.error('Failed to load sales history:', error);
      // Keep modal open but show empty state
    } finally {
      setIsLoadingSalesHistory(false);
    }
  };

  const closeSalesHistory = () => {
    setIsSalesHistoryOpen(false);
    setSelectedProductForHistory(null);
    setProductSalesHistory([]);
    setSalesStats(null);
    setSalesHistoryStartDate('');
    setSalesHistoryEndDate('');
    setSalesHistorySearchQuery('');
    setShowSalesHistoryStartCalendar(false);
    setShowSalesHistoryEndCalendar(false);
  };

  // Stock & Pricing Modal Handler - Fetches stock movements and price history from API
  const handleOpenPricingModal = async (product: Product) => {
    setSelectedProductForPricing(product);
    setPricingActiveTab('overview');
    setStockMovements([]);
    setPriceHistory([]);
    setIsPricingModalOpen(true);
    setIsLoadingPricingData(true);
    
    try {
      const [movementsResult, historyResult] = await Promise.all([
        productService.getStockMovements(product.id),
        productService.getPriceHistory(product.id)
      ]);
      setStockMovements(movementsResult);
      setPriceHistory(historyResult);
    } catch (error) {
      console.error('Failed to load pricing data:', error);
    } finally {
      setIsLoadingPricingData(false);
    }
  };

  const closePricingModal = () => {
    setIsPricingModalOpen(false);
    setSelectedProductForPricing(null);
    setStockMovements([]);
    setPriceHistory([]);
    setPricingActiveTab('overview');
  };

  // Render calendar for sales history modal
  const renderSalesHistoryCalendar = (
    selectedDate: string, 
    setSelectedDate: (date: string) => void, 
    setShowCalendar: (show: boolean) => void,
    align: 'left' | 'right' = 'left'
  ) => {
    const getDaysInMonthLocal = (date: Date) => {
      const year = date.getFullYear();
      const month = date.getMonth();
      const firstDay = new Date(year, month, 1);
      const lastDay = new Date(year, month + 1, 0);
      const daysInMonth = lastDay.getDate();
      const startingDay = firstDay.getDay();
      return { daysInMonth, startingDay };
    };

    const { daysInMonth, startingDay } = getDaysInMonthLocal(salesHistoryCalendarMonth);
    const days = [];
    const selectedDateObj = selectedDate ? new Date(selectedDate) : null;

    for (let i = 0; i < startingDay; i++) {
      days.push(<div key={`empty-${i}`} className="w-8 h-8" />);
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const currentDate = new Date(salesHistoryCalendarMonth.getFullYear(), salesHistoryCalendarMonth.getMonth(), day);
      const isSelected = selectedDateObj && 
        currentDate.getDate() === selectedDateObj.getDate() &&
        currentDate.getMonth() === selectedDateObj.getMonth() &&
        currentDate.getFullYear() === selectedDateObj.getFullYear();
      const isToday = new Date().toDateString() === currentDate.toDateString();

      days.push(
        <button
          key={day}
          onClick={() => {
            const dateStr = `${currentDate.getFullYear()}-${(currentDate.getMonth() + 1).toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
            setSelectedDate(dateStr);
            setShowCalendar(false);
          }}
          className={`w-8 h-8 rounded-lg text-sm font-medium transition-all ${
            isSelected
              ? 'bg-emerald-500 text-white'
              : isToday
              ? theme === 'dark' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-emerald-100 text-emerald-600'
              : theme === 'dark' ? 'hover:bg-slate-700 text-slate-300' : 'hover:bg-slate-100 text-slate-700'
          }`}
        >
          {day}
        </button>
      );
    }

    return (
      <div className={`absolute top-full ${align === 'right' ? 'right-0 sm:left-0' : 'left-0'} mt-2 p-3 rounded-xl border shadow-xl z-[60] min-w-[280px] ${
        theme === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'
      }`}>
        <div className="flex items-center justify-between mb-3">
          <button
            onClick={() => setSalesHistoryCalendarMonth(new Date(salesHistoryCalendarMonth.getFullYear(), salesHistoryCalendarMonth.getMonth() - 1, 1))}
            className={`p-1 rounded-lg transition-colors ${
              theme === 'dark' ? 'hover:bg-slate-700 text-slate-400' : 'hover:bg-slate-100 text-slate-600'
            }`}
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className={`text-sm font-semibold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
            {salesHistoryCalendarMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
          </span>
          <button
            onClick={() => setSalesHistoryCalendarMonth(new Date(salesHistoryCalendarMonth.getFullYear(), salesHistoryCalendarMonth.getMonth() + 1, 1))}
            className={`p-1 rounded-lg transition-colors ${
              theme === 'dark' ? 'hover:bg-slate-700 text-slate-400' : 'hover:bg-slate-100 text-slate-600'
            }`}
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
        
        <div className="grid grid-cols-7 gap-1 mb-2">
          {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((day) => (
            <div key={day} className={`w-8 h-8 flex items-center justify-center text-xs font-medium ${
              theme === 'dark' ? 'text-slate-500' : 'text-slate-400'
            }`}>
              {day}
            </div>
          ))}
        </div>
        
        <div className="grid grid-cols-7 gap-1">
          {days}
        </div>

        <button
          onClick={() => {
            setSelectedDate('');
            setShowCalendar(false);
          }}
          className={`w-full mt-3 py-2 text-sm font-medium rounded-lg transition-colors ${
            theme === 'dark' 
              ? 'bg-slate-700 hover:bg-slate-600 text-slate-300' 
              : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
          }`}
        >
          Clear
        </button>
      </div>
    );
  };

  // Filter sales history by search and date
  const filteredSalesHistory = useMemo(() => {
    let filtered = productSalesHistory;
    
    // Search filter
    if (salesHistorySearchQuery) {
      const query = salesHistorySearchQuery.toLowerCase();
      filtered = filtered.filter(sale => 
        sale.invoice.customerName.toLowerCase().includes(query) ||
        sale.invoice.invoiceNumber.toLowerCase().includes(query)
      );
    }
    
    // Date filter
    if (salesHistoryStartDate || salesHistoryEndDate) {
      filtered = filtered.filter(sale => {
        const saleDate = new Date(sale.invoice.date);
        
        if (salesHistoryStartDate) {
          const start = new Date(salesHistoryStartDate);
          start.setHours(0, 0, 0, 0);
          if (saleDate < start) return false;
        }
        
        if (salesHistoryEndDate) {
          const end = new Date(salesHistoryEndDate);
          end.setHours(23, 59, 59, 999);
          if (saleDate > end) return false;
        }
        
        return true;
      });
    }
    
    return filtered;
  }, [productSalesHistory, salesHistoryStartDate, salesHistoryEndDate, salesHistorySearchQuery]);

  // Calculate sales statistics (based on filtered data or use API stats)
  const getSalesStats = () => {
    // If we have API stats and no filters applied, use API stats
    if (salesStats && !salesHistorySearchQuery && !salesHistoryStartDate && !salesHistoryEndDate) {
      return { 
        totalSold: salesStats.totalUnitsSold, 
        totalRevenue: salesStats.totalRevenue, 
        avgPrice: salesStats.averageSellingPrice,
        totalTransactions: salesStats.totalTransactions
      };
    }
    
    // Otherwise calculate from filtered data
    if (filteredSalesHistory.length === 0) return { totalSold: 0, totalRevenue: 0, avgPrice: 0, totalTransactions: 0 };
    
    const totalSold = filteredSalesHistory.reduce((sum, sale) => sum + sale.quantity, 0);
    const totalRevenue = filteredSalesHistory.reduce((sum, sale) => sum + sale.total, 0);
    const avgPrice = totalSold > 0 ? totalRevenue / totalSold : 0;
    
    return { totalSold, totalRevenue, avgPrice, totalTransactions: filteredSalesHistory.length };
  };

  // Loading state - World-class skeleton UI
  if (isLoading) {
    return (
      <div className="space-y-6 animate-in fade-in duration-300">
        {/* Header Skeleton */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className={`text-2xl lg:text-3xl font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
              Products
            </h1>
            <p className={`mt-1 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
              Loading products...
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className={`w-10 h-10 rounded-xl animate-pulse ${theme === 'dark' ? 'bg-slate-700' : 'bg-slate-200'}`}></div>
            <div className={`w-36 h-10 rounded-xl animate-pulse ${theme === 'dark' ? 'bg-slate-700' : 'bg-slate-200'}`}></div>
          </div>
        </div>

        {/* Stats Skeleton */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className={`p-4 rounded-xl border ${theme === 'dark' ? 'bg-slate-800/30 border-slate-700/50' : 'bg-white border-slate-200'}`}>
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-lg animate-pulse ${theme === 'dark' ? 'bg-slate-700' : 'bg-slate-200'}`}></div>
                <div className="flex-1 space-y-2">
                  <div className={`h-6 w-16 rounded animate-pulse ${theme === 'dark' ? 'bg-slate-700' : 'bg-slate-200'}`}></div>
                  <div className={`h-3 w-20 rounded animate-pulse ${theme === 'dark' ? 'bg-slate-700' : 'bg-slate-200'}`}></div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Filter Bar Skeleton */}
        <div className={`p-4 rounded-2xl border ${theme === 'dark' ? 'bg-slate-800/30 border-slate-700/50' : 'bg-white border-slate-200'}`}>
          <div className="flex flex-wrap items-center gap-3">
            <div className={`h-10 w-64 rounded-xl animate-pulse ${theme === 'dark' ? 'bg-slate-700' : 'bg-slate-200'}`}></div>
            <div className={`h-10 w-32 rounded-xl animate-pulse ${theme === 'dark' ? 'bg-slate-700' : 'bg-slate-200'}`}></div>
            <div className={`h-10 w-32 rounded-xl animate-pulse ${theme === 'dark' ? 'bg-slate-700' : 'bg-slate-200'}`}></div>
          </div>
        </div>

        {/* Product Cards Skeleton */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <div key={i} className={`relative p-4 rounded-2xl border overflow-hidden ${
              theme === 'dark' ? 'bg-slate-800/30 border-slate-700/50' : 'bg-white border-slate-200'
            }`}>
              {/* Shimmer Effect */}
              <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/10 to-transparent"></div>
              
              {/* Product Image Skeleton */}
              <div className={`w-full h-32 rounded-xl mb-4 animate-pulse ${theme === 'dark' ? 'bg-slate-700' : 'bg-slate-200'}`}></div>
              
              {/* Product Info Skeleton */}
              <div className="space-y-3">
                <div className={`h-5 w-3/4 rounded animate-pulse ${theme === 'dark' ? 'bg-slate-700' : 'bg-slate-200'}`}></div>
                <div className={`h-4 w-1/2 rounded animate-pulse ${theme === 'dark' ? 'bg-slate-700' : 'bg-slate-200'}`}></div>
                <div className="flex justify-between items-center pt-2">
                  <div className={`h-6 w-24 rounded animate-pulse ${theme === 'dark' ? 'bg-slate-700' : 'bg-slate-200'}`}></div>
                  <div className={`h-6 w-16 rounded-full animate-pulse ${theme === 'dark' ? 'bg-slate-700' : 'bg-slate-200'}`}></div>
                </div>
              </div>
              
              {/* Action Buttons Skeleton */}
              <div className="flex gap-2 mt-4 pt-4 border-t border-slate-700/30">
                <div className={`h-8 w-8 rounded-lg animate-pulse ${theme === 'dark' ? 'bg-slate-700' : 'bg-slate-200'}`}></div>
                <div className={`h-8 w-8 rounded-lg animate-pulse ${theme === 'dark' ? 'bg-slate-700' : 'bg-slate-200'}`}></div>
                <div className={`h-8 w-8 rounded-lg animate-pulse ${theme === 'dark' ? 'bg-slate-700' : 'bg-slate-200'}`}></div>
              </div>
            </div>
          ))}
        </div>

        {/* Loading Indicator */}
        <div className="flex items-center justify-center py-4">
          <div className="flex items-center gap-3">
            <Loader2 className={`w-5 h-5 animate-spin ${theme === 'dark' ? 'text-emerald-400' : 'text-emerald-500'}`} />
            <span className={`text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
              Fetching products from server...
            </span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* API Error Alert */}
      {apiError && (
        <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-amber-500 font-medium">Warning</p>
            <p className={`text-sm ${theme === 'dark' ? 'text-amber-400' : 'text-amber-600'}`}>
              {apiError}. Showing cached data.
            </p>
          </div>
        </div>
      )}

      {/* Success Banner for newly saved product */}
      {highlightedProductId && (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl flex items-center gap-3 animate-pulse">
          <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0" />
          <p className={`font-medium ${theme === 'dark' ? 'text-emerald-400' : 'text-emerald-600'}`}>
            Product saved successfully! Highlighted below.
          </p>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
        <div>
          <h1 className={`text-xl sm:text-2xl lg:text-3xl font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
            Products
          </h1>
          <p className={`mt-1 text-sm sm:text-base ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
            Manage your computer shop inventory
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => navigate('/products/labels')}
            className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-medium transition-all ${
              theme === 'dark'
                ? 'bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700'
                : 'bg-white text-slate-700 hover:bg-slate-50 border border-slate-200 shadow-sm'
            }`}
          >
            <Barcode className="w-5 h-5 text-purple-500" />
            <span className="hidden sm:inline">Print Labels</span>
          </button>
          <button 
            onClick={handleAddProduct}
            className="flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-xl font-medium hover:opacity-90 transition-opacity"
          >
            <Plus className="w-5 h-5" />
            <span className="hidden sm:inline">Add Product</span>
          </button>
        </div>
      </div>

      {/* Enhanced Analytics Cards - Creative Compact Design */}
      {(() => {
        const costValue = products.reduce((sum, p) => sum + ((p.costPrice || p.price * 0.85) * p.stock), 0);
        const retailValue = products.reduce((sum, p) => sum + ((p.sellingPrice || p.price) * p.stock), 0);
        const profitValue = products.reduce((sum, p) => sum + (((p.sellingPrice || p.price) - (p.costPrice || p.price * 0.85)) * p.stock), 0);
        const totalUnits = products.reduce((sum, p) => sum + p.stock, 0);
        const avgMargin = products.length > 0 ? (products.reduce((sum, p) => sum + (p.profitMargin || 16.5), 0) / products.length).toFixed(1) : '0';
        const totalCategories = new Set(products.map(p => p.category)).size;
        const costCompact = formatCompactCurrency(costValue);
        const retailCompact = formatCompactCurrency(retailValue);
        const profitCompact = formatCompactCurrency(profitValue);

        return (
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-4 gap-2 sm:gap-3 lg:gap-4">
            {/* Total Products */}
            <div className={`relative overflow-hidden p-3 sm:p-4 rounded-xl sm:rounded-2xl border group transition-all hover:scale-[1.02] ${
              theme === 'dark' ? 'bg-gradient-to-br from-slate-800/60 to-slate-800/30 border-slate-700/50' : 'bg-white border-slate-200 shadow-sm'
            }`}>
              <div className={`absolute top-0 right-0 w-16 h-16 sm:w-20 sm:h-20 rounded-full blur-2xl opacity-20 transition-opacity group-hover:opacity-40 bg-blue-500`} />
              <div className="relative">
                <div className={`inline-flex p-1.5 sm:p-2 rounded-lg mb-2 sm:mb-3 ${theme === 'dark' ? 'bg-blue-500/15' : 'bg-blue-50'}`}>
                  <Package className="w-4 h-4 sm:w-5 sm:h-5 text-blue-500" />
                </div>
                <p className={`text-xl sm:text-2xl lg:text-3xl font-extrabold tracking-tight ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                  {products.length}
                </p>
                <p className={`text-[11px] sm:text-xs font-medium mt-0.5 ${theme === 'dark' ? 'text-slate-500' : 'text-slate-500'}`}>Total Products</p>
              </div>
            </div>

            {/* Cost Value */}
            <div className={`relative overflow-hidden p-3 sm:p-4 rounded-xl sm:rounded-2xl border group transition-all hover:scale-[1.02] ${
              theme === 'dark' ? 'bg-gradient-to-br from-slate-800/60 to-slate-800/30 border-slate-700/50' : 'bg-white border-slate-200 shadow-sm'
            }`}>
              <div className={`absolute top-0 right-0 w-16 h-16 sm:w-20 sm:h-20 rounded-full blur-2xl opacity-20 transition-opacity group-hover:opacity-40 bg-amber-500`} />
              <div className="relative">
                <div className={`inline-flex p-1.5 sm:p-2 rounded-lg mb-2 sm:mb-3 ${theme === 'dark' ? 'bg-amber-500/15' : 'bg-amber-50'}`}>
                  <BadgeDollarSign className="w-4 h-4 sm:w-5 sm:h-5 text-amber-500" />
                </div>
                {/* Mobile: Compact format | Desktop: Full format */}
                <p className="text-amber-500 font-extrabold tracking-tight">
                  <span className="sm:hidden text-[10px] font-semibold opacity-70 block -mb-0.5">{costCompact.prefix}</span>
                  <span className="sm:hidden text-xl">{costCompact.value}<span className="text-sm opacity-70">{costCompact.suffix}</span></span>
                  <span className="hidden sm:inline text-lg lg:text-xl">{formatCurrency(costValue)}</span>
                </p>
                <p className={`text-[11px] sm:text-xs font-medium mt-0.5 ${theme === 'dark' ? 'text-slate-500' : 'text-slate-500'}`}>Cost Value</p>
              </div>
            </div>

            {/* Retail Value */}
            <div className={`relative overflow-hidden p-3 sm:p-4 rounded-xl sm:rounded-2xl border group transition-all hover:scale-[1.02] ${
              theme === 'dark' ? 'bg-gradient-to-br from-slate-800/60 to-slate-800/30 border-slate-700/50' : 'bg-white border-slate-200 shadow-sm'
            }`}>
              <div className={`absolute top-0 right-0 w-16 h-16 sm:w-20 sm:h-20 rounded-full blur-2xl opacity-20 transition-opacity group-hover:opacity-40 bg-emerald-500`} />
              <div className="relative">
                <div className={`inline-flex p-1.5 sm:p-2 rounded-lg mb-2 sm:mb-3 ${theme === 'dark' ? 'bg-emerald-500/15' : 'bg-emerald-50'}`}>
                  <DollarSign className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-500" />
                </div>
                <p className="text-emerald-500 font-extrabold tracking-tight">
                  <span className="sm:hidden text-[10px] font-semibold opacity-70 block -mb-0.5">{retailCompact.prefix}</span>
                  <span className="sm:hidden text-xl">{retailCompact.value}<span className="text-sm opacity-70">{retailCompact.suffix}</span></span>
                  <span className="hidden sm:inline text-lg lg:text-xl">{formatCurrency(retailValue)}</span>
                </p>
                <p className={`text-[11px] sm:text-xs font-medium mt-0.5 ${theme === 'dark' ? 'text-slate-500' : 'text-slate-500'}`}>Retail Value</p>
              </div>
            </div>

            {/* Potential Profit */}
            <div className={`relative overflow-hidden p-3 sm:p-4 rounded-xl sm:rounded-2xl border group transition-all hover:scale-[1.02] ${
              theme === 'dark' ? 'bg-gradient-to-br from-slate-800/60 to-slate-800/30 border-slate-700/50' : 'bg-white border-slate-200 shadow-sm'
            }`}>
              <div className={`absolute top-0 right-0 w-16 h-16 sm:w-20 sm:h-20 rounded-full blur-2xl opacity-20 transition-opacity group-hover:opacity-40 bg-purple-500`} />
              <div className="relative">
                <div className={`inline-flex p-1.5 sm:p-2 rounded-lg mb-2 sm:mb-3 ${theme === 'dark' ? 'bg-purple-500/15' : 'bg-purple-50'}`}>
                  <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 text-purple-500" />
                </div>
                <p className="text-purple-500 font-extrabold tracking-tight">
                  <span className="sm:hidden text-[10px] font-semibold opacity-70 block -mb-0.5">{profitCompact.prefix}</span>
                  <span className="sm:hidden text-xl">{profitCompact.value}<span className="text-sm opacity-70">{profitCompact.suffix}</span></span>
                  <span className="hidden sm:inline text-lg lg:text-xl">{formatCurrency(profitValue)}</span>
                </p>
                <p className={`text-[11px] sm:text-xs font-medium mt-0.5 ${theme === 'dark' ? 'text-slate-500' : 'text-slate-500'}`}>Potential Profit</p>
              </div>
            </div>

            {/* Total Units */}
            <div className={`relative overflow-hidden p-3 sm:p-4 rounded-xl sm:rounded-2xl border group transition-all hover:scale-[1.02] ${
              theme === 'dark' ? 'bg-gradient-to-br from-slate-800/60 to-slate-800/30 border-slate-700/50' : 'bg-white border-slate-200 shadow-sm'
            }`}>
              <div className={`absolute top-0 right-0 w-16 h-16 sm:w-20 sm:h-20 rounded-full blur-2xl opacity-20 transition-opacity group-hover:opacity-40 bg-cyan-500`} />
              <div className="relative">
                <div className={`inline-flex p-1.5 sm:p-2 rounded-lg mb-2 sm:mb-3 ${theme === 'dark' ? 'bg-cyan-500/15' : 'bg-cyan-50'}`}>
                  <ShoppingCart className="w-4 h-4 sm:w-5 sm:h-5 text-cyan-500" />
                </div>
                <p className={`text-xl sm:text-2xl lg:text-3xl font-extrabold tracking-tight ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                  {totalUnits.toLocaleString()}
                </p>
                <p className={`text-[11px] sm:text-xs font-medium mt-0.5 ${theme === 'dark' ? 'text-slate-500' : 'text-slate-500'}`}>Total Units</p>
              </div>
            </div>

            {/* Low Stock */}
            <div className={`relative overflow-hidden p-3 sm:p-4 rounded-xl sm:rounded-2xl border group transition-all hover:scale-[1.02] ${
              theme === 'dark' ? 'bg-gradient-to-br from-slate-800/60 to-slate-800/30 border-slate-700/50' : 'bg-white border-slate-200 shadow-sm'
            }`}>
              <div className={`absolute top-0 right-0 w-16 h-16 sm:w-20 sm:h-20 rounded-full blur-2xl opacity-20 transition-opacity group-hover:opacity-40 bg-red-500`} />
              <div className="relative">
                <div className={`inline-flex p-1.5 sm:p-2 rounded-lg mb-2 sm:mb-3 ${theme === 'dark' ? 'bg-red-500/15' : 'bg-red-50'}`}>
                  <AlertTriangle className="w-4 h-4 sm:w-5 sm:h-5 text-red-500" />
                </div>
                <p className={`text-xl sm:text-2xl lg:text-3xl font-extrabold tracking-tight ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                  {lowStockCount}
                </p>
                <p className={`text-[11px] sm:text-xs font-medium mt-0.5 ${theme === 'dark' ? 'text-slate-500' : 'text-slate-500'}`}>Low Stock</p>
              </div>
            </div>

            {/* Avg Margin */}
            <div className={`relative overflow-hidden p-3 sm:p-4 rounded-xl sm:rounded-2xl border group transition-all hover:scale-[1.02] ${
              theme === 'dark' ? 'bg-gradient-to-br from-slate-800/60 to-slate-800/30 border-slate-700/50' : 'bg-white border-slate-200 shadow-sm'
            }`}>
              <div className={`absolute top-0 right-0 w-16 h-16 sm:w-20 sm:h-20 rounded-full blur-2xl opacity-20 transition-opacity group-hover:opacity-40 bg-indigo-500`} />
              <div className="relative">
                <div className={`inline-flex p-1.5 sm:p-2 rounded-lg mb-2 sm:mb-3 ${theme === 'dark' ? 'bg-indigo-500/15' : 'bg-indigo-50'}`}>
                  <PieChart className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-500" />
                </div>
                <p className="text-xl sm:text-2xl lg:text-3xl font-extrabold tracking-tight text-indigo-500">
                  {avgMargin}%
                </p>
                <p className={`text-[11px] sm:text-xs font-medium mt-0.5 ${theme === 'dark' ? 'text-slate-500' : 'text-slate-500'}`}>Avg Margin</p>
              </div>
            </div>

            {/* Categories */}
            <div className={`relative overflow-hidden p-3 sm:p-4 rounded-xl sm:rounded-2xl border group transition-all hover:scale-[1.02] ${
              theme === 'dark' ? 'bg-gradient-to-br from-slate-800/60 to-slate-800/30 border-slate-700/50' : 'bg-white border-slate-200 shadow-sm'
            }`}>
              <div className={`absolute top-0 right-0 w-16 h-16 sm:w-20 sm:h-20 rounded-full blur-2xl opacity-20 transition-opacity group-hover:opacity-40 bg-pink-500`} />
              <div className="relative">
                <div className={`inline-flex p-1.5 sm:p-2 rounded-lg mb-2 sm:mb-3 ${theme === 'dark' ? 'bg-pink-500/15' : 'bg-pink-50'}`}>
                  <LayoutGrid className="w-4 h-4 sm:w-5 sm:h-5 text-pink-500" />
                </div>
                <p className={`text-xl sm:text-2xl lg:text-3xl font-extrabold tracking-tight ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                  {totalCategories}
                </p>
                <p className={`text-[11px] sm:text-xs font-medium mt-0.5 ${theme === 'dark' ? 'text-slate-500' : 'text-slate-500'}`}>Categories</p>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Search and Filters - Single Line */}
      <div className={`p-3 sm:p-4 rounded-2xl border ${
        theme === 'dark' 
          ? 'bg-slate-800/30 border-slate-700/50' 
          : 'bg-white border-slate-200'
      }`}>
        <div className="flex flex-col lg:flex-row gap-3">
          {/* Search */}
          <div className={`flex items-center gap-2 px-3 sm:px-4 py-2 rounded-xl border flex-1 ${
            theme === 'dark' 
              ? 'bg-slate-800/50 border-slate-700/50' 
              : 'bg-slate-50 border-slate-200'
          }`}>
            <Search className={`w-5 h-5 flex-shrink-0 ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`} />
            <input
              type="text"
              placeholder="Search by name, serial number, or barcode..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`bg-transparent border-none outline-none flex-1 min-w-0 text-sm ${
                theme === 'dark' ? 'text-white placeholder-slate-500' : 'text-slate-900 placeholder-slate-400'
              }`}
            />
          </div>

          {/* Filters Row */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Category Filter */}
            <div className="w-full sm:w-40">
              <SearchableSelect
                options={categoryOptions}
                value={selectedCategory}
                onValueChange={setSelectedCategory}
                placeholder="All Categories"
                searchPlaceholder="Search categories..."
                emptyMessage="No categories found"
                theme={theme}
              />
            </div>

            {/* Brand Filter */}
            <div className="w-full sm:w-40">
              <SearchableSelect
                options={brandOptions}
                value={selectedBrand}
                onValueChange={setSelectedBrand}
                placeholder="All Brands"
                searchPlaceholder="Search brands..."
                emptyMessage="No brands found"
                theme={theme}
              />
            </div>

            {/* Filter Toggle Button */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-2 px-3 py-2 rounded-xl transition-colors ${
                showFilters || advancedFiltersCount > 0
                  ? 'bg-emerald-500 text-white'
                  : theme === 'dark'
                    ? 'bg-slate-700 hover:bg-slate-600 text-slate-300'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
              }`}
            >
              <Filter className="w-4 h-4" />
              <span className="text-sm hidden sm:inline">Filters</span>
              {advancedFiltersCount > 0 && (
                <span className="px-1.5 py-0.5 text-xs bg-white/20 rounded-full">
                  {advancedFiltersCount}
                </span>
              )}
            </button>

            {/* Sort Button */}
            <button
              onClick={() => setSortBy(sortBy === 'date-desc' ? 'date-asc' : 'date-desc')}
              className={`p-2 rounded-xl border transition-colors ${
                theme === 'dark' ? 'border-slate-700 hover:bg-slate-800 text-slate-400' : 'border-slate-200 hover:bg-slate-50 text-slate-600'
              }`}
              title={sortBy === 'date-desc' ? 'Sort Ascending' : 'Sort Descending'}
            >
              {sortBy === 'date-desc' ? <SortDesc className="w-4 h-4" /> : <SortAsc className="w-4 h-4" />}
            </button>

            {/* View Mode Toggle */}
            <div className={`flex items-center rounded-xl overflow-hidden border ${
              theme === 'dark' ? 'border-slate-700' : 'border-slate-200'
            }`}>
              <button
                onClick={() => setViewMode('table')}
                className={`p-2 transition-colors ${
                  viewMode === 'table'
                    ? 'bg-emerald-500 text-white'
                    : theme === 'dark'
                      ? 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                      : 'bg-white hover:bg-slate-100 text-slate-700'
                }`}
                title="Table view"
              >
                <List className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('card')}
                className={`p-2 transition-colors ${
                  viewMode === 'card'
                    ? 'bg-emerald-500 text-white'
                    : theme === 'dark'
                      ? 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                      : 'bg-white hover:bg-slate-100 text-slate-700'
                }`}
                title="Card view"
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
            </div>

            
          </div>
        </div>

        {/* Advanced Filters (Collapsible) */}
        {showFilters && (
          <div className={`pt-3 sm:pt-4 border-t ${theme === 'dark' ? 'border-slate-700/50' : 'border-slate-200'}`}>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:flex lg:flex-row lg:items-center gap-3 lg:gap-6">
              {/* Price Range */}
              <div className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:gap-2">
                <div className="flex items-center gap-1.5">
                  <DollarSign className={`w-4 h-4 flex-shrink-0 ${theme === 'dark' ? 'text-emerald-500' : 'text-emerald-600'}`} />
                  <span className={`text-xs font-medium ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>Price</span>
                </div>
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <div className={`flex items-center gap-1.5 flex-1 sm:flex-none sm:w-24 px-3 py-2 sm:py-1.5 rounded-xl border ${
                    theme === 'dark' 
                      ? 'bg-slate-800/50 border-slate-700/50' 
                      : 'bg-slate-50 border-slate-200'
                  }`}>
                    <DollarSign className={`w-3.5 h-3.5 flex-shrink-0 ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`} />
                    <input
                      type="number"
                      placeholder="Min"
                      value={minPrice}
                      onChange={(e) => setMinPrice(e.target.value)}
                      className={`w-full bg-transparent border-none outline-none text-sm ${
                        theme === 'dark' ? 'text-white placeholder-slate-500' : 'text-slate-900 placeholder-slate-400'
                      }`}
                    />
                  </div>
                  <span className={`text-xs flex-shrink-0 ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>to</span>
                  <div className={`flex items-center gap-1.5 flex-1 sm:flex-none sm:w-24 px-3 py-2 sm:py-1.5 rounded-xl border ${
                    theme === 'dark' 
                      ? 'bg-slate-800/50 border-slate-700/50' 
                      : 'bg-slate-50 border-slate-200'
                  }`}>
                    <DollarSign className={`w-3.5 h-3.5 flex-shrink-0 ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`} />
                    <input
                      type="number"
                      placeholder="Max"
                      value={maxPrice}
                      onChange={(e) => setMaxPrice(e.target.value)}
                      className={`w-full bg-transparent border-none outline-none text-sm ${
                        theme === 'dark' ? 'text-white placeholder-slate-500' : 'text-slate-900 placeholder-slate-400'
                      }`}
                    />
                  </div>
                </div>
              </div>

              {/* Date Range with Calendar */}
              <div className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:gap-2">
                <div className="flex items-center gap-1.5">
                  <Calendar className={`w-4 h-4 flex-shrink-0 ${theme === 'dark' ? 'text-emerald-500' : 'text-emerald-600'}`} />
                  <span className={`text-xs font-medium ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>Date</span>
                </div>
                <div className="flex items-center gap-2">
                  {/* Start Date */}
                  <div className="relative flex-1" ref={startCalendarRef}>
                    <button
                      onClick={() => {
                        setShowStartCalendar(!showStartCalendar);
                        setShowEndCalendar(false);
                        setCalendarMonth(startDate ? new Date(startDate) : new Date());
                      }}
                      className={`w-full px-3 py-2 sm:py-1.5 rounded-xl border text-sm text-left ${
                        theme === 'dark' 
                          ? 'bg-slate-800/50 border-slate-700/50 text-white hover:bg-slate-700/50' 
                          : 'bg-slate-50 border-slate-200 text-slate-900 hover:bg-slate-100'
                      }`}
                    >
                      {startDate ? formatDateDisplay(startDate) : 'Start Date'}
                    </button>
                    {showStartCalendar && renderCalendar(startDate, setStartDate, setShowStartCalendar)}
                  </div>
                  
                  <span className={`text-xs ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>to</span>
                  
                  {/* End Date */}
                  <div className="relative flex-1" ref={endCalendarRef}>
                    <button
                      onClick={() => {
                        setShowEndCalendar(!showEndCalendar);
                        setShowStartCalendar(false);
                        setCalendarMonth(endDate ? new Date(endDate) : new Date());
                      }}
                      className={`w-full px-3 py-2 sm:py-1.5 rounded-xl border text-sm text-left ${
                        theme === 'dark' 
                          ? 'bg-slate-800/50 border-slate-700/50 text-white hover:bg-slate-700/50' 
                          : 'bg-slate-50 border-slate-200 text-slate-900 hover:bg-slate-100'
                      }`}
                    >
                      {endDate ? formatDateDisplay(endDate) : 'End Date'}
                    </button>
                    {showEndCalendar && renderCalendar(endDate, setEndDate, setShowEndCalendar)}
                  </div>
                </div>
              </div>

              {/* Low Stock Filter */}
              <button
                onClick={() => setShowLowStockOnly(!showLowStockOnly)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-sm font-medium transition-colors ${
                  showLowStockOnly
                    ? 'bg-red-500 text-white'
                    : theme === 'dark'
                      ? 'bg-slate-800/50 border border-slate-700/50 text-slate-300 hover:bg-slate-700/50'
                      : 'bg-slate-50 border border-slate-200 text-slate-700 hover:bg-slate-100'
                }`}
              >
                <AlertTriangle className="w-4 h-4" />
                Low Stock
                {lowStockCount > 0 && (
                  <span className={`px-1.5 py-0.5 text-xs rounded-full ${
                    showLowStockOnly
                      ? 'bg-white/20'
                      : 'bg-red-500 text-white'
                  }`}>
                    {lowStockCount}
                  </span>
                )}
              </button>

              {/* Clear Advanced Filters */}
              {advancedFiltersCount > 0 && (
                <button
                  onClick={clearAdvancedFilters}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-colors ${
                    theme === 'dark'
                      ? 'bg-red-500/10 hover:bg-red-500/20 text-red-400'
                      : 'bg-red-50 hover:bg-red-100 text-red-600'
                  }`}
                >
                  <X className="w-4 h-4" />
                  <span className="text-sm">Clear</span>
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Products Display */}
      {viewMode === 'table' ? (
        /* Table View */
        <div className={`rounded-2xl border overflow-hidden ${
          theme === 'dark' 
            ? 'bg-slate-800/30 border-slate-700/50' 
            : 'bg-white border-slate-200'
        }`}>
          {/* Desktop Table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full min-w-[1100px]">
              <thead>
                <tr className={`border-b ${theme === 'dark' ? 'border-slate-700/50' : 'border-slate-200'}`}>
                  <th className={`text-left px-3 py-3 text-xs font-semibold w-[20%] ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                    Product
                  </th>
                  <th className={`text-left px-3 py-3 text-xs font-semibold w-[10%] ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                    Category
                  </th>
                  <th className={`text-right px-3 py-3 text-xs font-semibold w-[10%] ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                    Cost Price
                  </th>
                  <th className={`text-right px-3 py-3 text-xs font-semibold w-[10%] ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                    Sell Price
                  </th>
                  <th className={`text-center px-3 py-3 text-xs font-semibold w-[8%] ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                    Margin
                  </th>
                  <th className={`text-center px-3 py-3 text-xs font-semibold w-[7%] ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                    Stock
                  </th>
                  <th className={`text-right px-3 py-3 text-xs font-semibold w-[10%] ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                    Stock Value
                  </th>
                  <th className={`text-right px-3 py-3 text-xs font-semibold w-[12%] ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {paginatedProducts.map((product) => (
                  <tr 
                    key={product.id}
                    className={`border-b transition-all duration-500 ${
                      highlightedProductId === product.id
                        ? theme === 'dark'
                          ? 'border-emerald-500/50 bg-emerald-950/40 ring-2 ring-emerald-500/30'
                          : 'border-emerald-300 bg-emerald-50 ring-2 ring-emerald-500/30'
                        : isLowStock(product)
                          ? theme === 'dark'
                            ? 'border-red-900/30 bg-red-950/20 hover:bg-red-950/30'
                            : 'border-red-100 bg-red-50/50 hover:bg-red-50'
                          : theme === 'dark' 
                            ? 'border-slate-700/30 hover:bg-slate-800/30' 
                            : 'border-slate-100 hover:bg-slate-50'
                    }`}
                  >
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-2">
                        {highlightedProductId === product.id && (
                          <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0 animate-pulse" />
                        )}
                        {renderProductImage(product, 'sm')}
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className={`font-medium block truncate ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                              {product.name}
                            </span>
                            {isLowStock(product) && (
                              <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0" />
                            )}
                          </div>
                          <span className={`text-xs ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>
                            {product.brand} • S/N: {product.serialNumber}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      <span className={`px-2 py-0.5 text-xs font-medium rounded-full truncate block ${
                        theme === 'dark' 
                          ? 'bg-emerald-500/10 text-emerald-400' 
                          : 'bg-emerald-50 text-emerald-600'
                      }`}>
                        {product.category}
                      </span>
                    </td>
                    <td className={`px-3 py-3 text-right text-sm ${theme === 'dark' ? 'text-amber-400' : 'text-amber-600'}`}>
                      {formatCurrency(product.costPrice || product.price * 0.85)}
                    </td>
                    <td className={`px-3 py-3 text-right font-medium text-sm ${theme === 'dark' ? 'text-emerald-400' : 'text-emerald-600'}`}>
                      {formatCurrency(product.sellingPrice || product.price)}
                    </td>
                    <td className="px-3 py-3 text-center">
                      <span className={`px-2 py-0.5 text-xs font-bold rounded-full ${
                        (product.profitMargin || 16.5) >= 18
                          ? theme === 'dark' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-emerald-100 text-emerald-700'
                          : (product.profitMargin || 16.5) >= 15
                            ? theme === 'dark' ? 'bg-blue-500/20 text-blue-400' : 'bg-blue-100 text-blue-700'
                            : theme === 'dark' ? 'bg-amber-500/20 text-amber-400' : 'bg-amber-100 text-amber-700'
                      }`}>
                        {(product.profitMargin || ((((product.sellingPrice || product.price) - (product.costPrice || product.price * 0.85)) / (product.sellingPrice || product.price)) * 100)).toFixed(1)}%
                      </span>
                    </td>
                    <td className="px-3 py-3 text-center">
                      <div className="flex flex-col items-center gap-1">
                        <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                          isLowStock(product)
                            ? 'bg-red-500/10 text-red-500'
                            : product.stock < 20
                            ? 'bg-amber-500/10 text-amber-500'
                            : theme === 'dark' 
                              ? 'bg-emerald-500/10 text-emerald-400' 
                              : 'bg-emerald-50 text-emerald-600'
                        }`}>
                          {product.stock}
                        </span>
                        {isLowStock(product) && (
                          <span className="text-[10px] text-red-500 font-medium whitespace-nowrap">
                            Low!
                          </span>
                        )}
                      </div>
                    </td>
                    <td className={`px-3 py-3 text-right text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                      <div>
                        <span className={`font-medium ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                          {formatCurrency((product.sellingPrice || product.price) * product.stock)}
                        </span>
                        <span className="block text-[10px] mt-0.5 text-slate-500">
                          Profit: {formatCurrency(((product.sellingPrice || product.price) - (product.costPrice || product.price * 0.85)) * product.stock)}
                        </span>
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button 
                          onClick={() => handleOpenPricingModal(product)}
                          className={`p-1.5 rounded-lg transition-colors ${
                            theme === 'dark' ? 'hover:bg-purple-500/10 text-purple-400' : 'hover:bg-purple-50 text-purple-600'
                          }`}
                          title="Stock & Pricing Details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => handleViewSalesHistory(product)}
                          className={`p-1.5 rounded-lg transition-colors ${
                            theme === 'dark' ? 'hover:bg-emerald-500/10 text-emerald-400' : 'hover:bg-emerald-50 text-emerald-600'
                          }`}
                          title="Sales History"
                        >
                          <History className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => handleEditProduct(product)}
                          className={`p-1.5 rounded-lg transition-colors ${
                            theme === 'dark' ? 'hover:bg-slate-700 text-slate-400' : 'hover:bg-slate-100 text-slate-600'
                          }`}
                          title="Edit"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => handleDeleteClick(product)}
                          className={`p-1.5 rounded-lg transition-colors ${
                            theme === 'dark' ? 'hover:bg-red-500/10 text-red-400' : 'hover:bg-red-50 text-red-500'
                          }`}
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile List View (for table mode on mobile) */}
          <div className="md:hidden divide-y divide-slate-200 dark:divide-slate-700/50">
            {paginatedProducts.map((product) => (
              <div 
                key={product.id}
                className={`p-4 ${
                  isLowStock(product)
                    ? theme === 'dark'
                      ? 'bg-red-950/20 hover:bg-red-950/30'
                      : 'bg-red-50/50 hover:bg-red-50'
                    : theme === 'dark' ? 'hover:bg-slate-800/30' : 'hover:bg-slate-50'
                }`}
              >
                <div className="flex items-start gap-3">
                  {renderProductImage(product, 'lg')}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className={`font-medium truncate ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                            {product.name}
                          </h3>
                          {isLowStock(product) && (
                            <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0" />
                          )}
                        </div>
                        <p className={`text-xs font-mono mt-0.5 ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>
                          S/N: {product.serialNumber}
                        </p>
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <button 
                          onClick={() => handleViewSalesHistory(product)}
                          className={`p-2 rounded-lg transition-colors ${
                            theme === 'dark' ? 'hover:bg-emerald-500/10 text-emerald-400' : 'hover:bg-emerald-50 text-emerald-600'
                          }`}
                        >
                          <History className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => handleEditProduct(product)}
                          className={`p-2 rounded-lg transition-colors ${
                            theme === 'dark' ? 'hover:bg-slate-700 text-slate-400' : 'hover:bg-slate-200 text-slate-600'
                          }`}
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => handleDeleteClick(product)}
                          className={`p-2 rounded-lg transition-colors ${
                            theme === 'dark' ? 'hover:bg-red-500/10 text-red-400' : 'hover:bg-red-50 text-red-500'
                          }`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 mt-2">
                      <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                        theme === 'dark' 
                          ? 'bg-emerald-500/10 text-emerald-400' 
                          : 'bg-emerald-50 text-emerald-600'
                      }`}>
                        {product.category}
                      </span>
                      <span className={`text-xs ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>
                        {product.brand}
                      </span>
                    </div>
                    <div className="flex items-center justify-between mt-3">
                      <span className={`font-semibold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                        {formatCurrency(product.price)}
                      </span>
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                          isLowStock(product)
                            ? 'bg-red-500/10 text-red-500'
                            : product.stock < 20
                            ? 'bg-amber-500/10 text-amber-500'
                            : theme === 'dark' 
                              ? 'bg-emerald-500/10 text-emerald-400' 
                              : 'bg-emerald-50 text-emerald-600'
                        }`}>
                          Stock: {product.stock}
                        </span>
                        {isLowStock(product) && (
                          <span className="text-xs text-red-500 font-medium">Low!</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        /* Card View */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
          {paginatedProducts.map((product) => (
            <div 
              key={product.id}
              className={`rounded-2xl border overflow-hidden transition-all duration-500 hover:shadow-lg ${
                highlightedProductId === product.id
                  ? theme === 'dark'
                    ? 'bg-emerald-950/30 border-emerald-500/50 ring-2 ring-emerald-500/30 shadow-emerald-500/20 shadow-lg'
                    : 'bg-emerald-50 border-emerald-300 ring-2 ring-emerald-500/30 shadow-emerald-500/20 shadow-lg'
                  : isLowStock(product)
                    ? theme === 'dark'
                      ? 'bg-red-950/20 border-red-900/50 hover:border-red-800'
                      : 'bg-red-50/50 border-red-200 hover:border-red-300'
                    : theme === 'dark' 
                      ? 'bg-slate-800/30 border-slate-700/50 hover:border-slate-600' 
                      : 'bg-white border-slate-200 hover:border-slate-300'
              }`}
            >
              {/* Newly Saved Badge */}
              {highlightedProductId === product.id && (
                <div className="bg-gradient-to-r from-emerald-500 to-teal-500 text-white text-xs font-medium px-3 py-1 flex items-center justify-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Successfully Saved!
                </div>
              )}
              {/* Card Header with Image */}
              <div className={`p-4 ${theme === 'dark' ? 'bg-slate-800/50' : 'bg-slate-50'}`}>
                <div className="flex items-start justify-between gap-3">
                  {product.image ? (
                    <img 
                      src={product.image} 
                      alt={product.name}
                      className="w-12 h-12 rounded-xl object-cover"
                    />
                  ) : (
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                      theme === 'dark' ? 'bg-slate-700' : 'bg-white'
                    }`}>
                      {getProductIcon(product.category)}
                    </div>
                  )}
                  <div className="flex items-center gap-1">
                    <button 
                      onClick={() => handleViewSalesHistory(product)}
                      className={`p-2 rounded-lg transition-colors ${
                        theme === 'dark' ? 'hover:bg-emerald-500/10 text-emerald-400' : 'hover:bg-emerald-50 text-emerald-600'
                      }`}
                      title="Sales History"
                    >
                      <History className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => handleOpenPricingModal(product)}
                      className={`p-2 rounded-lg transition-colors ${
                        theme === 'dark' ? 'hover:bg-purple-500/10 text-purple-400' : 'hover:bg-purple-50 text-purple-600'
                      }`}
                      title="Stock & Pricing"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => handleEditProduct(product)}
                      className={`p-2 rounded-lg transition-colors ${
                        theme === 'dark' ? 'hover:bg-slate-700 text-slate-400' : 'hover:bg-slate-200 text-slate-600'
                      }`}
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => handleDeleteClick(product)}
                      className={`p-2 rounded-lg transition-colors ${
                        theme === 'dark' ? 'hover:bg-red-500/10 text-red-400' : 'hover:bg-red-50 text-red-500'
                      }`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
              
              {/* Card Content with Pricing */}
              <div className="p-4 space-y-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className={`font-semibold line-clamp-2 ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                      {product.name}
                    </h3>
                    {isLowStock(product) && (
                      <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0" />
                    )}
                  </div>
                  <p className={`text-xs font-mono mt-1 ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>
                    S/N: {product.serialNumber}
                  </p>
                </div>
                
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                    theme === 'dark' 
                      ? 'bg-emerald-500/10 text-emerald-400' 
                      : 'bg-emerald-50 text-emerald-600'
                  }`}>
                    {product.category}
                  </span>
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                    theme === 'dark' 
                      ? 'bg-slate-700 text-slate-300' 
                      : 'bg-slate-100 text-slate-600'
                  }`}>
                    {product.brand}
                  </span>
                  <span className={`px-2 py-1 text-xs font-bold rounded-full ${
                    (product.profitMargin || 16.5) >= 18
                      ? theme === 'dark' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-emerald-100 text-emerald-700'
                      : (product.profitMargin || 16.5) >= 15
                        ? theme === 'dark' ? 'bg-blue-500/20 text-blue-400' : 'bg-blue-100 text-blue-700'
                        : theme === 'dark' ? 'bg-amber-500/20 text-amber-400' : 'bg-amber-100 text-amber-700'
                  }`}>
                    {(product.profitMargin || 16.5).toFixed(1)}% margin
                  </span>
                </div>

                {/* Pricing Details */}
                <div className={`grid grid-cols-2 gap-2 p-2 rounded-lg ${
                  theme === 'dark' ? 'bg-slate-800/50' : 'bg-slate-50'
                }`}>
                  <div className="text-center">
                    <p className={`text-[10px] uppercase tracking-wider font-medium ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>Cost</p>
                    <p className={`text-sm font-semibold ${theme === 'dark' ? 'text-amber-400' : 'text-amber-600'}`}>
                      {formatCurrency(product.costPrice || product.price * 0.85)}
                    </p>
                  </div>
                  <div className="text-center">
                    <p className={`text-[10px] uppercase tracking-wider font-medium ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>Selling</p>
                    <p className={`text-sm font-semibold ${theme === 'dark' ? 'text-emerald-400' : 'text-emerald-600'}`}>
                      {formatCurrency(product.sellingPrice || product.price)}
                    </p>
                  </div>
                </div>
                
                <div className={`pt-3 border-t flex items-center justify-between ${
                  theme === 'dark' ? 'border-slate-700/50' : 'border-slate-100'
                }`}>
                  <div>
                    <span className={`text-lg font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                      {formatCurrency((product.sellingPrice || product.price) * product.stock)}
                    </span>
                    <p className={`text-[10px] ${theme === 'dark' ? 'text-purple-400' : 'text-purple-600'}`}>
                      Profit: {formatCurrency(((product.sellingPrice || product.price) - (product.costPrice || product.price * 0.85)) * product.stock)}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                      isLowStock(product)
                        ? 'bg-red-500/10 text-red-500'
                        : product.stock < 20
                        ? 'bg-amber-500/10 text-amber-500'
                        : theme === 'dark' 
                          ? 'bg-emerald-500/10 text-emerald-400' 
                          : 'bg-emerald-50 text-emerald-600'
                    }`}>
                      Stock: {product.stock}
                    </span>
                    {isLowStock(product) && (
                      <span className="text-[10px] text-red-500 font-medium">Low Stock!</span>
                    )}
                  </div>
                </div>
                
                <p className={`text-xs ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>
                  Added: {new Date(product.createdAt).toLocaleDateString('en-GB', {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric'
                  })}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {filteredProducts.length > 0 && (
        <div className={`p-4 rounded-2xl border ${
          theme === 'dark' 
            ? 'bg-slate-800/30 border-slate-700/50' 
            : 'bg-white border-slate-200'
        }`}>
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            {/* Results Info */}
            <div className="flex items-center gap-4">
              <p className={`text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                Showing <span className="font-medium">{startIndex + 1}</span> - <span className="font-medium">{Math.min(endIndex, filteredProducts.length)}</span> of <span className="font-medium">{filteredProducts.length}</span> products
              </p>
              
              {/* Items Per Page Selector - Creative Pill Buttons */}
              <div className="flex items-center gap-2">
                <span className={`text-sm ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>Show:</span>
                <div className={`flex items-center rounded-full p-0.5 ${
                  theme === 'dark' ? 'bg-slate-800' : 'bg-slate-100'
                }`}>
                  {(viewMode === 'table' ? [5, 10, 20, 50] : [6, 12, 24, 48]).map((num) => (
                    <button
                      key={num}
                      onClick={() => {
                        setItemsPerPage(num);
                        setCurrentPage(1);
                      }}
                      className={`px-3 py-1 rounded-full text-sm font-medium transition-all ${
                        itemsPerPage === num
                          ? 'bg-emerald-500 text-white shadow-md'
                          : theme === 'dark'
                            ? 'text-slate-400 hover:text-white'
                            : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      {num}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex items-center gap-1">
                {/* First Page */}
                <button
                  onClick={() => setCurrentPage(1)}
                  disabled={currentPage === 1}
                  className={`p-2 rounded-lg transition-colors ${
                    currentPage === 1
                      ? theme === 'dark' ? 'text-slate-600 cursor-not-allowed' : 'text-slate-300 cursor-not-allowed'
                      : theme === 'dark' ? 'hover:bg-slate-700 text-slate-400' : 'hover:bg-slate-100 text-slate-600'
                  }`}
                  title="First page"
                >
                  <ChevronsLeft className="w-4 h-4" />
                </button>

                {/* Previous Page */}
                <button
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className={`p-2 rounded-lg transition-colors ${
                    currentPage === 1
                      ? theme === 'dark' ? 'text-slate-600 cursor-not-allowed' : 'text-slate-300 cursor-not-allowed'
                      : theme === 'dark' ? 'hover:bg-slate-700 text-slate-400' : 'hover:bg-slate-100 text-slate-600'
                  }`}
                  title="Previous page"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>

                {/* Page Numbers */}
                <div className="hidden sm:flex items-center gap-1">
                  {getPageNumbers.map((page, index) => (
                    page === '...' ? (
                      <span key={`ellipsis-${index}`} className={`px-2 ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>
                        ...
                      </span>
                    ) : (
                      <button
                        key={page}
                        onClick={() => setCurrentPage(page as number)}
                        className={`w-9 h-9 rounded-lg text-sm font-medium transition-all ${
                          currentPage === page
                            ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/25'
                            : theme === 'dark'
                              ? 'hover:bg-slate-700 text-slate-300'
                              : 'hover:bg-slate-100 text-slate-700'
                        }`}
                      >
                        {page}
                      </button>
                    )
                  ))}
                </div>

                {/* Mobile Page Indicator */}
                <div className={`sm:hidden px-3 py-1 rounded-lg text-sm font-medium ${
                  theme === 'dark' ? 'bg-slate-700 text-slate-300' : 'bg-slate-100 text-slate-700'
                }`}>
                  {currentPage} / {totalPages}
                </div>

                {/* Next Page */}
                <button
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className={`p-2 rounded-lg transition-colors ${
                    currentPage === totalPages
                      ? theme === 'dark' ? 'text-slate-600 cursor-not-allowed' : 'text-slate-300 cursor-not-allowed'
                      : theme === 'dark' ? 'hover:bg-slate-700 text-slate-400' : 'hover:bg-slate-100 text-slate-600'
                  }`}
                  title="Next page"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>

                {/* Last Page */}
                <button
                  onClick={() => setCurrentPage(totalPages)}
                  disabled={currentPage === totalPages}
                  className={`p-2 rounded-lg transition-colors ${
                    currentPage === totalPages
                      ? theme === 'dark' ? 'text-slate-600 cursor-not-allowed' : 'text-slate-300 cursor-not-allowed'
                      : theme === 'dark' ? 'hover:bg-slate-700 text-slate-400' : 'hover:bg-slate-100 text-slate-600'
                  }`}
                  title="Last page"
                >
                  <ChevronsRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Empty State */}
      {filteredProducts.length === 0 && (
        <div className={`text-center py-16 rounded-2xl border ${
          theme === 'dark' ? 'bg-slate-800/30 border-slate-700/50' : 'bg-white border-slate-200'
        }`}>
          <div className={`w-20 h-20 mx-auto mb-4 rounded-2xl flex items-center justify-center ${
            theme === 'dark' ? 'bg-gradient-to-br from-emerald-500/20 to-teal-500/20' : 'bg-gradient-to-br from-emerald-50 to-teal-50'
          }`}>
            <Package className={`w-10 h-10 ${theme === 'dark' ? 'text-emerald-400' : 'text-emerald-500'}`} />
          </div>
          <h3 className={`text-xl font-bold mb-2 ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
            No products found
          </h3>
          <p className={`mb-6 max-w-sm mx-auto ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
            {searchQuery || selectedCategory !== 'all' || selectedBrand !== 'all' || minPrice || maxPrice || startDate || endDate || showLowStockOnly
              ? 'Try adjusting your search or filter criteria to find what you\'re looking for'
              : 'Get started by adding your first product to the inventory'}
          </p>
          {searchQuery || selectedCategory !== 'all' || selectedBrand !== 'all' || minPrice || maxPrice || startDate || endDate || showLowStockOnly ? (
            <button 
              onClick={() => {
                setSearchQuery('');
                setSelectedCategory('all');
                setSelectedBrand('all');
                setMinPrice('');
                setMaxPrice('');
                setStartDate('');
                setEndDate('');
                setShowLowStockOnly(false);
              }}
              className="px-6 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-xl font-medium hover:opacity-90 transition-all shadow-lg shadow-emerald-500/20"
            >
              Clear All Filters
            </button>
          ) : (
            <button 
              onClick={() => navigate('/products/create')}
              className="px-6 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-xl font-medium hover:opacity-90 transition-all shadow-lg shadow-emerald-500/20 flex items-center gap-2 mx-auto"
            >
              <Plus className="w-5 h-5" />
              Add First Product
            </button>
          )}
        </div>
      )}

      {/* Sales History Modal */}
      {isSalesHistoryOpen && selectedProductForHistory && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 bg-black/50 backdrop-blur-sm">
          <div className={`w-full sm:max-w-4xl h-[92vh] sm:h-auto sm:max-h-[90vh] flex flex-col overflow-hidden rounded-t-2xl sm:rounded-2xl border shadow-2xl ${
            theme === 'dark' 
              ? 'bg-slate-900 border-slate-700' 
              : 'bg-white border-slate-200'
          }`}>
            {/* Modal Header */}
            <div className={`px-4 sm:px-6 py-3 sm:py-4 border-b flex items-center justify-between flex-shrink-0 ${
              theme === 'dark' ? 'border-slate-700 bg-slate-800/50' : 'border-slate-200 bg-slate-50'
            }`}>
              <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${
                  theme === 'dark' ? 'bg-emerald-500/10' : 'bg-emerald-50'
                }`}>
                  <History className={`w-5 h-5 sm:w-6 sm:h-6 ${theme === 'dark' ? 'text-emerald-400' : 'text-emerald-600'}`} />
                </div>
                <div className="min-w-0">
                  <h2 className={`text-base sm:text-lg font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                    Sales History
                  </h2>
                  <p className={`text-xs sm:text-sm truncate ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                    {selectedProductForHistory.name}
                  </p>
                </div>
              </div>
              <button
                onClick={closeSalesHistory}
                className={`p-2 rounded-xl transition-colors flex-shrink-0 ${
                  theme === 'dark' ? 'hover:bg-slate-700 text-slate-400' : 'hover:bg-slate-100 text-slate-600'
                }`}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Search and Date Filter */}
            <div className={`px-4 sm:px-6 py-3 border-b flex-shrink-0 ${
              theme === 'dark' ? 'border-slate-700 bg-slate-800/20' : 'border-slate-200 bg-slate-50/30'
            }`}>
              <div className="flex flex-col gap-3">
                  {/* Search Field */}
                  <div className={`flex items-center gap-2 px-3 py-2 rounded-xl border min-w-0 ${
                    theme === 'dark' 
                      ? 'bg-slate-800/50 border-slate-700/50' 
                      : 'bg-white border-slate-200'
                  }`}>
                    <Search className={`w-4 h-4 flex-shrink-0 ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`} />
                    <input
                      type="text"
                      placeholder="Search by invoice number, customer name..."
                      value={salesHistorySearchQuery}
                      onChange={(e) => setSalesHistorySearchQuery(e.target.value)}
                      className={`bg-transparent border-none outline-none flex-1 min-w-0 text-sm ${
                        theme === 'dark' ? 'text-white placeholder-slate-500' : 'text-slate-900 placeholder-slate-400'
                      }`}
                    />
                    {salesHistorySearchQuery && (
                      <button
                        onClick={() => setSalesHistorySearchQuery('')}
                        className={`p-1 rounded-lg transition-colors ${
                          theme === 'dark' ? 'hover:bg-slate-700 text-slate-400' : 'hover:bg-slate-100 text-slate-500'
                        }`}
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  {/* Date Filter with Modern Calendar */}
                  <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
                    <div className="flex items-center gap-1.5 sm:gap-2">
                      <Calendar className={`w-4 h-4 ${theme === 'dark' ? 'text-emerald-500' : 'text-emerald-600'}`} />
                      <span className={`text-xs sm:text-sm font-medium ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                        Date:
                      </span>
                    </div>
                  
                    {/* Start Date Picker */}
                    <div className="relative" ref={salesHistoryStartCalendarRef}>
                      <button
                        onClick={() => {
                          setShowSalesHistoryStartCalendar(!showSalesHistoryStartCalendar);
                          setShowSalesHistoryEndCalendar(false);
                          setSalesHistoryCalendarMonth(salesHistoryStartDate ? new Date(salesHistoryStartDate) : new Date());
                        }}
                        className={`px-2.5 sm:px-3 py-1.5 rounded-xl border text-xs sm:text-sm text-left flex items-center gap-1.5 sm:gap-2 ${
                          theme === 'dark' 
                            ? 'bg-slate-800/50 border-slate-700/50 text-white hover:bg-slate-700/50' 
                            : 'bg-white border-slate-200 text-slate-900 hover:bg-slate-50'
                        }`}
                      >
                        <Calendar className="w-3.5 h-3.5 opacity-50" />
                        {salesHistoryStartDate ? formatDateDisplay(salesHistoryStartDate) : 'Start Date'}
                      </button>
                      {showSalesHistoryStartCalendar && renderSalesHistoryCalendar(salesHistoryStartDate, setSalesHistoryStartDate, setShowSalesHistoryStartCalendar, 'left')}
                    </div>
                  
                    <span className={`text-xs ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>to</span>
                  
                    {/* End Date Picker */}
                    <div className="relative" ref={salesHistoryEndCalendarRef}>
                      <button
                        onClick={() => {
                          setShowSalesHistoryEndCalendar(!showSalesHistoryEndCalendar);
                          setShowSalesHistoryStartCalendar(false);
                          setSalesHistoryCalendarMonth(salesHistoryEndDate ? new Date(salesHistoryEndDate) : new Date());
                        }}
                        className={`px-2.5 sm:px-3 py-1.5 rounded-xl border text-xs sm:text-sm text-left flex items-center gap-1.5 sm:gap-2 ${
                          theme === 'dark' 
                            ? 'bg-slate-800/50 border-slate-700/50 text-white hover:bg-slate-700/50' 
                            : 'bg-white border-slate-200 text-slate-900 hover:bg-slate-50'
                        }`}
                      >
                        <Calendar className="w-3.5 h-3.5 opacity-50" />
                        {salesHistoryEndDate ? formatDateDisplay(salesHistoryEndDate) : 'End Date'}
                      </button>
                      {showSalesHistoryEndCalendar && renderSalesHistoryCalendar(salesHistoryEndDate, setSalesHistoryEndDate, setShowSalesHistoryEndCalendar, 'right')}
                    </div>

                    {(salesHistoryStartDate || salesHistoryEndDate) && (
                      <button
                        onClick={() => {
                          setSalesHistoryStartDate('');
                          setSalesHistoryEndDate('');
                        }}
                        className={`px-2.5 sm:px-3 py-1.5 rounded-xl text-xs sm:text-sm font-medium transition-colors ${
                          theme === 'dark'
                            ? 'bg-red-500/10 hover:bg-red-500/20 text-red-400'
                            : 'bg-red-50 hover:bg-red-100 text-red-600'
                        }`}
                      >
                        Clear
                      </button>
                    )}
                  </div>

                  <span className={`text-xs ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>
                    Showing {filteredSalesHistory.length} of {productSalesHistory.length} records
                  </span>
                </div>
            </div>

            {/* Stats Cards */}
            {(filteredSalesHistory.length > 0 || salesStats) && (
              <div className={`px-4 sm:px-6 py-3 sm:py-4 border-b grid grid-cols-3 gap-2 sm:gap-4 flex-shrink-0 ${
                theme === 'dark' ? 'border-slate-700 bg-slate-800/30' : 'border-slate-200 bg-slate-50/50'
              }`}>
                <div className={`p-2.5 sm:p-4 rounded-xl ${theme === 'dark' ? 'bg-slate-800' : 'bg-white border border-slate-200'}`}>
                  <div className="flex flex-col sm:flex-row items-center sm:items-center gap-1.5 sm:gap-3">
                    <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                      theme === 'dark' ? 'bg-blue-500/10' : 'bg-blue-50'
                    }`}>
                      <TrendingUp className={`w-4 h-4 sm:w-5 sm:h-5 ${theme === 'dark' ? 'text-blue-400' : 'text-blue-600'}`} />
                    </div>
                    <div className="text-center sm:text-left">
                      <p className={`text-[10px] sm:text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>Total Sold</p>
                      <p className={`text-sm sm:text-lg font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                        <span className="sm:hidden">{getSalesStats().totalSold}</span>
                        <span className="hidden sm:inline">{getSalesStats().totalSold} units</span>
                      </p>
                    </div>
                  </div>
                </div>
                <div className={`p-2.5 sm:p-4 rounded-xl ${theme === 'dark' ? 'bg-slate-800' : 'bg-white border border-slate-200'}`}>
                  <div className="flex flex-col sm:flex-row items-center sm:items-center gap-1.5 sm:gap-3">
                    <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                      theme === 'dark' ? 'bg-emerald-500/10' : 'bg-emerald-50'
                    }`}>
                      <DollarSign className={`w-4 h-4 sm:w-5 sm:h-5 ${theme === 'dark' ? 'text-emerald-400' : 'text-emerald-600'}`} />
                    </div>
                    <div className="text-center sm:text-left min-w-0">
                      <p className={`text-[10px] sm:text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>Total Revenue</p>
                      <p className={`text-sm sm:text-lg font-bold truncate ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                        {formatCurrency(getSalesStats().totalRevenue)}
                      </p>
                    </div>
                  </div>
                </div>
                <div className={`p-2.5 sm:p-4 rounded-xl ${theme === 'dark' ? 'bg-slate-800' : 'bg-white border border-slate-200'}`}>
                  <div className="flex flex-col sm:flex-row items-center sm:items-center gap-1.5 sm:gap-3">
                    <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                      theme === 'dark' ? 'bg-amber-500/10' : 'bg-amber-50'
                    }`}>
                      <BadgeDollarSign className={`w-4 h-4 sm:w-5 sm:h-5 ${theme === 'dark' ? 'text-amber-400' : 'text-amber-600'}`} />
                    </div>
                    <div className="text-center sm:text-left min-w-0">
                      <p className={`text-[10px] sm:text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>Avg. Price</p>
                      <p className={`text-sm sm:text-lg font-bold truncate ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                        {formatCurrency(getSalesStats().avgPrice)}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Sales List - Scrollable */}
            <div className="overflow-y-auto flex-1 min-h-0">
              {/* Loading state */}
              {isLoadingSalesHistory ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className={`w-8 h-8 animate-spin ${theme === 'dark' ? 'text-emerald-400' : 'text-emerald-600'}`} />
                </div>
              ) : filteredSalesHistory.length === 0 ? (
                <div className="p-12 text-center">
                  <History className={`w-12 h-12 mx-auto mb-3 ${theme === 'dark' ? 'text-slate-600' : 'text-slate-300'}`} />
                  <p className={`font-medium ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                    {productSalesHistory.length === 0 ? 'No sales history' : 'No sales found for selected dates'}
                  </p>
                  <p className={`text-sm mt-1 ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>
                    {productSalesHistory.length === 0 
                      ? "This product hasn't been sold yet" 
                      : 'Try adjusting your date filter'}
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-slate-200 dark:divide-slate-700/50">
                  {filteredSalesHistory.map((sale) => (
                    <div 
                      key={sale.id}
                      className={`px-4 sm:px-6 py-3 sm:py-4 hover:${theme === 'dark' ? 'bg-slate-800/30' : 'bg-slate-50'} transition-colors`}
                    >
                      <div className="flex items-start justify-between gap-3 sm:gap-4">
                        <div className="flex-1 min-w-0">
                          {/* Customer & Invoice */}
                          <div className="flex items-center gap-2 sm:gap-3 mb-1.5 sm:mb-2">
                            <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                              theme === 'dark' ? 'bg-slate-800' : 'bg-slate-100'
                            }`}>
                              <User className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`} />
                            </div>
                            <div className="min-w-0">
                              <p className={`text-sm sm:text-base font-medium truncate ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                                {sale.invoice.customerName}
                              </p>
                              <p className={`text-[10px] sm:text-xs ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>
                                <Receipt className="w-3 h-3 inline mr-1" />
                                {sale.invoice.invoiceNumber}
                              </p>
                            </div>
                          </div>

                          {/* Date & Status */}
                          <div className="flex items-center gap-2 sm:gap-3 text-xs sm:text-sm">
                            <div className="flex items-center gap-1 sm:gap-1.5">
                              <Clock className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`} />
                              <span className={theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}>
                                {new Date(sale.invoice.date).toLocaleDateString('en-GB', {
                                  day: '2-digit',
                                  month: 'short',
                                  year: 'numeric'
                                })}
                              </span>
                            </div>
                            <span className={`px-1.5 sm:px-2 py-0.5 text-[10px] sm:text-xs font-medium rounded-full ${
                              sale.invoice.status === 'FULLPAID' 
                                ? 'bg-emerald-500/10 text-emerald-500' 
                                : sale.invoice.status === 'HALFPAY'
                                ? 'bg-amber-500/10 text-amber-500'
                                : 'bg-red-500/10 text-red-500'
                            }`}>
                              {sale.invoice.status === 'FULLPAID' ? 'Paid' : sale.invoice.status === 'HALFPAY' ? 'Partial' : 'Unpaid'}
                            </span>
                          </div>
                        </div>

                        {/* Sale Details */}
                        <div className="text-right space-y-0.5 sm:space-y-1 flex-shrink-0">
                          <div className="flex items-center justify-end gap-1 sm:gap-2">
                            <span className={`text-xs sm:text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                              Qty: {sale.quantity}
                            </span>
                            <span className={`text-xs sm:text-sm ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>×</span>
                            <span className={`text-xs sm:text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                              {formatCurrency(sale.unitPrice)}
                            </span>
                          </div>
                          
                          {sale.discount > 0 && (
                            <div className="flex items-center justify-end gap-1 sm:gap-2">
                              <span className={`px-1.5 sm:px-2 py-0.5 text-[10px] sm:text-xs font-medium rounded-full ${
                                theme === 'dark' 
                                  ? 'bg-amber-500/10 text-amber-400' 
                                  : 'bg-amber-50 text-amber-600'
                              }`}>
                                -{formatCurrency(sale.discount)} OFF
                              </span>
                            </div>
                          )}
                          
                          <p className={`text-base sm:text-lg font-bold ${theme === 'dark' ? 'text-emerald-400' : 'text-emerald-600'}`}>
                            {formatCurrency(sale.total)}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className={`px-4 sm:px-6 py-3 sm:py-4 border-t flex-shrink-0 ${theme === 'dark' ? 'border-slate-700' : 'border-slate-200'}`}>
              <button
                onClick={closeSalesHistory}
                className={`w-full py-2.5 rounded-xl font-medium transition-colors text-sm sm:text-base ${
                  theme === 'dark'
                    ? 'bg-slate-700 hover:bg-slate-600 text-white'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                }`}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Modal */}
      <DeleteConfirmationModal
        isOpen={isDeleteModalOpen}
        title="Delete Product"
        message={deleteError || "Are you sure you want to delete this product? This action cannot be undone."}
        itemName={productToDelete?.name}
        onConfirm={handleConfirmDelete}
        onCancel={() => {
          setIsDeleteModalOpen(false);
          setDeleteError(null);
        }}
        isLoading={isDeleting}
      />

      {/* Stock & Pricing Details Modal */}
      {isPricingModalOpen && selectedProductForPricing && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={closePricingModal}
          />
          
          {/* Modal Content */}
          <div className={`relative w-full sm:max-w-2xl h-[92vh] sm:h-auto sm:max-h-[90vh] overflow-hidden rounded-t-2xl sm:rounded-2xl shadow-2xl flex flex-col ${
            theme === 'dark' ? 'bg-slate-900' : 'bg-white'
          }`}>
            {/* Modal Header */}
            <div className={`px-4 sm:px-6 py-3 sm:py-4 border-b flex-shrink-0 ${theme === 'dark' ? 'border-slate-700' : 'border-slate-200'}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 min-w-0">
                  {selectedProductForPricing.image ? (
                    <img 
                      src={selectedProductForPricing.image} 
                      alt={selectedProductForPricing.name}
                      className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl object-cover flex-shrink-0"
                    />
                  ) : (
                    <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${
                      theme === 'dark' ? 'bg-slate-800' : 'bg-slate-100'
                    }`}>
                      {getProductIcon(selectedProductForPricing.category)}
                    </div>
                  )}
                  <div className="min-w-0">
                    <h2 className={`text-base sm:text-lg font-bold truncate ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                      {selectedProductForPricing.name}
                    </h2>
                    <p className={`text-xs sm:text-sm truncate ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                      {selectedProductForPricing.brand} • {selectedProductForPricing.category}
                    </p>
                  </div>
                </div>
                <button
                  onClick={closePricingModal}
                  className={`p-2 rounded-xl transition-colors flex-shrink-0 ${
                    theme === 'dark' ? 'hover:bg-slate-800 text-slate-400' : 'hover:bg-slate-100 text-slate-500'
                  }`}
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Tabs */}
            <div className={`px-3 sm:px-6 border-b flex-shrink-0 overflow-x-auto ${theme === 'dark' ? 'border-slate-700' : 'border-slate-200'}`}>
              <div className="flex gap-0 sm:gap-1 min-w-0">
                {[
                  { id: 'overview', label: 'Overview', icon: PieChart },
                  { id: 'stock-movements', label: 'Stock Movements', icon: Package },
                  { id: 'price-history', label: 'Price History', icon: TrendingUp }
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setPricingActiveTab(tab.id as 'overview' | 'stock-movements' | 'price-history')}
                    className={`flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-4 py-2.5 sm:py-3 text-xs sm:text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                      pricingActiveTab === tab.id
                        ? theme === 'dark'
                          ? 'border-emerald-400 text-emerald-400'
                          : 'border-emerald-600 text-emerald-600'
                        : theme === 'dark'
                          ? 'border-transparent text-slate-400 hover:text-slate-300'
                          : 'border-transparent text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    <tab.icon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    <span className="hidden sm:inline">{tab.label}</span>
                    <span className="sm:hidden">{tab.id === 'overview' ? 'Overview' : tab.id === 'stock-movements' ? 'Stock' : 'Price'}</span>
                    {tab.id === 'stock-movements' && stockMovements.length > 0 && (
                      <span className={`ml-0.5 sm:ml-1 px-1 sm:px-1.5 py-0.5 text-[10px] sm:text-xs rounded-full ${
                        theme === 'dark' ? 'bg-slate-700 text-slate-300' : 'bg-slate-200 text-slate-600'
                      }`}>
                        {stockMovements.length}
                      </span>
                    )}
                    {tab.id === 'price-history' && priceHistory.length > 0 && (
                      <span className={`ml-0.5 sm:ml-1 px-1 sm:px-1.5 py-0.5 text-[10px] sm:text-xs rounded-full ${
                        theme === 'dark' ? 'bg-slate-700 text-slate-300' : 'bg-slate-200 text-slate-600'
                      }`}>
                        {priceHistory.length}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-4 sm:p-6 overflow-y-auto flex-1 min-h-0">
              {/* Loading State */}
              {isLoadingPricingData && pricingActiveTab !== 'overview' && (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className={`w-8 h-8 animate-spin ${theme === 'dark' ? 'text-emerald-400' : 'text-emerald-600'}`} />
                </div>
              )}

              {/* Overview Tab */}
              {pricingActiveTab === 'overview' && (
                <>
              {/* Pricing Overview Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4 mb-4 sm:mb-6">
                {/* Cost Price */}
                <div className={`p-3 sm:p-4 rounded-xl border ${theme === 'dark' ? 'bg-slate-800/50 border-slate-700' : 'bg-amber-50 border-amber-200'}`}>
                  <div className="flex items-center gap-1.5 sm:gap-2 mb-1.5 sm:mb-2">
                    <ArrowDownCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-500" />
                    <span className={`text-[10px] sm:text-xs font-medium ${theme === 'dark' ? 'text-slate-400' : 'text-amber-700'}`}>Cost Price</span>
                  </div>
                  <p className={`text-base sm:text-xl font-bold truncate ${theme === 'dark' ? 'text-amber-400' : 'text-amber-700'}`}>
                    {formatCurrency(selectedProductForPricing.costPrice || selectedProductForPricing.price * 0.85)}
                  </p>
                </div>

                {/* Selling Price */}
                <div className={`p-3 sm:p-4 rounded-xl border ${theme === 'dark' ? 'bg-slate-800/50 border-slate-700' : 'bg-emerald-50 border-emerald-200'}`}>
                  <div className="flex items-center gap-1.5 sm:gap-2 mb-1.5 sm:mb-2">
                    <ArrowUpCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-500" />
                    <span className={`text-[10px] sm:text-xs font-medium ${theme === 'dark' ? 'text-slate-400' : 'text-emerald-700'}`}>Selling Price</span>
                  </div>
                  <p className={`text-base sm:text-xl font-bold truncate ${theme === 'dark' ? 'text-emerald-400' : 'text-emerald-700'}`}>
                    {formatCurrency(selectedProductForPricing.sellingPrice || selectedProductForPricing.price)}
                  </p>
                </div>

                {/* Profit Per Unit */}
                <div className={`p-3 sm:p-4 rounded-xl border ${theme === 'dark' ? 'bg-slate-800/50 border-slate-700' : 'bg-purple-50 border-purple-200'}`}>
                  <div className="flex items-center gap-1.5 sm:gap-2 mb-1.5 sm:mb-2">
                    <TrendingUp className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-purple-500" />
                    <span className={`text-[10px] sm:text-xs font-medium ${theme === 'dark' ? 'text-slate-400' : 'text-purple-700'}`}>Profit/Unit</span>
                  </div>
                  <p className={`text-base sm:text-xl font-bold truncate ${theme === 'dark' ? 'text-purple-400' : 'text-purple-700'}`}>
                    {formatCurrency((selectedProductForPricing.sellingPrice || selectedProductForPricing.price) - (selectedProductForPricing.costPrice || selectedProductForPricing.price * 0.85))}
                  </p>
                </div>

                {/* Margin */}
                <div className={`p-3 sm:p-4 rounded-xl border ${theme === 'dark' ? 'bg-slate-800/50 border-slate-700' : 'bg-blue-50 border-blue-200'}`}>
                  <div className="flex items-center gap-1.5 sm:gap-2 mb-1.5 sm:mb-2">
                    <Percent className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-blue-500" />
                    <span className={`text-[10px] sm:text-xs font-medium ${theme === 'dark' ? 'text-slate-400' : 'text-blue-700'}`}>Margin</span>
                  </div>
                  <p className={`text-base sm:text-xl font-bold ${theme === 'dark' ? 'text-blue-400' : 'text-blue-700'}`}>
                    {(selectedProductForPricing.profitMargin || 16.5).toFixed(1)}%
                  </p>
                </div>
              </div>

              {/* Stock Information */}
              <div className={`p-3 sm:p-4 rounded-xl border mb-4 sm:mb-6 ${theme === 'dark' ? 'bg-slate-800/30 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
                <h3 className={`text-xs sm:text-sm font-semibold mb-3 sm:mb-4 ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                  📦 Stock Information
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
                  <div className="text-center">
                    <p className={`text-xl sm:text-2xl font-bold ${
                      isLowStock(selectedProductForPricing) ? 'text-red-500' : theme === 'dark' ? 'text-white' : 'text-slate-900'
                    }`}>
                      {selectedProductForPricing.stock}
                    </p>
                    <p className={`text-[10px] sm:text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>Current Stock</p>
                  </div>
                  <div className="text-center">
                    <p className={`text-xl sm:text-2xl font-bold ${theme === 'dark' ? 'text-cyan-400' : 'text-cyan-600'}`}>
                      {selectedProductForPricing.totalPurchased || 0}
                    </p>
                    <p className={`text-[10px] sm:text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>Total Purchased</p>
                  </div>
                  <div className="text-center">
                    <p className={`text-xl sm:text-2xl font-bold ${theme === 'dark' ? 'text-emerald-400' : 'text-emerald-600'}`}>
                      {selectedProductForPricing.totalSold || 0}
                    </p>
                    <p className={`text-[10px] sm:text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>Total Sold</p>
                  </div>
                  <div className="text-center">
                    <p className={`text-xl sm:text-2xl font-bold ${theme === 'dark' ? 'text-amber-400' : 'text-amber-600'}`}>
                      {selectedProductForPricing.lowStockThreshold || 10}
                    </p>
                    <p className={`text-[10px] sm:text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>Low Stock Alert</p>
                  </div>
                </div>
              </div>

              {/* Stock Value Summary */}
              <div className={`p-3 sm:p-4 rounded-xl border mb-4 sm:mb-6 ${theme === 'dark' ? 'bg-gradient-to-r from-slate-800/50 to-emerald-900/20 border-slate-700' : 'bg-gradient-to-r from-slate-50 to-emerald-50 border-slate-200'}`}>
                <h3 className={`text-xs sm:text-sm font-semibold mb-3 sm:mb-4 ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                  💰 Stock Value Summary
                </h3>
                <div className="grid grid-cols-3 gap-2 sm:gap-4">
                  <div className="text-center p-2 sm:p-3 rounded-lg bg-white/10">
                    <p className={`text-sm sm:text-lg font-bold truncate ${theme === 'dark' ? 'text-amber-400' : 'text-amber-700'}`}>
                      {formatCurrency((selectedProductForPricing.costPrice || selectedProductForPricing.price * 0.85) * selectedProductForPricing.stock)}
                    </p>
                    <p className={`text-[10px] sm:text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>Cost Value</p>
                  </div>
                  <div className="text-center p-2 sm:p-3 rounded-lg bg-white/10">
                    <p className={`text-sm sm:text-lg font-bold truncate ${theme === 'dark' ? 'text-emerald-400' : 'text-emerald-700'}`}>
                      {formatCurrency((selectedProductForPricing.sellingPrice || selectedProductForPricing.price) * selectedProductForPricing.stock)}
                    </p>
                    <p className={`text-[10px] sm:text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>Retail Value</p>
                  </div>
                  <div className="text-center p-2 sm:p-3 rounded-lg bg-white/10">
                    <p className={`text-sm sm:text-lg font-bold truncate ${theme === 'dark' ? 'text-purple-400' : 'text-purple-700'}`}>
                      {formatCurrency(((selectedProductForPricing.sellingPrice || selectedProductForPricing.price) - (selectedProductForPricing.costPrice || selectedProductForPricing.price * 0.85)) * selectedProductForPricing.stock)}
                    </p>
                    <p className={`text-[10px] sm:text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>Potential Profit</p>
                  </div>
                </div>
              </div>

              {/* Product Details */}
              <div className={`p-3 sm:p-4 rounded-xl border ${theme === 'dark' ? 'bg-slate-800/30 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
                <h3 className={`text-xs sm:text-sm font-semibold mb-3 sm:mb-4 ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                  📋 Product Details
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-4 text-xs sm:text-sm">
                  <div className="flex items-center justify-between sm:block">
                    <span className={`${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>Serial Number:</span>
                    <span className={`sm:ml-2 font-mono ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>{selectedProductForPricing.serialNumber}</span>
                  </div>
                  {selectedProductForPricing.barcode && (
                    <div className="flex items-center justify-between sm:block">
                      <span className={`${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>Barcode:</span>
                      <span className={`sm:ml-2 font-mono truncate max-w-[180px] sm:max-w-none ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>{selectedProductForPricing.barcode}</span>
                    </div>
                  )}
                  {selectedProductForPricing.warranty && (
                    <div className="flex items-center justify-between sm:block">
                      <span className={`${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>Warranty:</span>
                      <span className={`sm:ml-2 ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>{selectedProductForPricing.warranty}</span>
                    </div>
                  )}
                  <div className="flex items-center justify-between sm:block">
                    <span className={`${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>Added:</span>
                    <span className={`sm:ml-2 ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                      {new Date(selectedProductForPricing.createdAt).toLocaleDateString('en-GB', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric'
                      })}
                    </span>
                  </div>
                </div>
              </div>
                </>
              )}

              {/* Stock Movements Tab */}
              {pricingActiveTab === 'stock-movements' && !isLoadingPricingData && (
                <div className="space-y-3 sm:space-y-4">
                  {stockMovements.length === 0 ? (
                    <div className={`text-center py-12 rounded-xl border ${theme === 'dark' ? 'bg-slate-800/30 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
                      <Package className={`w-10 h-10 sm:w-12 sm:h-12 mx-auto mb-3 ${theme === 'dark' ? 'text-slate-600' : 'text-slate-400'}`} />
                      <p className={`font-medium text-sm sm:text-base ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>No stock movements found</p>
                      <p className={`text-xs sm:text-sm ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>Stock changes will appear here</p>
                    </div>
                  ) : (
                    <>
                      {/* Mobile Card Layout */}
                      <div className="sm:hidden space-y-2">
                        {stockMovements.map((movement) => (
                          <div key={movement.id} className={`p-3 rounded-xl border ${theme === 'dark' ? 'bg-slate-800/30 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
                            <div className="flex items-center justify-between mb-2">
                              <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium ${
                                movement.type === 'GRN_IN' ? 'bg-emerald-500/10 text-emerald-500' :
                                movement.type === 'INVOICE_OUT' ? 'bg-blue-500/10 text-blue-500' :
                                movement.type === 'RETURN' ? 'bg-purple-500/10 text-purple-500' :
                                movement.type === 'DAMAGED' ? 'bg-red-500/10 text-red-500' :
                                'bg-amber-500/10 text-amber-500'
                              }`}>
                                {movement.type === 'GRN_IN' ? <ArrowDownCircle className="w-3 h-3" /> :
                                 movement.type === 'INVOICE_OUT' ? <ArrowUpCircle className="w-3 h-3" /> :
                                 <Package className="w-3 h-3" />}
                                {movement.type.replace('_', ' ')}
                              </span>
                              <span className={`text-xs ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>
                                {new Date(movement.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
                              </span>
                            </div>
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <span className={`text-sm font-bold ${
                                  movement.quantity > 0 ? 'text-emerald-500' : 'text-red-500'
                                }`}>
                                  {movement.quantity > 0 ? '+' : ''}{movement.quantity}
                                </span>
                                <span className={`text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                                  {movement.previousStock} → {movement.newStock}
                                </span>
                              </div>
                              {(movement.notes || movement.referenceNumber) && (
                                <span className={`text-xs truncate max-w-[120px] ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>
                                  {movement.notes || movement.referenceNumber}
                                </span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Desktop Table Layout */}
                      <div className={`hidden sm:block rounded-xl border overflow-hidden ${theme === 'dark' ? 'border-slate-700' : 'border-slate-200'}`}>
                        <table className="w-full">
                          <thead className={theme === 'dark' ? 'bg-slate-800/50' : 'bg-slate-50'}>
                            <tr>
                              <th className={`px-4 py-3 text-left text-xs font-semibold uppercase ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>Date</th>
                              <th className={`px-4 py-3 text-left text-xs font-semibold uppercase ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>Type</th>
                              <th className={`px-4 py-3 text-right text-xs font-semibold uppercase ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>Qty</th>
                              <th className={`px-4 py-3 text-right text-xs font-semibold uppercase ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>Stock</th>
                              <th className={`px-4 py-3 text-left text-xs font-semibold uppercase ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>Notes</th>
                            </tr>
                          </thead>
                          <tbody className={`divide-y ${theme === 'dark' ? 'divide-slate-700' : 'divide-slate-200'}`}>
                            {stockMovements.map((movement) => (
                              <tr key={movement.id} className={theme === 'dark' ? 'hover:bg-slate-800/30' : 'hover:bg-slate-50'}>
                                <td className={`px-4 py-3 text-sm ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                                  {new Date(movement.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                                </td>
                                <td className="px-4 py-3">
                                  <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium ${
                                    movement.type === 'GRN_IN' ? 'bg-emerald-500/10 text-emerald-500' :
                                    movement.type === 'INVOICE_OUT' ? 'bg-blue-500/10 text-blue-500' :
                                    movement.type === 'RETURN' ? 'bg-purple-500/10 text-purple-500' :
                                    movement.type === 'DAMAGED' ? 'bg-red-500/10 text-red-500' :
                                    'bg-amber-500/10 text-amber-500'
                                  }`}>
                                    {movement.type === 'GRN_IN' ? <ArrowDownCircle className="w-3 h-3" /> :
                                     movement.type === 'INVOICE_OUT' ? <ArrowUpCircle className="w-3 h-3" /> :
                                     <Package className="w-3 h-3" />}
                                    {movement.type.replace('_', ' ')}
                                  </span>
                                </td>
                                <td className={`px-4 py-3 text-right text-sm font-medium ${
                                  movement.quantity > 0 ? 'text-emerald-500' : 'text-red-500'
                                }`}>
                                  {movement.quantity > 0 ? '+' : ''}{movement.quantity}
                                </td>
                                <td className={`px-4 py-3 text-right text-sm ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                                  {movement.previousStock} → {movement.newStock}
                                </td>
                                <td className={`px-4 py-3 text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                                  {movement.notes || movement.referenceNumber || '-'}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* Price History Tab */}
              {pricingActiveTab === 'price-history' && !isLoadingPricingData && (
                <div className="space-y-3 sm:space-y-4">
                  {priceHistory.length === 0 ? (
                    <div className={`text-center py-12 rounded-xl border ${theme === 'dark' ? 'bg-slate-800/30 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
                      <TrendingUp className={`w-10 h-10 sm:w-12 sm:h-12 mx-auto mb-3 ${theme === 'dark' ? 'text-slate-600' : 'text-slate-400'}`} />
                      <p className={`font-medium text-sm sm:text-base ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>No price changes recorded</p>
                      <p className={`text-xs sm:text-sm ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>Price updates will appear here</p>
                    </div>
                  ) : (
                    <>
                      {/* Mobile Card Layout */}
                      <div className="sm:hidden space-y-2">
                        {priceHistory.map((record) => (
                          <div key={record.id} className={`p-3 rounded-xl border ${theme === 'dark' ? 'bg-slate-800/30 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
                            <div className="flex items-center justify-between mb-2">
                              <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                record.changeType === 'COST_UPDATE' ? 'bg-amber-500/10 text-amber-500' :
                                record.changeType === 'SELLING_UPDATE' ? 'bg-emerald-500/10 text-emerald-500' :
                                'bg-purple-500/10 text-purple-500'
                              }`}>
                                {record.changeType === 'COST_UPDATE' ? 'Cost Update' :
                                 record.changeType === 'SELLING_UPDATE' ? 'Selling Update' : 'Both'}
                              </span>
                              <span className={`text-xs ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>
                                {new Date(record.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
                              </span>
                            </div>
                            <div className="space-y-1.5">
                              {record.previousCostPrice !== undefined && record.newCostPrice !== undefined && (
                                <div className="flex items-center justify-between text-xs">
                                  <span className={theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}>Cost:</span>
                                  <span>
                                    <span className="text-slate-500">{formatCurrency(record.previousCostPrice)}</span>
                                    <span className="mx-1">→</span>
                                    <span className={record.newCostPrice > record.previousCostPrice ? 'text-red-500' : 'text-emerald-500'}>
                                      {formatCurrency(record.newCostPrice)}
                                    </span>
                                  </span>
                                </div>
                              )}
                              {record.previousSellingPrice !== undefined && record.newSellingPrice !== undefined && (
                                <div className="flex items-center justify-between text-xs">
                                  <span className={theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}>Selling:</span>
                                  <span>
                                    <span className="text-slate-500">{formatCurrency(record.previousSellingPrice)}</span>
                                    <span className="mx-1">→</span>
                                    <span className={record.newSellingPrice > record.previousSellingPrice ? 'text-emerald-500' : 'text-red-500'}>
                                      {formatCurrency(record.newSellingPrice)}
                                    </span>
                                  </span>
                                </div>
                              )}
                              {record.reason && (
                                <p className={`text-xs capitalize ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>
                                  {record.reason.replace('_', ' ')}
                                </p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Desktop Table Layout */}
                      <div className={`hidden sm:block rounded-xl border overflow-hidden ${theme === 'dark' ? 'border-slate-700' : 'border-slate-200'}`}>
                        <table className="w-full">
                          <thead className={theme === 'dark' ? 'bg-slate-800/50' : 'bg-slate-50'}>
                            <tr>
                              <th className={`px-4 py-3 text-left text-xs font-semibold uppercase ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>Date</th>
                              <th className={`px-4 py-3 text-left text-xs font-semibold uppercase ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>Type</th>
                              <th className={`px-4 py-3 text-right text-xs font-semibold uppercase ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>Cost Price</th>
                              <th className={`px-4 py-3 text-right text-xs font-semibold uppercase ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>Selling Price</th>
                              <th className={`px-4 py-3 text-left text-xs font-semibold uppercase ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>Reason</th>
                            </tr>
                          </thead>
                          <tbody className={`divide-y ${theme === 'dark' ? 'divide-slate-700' : 'divide-slate-200'}`}>
                            {priceHistory.map((record) => (
                              <tr key={record.id} className={theme === 'dark' ? 'hover:bg-slate-800/30' : 'hover:bg-slate-50'}>
                                <td className={`px-4 py-3 text-sm ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                                  {new Date(record.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                                </td>
                                <td className="px-4 py-3">
                                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                    record.changeType === 'COST_UPDATE' ? 'bg-amber-500/10 text-amber-500' :
                                    record.changeType === 'SELLING_UPDATE' ? 'bg-emerald-500/10 text-emerald-500' :
                                    'bg-purple-500/10 text-purple-500'
                                  }`}>
                                    {record.changeType === 'COST_UPDATE' ? 'Cost' :
                                     record.changeType === 'SELLING_UPDATE' ? 'Selling' : 'Both'}
                                  </span>
                                </td>
                                <td className={`px-4 py-3 text-right text-sm ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                                  {record.previousCostPrice !== undefined && record.newCostPrice !== undefined ? (
                                    <span>
                                      <span className="text-slate-500">{formatCurrency(record.previousCostPrice)}</span>
                                      <span className="mx-1">→</span>
                                      <span className={record.newCostPrice > record.previousCostPrice ? 'text-red-500' : 'text-emerald-500'}>
                                        {formatCurrency(record.newCostPrice)}
                                      </span>
                                    </span>
                                  ) : '-'}
                                </td>
                                <td className={`px-4 py-3 text-right text-sm ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                                  {record.previousSellingPrice !== undefined && record.newSellingPrice !== undefined ? (
                                    <span>
                                      <span className="text-slate-500">{formatCurrency(record.previousSellingPrice)}</span>
                                      <span className="mx-1">→</span>
                                      <span className={record.newSellingPrice > record.previousSellingPrice ? 'text-emerald-500' : 'text-red-500'}>
                                        {formatCurrency(record.newSellingPrice)}
                                      </span>
                                    </span>
                                  ) : '-'}
                                </td>
                                <td className={`px-4 py-3 text-sm capitalize ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                                  {record.reason?.replace('_', ' ') || '-'}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className={`px-4 sm:px-6 py-3 sm:py-4 border-t flex-shrink-0 ${theme === 'dark' ? 'border-slate-700' : 'border-slate-200'}`}>
              <div className="flex gap-2 sm:gap-3">
                <button
                  onClick={() => handleViewSalesHistory(selectedProductForPricing)}
                  className={`flex-1 py-2.5 rounded-xl font-medium transition-colors flex items-center justify-center gap-2 text-sm sm:text-base ${
                    theme === 'dark'
                      ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                      : 'bg-emerald-500 hover:bg-emerald-600 text-white'
                  }`}
                >
                  <History className="w-4 h-4" />
                  <span className="hidden sm:inline">View Sales History</span>
                  <span className="sm:hidden">Sales History</span>
                </button>
                <button
                  onClick={closePricingModal}
                  className={`flex-1 py-2.5 rounded-xl font-medium transition-colors text-sm sm:text-base ${
                    theme === 'dark'
                      ? 'bg-slate-700 hover:bg-slate-600 text-white'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                  }`}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
