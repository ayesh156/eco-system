import { useState, useMemo, useRef, useEffect } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { 
  mockWarrantyClaims, 
  mockProducts, 
  mockCustomers as initialMockCustomers,
  mockInvoices as initialMockInvoices,
  type WarrantyClaim,
  type Customer,
  type Invoice
} from '../data/mockData';
import { SearchableSelect } from '../components/ui/searchable-select';
import { WarrantyClaimFormModal } from '../components/modals/WarrantyClaimFormModal';
import { WarrantyClaimViewModal } from '../components/modals/WarrantyClaimViewModal';
import { DeleteConfirmationModal } from '../components/modals/DeleteConfirmationModal';
import {
  Shield,
  Search,
  Filter,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Clock,
  CheckCircle,
  XCircle,
  RefreshCw,
  Wrench,
  User,
  Calendar,
  FileText,
  Eye,
  Edit,
  Plus,
  LayoutGrid,
  List,
  SortAsc,
  SortDesc,
  Trash2,
  DollarSign,
  Zap,
} from 'lucide-react';

// Status configuration with colors and icons
const statusConfig: Record<WarrantyClaim['status'], { label: string; color: string; bgColor: string; borderColor: string; icon: React.ElementType }> = {
  pending: { label: 'Pending', color: 'text-yellow-500', bgColor: 'bg-yellow-500/10', borderColor: 'border-yellow-500/20', icon: Clock },
  'under-review': { label: 'Under Review', color: 'text-blue-500', bgColor: 'bg-blue-500/10', borderColor: 'border-blue-500/20', icon: Search },
  approved: { label: 'Approved', color: 'text-emerald-500', bgColor: 'bg-emerald-500/10', borderColor: 'border-emerald-500/20', icon: CheckCircle },
  rejected: { label: 'Rejected', color: 'text-red-500', bgColor: 'bg-red-500/10', borderColor: 'border-red-500/20', icon: XCircle },
  replaced: { label: 'Replaced', color: 'text-purple-500', bgColor: 'bg-purple-500/10', borderColor: 'border-purple-500/20', icon: RefreshCw },
  repaired: { label: 'Repaired', color: 'text-cyan-500', bgColor: 'bg-cyan-500/10', borderColor: 'border-cyan-500/20', icon: Wrench },
};

const issueCategoryConfig: Record<WarrantyClaim['issueCategory'], { label: string; color: string }> = {
  defective: { label: 'Defective', color: 'text-red-500' },
  damaged: { label: 'Damaged', color: 'text-orange-500' },
  'not-working': { label: 'Not Working', color: 'text-yellow-500' },
  performance: { label: 'Performance Issue', color: 'text-blue-500' },
  other: { label: 'Other', color: 'text-slate-500' },
};

// Workflow stage configuration
const workflowStageConfig: Record<string, { label: string; color: string; bgColor: string; icon: string }> = {
  'received': { label: 'Received', color: 'text-blue-500', bgColor: 'bg-blue-500/10', icon: '📥' },
  'inspecting': { label: 'Inspecting', color: 'text-amber-500', bgColor: 'bg-amber-500/10', icon: '🔍' },
  'awaiting_parts': { label: 'Awaiting Parts', color: 'text-orange-500', bgColor: 'bg-orange-500/10', icon: '📦' },
  'repairing': { label: 'Repairing', color: 'text-purple-500', bgColor: 'bg-purple-500/10', icon: '🔧' },
  'testing': { label: 'Testing', color: 'text-cyan-500', bgColor: 'bg-cyan-500/10', icon: '🧪' },
  'ready': { label: 'Ready', color: 'text-green-500', bgColor: 'bg-green-500/10', icon: '✅' },
  'completed': { label: 'Completed', color: 'text-emerald-500', bgColor: 'bg-emerald-500/10', icon: '🎉' }
};

export function Warranties() {
  const { theme } = useTheme();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [categoryFilter, setCategoryFilter] = useState<string>('');
  const [productFilter, setProductFilter] = useState<string>('');
  const [customerFilter, setCustomerFilter] = useState<string>('');
  const [showFilters, setShowFilters] = useState(false);
  const [viewMode, setViewMode] = useState<'card' | 'table'>('card');

  const [sortBy, setSortBy] = useState<'date-desc' | 'date-asc'>('date-desc');

  // Date filter states
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Calendar states
  const [showStartCalendar, setShowStartCalendar] = useState(false);
  const [showEndCalendar, setShowEndCalendar] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState(new Date());
  const startCalendarRef = useRef<HTMLDivElement>(null);
  const endCalendarRef = useRef<HTMLDivElement>(null);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(viewMode === 'card' ? 9 : 10);

  // Update itemsPerPage and reset currentPage when viewMode changes
  useEffect(() => {
    setItemsPerPage(viewMode === 'card' ? 9 : 10);
    setCurrentPage(1);
  }, [viewMode]);

  // Claims state for CRUD operations
  const [claims, setClaims] = useState<WarrantyClaim[]>(mockWarrantyClaims);
  
  // Customer and Invoice state for credit-warranty integration
  const [customers, setCustomers] = useState<Customer[]>(initialMockCustomers);
  const [invoices, setInvoices] = useState<Invoice[]>(initialMockInvoices);

  // Modal states
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [selectedClaim, setSelectedClaim] = useState<WarrantyClaim | undefined>(undefined);
  const [claimToDelete, setClaimToDelete] = useState<WarrantyClaim | null>(null);
  const [claimToView, setClaimToView] = useState<WarrantyClaim | null>(null);

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

  // Filter options
  const statusOptions = [
    { value: '', label: 'All Statuses' },
    ...Object.entries(statusConfig).map(([value, { label }]) => ({ value, label })),
  ];

  const categoryOptions = [
    { value: '', label: 'All Categories' },
    ...Object.entries(issueCategoryConfig).map(([value, { label }]) => ({ value, label })),
  ];

  const productOptions = [
    { value: '', label: 'All Products' },
    ...mockProducts.map((p) => ({ value: p.id, label: p.name })),
  ];

  const customerOptions = [
    { value: '', label: 'All Customers' },
    ...customers.map((c) => ({ value: c.id, label: c.name })),
  ];

  // Filtered and sorted claims
  const filteredClaims = useMemo(() => {
    let filtered = [...claims];

    // Search filter
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (claim) =>
          claim.id.toLowerCase().includes(search) ||
          claim.productName.toLowerCase().includes(search) ||
          claim.customerName.toLowerCase().includes(search) ||
          claim.invoiceId.toLowerCase().includes(search) ||
          claim.issueDescription.toLowerCase().includes(search)
      );
    }

    // Status filter
    if (statusFilter) {
      filtered = filtered.filter((claim) => claim.status === statusFilter);
    }

    // Category filter
    if (categoryFilter) {
      filtered = filtered.filter((claim) => claim.issueCategory === categoryFilter);
    }

    // Product filter
    if (productFilter) {
      filtered = filtered.filter((claim) => claim.productId === productFilter);
    }

    // Customer filter
    if (customerFilter) {
      filtered = filtered.filter((claim) => claim.customerId === customerFilter);
    }

    // Date filter
    if (startDate || endDate) {
      filtered = filtered.filter((claim) => {
        const claimDate = new Date(claim.claimDate);
        if (startDate) {
          const start = new Date(startDate);
          start.setHours(0, 0, 0, 0);
          if (claimDate < start) return false;
        }
        if (endDate) {
          const end = new Date(endDate);
          end.setHours(23, 59, 59, 999);
          if (claimDate > end) return false;
        }
        return true;
      });
    }

    // Sorting by date
    filtered.sort((a, b) => {
      const dateA = new Date(a.claimDate).getTime();
      const dateB = new Date(b.claimDate).getTime();
      return sortBy === 'date-desc' ? dateB - dateA : dateA - dateB;
    });

    return filtered;
  }, [claims, searchTerm, statusFilter, categoryFilter, productFilter, customerFilter, startDate, endDate, sortBy]);

  // Pagination
  const totalPages = Math.ceil(filteredClaims.length / itemsPerPage);
  const paginatedClaims = filteredClaims.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  // Analytics with credit impact tracking
  const analytics = useMemo(() => {
    const pending = claims.filter((c) => c.status === 'pending' || c.status === 'under-review').length;
    const resolved = claims.filter((c) => ['approved', 'replaced', 'repaired'].includes(c.status)).length;
    const rejected = claims.filter((c) => c.status === 'rejected').length;
    const replacements = claims.filter((c) => c.isReplacement).length;
    
    // Calculate total credits issued from warranty claims
    const totalCreditsIssued = claims.reduce((sum, claim) => {
      return sum + (claim.financialImpact?.creditAmount || 0);
    }, 0);
    
    // Claims with financial impact
    const claimsWithCredits = claims.filter(c => c.financialImpact?.creditAmount && c.financialImpact.creditAmount > 0).length;
    
    // Workflow stats
    const inProgress = claims.filter(c => c.workflow?.stage && !['completed', 'ready'].includes(c.workflow.stage)).length;
    const urgentClaims = claims.filter(c => c.workflow?.priorityLevel === 'urgent').length;
    
    return { 
      pending, 
      resolved, 
      rejected, 
      replacements, 
      total: claims.length,
      totalCreditsIssued,
      claimsWithCredits,
      inProgress,
      urgentClaims
    };
  }, [claims]);

  // CRUD Handlers
  const handleAddClaim = () => {
    setSelectedClaim(undefined);
    setIsFormModalOpen(true);
  };

  const handleEditClaim = (claim: WarrantyClaim) => {
    setSelectedClaim(claim);
    setIsFormModalOpen(true);
  };

  const handleDeleteClick = (claim: WarrantyClaim) => {
    setClaimToDelete(claim);
    setIsDeleteModalOpen(true);
  };

  const handleSaveClaim = (claim: WarrantyClaim) => {
    if (selectedClaim) {
      setClaims((prev) => prev.map((c) => (c.id === claim.id ? claim : c)));
    } else {
      setClaims((prev) => [...prev, claim]);
    }
  };
  
  /**
   * Apply warranty credit to customer - reduces customer credit balance
   * This is called when a warranty claim results in a credit/refund
   * @reserved - Available for UI integration when status update modal triggers credit processing
   */
  const handleApplyWarrantyCredit = (claimId: string, creditAmount: number, creditType: 'full_refund' | 'partial_refund' | 'credit_note') => {
    const claim = claims.find(c => c.id === claimId);
    if (!claim) return;
    
    const customer = customers.find(c => c.id === claim.customerId);
    const invoice = invoices.find(inv => inv.id === claim.invoiceId);
    if (!customer || !invoice) return;
    
    // Update claim with financial impact
    setClaims(prev => prev.map(c => {
      if (c.id === claimId) {
        const invoiceItem = invoice.items[c.invoiceItemIndex || 0];
        return {
          ...c,
          financialImpact: {
            type: creditType,
            originalItemValue: invoiceItem?.total || 0,
            creditAmount,
            processedDate: new Date().toISOString(),
            creditTransactionId: `WC-${Date.now()}`
          }
        };
      }
      return c;
    }));
    
    // Update customer credit balance
    setCustomers(prev => prev.map(c => {
      if (c.id === claim.customerId) {
        const newCreditBalance = Math.max(0, c.creditBalance - creditAmount);
        return {
          ...c,
          creditBalance: newCreditBalance,
          creditStatus: newCreditBalance === 0 ? 'clear' : c.creditStatus
        };
      }
      return c;
    }));
    
    // Update invoice with warranty credit
    setInvoices(prev => prev.map(inv => {
      if (inv.id === claim.invoiceId) {
        return {
          ...inv,
          warrantyCredits: [...(inv.warrantyCredits || []), {
            warrantyClaimId: claimId,
            amount: creditAmount,
            date: new Date().toISOString()
          }]
        };
      }
      return inv;
    }));
  };
  
  /**
   * Update warranty claim workflow stage
   * @reserved - Available for UI integration via status update modal
   */
  const handleUpdateWorkflowStage = (claimId: string, newStage: string, notes?: string) => {
    setClaims(prev => prev.map(claim => {
      if (claim.id === claimId) {
        const existingHistory = claim.workflow?.history || [];
        return {
          ...claim,
          workflow: {
            ...claim.workflow,
            stage: newStage as any,
            history: [...existingHistory, {
              stage: newStage,
              date: new Date().toISOString(),
              notes,
              updatedBy: 'Admin'
            }],
            priorityLevel: claim.workflow?.priorityLevel || 'normal'
          }
        };
      }
      return claim;
    }));
  };

  const handleConfirmDelete = () => {
    if (claimToDelete) {
      setClaims((prev) => prev.filter((c) => c.id !== claimToDelete.id));
      setIsDeleteModalOpen(false);
      setClaimToDelete(null);
    }
  };

  const handleViewClaim = (claim: WarrantyClaim) => {
    setClaimToView(claim);
    setIsViewModalOpen(true);
  };

  // Format date time
  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return {
      date: date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
      time: date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }),
    };
  };

  // Clear all filters
  const clearFilters = () => {
    setSearchTerm('');
    setStatusFilter('');
    setCategoryFilter('');
    setProductFilter('');
    setCustomerFilter('');
    setStartDate('');
    setEndDate('');
    setCurrentPage(1);
  };

  const hasActiveFilters = statusFilter || categoryFilter || productFilter || customerFilter || searchTerm || startDate || endDate;

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
    setShowCalendar: (show: boolean) => void,
    alignRight: boolean = false
  ) => {
    const { daysInMonth, startingDay } = getDaysInMonth(calendarMonth);
    const days = [];
    const selectedDateObj = selectedDate ? new Date(selectedDate) : null;

    for (let i = 0; i < startingDay; i++) {
      days.push(<div key={`empty-${i}`} className="w-8 h-8" />);
    }

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
      <div className={`absolute top-full mt-2 p-3 rounded-xl border shadow-xl z-50 min-w-[280px] ${
        alignRight ? 'right-0' : 'left-0'
      } ${
        theme === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'
      }`}>
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

  // Status Badge Component
  const StatusBadge = ({ status }: { status: WarrantyClaim['status'] }) => {
    const config = statusConfig[status];
    const Icon = config.icon;
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold border ${config.bgColor} ${config.color} ${config.borderColor}`}>
        <Icon className="w-3 h-3" />
        {config.label}
      </span>
    );
  };

  // Claim Card Component
  const ClaimCard = ({ claim }: { claim: WarrantyClaim }) => {
    const { date: claimDate } = formatDateTime(claim.claimDate);

    // Get status gradient color
    const getStatusGradient = (status: WarrantyClaim['status']) => {
      switch (status) {
        case 'pending': return 'bg-gradient-to-r from-yellow-500 to-amber-500';
        case 'under-review': return 'bg-gradient-to-r from-blue-500 to-indigo-500';
        case 'approved': return 'bg-gradient-to-r from-emerald-500 to-teal-500';
        case 'rejected': return 'bg-gradient-to-r from-red-500 to-rose-500';
        case 'replaced': return 'bg-gradient-to-r from-purple-500 to-violet-500';
        case 'repaired': return 'bg-gradient-to-r from-cyan-500 to-sky-500';
        default: return 'bg-gradient-to-r from-slate-500 to-gray-500';
      }
    };

    return (
      <div
        className={`group rounded-2xl border overflow-hidden transition-all duration-300 ${
          theme === 'dark' 
            ? 'bg-slate-800/30 border-slate-700/50 hover:border-slate-600' 
            : 'bg-white border-slate-200 hover:border-slate-300 shadow-sm'
        }`}
      >
        {/* Status bar */}
        <div className={`h-1 ${getStatusGradient(claim.status)}`} />
        {/* Card Header */}
        <div className="p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className={`text-xs font-mono ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>{claim.id}</span>
                <StatusBadge status={claim.status} />
              </div>
              <h3 className={`font-semibold truncate ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>{claim.productName}</h3>
              <div className={`flex items-center gap-2 text-sm mt-1 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                <User className="w-3.5 h-3.5" />
                <span className="truncate">{claim.customerName}</span>
              </div>
            </div>
          </div>

          {/* Issue Category & Date */}
          <div className="grid grid-cols-2 gap-2 mt-3">
            <div className={`p-2 rounded-lg ${theme === 'dark' ? 'bg-slate-800/80' : 'bg-slate-50'}`}>
              <p className={`text-xs ${theme === 'dark' ? 'text-slate-500' : 'text-slate-500'}`}>Category</p>
              <p className={`text-sm font-medium ${issueCategoryConfig[claim.issueCategory].color}`}>
                {issueCategoryConfig[claim.issueCategory].label}
              </p>
            </div>
            <div className={`p-2 rounded-lg ${theme === 'dark' ? 'bg-slate-800/80' : 'bg-slate-50'}`}>
              <p className={`text-xs ${theme === 'dark' ? 'text-slate-500' : 'text-slate-500'}`}>Claim Date</p>
              <p className={`text-sm font-medium ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                {claimDate}
              </p>
            </div>
          </div>

          {/* Workflow Stage Badge - Shows current processing stage */}
          {claim.workflow?.stage && (
            <div className={`flex items-center gap-2 mt-3 px-3 py-2 rounded-lg ${
              workflowStageConfig[claim.workflow.stage]?.bgColor || 'bg-slate-500/10'
            }`}>
              <span className="text-sm">{workflowStageConfig[claim.workflow.stage]?.icon || '📋'}</span>
              <span className={`text-sm font-medium ${workflowStageConfig[claim.workflow.stage]?.color || 'text-slate-500'}`}>
                {workflowStageConfig[claim.workflow.stage]?.label || claim.workflow.stage}
              </span>
              {claim.financialImpact?.creditAmount && claim.financialImpact.creditAmount > 0 && (
                <span className={`ml-auto text-xs px-2 py-0.5 rounded-full font-medium ${
                  theme === 'dark' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-emerald-100 text-emerald-600'
                }`}>
                  -Rs.{claim.financialImpact.creditAmount.toLocaleString()}
                </span>
              )}
            </div>
          )}

          {/* Issue Description Preview */}
          <div className={`p-3 mt-3 rounded-xl ${theme === 'dark' ? 'bg-slate-800/50 border border-slate-700/50' : 'bg-slate-50 border border-slate-200'}`}>
            <p className={`text-sm line-clamp-2 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>{claim.issueDescription}</p>
          </div>
          
          {/* Quick Workflow Actions - Advance to next stage */}
          {claim.workflow?.stage && claim.workflow.stage !== 'completed' && (
            <div className={`flex items-center gap-2 mt-3 p-2 rounded-lg ${
              theme === 'dark' ? 'bg-slate-800/30' : 'bg-slate-50'
            }`}>
              <span className={`text-xs ${theme === 'dark' ? 'text-slate-500' : 'text-slate-500'}`}>Quick:</span>
              {(() => {
                const stages = ['received', 'inspecting', 'awaiting_parts', 'repairing', 'testing', 'ready', 'completed'];
                const currentIndex = stages.indexOf(claim.workflow.stage);
                const nextStage = stages[currentIndex + 1];
                if (!nextStage) return null;
                return (
                  <button
                    onClick={() => handleUpdateWorkflowStage(claim.id, nextStage, 'Quick advance from card')}
                    className={`flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                      theme === 'dark' 
                        ? 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/20' 
                        : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100 border border-emerald-200'
                    }`}
                  >
                    <CheckCircle className="w-3 h-3" />
                    Move to {workflowStageConfig[nextStage]?.label || nextStage}
                  </button>
                );
              })()}
              {['approved', 'replaced', 'repaired'].includes(claim.status) && !claim.financialImpact?.creditAmount && (
                <button
                  onClick={() => handleApplyWarrantyCredit(claim.id, 0, 'credit_note')}
                  className={`flex items-center justify-center gap-1 py-1.5 px-2 rounded-lg text-xs font-medium transition-colors ${
                    theme === 'dark' 
                      ? 'bg-purple-500/10 text-purple-400 hover:bg-purple-500/20 border border-purple-500/20' 
                      : 'bg-purple-50 text-purple-600 hover:bg-purple-100 border border-purple-200'
                  }`}
                >
                  <DollarSign className="w-3 h-3" />
                  Credit
                </button>
              )}
            </div>
          )}
          
          {/* Actions */}
          <div className={`flex gap-2 pt-3 mt-3 border-t ${theme === 'dark' ? 'border-slate-700/50' : 'border-slate-200'}`}>
            <button 
              onClick={() => handleViewClaim(claim)}
              className={`flex-1 flex items-center justify-center gap-1 py-2 rounded-lg text-sm font-medium ${
                theme === 'dark' ? 'bg-blue-500/10 text-blue-400 hover:bg-blue-500/20' : 'bg-blue-50 text-blue-600 hover:bg-blue-100'
              }`}
            >
              <Eye className="w-4 h-4" /> View
            </button>
            <button 
              onClick={() => handleEditClaim(claim)}
              className={`flex-1 flex items-center justify-center gap-1 py-2 rounded-lg text-sm font-medium ${
                theme === 'dark' ? 'bg-amber-500/10 text-amber-400 hover:bg-amber-500/20' : 'bg-amber-50 text-amber-600 hover:bg-amber-100'
              }`}
            >
              <Edit className="w-4 h-4" /> Edit
            </button>
            <button 
              onClick={() => handleDeleteClick(claim)}
              className={`flex items-center justify-center gap-1 py-2 px-3 rounded-lg text-sm font-medium ${
                theme === 'dark' ? 'bg-red-500/10 text-red-400 hover:bg-red-500/20' : 'bg-red-50 text-red-600 hover:bg-red-100'
              }`}
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    );
  };

  // Table Row Component
  const ClaimTableRow = ({ claim }: { claim: WarrantyClaim }) => {
    const { date: claimDate } = formatDateTime(claim.claimDate);

    return (
      <tr 
        className={`border-b transition-colors ${
          theme === 'dark' 
            ? 'border-slate-700/30 hover:bg-slate-800/30' 
            : 'border-slate-100 hover:bg-slate-50'
        }`}
      >
        <td className="px-6 py-4">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${theme === 'dark' ? 'bg-slate-800' : 'bg-slate-100'}`}>
              <Shield className="w-4 h-4 text-emerald-500" />
            </div>
            <span className={`font-medium ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
              {claim.id}
            </span>
          </div>
        </td>
        <td className="px-6 py-4">
          <div>
            <p className={`font-medium text-sm truncate max-w-[200px] ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>{claim.productName}</p>
            {claim.productSerialNumber && (
              <p className={`text-xs ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>S/N: {claim.productSerialNumber}</p>
            )}
          </div>
        </td>
        <td className={`px-6 py-4 ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
          {claim.customerName}
        </td>
        <td className="px-6 py-4">
          <StatusBadge status={claim.status} />
        </td>
        <td className="px-6 py-4">
          <span className={`text-xs px-2 py-1 rounded-full font-medium ${theme === 'dark' ? 'bg-slate-700' : 'bg-slate-100'} ${issueCategoryConfig[claim.issueCategory].color}`}>
            {issueCategoryConfig[claim.issueCategory].label}
          </span>
        </td>
        <td className={`px-6 py-4 text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
          {claimDate}
        </td>
        <td className="px-6 py-4 text-center">
          {claim.isReplacement ? (
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
              theme === 'dark' ? 'bg-purple-500/20 text-purple-400' : 'bg-purple-100 text-purple-600'
            }`}>
              <RefreshCw className="w-3 h-3" />
              Yes
            </span>
          ) : (
            <span className={`text-xs ${theme === 'dark' ? 'text-slate-600' : 'text-slate-400'}`}>—</span>
          )}
        </td>
        <td className="px-6 py-4">
          <div className="flex items-center justify-end gap-2">
            <button
              onClick={() => handleViewClaim(claim)}
              className={`p-2 rounded-xl transition-colors ${
                theme === 'dark' ? 'hover:bg-slate-700 text-slate-400' : 'hover:bg-slate-100 text-slate-600'
              }`}
              title="View Details"
            >
              <Eye className="w-4 h-4" />
            </button>
            <button
              onClick={() => handleEditClaim(claim)}
              className={`p-2 rounded-xl transition-colors ${
                theme === 'dark' ? 'hover:bg-slate-700 text-slate-400' : 'hover:bg-slate-100 text-slate-600'
              }`}
              title="Edit"
            >
              <Edit className="w-4 h-4" />
            </button>
            <button
              onClick={() => handleDeleteClick(claim)}
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
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className={`text-2xl lg:text-3xl font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
            Warranty Claims
          </h1>
          <p className={`mt-1 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
            Manage warranty claims and track product replacements
          </p>
        </div>
        <button 
          onClick={handleAddClaim}
          className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-xl font-medium hover:opacity-90 transition-opacity"
        >
          <Plus className="w-5 h-5" />
          New Claim
        </button>
      </div>

      {/* Stats Cards - Enhanced with Credit & Workflow tracking */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
        <div className={`p-4 rounded-xl border ${theme === 'dark' ? 'bg-slate-800/30 border-slate-700/50' : 'bg-white border-slate-200 shadow-sm'}`}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-500/10 rounded-lg flex items-center justify-center">
              <FileText className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <p className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>{analytics.total}</p>
              <p className={`text-xs ${theme === 'dark' ? 'text-slate-500' : 'text-slate-500'}`}>Total Claims</p>
            </div>
          </div>
        </div>
        <div className={`p-4 rounded-xl border ${theme === 'dark' ? 'bg-slate-800/30 border-slate-700/50' : 'bg-white border-slate-200 shadow-sm'}`}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-yellow-500/10 rounded-lg flex items-center justify-center">
              <Clock className="w-5 h-5 text-yellow-400" />
            </div>
            <div>
              <p className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>{analytics.pending}</p>
              <p className={`text-xs ${theme === 'dark' ? 'text-slate-500' : 'text-slate-500'}`}>Pending</p>
            </div>
          </div>
        </div>
        <div className={`p-4 rounded-xl border ${theme === 'dark' ? 'bg-slate-800/30 border-slate-700/50' : 'bg-white border-slate-200 shadow-sm'}`}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-500/10 rounded-lg flex items-center justify-center">
              <Wrench className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <p className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>{analytics.inProgress}</p>
              <p className={`text-xs ${theme === 'dark' ? 'text-slate-500' : 'text-slate-500'}`}>In Progress</p>
            </div>
          </div>
        </div>
        <div className={`p-4 rounded-xl border ${theme === 'dark' ? 'bg-slate-800/30 border-slate-700/50' : 'bg-white border-slate-200 shadow-sm'}`}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-500/10 rounded-lg flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <p className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>{analytics.resolved}</p>
              <p className={`text-xs ${theme === 'dark' ? 'text-slate-500' : 'text-slate-500'}`}>Resolved</p>
            </div>
          </div>
        </div>
        <div className={`p-4 rounded-xl border ${theme === 'dark' ? 'bg-slate-800/30 border-slate-700/50' : 'bg-white border-slate-200 shadow-sm'}`}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-red-500/10 rounded-lg flex items-center justify-center">
              <Zap className="w-5 h-5 text-red-400" />
            </div>
            <div>
              <p className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>{analytics.urgentClaims}</p>
              <p className={`text-xs ${theme === 'dark' ? 'text-slate-500' : 'text-slate-500'}`}>Urgent</p>
            </div>
          </div>
        </div>
        <div className={`p-4 rounded-xl border ${theme === 'dark' ? 'bg-slate-800/30 border-slate-700/50' : 'bg-white border-slate-200 shadow-sm'}`}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-500/10 rounded-lg flex items-center justify-center">
              <RefreshCw className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <p className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>{analytics.replacements}</p>
              <p className={`text-xs ${theme === 'dark' ? 'text-slate-500' : 'text-slate-500'}`}>Replacements</p>
            </div>
          </div>
        </div>
        {/* Credit Impact Card */}
        <div className={`p-4 rounded-xl border ${theme === 'dark' ? 'bg-gradient-to-r from-emerald-900/30 to-teal-900/30 border-emerald-500/30' : 'bg-gradient-to-r from-emerald-50 to-teal-50 border-emerald-200 shadow-sm'}`}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-500/20 rounded-lg flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <p className={`text-lg font-bold ${theme === 'dark' ? 'text-emerald-400' : 'text-emerald-600'}`}>
                Rs.{analytics.totalCreditsIssued.toLocaleString()}
              </p>
              <p className={`text-xs ${theme === 'dark' ? 'text-emerald-500/70' : 'text-emerald-600/70'}`}>
                Credits Issued ({analytics.claimsWithCredits})
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Search and Filters - Single Line */}
      <div className={`p-3 sm:p-4 rounded-2xl border ${theme === 'dark' ? 'bg-slate-800/30 border-slate-700/50' : 'bg-white border-slate-200'}`}>
        <div className="flex flex-col lg:flex-row gap-3">
          {/* Search */}
          <div className={`flex items-center gap-2 px-3 sm:px-4 py-2 rounded-xl border flex-1 ${theme === 'dark' ? 'bg-slate-800/50 border-slate-700/50' : 'bg-slate-50 border-slate-200'}`}>
            <Search className={`w-5 h-5 flex-shrink-0 ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`} />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Search claims..."
              className={`bg-transparent border-none outline-none flex-1 min-w-0 text-sm ${theme === 'dark' ? 'text-white placeholder-slate-500' : 'text-slate-900 placeholder-slate-400'}`}
            />
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
                  {[statusFilter, categoryFilter, productFilter, customerFilter, startDate, endDate].filter(Boolean).length}
                </span>
              )}
            </button>

            {/* Sort Button */}
            <button
              onClick={() => setSortBy(sortBy === 'date-desc' ? 'date-asc' : 'date-desc')}
              className={`p-2 rounded-xl border transition-colors ${theme === 'dark' ? 'border-slate-700 hover:bg-slate-800 text-slate-400' : 'border-slate-200 hover:bg-slate-50 text-slate-600'}`}
              title={sortBy === 'date-desc' ? 'Sort Ascending' : 'Sort Descending'}
            >
              {sortBy === 'date-desc' ? <SortDesc className="w-4 h-4" /> : <SortAsc className="w-4 h-4" />}
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

            {/* Clear Filters */}
            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-xl transition-colors ${theme === 'dark' ? 'text-slate-400 hover:text-white hover:bg-slate-700' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100'}`}
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Clear
              </button>
            )}
          </div>
        </div>

        {/* Expanded Filters */}
        {showFilters && (
          <div className={`pt-3 sm:pt-4 border-t ${theme === 'dark' ? 'border-slate-700/50' : 'border-slate-200'}`}>
            <div className="flex flex-wrap items-center gap-3">
              {/* Status Filter */}
              <div className="w-full sm:w-44">
                <SearchableSelect
                  options={statusOptions}
                  value={statusFilter}
                  onValueChange={(value) => {
                    setStatusFilter(value);
                    setCurrentPage(1);
                  }}
                  placeholder="All Status"
                  searchPlaceholder="Search..."
                  emptyMessage="No status"
                  theme={theme}
                />
              </div>
              
              {/* Category Filter */}
              <div className="w-full sm:w-44">
                <SearchableSelect
                  options={categoryOptions}
                  value={categoryFilter}
                  onValueChange={(value) => {
                    setCategoryFilter(value);
                    setCurrentPage(1);
                  }}
                  placeholder="All Categories"
                  searchPlaceholder="Search..."
                  emptyMessage="No category"
                  theme={theme}
                />
              </div>
              
              {/* Product Filter */}
              <div className="w-full sm:w-52">
                <SearchableSelect
                  options={productOptions}
                  value={productFilter}
                  onValueChange={(value) => {
                    setProductFilter(value);
                    setCurrentPage(1);
                  }}
                  placeholder="All Products"
                  searchPlaceholder="Search..."
                  emptyMessage="No products"
                  theme={theme}
                />
              </div>
              
              {/* Customer Filter */}
              <div className="w-full sm:w-52">
                <SearchableSelect
                  options={customerOptions}
                  value={customerFilter}
                  onValueChange={(value) => {
                    setCustomerFilter(value);
                    setCurrentPage(1);
                  }}
                  placeholder="All Customers"
                  searchPlaceholder="Search..."
                  emptyMessage="No customers"
                  theme={theme}
                />
              </div>

              {/* Date Range Filter */}
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
                  {showStartCalendar && renderCalendar(startDate, setStartDate, setShowStartCalendar, false)}
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
                  {showEndCalendar && renderCalendar(endDate, setEndDate, setShowEndCalendar, true)}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Claims List */}
      {filteredClaims.length === 0 ? (
        <div className={`text-center py-16 rounded-2xl border ${
          theme === 'dark' ? 'bg-slate-800/30 border-slate-700/50' : 'bg-white border-slate-200'
        }`}>
          <Shield className={`w-16 h-16 mx-auto mb-4 ${theme === 'dark' ? 'text-slate-600' : 'text-slate-300'}`} />
          <h3 className={`text-lg font-semibold mb-2 ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
            No warranty claims found
          </h3>
          <p className={`mb-4 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
            {hasActiveFilters ? 'Try adjusting your filters' : 'Create your first warranty claim to get started'}
          </p>
          {hasActiveFilters ? (
            <button 
              onClick={clearFilters}
              className="px-4 py-2 bg-emerald-500 text-white rounded-xl hover:bg-emerald-600 transition-colors"
            >
              Clear Filters
            </button>
          ) : (
            <button 
              onClick={handleAddClaim}
              className="px-4 py-2 bg-emerald-500 text-white rounded-xl hover:bg-emerald-600 transition-colors"
            >
              New Claim
            </button>
          )}
        </div>
      ) : viewMode === 'card' ? (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {paginatedClaims.map((claim) => (
              <ClaimCard key={claim.id} claim={claim} />
            ))}
          </div>

          {/* Pagination */}
          <div className={`mt-4 p-4 rounded-2xl border ${
            theme === 'dark' ? 'bg-slate-800/30 border-slate-700/50' : 'bg-white border-slate-200'
          }`}>
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
              {/* Left side - Info and Items Per Page */}
              <div className="flex flex-wrap items-center gap-4">
                {/* Result Info */}
                <p className={`text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                  Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, filteredClaims.length)} of {filteredClaims.length} claims
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
        </>
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
                <tr className={`border-b ${theme === 'dark' ? 'border-slate-700/50' : 'border-slate-200'}`}>
                  <th className={`text-left px-6 py-4 text-sm font-semibold ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                    Claim ID
                  </th>
                  <th className={`text-left px-6 py-4 text-sm font-semibold ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                    Product
                  </th>
                  <th className={`text-left px-6 py-4 text-sm font-semibold ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                    Customer
                  </th>
                  <th className={`text-left px-6 py-4 text-sm font-semibold ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                    Status
                  </th>
                  <th className={`text-left px-6 py-4 text-sm font-semibold ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                    Category
                  </th>
                  <th className={`text-left px-6 py-4 text-sm font-semibold ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                    Claim Date
                  </th>
                  <th className={`text-center px-6 py-4 text-sm font-semibold ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                    Replaced
                  </th>
                  <th className={`text-right px-6 py-4 text-sm font-semibold ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {paginatedClaims.map((claim) => (
                  <ClaimTableRow key={claim.id} claim={claim} />
                ))}
              </tbody>
            </table>
          </div>

          {/* Table Pagination */}
          <div className={`px-6 py-4 border-t ${
            theme === 'dark' ? 'border-slate-700/50' : 'border-slate-200'
          }`}>
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
              {/* Left side - Info and Items Per Page */}
              <div className="flex flex-wrap items-center gap-4">
                {/* Result Info */}
                <p className={`text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                  Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, filteredClaims.length)} of {filteredClaims.length} claims
                </p>
                
                {/* Items Per Page Selector */}
                <div className="flex items-center gap-2">
                  <span className={`text-sm ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>Show:</span>
                  <div className={`flex items-center rounded-full p-0.5 ${
                    theme === 'dark' ? 'bg-slate-800' : 'bg-slate-100'
                  }`}>
                    {[5, 10, 20, 50].map((num) => (
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
        </div>
      )}

      {/* Modals */}
      <WarrantyClaimFormModal
        isOpen={isFormModalOpen}
        claim={selectedClaim}
        onClose={() => setIsFormModalOpen(false)}
        onSave={handleSaveClaim}
      />

      <WarrantyClaimViewModal
        isOpen={isViewModalOpen}
        claim={claimToView}
        onClose={() => {
          setIsViewModalOpen(false);
          setClaimToView(null);
        }}
      />

      <DeleteConfirmationModal
        isOpen={isDeleteModalOpen}
        title="Delete Warranty Claim"
        message="Are you sure you want to delete this warranty claim? This action cannot be undone and all associated data will be permanently removed."
        itemName={claimToDelete ? `${claimToDelete.id} - ${claimToDelete.productName}` : undefined}
        onConfirm={handleConfirmDelete}
        onCancel={() => setIsDeleteModalOpen(false)}
      />
    </div>
  );
}

export default Warranties;
