import React, { useMemo, useState, useEffect, useCallback } from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import type { Supplier, SupplierPurchase, SupplierPayment } from '../../data/mockData';
import { SearchableSelect } from '../ui/searchable-select';
import * as grnService from '../../services/grnService';
import type { FrontendGRN } from '../../services/grnService';
import { 
  X, Wallet, CreditCard, Landmark, Banknote, FileText, Search,
  ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight,
  Receipt, Building2, Package, ClipboardList, TrendingUp, 
  Calendar, CheckCircle, XCircle, Clock, AlertCircle, Truck, Loader2
} from 'lucide-react';

// Extended payment type with purchase info for display
interface PaymentWithPurchaseInfo extends SupplierPayment {
  purchaseId: string;
  productName: string;
  productCategory: string;
  supplierName: string;
}

interface SupplierPaymentHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  supplier: Supplier | null;
  purchases: SupplierPurchase[];
}

const formatCurrency = (amount: number): string => {
  return `Rs. ${amount.toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const formatDate = (dateString: string): string => {
  return new Date(dateString).toLocaleDateString('en-LK', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

const getPaymentMethodIcon = (method: string) => {
  switch (method) {
    case 'cash': return Banknote;
    case 'bank': return Landmark;
    case 'card': return CreditCard;
    case 'cheque': return FileText;
    default: return Wallet;
  }
};

const getPaymentMethodLabel = (method: string): string => {
  switch (method) {
    case 'cash': return 'Cash';
    case 'bank': return 'Bank Transfer';
    case 'card': return 'Card Payment';
    case 'cheque': return 'Cheque';
    default: return method;
  }
};

const getPaymentMethodColor = (method: string, theme: string): string => {
  const isDark = theme === 'dark';
  switch (method) {
    case 'cash': return isDark ? 'text-emerald-400 bg-emerald-500/20' : 'text-emerald-600 bg-emerald-100';
    case 'bank': return isDark ? 'text-blue-400 bg-blue-500/20' : 'text-blue-600 bg-blue-100';
    case 'card': return isDark ? 'text-purple-400 bg-purple-500/20' : 'text-purple-600 bg-purple-100';
    case 'cheque': return isDark ? 'text-amber-400 bg-amber-500/20' : 'text-amber-600 bg-amber-100';
    default: return isDark ? 'text-slate-400 bg-slate-500/20' : 'text-slate-600 bg-slate-100';
  }
};

export const SupplierPaymentHistoryModal: React.FC<SupplierPaymentHistoryModalProps> = ({
  isOpen,
  onClose,
  supplier,
  purchases,
}) => {
  const { theme } = useTheme();
  const { user } = useAuth();
  const shopId = user?.shop?.id;
  const [activeTab, setActiveTab] = useState<'payments' | 'grn'>('payments');
  const [searchQuery, setSearchQuery] = useState('');
  const [methodFilter, setMethodFilter] = useState<string>('all');
  const [grnStatusFilter, setGrnStatusFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [grnCurrentPage, setGrnCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const grnItemsPerPage = 8;
  
  // GRN data from API
  const [supplierGRNs, setSupplierGRNs] = useState<FrontendGRN[]>([]);
  const [isLoadingGRNs, setIsLoadingGRNs] = useState(false);

  // Load GRNs from API when modal opens or supplier changes
  const loadSupplierGRNs = useCallback(async () => {
    if (!supplier || !isOpen) return;
    
    // Use apiId for database queries, fallback to id
    const supplierId = supplier.apiId || supplier.id;
    
    setIsLoadingGRNs(true);
    try {
      const result = await grnService.getGRNs({ 
        shopId, 
        supplierId
      });
      console.log('GRN API result for supplier:', supplierId, result);
      if (result.success && result.data) {
        // Sort by date descending
        const sorted = result.data.sort((a, b) => 
          new Date(b.receivedDate || b.orderDate || '').getTime() - 
          new Date(a.receivedDate || a.orderDate || '').getTime()
        );
        setSupplierGRNs(sorted);
      }
    } catch (error) {
      console.error('Error loading supplier GRNs:', error);
    } finally {
      setIsLoadingGRNs(false);
    }
  }, [supplier, isOpen, shopId]);

  useEffect(() => {
    loadSupplierGRNs();
  }, [loadSupplierGRNs]);

  // Payment method options for SearchableSelect
  const paymentMethodOptions = [
    { value: 'all', label: 'All Methods', icon: <Wallet className="w-4 h-4 text-slate-400" /> },
    { value: 'cash', label: 'Cash', icon: <Banknote className="w-4 h-4 text-emerald-500" /> },
    { value: 'bank', label: 'Bank Transfer', icon: <Landmark className="w-4 h-4 text-blue-500" /> },
    { value: 'card', label: 'Card', icon: <CreditCard className="w-4 h-4 text-purple-500" /> },
    { value: 'cheque', label: 'Cheque', icon: <FileText className="w-4 h-4 text-amber-500" /> },
  ];

  // GRN status options for SearchableSelect
  const grnStatusOptions = [
    { value: 'all', label: 'All Status', icon: <ClipboardList className="w-4 h-4 text-slate-400" /> },
    { value: 'completed', label: 'Completed', icon: <CheckCircle className="w-4 h-4 text-emerald-500" /> },
    { value: 'partial', label: 'Partial', icon: <AlertCircle className="w-4 h-4 text-amber-500" /> },
    { value: 'pending', label: 'Pending', icon: <Clock className="w-4 h-4 text-blue-500" /> },
    { value: 'cancelled', label: 'Cancelled', icon: <XCircle className="w-4 h-4 text-red-500" /> },
  ];

  // Filter GRNs (loaded from API via loadSupplierGRNs)
  const filteredGRNs = useMemo(() => {
    return supplierGRNs.filter(grn => {
      const matchesSearch = 
        grn.grnNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (grn.items || []).some(item => item.productName.toLowerCase().includes(searchQuery.toLowerCase()));
      
      const matchesStatus = grnStatusFilter === 'all' || grn.status === grnStatusFilter;
      
      return matchesSearch && matchesStatus;
    });
  }, [supplierGRNs, searchQuery, grnStatusFilter]);

  // GRN Pagination
  const grnTotalPages = Math.ceil(filteredGRNs.length / grnItemsPerPage);
  const grnStartIndex = (grnCurrentPage - 1) * grnItemsPerPage;
  const paginatedGRNs = filteredGRNs.slice(grnStartIndex, grnStartIndex + grnItemsPerPage);

  // GRN Statistics
  const grnStats = useMemo(() => {
    const totalGRNs = supplierGRNs.length;
    const totalValue = supplierGRNs.reduce((sum, grn) => sum + (grn.totalAmount || 0), 0);
    const totalItems = supplierGRNs.reduce((sum, grn) => sum + (grn.totalAcceptedQuantity || grn.totalOrderedQuantity || 0), 0);
    const completed = supplierGRNs.filter(g => g.status === 'completed').length;
    const pending = supplierGRNs.filter(g => g.status === 'pending' || g.status === 'partial').length;
    return { totalGRNs, totalValue, totalItems, completed, pending };
  }, [supplierGRNs]);

  // Get all payments for this supplier with purchase info
  const allPayments = useMemo<PaymentWithPurchaseInfo[]>(() => {
    if (!supplier) return [];
    
    const supplierPurchases = purchases.filter(p => p.supplierId === supplier.id);
    const payments: PaymentWithPurchaseInfo[] = [];
    
    supplierPurchases.forEach(purchase => {
      purchase.payments.forEach(payment => {
        payments.push({
          ...payment,
          purchaseId: purchase.id,
          productName: purchase.productName,
          productCategory: purchase.category,
          supplierName: purchase.supplierName,
        });
      });
    });
    
    // Sort by date descending
    return payments.sort((a, b) => 
      new Date(b.paymentDate).getTime() - new Date(a.paymentDate).getTime()
    );
  }, [supplier, purchases]);

  // Filter payments
  const filteredPayments = useMemo(() => {
    return allPayments.filter(payment => {
      const matchesSearch = 
        payment.productName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        payment.notes?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        payment.id.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesMethod = methodFilter === 'all' || payment.paymentMethod === methodFilter;
      
      return matchesSearch && matchesMethod;
    });
  }, [allPayments, searchQuery, methodFilter]);

  // Pagination
  const totalPages = Math.ceil(filteredPayments.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedPayments = filteredPayments.slice(startIndex, startIndex + itemsPerPage);

  // Statistics
  const stats = useMemo(() => {
    const totalPaid = allPayments.reduce((sum, p) => sum + p.amount, 0);
    const byMethod = {
      cash: allPayments.filter(p => p.paymentMethod === 'cash').reduce((sum, p) => sum + p.amount, 0),
      bank: allPayments.filter(p => p.paymentMethod === 'bank').reduce((sum, p) => sum + p.amount, 0),
      card: allPayments.filter(p => p.paymentMethod === 'card').reduce((sum, p) => sum + p.amount, 0),
      cheque: allPayments.filter(p => p.paymentMethod === 'cheque').reduce((sum, p) => sum + p.amount, 0),
    };
    return { totalPaid, byMethod, count: allPayments.length };
  }, [allPayments]);

  // Get page numbers for pagination
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

  // Get GRN page numbers for pagination
  const getGrnPageNumbers = useMemo(() => {
    const pages: (number | string)[] = [];
    if (grnTotalPages <= 5) {
      for (let i = 1; i <= grnTotalPages; i++) pages.push(i);
    } else {
      if (grnCurrentPage <= 3) {
        for (let i = 1; i <= 4; i++) pages.push(i);
        pages.push('...');
        pages.push(grnTotalPages);
      } else if (grnCurrentPage >= grnTotalPages - 2) {
        pages.push(1);
        pages.push('...');
        for (let i = grnTotalPages - 3; i <= grnTotalPages; i++) pages.push(i);
      } else {
        pages.push(1);
        pages.push('...');
        for (let i = grnCurrentPage - 1; i <= grnCurrentPage + 1; i++) pages.push(i);
        pages.push('...');
        pages.push(grnTotalPages);
      }
    }
    return pages;
  }, [grnCurrentPage, grnTotalPages]);

  // GRN Status helpers
  const getGrnStatusConfig = (status: string) => {
    switch (status) {
      case 'completed':
        return { label: 'Completed', icon: CheckCircle, color: theme === 'dark' ? 'text-emerald-400 bg-emerald-500/20' : 'text-emerald-600 bg-emerald-100' };
      case 'partial':
        return { label: 'Partial', icon: AlertCircle, color: theme === 'dark' ? 'text-amber-400 bg-amber-500/20' : 'text-amber-600 bg-amber-100' };
      case 'pending':
        return { label: 'Pending', icon: Clock, color: theme === 'dark' ? 'text-blue-400 bg-blue-500/20' : 'text-blue-600 bg-blue-100' };
      case 'cancelled':
        return { label: 'Cancelled', icon: XCircle, color: theme === 'dark' ? 'text-red-400 bg-red-500/20' : 'text-red-600 bg-red-100' };
      default:
        return { label: status, icon: ClipboardList, color: theme === 'dark' ? 'text-slate-400 bg-slate-500/20' : 'text-slate-600 bg-slate-100' };
    }
  };

  if (!supplier) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className={`max-w-5xl max-h-[90vh] overflow-hidden flex flex-col ${
        theme === 'dark' ? 'bg-slate-900 border-slate-700/50' : 'bg-white border-slate-200'
      }`}>
        <DialogHeader className="flex-shrink-0">
          <div className="flex items-center justify-between">
            <DialogTitle className={`text-xl font-semibold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
              Supplier Transaction History
            </DialogTitle>
            <button
              onClick={onClose}
              className={`p-2 rounded-lg transition-colors ${
                theme === 'dark' 
                  ? 'hover:bg-slate-800 text-slate-400 hover:text-white' 
                  : 'hover:bg-slate-100 text-slate-500 hover:text-slate-700'
              }`}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-6 py-4">
          {/* Supplier Info Card */}
          <div className={`relative overflow-hidden rounded-2xl border p-5 bg-gradient-to-br from-indigo-500/20 to-purple-500/10 ${
            theme === 'dark' ? 'border-slate-700/50' : 'border-slate-200'
          }`}>
            <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-br from-white/10 to-transparent rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
            
            <div className="relative flex flex-col lg:flex-row lg:items-start justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className={`p-3 rounded-xl ${theme === 'dark' ? 'bg-white/10' : 'bg-white/80'}`}>
                  <Building2 className="w-8 h-8 text-indigo-500" />
                </div>
                <div>
                  <h2 className={`text-xl font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                    {supplier.company}
                  </h2>
                  <p className={`text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                    {supplier.name} • {supplier.phone}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-6">
                {/* GRN Summary */}
                <div className="text-center">
                  <p className={`text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>Total GRNs</p>
                  <p className={`text-lg font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                    {grnStats.totalGRNs}
                  </p>
                </div>
                <div className="text-center">
                  <p className={`text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>Items Received</p>
                  <p className={`text-lg font-bold text-blue-500`}>
                    {grnStats.totalItems.toLocaleString()}
                  </p>
                </div>
                <div className="text-right">
                  <p className={`text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>Outstanding Balance</p>
                  <p className={`text-2xl font-bold ${supplier.creditBalance > 0 ? 'text-amber-500' : 'text-emerald-500'}`}>
                    {formatCurrency(supplier.creditBalance)}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className={`flex gap-2 p-1 rounded-xl ${theme === 'dark' ? 'bg-slate-800/50' : 'bg-slate-100'}`}>
            <button
              onClick={() => { setActiveTab('payments'); setSearchQuery(''); }}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
                activeTab === 'payments'
                  ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-lg'
                  : theme === 'dark' 
                    ? 'text-slate-400 hover:text-white hover:bg-slate-700/50' 
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white'
              }`}
            >
              <Wallet className="w-4 h-4" />
              Payment History
              <span className={`px-2 py-0.5 rounded-full text-xs ${
                activeTab === 'payments' 
                  ? 'bg-white/20' 
                  : theme === 'dark' ? 'bg-slate-700' : 'bg-slate-200'
              }`}>
                {stats.count}
              </span>
            </button>
            <button
              onClick={() => { setActiveTab('grn'); setSearchQuery(''); }}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
                activeTab === 'grn'
                  ? 'bg-gradient-to-r from-blue-500 to-indigo-500 text-white shadow-lg'
                  : theme === 'dark' 
                    ? 'text-slate-400 hover:text-white hover:bg-slate-700/50' 
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white'
              }`}
            >
              <Package className="w-4 h-4" />
              GRN History
              <span className={`px-2 py-0.5 rounded-full text-xs ${
                activeTab === 'grn' 
                  ? 'bg-white/20' 
                  : theme === 'dark' ? 'bg-slate-700' : 'bg-slate-200'
              }`}>
                {grnStats.totalGRNs}
              </span>
            </button>
          </div>

          {/* PAYMENTS TAB CONTENT */}
          {activeTab === 'payments' && (
            <>
              {/* Payment Summary Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className={`p-4 rounded-xl border ${theme === 'dark' ? 'bg-slate-800/30 border-slate-700/50' : 'bg-white border-slate-200'}`}>
                  <div className="flex items-center gap-2 mb-2">
                    <Wallet className="w-4 h-4 text-emerald-500" />
                    <span className={`text-xs font-medium ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>Total Paid</span>
                  </div>
                  <p className="text-lg font-bold text-emerald-500">{formatCurrency(stats.totalPaid)}</p>
                  <p className={`text-xs ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>{stats.count} payments</p>
                </div>
                <div className={`p-4 rounded-xl border ${theme === 'dark' ? 'bg-slate-800/30 border-slate-700/50' : 'bg-white border-slate-200'}`}>
                  <div className="flex items-center gap-2 mb-2">
                    <Banknote className="w-4 h-4 text-emerald-500" />
                    <span className={`text-xs font-medium ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>Cash</span>
                  </div>
                  <p className={`text-lg font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>{formatCurrency(stats.byMethod.cash)}</p>
                </div>
                <div className={`p-4 rounded-xl border ${theme === 'dark' ? 'bg-slate-800/30 border-slate-700/50' : 'bg-white border-slate-200'}`}>
                  <div className="flex items-center gap-2 mb-2">
                    <Landmark className="w-4 h-4 text-blue-500" />
                    <span className={`text-xs font-medium ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>Bank</span>
                  </div>
                  <p className={`text-lg font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>{formatCurrency(stats.byMethod.bank)}</p>
                </div>
                <div className={`p-4 rounded-xl border ${theme === 'dark' ? 'bg-slate-800/30 border-slate-700/50' : 'bg-white border-slate-200'}`}>
                  <div className="flex items-center gap-2 mb-2">
                    <CreditCard className="w-4 h-4 text-purple-500" />
                    <span className={`text-xs font-medium ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>Card/Cheque</span>
                  </div>
                  <p className={`text-lg font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>{formatCurrency(stats.byMethod.card + stats.byMethod.cheque)}</p>
                </div>
              </div>

              {/* Search and Filters */}
              <div className={`p-4 rounded-xl border ${theme === 'dark' ? 'bg-slate-800/30 border-slate-700/50' : 'bg-white border-slate-200'}`}>
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className={`flex items-center gap-2 px-3 py-2 rounded-xl border flex-1 ${
                    theme === 'dark' ? 'bg-slate-800/50 border-slate-700/50' : 'bg-slate-50 border-slate-200'
                  }`}>
                    <Search className={`w-4 h-4 ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`} />
                    <input
                      type="text"
                      placeholder="Search by product, note, or ID..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className={`bg-transparent border-none outline-none flex-1 text-sm ${
                        theme === 'dark' ? 'text-white placeholder-slate-500' : 'text-slate-900 placeholder-slate-400'
                      }`}
                    />
                  </div>
                  <SearchableSelect
                    options={paymentMethodOptions}
                    value={methodFilter}
                    onValueChange={setMethodFilter}
                    placeholder="Filter by method"
                    searchPlaceholder="Search method..."
                    emptyMessage="No methods found"
                    theme={theme}
                    className="w-full sm:w-48"
                  />
                </div>
              </div>

          {/* Payments Table */}
          <div className={`rounded-2xl border overflow-hidden ${theme === 'dark' ? 'border-slate-700/50' : 'border-slate-200'}`}>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className={theme === 'dark' ? 'bg-slate-800/50' : 'bg-slate-50'}>
                  <tr>
                    <th className={`px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>Date & Time</th>
                    <th className={`px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>Product</th>
                    <th className={`px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider hidden sm:table-cell ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>Method</th>
                    <th className={`px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>Amount</th>
                    <th className={`px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider hidden md:table-cell ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>Notes</th>
                  </tr>
                </thead>
                <tbody className={`divide-y ${theme === 'dark' ? 'divide-slate-700/50' : 'divide-slate-200'}`}>
                  {paginatedPayments.map((payment) => {
                    const MethodIcon = getPaymentMethodIcon(payment.paymentMethod);
                    const methodColor = getPaymentMethodColor(payment.paymentMethod, theme);
                    
                    return (
                      <tr key={payment.id} className={`transition-colors ${theme === 'dark' ? 'hover:bg-slate-800/30' : 'hover:bg-slate-50'}`}>
                        <td className="px-4 py-4">
                          <div>
                            <p className={`text-sm font-medium ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                              {formatDate(payment.paymentDate)}
                            </p>
                            <p className={`text-xs ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>
                              {new Date(payment.paymentDate).toLocaleTimeString('en-LK', { hour: '2-digit', minute: '2-digit' })}
                            </p>
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <div>
                            <p className={`text-sm font-medium ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                              {payment.productName}
                            </p>
                            <p className={`text-xs ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>
                              {payment.productCategory}
                            </p>
                          </div>
                        </td>
                        <td className="px-4 py-4 hidden sm:table-cell">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${methodColor}`}>
                            <MethodIcon className="w-3.5 h-3.5" />
                            {getPaymentMethodLabel(payment.paymentMethod)}
                          </span>
                        </td>
                        <td className="px-4 py-4 text-right">
                          <span className="text-lg font-bold text-emerald-500">
                            {formatCurrency(payment.amount)}
                          </span>
                        </td>
                        <td className={`px-4 py-4 hidden md:table-cell ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                          <p className="text-sm max-w-[200px] truncate" title={payment.notes || '-'}>
                            {payment.notes || '-'}
                          </p>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {paginatedPayments.length === 0 && (
              <div className={`p-12 text-center ${theme === 'dark' ? 'bg-slate-800/20' : 'bg-slate-50'}`}>
                <Receipt className={`w-12 h-12 mx-auto ${theme === 'dark' ? 'text-slate-600' : 'text-slate-300'}`} />
                <h3 className={`mt-4 text-lg font-semibold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>No payments found</h3>
                <p className={`mt-2 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                  {searchQuery || methodFilter !== 'all' ? 'Try adjusting your filters' : 'No payments recorded for this supplier yet'}
                </p>
              </div>
            )}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className={`p-4 rounded-2xl border ${theme === 'dark' ? 'bg-slate-800/30 border-slate-700/50' : 'bg-white border-slate-200'}`}>
              <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                <p className={`text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                  Showing <span className="font-medium">{startIndex + 1}</span> - <span className="font-medium">{Math.min(startIndex + itemsPerPage, filteredPayments.length)}</span> of <span className="font-medium">{filteredPayments.length}</span> payments
                </p>
                
                <div className="flex items-center gap-1">
                  <button 
                    onClick={() => setCurrentPage(1)} 
                    disabled={currentPage === 1} 
                    className={`p-2 rounded-lg ${currentPage === 1 ? 'text-slate-400' : theme === 'dark' ? 'hover:bg-slate-700 text-slate-300' : 'hover:bg-slate-100 text-slate-600'}`}
                  >
                    <ChevronsLeft className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))} 
                    disabled={currentPage === 1} 
                    className={`p-2 rounded-lg ${currentPage === 1 ? 'text-slate-400' : theme === 'dark' ? 'hover:bg-slate-700 text-slate-300' : 'hover:bg-slate-100 text-slate-600'}`}
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  {getPageNumbers.map((page, idx) => (
                    page === '...' ? (
                      <span key={`dots-${idx}`} className={`px-2 ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>...</span>
                    ) : (
                      <button 
                        key={page} 
                        onClick={() => setCurrentPage(page as number)} 
                        className={`w-9 h-9 rounded-lg text-sm font-medium ${currentPage === page ? 'bg-emerald-500 text-white' : theme === 'dark' ? 'hover:bg-slate-700 text-slate-300' : 'hover:bg-slate-100 text-slate-700'}`}
                      >
                        {page}
                      </button>
                    )
                  ))}
                  <button 
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} 
                    disabled={currentPage === totalPages} 
                    className={`p-2 rounded-lg ${currentPage === totalPages ? 'text-slate-400' : theme === 'dark' ? 'hover:bg-slate-700 text-slate-300' : 'hover:bg-slate-100 text-slate-600'}`}
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => setCurrentPage(totalPages)} 
                    disabled={currentPage === totalPages} 
                    className={`p-2 rounded-lg ${currentPage === totalPages ? 'text-slate-400' : theme === 'dark' ? 'hover:bg-slate-700 text-slate-300' : 'hover:bg-slate-100 text-slate-600'}`}
                  >
                    <ChevronsRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          )}
            </>
          )}

          {/* GRN TAB CONTENT */}
          {activeTab === 'grn' && (
            <>
              {/* GRN Summary Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className={`p-4 rounded-xl border ${theme === 'dark' ? 'bg-slate-800/30 border-slate-700/50' : 'bg-white border-slate-200'}`}>
                  <div className="flex items-center gap-2 mb-2">
                    <ClipboardList className="w-4 h-4 text-blue-500" />
                    <span className={`text-xs font-medium ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>Total GRNs</span>
                  </div>
                  <p className={`text-lg font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>{grnStats.totalGRNs}</p>
                </div>
                <div className={`p-4 rounded-xl border ${theme === 'dark' ? 'bg-slate-800/30 border-slate-700/50' : 'bg-white border-slate-200'}`}>
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingUp className="w-4 h-4 text-emerald-500" />
                    <span className={`text-xs font-medium ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>Total Value</span>
                  </div>
                  <p className="text-lg font-bold text-emerald-500">{formatCurrency(grnStats.totalValue)}</p>
                </div>
                <div className={`p-4 rounded-xl border ${theme === 'dark' ? 'bg-slate-800/30 border-slate-700/50' : 'bg-white border-slate-200'}`}>
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    <span className={`text-xs font-medium ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>Completed</span>
                  </div>
                  <p className={`text-lg font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>{grnStats.completed}</p>
                </div>
                <div className={`p-4 rounded-xl border ${theme === 'dark' ? 'bg-slate-800/30 border-slate-700/50' : 'bg-white border-slate-200'}`}>
                  <div className="flex items-center gap-2 mb-2">
                    <Clock className="w-4 h-4 text-amber-500" />
                    <span className={`text-xs font-medium ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>Pending</span>
                  </div>
                  <p className={`text-lg font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>{grnStats.pending}</p>
                </div>
              </div>

              {/* GRN Search and Filters */}
              <div className={`p-4 rounded-xl border ${theme === 'dark' ? 'bg-slate-800/30 border-slate-700/50' : 'bg-white border-slate-200'}`}>
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className={`flex items-center gap-2 px-3 py-2 rounded-xl border flex-1 ${
                    theme === 'dark' ? 'bg-slate-800/50 border-slate-700/50' : 'bg-slate-50 border-slate-200'
                  }`}>
                    <Search className={`w-4 h-4 ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`} />
                    <input
                      type="text"
                      placeholder="Search by GRN number or product..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className={`bg-transparent border-none outline-none flex-1 text-sm ${
                        theme === 'dark' ? 'text-white placeholder-slate-500' : 'text-slate-900 placeholder-slate-400'
                      }`}
                    />
                  </div>
                  <SearchableSelect
                    options={grnStatusOptions}
                    value={grnStatusFilter}
                    onValueChange={setGrnStatusFilter}
                    placeholder="Filter by status"
                    searchPlaceholder="Search status..."
                    emptyMessage="No status found"
                    theme={theme}
                    className="w-full sm:w-48"
                  />
                </div>
              </div>

              {/* GRN Cards Grid */}
              {isLoadingGRNs ? (
                <div className={`flex flex-col items-center justify-center py-12 rounded-xl border ${
                  theme === 'dark' ? 'bg-slate-800/30 border-slate-700/50' : 'bg-white border-slate-200'
                }`}>
                  <Loader2 className="w-8 h-8 text-emerald-500 animate-spin mb-3" />
                  <p className={theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}>Loading GRN history...</p>
                </div>
              ) : paginatedGRNs.length === 0 ? (
                <div className={`flex flex-col items-center justify-center py-12 rounded-xl border ${
                  theme === 'dark' ? 'bg-slate-800/30 border-slate-700/50' : 'bg-white border-slate-200'
                }`}>
                  <Package className="w-12 h-12 text-slate-400 mb-3" />
                  <p className={theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}>No GRNs found for this supplier</p>
                </div>
              ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {paginatedGRNs.map((grn) => {
                  const statusConfig = getGrnStatusConfig(grn.status);
                  const StatusIcon = statusConfig.icon;
                  
                  return (
                    <div 
                      key={grn.id}
                      className={`relative overflow-hidden rounded-2xl border p-5 transition-all hover:shadow-lg ${
                        theme === 'dark' 
                          ? 'bg-gradient-to-br from-slate-800/50 to-slate-900/50 border-slate-700/50 hover:border-slate-600' 
                          : 'bg-white border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      {/* Decorative gradient */}
                      <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-blue-500/10 to-purple-500/5 rounded-full blur-2xl" />
                      
                      <div className="relative">
                        {/* Header */}
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex items-center gap-3">
                            <div className={`p-2.5 rounded-xl ${theme === 'dark' ? 'bg-blue-500/20' : 'bg-blue-100'}`}>
                              <Truck className="w-5 h-5 text-blue-500" />
                            </div>
                            <div>
                              <h3 className={`font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                                {grn.grnNumber}
                              </h3>
                              <p className={`text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                                <Calendar className="w-3 h-3 inline mr-1" />
                                {formatDate(grn.receivedDate)}
                              </p>
                            </div>
                          </div>
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${statusConfig.color}`}>
                            <StatusIcon className="w-3.5 h-3.5" />
                            {statusConfig.label}
                          </span>
                        </div>

                        {/* Items Summary */}
                        <div className={`mb-4 p-3 rounded-xl ${theme === 'dark' ? 'bg-slate-800/50' : 'bg-slate-50'}`}>
                          <p className={`text-xs font-medium mb-2 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                            Items ({(grn.items || []).length || grn.totalOrderedQuantity || 0})
                          </p>
                          <div className="space-y-1">
                            {(grn.items || []).length > 0 ? (
                              <>
                                {(grn.items || []).slice(0, 2).map((item, idx) => (
                                  <div key={idx} className="flex items-center justify-between text-sm">
                                    <span className={`truncate flex-1 ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                                      {item.productName}
                                    </span>
                                    <span className={`ml-2 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                                      x{item.acceptedQuantity}
                                    </span>
                                  </div>
                                ))}
                                {(grn.items || []).length > 2 && (
                                  <p className={`text-xs ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>
                                    +{(grn.items || []).length - 2} more items
                                  </p>
                                )}
                              </>
                            ) : (
                              <div className="flex items-center justify-between text-sm">
                                <span className={theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}>
                                  Total Quantity: {grn.totalOrderedQuantity || 0}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Footer Stats */}
                        <div className="flex items-center justify-between pt-3 border-t border-dashed border-slate-700/30">
                          <div>
                            <p className={`text-xs ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>Total Qty</p>
                            <p className={`font-semibold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                              {grn.totalAcceptedQuantity.toLocaleString()}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className={`text-xs ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>Total Amount</p>
                            <p className="text-lg font-bold text-emerald-500">
                              {formatCurrency(grn.totalAmount)}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              )}

              {/* GRN Pagination */}
              {grnTotalPages > 1 && (
                <div className={`p-4 rounded-2xl border ${theme === 'dark' ? 'bg-slate-800/30 border-slate-700/50' : 'bg-white border-slate-200'}`}>
                  <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                    <p className={`text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                      Showing <span className="font-medium">{grnStartIndex + 1}</span> - <span className="font-medium">{Math.min(grnStartIndex + grnItemsPerPage, filteredGRNs.length)}</span> of <span className="font-medium">{filteredGRNs.length}</span> GRNs
                    </p>
                    
                    <div className="flex items-center gap-1">
                      <button 
                        onClick={() => setGrnCurrentPage(1)} 
                        disabled={grnCurrentPage === 1} 
                        className={`p-2 rounded-lg ${grnCurrentPage === 1 ? 'text-slate-400' : theme === 'dark' ? 'hover:bg-slate-700 text-slate-300' : 'hover:bg-slate-100 text-slate-600'}`}
                      >
                        <ChevronsLeft className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => setGrnCurrentPage(p => Math.max(1, p - 1))} 
                        disabled={grnCurrentPage === 1} 
                        className={`p-2 rounded-lg ${grnCurrentPage === 1 ? 'text-slate-400' : theme === 'dark' ? 'hover:bg-slate-700 text-slate-300' : 'hover:bg-slate-100 text-slate-600'}`}
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </button>
                      {getGrnPageNumbers.map((page, idx) => (
                        page === '...' ? (
                          <span key={`grn-dots-${idx}`} className={`px-2 ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>...</span>
                        ) : (
                          <button 
                            key={`grn-page-${page}`} 
                            onClick={() => setGrnCurrentPage(page as number)} 
                            className={`w-9 h-9 rounded-lg text-sm font-medium ${grnCurrentPage === page ? 'bg-blue-500 text-white' : theme === 'dark' ? 'hover:bg-slate-700 text-slate-300' : 'hover:bg-slate-100 text-slate-700'}`}
                          >
                            {page}
                          </button>
                        )
                      ))}
                      <button 
                        onClick={() => setGrnCurrentPage(p => Math.min(grnTotalPages, p + 1))} 
                        disabled={grnCurrentPage === grnTotalPages} 
                        className={`p-2 rounded-lg ${grnCurrentPage === grnTotalPages ? 'text-slate-400' : theme === 'dark' ? 'hover:bg-slate-700 text-slate-300' : 'hover:bg-slate-100 text-slate-600'}`}
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => setGrnCurrentPage(grnTotalPages)} 
                        disabled={grnCurrentPage === grnTotalPages} 
                        className={`p-2 rounded-lg ${grnCurrentPage === grnTotalPages ? 'text-slate-400' : theme === 'dark' ? 'hover:bg-slate-700 text-slate-300' : 'hover:bg-slate-100 text-slate-600'}`}
                      >
                        <ChevronsRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className={`flex-shrink-0 flex justify-end gap-3 pt-4 border-t ${
          theme === 'dark' ? 'border-slate-700/50' : 'border-slate-200'
        }`}>
          <button
            onClick={onClose}
            className={`px-4 py-2 rounded-xl transition-colors ${
              theme === 'dark' 
                ? 'bg-slate-800 text-slate-300 hover:bg-slate-700' 
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            Close
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
