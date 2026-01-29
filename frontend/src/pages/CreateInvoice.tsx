import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../contexts/ThemeContext';
import { useTaxSettings } from '../contexts/TaxSettingsContext';
import { useDataCache } from '../contexts/DataCacheContext';
import { useShopBranding } from '../contexts/ShopBrandingContext';
import { toast } from 'sonner';
import { mockInvoices } from '../data/mockData';
import type { Customer, Product, Invoice, InvoiceItem } from '../data/mockData';
import PrintableInvoice from '../components/PrintableInvoice';
import { SearchableSelect } from '../components/ui/searchable-select';
import { CustomerFormModal } from '../components/modals/CustomerFormModal';
import { ProductFormModal } from '../components/modals/ProductFormModal';
import {
  invoiceService,
  denormalizePaymentMethod,
  denormalizeSalesChannel,
  convertAPIInvoiceToFrontend,
} from '../services/invoiceService';
import {
  FileText, User, Package, CheckCircle, ChevronRight, ChevronLeft,
  Search, Plus, Trash2, ArrowLeft, UserX, CreditCard,
  Building2, ShoppingCart, Receipt, Calendar,
  Zap, Banknote, Printer, X, Minus, Edit2, Shield, Store, Globe, GripVertical, RefreshCw, AlertCircle, UserPlus
} from 'lucide-react';

// Extended Invoice Item with warranty tracking
interface ExtendedInvoiceItem extends InvoiceItem {
  originalPrice: number;
  discountType?: 'percentage' | 'fixed';
  discountValue?: number;
  isCustomPrice?: boolean;
  isQuickAdd?: boolean;
  warrantyDueDate?: string;
}

type Step = 1 | 2 | 3;

// Warranty options
const warrantyOptions = [
  { label: 'No Warranty', value: '', days: 0 },
  { label: '1 Month (30 Days)', value: '01M', days: 30 },
  { label: '3 Months (90 Days)', value: '03M', days: 90 },
  { label: '6 Months (180 Days)', value: '06M', days: 180 },
  { label: '1 Year (350 Days)', value: '01Y', days: 350 },
  { label: '2 Years (700 Days)', value: '02Y', days: 700 },
  { label: '3 Years (1050 Days)', value: '03Y', days: 1050 },
  { label: '5 Years (1750 Days)', value: '05Y', days: 1750 },
  { label: '10 Years (3500 Days)', value: '10Y', days: 3500 },
  { label: 'Lifetime Warranty', value: 'L/W', days: 36500 },
];

export const CreateInvoice: React.FC = () => {
  const { theme } = useTheme();
  const { settings: taxSettings } = useTaxSettings();
  const navigate = useNavigate();
  const printRef = useRef<HTMLDivElement>(null);
  const { customers: cachedCustomers, products: cachedProducts, loadCustomers, loadProducts, setInvoices: setCachedInvoices, currentShopId } = useDataCache();
  const { branding } = useShopBranding();
  
  // API data states - Start with empty arrays, will load from API
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(true);
  // Track if using API data (kept for future use)
  const [, setIsUsingAPI] = useState(false);
  
  // Track if initial load has happened
  const initialLoadRef = useRef(false);
  
  const [step, setStep] = useState<Step>(1);
  const [selectedCustomer, setSelectedCustomer] = useState<string>('');
  const [isWalkIn, setIsWalkIn] = useState(false);
  const [customerSearch, setCustomerSearch] = useState('');
  const [productSearch, setProductSearch] = useState('');
  const [items, setItems] = useState<ExtendedInvoiceItem[]>([]);
  const [discount, setDiscount] = useState<number>(0);
  const [discountType, setDiscountType] = useState('none');
  const [enableTax, setEnableTax] = useState<boolean>(taxSettings.enabled);
  const taxRate = taxSettings.defaultPercentage;
  
  // Fetch customers and products from API (using cache context) - only once
  useEffect(() => {
    if (initialLoadRef.current) return;
    initialLoadRef.current = true;
    
    const fetchData = async () => {
      setIsLoadingData(true);
      try {
        // Fetch customers and products in parallel using cache context
        const [loadedCustomers, loadedProducts] = await Promise.all([
          loadCustomers(false),
          loadProducts(false),
        ]);
        
        if (loadedCustomers.length > 0) {
          setCustomers(loadedCustomers);
          console.log('✅ Loaded customers:', loadedCustomers.length);
        }
        if (loadedProducts.length > 0) {
          setProducts(loadedProducts);
          console.log('✅ Loaded products:', loadedProducts.length);
        }
        setIsUsingAPI(true);
      } catch (error) {
        console.warn('⚠️ API not available:', error);
        setIsUsingAPI(false);
      } finally {
        setIsLoadingData(false);
      }
    };
    
    fetchData();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  
  // Sync with cached data when they change (handles shop switching)
  useEffect(() => {
    if (cachedCustomers.length > 0) {
      setCustomers(cachedCustomers);
    } else if (initialLoadRef.current) {
      setCustomers([]);
    }
  }, [cachedCustomers]);
  
  useEffect(() => {
    if (cachedProducts.length > 0) {
      setProducts(cachedProducts);
    } else if (initialLoadRef.current) {
      setProducts([]);
    }
  }, [cachedProducts]);
  
  // Quick add product state
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [quickAddName, setQuickAddName] = useState('');
  const [quickAddPrice, setQuickAddPrice] = useState<number>(0);
  const [quickAddQty, setQuickAddQty] = useState<number>(1);
  
  // Quick customer registration modal state
  const [showCustomerFormModal, setShowCustomerFormModal] = useState(false);
  
  // Quick product creation modal state
  const [showProductFormModal, setShowProductFormModal] = useState(false);
  
  // Invoice dates
  const [buyingDate, setBuyingDate] = useState(new Date().toISOString().split('T')[0]);
  const [dueDate, setDueDate] = useState(
    new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  );
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'bank_transfer' | 'credit'>('cash');
  const [salesChannel, setSalesChannel] = useState<'on-site' | 'online'>('on-site');
  const [notes, setNotes] = useState('');

  // Reset payment method when walk-in is selected (no credit allowed)
  useEffect(() => {
    if (isWalkIn && paymentMethod === 'credit') {
      setPaymentMethod('cash');
    }
  }, [isWalkIn, paymentMethod]);

  // Resizable panels state
  const [leftPanelWidth, setLeftPanelWidth] = useState(55); // percentage
  const [isResizing, setIsResizing] = useState(false);
  const mainContainerRef = useRef<HTMLDivElement>(null);

  // Print state
  const [showPrintPreview, setShowPrintPreview] = useState(false);
  const [createdInvoice, setCreatedInvoice] = useState<Invoice | null>(null);

  // Price editing state
  const [editingPriceId, setEditingPriceId] = useState<string | null>(null);
  const [editingPrice, setEditingPrice] = useState<number>(0);

  // Calendar popup state
  const [showBuyingCalendar, setShowBuyingCalendar] = useState(false);
  const [showDueCalendar, setShowDueCalendar] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState(new Date());

  // Refs for focus management
  const customerSearchRef = useRef<HTMLInputElement>(null);
  const productSearchRef = useRef<HTMLInputElement>(null);
  const priceInputRef = useRef<HTMLInputElement>(null);

  // Handle resizing
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
  }, []);
  
  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isResizing || !mainContainerRef.current) return;
    const containerRect = mainContainerRef.current.getBoundingClientRect();
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

  const currentCustomer = customers.find((c) => c.id === selectedCustomer);

  // Filter customers by search
  const filteredCustomers = useMemo(() => {
    if (!customerSearch.trim()) return customers;
    const searchLower = customerSearch.toLowerCase();
    return customers.filter(
      (c) =>
        c.name.toLowerCase().includes(searchLower) ||
        c.email.toLowerCase().includes(searchLower) ||
        c.phone.includes(searchLower)
    );
  }, [customers, customerSearch]);

  // Get productIds that are already in the invoice items (these should still be shown even if stock is 0)
  const productIdsInInvoice = useMemo(() => {
    return new Set(items.map(item => item.productId).filter(Boolean));
  }, [items]);

  // Filter products by search AND stock availability
  // Show products with stock > 0 OR products already in the invoice
  const filteredProducts = useMemo(() => {
    // First filter by stock: show if stock > 0 OR if product is already in invoice
    let filtered = products.filter(
      p => p.stock > 0 || productIdsInInvoice.has(p.id)
    );
    
    if (productSearch.trim()) {
      const searchLower = productSearch.toLowerCase();
      filtered = filtered.filter(
        (p) =>
          p.name.toLowerCase().includes(searchLower) ||
          p.serialNumber.toLowerCase().includes(searchLower) ||
          (p.barcode && p.barcode.toLowerCase().includes(searchLower)) ||
          p.category.toLowerCase().includes(searchLower) ||
          p.brand.toLowerCase().includes(searchLower)
      );
    }
    
    return filtered.sort((a, b) => {
      if (a.stock > 0 && b.stock <= 0) return -1;
      if (a.stock <= 0 && b.stock > 0) return 1;
      return a.name.localeCompare(b.name);
    });
  }, [products, productSearch, productIdsInInvoice]);

  // Helper function to map product warranty text to warranty code
  const mapWarrantyToCode = (warranty: string | undefined): string => {
    if (!warranty) return '';
    const lower = warranty.toLowerCase();
    if (lower.includes('lifetime')) return 'L/W';
    if (lower.includes('10 year')) return '10Y';
    if (lower.includes('5 year')) return '05Y';
    if (lower.includes('3 year')) return '03Y';
    if (lower.includes('2 year')) return '02Y';
    if (lower.includes('1 year') || lower.includes('one year')) return '01Y';
    if (lower.includes('6 month')) return '06M';
    if (lower.includes('3 month')) return '03M';
    if (lower.includes('1 month') || lower.includes('one month')) return '01M';
    return '';
  };

  // Calculate warranty due date based on warranty code
  const calculateWarrantyDueDate = (warrantyCode: string): string => {
    if (!warrantyCode) return '';
    const option = warrantyOptions.find(o => o.value === warrantyCode);
    if (!option || option.days === 0) return '';
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + option.days);
    return dueDate.toISOString().split('T')[0];
  };

  const addItem = (product: Product) => {
    // Stock validation: Calculate how much is already in the invoice
    const existingQtyInInvoice = items.filter(i => i.productId === product.id).reduce((sum, i) => sum + i.quantity, 0);
    const availableStock = product.stock;
    
    if (existingQtyInInvoice >= availableStock) {
      toast.error('Stock Unavailable', {
        description: `Cannot add more. Only ${availableStock} available and you already have ${existingQtyInInvoice} in the invoice.`,
      });
      return;
    }

    const unitPrice = product.price;
    
    // Auto-select warranty based on product's warranty field
    const warrantyCode = mapWarrantyToCode(product.warranty);
    const warrantyDueDate = calculateWarrantyDueDate(warrantyCode);
    
    const newItem: ExtendedInvoiceItem = {
      productId: product.id,
      productName: product.name,
      quantity: 1,
      unitPrice,
      originalPrice: unitPrice,
      total: unitPrice,
      warrantyDueDate,
    };

    const existingItem = items.find((i) => i.productId === product.id);
    if (existingItem) {
      // Compare warranty due dates - use the later one (extend warranty if new is longer)
      const existingDueDate = existingItem.warrantyDueDate ? new Date(existingItem.warrantyDueDate) : new Date(0);
      const newDueDate = warrantyDueDate ? new Date(warrantyDueDate) : new Date(0);
      const betterDueDate = newDueDate > existingDueDate ? warrantyDueDate : existingItem.warrantyDueDate;
      
      setItems(
        items.map((i) =>
          i.productId === existingItem.productId
            ? { 
                ...i, 
                quantity: i.quantity + 1, 
                total: (i.quantity + 1) * i.unitPrice,
                warrantyDueDate: betterDueDate // Apply the longer warranty
              }
            : i
        )
      );
    } else {
      setItems([...items, newItem]);
    }
  };

  // Handle new customer registration from modal
  const handleNewCustomerSave = (newCustomer: Customer) => {
    // Add to customers list
    setCustomers(prev => [newCustomer, ...prev]);
    // Auto-select the new customer
    setSelectedCustomer(newCustomer.id);
    // Turn off walk-in mode if it was on
    setIsWalkIn(false);
    // Close modal
    setShowCustomerFormModal(false);
    // Show success toast
    toast.success('Customer Registered', {
      description: `${newCustomer.name} has been added and selected.`,
    });
  };

  // Handle new product creation from modal
  const handleNewProductSave = (newProduct: Product) => {
    // Add to products list
    setProducts(prev => [newProduct, ...prev]);
    // Auto-add to invoice items
    addItem(newProduct);
    // Close modal
    setShowProductFormModal(false);
    // Show success toast
    toast.success('Product Added', {
      description: `${newProduct.name} has been added to invoice.`,
    });
  };

  // Quick add item (not in inventory)
  const addQuickItem = () => {
    if (!quickAddName.trim() || quickAddPrice <= 0 || quickAddQty <= 0) return;
    
    const newItem: ExtendedInvoiceItem = {
      productId: `quick-${Date.now()}`,
      productName: quickAddName,
      quantity: quickAddQty,
      unitPrice: quickAddPrice,
      originalPrice: quickAddPrice,
      total: quickAddQty * quickAddPrice,
      isQuickAdd: true,
      warrantyDueDate: '',
    };
    
    setItems([...items, newItem]);
    setQuickAddName('');
    setQuickAddPrice(0);
    setQuickAddQty(1);
    setShowQuickAdd(false);
  };

  const updateItemQuantity = (productId: string, newQuantity: number) => {
    if (newQuantity <= 0) {
      removeItem(productId);
      return;
    }

    // Stock validation: Check available stock before allowing quantity increase
    const product = products.find(p => p.id === productId);
    if (product && newQuantity > product.stock) {
      toast.error('Stock Limit Exceeded', {
        description: `Cannot set quantity to ${newQuantity}. Only ${product.stock} available in stock.`,
      });
      return;
    }

    setItems(items.map(item => 
      item.productId === productId 
        ? { ...item, quantity: newQuantity, total: newQuantity * item.unitPrice }
        : item
    ));
  };

  // Double-click to edit price
  const handlePriceDoubleClick = (productId: string, currentPrice: number) => {
    setEditingPriceId(productId);
    setEditingPrice(currentPrice);
    setTimeout(() => priceInputRef.current?.focus(), 50);
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

  // Update item warranty
  const updateItemWarranty = (productId: string, warrantyCode: string) => {
    const option = warrantyOptions.find(o => o.value === warrantyCode);
    let warrantyDueDate = '';
    
    if (option && option.days > 0) {
      const date = new Date(buyingDate);
      date.setDate(date.getDate() + option.days);
      warrantyDueDate = date.toISOString().split('T')[0];
    }

    setItems(items.map(item => 
      item.productId === productId 
        ? { ...item, warrantyDueDate }
        : item
    ));
  };

  const removeItem = (productId: string) => {
    setItems(items.filter((i) => i.productId !== productId));
  };

  // Calculations
  const subtotal = items.reduce((sum, item) => sum + item.total, 0);
  const discountAmount = discountType === 'percentage' 
    ? subtotal * (discount / 100) 
    : discountType === 'fixed' ? discount : 0;
  const taxableAmount = subtotal - discountAmount;
  const tax = enableTax ? taxableAmount * (taxRate / 100) : 0;
  const total = taxableAmount + tax;

  // State for API submission
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Generate invoice number (8-digit format)
  const generateInvoiceNumber = () => {
    return Date.now().toString().slice(-8);
  };

  const handleCreateInvoice = async () => {
    if ((!selectedCustomer && !isWalkIn) || items.length === 0) return;

    const customerName = isWalkIn ? 'Walk-in Customer' : (currentCustomer?.name || 'Unknown');
    const customerId = isWalkIn ? null : selectedCustomer; // null for walk-in customers
    const now = new Date().toISOString();
    
    setIsSubmitting(true);

    // Try to create via API first
    try {
      // Prepare invoice data
      const invoiceData = {
        customerId: customerId || undefined, // undefined for walk-in (omit from request)
        items: items.map(item => ({
          productId: item.productId || undefined, // undefined for quick-add items
          productName: item.productName,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          originalPrice: item.originalPrice,
          discount: item.originalPrice ? item.originalPrice - item.unitPrice : 0,
          total: item.total,
          warrantyDueDate: item.warrantyDueDate || undefined,
        })),
        subtotal: Math.round(subtotal * 100) / 100,
        tax: Math.round(tax * 100) / 100,
        discount: Math.round(discountAmount * 100) / 100,
        total: Math.round(total * 100) / 100,
        dueDate,
        paymentMethod: denormalizePaymentMethod(paymentMethod),
        salesChannel: denormalizeSalesChannel(salesChannel),
        paidAmount: paymentMethod === 'credit' ? 0 : Math.round(total * 100) / 100,
        notes: undefined,
      };
      
      console.log('📤 Sending invoice data to API:', JSON.stringify(invoiceData, null, 2));
      
      // Try API for all invoices (including walk-in with null customerId)
      // Pass shopId for SuperAdmin viewing other shops
      const apiInvoice = await invoiceService.create(invoiceData, currentShopId || undefined);

      console.log('✅ Invoice created via API:', apiInvoice.invoiceNumber);
      
      toast.success('Invoice created successfully', {
        description: `Invoice #${apiInvoice.invoiceNumber} has been created.`,
      });
      
      // Convert API response to frontend format for print preview
      const convertedInvoice = convertAPIInvoiceToFrontend(apiInvoice);
      
      // Add the new invoice to the cache so it appears immediately on the invoices page
      setCachedInvoices(prev => [convertedInvoice, ...prev]);
      
      // CRITICAL: Refresh products to get updated stock values from database
      loadProducts(true).catch(err => console.warn('Product refresh warning:', err));
      
      setCreatedInvoice(convertedInvoice as Invoice & { buyingDate: string });
      setShowPrintPreview(true);
      setIsSubmitting(false);
      return;
    } catch (error) {
      console.warn('⚠️ API not available, creating invoice locally:', error);
      toast.error('Failed to save to database', {
        description: 'Invoice will be created locally. ' + (error instanceof Error ? error.message : ''),
      });
      // Continue with local creation
    }

    // Local invoice creation (fallback or for walk-in customers)
    const invoice: Invoice & { buyingDate: string } = {
      id: generateInvoiceNumber(),
      customerId: customerId || 'walk-in', // Use 'walk-in' for local storage
      customerName,
      items: items.map(item => ({
        productId: item.productId,
        productName: item.productName,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        total: item.total,
        warrantyDueDate: item.warrantyDueDate,
        originalPrice: item.originalPrice !== item.unitPrice ? item.originalPrice : undefined,
      })),
      subtotal: Math.round(subtotal * 100) / 100,
      tax: Math.round(tax * 100) / 100,
      total: Math.round(total * 100) / 100,
      date: new Date().toISOString().split('T')[0],
      buyingDate,
      dueDate,
      status: paymentMethod === 'credit' ? 'unpaid' : 'fullpaid',
      paidAmount: paymentMethod === 'credit' ? 0 : Math.round(total * 100) / 100,
      paymentMethod,
      salesChannel,
    };

    // Add to mockInvoices
    mockInvoices.unshift(invoice);
    
    // Update product stock - decrease stock for sold items
    items.forEach(item => {
      const productIndex = products.findIndex((p: Product) => p.id === item.productId);
      if (productIndex !== -1) {
        const product = products[productIndex];
        
        // Decrease stock
        product.stock = Math.max(0, (product.stock || 0) - item.quantity);
        
        // Update total sold tracking
        product.totalSold = (product.totalSold || 0) + item.quantity;
        product.updatedAt = now;
      }
    });
    
    // Show print preview
    setCreatedInvoice(invoice);
    setShowPrintPreview(true);
    setIsSubmitting(false);
  };

  const handlePrint = () => {
    window.print();
  };

  const handleClosePrintAndNavigate = () => {
    setShowPrintPreview(false);
    if (createdInvoice) {
      navigate(`/invoices/${createdInvoice.id}`);
    }
  };

  const canProceedToStep2 = selectedCustomer || isWalkIn;
  const canProceedToStep3 = items.length > 0;

  // Focus search on step changes
  useEffect(() => {
    if (step === 1 && !isWalkIn) {
      setTimeout(() => customerSearchRef.current?.focus(), 100);
    }
    if (step === 2) {
      setTimeout(() => productSearchRef.current?.focus(), 100);
    }
  }, [step, isWalkIn]);

  // Get customer for print
  const printCustomer = useMemo(() => {
    if (!createdInvoice) return null;
    if (createdInvoice.customerId === 'walk-in') {
      return { 
        id: 'walk-in', 
        name: 'Walk-in Customer', 
        email: '', 
        phone: '', 
        totalSpent: 0, 
        totalOrders: 0,
        creditBalance: 0,
        creditLimit: 0,
        creditStatus: 'clear' as const,
        customerType: 'REGULAR' as const
      };
    }
    return customers.find(c => c.id === createdInvoice.customerId) || null;
  }, [createdInvoice, customers]);

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

    // Empty cells for days before first day
    for (let i = 0; i < firstDay; i++) {
      days.push(<div key={`empty-${i}`} className="w-8 h-8" />);
    }

    // Day cells
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
      <div className={`absolute z-50 mt-2 p-4 rounded-2xl shadow-2xl border ${
        theme === 'dark' 
          ? 'bg-slate-800 border-slate-700' 
          : 'bg-white border-emerald-100'
      }`}>
        {/* Header */}
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

        {/* Week days */}
        <div className="grid grid-cols-7 gap-1 mb-2">
          {weekDays.map(day => (
            <div key={day} className={`w-8 h-8 flex items-center justify-center text-xs font-medium ${
              theme === 'dark' ? 'text-emerald-400' : 'text-emerald-600'
            }`}>
              {day}
            </div>
          ))}
        </div>

        {/* Days grid */}
        <div className="grid grid-cols-7 gap-1">
          {days}
        </div>

        {/* Quick actions */}
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

  // Themed input class
  const inputClass = `w-full px-3 py-2.5 text-sm border-2 rounded-xl focus:outline-none transition-all ${
    theme === 'dark'
      ? 'border-slate-600 bg-slate-700/50 text-white placeholder-slate-500 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20'
      : 'border-slate-200 bg-white text-slate-900 placeholder-slate-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20'
  }`;

  // Loading state while fetching data
  if (isLoadingData) {
    return (
      <div className="h-[calc(100vh-120px)] flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className={`w-10 h-10 mx-auto mb-4 animate-spin ${theme === 'dark' ? 'text-emerald-400' : 'text-emerald-500'}`} />
          <p className={`text-lg font-medium ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>Loading...</p>
          <p className={`text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>Fetching customers and products</p>
        </div>
      </div>
    );
  }

  // Print Preview Modal
  if (showPrintPreview && createdInvoice) {
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
                <Receipt className="w-5 h-5 text-emerald-500" />
              </div>
              <div>
                <h2 className={`text-lg font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                  Invoice Created Successfully!
                </h2>
                <p className={`text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                  {createdInvoice.id}
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
              <PrintableInvoice invoice={createdInvoice as any} customer={printCustomer} branding={branding} />
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
          onClick={() => navigate('/invoices')}
          className={`p-2 rounded-xl transition-colors ${
            theme === 'dark' ? 'hover:bg-slate-700 text-slate-400' : 'hover:bg-slate-100 text-slate-600'
          }`}
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        
        <div className="flex items-center gap-2">
          <FileText className="w-5 h-5 text-emerald-500" />
          <span className={`font-semibold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
            New Invoice
          </span>
        </div>

        {/* Inline Step Indicator */}
        <div className="flex items-center gap-1 ml-auto">
          {[1, 2, 3].map((s) => (
            <React.Fragment key={s}>
              <button
                onClick={() => {
                  if (s === 1 || (s === 2 && canProceedToStep2) || (s === 3 && canProceedToStep2 && canProceedToStep3)) {
                    setStep(s as Step);
                  }
                }}
                disabled={(s === 2 && !canProceedToStep2) || (s === 3 && (!canProceedToStep2 || !canProceedToStep3))}
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
                  s === 1 ? <User className="w-3.5 h-3.5" /> :
                  s === 2 ? <Package className="w-3.5 h-3.5" /> :
                  <Receipt className="w-3.5 h-3.5" />
                )}
                <span className="hidden sm:inline">
                  {s === 1 ? 'Customer' : s === 2 ? 'Products' : 'Review'}
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
          {/* Step 1: Customer Selection */}
          {step === 1 && (
            <div className="flex-1 flex flex-col p-4 overflow-hidden">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <User className="w-5 h-5 text-emerald-500" />
                  <span className={`font-semibold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                    Select Customer
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowCustomerFormModal(true)}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                      theme === 'dark' ? 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30' : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100'
                    }`}
                    title="Register a new customer"
                  >
                    <UserPlus className="w-4 h-4" />
                    Register
                  </button>
                  <button
                    onClick={() => { setIsWalkIn(!isWalkIn); setSelectedCustomer(''); }}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                      isWalkIn
                        ? 'bg-purple-500 text-white'
                        : theme === 'dark' ? 'bg-slate-700 text-slate-300 hover:bg-slate-600' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    <UserX className="w-4 h-4" />
                    Walk-in
                  </button>
                </div>
              </div>

              {isWalkIn ? (
                <div className={`flex-1 flex items-center justify-center rounded-xl border-2 border-dashed ${
                  theme === 'dark' ? 'border-purple-500/50 bg-purple-500/5' : 'border-purple-200 bg-purple-50'
                }`}>
                  <div className="text-center">
                    <UserX className="w-16 h-16 mx-auto mb-3 text-purple-400" />
                    <h4 className={`text-lg font-semibold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                      Walk-in Customer
                    </h4>
                    <p className={`text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                      Quick sale without customer details
                    </p>
                  </div>
                </div>
              ) : (
                <>
                  <div className="relative mb-3">
                    <Search className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                    <input
                      ref={customerSearchRef}
                      type="text"
                      placeholder="Search customers..."
                      value={customerSearch}
                      onChange={(e) => setCustomerSearch(e.target.value)}
                      className={`${inputClass} pl-9`}
                    />
                  </div>

                  <div className="flex-1 overflow-y-auto space-y-2 pr-1">
                    {filteredCustomers.map((customer) => (
                      <button
                        key={customer.id}
                        onClick={() => setSelectedCustomer(customer.id)}
                        className={`w-full p-3 rounded-xl text-left transition-all flex items-center gap-3 ${
                          selectedCustomer === customer.id
                            ? 'bg-emerald-500/20 border-2 border-emerald-500'
                            : theme === 'dark' 
                              ? 'bg-slate-700/50 hover:bg-slate-700 border-2 border-transparent' 
                              : 'bg-slate-50 hover:bg-slate-100 border-2 border-transparent'
                        }`}
                      >
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center font-bold ${
                          theme === 'dark' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-emerald-100 text-emerald-600'
                        }`}>
                          {customer.name.charAt(0)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`font-medium truncate ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                            {customer.name}
                          </p>
                          <p className={`text-xs truncate ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                            {customer.phone} • {customer.email}
                          </p>
                        </div>
                        {selectedCustomer === customer.id && (
                          <CheckCircle className="w-5 h-5 text-emerald-500" />
                        )}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

          {/* Step 2: Product Selection */}
          {step === 2 && (
            <div className="flex-1 flex flex-col p-4 overflow-hidden">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Package className="w-5 h-5 text-teal-500" />
                  <span className={`font-semibold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                    Add Products
                  </span>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    theme === 'dark' ? 'bg-slate-700 text-slate-400' : 'bg-slate-100 text-slate-500'
                  }`}>
                    Double-click price to edit
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowProductFormModal(true)}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                      theme === 'dark' ? 'bg-teal-500/20 text-teal-400 hover:bg-teal-500/30' : 'bg-teal-50 text-teal-600 hover:bg-teal-100'
                    }`}
                    title="Add a new product to inventory"
                  >
                    <Plus className="w-4 h-4" />
                    Add Product
                  </button>
                  <button
                    onClick={() => setShowQuickAdd(!showQuickAdd)}
                    className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                      showQuickAdd
                        ? 'bg-amber-500 text-white'
                        : theme === 'dark' ? 'bg-amber-500/20 text-amber-400' : 'bg-amber-50 text-amber-600'
                    }`}
                  >
                    <Zap className="w-4 h-4" />
                    Quick Add
                  </button>
                </div>
              </div>

              {/* Quick Add Panel */}
              {showQuickAdd && (
                <div className={`p-3 rounded-xl mb-3 ${
                  theme === 'dark' ? 'bg-amber-500/10 border-2 border-amber-500/30' : 'bg-amber-50 border-2 border-amber-200'
                }`}>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Item name..."
                      value={quickAddName}
                      onChange={(e) => setQuickAddName(e.target.value)}
                      className={inputClass}
                    />
                    <input
                      type="number"
                      placeholder="Price"
                      value={quickAddPrice || ''}
                      onChange={(e) => setQuickAddPrice(parseFloat(e.target.value) || 0)}
                      className={`${inputClass} w-28`}
                    />
                    <input
                      type="number"
                      placeholder="Qty"
                      min="1"
                      value={quickAddQty}
                      onChange={(e) => setQuickAddQty(parseInt(e.target.value) || 1)}
                      className={`${inputClass} w-20`}
                    />
                    <button
                      onClick={addQuickItem}
                      disabled={!quickAddName.trim() || quickAddPrice <= 0}
                      className="px-4 py-2 bg-amber-500 text-white rounded-xl hover:bg-amber-600 disabled:opacity-50 transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}

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

              <div className="flex-1 overflow-y-auto space-y-2 pr-1">
                {filteredProducts.map((product) => {
                  // Calculate available stock considering what's already in invoice
                  const qtyInInvoice = items.filter(i => i.productId === product.id).reduce((sum, i) => sum + i.quantity, 0);
                  const remainingStock = product.stock - qtyInInvoice;
                  const isLowStock = remainingStock > 0 && remainingStock <= 5;
                  const isOutOfStock = remainingStock <= 0;
                  
                  return (
                    <button
                      key={product.id}
                      onClick={() => addItem(product)}
                      disabled={isOutOfStock}
                      className={`w-full p-3 rounded-xl text-left transition-all flex items-center gap-3 ${
                        isOutOfStock 
                          ? 'opacity-50 cursor-not-allowed'
                          : theme === 'dark' 
                            ? 'bg-slate-700/50 hover:bg-slate-700' 
                            : 'bg-slate-50 hover:bg-slate-100'
                      }`}
                    >
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                        theme === 'dark' ? 'bg-teal-500/20' : 'bg-teal-100'
                      }`}>
                        <Package className="w-5 h-5 text-teal-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`font-medium truncate ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                          {product.name}
                        </p>
                        <div className="flex items-center gap-2">
                          <p className={`text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                            {product.serialNumber}
                          </p>
                          <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${
                            isOutOfStock
                              ? (theme === 'dark' ? 'bg-red-500/20 text-red-400' : 'bg-red-50 text-red-600')
                              : isLowStock
                                ? (theme === 'dark' ? 'bg-amber-500/20 text-amber-400' : 'bg-amber-50 text-amber-600')
                                : (theme === 'dark' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-emerald-50 text-emerald-600')
                          }`}>
                            {isOutOfStock ? 'Out of Stock' : `${remainingStock} left`}
                          </span>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-emerald-500">
                          Rs. {product.price.toLocaleString()}
                        </p>
                      </div>
                      <Plus className={`w-5 h-5 ${isOutOfStock ? 'text-slate-400' : 'text-emerald-500'}`} />
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Step 3: Review */}
          {step === 3 && (
            <div className="flex-1 flex flex-col p-4 overflow-hidden">
              <div className="flex items-center gap-2 mb-4">
                <Receipt className="w-5 h-5 text-emerald-500" />
                <span className={`font-semibold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                  Review & Complete
                </span>
              </div>

              <div className="flex-1 overflow-y-auto space-y-5 pr-1">
                {/* Dates Section */}
                <div className="grid grid-cols-2 gap-4">
                  {/* Buying Date */}
                  <div className="relative">
                    <label className={`text-sm font-medium mb-2 block ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                      <Calendar className="w-4 h-4 inline mr-1" />
                      Buying Date
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        readOnly
                        value={new Date(buyingDate).toLocaleDateString('en-GB')}
                        onClick={() => { setShowBuyingCalendar(!showBuyingCalendar); setShowDueCalendar(false); setCalendarMonth(new Date(buyingDate)); }}
                        className={`${inputClass} cursor-pointer pr-10`}
                      />
                      <Calendar className={`absolute right-3 top-3 w-4 h-4 ${theme === 'dark' ? 'text-emerald-400' : 'text-emerald-500'}`} />
                    </div>
                    {showBuyingCalendar && renderCalendar(buyingDate, setBuyingDate, setShowBuyingCalendar)}
                  </div>

                  {/* Due Date */}
                  <div className="relative">
                    <label className={`text-sm font-medium mb-2 block ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                      <Calendar className="w-4 h-4 inline mr-1" />
                      Due Date
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        readOnly
                        value={new Date(dueDate).toLocaleDateString('en-GB')}
                        onClick={() => { setShowDueCalendar(!showDueCalendar); setShowBuyingCalendar(false); setCalendarMonth(new Date(dueDate)); }}
                        className={`${inputClass} cursor-pointer pr-10`}
                      />
                      <Calendar className={`absolute right-3 top-3 w-4 h-4 ${theme === 'dark' ? 'text-emerald-400' : 'text-emerald-500'}`} />
                    </div>
                    {showDueCalendar && renderCalendar(dueDate, setDueDate, setShowDueCalendar)}
                  </div>
                </div>

                {/* Payment Method */}
                <div>
                  <label className={`text-sm font-medium mb-2 block ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                    Payment Method
                  </label>
                  <div className="grid grid-cols-4 gap-2">
                    {[
                      { key: 'cash', label: 'Cash', icon: Banknote },
                      { key: 'card', label: 'Card', icon: CreditCard },
                      { key: 'bank_transfer', label: 'Bank', icon: Building2 },
                      { key: 'credit', label: 'Credit', icon: Receipt },
                    ].map(({ key, label, icon: Icon }) => {
                      const isCreditDisabled = key === 'credit' && isWalkIn;
                      return (
                        <button
                          key={key}
                          onClick={() => !isCreditDisabled && setPaymentMethod(key as typeof paymentMethod)}
                          disabled={isCreditDisabled}
                          title={isCreditDisabled ? 'Credit not available for walk-in customers' : undefined}
                          className={`p-3 rounded-xl text-center transition-all border-2 ${
                            isCreditDisabled
                              ? 'opacity-40 cursor-not-allowed bg-slate-500/20 border-slate-500/30 text-slate-400'
                              : paymentMethod === key
                                ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white border-transparent'
                                : theme === 'dark' 
                                  ? 'bg-slate-700/50 hover:bg-slate-700 text-slate-300 border-slate-600' 
                                  : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200'
                          }`}
                        >
                          <Icon className="w-5 h-5 mx-auto mb-1" />
                          <span className="text-xs font-medium">{label}</span>
                        </button>
                      );
                    })}
                  </div>
                  {isWalkIn && (
                    <p className={`text-xs mt-2 flex items-center gap-1 ${theme === 'dark' ? 'text-amber-400' : 'text-amber-600'}`}>
                      <AlertCircle className="w-3 h-3" />
                      Credit payment is not available for walk-in customers
                    </p>
                  )}
                </div>

                {/* Sales Channel */}
                <div>
                  <label className={`text-sm font-medium mb-2 block ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                    Sales Channel
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => setSalesChannel('on-site')}
                      className={`p-3 rounded-xl text-center transition-all border-2 flex items-center justify-center gap-2 ${
                        salesChannel === 'on-site'
                          ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white border-transparent'
                          : theme === 'dark' 
                            ? 'bg-slate-700/50 hover:bg-slate-700 text-slate-300 border-slate-600' 
                            : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200'
                      }`}
                    >
                      <Store className="w-5 h-5" />
                      <span className="text-sm font-medium">On Site</span>
                    </button>
                    <button
                      onClick={() => setSalesChannel('online')}
                      className={`p-3 rounded-xl text-center transition-all border-2 flex items-center justify-center gap-2 ${
                        salesChannel === 'online'
                          ? 'bg-gradient-to-r from-blue-500 to-indigo-500 text-white border-transparent'
                          : theme === 'dark' 
                            ? 'bg-slate-700/50 hover:bg-slate-700 text-slate-300 border-slate-600' 
                            : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200'
                      }`}
                    >
                      <Globe className="w-5 h-5" />
                      <span className="text-sm font-medium">Online</span>
                    </button>
                  </div>
                </div>

                {/* Discount */}
                <div>
                  <label className={`text-sm font-medium mb-2 block ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                    Discount
                  </label>
                  <div className="flex gap-2">
                    <SearchableSelect
                      options={[
                        { value: 'none', label: 'No Discount' },
                        { value: 'percentage', label: 'Percentage (%)' },
                        { value: 'fixed', label: 'Fixed Amount' },
                      ]}
                      value={discountType}
                      onValueChange={setDiscountType}
                      placeholder="Select discount type"
                      theme={theme === 'dark' ? 'dark' : 'light'}
                      triggerClassName="flex-1"
                    />
                    {discountType !== 'none' && (
                      <input
                        type="number"
                        value={discount || ''}
                        onChange={(e) => setDiscount(parseFloat(e.target.value) || 0)}
                        placeholder={discountType === 'percentage' ? '%' : 'Rs.'}
                        className={`${inputClass} w-28`}
                      />
                    )}
                  </div>
                </div>

                {/* Tax Toggle */}
                <div className={`flex items-center justify-between p-4 rounded-xl ${
                  theme === 'dark' ? 'bg-slate-700/50' : 'bg-slate-50'
                }`}>
                  <label className={`text-sm font-medium ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                    Apply Tax ({taxRate}%)
                  </label>
                  <button
                    onClick={() => setEnableTax(!enableTax)}
                    className={`w-14 h-7 rounded-full transition-all ${
                      enableTax 
                        ? 'bg-gradient-to-r from-emerald-500 to-teal-500' 
                        : theme === 'dark' ? 'bg-slate-600' : 'bg-slate-300'
                    }`}
                  >
                    <div className={`w-6 h-6 bg-white rounded-full shadow-md transition-transform ${
                      enableTax ? 'translate-x-7' : 'translate-x-0.5'
                    }`} />
                  </button>
                </div>

                {/* Notes */}
                <div>
                  <label className={`text-sm font-medium mb-2 block ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                    Notes (Optional)
                  </label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Additional notes for this invoice..."
                    rows={3}
                    className={inputClass}
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Resizer Handle */}
        <div
          onMouseDown={handleMouseDown}
          className={`w-3 cursor-col-resize flex items-center justify-center transition-colors flex-shrink-0 mx-1 rounded-full ${
            isResizing
              ? 'bg-emerald-500'
              : theme === 'dark' ? 'bg-slate-700 hover:bg-emerald-500/50' : 'bg-slate-200 hover:bg-emerald-500/50'
          }`}
        >
          <GripVertical className={`w-4 h-4 ${isResizing ? 'text-white' : 'text-slate-400'}`} />
        </div>

        {/* Right Panel - Cart Summary (Always Visible) */}
        <div 
          className={`rounded-xl overflow-hidden flex flex-col ${
            theme === 'dark' ? 'bg-slate-800/50' : 'bg-white shadow-sm'
          }`}
          style={{ width: `${100 - leftPanelWidth}%` }}
        >
          {/* Customer Info */}
          <div className={`p-3 border-b ${theme === 'dark' ? 'border-slate-700' : 'border-slate-200'}`}>
            <div className="flex items-center gap-2">
              {isWalkIn ? (
                <>
                  <UserX className="w-4 h-4 text-purple-400" />
                  <span className={`text-sm font-medium ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                    Walk-in Customer
                  </span>
                </>
              ) : currentCustomer ? (
                <>
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold ${
                    theme === 'dark' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-emerald-100 text-emerald-600'
                  }`}>
                    {currentCustomer.name.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium truncate ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                      {currentCustomer.name}
                    </p>
                    <p className={`text-xs truncate ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                      {currentCustomer.phone}
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <User className="w-4 h-4 text-slate-400" />
                  <span className={`text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                    No customer selected
                  </span>
                </>
              )}
            </div>
          </div>

          {/* Cart Items */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {items.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <ShoppingCart className={`w-10 h-10 mb-2 ${theme === 'dark' ? 'text-slate-600' : 'text-slate-300'}`} />
                <p className={`text-sm ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>
                  Cart is empty
                </p>
              </div>
            ) : (
              items.map((item) => (
                <div
                  key={item.productId}
                  className={`p-3 rounded-xl ${theme === 'dark' ? 'bg-slate-700/50' : 'bg-slate-50'}`}
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <p className={`text-sm font-medium flex-1 ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                      {item.productName}
                    </p>
                    <button
                      onClick={() => removeItem(item.productId)}
                      className="text-red-500 hover:text-red-600"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  
                  {/* Price - Double click to edit */}
                  <div className="mb-2">
                    {editingPriceId === item.productId ? (
                      <div className="flex items-center gap-1">
                        <span className={`text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>Rs.</span>
                        <input
                          ref={priceInputRef}
                          type="number"
                          value={editingPrice}
                          onChange={(e) => setEditingPrice(parseFloat(e.target.value) || 0)}
                          onBlur={() => handlePriceChange(item.productId)}
                          onKeyDown={(e) => handlePriceKeyDown(e, item.productId)}
                          className={`w-24 px-2 py-1 text-sm border-2 rounded-lg ${
                            theme === 'dark'
                              ? 'border-emerald-500 bg-slate-800 text-white'
                              : 'border-emerald-500 bg-white text-slate-900'
                          }`}
                        />
                      </div>
                    ) : (
                      <div
                        onDoubleClick={() => handlePriceDoubleClick(item.productId, item.unitPrice)}
                        className={`inline-flex items-center gap-1 cursor-pointer group ${
                          item.isCustomPrice ? 'text-amber-500' : theme === 'dark' ? 'text-slate-300' : 'text-slate-600'
                        }`}
                      >
                        <span className="text-xs">
                          {item.originalPrice && item.originalPrice !== item.unitPrice ? (
                            <>
                              <span className="line-through text-red-400 mr-1">Rs. {item.originalPrice.toLocaleString()}</span>
                              <span className="text-emerald-400">Rs. {item.unitPrice.toLocaleString()}</span>
                            </>
                          ) : (
                            <>Rs. {item.unitPrice.toLocaleString()} /unit</>
                          )}
                        </span>
                        <Edit2 className="w-3 h-3 opacity-0 group-hover:opacity-50 transition-opacity" />
                        {item.isCustomPrice && (
                          <span className="text-[10px] px-1 py-0.5 bg-amber-500/20 rounded text-amber-500">Custom</span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Warranty Select */}
                  <div className="mb-2">
                    <div className="flex items-center gap-1 mb-1">
                      <Shield className={`w-3 h-3 ${theme === 'dark' ? 'text-emerald-400' : 'text-emerald-500'}`} />
                      <span className={`text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>Warranty</span>
                    </div>
                    <SearchableSelect
                      options={warrantyOptions.map(opt => ({ value: opt.value, label: opt.label }))}
                      value={warrantyOptions.find(o => {
                        if (!item.warrantyDueDate) return o.value === '';
                        const buyDate = new Date(buyingDate);
                        const warDate = new Date(item.warrantyDueDate);
                        const diffDays = Math.round((warDate.getTime() - buyDate.getTime()) / (1000 * 60 * 60 * 24));
                        return Math.abs(o.days - diffDays) < 30;
                      })?.value || ''}
                      onValueChange={val => updateItemWarranty(item.productId, val)}
                      placeholder="Warranty"
                      theme={theme === 'dark' ? 'dark' : 'light'}
                      triggerClassName="w-full text-xs"
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => updateItemQuantity(item.productId, item.quantity - 1)}
                        className={`w-6 h-6 rounded-lg flex items-center justify-center ${
                          theme === 'dark' ? 'bg-slate-600 hover:bg-slate-500' : 'bg-slate-200 hover:bg-slate-300'
                        }`}
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className={`w-8 text-center text-sm font-medium ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                        {item.quantity}
                      </span>
                      <button
                        onClick={() => updateItemQuantity(item.productId, item.quantity + 1)}
                        className={`w-6 h-6 rounded-lg flex items-center justify-center ${
                          theme === 'dark' ? 'bg-slate-600 hover:bg-slate-500' : 'bg-slate-200 hover:bg-slate-300'
                        }`}
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                    <span className="text-sm font-bold text-emerald-500">
                      Rs. {item.total.toLocaleString()}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Totals */}
          <div className={`p-3 border-t space-y-2 ${theme === 'dark' ? 'border-slate-700' : 'border-slate-200'}`}>
            <div className="flex justify-between text-sm">
              <span className={theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}>Subtotal</span>
              <span className={theme === 'dark' ? 'text-white' : 'text-slate-900'}>
                Rs. {subtotal.toLocaleString()}
              </span>
            </div>
            {discountAmount > 0 && (
              <div className="flex justify-between text-sm">
                <span className={theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}>Discount</span>
                <span className="text-red-500">-Rs. {discountAmount.toLocaleString()}</span>
              </div>
            )}
            {enableTax && tax > 0 && (
              <div className="flex justify-between text-sm">
                <span className={theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}>Tax ({taxRate}%)</span>
                <span className={theme === 'dark' ? 'text-white' : 'text-slate-900'}>
                  Rs. {tax.toLocaleString()}
                </span>
              </div>
            )}
            <div className={`flex justify-between pt-2 border-t ${theme === 'dark' ? 'border-slate-700' : 'border-slate-200'}`}>
              <span className={`font-semibold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>Total</span>
              <span className="text-lg font-bold text-emerald-500">
                Rs. {total.toLocaleString()}
              </span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className={`p-3 border-t ${theme === 'dark' ? 'border-slate-700' : 'border-slate-200'}`}>
            {step < 3 ? (
              <button
                onClick={() => setStep((step + 1) as Step)}
                disabled={step === 1 ? !canProceedToStep2 : !canProceedToStep3}
                className="w-full py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                Continue
                <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={handleCreateInvoice}
                disabled={items.length === 0 || isSubmitting}
                className="w-full py-3 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white rounded-xl font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Creating...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4" />
                    Create Invoice
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Customer Registration Modal */}
      <CustomerFormModal
        isOpen={showCustomerFormModal}
        onClose={() => setShowCustomerFormModal(false)}
        onSave={handleNewCustomerSave}
        shopId={currentShopId || undefined}
      />

      {/* Product Creation Modal */}
      <ProductFormModal
        isOpen={showProductFormModal}
        onClose={() => setShowProductFormModal(false)}
        onSave={handleNewProductSave}
        autoAddToInvoice={true}
        shopId={currentShopId || undefined}
      />
    </div>
  );
};

export default CreateInvoice;
