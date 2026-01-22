import React, { useState, useEffect, useRef } from 'react';
import type { WarrantyClaim } from '../../data/mockData';
import { mockProducts, mockCustomers, mockInvoices, generateClaimNumber } from '../../data/mockData';
import { useTheme } from '../../contexts/ThemeContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../ui/dialog';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { SearchableSelect } from '../ui/searchable-select';
import {
  Shield,
  ShieldPlus,
  User,
  Package,
  FileText,
  Phone,
  Hash,
  Calendar,
  AlertCircle,
  MessageSquare,
  Wrench,
  Save,
  RefreshCw,
  CheckCircle,
  Clock,
  XCircle,
  Search,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

interface WarrantyClaimFormModalProps {
  isOpen: boolean;
  claim?: WarrantyClaim;
  onClose: () => void;
  onSave: (claim: WarrantyClaim) => void;
}

interface ClaimFormData {
  invoiceId: string;
  productId: string;
  customerId: string;
  customerPhone: string;
  productSerialNumber: string;
  warrantyExpiryDate: string;
  status: WarrantyClaim['status'];
  issueDescription: string;
  issueCategory: WarrantyClaim['issueCategory'];
  resolution: string;
  resolutionDate: string;
  isReplacement: boolean;
  replacementProductId: string;
  replacementSerialNumber: string;
  notes: string;
  handledBy: string;
}

const statusOptions = [
  { value: 'pending', label: 'Pending', icon: Clock, color: 'text-yellow-500' },
  { value: 'under-review', label: 'Under Review', icon: Search, color: 'text-blue-500' },
  { value: 'approved', label: 'Approved', icon: CheckCircle, color: 'text-emerald-500' },
  { value: 'rejected', label: 'Rejected', icon: XCircle, color: 'text-red-500' },
  { value: 'replaced', label: 'Replaced', icon: RefreshCw, color: 'text-purple-500' },
  { value: 'repaired', label: 'Repaired', icon: Wrench, color: 'text-cyan-500' },
];

const issueCategoryOptions = [
  { value: 'defective', label: 'Defective' },
  { value: 'damaged', label: 'Damaged' },
  { value: 'not-working', label: 'Not Working' },
  { value: 'performance', label: 'Performance Issue' },
  { value: 'other', label: 'Other' },
];

export const WarrantyClaimFormModal: React.FC<WarrantyClaimFormModalProps> = ({
  isOpen,
  claim,
  onClose,
  onSave,
}) => {
  const { theme } = useTheme();

  const [formData, setFormData] = useState<ClaimFormData>({
    invoiceId: '',
    productId: '',
    customerId: '',
    customerPhone: '',
    productSerialNumber: '',
    warrantyExpiryDate: '',
    status: 'pending',
    issueDescription: '',
    issueCategory: 'defective',
    resolution: '',
    resolutionDate: '',
    isReplacement: false,
    replacementProductId: '',
    replacementSerialNumber: '',
    notes: '',
    handledBy: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [selectedInvoiceItems, setSelectedInvoiceItems] = useState<{ productId: string; productName: string; warrantyDueDate?: string }[]>([]);

  // Date picker states
  const [showWarrantyCalendar, setShowWarrantyCalendar] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState(new Date());
  const warrantyCalendarRef = useRef<HTMLDivElement>(null);

  // Close calendar when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (warrantyCalendarRef.current && !warrantyCalendarRef.current.contains(event.target as Node)) {
        setShowWarrantyCalendar(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Prepare options
  const invoiceOptions = [
    { value: '', label: 'Select Invoice' },
    ...mockInvoices.map((inv) => ({ value: inv.id, label: `${inv.id} - ${inv.customerName}` })),
  ];

  const customerOptions = [
    { value: '', label: 'Select Customer' },
    ...mockCustomers.map((c) => ({ value: c.id, label: c.name })),
  ];

  const productOptions = [
    { value: '', label: 'Select Product' },
    ...mockProducts.map((p) => ({ value: p.id, label: p.name })),
  ];

  const statusSelectOptions = [
    { value: '', label: 'Select Status' },
    ...statusOptions.map((s) => ({ value: s.value, label: s.label })),
  ];

  const categorySelectOptions = [
    { value: '', label: 'Select Category' },
    ...issueCategoryOptions.map((c) => ({ value: c.value, label: c.label })),
  ];

  // Initialize form data
  useEffect(() => {
    if (claim) {
      setFormData({
        invoiceId: claim.invoiceId,
        productId: claim.productId,
        customerId: claim.customerId,
        customerPhone: claim.customerPhone || '',
        productSerialNumber: claim.productSerialNumber || '',
        warrantyExpiryDate: claim.warrantyExpiryDate,
        status: claim.status,
        issueDescription: claim.issueDescription,
        issueCategory: claim.issueCategory,
        resolution: claim.resolution || '',
        resolutionDate: claim.resolutionDate || '',
        isReplacement: claim.isReplacement,
        replacementProductId: claim.replacementProductId || '',
        replacementSerialNumber: claim.replacementSerialNumber || '',
        notes: claim.notes || '',
        handledBy: claim.handledBy || '',
      });

      // Load invoice items
      const invoice = mockInvoices.find((inv) => inv.id === claim.invoiceId);
      if (invoice) {
        setSelectedInvoiceItems(
          invoice.items.map((item) => ({
            productId: item.productId,
            productName: item.productName,
            warrantyDueDate: item.warrantyDueDate,
          }))
        );
      }

      // Set calendar month to warranty expiry date
      if (claim.warrantyExpiryDate) {
        setCalendarMonth(new Date(claim.warrantyExpiryDate));
      }
    } else {
      setFormData({
        invoiceId: '',
        productId: '',
        customerId: '',
        customerPhone: '',
        productSerialNumber: '',
        warrantyExpiryDate: '',
        status: 'pending',
        issueDescription: '',
        issueCategory: 'defective',
        resolution: '',
        resolutionDate: '',
        isReplacement: false,
        replacementProductId: '',
        replacementSerialNumber: '',
        notes: '',
        handledBy: '',
      });
      setSelectedInvoiceItems([]);
      setCalendarMonth(new Date());
    }
    setErrors({});
    setShowWarrantyCalendar(false);
  }, [claim, isOpen]);

  // Handle invoice selection
  const handleInvoiceChange = (invoiceId: string) => {
    const invoice = mockInvoices.find((inv) => inv.id === invoiceId);
    if (invoice) {
      const customer = mockCustomers.find((c) => c.id === invoice.customerId);
      setFormData((prev) => ({
        ...prev,
        invoiceId,
        customerId: invoice.customerId,
        customerPhone: customer?.phone || '',
        productId: '',
        warrantyExpiryDate: '',
      }));
      setSelectedInvoiceItems(
        invoice.items.map((item) => ({
          productId: item.productId,
          productName: item.productName,
          warrantyDueDate: item.warrantyDueDate,
        }))
      );
    } else {
      setFormData((prev) => ({
        ...prev,
        invoiceId: '',
        customerId: '',
        customerPhone: '',
        productId: '',
        warrantyExpiryDate: '',
      }));
      setSelectedInvoiceItems([]);
    }
    if (errors.invoiceId) setErrors((prev) => ({ ...prev, invoiceId: '' }));
  };

  // Handle product selection from invoice
  const handleProductFromInvoice = (productId: string) => {
    const item = selectedInvoiceItems.find((i) => i.productId === productId);
    const product = mockProducts.find((p) => p.id === productId);
    const warrantyDate = item?.warrantyDueDate || '';
    setFormData((prev) => ({
      ...prev,
      productId,
      productSerialNumber: product?.serialNumber || '',
      warrantyExpiryDate: warrantyDate,
    }));
    if (warrantyDate) {
      setCalendarMonth(new Date(warrantyDate));
    }
    if (errors.productId) setErrors((prev) => ({ ...prev, productId: '' }));
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.invoiceId) {
      newErrors.invoiceId = 'Invoice is required';
    }
    if (!formData.productId) {
      newErrors.productId = 'Product is required';
    }
    if (!formData.customerId) {
      newErrors.customerId = 'Customer is required';
    }
    if (!formData.issueDescription.trim()) {
      newErrors.issueDescription = 'Issue description is required';
    }
    if (!formData.issueCategory) {
      newErrors.issueCategory = 'Issue category is required';
    }
    if (!formData.warrantyExpiryDate) {
      newErrors.warrantyExpiryDate = 'Warranty expiry date is required';
    }

    // Validate replacement fields if status is replaced
    if (formData.status === 'replaced') {
      if (!formData.replacementProductId) {
        newErrors.replacementProductId = 'Replacement product is required';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateForm()) {
      const product = mockProducts.find((p) => p.id === formData.productId);
      const customer = mockCustomers.find((c) => c.id === formData.customerId);
      const replacementProduct = mockProducts.find((p) => p.id === formData.replacementProductId);

      const newClaim: WarrantyClaim = {
        id: claim?.id || generateClaimNumber(),
        invoiceId: formData.invoiceId,
        productId: formData.productId,
        productName: product?.name || '',
        productSerialNumber: formData.productSerialNumber || undefined,
        customerId: formData.customerId,
        customerName: customer?.name || '',
        customerPhone: formData.customerPhone || undefined,
        claimDate: claim?.claimDate || new Date().toISOString(),
        warrantyExpiryDate: formData.warrantyExpiryDate,
        status: formData.status,
        issueDescription: formData.issueDescription,
        issueCategory: formData.issueCategory,
        resolution: formData.resolution || undefined,
        resolutionDate: formData.resolutionDate || undefined,
        isReplacement: formData.isReplacement || formData.status === 'replaced',
        replacementProductId: formData.replacementProductId || undefined,
        replacementProductName: replacementProduct?.name || undefined,
        replacementSerialNumber: formData.replacementSerialNumber || undefined,
        replacementDate: formData.status === 'replaced' ? new Date().toISOString() : undefined,
        notes: formData.notes || undefined,
        handledBy: formData.handledBy || undefined,
      };

      onSave(newClaim);
      onClose();
    }
  };

  const handleChange = (field: keyof ClaimFormData, value: string | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: '' }));
    }
  };

  const isEditing = !!claim;

  // Get invoice items as options
  const invoiceProductOptions = [
    { value: '', label: 'Select Product from Invoice' },
    ...selectedInvoiceItems.map((item) => ({
      value: item.productId,
      label: item.productName,
    })),
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

  const renderCalendar = (
    selectedDate: string,
    setSelectedDate: (date: string) => void,
    setShowCalendar: (show: boolean) => void
  ) => {
    const { daysInMonth, startingDay } = getDaysInMonth(calendarMonth);
    const days = [];
    const selectedDateObj = selectedDate ? new Date(selectedDate) : null;

    for (let i = 0; i < startingDay; i++) {
      days.push(<div key={`empty-${i}`} className="w-8 h-8" />);
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const currentDate = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth(), day);
      const isSelected =
        selectedDateObj &&
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
            setSelectedDate(dateStr);
            setShowCalendar(false);
          }}
          className={`w-8 h-8 rounded-lg text-sm font-medium transition-all ${
            isSelected
              ? 'bg-emerald-500 text-white'
              : isToday
              ? theme === 'dark'
                ? 'bg-emerald-500/20 text-emerald-400'
                : 'bg-emerald-100 text-emerald-600'
              : theme === 'dark'
              ? 'hover:bg-slate-700 text-slate-300'
              : 'hover:bg-slate-100 text-slate-700'
          }`}
        >
          {day}
        </button>
      );
    }

    return (
      <div
        className={`absolute top-full mt-2 p-3 rounded-xl border shadow-xl z-50 min-w-[280px] left-0 ${
          theme === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'
        }`}
      >
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
          {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((dayName) => (
            <div
              key={dayName}
              className={`w-8 h-8 flex items-center justify-center text-xs font-medium ${
                theme === 'dark' ? 'text-slate-500' : 'text-slate-400'
              }`}
            >
              {dayName}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1">{days}</div>

        <button
          type="button"
          onClick={() => {
            setSelectedDate('');
            setShowCalendar(false);
          }}
          className={`w-full mt-3 py-2 text-sm font-medium rounded-lg transition-colors ${
            theme === 'dark'
              ? 'bg-slate-700 hover:bg-slate-600 text-slate-300'
              : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
          }`}
        >
          Clear
        </button>
      </div>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent
        className={`max-w-3xl max-h-[90vh] overflow-y-auto p-0 ${
          theme === 'dark' ? 'bg-slate-900 border-slate-700/50' : 'bg-white border-slate-200'
        }`}
      >
        <DialogHeader className="sr-only">
          <DialogTitle>{isEditing ? 'Edit Warranty Claim' : 'New Warranty Claim'}</DialogTitle>
          <DialogDescription>
            {isEditing ? 'Update warranty claim details' : 'File a new warranty claim'}
          </DialogDescription>
        </DialogHeader>

        {/* Gradient Header */}
        <div
          className={`p-6 text-white ${
            isEditing
              ? 'bg-gradient-to-r from-amber-600 via-amber-500 to-orange-500'
              : 'bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500'
          }`}
          aria-hidden="true"
        >
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-white/20 backdrop-blur rounded-xl flex items-center justify-center">
              {isEditing ? <Shield className="w-7 h-7" /> : <ShieldPlus className="w-7 h-7" />}
            </div>
            <div>
              <h2 className="text-2xl font-bold">{isEditing ? 'Edit Warranty Claim' : 'New Warranty Claim'}</h2>
              <p className={`text-sm ${isEditing ? 'text-amber-100' : 'text-emerald-100'}`}>
                {isEditing ? 'Update claim details and resolution' : 'File a new warranty claim for a product'}
              </p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Invoice & Product Section */}
          <div
            className={`p-4 rounded-xl border ${
              theme === 'dark' ? 'bg-slate-800/50 border-slate-700/50' : 'bg-slate-50 border-slate-200'
            }`}
          >
            <h3
              className={`text-sm font-semibold mb-4 flex items-center gap-2 ${
                theme === 'dark' ? 'text-white' : 'text-slate-900'
              }`}
            >
              <FileText className="w-4 h-4 text-emerald-500" />
              Invoice & Product Details
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Invoice Selection */}
              <div className="space-y-2">
                <Label
                  htmlFor="invoiceId"
                  className={`flex items-center gap-2 ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}
                >
                  <FileText className="w-4 h-4" />
                  Invoice <span className="text-red-500">*</span>
                </Label>
                <SearchableSelect
                  options={invoiceOptions}
                  value={formData.invoiceId}
                  onValueChange={handleInvoiceChange}
                  placeholder="Select Invoice"
                  searchPlaceholder="Search invoices..."
                  emptyMessage="No invoices found"
                  theme={theme}
                />
                {errors.invoiceId && <p className="text-xs text-red-500">{errors.invoiceId}</p>}
              </div>

              {/* Product from Invoice */}
              <div className="space-y-2">
                <Label
                  htmlFor="productId"
                  className={`flex items-center gap-2 ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}
                >
                  <Package className="w-4 h-4" />
                  Product <span className="text-red-500">*</span>
                </Label>
                <SearchableSelect
                  options={invoiceProductOptions}
                  value={formData.productId}
                  onValueChange={handleProductFromInvoice}
                  placeholder="Select Product"
                  searchPlaceholder="Search products..."
                  emptyMessage="No products in invoice"
                  theme={theme}
                  disabled={!formData.invoiceId}
                />
                {errors.productId && <p className="text-xs text-red-500">{errors.productId}</p>}
              </div>

              {/* Serial Number */}
              <div className="space-y-2">
                <Label
                  htmlFor="productSerialNumber"
                  className={`flex items-center gap-2 ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}
                >
                  <Hash className="w-4 h-4" />
                  Serial Number
                </Label>
                <Input
                  id="productSerialNumber"
                  value={formData.productSerialNumber}
                  onChange={(e) => handleChange('productSerialNumber', e.target.value)}
                  placeholder="Product serial number"
                  className={`${
                    theme === 'dark'
                      ? 'bg-slate-800 border-slate-700 text-white placeholder:text-slate-500'
                      : 'bg-white border-slate-200'
                  }`}
                />
              </div>

              {/* Warranty Expiry - Custom Date Picker */}
              <div className="space-y-2">
                <Label
                  htmlFor="warrantyExpiryDate"
                  className={`flex items-center gap-2 ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}
                >
                  <Calendar className="w-4 h-4" />
                  Warranty Expiry <span className="text-red-500">*</span>
                </Label>
                <div className="relative" ref={warrantyCalendarRef}>
                  <button
                    type="button"
                    onClick={() => {
                      setShowWarrantyCalendar(!showWarrantyCalendar);
                      if (formData.warrantyExpiryDate) {
                        setCalendarMonth(new Date(formData.warrantyExpiryDate));
                      } else {
                        setCalendarMonth(new Date());
                      }
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-xl border text-left ${
                      theme === 'dark'
                        ? 'bg-slate-800 border-slate-700 text-white hover:bg-slate-700/50'
                        : 'bg-white border-slate-200 text-slate-900 hover:bg-slate-50'
                    } ${errors.warrantyExpiryDate ? 'border-red-500' : ''}`}
                  >
                    <span className={formData.warrantyExpiryDate ? '' : theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}>
                      {formData.warrantyExpiryDate ? formatDateDisplay(formData.warrantyExpiryDate) : 'Select date'}
                    </span>
                    <Calendar className={`w-4 h-4 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`} />
                  </button>
                  {showWarrantyCalendar &&
                    renderCalendar(
                      formData.warrantyExpiryDate,
                      (date) => handleChange('warrantyExpiryDate', date),
                      setShowWarrantyCalendar
                    )}
                </div>
                {errors.warrantyExpiryDate && <p className="text-xs text-red-500">{errors.warrantyExpiryDate}</p>}
              </div>
            </div>
          </div>

          {/* Customer Info Section */}
          <div
            className={`p-4 rounded-xl border ${
              theme === 'dark' ? 'bg-slate-800/50 border-slate-700/50' : 'bg-slate-50 border-slate-200'
            }`}
          >
            <h3
              className={`text-sm font-semibold mb-4 flex items-center gap-2 ${
                theme === 'dark' ? 'text-white' : 'text-slate-900'
              }`}
            >
              <User className="w-4 h-4 text-blue-500" />
              Customer Information
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Customer */}
              <div className="space-y-2">
                <Label
                  htmlFor="customerId"
                  className={`flex items-center gap-2 ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}
                >
                  <User className="w-4 h-4" />
                  Customer <span className="text-red-500">*</span>
                </Label>
                <SearchableSelect
                  options={customerOptions}
                  value={formData.customerId}
                  onValueChange={(value) => {
                    handleChange('customerId', value);
                    const customer = mockCustomers.find((c) => c.id === value);
                    if (customer) {
                      handleChange('customerPhone', customer.phone);
                    }
                  }}
                  placeholder="Select Customer"
                  searchPlaceholder="Search customers..."
                  emptyMessage="No customers found"
                  theme={theme}
                  disabled={!!formData.invoiceId}
                />
                {errors.customerId && <p className="text-xs text-red-500">{errors.customerId}</p>}
              </div>

              {/* Phone */}
              <div className="space-y-2">
                <Label
                  htmlFor="customerPhone"
                  className={`flex items-center gap-2 ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}
                >
                  <Phone className="w-4 h-4" />
                  Phone Number
                </Label>
                <Input
                  id="customerPhone"
                  value={formData.customerPhone}
                  onChange={(e) => handleChange('customerPhone', e.target.value)}
                  placeholder="Customer phone number"
                  className={`${
                    theme === 'dark'
                      ? 'bg-slate-800 border-slate-700 text-white placeholder:text-slate-500'
                      : 'bg-white border-slate-200'
                  }`}
                />
              </div>
            </div>
          </div>

          {/* Issue Details Section */}
          <div
            className={`p-4 rounded-xl border ${
              theme === 'dark' ? 'bg-slate-800/50 border-slate-700/50' : 'bg-slate-50 border-slate-200'
            }`}
          >
            <h3
              className={`text-sm font-semibold mb-4 flex items-center gap-2 ${
                theme === 'dark' ? 'text-white' : 'text-slate-900'
              }`}
            >
              <AlertCircle className="w-4 h-4 text-red-500" />
              Issue Details
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Issue Category */}
              <div className="space-y-2">
                <Label
                  htmlFor="issueCategory"
                  className={`flex items-center gap-2 ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}
                >
                  <AlertCircle className="w-4 h-4" />
                  Issue Category <span className="text-red-500">*</span>
                </Label>
                <SearchableSelect
                  options={categorySelectOptions}
                  value={formData.issueCategory}
                  onValueChange={(value) => handleChange('issueCategory', value as WarrantyClaim['issueCategory'])}
                  placeholder="Select Category"
                  searchPlaceholder="Search..."
                  emptyMessage="No category"
                  theme={theme}
                />
                {errors.issueCategory && <p className="text-xs text-red-500">{errors.issueCategory}</p>}
              </div>

              {/* Status */}
              <div className="space-y-2">
                <Label
                  htmlFor="status"
                  className={`flex items-center gap-2 ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}
                >
                  <Clock className="w-4 h-4" />
                  Status
                </Label>
                <SearchableSelect
                  options={statusSelectOptions}
                  value={formData.status}
                  onValueChange={(value) => handleChange('status', value as WarrantyClaim['status'])}
                  placeholder="Select Status"
                  searchPlaceholder="Search..."
                  emptyMessage="No status"
                  theme={theme}
                />
              </div>

              {/* Issue Description */}
              <div className="space-y-2 md:col-span-2">
                <Label
                  htmlFor="issueDescription"
                  className={`flex items-center gap-2 ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}
                >
                  <MessageSquare className="w-4 h-4" />
                  Issue Description <span className="text-red-500">*</span>
                </Label>
                <textarea
                  id="issueDescription"
                  value={formData.issueDescription}
                  onChange={(e) => handleChange('issueDescription', e.target.value)}
                  placeholder="Describe the issue in detail..."
                  rows={3}
                  className={`w-full px-3 py-2 rounded-xl border resize-none ${
                    theme === 'dark'
                      ? 'bg-slate-800 border-slate-700 text-white placeholder:text-slate-500'
                      : 'bg-white border-slate-200 text-slate-900 placeholder:text-slate-400'
                  } ${errors.issueDescription ? 'border-red-500' : ''}`}
                />
                {errors.issueDescription && <p className="text-xs text-red-500">{errors.issueDescription}</p>}
              </div>
            </div>
          </div>

          {/* Resolution Section */}
          <div
            className={`p-4 rounded-xl border ${
              theme === 'dark' ? 'bg-slate-800/50 border-slate-700/50' : 'bg-slate-50 border-slate-200'
            }`}
          >
            <h3
              className={`text-sm font-semibold mb-4 flex items-center gap-2 ${
                theme === 'dark' ? 'text-white' : 'text-slate-900'
              }`}
            >
              <Wrench className="w-4 h-4 text-purple-500" />
              Resolution & Replacement
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Resolution */}
              <div className="space-y-2 md:col-span-2">
                <Label
                  htmlFor="resolution"
                  className={`flex items-center gap-2 ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}
                >
                  <CheckCircle className="w-4 h-4" />
                  Resolution
                </Label>
                <textarea
                  id="resolution"
                  value={formData.resolution}
                  onChange={(e) => handleChange('resolution', e.target.value)}
                  placeholder="Describe how the issue was resolved..."
                  rows={2}
                  className={`w-full px-3 py-2 rounded-xl border resize-none ${
                    theme === 'dark'
                      ? 'bg-slate-800 border-slate-700 text-white placeholder:text-slate-500'
                      : 'bg-white border-slate-200 text-slate-900 placeholder:text-slate-400'
                  }`}
                />
              </div>

              {/* Is Replacement Checkbox */}
              <div className="md:col-span-2">
                <label className="flex items-center gap-3 cursor-pointer">
                  <div
                    className={`relative w-11 h-6 rounded-full transition-colors ${
                      formData.isReplacement || formData.status === 'replaced'
                        ? 'bg-purple-500'
                        : theme === 'dark'
                        ? 'bg-slate-700'
                        : 'bg-slate-200'
                    }`}
                    onClick={() => handleChange('isReplacement', !formData.isReplacement)}
                  >
                    <div
                      className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${
                        formData.isReplacement || formData.status === 'replaced' ? 'translate-x-5' : ''
                      }`}
                    />
                  </div>
                  <span className={`text-sm font-medium ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                    <RefreshCw className="w-4 h-4 inline mr-2" />
                    Product Replacement Provided
                  </span>
                </label>
              </div>

              {/* Replacement Product (shown when isReplacement is true) */}
              {(formData.isReplacement || formData.status === 'replaced') && (
                <>
                  <div className="space-y-2">
                    <Label
                      htmlFor="replacementProductId"
                      className={`flex items-center gap-2 ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}
                    >
                      <Package className="w-4 h-4" />
                      Replacement Product <span className="text-red-500">*</span>
                    </Label>
                    <SearchableSelect
                      options={productOptions}
                      value={formData.replacementProductId}
                      onValueChange={(value) => handleChange('replacementProductId', value)}
                      placeholder="Select Replacement"
                      searchPlaceholder="Search products..."
                      emptyMessage="No products found"
                      theme={theme}
                    />
                    {errors.replacementProductId && (
                      <p className="text-xs text-red-500">{errors.replacementProductId}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label
                      htmlFor="replacementSerialNumber"
                      className={`flex items-center gap-2 ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}
                    >
                      <Hash className="w-4 h-4" />
                      Replacement Serial Number
                    </Label>
                    <Input
                      id="replacementSerialNumber"
                      value={formData.replacementSerialNumber}
                      onChange={(e) => handleChange('replacementSerialNumber', e.target.value)}
                      placeholder="New product serial number"
                      className={`${
                        theme === 'dark'
                          ? 'bg-slate-800 border-slate-700 text-white placeholder:text-slate-500'
                          : 'bg-white border-slate-200'
                      }`}
                    />
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Additional Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Handled By */}
            <div className="space-y-2">
              <Label
                htmlFor="handledBy"
                className={`flex items-center gap-2 ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}
              >
                <User className="w-4 h-4" />
                Handled By
              </Label>
              <Input
                id="handledBy"
                value={formData.handledBy}
                onChange={(e) => handleChange('handledBy', e.target.value)}
                placeholder="Staff member name"
                className={`${
                  theme === 'dark'
                    ? 'bg-slate-800 border-slate-700 text-white placeholder:text-slate-500'
                    : 'bg-white border-slate-200'
                }`}
              />
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label
                htmlFor="notes"
                className={`flex items-center gap-2 ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}
              >
                <MessageSquare className="w-4 h-4" />
                Notes
              </Label>
              <Input
                id="notes"
                value={formData.notes}
                onChange={(e) => handleChange('notes', e.target.value)}
                placeholder="Additional notes..."
                className={`${
                  theme === 'dark'
                    ? 'bg-slate-800 border-slate-700 text-white placeholder:text-slate-500'
                    : 'bg-white border-slate-200'
                }`}
              />
            </div>
          </div>

          {/* Submit Buttons */}
          <div className={`flex gap-3 pt-4 border-t ${theme === 'dark' ? 'border-slate-700/50' : 'border-slate-200'}`}>
            <button
              type="submit"
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-medium text-white transition-all ${
                isEditing
                  ? 'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600'
                  : 'bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600'
              }`}
            >
              <Save className="w-5 h-5" />
              {isEditing ? 'Update Claim' : 'Create Claim'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className={`px-6 py-3 rounded-xl font-medium transition-colors border ${
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
