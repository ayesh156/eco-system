import React, { useState, useMemo } from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { 
  ChevronLeft, ChevronRight, User, Package, FileText, 
  Search, Plus, Trash2, Calculator
} from 'lucide-react';

interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
  address?: string;
}

interface Product {
  id: string;
  name: string;
  price: number;
  stock: number;
}

interface EstimateItem {
  id: string;
  productId: string;
  productName: string;
  description: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  total: number;
}

interface EstimateWizardModalProps {
  isOpen: boolean;
  onClose: () => void;
  customers: Customer[];
  products: Product[];
  onSave: (estimate: any) => void;
  editingEstimate?: any;
}

type Step = 1 | 2 | 3;

export const EstimateWizardModal: React.FC<EstimateWizardModalProps> = ({
  isOpen,
  onClose,
  customers,
  products,
  onSave,
  editingEstimate
}) => {
  const { theme } = useTheme();
  const [step, setStep] = useState<Step>(1);
  
  // Step 1: Customer Selection
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [customerSearch, setCustomerSearch] = useState('');
  
  // Step 2: Items
  const [items, setItems] = useState<EstimateItem[]>([]);
  const [productSearch, setProductSearch] = useState('');
  const [selectedProductId, setSelectedProductId] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [customPrice, setCustomPrice] = useState('');
  const [itemDescription, setItemDescription] = useState('');
  
  // Step 3: Details
  const [estimateDate, setEstimateDate] = useState(new Date().toISOString().split('T')[0]);
  const [expiryDate, setExpiryDate] = useState(
    new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  );
  const [discount, setDiscount] = useState(0);
  const [discountType, setDiscountType] = useState<'percentage' | 'fixed'>('percentage');
  const [notes, setNotes] = useState('');
  const [terms, setTerms] = useState('Valid for 30 days from the date of issue');
  const [taxPercentage, setTaxPercentage] = useState(0);

  // Filter customers
  const filteredCustomers = useMemo(() => {
    if (!customerSearch.trim()) return customers;
    const searchLower = customerSearch.toLowerCase();
    return customers.filter(c => 
      c.name.toLowerCase().includes(searchLower) ||
      c.email.toLowerCase().includes(searchLower)
    );
  }, [customers, customerSearch]);

  // Filter products
  const filteredProducts = useMemo(() => {
    if (!productSearch.trim()) return products;
    const searchLower = productSearch.toLowerCase();
    return products.filter(p => 
      p.name.toLowerCase().includes(searchLower)
    );
  }, [products, productSearch]);

  // Selected customer
  const selectedCustomer = customers.find(c => c.id === selectedCustomerId);
  
  // Selected product
  const selectedProduct = products.find(p => p.id === selectedProductId);

  // Add item
  const addItem = () => {
    if (!selectedProduct || quantity <= 0) return;
    
    const unitPrice = customPrice ? parseFloat(customPrice) : selectedProduct.price;
    const newItem: EstimateItem = {
      id: Date.now().toString(),
      productId: selectedProduct.id,
      productName: selectedProduct.name,
      description: itemDescription || selectedProduct.name,
      quantity,
      unitPrice,
      discount: 0,
      total: quantity * unitPrice
    };
    
    setItems([...items, newItem]);
    setSelectedProductId('');
    setQuantity(1);
    setCustomPrice('');
    setItemDescription('');
    setProductSearch('');
  };

  // Remove item
  const removeItem = (id: string) => {
    setItems(items.filter(item => item.id !== id));
  };

  // Update item quantity
  const updateItemQuantity = (id: string, newQuantity: number) => {
    if (newQuantity <= 0) return;
    setItems(items.map(item => 
      item.id === id 
        ? { ...item, quantity: newQuantity, total: newQuantity * item.unitPrice }
        : item
    ));
  };

  // Update item price
  const updateItemPrice = (id: string, newPrice: number) => {
    if (newPrice < 0) return;
    setItems(items.map(item => 
      item.id === id 
        ? { ...item, unitPrice: newPrice, total: item.quantity * newPrice }
        : item
    ));
  };

  // Calculate totals
  const subtotal = items.reduce((sum, item) => sum + item.total, 0);
  const discountAmount = discountType === 'percentage' 
    ? (subtotal * discount) / 100 
    : discount;
  const afterDiscount = subtotal - discountAmount;
  const taxAmount = (afterDiscount * taxPercentage) / 100;
  const total = afterDiscount + taxAmount;

  // Format currency
  const formatCurrency = (amount: number): string => {
    return `Rs. ${amount.toLocaleString('en-LK')}`;
  };

  // Handle save
  const handleSave = () => {
    if (!selectedCustomer || items.length === 0) return;
    
    const estimate = {
      id: editingEstimate?.id || `est-${Date.now()}`,
      estimateNumber: editingEstimate?.estimateNumber || `EST-${new Date().getFullYear()}-${String(Date.now()).slice(-4)}`,
      customerName: selectedCustomer.name,
      customerEmail: selectedCustomer.email,
      date: estimateDate,
      expiryDate,
      items,
      subtotal,
      discount: discountAmount,
      tax: taxAmount,
      total,
      status: 'draft',
      notes,
      terms
    };
    
    onSave(estimate);
    handleClose();
  };

  // Handle close
  const handleClose = () => {
    setStep(1);
    setSelectedCustomerId('');
    setCustomerSearch('');
    setItems([]);
    setProductSearch('');
    setSelectedProductId('');
    setQuantity(1);
    setCustomPrice('');
    setItemDescription('');
    setDiscount(0);
    setNotes('');
    onClose();
  };

  // Can proceed to next step
  const canProceed = () => {
    if (step === 1) return selectedCustomerId !== '';
    if (step === 2) return items.length > 0;
    return true;
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className={`max-w-4xl max-h-[90vh] overflow-hidden ${
        theme === 'dark' 
          ? 'bg-slate-900 border-slate-700/50' 
          : 'bg-white border-slate-200'
      }`}>
        <DialogHeader>
          <DialogTitle className={`text-xl font-semibold ${
            theme === 'dark' ? 'text-white' : 'text-slate-900'
          }`}>
            {editingEstimate ? 'Edit Estimate' : 'Create New Estimate'}
          </DialogTitle>
        </DialogHeader>

        {/* Progress Steps */}
        <div className="flex items-center justify-between mb-6">
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex items-center flex-1">
              <div className={`flex items-center justify-center w-10 h-10 rounded-full font-semibold transition-all ${
                step >= s
                  ? 'bg-gradient-to-r from-emerald-500 to-blue-500 text-white'
                  : theme === 'dark'
                  ? 'bg-slate-800 text-slate-500'
                  : 'bg-slate-100 text-slate-400'
              }`}>
                {s === 1 ? <User className="w-5 h-5" /> : 
                 s === 2 ? <Package className="w-5 h-5" /> : 
                 <FileText className="w-5 h-5" />}
              </div>
              {s < 3 && (
                <div className={`flex-1 h-1 mx-2 rounded-full ${
                  step > s
                    ? 'bg-gradient-to-r from-emerald-500 to-blue-500'
                    : theme === 'dark' ? 'bg-slate-800' : 'bg-slate-200'
                }`} />
              )}
            </div>
          ))}
        </div>

        <div className="overflow-y-auto max-h-[calc(90vh-250px)]">
          {/* Step 1: Select Customer */}
          {step === 1 && (
            <div className="space-y-4">
              <h3 className={`text-lg font-semibold ${
                theme === 'dark' ? 'text-white' : 'text-slate-900'
              }`}>
                Select Customer
              </h3>
              
              {/* Search */}
              <div className="relative">
                <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 ${
                  theme === 'dark' ? 'text-slate-500' : 'text-slate-400'
                }`} />
                <input
                  type="text"
                  placeholder="Search customers..."
                  value={customerSearch}
                  onChange={(e) => setCustomerSearch(e.target.value)}
                  className={`w-full pl-10 pr-4 py-2.5 rounded-xl border ${
                    theme === 'dark'
                      ? 'bg-slate-800/50 border-slate-700/50 text-white placeholder-slate-500'
                      : 'bg-white border-slate-200 text-slate-900 placeholder-slate-400'
                  }`}
                />
              </div>

              {/* Customer List */}
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {filteredCustomers.map((customer) => (
                  <button
                    key={customer.id}
                    onClick={() => setSelectedCustomerId(customer.id)}
                    className={`w-full p-4 rounded-xl border text-left transition-all ${
                      selectedCustomerId === customer.id
                        ? theme === 'dark'
                          ? 'bg-emerald-500/10 border-emerald-500/50 text-emerald-400'
                          : 'bg-emerald-50 border-emerald-500 text-emerald-600'
                        : theme === 'dark'
                        ? 'bg-slate-800/30 border-slate-700/50 hover:bg-slate-800/50 text-slate-300'
                        : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <p className="font-semibold">{customer.name}</p>
                    <p className={`text-sm ${
                      selectedCustomerId === customer.id
                        ? theme === 'dark' ? 'text-emerald-300' : 'text-emerald-600'
                        : theme === 'dark' ? 'text-slate-400' : 'text-slate-600'
                    }`}>
                      {customer.email}
                    </p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 2: Add Items */}
          {step === 2 && (
            <div className="space-y-4">
              <h3 className={`text-lg font-semibold ${
                theme === 'dark' ? 'text-white' : 'text-slate-900'
              }`}>
                Add Items
              </h3>

              {/* Add Item Form */}
              <div className={`p-4 rounded-xl border ${
                theme === 'dark' 
                  ? 'bg-slate-800/30 border-slate-700/50' 
                  : 'bg-slate-50 border-slate-200'
              }`}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  {/* Product Search */}
                  <div>
                    <label className={`block text-sm font-medium mb-2 ${
                      theme === 'dark' ? 'text-slate-300' : 'text-slate-700'
                    }`}>
                      Product
                    </label>
                    <div className="relative">
                      <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${
                        theme === 'dark' ? 'text-slate-500' : 'text-slate-400'
                      }`} />
                      <input
                        type="text"
                        placeholder="Search products..."
                        value={productSearch}
                        onChange={(e) => setProductSearch(e.target.value)}
                        className={`w-full pl-9 pr-4 py-2 rounded-lg border ${
                          theme === 'dark'
                            ? 'bg-slate-800 border-slate-700 text-white placeholder-slate-500'
                            : 'bg-white border-slate-200 text-slate-900 placeholder-slate-400'
                        }`}
                      />
                    </div>
                    {productSearch && filteredProducts.length > 0 && (
                      <div className={`mt-2 max-h-40 overflow-y-auto rounded-lg border ${
                        theme === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'
                      }`}>
                        {filteredProducts.map((product) => (
                          <button
                            key={product.id}
                            onClick={() => {
                              setSelectedProductId(product.id);
                              setProductSearch(product.name);
                            }}
                            className={`w-full p-2 text-left hover:bg-opacity-50 ${
                              theme === 'dark' ? 'hover:bg-slate-700' : 'hover:bg-slate-100'
                            }`}
                          >
                            <p className={`text-sm ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                              {product.name}
                            </p>
                            <p className={`text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                              {formatCurrency(product.price)} • Stock: {product.stock}
                            </p>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Quantity */}
                  <div>
                    <label className={`block text-sm font-medium mb-2 ${
                      theme === 'dark' ? 'text-slate-300' : 'text-slate-700'
                    }`}>
                      Quantity
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={quantity}
                      onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                      className={`w-full px-4 py-2 rounded-lg border ${
                        theme === 'dark'
                          ? 'bg-slate-800 border-slate-700 text-white'
                          : 'bg-white border-slate-200 text-slate-900'
                      }`}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  {/* Custom Price */}
                  <div>
                    <label className={`block text-sm font-medium mb-2 ${
                      theme === 'dark' ? 'text-slate-300' : 'text-slate-700'
                    }`}>
                      Unit Price (Optional)
                    </label>
                    <input
                      type="number"
                      placeholder={selectedProduct ? formatCurrency(selectedProduct.price) : 'Enter price'}
                      value={customPrice}
                      onChange={(e) => setCustomPrice(e.target.value)}
                      className={`w-full px-4 py-2 rounded-lg border ${
                        theme === 'dark'
                          ? 'bg-slate-800 border-slate-700 text-white placeholder-slate-500'
                          : 'bg-white border-slate-200 text-slate-900 placeholder-slate-400'
                      }`}
                    />
                  </div>

                  {/* Description */}
                  <div>
                    <label className={`block text-sm font-medium mb-2 ${
                      theme === 'dark' ? 'text-slate-300' : 'text-slate-700'
                    }`}>
                      Description (Optional)
                    </label>
                    <input
                      type="text"
                      placeholder="Item description"
                      value={itemDescription}
                      onChange={(e) => setItemDescription(e.target.value)}
                      className={`w-full px-4 py-2 rounded-lg border ${
                        theme === 'dark'
                          ? 'bg-slate-800 border-slate-700 text-white placeholder-slate-500'
                          : 'bg-white border-slate-200 text-slate-900 placeholder-slate-400'
                      }`}
                    />
                  </div>
                </div>

                <button
                  onClick={addItem}
                  disabled={!selectedProduct || quantity <= 0}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-emerald-500 to-blue-500 text-white rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Plus className="w-4 h-4" />
                  Add Item
                </button>
              </div>

              {/* Items List */}
              {items.length > 0 && (
                <div className="space-y-2">
                  {items.map((item) => (
                    <div
                      key={item.id}
                      className={`p-4 rounded-xl border ${
                        theme === 'dark'
                          ? 'bg-slate-800/30 border-slate-700/50'
                          : 'bg-white border-slate-200'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className={`font-semibold ${
                            theme === 'dark' ? 'text-white' : 'text-slate-900'
                          }`}>
                            {item.productName}
                          </p>
                          <p className={`text-sm ${
                            theme === 'dark' ? 'text-slate-400' : 'text-slate-600'
                          }`}>
                            {item.description}
                          </p>
                          <div className="flex items-center gap-4 mt-2">
                            <div className="flex items-center gap-2">
                              <label className={`text-xs ${
                                theme === 'dark' ? 'text-slate-400' : 'text-slate-600'
                              }`}>
                                Qty:
                              </label>
                              <input
                                type="number"
                                value={item.quantity}
                                onChange={(e) => updateItemQuantity(item.id, parseInt(e.target.value) || 1)}
                                className={`w-16 px-2 py-1 rounded border text-sm ${
                                  theme === 'dark'
                                    ? 'bg-slate-800 border-slate-700 text-white'
                                    : 'bg-white border-slate-200 text-slate-900'
                                }`}
                              />
                            </div>
                            <div className="flex items-center gap-2">
                              <label className={`text-xs ${
                                theme === 'dark' ? 'text-slate-400' : 'text-slate-600'
                              }`}>
                                Price:
                              </label>
                              <input
                                type="number"
                                value={item.unitPrice}
                                onChange={(e) => updateItemPrice(item.id, parseFloat(e.target.value) || 0)}
                                className={`w-24 px-2 py-1 rounded border text-sm ${
                                  theme === 'dark'
                                    ? 'bg-slate-800 border-slate-700 text-white'
                                    : 'bg-white border-slate-200 text-slate-900'
                                }`}
                              />
                            </div>
                          </div>
                        </div>
                        <div className="text-right ml-4">
                          <p className={`font-bold ${
                            theme === 'dark' ? 'text-emerald-400' : 'text-emerald-600'
                          }`}>
                            {formatCurrency(item.total)}
                          </p>
                          <button
                            onClick={() => removeItem(item.id)}
                            className={`mt-2 p-1 rounded transition-colors ${
                              theme === 'dark'
                                ? 'hover:bg-red-500/10 text-red-400'
                                : 'hover:bg-red-50 text-red-600'
                            }`}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Step 3: Final Details */}
          {step === 3 && (
            <div className="space-y-4">
              <h3 className={`text-lg font-semibold ${
                theme === 'dark' ? 'text-white' : 'text-slate-900'
              }`}>
                Estimate Details
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Estimate Date */}
                <div>
                  <label className={`block text-sm font-medium mb-2 ${
                    theme === 'dark' ? 'text-slate-300' : 'text-slate-700'
                  }`}>
                    Estimate Date
                  </label>
                  <input
                    type="date"
                    value={estimateDate}
                    onChange={(e) => setEstimateDate(e.target.value)}
                    className={`w-full px-4 py-2 rounded-lg border ${
                      theme === 'dark'
                        ? 'bg-slate-800 border-slate-700 text-white'
                        : 'bg-white border-slate-200 text-slate-900'
                    }`}
                  />
                </div>

                {/* Expiry Date */}
                <div>
                  <label className={`block text-sm font-medium mb-2 ${
                    theme === 'dark' ? 'text-slate-300' : 'text-slate-700'
                  }`}>
                    Expiry Date
                  </label>
                  <input
                    type="date"
                    value={expiryDate}
                    onChange={(e) => setExpiryDate(e.target.value)}
                    className={`w-full px-4 py-2 rounded-lg border ${
                      theme === 'dark'
                        ? 'bg-slate-800 border-slate-700 text-white'
                        : 'bg-white border-slate-200 text-slate-900'
                    }`}
                  />
                </div>
              </div>

              {/* Discount */}
              <div>
                <label className={`block text-sm font-medium mb-2 ${
                  theme === 'dark' ? 'text-slate-300' : 'text-slate-700'
                }`}>
                  Discount
                </label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    value={discount}
                    onChange={(e) => setDiscount(parseFloat(e.target.value) || 0)}
                    className={`flex-1 px-4 py-2 rounded-lg border ${
                      theme === 'dark'
                        ? 'bg-slate-800 border-slate-700 text-white'
                        : 'bg-white border-slate-200 text-slate-900'
                    }`}
                  />
                  <select
                    value={discountType}
                    onChange={(e) => setDiscountType(e.target.value as 'percentage' | 'fixed')}
                    className={`px-4 py-2 rounded-lg border ${
                      theme === 'dark'
                        ? 'bg-slate-800 border-slate-700 text-white'
                        : 'bg-white border-slate-200 text-slate-900'
                    }`}
                  >
                    <option value="percentage">%</option>
                    <option value="fixed">Rs.</option>
                  </select>
                </div>
              </div>

              {/* Tax */}
              <div>
                <label className={`block text-sm font-medium mb-2 ${
                  theme === 'dark' ? 'text-slate-300' : 'text-slate-700'
                }`}>
                  Tax (%)
                </label>
                <input
                  type="number"
                  value={taxPercentage}
                  onChange={(e) => setTaxPercentage(parseFloat(e.target.value) || 0)}
                  className={`w-full px-4 py-2 rounded-lg border ${
                    theme === 'dark'
                      ? 'bg-slate-800 border-slate-700 text-white'
                      : 'bg-white border-slate-200 text-slate-900'
                  }`}
                />
              </div>

              {/* Notes */}
              <div>
                <label className={`block text-sm font-medium mb-2 ${
                  theme === 'dark' ? 'text-slate-300' : 'text-slate-700'
                }`}>
                  Notes
                </label>
                <textarea
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Internal notes (optional)"
                  className={`w-full px-4 py-2 rounded-lg border ${
                    theme === 'dark'
                      ? 'bg-slate-800 border-slate-700 text-white placeholder-slate-500'
                      : 'bg-white border-slate-200 text-slate-900 placeholder-slate-400'
                  }`}
                />
              </div>

              {/* Terms */}
              <div>
                <label className={`block text-sm font-medium mb-2 ${
                  theme === 'dark' ? 'text-slate-300' : 'text-slate-700'
                }`}>
                  Terms & Conditions
                </label>
                <textarea
                  rows={3}
                  value={terms}
                  onChange={(e) => setTerms(e.target.value)}
                  className={`w-full px-4 py-2 rounded-lg border ${
                    theme === 'dark'
                      ? 'bg-slate-800 border-slate-700 text-white'
                      : 'bg-white border-slate-200 text-slate-900'
                  }`}
                />
              </div>

              {/* Summary */}
              <div className={`p-4 rounded-xl border ${
                theme === 'dark'
                  ? 'bg-slate-800/50 border-slate-700/50'
                  : 'bg-slate-50 border-slate-200'
              }`}>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className={theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}>
                      Subtotal:
                    </span>
                    <span className={theme === 'dark' ? 'text-white' : 'text-slate-900'}>
                      {formatCurrency(subtotal)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className={theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}>
                      Discount:
                    </span>
                    <span className={theme === 'dark' ? 'text-white' : 'text-slate-900'}>
                      - {formatCurrency(discountAmount)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className={theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}>
                      Tax ({taxPercentage}%):
                    </span>
                    <span className={theme === 'dark' ? 'text-white' : 'text-slate-900'}>
                      {formatCurrency(taxAmount)}
                    </span>
                  </div>
                  <div className={`flex justify-between pt-2 border-t text-lg font-bold ${
                    theme === 'dark' ? 'border-slate-700' : 'border-slate-300'
                  }`}>
                    <span className={theme === 'dark' ? 'text-white' : 'text-slate-900'}>
                      Total:
                    </span>
                    <span className={theme === 'dark' ? 'text-emerald-400' : 'text-emerald-600'}>
                      {formatCurrency(total)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className={`flex justify-between items-center pt-4 border-t ${
          theme === 'dark' ? 'border-slate-700/50' : 'border-slate-200'
        }`}>
          <button
            onClick={() => step > 1 ? setStep((step - 1) as Step) : handleClose()}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl border transition-all ${
              theme === 'dark'
                ? 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
                : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
            }`}
          >
            <ChevronLeft className="w-4 h-4" />
            {step === 1 ? 'Cancel' : 'Back'}
          </button>

          {step < 3 ? (
            <button
              onClick={() => setStep((step + 1) as Step)}
              disabled={!canProceed()}
              className="flex items-center gap-2 px-6 py-2 bg-gradient-to-r from-emerald-500 to-blue-500 text-white rounded-xl font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
              <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={handleSave}
              className="flex items-center gap-2 px-6 py-2 bg-gradient-to-r from-emerald-500 to-blue-500 text-white rounded-xl font-medium"
            >
              <Calculator className="w-4 h-4" />
              Save Estimate
            </button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
