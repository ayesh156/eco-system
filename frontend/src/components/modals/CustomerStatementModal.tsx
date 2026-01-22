import React, { useState, useMemo } from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { 
  X, FileText, CreditCard, CheckCircle, AlertTriangle, Clock, 
  MessageCircle, Zap, Check, ChevronDown, ChevronUp, Receipt,
  Banknote, Building2, Wallet, History
} from 'lucide-react';
import type { Customer, Invoice, CustomerPayment } from '../../data/mockData';

type PaymentMethod = 'cash' | 'bank' | 'card' | 'cheque';

interface CustomerStatementModalProps {
  isOpen: boolean;
  customer: Customer | null;
  invoices: Invoice[];
  onClose: () => void;
  onMarkAsPaid: (invoiceId: string, amount: number, paymentMethod: PaymentMethod, notes?: string) => void;
  onSendReminder: (invoice: Invoice, type: 'friendly' | 'urgent') => void;
}

export const CustomerStatementModal: React.FC<CustomerStatementModalProps> = ({
  isOpen,
  customer,
  invoices,
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

  // Payment method options
  const paymentMethodOptions: { value: PaymentMethod; label: string; icon: React.ReactNode }[] = [
    { value: 'cash', label: 'Cash', icon: <Banknote className="w-4 h-4" /> },
    { value: 'bank', label: 'Bank', icon: <Building2 className="w-4 h-4" /> },
    { value: 'card', label: 'Card', icon: <CreditCard className="w-4 h-4" /> },
    { value: 'cheque', label: 'Cheque', icon: <Wallet className="w-4 h-4" /> },
  ];

  // Get payment history for an invoice
  const getPaymentHistory = (invoiceId: string): CustomerPayment[] => {
    return customer?.paymentHistory?.filter(p => p.invoiceId === invoiceId) || [];
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

  const handlePaymentSubmit = (invoiceId: string, maxAmount: number) => {
    const amount = parseFloat(paymentAmounts[invoiceId] || '0');
    const method = paymentMethods[invoiceId] || 'cash';
    const notes = paymentNotes[invoiceId] || '';
    if (amount > 0 && amount <= maxAmount) {
      onMarkAsPaid(invoiceId, amount, method, notes);
      setPaymentAmounts(prev => ({ ...prev, [invoiceId]: '' }));
      setPaymentNotes(prev => ({ ...prev, [invoiceId]: '' }));
    }
  };

  const handleMarkFullPaid = (invoiceId: string, amount: number) => {
    const method = paymentMethods[invoiceId] || 'cash';
    onMarkAsPaid(invoiceId, amount, method);
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal - Full scroll */}
      <div className={`relative w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-2xl shadow-2xl ${
        theme === 'dark' ? 'bg-slate-900' : 'bg-white'
      }`}>
        {/* Header */}
        <div className={`p-6 border-b ${theme === 'dark' ? 'border-slate-800' : 'border-slate-200'}`}>
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <div className={`w-14 h-14 rounded-xl flex items-center justify-center text-white font-bold text-xl ${
                totals.overdueCount > 0 
                  ? 'bg-gradient-to-br from-red-500 to-rose-600' 
                  : 'bg-gradient-to-br from-emerald-500 to-teal-600'
              }`}>
                {customer.name.charAt(0)}
              </div>
              <div>
                <h2 className={`text-xl font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                  {customer.name}
                </h2>
                <p className={`text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                  {customer.email} • {customer.phone}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className={`p-2 rounded-xl transition-colors ${
                theme === 'dark' ? 'hover:bg-slate-800 text-slate-400' : 'hover:bg-slate-100 text-slate-600'
              }`}
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
            <div className={`p-3 rounded-xl ${theme === 'dark' ? 'bg-slate-800/50' : 'bg-slate-50'}`}>
              <p className={`text-xs font-medium ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                Total Outstanding
              </p>
              <p className={`text-lg font-bold ${theme === 'dark' ? 'text-red-400' : 'text-red-600'}`}>
                {formatCurrency(totals.totalOutstanding)}
              </p>
            </div>
            <div className={`p-3 rounded-xl ${theme === 'dark' ? 'bg-slate-800/50' : 'bg-slate-50'}`}>
              <p className={`text-xs font-medium ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                Overdue Amount
              </p>
              <p className={`text-lg font-bold text-red-500`}>
                {formatCurrency(totals.overdueAmount)}
              </p>
            </div>
            <div className={`p-3 rounded-xl ${theme === 'dark' ? 'bg-slate-800/50' : 'bg-slate-50'}`}>
              <p className={`text-xs font-medium ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                Unpaid Invoices
              </p>
              <p className={`text-lg font-bold ${theme === 'dark' ? 'text-amber-400' : 'text-amber-600'}`}>
                {totals.unpaidCount}
              </p>
            </div>
            <div className={`p-3 rounded-xl ${theme === 'dark' ? 'bg-slate-800/50' : 'bg-slate-50'}`}>
              <p className={`text-xs font-medium ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                Overdue Invoices
              </p>
              <p className={`text-lg font-bold text-red-500`}>
                {totals.overdueCount}
              </p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className={`text-lg font-semibold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
              <FileText className="w-5 h-5 inline mr-2" />
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
            {customerInvoices.length === 0 ? (
              <div className={`text-center py-12 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                <Receipt className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>No invoices found for this customer</p>
              </div>
            ) : (
              customerInvoices.map((invoice) => {
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
                      className="p-4 cursor-pointer"
                      onClick={() => setExpandedInvoice(isExpanded ? null : invoice.id)}
                    >
                      <div className="flex items-center gap-3">
                        {/* Checkbox for selection */}
                        {invoice.status !== 'fullpaid' && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleInvoiceSelection(invoice.id);
                            }}
                            className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                              selectedInvoices.has(invoice.id)
                                ? 'bg-emerald-500 border-emerald-500 text-white'
                                : theme === 'dark'
                                  ? 'border-slate-600 hover:border-slate-500'
                                  : 'border-slate-300 hover:border-slate-400'
                            }`}
                          >
                            {selectedInvoices.has(invoice.id) && <Check className="w-3 h-3" />}
                          </button>
                        )}

                        <div className="flex-1 grid grid-cols-2 sm:grid-cols-5 gap-4 items-center">
                          {/* Invoice Number */}
                          <div>
                            <p className={`font-semibold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                              #{invoice.id}
                            </p>
                            <p className={`text-xs ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>
                              {new Date(invoice.date).toLocaleDateString('en-GB', {
                                day: '2-digit',
                                month: 'short',
                                year: 'numeric'
                              })}
                            </p>
                          </div>

                          {/* Status */}
                          <div>
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full border ${getStatusStyle(invoice.status, invoice.dueDate)}`}>
                              {getStatusIcon(invoice.status, invoice.dueDate)}
                              {getStatusLabel(invoice.status, invoice.dueDate)}
                            </span>
                            {isOverdue && (
                              <p className="text-xs text-red-500 mt-1">
                                {daysOverdue} days overdue
                              </p>
                            )}
                          </div>

                          {/* Total */}
                          <div className="hidden sm:block">
                            <p className={`text-xs ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>Total</p>
                            <p className={`font-medium ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                              {formatCurrency(invoice.total)}
                            </p>
                          </div>

                          {/* Paid */}
                          <div className="hidden sm:block">
                            <p className={`text-xs ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>Paid</p>
                            <p className={`font-medium ${theme === 'dark' ? 'text-emerald-400' : 'text-emerald-600'}`}>
                              {formatCurrency(invoice.paidAmount || 0)}
                            </p>
                          </div>

                          {/* Outstanding */}
                          <div>
                            <p className={`text-xs ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>Balance</p>
                            <p className={`font-bold ${outstanding > 0 ? 'text-red-500' : theme === 'dark' ? 'text-emerald-400' : 'text-emerald-600'}`}>
                              {formatCurrency(outstanding)}
                            </p>
                          </div>
                        </div>

                        {/* Expand Icon */}
                        <div className={`${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>
                          {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                        </div>
                      </div>
                    </div>

                    {/* Expanded Content */}
                    {isExpanded && (
                      <div className={`px-4 pb-4 border-t ${theme === 'dark' ? 'border-slate-700/50' : 'border-slate-200'}`}>
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
                                  .sort((a, b) => new Date(b.paymentDate).getTime() - new Date(a.paymentDate).getTime())
                                  .map((payment) => (
                                    <div 
                                      key={payment.id}
                                      className={`flex items-center justify-between p-3 rounded-lg ${
                                        theme === 'dark' ? 'bg-emerald-500/10 border border-emerald-500/20' : 'bg-emerald-50 border border-emerald-100'
                                      }`}
                                    >
                                      <div className="flex items-center gap-3">
                                        <div className={`p-2 rounded-lg ${
                                          theme === 'dark' ? 'bg-emerald-500/20' : 'bg-emerald-100'
                                        }`}>
                                          {payment.paymentMethod === 'cash' && <Banknote className="w-4 h-4 text-emerald-500" />}
                                          {payment.paymentMethod === 'bank' && <Building2 className="w-4 h-4 text-emerald-500" />}
                                          {payment.paymentMethod === 'card' && <CreditCard className="w-4 h-4 text-emerald-500" />}
                                          {payment.paymentMethod === 'cheque' && <Wallet className="w-4 h-4 text-emerald-500" />}
                                        </div>
                                        <div>
                                          <p className={`text-sm font-medium ${theme === 'dark' ? 'text-emerald-400' : 'text-emerald-700'}`}>
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
                                      <div className="text-right">
                                        <span className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full ${
                                          theme === 'dark' ? 'bg-slate-700 text-slate-300' : 'bg-slate-100 text-slate-600'
                                        }`}>
                                          {payment.paymentMethod.charAt(0).toUpperCase() + payment.paymentMethod.slice(1)}
                                        </span>
                                        {payment.notes && (
                                          <p className={`text-xs mt-1 ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>
                                            {payment.notes}
                                          </p>
                                        )}
                                      </div>
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
                              <div className="flex items-center gap-2">
                                <div className={`flex-1 flex items-center gap-2 px-3 py-2 rounded-lg border ${
                                  theme === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'
                                }`}>
                                  <span className={`text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>Rs.</span>
                                  <input
                                    type="number"
                                    placeholder={`Enter amount (Max: ${outstanding.toLocaleString()})`}
                                    value={paymentAmounts[invoice.id] || ''}
                                    onChange={(e) => setPaymentAmounts(prev => ({ 
                                      ...prev, 
                                      [invoice.id]: e.target.value 
                                    }))}
                                    max={outstanding}
                                    className={`flex-1 bg-transparent outline-none text-sm ${
                                      theme === 'dark' ? 'text-white' : 'text-slate-900'
                                    }`}
                                  />
                                </div>
                                {/* Quick amount buttons */}
                                <button
                                  onClick={() => setPaymentAmounts(prev => ({ ...prev, [invoice.id]: String(Math.floor(outstanding / 2)) }))}
                                  className={`px-2 py-2 rounded-lg text-xs font-medium ${
                                    theme === 'dark' ? 'bg-slate-800 text-slate-300 hover:bg-slate-700' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                  }`}
                                  title="Half amount"
                                >
                                  50%
                                </button>
                                <button
                                  onClick={() => setPaymentAmounts(prev => ({ ...prev, [invoice.id]: String(outstanding) }))}
                                  className={`px-2 py-2 rounded-lg text-xs font-medium ${
                                    theme === 'dark' ? 'bg-slate-800 text-slate-300 hover:bg-slate-700' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                  }`}
                                  title="Full amount"
                                >
                                  100%
                                </button>
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
                                  disabled={!paymentAmounts[invoice.id] || parseFloat(paymentAmounts[invoice.id]) <= 0 || parseFloat(paymentAmounts[invoice.id]) > outstanding}
                                  className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                                    paymentAmounts[invoice.id] && parseFloat(paymentAmounts[invoice.id]) > 0 && parseFloat(paymentAmounts[invoice.id]) <= outstanding
                                      ? 'bg-emerald-500 text-white hover:bg-emerald-600'
                                      : theme === 'dark' 
                                        ? 'bg-slate-700 text-slate-500 cursor-not-allowed' 
                                        : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                                  }`}
                                >
                                  <CreditCard className="w-4 h-4" />
                                  Record Payment
                                </button>
                                <button
                                  onClick={() => handleMarkFullPaid(invoice.id, outstanding)}
                                  className="flex items-center justify-center gap-1 px-4 py-2.5 rounded-lg text-sm font-medium bg-gradient-to-r from-emerald-500 to-teal-500 text-white hover:opacity-90"
                                >
                                  <Check className="w-4 h-4" />
                                  Full Pay ({formatCurrency(outstanding)})
                                </button>
                              </div>

                              {/* Reminder Buttons */}
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => onSendReminder(invoice, 'friendly')}
                                  className={`flex-1 flex items-center justify-center gap-2 p-2 rounded-lg transition-colors ${
                                    theme === 'dark' ? 'bg-green-500/10 text-green-400 hover:bg-green-500/20' : 'bg-green-50 text-green-600 hover:bg-green-100'
                                  }`}
                                >
                                  <MessageCircle className="w-4 h-4" />
                                  <span className="text-sm">Friendly Reminder</span>
                                </button>
                                <button
                                  onClick={() => onSendReminder(invoice, 'urgent')}
                                  className={`flex-1 flex items-center justify-center gap-2 p-2 rounded-lg transition-colors ${
                                    theme === 'dark' ? 'bg-red-500/10 text-red-400 hover:bg-red-500/20' : 'bg-red-50 text-red-600 hover:bg-red-100'
                                  }`}
                                >
                                  <Zap className="w-4 h-4" />
                                  <span className="text-sm">Urgent Reminder</span>
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
        </div>

        {/* Footer */}
        <div className={`p-4 border-t ${theme === 'dark' ? 'border-slate-800 bg-slate-900/50' : 'border-slate-200 bg-slate-50'}`}>
          <div className="flex items-center justify-between">
            <p className={`text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
              {customerInvoices.length} invoice(s) • {totals.unpaidCount} pending
            </p>
            <button
              onClick={onClose}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
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
