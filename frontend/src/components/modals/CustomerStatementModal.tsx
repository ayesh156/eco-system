import React, { useState, useMemo } from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { 
  X, FileText, CreditCard, CheckCircle, AlertTriangle, Clock, 
  MessageCircle, Zap, Check, ChevronDown, ChevronUp, Receipt,
  Banknote, Building2, Wallet, History, Loader2, ChevronLeft, ChevronRight
} from 'lucide-react';
import type { Customer, Invoice } from '../../data/mockData';

type PaymentMethod = 'cash' | 'bank' | 'card' | 'cheque';

interface CustomerStatementModalProps {
  isOpen: boolean;
  customer: Customer | null;
  invoices: Invoice[];
  isLoading?: boolean;
  onClose: () => void;
  onMarkAsPaid: (invoiceId: string, amount: number, paymentMethod: PaymentMethod, notes?: string) => void | Promise<void>;
  onSendReminder: (invoice: Invoice, type: 'friendly' | 'urgent') => void;
}

// Creative Loading Animation Component
const StatementLoadingAnimation: React.FC<{ theme: string }> = ({ theme }) => {
  return (
    <div className="py-16 px-8">
      {/* Animated Logo/Icon */}
      <div className="flex flex-col items-center justify-center">
        {/* Pulsing Circle with Invoice Icon */}
        <div className="relative">
          {/* Outer rotating ring */}
          <div className="absolute inset-0 w-24 h-24 rounded-full border-4 border-transparent border-t-emerald-500 border-r-teal-400 animate-spin" />
          
          {/* Middle pulsing ring */}
          <div className="absolute inset-2 w-20 h-20 rounded-full bg-gradient-to-br from-emerald-500/20 to-teal-500/20 animate-pulse" />
          
          {/* Inner circle with icon */}
          <div className={`relative w-24 h-24 rounded-full flex items-center justify-center ${
            theme === 'dark' ? 'bg-slate-800' : 'bg-slate-100'
          }`}>
            <Receipt className={`w-10 h-10 ${theme === 'dark' ? 'text-emerald-400' : 'text-emerald-600'} animate-bounce`} 
              style={{ animationDuration: '1.5s' }} 
            />
          </div>
        </div>

        {/* Loading Text */}
        <div className="mt-8 text-center">
          <h3 className={`text-lg font-semibold mb-2 ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
            Loading Statement
          </h3>
          <p className={`text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
            Fetching invoice data...
          </p>
        </div>

        {/* Animated Progress Dots */}
        <div className="flex items-center gap-2 mt-6">
          {[0, 1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="w-2 h-2 rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 animate-pulse"
              style={{ 
                animationDelay: `${i * 0.15}s`,
                animationDuration: '1s'
              }}
            />
          ))}
        </div>

        {/* Skeleton Preview */}
        <div className={`w-full max-w-md mt-8 space-y-3 ${theme === 'dark' ? 'opacity-30' : 'opacity-20'}`}>
          {[1, 2, 3].map((i) => (
            <div 
              key={i}
              className={`h-16 rounded-xl animate-pulse ${
                theme === 'dark' ? 'bg-slate-700' : 'bg-slate-300'
              }`}
              style={{ animationDelay: `${i * 0.2}s` }}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export const CustomerStatementModal: React.FC<CustomerStatementModalProps> = ({
  isOpen,
  customer,
  invoices,
  isLoading = false,
  onClose,
  onMarkAsPaid,
  onSendReminder
}) => {
  const { theme } = useTheme();
  const [expandedInvoice, setExpandedInvoice] = useState<string | null>(null);
  const [paymentAmounts, setPaymentAmounts] = useState<Record<string, string>>({});
  const [paymentMethods, setPaymentMethods] = useState<Record<string, PaymentMethod>>({});
  const [paymentNotes, setPaymentNotes] = useState<Record<string, string>>({});
  const [selectedInvoices, setSelectedInvoices] = useState<Set<string>>(new Set());
  const [showHistoryFor, setShowHistoryFor] = useState<string | null>(null);
  const [processingPayment, setProcessingPayment] = useState<string | null>(null); // Track which invoice is processing
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  // Payment method options
  const paymentMethodOptions: { value: PaymentMethod; label: string; icon: React.ReactNode }[] = [
    { value: 'cash', label: 'Cash', icon: <Banknote className="w-4 h-4" /> },
    { value: 'bank', label: 'Bank', icon: <Building2 className="w-4 h-4" /> },
    { value: 'card', label: 'Card', icon: <CreditCard className="w-4 h-4" /> },
    { value: 'cheque', label: 'Cheque', icon: <Wallet className="w-4 h-4" /> },
  ];

  // Unified payment history type for display
  interface PaymentHistoryEntry {
    id: string;
    amount: number;
    paymentDate: string;
    paymentMethod: 'cash' | 'card' | 'bank' | 'cheque' | 'bank_transfer';
    notes?: string;
    source: 'invoice' | 'bulk' | 'direct'; // Where payment came from
  }

  // Get payment history for an invoice - combines invoice.payments and customer.paymentHistory
  const getPaymentHistory = (invoiceId: string): PaymentHistoryEntry[] => {
    const invoice = invoices.find(inv => inv.id === invoiceId);
    const entries: PaymentHistoryEntry[] = [];
    
    // Get payments from invoice.payments array (API data)
    if (invoice?.payments && invoice.payments.length > 0) {
      invoice.payments.forEach(p => {
        const method = p.paymentMethod as string;
        entries.push({
          id: p.id,
          amount: p.amount,
          paymentDate: p.paymentDate,
          paymentMethod: method === 'bank_transfer' ? 'bank' : method as PaymentHistoryEntry['paymentMethod'],
          notes: p.notes,
          source: p.notes?.includes('Bulk payment') ? 'bulk' : 'direct'
        });
      });
    }
    
    // Also check customer.paymentHistory for any payments applied to this invoice
    if (customer?.paymentHistory) {
      customer.paymentHistory.forEach(p => {
        if (p.invoiceId === invoiceId || p.appliedToInvoices?.some(a => a.invoiceId === invoiceId)) {
          // Check if this payment is already in entries (avoid duplicates)
          const existingEntry = entries.find(e => e.id === p.id);
          if (!existingEntry) {
            const appliedAmount = p.appliedToInvoices?.find(a => a.invoiceId === invoiceId)?.amount || p.amount;
            const method = p.paymentMethod as string;
            entries.push({
              id: p.id,
              amount: appliedAmount,
              paymentDate: p.paymentDate,
              paymentMethod: method === 'bank_transfer' ? 'bank' : method as PaymentHistoryEntry['paymentMethod'],
              notes: p.notes,
              source: p.source === 'customer' ? 'bulk' : 'direct'
            });
          }
        }
      });
    }
    
    // Sort by date descending (newest first)
    return entries.sort((a, b) => new Date(b.paymentDate).getTime() - new Date(a.paymentDate).getTime());
  };

  // Filter invoices for this customer that have outstanding balance
  const customerInvoices = useMemo(() => {
    if (!customer) return [];
    return invoices
      .filter(inv => inv.customerId === customer.id)
      .sort((a, b) => {
        // Sort by status priority (unpaid first, then halfpay, then fullpaid)
        const statusOrder = { unpaid: 0, halfpay: 1, fullpaid: 2 };
        const statusDiff = statusOrder[a.status] - statusOrder[b.status];
        if (statusDiff !== 0) return statusDiff;
        // Then by due date
        return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
      });
  }, [customer, invoices]);

  // Pagination calculations
  const totalPages = Math.ceil(customerInvoices.length / itemsPerPage);
  const paginatedInvoices = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return customerInvoices.slice(startIndex, endIndex);
  }, [customerInvoices, currentPage, itemsPerPage]);

  // Reset to page 1 when invoices change
  useMemo(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(1);
    }
  }, [customerInvoices.length]);

  // Calculate totals
  const totals = useMemo(() => {
    const unpaidInvoices = customerInvoices.filter(inv => inv.status !== 'fullpaid');
    const totalOutstanding = unpaidInvoices.reduce((sum, inv) => sum + (inv.total - (inv.paidAmount || 0)), 0);
    const overdueAmount = unpaidInvoices
      .filter(inv => new Date(inv.dueDate) < new Date())
      .reduce((sum, inv) => sum + (inv.total - (inv.paidAmount || 0)), 0);
    return { 
      totalOutstanding, 
      overdueAmount, 
      unpaidCount: unpaidInvoices.length,
      overdueCount: unpaidInvoices.filter(inv => new Date(inv.dueDate) < new Date()).length
    };
  }, [customerInvoices]);

  const formatCurrency = (amount: number) => `Rs. ${amount.toLocaleString('en-LK')}`;

  const getStatusStyle = (status: string, dueDate: string) => {
    const isOverdue = new Date(dueDate) < new Date() && status !== 'fullpaid';
    if (status === 'fullpaid') {
      return theme === 'dark' 
        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
        : 'bg-emerald-50 text-emerald-600 border-emerald-200';
    }
    if (isOverdue) {
      return theme === 'dark' 
        ? 'bg-red-500/10 text-red-400 border-red-500/20' 
        : 'bg-red-50 text-red-600 border-red-200';
    }
    if (status === 'halfpay') {
      return theme === 'dark' 
        ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' 
        : 'bg-amber-50 text-amber-600 border-amber-200';
    }
    return theme === 'dark' 
      ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' 
      : 'bg-blue-50 text-blue-600 border-blue-200';
  };

  const getStatusIcon = (status: string, dueDate: string) => {
    const isOverdue = new Date(dueDate) < new Date() && status !== 'fullpaid';
    if (status === 'fullpaid') return <CheckCircle className="w-4 h-4" />;
    if (isOverdue) return <AlertTriangle className="w-4 h-4" />;
    if (status === 'halfpay') return <Clock className="w-4 h-4" />;
    return <Receipt className="w-4 h-4" />;
  };

  const getStatusLabel = (status: string, dueDate: string) => {
    const isOverdue = new Date(dueDate) < new Date() && status !== 'fullpaid';
    if (status === 'fullpaid') return 'Paid';
    if (isOverdue) return 'Overdue';
    if (status === 'halfpay') return 'Partial';
    return 'Unpaid';
  };

  const handlePaymentSubmit = async (invoiceId: string, maxAmount: number) => {
    const amount = parseFloat(paymentAmounts[invoiceId] || '0');
    const method = paymentMethods[invoiceId] || 'cash';
    const notes = paymentNotes[invoiceId] || '';
    if (amount > 0 && amount <= maxAmount) {
      setProcessingPayment(invoiceId);
      try {
        await onMarkAsPaid(invoiceId, amount, method, notes);
        setPaymentAmounts(prev => ({ ...prev, [invoiceId]: '' }));
        setPaymentNotes(prev => ({ ...prev, [invoiceId]: '' }));
      } finally {
        setProcessingPayment(null);
      }
    }
  };

  const handleMarkFullPaid = async (invoiceId: string, amount: number) => {
    const method = paymentMethods[invoiceId] || 'cash';
    setProcessingPayment(invoiceId);
    try {
      await onMarkAsPaid(invoiceId, amount, method);
    } finally {
      setProcessingPayment(null);
    }
  };

  const toggleInvoiceSelection = (invoiceId: string) => {
    setSelectedInvoices(prev => {
      const newSet = new Set(prev);
      if (newSet.has(invoiceId)) {
        newSet.delete(invoiceId);
      } else {
        newSet.add(invoiceId);
      }
      return newSet;
    });
  };

  const sendBulkReminder = (type: 'friendly' | 'urgent') => {
    const selectedUnpaid = customerInvoices.filter(
      inv => selectedInvoices.has(inv.id) && inv.status !== 'fullpaid'
    );
    if (selectedUnpaid.length > 0) {
      // Send reminder for the first selected invoice (can be extended for bulk)
      onSendReminder(selectedUnpaid[0], type);
    }
  };

  if (!isOpen || !customer) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className={`relative w-full max-w-4xl max-h-[95vh] sm:max-h-[90vh] overflow-y-auto rounded-t-2xl sm:rounded-2xl shadow-2xl ${
        theme === 'dark' ? 'bg-slate-900' : 'bg-white'
      }`}>
        {/* Creative Gradient Header */}
        <div className={`relative overflow-hidden ${
          totals.overdueCount > 0
            ? 'bg-gradient-to-br from-red-600 via-rose-500 to-orange-500'
            : 'bg-gradient-to-br from-emerald-600 via-teal-500 to-teal-600'
        }`}>
          <div className="absolute inset-0 overflow-hidden">
            <div className="absolute -top-6 -right-6 w-24 h-24 bg-white/10 rounded-full blur-2xl" />
            <div className="absolute -bottom-4 -left-4 w-20 h-20 bg-white/10 rounded-full blur-xl" />
          </div>
          <div className="relative p-3 sm:p-5">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center text-white font-bold text-base sm:text-lg flex-shrink-0">
                  {customer.name.charAt(0)}
                </div>
                <div className="min-w-0">
                  <h2 className="text-base sm:text-lg font-bold text-white truncate">
                    {customer.name}
                  </h2>
                  <p className="text-[11px] sm:text-xs text-white/70 truncate">
                    {customer.phone}{customer.email ? ` • ${customer.email}` : ''}
                  </p>
                </div>
              </div>
              <button onClick={onClose} className="p-1.5 rounded-lg bg-white/15 hover:bg-white/25 text-white transition-colors flex-shrink-0">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Summary Row */}
            <div className="grid grid-cols-4 gap-1.5 sm:gap-2">
              <div className="bg-white/15 backdrop-blur rounded-lg p-1.5 sm:p-2.5 text-center">
                <p className="text-[10px] sm:text-xs text-white/70">Outstanding</p>
                <p className="text-xs sm:text-base font-bold text-white truncate">{formatCurrency(totals.totalOutstanding)}</p>
              </div>
              <div className="bg-white/15 backdrop-blur rounded-lg p-1.5 sm:p-2.5 text-center">
                <p className="text-[10px] sm:text-xs text-white/70">Overdue</p>
                <p className="text-xs sm:text-base font-bold text-white truncate">{formatCurrency(totals.overdueAmount)}</p>
              </div>
              <div className="bg-white/15 backdrop-blur rounded-lg p-1.5 sm:p-2.5 text-center">
                <p className="text-[10px] sm:text-xs text-white/70">Unpaid</p>
                <p className="text-xs sm:text-base font-bold text-white">{totals.unpaidCount}</p>
              </div>
              <div className="bg-white/15 backdrop-blur rounded-lg p-1.5 sm:p-2.5 text-center">
                <p className="text-[10px] sm:text-xs text-white/70">Overdue</p>
                <p className="text-xs sm:text-base font-bold text-white">{totals.overdueCount}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-2.5 sm:p-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-3 mb-3 sm:mb-4">
            <h3 className={`text-sm sm:text-lg font-semibold flex items-center gap-1.5 ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
              <FileText className="w-4 h-4 sm:w-5 sm:h-5" />
              Invoice Statement
            </h3>
            {selectedInvoices.size > 0 && (
              <div className="flex items-center gap-2">
                <span className={`text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                  {selectedInvoices.size} selected
                </span>
                <button
                  onClick={() => sendBulkReminder('friendly')}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-green-500/10 text-green-500 hover:bg-green-500/20"
                >
                  <MessageCircle className="w-3.5 h-3.5" />
                  Remind
                </button>
                <button
                  onClick={() => sendBulkReminder('urgent')}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-red-500/10 text-red-500 hover:bg-red-500/20"
                >
                  <Zap className="w-3.5 h-3.5" />
                  Urgent
                </button>
              </div>
            )}
          </div>

          {/* Invoices List */}
          <div className="space-y-3">
            {isLoading ? (
              <StatementLoadingAnimation theme={theme} />
            ) : customerInvoices.length === 0 ? (
              <div className={`text-center py-12 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                <Receipt className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>No invoices found for this customer</p>
              </div>
            ) : (
              paginatedInvoices.map((invoice) => {
                const outstanding = invoice.total - (invoice.paidAmount || 0);
                const isOverdue = new Date(invoice.dueDate) < new Date() && invoice.status !== 'fullpaid';
                const isExpanded = expandedInvoice === invoice.id;
                const daysOverdue = isOverdue 
                  ? Math.ceil((new Date().getTime() - new Date(invoice.dueDate).getTime()) / (1000 * 60 * 60 * 24))
                  : 0;

                return (
                  <div 
                    key={invoice.id}
                    className={`rounded-xl border overflow-hidden transition-all ${
                      isOverdue
                        ? theme === 'dark'
                          ? 'border-red-500/30 bg-red-950/20'
                          : 'border-red-200 bg-red-50/50'
                        : theme === 'dark'
                          ? 'border-slate-700/50 bg-slate-800/30'
                          : 'border-slate-200 bg-slate-50/50'
                    }`}
                  >
                    {/* Invoice Header */}
                    <div 
                      className="p-2.5 sm:p-4 cursor-pointer"
                      onClick={() => setExpandedInvoice(isExpanded ? null : invoice.id)}
                    >
                      <div className="flex items-start sm:items-center gap-2 sm:gap-3">
                        {/* Checkbox */}
                        {invoice.status !== 'fullpaid' && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleInvoiceSelection(invoice.id);
                            }}
                            className={`w-4 h-4 sm:w-5 sm:h-5 rounded border-2 flex items-center justify-center transition-colors flex-shrink-0 mt-0.5 sm:mt-0 ${
                              selectedInvoices.has(invoice.id)
                                ? 'bg-emerald-500 border-emerald-500 text-white'
                                : theme === 'dark'
                                  ? 'border-slate-600 hover:border-slate-500'
                                  : 'border-slate-300 hover:border-slate-400'
                            }`}
                          >
                            {selectedInvoices.has(invoice.id) && <Check className="w-2.5 h-2.5 sm:w-3 sm:h-3" />}
                          </button>
                        )}

                        <div className="flex-1 min-w-0">
                          {/* Mobile: Stacked layout */}
                          <div className="sm:hidden">
                            <div className="flex items-center justify-between gap-2 mb-1">
                              <p className={`text-sm font-semibold truncate ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>#{invoice.id}</p>
                              <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-medium rounded-full border flex-shrink-0 ${getStatusStyle(invoice.status, invoice.dueDate)}`}>
                                {getStatusIcon(invoice.status, invoice.dueDate)}
                                {getStatusLabel(invoice.status, invoice.dueDate)}
                              </span>
                            </div>
                            <div className="flex items-center justify-between gap-2">
                              <p className={`text-[11px] ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>
                                {new Date(invoice.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
                                {isOverdue && <span className="text-red-500 ml-1">• {daysOverdue}d overdue</span>}
                              </p>
                              <p className={`text-sm font-bold ${outstanding > 0 ? 'text-red-500' : theme === 'dark' ? 'text-emerald-400' : 'text-emerald-600'}`}>
                                {formatCurrency(outstanding)}
                              </p>
                            </div>
                          </div>

                          {/* Desktop: Grid layout */}
                          <div className="hidden sm:grid sm:grid-cols-5 gap-4 items-center">
                            <div>
                              <p className={`font-semibold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>#{invoice.id}</p>
                              <p className={`text-xs ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>
                                {new Date(invoice.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                              </p>
                            </div>
                            <div>
                              <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full border ${getStatusStyle(invoice.status, invoice.dueDate)}`}>
                                {getStatusIcon(invoice.status, invoice.dueDate)}
                                {getStatusLabel(invoice.status, invoice.dueDate)}
                              </span>
                              {isOverdue && <p className="text-xs text-red-500 mt-1">{daysOverdue} days overdue</p>}
                            </div>
                            <div>
                              <p className={`text-xs ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>Total</p>
                              <p className={`font-medium ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>{formatCurrency(invoice.total)}</p>
                            </div>
                            <div>
                              <p className={`text-xs ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>Paid</p>
                              <p className={`font-medium ${theme === 'dark' ? 'text-emerald-400' : 'text-emerald-600'}`}>{formatCurrency(invoice.paidAmount || 0)}</p>
                            </div>
                            <div>
                              <p className={`text-xs ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>Balance</p>
                              <p className={`font-bold ${outstanding > 0 ? 'text-red-500' : theme === 'dark' ? 'text-emerald-400' : 'text-emerald-600'}`}>{formatCurrency(outstanding)}</p>
                            </div>
                          </div>
                        </div>

                        {/* Expand Icon */}
                        <div className={`flex-shrink-0 ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>
                          {isExpanded ? <ChevronUp className="w-4 h-4 sm:w-5 sm:h-5" /> : <ChevronDown className="w-4 h-4 sm:w-5 sm:h-5" />}
                        </div>
                      </div>
                    </div>

                    {/* Expanded Content */}
                    {isExpanded && (
                      <div className={`px-2.5 pb-2.5 sm:px-4 sm:pb-4 border-t ${theme === 'dark' ? 'border-slate-700/50' : 'border-slate-200'}`}>
                        {/* Invoice Items */}
                        <div className="mt-4">
                          <p className={`text-xs font-medium mb-2 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                            Items
                          </p>
                          <div className="space-y-2">
                            {invoice.items.map((item, idx) => (
                              <div 
                                key={idx}
                                className={`flex items-center justify-between p-2 rounded-lg ${
                                  theme === 'dark' ? 'bg-slate-800/50' : 'bg-white'
                                }`}
                              >
                                <div>
                                  <p className={`text-sm font-medium ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                                    {item.productName}
                                  </p>
                                  <p className={`text-xs ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>
                                    {item.quantity} × {formatCurrency(item.unitPrice)}
                                  </p>
                                </div>
                                <p className={`font-medium ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                                  {formatCurrency(item.total)}
                                </p>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Payment History Section */}
                        {getPaymentHistory(invoice.id).length > 0 && (
                          <div className={`mt-4 pt-4 border-t ${theme === 'dark' ? 'border-slate-700/50' : 'border-slate-200'}`}>
                            <button
                              onClick={() => setShowHistoryFor(showHistoryFor === invoice.id ? null : invoice.id)}
                              className={`flex items-center gap-2 text-sm font-medium ${
                                theme === 'dark' ? 'text-slate-400 hover:text-slate-300' : 'text-slate-600 hover:text-slate-700'
                              }`}
                            >
                              <History className="w-4 h-4" />
                              Payment History ({getPaymentHistory(invoice.id).length})
                              {showHistoryFor === invoice.id ? (
                                <ChevronUp className="w-4 h-4" />
                              ) : (
                                <ChevronDown className="w-4 h-4" />
                              )}
                            </button>
                            
                            {showHistoryFor === invoice.id && (
                              <div className="mt-3 space-y-2">
                                {getPaymentHistory(invoice.id)
                                  .map((payment) => (
                                    <div 
                                      key={payment.id}
                                      className={`flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-0 p-2 sm:p-3 rounded-lg ${
                                        payment.source === 'bulk'
                                          ? theme === 'dark' 
                                            ? 'bg-blue-500/10 border border-blue-500/20' 
                                            : 'bg-blue-50 border border-blue-100'
                                          : theme === 'dark' 
                                            ? 'bg-emerald-500/10 border border-emerald-500/20' 
                                            : 'bg-emerald-50 border border-emerald-100'
                                      }`}
                                    >
                                      <div className="flex items-center gap-3">
                                        <div className={`p-2 rounded-lg ${
                                          payment.source === 'bulk'
                                            ? theme === 'dark' ? 'bg-blue-500/20' : 'bg-blue-100'
                                            : theme === 'dark' ? 'bg-emerald-500/20' : 'bg-emerald-100'
                                        }`}>
                                          {(payment.paymentMethod === 'cash') && <Banknote className={`w-4 h-4 ${payment.source === 'bulk' ? 'text-blue-500' : 'text-emerald-500'}`} />}
                                          {(payment.paymentMethod === 'bank' || payment.paymentMethod === 'bank_transfer') && <Building2 className={`w-4 h-4 ${payment.source === 'bulk' ? 'text-blue-500' : 'text-emerald-500'}`} />}
                                          {(payment.paymentMethod === 'card') && <CreditCard className={`w-4 h-4 ${payment.source === 'bulk' ? 'text-blue-500' : 'text-emerald-500'}`} />}
                                          {(payment.paymentMethod === 'cheque') && <Wallet className={`w-4 h-4 ${payment.source === 'bulk' ? 'text-blue-500' : 'text-emerald-500'}`} />}
                                        </div>
                                        <div>
                                          <p className={`text-sm font-medium ${
                                            payment.source === 'bulk'
                                              ? theme === 'dark' ? 'text-blue-400' : 'text-blue-700'
                                              : theme === 'dark' ? 'text-emerald-400' : 'text-emerald-700'
                                          }`}>
                                            {formatCurrency(payment.amount)}
                                          </p>
                                          <p className={`text-xs ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>
                                            {new Date(payment.paymentDate).toLocaleDateString('en-GB', {
                                              day: '2-digit',
                                              month: 'short',
                                              year: 'numeric',
                                              hour: '2-digit',
                                              minute: '2-digit'
                                            })}
                                          </p>
                                        </div>
                                      </div>
                                      <div className="flex items-center gap-2 flex-wrap">
                                        {/* Source badge */}
                                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full ${
                                          payment.source === 'bulk'
                                            ? theme === 'dark' ? 'bg-blue-500/20 text-blue-400' : 'bg-blue-100 text-blue-700'
                                            : theme === 'dark' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-emerald-100 text-emerald-700'
                                        }`}>
                                          {payment.source === 'bulk' ? (
                                            <>
                                              <Zap className="w-3 h-3" />
                                              Bulk Payment
                                            </>
                                          ) : (
                                            <>
                                              <Receipt className="w-3 h-3" />
                                              Direct
                                            </>
                                          )}
                                        </span>
                                        {/* Payment method */}
                                        <span className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full ${
                                          theme === 'dark' ? 'bg-slate-700 text-slate-300' : 'bg-slate-100 text-slate-600'
                                        }`}>
                                          {payment.paymentMethod === 'bank_transfer' ? 'Bank' : payment.paymentMethod.charAt(0).toUpperCase() + payment.paymentMethod.slice(1)}
                                        </span>
                                      </div>
                                      {payment.notes && (
                                        <p className={`text-xs text-right ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>
                                          {payment.notes}
                                        </p>
                                      )}
                                    </div>
                                  ))}
                              </div>
                            )}
                          </div>
                        )}

                        {/* Actions */}
                        {invoice.status !== 'fullpaid' && (
                          <div className={`mt-4 pt-4 border-t ${theme === 'dark' ? 'border-slate-700/50' : 'border-slate-200'}`}>
                            {/* Payment Method Selector */}
                            <div className="mb-3">
                              <p className={`text-xs font-medium mb-2 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                                Payment Method
                              </p>
                              <div className="flex flex-wrap gap-2">
                                {paymentMethodOptions.map((option) => (
                                  <button
                                    key={option.value}
                                    onClick={() => setPaymentMethods(prev => ({ ...prev, [invoice.id]: option.value }))}
                                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                                      (paymentMethods[invoice.id] || 'cash') === option.value
                                        ? 'bg-emerald-500 text-white shadow-md'
                                        : theme === 'dark'
                                          ? 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                    }`}
                                  >
                                    {option.icon}
                                    {option.label}
                                  </button>
                                ))}
                              </div>
                            </div>

                            <div className="flex flex-col gap-3">
                              {/* Payment Amount Input Row */}
                              <div className="space-y-2">
                                <div className={`flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-2 rounded-lg border ${
                                  theme === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'
                                }`}>
                                  <span className={`text-xs sm:text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>Rs.</span>
                                  <input
                                    type="number"
                                    placeholder={`Max: ${outstanding.toLocaleString()}`}
                                    value={paymentAmounts[invoice.id] || ''}
                                    onChange={(e) => setPaymentAmounts(prev => ({ 
                                      ...prev, 
                                      [invoice.id]: e.target.value 
                                    }))}
                                    max={outstanding}
                                    className={`flex-1 bg-transparent outline-none text-sm min-w-0 ${
                                      theme === 'dark' ? 'text-white placeholder:text-slate-600' : 'text-slate-900 placeholder:text-slate-400'
                                    }`}
                                  />
                                </div>
                                <div className="flex gap-1.5">
                                  {[25, 50, 75, 100].map(pct => (
                                    <button
                                      key={pct}
                                      onClick={() => setPaymentAmounts(prev => ({ ...prev, [invoice.id]: String(Math.floor(outstanding * pct / 100)) }))}
                                      className={`flex-1 py-1.5 rounded-lg text-[11px] sm:text-xs font-medium transition-all ${
                                        paymentAmounts[invoice.id] === String(Math.floor(outstanding * pct / 100))
                                          ? 'bg-emerald-500 text-white shadow-sm'
                                          : theme === 'dark' ? 'bg-slate-800 text-slate-400 hover:bg-slate-700' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                      }`}
                                    >
                                      {pct}%
                                    </button>
                                  ))}
                                </div>
                              </div>

                              {/* Notes Input */}
                              <input
                                type="text"
                                placeholder="Payment notes (optional)"
                                value={paymentNotes[invoice.id] || ''}
                                onChange={(e) => setPaymentNotes(prev => ({ ...prev, [invoice.id]: e.target.value }))}
                                className={`w-full px-3 py-2 rounded-lg border text-sm ${
                                  theme === 'dark' 
                                    ? 'bg-slate-800 border-slate-700 text-white placeholder:text-slate-500' 
                                    : 'bg-white border-slate-200 text-slate-900 placeholder:text-slate-400'
                                }`}
                              />

                              {/* Action Buttons */}
                              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                                <button
                                  onClick={() => handlePaymentSubmit(invoice.id, outstanding)}
                                  disabled={processingPayment === invoice.id || !paymentAmounts[invoice.id] || parseFloat(paymentAmounts[invoice.id]) <= 0 || parseFloat(paymentAmounts[invoice.id]) > outstanding}
                                  className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                                    processingPayment === invoice.id
                                      ? 'bg-emerald-500/50 text-white cursor-wait'
                                      : paymentAmounts[invoice.id] && parseFloat(paymentAmounts[invoice.id]) > 0 && parseFloat(paymentAmounts[invoice.id]) <= outstanding
                                        ? 'bg-emerald-500 text-white hover:bg-emerald-600'
                                        : theme === 'dark' 
                                          ? 'bg-slate-700 text-slate-500 cursor-not-allowed' 
                                          : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                                  }`}
                                >
                                  {processingPayment === invoice.id ? (
                                    <>
                                      <Loader2 className="w-4 h-4 animate-spin" />
                                      Processing...
                                    </>
                                  ) : (
                                    <>
                                      <CreditCard className="w-4 h-4" />
                                      Record Payment
                                    </>
                                  )}
                                </button>
                                <button
                                  onClick={() => handleMarkFullPaid(invoice.id, outstanding)}
                                  disabled={processingPayment === invoice.id}
                                  className={`flex items-center justify-center gap-1 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                                    processingPayment === invoice.id
                                      ? 'bg-gradient-to-r from-emerald-500/50 to-teal-500/50 text-white/70 cursor-wait'
                                      : 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white hover:opacity-90'
                                  }`}
                                >
                                  {processingPayment === invoice.id ? (
                                    <>
                                      <Loader2 className="w-4 h-4 animate-spin" />
                                      Processing...
                                    </>
                                  ) : (
                                    <>
                                      <Check className="w-4 h-4" />
                                      Full Pay ({formatCurrency(outstanding)})
                                    </>
                                  )}
                                </button>
                              </div>

                              {/* Reminder Buttons */}
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => onSendReminder(invoice, 'friendly')}
                                  className={`flex-1 flex items-center justify-center gap-1.5 sm:gap-2 p-2 rounded-lg transition-colors ${
                                    theme === 'dark' ? 'bg-green-500/10 text-green-400 hover:bg-green-500/20' : 'bg-green-50 text-green-600 hover:bg-green-100'
                                  }`}
                                >
                                  <MessageCircle className="w-4 h-4 flex-shrink-0" />
                                  <span className="text-xs sm:text-sm">Friendly</span>
                                </button>
                                <button
                                  onClick={() => onSendReminder(invoice, 'urgent')}
                                  className={`flex-1 flex items-center justify-center gap-1.5 sm:gap-2 p-2 rounded-lg transition-colors ${
                                    theme === 'dark' ? 'bg-red-500/10 text-red-400 hover:bg-red-500/20' : 'bg-red-50 text-red-600 hover:bg-red-100'
                                  }`}
                                >
                                  <Zap className="w-4 h-4 flex-shrink-0" />
                                  <span className="text-xs sm:text-sm">Urgent</span>
                                </button>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* Pagination */}
          {!isLoading && customerInvoices.length > itemsPerPage && (
            <div className={`flex flex-col sm:flex-row items-center justify-between gap-3 mt-6 pt-4 border-t ${
              theme === 'dark' ? 'border-slate-700/50' : 'border-slate-200'
            }`}>
              {/* Page Info */}
              <p className={`text-xs sm:text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                {((currentPage - 1) * itemsPerPage) + 1}-{Math.min(currentPage * itemsPerPage, customerInvoices.length)} of {customerInvoices.length}
              </p>

              {/* Pagination Controls */}
              <div className="flex items-center gap-2">
                {/* Previous Button */}
                <button
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className={`p-2 rounded-lg transition-all ${
                    currentPage === 1
                      ? theme === 'dark'
                        ? 'text-slate-600 cursor-not-allowed'
                        : 'text-slate-300 cursor-not-allowed'
                      : theme === 'dark'
                        ? 'text-slate-400 hover:bg-slate-800 hover:text-white'
                        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  }`}
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>

                {/* Page Numbers */}
                <div className="flex items-center gap-1">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
                    // Show: first page, last page, current page, and pages around current
                    const showPage = 
                      page === 1 || 
                      page === totalPages || 
                      Math.abs(page - currentPage) <= 1;
                    
                    // Show ellipsis
                    const showEllipsisBefore = page === currentPage - 2 && currentPage > 3;
                    const showEllipsisAfter = page === currentPage + 2 && currentPage < totalPages - 2;

                    if (showEllipsisBefore || showEllipsisAfter) {
                      return (
                        <span
                          key={`ellipsis-${page}`}
                          className={`px-2 ${theme === 'dark' ? 'text-slate-600' : 'text-slate-400'}`}
                        >
                          ...
                        </span>
                      );
                    }

                    if (!showPage) return null;

                    return (
                      <button
                        key={page}
                        onClick={() => setCurrentPage(page)}
                        className={`min-w-[36px] h-9 px-3 rounded-lg text-sm font-medium transition-all ${
                          currentPage === page
                            ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-lg'
                            : theme === 'dark'
                              ? 'text-slate-400 hover:bg-slate-800 hover:text-white'
                              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                        }`}
                      >
                        {page}
                      </button>
                    );
                  })}
                </div>

                {/* Next Button */}
                <button
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                  className={`p-2 rounded-lg transition-all ${
                    currentPage === totalPages
                      ? theme === 'dark'
                        ? 'text-slate-600 cursor-not-allowed'
                        : 'text-slate-300 cursor-not-allowed'
                      : theme === 'dark'
                        ? 'text-slate-400 hover:bg-slate-800 hover:text-white'
                        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  }`}
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className={`sticky bottom-0 p-2.5 sm:p-4 border-t ${theme === 'dark' ? 'border-slate-800 bg-slate-900/95' : 'border-slate-200 bg-white/95'} backdrop-blur-sm`}>
          <div className="flex items-center justify-between">
            <p className={`text-[11px] sm:text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
              {customerInvoices.length} invoice(s) • {totals.unpaidCount} pending
            </p>
            <button
              onClick={onClose}
              className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl text-xs sm:text-sm font-medium transition-colors ${
                theme === 'dark' 
                  ? 'bg-slate-800 hover:bg-slate-700 text-white' 
                  : 'bg-slate-200 hover:bg-slate-300 text-slate-700'
              }`}
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
