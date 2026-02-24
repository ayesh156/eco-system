import React, { useState, useEffect, useMemo } from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import { useShopSections, ALL_SECTIONS } from '../../contexts/ShopSectionsContext';
import { useNavigate, useLocation } from 'react-router-dom';
import { SearchableSelect } from '../../components/ui/searchable-select';
import { ShopBrandingTab } from '../../components/admin/ShopBrandingTab';
import { toast } from 'sonner';
import {
  Users,
  Search,
  RefreshCw,
  Edit,
  Key,
  UserPlus,
  Package,
  FileText,
  CheckCircle,
  XCircle,
  ChevronRight,
  ChevronLeft,
  X,
  Save,
  LayoutGrid,
  List,
  ChevronsLeft,
  ChevronsRight,
  Trash2,
  ShieldCheck,
  UserCog,
  Eye,
  EyeOff,
  Layers,
} from 'lucide-react';

// API URL from environment
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api/v1';

// ===================================
// Types
// ===================================

interface ShopUser {
  id: string;
  email: string;
  name: string;
  role: 'SUPER_ADMIN' | 'ADMIN' | 'MANAGER' | 'STAFF';
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  lastLogin: string | null;
}

interface ShopStats {
  shop: {
    id: string;
    name: string;
    slug: string;
  } | null;
  totalUsers: number;
  activeUsers: number;
  inactiveUsers: number;
  totalCustomers: number;
  totalProducts: number;
  totalInvoices: number;
}

type ViewMode = 'card' | 'table';
type StatusFilter = 'all' | 'active' | 'inactive';
type RoleFilter = 'all' | 'MANAGER' | 'STAFF';

// ===================================
// Section Visibility Tab Component
// ===================================

interface SectionVisibilityTabProps {
  hiddenSections: string[];
  onUpdateSections: (sections: string[]) => Promise<void>;
  isLoading: boolean;
  theme: 'dark' | 'light';
}

const SectionVisibilityTab: React.FC<SectionVisibilityTabProps> = ({
  hiddenSections,
  onUpdateSections,
  isLoading,
  theme,
}) => {
  const [localHiddenSections, setLocalHiddenSections] = useState<string[]>(hiddenSections);
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // Sync local state when props change
  useEffect(() => {
    setLocalHiddenSections(hiddenSections);
  }, [hiddenSections]);

  // Check if there are unsaved changes
  useEffect(() => {
    const sortedLocal = [...localHiddenSections].sort();
    const sortedProp = [...hiddenSections].sort();
    setHasChanges(JSON.stringify(sortedLocal) !== JSON.stringify(sortedProp));
  }, [localHiddenSections, hiddenSections]);

  const toggleSection = (path: string) => {
    setLocalHiddenSections(prev =>
      prev.includes(path)
        ? prev.filter(p => p !== path)
        : [...prev, path]
    );
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onUpdateSections(localHiddenSections);
      toast.success('Section visibility updated successfully!');
    } catch (error) {
      console.error('Failed to save sections:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to save sections');
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    setLocalHiddenSections(hiddenSections);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className={`animate-spin rounded-full h-8 w-8 border-2 ${
          theme === 'dark' ? 'border-emerald-500 border-t-transparent' : 'border-emerald-600 border-t-transparent'
        }`} />
      </div>
    );
  }

  const visibleCount = ALL_SECTIONS.length - localHiddenSections.length;
  const hiddenCount = localHiddenSections.length;

  return (
    <div className="space-y-6">
      {/* Header with Save Button */}
      <div className={`rounded-2xl border p-4 ${theme === 'dark' ? 'bg-slate-800/50 border-slate-700/50' : 'bg-white border-slate-200 shadow-sm'}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-xl ${theme === 'dark' ? 'bg-purple-500/10' : 'bg-purple-50'}`}>
              <Layers className={`w-5 h-5 ${theme === 'dark' ? 'text-purple-400' : 'text-purple-600'}`} />
            </div>
            <div>
              <h3 className={`font-semibold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                Section Visibility Settings
              </h3>
              <p className={`text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                Control which sections are visible to shop users
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {hasChanges && (
              <span className={`text-sm ${theme === 'dark' ? 'text-amber-400' : 'text-amber-600'}`}>
                Unsaved changes
              </span>
            )}
            {hasChanges && (
              <button
                onClick={handleReset}
                disabled={isSaving}
                className={`px-4 py-2 rounded-xl font-medium transition-all ${theme === 'dark' ? 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700' : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200'}`}
              >
                Reset
              </button>
            )}
            <button
              onClick={handleSave}
              disabled={isSaving || !hasChanges}
              className="flex items-center gap-2 px-5 py-2 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-xl font-medium shadow-lg hover:shadow-emerald-500/25 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSaving ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Save Changes
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className={`rounded-2xl border p-4 ${
          theme === 'dark'
            ? 'bg-gradient-to-br from-slate-800/50 to-slate-900/50 border-slate-700/50'
            : 'bg-white border-slate-200 shadow-sm'
        }`}>
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-xl ${theme === 'dark' ? 'bg-blue-500/10' : 'bg-blue-50'}`}>
              <Layers className={`w-5 h-5 ${theme === 'dark' ? 'text-blue-400' : 'text-blue-600'}`} />
            </div>
            <div>
              <p className={`text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>Total Sections</p>
              <p className={`text-xl font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>{ALL_SECTIONS.length}</p>
            </div>
          </div>
        </div>
        <div className={`rounded-2xl border p-4 ${
          theme === 'dark'
            ? 'bg-gradient-to-br from-slate-800/50 to-slate-900/50 border-slate-700/50'
            : 'bg-white border-slate-200 shadow-sm'
        }`}>
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-xl ${theme === 'dark' ? 'bg-emerald-500/10' : 'bg-emerald-50'}`}>
              <Eye className={`w-5 h-5 ${theme === 'dark' ? 'text-emerald-400' : 'text-emerald-600'}`} />
            </div>
            <div>
              <p className={`text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>Visible</p>
              <p className={`text-xl font-bold ${theme === 'dark' ? 'text-emerald-400' : 'text-emerald-600'}`}>{visibleCount}</p>
            </div>
          </div>
        </div>
        <div className={`rounded-2xl border p-4 ${
          theme === 'dark'
            ? 'bg-gradient-to-br from-slate-800/50 to-slate-900/50 border-slate-700/50'
            : 'bg-white border-slate-200 shadow-sm'
        }`}>
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-xl ${theme === 'dark' ? 'bg-red-500/10' : 'bg-red-50'}`}>
              <EyeOff className={`w-5 h-5 ${theme === 'dark' ? 'text-red-400' : 'text-red-600'}`} />
            </div>
            <div>
              <p className={`text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>Hidden</p>
              <p className={`text-xl font-bold ${theme === 'dark' ? 'text-red-400' : 'text-red-600'}`}>{hiddenCount}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Info Alert */}
      <div className={`rounded-xl border p-4 ${
        theme === 'dark'
          ? 'bg-amber-500/10 border-amber-500/30'
          : 'bg-amber-50 border-amber-200'
      }`}>
        <p className={`text-sm ${theme === 'dark' ? 'text-amber-200' : 'text-amber-800'}`}>
          <strong>Note:</strong> Hidden sections will be removed from the navigation menu and direct URL access will show "Page Not Found". 
          Only SUPER_ADMIN can change section visibility.
        </p>
      </div>

      {/* Sections Grid */}
      <div className={`rounded-2xl border ${
        theme === 'dark' ? 'bg-slate-800/30 border-slate-700/50' : 'bg-white border-slate-200 shadow-sm'
      }`}>
        <div className={`px-6 py-4 border-b ${theme === 'dark' ? 'border-slate-700/50' : 'border-slate-200'}`}>
          <h3 className={`text-lg font-semibold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
            Available Sections
          </h3>
          <p className={`text-sm mt-1 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
            Toggle sections to show or hide them for this shop
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 p-6">
          {ALL_SECTIONS.map((section) => {
            const isHidden = localHiddenSections.includes(section.path);
            return (
              <div
                key={section.path}
                onClick={() => toggleSection(section.path)}
                className={`relative overflow-hidden rounded-xl border p-4 cursor-pointer transition-all ${
                  isHidden
                    ? theme === 'dark'
                      ? 'bg-red-500/10 border-red-500/30 hover:bg-red-500/20'
                      : 'bg-red-50 border-red-200 hover:bg-red-100'
                    : theme === 'dark'
                      ? 'bg-emerald-500/10 border-emerald-500/30 hover:bg-emerald-500/20'
                      : 'bg-emerald-50 border-emerald-200 hover:bg-emerald-100'
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <h4 className={`font-medium ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                      {section.label}
                    </h4>
                    <p className={`text-xs mt-1 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                      {section.description}
                    </p>
                    <code className={`text-[10px] mt-2 inline-block px-2 py-0.5 rounded ${
                      theme === 'dark' ? 'bg-slate-700 text-slate-300' : 'bg-slate-100 text-slate-600'
                    }`}>
                      {section.path}
                    </code>
                  </div>
                  <div className={`flex-shrink-0 p-2 rounded-lg ${
                    isHidden
                      ? theme === 'dark' ? 'bg-red-500/20' : 'bg-red-200'
                      : theme === 'dark' ? 'bg-emerald-500/20' : 'bg-emerald-200'
                  }`}>
                    {isHidden ? (
                      <EyeOff className={`w-5 h-5 ${theme === 'dark' ? 'text-red-400' : 'text-red-600'}`} />
                    ) : (
                      <Eye className={`w-5 h-5 ${theme === 'dark' ? 'text-emerald-400' : 'text-emerald-600'}`} />
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

    </div>
  );
};

// ===================================
// Main Component
// ===================================

export const ShopAdminPanel: React.FC = () => {
  const { theme } = useTheme();
  const { user, getAccessToken, isViewingShop, viewingShop } = useAuth();
  const { hiddenSections, updateHiddenSections, isLoading: sectionsLoading } = useShopSections();
  const navigate = useNavigate();
  const location = useLocation();

  // Determine active section from URL
  const activeSection = location.pathname.includes('/branding') 
    ? 'branding' 
    : location.pathname.includes('/sections')
    ? 'sections'
    : 'users';

  // Determine if user has access: ADMIN or SUPER_ADMIN viewing a shop
  const hasAccess = user?.role === 'ADMIN' || (user?.role === 'SUPER_ADMIN' && isViewingShop);
  
  // Sections tab accessible by ADMIN (shop admin) and SUPER_ADMIN viewing a shop
  const canAccessSections = user?.role === 'ADMIN' || (user?.role === 'SUPER_ADMIN' && isViewingShop);

  // State
  const [stats, setStats] = useState<ShopStats | null>(null);
  const [users, setUsers] = useState<ShopUser[]>([]);
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
  const [selectedUser, setSelectedUser] = useState<ShopUser | null>(null);
  const [isEditUserModalOpen, setIsEditUserModalOpen] = useState(false);
  const [isResetPasswordModalOpen, setIsResetPasswordModalOpen] = useState(false);
  const [isCreateUserModalOpen, setIsCreateUserModalOpen] = useState(false);
  const [isDeleteUserModalOpen, setIsDeleteUserModalOpen] = useState(false);

  // Check authorization - must be ADMIN role or SUPER_ADMIN viewing a shop
  useEffect(() => {
    if (user && !hasAccess) {
      navigate('/dashboard');
    }
    // Sections tab only accessible by SUPER_ADMIN
    if (activeSection === 'sections' && !canAccessSections) {
      navigate('/shop-admin/users');
    }
  }, [user, hasAccess, navigate, activeSection, canAccessSections]);

  // Reset pagination when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter, roleFilter]);

  // Fetch data
  const fetchData = async () => {
    setIsLoading(true);
    setError(null);
    const token = getAccessToken();

    // For SUPER_ADMIN viewing a shop, pass shopId as query param
    const shopIdParam = isViewingShop && viewingShop ? `?shopId=${viewingShop.id}` : '';

    try {
      const [statsRes, usersRes] = await Promise.all([
        fetch(`${API_URL}/shop-admin/stats${shopIdParam}`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${API_URL}/shop-admin/users${shopIdParam}`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      if (!statsRes.ok || !usersRes.ok) {
        throw new Error('Failed to fetch data');
      }

      const [statsData, usersData] = await Promise.all([
        statsRes.json(),
        usersRes.json(),
      ]);

      setStats(statsData.data);
      setUsers(usersData.data);
    } catch (err) {
      console.error('Error fetching data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (hasAccess) {
      fetchData();
    }
  }, [user, hasAccess, isViewingShop, viewingShop]);

  // Filtered users
  const filteredUsers = useMemo(() => {
    return users.filter(u => {
      const matchesSearch =
        u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.email.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus =
        statusFilter === 'all' ||
        (statusFilter === 'active' && u.isActive) ||
        (statusFilter === 'inactive' && !u.isActive);
      const matchesRole = roleFilter === 'all' || u.role === roleFilter;
      return matchesSearch && matchesStatus && matchesRole;
    });
  }, [users, searchQuery, statusFilter, roleFilter]);

  // Pagination
  const totalPages = Math.ceil(filteredUsers.length / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const paginatedUsers = filteredUsers.slice(startIndex, endIndex);

  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  // Role badge
  const getRoleBadge = (role: string) => {
    const roleConfig = {
      SUPER_ADMIN: { bg: 'from-purple-500/10 to-pink-500/10', text: 'text-purple-400', border: 'border-purple-500/20', icon: ShieldCheck },
      ADMIN: { bg: 'from-emerald-500/10 to-teal-500/10', text: 'text-emerald-400', border: 'border-emerald-500/20', icon: ShieldCheck },
      MANAGER: { bg: 'from-blue-500/10 to-indigo-500/10', text: 'text-blue-400', border: 'border-blue-500/20', icon: UserCog },
      STAFF: { bg: 'from-slate-500/10 to-gray-500/10', text: 'text-slate-400', border: 'border-slate-500/20', icon: UserCog },
    };
    const config = roleConfig[role as keyof typeof roleConfig] || roleConfig.STAFF;
    const Icon = config.icon;
    return (
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-gradient-to-r ${config.bg} ${config.text} border ${config.border}`}>
        <Icon className="w-3 h-3" />
        {role}
      </span>
    );
  };

  // Status badge
  const getStatusBadge = (isActive: boolean) => {
    return isActive ? (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-gradient-to-r from-emerald-500/10 to-green-500/10 text-emerald-400 border border-emerald-500/20">
        <CheckCircle className="w-3 h-3" />
        Active
      </span>
    ) : (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-gradient-to-r from-red-500/10 to-rose-500/10 text-red-400 border border-red-500/20">
        <XCircle className="w-3 h-3" />
        Inactive
      </span>
    );
  };

  // ===================================
  // CREATE USER MODAL
  // ===================================
  const CreateUserModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
  }> = ({ isOpen, onClose, onSuccess }) => {
    const [formData, setFormData] = useState({
      email: '',
      password: '',
      name: '',
      role: 'STAFF' as 'MANAGER' | 'STAFF',
    });
    const [isSaving, setIsSaving] = useState(false);
    const [formError, setFormError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      setIsSaving(true);
      setFormError(null);

      try {
        const token = getAccessToken();
        // For SUPER_ADMIN viewing a shop, include shopId in body
        const bodyData = isViewingShop && viewingShop 
          ? { ...formData, shopId: viewingShop.id }
          : formData;
        
        const response = await fetch(`${API_URL}/shop-admin/users`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(bodyData),
        });

        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.message || 'Failed to create user');
        }

        onSuccess();
        onClose();
        setFormData({ email: '', password: '', name: '', role: 'STAFF' });
      } catch (err) {
        setFormError(err instanceof Error ? err.message : 'Failed to create user');
      } finally {
        setIsSaving(false);
      }
    };

    if (!isOpen) return null;

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
        <div className={`relative w-full max-w-md rounded-2xl border ${
          theme === 'dark' ? 'bg-slate-900 border-slate-700/50' : 'bg-white border-slate-200'
        } shadow-2xl`}>
          <div className={`flex items-center justify-between p-6 border-b ${
            theme === 'dark' ? 'border-slate-700/50' : 'border-slate-200'
          }`}>
            <h2 className={`text-xl font-semibold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
              Create New User
            </h2>
            <button onClick={onClose} className={`p-2 rounded-lg ${
              theme === 'dark' ? 'hover:bg-slate-800 text-slate-400' : 'hover:bg-slate-100 text-slate-600'
            }`}>
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            {formError && (
              <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                {formError}
              </div>
            )}

            <div>
              <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                Name
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
                minLength={2}
                className={`w-full px-4 py-2.5 rounded-xl border ${
                  theme === 'dark'
                    ? 'bg-slate-800/50 border-slate-700/50 text-white'
                    : 'bg-white border-slate-200 text-slate-900'
                }`}
              />
            </div>

            <div>
              <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                Email
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
                className={`w-full px-4 py-2.5 rounded-xl border ${
                  theme === 'dark'
                    ? 'bg-slate-800/50 border-slate-700/50 text-white'
                    : 'bg-white border-slate-200 text-slate-900'
                }`}
              />
            </div>

            <div>
              <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                Password
              </label>
              <input
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                required
                minLength={8}
                className={`w-full px-4 py-2.5 rounded-xl border ${
                  theme === 'dark'
                    ? 'bg-slate-800/50 border-slate-700/50 text-white'
                    : 'bg-white border-slate-200 text-slate-900'
                }`}
              />
              <p className={`mt-1 text-xs ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>
                Min 8 chars with uppercase, lowercase, and number
              </p>
            </div>

            <div>
              <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                Role
              </label>
              <select
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value as 'MANAGER' | 'STAFF' })}
                className={`w-full px-4 py-2.5 rounded-xl border ${
                  theme === 'dark'
                    ? 'bg-slate-800/50 border-slate-700/50 text-white'
                    : 'bg-white border-slate-200 text-slate-900'
                }`}
              >
                <option value="STAFF">Staff</option>
                <option value="MANAGER">Manager</option>
              </select>
            </div>

            <div className={`flex justify-end gap-3 pt-4 border-t ${
              theme === 'dark' ? 'border-slate-700/50' : 'border-slate-200'
            }`}>
              <button type="button" onClick={onClose} className={`px-4 py-2 rounded-xl ${
                theme === 'dark' ? 'bg-slate-800 text-slate-300 hover:bg-slate-700' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}>
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-xl font-medium hover:shadow-emerald-500/25 disabled:opacity-50"
              >
                {isSaving ? 'Creating...' : 'Create User'}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  };

  // ===================================
  // EDIT USER MODAL
  // ===================================
  const EditUserModal: React.FC<{
    user: ShopUser | null;
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
  }> = ({ user: editUser, isOpen, onClose, onSuccess }) => {
    const [formData, setFormData] = useState({
      name: '',
      email: '',
      role: 'STAFF' as ShopUser['role'],
      isActive: true,
    });
    const [isSaving, setIsSaving] = useState(false);
    const [formError, setFormError] = useState<string | null>(null);

    useEffect(() => {
      if (editUser) {
        setFormData({
          name: editUser.name,
          email: editUser.email,
          role: editUser.role,
          isActive: editUser.isActive,
        });
      }
    }, [editUser]);

    const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!editUser) return;

      setIsSaving(true);
      setFormError(null);

      try {
        const token = getAccessToken();
        // For SUPER_ADMIN viewing a shop, include shopId as query param
        const shopIdParam = isViewingShop && viewingShop ? `?shopId=${viewingShop.id}` : '';
        const response = await fetch(`${API_URL}/shop-admin/users/${editUser.id}${shopIdParam}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(formData),
        });

        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.message || 'Failed to update user');
        }

        onSuccess();
        onClose();
      } catch (err) {
        setFormError(err instanceof Error ? err.message : 'Failed to update user');
      } finally {
        setIsSaving(false);
      }
    };

    if (!isOpen || !editUser) return null;

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
        <div className={`relative w-full max-w-md rounded-2xl border ${
          theme === 'dark' ? 'bg-slate-900 border-slate-700/50' : 'bg-white border-slate-200'
        } shadow-2xl`}>
          <div className={`flex items-center justify-between p-6 border-b ${
            theme === 'dark' ? 'border-slate-700/50' : 'border-slate-200'
          }`}>
            <h2 className={`text-xl font-semibold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
              Edit User
            </h2>
            <button onClick={onClose} className={`p-2 rounded-lg ${
              theme === 'dark' ? 'hover:bg-slate-800 text-slate-400' : 'hover:bg-slate-100 text-slate-600'
            }`}>
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            {formError && (
              <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                {formError}
              </div>
            )}

            <div>
              <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                Name
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
                className={`w-full px-4 py-2.5 rounded-xl border ${
                  theme === 'dark'
                    ? 'bg-slate-800/50 border-slate-700/50 text-white'
                    : 'bg-white border-slate-200 text-slate-900'
                }`}
              />
            </div>

            <div>
              <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                Email
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
                className={`w-full px-4 py-2.5 rounded-xl border ${
                  theme === 'dark'
                    ? 'bg-slate-800/50 border-slate-700/50 text-white'
                    : 'bg-white border-slate-200 text-slate-900'
                }`}
              />
            </div>

            <div>
              <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                Role
              </label>
              {editUser.role === 'ADMIN' ? (
                <div className={`px-4 py-2.5 rounded-xl border flex items-center ${
                  theme === 'dark'
                    ? 'bg-slate-800/30 border-slate-700/30 text-slate-400'
                    : 'bg-slate-50 border-slate-200 text-slate-600'
                }`}>
                  <ShieldCheck className="w-4 h-4 mr-2" />
                  Admin (Cannot change)
                </div>
              ) : (
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value as 'MANAGER' | 'STAFF' })}
                  className={`w-full px-4 py-2.5 rounded-xl border ${
                    theme === 'dark'
                      ? 'bg-slate-800/50 border-slate-700/50 text-white'
                      : 'bg-white border-slate-200 text-slate-900'
                  }`}
                >
                  <option value="STAFF">Staff</option>
                  <option value="MANAGER">Manager</option>
                </select>
              )}
            </div>

            {editUser.role !== 'ADMIN' && (
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  className="w-4 h-4 rounded border-slate-300 text-emerald-500 focus:ring-emerald-500"
                />
                <label htmlFor="isActive" className={`text-sm ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                  Active account
                </label>
              </div>
            )}

            <div className={`flex justify-end gap-3 pt-4 border-t ${
              theme === 'dark' ? 'border-slate-700/50' : 'border-slate-200'
            }`}>
              <button type="button" onClick={onClose} className={`px-4 py-2 rounded-xl ${
                theme === 'dark' ? 'bg-slate-800 text-slate-300 hover:bg-slate-700' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}>
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-xl font-medium hover:shadow-emerald-500/25 disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                {isSaving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  };

  // ===================================
  // RESET PASSWORD MODAL
  // ===================================
  const ResetPasswordModal: React.FC<{
    user: ShopUser | null;
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
  }> = ({ user: resetUser, isOpen, onClose, onSuccess }) => {
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [formError, setFormError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!resetUser) return;

      if (newPassword !== confirmPassword) {
        setFormError('Passwords do not match');
        return;
      }

      setIsSaving(true);
      setFormError(null);

      try {
        const token = getAccessToken();
        // For SUPER_ADMIN viewing a shop, include shopId as query param
        const shopIdParam = isViewingShop && viewingShop ? `?shopId=${viewingShop.id}` : '';
        const response = await fetch(`${API_URL}/shop-admin/users/${resetUser.id}/reset-password${shopIdParam}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ newPassword }),
        });

        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.message || 'Failed to reset password');
        }

        onSuccess();
        onClose();
        setNewPassword('');
        setConfirmPassword('');
      } catch (err) {
        setFormError(err instanceof Error ? err.message : 'Failed to reset password');
      } finally {
        setIsSaving(false);
      }
    };

    if (!isOpen || !resetUser) return null;

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
        <div className={`relative w-full max-w-md rounded-2xl border ${
          theme === 'dark' ? 'bg-slate-900 border-slate-700/50' : 'bg-white border-slate-200'
        } shadow-2xl`}>
          <div className={`flex items-center justify-between p-6 border-b ${
            theme === 'dark' ? 'border-slate-700/50' : 'border-slate-200'
          }`}>
            <h2 className={`text-xl font-semibold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
              Reset Password
            </h2>
            <button onClick={onClose} className={`p-2 rounded-lg ${
              theme === 'dark' ? 'hover:bg-slate-800 text-slate-400' : 'hover:bg-slate-100 text-slate-600'
            }`}>
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            <div className={`p-4 rounded-xl ${
              theme === 'dark' ? 'bg-amber-500/10 border border-amber-500/20' : 'bg-amber-50 border border-amber-200'
            }`}>
              <p className={`text-sm ${theme === 'dark' ? 'text-amber-400' : 'text-amber-700'}`}>
                Resetting password for: <strong>{resetUser.name}</strong>
              </p>
            </div>

            {formError && (
              <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                {formError}
              </div>
            )}

            <div>
              <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                New Password
              </label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                minLength={8}
                className={`w-full px-4 py-2.5 rounded-xl border ${
                  theme === 'dark'
                    ? 'bg-slate-800/50 border-slate-700/50 text-white'
                    : 'bg-white border-slate-200 text-slate-900'
                }`}
              />
            </div>

            <div>
              <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                Confirm Password
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                className={`w-full px-4 py-2.5 rounded-xl border ${
                  theme === 'dark'
                    ? 'bg-slate-800/50 border-slate-700/50 text-white'
                    : 'bg-white border-slate-200 text-slate-900'
                }`}
              />
            </div>

            <div className={`flex justify-end gap-3 pt-4 border-t ${
              theme === 'dark' ? 'border-slate-700/50' : 'border-slate-200'
            }`}>
              <button type="button" onClick={onClose} className={`px-4 py-2 rounded-xl ${
                theme === 'dark' ? 'bg-slate-800 text-slate-300 hover:bg-slate-700' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}>
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-xl font-medium hover:shadow-amber-500/25 disabled:opacity-50"
              >
                <Key className="w-4 h-4" />
                {isSaving ? 'Resetting...' : 'Reset Password'}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  };

  // ===================================
  // DELETE USER MODAL
  // ===================================
  const DeleteUserModal: React.FC<{
    user: ShopUser | null;
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
  }> = ({ user: deleteUser, isOpen, onClose, onSuccess }) => {
    const [confirmText, setConfirmText] = useState('');
    const [isDeleting, setIsDeleting] = useState(false);
    const [formError, setFormError] = useState<string | null>(null);

    const handleDelete = async () => {
      if (!deleteUser || confirmText !== 'DELETE') return;

      setIsDeleting(true);
      setFormError(null);

      try {
        const token = getAccessToken();
        // For SUPER_ADMIN viewing a shop, include shopId as query param
        const shopIdParam = isViewingShop && viewingShop ? `?shopId=${viewingShop.id}` : '';
        const response = await fetch(`${API_URL}/shop-admin/users/${deleteUser.id}${shopIdParam}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` },
        });

        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.message || 'Failed to delete user');
        }

        onSuccess();
        onClose();
        setConfirmText('');
      } catch (err) {
        setFormError(err instanceof Error ? err.message : 'Failed to delete user');
      } finally {
        setIsDeleting(false);
      }
    };

    if (!isOpen || !deleteUser) return null;

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
        <div className={`relative w-full max-w-md rounded-2xl border ${
          theme === 'dark' ? 'bg-slate-900 border-slate-700/50' : 'bg-white border-slate-200'
        } shadow-2xl`}>
          <div className={`flex items-center justify-between p-6 border-b ${
            theme === 'dark' ? 'border-slate-700/50' : 'border-slate-200'
          }`}>
            <h2 className={`text-xl font-semibold text-red-500`}>
              Delete User
            </h2>
            <button onClick={onClose} className={`p-2 rounded-lg ${
              theme === 'dark' ? 'hover:bg-slate-800 text-slate-400' : 'hover:bg-slate-100 text-slate-600'
            }`}>
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-6 space-y-4">
            <div className={`p-4 rounded-xl ${
              theme === 'dark' ? 'bg-red-500/10 border border-red-500/20' : 'bg-red-50 border border-red-200'
            }`}>
              <p className={`text-sm ${theme === 'dark' ? 'text-red-400' : 'text-red-700'}`}>
                <strong>Warning:</strong> This will deactivate the user account for <strong>{deleteUser.name}</strong>.
                The user will no longer be able to log in.
              </p>
            </div>

            {formError && (
              <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                {formError}
              </div>
            )}

            <div>
              <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                Type <span className="font-mono font-bold text-red-500">DELETE</span> to confirm
              </label>
              <input
                type="text"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder="Type DELETE to confirm"
                className={`w-full px-4 py-2.5 rounded-xl border ${
                  theme === 'dark'
                    ? 'bg-slate-800/50 border-slate-700/50 text-white'
                    : 'bg-white border-slate-200 text-slate-900'
                }`}
              />
            </div>

            <div className={`flex justify-end gap-3 pt-4 border-t ${
              theme === 'dark' ? 'border-slate-700/50' : 'border-slate-200'
            }`}>
              <button type="button" onClick={onClose} className={`px-4 py-2 rounded-xl ${
                theme === 'dark' ? 'bg-slate-800 text-slate-300 hover:bg-slate-700' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}>
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={isDeleting || confirmText !== 'DELETE'}
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-red-500 to-rose-600 text-white rounded-xl font-medium hover:shadow-red-500/25 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Trash2 className="w-4 h-4" />
                {isDeleting ? 'Deleting...' : 'Delete User'}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // ===================================
  // MAIN RENDER
  // ===================================
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full min-h-[400px]">
        <div className="flex flex-col items-center gap-4">
          <RefreshCw className={`w-10 h-10 animate-spin ${theme === 'dark' ? 'text-emerald-400' : 'text-emerald-600'}`} />
          <p className={theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}>Loading shop admin panel...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full min-h-[400px]">
        <div className={`p-6 rounded-2xl border ${
          theme === 'dark' ? 'bg-red-500/10 border-red-500/20' : 'bg-red-50 border-red-200'
        }`}>
          <p className={`text-lg ${theme === 'dark' ? 'text-red-400' : 'text-red-600'}`}>
            {error}
          </p>
          <button
            onClick={fetchData}
            className="mt-4 px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-xl"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-8">
      {/* Page Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2.5 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-500">
              <ShieldCheck className="w-6 h-6 text-white" />
            </div>
            <h1 className={`text-2xl lg:text-3xl font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
              {activeSection === 'branding' ? 'Shop Branding' : activeSection === 'sections' ? 'Section Visibility' : 'User Management'}
            </h1>
          </div>
          <p className={`${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
            {activeSection === 'branding' 
              ? 'Customize your shop\'s logo and branding for invoices and documents' 
              : activeSection === 'sections'
              ? 'Control which sections are visible for this shop'
              : stats?.shop?.name ? `Manage users for ${stats.shop.name}` : 'Manage your shop users'}
          </p>
        </div>
        {activeSection === 'users' && (
          <div className="flex items-center gap-3">
            <button
              onClick={fetchData}
              className={`p-2.5 rounded-xl border transition-all ${
                theme === 'dark'
                  ? 'bg-slate-800/50 border-slate-700/50 hover:bg-slate-700/50 text-slate-400'
                  : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-600'
              }`}
            >
              <RefreshCw className="w-5 h-5" />
            </button>
            <button
              onClick={() => setIsCreateUserModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-xl font-medium shadow-lg hover:shadow-emerald-500/25 transition-all"
            >
              <UserPlus className="w-5 h-5" />
              Add User
            </button>
          </div>
        )}
      </div>

      {/* Section Content */}
      {activeSection === 'branding' ? (
        <ShopBrandingTab />
      ) : activeSection === 'sections' ? (
        <SectionVisibilityTab
          hiddenSections={hiddenSections}
          onUpdateSections={updateHiddenSections}
          isLoading={sectionsLoading}
          theme={theme}
        />
      ) : (
        <>
      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className={`relative overflow-hidden rounded-2xl border p-5 ${
          theme === 'dark'
            ? 'bg-gradient-to-br from-slate-800/50 to-slate-900/50 border-slate-700/50'
            : 'bg-white border-slate-200 shadow-sm'
        }`}>
          <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-blue-500/20 to-indigo-500/10 rounded-full blur-2xl" />
          <div className="relative">
            <div className={`p-2.5 w-fit rounded-xl mb-3 ${theme === 'dark' ? 'bg-blue-500/10' : 'bg-blue-50'}`}>
              <Users className="w-5 h-5 text-blue-500" />
            </div>
            <p className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
              {stats?.totalUsers || 0}
            </p>
            <p className={`text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>Total Users</p>
          </div>
        </div>

        <div className={`relative overflow-hidden rounded-2xl border p-5 ${
          theme === 'dark'
            ? 'bg-gradient-to-br from-slate-800/50 to-slate-900/50 border-slate-700/50'
            : 'bg-white border-slate-200 shadow-sm'
        }`}>
          <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-emerald-500/20 to-green-500/10 rounded-full blur-2xl" />
          <div className="relative">
            <div className={`p-2.5 w-fit rounded-xl mb-3 ${theme === 'dark' ? 'bg-emerald-500/10' : 'bg-emerald-50'}`}>
              <CheckCircle className="w-5 h-5 text-emerald-500" />
            </div>
            <p className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
              {stats?.activeUsers || 0}
            </p>
            <p className={`text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>Active Users</p>
          </div>
        </div>

        <div className={`relative overflow-hidden rounded-2xl border p-5 ${
          theme === 'dark'
            ? 'bg-gradient-to-br from-slate-800/50 to-slate-900/50 border-slate-700/50'
            : 'bg-white border-slate-200 shadow-sm'
        }`}>
          <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-amber-500/20 to-orange-500/10 rounded-full blur-2xl" />
          <div className="relative">
            <div className={`p-2.5 w-fit rounded-xl mb-3 ${theme === 'dark' ? 'bg-amber-500/10' : 'bg-amber-50'}`}>
              <Package className="w-5 h-5 text-amber-500" />
            </div>
            <p className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
              {stats?.totalProducts || 0}
            </p>
            <p className={`text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>Products</p>
          </div>
        </div>

        <div className={`relative overflow-hidden rounded-2xl border p-5 ${
          theme === 'dark'
            ? 'bg-gradient-to-br from-slate-800/50 to-slate-900/50 border-slate-700/50'
            : 'bg-white border-slate-200 shadow-sm'
        }`}>
          <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-purple-500/20 to-pink-500/10 rounded-full blur-2xl" />
          <div className="relative">
            <div className={`p-2.5 w-fit rounded-xl mb-3 ${theme === 'dark' ? 'bg-purple-500/10' : 'bg-purple-50'}`}>
              <FileText className="w-5 h-5 text-purple-500" />
            </div>
            <p className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
              {stats?.totalInvoices || 0}
            </p>
            <p className={`text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>Invoices</p>
          </div>
        </div>
      </div>

      {/* Search & Filters */}
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
              placeholder="Search users..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`w-full pl-10 pr-4 py-2.5 rounded-xl border ${
                theme === 'dark'
                  ? 'bg-slate-800/50 border-slate-700/50 text-white placeholder-slate-500'
                  : 'bg-white border-slate-200 text-slate-900 placeholder-slate-400'
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

            {/* View Mode Toggle */}
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
      </div>

      {/* Users Section */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className={`text-lg font-semibold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
            Users ({filteredUsers.length})
          </h2>
        </div>

        {viewMode === 'card' ? (
          /* Card View */
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {paginatedUsers.map((u) => (
              <div
                key={u.id}
                className={`relative overflow-hidden rounded-2xl border p-5 ${
                  u.role === 'SUPER_ADMIN'
                    ? theme === 'dark'
                      ? 'bg-gradient-to-br from-purple-900/20 via-slate-800/50 to-slate-900/50 border-purple-500/30 ring-2 ring-purple-500/20'
                      : 'bg-gradient-to-br from-purple-50 via-white to-white border-purple-200 ring-2 ring-purple-500/10'
                    : theme === 'dark'
                      ? 'bg-gradient-to-br from-slate-800/50 to-slate-900/50 border-slate-700/50'
                      : 'bg-white border-slate-200 shadow-sm'
                }`}
              >
                <div className={`absolute top-0 right-0 w-24 h-24 rounded-full blur-2xl ${
                  u.role === 'SUPER_ADMIN'
                    ? 'bg-gradient-to-br from-purple-500/20 to-pink-500/10'
                    : 'bg-gradient-to-br from-blue-500/10 to-purple-500/5'
                }`} />
                <div className="relative">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg font-semibold ${
                        theme === 'dark' ? 'bg-slate-700 text-white' : 'bg-slate-100 text-slate-700'
                      }`}>
                        {u.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <h3 className={`font-medium ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                          {u.name}
                        </h3>
                        <p className={`text-xs ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>
                          {u.email}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 mb-4">
                    {getRoleBadge(u.role)}
                    {getStatusBadge(u.isActive)}
                  </div>

                  <div className={`text-xs mb-4 ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>
                    Joined: {formatDate(u.createdAt)}
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        setSelectedUser(u);
                        setIsEditUserModalOpen(true);
                      }}
                      className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-sm ${
                        theme === 'dark'
                          ? 'bg-slate-700/50 hover:bg-slate-700 text-slate-300'
                          : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                      }`}
                    >
                      <Edit className="w-4 h-4" />
                      Edit
                    </button>
                    <button
                      onClick={() => {
                        setSelectedUser(u);
                        setIsResetPasswordModalOpen(true);
                      }}
                      className={`p-2 rounded-xl ${
                        theme === 'dark'
                          ? 'bg-amber-500/10 hover:bg-amber-500/20 text-amber-400'
                          : 'bg-amber-50 hover:bg-amber-100 text-amber-600'
                      }`}
                      title="Reset Password"
                    >
                      <Key className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => {
                        setSelectedUser(u);
                        setIsDeleteUserModalOpen(true);
                      }}
                      className={`p-2 rounded-xl ${
                        theme === 'dark'
                          ? 'bg-red-500/10 hover:bg-red-500/20 text-red-400'
                          : 'bg-red-50 hover:bg-red-100 text-red-600'
                      }`}
                      title="Delete User"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* Table View */
          <div className={`rounded-2xl border overflow-hidden ${
            theme === 'dark' ? 'border-slate-700/50' : 'border-slate-200'
          }`}>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className={theme === 'dark' ? 'bg-slate-800/50' : 'bg-slate-50'}>
                  <tr>
                    <th className={`px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider ${
                      theme === 'dark' ? 'text-slate-400' : 'text-slate-600'
                    }`}>User</th>
                    <th className={`px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider ${
                      theme === 'dark' ? 'text-slate-400' : 'text-slate-600'
                    }`}>Role</th>
                    <th className={`px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider ${
                      theme === 'dark' ? 'text-slate-400' : 'text-slate-600'
                    }`}>Status</th>
                    <th className={`px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider ${
                      theme === 'dark' ? 'text-slate-400' : 'text-slate-600'
                    }`}>Joined</th>
                    <th className={`px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider ${
                      theme === 'dark' ? 'text-slate-400' : 'text-slate-600'
                    }`}>Actions</th>
                  </tr>
                </thead>
                <tbody className={`divide-y ${theme === 'dark' ? 'divide-slate-700/50' : 'divide-slate-200'}`}>
                  {paginatedUsers.map((u) => (
                    <tr key={u.id} className={`transition-colors ${
                      u.role === 'SUPER_ADMIN'
                        ? theme === 'dark'
                          ? 'bg-purple-900/10 hover:bg-purple-900/20 border-l-2 border-purple-500/50'
                          : 'bg-purple-50/50 hover:bg-purple-50 border-l-2 border-purple-400'
                        : theme === 'dark'
                          ? 'hover:bg-slate-800/30'
                          : 'hover:bg-slate-50'
                    }`}>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${
                            theme === 'dark' ? 'bg-slate-700 text-white' : 'bg-slate-100 text-slate-700'
                          }`}>
                            {u.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className={`font-medium ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                              {u.name}
                            </p>
                            <p className={`text-xs ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>
                              {u.email}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">{getRoleBadge(u.role)}</td>
                      <td className="px-6 py-4">{getStatusBadge(u.isActive)}</td>
                      <td className={`px-6 py-4 text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                        {formatDate(u.createdAt)}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => {
                              setSelectedUser(u);
                              setIsEditUserModalOpen(true);
                            }}
                            className={`p-2 rounded-lg ${
                              theme === 'dark'
                                ? 'hover:bg-slate-700 text-slate-400'
                                : 'hover:bg-slate-100 text-slate-600'
                            }`}
                            title="Edit User"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => {
                              setSelectedUser(u);
                              setIsResetPasswordModalOpen(true);
                            }}
                            className={`p-2 rounded-lg ${
                              theme === 'dark'
                                ? 'hover:bg-amber-500/20 text-amber-400'
                                : 'hover:bg-amber-100 text-amber-600'
                            }`}
                            title="Reset Password"
                          >
                            <Key className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => {
                              setSelectedUser(u);
                              setIsDeleteUserModalOpen(true);
                            }}
                            className={`p-2 rounded-lg ${
                              theme === 'dark'
                                ? 'hover:bg-red-500/20 text-red-400'
                                : 'hover:bg-red-100 text-red-600'
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
        <div className={`flex flex-col lg:flex-row items-center justify-between gap-4 mt-6 p-4 rounded-2xl border ${
          theme === 'dark' 
            ? 'bg-slate-800/30 border-slate-700/50' 
            : 'bg-slate-50 border-slate-200'
        }`}>
          {/* Left: Results Info & Page Size */}
          <div className="flex items-center gap-4">
            <div className={`text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
              Showing <span className="font-semibold">{filteredUsers.length > 0 ? startIndex + 1 : 0}</span> to{' '}
              <span className="font-semibold">{Math.min(endIndex, filteredUsers.length)}</span> of{' '}
              <span className="font-semibold">{filteredUsers.length}</span> items
            </div>
            <div className="flex items-center gap-2">
              <span className={`text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                Show:
              </span>
              <div className={`flex items-center gap-1 p-1 rounded-xl border ${
                theme === 'dark' ? 'bg-slate-800/50 border-slate-700/50' : 'bg-white border-slate-200'
              }`}>
                {[5, 10, 20, 50, 100].map(size => (
                  <button
                    key={size}
                    onClick={() => {
                      setPageSize(size);
                      setCurrentPage(1);
                    }}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                      pageSize === size
                        ? 'bg-emerald-500 text-white shadow-md'
                        : theme === 'dark'
                          ? 'text-slate-400 hover:text-white hover:bg-slate-700'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                    }`}
                  >
                    {size}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Center: Page Navigation */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => setCurrentPage(1)}
              disabled={currentPage === 1}
              className={`p-2 rounded-lg transition-colors ${
                theme === 'dark'
                  ? 'hover:bg-slate-700 text-slate-400 disabled:opacity-30 disabled:hover:bg-transparent'
                  : 'hover:bg-slate-200 text-slate-600 disabled:opacity-30 disabled:hover:bg-transparent'
              } disabled:cursor-not-allowed`}
              title="First page"
            >
              <ChevronsLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className={`p-2 rounded-lg transition-colors ${
                theme === 'dark'
                  ? 'hover:bg-slate-700 text-slate-400 disabled:opacity-30 disabled:hover:bg-transparent'
                  : 'hover:bg-slate-200 text-slate-600 disabled:opacity-30 disabled:hover:bg-transparent'
              } disabled:cursor-not-allowed`}
              title="Previous page"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            
            {/* Page Number Buttons */}
            {(() => {
              const pages: (number | string)[] = [];
              if (totalPages <= 7) {
                for (let i = 1; i <= totalPages; i++) pages.push(i);
              } else {
                if (currentPage <= 3) {
                  pages.push(1, 2, 3, 4, '...', totalPages);
                } else if (currentPage >= totalPages - 2) {
                  pages.push(1, '...', totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
                } else {
                  pages.push(1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages);
                }
              }
              return pages.map((page, idx) => (
                page === '...' ? (
                  <span key={`ellipsis-${idx}`} className={`px-2 ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>...</span>
                ) : (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page as number)}
                    className={`min-w-[36px] h-9 px-3 rounded-lg text-sm font-medium transition-all ${
                      currentPage === page
                        ? 'bg-emerald-500 text-white shadow-md'
                        : theme === 'dark'
                          ? 'text-slate-400 hover:text-white hover:bg-slate-700'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                    }`}
                  >
                    {page}
                  </button>
                )
              ));
            })()}
            
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages || totalPages === 0}
              className={`p-2 rounded-lg transition-colors ${
                theme === 'dark'
                  ? 'hover:bg-slate-700 text-slate-400 disabled:opacity-30 disabled:hover:bg-transparent'
                  : 'hover:bg-slate-200 text-slate-600 disabled:opacity-30 disabled:hover:bg-transparent'
              } disabled:cursor-not-allowed`}
              title="Next page"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
            <button
              onClick={() => setCurrentPage(totalPages)}
              disabled={currentPage === totalPages || totalPages === 0}
              className={`p-2 rounded-lg transition-colors ${
                theme === 'dark'
                  ? 'hover:bg-slate-700 text-slate-400 disabled:opacity-30 disabled:hover:bg-transparent'
                  : 'hover:bg-slate-200 text-slate-600 disabled:opacity-30 disabled:hover:bg-transparent'
              } disabled:cursor-not-allowed`}
              title="Last page"
            >
              <ChevronsRight className="w-4 h-4" />
            </button>
          </div>

          {/* Right: Total Count */}
          <div className={`text-sm font-medium ${
            theme === 'dark' ? 'text-slate-300' : 'text-slate-700'
          }`}>
            Total: <span className="font-semibold">{filteredUsers.length}</span> items
          </div>
        </div>
      </div>
        </>
      )}

      {/* Modals */}
      <CreateUserModal
        isOpen={isCreateUserModalOpen}
        onClose={() => setIsCreateUserModalOpen(false)}
        onSuccess={fetchData}
      />
      <EditUserModal
        user={selectedUser}
        isOpen={isEditUserModalOpen}
        onClose={() => {
          setIsEditUserModalOpen(false);
          setSelectedUser(null);
        }}
        onSuccess={fetchData}
      />
      <ResetPasswordModal
        user={selectedUser}
        isOpen={isResetPasswordModalOpen}
        onClose={() => {
          setIsResetPasswordModalOpen(false);
          setSelectedUser(null);
        }}
        onSuccess={fetchData}
      />
      <DeleteUserModal
        user={selectedUser}
        isOpen={isDeleteUserModalOpen}
        onClose={() => {
          setIsDeleteUserModalOpen(false);
          setSelectedUser(null);
        }}
        onSuccess={fetchData}
      />
    </div>
  );
};

export default ShopAdminPanel;
