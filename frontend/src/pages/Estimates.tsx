import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../contexts/ThemeContext';
import { mockEstimates } from '../data/mockData';
import type { Estimate, EstimateStatus } from '../data/mockData';
import { DeleteConfirmationModal } from '../components/modals/DeleteConfirmationModal';
import { SearchableSelect } from '../components/ui/searchable-select';
import { 
  FileText, Plus, Search, Eye, Edit, Trash2, Copy,
  Clock, User, Package, Calendar, DollarSign, CheckCircle,
  ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, X,
  SortAsc, SortDesc, Filter, RefreshCw, LayoutGrid, List,
  FileCheck, Send, XCircle, AlertTriangle, Phone, MessageCircle
} from 'lucide-react';

type ViewMode = 'grid' | 'table';

const statusConfig: Record<EstimateStatus, { label: string; color: string; bgColor: string; icon: React.ReactNode }> = {
  'draft': { label: 'Draft', color: 'text-slate-500', bgColor: 'bg-slate-500/10', icon: <FileText className="w-4 h-4" /> },
  'sent': { label: 'Sent', color: 'text-blue-500', bgColor: 'bg-blue-500/10', icon: <Send className="w-4 h-4" /> },
  'accepted': { label: 'Accepted', color: 'text-emerald-500', bgColor: 'bg-emerald-500/10', icon: <CheckCircle className="w-4 h-4" /> },
  'rejected': { label: 'Rejected', color: 'text-red-500', bgColor: 'bg-red-500/10', icon: <XCircle className="w-4 h-4" /> },
  'expired': { label: 'Expired', color: 'text-amber-500', bgColor: 'bg-amber-500/10', icon: <AlertTriangle className="w-4 h-4" /> },
};

export const Estimates: React.FC = () => {
  const { theme } = useTheme();
  const navigate = useNavigate();
  const [estimates, setEstimates] = useState<Estimate[]>(mockEstimates);
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
  const [estimateToDelete, setEstimateToDelete] = useState<Estimate | null>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (startCalendarRef.current && !startCalendarRef.current.contains(event.target as Node)) setShowStartCalendar(false);
      if (endCalendarRef.current && !endCalendarRef.current.contains(event.target as Node)) setShowEndCalendar(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredEstimates = useMemo(() => {
    const filtered = estimates.filter(estimate => {
      const matchesSearch = estimate.estimateNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        estimate.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        estimate.customerPhone.includes(searchQuery) ||
        (estimate.customerEmail?.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchesStatus = statusFilter === 'all' || estimate.status === statusFilter;
      let matchesDate = true;
      if (startDate || endDate) {
        const estDate = new Date(estimate.estimateDate);
        if (startDate) { const start = new Date(startDate); start.setHours(0,0,0,0); matchesDate = matchesDate && estDate >= start; }
        if (endDate) { const end = new Date(endDate); end.setHours(23,59,59,999); matchesDate = matchesDate && estDate <= end; }
      }
      return matchesSearch && matchesStatus && matchesDate;
    });
    return filtered.sort((a, b) => {
      const dateA = new Date(a.estimateDate).getTime();
      const dateB = new Date(b.estimateDate).getTime();
      return sortOrder === 'asc' ? dateA - dateB : dateB - dateA;
    });
  }, [estimates, searchQuery, statusFilter, startDate, endDate, sortOrder]);

  const totalPages = Math.ceil(filteredEstimates.length / itemsPerPage);
  const paginatedEstimates = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredEstimates.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredEstimates, currentPage, itemsPerPage]);

  useEffect(() => { setCurrentPage(1); }, [searchQuery, statusFilter, startDate, endDate]);
  useEffect(() => { 
    if (viewMode === 'table') {
      setItemsPerPage(10);
    } else {
      setItemsPerPage(9);
    }
    setCurrentPage(1); 
  }, [viewMode]);

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

  const stats = useMemo(() => {
    const draft = estimates.filter(e => e.status === 'draft').length;
    const sent = estimates.filter(e => e.status === 'sent').length;
    const accepted = estimates.filter(e => e.status === 'accepted').length;
    const rejected = estimates.filter(e => e.status === 'rejected').length;
    const expired = estimates.filter(e => e.status === 'expired').length;
    const totalValue = estimates.reduce((sum, e) => sum + e.total, 0);
    const acceptedValue = estimates.filter(e => e.status === 'accepted').reduce((sum, e) => sum + e.total, 0);
    const acceptanceRate = estimates.length > 0 ? Math.round((accepted / estimates.length) * 100) : 0;
    return { total: estimates.length, draft, sent, accepted, rejected, expired, totalValue, acceptedValue, acceptanceRate };
  }, [estimates]);

  const hasActiveFilters = searchQuery || statusFilter !== 'all' || startDate || endDate;
  const clearFilters = () => { setSearchQuery(''); setStatusFilter('all'); setStartDate(''); setEndDate(''); };
  const formatCurrency = (amount: number) => `Rs. ${amount.toLocaleString('en-LK')}`;
  const formatDate = (dateString: string) => new Date(dateString).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

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

  const handleView = (estimate: Estimate) => {
    navigate(`/estimates/edit/${estimate.id}`, { state: { viewMode: true } });
  };

  const handleEdit = (estimate: Estimate) => {
    navigate(`/estimates/edit/${estimate.id}`);
  };

  const handleDuplicate = (estimate: Estimate) => {
    navigate('/estimates/create', { state: { duplicateFrom: estimate } });
  };

  const handleDelete = (estimate: Estimate) => {
    setEstimateToDelete(estimate);
    setIsDeleteModalOpen(true);
  };

  const confirmDelete = () => {
    if (estimateToDelete) {
      setEstimates(prev => prev.filter(e => e.id !== estimateToDelete.id));
      setIsDeleteModalOpen(false);
      setEstimateToDelete(null);
    }
  };

  const handleWhatsAppShare = (estimate: Estimate) => {
    const message = `📋 *ESTIMATE - ${estimate.estimateNumber}*\n\n` +
      `Dear ${estimate.customerName},\n\n` +
      `Thank you for your inquiry. Please find your estimate details below:\n\n` +
      `📅 Date: ${formatDate(estimate.estimateDate)}\n` +
      `⏰ Valid Until: ${formatDate(estimate.expiryDate)}\n` +
      `📦 Items: ${estimate.items.length}\n` +
      `💰 *Total: ${formatCurrency(estimate.total)}*\n\n` +
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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className={`text-2xl lg:text-3xl font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>Estimates</h1>
          <p className={`mt-1 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>Create and manage price quotations for customers</p>
        </div>
        <button 
          onClick={() => navigate('/estimates/create')} 
          className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-xl font-medium hover:opacity-90 transition-opacity shadow-lg hover:shadow-emerald-500/25"
        >
          <Plus className="w-5 h-5" />Create Estimate
        </button>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Estimates', value: stats.total, icon: FileCheck, bg: 'blue' },
          { label: 'Pending', value: stats.sent, icon: Clock, bg: 'amber', sub: `${stats.draft} Drafts` },
          { label: 'Accepted', value: `Rs. ${(stats.acceptedValue/1000).toFixed(0)}K`, icon: CheckCircle, bg: 'emerald', sub: `${stats.accepted} Estimates` },
          { label: 'Acceptance Rate', value: `${stats.acceptanceRate}%`, icon: DollarSign, bg: 'purple', sub: `${stats.rejected} Rejected` }
        ].map((s, i) => (
          <div key={i} className={`p-4 rounded-xl border ${theme === 'dark' ? 'bg-slate-800/30 border-slate-700/50' : 'bg-white border-slate-200 shadow-sm'}`}>
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 bg-${s.bg}-500/10 rounded-lg flex items-center justify-center`}>
                <s.icon className={`w-5 h-5 text-${s.bg}-500`} />
              </div>
              <div>
                <p className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>{s.value}</p>
                <p className={`text-xs ${theme === 'dark' ? 'text-slate-500' : 'text-slate-500'}`}>{s.sub || s.label}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Search and Filters */}
      <div className={`p-3 sm:p-4 rounded-2xl border ${theme === 'dark' ? 'bg-slate-800/30 border-slate-700/50' : 'bg-white border-slate-200'}`}>
        <div className="flex flex-col lg:flex-row gap-3">
          {/* Search */}
          <div className={`flex items-center gap-2 px-3 sm:px-4 py-2 rounded-xl border flex-1 ${theme === 'dark' ? 'bg-slate-800/50 border-slate-700/50' : 'bg-slate-50 border-slate-200'}`}>
            <Search className={`w-5 h-5 flex-shrink-0 ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`} />
            <input 
              type="text" 
              placeholder="Search estimates..." 
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

          {/* Filters Row */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Filter Toggle Button */}
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
                  {[statusFilter !== 'all', startDate, endDate].filter(Boolean).length}
                </span>
              )}
            </button>

            {/* Sort Button */}
            <button
              onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
              className={`p-2 rounded-xl border transition-colors ${theme === 'dark' ? 'border-slate-700 hover:bg-slate-800 text-slate-400' : 'border-slate-200 hover:bg-slate-50 text-slate-600'}`}
              title={sortOrder === 'asc' ? 'Sort Descending' : 'Sort Ascending'}
            >
              {sortOrder === 'asc' ? <SortAsc className="w-4 h-4" /> : <SortDesc className="w-4 h-4" />}
            </button>

            {/* View Mode Toggle */}
            <div className={`flex items-center rounded-xl overflow-hidden border ${theme === 'dark' ? 'border-slate-700' : 'border-slate-200'}`}>
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
                onClick={() => setViewMode('grid')}
                className={`p-2 transition-colors ${
                  viewMode === 'grid'
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

        {/* Expanded Filters */}
        {showFilters && (
          <div className={`pt-3 sm:pt-4 mt-3 border-t ${theme === 'dark' ? 'border-slate-700/50' : 'border-slate-200'}`}>
            <div className="flex flex-wrap items-center gap-3">
              {/* Status Filter */}
              <div className="w-full sm:w-40">
                <SearchableSelect 
                  options={statusOptions} 
                  value={statusFilter} 
                  onValueChange={setStatusFilter} 
                  placeholder="All Status"
                  theme={theme}
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
                    className={`px-3 py-1.5 rounded-xl border text-sm min-w-[110px] text-left transition-colors ${
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
                    className={`px-3 py-1.5 rounded-xl border text-sm min-w-[110px] text-left transition-colors ${
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

              {/* Clear Filters Button */}
              {hasActiveFilters && (
                <button
                  onClick={clearFilters}
                  className={`px-3 py-1.5 rounded-xl text-sm font-medium transition-colors ${
                    theme === 'dark'
                      ? 'bg-slate-700 hover:bg-slate-600 text-slate-300'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                  }`}
                >
                  Clear
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Grid View */}
      {viewMode === 'grid' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {paginatedEstimates.map((estimate) => (
            <div 
              key={estimate.id} 
              className={`p-4 rounded-2xl border transition-all hover:shadow-lg ${
                theme === 'dark' 
                  ? 'bg-slate-800/50 border-slate-700/50 hover:border-slate-600' 
                  : 'bg-white border-slate-200 hover:border-slate-300'
              }`}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className={`p-2.5 rounded-xl ${theme === 'dark' ? 'bg-slate-700/50' : 'bg-slate-100'}`}>
                    <span className={theme === 'dark' ? 'text-emerald-400' : 'text-emerald-600'}>
                      <FileText className="w-5 h-5" />
                    </span>
                  </div>
                  <div>
                    <p className={`font-mono font-bold text-sm ${theme === 'dark' ? 'text-emerald-400' : 'text-emerald-600'}`}>
                      {estimate.estimateNumber}
                    </p>
                    <p className={`text-xs ${theme === 'dark' ? 'text-slate-500' : 'text-slate-500'}`}>
                      {formatDate(estimate.estimateDate)}
                    </p>
                  </div>
                </div>
                <span className={`px-2.5 py-1 rounded-full text-xs font-medium inline-flex items-center gap-1 ${statusConfig[estimate.status].bgColor} ${statusConfig[estimate.status].color}`}>
                  {statusConfig[estimate.status].icon}
                  {statusConfig[estimate.status].label}
                </span>
              </div>

              <div className="mb-3">
                <div className={`flex items-center gap-2 ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                  <User className="w-4 h-4" />
                  <span className="font-semibold">{estimate.customerName}</span>
                </div>
                <div className={`flex items-center gap-2 mt-1 text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                  <Phone className="w-3.5 h-3.5" />
                  <span>{estimate.customerPhone}</span>
                </div>
              </div>

              <div className={`flex items-center gap-2 mb-3 text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                <Package className="w-4 h-4" />
                <span>{estimate.items.length} item{estimate.items.length > 1 ? 's' : ''}</span>
                <span className="text-slate-500">|</span>
                <Calendar className="w-4 h-4" />
                <span>Exp: {formatDate(estimate.expiryDate)}</span>
              </div>

              <div className="flex items-center justify-between mb-3">
                <p className={`text-xl font-bold ${theme === 'dark' ? 'text-emerald-400' : 'text-emerald-600'}`}>
                  {formatCurrency(estimate.total)}
                </p>
                {estimate.convertedToInvoice && (
                  <span className={`text-xs px-2 py-0.5 rounded-full ${theme === 'dark' ? 'bg-green-500/10 text-green-400' : 'bg-green-50 text-green-600'}`}>
                    Converted
                  </span>
                )}
              </div>

              <div className={`flex items-center justify-between pt-3 border-t ${theme === 'dark' ? 'border-slate-700/50' : 'border-slate-200'}`}>
                <div className="flex items-center gap-1">
                  <button 
                    onClick={() => handleView(estimate)} 
                    className={`p-2 rounded-lg ${theme === 'dark' ? 'hover:bg-slate-700 text-slate-400 hover:text-white' : 'hover:bg-slate-100 text-slate-600'}`}
                    title="View"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => handleEdit(estimate)} 
                    className={`p-2 rounded-lg ${theme === 'dark' ? 'hover:bg-blue-500/20 text-slate-400 hover:text-blue-400' : 'hover:bg-blue-50 text-slate-600 hover:text-blue-600'}`}
                    title="Edit"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => handleDuplicate(estimate)} 
                    className={`p-2 rounded-lg ${theme === 'dark' ? 'hover:bg-emerald-500/20 text-slate-400 hover:text-emerald-400' : 'hover:bg-emerald-50 text-slate-600 hover:text-emerald-600'}`}
                    title="Duplicate"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => handleDelete(estimate)} 
                    className={`p-2 rounded-lg ${theme === 'dark' ? 'hover:bg-red-500/20 text-slate-400 hover:text-red-400' : 'hover:bg-red-50 text-slate-600 hover:text-red-600'}`}
                    title="Delete"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                <button 
                  onClick={() => handleWhatsAppShare(estimate)} 
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${theme === 'dark' ? 'bg-green-500/20 text-green-400 hover:bg-green-500/30' : 'bg-green-50 text-green-600 hover:bg-green-100'}`}
                >
                  <MessageCircle className="w-3.5 h-3.5" />
                  WhatsApp
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Table View */}
      {viewMode === 'table' && (
        <div className={`rounded-2xl border overflow-hidden ${theme === 'dark' ? 'bg-slate-800/30 border-slate-700/50' : 'bg-white border-slate-200'}`}>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className={theme === 'dark' ? 'bg-slate-800/50' : 'bg-slate-50'}>
                  {['Estimate', 'Customer', 'Date', 'Expires', 'Items', 'Total', 'Status', 'Actions'].map(h => (
                    <th 
                      key={h} 
                      className={`px-4 py-3 text-${h === 'Actions' ? 'right' : 'left'} text-xs font-semibold uppercase tracking-wider ${
                        theme === 'dark' ? 'text-slate-400' : 'text-slate-600'
                      }`}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className={`divide-y ${theme === 'dark' ? 'divide-slate-700/50' : 'divide-slate-200'}`}>
                {paginatedEstimates.map((estimate) => (
                  <tr key={estimate.id} className={theme === 'dark' ? 'hover:bg-slate-800/50' : 'hover:bg-slate-50'}>
                    <td className="px-4 py-3">
                      <p className={`font-mono font-bold text-sm ${theme === 'dark' ? 'text-emerald-400' : 'text-emerald-600'}`}>
                        {estimate.estimateNumber}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <div>
                        <p className={`font-medium text-sm ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                          {estimate.customerName}
                        </p>
                        <p className={`text-xs ${theme === 'dark' ? 'text-slate-500' : 'text-slate-500'}`}>
                          {estimate.customerPhone}
                        </p>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <p className={`text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                        {formatDate(estimate.estimateDate)}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <p className={`text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                        {formatDate(estimate.expiryDate)}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                        {estimate.items.length}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <p className={`font-semibold ${theme === 'dark' ? 'text-emerald-400' : 'text-emerald-600'}`}>
                        {formatCurrency(estimate.total)}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-medium inline-flex items-center gap-1 w-fit ${statusConfig[estimate.status].bgColor} ${statusConfig[estimate.status].color}`}>
                        {statusConfig[estimate.status].icon}
                        {statusConfig[estimate.status].label}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button 
                          onClick={() => handleView(estimate)} 
                          className={`p-2 rounded-lg ${theme === 'dark' ? 'hover:bg-slate-700 text-slate-400 hover:text-white' : 'hover:bg-slate-100 text-slate-600'}`}
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => handleEdit(estimate)} 
                          className={`p-2 rounded-lg ${theme === 'dark' ? 'hover:bg-blue-500/20 text-slate-400 hover:text-blue-400' : 'hover:bg-blue-50 text-slate-600 hover:text-blue-600'}`}
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => handleDuplicate(estimate)} 
                          className={`p-2 rounded-lg ${theme === 'dark' ? 'hover:bg-emerald-500/20 text-slate-400 hover:text-emerald-400' : 'hover:bg-emerald-50 text-slate-600 hover:text-emerald-600'}`}
                        >
                          <Copy className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => handleWhatsAppShare(estimate)} 
                          className={`p-2 rounded-lg ${theme === 'dark' ? 'hover:bg-green-500/20 text-slate-400 hover:text-green-400' : 'hover:bg-green-50 text-slate-600 hover:text-green-600'}`}
                          title="WhatsApp"
                        >
                          <MessageCircle className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => handleDelete(estimate)} 
                          className={`p-2 rounded-lg ${theme === 'dark' ? 'hover:bg-red-500/20 text-slate-400 hover:text-red-400' : 'hover:bg-red-50 text-slate-600 hover:text-red-600'}`}
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

      {/* Empty State */}
      {paginatedEstimates.length === 0 && (
        <div className={`flex flex-col items-center justify-center py-16 rounded-2xl ${theme === 'dark' ? 'bg-slate-800/50 border border-slate-700/50' : 'bg-white border border-slate-200'}`}>
          <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-teal-500/20 mb-4">
            <FileCheck className="w-12 h-12 text-emerald-500" />
          </div>
          <h3 className={`text-lg font-semibold mb-2 ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>No estimates found</h3>
          <p className={`text-sm mb-4 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
            {hasActiveFilters ? 'Try adjusting your filters' : 'Start by creating your first estimate'}
          </p>
          {hasActiveFilters && (
            <button onClick={clearFilters} className="flex items-center gap-2 px-4 py-2 bg-emerald-500 text-white rounded-xl font-medium">
              <RefreshCw className="w-4 h-4" />Clear Filters
            </button>
          )}
        </div>
      )}

      {/* Pagination */}
      {filteredEstimates.length > 0 && (
        <div className={`mt-4 p-4 rounded-2xl border ${theme === 'dark' ? 'bg-slate-800/30 border-slate-700/50' : 'bg-white border-slate-200'}`}>
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
            {/* Left side - Info and Items Per Page */}
            <div className="flex flex-wrap items-center gap-4">
              {/* Result Info */}
              <p className={`text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                Showing <span className="font-semibold">{(currentPage - 1) * itemsPerPage + 1}</span> to{' '}
                <span className="font-semibold">{Math.min(currentPage * itemsPerPage, filteredEstimates.length)}</span> of{' '}
                <span className="font-semibold">{filteredEstimates.length}</span> estimates
              </p>
              
              {/* Items Per Page Selector */}
              <div className="flex items-center gap-2">
                <span className={`text-sm ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>Show:</span>
                <div className={`flex items-center rounded-full p-0.5 ${theme === 'dark' ? 'bg-slate-800' : 'bg-slate-100'}`}>
                  {(viewMode === 'table' ? [10, 20, 50] : [6, 9, 12]).map((num) => (
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

      {/* Delete Modal */}
      <DeleteConfirmationModal 
        isOpen={isDeleteModalOpen} 
        onCancel={() => setIsDeleteModalOpen(false)} 
        onConfirm={confirmDelete} 
        title="Delete Estimate" 
        message={`Delete estimate "${estimateToDelete?.estimateNumber}"? This action cannot be undone.`} 
        itemName={estimateToDelete?.estimateNumber || ''} 
      />
    </div>
  );
};

export default Estimates;
