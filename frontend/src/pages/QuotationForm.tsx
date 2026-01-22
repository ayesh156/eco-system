import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { useTheme } from '../contexts/ThemeContext';
import { mockCustomers, mockProducts, mockQuotations } from '../data/mockData';
import type { Customer, Product } from '../data/mockData';
import { PrintableQuotation } from '../components/PrintableQuotation';
import {
  ArrowLeft, Save, Printer, User, Phone, Mail, MapPin,
  Package, FileText, Calendar, UserPlus, Search, X,
  ChevronLeft, ChevronRight, AlertCircle, Plus, Trash2, Percent,
  Download, Eye, Calculator, Clock
} from 'lucide-react';

// Quotation Status Type
type QuotationStatus = 'draft' | 'sent' | 'accepted' | 'rejected' | 'expired';

// Quotation Item Interface
interface QuotationItem {
  id: string;
  productId: string;
  productName: string;
  description: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  total: number;
}

// Form Data Interface
interface FormData {
  // Customer Info
  customerId: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  customerAddress: string;
  isNewCustomer: boolean;
  // Quotation Details
  quotationDate: string;
  expiryDate: string;
  validityDays: number;
  // Items
  items: QuotationItem[];
  // Financial
  subtotal: number;
  discountPercent: number;
  discountAmount: number;
  taxPercent: number;
  taxAmount: number;
  total: number;
  // Additional Info
  notes: string;
  terms: string;
  internalNotes: string;
}

// Helper Functions
const getDefaultDate = () => {
  const now = new Date();
  return now.toISOString().split('T')[0];
};

const getDefaultExpiryDate = (days: number = 30) => {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().split('T')[0];
};

const generateQuotationNumber = () => {
  const year = new Date().getFullYear();
  const random = Math.floor(Math.random() * 9000) + 1000;
  return `QUO-${year}-${random}`;
};

// Initial Form Data
const initialFormData: FormData = {
  customerId: '',
  customerName: '',
  customerPhone: '',
  customerEmail: '',
  customerAddress: '',
  isNewCustomer: false,
  quotationDate: getDefaultDate(),
  expiryDate: getDefaultExpiryDate(30),
  validityDays: 30,
  items: [],
  subtotal: 0,
  discountPercent: 0,
  discountAmount: 0,
  taxPercent: 0,
  taxAmount: 0,
  total: 0,
  notes: '',
  terms: 'This quotation is valid for 30 days from the date of issue.\nPrices are subject to change without prior notice.\nPayment terms: 50% advance, 50% on delivery.',
  internalNotes: '',
};

// Default Terms Template
const defaultTermsTemplates = [
  {
    name: 'Standard (30 Days)',
    terms: 'This quotation is valid for 30 days from the date of issue.\nPrices are subject to change without prior notice.\nPayment terms: 50% advance, 50% on delivery.',
  },
  {
    name: 'Quick Sale (7 Days)',
    terms: 'This quotation is valid for 7 days only.\nPrices are fixed for this period.\nFull payment required upon acceptance.',
  },
  {
    name: 'Corporate',
    terms: 'This quotation is valid for 45 days from the date of issue.\nBulk pricing applied.\nPayment terms: Net 30 days after delivery.',
  },
];

export const QuotationForm: React.FC = () => {
  const { theme } = useTheme();
  const navigate = useNavigate();
  const { id } = useParams();
  const location = useLocation();
  const isEditing = !!id;
  const isDuplicating = !!(location.state as any)?.duplicateFrom;
  const isViewMode = !!(location.state as any)?.viewMode;

  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [quotationNumber] = useState(generateQuotationNumber());
  const [isLoadingQuotation, setIsLoadingQuotation] = useState(false);
  
  // Customer Search
  const [customerSearch, setCustomerSearch] = useState('');
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  
  // Product Search
  const [productSearch, setProductSearch] = useState('');
  const [showProductDropdown, setShowProductDropdown] = useState(false);
  
  // Calendar States
  const [showQuotationDateCalendar, setShowQuotationDateCalendar] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState(new Date());
  
  // Pagination State for Items
  const [itemsCurrentPage, setItemsCurrentPage] = useState(1);
  const itemsPerPage = 3;
  
  // Refs
  const customerDropdownRef = useRef<HTMLDivElement>(null);
  const productDropdownRef = useRef<HTMLDivElement>(null);
  const quotationDateCalendarRef = useRef<HTMLDivElement>(null);
  const printRef = useRef<HTMLDivElement>(null);
  
  // Preview State
  const [showPreview, setShowPreview] = useState(false);

  // Filter customers for search
  const filteredCustomers = useMemo(() => {
    if (!customerSearch) return [];
    const search = customerSearch.toLowerCase();
    return mockCustomers.filter(c =>
      c.name.toLowerCase().includes(search) ||
      c.phone.includes(search) ||
      c.email?.toLowerCase().includes(search)
    ).slice(0, 5);
  }, [customerSearch]);

  // Filter products for search
  const filteredProducts = useMemo(() => {
    if (!productSearch) return [];
    const search = productSearch.toLowerCase();
    return mockProducts.filter(p =>
      p.name.toLowerCase().includes(search) ||
      p.serialNumber?.toLowerCase().includes(search)
    ).slice(0, 8);
  }, [productSearch]);

  // Load quotation data when editing or duplicating (MUST RUN FIRST)
  useEffect(() => {
    // Handle duplicate mode - using mockQuotations as quotation data source
    if (isDuplicating) {
      const duplicateQuotation = (location.state as any)?.duplicateFrom;
      if (duplicateQuotation) {
        setIsLoadingQuotation(true);
        setFormData({
          customerId: duplicateQuotation.customerId || '',
          customerName: duplicateQuotation.customerName,
          customerPhone: duplicateQuotation.customerPhone,
          customerEmail: duplicateQuotation.customerEmail || '',
          customerAddress: duplicateQuotation.customerAddress || '',
          isNewCustomer: false,
          quotationDate: new Date().toISOString().split('T')[0], // New date for duplicate
          expiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          validityDays: 30,
          items: duplicateQuotation.items.map((item: any, idx: number) => ({
            ...item,
            id: `dup-item-${idx}-${Date.now()}`, // Generate new IDs
          })),
          subtotal: duplicateQuotation.subtotal,
          discountPercent: duplicateQuotation.discountPercent,
          discountAmount: duplicateQuotation.discountAmount,
          taxPercent: duplicateQuotation.taxPercent,
          taxAmount: duplicateQuotation.taxAmount,
          total: duplicateQuotation.total,
          notes: duplicateQuotation.notes || '',
          terms: duplicateQuotation.terms || '',
          internalNotes: '', // Clear internal notes for duplicate
        });
        setCustomerSearch(duplicateQuotation.customerName);
        setTimeout(() => setIsLoadingQuotation(false), 100);
      }
      return;
    }

    // Handle edit/view mode - using mockQuotations as quotation data source
    if (isEditing && id) {
      setIsLoadingQuotation(true);
      const quotation = mockQuotations.find(q => q.id === id);
      if (quotation) {
        setFormData({
          customerId: quotation.customerId || '',
          customerName: quotation.customerName,
          customerPhone: quotation.customerPhone,
          customerEmail: quotation.customerEmail || '',
          customerAddress: quotation.customerAddress || '',
          isNewCustomer: false,
          quotationDate: quotation.quotationDate,
          expiryDate: quotation.expiryDate,
          validityDays: quotation.validityDays,
          items: quotation.items.map(item => ({
            id: item.id,
            productId: item.productId || '',
            productName: item.productName,
            description: item.description,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            discount: item.discount,
            total: item.total,
          })),
          subtotal: quotation.subtotal,
          discountPercent: quotation.discountPercent,
          discountAmount: quotation.discountAmount,
          taxPercent: quotation.taxPercent,
          taxAmount: quotation.taxAmount,
          total: quotation.total,
          notes: quotation.notes || '',
          terms: quotation.terms || '',
          internalNotes: quotation.internalNotes || '',
        });
        // Set customer search to show selected customer
        setCustomerSearch(quotation.customerName);
        
        // If view mode, show preview automatically
        if (isViewMode) {
          setTimeout(() => setShowPreview(true), 200);
        }
      }
      // Allow a brief moment for state to settle before enabling calculations
      setTimeout(() => setIsLoadingQuotation(false), 100);
    }
  }, [id, isEditing, isDuplicating, isViewMode, location.state]);

  // Calculate totals whenever items or discounts change (skip during initial load)
  useEffect(() => {
    // Don't recalculate while loading quotation data
    if (isLoadingQuotation) return;
    
    const subtotal = formData.items.reduce((sum, item) => sum + item.total, 0);
    const discountAmount = (subtotal * formData.discountPercent) / 100;
    const afterDiscount = subtotal - discountAmount;
    const taxAmount = (afterDiscount * formData.taxPercent) / 100;
    const total = afterDiscount + taxAmount;

    setFormData(prev => ({
      ...prev,
      subtotal,
      discountAmount,
      taxAmount,
      total,
    }));
  }, [formData.items, formData.discountPercent, formData.taxPercent, isLoadingQuotation]);

  // Update expiry date when validity days change (skip during initial load)
  useEffect(() => {
    // Don't recalculate while loading quotation data
    if (isLoadingQuotation) return;
    
    const quotationDate = new Date(formData.quotationDate);
    quotationDate.setDate(quotationDate.getDate() + formData.validityDays);
    setFormData(prev => ({
      ...prev,
      expiryDate: quotationDate.toISOString().split('T')[0],
    }));
  }, [formData.validityDays, formData.quotationDate, isLoadingQuotation]);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (customerDropdownRef.current && !customerDropdownRef.current.contains(event.target as Node)) {
        setShowCustomerDropdown(false);
      }
      if (productDropdownRef.current && !productDropdownRef.current.contains(event.target as Node)) {
        setShowProductDropdown(false);
      }
      if (quotationDateCalendarRef.current && !quotationDateCalendarRef.current.contains(event.target as Node)) {
        setShowQuotationDateCalendar(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Customer handlers
  const handleCustomerSelect = (customer: Customer) => {
    setFormData(prev => ({
      ...prev,
      customerId: customer.id,
      customerName: customer.name,
      customerPhone: customer.phone,
      customerEmail: customer.email || '',
      customerAddress: customer.address || '',
      isNewCustomer: false,
    }));
    setCustomerSearch('');
    setShowCustomerDropdown(false);
    if (errors.customerName) setErrors(prev => ({ ...prev, customerName: '' }));
  };

  const handleNewCustomer = () => {
    setFormData(prev => ({
      ...prev,
      customerId: '',
      customerName: customerSearch,
      customerPhone: '',
      customerEmail: '',
      customerAddress: '',
      isNewCustomer: true,
    }));
    setShowCustomerDropdown(false);
  };

  const clearCustomer = () => {
    setFormData(prev => ({
      ...prev,
      customerId: '',
      customerName: '',
      customerPhone: '',
      customerEmail: '',
      customerAddress: '',
      isNewCustomer: false,
    }));
  };

  // Product/Item handlers
  const handleAddProduct = (product: Product) => {
    const existingItem = formData.items.find(item => item.productId === product.id);
    
    if (existingItem) {
      // Increase quantity if already exists
      setFormData(prev => ({
        ...prev,
        items: prev.items.map(item =>
          item.productId === product.id
            ? { ...item, quantity: item.quantity + 1, total: (item.quantity + 1) * item.unitPrice * (1 - item.discount / 100) }
            : item
        ),
      }));
    } else {
      // Add new item
      const newItem: QuotationItem = {
        id: Date.now().toString(),
        productId: product.id,
        productName: product.name,
        description: '',
        quantity: 1,
        unitPrice: product.price,
        discount: 0,
        total: product.price,
      };
      setFormData(prev => ({
        ...prev,
        items: [...prev.items, newItem],
      }));
    }
    
    setProductSearch('');
    setShowProductDropdown(false);
  };

  const handleAddCustomItem = () => {
    const newItem: QuotationItem = {
      id: Date.now().toString(),
      productId: '',
      productName: '',
      description: '',
      quantity: 1,
      unitPrice: 0,
      discount: 0,
      total: 0,
    };
    setFormData(prev => ({
      ...prev,
      items: [...prev.items, newItem],
    }));
  };

  const handleUpdateItem = (itemId: string, field: keyof QuotationItem, value: string | number) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.map(item => {
        if (item.id !== itemId) return item;
        
        const updatedItem = { ...item, [field]: value };
        
        // Recalculate total if quantity, price, or discount changes
        if (field === 'quantity' || field === 'unitPrice' || field === 'discount') {
          updatedItem.total = updatedItem.quantity * updatedItem.unitPrice * (1 - updatedItem.discount / 100);
        }
        
        return updatedItem;
      }),
    }));
  };

  const handleRemoveItem = (itemId: string) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.filter(item => item.id !== itemId),
    }));
  };

  // Form handlers
  const handleInputChange = (field: keyof FormData, value: string | number | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: '' }));
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.customerName.trim()) newErrors.customerName = 'Customer name is required';
    if (!formData.customerPhone.trim()) newErrors.customerPhone = 'Phone number is required';
    if (formData.items.length === 0) newErrors.items = 'At least one item is required';

    // Validate items
    formData.items.forEach((item, index) => {
      if (!item.productName.trim()) {
        newErrors[`item_${index}_name`] = 'Product name is required';
      }
      if (item.unitPrice <= 0) {
        newErrors[`item_${index}_price`] = 'Price must be greater than 0';
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (status: QuotationStatus = 'draft') => {
    if (!validateForm()) return;

    const quotation = {
      id: isEditing ? id : Date.now().toString(),
      quotationNumber: isEditing ? `QUO-${id}` : quotationNumber,
      customerId: formData.customerId || undefined,
      customerName: formData.customerName,
      customerPhone: formData.customerPhone,
      customerEmail: formData.customerEmail || undefined,
      customerAddress: formData.customerAddress || undefined,
      date: formData.quotationDate,
      expiryDate: formData.expiryDate,
      items: formData.items,
      subtotal: formData.subtotal,
      discount: formData.discountAmount,
      tax: formData.taxAmount,
      total: formData.total,
      status,
      notes: formData.notes || undefined,
      terms: formData.terms || undefined,
      internalNotes: formData.internalNotes || undefined,
      createdAt: new Date().toISOString(),
    };

    console.log('Saving Quotation:', quotation);
    navigate('/quotations');
  };

  // Get quotation data for print/preview
  const getQuotationData = () => ({
    quotationNumber: isEditing ? `QUO-${id}` : quotationNumber,
    customerName: formData.customerName,
    customerPhone: formData.customerPhone,
    customerEmail: formData.customerEmail || undefined,
    customerAddress: formData.customerAddress || undefined,
    quotationDate: formData.quotationDate,
    expiryDate: formData.expiryDate,
    items: formData.items,
    subtotal: formData.subtotal,
    discountPercent: formData.discountPercent,
    discountAmount: formData.discountAmount,
    taxPercent: formData.taxPercent,
    taxAmount: formData.taxAmount,
    total: formData.total,
    notes: formData.notes || undefined,
    terms: formData.terms || undefined,
  });

  // Print handler
  const handlePrint = () => {
    setTimeout(() => {
      if (printRef.current) {
        const printWindow = window.open('', '_blank');
        if (printWindow) {
          printWindow.document.write('<html><head><title>Quotation - ' + (isEditing ? `QUO-${id}` : quotationNumber) + '</title></head><body>');
          printWindow.document.write(printRef.current.innerHTML);
          printWindow.document.write('</body></html>');
          printWindow.document.close();
          setTimeout(() => {
            printWindow.print();
            printWindow.close();
          }, 250);
        }
      }
    }, 100);
  };

  // Download PDF handler
  const handleDownloadPDF = () => {
    setTimeout(() => {
      if (printRef.current) {
        const printWindow = window.open('', '_blank');
        if (printWindow) {
          printWindow.document.write('<html><head><title>Quotation - ' + (isEditing ? `QUO-${id}` : quotationNumber) + '</title>');
          printWindow.document.write('<style>@media print { @page { size: A4 portrait; margin: 0; } }</style>');
          printWindow.document.write('</head><body>');
          printWindow.document.write(printRef.current.innerHTML);
          printWindow.document.write('</body></html>');
          printWindow.document.close();
          setTimeout(() => {
            printWindow.print();
          }, 250);
        }
      }
    }, 100);
  };

  // Formatting helpers
  const formatCurrency = (amount: number) => `Rs. ${amount.toLocaleString('en-LK', { minimumFractionDigits: 2 })}`;

  const formatDateDisplay = (dateStr: string) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  // Calendar helper
  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    return { daysInMonth: lastDay.getDate(), startingDay: firstDay.getDay() };
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
            setSelectedDate(dateStr);
            setShowCalendar(false);
          }}
          className={`w-8 h-8 rounded-lg text-sm font-medium transition-all ${isSelected
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
      <div className={`absolute top-full left-0 mt-2 p-3 rounded-xl border shadow-2xl z-[100] min-w-[280px] ${
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
      </div>
    );
  };

  // Input style classes
  const inputClasses = `w-full px-4 py-2.5 rounded-xl border transition-all ${
    theme === 'dark'
      ? 'bg-slate-800/50 border-slate-700/50 text-white placeholder-slate-500 focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/20'
      : 'bg-white border-slate-200 text-slate-900 placeholder-slate-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20'
  }`;

  const labelClasses = `block text-sm font-medium mb-1.5 ${
    theme === 'dark' ? 'text-slate-300' : 'text-slate-700'
  }`;

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/quotations')}
            className={`p-2 rounded-xl border transition-all ${
              theme === 'dark'
                ? 'bg-slate-800/50 border-slate-700/50 hover:bg-slate-700/50 text-slate-400'
                : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-600'
            }`}
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className={`text-2xl lg:text-3xl font-bold ${
              theme === 'dark' ? 'text-white' : 'text-slate-900'
            }`}>
              {isEditing ? 'Edit Quotation' : 'Create New Quotation'}
            </h1>
            <p className={`mt-1 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
              {isEditing ? `Editing quotation ${id}` : `Quotation #${quotationNumber}`}
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <button
            onClick={() => handleSubmit('draft')}
            className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-xl font-medium shadow-lg hover:shadow-emerald-500/25 transition-all"
            aria-label={isEditing ? 'Update quotation' : 'Save quotation'}
          >
            <Save className="w-5 h-5" />
            {isEditing ? 'Update' : 'Save'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Left Column - Main Form */}
        <div className="xl:col-span-2 space-y-6">
          {/* Customer Section */}
          <div className={`relative rounded-2xl border p-6 ${
            theme === 'dark'
              ? 'bg-gradient-to-br from-slate-800/50 to-slate-900/50 border-slate-700/50'
              : 'bg-white border-slate-200 shadow-sm'
          }`}>
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-emerald-500/10 to-teal-500/5 rounded-full blur-3xl pointer-events-none" />
            <div className="relative">
              <div className="flex items-center gap-3 mb-6">
                <div className={`p-2.5 rounded-xl ${
                  theme === 'dark' ? 'bg-emerald-500/10' : 'bg-emerald-50'
                }`}>
                  <User className="w-5 h-5 text-emerald-500" />
                </div>
                <h2 className={`text-lg font-semibold ${
                  theme === 'dark' ? 'text-white' : 'text-slate-900'
                }`}>
                  Customer Information
                </h2>
              </div>

              {/* Customer Search */}
              {!formData.customerName ? (
                <div ref={customerDropdownRef} className="relative">
                  <div className="relative">
                    <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 ${
                      theme === 'dark' ? 'text-slate-500' : 'text-slate-400'
                    }`} />
                    <input
                      type="text"
                      placeholder="Search customer by name, phone, or email..."
                      value={customerSearch}
                      onChange={(e) => {
                        setCustomerSearch(e.target.value);
                        setShowCustomerDropdown(true);
                      }}
                      onFocus={() => setShowCustomerDropdown(true)}
                      className={`${inputClasses} pl-10`}
                    />
                  </div>

                  {/* Customer Dropdown */}
                  {showCustomerDropdown && customerSearch && (
                    <div className={`absolute top-full left-0 right-0 mt-2 rounded-xl border shadow-2xl z-[100] overflow-hidden max-h-80 overflow-y-auto ${
                      theme === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'
                    }`}>
                      {filteredCustomers.length > 0 ? (
                        <>
                          {filteredCustomers.map((customer) => (
                            <button
                              key={customer.id}
                              type="button"
                              onClick={() => handleCustomerSelect(customer)}
                              className={`w-full px-4 py-3 text-left transition-colors ${
                                theme === 'dark' ? 'hover:bg-slate-700' : 'hover:bg-slate-50'
                              }`}
                            >
                              <p className={`font-medium ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                                {customer.name}
                              </p>
                              <p className={`text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                                {customer.phone} • {customer.email}
                              </p>
                            </button>
                          ))}
                        </>
                      ) : (
                        <div className={`px-4 py-3 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                          No customers found
                        </div>
                      )}
                      <button
                        type="button"
                        onClick={handleNewCustomer}
                        className={`w-full px-4 py-3 text-left border-t flex items-center gap-2 transition-colors ${
                          theme === 'dark'
                            ? 'border-slate-700 hover:bg-emerald-500/10 text-emerald-400'
                            : 'border-slate-200 hover:bg-emerald-50 text-emerald-600'
                        }`}
                      >
                        <UserPlus className="w-4 h-4" />
                        Add "{customerSearch}" as new customer
                      </button>
                    </div>
                  )}

                  {errors.customerName && (
                    <p className="mt-2 text-sm text-red-500 flex items-center gap-1">
                      <AlertCircle className="w-4 h-4" />
                      {errors.customerName}
                    </p>
                  )}
                </div>
              ) : (
                /* Selected Customer Card */
                <div className={`rounded-xl border p-4 ${
                  theme === 'dark' ? 'bg-slate-800/50 border-slate-700/50' : 'bg-slate-50 border-slate-200'
                }`}>
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        theme === 'dark' ? 'bg-emerald-500/20' : 'bg-emerald-100'
                      }`}>
                        <User className="w-5 h-5 text-emerald-500" />
                      </div>
                      <div>
                        <p className={`font-semibold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                          {formData.customerName}
                        </p>
                        {formData.isNewCustomer && (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-500">
                            New Customer
                          </span>
                        )}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={clearCustomer}
                      className={`p-1.5 rounded-lg transition-colors ${
                        theme === 'dark' ? 'hover:bg-slate-700 text-slate-400' : 'hover:bg-slate-200 text-slate-600'
                      }`}
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className={labelClasses}>
                        <Phone className="w-3.5 h-3.5 inline mr-1.5" />
                        Phone Number *
                      </label>
                      <input
                        type="tel"
                        value={formData.customerPhone}
                        onChange={(e) => handleInputChange('customerPhone', e.target.value)}
                        placeholder="07X XXX XXXX"
                        className={`${inputClasses} ${errors.customerPhone ? 'border-red-500' : ''}`}
                      />
                      {errors.customerPhone && (
                        <p className="mt-1 text-xs text-red-500">{errors.customerPhone}</p>
                      )}
                    </div>
                    <div>
                      <label className={labelClasses}>
                        <Mail className="w-3.5 h-3.5 inline mr-1.5" />
                        Email Address
                      </label>
                      <input
                        type="email"
                        value={formData.customerEmail}
                        onChange={(e) => handleInputChange('customerEmail', e.target.value)}
                        placeholder="customer@email.com"
                        className={inputClasses}
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className={labelClasses}>
                        <MapPin className="w-3.5 h-3.5 inline mr-1.5" />
                        Address
                      </label>
                      <input
                        type="text"
                        value={formData.customerAddress}
                        onChange={(e) => handleInputChange('customerAddress', e.target.value)}
                        placeholder="Street, City"
                        className={inputClasses}
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Items Section */}
          <div className={`relative overflow-hidden rounded-2xl border p-6 ${
            theme === 'dark'
              ? 'bg-gradient-to-br from-slate-800/50 to-slate-900/50 border-slate-700/50'
              : 'bg-white border-slate-200 shadow-sm'
          }`}>
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-emerald-500/10 to-green-500/5 rounded-full blur-3xl" />
            <div className="relative">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className={`p-2.5 rounded-xl ${
                    theme === 'dark' ? 'bg-emerald-500/10' : 'bg-emerald-50'
                  }`}>
                    <Package className="w-5 h-5 text-emerald-500" />
                  </div>
                  <h2 className={`text-lg font-semibold ${
                    theme === 'dark' ? 'text-white' : 'text-slate-900'
                  }`}>
                    Products & Services
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={handleAddCustomItem}
                  className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-all ${
                    theme === 'dark'
                      ? 'bg-slate-700/50 hover:bg-slate-700 text-slate-300'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                  }`}
                >
                  <Plus className="w-4 h-4" />
                  Custom Item
                </button>
              </div>

              {/* Product Search */}
              <div ref={productDropdownRef} className="relative mb-4">
                <div className="relative">
                  <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 ${
                    theme === 'dark' ? 'text-slate-500' : 'text-slate-400'
                  }`} />
                  <input
                    type="text"
                    placeholder="Search products by name or SKU..."
                    value={productSearch}
                    onChange={(e) => {
                      setProductSearch(e.target.value);
                      setShowProductDropdown(true);
                    }}
                    onFocus={() => setShowProductDropdown(true)}
                    className={`${inputClasses} pl-10`}
                  />
                </div>

                {/* Product Dropdown */}
                {showProductDropdown && productSearch && (
                  <div className={`absolute top-full left-0 right-0 mt-2 rounded-xl border shadow-xl z-50 overflow-hidden max-h-80 overflow-y-auto ${
                    theme === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'
                  }`}>
                    {filteredProducts.length > 0 ? (
                      filteredProducts.map((product) => (
                        <button
                          key={product.id}
                          type="button"
                          onClick={() => handleAddProduct(product)}
                          className={`w-full px-4 py-3 text-left transition-colors flex items-center justify-between ${
                            theme === 'dark' ? 'hover:bg-slate-700' : 'hover:bg-slate-50'
                          }`}
                        >
                          <div>
                            <p className={`font-medium ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                              {product.name}
                            </p>
                            <p className={`text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                              {product.serialNumber && `SN: ${product.serialNumber} • `}Stock: {product.stock}
                            </p>
                          </div>
                          <span className={`font-semibold ${theme === 'dark' ? 'text-emerald-400' : 'text-emerald-600'}`}>
                            {formatCurrency(product.price)}
                          </span>
                        </button>
                      ))
                    ) : (
                      <div className={`px-4 py-3 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                        No products found
                      </div>
                    )}
                  </div>
                )}
              </div>

              {errors.items && (
                <p className="mb-4 text-sm text-red-500 flex items-center gap-1">
                  <AlertCircle className="w-4 h-4" />
                  {errors.items}
                </p>
              )}

              {/* Items List */}
              {formData.items.length > 0 ? (
                <div className="space-y-3">
                  {/* Header */}
                  <div className={`hidden md:flex gap-3 px-4 py-2 text-xs font-semibold uppercase tracking-wider ${
                    theme === 'dark' ? 'text-slate-500' : 'text-slate-500'
                  }`}>
                    <div className="flex-1">Product</div>
                    <div className="w-20 text-center">Qty</div>
                    <div className="flex-1 text-right">Unit Price</div>
                    <div className="w-24 text-center">Disc %</div>
                    <div className="w-32 text-right">Total</div>
                    <div className="w-12"></div>
                  </div>

                  {/* Items - Paginated */}
                  {formData.items
                    .slice((itemsCurrentPage - 1) * itemsPerPage, itemsCurrentPage * itemsPerPage)
                    .map((item, paginatedIndex) => {
                    // Calculate actual index for error messages
                    const actualIndex = (itemsCurrentPage - 1) * itemsPerPage + paginatedIndex;
                    return (
                    <div
                      key={item.id}
                      className={`rounded-xl border p-4 ${
                        theme === 'dark' ? 'bg-slate-800/30 border-slate-700/50' : 'bg-slate-50 border-slate-200'
                      }`}
                    >
                      <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center">
                        {/* Product Name */}
                        <div className="flex-1">
                          <input
                            type="text"
                            value={item.productName}
                            onChange={(e) => handleUpdateItem(item.id, 'productName', e.target.value)}
                            placeholder="Product name"
                            className={`${inputClasses} ${errors[`item_${actualIndex}_name`] ? 'border-red-500' : ''}`}
                          />
                        </div>

                        {/* Quantity */}
                        <div className="w-full md:w-20">
                          <label className={`md:hidden ${labelClasses}`}>Quantity</label>
                          <input
                            type="number"
                            min="1"
                            value={item.quantity}
                            onChange={(e) => handleUpdateItem(item.id, 'quantity', parseInt(e.target.value) || 1)}
                            className={`${inputClasses} text-center`}
                          />
                        </div>

                        {/* Unit Price */}
                        <div className="flex-1">
                          <label className={`md:hidden ${labelClasses}`}>Unit Price</label>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={item.unitPrice}
                            onChange={(e) => handleUpdateItem(item.id, 'unitPrice', parseFloat(e.target.value) || 0)}
                            className={`${inputClasses} text-right ${errors[`item_${actualIndex}_price`] ? 'border-red-500' : ''}`}
                          />
                        </div>

                        {/* Discount */}
                        <div className="w-full md:w-24">
                          <label className={`md:hidden ${labelClasses}`}>Discount %</label>
                          <input
                            type="number"
                            min="0"
                            max="100"
                            value={item.discount}
                            onChange={(e) => handleUpdateItem(item.id, 'discount', parseFloat(e.target.value) || 0)}
                            className={`${inputClasses} text-center`}
                          />
                        </div>

                        {/* Total */}
                        <div className={`w-full md:w-32 text-right font-semibold ${
                          theme === 'dark' ? 'text-emerald-400' : 'text-emerald-600'
                        }`}>
                          {formatCurrency(item.total)}
                        </div>

                        {/* Remove Button */}
                        <div className="md:col-span-1 flex justify-end">
                          <button
                            type="button"
                            onClick={() => handleRemoveItem(item.id)}
                            className={`p-2 rounded-lg transition-colors ${
                              theme === 'dark'
                                ? 'hover:bg-red-500/20 text-slate-400 hover:text-red-400'
                                : 'hover:bg-red-50 text-slate-500 hover:text-red-600'
                            }`}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {/* Description Field */}
                      <div className="mt-3">
                        <input
                          type="text"
                          value={item.description}
                          onChange={(e) => handleUpdateItem(item.id, 'description', e.target.value)}
                          placeholder="Add description or specifications (optional)"
                          className={`${inputClasses} text-sm`}
                        />
                      </div>
                    </div>
                  );})}

                  {/* Pagination Controls */}
                  {formData.items.length > itemsPerPage && (
                    <div className={`flex items-center justify-between pt-4 border-t ${
                      theme === 'dark' ? 'border-slate-700/50' : 'border-slate-200'
                    }`}>
                      <p className={`text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                        Showing {((itemsCurrentPage - 1) * itemsPerPage) + 1} - {Math.min(itemsCurrentPage * itemsPerPage, formData.items.length)} of {formData.items.length} items
                      </p>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setItemsCurrentPage(prev => Math.max(1, prev - 1))}
                          disabled={itemsCurrentPage === 1}
                          className={`p-2 rounded-lg border transition-all ${
                            itemsCurrentPage === 1
                              ? theme === 'dark'
                                ? 'bg-slate-800/30 border-slate-700/30 text-slate-600 cursor-not-allowed'
                                : 'bg-slate-50 border-slate-200 text-slate-300 cursor-not-allowed'
                              : theme === 'dark'
                                ? 'bg-slate-800/50 border-slate-700/50 hover:bg-slate-700/50 text-slate-400'
                                : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-600'
                          }`}
                        >
                          <ChevronLeft className="w-4 h-4" />
                        </button>
                        <span className={`px-3 py-1 text-sm font-medium ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                          Page {itemsCurrentPage} of {Math.ceil(formData.items.length / itemsPerPage)}
                        </span>
                        <button
                          type="button"
                          onClick={() => setItemsCurrentPage(prev => Math.min(Math.ceil(formData.items.length / itemsPerPage), prev + 1))}
                          disabled={itemsCurrentPage >= Math.ceil(formData.items.length / itemsPerPage)}
                          className={`p-2 rounded-lg border transition-all ${
                            itemsCurrentPage >= Math.ceil(formData.items.length / itemsPerPage)
                              ? theme === 'dark'
                                ? 'bg-slate-800/30 border-slate-700/30 text-slate-600 cursor-not-allowed'
                                : 'bg-slate-50 border-slate-200 text-slate-300 cursor-not-allowed'
                              : theme === 'dark'
                                ? 'bg-slate-800/50 border-slate-700/50 hover:bg-slate-700/50 text-slate-400'
                                : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-600'
                          }`}
                        >
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className={`text-center py-12 rounded-xl border-2 border-dashed ${
                  theme === 'dark' ? 'border-slate-700 text-slate-500' : 'border-slate-300 text-slate-400'
                }`}>
                  <Package className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p className="font-medium">No items added yet</p>
                  <p className="text-sm mt-1">Search for products above or add a custom item</p>
                </div>
              )}
            </div>
          </div>

          {/* Notes Section */}
          <div className={`relative overflow-hidden rounded-2xl border p-6 ${
            theme === 'dark'
              ? 'bg-gradient-to-br from-slate-800/50 to-slate-900/50 border-slate-700/50'
              : 'bg-white border-slate-200 shadow-sm'
          }`}>
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-purple-500/10 to-pink-500/5 rounded-full blur-3xl" />
            <div className="relative">
              <div className="flex items-center gap-3 mb-6">
                <div className={`p-2.5 rounded-xl ${
                  theme === 'dark' ? 'bg-purple-500/10' : 'bg-purple-50'
                }`}>
                  <FileText className="w-5 h-5 text-purple-500" />
                </div>
                <h2 className={`text-lg font-semibold ${
                  theme === 'dark' ? 'text-white' : 'text-slate-900'
                }`}>
                  Notes & Terms
                </h2>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div>
                  <label className={labelClasses}>Customer Notes</label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => handleInputChange('notes', e.target.value)}
                    placeholder="Notes visible to customer on the quotation..."
                    rows={4}
                    className={inputClasses}
                  />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className={labelClasses.replace('mb-1.5', '')}>Terms & Conditions</label>
                    <select
                      onChange={(e) => {
                        const template = defaultTermsTemplates.find(t => t.name === e.target.value);
                        if (template) handleInputChange('terms', template.terms);
                      }}
                      className={`text-xs px-2 py-1 rounded-lg border ${
                        theme === 'dark'
                          ? 'bg-slate-800 border-slate-700 text-slate-400'
                          : 'bg-white border-slate-200 text-slate-600'
                      }`}
                    >
                      <option value="">Load Template</option>
                      {defaultTermsTemplates.map(t => (
                        <option key={t.name} value={t.name}>{t.name}</option>
                      ))}
                    </select>
                  </div>
                  <textarea
                    value={formData.terms}
                    onChange={(e) => handleInputChange('terms', e.target.value)}
                    placeholder="Terms and conditions..."
                    rows={4}
                    className={inputClasses}
                  />
                </div>
              </div>

              <div className="mt-4">
                <label className={labelClasses}>Internal Notes (Not visible to customer)</label>
                <textarea
                  value={formData.internalNotes}
                  onChange={(e) => handleInputChange('internalNotes', e.target.value)}
                  placeholder="Internal notes for your team..."
                  rows={2}
                  className={`${inputClasses} border-amber-500/30`}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Right Column - Summary */}
        <div className="space-y-6">
          {/* Quotation Details */}
          <div className={`relative rounded-2xl border p-6 ${
            theme === 'dark'
              ? 'bg-gradient-to-br from-slate-800/50 to-slate-900/50 border-slate-700/50'
              : 'bg-white border-slate-200 shadow-sm'
          }`}>
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-amber-500/10 to-orange-500/5 rounded-full blur-3xl pointer-events-none" />
            <div className="relative">
              <div className="flex items-center gap-3 mb-6">
                <div className={`p-2.5 rounded-xl ${
                  theme === 'dark' ? 'bg-amber-500/10' : 'bg-amber-50'
                }`}>
                  <Calendar className="w-5 h-5 text-amber-500" />
                </div>
                <h2 className={`text-lg font-semibold ${
                  theme === 'dark' ? 'text-white' : 'text-slate-900'
                }`}>
                  Quotation Details
                </h2>
              </div>

              <div className="space-y-4">
                {/* Quotation Number */}
                <div>
                  <label className={labelClasses}>Quotation Number</label>
                  <input
                    type="text"
                    value={isEditing ? `QUO-${id}` : quotationNumber}
                    disabled
                    className={`${inputClasses} opacity-60 cursor-not-allowed`}
                  />
                </div>

                {/* Quotation Date */}
                <div ref={quotationDateCalendarRef} className="relative">
                  <label className={labelClasses}>Quotation Date</label>
                  <button
                    type="button"
                    onClick={() => setShowQuotationDateCalendar(!showQuotationDateCalendar)}
                    className={`${inputClasses} text-left flex items-center justify-between`}
                  >
                    <span>{formatDateDisplay(formData.quotationDate)}</span>
                    <Calendar className="w-4 h-4 opacity-50" />
                  </button>
                  {showQuotationDateCalendar && renderCalendar(
                    formData.quotationDate,
                    (date) => handleInputChange('quotationDate', date),
                    setShowQuotationDateCalendar
                  )}
                </div>

                {/* Validity Period */}
                <div>
                  <label className={labelClasses}>Valid For</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min="1"
                      max="365"
                      value={formData.validityDays}
                      onChange={(e) => handleInputChange('validityDays', parseInt(e.target.value) || 30)}
                      className={`${inputClasses} w-20 text-center`}
                    />
                    <span className={theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}>days</span>
                  </div>
                </div>

                {/* Expiry Date */}
                <div>
                  <label className={labelClasses}>Expiry Date</label>
                  <div className={`px-4 py-2.5 rounded-xl border flex items-center gap-2 ${
                    theme === 'dark' ? 'bg-slate-800/30 border-slate-700/50 text-slate-300' : 'bg-slate-50 border-slate-200 text-slate-700'
                  }`}>
                    <Clock className="w-4 h-4 opacity-50" />
                    <span>{formatDateDisplay(formData.expiryDate)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Financial Summary */}
          <div className={`relative overflow-hidden rounded-2xl border p-6 ${
            theme === 'dark'
              ? 'bg-gradient-to-br from-slate-800/50 to-slate-900/50 border-slate-700/50'
              : 'bg-white border-slate-200 shadow-sm'
          }`}>
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-emerald-500/20 to-green-500/10 rounded-full blur-3xl" />
            <div className="relative">
              <div className="flex items-center gap-3 mb-6">
                <div className={`p-2.5 rounded-xl ${
                  theme === 'dark' ? 'bg-emerald-500/10' : 'bg-emerald-50'
                }`}>
                  <Calculator className="w-5 h-5 text-emerald-500" />
                </div>
                <h2 className={`text-lg font-semibold ${
                  theme === 'dark' ? 'text-white' : 'text-slate-900'
                }`}>
                  Summary
                </h2>
              </div>

              <div className="space-y-4">
                {/* Subtotal */}
                <div className="flex items-center justify-between">
                  <span className={theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}>
                    Subtotal ({formData.items.length} items)
                  </span>
                  <span className={`font-medium ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                    {formatCurrency(formData.subtotal)}
                  </span>
                </div>

                {/* Discount */}
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span className={theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}>Discount</span>
                    <div className="flex items-center">
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={formData.discountPercent}
                        onChange={(e) => handleInputChange('discountPercent', parseFloat(e.target.value) || 0)}
                        className={`w-16 px-2 py-1 rounded-lg border text-center text-sm ${
                          theme === 'dark'
                            ? 'bg-slate-800 border-slate-700 text-white'
                            : 'bg-white border-slate-200 text-slate-900'
                        }`}
                      />
                      <Percent className={`w-3.5 h-3.5 ml-1 ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`} />
                    </div>
                  </div>
                  <span className="text-red-500 font-medium">
                    -{formatCurrency(formData.discountAmount)}
                  </span>
                </div>

                {/* Tax */}
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span className={theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}>Tax</span>
                    <div className="flex items-center">
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={formData.taxPercent}
                        onChange={(e) => handleInputChange('taxPercent', parseFloat(e.target.value) || 0)}
                        className={`w-16 px-2 py-1 rounded-lg border text-center text-sm ${
                          theme === 'dark'
                            ? 'bg-slate-800 border-slate-700 text-white'
                            : 'bg-white border-slate-200 text-slate-900'
                        }`}
                      />
                      <Percent className={`w-3.5 h-3.5 ml-1 ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`} />
                    </div>
                  </div>
                  <span className={`font-medium ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                    +{formatCurrency(formData.taxAmount)}
                  </span>
                </div>

                {/* Divider */}
                <div className={`border-t pt-4 ${theme === 'dark' ? 'border-slate-700' : 'border-slate-200'}`}>
                  <div className="flex items-center justify-between">
                    <span className={`text-lg font-semibold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                      Total
                    </span>
                    <span className="text-2xl font-bold bg-gradient-to-r from-emerald-400 to-teal-500 bg-clip-text text-transparent">
                      {formatCurrency(formData.total)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className={`relative overflow-hidden rounded-2xl border p-6 ${
            theme === 'dark'
              ? 'bg-gradient-to-br from-slate-800/50 to-slate-900/50 border-slate-700/50'
              : 'bg-white border-slate-200 shadow-sm'
          }`}>
            <div className="relative">
              <h2 className={`text-lg font-semibold mb-4 ${
                theme === 'dark' ? 'text-white' : 'text-slate-900'
              }`}>
                Quick Actions
              </h2>

              <div className="space-y-3">
                <button
                  type="button"
                  onClick={() => setShowPreview(true)}
                  disabled={formData.items.length === 0 || !formData.customerName}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border transition-all ${
                    formData.items.length === 0 || !formData.customerName
                      ? theme === 'dark'
                        ? 'bg-slate-800/30 border-slate-700/30 text-slate-600 cursor-not-allowed'
                        : 'bg-slate-50 border-slate-200 text-slate-400 cursor-not-allowed'
                      : theme === 'dark'
                        ? 'bg-slate-800/50 border-slate-700/50 hover:bg-slate-700/50 text-slate-300'
                        : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  <Eye className={`w-5 h-5 ${formData.items.length === 0 || !formData.customerName ? 'text-slate-500' : 'text-emerald-500'}`} />
                  <span>Preview Quotation</span>
                </button>
                <button
                  type="button"
                  onClick={handleDownloadPDF}
                  disabled={formData.items.length === 0 || !formData.customerName}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border transition-all ${
                    formData.items.length === 0 || !formData.customerName
                      ? theme === 'dark'
                        ? 'bg-slate-800/30 border-slate-700/30 text-slate-600 cursor-not-allowed'
                        : 'bg-slate-50 border-slate-200 text-slate-400 cursor-not-allowed'
                      : theme === 'dark'
                        ? 'bg-slate-800/50 border-slate-700/50 hover:bg-slate-700/50 text-slate-300'
                        : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  <Download className={`w-5 h-5 ${formData.items.length === 0 || !formData.customerName ? 'text-slate-500' : 'text-purple-500'}`} />
                  <span>Download PDF</span>
                </button>
                <button
                  type="button"
                  onClick={handlePrint}
                  disabled={formData.items.length === 0 || !formData.customerName}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border transition-all ${
                    formData.items.length === 0 || !formData.customerName
                      ? theme === 'dark'
                        ? 'bg-slate-800/30 border-slate-700/30 text-slate-600 cursor-not-allowed'
                        : 'bg-slate-50 border-slate-200 text-slate-400 cursor-not-allowed'
                      : theme === 'dark'
                        ? 'bg-slate-800/50 border-slate-700/50 hover:bg-slate-700/50 text-slate-300'
                        : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  <Printer className={`w-5 h-5 ${formData.items.length === 0 || !formData.customerName ? 'text-slate-500' : 'text-amber-500'}`} />
                  <span>Print Quotation</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Hidden Printable Component */}
      <div style={{ position: 'absolute', left: '-9999px', top: '-9999px' }}>
        <PrintableQuotation ref={printRef} quotation={getQuotationData()} />
      </div>

      {/* Preview Modal */}
      {showPreview && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className={`relative w-full max-w-4xl max-h-[90vh] overflow-auto rounded-2xl ${
            theme === 'dark' ? 'bg-slate-900 border border-slate-700' : 'bg-white border border-slate-200'
          }`}>
            {/* Modal Header */}
            <div className={`sticky top-0 z-10 flex items-center justify-between p-4 border-b ${
              theme === 'dark' ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-200'
            }`}>
              <h3 className={`text-lg font-semibold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                Preview Quotation
              </h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={handlePrint}
                  className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-xl font-medium text-sm"
                >
                  <Printer className="w-4 h-4" />
                  Print
                </button>
                <button
                  onClick={() => setShowPreview(false)}
                  className={`p-2 rounded-xl transition-colors ${
                    theme === 'dark' ? 'hover:bg-slate-800 text-slate-400' : 'hover:bg-slate-100 text-slate-600'
                  }`}
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            {/* Preview Content */}
            <div className="p-4 overflow-auto" style={{ transform: 'scale(0.85)', transformOrigin: 'top center' }}>
              <PrintableQuotation quotation={getQuotationData()} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
