import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../contexts/ThemeContext';
import { mockQuotations } from '../data/mockData';
import type { Quotation, QuotationStatus } from '../data/mockData';
import { DeleteConfirmationModal } from '../components/modals/DeleteConfirmationModal';
import { SearchableSelect } from '../components/ui/searchable-select';
import {
  FileText, Plus, Search, Eye, Edit, Trash2, Copy,
  Clock, User, Package, Calendar, DollarSign, CheckCircle,
  ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, X,
  SortAsc, SortDesc, Filter, RefreshCw, LayoutGrid, List,
  Send, XCircle, AlertTriangle, Phone, TrendingUp,
  Receipt, Target, Zap, BarChart3, Sparkles, MessageCircle
} from 'lucide-react';

type ViewMode = 'grid' | 'table';

const statusConfig: Record<QuotationStatus, { label: string; color: string; bgColor: string; borderColor: string; icon: React.ReactNode }> = {
  'draft': { label: 'Draft', color: 'text-slate-500', bgColor: 'bg-slate-500/10', borderColor: 'border-slate-500/30', icon: <FileText className="w-3.5 h-3.5" /> },
  'pending_approval': { label: 'Pending Approval', color: 'text-amber-500', bgColor: 'bg-amber-500/10', borderColor: 'border-amber-500/30', icon: <Clock className="w-3.5 h-3.5" /> },
  'sent': { label: 'Sent', color: 'text-blue-500', bgColor: 'bg-blue-500/10', borderColor: 'border-blue-500/30', icon: <Send className="w-3.5 h-3.5" /> },
  'viewed': { label: 'Viewed', color: 'text-purple-500', bgColor: 'bg-purple-500/10', borderColor: 'border-purple-500/30', icon: <Eye className="w-3.5 h-3.5" /> },
  'negotiating': { label: 'Negotiating', color: 'text-orange-500', bgColor: 'bg-orange-500/10', borderColor: 'border-orange-500/30', icon: <MessageCircle className="w-3.5 h-3.5" /> },
  'accepted': { label: 'Accepted', color: 'text-emerald-500', bgColor: 'bg-emerald-500/10', borderColor: 'border-emerald-500/30', icon: <CheckCircle className="w-3.5 h-3.5" /> },
  'rejected': { label: 'Rejected', color: 'text-red-500', bgColor: 'bg-red-500/10', borderColor: 'border-red-500/30', icon: <XCircle className="w-3.5 h-3.5" /> },
  'expired': { label: 'Expired', color: 'text-gray-500', bgColor: 'bg-gray-500/10', borderColor: 'border-gray-500/30', icon: <AlertTriangle className="w-3.5 h-3.5" /> },
  'converted': { label: 'Converted', color: 'text-teal-500', bgColor: 'bg-teal-500/10', borderColor: 'border-teal-500/30', icon: <Target className="w-3.5 h-3.5" /> },
};

export const Quotations: React.FC = () => {
  const { theme } = useTheme();
  const navigate = useNavigate();
  const [quotations, setQuotations] = useState<Quotation[]>(mockQuotations);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [showStartCalendar, setShowStartCalendar] = useState(false);
  const [showEndCalendar, setShowEndCalendar] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState(new Date());
  const startCalendarRef = useRef<HTMLDivElement>(null);
  const endCalendarRef = useRef<HTMLDivElement>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [showFilters, setShowFilters] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(9);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [quotationToDelete, setQuotationToDelete] = useState<Quotation | null>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (startCalendarRef.current && !startCalendarRef.current.contains(event.target as Node)) setShowStartCalendar(false);
      if (endCalendarRef.current && !endCalendarRef.current.contains(event.target as Node)) setShowEndCalendar(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filtered quotations
  const filteredQuotations = useMemo(() => {
    const filtered = quotations.filter(q => {
      const matchesSearch = q.quotationNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        q.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        q.customerPhone.includes(searchQuery);
      const matchesStatus = statusFilter === 'all' || q.status === statusFilter;
      let matchesDate = true;
      if (startDate || endDate) {
        const qDate = new Date(q.quotationDate);
        if (startDate) { const start = new Date(startDate); start.setHours(0,0,0,0); matchesDate = matchesDate && qDate >= start; }
        if (endDate) { const end = new Date(endDate); end.setHours(23,59,59,999); matchesDate = matchesDate && qDate <= end; }
      }
      return matchesSearch && matchesStatus && matchesDate;
    });
    return filtered.sort((a, b) => {
      const dateA = new Date(a.quotationDate).getTime();
      const dateB = new Date(b.quotationDate).getTime();
      return sortOrder === 'asc' ? dateA - dateB : dateB - dateA;
    });
  }, [quotations, searchQuery, statusFilter, startDate, endDate, sortOrder]);

  // Pagination
  const totalPages = Math.ceil(filteredQuotations.length / itemsPerPage);
  const paginatedQuotations = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredQuotations.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredQuotations, currentPage, itemsPerPage]);

  useEffect(() => { setCurrentPage(1); }, [searchQuery, statusFilter, startDate, endDate]);
  useEffect(() => { 
    setItemsPerPage(viewMode === 'table' ? 10 : 9);
    setCurrentPage(1); 
  }, [viewMode]);

  // Page numbers
  const getPageNumbers = useMemo(() => {
    const pages: (number | string)[] = [];
    if (totalPages <= 5) { for (let i = 1; i <= totalPages; i++) pages.push(i); }
    else {
      if (currentPage <= 3) { for (let i = 1; i <= 4; i++) pages.push(i); pages.push('...'); pages.push(totalPages); }
      else if (currentPage >= totalPages - 2) { pages.push(1); pages.push('...'); for (let i = totalPages - 3; i <= totalPages; i++) pages.push(i); }
      else { pages.push(1); pages.push('...'); for (let i = currentPage - 1; i <= currentPage + 1; i++) pages.push(i); pages.push('...'); pages.push(totalPages); }
    }
    return pages;
  }, [currentPage, totalPages]);

  // Statistics
  const stats = useMemo(() => {
    const draft = quotations.filter(q => q.status === 'draft').length;
    const sent = quotations.filter(q => q.status === 'sent').length;
    const accepted = quotations.filter(q => q.status === 'accepted').length;
    const rejected = quotations.filter(q => q.status === 'rejected').length;
    const expired = quotations.filter(q => q.status === 'expired').length;
    const totalValue = quotations.reduce((sum, q) => sum + q.total, 0);
    const acceptedValue = quotations.filter(q => q.status === 'accepted').reduce((sum, q) => sum + q.total, 0);
    const pendingValue = quotations.filter(q => q.status === 'sent').reduce((sum, q) => sum + q.total, 0);
    const acceptanceRate = quotations.length > 0 ? Math.round((accepted / quotations.length) * 100) : 0;
    const avgValue = quotations.length > 0 ? totalValue / quotations.length : 0;
    return { total: quotations.length, draft, sent, accepted, rejected, expired, totalValue, acceptedValue, pendingValue, acceptanceRate, avgValue };
  }, [quotations]);

  const hasActiveFilters = searchQuery || statusFilter !== 'all' || startDate || endDate;
  const clearFilters = () => { setSearchQuery(''); setStatusFilter('all'); setStartDate(''); setEndDate(''); };
  const formatCurrency = (amount: number) => `Rs. ${amount.toLocaleString('en-LK')}`;
  const formatDate = (dateString: string) => new Date(dateString).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

  // Calendar helpers
  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear(); const month = date.getMonth();
    const firstDay = new Date(year, month, 1); const lastDay = new Date(year, month + 1, 0);
    return { daysInMonth: lastDay.getDate(), startingDay: firstDay.getDay() };
  };
  const formatDateDisplay = (dateStr: string) => dateStr ? new Date(dateStr).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '';

  const renderCalendar = (selectedDate: string, setSelectedDate: (date: string) => void, setShowCalendar: (show: boolean) => void) => {
    const { daysInMonth, startingDay } = getDaysInMonth(calendarMonth);
    const days = [];
    const selectedDateObj = selectedDate ? new Date(selectedDate) : null;
    for (let i = 0; i < startingDay; i++) days.push(<div key={`empty-${i}`} className="w-8 h-8" />);
    for (let day = 1; day <= daysInMonth; day++) {
      const currentDate = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth(), day);
      const isSelected = selectedDateObj && currentDate.toDateString() === selectedDateObj.toDateString();
      const isToday = new Date().toDateString() === currentDate.toDateString();
      days.push(
        <button key={day} onClick={() => { setSelectedDate(`${currentDate.getFullYear()}-${(currentDate.getMonth()+1).toString().padStart(2,'0')}-${day.toString().padStart(2,'0')}`); setShowCalendar(false); }}
          className={`w-8 h-8 rounded-lg text-sm font-medium transition-all ${isSelected ? 'bg-emerald-500 text-white' : isToday ? theme === 'dark' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-emerald-100 text-emerald-600' : theme === 'dark' ? 'hover:bg-slate-700 text-slate-300' : 'hover:bg-slate-100 text-slate-700'}`}>
          {day}
        </button>
      );
    }
    return (
      <div className={`absolute top-full left-0 mt-2 p-3 rounded-xl border shadow-xl z-50 min-w-[280px] ${theme === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
        <div className="flex items-center justify-between mb-3">
          <button onClick={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() - 1, 1))} className={`p-1 rounded-lg ${theme === 'dark' ? 'hover:bg-slate-700 text-slate-400' : 'hover:bg-slate-100 text-slate-600'}`}><ChevronLeft className="w-4 h-4" /></button>
          <span className={`text-sm font-semibold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>{calendarMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</span>
          <button onClick={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 1))} className={`p-1 rounded-lg ${theme === 'dark' ? 'hover:bg-slate-700 text-slate-400' : 'hover:bg-slate-100 text-slate-600'}`}><ChevronRight className="w-4 h-4" /></button>
        </div>
        <div className="grid grid-cols-7 gap-1 mb-2">{['Su','Mo','Tu','We','Th','Fr','Sa'].map(d => <div key={d} className={`w-8 h-8 flex items-center justify-center text-xs font-medium ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>{d}</div>)}</div>
        <div className="grid grid-cols-7 gap-1">{days}</div>
        <button onClick={() => { setSelectedDate(''); setShowCalendar(false); }} className={`w-full mt-3 py-2 text-sm font-medium rounded-lg ${theme === 'dark' ? 'bg-slate-700 hover:bg-slate-600 text-slate-300' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'}`}>Clear</button>
      </div>
    );
  };

  // Action handlers
  const handleView = (q: Quotation) => navigate(`/quotations/edit/${q.id}`, { state: { viewMode: true } });
  const handleEdit = (q: Quotation) => navigate(`/quotations/edit/${q.id}`);
  const handleDuplicate = (q: Quotation) => navigate('/quotations/create', { state: { duplicateFrom: q } });
  const handleDelete = (q: Quotation) => { setQuotationToDelete(q); setIsDeleteModalOpen(true); };
  const confirmDelete = () => { if (quotationToDelete) { setQuotations(prev => prev.filter(q => q.id !== quotationToDelete.id)); setIsDeleteModalOpen(false); setQuotationToDelete(null); } };
  
  // WhatsApp share
  const handleWhatsAppShare = (q: Quotation) => {
    const message = `📋 *QUOTATION - ${q.quotationNumber}*\n\n` +
      `Dear ${q.customerName},\n\n` +
      `Thank you for your inquiry. Please find your quotation details below:\n\n` +
      `📅 Date: ${formatDate(q.quotationDate)}\n` +
      `⏰ Valid Until: ${formatDate(q.expiryDate)}\n` +
      `📦 Items: ${q.items.length}\n` +
      `💰 *Total: ${formatCurrency(q.total)}*\n\n` +
      `For full details, please visit our shop or contact us.\n\n` +
      `Thank you!\n*ECOTEC Computer Shop*\n📞 011-2345678`;
    const phone = '94783233760';
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, '_blank');
  };

  const statusOptions = [
    { value: 'all', label: 'All Status' },
    ...Object.entries(statusConfig).map(([k, v]) => ({ value: k, label: v.label }))
  ];

  return (
    <div className="space-y-6 pb-8">
      {/* Page Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 shadow-lg shadow-emerald-500/20`}>
              <Receipt className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className={`text-2xl lg:text-3xl font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                Quotations
              </h1>
              <p className={`text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                Create & manage price quotations for customers
              </p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/quotations/create')} className="relative group flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-emerald-500 via-teal-500 to-blue-500 text-white rounded-xl font-medium shadow-lg hover:shadow-emerald-500/30 hover:scale-[1.02] transition-all overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-blue-500 via-teal-500 to-emerald-500 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <Plus className="w-5 h-5 relative z-10" />
            <span className="relative z-10">Create Quotation</span>
          </button>
        </div>
      </div>

      {/* Statistics Cards - Modern Design */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Value Card */}
        <div className={`relative overflow-hidden p-5 rounded-2xl border ${theme === 'dark' ? 'bg-gradient-to-br from-slate-800/80 to-slate-900/80 border-slate-700/50' : 'bg-white border-slate-200 shadow-sm'}`}>
          <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-emerald-500/20 to-teal-500/10 rounded-full blur-2xl" />
          <div className="relative">
            <div className="flex items-center justify-between mb-3">
              <div className={`p-2 rounded-xl ${theme === 'dark' ? 'bg-emerald-500/10' : 'bg-emerald-50'}`}>
                <DollarSign className="w-5 h-5 text-emerald-500" />
              </div>
              <span className={`flex items-center gap-1 text-xs font-medium ${theme === 'dark' ? 'text-emerald-400' : 'text-emerald-600'}`}>
                <TrendingUp className="w-3 h-3" /> Total
              </span>
            </div>
            <p className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
              {formatCurrency(stats.totalValue)}
            </p>
            <p className={`text-xs mt-1 ${theme === 'dark' ? 'text-slate-500' : 'text-slate-500'}`}>
              {stats.total} quotations
            </p>
          </div>
        </div>

        {/* Accepted Value Card */}
        <div className={`relative overflow-hidden p-5 rounded-2xl border ${theme === 'dark' ? 'bg-gradient-to-br from-slate-800/80 to-slate-900/80 border-slate-700/50' : 'bg-white border-slate-200 shadow-sm'}`}>
          <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-green-500/20 to-emerald-500/10 rounded-full blur-2xl" />
          <div className="relative">
            <div className="flex items-center justify-between mb-3">
              <div className={`p-2 rounded-xl ${theme === 'dark' ? 'bg-green-500/10' : 'bg-green-50'}`}>
                <CheckCircle className="w-5 h-5 text-green-500" />
              </div>
              <span className={`flex items-center gap-1 text-xs font-medium ${theme === 'dark' ? 'text-green-400' : 'text-green-600'}`}>
                <Sparkles className="w-3 h-3" /> Won
              </span>
            </div>
            <p className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
              {formatCurrency(stats.acceptedValue)}
            </p>
            <p className={`text-xs mt-1 ${theme === 'dark' ? 'text-slate-500' : 'text-slate-500'}`}>
              {stats.accepted} accepted
            </p>
          </div>
        </div>

        {/* Pending Value Card */}
        <div className={`relative overflow-hidden p-5 rounded-2xl border ${theme === 'dark' ? 'bg-gradient-to-br from-slate-800/80 to-slate-900/80 border-slate-700/50' : 'bg-white border-slate-200 shadow-sm'}`}>
          <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-blue-500/20 to-cyan-500/10 rounded-full blur-2xl" />
          <div className="relative">
            <div className="flex items-center justify-between mb-3">
              <div className={`p-2 rounded-xl ${theme === 'dark' ? 'bg-blue-500/10' : 'bg-blue-50'}`}>
                <Clock className="w-5 h-5 text-blue-500" />
              </div>
              <span className={`flex items-center gap-1 text-xs font-medium ${theme === 'dark' ? 'text-blue-400' : 'text-blue-600'}`}>
                <Target className="w-3 h-3" /> Pipeline
              </span>
            </div>
            <p className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
              {formatCurrency(stats.pendingValue)}
            </p>
            <p className={`text-xs mt-1 ${theme === 'dark' ? 'text-slate-500' : 'text-slate-500'}`}>
              {stats.sent} pending
            </p>
          </div>
        </div>

        {/* Acceptance Rate Card */}
        <div className={`relative overflow-hidden p-5 rounded-2xl border ${theme === 'dark' ? 'bg-gradient-to-br from-slate-800/80 to-slate-900/80 border-slate-700/50' : 'bg-white border-slate-200 shadow-sm'}`}>
          <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-purple-500/20 to-pink-500/10 rounded-full blur-2xl" />
          <div className="relative">
            <div className="flex items-center justify-between mb-3">
              <div className={`p-2 rounded-xl ${theme === 'dark' ? 'bg-purple-500/10' : 'bg-purple-50'}`}>
                <BarChart3 className="w-5 h-5 text-purple-500" />
              </div>
              <span className={`flex items-center gap-1 text-xs font-medium ${theme === 'dark' ? 'text-purple-400' : 'text-purple-600'}`}>
                <Zap className="w-3 h-3" /> Rate
              </span>
            </div>
            <p className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
              {stats.acceptanceRate}%
            </p>
            <p className={`text-xs mt-1 ${theme === 'dark' ? 'text-slate-500' : 'text-slate-500'}`}>
              Conversion rate
            </p>
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className={`p-4 rounded-2xl border ${theme === 'dark' ? 'bg-slate-800/30 border-slate-700/50' : 'bg-white border-slate-200 shadow-sm'}`}>
        <div className="flex flex-col lg:flex-row gap-3">
          {/* Search Input */}
          <div className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border flex-1 ${theme === 'dark' ? 'bg-slate-800/50 border-slate-700/50' : 'bg-slate-50 border-slate-200'}`}>
            <Search className={`w-5 h-5 flex-shrink-0 ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`} />
            <input
              type="text"
              placeholder="Search by quotation #, customer name, phone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`bg-transparent border-none outline-none flex-1 min-w-0 text-sm ${theme === 'dark' ? 'text-white placeholder-slate-500' : 'text-slate-900 placeholder-slate-400'}`}
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className={`p-1 rounded-full transition-colors ${theme === 'dark' ? 'hover:bg-slate-700' : 'hover:bg-slate-200'}`}>
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            <button onClick={() => setShowFilters(!showFilters)} className={`flex items-center gap-2 px-3 py-2.5 rounded-xl transition-all ${showFilters || hasActiveFilters ? 'bg-emerald-500 text-white' : theme === 'dark' ? 'bg-slate-700 hover:bg-slate-600 text-slate-300' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'}`}>
              <Filter className="w-4 h-4" />
              <span className="text-sm hidden sm:inline">Filters</span>
              {hasActiveFilters && <span className="px-1.5 py-0.5 text-xs bg-white/20 rounded-full">{[statusFilter !== 'all', startDate, endDate].filter(Boolean).length}</span>}
            </button>

            <button onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')} className={`p-2.5 rounded-xl border transition-colors ${theme === 'dark' ? 'border-slate-700 hover:bg-slate-800 text-slate-400' : 'border-slate-200 hover:bg-slate-50 text-slate-600'}`} title={sortOrder === 'asc' ? 'Sort Descending' : 'Sort Ascending'}>
              {sortOrder === 'asc' ? <SortAsc className="w-4 h-4" /> : <SortDesc className="w-4 h-4" />}
            </button>

            <div className={`flex items-center rounded-xl overflow-hidden border ${theme === 'dark' ? 'border-slate-700' : 'border-slate-200'}`}>
              <button onClick={() => setViewMode('table')} className={`p-2.5 transition-colors ${viewMode === 'table' ? 'bg-emerald-500 text-white' : theme === 'dark' ? 'bg-slate-800 hover:bg-slate-700 text-slate-300' : 'bg-white hover:bg-slate-100 text-slate-700'}`} title="Table view">
                <List className="w-4 h-4" />
              </button>
              <button onClick={() => setViewMode('grid')} className={`p-2.5 transition-colors ${viewMode === 'grid' ? 'bg-emerald-500 text-white' : theme === 'dark' ? 'bg-slate-800 hover:bg-slate-700 text-slate-300' : 'bg-white hover:bg-slate-100 text-slate-700'}`} title="Card view">
                <LayoutGrid className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Expanded Filters */}
        {showFilters && (
          <div className={`pt-4 mt-4 border-t ${theme === 'dark' ? 'border-slate-700/50' : 'border-slate-200'}`}>
            <div className="flex flex-wrap items-center gap-3">
              <div className="w-full sm:w-40">
                <SearchableSelect options={statusOptions} value={statusFilter} onValueChange={setStatusFilter} placeholder="All Status" theme={theme} />
              </div>
              <div className="flex items-center gap-2">
                <Calendar className={`w-4 h-4 flex-shrink-0 ${theme === 'dark' ? 'text-emerald-500' : 'text-emerald-600'}`} />
                <span className={`text-sm font-medium ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>Date:</span>
                <div className="relative" ref={startCalendarRef}>
                  <button onClick={() => { setShowStartCalendar(!showStartCalendar); setShowEndCalendar(false); setCalendarMonth(startDate ? new Date(startDate) : new Date()); }} className={`px-3 py-1.5 rounded-xl border text-sm min-w-[110px] text-left transition-colors ${theme === 'dark' ? 'bg-slate-800/50 border-slate-700/50 text-white hover:bg-slate-700/50' : 'bg-slate-50 border-slate-200 text-slate-900 hover:bg-slate-100'}`}>
                    {startDate ? formatDateDisplay(startDate) : 'Start Date'}
                  </button>
                  {showStartCalendar && renderCalendar(startDate, setStartDate, setShowStartCalendar)}
                </div>
                <span className={theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}>-</span>
                <div className="relative" ref={endCalendarRef}>
                  <button onClick={() => { setShowEndCalendar(!showEndCalendar); setShowStartCalendar(false); setCalendarMonth(endDate ? new Date(endDate) : new Date()); }} className={`px-3 py-1.5 rounded-xl border text-sm min-w-[110px] text-left transition-colors ${theme === 'dark' ? 'bg-slate-800/50 border-slate-700/50 text-white hover:bg-slate-700/50' : 'bg-slate-50 border-slate-200 text-slate-900 hover:bg-slate-100'}`}>
                    {endDate ? formatDateDisplay(endDate) : 'End Date'}
                  </button>
                  {showEndCalendar && renderCalendar(endDate, setEndDate, setShowEndCalendar)}
                </div>
              </div>
              {hasActiveFilters && (
                <button onClick={clearFilters} className={`px-3 py-1.5 rounded-xl text-sm font-medium transition-colors ${theme === 'dark' ? 'bg-slate-700 hover:bg-slate-600 text-slate-300' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'}`}>
                  Clear All
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Grid View */}
      {viewMode === 'grid' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {paginatedQuotations.map((q) => (
            <div key={q.id} className={`group relative overflow-hidden p-5 rounded-2xl border transition-all hover:shadow-xl ${theme === 'dark' ? 'bg-gradient-to-br from-slate-800/50 to-slate-900/50 border-slate-700/50 hover:border-emerald-500/30' : 'bg-white border-slate-200 hover:border-emerald-300 shadow-sm'}`}>
              {/* Accent Corner */}
              <div className={`absolute top-0 right-0 w-20 h-20 bg-gradient-to-br ${statusConfig[q.status].bgColor} rounded-full blur-2xl opacity-50 group-hover:opacity-100 transition-opacity`} />
              
              <div className="relative">
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className={`p-2.5 rounded-xl ${theme === 'dark' ? 'bg-slate-700/50' : 'bg-slate-100'}`}>
                      <FileText className={`w-5 h-5 ${theme === 'dark' ? 'text-emerald-400' : 'text-emerald-600'}`} />
                    </div>
                    <div>
                      <p className={`font-mono font-bold text-sm ${theme === 'dark' ? 'text-emerald-400' : 'text-emerald-600'}`}>{q.quotationNumber}</p>
                      <p className={`text-xs ${theme === 'dark' ? 'text-slate-500' : 'text-slate-500'}`}>{formatDate(q.quotationDate)}</p>
                    </div>
                  </div>
                  <span className={`px-2.5 py-1 rounded-full text-xs font-medium inline-flex items-center gap-1.5 border ${statusConfig[q.status].bgColor} ${statusConfig[q.status].color} ${statusConfig[q.status].borderColor}`}>
                    {statusConfig[q.status].icon}
                    {statusConfig[q.status].label}
                  </span>
                </div>

                {/* Customer Info */}
                <div className={`p-3 rounded-xl mb-4 ${theme === 'dark' ? 'bg-slate-800/50' : 'bg-slate-50'}`}>
                  <div className={`flex items-center gap-2 ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                    <User className="w-4 h-4 text-emerald-500" />
                    <span className="font-semibold text-sm">{q.customerName}</span>
                  </div>
                  <div className={`flex items-center gap-2 mt-1.5 text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                    <Phone className="w-3.5 h-3.5" />
                    <span>{q.customerPhone}</span>
                  </div>
                </div>

                {/* Details */}
                <div className="flex items-center justify-between mb-4">
                  <div className={`flex items-center gap-4 text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                    <span className="flex items-center gap-1.5">
                      <Package className="w-4 h-4" />
                      {q.items.length} items
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Clock className="w-4 h-4" />
                      Exp: {formatDate(q.expiryDate)}
                    </span>
                  </div>
                </div>

                {/* Total */}
                <div className={`flex items-center justify-between p-3 rounded-xl ${theme === 'dark' ? 'bg-emerald-500/10' : 'bg-emerald-50'}`}>
                  <span className={`text-sm font-medium ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>Total</span>
                  <span className={`text-xl font-bold ${theme === 'dark' ? 'text-emerald-400' : 'text-emerald-600'}`}>{formatCurrency(q.total)}</span>
                </div>

                {/* Actions */}
                <div className={`flex items-center justify-between pt-4 mt-4 border-t ${theme === 'dark' ? 'border-slate-700/50' : 'border-slate-200'}`}>
                  <div className="flex items-center gap-1">
                    <button onClick={() => handleView(q)} className={`p-2 rounded-lg transition-colors ${theme === 'dark' ? 'hover:bg-slate-700 text-slate-400 hover:text-white' : 'hover:bg-slate-100 text-slate-600'}`} title="View">
                      <Eye className="w-4 h-4" />
                    </button>
                    <button onClick={() => handleEdit(q)} className={`p-2 rounded-lg transition-colors ${theme === 'dark' ? 'hover:bg-blue-500/20 text-slate-400 hover:text-blue-400' : 'hover:bg-blue-50 text-slate-600 hover:text-blue-600'}`} title="Edit">
                      <Edit className="w-4 h-4" />
                    </button>
                    <button onClick={() => handleDuplicate(q)} className={`p-2 rounded-lg transition-colors ${theme === 'dark' ? 'hover:bg-emerald-500/20 text-slate-400 hover:text-emerald-400' : 'hover:bg-emerald-50 text-slate-600 hover:text-emerald-600'}`} title="Duplicate">
                      <Copy className="w-4 h-4" />
                    </button>
                    <button onClick={() => handleDelete(q)} className={`p-2 rounded-lg transition-colors ${theme === 'dark' ? 'hover:bg-red-500/20 text-slate-400 hover:text-red-400' : 'hover:bg-red-50 text-slate-600 hover:text-red-600'}`} title="Delete">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  <button onClick={() => handleWhatsAppShare(q)} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${theme === 'dark' ? 'bg-green-500/20 text-green-400 hover:bg-green-500/30' : 'bg-green-50 text-green-600 hover:bg-green-100'}`}>
                    <MessageCircle className="w-3.5 h-3.5" />
                    WhatsApp
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Table View */}
      {viewMode === 'table' && (
        <div className={`rounded-2xl border overflow-hidden ${theme === 'dark' ? 'bg-slate-800/30 border-slate-700/50' : 'bg-white border-slate-200 shadow-sm'}`}>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className={theme === 'dark' ? 'bg-slate-800/50' : 'bg-slate-50'}>
                  {['Quotation', 'Customer', 'Date', 'Expires', 'Items', 'Total', 'Status', 'Actions'].map(h => (
                    <th key={h} className={`px-4 py-3.5 text-${h === 'Actions' ? 'right' : 'left'} text-xs font-semibold uppercase tracking-wider ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className={`divide-y ${theme === 'dark' ? 'divide-slate-700/50' : 'divide-slate-200'}`}>
                {paginatedQuotations.map((q) => (
                  <tr key={q.id} className={`transition-colors ${theme === 'dark' ? 'hover:bg-slate-800/50' : 'hover:bg-slate-50'}`}>
                    <td className="px-4 py-3.5">
                      <p className={`font-mono font-bold text-sm ${theme === 'dark' ? 'text-emerald-400' : 'text-emerald-600'}`}>{q.quotationNumber}</p>
                    </td>
                    <td className="px-4 py-3.5">
                      <p className={`font-medium text-sm ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>{q.customerName}</p>
                      <p className={`text-xs ${theme === 'dark' ? 'text-slate-500' : 'text-slate-500'}`}>{q.customerPhone}</p>
                    </td>
                    <td className="px-4 py-3.5">
                      <p className={`text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>{formatDate(q.quotationDate)}</p>
                    </td>
                    <td className="px-4 py-3.5">
                      <p className={`text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>{formatDate(q.expiryDate)}</p>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className={`text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>{q.items.length}</span>
                    </td>
                    <td className="px-4 py-3.5">
                      <p className={`font-semibold ${theme === 'dark' ? 'text-emerald-400' : 'text-emerald-600'}`}>{formatCurrency(q.total)}</p>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-medium inline-flex items-center gap-1 w-fit border ${statusConfig[q.status].bgColor} ${statusConfig[q.status].color} ${statusConfig[q.status].borderColor}`}>
                        {statusConfig[q.status].icon}
                        {statusConfig[q.status].label}
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => handleView(q)} className={`p-2 rounded-lg ${theme === 'dark' ? 'hover:bg-slate-700 text-slate-400 hover:text-white' : 'hover:bg-slate-100 text-slate-600'}`}><Eye className="w-4 h-4" /></button>
                        <button onClick={() => handleEdit(q)} className={`p-2 rounded-lg ${theme === 'dark' ? 'hover:bg-blue-500/20 text-slate-400 hover:text-blue-400' : 'hover:bg-blue-50 text-slate-600 hover:text-blue-600'}`}><Edit className="w-4 h-4" /></button>
                        <button onClick={() => handleDuplicate(q)} className={`p-2 rounded-lg ${theme === 'dark' ? 'hover:bg-emerald-500/20 text-slate-400 hover:text-emerald-400' : 'hover:bg-emerald-50 text-slate-600 hover:text-emerald-600'}`}><Copy className="w-4 h-4" /></button>
                        <button onClick={() => handleWhatsAppShare(q)} className={`p-2 rounded-lg ${theme === 'dark' ? 'hover:bg-green-500/20 text-slate-400 hover:text-green-400' : 'hover:bg-green-50 text-slate-600 hover:text-green-600'}`}><MessageCircle className="w-4 h-4" /></button>
                        <button onClick={() => handleDelete(q)} className={`p-2 rounded-lg ${theme === 'dark' ? 'hover:bg-red-500/20 text-slate-400 hover:text-red-400' : 'hover:bg-red-50 text-slate-600 hover:text-red-600'}`}><Trash2 className="w-4 h-4" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Empty State */}
      {paginatedQuotations.length === 0 && (
        <div className={`flex flex-col items-center justify-center py-16 rounded-2xl ${theme === 'dark' ? 'bg-slate-800/50 border border-slate-700/50' : 'bg-white border border-slate-200'}`}>
          <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-teal-500/20 mb-4">
            <Receipt className="w-12 h-12 text-emerald-500" />
          </div>
          <h3 className={`text-lg font-semibold mb-2 ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>No quotations found</h3>
          <p className={`text-sm mb-4 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
            {hasActiveFilters ? 'Try adjusting your filters' : 'Start by creating your first quotation'}
          </p>
          {hasActiveFilters ? (
            <button onClick={clearFilters} className="flex items-center gap-2 px-4 py-2 bg-emerald-500 text-white rounded-xl font-medium">
              <RefreshCw className="w-4 h-4" /> Clear Filters
            </button>
          ) : (
            <button onClick={() => navigate('/quotations/create')} className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-xl font-medium">
              <Plus className="w-4 h-4" /> Create Quotation
            </button>
          )}
        </div>
      )}

      {/* Pagination */}
      {filteredQuotations.length > 0 && (
        <div className={`p-4 rounded-2xl border ${theme === 'dark' ? 'bg-slate-800/30 border-slate-700/50' : 'bg-white border-slate-200 shadow-sm'}`}>
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
            <div className="flex flex-wrap items-center gap-4">
              <p className={`text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                Showing <span className="font-semibold">{(currentPage - 1) * itemsPerPage + 1}</span> to <span className="font-semibold">{Math.min(currentPage * itemsPerPage, filteredQuotations.length)}</span> of <span className="font-semibold">{filteredQuotations.length}</span>
              </p>
              <div className="flex items-center gap-2">
                <span className={`text-sm ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>Show:</span>
                <div className={`flex items-center rounded-full p-0.5 ${theme === 'dark' ? 'bg-slate-800' : 'bg-slate-100'}`}>
                  {(viewMode === 'table' ? [10, 20, 50] : [6, 9, 12]).map((num) => (
                    <button key={num} onClick={() => { setItemsPerPage(num); setCurrentPage(1); }} className={`px-3 py-1 rounded-full text-sm font-medium transition-all ${itemsPerPage === num ? 'bg-emerald-500 text-white shadow-md' : theme === 'dark' ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'}`}>{num}</button>
                  ))}
                </div>
              </div>
            </div>
            {totalPages > 1 && (
              <div className="flex items-center gap-1">
                <button onClick={() => setCurrentPage(1)} disabled={currentPage === 1} className={`p-2 rounded-lg transition-colors ${currentPage === 1 ? theme === 'dark' ? 'text-slate-600 cursor-not-allowed' : 'text-slate-300 cursor-not-allowed' : theme === 'dark' ? 'hover:bg-slate-700 text-slate-400' : 'hover:bg-slate-100 text-slate-600'}`}><ChevronsLeft className="w-4 h-4" /></button>
                <button onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))} disabled={currentPage === 1} className={`p-2 rounded-lg transition-colors ${currentPage === 1 ? theme === 'dark' ? 'text-slate-600 cursor-not-allowed' : 'text-slate-300 cursor-not-allowed' : theme === 'dark' ? 'hover:bg-slate-700 text-slate-400' : 'hover:bg-slate-100 text-slate-600'}`}><ChevronLeft className="w-4 h-4" /></button>
                <div className="hidden sm:flex items-center gap-1">
                  {getPageNumbers.map((page, index) => (
                    page === '...' ? <span key={`ellipsis-${index}`} className={`px-2 ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>...</span> : (
                      <button key={page} onClick={() => setCurrentPage(page as number)} className={`w-9 h-9 rounded-lg text-sm font-medium transition-all ${currentPage === page ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/25' : theme === 'dark' ? 'hover:bg-slate-700 text-slate-300' : 'hover:bg-slate-100 text-slate-700'}`}>{page}</button>
                    )
                  ))}
                </div>
                <div className={`sm:hidden px-3 py-1 rounded-lg text-sm font-medium ${theme === 'dark' ? 'bg-slate-700 text-slate-300' : 'bg-slate-100 text-slate-700'}`}>{currentPage} / {totalPages}</div>
                <button onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))} disabled={currentPage === totalPages} className={`p-2 rounded-lg transition-colors ${currentPage === totalPages ? theme === 'dark' ? 'text-slate-600 cursor-not-allowed' : 'text-slate-300 cursor-not-allowed' : theme === 'dark' ? 'hover:bg-slate-700 text-slate-400' : 'hover:bg-slate-100 text-slate-600'}`}><ChevronRight className="w-4 h-4" /></button>
                <button onClick={() => setCurrentPage(totalPages)} disabled={currentPage === totalPages} className={`p-2 rounded-lg transition-colors ${currentPage === totalPages ? theme === 'dark' ? 'text-slate-600 cursor-not-allowed' : 'text-slate-300 cursor-not-allowed' : theme === 'dark' ? 'hover:bg-slate-700 text-slate-400' : 'hover:bg-slate-100 text-slate-600'}`}><ChevronsRight className="w-4 h-4" /></button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Delete Modal */}
      <DeleteConfirmationModal isOpen={isDeleteModalOpen} onCancel={() => setIsDeleteModalOpen(false)} onConfirm={confirmDelete} title="Delete Quotation" message={`Delete quotation "${quotationToDelete?.quotationNumber}"? This action cannot be undone.`} itemName={quotationToDelete?.quotationNumber || ''} />
    </div>
  );
};

export default Quotations;
