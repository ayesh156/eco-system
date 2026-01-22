import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../contexts/ThemeContext';
import { mockSuppliers, mockProducts, mockGRNs } from '../data/mockData';
import type { Supplier, Product, GoodsReceivedNote, GRNItem, GRNStatus } from '../data/mockData';
import PrintableGRN from '../components/PrintableGRN';
import {
  ClipboardCheck, Truck, Package, CheckCircle, ChevronRight, ChevronLeft,
  Search, Plus, Trash2, ArrowLeft, Calendar,
  Building2, Receipt, Printer, X, Minus, GripVertical, FileText, Hash,
  CreditCard, Banknote, Wallet, Tag
} from 'lucide-react';

type Step = 1 | 2 | 3;

export const CreateGRN: React.FC = () => {
  const { theme } = useTheme();
  const navigate = useNavigate();
  const printRef = useRef<HTMLDivElement>(null);
  
  const [suppliers] = useState<Supplier[]>(mockSuppliers);
  const [products] = useState<Product[]>(mockProducts);
  
  const [step, setStep] = useState<Step>(1);
  const [selectedSupplier, setSelectedSupplier] = useState<string>('');
  const [supplierSearch, setSupplierSearch] = useState('');
  const [productSearch, setProductSearch] = useState('');
  const [items, setItems] = useState<GRNItem[]>([]);
  
  // GRN Details
  const [orderDate, setOrderDate] = useState(new Date().toISOString().split('T')[0]);
  const [expectedDeliveryDate] = useState('');
  const [receivedDate, setReceivedDate] = useState(new Date().toISOString().split('T')[0]);
  const [receivedBy, setReceivedBy] = useState('');
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [notes] = useState('');

  // Payment & Discount state
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'bank' | 'card' | 'credit' | 'cheque'>('cash');
  const [paymentStatus, setPaymentStatus] = useState<'paid' | 'unpaid' | 'partial'>('unpaid');
  const [paidAmount, setPaidAmount] = useState<number>(0);
  const [overallDiscountType, setOverallDiscountType] = useState<'percentage' | 'fixed'>('fixed');
  const [overallDiscountValue, setOverallDiscountValue] = useState<number>(0);

  // Editing item state
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editingPrice, setEditingPrice] = useState<number>(0);
  const priceInputRef = useRef<HTMLInputElement>(null);

  // Focus input when editing starts
  useEffect(() => {
    if (editingItemId && priceInputRef.current) {
      priceInputRef.current.focus();
      priceInputRef.current.select();
    }
  }, [editingItemId]);

  // Resizable panels state
  const [leftPanelWidth, setLeftPanelWidth] = useState(55);
  const [isResizing, setIsResizing] = useState(false);
  const mainContainerRef = useRef<HTMLDivElement>(null);

  // Print state
  const [showPrintPreview, setShowPrintPreview] = useState(false);
  const [createdGRN, setCreatedGRN] = useState<GoodsReceivedNote | null>(null);

  // Calendar popup state
  const [showOrderCalendar, setShowOrderCalendar] = useState(false);
  const [showReceivedCalendar, setShowReceivedCalendar] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState(new Date());

  // Refs for focus management
  const supplierSearchRef = useRef<HTMLInputElement>(null);
  const productSearchRef = useRef<HTMLInputElement>(null);

  // Generate 8-digit delivery note number
  const generateDeliveryNote = () => {
    return String(Math.floor(10000000 + Math.random() * 90000000));
  };

  const [deliveryNote, setDeliveryNote] = useState(generateDeliveryNote());

  // Handle resizing
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
  }, []);
  
  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isResizing || !mainContainerRef.current) return;
    const containerRect = mainContainerRef.current.getBoundingClientRect();
    const newWidth = ((e.clientX - containerRect.left) / containerRect.width) * 100;
    setLeftPanelWidth(Math.min(Math.max(newWidth, 30), 70));
  }, [isResizing]);
  
  const handleMouseUp = useCallback(() => {
    setIsResizing(false);
  }, []);
  
  useEffect(() => {
    if (isResizing) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isResizing, handleMouseMove, handleMouseUp]);

  const currentSupplier = suppliers.find((s) => s.id === selectedSupplier);

  // Filter suppliers by search
  const filteredSuppliers = useMemo(() => {
    if (!supplierSearch.trim()) return suppliers;
    const searchLower = supplierSearch.toLowerCase();
    return suppliers.filter(
      (s) =>
        s.company.toLowerCase().includes(searchLower) ||
        s.email.toLowerCase().includes(searchLower) ||
        s.phone.includes(searchLower)
    );
  }, [suppliers, supplierSearch]);

  // Filter products by search
  const filteredProducts = useMemo(() => {
    let filtered = products;
    
    if (productSearch.trim()) {
      const searchLower = productSearch.toLowerCase();
      filtered = products.filter(
        (p) =>
          p.name.toLowerCase().includes(searchLower) ||
          p.serialNumber.toLowerCase().includes(searchLower) ||
          (p.barcode && p.barcode.toLowerCase().includes(searchLower)) ||
          p.category.toLowerCase().includes(searchLower) ||
          p.brand.toLowerCase().includes(searchLower)
      );
    }
    
    return filtered.sort((a, b) => a.name.localeCompare(b.name));
  }, [products, productSearch]);

  const addItem = (product: Product) => {
    const existingItem = items.find((i) => i.productId === product.id);
    if (existingItem) {
      setItems(
        items.map((i) =>
          i.productId === existingItem.productId
            ? { 
                ...i, 
                orderedQuantity: i.orderedQuantity + 1,
                receivedQuantity: i.receivedQuantity + 1,
                acceptedQuantity: i.acceptedQuantity + 1,
                totalAmount: (i.acceptedQuantity + 1) * i.unitPrice
              }
            : i
        )
      );
    } else {
      const costPrice = product.costPrice || product.price;
      const sellingPrice = product.sellingPrice || product.price;
      const newItem: GRNItem = {
        id: `grn-item-${Date.now()}`,
        productId: product.id,
        productName: product.name,
        category: product.category,
        orderedQuantity: 1,
        receivedQuantity: 1,
        acceptedQuantity: 1,
        rejectedQuantity: 0,
        unitPrice: costPrice,
        originalUnitPrice: costPrice,
        discountType: 'fixed',
        discountValue: 0,
        sellingPrice: sellingPrice,
        totalAmount: costPrice,
        status: 'accepted',
      };
      setItems([...items, newItem]);
    }
  };

  const updateItemQuantity = (productId: string, field: 'orderedQuantity' | 'receivedQuantity' | 'acceptedQuantity', newQuantity: number) => {
    if (newQuantity < 0) return;
    
    setItems(items.map(item => {
      if (item.productId === productId) {
        const updated = { ...item, [field]: newQuantity };
        
        // Update rejected based on received - accepted
        if (field === 'acceptedQuantity' || field === 'receivedQuantity') {
          updated.rejectedQuantity = Math.max(0, updated.receivedQuantity - updated.acceptedQuantity);
        }
        
        // Update total amount
        updated.totalAmount = updated.acceptedQuantity * updated.unitPrice;
        
        // Update status
        if (updated.acceptedQuantity === updated.orderedQuantity) {
          updated.status = 'accepted';
        } else if (updated.rejectedQuantity === updated.orderedQuantity) {
          updated.status = 'rejected';
        } else if (updated.acceptedQuantity > 0 || updated.rejectedQuantity > 0) {
          updated.status = 'partial';
        } else {
          updated.status = 'pending';
        }
        
        return updated;
      }
      return item;
    }));
  };

  const removeItem = (productId: string) => {
    setItems(items.filter((i) => i.productId !== productId));
  };

  // Calculations
  const totals = useMemo(() => {
    const itemTotals = items.reduce((acc, item) => ({
      orderedQuantity: acc.orderedQuantity + item.orderedQuantity,
      receivedQuantity: acc.receivedQuantity + item.receivedQuantity,
      acceptedQuantity: acc.acceptedQuantity + item.acceptedQuantity,
      rejectedQuantity: acc.rejectedQuantity + item.rejectedQuantity,
      totalAmount: acc.totalAmount + item.totalAmount,
      itemDiscountTotal: acc.itemDiscountTotal + (
        (item.originalUnitPrice || item.unitPrice) - item.unitPrice
      ) * item.acceptedQuantity,
    }), {
      orderedQuantity: 0,
      receivedQuantity: 0,
      acceptedQuantity: 0,
      rejectedQuantity: 0,
      totalAmount: 0,
      itemDiscountTotal: 0,
    });
    
    // Calculate overall discount
    let overallDiscount = 0;
    if (overallDiscountType === 'percentage') {
      overallDiscount = (itemTotals.totalAmount * overallDiscountValue) / 100;
    } else {
      overallDiscount = overallDiscountValue;
    }
    
    const finalAmount = Math.max(0, itemTotals.totalAmount - overallDiscount);
    
    return {
      ...itemTotals,
      overallDiscount,
      finalAmount,
    };
  }, [items, overallDiscountType, overallDiscountValue]);

  // Generate GRN number
  const generateGRNNumber = () => {
    const year = new Date().getFullYear();
    const random = String(Math.floor(1000 + Math.random() * 9000));
    return `GRN-${year}-${random}`;
  };

  const handleCreateGRN = () => {
    if (!selectedSupplier || items.length === 0) return;

    const now = new Date().toISOString();
    
    // Determine status based on items
    let status: GRNStatus = 'completed';
    const hasRejected = items.some(i => i.rejectedQuantity > 0);
    const hasPartial = items.some(i => i.acceptedQuantity < i.orderedQuantity && i.acceptedQuantity > 0);
    const allRejected = items.every(i => i.status === 'rejected');
    
    if (allRejected) {
      status = 'rejected';
    } else if (hasRejected || hasPartial) {
      status = 'partial';
    }

    const grnNumber = generateGRNNumber();
    const grn: GoodsReceivedNote = {
      id: `grn-${Date.now()}`,
      grnNumber,
      supplierId: selectedSupplier,
      supplierName: currentSupplier?.company || '',
      orderDate,
      expectedDeliveryDate,
      receivedDate,
      items,
      totalOrderedQuantity: totals.orderedQuantity,
      totalReceivedQuantity: totals.receivedQuantity,
      totalAcceptedQuantity: totals.acceptedQuantity,
      totalRejectedQuantity: totals.rejectedQuantity,
      subtotal: totals.totalAmount,
      discountAmount: totals.overallDiscount,
      totalDiscount: totals.itemDiscountTotal + totals.overallDiscount,
      taxAmount: 0,
      totalAmount: totals.finalAmount,
      status,
      receivedBy,
      deliveryNote,
      vehicleNumber,
      notes,
      paymentMethod,
      paymentStatus,
      paidAmount: paymentStatus === 'paid' ? totals.finalAmount : paidAmount,
      createdAt: now,
      updatedAt: now,
    };

    // Add to mockGRNs
    mockGRNs.unshift(grn);
    
    // Update product stock and cost prices based on accepted items
    items.forEach(item => {
      if (item.acceptedQuantity > 0) {
        const productIndex = mockProducts.findIndex(p => p.id === item.productId);
        if (productIndex !== -1) {
          const product = mockProducts[productIndex];
          
          // Update stock
          product.stock = (product.stock || 0) + item.acceptedQuantity;
          
          // Update cost price (use GRN unit price as new cost)
          product.lastCostPrice = product.costPrice;
          product.costPrice = item.unitPrice;
          
          // Update selling price if set in GRN
          if (item.sellingPrice) {
            product.sellingPrice = item.sellingPrice;
            product.price = item.sellingPrice;
          }
          
          // Update profit margin
          const sellingPrice = item.sellingPrice || product.sellingPrice || product.price;
          product.profitMargin = ((sellingPrice - item.unitPrice) / sellingPrice) * 100;
          
          // Update tracking fields
          product.lastGRNId = grn.id;
          product.lastGRNDate = receivedDate;
          product.totalPurchased = (product.totalPurchased || 0) + item.acceptedQuantity;
          product.updatedAt = now;
        }
      }
    });
    
    // Show print preview
    setCreatedGRN(grn);
    setShowPrintPreview(true);
  };

  const handlePrint = () => {
    window.print();
  };

  const handleClosePrintAndNavigate = () => {
    setShowPrintPreview(false);
    navigate('/grn');
  };

  const canProceedToStep2 = selectedSupplier !== '';
  const canCreate = items.length > 0;

  // Focus search on step changes
  useEffect(() => {
    if (step === 1) {
      setTimeout(() => supplierSearchRef.current?.focus(), 100);
    }
    if (step === 2) {
      setTimeout(() => productSearchRef.current?.focus(), 100);
    }
  }, [step]);

  // Get supplier for print
  const printSupplier = useMemo(() => {
    if (!createdGRN) return null;
    return suppliers.find(s => s.id === createdGRN.supplierId) || null;
  }, [createdGRN, suppliers]);

  // Calendar helpers
  const getDaysInMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  const formatMonthYear = (date: Date) => {
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  };

  const handleDateSelect = (day: number, setter: (date: string) => void, closeSetter: (show: boolean) => void) => {
    const newDate = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth(), day);
    setter(newDate.toISOString().split('T')[0]);
    closeSetter(false);
  };

  const renderCalendar = (
    selectedDate: string, 
    setter: (date: string) => void, 
    closeSetter: (show: boolean) => void
  ) => {
    const daysInMonth = getDaysInMonth(calendarMonth);
    const firstDay = getFirstDayOfMonth(calendarMonth);
    const days = [];
    const weekDays = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

    for (let i = 0; i < firstDay; i++) {
      days.push(<div key={`empty-${i}`} className="w-8 h-8" />);
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth(), day).toISOString().split('T')[0];
      const isSelected = dateStr === selectedDate;
      const isToday = dateStr === new Date().toISOString().split('T')[0];

      days.push(
        <button
          key={day}
          onClick={() => handleDateSelect(day, setter, closeSetter)}
          className={`w-8 h-8 rounded-full text-sm font-medium transition-all ${
            isSelected
              ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-lg'
              : isToday
              ? theme === 'dark'
                ? 'bg-emerald-500/20 text-emerald-400 ring-2 ring-emerald-500/50'
                : 'bg-emerald-100 text-emerald-600 ring-2 ring-emerald-300'
              : theme === 'dark'
              ? 'hover:bg-slate-600 text-slate-300'
              : 'hover:bg-emerald-50 text-slate-700'
          }`}
        >
          {day}
        </button>
      );
    }

    return (
      <div className={`absolute z-50 bottom-full mb-2 p-4 rounded-2xl shadow-2xl border ${
        theme === 'dark' 
          ? 'bg-slate-800 border-slate-700' 
          : 'bg-white border-emerald-100'
      }`}>
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() - 1))}
            className={`p-1.5 rounded-lg transition-colors ${
              theme === 'dark' ? 'hover:bg-slate-700 text-slate-400' : 'hover:bg-emerald-50 text-slate-600'
            }`}
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className={`font-semibold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
            {formatMonthYear(calendarMonth)}
          </span>
          <button
            onClick={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1))}
            className={`p-1.5 rounded-lg transition-colors ${
              theme === 'dark' ? 'hover:bg-slate-700 text-slate-400' : 'hover:bg-emerald-50 text-slate-600'
            }`}
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-7 gap-1 mb-2">
          {weekDays.map(day => (
            <div key={day} className={`w-8 h-8 flex items-center justify-center text-xs font-medium ${
              theme === 'dark' ? 'text-emerald-400' : 'text-emerald-600'
            }`}>
              {day}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1">
          {days}
        </div>

        <div className={`mt-3 pt-3 border-t flex gap-2 ${theme === 'dark' ? 'border-slate-700' : 'border-slate-200'}`}>
          <button
            onClick={() => {
              setter(new Date().toISOString().split('T')[0]);
              closeSetter(false);
            }}
            className={`flex-1 py-1.5 text-xs font-medium rounded-lg ${
              theme === 'dark' 
                ? 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30' 
                : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100'
            }`}
          >
            Today
          </button>
          <button
            onClick={() => closeSetter(false)}
            className={`flex-1 py-1.5 text-xs font-medium rounded-lg ${
              theme === 'dark' 
                ? 'bg-slate-700 text-slate-300 hover:bg-slate-600' 
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Close
          </button>
        </div>
      </div>
    );
  };

  const formatDisplayDate = (dateStr: string) => {
    if (!dateStr) return 'Select Date';
    return new Date(dateStr).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  // Themed input class
  const inputClass = `w-full px-3 py-2.5 text-sm border-2 rounded-xl focus:outline-none transition-all ${
    theme === 'dark'
      ? 'border-slate-600 bg-slate-700/50 text-white placeholder-slate-500 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20'
      : 'border-slate-200 bg-white text-slate-900 placeholder-slate-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20'
  }`;

  // Print Preview Modal
  if (showPrintPreview && createdGRN) {
    return (
      <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
        <div className={`w-full max-w-4xl max-h-[95vh] overflow-hidden rounded-2xl ${
          theme === 'dark' ? 'bg-slate-900' : 'bg-white'
        }`}>
          {/* Modal Header */}
          <div className={`flex items-center justify-between px-6 py-4 border-b ${
            theme === 'dark' ? 'border-slate-700' : 'border-slate-200'
          }`}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-emerald-500/20 rounded-xl flex items-center justify-center">
                <ClipboardCheck className="w-5 h-5 text-emerald-500" />
              </div>
              <div>
                <h2 className={`text-lg font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                  GRN Created Successfully!
                </h2>
                <p className={`text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                  {createdGRN.grnNumber}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handlePrint}
                className="flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg font-medium transition-colors"
              >
                <Printer className="w-4 h-4" />
                Print
              </button>
              <button
                onClick={handleClosePrintAndNavigate}
                className={`p-2 rounded-lg transition-colors ${
                  theme === 'dark' ? 'hover:bg-slate-800 text-slate-400' : 'hover:bg-slate-100 text-slate-600'
                }`}
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
          
          {/* Print Preview */}
          <div className="overflow-auto max-h-[calc(95vh-80px)] bg-gray-100 p-4">
            <div ref={printRef} className="print-area">
              <PrintableGRN grn={createdGRN} supplier={printSupplier} />
            </div>
          </div>
        </div>

        {/* Print Styles */}
        <style>{`
          @media print {
            body * { visibility: hidden; }
            .print-area, .print-area * { visibility: visible; }
            .print-area { position: absolute; left: 0; top: 0; }
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-120px)] flex flex-col">
      {/* Compact Header with Steps */}
      <div className={`flex items-center gap-4 p-3 rounded-xl mb-3 ${
        theme === 'dark' ? 'bg-slate-800/50' : 'bg-white shadow-sm'
      }`}>
        <button
          onClick={() => navigate('/grn')}
          className={`p-2 rounded-xl transition-colors ${
            theme === 'dark' ? 'hover:bg-slate-700 text-slate-400' : 'hover:bg-slate-100 text-slate-600'
          }`}
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        
        <div className="flex items-center gap-2">
          <ClipboardCheck className="w-5 h-5 text-emerald-500" />
          <span className={`font-semibold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
            New GRN
          </span>
        </div>

        {/* Inline Step Indicator */}
        <div className="flex items-center gap-1 ml-auto">
          {[1, 2, 3].map((s) => (
            <React.Fragment key={s}>
              <button
                onClick={() => {
                  if (s === 1) setStep(1);
                  else if (s === 2 && canProceedToStep2) setStep(2);
                  else if (s === 3 && items.length > 0) setStep(3);
                }}
                disabled={(s === 2 && !canProceedToStep2) || (s === 3 && items.length === 0)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-medium transition-all ${
                  s === step
                    ? 'bg-emerald-500 text-white'
                    : s < step
                    ? 'bg-emerald-500/20 text-emerald-500'
                    : theme === 'dark' 
                      ? 'bg-slate-700 text-slate-400 disabled:opacity-50' 
                      : 'bg-slate-100 text-slate-500 disabled:opacity-50'
                }`}
              >
                {s < step ? <CheckCircle className="w-3.5 h-3.5" /> : (
                  s === 1 ? <Truck className="w-3.5 h-3.5" /> :
                  s === 2 ? <Package className="w-3.5 h-3.5" /> :
                  <Wallet className="w-3.5 h-3.5" />
                )}
                <span className="hidden sm:inline">
                  {s === 1 ? 'Supplier' : s === 2 ? 'Products' : 'Payment'}
                </span>
              </button>
              {s < 3 && (
                <ChevronRight className={`w-4 h-4 ${theme === 'dark' ? 'text-slate-600' : 'text-slate-300'}`} />
              )}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* Main Content - Split Panel Layout */}
      <div 
        ref={mainContainerRef}
        className={`flex-1 flex min-h-0 ${isResizing ? 'select-none' : ''}`}
      >
        {/* Left Panel - Main Content */}
        <div 
          className={`rounded-xl overflow-hidden flex flex-col ${
            theme === 'dark' ? 'bg-slate-800/50' : 'bg-white shadow-sm'
          }`}
          style={{ width: `${leftPanelWidth}%` }}
        >
          {/* Step 1: Supplier & Details */}
          {step === 1 && (
            <div className="flex-1 flex flex-col p-4 overflow-hidden">
              <div className="flex items-center gap-2 mb-3">
                <Truck className="w-5 h-5 text-emerald-500" />
                <span className={`font-semibold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                  Select Supplier
                </span>
              </div>

              {/* Supplier Search */}
              <div className="relative mb-3">
                <Search className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                <input
                  ref={supplierSearchRef}
                  type="text"
                  placeholder="Search suppliers..."
                  value={supplierSearch}
                  onChange={(e) => setSupplierSearch(e.target.value)}
                  className={`${inputClass} pl-9`}
                />
              </div>

              {/* Supplier List */}
              <div className="flex-1 overflow-y-auto space-y-2 pr-1 mb-4">
                {filteredSuppliers.map((supplier) => (
                  <button
                    key={supplier.id}
                    onClick={() => setSelectedSupplier(supplier.id)}
                    className={`w-full p-3 rounded-xl text-left transition-all flex items-center gap-3 ${
                      selectedSupplier === supplier.id
                        ? 'bg-emerald-500/20 border-2 border-emerald-500'
                        : theme === 'dark' 
                          ? 'bg-slate-700/50 hover:bg-slate-700 border-2 border-transparent' 
                          : 'bg-slate-50 hover:bg-slate-100 border-2 border-transparent'
                    }`}
                  >
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center font-bold ${
                      theme === 'dark' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-emerald-100 text-emerald-600'
                    }`}>
                      {supplier.company.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`font-medium truncate ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                        {supplier.company}
                      </p>
                      <p className={`text-xs truncate ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                        {supplier.phone} • {supplier.email}
                      </p>
                    </div>
                    {selectedSupplier === supplier.id && (
                      <CheckCircle className="w-5 h-5 text-emerald-500" />
                    )}
                  </button>
                ))}
              </div>

              {/* GRN Details Form */}
              {selectedSupplier && (
                <div className={`p-4 rounded-xl border ${
                  theme === 'dark' ? 'bg-slate-700/30 border-slate-600' : 'bg-slate-50 border-slate-200'
                }`}>
                  <h4 className={`font-semibold mb-3 flex items-center gap-2 ${
                    theme === 'dark' ? 'text-white' : 'text-slate-900'
                  }`}>
                    <FileText className="w-4 h-4 text-emerald-500" />
                    GRN Details
                  </h4>
                  
                  <div className="grid grid-cols-2 gap-3">
                    {/* Delivery Note */}
                    <div>
                      <label className={`block text-xs font-medium mb-1 ${
                        theme === 'dark' ? 'text-slate-400' : 'text-slate-600'
                      }`}>
                        Delivery Note No. (8 digits)
                      </label>
                      <div className="relative">
                        <Hash className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                        <input
                          type="text"
                          value={deliveryNote}
                          onChange={(e) => {
                            const val = e.target.value.replace(/\D/g, '').slice(0, 8);
                            setDeliveryNote(val);
                          }}
                          maxLength={8}
                          className={`${inputClass} pl-9`}
                          placeholder="12345678"
                        />
                      </div>
                    </div>

                    {/* Vehicle Number */}
                    <div>
                      <label className={`block text-xs font-medium mb-1 ${
                        theme === 'dark' ? 'text-slate-400' : 'text-slate-600'
                      }`}>
                        Vehicle Number
                      </label>
                      <input
                        type="text"
                        value={vehicleNumber}
                        onChange={(e) => setVehicleNumber(e.target.value)}
                        className={inputClass}
                        placeholder="WP XXX-1234"
                      />
                    </div>

                    {/* Order Date */}
                    <div className="relative">
                      <label className={`block text-xs font-medium mb-1 ${
                        theme === 'dark' ? 'text-slate-400' : 'text-slate-600'
                      }`}>
                        Order Date
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          setShowOrderCalendar(!showOrderCalendar);
                          setShowReceivedCalendar(false);
                          setCalendarMonth(orderDate ? new Date(orderDate) : new Date());
                        }}
                        className={`${inputClass} text-left flex items-center gap-2`}
                      >
                        <Calendar className="w-4 h-4 text-slate-400" />
                        {formatDisplayDate(orderDate)}
                      </button>
                      {showOrderCalendar && renderCalendar(orderDate, setOrderDate, setShowOrderCalendar)}
                    </div>

                    {/* Received Date */}
                    <div className="relative">
                      <label className={`block text-xs font-medium mb-1 ${
                        theme === 'dark' ? 'text-slate-400' : 'text-slate-600'
                      }`}>
                        Received Date
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          setShowReceivedCalendar(!showReceivedCalendar);
                          setShowOrderCalendar(false);
                          setCalendarMonth(receivedDate ? new Date(receivedDate) : new Date());
                        }}
                        className={`${inputClass} text-left flex items-center gap-2`}
                      >
                        <Calendar className="w-4 h-4 text-slate-400" />
                        {formatDisplayDate(receivedDate)}
                      </button>
                      {showReceivedCalendar && renderCalendar(receivedDate, setReceivedDate, setShowReceivedCalendar)}
                    </div>

                    {/* Received By */}
                    <div className="col-span-2">
                      <label className={`block text-xs font-medium mb-1 ${
                        theme === 'dark' ? 'text-slate-400' : 'text-slate-600'
                      }`}>
                        Received By
                      </label>
                      <input
                        type="text"
                        value={receivedBy}
                        onChange={(e) => setReceivedBy(e.target.value)}
                        className={inputClass}
                        placeholder="Staff name"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Step 2: Products Selection */}
          {step === 2 && (
            <div className="flex-1 flex flex-col p-4 overflow-hidden">
              <div className="flex items-center gap-2 mb-3">
                <Package className="w-5 h-5 text-teal-500" />
                <span className={`font-semibold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                  Add Products
                </span>
              </div>

              {/* Product Search */}
              <div className="relative mb-3">
                <Search className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                <input
                  ref={productSearchRef}
                  type="text"
                  placeholder="Search products..."
                  value={productSearch}
                  onChange={(e) => setProductSearch(e.target.value)}
                  className={`${inputClass} pl-9`}
                />
              </div>

              {/* Product List */}
              <div className="flex-1 overflow-y-auto space-y-2 pr-1">
                {filteredProducts.map((product) => {
                  const isInCart = items.some(i => i.productId === product.id);
                  return (
                    <button
                      key={product.id}
                      onClick={() => addItem(product)}
                      className={`w-full p-3 rounded-xl text-left transition-all flex items-center gap-3 ${
                        isInCart
                          ? 'bg-emerald-500/20 border-2 border-emerald-500'
                          : theme === 'dark' 
                            ? 'bg-slate-700/50 hover:bg-slate-700 border-2 border-transparent' 
                            : 'bg-slate-50 hover:bg-slate-100 border-2 border-transparent'
                      }`}
                    >
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                        theme === 'dark' ? 'bg-teal-500/20 text-teal-400' : 'bg-teal-100 text-teal-600'
                      }`}>
                        <Package className="w-5 h-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`font-medium truncate ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                          {product.name}
                        </p>
                        <p className={`text-xs truncate ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                          {product.category} • {product.brand}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className={`font-bold ${theme === 'dark' ? 'text-emerald-400' : 'text-emerald-600'}`}>
                          Rs.{product.price.toLocaleString()}
                        </p>
                        {isInCart && (
                          <span className="text-xs text-emerald-500">In GRN</span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Step 3: Payment & Finalization */}
          {step === 3 && (
            <div className="flex-1 flex flex-col p-4 overflow-hidden">
              <div className="flex items-center gap-2 mb-4">
                <Wallet className="w-5 h-5 text-purple-500" />
                <span className={`font-semibold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                  Payment & Finalization
                </span>
              </div>

              <div className="space-y-4 overflow-y-auto">
                {/* Order Summary Card */}
                <div className={`p-4 rounded-xl ${
                  theme === 'dark' ? 'bg-slate-700/50' : 'bg-slate-50'
                }`}>
                  <h3 className={`text-sm font-medium mb-3 ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                    Order Summary
                  </h3>
                  <div className="grid grid-cols-4 gap-3 text-center">
                    <div className={`p-2 rounded-lg ${theme === 'dark' ? 'bg-slate-600/50' : 'bg-white'}`}>
                      <p className={`text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>Items</p>
                      <p className={`font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>{items.length}</p>
                    </div>
                    <div className={`p-2 rounded-lg ${theme === 'dark' ? 'bg-slate-600/50' : 'bg-white'}`}>
                      <p className={`text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>Ordered</p>
                      <p className={`font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>{totals.orderedQuantity}</p>
                    </div>
                    <div className={`p-2 rounded-lg ${theme === 'dark' ? 'bg-slate-600/50' : 'bg-white'}`}>
                      <p className={`text-xs ${theme === 'dark' ? 'text-emerald-400' : 'text-emerald-600'}`}>Accepted</p>
                      <p className="font-bold text-emerald-500">{totals.acceptedQuantity}</p>
                    </div>
                    <div className={`p-2 rounded-lg ${theme === 'dark' ? 'bg-slate-600/50' : 'bg-white'}`}>
                      <p className={`text-xs ${theme === 'dark' ? 'text-red-400' : 'text-red-500'}`}>Rejected</p>
                      <p className="font-bold text-red-500">{totals.rejectedQuantity}</p>
                    </div>
                  </div>
                </div>

                {/* Overall Discount */}
                <div className={`p-4 rounded-xl ${
                  theme === 'dark' ? 'bg-slate-700/50' : 'bg-slate-50'
                }`}>
                  <div className="flex items-center gap-2 mb-3">
                    <Tag className="w-4 h-4 text-orange-500" />
                    <span className={`text-sm font-medium ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                      Overall Discount
                    </span>
                  </div>
                  <div className="flex gap-2">
                    {/* Modern Toggle Buttons for Discount Type */}
                    <div className={`flex rounded-lg overflow-hidden ${
                      theme === 'dark' ? 'bg-slate-600' : 'bg-slate-200'
                    }`}>
                      <button
                        onClick={() => setOverallDiscountType('fixed')}
                        className={`px-3 py-2 text-xs font-medium transition-all ${
                          overallDiscountType === 'fixed'
                            ? 'bg-emerald-500 text-white'
                            : theme === 'dark' 
                              ? 'text-slate-300 hover:bg-slate-500' 
                              : 'text-slate-600 hover:bg-slate-300'
                        }`}
                      >
                        Rs.
                      </button>
                      <button
                        onClick={() => setOverallDiscountType('percentage')}
                        className={`px-3 py-2 text-xs font-medium transition-all ${
                          overallDiscountType === 'percentage'
                            ? 'bg-emerald-500 text-white'
                            : theme === 'dark' 
                              ? 'text-slate-300 hover:bg-slate-500' 
                              : 'text-slate-600 hover:bg-slate-300'
                        }`}
                      >
                        %
                      </button>
                    </div>
                    <div className="relative flex-1">
                      <span className={`absolute left-3 top-1/2 -translate-y-1/2 text-sm ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>
                        {overallDiscountType === 'percentage' ? '%' : 'Rs.'}
                      </span>
                      <input
                        type="number"
                        value={overallDiscountValue}
                        onChange={(e) => setOverallDiscountValue(parseFloat(e.target.value) || 0)}
                        className={`w-full pl-10 pr-3 py-2 text-sm rounded-lg ${
                          theme === 'dark' 
                            ? 'bg-slate-600 border-slate-500 text-white' 
                            : 'bg-white border-slate-200 text-slate-900'
                        } border focus:outline-none focus:ring-2 focus:ring-emerald-500`}
                        placeholder="0"
                      />
                    </div>
                  </div>
                  {totals.overallDiscount > 0 && (
                    <p className="text-xs text-orange-500 mt-2">
                      You save Rs.{totals.overallDiscount.toLocaleString()}
                    </p>
                  )}
                </div>

                {/* Payment Method */}
                <div className={`p-4 rounded-xl ${
                  theme === 'dark' ? 'bg-slate-700/50' : 'bg-slate-50'
                }`}>
                  <div className="flex items-center gap-2 mb-3">
                    <CreditCard className="w-4 h-4 text-blue-500" />
                    <span className={`text-sm font-medium ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                      Payment Method
                    </span>
                  </div>
                  <div className="grid grid-cols-5 gap-2">
                    {[
                      { value: 'cash' as const, label: 'Cash', icon: Banknote },
                      { value: 'bank' as const, label: 'Bank', icon: Building2 },
                      { value: 'card' as const, label: 'Card', icon: CreditCard },
                      { value: 'credit' as const, label: 'Credit', icon: Receipt },
                      { value: 'cheque' as const, label: 'Cheque', icon: FileText },
                    ].map(method => (
                      <button
                        key={method.value}
                        onClick={() => setPaymentMethod(method.value)}
                        className={`p-3 rounded-xl text-sm font-medium flex flex-col items-center gap-1 transition-all ${
                          paymentMethod === method.value
                            ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/25'
                            : theme === 'dark'
                              ? 'bg-slate-600 text-slate-300 hover:bg-slate-500'
                              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                        }`}
                      >
                        <method.icon className="w-5 h-5" />
                        {method.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Payment Status */}
                <div className={`p-4 rounded-xl ${
                  theme === 'dark' ? 'bg-slate-700/50' : 'bg-slate-50'
                }`}>
                  <div className="flex items-center gap-2 mb-3">
                    <Wallet className="w-4 h-4 text-purple-500" />
                    <span className={`text-sm font-medium ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                      Payment Status
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { value: 'paid' as const, label: 'Paid', color: 'emerald', icon: CheckCircle },
                      { value: 'partial' as const, label: 'Partial', color: 'amber', icon: Receipt },
                      { value: 'unpaid' as const, label: 'Unpaid', color: 'red', icon: X },
                    ].map(status => (
                      <button
                        key={status.value}
                        onClick={() => setPaymentStatus(status.value)}
                        className={`p-3 rounded-xl text-sm font-medium flex flex-col items-center gap-1 transition-all ${
                          paymentStatus === status.value
                            ? status.color === 'emerald' ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/25'
                              : status.color === 'amber' ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/25'
                              : 'bg-red-500 text-white shadow-lg shadow-red-500/25'
                            : theme === 'dark'
                              ? 'bg-slate-600 text-slate-300 hover:bg-slate-500'
                              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                        }`}
                      >
                        <status.icon className="w-5 h-5" />
                        {status.label}
                      </button>
                    ))}
                  </div>
                  
                  {/* Paid Amount for partial payments */}
                  {paymentStatus === 'partial' && (
                    <div className="mt-3">
                      <label className={`text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                        Paid Amount
                      </label>
                      <div className="relative mt-1">
                        <span className={`absolute left-3 top-1/2 -translate-y-1/2 text-sm ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>
                          Rs.
                        </span>
                        <input
                          type="number"
                          value={paidAmount}
                          onChange={(e) => setPaidAmount(parseFloat(e.target.value) || 0)}
                          max={totals.finalAmount}
                          className={`w-full pl-10 pr-3 py-2 text-sm rounded-lg ${
                            theme === 'dark' 
                              ? 'bg-slate-600 border-slate-500 text-white' 
                              : 'bg-white border-slate-200 text-slate-900'
                          } border focus:outline-none focus:ring-2 focus:ring-emerald-500`}
                        />
                      </div>
                      <p className="text-xs text-amber-500 mt-1">
                        Balance: Rs.{(totals.finalAmount - paidAmount).toLocaleString()}
                      </p>
                    </div>
                  )}
                </div>

                {/* Final Totals Summary */}
                <div className={`p-4 rounded-xl ${
                  theme === 'dark' ? 'bg-gradient-to-br from-emerald-900/50 to-teal-900/50' : 'bg-gradient-to-br from-emerald-50 to-teal-50'
                }`}>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className={theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}>Subtotal</span>
                      <span className={theme === 'dark' ? 'text-white' : 'text-slate-900'}>
                        Rs.{totals.totalAmount.toLocaleString()}
                      </span>
                    </div>
                    {totals.itemDiscountTotal > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-orange-500">Item Discounts</span>
                        <span className="text-orange-500">-Rs.{totals.itemDiscountTotal.toLocaleString()}</span>
                      </div>
                    )}
                    {totals.overallDiscount > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-orange-500">Overall Discount</span>
                        <span className="text-orange-500">-Rs.{totals.overallDiscount.toLocaleString()}</span>
                      </div>
                    )}
                    <div className={`flex justify-between items-center pt-2 border-t ${
                      theme === 'dark' ? 'border-slate-600' : 'border-emerald-200'
                    }`}>
                      <span className={`text-lg font-semibold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                        Final Total
                      </span>
                      <span className="text-2xl font-bold text-emerald-500">
                        Rs.{totals.finalAmount.toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Resizer */}
        <div
          className={`w-2 cursor-col-resize flex items-center justify-center group ${
            isResizing ? 'bg-emerald-500/20' : ''
          }`}
          onMouseDown={handleMouseDown}
        >
          <div className={`w-1 h-12 rounded-full transition-colors ${
            isResizing 
              ? 'bg-emerald-500' 
              : theme === 'dark' 
                ? 'bg-slate-700 group-hover:bg-emerald-500/50' 
                : 'bg-slate-200 group-hover:bg-emerald-500/50'
          }`}>
            <GripVertical className={`w-3 h-3 -ml-1 mt-4 ${
              theme === 'dark' ? 'text-slate-500' : 'text-slate-400'
            }`} />
          </div>
        </div>

        {/* Right Panel - Cart Summary */}
        <div 
          className={`rounded-xl overflow-hidden flex flex-col ${
            theme === 'dark' ? 'bg-slate-800/50' : 'bg-white shadow-sm'
          }`}
          style={{ width: `${100 - leftPanelWidth - 1}%` }}
        >
          <div className="p-4 flex-1 flex flex-col overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Receipt className="w-5 h-5 text-amber-500" />
                <span className={`font-semibold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                  GRN Summary
                </span>
              </div>
              <span className={`text-xs px-2 py-1 rounded-full ${
                theme === 'dark' ? 'bg-slate-700 text-slate-400' : 'bg-slate-100 text-slate-500'
              }`}>
                {items.length} items
              </span>
            </div>

            {/* Supplier Info */}
            {currentSupplier && (
              <div className={`p-3 rounded-xl mb-3 ${
                theme === 'dark' ? 'bg-slate-700/50' : 'bg-emerald-50'
              }`}>
                <div className="flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-emerald-500" />
                  <span className={`font-medium ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                    {currentSupplier.company}
                  </span>
                </div>
                <p className={`text-xs mt-1 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                  DN: {deliveryNote || 'Not set'}
                </p>
              </div>
            )}

            {/* Items List */}
            <div className="flex-1 overflow-y-auto space-y-2 mb-3">
              {items.length === 0 ? (
                <div className={`text-center py-8 ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>
                  <Package className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>No items added yet</p>
                  <p className="text-xs mt-1">Select products from the list</p>
                </div>
              ) : (
                items.map((item) => (
                  <div
                    key={item.productId}
                    className={`p-3 rounded-xl ${
                      theme === 'dark' ? 'bg-slate-700/50' : 'bg-slate-50'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1 min-w-0">
                        <p className={`font-medium text-sm truncate ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                          {item.productName}
                        </p>
                        {/* Inline Price Editor - Double-click to edit */}
                        <div className="flex items-center gap-2 mt-0.5">
                          {editingItemId === item.productId ? (
                            <div className="flex items-center gap-1">
                              <span className={`text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>Rs.</span>
                              <input
                                ref={priceInputRef}
                                type="number"
                                value={editingPrice}
                                onChange={(e) => setEditingPrice(parseFloat(e.target.value) || 0)}
                                onBlur={() => {
                                  if (editingPrice > 0) {
                                    const originalPrice = item.originalUnitPrice || item.unitPrice;
                                    const discount = originalPrice - editingPrice;
                                    setItems(prev => prev.map(i => 
                                      i.productId === item.productId
                                        ? {
                                            ...i,
                                            unitPrice: editingPrice,
                                            originalUnitPrice: originalPrice,
                                            discountType: 'fixed' as const,
                                            discountValue: discount > 0 ? discount : 0,
                                            totalAmount: i.acceptedQuantity * editingPrice
                                          }
                                        : i
                                    ));
                                  }
                                  setEditingItemId(null);
                                }}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    if (editingPrice > 0) {
                                      const originalPrice = item.originalUnitPrice || item.unitPrice;
                                      const discount = originalPrice - editingPrice;
                                      setItems(prev => prev.map(i => 
                                        i.productId === item.productId
                                          ? {
                                              ...i,
                                              unitPrice: editingPrice,
                                              originalUnitPrice: originalPrice,
                                              discountType: 'fixed' as const,
                                              discountValue: discount > 0 ? discount : 0,
                                              totalAmount: i.acceptedQuantity * editingPrice
                                            }
                                          : i
                                      ));
                                    }
                                    setEditingItemId(null);
                                  } else if (e.key === 'Escape') {
                                    setEditingItemId(null);
                                  }
                                }}
                                className={`w-24 px-2 py-0.5 text-xs rounded border ${
                                  theme === 'dark'
                                    ? 'border-emerald-500 bg-slate-700 text-white'
                                    : 'border-emerald-500 bg-white text-slate-900'
                                } focus:outline-none focus:ring-1 focus:ring-emerald-500`}
                              />
                            </div>
                          ) : (
                            <button
                              onDoubleClick={() => {
                                setEditingItemId(item.productId);
                                setEditingPrice(item.unitPrice);
                                setTimeout(() => priceInputRef.current?.focus(), 0);
                              }}
                              className={`flex items-center gap-1 px-1 py-0.5 -ml-1 rounded transition-colors cursor-pointer ${
                                theme === 'dark' ? 'hover:bg-slate-600' : 'hover:bg-slate-200'
                              }`}
                              title="Double-click to edit price"
                            >
                              {(item.discountValue || 0) > 0 ? (
                                <>
                                  <span className={`text-xs line-through ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>
                                    Rs.{(item.originalUnitPrice || item.unitPrice).toLocaleString()}
                                  </span>
                                  <span className={`text-xs font-semibold ${theme === 'dark' ? 'text-emerald-400' : 'text-emerald-600'}`}>
                                    Rs.{item.unitPrice.toLocaleString()}
                                  </span>
                                </>
                              ) : (
                                <span className={`text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                                  Rs.{item.unitPrice.toLocaleString()} each
                                </span>
                              )}
                              <Tag className={`w-3 h-3 ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`} />
                            </button>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => removeItem(item.productId)}
                          className={`p-1 rounded-lg transition-colors ${
                            theme === 'dark' ? 'hover:bg-red-500/20 text-red-400' : 'hover:bg-red-50 text-red-500'
                          }`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    
                    {/* Quantity Controls */}
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div>
                        <p className={`text-xs mb-1 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>Ordered</p>
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => updateItemQuantity(item.productId, 'orderedQuantity', item.orderedQuantity - 1)}
                            className={`p-1 rounded ${
                              theme === 'dark' ? 'bg-slate-600 hover:bg-slate-500' : 'bg-slate-200 hover:bg-slate-300'
                            }`}
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className={`w-8 text-sm font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                            {item.orderedQuantity}
                          </span>
                          <button
                            onClick={() => updateItemQuantity(item.productId, 'orderedQuantity', item.orderedQuantity + 1)}
                            className={`p-1 rounded ${
                              theme === 'dark' ? 'bg-slate-600 hover:bg-slate-500' : 'bg-slate-200 hover:bg-slate-300'
                            }`}
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                      <div>
                        <p className={`text-xs mb-1 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>Received</p>
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => updateItemQuantity(item.productId, 'receivedQuantity', item.receivedQuantity - 1)}
                            className={`p-1 rounded ${
                              theme === 'dark' ? 'bg-slate-600 hover:bg-slate-500' : 'bg-slate-200 hover:bg-slate-300'
                            }`}
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className={`w-8 text-sm font-bold ${theme === 'dark' ? 'text-blue-400' : 'text-blue-600'}`}>
                            {item.receivedQuantity}
                          </span>
                          <button
                            onClick={() => updateItemQuantity(item.productId, 'receivedQuantity', item.receivedQuantity + 1)}
                            className={`p-1 rounded ${
                              theme === 'dark' ? 'bg-slate-600 hover:bg-slate-500' : 'bg-slate-200 hover:bg-slate-300'
                            }`}
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                      <div>
                        <p className={`text-xs mb-1 ${theme === 'dark' ? 'text-emerald-400' : 'text-emerald-600'}`}>Accepted</p>
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => updateItemQuantity(item.productId, 'acceptedQuantity', item.acceptedQuantity - 1)}
                            className={`p-1 rounded ${
                              theme === 'dark' ? 'bg-emerald-600 hover:bg-emerald-500' : 'bg-emerald-200 hover:bg-emerald-300'
                            }`}
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className={`w-8 text-sm font-bold ${theme === 'dark' ? 'text-emerald-400' : 'text-emerald-600'}`}>
                            {item.acceptedQuantity}
                          </span>
                          <button
                            onClick={() => updateItemQuantity(item.productId, 'acceptedQuantity', item.acceptedQuantity + 1)}
                            className={`p-1 rounded ${
                              theme === 'dark' ? 'bg-emerald-600 hover:bg-emerald-500' : 'bg-emerald-200 hover:bg-emerald-300'
                            }`}
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    </div>
                    
                    {item.rejectedQuantity > 0 && (
                      <p className={`text-xs text-center mt-2 ${theme === 'dark' ? 'text-red-400' : 'text-red-500'}`}>
                        Rejected: {item.rejectedQuantity}
                      </p>
                    )}
                  </div>
                ))
              )}
            </div>

            {/* Totals - Subtotal only */}
            {items.length > 0 && (
              <div className={`p-3 rounded-xl ${
                theme === 'dark' ? 'bg-slate-700/50' : 'bg-slate-100'
              }`}>
                <div className="flex justify-between text-sm">
                  <span className={theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}>Subtotal</span>
                  <span className={`font-semibold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                    Rs.{totals.totalAmount.toLocaleString()}
                  </span>
                </div>
                {(totals.itemDiscountTotal > 0 || totals.overallDiscount > 0) && (
                  <div className="flex justify-between text-xs mt-1">
                    <span className="text-orange-500">Discounts Applied</span>
                    <span className="text-orange-500">-Rs.{(totals.itemDiscountTotal + totals.overallDiscount).toLocaleString()}</span>
                  </div>
                )}
              </div>
            )}

            {/* Actions */}
            <div className="mt-3 space-y-2">
              {step === 1 && canProceedToStep2 && (
                <button
                  onClick={() => setStep(2)}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-semibold bg-gradient-to-r from-emerald-500 to-teal-500 text-white hover:from-emerald-600 hover:to-teal-600 transition-all shadow-lg shadow-emerald-500/25"
                >
                  <Package className="w-5 h-5" />
                  Add Products
                  <ChevronRight className="w-5 h-5" />
                </button>
              )}
              
              {step === 2 && items.length > 0 && (
                <button
                  onClick={() => setStep(3)}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-semibold bg-gradient-to-r from-emerald-500 to-teal-500 text-white hover:from-emerald-600 hover:to-teal-600 transition-all shadow-lg shadow-emerald-500/25"
                >
                  <Wallet className="w-5 h-5" />
                  Payment & Finalize
                  <ChevronRight className="w-5 h-5" />
                </button>
              )}

              {step === 3 && (
                <>
                  <button
                    onClick={() => setStep(2)}
                    className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-xl font-medium ${
                      theme === 'dark'
                        ? 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    <ChevronLeft className="w-4 h-4" />
                    Back to Products
                  </button>
                  
                  <button
                    onClick={handleCreateGRN}
                    disabled={!canCreate}
                    className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-semibold bg-gradient-to-r from-emerald-500 to-teal-500 text-white hover:from-emerald-600 hover:to-teal-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-emerald-500/25"
                  >
                    <CheckCircle className="w-5 h-5" />
                    Create GRN
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreateGRN;
