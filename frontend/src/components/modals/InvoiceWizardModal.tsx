import React, { useState, useMemo, useRef, useCallback, useEffect } from 'react';
import type { Product, Customer, Invoice, InvoiceItem } from '../../data/mockData';
import { useTheme } from '../../contexts/ThemeContext';
import { ChevronLeft, ChevronRight, Plus, Trash2, Search, FileText, User, Package, CheckCircle, GripVertical, Edit2, Store, Globe } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../ui/dialog';

// Extended Invoice Item with original price tracking
interface ExtendedInvoiceItem extends InvoiceItem {
  originalPrice: number;
  isCustomPrice?: boolean;
}

interface InvoiceWizardModalProps {
  isOpen: boolean;
  customers: Customer[];
  products: Product[];
  onClose: () => void;
  onCreateInvoice: (invoice: Omit<Invoice, 'id'>) => Invoice;
}

type Step = 1 | 2 | 3;

export const InvoiceWizardModal: React.FC<InvoiceWizardModalProps> = ({
  isOpen,
  customers,
  products,
  onClose,
  onCreateInvoice,
}) => {
  const { theme } = useTheme();
  const [step, setStep] = useState<Step>(1);
  const [selectedCustomer, setSelectedCustomer] = useState<string>('');
  const [customerSearch, setCustomerSearch] = useState<string>('');
  const [productSearch, setProductSearch] = useState<string>('');
  const [items, setItems] = useState<ExtendedInvoiceItem[]>([]);
  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [quantity, setQuantity] = useState<number>(1);
  const [issueDate, setIssueDate] = useState(new Date().toISOString().split('T')[0]);
  const [dueDate, setDueDate] = useState(
    new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  );
  
  // Payment method and sales channel
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'bank_transfer' | 'credit'>('cash');
  const [salesChannel, setSalesChannel] = useState<'on-site' | 'online'>('on-site');
  
  // Resizable panels state
  const [leftPanelWidth, setLeftPanelWidth] = useState(50); // percentage
  const [isResizing, setIsResizing] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Price editing state
  const [editingPriceId, setEditingPriceId] = useState<string | null>(null);
  const [editingPrice, setEditingPrice] = useState<number>(0);
  const priceInputRef = useRef<HTMLInputElement>(null);
  
  // Handle resizing
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
  }, []);
  
  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isResizing || !containerRef.current) return;
    const containerRect = containerRef.current.getBoundingClientRect();
    const newWidth = ((e.clientX - containerRect.left) / containerRect.width) * 100;
    setLeftPanelWidth(Math.min(Math.max(newWidth, 30), 70)); // Clamp between 30% and 70%
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
  
  // Focus price input when editing
  useEffect(() => {
    if (editingPriceId && priceInputRef.current) {
      priceInputRef.current.focus();
      priceInputRef.current.select();
    }
  }, [editingPriceId]);

  const currentCustomer = customers.find((c) => c.id === selectedCustomer);
  const currentProduct = products.find((p) => p.id === selectedProductId);

  // Filter customers by search
  const filteredCustomers = useMemo(() => {
    if (!customerSearch.trim()) return customers;
    const searchLower = customerSearch.toLowerCase();
    return customers.filter(
      (c) =>
        c.name.toLowerCase().includes(searchLower) ||
        c.email.toLowerCase().includes(searchLower)
    );
  }, [customers, customerSearch]);

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
    const newItem: ExtendedInvoiceItem = {
      productId: product.id,
      productName: product.name,
      quantity,
      unitPrice,
      originalPrice: unitPrice,
      total: quantity * unitPrice,
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
  };

  const removeItem = (productId: string) => {
    setItems(items.filter((i) => i.productId !== productId));
  };
  
  // Handle price editing
  const handlePriceDoubleClick = (productId: string, currentPrice: number) => {
    setEditingPriceId(productId);
    setEditingPrice(currentPrice);
  };
  
  const handlePriceChange = (productId: string) => {
    if (editingPrice > 0) {
      setItems(items.map(item => 
        item.productId === productId 
          ? { ...item, unitPrice: editingPrice, total: item.quantity * editingPrice, isCustomPrice: true }
          : item
      ));
    }
    setEditingPriceId(null);
  };
  
  const handlePriceKeyDown = (e: React.KeyboardEvent, productId: string) => {
    if (e.key === 'Enter') {
      handlePriceChange(productId);
    } else if (e.key === 'Escape') {
      setEditingPriceId(null);
    }
  };

  const subtotal = items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
  const tax = subtotal * 0.15; // 15% tax
  const total = subtotal + tax;

  const handleCreateInvoice = () => {
    if (!selectedCustomer || items.length === 0) return;

    const customer = customers.find((c) => c.id === selectedCustomer);
    if (!customer) return;

    const invoice: Omit<Invoice, 'id'> = {
      customerId: selectedCustomer,
      customerName: customer.name,
      items: items.map(item => ({
        productId: item.productId,
        productName: item.productName,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        originalPrice: item.originalPrice !== item.unitPrice ? item.originalPrice : undefined,
        total: item.total,
      })),
      subtotal: Math.round(subtotal * 100) / 100,
      tax: Math.round(tax * 100) / 100,
      total: Math.round(total * 100) / 100,
      date: issueDate,
      dueDate,
      status: paymentMethod === 'credit' ? 'unpaid' : 'fullpaid',
      paidAmount: paymentMethod === 'credit' ? 0 : Math.round(total * 100) / 100,
      paymentMethod,
      salesChannel,
    };

    onCreateInvoice(invoice);
    handleClose();
  };

  const handleClose = () => {
    setStep(1);
    setSelectedCustomer('');
    setItems([]);
    setSelectedProductId('');
    setQuantity(1);
    setCustomerSearch('');
    setProductSearch('');
    setIssueDate(new Date().toISOString().split('T')[0]);
    setDueDate(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
    setPaymentMethod('cash');
    setSalesChannel('on-site');
    setEditingPriceId(null);
    setLeftPanelWidth(50);
    onClose();
  };

  const canProceedToStep2 = selectedCustomer;
  const canProceedToStep3 = items.length > 0;

  const getStepIcon = (stepNum: number) => {
    switch (stepNum) {
      case 1: return <User className="w-4 h-4" />;
      case 2: return <Package className="w-4 h-4" />;
      case 3: return <CheckCircle className="w-4 h-4" />;
      default: return null;
    }
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className={`max-w-5xl max-h-[90vh] overflow-y-auto p-0 ${
        theme === 'dark' ? 'bg-slate-900 border-slate-700/50' : 'bg-white border-slate-200'
      }`}>
        <DialogHeader className="sr-only">
          <DialogTitle>Create Invoice</DialogTitle>
          <DialogDescription>Create a new invoice in 3 easy steps</DialogDescription>
        </DialogHeader>
        {/* Gradient Header */}
        <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 p-6 text-white" aria-hidden="true">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-white/20 backdrop-blur rounded-xl flex items-center justify-center">
              <FileText className="w-7 h-7" />
            </div>
            <div>
              <h2 className="text-2xl font-bold">Create Invoice</h2>
              <p className="text-emerald-100 text-sm">Create a new invoice in 3 easy steps</p>
            </div>
          </div>
        </div>

        {/* Creative Progress Indicator */}
        <div className={`px-6 py-4 border-b ${
          theme === 'dark' ? 'bg-slate-800/50 border-slate-700/50' : 'bg-slate-100 border-slate-200'
        }`}>
          <div className="flex items-center justify-between max-w-lg mx-auto">
            {[1, 2, 3].map((s) => (
              <React.Fragment key={s}>
                <div className="flex flex-col items-center">
                  <div
                    className={`w-12 h-12 rounded-xl flex items-center justify-center font-bold text-sm transition-all shadow-sm ${
                      s < step
                        ? 'bg-emerald-500 text-white'
                        : s === step
                        ? 'bg-emerald-600 text-white ring-4 ring-emerald-500/30'
                        : theme === 'dark' ? 'bg-slate-700 text-slate-400' : 'bg-slate-200 text-slate-500'
                    }`}
                  >
                    {s < step ? <CheckCircle className="w-5 h-5" /> : getStepIcon(s)}
                  </div>
                  <p className={`mt-2 text-xs font-medium ${
                    s <= step ? (theme === 'dark' ? 'text-white' : 'text-slate-900') : (theme === 'dark' ? 'text-slate-400' : 'text-slate-500')
                  }`}>
                    {s === 1 ? 'Customer' : s === 2 ? 'Items' : 'Review'}
                  </p>
                </div>
                {s < 3 && (
                  <div className={`flex-1 h-1 mx-3 rounded-full transition-colors ${
                    s < step ? 'bg-emerald-500' : (theme === 'dark' ? 'bg-slate-700' : 'bg-slate-200')
                  }`} />
                )}
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4 min-h-[400px]">
          {/* Step 1: Customer Selection */}
          {step === 1 && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-emerald-500/20 rounded-lg flex items-center justify-center">
                  <User className="w-5 h-5 text-emerald-400" />
                </div>
                <div>
                  <h3 className={`text-lg font-semibold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>Select a Customer</h3>
                  <p className={`text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>Choose who this invoice is for (drag divider to resize)</p>
                </div>
              </div>

              {/* Resizable Panels Container */}
              <div 
                ref={containerRef}
                className={`flex h-[350px] rounded-xl overflow-hidden border ${
                  theme === 'dark' ? 'border-slate-700' : 'border-slate-200'
                } ${isResizing ? 'select-none' : ''}`}
              >
                {/* Left Panel - Customer List */}
                <div 
                  className={`overflow-hidden flex flex-col ${
                    theme === 'dark' ? 'bg-slate-800/30' : 'bg-slate-50'
                  }`}
                  style={{ width: `${leftPanelWidth}%` }}
                >
                  <div className={`p-3 border-b ${theme === 'dark' ? 'border-slate-700' : 'border-slate-200'}`}>
                    {/* Customer Search */}
                    <div className="relative">
                      <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400 pointer-events-none" />
                      <input
                        type="text"
                        placeholder="Search customers..."
                        value={customerSearch}
                        onChange={(e) => setCustomerSearch(e.target.value)}
                        className={`w-full pl-9 pr-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
                          theme === 'dark'
                            ? 'border-slate-600 bg-slate-800 text-white placeholder-slate-500'
                            : 'border-slate-300 bg-white text-slate-900 placeholder-slate-400'
                        }`}
                      />
                    </div>
                  </div>

                  {/* Customer List */}
                  <div className="flex-1 overflow-y-auto p-2 space-y-2">
                    {filteredCustomers.length === 0 ? (
                      <div className={`text-center py-8 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                        <User className="w-8 h-8 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">No customers found</p>
                      </div>
                    ) : (
                      filteredCustomers.map((customer) => (
                        <button
                          key={customer.id}
                          onClick={() => setSelectedCustomer(customer.id)}
                          className={`w-full p-3 border-2 rounded-xl text-left transition-all ${
                            selectedCustomer === customer.id
                              ? 'border-emerald-500 bg-emerald-500/10'
                              : theme === 'dark' ? 'border-slate-700 hover:border-emerald-500/50 bg-slate-800/50' : 'border-slate-200 hover:border-emerald-500/50 bg-white'
                          }`}
                        >
                          <p className={`font-semibold text-sm ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                            {customer.name}
                          </p>
                          <p className={`text-xs mt-1 ${theme === 'dark' ? 'text-slate-500' : 'text-slate-500'}`}>
                            {customer.email}
                          </p>
                          <p className={`text-xs ${theme === 'dark' ? 'text-slate-500' : 'text-slate-500'}`}>
                            {customer.phone}
                          </p>
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
                      ? 'bg-emerald-500'
                      : theme === 'dark' ? 'bg-slate-700 hover:bg-emerald-500/50' : 'bg-slate-200 hover:bg-emerald-500/50'
                  }`}
                >
                  <GripVertical className={`w-3 h-3 ${isResizing ? 'text-white' : 'text-slate-400'}`} />
                </div>

                {/* Right Panel - Selected Customer & Cart Preview */}
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
                      Selected Customer
                    </h4>
                  </div>

                  <div className="flex-1 overflow-y-auto p-3">
                    {currentCustomer ? (
                      <div className={`p-4 rounded-xl border-2 border-emerald-500 bg-emerald-500/10`}>
                        <div className="flex items-center gap-3 mb-3">
                          <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-lg font-bold ${
                            theme === 'dark' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-emerald-100 text-emerald-600'
                          }`}>
                            {currentCustomer.name.charAt(0)}
                          </div>
                          <div>
                            <p className={`font-semibold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                              {currentCustomer.name}
                            </p>
                            <p className={`text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                              {currentCustomer.email}
                            </p>
                          </div>
                        </div>
                        <div className={`text-sm space-y-1 ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                          <p><span className="opacity-70">Phone:</span> {currentCustomer.phone}</p>
                          <p><span className="opacity-70">Address:</span> {currentCustomer.address}</p>
                        </div>
                      </div>
                    ) : (
                      <div className={`flex flex-col items-center justify-center h-full text-center ${
                        theme === 'dark' ? 'text-slate-400' : 'text-slate-500'
                      }`}>
                        <User className="w-12 h-12 mb-3 opacity-30" />
                        <p className="text-sm font-medium">No customer selected</p>
                        <p className="text-xs mt-1 opacity-70">Select a customer from the list</p>
                      </div>
                    )}

                    {/* Cart Preview */}
                    <div className={`mt-4 p-4 rounded-xl ${theme === 'dark' ? 'bg-slate-800/50' : 'bg-slate-50'}`}>
                      <div className="flex items-center gap-2 mb-3">
                        <Package className="w-4 h-4 text-emerald-500" />
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
                            <span>Rs. {subtotal.toLocaleString()}</span>
                          </div>
                          <div className={`flex justify-between text-sm font-semibold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                            <span>Total:</span>
                            <span className="text-emerald-500">Rs. {Math.round(total).toLocaleString()}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Add Items */}
          {step === 2 && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-cyan-500/20 rounded-lg flex items-center justify-center">
                  <Package className="w-5 h-5 text-cyan-400" />
                </div>
                <div>
                  <h3 className={`text-lg font-semibold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>Add Invoice Items</h3>
                  <p className={`text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>Select products and quantities (drag divider to resize)</p>
                </div>
              </div>

              {/* Resizable Panels Container */}
              <div 
                ref={containerRef}
                className={`flex h-[350px] rounded-xl overflow-hidden border ${
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
                        onChange={(e) => {
                          setProductSearch(e.target.value);
                          setSelectedProductId('');
                        }}
                        className={`w-full pl-10 pr-4 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
                          theme === 'dark'
                            ? 'border-slate-600 bg-slate-800 text-white placeholder-slate-500'
                            : 'border-slate-300 bg-white text-slate-900 placeholder-slate-400'
                        }`}
                      />
                    </div>
                  </div>
                  
                  {/* Product List */}
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
                          onClick={() => {
                            setSelectedProductId(p.id);
                            setProductSearch(p.name);
                          }}
                          className={`w-full px-3 py-2.5 text-left border-b transition-colors ${
                            theme === 'dark' ? 'border-slate-700/50' : 'border-slate-100'
                          } ${
                            selectedProductId === p.id
                              ? 'bg-emerald-500/10'
                              : theme === 'dark' ? 'hover:bg-slate-700/50' : 'hover:bg-slate-100'
                          }`}
                        >
                          <div className="flex justify-between items-start gap-2">
                            <div className="min-w-0 flex-1">
                              <p className={`font-medium text-sm truncate ${selectedProductId === p.id ? 'text-emerald-400' : (theme === 'dark' ? 'text-white' : 'text-slate-900')}`}>
                                {p.name}
                              </p>
                              <p className={`text-xs truncate ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                                S/N: {p.serialNumber} • Stock: {p.stock}
                              </p>
                            </div>
                            <span className={`text-sm font-semibold whitespace-nowrap ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                              Rs. {p.price.toLocaleString()}
                            </span>
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                  
                  {/* Quantity and Add */}
                  {currentProduct && (
                    <div className={`p-3 border-t ${theme === 'dark' ? 'border-slate-700 bg-slate-800/50' : 'border-slate-200 bg-white'}`}>
                      <div className="flex gap-2 items-center">
                        <input
                          type="number"
                          min="1"
                          value={quantity}
                          onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                          className={`w-20 px-3 py-1.5 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
                            theme === 'dark'
                              ? 'border-slate-600 bg-slate-800 text-white'
                              : 'border-slate-300 bg-white text-slate-900'
                          }`}
                        />
                        <button
                          onClick={addItem}
                          disabled={!selectedProductId || quantity <= 0}
                          className="flex-1 px-3 py-1.5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 disabled:opacity-50 text-white rounded-lg text-sm font-medium flex items-center justify-center gap-1 transition-all"
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
                      ? 'bg-emerald-500'
                      : theme === 'dark' ? 'bg-slate-700 hover:bg-emerald-500/50' : 'bg-slate-200 hover:bg-emerald-500/50'
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
                  <div className={`p-3 border-b flex items-center justify-between ${
                    theme === 'dark' ? 'border-slate-700' : 'border-slate-200'
                  }`}>
                    <h4 className={`font-semibold text-sm ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                      Cart ({items.length} items)
                    </h4>
                    <span className="text-emerald-500 font-semibold text-sm">
                      Rs. {subtotal.toLocaleString()}
                    </span>
                  </div>
                  
                  {/* Cart Items */}
                  <div className="flex-1 overflow-y-auto p-2 space-y-2">
                    {items.length === 0 ? (
                      <div className={`text-center py-8 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                        <Package className="w-8 h-8 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">No items in cart</p>
                      </div>
                    ) : (
                      items.map((item) => (
                        <div
                          key={item.productId}
                          className={`p-2.5 rounded-lg border ${
                            theme === 'dark' ? 'bg-slate-800/50 border-slate-700/50' : 'bg-slate-50 border-slate-200'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0 flex-1">
                              <p className={`font-medium text-sm truncate ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                                {item.productName}
                              </p>
                              <div className={`text-xs mt-1 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                                <span>{item.quantity} × </span>
                                {/* Price with strikethrough if changed */}
                                {editingPriceId === item.productId ? (
                                  <input
                                    ref={priceInputRef}
                                    type="number"
                                    value={editingPrice}
                                    onChange={(e) => setEditingPrice(parseFloat(e.target.value) || 0)}
                                    onBlur={() => handlePriceChange(item.productId)}
                                    onKeyDown={(e) => handlePriceKeyDown(e, item.productId)}
                                    className={`w-24 px-1 py-0.5 border rounded text-xs ${
                                      theme === 'dark'
                                        ? 'border-emerald-500 bg-slate-700 text-white'
                                        : 'border-emerald-500 bg-white text-slate-900'
                                    }`}
                                  />
                                ) : (
                                  <span 
                                    onDoubleClick={() => handlePriceDoubleClick(item.productId, item.unitPrice)}
                                    className="cursor-pointer hover:text-emerald-400"
                                    title="Double-click to edit price"
                                  >
                                    {item.originalPrice && item.originalPrice !== item.unitPrice ? (
                                      <>
                                        <span className="line-through text-red-400 mr-1">Rs. {item.originalPrice.toLocaleString()}</span>
                                        <span className="text-emerald-400">Rs. {item.unitPrice.toLocaleString()}</span>
                                      </>
                                    ) : (
                                      <>Rs. {item.unitPrice.toLocaleString()}</>
                                    )}
                                    <Edit2 className="w-2.5 h-2.5 inline ml-1 opacity-50" />
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-1">
                              <span className="text-emerald-400 font-semibold text-sm whitespace-nowrap">
                                Rs. {item.total.toLocaleString()}
                              </span>
                              <button
                                onClick={() => removeItem(item.productId)}
                                className="p-1 hover:bg-red-500/10 rounded transition-colors"
                              >
                                <Trash2 className="w-3.5 h-3.5 text-red-400" />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Review */}
          {step === 3 && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-teal-500/20 rounded-lg flex items-center justify-center">
                  <CheckCircle className="w-5 h-5 text-teal-400" />
                </div>
                <div>
                  <h3 className={`text-lg font-semibold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>Review Invoice</h3>
                  <p className={`text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>Confirm details before creating</p>
                </div>
              </div>

              {/* Customer Info */}
              <div className={`p-4 rounded-xl border ${
                theme === 'dark' ? 'bg-slate-800/50 border-slate-700/50' : 'bg-slate-50 border-slate-200'
              }`}>
                <p className={`text-sm mb-1 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                  Customer
                </p>
                <p className={`font-semibold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                  {currentCustomer?.name}
                </p>
                <p className={`text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                  {currentCustomer?.email}
                </p>
              </div>

              {/* Dates */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                    Issue Date
                  </label>
                  <input
                    type="date"
                    value={issueDate}
                    onChange={(e) => setIssueDate(e.target.value)}
                    className={`w-full px-4 py-2 border rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
                      theme === 'dark'
                        ? 'border-slate-700 bg-slate-800/50 text-white'
                        : 'border-slate-300 bg-slate-50 text-slate-900'
                    }`}
                  />
                </div>
                <div>
                  <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                    Due Date
                  </label>
                  <input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className={`w-full px-4 py-2 border rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
                      theme === 'dark'
                        ? 'border-slate-700 bg-slate-800/50 text-white'
                        : 'border-slate-300 bg-slate-50 text-slate-900'
                    }`}
                  />
                </div>
              </div>

              {/* Payment Method & Sales Channel */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                    Payment Method
                  </label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value as typeof paymentMethod)}
                    className={`w-full px-4 py-2 border rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
                      theme === 'dark'
                        ? 'border-slate-700 bg-slate-800/50 text-white'
                        : 'border-slate-300 bg-slate-50 text-slate-900'
                    }`}
                  >
                    <option value="cash">Cash</option>
                    <option value="card">Card</option>
                    <option value="bank_transfer">Bank Transfer</option>
                    <option value="credit">Credit (Unpaid)</option>
                  </select>
                </div>
                <div>
                  <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                    Sales Channel
                  </label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setSalesChannel('on-site')}
                      className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-xl border transition-all ${
                        salesChannel === 'on-site'
                          ? 'border-emerald-500 bg-emerald-500/10 text-emerald-400'
                          : theme === 'dark'
                            ? 'border-slate-700 text-slate-400 hover:border-emerald-500/50'
                            : 'border-slate-300 text-slate-600 hover:border-emerald-500/50'
                      }`}
                    >
                      <Store className="w-4 h-4" />
                      On Site
                    </button>
                    <button
                      type="button"
                      onClick={() => setSalesChannel('online')}
                      className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-xl border transition-all ${
                        salesChannel === 'online'
                          ? 'border-emerald-500 bg-emerald-500/10 text-emerald-400'
                          : theme === 'dark'
                            ? 'border-slate-700 text-slate-400 hover:border-emerald-500/50'
                            : 'border-slate-300 text-slate-600 hover:border-emerald-500/50'
                      }`}
                    >
                      <Globe className="w-4 h-4" />
                      Online
                    </button>
                  </div>
                </div>
              </div>

              {/* Items Table */}
              <div className={`rounded-xl overflow-hidden border ${
                theme === 'dark' ? 'bg-slate-800/50 border-slate-700/50' : 'bg-slate-50 border-slate-200'
              }`}>
                <table className="w-full text-sm">
                  <thead>
                    <tr className={`border-b ${theme === 'dark' ? 'border-slate-700' : 'border-slate-200'}`}>
                      <th className={`p-3 text-left ${theme === 'dark' ? 'text-slate-300' : 'text-slate-600'}`}>
                        Product
                      </th>
                      <th className={`p-3 text-right ${theme === 'dark' ? 'text-slate-300' : 'text-slate-600'}`}>
                        Qty
                      </th>
                      <th className={`p-3 text-right ${theme === 'dark' ? 'text-slate-300' : 'text-slate-600'}`}>
                        Price
                      </th>
                      <th className={`p-3 text-right ${theme === 'dark' ? 'text-slate-300' : 'text-slate-600'}`}>
                        Total
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item) => (
                      <tr key={item.productId} className={`border-b ${theme === 'dark' ? 'border-slate-700/50' : 'border-slate-100'}`}>
                        <td className={`p-3 ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                          {item.productName}
                        </td>
                        <td className={`p-3 text-right ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                          {item.quantity}
                        </td>
                        <td className={`p-3 text-right ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                          {item.originalPrice && item.originalPrice !== item.unitPrice ? (
                            <div className="flex flex-col items-end">
                              <span className="line-through text-red-400 text-xs">Rs. {item.originalPrice.toLocaleString()}</span>
                              <span className="text-emerald-400">Rs. {item.unitPrice.toLocaleString()}</span>
                            </div>
                          ) : (
                            <>Rs. {item.unitPrice.toLocaleString()}</>
                          )}
                        </td>
                        <td className="p-3 text-right font-semibold text-emerald-400">
                          Rs. {(item.quantity * item.unitPrice).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Totals */}
              <div className={`space-y-2 p-4 rounded-xl border ${
                theme === 'dark' ? 'bg-slate-800/50 border-slate-700/50' : 'bg-slate-50 border-slate-200'
              }`}>
                <div className={`flex justify-between ${theme === 'dark' ? 'text-slate-300' : 'text-slate-600'}`}>
                  <span>Subtotal:</span>
                  <span>Rs. {subtotal.toLocaleString()}</span>
                </div>
                <div className={`flex justify-between ${theme === 'dark' ? 'text-slate-300' : 'text-slate-600'}`}>
                  <span>Tax (15%):</span>
                  <span>Rs. {Math.round(tax).toLocaleString()}</span>
                </div>
                <div className={`flex justify-between font-bold text-lg pt-2 border-t ${
                  theme === 'dark' ? 'border-slate-700 text-white' : 'border-slate-200 text-slate-900'
                }`}>
                  <span>Total:</span>
                  <span className="text-emerald-400">
                    Rs. {Math.round(total).toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className={`border-t p-4 flex gap-3 ${
          theme === 'dark' ? 'border-slate-700/50 bg-slate-800/30' : 'border-slate-200 bg-slate-50'
        }`}>
          {step > 1 && (
            <button
              onClick={() => setStep((prev) => (prev - 1) as Step)}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium transition-colors border ${
                theme === 'dark'
                  ? 'bg-slate-700/50 hover:bg-slate-700 text-white border-slate-600/50'
                  : 'bg-white hover:bg-slate-100 text-slate-900 border-slate-300'
              }`}
            >
              <ChevronLeft className="w-4 h-4" />
              Back
            </button>
          )}

          <div className="flex-1" />

          {step < 3 && (
            <button
              onClick={() => setStep((prev) => (prev + 1) as Step)}
              disabled={step === 1 ? !canProceedToStep2 : !canProceedToStep3}
              className="flex items-center justify-center gap-2 px-6 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl font-medium transition-all shadow-lg shadow-emerald-500/25"
            >
              Continue
              <ChevronRight className="w-4 h-4" />
            </button>
          )}

          {step === 3 && (
            <button
              onClick={handleCreateInvoice}
              className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-xl font-medium transition-all shadow-lg shadow-emerald-500/25"
            >
              <CheckCircle className="w-4 h-4" />
              Create Invoice
            </button>
          )}

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
        </div>
      </DialogContent>
    </Dialog>
  );
};
