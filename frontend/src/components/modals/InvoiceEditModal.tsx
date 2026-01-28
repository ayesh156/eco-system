import React, { useState, useEffect, useMemo } from 'react';
import type { Invoice, InvoiceItem, Product } from '../../data/mockData';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import { Plus, Trash2, Search, FileText, Package, Calendar, CheckCircle, XCircle, CircleDollarSign, CreditCard, AlertTriangle, History, Shield, ChevronLeft, ChevronRight } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../ui/dialog';
import { Label } from '../ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { SearchableSelect } from '../ui/searchable-select';
import { invoiceItemHistoryService, type CreateHistoryRequest, type ItemHistoryAction } from '../../services/invoiceItemHistoryService';

interface InvoiceEditModalProps {
  isOpen: boolean;
  invoice: Invoice | null;
  products: Product[];
  onClose: () => void;
  onSave: (invoice: Invoice) => Promise<void>;
  isSaving?: boolean;
  shopId?: string; // For SUPER_ADMIN viewing
}

export const InvoiceEditModal: React.FC<InvoiceEditModalProps> = ({
  isOpen,
  invoice,
  products,
  onClose,
  onSave,
  isSaving = false,
  shopId, // For SUPER_ADMIN viewing other shops
}) => {
  const { theme } = useTheme();
  const { user } = useAuth();
  const [items, setItems] = useState<InvoiceItem[]>([]);
  const [originalItems, setOriginalItems] = useState<InvoiceItem[]>([]); // Track original items for history
  const [issueDate, setIssueDate] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [historyRecords, setHistoryRecords] = useState<any[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [historyPage, setHistoryPage] = useState(1); // Pagination for history
  const HISTORY_PER_PAGE = 5; // Items per page
  const [status, setStatus] = useState<'unpaid' | 'fullpaid' | 'halfpay'>('unpaid');
  const [productSearch, setProductSearch] = useState('');
  const [selectedProductId, setSelectedProductId] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [selectedWarranty, setSelectedWarranty] = useState<string>(''); // Custom warranty selection
  
  // Warranty options with icons
  const warrantyOptions = [
    { value: '', label: '📦 Product Default' },
    { value: 'No Warranty', label: '❌ No Warranty' },
    { value: '1 week', label: '🛡️ 1 Week' },
    { value: '2 weeks', label: '🛡️ 2 Weeks' },
    { value: '1 month', label: '🛡️ 1 Month' },
    { value: '3 months', label: '🛡️ 3 Months' },
    { value: '6 months', label: '🛡️ 6 Months' },
    { value: '1 year', label: '✨ 1 Year' },
    { value: '2 years', label: '✨ 2 Years' },
    { value: '3 years', label: '⭐ 3 Years' },
    { value: '5 years', label: '⭐ 5 Years' },
    { value: 'Lifetime', label: '♾️ Lifetime Warranty' },
  ];
  
  // Payment method for adding products (default to 'cash' for walk-in, 'credit' for others)
  const [addPaymentMethod, setAddPaymentMethod] = useState<'cash' | 'card' | 'bank' | 'credit'>('credit');
  
  // Tax states
  const [hasTax, setHasTax] = useState(true);
  const [taxPercentage, setTaxPercentage] = useState(15);
  const [originalHadTax, setOriginalHadTax] = useState(true);

  // Check if this is a walk-in customer invoice (no partial/credit payments allowed)
  const isWalkInInvoice = invoice?.customerId === 'walk-in' || 
                          invoice?.customerName?.toLowerCase().includes('walk-in') ||
                          invoice?.customerName?.toLowerCase().includes('walkin');
  
  // Calendar states
  const [showIssueDatePicker, setShowIssueDatePicker] = useState(false);
  const [showDueDatePicker, setShowDueDatePicker] = useState(false);
  const [issueMonth, setIssueMonth] = useState(new Date());
  const [dueMonth, setDueMonth] = useState(new Date());

  useEffect(() => {
    if (invoice) {
      const invoiceItems = [...invoice.items];
      setItems(invoiceItems);
      // TRUE deep copy using JSON to avoid reference issues
      setOriginalItems(JSON.parse(JSON.stringify(invoice.items)));
      console.log('🔄 Loaded invoice items:', invoice.items.length, 'Original saved:', JSON.parse(JSON.stringify(invoice.items)).length);
      setIssueDate(invoice.date);
      setDueDate(invoice.dueDate);
      setStatus(invoice.status);
      
      // Check if invoice originally had tax
      const invoiceHadTax = invoice.tax > 0;
      setOriginalHadTax(invoiceHadTax);
      setHasTax(invoiceHadTax);
      
      // Calculate tax percentage from original invoice
      if (invoiceHadTax && invoice.subtotal > 0) {
        const calculatedPercentage = (invoice.tax / invoice.subtotal) * 100;
        setTaxPercentage(Math.round(calculatedPercentage));
      } else {
        setTaxPercentage(15);
      }
      
      // Reset payment method to 'cash' for walk-in customers (credit not allowed)
      const isWalkIn = invoice.customerId === 'walk-in' || 
                       invoice.customerName?.toLowerCase().includes('walk-in') ||
                       invoice.customerName?.toLowerCase().includes('walkin');
      if (isWalkIn) {
        setAddPaymentMethod('cash');
      }
    }
  }, [invoice]);

  const currentProduct = products.find((p) => p.id === selectedProductId);

  // Filter products by search
  const filteredProducts = useMemo(() => {
    if (!productSearch.trim()) return products;
    const selectedProduct = products.find(p => p.id === selectedProductId);
    if (selectedProduct && productSearch === selectedProduct.name) return products;
    
    const searchLower = productSearch.toLowerCase();
    return products.filter(
      (p) =>
        p.name.toLowerCase().includes(searchLower) ||
        p.serialNumber.toLowerCase().includes(searchLower) ||
        (p.barcode && p.barcode.toLowerCase().includes(searchLower)) ||
        p.category.toLowerCase().includes(searchLower)
    );
  }, [products, productSearch, selectedProductId]);

  const addItem = () => {
    if (!selectedProductId || quantity <= 0) return;
    const product = products.find((p) => p.id === selectedProductId);
    if (!product) return;

    const unitPrice = product.price;
    // Use selected warranty if set, otherwise use product's default warranty
    const itemWarranty = selectedWarranty || product.warranty;
    
    const newItem: InvoiceItem = {
      productId: product.id,
      productName: product.name,
      quantity,
      unitPrice,
      total: quantity * unitPrice,
      warranty: itemWarranty,
    };

    const existingItem = items.find((i) => i.productId === selectedProductId);
    if (existingItem) {
      setItems(
        items.map((i) =>
          i.productId === selectedProductId
            ? { ...i, quantity: i.quantity + quantity, total: (i.quantity + quantity) * i.unitPrice }
            : i
        )
      );
    } else {
      setItems([...items, newItem]);
    }

    setSelectedProductId('');
    setProductSearch('');
    setQuantity(1);
    setSelectedWarranty(''); // Reset warranty selection
  };

  // Remove item - decreases quantity by 1, removes completely only when qty becomes 0
  const removeItem = (productId: string) => {
    setItems(prevItems => {
      return prevItems.reduce((acc, item) => {
        if (item.productId === productId) {
          if (item.quantity > 1) {
            // Decrease quantity by 1
            acc.push({
              ...item,
              quantity: item.quantity - 1,
              total: (item.quantity - 1) * item.unitPrice,
            });
          }
          // If quantity is 1, don't add to array (removes the item)
        } else {
          acc.push(item);
        }
        return acc;
      }, [] as InvoiceItem[]);
    });
  };

  // Force remove entire item regardless of quantity
  const forceRemoveItem = (productId: string) => {
    setItems(items.filter((i) => i.productId !== productId));
  };

  // Increase item quantity by 1
  const increaseItemQty = (productId: string) => {
    setItems(prevItems => {
      return prevItems.map(item => {
        if (item.productId === productId) {
          return {
            ...item,
            quantity: item.quantity + 1,
            total: (item.quantity + 1) * item.unitPrice,
          };
        }
        return item;
      });
    });
  };

  // Calendar helper functions
  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();
    
    const days = [];
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(new Date(year, month, i));
    }
    return days;
  };

  const formatDateForInput = (date: Date | null): string => {
    if (!date) return '';
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const formatDateDisplay = (dateString: string): string => {
    if (!dateString) return 'Select date';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  const isSelectedDate = (date: Date, selectedDateStr: string) => {
    if (!selectedDateStr || !date) return false;
    const selected = new Date(selectedDateStr);
    return date.getDate() === selected.getDate() &&
           date.getMonth() === selected.getMonth() &&
           date.getFullYear() === selected.getFullYear();
  };

  const handleIssueDateSelect = (date: Date) => {
    setIssueDate(formatDateForInput(date));
    setShowIssueDatePicker(false);
  };

  const handleDueDateSelect = (date: Date) => {
    setDueDate(formatDateForInput(date));
    setShowDueDatePicker(false);
  };

  const changeMonth = (increment: number, isIssueDate: boolean) => {
    if (isIssueDate) {
      const newMonth = new Date(issueMonth);
      newMonth.setMonth(newMonth.getMonth() + increment);
      setIssueMonth(newMonth);
    } else {
      const newMonth = new Date(dueMonth);
      newMonth.setMonth(newMonth.getMonth() + increment);
      setDueMonth(newMonth);
    }
  };

  const subtotal = items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
  const tax = hasTax ? subtotal * (taxPercentage / 100) : 0;
  const total = subtotal + tax;

  // Detect and record item changes for history
  const recordItemChanges = async (invoiceId: string, apiId: string | undefined) => {
    const targetId = apiId || invoiceId;
    console.log('=' .repeat(60));
    console.log('📊 RECORDING ITEM CHANGES');
    console.log('=' .repeat(60));
    console.log('📊 Invoice IDs - display:', invoiceId, '| API:', apiId, '| Using:', targetId);
    console.log('📊 Original items count:', originalItems.length);
    console.log('📊 Original items:', JSON.stringify(originalItems.map(i => ({id: i.productId, name: i.productName, qty: i.quantity, price: i.unitPrice})), null, 2));
    console.log('📊 Current items count:', items.length);
    console.log('📊 Current items:', JSON.stringify(items.map(i => ({id: i.productId, name: i.productName, qty: i.quantity, price: i.unitPrice})), null, 2));
    
    const historyRecords: CreateHistoryRequest[] = [];
    const changedByName = user?.name || user?.email || 'Unknown User';

    // Create maps for easy comparison
    const originalMap = new Map(originalItems.map(item => [item.productId, item]));
    const currentMap = new Map(items.map(item => [item.productId, item]));

    // Find removed items
    for (const [productId, originalItem] of originalMap) {
      if (!currentMap.has(productId)) {
        historyRecords.push({
          action: 'REMOVED' as ItemHistoryAction,
          productId,
          productName: originalItem.productName,
          oldQuantity: originalItem.quantity,
          newQuantity: 0,
          unitPrice: originalItem.unitPrice,
          amountChange: -(originalItem.quantity * originalItem.unitPrice),
          changedByName,
        });
      }
    }

    // Find added items and quantity changes
    for (const [productId, currentItem] of currentMap) {
      const originalItem = originalMap.get(productId);
      
      if (!originalItem) {
        // New item added
        historyRecords.push({
          action: 'ADDED' as ItemHistoryAction,
          productId,
          productName: currentItem.productName,
          oldQuantity: 0,
          newQuantity: currentItem.quantity,
          unitPrice: currentItem.unitPrice,
          amountChange: currentItem.quantity * currentItem.unitPrice,
          changedByName,
        });
      } else if (originalItem.quantity !== currentItem.quantity) {
        // Quantity changed
        const action: ItemHistoryAction = currentItem.quantity > originalItem.quantity 
          ? 'QTY_INCREASED' 
          : 'QTY_DECREASED';
        const qtyDiff = currentItem.quantity - originalItem.quantity;
        
        historyRecords.push({
          action,
          productId,
          productName: currentItem.productName,
          oldQuantity: originalItem.quantity,
          newQuantity: currentItem.quantity,
          unitPrice: currentItem.unitPrice,
          amountChange: qtyDiff * currentItem.unitPrice,
          changedByName,
        });
      } else if (originalItem.unitPrice !== currentItem.unitPrice) {
        // Price changed
        const priceDiff = currentItem.unitPrice - originalItem.unitPrice;
        
        historyRecords.push({
          action: 'PRICE_CHANGED' as ItemHistoryAction,
          productId,
          productName: currentItem.productName,
          oldQuantity: originalItem.quantity,
          newQuantity: currentItem.quantity,
          unitPrice: currentItem.unitPrice,
          amountChange: priceDiff * currentItem.quantity,
          changedByName,
          notes: `Price changed from Rs. ${originalItem.unitPrice.toLocaleString()} to Rs. ${currentItem.unitPrice.toLocaleString()}`,
        });
      }
    }

    // Save history records if any changes detected
    console.log('=' .repeat(60));
    console.log('📝 CHANGES DETECTED:', historyRecords.length);
    historyRecords.forEach((rec, i) => {
      console.log(`  [${i + 1}] ${rec.action}: ${rec.productName} (${rec.oldQuantity} → ${rec.newQuantity}) Amount: Rs. ${rec.amountChange}`);
    });
    console.log('=' .repeat(60));
    
    if (historyRecords.length > 0) {
      try {
        console.log('📤 Sending history to API...', { targetId, changes: historyRecords, shopId });
        // Pass shopId for SuperAdmin support
        const result = await invoiceItemHistoryService.createHistory(targetId, historyRecords, shopId);
        console.log('✅ SUCCESS! Recorded', historyRecords.length, 'change(s) for invoice', invoiceId);
        console.log('✅ API Response:', result);
      } catch (error: any) {
        console.error('❌ FAILED to record item history!');
        console.error('❌ Error:', error.message || error);
        // Don't block the save operation if history fails
      }
    } else {
      console.log('ℹ️ No changes detected between original and current items - nothing to record');
    }
  };

  const handleSave = async () => {
    if (!invoice || items.length === 0 || isSaving) return;

    // For walk-in customers: ALWAYS full payment (paidAmount = total)
    // For regular customers: determine status based on paid amount
    let newPaidAmount = invoice.paidAmount || 0;
    let newStatus = status;
    
    if (isWalkInInvoice) {
      // Walk-in customer - always full cash payment
      newPaidAmount = total;
      newStatus = 'fullpaid';
    } else {
      // Regular flow - determine status based on paid amount vs total
      if (newPaidAmount > 0 && newPaidAmount < total) {
        newStatus = 'halfpay';
      } else if (newPaidAmount >= total) {
        newStatus = 'fullpaid';
      }
    }

    const updatedInvoice: Invoice = {
      ...invoice,
      items,
      subtotal: Math.round(subtotal * 100) / 100,
      tax: Math.round(tax * 100) / 100,
      total: Math.round(total * 100) / 100,
      date: issueDate,
      dueDate,
      status: newStatus,
      paidAmount: Math.round(newPaidAmount * 100) / 100,
    };

    // Record item changes before saving
    await recordItemChanges(invoice.id, invoice.apiId);

    await onSave(updatedInvoice);
  };

  const handleClose = () => {
    setProductSearch('');
    setSelectedProductId('');
    setQuantity(1);
    setShowHistoryModal(false);
    setHistoryRecords([]);
    onClose();
  };

  const loadHistory = async () => {
    if (!invoice) return;
    setIsLoadingHistory(true);
    console.log('📥 Loading history for invoice:', {
      id: invoice.id,
      apiId: invoice.apiId,
      targetId: invoice.apiId || invoice.id,
      shopId: shopId,
    });
    try {
      const targetId = invoice.apiId || invoice.id;
      console.log('📡 Fetching history from API with ID:', targetId, 'shopId:', shopId);
      // Pass shopId for SuperAdmin viewing other shops
      const history = await invoiceItemHistoryService.getHistory(targetId, shopId);
      console.log('📜 History loaded:', history.length, 'records', history);
      setHistoryRecords(history);
      setShowHistoryModal(true);
    } catch (error) {
      console.error('❌ Failed to load history:', error);
      setHistoryRecords([]);
      setShowHistoryModal(true);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  if (!isOpen || !invoice) return null;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className={`max-w-4xl max-h-[90vh] overflow-y-auto p-0 ${
        theme === 'dark' ? 'bg-slate-900 border-slate-700/50' : 'bg-white border-slate-200'
      }`}>
        <DialogHeader className="sr-only">
          <DialogTitle>Edit Invoice</DialogTitle>
          <DialogDescription>Edit invoice details</DialogDescription>
        </DialogHeader>
        
        {/* Gradient Header */}
        <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 p-6 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-white/20 backdrop-blur rounded-xl flex items-center justify-center">
                <FileText className="w-7 h-7" />
              </div>
              <div>
                <h2 className="text-2xl font-bold">Edit Invoice</h2>
                <p className="text-emerald-100 text-sm">{invoice.id} • {invoice.customerName}</p>
              </div>
            </div>
            <button
              onClick={loadHistory}
              disabled={isLoadingHistory}
              className="flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 backdrop-blur rounded-xl transition-all text-sm font-medium"
            >
              <History className="w-4 h-4" />
              {isLoadingHistory ? 'Loading...' : 'View History'}
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Invoice Details */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Issue Date with Modern Calendar */}
            <div>
              <Label className="text-gray-900 dark:text-white">Issue Date</Label>
              <Popover open={showIssueDatePicker} onOpenChange={setShowIssueDatePicker}>
                <PopoverTrigger asChild>
                  <button
                    className={`w-full mt-1 px-4 py-2 border rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 flex items-center justify-between ${
                      theme === 'dark'
                        ? 'border-slate-700 bg-slate-800/50 text-white hover:bg-slate-800'
                        : 'border-slate-300 bg-slate-50 text-slate-900 hover:bg-slate-100'
                    }`}
                  >
                    <span className={!issueDate ? (theme === 'dark' ? 'text-slate-500' : 'text-slate-400') : ''}>
                      {formatDateDisplay(issueDate)}
                    </span>
                    <Calendar className="w-4 h-4" />
                  </button>
                </PopoverTrigger>
                <PopoverContent className={`w-[280px] p-0 ${theme === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`} align="start">
                  <div className={`p-3 ${theme === 'dark' ? 'bg-slate-800' : 'bg-white'}`}>
                    {/* Calendar Header */}
                    <div className="flex items-center justify-between mb-3">
                      <button
                        onClick={() => changeMonth(-1, true)}
                        className={`p-1.5 rounded-lg transition-colors ${
                          theme === 'dark' ? 'hover:bg-slate-700 text-slate-400' : 'hover:bg-slate-100 text-slate-600'
                        }`}
                      >
                        ←
                      </button>
                      <span className={`text-sm font-semibold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                        {issueMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                      </span>
                      <button
                        onClick={() => changeMonth(1, true)}
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
                      {getDaysInMonth(issueMonth).map((date, index) => (
                        <button
                          key={index}
                          onClick={() => date && handleIssueDateSelect(date)}
                          disabled={!date}
                          className={`text-sm py-2 rounded-lg transition-all ${
                            !date ? 'invisible' :
                            isSelectedDate(date, issueDate)
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
                        onClick={() => { setIssueDate(''); setShowIssueDatePicker(false); }}
                        className={`text-xs px-3 py-1.5 rounded-lg transition-colors ${
                          theme === 'dark' ? 'hover:bg-slate-700 text-slate-400' : 'hover:bg-slate-100 text-slate-600'
                        }`}
                      >
                        Clear
                      </button>
                      <button
                        onClick={() => handleIssueDateSelect(new Date())}
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
            
            {/* Due Date with Modern Calendar */}
            <div>
              <Label className="text-gray-900 dark:text-white">Due Date</Label>
              <Popover open={showDueDatePicker} onOpenChange={setShowDueDatePicker}>
                <PopoverTrigger asChild>
                  <button
                    className={`w-full mt-1 px-4 py-2 border rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 flex items-center justify-between ${
                      theme === 'dark'
                        ? 'border-slate-700 bg-slate-800/50 text-white hover:bg-slate-800'
                        : 'border-slate-300 bg-slate-50 text-slate-900 hover:bg-slate-100'
                    }`}
                  >
                    <span className={!dueDate ? (theme === 'dark' ? 'text-slate-500' : 'text-slate-400') : ''}>
                      {formatDateDisplay(dueDate)}
                    </span>
                    <Calendar className="w-4 h-4" />
                  </button>
                </PopoverTrigger>
                <PopoverContent className={`w-[280px] p-0 ${theme === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`} align="start">
                  <div className={`p-3 ${theme === 'dark' ? 'bg-slate-800' : 'bg-white'}`}>
                    {/* Calendar Header */}
                    <div className="flex items-center justify-between mb-3">
                      <button
                        onClick={() => changeMonth(-1, false)}
                        className={`p-1.5 rounded-lg transition-colors ${
                          theme === 'dark' ? 'hover:bg-slate-700 text-slate-400' : 'hover:bg-slate-100 text-slate-600'
                        }`}
                      >
                        ←
                      </button>
                      <span className={`text-sm font-semibold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                        {dueMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                      </span>
                      <button
                        onClick={() => changeMonth(1, false)}
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
                      {getDaysInMonth(dueMonth).map((date, index) => (
                        <button
                          key={index}
                          onClick={() => date && handleDueDateSelect(date)}
                          disabled={!date}
                          className={`text-sm py-2 rounded-lg transition-all ${
                            !date ? 'invisible' :
                            isSelectedDate(date, dueDate)
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
                        onClick={() => { setDueDate(''); setShowDueDatePicker(false); }}
                        className={`text-xs px-3 py-1.5 rounded-lg transition-colors ${
                          theme === 'dark' ? 'hover:bg-slate-700 text-slate-400' : 'hover:bg-slate-100 text-slate-600'
                        }`}
                      >
                        Clear
                      </button>
                      <button
                        onClick={() => handleDueDateSelect(new Date())}
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
            
            {/* Status with Modern Combobox */}
            <div>
              <Label className="text-gray-900 dark:text-white">Status</Label>
              <div className="mt-1">
                {invoice.paidAmount && invoice.paidAmount > 0 ? (
                  // Show read-only status for invoices with payments
                  <div className={`px-4 py-2 border rounded-xl flex items-center gap-2 ${
                    theme === 'dark' 
                      ? 'border-slate-700 bg-slate-800/30 text-slate-400' 
                      : 'border-slate-300 bg-slate-100 text-slate-500'
                  }`}>
                    {invoice.paidAmount >= invoice.total ? (
                      <>
                        <CheckCircle className="w-4 h-4 text-emerald-500" />
                        <span>Full Paid</span>
                      </>
                    ) : (
                      <>
                        <CircleDollarSign className="w-4 h-4 text-amber-500" />
                        <span>Half Pay (Rs. {(invoice.paidAmount || 0).toLocaleString()} paid)</span>
                      </>
                    )}
                    <span className="ml-auto text-xs opacity-60">Auto-calculated</span>
                  </div>
                ) : isWalkInInvoice ? (
                  // Walk-in customers can only be Unpaid or Full Paid (no Half Pay/Credit)
                  <>
                    <SearchableSelect
                      value={status}
                      onValueChange={(value) => setStatus(value as 'unpaid' | 'fullpaid' | 'halfpay')}
                      placeholder="Select status"
                      searchPlaceholder="Search status..."
                      emptyMessage="No status found"
                      theme={theme}
                      options={[
                        { value: 'unpaid', label: 'Unpaid', icon: <XCircle className="w-4 h-4 text-red-500" /> },
                        { value: 'fullpaid', label: 'Full Paid', icon: <CheckCircle className="w-4 h-4 text-emerald-500" /> },
                      ]}
                    />
                    <p className={`text-xs mt-1 flex items-center gap-1 ${
                      theme === 'dark' ? 'text-amber-400' : 'text-amber-600'
                    }`}>
                      <AlertTriangle className="w-3 h-3" />
                      Half pay not available for walk-in customers
                    </p>
                  </>
                ) : (
                  <SearchableSelect
                    value={status}
                    onValueChange={(value) => setStatus(value as 'unpaid' | 'fullpaid' | 'halfpay')}
                    placeholder="Select status"
                    searchPlaceholder="Search status..."
                    emptyMessage="No status found"
                    theme={theme}
                    options={[
                      { value: 'unpaid', label: 'Unpaid', icon: <XCircle className="w-4 h-4 text-red-500" /> },
                      { value: 'halfpay', label: 'Half Pay', icon: <CircleDollarSign className="w-4 h-4 text-amber-500" /> },
                      { value: 'fullpaid', label: 'Full Paid', icon: <CheckCircle className="w-4 h-4 text-emerald-500" /> },
                    ]}
                  />
                )}
              </div>
            </div>
          </div>

          {/* Tax Settings */}
          <div className={`p-4 rounded-xl border ${
            theme === 'dark' ? 'bg-slate-800/30 border-slate-700/50' : 'bg-slate-50 border-slate-200'
          }`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-purple-500/20 rounded-lg flex items-center justify-center">
                  <span className="text-purple-400 text-sm font-bold">%</span>
                </div>
                <div>
                  <h3 className={`font-semibold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                    Tax Settings
                  </h3>
                  <p className={`text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                    {originalHadTax ? 'This invoice includes tax' : 'This invoice was created without tax'}
                  </p>
                </div>
              </div>
              {originalHadTax && (
                <div className="flex items-center gap-3">
                  <label className={`flex items-center gap-2 cursor-pointer ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                    <input
                      type="checkbox"
                      checked={hasTax}
                      onChange={(e) => setHasTax(e.target.checked)}
                      className="w-4 h-4 rounded border-slate-300 text-emerald-500 focus:ring-emerald-500"
                    />
                    <span className="text-sm">Include Tax</span>
                  </label>
                  {hasTax && (
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        value={taxPercentage}
                        onChange={(e) => setTaxPercentage(Math.max(0, Math.min(100, Number(e.target.value))))}
                        min={0}
                        max={100}
                        className={`w-16 px-2 py-1 text-sm border rounded-lg text-center ${
                          theme === 'dark'
                            ? 'border-slate-700 bg-slate-800 text-white'
                            : 'border-slate-300 bg-white text-slate-900'
                        }`}
                      />
                      <span className={`text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>%</span>
                    </div>
                  )}
                </div>
              )}
              {!originalHadTax && (
                <div className={`px-3 py-1.5 rounded-lg text-xs font-medium ${
                  theme === 'dark' ? 'bg-slate-700 text-slate-400' : 'bg-slate-200 text-slate-500'
                }`}>
                  Tax disabled for this invoice
                </div>
              )}
            </div>
          </div>

          {/* Add Products Section */}
          <div className={`p-4 rounded-xl border ${
            theme === 'dark' ? 'bg-slate-800/30 border-slate-700/50' : 'bg-slate-50 border-slate-200'
          }`}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 bg-cyan-500/20 rounded-lg flex items-center justify-center">
                <Package className="w-4 h-4 text-cyan-400" />
              </div>
              <h3 className={`font-semibold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                Add Products
              </h3>
            </div>

            {/* Product Search */}
            <div className="space-y-2 mb-4">
              <div className="relative">
                <Search className="absolute left-3 top-3 w-4 h-4 text-slate-400 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Search products..."
                  value={productSearch}
                  onChange={(e) => {
                    setProductSearch(e.target.value);
                    setSelectedProductId('');
                  }}
                  className={`w-full pl-10 pr-4 py-2 border rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
                    theme === 'dark'
                      ? 'border-slate-700 bg-slate-800/50 text-white placeholder-slate-500'
                      : 'border-slate-300 bg-white text-slate-900 placeholder-slate-400'
                  }`}
                />
              </div>
              
              {/* Product List */}
              <div className={`max-h-[150px] overflow-y-auto border rounded-xl ${
                theme === 'dark' ? 'border-slate-700' : 'border-slate-200'
              }`}>
                {filteredProducts.length === 0 ? (
                  <div className={`p-4 text-center text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                    No products found
                  </div>
                ) : (
                  filteredProducts.slice(0, 10).map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => {
                        setSelectedProductId(p.id);
                        setProductSearch(p.name);
                      }}
                      className={`w-full px-4 py-2 text-left border-b last:border-b-0 transition-colors ${
                        theme === 'dark' ? 'border-slate-700/50' : 'border-slate-100'
                      } ${
                        selectedProductId === p.id
                          ? 'bg-emerald-500/10'
                          : theme === 'dark' ? 'hover:bg-slate-700/50' : 'hover:bg-slate-100'
                      }`}
                    >
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          <span className={`font-medium truncate ${selectedProductId === p.id ? 'text-emerald-400' : (theme === 'dark' ? 'text-white' : 'text-slate-900')}`}>
                            {p.name}
                          </span>
                          {p.warranty && (
                            <span className={`flex-shrink-0 text-xs px-1.5 py-0.5 rounded ${
                              theme === 'dark' ? 'bg-blue-500/20 text-blue-300' : 'bg-blue-50 text-blue-600'
                            }`}>
                              {p.warranty}
                            </span>
                          )}
                        </div>
                        <span className={`text-sm flex-shrink-0 ml-2 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                          Rs. {p.price.toLocaleString()}
                        </span>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>

            {currentProduct && (
              <div className="p-2 mb-4 bg-emerald-500/10 rounded-lg border border-emerald-500/30">
                <p className={`text-sm ${theme === 'dark' ? 'text-slate-300' : 'text-slate-600'}`}>
                  Selected: <span className="font-semibold text-emerald-400">{currentProduct.name}</span> • Stock: {currentProduct.stock}
                  {currentProduct.warranty && (
                    <span className="ml-2 text-blue-400">• 🛡️ {currentProduct.warranty}</span>
                  )}
                </p>
              </div>
            )}

            {/* Payment Method Selector */}
            <div className="mb-4">
              <Label className="text-gray-900 dark:text-white flex items-center gap-2 mb-2">
                <CreditCard className="w-4 h-4 text-blue-500" />
                Payment Method
              </Label>
              <div className="grid grid-cols-4 gap-2">
                {[
                  { value: 'cash', label: 'Cash', emoji: '💵', color: 'emerald' },
                  { value: 'card', label: 'Card', emoji: '💳', color: 'blue' },
                  { value: 'bank', label: 'Bank', emoji: '🏦', color: 'purple' },
                  { value: 'credit', label: 'Credit', emoji: '⏳', color: 'red' },
                ].map(({ value, label, emoji, color }) => {
                  const isCreditDisabled = value === 'credit' && isWalkInInvoice;
                  return (
                    <button
                      key={value}
                      type="button"
                      onClick={() => !isCreditDisabled && setAddPaymentMethod(value as 'cash' | 'card' | 'bank' | 'credit')}
                      disabled={isCreditDisabled}
                      title={isCreditDisabled ? 'Credit not available for walk-in customers' : undefined}
                      className={`flex flex-col items-center gap-1 p-2 rounded-xl border-2 transition-all ${
                        isCreditDisabled
                          ? 'opacity-40 cursor-not-allowed border-slate-500/30'
                          : addPaymentMethod === value
                            ? `scale-105`
                            : theme === 'dark' 
                              ? 'border-slate-700 hover:border-slate-600 hover:bg-slate-800/50' 
                              : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                      }`}
                      style={!isCreditDisabled && addPaymentMethod === value ? {
                        borderColor: color === 'emerald' ? '#10b981' : color === 'blue' ? '#3b82f6' : color === 'purple' ? '#8b5cf6' : '#ef4444',
                        backgroundColor: color === 'emerald' ? 'rgba(16, 185, 129, 0.1)' : color === 'blue' ? 'rgba(59, 130, 246, 0.1)' : color === 'purple' ? 'rgba(139, 92, 246, 0.1)' : 'rgba(239, 68, 68, 0.1)'
                      } : {}}
                    >
                      <span className="text-xl">{emoji}</span>
                      <span className={`text-xs font-medium ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                        {label}
                      </span>
                    </button>
                  );
                })}
              </div>
              {isWalkInInvoice && (
                <p className={`text-xs mt-2 flex items-center gap-1 ${theme === 'dark' ? 'text-amber-400' : 'text-amber-600'}`}>
                  <AlertTriangle className="w-3 h-3" />
                  Credit payment not available for walk-in customers
                </p>
              )}
            </div>

            {/* Warranty Selection */}
            <div className="mb-4">
              <Label className="text-gray-900 dark:text-white flex items-center gap-2 mb-2">
                <Shield className="w-4 h-4 text-blue-500" />
                Warranty
                {currentProduct?.warranty && (
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    theme === 'dark' ? 'bg-blue-500/20 text-blue-400' : 'bg-blue-100 text-blue-600'
                  }`}>
                    Default: {currentProduct.warranty}
                  </span>
                )}
              </Label>
              <SearchableSelect
                options={warrantyOptions.map(opt => ({
                  value: opt.value,
                  label: opt.label,
                }))}
                value={selectedWarranty}
                onValueChange={setSelectedWarranty}
                placeholder="🛡️ Select warranty period..."
                searchPlaceholder="Search warranty..."
                emptyMessage="No warranty option found"
                theme={theme}
              />
              {selectedWarranty && (
                <p className={`text-xs mt-1.5 flex items-center gap-1.5 ${theme === 'dark' ? 'text-emerald-400' : 'text-emerald-600'}`}>
                  <CheckCircle className="w-3.5 h-3.5" />
                  Custom warranty will be applied: <strong>{selectedWarranty}</strong>
                </p>
              )}
            </div>

            {/* Quantity & Add */}
            <div className="flex gap-2 items-end">
              <div className="flex-1">
                <Label className="text-gray-900 dark:text-white">Quantity</Label>
                <input
                  type="number"
                  min="1"
                  value={quantity}
                  onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                  className={`w-full mt-1 px-4 py-2 border rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
                    theme === 'dark'
                      ? 'border-slate-700 bg-slate-800/50 text-white'
                      : 'border-slate-300 bg-white text-slate-900'
                  }`}
                />
              </div>
              <button
                onClick={addItem}
                disabled={!selectedProductId || quantity <= 0}
                className="px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 disabled:opacity-50 text-white rounded-xl font-medium flex items-center gap-2 transition-all"
              >
                <Plus className="w-4 h-4" />
                Add
              </button>
            </div>
            
            {/* Selected Payment Method Info */}
            {addPaymentMethod !== 'credit' && (
              <div className={`mt-3 p-2 rounded-lg text-sm flex items-center gap-2 ${
                theme === 'dark' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-emerald-50 text-emerald-600'
              }`}>
                <CheckCircle className="w-4 h-4" />
                <span>Product will be added with <strong>{addPaymentMethod}</strong> payment</span>
              </div>
            )}
            {addPaymentMethod === 'credit' && !isWalkInInvoice && (
              <div className={`mt-3 p-2 rounded-lg text-sm flex items-center gap-2 ${
                theme === 'dark' ? 'bg-amber-500/10 text-amber-400' : 'bg-amber-50 text-amber-600'
              }`}>
                <CircleDollarSign className="w-4 h-4" />
                <span>Product will be added as <strong>credit</strong> (unpaid)</span>
              </div>
            )}
          </div>

          {/* Current Items */}
          <div>
            <h3 className={`font-semibold mb-3 ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
              Invoice Items ({items.length})
            </h3>
            {items.length === 0 ? (
              <p className={`text-sm py-4 text-center ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                No items in this invoice
              </p>
            ) : (
              <div className="space-y-2">
                {items.map((item) => {
                  // Find product to get warranty info
                  const product = products.find(p => p.id === item.productId);
                  const warranty = product?.warranty;
                  
                  return (
                    <div
                      key={item.productId}
                      className={`p-3 rounded-xl border flex items-center justify-between ${
                        theme === 'dark' ? 'bg-slate-800/50 border-slate-700/50' : 'bg-slate-50 border-slate-200'
                      }`}
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className={`font-medium ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                            {item.productName}
                          </p>
                          {warranty && (
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                              theme === 'dark' 
                                ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30' 
                                : 'bg-blue-50 text-blue-700 border border-blue-200'
                            }`}>
                              🛡️ {warranty}
                            </span>
                          )}
                          {!warranty && (
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                              theme === 'dark' 
                                ? 'bg-slate-500/20 text-slate-400 border border-slate-500/30' 
                                : 'bg-slate-100 text-slate-500 border border-slate-200'
                            }`}>
                              N/W
                            </span>
                          )}
                        </div>
                        <p className={`text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                          Rs. {item.unitPrice.toLocaleString()} each = <span className="text-emerald-500 font-medium">Rs.{' '}
                          {(item.quantity * item.unitPrice).toLocaleString()}</span>
                        </p>
                      </div>
                      
                      {/* Quantity Controls */}
                      <div className="flex items-center gap-1">
                        {/* Decrease / Remove Button */}
                        <button
                          onClick={() => removeItem(item.productId)}
                          className={`w-8 h-8 flex items-center justify-center rounded-lg transition-all ${
                            item.quantity === 1
                              ? 'bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300'
                              : theme === 'dark'
                                ? 'bg-slate-700/50 hover:bg-slate-700 text-slate-300'
                                : 'bg-slate-200 hover:bg-slate-300 text-slate-600'
                          }`}
                          title={item.quantity === 1 ? 'Remove item' : 'Decrease quantity'}
                        >
                          {item.quantity === 1 ? (
                            <Trash2 className="w-4 h-4" />
                          ) : (
                            <span className="text-lg font-bold leading-none">−</span>
                          )}
                        </button>
                        
                        {/* Quantity Display */}
                        <span className={`w-10 text-center font-semibold text-lg ${
                          theme === 'dark' ? 'text-white' : 'text-slate-900'
                        }`}>
                          {item.quantity}
                        </span>
                        
                        {/* Increase Button */}
                        <button
                          onClick={() => increaseItemQty(item.productId)}
                          className={`w-8 h-8 flex items-center justify-center rounded-lg transition-all ${
                            theme === 'dark'
                              ? 'bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400'
                              : 'bg-emerald-100 hover:bg-emerald-200 text-emerald-600'
                          }`}
                          title="Increase quantity"
                        >
                          <span className="text-lg font-bold leading-none">+</span>
                        </button>
                        
                        {/* Force Remove (trash icon when qty > 1) */}
                        {item.quantity > 1 && (
                          <button
                            onClick={() => forceRemoveItem(item.productId)}
                            className="w-8 h-8 flex items-center justify-center rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 transition-all ml-1"
                            title="Remove all"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Totals */}
          <div className={`space-y-2 p-4 rounded-xl border ${
            theme === 'dark' ? 'bg-slate-800/50 border-slate-700/50' : 'bg-slate-50 border-slate-200'
          }`}>
            <div className={`flex justify-between ${theme === 'dark' ? 'text-slate-300' : 'text-slate-600'}`}>
              <span>Subtotal:</span>
              <span>Rs. {subtotal.toLocaleString()}</span>
            </div>
            {hasTax && (
              <div className={`flex justify-between ${theme === 'dark' ? 'text-slate-300' : 'text-slate-600'}`}>
                <span>Tax ({taxPercentage}%):</span>
                <span>Rs. {Math.round(tax).toLocaleString()}</span>
              </div>
            )}
            {!hasTax && (
              <div className={`flex justify-between ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>
                <span>Tax:</span>
                <span className="italic">No tax</span>
              </div>
            )}
            <div className={`flex justify-between font-bold text-lg pt-2 border-t ${
              theme === 'dark' ? 'border-slate-700 text-white' : 'border-slate-200 text-slate-900'
            }`}>
              <span>Total:</span>
              <span className="text-emerald-400">
                Rs. {Math.round(total).toLocaleString()}
              </span>
            </div>
            {/* Show paid amount and remaining ONLY for non-walk-in customers */}
            {!isWalkInInvoice && invoice.paidAmount && invoice.paidAmount > 0 && (
              <>
                <div className={`flex justify-between text-sm pt-2 border-t ${
                  theme === 'dark' ? 'border-slate-700 text-emerald-400' : 'border-slate-200 text-emerald-600'
                }`}>
                  <span>Paid Amount:</span>
                  <span>Rs. {invoice.paidAmount.toLocaleString()}</span>
                </div>
                <div className={`flex justify-between text-sm ${
                  theme === 'dark' ? 'text-amber-400' : 'text-amber-600'
                }`}>
                  <span>Remaining:</span>
                  <span>Rs. {Math.max(0, Math.round(total) - invoice.paidAmount).toLocaleString()}</span>
                </div>
              </>
            )}
            
            {/* Walk-in customer: Show that full payment will be made */}
            {isWalkInInvoice && (
              <div className={`mt-3 p-3 rounded-xl border-2 ${
                theme === 'dark' 
                  ? 'bg-emerald-500/10 border-emerald-500/30' 
                  : 'bg-emerald-50 border-emerald-200'
              }`}>
                <div className={`flex items-center gap-2 ${
                  theme === 'dark' ? 'text-emerald-400' : 'text-emerald-600'
                }`}>
                  <CircleDollarSign className="w-4 h-4" />
                  <span className="font-semibold text-sm">Walk-in Customer - Full Cash Payment</span>
                </div>
                <p className={`text-xs mt-1 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                  Invoice will be paid in full immediately
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className={`border-t p-4 flex justify-end gap-3 ${
          theme === 'dark' ? 'border-slate-700/50 bg-slate-800/30' : 'border-slate-200 bg-slate-50'
        }`}>
          <button
            onClick={handleClose}
            className={`px-5 py-2.5 rounded-xl font-medium transition-colors border ${
              theme === 'dark'
                ? 'bg-slate-700/50 hover:bg-slate-700 text-white border-slate-600/50'
                : 'bg-white hover:bg-slate-100 text-slate-900 border-slate-300'
            }`}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={items.length === 0 || isSaving}
            className="px-6 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 disabled:opacity-50 text-white rounded-xl font-medium transition-all shadow-lg shadow-emerald-500/25 flex items-center gap-2 min-w-[140px] justify-center"
          >
            {isSaving ? (
              <>
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Saving...
              </>
            ) : (
              'Save Changes'
            )}
          </button>
        </div>
      </DialogContent>

      {/* History Modal */}
      <Dialog open={showHistoryModal} onOpenChange={(open) => { setShowHistoryModal(open); if (!open) setHistoryPage(1); }}>
        <DialogContent className={`max-w-2xl max-h-[80vh] overflow-y-auto ${
          theme === 'dark' ? 'bg-slate-900 border-slate-700/50' : 'bg-white border-slate-200'
        }`}>
          <DialogHeader>
            <DialogTitle className={`flex items-center gap-2 ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
              <History className="w-5 h-5 text-emerald-500" />
              Item Change History
            </DialogTitle>
            <DialogDescription className={theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}>
              Track all changes made to invoice items
              {historyRecords.length > 0 && (
                <span className="ml-2 text-xs">({historyRecords.length} total changes)</span>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {historyRecords.length === 0 ? (
              <div className={`text-center py-8 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                <History className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p className="font-medium">No changes recorded yet</p>
                <p className="text-sm mt-1">Item changes will appear here after saving</p>
              </div>
            ) : (
              <>
                <div className="space-y-3">
                  {historyRecords
                    .slice((historyPage - 1) * HISTORY_PER_PAGE, historyPage * HISTORY_PER_PAGE)
                    .map((record: any, index: number) => (
                    <div
                      key={record.id || index}
                      className={`p-4 rounded-xl border ${
                        theme === 'dark' 
                          ? 'bg-slate-800/50 border-slate-700/50' 
                          : 'bg-slate-50 border-slate-200'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                              invoiceItemHistoryService.getActionColor(record.action, theme)
                            }`}>
                              {invoiceItemHistoryService.formatAction(record.action)}
                            </span>
                            <span className={`text-xs ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>
                              {new Date(record.createdAt).toLocaleString()}
                            </span>
                          </div>
                          <p className={`font-medium ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                            {record.productName}
                          </p>
                          <div className={`text-sm mt-1 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                            {record.action === 'ADDED' && (
                              <span>Added {record.newQuantity} × Rs. {record.unitPrice?.toLocaleString()}</span>
                            )}
                            {record.action === 'REMOVED' && (
                              <span>Removed {record.oldQuantity} items</span>
                            )}
                            {(record.action === 'QTY_INCREASED' || record.action === 'QTY_DECREASED') && (
                              <span>Quantity: {record.oldQuantity} → {record.newQuantity}</span>
                            )}
                            {record.action === 'PRICE_CHANGED' && (
                              <span>{record.notes}</span>
                            )}
                          </div>
                        </div>
                        <div className={`text-right ${
                          record.amountChange > 0 
                            ? 'text-emerald-500' 
                            : record.amountChange < 0 
                              ? 'text-red-500' 
                              : theme === 'dark' ? 'text-slate-400' : 'text-slate-600'
                        }`}>
                          <span className="font-semibold">
                            {record.amountChange > 0 ? '+' : ''}Rs. {record.amountChange?.toLocaleString()}
                          </span>
                        </div>
                      </div>
                      {record.changedByName && (
                        <p className={`text-xs mt-2 ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>
                          Changed by: {record.changedByName}
                        </p>
                      )}
                    </div>
                  ))}
                </div>

                {/* Pagination Controls */}
                {historyRecords.length > HISTORY_PER_PAGE && (() => {
                  const totalPages = Math.ceil(historyRecords.length / HISTORY_PER_PAGE);
                  
                  return (
                    <div className={`flex items-center justify-between pt-4 border-t ${
                      theme === 'dark' ? 'border-slate-700/50' : 'border-slate-200'
                    }`}>
                      <p className={`text-sm ${
                        theme === 'dark' ? 'text-slate-400' : 'text-slate-600'
                      }`}>
                        Showing {((historyPage - 1) * HISTORY_PER_PAGE) + 1}-{Math.min(historyPage * HISTORY_PER_PAGE, historyRecords.length)} of {historyRecords.length}
                      </p>
                      
                      <div className="flex items-center gap-2">
                        {/* Previous Button */}
                        <button
                          onClick={() => setHistoryPage(prev => Math.max(1, prev - 1))}
                          disabled={historyPage === 1}
                          className={`p-2 rounded-lg transition-all ${
                            historyPage === 1
                              ? theme === 'dark'
                                ? 'text-slate-600 cursor-not-allowed'
                                : 'text-slate-300 cursor-not-allowed'
                              : theme === 'dark'
                                ? 'text-slate-400 hover:bg-slate-800 hover:text-white'
                                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                          }`}
                        >
                          <ChevronLeft className="w-5 h-5" />
                        </button>

                        {/* Page Numbers */}
                        <div className="flex items-center gap-1">
                          {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
                            // Show: first page, last page, current page, and pages around current
                            const showPage = 
                              page === 1 || 
                              page === totalPages || 
                              Math.abs(page - historyPage) <= 1;
                            
                            // Show ellipsis
                            const showEllipsisBefore = page === historyPage - 2 && historyPage > 3;
                            const showEllipsisAfter = page === historyPage + 2 && historyPage < totalPages - 2;

                            if (showEllipsisBefore || showEllipsisAfter) {
                              return (
                                <span
                                  key={`ellipsis-${page}`}
                                  className={`px-2 ${
                                    theme === 'dark' ? 'text-slate-600' : 'text-slate-400'
                                  }`}
                                >
                                  ...
                                </span>
                              );
                            }

                            if (!showPage) return null;

                            return (
                              <button
                                key={page}
                                onClick={() => setHistoryPage(page)}
                                className={`min-w-[36px] h-9 px-3 rounded-lg text-sm font-medium transition-all ${
                                  historyPage === page
                                    ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-lg'
                                    : theme === 'dark'
                                      ? 'text-slate-400 hover:bg-slate-800 hover:text-white'
                                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                                }`}
                              >
                                {page}
                              </button>
                            );
                          })}
                        </div>

                        {/* Next Button */}
                        <button
                          onClick={() => setHistoryPage(prev => Math.min(totalPages, prev + 1))}
                          disabled={historyPage === totalPages}
                          className={`p-2 rounded-lg transition-all ${
                            historyPage === totalPages
                              ? theme === 'dark'
                                ? 'text-slate-600 cursor-not-allowed'
                                : 'text-slate-300 cursor-not-allowed'
                              : theme === 'dark'
                                ? 'text-slate-400 hover:bg-slate-800 hover:text-white'
                                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                          }`}
                        >
                          <ChevronRight className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                  );
                })()}
              </>
            )}
          </div>

          <div className={`flex justify-end pt-4 border-t ${
            theme === 'dark' ? 'border-slate-700/50' : 'border-slate-200'
          }`}>
            <button
              onClick={() => { setShowHistoryModal(false); setHistoryPage(1); }}
              className={`px-4 py-2 rounded-xl font-medium transition-colors ${
                theme === 'dark'
                  ? 'bg-slate-700/50 hover:bg-slate-700 text-white'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
              }`}
            >
              Close
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </Dialog>
  );
};
