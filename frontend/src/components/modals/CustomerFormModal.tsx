import React, { useState, useEffect } from 'react';
import type { Customer } from '../../data/mockData';
import { useTheme } from '../../contexts/ThemeContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../ui/dialog';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { User, UserPlus, Mail, Phone, MapPin, Save, Building2, Wallet } from 'lucide-react';

interface CustomerFormModalProps {
  isOpen: boolean;
  customer?: Customer;
  onClose: () => void;
  onSave: (customer: Customer) => void;
}

interface CustomerFormData {
  name: string;
  email: string;
  phone: string;
  address?: string;
  businessName?: string;
}

export const CustomerFormModal: React.FC<CustomerFormModalProps> = ({
  isOpen,
  customer,
  onClose,
  onSave,
}) => {
  const { theme } = useTheme();
  
  const [formData, setFormData] = useState<CustomerFormData>({
    name: '',
    email: '',
    phone: '',
    address: '',
    businessName: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (customer) {
      setFormData({
        name: customer.name,
        email: customer.email,
        phone: customer.phone,
        address: '',
        businessName: '',
      });
    } else {
      setFormData({
        name: '',
        email: '',
        phone: '',
        address: '',
        businessName: '',
      });
    }
    setErrors({});
  }, [customer, isOpen]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.name.trim()) {
      newErrors.name = 'Customer name is required';
    }
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Invalid email format';
    }
    if (!formData.phone.trim()) {
      newErrors.phone = 'Phone number is required';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateForm()) {
      const newCustomer: Customer = {
        id: customer?.id || `cust-${Date.now()}`,
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        totalSpent: customer?.totalSpent || 0,
        totalOrders: customer?.totalOrders || 0,
        lastPurchase: customer?.lastPurchase,
        creditBalance: customer?.creditBalance || 0,
        creditLimit: customer?.creditLimit || 50000,
        creditStatus: customer?.creditStatus || 'clear',
        creditDueDate: customer?.creditDueDate,
      };
      onSave(newCustomer);
      onClose();
    }
  };

  const handleChange = (field: keyof CustomerFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const isEditing = !!customer;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className={`max-w-xl max-h-[90vh] overflow-y-auto p-0 ${
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
                {isEditing ? 'Update customer information' : 'Add a new customer to the system'}
              </p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
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
              className={`${
                theme === 'dark' 
                  ? 'bg-slate-800 border-slate-700 text-white placeholder:text-slate-500' 
                  : 'bg-white border-slate-200'
              } ${errors.name ? 'border-red-500' : ''}`}
            />
            {errors.name && <p className="text-xs text-red-500">{errors.name}</p>}
          </div>

          {/* Business Name */}
          <div className="space-y-2">
            <Label htmlFor="businessName" className={`flex items-center gap-2 ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
              <Building2 className="w-4 h-4" />
              Business Name
            </Label>
            <Input
              id="businessName"
              value={formData.businessName}
              onChange={(e) => handleChange('businessName', e.target.value)}
              placeholder="Enter business name (optional)"
              className={`${
                theme === 'dark' 
                  ? 'bg-slate-800 border-slate-700 text-white placeholder:text-slate-500' 
                  : 'bg-white border-slate-200'
              }`}
            />
          </div>

          {/* Email */}
          <div className="space-y-2">
            <Label htmlFor="email" className={`flex items-center gap-2 ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
              <Mail className="w-4 h-4" />
              Email <span className="text-red-500">*</span>
            </Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => handleChange('email', e.target.value)}
              placeholder="Enter email address"
              className={`${
                theme === 'dark' 
                  ? 'bg-slate-800 border-slate-700 text-white placeholder:text-slate-500' 
                  : 'bg-white border-slate-200'
              } ${errors.email ? 'border-red-500' : ''}`}
            />
            {errors.email && <p className="text-xs text-red-500">{errors.email}</p>}
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
              placeholder="Enter phone number"
              className={`${
                theme === 'dark' 
                  ? 'bg-slate-800 border-slate-700 text-white placeholder:text-slate-500' 
                  : 'bg-white border-slate-200'
              } ${errors.phone ? 'border-red-500' : ''}`}
            />
            {errors.phone && <p className="text-xs text-red-500">{errors.phone}</p>}
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
              placeholder="Enter address (optional)"
              className={`${
                theme === 'dark' 
                  ? 'bg-slate-800 border-slate-700 text-white placeholder:text-slate-500' 
                  : 'bg-white border-slate-200'
              }`}
            />
          </div>

          {/* Stats (only show when editing) */}
          {isEditing && customer && (
            <div className={`grid grid-cols-2 gap-4 p-4 rounded-xl ${
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
                <Building2 className={`w-4 h-4 ${theme === 'dark' ? 'text-emerald-400' : 'text-emerald-600'}`} />
                <div>
                  <p className={`text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>Total Orders</p>
                  <p className={`font-semibold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                    {customer.totalOrders}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className={`flex gap-3 pt-4 border-t ${theme === 'dark' ? 'border-slate-700' : 'border-slate-200'}`}>
            <button
              type="submit"
              className="flex-1 px-4 py-2.5 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-700 hover:to-emerald-600 text-white rounded-xl font-medium transition-all flex items-center justify-center gap-2"
            >
              <Save className="w-4 h-4" />
              {isEditing ? 'Update Customer' : 'Add Customer'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className={`flex-1 px-4 py-2.5 rounded-xl font-medium transition-colors border ${
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
