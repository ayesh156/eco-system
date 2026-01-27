import React, { useState, useEffect } from 'react';
import type { Customer, CustomerType } from '../../data/mockData';
import { useTheme } from '../../contexts/ThemeContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../ui/dialog';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { SearchableSelect, type SearchableSelectOption } from '../ui/searchable-select';
import { User, UserPlus, Mail, Phone, MapPin, Save, Building2, Wallet, CreditCard, IdCard, FileText, Loader2, AlertCircle } from 'lucide-react';
import { customerService, type CreateCustomerDTO, type UpdateCustomerDTO } from '../../services/customerService';

interface CustomerFormModalProps {
  isOpen: boolean;
  customer?: Customer;
  onClose: () => void;
  onSave: (customer: Customer) => void;
  shopId?: string; // For SuperAdmin viewing other shops
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

// Customer type options for Sri Lankan context
const customerTypeOptions: { value: CustomerType; label: string; description: string }[] = [
  { value: 'REGULAR', label: 'Regular', description: 'Walk-in customer' },
  { value: 'WHOLESALE', label: 'Wholesale', description: 'Bulk buyer' },
  { value: 'DEALER', label: 'Dealer', description: 'Reseller/Dealer' },
  { value: 'CORPORATE', label: 'Corporate', description: 'Business/Company' },
  { value: 'VIP', label: 'VIP', description: 'Special privileges' },
];

export const CustomerFormModal: React.FC<CustomerFormModalProps> = ({
  isOpen,
  customer,
  onClose,
  onSave,
  shopId,
}) => {
  const { theme } = useTheme();
  
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
  }, [customer, isOpen]);

  // Validate Sri Lankan NIC format
  const validateNIC = (nic: string): boolean => {
    if (!nic) return true; // NIC is optional
    // Old format: 9 digits + V/X, New format: 12 digits
    const oldFormat = /^[0-9]{9}[vVxX]$/;
    const newFormat = /^[0-9]{12}$/;
    return oldFormat.test(nic) || newFormat.test(nic);
  };

  // Validate Sri Lankan phone format
  const validatePhone = (phone: string): boolean => {
    // Sri Lankan mobile: 07X-XXXXXXX or +947XXXXXXXX
    const mobileFormat = /^(0[0-9]{2}[-\s]?[0-9]{7}|0[0-9]{9}|\+94[0-9]{9})$/;
    return mobileFormat.test(phone.replace(/\s/g, ''));
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.name.trim()) {
      newErrors.name = 'Customer name is required';
    } else if (formData.name.trim().length < 2) {
      newErrors.name = 'Name must be at least 2 characters';
    }

    // Email is optional but must be valid if provided
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Invalid email format';
    }

    if (!formData.phone.trim()) {
      newErrors.phone = 'Phone number is required';
    } else if (!validatePhone(formData.phone)) {
      newErrors.phone = 'Invalid Sri Lankan phone number';
    }

    if (formData.nic && !validateNIC(formData.nic)) {
      newErrors.nic = 'Invalid NIC format (e.g., 881234567V or 199012345678)';
    }

    if (formData.creditLimit < 0) {
      newErrors.creditLimit = 'Credit limit cannot be negative';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsLoading(true);
    setApiError(null);

    try {
      if (customer) {
        // Update existing customer
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
        
        // Convert API response to frontend format
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
        // Create new customer
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
        
        // Convert API response to frontend format
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

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className={`max-w-2xl max-h-[90vh] overflow-y-auto p-0 ${
        theme === 'dark' ? 'bg-slate-900 border-slate-700/50' : 'bg-white border-slate-200'
      }`}>
        <DialogHeader className="sr-only">
          <DialogTitle>{isEditing ? 'Edit Customer' : 'Add New Customer'}</DialogTitle>
          <DialogDescription>
            {isEditing ? 'Update customer information' : 'Add a new customer'}
          </DialogDescription>
        </DialogHeader>

        {/* Gradient Header */}
        <div className={`p-6 text-white ${isEditing 
          ? 'bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-500' 
          : 'bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500'
        }`} aria-hidden="true">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-white/20 backdrop-blur rounded-xl flex items-center justify-center">
              {isEditing ? <User className="w-7 h-7" /> : <UserPlus className="w-7 h-7" />}
            </div>
            <div>
              <h2 className="text-2xl font-bold">
                {isEditing ? 'Edit Customer' : 'Add New Customer'}
              </h2>
              <p className="text-sm text-emerald-100">
                {isEditing ? 'Update customer information' : 'Add a new customer to the database'}
              </p>
            </div>
          </div>
        </div>

        {/* API Error Alert */}
        {apiError && (
          <div className="mx-6 mt-4 p-4 bg-red-500/10 border border-red-500/30 rounded-xl flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-red-500 font-medium">Error</p>
              <p className={`text-sm ${theme === 'dark' ? 'text-red-400' : 'text-red-600'}`}>{apiError}</p>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Basic Info Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Customer Name */}
            <div className="space-y-2">
              <Label htmlFor="name" className={`flex items-center gap-2 ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                <User className="w-4 h-4" />
                Customer Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => handleChange('name', e.target.value)}
                placeholder="Enter customer name"
                disabled={isLoading}
                className={`${
                  theme === 'dark' 
                    ? 'bg-slate-800 border-slate-700 text-white placeholder:text-slate-500' 
                    : 'bg-white border-slate-200'
                } ${errors.name ? 'border-red-500' : ''}`}
              />
              {errors.name && <p className="text-xs text-red-500">{errors.name}</p>}
            </div>

            {/* Phone */}
            <div className="space-y-2">
              <Label htmlFor="phone" className={`flex items-center gap-2 ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                <Phone className="w-4 h-4" />
                Phone Number <span className="text-red-500">*</span>
              </Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => handleChange('phone', e.target.value)}
                placeholder="07X-XXXXXXX"
                disabled={isLoading}
                className={`${
                  theme === 'dark' 
                    ? 'bg-slate-800 border-slate-700 text-white placeholder:text-slate-500' 
                    : 'bg-white border-slate-200'
                } ${errors.phone ? 'border-red-500' : ''}`}
              />
              {errors.phone && <p className="text-xs text-red-500">{errors.phone}</p>}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Email */}
            <div className="space-y-2">
              <Label htmlFor="email" className={`flex items-center gap-2 ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                <Mail className="w-4 h-4" />
                Email
              </Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => handleChange('email', e.target.value)}
                placeholder="Enter email address (optional)"
                disabled={isLoading}
                className={`${
                  theme === 'dark' 
                    ? 'bg-slate-800 border-slate-700 text-white placeholder:text-slate-500' 
                    : 'bg-white border-slate-200'
                } ${errors.email ? 'border-red-500' : ''}`}
              />
              {errors.email && <p className="text-xs text-red-500">{errors.email}</p>}
            </div>

            {/* NIC */}
            <div className="space-y-2">
              <Label htmlFor="nic" className={`flex items-center gap-2 ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                <IdCard className="w-4 h-4" />
                NIC Number
              </Label>
              <Input
                id="nic"
                value={formData.nic}
                onChange={(e) => handleChange('nic', e.target.value.toUpperCase())}
                placeholder="881234567V or 199012345678"
                disabled={isLoading}
                className={`${
                  theme === 'dark' 
                    ? 'bg-slate-800 border-slate-700 text-white placeholder:text-slate-500' 
                    : 'bg-white border-slate-200'
                } ${errors.nic ? 'border-red-500' : ''}`}
              />
              {errors.nic && <p className="text-xs text-red-500">{errors.nic}</p>}
              <p className={`text-xs ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>
                Required for warranty claims
              </p>
            </div>
          </div>

          {/* Address */}
          <div className="space-y-2">
            <Label htmlFor="address" className={`flex items-center gap-2 ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
              <MapPin className="w-4 h-4" />
              Address
            </Label>
            <Input
              id="address"
              value={formData.address}
              onChange={(e) => handleChange('address', e.target.value)}
              placeholder="Enter full address (optional)"
              disabled={isLoading}
              className={`${
                theme === 'dark' 
                  ? 'bg-slate-800 border-slate-700 text-white placeholder:text-slate-500' 
                  : 'bg-white border-slate-200'
              }`}
            />
          </div>

          {/* Customer Type & Credit Limit */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Customer Type */}
            <div className="space-y-2">
              <Label htmlFor="customerType" className={`flex items-center gap-2 ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                <Building2 className="w-4 h-4" />
                Customer Type
              </Label>
              <SearchableSelect
                options={customerTypeOptions.map(opt => ({
                  value: opt.value,
                  label: `${opt.label} - ${opt.description}`,
                  icon: <Building2 className="w-4 h-4" />
                } as SearchableSelectOption))}
                value={formData.customerType}
                onValueChange={(value) => handleChange('customerType', value as CustomerType)}
                placeholder="Select customer type..."
                searchPlaceholder="Search type..."
                emptyMessage="No customer types found"
                disabled={isLoading}
                theme={theme === 'dark' ? 'dark' : 'light'}
              />
            </div>

            {/* Credit Limit */}
            <div className="space-y-2">
              <Label htmlFor="creditLimit" className={`flex items-center gap-2 ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                <CreditCard className="w-4 h-4" />
                Credit Limit (Rs.)
              </Label>
              <Input
                id="creditLimit"
                type="number"
                min="0"
                step="1000"
                value={formData.creditLimit}
                onChange={(e) => handleChange('creditLimit', parseFloat(e.target.value) || 0)}
                placeholder="50000"
                disabled={isLoading}
                className={`${
                  theme === 'dark' 
                    ? 'bg-slate-800 border-slate-700 text-white placeholder:text-slate-500' 
                    : 'bg-white border-slate-200'
                } ${errors.creditLimit ? 'border-red-500' : ''}`}
              />
              {errors.creditLimit && <p className="text-xs text-red-500">{errors.creditLimit}</p>}
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes" className={`flex items-center gap-2 ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
              <FileText className="w-4 h-4" />
              Notes
            </Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => handleChange('notes', e.target.value)}
              placeholder="Additional notes about this customer (optional)"
              rows={3}
              disabled={isLoading}
              className={`${
                theme === 'dark' 
                  ? 'bg-slate-800 border-slate-700 text-white placeholder:text-slate-500' 
                  : 'bg-white border-slate-200'
              }`}
            />
          </div>

          {/* Stats (only show when editing) */}
          {isEditing && customer && (
            <div className={`grid grid-cols-2 md:grid-cols-4 gap-4 p-4 rounded-xl ${
              theme === 'dark' ? 'bg-slate-800/50' : 'bg-slate-50'
            }`}>
              <div className="flex items-center gap-2">
                <Wallet className={`w-4 h-4 ${theme === 'dark' ? 'text-emerald-400' : 'text-emerald-600'}`} />
                <div>
                  <p className={`text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>Total Spent</p>
                  <p className={`font-semibold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                    Rs. {customer.totalSpent.toLocaleString()}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Building2 className={`w-4 h-4 ${theme === 'dark' ? 'text-blue-400' : 'text-blue-600'}`} />
                <div>
                  <p className={`text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>Total Orders</p>
                  <p className={`font-semibold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                    {customer.totalOrders}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <CreditCard className={`w-4 h-4 ${customer.creditBalance > 0 ? 'text-amber-400' : 'text-slate-400'}`} />
                <div>
                  <p className={`text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>Credit Balance</p>
                  <p className={`font-semibold ${customer.creditBalance > 0 ? 'text-amber-500' : theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                    Rs. {customer.creditBalance.toLocaleString()}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${
                  customer.creditStatus === 'clear' ? 'bg-green-500' :
                  customer.creditStatus === 'active' ? 'bg-amber-500' : 'bg-red-500'
                }`} />
                <div>
                  <p className={`text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>Credit Status</p>
                  <p className={`font-semibold capitalize ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                    {customer.creditStatus}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className={`flex gap-3 pt-4 border-t ${theme === 'dark' ? 'border-slate-700' : 'border-slate-200'}`}>
            <button
              type="submit"
              disabled={isLoading}
              className="flex-1 px-4 py-2.5 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-700 hover:to-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl font-medium transition-all flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  {isEditing ? 'Update Customer' : 'Add Customer'}
                </>
              )}
            </button>
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className={`flex-1 px-4 py-2.5 rounded-xl font-medium transition-colors border disabled:opacity-50 ${
                theme === 'dark'
                  ? 'bg-slate-700/50 hover:bg-slate-700 text-white border-slate-600/50'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-900 border-slate-300'
              }`}
            >
              Cancel
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
