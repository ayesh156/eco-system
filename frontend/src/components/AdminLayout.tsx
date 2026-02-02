import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { useShopBranding } from '../contexts/ShopBrandingContext';
import { useShopSections } from '../contexts/ShopSectionsContext';
import {
  Package, FileText, Users, LayoutDashboard, Settings, Database,
  Moon, Sun, Menu, X, ChevronLeft, ChevronRight, Bell, Search,
  User, HelpCircle, ChevronDown, Sparkles, TrendingUp,
  FolderTree, Building, Shield, Truck, ClipboardCheck, Wrench, Layers, ClipboardList,
  Calculator, FileCheck, Wallet, Brain, Zap, StickyNote, CalendarDays, Lightbulb, LogOut
} from 'lucide-react';
import { useIsMobile } from '../hooks/use-mobile';
import ecosystemLogo from '../assets/logo.png';
import { AIAssistant } from './AIAssistant';

interface SubNavItem {
  path: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  isDisabled?: boolean;
}

interface NavItem {
  path: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  badge: string | null;
  subItems?: SubNavItem[];
  isDisabled?: boolean;
}

interface AdminLayoutProps {
  children: React.ReactNode;
}

export const AdminLayout: React.FC<AdminLayoutProps> = ({ children }) => {
  const { theme, toggleTheme, aiAutoFillEnabled, toggleAiAutoFill } = useTheme();
  const { user, logout, isViewingShop, viewingShop, exitViewingShop } = useAuth();
  const { branding } = useShopBranding();
  const { isSectionHidden, isSuperAdminHidden, isAdminHidden, hiddenSections, adminHiddenSections, isLoading: sectionsLoading } = useShopSections();
  const location = useLocation();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [notificationCount] = useState(3);
  const [expandedMenus, setExpandedMenus] = useState<string[]>([]);
  const [collapsedPopover, setCollapsedPopover] = useState<string | null>(null);
  const [popoverPosition, setPopoverPosition] = useState<number>(0);
  const popoverRef = useRef<HTMLDivElement>(null);
  const sidebarNavRef = useRef<HTMLElement>(null);
  const mobileSidebarNavRef = useRef<HTMLElement>(null);
  const sidebarScrollPositionRef = useRef<number>(0);
  const mobileSidebarScrollPositionRef = useRef<number>(0);

  // Handle exit viewing shop
  const handleExitViewingShop = () => {
    exitViewingShop();
    navigate('/admin');
  };

  // Handle logout
  const handleLogout = async () => {
    try {
      await logout();
      setProfileDropdownOpen(false);
      navigate('/login', { replace: true });
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  // Save sidebar scroll position before route change
  useEffect(() => {
    const saveScrollPosition = () => {
      if (sidebarNavRef.current) {
        sidebarScrollPositionRef.current = sidebarNavRef.current.scrollTop;
      }
      if (mobileSidebarNavRef.current) {
        mobileSidebarScrollPositionRef.current = mobileSidebarNavRef.current.scrollTop;
      }
    };

    // Save position when clicking on links
    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.closest('a')) {
        saveScrollPosition();
      }
    };

    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, []);

  // Restore sidebar scroll position after route change
  useEffect(() => {
    // Use requestAnimationFrame to ensure DOM has updated
    requestAnimationFrame(() => {
      if (sidebarNavRef.current && sidebarScrollPositionRef.current > 0) {
        sidebarNavRef.current.scrollTop = sidebarScrollPositionRef.current;
      }
      if (mobileSidebarNavRef.current && mobileSidebarScrollPositionRef.current > 0) {
        mobileSidebarNavRef.current.scrollTop = mobileSidebarScrollPositionRef.current;
      }
    });
  }, [location.pathname]);

  // Close mobile sidebar on route change
  useEffect(() => {
    setMobileSidebarOpen(false);
    setCollapsedPopover(null);
  }, [location.pathname]);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = () => setProfileDropdownOpen(false);
    if (profileDropdownOpen) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [profileDropdownOpen]);

  // Close collapsed popover when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        setCollapsedPopover(null);
      }
    };
    if (collapsedPopover) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [collapsedPopover]);

  // Auto-expand menu when navigating to a sub-item
  useEffect(() => {
    navItems.forEach(item => {
      if (item.subItems) {
        const isSubItemActive = item.subItems.some(sub => location.pathname === sub.path || location.pathname.startsWith(sub.path + '/'));
        const isParentActive = location.pathname === item.path || location.pathname.startsWith(item.path + '/');
        if ((isSubItemActive || isParentActive) && !expandedMenus.includes(item.path)) {
          setExpandedMenus(prev => [...prev, item.path]);
        }
      }
    });
  }, [location.pathname]);

  const toggleMenu = (path: string) => {
    setExpandedMenus(prev =>
      prev.includes(path)
        ? prev.filter(p => p !== path)
        : [...prev, path]
    );
  };

  // Super Admin navigation - Only admin-related sections
  const superAdminNavItems: NavItem[] = [
    { path: '/admin', icon: LayoutDashboard, label: 'Overview', badge: null },
    { path: '/admin/shops', icon: Building, label: 'Shops', badge: null },
    { path: '/admin/users', icon: Users, label: 'Users', badge: null },
  ];

  // Regular shop navigation - for ADMIN, MANAGER, STAFF
  const shopNavItems: NavItem[] = [
    { path: '/', icon: LayoutDashboard, label: 'Dashboard', badge: null },
    { path: '/invoices', icon: FileText, label: 'Invoices', badge: '12' },
    { path: '/job-notes', icon: ClipboardList, label: 'Job Notes', badge: '4' },
    {
      path: '/products',
      icon: Package,
      label: 'Products',
      badge: null,
      subItems: [
        { path: '/products', icon: Package, label: 'All Products' },
        { path: '/categories', icon: FolderTree, label: 'Categories' },
        { path: '/brands', icon: Building, label: 'Brands' },
      ]
    },
    {
      path: '/services',
      icon: Wrench,
      label: 'Services',
      badge: null,
      subItems: [
        { path: '/services', icon: Wrench, label: 'All Services' },
        { path: '/service-categories', icon: Layers, label: 'Service Categories' },
      ]
    },
    {
      path: '/pricing-proposals',
      icon: Calculator,
      label: 'Pricing Proposals',
      badge: null,
      subItems: [
        { path: '/quotations', icon: FileCheck, label: 'Quotations' },
        { path: '/estimates', icon: FileText, label: 'Estimates' },
      ]
    },
    { path: '/warranties', icon: Shield, label: 'Warranties', badge: '3' },
    { path: '/customers', icon: Users, label: 'Customers', badge: '3' },
    { path: '/suppliers', icon: Truck, label: 'Suppliers', badge: '2' },
    { path: '/grn', icon: ClipboardCheck, label: 'GRN', badge: null },
    {
      path: '/cash-management',
      icon: Wallet,
      label: 'Cash Management',
      badge: null,
      subItems: [
        { path: '/cash-management/transactions', icon: FileText, label: 'Transactions' },
        { path: '/cash-management/accounts', icon: Wallet, label: 'Manage Accounts' },
        { path: '/cash-management/insights', icon: TrendingUp, label: 'Financial Insights' },
      ]
    },
    { path: '/reports', icon: TrendingUp, label: 'Reports', badge: null },
    {
      path: '/productivity',
      icon: Lightbulb,
      label: 'Productivity',
      badge: null,
      subItems: [
        { path: '/notes', icon: StickyNote, label: 'Notes' },
        { path: '/calendar', icon: CalendarDays, label: 'Calendar' },
      ]
    },
  ];

  // Select navigation based on user role and viewing state
  // SUPER_ADMIN viewing a shop should see shop navigation
  const rawNavItems: NavItem[] = (user?.role === 'SUPER_ADMIN' && !isViewingShop) 
    ? superAdminNavItems 
    : shopNavItems;

  // Check if user can manage sections (SuperAdmin viewing shop OR Shop ADMIN)
  const isSuperAdminViewingShop = user?.role === 'SUPER_ADMIN' && isViewingShop;
  const isShopAdmin = user?.role === 'ADMIN';
  const canManageSections = isSuperAdminViewingShop || isShopAdmin;

  // Filter out hidden sections from navigation
  // For SuperAdmin viewing a shop OR Shop ADMIN: show all sections but mark hidden ones with badge
  // For regular users: filter out hidden sections completely
  // For SuperAdmin/Shop ADMIN: Show all with appropriate badges
  const navItems = useMemo(() => {
    console.log('🔄 Recalculating navItems.');
    console.log('User role:', user?.role);
    console.log('Is viewing shop:', isViewingShop);
    console.log('Can manage sections:', canManageSections);
    console.log('Hidden sections (SuperAdmin):', hiddenSections);
    console.log('Admin hidden sections:', adminHiddenSections);
    
    const isSuperAdmin = user?.role === 'SUPER_ADMIN';
    const isShopAdmin = user?.role === 'ADMIN';
    
    if (isSuperAdmin && isViewingShop) {
      // SuperAdmin viewing shop: show ALL sections, mark SuperAdmin-hidden as disabled
      return rawNavItems.map(item => {
        const itemDisabled = isSuperAdminHidden(item.path);
        console.log(`SuperAdmin - Item ${item.path} - Hidden: ${itemDisabled}`);
        return {
          ...item,
          isDisabled: itemDisabled,
          subItems: item.subItems?.map(sub => ({
            ...sub,
            isDisabled: isSuperAdminHidden(sub.path)
          }))
        };
      });
    } else if (isShopAdmin) {
      // Shop ADMIN: show sections NOT hidden by SuperAdmin, mark Admin-hidden as disabled
      return rawNavItems
        .filter(item => !isSuperAdminHidden(item.path)) // Filter out SuperAdmin hidden
        .map(item => {
          const itemDisabled = isAdminHidden(item.path); // Mark Admin-hidden as disabled
          console.log(`Shop ADMIN - Item ${item.path} - Hidden from users: ${itemDisabled}`);
          return {
            ...item,
            isDisabled: itemDisabled,
            subItems: item.subItems
              ?.filter(sub => !isSuperAdminHidden(sub.path)) // Filter out SuperAdmin hidden
              ?.map(sub => ({
                ...sub,
                isDisabled: isAdminHidden(sub.path) // Mark Admin-hidden as disabled
              }))
          };
        })
        .filter(item => !item.subItems || item.subItems.length > 0);
    } else {
      // Regular users: filter out ALL hidden sections (both SuperAdmin and Admin hidden)
      return rawNavItems
        .filter(item => !isSectionHidden(item.path))
        .map(item => {
          if (item.subItems) {
            return {
              ...item,
              subItems: item.subItems.filter(sub => !isSectionHidden(sub.path))
            };
          }
          return item;
        })
        // Remove parent items that have no visible sub-items
        .filter(item => !item.subItems || item.subItems.length > 0);
    }
  }, [rawNavItems, isSectionHidden, isSuperAdminHidden, isAdminHidden, hiddenSections, adminHiddenSections, canManageSections, user?.role, isViewingShop]);

  // Bottom nav items - different for SUPER_ADMIN (when not viewing shop)
  // Shop Admin features (Users, Branding, Sections) are now inside Settings page for both SHOP_ADMIN and SUPER_ADMIN viewing a shop
  const rawBottomNavItems: NavItem[] = (user?.role === 'SUPER_ADMIN' && !isViewingShop)
    ? [
        { path: '/settings', icon: Settings, label: 'Settings', badge: null },
        { path: '/help', icon: HelpCircle, label: 'Help Center', badge: null },
      ]
    : [
          // For SHOP_ADMIN and SUPER_ADMIN viewing a shop: Shop Admin tabs are inside Settings
          { path: '/data-export', icon: Database, label: 'Data Export', badge: null },
          { path: '/settings', icon: Settings, label: 'Settings', badge: null },
          { path: '/help', icon: HelpCircle, label: 'Help Center', badge: null },
        ];

  // Filter hidden sections from bottom nav items
  const bottomNavItems = useMemo(() => {
    const isSuperAdmin = user?.role === 'SUPER_ADMIN';
    const isShopAdmin = user?.role === 'ADMIN';
    
    if (isSuperAdmin && isViewingShop) {
      // SuperAdmin viewing shop: show ALL, mark SuperAdmin-hidden as disabled
      return rawBottomNavItems.map(item => {
        const itemDisabled = isSuperAdminHidden(item.path);
        return {
          ...item,
          isDisabled: itemDisabled,
          subItems: item.subItems?.map(sub => ({
            ...sub,
            isDisabled: isSuperAdminHidden(sub.path)
          }))
        };
      });
    } else if (isShopAdmin) {
      // Shop ADMIN: filter SuperAdmin-hidden, mark Admin-hidden as disabled
      return rawBottomNavItems
        .filter(item => !isSuperAdminHidden(item.path))
        .map(item => {
          const itemDisabled = isAdminHidden(item.path);
          return {
            ...item,
            isDisabled: itemDisabled,
            subItems: item.subItems
              ?.filter(sub => !isSuperAdminHidden(sub.path))
              ?.map(sub => ({
                ...sub,
                isDisabled: isAdminHidden(sub.path)
              }))
          };
        })
        .filter(item => !item.subItems || item.subItems.length > 0);
    } else {
      // Regular users: filter out ALL hidden sections
      return rawBottomNavItems
        .filter(item => !isSectionHidden(item.path))
        .map(item => {
          if (item.subItems) {
            return {
              ...item,
              subItems: item.subItems.filter(sub => !isSectionHidden(sub.path))
            };
          }
          return item;
        })
        .filter(item => !item.subItems || item.subItems.length > 0);
    }
  }, [rawBottomNavItems, isSectionHidden, isSuperAdminHidden, isAdminHidden, hiddenSections, adminHiddenSections, canManageSections, user?.role, isViewingShop]);

  const isActive = (path: string) => location.pathname === path || location.pathname.startsWith(path + '/');
  const isExactActive = (path: string) => location.pathname === path;
  const isParentActive = (item: NavItem) => {
    if (item.subItems) {
      return item.subItems.some(sub => isActive(sub.path)) || isActive(item.path);
    }
    return isActive(item.path);
  };

  // Sidebar Component
  const Sidebar = () => (
    <aside
      className={`fixed left-0 top-0 z-40 h-screen transition-all duration-300 ease-in-out ${sidebarCollapsed ? 'w-20' : 'w-72'
        } ${theme === 'dark'
          ? 'bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 border-r border-slate-800/50'
          : 'bg-gradient-to-b from-white via-white to-slate-50 border-r border-slate-200 shadow-xl'
        }`}
    >
      {/* Logo Section - Shop Branding */}
      <div className={`flex items-center h-16 px-4 border-b ${theme === 'dark' ? 'border-slate-800/50' : 'border-slate-200'}`}>
        <Link to="/" className="flex items-center gap-3 group">
          {user?.role === 'SUPER_ADMIN' && !isViewingShop ? (
            // SUPER_ADMIN not viewing a shop: Show Ecosystem branding
            <>
              <div className="relative flex-shrink-0">
                <img src={ecosystemLogo} alt="Eco System" className="w-10 h-10 object-contain" />
              </div>
              {!sidebarCollapsed && (
                <div className="flex flex-col overflow-hidden">
                  <span className={`text-base font-bold whitespace-nowrap ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                    Eco System
                  </span>
                  <span className={`text-[9px] -mt-0.5 tracking-wider uppercase whitespace-nowrap ${theme === 'dark' ? 'text-white/70' : 'text-slate-600'}`}>
                    NEBULAINFINITE
                  </span>
                </div>
              )}
            </>
          ) : (
            // Regular users OR SUPER_ADMIN viewing a shop: Show Shop branding
            <>
              <div className="relative flex-shrink-0">
                {branding.logo ? (
                  <img src={branding.logo} alt="Shop Logo" className="w-10 h-10 object-contain" />
                ) : (
                  <div className="relative w-10 h-10 rounded-xl overflow-hidden shadow-lg bg-gradient-to-br from-emerald-500 to-blue-600 flex items-center justify-center">
                    <Building className="w-6 h-6 text-white" />
                  </div>
                )}
              </div>
              {!sidebarCollapsed && (
                <div className="flex flex-col overflow-hidden">
                  <span className={`text-base font-bold whitespace-nowrap ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                    {branding.name || 'ECOTEC'}
                  </span>
                  {branding.subName && (
                    <span className={`text-[9px] -mt-0.5 tracking-wider uppercase whitespace-nowrap ${theme === 'dark' ? 'text-white/70' : 'text-slate-600'}`}>
                      {branding.subName.toUpperCase()}
                    </span>
                  )}
                </div>
              )}
            </>
          )}
        </Link>
      </div>

      {/* Navigation */}
      <nav ref={sidebarNavRef} className="flex flex-col h-[calc(100%-4rem)] px-3 py-4 overflow-y-auto overflow-x-hidden">
        {/* Main Navigation */}
        <div className="flex-1 space-y-1">
          {!sidebarCollapsed && (
            <span className={`px-3 text-[10px] font-semibold uppercase tracking-wider ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>
              Main Menu
            </span>
          )}
          {/* Loading Skeleton for nav items */}
          {sectionsLoading ? (
            <div className="mt-2 space-y-2">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className={`flex items-center gap-3 px-3 py-2.5 rounded-xl ${
                  theme === 'dark' ? 'bg-slate-800/30' : 'bg-slate-100'
                }`}>
                  <div className={`w-5 h-5 rounded ${theme === 'dark' ? 'bg-slate-700' : 'bg-slate-200'} animate-pulse`} />
                  {!sidebarCollapsed && (
                    <div className={`h-4 rounded flex-1 ${theme === 'dark' ? 'bg-slate-700' : 'bg-slate-200'} animate-pulse`} />
                  )}
                </div>
              ))}
            </div>
          ) : (
          <div className="mt-2 space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const hasSubItems = item.subItems && item.subItems.length > 0;
              const isExpanded = expandedMenus.includes(item.path);
              const parentActive = isParentActive(item);
              const exactActive = isExactActive(item.path);
              const isItemDisabled = item.isDisabled;

              return (
                <div key={item.path} className="relative">
                  {/* Parent Menu Item */}
                  {hasSubItems ? (
                    <div
                      data-menu-id={item.path}
                      onClick={(e) => {
                        e.stopPropagation();
                        // Allow interaction even for disabled items (SuperAdmin can navigate)
                        if (sidebarCollapsed) {
                          const rect = e.currentTarget.getBoundingClientRect();
                          setPopoverPosition(rect.top);
                          setCollapsedPopover(collapsedPopover === item.path ? null : item.path);
                        } else {
                          toggleMenu(item.path);
                        }
                      }}
                      className={`group relative flex items-center gap-3 px-3 py-2.5 rounded-xl font-medium transition-all duration-200 ${
                        parentActive
                          ? theme === 'dark'
                            ? 'bg-gradient-to-r from-emerald-500/20 to-blue-500/10 text-emerald-400 shadow-lg shadow-emerald-500/10 cursor-pointer'
                            : 'bg-gradient-to-r from-emerald-500/10 to-blue-500/5 text-emerald-600 shadow-lg shadow-emerald-500/10 cursor-pointer'
                          : theme === 'dark'
                            ? 'text-slate-400 hover:text-white hover:bg-slate-800/50 cursor-pointer'
                            : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 cursor-pointer'
                      }`}
                      title={sidebarCollapsed ? item.label : undefined}
                    >
                      {/* Active indicator bar */}
                      {parentActive && (
                        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-gradient-to-b from-emerald-500 to-blue-500 rounded-r-full" />
                      )}

                      <Icon className={`w-5 h-5 flex-shrink-0 transition-transform ${
                        parentActive 
                          ? 'text-emerald-500 group-hover:scale-110' 
                          : 'group-hover:scale-110'
                      }`} />

                      {!sidebarCollapsed && (
                        <>
                          <span className="flex-1">
                            {item.label}
                          </span>
                          {isItemDisabled && (
                            <span className={`px-2 py-0.5 text-[10px] font-medium rounded-full ${
                              theme === 'dark'
                                ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                                : 'bg-amber-100 text-amber-700 border border-amber-200'
                            }`}>
                              Hidden
                            </span>
                          )}
                          {item.badge && (
                            <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${theme === 'dark'
                                ? 'bg-emerald-500/20 text-emerald-400'
                                : 'bg-emerald-100 text-emerald-600'
                              }`}>
                              {item.badge}
                            </span>
                          )}
                          <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''
                            } ${parentActive ? 'text-emerald-500' : ''}`} />
                        </>
                      )}

                      {/* Click-based Popover for collapsed sidebar with sub-items */}
                      {sidebarCollapsed && collapsedPopover === item.path && (
                        <div
                          ref={popoverRef}
                          className={`fixed left-[84px] px-0 py-2 rounded-xl text-sm font-medium whitespace-nowrap z-[100] min-w-[200px] shadow-2xl animate-in fade-in slide-in-from-left-2 zoom-in-95 duration-200 ${theme === 'dark' ? 'bg-slate-800/95 backdrop-blur-xl text-white border border-slate-700/50' : 'bg-white/95 backdrop-blur-xl text-slate-900 border border-slate-200'
                            }`}
                          style={{
                            top: `${Math.min(popoverPosition, window.innerHeight - 280)}px`
                          }}
                          onClick={(e) => e.stopPropagation()}
                        >
                          {/* Arrow Pointer */}
                          <div className={`absolute -left-2 top-4 w-0 h-0 border-y-8 border-y-transparent border-r-8 ${theme === 'dark' ? 'border-r-slate-700/50' : 'border-r-slate-200'
                            }`} />
                          <div className={`absolute -left-[6px] top-4 w-0 h-0 border-y-8 border-y-transparent border-r-8 ${theme === 'dark' ? 'border-r-slate-800/95' : 'border-r-white/95'
                            }`} />

                          {/* Popover Header */}
                          <div className={`px-4 py-2.5 border-b ${theme === 'dark' ? 'border-slate-700/50' : 'border-slate-200'}`}>
                            <div className="flex items-center gap-2">
                              <div className={`p-1.5 rounded-lg ${theme === 'dark' ? 'bg-emerald-500/20' : 'bg-emerald-50'}`}>
                                <Icon className="w-4 h-4 text-emerald-500" />
                              </div>
                              <span className="font-semibold">{item.label}</span>
                            </div>
                          </div>

                          {/* Sub Items */}
                          <div className="mt-1 mx-2">
                            {item.subItems?.map((subItem) => {
                              const SubIcon = subItem.icon;
                              const subActive = isActive(subItem.path);
                              return (
                                <Link
                                  key={subItem.path}
                                  to={subItem.path}
                                  className={`flex items-center gap-2 px-2 py-2 rounded-lg transition-colors ${subActive
                                      ? theme === 'dark' ? 'text-emerald-400 bg-emerald-500/20' : 'text-emerald-600 bg-emerald-50'
                                      : theme === 'dark' ? 'hover:bg-slate-700 text-slate-300' : 'hover:bg-slate-100 text-slate-600'
                                    }`}
                                  onClick={() => setCollapsedPopover(null)}
                                >
                                  <SubIcon className={`w-4 h-4 ${subActive ? 'text-emerald-500' : ''}`} />
                                  {subItem.label}
                                </Link>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <Link
                      to={item.path}
                      className={`group relative flex items-center gap-3 px-3 py-2.5 rounded-xl font-medium transition-all duration-200 ${exactActive
                          ? theme === 'dark'
                            ? 'bg-gradient-to-r from-emerald-500/20 to-blue-500/10 text-emerald-400 shadow-lg shadow-emerald-500/10'
                            : 'bg-gradient-to-r from-emerald-500/10 to-blue-500/5 text-emerald-600 shadow-lg shadow-emerald-500/10'
                          : theme === 'dark'
                            ? 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                            : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                        }`}
                      title={sidebarCollapsed ? item.label : undefined}
                    >
                      {/* Active indicator bar */}
                      {exactActive && (
                        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-gradient-to-b from-emerald-500 to-blue-500 rounded-r-full" />
                      )}

                      <Icon className={`w-5 h-5 flex-shrink-0 transition-transform group-hover:scale-110 ${exactActive ? 'text-emerald-500' : ''
                        }`} />

                      {!sidebarCollapsed && (
                        <>
                          <span className="flex-1">{item.label}</span>
                          {isItemDisabled && (
                            <span className={`px-2 py-0.5 text-[10px] font-medium rounded-full ${
                              theme === 'dark'
                                ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                                : 'bg-amber-100 text-amber-700 border border-amber-200'
                            }`}>
                              Hidden
                            </span>
                          )}
                          {item.badge && (
                            <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${theme === 'dark'
                                ? 'bg-emerald-500/20 text-emerald-400'
                                : 'bg-emerald-100 text-emerald-600'
                              }`}>
                              {item.badge}
                            </span>
                          )}
                        </>
                      )}

                      {/* Tooltip for collapsed sidebar */}
                      {sidebarCollapsed && (
                        <div className={`absolute left-full ml-2 px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50 ${theme === 'dark' ? 'bg-slate-800 text-white shadow-xl' : 'bg-slate-900 text-white shadow-xl'
                          }`}>
                          {item.label}
                          {item.badge && (
                            <span className="ml-2 px-1.5 py-0.5 text-[10px] bg-emerald-500 text-white rounded-full">
                              {item.badge}
                            </span>
                          )}
                        </div>
                      )}
                    </Link>
                  )}

                  {/* Sub Items - Expanded Desktop */}
                  {hasSubItems && isExpanded && !sidebarCollapsed && (
                    <div className={`ml-4 mt-1 pl-4 border-l-2 space-y-1 ${theme === 'dark' ? 'border-slate-700' : 'border-slate-200'
                      }`}>
                      {item.subItems?.map((subItem) => {
                        const SubIcon = subItem.icon;
                        const subActive = isActive(subItem.path);
                        const isSubDisabled = subItem.isDisabled;
                        
                        return (
                          <Link
                            key={subItem.path}
                            to={subItem.path}
                            className={`group relative flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${subActive
                                ? theme === 'dark'
                                  ? 'bg-emerald-500/10 text-emerald-400'
                                  : 'bg-emerald-50 text-emerald-600'
                                : theme === 'dark'
                                  ? 'text-slate-400 hover:text-white hover:bg-slate-800/30'
                                  : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
                              }`}
                          >
                            {subActive && (
                              <div className={`absolute -left-[18px] top-1/2 -translate-y-1/2 w-2 h-2 rounded-full ${theme === 'dark' ? 'bg-emerald-500' : 'bg-emerald-500'
                                }`} />
                            )}
                            <SubIcon className={`w-4 h-4 flex-shrink-0 ${subActive ? 'text-emerald-500' : ''}`} />
                            <span className="flex-1">{subItem.label}</span>
                            {isSubDisabled && (
                              <span className={`px-1.5 py-0.5 text-[9px] font-medium rounded-full ${
                                theme === 'dark'
                                  ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                                  : 'bg-amber-100 text-amber-700 border border-amber-200'
                              }`}>
                                Hidden
                              </span>
                            )}
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          )}
        </div>

        {/* Bottom Section */}
        <div className="pt-4 space-y-1 border-t border-slate-800/30">
          {!sidebarCollapsed && (
            <span className={`px-3 text-[10px] font-semibold uppercase tracking-wider ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>
              Support
            </span>
          )}
          <div className="mt-2 space-y-1">
            {bottomNavItems.map((item) => {
              const Icon = item.icon;
              const hasSubItems = item.subItems && item.subItems.length > 0;
              const isExpanded = expandedMenus.includes(item.path);
              const parentActive = isParentActive(item);
              const exactActive = isExactActive(item.path);
              const isBottomItemDisabled = item.isDisabled;

              return (
                <div key={item.path} className="relative">
                  {hasSubItems ? (
                    <div
                      data-menu-id={item.path}
                      onClick={(e) => {
                        e.stopPropagation();
                        // Allow interaction even for disabled items (SuperAdmin can navigate)
                        if (sidebarCollapsed) {
                          const rect = e.currentTarget.getBoundingClientRect();
                          setPopoverPosition(rect.top);
                          setCollapsedPopover(collapsedPopover === item.path ? null : item.path);
                        } else {
                          toggleMenu(item.path);
                        }
                      }}
                      className={`group relative flex items-center gap-3 px-3 py-2.5 rounded-xl font-medium transition-all duration-200 ${
                        parentActive
                          ? theme === 'dark'
                            ? 'bg-gradient-to-r from-emerald-500/20 to-blue-500/10 text-emerald-400 shadow-lg shadow-emerald-500/10 cursor-pointer'
                            : 'bg-gradient-to-r from-emerald-500/10 to-blue-500/5 text-emerald-600 shadow-lg shadow-emerald-500/10 cursor-pointer'
                          : theme === 'dark'
                            ? 'text-slate-400 hover:text-white hover:bg-slate-800/50 cursor-pointer'
                            : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 cursor-pointer'
                      }`}
                      title={sidebarCollapsed ? item.label : undefined}
                    >
                      {parentActive && (
                        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-gradient-to-b from-emerald-500 to-blue-500 rounded-r-full" />
                      )}

                      <Icon className={`w-5 h-5 flex-shrink-0 transition-transform ${
                        parentActive ? 'text-emerald-500 group-hover:scale-110' : 'group-hover:scale-110'
                      }`} />

                      {!sidebarCollapsed && (
                        <>
                          <span className="flex-1">{item.label}</span>
                          {isBottomItemDisabled && (
                            <span className={`px-2 py-0.5 text-[10px] font-medium rounded-full ${
                              theme === 'dark'
                                ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                                : 'bg-amber-100 text-amber-700 border border-amber-200'
                            }`}>Hidden</span>
                          )}
                          <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''} ${parentActive ? 'text-emerald-500' : ''}`} />
                        </>
                      )}

                      {/* Click-based Popover for collapsed sidebar with sub-items */}
                      {sidebarCollapsed && collapsedPopover === item.path && (
                        <div
                          ref={popoverRef}
                          className={`fixed left-[84px] px-0 py-2 rounded-xl text-sm font-medium whitespace-nowrap z-[100] min-w-[200px] shadow-2xl animate-in fade-in slide-in-from-left-2 zoom-in-95 duration-200 ${theme === 'dark' ? 'bg-slate-800/95 backdrop-blur-xl text-white border border-slate-700/50' : 'bg-white/95 backdrop-blur-xl text-slate-900 border border-slate-200'}`}
                          style={{
                            top: `${Math.min(popoverPosition, window.innerHeight - 280)}px`
                          }}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div className={`absolute -left-2 top-4 w-0 h-0 border-y-8 border-y-transparent border-r-8 ${theme === 'dark' ? 'border-r-slate-700/50' : 'border-r-slate-200'}`} />
                          <div className={`absolute -left-[6px] top-4 w-0 h-0 border-y-8 border-y-transparent border-r-8 ${theme === 'dark' ? 'border-r-slate-800/95' : 'border-r-white/95'}`} />

                          <div className={`px-4 py-2.5 border-b ${theme === 'dark' ? 'border-slate-700/50' : 'border-slate-200'}`}>
                            <div className="flex items-center gap-2">
                              <div className={`p-1.5 rounded-lg ${theme === 'dark' ? 'bg-emerald-500/20' : 'bg-emerald-50'}`}>
                                <Icon className="w-4 h-4 text-emerald-500" />
                              </div>
                              <span className="font-semibold">{item.label}</span>
                            </div>
                          </div>

                          <div className="mt-1 mx-2">
                            {item.subItems?.map((subItem) => {
                              const SubIcon = subItem.icon;
                              const subActive = isActive(subItem.path);
                              return (
                                <Link
                                  key={subItem.path}
                                  to={subItem.path}
                                  className={`flex items-center gap-2 px-2 py-2 rounded-lg transition-colors ${subActive
                                      ? theme === 'dark' ? 'text-emerald-400 bg-emerald-500/20' : 'text-emerald-600 bg-emerald-50'
                                      : theme === 'dark' ? 'hover:bg-slate-700 text-slate-300' : 'hover:bg-slate-100 text-slate-600'
                                    }`}
                                  onClick={() => setCollapsedPopover(null)}
                                >
                                  <SubIcon className={`w-4 h-4 ${subActive ? 'text-emerald-500' : ''}`} />
                                  {subItem.label}
                                </Link>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <Link
                      to={item.path}
                      className={`group relative flex items-center gap-3 px-3 py-2.5 rounded-xl font-medium transition-all duration-200 ${exactActive
                          ? theme === 'dark'
                            ? 'bg-gradient-to-r from-emerald-500/20 to-blue-500/10 text-emerald-400 shadow-lg shadow-emerald-500/10'
                            : 'bg-gradient-to-r from-emerald-500/10 to-blue-500/5 text-emerald-600 shadow-lg shadow-emerald-500/10'
                          : theme === 'dark'
                            ? 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                            : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                        }`}
                      title={sidebarCollapsed ? item.label : undefined}
                    >
                      {exactActive && (
                        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-gradient-to-b from-emerald-500 to-blue-500 rounded-r-full" />
                      )}
                      <Icon className={`w-5 h-5 flex-shrink-0 transition-transform group-hover:scale-110 ${exactActive ? 'text-emerald-500' : ''}`} />
                      {!sidebarCollapsed && (
                        <>
                          <span className="flex-1">{item.label}</span>
                          {isBottomItemDisabled && (
                            <span className={`px-2 py-0.5 text-[10px] font-medium rounded-full ${
                              theme === 'dark'
                                ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                                : 'bg-amber-100 text-amber-700 border border-amber-200'
                            }`}>Hidden</span>
                          )}
                        </>
                      )}

                      {sidebarCollapsed && (
                        <div className={`absolute left-full ml-2 px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50 ${theme === 'dark' ? 'bg-slate-800 text-white shadow-xl' : 'bg-slate-900 text-white shadow-xl'}`}>
                          {item.label}
                        </div>
                      )}
                    </Link>
                  )}

                  {/* Sub Items - Expanded Desktop */}
                  {hasSubItems && isExpanded && !sidebarCollapsed && (
                    <div className={`ml-4 mt-1 pl-4 border-l-2 space-y-1 ${theme === 'dark' ? 'border-slate-700' : 'border-slate-200'}`}>
                      {item.subItems?.map((subItem) => {
                        const SubIcon = subItem.icon;
                        const subActive = isActive(subItem.path);
                        const isSubDisabled = subItem.isDisabled;
                        
                        return (
                          <Link
                            key={subItem.path}
                            to={subItem.path}
                            className={`group relative flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${subActive
                                ? theme === 'dark'
                                  ? 'bg-emerald-500/10 text-emerald-400'
                                  : 'bg-emerald-50 text-emerald-600'
                                : theme === 'dark'
                                  ? 'text-slate-400 hover:text-white hover:bg-slate-800/30'
                                  : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
                              }`}
                          >
                            {subActive && (
                              <div className={`absolute -left-[18px] top-1/2 -translate-y-1/2 w-2 h-2 rounded-full ${theme === 'dark' ? 'bg-emerald-500' : 'bg-emerald-500'}`} />
                            )}
                            <SubIcon className={`w-4 h-4 flex-shrink-0 ${subActive ? 'text-emerald-500' : ''}`} />
                            <span className="flex-1">{subItem.label}</span>
                            {isSubDisabled && (
                              <span className={`px-1.5 py-0.5 text-[9px] font-medium rounded-full ${
                                theme === 'dark'
                                  ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                                  : 'bg-amber-100 text-amber-700 border border-amber-200'
                              }`}>
                                Hidden
                              </span>
                            )}
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Collapse Button */}
        {!isMobile && (
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className={`mt-4 w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl transition-all ${theme === 'dark'
                ? 'bg-slate-800/30 hover:bg-slate-800/50 text-slate-400'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
              }`}
          >
            {sidebarCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
            {!sidebarCollapsed && <span className="text-sm">Collapse</span>}
          </button>
        )}
      </nav>
    </aside>
  );

  // Mobile Sidebar Overlay
  const MobileSidebar = () => (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 bg-black/60 backdrop-blur-sm z-40 transition-opacity duration-300 ${mobileSidebarOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
          }`}
        onClick={() => setMobileSidebarOpen(false)}
      />

      {/* Sidebar */}
      <aside
        className={`fixed left-0 top-0 z-50 h-screen w-72 transition-transform duration-300 ease-in-out ${mobileSidebarOpen ? 'translate-x-0' : '-translate-x-full'
          } ${theme === 'dark'
            ? 'bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950'
            : 'bg-white'
          }`}
      >
        {/* Close button */}
        <button
          onClick={() => setMobileSidebarOpen(false)}
          className={`absolute right-4 top-4 p-2 rounded-lg ${theme === 'dark' ? 'hover:bg-slate-800 text-slate-400' : 'hover:bg-slate-100 text-slate-600'
            }`}
        >
          <X className="w-5 h-5" />
        </button>

        {/* Logo - Shop Branding / Ecosystem Branding */}
        <div className="flex items-center gap-3 px-6 h-16">
          {user?.role === 'SUPER_ADMIN' ? (
            // SUPER_ADMIN: Show Ecosystem branding
            <>
              <div className="flex-shrink-0">
                <img src={ecosystemLogo} alt="Eco System" className="w-10 h-10 object-contain" />
              </div>
              <div className="flex flex-col">
                <span className={`text-base font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                  Eco System
                </span>
                <span className={`text-[9px] -mt-0.5 tracking-wider uppercase ${theme === 'dark' ? 'text-white/70' : 'text-slate-600'}`}>
                  NEBULAINFINITE
                </span>
              </div>
            </>
          ) : (
            // Regular users: Show Shop branding
            <>
              <div className="flex-shrink-0">
                {branding.logo ? (
                  <img src={branding.logo} alt="Shop Logo" className="w-10 h-10 object-contain" />
                ) : (
                  <div className="w-10 h-10 rounded-xl overflow-hidden shadow-lg bg-gradient-to-br from-emerald-500 to-blue-600 flex items-center justify-center">
                    <Building className="w-6 h-6 text-white" />
                  </div>
                )}
              </div>
              <div className="flex flex-col">
                <span className={`text-base font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                  {branding.name || 'ECOTEC'}
                </span>
                {branding.subName && (
                  <span className={`text-[9px] -mt-0.5 tracking-wider uppercase ${theme === 'dark' ? 'text-white/70' : 'text-slate-600'}`}>
                    {branding.subName.toUpperCase()}
                  </span>
                )}
              </div>
            </>
          )}
        </div>

        {/* Navigation */}
        <nav ref={mobileSidebarNavRef} className="px-3 py-4 space-y-1 overflow-y-auto max-h-[calc(100vh-5rem)]">
          {/* Loading Skeleton for mobile nav */}
          {sectionsLoading ? (
            <div className="space-y-2">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className={`flex items-center gap-3 px-3 py-2.5 rounded-xl ${
                  theme === 'dark' ? 'bg-slate-800/30' : 'bg-slate-100'
                }`}>
                  <div className={`w-5 h-5 rounded ${theme === 'dark' ? 'bg-slate-700' : 'bg-slate-200'} animate-pulse`} />
                  <div className={`h-4 rounded flex-1 ${theme === 'dark' ? 'bg-slate-700' : 'bg-slate-200'} animate-pulse`} />
                </div>
              ))}
            </div>
          ) : (
          <>
          {navItems.map((item) => {
            const Icon = item.icon;
            const hasSubItems = item.subItems && item.subItems.length > 0;
            const isExpanded = expandedMenus.includes(item.path);
            const parentActive = isParentActive(item);
            const exactActive = isExactActive(item.path);

            return (
              <div key={item.path}>
                {hasSubItems ? (
                  <>
                    <div
                      onClick={() => toggleMenu(item.path)}
                      className={`relative flex items-center gap-3 px-3 py-2.5 rounded-xl font-medium transition-all cursor-pointer ${parentActive
                          ? theme === 'dark'
                            ? 'bg-gradient-to-r from-emerald-500/20 to-blue-500/10 text-emerald-400'
                            : 'bg-gradient-to-r from-emerald-500/10 to-blue-500/5 text-emerald-600'
                          : theme === 'dark'
                            ? 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                            : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                        }`}
                    >
                      {parentActive && (
                        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-gradient-to-b from-emerald-500 to-blue-500 rounded-r-full" />
                      )}
                      <Icon className={`w-5 h-5 ${parentActive ? 'text-emerald-500' : ''}`} />
                      <span className="flex-1">
                        {item.label}
                      </span>
                      {item.badge && (
                        <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${theme === 'dark' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-emerald-100 text-emerald-600'
                          }`}>
                          {item.badge}
                        </span>
                      )}
                      <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''
                        } ${parentActive ? 'text-emerald-500' : ''}`} />
                    </div>

                    {/* Sub Items */}
                    {isExpanded && (
                      <div className={`ml-4 mt-1 pl-4 border-l-2 space-y-1 ${theme === 'dark' ? 'border-slate-700' : 'border-slate-200'
                        }`}>
                        {item.subItems?.map((subItem) => {
                          const SubIcon = subItem.icon;
                          const subActive = isActive(subItem.path);
                          return (
                            <Link
                              key={subItem.path}
                              to={subItem.path}
                              onClick={() => setMobileSidebarOpen(false)}
                              className={`relative flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all ${subActive
                                  ? theme === 'dark'
                                    ? 'bg-emerald-500/10 text-emerald-400'
                                    : 'bg-emerald-50 text-emerald-600'
                                  : theme === 'dark'
                                    ? 'text-slate-400 hover:text-white hover:bg-slate-800/30'
                                    : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
                                }`}
                            >
                              {subActive && (
                                <div className={`absolute -left-[18px] top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-emerald-500`} />
                              )}
                              <SubIcon className={`w-4 h-4 ${subActive ? 'text-emerald-500' : ''}`} />
                              <span>{subItem.label}</span>
                            </Link>
                          );
                        })}
                      </div>
                    )}
                  </>
                ) : (
                  <Link
                    to={item.path}
                    onClick={() => setMobileSidebarOpen(false)}
                    className={`relative flex items-center gap-3 px-3 py-2.5 rounded-xl font-medium transition-all ${exactActive
                        ? theme === 'dark'
                          ? 'bg-gradient-to-r from-emerald-500/20 to-blue-500/10 text-emerald-400'
                          : 'bg-gradient-to-r from-emerald-500/10 to-blue-500/5 text-emerald-600'
                        : theme === 'dark'
                          ? 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                      }`}
                  >
                    {exactActive && (
                      <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-gradient-to-b from-emerald-500 to-blue-500 rounded-r-full" />
                    )}
                    <Icon className={`w-5 h-5 ${exactActive ? 'text-emerald-500' : ''}`} />
                    <span className="flex-1">{item.label}</span>
                    {item.badge && (
                      <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${theme === 'dark' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-emerald-100 text-emerald-600'
                        }`}>
                        {item.badge}
                      </span>
                    )}
                  </Link>
                )}
              </div>
            );
          })}
          </>
          )}

          <div className={`my-4 border-t ${theme === 'dark' ? 'border-slate-800' : 'border-slate-200'}`} />

          {bottomNavItems.map((item) => {
            const Icon = item.icon;
            const hasSubItems = item.subItems && item.subItems.length > 0;
            const isExpanded = expandedMenus.includes(item.path);
            const parentActive = isParentActive(item);
            const exactActive = isExactActive(item.path);

            return (
              <div key={item.path}>
                {hasSubItems ? (
                  <>
                    <div
                      onClick={() => toggleMenu(item.path)}
                      className={`relative flex items-center gap-3 px-3 py-2.5 rounded-xl font-medium transition-all cursor-pointer ${parentActive
                          ? theme === 'dark'
                            ? 'bg-gradient-to-r from-emerald-500/20 to-blue-500/10 text-emerald-400'
                            : 'bg-gradient-to-r from-emerald-500/10 to-blue-500/5 text-emerald-600'
                          : theme === 'dark'
                            ? 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                            : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                        }`}
                    >
                      {parentActive && (
                        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-gradient-to-b from-emerald-500 to-blue-500 rounded-r-full" />
                      )}
                      <Icon className={`w-5 h-5 ${parentActive ? 'text-emerald-500' : ''}`} />
                      <span className="flex-1">{item.label}</span>
                      <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''} ${parentActive ? 'text-emerald-500' : ''}`} />
                    </div>

                    {/* Sub Items */}
                    {isExpanded && (
                      <div className={`ml-4 mt-1 pl-4 border-l-2 space-y-1 ${theme === 'dark' ? 'border-slate-700' : 'border-slate-200'}`}>
                        {item.subItems?.map((subItem) => {
                          const SubIcon = subItem.icon;
                          const subActive = isActive(subItem.path);
                          return (
                            <Link
                              key={subItem.path}
                              to={subItem.path}
                              onClick={() => setMobileSidebarOpen(false)}
                              className={`relative flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all ${subActive
                                  ? theme === 'dark'
                                    ? 'bg-emerald-500/10 text-emerald-400'
                                    : 'bg-emerald-50 text-emerald-600'
                                  : theme === 'dark'
                                    ? 'text-slate-400 hover:text-white hover:bg-slate-800/30'
                                    : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
                                }`}
                            >
                              {subActive && (
                                <div className={`absolute -left-[18px] top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-emerald-500`} />
                              )}
                              <SubIcon className={`w-4 h-4 ${subActive ? 'text-emerald-500' : ''}`} />
                              <span>{subItem.label}</span>
                            </Link>
                          );
                        })}
                      </div>
                    )}
                  </>
                ) : (
                  <Link
                    to={item.path}
                    onClick={() => setMobileSidebarOpen(false)}
                    className={`relative flex items-center gap-3 px-3 py-2.5 rounded-xl font-medium transition-all ${exactActive
                        ? theme === 'dark'
                          ? 'bg-gradient-to-r from-emerald-500/20 to-blue-500/10 text-emerald-400'
                          : 'bg-gradient-to-r from-emerald-500/10 to-blue-500/5 text-emerald-600'
                        : theme === 'dark'
                          ? 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                      }`}
                  >
                    {exactActive && (
                      <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-gradient-to-b from-emerald-500 to-blue-500 rounded-r-full" />
                    )}
                    <Icon className={`w-5 h-5 ${exactActive ? 'text-emerald-500' : ''}`} />
                    <span>{item.label}</span>
                  </Link>
                )}
              </div>
            );
          })}
        </nav>
      </aside>
    </>
  );

  return (
    <div className={`min-h-screen overflow-x-hidden transition-colors duration-300 ${theme === 'dark' ? 'bg-[#0a0f1a]' : 'bg-slate-100'}`}>
      {/* Ambient background effects - only in dark mode */}
      <div className={`fixed inset-0 overflow-hidden pointer-events-none transition-opacity duration-300 ${theme === 'dark' ? 'opacity-100' : 'opacity-0'}`}>
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-emerald-500/10 rounded-full blur-[120px]" />
        <div className="absolute top-1/2 -left-40 w-80 h-80 bg-blue-500/10 rounded-full blur-[100px]" />
        <div className="absolute -bottom-40 right-1/3 w-72 h-72 bg-purple-500/10 rounded-full blur-[100px]" />
      </div>

      {/* Desktop Sidebar */}
      {!isMobile && <Sidebar />}

      {/* Mobile Sidebar */}
      {isMobile && <MobileSidebar />}

      {/* Main Content */}
      <div className={`transition-all duration-300 ${!isMobile ? (sidebarCollapsed ? 'ml-20' : 'ml-72') : 'ml-0'}`}>
        {/* Top Header */}
        <header className={`sticky top-0 z-30 h-16 border-b backdrop-blur-xl transition-colors duration-300 ${theme === 'dark' ? 'border-slate-800/50 bg-[#0a0f1a]/80' : 'border-slate-200 bg-white/90'
          }`}>
          <div className="flex items-center justify-between h-full px-4 lg:px-6">
            {/* Left side */}
            <div className="flex items-center gap-4">
              {isMobile && (
                <button
                  onClick={() => setMobileSidebarOpen(true)}
                  className={`p-2 rounded-lg ${theme === 'dark' ? 'hover:bg-slate-800 text-slate-400' : 'hover:bg-slate-100 text-slate-600'
                    }`}
                >
                  <Menu className="w-5 h-5" />
                </button>
              )}

              {/* Search Bar */}
              <div className={`hidden sm:flex items-center gap-2 px-4 py-2 rounded-xl border ${theme === 'dark'
                  ? 'bg-slate-800/30 border-slate-700/50'
                  : 'bg-white border-slate-200'
                }`}>
                <Search className={`w-4 h-4 ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`} />
                <input
                  type="text"
                  placeholder="Search products, invoices..."
                  className={`bg-transparent border-none outline-none w-64 text-sm ${theme === 'dark' ? 'text-white placeholder-slate-500' : 'text-slate-900 placeholder-slate-400'
                    }`}
                />
              </div>
            </div>

            {/* Center - Ecosystem Branding (hidden for SUPER_ADMIN) */}
            {user?.role !== 'SUPER_ADMIN' && (
              <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 hidden md:flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg overflow-hidden">
                  <img src={ecosystemLogo} alt="Eco System" className="w-full h-full object-contain" />
                </div>
                <div className="flex flex-col">
                  <span className={`text-base font-bold tracking-wide ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                    Eco System
                  </span>
                  <span className={`text-[9px] -mt-0.5 tracking-wider uppercase ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>
                    NEBULAINFINITE
                  </span>
                </div>
              </div>
            )}

            {/* Right side */}
            <div className="flex items-center gap-3">
              {/* Pro Badge */}
              <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-emerald-500/10 to-blue-500/10 rounded-full border border-emerald-500/20">
                <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-xs font-medium text-emerald-400">Pro</span>
              </div>

              {/* Notifications */}
              <button className={`relative p-2.5 rounded-xl border transition-all ${theme === 'dark'
                  ? 'bg-slate-800/30 border-slate-700/50 hover:bg-slate-700/50 text-slate-400'
                  : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-600'
                }`}>
                <Bell className="w-5 h-5" />
                {notificationCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-gradient-to-r from-emerald-500 to-blue-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
                    {notificationCount}
                  </span>
                )}
              </button>

              {/* Theme Toggle */}
              <button
                onClick={toggleTheme}
                className={`relative p-2.5 rounded-xl border transition-all ${theme === 'dark'
                    ? 'bg-slate-800/30 border-slate-700/50 hover:bg-slate-700/50'
                    : 'bg-white border-slate-200 hover:bg-slate-50'
                  }`}
              >
                <Sun className={`w-5 h-5 text-amber-500 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 transition-all duration-300 ${theme === 'dark' ? 'opacity-0 rotate-90 scale-0' : 'opacity-100 rotate-0 scale-100'}`} />
                <Moon className={`w-5 h-5 text-blue-400 transition-all duration-300 ${theme === 'dark' ? 'opacity-100 rotate-0 scale-100' : 'opacity-0 -rotate-90 scale-0'}`} />
              </button>

              {/* AI Auto-Fill Toggle */}
              <button
                onClick={toggleAiAutoFill}
                title={aiAutoFillEnabled ? 'AI Auto-Fill: ON' : 'AI Auto-Fill: OFF'}
                className={`relative p-2.5 rounded-xl border transition-all group ${aiAutoFillEnabled
                    ? theme === 'dark'
                      ? 'bg-gradient-to-r from-emerald-500/20 to-blue-500/20 border-emerald-500/30 hover:from-emerald-500/30 hover:to-blue-500/30'
                      : 'bg-gradient-to-r from-emerald-50 to-blue-50 border-emerald-200 hover:from-emerald-100 hover:to-blue-100'
                    : theme === 'dark'
                      ? 'bg-slate-800/30 border-slate-700/50 hover:bg-slate-700/50'
                      : 'bg-white border-slate-200 hover:bg-slate-50'
                  }`}
              >
                <div className="relative">
                  <Brain className={`w-5 h-5 transition-colors ${aiAutoFillEnabled
                      ? 'text-emerald-500'
                      : theme === 'dark' ? 'text-slate-500' : 'text-slate-400'
                    }`} />
                  {aiAutoFillEnabled && (
                    <Zap className="w-2.5 h-2.5 text-amber-400 absolute -top-1 -right-1" />
                  )}
                </div>
                {/* Tooltip */}
                <div className={`absolute top-full mt-2 right-0 px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50 ${theme === 'dark' ? 'bg-slate-800 text-white shadow-xl border border-slate-700' : 'bg-slate-900 text-white shadow-xl'
                  }`}>
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${aiAutoFillEnabled ? 'bg-emerald-500' : 'bg-slate-500'}`} />
                    AI Auto-Fill: {aiAutoFillEnabled ? 'ON' : 'OFF'}
                  </div>
                  <p className={`mt-1 text-[10px] ${theme === 'dark' ? 'text-slate-400' : 'text-slate-300'}`}>
                    Click to {aiAutoFillEnabled ? 'disable' : 'enable'}
                  </p>
                </div>
              </button>

              {/* Profile Dropdown */}
              <div className="relative z-50">
                <button
                  onClick={(e) => { e.stopPropagation(); setProfileDropdownOpen(!profileDropdownOpen); }}
                  className={`flex items-center gap-3 px-3 py-2 rounded-xl border transition-all ${theme === 'dark'
                      ? 'bg-slate-800/30 border-slate-700/50 hover:bg-slate-700/50'
                      : 'bg-white border-slate-200 hover:bg-slate-50'
                    }`}
                >
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-blue-600 flex items-center justify-center">
                    <User className="w-4 h-4 text-white" />
                  </div>
                  <div className="hidden md:block text-left">
                    <p className={`text-sm font-medium ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>{user?.role || 'User'}</p>
                    <p className={`text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>{user?.shop?.name || 'No Shop'}</p>
                  </div>
                  <ChevronDown className={`w-4 h-4 transition-transform ${profileDropdownOpen ? 'rotate-180' : ''} ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`} />
                </button>

                {/* Dropdown Menu */}
                {profileDropdownOpen && (
                  <div className={`absolute right-0 top-full mt-2 w-56 rounded-xl border shadow-xl overflow-hidden ${theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
                    }`}>
                    <div className={`px-4 py-3 border-b ${theme === 'dark' ? 'border-slate-800' : 'border-slate-100'}`}>
                      <p className={`text-sm font-medium ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>{user?.name || 'User'}</p>
                      <p className={`text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>{user?.email || 'user@email.com'}</p>
                      {user?.shop && (
                        <p className={`text-xs mt-1 ${theme === 'dark' ? 'text-emerald-400' : 'text-emerald-600'}`}>{user.shop.name}</p>
                      )}
                    </div>
                    <div className="py-2">
                      <Link to="/settings" className={`flex items-center gap-3 px-4 py-2 text-sm ${theme === 'dark' ? 'text-slate-300 hover:bg-slate-800' : 'text-slate-700 hover:bg-slate-50'
                        }`}>
                        <Settings className="w-4 h-4" />
                        Settings
                      </Link>
                      <Link to="/help" className={`flex items-center gap-3 px-4 py-2 text-sm ${theme === 'dark' ? 'text-slate-300 hover:bg-slate-800' : 'text-slate-700 hover:bg-slate-50'
                        }`}>
                        <HelpCircle className="w-4 h-4" />
                        Help & Support
                      </Link>
                      <div className={`border-t my-2 ${theme === 'dark' ? 'border-slate-800' : 'border-slate-100'}`}></div>
                      <button 
                        onClick={handleLogout}
                        className={`flex items-center gap-3 px-4 py-2 text-sm w-full ${theme === 'dark' ? 'text-red-400 hover:bg-slate-800' : 'text-red-600 hover:bg-red-50'
                        }`}>
                        <LogOut className="w-4 h-4" />
                        Logout
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </header>

        {/* Viewing Shop Banner for SUPER_ADMIN */}
        {isViewingShop && viewingShop && (
          <div className="sticky top-16 z-20 bg-gradient-to-r from-purple-600 to-pink-600 text-white px-4 py-2.5 shadow-lg">
            <div className="flex items-center justify-between max-w-screen-2xl mx-auto">
              <div className="flex items-center gap-3">
                <Shield className="w-5 h-5" />
                <span className="font-medium">
                  Viewing as Super Admin: <span className="font-bold">{viewingShop.name}</span>
                </span>
                <span className="text-purple-200 text-sm">(@{viewingShop.slug})</span>
              </div>
              <button
                onClick={handleExitViewingShop}
                className="flex items-center gap-2 px-4 py-1.5 bg-white/20 hover:bg-white/30 rounded-lg font-medium transition-all"
              >
                <X className="w-4 h-4" />
                Exit View
              </button>
            </div>
          </div>
        )}

        {/* Page Content */}
        <main className="p-4 lg:p-6">
          {children}
        </main>
      </div>

      {/* AI Assistant - Floating Chat */}
      <AIAssistant />
    </div>
  );
};
