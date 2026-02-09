import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import type { Supplier } from '../../data/mockData';
import * as grnService from '../../services/grnService';
import type { FrontendGRN } from '../../services/grnService';
import { 
  X, Building2, TrendingUp, ClipboardList, History,
  CheckCircle, AlertTriangle, Clock, XCircle, DollarSign,
  Calendar, Truck, ShoppingCart, CreditCard, Banknote,
  ChevronRight, ChevronDown, Loader2, Wallet, Receipt,
  ArrowUpRight, ArrowDownRight
} from 'lucide-react';

interface PaymentRecord {
  id: string;
  amount: number;
  paymentMethod: string;
  sentAt: string;
  message?: string;
  notes?: string;
}

interface SupplierDetailModalProps {
  isOpen: boolean;
  supplier: Supplier | null;
  purchases: any[];
  onClose: () => void;
  onMakePayment: (purchase: any) => void;
}

const paymentMethodConfigs = [
  { id: 'cash', label: 'Cash', icon: Banknote, color: 'text-emerald-500', bgColor: 'bg-emerald-500/10' },
  { id: 'bank', label: 'Bank Transfer', icon: Building2, color: 'text-blue-500', bgColor: 'bg-blue-500/10' },
  { id: 'card', label: 'Card', icon: CreditCard, color: 'text-purple-500', bgColor: 'bg-purple-500/10' },
  { id: 'credit', label: 'Credit', icon: Wallet, color: 'text-orange-500', bgColor: 'bg-orange-500/10' },
  { id: 'cheque', label: 'Cheque', icon: Receipt, color: 'text-cyan-500', bgColor: 'bg-cyan-500/10' },
];

const normalizePaymentMethod = (method: string): string => {
  const methodMap: Record<string, string> = {
    'CASH': 'cash',
    'BANK_TRANSFER': 'bank',
    'BANK': 'bank',
    'CARD': 'card',
    'CREDIT': 'credit',
    'CHEQUE': 'cheque',
  };
  return methodMap[method?.toUpperCase()] || method?.toLowerCase() || 'cash';
};

const getPaymentMethodConfig = (method: string) => {
  const normalizedMethod = normalizePaymentMethod(method);
  return paymentMethodConfigs.find(m => m.id === normalizedMethod) || paymentMethodConfigs[0];
};

export const SupplierDetailModal: React.FC<SupplierDetailModalProps> = ({
  isOpen,
  supplier,
  onClose,
  onMakePayment,
}) => {
  const { theme } = useTheme();
  const { user, isViewingShop, viewingShop, getAccessToken } = useAuth();
  const shopId = isViewingShop && viewingShop ? viewingShop.id : user?.shop?.id;
  
  const [activeTab, setActiveTab] = useState<'overview' | 'grn' | 'payments'>('overview');
  const [grns, setGRNs] = useState<FrontendGRN[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [expandedGRNs, setExpandedGRNs] = useState<Set<string>>(new Set());
  const [grnPayments, setGRNPayments] = useState<Record<string, PaymentRecord[]>>({});
  const [loadingPayments, setLoadingPayments] = useState<Record<string, boolean>>({});

  const loadGRNs = useCallback(async () => {
    if (!supplier || !isOpen) return;
    
    const supplierId = supplier.apiId || supplier.id;
    setIsLoading(true);
    
    try {
      const result = await grnService.getGRNs({ shopId, supplierId });
      if (result.success && result.data) {
        const sorted = result.data.sort((a, b) => 
          new Date(b.receivedDate || b.orderDate || '').getTime() - 
          new Date(a.receivedDate || a.orderDate || '').getTime()
        );
        setGRNs(sorted);
      } else {
        setGRNs([]);
      }
    } catch (error) {
      console.error('Error loading GRNs:', error);
      setGRNs([]);
    } finally {
      setIsLoading(false);
    }
  }, [supplier, isOpen, shopId]);

  const loadPaymentsForGRN = useCallback(async (grn: FrontendGRN) => {
    const grnId = grn.apiId || grn.id;
    if (grnPayments[grnId]) return; // Already loaded
    
    setLoadingPayments(prev => ({ ...prev, [grnId]: true }));
    
    try {
      const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api/v1';
      const token = getAccessToken();
      
      const response = await fetch(`${API_BASE_URL}/grns/${grnId}/payments${shopId ? `?shopId=${shopId}` : ''}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      
      if (response.ok) {
        const result = await response.json();
        if (result.success && result.data) {
          setGRNPayments(prev => ({ ...prev, [grnId]: result.data }));
        }
      }
    } catch (err) {
      console.error('Error loading payments for GRN:', err);
    } finally {
      setLoadingPayments(prev => ({ ...prev, [grnId]: false }));
    }
  }, [shopId, grnPayments]);

  const toggleGRNExpansion = useCallback((grn: FrontendGRN) => {
    const grnId = grn.apiId || grn.id;
    setExpandedGRNs(prev => {
      const newSet = new Set(prev);
      if (newSet.has(grnId)) {
        newSet.delete(grnId);
      } else {
        newSet.add(grnId);
        loadPaymentsForGRN(grn);
      }
      return newSet;
    });
  }, [loadPaymentsForGRN]);

  useEffect(() => {
    loadGRNs();
    setActiveTab('overview');
    setExpandedGRNs(new Set());
    setGRNPayments({});
  }, [loadGRNs]);

  const stats = useMemo(() => {
    const totalGRNs = grns.length;
    const totalValue = grns.reduce((sum, grn) => sum + (grn.totalAmount || 0), 0);
    const totalItems = grns.reduce((sum, grn) => sum + (grn.totalAcceptedQuantity || grn.totalOrderedQuantity || 0), 0);
    const totalPaid = grns.reduce((sum, grn) => sum + (grn.paidAmount || 0), 0);
    const totalPending = totalValue - totalPaid;
    
    const completed = grns.filter(g => g.status === 'completed').length;
    const pending = grns.filter(g => g.status === 'pending').length;
    const partial = grns.filter(g => g.status === 'partial').length;
    
    const paidGRNs = grns.filter(g => g.paymentStatus === 'paid').length;
    const unpaidGRNs = grns.filter(g => g.paymentStatus === 'unpaid').length;
    const partialPayment = grns.filter(g => g.paymentStatus === 'partial').length;
    
    const paymentPercentage = totalValue > 0 ? (totalPaid / totalValue) * 100 : 0;
    
    const lastOrder = grns.length > 0 
      ? grns.reduce((latest, grn) => {
          const grnDate = new Date(grn.receivedDate || grn.orderDate || '');
          return grnDate > latest ? grnDate : latest;
        }, new Date(0))
      : null;
    
    return { 
      totalGRNs, totalValue, totalItems, totalPaid, totalPending,
      completed, pending, partial, 
      paidGRNs, unpaidGRNs, partialPayment,
      paymentPercentage, lastOrder
    };
  }, [grns]);

  const formatCurrency = (amount: number) => `Rs. ${amount.toLocaleString('en-LK')}`;
  const formatDate = (date: string | Date | null) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('en-GB', { 
      day: '2-digit', month: 'short', year: 'numeric' 
    });
  };

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'completed': return { color: 'text-emerald-500', bg: 'bg-emerald-500/10', icon: CheckCircle, label: 'Completed' };
      case 'pending': return { color: 'text-amber-500', bg: 'bg-amber-500/10', icon: Clock, label: 'Pending' };
      case 'partial': return { color: 'text-orange-500', bg: 'bg-orange-500/10', icon: AlertTriangle, label: 'Partial' };
      case 'rejected': return { color: 'text-red-500', bg: 'bg-red-500/10', icon: XCircle, label: 'Rejected' };
      default: return { color: 'text-slate-500', bg: 'bg-slate-500/10', icon: Clock, label: status };
    }
  };

  const getPaymentStatusConfig = (status?: string) => {
    switch (status) {
      case 'paid': return { color: 'text-emerald-500', bg: 'bg-emerald-500/10', label: 'Paid' };
      case 'partial': return { color: 'text-amber-500', bg: 'bg-amber-500/10', label: 'Partial' };
      case 'unpaid': return { color: 'text-red-500', bg: 'bg-red-500/10', label: 'Unpaid' };
      default: return { color: 'text-slate-500', bg: 'bg-slate-500/10', label: status || 'Unknown' };
    }
  };

  if (!isOpen || !supplier) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      <div className={`relative w-full max-w-5xl max-h-[90vh] overflow-hidden rounded-3xl shadow-2xl animate-in zoom-in-95 duration-200 ${
        theme === 'dark' ? 'bg-slate-900' : 'bg-white'
      }`}>
        <div className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600" />
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4xIj48cGF0aCBkPSJNMzYgMzRoLTJ2LTRoMnY0em0wLTZ2LTRoLTJ2NGgyek0zNCAyNmgtMnYtNGgydjR6Ii8+PC9nPjwvZz48L3N2Zz4=')] opacity-30" />
          
          <div className="relative px-6 py-5">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center text-2xl font-bold text-white">
                  {supplier.company.charAt(0)}
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-white">{supplier.company}</h2>
                  <p className="text-white/80 text-sm">{supplier.name} - {supplier.phone}</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center text-white hover:bg-white/30 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
              <div className="p-3 rounded-xl bg-white/10 backdrop-blur">
                <div className="text-white/70 text-xs mb-1">Total GRNs</div>
                <div className="text-xl font-bold text-white flex items-center gap-2">
                  {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : stats.totalGRNs}
                  <ClipboardList className="w-4 h-4 text-white/50" />
                </div>
              </div>
              <div className="p-3 rounded-xl bg-white/10 backdrop-blur">
                <div className="text-white/70 text-xs mb-1">Total Value</div>
                <div className="text-xl font-bold text-white">
                  {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : formatCurrency(stats.totalValue)}
                </div>
              </div>
              <div className="p-3 rounded-xl bg-white/10 backdrop-blur">
                <div className="text-white/70 text-xs mb-1">Paid</div>
                <div className="text-xl font-bold text-emerald-300 flex items-center gap-1">
                  {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : formatCurrency(stats.totalPaid)}
                  <ArrowUpRight className="w-4 h-4" />
                </div>
              </div>
              <div className="p-3 rounded-xl bg-white/10 backdrop-blur">
                <div className="text-white/70 text-xs mb-1">Pending</div>
                <div className="text-xl font-bold text-amber-300 flex items-center gap-1">
                  {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : formatCurrency(stats.totalPending)}
                  <ArrowDownRight className="w-4 h-4" />
                </div>
              </div>
            </div>
          </div>

          <div className="relative px-6 pb-0 flex gap-1">
            {[
              { id: 'overview', label: 'Overview', icon: TrendingUp },
              { id: 'grn', label: `GRN History (${stats.totalGRNs})`, icon: ClipboardList },
              { id: 'payments', label: 'Payment Summary', icon: History },
            ].map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id as 'overview' | 'grn' | 'payments')}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-t-xl text-sm font-medium transition-all ${
                  activeTab === id
                    ? theme === 'dark' ? 'bg-slate-900 text-white shadow-lg' : 'bg-white text-indigo-600 shadow-lg'
                    : 'text-white/70 hover:text-white hover:bg-white/10'
                }`}
              >
                <Icon className="w-4 h-4" />
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(90vh-280px)]">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-16">
              <Loader2 className="w-10 h-10 animate-spin text-indigo-500 mb-4" />
              <p className={theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}>Loading supplier data...</p>
            </div>
          ) : (
            <>
              {activeTab === 'overview' && (
                <div className="space-y-6 animate-in fade-in duration-200">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className={`p-5 rounded-2xl ${theme === 'dark' ? 'bg-slate-800/50' : 'bg-slate-50'}`}>
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-r from-blue-500 to-cyan-500 flex items-center justify-center">
                          <ClipboardList className="w-5 h-5 text-white" />
                        </div>
                        <h3 className={`font-semibold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>GRN Status</h3>
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-center">
                        <div className={`p-3 rounded-xl ${theme === 'dark' ? 'bg-slate-700/50' : 'bg-white'}`}>
                          <div className="text-2xl font-bold text-emerald-500">{stats.completed}</div>
                          <div className={`text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>Completed</div>
                        </div>
                        <div className={`p-3 rounded-xl ${theme === 'dark' ? 'bg-slate-700/50' : 'bg-white'}`}>
                          <div className="text-2xl font-bold text-amber-500">{stats.pending}</div>
                          <div className={`text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>Pending</div>
                        </div>
                        <div className={`p-3 rounded-xl ${theme === 'dark' ? 'bg-slate-700/50' : 'bg-white'}`}>
                          <div className="text-2xl font-bold text-orange-500">{stats.partial}</div>
                          <div className={`text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>Partial</div>
                        </div>
                      </div>
                      <div className={`mt-4 pt-3 border-t ${theme === 'dark' ? 'border-slate-700' : 'border-slate-200'}`}>
                        <div className="flex justify-between items-center text-sm">
                          <span className={theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}>Total Items Received</span>
                          <span className={`font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>{stats.totalItems} units</span>
                        </div>
                      </div>
                    </div>

                    <div className={`p-5 rounded-2xl ${theme === 'dark' ? 'bg-slate-800/50' : 'bg-slate-50'}`}>
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 flex items-center justify-center">
                          <CreditCard className="w-5 h-5 text-white" />
                        </div>
                        <h3 className={`font-semibold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>Payment Status</h3>
                      </div>
                      <div className="space-y-3">
                        <div className="flex justify-between">
                          <span className={`text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>Payment Progress</span>
                          <span className={`font-bold ${
                            stats.paymentPercentage >= 80 ? 'text-emerald-500' : 
                            stats.paymentPercentage >= 50 ? 'text-amber-500' : 'text-red-500'
                          }`}>
                            {stats.paymentPercentage.toFixed(1)}%
                          </span>
                        </div>
                        <div className={`h-3 rounded-full overflow-hidden ${theme === 'dark' ? 'bg-slate-700' : 'bg-slate-200'}`}>
                          <div 
                            className={`h-full rounded-full transition-all bg-gradient-to-r ${
                              stats.paymentPercentage >= 80 ? 'from-emerald-500 to-teal-500' : 
                              stats.paymentPercentage >= 50 ? 'from-amber-500 to-orange-500' : 'from-red-500 to-rose-500'
                            }`}
                            style={{ width: `${Math.min(stats.paymentPercentage, 100)}%` }}
                          />
                        </div>
                        <div className="grid grid-cols-3 gap-2 text-center pt-2">
                          <div>
                            <div className="text-lg font-bold text-emerald-500">{stats.paidGRNs}</div>
                            <div className={`text-xs ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>Fully Paid</div>
                          </div>
                          <div>
                            <div className="text-lg font-bold text-amber-500">{stats.partialPayment}</div>
                            <div className={`text-xs ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>Partial</div>
                          </div>
                          <div>
                            <div className="text-lg font-bold text-red-500">{stats.unpaidGRNs}</div>
                            <div className={`text-xs ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>Unpaid</div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className={`p-5 rounded-2xl ${theme === 'dark' ? 'bg-slate-800/50' : 'bg-slate-50'}`}>
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-r from-violet-500 to-purple-500 flex items-center justify-center">
                          <Building2 className="w-5 h-5 text-white" />
                        </div>
                        <h3 className={`font-semibold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>Supplier Info</h3>
                      </div>
                      <div className="space-y-3 text-sm">
                        <div className="flex justify-between">
                          <span className={theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}>Contact</span>
                          <span className={`font-medium ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>{supplier.name}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className={theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}>Phone</span>
                          <span className={`font-medium ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>{supplier.phone}</span>
                        </div>
                        {supplier.email && (
                          <div className="flex justify-between">
                            <span className={theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}>Email</span>
                            <span className={`font-medium ${theme === 'dark' ? 'text-white' : 'text-slate-900'} truncate ml-2`}>{supplier.email}</span>
                          </div>
                        )}
                        <div className={`pt-3 border-t ${theme === 'dark' ? 'border-slate-700' : 'border-slate-200'}`}>
                          <div className="flex justify-between items-center">
                            <span className={theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}>Last Order</span>
                            <span className={`font-medium ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                              {stats.lastOrder ? formatDate(stats.lastOrder) : 'No orders'}
                            </span>
                          </div>
                        </div>
                        <div className="flex justify-between items-center pt-2">
                          <span className={theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}>Rating</span>
                          <div className="flex gap-0.5">
                            {[1, 2, 3, 4, 5].map(star => (
                              <span key={star} className={star <= (supplier.rating || 5) ? 'text-amber-400' : theme === 'dark' ? 'text-slate-600' : 'text-slate-300'}>
                                ★
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <h3 className={`font-semibold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                        Recent GRNs from {supplier.company}
                      </h3>
                      {grns.length > 4 && (
                        <button
                          onClick={() => setActiveTab('grn')}
                          className="text-sm text-indigo-500 hover:text-indigo-400 flex items-center gap-1"
                        >
                          View all <ChevronRight className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                    
                    {grns.length === 0 ? (
                      <div className={`text-center py-12 rounded-xl ${theme === 'dark' ? 'bg-slate-800/30' : 'bg-slate-50'}`}>
                        <ClipboardList className={`w-12 h-12 mx-auto mb-3 ${theme === 'dark' ? 'text-slate-600' : 'text-slate-400'}`} />
                        <p className={theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}>No GRN records found for this supplier</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {grns.slice(0, 4).map(grn => {
                          const statusConfig = getStatusConfig(grn.status);
                          const paymentConfig = getPaymentStatusConfig(grn.paymentStatus);
                          const StatusIcon = statusConfig.icon;
                          
                          return (
                            <div 
                              key={grn.id}
                              className={`p-4 rounded-xl border transition-all hover:shadow-lg ${
                                theme === 'dark' ? 'bg-slate-800/50 border-slate-700 hover:border-slate-600' : 'bg-white border-slate-200 hover:border-slate-300'
                              }`}
                            >
                              <div className="flex justify-between items-start mb-3">
                                <div>
                                  <h4 className={`font-medium flex items-center gap-2 ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                                    <Truck className="w-4 h-4 text-indigo-500" />
                                    {grn.grnNumber}
                                  </h4>
                                  <p className={`text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                                    <Calendar className="w-3 h-3 inline mr-1" />
                                    {formatDate(grn.receivedDate || grn.orderDate)}
                                  </p>
                                </div>
                                <div className="flex gap-2">
                                  <span className={`px-2 py-1 rounded-lg text-xs font-medium flex items-center gap-1 ${statusConfig.bg} ${statusConfig.color}`}>
                                    <StatusIcon className="w-3 h-3" />
                                    {statusConfig.label}
                                  </span>
                                </div>
                              </div>
                              
                              <div className="flex justify-between items-center text-sm">
                                <span className={theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}>
                                  {grn.totalAcceptedQuantity || grn.totalOrderedQuantity || 0} items
                                </span>
                                <span className={`font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                                  {formatCurrency(grn.totalAmount || 0)}
                                </span>
                              </div>
                              
                              <div className="flex justify-between items-center mt-2 text-xs">
                                <span className={`px-2 py-0.5 rounded ${paymentConfig.bg} ${paymentConfig.color}`}>
                                  {paymentConfig.label}
                                </span>
                                <span className={theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}>
                                  Paid: {formatCurrency(grn.paidAmount || 0)}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {activeTab === 'grn' && (
                <div className="space-y-4 animate-in fade-in duration-200">
                  {grns.length === 0 ? (
                    <div className={`text-center py-16 rounded-xl ${theme === 'dark' ? 'bg-slate-800/30' : 'bg-slate-50'}`}>
                      <ClipboardList className={`w-16 h-16 mx-auto mb-4 ${theme === 'dark' ? 'text-slate-600' : 'text-slate-400'}`} />
                      <h3 className={`text-lg font-medium mb-2 ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>No GRN History</h3>
                      <p className={theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}>No GRN records found for this supplier</p>
                    </div>
                  ) : (
                    <div className={`rounded-xl border overflow-hidden ${theme === 'dark' ? 'border-slate-700' : 'border-slate-200'}`}>
                      <table className="w-full">
                        <thead className={theme === 'dark' ? 'bg-slate-800/50' : 'bg-slate-50'}>
                          <tr>
                            <th className={`px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>GRN #</th>
                            <th className={`px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>Date</th>
                            <th className={`px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>Items</th>
                            <th className={`px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>Total</th>
                            <th className={`px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>Paid</th>
                            <th className={`px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>Status</th>
                            <th className={`px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>Payment</th>
                            <th className={`px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>Actions</th>
                          </tr>
                        </thead>
                        <tbody className={`divide-y ${theme === 'dark' ? 'divide-slate-700' : 'divide-slate-200'}`}>
                          {grns.map(grn => {
                            const statusConfig = getStatusConfig(grn.status);
                            const paymentConfig = getPaymentStatusConfig(grn.paymentStatus);
                            const StatusIcon = statusConfig.icon;
                            
                            return (
                              <tr 
                                key={grn.id} 
                                className={`transition-colors ${theme === 'dark' ? 'hover:bg-slate-800/50' : 'hover:bg-slate-50'}`}
                              >
                                <td className={`px-4 py-3 font-medium ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                                  {grn.grnNumber}
                                </td>
                                <td className={`px-4 py-3 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                                  {formatDate(grn.receivedDate || grn.orderDate)}
                                </td>
                                <td className={`px-4 py-3 text-center ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                                  {grn.totalAcceptedQuantity || grn.totalOrderedQuantity || 0}
                                </td>
                                <td className={`px-4 py-3 text-right font-semibold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                                  {formatCurrency(grn.totalAmount || 0)}
                                </td>
                                <td className={`px-4 py-3 text-right ${theme === 'dark' ? 'text-emerald-400' : 'text-emerald-600'}`}>
                                  {formatCurrency(grn.paidAmount || 0)}
                                </td>
                                <td className="px-4 py-3 text-center">
                                  <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium ${statusConfig.bg} ${statusConfig.color}`}>
                                    <StatusIcon className="w-3 h-3" />
                                    {statusConfig.label}
                                  </span>
                                </td>
                                <td className="px-4 py-3 text-center">
                                  <span className={`px-2 py-1 rounded-lg text-xs font-medium ${paymentConfig.bg} ${paymentConfig.color}`}>
                                    {paymentConfig.label}
                                  </span>
                                </td>
                                <td className="px-4 py-3 text-center">
                                  {grn.paymentStatus !== 'paid' && (grn.paidAmount || 0) < (grn.totalAmount || 0) ? (
                                    <button
                                      onClick={() => onMakePayment(grn)}
                                      className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium transition-colors ${
                                        theme === 'dark' 
                                          ? 'bg-blue-500/20 hover:bg-blue-500/30 text-blue-400' 
                                          : 'bg-blue-100 hover:bg-blue-200 text-blue-700'
                                      }`}
                                    >
                                      <DollarSign className="w-3 h-3" />
                                      Pay
                                    </button>
                                  ) : (
                                    <span className={`text-xs ${theme === 'dark' ? 'text-emerald-400' : 'text-emerald-600'}`}>
                                      ✓ Paid
                                    </span>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'payments' && (
                <div className="space-y-6 animate-in fade-in duration-200">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className={`p-5 rounded-2xl ${theme === 'dark' ? 'bg-gradient-to-br from-emerald-500/20 to-teal-500/20 border border-emerald-500/30' : 'bg-emerald-50 border border-emerald-200'}`}>
                      <div className="flex items-center gap-3 mb-2">
                        <Banknote className={theme === 'dark' ? 'text-emerald-400' : 'text-emerald-600'} />
                        <span className={`text-sm ${theme === 'dark' ? 'text-emerald-300' : 'text-emerald-700'}`}>Total Paid</span>
                      </div>
                      <div className={`text-2xl font-bold ${theme === 'dark' ? 'text-emerald-400' : 'text-emerald-600'}`}>
                        {formatCurrency(stats.totalPaid)}
                      </div>
                    </div>
                    
                    <div className={`p-5 rounded-2xl ${theme === 'dark' ? 'bg-gradient-to-br from-amber-500/20 to-orange-500/20 border border-amber-500/30' : 'bg-amber-50 border border-amber-200'}`}>
                      <div className="flex items-center gap-3 mb-2">
                        <DollarSign className={theme === 'dark' ? 'text-amber-400' : 'text-amber-600'} />
                        <span className={`text-sm ${theme === 'dark' ? 'text-amber-300' : 'text-amber-700'}`}>Pending</span>
                      </div>
                      <div className={`text-2xl font-bold ${theme === 'dark' ? 'text-amber-400' : 'text-amber-600'}`}>
                        {formatCurrency(stats.totalPending)}
                      </div>
                    </div>
                    
                    <div className={`p-5 rounded-2xl ${theme === 'dark' ? 'bg-gradient-to-br from-blue-500/20 to-cyan-500/20 border border-blue-500/30' : 'bg-blue-50 border border-blue-200'}`}>
                      <div className="flex items-center gap-3 mb-2">
                        <ShoppingCart className={theme === 'dark' ? 'text-blue-400' : 'text-blue-600'} />
                        <span className={`text-sm ${theme === 'dark' ? 'text-blue-300' : 'text-blue-700'}`}>Total Orders</span>
                      </div>
                      <div className={`text-2xl font-bold ${theme === 'dark' ? 'text-blue-400' : 'text-blue-600'}`}>
                        {stats.totalGRNs}
                      </div>
                    </div>
                    
                    <div className={`p-5 rounded-2xl ${theme === 'dark' ? 'bg-gradient-to-br from-violet-500/20 to-purple-500/20 border border-violet-500/30' : 'bg-violet-50 border border-violet-200'}`}>
                      <div className="flex items-center gap-3 mb-2">
                        <TrendingUp className={theme === 'dark' ? 'text-violet-400' : 'text-violet-600'} />
                        <span className={`text-sm ${theme === 'dark' ? 'text-violet-300' : 'text-violet-700'}`}>Payment %</span>
                      </div>
                      <div className={`text-2xl font-bold ${theme === 'dark' ? 'text-violet-400' : 'text-violet-600'}`}>
                        {stats.paymentPercentage.toFixed(1)}%
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className={`font-semibold mb-4 ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                      Payment Status by GRN
                    </h3>
                    
                    {grns.length === 0 ? (
                      <div className={`text-center py-12 rounded-xl ${theme === 'dark' ? 'bg-slate-800/30' : 'bg-slate-50'}`}>
                        <History className={`w-12 h-12 mx-auto mb-3 ${theme === 'dark' ? 'text-slate-600' : 'text-slate-400'}`} />
                        <p className={theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}>No payment records available</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {grns.map(grn => {
                          const total = grn.totalAmount || 0;
                          const paid = grn.paidAmount || 0;
                          const pending = total - paid;
                          const percentage = total > 0 ? (paid / total) * 100 : 0;
                          const paymentConfig = getPaymentStatusConfig(grn.paymentStatus);
                          const grnId = grn.apiId || grn.id;
                          const isExpanded = expandedGRNs.has(grnId);
                          const payments = grnPayments[grnId] || [];
                          const isLoadingPayment = loadingPayments[grnId];
                          
                          return (
                            <div 
                              key={grn.id}
                              className={`rounded-xl border overflow-hidden ${theme === 'dark' ? 'bg-slate-800/30 border-slate-700' : 'bg-white border-slate-200'}`}
                            >
                              {/* Clickable Header */}
                              <button
                                onClick={() => toggleGRNExpansion(grn)}
                                className={`w-full p-4 text-left transition-colors ${
                                  theme === 'dark' ? 'hover:bg-slate-700/30' : 'hover:bg-slate-50'
                                }`}
                              >
                                <div className="flex items-center justify-between mb-3">
                                  <div className="flex items-center gap-3">
                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${paymentConfig.bg}`}>
                                      <ClipboardList className={`w-5 h-5 ${paymentConfig.color}`} />
                                    </div>
                                    <div>
                                      <h4 className={`font-medium ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>{grn.grnNumber}</h4>
                                      <p className={`text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                                        {formatDate(grn.receivedDate || grn.orderDate)}
                                      </p>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <span className={`px-3 py-1 rounded-lg text-sm font-medium ${paymentConfig.bg} ${paymentConfig.color}`}>
                                      {paymentConfig.label}
                                    </span>
                                    <ChevronDown className={`w-5 h-5 transition-transform ${
                                      isExpanded ? 'rotate-180' : ''
                                    } ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`} />
                                  </div>
                                </div>
                                
                                <div className="grid grid-cols-3 gap-4 text-sm mb-3">
                                  <div>
                                    <span className={theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}>Total</span>
                                    <p className={`font-semibold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>{formatCurrency(total)}</p>
                                  </div>
                                  <div>
                                    <span className={theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}>Paid</span>
                                    <p className="font-semibold text-emerald-500">{formatCurrency(paid)}</p>
                                  </div>
                                  <div>
                                    <span className={theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}>Pending</span>
                                    <p className="font-semibold text-amber-500">{formatCurrency(pending)}</p>
                                  </div>
                                </div>
                                
                                <div className={`h-2 rounded-full overflow-hidden ${theme === 'dark' ? 'bg-slate-700' : 'bg-slate-200'}`}>
                                  <div 
                                    className={`h-full rounded-full transition-all bg-gradient-to-r ${
                                      percentage >= 100 ? 'from-emerald-500 to-teal-500' : 
                                      percentage >= 50 ? 'from-amber-500 to-orange-500' : 'from-red-500 to-rose-500'
                                    }`}
                                    style={{ width: `${Math.min(percentage, 100)}%` }}
                                  />
                                </div>
                                <p className={`text-xs mt-1 text-right ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>
                                  {percentage.toFixed(1)}% paid
                                </p>
                              </button>

                              {/* Expandable Payment History */}
                              {isExpanded && (
                                <div className={`border-t px-4 py-3 ${theme === 'dark' ? 'border-slate-700 bg-slate-800/50' : 'border-slate-200 bg-slate-50'}`}>
                                  <h5 className={`text-sm font-medium mb-3 flex items-center gap-2 ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                                    <History className="w-4 h-4" />
                                    Payment History
                                  </h5>
                                  
                                  {isLoadingPayment ? (
                                    <div className="flex items-center justify-center py-4">
                                      <Loader2 className={`w-5 h-5 animate-spin ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`} />
                                    </div>
                                  ) : payments.length === 0 ? (
                                    <p className={`text-sm text-center py-4 ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>
                                      No payments recorded yet
                                    </p>
                                  ) : (
                                    <div className="space-y-2">
                                      {payments.map((payment, idx) => {
                                        const methodConfig = getPaymentMethodConfig(payment.paymentMethod);
                                        const MethodIcon = methodConfig.icon;
                                        return (
                                          <div 
                                            key={payment.id || idx}
                                            className={`flex items-center justify-between p-3 rounded-lg ${
                                              theme === 'dark' ? 'bg-slate-700/50' : 'bg-white border border-slate-200'
                                            }`}
                                          >
                                            <div className="flex items-center gap-3">
                                              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${methodConfig.bgColor}`}>
                                                <MethodIcon className={`w-4 h-4 ${methodConfig.color}`} />
                                              </div>
                                              <div>
                                                <p className={`text-sm font-medium ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                                                  {formatCurrency(payment.amount)}
                                                </p>
                                                <p className={`text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                                                  {methodConfig.label} • {formatDate(payment.sentAt)}
                                                </p>
                                              </div>
                                            </div>
                                            {payment.notes && (
                                              <p className={`text-xs max-w-[150px] truncate ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>
                                                {payment.notes}
                                              </p>
                                            )}
                                          </div>
                                        );
                                      })}
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        <div className={`px-6 py-4 border-t flex justify-end ${theme === 'dark' ? 'border-slate-700 bg-slate-800/50' : 'border-slate-200 bg-slate-50'}`}>
          <button
            onClick={onClose}
            className={`px-6 py-2.5 rounded-xl font-medium transition-colors ${
              theme === 'dark' 
                ? 'bg-slate-700 text-white hover:bg-slate-600' 
                : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
            }`}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
