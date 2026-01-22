import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { mockSuppliers, mockWhatsAppSettings, mockSupplierPurchases } from '../data/mockData';
import type { Supplier, SupplierPurchase } from '../data/mockData';
import { SupplierFormModal } from '../components/modals/SupplierFormModal';
import { CreditPaymentModal } from '../components/modals/CreditPaymentModal';
import { DeleteConfirmationModal } from '../components/modals/DeleteConfirmationModal';
import { SupplierDetailModal } from '../components/modals/SupplierDetailModal';
import { PurchasePaymentModal } from '../components/modals/PurchasePaymentModal';
import { SupplierPaymentHistoryModal } from '../components/modals/SupplierPaymentHistoryModal';
import { SearchableSelect } from '../components/ui/searchable-select';
import { 
  Search, Plus, Edit, Mail, Phone, Trash2,
  AlertTriangle, CheckCircle, Clock, CreditCard,
  Calendar, MessageCircle, Package, DollarSign, Zap, Eye,
  ShoppingCart, History,
  X, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, SlidersHorizontal,
  List, LayoutGrid, ArrowDownUp, SortAsc, SortDesc
} from 'lucide-react';

export const Suppliers: React.FC = () => {
  const { theme } = useTheme();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  
  // Advanced filter states
  const [showFilters, setShowFilters] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [minCreditBalance, setMinCreditBalance] = useState('');
  const [maxCreditBalance, setMaxCreditBalance] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [viewMode, setViewMode] = useState<'card' | 'list'>('card');
  const [sortBy, setSortBy] = useState<'name' | 'credit' | 'lastOrder'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  
  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(6);
  
  // Calendar states
  const [showStartCalendar, setShowStartCalendar] = useState(false);
  const [showEndCalendar, setShowEndCalendar] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState(new Date());
  const startCalendarRef = useRef<HTMLDivElement>(null);
  const endCalendarRef = useRef<HTMLDivElement>(null);
  
  // Local suppliers state
  const [suppliers, setSuppliers] = useState<Supplier[]>(mockSuppliers);
  const [purchases, setPurchases] = useState<SupplierPurchase[]>(mockSupplierPurchases);

  // Modal states
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isPurchasePaymentModalOpen, setIsPurchasePaymentModalOpen] = useState(false);
  const [isOrderModalOpen, setIsOrderModalOpen] = useState(false);
  const [isPaymentHistoryModalOpen, setIsPaymentHistoryModalOpen] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | undefined>(undefined);
  const [supplierToDelete, setSupplierToDelete] = useState<Supplier | null>(null);
  const [supplierForPayment, setSupplierForPayment] = useState<Supplier | null>(null);
  const [supplierForDetail, setSupplierForDetail] = useState<Supplier | null>(null);
  const [purchaseForPayment, setPurchaseForPayment] = useState<SupplierPurchase | null>(null);
  const [supplierForOrder, setSupplierForOrder] = useState<Supplier | null>(null);
  const [supplierForPaymentHistory, setSupplierForPaymentHistory] = useState<Supplier | null>(null);

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

  // Get all unique categories from suppliers
  const allCategories = useMemo(() => {
    const categories = new Set<string>();
    suppliers.forEach(s => s.categories.forEach(c => categories.add(c)));
    return Array.from(categories).sort();
  }, [suppliers]);

  // Filter suppliers
  const filteredSuppliers = useMemo(() => {
    let result = suppliers.filter(supplier => {
      const matchesSearch = 
        supplier.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        supplier.company.toLowerCase().includes(searchQuery.toLowerCase()) ||
        supplier.email.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesStatus = statusFilter === 'all' || supplier.creditStatus === statusFilter;
      
      const matchesCategory = categoryFilter === 'all' || supplier.categories.includes(categoryFilter);
      
      const matchesMinCredit = !minCreditBalance || supplier.creditBalance >= parseFloat(minCreditBalance);
      const matchesMaxCredit = !maxCreditBalance || supplier.creditBalance <= parseFloat(maxCreditBalance);
      
      const lastOrderDate = supplier.lastOrder ? new Date(supplier.lastOrder) : null;
      const matchesStartDate = !startDate || (lastOrderDate && lastOrderDate >= new Date(startDate));
      const matchesEndDate = !endDate || (lastOrderDate && lastOrderDate <= new Date(endDate));
      
      return matchesSearch && matchesStatus && matchesCategory && 
             matchesMinCredit && matchesMaxCredit && matchesStartDate && matchesEndDate;
    });

    // Sort results
    result.sort((a, b) => {
      let comparison = 0;
      switch (sortBy) {
        case 'name':
          comparison = a.company.localeCompare(b.company);
          break;
        case 'credit':
          comparison = a.creditBalance - b.creditBalance;
          break;
        case 'lastOrder':
          comparison = new Date(a.lastOrder || 0).getTime() - new Date(b.lastOrder || 0).getTime();
          break;
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });

    return result;
  }, [suppliers, searchQuery, statusFilter, categoryFilter, minCreditBalance, maxCreditBalance, startDate, endDate, sortBy, sortOrder]);

  // Pagination calculations
  const totalPages = Math.ceil(filteredSuppliers.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedSuppliers = filteredSuppliers.slice(startIndex, endIndex);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter, categoryFilter, minCreditBalance, maxCreditBalance, startDate, endDate, itemsPerPage]);

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

  // Advanced filters count
  const advancedFiltersCount = useMemo(() => {
    let count = 0;
    if (categoryFilter !== 'all') count++;
    if (minCreditBalance) count++;
    if (maxCreditBalance) count++;
    if (startDate) count++;
    if (endDate) count++;
    return count;
  }, [categoryFilter, minCreditBalance, maxCreditBalance, startDate, endDate]);

  // Clear advanced filters
  const clearAdvancedFilters = () => {
    setCategoryFilter('all');
    setMinCreditBalance('');
    setMaxCreditBalance('');
    setStartDate('');
    setEndDate('');
  };

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

  const renderCalendar = (selectedDate: string, setDate: (date: string) => void, setShow: (show: boolean) => void) => {
    const { daysInMonth, startingDay } = getDaysInMonth(calendarMonth);
    const days = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Empty cells before first day
    for (let i = 0; i < startingDay; i++) {
      days.push(<div key={`empty-${i}`} className="w-8 h-8" />);
    }
    
    // Days of month
    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${calendarMonth.getFullYear()}-${String(calendarMonth.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const isSelected = selectedDate === dateStr;
      const currentDate = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth(), day);
      const isToday = currentDate.getTime() === today.getTime();
      
      days.push(
        <button
          key={day}
          onClick={() => {
            setDate(dateStr);
            setShow(false);
          }}
          className={`w-8 h-8 rounded-lg text-sm font-medium transition-all ${
            isSelected
              ? 'bg-emerald-500 text-white'
              : isToday
                ? theme === 'dark' 
                  ? 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30' 
                  : 'bg-emerald-100 text-emerald-600 hover:bg-emerald-200'
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
      <div className={`absolute top-full left-0 mt-2 p-3 rounded-xl shadow-xl border z-50 w-max ${
        theme === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'
      }`}>
        <div className="flex items-center justify-between mb-3">
          <button
            onClick={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() - 1))}
            className={`p-1 rounded-lg ${theme === 'dark' ? 'hover:bg-slate-700' : 'hover:bg-slate-100'}`}
          >
            <ChevronLeft className="w-4 h-4 text-white" />
          </button>
          <span className={`text-sm font-semibold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
            {calendarMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
          </span>
          <button
            onClick={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1))}
            className={`p-1 rounded-lg ${theme === 'dark' ? 'hover:bg-slate-700' : 'hover:bg-slate-100'}`}
          >
            <ChevronRight className="w-4 h-4 text-white" />
          </button>
        </div>
        <div className="grid grid-cols-7 gap-1 mb-2">
          {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(d => (
            <div key={d} className={`w-8 h-6 flex items-center justify-center text-xs font-medium ${
              theme === 'dark' ? 'text-slate-500' : 'text-slate-400'
            }`}>
              {d}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">{days}</div>
      </div>
    );
  };

  // Statistics
  const stats = useMemo(() => {
    const totalCredit = suppliers.reduce((sum, s) => sum + s.creditBalance, 0);
    const overdueCount = suppliers.filter(s => s.creditStatus === 'overdue').length;
    const activeCount = suppliers.filter(s => s.creditStatus === 'active').length;
    const clearCount = suppliers.filter(s => s.creditStatus === 'clear').length;
    const totalLimit = suppliers.reduce((sum, s) => sum + s.creditLimit, 0);
    return { totalCredit, overdueCount, activeCount, clearCount, totalLimit };
  }, [suppliers]);

  const formatCurrency = (amount: number) => `Rs. ${amount.toLocaleString('en-LK')}`;

  const getDaysUntilDue = (dueDate?: string) => {
    if (!dueDate) return null;
    const today = new Date();
    const due = new Date(dueDate);
    const diff = Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return diff;
  };

  const getCreditStatusStyle = (status: string) => {
    switch (status) {
      case 'clear':
        return theme === 'dark' 
          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
          : 'bg-emerald-50 text-emerald-600 border-emerald-200';
      case 'active':
        return theme === 'dark' 
          ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' 
          : 'bg-blue-50 text-blue-600 border-blue-200';
      case 'overdue':
        return theme === 'dark' 
          ? 'bg-red-500/10 text-red-400 border-red-500/20' 
          : 'bg-red-50 text-red-600 border-red-200';
      default:
        return '';
    }
  };

  const getCreditStatusIcon = (status: string) => {
    switch (status) {
      case 'clear': return <CheckCircle className="w-4 h-4" />;
      case 'active': return <Clock className="w-4 h-4" />;
      case 'overdue': return <AlertTriangle className="w-4 h-4" />;
      default: return null;
    }
  };

  const getProgressColor = (percentage: number) => {
    if (percentage >= 90) return 'from-red-500 to-red-600';
    if (percentage >= 70) return 'from-amber-500 to-orange-500';
    return 'from-emerald-500 to-teal-500';
  };

  // Handlers
  const handleAddSupplier = () => {
    setSelectedSupplier(undefined);
    setIsFormModalOpen(true);
  };

  const handleEditSupplier = (supplier: Supplier) => {
    setSelectedSupplier(supplier);
    setIsFormModalOpen(true);
  };

  const handleDeleteClick = (supplier: Supplier) => {
    setSupplierToDelete(supplier);
    setIsDeleteModalOpen(true);
  };

  const handlePayCreditClick = (supplier: Supplier) => {
    setSupplierForPayment(supplier);
    setIsPaymentModalOpen(true);
  };

  const handleSaveSupplier = (supplier: Supplier) => {
    if (selectedSupplier) {
      setSuppliers(prev => prev.map(s => s.id === supplier.id ? supplier : s));
    } else {
      setSuppliers(prev => [...prev, supplier]);
    }
  };

  const handleConfirmDelete = () => {
    if (supplierToDelete) {
      setSuppliers(prev => prev.filter(s => s.id !== supplierToDelete.id));
      setIsDeleteModalOpen(false);
      setSupplierToDelete(null);
    }
  };

  const handlePayment = (supplierId: string, amount: number, _paymentMethod: string) => {
    setSuppliers(prev => prev.map(s => {
      if (s.id === supplierId) {
        const newBalance = Math.max(0, s.creditBalance - amount);
        return {
          ...s,
          creditBalance: newBalance,
          creditStatus: newBalance === 0 ? 'clear' as const : s.creditStatus,
        };
      }
      return s;
    }));
  };

  // View supplier details
  const handleViewSupplier = (supplier: Supplier) => {
    setSupplierForDetail(supplier);
    setIsDetailModalOpen(true);
  };

  // Handle order from supplier
  const handleOrderFromSupplier = (supplier: Supplier) => {
    setSupplierForOrder(supplier);
    setIsOrderModalOpen(true);
  };

  // View payment history for a supplier
  const handlePaymentHistory = (supplier: Supplier) => {
    setSupplierForPaymentHistory(supplier);
    setIsPaymentHistoryModalOpen(true);
  };

  // Make payment for a specific purchase
  const handleMakePurchasePayment = (purchase: SupplierPurchase) => {
    setPurchaseForPayment(purchase);
    setIsPurchasePaymentModalOpen(true);
  };

  // Handle purchase payment
  const handlePurchasePayment = (purchaseId: string, amount: number, paymentMethod: string) => {
    setPurchases(prev => prev.map(p => {
      if (p.id === purchaseId) {
        const newPaidAmount = p.paidAmount + amount;
        const newPercentage = (newPaidAmount / p.totalAmount) * 100;
        const newStatus = newPercentage >= 100 ? 'fullpaid' : newPaidAmount > 0 ? 'partial' : 'unpaid';
        
        return {
          ...p,
          paidAmount: newPaidAmount,
          paymentPercentage: Math.min(newPercentage, 100),
          paymentStatus: newStatus as 'unpaid' | 'partial' | 'fullpaid',
          lastPaymentDate: new Date().toISOString().split('T')[0],
          payments: [
            ...p.payments,
            {
              id: `pay-${Date.now()}`,
              purchaseId: purchaseId,
              amount: amount,
              paymentDate: new Date().toISOString().split('T')[0],
              paymentMethod: paymentMethod as 'cash' | 'bank' | 'card' | 'cheque',
            }
          ]
        };
      }
      return p;
    }));

    // Also update supplier credit balance
    const purchase = purchases.find(p => p.id === purchaseId);
    if (purchase) {
      setSuppliers(prev => prev.map(s => {
        if (s.id === purchase.supplierId) {
          const newBalance = Math.max(0, s.creditBalance - amount);
          return {
            ...s,
            creditBalance: newBalance,
            creditStatus: newBalance === 0 ? 'clear' as const : s.creditStatus,
          };
        }
        return s;
      }));
    }
  };

  // Update itemsPerPage when viewMode changes
  useEffect(() => {
    if (viewMode === 'card') {
      setItemsPerPage(6);
    } else {
      setItemsPerPage(10);
    }
    setCurrentPage(1);
  }, [viewMode]);

  // Send urgent WhatsApp message
  const sendUrgentReminder = (supplier: Supplier) => {
    if (!mockWhatsAppSettings.enabled) {
      alert('WhatsApp integration is disabled. Enable it in Settings.');
      return;
    }

    // Format phone: remove non-digits, handle Sri Lankan numbers
    let phone = supplier.phone.replace(/\D/g, '');
    if (phone.startsWith('0')) {
      phone = '94' + phone.substring(1);
    }
    if (!phone.startsWith('94')) {
      phone = '94' + phone;
    }

    const daysOverdue = supplier.creditDueDate 
      ? Math.abs(getDaysUntilDue(supplier.creditDueDate) || 0)
      : 0;

    const message = `🚨 URGENT PAYMENT REMINDER 🚨

Dear ${supplier.name},

This is an urgent reminder regarding your OVERDUE payment.

📋 Company: ${supplier.company}
💰 Outstanding Amount: ${formatCurrency(supplier.creditBalance)}
📅 Due Date: ${supplier.creditDueDate ? new Date(supplier.creditDueDate).toLocaleDateString('en-GB') : 'N/A'}
⚠️ Days Overdue: ${daysOverdue} days

Please arrange immediate payment to avoid any service interruptions.

Thank you for your prompt attention to this matter.

Best regards,
ECOTEC Computer Solutions`;

    const encodedMessage = encodeURIComponent(message);
    const whatsappUrl = `whatsapp://send?phone=${phone}&text=${encodedMessage}`;
    window.location.href = whatsappUrl;
  };

  // Send friendly reminder
  const sendFriendlyReminder = (supplier: Supplier) => {
    if (!mockWhatsAppSettings.enabled) {
      alert('WhatsApp integration is disabled. Enable it in Settings.');
      return;
    }

    let phone = supplier.phone.replace(/\D/g, '');
    if (phone.startsWith('0')) {
      phone = '94' + phone.substring(1);
    }
    if (!phone.startsWith('94')) {
      phone = '94' + phone;
    }

    const daysUntilDue = getDaysUntilDue(supplier.creditDueDate);

    const message = `Hello ${supplier.name}! 👋

This is a friendly reminder about your upcoming payment.

📋 Company: ${supplier.company}
💰 Amount: ${formatCurrency(supplier.creditBalance)}
📅 Due Date: ${supplier.creditDueDate ? new Date(supplier.creditDueDate).toLocaleDateString('en-GB') : 'N/A'}
${daysUntilDue ? `⏰ Days Remaining: ${daysUntilDue} days` : ''}

Please let us know if you have any questions.

Thank you!
ECOTEC Computer Solutions`;

    const encodedMessage = encodeURIComponent(message);
    const whatsappUrl = `whatsapp://send?phone=${phone}&text=${encodedMessage}`;
    window.location.href = whatsappUrl;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className={`text-2xl lg:text-3xl font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
            Suppliers
          </h1>
          <p className={`mt-1 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
            Manage supplier relationships and credit accounts
          </p>
        </div>
        <button 
          onClick={handleAddSupplier}
          className="flex items-center gap-2 px-4 py-2.5 text-white rounded-xl font-medium hover:opacity-90 transition-opacity shadow-lg bg-gradient-to-r from-violet-500 to-purple-500 shadow-violet-500/20"
        >
          <Plus className="w-5 h-5" />
          Add Supplier
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className={`rounded-2xl border p-4 ${
          theme === 'dark' ? 'bg-slate-800/30 border-slate-700/50' : 'bg-white border-slate-200'
        }`}>
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-xl ${theme === 'dark' ? 'bg-red-500/10' : 'bg-red-50'}`}>
              <CreditCard className="w-5 h-5 text-red-500" />
            </div>
            <div>
              <p className={`text-xs font-medium ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>Total Credit Owed</p>
              <p className="text-lg font-bold text-red-500">{formatCurrency(stats.totalCredit)}</p>
            </div>
          </div>
        </div>

        <div className={`rounded-2xl border p-4 ${
          theme === 'dark' ? 'bg-slate-800/30 border-slate-700/50' : 'bg-white border-slate-200'
        }`}>
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-xl ${theme === 'dark' ? 'bg-amber-500/10' : 'bg-amber-50'}`}>
              <AlertTriangle className="w-5 h-5 text-amber-500" />
            </div>
            <div>
              <p className={`text-xs font-medium ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>Overdue Payments</p>
              <p className="text-lg font-bold text-amber-500">{stats.overdueCount} Suppliers</p>
            </div>
          </div>
        </div>

        <div className={`rounded-2xl border p-4 ${
          theme === 'dark' ? 'bg-slate-800/30 border-slate-700/50' : 'bg-white border-slate-200'
        }`}>
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-xl ${theme === 'dark' ? 'bg-blue-500/10' : 'bg-blue-50'}`}>
              <Clock className="w-5 h-5 text-blue-500" />
            </div>
            <div>
              <p className={`text-xs font-medium ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>Active Credit</p>
              <p className="text-lg font-bold text-blue-500">{stats.activeCount} Suppliers</p>
            </div>
          </div>
        </div>

        <div className={`rounded-2xl border p-4 ${
          theme === 'dark' ? 'bg-slate-800/30 border-slate-700/50' : 'bg-white border-slate-200'
        }`}>
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-xl ${theme === 'dark' ? 'bg-emerald-500/10' : 'bg-emerald-50'}`}>
              <CheckCircle className="w-5 h-5 text-emerald-500" />
            </div>
            <div>
              <p className={`text-xs font-medium ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>Clear Accounts</p>
              <p className="text-lg font-bold text-emerald-500">{stats.clearCount} Suppliers</p>
            </div>
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className={`p-3 sm:p-4 rounded-2xl border ${
        theme === 'dark' 
          ? 'bg-slate-800/30 border-slate-700/50' 
          : 'bg-white border-slate-200'
      }`}>
        <div className="flex flex-col lg:flex-row gap-3">
          {/* Search Input */}
          <div className={`flex items-center gap-2 px-3 sm:px-4 py-2 rounded-xl border flex-1 ${
            theme === 'dark' 
              ? 'bg-slate-800/50 border-slate-700/50' 
              : 'bg-slate-50 border-slate-200'
          }`}>
            <Search className={`w-5 h-5 flex-shrink-0 ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`} />
            <input
              type="text"
              placeholder="Search suppliers by name, company or email..."
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
            {/* Category Filter */}
            <div className="w-full sm:w-44">
              <SearchableSelect
                options={[
                  { value: 'all', label: 'All Categories' },
                  ...allCategories.map(cat => ({ value: cat, label: cat }))
                ]}
                value={categoryFilter}
                onValueChange={setCategoryFilter}
                placeholder="All Categories"
                searchPlaceholder="Search categories..."
                emptyMessage="No categories found"
                theme={theme}
              />
            </div>

            {/* Filter Toggle Button */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-2 px-3 py-2 rounded-xl transition-colors ${
                showFilters || advancedFiltersCount > 0
                  ? 'bg-emerald-500 text-white'
                  : theme === 'dark'
                    ? 'bg-slate-700 hover:bg-slate-600 text-slate-300'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
              }`}
            >
              <SlidersHorizontal className="w-4 h-4" />
              <span className="text-sm hidden sm:inline">Filters</span>
              {advancedFiltersCount > 0 && (
                <span className="px-1.5 py-0.5 text-xs bg-white/20 rounded-full">
                  {advancedFiltersCount}
                </span>
              )}
            </button>

            {/* Sort Button */}
            <button
              onClick={() => {
                const nextSort = sortBy === 'name' ? 'credit' : sortBy === 'credit' ? 'lastOrder' : 'name';
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
              <span className="text-sm hidden sm:inline capitalize">{sortBy}</span>
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
          </div>
        </div>

        {/* Status Filter Buttons */}
        <div className="flex flex-wrap gap-2 mt-4">
          {[
            { value: 'all', label: 'All', icon: Package, count: suppliers.length },
            { value: 'overdue', label: 'Overdue', icon: AlertTriangle, count: suppliers.filter(s => s.creditStatus === 'overdue').length },
            { value: 'active', label: 'Active', icon: Clock, count: suppliers.filter(s => s.creditStatus === 'active').length },
            { value: 'clear', label: 'Clear', icon: CheckCircle, count: suppliers.filter(s => s.creditStatus === 'clear').length },
          ].map(({ value, label, icon: Icon, count }) => (
            <button
              key={value}
              onClick={() => setStatusFilter(value)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                statusFilter === value
                  ? value === 'overdue' 
                    ? 'bg-gradient-to-r from-red-500 to-rose-500 text-white shadow-lg'
                    : value === 'active'
                      ? 'bg-gradient-to-r from-blue-500 to-indigo-500 text-white shadow-lg'
                      : value === 'clear'
                        ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-lg'
                        : 'bg-gradient-to-r from-violet-500 to-purple-500 text-white shadow-lg'
                  : theme === 'dark' 
                    ? 'bg-slate-800/50 text-slate-400 hover:text-white hover:bg-slate-700/50' 
                    : 'bg-slate-100 text-slate-600 hover:text-slate-900 hover:bg-slate-200'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{label}</span>
              <span className={`px-1.5 py-0.5 text-xs rounded-full ${
                statusFilter === value ? 'bg-white/20' : theme === 'dark' ? 'bg-slate-700' : 'bg-slate-200'
              }`}>
                {count}
              </span>
            </button>
          ))}
        </div>

        {/* Advanced Filters (Collapsible) */}
        {showFilters && (
          <div className={`pt-4 mt-4 border-t ${theme === 'dark' ? 'border-slate-700/50' : 'border-slate-200'}`}>
            <div className="flex flex-wrap items-center gap-4">
              {/* Credit Balance Range */}
              <div className="flex items-center gap-2">
                <CreditCard className={`w-4 h-4 flex-shrink-0 ${theme === 'dark' ? 'text-emerald-500' : 'text-emerald-600'}`} />
                <span className={`text-sm font-medium ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>Credit:</span>
                <input
                  type="number"
                  placeholder="Min"
                  value={minCreditBalance}
                  onChange={(e) => setMinCreditBalance(e.target.value)}
                  className={`w-28 px-3 py-1.5 rounded-xl border text-sm ${
                    theme === 'dark' 
                      ? 'bg-slate-800/50 border-slate-700/50 text-white placeholder-slate-500' 
                      : 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400'
                  }`}
                />
                <span className={`${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>-</span>
                <input
                  type="number"
                  placeholder="Max"
                  value={maxCreditBalance}
                  onChange={(e) => setMaxCreditBalance(e.target.value)}
                  className={`w-28 px-3 py-1.5 rounded-xl border text-sm ${
                    theme === 'dark' 
                      ? 'bg-slate-800/50 border-slate-700/50 text-white placeholder-slate-500' 
                      : 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400'
                  }`}
                />
              </div>

              {/* Date Range with Calendar */}
              <div className="flex items-center gap-2">
                <Calendar className={`w-4 h-4 flex-shrink-0 ${theme === 'dark' ? 'text-emerald-500' : 'text-emerald-600'}`} />
                <span className={`text-sm font-medium ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>Last Order:</span>
                {/* Start Date */}
                <div className="relative overflow-visible" ref={startCalendarRef}>
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
                  {showStartCalendar && renderCalendar(startDate, setStartDate, setShowStartCalendar)}
                </div>
                
                <span className={`${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>-</span>
                
                {/* End Date */}
                <div className="relative overflow-visible" ref={endCalendarRef}>
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
                  {showEndCalendar && renderCalendar(endDate, setEndDate, setShowEndCalendar)}
                </div>
              </div>

              {/* Clear Filters Button */}
              {advancedFiltersCount > 0 && (
                <button
                  onClick={clearAdvancedFilters}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-sm font-medium transition-colors ${
                    theme === 'dark'
                      ? 'bg-red-500/10 hover:bg-red-500/20 text-red-400'
                      : 'bg-red-50 hover:bg-red-100 text-red-600'
                  }`}
                >
                  <X className="w-4 h-4" />
                  <span>Clear Filters</span>
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Suppliers Display */}
      {viewMode === 'list' ? (
        /* Table View */
        <div className={`rounded-2xl border overflow-hidden ${
          theme === 'dark' 
            ? 'bg-slate-800/30 border-slate-700/50' 
            : 'bg-white border-slate-200'
        }`}>
          {/* Desktop Table */}
          <div className="hidden md:block">
            <table className="w-full table-fixed">
              <thead>
                <tr className={`border-b ${theme === 'dark' ? 'border-slate-700/50' : 'border-slate-200'}`}>
                  <th className={`text-left px-3 py-3 text-xs font-semibold w-[25%] ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                    Company
                  </th>
                  <th className={`text-left px-3 py-3 text-xs font-semibold w-[15%] ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                    Contact
                  </th>
                  <th className={`text-left px-3 py-3 text-xs font-semibold w-[12%] ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                    Phone
                  </th>
                  <th className={`text-right px-3 py-3 text-xs font-semibold w-[12%] ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                    Credit Balance
                  </th>
                  <th className={`text-center px-3 py-3 text-xs font-semibold w-[10%] ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                    Status
                  </th>
                  <th className={`text-left px-3 py-3 text-xs font-semibold w-[12%] ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                    Last Order
                  </th>
                  <th className={`text-right px-3 py-3 text-xs font-semibold w-[14%] ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {paginatedSuppliers.map((supplier) => {
                  const isOverdue = supplier.creditStatus === 'overdue';
                  return (
                    <tr 
                      key={supplier.id}
                      className={`border-b transition-colors ${
                        isOverdue
                          ? theme === 'dark'
                            ? 'border-red-900/30 bg-red-950/20 hover:bg-red-950/30'
                            : 'border-red-100 bg-red-50/50 hover:bg-red-50'
                          : theme === 'dark' 
                            ? 'border-slate-700/30 hover:bg-slate-800/30' 
                            : 'border-slate-100 hover:bg-slate-50'
                      }`}
                    >
                      <td className="px-3 py-3">
                        <div>
                          <p className={`font-medium truncate ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                            {supplier.company}
                          </p>
                          <p className={`text-xs truncate ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>
                            {supplier.name}
                          </p>
                        </div>
                      </td>
                      <td className={`px-3 py-3 text-xs truncate ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                        {supplier.email}
                      </td>
                      <td className={`px-3 py-3 text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                        <div className="flex items-center gap-1">
                          <Phone className="w-3 h-3" />
                          {supplier.phone}
                        </div>
                      </td>
                      <td className={`px-3 py-3 text-right font-medium text-sm ${isOverdue ? 'text-red-500' : theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                        {formatCurrency(supplier.creditBalance)}
                      </td>
                      <td className="px-3 py-3 text-center">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full ${getCreditStatusStyle(supplier.creditStatus)}`}>
                          {getCreditStatusIcon(supplier.creditStatus)}
                          <span className="hidden sm:inline">{supplier.creditStatus === 'clear' ? 'Clear' : supplier.creditStatus === 'active' ? 'Active' : 'Overdue'}</span>
                        </span>
                      </td>
                      <td className={`px-3 py-3 text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                        {supplier.lastOrder ? new Date(supplier.lastOrder).toLocaleDateString('en-GB', {
                          day: '2-digit',
                          month: 'short',
                          year: '2-digit'
                        }) : 'N/A'}
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <button 
                            onClick={() => handleViewSupplier(supplier)}
                            className={`p-1.5 rounded-lg transition-colors ${
                              theme === 'dark' ? 'hover:bg-indigo-500/10 text-indigo-400' : 'hover:bg-indigo-50 text-indigo-600'
                            }`}
                            title="View Details"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => handlePaymentHistory(supplier)}
                            className={`p-1.5 rounded-lg transition-colors ${
                              theme === 'dark' ? 'hover:bg-purple-500/10 text-purple-400' : 'hover:bg-purple-50 text-purple-600'
                            }`}
                            title="Payment History"
                          >
                            <History className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => handleOrderFromSupplier(supplier)}
                            className={`p-1.5 rounded-lg transition-colors ${
                              theme === 'dark' ? 'hover:bg-emerald-500/10 text-emerald-400' : 'hover:bg-emerald-50 text-emerald-600'
                            }`}
                            title="Order"
                          >
                            <ShoppingCart className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => handleEditSupplier(supplier)}
                            className={`p-1.5 rounded-lg transition-colors ${
                              theme === 'dark' ? 'hover:bg-slate-700 text-slate-400' : 'hover:bg-slate-100 text-slate-600'
                            }`}
                            title="Edit"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => handleDeleteClick(supplier)}
                            className={`p-1.5 rounded-lg transition-colors ${
                              theme === 'dark' ? 'hover:bg-red-500/10 text-red-400' : 'hover:bg-red-50 text-red-500'
                            }`}
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                          {supplier.creditBalance > 0 && (
                            <button 
                              onClick={() => isOverdue ? sendUrgentReminder(supplier) : sendFriendlyReminder(supplier)}
                              className={`p-1.5 rounded-lg transition-colors ${
                                isOverdue
                                  ? 'hover:bg-orange-500/10 text-orange-500 animate-pulse'
                                  : theme === 'dark' ? 'hover:bg-green-500/10 text-green-400' : 'hover:bg-green-50 text-green-600'
                              }`}
                              title={isOverdue ? 'Send Urgent Reminder' : 'Send Friendly Reminder'}
                            >
                              {isOverdue ? <Zap className="w-4 h-4" /> : <MessageCircle className="w-4 h-4" />}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile List View (for table mode on mobile) */}
          <div className="md:hidden divide-y divide-slate-200 dark:divide-slate-700/50">
            {paginatedSuppliers.map((supplier) => {
              const isOverdue = supplier.creditStatus === 'overdue';
              return (
                <div 
                  key={supplier.id}
                  className={`p-4 ${
                    isOverdue
                      ? theme === 'dark'
                        ? 'bg-red-950/20 hover:bg-red-950/30'
                        : 'bg-red-50/50 hover:bg-red-50'
                      : theme === 'dark' ? 'hover:bg-slate-800/30' : 'hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`w-12 h-12 rounded-lg flex items-center justify-center text-white font-bold text-sm flex-shrink-0 ${
                      isOverdue 
                        ? 'bg-gradient-to-br from-red-500 to-rose-600' 
                        : 'bg-gradient-to-br from-violet-500 to-purple-600'
                    }`}>
                      {supplier.company.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <h3 className={`font-medium truncate ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                            {supplier.company}
                          </h3>
                          <p className={`text-xs mt-0.5 ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>
                            {supplier.name}
                          </p>
                        </div>
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full flex-shrink-0 ${getCreditStatusStyle(supplier.creditStatus)}`}>
                          {getCreditStatusIcon(supplier.creditStatus)}
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 mt-2">
                        <span className={`text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                          {supplier.email}
                        </span>
                        <span className={`text-xs ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>
                          •
                        </span>
                        <span className={`text-xs flex items-center gap-1 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                          <Phone className="w-3 h-3" />
                          {supplier.phone}
                        </span>
                      </div>
                      <div className="flex items-center justify-between mt-3">
                        <span className={`text-sm font-medium ${isOverdue ? 'text-red-500' : theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                          {formatCurrency(supplier.creditBalance)}
                        </span>
                        <div className="flex items-center gap-1">
                          <button 
                            onClick={() => handleViewSupplier(supplier)}
                            className={`p-2 rounded-lg transition-colors ${
                              theme === 'dark' ? 'hover:bg-indigo-500/10 text-indigo-400' : 'hover:bg-indigo-50 text-indigo-600'
                            }`}
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => handlePaymentHistory(supplier)}
                            className={`p-2 rounded-lg transition-colors ${
                              theme === 'dark' ? 'hover:bg-purple-500/10 text-purple-400' : 'hover:bg-purple-50 text-purple-600'
                            }`}
                            title="Payment History"
                          >
                            <History className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => handleOrderFromSupplier(supplier)}
                            className={`p-2 rounded-lg transition-colors ${
                              theme === 'dark' ? 'hover:bg-emerald-500/10 text-emerald-400' : 'hover:bg-emerald-50 text-emerald-600'
                            }`}
                          >
                            <ShoppingCart className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => handleEditSupplier(supplier)}
                            className={`p-2 rounded-lg transition-colors ${
                              theme === 'dark' ? 'hover:bg-slate-700 text-slate-400' : 'hover:bg-slate-200 text-slate-600'
                            }`}
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => handleDeleteClick(supplier)}
                            className={`p-2 rounded-lg transition-colors ${
                              theme === 'dark' ? 'hover:bg-red-500/10 text-red-400' : 'hover:bg-red-50 text-red-500'
                            }`}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                          {supplier.creditBalance > 0 && (
                            <button 
                              onClick={() => isOverdue ? sendUrgentReminder(supplier) : sendFriendlyReminder(supplier)}
                              className={`p-2 rounded-lg transition-colors ${
                                isOverdue
                                  ? 'hover:bg-orange-500/10 text-orange-500 animate-pulse'
                                  : theme === 'dark' ? 'hover:bg-green-500/10 text-green-400' : 'hover:bg-green-50 text-green-600'
                              }`}
                            >
                              {isOverdue ? <Zap className="w-4 h-4" /> : <MessageCircle className="w-4 h-4" />}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* Card View */
        <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
          {paginatedSuppliers.map((supplier) => {
            const daysUntilDue = getDaysUntilDue(supplier.creditDueDate);
            const creditPercentage = (supplier.creditBalance / supplier.creditLimit) * 100;
            const isOverdue = supplier.creditStatus === 'overdue';
            const isDueSoon = daysUntilDue !== null && daysUntilDue <= 7 && daysUntilDue > 0;

            return (
            <div 
              key={supplier.id}
              className={`rounded-2xl border overflow-hidden transition-all hover:shadow-xl ${
                isOverdue
                  ? theme === 'dark' 
                    ? 'bg-slate-800/30 border-red-500/50 shadow-red-500/10' 
                    : 'bg-white border-red-300 shadow-red-100'
                  : theme === 'dark' 
                    ? 'bg-slate-800/30 border-slate-700/50 hover:border-emerald-500/30' 
                    : 'bg-white border-slate-200 hover:border-emerald-500/50'
              }`}
            >
              {/* Overdue Warning Banner */}
              {isOverdue && (
                <div className="bg-gradient-to-r from-red-500 to-rose-500 px-4 py-2 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-white" />
                  <span className="text-white text-sm font-medium">
                    ⚠️ Payment Overdue! Due date was {supplier.creditDueDate ? new Date(supplier.creditDueDate).toLocaleDateString('en-GB') : 'N/A'}
                  </span>
                </div>
              )}

              {/* Due Soon Warning */}
              {isDueSoon && !isOverdue && (
                <div className="bg-gradient-to-r from-amber-500 to-orange-500 px-4 py-2 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-white" />
                  <span className="text-white text-sm font-medium">
                    ⏰ Payment due in {daysUntilDue} days!
                  </span>
                </div>
              )}

              <div className="p-5">
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-14 h-14 rounded-xl flex items-center justify-center text-white font-bold text-lg ${
                      isOverdue 
                        ? 'bg-gradient-to-br from-red-500 to-rose-600' 
                        : 'bg-gradient-to-br from-violet-500 to-purple-600'
                    }`}>
                      {supplier.company.charAt(0)}
                    </div>
                    <div>
                      <h3 className={`font-semibold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                        {supplier.company}
                      </h3>
                      <p className={`text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                        {supplier.name}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full border ${getCreditStatusStyle(supplier.creditStatus)}`}>
                      {getCreditStatusIcon(supplier.creditStatus)}
                      {supplier.creditStatus === 'clear' ? 'No Credit' : supplier.creditStatus === 'active' ? 'Credit Active' : 'Overdue'}
                    </span>
                  </div>
                </div>

                {/* Contact Info */}
                <div className="grid grid-cols-2 gap-2 mb-4">
                  <div className="flex items-center gap-2">
                    <Phone className={`w-4 h-4 ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`} />
                    <span className={`text-sm ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                      {supplier.phone}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Mail className={`w-4 h-4 ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`} />
                    <span className={`text-sm truncate ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                      {supplier.email}
                    </span>
                  </div>
                </div>

                {/* Categories */}
                <div className="flex flex-wrap gap-1.5 mb-4">
                  {supplier.categories.map((cat) => (
                    <span 
                      key={cat}
                      className={`px-2 py-0.5 rounded-md text-xs font-medium ${
                        theme === 'dark' ? 'bg-slate-700/50 text-slate-300' : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {cat}
                    </span>
                  ))}
                </div>

                {/* Credit Section */}
                {supplier.creditBalance > 0 && (
                  <div className={`p-4 rounded-xl mb-4 ${
                    isOverdue
                      ? theme === 'dark' ? 'bg-red-500/10 border border-red-500/30' : 'bg-red-50 border border-red-200'
                      : theme === 'dark' ? 'bg-slate-800/50 border border-slate-700/50' : 'bg-slate-50 border border-slate-200'
                  }`}>
                    <div className="flex items-center justify-between mb-2">
                      <span className={`text-sm font-medium ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                        Credit Balance (Naya)
                      </span>
                      <span className={`text-lg font-bold ${isOverdue ? 'text-red-500' : 'text-blue-500'}`}>
                        {formatCurrency(supplier.creditBalance)}
                      </span>
                    </div>
                    
                    {/* Credit Limit Progress Bar */}
                    <div className="mb-2">
                      <div className="flex justify-between text-xs mb-1">
                        <span className={theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}>Credit Used</span>
                        <span className={theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}>
                          {creditPercentage.toFixed(0)}% of {formatCurrency(supplier.creditLimit)}
                        </span>
                      </div>
                      <div className={`h-2 rounded-full overflow-hidden ${theme === 'dark' ? 'bg-slate-700' : 'bg-slate-200'}`}>
                        <div 
                          className={`h-full rounded-full bg-gradient-to-r ${getProgressColor(creditPercentage)} transition-all`}
                          style={{ width: `${Math.min(creditPercentage, 100)}%` }}
                        />
                      </div>
                    </div>

                    {/* Due Date */}
                    {supplier.creditDueDate && (
                      <div className="flex items-center justify-between">
                        <span className={`text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                          <Calendar className="w-3.5 h-3.5 inline mr-1" />
                          Due Date
                        </span>
                        <span className={`text-sm font-medium ${
                          isOverdue ? 'text-red-500' : isDueSoon ? 'text-amber-500' : theme === 'dark' ? 'text-slate-300' : 'text-slate-700'
                        }`}>
                          {new Date(supplier.creditDueDate).toLocaleDateString('en-GB')}
                          {daysUntilDue !== null && daysUntilDue < 0 && (
                            <span className="text-red-500 ml-1">({Math.abs(daysUntilDue)} days overdue)</span>
                          )}
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {/* Stats Row */}
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div className={`p-3 rounded-xl ${theme === 'dark' ? 'bg-slate-800/50' : 'bg-slate-50'}`}>
                    <p className={`text-xs ${theme === 'dark' ? 'text-slate-500' : 'text-slate-500'}`}>Total Purchases</p>
                    <p className={`text-base font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                      {formatCurrency(supplier.totalPurchases)}
                    </p>
                  </div>
                  <div className={`p-3 rounded-xl ${theme === 'dark' ? 'bg-slate-800/50' : 'bg-slate-50'}`}>
                    <p className={`text-xs ${theme === 'dark' ? 'text-slate-500' : 'text-slate-500'}`}>Orders</p>
                    <p className={`text-base font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                      {supplier.totalOrders} orders
                    </p>
                  </div>
                </div>

                {/* WhatsApp Reminder Section for Credit Balance */}
                {supplier.creditBalance > 0 && (
                  <div className={`mb-4 p-3 rounded-xl border ${
                    isOverdue
                      ? theme === 'dark' 
                        ? 'bg-red-950/30 border-red-500/30' 
                        : 'bg-red-50 border-red-200'
                      : isDueSoon
                        ? theme === 'dark'
                          ? 'bg-amber-950/30 border-amber-500/30'
                          : 'bg-amber-50 border-amber-200'
                        : theme === 'dark'
                          ? 'bg-green-950/20 border-green-500/20'
                          : 'bg-green-50 border-green-200'
                  }`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <MessageCircle className={`w-4 h-4 ${
                          isOverdue 
                            ? 'text-red-500' 
                            : isDueSoon 
                              ? 'text-amber-500' 
                              : 'text-green-500'
                        }`} />
                        <span className={`text-sm font-medium ${
                          isOverdue 
                            ? 'text-red-600 dark:text-red-400' 
                            : isDueSoon 
                              ? 'text-amber-600 dark:text-amber-400' 
                              : 'text-green-600 dark:text-green-400'
                        }`}>
                          {isOverdue 
                            ? 'Send Urgent Payment Reminder' 
                            : isDueSoon 
                              ? 'Payment Due Soon - Send Reminder' 
                              : 'Send Friendly Reminder'}
                        </span>
                      </div>
                      <button
                        onClick={() => isOverdue ? sendUrgentReminder(supplier) : sendFriendlyReminder(supplier)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                          isOverdue
                            ? 'bg-gradient-to-r from-red-500 to-rose-500 text-white hover:from-red-600 hover:to-rose-600 shadow-lg shadow-red-500/25 animate-pulse'
                            : isDueSoon
                              ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white hover:from-amber-600 hover:to-orange-600 shadow-lg shadow-amber-500/25'
                              : 'bg-gradient-to-r from-green-500 to-emerald-500 text-white hover:from-green-600 hover:to-emerald-600 shadow-lg shadow-green-500/25'
                        }`}
                      >
                        {isOverdue ? <Zap className="w-3.5 h-3.5" /> : <MessageCircle className="w-3.5 h-3.5" />}
                        {isOverdue ? 'Urgent WhatsApp' : 'WhatsApp'}
                      </button>
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className={`flex gap-2 pt-4 border-t ${theme === 'dark' ? 'border-slate-700/50' : 'border-slate-200'}`}>
                  <button 
                    onClick={() => handleViewSupplier(supplier)}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                      theme === 'dark' ? 'bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20' : 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100'
                    }`}
                  >
                    <Eye className="w-4 h-4" /> View
                  </button>
                  <button 
                    onClick={() => handlePaymentHistory(supplier)}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                      theme === 'dark' ? 'bg-purple-500/10 text-purple-400 hover:bg-purple-500/20' : 'bg-purple-50 text-purple-600 hover:bg-purple-100'
                    }`}
                  >
                    <History className="w-4 h-4" /> History
                  </button>
                  <button 
                    onClick={() => handleOrderFromSupplier(supplier)}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                      theme === 'dark' ? 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20' : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100'
                    }`}
                  >
                    <ShoppingCart className="w-4 h-4" /> Order
                  </button>
                  <button 
                    onClick={() => handleEditSupplier(supplier)}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                      theme === 'dark' ? 'bg-violet-500/10 text-violet-400 hover:bg-violet-500/20' : 'bg-violet-50 text-violet-600 hover:bg-violet-100'
                    }`}
                  >
                    <Edit className="w-4 h-4" /> Edit
                  </button>
                  
                  {supplier.creditBalance > 0 ? (
                    <button 
                      onClick={() => handlePayCreditClick(supplier)}
                      className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                        theme === 'dark' ? 'bg-blue-500/10 text-blue-400 hover:bg-blue-500/20' : 'bg-blue-50 text-blue-600 hover:bg-blue-100'
                      }`}
                    >
                      <DollarSign className="w-4 h-4" /> Pay
                    </button>
                  ) : (
                    <button 
                      onClick={() => handleDeleteClick(supplier)}
                      className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                        theme === 'dark' ? 'bg-red-500/10 text-red-400 hover:bg-red-500/20' : 'bg-red-50 text-red-600 hover:bg-red-100'
                      }`}
                    >
                      <Trash2 className="w-4 h-4" /> Delete
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
          })}
        </div>
      )}

      {/* Pagination */}
      {filteredSuppliers.length > 0 && (
        <div className={`p-4 rounded-2xl border ${
          theme === 'dark' 
            ? 'bg-slate-800/30 border-slate-700/50' 
            : 'bg-white border-slate-200'
        }`}>
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            {/* Results Info */}
            <div className="flex items-center gap-4">
              <p className={`text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                Showing <span className="font-medium">{startIndex + 1}</span> - <span className="font-medium">{Math.min(endIndex, filteredSuppliers.length)}</span> of <span className="font-medium">{filteredSuppliers.length}</span> suppliers
              </p>
              
              {/* Items Per Page Selector - Creative Pill Buttons */}
              <div className="flex items-center gap-2">
                <span className={`text-sm ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>Show:</span>
                <div className={`flex items-center rounded-full p-0.5 ${
                  theme === 'dark' ? 'bg-slate-800' : 'bg-slate-100'
                }`}>
                  {(viewMode === 'list' ? [10, 20] : [6, 12]).map((num) => (
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

      {/* Modals */}
      <SupplierFormModal
        isOpen={isFormModalOpen}
        supplier={selectedSupplier}
        onClose={() => setIsFormModalOpen(false)}
        onSave={handleSaveSupplier}
      />

      <CreditPaymentModal
        isOpen={isPaymentModalOpen}
        supplier={supplierForPayment}
        onClose={() => setIsPaymentModalOpen(false)}
        onPayment={handlePayment}
      />

      <DeleteConfirmationModal
        isOpen={isDeleteModalOpen}
        title="Delete Supplier"
        message="Are you sure you want to delete this supplier? This action cannot be undone."
        itemName={supplierToDelete?.company}
        onConfirm={handleConfirmDelete}
        onCancel={() => setIsDeleteModalOpen(false)}
      />

      <SupplierDetailModal
        isOpen={isDetailModalOpen}
        supplier={supplierForDetail}
        purchases={purchases}
        onClose={() => setIsDetailModalOpen(false)}
        onMakePayment={handleMakePurchasePayment}
      />

      <PurchasePaymentModal
        isOpen={isPurchasePaymentModalOpen}
        purchase={purchaseForPayment}
        onClose={() => setIsPurchasePaymentModalOpen(false)}
        onPayment={handlePurchasePayment}
      />

      <SupplierPaymentHistoryModal
        isOpen={isPaymentHistoryModalOpen}
        onClose={() => {
          setIsPaymentHistoryModalOpen(false);
          setSupplierForPaymentHistory(null);
        }}
        supplier={supplierForPaymentHistory}
        purchases={purchases}
      />

      {/* Order Modal */}
      {isOrderModalOpen && supplierForOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className={`w-full max-w-md rounded-2xl border shadow-2xl overflow-hidden ${
            theme === 'dark' 
              ? 'bg-slate-900 border-slate-700' 
              : 'bg-white border-slate-200'
          }`}>
            {/* Modal Header */}
            <div className={`px-6 py-4 border-b flex items-center justify-between flex-shrink-0 ${
              theme === 'dark' ? 'border-slate-700 bg-slate-800/50' : 'border-slate-200 bg-slate-50'
            }`}>
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold text-sm ${
                  'bg-gradient-to-br from-emerald-500 to-green-600'
                }`}>
                  <ShoppingCart className="w-5 h-5" />
                </div>
                <div>
                  <h2 className={`text-lg font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                    Place Order
                  </h2>
                  <p className={`text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                    {supplierForOrder.company}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsOrderModalOpen(false)}
                className={`p-2 rounded-lg transition-colors ${
                  theme === 'dark' ? 'hover:bg-slate-700 text-slate-400' : 'hover:bg-slate-100 text-slate-600'
                }`}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className={`px-6 py-6 border-b ${theme === 'dark' ? 'border-slate-700/50' : 'border-slate-200'}`}>
              <div className="space-y-4">
                <div>
                  <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                    Supplier
                  </label>
                  <div className={`px-4 py-3 rounded-xl border ${
                    theme === 'dark' 
                      ? 'bg-slate-800/50 border-slate-700/50 text-slate-300'
                      : 'bg-slate-50 border-slate-200 text-slate-700'
                  }`}>
                    {supplierForOrder.company}
                  </div>
                </div>

                <div>
                  <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                    Contact
                  </label>
                  <div className={`px-4 py-3 rounded-xl border ${
                    theme === 'dark' 
                      ? 'bg-slate-800/50 border-slate-700/50 text-slate-300'
                      : 'bg-slate-50 border-slate-200 text-slate-700'
                  }`}>
                    {supplierForOrder.email}
                  </div>
                </div>

                <div>
                  <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                    Phone
                  </label>
                  <div className={`px-4 py-3 rounded-xl border ${
                    theme === 'dark' 
                      ? 'bg-slate-800/50 border-slate-700/50 text-slate-300'
                      : 'bg-slate-50 border-slate-200 text-slate-700'
                  }`}>
                    {supplierForOrder.phone}
                  </div>
                </div>

                <div className={`p-4 rounded-xl border-l-4 ${
                  theme === 'dark' 
                    ? 'bg-emerald-500/10 border-emerald-500 text-emerald-400'
                    : 'bg-emerald-50 border-emerald-500 text-emerald-700'
                }`}>
                  <p className="text-sm font-medium">
                    📱 Click "Send Order" to open WhatsApp Desktop with a pre-filled order message for this supplier.
                  </p>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className={`px-6 py-4 flex gap-3 ${theme === 'dark' ? 'bg-slate-800/30' : 'bg-slate-50'}`}>
              <button
                onClick={() => setIsOrderModalOpen(false)}
                className={`flex-1 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  theme === 'dark'
                    ? 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                    : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                }`}
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  // Format phone number for WhatsApp (remove dashes, spaces, and add country code if needed)
                  let phoneNumber = supplierForOrder.phone.replace(/[-\s]/g, '');
                  // If starts with 0, replace with Sri Lanka country code
                  if (phoneNumber.startsWith('0')) {
                    phoneNumber = '94' + phoneNumber.substring(1);
                  }
                  // If doesn't start with +, assume it needs country code
                  if (!phoneNumber.startsWith('+') && !phoneNumber.startsWith('94')) {
                    phoneNumber = '94' + phoneNumber;
                  }
                  phoneNumber = phoneNumber.replace('+', '');
                  
                  // Get current date formatted
                  const today = new Date();
                  const dateStr = today.toLocaleDateString('en-GB', { 
                    weekday: 'long', 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                  });
                  
                  // Creative WhatsApp message
                  const message = `🛒 *NEW ORDER REQUEST*
━━━━━━━━━━━━━━━━━━━━━

Hello ${supplierForOrder.name}! 👋

This is *ECOTEC Electronics* reaching out for a new order.

📅 *Date:* ${dateStr}
🏢 *Supplier:* ${supplierForOrder.company}

━━━━━━━━━━━━━━━━━━━━━
📦 *ORDER DETAILS:*
━━━━━━━━━━━━━━━━━━━━━

Please share your:
✅ Latest product catalog
✅ Current stock availability  
✅ Best pricing for bulk orders
✅ Expected delivery timeline

━━━━━━━━━━━━━━━━━━━━━

We look forward to doing business with you! 🤝

_Sent via ECOTEC POS System_
🌟 *Quality Electronics, Quality Service*`;

                  const encodedMessage = encodeURIComponent(message);
                  window.open(`https://wa.me/${phoneNumber}?text=${encodedMessage}`, '_blank');
                  setIsOrderModalOpen(false);
                }}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all bg-gradient-to-r from-emerald-500 to-green-500 text-white hover:from-emerald-600 hover:to-green-600 shadow-lg shadow-emerald-500/25`}
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                </svg>
                Send via WhatsApp
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
