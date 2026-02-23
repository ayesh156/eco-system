import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../contexts/ThemeContext';
import { useShopBranding } from '../contexts/ShopBrandingContext';
import { mockJobNotes } from '../data/mockData';
import type { JobNote, JobNoteStatus, JobNotePriority, DeviceType } from '../data/mockData';
import { DeleteConfirmationModal } from '../components/modals/DeleteConfirmationModal';
import { PrintableJobNote } from '../components/PrintableJobNote';
import { SearchableSelect } from '../components/ui/searchable-select';
import { 
  ClipboardList, Plus, Search, Eye, Edit, Trash2, Printer,
  Laptop, Monitor, Smartphone, Tablet, HardDrive, Clock, User,
  ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, X,
  Phone, Calendar, Wrench, CheckCircle2, SortAsc, SortDesc,
  Timer, Package, FileText, Filter, RefreshCw, LayoutGrid, List,
  Settings2
} from 'lucide-react';

type ViewMode = 'grid' | 'table';

const statusConfig: Record<JobNoteStatus, { label: string; color: string; bgColor: string; icon: React.ReactNode }> = {
  'received': { label: 'Received', color: 'text-blue-500', bgColor: 'bg-blue-500/10', icon: <Package className="w-4 h-4" /> },
  'diagnosing': { label: 'Diagnosing', color: 'text-yellow-500', bgColor: 'bg-yellow-500/10', icon: <Search className="w-4 h-4" /> },
  'waiting-parts': { label: 'Waiting Parts', color: 'text-pink-500', bgColor: 'bg-pink-500/10', icon: <Timer className="w-4 h-4" /> },
  'in-progress': { label: 'In Progress', color: 'text-emerald-500', bgColor: 'bg-emerald-500/10', icon: <Wrench className="w-4 h-4" /> },
  'testing': { label: 'Testing', color: 'text-indigo-500', bgColor: 'bg-indigo-500/10', icon: <Monitor className="w-4 h-4" /> },
  'completed': { label: 'Completed', color: 'text-green-500', bgColor: 'bg-green-500/10', icon: <CheckCircle2 className="w-4 h-4" /> },
  'delivered': { label: 'Delivered', color: 'text-teal-500', bgColor: 'bg-teal-500/10', icon: <CheckCircle2 className="w-4 h-4" /> },
  'cancelled': { label: 'Cancelled', color: 'text-red-500', bgColor: 'bg-red-500/10', icon: <X className="w-4 h-4" /> },
};

const priorityConfig: Record<JobNotePriority, { label: string; color: string; bgColor: string }> = {
  'low': { label: 'Low', color: 'text-slate-500', bgColor: 'bg-slate-500/10' },
  'normal': { label: 'Normal', color: 'text-blue-500', bgColor: 'bg-blue-500/10' },
  'high': { label: 'High', color: 'text-orange-500', bgColor: 'bg-orange-500/10' },
  'urgent': { label: 'Urgent', color: 'text-red-500', bgColor: 'bg-red-500/10' },
};

const deviceIcons: Record<DeviceType, React.ReactNode> = {
  'laptop': <Laptop className="w-5 h-5" />,
  'desktop': <HardDrive className="w-5 h-5" />,
  'printer': <FileText className="w-5 h-5" />,
  'monitor': <Monitor className="w-5 h-5" />,
  'phone': <Smartphone className="w-5 h-5" />,
  'tablet': <Tablet className="w-5 h-5" />,
  'other': <Package className="w-5 h-5" />,
};

export const JobNotes: React.FC = () => {
  const { theme } = useTheme();
  const { branding } = useShopBranding();
  const navigate = useNavigate();
  const [jobNotes, setJobNotes] = useState<JobNote[]>(mockJobNotes);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [technicianFilter, setTechnicianFilter] = useState<string>('all');
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
  const [jobToDelete, setJobToDelete] = useState<JobNote | null>(null);
  const [selectedJob, setSelectedJob] = useState<JobNote | null>(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);
  const [jobToPrint, setJobToPrint] = useState<JobNote | null>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (startCalendarRef.current && !startCalendarRef.current.contains(event.target as Node)) setShowStartCalendar(false);
      if (endCalendarRef.current && !endCalendarRef.current.contains(event.target as Node)) setShowEndCalendar(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Technicians list (kept for reference in case needed in future)

  const filteredJobs = useMemo(() => {
    const filtered = jobNotes.filter(job => {
      const matchesSearch = job.jobNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        job.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        job.customerPhone.includes(searchQuery) ||
        job.deviceBrand.toLowerCase().includes(searchQuery.toLowerCase()) ||
        job.deviceModel.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === 'all' || job.status === statusFilter;
      const matchesPriority = priorityFilter === 'all' || job.priority === priorityFilter;
      const matchesTechnician = technicianFilter === 'all' || job.assignedTechnician === technicianFilter;
      let matchesDate = true;
      if (startDate || endDate) {
        const jobDate = new Date(job.receivedDate);
        if (startDate) { const start = new Date(startDate); start.setHours(0,0,0,0); matchesDate = matchesDate && jobDate >= start; }
        if (endDate) { const end = new Date(endDate); end.setHours(23,59,59,999); matchesDate = matchesDate && jobDate <= end; }
      }
      return matchesSearch && matchesStatus && matchesPriority && matchesTechnician && matchesDate;
    });
    return filtered.sort((a, b) => {
      const dateA = new Date(a.receivedDate).getTime();
      const dateB = new Date(b.receivedDate).getTime();
      return sortOrder === 'asc' ? dateA - dateB : dateB - dateA;
    });
  }, [jobNotes, searchQuery, statusFilter, priorityFilter, technicianFilter, startDate, endDate, sortOrder]);

  const totalPages = Math.ceil(filteredJobs.length / itemsPerPage);
  const paginatedJobs = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredJobs.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredJobs, currentPage, itemsPerPage]);

  useEffect(() => { setCurrentPage(1); }, [searchQuery, statusFilter, priorityFilter, technicianFilter, startDate, endDate]);
  useEffect(() => { 
    // Set default items per page based on view mode
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
    const pending = jobNotes.filter(j => ['received', 'diagnosing', 'waiting-parts'].includes(j.status)).length;
    const inProgress = jobNotes.filter(j => ['in-progress', 'testing'].includes(j.status)).length;
    const completed = jobNotes.filter(j => j.status === 'completed').length;
    const delivered = jobNotes.filter(j => j.status === 'delivered').length;
    const totalRevenue = jobNotes.filter(j => j.status === 'delivered').reduce((sum, j) => sum + (j.finalCost || j.estimatedCost || 0), 0);
    return { pending, inProgress, completed, delivered, total: jobNotes.length, totalRevenue };
  }, [jobNotes]);

  const hasActiveFilters = searchQuery || statusFilter !== 'all' || priorityFilter !== 'all' || technicianFilter !== 'all' || startDate || endDate;
  const clearFilters = () => { setSearchQuery(''); setStatusFilter('all'); setPriorityFilter('all'); setTechnicianFilter('all'); setStartDate(''); setEndDate(''); };
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
      <>
      <div className="fixed inset-0 bg-black/40 z-[59] sm:hidden" onClick={() => setShowCalendar(false)} />
      <div className={`fixed sm:absolute bottom-0 sm:bottom-auto left-0 sm:left-0 right-0 sm:right-auto sm:top-full sm:mt-2 p-4 pt-3 rounded-t-3xl sm:rounded-2xl border-t sm:border shadow-2xl z-[60] w-full sm:w-[280px] ${theme === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
        <div className="w-10 h-1 bg-slate-600 rounded-full mx-auto mb-3 sm:hidden" />
        <div className="flex items-center justify-between mb-3">
          <button onClick={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() - 1, 1))} className={`p-1 rounded-lg ${theme === 'dark' ? 'hover:bg-slate-700 text-slate-400' : 'hover:bg-slate-100 text-slate-600'}`}><ChevronLeft className="w-4 h-4" /></button>
          <span className={`text-sm font-semibold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>{calendarMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</span>
          <button onClick={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 1))} className={`p-1 rounded-lg ${theme === 'dark' ? 'hover:bg-slate-700 text-slate-400' : 'hover:bg-slate-100 text-slate-600'}`}><ChevronRight className="w-4 h-4" /></button>
        </div>
        <div className="grid grid-cols-7 gap-1 mb-2">{['Su','Mo','Tu','We','Th','Fr','Sa'].map(d => <div key={d} className={`w-8 h-8 flex items-center justify-center text-xs font-medium ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>{d}</div>)}</div>
        <div className="grid grid-cols-7 gap-1">{days}</div>
        <button onClick={() => { setSelectedDate(''); setShowCalendar(false); }} className={`w-full mt-3 py-2 text-sm font-medium rounded-lg ${theme === 'dark' ? 'bg-slate-700 hover:bg-slate-600 text-slate-300' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'}`}>Clear</button>
      </div>
      </>
    );
  };

  const handleView = (job: JobNote) => { setSelectedJob(job); setIsViewModalOpen(true); };
  const handleDelete = (job: JobNote) => { setJobToDelete(job); setIsDeleteModalOpen(true); };
  const confirmDelete = () => { if (jobToDelete) { setJobNotes(prev => prev.filter(j => j.id !== jobToDelete.id)); setIsDeleteModalOpen(false); setJobToDelete(null); } };
  const handlePrintJob = (job: JobNote) => {
    setJobToPrint(job);
    setTimeout(() => {
      if (printRef.current) {
        const printWindow = window.open('', '_blank');
        if (printWindow) { printWindow.document.write('<html><head><title>Job Note - ' + job.jobNumber + '</title></head><body>'); printWindow.document.write(printRef.current.innerHTML); printWindow.document.write('</body></html>'); printWindow.document.close(); setTimeout(() => { printWindow.print(); printWindow.close(); }, 250); }
      }
      setJobToPrint(null);
    }, 100);
  };

  const statusOptions = [{ value: 'all', label: 'All Status' }, ...Object.entries(statusConfig).map(([k, v]) => ({ value: k, label: v.label }))];
  const priorityOptions = [{ value: 'all', label: 'All Priority' }, ...Object.entries(priorityConfig).map(([k, v]) => ({ value: k, label: v.label }))];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className={`text-2xl lg:text-3xl font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>Job Notes</h1>
          <p className={`mt-1 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>Manage service and repair job orders</p>
        </div>
        <button onClick={() => navigate('/job-notes/create')} className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-xl font-medium hover:opacity-90 transition-opacity">
          <Plus className="w-5 h-5" />New Job Note
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[{ label: 'Total Jobs', value: stats.total, icon: ClipboardList, bg: 'blue' },
          { label: 'Pending', value: stats.pending, icon: Clock, bg: 'amber' },
          { label: 'In Progress', value: stats.inProgress, icon: Wrench, bg: 'emerald' },
          { label: 'Delivered', value: `Rs. ${(stats.totalRevenue/1000).toFixed(0)}K`, icon: CheckCircle2, bg: 'green', sub: `${stats.delivered} Delivered` }
        ].map((s, i) => (
          <div key={i} className={`p-4 rounded-xl border ${theme === 'dark' ? 'bg-slate-800/30 border-slate-700/50' : 'bg-white border-slate-200 shadow-sm'}`}>
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 bg-${s.bg}-500/10 rounded-lg flex items-center justify-center`}><s.icon className={`w-5 h-5 text-${s.bg}-400`} /></div>
              <div><p className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>{s.value}</p><p className={`text-xs ${theme === 'dark' ? 'text-slate-500' : 'text-slate-500'}`}>{s.sub || s.label}</p></div>
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
              placeholder="Search jobs..." 
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
                  {[statusFilter !== 'all', priorityFilter !== 'all', startDate, endDate].filter(Boolean).length}
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

              {/* Priority Filter */}
              <div className="w-full sm:w-40">
                <SearchableSelect 
                  options={priorityOptions} 
                  value={priorityFilter} 
                  onValueChange={setPriorityFilter} 
                  placeholder="All Priority"
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

      {viewMode === 'grid' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {paginatedJobs.map((job) => (
            <div key={job.id} className={`p-4 rounded-2xl border transition-all hover:shadow-lg ${theme === 'dark' ? 'bg-slate-800/50 border-slate-700/50 hover:border-slate-600' : 'bg-white border-slate-200 hover:border-slate-300'}`}>
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className={`p-2.5 rounded-xl ${theme === 'dark' ? 'bg-slate-700/50' : 'bg-slate-100'}`}><span className={theme === 'dark' ? 'text-emerald-400' : 'text-emerald-600'}>{deviceIcons[job.deviceType]}</span></div>
                  <div><p className={`font-mono font-bold text-sm ${theme === 'dark' ? 'text-emerald-400' : 'text-emerald-600'}`}>{job.jobNumber}</p><p className={`text-xs ${theme === 'dark' ? 'text-slate-500' : 'text-slate-500'}`}>{formatDate(job.receivedDate)}</p></div>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusConfig[job.status].bgColor} ${statusConfig[job.status].color}`}>{statusConfig[job.status].label}</span>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${priorityConfig[job.priority].bgColor} ${priorityConfig[job.priority].color}`}>{priorityConfig[job.priority].label}</span>
                </div>
              </div>
              <div className="mb-3"><p className={`font-semibold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>{job.deviceBrand} {job.deviceModel}</p><p className={`text-sm line-clamp-2 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>{job.reportedIssue}</p></div>
              {/* Linked Service */}
              {job.serviceName && (
                <div className={`flex items-center gap-2 mb-3 text-xs ${theme === 'dark' ? 'text-blue-400' : 'text-blue-600'}`}>
                  <Settings2 className="w-3.5 h-3.5" />
                  <span className={`px-2 py-0.5 rounded-full ${theme === 'dark' ? 'bg-blue-500/10 border border-blue-500/20' : 'bg-blue-50 border border-blue-200'}`}>{job.serviceName}</span>
                </div>
              )}
              <div className={`flex items-center gap-2 mb-3 text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}><User className="w-4 h-4" /><span>{job.customerName}</span><span className="text-slate-500">•</span><Phone className="w-3.5 h-3.5" /><span>{job.customerPhone}</span></div>
              <div className="flex items-center justify-between mb-3">{job.estimatedCost && <p className={`font-bold ${theme === 'dark' ? 'text-emerald-400' : 'text-emerald-600'}`}>{formatCurrency(job.estimatedCost)}</p>}{job.assignedTechnician && <p className={`text-xs ${theme === 'dark' ? 'text-slate-500' : 'text-slate-500'}`}>Tech: {job.assignedTechnician}</p>}</div>
              <div className={`flex items-center justify-between pt-3 border-t ${theme === 'dark' ? 'border-slate-700/50' : 'border-slate-200'}`}>
                <div className="flex items-center gap-1">
                  <button onClick={() => handleView(job)} className={`p-2 rounded-lg ${theme === 'dark' ? 'hover:bg-slate-700 text-slate-400 hover:text-white' : 'hover:bg-slate-100 text-slate-600'}`}><Eye className="w-4 h-4" /></button>
                  <button onClick={() => handlePrintJob(job)} className={`p-2 rounded-lg ${theme === 'dark' ? 'hover:bg-emerald-500/20 text-slate-400 hover:text-emerald-400' : 'hover:bg-emerald-50 text-slate-600 hover:text-emerald-600'}`}><Printer className="w-4 h-4" /></button>
                  <button onClick={() => navigate(`/job-notes/edit/${job.id}`)} className={`p-2 rounded-lg ${theme === 'dark' ? 'hover:bg-blue-500/20 text-slate-400 hover:text-blue-400' : 'hover:bg-blue-50 text-slate-600 hover:text-blue-600'}`}><Edit className="w-4 h-4" /></button>
                  <button onClick={() => handleDelete(job)} className={`p-2 rounded-lg ${theme === 'dark' ? 'hover:bg-red-500/20 text-slate-400 hover:text-red-400' : 'hover:bg-red-50 text-slate-600 hover:text-red-600'}`}><Trash2 className="w-4 h-4" /></button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {viewMode === 'table' && (
        <div className={`rounded-2xl border overflow-hidden ${theme === 'dark' ? 'bg-slate-800/30 border-slate-700/50' : 'bg-white border-slate-200'}`}>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead><tr className={theme === 'dark' ? 'bg-slate-800/50' : 'bg-slate-50'}>{['Job','Device','Service','Customer','Status','Cost','Date','Actions'].map(h => <th key={h} className={`px-4 py-3 text-${h === 'Actions' ? 'right' : 'left'} text-xs font-semibold uppercase tracking-wider ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>{h}</th>)}</tr></thead>
              <tbody className={`divide-y ${theme === 'dark' ? 'divide-slate-700/50' : 'divide-slate-200'}`}>
                {paginatedJobs.map((job) => (
                  <tr key={job.id} className={theme === 'dark' ? 'hover:bg-slate-800/50' : 'hover:bg-slate-50'}>
                    <td className="px-4 py-3"><p className={`font-mono font-bold text-sm ${theme === 'dark' ? 'text-emerald-400' : 'text-emerald-600'}`}>{job.jobNumber}</p></td>
                    <td className="px-4 py-3"><div className="flex items-center gap-2"><span className={theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}>{deviceIcons[job.deviceType]}</span><div><p className={`font-medium text-sm ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>{job.deviceBrand} {job.deviceModel}</p><p className={`text-xs truncate max-w-[200px] ${theme === 'dark' ? 'text-slate-500' : 'text-slate-500'}`}>{job.reportedIssue}</p></div></div></td>
                    <td className="px-4 py-3">{job.serviceName ? <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium ${theme === 'dark' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' : 'bg-blue-50 text-blue-600 border border-blue-200'}`}><Settings2 className="w-3 h-3" />{job.serviceName}</span> : <span className={`text-xs ${theme === 'dark' ? 'text-slate-600' : 'text-slate-400'}`}>—</span>}</td>
                    <td className="px-4 py-3"><p className={`text-sm ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>{job.customerName}</p><p className={`text-xs ${theme === 'dark' ? 'text-slate-500' : 'text-slate-500'}`}>{job.customerPhone}</p></td>
                    <td className="px-4 py-3"><div className="flex flex-col gap-1"><span className={`px-2 py-0.5 rounded-full text-xs font-medium inline-flex items-center gap-1 w-fit ${statusConfig[job.status].bgColor} ${statusConfig[job.status].color}`}>{statusConfig[job.status].icon}{statusConfig[job.status].label}</span><span className={`px-2 py-0.5 rounded-full text-xs font-medium w-fit ${priorityConfig[job.priority].bgColor} ${priorityConfig[job.priority].color}`}>{priorityConfig[job.priority].label}</span></div></td>
                    <td className="px-4 py-3"><p className={`font-semibold ${theme === 'dark' ? 'text-emerald-400' : 'text-emerald-600'}`}>{job.estimatedCost ? formatCurrency(job.estimatedCost) : '-'}</p></td>
                    <td className="px-4 py-3"><p className={`text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>{formatDate(job.receivedDate)}</p></td>
                    <td className="px-4 py-3"><div className="flex items-center justify-end gap-1">
                      <button onClick={() => handleView(job)} className={`p-2 rounded-lg ${theme === 'dark' ? 'hover:bg-slate-700 text-slate-400 hover:text-white' : 'hover:bg-slate-100 text-slate-600'}`}><Eye className="w-4 h-4" /></button>
                      <button onClick={() => handlePrintJob(job)} className={`p-2 rounded-lg ${theme === 'dark' ? 'hover:bg-emerald-500/20 text-slate-400 hover:text-emerald-400' : 'hover:bg-emerald-50 text-slate-600 hover:text-emerald-600'}`}><Printer className="w-4 h-4" /></button>
                      <button onClick={() => navigate(`/job-notes/edit/${job.id}`)} className={`p-2 rounded-lg ${theme === 'dark' ? 'hover:bg-blue-500/20 text-slate-400 hover:text-blue-400' : 'hover:bg-blue-50 text-slate-600 hover:text-blue-600'}`}><Edit className="w-4 h-4" /></button>
                      <button onClick={() => handleDelete(job)} className={`p-2 rounded-lg ${theme === 'dark' ? 'hover:bg-red-500/20 text-slate-400 hover:text-red-400' : 'hover:bg-red-50 text-slate-600 hover:text-red-600'}`}><Trash2 className="w-4 h-4" /></button>
                    </div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {paginatedJobs.length === 0 && (
        <div className={`flex flex-col items-center justify-center py-16 rounded-2xl ${theme === 'dark' ? 'bg-slate-800/50 border border-slate-700/50' : 'bg-white border border-slate-200'}`}>
          <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-teal-500/20 mb-4"><ClipboardList className="w-12 h-12 text-emerald-500" /></div>
          <h3 className={`text-lg font-semibold mb-2 ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>No job notes found</h3>
          <p className={`text-sm mb-4 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>{hasActiveFilters ? 'Try adjusting your filters' : 'Start by creating your first job note'}</p>
          {hasActiveFilters && <button onClick={clearFilters} className="flex items-center gap-2 px-4 py-2 bg-emerald-500 text-white rounded-xl font-medium"><RefreshCw className="w-4 h-4" />Clear Filters</button>}
        </div>
      )}

      {/* Pagination */}
      {filteredJobs.length > 0 && (
        <div className={`mt-4 p-4 rounded-2xl border ${theme === 'dark' ? 'bg-slate-800/30 border-slate-700/50' : 'bg-white border-slate-200'}`}>
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
            {/* Left side - Info and Items Per Page */}
            <div className="flex flex-wrap items-center gap-4">
              {/* Result Info */}
              <p className={`text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                Showing <span className="font-semibold">{(currentPage - 1) * itemsPerPage + 1}</span> to{' '}
                <span className="font-semibold">{Math.min(currentPage * itemsPerPage, filteredJobs.length)}</span> of{' '}
                <span className="font-semibold">{filteredJobs.length}</span> jobs
              </p>
              
              {/* Items Per Page Selector */}
              <div className="flex items-center gap-2">
                <span className={`text-sm ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>Show:</span>
                <div className={`flex items-center rounded-full p-0.5 ${theme === 'dark' ? 'bg-slate-800' : 'bg-slate-100'}`}>
                  {(viewMode === 'table' ? [10, 20, 50, 100] : [6, 9, 12, 24]).map((num) => (
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

      {isViewModalOpen && selectedJob && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsViewModalOpen(false)} />
          <div className={`relative w-full max-w-2xl max-h-[90vh] rounded-3xl overflow-hidden shadow-2xl ${theme === 'dark' ? 'bg-slate-800' : 'bg-white'}`}>
            <div className="bg-gradient-to-r from-emerald-500 to-teal-500 p-6 text-white">
              <div className="flex items-center justify-between"><div><p className="text-sm opacity-90">Job Note</p><h2 className="text-2xl font-bold">{selectedJob.jobNumber}</h2></div><button onClick={() => setIsViewModalOpen(false)} className="p-2 rounded-full bg-white/20 hover:bg-white/30"><X className="w-5 h-5" /></button></div>
            </div>
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-180px)]">
              <div className="flex gap-2 mb-6"><span className={`px-3 py-1 rounded-full text-sm font-medium ${statusConfig[selectedJob.status].bgColor} ${statusConfig[selectedJob.status].color}`}>{statusConfig[selectedJob.status].label}</span><span className={`px-3 py-1 rounded-full text-sm font-medium ${priorityConfig[selectedJob.priority].bgColor} ${priorityConfig[selectedJob.priority].color}`}>{priorityConfig[selectedJob.priority].label}</span></div>
              <div className={`p-4 rounded-xl mb-4 ${theme === 'dark' ? 'bg-slate-700/50' : 'bg-slate-50'}`}><h3 className={`font-semibold mb-3 ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>Customer</h3><div className="grid grid-cols-2 gap-3 text-sm"><div><span className={theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}>Name:</span> <span className={`font-medium ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>{selectedJob.customerName}</span></div><div><span className={theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}>Phone:</span> <span className={`font-medium ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>{selectedJob.customerPhone}</span></div></div></div>
              <div className={`p-4 rounded-xl mb-4 ${theme === 'dark' ? 'bg-slate-700/50' : 'bg-slate-50'}`}><h3 className={`font-semibold mb-3 ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>Device</h3><p className={`font-medium ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>{selectedJob.deviceBrand} {selectedJob.deviceModel}</p><p className={`text-sm mt-1 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>Accessories: {selectedJob.accessories.join(', ') || 'None'}</p></div>
              <div className={`p-4 rounded-xl mb-4 ${theme === 'dark' ? 'bg-yellow-500/10' : 'bg-yellow-50'}`}><h3 className={`font-semibold mb-2 ${theme === 'dark' ? 'text-yellow-400' : 'text-yellow-800'}`}>Issue</h3><p className={theme === 'dark' ? 'text-yellow-200' : 'text-yellow-900'}>{selectedJob.reportedIssue}</p></div>
              {selectedJob.estimatedCost && <div className={`p-4 rounded-xl ${theme === 'dark' ? 'bg-emerald-500/10' : 'bg-emerald-50'}`}><div className="flex justify-between items-center"><span className={theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}>Estimated:</span><span className={`text-xl font-bold ${theme === 'dark' ? 'text-emerald-400' : 'text-emerald-600'}`}>{formatCurrency(selectedJob.estimatedCost)}</span></div></div>}
            </div>
            <div className={`p-4 border-t ${theme === 'dark' ? 'border-slate-700' : 'border-slate-200'}`}><div className="flex justify-end gap-3"><button onClick={() => { setIsViewModalOpen(false); handlePrintJob(selectedJob); }} className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-xl font-medium"><Printer className="w-4 h-4" />Print</button></div></div>
          </div>
        </div>
      )}

      <DeleteConfirmationModal isOpen={isDeleteModalOpen} onCancel={() => setIsDeleteModalOpen(false)} onConfirm={confirmDelete} title="Delete Job Note" message={`Delete job note "${jobToDelete?.jobNumber}"?`} itemName={jobToDelete?.jobNumber || ''} />
      <div style={{ display: 'none' }}>{jobToPrint && <PrintableJobNote ref={printRef} jobNote={jobToPrint} branding={branding} />}</div>
    </div>
  );
};

export default JobNotes;
