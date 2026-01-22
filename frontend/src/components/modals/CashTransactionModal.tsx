import React, { useState, useEffect, useRef } from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../ui/dialog';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { SearchableSelect } from '../ui/searchable-select';
import { TimePicker } from '../ui/time-picker';
import { 
  Wallet, ArrowDownCircle, ArrowUpCircle, ArrowLeftRight, Save, 
  DollarSign, FileText, Tag, Calendar, Clock, Building2, Banknote, PiggyBank,
  ChevronLeft, ChevronRight
} from 'lucide-react';
import type { 
  CashTransaction, 
  CashAccount, 
  CashAccountType, 
  CashTransactionType 
} from '../../data/mockData';
import { 
  expenseCategories,
  generateTransactionNumber 
} from '../../data/mockData';

interface CashTransactionModalProps {
  isOpen: boolean;
  transaction?: CashTransaction | null;
  accounts: CashAccount[];
  onClose: () => void;
  onSave: (transaction: CashTransaction) => void;
}

interface FormData {
  type: CashTransactionType;
  accountId: string;
  amount: string;
  name: string;
  description: string;
  category: string;
  transferToAccountId: string;
  transactionDate: string;
  transactionTime: string;
  notes: string;
}

const getAccountIcon = (type: CashAccountType) => {
  switch (type) {
    case 'drawer': return <Banknote className="w-4 h-4 text-amber-500" />;
    case 'cash_in_hand': return <Wallet className="w-4 h-4 text-emerald-500" />;
    case 'business': return <Building2 className="w-4 h-4 text-blue-500" />;
    default: return <PiggyBank className="w-4 h-4 text-slate-500" />;
  }
};

export const CashTransactionModal: React.FC<CashTransactionModalProps> = ({
  isOpen,
  transaction,
  accounts,
  onClose,
  onSave,
}) => {
  const { theme } = useTheme();
  
  // Calendar states
  const [showDateCalendar, setShowDateCalendar] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState(new Date());
  const dateCalendarRef = useRef<HTMLDivElement>(null);

  const getInitialDateTime = () => {
    const now = new Date();
    return {
      date: now.toISOString().split('T')[0],
      time: now.toTimeString().slice(0, 5),
    };
  };

  const [formData, setFormData] = useState<FormData>({
    type: 'expense',
    accountId: accounts[0]?.id || '',
    amount: '',
    name: '',
    description: '',
    category: '',
    transferToAccountId: '',
    transactionDate: getInitialDateTime().date,
    transactionTime: getInitialDateTime().time,
    notes: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Close calendar when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dateCalendarRef.current && !dateCalendarRef.current.contains(event.target as Node)) {
        setShowDateCalendar(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (transaction) {
      const txnDate = new Date(transaction.transactionDate);
      setFormData({
        type: transaction.type,
        accountId: transaction.accountId,
        amount: transaction.amount.toString(),
        name: transaction.name,
        description: transaction.description || '',
        category: transaction.category || '',
        transferToAccountId: transaction.transferToAccountId || '',
        transactionDate: txnDate.toISOString().split('T')[0],
        transactionTime: txnDate.toTimeString().slice(0, 5),
        notes: transaction.notes || '',
      });
    } else {
      const { date, time } = getInitialDateTime();
      setFormData({
        type: 'expense',
        accountId: accounts[0]?.id || '',
        amount: '',
        name: '',
        description: '',
        category: '',
        transferToAccountId: '',
        transactionDate: date,
        transactionTime: time,
        notes: '',
      });
    }
    setErrors({});
  }, [transaction, isOpen, accounts]);

  const handleChange = (field: keyof FormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.name.trim()) {
      newErrors.name = 'Transaction name is required';
    }
    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      newErrors.amount = 'Valid amount is required';
    }
    if (!formData.accountId) {
      newErrors.accountId = 'Account is required';
    }
    if (formData.type === 'transfer' && !formData.transferToAccountId) {
      newErrors.transferToAccountId = 'Destination account is required';
    }
    if (formData.type === 'transfer' && formData.accountId === formData.transferToAccountId) {
      newErrors.transferToAccountId = 'Cannot transfer to same account';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    const selectedAccount = accounts.find(a => a.id === formData.accountId);
    const amount = parseFloat(formData.amount);
    
    const transactionDateTime = new Date(`${formData.transactionDate}T${formData.transactionTime}`).toISOString();

    const newTransaction: CashTransaction = {
      id: transaction?.id || `txn-${Date.now()}`,
      transactionNumber: transaction?.transactionNumber || generateTransactionNumber(),
      type: formData.type,
      accountId: formData.accountId,
      accountType: selectedAccount?.type || 'drawer',
      amount: amount,
      name: formData.name.trim(),
      description: formData.description.trim() || undefined,
      category: formData.category || undefined,
      transferToAccountId: formData.type === 'transfer' ? formData.transferToAccountId : undefined,
      transferToAccountType: formData.type === 'transfer' 
        ? accounts.find(a => a.id === formData.transferToAccountId)?.type 
        : undefined,
      balanceBefore: selectedAccount?.balance || 0,
      balanceAfter: formData.type === 'income' 
        ? (selectedAccount?.balance || 0) + amount
        : (selectedAccount?.balance || 0) - amount,
      transactionDate: transactionDateTime,
      createdAt: transaction?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      notes: formData.notes.trim() || undefined,
    };

    onSave(newTransaction);
    onClose();
  };

  const formatCurrency = (amount: number) => `Rs. ${amount.toLocaleString('en-LK')}`;

  const transactionTypes: { value: CashTransactionType; label: string; icon: typeof ArrowUpCircle; color: string }[] = [
    { value: 'income', label: 'Income', icon: ArrowDownCircle, color: 'emerald' },
    { value: 'expense', label: 'Expense', icon: ArrowUpCircle, color: 'red' },
    { value: 'transfer', label: 'Transfer', icon: ArrowLeftRight, color: 'blue' },
  ];

  // Calendar helper functions
  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDay = firstDay.getDay();
    return { daysInMonth, startingDay };
  };

  const formatDateDisplay = (dateStr: string) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  };



  const renderCalendar = () => {
    const { daysInMonth, startingDay } = getDaysInMonth(calendarMonth);
    const days = [];
    const selectedDateObj = formData.transactionDate ? new Date(formData.transactionDate) : null;

    for (let i = 0; i < startingDay; i++) {
      days.push(<div key={`empty-${i}`} className="w-8 h-8" />);
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const currentDate = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth(), day);
      const isSelected = selectedDateObj && 
        currentDate.getDate() === selectedDateObj.getDate() &&
        currentDate.getMonth() === selectedDateObj.getMonth() &&
        currentDate.getFullYear() === selectedDateObj.getFullYear();
      const isToday = new Date().toDateString() === currentDate.toDateString();

      days.push(
        <button
          key={day}
          type="button"
          onClick={() => {
            const dateStr = `${currentDate.getFullYear()}-${(currentDate.getMonth() + 1).toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
            handleChange('transactionDate', dateStr);
            setShowDateCalendar(false);
          }}
          className={`w-8 h-8 rounded-lg text-sm font-medium transition-all ${
            isSelected
              ? 'bg-emerald-500 text-white'
              : isToday
              ? theme === 'dark' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-emerald-100 text-emerald-600'
              : theme === 'dark' ? 'hover:bg-slate-700 text-slate-300' : 'hover:bg-slate-100 text-slate-700'
          }`}
        >
          {day}
        </button>
      );
    }

    return (
      <div className={`absolute top-full left-0 mt-2 p-3 rounded-xl border shadow-xl z-50 min-w-[280px] ${
        theme === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'
      }`}>
        <div className="flex items-center justify-between mb-3">
          <button
            type="button"
            onClick={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() - 1, 1))}
            className={`p-1 rounded-lg transition-colors ${
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
            className={`p-1 rounded-lg transition-colors ${
              theme === 'dark' ? 'hover:bg-slate-700 text-slate-400' : 'hover:bg-slate-100 text-slate-600'
            }`}
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
        
        <div className="grid grid-cols-7 gap-1 mb-2">
          {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((day) => (
            <div key={day} className={`w-8 h-8 flex items-center justify-center text-xs font-medium ${
              theme === 'dark' ? 'text-slate-500' : 'text-slate-400'
            }`}>
              {day}
            </div>
          ))}
        </div>
        
        <div className="grid grid-cols-7 gap-1">
          {days}
        </div>

        <div className="flex gap-2 mt-3">
          <button
            type="button"
            onClick={() => {
              const today = new Date();
              const dateStr = `${today.getFullYear()}-${(today.getMonth() + 1).toString().padStart(2, '0')}-${today.getDate().toString().padStart(2, '0')}`;
              handleChange('transactionDate', dateStr);
              setShowDateCalendar(false);
            }}
            className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${
              theme === 'dark' 
                ? 'bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400' 
                : 'bg-emerald-100 hover:bg-emerald-200 text-emerald-700'
            }`}
          >
            Today
          </button>
          <button
            type="button"
            onClick={() => setShowDateCalendar(false)}
            className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${
              theme === 'dark' 
                ? 'bg-slate-700 hover:bg-slate-600 text-slate-300' 
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
            }`}
          >
            Close
          </button>
        </div>
      </div>
    );
  };

  // Account options for SearchableSelect
  const accountOptions = accounts.map(account => ({
    value: account.id,
    label: `${account.name} (${formatCurrency(account.balance)})`,
    icon: getAccountIcon(account.type),
  }));

  const transferAccountOptions = accounts
    .filter(a => a.id !== formData.accountId)
    .map(account => ({
      value: account.id,
      label: `${account.name} (${formatCurrency(account.balance)})`,
      icon: getAccountIcon(account.type),
    }));

  // Category options for SearchableSelect
  const categoryOptions = [
    { value: '', label: 'No Category', icon: <Tag className="w-4 h-4 text-slate-400" /> },
    ...expenseCategories.map(cat => ({
      value: cat,
      label: cat,
      icon: <Tag className="w-4 h-4 text-emerald-500" />,
    })),
  ];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className={`max-w-2xl max-h-[90vh] overflow-y-auto ${
        theme === 'dark' ? 'bg-slate-900 border-slate-700/50' : 'bg-white border-slate-200'
      }`}>
        <DialogHeader>
          <DialogTitle className={`flex items-center gap-3 text-xl font-semibold ${
            theme === 'dark' ? 'text-white' : 'text-slate-900'
          }`}>
            <div className={`p-2.5 rounded-xl ${
              theme === 'dark' ? 'bg-emerald-500/20' : 'bg-emerald-50'
            }`}>
              <Wallet className="w-5 h-5 text-emerald-500" />
            </div>
            {transaction ? 'Edit Transaction' : 'Add New Transaction'}
          </DialogTitle>
          <DialogDescription className={theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}>
            {transaction ? 'Update the transaction details below' : 'Record a new cash transaction'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 py-4">
          {/* Transaction Type Selection */}
          <div className="space-y-2">
            <Label className={theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}>
              Transaction Type
            </Label>
            <div className="grid grid-cols-3 gap-3">
              {transactionTypes.map((type) => {
                const Icon = type.icon;
                const isSelected = formData.type === type.value;
                return (
                  <button
                    key={type.value}
                    type="button"
                    onClick={() => handleChange('type', type.value)}
                    className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
                      isSelected
                        ? type.color === 'emerald'
                          ? 'border-emerald-500 bg-emerald-500/10'
                          : type.color === 'red'
                          ? 'border-red-500 bg-red-500/10'
                          : 'border-blue-500 bg-blue-500/10'
                        : theme === 'dark'
                        ? 'border-slate-700 hover:border-slate-600 bg-slate-800/50'
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                  >
                    <Icon className={`w-6 h-6 ${
                      isSelected
                        ? type.color === 'emerald' ? 'text-emerald-500' 
                          : type.color === 'red' ? 'text-red-500' 
                          : 'text-blue-500'
                        : theme === 'dark' ? 'text-slate-400' : 'text-slate-500'
                    }`} />
                    <span className={`text-sm font-medium ${
                      isSelected
                        ? type.color === 'emerald' ? 'text-emerald-500' 
                          : type.color === 'red' ? 'text-red-500' 
                          : 'text-blue-500'
                        : theme === 'dark' ? 'text-slate-300' : 'text-slate-700'
                    }`}>
                      {type.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Account Selection with SearchableSelect */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className={theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}>
                {formData.type === 'transfer' ? 'From Account' : 'Account'} *
              </Label>
              <SearchableSelect
                value={formData.accountId}
                onValueChange={(value) => handleChange('accountId', value)}
                placeholder="Select account..."
                searchPlaceholder="Search accounts..."
                emptyMessage="No accounts found"
                theme={theme}
                options={accountOptions}
              />
              {errors.accountId && (
                <p className="text-sm text-red-500">{errors.accountId}</p>
              )}
            </div>

            {/* Transfer To Account */}
            {formData.type === 'transfer' && (
              <div className="space-y-2">
                <Label className={theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}>
                  To Account *
                </Label>
                <SearchableSelect
                  value={formData.transferToAccountId}
                  onValueChange={(value) => handleChange('transferToAccountId', value)}
                  placeholder="Select destination..."
                  searchPlaceholder="Search accounts..."
                  emptyMessage="No accounts found"
                  theme={theme}
                  options={transferAccountOptions}
                />
                {errors.transferToAccountId && (
                  <p className="text-sm text-red-500">{errors.transferToAccountId}</p>
                )}
              </div>
            )}
          </div>

          {/* Transaction Name & Amount */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name" className={theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}>
                <span className="flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  Transaction Name *
                </span>
              </Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => handleChange('name', e.target.value)}
                placeholder="e.g., Electricity Bill, Staff Salary"
                className={`${
                  theme === 'dark'
                    ? 'bg-slate-800/50 border-slate-700/50 text-white placeholder-slate-500'
                    : 'bg-white border-slate-200 text-slate-900 placeholder-slate-400'
                } ${errors.name ? 'border-red-500' : ''}`}
              />
              {errors.name && <p className="text-sm text-red-500">{errors.name}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="amount" className={theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}>
                <span className="flex items-center gap-2">
                  <DollarSign className="w-4 h-4" />
                  Amount (Rs.) *
                </span>
              </Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                min="0"
                value={formData.amount}
                onChange={(e) => handleChange('amount', e.target.value)}
                placeholder="0.00"
                className={`${
                  theme === 'dark'
                    ? 'bg-slate-800/50 border-slate-700/50 text-white placeholder-slate-500'
                    : 'bg-white border-slate-200 text-slate-900 placeholder-slate-400'
                } ${errors.amount ? 'border-red-500' : ''}`}
              />
              {errors.amount && <p className="text-sm text-red-500">{errors.amount}</p>}
            </div>
          </div>

          {/* Category & Date/Time */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {formData.type !== 'transfer' && (
              <div className="space-y-2">
                <Label className={theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}>
                  <span className="flex items-center gap-2">
                    <Tag className="w-4 h-4" />
                    Category
                  </span>
                </Label>
                <SearchableSelect
                  value={formData.category}
                  onValueChange={(value) => handleChange('category', value)}
                  placeholder="Select category..."
                  searchPlaceholder="Search categories..."
                  emptyMessage="No categories found"
                  theme={theme}
                  options={categoryOptions}
                />
              </div>
            )}

            {/* Custom Date Picker */}
            <div className="space-y-2">
              <Label className={theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}>
                <span className="flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  Date
                </span>
              </Label>
              <div className="relative" ref={dateCalendarRef}>
                <button
                  type="button"
                  onClick={() => {
                    setShowDateCalendar(!showDateCalendar);
                    setCalendarMonth(formData.transactionDate ? new Date(formData.transactionDate) : new Date());
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl border text-sm ${
                    theme === 'dark' 
                      ? 'bg-slate-800/50 border-slate-700/50 text-white hover:bg-slate-700/50' 
                      : 'bg-white border-slate-200 text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  <span className={formData.transactionDate ? '' : theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}>
                    {formData.transactionDate ? formatDateDisplay(formData.transactionDate) : 'Select date'}
                  </span>
                  <Calendar className={`w-4 h-4 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`} />
                </button>
                {showDateCalendar && renderCalendar()}
              </div>
            </div>

            {/* Time Picker */}
            <div className="space-y-2">
              <Label className={theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}>
                <span className="flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  Time
                </span>
              </Label>
              <TimePicker
                value={formData.transactionTime}
                onChange={(time) => handleChange('transactionTime', time)}
                theme={theme}
              />
            </div>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description" className={theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}>
              Description
            </Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => handleChange('description', e.target.value)}
              placeholder="Add details about this transaction..."
              rows={3}
              className={`${
                theme === 'dark'
                  ? 'bg-slate-800/50 border-slate-700/50 text-white placeholder-slate-500'
                  : 'bg-white border-slate-200 text-slate-900 placeholder-slate-400'
              }`}
            />
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes" className={theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}>
              Internal Notes
            </Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => handleChange('notes', e.target.value)}
              placeholder="Any internal notes (not shown on reports)..."
              rows={2}
              className={`${
                theme === 'dark'
                  ? 'bg-slate-800/50 border-slate-700/50 text-white placeholder-slate-500'
                  : 'bg-white border-slate-200 text-slate-900 placeholder-slate-400'
              }`}
            />
          </div>

          {/* Footer Actions */}
          <div className={`flex justify-end gap-3 pt-4 border-t ${
            theme === 'dark' ? 'border-slate-700/50' : 'border-slate-200'
          }`}>
            <button
              type="button"
              onClick={onClose}
              className={`px-4 py-2.5 rounded-xl font-medium transition-all ${
                theme === 'dark'
                  ? 'bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200'
              }`}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-emerald-500 to-blue-500 text-white rounded-xl font-medium shadow-lg hover:shadow-emerald-500/25 transition-all"
            >
              <Save className="w-4 h-4" />
              {transaction ? 'Update Transaction' : 'Save Transaction'}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
