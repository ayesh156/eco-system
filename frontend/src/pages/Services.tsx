import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../contexts/ThemeContext';
import { 
  mockServices, 
  serviceCategories, 
  type Service, 
  type ServiceCategory, 
  type ServiceStatus 
} from '../data/mockData';
import { SearchableSelect } from '../components/ui/searchable-select';
import { DeleteConfirmationModal } from '../components/modals/DeleteConfirmationModal';
import {
  Search,
  Plus,
  Edit3,
  Trash2,
  Eye,
  Wrench,
  Settings2,
  Download,
  Monitor,
  HardDrive,
  Wifi,
  Shield,
  Sparkles,
  Clock,
  TrendingUp,
  Star,
  LayoutGrid,
  List,
  CheckCircle,
  XCircle,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Zap,
  Package,
  Users,
  Activity,
  ArrowUpRight,
  Layers,
} from 'lucide-react';

export const Services: React.FC = () => {
  const { theme } = useTheme();
  const navigate = useNavigate();
  
  // State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [showPopularOnly, setShowPopularOnly] = useState(false);
  const [viewMode, setViewMode] = useState<'card' | 'table'>('card');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(12);
  
  // Modal states
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [serviceToDelete, setServiceToDelete] = useState<Service | null>(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  
  // Local services state
  const [services, setServices] = useState<Service[]>(mockServices);

  // Category options for select
  const categoryOptions = [
    { value: 'all', label: 'All Categories', count: services.length },
    ...serviceCategories.map(cat => ({
      value: cat.value,
      label: `${cat.icon} ${cat.label}`,
      count: services.filter(s => s.category === cat.value).length
    }))
  ];

  // Status options
  const statusOptions = [
    { value: 'all', label: 'All Status' },
    { value: 'active', label: '✅ Active' },
    { value: 'inactive', label: '⏸️ Inactive' },
    { value: 'discontinued', label: '❌ Discontinued' },
  ];

  // Status config
  const statusConfig: Record<ServiceStatus, { label: string; color: string; bgColor: string; icon: React.ReactNode }> = {
    active: {
      label: 'Active',
      color: 'text-emerald-500',
      bgColor: theme === 'dark' ? 'bg-emerald-500/10' : 'bg-emerald-50',
      icon: <CheckCircle className="w-4 h-4" />,
    },
    inactive: {
      label: 'Inactive',
      color: 'text-amber-500',
      bgColor: theme === 'dark' ? 'bg-amber-500/10' : 'bg-amber-50',
      icon: <AlertCircle className="w-4 h-4" />,
    },
    discontinued: {
      label: 'Discontinued',
      color: 'text-red-500',
      bgColor: theme === 'dark' ? 'bg-red-500/10' : 'bg-red-50',
      icon: <XCircle className="w-4 h-4" />,
    },
  };

  // Get category icon
  const getCategoryIcon = (category: ServiceCategory) => {
    const iconClass = "w-5 h-5";
    switch (category) {
      case 'repair': return <Wrench className={`${iconClass} text-orange-500`} />;
      case 'maintenance': return <Settings2 className={`${iconClass} text-blue-500`} />;
      case 'installation': return <Download className={`${iconClass} text-purple-500`} />;
      case 'upgrade': return <ArrowUpRight className={`${iconClass} text-cyan-500`} />;
      case 'data_recovery': return <HardDrive className={`${iconClass} text-red-500`} />;
      case 'networking': return <Wifi className={`${iconClass} text-green-500`} />;
      case 'software': return <Monitor className={`${iconClass} text-indigo-500`} />;
      case 'consultation': return <Users className={`${iconClass} text-pink-500`} />;
      case 'cleaning': return <Sparkles className={`${iconClass} text-yellow-500`} />;
      default: return <Package className={`${iconClass} text-slate-500`} />;
    }
  };

  // Filter services
  const filteredServices = useMemo(() => {
    return services.filter(service => {
      const matchesSearch = service.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           service.description.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = selectedCategory === 'all' || service.category === selectedCategory;
      const matchesStatus = selectedStatus === 'all' || service.status === selectedStatus;
      const matchesPopular = !showPopularOnly || service.isPopular;
      
      return matchesSearch && matchesCategory && matchesStatus && matchesPopular;
    });
  }, [services, searchQuery, selectedCategory, selectedStatus, showPopularOnly]);

  // Pagination
  const totalPages = Math.ceil(filteredServices.length / itemsPerPage);
  const paginatedServices = filteredServices.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Statistics
  const stats = useMemo(() => {
    const active = services.filter(s => s.status === 'active').length;
    const popular = services.filter(s => s.isPopular).length;
    const totalRevenue = services.reduce((sum, s) => sum + s.totalRevenue, 0);
    const totalCompleted = services.reduce((sum, s) => sum + s.totalCompleted, 0);
    
    return { active, popular, totalRevenue, totalCompleted, total: services.length };
  }, [services]);

  // Format currency
  const formatCurrency = (amount: number) => `Rs. ${amount.toLocaleString('en-LK')}`;

  // Format price display
  const formatPriceDisplay = (service: Service) => {
    if (service.priceType === 'fixed') {
      return service.basePrice === 0 ? 'Free' : formatCurrency(service.basePrice);
    } else if (service.priceType === 'hourly') {
      return `${formatCurrency(service.hourlyRate || 0)}/hr`;
    } else if (service.priceType === 'quote') {
      return 'Get Quote';
    } else {
      return `${formatCurrency(service.minPrice || 0)} - ${formatCurrency(service.maxPrice || 0)}`;
    }
  };

  // Handlers
  const handleAddService = () => navigate('/services/add');
  const handleEditService = (service: Service) => navigate(`/services/edit/${service.id}`);
  const handleViewService = (service: Service) => {
    setSelectedService(service);
    setIsViewModalOpen(true);
  };
  const handleDeleteClick = (service: Service) => {
    setServiceToDelete(service);
    setIsDeleteModalOpen(true);
  };
  const handleConfirmDelete = () => {
    if (serviceToDelete) {
      setServices(prev => prev.filter(s => s.id !== serviceToDelete.id));
      setIsDeleteModalOpen(false);
      setServiceToDelete(null);
    }
  };

  // Get page numbers for pagination
  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    const maxVisiblePages = 5;
    
    if (totalPages <= maxVisiblePages) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      if (currentPage <= 3) {
        pages.push(1, 2, 3, 4, '...', totalPages);
      } else if (currentPage >= totalPages - 2) {
        pages.push(1, '...', totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
      } else {
        pages.push(1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages);
      }
    }
    return pages;
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
        <div>
          <h1 className={`text-2xl sm:text-3xl font-bold bg-gradient-to-r from-emerald-500 to-teal-500 bg-clip-text text-transparent flex items-center gap-3`}>
            <div className="p-2 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 text-white">
              <Wrench className="w-6 h-6" />
            </div>
            Services
          </h1>
          <p className={`mt-1 text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
            Manage computer repair, maintenance & IT services
          </p>
        </div>
        <button
          onClick={handleAddService}
          className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-medium hover:from-emerald-600 hover:to-teal-600 transition-all shadow-lg shadow-emerald-500/25"
        >
          <Plus className="w-5 h-5" />
          <span>Add Service</span>
        </button>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Total Services */}
        <div className={`p-4 rounded-2xl border ${
          theme === 'dark' 
            ? 'bg-gradient-to-br from-slate-800/80 to-slate-900/80 border-slate-700/50' 
            : 'bg-gradient-to-br from-white to-slate-50 border-slate-200'
        }`}>
          <div className="flex items-center gap-3">
            <div className={`p-3 rounded-xl ${
              theme === 'dark' ? 'bg-blue-500/10' : 'bg-blue-50'
            }`}>
              <Layers className="w-6 h-6 text-blue-500" />
            </div>
            <div>
              <p className={`text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>Total Services</p>
              <p className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>{stats.total}</p>
            </div>
          </div>
        </div>

        {/* Active Services */}
        <div className={`p-4 rounded-2xl border ${
          theme === 'dark' 
            ? 'bg-gradient-to-br from-slate-800/80 to-slate-900/80 border-slate-700/50' 
            : 'bg-gradient-to-br from-white to-slate-50 border-slate-200'
        }`}>
          <div className="flex items-center gap-3">
            <div className={`p-3 rounded-xl ${
              theme === 'dark' ? 'bg-emerald-500/10' : 'bg-emerald-50'
            }`}>
              <Zap className="w-6 h-6 text-emerald-500" />
            </div>
            <div>
              <p className={`text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>Active</p>
              <p className={`text-2xl font-bold text-emerald-500`}>{stats.active}</p>
            </div>
          </div>
        </div>

        {/* Jobs Completed */}
        <div className={`p-4 rounded-2xl border ${
          theme === 'dark' 
            ? 'bg-gradient-to-br from-slate-800/80 to-slate-900/80 border-slate-700/50' 
            : 'bg-gradient-to-br from-white to-slate-50 border-slate-200'
        }`}>
          <div className="flex items-center gap-3">
            <div className={`p-3 rounded-xl ${
              theme === 'dark' ? 'bg-purple-500/10' : 'bg-purple-50'
            }`}>
              <Activity className="w-6 h-6 text-purple-500" />
            </div>
            <div>
              <p className={`text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>Jobs Done</p>
              <p className={`text-2xl font-bold text-purple-500`}>{stats.totalCompleted.toLocaleString()}</p>
            </div>
          </div>
        </div>

        {/* Total Revenue */}
        <div className={`p-4 rounded-2xl border ${
          theme === 'dark' 
            ? 'bg-gradient-to-br from-slate-800/80 to-slate-900/80 border-slate-700/50' 
            : 'bg-gradient-to-br from-white to-slate-50 border-slate-200'
        }`}>
          <div className="flex items-center gap-3">
            <div className={`p-3 rounded-xl ${
              theme === 'dark' ? 'bg-amber-500/10' : 'bg-amber-50'
            }`}>
              <TrendingUp className="w-6 h-6 text-amber-500" />
            </div>
            <div>
              <p className={`text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>Revenue</p>
              <p className={`text-xl font-bold text-amber-500`}>Rs. {(stats.totalRevenue / 1000000).toFixed(1)}M</p>
            </div>
          </div>
        </div>
      </div>

      {/* Search & Filters */}
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
              placeholder="Search services..."
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
              className={`bg-transparent border-none outline-none flex-1 min-w-0 text-sm ${
                theme === 'dark' ? 'text-white placeholder-slate-500' : 'text-slate-900 placeholder-slate-400'
              }`}
            />
          </div>

          {/* Filters Row */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Category Filter */}
            <div className="w-full sm:w-48">
              <SearchableSelect
                options={categoryOptions}
                value={selectedCategory}
                onValueChange={(val) => { setSelectedCategory(val); setCurrentPage(1); }}
                placeholder="All Categories"
                searchPlaceholder="Search categories..."
                emptyMessage="No categories found"
                theme={theme}
              />
            </div>

            {/* Status Filter */}
            <div className="w-full sm:w-36">
              <SearchableSelect
                options={statusOptions}
                value={selectedStatus}
                onValueChange={(val) => { setSelectedStatus(val); setCurrentPage(1); }}
                placeholder="All Status"
                theme={theme}
              />
            </div>

            {/* Popular Only Toggle */}
            <button
              onClick={() => { setShowPopularOnly(!showPopularOnly); setCurrentPage(1); }}
              className={`flex items-center gap-2 px-3 py-2 rounded-xl transition-colors ${
                showPopularOnly
                  ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white'
                  : theme === 'dark'
                    ? 'bg-slate-700 hover:bg-slate-600 text-slate-300'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
              }`}
            >
              <Star className={`w-4 h-4 ${showPopularOnly ? 'fill-white' : ''}`} />
              <span className="text-sm">Popular</span>
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
            </div>
          </div>
        </div>
      </div>

      {/* Services Display */}
      {viewMode === 'card' ? (
        /* Card View */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {paginatedServices.map((service) => (
            <div
              key={service.id}
              className={`group relative p-4 rounded-2xl border transition-all hover:shadow-xl ${
                theme === 'dark'
                  ? 'bg-gradient-to-br from-slate-800/80 to-slate-900/80 border-slate-700/50 hover:border-emerald-500/50'
                  : 'bg-gradient-to-br from-white to-slate-50 border-slate-200 hover:border-emerald-300'
              }`}
            >
              {/* Popular Badge */}
              {service.isPopular && (
                <div className="absolute -top-2 -right-2">
                  <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 text-white text-xs font-medium shadow-lg">
                    <Star className="w-3 h-3 fill-white" />
                    Popular
                  </div>
                </div>
              )}

              {/* Header */}
              <div className="flex items-start gap-3 mb-3">
                <div className={`p-3 rounded-xl ${
                  theme === 'dark' ? 'bg-slate-700/50' : 'bg-slate-100'
                }`}>
                  {getCategoryIcon(service.category)}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className={`font-semibold truncate ${
                    theme === 'dark' ? 'text-white' : 'text-slate-900'
                  }`}>
                    {service.name}
                  </h3>
                  <p className={`text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                    {serviceCategories.find(c => c.value === service.category)?.label}
                  </p>
                </div>
              </div>

              {/* Description */}
              <p className={`text-sm mb-3 line-clamp-2 ${
                theme === 'dark' ? 'text-slate-400' : 'text-slate-600'
              }`}>
                {service.description}
              </p>

              {/* Price & Duration */}
              <div className="flex items-center justify-between mb-3">
                <div className={`text-lg font-bold ${
                  service.basePrice === 0 ? 'text-emerald-500' : 'text-emerald-500'
                }`}>
                  {formatPriceDisplay(service)}
                </div>
                <div className={`flex items-center gap-1 text-xs ${
                  theme === 'dark' ? 'text-slate-400' : 'text-slate-500'
                }`}>
                  <Clock className="w-3 h-3" />
                  {service.estimatedDuration}
                </div>
              </div>

              {/* Stats Row */}
              <div className={`flex items-center justify-between py-2 border-t ${
                theme === 'dark' ? 'border-slate-700' : 'border-slate-200'
              }`}>
                <div className="flex items-center gap-4 text-xs">
                  <span className={theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}>
                    <Activity className="w-3 h-3 inline mr-1" />
                    {service.totalCompleted} done
                  </span>
                </div>
                <span className={`px-2 py-1 rounded-lg text-xs font-medium flex items-center gap-1 ${
                  statusConfig[service.status].bgColor
                } ${statusConfig[service.status].color}`}>
                  {statusConfig[service.status].icon}
                  {statusConfig[service.status].label}
                </span>
              </div>

              {/* Actions */}
              <div className={`flex items-center gap-2 pt-3 border-t ${
                theme === 'dark' ? 'border-slate-700' : 'border-slate-200'
              }`}>
                <button
                  onClick={() => handleViewService(service)}
                  className={`flex-1 flex items-center justify-center gap-1 py-2 rounded-xl text-sm font-medium transition-colors ${
                    theme === 'dark'
                      ? 'bg-slate-700/50 text-slate-300 hover:bg-slate-700'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  <Eye className="w-4 h-4" />
                  View
                </button>
                <button
                  onClick={() => handleEditService(service)}
                  className="flex-1 flex items-center justify-center gap-1 py-2 rounded-xl text-sm font-medium bg-gradient-to-r from-emerald-500 to-teal-500 text-white hover:from-emerald-600 hover:to-teal-600 transition-colors"
                >
                  <Edit3 className="w-4 h-4" />
                  Edit
                </button>
                <button
                  onClick={() => handleDeleteClick(service)}
                  className={`p-2 rounded-xl transition-colors ${
                    theme === 'dark'
                      ? 'bg-red-500/10 text-red-400 hover:bg-red-500/20'
                      : 'bg-red-50 text-red-500 hover:bg-red-100'
                  }`}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* Table View */
        <div className={`rounded-2xl border overflow-hidden ${
          theme === 'dark' 
            ? 'bg-slate-800/30 border-slate-700/50' 
            : 'bg-white border-slate-200'
        }`}>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className={theme === 'dark' ? 'bg-slate-800/50' : 'bg-slate-50'}>
                  <th className={`px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider ${
                    theme === 'dark' ? 'text-slate-400' : 'text-slate-500'
                  }`}>Service</th>
                  <th className={`px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider ${
                    theme === 'dark' ? 'text-slate-400' : 'text-slate-500'
                  }`}>Category</th>
                  <th className={`px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider ${
                    theme === 'dark' ? 'text-slate-400' : 'text-slate-500'
                  }`}>Price</th>
                  <th className={`px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider ${
                    theme === 'dark' ? 'text-slate-400' : 'text-slate-500'
                  }`}>Duration</th>
                  <th className={`px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider ${
                    theme === 'dark' ? 'text-slate-400' : 'text-slate-500'
                  }`}>Completed</th>
                  <th className={`px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider ${
                    theme === 'dark' ? 'text-slate-400' : 'text-slate-500'
                  }`}>Status</th>
                  <th className={`px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider ${
                    theme === 'dark' ? 'text-slate-400' : 'text-slate-500'
                  }`}>Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/30">
                {paginatedServices.map((service) => (
                  <tr 
                    key={service.id}
                    className={`transition-colors ${
                      theme === 'dark' ? 'hover:bg-slate-800/50' : 'hover:bg-slate-50'
                    }`}
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${
                          theme === 'dark' ? 'bg-slate-700/50' : 'bg-slate-100'
                        }`}>
                          {getCategoryIcon(service.category)}
                        </div>
                        <div>
                          <div className={`font-medium flex items-center gap-2 ${
                            theme === 'dark' ? 'text-white' : 'text-slate-900'
                          }`}>
                            {service.name}
                            {service.isPopular && (
                              <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                            )}
                          </div>
                          <div className={`text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                            {service.warranty || 'No warranty'}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-sm ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                        {serviceCategories.find(c => c.value === service.category)?.label}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-semibold text-emerald-500">
                        {formatPriceDisplay(service)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                        {service.estimatedDuration}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-sm font-medium ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                        {service.totalCompleted}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium ${
                        statusConfig[service.status].bgColor
                      } ${statusConfig[service.status].color}`}>
                        {statusConfig[service.status].icon}
                        {statusConfig[service.status].label}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleViewService(service)}
                          className={`p-2 rounded-lg transition-colors ${
                            theme === 'dark'
                              ? 'hover:bg-slate-700 text-slate-400 hover:text-white'
                              : 'hover:bg-slate-100 text-slate-500 hover:text-slate-700'
                          }`}
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleEditService(service)}
                          className={`p-2 rounded-lg transition-colors ${
                            theme === 'dark'
                              ? 'hover:bg-emerald-500/20 text-emerald-400'
                              : 'hover:bg-emerald-50 text-emerald-500'
                          }`}
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteClick(service)}
                          className={`p-2 rounded-lg transition-colors ${
                            theme === 'dark'
                              ? 'hover:bg-red-500/20 text-red-400'
                              : 'hover:bg-red-50 text-red-500'
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
      {filteredServices.length > 0 && (
        <div className={`p-4 rounded-2xl border ${
          theme === 'dark' 
            ? 'bg-slate-800/30 border-slate-700/50' 
            : 'bg-white border-slate-200'
        }`}>
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            {/* Results Info */}
            <div className="flex items-center gap-4">
              <p className={`text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                Showing <span className="font-medium">{(currentPage - 1) * itemsPerPage + 1}</span> - <span className="font-medium">{Math.min(currentPage * itemsPerPage, filteredServices.length)}</span> of <span className="font-medium">{filteredServices.length}</span> services
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
                  {getPageNumbers().map((page, index) => (
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
      {filteredServices.length === 0 && (
        <div className={`p-8 rounded-2xl border text-center ${
          theme === 'dark' 
            ? 'bg-slate-800/30 border-slate-700/50' 
            : 'bg-white border-slate-200'
        }`}>
          <Wrench className={`w-12 h-12 mx-auto mb-3 ${theme === 'dark' ? 'text-slate-600' : 'text-slate-300'}`} />
          <p className={`font-medium ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
            No services found
          </p>
          <p className={`text-sm mt-1 ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>
            Try adjusting your filters or add a new service
          </p>
        </div>
      )}

      {/* View Service Modal */}
      {isViewModalOpen && selectedService && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className={`w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl border shadow-2xl ${
            theme === 'dark' 
              ? 'bg-slate-900 border-slate-700' 
              : 'bg-white border-slate-200'
          }`}>
            {/* Modal Header */}
            <div className={`sticky top-0 z-10 flex items-center justify-between p-6 border-b ${
              theme === 'dark' ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-200'
            }`}>
              <div className="flex items-center gap-3">
                <div className={`p-3 rounded-xl ${
                  theme === 'dark' ? 'bg-slate-800' : 'bg-slate-100'
                }`}>
                  {getCategoryIcon(selectedService.category)}
                </div>
                <div>
                  <h2 className={`text-xl font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                    {selectedService.name}
                  </h2>
                  <p className={`text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                    {serviceCategories.find(c => c.value === selectedService.category)?.label}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsViewModalOpen(false)}
                className={`p-2 rounded-lg transition-colors ${
                  theme === 'dark' ? 'hover:bg-slate-800 text-slate-400' : 'hover:bg-slate-100 text-slate-500'
                }`}
              >
                <XCircle className="w-6 h-6" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-6">
              {/* Status & Popular */}
              <div className="flex items-center gap-3">
                <span className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium ${
                  statusConfig[selectedService.status].bgColor
                } ${statusConfig[selectedService.status].color}`}>
                  {statusConfig[selectedService.status].icon}
                  {statusConfig[selectedService.status].label}
                </span>
                {selectedService.isPopular && (
                  <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium bg-gradient-to-r from-amber-500 to-orange-500 text-white">
                    <Star className="w-4 h-4 fill-white" />
                    Popular Service
                  </span>
                )}
              </div>

              {/* Description */}
              <div>
                <h3 className={`text-sm font-semibold mb-2 ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                  Description
                </h3>
                <p className={theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}>
                  {selectedService.description}
                </p>
              </div>

              {/* Pricing Info */}
              <div className={`p-4 rounded-xl ${
                theme === 'dark' ? 'bg-slate-800/50' : 'bg-slate-50'
              }`}>
                <h3 className={`text-sm font-semibold mb-3 ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                  Pricing Details
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className={`text-xs ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>Price</p>
                    <p className="text-xl font-bold text-emerald-500">{formatPriceDisplay(selectedService)}</p>
                  </div>
                  <div>
                    <p className={`text-xs ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>Price Type</p>
                    <p className={`font-medium capitalize ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                      {selectedService.priceType}
                    </p>
                  </div>
                </div>
              </div>

              {/* Time & Warranty */}
              <div className="grid grid-cols-2 gap-4">
                <div className={`p-4 rounded-xl ${
                  theme === 'dark' ? 'bg-slate-800/50' : 'bg-slate-50'
                }`}>
                  <div className="flex items-center gap-2 mb-2">
                    <Clock className="w-4 h-4 text-blue-500" />
                    <p className={`text-xs ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>Duration</p>
                  </div>
                  <p className={`font-medium ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                    {selectedService.estimatedDuration}
                  </p>
                </div>
                <div className={`p-4 rounded-xl ${
                  theme === 'dark' ? 'bg-slate-800/50' : 'bg-slate-50'
                }`}>
                  <div className="flex items-center gap-2 mb-2">
                    <Shield className="w-4 h-4 text-emerald-500" />
                    <p className={`text-xs ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>Warranty</p>
                  </div>
                  <p className={`font-medium ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                    {selectedService.warranty || 'No warranty'}
                  </p>
                </div>
              </div>

              {/* Statistics */}
              <div className={`p-4 rounded-xl ${
                theme === 'dark' ? 'bg-gradient-to-r from-emerald-900/30 to-teal-900/30 border border-emerald-500/30' : 'bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200'
              }`}>
                <h3 className={`text-sm font-semibold mb-3 ${theme === 'dark' ? 'text-emerald-400' : 'text-emerald-700'}`}>
                  Performance Stats
                </h3>
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <p className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                      {selectedService.totalCompleted}
                    </p>
                    <p className={`text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>Jobs Completed</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-emerald-500">
                      {formatCurrency(selectedService.totalRevenue)}
                    </p>
                    <p className={`text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>Total Revenue</p>
                  </div>
                  <div>
                    <p className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                      {selectedService.lastPerformed || 'N/A'}
                    </p>
                    <p className={`text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>Last Performed</p>
                  </div>
                </div>
              </div>

              {/* Requirements & Notes */}
              {(selectedService.requirements || selectedService.notes) && (
                <div className="space-y-3">
                  {selectedService.requirements && (
                    <div>
                      <h3 className={`text-sm font-semibold mb-1 ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                        Requirements
                      </h3>
                      <p className={`text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                        {selectedService.requirements}
                      </p>
                    </div>
                  )}
                  {selectedService.notes && (
                    <div>
                      <h3 className={`text-sm font-semibold mb-1 ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                        Notes
                      </h3>
                      <p className={`text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                        {selectedService.notes}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className={`sticky bottom-0 flex items-center justify-end gap-3 p-6 border-t ${
              theme === 'dark' ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-200'
            }`}>
              <button
                onClick={() => setIsViewModalOpen(false)}
                className={`px-4 py-2 rounded-xl font-medium transition-colors ${
                  theme === 'dark'
                    ? 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                Close
              </button>
              <button
                onClick={() => {
                  setIsViewModalOpen(false);
                  handleEditService(selectedService);
                }}
                className="px-4 py-2 rounded-xl font-medium bg-gradient-to-r from-emerald-500 to-teal-500 text-white hover:from-emerald-600 hover:to-teal-600 transition-all"
              >
                Edit Service
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Modal */}
      <DeleteConfirmationModal
        isOpen={isDeleteModalOpen}
        title="Delete Service"
        message="Are you sure you want to delete this service? This action cannot be undone."
        itemName={serviceToDelete?.name}
        onConfirm={handleConfirmDelete}
        onCancel={() => setIsDeleteModalOpen(false)}
      />
    </div>
  );
};
