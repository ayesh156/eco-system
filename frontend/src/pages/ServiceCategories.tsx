import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { serviceCategories, mockServices } from '../data/mockData';
import { DeleteConfirmationModal } from '../components/modals/DeleteConfirmationModal';
import { SearchableSelect } from '../components/ui/searchable-select';
import { 
  Layers, Plus, Edit, Trash2, Search, X, LayoutGrid, List,
  SortAsc, SortDesc, Calendar, ChevronLeft, ChevronRight,
  ChevronsLeft, ChevronsRight, Wrench, Check, Sparkles, Save, Palette
} from 'lucide-react';

// Extended Service Category interface
interface ExtendedServiceCategory {
  id: string;
  value: string;
  name: string;
  description: string;
  icon: string;
  serviceCount: number;
  totalRevenue: number;
  isActive: boolean;
  createdAt: string;
  color: string;
}

// Category colors
const categoryColors: Record<string, string> = {
  'repair': 'from-red-500 to-orange-500',
  'maintenance': 'from-blue-500 to-cyan-500',
  'installation': 'from-green-500 to-emerald-500',
  'upgrade': 'from-purple-500 to-pink-500',
  'data_recovery': 'from-yellow-500 to-amber-500',
  'networking': 'from-indigo-500 to-blue-500',
  'software': 'from-teal-500 to-green-500',
  'consultation': 'from-orange-500 to-red-500',
  'cleaning': 'from-cyan-500 to-blue-500',
  'other': 'from-slate-500 to-gray-500',
};

export const ServiceCategories: React.FC = () => {
  const { theme } = useTheme();
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'card' | 'list'>('card');
  const [sortBy, setSortBy] = useState<'name' | 'services' | 'revenue' | 'date'>('name');
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

  // Modal states
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState<ExtendedServiceCategory | null>(null);
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<ExtendedServiceCategory | null>(null);
  
  // Form states
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    icon: '📦',
    color: 'from-slate-500 to-gray-500',
    isActive: true,
  });

  // Available icons for category
  const categoryIcons = ['🔧', '🛠️', '💻', '⬆️', '💾', '🌐', '📀', '💡', '✨', '📦', '🔌', '🖥️', '📱', '🎮', '🔒', '📡'];
  
  // Available colors for category (kept for future use)
  // const categoryColorOptions = [
  //   { value: 'from-red-500 to-orange-500', label: 'Red-Orange', preview: 'bg-gradient-to-r from-red-500 to-orange-500' },
  //   { value: 'from-blue-500 to-cyan-500', label: 'Blue-Cyan', preview: 'bg-gradient-to-r from-blue-500 to-cyan-500' },
  //   { value: 'from-green-500 to-emerald-500', label: 'Green-Emerald', preview: 'bg-gradient-to-r from-green-500 to-emerald-500' },
  //   { value: 'from-purple-500 to-pink-500', label: 'Purple-Pink', preview: 'bg-gradient-to-r from-purple-500 to-pink-500' },
  //   { value: 'from-yellow-500 to-amber-500', label: 'Yellow-Amber', preview: 'bg-gradient-to-r from-yellow-500 to-amber-500' },
  //   { value: 'from-indigo-500 to-blue-500', label: 'Indigo-Blue', preview: 'bg-gradient-to-r from-indigo-500 to-blue-500' },
  //   { value: 'from-teal-500 to-green-500', label: 'Teal-Green', preview: 'bg-gradient-to-r from-teal-500 to-green-500' },
  //   { value: 'from-orange-500 to-red-500', label: 'Orange-Red', preview: 'bg-gradient-to-r from-orange-500 to-red-500' },
  //   { value: 'from-cyan-500 to-blue-500', label: 'Cyan-Blue', preview: 'bg-gradient-to-r from-cyan-500 to-blue-500' },
  //   { value: 'from-pink-500 to-rose-500', label: 'Pink-Rose', preview: 'bg-gradient-to-r from-pink-500 to-rose-500' },
  // ];

  // Sort options for SearchableSelect
  const sortOptions = [
    { value: 'name', label: 'Sort by Name' },
    { value: 'services', label: 'Sort by Services' },
    { value: 'revenue', label: 'Sort by Revenue' },
    { value: 'date', label: 'Sort by Date' },
  ];

  // Convert serviceCategories to ExtendedServiceCategory objects with counts
  const initialCategories: ExtendedServiceCategory[] = serviceCategories.map((cat, index) => {
    const services = mockServices.filter(s => s.category === cat.value);
    const totalRevenue = services.reduce((sum, s) => sum + (s.totalRevenue || 0), 0);
    return {
      id: `scat-${index + 1}`,
      value: cat.value,
      name: cat.label,
      description: cat.description,
      icon: cat.icon,
      serviceCount: services.length,
      totalRevenue,
      isActive: true,
      createdAt: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000).toISOString(),
      color: categoryColors[cat.value] || 'from-slate-500 to-gray-500',
    };
  });

  const [categories, setCategories] = useState<ExtendedServiceCategory[]>(initialCategories);

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
  const filteredCategories = useMemo(() => {
    return categories.filter(category => {
      if (searchQuery && !category.name.toLowerCase().includes(searchQuery.toLowerCase()) &&
          !category.description.toLowerCase().includes(searchQuery.toLowerCase())) {
        return false;
      }
      
      if (startDate) {
        const categoryDate = new Date(category.createdAt);
        const start = new Date(startDate);
        if (categoryDate < start) return false;
      }
      if (endDate) {
        const categoryDate = new Date(category.createdAt);
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        if (categoryDate > end) return false;
      }
      
      return true;
    });
  }, [categories, searchQuery, startDate, endDate]);

  // Sorting
  const sortedCategories = useMemo(() => {
    return [...filteredCategories].sort((a, b) => {
      let comparison = 0;
      switch (sortBy) {
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'services':
          comparison = a.serviceCount - b.serviceCount;
          break;
        case 'revenue':
          comparison = a.totalRevenue - b.totalRevenue;
          break;
        case 'date':
          comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
          break;
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });
  }, [filteredCategories, sortBy, sortOrder]);

  // Pagination
  const totalPages = Math.ceil(sortedCategories.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedCategories = sortedCategories.slice(startIndex, endIndex);

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

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, startDate, endDate, sortBy, sortOrder, itemsPerPage]);

  // Stats
  const stats = {
    totalCategories: categories.length,
    activeCategories: categories.filter(c => c.isActive).length,
    totalServices: categories.reduce((sum, c) => sum + c.serviceCount, 0),
    totalRevenue: categories.reduce((sum, c) => sum + c.totalRevenue, 0),
  };

  // Calendar helpers
  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDayOfMonth = new Date(year, month, 1).getDay();
    
    const days = [];
    for (let i = 0; i < firstDayOfMonth; i++) {
      days.push(null);
    }
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(new Date(year, month, i));
    }
    return days;
  };

  const formatDate = (date: Date) => date.toISOString().split('T')[0];

  const handleDelete = (category: ExtendedServiceCategory) => {
    setCategoryToDelete(category);
    setIsDeleteModalOpen(true);
  };

  const confirmDelete = () => {
    if (categoryToDelete) {
      setCategories(categories.filter(c => c.id !== categoryToDelete.id));
      setIsDeleteModalOpen(false);
      setCategoryToDelete(null);
    }
  };

  const handleEdit = (category: ExtendedServiceCategory) => {
    setEditingCategory(category);
    setFormData({
      name: category.name,
      description: category.description,
      icon: category.icon,
      color: category.color,
      isActive: category.isActive,
    });
    setIsFormModalOpen(true);
  };

  const handleAddNew = () => {
    setEditingCategory(null);
    setFormData({
      name: '',
      description: '',
      icon: '📦',
      color: 'from-slate-500 to-gray-500',
      isActive: true,
    });
    setIsFormModalOpen(true);
  };

  const handleFormSubmit = () => {
    if (!formData.name.trim()) return;

    if (editingCategory) {
      // Update existing category
      setCategories(categories.map(c => 
        c.id === editingCategory.id 
          ? { ...c, name: formData.name, description: formData.description, icon: formData.icon, color: formData.color, isActive: formData.isActive }
          : c
      ));
    } else {
      // Add new category
      const newCategory: ExtendedServiceCategory = {
        id: `scat-${Date.now()}`,
        value: formData.name.toLowerCase().replace(/\s+/g, '_'),
        name: formData.name,
        description: formData.description,
        icon: formData.icon,
        serviceCount: 0,
        totalRevenue: 0,
        isActive: formData.isActive,
        createdAt: new Date().toISOString(),
        color: formData.color,
      };
      setCategories([...categories, newCategory]);
    }
    setIsFormModalOpen(false);
    setEditingCategory(null);
  };

  const closeFormModal = () => {
    setIsFormModalOpen(false);
    setEditingCategory(null);
  };

  const toggleCategoryStatus = (categoryId: string) => {
    setCategories(categories.map(c => 
      c.id === categoryId ? { ...c, isActive: !c.isActive } : c
    ));
  };

  // Calendar Component
  const CalendarPopup = ({ 
    isOpen, 
    onClose, 
    onSelect, 
    selectedDate,
    containerRef 
  }: { 
    isOpen: boolean; 
    onClose: () => void; 
    onSelect: (date: string) => void;
    selectedDate: string;
    containerRef: React.RefObject<HTMLDivElement>;
  }) => {
    if (!isOpen) return null;

    const days = getDaysInMonth(calendarMonth);
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'];

    return (
      <div 
        ref={containerRef}
        className={`absolute top-full left-0 mt-2 p-4 rounded-xl shadow-2xl z-50 w-72 ${
          theme === 'dark' 
            ? 'bg-slate-800 border border-slate-700' 
            : 'bg-white border border-slate-200'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() - 1))}
            className={`p-1.5 rounded-lg ${theme === 'dark' ? 'hover:bg-slate-700' : 'hover:bg-slate-100'}`}
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className={`font-medium ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
            {monthNames[calendarMonth.getMonth()]} {calendarMonth.getFullYear()}
          </span>
          <button
            onClick={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1))}
            className={`p-1.5 rounded-lg ${theme === 'dark' ? 'hover:bg-slate-700' : 'hover:bg-slate-100'}`}
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Days of week */}
        <div className="grid grid-cols-7 gap-1 mb-2">
          {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(day => (
            <div key={day} className={`text-center text-xs font-medium py-1 ${
              theme === 'dark' ? 'text-slate-400' : 'text-slate-500'
            }`}>
              {day}
            </div>
          ))}
        </div>

        {/* Calendar days */}
        <div className="grid grid-cols-7 gap-1">
          {days.map((day, index) => (
            <button
              key={index}
              onClick={() => {
                if (day) {
                  onSelect(formatDate(day));
                  onClose();
                }
              }}
              disabled={!day}
              className={`p-2 text-sm rounded-lg transition-all ${
                !day 
                  ? 'invisible' 
                  : selectedDate === (day ? formatDate(day) : '')
                    ? 'bg-emerald-500 text-white'
                    : theme === 'dark'
                      ? 'text-slate-300 hover:bg-slate-700'
                      : 'text-slate-700 hover:bg-slate-100'
              }`}
            >
              {day?.getDate()}
            </button>
          ))}
        </div>

        {/* Clear button */}
        <button
          onClick={() => {
            onSelect('');
            onClose();
          }}
          className={`w-full mt-3 py-2 text-sm font-medium rounded-lg ${
            theme === 'dark' 
              ? 'bg-slate-700 hover:bg-slate-600 text-slate-300' 
              : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
          }`}
        >
          Clear
        </button>
      </div>
    );
  };

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-LK', {
      style: 'currency',
      currency: 'LKR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className={`min-h-screen p-4 md:p-6 ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-3">
            <div className={`p-2.5 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 shadow-lg`}>
              <Layers className="w-6 h-6 text-white" />
            </div>
            Service Categories
          </h1>
          <p className={`mt-1 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
            Manage and organize your service categories
          </p>
        </div>
        <button
          onClick={handleAddNew}
          className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-xl font-medium shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/30 transition-all hover:scale-105"
        >
          <Plus className="w-5 h-5" />
          Add Category
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className={`p-4 rounded-2xl ${
          theme === 'dark' 
            ? 'bg-gradient-to-br from-slate-800/80 to-slate-900/80 border border-slate-700/50' 
            : 'bg-white border border-slate-200 shadow-lg'
        }`}>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-gradient-to-br from-purple-500/20 to-pink-500/20">
              <Layers className="w-5 h-5 text-purple-500" />
            </div>
            <div>
              <p className={`text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>Total Categories</p>
              <p className="text-xl font-bold">{stats.totalCategories}</p>
            </div>
          </div>
        </div>

        <div className={`p-4 rounded-2xl ${
          theme === 'dark' 
            ? 'bg-gradient-to-br from-slate-800/80 to-slate-900/80 border border-slate-700/50' 
            : 'bg-white border border-slate-200 shadow-lg'
        }`}>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-gradient-to-br from-emerald-500/20 to-teal-500/20">
              <Check className="w-5 h-5 text-emerald-500" />
            </div>
            <div>
              <p className={`text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>Active</p>
              <p className="text-xl font-bold">{stats.activeCategories}</p>
            </div>
          </div>
        </div>

        <div className={`p-4 rounded-2xl ${
          theme === 'dark' 
            ? 'bg-gradient-to-br from-slate-800/80 to-slate-900/80 border border-slate-700/50' 
            : 'bg-white border border-slate-200 shadow-lg'
        }`}>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-gradient-to-br from-blue-500/20 to-cyan-500/20">
              <Wrench className="w-5 h-5 text-blue-500" />
            </div>
            <div>
              <p className={`text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>Total Services</p>
              <p className="text-xl font-bold">{stats.totalServices}</p>
            </div>
          </div>
        </div>

        <div className={`p-4 rounded-2xl ${
          theme === 'dark' 
            ? 'bg-gradient-to-br from-slate-800/80 to-slate-900/80 border border-slate-700/50' 
            : 'bg-white border border-slate-200 shadow-lg'
        }`}>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-gradient-to-br from-amber-500/20 to-orange-500/20">
              <Sparkles className="w-5 h-5 text-amber-500" />
            </div>
            <div>
              <p className={`text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>Total Revenue</p>
              <p className="text-lg font-bold">{formatCurrency(stats.totalRevenue)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters & Search */}
      <div className={`p-3 sm:p-4 rounded-2xl mb-6 border ${
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
              placeholder="Search categories..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`bg-transparent border-none outline-none flex-1 min-w-0 text-sm ${
                theme === 'dark' ? 'text-white placeholder-slate-500' : 'text-slate-900 placeholder-slate-400'
              }`}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className={`p-1 rounded-full ${
                  theme === 'dark' ? 'hover:bg-slate-700' : 'hover:bg-slate-200'
                }`}
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Filters Row */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Date Range */}
            <div className="flex items-center gap-1.5">
              <div className="relative">
                <button
                  onClick={() => { setShowStartCalendar(!showStartCalendar); setShowEndCalendar(false); }}
                  className={`flex items-center gap-2 px-3 py-2 rounded-xl border transition-all ${
                    startDate
                      ? 'bg-emerald-500/10 border-emerald-500/50 text-emerald-500'
                      : theme === 'dark'
                        ? 'bg-slate-800/50 border-slate-700/50 hover:border-slate-600'
                        : 'bg-slate-50 border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <Calendar className="w-4 h-4" />
                  <span className="text-sm hidden sm:inline">{startDate || 'Start Date'}</span>
                </button>
                <CalendarPopup
                  isOpen={showStartCalendar}
                  onClose={() => setShowStartCalendar(false)}
                  onSelect={setStartDate}
                  selectedDate={startDate}
                  containerRef={startCalendarRef as React.RefObject<HTMLDivElement>}
                />
              </div>

              {/* Separator Line */}
              <div className={`w-4 h-0.5 rounded-full ${theme === 'dark' ? 'bg-slate-600' : 'bg-slate-300'}`} />

              <div className="relative">
                <button
                  onClick={() => { setShowEndCalendar(!showEndCalendar); setShowStartCalendar(false); }}
                  className={`flex items-center gap-2 px-3 py-2 rounded-xl border transition-all ${
                    endDate
                      ? 'bg-emerald-500/10 border-emerald-500/50 text-emerald-500'
                      : theme === 'dark'
                        ? 'bg-slate-800/50 border-slate-700/50 hover:border-slate-600'
                        : 'bg-slate-50 border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <Calendar className="w-4 h-4" />
                  <span className="text-sm hidden sm:inline">{endDate || 'End Date'}</span>
                </button>
                <CalendarPopup
                  isOpen={showEndCalendar}
                  onClose={() => setShowEndCalendar(false)}
                  onSelect={setEndDate}
                  selectedDate={endDate}
                  containerRef={endCalendarRef as React.RefObject<HTMLDivElement>}
                />
              </div>
            </div>

            {/* Sort Dropdown */}
            <div className="w-36">
              <SearchableSelect
                value={sortBy}
                onValueChange={(val) => setSortBy(val as typeof sortBy)}
                placeholder="Sort by"
                options={sortOptions}
                emptyMessage="No option found"
                theme={theme}
              />
            </div>

            {/* Sort Order Button */}
            <button
              onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
              className={`p-2 rounded-xl border transition-colors ${
                theme === 'dark' ? 'border-slate-700 hover:bg-slate-800 text-slate-400' : 'border-slate-200 hover:bg-slate-50 text-slate-600'
              }`}
              title={sortOrder === 'asc' ? 'Sort Descending' : 'Sort Ascending'}
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
                    : theme === 'dark' ? 'bg-slate-800/50 hover:bg-slate-700' : 'bg-slate-50 hover:bg-slate-100'
                }`}
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 transition-colors ${
                  viewMode === 'list'
                    ? 'bg-emerald-500 text-white'
                    : theme === 'dark' ? 'bg-slate-800/50 hover:bg-slate-700' : 'bg-slate-50 hover:bg-slate-100'
                }`}
              >
                <List className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Categories Grid/List */}
      {viewMode === 'card' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mb-6">
          {paginatedCategories.map((category) => (
            <div
              key={category.id}
              className={`group relative p-5 rounded-2xl transition-all duration-300 hover:scale-[1.02] ${
                theme === 'dark'
                  ? 'bg-gradient-to-br from-slate-800/80 to-slate-900/80 border border-slate-700/50 hover:border-slate-600'
                  : 'bg-white border border-slate-200 shadow-lg hover:shadow-xl'
              }`}
            >
              {/* Status badge */}
              <div className="absolute top-3 right-3">
                <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                  category.isActive
                    ? 'bg-emerald-500/20 text-emerald-500'
                    : 'bg-red-500/20 text-red-500'
                }`}>
                  {category.isActive ? 'Active' : 'Inactive'}
                </span>
              </div>

              {/* Icon */}
              <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${category.color} flex items-center justify-center text-2xl shadow-lg mb-4`}>
                {category.icon}
              </div>

              {/* Content */}
              <h3 className={`font-semibold text-lg mb-1 ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                {category.name}
              </h3>
              <p className={`text-sm mb-4 line-clamp-2 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                {category.description}
              </p>

              {/* Stats */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Wrench className={`w-4 h-4 ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`} />
                  <span className={`text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                    {category.serviceCount} services
                  </span>
                </div>
                <span className={`text-sm font-medium ${theme === 'dark' ? 'text-emerald-400' : 'text-emerald-600'}`}>
                  {formatCurrency(category.totalRevenue)}
                </span>
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                <button
                  onClick={() => handleEdit(category)}
                  className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-sm font-medium transition-all ${
                    theme === 'dark'
                      ? 'bg-slate-700/50 hover:bg-slate-700 text-slate-300'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                  }`}
                >
                  <Edit className="w-4 h-4" />
                  Edit
                </button>
                <button
                  onClick={() => toggleCategoryStatus(category.id)}
                  className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-sm font-medium transition-all ${
                    category.isActive
                      ? theme === 'dark'
                        ? 'bg-amber-500/20 hover:bg-amber-500/30 text-amber-400'
                        : 'bg-amber-100 hover:bg-amber-200 text-amber-700'
                      : theme === 'dark'
                        ? 'bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400'
                        : 'bg-emerald-100 hover:bg-emerald-200 text-emerald-700'
                  }`}
                >
                  {category.isActive ? 'Disable' : 'Enable'}
                </button>
                <button
                  onClick={() => handleDelete(category)}
                  className={`p-2 rounded-xl transition-all ${
                    theme === 'dark'
                      ? 'bg-red-500/20 hover:bg-red-500/30 text-red-400'
                      : 'bg-red-100 hover:bg-red-200 text-red-600'
                  }`}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* List View */
        <div className={`rounded-2xl overflow-hidden mb-6 ${
          theme === 'dark'
            ? 'bg-gradient-to-br from-slate-800/80 to-slate-900/80 border border-slate-700/50'
            : 'bg-white border border-slate-200 shadow-lg'
        }`}>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className={theme === 'dark' ? 'bg-slate-800/50' : 'bg-slate-50'}>
                <tr>
                  <th className={`px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider ${
                    theme === 'dark' ? 'text-slate-400' : 'text-slate-600'
                  }`}>Category</th>
                  <th className={`px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider ${
                    theme === 'dark' ? 'text-slate-400' : 'text-slate-600'
                  }`}>Services</th>
                  <th className={`px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider ${
                    theme === 'dark' ? 'text-slate-400' : 'text-slate-600'
                  }`}>Revenue</th>
                  <th className={`px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider ${
                    theme === 'dark' ? 'text-slate-400' : 'text-slate-600'
                  }`}>Status</th>
                  <th className={`px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider ${
                    theme === 'dark' ? 'text-slate-400' : 'text-slate-600'
                  }`}>Created</th>
                  <th className={`px-6 py-4 text-right text-xs font-semibold uppercase tracking-wider ${
                    theme === 'dark' ? 'text-slate-400' : 'text-slate-600'
                  }`}>Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/30">
                {paginatedCategories.map((category) => (
                  <tr key={category.id} className={`${
                    theme === 'dark' ? 'hover:bg-slate-800/30' : 'hover:bg-slate-50'
                  } transition-colors`}>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${category.color} flex items-center justify-center text-lg shadow`}>
                          {category.icon}
                        </div>
                        <div>
                          <p className={`font-medium ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                            {category.name}
                          </p>
                          <p className={`text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                            {category.description}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded-lg text-sm font-medium ${
                        theme === 'dark' ? 'bg-blue-500/20 text-blue-400' : 'bg-blue-100 text-blue-700'
                      }`}>
                        {category.serviceCount}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`font-medium ${theme === 'dark' ? 'text-emerald-400' : 'text-emerald-600'}`}>
                        {formatCurrency(category.totalRevenue)}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                        category.isActive
                          ? 'bg-emerald-500/20 text-emerald-500'
                          : 'bg-red-500/20 text-red-500'
                      }`}>
                        {category.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className={`px-6 py-4 text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                      {new Date(category.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleEdit(category)}
                          className={`p-2 rounded-lg transition-all ${
                            theme === 'dark'
                              ? 'hover:bg-slate-700 text-slate-400 hover:text-white'
                              : 'hover:bg-slate-100 text-slate-600 hover:text-slate-900'
                          }`}
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(category)}
                          className={`p-2 rounded-lg transition-all ${
                            theme === 'dark'
                              ? 'hover:bg-red-500/20 text-slate-400 hover:text-red-400'
                              : 'hover:bg-red-100 text-slate-600 hover:text-red-600'
                          }`}
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
      )}

      {/* Pagination */}
      {sortedCategories.length > 0 && (
        <div className={`p-4 rounded-2xl border ${
          theme === 'dark' 
            ? 'bg-slate-800/30 border-slate-700/50' 
            : 'bg-white border-slate-200'
        }`}>
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            {/* Results Info */}
            <div className="flex items-center gap-4">
              <p className={`text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                Showing <span className="font-medium">{startIndex + 1}</span> - <span className="font-medium">{Math.min(endIndex, sortedCategories.length)}</span> of <span className="font-medium">{sortedCategories.length}</span> categories
              </p>
              
              {/* Items Per Page Selector - Creative Pill Buttons */}
              <div className="flex items-center gap-2">
                <span className={`text-sm ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>Show:</span>
                <div className={`flex items-center rounded-full p-0.5 ${
                  theme === 'dark' ? 'bg-slate-800' : 'bg-slate-100'
                }`}>
                  {[6, 12, 24, 48].map((num) => (
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
      {paginatedCategories.length === 0 && (
        <div className={`flex flex-col items-center justify-center py-16 rounded-2xl ${
          theme === 'dark'
            ? 'bg-gradient-to-br from-slate-800/80 to-slate-900/80 border border-slate-700/50'
            : 'bg-white border border-slate-200 shadow-lg'
        }`}>
          <div className="p-4 rounded-2xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 mb-4">
            <Layers className="w-12 h-12 text-purple-500" />
          </div>
          <h3 className={`text-lg font-semibold mb-2 ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
            No categories found
          </h3>
          <p className={`text-sm mb-4 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
            {searchQuery ? 'Try adjusting your search or filters' : 'Start by adding your first service category'}
          </p>
          {!searchQuery && (
            <button
              onClick={handleAddNew}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-xl font-medium"
            >
              <Plus className="w-4 h-4" />
              Add Category
            </button>
          )}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <DeleteConfirmationModal
        isOpen={isDeleteModalOpen}
        onCancel={() => setIsDeleteModalOpen(false)}
        onConfirm={confirmDelete}
        title="Delete Service Category"
        message={`Are you sure you want to delete "${categoryToDelete?.name}"? This action cannot be undone.`}
        itemName={categoryToDelete?.name || ''}
      />

      {/* Add/Edit Category Modal */}
      {isFormModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={closeFormModal}
          />
          
          {/* Modal - Full scroll like InvoiceEditModal */}
          <div 
            className={`relative w-full max-w-lg max-h-[90vh] rounded-3xl overflow-y-auto shadow-2xl transform transition-all ${
              theme === 'dark' 
                ? 'bg-gradient-to-b from-slate-800 to-slate-900' 
                : 'bg-white'
            }`}
            style={{
              scrollbarWidth: 'thin',
              scrollbarColor: theme === 'dark' ? '#475569 #1e293b' : '#cbd5e1 #f1f5f9'
            }}
          >
            {/* Decorative Header */}
            <div className={`relative h-32 bg-gradient-to-r ${formData.color} overflow-hidden`}>
              <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxwYXRoIGQ9Ik0zNiAxOGMtOS45NDEgMC0xOCA4LjA1OS0xOCAxOHM4LjA1OSAxOCAxOCAxOCAxOC04LjA1OSAxOC0xOC04LjA1OS0xOC0xOC0xOHoiIHN0cm9rZT0iI2ZmZiIgc3Ryb2tlLW9wYWNpdHk9Ii4xIi8+PC9nPjwvc3ZnPg==')] opacity-30" />
              {/* Floating Particles Animation */}
              <div className="absolute inset-0 overflow-hidden">
                <div className="absolute w-2 h-2 bg-white/20 rounded-full animate-pulse top-4 left-8" />
                <div className="absolute w-3 h-3 bg-white/15 rounded-full animate-bounce top-8 right-16" style={{ animationDelay: '0.5s' }} />
                <div className="absolute w-2 h-2 bg-white/25 rounded-full animate-pulse bottom-8 left-1/4" style={{ animationDelay: '1s' }} />
                <div className="absolute w-4 h-4 bg-white/10 rounded-full animate-bounce top-6 left-1/3" style={{ animationDelay: '0.3s' }} />
                <div className="absolute w-2 h-2 bg-white/20 rounded-full animate-pulse bottom-4 right-8" style={{ animationDelay: '0.7s' }} />
              </div>
              <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 z-10">
                <div className={`w-20 h-20 rounded-2xl bg-gradient-to-br ${formData.color} flex items-center justify-center text-4xl shadow-xl border-4 transform hover:scale-110 transition-transform cursor-pointer ${
                  theme === 'dark' ? 'border-slate-800' : 'border-white'
                }`}>
                  {formData.icon}
                </div>
              </div>
              
              {/* Close Button */}
              <button
                onClick={closeFormModal}
                className="absolute top-4 right-4 p-2 rounded-full bg-white/20 hover:bg-white/30 hover:rotate-90 transition-all duration-300 text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form Content */}
            <div className="pt-14 px-6 pb-6">
              {/* Title */}
              <h2 className={`text-xl font-bold text-center mb-6 ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                {editingCategory ? 'Edit Category' : 'Create New Category'}
              </h2>

              {/* Category Name */}
              <div className="mb-4">
                <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                  Category Name
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Enter category name..."
                  className={`w-full px-4 py-3 rounded-xl border transition-all ${
                    theme === 'dark'
                      ? 'bg-slate-800/50 border-slate-700 text-white placeholder-slate-500 focus:border-emerald-500'
                      : 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400 focus:border-emerald-500'
                  } focus:outline-none focus:ring-2 focus:ring-emerald-500/20`}
                />
              </div>

              {/* Description */}
              <div className="mb-4">
                <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Enter category description..."
                  rows={3}
                  className={`w-full px-4 py-3 rounded-xl border transition-all resize-none ${
                    theme === 'dark'
                      ? 'bg-slate-800/50 border-slate-700 text-white placeholder-slate-500 focus:border-emerald-500'
                      : 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400 focus:border-emerald-500'
                  } focus:outline-none focus:ring-2 focus:ring-emerald-500/20`}
                />
              </div>

              {/* Icon Selector */}
              <div className="mb-4">
                <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                  <Palette className="w-4 h-4 inline-block mr-1" /> Select Icon
                </label>
                <div className={`grid grid-cols-8 gap-2 p-3 rounded-xl ${
                  theme === 'dark' ? 'bg-slate-800/50' : 'bg-slate-50'
                }`}>
                  {categoryIcons.map((icon) => (
                    <button
                      key={icon}
                      type="button"
                      onClick={() => setFormData({ ...formData, icon })}
                      className={`w-10 h-10 flex items-center justify-center text-xl rounded-lg transition-all ${
                        formData.icon === icon
                          ? 'bg-emerald-500 text-white scale-110 shadow-lg'
                          : theme === 'dark'
                            ? 'hover:bg-slate-700'
                            : 'hover:bg-slate-200'
                      }`}
                    >
                      {icon}
                    </button>
                  ))}
                </div>
              </div>

              {/* Active Status Toggle */}
              <div className={`flex items-center justify-between p-4 rounded-xl mb-6 ${
                theme === 'dark' ? 'bg-slate-800/50' : 'bg-slate-50'
              }`}>
                <div>
                  <h4 className={`font-medium ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                    Active Status
                  </h4>
                  <p className={`text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                    Enable or disable this category
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, isActive: !formData.isActive })}
                  className={`relative w-14 h-7 rounded-full transition-colors ${
                    formData.isActive
                      ? 'bg-emerald-500'
                      : theme === 'dark' ? 'bg-slate-600' : 'bg-slate-300'
                  }`}
                >
                  <div className={`absolute top-1 w-5 h-5 rounded-full bg-white shadow-md transition-transform ${
                    formData.isActive ? 'translate-x-8' : 'translate-x-1'
                  }`} />
                </button>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3">
                <button
                  onClick={closeFormModal}
                  className={`flex-1 py-3 rounded-xl font-medium transition-all ${
                    theme === 'dark'
                      ? 'bg-slate-700 hover:bg-slate-600 text-slate-300'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                  }`}
                >
                  Cancel
                </button>
                <button
                  onClick={handleFormSubmit}
                  disabled={!formData.name.trim()}
                  className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-medium transition-all ${
                    formData.name.trim()
                      ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/30 hover:scale-[1.02]'
                      : 'bg-slate-300 text-slate-500 cursor-not-allowed'
                  }`}
                >
                  <Save className="w-4 h-4" />
                  {editingCategory ? 'Update Category' : 'Create Category'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ServiceCategories;
