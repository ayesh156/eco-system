import React, { useState, useEffect } from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import type { Supplier } from '../../data/mockData';
import { 
  X, Building2, User, Mail, Phone, MapPin, CreditCard, Calendar,
  Star, Tag, FileText, Banknote, Sparkles, ChevronDown
} from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';

interface SupplierFormModalProps {
  isOpen: boolean;
  supplier?: Supplier;
  onClose: () => void;
  onSave: (supplier: Supplier) => void;
}

interface FormData {
  name: string;
  company: string;
  email: string;
  phone: string;
  address: string;
  creditLimit: number;
  creditBalance: number;
  creditDueDate: string;
  creditStatus: 'clear' | 'active' | 'overdue';
  bankDetails: string;
  notes: string;
  rating: number;
  categories: string[];
}

const availableCategories = [
  'Processors', 'Graphics Cards', 'Motherboards', 'Memory', 'Storage',
  'Power Supply', 'Cooling', 'Cases', 'Monitors', 'Peripherals'
];

export const SupplierFormModal: React.FC<SupplierFormModalProps> = ({
  isOpen,
  supplier,
  onClose,
  onSave,
}) => {
  const { theme } = useTheme();
  const isEditing = !!supplier;

  const [formData, setFormData] = useState<FormData>({
    name: '',
    company: '',
    email: '',
    phone: '',
    address: '',
    creditLimit: 500000,
    creditBalance: 0,
    creditDueDate: '',
    creditStatus: 'clear',
    bankDetails: '',
    notes: '',
    rating: 5,
    categories: [],
  });

  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>({});
  const [activeTab, setActiveTab] = useState<'basic' | 'credit' | 'extra'>('basic');
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [datePickerMonth, setDatePickerMonth] = useState(new Date());

  useEffect(() => {
    if (supplier) {
      setFormData({
        name: supplier.name,
        company: supplier.company,
        email: supplier.email,
        phone: supplier.phone,
        address: supplier.address || '',
        creditLimit: supplier.creditLimit,
        creditBalance: supplier.creditBalance,
        creditDueDate: supplier.creditDueDate || '',
        creditStatus: supplier.creditStatus,
        bankDetails: supplier.bankDetails || '',
        notes: supplier.notes || '',
        rating: supplier.rating,
        categories: supplier.categories,
      });
    } else {
      setFormData({
        name: '',
        company: '',
        email: '',
        phone: '',
        address: '',
        creditLimit: 500000,
        creditBalance: 0,
        creditDueDate: '',
        creditStatus: 'clear',
        bankDetails: '',
        notes: '',
        rating: 5,
        categories: [],
      });
    }
    setActiveTab('basic');
    setErrors({});
  }, [supplier, isOpen]);

  const validateForm = (): boolean => {
    const newErrors: Partial<Record<keyof FormData, string>> = {};

    if (!formData.name.trim()) newErrors.name = 'Contact name is required';
    if (!formData.company.trim()) newErrors.company = 'Company name is required';
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Invalid email format';
    }
    if (!formData.phone.trim()) newErrors.phone = 'Phone is required';
    if (formData.creditLimit < 0) newErrors.creditLimit = 'Credit limit cannot be negative';
    if (formData.creditBalance < 0) newErrors.creditBalance = 'Credit balance cannot be negative';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateForm()) {
      const newSupplier: Supplier = {
        id: supplier?.id || `sup-${Date.now()}`,
        name: formData.name,
        company: formData.company,
        email: formData.email,
        phone: formData.phone,
        address: formData.address,
        totalPurchases: supplier?.totalPurchases || 0,
        totalOrders: supplier?.totalOrders || 0,
        lastOrder: supplier?.lastOrder,
        creditBalance: formData.creditBalance,
        creditLimit: formData.creditLimit,
        creditDueDate: formData.creditDueDate || undefined,
        creditStatus: formData.creditStatus,
        bankDetails: formData.bankDetails || undefined,
        notes: formData.notes || undefined,
        rating: formData.rating,
        categories: formData.categories,
      };
      onSave(newSupplier);
      onClose();
    }
  };

  const handleCategoryToggle = (category: string) => {
    setFormData(prev => ({
      ...prev,
      categories: prev.categories.includes(category)
        ? prev.categories.filter(c => c !== category)
        : [...prev.categories, category]
    }));
  };

  const formatCurrency = (amount: number) => `Rs. ${amount.toLocaleString('en-LK')}`;

  // Calendar helper functions
  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const days: (Date | null)[] = [];
    for (let i = 0; i < firstDay; i++) days.push(null);
    for (let day = 1; day <= daysInMonth; day++) days.push(new Date(year, month, day));
    return days;
  };

  const formatDateForInput = (date: Date) => {
    return date.toISOString().split('T')[0];
  };

  const formatDateDisplay = (dateStr: string) => {
    if (!dateStr) return 'Select date';
    return new Date(dateStr).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const isSelectedDate = (date: Date, selectedDateStr: string) => {
    if (!selectedDateStr) return false;
    const selected = new Date(selectedDateStr);
    return date.getDate() === selected.getDate() &&
           date.getMonth() === selected.getMonth() &&
           date.getFullYear() === selected.getFullYear();
  };

  const handleDateSelect = (date: Date) => {
    setFormData(prev => ({ ...prev, creditDueDate: formatDateForInput(date) }));
    setShowDatePicker(false);
  };

  const changeMonth = (increment: number) => {
    const newMonth = new Date(datePickerMonth);
    newMonth.setMonth(newMonth.getMonth() + increment);
    setDatePickerMonth(newMonth);
  };

  if (!isOpen) return null;

  const inputClass = `w-full px-4 py-3 rounded-xl border transition-all ${
    theme === 'dark'
      ? 'bg-slate-800/50 border-slate-700 text-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20'
      : 'bg-white border-slate-200 text-slate-900 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20'
  }`;

  const labelClass = `block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal - Full scroll */}
      <div className={`relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl shadow-2xl animate-in zoom-in-95 duration-200 ${
        theme === 'dark' ? 'bg-slate-900' : 'bg-white'
      }`}>
        {/* Header with gradient */}
        <div className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-violet-600 via-purple-600 to-fuchsia-600" />
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4xIj48cGF0aCBkPSJNMzYgMzRoLTJ2LTRoMnY0em0wLTZ2LTRoLTJ2NGgyek0zNCAyNmgtMnYtNGgydjR6Ii8+PC9nPjwvZz48L3N2Zz4=')] opacity-30" />
          
          <div className="relative px-6 py-5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center">
                <Building2 className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">
                  {isEditing ? 'Edit Supplier' : 'Add New Supplier'}
                </h2>
                <p className="text-white/70 text-sm">
                  {isEditing ? 'Update supplier information' : 'Create a new supplier account'}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center text-white hover:bg-white/30 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Tabs */}
          <div className="relative px-6 pb-0 flex gap-1">
            {[
              { id: 'basic', label: 'Basic Info', icon: User },
              { id: 'credit', label: 'Credit & Payment', icon: CreditCard },
              { id: 'extra', label: 'Additional', icon: FileText },
            ].map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id as 'basic' | 'credit' | 'extra')}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-t-xl text-sm font-medium transition-all ${
                  activeTab === id
                    ? 'bg-white dark:bg-slate-900 text-violet-600 dark:text-violet-400 shadow-lg'
                    : 'text-white/70 hover:text-white hover:bg-white/10'
                }`}
              >
                <Icon className="w-4 h-4" />
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Form Content */}
        <form onSubmit={handleSubmit}>
          <div className="p-6 space-y-5">
            {/* Basic Info Tab */}
            {activeTab === 'basic' && (
              <div className="space-y-5 animate-in fade-in duration-200">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {/* Company Name */}
                  <div>
                    <label className={labelClass}>
                      <Building2 className="w-4 h-4 inline mr-2" />
                      Company Name *
                    </label>
                    <input
                      type="text"
                      value={formData.company}
                      onChange={(e) => setFormData(prev => ({ ...prev, company: e.target.value }))}
                      className={inputClass}
                      placeholder="Tech Solutions Ltd."
                    />
                    {errors.company && <p className="text-red-500 text-xs mt-1">{errors.company}</p>}
                  </div>

                  {/* Contact Name */}
                  <div>
                    <label className={labelClass}>
                      <User className="w-4 h-4 inline mr-2" />
                      Contact Person *
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                      className={inputClass}
                      placeholder="John Smith"
                    />
                    {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {/* Email */}
                  <div>
                    <label className={labelClass}>
                      <Mail className="w-4 h-4 inline mr-2" />
                      Email Address *
                    </label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                      className={inputClass}
                      placeholder="contact@company.com"
                    />
                    {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email}</p>}
                  </div>

                  {/* Phone */}
                  <div>
                    <label className={labelClass}>
                      <Phone className="w-4 h-4 inline mr-2" />
                      Phone Number *
                    </label>
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                      className={inputClass}
                      placeholder="+94 77 123 4567"
                    />
                    {errors.phone && <p className="text-red-500 text-xs mt-1">{errors.phone}</p>}
                  </div>
                </div>

                {/* Address */}
                <div>
                  <label className={labelClass}>
                    <MapPin className="w-4 h-4 inline mr-2" />
                    Address
                  </label>
                  <textarea
                    value={formData.address}
                    onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                    className={`${inputClass} resize-none`}
                    rows={2}
                    placeholder="123 Main Street, Colombo"
                  />
                </div>

                {/* Rating */}
                <div>
                  <label className={labelClass}>
                    <Star className="w-4 h-4 inline mr-2" />
                    Supplier Rating
                  </label>
                  <div className="flex items-center gap-2">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, rating: star }))}
                        className="p-1 transition-transform hover:scale-110"
                      >
                        <Star 
                          className={`w-8 h-8 transition-colors ${
                            star <= formData.rating 
                              ? 'text-amber-400 fill-amber-400' 
                              : theme === 'dark' ? 'text-slate-600' : 'text-slate-300'
                          }`} 
                        />
                      </button>
                    ))}
                    <span className={`ml-3 text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                      {formData.rating === 5 ? '⭐ Excellent' : formData.rating >= 4 ? '👍 Good' : formData.rating >= 3 ? '👌 Average' : '⚠️ Below Average'}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Credit Tab */}
            {activeTab === 'credit' && (
              <div className="space-y-5 animate-in fade-in duration-200">
                {/* Credit Status Cards */}
                <div>
                  <label className={labelClass}>Credit Status</label>
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { value: 'clear', label: 'Clear', icon: '✅', color: 'emerald', desc: 'No credit balance' },
                      { value: 'active', label: 'Active', icon: '🔵', color: 'blue', desc: 'Has active credit' },
                      { value: 'overdue', label: 'Overdue', icon: '🔴', color: 'red', desc: 'Payment overdue' },
                    ].map(({ value, label, icon, color, desc }) => (
                      <button
                        key={value}
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, creditStatus: value as 'clear' | 'active' | 'overdue' }))}
                        className={`p-4 rounded-2xl border-2 transition-all ${
                          formData.creditStatus === value
                            ? `border-${color}-500 bg-${color}-500/10 ring-2 ring-${color}-500/30`
                            : theme === 'dark' ? 'border-slate-700 hover:border-slate-600' : 'border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <div className="text-2xl mb-1">{icon}</div>
                        <div className={`font-semibold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>{label}</div>
                        <div className={`text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>{desc}</div>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {/* Credit Limit */}
                  <div>
                    <label className={labelClass}>
                      <CreditCard className="w-4 h-4 inline mr-2" />
                      Credit Limit
                    </label>
                    <div className="relative">
                      <span className={`absolute left-4 top-1/2 -translate-y-1/2 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>Rs.</span>
                      <input
                        type="number"
                        value={formData.creditLimit}
                        onChange={(e) => setFormData(prev => ({ ...prev, creditLimit: Number(e.target.value) }))}
                        className={`${inputClass} pl-12`}
                        placeholder="500000"
                      />
                    </div>
                    {errors.creditLimit && <p className="text-red-500 text-xs mt-1">{errors.creditLimit}</p>}
                  </div>

                  {/* Credit Balance */}
                  <div>
                    <label className={labelClass}>
                      <Banknote className="w-4 h-4 inline mr-2" />
                      Current Credit Balance (Naya)
                    </label>
                    <div className="relative">
                      <span className={`absolute left-4 top-1/2 -translate-y-1/2 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>Rs.</span>
                      <input
                        type="number"
                        value={formData.creditBalance}
                        onChange={(e) => setFormData(prev => ({ ...prev, creditBalance: Number(e.target.value) }))}
                        className={`${inputClass} pl-12`}
                        placeholder="0"
                      />
                    </div>
                    {errors.creditBalance && <p className="text-red-500 text-xs mt-1">{errors.creditBalance}</p>}
                  </div>
                </div>

                {/* Credit Due Date with Modern Calendar */}
                <div>
                  <label className={labelClass}>
                    <Calendar className="w-4 h-4 inline mr-2" />
                    Payment Due Date
                  </label>
                  <Popover open={showDatePicker} onOpenChange={setShowDatePicker}>
                    <PopoverTrigger asChild>
                      <button
                        type="button"
                        className={`w-full px-4 py-3 rounded-xl border transition-all flex items-center justify-between ${
                          theme === 'dark'
                            ? 'bg-slate-800/50 border-slate-700 text-white hover:bg-slate-800'
                            : 'bg-white border-slate-200 text-slate-900 hover:bg-slate-50'
                        }`}
                      >
                        <span className={!formData.creditDueDate ? (theme === 'dark' ? 'text-slate-500' : 'text-slate-400') : ''}>
                          {formatDateDisplay(formData.creditDueDate)}
                        </span>
                        <Calendar className="w-4 h-4" />
                      </button>
                    </PopoverTrigger>
                    <PopoverContent className={`w-[280px] p-0 ${theme === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`} align="start">
                      <div className={`p-3 ${theme === 'dark' ? 'bg-slate-800' : 'bg-white'}`}>
                        {/* Calendar Header */}
                        <div className="flex items-center justify-between mb-3">
                          <button
                            type="button"
                            onClick={() => changeMonth(-1)}
                            className={`p-1.5 rounded-lg transition-colors ${
                              theme === 'dark' ? 'hover:bg-slate-700 text-slate-400' : 'hover:bg-slate-100 text-slate-600'
                            }`}
                          >
                            ←
                          </button>
                          <span className={`text-sm font-semibold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                            {datePickerMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                          </span>
                          <button
                            type="button"
                            onClick={() => changeMonth(1)}
                            className={`p-1.5 rounded-lg transition-colors ${
                              theme === 'dark' ? 'hover:bg-slate-700 text-slate-400' : 'hover:bg-slate-100 text-slate-600'
                            }`}
                          >
                            →
                          </button>
                        </div>
                        {/* Calendar Grid */}
                        <div className="grid grid-cols-7 gap-1">
                          {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((day) => (
                            <div key={day} className={`text-center text-xs font-medium py-2 ${theme === 'dark' ? 'text-slate-500' : 'text-slate-500'}`}>
                              {day}
                            </div>
                          ))}
                          {getDaysInMonth(datePickerMonth).map((date, index) => (
                            <button
                              key={index}
                              type="button"
                              onClick={() => date && handleDateSelect(date)}
                              disabled={!date}
                              className={`text-sm py-2 rounded-lg transition-all ${
                                !date ? 'invisible' :
                                isSelectedDate(date, formData.creditDueDate)
                                  ? 'bg-emerald-500 text-white font-semibold'
                                  : theme === 'dark'
                                    ? 'hover:bg-slate-700 text-slate-300'
                                    : 'hover:bg-slate-100 text-slate-700'
                              }`}
                            >
                              {date?.getDate()}
                            </button>
                          ))}
                        </div>
                        {/* Calendar Footer */}
                        <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-700/50">
                          <button
                            type="button"
                            onClick={() => { setFormData(prev => ({ ...prev, creditDueDate: '' })); setShowDatePicker(false); }}
                            className={`text-xs px-3 py-1.5 rounded-lg transition-colors ${
                              theme === 'dark' ? 'hover:bg-slate-700 text-slate-400' : 'hover:bg-slate-100 text-slate-600'
                            }`}
                          >
                            Clear
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDateSelect(new Date())}
                            className={`text-xs px-3 py-1.5 rounded-lg transition-colors ${
                              theme === 'dark' ? 'hover:bg-slate-700 text-emerald-400' : 'hover:bg-slate-100 text-emerald-600'
                            }`}
                          >
                            Today
                          </button>
                        </div>
                      </div>
                    </PopoverContent>
                  </Popover>
                </div>

                {/* Credit Usage Preview - Only show when editing with existing credit */}
                {isEditing && formData.creditLimit > 0 && (
                  <div className={`p-4 rounded-2xl ${theme === 'dark' ? 'bg-slate-800/50' : 'bg-slate-50'}`}>
                    <div className="flex justify-between items-center mb-3">
                      <span className={`text-sm font-medium ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                        Credit Usage Preview
                      </span>
                      <span className={`text-sm font-bold ${
                        (formData.creditBalance / formData.creditLimit * 100) >= 90 ? 'text-red-500' :
                        (formData.creditBalance / formData.creditLimit * 100) >= 70 ? 'text-amber-500' : 'text-emerald-500'
                      }`}>
                        {((formData.creditBalance / formData.creditLimit) * 100).toFixed(1)}%
                      </span>
                    </div>
                    <div className={`h-3 rounded-full overflow-hidden ${theme === 'dark' ? 'bg-slate-700' : 'bg-slate-200'}`}>
                      <div 
                        className={`h-full rounded-full transition-all bg-gradient-to-r ${
                          (formData.creditBalance / formData.creditLimit * 100) >= 90 ? 'from-red-500 to-red-600' :
                          (formData.creditBalance / formData.creditLimit * 100) >= 70 ? 'from-amber-500 to-orange-500' : 
                          'from-emerald-500 to-teal-500'
                        }`}
                        style={{ width: `${Math.min((formData.creditBalance / formData.creditLimit) * 100, 100)}%` }}
                      />
                    </div>
                    <div className="flex justify-between mt-2">
                      <span className={`text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                        Balance: {formatCurrency(formData.creditBalance)}
                      </span>
                      <span className={`text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                        Limit: {formatCurrency(formData.creditLimit)}
                      </span>
                    </div>
                  </div>
                )}

                {/* Bank Details */}
                <div>
                  <label className={labelClass}>
                    <Banknote className="w-4 h-4 inline mr-2" />
                    Bank Details (for payments)
                  </label>
                  <textarea
                    value={formData.bankDetails}
                    onChange={(e) => setFormData(prev => ({ ...prev, bankDetails: e.target.value }))}
                    className={`${inputClass} resize-none`}
                    rows={2}
                    placeholder="Bank Name: ABC Bank&#10;Account: 1234567890"
                  />
                </div>
              </div>
            )}

            {/* Extra Tab */}
            {activeTab === 'extra' && (
              <div className="space-y-5 animate-in fade-in duration-200">
                {/* Categories */}
                <div>
                  <label className={labelClass}>
                    <Tag className="w-4 h-4 inline mr-2" />
                    Product Categories
                  </label>
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setShowCategoryDropdown(!showCategoryDropdown)}
                      className={`${inputClass} flex items-center justify-between text-left`}
                    >
                      <span className={formData.categories.length > 0 ? '' : theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}>
                        {formData.categories.length > 0 
                          ? `${formData.categories.length} categories selected`
                          : 'Select categories...'}
                      </span>
                      <ChevronDown className={`w-5 h-5 transition-transform ${showCategoryDropdown ? 'rotate-180' : ''}`} />
                    </button>
                    
                    {showCategoryDropdown && (
                      <div className={`absolute z-10 w-full mt-2 p-2 rounded-xl border shadow-xl ${
                        theme === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'
                      }`}>
                        <div className="grid grid-cols-2 gap-1 max-h-48 overflow-y-auto">
                          {availableCategories.map(cat => (
                            <button
                              key={cat}
                              type="button"
                              onClick={() => handleCategoryToggle(cat)}
                              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
                                formData.categories.includes(cat)
                                  ? 'bg-violet-500 text-white'
                                  : theme === 'dark' ? 'hover:bg-slate-700 text-slate-300' : 'hover:bg-slate-100 text-slate-700'
                              }`}
                            >
                              <div className={`w-4 h-4 rounded border flex items-center justify-center ${
                                formData.categories.includes(cat) 
                                  ? 'bg-white border-white' 
                                  : theme === 'dark' ? 'border-slate-600' : 'border-slate-300'
                              }`}>
                                {formData.categories.includes(cat) && <span className="text-violet-500 text-xs">✓</span>}
                              </div>
                              {cat}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                  
                  {/* Selected Categories Tags */}
                  {formData.categories.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-3">
                      {formData.categories.map(cat => (
                        <span 
                          key={cat}
                          className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm bg-gradient-to-r from-violet-500 to-purple-500 text-white"
                        >
                          {cat}
                          <button
                            type="button"
                            onClick={() => handleCategoryToggle(cat)}
                            className="hover:bg-white/20 rounded-full p-0.5"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Notes */}
                <div>
                  <label className={labelClass}>
                    <FileText className="w-4 h-4 inline mr-2" />
                    Notes & Additional Information
                  </label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                    className={`${inputClass} resize-none`}
                    rows={4}
                    placeholder="Add any additional notes about this supplier..."
                  />
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className={`sticky bottom-0 px-6 py-4 border-t ${
            theme === 'dark' ? 'bg-slate-900/95 border-slate-800 backdrop-blur' : 'bg-white/95 border-slate-200 backdrop-blur'
          }`}>
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={onClose}
                className={`px-5 py-2.5 rounded-xl font-medium transition-colors ${
                  theme === 'dark' 
                    ? 'text-slate-400 hover:text-white hover:bg-slate-800' 
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-violet-600 to-purple-600 text-white rounded-xl font-medium hover:opacity-90 transition-opacity shadow-lg shadow-violet-500/30"
              >
                <Sparkles className="w-4 h-4" />
                {isEditing ? 'Update Supplier' : 'Create Supplier'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
