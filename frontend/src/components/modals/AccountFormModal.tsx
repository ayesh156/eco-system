import React, { useState, useEffect } from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { 
  X, Wallet, Building2, CreditCard, Banknote, HandCoins, 
  PiggyBank, Landmark, CircleDollarSign, Coins, Check
} from 'lucide-react';
import type { CashAccount, CashAccountType } from '../../data/mockData';

interface AccountFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (account: CashAccount) => void;
  account: CashAccount | null;
  existingAccounts: CashAccount[];
}

// Extended account types with icons and colors
const accountTypeOptions: {
  value: CashAccountType;
  label: string;
  description: string;
  icon: React.ElementType;
  color: string;
  bgLight: string;
  bgDark: string;
}[] = [
  { 
    value: 'drawer', 
    label: 'Cash Drawer', 
    description: 'Point of sale cash drawer',
    icon: Banknote,
    color: 'text-amber-500',
    bgLight: 'bg-amber-100',
    bgDark: 'bg-amber-500/20'
  },
  { 
    value: 'cash_in_hand', 
    label: 'Cash in Hand', 
    description: 'Petty cash and reserves',
    icon: HandCoins,
    color: 'text-emerald-500',
    bgLight: 'bg-emerald-100',
    bgDark: 'bg-emerald-500/20'
  },
  { 
    value: 'business', 
    label: 'Business Fund', 
    description: 'Main business operating fund',
    icon: Building2,
    color: 'text-blue-500',
    bgLight: 'bg-blue-100',
    bgDark: 'bg-blue-500/20'
  },
  { 
    value: 'bank', 
    label: 'Bank Account', 
    description: 'Commercial bank account',
    icon: Landmark,
    color: 'text-indigo-500',
    bgLight: 'bg-indigo-100',
    bgDark: 'bg-indigo-500/20'
  },
  { 
    value: 'mobile_wallet', 
    label: 'Mobile Wallet', 
    description: 'Digital payment wallet (e.g., FriMi, eZ Cash)',
    icon: Wallet,
    color: 'text-purple-500',
    bgLight: 'bg-purple-100',
    bgDark: 'bg-purple-500/20'
  },
  { 
    value: 'credit_card', 
    label: 'Credit Card', 
    description: 'Business credit card account',
    icon: CreditCard,
    color: 'text-rose-500',
    bgLight: 'bg-rose-100',
    bgDark: 'bg-rose-500/20'
  },
  { 
    value: 'savings', 
    label: 'Savings Account', 
    description: 'Business savings account',
    icon: PiggyBank,
    color: 'text-teal-500',
    bgLight: 'bg-teal-100',
    bgDark: 'bg-teal-500/20'
  },
  { 
    value: 'investment', 
    label: 'Investment', 
    description: 'Investment or fixed deposit',
    icon: CircleDollarSign,
    color: 'text-cyan-500',
    bgLight: 'bg-cyan-100',
    bgDark: 'bg-cyan-500/20'
  },
  { 
    value: 'other', 
    label: 'Other', 
    description: 'Custom account type',
    icon: Coins,
    color: 'text-slate-500',
    bgLight: 'bg-slate-100',
    bgDark: 'bg-slate-500/20'
  }
];

export const AccountFormModal: React.FC<AccountFormModalProps> = ({
  isOpen,
  onClose,
  onSave,
  account,
  existingAccounts
}) => {
  const { theme } = useTheme();
  const isEditing = !!account;
  
  const [formData, setFormData] = useState({
    name: '',
    type: 'bank' as CashAccountType,
    balance: 0,
    description: '',
    bankName: '',
    accountNumber: '',
    isActive: true
  });
  
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (account) {
      setFormData({
        name: account.name,
        type: account.type,
        balance: account.balance,
        description: account.description || '',
        bankName: account.bankName || '',
        accountNumber: account.accountNumber || '',
        isActive: account.isActive
      });
    } else {
      setFormData({
        name: '',
        type: 'bank',
        balance: 0,
        description: '',
        bankName: '',
        accountNumber: '',
        isActive: true
      });
    }
    setErrors({});
  }, [account, isOpen]);

  const handleChange = (field: string, value: string | number | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.name.trim()) {
      newErrors.name = 'Account name is required';
    } else if (
      existingAccounts.some(a => 
        a.name.toLowerCase() === formData.name.trim().toLowerCase() && 
        a.id !== account?.id
      )
    ) {
      newErrors.name = 'An account with this name already exists';
    }
    
    if (formData.balance < 0) {
      newErrors.balance = 'Balance cannot be negative';
    }
    
    if (formData.type === 'bank' && !formData.bankName.trim()) {
      newErrors.bankName = 'Bank name is required for bank accounts';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (!validate()) return;
    
    const newAccount: CashAccount = {
      id: account?.id || `acc-${Date.now()}`,
      name: formData.name.trim(),
      type: formData.type,
      balance: formData.balance,
      description: formData.description.trim() || undefined,
      bankName: formData.type === 'bank' ? formData.bankName.trim() : undefined,
      accountNumber: formData.accountNumber.trim() || undefined,
      isActive: formData.isActive,
      createdAt: account?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    onSave(newAccount);
    onClose();
  };

  const selectedTypeOption = accountTypeOptions.find(t => t.value === formData.type);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className={`relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl border shadow-2xl ${
        theme === 'dark' 
          ? 'bg-slate-900 border-slate-700/50' 
          : 'bg-white border-slate-200'
      }`}>
        {/* Header */}
        <div className={`sticky top-0 z-10 flex items-center justify-between px-6 py-4 border-b ${
          theme === 'dark' ? 'bg-slate-900 border-slate-700/50' : 'bg-white border-slate-200'
        }`}>
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-xl ${theme === 'dark' ? 'bg-emerald-500/20' : 'bg-emerald-100'}`}>
              <Wallet className="w-5 h-5 text-emerald-500" />
            </div>
            <div>
              <h2 className={`text-xl font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                {isEditing ? 'Edit Account' : 'Add New Account'}
              </h2>
              <p className={`text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                {isEditing ? 'Update account details' : 'Create a new money account'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className={`p-2 rounded-xl transition-colors ${
              theme === 'dark' 
                ? 'hover:bg-slate-800 text-slate-400 hover:text-white' 
                : 'hover:bg-slate-100 text-slate-500 hover:text-slate-700'
            }`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Account Type Selection */}
          <div>
            <label className={`block text-sm font-medium mb-3 ${
              theme === 'dark' ? 'text-slate-300' : 'text-slate-700'
            }`}>
              Account Type <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-3 gap-3">
              {accountTypeOptions.map((type) => {
                const Icon = type.icon;
                const isSelected = formData.type === type.value;
                return (
                  <button
                    key={type.value}
                    type="button"
                    onClick={() => handleChange('type', type.value)}
                    className={`relative p-4 rounded-xl border-2 transition-all text-left ${
                      isSelected
                        ? `border-emerald-500 ${theme === 'dark' ? 'bg-emerald-500/10' : 'bg-emerald-50'}`
                        : theme === 'dark'
                          ? 'border-slate-700 hover:border-slate-600 bg-slate-800/50 hover:bg-slate-800'
                          : 'border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50'
                    }`}
                  >
                    {isSelected && (
                      <div className="absolute top-2 right-2">
                        <Check className="w-4 h-4 text-emerald-500" />
                      </div>
                    )}
                    <div className={`p-2 rounded-lg w-fit ${theme === 'dark' ? type.bgDark : type.bgLight}`}>
                      <Icon className={`w-5 h-5 ${type.color}`} />
                    </div>
                    <p className={`mt-2 text-sm font-medium ${
                      theme === 'dark' ? 'text-white' : 'text-slate-900'
                    }`}>
                      {type.label}
                    </p>
                    <p className={`text-xs mt-0.5 line-clamp-1 ${
                      theme === 'dark' ? 'text-slate-500' : 'text-slate-400'
                    }`}>
                      {type.description}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Account Name */}
          <div>
            <label className={`block text-sm font-medium mb-2 ${
              theme === 'dark' ? 'text-slate-300' : 'text-slate-700'
            }`}>
              Account Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => handleChange('name', e.target.value)}
              placeholder={`e.g., ${selectedTypeOption?.label || 'My Account'}`}
              className={`w-full px-4 py-3 rounded-xl border transition-all ${
                errors.name
                  ? 'border-red-500 focus:ring-2 focus:ring-red-500/20'
                  : theme === 'dark'
                    ? 'bg-slate-800/50 border-slate-700 text-white placeholder-slate-500 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20'
                    : 'bg-white border-slate-200 text-slate-900 placeholder-slate-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20'
              }`}
            />
            {errors.name && (
              <p className="mt-1 text-sm text-red-500">{errors.name}</p>
            )}
          </div>

          {/* Bank Name - Only for bank accounts */}
          {formData.type === 'bank' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={`block text-sm font-medium mb-2 ${
                  theme === 'dark' ? 'text-slate-300' : 'text-slate-700'
                }`}>
                  Bank Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.bankName}
                  onChange={(e) => handleChange('bankName', e.target.value)}
                  placeholder="e.g., Commercial Bank"
                  className={`w-full px-4 py-3 rounded-xl border transition-all ${
                    errors.bankName
                      ? 'border-red-500 focus:ring-2 focus:ring-red-500/20'
                      : theme === 'dark'
                        ? 'bg-slate-800/50 border-slate-700 text-white placeholder-slate-500 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20'
                        : 'bg-white border-slate-200 text-slate-900 placeholder-slate-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20'
                  }`}
                />
                {errors.bankName && (
                  <p className="mt-1 text-sm text-red-500">{errors.bankName}</p>
                )}
              </div>
              <div>
                <label className={`block text-sm font-medium mb-2 ${
                  theme === 'dark' ? 'text-slate-300' : 'text-slate-700'
                }`}>
                  Account Number
                </label>
                <input
                  type="text"
                  value={formData.accountNumber}
                  onChange={(e) => handleChange('accountNumber', e.target.value)}
                  placeholder="e.g., 1234567890"
                  className={`w-full px-4 py-3 rounded-xl border transition-all ${
                    theme === 'dark'
                      ? 'bg-slate-800/50 border-slate-700 text-white placeholder-slate-500 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20'
                      : 'bg-white border-slate-200 text-slate-900 placeholder-slate-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20'
                  }`}
                />
              </div>
            </div>
          )}

          {/* Opening Balance */}
          <div>
            <label className={`block text-sm font-medium mb-2 ${
              theme === 'dark' ? 'text-slate-300' : 'text-slate-700'
            }`}>
              {isEditing ? 'Current Balance' : 'Opening Balance'} (LKR)
            </label>
            <div className="relative">
              <span className={`absolute left-4 top-1/2 -translate-y-1/2 text-sm font-medium ${
                theme === 'dark' ? 'text-slate-500' : 'text-slate-400'
              }`}>
                Rs.
              </span>
              <input
                type="number"
                value={formData.balance}
                onChange={(e) => handleChange('balance', parseFloat(e.target.value) || 0)}
                placeholder="0.00"
                min="0"
                step="0.01"
                className={`w-full pl-12 pr-4 py-3 rounded-xl border transition-all ${
                  errors.balance
                    ? 'border-red-500 focus:ring-2 focus:ring-red-500/20'
                    : theme === 'dark'
                      ? 'bg-slate-800/50 border-slate-700 text-white placeholder-slate-500 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20'
                      : 'bg-white border-slate-200 text-slate-900 placeholder-slate-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20'
                }`}
              />
            </div>
            {errors.balance && (
              <p className="mt-1 text-sm text-red-500">{errors.balance}</p>
            )}
          </div>

          {/* Description */}
          <div>
            <label className={`block text-sm font-medium mb-2 ${
              theme === 'dark' ? 'text-slate-300' : 'text-slate-700'
            }`}>
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => handleChange('description', e.target.value)}
              placeholder="Add notes about this account..."
              rows={3}
              className={`w-full px-4 py-3 rounded-xl border transition-all resize-none ${
                theme === 'dark'
                  ? 'bg-slate-800/50 border-slate-700 text-white placeholder-slate-500 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20'
                  : 'bg-white border-slate-200 text-slate-900 placeholder-slate-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20'
              }`}
            />
          </div>

          {/* Active Status */}
          <div className={`flex items-center justify-between p-4 rounded-xl border ${
            theme === 'dark' ? 'bg-slate-800/30 border-slate-700/50' : 'bg-slate-50 border-slate-200'
          }`}>
            <div>
              <p className={`font-medium ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                Active Account
              </p>
              <p className={`text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                Inactive accounts won't appear in transaction forms
              </p>
            </div>
            <button
              type="button"
              onClick={() => handleChange('isActive', !formData.isActive)}
              className={`relative w-12 h-6 rounded-full transition-colors ${
                formData.isActive
                  ? 'bg-emerald-500'
                  : theme === 'dark' ? 'bg-slate-700' : 'bg-slate-300'
              }`}
            >
              <span className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${
                formData.isActive ? 'left-7' : 'left-1'
              }`} />
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className={`sticky bottom-0 flex items-center justify-end gap-3 px-6 py-4 border-t ${
          theme === 'dark' ? 'bg-slate-900 border-slate-700/50' : 'bg-white border-slate-200'
        }`}>
          <button
            onClick={onClose}
            className={`px-5 py-2.5 rounded-xl font-medium transition-colors ${
              theme === 'dark'
                ? 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
            }`}
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            className="px-5 py-2.5 bg-gradient-to-r from-emerald-500 to-blue-500 text-white rounded-xl font-medium shadow-lg hover:shadow-emerald-500/25 transition-all"
          >
            {isEditing ? 'Update Account' : 'Create Account'}
          </button>
        </div>
      </div>
    </div>
  );
};
