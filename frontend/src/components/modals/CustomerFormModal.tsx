import React, { useState, useEffect, useCallback } from 'react';
import type { Customer, CustomerType } from '../../data/mockData';
import { useTheme } from '../../contexts/ThemeContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../ui/dialog';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { 
  User, UserPlus, Mail, Phone, MapPin, Save, Building2, 
  CreditCard, IdCard, FileText, Loader2, AlertCircle, Sparkles,
  ArrowRight, ArrowLeft, Check, Shield, Star
} from 'lucide-react';
import { customerService, type CreateCustomerDTO, type UpdateCustomerDTO } from '../../services/customerService';

interface CustomerFormModalProps {
  isOpen: boolean;
  customer?: Customer;
  onClose: () => void;
  onSave: (customer: Customer) => void;
  shopId?: string;
}

interface CustomerFormData {
  name: string;
  email: string;
  phone: string;
  address: string;
  nic: string;
  customerType: CustomerType;
  notes: string;
  creditLimit: number;
}

const customerTypeOptions: { value: CustomerType; label: string; description: string; icon: React.ReactNode }[] = [
  { value: 'REGULAR', label: 'Regular', description: 'Walk-in customer', icon: <User className="w-4 h-4" /> },
  { value: 'WHOLESALE', label: 'Wholesale', description: 'Bulk buyer', icon: <Building2 className="w-4 h-4" /> },
  { value: 'DEALER', label: 'Dealer', description: 'Reseller/Dealer', icon: <Shield className="w-4 h-4" /> },
  { value: 'CORPORATE', label: 'Corporate', description: 'Business/Company', icon: <Building2 className="w-4 h-4" /> },
  { value: 'VIP', label: 'VIP', description: 'Special privileges', icon: <Star className="w-4 h-4" /> },
];

const steps = [
  { id: 1, title: 'Personal', icon: User, description: 'Basic info' },
  { id: 2, title: 'Contact', icon: Phone, description: 'Contact details' },
  { id: 3, title: 'Account', icon: CreditCard, description: 'Credit settings' },
];

export const CustomerFormModal: React.FC<CustomerFormModalProps> = ({
  isOpen,
  customer,
  onClose,
  onSave,
  shopId,
}) => {
  const { theme } = useTheme();
  const [currentStep, setCurrentStep] = useState(1);
  
  const [formData, setFormData] = useState<CustomerFormData>({
    name: '',
    email: '',
    phone: '',
    address: '',
    nic: '',
    customerType: 'REGULAR',
    notes: '',
    creditLimit: 50000,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  useEffect(() => {
    if (customer) {
      setFormData({
        name: customer.name,
        email: customer.email || '',
        phone: customer.phone,
        address: customer.address || '',
        nic: customer.nic || '',
        customerType: customer.customerType || 'REGULAR',
        notes: customer.notes || '',
        creditLimit: customer.creditLimit || 50000,
      });
    } else {
      setFormData({
        name: '',
        email: '',
        phone: '',
        address: '',
        nic: '',
        customerType: 'REGULAR',
        notes: '',
        creditLimit: 50000,
      });
    }
    setErrors({});
    setApiError(null);
    setCurrentStep(1);
  }, [customer, isOpen]);

  const validateNIC = (nic: string): boolean => {
    if (!nic) return true;
    const oldFormat = /^[0-9]{9}[vVxX]$/;
    const newFormat = /^[0-9]{12}$/;
    return oldFormat.test(nic) || newFormat.test(nic);
  };

  const validatePhone = (phone: string): boolean => {
    const mobileFormat = /^(0[0-9]{2}[-\s]?[0-9]{7}|0[0-9]{9}|\+94[0-9]{9})$/;
    return mobileFormat.test(phone.replace(/\s/g, ''));
  };

  const validateStep = (step: number): boolean => {
    const newErrors: Record<string, string> = {};
    
    if (step === 1) {
      if (!formData.name.trim()) {
        newErrors.name = 'Customer name is required';
      } else if (formData.name.trim().length < 2) {
        newErrors.name = 'Name must be at least 2 characters';
      }
      if (formData.nic && !validateNIC(formData.nic)) {
        newErrors.nic = 'Invalid NIC format (e.g., 881234567V or 199012345678)';
      }
    }
    
    if (step === 2) {
      if (!formData.phone.trim()) {
        newErrors.phone = 'Phone number is required';
      } else if (!validatePhone(formData.phone)) {
        newErrors.phone = 'Invalid Sri Lankan phone number';
      }
      if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
        newErrors.email = 'Invalid email format';
      }
    }
    
    if (step === 3) {
      if (formData.creditLimit < 0) {
        newErrors.creditLimit = 'Credit limit cannot be negative';
      }
    }
    
    setErrors(prev => {
      const cleared = { ...prev };
      const stepFields: Record<number, string[]> = {
        1: ['name', 'nic'],
        2: ['phone', 'email'],
        3: ['creditLimit'],
      };
      stepFields[step]?.forEach(f => delete cleared[f]);
      return { ...cleared, ...newErrors };
    });
    
    return Object.keys(newErrors).length === 0;
  };

  const validateForm = (): boolean => {
    let isValid = true;
    for (let step = 1; step <= 3; step++) {
      if (!validateStep(step)) isValid = false;
    }
    return isValid;
  };

  const handleNext = () => {
    if (validateStep(currentStep) && currentStep < 3) {
      setCurrentStep(prev => prev + 1);
    }
  };

  const handlePrev = () => {
    if (currentStep > 1) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) {
      for (let step = 1; step <= 3; step++) {
        if (!validateStep(step)) {
          setCurrentStep(step);
          break;
        }
      }
      return;
    }

    setIsLoading(true);
    setApiError(null);

    try {
      if (customer) {
        const updateData: UpdateCustomerDTO = {
          name: formData.name.trim(),
          email: formData.email.trim() || undefined,
          phone: formData.phone.trim(),
          address: formData.address.trim() || undefined,
          nic: formData.nic.trim() || undefined,
          customerType: formData.customerType,
          notes: formData.notes.trim() || undefined,
          creditLimit: formData.creditLimit,
        };

        const updatedCustomer = await customerService.update(customer.id, updateData, shopId);
        const frontendCustomer: Customer = {
          id: updatedCustomer.id,
          name: updatedCustomer.name,
          email: updatedCustomer.email || '',
          phone: updatedCustomer.phone,
          address: updatedCustomer.address,
          nic: updatedCustomer.nic,
          customerType: (updatedCustomer.customerType as CustomerType) || 'REGULAR',
          notes: updatedCustomer.notes,
          totalSpent: updatedCustomer.totalSpent || 0,
          totalOrders: updatedCustomer.totalOrders || 0,
          lastPurchase: updatedCustomer.lastPurchase,
          creditBalance: updatedCustomer.creditBalance || 0,
          creditLimit: updatedCustomer.creditLimit || 0,
          creditStatus: (updatedCustomer.creditStatus?.toLowerCase() as 'clear' | 'active' | 'overdue') || 'clear',
          creditDueDate: updatedCustomer.creditDueDate,
        };
        onSave(frontendCustomer);
      } else {
        const createData: CreateCustomerDTO = {
          name: formData.name.trim(),
          email: formData.email.trim() || undefined,
          phone: formData.phone.trim(),
          address: formData.address.trim() || undefined,
          nic: formData.nic.trim() || undefined,
          customerType: formData.customerType,
          notes: formData.notes.trim() || undefined,
          creditLimit: formData.creditLimit,
        };

        const newCustomer = await customerService.create(createData, shopId);
        const frontendCustomer: Customer = {
          id: newCustomer.id,
          name: newCustomer.name,
          email: newCustomer.email || '',
          phone: newCustomer.phone,
          address: newCustomer.address,
          nic: newCustomer.nic,
          customerType: (newCustomer.customerType as CustomerType) || 'REGULAR',
          notes: newCustomer.notes,
          totalSpent: 0,
          totalOrders: 0,
          creditBalance: 0,
          creditLimit: newCustomer.creditLimit || 0,
          creditStatus: 'clear',
        };
        onSave(frontendCustomer);
      }
      onClose();
    } catch (error) {
      console.error('Failed to save customer:', error);
      setApiError(error instanceof Error ? error.message : 'Failed to save customer');
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (field: keyof CustomerFormData, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
    setApiError(null);
  };

  const isEditing = !!customer;

  const inputClass = useCallback((hasError: boolean = false) => `w-full px-3 sm:px-4 py-2.5 sm:py-3 rounded-xl border text-sm transition-all duration-200 ${
    theme === 'dark'
      ? `bg-slate-800/80 border-slate-700/80 text-white placeholder:text-slate-500 focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/20 ${hasError ? 'border-red-500/80 focus:border-red-500 focus:ring-red-500/20' : ''}`
      : `bg-white border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 ${hasError ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20' : ''}`
  }`, [theme]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className={`w-[95vw] max-w-2xl max-h-[92vh] sm:max-h-[88vh] overflow-hidden p-0 rounded-2xl ${
        theme === 'dark' ? 'bg-slate-900 border-slate-700/50' : 'bg-white border-slate-200'
      }`}>
        <DialogHeader className="sr-only">
          <DialogTitle>{isEditing ? 'Edit Customer' : 'Add New Customer'}</DialogTitle>
          <DialogDescription>
            {isEditing ? 'Update customer information' : 'Add a new customer to the system'}
          </DialogDescription>
        </DialogHeader>

        {/* Creative Gradient Header + Step Progress */}
        <div className={`relative overflow-hidden ${isEditing 
          ? 'bg-gradient-to-br from-emerald-600 via-teal-500 to-teal-600' 
          : 'bg-gradient-to-br from-violet-600 via-purple-500 to-indigo-600'
        }`}>
          <div className="absolute inset-0 overflow-hidden">
            <div className="absolute -top-6 -right-6 w-24 h-24 bg-white/10 rounded-full blur-2xl" />
            <div className="absolute -bottom-4 -left-4 w-20 h-20 bg-white/10 rounded-full blur-xl" />
          </div>

          <div className="relative px-4 pt-4 pb-3 sm:px-5 sm:pt-5 sm:pb-4 text-white">
            <div className="flex items-center gap-3 mb-3 sm:mb-4">
              <div className="w-10 h-10 sm:w-11 sm:h-11 bg-white/20 backdrop-blur rounded-xl flex items-center justify-center flex-shrink-0">
                {isEditing ? <User className="w-5 h-5" /> : <UserPlus className="w-5 h-5" />}
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="text-base sm:text-lg font-bold truncate">
                  {isEditing ? `Edit ${formData.name || 'Customer'}` : 'New Customer'}
                </h2>
                <p className="text-xs opacity-80">
                  Step {currentStep}/3 — {steps[currentStep - 1].description}
                </p>
              </div>
              {isEditing && customer && (
                <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 bg-white/20 backdrop-blur rounded-lg text-xs font-medium">
                  <Sparkles className="w-3 h-3" />
                  {customer.totalOrders} orders
                </div>
              )}
            </div>

            {/* Step Pills */}
            <div className="flex items-center gap-1 sm:gap-1.5">
              {steps.map((step, index) => {
                const StepIcon = step.icon;
                const isActive = currentStep === step.id;
                const isCompleted = currentStep > step.id;
                return (
                  <React.Fragment key={step.id}>
                    <button
                      type="button"
                      onClick={() => { if (isCompleted || isActive) setCurrentStep(step.id); }}
                      className={`flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1.5 rounded-lg text-[11px] sm:text-xs font-medium transition-all flex-shrink-0 ${
                        isActive
                          ? 'bg-white text-slate-900 shadow-lg scale-[1.03]'
                          : isCompleted
                            ? 'bg-white/25 text-white hover:bg-white/35 cursor-pointer'
                            : 'bg-white/10 text-white/50'
                      }`}
                    >
                      {isCompleted ? <Check className="w-3 h-3 sm:w-3.5 sm:h-3.5" /> : <StepIcon className="w-3 h-3 sm:w-3.5 sm:h-3.5" />}
                      <span className="hidden min-[400px]:inline">{step.title}</span>
                    </button>
                    {index < steps.length - 1 && (
                      <div className={`flex-1 h-0.5 rounded-full min-w-3 ${isCompleted ? 'bg-white/50' : 'bg-white/15'}`} />
                    )}
                  </React.Fragment>
                );
              })}
            </div>
          </div>
        </div>

        {/* API Error */}
        {apiError && (
          <div className="mx-3 sm:mx-5 mt-3 p-3 bg-red-500/10 border border-red-500/30 rounded-xl flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-red-500">{apiError}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          <div className="flex-1 overflow-y-auto px-3 sm:px-5 py-3 sm:py-4">
            
            {/* ── Step 1: Personal Info ── */}
            {currentStep === 1 && (
              <div className="space-y-3.5 sm:space-y-4">
                {/* Name */}
                <div className="space-y-1.5">
                  <Label className={`flex items-center gap-1.5 text-xs sm:text-sm font-medium ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                    <User className="w-3.5 h-3.5 text-emerald-500" />
                    Full Name <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    value={formData.name}
                    onChange={(e) => handleChange('name', e.target.value)}
                    placeholder="Enter customer's full name"
                    disabled={isLoading}
                    className={inputClass(!!errors.name)}
                    autoFocus
                  />
                  {errors.name && <p className="text-[11px] text-red-500 flex items-center gap-1"><AlertCircle className="w-3 h-3" />{errors.name}</p>}
                </div>

                {/* NIC */}
                <div className="space-y-1.5">
                  <Label className={`flex items-center gap-1.5 text-xs sm:text-sm font-medium ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                    <IdCard className="w-3.5 h-3.5 text-blue-500" />
                    NIC Number
                  </Label>
                  <Input
                    value={formData.nic}
                    onChange={(e) => handleChange('nic', e.target.value.toUpperCase())}
                    placeholder="881234567V or 199012345678"
                    disabled={isLoading}
                    className={inputClass(!!errors.nic)}
                  />
                  {errors.nic && <p className="text-[11px] text-red-500 flex items-center gap-1"><AlertCircle className="w-3 h-3" />{errors.nic}</p>}
                  <p className={`text-[10px] sm:text-xs ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>
                    For warranty claims & credit verification
                  </p>
                </div>

                {/* Customer Type Grid */}
                <div className="space-y-1.5">
                  <Label className={`flex items-center gap-1.5 text-xs sm:text-sm font-medium ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                    <Building2 className="w-3.5 h-3.5 text-purple-500" />
                    Customer Type
                  </Label>
                  <div className="grid grid-cols-2 min-[480px]:grid-cols-3 gap-1.5 sm:gap-2">
                    {customerTypeOptions.map(opt => {
                      const isSelected = formData.customerType === opt.value;
                      return (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => handleChange('customerType', opt.value)}
                          disabled={isLoading}
                          className={`flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-2 sm:py-2.5 rounded-xl border text-left transition-all ${
                            isSelected
                              ? theme === 'dark'
                                ? 'bg-emerald-500/15 border-emerald-500/50 text-emerald-400 ring-1 ring-emerald-500/30'
                                : 'bg-emerald-50 border-emerald-300 text-emerald-700 ring-1 ring-emerald-500/30'
                              : theme === 'dark'
                                ? 'bg-slate-800/60 border-slate-700/60 text-slate-400 hover:bg-slate-800'
                                : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                          }`}
                        >
                          <span className="flex-shrink-0">{opt.icon}</span>
                          <div className="min-w-0">
                            <span className="block text-[11px] sm:text-xs font-semibold truncate">{opt.label}</span>
                            <span className={`block text-[9px] sm:text-[10px] truncate ${isSelected ? 'opacity-70' : 'opacity-50'}`}>{opt.description}</span>
                          </div>
                          {isSelected && <Check className="w-3.5 h-3.5 ml-auto flex-shrink-0" />}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Notes */}
                <div className="space-y-1.5">
                  <Label className={`flex items-center gap-1.5 text-xs sm:text-sm font-medium ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                    <FileText className="w-3.5 h-3.5 text-slate-500" />
                    Notes
                  </Label>
                  <Textarea
                    value={formData.notes}
                    onChange={(e) => handleChange('notes', e.target.value)}
                    placeholder="Additional notes..."
                    rows={2}
                    disabled={isLoading}
                    className={inputClass(false)}
                  />
                </div>
              </div>
            )}

            {/* ── Step 2: Contact Details ── */}
            {currentStep === 2 && (
              <div className="space-y-3.5 sm:space-y-4">
                {/* Phone */}
                <div className="space-y-1.5">
                  <Label className={`flex items-center gap-1.5 text-xs sm:text-sm font-medium ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                    <Phone className="w-3.5 h-3.5 text-emerald-500" />
                    Phone Number <span className="text-red-500">*</span>
                  </Label>
                  <div className="relative">
                    <div className={`absolute left-3 top-1/2 -translate-y-1/2 text-[10px] sm:text-xs font-medium px-1.5 py-0.5 rounded ${
                      theme === 'dark' ? 'bg-slate-700 text-slate-400' : 'bg-slate-100 text-slate-500'
                    }`}>+94</div>
                    <Input
                      value={formData.phone}
                      onChange={(e) => handleChange('phone', e.target.value)}
                      placeholder="07X-XXXXXXX"
                      disabled={isLoading}
                      className={`${inputClass(!!errors.phone)} !pl-14`}
                      autoFocus
                    />
                  </div>
                  {errors.phone && <p className="text-[11px] text-red-500 flex items-center gap-1"><AlertCircle className="w-3 h-3" />{errors.phone}</p>}
                </div>

                {/* Email */}
                <div className="space-y-1.5">
                  <Label className={`flex items-center gap-1.5 text-xs sm:text-sm font-medium ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                    <Mail className="w-3.5 h-3.5 text-blue-500" />
                    Email Address
                  </Label>
                  <Input
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleChange('email', e.target.value)}
                    placeholder="customer@email.com (optional)"
                    disabled={isLoading}
                    className={inputClass(!!errors.email)}
                  />
                  {errors.email && <p className="text-[11px] text-red-500 flex items-center gap-1"><AlertCircle className="w-3 h-3" />{errors.email}</p>}
                </div>

                {/* Address */}
                <div className="space-y-1.5">
                  <Label className={`flex items-center gap-1.5 text-xs sm:text-sm font-medium ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                    <MapPin className="w-3.5 h-3.5 text-rose-500" />
                    Address
                  </Label>
                  <Textarea
                    value={formData.address}
                    onChange={(e) => handleChange('address', e.target.value)}
                    placeholder="Full postal address (optional)"
                    rows={2}
                    disabled={isLoading}
                    className={inputClass(false)}
                  />
                </div>

                {/* Contact Preview */}
                {(formData.phone || formData.email) && (
                  <div className={`p-3 rounded-xl border-2 border-dashed ${
                    theme === 'dark' ? 'border-slate-700 bg-slate-800/30' : 'border-slate-200 bg-slate-50'
                  }`}>
                    <p className={`text-[10px] sm:text-xs font-semibold mb-2 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                      Contact Preview
                    </p>
                    <div className="flex items-center gap-2.5">
                      <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center text-white font-bold text-sm ${
                        isEditing
                          ? 'bg-gradient-to-br from-emerald-500 to-teal-600'
                          : 'bg-gradient-to-br from-violet-500 to-purple-600'
                      }`}>
                        {(formData.name || '?').charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-semibold truncate ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                          {formData.name || 'Customer Name'}
                        </p>
                        <div className="flex flex-wrap gap-x-3 gap-y-0.5">
                          {formData.phone && (
                            <span className={`text-[11px] ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                              📞 {formData.phone}
                            </span>
                          )}
                          {formData.email && (
                            <span className={`text-[11px] truncate ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                              ✉️ {formData.email}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ── Step 3: Account Settings ── */}
            {currentStep === 3 && (
              <div className="space-y-3.5 sm:space-y-4">
                {/* Credit Limit */}
                <div className="space-y-1.5">
                  <Label className={`flex items-center gap-1.5 text-xs sm:text-sm font-medium ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                    <CreditCard className="w-3.5 h-3.5 text-emerald-500" />
                    Credit Limit
                  </Label>
                  <div className={`flex items-center gap-2 px-3 sm:px-4 py-2.5 sm:py-3 rounded-xl border ${
                    theme === 'dark' ? 'bg-slate-800/80 border-slate-700/80' : 'bg-white border-slate-200'
                  } ${errors.creditLimit ? 'border-red-500' : ''}`}>
                    <span className={`text-sm sm:text-base font-bold ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>Rs.</span>
                    <input
                      type="number"
                      min="0"
                      step="5000"
                      value={formData.creditLimit}
                      onChange={(e) => handleChange('creditLimit', parseFloat(e.target.value) || 0)}
                      disabled={isLoading}
                      className={`flex-1 bg-transparent outline-none text-lg sm:text-2xl font-bold min-w-0 ${
                        theme === 'dark' ? 'text-white' : 'text-slate-900'
                      }`}
                    />
                  </div>
                  {errors.creditLimit && <p className="text-[11px] text-red-500 flex items-center gap-1"><AlertCircle className="w-3 h-3" />{errors.creditLimit}</p>}
                  
                  {/* Quick Amount Buttons */}
                  <div className="flex gap-1.5 flex-wrap">
                    {[10000, 25000, 50000, 100000, 250000, 500000].map((amount) => (
                      <button
                        key={amount}
                        type="button"
                        onClick={() => handleChange('creditLimit', amount)}
                        disabled={isLoading}
                        className={`px-2 sm:px-2.5 py-1 sm:py-1.5 rounded-lg text-[10px] sm:text-xs font-medium transition-all ${
                          formData.creditLimit === amount
                            ? 'bg-emerald-500 text-white shadow-md'
                            : theme === 'dark'
                              ? 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        {amount >= 100000 ? `${amount / 1000}K` : amount.toLocaleString()}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Summary Card */}
                <div className={`p-3 sm:p-4 rounded-xl ${
                  theme === 'dark' 
                    ? 'bg-gradient-to-br from-slate-800/80 to-slate-800/40 border border-slate-700/50' 
                    : 'bg-gradient-to-br from-slate-50 to-white border border-slate-200'
                }`}>
                  <h4 className={`text-xs sm:text-sm font-semibold mb-2.5 flex items-center gap-2 ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                    <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                    Customer Summary
                  </h4>
                  <div className="grid grid-cols-2 gap-2 sm:gap-3">
                    {[
                      { label: 'Name', value: formData.name || '-' },
                      { label: 'Type', value: customerTypeOptions.find(t => t.value === formData.customerType)?.label || '-' },
                      { label: 'Phone', value: formData.phone || '-' },
                      { label: 'Credit', value: `Rs. ${formData.creditLimit.toLocaleString()}`, highlight: true },
                    ].map(item => (
                      <div key={item.label} className={`p-2 sm:p-2.5 rounded-lg ${theme === 'dark' ? 'bg-slate-900/50' : 'bg-white'}`}>
                        <p className={`text-[10px] sm:text-xs ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>{item.label}</p>
                        <p className={`text-xs sm:text-sm font-semibold truncate ${
                          item.highlight ? 'text-emerald-500' : theme === 'dark' ? 'text-white' : 'text-slate-900'
                        }`}>
                          {item.value}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Editing Stats */}
                {isEditing && customer && (
                  <div className={`p-3 sm:p-4 rounded-xl border-2 border-dashed ${
                    theme === 'dark' ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-emerald-200 bg-emerald-50/50'
                  }`}>
                    <p className={`text-[10px] sm:text-xs font-semibold mb-2 ${theme === 'dark' ? 'text-emerald-400' : 'text-emerald-600'}`}>
                      Current Statistics
                    </p>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
                      <div className="text-center">
                        <p className={`text-sm sm:text-lg font-bold ${theme === 'dark' ? 'text-emerald-400' : 'text-emerald-600'}`}>
                          Rs. {customer.totalSpent.toLocaleString()}
                        </p>
                        <p className={`text-[10px] ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>Total Spent</p>
                      </div>
                      <div className="text-center">
                        <p className={`text-sm sm:text-lg font-bold ${theme === 'dark' ? 'text-blue-400' : 'text-blue-600'}`}>
                          {customer.totalOrders}
                        </p>
                        <p className={`text-[10px] ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>Orders</p>
                      </div>
                      <div className="text-center">
                        <p className={`text-sm sm:text-lg font-bold ${customer.creditBalance > 0 ? 'text-amber-500' : theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                          Rs. {customer.creditBalance.toLocaleString()}
                        </p>
                        <p className={`text-[10px] ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>Credit</p>
                      </div>
                      <div className="text-center">
                        <span className={`inline-block px-2 py-0.5 rounded-lg text-[10px] sm:text-xs font-medium ${
                          customer.creditStatus === 'clear'
                            ? 'bg-emerald-500/10 text-emerald-400'
                            : customer.creditStatus === 'active'
                              ? 'bg-blue-500/10 text-blue-400'
                              : 'bg-red-500/10 text-red-400'
                        }`}>
                          {customer.creditStatus?.toUpperCase()}
                        </span>
                        <p className={`text-[10px] mt-0.5 ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>Status</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Fixed Footer */}
          <div className={`flex items-center gap-2 px-3 sm:px-5 py-2.5 sm:py-3 border-t ${
            theme === 'dark' ? 'border-slate-800 bg-slate-900/80' : 'border-slate-200 bg-slate-50/80'
          } backdrop-blur-sm`}>
            {currentStep === 1 ? (
              <button type="button" onClick={onClose} disabled={isLoading}
                className={`px-3 py-2 rounded-xl text-xs sm:text-sm font-medium transition-colors ${
                  theme === 'dark' ? 'text-slate-400 hover:text-white hover:bg-slate-800' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}>
                Cancel
              </button>
            ) : (
              <button type="button" onClick={handlePrev} disabled={isLoading}
                className={`flex items-center gap-1 px-3 py-2 rounded-xl text-xs sm:text-sm font-medium transition-colors ${
                  theme === 'dark' ? 'text-slate-400 hover:text-white hover:bg-slate-800' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}>
                <ArrowLeft className="w-3.5 h-3.5" />
                Back
              </button>
            )}

            <div className="flex-1" />

            {currentStep < 3 ? (
              <button type="button" onClick={handleNext} disabled={isLoading}
                className={`flex items-center gap-1.5 px-4 sm:px-5 py-2 sm:py-2.5 rounded-xl text-xs sm:text-sm font-medium transition-all ${
                  isEditing
                    ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white hover:shadow-lg hover:shadow-emerald-500/25'
                    : 'bg-gradient-to-r from-violet-500 to-purple-500 text-white hover:shadow-lg hover:shadow-violet-500/25'
                }`}>
                Next <ArrowRight className="w-3.5 h-3.5" />
              </button>
            ) : (
              <button type="submit" disabled={isLoading}
                className={`flex items-center gap-1.5 px-4 sm:px-5 py-2 sm:py-2.5 rounded-xl text-xs sm:text-sm font-medium transition-all ${
                  isEditing
                    ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white hover:shadow-lg hover:shadow-emerald-500/25'
                    : 'bg-gradient-to-r from-violet-500 to-purple-500 text-white hover:shadow-lg hover:shadow-violet-500/25'
                } ${isLoading ? 'opacity-60 cursor-not-allowed' : ''}`}>
                {isLoading ? (
                  <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Saving...</>
                ) : (
                  <><Save className="w-3.5 h-3.5" /> {isEditing ? 'Update' : 'Create'}</>
                )}
              </button>
            )}
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
