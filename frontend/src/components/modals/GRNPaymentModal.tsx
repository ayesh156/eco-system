import React, { useState, useEffect, useCallback } from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import type { GoodsReceivedNote } from '../../data/mockData';
import { 
  X, CheckCircle, CreditCard, Building2, Banknote, Wallet, Receipt,
  Loader2, TrendingUp, Calculator, History, Calendar
} from 'lucide-react';

interface PaymentRecord {
  id: string;
  amount: number;
  paymentMethod: string;
  sentAt: string;
  message?: string;
  notes?: string;
}

interface GRNPaymentModalProps {
  isOpen: boolean;
  grn: GoodsReceivedNote | null;
  onClose: () => void;
  onPayment: (grnId: string, amount: number, paymentMethod: string, notes?: string) => Promise<void>;
  isProcessing?: boolean;
}

const paymentMethods = [
  { id: 'cash', label: 'Cash', icon: Banknote, color: 'text-emerald-500', bgColor: 'bg-emerald-500/10' },
  { id: 'bank', label: 'Bank Transfer', icon: Building2, color: 'text-blue-500', bgColor: 'bg-blue-500/10' },
  { id: 'card', label: 'Card', icon: CreditCard, color: 'text-purple-500', bgColor: 'bg-purple-500/10' },
  { id: 'credit', label: 'Credit', icon: Wallet, color: 'text-orange-500', bgColor: 'bg-orange-500/10' },
  { id: 'cheque', label: 'Cheque', icon: Receipt, color: 'text-cyan-500', bgColor: 'bg-cyan-500/10' },
];

const getPaymentMethodConfig = (method: string) => {
  return paymentMethods.find(m => m.id === method) || paymentMethods[0];
};

export const GRNPaymentModal: React.FC<GRNPaymentModalProps> = ({
  isOpen,
  grn,
  onClose,
  onPayment,
  isProcessing: externalProcessing = false,
}) => {
  const { theme } = useTheme();
  const { user, isViewingShop, viewingShop } = useAuth();
  const shopId = isViewingShop && viewingShop ? viewingShop.id : user?.shop?.id;
  
  const [paymentAmount, setPaymentAmount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<string>('cash');
  const [paymentNotes, setPaymentNotes] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [paymentHistory, setPaymentHistory] = useState<PaymentRecord[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [activeTab, setActiveTab] = useState<'payment' | 'history'>('payment');

  const totalAmount = grn?.totalAmount || 0;
  const paidAmount = grn?.paidAmount || 0;
  const remainingAmount = totalAmount - paidAmount;

  // Load payment history
  const loadPaymentHistory = useCallback(async () => {
    if (!grn || !isOpen) return;
    
    const apiId = (grn as unknown as { apiId?: string }).apiId || grn.id;
    setIsLoadingHistory(true);
    
    try {
      const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api/v1';
      const token = localStorage.getItem('auth_token');
      
      const response = await fetch(`${API_BASE_URL}/grns/${apiId}/payments${shopId ? `?shopId=${shopId}` : ''}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      
      if (response.ok) {
        const result = await response.json();
        if (result.success && result.data) {
          setPaymentHistory(result.data);
        }
      }
    } catch (err) {
      console.error('Error loading payment history:', err);
    } finally {
      setIsLoadingHistory(false);
    }
  }, [grn, isOpen, shopId]);

  useEffect(() => {
    if (grn && isOpen) {
      setPaymentAmount(remainingAmount);
      setPaymentNotes('');
      setPaymentMethod('cash');
      setShowSuccess(false);
      setIsProcessing(false);
      setActiveTab('payment');
      loadPaymentHistory();
    }
  }, [grn, isOpen, remainingAmount, loadPaymentHistory]);

  const formatCurrency = (amount: number) => `Rs. ${amount.toLocaleString('en-LK')}`;
  
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-GB', { 
      day: '2-digit', 
      month: 'short', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handlePayment = async () => {
    if (!grn || paymentAmount <= 0 || isProcessing || externalProcessing) return;
    
    setIsProcessing(true);
    
    try {
      await onPayment(grn.id, paymentAmount, paymentMethod, paymentNotes || undefined);
      
      // Add to local history immediately
      const newPayment: PaymentRecord = {
        id: `temp-${Date.now()}`,
        amount: paymentAmount,
        paymentMethod,
        sentAt: new Date().toISOString(),
        notes: paymentNotes,
      };
      setPaymentHistory(prev => [newPayment, ...prev]);
      
      setShowSuccess(true);
      setTimeout(() => {
        onClose();
        setShowSuccess(false);
      }, 1500);
    } catch (error) {
      console.error('Payment failed:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const setQuickAmount = (percentage: number) => {
    setPaymentAmount(Math.round(remainingAmount * percentage));
  };

  if (!isOpen || !grn) return null;

  const paymentPercentage = totalAmount > 0 ? (paidAmount / totalAmount) * 100 : 0;
  const newPaymentPercentage = totalAmount > 0 ? ((paidAmount + paymentAmount) / totalAmount) * 100 : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className={`relative w-full max-w-lg max-h-[90vh] flex flex-col rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 ${
        theme === 'dark' ? 'bg-slate-900' : 'bg-white'
      }`}>
        {/* Success Overlay */}
        {showSuccess && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-emerald-500/90 backdrop-blur animate-in fade-in duration-300">
            <div className="text-center text-white">
              <CheckCircle className="w-16 h-16 mx-auto mb-4 animate-bounce" />
              <p className="text-2xl font-bold">Payment Recorded!</p>
              <p className="text-emerald-100 mt-2">{formatCurrency(paymentAmount)} paid</p>
            </div>
          </div>
        )}

        {/* Header */}
        <div className="relative overflow-hidden flex-shrink-0">
          <div className="absolute inset-0 bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600" />
          <div className="relative px-6 py-5">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-xl font-bold text-white">Record Payment</h2>
                <p className="text-white/80 text-sm mt-1">{grn.grnNumber} • {grn.supplierName}</p>
              </div>
              <button
                onClick={onClose}
                className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center text-white hover:bg-white/30 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Payment Progress */}
            <div className="mt-4 p-4 rounded-xl bg-white/10 backdrop-blur">
              <div className="flex justify-between items-center mb-2">
                <span className="text-white/80 text-sm">Payment Progress</span>
                <span className="text-white font-bold">{paymentPercentage.toFixed(0)}%</span>
              </div>
              <div className="h-3 rounded-full overflow-hidden bg-white/20">
                <div 
                  className="h-full rounded-full bg-white transition-all duration-500"
                  style={{ width: `${paymentPercentage}%` }}
                />
              </div>
              <div className="flex justify-between items-center mt-2 text-sm">
                <span className="text-white/70">Paid: {formatCurrency(paidAmount)}</span>
                <span className="text-white font-semibold">Remaining: {formatCurrency(remainingAmount)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className={`flex border-b ${theme === 'dark' ? 'border-slate-700' : 'border-slate-200'}`}>
          <button
            onClick={() => setActiveTab('payment')}
            className={`flex-1 py-3 px-4 text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
              activeTab === 'payment'
                ? theme === 'dark' 
                  ? 'text-emerald-400 border-b-2 border-emerald-400 bg-emerald-500/10' 
                  : 'text-emerald-600 border-b-2 border-emerald-600 bg-emerald-50'
                : theme === 'dark' ? 'text-slate-400 hover:text-slate-300' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <CreditCard className="w-4 h-4" />
            New Payment
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`flex-1 py-3 px-4 text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
              activeTab === 'history'
                ? theme === 'dark' 
                  ? 'text-emerald-400 border-b-2 border-emerald-400 bg-emerald-500/10' 
                  : 'text-emerald-600 border-b-2 border-emerald-600 bg-emerald-50'
                : theme === 'dark' ? 'text-slate-400 hover:text-slate-300' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <History className="w-4 h-4" />
            Payment History
            {paymentHistory.length > 0 && (
              <span className={`px-1.5 py-0.5 rounded-full text-xs ${
                theme === 'dark' ? 'bg-slate-700 text-slate-300' : 'bg-slate-200 text-slate-600'
              }`}>
                {paymentHistory.length}
              </span>
            )}
          </button>
        </div>

        {/* Content - Scrollable */}
        <div className="flex-1 overflow-y-auto">
          {activeTab === 'payment' ? (
            <div className="p-6 space-y-5">
              {/* Amount Input */}
              <div>
                <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                  Payment Amount
                </label>
                <div className="relative">
                  <span className={`absolute left-4 top-1/2 -translate-y-1/2 font-semibold ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                    Rs.
                  </span>
                  <input
                    type="number"
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(Number(e.target.value))}
                    max={remainingAmount}
                    min={0}
                    className={`w-full pl-12 pr-4 py-3 text-xl font-bold rounded-xl border transition-colors ${
                      theme === 'dark'
                        ? 'bg-slate-800 border-slate-700 text-white focus:border-emerald-500'
                        : 'bg-white border-slate-200 text-slate-900 focus:border-emerald-500'
                    } focus:ring-2 focus:ring-emerald-500/20`}
                  />
                </div>

                {/* Quick Amount Buttons */}
                <div className="flex gap-2 mt-3">
                  {[0.25, 0.5, 0.75, 1].map((pct) => (
                    <button
                      key={pct}
                      onClick={() => setQuickAmount(pct)}
                      className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
                        paymentAmount === Math.round(remainingAmount * pct)
                          ? 'bg-emerald-500 text-white'
                          : theme === 'dark'
                            ? 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                            : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      {pct === 1 ? 'Full' : `${pct * 100}%`}
                    </button>
                  ))}
                </div>
              </div>

              {/* Payment Method */}
              <div>
                <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                  Payment Method
                </label>
                <div className="grid grid-cols-5 gap-2">
                  {paymentMethods.map(({ id, label, icon: Icon, color, bgColor }) => (
                    <button
                      key={id}
                      onClick={() => setPaymentMethod(id)}
                      className={`flex flex-col items-center gap-1 p-3 rounded-xl border transition-all ${
                        paymentMethod === id
                          ? `${bgColor} border-current ${color}`
                          : theme === 'dark'
                            ? 'bg-slate-800/50 border-slate-700 text-slate-400 hover:border-slate-600'
                            : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300'
                      }`}
                    >
                      <Icon className="w-5 h-5" />
                      <span className="text-xs font-medium">{label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                  Notes (Optional)
                </label>
                <textarea
                  value={paymentNotes}
                  onChange={(e) => setPaymentNotes(e.target.value)}
                  placeholder="Add any payment notes..."
                  rows={2}
                  className={`w-full px-4 py-3 rounded-xl border resize-none ${
                    theme === 'dark'
                      ? 'bg-slate-800 border-slate-700 text-white placeholder-slate-500'
                      : 'bg-white border-slate-200 text-slate-900 placeholder-slate-400'
                  } focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500`}
                />
              </div>

              {/* Preview */}
              {paymentAmount > 0 && (
                <div className={`p-4 rounded-xl ${theme === 'dark' ? 'bg-slate-800/50' : 'bg-slate-50'}`}>
                  <div className="flex items-center gap-2 mb-2">
                    <Calculator className={`w-4 h-4 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`} />
                    <span className={`text-sm font-medium ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>After Payment</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <div>
                      <p className={`text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>New Paid Amount</p>
                      <p className={`text-lg font-bold ${theme === 'dark' ? 'text-emerald-400' : 'text-emerald-600'}`}>
                        {formatCurrency(paidAmount + paymentAmount)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className={`text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>Remaining</p>
                      <p className={`text-lg font-bold ${
                        remainingAmount - paymentAmount <= 0 
                          ? 'text-emerald-500' 
                          : theme === 'dark' ? 'text-amber-400' : 'text-amber-600'
                      }`}>
                        {formatCurrency(Math.max(0, remainingAmount - paymentAmount))}
                      </p>
                    </div>
                  </div>
                  <div className="mt-3">
                    <div className="flex justify-between items-center mb-1 text-xs">
                      <span className={theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}>Progress after payment</span>
                      <span className={`font-semibold ${
                        newPaymentPercentage >= 100 ? 'text-emerald-500' : 
                        newPaymentPercentage >= 50 ? 'text-amber-500' : 'text-red-500'
                      }`}>{newPaymentPercentage.toFixed(0)}%</span>
                    </div>
                    <div className={`h-2 rounded-full overflow-hidden ${theme === 'dark' ? 'bg-slate-700' : 'bg-slate-200'}`}>
                      <div 
                        className={`h-full rounded-full transition-all bg-gradient-to-r ${
                          newPaymentPercentage >= 100 ? 'from-emerald-500 to-teal-500' : 
                          newPaymentPercentage >= 50 ? 'from-amber-500 to-orange-500' : 'from-red-500 to-rose-500'
                        }`}
                        style={{ width: `${Math.min(newPaymentPercentage, 100)}%` }}
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* Payment History Tab */
            <div className="p-6">
              {isLoadingHistory ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className={`w-8 h-8 animate-spin ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`} />
                </div>
              ) : paymentHistory.length === 0 ? (
                <div className={`text-center py-12 rounded-xl ${theme === 'dark' ? 'bg-slate-800/30' : 'bg-slate-50'}`}>
                  <History className={`w-12 h-12 mx-auto mb-3 ${theme === 'dark' ? 'text-slate-600' : 'text-slate-400'}`} />
                  <p className={`font-medium ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>No payment history</p>
                  <p className={`text-sm mt-1 ${theme === 'dark' ? 'text-slate-500' : 'text-slate-500'}`}>
                    Payments will appear here after recording
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {paymentHistory.map((payment, index) => {
                    const methodConfig = getPaymentMethodConfig(payment.paymentMethod);
                    const MethodIcon = methodConfig.icon;
                    
                    return (
                      <div 
                        key={payment.id}
                        className={`p-4 rounded-xl border transition-all ${
                          index === 0 
                            ? theme === 'dark' 
                              ? 'bg-emerald-500/10 border-emerald-500/30' 
                              : 'bg-emerald-50 border-emerald-200'
                            : theme === 'dark' 
                              ? 'bg-slate-800/50 border-slate-700' 
                              : 'bg-white border-slate-200'
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${methodConfig.bgColor}`}>
                              <MethodIcon className={`w-5 h-5 ${methodConfig.color}`} />
                            </div>
                            <div>
                              <p className={`font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                                {formatCurrency(payment.amount)}
                              </p>
                              <div className="flex items-center gap-2 mt-0.5">
                                <span className={`text-xs px-2 py-0.5 rounded capitalize ${methodConfig.bgColor} ${methodConfig.color}`}>
                                  {payment.paymentMethod}
                                </span>
                                {index === 0 && (
                                  <span className="text-xs px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-500">
                                    Latest
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className={`flex items-center gap-1 text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                              <Calendar className="w-3 h-3" />
                              {formatDate(payment.sentAt)}
                            </div>
                          </div>
                        </div>
                        {(payment.notes || payment.message) && (
                          <p className={`mt-2 text-sm pl-13 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                            {payment.notes || payment.message}
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

        {/* Footer */}
        <div className={`px-6 py-4 border-t flex gap-3 flex-shrink-0 ${theme === 'dark' ? 'border-slate-700 bg-slate-800/50' : 'border-slate-200 bg-slate-50'}`}>
          <button
            onClick={onClose}
            disabled={isProcessing || externalProcessing}
            className={`flex-1 py-3 rounded-xl font-medium transition-colors ${
              theme === 'dark'
                ? 'bg-slate-700 text-white hover:bg-slate-600'
                : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
            }`}
          >
            Cancel
          </button>
          <button
            onClick={handlePayment}
            disabled={paymentAmount <= 0 || paymentAmount > remainingAmount || isProcessing || externalProcessing || remainingAmount <= 0}
            className={`flex-1 py-3 rounded-xl font-medium transition-all flex items-center justify-center gap-2 ${
              paymentAmount <= 0 || paymentAmount > remainingAmount || isProcessing || remainingAmount <= 0
                ? 'bg-slate-300 text-slate-500 cursor-not-allowed'
                : 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white hover:shadow-lg hover:shadow-emerald-500/25'
            }`}
          >
            {isProcessing || externalProcessing ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Processing...
              </>
            ) : remainingAmount <= 0 ? (
              <>
                <CheckCircle className="w-5 h-5" />
                Fully Paid
              </>
            ) : (
              <>
                <TrendingUp className="w-5 h-5" />
                Record Payment
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
