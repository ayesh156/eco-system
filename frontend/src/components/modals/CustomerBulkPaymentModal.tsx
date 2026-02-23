/**
 * Customer Bulk Payment Modal
 * World-Class credit balance settlement for Sri Lankan computer/mobile shops
 * 
 * Features:
 * - Record payment against total outstanding balance
 * - Multiple payment methods (Cash, Bank, Card, Cheque)
 * - Full/Partial payment with quick amount buttons
 * - Payment notes for reference
 * - Real-time balance calculation
 */

import React, { useState, useEffect } from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../ui/dialog';
import { 
  CreditCard, Banknote, Building2, Wallet, Check,
  AlertCircle, Loader2, Receipt, ArrowRight, CheckCircle2
} from 'lucide-react';
import type { Customer } from '../../data/mockData';

type PaymentMethod = 'cash' | 'bank' | 'card' | 'cheque';

interface CustomerBulkPaymentModalProps {
  isOpen: boolean;
  customer: Customer | null;
  onClose: () => void;
  onSubmit: (customerId: string, amount: number, paymentMethod: PaymentMethod, notes?: string) => Promise<void>;
}

const paymentMethodOptions: { value: PaymentMethod; label: string; icon: React.ReactNode; color: string }[] = [
  { value: 'cash', label: 'Cash', icon: <Banknote className="w-5 h-5" />, color: 'emerald' },
  { value: 'bank', label: 'Bank Transfer', icon: <Building2 className="w-5 h-5" />, color: 'blue' },
  { value: 'card', label: 'Card', icon: <CreditCard className="w-5 h-5" />, color: 'purple' },
  { value: 'cheque', label: 'Cheque', icon: <Wallet className="w-5 h-5" />, color: 'amber' },
];

export const CustomerBulkPaymentModal: React.FC<CustomerBulkPaymentModalProps> = ({
  isOpen,
  customer,
  onClose,
  onSubmit,
}) => {
  const { theme } = useTheme();
  
  // Form state
  const [amount, setAmount] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [notes, setNotes] = useState('');
  
  // UI state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen && customer) {
      setAmount('');
      setPaymentMethod('cash');
      setNotes('');
      setError(null);
      setSuccess(false);
    }
  }, [isOpen, customer]);

  const formatCurrency = (value: number) => `Rs. ${value.toLocaleString('en-LK')}`;

  const outstandingBalance = customer?.creditBalance || 0;
  const parsedAmount = parseFloat(amount) || 0;
  const remainingAfterPayment = outstandingBalance - parsedAmount;
  const isValidAmount = parsedAmount > 0 && parsedAmount <= outstandingBalance;

  const handleSubmit = async () => {
    if (!customer || !isValidAmount) return;

    setIsSubmitting(true);
    setError(null);

    try {
      await onSubmit(customer.id, parsedAmount, paymentMethod, notes.trim() || undefined);
      setSuccess(true);
      // Auto-close after success
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to record payment');
    } finally {
      setIsSubmitting(false);
    }
  };

  const setQuickAmount = (percentage: number) => {
    const quickAmount = Math.floor(outstandingBalance * (percentage / 100));
    setAmount(String(quickAmount));
  };

  if (!customer) return null;

  // Show message if no outstanding balance
  if (outstandingBalance <= 0) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className={`w-[95vw] max-w-lg p-0 overflow-hidden rounded-2xl ${
          theme === 'dark' ? 'bg-slate-900 border-slate-700/50' : 'bg-white border-slate-200'
        }`}>
          <DialogHeader className="sr-only">
            <DialogTitle>No Outstanding Balance</DialogTitle>
            <DialogDescription>This customer has no outstanding balance</DialogDescription>
          </DialogHeader>
          
          <div className="p-8 text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center">
              <CheckCircle2 className="w-8 h-8 text-white" />
            </div>
            <h3 className={`text-xl font-bold mb-2 ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
              All Clear! 🎉
            </h3>
            <p className={theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}>
              {customer.name} has no outstanding balance.
            </p>
            <button
              onClick={onClose}
              className="mt-6 px-6 py-2.5 rounded-xl font-medium bg-gradient-to-r from-emerald-500 to-teal-500 text-white"
            >
              Close
            </button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className={`w-[95vw] max-w-lg p-0 overflow-hidden rounded-2xl ${
        theme === 'dark' ? 'bg-slate-900 border-slate-700/50' : 'bg-white border-slate-200'
      }`}>
        <DialogHeader className="sr-only">
          <DialogTitle>Record Credit Payment</DialogTitle>
          <DialogDescription>Record a payment for {customer.name}'s outstanding balance</DialogDescription>
        </DialogHeader>

        {/* Success State */}
        {success ? (
          <div className="p-8 text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center">
              <CheckCircle2 className="w-8 h-8 text-white" />
            </div>
            <h3 className={`text-xl font-bold mb-2 ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
              Payment Recorded!
            </h3>
            <p className={theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}>
              {formatCurrency(parsedAmount)} paid successfully
            </p>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="relative overflow-hidden bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 p-3 sm:p-5 text-white">
              <div className="absolute inset-0 overflow-hidden">
                <div className="absolute -top-6 -right-6 w-24 h-24 bg-white/10 rounded-full blur-2xl" />
                <div className="absolute -bottom-4 -left-4 w-16 h-16 bg-white/10 rounded-full blur-xl" />
              </div>
              <div className="relative flex items-center gap-2.5 sm:gap-4">
                <div className="w-9 h-9 sm:w-12 sm:h-12 bg-white/20 backdrop-blur rounded-xl flex-shrink-0 flex items-center justify-center font-bold text-sm sm:text-xl">
                  {customer.name.charAt(0)}
                </div>
                <div className="min-w-0">
                  <h2 className="text-base sm:text-lg font-bold">Record Credit Payment</h2>
                  <p className="text-xs sm:text-sm text-emerald-100 truncate">{customer.name}</p>
                </div>
              </div>
            </div>

            {/* Outstanding Balance Display */}
            <div className={`mx-3 sm:mx-5 mt-3 sm:mt-5 p-3 rounded-xl ${
              theme === 'dark' ? 'bg-red-500/10 border border-red-500/20' : 'bg-red-50 border border-red-100'
            }`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className={`text-[11px] sm:text-sm font-medium ${theme === 'dark' ? 'text-red-400' : 'text-red-600'}`}>
                    Outstanding Balance
                  </p>
                  <p className={`text-lg sm:text-2xl font-bold ${theme === 'dark' ? 'text-red-400' : 'text-red-600'}`}>
                    {formatCurrency(outstandingBalance)}
                  </p>
                </div>
                <Receipt className={`w-7 h-7 sm:w-10 sm:h-10 ${theme === 'dark' ? 'text-red-500/30' : 'text-red-200'}`} />
              </div>
            </div>

            {/* Error Alert */}
            {error && (
              <div className="mx-4 sm:mx-6 mt-4 p-3 sm:p-4 bg-red-500/10 border border-red-500/30 rounded-xl flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                <p className="text-red-500 text-sm">{error}</p>
              </div>
            )}

            {/* Form */}
            <div className="p-3 sm:p-5 space-y-3.5 sm:space-y-5">
              {/* Payment Amount */}
              <div className="space-y-1.5">
                <label className={`block text-xs sm:text-sm font-medium ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                  Payment Amount
                </label>
                <div className={`flex items-center gap-2 px-3 py-2.5 sm:py-3 rounded-xl border ${
                  theme === 'dark' ? 'bg-slate-800/50 border-slate-700/50' : 'bg-white border-slate-200'
                } ${!isValidAmount && amount ? 'border-red-500' : ''}`}>
                  <span className={`text-sm font-medium ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>Rs.</span>
                  <input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0"
                    max={outstandingBalance}
                    disabled={isSubmitting}
                    className={`flex-1 bg-transparent outline-none text-lg sm:text-xl font-semibold min-w-0 ${
                      theme === 'dark' ? 'text-white placeholder:text-slate-500' : 'text-slate-900 placeholder:text-slate-300'
                    }`}
                  />
                </div>
                
                {/* Quick Amount Buttons */}
                <div className="flex gap-1.5">
                  {[25, 50, 75, 100].map((percent) => (
                    <button
                      key={percent}
                      type="button"
                      onClick={() => setQuickAmount(percent)}
                      disabled={isSubmitting}
                      className={`flex-1 px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg text-[11px] sm:text-sm font-medium transition-all ${
                        parsedAmount === Math.floor(outstandingBalance * (percent / 100))
                          ? 'bg-emerald-500 text-white'
                          : theme === 'dark'
                            ? 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {percent}%
                    </button>
                  ))}
                </div>
              </div>

              {/* Payment Method */}
              <div className="space-y-1.5">
                <label className={`block text-xs sm:text-sm font-medium ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                  Payment Method
                </label>
                <div className="grid grid-cols-2 gap-1.5 sm:gap-2">
                  {paymentMethodOptions.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setPaymentMethod(option.value)}
                      disabled={isSubmitting}
                      className={`flex items-center gap-1.5 px-2.5 py-2 sm:px-4 sm:py-3 rounded-xl border transition-all ${
                        paymentMethod === option.value
                          ? `bg-${option.color}-500/10 border-${option.color}-500/50 text-${option.color}-500`
                          : theme === 'dark'
                            ? 'bg-slate-800/50 border-slate-700/50 text-slate-300 hover:bg-slate-700/50'
                            : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                      } ${paymentMethod === option.value && 'ring-2 ring-emerald-500/20'}`}
                    >
                      {option.icon}
                      <span className="font-medium text-xs sm:text-sm">{option.label}</span>
                      {paymentMethod === option.value && (
                        <Check className="w-4 h-4 ml-auto" />
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Notes */}
              <div className="space-y-1.5">
                <label className={`block text-xs sm:text-sm font-medium ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                  Payment Notes (Optional)
                </label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g., Cash received by Kasun"
                  disabled={isSubmitting}
                  className={`w-full px-3 sm:px-4 py-2.5 sm:py-3 rounded-xl border text-sm ${
                    theme === 'dark'
                      ? 'bg-slate-800/50 border-slate-700/50 text-white placeholder:text-slate-500'
                      : 'bg-white border-slate-200 text-slate-900 placeholder:text-slate-400'
                  }`}
                />
              </div>

              {/* Balance Preview */}
              {isValidAmount && (
                <div className={`p-3 sm:p-4 rounded-xl ${
                  theme === 'dark' ? 'bg-slate-800/50 border border-slate-700/50' : 'bg-slate-50 border border-slate-200'
                }`}>
                  <div className="flex items-center justify-between text-xs sm:text-sm">
                    <div>
                      <p className={theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}>Current Balance</p>
                      <p className={`font-semibold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                        {formatCurrency(outstandingBalance)}
                      </p>
                    </div>
                    <ArrowRight className={`w-5 h-5 ${theme === 'dark' ? 'text-slate-600' : 'text-slate-300'}`} />
                    <div>
                      <p className={theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}>After Payment</p>
                      <p className={`font-semibold ${
                        remainingAfterPayment === 0
                          ? 'text-emerald-500'
                          : theme === 'dark' ? 'text-amber-400' : 'text-amber-600'
                      }`}>
                        {formatCurrency(remainingAfterPayment)}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className={`flex items-center justify-between gap-2 sm:gap-3 p-3 sm:p-5 border-t ${
              theme === 'dark' ? 'border-slate-800 bg-slate-900/50' : 'border-slate-200 bg-slate-50'
            }`}>
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className={`px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl text-xs sm:text-sm font-medium transition-colors ${
                  theme === 'dark'
                    ? 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                    : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                }`}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={!isValidAmount || isSubmitting}
                className={`flex items-center gap-2 px-4 sm:px-6 py-2.5 rounded-xl font-medium transition-all ${
                  isValidAmount && !isSubmitting
                    ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white hover:shadow-lg hover:shadow-emerald-500/25'
                    : theme === 'dark'
                      ? 'bg-slate-700 text-slate-500 cursor-not-allowed'
                      : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                }`}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Recording...
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    Record Payment
                  </>
                )}
              </button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default CustomerBulkPaymentModal;
