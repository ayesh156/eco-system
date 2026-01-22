import React, { useState, useEffect } from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import type { Invoice, CustomerPayment } from '../../data/mockData';
import { 
  X, CheckCircle, AlertTriangle, Sparkles, Calculator, Calendar,
  CreditCard, FileCheck, Receipt,
  Clock, TrendingUp, History, User,
  DollarSign, Percent, Zap
} from 'lucide-react';

interface InvoicePaymentModalProps {
  isOpen: boolean;
  invoice: Invoice | null;
  onClose: () => void;
  onPayment: (invoiceId: string, amount: number, paymentMethod: string, notes?: string) => void;
  paymentHistory?: CustomerPayment[];
}

export const InvoicePaymentModal: React.FC<InvoicePaymentModalProps> = ({
  isOpen,
  invoice,
  onClose,
  onPayment,
  paymentHistory = [],
}) => {
  const { theme } = useTheme();
  const [paymentAmount, setPaymentAmount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<string>('cash');
  const [paymentNotes, setPaymentNotes] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [activeTab, setActiveTab] = useState<'payment' | 'history'>('payment');

  const remainingAmount = invoice ? invoice.total - (invoice.paidAmount || 0) : 0;

  useEffect(() => {
    if (invoice) {
      setPaymentAmount(remainingAmount);
      setPaymentNotes('');
    }
    setShowSuccess(false);
    setIsProcessing(false);
    setActiveTab('payment');
  }, [invoice, isOpen]);

  const formatCurrency = (amount: number) => `Rs. ${amount.toLocaleString('en-LK')}`;

  const formatShortDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const handlePayment = async () => {
    if (!invoice || paymentAmount <= 0) return;
    
    setIsProcessing(true);
    // Simulate payment processing with nice animation
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    onPayment(invoice.id, paymentAmount, paymentMethod, paymentNotes);
    setShowSuccess(true);
    
    setTimeout(() => {
      onClose();
    }, 2000);
  };

  const quickAmounts = invoice ? [
    { label: 'Full', value: remainingAmount, icon: '💯', description: 'Clear balance' },
    { label: '75%', value: Math.round(remainingAmount * 0.75), icon: '🔷', description: 'Three quarters' },
    { label: '50%', value: Math.round(remainingAmount / 2), icon: '⚡', description: 'Half payment' },
    { label: '25%', value: Math.round(remainingAmount / 4), icon: '💫', description: 'Quarter pay' },
  ] : [];

  if (!isOpen || !invoice) return null;

  const newRemainingAfterPayment = Math.max(0, remainingAmount - paymentAmount);
  const currentPaymentPercentage = ((invoice.paidAmount || 0) / invoice.total) * 100;
  const newPaymentPercentage = Math.min(((invoice.paidAmount || 0) + paymentAmount) / invoice.total * 100, 100);
  const isOverdue = new Date(invoice.dueDate) < new Date() && invoice.status !== 'fullpaid';
  const daysOverdue = isOverdue ? Math.floor((new Date().getTime() - new Date(invoice.dueDate).getTime()) / (1000 * 60 * 60 * 24)) : 0;

  const paymentMethods = [
    { value: 'cash', label: 'Cash', emoji: '💵', color: 'emerald' },
    { value: 'card', label: 'Card', emoji: '💳', color: 'blue' },
    { value: 'bank', label: 'Bank', emoji: '🏦', color: 'purple' },
    { value: 'cheque', label: 'Cheque', emoji: '📝', color: 'amber' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
      {/* Backdrop with blur */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal - Full scroll */}
      <div className={`relative w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-3xl shadow-2xl animate-in zoom-in-95 duration-200 ${
        theme === 'dark' ? 'bg-slate-900' : 'bg-white'
      }`}>
        {/* Success Overlay - Beautiful Animation */}
        {showSuccess && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-500 animate-in fade-in zoom-in duration-300">
            <div className="relative">
              <div className="absolute inset-0 animate-ping">
                <div className="w-24 h-24 rounded-full bg-white/20" />
              </div>
              <div className="relative w-24 h-24 rounded-full bg-white/20 backdrop-blur flex items-center justify-center mb-6 animate-bounce">
                <CheckCircle className="w-14 h-14 text-white" />
              </div>
            </div>
            <h3 className="text-3xl font-bold text-white mb-2">Payment Successful!</h3>
            <p className="text-white/90 text-lg">{formatCurrency(paymentAmount)} recorded</p>
            <div className="flex items-center gap-2 mt-4 text-white/70">
              <Sparkles className="w-5 h-5" />
              <span>Updating invoice...</span>
            </div>
          </div>
        )}

        {/* Header with Gradient */}
        <div className="relative overflow-hidden">
          <div className={`absolute inset-0 ${
            isOverdue 
              ? 'bg-gradient-to-r from-rose-600 via-red-600 to-orange-600' 
              : invoice.status === 'halfpay'
                ? 'bg-gradient-to-r from-amber-600 via-orange-600 to-yellow-600'
                : 'bg-gradient-to-r from-violet-600 via-purple-600 to-indigo-600'
          }`} />
          {/* Decorative pattern */}
          <div className="absolute inset-0 opacity-20">
            <div className="absolute top-0 left-0 w-40 h-40 bg-white/10 rounded-full -translate-x-1/2 -translate-y-1/2" />
            <div className="absolute bottom-0 right-0 w-32 h-32 bg-white/10 rounded-full translate-x-1/2 translate-y-1/2" />
          </div>
          
          <div className="relative px-6 py-5">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 rounded-lg bg-white/20 backdrop-blur flex items-center justify-center">
                    <Receipt className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <span className="text-white/80 text-sm font-medium">Invoice Payment</span>
                    <span className="text-white/60 text-sm ml-2">#{invoice.id}</span>
                  </div>
                </div>
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <User className="w-5 h-5" />
                  {invoice.customerName}
                </h2>
                {isOverdue && (
                  <div className="flex items-center gap-2 mt-2 px-3 py-1.5 bg-white/15 backdrop-blur rounded-lg w-fit">
                    <AlertTriangle className="w-4 h-4 text-white" />
                    <span className="text-white text-sm font-medium">⚠️ {daysOverdue} days overdue!</span>
                  </div>
                )}
              </div>
              <button
                onClick={onClose}
                className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center text-white hover:bg-white/30 transition-all hover:scale-105"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Invoice Summary Card */}
            <div className="mt-4 p-4 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/10">
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <div className="text-white/60 text-xs mb-1">Total</div>
                  <div className="text-lg font-bold text-white">{formatCurrency(invoice.total)}</div>
                </div>
                <div>
                  <div className="text-white/60 text-xs mb-1">Paid</div>
                  <div className="text-lg font-bold text-emerald-300">{formatCurrency(invoice.paidAmount || 0)}</div>
                </div>
                <div>
                  <div className="text-white/60 text-xs mb-1">Balance</div>
                  <div className="text-lg font-bold text-amber-300">{formatCurrency(remainingAmount)}</div>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="mt-4">
                <div className="flex justify-between text-xs text-white/70 mb-2">
                  <span className="flex items-center gap-1">
                    <TrendingUp className="w-3 h-3" />
                    Current: {currentPaymentPercentage.toFixed(1)}%
                  </span>
                  <span className="flex items-center gap-1">
                    After: {newPaymentPercentage.toFixed(1)}%
                    <Sparkles className="w-3 h-3" />
                  </span>
                </div>
                <div className="h-3 rounded-full bg-white/20 overflow-hidden relative">
                  {/* Current progress */}
                  <div 
                    className="absolute h-full rounded-full bg-gradient-to-r from-emerald-400 to-teal-400 transition-all duration-500"
                    style={{ width: `${currentPaymentPercentage}%` }}
                  />
                  {/* Preview progress */}
                  <div 
                    className="absolute h-full rounded-full bg-gradient-to-r from-amber-400/50 to-yellow-400/50 transition-all duration-300"
                    style={{ width: `${newPaymentPercentage}%` }}
                  />
                </div>
              </div>

              {/* Due Date */}
              <div className="flex items-center justify-between mt-3 pt-3 border-t border-white/10">
                <div className="flex items-center gap-1.5 text-white/70 text-sm">
                  <Calendar className="w-4 h-4" />
                  Due: {formatShortDate(invoice.dueDate)}
                </div>
                <div className={`px-2 py-1 rounded-lg text-xs font-medium ${
                  invoice.status === 'fullpaid' 
                    ? 'bg-emerald-500/20 text-emerald-300'
                    : invoice.status === 'halfpay'
                      ? 'bg-amber-500/20 text-amber-300'
                      : 'bg-red-500/20 text-red-300'
                }`}>
                  {invoice.status === 'fullpaid' ? '✓ Fully Paid' : invoice.status === 'halfpay' ? '◐ Partial' : '○ Unpaid'}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className={`flex border-b ${theme === 'dark' ? 'border-slate-700/50' : 'border-slate-200'}`}>
          <button
            onClick={() => setActiveTab('payment')}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium transition-all ${
              activeTab === 'payment'
                ? theme === 'dark'
                  ? 'text-emerald-400 border-b-2 border-emerald-400 bg-emerald-500/5'
                  : 'text-emerald-600 border-b-2 border-emerald-500 bg-emerald-50'
                : theme === 'dark'
                  ? 'text-slate-400 hover:text-slate-300'
                  : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <DollarSign className="w-4 h-4" />
            Make Payment
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium transition-all ${
              activeTab === 'history'
                ? theme === 'dark'
                  ? 'text-emerald-400 border-b-2 border-emerald-400 bg-emerald-500/5'
                  : 'text-emerald-600 border-b-2 border-emerald-500 bg-emerald-50'
                : theme === 'dark'
                  ? 'text-slate-400 hover:text-slate-300'
                  : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <History className="w-4 h-4" />
            Payment History
            {paymentHistory.length > 0 && (
              <span className={`px-1.5 py-0.5 text-xs rounded-full ${
                theme === 'dark' ? 'bg-slate-700 text-slate-300' : 'bg-slate-200 text-slate-600'
              }`}>
                {paymentHistory.length}
              </span>
            )}
          </button>
        </div>

        {/* Content */}
        <div>
          {activeTab === 'payment' ? (
            <div className="p-6 space-y-5">
              {/* Quick Amount Selection */}
              <div>
                <label className={`flex items-center gap-2 text-sm font-semibold mb-3 ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                  <Zap className="w-4 h-4 text-amber-500" />
                  Quick Select
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {quickAmounts.map(({ label, value, icon, description }) => (
                    <button
                      key={label}
                      type="button"
                      onClick={() => setPaymentAmount(value)}
                      className={`relative py-3 px-2 rounded-xl font-medium transition-all group ${
                        paymentAmount === value
                          ? 'bg-gradient-to-br from-emerald-500 to-teal-500 text-white shadow-lg shadow-emerald-500/25 scale-105'
                          : theme === 'dark' 
                            ? 'bg-slate-800/80 text-slate-300 hover:bg-slate-700 hover:scale-102' 
                            : 'bg-slate-100 text-slate-700 hover:bg-slate-200 hover:scale-102'
                      }`}
                    >
                      <div className="text-lg mb-1">{icon}</div>
                      <div className="text-sm font-bold">{label}</div>
                      <div className={`text-[10px] ${paymentAmount === value ? 'text-white/70' : 'opacity-60'}`}>
                        {formatCurrency(value).replace('Rs. ', '')}
                      </div>
                      {/* Tooltip */}
                      <div className={`absolute -top-8 left-1/2 -translate-x-1/2 px-2 py-1 rounded text-xs whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity ${
                        theme === 'dark' ? 'bg-slate-700 text-white' : 'bg-slate-800 text-white'
                      }`}>
                        {description}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Custom Amount Input */}
              <div>
                <label className={`flex items-center gap-2 text-sm font-semibold mb-2 ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                  <Calculator className="w-4 h-4 text-purple-500" />
                  Custom Amount
                </label>
                <div className="relative">
                  <span className={`absolute left-4 top-1/2 -translate-y-1/2 text-lg font-bold ${
                    theme === 'dark' ? 'text-emerald-400' : 'text-emerald-600'
                  }`}>
                    Rs.
                  </span>
                  <input
                    type="number"
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(Math.min(Number(e.target.value), remainingAmount))}
                    max={remainingAmount}
                    min={0}
                    className={`w-full pl-14 pr-4 py-4 rounded-xl border-2 text-2xl font-bold transition-all ${
                      theme === 'dark'
                        ? 'bg-slate-800/50 border-slate-700 text-white focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/20'
                        : 'bg-white border-slate-200 text-slate-900 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/20'
                    }`}
                  />
                  {/* Percentage indicator */}
                  <div className={`absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-1 px-2 py-1 rounded-lg ${
                    theme === 'dark' ? 'bg-slate-700/80 text-slate-300' : 'bg-slate-100 text-slate-600'
                  }`}>
                    <Percent className="w-3 h-3" />
                    <span className="text-sm font-medium">
                      {remainingAmount > 0 ? ((paymentAmount / remainingAmount) * 100).toFixed(0) : 0}%
                    </span>
                  </div>
                </div>
              </div>

              {/* Payment Method Selection */}
              <div>
                <label className={`flex items-center gap-2 text-sm font-semibold mb-3 ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                  <CreditCard className="w-4 h-4 text-blue-500" />
                  Payment Method
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {paymentMethods.map(({ value, label, emoji, color }) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setPaymentMethod(value)}
                      className={`flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all ${
                        paymentMethod === value
                          ? `border-${color}-500 bg-${color}-500/10 scale-105`
                          : theme === 'dark' 
                            ? 'border-slate-700 hover:border-slate-600 hover:bg-slate-800/50' 
                            : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                      }`}
                      style={paymentMethod === value ? {
                        borderColor: color === 'emerald' ? '#10b981' : color === 'blue' ? '#3b82f6' : color === 'purple' ? '#8b5cf6' : '#f59e0b',
                        backgroundColor: color === 'emerald' ? 'rgba(16, 185, 129, 0.1)' : color === 'blue' ? 'rgba(59, 130, 246, 0.1)' : color === 'purple' ? 'rgba(139, 92, 246, 0.1)' : 'rgba(245, 158, 11, 0.1)'
                      } : {}}
                    >
                      <span className="text-2xl">{emoji}</span>
                      <span className={`text-xs font-medium ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                        {label}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Payment Notes */}
              <div>
                <label className={`flex items-center gap-2 text-sm font-semibold mb-2 ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                  <FileCheck className="w-4 h-4 text-indigo-500" />
                  Notes (Optional)
                </label>
                <textarea
                  value={paymentNotes}
                  onChange={(e) => setPaymentNotes(e.target.value)}
                  placeholder="Add any notes about this payment..."
                  rows={2}
                  className={`w-full px-4 py-3 rounded-xl border transition-all resize-none ${
                    theme === 'dark'
                      ? 'bg-slate-800/50 border-slate-700 text-white placeholder-slate-500 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20'
                      : 'bg-white border-slate-200 text-slate-900 placeholder-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20'
                  }`}
                />
              </div>

              {/* After Payment Preview */}
              <div className={`p-4 rounded-xl border-2 border-dashed ${
                newRemainingAfterPayment === 0 
                  ? theme === 'dark' ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-emerald-300 bg-emerald-50'
                  : theme === 'dark' ? 'border-slate-700 bg-slate-800/30' : 'border-slate-200 bg-slate-50'
              }`}>
                <div className="flex items-center justify-between">
                  <span className={`flex items-center gap-2 text-sm font-medium ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                    <Clock className="w-4 h-4" />
                    After this payment:
                  </span>
                  <span className={`text-lg font-bold ${
                    newRemainingAfterPayment === 0 
                      ? 'text-emerald-500' 
                      : theme === 'dark' ? 'text-white' : 'text-slate-900'
                  }`}>
                    {newRemainingAfterPayment === 0 ? (
                      <span className="flex items-center gap-2">
                        <Sparkles className="w-5 h-5" />
                        Fully Paid!
                      </span>
                    ) : (
                      formatCurrency(newRemainingAfterPayment) + ' remaining'
                    )}
                  </span>
                </div>
              </div>
            </div>
          ) : (
            /* Payment History Tab */
            <div className="p-6">
              {paymentHistory.length === 0 ? (
                <div className={`text-center py-12 rounded-xl border-2 border-dashed ${
                  theme === 'dark' ? 'border-slate-700 bg-slate-800/20' : 'border-slate-200 bg-slate-50'
                }`}>
                  <div className={`w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center ${
                    theme === 'dark' ? 'bg-slate-700' : 'bg-slate-200'
                  }`}>
                    <History className={`w-8 h-8 ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`} />
                  </div>
                  <h4 className={`text-lg font-semibold mb-2 ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                    No Payment History
                  </h4>
                  <p className={`text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                    Payments will appear here once recorded
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {paymentHistory.map((payment, index) => (
                    <div 
                      key={payment.id}
                      className={`p-4 rounded-xl border transition-all hover:scale-[1.01] ${
                        theme === 'dark' 
                          ? 'bg-slate-800/50 border-slate-700/50 hover:border-slate-600' 
                          : 'bg-white border-slate-200 hover:border-slate-300 shadow-sm'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                            payment.paymentMethod === 'cash' 
                              ? 'bg-emerald-500/10 text-emerald-500'
                              : payment.paymentMethod === 'card'
                                ? 'bg-blue-500/10 text-blue-500'
                                : payment.paymentMethod === 'bank'
                                  ? 'bg-purple-500/10 text-purple-500'
                                  : 'bg-amber-500/10 text-amber-500'
                          }`}>
                            {payment.paymentMethod === 'cash' ? '💵' : 
                             payment.paymentMethod === 'card' ? '💳' : 
                             payment.paymentMethod === 'bank' ? '🏦' : '📝'}
                          </div>
                          <div>
                            <div className={`font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                              {formatCurrency(payment.amount)}
                            </div>
                            <div className={`text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                              {payment.paymentMethod.charAt(0).toUpperCase() + payment.paymentMethod.slice(1)}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className={`text-sm font-medium ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                            {formatShortDate(payment.paymentDate)}
                          </div>
                          <div className={`text-xs ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>
                            #{index + 1}
                          </div>
                        </div>
                      </div>
                      {payment.notes && (
                        <div className={`mt-2 pt-2 border-t text-sm ${
                          theme === 'dark' ? 'border-slate-700 text-slate-400' : 'border-slate-100 text-slate-500'
                        }`}>
                          📝 {payment.notes}
                        </div>
                      )}
                    </div>
                  ))}
                  
                  {/* Total Paid Summary */}
                  <div className={`mt-4 p-4 rounded-xl ${
                    theme === 'dark' ? 'bg-emerald-500/10 border border-emerald-500/20' : 'bg-emerald-50 border border-emerald-200'
                  }`}>
                    <div className="flex items-center justify-between">
                      <span className={`font-medium ${theme === 'dark' ? 'text-emerald-400' : 'text-emerald-700'}`}>
                        Total Paid ({paymentHistory.length} payments)
                      </span>
                      <span className={`text-xl font-bold ${theme === 'dark' ? 'text-emerald-400' : 'text-emerald-600'}`}>
                        {formatCurrency(paymentHistory.reduce((sum, p) => sum + p.amount, 0))}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer - Pay Button */}
        {activeTab === 'payment' && (
          <div className={`px-6 py-4 border-t ${theme === 'dark' ? 'border-slate-800' : 'border-slate-200'}`}>
            <button
              onClick={handlePayment}
              disabled={paymentAmount <= 0 || isProcessing}
              className={`w-full flex items-center justify-center gap-3 py-4 rounded-xl font-bold text-lg transition-all ${
                paymentAmount > 0 && !isProcessing
                  ? 'bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 text-white shadow-lg shadow-emerald-500/30 hover:shadow-emerald-500/50 hover:scale-[1.02] active:scale-[0.98]'
                  : theme === 'dark' ? 'bg-slate-800 text-slate-500 cursor-not-allowed' : 'bg-slate-100 text-slate-400 cursor-not-allowed'
              }`}
            >
              {isProcessing ? (
                <>
                  <div className="w-6 h-6 border-3 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Processing Payment...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-6 h-6" />
                  <span>Record Payment • {formatCurrency(paymentAmount)}</span>
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
