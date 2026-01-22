import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../contexts/ThemeContext';
import { mockProducts, productCategories, productBrands, mockSalesHistory } from '../data/mockData';
import type { Product, SaleRecord } from '../data/mockData';
import { DeleteConfirmationModal } from '../components/modals/DeleteConfirmationModal';
import { SearchableSelect } from '../components/ui/searchable-select';
import { 
  Package, Search, Plus, Edit, Trash2,
  Cpu, Monitor, HardDrive, MemoryStick, Keyboard,
  Calendar, DollarSign, X, Filter, ChevronLeft, ChevronRight,
  LayoutGrid, List, ChevronsLeft, ChevronsRight, History, Clock,
  User, Receipt, Percent, TrendingUp, AlertTriangle, SortAsc, SortDesc,
  Barcode, ArrowUpCircle, ArrowDownCircle, ShoppingCart, Eye,
  BadgeDollarSign, PieChart
} from 'lucide-react';

export const Products: React.FC = () => {
  const { theme } = useTheme();
  const navigate = useNavigate();
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
  
  // Stock & Pricing Details Modal states
  const [isPricingModalOpen, setIsPricingModalOpen] = useState(false);
  const [selectedProductForPricing, setSelectedProductForPricing] = useState<Product | null>(null);
  
  // Sales History Modal states
  const [isSalesHistoryOpen, setIsSalesHistoryOpen] = useState(false);
  const [selectedProductForHistory, setSelectedProductForHistory] = useState<Product | null>(null);
  const [productSalesHistory, setProductSalesHistory] = useState<SaleRecord[]>([]);
  const [salesHistoryStartDate, setSalesHistoryStartDate] = useState('');
  const [salesHistoryEndDate, setSalesHistoryEndDate] = useState('');
  const [salesHistorySearchQuery, setSalesHistorySearchQuery] = useState('');
  const [showSalesHistoryStartCalendar, setShowSalesHistoryStartCalendar] = useState(false);
  const [showSalesHistoryEndCalendar, setShowSalesHistoryEndCalendar] = useState(false);
  const [salesHistoryCalendarMonth, setSalesHistoryCalendarMonth] = useState(new Date());
  const salesHistoryStartCalendarRef = useRef<HTMLDivElement>(null);
  const salesHistoryEndCalendarRef = useRef<HTMLDivElement>(null);
  
  // Local products state for demo
  const [products, setProducts] = useState<Product[]>(mockProducts);

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
      <div className={`absolute top-full left-0 mt-2 p-3 rounded-xl border shadow-xl z-50 min-w-[280px] ${
        theme === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'
      }`}>
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
    setIsDeleteModalOpen(true);
  };

  const handleConfirmDelete = () => {
    if (productToDelete) {
      setProducts(prev => prev.filter(p => p.id !== productToDelete.id));
      setIsDeleteModalOpen(false);
      setProductToDelete(null);
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

  // Sales History Handler
  const handleViewSalesHistory = (product: Product) => {
    setSelectedProductForHistory(product);
    const salesForProduct = mockSalesHistory.filter(sale => sale.productId === product.id);
    // Sort by date descending (newest first)
    salesForProduct.sort((a, b) => new Date(b.saleDate).getTime() - new Date(a.saleDate).getTime());
    setProductSalesHistory(salesForProduct);
    setSalesHistoryStartDate('');
    setSalesHistoryEndDate('');
    setSalesHistorySearchQuery('');
    setShowSalesHistoryStartCalendar(false);
    setShowSalesHistoryEndCalendar(false);
    setIsSalesHistoryOpen(true);
  };

  const closeSalesHistory = () => {
    setIsSalesHistoryOpen(false);
    setSelectedProductForHistory(null);
    setProductSalesHistory([]);
    setSalesHistoryStartDate('');
    setSalesHistoryEndDate('');
    setSalesHistorySearchQuery('');
    setShowSalesHistoryStartCalendar(false);
    setShowSalesHistoryEndCalendar(false);
  };

  // Render calendar for sales history modal
  const renderSalesHistoryCalendar = (
    selectedDate: string, 
    setSelectedDate: (date: string) => void, 
    setShowCalendar: (show: boolean) => void
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
      <div className={`absolute top-full left-0 mt-2 p-3 rounded-xl border shadow-xl z-[60] min-w-[280px] ${
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
        sale.customerName.toLowerCase().includes(query) ||
        sale.invoiceId.toLowerCase().includes(query)
      );
    }
    
    // Date filter
    if (salesHistoryStartDate || salesHistoryEndDate) {
      filtered = filtered.filter(sale => {
        const saleDate = new Date(sale.saleDate);
        
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

  // Calculate sales statistics (based on filtered data)
  const getSalesStats = () => {
    if (filteredSalesHistory.length === 0) return { totalSold: 0, totalRevenue: 0, avgDiscount: 0 };
    
    const totalSold = filteredSalesHistory.reduce((sum, sale) => sum + sale.quantity, 0);
    const totalRevenue = filteredSalesHistory.reduce((sum, sale) => sum + sale.total, 0);
    const avgDiscount = filteredSalesHistory.reduce((sum, sale) => sum + sale.discount, 0) / filteredSalesHistory.length;
    
    return { totalSold, totalRevenue, avgDiscount };
  };

  return (
    <div className="space-y-4 sm:space-y-6">
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

      {/* Enhanced Analytics Cards - 2 Rows */}
      <div className="space-y-4">
        {/* Row 1: Main Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {/* Total Products */}
          <div className={`p-4 rounded-xl border ${theme === 'dark' ? 'bg-slate-800/30 border-slate-700/50' : 'bg-white border-slate-200 shadow-sm'}`}>
            <div className="flex items-center gap-3">
              <div className={`p-2.5 rounded-lg ${theme === 'dark' ? 'bg-blue-500/10' : 'bg-blue-50'}`}>
                <Package className="w-5 h-5 text-blue-500" />
              </div>
              <div>
                <p className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                  {products.length}
                </p>
                <p className={`text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>Total Products</p>
              </div>
            </div>
          </div>

          {/* Stock Value (at Cost) */}
          <div className={`p-4 rounded-xl border ${theme === 'dark' ? 'bg-slate-800/30 border-slate-700/50' : 'bg-white border-slate-200 shadow-sm'}`}>
            <div className="flex items-center gap-3">
              <div className={`p-2.5 rounded-lg ${theme === 'dark' ? 'bg-amber-500/10' : 'bg-amber-50'}`}>
                <BadgeDollarSign className="w-5 h-5 text-amber-500" />
              </div>
              <div>
                <p className={`text-xl font-bold text-amber-500`}>
                  {formatCurrency(products.reduce((sum, p) => sum + ((p.costPrice || p.price * 0.85) * p.stock), 0))}
                </p>
                <p className={`text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>Cost Value</p>
              </div>
            </div>
          </div>

          {/* Stock Value (at Selling) */}
          <div className={`p-4 rounded-xl border ${theme === 'dark' ? 'bg-slate-800/30 border-slate-700/50' : 'bg-white border-slate-200 shadow-sm'}`}>
            <div className="flex items-center gap-3">
              <div className={`p-2.5 rounded-lg ${theme === 'dark' ? 'bg-emerald-500/10' : 'bg-emerald-50'}`}>
                <DollarSign className="w-5 h-5 text-emerald-500" />
              </div>
              <div>
                <p className={`text-xl font-bold text-emerald-500`}>
                  {formatCurrency(products.reduce((sum, p) => sum + ((p.sellingPrice || p.price) * p.stock), 0))}
                </p>
                <p className={`text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>Retail Value</p>
              </div>
            </div>
          </div>

          {/* Potential Profit */}
          <div className={`p-4 rounded-xl border ${theme === 'dark' ? 'bg-slate-800/30 border-slate-700/50' : 'bg-white border-slate-200 shadow-sm'}`}>
            <div className="flex items-center gap-3">
              <div className={`p-2.5 rounded-lg ${theme === 'dark' ? 'bg-purple-500/10' : 'bg-purple-50'}`}>
                <TrendingUp className="w-5 h-5 text-purple-500" />
              </div>
              <div>
                <p className={`text-xl font-bold text-purple-500`}>
                  {formatCurrency(products.reduce((sum, p) => sum + (((p.sellingPrice || p.price) - (p.costPrice || p.price * 0.85)) * p.stock), 0))}
                </p>
                <p className={`text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>Potential Profit</p>
              </div>
            </div>
          </div>
        </div>

        {/* Row 2: Stock & Performance Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {/* Total Stock Units */}
          <div className={`p-4 rounded-xl border ${theme === 'dark' ? 'bg-slate-800/30 border-slate-700/50' : 'bg-white border-slate-200 shadow-sm'}`}>
            <div className="flex items-center gap-3">
              <div className={`p-2.5 rounded-lg ${theme === 'dark' ? 'bg-cyan-500/10' : 'bg-cyan-50'}`}>
                <ShoppingCart className="w-5 h-5 text-cyan-500" />
              </div>
              <div>
                <p className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                  {products.reduce((sum, p) => sum + p.stock, 0)}
                </p>
                <p className={`text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>Total Units</p>
              </div>
            </div>
          </div>

          {/* Low Stock Items */}
          <div className={`p-4 rounded-xl border ${theme === 'dark' ? 'bg-slate-800/30 border-slate-700/50' : 'bg-white border-slate-200 shadow-sm'}`}>
            <div className="flex items-center gap-3">
              <div className={`p-2.5 rounded-lg ${theme === 'dark' ? 'bg-red-500/10' : 'bg-red-50'}`}>
                <AlertTriangle className="w-5 h-5 text-red-500" />
              </div>
              <div>
                <p className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                  {lowStockCount}
                </p>
                <p className={`text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>Low Stock</p>
              </div>
            </div>
          </div>

          {/* Avg Profit Margin */}
          <div className={`p-4 rounded-xl border ${theme === 'dark' ? 'bg-slate-800/30 border-slate-700/50' : 'bg-white border-slate-200 shadow-sm'}`}>
            <div className="flex items-center gap-3">
              <div className={`p-2.5 rounded-lg ${theme === 'dark' ? 'bg-indigo-500/10' : 'bg-indigo-50'}`}>
                <PieChart className="w-5 h-5 text-indigo-500" />
              </div>
              <div>
                <p className={`text-2xl font-bold text-indigo-500`}>
                  {(products.reduce((sum, p) => sum + (p.profitMargin || 16.5), 0) / products.length).toFixed(1)}%
                </p>
                <p className={`text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>Avg Margin</p>
              </div>
            </div>
          </div>

          {/* Total Categories */}
          <div className={`p-4 rounded-xl border ${theme === 'dark' ? 'bg-slate-800/30 border-slate-700/50' : 'bg-white border-slate-200 shadow-sm'}`}>
            <div className="flex items-center gap-3">
              <div className={`p-2.5 rounded-lg ${theme === 'dark' ? 'bg-pink-500/10' : 'bg-pink-50'}`}>
                <LayoutGrid className="w-5 h-5 text-pink-500" />
              </div>
              <div>
                <p className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                  {new Set(products.map(p => p.category)).size}
                </p>
                <p className={`text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>Categories</p>
              </div>
            </div>
          </div>
        </div>
      </div>

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
            <div className="flex flex-col lg:flex-row lg:items-center gap-3 lg:gap-6">
              {/* Price Range */}
              <div className="flex items-center gap-2">
                <DollarSign className={`w-4 h-4 flex-shrink-0 ${theme === 'dark' ? 'text-emerald-500' : 'text-emerald-600'}`} />
                <span className={`text-sm font-medium ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>Price:</span>
                <input
                  type="number"
                  placeholder="Min"
                  value={minPrice}
                  onChange={(e) => setMinPrice(e.target.value)}
                  className={`w-24 px-3 py-1.5 rounded-xl border text-sm ${
                    theme === 'dark' 
                      ? 'bg-slate-800/50 border-slate-700/50 text-white placeholder-slate-500' 
                      : 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400'
                  }`}
                />
                <span className={`${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>-</span>
                <input
                  type="number"
                  placeholder="Max"
                  value={maxPrice}
                  onChange={(e) => setMaxPrice(e.target.value)}
                  className={`w-24 px-3 py-1.5 rounded-xl border text-sm ${
                    theme === 'dark' 
                      ? 'bg-slate-800/50 border-slate-700/50 text-white placeholder-slate-500' 
                      : 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400'
                  }`}
                />
              </div>

              {/* Date Range with Calendar */}
              <div className="flex items-center gap-2">
                <Calendar className={`w-4 h-4 flex-shrink-0 ${theme === 'dark' ? 'text-emerald-500' : 'text-emerald-600'}`} />
                <span className={`text-sm font-medium ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>Date:</span>
                {/* Start Date */}
                <div className="relative" ref={startCalendarRef}>
                  <button
                    onClick={() => {
                      setShowStartCalendar(!showStartCalendar);
                      setShowEndCalendar(false);
                      setCalendarMonth(startDate ? new Date(startDate) : new Date());
                    }}
                    className={`px-3 py-1.5 rounded-xl border text-sm min-w-[110px] text-left ${
                      theme === 'dark' 
                        ? 'bg-slate-800/50 border-slate-700/50 text-white hover:bg-slate-700/50' 
                        : 'bg-slate-50 border-slate-200 text-slate-900 hover:bg-slate-100'
                    }`}
                  >
                    {startDate ? formatDateDisplay(startDate) : 'Start Date'}
                  </button>
                  {showStartCalendar && renderCalendar(startDate, setStartDate, setShowStartCalendar)}
                </div>
                
                <span className={`${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>-</span>
                
                {/* End Date */}
                <div className="relative" ref={endCalendarRef}>
                  <button
                    onClick={() => {
                      setShowEndCalendar(!showEndCalendar);
                      setShowStartCalendar(false);
                      setCalendarMonth(endDate ? new Date(endDate) : new Date());
                    }}
                    className={`px-3 py-1.5 rounded-xl border text-sm min-w-[110px] text-left ${
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
                    className={`border-b transition-colors ${
                      isLowStock(product)
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
                          onClick={() => {
                            setSelectedProductForPricing(product);
                            setIsPricingModalOpen(true);
                          }}
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
              className={`rounded-2xl border overflow-hidden transition-all hover:shadow-lg ${
                isLowStock(product)
                  ? theme === 'dark'
                    ? 'bg-red-950/20 border-red-900/50 hover:border-red-800'
                    : 'bg-red-50/50 border-red-200 hover:border-red-300'
                  : theme === 'dark' 
                    ? 'bg-slate-800/30 border-slate-700/50 hover:border-slate-600' 
                    : 'bg-white border-slate-200 hover:border-slate-300'
              }`}
            >
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
                      onClick={() => {
                        setSelectedProductForPricing(product);
                        setIsPricingModalOpen(true);
                      }}
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
        <div className={`p-8 rounded-2xl border text-center ${
          theme === 'dark' 
            ? 'bg-slate-800/30 border-slate-700/50' 
            : 'bg-white border-slate-200'
        }`}>
          <Package className={`w-12 h-12 mx-auto mb-3 ${theme === 'dark' ? 'text-slate-600' : 'text-slate-300'}`} />
          <p className={`font-medium ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
            No products found
          </p>
          <p className={`text-sm mt-1 ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>
            Try adjusting your search or filter criteria
          </p>
        </div>
      )}

      {/* Sales History Modal */}
      {isSalesHistoryOpen && selectedProductForHistory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className={`w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden rounded-2xl border shadow-2xl ${
            theme === 'dark' 
              ? 'bg-slate-900 border-slate-700' 
              : 'bg-white border-slate-200'
          }`}>
            {/* Modal Header */}
            <div className={`px-6 py-4 border-b flex items-start justify-between flex-shrink-0 ${
              theme === 'dark' ? 'border-slate-700 bg-slate-800/50' : 'border-slate-200 bg-slate-50'
            }`}>
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                  theme === 'dark' ? 'bg-emerald-500/10' : 'bg-emerald-50'
                }`}>
                  <History className={`w-6 h-6 ${theme === 'dark' ? 'text-emerald-400' : 'text-emerald-600'}`} />
                </div>
                <div>
                  <h2 className={`text-lg font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                    Sales History
                  </h2>
                  <p className={`text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                    {selectedProductForHistory.name}
                  </p>
                </div>
              </div>
              <button
                onClick={closeSalesHistory}
                className={`p-2 rounded-xl transition-colors ${
                  theme === 'dark' ? 'hover:bg-slate-700 text-slate-400' : 'hover:bg-slate-100 text-slate-600'
                }`}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Search and Date Filter */}
            <div className={`px-6 py-3 border-b flex-shrink-0 ${
              theme === 'dark' ? 'border-slate-700 bg-slate-800/20' : 'border-slate-200 bg-slate-50/30'
            }`}>
              <div className="flex flex-col md:flex-row md:items-center gap-3">
                  {/* Search Field */}
                  <div className={`flex items-center gap-2 px-3 py-2 rounded-xl border flex-1 min-w-0 ${
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
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <div className="flex items-center gap-2">
                      <Calendar className={`w-4 h-4 ${theme === 'dark' ? 'text-emerald-500' : 'text-emerald-600'}`} />
                      <span className={`text-sm font-medium ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
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
                        className={`px-3 py-1.5 rounded-xl border text-sm min-w-[120px] text-left flex items-center gap-2 ${
                          theme === 'dark' 
                            ? 'bg-slate-800/50 border-slate-700/50 text-white hover:bg-slate-700/50' 
                            : 'bg-white border-slate-200 text-slate-900 hover:bg-slate-50'
                        }`}
                      >
                        <Calendar className="w-3.5 h-3.5 opacity-50" />
                        {salesHistoryStartDate ? formatDateDisplay(salesHistoryStartDate) : 'Start Date'}
                      </button>
                      {showSalesHistoryStartCalendar && renderSalesHistoryCalendar(salesHistoryStartDate, setSalesHistoryStartDate, setShowSalesHistoryStartCalendar)}
                    </div>
                  
                    <span className={theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}>to</span>
                  
                    {/* End Date Picker */}
                    <div className="relative" ref={salesHistoryEndCalendarRef}>
                      <button
                        onClick={() => {
                          setShowSalesHistoryEndCalendar(!showSalesHistoryEndCalendar);
                          setShowSalesHistoryStartCalendar(false);
                          setSalesHistoryCalendarMonth(salesHistoryEndDate ? new Date(salesHistoryEndDate) : new Date());
                        }}
                        className={`px-3 py-1.5 rounded-xl border text-sm min-w-[120px] text-left flex items-center gap-2 ${
                          theme === 'dark' 
                            ? 'bg-slate-800/50 border-slate-700/50 text-white hover:bg-slate-700/50' 
                            : 'bg-white border-slate-200 text-slate-900 hover:bg-slate-50'
                        }`}
                      >
                        <Calendar className="w-3.5 h-3.5 opacity-50" />
                        {salesHistoryEndDate ? formatDateDisplay(salesHistoryEndDate) : 'End Date'}
                      </button>
                      {showSalesHistoryEndCalendar && renderSalesHistoryCalendar(salesHistoryEndDate, setSalesHistoryEndDate, setShowSalesHistoryEndCalendar)}
                    </div>

                    {(salesHistoryStartDate || salesHistoryEndDate) && (
                      <button
                        onClick={() => {
                          setSalesHistoryStartDate('');
                          setSalesHistoryEndDate('');
                        }}
                        className={`px-3 py-1.5 rounded-xl text-sm font-medium transition-colors ${
                          theme === 'dark'
                            ? 'bg-red-500/10 hover:bg-red-500/20 text-red-400'
                            : 'bg-red-50 hover:bg-red-100 text-red-600'
                        }`}
                      >
                        Clear Dates
                      </button>
                    )}
                  </div>

                  <span className={`text-xs ml-auto ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>
                    Showing {filteredSalesHistory.length} of {productSalesHistory.length} records
                  </span>
                </div>
            </div>

            {/* Stats Cards */}
            {filteredSalesHistory.length > 0 && (
              <div className={`px-6 py-4 border-b grid grid-cols-3 gap-4 flex-shrink-0 ${
                theme === 'dark' ? 'border-slate-700 bg-slate-800/30' : 'border-slate-200 bg-slate-50/50'
              }`}>
                <div className={`p-4 rounded-xl ${theme === 'dark' ? 'bg-slate-800' : 'bg-white border border-slate-200'}`}>
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                      theme === 'dark' ? 'bg-blue-500/10' : 'bg-blue-50'
                    }`}>
                      <TrendingUp className={`w-5 h-5 ${theme === 'dark' ? 'text-blue-400' : 'text-blue-600'}`} />
                    </div>
                    <div>
                      <p className={`text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>Total Sold</p>
                      <p className={`text-lg font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                        {getSalesStats().totalSold} units
                      </p>
                    </div>
                  </div>
                </div>
                <div className={`p-4 rounded-xl ${theme === 'dark' ? 'bg-slate-800' : 'bg-white border border-slate-200'}`}>
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                      theme === 'dark' ? 'bg-emerald-500/10' : 'bg-emerald-50'
                    }`}>
                      <DollarSign className={`w-5 h-5 ${theme === 'dark' ? 'text-emerald-400' : 'text-emerald-600'}`} />
                    </div>
                    <div>
                      <p className={`text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>Total Revenue</p>
                      <p className={`text-lg font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                        {formatCurrency(getSalesStats().totalRevenue)}
                      </p>
                    </div>
                  </div>
                </div>
                <div className={`p-4 rounded-xl ${theme === 'dark' ? 'bg-slate-800' : 'bg-white border border-slate-200'}`}>
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                      theme === 'dark' ? 'bg-amber-500/10' : 'bg-amber-50'
                    }`}>
                      <Percent className={`w-5 h-5 ${theme === 'dark' ? 'text-amber-400' : 'text-amber-600'}`} />
                    </div>
                    <div>
                      <p className={`text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>Avg. Discount</p>
                      <p className={`text-lg font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                        {getSalesStats().avgDiscount.toFixed(1)}%
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Sales List - Scrollable */}
            <div className="overflow-y-auto flex-1 min-h-0">
              {filteredSalesHistory.length === 0 ? (
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
                      className={`px-6 py-4 hover:${theme === 'dark' ? 'bg-slate-800/30' : 'bg-slate-50'} transition-colors`}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          {/* Customer & Invoice */}
                          <div className="flex items-center gap-3 mb-2">
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                              theme === 'dark' ? 'bg-slate-800' : 'bg-slate-100'
                            }`}>
                              <User className={`w-4 h-4 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`} />
                            </div>
                            <div>
                              <p className={`font-medium ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                                {sale.customerName}
                              </p>
                              <p className={`text-xs ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>
                                <Receipt className="w-3 h-3 inline mr-1" />
                                {sale.invoiceId}
                              </p>
                            </div>
                          </div>

                          {/* Date & Time */}
                          <div className="flex items-center gap-2 text-sm">
                            <Clock className={`w-4 h-4 ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`} />
                            <span className={theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}>
                              {new Date(sale.saleDate).toLocaleDateString('en-GB', {
                                day: '2-digit',
                                month: 'short',
                                year: 'numeric'
                              })}
                              {' at '}
                              {new Date(sale.saleDate).toLocaleTimeString('en-US', {
                                hour: '2-digit',
                                minute: '2-digit',
                                hour12: true
                              })}
                            </span>
                          </div>
                        </div>

                        {/* Sale Details */}
                        <div className="text-right space-y-1">
                          <div className="flex items-center justify-end gap-2">
                            <span className={`text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                              Qty: {sale.quantity}
                            </span>
                            <span className={`text-sm ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>×</span>
                            <span className={`text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                              {formatCurrency(sale.unitPrice)}
                            </span>
                          </div>
                          
                          {sale.discount > 0 && (
                            <div className="flex items-center justify-end gap-2">
                              <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                                theme === 'dark' 
                                  ? 'bg-amber-500/10 text-amber-400' 
                                  : 'bg-amber-50 text-amber-600'
                              }`}>
                                -{sale.discount}% OFF
                              </span>
                              <span className={`text-xs line-through ${theme === 'dark' ? 'text-slate-600' : 'text-slate-400'}`}>
                                {formatCurrency(sale.unitPrice * sale.quantity)}
                              </span>
                            </div>
                          )}
                          
                          <p className={`text-lg font-bold ${theme === 'dark' ? 'text-emerald-400' : 'text-emerald-600'}`}>
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
            <div className={`px-6 py-4 border-t ${theme === 'dark' ? 'border-slate-700' : 'border-slate-200'}`}>
              <button
                onClick={closeSalesHistory}
                className={`w-full py-2.5 rounded-xl font-medium transition-colors ${
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
        message="Are you sure you want to delete this product? This action cannot be undone."
        itemName={productToDelete?.name}
        onConfirm={handleConfirmDelete}
        onCancel={() => setIsDeleteModalOpen(false)}
      />

      {/* Stock & Pricing Details Modal */}
      {isPricingModalOpen && selectedProductForPricing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setIsPricingModalOpen(false)}
          />
          
          {/* Modal Content */}
          <div className={`relative w-full max-w-2xl max-h-[90vh] overflow-hidden rounded-2xl shadow-2xl ${
            theme === 'dark' ? 'bg-slate-900' : 'bg-white'
          }`}>
            {/* Modal Header */}
            <div className={`px-6 py-4 border-b ${theme === 'dark' ? 'border-slate-700' : 'border-slate-200'}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {selectedProductForPricing.image ? (
                    <img 
                      src={selectedProductForPricing.image} 
                      alt={selectedProductForPricing.name}
                      className="w-12 h-12 rounded-xl object-cover"
                    />
                  ) : (
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                      theme === 'dark' ? 'bg-slate-800' : 'bg-slate-100'
                    }`}>
                      {getProductIcon(selectedProductForPricing.category)}
                    </div>
                  )}
                  <div>
                    <h2 className={`text-lg font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                      {selectedProductForPricing.name}
                    </h2>
                    <p className={`text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                      {selectedProductForPricing.brand} • {selectedProductForPricing.category}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setIsPricingModalOpen(false)}
                  className={`p-2 rounded-xl transition-colors ${
                    theme === 'dark' ? 'hover:bg-slate-800 text-slate-400' : 'hover:bg-slate-100 text-slate-500'
                  }`}
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
              {/* Pricing Overview Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                {/* Cost Price */}
                <div className={`p-4 rounded-xl border ${theme === 'dark' ? 'bg-slate-800/50 border-slate-700' : 'bg-amber-50 border-amber-200'}`}>
                  <div className="flex items-center gap-2 mb-2">
                    <ArrowDownCircle className="w-4 h-4 text-amber-500" />
                    <span className={`text-xs font-medium ${theme === 'dark' ? 'text-slate-400' : 'text-amber-700'}`}>Cost Price</span>
                  </div>
                  <p className={`text-xl font-bold ${theme === 'dark' ? 'text-amber-400' : 'text-amber-700'}`}>
                    {formatCurrency(selectedProductForPricing.costPrice || selectedProductForPricing.price * 0.85)}
                  </p>
                </div>

                {/* Selling Price */}
                <div className={`p-4 rounded-xl border ${theme === 'dark' ? 'bg-slate-800/50 border-slate-700' : 'bg-emerald-50 border-emerald-200'}`}>
                  <div className="flex items-center gap-2 mb-2">
                    <ArrowUpCircle className="w-4 h-4 text-emerald-500" />
                    <span className={`text-xs font-medium ${theme === 'dark' ? 'text-slate-400' : 'text-emerald-700'}`}>Selling Price</span>
                  </div>
                  <p className={`text-xl font-bold ${theme === 'dark' ? 'text-emerald-400' : 'text-emerald-700'}`}>
                    {formatCurrency(selectedProductForPricing.sellingPrice || selectedProductForPricing.price)}
                  </p>
                </div>

                {/* Profit Per Unit */}
                <div className={`p-4 rounded-xl border ${theme === 'dark' ? 'bg-slate-800/50 border-slate-700' : 'bg-purple-50 border-purple-200'}`}>
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingUp className="w-4 h-4 text-purple-500" />
                    <span className={`text-xs font-medium ${theme === 'dark' ? 'text-slate-400' : 'text-purple-700'}`}>Profit/Unit</span>
                  </div>
                  <p className={`text-xl font-bold ${theme === 'dark' ? 'text-purple-400' : 'text-purple-700'}`}>
                    {formatCurrency((selectedProductForPricing.sellingPrice || selectedProductForPricing.price) - (selectedProductForPricing.costPrice || selectedProductForPricing.price * 0.85))}
                  </p>
                </div>

                {/* Margin */}
                <div className={`p-4 rounded-xl border ${theme === 'dark' ? 'bg-slate-800/50 border-slate-700' : 'bg-blue-50 border-blue-200'}`}>
                  <div className="flex items-center gap-2 mb-2">
                    <Percent className="w-4 h-4 text-blue-500" />
                    <span className={`text-xs font-medium ${theme === 'dark' ? 'text-slate-400' : 'text-blue-700'}`}>Margin</span>
                  </div>
                  <p className={`text-xl font-bold ${theme === 'dark' ? 'text-blue-400' : 'text-blue-700'}`}>
                    {(selectedProductForPricing.profitMargin || 16.5).toFixed(1)}%
                  </p>
                </div>
              </div>

              {/* Stock Information */}
              <div className={`p-4 rounded-xl border mb-6 ${theme === 'dark' ? 'bg-slate-800/30 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
                <h3 className={`text-sm font-semibold mb-4 ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                  📦 Stock Information
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center">
                    <p className={`text-2xl font-bold ${
                      isLowStock(selectedProductForPricing) ? 'text-red-500' : theme === 'dark' ? 'text-white' : 'text-slate-900'
                    }`}>
                      {selectedProductForPricing.stock}
                    </p>
                    <p className={`text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>Current Stock</p>
                  </div>
                  <div className="text-center">
                    <p className={`text-2xl font-bold ${theme === 'dark' ? 'text-cyan-400' : 'text-cyan-600'}`}>
                      {selectedProductForPricing.totalPurchased || 0}
                    </p>
                    <p className={`text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>Total Purchased</p>
                  </div>
                  <div className="text-center">
                    <p className={`text-2xl font-bold ${theme === 'dark' ? 'text-emerald-400' : 'text-emerald-600'}`}>
                      {selectedProductForPricing.totalSold || 0}
                    </p>
                    <p className={`text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>Total Sold</p>
                  </div>
                  <div className="text-center">
                    <p className={`text-2xl font-bold ${theme === 'dark' ? 'text-amber-400' : 'text-amber-600'}`}>
                      {selectedProductForPricing.lowStockThreshold || 10}
                    </p>
                    <p className={`text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>Low Stock Alert</p>
                  </div>
                </div>
              </div>

              {/* Stock Value Summary */}
              <div className={`p-4 rounded-xl border mb-6 ${theme === 'dark' ? 'bg-gradient-to-r from-slate-800/50 to-emerald-900/20 border-slate-700' : 'bg-gradient-to-r from-slate-50 to-emerald-50 border-slate-200'}`}>
                <h3 className={`text-sm font-semibold mb-4 ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                  💰 Stock Value Summary
                </h3>
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center p-3 rounded-lg bg-white/10">
                    <p className={`text-lg font-bold ${theme === 'dark' ? 'text-amber-400' : 'text-amber-700'}`}>
                      {formatCurrency((selectedProductForPricing.costPrice || selectedProductForPricing.price * 0.85) * selectedProductForPricing.stock)}
                    </p>
                    <p className={`text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>Cost Value</p>
                  </div>
                  <div className="text-center p-3 rounded-lg bg-white/10">
                    <p className={`text-lg font-bold ${theme === 'dark' ? 'text-emerald-400' : 'text-emerald-700'}`}>
                      {formatCurrency((selectedProductForPricing.sellingPrice || selectedProductForPricing.price) * selectedProductForPricing.stock)}
                    </p>
                    <p className={`text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>Retail Value</p>
                  </div>
                  <div className="text-center p-3 rounded-lg bg-white/10">
                    <p className={`text-lg font-bold ${theme === 'dark' ? 'text-purple-400' : 'text-purple-700'}`}>
                      {formatCurrency(((selectedProductForPricing.sellingPrice || selectedProductForPricing.price) - (selectedProductForPricing.costPrice || selectedProductForPricing.price * 0.85)) * selectedProductForPricing.stock)}
                    </p>
                    <p className={`text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>Potential Profit</p>
                  </div>
                </div>
              </div>

              {/* Product Details */}
              <div className={`p-4 rounded-xl border ${theme === 'dark' ? 'bg-slate-800/30 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
                <h3 className={`text-sm font-semibold mb-4 ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                  📋 Product Details
                </h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className={`${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>Serial Number:</span>
                    <span className={`ml-2 font-mono ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>{selectedProductForPricing.serialNumber}</span>
                  </div>
                  {selectedProductForPricing.barcode && (
                    <div>
                      <span className={`${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>Barcode:</span>
                      <span className={`ml-2 font-mono ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>{selectedProductForPricing.barcode}</span>
                    </div>
                  )}
                  {selectedProductForPricing.warranty && (
                    <div>
                      <span className={`${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>Warranty:</span>
                      <span className={`ml-2 ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>{selectedProductForPricing.warranty}</span>
                    </div>
                  )}
                  <div>
                    <span className={`${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>Added:</span>
                    <span className={`ml-2 ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                      {new Date(selectedProductForPricing.createdAt).toLocaleDateString('en-GB', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric'
                      })}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className={`px-6 py-4 border-t ${theme === 'dark' ? 'border-slate-700' : 'border-slate-200'}`}>
              <div className="flex gap-3">
                <button
                  onClick={() => handleViewSalesHistory(selectedProductForPricing)}
                  className={`flex-1 py-2.5 rounded-xl font-medium transition-colors flex items-center justify-center gap-2 ${
                    theme === 'dark'
                      ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                      : 'bg-emerald-500 hover:bg-emerald-600 text-white'
                  }`}
                >
                  <History className="w-4 h-4" />
                  View Sales History
                </button>
                <button
                  onClick={() => setIsPricingModalOpen(false)}
                  className={`flex-1 py-2.5 rounded-xl font-medium transition-colors ${
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
