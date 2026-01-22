import React, { useState, useEffect } from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import type { Supplier } from '../../data/mockData';
import { 
  X, CreditCard, Banknote, Wallet, CheckCircle, 
  AlertTriangle, Sparkles, Calculator, Calendar
} from 'lucide-react';

interface CreditPaymentModalProps {
  isOpen: boolean;
  supplier: Supplier | null;
  onClose: () => void;
  onPayment: (supplierId: string, amount: number, paymentMethod: string) => void;
}

export const CreditPaymentModal: React.FC<CreditPaymentModalProps> = ({
  isOpen,
  supplier,
  onClose,
  onPayment,
}) => {
  const { theme } = useTheme();
  const [paymentAmount, setPaymentAmount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<string>('cash');
  const [isProcessing, setIsProcessing] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  useEffect(() => {
    if (supplier) {
      setPaymentAmount(supplier.creditBalance);
    }
    setShowSuccess(false);
    setIsProcessing(false);
  }, [supplier, isOpen]);

  const formatCurrency = (amount: number) => `Rs. ${amount.toLocaleString('en-LK')}`;

  const handlePayment = async () => {
    if (!supplier || paymentAmount <= 0) return;
    
    setIsProcessing(true);
    // Simulate payment processing
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    onPayment(supplier.id, paymentAmount, paymentMethod);
    setShowSuccess(true);
    
    setTimeout(() => {
      onClose();
    }, 2000);
  };

  const quickAmounts = supplier ? [
    { label: 'Full', value: supplier.creditBalance },
    { label: '50%', value: Math.round(supplier.creditBalance / 2) },
    { label: '25%', value: Math.round(supplier.creditBalance / 4) },
  ] : [];

  if (!isOpen || !supplier) return null;

  const remainingAfterPayment = Math.max(0, supplier.creditBalance - paymentAmount);
  const isOverdue = supplier.creditStatus === 'overdue';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal - Full scroll */}
      <div className={`relative w-full max-w-md max-h-[90vh] overflow-y-auto rounded-3xl shadow-2xl animate-in zoom-in-95 duration-200 ${
        theme === 'dark' ? 'bg-slate-900' : 'bg-white'
      }`}>
        {/* Success Overlay */}
        {showSuccess && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-gradient-to-br from-emerald-500 to-teal-600 animate-in fade-in zoom-in duration-300">
            <div className="w-20 h-20 rounded-full bg-white/20 flex items-center justify-center mb-4 animate-bounce">
              <CheckCircle className="w-12 h-12 text-white" />
            </div>
            <h3 className="text-2xl font-bold text-white mb-2">Payment Successful!</h3>
            <p className="text-white/80">{formatCurrency(paymentAmount)} paid</p>
          </div>
        )}

        {/* Header */}
        <div className="relative overflow-hidden">
          <div className={`absolute inset-0 ${
            isOverdue 
              ? 'bg-gradient-to-r from-red-600 via-rose-600 to-pink-600' 
              : 'bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600'
          }`} />
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4xIj48cGF0aCBkPSJNMzYgMzRoLTJ2LTRoMnY0em0wLTZ2LTRoLTJ2NGgyek0zNCAyNmgtMnYtNGgydjR6Ii8+PC9nPjwvZz48L3N2Zz4=')] opacity-30" />
          
          <div className="relative px-6 py-5">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <CreditCard className="w-5 h-5 text-white" />
                  <span className="text-white/80 text-sm">Pay Credit</span>
                </div>
                <h2 className="text-xl font-bold text-white">{supplier.company}</h2>
                {isOverdue && (
                  <div className="flex items-center gap-1.5 mt-2 text-white/90 text-sm">
                    <AlertTriangle className="w-4 h-4" />
                    <span>⚠️ Payment is overdue!</span>
                  </div>
                )}
              </div>
              <button
                onClick={onClose}
                className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center text-white hover:bg-white/30 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Balance Display */}
            <div className="mt-4 p-4 rounded-2xl bg-white/10 backdrop-blur">
              <div className="text-white/70 text-sm mb-1">Outstanding Balance</div>
              <div className="text-3xl font-bold text-white">
                {formatCurrency(supplier.creditBalance)}
              </div>
              {supplier.creditDueDate && (
                <div className="flex items-center gap-1.5 mt-2 text-white/70 text-sm">
                  <Calendar className="w-4 h-4" />
                  Due: {new Date(supplier.creditDueDate).toLocaleDateString('en-GB')}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5">
          {/* Quick Amount Buttons */}
          <div>
            <label className={`block text-sm font-medium mb-3 ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
              Quick Select
            </label>
            <div className="grid grid-cols-3 gap-3">
              {quickAmounts.map(({ label, value }) => (
                <button
                  key={label}
                  type="button"
                  onClick={() => setPaymentAmount(value)}
                  className={`py-3 rounded-xl font-medium transition-all ${
                    paymentAmount === value
                      ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-lg shadow-emerald-500/30'
                      : theme === 'dark' 
                        ? 'bg-slate-800 text-slate-300 hover:bg-slate-700' 
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  <div className="text-sm opacity-70">{label}</div>
                  <div className="text-xs">{formatCurrency(value)}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Custom Amount */}
          <div>
            <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
              <Calculator className="w-4 h-4 inline mr-2" />
              Payment Amount
            </label>
            <div className="relative">
              <span className={`absolute left-4 top-1/2 -translate-y-1/2 font-medium ${theme === 'dark' ? 'text-emerald-400' : 'text-emerald-600'}`}>
                Rs.
              </span>
              <input
                type="number"
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(Math.min(Number(e.target.value), supplier.creditBalance))}
                max={supplier.creditBalance}
                className={`w-full pl-12 pr-4 py-4 rounded-xl border text-xl font-bold transition-all ${
                  theme === 'dark'
                    ? 'bg-slate-800/50 border-slate-700 text-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20'
                    : 'bg-white border-slate-200 text-slate-900 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20'
                }`}
              />
            </div>
          </div>

          {/* Payment Method */}
          <div>
            <label className={`block text-sm font-medium mb-3 ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
              Payment Method
            </label>
            <div className="grid grid-cols-3 gap-3">
              {[
                { value: 'cash', label: 'Cash', icon: Banknote, emoji: '💵' },
                { value: 'card', label: 'Card', icon: CreditCard, emoji: '💳' },
                { value: 'bank', label: 'Bank', icon: Wallet, emoji: '🏦' },
              ].map(({ value, label, emoji }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setPaymentMethod(value)}
                  className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
                    paymentMethod === value
                      ? 'border-emerald-500 bg-emerald-500/10'
                      : theme === 'dark' 
                        ? 'border-slate-700 hover:border-slate-600' 
                        : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <span className="text-2xl">{emoji}</span>
                  <span className={`text-sm font-medium ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                    {label}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* After Payment Preview */}
          <div className={`p-4 rounded-xl ${theme === 'dark' ? 'bg-slate-800/50' : 'bg-slate-50'}`}>
            <div className="flex justify-between items-center">
              <span className={`text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                Remaining after payment:
              </span>
              <span className={`font-bold ${
                remainingAfterPayment === 0 
                  ? 'text-emerald-500' 
                  : theme === 'dark' ? 'text-white' : 'text-slate-900'
              }`}>
                {remainingAfterPayment === 0 ? '✨ Fully Paid!' : formatCurrency(remainingAfterPayment)}
              </span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className={`px-6 py-4 border-t ${theme === 'dark' ? 'border-slate-800' : 'border-slate-200'}`}>
          <button
            onClick={handlePayment}
            disabled={paymentAmount <= 0 || isProcessing}
            className={`w-full flex items-center justify-center gap-2 py-4 rounded-xl font-bold text-lg transition-all ${
              paymentAmount > 0 && !isProcessing
                ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-lg shadow-emerald-500/30 hover:opacity-90'
                : theme === 'dark' ? 'bg-slate-800 text-slate-500' : 'bg-slate-100 text-slate-400'
            }`}
          >
            {isProcessing ? (
              <>
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5" />
                Pay {formatCurrency(paymentAmount)}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
