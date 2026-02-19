import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { useDataCache } from '../contexts/DataCacheContext';
import { AIMonthlyAnalysis } from '../components/AIMonthlyAnalysis';
import { 
  Package, FileText, Users, ArrowRight, ArrowUpRight,
  DollarSign, ShoppingCart, AlertTriangle, CheckCircle,
  RefreshCw, Cpu, Monitor, HardDrive, XCircle, CircleDollarSign, Loader2
} from 'lucide-react';

export const Dashboard: React.FC = () => {
  const { theme } = useTheme();
  const { user, isViewingShop, viewingShop } = useAuth();
  const { 
    invoices, products, customers,
    loadInvoices, loadProducts, loadCustomers,
    invoicesLoading, productsLoading, customersLoading
  } = useDataCache();
  const navigate = useNavigate();
  const [selectedPeriod, setSelectedPeriod] = useState('7d');
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Redirect SUPER_ADMIN to admin dashboard (only if not viewing a shop)
  useEffect(() => {
    if (user?.role === 'SUPER_ADMIN' && !isViewingShop) {
      navigate('/admin', { replace: true });
    }
  }, [user, isViewingShop, navigate]);

  // Load data when component mounts or when viewing shop changes
  useEffect(() => {
    const loadData = async () => {
      try {
        await Promise.all([
          loadInvoices(),
          loadProducts(),
          loadCustomers()
        ]);
      } catch (error) {
        console.error('Failed to load dashboard data:', error);
      }
    };
    
    // Only load if we're viewing a shop (or if regular user)
    if (!user?.role || user.role !== 'SUPER_ADMIN' || isViewingShop) {
      loadData();
    }
  }, [loadInvoices, loadProducts, loadCustomers, isViewingShop, user?.role]);

  // Handle refresh
  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await Promise.all([
        loadInvoices(true),
        loadProducts(true),
        loadCustomers(true)
      ]);
    } catch (error) {
      console.error('Failed to refresh dashboard data:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  // If SUPER_ADMIN and not viewing a shop, show nothing while redirecting
  if (user?.role === 'SUPER_ADMIN' && !isViewingShop) {
    return null;
  }

  // Determine which shop name to display
  const shopName = isViewingShop && viewingShop ? viewingShop.name : user?.shop?.name || 'Your Shop';

  // Loading state
  const isLoading = invoicesLoading || productsLoading || customersLoading;

  // Calculate statistics from actual data
  const fullpaidInvoices = invoices.filter((inv) => inv.status === 'fullpaid').length;
  const halfpayInvoices = invoices.filter((inv) => inv.status === 'halfpay').length;
  const unpaidInvoices = invoices.filter((inv) => inv.status === 'unpaid').length;
  const totalRevenue = invoices.filter(inv => inv.status === 'fullpaid').reduce((sum, inv) => sum + inv.total, 0);
  const totalProducts = products.length;
  const lowStockProducts = products.filter((p) => p.stock < 10).length;
  const totalCustomers = customers.length;

  // Format currency
  const formatCurrency = (amount: number) => {
    return `Rs. ${amount.toLocaleString('en-LK')}`;
  };

  // Mock chart data for revenue
  const revenueData = [
    { day: 'Mon', value: 450000 },
    { day: 'Tue', value: 680000 },
    { day: 'Wed', value: 520000 },
    { day: 'Thu', value: 890000 },
    { day: 'Fri', value: 750000 },
    { day: 'Sat', value: 1200000 },
    { day: 'Sun', value: 380000 },
  ];
  const maxRevenue = Math.max(...revenueData.map(d => d.value));

  // Recent activities - Generate from actual data
  const recentActivities = [
    ...(invoices.length > 0 ? [{
      id: 1,
      type: 'invoice' as const,
      message: `Invoice ${invoices[0].id} ${invoices[0].status === 'fullpaid' ? 'paid' : 'created'}`,
      time: 'Recently',
      icon: invoices[0].status === 'fullpaid' ? CheckCircle : FileText,
      color: invoices[0].status === 'fullpaid' ? 'text-green-500' : 'text-purple-500'
    }] : []),
    ...(customers.length > 0 ? [{
      id: 2,
      type: 'customer' as const,
      message: `Customer: ${customers[customers.length - 1]?.name || 'New customer'}`,
      time: 'Recently',
      icon: Users,
      color: 'text-blue-500'
    }] : []),
    ...(lowStockProducts > 0 ? [{
      id: 3,
      type: 'stock' as const,
      message: `${lowStockProducts} product${lowStockProducts > 1 ? 's' : ''} with low stock`,
      time: 'Current',
      icon: AlertTriangle,
      color: 'text-amber-500'
    }] : []),
  ].slice(0, 5);

  // Top selling products - Use actual products
  const topProducts = products.slice(0, 5);

  return (
    <div className="space-y-4 sm:space-y-6 pb-6 sm:pb-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="min-w-0">
          <h1 className={`text-xl sm:text-2xl lg:text-3xl font-bold truncate ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
            {isViewingShop ? `${shopName} Dashboard` : 'Dashboard'}
          </h1>
          <p className={`mt-0.5 text-sm sm:text-base truncate ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
            {isViewingShop 
              ? `Viewing ${shopName}'s data as Super Admin`
              : "Welcome back! Here's what's happening with your store today."
            }
          </p>
        </div>
        <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
          {/* Period Selector */}
          <div className={`flex items-center p-0.5 sm:p-1 rounded-xl border ${
            theme === 'dark' ? 'bg-slate-800/50 border-slate-700/50' : 'bg-white border-slate-200'
          }`}>
            {['24h', '7d', '30d', '90d'].map((period) => (
              <button
                key={period}
                onClick={() => setSelectedPeriod(period)}
                className={`px-2.5 sm:px-3 py-1 sm:py-1.5 text-xs sm:text-sm font-medium rounded-lg transition-all ${
                  selectedPeriod === period
                    ? 'bg-gradient-to-r from-emerald-500 to-blue-500 text-white shadow-lg'
                    : theme === 'dark' ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {period}
              </button>
            ))}
          </div>
          <button 
            onClick={handleRefresh}
            disabled={isRefreshing || isLoading}
            className={`p-2 sm:p-2.5 rounded-xl border transition-all ${
              theme === 'dark' 
                ? 'bg-slate-800/50 border-slate-700/50 hover:bg-slate-700/50 text-slate-400' 
                : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-600'
            } ${isRefreshing || isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {isRefreshing || isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
        {/* Total Revenue */}
        <div className={`relative overflow-hidden rounded-xl sm:rounded-2xl border p-3 sm:p-4 lg:p-6 ${
          theme === 'dark' 
            ? 'bg-gradient-to-br from-slate-800/50 to-slate-900/50 border-slate-700/50' 
            : 'bg-white border-slate-200 shadow-sm'
        }`}>
          <div className="absolute top-0 right-0 w-20 sm:w-32 h-20 sm:h-32 bg-gradient-to-br from-emerald-500/20 to-blue-500/10 rounded-full blur-3xl" />
          <div className="relative">
            <div className="flex items-center justify-between">
              <div className={`p-2 sm:p-3 rounded-lg sm:rounded-xl ${theme === 'dark' ? 'bg-emerald-500/10' : 'bg-emerald-50'}`}>
                <DollarSign className="w-4 h-4 sm:w-6 sm:h-6 text-emerald-500" />
              </div>
              <span className="flex items-center gap-0.5 text-[10px] sm:text-sm font-medium text-green-500">
                <ArrowUpRight className="w-3 h-3 sm:w-4 sm:h-4" />
                +12.5%
              </span>
            </div>
            <div className="mt-2 sm:mt-4">
              <p className={`text-[11px] sm:text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>Total Revenue</p>
              <p className={`text-base sm:text-xl lg:text-2xl font-bold mt-0.5 sm:mt-1 ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                {formatCurrency(totalRevenue)}
              </p>
            </div>
          </div>
        </div>

        {/* Total Orders */}
        <div className={`relative overflow-hidden rounded-xl sm:rounded-2xl border p-3 sm:p-4 lg:p-6 ${
          theme === 'dark' 
            ? 'bg-gradient-to-br from-slate-800/50 to-slate-900/50 border-slate-700/50' 
            : 'bg-white border-slate-200 shadow-sm'
        }`}>
          <div className="absolute top-0 right-0 w-20 sm:w-32 h-20 sm:h-32 bg-gradient-to-br from-purple-500/20 to-pink-500/10 rounded-full blur-3xl" />
          <div className="relative">
            <div className="flex items-center justify-between">
              <div className={`p-2 sm:p-3 rounded-lg sm:rounded-xl ${theme === 'dark' ? 'bg-purple-500/10' : 'bg-purple-50'}`}>
                <ShoppingCart className="w-4 h-4 sm:w-6 sm:h-6 text-purple-500" />
              </div>
              <span className="flex items-center gap-0.5 text-[10px] sm:text-sm font-medium text-green-500">
                <ArrowUpRight className="w-3 h-3 sm:w-4 sm:h-4" />
                +8.2%
              </span>
            </div>
            <div className="mt-2 sm:mt-4">
              <p className={`text-[11px] sm:text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>Total Orders</p>
              <p className={`text-base sm:text-xl lg:text-2xl font-bold mt-0.5 sm:mt-1 ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                {invoices.length}
              </p>
            </div>
          </div>
        </div>

        {/* Products */}
        <div className={`relative overflow-hidden rounded-xl sm:rounded-2xl border p-3 sm:p-4 lg:p-6 ${
          theme === 'dark' 
            ? 'bg-gradient-to-br from-slate-800/50 to-slate-900/50 border-slate-700/50' 
            : 'bg-white border-slate-200 shadow-sm'
        }`}>
          <div className="absolute top-0 right-0 w-20 sm:w-32 h-20 sm:h-32 bg-gradient-to-br from-emerald-500/20 to-teal-500/10 rounded-full blur-3xl" />
          <div className="relative">
            <div className="flex items-center justify-between">
              <div className={`p-2 sm:p-3 rounded-lg sm:rounded-xl ${theme === 'dark' ? 'bg-emerald-500/10' : 'bg-emerald-50'}`}>
                <Package className="w-4 h-4 sm:w-6 sm:h-6 text-emerald-500" />
              </div>
              {lowStockProducts > 0 && (
                <span className="flex items-center gap-0.5 text-[10px] sm:text-sm font-medium text-amber-500">
                  <AlertTriangle className="w-3 h-3 sm:w-4 sm:h-4" />
                  {lowStockProducts} low
                </span>
              )}
            </div>
            <div className="mt-2 sm:mt-4">
              <p className={`text-[11px] sm:text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>Total Products</p>
              <p className={`text-base sm:text-xl lg:text-2xl font-bold mt-0.5 sm:mt-1 ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                {totalProducts}
              </p>
            </div>
          </div>
        </div>

        {/* Customers */}
        <div className={`relative overflow-hidden rounded-xl sm:rounded-2xl border p-3 sm:p-4 lg:p-6 ${
          theme === 'dark' 
            ? 'bg-gradient-to-br from-slate-800/50 to-slate-900/50 border-slate-700/50' 
            : 'bg-white border-slate-200 shadow-sm'
        }`}>
          <div className="absolute top-0 right-0 w-20 sm:w-32 h-20 sm:h-32 bg-gradient-to-br from-orange-500/20 to-rose-500/10 rounded-full blur-3xl" />
          <div className="relative">
            <div className="flex items-center justify-between">
              <div className={`p-2 sm:p-3 rounded-lg sm:rounded-xl ${theme === 'dark' ? 'bg-orange-500/10' : 'bg-orange-50'}`}>
                <Users className="w-4 h-4 sm:w-6 sm:h-6 text-orange-500" />
              </div>
              <span className="flex items-center gap-0.5 text-[10px] sm:text-sm font-medium text-green-500">
                <ArrowUpRight className="w-3 h-3 sm:w-4 sm:h-4" />
                +5.1%
              </span>
            </div>
            <div className="mt-2 sm:mt-4">
              <p className={`text-[11px] sm:text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>Total Customers</p>
              <p className={`text-base sm:text-xl lg:text-2xl font-bold mt-0.5 sm:mt-1 ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                {totalCustomers}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* AI Monthly Analysis Section */}
      <AIMonthlyAnalysis />

      {/* Charts and Activity Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        {/* Revenue Chart */}
        <div className={`lg:col-span-2 rounded-xl sm:rounded-2xl border p-4 sm:p-6 ${
          theme === 'dark' 
            ? 'bg-gradient-to-br from-slate-800/50 to-slate-900/50 border-slate-700/50' 
            : 'bg-white border-slate-200 shadow-sm'
        }`}>
          <div className="flex items-center justify-between mb-4 sm:mb-6">
            <div>
              <h3 className={`text-base sm:text-lg font-semibold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                Revenue Overview
              </h3>
              <p className={`text-xs sm:text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                Weekly revenue performance
              </p>
            </div>
          </div>
          
          {/* Simple Bar Chart */}
          <div className="flex items-end justify-between gap-1.5 sm:gap-2 h-36 sm:h-48">
            {revenueData.map((data) => (
              <div key={data.day} className="flex-1 flex flex-col items-center gap-1 sm:gap-2">
                <div className="w-full relative flex flex-col items-center">
                  <div 
                    className="w-full max-w-[40px] rounded-t-lg bg-gradient-to-t from-emerald-500 to-blue-500 transition-all duration-500 hover:from-emerald-400 hover:to-blue-400"
                    style={{ height: `${(data.value / maxRevenue) * 160}px` }}
                  />
                </div>
                <span className={`text-[10px] sm:text-xs ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>
                  {data.day}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Activity */}
        <div className={`rounded-xl sm:rounded-2xl border p-4 sm:p-6 ${
          theme === 'dark' 
            ? 'bg-gradient-to-br from-slate-800/50 to-slate-900/50 border-slate-700/50' 
            : 'bg-white border-slate-200 shadow-sm'
        }`}>
          <h3 className={`text-base sm:text-lg font-semibold mb-3 sm:mb-4 ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
            Recent Activity
          </h3>
          <div className="space-y-4">
            {recentActivities.map((activity) => {
              const Icon = activity.icon;
              return (
                <div key={activity.id} className="flex items-start gap-3">
                  <div className={`p-2 rounded-lg ${theme === 'dark' ? 'bg-slate-800/50' : 'bg-slate-100'}`}>
                    <Icon className={`w-4 h-4 ${activity.color}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                      {activity.message}
                    </p>
                    <p className={`text-xs mt-0.5 ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>
                      {activity.time}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Invoice Summary & Top Products */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {/* Invoice Summary */}
        <div className={`rounded-xl sm:rounded-2xl border p-4 sm:p-6 ${
          theme === 'dark' 
            ? 'bg-gradient-to-br from-slate-800/50 to-slate-900/50 border-slate-700/50' 
            : 'bg-white border-slate-200 shadow-sm'
        }`}>
          <div className="flex items-center justify-between mb-4 sm:mb-6">
            <h3 className={`text-base sm:text-lg font-semibold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
              Invoice Summary
            </h3>
            <Link 
              to="/invoices" 
              className="flex items-center gap-1 text-xs sm:text-sm text-emerald-500 hover:text-emerald-400 transition-colors"
            >
              View all <ArrowRight className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </Link>
          </div>
          
          <div className="grid grid-cols-3 gap-2 sm:gap-4">
            <div className={`p-2.5 sm:p-4 rounded-lg sm:rounded-xl ${theme === 'dark' ? 'bg-slate-800/30' : 'bg-slate-50'}`}>
              <div className="flex items-center gap-1.5 sm:gap-2 mb-1.5 sm:mb-2">
                <CheckCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-green-500" />
                <span className={`text-[10px] sm:text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>Full Paid</span>
              </div>
              <p className={`text-lg sm:text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                {fullpaidInvoices}
              </p>
            </div>
            <div className={`p-2.5 sm:p-4 rounded-lg sm:rounded-xl ${theme === 'dark' ? 'bg-slate-800/30' : 'bg-slate-50'}`}>
              <div className="flex items-center gap-1.5 sm:gap-2 mb-1.5 sm:mb-2">
                <CircleDollarSign className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-500" />
                <span className={`text-[10px] sm:text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>Half Pay</span>
              </div>
              <p className={`text-lg sm:text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                {halfpayInvoices}
              </p>
            </div>
            <div className={`p-2.5 sm:p-4 rounded-lg sm:rounded-xl ${theme === 'dark' ? 'bg-slate-800/30' : 'bg-slate-50'}`}>
              <div className="flex items-center gap-1.5 sm:gap-2 mb-1.5 sm:mb-2">
                <XCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-red-500" />
                <span className={`text-[10px] sm:text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>Unpaid</span>
              </div>
              <p className={`text-lg sm:text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                {unpaidInvoices}
              </p>
            </div>
          </div>
        </div>

        {/* Top Products */}
        <div className={`rounded-xl sm:rounded-2xl border p-4 sm:p-6 ${
          theme === 'dark' 
            ? 'bg-gradient-to-br from-slate-800/50 to-slate-900/50 border-slate-700/50' 
            : 'bg-white border-slate-200 shadow-sm'
        }`}>
          <div className="flex items-center justify-between mb-4 sm:mb-6">
            <h3 className={`text-base sm:text-lg font-semibold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
              Top Products
            </h3>
            <Link 
              to="/products" 
              className="flex items-center gap-1 text-xs sm:text-sm text-emerald-500 hover:text-emerald-400 transition-colors"
            >
              View all <ArrowRight className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </Link>
          </div>
          
          <div className="space-y-3">
            {topProducts.map((product) => (
              <div 
                key={product.id}
                className={`flex items-center gap-3 p-3 rounded-xl transition-colors ${
                  theme === 'dark' ? 'hover:bg-slate-800/30' : 'hover:bg-slate-50'
                }`}
              >
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                  theme === 'dark' ? 'bg-slate-800' : 'bg-slate-100'
                }`}>
                  {product.category === 'Processors' && <Cpu className="w-5 h-5 text-emerald-500" />}
                  {product.category === 'Graphics Cards' && <Monitor className="w-5 h-5 text-purple-500" />}
                  {product.category === 'Storage' && <HardDrive className="w-5 h-5 text-emerald-500" />}
                  {!['Processors', 'Graphics Cards', 'Storage'].includes(product.category) && (
                    <Package className="w-5 h-5 text-orange-500" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium truncate ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                    {product.name}
                  </p>
                  <p className={`text-xs ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>
                    {product.category}
                  </p>
                </div>
                <div className="text-right">
                  <p className={`text-sm font-medium ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                    {formatCurrency(product.price)}
                  </p>
                  <p className={`text-xs ${product.stock < 10 ? 'text-amber-500' : theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>
                    {product.stock} in stock
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
