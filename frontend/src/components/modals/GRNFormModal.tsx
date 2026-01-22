import React, { useState, useEffect, useMemo } from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import type { GoodsReceivedNote, GRNItem, Supplier, GRNStatus } from '../../data/mockData';
import { mockProducts } from '../../data/mockData';
import { SearchableSelect } from '../ui/searchable-select';
import {
  X,
  Package,
  Truck,
  ClipboardCheck,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Plus,
  Trash2,
  Save,
  Calendar,
  FileText,
  Box,
  Clock,
  User,
  Hash,
  Search,
  DollarSign,
  ChevronLeft,
  ChevronRight,
  Tag,
} from 'lucide-react';

interface GRNFormModalProps {
  isOpen: boolean;
  grn?: GoodsReceivedNote;
  suppliers: Supplier[];
  onClose: () => void;
  onSave: (grn: GoodsReceivedNote) => void;
}

// Modern Date Picker Component
interface DatePickerProps {
  value: string;
  onChange: (date: string) => void;
  placeholder?: string;
  theme: string;
}

const DatePickerInput: React.FC<DatePickerProps> = ({ value, onChange, placeholder, theme }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(value ? new Date(value) : new Date());
  const containerRef = React.useRef<HTMLDivElement>(null);
  
  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const formatDisplayDate = (dateStr: string) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const days: (Date | null)[] = [];
    
    // Add empty cells for days before the first day
    for (let i = 0; i < firstDay.getDay(); i++) {
      days.push(null);
    }
    
    // Add all days of the month
    for (let d = 1; d <= lastDay.getDate(); d++) {
      days.push(new Date(year, month, d));
    }
    
    return days;
  };

  const handleDateSelect = (date: Date) => {
    const formattedDate = date.toISOString().split('T')[0];
    onChange(formattedDate);
    setIsOpen(false);
  };

  const goToPreviousMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  };

  const goToNextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  };

  const days = getDaysInMonth(currentMonth);
  const weekDays = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full px-4 py-3 rounded-xl border text-left flex items-center gap-3 transition-all ${
          theme === 'dark'
            ? 'bg-slate-800/50 border-slate-700 text-white hover:border-slate-600'
            : 'bg-white border-slate-200 text-slate-900 hover:border-slate-300'
        } focus:outline-none focus:ring-2 focus:ring-emerald-500/50`}
      >
        <Calendar className={`w-4 h-4 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`} />
        <span className={value ? '' : (theme === 'dark' ? 'text-slate-500' : 'text-slate-400')}>
          {value ? formatDisplayDate(value) : placeholder || 'Select date'}
        </span>
      </button>

      {isOpen && (
        <div className={`absolute z-50 mt-2 p-4 rounded-xl border shadow-xl ${
          theme === 'dark'
            ? 'bg-slate-800 border-slate-700'
            : 'bg-white border-slate-200'
        }`} style={{ minWidth: '280px' }}>
          {/* Month Navigation */}
          <div className="flex items-center justify-between mb-4">
            <button
              type="button"
              onClick={goToPreviousMonth}
              className={`p-1.5 rounded-lg transition-colors ${
                theme === 'dark' ? 'hover:bg-slate-700 text-slate-400' : 'hover:bg-slate-100 text-slate-600'
              }`}
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className={`font-semibold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
              {currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            </span>
            <button
              type="button"
              onClick={goToNextMonth}
              className={`p-1.5 rounded-lg transition-colors ${
                theme === 'dark' ? 'hover:bg-slate-700 text-slate-400' : 'hover:bg-slate-100 text-slate-600'
              }`}
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Week Days Header */}
          <div className="grid grid-cols-7 gap-1 mb-2">
            {weekDays.map(day => (
              <div
                key={day}
                className={`text-center text-xs font-medium py-1 ${
                  theme === 'dark' ? 'text-slate-500' : 'text-slate-400'
                }`}
              >
                {day}
              </div>
            ))}
          </div>

          {/* Days Grid */}
          <div className="grid grid-cols-7 gap-1">
            {days.map((day, index) => {
              if (!day) {
                return <div key={`empty-${index}`} className="p-2" />;
              }
              
              const isSelected = value === day.toISOString().split('T')[0];
              const isToday = day.toDateString() === new Date().toDateString();
              
              return (
                <button
                  key={day.toISOString()}
                  type="button"
                  onClick={() => handleDateSelect(day)}
                  className={`p-2 text-sm rounded-lg transition-all ${
                    isSelected
                      ? 'bg-emerald-500 text-white font-semibold'
                      : isToday
                        ? theme === 'dark'
                          ? 'bg-slate-700 text-emerald-400 font-medium'
                          : 'bg-emerald-50 text-emerald-600 font-medium'
                        : theme === 'dark'
                          ? 'text-slate-300 hover:bg-slate-700'
                          : 'text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  {day.getDate()}
                </button>
              );
            })}
          </div>

          {/* Today Button */}
          <button
            type="button"
            onClick={() => handleDateSelect(new Date())}
            className={`w-full mt-3 py-2 text-sm font-medium rounded-lg transition-colors ${
              theme === 'dark'
                ? 'bg-slate-700 text-emerald-400 hover:bg-slate-600'
                : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100'
            }`}
          >
            Today
          </button>
        </div>
      )}
    </div>
  );
};

const statusConfig: Record<GRNStatus, { label: string; color: string; bgColor: string; icon: React.ElementType }> = {
  pending: { label: 'Pending Delivery', color: 'text-amber-500', bgColor: 'bg-amber-500/10', icon: Clock },
  inspecting: { label: 'Quality Inspection', color: 'text-blue-500', bgColor: 'bg-blue-500/10', icon: Search },
  partial: { label: 'Partial Received', color: 'text-orange-500', bgColor: 'bg-orange-500/10', icon: AlertTriangle },
  completed: { label: 'Completed', color: 'text-emerald-500', bgColor: 'bg-emerald-500/10', icon: CheckCircle },
  rejected: { label: 'Rejected', color: 'text-red-500', bgColor: 'bg-red-500/10', icon: XCircle },
};

export const GRNFormModal: React.FC<GRNFormModalProps> = ({
  isOpen,
  grn,
  suppliers,
  onClose,
  onSave,
}) => {
  const { theme } = useTheme();
  const isEditing = !!grn;

  // Form state
  const [formData, setFormData] = useState<Partial<GoodsReceivedNote>>({
    supplierId: '',
    supplierName: '',
    orderDate: new Date().toISOString().split('T')[0],
    expectedDeliveryDate: '',
    receivedDate: '',
    items: [],
    status: 'pending',
    receivedBy: '',
    deliveryNote: '',
    vehicleNumber: '',
    driverName: '',
    notes: '',
  });

  const [items, setItems] = useState<GRNItem[]>([]);
  const [activeTab, setActiveTab] = useState<'details' | 'items'>('details');

  // Initialize form with existing GRN data
  useEffect(() => {
    if (grn) {
      setFormData({
        ...grn,
      });
      setItems(grn.items);
    } else {
      // Generate new GRN number
      const grnNumber = `GRN-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 9999) + 1).padStart(4, '0')}`;
      setFormData({
        supplierId: '',
        supplierName: '',
        grnNumber,
        orderDate: new Date().toISOString().split('T')[0],
        expectedDeliveryDate: '',
        receivedDate: '',
        items: [],
        status: 'pending',
        receivedBy: '',
        deliveryNote: '',
        vehicleNumber: '',
        driverName: '',
        notes: '',
      });
      setItems([]);
    }
  }, [grn, isOpen]);

  // Supplier options for select
  const supplierOptions = useMemo(() => [
    { value: '', label: 'Select Supplier' },
    ...suppliers.map(s => ({ value: s.id, label: s.company }))
  ], [suppliers]);

  // Status options for select
  const statusOptions = useMemo(() => 
    Object.entries(statusConfig).map(([value, config]) => ({
      value,
      label: config.label
    }))
  , []);

  // Product options for select
  const productOptions = useMemo(() => [
    { value: '', label: 'Select Product' },
    ...mockProducts.map(p => ({ value: p.id, label: `${p.name} - Rs.${p.price.toLocaleString()}` }))
  ], []);

  // Handle supplier change
  const handleSupplierChange = (supplierId: string) => {
    const supplier = suppliers.find(s => s.id === supplierId);
    setFormData(prev => ({
      ...prev,
      supplierId,
      supplierName: supplier?.company || '',
    }));
  };

  // Add new item
  const addItem = () => {
    const newItem: GRNItem = {
      id: `grn-item-${Date.now()}`,
      productId: '',
      productName: '',
      category: '',
      orderedQuantity: 0,
      receivedQuantity: 0,
      acceptedQuantity: 0,
      rejectedQuantity: 0,
      unitPrice: 0,
      originalUnitPrice: 0,
      discountType: 'fixed',
      discountValue: 0,
      totalAmount: 0,
      status: 'pending',
    };
    setItems([...items, newItem]);
  };

  // Update item
  const updateItem = (index: number, field: keyof GRNItem, value: any) => {
    const updated = [...items];
    updated[index] = { ...updated[index], [field]: value };

    // If product changed, update related fields
    if (field === 'productId') {
      const product = mockProducts.find(p => p.id === value);
      if (product) {
        updated[index].productName = product.name;
        updated[index].category = product.category;
        updated[index].originalUnitPrice = product.price;
        updated[index].unitPrice = product.price;
        updated[index].discountType = 'fixed';
        updated[index].discountValue = 0;
      }
    }

    // Recalculate unit price when discount changes
    if (['discountType', 'discountValue', 'originalUnitPrice'].includes(field)) {
      const item = updated[index];
      const originalPrice = item.originalUnitPrice || item.unitPrice;
      const discountType = item.discountType || 'fixed';
      const discountValue = item.discountValue || 0;
      
      if (discountType === 'percentage') {
        updated[index].unitPrice = originalPrice * (1 - discountValue / 100);
      } else {
        updated[index].unitPrice = originalPrice - discountValue;
      }
    }

    // Recalculate totals
    if (['acceptedQuantity', 'unitPrice', 'discountType', 'discountValue', 'originalUnitPrice'].includes(field)) {
      updated[index].totalAmount = updated[index].acceptedQuantity * updated[index].unitPrice;
    }

    // Auto-update status based on quantities
    if (['receivedQuantity', 'acceptedQuantity', 'rejectedQuantity'].includes(field)) {
      const item = updated[index];
      if (item.acceptedQuantity === item.orderedQuantity) {
        updated[index].status = 'accepted';
      } else if (item.rejectedQuantity === item.orderedQuantity) {
        updated[index].status = 'rejected';
      } else if (item.acceptedQuantity > 0 || item.rejectedQuantity > 0) {
        updated[index].status = 'partial';
      } else {
        updated[index].status = 'pending';
      }
    }

    setItems(updated);
  };

  // Remove item
  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  // Calculate totals
  const totals = useMemo(() => {
    return items.reduce((acc, item) => {
      const originalPrice = item.originalUnitPrice || item.unitPrice;
      const discountPerItem = originalPrice - item.unitPrice;
      const itemTotalDiscount = discountPerItem * item.acceptedQuantity;
      
      return {
        orderedQuantity: acc.orderedQuantity + item.orderedQuantity,
        receivedQuantity: acc.receivedQuantity + item.receivedQuantity,
        acceptedQuantity: acc.acceptedQuantity + item.acceptedQuantity,
        rejectedQuantity: acc.rejectedQuantity + item.rejectedQuantity,
        totalAmount: acc.totalAmount + item.totalAmount,
        totalDiscount: acc.totalDiscount + itemTotalDiscount,
      };
    }, {
      orderedQuantity: 0,
      receivedQuantity: 0,
      acceptedQuantity: 0,
      rejectedQuantity: 0,
      totalAmount: 0,
      totalDiscount: 0,
    });
  }, [items]);

  // Handle save
  const handleSave = () => {
    const now = new Date().toISOString();
    const savedGRN: GoodsReceivedNote = {
      id: grn?.id || `grn-${Date.now()}`,
      grnNumber: formData.grnNumber || `GRN-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 9999) + 1).padStart(4, '0')}`,
      supplierId: formData.supplierId || '',
      supplierName: formData.supplierName || '',
      orderDate: formData.orderDate || now,
      expectedDeliveryDate: formData.expectedDeliveryDate || '',
      receivedDate: formData.receivedDate || '',
      items,
      totalOrderedQuantity: totals.orderedQuantity,
      totalReceivedQuantity: totals.receivedQuantity,
      totalAcceptedQuantity: totals.acceptedQuantity,
      totalRejectedQuantity: totals.rejectedQuantity,
      subtotal: totals.totalAmount + totals.totalDiscount,
      discountAmount: formData.discountAmount || 0,
      totalDiscount: totals.totalDiscount,
      taxAmount: formData.taxAmount || 0,
      totalAmount: totals.totalAmount - (formData.discountAmount || 0) + (formData.taxAmount || 0),
      status: formData.status as GRNStatus || 'pending',
      inspectedBy: formData.inspectedBy,
      inspectionDate: formData.inspectionDate,
      approvedBy: formData.approvedBy,
      approvalDate: formData.approvalDate,
      receivedBy: formData.receivedBy || '',
      deliveryNote: formData.deliveryNote,
      vehicleNumber: formData.vehicleNumber,
      driverName: formData.driverName,
      notes: formData.notes,
      internalNotes: formData.internalNotes,
      createdAt: grn?.createdAt || now,
      updatedAt: now,
    };

    onSave(savedGRN);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className={`w-full max-w-5xl max-h-[95vh] rounded-2xl border shadow-2xl overflow-hidden flex flex-col ${
        theme === 'dark' 
          ? 'bg-slate-900 border-slate-700' 
          : 'bg-white border-slate-200'
      }`}>
        {/* Header */}
        <div className={`px-6 py-4 border-b flex items-center justify-between flex-shrink-0 ${
          theme === 'dark' 
            ? 'bg-gradient-to-r from-emerald-900/30 to-teal-900/30 border-slate-700' 
            : 'bg-gradient-to-r from-emerald-50 to-teal-50 border-slate-200'
        }`}>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/25">
              <ClipboardCheck className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className={`text-xl font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                {isEditing ? 'Edit GRN' : 'Create New GRN'}
              </h2>
              <p className={`text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                {formData.grnNumber || 'Goods Received Note'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className={`p-2 rounded-lg transition-colors ${
              theme === 'dark' ? 'hover:bg-slate-700 text-slate-400' : 'hover:bg-slate-100 text-slate-600'
            }`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className={`px-6 py-2 border-b flex gap-2 ${
          theme === 'dark' ? 'border-slate-700 bg-slate-800/50' : 'border-slate-200 bg-slate-50'
        }`}>
          {[
            { id: 'details', label: 'GRN Details', icon: FileText },
            { id: 'items', label: 'Items', icon: Package },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === tab.id
                  ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/25'
                  : theme === 'dark'
                    ? 'text-slate-400 hover:bg-slate-700'
                    : 'text-slate-600 hover:bg-slate-200'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'details' && (
            <div className="space-y-6">
              {/* Supplier & Dates Row */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Supplier Selection */}
                <div>
                  <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                    <Truck className="w-4 h-4 inline mr-2" />
                    Supplier *
                  </label>
                  <SearchableSelect
                    value={formData.supplierId || ''}
                    onValueChange={(val: string) => handleSupplierChange(val)}
                    options={supplierOptions}
                    placeholder="Select Supplier"
                    theme={theme}
                  />
                </div>

                {/* GRN Status */}
                <div>
                  <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                    Status
                  </label>
                  <SearchableSelect
                    value={formData.status || 'pending'}
                    onValueChange={(val: string) => setFormData({ ...formData, status: val as GRNStatus })}
                    options={statusOptions}
                    placeholder="Select Status"
                    theme={theme}
                  />
                </div>
              </div>

              {/* Dates Row */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                    <Calendar className="w-4 h-4 inline mr-2" />
                    Order Date
                  </label>
                  <DatePickerInput
                    value={formData.orderDate || ''}
                    onChange={(date) => setFormData({ ...formData, orderDate: date })}
                    placeholder="Select order date"
                    theme={theme}
                  />
                </div>
                <div>
                  <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                    <Calendar className="w-4 h-4 inline mr-2" />
                    Expected Delivery
                  </label>
                  <DatePickerInput
                    value={formData.expectedDeliveryDate || ''}
                    onChange={(date) => setFormData({ ...formData, expectedDeliveryDate: date })}
                    placeholder="Select expected date"
                    theme={theme}
                  />
                </div>
                <div>
                  <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                    <Calendar className="w-4 h-4 inline mr-2" />
                    Received Date
                  </label>
                  <DatePickerInput
                    value={formData.receivedDate || ''}
                    onChange={(date) => setFormData({ ...formData, receivedDate: date })}
                    placeholder="Select received date"
                    theme={theme}
                  />
                </div>
              </div>

              {/* Delivery Info Row */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                    <User className="w-4 h-4 inline mr-2" />
                    Received By
                  </label>
                  <input
                    type="text"
                    value={formData.receivedBy}
                    onChange={(e) => setFormData({ ...formData, receivedBy: e.target.value })}
                    placeholder="Staff name"
                    className={`w-full px-4 py-3 rounded-xl border ${
                      theme === 'dark'
                        ? 'bg-slate-800/50 border-slate-700 text-white placeholder-slate-500'
                        : 'bg-white border-slate-200 text-slate-900 placeholder-slate-400'
                    } focus:outline-none focus:ring-2 focus:ring-emerald-500/50`}
                  />
                </div>
                <div>
                  <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                    <Hash className="w-4 h-4 inline mr-2" />
                    Delivery Note No.
                  </label>
                  <input
                    type="text"
                    value={formData.deliveryNote}
                    onChange={(e) => setFormData({ ...formData, deliveryNote: e.target.value })}
                    placeholder="DN-XXXX-XXXX"
                    className={`w-full px-4 py-3 rounded-xl border ${
                      theme === 'dark'
                        ? 'bg-slate-800/50 border-slate-700 text-white placeholder-slate-500'
                        : 'bg-white border-slate-200 text-slate-900 placeholder-slate-400'
                    } focus:outline-none focus:ring-2 focus:ring-emerald-500/50`}
                  />
                </div>
                <div>
                  <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                    <Truck className="w-4 h-4 inline mr-2" />
                    Vehicle Number
                  </label>
                  <input
                    type="text"
                    value={formData.vehicleNumber}
                    onChange={(e) => setFormData({ ...formData, vehicleNumber: e.target.value })}
                    placeholder="WP XXX-XXXX"
                    className={`w-full px-4 py-3 rounded-xl border ${
                      theme === 'dark'
                        ? 'bg-slate-800/50 border-slate-700 text-white placeholder-slate-500'
                        : 'bg-white border-slate-200 text-slate-900 placeholder-slate-400'
                    } focus:outline-none focus:ring-2 focus:ring-emerald-500/50`}
                  />
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                  <FileText className="w-4 h-4 inline mr-2" />
                  Notes
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={3}
                  placeholder="Additional notes about this delivery..."
                  className={`w-full px-4 py-3 rounded-xl border ${
                    theme === 'dark'
                      ? 'bg-slate-800/50 border-slate-700 text-white placeholder-slate-500'
                      : 'bg-white border-slate-200 text-slate-900 placeholder-slate-400'
                  } focus:outline-none focus:ring-2 focus:ring-emerald-500/50`}
                />
              </div>
            </div>
          )}

          {activeTab === 'items' && (
            <div className="space-y-4">
              {/* Add Item Button */}
              <div className="flex justify-between items-center">
                <h3 className={`text-lg font-semibold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                  Products / Items
                </h3>
                <button
                  onClick={addItem}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-medium hover:from-emerald-600 hover:to-teal-600 transition-all shadow-lg shadow-emerald-500/25"
                >
                  <Plus className="w-4 h-4" />
                  Add Product
                </button>
              </div>

              {/* Items List */}
              {items.length === 0 ? (
                <div className={`text-center py-12 rounded-xl border-2 border-dashed ${
                  theme === 'dark' ? 'border-slate-700 text-slate-500' : 'border-slate-200 text-slate-400'
                }`}>
                  <Box className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>No items added yet</p>
                  <p className="text-sm mt-1">Click "Add Product" to start adding items</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {items.map((item, index) => (
                    <div
                      key={item.id}
                      className={`p-4 rounded-xl border ${
                        theme === 'dark' ? 'bg-slate-800/30 border-slate-700' : 'bg-slate-50 border-slate-200'
                      }`}
                    >
                      {/* Row 1: Product and Quantities */}
                      <div className="grid grid-cols-12 gap-4 mb-4">
                        {/* Product Selection */}
                        <div className="col-span-12 md:col-span-5">
                          <label className={`block text-xs font-medium mb-1 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                            Product
                          </label>
                          <SearchableSelect
                            value={item.productId}
                            onValueChange={(val: string) => updateItem(index, 'productId', val)}
                            options={productOptions}
                            placeholder="Select Product"
                            theme={theme}
                          />
                        </div>

                        {/* Ordered Qty */}
                        <div className="col-span-4 md:col-span-2">
                          <label className={`block text-xs font-medium mb-1 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                            Ordered
                          </label>
                          <input
                            type="number"
                            value={item.orderedQuantity}
                            onChange={(e) => updateItem(index, 'orderedQuantity', parseInt(e.target.value) || 0)}
                            className={`w-full px-3 py-2 rounded-lg border text-center ${
                              theme === 'dark'
                                ? 'bg-slate-800 border-slate-600 text-white'
                                : 'bg-white border-slate-200 text-slate-900'
                            }`}
                          />
                        </div>

                        {/* Received Qty */}
                        <div className="col-span-4 md:col-span-2">
                          <label className={`block text-xs font-medium mb-1 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                            Received
                          </label>
                          <input
                            type="number"
                            value={item.receivedQuantity}
                            onChange={(e) => updateItem(index, 'receivedQuantity', parseInt(e.target.value) || 0)}
                            className={`w-full px-3 py-2 rounded-lg border text-center ${
                              theme === 'dark'
                                ? 'bg-slate-800 border-slate-600 text-white'
                                : 'bg-white border-slate-200 text-slate-900'
                            }`}
                          />
                        </div>

                        {/* Accepted Qty */}
                        <div className="col-span-4 md:col-span-2">
                          <label className={`block text-xs font-medium mb-1 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                            Accepted
                          </label>
                          <input
                            type="number"
                            value={item.acceptedQuantity}
                            onChange={(e) => updateItem(index, 'acceptedQuantity', parseInt(e.target.value) || 0)}
                            className={`w-full px-3 py-2 rounded-lg border text-center ${
                              theme === 'dark'
                                ? 'bg-slate-800 border-slate-600 text-emerald-400'
                                : 'bg-white border-slate-200 text-emerald-600'
                            }`}
                          />
                        </div>

                        {/* Remove Button */}
                        <div className="col-span-12 md:col-span-1 flex items-end justify-end">
                          <button
                            onClick={() => removeItem(index)}
                            className={`p-2 rounded-lg transition-colors ${
                              theme === 'dark' 
                                ? 'bg-red-500/10 text-red-400 hover:bg-red-500/20' 
                                : 'bg-red-50 text-red-500 hover:bg-red-100'
                            }`}
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </div>
                      </div>

                      {/* Row 2: Pricing and Discount */}
                      <div className={`grid grid-cols-12 gap-4 pt-4 border-t ${
                        theme === 'dark' ? 'border-slate-700' : 'border-slate-200'
                      }`}>
                        {/* Original Price */}
                        <div className="col-span-6 md:col-span-2">
                          <label className={`block text-xs font-medium mb-1 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                            <DollarSign className="w-3 h-3 inline mr-1" />
                            Original Price
                          </label>
                          <input
                            type="number"
                            value={item.originalUnitPrice || item.unitPrice}
                            onChange={(e) => updateItem(index, 'originalUnitPrice', parseFloat(e.target.value) || 0)}
                            className={`w-full px-3 py-2 rounded-lg border text-center ${
                              theme === 'dark'
                                ? 'bg-slate-800 border-slate-600 text-white'
                                : 'bg-white border-slate-200 text-slate-900'
                            }`}
                          />
                        </div>

                        {/* Discount Type */}
                        <div className="col-span-6 md:col-span-2">
                          <label className={`block text-xs font-medium mb-1 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                            <Tag className="w-3 h-3 inline mr-1" />
                            Discount Type
                          </label>
                          <div className={`flex rounded-lg overflow-hidden border h-[42px] ${
                            theme === 'dark' ? 'border-slate-600' : 'border-slate-200'
                          }`}>
                            <button
                              type="button"
                              onClick={() => updateItem(index, 'discountType', 'fixed')}
                              className={`flex-1 flex items-center justify-center text-sm font-medium transition-all ${
                                (item.discountType || 'fixed') === 'fixed'
                                  ? 'bg-emerald-500 text-white'
                                  : theme === 'dark' 
                                    ? 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                                    : 'bg-white text-slate-600 hover:bg-slate-50'
                              }`}
                            >
                              Rs.
                            </button>
                            <button
                              type="button"
                              onClick={() => updateItem(index, 'discountType', 'percentage')}
                              className={`flex-1 flex items-center justify-center text-sm font-medium transition-all ${
                                item.discountType === 'percentage'
                                  ? 'bg-emerald-500 text-white'
                                  : theme === 'dark' 
                                    ? 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                                    : 'bg-white text-slate-600 hover:bg-slate-50'
                              }`}
                            >
                              %
                            </button>
                          </div>
                        </div>

                        {/* Discount Value */}
                        <div className="col-span-6 md:col-span-2">
                          <label className={`block text-xs font-medium mb-1 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                            Discount {item.discountType === 'percentage' ? '(%)' : '(Rs.)'}
                          </label>
                          <input
                            type="number"
                            value={item.discountValue || 0}
                            onChange={(e) => updateItem(index, 'discountValue', parseFloat(e.target.value) || 0)}
                            className={`w-full px-3 py-2 rounded-lg border text-center ${
                              theme === 'dark'
                                ? 'bg-slate-800 border-slate-600 text-amber-400'
                                : 'bg-white border-slate-200 text-amber-600'
                            }`}
                          />
                        </div>

                        {/* Final Unit Price (Read-only) */}
                        <div className="col-span-6 md:col-span-2">
                          <label className={`block text-xs font-medium mb-1 ${theme === 'dark' ? 'text-emerald-400' : 'text-emerald-600'}`}>
                            Final Price
                          </label>
                          <div className={`w-full px-3 py-2 rounded-lg border text-center font-semibold ${
                            theme === 'dark'
                              ? 'bg-emerald-900/30 border-emerald-500/30 text-emerald-400'
                              : 'bg-emerald-50 border-emerald-200 text-emerald-600'
                          }`}>
                            Rs.{item.unitPrice.toLocaleString()}
                          </div>
                        </div>

                        {/* Total Amount */}
                        <div className="col-span-6 md:col-span-2">
                          <label className={`block text-xs font-medium mb-1 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                            Total
                          </label>
                          <div className={`w-full px-3 py-2 rounded-lg border text-center font-bold ${
                            theme === 'dark'
                              ? 'bg-slate-800/50 border-slate-600 text-white'
                              : 'bg-slate-100 border-slate-200 text-slate-900'
                          }`}>
                            Rs.{item.totalAmount.toLocaleString()}
                          </div>
                        </div>

                        {/* Discount Savings Badge */}
                        <div className="col-span-6 md:col-span-2 flex items-end">
                          {(item.discountValue || 0) > 0 && (
                            <div className={`w-full px-3 py-2 rounded-lg text-center text-xs font-medium ${
                              theme === 'dark'
                                ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                                : 'bg-amber-50 text-amber-600 border border-amber-200'
                            }`}>
                              💰 Save Rs.{(((item.originalUnitPrice || item.unitPrice) - item.unitPrice) * item.acceptedQuantity).toLocaleString()}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Totals Summary */}
              {items.length > 0 && (
                <div className={`p-4 rounded-xl border ${
                  theme === 'dark' 
                    ? 'bg-gradient-to-r from-emerald-900/30 to-teal-900/30 border-emerald-500/30' 
                    : 'bg-gradient-to-r from-emerald-50 to-teal-50 border-emerald-200'
                }`}>
                  <div className="grid grid-cols-2 md:grid-cols-6 gap-4 text-center">
                    <div>
                      <p className={`text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>Total Ordered</p>
                      <p className={`text-xl font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>{totals.orderedQuantity}</p>
                    </div>
                    <div>
                      <p className={`text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>Total Received</p>
                      <p className={`text-xl font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>{totals.receivedQuantity}</p>
                    </div>
                    <div>
                      <p className={`text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>Accepted</p>
                      <p className="text-xl font-bold text-emerald-500">{totals.acceptedQuantity}</p>
                    </div>
                    <div>
                      <p className={`text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>Rejected</p>
                      <p className="text-xl font-bold text-red-500">{totals.rejectedQuantity}</p>
                    </div>
                    <div>
                      <p className={`text-xs ${theme === 'dark' ? 'text-amber-400' : 'text-amber-600'}`}>
                        <Tag className="w-3 h-3 inline mr-1" />
                        Total Discount
                      </p>
                      <p className="text-xl font-bold text-amber-500">
                        Rs.{totals.totalDiscount.toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <p className={`text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>Total Value</p>
                      <p className={`text-xl font-bold ${theme === 'dark' ? 'text-emerald-400' : 'text-emerald-600'}`}>
                        Rs.{totals.totalAmount.toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className={`px-6 py-4 border-t flex justify-between items-center ${
          theme === 'dark' ? 'border-slate-700 bg-slate-800/50' : 'border-slate-200 bg-slate-50'
        }`}>
          <div className={`flex items-center gap-4 text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
            {totals.totalDiscount > 0 && (
              <span>
                <Tag className="w-4 h-4 inline mr-1 text-amber-500" />
                Discount: <span className="font-bold text-amber-500">Rs. {totals.totalDiscount.toLocaleString()}</span>
              </span>
            )}
            <span>
              <DollarSign className="w-4 h-4 inline mr-1" />
              Total: <span className="font-bold text-lg text-emerald-500">Rs. {totals.totalAmount.toLocaleString()}</span>
            </span>
          </div>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className={`px-6 py-2.5 rounded-xl font-medium transition-colors ${
                theme === 'dark'
                  ? 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                  : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
              }`}
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={!formData.supplierId}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl font-medium bg-gradient-to-r from-emerald-500 to-teal-500 text-white hover:from-emerald-600 hover:to-teal-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-emerald-500/25"
            >
              <Save className="w-4 h-4" />
              {isEditing ? 'Update GRN' : 'Create GRN'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
