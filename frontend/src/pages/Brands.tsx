import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { productBrands, mockProducts, brandLogos } from '../data/mockData';
import { BrandFormModal } from '../components/modals/BrandFormModal';
import type { Brand } from '../components/modals/BrandFormModal';
import { DeleteConfirmationModal } from '../components/modals/DeleteConfirmationModal';
import { 
  Building2, Plus, Edit, Trash2, Search, X, LayoutGrid, List, 
  ArrowDownUp, SortAsc, SortDesc, Calendar, ChevronLeft, ChevronRight,
  ChevronsLeft, ChevronsRight, Package, Image as ImageIcon, Check
} from 'lucide-react';

// Extended Brand interface with image and date
interface ExtendedBrand extends Brand {
  image?: string;
  createdAt: string;
}

export const Brands: React.FC = () => {
  const { theme } = useTheme();
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'card' | 'list'>('card');
  const [sortBy, setSortBy] = useState<'name' | 'products' | 'date'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  
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
  
  // Local brands state for demo
  const [brands, setBrands] = useState<ExtendedBrand[]>(initialBrands);

  // Close calendar when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (startCalendarRef.current && !startCalendarRef.current.contains(event.target as Node)) {
        setShowStartCalendar(false);
      }
      if (endCalendarRef.current && !endCalendarRef.current.contains(event.target as Node)) {
        setShowEndCalendar(false);
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
      <div className={`absolute top-full left-0 mt-2 p-4 rounded-xl border shadow-xl z-50 min-w-[280px] ${
        theme === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'
      }`}>
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

  const handleSaveBrand = (brand: Brand) => {
    if (selectedBrand) {
      setBrands(prev => prev.map(b => b.id === brand.id ? { ...b, ...brand } : b));
    } else {
      // Auto-fetch logo for new brands
      const logoUrl = getBrandLogoUrl(brand.name);
      const newBrand: ExtendedBrand = {
        ...brand,
        image: logoUrl,
        createdAt: new Date().toISOString(),
      };
      setBrands(prev => [...prev, newBrand]);
    }
  };

  const handleConfirmDelete = () => {
    if (brandToDelete) {
      setBrands(prev => prev.filter(b => b.id !== brandToDelete.id));
      setIsDeleteModalOpen(false);
      setBrandToDelete(null);
    }
  };

  // Render brand image or fallback
  const renderBrandImage = (brand: ExtendedBrand, size: 'sm' | 'md' | 'lg' = 'md') => {
    const sizeClasses = {
      sm: 'w-8 h-8',
      md: 'w-12 h-12',
      lg: 'w-16 h-16'
    };

    if (brand.image) {
      return (
        <div className={`${sizeClasses[size]} rounded-xl overflow-hidden bg-white flex items-center justify-center border ${
          theme === 'dark' ? 'border-slate-700' : 'border-slate-200'
        }`}>
          <img 
            src={brand.image} 
            alt={brand.name}
            className="w-full h-full object-contain p-1"
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className={`text-2xl lg:text-3xl font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
            Brands
          </h1>
          <p className={`mt-1 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
            Manage product brands
          </p>
        </div>
        <button 
          onClick={handleAddBrand}
          className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-xl font-medium hover:opacity-90 transition-opacity shadow-lg shadow-emerald-500/20"
        >
          <Plus className="w-5 h-5" />
          Add Brand
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className={`rounded-2xl border p-4 ${
          theme === 'dark' ? 'bg-slate-800/30 border-slate-700/50' : 'bg-white border-slate-200'
        }`}>
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-xl ${theme === 'dark' ? 'bg-emerald-500/10' : 'bg-emerald-50'}`}>
              <Building2 className="w-5 h-5 text-emerald-500" />
            </div>
            <div>
              <p className={`text-xs font-medium ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>Total Brands</p>
              <p className="text-lg font-bold text-emerald-500">{brands.length}</p>
            </div>
          </div>
        </div>
        <div className={`rounded-2xl border p-4 ${
          theme === 'dark' ? 'bg-slate-800/30 border-slate-700/50' : 'bg-white border-slate-200'
        }`}>
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-xl ${theme === 'dark' ? 'bg-blue-500/10' : 'bg-blue-50'}`}>
              <Package className="w-5 h-5 text-blue-500" />
            </div>
            <div>
              <p className={`text-xs font-medium ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>Total Products</p>
              <p className="text-lg font-bold text-blue-500">{brands.reduce((sum, b) => sum + b.productCount, 0)}</p>
            </div>
          </div>
        </div>
        <div className={`rounded-2xl border p-4 ${
          theme === 'dark' ? 'bg-slate-800/30 border-slate-700/50' : 'bg-white border-slate-200'
        }`}>
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-xl ${theme === 'dark' ? 'bg-amber-500/10' : 'bg-amber-50'}`}>
              <ImageIcon className="w-5 h-5 text-amber-500" />
            </div>
            <div>
              <p className={`text-xs font-medium ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>With Logo</p>
              <p className="text-lg font-bold text-amber-500">{brands.filter(b => b.image).length}</p>
            </div>
          </div>
        </div>
        <div className={`rounded-2xl border p-4 ${
          theme === 'dark' ? 'bg-slate-800/30 border-slate-700/50' : 'bg-white border-slate-200'
        }`}>
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-xl ${theme === 'dark' ? 'bg-violet-500/10' : 'bg-violet-50'}`}>
              <Check className="w-5 h-5 text-violet-500" />
            </div>
            <div>
              <p className={`text-xs font-medium ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>Active</p>
              <p className="text-lg font-bold text-violet-500">{brands.filter(b => b.productCount > 0).length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className={`p-3 sm:p-4 rounded-2xl border ${
        theme === 'dark' ? 'bg-slate-800/30 border-slate-700/50' : 'bg-white border-slate-200'
      }`}>
        <div className="flex flex-col lg:flex-row gap-3">
          {/* Search Input */}
          <div className={`flex items-center gap-2 px-3 sm:px-4 py-2 rounded-xl border flex-1 ${
            theme === 'dark' ? 'bg-slate-800/50 border-slate-700/50' : 'bg-slate-50 border-slate-200'
          }`}>
            <Search className={`w-5 h-5 flex-shrink-0 ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`} />
            <input
              type="text"
              placeholder="Search brands..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`bg-transparent border-none outline-none flex-1 min-w-0 text-sm ${
                theme === 'dark' ? 'text-white placeholder-slate-500' : 'text-slate-900 placeholder-slate-400'
              }`}
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Filters Row */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Date Range */}
            <div className="flex items-center gap-2">
              <Calendar className={`w-4 h-4 ${theme === 'dark' ? 'text-emerald-500' : 'text-emerald-600'}`} />
              <div className="relative" ref={startCalendarRef}>
                <button
                  onClick={() => {
                    setShowStartCalendar(!showStartCalendar);
                    setShowEndCalendar(false);
                    setCalendarMonth(startDate ? new Date(startDate) : new Date());
                  }}
                  className={`px-3 py-2 rounded-xl border text-sm min-w-[100px] text-left ${
                    theme === 'dark' 
                      ? 'bg-slate-800/50 border-slate-700/50 text-white hover:bg-slate-700/50' 
                      : 'bg-slate-50 border-slate-200 text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  {startDate ? formatDateDisplay(startDate) : 'From'}
                </button>
                {showStartCalendar && renderCalendar(startDate, setStartDate, setShowStartCalendar)}
              </div>
              <span className={`${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>-</span>
              <div className="relative" ref={endCalendarRef}>
                <button
                  onClick={() => {
                    setShowEndCalendar(!showEndCalendar);
                    setShowStartCalendar(false);
                    setCalendarMonth(endDate ? new Date(endDate) : new Date());
                  }}
                  className={`px-3 py-2 rounded-xl border text-sm min-w-[100px] text-left ${
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
              className={`flex items-center gap-2 px-3 py-2 rounded-xl border transition-colors ${
                theme === 'dark' 
                  ? 'border-slate-700 hover:bg-slate-800 text-slate-300' 
                  : 'border-slate-200 hover:bg-slate-50 text-slate-700'
              }`}
              title="Sort by"
            >
              <ArrowDownUp className="w-4 h-4" />
              <span className="text-sm capitalize">{sortBy}</span>
            </button>

            {/* Sort Order Toggle */}
            <button
              onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
              className={`p-2 rounded-xl border transition-colors ${
                theme === 'dark' ? 'border-slate-700 hover:bg-slate-800 text-slate-400' : 'border-slate-200 hover:bg-slate-50 text-slate-600'
              }`}
              title={sortOrder === 'asc' ? 'Ascending' : 'Descending'}
            >
              {sortOrder === 'asc' ? <SortAsc className="w-4 h-4" /> : <SortDesc className="w-4 h-4" />}
            </button>

            {/* View Mode Toggle */}
            <div className={`flex items-center rounded-xl overflow-hidden border ${
              theme === 'dark' ? 'border-slate-700' : 'border-slate-200'
            }`}>
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
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 transition-colors ${
                  viewMode === 'list'
                    ? 'bg-emerald-500 text-white'
                    : theme === 'dark'
                      ? 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                      : 'bg-white hover:bg-slate-100 text-slate-700'
                }`}
                title="List view"
              >
                <List className="w-4 h-4" />
              </button>
            </div>

            {/* Clear Filters */}
            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-colors ${
                  theme === 'dark'
                    ? 'bg-red-500/10 hover:bg-red-500/20 text-red-400'
                    : 'bg-red-50 hover:bg-red-100 text-red-600'
                }`}
              >
                <X className="w-4 h-4" />
                Clear
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Brands Display */}
      {viewMode === 'list' ? (
        /* Table View */
        <div className={`rounded-2xl border overflow-hidden ${
          theme === 'dark' ? 'bg-slate-800/30 border-slate-700/50' : 'bg-white border-slate-200'
        }`}>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className={`border-b ${theme === 'dark' ? 'border-slate-700/50' : 'border-slate-200'}`}>
                  <th className={`text-left px-4 py-3 text-xs font-semibold ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                    Brand
                  </th>
                  <th className={`text-left px-4 py-3 text-xs font-semibold ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                    Description
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
                      theme === 'dark' ? 'border-slate-700/30 hover:bg-slate-800/30' : 'border-slate-100 hover:bg-slate-50'
                    }`}
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        {renderBrandImage(brand, 'sm')}
                        <span className={`font-medium ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                          {brand.name}
                        </span>
                      </div>
                    </td>
                    <td className={`px-4 py-3 text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                      {brand.description || '-'}
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
                      {new Date(brand.createdAt).toLocaleDateString('en-GB', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric'
                      })}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button 
                          onClick={() => handleEditBrand(brand)}
                          className={`p-2 rounded-xl transition-colors ${
                            theme === 'dark' ? 'hover:bg-slate-700 text-slate-400' : 'hover:bg-slate-100 text-slate-600'
                          }`}
                          title="Edit"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => handleDeleteClick(brand)}
                          className={`p-2 rounded-xl transition-colors ${
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
        </div>
      ) : (
        /* Card View */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {paginatedBrands.map((brand) => (
            <div 
              key={brand.id}
              className={`group rounded-2xl border p-6 transition-all hover:shadow-lg ${
                theme === 'dark' 
                  ? 'bg-slate-800/30 border-slate-700/50 hover:border-emerald-500/30' 
                  : 'bg-white border-slate-200 hover:border-emerald-500/50'
              }`}
            >
              <div className="flex items-start justify-between mb-4">
                <div>
                  {renderBrandImage(brand, 'lg')}
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button 
                    onClick={() => handleEditBrand(brand)}
                    className={`p-2 rounded-xl transition-colors ${
                      theme === 'dark' ? 'hover:bg-slate-700 text-slate-400' : 'hover:bg-slate-100 text-slate-600'
                    }`}
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => handleDeleteClick(brand)}
                    className={`p-2 rounded-xl transition-colors ${
                      theme === 'dark' ? 'hover:bg-red-500/10 text-red-400' : 'hover:bg-red-50 text-red-500'
                    }`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <h3 className={`font-semibold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                {brand.name}
              </h3>
              <p className={`text-sm mt-1 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                {brand.productCount} products
              </p>
              <p className={`text-xs mt-2 ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>
                Added {new Date(brand.createdAt).toLocaleDateString('en-GB', {
                  day: '2-digit',
                  month: 'short',
                  year: 'numeric'
                })}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {sortedBrands.length > 0 && (
        <div className={`p-4 rounded-2xl border ${
          theme === 'dark' ? 'bg-slate-800/30 border-slate-700/50' : 'bg-white border-slate-200'
        }`}>
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            {/* Results Info */}
            <div className="flex items-center gap-4">
              <p className={`text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                Showing <span className="font-medium">{startIndex + 1}</span> - <span className="font-medium">{Math.min(endIndex, sortedBrands.length)}</span> of <span className="font-medium">{sortedBrands.length}</span> brands
              </p>
              
              {/* Items Per Page Selector */}
              <div className="flex items-center gap-2">
                <span className={`text-sm ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>Show:</span>
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
                <button
                  onClick={() => setCurrentPage(1)}
                  disabled={currentPage === 1}
                  className={`p-2 rounded-lg transition-colors ${
                    currentPage === 1
                      ? theme === 'dark' ? 'text-slate-600 cursor-not-allowed' : 'text-slate-300 cursor-not-allowed'
                      : theme === 'dark' ? 'hover:bg-slate-700 text-slate-400' : 'hover:bg-slate-100 text-slate-600'
                  }`}
                >
                  <ChevronsLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className={`p-2 rounded-lg transition-colors ${
                    currentPage === 1
                      ? theme === 'dark' ? 'text-slate-600 cursor-not-allowed' : 'text-slate-300 cursor-not-allowed'
                      : theme === 'dark' ? 'hover:bg-slate-700 text-slate-400' : 'hover:bg-slate-100 text-slate-600'
                  }`}
                >
                  <ChevronLeft className="w-4 h-4" />
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

                <div className={`sm:hidden px-3 py-1 rounded-lg text-sm font-medium ${
                  theme === 'dark' ? 'bg-slate-700 text-slate-300' : 'bg-slate-100 text-slate-700'
                }`}>
                  {currentPage} / {totalPages}
                </div>

                <button
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className={`p-2 rounded-lg transition-colors ${
                    currentPage === totalPages
                      ? theme === 'dark' ? 'text-slate-600 cursor-not-allowed' : 'text-slate-300 cursor-not-allowed'
                      : theme === 'dark' ? 'hover:bg-slate-700 text-slate-400' : 'hover:bg-slate-100 text-slate-600'
                  }`}
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setCurrentPage(totalPages)}
                  disabled={currentPage === totalPages}
                  className={`p-2 rounded-lg transition-colors ${
                    currentPage === totalPages
                      ? theme === 'dark' ? 'text-slate-600 cursor-not-allowed' : 'text-slate-300 cursor-not-allowed'
                      : theme === 'dark' ? 'hover:bg-slate-700 text-slate-400' : 'hover:bg-slate-100 text-slate-600'
                  }`}
                >
                  <ChevronsRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Empty State */}
      {paginatedBrands.length === 0 && (
        <div className={`text-center py-12 rounded-2xl border ${
          theme === 'dark' ? 'bg-slate-800/30 border-slate-700/50' : 'bg-white border-slate-200'
        }`}>
          <Building2 className={`w-12 h-12 mx-auto mb-3 ${theme === 'dark' ? 'text-slate-600' : 'text-slate-300'}`} />
          <h3 className={`text-lg font-semibold mb-1 ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
            No brands found
          </h3>
          <p className={`text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
            {hasActiveFilters ? 'Try adjusting your filters' : 'Add your first brand to get started'}
          </p>
        </div>
      )}

      {/* Modals */}
      <BrandFormModal
        isOpen={isFormModalOpen}
        brand={selectedBrand}
        onClose={() => setIsFormModalOpen(false)}
        onSave={handleSaveBrand}
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
