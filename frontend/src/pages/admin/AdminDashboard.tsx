import React, { useState, useEffect, useMemo } from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';
import { SearchableSelect } from '../../components/ui/searchable-select';
import {
  Building2,
  Users,
  Search,
  RefreshCw,
  Eye,
  Edit,
  Key,
  UserPlus,
  Store,
  Package,
  FileText,
  TrendingUp,
  Shield,
  CheckCircle,
  XCircle,
  AlertTriangle,
  ChevronRight,
  ChevronLeft,
  X,
  Save,
  LayoutGrid,
  List,
  ChevronsLeft,
  ChevronsRight,
  Trash2,
  LayoutDashboard,
  Activity,
  LogIn,
} from 'lucide-react';

// API URL from environment
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api/v1';

// ===================================
// Types
// ===================================

interface Shop {
  id: string;
  name: string;
  slug: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  logo: string | null;
  isActive: boolean;
  currency: string;
  taxRate: number;
  businessRegNo: string | null;
  createdAt: string;
  updatedAt: string;
  userCount: number;
  customerCount: number;
  productCount: number;
  invoiceCount: number;
}

interface User {
  id: string;
  email: string;
  name: string;
  role: 'SUPER_ADMIN' | 'ADMIN' | 'MANAGER' | 'STAFF';
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  lastLogin: string | null;
  shopId: string | null;
  shop: {
    id: string;
    name: string;
    slug: string;
  } | null;
}

interface Stats {
  totalShops: number;
  totalUsers: number;
  activeShops: number;
  inactiveShops: number;
  totalInvoices: number;
  totalCustomers: number;
  totalProducts: number;
  recentShops: number;
  recentUsers: number;
}

type ViewMode = 'card' | 'table';
type StatusFilter = 'all' | 'active' | 'inactive';
type RoleFilter = 'all' | 'SUPER_ADMIN' | 'ADMIN' | 'MANAGER' | 'STAFF';

// ===================================
// Main Component
// ===================================

export const AdminDashboard: React.FC = () => {
  const { theme } = useTheme();
  const { user, getAccessToken, setViewingShop } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Determine active section based on route
  const activeSection = useMemo(() => {
    if (location.pathname === '/admin/shops') return 'shops';
    if (location.pathname === '/admin/users') return 'users';
    if (location.pathname === '/admin/activity') return 'activity';
    return 'overview';
  }, [location.pathname]);

  // State
  const [stats, setStats] = useState<Stats | null>(null);
  const [shops, setShops] = useState<Shop[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('card');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('all');

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Modal States
  const [selectedShop, setSelectedShop] = useState<Shop | null>(null);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isEditUserModalOpen, setIsEditUserModalOpen] = useState(false);
  const [isResetPasswordModalOpen, setIsResetPasswordModalOpen] = useState(false);
  const [isCreateUserModalOpen, setIsCreateUserModalOpen] = useState(false);
  const [isViewShopModalOpen, setIsViewShopModalOpen] = useState(false);
  const [isDeleteUserModalOpen, setIsDeleteUserModalOpen] = useState(false);
  const [shopUsers, setShopUsers] = useState<User[]>([]);

  // Check authorization
  useEffect(() => {
    if (user && user.role !== 'SUPER_ADMIN') {
      navigate('/dashboard');
    }
  }, [user, navigate]);

  // Reset pagination when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter, roleFilter, activeSection]);

  // Fetch data
  const fetchData = async () => {
    setIsLoading(true);
    setError(null);
    const token = getAccessToken();

    try {
      const headers = {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      };

      const [statsRes, shopsRes, usersRes] = await Promise.all([
        fetch(`${API_URL}/admin/stats`, { headers }),
        fetch(`${API_URL}/admin/shops`, { headers }),
        fetch(`${API_URL}/admin/users`, { headers }),
      ]);

      if (!statsRes.ok || !shopsRes.ok || !usersRes.ok) {
        throw new Error('Failed to fetch admin data');
      }

      const [statsData, shopsData, usersData] = await Promise.all([
        statsRes.json(),
        shopsRes.json(),
        usersRes.json(),
      ]);

      setStats(statsData.data);
      setShops(shopsData.data);
      setUsers(usersData.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // View shop dashboard - set viewing shop and navigate
  const viewShopDashboard = (shop: Shop) => {
    setViewingShop({
      id: shop.id,
      name: shop.name,
      slug: shop.slug,
      email: shop.email,
      phone: shop.phone,
      address: shop.address,
      logo: shop.logo,
      currency: shop.currency,
      taxRate: shop.taxRate,
      businessRegNo: shop.businessRegNo,
    });
    navigate('/');
  };

  // View shop details with users
  const viewShopDetails = async (shop: Shop) => {
    setSelectedShop(shop);
    setIsViewShopModalOpen(true);
    
    const token = getAccessToken();
    try {
      const res = await fetch(`${API_URL}/admin/shops/${shop.id}`, {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await res.json();
      if (data.success) {
        setShopUsers(data.data.users);
      }
    } catch (err) {
      console.error('Failed to fetch shop users:', err);
    }
  };

  // Filtered & Paginated data
  const filteredShops = useMemo(() => {
    return shops.filter(shop => {
      const matchesSearch = 
        shop.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        shop.slug.toLowerCase().includes(searchQuery.toLowerCase()) ||
        shop.email?.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesStatus = 
        statusFilter === 'all' || 
        (statusFilter === 'active' && shop.isActive) ||
        (statusFilter === 'inactive' && !shop.isActive);
      
      return matchesSearch && matchesStatus;
    });
  }, [shops, searchQuery, statusFilter]);

  const filteredUsers = useMemo(() => {
    return users.filter(user => {
      const matchesSearch = 
        user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.shop?.name.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesStatus = 
        statusFilter === 'all' || 
        (statusFilter === 'active' && user.isActive) ||
        (statusFilter === 'inactive' && !user.isActive);
      
      const matchesRole = roleFilter === 'all' || user.role === roleFilter;
      
      return matchesSearch && matchesStatus && matchesRole;
    });
  }, [users, searchQuery, statusFilter, roleFilter]);

  // Pagination logic
  const currentData = activeSection === 'shops' ? filteredShops : filteredUsers;
  const totalItems = currentData.length;
  const totalPages = Math.ceil(totalItems / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const paginatedShops = filteredShops.slice(startIndex, endIndex);
  const paginatedUsers = filteredUsers.slice(startIndex, endIndex);

  // Role badge colors
  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'SUPER_ADMIN':
        return 'from-purple-500/10 to-pink-500/10 text-purple-400 border-purple-500/30';
      case 'ADMIN':
        return 'from-emerald-500/10 to-green-500/10 text-emerald-400 border-emerald-500/30';
      case 'MANAGER':
        return 'from-blue-500/10 to-cyan-500/10 text-blue-400 border-blue-500/30';
      default:
        return 'from-slate-500/10 to-gray-500/10 text-slate-400 border-slate-500/30';
    }
  };

  // Page size options
  const pageSizeOptions = [5, 10, 20, 50, 100];

  if (user?.role !== 'SUPER_ADMIN') {
    return (
      <div className={`min-h-screen flex items-center justify-center ${
        theme === 'dark' ? 'bg-slate-900' : 'bg-slate-50'
      }`}>
        <div className="text-center">
          <Shield className="w-16 h-16 mx-auto mb-4 text-red-500" />
          <h1 className={`text-2xl font-bold mb-2 ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
            Access Denied
          </h1>
          <p className={theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}>
            You need Super Admin privileges to access this page.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2.5 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 shadow-lg shadow-purple-500/25">
              <Shield className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className={`text-2xl lg:text-3xl font-bold ${
                theme === 'dark' ? 'text-white' : 'text-slate-900'
              }`}>
                Platform Admin
              </h1>
              <p className={`text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                Manage all shops and users across the platform
              </p>
            </div>
          </div>
        </div>
        <button
          onClick={fetchData}
          disabled={isLoading}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium transition-all ${
            theme === 'dark'
              ? 'bg-slate-800/50 border border-slate-700/50 text-slate-300 hover:bg-slate-700/50'
              : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 shadow-sm'
          }`}
        >
          <RefreshCw className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh Data
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-red-400" />
          <p className="text-red-400">{error}</p>
        </div>
      )}



      {/* ===================================
          OVERVIEW SECTION
      =================================== */}
      {activeSection === 'overview' && stats && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Stats Cards */}
          {[
            { label: 'Total Shops', value: stats.totalShops, icon: Building2, color: 'from-emerald-500 to-green-500', shadow: 'shadow-emerald-500/20' },
            { label: 'Total Users', value: stats.totalUsers, icon: Users, color: 'from-blue-500 to-cyan-500', shadow: 'shadow-blue-500/20' },
            { label: 'Active Shops', value: stats.activeShops, icon: CheckCircle, color: 'from-green-500 to-emerald-500', shadow: 'shadow-green-500/20' },
            { label: 'Inactive Shops', value: stats.inactiveShops, icon: XCircle, color: 'from-red-500 to-rose-500', shadow: 'shadow-red-500/20' },
            { label: 'Total Invoices', value: stats.totalInvoices, icon: FileText, color: 'from-purple-500 to-pink-500', shadow: 'shadow-purple-500/20' },
            { label: 'Total Customers', value: stats.totalCustomers, icon: Users, color: 'from-orange-500 to-amber-500', shadow: 'shadow-orange-500/20' },
            { label: 'Total Products', value: stats.totalProducts, icon: Package, color: 'from-indigo-500 to-violet-500', shadow: 'shadow-indigo-500/20' },
            { label: 'New This Week', value: stats.recentShops + stats.recentUsers, icon: TrendingUp, color: 'from-teal-500 to-cyan-500', shadow: 'shadow-teal-500/20' },
          ].map((stat, index) => (
            <div
              key={index}
              className={`relative overflow-hidden rounded-2xl border p-6 transition-all hover:scale-[1.02] ${
                theme === 'dark'
                  ? 'bg-gradient-to-br from-slate-800/50 to-slate-900/50 border-slate-700/50'
                  : 'bg-white border-slate-200 shadow-sm hover:shadow-md'
              }`}
            >
              <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br ${stat.color} opacity-10 rounded-full blur-3xl`} />
              <div className="relative">
                <div className={`inline-flex p-3 rounded-xl bg-gradient-to-r ${stat.color} shadow-lg ${stat.shadow} mb-4`}>
                  <stat.icon className="w-6 h-6 text-white" />
                </div>
                <p className={`text-sm font-medium ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                  {stat.label}
                </p>
                <p className={`text-3xl font-bold mt-1 ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                  {stat.value.toLocaleString()}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ===================================
          SHOPS SECTION
      =================================== */}
      {activeSection === 'shops' && (
        <div className="space-y-4">
          {/* Search, Filters & View Toggle */}
          <div className={`rounded-2xl border p-4 ${
            theme === 'dark'
              ? 'bg-slate-800/30 border-slate-700/50'
              : 'bg-white border-slate-200 shadow-sm'
          }`}>
            <div className="flex flex-col lg:flex-row gap-4">
              {/* Search */}
              <div className="relative flex-1">
                <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 ${
                  theme === 'dark' ? 'text-slate-500' : 'text-slate-400'
                }`} />
                <input
                  type="text"
                  placeholder="Search shops by name, slug, or email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className={`w-full pl-10 pr-4 py-2.5 rounded-xl border transition-all ${
                    theme === 'dark'
                      ? 'bg-slate-800/50 border-slate-700/50 text-white placeholder-slate-500 focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/20'
                      : 'bg-white border-slate-200 text-slate-900 placeholder-slate-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20'
                  }`}
                />
              </div>

              {/* Filter & View Controls */}
              <div className="flex items-center gap-2">
                {/* Status Filter */}
                <div className="w-40">
                  <SearchableSelect
                    value={statusFilter}
                    onValueChange={(value) => setStatusFilter(value as StatusFilter)}
                    placeholder="All Status"
                    searchPlaceholder="Search..."
                    emptyMessage="No options"
                    theme={theme === 'dark' ? 'dark' : 'light'}
                    options={[
                      { value: 'all', label: 'All Status' },
                      { value: 'active', label: 'Active' },
                      { value: 'inactive', label: 'Inactive' },
                    ]}
                  />
                </div>

                {/* View Toggle */}
                <div className={`flex items-center rounded-xl overflow-hidden border ${
                  theme === 'dark' ? 'border-slate-700' : 'border-slate-200'
                }`}>
                  <button
                    onClick={() => setViewMode('card')}
                    className={`p-2 transition-colors ${
                      viewMode === 'card'
                        ? 'bg-emerald-500 text-white'
                        : theme === 'dark'
                          ? 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                          : 'bg-white hover:bg-slate-100 text-slate-700'
                    }`}
                    title="Card View"
                  >
                    <LayoutGrid className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setViewMode('table')}
                    className={`p-2 transition-colors ${
                      viewMode === 'table'
                        ? 'bg-emerald-500 text-white'
                        : theme === 'dark'
                          ? 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                          : 'bg-white hover:bg-slate-100 text-slate-700'
                    }`}
                    title="Table View"
                  >
                    <List className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* Results Count */}
            <div className={`mt-4 flex items-center justify-between text-sm ${
              theme === 'dark' ? 'text-slate-400' : 'text-slate-600'
            }`}>
              <span>
                Showing {startIndex + 1}-{Math.min(endIndex, filteredShops.length)} of {filteredShops.length} shops
              </span>
            </div>
          </div>

          {/* Card View */}
          {viewMode === 'card' && (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {paginatedShops.map(shop => (
                <ShopCard
                  key={shop.id}
                  shop={shop}
                  theme={theme}
                  onView={() => viewShopDetails(shop)}
                  onViewDashboard={() => viewShopDashboard(shop)}
                />
              ))}
            </div>
          )}

          {/* Table View */}
          {viewMode === 'table' && (
            <div className={`rounded-2xl border overflow-hidden ${
              theme === 'dark' ? 'border-slate-700/50' : 'border-slate-200'
            }`}>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className={theme === 'dark' ? 'bg-slate-800/50' : 'bg-slate-50'}>
                    <tr>
                      {['Shop', 'Email', 'Status', 'Users', 'Customers', 'Products', 'Invoices', 'Actions'].map(header => (
                        <th
                          key={header}
                          className={`px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider ${
                            theme === 'dark' ? 'text-slate-400' : 'text-slate-600'
                          }`}
                        >
                          {header}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className={`divide-y ${theme === 'dark' ? 'divide-slate-700/50' : 'divide-slate-200'}`}>
                    {paginatedShops.map(shop => (
                      <tr
                        key={shop.id}
                        className={`transition-colors ${
                          theme === 'dark' ? 'hover:bg-slate-800/30' : 'hover:bg-slate-50'
                        }`}
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                              theme === 'dark' ? 'bg-slate-700/50' : 'bg-slate-100'
                            }`}>
                              <Store className={`w-5 h-5 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`} />
                            </div>
                            <div>
                              <p className={`font-medium ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                                {shop.name}
                              </p>
                              <p className={`text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                                @{shop.slug}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className={`px-6 py-4 ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                          {shop.email || '—'}
                        </td>
                        <td className="px-6 py-4">
                          <StatusBadge isActive={shop.isActive} />
                        </td>
                        <td className={`px-6 py-4 ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                          {shop.userCount}
                        </td>
                        <td className={`px-6 py-4 ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                          {shop.customerCount}
                        </td>
                        <td className={`px-6 py-4 ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                          {shop.productCount}
                        </td>
                        <td className={`px-6 py-4 ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                          {shop.invoiceCount}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => viewShopDashboard(shop)}
                              disabled={!shop.isActive}
                              className={`p-2 rounded-lg transition-colors ${
                                shop.isActive
                                  ? theme === 'dark'
                                    ? 'hover:bg-emerald-500/20 text-emerald-400 hover:text-emerald-300'
                                    : 'hover:bg-emerald-100 text-emerald-600 hover:text-emerald-700'
                                  : theme === 'dark'
                                    ? 'text-slate-600 cursor-not-allowed'
                                    : 'text-slate-300 cursor-not-allowed'
                              }`}
                              title={shop.isActive ? 'View Dashboard' : 'Shop is inactive'}
                            >
                              <LayoutDashboard className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => viewShopDetails(shop)}
                              className={`p-2 rounded-lg transition-colors ${
                                theme === 'dark'
                                  ? 'hover:bg-slate-700/50 text-slate-400 hover:text-white'
                                  : 'hover:bg-slate-100 text-slate-600 hover:text-slate-900'
                              }`}
                              title="View Details"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Pagination */}
          {filteredShops.length > 0 && (
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              pageSize={pageSize}
              totalItems={filteredShops.length}
              pageSizeOptions={pageSizeOptions}
              theme={theme}
              onPageChange={setCurrentPage}
              onPageSizeChange={(size) => {
                setPageSize(size);
                setCurrentPage(1);
              }}
            />
          )}
        </div>
      )}

      {/* ===================================
          USERS SECTION
      =================================== */}
      {activeSection === 'users' && (
        <div className="space-y-4">
          {/* Search, Filters & Actions */}
          <div className={`rounded-2xl border p-3 sm:p-4 ${
            theme === 'dark'
              ? 'bg-slate-800/30 border-slate-700/50'
              : 'bg-white border-slate-200 shadow-sm'
          }`}>
            <div className="flex flex-col lg:flex-row gap-3">
              {/* Search */}
              <div className={`flex items-center gap-2 px-3 sm:px-4 py-2 rounded-xl border flex-1 ${
                theme === 'dark' ? 'bg-slate-800/50 border-slate-700/50' : 'bg-slate-50 border-slate-200'
              }`}>
                <Search className={`w-5 h-5 flex-shrink-0 ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`} />
                <input
                  type="text"
                  placeholder="Search users by name, email, or shop..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className={`bg-transparent border-none outline-none flex-1 min-w-0 text-sm ${
                    theme === 'dark' ? 'text-white placeholder-slate-500' : 'text-slate-900 placeholder-slate-400'
                  }`}
                />
              </div>

              {/* Filters */}
              <div className="flex items-center gap-2 flex-wrap">
                {/* Status Filter */}
                <div className="w-full sm:w-40">
                  <SearchableSelect
                    value={statusFilter}
                    onValueChange={(value) => setStatusFilter(value as StatusFilter)}
                    placeholder="All Status"
                    searchPlaceholder="Search..."
                    emptyMessage="No options"
                    theme={theme === 'dark' ? 'dark' : 'light'}
                    options={[
                      { value: 'all', label: 'All Status' },
                      { value: 'active', label: 'Active' },
                      { value: 'inactive', label: 'Inactive' },
                    ]}
                  />
                </div>

                {/* Role Filter */}
                <div className="w-full sm:w-44">
                  <SearchableSelect
                    value={roleFilter}
                    onValueChange={(value) => setRoleFilter(value as RoleFilter)}
                    placeholder="All Roles"
                    searchPlaceholder="Search..."
                    emptyMessage="No options"
                    theme={theme === 'dark' ? 'dark' : 'light'}
                    options={[
                      { value: 'all', label: 'All Roles' },
                      { value: 'SUPER_ADMIN', label: 'Super Admin' },
                      { value: 'ADMIN', label: 'Admin' },
                      { value: 'MANAGER', label: 'Manager' },
                      { value: 'STAFF', label: 'Staff' },
                    ]}
                  />
                </div>

                {/* Clear Filters */}
                {(statusFilter !== 'all' || roleFilter !== 'all' || searchQuery) && (
                  <button
                    onClick={() => {
                      setStatusFilter('all');
                      setRoleFilter('all');
                      setSearchQuery('');
                    }}
                    className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-xl transition-colors ${
                      theme === 'dark' 
                        ? 'text-slate-400 hover:text-white hover:bg-slate-700' 
                        : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    Clear
                  </button>
                )}

                {/* View Toggle */}
                <div className={`flex items-center rounded-xl overflow-hidden border ${
                  theme === 'dark' ? 'border-slate-700' : 'border-slate-200'
                }`}>
                  <button
                    onClick={() => setViewMode('card')}
                    className={`p-2 transition-colors ${
                      viewMode === 'card'
                        ? 'bg-emerald-500 text-white'
                        : theme === 'dark'
                          ? 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                          : 'bg-white hover:bg-slate-100 text-slate-700'
                    }`}
                    title="Card View"
                  >
                    <LayoutGrid className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setViewMode('table')}
                    className={`p-2 transition-colors ${
                      viewMode === 'table'
                        ? 'bg-emerald-500 text-white'
                        : theme === 'dark'
                          ? 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                          : 'bg-white hover:bg-slate-100 text-slate-700'
                    }`}
                    title="Table View"
                  >
                    <List className="w-4 h-4" />
                  </button>
                </div>

                {/* Create User Button */}
                <button
                  onClick={() => setIsCreateUserModalOpen(true)}
                  className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-xl font-medium shadow-lg hover:shadow-emerald-500/25 transition-all"
                >
                  <UserPlus className="w-5 h-5" />
                  <span className="hidden sm:inline">Create User</span>
                </button>
              </div>
            </div>
          </div>

          {/* Card View */}
          {viewMode === 'card' && (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {paginatedUsers.map(user => (
                <UserCard
                  key={user.id}
                  user={user}
                  theme={theme}
                  getRoleBadgeColor={getRoleBadgeColor}
                  onEdit={() => {
                    setSelectedUser(user);
                    setIsEditUserModalOpen(true);
                  }}
                  onResetPassword={() => {
                    setSelectedUser(user);
                    setIsResetPasswordModalOpen(true);
                  }}
                  onDelete={() => {
                    setSelectedUser(user);
                    setIsDeleteUserModalOpen(true);
                  }}
                />
              ))}
            </div>
          )}

          {/* Table View */}
          {viewMode === 'table' && (
            <div className={`rounded-2xl border overflow-hidden ${
              theme === 'dark' ? 'border-slate-700/50' : 'border-slate-200'
            }`}>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className={theme === 'dark' ? 'bg-slate-800/50' : 'bg-slate-50'}>
                    <tr>
                      {['User', 'Role', 'Shop', 'Status', 'Last Login', 'Actions'].map(header => (
                        <th
                          key={header}
                          className={`px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider ${
                            theme === 'dark' ? 'text-slate-400' : 'text-slate-600'
                          }`}
                        >
                          {header}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className={`divide-y ${theme === 'dark' ? 'divide-slate-700/50' : 'divide-slate-200'}`}>
                    {paginatedUsers.map(user => (
                      <tr
                        key={user.id}
                        className={`transition-colors ${
                          theme === 'dark' ? 'hover:bg-slate-800/30' : 'hover:bg-slate-50'
                        }`}
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                              theme === 'dark' ? 'bg-slate-700' : 'bg-slate-200'
                            }`}>
                              <span className={`text-sm font-semibold ${theme === 'dark' ? 'text-white' : 'text-slate-700'}`}>
                                {user.name.charAt(0).toUpperCase()}
                              </span>
                            </div>
                            <div>
                              <p className={`font-medium ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                                {user.name}
                              </p>
                              <p className={`text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                                {user.email}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium border bg-gradient-to-r ${getRoleBadgeColor(user.role)}`}>
                            {user.role}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className={theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}>
                            {user.shop?.name || '—'}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <StatusBadge isActive={user.isActive} />
                        </td>
                        <td className={`px-6 py-4 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                          {user.lastLogin
                            ? new Date(user.lastLogin).toLocaleDateString()
                            : 'Never'
                          }
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => {
                                setSelectedUser(user);
                                setIsEditUserModalOpen(true);
                              }}
                              className={`p-2 rounded-lg transition-colors ${
                                theme === 'dark'
                                  ? 'hover:bg-slate-700/50 text-slate-400 hover:text-white'
                                  : 'hover:bg-slate-100 text-slate-600 hover:text-slate-900'
                              }`}
                              title="Edit User"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => {
                                setSelectedUser(user);
                                setIsResetPasswordModalOpen(true);
                              }}
                              className={`p-2 rounded-lg transition-colors ${
                                theme === 'dark'
                                  ? 'hover:bg-slate-700/50 text-slate-400 hover:text-amber-400'
                                  : 'hover:bg-slate-100 text-slate-600 hover:text-amber-600'
                              }`}
                              title="Reset Password"
                            >
                              <Key className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => {
                                setSelectedUser(user);
                                setIsDeleteUserModalOpen(true);
                              }}
                              className={`p-2 rounded-lg transition-colors ${
                                theme === 'dark'
                                  ? 'hover:bg-red-500/10 text-slate-400 hover:text-red-400'
                                  : 'hover:bg-red-50 text-slate-600 hover:text-red-600'
                              }`}
                              title="Delete User"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Pagination */}
          {filteredUsers.length > 0 && (
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              pageSize={pageSize}
              totalItems={filteredUsers.length}
              pageSizeOptions={pageSizeOptions}
              theme={theme}
              onPageChange={setCurrentPage}
              onPageSizeChange={(size) => {
                setPageSize(size);
                setCurrentPage(1);
              }}
            />
          )}
        </div>
      )}

      {/* ===================================
          ACTIVITY LOG SECTION
      =================================== */}
      {activeSection === 'activity' && (
        <div className="space-y-6">
          {/* Activity Header */}
          <div className={`rounded-2xl border p-6 ${
            theme === 'dark'
              ? 'bg-gradient-to-br from-slate-800/50 to-slate-900/50 border-slate-700/50'
              : 'bg-white border-slate-200 shadow-sm'
          }`}>
            <div className="flex items-center gap-4 mb-6">
              <div className="p-3 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 shadow-lg shadow-purple-500/20">
                <Activity className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className={`text-xl font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                  Activity Log
                </h2>
                <p className={`text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                  Monitor system-wide activities and changes across all shops
                </p>
              </div>
            </div>

            {/* Activity Filters */}
            <div className="flex flex-wrap gap-3">
              <div className={`flex items-center gap-2 px-4 py-2 rounded-xl border ${
                theme === 'dark' ? 'bg-slate-800/50 border-slate-700/50' : 'bg-slate-50 border-slate-200'
              }`}>
                <Search className={`w-4 h-4 ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`} />
                <input
                  type="text"
                  placeholder="Search activities..."
                  className={`bg-transparent border-none outline-none text-sm ${
                    theme === 'dark' ? 'text-white placeholder-slate-500' : 'text-slate-900 placeholder-slate-400'
                  }`}
                />
              </div>
              <select className={`px-4 py-2 rounded-xl border text-sm ${
                theme === 'dark' 
                  ? 'bg-slate-800/50 border-slate-700/50 text-white' 
                  : 'bg-white border-slate-200 text-slate-900'
              }`}>
                <option value="all">All Activities</option>
                <option value="user">User Actions</option>
                <option value="shop">Shop Changes</option>
                <option value="invoice">Invoice Activity</option>
                <option value="system">System Events</option>
              </select>
              <select className={`px-4 py-2 rounded-xl border text-sm ${
                theme === 'dark' 
                  ? 'bg-slate-800/50 border-slate-700/50 text-white' 
                  : 'bg-white border-slate-200 text-slate-900'
              }`}>
                <option value="7d">Last 7 Days</option>
                <option value="30d">Last 30 Days</option>
                <option value="90d">Last 90 Days</option>
                <option value="all">All Time</option>
              </select>
            </div>
          </div>

          {/* Activity Timeline */}
          <div className={`rounded-2xl border overflow-hidden ${
            theme === 'dark' ? 'border-slate-700/50' : 'border-slate-200'
          }`}>
            <div className={`px-6 py-4 border-b ${
              theme === 'dark' ? 'bg-slate-800/50 border-slate-700/50' : 'bg-slate-50 border-slate-200'
            }`}>
              <h3 className={`font-semibold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                Recent Activity
              </h3>
            </div>
            <div className={`divide-y ${theme === 'dark' ? 'divide-slate-700/50' : 'divide-slate-200'}`}>
              {/* Sample Activity Items */}
              {[
                { 
                  type: 'user_created', 
                  message: 'New user "John Doe" was created', 
                  shop: 'Ecotec Mobile', 
                  time: '2 minutes ago',
                  icon: UserPlus,
                  color: 'from-emerald-500 to-green-500'
                },
                { 
                  type: 'shop_updated', 
                  message: 'Shop settings updated for "Tech Store"', 
                  shop: 'Tech Store', 
                  time: '15 minutes ago',
                  icon: Building2,
                  color: 'from-blue-500 to-cyan-500'
                },
                { 
                  type: 'invoice_created', 
                  message: 'New invoice INV-10260045 created', 
                  shop: 'Mobile World', 
                  time: '1 hour ago',
                  icon: FileText,
                  color: 'from-purple-500 to-pink-500'
                },
                { 
                  type: 'user_login', 
                  message: 'Admin user logged in', 
                  shop: 'Ecotec Mobile', 
                  time: '2 hours ago',
                  icon: LogIn,
                  color: 'from-amber-500 to-orange-500'
                },
                { 
                  type: 'shop_created', 
                  message: 'New shop "Galaxy Electronics" registered', 
                  shop: 'Galaxy Electronics', 
                  time: '5 hours ago',
                  icon: Store,
                  color: 'from-teal-500 to-cyan-500'
                },
                { 
                  type: 'password_reset', 
                  message: 'Password reset for user "manager@shop.com"', 
                  shop: 'Tech Store', 
                  time: '1 day ago',
                  icon: Key,
                  color: 'from-red-500 to-rose-500'
                },
              ].map((activity, index) => {
                const ActivityIcon = activity.icon;
                return (
                  <div 
                    key={index}
                    className={`px-6 py-4 transition-colors ${
                      theme === 'dark' ? 'hover:bg-slate-800/30' : 'hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-start gap-4">
                      <div className={`p-2.5 rounded-xl bg-gradient-to-r ${activity.color} shadow-lg flex-shrink-0`}>
                        <ActivityIcon className="w-4 h-4 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`font-medium ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                          {activity.message}
                        </p>
                        <div className="flex items-center gap-3 mt-1">
                          <span className={`text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                            {activity.shop}
                          </span>
                          <span className={`text-xs ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>
                            •
                          </span>
                          <span className={`text-xs ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>
                            {activity.time}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            {/* View More */}
            <div className={`px-6 py-4 border-t ${
              theme === 'dark' ? 'bg-slate-800/30 border-slate-700/50' : 'bg-slate-50 border-slate-200'
            }`}>
              <button className={`w-full text-center text-sm font-medium ${
                theme === 'dark' ? 'text-emerald-400 hover:text-emerald-300' : 'text-emerald-600 hover:text-emerald-700'
              }`}>
                Load More Activities
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===================================
          MODALS
      =================================== */}

      {/* View Shop Modal */}
      {isViewShopModalOpen && selectedShop && (
        <ShopDetailModal
          shop={selectedShop}
          users={shopUsers}
          theme={theme}
          onClose={() => {
            setIsViewShopModalOpen(false);
            setSelectedShop(null);
            setShopUsers([]);
          }}
          onEditUser={(user) => {
            setSelectedUser(user);
            setIsEditUserModalOpen(true);
          }}
          onResetPassword={(user) => {
            setSelectedUser(user);
            setIsResetPasswordModalOpen(true);
          }}
          onDeleteUser={(user) => {
            setSelectedUser(user);
            setIsDeleteUserModalOpen(true);
          }}
        />
      )}

      {/* Edit User Modal */}
      {isEditUserModalOpen && selectedUser && (
        <EditUserModal
          user={selectedUser}
          shops={shops}
          theme={theme}
          token={getAccessToken()}
          onClose={() => {
            setIsEditUserModalOpen(false);
            setSelectedUser(null);
          }}
          onSuccess={() => {
            fetchData();
            setIsEditUserModalOpen(false);
            setSelectedUser(null);
          }}
        />
      )}

      {/* Reset Password Modal */}
      {isResetPasswordModalOpen && selectedUser && (
        <ResetPasswordModal
          user={selectedUser}
          theme={theme}
          token={getAccessToken()}
          onClose={() => {
            setIsResetPasswordModalOpen(false);
            setSelectedUser(null);
          }}
          onSuccess={() => {
            setIsResetPasswordModalOpen(false);
            setSelectedUser(null);
          }}
        />
      )}

      {/* Create User Modal */}
      {isCreateUserModalOpen && (
        <CreateUserModal
          shops={shops}
          theme={theme}
          token={getAccessToken()}
          onClose={() => setIsCreateUserModalOpen(false)}
          onSuccess={() => {
            fetchData();
            setIsCreateUserModalOpen(false);
          }}
        />
      )}

      {/* Delete User Modal */}
      {isDeleteUserModalOpen && selectedUser && (
        <DeleteUserModal
          user={selectedUser}
          theme={theme}
          token={getAccessToken()}
          currentUserId={user?.id || ''}
          onClose={() => {
            setIsDeleteUserModalOpen(false);
            setSelectedUser(null);
          }}
          onSuccess={() => {
            fetchData();
            setIsDeleteUserModalOpen(false);
            setSelectedUser(null);
          }}
        />
      )}
    </div>
  );
};

// ===================================
// Sub-Components
// ===================================

// Status Badge Component
const StatusBadge: React.FC<{ isActive: boolean }> = ({ isActive }) => (
  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
    isActive
      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
      : 'bg-red-500/10 text-red-400 border border-red-500/30'
  }`}>
    <span className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-emerald-400' : 'bg-red-400'}`} />
    {isActive ? 'Active' : 'Inactive'}
  </span>
);

// Shop Card Component
interface ShopCardProps {
  shop: Shop;
  theme: string;
  onView: () => void;
  onViewDashboard: () => void;
}

const ShopCard: React.FC<ShopCardProps> = ({ shop, theme, onView, onViewDashboard }) => (
  <div
    className={`relative overflow-hidden rounded-2xl border p-6 transition-all hover:shadow-lg hover:scale-[1.01] ${
      theme === 'dark'
        ? 'bg-gradient-to-br from-slate-800/50 to-slate-900/50 border-slate-700/50 hover:border-slate-600/50'
        : 'bg-white border-slate-200 shadow-sm hover:border-slate-300'
    }`}
  >
    {/* Status indicator */}
    <div className="absolute top-4 right-4">
      <StatusBadge isActive={shop.isActive} />
    </div>

    {/* Shop Info */}
    <div className="flex items-start gap-4 mb-4">
      <div className={`w-14 h-14 rounded-xl flex items-center justify-center ${
        theme === 'dark' ? 'bg-slate-700/50' : 'bg-slate-100'
      }`}>
        {shop.logo ? (
          <img src={shop.logo} alt={shop.name} className="w-10 h-10 rounded-lg object-cover" />
        ) : (
          <Store className={`w-7 h-7 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`} />
        )}
      </div>
      <div className="flex-1 min-w-0 pr-20">
        <h3 className={`font-semibold truncate ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
          {shop.name}
        </h3>
        <p className={`text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
          @{shop.slug}
        </p>
      </div>
    </div>

    {/* Stats */}
    <div className="grid grid-cols-2 gap-3 mb-4">
      {[
        { label: 'Users', value: shop.userCount, icon: Users },
        { label: 'Customers', value: shop.customerCount, icon: Users },
        { label: 'Products', value: shop.productCount, icon: Package },
        { label: 'Invoices', value: shop.invoiceCount, icon: FileText },
      ].map((stat, i) => (
        <div
          key={i}
          className={`flex items-center gap-2 p-2.5 rounded-xl ${
            theme === 'dark' ? 'bg-slate-800/50' : 'bg-slate-50'
          }`}
        >
          <stat.icon className={`w-4 h-4 ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`} />
          <span className={`text-sm font-medium ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
            {stat.value} {stat.label}
          </span>
        </div>
      ))}
    </div>

    {/* Actions */}
    <div className="flex gap-2">
      <button
        onClick={onViewDashboard}
        disabled={!shop.isActive}
        className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-medium transition-all ${
          shop.isActive
            ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-lg hover:shadow-emerald-500/25'
            : theme === 'dark'
              ? 'bg-slate-700/30 text-slate-500 cursor-not-allowed'
              : 'bg-slate-100 text-slate-400 cursor-not-allowed'
        }`}
        title={shop.isActive ? 'View shop dashboard' : 'Shop is inactive'}
      >
        <LayoutDashboard className="w-4 h-4" />
        Dashboard
      </button>
      <button
        onClick={onView}
        className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-medium transition-all ${
          theme === 'dark'
            ? 'bg-slate-700/50 text-slate-300 hover:bg-slate-600/50'
            : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
        }`}
        title="View shop details"
      >
        <Eye className="w-4 h-4" />
      </button>
    </div>
  </div>
);

// User Card Component
interface UserCardProps {
  user: User;
  theme: string;
  getRoleBadgeColor: (role: string) => string;
  onEdit: () => void;
  onResetPassword: () => void;
  onDelete: () => void;
}

const UserCard: React.FC<UserCardProps> = ({ user, theme, getRoleBadgeColor, onEdit, onResetPassword, onDelete }) => (
  <div
    className={`relative overflow-hidden rounded-2xl border p-6 transition-all hover:shadow-lg hover:scale-[1.01] ${
      theme === 'dark'
        ? 'bg-gradient-to-br from-slate-800/50 to-slate-900/50 border-slate-700/50 hover:border-slate-600/50'
        : 'bg-white border-slate-200 shadow-sm hover:border-slate-300'
    }`}
  >
    {/* Status & Role */}
    <div className="absolute top-4 right-4 flex items-center gap-2">
      <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium border bg-gradient-to-r ${getRoleBadgeColor(user.role)}`}>
        {user.role}
      </span>
    </div>

    {/* User Info */}
    <div className="flex items-start gap-4 mb-4">
      <div className={`w-14 h-14 rounded-full flex items-center justify-center ${
        theme === 'dark' ? 'bg-gradient-to-br from-slate-700 to-slate-800' : 'bg-gradient-to-br from-slate-100 to-slate-200'
      }`}>
        <span className={`text-xl font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-700'}`}>
          {user.name.charAt(0).toUpperCase()}
        </span>
      </div>
      <div className="flex-1 min-w-0 pr-24">
        <h3 className={`font-semibold truncate ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
          {user.name}
        </h3>
        <p className={`text-sm truncate ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
          {user.email}
        </p>
      </div>
    </div>

    {/* Details */}
    <div className={`space-y-2 mb-4 p-3 rounded-xl ${theme === 'dark' ? 'bg-slate-800/50' : 'bg-slate-50'}`}>
      <div className="flex items-center justify-between">
        <span className={`text-sm ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>Shop</span>
        <span className={`text-sm font-medium ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
          {user.shop?.name || 'Platform Admin'}
        </span>
      </div>
      <div className="flex items-center justify-between">
        <span className={`text-sm ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>Status</span>
        <StatusBadge isActive={user.isActive} />
      </div>
      <div className="flex items-center justify-between">
        <span className={`text-sm ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>Last Login</span>
        <span className={`text-sm font-medium ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
          {user.lastLogin ? new Date(user.lastLogin).toLocaleDateString() : 'Never'}
        </span>
      </div>
    </div>

    {/* Actions */}
    <div className="flex items-center gap-2">
      <button
        onClick={onEdit}
        className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-medium transition-all ${
          theme === 'dark'
            ? 'bg-slate-700/50 text-slate-300 hover:bg-slate-600/50'
            : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
        }`}
      >
        <Edit className="w-4 h-4" />
        Edit
      </button>
      <button
        onClick={onResetPassword}
        className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-medium transition-all ${
          theme === 'dark'
            ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30 hover:bg-amber-500/20'
            : 'bg-amber-50 text-amber-600 border border-amber-200 hover:bg-amber-100'
        }`}
        title="Reset Password"
      >
        <Key className="w-4 h-4" />
      </button>
      <button
        onClick={onDelete}
        className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-medium transition-all ${
          theme === 'dark'
            ? 'bg-red-500/10 text-red-400 border border-red-500/30 hover:bg-red-500/20'
            : 'bg-red-50 text-red-600 border border-red-200 hover:bg-red-100'
        }`}
        title="Delete User"
      >
        <Trash2 className="w-4 h-4" />
      </button>
    </div>
  </div>
);

// Pagination Component
interface PaginationProps {
  currentPage: number;
  totalPages: number;
  pageSize: number;
  totalItems: number;
  pageSizeOptions: number[];
  theme: string;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
}

const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  totalPages,
  pageSize,
  totalItems,
  pageSizeOptions,
  theme,
  onPageChange,
  onPageSizeChange,
}) => {
  // Generate page numbers to show
  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    const showPages = 5;
    
    if (totalPages <= showPages) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      if (currentPage <= 3) {
        for (let i = 1; i <= 4; i++) pages.push(i);
        pages.push('...');
        pages.push(totalPages);
      } else if (currentPage >= totalPages - 2) {
        pages.push(1);
        pages.push('...');
        for (let i = totalPages - 3; i <= totalPages; i++) pages.push(i);
      } else {
        pages.push(1);
        pages.push('...');
        for (let i = currentPage - 1; i <= currentPage + 1; i++) pages.push(i);
        pages.push('...');
        pages.push(totalPages);
      }
    }
    return pages;
  };

  return (
    <div className={`flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-2xl border ${
      theme === 'dark'
        ? 'bg-slate-800/30 border-slate-700/50'
        : 'bg-white border-slate-200 shadow-sm'
    }`}>
      {/* Left side - Info and Items Per Page */}
      <div className="flex flex-wrap items-center gap-4">
        {/* Result Info */}
        <p className={`text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
          Showing {Math.min((currentPage - 1) * pageSize + 1, totalItems)} to {Math.min(currentPage * pageSize, totalItems)} of {totalItems} items
        </p>
        
        {/* Items Per Page Selector - Modern Pill Style */}
        <div className="flex items-center gap-2">
          <span className={`text-sm ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>Show:</span>
          <div className={`flex items-center rounded-full p-0.5 ${
            theme === 'dark' ? 'bg-slate-800' : 'bg-slate-100'
          }`}>
            {pageSizeOptions.map((num) => (
              <button
                key={num}
                onClick={() => onPageSizeChange(num)}
                className={`px-3 py-1 rounded-full text-sm font-medium transition-all ${
                  pageSize === num
                    ? 'bg-emerald-500 text-white shadow-md'
                    : theme === 'dark'
                      ? 'text-slate-400 hover:text-white'
                      : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {num}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Right side - Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex items-center gap-1">
          {/* First Page */}
          <button
            onClick={() => onPageChange(1)}
            disabled={currentPage === 1}
            className={`p-2 rounded-lg transition-colors ${
              currentPage === 1
                ? theme === 'dark' ? 'text-slate-600 cursor-not-allowed' : 'text-slate-300 cursor-not-allowed'
                : theme === 'dark' ? 'hover:bg-slate-700 text-slate-400' : 'hover:bg-slate-100 text-slate-600'
            }`}
            title="First page"
          >
            <ChevronsLeft className="w-4 h-4" />
          </button>

          {/* Previous Page */}
          <button
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className={`p-2 rounded-lg transition-colors ${
              currentPage === 1
                ? theme === 'dark' ? 'text-slate-600 cursor-not-allowed' : 'text-slate-300 cursor-not-allowed'
                : theme === 'dark' ? 'hover:bg-slate-700 text-slate-400' : 'hover:bg-slate-100 text-slate-600'
            }`}
            title="Previous page"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          {/* Page Numbers */}
          <div className="hidden sm:flex items-center gap-1">
            {getPageNumbers().map((page, index) => (
              page === '...' ? (
                <span key={`ellipsis-${index}`} className={`px-2 ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>
                  ...
                </span>
              ) : (
                <button
                  key={page}
                  onClick={() => onPageChange(page as number)}
                  className={`w-9 h-9 rounded-lg text-sm font-medium transition-all ${
                    currentPage === page
                      ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/25'
                      : theme === 'dark'
                        ? 'hover:bg-slate-700 text-slate-300'
                        : 'hover:bg-slate-100 text-slate-700'
                  }`}
                >
                  {page}
                </button>
              )
            ))}
          </div>

          {/* Mobile Page Indicator */}
          <div className={`sm:hidden px-3 py-1 rounded-lg text-sm font-medium ${
            theme === 'dark' ? 'bg-slate-700 text-slate-300' : 'bg-slate-100 text-slate-700'
          }`}>
            {currentPage} / {totalPages}
          </div>

          {/* Next Page */}
          <button
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            className={`p-2 rounded-lg transition-colors ${
              currentPage === totalPages
                ? theme === 'dark' ? 'text-slate-600 cursor-not-allowed' : 'text-slate-300 cursor-not-allowed'
                : theme === 'dark' ? 'hover:bg-slate-700 text-slate-400' : 'hover:bg-slate-100 text-slate-600'
            }`}
            title="Next page"
          >
            <ChevronRight className="w-4 h-4" />
          </button>

          {/* Last Page */}
          <button
            onClick={() => onPageChange(totalPages)}
            disabled={currentPage === totalPages}
            className={`p-2 rounded-lg transition-colors ${
              currentPage === totalPages
                ? theme === 'dark' ? 'text-slate-600 cursor-not-allowed' : 'text-slate-300 cursor-not-allowed'
                : theme === 'dark' ? 'hover:bg-slate-700 text-slate-400' : 'hover:bg-slate-100 text-slate-600'
            }`}
            title="Last page"
          >
            <ChevronsRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Total Count */}
      <div className={`text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
        Total: <span className="font-semibold">{totalItems}</span> items
      </div>
    </div>
  );
};

// ===================================
// Modal Components
// ===================================

// Shop Detail Modal
interface ShopDetailModalProps {
  shop: Shop;
  users: User[];
  theme: string;
  onClose: () => void;
  onEditUser: (user: User) => void;
  onResetPassword: (user: User) => void;
  onDeleteUser: (user: User) => void;
}

const ShopDetailModal: React.FC<ShopDetailModalProps> = ({
  shop,
  users,
  theme,
  onClose,
  onEditUser,
  onResetPassword,
  onDeleteUser,
}) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className={`relative w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-2xl border ${
        theme === 'dark'
          ? 'bg-slate-900 border-slate-700/50'
          : 'bg-white border-slate-200'
      }`}>
        {/* Header */}
        <div className={`sticky top-0 z-10 flex items-center justify-between p-6 border-b ${
          theme === 'dark' ? 'bg-slate-900 border-slate-700/50' : 'bg-white border-slate-200'
        }`}>
          <div className="flex items-center gap-4">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center bg-gradient-to-br ${
              theme === 'dark' ? 'from-slate-700 to-slate-800' : 'from-slate-100 to-slate-200'
            }`}>
              <Store className={`w-6 h-6 ${theme === 'dark' ? 'text-emerald-400' : 'text-emerald-600'}`} />
            </div>
            <div>
              <h2 className={`text-xl font-semibold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                {shop.name}
              </h2>
              <p className={`text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                @{shop.slug}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className={`p-2.5 rounded-xl transition-colors ${
              theme === 'dark'
                ? 'hover:bg-slate-800 text-slate-400 hover:text-white'
                : 'hover:bg-slate-100 text-slate-600 hover:text-slate-900'
            }`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Shop Details Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Email', value: shop.email || '—' },
              { label: 'Phone', value: shop.phone || '—' },
              { label: 'Currency', value: shop.currency },
              { label: 'Tax Rate', value: `${shop.taxRate}%` },
            ].map((item, i) => (
              <div key={i} className={`p-4 rounded-xl ${
                theme === 'dark' ? 'bg-slate-800/50' : 'bg-slate-50'
              }`}>
                <p className={`text-xs font-medium mb-1 ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>
                  {item.label}
                </p>
                <p className={`font-medium truncate ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                  {item.value}
                </p>
              </div>
            ))}
          </div>

          {/* Users List */}
          <div>
            <h3 className={`text-lg font-semibold mb-4 flex items-center gap-2 ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
              <Users className="w-5 h-5" />
              Users ({users.length})
            </h3>
            <div className="space-y-2">
              {users.map(user => (
                <div
                  key={user.id}
                  className={`flex items-center justify-between p-4 rounded-xl transition-colors ${
                    theme === 'dark' ? 'bg-slate-800/50 hover:bg-slate-800' : 'bg-slate-50 hover:bg-slate-100'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      theme === 'dark' ? 'bg-slate-700' : 'bg-slate-200'
                    }`}>
                      <span className={`text-sm font-semibold ${theme === 'dark' ? 'text-white' : 'text-slate-700'}`}>
                        {user.name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <p className={`font-medium ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                        {user.name}
                      </p>
                      <p className={`text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                        {user.email} • {user.role}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <StatusBadge isActive={user.isActive} />
                    <button
                      onClick={() => onEditUser(user)}
                      className={`p-2 rounded-lg transition-colors ${
                        theme === 'dark'
                          ? 'hover:bg-slate-700 text-slate-400 hover:text-white'
                          : 'hover:bg-slate-200 text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => onResetPassword(user)}
                      className={`p-2 rounded-lg transition-colors ${
                        theme === 'dark'
                          ? 'hover:bg-slate-700 text-slate-400 hover:text-amber-400'
                          : 'hover:bg-slate-200 text-slate-600 hover:text-amber-600'
                      }`}
                    >
                      <Key className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => onDeleteUser(user)}
                      className={`p-2 rounded-lg transition-colors ${
                        theme === 'dark'
                          ? 'hover:bg-red-500/10 text-slate-400 hover:text-red-400'
                          : 'hover:bg-red-50 text-slate-600 hover:text-red-600'
                      }`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
              {users.length === 0 && (
                <p className={`text-center py-8 ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>
                  No users in this shop
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Edit User Modal
interface EditUserModalProps {
  user: User;
  shops: Shop[];
  theme: string;
  token: string | null;
  onClose: () => void;
  onSuccess: () => void;
}

const EditUserModal: React.FC<EditUserModalProps> = ({
  user,
  shops,
  theme,
  token,
  onClose,
  onSuccess,
}) => {
  const [formData, setFormData] = useState({
    name: user.name,
    email: user.email,
    role: user.role,
    isActive: user.isActive,
    shopId: user.shop?.id || '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch(`${API_URL}/admin/users/${user.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...formData,
          shopId: formData.shopId || null,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to update user');

      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update user');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className={`relative w-full max-w-md rounded-2xl border ${
        theme === 'dark' ? 'bg-slate-900 border-slate-700/50' : 'bg-white border-slate-200'
      }`}>
        {/* Header */}
        <div className={`flex items-center justify-between p-6 border-b ${
          theme === 'dark' ? 'border-slate-700/50' : 'border-slate-200'
        }`}>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-gradient-to-r from-blue-500 to-cyan-500">
              <Edit className="w-5 h-5 text-white" />
            </div>
            <h2 className={`text-xl font-semibold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
              Edit User
            </h2>
          </div>
          <button onClick={onClose} className={`p-2 rounded-lg ${
            theme === 'dark' ? 'hover:bg-slate-800 text-slate-400' : 'hover:bg-slate-100 text-slate-600'
          }`}>
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" />
              {error}
            </div>
          )}

          <div>
            <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
              Name
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              className={`w-full px-4 py-2.5 rounded-xl border transition-all ${
                theme === 'dark'
                  ? 'bg-slate-800/50 border-slate-700/50 text-white focus:border-emerald-500/50'
                  : 'bg-white border-slate-200 text-slate-900 focus:border-emerald-500'
              }`}
              required
            />
          </div>

          <div>
            <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
              Email
            </label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
              className={`w-full px-4 py-2.5 rounded-xl border transition-all ${
                theme === 'dark'
                  ? 'bg-slate-800/50 border-slate-700/50 text-white focus:border-emerald-500/50'
                  : 'bg-white border-slate-200 text-slate-900 focus:border-emerald-500'
              }`}
              required
            />
          </div>

          <div>
            <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
              Role
            </label>
            <SearchableSelect
              value={formData.role}
              onValueChange={(value) => setFormData(prev => ({ ...prev, role: value as any }))}
              placeholder="Select role"
              searchPlaceholder="Search roles..."
              emptyMessage="No roles found"
              theme={theme === 'dark' ? 'dark' : 'light'}
              options={[
                { value: 'SUPER_ADMIN', label: 'Super Admin' },
                { value: 'ADMIN', label: 'Admin' },
                { value: 'MANAGER', label: 'Manager' },
                { value: 'STAFF', label: 'Staff' },
              ]}
            />
          </div>

          <div>
            <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
              Shop
            </label>
            <SearchableSelect
              value={formData.shopId}
              onValueChange={(value) => setFormData(prev => ({ ...prev, shopId: value }))}
              placeholder="Select shop"
              searchPlaceholder="Search shops..."
              emptyMessage="No shops found"
              theme={theme === 'dark' ? 'dark' : 'light'}
              options={[
                { value: '', label: 'No Shop (Platform Admin)' },
                ...shops.map(shop => ({
                  value: shop.id,
                  label: shop.name,
                })),
              ]}
            />
          </div>

          <div>
            <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
              Account Status
            </label>
            <SearchableSelect
              value={formData.isActive ? 'active' : 'inactive'}
              onValueChange={(value) => setFormData(prev => ({ ...prev, isActive: value === 'active' }))}
              placeholder="Select status"
              searchPlaceholder="Search..."
              emptyMessage="No options"
              theme={theme === 'dark' ? 'dark' : 'light'}
              options={[
                { value: 'active', label: 'Active' },
                { value: 'inactive', label: 'Inactive' },
              ]}
            />
          </div>

          <div className={`flex justify-end gap-3 pt-4 border-t ${
            theme === 'dark' ? 'border-slate-700/50' : 'border-slate-200'
          }`}>
            <button
              type="button"
              onClick={onClose}
              className={`px-4 py-2.5 rounded-xl font-medium transition-all ${
                theme === 'dark'
                  ? 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-xl font-medium shadow-lg hover:shadow-emerald-500/25 transition-all"
            >
              {isLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Reset Password Modal
interface ResetPasswordModalProps {
  user: User;
  theme: string;
  token: string | null;
  onClose: () => void;
  onSuccess: () => void;
}

const ResetPasswordModal: React.FC<ResetPasswordModalProps> = ({
  user,
  theme,
  token,
  onClose,
  onSuccess,
}) => {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch(`${API_URL}/admin/users/${user.id}/reset-password`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ newPassword }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to reset password');

      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reset password');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className={`relative w-full max-w-md rounded-2xl border ${
        theme === 'dark' ? 'bg-slate-900 border-slate-700/50' : 'bg-white border-slate-200'
      }`}>
        {/* Header */}
        <div className={`flex items-center justify-between p-6 border-b ${
          theme === 'dark' ? 'border-slate-700/50' : 'border-slate-200'
        }`}>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500">
              <Key className="w-5 h-5 text-white" />
            </div>
            <h2 className={`text-xl font-semibold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
              Reset Password
            </h2>
          </div>
          <button onClick={onClose} className={`p-2 rounded-lg ${
            theme === 'dark' ? 'hover:bg-slate-800 text-slate-400' : 'hover:bg-slate-100 text-slate-600'
          }`}>
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className={`p-4 rounded-xl ${theme === 'dark' ? 'bg-slate-800/50' : 'bg-slate-50'}`}>
            <p className={`text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
              Setting new password for:
            </p>
            <p className={`font-semibold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
              {user.name} ({user.email})
            </p>
          </div>

          {error && (
            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" />
              {error}
            </div>
          )}

          <div>
            <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
              New Password
            </label>
            <input
              type={showPassword ? 'text' : 'password'}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className={`w-full px-4 py-2.5 rounded-xl border transition-all ${
                theme === 'dark'
                  ? 'bg-slate-800/50 border-slate-700/50 text-white focus:border-amber-500/50'
                  : 'bg-white border-slate-200 text-slate-900 focus:border-amber-500'
              }`}
              required
              minLength={8}
              placeholder="Min 8 characters"
            />
          </div>

          <div>
            <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
              Confirm Password
            </label>
            <input
              type={showPassword ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className={`w-full px-4 py-2.5 rounded-xl border transition-all ${
                theme === 'dark'
                  ? 'bg-slate-800/50 border-slate-700/50 text-white focus:border-amber-500/50'
                  : 'bg-white border-slate-200 text-slate-900 focus:border-amber-500'
              }`}
              required
              minLength={8}
            />
          </div>

          <div className={`flex items-center gap-3 p-3 rounded-xl ${
            theme === 'dark' ? 'bg-slate-800/50' : 'bg-slate-50'
          }`}>
            <input
              type="checkbox"
              id="showPassword"
              checked={showPassword}
              onChange={(e) => setShowPassword(e.target.checked)}
              className="w-5 h-5 rounded border-slate-300 text-amber-500 focus:ring-amber-500"
            />
            <label htmlFor="showPassword" className={`font-medium ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
              Show password
            </label>
          </div>

          <div className={`flex justify-end gap-3 pt-4 border-t ${
            theme === 'dark' ? 'border-slate-700/50' : 'border-slate-200'
          }`}>
            <button
              type="button"
              onClick={onClose}
              className={`px-4 py-2.5 rounded-xl font-medium transition-all ${
                theme === 'dark'
                  ? 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-xl font-medium shadow-lg hover:shadow-amber-500/25 transition-all"
            >
              {isLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Key className="w-4 h-4" />}
              Reset Password
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Create User Modal
interface CreateUserModalProps {
  shops: Shop[];
  theme: string;
  token: string | null;
  onClose: () => void;
  onSuccess: () => void;
}

const CreateUserModal: React.FC<CreateUserModalProps> = ({
  shops,
  theme,
  token,
  onClose,
  onSuccess,
}) => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'STAFF' as 'SUPER_ADMIN' | 'ADMIN' | 'MANAGER' | 'STAFF',
    shopId: '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch(`${API_URL}/admin/users`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...formData,
          shopId: formData.shopId || null,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to create user');

      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create user');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className={`relative w-full max-w-md rounded-2xl border ${
        theme === 'dark' ? 'bg-slate-900 border-slate-700/50' : 'bg-white border-slate-200'
      }`}>
        {/* Header */}
        <div className={`flex items-center justify-between p-6 border-b ${
          theme === 'dark' ? 'border-slate-700/50' : 'border-slate-200'
        }`}>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 shadow-lg shadow-emerald-500/25">
              <UserPlus className="w-5 h-5 text-white" />
            </div>
            <h2 className={`text-xl font-semibold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
              Create User
            </h2>
          </div>
          <button onClick={onClose} className={`p-2 rounded-lg ${
            theme === 'dark' ? 'hover:bg-slate-800 text-slate-400' : 'hover:bg-slate-100 text-slate-600'
          }`}>
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" />
              {error}
            </div>
          )}

          <div>
            <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
              Name
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              className={`w-full px-4 py-2.5 rounded-xl border transition-all ${
                theme === 'dark'
                  ? 'bg-slate-800/50 border-slate-700/50 text-white focus:border-emerald-500/50'
                  : 'bg-white border-slate-200 text-slate-900 focus:border-emerald-500'
              }`}
              required
              placeholder="John Doe"
            />
          </div>

          <div>
            <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
              Email
            </label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
              className={`w-full px-4 py-2.5 rounded-xl border transition-all ${
                theme === 'dark'
                  ? 'bg-slate-800/50 border-slate-700/50 text-white focus:border-emerald-500/50'
                  : 'bg-white border-slate-200 text-slate-900 focus:border-emerald-500'
              }`}
              required
              placeholder="john@example.com"
            />
          </div>

          <div>
            <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
              Password
            </label>
            <input
              type="password"
              value={formData.password}
              onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
              className={`w-full px-4 py-2.5 rounded-xl border transition-all ${
                theme === 'dark'
                  ? 'bg-slate-800/50 border-slate-700/50 text-white focus:border-emerald-500/50'
                  : 'bg-white border-slate-200 text-slate-900 focus:border-emerald-500'
              }`}
              required
              minLength={8}
              placeholder="Min 8 characters"
            />
          </div>

          <div>
            <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
              Role
            </label>
            <SearchableSelect
              value={formData.role}
              onValueChange={(value) => setFormData(prev => ({ ...prev, role: value as any }))}
              placeholder="Select role"
              searchPlaceholder="Search roles..."
              emptyMessage="No roles found"
              theme={theme === 'dark' ? 'dark' : 'light'}
              options={[
                { value: 'SUPER_ADMIN', label: 'Super Admin' },
                { value: 'ADMIN', label: 'Admin' },
                { value: 'MANAGER', label: 'Manager' },
                { value: 'STAFF', label: 'Staff' },
              ]}
            />
          </div>

          <div>
            <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
              Shop
            </label>
            <SearchableSelect
              value={formData.shopId}
              onValueChange={(value) => setFormData(prev => ({ ...prev, shopId: value }))}
              placeholder="Select shop"
              searchPlaceholder="Search shops..."
              emptyMessage="No shops found"
              theme={theme === 'dark' ? 'dark' : 'light'}
              options={[
                { value: '', label: 'No Shop (Platform Admin)' },
                ...shops.map(shop => ({
                  value: shop.id,
                  label: shop.name,
                })),
              ]}
            />
          </div>

          <div className={`flex justify-end gap-3 pt-4 border-t ${
            theme === 'dark' ? 'border-slate-700/50' : 'border-slate-200'
          }`}>
            <button
              type="button"
              onClick={onClose}
              className={`px-4 py-2.5 rounded-xl font-medium transition-all ${
                theme === 'dark'
                  ? 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-xl font-medium shadow-lg hover:shadow-emerald-500/25 transition-all"
            >
              {isLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
              Create User
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ===================================
// Delete User Modal
// ===================================

interface DeleteUserModalProps {
  user: User;
  theme: string;
  token: string | null;
  currentUserId: string;
  onClose: () => void;
  onSuccess: () => void;
}

const DeleteUserModal: React.FC<DeleteUserModalProps> = ({
  user,
  theme,
  token,
  currentUserId,
  onClose,
  onSuccess,
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmText, setConfirmText] = useState('');

  const isSelf = user.id === currentUserId;
  const canDelete = confirmText === 'DELETE' && !isSelf;

  const handleDelete = async () => {
    if (!canDelete) return;
    
    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch(`${API_URL}/admin/users/${user.id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to delete user');

      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete user');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className={`relative w-full max-w-md rounded-2xl border ${
        theme === 'dark' ? 'bg-slate-900 border-slate-700/50' : 'bg-white border-slate-200'
      }`}>
        {/* Header */}
        <div className={`flex items-center justify-between p-6 border-b ${
          theme === 'dark' ? 'border-slate-700/50' : 'border-slate-200'
        }`}>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-red-500/10">
              <Trash2 className="w-5 h-5 text-red-500" />
            </div>
            <h2 className={`text-xl font-semibold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
              Delete User
            </h2>
          </div>
          <button onClick={onClose} className={`p-2 rounded-lg ${
            theme === 'dark' ? 'hover:bg-slate-800 text-slate-400' : 'hover:bg-slate-100 text-slate-600'
          }`}>
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {isSelf ? (
            <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20">
              <div className="flex items-center gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-500" />
                <p className="text-amber-400 font-medium">You cannot delete your own account</p>
              </div>
            </div>
          ) : (
            <>
              <div className={`p-4 rounded-xl ${theme === 'dark' ? 'bg-slate-800/50' : 'bg-slate-50'}`}>
                <p className={`text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                  You are about to delete:
                </p>
                <p className={`font-semibold mt-1 ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                  {user.name}
                </p>
                <p className={`text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                  {user.email} • {user.role}
                </p>
              </div>

              <div className={`p-4 rounded-xl bg-red-500/10 border border-red-500/20`}>
                <p className="text-red-400 text-sm">
                  <strong>Warning:</strong> This will permanently delete the user account from the database. This action cannot be undone.
                </p>
              </div>

              {error && (
                <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                  {error}
                </div>
              )}

              <div>
                <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                  Type <span className="font-mono text-red-400">DELETE</span> to confirm
                </label>
                <input
                  type="text"
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                  placeholder="Type DELETE here..."
                  className={`w-full px-4 py-2.5 rounded-xl border ${
                    theme === 'dark'
                      ? 'bg-slate-800/50 border-slate-700/50 text-white placeholder-slate-500'
                      : 'bg-white border-slate-200 text-slate-900 placeholder-slate-400'
                  }`}
                />
              </div>
            </>
          )}

          <div className={`flex justify-end gap-3 pt-4 border-t ${
            theme === 'dark' ? 'border-slate-700/50' : 'border-slate-200'
          }`}>
            <button
              type="button"
              onClick={onClose}
              className={`px-4 py-2.5 rounded-xl font-medium ${
                theme === 'dark'
                  ? 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              Cancel
            </button>
            {!isSelf && (
              <button
                onClick={handleDelete}
                disabled={!canDelete || isLoading}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium transition-all ${
                  canDelete
                    ? 'bg-gradient-to-r from-red-500 to-rose-500 text-white shadow-lg hover:shadow-red-500/25'
                    : 'bg-slate-600 text-slate-400 cursor-not-allowed'
                }`}
              >
                {isLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                Delete User
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
