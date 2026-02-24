import React, { useState, useEffect } from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import type { Invoice } from '../../data/mockData';
import { 
  X, CheckCircle, AlertTriangle, Sparkles, Calculator, Calendar,
  CreditCard, FileCheck, Receipt,
  Clock, TrendingUp, History, User,
  DollarSign, Percent, Zap, ChevronLeft, ChevronRight
} from 'lucide-react';

interface InvoicePaymentModalProps {
  isOpen: boolean;
  invoice: Invoice | null;
  onClose: () => void;
  onPayment: (invoiceId: string, amount: number, paymentMethod: string, notes?: string, paymentDateTime?: string) => Promise<void> | void;
  isProcessing?: boolean;
}

export const InvoicePaymentModal: React.FC<InvoicePaymentModalProps> = ({
  isOpen,
  invoice,
  onClose,
  onPayment,
  isProcessing: externalProcessing = false,
}) => {
  const { theme } = useTheme();
  const [paymentAmount, setPaymentAmount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<string>('cash');
  const [paymentNotes, setPaymentNotes] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [activeTab, setActiveTab] = useState<'payment' | 'history'>('payment');
  
  // Use invoice payments directly for real-time updates
  const paymentHistory = invoice?.payments || [];
  
  // Date/Time picker states
  const [paymentDate, setPaymentDate] = useState<string>('');
  const [paymentTime, setPaymentTime] = useState<string>('');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState(new Date());

  const remainingAmount = invoice ? invoice.total - (invoice.paidAmount || 0) : 0;

  // Check if this is a walk-in customer invoice (no partial/credit payments allowed)
  const isWalkInInvoice = invoice?.customerId === 'walk-in' || 
                          invoice?.customerName?.toLowerCase().includes('walk-in') ||
                          invoice?.customerName?.toLowerCase().includes('walkin');

  useEffect(() => {
    if (invoice) {
      // For walk-in invoices, always set to full remaining amount (no partial allowed)
      setPaymentAmount(remainingAmount);
      setPaymentNotes('');
      // Set current date and time as default
      const now = new Date();
      setPaymentDate(formatDateForInput(now));
      setPaymentTime(formatTimeForInput(now));
      setCalendarMonth(now);
    }
    setShowSuccess(false);
    setIsProcessing(false);
    setActiveTab('payment');
  }, [invoice, isOpen, remainingAmount]);

  const formatCurrency = (amount: number) => `Rs. ${amount.toLocaleString('en-LK')}`;

  const formatShortDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const formatDateTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const dateFormatted = date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    const timeFormatted = date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
    return { date: dateFormatted, time: timeFormatted };
  };

  const formatDateForInput = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const formatTimeForInput = (date: Date): string => {
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
  };

  const formatDateDisplay = (dateString: string): string => {
    if (!dateString) return 'Select date';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  const formatTimeDisplay = (timeString: string): string => {
    if (!timeString) return '';
    const [hours, minutes] = timeString.split(':').map(Number);
    const period = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
    return `${displayHours}:${String(minutes).padStart(2, '0')} ${period}`;
  };

  // Calendar helper functions
  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();
    
    const days: (Date | null)[] = [];
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(new Date(year, month, i));
    }
    return days;
  };

  const isSelectedDate = (date: Date, selectedDateStr: string) => {
    if (!selectedDateStr || !date) return false;
    const selected = new Date(selectedDateStr);
    return date.getDate() === selected.getDate() &&
           date.getMonth() === selected.getMonth() &&
           date.getFullYear() === selected.getFullYear();
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return date.getDate() === today.getDate() &&
           date.getMonth() === today.getMonth() &&
           date.getFullYear() === today.getFullYear();
  };

  const handleDateSelect = (date: Date) => {
    setPaymentDate(formatDateForInput(date));
    setShowDatePicker(false);
  };

  const handlePayment = async () => {
    if (!invoice || paymentAmount <= 0 || isProcessing || externalProcessing) return;
    
    setIsProcessing(true);
    
    try {
      // Combine date and time into ISO string
      const paymentDateTime = paymentDate && paymentTime 
        ? new Date(`${paymentDate}T${paymentTime}:00`).toISOString()
        : new Date().toISOString();
      
      // Call the parent handler and wait for it to complete
      await onPayment(invoice.id, paymentAmount, paymentMethod, paymentNotes, paymentDateTime);
      setShowSuccess(true);
      
      // Wait for success animation, then switch to history tab to show the new payment
      setTimeout(() => {
        setShowSuccess(false);
        setIsProcessing(false);
        setActiveTab('history'); // Switch to history tab to show the newly added payment
        // Reset payment form
        setPaymentAmount(0);
        setPaymentMethod('cash');
        setPaymentNotes('');
        const now = new Date();
        setPaymentDate(formatDateForInput(now));
        setPaymentTime(formatTimeForInput(now));
      }, 1500);
    } catch (error) {
      // Error handling is done in parent component
      setIsProcessing(false);
    }
  };

  // Quick amounts - disabled for walk-in customers (must pay full)
  const quickAmounts = invoice && !isWalkInInvoice ? [
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

  // Payment method colors for history
  const getPaymentMethodColors = (method: string) => {
    switch (method) {
      case 'cash':
        return { bg: 'from-emerald-500/20 to-green-500/20', border: 'border-emerald-500/30', icon: 'bg-gradient-to-br from-emerald-500 to-green-600', text: 'text-emerald-400' };
      case 'card':
        return { bg: 'from-blue-500/20 to-cyan-500/20', border: 'border-blue-500/30', icon: 'bg-gradient-to-br from-blue-500 to-cyan-600', text: 'text-blue-400' };
      case 'bank':
        return { bg: 'from-violet-500/20 to-purple-500/20', border: 'border-violet-500/30', icon: 'bg-gradient-to-br from-violet-500 to-purple-600', text: 'text-violet-400' };
      case 'cheque':
        return { bg: 'from-amber-500/20 to-orange-500/20', border: 'border-amber-500/30', icon: 'bg-gradient-to-br from-amber-500 to-orange-600', text: 'text-amber-400' };
      default:
        return { bg: 'from-slate-500/20 to-gray-500/20', border: 'border-slate-500/30', icon: 'bg-gradient-to-br from-slate-500 to-gray-600', text: 'text-slate-400' };
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200">
      {/* Backdrop with blur */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal - Full screen on mobile, centered on desktop */}
      <div className={`relative w-full sm:max-w-lg h-[100dvh] sm:h-auto sm:max-h-[90vh] rounded-none sm:rounded-3xl shadow-2xl animate-in zoom-in-95 duration-200 flex flex-col overflow-hidden ${
        theme === 'dark' ? 'bg-slate-900' : 'bg-white'
      }`}>
        {/* Success Overlay - Beautiful Animation */}
        {showSuccess && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-gradient-to-br from-emerald-500 via-teal-500 to-teal-500 animate-in fade-in zoom-in duration-300">
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

        {/* Scrollable content area - header scrolls away for more room */}
        <div className="flex-1 overflow-y-auto min-h-0">
        {/* Header with Gradient */}
        <div className="relative overflow-hidden">
          <div className={`absolute inset-0 ${
            isOverdue 
              ? 'bg-gradient-to-br from-rose-500 via-pink-600 to-red-700' 
              : invoice.status === 'halfpay'
                ? 'bg-gradient-to-br from-violet-500 via-purple-600 to-indigo-700'
                : 'bg-gradient-to-br from-cyan-500 via-teal-600 to-emerald-700'
          }`} />
          {/* Modern mesh gradient overlay */}
          <div className="absolute inset-0">
            <div className={`absolute inset-0 opacity-30 ${
              isOverdue 
                ? 'bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-orange-400 via-transparent to-transparent'
                : invoice.status === 'halfpay'
                  ? 'bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-pink-400 via-transparent to-transparent'
                  : 'bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-blue-400 via-transparent to-transparent'
            }`} />
            <div className={`absolute inset-0 opacity-20 ${
              isOverdue 
                ? 'bg-[radial-gradient(ellipse_at_bottom_left,_var(--tw-gradient-stops))] from-yellow-400 via-transparent to-transparent'
                : invoice.status === 'halfpay'
                  ? 'bg-[radial-gradient(ellipse_at_bottom_left,_var(--tw-gradient-stops))] from-cyan-400 via-transparent to-transparent'
                  : 'bg-[radial-gradient(ellipse_at_bottom_left,_var(--tw-gradient-stops))] from-emerald-400 via-transparent to-transparent'
            }`} />
          </div>
          {/* Decorative shapes */}
          <div className="absolute inset-0 overflow-hidden">
            <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/10 rounded-full blur-2xl" />
            <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-white/10 rounded-full blur-xl" />
          </div>
          
          <div className="relative px-4 py-3 sm:px-6 sm:py-5">
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1.5 sm:mb-2">
                  <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-white/20 backdrop-blur flex items-center justify-center flex-shrink-0">
                    <Receipt className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white" />
                  </div>
                  <div className="min-w-0">
                    <span className="text-white/80 text-xs sm:text-sm font-medium">Invoice Payment</span>
                    <span className="text-white/60 text-xs sm:text-sm ml-1.5 sm:ml-2">#{invoice.id}</span>
                  </div>
                </div>
                <h2 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2 truncate">
                  <User className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />
                  <span className="truncate">{invoice.customerName}</span>
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
                className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center text-white hover:bg-white/30 transition-all hover:scale-105 flex-shrink-0"
              >
                <X className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>
            </div>

            {/* Invoice Summary Card */}
            <div className="mt-3 sm:mt-4 p-3 sm:p-4 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/10">
              <div className="grid grid-cols-3 gap-2 sm:gap-4 text-center">
                <div>
                  <div className="text-white/60 text-[10px] sm:text-xs mb-0.5 sm:mb-1">Total</div>
                  <div className="text-sm sm:text-lg font-bold text-white">{formatCurrency(invoice.total)}</div>
                </div>
                <div>
                  <div className="text-white/60 text-[10px] sm:text-xs mb-0.5 sm:mb-1">Paid</div>
                  <div className="text-sm sm:text-lg font-bold text-emerald-300">{formatCurrency(invoice.paidAmount || 0)}</div>
                </div>
                <div>
                  <div className="text-white/60 text-[10px] sm:text-xs mb-0.5 sm:mb-1">Balance</div>
                  <div className="text-sm sm:text-lg font-bold text-amber-300">{formatCurrency(remainingAmount)}</div>
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
        <div className={`flex border-b sticky top-0 z-10 ${theme === 'dark' ? 'border-slate-700/50 bg-slate-900' : 'border-slate-200 bg-white'}`}>
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
            <div className="p-4 sm:p-6 space-y-4 sm:space-y-5">
              {/* Quick Amount Selection */}
              <div>
                <label className={`flex items-center gap-2 text-sm font-semibold mb-3 ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                  <Zap className="w-4 h-4 text-amber-500" />
                  Quick Select
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
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

              {/* Custom Amount Input - Read-only for walk-in */}
              <div>
                <label className={`flex items-center gap-2 text-sm font-semibold mb-2 ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                  <Calculator className="w-4 h-4 text-purple-500" />
                  {isWalkInInvoice ? 'Payment Amount (Full Payment Required)' : 'Custom Amount'}
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
                    onChange={(e) => !isWalkInInvoice && setPaymentAmount(Math.min(Number(e.target.value), remainingAmount))}
                    max={remainingAmount}
                    min={0}
                    readOnly={isWalkInInvoice}
                    className={`w-full pl-14 pr-4 py-3 sm:py-4 rounded-xl border-2 text-xl sm:text-2xl font-bold transition-all ${
                      isWalkInInvoice
                        ? 'cursor-not-allowed opacity-75 ' + (theme === 'dark' ? 'bg-slate-900 border-slate-700 text-slate-400' : 'bg-slate-100 border-slate-300 text-slate-500')
                        : theme === 'dark'
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
                {isWalkInInvoice && (
                  <p className={`text-xs mt-2 flex items-center gap-1 ${theme === 'dark' ? 'text-amber-400' : 'text-amber-600'}`}>
                    <AlertTriangle className="w-3 h-3" />
                    Walk-in customers must pay the full amount. Partial payments are not allowed.
                  </p>
                )}
              </div>

              {/* Payment Method Selection */}
              <div>
                <label className={`flex items-center gap-2 text-sm font-semibold mb-3 ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                  <CreditCard className="w-4 h-4 text-blue-500" />
                  Payment Method
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {paymentMethods.map(({ value, label, emoji, color }) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setPaymentMethod(value)}
                      className={`flex flex-col items-center gap-1.5 sm:gap-2 p-2.5 sm:p-3 rounded-xl border-2 transition-all ${
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
                      <span className="text-xl sm:text-2xl">{emoji}</span>
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

              {/* Payment Date & Time */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Date Picker */}
                <div className="relative">
                  <label className={`flex items-center gap-2 text-sm font-semibold mb-2 ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                    <Calendar className="w-4 h-4 text-cyan-500" />
                    Payment Date
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowDatePicker(!showDatePicker)}
                    className={`w-full px-4 py-3 rounded-xl border text-left flex items-center justify-between transition-all ${
                      theme === 'dark'
                        ? 'bg-slate-800/50 border-slate-700 text-white hover:bg-slate-800'
                        : 'bg-white border-slate-200 text-slate-900 hover:bg-slate-50'
                    }`}
                  >
                    <span>{formatDateDisplay(paymentDate)}</span>
                    <Calendar className="w-4 h-4 opacity-50" />
                  </button>
                  
                  {/* Calendar Dropdown */}
                  {showDatePicker && (
                    <div className={`absolute top-full left-0 right-0 mt-2 p-3 rounded-xl border shadow-xl z-50 ${
                      theme === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'
                    }`}>
                      {/* Calendar Header */}
                      <div className="flex items-center justify-between mb-3">
                        <button
                          type="button"
                          onClick={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() - 1, 1))}
                          className={`p-1.5 rounded-lg transition-colors ${
                            theme === 'dark' ? 'hover:bg-slate-700 text-slate-400' : 'hover:bg-slate-100 text-slate-600'
                          }`}
                        >
                          <ChevronLeft className="w-4 h-4" />
                        </button>
                        <span className={`text-sm font-semibold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                          {calendarMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                        </span>
                        <button
                          type="button"
                          onClick={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 1))}
                          className={`p-1.5 rounded-lg transition-colors ${
                            theme === 'dark' ? 'hover:bg-slate-700 text-slate-400' : 'hover:bg-slate-100 text-slate-600'
                          }`}
                        >
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      </div>
                      {/* Calendar Grid */}
                      <div className="grid grid-cols-7 gap-1">
                        {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((day) => (
                          <div key={day} className={`text-center text-xs font-medium py-1.5 ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>
                            {day}
                          </div>
                        ))}
                        {getDaysInMonth(calendarMonth).map((date, index) => (
                          <button
                            key={index}
                            type="button"
                            onClick={() => date && handleDateSelect(date)}
                            disabled={!date}
                            className={`text-xs py-1.5 rounded-lg transition-all ${
                              !date ? 'invisible' :
                              isSelectedDate(date, paymentDate)
                                ? 'bg-gradient-to-br from-cyan-500 to-blue-500 text-white font-semibold'
                                : isToday(date)
                                  ? theme === 'dark' 
                                    ? 'bg-cyan-500/20 text-cyan-400 font-medium' 
                                    : 'bg-cyan-100 text-cyan-600 font-medium'
                                  : theme === 'dark'
                                    ? 'hover:bg-slate-700 text-slate-300'
                                    : 'hover:bg-slate-100 text-slate-700'
                            }`}
                          >
                            {date?.getDate()}
                          </button>
                        ))}
                      </div>
                      {/* Quick Actions */}
                      <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-700/50">
                        <button
                          type="button"
                          onClick={() => handleDateSelect(new Date())}
                          className={`text-xs px-3 py-1.5 rounded-lg transition-colors ${
                            theme === 'dark' ? 'hover:bg-slate-700 text-cyan-400' : 'hover:bg-slate-100 text-cyan-600'
                          }`}
                        >
                          Today
                        </button>
                        <button
                          type="button"
                          onClick={() => setShowDatePicker(false)}
                          className={`text-xs px-3 py-1.5 rounded-lg transition-colors ${
                            theme === 'dark' ? 'bg-slate-700 text-white' : 'bg-slate-200 text-slate-800'
                          }`}
                        >
                          Done
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Time Picker */}
                <div>
                  <label className={`flex items-center gap-2 text-sm font-semibold mb-2 ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                    <Clock className={`w-4 h-4 ${theme === 'dark' ? 'text-white' : 'text-slate-700'}`} />
                    Payment Time
                  </label>
                  <div className="relative">
                    <input
                      type="time"
                      value={paymentTime}
                      onChange={(e) => setPaymentTime(e.target.value)}
                      style={theme === 'dark' ? { colorScheme: 'dark' } : undefined}
                      className={`w-full px-4 py-3 rounded-xl border transition-all ${
                        theme === 'dark'
                          ? 'bg-slate-800/50 border-slate-700 text-white focus:border-pink-500 focus:ring-2 focus:ring-pink-500/20'
                          : 'bg-white border-slate-200 text-slate-900 focus:border-pink-500 focus:ring-2 focus:ring-pink-500/20'
                      }`}
                    />
                    <div className={`absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium px-2 py-1 rounded hidden sm:flex items-center ${
                      theme === 'dark' ? 'bg-pink-500/20 text-pink-400' : 'bg-pink-100 text-pink-600'
                    }`}>
                      {formatTimeDisplay(paymentTime)}
                    </div>
                  </div>
                </div>
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
            <div className="p-4 sm:p-6">
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
                <div className="space-y-2.5 sm:space-y-3">
                  {paymentHistory.map((payment, index) => {
                    const methodColors = getPaymentMethodColors(payment.paymentMethod);
                    const { date: formattedDate, time: formattedTime } = formatDateTime(payment.paymentDate);
                    
                    return (
                      <div 
                        key={payment.id}
                        className={`relative p-3 sm:p-4 rounded-xl sm:rounded-2xl border overflow-hidden transition-all hover:scale-[1.01] ${
                          theme === 'dark' 
                            ? `bg-gradient-to-r ${methodColors.bg} ${methodColors.border}` 
                            : 'bg-white border-slate-200 hover:border-slate-300 shadow-sm'
                        }`}
                      >
                        {/* Decorative accent */}
                        <div className={`absolute left-0 top-0 bottom-0 w-1 ${methodColors.icon}`} />
                        
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                            <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex-shrink-0 flex items-center justify-center text-lg sm:text-xl shadow-lg ${methodColors.icon}`}>
                              {payment.paymentMethod === 'cash' ? '💵' : 
                               payment.paymentMethod === 'card' ? '💳' : 
                               payment.paymentMethod === 'bank' ? '🏦' : '📝'}
                            </div>
                            <div className="min-w-0">
                              <div className={`text-base sm:text-lg font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                                {formatCurrency(payment.amount)}
                              </div>
                              <div className={`flex items-center gap-1.5 sm:gap-2 text-[11px] sm:text-xs ${methodColors.text}`}>
                                <span className="font-medium">
                                  {payment.paymentMethod.charAt(0).toUpperCase() + payment.paymentMethod.slice(1)}
                                </span>
                                <span className="opacity-50">•</span>
                                <span className={`${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                                  #{index + 1}
                                </span>
                              </div>
                            </div>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <div className={`flex items-center gap-1 sm:gap-1.5 text-xs sm:text-sm font-semibold ${theme === 'dark' ? 'text-white' : 'text-slate-800'}`}>
                              <Calendar className="w-3 h-3 sm:w-3.5 sm:h-3.5 opacity-60" />
                              {formattedDate}
                            </div>
                            <div className={`flex items-center gap-1 sm:gap-1.5 text-[11px] sm:text-xs mt-0.5 sm:mt-1 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                              <Clock className="w-2.5 h-2.5 sm:w-3 sm:h-3 opacity-60" />
                              {formattedTime}
                            </div>
                          </div>
                        </div>
                        {payment.notes && (
                          <div className={`mt-3 pt-3 border-t text-sm flex items-start gap-2 ${
                            theme === 'dark' ? 'border-white/10 text-slate-300' : 'border-slate-100 text-slate-600'
                          }`}>
                            <span className="text-base">📝</span>
                            <span className="italic">{payment.notes}</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                  
                  {/* Total Paid Summary */}
                  <div className={`mt-3 sm:mt-4 p-4 sm:p-5 rounded-xl sm:rounded-2xl ${
                    theme === 'dark' 
                      ? 'bg-gradient-to-r from-emerald-500/20 via-teal-500/20 to-teal-500/20 border border-emerald-500/30' 
                      : 'bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200'
                  }`}>
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5 sm:gap-3">
                        <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex-shrink-0 flex items-center justify-center ${
                          theme === 'dark' ? 'bg-emerald-500/30' : 'bg-emerald-100'
                        }`}>
                          <CheckCircle className={`w-4 h-4 sm:w-5 sm:h-5 ${theme === 'dark' ? 'text-emerald-400' : 'text-emerald-600'}`} />
                        </div>
                        <div>
                          <span className={`text-sm font-medium ${theme === 'dark' ? 'text-emerald-300' : 'text-emerald-700'}`}>
                            Total Paid
                          </span>
                          <div className={`text-[11px] sm:text-xs ${theme === 'dark' ? 'text-emerald-400/70' : 'text-emerald-600/70'}`}>
                            {paymentHistory.length} payment{paymentHistory.length !== 1 ? 's' : ''}
                          </div>
                        </div>
                      </div>
                      <span className={`text-xl sm:text-2xl font-bold ${theme === 'dark' ? 'text-emerald-400' : 'text-emerald-600'}`}>
                        {formatCurrency(paymentHistory.reduce((sum, p) => sum + p.amount, 0))}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
        </div>

        {/* Footer - Pay Button */}
        {activeTab === 'payment' && (
          <div className={`px-4 sm:px-6 py-3 sm:py-4 border-t flex-shrink-0 ${theme === 'dark' ? 'border-slate-800' : 'border-slate-200'}`}>
            <button
              onClick={handlePayment}
              disabled={paymentAmount <= 0 || isProcessing}
              className={`w-full flex items-center justify-center gap-2 sm:gap-3 py-3.5 sm:py-4 rounded-xl font-bold text-base sm:text-lg transition-all ${
                paymentAmount > 0 && !isProcessing
                  ? 'bg-gradient-to-r from-emerald-500 via-teal-500 to-teal-500 text-white shadow-lg shadow-emerald-500/30 hover:shadow-emerald-500/50 hover:scale-[1.02] active:scale-[0.98]'
                  : theme === 'dark' ? 'bg-slate-800 text-slate-500 cursor-not-allowed' : 'bg-slate-100 text-slate-400 cursor-not-allowed'
              }`}
            >
              {isProcessing ? (
                <>
                  <div className="w-5 h-5 sm:w-6 sm:h-6 border-3 border-white/30 border-t-white rounded-full animate-spin" />
                  <span className="text-sm sm:text-base">Processing...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5 sm:w-6 sm:h-6" />
                  <span className="text-sm sm:text-base">Record Payment • {formatCurrency(paymentAmount)}</span>
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
