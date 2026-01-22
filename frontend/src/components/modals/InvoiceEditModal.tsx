import React, { useState, useEffect, useMemo } from 'react';
import type { Invoice, InvoiceItem, Product } from '../../data/mockData';
import { useTheme } from '../../contexts/ThemeContext';
import { Plus, Trash2, Search, FileText, Package, Calendar, CheckCircle, XCircle, CircleDollarSign } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../ui/dialog';
import { Label } from '../ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { SearchableSelect } from '../ui/searchable-select';

interface InvoiceEditModalProps {
  isOpen: boolean;
  invoice: Invoice | null;
  products: Product[];
  onClose: () => void;
  onSave: (invoice: Invoice) => void;
}

export const InvoiceEditModal: React.FC<InvoiceEditModalProps> = ({
  isOpen,
  invoice,
  products,
  onClose,
  onSave,
}) => {
  const { theme } = useTheme();
  const [items, setItems] = useState<InvoiceItem[]>([]);
  const [issueDate, setIssueDate] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [status, setStatus] = useState<'unpaid' | 'fullpaid' | 'halfpay'>('unpaid');
  const [productSearch, setProductSearch] = useState('');
  const [selectedProductId, setSelectedProductId] = useState('');
  const [quantity, setQuantity] = useState(1);
  
  // Calendar states
  const [showIssueDatePicker, setShowIssueDatePicker] = useState(false);
  const [showDueDatePicker, setShowDueDatePicker] = useState(false);
  const [issueMonth, setIssueMonth] = useState(new Date());
  const [dueMonth, setDueMonth] = useState(new Date());

  useEffect(() => {
    if (invoice) {
      setItems([...invoice.items]);
      setIssueDate(invoice.date);
      setDueDate(invoice.dueDate);
      setStatus(invoice.status);
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
    const newItem: InvoiceItem = {
      productId: product.id,
      productName: product.name,
      quantity,
      unitPrice,
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
  const tax = subtotal * 0.15;
  const total = subtotal + tax;

  const handleSave = () => {
    if (!invoice || items.length === 0) return;

    const updatedInvoice: Invoice = {
      ...invoice,
      items,
      subtotal: Math.round(subtotal * 100) / 100,
      tax: Math.round(tax * 100) / 100,
      total: Math.round(total * 100) / 100,
      date: issueDate,
      dueDate,
      status,
    };

    onSave(updatedInvoice);
    onClose();
  };

  const handleClose = () => {
    setProductSearch('');
    setSelectedProductId('');
    setQuantity(1);
    onClose();
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
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-white/20 backdrop-blur rounded-xl flex items-center justify-center">
              <FileText className="w-7 h-7" />
            </div>
            <div>
              <h2 className="text-2xl font-bold">Edit Invoice</h2>
              <p className="text-emerald-100 text-sm">{invoice.id} • {invoice.customerName}</p>
            </div>
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
              </div>
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
                        <span className={`font-medium ${selectedProductId === p.id ? 'text-emerald-400' : (theme === 'dark' ? 'text-white' : 'text-slate-900')}`}>
                          {p.name}
                        </span>
                        <span className={`text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
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
                </p>
              </div>
            )}

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
                {items.map((item) => (
                  <div
                    key={item.productId}
                    className={`p-3 rounded-xl border flex items-center justify-between ${
                      theme === 'dark' ? 'bg-slate-800/50 border-slate-700/50' : 'bg-slate-50 border-slate-200'
                    }`}
                  >
                    <div className="flex-1">
                      <p className={`font-medium ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                        {item.productName}
                      </p>
                      <p className={`text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                        {item.quantity} × Rs. {item.unitPrice.toLocaleString()} = <span className="text-emerald-400">Rs.{' '}
                        {(item.quantity * item.unitPrice).toLocaleString()}</span>
                      </p>
                    </div>
                    <button
                      onClick={() => removeItem(item.productId)}
                      className="p-2 hover:bg-red-500/10 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4 text-red-400" />
                    </button>
                  </div>
                ))}
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
            disabled={items.length === 0}
            className="px-6 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 disabled:opacity-50 text-white rounded-xl font-medium transition-all shadow-lg shadow-emerald-500/25"
          >
            Save Changes
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
