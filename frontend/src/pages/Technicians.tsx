import React, { useState, useMemo, useEffect } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { 
  mockTechnicians, 
  mockJobNotes,
  technicianSpecialties
} from '../data/mockData';
import type { Technician, TechnicianStatus, TechnicianSpecialty } from '../data/mockData';
import { TechnicianFormModal } from '../components/modals/TechnicianFormModal';
import { DeleteConfirmationModal } from '../components/modals/DeleteConfirmationModal';
import { toast } from 'sonner';
import { 
  Search, Plus, Edit, Trash2, Mail, Phone, User, Star, 
  CheckCircle, Clock, XCircle,
  ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight,
  List, LayoutGrid, SortAsc, SortDesc, Filter, Wrench, ClipboardList
} from 'lucide-react';
import { SearchableSelect } from '../components/ui/searchable-select';

type ViewMode = 'grid' | 'list';

const statusConfig: Record<TechnicianStatus, { label: string; color: string; bgColor: string; icon: React.ReactNode }> = {
  'active': { label: 'Active', color: 'text-emerald-500', bgColor: 'bg-emerald-500/10', icon: <CheckCircle className="w-4 h-4" /> },
  'on-leave': { label: 'On Leave', color: 'text-amber-500', bgColor: 'bg-amber-500/10', icon: <Clock className="w-4 h-4" /> },
  'inactive': { label: 'Inactive', color: 'text-red-500', bgColor: 'bg-red-500/10', icon: <XCircle className="w-4 h-4" /> },
};

export const Technicians: React.FC = () => {
  const { theme } = useTheme();
  
  // Local state
  const [technicians, setTechnicians] = useState<Technician[]>(mockTechnicians);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [specialtyFilter, setSpecialtyFilter] = useState<string>('all');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [sortBy, setSortBy] = useState<'name' | 'jobs' | 'rating'>('name');
  const [showFilters, setShowFilters] = useState(false);
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(6);
  
  // Modal states
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedTechnician, setSelectedTechnician] = useState<Technician | undefined>(undefined);
  const [technicianToDelete, setTechnicianToDelete] = useState<Technician | null>(null);
  
  // Highlighted technician (newly created/updated)
  const [highlightedTechnicianId, setHighlightedTechnicianId] = useState<string | null>(null);

  // Calculate stats
  const stats = useMemo(() => {
    const active = technicians.filter(t => t.status === 'active').length;
    const onLeave = technicians.filter(t => t.status === 'on-leave').length;
    const inactive = technicians.filter(t => t.status === 'inactive').length;
    const totalJobs = technicians.reduce((sum, t) => sum + t.jobsCompleted, 0);
    const avgRating = technicians.length > 0 
      ? technicians.reduce((sum, t) => sum + t.averageRating, 0) / technicians.length 
      : 0;
    return { active, onLeave, inactive, total: technicians.length, totalJobs, avgRating };
  }, [technicians]);

  // Get assigned jobs count for a technician
  const getActiveJobsCount = (technicianName: string) => {
    return mockJobNotes.filter(
      job => job.assignedTechnician === technicianName && 
      !['completed', 'delivered', 'cancelled'].includes(job.status)
    ).length;
  };

  // Filter and sort technicians
  const filteredTechnicians = useMemo(() => {
    const filtered = technicians.filter(tech => {
      const matchesSearch = 
        tech.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        tech.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        tech.phone.includes(searchQuery);
      const matchesStatus = statusFilter === 'all' || tech.status === statusFilter;
      const matchesSpecialty = specialtyFilter === 'all' || tech.specialty.includes(specialtyFilter as TechnicianSpecialty);
      return matchesSearch && matchesStatus && matchesSpecialty;
    });

    return filtered.sort((a, b) => {
      let comparison = 0;
      if (sortBy === 'name') {
        comparison = a.name.localeCompare(b.name);
      } else if (sortBy === 'jobs') {
        comparison = a.jobsCompleted - b.jobsCompleted;
      } else if (sortBy === 'rating') {
        comparison = a.averageRating - b.averageRating;
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });
  }, [technicians, searchQuery, statusFilter, specialtyFilter, sortBy, sortOrder]);

  // Pagination
  const totalPages = Math.ceil(filteredTechnicians.length / itemsPerPage);
  const paginatedTechnicians = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredTechnicians.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredTechnicians, currentPage, itemsPerPage]);

  useEffect(() => { setCurrentPage(1); }, [searchQuery, statusFilter, specialtyFilter]);
  useEffect(() => { 
    setItemsPerPage(viewMode === 'list' ? 10 : 6);
    setCurrentPage(1); 
  }, [viewMode]);

  // Clear highlight after 3 seconds
  useEffect(() => {
    if (highlightedTechnicianId) {
      const timer = setTimeout(() => setHighlightedTechnicianId(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [highlightedTechnicianId]);

  const getPageNumbers = useMemo(() => {
    const pages: (number | string)[] = [];
    if (totalPages <= 5) {
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

  const hasActiveFilters = searchQuery || statusFilter !== 'all' || specialtyFilter !== 'all';

  const clearFilters = () => {
    setSearchQuery('');
    setStatusFilter('all');
    setSpecialtyFilter('all');
  };

  // Handlers
  const handleAddNew = () => {
    setSelectedTechnician(undefined);
    setIsFormModalOpen(true);
  };

  const handleEdit = (tech: Technician) => {
    setSelectedTechnician(tech);
    setIsFormModalOpen(true);
  };

  const handleDelete = (tech: Technician) => {
    setTechnicianToDelete(tech);
    setIsDeleteModalOpen(true);
  };

  const handleSaveTechnician = (techData: Partial<Technician>) => {
    if (selectedTechnician) {
      // Update existing
      const updated = { ...selectedTechnician, ...techData, updatedAt: new Date().toISOString() };
      setTechnicians(prev => prev.map(t => t.id === selectedTechnician.id ? updated : t));
      setHighlightedTechnicianId(selectedTechnician.id);
      toast.success(`Technician "${updated.name}" updated successfully!`);
    } else {
      // Create new
      const newTech: Technician = {
        id: `tech-${Date.now()}`,
        name: techData.name || '',
        email: techData.email || '',
        phone: techData.phone || '',
        address: techData.address,
        nic: techData.nic,
        specialty: techData.specialty || ['general'],
        designation: techData.designation,
        jobsCompleted: 0,
        jobsInProgress: 0,
        averageRating: 0,
        status: techData.status || 'active',
        joiningDate: techData.joiningDate || new Date().toISOString().split('T')[0],
        notes: techData.notes,
        createdAt: new Date().toISOString(),
      };
      setTechnicians(prev => [newTech, ...prev]);
      setHighlightedTechnicianId(newTech.id);
      toast.success(`Technician "${newTech.name}" added successfully!`);
    }
    setIsFormModalOpen(false);
  };

  const confirmDelete = () => {
    if (technicianToDelete) {
      // Check if technician has active jobs
      const activeJobs = getActiveJobsCount(technicianToDelete.name);
      if (activeJobs > 0) {
        toast.error(`Cannot delete "${technicianToDelete.name}" - has ${activeJobs} active job(s)`);
        setIsDeleteModalOpen(false);
        return;
      }
      setTechnicians(prev => prev.filter(t => t.id !== technicianToDelete.id));
      toast.success(`Technician "${technicianToDelete.name}" deleted successfully!`);
      setIsDeleteModalOpen(false);
      setTechnicianToDelete(null);
    }
  };

  // Render star rating
  const renderRating = (rating: number) => {
    return (
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map(star => (
          <Star
            key={star}
            className={`w-4 h-4 ${star <= Math.round(rating) ? 'text-amber-400 fill-amber-400' : theme === 'dark' ? 'text-slate-600' : 'text-slate-300'}`}
          />
        ))}
        <span className={`ml-1 text-sm font-medium ${theme === 'dark' ? 'text-slate-300' : 'text-slate-600'}`}>
          {rating.toFixed(1)}
        </span>
      </div>
    );
  };

  return (
    <div className="space-y-6 pb-8">
      {/* Page Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className={`text-2xl lg:text-3xl font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
            Technicians
          </h1>
          <p className={`mt-1 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
            Manage your repair technicians and their assignments
          </p>
        </div>
        <button 
          onClick={handleAddNew}
          className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-emerald-500 to-blue-500 text-white rounded-xl font-medium shadow-lg hover:shadow-emerald-500/25 transition-all"
        >
          <Plus className="w-5 h-5" />
          Add Technician
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        <div className={`rounded-2xl border p-4 ${theme === 'dark' ? 'bg-slate-800/50 border-slate-700/50' : 'bg-white border-slate-200 shadow-sm'}`}>
          <div className="flex items-center gap-2 mb-2">
            <User className={`w-5 h-5 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`} />
            <span className={`text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>Total</span>
          </div>
          <p className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>{stats.total}</p>
        </div>
        <div className={`rounded-2xl border p-4 ${theme === 'dark' ? 'bg-slate-800/50 border-slate-700/50' : 'bg-white border-slate-200 shadow-sm'}`}>
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle className="w-5 h-5 text-emerald-500" />
            <span className={`text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>Active</span>
          </div>
          <p className={`text-2xl font-bold text-emerald-500`}>{stats.active}</p>
        </div>
        <div className={`rounded-2xl border p-4 ${theme === 'dark' ? 'bg-slate-800/50 border-slate-700/50' : 'bg-white border-slate-200 shadow-sm'}`}>
          <div className="flex items-center gap-2 mb-2">
            <Clock className="w-5 h-5 text-amber-500" />
            <span className={`text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>On Leave</span>
          </div>
          <p className={`text-2xl font-bold text-amber-500`}>{stats.onLeave}</p>
        </div>
        <div className={`rounded-2xl border p-4 ${theme === 'dark' ? 'bg-slate-800/50 border-slate-700/50' : 'bg-white border-slate-200 shadow-sm'}`}>
          <div className="flex items-center gap-2 mb-2">
            <XCircle className="w-5 h-5 text-red-500" />
            <span className={`text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>Inactive</span>
          </div>
          <p className={`text-2xl font-bold text-red-500`}>{stats.inactive}</p>
        </div>
        <div className={`rounded-2xl border p-4 ${theme === 'dark' ? 'bg-slate-800/50 border-slate-700/50' : 'bg-white border-slate-200 shadow-sm'}`}>
          <div className="flex items-center gap-2 mb-2">
            <ClipboardList className={`w-5 h-5 ${theme === 'dark' ? 'text-blue-400' : 'text-blue-500'}`} />
            <span className={`text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>Jobs Done</span>
          </div>
          <p className={`text-2xl font-bold ${theme === 'dark' ? 'text-blue-400' : 'text-blue-600'}`}>{stats.totalJobs}</p>
        </div>
        <div className={`rounded-2xl border p-4 ${theme === 'dark' ? 'bg-slate-800/50 border-slate-700/50' : 'bg-white border-slate-200 shadow-sm'}`}>
          <div className="flex items-center gap-2 mb-2">
            <Star className="w-5 h-5 text-amber-400" />
            <span className={`text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>Avg Rating</span>
          </div>
          <p className={`text-2xl font-bold text-amber-400`}>{stats.avgRating.toFixed(1)}</p>
        </div>
      </div>

      {/* Search & Filters */}
      <div className={`rounded-2xl border p-4 ${theme === 'dark' ? 'bg-slate-800/30 border-slate-700/50' : 'bg-white border-slate-200 shadow-sm'}`}>
        {/* Search and Controls Row */}
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Search */}
          <div className={`flex items-center gap-2 px-3 py-2 rounded-xl border flex-1 ${
            theme === 'dark' ? 'border-slate-700 bg-slate-800/50' : 'border-slate-200 bg-slate-50'
          }`}>
            <Search className={`w-4 h-4 flex-shrink-0 ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`} />
            <input
              type="text"
              placeholder="Search by name, email, phone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`bg-transparent border-none outline-none flex-1 min-w-0 text-sm ${
                theme === 'dark' ? 'text-white placeholder-slate-500' : 'text-slate-900 placeholder-slate-400'
              }`}
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="text-slate-400 hover:text-slate-600">
                <XCircle className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Controls */}
          <div className="flex items-center gap-2">
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
                <span className="px-1.5 py-0.5 text-xs bg-white/20 rounded-full">!</span>
              )}
            </button>

            {/* Sort Dropdown */}
            <SearchableSelect
              options={[
                { value: 'name', label: 'Name' },
                { value: 'jobs', label: 'Jobs Completed' },
                { value: 'rating', label: 'Rating' },
              ]}
              value={sortBy}
              onValueChange={(val) => setSortBy(val as 'name' | 'jobs' | 'rating')}
              placeholder="Sort by"
              theme={theme}
              triggerClassName="w-[140px]"
            />

            {/* Sort Order Toggle */}
            <button
              onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
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
          </div>
        </div>

        {/* Expanded Filters - Modern inline layout like Customer page */}
        {showFilters && (
          <div className={`pt-4 mt-4 border-t ${theme === 'dark' ? 'border-slate-700/50' : 'border-slate-200'}`}>
            <div className="flex flex-wrap items-center gap-4">
              {/* Status Filter */}
              <div className="flex items-center gap-2">
                <Filter className={`w-4 h-4 flex-shrink-0 ${theme === 'dark' ? 'text-emerald-500' : 'text-emerald-600'}`} />
                <span className={`text-sm font-medium ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>Status:</span>
                <SearchableSelect
                  options={[
                    { value: 'all', label: 'All Status', icon: <User className="w-4 h-4 text-violet-500" />, count: technicians.length },
                    { value: 'active', label: 'Active', icon: <CheckCircle className="w-4 h-4 text-emerald-500" />, count: stats.active },
                    { value: 'on-leave', label: 'On Leave', icon: <Clock className="w-4 h-4 text-amber-500" />, count: stats.onLeave },
                    { value: 'inactive', label: 'Inactive', icon: <XCircle className="w-4 h-4 text-red-500" />, count: stats.inactive },
                  ]}
                  value={statusFilter}
                  onValueChange={setStatusFilter}
                  placeholder="Select status..."
                  searchPlaceholder="Search status..."
                  theme={theme}
                  triggerClassName="w-[180px]"
                />
              </div>

              {/* Specialty Filter */}
              <div className="flex items-center gap-2">
                <Wrench className={`w-4 h-4 flex-shrink-0 ${theme === 'dark' ? 'text-emerald-500' : 'text-emerald-600'}`} />
                <span className={`text-sm font-medium ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>Specialty:</span>
                <SearchableSelect
                  options={[
                    { value: 'all', label: 'All Specialties' },
                    ...technicianSpecialties.map(s => ({ value: s.value, label: `${s.icon} ${s.label}` }))
                  ]}
                  value={specialtyFilter}
                  onValueChange={setSpecialtyFilter}
                  placeholder="Select specialty..."
                  searchPlaceholder="Search specialty..."
                  theme={theme}
                  triggerClassName="w-[200px]"
                />
              </div>

              {/* Clear Filters Button */}
              {hasActiveFilters && (
                <button
                  onClick={clearFilters}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-sm font-medium transition-all ${
                    theme === 'dark'
                      ? 'text-red-400 hover:bg-red-500/10 border border-red-500/30'
                      : 'text-red-500 hover:bg-red-50 border border-red-200'
                  }`}
                >
                  <XCircle className="w-4 h-4" />
                  Clear
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Results Count */}
      <div className="flex items-center justify-between">
        <p className={`text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
          Showing {paginatedTechnicians.length} of {filteredTechnicians.length} technicians
        </p>
      </div>

      {/* Grid View */}
      {viewMode === 'grid' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {paginatedTechnicians.map(tech => {
            const activeJobs = getActiveJobsCount(tech.name);
            const isHighlighted = highlightedTechnicianId === tech.id;
            const statusInfo = statusConfig[tech.status];
            
            return (
              <div
                key={tech.id}
                className={`relative overflow-hidden rounded-2xl border p-5 transition-all duration-300 ${
                  isHighlighted ? 'ring-2 ring-emerald-500 ring-offset-2' : ''
                } ${
                  theme === 'dark'
                    ? 'bg-gradient-to-br from-slate-800/50 to-slate-900/50 border-slate-700/50 hover:border-slate-600'
                    : 'bg-white border-slate-200 shadow-sm hover:shadow-md'
                }`}
              >
                {/* Glassmorphism blur effect */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-emerald-500/10 to-blue-500/5 rounded-full blur-3xl" />
                
                <div className="relative">
                  {/* Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                        theme === 'dark' ? 'bg-slate-700' : 'bg-slate-100'
                      }`}>
                        <User className={`w-6 h-6 ${theme === 'dark' ? 'text-slate-300' : 'text-slate-600'}`} />
                      </div>
                      <div>
                        <h3 className={`font-semibold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                          {tech.name}
                        </h3>
                        <p className={`text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                          {tech.designation || 'Technician'}
                        </p>
                      </div>
                    </div>
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${statusInfo.bgColor} ${statusInfo.color}`}>
                      {statusInfo.icon}
                      {statusInfo.label}
                    </span>
                  </div>

                  {/* Contact Info */}
                  <div className="space-y-2 mb-4">
                    <div className="flex items-center gap-2">
                      <Phone className={`w-4 h-4 ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`} />
                      <span className={`text-sm ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>{tech.phone}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Mail className={`w-4 h-4 ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`} />
                      <span className={`text-sm truncate ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>{tech.email}</span>
                    </div>
                  </div>

                  {/* Specialties */}
                  <div className="mb-4">
                    <div className="flex flex-wrap gap-1.5">
                      {tech.specialty.slice(0, 3).map(spec => {
                        const specInfo = technicianSpecialties.find(s => s.value === spec);
                        return (
                          <span
                            key={spec}
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs ${
                              theme === 'dark' ? 'bg-slate-700/50 text-slate-300' : 'bg-slate-100 text-slate-600'
                            }`}
                          >
                            {specInfo?.icon} {specInfo?.label}
                          </span>
                        );
                      })}
                      {tech.specialty.length > 3 && (
                        <span className={`text-xs ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>
                          +{tech.specialty.length - 3}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Stats */}
                  <div className={`flex items-center justify-between py-3 border-t ${theme === 'dark' ? 'border-slate-700/50' : 'border-slate-200'}`}>
                    <div className="text-center">
                      <p className={`text-lg font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>{tech.jobsCompleted}</p>
                      <p className={`text-xs ${theme === 'dark' ? 'text-slate-500' : 'text-slate-500'}`}>Completed</p>
                    </div>
                    <div className="text-center">
                      <p className={`text-lg font-bold ${activeJobs > 0 ? 'text-blue-500' : theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>{activeJobs}</p>
                      <p className={`text-xs ${theme === 'dark' ? 'text-slate-500' : 'text-slate-500'}`}>Active</p>
                    </div>
                    <div className="text-center">
                      {renderRating(tech.averageRating)}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className={`flex items-center gap-2 pt-3 border-t ${theme === 'dark' ? 'border-slate-700/50' : 'border-slate-200'}`}>
                    <button
                      onClick={() => handleEdit(tech)}
                      className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-all ${
                        theme === 'dark'
                          ? 'bg-slate-700/50 text-slate-300 hover:bg-slate-600/50'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      <Edit className="w-4 h-4" />
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(tech)}
                      className={`p-2 rounded-xl transition-all ${
                        theme === 'dark'
                          ? 'bg-red-500/10 text-red-400 hover:bg-red-500/20'
                          : 'bg-red-50 text-red-500 hover:bg-red-100'
                      }`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* List View */}
      {viewMode === 'list' && (
        <div className={`rounded-2xl border overflow-hidden ${theme === 'dark' ? 'border-slate-700/50' : 'border-slate-200'}`}>
          <table className="w-full">
            <thead className={theme === 'dark' ? 'bg-slate-800/50' : 'bg-slate-50'}>
              <tr>
                <th className={`px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>Technician</th>
                <th className={`px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>Contact</th>
                <th className={`px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>Specialty</th>
                <th className={`px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>Jobs</th>
                <th className={`px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>Rating</th>
                <th className={`px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>Status</th>
                <th className={`px-6 py-4 text-right text-xs font-semibold uppercase tracking-wider ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>Actions</th>
              </tr>
            </thead>
            <tbody className={`divide-y ${theme === 'dark' ? 'divide-slate-700/50' : 'divide-slate-200'}`}>
              {paginatedTechnicians.map(tech => {
                const activeJobs = getActiveJobsCount(tech.name);
                const isHighlighted = highlightedTechnicianId === tech.id;
                const statusInfo = statusConfig[tech.status];
                
                return (
                  <tr
                    key={tech.id}
                    className={`transition-colors ${
                      isHighlighted ? 'bg-emerald-500/10' : ''
                    } ${theme === 'dark' ? 'hover:bg-slate-800/30' : 'hover:bg-slate-50'}`}
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${theme === 'dark' ? 'bg-slate-700' : 'bg-slate-100'}`}>
                          <User className={`w-5 h-5 ${theme === 'dark' ? 'text-slate-300' : 'text-slate-600'}`} />
                        </div>
                        <div>
                          <p className={`font-medium ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>{tech.name}</p>
                          <p className={`text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>{tech.designation || 'Technician'}</p>
                        </div>
                      </div>
                    </td>
                    <td className={`px-6 py-4 ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                      <div className="space-y-1">
                        <p className="text-sm">{tech.phone}</p>
                        <p className="text-sm truncate max-w-[180px]">{tech.email}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-1">
                        {tech.specialty.slice(0, 2).map(spec => {
                          const specInfo = technicianSpecialties.find(s => s.value === spec);
                          return (
                            <span
                              key={spec}
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs ${
                                theme === 'dark' ? 'bg-slate-700/50 text-slate-300' : 'bg-slate-100 text-slate-600'
                              }`}
                            >
                              {specInfo?.icon} {specInfo?.label}
                            </span>
                          );
                        })}
                        {tech.specialty.length > 2 && (
                          <span className={`text-xs ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>
                            +{tech.specialty.length - 2}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-4">
                        <div className="text-center">
                          <p className={`font-semibold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>{tech.jobsCompleted}</p>
                          <p className={`text-xs ${theme === 'dark' ? 'text-slate-500' : 'text-slate-500'}`}>Done</p>
                        </div>
                        <div className="text-center">
                          <p className={`font-semibold ${activeJobs > 0 ? 'text-blue-500' : theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>{activeJobs}</p>
                          <p className={`text-xs ${theme === 'dark' ? 'text-slate-500' : 'text-slate-500'}`}>Active</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {renderRating(tech.averageRating)}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${statusInfo.bgColor} ${statusInfo.color}`}>
                        {statusInfo.icon}
                        {statusInfo.label}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleEdit(tech)}
                          className={`p-2 rounded-xl transition-all ${
                            theme === 'dark'
                              ? 'bg-slate-700/50 text-slate-300 hover:bg-slate-600/50'
                              : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                          }`}
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(tech)}
                          className={`p-2 rounded-xl transition-all ${
                            theme === 'dark'
                              ? 'bg-red-500/10 text-red-400 hover:bg-red-500/20'
                              : 'bg-red-50 text-red-500 hover:bg-red-100'
                          }`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Empty State */}
      {paginatedTechnicians.length === 0 && (
        <div className={`text-center py-12 rounded-2xl border ${theme === 'dark' ? 'bg-slate-800/30 border-slate-700/50' : 'bg-white border-slate-200'}`}>
          <Wrench className={`w-12 h-12 mx-auto mb-4 ${theme === 'dark' ? 'text-slate-600' : 'text-slate-400'}`} />
          <h3 className={`text-lg font-medium mb-2 ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
            No technicians found
          </h3>
          <p className={`text-sm mb-4 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
            {hasActiveFilters ? 'Try adjusting your filters' : 'Add your first technician to get started'}
          </p>
          {!hasActiveFilters && (
            <button
              onClick={handleAddNew}
              className="px-4 py-2 bg-gradient-to-r from-emerald-500 to-blue-500 text-white rounded-xl font-medium"
            >
              Add Technician
            </button>
          )}
        </div>
      )}

      {/* Pagination */}
      {filteredTechnicians.length > 0 && (
        <div className={`p-4 rounded-2xl border ${
          theme === 'dark' 
            ? 'bg-slate-800/30 border-slate-700/50' 
            : 'bg-white border-slate-200'
        }`}>
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            {/* Results Info */}
            <div className="flex items-center gap-4">
              <p className={`text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                Showing <span className="font-medium">{((currentPage - 1) * itemsPerPage) + 1}</span> - <span className="font-medium">{Math.min(currentPage * itemsPerPage, filteredTechnicians.length)}</span> of <span className="font-medium">{filteredTechnicians.length}</span> technicians
              </p>
              
              {/* Items Per Page Selector - Creative Pill Buttons */}
              <div className="flex items-center gap-2">
                <span className={`text-sm ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>Show:</span>
                <div className={`flex items-center rounded-full p-0.5 ${
                  theme === 'dark' ? 'bg-slate-800' : 'bg-slate-100'
                }`}>
                  {(viewMode === 'grid' ? [6, 12] : [10, 20]).map(n => (
                    <button
                      key={n}
                      onClick={() => { setItemsPerPage(n); setCurrentPage(1); }}
                      className={`px-3 py-1 rounded-full text-sm font-medium transition-all ${
                        itemsPerPage === n
                          ? 'bg-emerald-500 text-white shadow-md'
                          : theme === 'dark'
                            ? 'text-slate-400 hover:text-white'
                            : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      {n}
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
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
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
                  {getPageNumbers.map((page, idx) => (
                    page === '...' ? (
                      <span key={`ellipsis-${idx}`} className={`px-2 ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>
                        ...
                      </span>
                    ) : (
                      <button
                        key={idx}
                        onClick={() => typeof page === 'number' && setCurrentPage(page)}
                        className={`w-9 h-9 rounded-lg text-sm font-medium transition-all ${
                          page === currentPage
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
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
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

      {/* Technician Form Modal */}
      <TechnicianFormModal
        isOpen={isFormModalOpen}
        onClose={() => setIsFormModalOpen(false)}
        onSave={handleSaveTechnician}
        technician={selectedTechnician}
      />

      {/* Delete Confirmation Modal */}
      <DeleteConfirmationModal
        isOpen={isDeleteModalOpen}
        onCancel={() => setIsDeleteModalOpen(false)}
        onConfirm={confirmDelete}
        title="Delete Technician"
        message={`Are you sure you want to delete "${technicianToDelete?.name}"? This action cannot be undone.`}
      />
    </div>
  );
};
