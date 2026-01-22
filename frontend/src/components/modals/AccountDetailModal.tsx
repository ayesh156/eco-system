import React, { useMemo } from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import type { CashAccount, CashTransaction, CashAccountType } from '../../data/mockData';
import { 
  X, Wallet, Banknote, Building2, PiggyBank, Landmark, 
  CreditCard, CircleDollarSign, Coins, HandCoins,
  TrendingUp, TrendingDown, ArrowLeftRight,
  CheckCircle2, XCircle, Edit, FileText
} from 'lucide-react';

interface AccountDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  account: CashAccount | null;
  transactions: CashTransaction[];
  onEdit?: (account: CashAccount) => void;
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

const formatDateTime = (dateString: string): string => {
  return new Date(dateString).toLocaleString('en-LK', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const getAccountIcon = (type: CashAccountType) => {
  switch (type) {
    case 'drawer': return Banknote;
    case 'cash_in_hand': return HandCoins;
    case 'business': return Building2;
    case 'bank': return Landmark;
    case 'mobile_wallet': return Wallet;
    case 'credit_card': return CreditCard;
    case 'savings': return PiggyBank;
    case 'investment': return CircleDollarSign;
    default: return Coins;
  }
};

const getAccountIconColor = (type: CashAccountType): string => {
  switch (type) {
    case 'drawer': return 'text-amber-500';
    case 'cash_in_hand': return 'text-emerald-500';
    case 'business': return 'text-blue-500';
    case 'bank': return 'text-indigo-500';
    case 'mobile_wallet': return 'text-purple-500';
    case 'credit_card': return 'text-rose-500';
    case 'savings': return 'text-teal-500';
    case 'investment': return 'text-cyan-500';
    default: return 'text-slate-500';
  }
};

const getAccountTypeLabel = (type: CashAccountType): string => {
  switch (type) {
    case 'drawer': return 'Cash Drawer';
    case 'cash_in_hand': return 'Cash in Hand';
    case 'business': return 'Business Fund';
    case 'bank': return 'Bank Account';
    case 'mobile_wallet': return 'Mobile Wallet';
    case 'credit_card': return 'Credit Card';
    case 'savings': return 'Savings Account';
    case 'investment': return 'Investment';
    default: return 'Other';
  }
};

const getAccountGradient = (type: CashAccountType, theme: string): string => {
  const isDark = theme === 'dark';
  switch (type) {
    case 'drawer': return isDark ? 'from-amber-500/20 to-orange-500/10' : 'from-amber-100 to-orange-50';
    case 'cash_in_hand': return isDark ? 'from-emerald-500/20 to-green-500/10' : 'from-emerald-100 to-green-50';
    case 'business': return isDark ? 'from-blue-500/20 to-indigo-500/10' : 'from-blue-100 to-indigo-50';
    case 'bank': return isDark ? 'from-indigo-500/20 to-purple-500/10' : 'from-indigo-100 to-purple-50';
    case 'mobile_wallet': return isDark ? 'from-purple-500/20 to-pink-500/10' : 'from-purple-100 to-pink-50';
    case 'credit_card': return isDark ? 'from-rose-500/20 to-red-500/10' : 'from-rose-100 to-red-50';
    case 'savings': return isDark ? 'from-teal-500/20 to-cyan-500/10' : 'from-teal-100 to-cyan-50';
    case 'investment': return isDark ? 'from-cyan-500/20 to-blue-500/10' : 'from-cyan-100 to-blue-50';
    default: return isDark ? 'from-slate-500/20 to-gray-500/10' : 'from-slate-100 to-gray-50';
  }
};

export const AccountDetailModal: React.FC<AccountDetailModalProps> = ({
  isOpen,
  onClose,
  account,
  transactions,
  onEdit,
}) => {
  const { theme } = useTheme();

  // Get transactions for this account
  const accountTransactions = useMemo(() => {
    if (!account) return [];
    return transactions
      .filter(t => t.accountId === account.id)
      .sort((a, b) => new Date(b.transactionDate).getTime() - new Date(a.transactionDate).getTime());
  }, [account, transactions]);

  // Calculate statistics
  const stats = useMemo(() => {
    if (!account) return { totalIncome: 0, totalExpense: 0, totalTransfers: 0, netFlow: 0 };
    
    let totalIncome = 0;
    let totalExpense = 0;
    let totalTransfers = 0;

    accountTransactions.forEach(t => {
      if (t.type === 'income') totalIncome += t.amount;
      else if (t.type === 'expense') totalExpense += t.amount;
      else if (t.type === 'transfer') totalTransfers += t.amount;
    });

    return {
      totalIncome,
      totalExpense,
      totalTransfers,
      netFlow: totalIncome - totalExpense,
    };
  }, [account, accountTransactions]);

  if (!account) return null;

  const Icon = getAccountIcon(account.type);
  const iconColor = getAccountIconColor(account.type);
  const gradientClass = getAccountGradient(account.type, theme);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className={`max-w-2xl max-h-[90vh] overflow-hidden flex flex-col ${
        theme === 'dark' ? 'bg-slate-900 border-slate-700/50' : 'bg-white border-slate-200'
      }`}>
        <DialogHeader className="flex-shrink-0">
          <div className="flex items-center justify-between">
            <DialogTitle className={`text-xl font-semibold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
              Account Details
            </DialogTitle>
            <div className="flex items-center gap-2">
              {onEdit && (
                <button
                  onClick={() => {
                    onClose();
                    onEdit(account);
                  }}
                  className={`p-2 rounded-lg transition-colors ${
                    theme === 'dark' 
                      ? 'hover:bg-slate-800 text-slate-400 hover:text-white' 
                      : 'hover:bg-slate-100 text-slate-500 hover:text-slate-700'
                  }`}
                >
                  <Edit className="w-4 h-4" />
                </button>
              )}
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
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-6 py-4">
          {/* Account Header Card */}
          <div className={`relative overflow-hidden rounded-2xl border p-6 bg-gradient-to-br ${gradientClass} ${
            theme === 'dark' ? 'border-slate-700/50' : 'border-slate-200'
          }`}>
            {/* Decorative blur */}
            <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-br from-white/10 to-transparent rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
            
            <div className="relative">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-4">
                  <div className={`p-3 rounded-xl ${theme === 'dark' ? 'bg-white/10' : 'bg-white/80'}`}>
                    <Icon className={`w-8 h-8 ${iconColor}`} />
                  </div>
                  <div>
                    <h2 className={`text-xl font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                      {account.name}
                    </h2>
                    <p className={`text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                      {getAccountTypeLabel(account.type)}
                    </p>
                  </div>
                </div>
                <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium ${
                  account.isActive
                    ? theme === 'dark' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-emerald-100 text-emerald-600'
                    : theme === 'dark' ? 'bg-slate-500/20 text-slate-400' : 'bg-slate-100 text-slate-500'
                }`}>
                  {account.isActive ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                  {account.isActive ? 'Active' : 'Inactive'}
                </span>
              </div>

              {/* Balance */}
              <div className="mb-4">
                <p className={`text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>Current Balance</p>
                <p className={`text-3xl font-bold ${account.balance >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                  {formatCurrency(account.balance)}
                </p>
              </div>

              {/* Bank Details */}
              {account.type === 'bank' && account.bankName && (
                <div className={`p-3 rounded-xl ${theme === 'dark' ? 'bg-white/5' : 'bg-white/60'}`}>
                  <div className="flex items-center gap-2 mb-1">
                    <Landmark className={`w-4 h-4 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`} />
                    <span className={`text-sm font-medium ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                      {account.bankName}
                    </span>
                  </div>
                  {account.accountNumber && (
                    <p className={`text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                      Account: •••• •••• {account.accountNumber.slice(-4)}
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Account Info */}
          <div className={`p-4 rounded-xl border ${theme === 'dark' ? 'bg-slate-800/30 border-slate-700/50' : 'bg-slate-50 border-slate-200'}`}>
            <h3 className={`text-sm font-semibold mb-3 ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
              Account Information
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className={`text-xs ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>Account ID</p>
                <p className={`text-sm font-medium ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                  {account.id}
                </p>
              </div>
              <div>
                <p className={`text-xs ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>Created Date</p>
                <p className={`text-sm font-medium ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                  {formatDate(account.createdAt)}
                </p>
              </div>
              {account.updatedAt && (
                <div>
                  <p className={`text-xs ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>Last Updated</p>
                  <p className={`text-sm font-medium ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                    {formatDate(account.updatedAt)}
                  </p>
                </div>
              )}
              <div>
                <p className={`text-xs ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>Total Transactions</p>
                <p className={`text-sm font-medium ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                  {accountTransactions.length}
                </p>
              </div>
            </div>
            {account.description && (
              <div className="mt-4">
                <p className={`text-xs ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>Description</p>
                <p className={`text-sm ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                  {account.description}
                </p>
              </div>
            )}
          </div>

          {/* Transaction Summary */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className={`p-4 rounded-xl border ${theme === 'dark' ? 'bg-slate-800/30 border-slate-700/50' : 'bg-white border-slate-200'}`}>
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="w-4 h-4 text-emerald-500" />
                <span className={`text-xs font-medium ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>Income</span>
              </div>
              <p className="text-lg font-bold text-emerald-500">{formatCurrency(stats.totalIncome)}</p>
            </div>
            <div className={`p-4 rounded-xl border ${theme === 'dark' ? 'bg-slate-800/30 border-slate-700/50' : 'bg-white border-slate-200'}`}>
              <div className="flex items-center gap-2 mb-2">
                <TrendingDown className="w-4 h-4 text-red-500" />
                <span className={`text-xs font-medium ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>Expense</span>
              </div>
              <p className="text-lg font-bold text-red-500">{formatCurrency(stats.totalExpense)}</p>
            </div>
            <div className={`p-4 rounded-xl border ${theme === 'dark' ? 'bg-slate-800/30 border-slate-700/50' : 'bg-white border-slate-200'}`}>
              <div className="flex items-center gap-2 mb-2">
                <ArrowLeftRight className="w-4 h-4 text-blue-500" />
                <span className={`text-xs font-medium ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>Transfers</span>
              </div>
              <p className="text-lg font-bold text-blue-500">{formatCurrency(stats.totalTransfers)}</p>
            </div>
            <div className={`p-4 rounded-xl border ${theme === 'dark' ? 'bg-slate-800/30 border-slate-700/50' : 'bg-white border-slate-200'}`}>
              <div className="flex items-center gap-2 mb-2">
                <Wallet className={`w-4 h-4 ${stats.netFlow >= 0 ? 'text-emerald-500' : 'text-red-500'}`} />
                <span className={`text-xs font-medium ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>Net Flow</span>
              </div>
              <p className={`text-lg font-bold ${stats.netFlow >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                {stats.netFlow >= 0 ? '+' : ''}{formatCurrency(stats.netFlow)}
              </p>
            </div>
          </div>

          {/* Recent Transactions */}
          <div className={`rounded-xl border overflow-hidden ${theme === 'dark' ? 'border-slate-700/50' : 'border-slate-200'}`}>
            <div className={`px-4 py-3 border-b ${theme === 'dark' ? 'bg-slate-800/50 border-slate-700/50' : 'bg-slate-50 border-slate-200'}`}>
              <h3 className={`text-sm font-semibold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                Recent Transactions ({accountTransactions.length})
              </h3>
            </div>
            <div className={`max-h-64 overflow-y-auto ${theme === 'dark' ? 'bg-slate-800/20' : 'bg-white'}`}>
              {accountTransactions.length > 0 ? (
                <div className={`divide-y ${theme === 'dark' ? 'divide-slate-700/50' : 'divide-slate-100'}`}>
                  {accountTransactions.slice(0, 10).map((txn) => (
                    <div key={txn.id} className={`px-4 py-3 flex items-center justify-between ${
                      theme === 'dark' ? 'hover:bg-slate-800/30' : 'hover:bg-slate-50'
                    }`}>
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${
                          txn.type === 'income' 
                            ? 'bg-emerald-500/10 text-emerald-500'
                            : txn.type === 'expense'
                              ? 'bg-red-500/10 text-red-500'
                              : 'bg-blue-500/10 text-blue-500'
                        }`}>
                          {txn.type === 'income' ? <TrendingUp className="w-4 h-4" /> 
                            : txn.type === 'expense' ? <TrendingDown className="w-4 h-4" />
                            : <ArrowLeftRight className="w-4 h-4" />}
                        </div>
                        <div>
                          <p className={`text-sm font-medium ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                            {txn.name}
                          </p>
                          <div className="flex items-center gap-2">
                            <span className={`text-xs ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>
                              {txn.transactionNumber}
                            </span>
                            <span className={`text-xs ${theme === 'dark' ? 'text-slate-600' : 'text-slate-300'}`}>•</span>
                            <span className={`text-xs ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>
                              {formatDateTime(txn.transactionDate)}
                            </span>
                          </div>
                        </div>
                      </div>
                      <span className={`text-sm font-semibold ${
                        txn.type === 'income' ? 'text-emerald-500' : txn.type === 'expense' ? 'text-red-500' : 'text-blue-500'
                      }`}>
                        {txn.type === 'income' ? '+' : '-'}{formatCurrency(txn.amount)}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-8 text-center">
                  <FileText className={`w-10 h-10 mx-auto ${theme === 'dark' ? 'text-slate-600' : 'text-slate-300'}`} />
                  <p className={`mt-2 text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                    No transactions yet
                  </p>
                </div>
              )}
            </div>
            {accountTransactions.length > 10 && (
              <div className={`px-4 py-2 border-t text-center ${
                theme === 'dark' ? 'bg-slate-800/30 border-slate-700/50' : 'bg-slate-50 border-slate-200'
              }`}>
                <p className={`text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                  Showing 10 of {accountTransactions.length} transactions
                </p>
              </div>
            )}
          </div>
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
