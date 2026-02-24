import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import type { GoodsReceivedNote, GRNItem, Supplier, GRNStatus } from '../../data/mockData';
import { useTheme } from '../../contexts/ThemeContext';
import { useDataCache } from '../../contexts/DataCacheContext';
import {
  ChevronLeft, ChevronRight, Plus, Trash2, Search,
  Package, CheckCircle, Edit2, GripVertical,
  Truck, ClipboardCheck, Building2, User,
  Hash, StickyNote, Tag, Minus, ShoppingCart, X,
  Star, Loader2
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../ui/dialog';
import { DatePicker } from '../ui/date-picker';

// Extended GRN Item with editing state
interface ExtendedGRNItem extends GRNItem {
  isEditingPrice?: boolean;
}

interface GRNWizardModalProps {
  isOpen: boolean;
  grn?: GoodsReceivedNote;
  suppliers: Supplier[];
  onClose: () => void;
  onSave: (grn: GoodsReceivedNote) => void;
  isLoading?: boolean;
}

type Step = 1 | 2 | 3 | 4;

export const GRNWizardModal: React.FC<GRNWizardModalProps> = ({
  isOpen,
  grn,
  suppliers,
  onClose,
  onSave,
  isLoading = false,
}) => {
  const { theme } = useTheme();
  const { products, loadProducts, productsLoading } = useDataCache();
  const isEditing = !!grn;

  // Wizard step
  const [step, setStep] = useState<Step>(1);

  // Step 1: Supplier
  const [selectedSupplierId, setSelectedSupplierId] = useState<string>('');
  const [supplierSearch, setSupplierSearch] = useState('');

  // Step 2: Items
  const [items, setItems] = useState<ExtendedGRNItem[]>([]);
  const [productSearch, setProductSearch] = useState('');
  const [selectedProductId, setSelectedProductId] = useState('');
  const [orderedQty, setOrderedQty] = useState<number>(1);
  const [editingPriceId, setEditingPriceId] = useState<string | null>(null);
  const [editingPrice, setEditingPrice] = useState<number>(0);
  const [editingDiscountId, setEditingDiscountId] = useState<string | null>(null);
  const [editingDiscountType, setEditingDiscountType] = useState<'percentage' | 'fixed'>('fixed');
  const [editingDiscountValue, setEditingDiscountValue] = useState<number>(0);
  const priceInputRef = useRef<HTMLInputElement>(null);

  // Resizable panels - desktop
  const [leftPanelWidth, setLeftPanelWidth] = useState(50);
  const [isResizing, setIsResizing] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const step2ContainerRef = useRef<HTMLDivElement>(null);

  // Step 3: Delivery
  const [orderDate, setOrderDate] = useState(new Date().toISOString().split('T')[0]);
  const [expectedDeliveryDate, setExpectedDeliveryDate] = useState('');
  const [receivedDate, setReceivedDate] = useState('');
  const [receivedBy, setReceivedBy] = useState('');
  const [deliveryNote, setDeliveryNote] = useState('');
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [driverName, setDriverName] = useState('');
  const [status, setStatus] = useState<GRNStatus>('pending');
  const [notes, setNotes] = useState('');

  // Load products from API when modal opens
  useEffect(() => {
    if (isOpen && products.length === 0) {
      loadProducts();
    }
  }, [isOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  // Focus price input when editing
  useEffect(() => {
    if (editingPriceId && priceInputRef.current) {
      priceInputRef.current.focus();
      priceInputRef.current.select();
    }
  }, [editingPriceId]);

  // Initialize with existing GRN for editing
  useEffect(() => {
    if (grn && isOpen) {
      setStep(1);
      setSelectedSupplierId(grn.supplierId);
      setItems(grn.items.map(item => ({ ...item })));
      setOrderDate(grn.orderDate);
      setExpectedDeliveryDate(grn.expectedDeliveryDate || '');
      setReceivedDate(grn.receivedDate || '');
      setReceivedBy(grn.receivedBy || '');
      setDeliveryNote(grn.deliveryNote || '');
      setVehicleNumber(grn.vehicleNumber || '');
      setDriverName(grn.driverName || '');
      setStatus(grn.status);
      setNotes(grn.notes || '');
    } else if (isOpen && !grn) {
      resetForm();
    }
  }, [grn, isOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  // Resizable panel handlers
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
  }, []);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isResizing) return;
    // Use whichever container ref is active
    const activeContainer = containerRef.current || step2ContainerRef.current;
    if (!activeContainer) return;
    const rect = activeContainer.getBoundingClientRect();
    const newWidth = ((e.clientX - rect.left) / rect.width) * 100;
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

  const currentSupplier = suppliers.find(s => s.id === selectedSupplierId);
  const currentProduct = products.find(p => p.id === selectedProductId);

  // Filter suppliers
  const filteredSuppliers = useMemo(() => {
    if (!supplierSearch.trim()) return suppliers;
    const q = supplierSearch.toLowerCase();
    return suppliers.filter(s =>
      s.name.toLowerCase().includes(q) ||
      s.company.toLowerCase().includes(q) ||
      s.email.toLowerCase().includes(q) ||
      s.phone.includes(q)
    );
  }, [suppliers, supplierSearch]);

  // Filter products
  const filteredProducts = useMemo(() => {
    if (!productSearch.trim()) return products;
    const selected = products.find(p => p.id === selectedProductId);
    if (selected && productSearch === selected.name) return products;
    const q = productSearch.toLowerCase();
    return products.filter(p =>
      p.name.toLowerCase().includes(q) ||
      p.serialNumber.toLowerCase().includes(q) ||
      (p.barcode && p.barcode.toLowerCase().includes(q)) ||
      p.category.toLowerCase().includes(q)
    );
  }, [products, productSearch, selectedProductId]);

  // Add item from product
  const addItem = () => {
    if (!selectedProductId || orderedQty <= 0) return;
    const product = products.find(p => p.id === selectedProductId);
    if (!product) return;

    const existingIndex = items.findIndex(i => i.productId === selectedProductId);
    if (existingIndex >= 0) {
      const updated = [...items];
      updated[existingIndex].orderedQuantity += orderedQty;
      updated[existingIndex].receivedQuantity += orderedQty;
      updated[existingIndex].acceptedQuantity += orderedQty;
      updated[existingIndex].totalAmount = updated[existingIndex].acceptedQuantity * updated[existingIndex].unitPrice;
      setItems(updated);
    } else {
      const costPrice = product.costPrice || product.price;
      const newItem: ExtendedGRNItem = {
        id: `grn-item-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        productId: product.id,
        productName: product.name,
        category: product.category,
        orderedQuantity: orderedQty,
        receivedQuantity: orderedQty,
        acceptedQuantity: orderedQty,
        rejectedQuantity: 0,
        unitPrice: costPrice,
        originalUnitPrice: costPrice,
        discountType: 'fixed',
        discountValue: 0,
        totalAmount: orderedQty * costPrice,
        status: 'accepted',
      };
      setItems([...items, newItem]);
    }
    setOrderedQty(1);
  };

  const removeItem = (id: string) => {
    setItems(items.filter(i => i.id !== id));
  };

  // Update item quantity
  const updateItemQty = (id: string, field: 'orderedQuantity' | 'acceptedQuantity', value: number) => {
    setItems(items.map(item => {
      if (item.id !== id) return item;
      const updated = { ...item, [field]: value };
      if (field === 'orderedQuantity') {
        updated.receivedQuantity = value;
        updated.acceptedQuantity = value;
      }
      updated.totalAmount = updated.acceptedQuantity * updated.unitPrice;
      if (updated.acceptedQuantity === updated.orderedQuantity) {
        updated.status = 'accepted';
      } else if (updated.acceptedQuantity > 0) {
        updated.status = 'partial';
      } else {
        updated.status = 'pending';
      }
      return updated;
    }));
  };

  // Price editing
  const handlePriceEdit = (id: string, currentPrice: number) => {
    setEditingPriceId(id);
    setEditingPrice(currentPrice);
  };

  const handlePriceChange = (id: string) => {
    if (editingPrice > 0) {
      setItems(items.map(item =>
        item.id === id
          ? { ...item, unitPrice: editingPrice, totalAmount: item.acceptedQuantity * editingPrice }
          : item
      ));
    }
    setEditingPriceId(null);
  };

  const handlePriceKeyDown = (e: React.KeyboardEvent, id: string) => {
    if (e.key === 'Enter') handlePriceChange(id);
    else if (e.key === 'Escape') setEditingPriceId(null);
  };

  // Discount editing
  const handleDiscountClick = (id: string, item: ExtendedGRNItem) => {
    setEditingDiscountId(id);
    setEditingDiscountType(item.discountType || 'fixed');
    setEditingDiscountValue(item.discountValue || 0);
  };

  const applyDiscount = (id: string) => {
    setItems(items.map(item => {
      if (item.id !== id) return item;
      const original = item.originalUnitPrice || item.unitPrice;
      let newUnitPrice = original;
      if (editingDiscountType === 'percentage') {
        newUnitPrice = original * (1 - editingDiscountValue / 100);
      } else {
        newUnitPrice = original - editingDiscountValue;
      }
      if (newUnitPrice < 0) newUnitPrice = 0;
      return {
        ...item,
        discountType: editingDiscountType,
        discountValue: editingDiscountValue,
        unitPrice: Math.round(newUnitPrice * 100) / 100,
        totalAmount: item.acceptedQuantity * Math.round(newUnitPrice * 100) / 100,
      };
    }));
    setEditingDiscountId(null);
  };

  // Calculate totals
  const totals = useMemo(() => {
    return items.reduce((acc, item) => {
      const originalTotal = (item.originalUnitPrice || item.unitPrice) * item.acceptedQuantity;
      const discountAmount = originalTotal - item.totalAmount;
      return {
        orderedQty: acc.orderedQty + item.orderedQuantity,
        acceptedQty: acc.acceptedQty + item.acceptedQuantity,
        rejectedQty: acc.rejectedQty + item.rejectedQuantity,
        subtotal: acc.subtotal + originalTotal,
        discount: acc.discount + discountAmount,
        total: acc.total + item.totalAmount,
      };
    }, { orderedQty: 0, acceptedQty: 0, rejectedQty: 0, subtotal: 0, discount: 0, total: 0 });
  }, [items]);

  // Handle save
  const handleCreate = () => {
    if (!selectedSupplierId || items.length === 0) return;
    const supplier = suppliers.find(s => s.id === selectedSupplierId);
    if (!supplier) return;

    const now = new Date().toISOString();
    const grnNumber = grn?.grnNumber || `GRN-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 9999) + 1).padStart(4, '0')}`;

    const savedGRN: GoodsReceivedNote = {
      id: grn?.id || `grn-${Date.now()}`,
      grnNumber,
      supplierId: selectedSupplierId,
      supplierName: supplier.company || supplier.name,
      supplierEmail: supplier.email,
      supplierPhone: supplier.phone,
      supplierCompany: supplier.company,
      orderDate,
      expectedDeliveryDate,
      receivedDate: receivedDate || now.split('T')[0],
      items: items.map(({ isEditingPrice, ...item }) => item),
      totalOrderedQuantity: totals.orderedQty,
      totalReceivedQuantity: totals.acceptedQty,
      totalAcceptedQuantity: totals.acceptedQty,
      totalRejectedQuantity: totals.rejectedQty,
      subtotal: Math.round(totals.subtotal * 100) / 100,
      discountAmount: Math.round(totals.discount * 100) / 100,
      totalDiscount: Math.round(totals.discount * 100) / 100,
      taxAmount: 0,
      totalAmount: Math.round(totals.total * 100) / 100,
      status,
      receivedBy,
      deliveryNote,
      vehicleNumber,
      driverName,
      notes,
      createdAt: grn?.createdAt || now,
      updatedAt: now,
    };

    onSave(savedGRN);
    handleClose();
  };

  const resetForm = () => {
    setStep(1);
    setSelectedSupplierId('');
    setSupplierSearch('');
    setItems([]);
    setProductSearch('');
    setSelectedProductId('');
    setOrderedQty(1);
    setEditingPriceId(null);
    setEditingDiscountId(null);
    setOrderDate(new Date().toISOString().split('T')[0]);
    setExpectedDeliveryDate('');
    setReceivedDate('');
    setReceivedBy('');
    setDeliveryNote('');
    setVehicleNumber('');
    setDriverName('');
    setStatus('pending');
    setNotes('');
    setLeftPanelWidth(50);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  // Mobile browser back button support
  const stepRef = useRef<Step>(step);
  useEffect(() => { stepRef.current = step; }, [step]);

  useEffect(() => {
    if (!isOpen) return;
    window.history.pushState({ grnWizard: true }, '');

    const onBackPress = () => {
      if (stepRef.current > 1) {
        setStep(prev => (prev - 1) as Step);
        window.history.pushState({ grnWizard: true }, '');
      } else {
        resetForm();
        onClose();
      }
    };

    window.addEventListener('popstate', onBackPress);
    return () => window.removeEventListener('popstate', onBackPress);
  }, [isOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  // Step validation
  const canProceedToStep2 = !!selectedSupplierId;
  const canProceedToStep3 = items.length > 0;

  const stepLabels = ['Supplier', 'Items', 'Delivery', 'Review'];
  const getStepIcon = (s: number) => {
    switch (s) {
      case 1: return <Building2 className="w-4 h-4" />;
      case 2: return <Package className="w-4 h-4" />;
      case 3: return <Truck className="w-4 h-4" />;
      case 4: return <ClipboardCheck className="w-4 h-4" />;
      default: return null;
    }
  };

  if (!isOpen) return null;

  // ─────────────────────────────────────────────────────────────
  //  RENDER: CART ITEM (reused in step 2)
  // ─────────────────────────────────────────────────────────────
  const renderCartItem = (item: ExtendedGRNItem) => (
    <div
      key={item.id}
      className={`p-3 rounded-xl border transition-all ${
        theme === 'dark' ? 'bg-slate-800/50 border-slate-700/50' : 'bg-slate-50 border-slate-200'
      }`}
    >
      {/* Product name & delete */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className={`font-medium text-sm truncate ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
            {item.productName}
          </p>
          <p className={`text-xs ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>
            {item.category}
          </p>
        </div>
        <button
          onClick={() => removeItem(item.id)}
          className="p-1.5 hover:bg-red-500/10 rounded-lg transition-colors touch-manipulation"
        >
          <Trash2 className="w-3.5 h-3.5 text-red-400" />
        </button>
      </div>

      {/* Quantity & Price row */}
      <div className="flex items-center gap-2 mt-2">
        {/* Quantity controls */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => updateItemQty(item.id, 'orderedQuantity', Math.max(1, item.orderedQuantity - 1))}
            className={`w-7 h-7 flex items-center justify-center rounded-lg border transition-colors touch-manipulation ${
              theme === 'dark' ? 'border-slate-600 hover:bg-slate-700 text-white' : 'border-slate-300 hover:bg-slate-100'
            }`}
          >
            <Minus className="w-3 h-3" />
          </button>
          <span className={`w-8 text-center text-sm font-semibold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
            {item.orderedQuantity}
          </span>
          <button
            onClick={() => updateItemQty(item.id, 'orderedQuantity', item.orderedQuantity + 1)}
            className={`w-7 h-7 flex items-center justify-center rounded-lg border transition-colors touch-manipulation ${
              theme === 'dark' ? 'border-slate-600 hover:bg-slate-700 text-white' : 'border-slate-300 hover:bg-slate-100'
            }`}
          >
            <Plus className="w-3 h-3" />
          </button>
        </div>

        <div className="flex-1" />

        {/* Unit price — tap to edit */}
        {editingPriceId === item.id ? (
          <input
            ref={priceInputRef}
            type="number"
            value={editingPrice}
            onChange={(e) => setEditingPrice(parseFloat(e.target.value) || 0)}
            onBlur={() => handlePriceChange(item.id)}
            onKeyDown={(e) => handlePriceKeyDown(e, item.id)}
            className={`w-28 px-2 py-1 border rounded-lg text-sm ${
              theme === 'dark'
                ? 'border-orange-500 bg-slate-700 text-white'
                : 'border-orange-500 bg-white text-slate-900'
            }`}
          />
        ) : (
          <button
            onClick={() => handlePriceEdit(item.id, item.unitPrice)}
            className="flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-orange-500/10 transition-colors touch-manipulation text-xs"
            title="Tap to edit price"
          >
            {item.originalUnitPrice && item.originalUnitPrice !== item.unitPrice ? (
              <>
                <span className="line-through text-red-400">Rs. {item.originalUnitPrice.toLocaleString()}</span>
                <span className="text-orange-400 font-medium">Rs. {item.unitPrice.toLocaleString()}</span>
              </>
            ) : (
              <span className={theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}>Rs. {item.unitPrice.toLocaleString()}</span>
            )}
            <Edit2 className="w-3 h-3 opacity-50" />
          </button>
        )}
      </div>

      {/* Discount & Line Total */}
      <div className="mt-2 flex items-center justify-between gap-2">
        {editingDiscountId === item.id ? (
          <div className="flex items-center gap-1.5">
            <select
              value={editingDiscountType}
              onChange={(e) => setEditingDiscountType(e.target.value as 'percentage' | 'fixed')}
              className={`px-1.5 py-1 text-xs rounded-lg border touch-manipulation ${
                theme === 'dark' ? 'bg-slate-700 border-slate-600 text-white' : 'bg-white border-slate-300'
              }`}
            >
              <option value="fixed">Rs.</option>
              <option value="percentage">%</option>
            </select>
            <input
              type="number"
              value={editingDiscountValue}
              onChange={(e) => setEditingDiscountValue(parseFloat(e.target.value) || 0)}
              onKeyDown={(e) => { if (e.key === 'Enter') applyDiscount(item.id); if (e.key === 'Escape') setEditingDiscountId(null); }}
              className={`w-16 px-2 py-1 text-xs rounded-lg border ${
                theme === 'dark' ? 'bg-slate-700 border-slate-600 text-white' : 'bg-white border-slate-300'
              }`}
              autoFocus
            />
            <button onClick={() => applyDiscount(item.id)} className="px-2 py-1 text-xs bg-orange-500 text-white rounded-lg touch-manipulation">
              OK
            </button>
            <button onClick={() => setEditingDiscountId(null)} className={`px-1 py-1 text-xs rounded-lg touch-manipulation ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
              ✕
            </button>
          </div>
        ) : (
          <button
            onClick={() => handleDiscountClick(item.id, item)}
            className={`flex items-center gap-1 text-xs px-2 py-1 rounded-lg transition-colors touch-manipulation ${
              item.discountValue && item.discountValue > 0
                ? 'bg-orange-500/10 text-orange-400'
                : theme === 'dark' ? 'text-slate-500 hover:text-orange-400' : 'text-slate-400 hover:text-orange-500'
            }`}
          >
            <Tag className="w-3 h-3" />
            {item.discountValue && item.discountValue > 0
              ? <span>{item.discountType === 'percentage' ? `${item.discountValue}%` : `Rs. ${item.discountValue}`} off</span>
              : <span>Discount</span>
            }
          </button>
        )}

        <span className="text-orange-400 font-bold text-sm whitespace-nowrap">
          Rs. {Math.round(item.totalAmount).toLocaleString()}
        </span>
      </div>
    </div>
  );

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className={`w-full max-w-[100vw] sm:max-w-2xl lg:max-w-5xl max-h-[100dvh] sm:max-h-[92vh] overflow-hidden flex flex-col p-0 sm:rounded-2xl rounded-none ${
        theme === 'dark' ? 'bg-slate-900 border-slate-700/50' : 'bg-white border-slate-200'
      }`}>
        <DialogHeader className="sr-only">
          <DialogTitle>{isEditing ? 'Edit' : 'Create'} Goods Received Note</DialogTitle>
          <DialogDescription>Create a new GRN in 4 easy steps</DialogDescription>
        </DialogHeader>

        {/* ═══════════════ Gradient Header ═══════════════ */}
        <div className="bg-gradient-to-r from-orange-600 via-amber-600 to-yellow-500 px-3 py-2.5 sm:px-6 sm:py-4 text-white shrink-0" aria-hidden="true">
          <div className="flex items-center gap-2 sm:gap-4">
            {/* Mobile: Back arrow */}
            <button
              onClick={() => step > 1 ? setStep((prev) => (prev - 1) as Step) : handleClose()}
              className="sm:hidden w-9 h-9 flex items-center justify-center rounded-xl bg-white/15 hover:bg-white/25 active:bg-white/10 transition-colors touch-manipulation shrink-0"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            {/* Desktop icon */}
            <div className="hidden sm:flex w-14 h-14 bg-white/20 backdrop-blur rounded-xl items-center justify-center shrink-0">
              <ClipboardCheck className="w-7 h-7" />
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="text-base sm:text-2xl font-bold truncate">{isEditing ? 'Edit' : 'Create'} GRN</h2>
              <p className="text-orange-100 text-[11px] sm:text-sm truncate">
                <span className="sm:hidden">Step {step}/4 — {stepLabels[step - 1]}</span>
                <span className="hidden sm:inline">Goods Received Note — {isEditing ? 'Update details' : '4 easy steps'}</span>
              </p>
            </div>
            {/* Mobile: Close */}
            <button
              onClick={handleClose}
              className="sm:hidden w-9 h-9 flex items-center justify-center rounded-xl bg-white/15 hover:bg-white/25 active:bg-white/10 transition-colors touch-manipulation shrink-0"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* ═══════════════ Progress Indicator ═══════════════ */}
        <div className={`px-3 sm:px-6 py-3 sm:py-4 border-b shrink-0 ${
          theme === 'dark' ? 'bg-slate-800/50 border-slate-700/50' : 'bg-slate-50 border-slate-200'
        }`}>
          <div className="flex items-center justify-between max-w-2xl mx-auto">
            {[1, 2, 3, 4].map((s) => (
              <React.Fragment key={s}>
                <div className="flex flex-col items-center">
                  <button
                    onClick={() => {
                      if (s === 1) setStep(1);
                      else if (s === 2 && canProceedToStep2) setStep(2);
                      else if (s === 3 && canProceedToStep2 && canProceedToStep3) setStep(3);
                      else if (s === 4 && canProceedToStep2 && canProceedToStep3) setStep(4);
                    }}
                    className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center font-bold text-sm transition-all shadow-sm cursor-pointer touch-manipulation ${
                      s < step
                        ? 'bg-orange-500 text-white hover:bg-orange-600'
                        : s === step
                        ? 'bg-orange-600 text-white ring-4 ring-orange-500/30'
                        : theme === 'dark' ? 'bg-slate-700 text-slate-400' : 'bg-slate-200 text-slate-500'
                    }`}
                  >
                    {s < step ? <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5" /> : getStepIcon(s)}
                  </button>
                  <p className={`mt-1.5 text-[10px] sm:text-xs font-medium ${
                    s <= step ? (theme === 'dark' ? 'text-white' : 'text-slate-900') : (theme === 'dark' ? 'text-slate-400' : 'text-slate-500')
                  }`}>
                    {stepLabels[s - 1]}
                  </p>
                </div>
                {s < 4 && (
                  <div className={`flex-1 h-1 mx-1.5 sm:mx-3 rounded-full transition-colors ${
                    s < step ? 'bg-orange-500' : (theme === 'dark' ? 'bg-slate-700' : 'bg-slate-200')
                  }`} />
                )}
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* ═══════════════ Scrollable Content ═══════════════ */}
        <div className="flex-1 overflow-y-auto overscroll-contain">
          <div className="p-4 sm:p-6 space-y-4">

            {/* ═══════════════ STEP 1: SUPPLIER SELECTION ═══════════════ */}
            {step === 1 && (
              <div className="space-y-4">
                {/* Section header */}
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 bg-orange-500/20 rounded-lg flex items-center justify-center shrink-0">
                    <Building2 className="w-5 h-5 text-orange-400" />
                  </div>
                  <div className="min-w-0">
                    <h3 className={`text-base sm:text-lg font-semibold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>Select a Supplier</h3>
                    <p className={`text-xs sm:text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                      Choose the supplier for this GRN
                      <span className="hidden sm:inline"> (drag divider to resize)</span>
                    </p>
                  </div>
                </div>

                {/* ── Mobile: Simple list ── */}
                <div className="block sm:hidden space-y-3">
                  {/* Search */}
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                    <input
                      type="text"
                      placeholder="Search by name, company, phone..."
                      value={supplierSearch}
                      onChange={(e) => setSupplierSearch(e.target.value)}
                      className={`w-full pl-10 pr-4 py-3 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 ${
                        theme === 'dark'
                          ? 'border-slate-700 bg-slate-800/50 text-white placeholder-slate-500'
                          : 'border-slate-200 bg-white text-slate-900 placeholder-slate-400'
                      }`}
                    />
                  </div>

                  {/* Selected supplier banner */}
                  {currentSupplier && (
                    <div className="p-3 rounded-xl border-2 border-orange-500 bg-orange-500/10">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-sm font-bold shrink-0 ${
                          theme === 'dark' ? 'bg-orange-500/20 text-orange-400' : 'bg-orange-100 text-orange-600'
                        }`}>
                          {currentSupplier.company.charAt(0)}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className={`font-semibold text-sm ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                            {currentSupplier.company}
                          </p>
                          <p className={`text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                            {currentSupplier.name} • {currentSupplier.phone}
                          </p>
                        </div>
                        <CheckCircle className="w-5 h-5 text-orange-500 shrink-0" />
                      </div>
                    </div>
                  )}

                  {/* Supplier list */}
                  <div className="space-y-2 max-h-[55vh] overflow-y-auto overscroll-contain">
                    {filteredSuppliers.length === 0 ? (
                      <div className={`text-center py-10 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                        <Building2 className="w-10 h-10 mx-auto mb-3 opacity-30" />
                        <p className="text-sm font-medium">No suppliers found</p>
                      </div>
                    ) : (
                      filteredSuppliers.map((supplier) => (
                        <button
                          key={supplier.id}
                          onClick={() => setSelectedSupplierId(supplier.id)}
                          className={`w-full p-3 border-2 rounded-xl text-left transition-all touch-manipulation ${
                            selectedSupplierId === supplier.id
                              ? 'border-orange-500 bg-orange-500/10'
                              : theme === 'dark' ? 'border-slate-700 hover:border-orange-500/50 bg-slate-800/50' : 'border-slate-200 hover:border-orange-400/50 bg-white'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-sm font-bold shrink-0 ${
                              selectedSupplierId === supplier.id
                                ? 'bg-orange-500/20 text-orange-400'
                                : theme === 'dark' ? 'bg-slate-700 text-slate-400' : 'bg-slate-100 text-slate-600'
                            }`}>
                              {supplier.company.charAt(0)}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className={`font-semibold text-sm truncate ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                                {supplier.company}
                              </p>
                              <p className={`text-xs truncate ${theme === 'dark' ? 'text-slate-500' : 'text-slate-500'}`}>
                                {supplier.name} • {supplier.phone}
                              </p>
                            </div>
                            {selectedSupplierId === supplier.id && (
                              <CheckCircle className="w-5 h-5 text-orange-500 shrink-0" />
                            )}
                          </div>
                          <div className="flex items-center gap-1 mt-1.5 ml-[52px]">
                            {Array.from({ length: 5 }).map((_, i) => (
                              <Star key={i} className={`w-3 h-3 ${i < (supplier.rating || 0) ? 'text-amber-400 fill-amber-400' : 'text-slate-600'}`} />
                            ))}
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                </div>

                {/* ── Desktop: Resizable panels ── */}
                <div
                  ref={containerRef}
                  className={`hidden sm:flex h-[380px] rounded-xl overflow-hidden border ${
                    theme === 'dark' ? 'border-slate-700' : 'border-slate-200'
                  } ${isResizing ? 'select-none' : ''}`}
                >
                  {/* Left Panel - Supplier List */}
                  <div
                    className={`overflow-hidden flex flex-col ${
                      theme === 'dark' ? 'bg-slate-800/30' : 'bg-slate-50'
                    }`}
                    style={{ width: `${leftPanelWidth}%` }}
                  >
                    <div className={`p-3 border-b ${theme === 'dark' ? 'border-slate-700' : 'border-slate-200'}`}>
                      <div className="relative">
                        <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400 pointer-events-none" />
                        <input
                          type="text"
                          placeholder="Search suppliers..."
                          value={supplierSearch}
                          onChange={(e) => setSupplierSearch(e.target.value)}
                          className={`w-full pl-9 pr-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 ${
                            theme === 'dark'
                              ? 'border-slate-600 bg-slate-800 text-white placeholder-slate-500'
                              : 'border-slate-300 bg-white text-slate-900 placeholder-slate-400'
                          }`}
                        />
                      </div>
                    </div>

                    <div className="flex-1 overflow-y-auto p-2 space-y-2">
                      {filteredSuppliers.length === 0 ? (
                        <div className={`text-center py-8 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                          <Building2 className="w-8 h-8 mx-auto mb-2 opacity-50" />
                          <p className="text-sm">No suppliers found</p>
                        </div>
                      ) : (
                        filteredSuppliers.map((supplier) => (
                          <button
                            key={supplier.id}
                            onClick={() => setSelectedSupplierId(supplier.id)}
                            className={`w-full p-3 border-2 rounded-xl text-left transition-all ${
                              selectedSupplierId === supplier.id
                                ? 'border-orange-500 bg-orange-500/10'
                                : theme === 'dark' ? 'border-slate-700 hover:border-orange-500/50 bg-slate-800/50' : 'border-slate-200 hover:border-orange-500/50 bg-white'
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-sm font-bold shrink-0 ${
                                selectedSupplierId === supplier.id
                                  ? 'bg-orange-500/20 text-orange-400'
                                  : theme === 'dark' ? 'bg-slate-700 text-slate-400' : 'bg-slate-100 text-slate-600'
                              }`}>
                                {supplier.company.charAt(0)}
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className={`font-semibold text-sm truncate ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                                  {supplier.company}
                                </p>
                                <p className={`text-xs truncate ${theme === 'dark' ? 'text-slate-500' : 'text-slate-500'}`}>
                                  {supplier.name} • {supplier.phone}
                                </p>
                              </div>
                              {selectedSupplierId === supplier.id && (
                                <CheckCircle className="w-5 h-5 text-orange-500 shrink-0" />
                              )}
                            </div>
                            <div className="flex items-center gap-1 mt-1.5 ml-[52px]">
                              {Array.from({ length: 5 }).map((_, i) => (
                                <Star key={i} className={`w-3 h-3 ${i < (supplier.rating || 0) ? 'text-amber-400 fill-amber-400' : 'text-slate-600'}`} />
                              ))}
                              <span className={`text-xs ml-2 truncate ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>
                                {supplier.categories?.slice(0, 2).join(', ')}
                              </span>
                            </div>
                          </button>
                        ))
                      )}
                    </div>
                  </div>

                  {/* Resizer Handle */}
                  <div
                    onMouseDown={handleMouseDown}
                    className={`w-2 cursor-col-resize flex items-center justify-center transition-colors ${
                      isResizing
                        ? 'bg-orange-500'
                        : theme === 'dark' ? 'bg-slate-700 hover:bg-orange-500/50' : 'bg-slate-200 hover:bg-orange-500/50'
                    }`}
                  >
                    <GripVertical className={`w-3 h-3 ${isResizing ? 'text-white' : 'text-slate-400'}`} />
                  </div>

                  {/* Right Panel - Selected Supplier Details + Cart Preview */}
                  <div
                    className={`overflow-hidden flex flex-col ${
                      theme === 'dark' ? 'bg-slate-900/50' : 'bg-white'
                    }`}
                    style={{ width: `${100 - leftPanelWidth}%` }}
                  >
                    <div className={`p-3 border-b flex items-center justify-between ${
                      theme === 'dark' ? 'border-slate-700' : 'border-slate-200'
                    }`}>
                      <h4 className={`font-semibold text-sm ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                        Selected Supplier
                      </h4>
                    </div>

                    <div className="flex-1 overflow-y-auto p-3">
                      {currentSupplier ? (
                        <div className="p-4 rounded-xl border-2 border-orange-500 bg-orange-500/10">
                          <div className="flex items-center gap-3 mb-3">
                            <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-lg font-bold ${
                              theme === 'dark' ? 'bg-orange-500/20 text-orange-400' : 'bg-orange-100 text-orange-600'
                            }`}>
                              {currentSupplier.company.charAt(0)}
                            </div>
                            <div>
                              <p className={`font-semibold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                                {currentSupplier.company}
                              </p>
                              <p className={`text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                                {currentSupplier.name}
                              </p>
                            </div>
                          </div>
                          <div className={`text-sm space-y-1.5 ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                            <p><span className="opacity-60">📞</span> {currentSupplier.phone}</p>
                            <p><span className="opacity-60">📧</span> {currentSupplier.email}</p>
                            {currentSupplier.address && (
                              <p><span className="opacity-60">📍</span> {currentSupplier.address}</p>
                            )}
                          </div>
                          <div className="flex items-center gap-2 mt-3">
                            <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              currentSupplier.creditStatus === 'clear'
                                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                : currentSupplier.creditStatus === 'active'
                                ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                                : 'bg-red-500/10 text-red-400 border border-red-500/20'
                            }`}>
                              Credit: {currentSupplier.creditStatus}
                            </span>
                            <span className={`text-xs ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>
                              {currentSupplier.totalOrders} orders
                            </span>
                          </div>
                        </div>
                      ) : (
                        <div className={`flex flex-col items-center justify-center h-full text-center ${
                          theme === 'dark' ? 'text-slate-400' : 'text-slate-500'
                        }`}>
                          <Building2 className="w-12 h-12 mb-3 opacity-30" />
                          <p className="text-sm font-medium">No supplier selected</p>
                          <p className="text-xs mt-1 opacity-70">Select a supplier from the list</p>
                        </div>
                      )}

                      {/* Cart Preview */}
                      <div className={`mt-4 p-4 rounded-xl ${theme === 'dark' ? 'bg-slate-800/50' : 'bg-slate-50'}`}>
                        <div className="flex items-center gap-2 mb-3">
                          <Package className="w-4 h-4 text-orange-500" />
                          <span className={`text-sm font-medium ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                            Cart ({items.length} items)
                          </span>
                        </div>
                        {items.length === 0 ? (
                          <p className={`text-xs ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>
                            Cart is empty - add products in next step
                          </p>
                        ) : (
                          <div className="space-y-2">
                            <div className={`flex justify-between text-sm ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                              <span>Subtotal:</span>
                              <span>Rs. {Math.round(totals.subtotal).toLocaleString()}</span>
                            </div>
                            {totals.discount > 0 && (
                              <div className="flex justify-between text-sm text-red-400">
                                <span>Discount:</span>
                                <span>-Rs. {Math.round(totals.discount).toLocaleString()}</span>
                              </div>
                            )}
                            <div className={`flex justify-between text-sm font-semibold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                              <span>Total:</span>
                              <span className="text-orange-500">Rs. {Math.round(totals.total).toLocaleString()}</span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ═══════════════ STEP 2: ADD ITEMS ═══════════════ */}
            {step === 2 && (
              <div className="space-y-4">
                {/* Section header */}
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 bg-amber-500/20 rounded-lg flex items-center justify-center shrink-0">
                    <Package className="w-5 h-5 text-amber-400" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className={`text-base sm:text-lg font-semibold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>Add GRN Items</h3>
                    <p className={`text-xs sm:text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                      Select products, quantities & pricing
                      <span className="hidden lg:inline"> (drag divider to resize)</span>
                    </p>
                  </div>
                  {/* Cart count badge - mobile */}
                  {items.length > 0 && (
                    <div className="flex lg:hidden items-center gap-1.5 px-3 py-1.5 rounded-full bg-orange-500/15 border border-orange-500/30">
                      <ShoppingCart className="w-3.5 h-3.5 text-orange-400" />
                      <span className="text-xs font-bold text-orange-400">{items.length}</span>
                    </div>
                  )}
                </div>

                {/* ── Mobile Layout: Products + Cart stacked ── */}
                <div className="flex flex-col lg:hidden gap-4">
                  {/* Product Selection Panel - Mobile */}
                  <div className="flex flex-col">
                    <div className={`rounded-xl border overflow-hidden flex flex-col ${
                      theme === 'dark' ? 'border-slate-700 bg-slate-800/30' : 'border-slate-200 bg-slate-50'
                    }`}>
                      <div className={`p-3 border-b ${theme === 'dark' ? 'border-slate-700' : 'border-slate-200'}`}>
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                          <input
                            type="text"
                            placeholder="Search products..."
                            value={productSearch}
                            onChange={(e) => { setProductSearch(e.target.value); setSelectedProductId(''); }}
                            className={`w-full pl-10 pr-4 py-2.5 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 ${
                              theme === 'dark'
                                ? 'border-slate-600 bg-slate-800 text-white placeholder-slate-500'
                                : 'border-slate-300 bg-white text-slate-900 placeholder-slate-400'
                            }`}
                          />
                        </div>
                      </div>

                      {productsLoading ? (
                        <div className="flex items-center justify-center py-12">
                          <Loader2 className="w-6 h-6 animate-spin text-orange-500" />
                          <span className={`ml-2 text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>Loading products...</span>
                        </div>
                      ) : (
                        <div className="max-h-[40vh] overflow-y-auto overscroll-contain">
                          {filteredProducts.length === 0 ? (
                            <div className={`p-6 text-center text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                              <Package className="w-8 h-8 mx-auto mb-2 opacity-30" />
                              No products found
                            </div>
                          ) : (
                            filteredProducts.map((p) => (
                              <button
                                key={p.id}
                                type="button"
                                onClick={() => { setSelectedProductId(p.id); setProductSearch(p.name); }}
                                className={`w-full px-3 py-3 text-left border-b transition-all touch-manipulation ${
                                  theme === 'dark' ? 'border-slate-700/50' : 'border-slate-100'
                                } ${
                                  selectedProductId === p.id
                                    ? 'bg-orange-500/10'
                                    : theme === 'dark' ? 'hover:bg-slate-700/50 active:bg-slate-700/60' : 'hover:bg-slate-100 active:bg-slate-200'
                                }`}
                              >
                                <div className="flex justify-between items-center gap-2">
                                  <div className="min-w-0 flex-1">
                                    <p className={`font-medium text-sm truncate ${selectedProductId === p.id ? 'text-orange-400' : (theme === 'dark' ? 'text-white' : 'text-slate-900')}`}>
                                      {p.name}
                                    </p>
                                    <p className={`text-xs truncate ${theme === 'dark' ? 'text-slate-500' : 'text-slate-500'}`}>
                                      {p.category} • Stock: {p.stock}
                                    </p>
                                  </div>
                                  <span className={`text-sm font-semibold whitespace-nowrap ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                                    Rs. {(p.costPrice || p.price).toLocaleString()}
                                  </span>
                                </div>
                              </button>
                            ))
                          )}
                        </div>
                      )}

                      {currentProduct && (
                        <div className={`p-3 border-t ${theme === 'dark' ? 'border-slate-700 bg-slate-800/50' : 'border-slate-200 bg-white'}`}>
                          <div className="flex gap-2 items-center">
                            <div className="flex items-center gap-1.5">
                              <button
                                onClick={() => setOrderedQty(Math.max(1, orderedQty - 1))}
                                className={`w-9 h-9 flex items-center justify-center rounded-lg border transition-colors touch-manipulation ${
                                  theme === 'dark' ? 'border-slate-600 hover:bg-slate-700 text-white' : 'border-slate-300 hover:bg-slate-100'
                                }`}
                              >
                                <Minus className="w-4 h-4" />
                              </button>
                              <input
                                type="number"
                                min="1"
                                value={orderedQty}
                                onChange={(e) => setOrderedQty(parseInt(e.target.value) || 1)}
                                className={`w-14 px-2 py-2 text-sm text-center border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 ${
                                  theme === 'dark' ? 'border-slate-600 bg-slate-800 text-white' : 'border-slate-300 bg-white text-slate-900'
                                }`}
                              />
                              <button
                                onClick={() => setOrderedQty(orderedQty + 1)}
                                className={`w-9 h-9 flex items-center justify-center rounded-lg border transition-colors touch-manipulation ${
                                  theme === 'dark' ? 'border-slate-600 hover:bg-slate-700 text-white' : 'border-slate-300 hover:bg-slate-100'
                                }`}
                              >
                                <Plus className="w-4 h-4" />
                              </button>
                            </div>
                            <button
                              onClick={addItem}
                              disabled={!selectedProductId || orderedQty <= 0}
                              className="flex-1 px-3 py-2.5 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 disabled:opacity-50 text-white rounded-xl text-sm font-medium flex items-center justify-center gap-1.5 transition-all touch-manipulation"
                            >
                              <Plus className="w-4 h-4" />
                              Add to GRN
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Cart Panel - Mobile (always visible when items exist) */}
                  {items.length > 0 && (
                  <div className="flex flex-col">
                    <div className={`rounded-xl border overflow-hidden flex flex-col ${
                      theme === 'dark' ? 'border-slate-700 bg-slate-900/50' : 'border-slate-200 bg-white'
                    }`}>
                      <div className={`p-3 border-b flex items-center justify-between ${theme === 'dark' ? 'border-slate-700' : 'border-slate-200'}`}>
                        <div className="flex items-center gap-2">
                          <ShoppingCart className={`w-4 h-4 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`} />
                          <h4 className={`font-semibold text-sm ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                            GRN Items ({items.length})
                          </h4>
                        </div>
                        <span className="text-orange-500 font-bold text-sm">Rs. {Math.round(totals.total).toLocaleString()}</span>
                      </div>

                      <div className="max-h-[40vh] overflow-y-auto overscroll-contain p-2 space-y-2">
                        {items.map(renderCartItem)}
                      </div>

                      {items.length > 0 && (
                        <div className={`p-3 border-t space-y-1.5 ${theme === 'dark' ? 'border-slate-700' : 'border-slate-200'}`}>
                          {totals.discount > 0 && (
                            <div className={`flex justify-between text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                              <span>Discount</span>
                              <span className="text-red-400">-Rs. {Math.round(totals.discount).toLocaleString()}</span>
                            </div>
                          )}
                          <div className={`flex justify-between text-sm font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                            <span>Total ({totals.orderedQty} items)</span>
                            <span className="text-orange-400">Rs. {Math.round(totals.total).toLocaleString()}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                  )}
                </div>

                {/* ── Desktop: Resizable panels ── */}
                <div
                  ref={step2ContainerRef}
                  className={`hidden lg:flex h-[400px] rounded-xl overflow-hidden border ${
                    theme === 'dark' ? 'border-slate-700' : 'border-slate-200'
                  } ${isResizing ? 'select-none' : ''}`}
                >
                  {/* Left Panel - Product Selection */}
                  <div
                    className={`overflow-hidden flex flex-col ${
                      theme === 'dark' ? 'bg-slate-800/30' : 'bg-slate-50'
                    }`}
                    style={{ width: `${leftPanelWidth}%` }}
                  >
                    <div className={`p-3 border-b ${theme === 'dark' ? 'border-slate-700' : 'border-slate-200'}`}>
                      <div className="relative">
                        <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400 pointer-events-none" />
                        <input
                          type="text"
                          placeholder="Search products..."
                          value={productSearch}
                          onChange={(e) => { setProductSearch(e.target.value); setSelectedProductId(''); }}
                          className={`w-full pl-10 pr-4 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 ${
                            theme === 'dark'
                              ? 'border-slate-600 bg-slate-800 text-white placeholder-slate-500'
                              : 'border-slate-300 bg-white text-slate-900 placeholder-slate-400'
                          }`}
                        />
                      </div>
                    </div>

                    {productsLoading ? (
                      <div className="flex-1 flex items-center justify-center">
                        <Loader2 className="w-6 h-6 animate-spin text-orange-500" />
                        <span className={`ml-2 text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>Loading...</span>
                      </div>
                    ) : (
                      <div className="flex-1 overflow-y-auto">
                        {filteredProducts.length === 0 ? (
                          <div className={`p-4 text-center text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                            No products found
                          </div>
                        ) : (
                          filteredProducts.map((p) => (
                            <button
                              key={p.id}
                              type="button"
                              onClick={() => { setSelectedProductId(p.id); setProductSearch(p.name); }}
                              className={`w-full px-3 py-2.5 text-left border-b transition-colors ${
                                theme === 'dark' ? 'border-slate-700/50' : 'border-slate-100'
                              } ${
                                selectedProductId === p.id
                                  ? 'bg-orange-500/10'
                                  : theme === 'dark' ? 'hover:bg-slate-700/50' : 'hover:bg-slate-100'
                              }`}
                            >
                              <div className="flex justify-between items-start gap-2">
                                <div className="min-w-0 flex-1">
                                  <p className={`font-medium text-sm truncate ${selectedProductId === p.id ? 'text-orange-400' : (theme === 'dark' ? 'text-white' : 'text-slate-900')}`}>
                                    {p.name}
                                  </p>
                                  <p className={`text-xs truncate ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                                    {p.category} • Stock: {p.stock}
                                  </p>
                                </div>
                                <span className={`text-sm font-semibold whitespace-nowrap ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                                  Rs. {(p.costPrice || p.price).toLocaleString()}
                                </span>
                              </div>
                            </button>
                          ))
                        )}
                      </div>
                    )}

                    {currentProduct && (
                      <div className={`p-3 border-t ${theme === 'dark' ? 'border-slate-700 bg-slate-800/50' : 'border-slate-200 bg-white'}`}>
                        <div className="flex gap-2 items-center">
                          <input
                            type="number"
                            min="1"
                            value={orderedQty}
                            onChange={(e) => setOrderedQty(parseInt(e.target.value) || 1)}
                            className={`w-20 px-3 py-1.5 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 ${
                              theme === 'dark'
                                ? 'border-slate-600 bg-slate-800 text-white'
                                : 'border-slate-300 bg-white text-slate-900'
                            }`}
                          />
                          <button
                            onClick={addItem}
                            disabled={!selectedProductId || orderedQty <= 0}
                            className="flex-1 px-3 py-1.5 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 disabled:opacity-50 text-white rounded-lg text-sm font-medium flex items-center justify-center gap-1 transition-all"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            Add
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Resizer Handle */}
                  <div
                    onMouseDown={handleMouseDown}
                    className={`w-2 cursor-col-resize flex items-center justify-center transition-colors ${
                      isResizing
                        ? 'bg-orange-500'
                        : theme === 'dark' ? 'bg-slate-700 hover:bg-orange-500/50' : 'bg-slate-200 hover:bg-orange-500/50'
                    }`}
                  >
                    <GripVertical className={`w-3 h-3 ${isResizing ? 'text-white' : 'text-slate-400'}`} />
                  </div>

                  {/* Right Panel - Cart */}
                  <div
                    className={`overflow-hidden flex flex-col ${
                      theme === 'dark' ? 'bg-slate-900/50' : 'bg-white'
                    }`}
                    style={{ width: `${100 - leftPanelWidth}%` }}
                  >
                    <div className={`p-3 border-b flex items-center justify-between ${theme === 'dark' ? 'border-slate-700' : 'border-slate-200'}`}>
                      <div className="flex items-center gap-2">
                        <ShoppingCart className={`w-4 h-4 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`} />
                        <h4 className={`font-semibold text-sm ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                          GRN Items ({items.length})
                        </h4>
                      </div>
                      <span className="text-orange-500 font-bold text-sm">Rs. {Math.round(totals.total).toLocaleString()}</span>
                    </div>

                    <div className="flex-1 overflow-y-auto p-2 space-y-2">
                      {items.length === 0 ? (
                        <div className={`text-center py-10 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                          <Package className="w-10 h-10 mx-auto mb-3 opacity-30" />
                          <p className="text-sm font-medium">No items added yet</p>
                          <p className="text-xs mt-1 opacity-70">Select products from the left</p>
                        </div>
                      ) : items.map(renderCartItem)}
                    </div>

                    {items.length > 0 && (
                      <div className={`p-3 border-t space-y-1.5 ${theme === 'dark' ? 'border-slate-700' : 'border-slate-200'}`}>
                        {totals.discount > 0 && (
                          <div className={`flex justify-between text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                            <span>Discount</span>
                            <span className="text-red-400">-Rs. {Math.round(totals.discount).toLocaleString()}</span>
                          </div>
                        )}
                        <div className={`flex justify-between text-sm font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                          <span>Total ({totals.orderedQty} items)</span>
                          <span className="text-orange-400">Rs. {Math.round(totals.total).toLocaleString()}</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>


              </div>
            )}

            {/* ═══════════════ STEP 3: DELIVERY INFO ═══════════════ */}
            {step === 3 && (
              <div className="space-y-4 sm:space-y-5">
                {/* Section header */}
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 bg-cyan-500/20 rounded-lg flex items-center justify-center shrink-0">
                    <Truck className="w-5 h-5 text-cyan-400" />
                  </div>
                  <div>
                    <h3 className={`text-base sm:text-lg font-semibold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>Delivery & Status</h3>
                    <p className={`text-xs sm:text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>Set delivery information and GRN status</p>
                  </div>
                </div>

                {/* Dates */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                  <DatePicker
                    label="Order Date"
                    required
                    value={orderDate}
                    onChange={setOrderDate}
                    placeholder="Select order date"
                  />
                  <DatePicker
                    label="Expected Delivery"
                    value={expectedDeliveryDate}
                    onChange={setExpectedDeliveryDate}
                    placeholder="Select expected date"
                  />
                  <DatePicker
                    label="Received Date"
                    value={receivedDate}
                    onChange={setReceivedDate}
                    placeholder="Select received date"
                  />
                </div>

                {/* Status selection */}
                <div>
                  <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                    <ClipboardCheck className="w-3.5 h-3.5 inline mr-1.5 -mt-0.5" />
                    GRN Status
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {([
                      { value: 'pending', label: 'Pending', icon: '⏳', color: 'amber' },
                      { value: 'completed', label: 'Completed', icon: '✅', color: 'emerald' },
                      { value: 'partial', label: 'Partial', icon: '⚠️', color: 'orange' },
                      { value: 'rejected', label: 'Rejected', icon: '❌', color: 'red' },
                    ] as const).map((s) => (
                      <button
                        key={s.value}
                        type="button"
                        onClick={() => setStatus(s.value)}
                        className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-sm transition-all touch-manipulation ${
                          status === s.value
                            ? s.color === 'amber' ? 'border-amber-500 bg-amber-500/10 text-amber-400 ring-2 ring-amber-500/20'
                            : s.color === 'emerald' ? 'border-emerald-500 bg-emerald-500/10 text-emerald-400 ring-2 ring-emerald-500/20'
                            : s.color === 'orange' ? 'border-orange-500 bg-orange-500/10 text-orange-400 ring-2 ring-orange-500/20'
                            : 'border-red-500 bg-red-500/10 text-red-400 ring-2 ring-red-500/20'
                            : theme === 'dark'
                              ? 'border-slate-700 text-slate-400 hover:border-slate-600'
                              : 'border-slate-200 text-slate-600 hover:border-slate-300'
                        }`}
                      >
                        <span>{s.icon}</span>
                        <span className="font-medium">{s.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Received By & Vehicle */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <div>
                    <label className={`block text-sm font-medium mb-1.5 ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                      <User className="w-3.5 h-3.5 inline mr-1.5 -mt-0.5" />
                      Received By
                    </label>
                    <input
                      type="text"
                      value={receivedBy}
                      onChange={(e) => setReceivedBy(e.target.value)}
                      placeholder="Enter name..."
                      className={`w-full px-3 py-2.5 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 ${
                        theme === 'dark'
                          ? 'border-slate-700 bg-slate-800/50 text-white placeholder-slate-500'
                          : 'border-slate-200 bg-white text-slate-900 placeholder-slate-400'
                      }`}
                    />
                  </div>
                  <div>
                    <label className={`block text-sm font-medium mb-1.5 ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                      <Truck className="w-3.5 h-3.5 inline mr-1.5 -mt-0.5" />
                      Vehicle Number
                    </label>
                    <input
                      type="text"
                      value={vehicleNumber}
                      onChange={(e) => setVehicleNumber(e.target.value)}
                      placeholder="e.g., WP ABC-1234"
                      className={`w-full px-3 py-2.5 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 ${
                        theme === 'dark'
                          ? 'border-slate-700 bg-slate-800/50 text-white placeholder-slate-500'
                          : 'border-slate-200 bg-white text-slate-900 placeholder-slate-400'
                      }`}
                    />
                  </div>
                </div>

                {/* Driver & Delivery Note */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <div>
                    <label className={`block text-sm font-medium mb-1.5 ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                      <User className="w-3.5 h-3.5 inline mr-1.5 -mt-0.5" />
                      Driver Name
                    </label>
                    <input
                      type="text"
                      value={driverName}
                      onChange={(e) => setDriverName(e.target.value)}
                      placeholder="Enter driver name..."
                      className={`w-full px-3 py-2.5 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 ${
                        theme === 'dark'
                          ? 'border-slate-700 bg-slate-800/50 text-white placeholder-slate-500'
                          : 'border-slate-200 bg-white text-slate-900 placeholder-slate-400'
                      }`}
                    />
                  </div>
                  <div>
                    <label className={`block text-sm font-medium mb-1.5 ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                      <Hash className="w-3.5 h-3.5 inline mr-1.5 -mt-0.5" />
                      Delivery Note
                    </label>
                    <input
                      type="text"
                      value={deliveryNote}
                      onChange={(e) => setDeliveryNote(e.target.value)}
                      placeholder="Delivery note/reference..."
                      className={`w-full px-3 py-2.5 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 ${
                        theme === 'dark'
                          ? 'border-slate-700 bg-slate-800/50 text-white placeholder-slate-500'
                          : 'border-slate-200 bg-white text-slate-900 placeholder-slate-400'
                      }`}
                    />
                  </div>
                </div>

                {/* Additional Notes */}
                <div>
                  <label className={`block text-sm font-medium mb-1.5 ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                    <StickyNote className="w-3.5 h-3.5 inline mr-1.5 -mt-0.5" />
                    Notes
                  </label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Additional notes..."
                    rows={2}
                    className={`w-full px-3 py-2.5 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 resize-none ${
                      theme === 'dark'
                        ? 'border-slate-700 bg-slate-800/50 text-white placeholder-slate-500'
                        : 'border-slate-200 bg-white text-slate-900 placeholder-slate-400'
                    }`}
                  />
                </div>
              </div>
            )}

            {/* ═══════════════ STEP 4: REVIEW ═══════════════ */}
            {step === 4 && (
              <div className="space-y-4">
                {/* Section header */}
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 bg-teal-500/20 rounded-lg flex items-center justify-center shrink-0">
                    <ClipboardCheck className="w-5 h-5 text-teal-400" />
                  </div>
                  <div>
                    <h3 className={`text-base sm:text-lg font-semibold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>Review GRN</h3>
                    <p className={`text-xs sm:text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>Confirm all details before {isEditing ? 'saving' : 'creating'}</p>
                  </div>
                </div>

                {/* Supplier & Delivery info cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  {/* Supplier */}
                  <div className={`p-4 rounded-xl border ${
                    theme === 'dark' ? 'bg-slate-800/50 border-slate-700/50' : 'bg-slate-50 border-slate-200'
                  }`}>
                    <div className="flex items-center gap-2 mb-3">
                      <Building2 className="w-4 h-4 text-orange-500" />
                      <span className={`text-sm font-semibold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>Supplier</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-sm font-bold shrink-0 ${
                        theme === 'dark' ? 'bg-orange-500/20 text-orange-400' : 'bg-orange-100 text-orange-600'
                      }`}>
                        {currentSupplier?.company?.charAt(0) || '?'}
                      </div>
                      <div className="min-w-0">
                        <p className={`font-semibold text-sm ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                          {currentSupplier?.company}
                        </p>
                        <p className={`text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                          {currentSupplier?.name} • {currentSupplier?.phone}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Delivery */}
                  <div className={`p-4 rounded-xl border ${
                    theme === 'dark' ? 'bg-slate-800/50 border-slate-700/50' : 'bg-slate-50 border-slate-200'
                  }`}>
                    <div className="flex items-center gap-2 mb-3">
                      <Truck className="w-4 h-4 text-cyan-500" />
                      <span className={`text-sm font-semibold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>Delivery</span>
                    </div>
                    <div className={`text-xs sm:text-sm space-y-1 ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                      <p>
                        <span className="opacity-70">Order:</span>{' '}
                        {orderDate ? new Date(orderDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
                      </p>
                      {expectedDeliveryDate && (
                        <p>
                          <span className="opacity-70">Expected:</span>{' '}
                          {new Date(expectedDeliveryDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </p>
                      )}
                      {receivedDate && (
                        <p>
                          <span className="opacity-70">Received:</span>{' '}
                          {new Date(receivedDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </p>
                      )}
                      {vehicleNumber && <p><span className="opacity-70">Vehicle:</span> {vehicleNumber}</p>}
                      {receivedBy && <p><span className="opacity-70">Received By:</span> {receivedBy}</p>}
                    </div>
                    <div className="mt-3">
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${
                        status === 'completed'
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          : status === 'pending'
                          ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                          : status === 'partial'
                          ? 'bg-orange-500/10 text-orange-400 border border-orange-500/20'
                          : 'bg-red-500/10 text-red-400 border border-red-500/20'
                      }`}>
                        <span className="w-1.5 h-1.5 rounded-full bg-current" />
                        {status.charAt(0).toUpperCase() + status.slice(1)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Items */}
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <Package className="w-4 h-4 text-orange-500" />
                    <span className={`text-sm font-semibold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                      Items ({items.length})
                    </span>
                  </div>

                  {/* Desktop table */}
                  <div className={`hidden sm:block rounded-xl overflow-hidden border ${
                    theme === 'dark' ? 'bg-slate-800/50 border-slate-700/50' : 'bg-slate-50 border-slate-200'
                  }`}>
                    <table className="w-full text-sm">
                      <thead>
                        <tr className={`border-b ${theme === 'dark' ? 'border-slate-700' : 'border-slate-200'}`}>
                          <th className={`p-3 text-left ${theme === 'dark' ? 'text-slate-300' : 'text-slate-600'}`}>Product</th>
                          <th className={`p-3 text-right ${theme === 'dark' ? 'text-slate-300' : 'text-slate-600'}`}>Qty</th>
                          <th className={`p-3 text-right ${theme === 'dark' ? 'text-slate-300' : 'text-slate-600'}`}>Price</th>
                          <th className={`p-3 text-right ${theme === 'dark' ? 'text-slate-300' : 'text-slate-600'}`}>Disc.</th>
                          <th className={`p-3 text-right ${theme === 'dark' ? 'text-slate-300' : 'text-slate-600'}`}>Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {items.map((item) => {
                          const discountAmt = ((item.originalUnitPrice || item.unitPrice) - item.unitPrice) * item.acceptedQuantity;
                          return (
                            <tr key={item.id} className={`border-b ${theme === 'dark' ? 'border-slate-700/50' : 'border-slate-100'}`}>
                              <td className={`p-3 ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                                <p className="font-medium">{item.productName}</p>
                                <p className={`text-xs ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>{item.category}</p>
                              </td>
                              <td className={`p-3 text-right ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                                {item.orderedQuantity}
                              </td>
                              <td className={`p-3 text-right ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                                {item.originalUnitPrice && item.originalUnitPrice !== item.unitPrice ? (
                                  <div className="flex flex-col items-end">
                                    <span className="line-through text-red-400 text-xs">Rs. {item.originalUnitPrice.toLocaleString()}</span>
                                    <span className="text-orange-400">Rs. {item.unitPrice.toLocaleString()}</span>
                                  </div>
                                ) : (
                                  <>Rs. {item.unitPrice.toLocaleString()}</>
                                )}
                              </td>
                              <td className={`p-3 text-right ${discountAmt > 0 ? 'text-red-400' : (theme === 'dark' ? 'text-slate-500' : 'text-slate-400')}`}>
                                {discountAmt > 0 ? `-Rs. ${Math.round(discountAmt).toLocaleString()}` : '—'}
                              </td>
                              <td className="p-3 text-right font-semibold text-orange-400">
                                Rs. {Math.round(item.totalAmount).toLocaleString()}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Mobile card list */}
                  <div className="sm:hidden space-y-2">
                    {items.map((item) => {
                      const discountAmt = ((item.originalUnitPrice || item.unitPrice) - item.unitPrice) * item.acceptedQuantity;
                      return (
                        <div key={item.id} className={`p-3 rounded-xl border ${
                          theme === 'dark' ? 'bg-slate-800/50 border-slate-700/50' : 'bg-slate-50 border-slate-200'
                        }`}>
                          <div className="flex justify-between items-start gap-2">
                            <div className="min-w-0">
                              <p className={`font-medium text-sm ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                                {item.productName}
                              </p>
                              <p className={`text-xs ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>{item.category}</p>
                            </div>
                            <span className="text-orange-400 font-bold text-sm whitespace-nowrap">
                              Rs. {Math.round(item.totalAmount).toLocaleString()}
                            </span>
                          </div>
                          <div className={`flex flex-wrap items-center gap-3 mt-2 text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                            <span>Qty: {item.orderedQuantity}</span>
                            <span>@ Rs. {item.unitPrice.toLocaleString()}</span>
                            {discountAmt > 0 && (
                              <span className="text-red-400">-Rs. {Math.round(discountAmt).toLocaleString()}</span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Totals */}
                <div className={`space-y-2 p-4 rounded-xl border ${
                  theme === 'dark' ? 'bg-slate-800/50 border-slate-700/50' : 'bg-slate-50 border-slate-200'
                }`}>
                  <div className={`flex justify-between text-sm ${theme === 'dark' ? 'text-slate-300' : 'text-slate-600'}`}>
                    <span>Subtotal ({totals.orderedQty} items)</span>
                    <span>Rs. {Math.round(totals.subtotal).toLocaleString()}</span>
                  </div>
                  {totals.discount > 0 && (
                    <div className="flex justify-between text-sm text-red-400">
                      <span>Total Discount</span>
                      <span>-Rs. {Math.round(totals.discount).toLocaleString()}</span>
                    </div>
                  )}
                  <div className={`flex justify-between font-bold text-base sm:text-lg pt-2 border-t ${
                    theme === 'dark' ? 'border-slate-700 text-white' : 'border-slate-200 text-slate-900'
                  }`}>
                    <span>Grand Total</span>
                    <span className="text-orange-400">
                      Rs. {Math.round(totals.total).toLocaleString()}
                    </span>
                  </div>
                </div>

                {/* Notes */}
                {(notes || deliveryNote) && (
                  <div className={`p-4 rounded-xl border ${
                    theme === 'dark' ? 'bg-slate-800/30 border-slate-700/50' : 'bg-blue-50 border-blue-200'
                  }`}>
                    <div className="flex items-center gap-2 mb-2">
                      <StickyNote className={`w-4 h-4 ${theme === 'dark' ? 'text-slate-400' : 'text-blue-500'}`} />
                      <span className={`text-sm font-semibold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>Notes</span>
                    </div>
                    {deliveryNote && (
                      <p className={`text-sm ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                        <span className="opacity-70">Delivery:</span> {deliveryNote}
                      </p>
                    )}
                    {notes && (
                      <p className={`text-sm ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                        <span className="opacity-70">Notes:</span> {notes}
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* ═══════════════ Footer Navigation ═══════════════ */}
        <div className={`border-t p-3 sm:p-4 shrink-0 ${
          theme === 'dark' ? 'border-slate-700/50 bg-slate-800/30' : 'border-slate-200 bg-slate-50'
        }`}>
          <div className="flex items-center gap-2 sm:gap-3">
            {step > 1 && (
              <button
                onClick={() => setStep((prev) => (prev - 1) as Step)}
                className={`flex items-center gap-1.5 px-3 sm:px-5 py-2.5 rounded-xl font-medium text-sm transition-colors border touch-manipulation ${
                  theme === 'dark'
                    ? 'bg-slate-700/50 hover:bg-slate-700 active:bg-slate-600 text-white border-slate-600/50'
                    : 'bg-white hover:bg-slate-100 active:bg-slate-200 text-slate-900 border-slate-300'
                }`}
              >
                <ChevronLeft className="w-4 h-4" />
                <span className="hidden sm:inline">Back</span>
              </button>
            )}

            <div className="flex-1" />

            {/* Cancel — hidden on mobile */}
            <button
              onClick={handleClose}
              className={`hidden sm:block px-5 py-2.5 rounded-xl font-medium text-sm transition-colors border ${
                theme === 'dark'
                  ? 'bg-slate-700/50 hover:bg-slate-700 text-white border-slate-600/50'
                  : 'bg-white hover:bg-slate-100 text-slate-900 border-slate-300'
              }`}
            >
              Cancel
            </button>

            {step < 4 && (
              <button
                onClick={() => setStep((prev) => (prev + 1) as Step)}
                disabled={
                  (step === 1 && !canProceedToStep2) ||
                  (step === 2 && !canProceedToStep3)
                }
                className="flex items-center justify-center gap-1.5 px-5 sm:px-6 py-2.5 bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 active:from-orange-800 active:to-amber-800 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl font-medium text-sm transition-all shadow-lg shadow-orange-500/25 touch-manipulation"
              >
                Continue
                <ChevronRight className="w-4 h-4" />
              </button>
            )}

            {step === 4 && (
              <button
                onClick={handleCreate}
                disabled={isLoading}
                className="flex items-center gap-2 px-5 sm:px-6 py-2.5 bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 active:from-orange-800 active:to-amber-800 disabled:opacity-50 text-white rounded-xl font-medium text-sm transition-all shadow-lg shadow-orange-500/25 touch-manipulation"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4" />
                    {isEditing ? 'Save GRN' : 'Create GRN'}
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
