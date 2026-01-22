import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../contexts/ThemeContext';
import { mockGRNs, mockSuppliers } from '../data/mockData';
import type { GoodsReceivedNote, GRNStatus } from '../data/mockData';
import { GRNFormModal } from '../components/modals/GRNFormModal';
import { GRNViewModal } from '../components/modals/GRNViewModal';
import { DeleteConfirmationModal } from '../components/modals/DeleteConfirmationModal';
import { SearchableSelect } from '../components/ui/searchable-select';
import { 
  Search, Plus, Edit, Eye, Calendar, ClipboardCheck,
  CheckCircle, XCircle, Clock, AlertTriangle,
  ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight,
  FileText, Truck, Filter, RefreshCw, List, LayoutGrid,
  SortAsc, SortDesc, Building2, DollarSign,
  BarChart3, TrendingUp, Trash2,
  CreditCard, Banknote, Wallet, Receipt, BadgePercent
} from 'lucide-react';

// GRN Status config for badges (removed 'inspecting')
const grnStatusConfig: Record<GRNStatus, { label: string; color: string; bgColor: string; borderColor: string; icon: React.ElementType }> = {
  pending: { label: 'Pending', color: 'text-amber-500', bgColor: 'bg-amber-500/10', borderColor: 'border-amber-500/30', icon: Clock },
  inspecting: { label: 'Inspecting', color: 'text-blue-500', bgColor: 'bg-blue-500/10', borderColor: 'border-blue-500/30', icon: Clock },
  partial: { label: 'Partial', color: 'text-orange-500', bgColor: 'bg-orange-500/10', borderColor: 'border-orange-500/30', icon: AlertTriangle },
  completed: { label: 'Completed', color: 'text-emerald-500', bgColor: 'bg-emerald-500/10', borderColor: 'border-emerald-500/30', icon: CheckCircle },
  rejected: { label: 'Rejected', color: 'text-red-500', bgColor: 'bg-red-500/10', borderColor: 'border-red-500/30', icon: XCircle },
};

// Payment method config for icons
const paymentMethodIcons: Record<string, { icon: React.ElementType; color: string; bgColor: string }> = {
  cash: { icon: Banknote, color: 'text-emerald-500', bgColor: 'bg-emerald-500/10' },
  bank: { icon: Building2, color: 'text-blue-500', bgColor: 'bg-blue-500/10' },
  card: { icon: CreditCard, color: 'text-purple-500', bgColor: 'bg-purple-500/10' },
  credit: { icon: Wallet, color: 'text-orange-500', bgColor: 'bg-orange-500/10' },
  cheque: { icon: Receipt, color: 'text-cyan-500', bgColor: 'bg-cyan-500/10' },
};

// Payment status config
const paymentStatusConfig: Record<string, { label: string; color: string; bgColor: string }> = {
  paid: { label: 'Paid', color: 'text-emerald-500', bgColor: 'bg-emerald-500/10' },
  partial: { label: 'Partial', color: 'text-amber-500', bgColor: 'bg-amber-500/10' },
  unpaid: { label: 'Unpaid', color: 'text-red-500', bgColor: 'bg-red-500/10' },
};

type ViewMode = 'grid' | 'table';

export const GoodsReceived: React.FC = () => {
  const { theme } = useTheme();
  const navigate = useNavigate();
  
  // State
  const [grns, setGRNs] = useState<GoodsReceivedNote[]>(mockGRNs);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [supplierFilter, setSupplierFilter] = useState<string>('all');
  
  // Date range filter states
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  
  // Price filter states
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  
  // View and sort
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [showFilters, setShowFilters] = useState(false);
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(9);
  
  // Calendar states
  const [showStartCalendar, setShowStartCalendar] = useState(false);
  const [showEndCalendar, setShowEndCalendar] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState(new Date());
  const startCalendarRef = useRef<HTMLDivElement>(null);
  const endCalendarRef = useRef<HTMLDivElement>(null);
  
  // Modal states
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedGRN, setSelectedGRN] = useState<GoodsReceivedNote | null>(null);
  const [grnToDelete, setGrnToDelete] = useState<GoodsReceivedNote | null>(null);

  const suppliers = mockSuppliers;

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

  // Supplier options for SearchableSelect
  const supplierOptions = useMemo(() => [
    { value: 'all', label: 'All Suppliers' },
    ...suppliers.map(s => ({ value: s.id, label: s.company }))
  ], [suppliers]);

  // Status options for SearchableSelect
  const statusOptions = useMemo(() => [
    { value: 'all', label: 'All Status' },
    { value: 'pending', label: 'Pending' },
    { value: 'partial', label: 'Partial Received' },
    { value: 'completed', label: 'Completed' },
    { value: 'rejected', label: 'Rejected' },
  ], []);

  // Statistics
  const stats = useMemo(() => {
    const totalGRNs = grns.length;
    const pendingGRNs = grns.filter(g => g.status === 'pending' || g.status === 'inspecting').length;
    const completedGRNs = grns.filter(g => g.status === 'completed').length;
    const partialGRNs = grns.filter(g => g.status === 'partial').length;
    const rejectedGRNs = grns.filter(g => g.status === 'rejected').length;
    const totalValue = grns.reduce((sum, g) => sum + g.totalAmount, 0);
    const totalAccepted = grns.reduce((sum, g) => sum + g.totalAcceptedQuantity, 0);
    const totalRejected = grns.reduce((sum, g) => sum + g.totalRejectedQuantity, 0);
    const totalOrdered = grns.reduce((sum, g) => sum + g.totalOrderedQuantity, 0);
    const acceptanceRate = totalOrdered > 0 ? ((totalAccepted / totalOrdered) * 100).toFixed(1) : '0';
    return { totalGRNs, pendingGRNs, completedGRNs, partialGRNs, rejectedGRNs, totalValue, totalAccepted, totalRejected, acceptanceRate };
  }, [grns]);

  // Filter GRNs
  const filteredGRNs = useMemo(() => {
    const filtered = grns.filter(grn => {
      const matchesSearch = 
        grn.grnNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        grn.supplierName.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesStatus = statusFilter === 'all' || grn.status === statusFilter || 
        (statusFilter === 'pending' && grn.status === 'inspecting'); // Treat inspecting as pending
      
      const matchesSupplier = supplierFilter === 'all' || grn.supplierId === supplierFilter;
      
      // Date range filter
      let matchesDate = true;
      if (startDate || endDate) {
        const grnDate = new Date(grn.orderDate);
        if (startDate) {
          const start = new Date(startDate);
          start.setHours(0, 0, 0, 0);
          matchesDate = matchesDate && grnDate >= start;
        }
        if (endDate) {
          const end = new Date(endDate);
          end.setHours(23, 59, 59, 999);
          matchesDate = matchesDate && grnDate <= end;
        }
      }
      
      // Price filter
      const minPriceNum = minPrice ? parseFloat(minPrice) : 0;
      const maxPriceNum = maxPrice ? parseFloat(maxPrice) : Infinity;
      const matchesPrice = grn.totalAmount >= minPriceNum && grn.totalAmount <= maxPriceNum;
      
      return matchesSearch && matchesStatus && matchesSupplier && matchesDate && matchesPrice;
    });

    // Apply sorting by date
    return filtered.sort((a, b) => {
      const dateA = new Date(a.orderDate).getTime();
      const dateB = new Date(b.orderDate).getTime();
      return sortOrder === 'asc' ? dateA - dateB : dateB - dateA;
    });
  }, [grns, searchQuery, statusFilter, supplierFilter, startDate, endDate, minPrice, maxPrice, sortOrder]);

  // Pagination
  const totalPages = Math.ceil(filteredGRNs.length / itemsPerPage);
  const paginatedGRNs = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredGRNs.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredGRNs, currentPage, itemsPerPage]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter, supplierFilter, startDate, endDate, minPrice, maxPrice]);

  // Reset items per page when view mode changes
  useEffect(() => {
    if (viewMode === 'table') {
      setItemsPerPage(10);
    } else {
      setItemsPerPage(9);
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

  const hasActiveFilters = searchQuery || statusFilter !== 'all' || supplierFilter !== 'all' || startDate || endDate || minPrice || maxPrice;

  const clearFilters = () => {
    setSearchQuery('');
    setStatusFilter('all');
    setSupplierFilter('all');
    setStartDate('');
    setEndDate('');
    setMinPrice('');
    setMaxPrice('');
  };

  // Handlers
  const handleCreateGRN = () => {
    navigate('/grn/create');
  };

  const handleEditGRN = (grn: GoodsReceivedNote) => {
    setSelectedGRN(grn);
    setIsFormModalOpen(true);
  };

  const handleViewGRN = (grn: GoodsReceivedNote) => {
    setSelectedGRN(grn);
    setIsViewModalOpen(true);
  };

  const handleSaveGRN = (grn: GoodsReceivedNote) => {
    if (selectedGRN) {
      setGRNs(prev => prev.map(g => g.id === grn.id ? grn : g));
    } else {
      setGRNs(prev => [...prev, grn]);
    }
    setIsFormModalOpen(false);
  };

  const handleDeleteGRN = (grn: GoodsReceivedNote) => {
    setGrnToDelete(grn);
    setIsDeleteModalOpen(true);
  };

  const confirmDeleteGRN = () => {
    if (grnToDelete) {
      setGRNs(prev => prev.filter(g => g.id !== grnToDelete.id));
      setIsDeleteModalOpen(false);
      setGrnToDelete(null);
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  const formatDateDisplay = (dateStr: string) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const formatCurrency = (amount: number) => `Rs. ${amount.toLocaleString('en-LK')}`;

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

  // Calendar Component
  const CalendarPopup = ({ 
    selectedDate, 
    onSelectDate, 
    onClose 
  }: { 
    selectedDate: string; 
    onSelectDate: (date: string) => void; 
    onClose: () => void;
  }) => {
    const { daysInMonth, startingDay } = getDaysInMonth(calendarMonth);
    const days = [];
    const weekDays = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
    
    // Empty cells for days before the month starts
    for (let i = 0; i < startingDay; i++) {
      days.push(<div key={`empty-${i}`} className="h-8" />);
    }
    
    // Days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth(), day);
      const dateStr = date.toISOString().split('T')[0];
      const isSelected = dateStr === selectedDate;
      const isToday = dateStr === new Date().toISOString().split('T')[0];
      
      days.push(
        <button
          key={day}
          onClick={() => {
            onSelectDate(dateStr);
            onClose();
          }}
          className={`h-8 w-8 rounded-lg text-sm font-medium transition-all flex items-center justify-center ${
            isSelected
              ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white'
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
      <div className={`absolute top-full left-0 mt-2 p-4 rounded-xl border shadow-xl z-50 w-72 ${
        theme === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'
      }`}>
        {/* Month Navigation */}
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() - 1))}
            className={`p-1.5 rounded-lg transition-colors ${
              theme === 'dark' ? 'hover:bg-slate-700' : 'hover:bg-slate-100'
            }`}
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className={`font-semibold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
            {calendarMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
          </span>
          <button
            onClick={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1))}
            className={`p-1.5 rounded-lg transition-colors ${
              theme === 'dark' ? 'hover:bg-slate-700' : 'hover:bg-slate-100'
            }`}
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
        
        {/* Week Days */}
        <div className="grid grid-cols-7 gap-1 mb-2">
          {weekDays.map(day => (
            <div key={day} className={`h-8 flex items-center justify-center text-xs font-medium ${
              theme === 'dark' ? 'text-slate-500' : 'text-slate-400'
            }`}>
              {day}
            </div>
          ))}
        </div>
        
        {/* Days Grid */}
        <div className="grid grid-cols-7 gap-1">
          {days}
        </div>
        
        {/* Quick Actions */}
        <div className="flex gap-2 mt-4 pt-4 border-t border-slate-700/30">
          <button
            onClick={() => {
              onSelectDate(new Date().toISOString().split('T')[0]);
              onClose();
            }}
            className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              theme === 'dark' ? 'bg-slate-700 hover:bg-slate-600 text-slate-300' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
            }`}
          >
            Today
          </button>
          <button
            onClick={() => {
              onSelectDate('');
              onClose();
            }}
            className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              theme === 'dark' ? 'bg-slate-700 hover:bg-slate-600 text-slate-300' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
            }`}
          >
            Clear
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className={`text-2xl lg:text-3xl font-bold flex items-center gap-3 ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/25">
              <ClipboardCheck className="w-5 h-5 text-white" />
            </div>
            Goods Received Notes
          </h1>
          <p className={`mt-1 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
            Track and manage goods received from suppliers
          </p>
        </div>
        <button 
          onClick={handleCreateGRN}
          className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-xl font-medium hover:opacity-90 transition-opacity shadow-lg shadow-emerald-500/20"
        >
          <Plus className="w-5 h-5" />
          Create GRN
        </button>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <div className={`rounded-2xl border p-4 ${theme === 'dark' ? 'bg-slate-800/30 border-slate-700/50' : 'bg-white border-slate-200'}`}>
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-xl ${theme === 'dark' ? 'bg-blue-500/10' : 'bg-blue-50'}`}>
              <FileText className="w-5 h-5 text-blue-500" />
            </div>
            <div>
              <p className={`text-xs font-medium ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>Total GRNs</p>
              <p className="text-xl font-bold text-blue-500">{stats.totalGRNs}</p>
            </div>
          </div>
        </div>

        <div className={`rounded-2xl border p-4 ${theme === 'dark' ? 'bg-slate-800/30 border-slate-700/50' : 'bg-white border-slate-200'}`}>
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-xl ${theme === 'dark' ? 'bg-amber-500/10' : 'bg-amber-50'}`}>
              <Clock className="w-5 h-5 text-amber-500" />
            </div>
            <div>
              <p className={`text-xs font-medium ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>Pending</p>
              <p className="text-xl font-bold text-amber-500">{stats.pendingGRNs}</p>
            </div>
          </div>
        </div>

        <div className={`rounded-2xl border p-4 ${theme === 'dark' ? 'bg-slate-800/30 border-slate-700/50' : 'bg-white border-slate-200'}`}>
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-xl ${theme === 'dark' ? 'bg-emerald-500/10' : 'bg-emerald-50'}`}>
              <CheckCircle className="w-5 h-5 text-emerald-500" />
            </div>
            <div>
              <p className={`text-xs font-medium ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>Completed</p>
              <p className="text-xl font-bold text-emerald-500">{stats.completedGRNs}</p>
            </div>
          </div>
        </div>

        <div className={`rounded-2xl border p-4 ${theme === 'dark' ? 'bg-slate-800/30 border-slate-700/50' : 'bg-white border-slate-200'}`}>
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-xl ${theme === 'dark' ? 'bg-teal-500/10' : 'bg-teal-50'}`}>
              <TrendingUp className="w-5 h-5 text-teal-500" />
            </div>
            <div>
              <p className={`text-xs font-medium ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>Accept Rate</p>
              <p className="text-xl font-bold text-teal-500">{stats.acceptanceRate}%</p>
            </div>
          </div>
        </div>

        <div className={`rounded-2xl border p-4 ${theme === 'dark' ? 'bg-slate-800/30 border-slate-700/50' : 'bg-white border-slate-200'}`}>
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-xl ${theme === 'dark' ? 'bg-violet-500/10' : 'bg-violet-50'}`}>
              <BarChart3 className="w-5 h-5 text-violet-500" />
            </div>
            <div>
              <p className={`text-xs font-medium ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>Total Value</p>
              <p className="text-lg font-bold text-violet-500">{formatCurrency(stats.totalValue)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Search, Filters & View Controls */}
      <div className={`p-4 rounded-2xl border space-y-4 ${theme === 'dark' ? 'bg-slate-800/30 border-slate-700/50' : 'bg-white border-slate-200'}`}>
        {/* Top Row - Search and Controls */}
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Search */}
          <div className={`flex items-center gap-2 px-3 sm:px-4 py-2 rounded-xl border flex-1 ${
            theme === 'dark' ? 'bg-slate-800/50 border-slate-700/50' : 'bg-slate-50 border-slate-200'
          }`}>
            <Search className={`w-5 h-5 flex-shrink-0 ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`} />
            <input
              type="text"
              placeholder="Search GRNs..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`bg-transparent border-none outline-none flex-1 min-w-0 text-sm ${
                theme === 'dark' ? 'text-white placeholder-slate-500' : 'text-slate-900 placeholder-slate-400'
              }`}
            />
          </div>

          {/* Controls */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Filter Toggle */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-2 px-3 py-2 rounded-xl transition-colors ${
                showFilters || hasActiveFilters
                  ? 'bg-emerald-500 text-white'
                  : theme === 'dark'
                    ? 'bg-slate-700 hover:bg-slate-600 text-slate-300'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
              }`}
            >
              <Filter className="w-4 h-4" />
              <span className="text-sm hidden sm:inline">Filters</span>
              {hasActiveFilters && (
                <span className="px-1.5 py-0.5 text-xs bg-white/20 rounded-full">
                  {[statusFilter !== 'all', supplierFilter !== 'all', startDate, endDate, minPrice, maxPrice].filter(Boolean).length}
                </span>
              )}
            </button>

            {/* Sort Order */}
            <button
              onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
              className={`p-2 rounded-xl border transition-colors ${
                theme === 'dark'
                  ? 'border-slate-700 hover:bg-slate-800 text-slate-400'
                  : 'border-slate-200 hover:bg-slate-50 text-slate-600'
              }`}
              title={sortOrder === 'asc' ? 'Sort Descending' : 'Sort Ascending'}
            >
              {sortOrder === 'desc' ? <SortDesc className="w-4 h-4" /> : <SortAsc className="w-4 h-4" />}
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
                    : theme === 'dark' ? 'bg-slate-800 hover:bg-slate-700 text-slate-300' : 'bg-white hover:bg-slate-100 text-slate-700'
                }`}
                title="Table view"
              >
                <List className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 transition-colors ${
                  viewMode === 'grid'
                    ? 'bg-emerald-500 text-white'
                    : theme === 'dark' ? 'bg-slate-800 hover:bg-slate-700 text-slate-300' : 'bg-white hover:bg-slate-100 text-slate-700'
                }`}
                title="Card view"
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
            </div>

            {/* Clear Filters */}
            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-xl transition-colors ${
                  theme === 'dark'
                    ? 'text-slate-400 hover:text-white hover:bg-slate-700'
                    : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100'
                }`}
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Clear
              </button>
            )}
          </div>
        </div>

        {/* Expanded Filters */}
        {showFilters && (
          <div className={`pt-4 border-t grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 ${
            theme === 'dark' ? 'border-slate-700/50' : 'border-slate-200'
          }`}>
            {/* Status Filter */}
            <div>
              <label className={`block text-xs font-medium mb-2 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                Status
              </label>
              <SearchableSelect
                value={statusFilter}
                onValueChange={setStatusFilter}
                options={statusOptions}
                placeholder="All Status"
                theme={theme}
              />
            </div>

            {/* Supplier Filter */}
            <div>
              <label className={`block text-xs font-medium mb-2 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                Supplier
              </label>
              <SearchableSelect
                value={supplierFilter}
                onValueChange={setSupplierFilter}
                options={supplierOptions}
                placeholder="All Suppliers"
                theme={theme}
              />
            </div>

            {/* Date Range */}
            <div>
              <label className={`block text-xs font-medium mb-2 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                Date Range
              </label>
              <div className="flex gap-2">
                <div className="relative flex-1" ref={startCalendarRef}>
                  <button
                    onClick={() => {
                      setShowStartCalendar(!showStartCalendar);
                      setShowEndCalendar(false);
                      setCalendarMonth(startDate ? new Date(startDate) : new Date());
                    }}
                    className={`w-full flex items-center gap-2 px-3 py-2.5 rounded-xl border text-sm ${
                      theme === 'dark'
                        ? 'bg-slate-800/50 border-slate-700 text-white'
                        : 'bg-white border-slate-200 text-slate-900'
                    }`}
                  >
                    <Calendar className="w-4 h-4 text-slate-400" />
                    <span className={startDate ? '' : 'text-slate-400'}>
                      {startDate ? formatDateDisplay(startDate) : 'From'}
                    </span>
                  </button>
                  {showStartCalendar && (
                    <CalendarPopup
                      selectedDate={startDate}
                      onSelectDate={setStartDate}
                      onClose={() => setShowStartCalendar(false)}
                    />
                  )}
                </div>
                <div className="relative flex-1" ref={endCalendarRef}>
                  <button
                    onClick={() => {
                      setShowEndCalendar(!showEndCalendar);
                      setShowStartCalendar(false);
                      setCalendarMonth(endDate ? new Date(endDate) : new Date());
                    }}
                    className={`w-full flex items-center gap-2 px-3 py-2.5 rounded-xl border text-sm ${
                      theme === 'dark'
                        ? 'bg-slate-800/50 border-slate-700 text-white'
                        : 'bg-white border-slate-200 text-slate-900'
                    }`}
                  >
                    <Calendar className="w-4 h-4 text-slate-400" />
                    <span className={endDate ? '' : 'text-slate-400'}>
                      {endDate ? formatDateDisplay(endDate) : 'To'}
                    </span>
                  </button>
                  {showEndCalendar && (
                    <CalendarPopup
                      selectedDate={endDate}
                      onSelectDate={setEndDate}
                      onClose={() => setShowEndCalendar(false)}
                    />
                  )}
                </div>
              </div>
            </div>

            {/* Price Range */}
            <div>
              <label className={`block text-xs font-medium mb-2 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                Amount Range
              </label>
              <div className="flex gap-2">
                <div className={`flex items-center gap-1 px-3 py-2.5 rounded-xl border flex-1 ${
                  theme === 'dark' ? 'bg-slate-800/50 border-slate-700' : 'bg-white border-slate-200'
                }`}>
                  <DollarSign className="w-3 h-3 text-slate-400" />
                  <input
                    type="number"
                    value={minPrice}
                    onChange={(e) => setMinPrice(e.target.value)}
                    placeholder="Min"
                    className={`w-full bg-transparent border-none outline-none text-sm ${
                      theme === 'dark' ? 'text-white placeholder-slate-500' : 'text-slate-900 placeholder-slate-400'
                    }`}
                  />
                </div>
                <div className={`flex items-center gap-1 px-3 py-2.5 rounded-xl border flex-1 ${
                  theme === 'dark' ? 'bg-slate-800/50 border-slate-700' : 'bg-white border-slate-200'
                }`}>
                  <DollarSign className="w-3 h-3 text-slate-400" />
                  <input
                    type="number"
                    value={maxPrice}
                    onChange={(e) => setMaxPrice(e.target.value)}
                    placeholder="Max"
                    className={`w-full bg-transparent border-none outline-none text-sm ${
                      theme === 'dark' ? 'text-white placeholder-slate-500' : 'text-slate-900 placeholder-slate-400'
                    }`}
                  />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Grid View */}
      {viewMode === 'grid' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {paginatedGRNs.map(grn => {
            const StatusIcon = grnStatusConfig[grn.status].icon;
            const acceptanceRate = grn.totalReceivedQuantity > 0 
              ? ((grn.totalAcceptedQuantity / grn.totalReceivedQuantity) * 100).toFixed(0)
              : 0;
            
            return (
              <div
                key={grn.id}
                className={`rounded-2xl border p-5 transition-all hover:shadow-lg cursor-pointer group ${
                  theme === 'dark' 
                    ? 'bg-slate-800/30 border-slate-700/50 hover:border-emerald-500/50' 
                    : 'bg-white border-slate-200 hover:border-emerald-500/50 hover:shadow-emerald-500/10'
                }`}
                onClick={() => handleViewGRN(grn)}
              >
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-11 h-11 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110 ${grnStatusConfig[grn.status].bgColor}`}>
                      <ClipboardCheck className={`w-5 h-5 ${grnStatusConfig[grn.status].color}`} />
                    </div>
                    <div>
                      <p className={`font-semibold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                        {grn.grnNumber}
                      </p>
                      <div className="flex items-center gap-1">
                        <Truck className={`w-3 h-3 ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`} />
                        <p className={`text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                          {grn.supplierName}
                        </p>
                      </div>
                    </div>
                  </div>
                  <span className={`px-2.5 py-1 rounded-lg text-xs font-medium flex items-center gap-1.5 ${grnStatusConfig[grn.status].bgColor} ${grnStatusConfig[grn.status].color}`}>
                    <StatusIcon className="w-3.5 h-3.5" />
                    {grnStatusConfig[grn.status].label}
                  </span>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-3 gap-3 mb-4">
                  <div className={`p-2.5 rounded-lg text-center ${theme === 'dark' ? 'bg-slate-700/50' : 'bg-slate-50'}`}>
                    <p className={`text-xs ${theme === 'dark' ? 'text-slate-500' : 'text-slate-500'}`}>Ordered</p>
                    <p className={`font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>{grn.totalOrderedQuantity}</p>
                  </div>
                  <div className={`p-2.5 rounded-lg text-center ${theme === 'dark' ? 'bg-emerald-500/10' : 'bg-emerald-50'}`}>
                    <p className={`text-xs ${theme === 'dark' ? 'text-emerald-400' : 'text-emerald-600'}`}>Accepted</p>
                    <p className="font-bold text-emerald-500">{grn.totalAcceptedQuantity}</p>
                  </div>
                  <div className={`p-2.5 rounded-lg text-center ${theme === 'dark' ? 'bg-red-500/10' : 'bg-red-50'}`}>
                    <p className={`text-xs ${theme === 'dark' ? 'text-red-400' : 'text-red-600'}`}>Rejected</p>
                    <p className="font-bold text-red-500">{grn.totalRejectedQuantity}</p>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="mb-4">
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <span className={theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}>Acceptance Rate</span>
                    <span className="font-semibold text-emerald-500">{acceptanceRate}%</span>
                  </div>
                  <div className={`h-2 rounded-full overflow-hidden ${theme === 'dark' ? 'bg-slate-700' : 'bg-slate-200'}`}>
                    <div 
                      className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 transition-all duration-500"
                      style={{ width: `${acceptanceRate}%` }}
                    />
                  </div>
                </div>

                {/* Payment & Discount Row */}
                {(grn.paymentMethod || grn.totalDiscount || grn.discountAmount) && (
                  <div className="flex items-center justify-between gap-2 mb-3">
                    {/* Payment Method & Status */}
                    {grn.paymentMethod && (
                      <div className="flex items-center gap-1.5">
                        {(() => {
                          const config = paymentMethodIcons[grn.paymentMethod];
                          const Icon = config?.icon || CreditCard;
                          return (
                            <div className={`flex items-center gap-1 px-2 py-1 rounded-lg ${config?.bgColor || 'bg-slate-500/10'}`}>
                              <Icon className={`w-3.5 h-3.5 ${config?.color || 'text-slate-500'}`} />
                              <span className={`text-xs font-medium capitalize ${config?.color || 'text-slate-500'}`}>
                                {grn.paymentMethod}
                              </span>
                            </div>
                          );
                        })()}
                        {grn.paymentStatus && (
                          <span className={`text-xs px-2 py-1 rounded-lg font-medium ${paymentStatusConfig[grn.paymentStatus]?.bgColor || 'bg-slate-500/10'} ${paymentStatusConfig[grn.paymentStatus]?.color || 'text-slate-500'}`}>
                            {paymentStatusConfig[grn.paymentStatus]?.label || grn.paymentStatus}
                          </span>
                        )}
                      </div>
                    )}
                    {/* Discount Badge */}
                    {((grn.totalDiscount || 0) + (grn.discountAmount || 0)) > 0 && (
                      <div className={`flex items-center gap-1 px-2 py-1 rounded-lg ${theme === 'dark' ? 'bg-orange-500/10' : 'bg-orange-50'}`}>
                        <BadgePercent className="w-3.5 h-3.5 text-orange-500" />
                        <span className="text-xs font-medium text-orange-500">
                          -{formatCurrency((grn.totalDiscount || 0) + (grn.discountAmount || 0))}
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {/* Footer */}
                <div className="flex items-center justify-between pt-3 border-t border-slate-700/30">
                  <div className={`flex items-center gap-1 text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                    <Calendar className="w-3.5 h-3.5" />
                    {formatDate(grn.receivedDate || grn.expectedDeliveryDate || grn.orderDate)}
                  </div>
                  <p className={`font-bold ${theme === 'dark' ? 'text-emerald-400' : 'text-emerald-600'}`}>
                    {formatCurrency(grn.totalAmount)}
                  </p>
                </div>

                {/* Quick Actions - Always Visible */}
                <div className="flex gap-2 mt-3">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleViewGRN(grn);
                    }}
                    className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      theme === 'dark' 
                        ? 'bg-slate-700 hover:bg-slate-600 text-slate-300'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                    }`}
                  >
                    <Eye className="w-4 h-4" />
                    View
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleEditGRN(grn);
                    }}
                    className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      theme === 'dark' 
                        ? 'bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400'
                        : 'bg-emerald-100 hover:bg-emerald-200 text-emerald-700'
                    }`}
                  >
                    <Edit className="w-4 h-4" />
                    Edit
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteGRN(grn);
                    }}
                    className={`flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      theme === 'dark' 
                        ? 'bg-red-500/20 hover:bg-red-500/30 text-red-400'
                        : 'bg-red-100 hover:bg-red-200 text-red-700'
                    }`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Table View */}
      {viewMode === 'table' && (
        <div className={`rounded-2xl border overflow-hidden ${theme === 'dark' ? 'border-slate-700/50' : 'border-slate-200'}`}>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className={theme === 'dark' ? 'bg-slate-800/50' : 'bg-slate-50'}>
                <tr>
                  <th className={`text-left px-4 py-3 text-xs font-semibold uppercase ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>GRN Number</th>
                  <th className={`text-left px-4 py-3 text-xs font-semibold uppercase ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>Supplier</th>
                  <th className={`text-left px-4 py-3 text-xs font-semibold uppercase ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>Order Date</th>
                  <th className={`text-center px-4 py-3 text-xs font-semibold uppercase ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>Qty</th>
                  <th className={`text-center px-4 py-3 text-xs font-semibold uppercase ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>Payment</th>
                  <th className={`text-center px-4 py-3 text-xs font-semibold uppercase ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>Discount</th>
                  <th className={`text-left px-4 py-3 text-xs font-semibold uppercase ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>Status</th>
                  <th className={`text-right px-4 py-3 text-xs font-semibold uppercase ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>Amount</th>
                  <th className={`text-center px-4 py-3 text-xs font-semibold uppercase ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/30">
                {paginatedGRNs.map(grn => {
                  const StatusIcon = grnStatusConfig[grn.status].icon;
                  return (
                    <tr 
                      key={grn.id} 
                      className={`transition-colors cursor-pointer ${
                        theme === 'dark' ? 'hover:bg-slate-800/50' : 'hover:bg-slate-50'
                      }`}
                      onClick={() => handleViewGRN(grn)}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${grnStatusConfig[grn.status].bgColor}`}>
                            <ClipboardCheck className={`w-4 h-4 ${grnStatusConfig[grn.status].color}`} />
                          </div>
                          <span className={`font-medium ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                            {grn.grnNumber}
                          </span>
                        </div>
                      </td>
                      <td className={`px-4 py-3 ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                        <div className="flex items-center gap-2">
                          <Building2 className="w-4 h-4 text-slate-400" />
                          {grn.supplierName}
                        </div>
                      </td>
                      <td className={`px-4 py-3 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                        {formatDate(grn.orderDate)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex flex-col items-center gap-0.5">
                          <span className={`font-medium ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                            {grn.totalOrderedQuantity}
                          </span>
                          <span className="text-xs text-emerald-500">
                            {grn.totalAcceptedQuantity} acc
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        {grn.paymentMethod ? (
                          <div className="flex flex-col items-center gap-1">
                            {(() => {
                              const config = paymentMethodIcons[grn.paymentMethod];
                              const Icon = config?.icon || CreditCard;
                              return (
                                <div className={`flex items-center gap-1 px-2 py-1 rounded-lg ${config?.bgColor || 'bg-slate-500/10'}`}>
                                  <Icon className={`w-3.5 h-3.5 ${config?.color || 'text-slate-500'}`} />
                                  <span className={`text-xs font-medium capitalize ${config?.color || 'text-slate-500'}`}>
                                    {grn.paymentMethod}
                                  </span>
                                </div>
                              );
                            })()}
                            {grn.paymentStatus && (
                              <span className={`text-xs px-2 py-0.5 rounded font-medium ${paymentStatusConfig[grn.paymentStatus]?.bgColor || 'bg-slate-500/10'} ${paymentStatusConfig[grn.paymentStatus]?.color || 'text-slate-500'}`}>
                                {paymentStatusConfig[grn.paymentStatus]?.label || grn.paymentStatus}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className={`text-xs ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>-</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {((grn.totalDiscount || 0) + (grn.discountAmount || 0)) > 0 ? (
                          <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg ${theme === 'dark' ? 'bg-orange-500/10' : 'bg-orange-50'}`}>
                            <BadgePercent className="w-3.5 h-3.5 text-orange-500" />
                            <span className="text-xs font-medium text-orange-500">
                              {formatCurrency((grn.totalDiscount || 0) + (grn.discountAmount || 0))}
                            </span>
                          </div>
                        ) : (
                          <span className={`text-xs ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>-</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium ${grnStatusConfig[grn.status].bgColor} ${grnStatusConfig[grn.status].color}`}>
                          <StatusIcon className="w-3.5 h-3.5" />
                          {grnStatusConfig[grn.status].label}
                        </span>
                      </td>
                      <td className={`px-4 py-3 text-right font-bold ${theme === 'dark' ? 'text-emerald-400' : 'text-emerald-600'}`}>
                        {formatCurrency(grn.totalAmount)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleViewGRN(grn);
                            }}
                            className={`p-2 rounded-lg transition-colors ${
                              theme === 'dark' ? 'hover:bg-slate-700 text-slate-400' : 'hover:bg-slate-100 text-slate-600'
                            }`}
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEditGRN(grn);
                            }}
                            className={`p-2 rounded-lg transition-colors ${
                              theme === 'dark' ? 'hover:bg-emerald-500/20 text-emerald-400' : 'hover:bg-emerald-100 text-emerald-600'
                            }`}
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Empty State */}
      {filteredGRNs.length === 0 && (
        <div className={`text-center py-16 rounded-2xl border ${theme === 'dark' ? 'bg-slate-800/30 border-slate-700/50' : 'bg-white border-slate-200'}`}>
          <div className={`w-16 h-16 mx-auto mb-4 rounded-2xl flex items-center justify-center ${theme === 'dark' ? 'bg-slate-700' : 'bg-slate-100'}`}>
            <ClipboardCheck className={`w-8 h-8 ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`} />
          </div>
          <p className={`font-medium text-lg ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>No GRNs found</p>
          <p className={`text-sm mt-1 ${theme === 'dark' ? 'text-slate-500' : 'text-slate-500'}`}>
            {hasActiveFilters ? 'Try adjusting your filters' : 'Create a new GRN to track goods received from suppliers'}
          </p>
          {hasActiveFilters ? (
            <button
              onClick={clearFilters}
              className="mt-4 px-5 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-xl text-sm font-medium hover:opacity-90 transition-opacity shadow-lg shadow-emerald-500/25"
            >
              <RefreshCw className="w-4 h-4 inline mr-2" />
              Clear Filters
            </button>
          ) : (
            <button
              onClick={handleCreateGRN}
              className="mt-4 px-5 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-xl text-sm font-medium hover:opacity-90 transition-opacity shadow-lg shadow-emerald-500/25"
            >
              <Plus className="w-4 h-4 inline mr-2" />
              Create GRN
            </button>
          )}
        </div>
      )}

      {/* Pagination */}
      <div className={`mt-4 p-4 rounded-2xl border ${
        theme === 'dark' ? 'bg-slate-800/30 border-slate-700/50' : 'bg-white border-slate-200'
      }`}>
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
          {/* Left side - Info and Items Per Page */}
          <div className="flex flex-wrap items-center gap-4">
            {/* Result Info */}
            <p className={`text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
              Showing {filteredGRNs.length > 0 ? ((currentPage - 1) * itemsPerPage) + 1 : 0} to {Math.min(currentPage * itemsPerPage, filteredGRNs.length)} of {filteredGRNs.length} GRNs
            </p>
            
            {/* Items Per Page Selector */}
            <div className="flex items-center gap-2">
              <span className={`text-sm ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>Show:</span>
              <div className={`flex items-center rounded-full p-0.5 ${
                theme === 'dark' ? 'bg-slate-800' : 'bg-slate-100'
              }`}>
                {[6, 9, 12, 18].map((num) => (
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

          {/* Right side - Pagination Controls */}
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
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
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

      {/* Modals */}
      <GRNFormModal
        isOpen={isFormModalOpen}
        grn={selectedGRN || undefined}
        suppliers={suppliers}
        onClose={() => setIsFormModalOpen(false)}
        onSave={handleSaveGRN}
      />

      <GRNViewModal
        isOpen={isViewModalOpen}
        grn={selectedGRN}
        onClose={() => setIsViewModalOpen(false)}
        onEdit={(grn) => {
          setIsViewModalOpen(false);
          handleEditGRN(grn);
        }}
      />

      <DeleteConfirmationModal
        isOpen={isDeleteModalOpen}
        title="Delete GRN"
        message="Are you sure you want to delete this GRN? This action cannot be undone."
        itemName={grnToDelete?.grnNumber}
        onConfirm={confirmDeleteGRN}
        onCancel={() => {
          setIsDeleteModalOpen(false);
          setGrnToDelete(null);
        }}
      />
    </div>
  );
};
