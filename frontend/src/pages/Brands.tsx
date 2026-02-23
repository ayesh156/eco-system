import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { useIsMobile } from '../hooks/use-mobile';
import { productBrands, mockProducts, brandLogos } from '../data/mockData';
import { brandService } from '../services/brandService';
import { deleteBrandImage, isSupabaseUrl, isSupabaseConfigured } from '../services/brandCategoryImageService';
import { BrandFormModal } from '../components/modals/BrandFormModal';
import type { Brand } from '../components/modals/BrandFormModal';
import { DeleteConfirmationModal } from '../components/modals/DeleteConfirmationModal';
import { 
  Building2, Plus, Edit, Trash2, Search, X, LayoutGrid, List, 
  ArrowDownUp, SortAsc, SortDesc, Calendar, ChevronLeft, ChevronRight,
  ChevronsLeft, ChevronsRight, Package, Image as ImageIcon, Check,
  Loader2, AlertCircle, CheckCircle2, MoreVertical
} from 'lucide-react';

// Extended Brand interface with image and date
interface ExtendedBrand extends Brand {
  image?: string;
  createdAt: string;
  website?: string;
  contactEmail?: string;
  contactPhone?: string;
}

export const Brands: React.FC = () => {
  const { theme } = useTheme();
  const { isViewingShop, viewingShop } = useAuth();
  const isMobile = useIsMobile();
  
  // Get effective shopId for SUPER_ADMIN viewing a shop
  const effectiveShopId = isViewingShop && viewingShop ? viewingShop.id : undefined;
  
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'card' | 'list'>('card');
  const [sortBy, setSortBy] = useState<'name' | 'products' | 'date'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  
  // Date filter states
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [showStartCalendar, setShowStartCalendar] = useState(false);
  const [showEndCalendar, setShowEndCalendar] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState(new Date());
  const startCalendarRef = useRef<HTMLDivElement>(null);
  const endCalendarRef = useRef<HTMLDivElement>(null);
  
  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(12);



  // Convert productBrands to ExtendedBrand objects with counts and dates
  const initialBrands: ExtendedBrand[] = productBrands.map((name, index) => ({
    id: `brand-${index + 1}`,
    name,
    description: `${name} brand products`,
    productCount: mockProducts.filter(p => p.brand === name).length,
    image: brandLogos[name] || '',
    createdAt: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000).toISOString(),
  }));

  // Modal states
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedBrand, setSelectedBrand] = useState<Brand | null>(null);
  const [brandToDelete, setBrandToDelete] = useState<ExtendedBrand | null>(null);
  
  // Local brands state - loads from API
  const [brands, setBrands] = useState<ExtendedBrand[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [apiError, setApiError] = useState<string | null>(null);
  const [highlightedBrandId, setHighlightedBrandId] = useState<string | null>(null);

  // 3-dot action menu state for mobile card view
  const [activeBrandMenu, setActiveBrandMenu] = useState<string | null>(null);
  const brandMenuRef = useRef<HTMLDivElement>(null);

  // Load brands from API
  useEffect(() => {
    const loadBrands = async () => {
      setIsLoading(true);
      setApiError(null);
      
      try {
        const { brands: apiBrands } = await brandService.getAll({ shopId: effectiveShopId });
        const extendedBrands: ExtendedBrand[] = apiBrands.map(brand => ({
          id: brand.id,
          name: brand.name,
          description: brand.description || `${brand.name} brand products`,
          productCount: brand._count?.products || 0,
          image: brand.image || brandLogos[brand.name] || '',
          createdAt: brand.createdAt,
        }));
        setBrands(extendedBrands);
      } catch (error) {
        console.error('Failed to load brands:', error);
        setApiError(error instanceof Error ? error.message : 'Failed to load brands');
        // Fallback to mock data
        setBrands(initialBrands);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadBrands();
  }, [effectiveShopId]);

  // Close calendar when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (startCalendarRef.current && !startCalendarRef.current.contains(event.target as Node)) {
        setShowStartCalendar(false);
      }
      if (endCalendarRef.current && !endCalendarRef.current.contains(event.target as Node)) {
        setShowEndCalendar(false);
      }
      if (brandMenuRef.current && !brandMenuRef.current.contains(event.target as Node)) {
        setActiveBrandMenu(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filtering
  const filteredBrands = useMemo(() => {
    return brands.filter(brand => {
      // Search filter
      if (searchQuery && !brand.name.toLowerCase().includes(searchQuery.toLowerCase())) {
        return false;
      }
      
      // Date filter
      if (startDate) {
        const brandDate = new Date(brand.createdAt);
        const start = new Date(startDate);
        if (brandDate < start) return false;
      }
      if (endDate) {
        const brandDate = new Date(brand.createdAt);
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        if (brandDate > end) return false;
      }
      
      return true;
    });
  }, [brands, searchQuery, startDate, endDate]);

  // Sorting
  const sortedBrands = useMemo(() => {
    return [...filteredBrands].sort((a, b) => {
      let comparison = 0;
      switch (sortBy) {
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'products':
          comparison = a.productCount - b.productCount;
          break;
        case 'date':
          comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
          break;
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });
  }, [filteredBrands, sortBy, sortOrder]);

  // Pagination
  const totalPages = Math.ceil(sortedBrands.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedBrands = sortedBrands.slice(startIndex, endIndex);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, startDate, endDate, sortBy, sortOrder]);

  // Reset items per page when view mode changes
  useEffect(() => {
    setItemsPerPage(viewMode === 'list' ? 10 : 12);
    setCurrentPage(1);
  }, [viewMode]);

  // Generate page numbers
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

  // Calendar helper functions
  const formatDateDisplay = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDay = firstDay.getDay();
    return { daysInMonth, startingDay };
  };

  const renderCalendar = (
    selectedDate: string,
    setSelectedDate: (date: string) => void,
    setShowCalendar: (show: boolean) => void
  ) => {
    const { daysInMonth, startingDay } = getDaysInMonth(calendarMonth);
    const days = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let i = 0; i < startingDay; i++) {
      days.push(<div key={`empty-${i}`} className="w-8 h-8" />);
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth(), day);
      const dateStr = date.toISOString().split('T')[0];
      const isSelected = selectedDate === dateStr;
      const isToday = date.getTime() === today.getTime();

      days.push(
        <button
          key={day}
          onClick={() => {
            setSelectedDate(dateStr);
            setShowCalendar(false);
          }}
          className={`w-8 h-8 rounded-lg text-sm font-medium transition-all ${
            isSelected
              ? 'bg-emerald-500 text-white'
              : isToday
                ? theme === 'dark'
                  ? 'bg-emerald-500/20 text-emerald-400'
                  : 'bg-emerald-100 text-emerald-600'
                : theme === 'dark'
                  ? 'hover:bg-slate-700 text-slate-300'
                  : 'hover:bg-slate-100 text-slate-700'
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
        <div className="flex items-center justify-between mb-3">
          <button
            onClick={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() - 1))}
            className={`p-1.5 rounded-lg ${theme === 'dark' ? 'hover:bg-slate-700 text-white' : 'hover:bg-slate-100'}`}
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className={`text-sm font-medium ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
            {calendarMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
          </span>
          <button
            onClick={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1))}
            className={`p-1.5 rounded-lg ${theme === 'dark' ? 'hover:bg-slate-700 text-white' : 'hover:bg-slate-100'}`}
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
        <div className="grid grid-cols-7 gap-2 mb-2">
          {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(day => (
            <div key={day} className={`w-8 h-6 flex items-center justify-center text-xs font-medium ${
              theme === 'dark' ? 'text-slate-500' : 'text-slate-400'
            }`}>
              {day}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-2">{days}</div>
      </div>
      </>
    );
  };

  const clearFilters = () => {
    setSearchQuery('');
    setStartDate('');
    setEndDate('');
  };

  const hasActiveFilters = searchQuery || startDate || endDate;

  // Handlers
  const handleAddBrand = () => {
    setSelectedBrand(null);
    setIsFormModalOpen(true);
  };

  const handleEditBrand = (brand: ExtendedBrand) => {
    setSelectedBrand(brand);
    setIsFormModalOpen(true);
  };

  const handleDeleteClick = (brand: ExtendedBrand) => {
    setBrandToDelete(brand);
    setIsDeleteModalOpen(true);
  };

  // Function to get Clearbit logo URL for a brand name
  const getBrandLogoUrl = (brandName: string): string => {
    // Check if we have a predefined logo
    if (brandLogos[brandName]) {
      return brandLogos[brandName];
    }
    // Try to generate a Clearbit URL from the brand name
    const sanitizedName = brandName.toLowerCase().replace(/[^a-z0-9]/g, '');
    return `https://logo.clearbit.com/${sanitizedName}.com`;
  };

  const handleSaveBrand = async (brand: Brand) => {
    try {
      // Clean empty strings to undefined so backend optional validators work correctly
      const cleanData = {
        name: brand.name,
        description: brand.description || undefined,
        website: (brand as any).website || undefined,
        contactEmail: (brand as any).contactEmail || undefined,
        contactPhone: (brand as any).contactPhone || undefined,
        image: brand.image || undefined,
      };

      if (selectedBrand) {
        // Update existing brand
        const updated = await brandService.update(brand.id, cleanData, effectiveShopId);
        setBrands(prev => prev.map(b => b.id === brand.id ? {
          ...b,
          name: updated.name,
          description: updated.description || b.description,
          image: updated.image || brand.image || b.image,  // Use modal image as fallback for immediate UI update
          productCount: updated._count?.products ?? b.productCount,
          website: updated.website || (b as any).website,
          contactEmail: (updated as any).contactEmail || (b as any).contactEmail,
          contactPhone: (updated as any).contactPhone || (b as any).contactPhone,
        } : b));
        setHighlightedBrandId(brand.id);
      } else {
        // Create new brand
        const created = await brandService.create(cleanData, effectiveShopId);
        const logoUrl = created.image || getBrandLogoUrl(brand.name);
        const newBrand: ExtendedBrand = {
          id: created.id,
          name: created.name,
          description: created.description || `${created.name} brand products`,
          productCount: 0,
          image: logoUrl,
          createdAt: created.createdAt,
          website: (created as any).website,
          contactEmail: (created as any).contactEmail,
          contactPhone: (created as any).contactPhone,
        };
        setBrands(prev => [newBrand, ...prev]);
        setHighlightedBrandId(created.id);
      }
      // Clear highlight after 5 seconds
      setTimeout(() => setHighlightedBrandId(null), 5000);
    } catch (error) {
      console.error('Failed to save brand:', error);
      setApiError(error instanceof Error ? error.message : 'Failed to save brand');
    }
  };

  const handleConfirmDelete = async () => {
    if (brandToDelete) {
      try {
        // Delete brand image from Supabase if it exists
        if (brandToDelete.image && isSupabaseUrl(brandToDelete.image) && isSupabaseConfigured()) {
          console.log('🗑️ Deleting brand image from Supabase:', brandToDelete.image);
          await deleteBrandImage(brandToDelete.image);
        }
        await brandService.delete(brandToDelete.id, effectiveShopId);
        setBrands(prev => prev.filter(b => b.id !== brandToDelete.id));
      } catch (error) {
        console.error('Failed to delete brand:', error);
        setApiError(error instanceof Error ? error.message : 'Failed to delete brand');
        // Still remove from UI for demo
        setBrands(prev => prev.filter(b => b.id !== brandToDelete.id));
      }
      setIsDeleteModalOpen(false);
      setBrandToDelete(null);
    }
  };

  // Helper to get a brand logo from the local fallback map (case-insensitive)
  const getBrandFallbackLogo = (name: string): string => {
    // Try exact match first
    if (brandLogos[name]) return brandLogos[name];
    // Try case-insensitive match
    const lowerName = name.toLowerCase();
    for (const key of Object.keys(brandLogos)) {
      if (key.toLowerCase() === lowerName) return brandLogos[key];
    }
    return '';
  };

  // Render brand image or fallback
  const renderBrandImage = (brand: ExtendedBrand, size: 'sm' | 'md' | 'lg' = 'md') => {
    const sizeClasses = {
      sm: 'w-8 h-8',
      md: 'w-12 h-12',
      lg: 'w-16 h-16'
    };

    // Try brand.image first, then brandLogos fallback
    const imageUrl = brand.image || getBrandFallbackLogo(brand.name);

    if (imageUrl) {
      return (
        <div className={`${sizeClasses[size]} rounded-xl overflow-hidden bg-white flex items-center justify-center border ${
          theme === 'dark' ? 'border-slate-700' : 'border-slate-200'
        }`}>
          <img 
            key={imageUrl}
            src={imageUrl} 
            alt={brand.name}
            className="w-full h-full object-contain p-1"
            crossOrigin="anonymous"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none';
              (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden');
            }}
          />
          <Building2 className="w-6 h-6 text-emerald-500 hidden" />
        </div>
      );
    }

    return (
      <div className={`${sizeClasses[size]} rounded-xl ${theme === 'dark' ? 'bg-emerald-500/10' : 'bg-emerald-50'} flex items-center justify-center`}>
        <Building2 className="w-6 h-6 text-emerald-500" />
      </div>
    );
  };

  // Loading state - World-class skeleton UI
  if (isLoading) {
    return (
      <div className="space-y-6 animate-in fade-in duration-300">
        {/* Header Skeleton */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className={`text-2xl lg:text-3xl font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
              Brands
            </h1>
            <p className={`mt-1 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
              Loading brands...
            </p>
          </div>
          <div className={`w-32 h-10 rounded-xl animate-pulse ${theme === 'dark' ? 'bg-slate-700' : 'bg-slate-200'}`}></div>
        </div>

        {/* Stats Skeleton */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className={`p-4 rounded-2xl border ${theme === 'dark' ? 'bg-slate-800/30 border-slate-700/50' : 'bg-white border-slate-200'}`}>
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl animate-pulse ${theme === 'dark' ? 'bg-slate-700' : 'bg-slate-200'}`}></div>
                <div className="flex-1 space-y-2">
                  <div className={`h-3 w-20 rounded animate-pulse ${theme === 'dark' ? 'bg-slate-700' : 'bg-slate-200'}`}></div>
                  <div className={`h-6 w-12 rounded animate-pulse ${theme === 'dark' ? 'bg-slate-700' : 'bg-slate-200'}`}></div>
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
            <div className="ml-auto flex gap-2">
              <div className={`h-10 w-10 rounded-xl animate-pulse ${theme === 'dark' ? 'bg-slate-700' : 'bg-slate-200'}`}></div>
              <div className={`h-10 w-10 rounded-xl animate-pulse ${theme === 'dark' ? 'bg-slate-700' : 'bg-slate-200'}`}></div>
            </div>
          </div>
        </div>

        {/* Brand Cards Skeleton */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((i) => (
            <div key={i} className={`relative p-4 rounded-2xl border overflow-hidden text-center ${
              theme === 'dark' ? 'bg-slate-800/30 border-slate-700/50' : 'bg-white border-slate-200'
            }`}>
              {/* Shimmer Effect */}
              <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/10 to-transparent"></div>
              
              {/* Brand Logo */}
              <div className={`w-16 h-16 mx-auto rounded-xl mb-3 animate-pulse ${theme === 'dark' ? 'bg-slate-700' : 'bg-slate-200'}`}></div>
              
              {/* Brand Name */}
              <div className={`h-5 w-20 mx-auto rounded animate-pulse mb-2 ${theme === 'dark' ? 'bg-slate-700' : 'bg-slate-200'}`}></div>
              
              {/* Product Count */}
              <div className={`h-4 w-16 mx-auto rounded animate-pulse ${theme === 'dark' ? 'bg-slate-700' : 'bg-slate-200'}`}></div>
            </div>
          ))}
        </div>

        {/* Loading Indicator */}
        <div className="flex items-center justify-center py-4">
          <div className="flex items-center gap-3">
            <Loader2 className={`w-5 h-5 animate-spin ${theme === 'dark' ? 'text-emerald-400' : 'text-emerald-500'}`} />
            <span className={`text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
              Fetching brands from server...
            </span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* API Error Alert */}
      {apiError && (
        <div className={`flex items-center gap-3 p-4 rounded-xl border ${
          theme === 'dark' 
            ? 'bg-red-500/10 border-red-500/30 text-red-400' 
            : 'bg-red-50 border-red-200 text-red-600'
        }`}>
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <div>
            <p className="font-medium">Failed to load from database</p>
            <p className="text-sm opacity-80">{apiError}. Showing local data.</p>
          </div>
        </div>
      )}

      {/* Success Banner for highlighted brand */}
      {highlightedBrandId && (
        <div className={`flex items-center gap-3 p-4 rounded-xl border ${
          theme === 'dark' 
            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' 
            : 'bg-emerald-50 border-emerald-200 text-emerald-600'
        }`}>
          <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
          <p className="font-medium">Brand saved successfully!</p>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
        <div>
          <h1 className={`text-xl sm:text-2xl lg:text-3xl font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
            Brands
          </h1>
          <p className={`text-xs sm:text-sm mt-0.5 sm:mt-1 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
            Manage product brands
          </p>
        </div>
        <button 
          onClick={handleAddBrand}
          className="flex items-center justify-center gap-2 px-3 sm:px-4 py-2 sm:py-2.5 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-xl text-sm sm:text-base font-medium hover:opacity-90 transition-opacity shadow-lg shadow-emerald-500/20"
        >
          <Plus className="w-4 h-4 sm:w-5 sm:h-5" />
          Add Brand
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4">
        <div className={`rounded-xl sm:rounded-2xl border p-3 sm:p-4 ${
          theme === 'dark' ? 'bg-slate-800/30 border-slate-700/50' : 'bg-white border-slate-200'
        }`}>
          <div className="flex items-center gap-2 sm:gap-3">
            <div className={`p-2 sm:p-2.5 rounded-lg sm:rounded-xl ${theme === 'dark' ? 'bg-emerald-500/10' : 'bg-emerald-50'}`}>
              <Building2 className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-500" />
            </div>
            <div>
              <p className={`text-[10px] sm:text-xs font-medium ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>Total Brands</p>
              <p className="text-base sm:text-lg font-bold text-emerald-500">{brands.length}</p>
            </div>
          </div>
        </div>
        <div className={`rounded-xl sm:rounded-2xl border p-3 sm:p-4 ${
          theme === 'dark' ? 'bg-slate-800/30 border-slate-700/50' : 'bg-white border-slate-200'
        }`}>
          <div className="flex items-center gap-2 sm:gap-3">
            <div className={`p-2 sm:p-2.5 rounded-lg sm:rounded-xl ${theme === 'dark' ? 'bg-blue-500/10' : 'bg-blue-50'}`}>
              <Package className="w-4 h-4 sm:w-5 sm:h-5 text-blue-500" />
            </div>
            <div>
              <p className={`text-[10px] sm:text-xs font-medium ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>Total Products</p>
              <p className="text-base sm:text-lg font-bold text-blue-500">{brands.reduce((sum, b) => sum + b.productCount, 0)}</p>
            </div>
          </div>
        </div>
        <div className={`rounded-xl sm:rounded-2xl border p-3 sm:p-4 ${
          theme === 'dark' ? 'bg-slate-800/30 border-slate-700/50' : 'bg-white border-slate-200'
        }`}>
          <div className="flex items-center gap-2 sm:gap-3">
            <div className={`p-2 sm:p-2.5 rounded-lg sm:rounded-xl ${theme === 'dark' ? 'bg-amber-500/10' : 'bg-amber-50'}`}>
              <ImageIcon className="w-4 h-4 sm:w-5 sm:h-5 text-amber-500" />
            </div>
            <div>
              <p className={`text-[10px] sm:text-xs font-medium ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>With Logo</p>
              <p className="text-base sm:text-lg font-bold text-amber-500">{brands.filter(b => b.image).length}</p>
            </div>
          </div>
        </div>
        <div className={`rounded-xl sm:rounded-2xl border p-3 sm:p-4 ${
          theme === 'dark' ? 'bg-slate-800/30 border-slate-700/50' : 'bg-white border-slate-200'
        }`}>
          <div className="flex items-center gap-2 sm:gap-3">
            <div className={`p-2 sm:p-2.5 rounded-lg sm:rounded-xl ${theme === 'dark' ? 'bg-violet-500/10' : 'bg-violet-50'}`}>
              <Check className="w-4 h-4 sm:w-5 sm:h-5 text-violet-500" />
            </div>
            <div>
              <p className={`text-[10px] sm:text-xs font-medium ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>Active</p>
              <p className="text-base sm:text-lg font-bold text-violet-500">{brands.filter(b => b.productCount > 0).length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className={`p-2.5 sm:p-3 md:p-4 rounded-xl sm:rounded-2xl border ${
        theme === 'dark' ? 'bg-slate-800/30 border-slate-700/50' : 'bg-white border-slate-200'
      }`}>
        <div className="flex flex-col lg:flex-row gap-2 sm:gap-3">
          {/* Search Input */}
          <div className={`flex items-center gap-2 px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-lg sm:rounded-xl border flex-1 ${
            theme === 'dark' ? 'bg-slate-800/50 border-slate-700/50' : 'bg-slate-50 border-slate-200'
          }`}>
            <Search className={`w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0 ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`} />
            <input
              type="text"
              placeholder="Search brands..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`bg-transparent border-none outline-none flex-1 min-w-0 text-xs sm:text-sm ${
                theme === 'dark' ? 'text-white placeholder-slate-500' : 'text-slate-900 placeholder-slate-400'
              }`}
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="text-slate-400 hover:text-slate-600">
                <X className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </button>
            )}
          </div>

          {/* Filters Row */}
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
            {/* Date Range */}
            <div className="flex items-center gap-1.5 sm:gap-2">
              <Calendar className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${theme === 'dark' ? 'text-emerald-500' : 'text-emerald-600'}`} />
              <div className="relative" ref={startCalendarRef}>
                <button
                  onClick={() => {
                    setShowStartCalendar(!showStartCalendar);
                    setShowEndCalendar(false);
                    setCalendarMonth(startDate ? new Date(startDate) : new Date());
                  }}
                  className={`px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg sm:rounded-xl border text-[10px] sm:text-sm min-w-[70px] sm:min-w-[100px] text-left ${
                    theme === 'dark' 
                      ? 'bg-slate-800/50 border-slate-700/50 text-white hover:bg-slate-700/50' 
                      : 'bg-slate-50 border-slate-200 text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  {startDate ? formatDateDisplay(startDate) : 'From'}
                </button>
                {showStartCalendar && renderCalendar(startDate, setStartDate, setShowStartCalendar)}
              </div>
              <span className={`text-xs ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>-</span>
              <div className="relative" ref={endCalendarRef}>
                <button
                  onClick={() => {
                    setShowEndCalendar(!showEndCalendar);
                    setShowStartCalendar(false);
                    setCalendarMonth(endDate ? new Date(endDate) : new Date());
                  }}
                  className={`px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg sm:rounded-xl border text-[10px] sm:text-sm min-w-[70px] sm:min-w-[100px] text-left ${
                    theme === 'dark' 
                      ? 'bg-slate-800/50 border-slate-700/50 text-white hover:bg-slate-700/50' 
                      : 'bg-slate-50 border-slate-200 text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  {endDate ? formatDateDisplay(endDate) : 'To'}
                </button>
                {showEndCalendar && renderCalendar(endDate, setEndDate, setShowEndCalendar)}
              </div>
            </div>

            {/* Sort Button */}
            <button
              onClick={() => {
                const nextSort = sortBy === 'name' ? 'products' : sortBy === 'products' ? 'date' : 'name';
                setSortBy(nextSort);
              }}
              className={`flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg sm:rounded-xl border transition-colors text-[10px] sm:text-sm ${
                theme === 'dark' 
                  ? 'border-slate-700 hover:bg-slate-800 text-slate-300' 
                  : 'border-slate-200 hover:bg-slate-50 text-slate-700'
              }`}
              title="Sort by"
            >
              <ArrowDownUp className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span className="capitalize">{sortBy}</span>
            </button>

            {/* Sort Order Toggle */}
            <button
              onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
              className={`p-1.5 sm:p-2 rounded-lg sm:rounded-xl border transition-colors ${
                theme === 'dark' ? 'border-slate-700 hover:bg-slate-800 text-slate-400' : 'border-slate-200 hover:bg-slate-50 text-slate-600'
              }`}
              title={sortOrder === 'asc' ? 'Ascending' : 'Descending'}
            >
              {sortOrder === 'asc' ? <SortAsc className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> : <SortDesc className="w-3.5 h-3.5 sm:w-4 sm:h-4" />}
            </button>

            {/* View Mode Toggle */}
            <div className={`flex items-center rounded-lg sm:rounded-xl overflow-hidden border ${
              theme === 'dark' ? 'border-slate-700' : 'border-slate-200'
            }`}>
              <button
                onClick={() => setViewMode('card')}
                className={`p-1.5 sm:p-2 transition-colors ${
                  viewMode === 'card'
                    ? 'bg-emerald-500 text-white'
                    : theme === 'dark'
                      ? 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                      : 'bg-white hover:bg-slate-100 text-slate-700'
                }`}
                title="Card view"
              >
                <LayoutGrid className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-1.5 sm:p-2 transition-colors ${
                  viewMode === 'list'
                    ? 'bg-emerald-500 text-white'
                    : theme === 'dark'
                      ? 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                      : 'bg-white hover:bg-slate-100 text-slate-700'
                }`}
                title="List view"
              >
                <List className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </button>
            </div>

            {/* Clear Filters */}
            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className={`flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg sm:rounded-xl text-[10px] sm:text-sm font-medium transition-colors ${
                  theme === 'dark'
                    ? 'bg-red-500/10 hover:bg-red-500/20 text-red-400'
                    : 'bg-red-50 hover:bg-red-100 text-red-600'
                }`}
              >
                <X className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                Clear
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Brands Display */}
      {viewMode === 'list' ? (
        /* Table View - Desktop table, Mobile card rows */
        <div className={`rounded-xl sm:rounded-2xl border overflow-hidden ${
          theme === 'dark' ? 'bg-slate-800/30 border-slate-700/50' : 'bg-white border-slate-200'
        }`}>
          {/* Desktop Table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className={`border-b ${theme === 'dark' ? 'border-slate-700/50' : 'border-slate-200'}`}>
                  <th className={`text-left px-4 py-3 text-xs font-semibold ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                    Brand
                  </th>
                  <th className={`text-left px-4 py-3 text-xs font-semibold ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                    Description
                  </th>
                  <th className={`text-left px-4 py-3 text-xs font-semibold ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                    Website
                  </th>
                  <th className={`text-left px-4 py-3 text-xs font-semibold ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                    Contact Email
                  </th>
                  <th className={`text-left px-4 py-3 text-xs font-semibold ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                    Contact Phone
                  </th>
                  <th className={`text-center px-4 py-3 text-xs font-semibold ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                    Products
                  </th>
                  <th className={`text-left px-4 py-3 text-xs font-semibold ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                    Created
                  </th>
                  <th className={`text-right px-4 py-3 text-xs font-semibold ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {paginatedBrands.map((brand) => (
                  <tr 
                    key={brand.id}
                    className={`border-b transition-colors ${
                      highlightedBrandId === brand.id
                        ? theme === 'dark' 
                          ? 'bg-emerald-900/30 border-emerald-500/30 ring-1 ring-inset ring-emerald-500/30' 
                          : 'bg-emerald-50 border-emerald-200 ring-1 ring-inset ring-emerald-300'
                        : theme === 'dark' 
                          ? 'border-slate-700/30 hover:bg-slate-800/30' 
                          : 'border-slate-100 hover:bg-slate-50'
                    }`}
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        {renderBrandImage(brand, 'sm')}
                        <div className="flex items-center gap-2">
                          <span className={`font-medium ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                            {brand.name}
                          </span>
                          {highlightedBrandId === brand.id && (
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                              theme === 'dark' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-emerald-100 text-emerald-600'
                            }`}>
                              <CheckCircle2 className="w-3 h-3" />
                              Saved!
                            </span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className={`px-4 py-3 text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                      {brand.description || '-'}
                    </td>
                    <td className={`px-4 py-3 text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                      {(brand as any).website ? (
                        <a href={(brand as any).website} target="_blank" rel="noopener noreferrer" className="text-emerald-500 hover:text-emerald-600 underline">
                          {(brand as any).website}
                        </a>
                      ) : '-'}
                    </td>
                    <td className={`px-4 py-3 text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                      {(brand as any).contactEmail || '-'}
                    </td>
                    <td className={`px-4 py-3 text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                      {(brand as any).contactPhone || '-'}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        brand.productCount > 0
                          ? theme === 'dark' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-emerald-50 text-emerald-600'
                          : theme === 'dark' ? 'bg-slate-700 text-slate-400' : 'bg-slate-100 text-slate-600'
                      }`}>
                        {brand.productCount}
                      </span>
                    </td>
                    <td className={`px-4 py-3 text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                      {new Date(brand.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => handleEditBrand(brand)} className={`p-2 rounded-xl transition-colors ${theme === 'dark' ? 'hover:bg-slate-700 text-slate-400' : 'hover:bg-slate-100 text-slate-600'}`} title="Edit">
                          <Edit className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleDeleteClick(brand)} className={`p-2 rounded-xl transition-colors ${theme === 'dark' ? 'hover:bg-red-500/10 text-red-400' : 'hover:bg-red-50 text-red-500'}`} title="Delete">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile List View - Compact card rows */}
          <div className={`md:hidden divide-y ${
            theme === 'dark' ? 'divide-slate-700/50' : 'divide-slate-200'
          }`}>
            {paginatedBrands.map((brand) => (
              <div 
                key={brand.id}
                className={`flex items-center gap-2.5 p-3 transition-colors ${
                  highlightedBrandId === brand.id
                    ? theme === 'dark' ? 'bg-emerald-900/30' : 'bg-emerald-50'
                    : theme === 'dark' ? 'hover:bg-slate-800/30' : 'hover:bg-slate-50'
                }`}
              >
                {/* Logo */}
                <div className="flex-shrink-0">
                  {renderBrandImage(brand, 'sm')}
                </div>
                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className={`font-medium text-sm truncate ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                      {brand.name}
                    </span>
                    {highlightedBrandId === brand.id && (
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className={`text-[10px] ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>
                      {brand.productCount} products
                    </span>
                    <span className={`text-[10px] ${theme === 'dark' ? 'text-slate-600' : 'text-slate-300'}`}>•</span>
                    <span className={`text-[10px] ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>
                      {new Date(brand.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
                    </span>
                  </div>
                </div>
                {/* Actions */}
                <div className="flex items-center gap-0.5 flex-shrink-0">
                  <button onClick={() => handleEditBrand(brand)} className={`p-1.5 rounded-lg transition-colors ${theme === 'dark' ? 'hover:bg-slate-700 text-slate-400' : 'hover:bg-slate-100 text-slate-600'}`}>
                    <Edit className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => handleDeleteClick(brand)} className={`p-1.5 rounded-lg transition-colors ${theme === 'dark' ? 'hover:bg-red-500/10 text-red-400' : 'hover:bg-red-50 text-red-500'}`}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        /* Card View - Creative responsive grid with 3-dot action menus */
        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5 sm:gap-3 md:gap-4">
          {paginatedBrands.map((brand) => (
            <div 
              key={brand.id}
              className={`group relative rounded-xl sm:rounded-2xl border p-3 sm:p-4 md:p-5 transition-all hover:shadow-lg ${
                highlightedBrandId === brand.id
                  ? theme === 'dark'
                    ? 'bg-emerald-900/30 border-emerald-500/50 ring-2 ring-emerald-500/30'
                    : 'bg-emerald-50 border-emerald-400 ring-2 ring-emerald-300'
                  : theme === 'dark' 
                    ? 'bg-slate-800/30 border-slate-700/50 hover:border-emerald-500/30' 
                    : 'bg-white border-slate-200 hover:border-emerald-500/50'
              }`}
            >
              {/* Highlight badge */}
              {highlightedBrandId === brand.id && (
                <div className="mb-2 sm:mb-3 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3 sm:w-4 sm:h-4 text-emerald-500" />
                  <span className={`text-[10px] sm:text-xs font-semibold ${theme === 'dark' ? 'text-emerald-400' : 'text-emerald-600'}`}>
                    Saved!
                  </span>
                </div>
              )}

              {/* Top row: Logo + 3-dot menu */}
              <div className="flex items-start justify-between mb-2.5 sm:mb-4">
                <div>
                  {renderBrandImage(brand, isMobile ? 'sm' : 'lg')}
                </div>
                {/* 3-dot menu button */}
                <div className="relative" ref={activeBrandMenu === brand.id ? brandMenuRef : null}>
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveBrandMenu(activeBrandMenu === brand.id ? null : brand.id);
                    }}
                    className={`p-1 sm:p-1.5 rounded-lg transition-all ${
                      activeBrandMenu === brand.id
                        ? theme === 'dark' ? 'bg-slate-700 text-white' : 'bg-slate-200 text-slate-900'
                        : theme === 'dark' 
                          ? 'text-slate-500 hover:text-slate-300 hover:bg-slate-700/50 md:opacity-0 md:group-hover:opacity-100' 
                          : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100 md:opacity-0 md:group-hover:opacity-100'
                    }`}
                  >
                    <MoreVertical className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  </button>
                  {/* Dropdown menu */}
                  {activeBrandMenu === brand.id && (
                    <div className={`absolute right-0 top-full mt-1 w-32 sm:w-36 rounded-xl border shadow-xl z-20 overflow-hidden ${
                      theme === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'
                    }`}>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveBrandMenu(null);
                          handleEditBrand(brand);
                        }}
                        className={`w-full flex items-center gap-2 px-3 py-2 text-xs sm:text-sm transition-colors ${
                          theme === 'dark' ? 'text-slate-300 hover:bg-slate-700' : 'text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        <Edit className="w-3.5 h-3.5" />
                        Edit Brand
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveBrandMenu(null);
                          handleDeleteClick(brand);
                        }}
                        className={`w-full flex items-center gap-2 px-3 py-2 text-xs sm:text-sm transition-colors ${
                          theme === 'dark' ? 'text-red-400 hover:bg-red-500/10' : 'text-red-500 hover:bg-red-50'
                        }`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        Delete
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Brand info */}
              <h3 className={`font-semibold text-xs sm:text-sm md:text-base truncate ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                {brand.name}
              </h3>
              <div className="flex items-center gap-1.5 mt-1 sm:mt-1.5">
                <Package className={`w-3 h-3 sm:w-3.5 sm:h-3.5 flex-shrink-0 ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`} />
                <span className={`text-[10px] sm:text-xs md:text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                  {brand.productCount} products
                </span>
              </div>
              <p className={`text-[10px] sm:text-xs mt-1.5 sm:mt-2 ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>
                {new Date(brand.createdAt).toLocaleDateString('en-GB', {
                  day: '2-digit',
                  month: 'short',
                  year: 'numeric'
                })}
              </p>

              {/* Quick action bar - always visible on mobile, hover on desktop */}
              <div className={`mt-2.5 sm:mt-3 pt-2 sm:pt-2.5 border-t flex items-center gap-1 md:opacity-0 md:group-hover:opacity-100 transition-opacity ${
                theme === 'dark' ? 'border-slate-700/50' : 'border-slate-200'
              }`}>
                <button
                  onClick={() => handleEditBrand(brand)}
                  className={`flex-1 flex items-center justify-center gap-1 py-1 sm:py-1.5 rounded-lg text-[10px] sm:text-xs font-medium transition-colors ${
                    theme === 'dark' 
                      ? 'text-slate-300 hover:bg-slate-700/50 hover:text-emerald-400' 
                      : 'text-slate-600 hover:bg-slate-100 hover:text-emerald-600'
                  }`}
                >
                  <Edit className="w-3 h-3" />
                  Edit
                </button>
                <div className={`w-px h-4 ${theme === 'dark' ? 'bg-slate-700' : 'bg-slate-200'}`} />
                <button
                  onClick={() => handleDeleteClick(brand)}
                  className={`flex-1 flex items-center justify-center gap-1 py-1 sm:py-1.5 rounded-lg text-[10px] sm:text-xs font-medium transition-colors ${
                    theme === 'dark' 
                      ? 'text-slate-300 hover:bg-red-500/10 hover:text-red-400' 
                      : 'text-slate-600 hover:bg-red-50 hover:text-red-500'
                  }`}
                >
                  <Trash2 className="w-3 h-3" />
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {sortedBrands.length > 0 && (
        <div className={`p-2.5 sm:p-4 rounded-xl sm:rounded-2xl border ${
          theme === 'dark' ? 'bg-slate-800/30 border-slate-700/50' : 'bg-white border-slate-200'
        }`}>
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4">
            {/* Results Info */}
            <div className="flex items-center gap-2 sm:gap-4 flex-wrap justify-center">
              <p className={`text-[10px] sm:text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                <span className="font-medium">{startIndex + 1}</span>-<span className="font-medium">{Math.min(endIndex, sortedBrands.length)}</span> of <span className="font-medium">{sortedBrands.length}</span>
              </p>
              
              {/* Items Per Page Selector */}
              <div className="flex items-center gap-1.5 sm:gap-2">
                <span className={`text-[10px] sm:text-sm ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>Show:</span>
                <div className={`flex items-center rounded-full p-0.5 ${
                  theme === 'dark' ? 'bg-slate-800' : 'bg-slate-100'
                }`}>
                  {(viewMode === 'list' ? [5, 10, 20] : [6, 12, 24]).map((num) => (
                    <button
                      key={num}
                      onClick={() => {
                        setItemsPerPage(num);
                        setCurrentPage(1);
                      }}
                      className={`px-2 sm:px-3 py-0.5 sm:py-1 rounded-full text-[10px] sm:text-sm font-medium transition-all ${
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
              <div className="flex items-center gap-0.5 sm:gap-1">
                <button
                  onClick={() => setCurrentPage(1)}
                  disabled={currentPage === 1}
                  className={`p-1.5 sm:p-2 rounded-lg transition-colors ${
                    currentPage === 1
                      ? theme === 'dark' ? 'text-slate-600 cursor-not-allowed' : 'text-slate-300 cursor-not-allowed'
                      : theme === 'dark' ? 'hover:bg-slate-700 text-slate-400' : 'hover:bg-slate-100 text-slate-600'
                  }`}
                >
                  <ChevronsLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </button>
                <button
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className={`p-1.5 sm:p-2 rounded-lg transition-colors ${
                    currentPage === 1
                      ? theme === 'dark' ? 'text-slate-600 cursor-not-allowed' : 'text-slate-300 cursor-not-allowed'
                      : theme === 'dark' ? 'hover:bg-slate-700 text-slate-400' : 'hover:bg-slate-100 text-slate-600'
                  }`}
                >
                  <ChevronLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </button>

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
                        className={`w-8 h-8 sm:w-9 sm:h-9 rounded-lg text-xs sm:text-sm font-medium transition-all ${
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

                <div className={`sm:hidden px-2.5 py-0.5 rounded-lg text-[10px] font-medium ${
                  theme === 'dark' ? 'bg-slate-700 text-slate-300' : 'bg-slate-100 text-slate-700'
                }`}>
                  {currentPage}/{totalPages}
                </div>

                <button
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className={`p-1.5 sm:p-2 rounded-lg transition-colors ${
                    currentPage === totalPages
                      ? theme === 'dark' ? 'text-slate-600 cursor-not-allowed' : 'text-slate-300 cursor-not-allowed'
                      : theme === 'dark' ? 'hover:bg-slate-700 text-slate-400' : 'hover:bg-slate-100 text-slate-600'
                  }`}
                >
                  <ChevronRight className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </button>
                <button
                  onClick={() => setCurrentPage(totalPages)}
                  disabled={currentPage === totalPages}
                  className={`p-1.5 sm:p-2 rounded-lg transition-colors ${
                    currentPage === totalPages
                      ? theme === 'dark' ? 'text-slate-600 cursor-not-allowed' : 'text-slate-300 cursor-not-allowed'
                      : theme === 'dark' ? 'hover:bg-slate-700 text-slate-400' : 'hover:bg-slate-100 text-slate-600'
                  }`}
                >
                  <ChevronsRight className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Empty State */}
      {paginatedBrands.length === 0 && (
        <div className={`text-center py-10 sm:py-16 rounded-xl sm:rounded-2xl border ${
          theme === 'dark' ? 'bg-slate-800/30 border-slate-700/50' : 'bg-white border-slate-200'
        }`}>
          <div className={`w-14 h-14 sm:w-20 sm:h-20 mx-auto mb-3 sm:mb-4 rounded-xl sm:rounded-2xl flex items-center justify-center ${
            theme === 'dark' ? 'bg-gradient-to-br from-emerald-500/20 to-teal-500/20' : 'bg-gradient-to-br from-emerald-50 to-teal-50'
          }`}>
            <Building2 className={`w-7 h-7 sm:w-10 sm:h-10 ${theme === 'dark' ? 'text-emerald-400' : 'text-emerald-500'}`} />
          </div>
          <h3 className={`text-base sm:text-xl font-bold mb-1.5 sm:mb-2 ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
            No brands found
          </h3>
          <p className={`text-xs sm:text-base mb-4 sm:mb-6 max-w-sm mx-auto px-4 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
            {hasActiveFilters 
              ? 'Try adjusting your search or filter criteria'
              : 'Get started by adding your first brand'}
          </p>
          {hasActiveFilters ? (
            <button 
              onClick={() => {
                setSearchQuery('');
                setStartDate('');
                setEndDate('');
              }}
              className="px-4 sm:px-6 py-2 sm:py-2.5 text-sm sm:text-base bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-xl font-medium hover:opacity-90 transition-all shadow-lg shadow-emerald-500/20"
            >
              Clear All Filters
            </button>
          ) : (
            <button 
              onClick={handleAddBrand}
              className="px-4 sm:px-6 py-2 sm:py-2.5 text-sm sm:text-base bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-xl font-medium hover:opacity-90 transition-all shadow-lg shadow-emerald-500/20 flex items-center gap-2 mx-auto"
            >
              <Plus className="w-4 h-4 sm:w-5 sm:h-5" />
              Add First Brand
            </button>
          )}
        </div>
      )}

      {/* Modals */}
      <BrandFormModal
        isOpen={isFormModalOpen}
        brand={selectedBrand}
        onClose={() => setIsFormModalOpen(false)}
        onSave={handleSaveBrand}
        shopId={effectiveShopId}
      />

      <DeleteConfirmationModal
        isOpen={isDeleteModalOpen}
        title="Delete Brand"
        message="Are you sure you want to delete this brand? Products with this brand will need to be reassigned."
        itemName={brandToDelete?.name}
        onConfirm={handleConfirmDelete}
        onCancel={() => setIsDeleteModalOpen(false)}
      />
    </div>
  );
};
