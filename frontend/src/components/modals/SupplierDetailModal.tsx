import React, { useState } from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import type { Supplier, SupplierPurchase } from '../../data/mockData';
import { 
  X, Building2, Package, TrendingUp, CreditCard, Calendar,
  CheckCircle, AlertTriangle, Banknote, ChevronDown, ChevronUp,
  Percent, ShoppingCart, Warehouse, History, DollarSign
} from 'lucide-react';

interface SupplierDetailModalProps {
  isOpen: boolean;
  supplier: Supplier | null;
  purchases: SupplierPurchase[];
  onClose: () => void;
  onMakePayment: (purchase: SupplierPurchase) => void;
}

export const SupplierDetailModal: React.FC<SupplierDetailModalProps> = ({
  isOpen,
  supplier,
  purchases,
  onClose,
  onMakePayment,
}) => {
  const { theme } = useTheme();
  const [activeTab, setActiveTab] = useState<'overview' | 'products' | 'history'>('overview');
  const [expandedPurchase, setExpandedPurchase] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<'all' | 'unpaid' | 'partial' | 'fullpaid'>('all');

  if (!isOpen || !supplier) return null;

  const supplierPurchases = purchases.filter(p => p.supplierId === supplier.id);
  const filteredPurchases = filterStatus === 'all' 
    ? supplierPurchases 
    : supplierPurchases.filter(p => p.paymentStatus === filterStatus);

  // Calculate stats
  const totalProducts = supplierPurchases.length;
  const totalValue = supplierPurchases.reduce((sum, p) => sum + p.totalAmount, 0);
  const totalPaid = supplierPurchases.reduce((sum, p) => sum + p.paidAmount, 0);
  const totalPending = totalValue - totalPaid;
  const totalSold = supplierPurchases.reduce((sum, p) => sum + p.soldQuantity, 0);
  const totalInStock = supplierPurchases.reduce((sum, p) => sum + p.inStock, 0);
  const avgPaymentPercentage = supplierPurchases.length > 0 
    ? supplierPurchases.reduce((sum, p) => sum + p.paymentPercentage, 0) / supplierPurchases.length 
    : 0;

  // All payments from all purchases
  const allPayments = supplierPurchases
    .flatMap(p => p.payments.map(pay => ({ ...pay, productName: p.productName })))
    .sort((a, b) => new Date(b.paymentDate).getTime() - new Date(a.paymentDate).getTime());

  const formatCurrency = (amount: number) => `Rs. ${amount.toLocaleString('en-LK')}`;
  const formatDate = (date: string) => new Date(date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'fullpaid': return 'text-emerald-500 bg-emerald-500/10';
      case 'partial': return 'text-amber-500 bg-amber-500/10';
      case 'unpaid': return 'text-red-500 bg-red-500/10';
      default: return 'text-slate-500 bg-slate-500/10';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'fullpaid': return <CheckCircle className="w-4 h-4" />;
      case 'partial': return <Percent className="w-4 h-4" />;
      case 'unpaid': return <AlertTriangle className="w-4 h-4" />;
      default: return null;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal - Full scroll */}
      <div className={`relative w-full max-w-5xl max-h-[90vh] overflow-y-auto rounded-3xl shadow-2xl animate-in zoom-in-95 duration-200 ${
        theme === 'dark' ? 'bg-slate-900' : 'bg-white'
      }`}>
        {/* Header */}
        <div className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600" />
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4xIj48cGF0aCBkPSJNMzYgMzRoLTJ2LTRoMnY0em0wLTZ2LTRoLTJ2NGgyek0zNCAyNmgtMnYtNGgydjR6Ii8+PC9nPjwvZz48L3N2Zz4=')] opacity-30" />
          
          <div className="relative px-6 py-5">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center">
                  <Building2 className="w-7 h-7 text-white" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-white">{supplier.company}</h2>
                  <p className="text-white/80 text-sm">{supplier.name} • {supplier.phone}</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center text-white hover:bg-white/30 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-4 gap-3 mt-4">
              <div className="p-3 rounded-xl bg-white/10 backdrop-blur">
                <div className="text-white/70 text-xs mb-1">Total Products</div>
                <div className="text-xl font-bold text-white">{totalProducts}</div>
              </div>
              <div className="p-3 rounded-xl bg-white/10 backdrop-blur">
                <div className="text-white/70 text-xs mb-1">Total Value</div>
                <div className="text-xl font-bold text-white">{formatCurrency(totalValue)}</div>
              </div>
              <div className="p-3 rounded-xl bg-white/10 backdrop-blur">
                <div className="text-white/70 text-xs mb-1">Paid</div>
                <div className="text-xl font-bold text-emerald-300">{formatCurrency(totalPaid)}</div>
              </div>
              <div className="p-3 rounded-xl bg-white/10 backdrop-blur">
                <div className="text-white/70 text-xs mb-1">Pending</div>
                <div className="text-xl font-bold text-amber-300">{formatCurrency(totalPending)}</div>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="relative px-6 pb-0 flex gap-1">
            {[
              { id: 'overview', label: 'Overview', icon: TrendingUp },
              { id: 'products', label: 'Products', icon: Package },
              { id: 'history', label: 'Payment History', icon: History },
            ].map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id as 'overview' | 'products' | 'history')}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-t-xl text-sm font-medium transition-all ${
                  activeTab === id
                    ? theme === 'dark' ? 'bg-slate-900 text-white shadow-lg' : 'bg-white text-indigo-600 shadow-lg'
                    : 'text-white/70 hover:text-white hover:bg-white/10'
                }`}
              >
                <Icon className="w-4 h-4" />
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div className="space-y-6 animate-in fade-in duration-200">
              {/* Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Stock Summary */}
                <div className={`p-5 rounded-2xl ${theme === 'dark' ? 'bg-slate-800/50' : 'bg-slate-50'}`}>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-r from-blue-500 to-cyan-500 flex items-center justify-center">
                      <Warehouse className="w-5 h-5 text-white" />
                    </div>
                    <h3 className={`font-semibold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>Stock Status</h3>
                  </div>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className={`text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>In Stock</span>
                      <span className={`font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>{totalInStock} units</span>
                    </div>
                    <div className="flex justify-between">
                      <span className={`text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>Sold</span>
                      <span className="font-bold text-emerald-500">{totalSold} units</span>
                    </div>
                    <div className={`h-2 rounded-full overflow-hidden ${theme === 'dark' ? 'bg-slate-700' : 'bg-slate-200'}`}>
                      <div 
                        className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full"
                        style={{ width: `${totalInStock + totalSold > 0 ? (totalSold / (totalInStock + totalSold)) * 100 : 0}%` }}
                      />
                    </div>
                    <p className={`text-xs ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>
                      {totalInStock + totalSold > 0 ? ((totalSold / (totalInStock + totalSold)) * 100).toFixed(1) : 0}% of stock sold
                    </p>
                  </div>
                </div>

                {/* Payment Summary */}
                <div className={`p-5 rounded-2xl ${theme === 'dark' ? 'bg-slate-800/50' : 'bg-slate-50'}`}>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 flex items-center justify-center">
                      <CreditCard className="w-5 h-5 text-white" />
                    </div>
                    <h3 className={`font-semibold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>Payment Status</h3>
                  </div>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className={`text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>Avg. Paid</span>
                      <span className={`font-bold ${avgPaymentPercentage >= 80 ? 'text-emerald-500' : avgPaymentPercentage >= 50 ? 'text-amber-500' : 'text-red-500'}`}>
                        {avgPaymentPercentage.toFixed(1)}%
                      </span>
                    </div>
                    <div className={`h-2 rounded-full overflow-hidden ${theme === 'dark' ? 'bg-slate-700' : 'bg-slate-200'}`}>
                      <div 
                        className={`h-full rounded-full bg-gradient-to-r ${
                          avgPaymentPercentage >= 80 ? 'from-emerald-500 to-teal-500' : 
                          avgPaymentPercentage >= 50 ? 'from-amber-500 to-orange-500' : 'from-red-500 to-rose-500'
                        }`}
                        style={{ width: `${avgPaymentPercentage}%` }}
                      />
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div>
                        <div className="text-lg font-bold text-emerald-500">{supplierPurchases.filter(p => p.paymentStatus === 'fullpaid').length}</div>
                        <div className={`text-xs ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>Full Paid</div>
                      </div>
                      <div>
                        <div className="text-lg font-bold text-amber-500">{supplierPurchases.filter(p => p.paymentStatus === 'partial').length}</div>
                        <div className={`text-xs ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>Partial</div>
                      </div>
                      <div>
                        <div className="text-lg font-bold text-red-500">{supplierPurchases.filter(p => p.paymentStatus === 'unpaid').length}</div>
                        <div className={`text-xs ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>Unpaid</div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Categories */}
                <div className={`p-5 rounded-2xl ${theme === 'dark' ? 'bg-slate-800/50' : 'bg-slate-50'}`}>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-r from-violet-500 to-purple-500 flex items-center justify-center">
                      <ShoppingCart className="w-5 h-5 text-white" />
                    </div>
                    <h3 className={`font-semibold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>Categories</h3>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {supplier.categories.map(cat => (
                      <span 
                        key={cat}
                        className="px-3 py-1.5 rounded-full text-xs font-medium bg-gradient-to-r from-violet-500 to-purple-500 text-white"
                      >
                        {cat}
                      </span>
                    ))}
                  </div>
                  <div className={`mt-4 pt-3 border-t ${theme === 'dark' ? 'border-slate-700' : 'border-slate-200'}`}>
                    <div className="flex justify-between items-center">
                      <span className={`text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>Supplier Rating</span>
                      <div className="flex gap-0.5">
                        {[1, 2, 3, 4, 5].map(star => (
                          <span key={star} className={star <= supplier.rating ? 'text-amber-400' : theme === 'dark' ? 'text-slate-600' : 'text-slate-300'}>
                            ★
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Recent Products */}
              <div>
                <h3 className={`font-semibold mb-4 ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                  Recent Purchases from {supplier.company}
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {supplierPurchases.slice(0, 4).map(purchase => (
                    <div 
                      key={purchase.id}
                      className={`p-4 rounded-xl border transition-all hover:shadow-lg ${
                        theme === 'dark' ? 'bg-slate-800/50 border-slate-700 hover:border-slate-600' : 'bg-white border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <h4 className={`font-medium ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>{purchase.productName}</h4>
                          <p className={`text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>{purchase.category}</p>
                        </div>
                        <span className={`px-2 py-1 rounded-lg text-xs font-medium flex items-center gap-1 ${getStatusColor(purchase.paymentStatus)}`}>
                          {getStatusIcon(purchase.paymentStatus)}
                          {purchase.paymentStatus === 'fullpaid' ? 'Paid' : purchase.paymentStatus === 'partial' ? `${purchase.paymentPercentage.toFixed(0)}%` : 'Unpaid'}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className={theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}>
                          {purchase.quantity} units @ {formatCurrency(purchase.unitPrice)}
                        </span>
                        <span className={`font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                          {formatCurrency(purchase.totalAmount)}
                        </span>
                      </div>
                      <div className={`mt-2 h-1.5 rounded-full overflow-hidden ${theme === 'dark' ? 'bg-slate-700' : 'bg-slate-200'}`}>
                        <div 
                          className={`h-full rounded-full bg-gradient-to-r ${
                            purchase.paymentPercentage >= 100 ? 'from-emerald-500 to-teal-500' : 
                            purchase.paymentPercentage >= 50 ? 'from-amber-500 to-orange-500' : 'from-red-500 to-rose-500'
                          }`}
                          style={{ width: `${purchase.paymentPercentage}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
                {supplierPurchases.length > 4 && (
                  <button
                    onClick={() => setActiveTab('products')}
                    className={`w-full mt-3 py-2 text-sm font-medium rounded-xl transition-colors ${
                      theme === 'dark' ? 'text-indigo-400 hover:bg-slate-800' : 'text-indigo-600 hover:bg-slate-50'
                    }`}
                  >
                    View all {supplierPurchases.length} products →
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Products Tab */}
          {activeTab === 'products' && (
            <div className="space-y-4 animate-in fade-in duration-200">
              {/* Filter */}
              <div className="flex items-center gap-2">
                <span className={`text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>Filter:</span>
                {['all', 'unpaid', 'partial', 'fullpaid'].map(status => (
                  <button
                    key={status}
                    onClick={() => setFilterStatus(status as typeof filterStatus)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                      filterStatus === status
                        ? 'bg-gradient-to-r from-indigo-500 to-purple-500 text-white'
                        : theme === 'dark' ? 'text-slate-400 hover:bg-slate-800' : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    {status === 'all' ? 'All' : status === 'fullpaid' ? 'Full Paid' : status.charAt(0).toUpperCase() + status.slice(1)}
                  </button>
                ))}
              </div>

              {/* Products List */}
              <div className="space-y-3">
                {filteredPurchases.map(purchase => (
                  <div 
                    key={purchase.id}
                    className={`rounded-xl border overflow-hidden transition-all ${
                      theme === 'dark' ? 'bg-slate-800/50 border-slate-700' : 'bg-white border-slate-200'
                    }`}
                  >
                    {/* Main Row */}
                    <div 
                      className={`p-4 cursor-pointer hover:bg-opacity-50 ${theme === 'dark' ? 'hover:bg-slate-700/50' : 'hover:bg-slate-50'}`}
                      onClick={() => setExpandedPurchase(expandedPurchase === purchase.id ? null : purchase.id)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3">
                            <h4 className={`font-medium ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>{purchase.productName}</h4>
                            <span className={`px-2 py-0.5 rounded-full text-xs ${theme === 'dark' ? 'bg-slate-700 text-slate-300' : 'bg-slate-100 text-slate-600'}`}>
                              {purchase.category}
                            </span>
                          </div>
                          <div className={`flex items-center gap-4 mt-1 text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3.5 h-3.5" />
                              {formatDate(purchase.purchaseDate)}
                            </span>
                            <span>Qty: {purchase.quantity}</span>
                            <span>In Stock: {purchase.inStock}</span>
                            <span>Sold: {purchase.soldQuantity}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <div className={`font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                              {formatCurrency(purchase.totalAmount)}
                            </div>
                            <div className={`text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                              Paid: {formatCurrency(purchase.paidAmount)}
                            </div>
                          </div>
                          <span className={`px-3 py-1.5 rounded-xl text-sm font-medium flex items-center gap-1.5 ${getStatusColor(purchase.paymentStatus)}`}>
                            {getStatusIcon(purchase.paymentStatus)}
                            {purchase.paymentPercentage.toFixed(0)}%
                          </span>
                          {expandedPurchase === purchase.id ? <ChevronUp className="w-5 h-5 text-white" /> : <ChevronDown className="w-5 h-5 text-white" />}
                        </div>
                      </div>
                      {/* Payment Progress Bar */}
                      <div className={`mt-3 h-2 rounded-full overflow-hidden ${theme === 'dark' ? 'bg-slate-700' : 'bg-slate-200'}`}>
                        <div 
                          className={`h-full rounded-full transition-all bg-gradient-to-r ${
                            purchase.paymentPercentage >= 100 ? 'from-emerald-500 to-teal-500' : 
                            purchase.paymentPercentage >= 50 ? 'from-amber-500 to-orange-500' : 'from-red-500 to-rose-500'
                          }`}
                          style={{ width: `${purchase.paymentPercentage}%` }}
                        />
                      </div>
                    </div>

                    {/* Expanded Details */}
                    {expandedPurchase === purchase.id && (
                      <div className={`px-4 pb-4 pt-2 border-t ${theme === 'dark' ? 'border-slate-700 bg-slate-800/30' : 'border-slate-200 bg-slate-50'}`}>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {/* Payment Details */}
                          <div>
                            <h5 className={`text-sm font-medium mb-2 ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                              Payment Details
                            </h5>
                            <div className="space-y-2">
                              <div className="flex justify-between text-sm">
                                <span className={theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}>Unit Price:</span>
                                <span className={theme === 'dark' ? 'text-white' : 'text-slate-900'}>{formatCurrency(purchase.unitPrice)}</span>
                              </div>
                              <div className="flex justify-between text-sm">
                                <span className={theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}>Total Amount:</span>
                                <span className={theme === 'dark' ? 'text-white' : 'text-slate-900'}>{formatCurrency(purchase.totalAmount)}</span>
                              </div>
                              <div className="flex justify-between text-sm">
                                <span className={theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}>Amount Paid:</span>
                                <span className="text-emerald-500 font-medium">{formatCurrency(purchase.paidAmount)}</span>
                              </div>
                              <div className="flex justify-between text-sm">
                                <span className={theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}>Remaining:</span>
                                <span className={purchase.totalAmount - purchase.paidAmount > 0 ? 'text-amber-500 font-medium' : 'text-emerald-500 font-medium'}>
                                  {formatCurrency(purchase.totalAmount - purchase.paidAmount)}
                                </span>
                              </div>
                              {purchase.lastPaymentDate && (
                                <div className="flex justify-between text-sm">
                                  <span className={theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}>Last Payment:</span>
                                  <span className={theme === 'dark' ? 'text-white' : 'text-slate-900'}>{formatDate(purchase.lastPaymentDate)}</span>
                                </div>
                              )}
                            </div>
                            {purchase.notes && (
                              <p className={`mt-3 text-sm italic ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>
                                "{purchase.notes}"
                              </p>
                            )}
                          </div>

                          {/* Payment History */}
                          <div>
                            <h5 className={`text-sm font-medium mb-2 ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                              Payment History ({purchase.payments.length})
                            </h5>
                            {purchase.payments.length > 0 ? (
                              <div className="space-y-2 max-h-32 overflow-y-auto">
                                {purchase.payments.map(payment => (
                                  <div 
                                    key={payment.id}
                                    className={`flex items-center justify-between p-2 rounded-lg ${theme === 'dark' ? 'bg-slate-700/50' : 'bg-white'}`}
                                  >
                                    <div className="flex items-center gap-2">
                                      <Banknote className="w-4 h-4 text-emerald-500" />
                                      <span className={`text-sm ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                                        {formatCurrency(payment.amount)}
                                      </span>
                                    </div>
                                    <div className={`text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                                      {formatDate(payment.paymentDate)} • {payment.paymentMethod}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <p className={`text-sm ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>
                                No payments recorded yet
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Action Button */}
                        {purchase.paymentStatus !== 'fullpaid' && (
                          <button
                            onClick={() => onMakePayment(purchase)}
                            className="w-full mt-4 py-3 rounded-xl font-medium text-white bg-gradient-to-r from-emerald-500 to-teal-500 hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
                          >
                            <DollarSign className="w-5 h-5" />
                            Make Payment ({formatCurrency(purchase.totalAmount - purchase.paidAmount)} remaining)
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {filteredPurchases.length === 0 && (
                <div className={`text-center py-12 ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>
                  <Package className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>No products found with this filter</p>
                </div>
              )}
            </div>
          )}

          {/* History Tab */}
          {activeTab === 'history' && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <h3 className={`font-semibold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                All Payments Made to {supplier.company}
              </h3>
              
              {allPayments.length > 0 ? (
                <div className="space-y-3">
                  {allPayments.map((payment, index) => (
                    <div 
                      key={`${payment.id}-${index}`}
                      className={`p-4 rounded-xl border transition-all ${
                        theme === 'dark' ? 'bg-slate-800/50 border-slate-700' : 'bg-white border-slate-200'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 flex items-center justify-center">
                            <Banknote className="w-6 h-6 text-white" />
                          </div>
                          <div>
                            <div className={`font-bold text-lg ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                              {formatCurrency(payment.amount)}
                            </div>
                            <div className={`text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                              For: {payment.productName}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className={`flex items-center gap-1.5 text-sm ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                            <Calendar className="w-4 h-4" />
                            {formatDate(payment.paymentDate)}
                          </div>
                          <span className={`inline-block mt-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                            payment.paymentMethod === 'cash' ? 'bg-emerald-500/10 text-emerald-500' :
                            payment.paymentMethod === 'bank' ? 'bg-blue-500/10 text-blue-500' :
                            payment.paymentMethod === 'card' ? 'bg-purple-500/10 text-purple-500' :
                            'bg-amber-500/10 text-amber-500'
                          }`}>
                            {payment.paymentMethod.charAt(0).toUpperCase() + payment.paymentMethod.slice(1)}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className={`text-center py-12 ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>
                  <History className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>No payment history available</p>
                </div>
              )}

              {/* Summary */}
              <div className={`p-4 rounded-xl ${theme === 'dark' ? 'bg-slate-800/50' : 'bg-slate-50'}`}>
                <div className="flex justify-between items-center">
                  <span className={`text-sm font-medium ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                    Total Payments Made
                  </span>
                  <span className="text-lg font-bold text-emerald-500">
                    {formatCurrency(allPayments.reduce((sum, p) => sum + p.amount, 0))}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
