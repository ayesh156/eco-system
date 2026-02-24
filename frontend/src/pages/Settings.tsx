import React, { useState, useEffect, useMemo } from 'react';
import { useTheme, ACCENT_COLOR_MAP } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { useWhatsAppSettings } from '../contexts/WhatsAppSettingsContext';
import { useShopBranding } from '../contexts/ShopBrandingContext';
import { useTaxSettings } from '../contexts/TaxSettingsContext';
import { useShopSections, ALL_SECTIONS } from '../contexts/ShopSectionsContext';
import { ShopBrandingTab } from '../components/admin/ShopBrandingTab';
import { SearchableSelect } from '../components/ui/searchable-select';
import { toast } from 'sonner';
import { 
  Bell, Palette, MessageCircle, Info, Copy, Check, 
  Moon, Sun, Sparkles,
  Mail, Building2, Save, Package, Truck,
  RefreshCw, Eye, EyeOff, CheckCircle2, AlertCircle, Clock,
  Smartphone, Laptop, SendHorizontal, Settings2, FileText, RotateCcw,
  Users, Layers, Search, Edit, Key, UserPlus, UserCog,
  CheckCircle, XCircle, Trash2, ChevronRight, ChevronLeft, X,
  LayoutGrid, List, ChevronsLeft, ChevronsRight
} from 'lucide-react';

interface ReminderPreview {
  customerName: string;
  invoiceId: string;
  totalAmount: string;
  paidAmount: string;
  dueAmount: string;
  dueDate: string;
  daysOverdue: string;
}

// API URL from environment
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api/v1';

// Shop User interface
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

type ViewMode = 'card' | 'table';
type StatusFilter = 'all' | 'active' | 'inactive';
type RoleFilter = 'all' | 'MANAGER' | 'STAFF';

export const Settings: React.FC = () => {
  const { theme, toggleTheme, accentColor, setAccentColor, accent } = useTheme();
  const { user, isViewingShop, viewingShop, getAccessToken } = useAuth();
  const { settings: whatsAppSettings, shopDetails, updateSettings, saveSettings, resetToDefaults, resetGrnToDefaults, defaultTemplates } = useWhatsAppSettings();
  const { branding, updateBranding, saveBranding, hasUnsavedChanges: brandingHasUnsavedChanges } = useShopBranding();
  const { settings: taxSettings, updateSettings: updateTaxSettings, saveSettings: saveTaxSettings } = useTaxSettings();
  const { 
    hiddenSections, 
    adminHiddenSections, 
    updateHiddenSections, 
    updateAdminHiddenSections,
    getAdminVisibleSections,
    isLoading: sectionsLoading 
  } = useShopSections();
  
  // Check if user is Super Admin - hide business-specific settings unless viewing a shop
  const isSuperAdmin = user?.role === 'SUPER_ADMIN';
  const isShopAdmin = user?.role === 'ADMIN';
  const canViewBusinessSettings = !isSuperAdmin || (isSuperAdmin && isViewingShop);
  // Shop Admin settings (Sections, Users tabs) visible for:
  // - SUPER_ADMIN viewing a shop
  // - Shop ADMIN (can manage sections for their users)
  // NOT visible for regular shop users (USER role)
  const canViewShopAdminSettings = isShopAdmin || (isSuperAdmin && isViewingShop);
  
  // Get the effective shop (either viewed shop for SUPER_ADMIN or user's own shop)
  const effectiveShop = isViewingShop && viewingShop ? viewingShop : user?.shop;
  
  const [copiedPlaceholder, setCopiedPlaceholder] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'appearance' | 'profile' | 'notifications' | 'grn' | 'invoice' | 'supplierOrders' | 'sections' | 'branding' | 'users'>('appearance');
  const [showPreview, setShowPreview] = useState(false);
  const [showGrnPreview, setShowGrnPreview] = useState(false);
  const [showSupplierPreview, setShowSupplierPreview] = useState(false);
  const [previewType, setPreviewType] = useState<'payment' | 'overdue'>('payment');
  const [grnPreviewType, setGrnPreviewType] = useState<'payment' | 'overdue'>('payment');
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // ===== Shop Admin States (for SUPER_ADMIN viewing a shop) =====
  const [shopUsers, setShopUsers] = useState<ShopUser[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [usersError, setUsersError] = useState<string | null>(null);
  const [usersLoadedForShop, setUsersLoadedForShop] = useState<string | null>(null); // Track which shop's users are loaded
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('card');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(8);
  
  // User modals
  const [selectedUser, setSelectedUser] = useState<ShopUser | null>(null);
  const [isEditUserModalOpen, setIsEditUserModalOpen] = useState(false);
  const [isResetPasswordModalOpen, setIsResetPasswordModalOpen] = useState(false);
  const [isCreateUserModalOpen, setIsCreateUserModalOpen] = useState(false);
  const [isDeleteUserModalOpen, setIsDeleteUserModalOpen] = useState(false);

  // Sections tab state
  const [localHiddenSections, setLocalHiddenSections] = useState<string[]>(hiddenSections);
  const [localAdminHiddenSections, setLocalAdminHiddenSections] = useState<string[]>(adminHiddenSections);
  const [sectionsHasChanges, setSectionsHasChanges] = useState(false);
  
  // Supplier Order Template state
  const [supplierOrderTemplateHasChanges, setSupplierOrderTemplateHasChanges] = useState(false);
  
  // Invoice template changes tracking
  const [invoiceTemplatesHasChanges, setInvoiceTemplatesHasChanges] = useState(false);
  
  // GRN template changes tracking
  const [grnTemplatesHasChanges, setGrnTemplatesHasChanges] = useState(false);

  // Theme/Accent/Tax unsaved changes tracking (only saved on Save button click)
  const [themeHasChanges, setThemeHasChanges] = useState(false);
  const [accentHasChanges, setAccentHasChanges] = useState(false);
  const [taxHasChanges, setTaxHasChanges] = useState(false);
  // Keep a ref of what pending values to save
  const [pendingTheme, setPendingTheme] = useState<string | null>(null);
  const [pendingAccent, setPendingAccent] = useState<string | null>(null);

  // Ensure SUPER_ADMIN's accent is persisted on first visit
  useEffect(() => {
    if (isSuperAdmin && !localStorage.getItem('superAdminAccentColor')) {
      localStorage.setItem('superAdminAccentColor', accentColor);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSuperAdmin]);

  // Sync theme/accent from database branding on load
  // SUPER_ADMIN keeps their own accent — don't overwrite it with the viewed shop's accent
  useEffect(() => {
    if (isSuperAdmin) return;

    if (branding?.themeMode) {
      const dbTheme = branding.themeMode as 'dark' | 'light';
      if (dbTheme !== theme) {
        // Only sync on initial load - don't override user's toggle
      }
    }
    if (branding?.accentColor) {
      const dbAccent = branding.accentColor as any;
      if (dbAccent in ACCENT_COLOR_MAP && dbAccent !== accentColor) {
        setAccentColor(dbAccent);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [branding?.themeMode, branding?.accentColor, isSuperAdmin]);

  // Save theme/accent settings to database (called from handleSave)
  const saveThemeToDatabase = async (newTheme?: string, newAccent?: string) => {
    const shopId = isViewingShop && viewingShop ? viewingShop.id : user?.shop?.id;
    const token = getAccessToken();
    if (!shopId || !token) return;

    const payload: any = {};
    if (newTheme !== undefined) payload.themeMode = newTheme;
    if (newAccent !== undefined) payload.accentColor = newAccent;

    const response = await fetch(`${API_URL}/shops/${shopId}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (response.ok) {
      updateBranding(payload);
    } else {
      throw new Error('Failed to save theme settings');
    }
  };

  // Handle theme toggle — apply locally, defer DB save to Save button
  const handleThemeToggle = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    toggleTheme();
    setPendingTheme(newTheme);
    setThemeHasChanges(true);
  };

  // Handle accent color change — apply locally, defer DB save to Save button
  const handleAccentChange = (color: string) => {
    if (!(isSuperAdmin && isViewingShop)) {
      // Apply the accent preview immediately (visual only)
      setAccentColor(color as any);
      if (isSuperAdmin) {
        localStorage.setItem('superAdminAccentColor', color);
      }
    }
    setPendingAccent(color);
    setAccentHasChanges(true);
  };

  // Update form when effective shop changes (e.g., SUPER_ADMIN switches shops)
  React.useEffect(() => {
    if (effectiveShop) {
      console.log('📋 Settings: Loading shop details for:', effectiveShop.name, effectiveShop.id);
    }
  }, [effectiveShop?.id]);

  // Get effective shop details for preview - prioritize API data, fallback to branding, then effective shop
  const effectiveShopName = shopDetails?.name || branding?.name || effectiveShop?.name || 'Your Shop Name';
  const effectiveShopPhone = shopDetails?.phone || branding?.phone || effectiveShop?.phone || '0XX XXX XXXX';
  const effectiveShopAddress = shopDetails?.address || branding?.address || effectiveShop?.address || 'Shop Address';
  const effectiveShopEmail = shopDetails?.email || branding?.email || effectiveShop?.email || 'shop@example.com';
  const effectiveShopWebsite = branding?.website || effectiveShop?.website || '';

  // ===== Shop Admin Effects (for SUPER_ADMIN viewing a shop OR Shop ADMIN) =====
  
  // Redirect regular users (not ADMIN) away from restricted tabs (sections, users)
  useEffect(() => {
    // Only ADMIN, SUPER_ADMIN, MANAGER can access sections/users tabs
    const canAccessShopAdminTabs = user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN' || user?.role === 'MANAGER';
    if (!canAccessShopAdminTabs && (activeTab === 'sections' || activeTab === 'users')) {
      setActiveTab('appearance');
    }
  }, [user?.role, activeTab]);
  
  // Sync local sections state when props change
  useEffect(() => {
    setLocalHiddenSections(hiddenSections);
  }, [hiddenSections]);

  // Sync admin hidden sections when props change
  useEffect(() => {
    setLocalAdminHiddenSections(adminHiddenSections);
  }, [adminHiddenSections]);

  // Check if there are unsaved section changes
  useEffect(() => {
    const sortedLocal = [...localHiddenSections].sort();
    const sortedProp = [...hiddenSections].sort();
    const sortedAdminLocal = [...localAdminHiddenSections].sort();
    const sortedAdminProp = [...adminHiddenSections].sort();
    setSectionsHasChanges(
      JSON.stringify(sortedLocal) !== JSON.stringify(sortedProp) ||
      JSON.stringify(sortedAdminLocal) !== JSON.stringify(sortedAdminProp)
    );
  }, [localHiddenSections, hiddenSections, localAdminHiddenSections, adminHiddenSections]);

  // Fetch shop users when on users tab
  const fetchShopUsers = async () => {
    if (!canViewShopAdminSettings || activeTab !== 'users') return;
    
    setUsersLoading(true);
    setUsersError(null);
    const token = getAccessToken();
    const shopIdParam = viewingShop ? `?shopId=${viewingShop.id}` : '';

    try {
      const res = await fetch(`${API_URL}/shop-admin/users${shopIdParam}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to fetch users');
      const data = await res.json();
      setShopUsers(data.data || []);
    } catch (err) {
      setUsersError(err instanceof Error ? err.message : 'Failed to load users');
    } finally {
      setUsersLoading(false);
    }
  };

  // Update a single user in the state (for individual card updates)
  const updateUserInState = (updatedUser: ShopUser) => {
    setShopUsers(prevUsers => 
      prevUsers.map(user => 
        user.id === updatedUser.id ? updatedUser : user
      )
    );
  };

  // Add a new user to the state
  const addUserToState = (newUser: ShopUser) => {
    setShopUsers(prevUsers => [newUser, ...prevUsers]);
  };

  // Remove a user from the state
  const removeUserFromState = (userId: string) => {
    setShopUsers(prevUsers => prevUsers.filter(user => user.id !== userId));
  };

  // Only fetch users once per shop (not on every tab switch)
  useEffect(() => {
    const currentShopId = viewingShop?.id || 'current';
    // Only fetch if we're on users tab AND haven't loaded for this shop yet
    if (canViewShopAdminSettings && activeTab === 'users' && usersLoadedForShop !== currentShopId) {
      fetchShopUsers();
      setUsersLoadedForShop(currentShopId);
    }
  }, [canViewShopAdminSettings, activeTab, viewingShop?.id, usersLoadedForShop]);

  // Reset loaded state when shop changes
  useEffect(() => {
    const currentShopId = viewingShop?.id || 'current';
    if (usersLoadedForShop && usersLoadedForShop !== currentShopId) {
      setUsersLoadedForShop(null);
      setShopUsers([]);
    }
  }, [viewingShop?.id]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [userSearchQuery, statusFilter, roleFilter]);

  // Toggle section visibility - LOCAL only (no auto-save)
  // SuperAdmin toggles hiddenSections (affects ADMIN + USER)
  // Shop ADMIN toggles adminHiddenSections (affects USER only)
  const toggleSection = (path: string) => {
    if (isSuperAdmin) {
      // SuperAdmin: Toggle in hiddenSections
      const newHiddenSections = localHiddenSections.includes(path)
        ? localHiddenSections.filter(p => p !== path)
        : [...localHiddenSections, path];
      
      setLocalHiddenSections(newHiddenSections);
    } else if (isShopAdmin) {
      // Shop ADMIN: Toggle in adminHiddenSections (only affects regular users)
      const newAdminHiddenSections = localAdminHiddenSections.includes(path)
        ? localAdminHiddenSections.filter(p => p !== path)
        : [...localAdminHiddenSections, path];
      
      setLocalAdminHiddenSections(newAdminHiddenSections);
    }
  };

  // Filtered users
  const filteredUsers = useMemo(() => {
    return shopUsers.filter(u => {
      // Hide SUPER_ADMIN users when viewing shop settings
      if (u.role === 'SUPER_ADMIN') return false;
      
      const matchesSearch =
        u.name.toLowerCase().includes(userSearchQuery.toLowerCase()) ||
        u.email.toLowerCase().includes(userSearchQuery.toLowerCase());
      const matchesStatus =
        statusFilter === 'all' ||
        (statusFilter === 'active' && u.isActive) ||
        (statusFilter === 'inactive' && !u.isActive);
      const matchesRole = roleFilter === 'all' || u.role === roleFilter;
      return matchesSearch && matchesStatus && matchesRole;
    });
  }, [shopUsers, userSearchQuery, statusFilter, roleFilter]);

  // Pagination
  const totalPages = Math.ceil(filteredUsers.length / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const paginatedUsers = filteredUsers.slice(startIndex, endIndex);

  // Format date helper
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  // Role badge
  const getRoleBadge = (role: string) => {
    const roleConfig: Record<string, { bg: string; text: string; border: string }> = {
      ADMIN: { bg: 'from-emerald-500/10 to-teal-500/10', text: theme === 'dark' ? 'text-emerald-400' : 'text-emerald-600', border: 'border-emerald-500/20' },
      MANAGER: { bg: 'from-blue-500/10 to-indigo-500/10', text: theme === 'dark' ? 'text-blue-400' : 'text-blue-600', border: 'border-blue-500/20' },
      STAFF: { bg: 'from-slate-500/10 to-gray-500/10', text: theme === 'dark' ? 'text-slate-400' : 'text-slate-600', border: 'border-slate-500/20' },
    };
    const config = roleConfig[role] || roleConfig.STAFF;
    return (
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-gradient-to-r ${config.bg} ${config.text} border ${config.border}`}>
        <UserCog className="w-3 h-3" />
        {role}
      </span>
    );
  };

  // Status badge
  const getStatusBadge = (isActive: boolean) => {
    return isActive ? (
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-gradient-to-r from-emerald-500/10 to-teal-500/10 ${theme === 'dark' ? 'text-emerald-400' : 'text-emerald-600'} border border-emerald-500/20`}>
        <CheckCircle className="w-3 h-3" />
        Active
      </span>
    ) : (
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-gradient-to-r from-red-500/10 to-rose-500/10 ${theme === 'dark' ? 'text-red-400' : 'text-red-600'} border border-red-500/20`}>
        <XCircle className="w-3 h-3" />
        Inactive
      </span>
    );
  };

  // ===================================
  // USER MODALS - CRUD Operations
  // ===================================

  // CREATE USER MODAL
  const CreateUserModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onSuccess: (newUser: ShopUser) => void;
  }> = ({ isOpen, onClose, onSuccess }) => {
    const [formData, setFormData] = useState({
      email: '',
      password: '',
      name: '',
      role: 'STAFF' as 'ADMIN' | 'MANAGER' | 'STAFF',
    });
    const [isSaving, setIsSaving] = useState(false);
    const [formError, setFormError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      setIsSaving(true);
      setFormError(null);

      try {
        const token = getAccessToken();
        const bodyData = viewingShop 
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

        toast.success('User created successfully!');
        onSuccess(data.data);
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
              <SearchableSelect
                options={[
                  { value: 'STAFF', label: 'Staff', icon: <Users className="w-4 h-4 text-slate-500" /> },
                  { value: 'MANAGER', label: 'Manager', icon: <UserCog className="w-4 h-4 text-blue-500" /> },
                  ...(viewingShop ? [{ value: 'ADMIN', label: 'Admin', icon: <CheckCircle2 className="w-4 h-4 text-emerald-500" /> }] : []),
                ]}
                value={formData.role}
                onValueChange={(val) => setFormData({ ...formData, role: val as 'ADMIN' | 'MANAGER' | 'STAFF' })}
                placeholder="Select role"
                searchPlaceholder="Search role..."
                theme={theme}
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
                className="px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal- text-white rounded-xl font-medium hover:shadow-emerald-500/25 disabled:opacity-50"
              >
                {isSaving ? 'Creating...' : 'Create User'}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  };

  // EDIT USER MODAL
  const EditUserModal: React.FC<{
    user: ShopUser | null;
    isOpen: boolean;
    onClose: () => void;
    onSuccess: (updatedUser: ShopUser) => void;
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
        const shopIdParam = viewingShop ? `?shopId=${viewingShop.id}` : '';
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

        toast.success('User updated successfully!');
        onSuccess(data.data);
        onClose();
      } catch (err) {
        setFormError(err instanceof Error ? err.message : 'Failed to update user');
      } finally {
        setIsSaving(false);
      }
    };

    if (!isOpen || !editUser) return null;

    const isEditingOwnProfile = editUser.id === user?.id;

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
        <div className={`relative w-full max-w-md rounded-2xl border ${
          theme === 'dark' ? 'bg-slate-900 border-slate-700/50' : 'bg-white border-slate-200'
        } shadow-2xl`}>
          <div className={`flex items-center justify-between p-6 border-b ${
            theme === 'dark' ? 'border-slate-700/50' : 'border-slate-200'
          }`}>
            <div>
              <h2 className={`text-xl font-semibold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                {isEditingOwnProfile ? 'Edit Your Profile' : 'Edit User'}
              </h2>
              {isEditingOwnProfile && (
                <p className={`text-sm mt-0.5 ${theme === 'dark' ? 'text-emerald-400' : 'text-emerald-600'}`}>
                  Update your name below
                </p>
              )}
            </div>
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
              {isEditingOwnProfile ? (
                <div className={`px-4 py-2.5 rounded-xl border flex items-center gap-2 ${
                  theme === 'dark'
                    ? 'bg-slate-800/30 border-slate-700/30 text-slate-400'
                    : 'bg-slate-50 border-slate-200 text-slate-500'
                }`}>
                  <Mail className="w-4 h-4" />
                  <span>{formData.email}</span>
                  <span className={`ml-auto text-xs ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>
                    Cannot be changed
                  </span>
                </div>
              ) : (
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
              )}
            </div>

            <div>
              <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                Role
              </label>
              {(editUser.role === 'ADMIN' && !viewingShop) || isEditingOwnProfile ? (
                <div className={`px-4 py-2.5 rounded-xl border flex items-center ${
                  theme === 'dark'
                    ? 'bg-slate-800/30 border-slate-700/30 text-slate-400'
                    : 'bg-slate-50 border-slate-200 text-slate-600'
                }`}>
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  {editUser.role} {isEditingOwnProfile ? '(Your role)' : '(Cannot change)'}
                </div>
              ) : (
                <SearchableSelect
                  options={[
                    { value: 'STAFF', label: 'Staff', icon: <Users className="w-4 h-4 text-slate-500" /> },
                    { value: 'MANAGER', label: 'Manager', icon: <UserCog className="w-4 h-4 text-blue-500" /> },
                    ...(viewingShop ? [{ value: 'ADMIN', label: 'Admin', icon: <CheckCircle2 className="w-4 h-4 text-emerald-500" /> }] : []),
                  ]}
                  value={formData.role}
                  onValueChange={(val) => setFormData({ ...formData, role: val as 'ADMIN' | 'MANAGER' | 'STAFF' })}
                  placeholder="Select role"
                  searchPlaceholder="Search role..."
                  theme={theme}
                />
              )}
            </div>

            {((editUser.role !== 'ADMIN' || viewingShop) && !isEditingOwnProfile) && (
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="isActiveEdit"
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  className="w-4 h-4 rounded border-slate-300 text-emerald-500 focus:ring-emerald-500"
                />
                <label htmlFor="isActiveEdit" className={`text-sm ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
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
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal- text-white rounded-xl font-medium hover:shadow-emerald-500/25 disabled:opacity-50"
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

  // RESET PASSWORD MODAL
  const ResetPasswordModal: React.FC<{
    user: ShopUser | null;
    isOpen: boolean;
    onClose: () => void;
  }> = ({ user: resetUser, isOpen, onClose }) => {
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
        const shopIdParam = viewingShop ? `?shopId=${viewingShop.id}` : '';
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

        toast.success('Password reset successfully!');
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

  // DELETE USER MODAL
  const DeleteUserModal: React.FC<{
    user: ShopUser | null;
    isOpen: boolean;
    onClose: () => void;
    onSuccess: (userId: string) => void;
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
        const shopIdParam = viewingShop ? `?shopId=${viewingShop.id}` : '';
        const response = await fetch(`${API_URL}/shop-admin/users/${deleteUser.id}${shopIdParam}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` },
        });

        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.message || 'Failed to delete user');
        }

        toast.success('User deleted successfully!');
        onSuccess(deleteUser.id);
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
            <h2 className="text-xl font-semibold text-red-500">
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
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-red-500 to-rose-500 text-white rounded-xl font-medium hover:shadow-red-500/25 disabled:opacity-50"
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

  const placeholders = [
    { key: '{{customerName}}', desc: 'Customer name', example: 'John Doe' },
    { key: '{{invoiceId}}', desc: 'Invoice number', example: 'INV-10260019' },
    { key: '{{totalAmount}}', desc: 'Total invoice amount', example: '25,500' },
    { key: '{{paidAmount}}', desc: 'Amount already paid', example: '10,000' },
    { key: '{{dueAmount}}', desc: 'Balance to pay', example: '15,500' },
    { key: '{{dueDate}}', desc: 'Payment due date', example: '25/01/2026' },
    { key: '{{daysOverdue}}', desc: 'Days past due date', example: '5' },
    { key: '{{shopName}}', desc: 'Your shop name', example: effectiveShopName },
    { key: '{{shopPhone}}', desc: 'Shop phone', example: effectiveShopPhone },
    { key: '{{shopEmail}}', desc: 'Shop email', example: effectiveShopEmail },
    { key: '{{shopAddress}}', desc: 'Shop address', example: effectiveShopAddress },
    { key: '{{shopWebsite}}', desc: 'Shop website', example: effectiveShopWebsite || 'www.example.com' },
  ];

  const previewData: ReminderPreview = {
    customerName: 'John Doe',
    invoiceId: 'INV-10260019',
    totalAmount: '25,500',
    paidAmount: '10,000',
    dueAmount: '15,500',
    dueDate: '25/01/2026',
    daysOverdue: '5',
  };

  const copyPlaceholder = (key: string) => {
    navigator.clipboard.writeText(key);
    setCopiedPlaceholder(key);
    setTimeout(() => setCopiedPlaceholder(null), 1500);
  };

  const generatePreview = (template: string) => {
    return template
      .replace(/\{\{customerName\}\}/g, previewData.customerName)
      .replace(/\{\{invoiceId\}\}/g, previewData.invoiceId)
      .replace(/\{\{totalAmount\}\}/g, previewData.totalAmount)
      .replace(/\{\{paidAmount\}\}/g, previewData.paidAmount)
      .replace(/\{\{dueAmount\}\}/g, previewData.dueAmount)
      .replace(/\{\{dueDate\}\}/g, previewData.dueDate)
      .replace(/\{\{daysOverdue\}\}/g, previewData.daysOverdue)
      .replace(/\{\{shopName\}\}/g, effectiveShopName)
      .replace(/\{\{shopPhone\}\}/g, effectiveShopPhone)
      .replace(/\{\{shopAddress\}\}/g, effectiveShopAddress)
      .replace(/\{\{shopWebsite\}\}/g, effectiveShopWebsite);
  };

  // GRN preview data
  const grnPreviewData = {
    grnNumber: 'GRN-2026-0042',
    supplierName: 'HP Sri Lanka',
    totalAmount: '185,000',
    paidAmount: '100,000',
    balanceDue: '85,000',
    grnDate: '10/02/2026',
  };

  const generateGrnPreview = (template: string) => {
    return template
      .replace(/\{\{grnNumber\}\}/g, grnPreviewData.grnNumber)
      .replace(/\{\{supplierName\}\}/g, grnPreviewData.supplierName)
      .replace(/\{\{totalAmount\}\}/g, grnPreviewData.totalAmount)
      .replace(/\{\{paidAmount\}\}/g, grnPreviewData.paidAmount)
      .replace(/\{\{balanceDue\}\}/g, grnPreviewData.balanceDue)
      .replace(/\{\{grnDate\}\}/g, grnPreviewData.grnDate)
      .replace(/\{\{shopName\}\}/g, effectiveShopName)
      .replace(/\{\{shopPhone\}\}/g, effectiveShopPhone)
      .replace(/\{\{shopAddress\}\}/g, effectiveShopAddress);
  };

  const generateSupplierPreview = (template: string) => {
    const today = new Date().toLocaleDateString('en-GB', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    return template
      .replace(/\{\{supplierName\}\}/g, 'Roshan Fernando')
      .replace(/\{\{supplierCompany\}\}/g, 'HP Sri Lanka')
      .replace(/\{\{orderDate\}\}/g, today)
      .replace(/\{\{shopName\}\}/g, effectiveShopName)
      .replace(/\{\{shopPhone\}\}/g, effectiveShopPhone)
      .replace(/\{\{shopAddress\}\}/g, effectiveShopAddress);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // Save theme/accent changes to database
      if (themeHasChanges || accentHasChanges) {
        await saveThemeToDatabase(
          themeHasChanges && pendingTheme ? pendingTheme : undefined,
          accentHasChanges && pendingAccent ? pendingAccent : undefined
        );
        setThemeHasChanges(false);
        setAccentHasChanges(false);
        setPendingTheme(null);
        setPendingAccent(null);
      }
      // Save tax settings changes
      if (taxHasChanges) {
        await saveTaxSettings();
        setTaxHasChanges(false);
      }
      // Save sections changes if any (supports both SuperAdmin and Shop ADMIN)
      if (sectionsHasChanges) {
        if (isSuperAdmin) {
          await updateHiddenSections(localHiddenSections);
        } else if (isShopAdmin) {
          await updateAdminHiddenSections(localAdminHiddenSections);
        }
      }
      // Save branding changes if on profile tab and has changes
      if (activeTab === 'profile' && brandingHasUnsavedChanges) {
        await saveBranding();
      }
      // Save supplier order template changes if on supplierOrders tab and has changes
      if (activeTab === 'supplierOrders' && supplierOrderTemplateHasChanges) {
        await saveSettings();
        setSupplierOrderTemplateHasChanges(false);
      }
      // Save invoice WhatsApp template changes if on invoice tab and has changes
      if (activeTab === 'invoice' && invoiceTemplatesHasChanges) {
        await saveSettings();
        setInvoiceTemplatesHasChanges(false);
      }
      // Save GRN WhatsApp template changes if on grn tab and has changes
      if (activeTab === 'grn' && grnTemplatesHasChanges) {
        await saveSettings();
        setGrnTemplatesHasChanges(false);
      }
      setSaveSuccess(true);
      toast.success('Settings saved successfully!');
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (error) {
      console.error('Failed to save settings:', error);
      toast.error('Failed to save settings');
    } finally {
      setIsSaving(false);
    }
  };

  // All available tabs - organized in categories
  const generalTabs = [
    { id: 'appearance' as const, label: 'Appearance', icon: Palette, color: 'emerald' },
    { id: 'profile' as const, label: 'Business Profile', icon: Building2, color: 'purple', businessOnly: true },
    { id: 'notifications' as const, label: 'WhatsApp Reminders', icon: MessageCircle, color: 'green', businessOnly: true },
    { id: 'invoice' as const, label: 'Invoice Settings', icon: FileText, color: 'blue', businessOnly: true },
    { id: 'grn' as const, label: 'GRN Settings', icon: Package, color: 'teal', businessOnly: true },
    { id: 'supplierOrders' as const, label: 'Supplier Orders', icon: Truck, color: 'orange', businessOnly: true },
  ];

  // Shop Admin tabs - only for SUPER_ADMIN viewing a shop
  const shopAdminTabs = [
    { id: 'sections' as const, label: 'Sections', icon: Layers, color: 'violet', superAdminOnly: true },
    { id: 'users' as const, label: 'Users', icon: Users, color: 'cyan', superAdminOnly: true },
  ];

  // Combine tabs based on user role
  const allTabs = canViewShopAdminSettings 
    ? [...generalTabs.filter(tab => !tab.businessOnly || canViewBusinessSettings), ...shopAdminTabs]
    : canViewBusinessSettings 
      ? generalTabs
      : generalTabs.filter(tab => !tab.businessOnly);

  // Use allTabs directly (renamed for consistency)
  const tabs = allTabs;

  return (
    <div className="min-h-screen pb-8">
      {/* Hero Header with Gradient - Samsung S20 (360px) + iPad Mini (768px) optimized */}
      <div className="relative overflow-hidden mb-4 sm:mb-6 md:mb-8">
        <div className={`absolute inset-0 ${
          theme === 'dark' 
            ? 'bg-gradient-to-br from-slate-900 via-purple-900/20 to-slate-900' 
            : 'bg-gradient-to-br from-slate-50 via-purple-50 to-slate-50'
        }`} />
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-20 -right-20 sm:-top-40 sm:-right-40 w-40 sm:w-80 h-40 sm:h-80 bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-full blur-3xl" />
          <div className="absolute -bottom-20 -left-20 sm:-bottom-40 sm:-left-40 w-40 sm:w-80 h-40 sm:h-80 bg-gradient-to-br from-emerald-500/20 to-teal- rounded-full blur-3xl" />
        </div>
        
        <div className="relative p-4 sm:p-6 md:p-8">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 sm:gap-4 min-w-0">
              <div className="w-10 h-10 sm:w-12 sm:h-12 md:w-14 md:h-14 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl sm:rounded-2xl flex items-center justify-center shadow-lg shadow-purple-500/30 flex-shrink-0">
                <Settings2 className="w-5 h-5 sm:w-6 sm:h-6 md:w-7 md:h-7 text-white" />
              </div>
              <div className="min-w-0">
                <h1 className={`text-xl sm:text-2xl md:text-3xl font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                  Settings
                </h1>
                <p className={`text-xs sm:text-sm md:text-base truncate ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                  Customize your experience and preferences
                </p>
              </div>
            </div>
            {/* Save Button - Show for all tabs except users */}
            {activeTab !== 'users' && (
              <button
                onClick={handleSave}
                disabled={isSaving}
                className={`relative px-3 sm:px-5 md:px-6 py-2 sm:py-2.5 rounded-xl font-semibold text-white text-xs sm:text-sm md:text-base transition-all overflow-hidden flex-shrink-0 ${
                  saveSuccess 
                    ? 'bg-green-500' 
                    : 'bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 hover:shadow-lg hover:shadow-purple-500/30'
                }`}
              >
                {isSaving ? (
                  <span className="flex items-center gap-1.5 sm:gap-2">
                    <RefreshCw className="w-3.5 h-3.5 sm:w-4 sm:h-4 animate-spin" />
                    <span className="hidden sm:inline">Saving...</span>
                  </span>
                ) : saveSuccess ? (
                  <span className="flex items-center gap-1.5 sm:gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    <span className="hidden sm:inline">Saved!</span>
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5 sm:gap-2">
                    <Save className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    <span className="hidden sm:inline">Save Changes</span>
                    <span className="sm:hidden">Save</span>
                  </span>
                )}
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-3 sm:px-4">
        {/* Shop Viewing Banner for SUPER_ADMIN */}
        {isSuperAdmin && isViewingShop && viewingShop && (
          <div className={`mb-6 rounded-2xl border p-4 ${
            theme === 'dark' 
              ? 'bg-amber-500/10 border-amber-500/30' 
              : 'bg-amber-50 border-amber-200'
          }`}>
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-xl ${
                theme === 'dark' ? 'bg-amber-500/20' : 'bg-amber-100'
              }`}>
                <Building2 className="w-5 h-5 text-amber-500" />
              </div>
              <div>
                <p className={`font-medium ${theme === 'dark' ? 'text-amber-400' : 'text-amber-700'}`}>
                  Viewing Settings for: {viewingShop.name}
                </p>
                <p className={`text-sm ${theme === 'dark' ? 'text-amber-400/70' : 'text-amber-600'}`}>
                  You are viewing this shop's settings as Super Admin
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Modern Tab Navigation - World Class Design - Samsung S20 (360px) + iPad Mini (768px) optimized */}
        <div className={`rounded-xl sm:rounded-2xl p-1 sm:p-1.5 mb-4 sm:mb-6 md:mb-8 ${
          theme === 'dark' ? 'bg-slate-800/50 backdrop-blur-sm' : 'bg-white shadow-lg shadow-slate-200/50'
        }`}>
          {/* Shop Admin Section Divider - Show when SUPER_ADMIN viewing shop */}
          {canViewShopAdminSettings && (
            <div className="px-2.5 sm:px-4 py-1.5 sm:py-2 mb-1 sm:mb-2">
              <div className="flex items-center gap-2 sm:gap-3">
                <span className={`text-[9px] sm:text-[10px] font-bold uppercase tracking-widest ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>
                  General Settings
                </span>
                <div className={`flex-1 h-px ${theme === 'dark' ? 'bg-slate-700/50' : 'bg-slate-200'}`} />
              </div>
            </div>
          )}
          
          <div className={`grid gap-1 sm:gap-1.5 md:gap-2 ${
            canViewShopAdminSettings 
              ? 'grid-cols-3 sm:grid-cols-3 md:grid-cols-6' 
              : 'grid-cols-3 sm:grid-cols-3 md:grid-cols-6'
          }`}>
            {tabs.slice(0, canViewShopAdminSettings ? 6 : tabs.length).map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              const getGradient = () => {
                switch (tab.color) {
                  case 'emerald': return 'from-emerald-500 to-teal-500';
                  case 'purple': return 'from-purple-500 to-pink-500';
                  case 'amber': return 'from-amber-500 to-orange-500';
                  case 'blue': return 'from-blue-500 to-indigo-500';
                  case 'violet': return 'from-violet-500 to-purple-500';
                  case 'pink': return 'from-pink-500 to-rose-500';
                  case 'cyan': return 'from-cyan-500 to-blue-500';
                  case 'orange': return 'from-orange-500 to-amber-500';
                  case 'teal': return 'from-teal-500 to-cyan-500';
                  case 'green': return 'from-green-500 to-emerald-500';
                  default: return 'from-emerald-500 to-teal-500';
                }
              };
              const getShadowColor = () => {
                switch (tab.color) {
                  case 'emerald': return 'rgba(16, 185, 129, 0.5)';
                  case 'purple': return 'rgba(139, 92, 246, 0.5)';
                  case 'amber': return 'rgba(245, 158, 11, 0.5)';
                  case 'blue': return 'rgba(59, 130, 246, 0.5)';
                  case 'violet': return 'rgba(139, 92, 246, 0.5)';
                  case 'pink': return 'rgba(236, 72, 153, 0.5)';
                  case 'cyan': return 'rgba(6, 182, 212, 0.5)';
                  case 'orange': return 'rgba(249, 115, 22, 0.5)';
                  case 'teal': return 'rgba(20, 184, 166, 0.5)';
                  case 'green': return 'rgba(34, 197, 94, 0.5)';
                  default: return 'rgba(16, 185, 129, 0.5)';
                }
              };
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`relative flex flex-col sm:flex-row items-center justify-center gap-0.5 sm:gap-2 px-1.5 sm:px-3 py-2 sm:py-2.5 rounded-lg sm:rounded-xl font-medium transition-all duration-300 ${
                    isActive
                      ? `bg-gradient-to-r ${getGradient()} text-white shadow-lg`
                      : theme === 'dark' 
                        ? 'text-slate-400 hover:text-white hover:bg-slate-700/50' 
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                  style={isActive ? { boxShadow: `0 8px 24px -8px ${getShadowColor()}` } : {}}
                >
                  <Icon className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />
                  <span className="text-[9px] sm:text-xs md:text-sm leading-tight text-center sm:text-left truncate max-w-full">{tab.label.split(' ')[0]}</span>
                  <span className="hidden md:inline text-sm">{tab.label.includes(' ') ? tab.label.substring(tab.label.indexOf(' ')) : ''}</span>
                </button>
              );
            })}
          </div>

          {/* Shop Admin Section - Only for SUPER_ADMIN viewing shop */}
          {canViewShopAdminSettings && (
            <>
              <div className="px-2.5 sm:px-4 py-1.5 sm:py-2 mt-2 sm:mt-3">
                <div className="flex items-center gap-2 sm:gap-3">
                  <span className={`text-[9px] sm:text-[10px] font-bold uppercase tracking-widest ${theme === 'dark' ? 'text-emerald-400/70' : 'text-emerald-600'}`}>
                    Shop Administration
                  </span>
                  <div className={`flex-1 h-px ${theme === 'dark' ? 'bg-emerald-500/20' : 'bg-emerald-200'}`} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-1 sm:gap-1.5 md:gap-2">
                {tabs.slice(6).map((tab) => {
                  const Icon = tab.icon;
                  const isActive = activeTab === tab.id;
                  const getGradient = () => {
                    switch (tab.color) {
                      case 'violet': return 'from-violet-500 to-purple-500';
                      case 'pink': return 'from-pink-500 to-rose-500';
                      case 'cyan': return 'from-cyan-500 to-blue-500';
                      default: return 'from-emerald-500 to-teal-500';
                    }
                  };
                  const getShadowColor = () => {
                    switch (tab.color) {
                      case 'violet': return 'rgba(139, 92, 246, 0.5)';
                      case 'pink': return 'rgba(236, 72, 153, 0.5)';
                      case 'cyan': return 'rgba(6, 182, 212, 0.5)';
                      default: return 'rgba(16, 185, 129, 0.5)';
                    }
                  };
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`relative flex items-center justify-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-2 sm:py-2.5 rounded-lg sm:rounded-xl font-medium transition-all duration-300 ${
                        isActive
                          ? `bg-gradient-to-r ${getGradient()} text-white shadow-lg`
                          : theme === 'dark' 
                            ? 'text-slate-400 hover:text-white hover:bg-slate-700/50' 
                            : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                      }`}
                      style={isActive ? { boxShadow: `0 8px 24px -8px ${getShadowColor()}` } : {}}
                    >
                      <Icon className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />
                      <span className="text-xs sm:text-sm">{tab.label}</span>
                      {/* Unsaved changes indicator */}
                      {tab.id === 'supplierOrders' && supplierOrderTemplateHasChanges && (
                        <div className={`w-2 h-2 rounded-full ${isActive ? 'bg-white' : 'bg-orange-500'}`} />
                      )}
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </div>

        {/* Appearance Tab */}
        {activeTab === 'appearance' && (
          <div className="space-y-4 sm:space-y-6 animate-in fade-in duration-300">
            {/* Theme Toggle Card */}
            <div className={`rounded-2xl sm:rounded-3xl border overflow-hidden ${
              theme === 'dark' 
                ? 'bg-gradient-to-br from-slate-800/80 to-slate-900/80 border-slate-700/50 backdrop-blur-xl' 
                : 'bg-white border-slate-200 shadow-xl shadow-slate-200/50'
            }`}>
              <div className="p-4 sm:p-6">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                    <div className={`w-11 h-11 sm:w-14 sm:h-14 md:w-16 md:h-16 rounded-xl sm:rounded-2xl flex items-center justify-center transition-all duration-500 flex-shrink-0 ${
                      theme === 'dark' 
                        ? 'bg-gradient-to-br from-indigo-500/20 to-purple-500/20' 
                        : 'bg-gradient-to-br from-amber-100 to-orange-100'
                    }`}>
                      {theme === 'dark' ? (
                        <Moon className="w-5 h-5 sm:w-7 sm:h-7 md:w-8 md:h-8 text-indigo-400" />
                      ) : (
                        <Sun className="w-5 h-5 sm:w-7 sm:h-7 md:w-8 md:h-8 text-amber-500" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <h2 className={`text-base sm:text-lg md:text-xl font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                        {theme === 'dark' ? 'Dark Mode' : 'Light Mode'}
                      </h2>
                      <p className={`text-xs sm:text-sm truncate ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                        {theme === 'dark' ? 'Easier on the eyes in low light' : 'Clean and bright interface'}
                      </p>
                    </div>
                  </div>
                  
                  {/* Modern Toggle Switch */}
                  <button
                    onClick={handleThemeToggle}
                    className={`relative w-16 h-8 sm:w-20 sm:h-10 rounded-full transition-all duration-500 flex-shrink-0 ${
                      theme === 'dark' 
                        ? 'bg-gradient-to-r from-indigo-600 to-purple-600' 
                        : 'bg-gradient-to-r from-amber-400 to-orange-400'
                    }`}
                    style={{
                      boxShadow: theme === 'dark' 
                        ? '0 0 20px rgba(99, 102, 241, 0.4)' 
                        : '0 0 20px rgba(245, 158, 11, 0.4)'
                    }}
                  >
                    <div className={`absolute top-1 w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-white flex items-center justify-center transition-all duration-500 ${
                      theme === 'dark' ? 'translate-x-[1.95rem] sm:translate-x-11' : 'translate-x-1'
                    }`}
                    style={{ boxShadow: '0 2px 10px rgba(0,0,0,0.2)' }}
                    >
                      {theme === 'dark' ? (
                        <Moon className="w-3.5 h-3.5 sm:w-5 sm:h-5 text-indigo-600" />
                      ) : (
                        <Sun className="w-3.5 h-3.5 sm:w-5 sm:h-5 text-amber-500" />
                      )}
                    </div>
                  </button>
                </div>
              </div>
            </div>

            {/* Accent Color Picker */}
            <div className={`rounded-2xl sm:rounded-3xl border overflow-hidden ${
              theme === 'dark' 
                ? 'bg-gradient-to-br from-slate-800/80 to-slate-900/80 border-slate-700/50 backdrop-blur-xl' 
                : 'bg-white border-slate-200 shadow-xl shadow-slate-200/50'
            }`}>
              <div className="p-4 sm:p-6">
                <div className="flex items-center gap-2.5 sm:gap-3 mb-5 sm:mb-6">
                  <div className={`w-9 h-9 sm:w-12 sm:h-12 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-lg sm:rounded-xl flex items-center justify-center flex-shrink-0`}>
                    <Sparkles className="w-4 h-4 sm:w-6 sm:h-6 text-white" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className={`text-sm sm:text-base font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                        Accent Color
                      </h3>
                    </div>
                    <p className={`text-xs sm:text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                      Choose your primary accent color
                    </p>
                  </div>
                </div>
                
                {/* Color Grid */}
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-3 sm:gap-4">
                  {([
                    { key: 'emerald', name: 'Emerald', hexFrom: '#10b981', hexTo: '#14b8a6', hex: '#10b981' },
                    { key: 'blue', name: 'Blue', hexFrom: '#3b82f6', hexTo: '#06b6d4', hex: '#3b82f6' },
                    { key: 'purple', name: 'Purple', hexFrom: '#a855f7', hexTo: '#ec4899', hex: '#a855f7' },
                    { key: 'rose', name: 'Rose', hexFrom: '#f43f5e', hexTo: '#ec4899', hex: '#f43f5e' },
                    { key: 'amber', name: 'Amber', hexFrom: '#f59e0b', hexTo: '#f97316', hex: '#f59e0b' },
                    { key: 'indigo', name: 'Indigo', hexFrom: '#6366f1', hexTo: '#a855f7', hex: '#6366f1' },
                  ] as const).map((color) => {
                    const isSelected = accentColor === color.key;
                    return (
                      <button
                        key={color.key}
                        onClick={() => handleAccentChange(color.key)}
                        className={`group relative flex flex-col items-center gap-2 p-3 sm:p-4 rounded-xl sm:rounded-2xl border-2 transition-all duration-300 ${
                          isSelected
                            ? theme === 'dark'
                              ? 'border-white/30 bg-slate-700/50 scale-[1.02]'
                              : 'border-slate-900/20 bg-slate-50 scale-[1.02]'
                            : theme === 'dark'
                              ? 'border-slate-700/30 hover:border-slate-600/50 hover:bg-slate-800/30'
                              : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                        }`}
                        style={isSelected ? { boxShadow: `0 0 24px -4px ${color.hex}40` } : {}}
                      >
                        {/* Color Swatch */}
                        <div className={`relative w-10 h-10 sm:w-12 sm:h-12 rounded-full transition-all duration-300 group-hover:scale-110 ${
                          isSelected ? 'ring-2 ring-offset-2 ring-white/50 shadow-lg' : ''
                        }`}
                          style={{
                            background: `linear-gradient(to bottom right, ${color.hexFrom}, ${color.hexTo})`,
                            ...(isSelected ? { boxShadow: `0 4px 16px ${color.hex}50` } : {}),
                          }}
                        >
                          {isSelected && (
                            <div className="absolute inset-0 flex items-center justify-center animate-in zoom-in duration-200">
                              <Check className="w-5 h-5 sm:w-6 sm:h-6 text-white drop-shadow-md" />
                            </div>
                          )}
                        </div>
                        
                        {/* Color Name */}
                        <span className={`text-[10px] sm:text-xs font-semibold transition-colors ${
                          isSelected
                            ? theme === 'dark' ? 'text-white' : 'text-slate-900'
                            : theme === 'dark' ? 'text-slate-500' : 'text-slate-500'
                        }`}>
                          {color.name}
                        </span>
                        
                        {/* Active Indicator */}
                        {isSelected && (
                          <div className={`absolute -top-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center ring-2 ${
                            theme === 'dark' ? 'ring-slate-800' : 'ring-white'
                          }`}
                            style={{ background: `linear-gradient(to bottom right, ${color.hexFrom}, ${color.hexTo})` }}
                          >
                            <Check className="w-2.5 h-2.5 text-white" />
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Live Preview Section */}
              <div className={`p-4 sm:p-6 border-t ${theme === 'dark' ? 'border-slate-700/50' : 'border-slate-200'}`}>
                <p className={`text-xs sm:text-sm font-semibold mb-3 sm:mb-4 flex items-center gap-2 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                  <Eye className="w-3.5 h-3.5" />
                  Live Preview
                </p>
                
                <div className="space-y-3">
                  {/* Mini UI Preview */}
                  <div className={`rounded-xl border overflow-hidden ${
                    theme === 'dark' ? 'bg-slate-900 border-slate-700/50' : 'bg-slate-50 border-slate-200'
                  }`}>
                    {/* Mini Header */}
                    <div className={`px-3 sm:px-4 py-2.5 sm:py-3 flex items-center justify-between border-b ${
                      theme === 'dark' ? 'bg-slate-800/80 border-slate-700/50' : 'bg-white border-slate-200'
                    }`}>
                      <div className="flex items-center gap-2">
                        <div className={`w-5 h-5 sm:w-6 sm:h-6 rounded-md bg-gradient-to-br ${accent.gradient}`} />
                        <span className={`text-xs sm:text-sm font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                          {branding?.name || 'Eco System'}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <div className={`w-6 h-6 sm:w-7 sm:h-7 rounded-lg ${theme === 'dark' ? 'bg-slate-700/50' : 'bg-slate-100'}`} />
                        <div className={`w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-gradient-to-br ${accent.gradient}`} />
                      </div>
                    </div>
                    
                    {/* Mini Content */}
                    <div className="p-3 sm:p-4 space-y-2.5">
                      {/* Stats Row */}
                      <div className="grid grid-cols-3 gap-2">
                        {['Revenue', 'Orders', 'Customers'].map((label, i) => (
                          <div key={label} className={`p-2 sm:p-2.5 rounded-lg border ${
                            theme === 'dark' ? 'bg-slate-800/50 border-slate-700/30' : 'bg-white border-slate-200'
                          }`}>
                            <div className={`text-[9px] sm:text-[10px] ${theme === 'dark' ? 'text-slate-500' : 'text-slate-500'}`}>{label}</div>
                            <div className={`text-xs sm:text-sm font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                              {i === 0 ? 'Rs. 2.5M' : i === 1 ? '142' : '89'}
                            </div>
                            <div className={`w-full h-1 mt-1 rounded-full ${theme === 'dark' ? 'bg-slate-700' : 'bg-slate-100'} overflow-hidden`}>
                              <div className={`h-full rounded-full bg-gradient-to-r ${accent.gradient}`} style={{ width: `${60 + i * 15}%` }} />
                            </div>
                          </div>
                        ))}
                      </div>
                      
                      {/* Mini Button Row */}
                      <div className="flex items-center gap-2">
                        <button className={`flex-1 px-3 py-1.5 sm:py-2 text-[10px] sm:text-xs font-semibold text-white rounded-lg bg-gradient-to-r ${accent.gradient} shadow-sm`}>
                          Create Invoice
                        </button>
                        <button className={`px-3 py-1.5 sm:py-2 text-[10px] sm:text-xs font-semibold rounded-lg border ${
                          theme === 'dark' ? 'border-slate-700 text-slate-400 bg-slate-800/50' : 'border-slate-200 text-slate-600 bg-white'
                        }`}>
                          Export
                        </button>
                      </div>

                      {/* Mini Table */}
                      <div className={`rounded-lg border overflow-hidden ${
                        theme === 'dark' ? 'border-slate-700/30' : 'border-slate-200'
                      }`}>
                        <div className={`px-2.5 py-1.5 text-[9px] sm:text-[10px] font-semibold uppercase tracking-wider ${
                          theme === 'dark' ? 'bg-slate-800/50 text-slate-500' : 'bg-slate-50 text-slate-500'
                        }`}>
                          Recent Invoices
                        </div>
                        {[
                          { id: 'INV-001', status: 'Paid', color: 'emerald' },
                          { id: 'INV-002', status: 'Pending', color: 'amber' },
                        ].map((row) => (
                          <div key={row.id} className={`px-2.5 py-1.5 flex items-center justify-between border-t ${
                            theme === 'dark' ? 'border-slate-700/30' : 'border-slate-100'
                          }`}>
                            <span className={`text-[10px] sm:text-xs ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>{row.id}</span>
                            <span className={`text-[9px] sm:text-[10px] px-2 py-0.5 rounded-full font-medium ${
                              row.color === 'emerald'
                                ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                                : 'bg-amber-500/10 text-amber-500 border border-amber-500/20'
                            }`}>
                              {row.status}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Tax Configuration Card - Show for shop admins AND SuperAdmin viewing a shop */}
            {canViewBusinessSettings && (
              <div className={`rounded-2xl sm:rounded-3xl border overflow-hidden ${
                theme === 'dark' 
                  ? 'bg-gradient-to-br from-slate-800/80 to-slate-900/80 border-slate-700/50 backdrop-blur-xl' 
                  : 'bg-white border-slate-200 shadow-xl shadow-slate-200/50'
              }`}>
                <div className="p-4 sm:p-6">
                  <div className="flex items-center gap-2.5 sm:gap-3 mb-4 sm:mb-6">
                    <div className="w-9 h-9 sm:w-12 sm:h-12 bg-gradient-to-br from-emerald-500/20 to-teal-500/20 rounded-lg sm:rounded-xl flex items-center justify-center flex-shrink-0">
                      <Settings2 className="w-4 h-4 sm:w-6 sm:h-6 text-emerald-500" />
                    </div>
                    <div className="min-w-0">
                      <h3 className={`text-sm sm:text-base font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                        Tax Configuration
                      </h3>
                      <p className={`text-xs sm:text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                        Set default tax settings for invoices
                      </p>
                    </div>
                  </div>

                  <div className="space-y-4 sm:space-y-6">
                    {/* Tax Enable/Disable Toggle */}
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5 sm:gap-4 min-w-0">
                        <div className={`w-10 h-10 sm:w-14 sm:h-14 rounded-xl sm:rounded-2xl flex items-center justify-center transition-all duration-500 flex-shrink-0 ${
                          taxSettings.enabled
                            ? 'bg-gradient-to-br from-emerald-500/20 to-teal-500/20' 
                            : 'bg-gradient-to-br from-slate-500/20 to-slate-600/20'
                        }`}>
                          <CheckCircle2 className={`w-5 h-5 sm:w-7 sm:h-7 transition-colors ${
                            taxSettings.enabled ? 'text-emerald-500' : 'text-slate-500'
                          }`} />
                        </div>
                        <div>
                          <p className={`font-semibold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                            Enable Tax by Default
                          </p>
                          <p className={`text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                            {taxSettings.enabled ? 'Tax will be added to all new invoices' : 'Tax disabled for new invoices'}
                          </p>
                        </div>
                      </div>
                      
                      {/* Modern Toggle Switch */}
                      <button
                        onClick={() => {
                          updateTaxSettings({ enabled: !taxSettings.enabled });
                          setTaxHasChanges(true);
                        }}
                        className={`relative w-16 h-8 sm:w-20 sm:h-10 rounded-full transition-all duration-500 flex-shrink-0 ${
                          taxSettings.enabled
                            ? 'bg-gradient-to-r from-emerald-600 to-teal-600' 
                            : 'bg-gradient-to-r from-slate-400 to-slate-500'
                        }`}
                        style={{
                          boxShadow: taxSettings.enabled
                            ? '0 0 20px rgba(16, 185, 129, 0.4)' 
                            : '0 0 10px rgba(100, 116, 139, 0.2)'
                        }}
                      >
                        <div className={`absolute top-1 w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-white flex items-center justify-center transition-all duration-500 ${
                          taxSettings.enabled ? 'translate-x-[1.95rem] sm:translate-x-11' : 'translate-x-1'
                        }`}
                        style={{ boxShadow: '0 2px 10px rgba(0,0,0,0.2)' }}
                        >
                          {taxSettings.enabled ? (
                            <CheckCircle2 className="w-3.5 h-3.5 sm:w-5 sm:h-5 text-emerald-600" />
                          ) : (
                            <AlertCircle className="w-3.5 h-3.5 sm:w-5 sm:h-5 text-slate-500" />
                          )}
                        </div>
                      </button>
                    </div>

                    {/* Default Tax Percentage */}
                    <div className={`p-3 sm:p-5 rounded-xl sm:rounded-2xl border transition-all ${
                      taxSettings.enabled
                        ? theme === 'dark' ? 'bg-emerald-500/5 border-emerald-500/30' : 'bg-emerald-50/50 border-emerald-200'
                        : theme === 'dark' ? 'bg-slate-800/30 border-slate-700/50 opacity-50' : 'bg-slate-50 border-slate-200 opacity-50'
                    }`}>
                      {/* Big Percentage Display + Stepper */}
                      <div className="flex items-center justify-center gap-3 sm:gap-5">
                        {/* Minus Button */}
                        <button
                          onClick={() => {
                            const val = Math.max(0, taxSettings.defaultPercentage - 0.5);
                            updateTaxSettings({ defaultPercentage: val });
                            setTaxHasChanges(true);
                          }}
                          disabled={!taxSettings.enabled || taxSettings.defaultPercentage <= 0}
                          className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl flex items-center justify-center text-xl font-bold transition-all active:scale-90 ${
                            taxSettings.enabled && taxSettings.defaultPercentage > 0
                              ? theme === 'dark'
                                ? 'bg-slate-700/70 text-slate-200 hover:bg-slate-600 border border-slate-600'
                                : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200 shadow-sm'
                              : 'opacity-30 cursor-not-allowed ' + (theme === 'dark' ? 'bg-slate-800 text-slate-600 border border-slate-700' : 'bg-slate-100 text-slate-400 border border-slate-200')
                          }`}
                        >
                          −
                        </button>

                        {/* Centre Display Ring */}
                        <div className="relative">
                          <div className={`w-24 h-24 sm:w-32 sm:h-32 rounded-full flex items-center justify-center transition-all duration-500 ${
                            taxSettings.enabled
                              ? 'bg-gradient-to-br from-emerald-500/10 to-teal-500/10 ring-2 ring-emerald-500/30'
                              : theme === 'dark' ? 'bg-slate-800/50 ring-1 ring-slate-700' : 'bg-slate-100 ring-1 ring-slate-200'
                          }`}
                            style={taxSettings.enabled ? {
                              boxShadow: '0 0 40px -8px rgba(16,185,129,0.2), inset 0 0 30px -8px rgba(16,185,129,0.08)'
                            } : {}}
                          >
                            <div className="text-center">
                              <div className={`text-3xl sm:text-5xl font-black tracking-tight leading-none ${
                                taxSettings.enabled
                                  ? theme === 'dark' ? 'text-emerald-400' : 'text-emerald-600'
                                  : theme === 'dark' ? 'text-slate-600' : 'text-slate-400'
                              }`}>
                                {taxSettings.defaultPercentage}
                              </div>
                              <div className={`text-[10px] sm:text-xs font-bold uppercase tracking-widest mt-0.5 ${
                                taxSettings.enabled
                                  ? theme === 'dark' ? 'text-emerald-500/70' : 'text-emerald-500'
                                  : theme === 'dark' ? 'text-slate-600' : 'text-slate-400'
                              }`}>
                                % Tax
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Plus Button */}
                        <button
                          onClick={() => {
                            const val = Math.min(30, taxSettings.defaultPercentage + 0.5);
                            updateTaxSettings({ defaultPercentage: val });
                            setTaxHasChanges(true);
                          }}
                          disabled={!taxSettings.enabled || taxSettings.defaultPercentage >= 30}
                          className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl flex items-center justify-center text-xl font-bold transition-all active:scale-90 ${
                            taxSettings.enabled && taxSettings.defaultPercentage < 30
                              ? theme === 'dark'
                                ? 'bg-slate-700/70 text-slate-200 hover:bg-slate-600 border border-slate-600'
                                : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200 shadow-sm'
                              : 'opacity-30 cursor-not-allowed ' + (theme === 'dark' ? 'bg-slate-800 text-slate-600 border border-slate-700' : 'bg-slate-100 text-slate-400 border border-slate-200')
                          }`}
                        >
                          +
                        </button>
                      </div>

                      {/* Quick Preset Chips */}
                      <div className="flex flex-wrap items-center justify-center gap-2 mt-4 sm:mt-5">
                        {[5, 8, 12, 15, 18].map(percentage => (
                          <button
                            key={percentage}
                            onClick={() => {
                              updateTaxSettings({ defaultPercentage: percentage });
                              setTaxHasChanges(true);
                            }}
                            disabled={!taxSettings.enabled}
                            className={`px-3.5 sm:px-4 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm font-semibold transition-all duration-200 ${
                              taxSettings.enabled
                                ? taxSettings.defaultPercentage === percentage
                                  ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-lg shadow-emerald-500/30 scale-105'
                                  : theme === 'dark'
                                    ? 'bg-slate-700/50 text-slate-300 hover:bg-slate-600/70 border border-slate-600/80 hover:border-emerald-500/40'
                                    : 'bg-white text-slate-600 hover:bg-emerald-50 border border-slate-200 hover:border-emerald-300'
                                : theme === 'dark'
                                  ? 'bg-slate-800/30 text-slate-600 border border-slate-700/40 cursor-not-allowed'
                                  : 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed'
                            }`}
                          >
                            {percentage}%
                          </button>
                        ))}
                      </div>

                      {/* Info Box */}
                      {taxSettings.enabled && (
                        <div className={`mt-4 p-3 rounded-xl flex items-start gap-3 ${
                          theme === 'dark' ? 'bg-emerald-500/10 border border-emerald-500/20' : 'bg-emerald-50 border border-emerald-200'
                        }`}>
                          <Info className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-500 flex-shrink-0 mt-0.5" />
                          <p className={`text-[11px] sm:text-xs leading-relaxed ${
                            theme === 'dark' ? 'text-emerald-400/80' : 'text-emerald-700'
                          }`}>
                            Default tax for all new invoices. Adjustable per invoice during creation.
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Profile Tab */}
        {activeTab === 'profile' && (
          <div className="space-y-6 animate-in fade-in duration-300">
            {/* Branding Section - Logo, Shop Details & Live Preview */}
            {canViewBusinessSettings && (
              <ShopBrandingTab />
            )}
          </div>
        )}

        {/* Notifications Tab */}
        {activeTab === 'notifications' && (
          <div className="space-y-4 sm:space-y-6 animate-in fade-in duration-300">
            <div className={`rounded-2xl sm:rounded-3xl border p-3 sm:p-6 ${
              theme === 'dark' 
                ? 'bg-gradient-to-br from-slate-800/80 to-slate-900/80 border-slate-700/50 backdrop-blur-xl' 
                : 'bg-white border-slate-200 shadow-xl shadow-slate-200/50'
            }`}>
              <div className="flex items-center gap-2.5 sm:gap-3 mb-4 sm:mb-6">
                <div className="w-9 h-9 sm:w-12 sm:h-12 bg-gradient-to-br from-amber-500/20 to-orange-500/20 rounded-lg sm:rounded-xl flex items-center justify-center flex-shrink-0">
                  <Bell className="w-4 h-4 sm:w-6 sm:h-6 text-amber-500" />
                </div>
                <div className="min-w-0">
                  <h3 className={`text-sm sm:text-base font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                    Notification Preferences
                  </h3>
                  <p className={`text-xs sm:text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                    Control how you receive notifications
                  </p>
                </div>
              </div>
              
              <div className="space-y-2 sm:space-y-4">
                {[
                  { label: 'Email Notifications', desc: 'Receive updates via email', icon: Mail, enabled: true },
                  { label: 'Low Stock Alerts', desc: 'Get notified when stock is low', icon: AlertCircle, enabled: true },
                  { label: 'Invoice Reminders', desc: 'Automatic payment reminders', icon: Clock, enabled: true },
                  { label: 'Desktop Notifications', desc: 'Browser push notifications', icon: Laptop, enabled: false },
                  { label: 'Mobile Notifications', desc: 'Push notifications on mobile', icon: Smartphone, enabled: false },
                ].map((item) => {
                  const Icon = item.icon;
                  return (
                    <div 
                      key={item.label}
                      className={`flex items-center justify-between p-2.5 sm:p-4 rounded-lg sm:rounded-xl transition-all gap-3 ${
                        theme === 'dark' ? 'bg-slate-800/50 hover:bg-slate-800' : 'bg-slate-50 hover:bg-slate-100'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 sm:gap-4 min-w-0">
                        <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                          theme === 'dark' ? 'bg-slate-700' : 'bg-white shadow'
                        }`}>
                          <Icon className={`w-4 h-4 sm:w-5 sm:h-5 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`} />
                        </div>
                        <div className="min-w-0">
                          <p className={`text-xs sm:text-sm font-medium truncate ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                            {item.label}
                          </p>
                          <p className={`text-[10px] sm:text-sm truncate ${theme === 'dark' ? 'text-slate-500' : 'text-slate-500'}`}>
                            {item.desc}
                          </p>
                        </div>
                      </div>
                      <button className={`relative w-11 h-6 sm:w-14 sm:h-8 rounded-full transition-all duration-300 flex-shrink-0 ${
                        item.enabled 
                          ? 'bg-gradient-to-r from-amber-500 to-orange-500' 
                          : theme === 'dark' ? 'bg-slate-700' : 'bg-slate-300'
                      }`}>
                        <div className={`absolute top-0.5 sm:top-1 w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-white transition-all duration-300 ${
                          item.enabled ? 'translate-x-[1.25rem] sm:translate-x-7' : 'translate-x-0.5 sm:translate-x-1'
                        }`} />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Invoice Settings Tab */}
        {activeTab === 'invoice' && (
          <div className="space-y-4 sm:space-y-6 animate-in fade-in duration-300">
            {/* Enable/Disable Card */}
            <div className={`rounded-2xl sm:rounded-3xl border overflow-hidden ${
              theme === 'dark' 
                ? 'bg-gradient-to-br from-slate-800/80 to-slate-900/80 border-slate-700/50 backdrop-blur-xl' 
                : 'bg-white border-slate-200 shadow-xl shadow-slate-200/50'
            }`}>
              <div className="relative h-16 sm:h-24 bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600">
                <div className="absolute inset-0 flex items-center px-3 sm:px-6">
                  <div className="flex items-center gap-2.5 sm:gap-4 flex-1 min-w-0">
                    <div className="w-9 h-9 sm:w-14 sm:h-14 bg-white/20 backdrop-blur rounded-xl sm:rounded-2xl flex items-center justify-center flex-shrink-0">
                      <MessageCircle className="w-4 h-4 sm:w-8 sm:h-8 text-white" />
                    </div>
                    <div className="min-w-0">
                      <h2 className="text-sm sm:text-xl font-bold text-white truncate">WhatsApp Reminder Templates</h2>
                      <p className="text-blue-100 text-[10px] sm:text-sm truncate">Customize payment reminder messages</p>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      updateSettings({ enabled: !whatsAppSettings.enabled });
                      setInvoiceTemplatesHasChanges(true);
                    }}
                    className={`relative w-20 h-10 rounded-full transition-all duration-300 ${
                      whatsAppSettings.enabled 
                        ? 'bg-white/30' 
                        : 'bg-black/20'
                    }`}
                  >
                    <div className={`absolute top-1 w-8 h-8 rounded-full transition-all duration-300 flex items-center justify-center ${
                      whatsAppSettings.enabled 
                        ? 'translate-x-11 bg-white' 
                        : 'translate-x-1 bg-white/60'
                    }`}>
                      {whatsAppSettings.enabled ? (
                        <Check className="w-5 h-5 text-blue-600" />
                      ) : (
                        <span className="w-5 h-5" />
                      )}
                    </div>
                  </button>
                </div>
              </div>

              {whatsAppSettings.enabled && (
                <div className="p-6 space-y-6">
                  {/* Placeholders Card */}
                  <div className={`rounded-2xl p-4 ${
                    theme === 'dark' ? 'bg-slate-800/50' : 'bg-gradient-to-r from-blue-50 to-indigo-50'
                  }`}>
                    <div className="flex items-center gap-2 mb-4">
                      <Info className="w-5 h-5 text-blue-500" />
                      <span className={`font-semibold ${theme === 'dark' ? 'text-white' : 'text-slate-800'}`}>
                        Available Placeholders
                      </span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        theme === 'dark' ? 'bg-blue-500/20 text-blue-400' : 'bg-blue-100 text-blue-700'
                      }`}>
                        Click to copy
                      </span>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                      {placeholders.map(({ key, desc }) => (
                        <button
                          key={key}
                          onClick={() => copyPlaceholder(key)}
                          className={`group relative flex flex-col items-start px-3 py-2 rounded-xl text-sm font-mono transition-all ${
                            copiedPlaceholder === key
                              ? 'bg-blue-500 text-white scale-95'
                              : theme === 'dark' 
                                ? 'bg-slate-700/50 text-blue-400 hover:bg-slate-700 hover:scale-[1.02]' 
                                : 'bg-white text-blue-600 hover:shadow-md hover:scale-[1.02] border border-blue-200'
                          }`}
                        >
                          <div className="flex items-center gap-1.5 w-full">
                            {copiedPlaceholder === key ? (
                              <>
                                <Check className="w-3.5 h-3.5" /> 
                                <span className="text-xs">Copied!</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-3.5 h-3.5 opacity-50 group-hover:opacity-100" />
                                <span className="text-xs truncate">{key}</span>
                              </>
                            )}
                          </div>
                          <span className={`text-[10px] mt-0.5 ${
                            copiedPlaceholder === key ? 'text-blue-100' : 'text-slate-500'
                          }`}>
                            {desc}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Formatting Tip */}
                  <div className={`flex items-start gap-3 p-4 rounded-xl border ${
                    theme === 'dark' 
                      ? 'bg-blue-500/10 border-blue-500/20' 
                      : 'bg-blue-50 border-blue-200'
                  }`}>
                    <Info className={`w-5 h-5 mt-0.5 ${theme === 'dark' ? 'text-blue-400' : 'text-blue-600'}`} />
                    <div className={`text-sm ${theme === 'dark' ? 'text-blue-300' : 'text-blue-700'}`}>
                      <p className="font-medium mb-1">💡 Formatting Tips for WhatsApp:</p>
                      <ul className="space-y-1 text-xs opacity-90">
                        <li>• Press <kbd className="px-1.5 py-0.5 rounded bg-white/20 dark:bg-black/20 font-mono text-[10px]">Enter</kbd> for new lines - they will appear in WhatsApp</li>
                        <li>• Use <code className="px-1 rounded bg-white/20 dark:bg-black/20">*text*</code> for <strong>bold text</strong></li>
                        <li>• Use <code className="px-1 rounded bg-white/20 dark:bg-black/20">_text_</code> for <em>italic text</em></li>
                        <li>• Add emojis for visual appeal 🎉</li>
                        <li>• Click <strong>Reset</strong> button to restore properly formatted default template</li>
                      </ul>
                    </div>
                  </div>

                  {/* Template Tabs */}
                  <div className="flex gap-2 p-1 rounded-xl bg-slate-100 dark:bg-slate-800/50">
                    <button
                      onClick={() => setPreviewType('payment')}
                      className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg font-medium transition-all ${
                        previewType === 'payment'
                          ? 'bg-white dark:bg-slate-700 shadow-sm text-blue-600 dark:text-blue-400'
                          : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                      }`}
                    >
                      💳 Payment Reminder
                    </button>
                    <button
                      onClick={() => setPreviewType('overdue')}
                      className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg font-medium transition-all ${
                        previewType === 'overdue'
                          ? 'bg-white dark:bg-slate-700 shadow-sm text-amber-600 dark:text-amber-400'
                          : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                      }`}
                    >
                      ⚠️ Overdue Reminder
                    </button>
                  </div>

                  {/* Template Editor with Preview */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Editor */}
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <label className={`font-medium ${theme === 'dark' ? 'text-white' : 'text-slate-800'}`}>
                          {previewType === 'payment' ? '💳 Payment Reminder Template' : '⚠️ Overdue Reminder Template'}
                        </label>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => {
                              if (confirm('Reset this template to the default? Your current template will be replaced.')) {
                                resetToDefaults();
                                setInvoiceTemplatesHasChanges(true);
                              }
                            }}
                            className={`flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg transition-all ${
                              theme === 'dark' ? 'bg-amber-500/20 text-amber-400 hover:bg-amber-500/30' : 'bg-amber-100 text-amber-700 hover:bg-amber-200'
                            }`}
                            title="Reset to default template with proper formatting"
                          >
                            <RotateCcw className="w-4 h-4" />
                            Reset
                          </button>
                          <button
                            onClick={() => setShowPreview(!showPreview)}
                            className={`flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg transition-all lg:hidden ${
                              theme === 'dark' ? 'bg-slate-700 text-slate-300 hover:bg-slate-600' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                            }`}
                          >
                            {showPreview ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            {showPreview ? 'Hide' : 'Show'} Preview
                          </button>
                        </div>
                      </div>
                      <textarea
                        value={previewType === 'payment' ? whatsAppSettings.paymentReminderTemplate : whatsAppSettings.overdueReminderTemplate}
                        onChange={(e) => {
                          updateSettings(previewType === 'payment' ? { paymentReminderTemplate: e.target.value } : { overdueReminderTemplate: e.target.value });
                          setInvoiceTemplatesHasChanges(true);
                        }}
                        rows={16}
                        className={`w-full px-4 py-3 rounded-xl border font-mono text-sm leading-relaxed transition-all resize-none whitespace-pre-wrap ${
                          theme === 'dark' 
                            ? 'bg-slate-800/50 border-slate-700 text-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20' 
                            : 'bg-white border-slate-200 text-slate-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20'
                        }`}
                        placeholder="Enter your reminder message template..."
                      />
                    </div>

                    {/* Live Preview */}
                    <div className={`${showPreview ? 'block' : 'hidden'} lg:block`}>
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <Eye className={`w-4 h-4 ${theme === 'dark' ? 'text-blue-400' : 'text-blue-600'}`} />
                          <span className={`font-medium ${theme === 'dark' ? 'text-white' : 'text-slate-800'}`}>
                            Live Preview
                          </span>
                          <span className={`text-xs px-2 py-0.5 rounded-full ${
                            theme === 'dark' ? 'bg-blue-500/20 text-blue-400' : 'bg-blue-100 text-blue-700'
                          }`}>
                            Auto-filled with your shop details
                          </span>
                        </div>
                      </div>
                      
                      {/* Shop Branding Preview Info - Always show with available data */}
                      <div className={`mb-3 p-3 rounded-xl border ${
                        theme === 'dark' ? 'bg-slate-800/50 border-slate-700/50' : 'bg-slate-50 border-slate-200'
                      }`}>
                        <p className={`text-xs font-medium mb-2 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                          📌 Your shop details that will appear in the message:
                        </p>
                        <div className="flex flex-wrap gap-2">
                          <span className={`text-xs px-2 py-1 rounded-md ${theme === 'dark' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-emerald-100 text-emerald-700'}`}>
                            🏪 {effectiveShopName}
                          </span>
                          <span className={`text-xs px-2 py-1 rounded-md ${theme === 'dark' ? 'bg-blue-500/20 text-blue-400' : 'bg-blue-100 text-blue-700'}`}>
                            📞 {effectiveShopPhone}
                          </span>
                          <span className={`text-xs px-2 py-1 rounded-md ${theme === 'dark' ? 'bg-purple-500/20 text-purple-400' : 'bg-purple-100 text-purple-700'}`}>
                            📍 {effectiveShopAddress}
                          </span>
                        </div>
                      </div>
                      
                      {/* WhatsApp Style Preview */}
                      <div className="bg-[#0B141A] rounded-2xl overflow-hidden shadow-2xl">
                        {/* WhatsApp Header */}
                        <div className="bg-[#202C33] px-4 py-3 flex items-center gap-3">
                          <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-full flex items-center justify-center text-white font-bold text-sm">
                            JD
                          </div>
                          <div className="flex-1">
                            <p className="text-white font-medium text-sm">John Doe</p>
                            <p className="text-green-400 text-xs">online</p>
                          </div>
                        </div>
                        
                        {/* Chat Background */}
                        <div className="p-4 min-h-[300px] max-h-[400px] overflow-y-auto" style={{
                          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.03'%3E%3Ccircle cx='30' cy='30' r='2'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
                          backgroundColor: '#0B141A'
                        }}>
                          {/* Message Bubble */}
                          <div className="max-w-[85%] ml-auto">
                            <div className="bg-[#005C4B] rounded-xl rounded-tr-sm px-3 py-2 text-white text-sm whitespace-pre-wrap leading-relaxed">
                              {generatePreview(previewType === 'payment' ? whatsAppSettings.paymentReminderTemplate : whatsAppSettings.overdueReminderTemplate)}
                              <div className="flex items-center justify-end gap-1 mt-1">
                                <span className="text-[10px] text-green-200/70">
                                  {new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                                </span>
                                <CheckCircle2 className="w-3.5 h-3.5 text-blue-400" />
                              </div>
                            </div>
                          </div>
                        </div>
                        
                        {/* Input Bar */}
                        <div className="bg-[#202C33] px-4 py-3 flex items-center gap-3">
                          <div className="flex-1 bg-[#2A3942] rounded-full px-4 py-2.5 text-slate-400 text-sm">
                            Type a message
                          </div>
                          <div className="w-10 h-10 bg-[#00A884] rounded-full flex items-center justify-center">
                            <SendHorizontal className="w-5 h-5 text-white" />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                </div>
              )}

              {!whatsAppSettings.enabled && (
                <div className="p-8 text-center">
                  <div className={`w-20 h-20 mx-auto mb-4 rounded-2xl flex items-center justify-center ${
                    theme === 'dark' ? 'bg-slate-800' : 'bg-slate-100'
                  }`}>
                    <MessageCircle className={`w-10 h-10 ${theme === 'dark' ? 'text-slate-600' : 'text-slate-400'}`} />
                  </div>
                  <h3 className={`text-lg font-semibold mb-2 ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                    WhatsApp Reminders Disabled
                  </h3>
                  <p className={`text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                    Enable WhatsApp reminders to customize message templates and send payment reminders to customers.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ========== GRN SETTINGS TAB ========== */}
        {activeTab === 'grn' && canViewBusinessSettings && (
          <div className="space-y-4 sm:space-y-6 animate-in fade-in duration-300">
            {/* ========== GRN REMINDER TEMPLATES ========== */}
            <div className={`rounded-2xl sm:rounded-3xl border overflow-hidden ${
              theme === 'dark' 
                ? 'bg-gradient-to-br from-slate-800/80 to-slate-900/80 border-slate-700/50 backdrop-blur-xl' 
                : 'bg-white border-slate-200 shadow-xl shadow-slate-200/50'
            }`}>
              <div className="relative h-16 sm:h-24 bg-gradient-to-r from-teal-600 via-emerald-600 to-teal-600">
                <div className="absolute inset-0 flex items-center px-3 sm:px-6">
                  <div className="flex items-center gap-2.5 sm:gap-4 flex-1 min-w-0">
                    <div className="w-9 h-9 sm:w-14 sm:h-14 bg-white/20 backdrop-blur rounded-xl sm:rounded-2xl flex items-center justify-center flex-shrink-0">
                      <Package className="w-4 h-4 sm:w-8 sm:h-8 text-white" />
                    </div>
                    <div className="min-w-0">
                      <h2 className="text-sm sm:text-xl font-bold text-white truncate">GRN Reminder Templates</h2>
                      <p className="text-emerald-100 text-[10px] sm:text-sm truncate">WhatsApp payment reminders for suppliers</p>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      updateSettings({ grnReminderEnabled: !whatsAppSettings.grnReminderEnabled });
                      setGrnTemplatesHasChanges(true);
                    }}
                    className={`relative w-20 h-10 rounded-full transition-all duration-300 ${
                      whatsAppSettings.grnReminderEnabled 
                        ? 'bg-white/30' 
                        : 'bg-black/20'
                    }`}
                  >
                    <div className={`absolute top-1 w-8 h-8 rounded-full transition-all duration-300 flex items-center justify-center ${
                      whatsAppSettings.grnReminderEnabled 
                        ? 'translate-x-11 bg-white' 
                        : 'translate-x-1 bg-white/60'
                    }`}>
                      {whatsAppSettings.grnReminderEnabled ? (
                        <Check className="w-5 h-5 text-emerald-600" />
                      ) : (
                        <span className="w-5 h-5" />
                      )}
                    </div>
                  </button>
                </div>
              </div>

              {whatsAppSettings.grnReminderEnabled && (
                <div className="p-6 space-y-6">
                  {/* GRN Placeholders */}
                  <div className={`rounded-2xl p-4 ${
                    theme === 'dark' ? 'bg-slate-800/50' : 'bg-gradient-to-r from-teal-50 to-emerald-50'
                  }`}>
                    <div className="flex items-center gap-2 mb-3">
                      <Info className="w-5 h-5 text-emerald-500" />
                      <span className={`font-semibold ${theme === 'dark' ? 'text-white' : 'text-slate-800'}`}>
                        GRN Template Placeholders
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {[
                        { key: '{{grnNumber}}', desc: 'GRN reference number' },
                        { key: '{{supplierName}}', desc: 'Supplier name' },
                        { key: '{{totalAmount}}', desc: 'Total GRN amount' },
                        { key: '{{paidAmount}}', desc: 'Amount paid' },
                        { key: '{{balanceDue}}', desc: 'Remaining balance' },
                        { key: '{{grnDate}}', desc: 'GRN date' },
                        { key: '{{shopName}}', desc: 'Your shop name' },
                        { key: '{{shopPhone}}', desc: 'Shop phone' },
                        { key: '{{shopAddress}}', desc: 'Shop address' },
                      ].map(({ key }) => (
                        <button
                          key={key}
                          onClick={() => copyPlaceholder(key)}
                          className={`px-2.5 py-1.5 rounded-lg text-xs font-mono transition-all ${
                            copiedPlaceholder === key
                              ? 'bg-emerald-500 text-white'
                              : theme === 'dark' 
                                ? 'bg-slate-700/50 text-emerald-400 hover:bg-slate-700' 
                                : 'bg-white text-emerald-600 hover:bg-emerald-100 border border-emerald-200'
                          }`}
                        >
                          {copiedPlaceholder === key ? '✓ Copied!' : key}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Template Tabs */}
                  <div className="flex gap-2 p-1 rounded-xl bg-slate-100 dark:bg-slate-800/50">
                    <button
                      onClick={() => setGrnPreviewType('payment')}
                      className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg font-medium transition-all ${
                        grnPreviewType === 'payment'
                          ? 'bg-white dark:bg-slate-700 shadow-sm text-emerald-600 dark:text-emerald-400'
                          : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                      }`}
                    >
                      💳 Payment Reminder
                    </button>
                    <button
                      onClick={() => setGrnPreviewType('overdue')}
                      className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg font-medium transition-all ${
                        grnPreviewType === 'overdue'
                          ? 'bg-white dark:bg-slate-700 shadow-sm text-amber-600 dark:text-amber-400'
                          : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                      }`}
                    >
                      📋 Balance Reminder
                    </button>
                  </div>

                  {/* Template Editor with Preview */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Editor */}
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <label className={`font-medium ${theme === 'dark' ? 'text-white' : 'text-slate-800'}`}>
                          {grnPreviewType === 'payment' ? '💳 GRN Payment Reminder' : '📋 GRN Balance Reminder'}
                        </label>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => {
                              if (confirm('Reset GRN templates to defaults?')) {
                                resetGrnToDefaults();
                                setGrnTemplatesHasChanges(true);
                              }
                            }}
                            className={`flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg transition-all ${
                              theme === 'dark' ? 'bg-amber-500/20 text-amber-400 hover:bg-amber-500/30' : 'bg-amber-100 text-amber-700 hover:bg-amber-200'
                            }`}
                          >
                            <RotateCcw className="w-4 h-4" />
                            Reset
                          </button>
                          <button
                            onClick={() => setShowGrnPreview(!showGrnPreview)}
                            className={`flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg transition-all lg:hidden ${
                              theme === 'dark' ? 'bg-slate-700 text-slate-300 hover:bg-slate-600' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                            }`}
                          >
                            {showGrnPreview ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            {showGrnPreview ? 'Hide' : 'Show'} Preview
                          </button>
                        </div>
                      </div>
                      <textarea
                        value={grnPreviewType === 'payment' ? whatsAppSettings.grnPaymentReminderTemplate : whatsAppSettings.grnOverdueReminderTemplate}
                        onChange={(e) => {
                          updateSettings(grnPreviewType === 'payment' ? { grnPaymentReminderTemplate: e.target.value } : { grnOverdueReminderTemplate: e.target.value });
                          setGrnTemplatesHasChanges(true);
                        }}
                        rows={16}
                        className={`w-full px-4 py-3 rounded-xl border font-mono text-sm leading-relaxed transition-all resize-none whitespace-pre-wrap ${
                          theme === 'dark' 
                            ? 'bg-slate-800/50 border-slate-700 text-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20' 
                            : 'bg-white border-slate-200 text-slate-900 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20'
                        }`}
                        placeholder="Enter your GRN reminder message template..."
                      />
                    </div>

                    {/* Live Preview */}
                    <div className={`${showGrnPreview ? 'block' : 'hidden'} lg:block`}>
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <Eye className={`w-4 h-4 ${theme === 'dark' ? 'text-emerald-400' : 'text-emerald-600'}`} />
                          <span className={`font-medium ${theme === 'dark' ? 'text-white' : 'text-slate-800'}`}>
                            Live Preview
                          </span>
                          <span className={`text-xs px-2 py-0.5 rounded-full ${
                            theme === 'dark' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-emerald-100 text-emerald-700'
                          }`}>
                            Auto-filled with sample data
                          </span>
                        </div>
                      </div>
                      
                      {/* Supplier Info Preview */}
                      <div className={`mb-3 p-3 rounded-xl border ${
                        theme === 'dark' ? 'bg-slate-800/50 border-slate-700/50' : 'bg-slate-50 border-slate-200'
                      }`}>
                        <p className={`text-xs font-medium mb-2 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                          📌 Sample supplier details for preview:
                        </p>
                        <div className="flex flex-wrap gap-2">
                          <span className={`text-xs px-2 py-1 rounded-md ${theme === 'dark' ? 'bg-teal-500/20 text-teal-400' : 'bg-teal-100 text-teal-700'}`}>
                            🏭 {grnPreviewData.supplierName}
                          </span>
                          <span className={`text-xs px-2 py-1 rounded-md ${theme === 'dark' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-emerald-100 text-emerald-700'}`}>
                            📋 {grnPreviewData.grnNumber}
                          </span>
                          <span className={`text-xs px-2 py-1 rounded-md ${theme === 'dark' ? 'bg-amber-500/20 text-amber-400' : 'bg-amber-100 text-amber-700'}`}>
                            💰 Rs. {grnPreviewData.balanceDue}
                          </span>
                        </div>
                      </div>
                      
                      {/* WhatsApp Style Preview */}
                      <div className="bg-[#0B141A] rounded-2xl overflow-hidden shadow-2xl">
                        {/* WhatsApp Header */}
                        <div className="bg-[#202C33] px-4 py-3 flex items-center gap-3">
                          <div className="w-10 h-10 bg-gradient-to-br from-teal-500 to-emerald-600 rounded-full flex items-center justify-center text-white font-bold text-sm">
                            HP
                          </div>
                          <div className="flex-1">
                            <p className="text-white font-medium text-sm">{grnPreviewData.supplierName}</p>
                            <p className="text-green-400 text-xs">online</p>
                          </div>
                        </div>
                        
                        {/* Chat Background */}
                        <div className="p-4 min-h-[300px] max-h-[400px] overflow-y-auto" style={{
                          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.03'%3E%3Ccircle cx='30' cy='30' r='2'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
                          backgroundColor: '#0B141A'
                        }}>
                          {/* Message Bubble */}
                          <div className="max-w-[85%] ml-auto">
                            <div className="bg-[#005C4B] rounded-xl rounded-tr-sm px-3 py-2 text-white text-sm whitespace-pre-wrap leading-relaxed">
                              {generateGrnPreview(grnPreviewType === 'payment' ? whatsAppSettings.grnPaymentReminderTemplate : whatsAppSettings.grnOverdueReminderTemplate)}
                              <div className="flex items-center justify-end gap-1 mt-1">
                                <span className="text-[10px] text-green-200/70">
                                  {new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                                </span>
                                <CheckCircle2 className="w-3.5 h-3.5 text-blue-400" />
                              </div>
                            </div>
                          </div>
                        </div>
                        
                        {/* Input Bar */}
                        <div className="bg-[#202C33] px-4 py-3 flex items-center gap-3">
                          <div className="flex-1 bg-[#2A3942] rounded-full px-4 py-2.5 text-slate-400 text-sm">
                            Type a message
                          </div>
                          <div className="w-10 h-10 bg-[#00A884] rounded-full flex items-center justify-center">
                            <SendHorizontal className="w-5 h-5 text-white" />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                </div>
              )}

              {!whatsAppSettings.grnReminderEnabled && (
                <div className="p-8 text-center">
                  <div className={`w-20 h-20 mx-auto mb-4 rounded-2xl flex items-center justify-center ${
                    theme === 'dark' ? 'bg-slate-800' : 'bg-slate-100'
                  }`}>
                    <Package className={`w-10 h-10 ${theme === 'dark' ? 'text-slate-600' : 'text-slate-400'}`} />
                  </div>
                  <h3 className={`text-lg font-semibold mb-2 ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                    GRN Reminders Disabled
                  </h3>
                  <p className={`text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                    Enable GRN reminders to send payment reminders and balance notifications to suppliers.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ========== SUPPLIER ORDERS TAB ========== */}
        {activeTab === 'supplierOrders' && canViewBusinessSettings && (
          <div className="space-y-6 animate-in fade-in duration-300">
            {/* Creative Header with Orange Gradient */}
            <div className={`relative overflow-hidden rounded-2xl sm:rounded-3xl border ${theme === 'dark' ? 'bg-gradient-to-br from-orange-900/30 via-slate-800/50 to-amber-900/30 border-orange-500/20' : 'bg-gradient-to-br from-orange-50 via-white to-amber-50 border-orange-200 shadow-xl'}`}>
              <div className="absolute top-0 right-0 w-40 sm:w-64 h-40 sm:h-64 bg-gradient-to-br from-orange-500/20 to-amber-500/10 rounded-full blur-3xl -translate-y-32 translate-x-32" />
              <div className="absolute bottom-0 left-0 w-32 sm:w-48 h-32 sm:h-48 bg-gradient-to-tr from-yellow-500/10 to-orange-500/10 rounded-full blur-3xl translate-y-24 -translate-x-24" />
              <div className="relative p-3 sm:p-4 md:p-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-6">
                  <div className="flex items-start gap-3 sm:gap-4">
                    <div className="p-2.5 sm:p-3 md:p-4 rounded-xl sm:rounded-2xl bg-gradient-to-br from-orange-500 to-amber-600 shadow-lg shadow-orange-500/30">
                      <Truck className="w-5 h-5 sm:w-6 sm:h-6 md:w-8 md:h-8 text-white" />
                    </div>
                    <div className="min-w-0">
                      <h2 className={`text-base sm:text-xl md:text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                        Supplier Order Template
                      </h2>
                      <p className={`text-xs sm:text-sm mt-0.5 sm:mt-1 line-clamp-2 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                        Customize the WhatsApp message template for placing orders with suppliers
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 sm:gap-3">
                    <button
                      onClick={() => {
                        updateSettings({ supplierOrderTemplate: defaultTemplates.supplierOrder });
                        setSupplierOrderTemplateHasChanges(false);
                        toast.success('Template reset to default');
                      }}
                      className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl text-xs sm:text-sm font-medium transition-all ${
                        theme === 'dark'
                          ? 'bg-slate-700/50 text-slate-300 hover:bg-slate-600/50'
                          : 'bg-white/80 text-slate-700 hover:bg-white shadow-sm'
                      }`}
                    >
                      <RotateCcw className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                      <span className="hidden sm:inline">Reset Default</span>
                      <span className="sm:hidden">Reset</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Available Placeholders Card */}
            <div className={`rounded-xl sm:rounded-2xl border overflow-hidden ${
              theme === 'dark' ? 'bg-slate-800/50 border-slate-700/50' : 'bg-white border-slate-200 shadow-lg'
            }`}>
              <div className={`px-3 sm:px-4 md:px-6 py-3 sm:py-4 border-b ${theme === 'dark' ? 'border-slate-700/50 bg-slate-800/30' : 'border-slate-100 bg-slate-50'}`}>
                <div className="flex items-center gap-2 sm:gap-3">
                  <div className="p-1.5 sm:p-2 rounded-lg bg-gradient-to-br from-orange-500/20 to-amber-500/20">
                    <Info className={`w-4 h-4 sm:w-5 sm:h-5 ${theme === 'dark' ? 'text-orange-400' : 'text-orange-600'}`} />
                  </div>
                  <div className="min-w-0">
                    <h3 className={`text-sm sm:text-base font-semibold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                      Available Placeholders
                    </h3>
                    <p className={`text-[10px] sm:text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                      Click to copy • These will be replaced with actual values
                    </p>
                  </div>
                </div>
              </div>
              <div className="p-3 sm:p-4 md:p-6">
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {[
                    { key: 'supplierName', label: 'Supplier Name', desc: 'Contact person name' },
                    { key: 'supplierCompany', label: 'Supplier Company', desc: 'Company/business name' },
                    { key: 'orderDate', label: 'Order Date', desc: 'Current date' },
                    { key: 'shopName', label: 'Shop Name', desc: 'Your business name' },
                    { key: 'shopPhone', label: 'Shop Phone', desc: 'Your contact number' },
                    { key: 'shopAddress', label: 'Shop Address', desc: 'Your business address' },
                  ].map(({ key, label, desc }) => (
                    <button
                      key={key}
                      onClick={() => {
                        navigator.clipboard.writeText(`{{${key}}}`);
                        setCopiedPlaceholder(key);
                        setTimeout(() => setCopiedPlaceholder(null), 2000);
                        toast.success(`Copied {{${key}}}`);
                      }}
                      className={`relative group p-3 rounded-xl border text-left transition-all ${
                        copiedPlaceholder === key
                          ? theme === 'dark'
                            ? 'bg-orange-500/20 border-orange-500/50'
                            : 'bg-orange-50 border-orange-300'
                          : theme === 'dark'
                            ? 'bg-slate-700/50 border-slate-600/50 hover:border-orange-500/50 hover:bg-slate-700'
                            : 'bg-slate-50 border-slate-200 hover:border-orange-300 hover:bg-orange-50'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className={`text-xs font-mono ${theme === 'dark' ? 'text-orange-400' : 'text-orange-600'}`}>
                          {`{{${key}}}`}
                        </span>
                        {copiedPlaceholder === key ? (
                          <Check className="w-3.5 h-3.5 text-orange-500" />
                        ) : (
                          <Copy className={`w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`} />
                        )}
                      </div>
                      <p className={`text-xs font-medium ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>{label}</p>
                      <p className={`text-[10px] ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>{desc}</p>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Template Editor & Preview Card */}
            <div className={`rounded-xl sm:rounded-2xl border overflow-hidden ${
              theme === 'dark' ? 'bg-slate-800/50 border-slate-700/50' : 'bg-white border-slate-200 shadow-lg'
            }`}>
              <div className={`px-3 sm:px-4 md:px-6 py-3 sm:py-4 border-b ${theme === 'dark' ? 'border-slate-700/50 bg-slate-800/30' : 'border-slate-100 bg-slate-50'}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 sm:gap-3">
                    <div className="p-1.5 sm:p-2 rounded-lg bg-gradient-to-br from-orange-500/20 to-amber-500/20">
                      <MessageCircle className={`w-4 h-4 sm:w-5 sm:h-5 ${theme === 'dark' ? 'text-orange-400' : 'text-orange-600'}`} />
                    </div>
                    <div className="min-w-0">
                      <h3 className={`text-sm sm:text-base font-semibold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                        Order Message Template
                      </h3>
                      <p className={`text-[10px] sm:text-xs hidden sm:block ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                        This message will be sent when you click "Place Order" on a supplier
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowSupplierPreview(!showSupplierPreview)}
                    className={`flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg transition-all lg:hidden ${
                      theme === 'dark' ? 'bg-slate-700 text-slate-300 hover:bg-slate-600' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {showSupplierPreview ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    {showSupplierPreview ? 'Hide' : 'Show'} Preview
                  </button>
                </div>
              </div>
              <div className="p-3 sm:p-4 md:p-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
                  {/* Editor */}
                  <div>
                    <textarea
                      value={whatsAppSettings.supplierOrderTemplate}
                      onChange={(e) => {
                        updateSettings({ supplierOrderTemplate: e.target.value });
                        setSupplierOrderTemplateHasChanges(true);
                      }}
                      rows={16}
                      className={`w-full px-4 py-3 rounded-xl border font-mono text-sm resize-none transition-all ${
                        theme === 'dark'
                          ? 'bg-slate-900/50 border-slate-600/50 text-slate-200 placeholder-slate-500 focus:border-orange-500/50 focus:ring-2 focus:ring-orange-500/20'
                          : 'bg-slate-50 border-slate-200 text-slate-800 placeholder-slate-400 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20'
                      }`}
                      placeholder="Enter your order message template..."
                    />
                  </div>

                  {/* Live Preview */}
                  <div className={`${showSupplierPreview ? 'block' : 'hidden'} lg:block`}>
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <Eye className={`w-4 h-4 ${theme === 'dark' ? 'text-orange-400' : 'text-orange-600'}`} />
                        <span className={`font-medium ${theme === 'dark' ? 'text-white' : 'text-slate-800'}`}>
                          Live Preview
                        </span>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          theme === 'dark' ? 'bg-orange-500/20 text-orange-400' : 'bg-orange-100 text-orange-700'
                        }`}>
                          Auto-filled with sample data
                        </span>
                      </div>
                    </div>
                    
                    {/* Supplier Info Preview */}
                    <div className={`mb-3 p-3 rounded-xl border ${
                      theme === 'dark' ? 'bg-slate-800/50 border-slate-700/50' : 'bg-slate-50 border-slate-200'
                    }`}>
                      <p className={`text-xs font-medium mb-2 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                        📌 Sample supplier details for preview:
                      </p>
                      <div className="flex flex-wrap gap-2">
                        <span className={`text-xs px-2 py-1 rounded-md ${theme === 'dark' ? 'bg-orange-500/20 text-orange-400' : 'bg-orange-100 text-orange-700'}`}>
                          👤 Roshan Fernando
                        </span>
                        <span className={`text-xs px-2 py-1 rounded-md ${theme === 'dark' ? 'bg-amber-500/20 text-amber-400' : 'bg-amber-100 text-amber-700'}`}>
                          🏭 HP Sri Lanka
                        </span>
                        <span className={`text-xs px-2 py-1 rounded-md ${theme === 'dark' ? 'bg-blue-500/20 text-blue-400' : 'bg-blue-100 text-blue-700'}`}>
                          🏪 {effectiveShopName}
                        </span>
                      </div>
                    </div>
                    
                    {/* WhatsApp Style Preview */}
                    <div className="bg-[#0B141A] rounded-2xl overflow-hidden shadow-2xl">
                      {/* WhatsApp Header */}
                      <div className="bg-[#202C33] px-4 py-3 flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-amber-600 rounded-full flex items-center justify-center text-white font-bold text-sm">
                          RF
                        </div>
                        <div className="flex-1">
                          <p className="text-white font-medium text-sm">Roshan Fernando</p>
                          <p className="text-green-400 text-xs">online</p>
                        </div>
                      </div>
                      
                      {/* Chat Background */}
                      <div className="p-4 min-h-[280px] max-h-[380px] overflow-y-auto" style={{
                        backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.03'%3E%3Ccircle cx='30' cy='30' r='2'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
                        backgroundColor: '#0B141A'
                      }}>
                        {/* Message Bubble */}
                        <div className="max-w-[85%] ml-auto">
                          <div className="bg-[#005C4B] rounded-xl rounded-tr-sm px-3 py-2 text-white text-sm whitespace-pre-wrap leading-relaxed">
                            {generateSupplierPreview(whatsAppSettings.supplierOrderTemplate)}
                            <div className="flex items-center justify-end gap-1 mt-1">
                              <span className="text-[10px] text-green-200/70">
                                {new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                              </span>
                              <CheckCircle2 className="w-3.5 h-3.5 text-blue-400" />
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      {/* Input Bar */}
                      <div className="bg-[#202C33] px-4 py-3 flex items-center gap-3">
                        <div className="flex-1 bg-[#2A3942] rounded-full px-4 py-2.5 text-slate-400 text-sm">
                          Type a message
                        </div>
                        <div className="w-10 h-10 bg-[#00A884] rounded-full flex items-center justify-center">
                          <SendHorizontal className="w-5 h-5 text-white" />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========== SECTIONS TAB (SUPER_ADMIN & SHOP ADMIN) ========== */}
        {activeTab === 'sections' && canViewShopAdminSettings && (
          <div className="space-y-6 animate-in fade-in duration-300">
            {/* Creative Header with Gradient */}
            <div className={`relative overflow-hidden rounded-2xl sm:rounded-3xl border ${theme === 'dark' ? 'bg-gradient-to-br from-violet-900/30 via-slate-800/50 to-purple-900/30 border-violet-500/20' : 'bg-gradient-to-br from-violet-50 via-white to-purple-50 border-violet-200 shadow-xl'}`}>
              <div className="absolute top-0 right-0 w-40 sm:w-64 h-40 sm:h-64 bg-gradient-to-br from-violet-500/20 to-purple-500/10 rounded-full blur-3xl -translate-y-32 translate-x-32" />
              <div className="absolute bottom-0 left-0 w-32 sm:w-48 h-32 sm:h-48 bg-gradient-to-tr from-pink-500/10 to-violet-500/10 rounded-full blur-3xl translate-y-24 -translate-x-24" />
              <div className="relative p-3 sm:p-4 md:p-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-6">
                  <div className="flex items-start gap-3 sm:gap-4">
                    <div className="p-2.5 sm:p-3 md:p-4 rounded-xl sm:rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 shadow-lg shadow-violet-500/30">
                      <Layers className="w-5 h-5 sm:w-6 sm:h-6 md:w-8 md:h-8 text-white" />
                    </div>
                    <div className="min-w-0">
                      <h2 className={`text-base sm:text-xl md:text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                        Section Control Center
                      </h2>
                      <p className={`text-xs sm:text-sm mt-0.5 sm:mt-1 line-clamp-2 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                        {isSuperAdmin 
                          ? 'Manage section visibility for all shop users (Admin + Users)' 
                          : 'Manage section visibility for your shop users'
                        }
                      </p>
                    </div>
                  </div>
                  {/* Stats Pills - Show different stats based on role */}
                  <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                    {isSuperAdmin ? (
                      <>
                        <div className={`flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-full ${theme === 'dark' ? 'bg-emerald-500/20 border border-emerald-500/30' : 'bg-emerald-100 border border-emerald-200'}`}>
                          <Eye className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${theme === 'dark' ? 'text-emerald-400' : 'text-emerald-600'}`} />
                          <span className={`text-sm sm:text-base font-bold ${theme === 'dark' ? 'text-emerald-400' : 'text-emerald-700'}`}>
                            {ALL_SECTIONS.length - localHiddenSections.length}
                          </span>
                          <span className={`text-xs sm:text-sm ${theme === 'dark' ? 'text-emerald-400/70' : 'text-emerald-600'}`}>Visible</span>
                        </div>
                        <div className={`flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-full ${theme === 'dark' ? 'bg-red-500/20 border border-red-500/30' : 'bg-red-100 border border-red-200'}`}>
                          <EyeOff className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${theme === 'dark' ? 'text-red-400' : 'text-red-600'}`} />
                          <span className={`text-sm sm:text-base font-bold ${theme === 'dark' ? 'text-red-400' : 'text-red-700'}`}>
                            {localHiddenSections.length}
                          </span>
                          <span className={`text-xs sm:text-sm ${theme === 'dark' ? 'text-red-400/70' : 'text-red-600'}`}>Hidden</span>
                        </div>
                      </>
                    ) : (
                      <>
                        {/* Shop ADMIN sees only sections not hidden by SuperAdmin */}
                        <div className={`flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-full ${theme === 'dark' ? 'bg-emerald-500/20 border border-emerald-500/30' : 'bg-emerald-100 border border-emerald-200'}`}>
                          <Eye className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${theme === 'dark' ? 'text-emerald-400' : 'text-emerald-600'}`} />
                          <span className={`text-sm sm:text-base font-bold ${theme === 'dark' ? 'text-emerald-400' : 'text-emerald-700'}`}>
                            {getAdminVisibleSections().filter(s => !s.isHidden).length}
                          </span>
                          <span className={`text-xs sm:text-sm ${theme === 'dark' ? 'text-emerald-400/70' : 'text-emerald-600'}`}>Visible to Users</span>
                        </div>
                        <div className={`flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-full ${theme === 'dark' ? 'bg-amber-500/20 border border-amber-500/30' : 'bg-amber-100 border border-amber-200'}`}>
                          <EyeOff className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${theme === 'dark' ? 'text-amber-400' : 'text-amber-600'}`} />
                          <span className={`text-sm sm:text-base font-bold ${theme === 'dark' ? 'text-amber-400' : 'text-amber-700'}`}>
                            {localAdminHiddenSections.length}
                          </span>
                          <span className={`text-xs sm:text-sm ${theme === 'dark' ? 'text-amber-400/70' : 'text-amber-600'}`}>Hidden from Users</span>
                        </div>
                      </>
                    )}
                    
                  </div>
                </div>
              </div>
            </div>

            {/* Sections Grid with Toggle Switches */}
            {sectionsLoading ? (
              <div className="flex items-center justify-center h-64">
                <div className="flex flex-col items-center gap-3">
                  <div className={`animate-spin rounded-full h-10 w-10 border-3 ${theme === 'dark' ? 'border-violet-500 border-t-transparent' : 'border-violet-600 border-t-transparent'}`} />
                  <p className={`text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>Loading sections...</p>
                </div>
              </div>
            ) : isSuperAdmin ? (
              /* SuperAdmin View: All sections with SuperAdmin-level hiding */
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                {ALL_SECTIONS.map((section) => {
                  const isHidden = localHiddenSections.includes(section.path);
                  const isVisible = !isHidden;
                  return (
                    <div
                      key={section.path}
                      className={`group relative overflow-hidden rounded-xl sm:rounded-2xl border p-3 sm:p-5 transition-all duration-300 cursor-pointer ${
                        isVisible 
                          ? theme === 'dark' 
                            ? 'bg-gradient-to-br from-slate-800/80 to-slate-900/80 border-emerald-500/30 hover:border-emerald-400/50 hover:shadow-lg hover:shadow-emerald-500/10' 
                            : 'bg-white border-emerald-200 hover:border-emerald-300 hover:shadow-lg hover:shadow-emerald-100'
                          : theme === 'dark' 
                            ? 'bg-gradient-to-br from-slate-800/40 to-slate-900/40 border-slate-700/50 hover:border-slate-600/50 opacity-60 hover:opacity-80' 
                            : 'bg-slate-50 border-slate-200 hover:border-slate-300 opacity-70 hover:opacity-90'
                      }`}
                      onClick={() => toggleSection(section.path)}
                    >
                      {/* Glow effect for visible sections */}
                      {isVisible && (
                        <div className={`absolute top-0 right-0 w-20 h-20 rounded-full blur-2xl transition-opacity ${
                          theme === 'dark' ? 'bg-emerald-500/20' : 'bg-emerald-200'
                        } group-hover:opacity-100 opacity-50`} />
                      )}
                      
                      <div className="relative flex items-center justify-between">
                        <div className="flex items-center gap-2.5 sm:gap-4 min-w-0">
                          <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl flex-shrink-0 flex items-center justify-center text-xl sm:text-2xl transition-all ${
                            isVisible
                              ? theme === 'dark' ? 'bg-gradient-to-br from-emerald-500/20 to-teal-500/20' : 'bg-emerald-100'
                              : theme === 'dark' ? 'bg-slate-700/50' : 'bg-slate-200'
                          }`}>
                            {section.icon}
                          </div>
                          <div className="min-w-0">
                            <p className={`text-sm sm:text-base font-semibold transition-colors truncate ${
                              isVisible
                                ? theme === 'dark' ? 'text-white' : 'text-slate-900'
                                : theme === 'dark' ? 'text-slate-500 line-through' : 'text-slate-400 line-through'
                            }`}>
                              {section.label}
                            </p>
                            <p className={`text-[10px] sm:text-xs truncate ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>
                              {section.path}
                            </p>
                          </div>
                        </div>
                        
                        {/* Toggle Switch */}
                        <div className={`relative w-11 h-6 sm:w-14 sm:h-8 rounded-full transition-all duration-300 flex-shrink-0 ${
                          isVisible
                            ? 'bg-gradient-to-r from-emerald-500 to-teal-500 shadow-lg shadow-emerald-500/30'
                            : theme === 'dark' ? 'bg-slate-700' : 'bg-slate-300'
                        }`}>
                          <div className={`absolute top-0.5 sm:top-1 w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-white shadow-md transition-all duration-300 flex items-center justify-center ${
                            isVisible ? 'left-[22px] sm:left-7' : 'left-0.5 sm:left-1'
                          }`}>
                            {isVisible ? (
                              <Eye className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-emerald-500" />
                            ) : (
                              <EyeOff className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-slate-400" />
                            )}
                          </div>
                        </div>
                      </div>
                      
                      {/* Status indicator */}
                      <div className={`mt-3 sm:mt-4 pt-2 sm:pt-3 border-t ${theme === 'dark' ? 'border-slate-700/50' : 'border-slate-100'}`}>
                        <div className="flex items-center gap-2">
                          <div className={`w-2 h-2 rounded-full ${isVisible ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`} />
                          <span className={`text-xs font-medium ${
                            isVisible
                              ? theme === 'dark' ? 'text-emerald-400' : 'text-emerald-600'
                              : theme === 'dark' ? 'text-slate-500' : 'text-slate-400'
                          }`}>
                            {isVisible ? 'Visible to Admin + Users' : 'Hidden from Admin + Users'}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              /* Shop ADMIN View: Only sections NOT hidden by SuperAdmin, with Admin-level hiding */
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                {getAdminVisibleSections().map((section) => {
                  const isHidden = localAdminHiddenSections.includes(section.path);
                  const isVisible = !isHidden;
                  return (
                    <div
                      key={section.path}
                      className={`group relative overflow-hidden rounded-xl sm:rounded-2xl border p-3 sm:p-5 transition-all duration-300 cursor-pointer ${
                        isVisible 
                          ? theme === 'dark' 
                            ? 'bg-gradient-to-br from-slate-800/80 to-slate-900/80 border-cyan-500/30 hover:border-cyan-400/50 hover:shadow-lg hover:shadow-cyan-500/10' 
                            : 'bg-white border-cyan-200 hover:border-cyan-300 hover:shadow-lg hover:shadow-cyan-100'
                          : theme === 'dark' 
                            ? 'bg-gradient-to-br from-slate-800/40 to-slate-900/40 border-amber-500/30 hover:border-amber-400/50 opacity-60 hover:opacity-80' 
                            : 'bg-amber-50 border-amber-200 hover:border-amber-300 opacity-70 hover:opacity-90'
                      }`}
                      onClick={() => toggleSection(section.path)}
                    >
                      {/* Glow effect for visible sections */}
                      {isVisible && (
                        <div className={`absolute top-0 right-0 w-20 h-20 rounded-full blur-2xl transition-opacity ${
                          theme === 'dark' ? 'bg-cyan-500/20' : 'bg-cyan-200'
                        } group-hover:opacity-100 opacity-50`} />
                      )}
                      
                      <div className="relative flex items-center justify-between">
                        <div className="flex items-center gap-2.5 sm:gap-4 min-w-0">
                          <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl flex-shrink-0 flex items-center justify-center text-xl sm:text-2xl transition-all ${
                            isVisible
                              ? theme === 'dark' ? 'bg-gradient-to-br from-cyan-500/20 to-blue-500/20' : 'bg-cyan-100'
                              : theme === 'dark' ? 'bg-amber-500/20' : 'bg-amber-200'
                          }`}>
                            {section.icon}
                          </div>
                          <div className="min-w-0">
                            <p className={`text-sm sm:text-base font-semibold transition-colors truncate ${
                              isVisible
                                ? theme === 'dark' ? 'text-white' : 'text-slate-900'
                                : theme === 'dark' ? 'text-amber-400' : 'text-amber-600'
                            }`}>
                              {section.label}
                            </p>
                            <p className={`text-[10px] sm:text-xs truncate ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>
                              {section.path}
                            </p>
                          </div>
                        </div>
                        
                        {/* Toggle Switch */}
                        <div className={`relative w-11 h-6 sm:w-14 sm:h-8 rounded-full transition-all duration-300 flex-shrink-0 ${
                          isVisible
                            ? 'bg-gradient-to-r from-cyan-500 to-blue-500 shadow-lg shadow-cyan-500/30'
                            : 'bg-gradient-to-r from-amber-500 to-orange-500 shadow-lg shadow-amber-500/30'
                        }`}>
                          <div className={`absolute top-0.5 sm:top-1 w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-white shadow-md transition-all duration-300 flex items-center justify-center ${
                            isVisible ? 'left-[22px] sm:left-7' : 'left-0.5 sm:left-1'
                          }`}>
                            {isVisible ? (
                              <Eye className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-cyan-500" />
                            ) : (
                              <EyeOff className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-amber-500" />
                            )}
                          </div>
                        </div>
                      </div>
                      
                      {/* Status indicator */}
                      <div className={`mt-3 sm:mt-4 pt-2 sm:pt-3 border-t ${theme === 'dark' ? 'border-slate-700/50' : 'border-slate-100'}`}>
                        <div className="flex items-center gap-2">
                          <div className={`w-2 h-2 rounded-full ${isVisible ? 'bg-cyan-500 animate-pulse' : 'bg-amber-500'}`} />
                          <span className={`text-xs font-medium ${
                            isVisible
                              ? theme === 'dark' ? 'text-cyan-400' : 'text-cyan-600'
                              : theme === 'dark' ? 'text-amber-400' : 'text-amber-600'
                          }`}>
                            {isVisible ? 'Visible to shop users' : 'Hidden from shop users'}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Info Note */}
            <div className={`flex items-start gap-2 sm:gap-3 p-3 sm:p-4 rounded-lg sm:rounded-xl ${theme === 'dark' ? 'bg-blue-500/10 border border-blue-500/20' : 'bg-blue-50 border border-blue-200'}`}>
              <Info className={`w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0 mt-0.5 ${theme === 'dark' ? 'text-blue-400' : 'text-blue-600'}`} />
              <div>
                <p className={`text-xs sm:text-sm font-medium ${theme === 'dark' ? 'text-blue-400' : 'text-blue-700'}`}>Section Visibility Control</p>
                <p className={`text-[10px] sm:text-xs mt-0.5 ${theme === 'dark' ? 'text-blue-400/70' : 'text-blue-600'}`}>
                  Toggle sections on/off, then click the "Save Changes" button at the top right to apply your changes.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ========== USERS TAB (SUPER_ADMIN ONLY) ========== */}
        {activeTab === 'users' && canViewShopAdminSettings && (
          <div className="space-y-6 animate-in fade-in duration-300">
            {/* Header Card - Creative 2-Line Layout */}
            <div className={`rounded-xl sm:rounded-2xl border overflow-hidden ${theme === 'dark' ? 'bg-slate-800/50 border-slate-700/50' : 'bg-white border-slate-200 shadow-sm'}`}>
              {/* Line 1: Title, Description & Add User Button */}
              <div className={`flex items-center justify-between gap-3 sm:gap-4 px-3 sm:px-4 md:px-6 py-3 sm:py-4 border-b ${theme === 'dark' ? 'border-slate-700/50 bg-gradient-to-r from-slate-800/50 to-slate-900/30' : 'border-slate-200 bg-gradient-to-r from-slate-50 to-white'}`}>
                <div className="flex items-center gap-2.5 sm:gap-4 min-w-0">
                  <div className={`p-2 sm:p-3 rounded-lg sm:rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-500/20 ${theme === 'dark' ? 'shadow-lg shadow-cyan-500/5' : 'shadow-cyan-500/10'}`}>
                    <Users className="w-5 h-5 sm:w-6 sm:h-6 text-cyan-500" />
                  </div>
                  <div className="min-w-0">
                    <h3 className={`text-base sm:text-lg md:text-xl font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                      Shop Users
                    </h3>
                    <p className={`text-xs sm:text-sm flex items-center gap-1 sm:gap-2 truncate ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                      <span className="hidden sm:inline">Manage users for</span>
                      <span className="sm:hidden">Users:</span>
                      <span className={`font-medium truncate ${theme === 'dark' ? 'text-cyan-400' : 'text-cyan-600'}`}>
                        {viewingShop?.name || effectiveShop?.name}
                      </span>
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setIsCreateUserModalOpen(true)}
                  className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-5 py-2 sm:py-2.5 bg-gradient-to-r from-cyan-500 to-blue-500 text-white rounded-lg sm:rounded-xl text-sm font-medium shadow-lg hover:shadow-cyan-500/25 transition-all hover:scale-105 flex-shrink-0"
                >
                  <UserPlus className="w-4 h-4 sm:w-5 sm:h-5" />
                  <span className="hidden sm:inline">Add User</span>
                  <span className="sm:hidden">Add</span>
                </button>
              </div>

              {/* Line 2: Search & Filters */}
              <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-2 sm:gap-3 px-3 sm:px-4 md:px-6 py-3 sm:py-4">
                {/* Search */}
                <div className="relative flex-1 min-w-0 sm:min-w-[200px]">
                  <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`} />
                  <input
                    type="text"
                    placeholder="Search name or email..."
                    value={userSearchQuery}
                    onChange={(e) => setUserSearchQuery(e.target.value)}
                    className={`w-full pl-10 pr-4 py-2 sm:py-2.5 rounded-lg sm:rounded-xl border text-sm transition-all ${theme === 'dark' ? 'bg-slate-800/50 border-slate-700/50 text-white placeholder-slate-500 focus:border-cyan-500/50 focus:ring-2 focus:ring-cyan-500/20' : 'bg-white border-slate-200 text-slate-900 placeholder-slate-400 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20'}`}
                  />
                </div>
                
                <div className="flex items-center gap-2 sm:gap-3 overflow-x-auto">
                  {/* Status Filter */}
                  <div className="w-32 sm:w-40 flex-shrink-0">
                    <SearchableSelect
                      value={statusFilter}
                      onValueChange={(value) => setStatusFilter(value as StatusFilter)}
                      placeholder="All Status"
                      searchPlaceholder="Search..."
                      emptyMessage="No options"
                      theme={theme === 'dark' ? 'dark' : 'light'}
                      options={[
                        { value: 'all', label: 'All Status', icon: <CheckCircle className="w-4 h-4 text-slate-500" /> },
                        { value: 'active', label: 'Active', icon: <CheckCircle className="w-4 h-4 text-emerald-500" /> },
                        { value: 'inactive', label: 'Inactive', icon: <XCircle className="w-4 h-4 text-red-500" /> },
                      ]}
                    />
                  </div>
                  {/* Role Filter */}
                  <div className="w-36 sm:w-44 flex-shrink-0">
                    <SearchableSelect
                      value={roleFilter}
                      onValueChange={(value) => setRoleFilter(value as RoleFilter)}
                      placeholder="All Roles"
                      searchPlaceholder="Search..."
                      emptyMessage="No options"
                      theme={theme === 'dark' ? 'dark' : 'light'}
                      options={[
                        { value: 'all', label: 'All Roles', icon: <Users className="w-4 h-4 text-slate-500" /> },
                        { value: 'MANAGER', label: 'Manager', icon: <UserCog className="w-4 h-4 text-blue-500" /> },
                        { value: 'STAFF', label: 'Staff', icon: <Users className="w-4 h-4 text-slate-500" /> },
                      ]}
                    />
                  </div>
                  {/* View Toggle */}
                  <div className={`hidden sm:flex rounded-xl border overflow-hidden ${theme === 'dark' ? 'border-slate-700/50' : 'border-slate-200'}`}>
                    <button
                      onClick={() => setViewMode('card')}
                      className={`p-2 transition-all ${viewMode === 'card' ? (theme === 'dark' ? 'bg-cyan-500/20 text-cyan-400' : 'bg-cyan-50 text-cyan-600') : (theme === 'dark' ? 'text-slate-400 hover:bg-slate-700/50' : 'text-slate-500 hover:bg-slate-50')}`}
                      title="Card view"
                    >
                      <LayoutGrid className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => setViewMode('table')}
                      className={`p-2 transition-all ${viewMode === 'table' ? (theme === 'dark' ? 'bg-cyan-500/20 text-cyan-400' : 'bg-cyan-50 text-cyan-600') : (theme === 'dark' ? 'text-slate-400 hover:bg-slate-700/50' : 'text-slate-500 hover:bg-slate-50')}`}
                      title="Table view"
                    >
                      <List className="w-5 h-5" />
                    </button>
                  </div>
                  {/* Refresh */}
                  <button
                    onClick={() => { setUsersLoadedForShop(null); fetchShopUsers(); }}
                    disabled={usersLoading}
                    className={`p-2 rounded-xl border transition-all ${theme === 'dark' ? 'border-slate-700/50 hover:bg-slate-700/50 text-slate-400 disabled:opacity-50' : 'border-slate-200 hover:bg-slate-50 text-slate-500 disabled:opacity-50'}`}
                    title="Refresh users"
                  >
                    <RefreshCw className={`w-5 h-5 ${usersLoading ? 'animate-spin' : ''}`} />
                  </button>
                </div>
              </div>
            </div>

            {/* Users List */}
            {usersLoading ? (
              <div className="flex items-center justify-center h-64">
                <div className={`animate-spin rounded-full h-8 w-8 border-2 ${theme === 'dark' ? 'border-cyan-500 border-t-transparent' : 'border-cyan-600 border-t-transparent'}`} />
              </div>
            ) : usersError ? (
              <div className={`rounded-2xl border p-8 text-center ${theme === 'dark' ? 'bg-red-500/10 border-red-500/30' : 'bg-red-50 border-red-200'}`}>
                <AlertCircle className={`w-12 h-12 mx-auto mb-4 ${theme === 'dark' ? 'text-red-400' : 'text-red-500'}`} />
                <p className={`font-medium ${theme === 'dark' ? 'text-red-400' : 'text-red-700'}`}>{usersError}</p>
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className={`rounded-2xl border p-8 text-center ${theme === 'dark' ? 'bg-slate-800/30 border-slate-700/50' : 'bg-white border-slate-200'}`}>
                <Users className={`w-12 h-12 mx-auto mb-4 ${theme === 'dark' ? 'text-slate-600' : 'text-slate-400'}`} />
                <p className={`font-medium ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>No users found</p>
                <button
                  onClick={() => setIsCreateUserModalOpen(true)}
                  className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-500 text-white rounded-xl font-medium"
                >
                  <UserPlus className="w-4 h-4" />
                  Add First User
                </button>
              </div>
            ) : viewMode === 'card' ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {paginatedUsers.map((usr) => {
                  const isCurrentUser = usr.id === user?.id;
                  const canEditUser = usr.role !== 'ADMIN' || viewingShop || isCurrentUser;
                  const canDeleteUser = (usr.role !== 'ADMIN' || viewingShop) && !isCurrentUser;
                  
                  return (
                  <div
                    key={usr.id}
                    className={`rounded-2xl border p-4 transition-all hover:shadow-lg ${
                      isCurrentUser 
                        ? theme === 'dark' 
                          ? 'bg-gradient-to-br from-emerald-500/10 to-teal- border-emerald-500/30 ring-2 ring-emerald-500/20' 
                          : 'bg-gradient-to-br from-emerald-50 to-teal- border-emerald-200 ring-2 ring-emerald-200'
                        : theme === 'dark' 
                          ? 'bg-slate-800/30 border-slate-700/50 hover:bg-slate-800/50' 
                          : 'bg-white border-slate-200 hover:shadow-slate-200/50'
                    }`}
                  >
                    <div className="flex items-start gap-3 mb-3">
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold bg-gradient-to-br ${usr.role === 'ADMIN' ? 'from-emerald-500 to-teal-500' : usr.role === 'MANAGER' ? 'from-blue-500 to-indigo-500' : 'from-slate-500 to-gray-600'}`}>
                        {usr.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className={`font-semibold truncate ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>{usr.name}</p>
                          {isCurrentUser && (
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide ${theme === 'dark' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-emerald-100 text-emerald-700 border border-emerald-200'}`}>
                              You
                            </span>
                          )}
                        </div>
                        <p className={`text-xs truncate ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>{usr.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between mb-3">
                      {getRoleBadge(usr.role)}
                      {getStatusBadge(usr.isActive)}
                    </div>
                    <div className={`text-xs mb-3 ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>
                      <p>Joined: {formatDate(usr.createdAt)}</p>
                      {usr.lastLogin && <p>Last login: {formatDate(usr.lastLogin)}</p>}
                    </div>
                    {/* Action Buttons - SuperAdmin can manage ADMIN users when viewing a shop, or current user can edit themselves */}
                    {canEditUser && (
                      <div className={`flex items-center gap-2 pt-3 border-t ${theme === 'dark' ? 'border-slate-700/50' : 'border-slate-200'}`}>
                        <button
                          onClick={() => { setSelectedUser(usr); setIsEditUserModalOpen(true); }}
                          className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                            theme === 'dark' ? 'bg-blue-500/10 text-blue-400 hover:bg-blue-500/20' : 'bg-blue-50 text-blue-600 hover:bg-blue-100'
                          }`}
                          title={isCurrentUser ? 'Edit your profile' : 'Edit user'}
                        >
                          <Edit className="w-3.5 h-3.5" />
                          {isCurrentUser ? 'Edit Profile' : 'Edit'}
                        </button>
                        <button
                          onClick={() => { setSelectedUser(usr); setIsResetPasswordModalOpen(true); }}
                          className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                            theme === 'dark' ? 'bg-amber-500/10 text-amber-400 hover:bg-amber-500/20' : 'bg-amber-50 text-amber-600 hover:bg-amber-100'
                          }`}
                          title={isCurrentUser ? 'Change your password' : 'Reset password'}
                        >
                          <Key className="w-3.5 h-3.5" />
                          Password
                        </button>
                        {canDeleteUser && (
                          <button
                            onClick={() => { setSelectedUser(usr); setIsDeleteUserModalOpen(true); }}
                            className={`p-1.5 rounded-lg transition-all ${
                              theme === 'dark' ? 'bg-red-500/10 text-red-400 hover:bg-red-500/20' : 'bg-red-50 text-red-600 hover:bg-red-100'
                            }`}
                            title="Delete user"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                );})}
              </div>
            ) : (
              <div className={`rounded-2xl border overflow-hidden ${theme === 'dark' ? 'border-slate-700/50' : 'border-slate-200'}`}>
                <table className="w-full">
                  <thead className={theme === 'dark' ? 'bg-slate-800/50' : 'bg-slate-50'}>
                    <tr>
                      <th className={`px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>User</th>
                      <th className={`px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>Role</th>
                      <th className={`px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>Status</th>
                      <th className={`px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>Joined</th>
                      <th className={`px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>Actions</th>
                    </tr>
                  </thead>
                  <tbody className={`divide-y ${theme === 'dark' ? 'divide-slate-700/50' : 'divide-slate-200'}`}>
                    {paginatedUsers.map((usr) => {
                      const isCurrentUser = usr.id === user?.id;
                      const canEditUser = usr.role !== 'ADMIN' || viewingShop || isCurrentUser;
                      const canDeleteUser = (usr.role !== 'ADMIN' || viewingShop) && !isCurrentUser;
                      
                      return (
                      <tr key={usr.id} className={`transition-colors ${
                        isCurrentUser 
                          ? theme === 'dark' 
                            ? 'bg-gradient-to-r from-emerald-500/10 to-teal- border-l-2 border-l-emerald-500' 
                            : 'bg-gradient-to-r from-emerald-50 to-teal- border-l-2 border-l-emerald-500'
                          : theme === 'dark' ? 'hover:bg-slate-800/30' : 'hover:bg-slate-50'
                      }`}>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-white text-sm font-bold bg-gradient-to-br ${usr.role === 'ADMIN' ? 'from-emerald-500 to-teal-500' : usr.role === 'MANAGER' ? 'from-blue-500 to-indigo-500' : 'from-slate-500 to-gray-600'}`}>
                              {usr.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <p className={`font-medium ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>{usr.name}</p>
                                {isCurrentUser && (
                                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide ${theme === 'dark' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-emerald-100 text-emerald-700 border border-emerald-200'}`}>
                                    You
                                  </span>
                                )}
                              </div>
                              <p className={`text-xs ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>{usr.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">{getRoleBadge(usr.role)}</td>
                        <td className="px-4 py-3">{getStatusBadge(usr.isActive)}</td>
                        <td className={`px-4 py-3 text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>{formatDate(usr.createdAt)}</td>
                        <td className="px-4 py-3">
                          {canEditUser ? (
                            <div className="flex items-center justify-end gap-1">
                              <button
                                onClick={() => { setSelectedUser(usr); setIsEditUserModalOpen(true); }}
                                className={`p-1.5 rounded-lg transition-all ${
                                  theme === 'dark' ? 'hover:bg-blue-500/20 text-blue-400' : 'hover:bg-blue-100 text-blue-600'
                                }`}
                                title={isCurrentUser ? 'Edit your profile' : 'Edit user'}
                              >
                                <Edit className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => { setSelectedUser(usr); setIsResetPasswordModalOpen(true); }}
                                className={`p-1.5 rounded-lg transition-all ${
                                  theme === 'dark' ? 'hover:bg-amber-500/20 text-amber-400' : 'hover:bg-amber-100 text-amber-600'
                                }`}
                                title={isCurrentUser ? 'Change your password' : 'Reset password'}
                              >
                                <Key className="w-4 h-4" />
                              </button>
                              {canDeleteUser && (
                              <button
                                onClick={() => { setSelectedUser(usr); setIsDeleteUserModalOpen(true); }}
                                className={`p-1.5 rounded-lg transition-all ${
                                  theme === 'dark' ? 'hover:bg-red-500/20 text-red-400' : 'hover:bg-red-100 text-red-600'
                                }`}
                                title="Delete user"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                              )}
                            </div>
                          ) : (
                            <span className={`text-xs ${theme === 'dark' ? 'text-slate-600' : 'text-slate-400'}`}>—</span>
                          )}
                        </td>
                      </tr>
                    );})}
                  </tbody>
                </table>
              </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className={`flex flex-col sm:flex-row items-center justify-between gap-3 rounded-xl sm:rounded-2xl border p-3 sm:p-4 ${theme === 'dark' ? 'bg-slate-800/30 border-slate-700/50' : 'bg-white border-slate-200'}`}>
                <p className={`text-xs sm:text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                  {startIndex + 1}-{Math.min(endIndex, filteredUsers.length)} of {filteredUsers.length}
                </p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCurrentPage(1)}
                    disabled={currentPage === 1}
                    className={`p-2 rounded-lg transition-all disabled:opacity-50 ${theme === 'dark' ? 'hover:bg-slate-700/50 text-slate-400' : 'hover:bg-slate-100 text-slate-600'}`}
                  >
                    <ChevronsLeft className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className={`p-2 rounded-lg transition-all disabled:opacity-50 ${theme === 'dark' ? 'hover:bg-slate-700/50 text-slate-400' : 'hover:bg-slate-100 text-slate-600'}`}
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className={`px-3 py-1 text-sm font-medium ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                    {currentPage} / {totalPages}
                  </span>
                  <button
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className={`p-2 rounded-lg transition-all disabled:opacity-50 ${theme === 'dark' ? 'hover:bg-slate-700/50 text-slate-400' : 'hover:bg-slate-100 text-slate-600'}`}
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setCurrentPage(totalPages)}
                    disabled={currentPage === totalPages}
                    className={`p-2 rounded-lg transition-all disabled:opacity-50 ${theme === 'dark' ? 'hover:bg-slate-700/50 text-slate-400' : 'hover:bg-slate-100 text-slate-600'}`}
                  >
                    <ChevronsRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

      </div>

      {/* User Management Modals for Shop Administration */}
      <CreateUserModal 
        isOpen={isCreateUserModalOpen} 
        onClose={() => setIsCreateUserModalOpen(false)} 
        onSuccess={addUserToState} 
      />
      <EditUserModal 
        user={selectedUser} 
        isOpen={isEditUserModalOpen} 
        onClose={() => { setIsEditUserModalOpen(false); setSelectedUser(null); }} 
        onSuccess={updateUserInState} 
      />
      <ResetPasswordModal 
        user={selectedUser} 
        isOpen={isResetPasswordModalOpen} 
        onClose={() => { setIsResetPasswordModalOpen(false); setSelectedUser(null); }} 
      />
      <DeleteUserModal 
        user={selectedUser} 
        isOpen={isDeleteUserModalOpen} 
        onClose={() => { setIsDeleteUserModalOpen(false); setSelectedUser(null); }} 
        onSuccess={removeUserFromState} 
      />
    </div>
  );
};
