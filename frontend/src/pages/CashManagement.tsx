import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTheme } from '../contexts/ThemeContext';
import logo from '../assets/logo.jpg';
import * as XLSX from 'xlsx';
import { 
  mockCashAccounts, 
  mockCashTransactions,
  mockInvoices,
  mockGRNs,
  expenseCategories 
} from '../data/mockData';
import type {
  CashAccount,
  CashTransaction,
  CashAccountType,
  CashTransactionType
} from '../data/mockData';
import { CashTransactionModal } from '../components/modals/CashTransactionModal';
import { DeleteConfirmationModal } from '../components/modals/DeleteConfirmationModal';
import { SearchableSelect } from '../components/ui/searchable-select';
import { 
  Wallet, Plus, Edit, Trash2, Search, ArrowDownCircle, ArrowUpCircle, 
  ArrowLeftRight, Filter, ChevronLeft, ChevronRight, ChevronsLeft, 
  ChevronsRight, Banknote, Building2, PiggyBank, TrendingUp, TrendingDown,
  Clock, Tag, FileText, MoreVertical, RefreshCw, List, LayoutGrid,
  SortAsc, SortDesc, Calendar, Receipt, Package, 
  CreditCard, DollarSign, BarChart3, Eye, ChevronDown,
  Truck, HandCoins, BadgePercent, AlertTriangle,
  CheckCircle2, FileSpreadsheet, Printer, Download, Landmark, 
  CircleDollarSign, Coins, Settings
} from 'lucide-react';
import { AccountFormModal } from '../components/modals/AccountFormModal';
import { AccountDetailModal } from '../components/modals/AccountDetailModal';

type ViewMode = 'grid' | 'table';
type TabView = 'transactions' | 'insights' | 'accounts';
type DateRange = 'today' | 'week' | 'month' | 'year' | 'custom';

const getAccountIcon = (type: CashAccountType) => {
  switch (type) {
    case 'drawer': return Banknote;
    case 'cash_in_hand': return HandCoins;
    case 'business': return Building2;
    case 'bank': return Landmark;
    case 'mobile_wallet': return Wallet;
    case 'credit_card': return CreditCard;
    case 'savings': return PiggyBank;
    case 'investment': return CircleDollarSign;
    default: return Coins;
  }
};

const getAccountIconJsx = (type: CashAccountType) => {
  switch (type) {
    case 'drawer': return <Banknote className="w-4 h-4 text-amber-500" />;
    case 'cash_in_hand': return <HandCoins className="w-4 h-4 text-emerald-500" />;
    case 'business': return <Building2 className="w-4 h-4 text-blue-500" />;
    case 'bank': return <Landmark className="w-4 h-4 text-indigo-500" />;
    case 'mobile_wallet': return <Wallet className="w-4 h-4 text-purple-500" />;
    case 'credit_card': return <CreditCard className="w-4 h-4 text-rose-500" />;
    case 'savings': return <PiggyBank className="w-4 h-4 text-teal-500" />;
    case 'investment': return <CircleDollarSign className="w-4 h-4 text-cyan-500" />;
    default: return <Coins className="w-4 h-4 text-slate-500" />;
  }
};

const getAccountColor = (type: CashAccountType, theme: string) => {
  switch (type) {
    case 'drawer': 
      return theme === 'dark' 
        ? 'from-amber-500/20 to-orange-500/10 border-amber-500/30' 
        : 'from-amber-50 to-orange-50 border-amber-200';
    case 'cash_in_hand': 
      return theme === 'dark' 
        ? 'from-emerald-500/20 to-green-500/10 border-emerald-500/30' 
        : 'from-emerald-50 to-green-50 border-emerald-200';
    case 'business': 
      return theme === 'dark' 
        ? 'from-blue-500/20 to-indigo-500/10 border-blue-500/30' 
        : 'from-blue-50 to-indigo-50 border-blue-200';
    case 'bank': 
      return theme === 'dark' 
        ? 'from-indigo-500/20 to-violet-500/10 border-indigo-500/30' 
        : 'from-indigo-50 to-violet-50 border-indigo-200';
    case 'mobile_wallet': 
      return theme === 'dark' 
        ? 'from-purple-500/20 to-fuchsia-500/10 border-purple-500/30' 
        : 'from-purple-50 to-fuchsia-50 border-purple-200';
    case 'credit_card': 
      return theme === 'dark' 
        ? 'from-rose-500/20 to-pink-500/10 border-rose-500/30' 
        : 'from-rose-50 to-pink-50 border-rose-200';
    case 'savings': 
      return theme === 'dark' 
        ? 'from-teal-500/20 to-cyan-500/10 border-teal-500/30' 
        : 'from-teal-50 to-cyan-50 border-teal-200';
    case 'investment': 
      return theme === 'dark' 
        ? 'from-cyan-500/20 to-sky-500/10 border-cyan-500/30' 
        : 'from-cyan-50 to-sky-50 border-cyan-200';
    default: 
      return theme === 'dark' 
        ? 'from-slate-500/20 to-slate-600/10 border-slate-500/30' 
        : 'from-slate-50 to-slate-100 border-slate-200';
  }
};

const getAccountIconColor = (type: CashAccountType) => {
  switch (type) {
    case 'drawer': return 'text-amber-500';
    case 'cash_in_hand': return 'text-emerald-500';
    case 'business': return 'text-blue-500';
    case 'bank': return 'text-indigo-500';
    case 'mobile_wallet': return 'text-purple-500';
    case 'credit_card': return 'text-rose-500';
    case 'savings': return 'text-teal-500';
    case 'investment': return 'text-cyan-500';
    default: return 'text-slate-500';
  }
};

const getAccountTypeLabel = (type: CashAccountType) => {
  switch (type) {
    case 'drawer': return 'Cash Drawer';
    case 'cash_in_hand': return 'Cash in Hand';
    case 'business': return 'Business Fund';
    case 'bank': return 'Bank Account';
    case 'mobile_wallet': return 'Mobile Wallet';
    case 'credit_card': return 'Credit Card';
    case 'savings': return 'Savings Account';
    case 'investment': return 'Investment';
    default: return 'Other';
  }
};

const getTransactionTypeIcon = (type: CashTransactionType) => {
  switch (type) {
    case 'income': return ArrowDownCircle;
    case 'expense': return ArrowUpCircle;
    case 'transfer': return ArrowLeftRight;
    default: return FileText;
  }
};

const getTransactionTypeColor = (type: CashTransactionType, theme: string) => {
  switch (type) {
    case 'income': 
      return theme === 'dark' 
        ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' 
        : 'text-emerald-600 bg-emerald-50 border-emerald-200';
    case 'expense': 
      return theme === 'dark' 
        ? 'text-red-400 bg-red-500/10 border-red-500/20' 
        : 'text-red-600 bg-red-50 border-red-200';
    case 'transfer': 
      return theme === 'dark' 
        ? 'text-blue-400 bg-blue-500/10 border-blue-500/20' 
        : 'text-blue-600 bg-blue-50 border-blue-200';
    default: 
      return theme === 'dark' 
        ? 'text-slate-400 bg-slate-500/10 border-slate-500/20' 
        : 'text-slate-600 bg-slate-50 border-slate-200';
  }
};

export const CashManagement: React.FC = () => {
  const { theme } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();
  
  // Determine active view from URL
  const activeTab: TabView = useMemo(() => {
    if (location.pathname === '/cash-management/transactions') return 'transactions';
    if (location.pathname === '/cash-management/accounts') return 'accounts';
    return 'insights';
  }, [location.pathname]);
  
  const [dateRange, setDateRange] = useState<DateRange>('month');
  
  // Date range options (defined early for use in exports)
  const dateRangeOptions = [
    { value: 'today', label: 'Today' },
    { value: 'week', label: 'This Week' },
    { value: 'month', label: 'This Month' },
    { value: 'year', label: 'This Year' },
  ];
  
  // State
  const [accounts, setAccounts] = useState<CashAccount[]>(mockCashAccounts);
  const [transactions, setTransactions] = useState<CashTransaction[]>(mockCashTransactions);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAccount, setSelectedAccount] = useState<string>('all');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('table');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [showFilters, setShowFilters] = useState(false);
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  
  // Modal states
  const [isTransactionModalOpen, setIsTransactionModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<CashTransaction | null>(null);
  const [transactionToDelete, setTransactionToDelete] = useState<CashTransaction | null>(null);
  
  // Account modal states
  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);
  const [selectedAccountForEdit, setSelectedAccountForEdit] = useState<CashAccount | null>(null);
  const [isDeleteAccountModalOpen, setIsDeleteAccountModalOpen] = useState(false);
  const [accountToDelete, setAccountToDelete] = useState<CashAccount | null>(null);
  const [isAccountDetailModalOpen, setIsAccountDetailModalOpen] = useState(false);
  const [selectedAccountForView, setSelectedAccountForView] = useState<CashAccount | null>(null);
  
  // Account list states (filters, view, pagination)
  const [accountSearchQuery, setAccountSearchQuery] = useState('');
  const [accountTypeFilter, setAccountTypeFilter] = useState<string>('all');
  const [accountStatusFilter, setAccountStatusFilter] = useState<string>('all');
  const [accountViewMode, setAccountViewMode] = useState<ViewMode>('grid');
  const [accountSortOrder, setAccountSortOrder] = useState<'asc' | 'desc'>('desc');
  const [showAccountFilters, setShowAccountFilters] = useState(false);
  const [accountCurrentPage, setAccountCurrentPage] = useState(1);
  const [accountItemsPerPage, setAccountItemsPerPage] = useState(9);
  
  // Action menu
  const [openActionMenu, setOpenActionMenu] = useState<string | null>(null);
  const actionMenuRef = useRef<HTMLDivElement>(null);
  
  // Calendar states
  const [showStartCalendar, setShowStartCalendar] = useState(false);
  const [showEndCalendar, setShowEndCalendar] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState(new Date());
  const startCalendarRef = useRef<HTMLDivElement>(null);
  const endCalendarRef = useRef<HTMLDivElement>(null);
  
  // Summary dropdown
  const [showDateRangeDropdown, setShowDateRangeDropdown] = useState(false);
  const dateRangeRef = useRef<HTMLDivElement>(null);
  
  // Export dropdown for summary
  const [showExportMenu, setShowExportMenu] = useState(false);
  const exportMenuRef = useRef<HTMLDivElement>(null);

  // Close action menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (actionMenuRef.current && !actionMenuRef.current.contains(event.target as Node)) {
        setOpenActionMenu(null);
      }
      if (startCalendarRef.current && !startCalendarRef.current.contains(event.target as Node)) {
        setShowStartCalendar(false);
      }
      if (endCalendarRef.current && !endCalendarRef.current.contains(event.target as Node)) {
        setShowEndCalendar(false);
      }
      if (dateRangeRef.current && !dateRangeRef.current.contains(event.target as Node)) {
        setShowDateRangeDropdown(false);
      }
      if (exportMenuRef.current && !exportMenuRef.current.contains(event.target as Node)) {
        setShowExportMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Reset items per page when view mode changes
  useEffect(() => {
    if (viewMode === 'table') {
      setItemsPerPage(10);
    } else {
      setItemsPerPage(9);
    }
    setCurrentPage(1);
  }, [viewMode]);

  // Auto-adjust account items per page based on view mode
  useEffect(() => {
    if (accountViewMode === 'table') {
      setAccountItemsPerPage(10);
    } else {
      setAccountItemsPerPage(9);
    }
    setAccountCurrentPage(1);
  }, [accountViewMode]);

  // Default to card/grid view when on Transactions tab
  useEffect(() => {
    if (activeTab === 'transactions') {
      setViewMode('grid');
    }
  }, [activeTab]);

  // Format helpers
  const formatCurrency = (amount: number) => `Rs. ${amount.toLocaleString('en-LK')}`;
  
  const formatDateTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return {
      date: date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
      time: date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }),
    };
  };

  const formatDateDisplay = (dateStr: string) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  // Get date range for filtering
  const getDateRangeFilter = useMemo(() => {
    const now = new Date();
    let start = new Date();
    let end = new Date();
    
    switch (dateRange) {
      case 'today':
        start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
        break;
      case 'week':
        const dayOfWeek = now.getDay();
        start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - dayOfWeek);
        end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
        break;
      case 'month':
        start = new Date(now.getFullYear(), now.getMonth(), 1);
        end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
        break;
      case 'year':
        start = new Date(now.getFullYear(), 0, 1);
        end = new Date(now.getFullYear(), 11, 31, 23, 59, 59);
        break;
      default:
        start = new Date(2020, 0, 1);
        end = new Date(now.getFullYear() + 1, 11, 31, 23, 59, 59);
    }
    return { start, end };
  }, [dateRange]);

  // Calculate Financial Summary from Invoices, GRNs, and Transactions
  const financialSummary = useMemo(() => {
    const { start, end } = getDateRangeFilter;
    
    // Invoice Income (Sales)
    const filteredInvoices = mockInvoices.filter(inv => {
      const invDate = new Date(inv.date);
      return invDate >= start && invDate <= end;
    });
    
    const totalInvoiceSales = filteredInvoices.reduce((sum, inv) => sum + inv.total, 0);
    const invoiceCashReceived = filteredInvoices.reduce((sum, inv) => sum + (inv.paidAmount || 0), 0);
    const invoicePendingAmount = totalInvoiceSales - invoiceCashReceived;
    const invoiceCount = filteredInvoices.length;
    const fullPaidInvoices = filteredInvoices.filter(inv => inv.status === 'fullpaid').length;
    const unpaidInvoices = filteredInvoices.filter(inv => inv.status === 'unpaid').length;
    const partialPaidInvoices = filteredInvoices.filter(inv => inv.status === 'halfpay').length;
    
    // GRN Expenses (Purchases)
    const filteredGRNs = mockGRNs.filter(grn => {
      const grnDate = new Date(grn.orderDate);
      return grnDate >= start && grnDate <= end;
    });
    
    const totalGRNPurchases = filteredGRNs.reduce((sum, grn) => sum + grn.totalAmount, 0);
    const grnPaidAmount = filteredGRNs.reduce((sum, grn) => sum + (grn.paidAmount || 0), 0);
    const grnPendingAmount = totalGRNPurchases - grnPaidAmount;
    const grnCount = filteredGRNs.length;
    const grnProductsAdded = filteredGRNs.reduce((sum, grn) => sum + grn.totalAcceptedQuantity, 0);
    
    // Cash Transactions
    const filteredTransactions = transactions.filter(txn => {
      const txnDate = new Date(txn.transactionDate);
      return txnDate >= start && txnDate <= end;
    });
    
    const totalIncome = filteredTransactions
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0);
    
    const totalExpenses = filteredTransactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0);
    
    const totalTransfers = filteredTransactions
      .filter(t => t.type === 'transfer')
      .reduce((sum, t) => sum + t.amount, 0);
    
    // Expense breakdown by category
    const expensesByCategory: { [key: string]: number } = {};
    filteredTransactions
      .filter(t => t.type === 'expense' && t.category)
      .forEach(t => {
        const cat = t.category || 'Other';
        expensesByCategory[cat] = (expensesByCategory[cat] || 0) + t.amount;
      });
    
    // Account balances
    const drawerBalance = accounts.find(a => a.type === 'drawer')?.balance || 0;
    const cashInHandBalance = accounts.find(a => a.type === 'cash_in_hand')?.balance || 0;
    const businessBalance = accounts.find(a => a.type === 'business')?.balance || 0;
    const totalBalance = accounts.reduce((sum, acc) => sum + acc.balance, 0);
    
    // Net cash flow
    const netCashFlow = invoiceCashReceived - grnPaidAmount + totalIncome - totalExpenses;
    
    // Profit estimate (simplified)
    const estimatedProfit = invoiceCashReceived - grnPaidAmount - totalExpenses;
    
    return {
      // Invoice stats
      totalInvoiceSales,
      invoiceCashReceived,
      invoicePendingAmount,
      invoiceCount,
      fullPaidInvoices,
      unpaidInvoices,
      partialPaidInvoices,
      // GRN stats
      totalGRNPurchases,
      grnPaidAmount,
      grnPendingAmount,
      grnCount,
      grnProductsAdded,
      // Transaction stats
      totalIncome,
      totalExpenses,
      totalTransfers,
      expensesByCategory,
      // Account balances
      drawerBalance,
      cashInHandBalance,
      businessBalance,
      totalBalance,
      // Flow stats
      netCashFlow,
      estimatedProfit,
    };
  }, [transactions, accounts, getDateRangeFilter]);

  // Today's transactions
  const todayTransactions = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    return transactions.filter(t => t.transactionDate.startsWith(today));
  }, [transactions]);

  const todayIncome = useMemo(() => {
    return todayTransactions
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0);
  }, [todayTransactions]);

  const todayExpense = useMemo(() => {
    return todayTransactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0);
  }, [todayTransactions]);

  // Filtering
  const filteredTransactions = useMemo(() => {
    return transactions.filter(txn => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        if (
          !txn.name.toLowerCase().includes(query) &&
          !txn.description?.toLowerCase().includes(query) &&
          !txn.transactionNumber.toLowerCase().includes(query) &&
          !txn.category?.toLowerCase().includes(query)
        ) {
          return false;
        }
      }
      
      // Account filter
      if (selectedAccount !== 'all' && txn.accountId !== selectedAccount) {
        return false;
      }
      
      // Type filter
      if (selectedType !== 'all' && txn.type !== selectedType) {
        return false;
      }
      
      // Category filter
      if (selectedCategory !== 'all' && txn.category !== selectedCategory) {
        return false;
      }
      
      // Date filter
      if (startDate) {
        const txnDate = new Date(txn.transactionDate);
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        if (txnDate < start) return false;
      }
      if (endDate) {
        const txnDate = new Date(txn.transactionDate);
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        if (txnDate > end) return false;
      }
      
      return true;
    });
  }, [transactions, searchQuery, selectedAccount, selectedType, selectedCategory, startDate, endDate]);

  // Sorting by date
  const sortedTransactions = useMemo(() => {
    return [...filteredTransactions].sort((a, b) => {
      const dateA = new Date(a.transactionDate).getTime();
      const dateB = new Date(b.transactionDate).getTime();
      return sortOrder === 'asc' ? dateA - dateB : dateB - dateA;
    });
  }, [filteredTransactions, sortOrder]);

  // Pagination
  const totalPages = Math.ceil(sortedTransactions.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedTransactions = sortedTransactions.slice(startIndex, startIndex + itemsPerPage);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedAccount, selectedType, selectedCategory, startDate, endDate]);

  const hasActiveFilters = searchQuery || selectedAccount !== 'all' || selectedType !== 'all' || selectedCategory !== 'all' || startDate || endDate;

  const clearFilters = () => {
    setSearchQuery('');
    setSelectedAccount('all');
    setSelectedType('all');
    setSelectedCategory('all');
    setStartDate('');
    setEndDate('');
  };

  // Account Filtering
  const filteredAccounts = useMemo(() => {
    return accounts.filter(acc => {
      // Search filter
      if (accountSearchQuery) {
        const query = accountSearchQuery.toLowerCase();
        if (
          !acc.name.toLowerCase().includes(query) &&
          !acc.description?.toLowerCase().includes(query) &&
          !acc.bankName?.toLowerCase().includes(query) &&
          !acc.accountNumber?.toLowerCase().includes(query)
        ) {
          return false;
        }
      }
      
      // Type filter
      if (accountTypeFilter !== 'all' && acc.type !== accountTypeFilter) {
        return false;
      }
      
      // Status filter
      if (accountStatusFilter !== 'all') {
        if (accountStatusFilter === 'active' && !acc.isActive) return false;
        if (accountStatusFilter === 'inactive' && acc.isActive) return false;
      }
      
      return true;
    });
  }, [accounts, accountSearchQuery, accountTypeFilter, accountStatusFilter]);

  // Account Sorting
  const sortedAccounts = useMemo(() => {
    return [...filteredAccounts].sort((a, b) => {
      // Sort by balance
      return accountSortOrder === 'asc' ? a.balance - b.balance : b.balance - a.balance;
    });
  }, [filteredAccounts, accountSortOrder]);

  // Account Pagination
  const accountTotalPages = Math.ceil(sortedAccounts.length / accountItemsPerPage);
  const accountStartIndex = (accountCurrentPage - 1) * accountItemsPerPage;
  const paginatedAccounts = sortedAccounts.slice(accountStartIndex, accountStartIndex + accountItemsPerPage);

  // Reset account page when filters change
  useEffect(() => {
    setAccountCurrentPage(1);
  }, [accountSearchQuery, accountTypeFilter, accountStatusFilter]);

  const hasActiveAccountFilters = accountSearchQuery || accountTypeFilter !== 'all' || accountStatusFilter !== 'all';

  const clearAccountFilters = () => {
    setAccountSearchQuery('');
    setAccountTypeFilter('all');
    setAccountStatusFilter('all');
  };

  // Account page numbers
  const getAccountPageNumbers = useMemo(() => {
    const pages: (number | string)[] = [];
    const maxVisiblePages = 5;
    
    if (accountTotalPages <= maxVisiblePages) {
      for (let i = 1; i <= accountTotalPages; i++) pages.push(i);
    } else {
      if (accountCurrentPage <= 3) {
        for (let i = 1; i <= 4; i++) pages.push(i);
        pages.push('...');
        pages.push(accountTotalPages);
      } else if (accountCurrentPage >= accountTotalPages - 2) {
        pages.push(1);
        pages.push('...');
        for (let i = accountTotalPages - 3; i <= accountTotalPages; i++) pages.push(i);
      } else {
        pages.push(1);
        pages.push('...');
        for (let i = accountCurrentPage - 1; i <= accountCurrentPage + 1; i++) pages.push(i);
        pages.push('...');
        pages.push(accountTotalPages);
      }
    }
    return pages;
  }, [accountCurrentPage, accountTotalPages]);

  // Handlers
  const handleAddTransaction = () => {
    setSelectedTransaction(null);
    setIsTransactionModalOpen(true);
  };

  const handleEditTransaction = (transaction: CashTransaction) => {
    setSelectedTransaction(transaction);
    setIsTransactionModalOpen(true);
    setOpenActionMenu(null);
  };

  const handleDeleteClick = (transaction: CashTransaction) => {
    setTransactionToDelete(transaction);
    setIsDeleteModalOpen(true);
    setOpenActionMenu(null);
  };

  const handleSaveTransaction = (transaction: CashTransaction) => {
    if (selectedTransaction) {
      // Update existing
      setTransactions(prev => 
        prev.map(t => t.id === transaction.id ? transaction : t)
      );
      // Update account balance
      const account = accounts.find(a => a.id === transaction.accountId);
      if (account) {
        const oldTxn = selectedTransaction;
        let balanceChange = 0;
        
        // Reverse old transaction effect
        if (oldTxn.type === 'income') {
          balanceChange -= oldTxn.amount;
        } else if (oldTxn.type === 'expense' || oldTxn.type === 'transfer') {
          balanceChange += oldTxn.amount;
        }
        
        // Apply new transaction effect
        if (transaction.type === 'income') {
          balanceChange += transaction.amount;
        } else if (transaction.type === 'expense' || transaction.type === 'transfer') {
          balanceChange -= transaction.amount;
        }
        
        setAccounts(prev => 
          prev.map(a => a.id === account.id 
            ? { ...a, balance: a.balance + balanceChange }
            : a
          )
        );
      }
    } else {
      // Add new
      setTransactions(prev => [transaction, ...prev]);
      // Update account balance
      const account = accounts.find(a => a.id === transaction.accountId);
      if (account) {
        const balanceChange = transaction.type === 'income' 
          ? transaction.amount 
          : -transaction.amount;
        
        setAccounts(prev => 
          prev.map(a => a.id === account.id 
            ? { ...a, balance: a.balance + balanceChange }
            : a
          )
        );
        
        // For transfers, also update destination account
        if (transaction.type === 'transfer' && transaction.transferToAccountId) {
          setAccounts(prev => 
            prev.map(a => a.id === transaction.transferToAccountId 
              ? { ...a, balance: a.balance + transaction.amount }
              : a
            )
          );
        }
      }
    }
    setIsTransactionModalOpen(false);
  };

  const handleDeleteConfirm = () => {
    if (transactionToDelete) {
      // Reverse the transaction effect on account balance
      const account = accounts.find(a => a.id === transactionToDelete.accountId);
      if (account) {
        const balanceChange = transactionToDelete.type === 'income' 
          ? -transactionToDelete.amount 
          : transactionToDelete.amount;
        
        setAccounts(prev => 
          prev.map(a => a.id === account.id 
            ? { ...a, balance: a.balance + balanceChange }
            : a
          )
        );
        
        // For transfers, also reverse destination account
        if (transactionToDelete.type === 'transfer' && transactionToDelete.transferToAccountId) {
          setAccounts(prev => 
            prev.map(a => a.id === transactionToDelete.transferToAccountId 
              ? { ...a, balance: a.balance - transactionToDelete.amount }
              : a
            )
          );
        }
      }
      
      setTransactions(prev => prev.filter(t => t.id !== transactionToDelete.id));
    }
    setIsDeleteModalOpen(false);
    setTransactionToDelete(null);
  };

  // Account Management Handlers
  const handleAddAccount = () => {
    setSelectedAccountForEdit(null);
    setIsAccountModalOpen(true);
  };

  const handleEditAccount = (account: CashAccount) => {
    setSelectedAccountForEdit(account);
    setIsAccountModalOpen(true);
  };

  const handleViewAccount = (account: CashAccount) => {
    setSelectedAccountForView(account);
    setIsAccountDetailModalOpen(true);
  };

  const handleSaveAccount = (account: CashAccount) => {
    if (selectedAccountForEdit) {
      // Update existing account
      setAccounts(prev => 
        prev.map(a => a.id === account.id ? account : a)
      );
    } else {
      // Add new account
      setAccounts(prev => [...prev, account]);
    }
    setIsAccountModalOpen(false);
    setSelectedAccountForEdit(null);
  };

  const handleDeleteAccountClick = (account: CashAccount) => {
    setAccountToDelete(account);
    setIsDeleteAccountModalOpen(true);
  };

  const handleDeleteAccountConfirm = () => {
    if (accountToDelete) {
      // Check if account has transactions
      const hasTransactions = transactions.some(t => t.accountId === accountToDelete.id);
      if (hasTransactions) {
        alert('Cannot delete account with existing transactions. Please delete or move transactions first.');
        setIsDeleteAccountModalOpen(false);
        setAccountToDelete(null);
        return;
      }
      setAccounts(prev => prev.filter(a => a.id !== accountToDelete.id));
    }
    setIsDeleteAccountModalOpen(false);
    setAccountToDelete(null);
  };

  // Export Functions
  const generateReportData = useCallback(() => {
    const reportDate = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' });
    const periodLabel = dateRangeOptions.find(o => o.value === dateRange)?.label || 'Custom Period';
    
    return {
      title: 'Financial Summary Report',
      subtitle: `ECOTEC Computer & Mobile Shop`,
      period: periodLabel,
      generatedDate: reportDate,
      summary: {
        totalBalance: financialSummary.totalBalance,
        netCashFlow: financialSummary.netCashFlow,
        estimatedProfit: financialSummary.estimatedProfit,
      },
      income: {
        invoicePayments: financialSummary.invoiceCashReceived,
        otherIncome: financialSummary.totalIncome,
        totalIncome: financialSummary.invoiceCashReceived + financialSummary.totalIncome,
      },
      expenses: {
        grnPayments: financialSummary.grnPaidAmount,
        businessExpenses: financialSummary.totalExpenses,
        totalExpenses: financialSummary.grnPaidAmount + financialSummary.totalExpenses,
      },
      invoices: {
        totalSales: financialSummary.totalInvoiceSales,
        cashReceived: financialSummary.invoiceCashReceived,
        pending: financialSummary.invoicePendingAmount,
        count: financialSummary.invoiceCount,
        fullPaid: financialSummary.fullPaidInvoices,
        partialPaid: financialSummary.partialPaidInvoices,
        unpaid: financialSummary.unpaidInvoices,
      },
      grn: {
        totalPurchases: financialSummary.totalGRNPurchases,
        paid: financialSummary.grnPaidAmount,
        pending: financialSummary.grnPendingAmount,
        count: financialSummary.grnCount,
        productsAdded: financialSummary.grnProductsAdded,
      },
      accounts: {
        drawer: financialSummary.drawerBalance,
        cashInHand: financialSummary.cashInHandBalance,
        business: financialSummary.businessBalance,
      },
      expensesByCategory: financialSummary.expensesByCategory,
    };
  }, [financialSummary, dateRange, dateRangeOptions]);

  // Export to CSV
  const exportToCSV = useCallback(() => {
    const data = generateReportData();
    const rows = [
      ['ECOTEC FINANCIAL SUMMARY REPORT'],
      [''],
      ['Report Period:', data.period],
      ['Generated Date:', data.generatedDate],
      [''],
      ['=== SUMMARY ==='],
      ['Total Cash Balance:', formatCurrency(data.summary.totalBalance)],
      ['Net Cash Flow:', formatCurrency(data.summary.netCashFlow)],
      ['Estimated Profit:', formatCurrency(data.summary.estimatedProfit)],
      [''],
      ['=== INCOME ==='],
      ['Invoice Payments:', formatCurrency(data.income.invoicePayments)],
      ['Other Income:', formatCurrency(data.income.otherIncome)],
      ['Total Income:', formatCurrency(data.income.totalIncome)],
      [''],
      ['=== EXPENSES ==='],
      ['GRN Payments:', formatCurrency(data.expenses.grnPayments)],
      ['Business Expenses:', formatCurrency(data.expenses.businessExpenses)],
      ['Total Expenses:', formatCurrency(data.expenses.totalExpenses)],
      [''],
      ['=== INVOICE DETAILS ==='],
      ['Total Sales:', formatCurrency(data.invoices.totalSales)],
      ['Cash Received:', formatCurrency(data.invoices.cashReceived)],
      ['Pending Amount:', formatCurrency(data.invoices.pending)],
      ['Total Invoices:', data.invoices.count.toString()],
      ['Full Paid:', data.invoices.fullPaid.toString()],
      ['Partial Paid:', data.invoices.partialPaid.toString()],
      ['Unpaid:', data.invoices.unpaid.toString()],
      [''],
      ['=== GRN DETAILS ==='],
      ['Total Purchases:', formatCurrency(data.grn.totalPurchases)],
      ['Paid to Suppliers:', formatCurrency(data.grn.paid)],
      ['Pending Payment:', formatCurrency(data.grn.pending)],
      ['Total GRNs:', data.grn.count.toString()],
      ['Products Added:', data.grn.productsAdded.toString()],
      [''],
      ['=== ACCOUNT BALANCES ==='],
      ['Cash Drawer:', formatCurrency(data.accounts.drawer)],
      ['Cash in Hand:', formatCurrency(data.accounts.cashInHand)],
      ['Business Account:', formatCurrency(data.accounts.business)],
      [''],
      ['=== EXPENSES BY CATEGORY ==='],
      ...Object.entries(data.expensesByCategory).map(([cat, amt]) => [cat, formatCurrency(amt as number)]),
    ];

    const csvContent = rows.map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `ECOTEC_Financial_Report_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  }, [generateReportData, formatCurrency]);

  // Export to Excel (.xlsx format with professional styling)
  const exportToExcel = useCallback(() => {
    const data = generateReportData();
    
    // Create workbook and worksheet
    const wb = XLSX.utils.book_new();
    
    // Financial Summary Data with proper structure
    const summaryData = [
      ['ECOTEC FINANCIAL REPORT'],
      ['Computer & Mobile Shop Management System'],
      [`Period: ${data.period} | Generated: ${data.generatedDate}`],
      [],
      ['📊 FINANCIAL SUMMARY', ''],
      ['Total Cash Balance', data.summary.totalBalance],
      ['Net Cash Flow', data.summary.netCashFlow],
      ['Estimated Profit', data.summary.estimatedProfit],
      [],
      ['💰 INCOME', ''],
      ['Invoice Payments', data.income.invoicePayments],
      ['Other Income', data.income.otherIncome],
      ['Total Income', data.income.totalIncome],
      [],
      ['💸 EXPENSES', ''],
      ['GRN Payments', data.expenses.grnPayments],
      ['Business Expenses', data.expenses.businessExpenses],
      ['Total Expenses', data.expenses.totalExpenses],
      [],
      ['🧾 INVOICE DETAILS', ''],
      ['Total Sales', data.invoices.totalSales],
      ['Cash Received', data.invoices.cashReceived],
      ['Pending Amount', data.invoices.pending],
      ['Total Invoices', data.invoices.count],
      ['Full Paid', data.invoices.fullPaid],
      ['Partial Paid', data.invoices.partialPaid],
      ['Unpaid', data.invoices.unpaid],
      [],
      ['📦 GRN DETAILS', ''],
      ['Total Purchases', data.grn.totalPurchases],
      ['Paid to Suppliers', data.grn.paid],
      ['Pending Payment', data.grn.pending],
      ['Total GRNs', data.grn.count],
      ['Products Added', data.grn.productsAdded],
      [],
      ['🏦 ACCOUNT BALANCES', ''],
      ['Cash Drawer', data.accounts.drawer],
      ['Cash in Hand', data.accounts.cashInHand],
      ['Business Account', data.accounts.business],
      [],
      ['📁 EXPENSES BY CATEGORY', ''],
      ...Object.entries(data.expensesByCategory).map(([cat, amt]) => [cat, amt as number]),
    ];

    const ws = XLSX.utils.aoa_to_sheet(summaryData);
    
    // Set column widths
    ws['!cols'] = [
      { wch: 30 }, // Column A width
      { wch: 20 }, // Column B width
    ];
    
    // Merge cells for title rows
    ws['!merges'] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: 1 } }, // Title
      { s: { r: 1, c: 0 }, e: { r: 1, c: 1 } }, // Subtitle
      { s: { r: 2, c: 0 }, e: { r: 2, c: 1 } }, // Period
    ];
    
    XLSX.utils.book_append_sheet(wb, ws, 'Financial Summary');
    
    // Generate and download the file
    XLSX.writeFile(wb, `ECOTEC_Financial_Report_${new Date().toISOString().split('T')[0]}.xlsx`);
  }, [generateReportData]);

  // Export to PDF (using print with custom styling)
  const exportToPDF = useCallback(() => {
    const data = generateReportData();
    
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    // Build expenses by category HTML
    const expensesCategoryHTML = Object.keys(data.expensesByCategory).length > 0 
      ? `<div class="section">
          <div class="section-header">
            <div class="section-icon">
              <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/></svg>
            </div>
            <div class="section-title">Expenses by Category</div>
          </div>
          <table class="data-table">
            <thead><tr><th>Category</th><th style="text-align:right">Amount</th></tr></thead>
            <tbody>
              ${Object.entries(data.expensesByCategory).sort(([,a], [,b]) => (b as number) - (a as number)).map(([cat, amt]) => 
                `<tr><td>${cat}</td><td class="value">${formatCurrency(amt as number)}</td></tr>`
              ).join('')}
            </tbody>
          </table>
        </div>` 
      : '';

    // WORLD-CLASS PREMIUM PDF - INK-EFFICIENT B&W DESIGN
    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <title>ECOTEC Financial Summary Report</title>
  <style>
    /* ══════════════════════════════════════════════════════════════════════════
       WORLD-CLASS PREMIUM FINANCIAL REPORT - INK-EFFICIENT B&W EDITION
       Designed for professional business reporting with minimal ink usage
       ══════════════════════════════════════════════════════════════════════════ */
    
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@500;600;700&display=swap');
    
    * { margin: 0; padding: 0; box-sizing: border-box; }
    @page { size: A4; margin: 12mm 15mm; }
    
    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      background: #fff;
      color: #000;
      line-height: 1.6;
      font-size: 11px;
    }
    
    .container { max-width: 100%; padding: 0; }
    
    /* ═══ HEADER - INVOICE STYLE ═══ */
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      padding-bottom: 15px;
      border-bottom: 2px solid #000;
      margin-bottom: 20px;
    }
    
    .company-section {
      display: flex;
      align-items: flex-start;
      gap: 12px;
    }
    
    .company-logo {
      width: 50px;
      height: 50px;
      border: 2px solid #000;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      background: white;
      flex-shrink: 0;
      overflow: hidden;
    }
    
    .company-logo img {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      object-fit: cover;
    }
    
    .company-info h1 {
      font-size: 16pt;
      font-weight: 700;
      color: #000;
      margin: 0 0 1px 0;
      letter-spacing: -0.3px;
    }
    
    .company-info .sub-name {
      font-size: 9pt;
      font-weight: 600;
      color: #000;
      margin-bottom: 6px;
    }
    
    .company-info .details {
      font-size: 8pt;
      color: #000;
      line-height: 1.4;
    }
    
    .contact-box {
      text-align: right;
    }
    
    .contact-box h3 {
      font-size: 9pt;
      font-weight: 600;
      color: #000;
      margin: 0 0 4px 0;
      text-decoration: underline;
    }
    
    .contact-box .info {
      font-size: 8pt;
      color: #000;
      line-height: 1.5;
    }
    
    /* Report Title Section */
    .report-title-section {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      padding: 15px 18px;
      margin-bottom: 15px;
      background: white;
      border: 2px solid #000;
    }
    
    .report-title h2 {
      font-size: 18pt;
      font-weight: 700;
      color: #000;
      margin: 0 0 2px 0;
      text-transform: uppercase;
      letter-spacing: 1px;
    }
    
    .report-title .company-label {
      font-size: 8pt;
      color: #000;
      font-weight: 500;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    
    .report-meta-box {
      text-align: right;
    }
    
    .report-meta-box .meta-item {
      font-size: 9pt;
      margin-bottom: 3px;
    }
    
    .report-meta-box .meta-item strong {
      font-weight: 600;
    }
    
    /* ═══ EXECUTIVE SUMMARY HERO ═══ */
    .hero-summary {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 12px;
      margin-bottom: 20px;
    }
    
    .hero-card {
      border: 2px solid #000;
      padding: 16px;
      text-align: center;
      position: relative;
    }
    
    .hero-card.primary {
      border-width: 3px;
    }
    
    .hero-card .card-label {
      font-size: 9px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 1.5px;
      margin-bottom: 8px;
    }
    
    .hero-card .card-value {
      font-family: 'JetBrains Mono', monospace;
      font-size: 22px;
      font-weight: 700;
      letter-spacing: -0.5px;
    }
    
    .hero-card .card-indicator {
      font-size: 9px;
      margin-top: 6px;
      padding: 3px 8px;
      border: 1px solid #000;
      display: inline-block;
    }
    
    /* ═══ TWO-COLUMN LAYOUT ═══ */
    .two-columns {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
      margin-bottom: 16px;
    }
    
    /* ═══ SECTIONS ═══ */
    .section {
      margin-bottom: 16px;
      break-inside: avoid;
    }
    
    .section-header {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 8px 12px;
      border: 2px solid #000;
      border-bottom: none;
      background: #fff;
    }
    
    .section-icon {
      width: 28px;
      height: 28px;
      border: 1.5px solid #000;
      border-radius: 6px;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    
    .section-icon svg {
      width: 16px;
      height: 16px;
    }
    
    .section-title {
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 1px;
    }
    
    /* ═══ TABLES ═══ */
    .data-table {
      width: 100%;
      border-collapse: collapse;
      border: 2px solid #000;
    }
    
    .data-table thead th {
      padding: 8px 12px;
      text-align: left;
      font-size: 9px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      border-bottom: 2px solid #000;
    }
    
    .data-table tbody td {
      padding: 10px 12px;
      border-bottom: 1px solid #ccc;
      font-size: 11px;
    }
    
    .data-table tbody tr:last-child td {
      border-bottom: none;
    }
    
    .data-table .value {
      text-align: right;
      font-family: 'JetBrains Mono', monospace;
      font-weight: 600;
      font-size: 11px;
    }
    
    .data-table .total-row {
      border-top: 2px solid #000;
    }
    
    .data-table .total-row td {
      font-weight: 700;
      padding: 10px 12px;
      border-bottom: none;
    }
    
    /* ═══ STATS GRID ═══ */
    .stats-row {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      border: 2px solid #000;
      border-top: none;
    }
    
    .stats-row.cols-2 {
      grid-template-columns: repeat(2, 1fr);
    }
    
    .stat-item {
      padding: 12px;
      text-align: center;
      border-right: 1px solid #000;
    }
    
    .stat-item:last-child {
      border-right: none;
    }
    
    .stat-value {
      font-family: 'JetBrains Mono', monospace;
      font-size: 20px;
      font-weight: 700;
    }
    
    .stat-label {
      font-size: 8px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 1px;
      margin-top: 4px;
    }
    
    /* ═══ ACCOUNT BALANCES SPECIAL ═══ */
    .accounts-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 0;
      border: 2px solid #000;
    }
    
    .account-item {
      padding: 14px;
      text-align: center;
      border-right: 1px solid #000;
    }
    
    .account-item:last-child {
      border-right: none;
    }
    
    .account-item .acc-label {
      font-size: 9px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    
    .account-item .acc-value {
      font-family: 'JetBrains Mono', monospace;
      font-size: 16px;
      font-weight: 700;
      margin-top: 6px;
    }
    
    .total-balance-bar {
      border: 2px solid #000;
      border-top: none;
      padding: 12px 20px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    
    .total-balance-bar .tbl-label {
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 1px;
    }
    
    .total-balance-bar .tbl-value {
      font-family: 'JetBrains Mono', monospace;
      font-size: 20px;
      font-weight: 700;
    }
    
    /* ═══ FOOTER ═══ */
    .footer {
      margin-top: 24px;
      padding-top: 16px;
      border-top: 2px double #000;
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 9px;
    }
    
    .footer-brand {
      font-weight: 700;
    }
    
    .footer-legal {
      text-align: right;
    }
    
    .footer-legal div {
      margin-top: 2px;
    }
    
    /* Print Optimization */
    @media print {
      body { background: white; }
      .section { break-inside: avoid; }
    }
  </style>
</head>
<body>
  <div class="container">
    <!-- HEADER - INVOICE STYLE -->
    <div class="header">
      <div class="company-section">
        <div class="company-logo">
          <img src="${logo}" alt="ECOTEC Logo" />
        </div>
        <div class="company-info">
          <h1>ECOTEC COMPUTER</h1>
          <div class="sub-name">SOLUTIONS</div>
          <div class="details">
            No.14, Mulatiyana junction,<br />
            Mulatiyana, Matara.
          </div>
        </div>
      </div>
      <div class="contact-box">
        <h3>Contact information</h3>
        <div class="info">
          ecoteccomputersolutions@gmail.com<br />
          0711453111
        </div>
      </div>
    </div>
    
    <!-- Report Title Section -->
    <div class="report-title-section">
      <div class="report-title">
        <h2>FINANCIAL SUMMARY</h2>
        <div class="company-label">ECOTEC COMPUTER SOLUTIONS</div>
      </div>
      <div class="report-meta-box">
        <div class="meta-item"><strong>Report Period:</strong> ${data.period}</div>
        <div class="meta-item"><strong>Generated:</strong> ${data.generatedDate}</div>
      </div>
    </div>
    
    <!-- EXECUTIVE SUMMARY -->
    <div class="hero-summary">
      <div class="hero-card primary">
        <div class="card-label">Total Cash Balance</div>
        <div class="card-value">${formatCurrency(data.summary.totalBalance)}</div>
        <div class="card-indicator">Available Funds</div>
      </div>
      <div class="hero-card">
        <div class="card-label">Net Cash Flow</div>
        <div class="card-value">${data.summary.netCashFlow >= 0 ? '+' : ''}${formatCurrency(data.summary.netCashFlow)}</div>
        <div class="card-indicator">${data.summary.netCashFlow >= 0 ? '▲ Positive' : '▼ Negative'}</div>
      </div>
      <div class="hero-card">
        <div class="card-label">Estimated Profit</div>
        <div class="card-value">${data.summary.estimatedProfit >= 0 ? '+' : ''}${formatCurrency(data.summary.estimatedProfit)}</div>
        <div class="card-indicator">${data.summary.estimatedProfit >= 0 ? '▲ Profit' : '▼ Loss'}</div>
      </div>
    </div>
    
    <!-- INCOME & EXPENSES - TWO COLUMNS -->
    <div class="two-columns">
      <!-- INCOME -->
      <div class="section">
        <div class="section-header">
          <div class="section-icon">
            <svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M12 4v16m8-8H4"/></svg>
          </div>
          <div class="section-title">Money In (Income)</div>
        </div>
        <table class="data-table">
          <thead><tr><th>Source</th><th style="text-align:right">Amount</th></tr></thead>
          <tbody>
            <tr><td>Invoice Payments</td><td class="value">${formatCurrency(data.income.invoicePayments)}</td></tr>
            <tr><td>Other Income</td><td class="value">${formatCurrency(data.income.otherIncome)}</td></tr>
            <tr class="total-row"><td><strong>TOTAL INCOME</strong></td><td class="value">${formatCurrency(data.income.totalIncome)}</td></tr>
          </tbody>
        </table>
      </div>
      
      <!-- EXPENSES -->
      <div class="section">
        <div class="section-header">
          <div class="section-icon">
            <svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M20 12H4"/></svg>
          </div>
          <div class="section-title">Money Out (Expenses)</div>
        </div>
        <table class="data-table">
          <thead><tr><th>Category</th><th style="text-align:right">Amount</th></tr></thead>
          <tbody>
            <tr><td>GRN Payments (Suppliers)</td><td class="value">${formatCurrency(data.expenses.grnPayments)}</td></tr>
            <tr><td>Business Expenses</td><td class="value">${formatCurrency(data.expenses.businessExpenses)}</td></tr>
            <tr class="total-row"><td><strong>TOTAL EXPENSES</strong></td><td class="value">${formatCurrency(data.expenses.totalExpenses)}</td></tr>
          </tbody>
        </table>
      </div>
    </div>
    
    <!-- INVOICE SUMMARY -->
    <div class="section">
      <div class="section-header">
        <div class="section-icon">
          <svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
        </div>
        <div class="section-title">Invoice Summary</div>
      </div>
      <table class="data-table">
        <thead><tr><th>Metric</th><th style="text-align:right">Value</th></tr></thead>
        <tbody>
          <tr><td>Total Sales Revenue</td><td class="value">${formatCurrency(data.invoices.totalSales)}</td></tr>
          <tr><td>Cash Received</td><td class="value">${formatCurrency(data.invoices.cashReceived)}</td></tr>
          <tr><td>Pending Collection</td><td class="value">${formatCurrency(data.invoices.pending)}</td></tr>
        </tbody>
      </table>
      <div class="stats-row">
        <div class="stat-item"><div class="stat-value">${data.invoices.count}</div><div class="stat-label">Total</div></div>
        <div class="stat-item"><div class="stat-value">${data.invoices.fullPaid}</div><div class="stat-label">Full Paid</div></div>
        <div class="stat-item"><div class="stat-value">${data.invoices.partialPaid}</div><div class="stat-label">Partial</div></div>
        <div class="stat-item"><div class="stat-value">${data.invoices.unpaid}</div><div class="stat-label">Unpaid</div></div>
      </div>
    </div>
    
    <!-- GRN SUMMARY -->
    <div class="section">
      <div class="section-header">
        <div class="section-icon">
          <svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/></svg>
        </div>
        <div class="section-title">GRN Summary (Purchases)</div>
      </div>
      <table class="data-table">
        <thead><tr><th>Metric</th><th style="text-align:right">Value</th></tr></thead>
        <tbody>
          <tr><td>Total Purchases</td><td class="value">${formatCurrency(data.grn.totalPurchases)}</td></tr>
          <tr><td>Paid to Suppliers</td><td class="value">${formatCurrency(data.grn.paid)}</td></tr>
          <tr><td>Pending Payment</td><td class="value">${formatCurrency(data.grn.pending)}</td></tr>
        </tbody>
      </table>
      <div class="stats-row cols-2">
        <div class="stat-item"><div class="stat-value">${data.grn.count}</div><div class="stat-label">Total GRNs</div></div>
        <div class="stat-item"><div class="stat-value">${data.grn.productsAdded}</div><div class="stat-label">Products Added</div></div>
      </div>
    </div>
    
    <!-- ACCOUNT BALANCES -->
    <div class="section">
      <div class="section-header">
        <div class="section-icon">
          <svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"/></svg>
        </div>
        <div class="section-title">Account Balances</div>
      </div>
      <div class="accounts-grid">
        <div class="account-item">
          <div class="acc-label">Cash Drawer</div>
          <div class="acc-value">${formatCurrency(data.accounts.drawer)}</div>
        </div>
        <div class="account-item">
          <div class="acc-label">Cash in Hand</div>
          <div class="acc-value">${formatCurrency(data.accounts.cashInHand)}</div>
        </div>
        <div class="account-item">
          <div class="acc-label">Business Account</div>
          <div class="acc-value">${formatCurrency(data.accounts.business)}</div>
        </div>
      </div>
      <div class="total-balance-bar">
        <div class="tbl-label">Total Available Balance</div>
        <div class="tbl-value">${formatCurrency(data.summary.totalBalance)}</div>
      </div>
    </div>
    
    ${expensesCategoryHTML}
    
    <!-- FOOTER -->
    <div class="footer">
      <div class="footer-brand">
        <strong>ECOTEC</strong> COMPUTER SOLUTIONS - Financial Report
      </div>
      <div class="footer-legal">
        <div>Generated by ECOTEC System v2.0</div>
        <div>© ${new Date().getFullYear()} ECOTEC COMPUTER SOLUTIONS</div>
      </div>
    </div>
  </div>
  <script>window.onload = function() { window.print(); }</script>
</body>
</html>`;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
  }, [generateReportData, formatCurrency]);

  // Generate page numbers
  const getPageNumbers = useMemo(() => {
    const pages: (number | string)[] = [];
    const maxVisiblePages = 5;
    
    if (totalPages <= maxVisiblePages) {
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
  }, [currentPage, totalPages]);

  // Calendar helper functions
  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDay = firstDay.getDay();
    return { daysInMonth, startingDay };
  };

  const renderCalendar = (
    selectedDate: string, 
    setSelectedDate: (date: string) => void, 
    setShowCalendar: (show: boolean) => void
  ) => {
    const { daysInMonth, startingDay } = getDaysInMonth(calendarMonth);
    const days = [];
    const selectedDateObj = selectedDate ? new Date(selectedDate) : null;

    for (let i = 0; i < startingDay; i++) {
      days.push(<div key={`empty-${i}`} className="w-8 h-8" />);
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const currentDate = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth(), day);
      const isSelected = selectedDateObj && 
        currentDate.getDate() === selectedDateObj.getDate() &&
        currentDate.getMonth() === selectedDateObj.getMonth() &&
        currentDate.getFullYear() === selectedDateObj.getFullYear();
      const isToday = new Date().toDateString() === currentDate.toDateString();

      days.push(
        <button
          key={day}
          onClick={() => {
            const dateStr = `${currentDate.getFullYear()}-${(currentDate.getMonth() + 1).toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
            setSelectedDate(dateStr);
            setShowCalendar(false);
          }}
          className={`w-8 h-8 rounded-lg text-sm font-medium transition-all ${
            isSelected
              ? 'bg-emerald-500 text-white'
              : isToday
              ? theme === 'dark' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-emerald-100 text-emerald-600'
              : theme === 'dark' ? 'hover:bg-slate-700 text-slate-300' : 'hover:bg-slate-100 text-slate-700'
          }`}
        >
          {day}
        </button>
      );
    }

    return (
      <div className={`absolute top-full left-0 mt-2 p-3 rounded-xl border shadow-xl z-50 min-w-[280px] ${
        theme === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'
      }`}>
        <div className="flex items-center justify-between mb-3">
          <button
            onClick={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() - 1, 1))}
            className={`p-1 rounded-lg transition-colors ${
              theme === 'dark' ? 'hover:bg-slate-700 text-slate-400' : 'hover:bg-slate-100 text-slate-600'
            }`}
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className={`text-sm font-semibold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
            {calendarMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
          </span>
          <button
            onClick={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 1))}
            className={`p-1 rounded-lg transition-colors ${
              theme === 'dark' ? 'hover:bg-slate-700 text-slate-400' : 'hover:bg-slate-100 text-slate-600'
            }`}
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
        
        <div className="grid grid-cols-7 gap-1 mb-2">
          {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((day) => (
            <div key={day} className={`w-8 h-8 flex items-center justify-center text-xs font-medium ${
              theme === 'dark' ? 'text-slate-500' : 'text-slate-400'
            }`}>
              {day}
            </div>
          ))}
        </div>
        
        <div className="grid grid-cols-7 gap-1">
          {days}
        </div>

        <button
          onClick={() => {
            setSelectedDate('');
            setShowCalendar(false);
          }}
          className={`w-full mt-3 py-2 text-sm font-medium rounded-lg transition-colors ${
            theme === 'dark' 
              ? 'bg-slate-700 hover:bg-slate-600 text-slate-300' 
              : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
          }`}
        >
          Clear
        </button>
      </div>
    );
  };

  // Select options
  const typeOptions = [
    { value: 'all', label: 'All Types', icon: <Filter className="w-4 h-4" /> },
    { value: 'income', label: 'Income', icon: <ArrowDownCircle className="w-4 h-4 text-emerald-500" /> },
    { value: 'expense', label: 'Expense', icon: <ArrowUpCircle className="w-4 h-4 text-red-500" /> },
    { value: 'transfer', label: 'Transfer', icon: <ArrowLeftRight className="w-4 h-4 text-blue-500" /> },
  ];

  const accountOptions = [
    { value: 'all', label: 'All Accounts', icon: <Wallet className="w-4 h-4" /> },
    ...accounts.map(a => ({ 
      value: a.id, 
      label: a.name, 
      icon: getAccountIconJsx(a.type) 
    })),
  ];

  const categoryOptions = [
    { value: 'all', label: 'All Categories', icon: <Tag className="w-4 h-4" /> },
    { value: 'Other', label: 'Other', icon: <Tag className="w-4 h-4 text-slate-400" /> },
    ...expenseCategories.map(cat => ({ 
      value: cat, 
      label: cat, 
      icon: <Tag className="w-4 h-4 text-emerald-500" /> 
    })),
  ];

  // Page configuration based on active view
  const pageConfig = useMemo(() => {
    switch (activeTab) {
      case 'transactions':
        return {
          title: 'Transactions',
          description: 'View and manage all cash transactions',
          showAddButton: true,
          showDateRange: false,
        };
      case 'accounts':
        return {
          title: 'Manage Accounts',
          description: 'Add and manage your money accounts - Bank, Drawer, Wallet & more',
          showAddButton: false,
          showDateRange: false,
        };
      default:
        return {
          title: 'Financial Insights',
          description: 'Complete overview of your business cash flow & finances',
          showAddButton: false,
          showDateRange: true,
        };
    }
  }, [activeTab]);

  return (
    <div className="space-y-6 pb-8">
      {/* Page Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
        {/* Title Section */}
        <div className="flex-1">
          <h1 className={`text-3xl lg:text-4xl font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
            {pageConfig.title}
          </h1>
          <p className={`mt-2 text-sm lg:text-base ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
            {pageConfig.description}
          </p>
        </div>

        {/* Controls Section */}
        {pageConfig.showAddButton && activeTab === 'transactions' ? (
          <button
            onClick={() => setIsTransactionModalOpen(true)}
            className="flex items-center gap-2 px-4 py-3 bg-gradient-to-r from-emerald-500 via-emerald-500 to-blue-500 text-white rounded-2xl font-semibold shadow-lg hover:shadow-emerald-500/30 focus:outline-none focus:ring-2 focus:ring-emerald-300 transition-all duration-200"
          >
            <Plus className="w-5 h-5" />
            Add Transaction
          </button>
        ) : pageConfig.showDateRange ? (
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            {/* Date Range Selector */}
            <div className="relative" ref={dateRangeRef}>
              <button
                onClick={() => setShowDateRangeDropdown(!showDateRangeDropdown)}
                className={`flex items-center justify-center gap-2 px-4 py-3 rounded-xl border font-medium text-sm transition-all duration-200 ${
                  theme === 'dark' 
                    ? 'bg-slate-800/80 border-slate-700/80 hover:border-emerald-500/50 hover:bg-slate-700/80 text-slate-200 hover:text-white' 
                    : 'bg-white border-slate-300 hover:border-emerald-500 hover:bg-emerald-50 text-slate-700 hover:text-emerald-600'
                }`}
              >
                <Calendar className="w-4 h-4" />
                <span className="whitespace-nowrap">
                  {dateRangeOptions.find(o => o.value === dateRange)?.label || 'Select Period'}
                </span>
                <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${showDateRangeDropdown ? 'rotate-180' : ''}`} />
              </button>
              {showDateRangeDropdown && (
                <div className={`absolute right-0 mt-2 w-44 rounded-xl border shadow-2xl z-50 overflow-hidden ${
                  theme === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'
                }`}>
                  <div className={`py-2 ${theme === 'dark' ? 'divide-y divide-slate-700' : 'divide-y divide-slate-200'}`}>
                    {dateRangeOptions.map(option => (
                      <button
                        key={option.value}
                        onClick={() => {
                          setDateRange(option.value as DateRange);
                          setShowDateRangeDropdown(false);
                        }}
                        className={`w-full px-4 py-2.5 text-sm text-left transition-colors ${
                          dateRange === option.value
                            ? theme === 'dark' 
                              ? 'bg-emerald-500/20 text-emerald-400 font-medium' 
                              : 'bg-emerald-50 text-emerald-600 font-medium'
                            : theme === 'dark'
                              ? 'text-slate-300 hover:bg-slate-700'
                              : 'text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span>{option.label}</span>
                          {dateRange === option.value && <span className="text-xs">✓</span>}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Export Button with Dropdown */}
            <div className="relative" ref={exportMenuRef}>
              <button
                onClick={() => setShowExportMenu(!showExportMenu)}
                className={`flex items-center justify-center gap-2 px-4 py-3 rounded-xl border font-medium text-sm transition-all duration-200 ${
                  theme === 'dark'
                    ? 'bg-gradient-to-r from-emerald-600 to-teal-600 border-emerald-500/50 hover:from-emerald-500 hover:to-teal-500 text-white shadow-lg shadow-emerald-500/20'
                    : 'bg-gradient-to-r from-emerald-500 to-teal-500 border-emerald-300 hover:from-emerald-600 hover:to-teal-600 text-white shadow-lg shadow-emerald-500/30'
                }`}
              >
                <Download className="w-4 h-4" />
                <span className="whitespace-nowrap">Export Report</span>
                <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${showExportMenu ? 'rotate-180' : ''}`} />
              </button>

              {showExportMenu && (
                <div className={`absolute right-0 mt-2 w-48 rounded-xl border shadow-2xl z-[9999] overflow-hidden ${
                  theme === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'
                }`}>
                  <div className={`py-2 ${theme === 'dark' ? 'divide-y divide-slate-700' : 'divide-y divide-slate-200'}`}>
                    <button
                      onClick={() => {
                        exportToPDF();
                        setShowExportMenu(false);
                      }}
                      className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm text-left transition-colors ${
                        theme === 'dark'
                          ? 'text-slate-300 hover:bg-slate-700'
                          : 'text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <div className={`p-2 rounded-lg ${theme === 'dark' ? 'bg-red-500/20' : 'bg-red-100'}`}>
                        <Printer className="w-4 h-4 text-red-500" />
                      </div>
                      <div>
                        <p className="font-medium">PDF Report</p>
                        <p className={`text-xs ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>Print-ready format</p>
                      </div>
                    </button>
                    <button
                      onClick={() => {
                        exportToCSV();
                        setShowExportMenu(false);
                      }}
                      className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm text-left transition-colors ${
                        theme === 'dark'
                          ? 'text-slate-300 hover:bg-slate-700'
                          : 'text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <div className={`p-2 rounded-lg ${theme === 'dark' ? 'bg-blue-500/20' : 'bg-blue-100'}`}>
                        <FileText className="w-4 h-4 text-blue-500" />
                      </div>
                      <div>
                        <p className="font-medium">CSV File</p>
                        <p className={`text-xs ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>Spreadsheet format</p>
                      </div>
                    </button>
                    <button
                      onClick={() => {
                        exportToExcel();
                        setShowExportMenu(false);
                      }}
                      className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm text-left transition-colors ${
                        theme === 'dark'
                          ? 'text-slate-300 hover:bg-slate-700'
                          : 'text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <div className={`p-2 rounded-lg ${theme === 'dark' ? 'bg-emerald-500/20' : 'bg-emerald-100'}`}>
                        <FileSpreadsheet className="w-4 h-4 text-emerald-500" />
                      </div>
                      <div>
                        <p className="font-medium">Excel Sheet</p>
                        <p className={`text-xs ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>Excel workbook</p>
                      </div>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : null}
      </div>

      {/* Financial Insights Tab - Combined Overview & Summary */}
      {activeTab === 'insights' && (
        <>
          {/* Hero Stats Row */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Total Balance */}
            <div className={`relative overflow-hidden p-5 rounded-2xl border ${
              theme === 'dark' 
                ? 'bg-gradient-to-br from-emerald-500/10 to-teal-500/5 border-emerald-500/20' 
                : 'bg-gradient-to-br from-emerald-50 to-teal-50 border-emerald-200'
            }`}>
              <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-emerald-500/20 to-transparent rounded-full blur-2xl -translate-y-1/2 translate-x-1/2" />
              <div className="relative">
                <div className="flex items-center justify-between">
                  <div className={`p-2.5 rounded-xl ${theme === 'dark' ? 'bg-emerald-500/20' : 'bg-emerald-100'}`}>
                    <PiggyBank className="w-5 h-5 text-emerald-500" />
                  </div>
                </div>
                <p className={`mt-3 text-2xl lg:text-3xl font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                  {formatCurrency(financialSummary.totalBalance)}
                </p>
                <p className={`mt-1 text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>Total Cash Balance</p>
              </div>
            </div>

            {/* Net Cash Flow */}
            <div className={`relative overflow-hidden p-5 rounded-2xl border ${
              financialSummary.netCashFlow >= 0
                ? theme === 'dark' ? 'bg-gradient-to-br from-emerald-500/10 to-green-500/5 border-emerald-500/20' : 'bg-gradient-to-br from-emerald-50 to-green-50 border-emerald-200'
                : theme === 'dark' ? 'bg-gradient-to-br from-red-500/10 to-rose-500/5 border-red-500/20' : 'bg-gradient-to-br from-red-50 to-rose-50 border-red-200'
            }`}>
              <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-blue-500/20 to-transparent rounded-full blur-2xl -translate-y-1/2 translate-x-1/2" />
              <div className="relative">
                <div className="flex items-center justify-between">
                  <div className={`p-2.5 rounded-xl ${financialSummary.netCashFlow >= 0 ? theme === 'dark' ? 'bg-emerald-500/20' : 'bg-emerald-100' : theme === 'dark' ? 'bg-red-500/20' : 'bg-red-100'}`}>
                    <DollarSign className={`w-5 h-5 ${financialSummary.netCashFlow >= 0 ? 'text-emerald-500' : 'text-red-500'}`} />
                  </div>
                  {financialSummary.netCashFlow >= 0 ? <TrendingUp className="w-4 h-4 text-emerald-500" /> : <TrendingDown className="w-4 h-4 text-red-500" />}
                </div>
                <p className={`mt-3 text-2xl lg:text-3xl font-bold ${financialSummary.netCashFlow >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                  {financialSummary.netCashFlow >= 0 ? '+' : ''}{formatCurrency(financialSummary.netCashFlow)}
                </p>
                <p className={`mt-1 text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>Net Cash Flow</p>
              </div>
            </div>

            {/* Estimated Profit */}
            <div className={`relative overflow-hidden p-5 rounded-2xl border ${
              financialSummary.estimatedProfit >= 0
                ? theme === 'dark' ? 'bg-gradient-to-br from-purple-500/10 to-indigo-500/5 border-purple-500/20' : 'bg-gradient-to-br from-purple-50 to-indigo-50 border-purple-200'
                : theme === 'dark' ? 'bg-gradient-to-br from-red-500/10 to-rose-500/5 border-red-500/20' : 'bg-gradient-to-br from-red-50 to-rose-50 border-red-200'
            }`}>
              <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-purple-500/20 to-transparent rounded-full blur-2xl -translate-y-1/2 translate-x-1/2" />
              <div className="relative">
                <div className="flex items-center justify-between">
                  <div className={`p-2.5 rounded-xl ${financialSummary.estimatedProfit >= 0 ? theme === 'dark' ? 'bg-purple-500/20' : 'bg-purple-100' : theme === 'dark' ? 'bg-red-500/20' : 'bg-red-100'}`}>
                    <BarChart3 className={`w-5 h-5 ${financialSummary.estimatedProfit >= 0 ? 'text-purple-500' : 'text-red-500'}`} />
                  </div>
                  {financialSummary.estimatedProfit >= 0 ? <TrendingUp className="w-4 h-4 text-purple-500" /> : <TrendingDown className="w-4 h-4 text-red-500" />}
                </div>
                <p className={`mt-3 text-2xl lg:text-3xl font-bold ${financialSummary.estimatedProfit >= 0 ? 'text-purple-500' : 'text-red-500'}`}>
                  {financialSummary.estimatedProfit >= 0 ? '+' : ''}{formatCurrency(financialSummary.estimatedProfit)}
                </p>
                <p className={`mt-1 text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>Estimated Profit</p>
              </div>
            </div>

            {/* Today's Net */}
            <div className={`relative overflow-hidden p-5 rounded-2xl border ${
              (todayIncome - todayExpense) >= 0
                ? theme === 'dark' ? 'bg-gradient-to-br from-sky-500/10 to-cyan-500/5 border-sky-500/20' : 'bg-gradient-to-br from-sky-50 to-cyan-50 border-sky-200'
                : theme === 'dark' ? 'bg-gradient-to-br from-red-500/10 to-rose-500/5 border-red-500/20' : 'bg-gradient-to-br from-red-50 to-rose-50 border-red-200'
            }`}>
              <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-sky-500/20 to-transparent rounded-full blur-2xl -translate-y-1/2 translate-x-1/2" />
              <div className="relative">
                <div className="flex items-center justify-between">
                  <div className={`p-2.5 rounded-xl ${theme === 'dark' ? 'bg-sky-500/20' : 'bg-sky-100'}`}>
                    <Clock className="w-5 h-5 text-sky-500" />
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${theme === 'dark' ? 'bg-sky-500/20 text-sky-400' : 'bg-sky-100 text-sky-600'}`}>Today</span>
                </div>
                <p className={`mt-3 text-2xl lg:text-3xl font-bold ${(todayIncome - todayExpense) >= 0 ? 'text-sky-500' : 'text-red-500'}`}>
                  {(todayIncome - todayExpense) >= 0 ? '+' : ''}{formatCurrency(todayIncome - todayExpense)}
                </p>
                <p className={`mt-1 text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>Today's Net</p>
              </div>
            </div>
          </div>

          {/* Account Balances + Today's Activity Row */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {accounts.map((account) => {
              const Icon = getAccountIcon(account.type);
              const colorClass = getAccountColor(account.type, theme);
              const iconColor = getAccountIconColor(account.type);
              return (
                <div key={account.id} onClick={() => { setSelectedAccount(account.id); navigate('/cash-management/transactions'); }}
                  className={`relative overflow-hidden rounded-2xl border p-5 cursor-pointer transition-all hover:scale-[1.02] bg-gradient-to-br ${colorClass}`}>
                  <div className="relative">
                    <div className="flex items-center justify-between">
                      <div className={`p-2.5 rounded-xl ${theme === 'dark' ? 'bg-white/10' : 'bg-white/80'}`}>
                        <Icon className={`w-5 h-5 ${iconColor}`} />
                      </div>
                      <Eye className={`w-4 h-4 ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`} />
                    </div>
                    <p className={`mt-3 text-sm font-medium ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>{account.name}</p>
                    <p className={`text-2xl font-bold mt-1 ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>{formatCurrency(account.balance)}</p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Income vs Expenses Cards */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Money In Card */}
            <div className={`rounded-2xl border overflow-hidden ${theme === 'dark' ? 'bg-slate-800/30 border-slate-700/50' : 'bg-white border-slate-200 shadow-sm'}`}>
              <div className={`px-5 py-4 border-b ${theme === 'dark' ? 'border-slate-700/50 bg-emerald-500/10' : 'border-slate-200 bg-emerald-50'}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <ArrowDownCircle className="w-5 h-5 text-emerald-500" />
                    <h3 className={`font-semibold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>Money In (Income)</h3>
                  </div>
                  <span className="text-lg font-bold text-emerald-500">+{formatCurrency(financialSummary.invoiceCashReceived + financialSummary.totalIncome)}</span>
                </div>
              </div>
              <div className="p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2"><Receipt className="w-4 h-4 text-blue-500" /><span className={`text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>Invoice Payments</span></div>
                  <span className="font-semibold text-emerald-500">{formatCurrency(financialSummary.invoiceCashReceived)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2"><DollarSign className="w-4 h-4 text-purple-500" /><span className={`text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>Other Income</span></div>
                  <span className="font-semibold text-emerald-500">{formatCurrency(financialSummary.totalIncome)}</span>
                </div>
              </div>
            </div>

            {/* Money Out Card */}
            <div className={`rounded-2xl border overflow-hidden ${theme === 'dark' ? 'bg-slate-800/30 border-slate-700/50' : 'bg-white border-slate-200 shadow-sm'}`}>
              <div className={`px-5 py-4 border-b ${theme === 'dark' ? 'border-slate-700/50 bg-red-500/10' : 'border-slate-200 bg-red-50'}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <ArrowUpCircle className="w-5 h-5 text-red-500" />
                    <h3 className={`font-semibold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>Money Out (Expenses)</h3>
                  </div>
                  <span className="text-lg font-bold text-red-500">-{formatCurrency(financialSummary.grnPaidAmount + financialSummary.totalExpenses)}</span>
                </div>
              </div>
              <div className="p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2"><Truck className="w-4 h-4 text-orange-500" /><span className={`text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>GRN Payments</span></div>
                  <span className="font-semibold text-red-500">{formatCurrency(financialSummary.grnPaidAmount)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2"><CreditCard className="w-4 h-4 text-amber-500" /><span className={`text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>Business Expenses</span></div>
                  <span className="font-semibold text-red-500">{formatCurrency(financialSummary.totalExpenses)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Invoice & GRN Summary Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Invoice Summary */}
            <div className={`rounded-2xl border overflow-hidden ${theme === 'dark' ? 'bg-slate-800/30 border-slate-700/50' : 'bg-white border-slate-200 shadow-sm'}`}>
              <div className={`px-5 py-4 border-b ${theme === 'dark' ? 'border-slate-700/50' : 'border-slate-200'}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`p-2.5 rounded-xl ${theme === 'dark' ? 'bg-blue-500/20' : 'bg-blue-100'}`}><Receipt className="w-5 h-5 text-blue-500" /></div>
                    <div><h3 className={`font-semibold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>Invoice Summary</h3><p className={`text-xs ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>Sales & receivables</p></div>
                  </div>
                  <span className={`text-xs font-medium px-2 py-1 rounded-full ${theme === 'dark' ? 'bg-blue-500/20 text-blue-400' : 'bg-blue-100 text-blue-600'}`}>{financialSummary.invoiceCount} Invoices</span>
                </div>
              </div>
              <div className="p-5 space-y-4">
                <div className="flex items-center justify-between"><span className={`text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>Total Sales</span><span className={`font-semibold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>{formatCurrency(financialSummary.totalInvoiceSales)}</span></div>
                <div className="flex items-center justify-between"><span className={`text-sm flex items-center gap-2 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}><CheckCircle2 className="w-4 h-4 text-emerald-500" />Cash Received</span><span className="font-semibold text-emerald-500">{formatCurrency(financialSummary.invoiceCashReceived)}</span></div>
                <div className="flex items-center justify-between"><span className={`text-sm flex items-center gap-2 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}><AlertTriangle className="w-4 h-4 text-amber-500" />Pending</span><span className="font-semibold text-amber-500">{formatCurrency(financialSummary.invoicePendingAmount)}</span></div>
                <div className={`pt-4 border-t grid grid-cols-3 gap-3 ${theme === 'dark' ? 'border-slate-700/50' : 'border-slate-200'}`}>
                  <div className={`text-center p-2 rounded-xl ${theme === 'dark' ? 'bg-emerald-500/10' : 'bg-emerald-50'}`}><p className="text-lg font-bold text-emerald-500">{financialSummary.fullPaidInvoices}</p><p className={`text-xs ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>Full Paid</p></div>
                  <div className={`text-center p-2 rounded-xl ${theme === 'dark' ? 'bg-amber-500/10' : 'bg-amber-50'}`}><p className="text-lg font-bold text-amber-500">{financialSummary.partialPaidInvoices}</p><p className={`text-xs ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>Partial</p></div>
                  <div className={`text-center p-2 rounded-xl ${theme === 'dark' ? 'bg-red-500/10' : 'bg-red-50'}`}><p className="text-lg font-bold text-red-500">{financialSummary.unpaidInvoices}</p><p className={`text-xs ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>Unpaid</p></div>
                </div>
              </div>
            </div>

            {/* GRN Summary */}
            <div className={`rounded-2xl border overflow-hidden ${theme === 'dark' ? 'bg-slate-800/30 border-slate-700/50' : 'bg-white border-slate-200 shadow-sm'}`}>
              <div className={`px-5 py-4 border-b ${theme === 'dark' ? 'border-slate-700/50' : 'border-slate-200'}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`p-2.5 rounded-xl ${theme === 'dark' ? 'bg-orange-500/20' : 'bg-orange-100'}`}><Truck className="w-5 h-5 text-orange-500" /></div>
                    <div><h3 className={`font-semibold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>GRN Summary</h3><p className={`text-xs ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>Purchases & inventory</p></div>
                  </div>
                  <span className={`text-xs font-medium px-2 py-1 rounded-full ${theme === 'dark' ? 'bg-orange-500/20 text-orange-400' : 'bg-orange-100 text-orange-600'}`}>{financialSummary.grnCount} GRNs</span>
                </div>
              </div>
              <div className="p-5 space-y-4">
                <div className="flex items-center justify-between"><span className={`text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>Total Purchases</span><span className={`font-semibold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>{formatCurrency(financialSummary.totalGRNPurchases)}</span></div>
                <div className="flex items-center justify-between"><span className={`text-sm flex items-center gap-2 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}><CheckCircle2 className="w-4 h-4 text-emerald-500" />Paid to Suppliers</span><span className="font-semibold text-emerald-500">{formatCurrency(financialSummary.grnPaidAmount)}</span></div>
                <div className="flex items-center justify-between"><span className={`text-sm flex items-center gap-2 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}><AlertTriangle className="w-4 h-4 text-red-500" />Pending Payment</span><span className="font-semibold text-red-500">{formatCurrency(financialSummary.grnPendingAmount)}</span></div>
                <div className={`pt-4 border-t ${theme === 'dark' ? 'border-slate-700/50' : 'border-slate-200'}`}>
                  <div className={`flex items-center justify-between p-3 rounded-xl ${theme === 'dark' ? 'bg-slate-800/50' : 'bg-slate-50'}`}>
                    <div className="flex items-center gap-3"><Package className="w-5 h-5 text-purple-500" /><div><p className={`text-sm font-medium ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>Products Added</p><p className={`text-xs ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>To inventory</p></div></div>
                    <span className="text-xl font-bold text-purple-500">{financialSummary.grnProductsAdded}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Expense Breakdown */}
          <div className={`rounded-2xl border overflow-hidden ${theme === 'dark' ? 'bg-slate-800/30 border-slate-700/50' : 'bg-white border-slate-200 shadow-sm'}`}>
            <div className={`px-5 py-4 border-b ${theme === 'dark' ? 'border-slate-700/50' : 'border-slate-200'}`}>
              <div className="flex items-center gap-3">
                <BadgePercent className="w-5 h-5 text-purple-500" />
                <h3 className={`font-semibold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>Expense Categories</h3>
              </div>
            </div>
            <div className="p-5">
              {Object.keys(financialSummary.expensesByCategory).length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
                  {Object.entries(financialSummary.expensesByCategory).sort(([, a], [, b]) => b - a).map(([category, amount]) => (
                    <div key={category} className={`p-4 rounded-xl ${theme === 'dark' ? 'bg-slate-800/50' : 'bg-slate-50'}`}>
                      <p className={`text-sm font-medium ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>{category}</p>
                      <p className={`text-lg font-bold mt-1 ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>{formatCurrency(amount)}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className={`text-center py-8 ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>No expense categories found for this period</p>
              )}
            </div>
          </div>

          {/* Receivables & Payables */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className={`rounded-2xl border overflow-hidden ${theme === 'dark' ? 'bg-slate-800/30 border-slate-700/50' : 'bg-white border-slate-200 shadow-sm'}`}>
              <div className={`px-5 py-4 border-b ${theme === 'dark' ? 'border-slate-700/50 bg-amber-500/10' : 'border-slate-200 bg-amber-50'}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3"><AlertTriangle className="w-5 h-5 text-amber-500" /><h3 className={`font-semibold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>Accounts Receivable</h3></div>
                  <span className="text-xl font-bold text-amber-500">{formatCurrency(financialSummary.invoicePendingAmount)}</span>
                </div>
              </div>
              <div className="p-5">
                <p className={`text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>Pending from {financialSummary.unpaidInvoices + financialSummary.partialPaidInvoices} invoice(s)</p>
                <div className={`mt-4 p-4 rounded-xl ${theme === 'dark' ? 'bg-slate-800/50' : 'bg-slate-50'}`}>
                  <div className="flex items-center justify-between mb-2"><span className={`text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>Collection Rate</span><span className={`font-medium ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>{financialSummary.totalInvoiceSales > 0 ? ((financialSummary.invoiceCashReceived / financialSummary.totalInvoiceSales) * 100).toFixed(1) : 0}%</span></div>
                  <div className={`h-2 rounded-full overflow-hidden ${theme === 'dark' ? 'bg-slate-700' : 'bg-slate-200'}`}><div className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full" style={{ width: `${financialSummary.totalInvoiceSales > 0 ? (financialSummary.invoiceCashReceived / financialSummary.totalInvoiceSales) * 100 : 0}%` }} /></div>
                </div>
              </div>
            </div>
            <div className={`rounded-2xl border overflow-hidden ${theme === 'dark' ? 'bg-slate-800/30 border-slate-700/50' : 'bg-white border-slate-200 shadow-sm'}`}>
              <div className={`px-5 py-4 border-b ${theme === 'dark' ? 'border-slate-700/50 bg-red-500/10' : 'border-slate-200 bg-red-50'}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3"><AlertTriangle className="w-5 h-5 text-red-500" /><h3 className={`font-semibold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>Accounts Payable</h3></div>
                  <span className="text-xl font-bold text-red-500">{formatCurrency(financialSummary.grnPendingAmount)}</span>
                </div>
              </div>
              <div className="p-5">
                <p className={`text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>Outstanding to suppliers from {financialSummary.grnCount} GRN(s)</p>
                <div className={`mt-4 p-4 rounded-xl ${theme === 'dark' ? 'bg-slate-800/50' : 'bg-slate-50'}`}>
                  <div className="flex items-center justify-between mb-2"><span className={`text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>Payment Rate</span><span className={`font-medium ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>{financialSummary.totalGRNPurchases > 0 ? ((financialSummary.grnPaidAmount / financialSummary.totalGRNPurchases) * 100).toFixed(1) : 0}%</span></div>
                  <div className={`h-2 rounded-full overflow-hidden ${theme === 'dark' ? 'bg-slate-700' : 'bg-slate-200'}`}><div className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full" style={{ width: `${financialSummary.totalGRNPurchases > 0 ? (financialSummary.grnPaidAmount / financialSummary.totalGRNPurchases) * 100 : 0}%` }} /></div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Transactions Tab */}
      {activeTab === 'transactions' && (
        <>
          {/* Search and Filters */}
          <div className={`p-3 sm:p-4 rounded-2xl border ${theme === 'dark' ? 'bg-slate-800/30 border-slate-700/50' : 'bg-white border-slate-200'}`}>
            <div className="flex flex-col lg:flex-row gap-3">
              {/* Search */}
              <div className={`flex items-center gap-2 px-3 sm:px-4 py-2 rounded-xl border flex-1 ${theme === 'dark' ? 'bg-slate-800/50 border-slate-700/50' : 'bg-slate-50 border-slate-200'}`}>
                <Search className={`w-5 h-5 flex-shrink-0 ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`} />
                <input
                  type="text"
                  placeholder="Search transactions..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className={`bg-transparent border-none outline-none flex-1 min-w-0 text-sm ${theme === 'dark' ? 'text-white placeholder-slate-500' : 'text-slate-900 placeholder-slate-400'}`}
                />
              </div>

              {/* Filters Row */}
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-xl transition-colors ${
                    showFilters || hasActiveFilters
                      ? 'bg-emerald-500 text-white'
                      : theme === 'dark'
                        ? 'bg-slate-700 hover:bg-slate-600 text-slate-300'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                  }`}
                >
                  <Filter className="w-4 h-4" />
                  <span className="text-sm hidden sm:inline">Filters</span>
                  {hasActiveFilters && (
                    <span className="px-1.5 py-0.5 text-xs bg-white/20 rounded-full">
                      {[selectedAccount !== 'all', selectedType !== 'all', selectedCategory !== 'all', startDate, endDate].filter(Boolean).length}
                    </span>
                  )}
                </button>

                <button
                  onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                  className={`p-2 rounded-xl border transition-colors ${theme === 'dark' ? 'border-slate-700 hover:bg-slate-800 text-slate-400' : 'border-slate-200 hover:bg-slate-50 text-slate-600'}`}
                >
                  {sortOrder === 'asc' ? <SortAsc className="w-4 h-4" /> : <SortDesc className="w-4 h-4" />}
                </button>

                <div className={`flex items-center rounded-xl overflow-hidden border ${theme === 'dark' ? 'border-slate-700' : 'border-slate-200'}`}>
                  <button
                    onClick={() => setViewMode('table')}
                    className={`p-2 transition-colors ${
                      viewMode === 'table'
                        ? 'bg-emerald-500 text-white'
                        : theme === 'dark'
                          ? 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                          : 'bg-white hover:bg-slate-100 text-slate-700'
                    }`}
                  >
                    <List className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setViewMode('grid')}
                    className={`p-2 transition-colors ${
                      viewMode === 'grid'
                        ? 'bg-emerald-500 text-white'
                        : theme === 'dark'
                          ? 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                          : 'bg-white hover:bg-slate-100 text-slate-700'
                    }`}
                  >
                    <LayoutGrid className="w-4 h-4" />
                  </button>
                </div>

                {hasActiveFilters && (
                  <button
                    onClick={clearFilters}
                    className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-xl transition-colors ${theme === 'dark' ? 'text-slate-400 hover:text-white hover:bg-slate-700' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100'}`}
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    Clear
                  </button>
                )}
              </div>
            </div>

            {showFilters && (
              <div className={`pt-3 sm:pt-4 mt-3 border-t ${theme === 'dark' ? 'border-slate-700/50' : 'border-slate-200'}`}>
                <div className="flex flex-wrap items-center gap-3">
                  <div className="w-full sm:w-40">
                    <SearchableSelect
                      value={selectedType}
                      onValueChange={(value) => setSelectedType(value)}
                      placeholder="All Types"
                      searchPlaceholder="Search..."
                      emptyMessage="No options"
                      theme={theme}
                      options={typeOptions}
                    />
                  </div>
                  <div className="w-full sm:w-48">
                    <SearchableSelect
                      value={selectedAccount}
                      onValueChange={(value) => setSelectedAccount(value)}
                      placeholder="All Accounts"
                      searchPlaceholder="Search..."
                      emptyMessage="No accounts"
                      theme={theme}
                      options={accountOptions}
                    />
                  </div>
                  <div className="w-full sm:w-44">
                    <SearchableSelect
                      value={selectedCategory}
                      onValueChange={(value) => setSelectedCategory(value)}
                      placeholder="All Categories"
                      searchPlaceholder="Search..."
                      emptyMessage="No categories"
                      theme={theme}
                      options={categoryOptions}
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className={`w-4 h-4 flex-shrink-0 ${theme === 'dark' ? 'text-emerald-500' : 'text-emerald-600'}`} />
                    <span className={`text-sm font-medium ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>Date:</span>
                    <div className="relative" ref={startCalendarRef}>
                      <button
                        onClick={() => {
                          setShowStartCalendar(!showStartCalendar);
                          setShowEndCalendar(false);
                          setCalendarMonth(startDate ? new Date(startDate) : new Date());
                        }}
                        className={`px-3 py-1.5 rounded-xl border text-sm min-w-[110px] text-left ${
                          theme === 'dark' 
                            ? 'bg-slate-800/50 border-slate-700/50 text-white hover:bg-slate-700/50' 
                            : 'bg-slate-50 border-slate-200 text-slate-900 hover:bg-slate-100'
                        }`}
                      >
                        {startDate ? formatDateDisplay(startDate) : 'Start Date'}
                      </button>
                      {showStartCalendar && renderCalendar(startDate, setStartDate, setShowStartCalendar)}
                    </div>
                    <span className={`${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>-</span>
                    <div className="relative" ref={endCalendarRef}>
                      <button
                        onClick={() => {
                          setShowEndCalendar(!showEndCalendar);
                          setShowStartCalendar(false);
                          setCalendarMonth(endDate ? new Date(endDate) : new Date());
                        }}
                        className={`px-3 py-1.5 rounded-xl border text-sm min-w-[110px] text-left ${
                          theme === 'dark' 
                            ? 'bg-slate-800/50 border-slate-700/50 text-white hover:bg-slate-700/50' 
                            : 'bg-slate-50 border-slate-200 text-slate-900 hover:bg-slate-100'
                        }`}
                      >
                        {endDate ? formatDateDisplay(endDate) : 'End Date'}
                      </button>
                      {showEndCalendar && renderCalendar(endDate, setEndDate, setShowEndCalendar)}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Transaction List */}
          {sortedTransactions.length > 0 ? (
            viewMode === 'grid' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {paginatedTransactions.map((transaction) => {
                  const TypeIcon = getTransactionTypeIcon(transaction.type);
                  const typeColor = getTransactionTypeColor(transaction.type, theme);
                  const account = accounts.find(a => a.id === transaction.accountId);
                  const AccountIcon = account ? getAccountIcon(account.type) : Wallet;
                  const { date, time } = formatDateTime(transaction.transactionDate);
                  
                  return (
                    <div
                      key={transaction.id}
                      className={`group rounded-2xl border overflow-hidden transition-all duration-300 ${
                        theme === 'dark' 
                          ? 'bg-slate-800/30 border-slate-700/50 hover:border-slate-600' 
                          : 'bg-white border-slate-200 hover:border-slate-300 shadow-sm'
                      }`}
                    >
                      <div className={`h-1 ${
                        transaction.type === 'income' ? 'bg-gradient-to-r from-emerald-500 to-teal-500' 
                          : transaction.type === 'expense' ? 'bg-gradient-to-r from-red-500 to-rose-500'
                          : 'bg-gradient-to-r from-blue-500 to-indigo-500'
                      }`} />
                      <div className="p-4">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-xl ${typeColor}`}>
                              <TypeIcon className="w-5 h-5" />
                            </div>
                            <div>
                              <p className={`font-semibold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                                {transaction.name}
                              </p>
                              <p className={`text-xs ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>
                                {transaction.transactionNumber}
                              </p>
                            </div>
                          </div>
                          <div className="relative">
                            <button
                              onClick={() => setOpenActionMenu(openActionMenu === transaction.id ? null : transaction.id)}
                              className={`p-1.5 rounded-lg transition-colors ${
                                theme === 'dark' ? 'hover:bg-slate-700' : 'hover:bg-slate-100'
                              }`}
                            >
                              <MoreVertical className={`w-4 h-4 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`} />
                            </button>
                            {openActionMenu === transaction.id && (
                              <div 
                                ref={actionMenuRef}
                                className={`absolute right-0 top-full mt-1 w-32 rounded-xl border shadow-lg z-10 py-1 ${
                                  theme === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'
                                }`}
                              >
                                <button
                                  onClick={() => handleEditTransaction(transaction)}
                                  className={`w-full flex items-center gap-2 px-3 py-2 text-sm ${
                                    theme === 'dark' ? 'text-slate-300 hover:bg-slate-700' : 'text-slate-700 hover:bg-slate-50'
                                  }`}
                                >
                                  <Edit className="w-3.5 h-3.5" />
                                  Edit
                                </button>
                                <button
                                  onClick={() => handleDeleteClick(transaction)}
                                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-500 hover:bg-red-500/10"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                  Delete
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 mb-3">
                          <AccountIcon className={`w-4 h-4 ${account ? getAccountIconColor(account.type) : 'text-slate-400'}`} />
                          <span className={`text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                            {account?.name || 'Unknown'}
                          </span>
                          {transaction.type === 'transfer' && transaction.transferToAccountId && (
                            <>
                              <ArrowLeftRight className="w-3 h-3 text-blue-500" />
                              <span className={`text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                                {accounts.find(a => a.id === transaction.transferToAccountId)?.name}
                              </span>
                            </>
                          )}
                        </div>
                        {transaction.description && (
                          <p className={`text-sm mb-3 line-clamp-2 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                            {transaction.description}
                          </p>
                        )}
                        <div className={`flex items-center justify-between pt-3 border-t ${theme === 'dark' ? 'border-slate-700' : 'border-slate-200'}`}>
                          <div className="flex items-center gap-2">
                            {transaction.category && (
                              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                                theme === 'dark' ? 'bg-slate-700/50 text-slate-300' : 'bg-slate-100 text-slate-600'
                              }`}>
                                <Tag className="w-3 h-3" />
                                {transaction.category}
                              </span>
                            )}
                          </div>
                          <p className={`text-lg font-bold ${
                            transaction.type === 'income' ? 'text-emerald-500' 
                              : transaction.type === 'expense' ? 'text-red-500' 
                              : 'text-blue-500'
                          }`}>
                            {transaction.type === 'income' ? '+' : transaction.type === 'expense' ? '-' : '↔'}
                            {formatCurrency(transaction.amount)}
                          </p>
                        </div>
                        <div className={`flex items-center gap-2 mt-2 text-xs ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>
                          <Clock className="w-3 h-3" />
                          <span>{date} at {time}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className={`rounded-2xl border overflow-hidden ${theme === 'dark' ? 'border-slate-700/50' : 'border-slate-200'}`}>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className={theme === 'dark' ? 'bg-slate-800/50' : 'bg-slate-50'}>
                      <tr>
                        <th className={`px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>Transaction</th>
                        <th className={`px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>Account</th>
                        <th className={`px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>Type</th>
                        <th className={`px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>Category</th>
                        <th className={`px-6 py-4 text-right text-xs font-semibold uppercase tracking-wider ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>Amount</th>
                        <th className={`px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>Date</th>
                        <th className={`px-6 py-4 text-right text-xs font-semibold uppercase tracking-wider ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>Actions</th>
                      </tr>
                    </thead>
                    <tbody className={`divide-y ${theme === 'dark' ? 'divide-slate-700/50' : 'divide-slate-200'}`}>
                      {paginatedTransactions.map((transaction) => {
                        const TypeIcon = getTransactionTypeIcon(transaction.type);
                        const typeColor = getTransactionTypeColor(transaction.type, theme);
                        const account = accounts.find(a => a.id === transaction.accountId);
                        const AccountIcon = account ? getAccountIcon(account.type) : Wallet;
                        const { date, time } = formatDateTime(transaction.transactionDate);
                        
                        return (
                          <tr key={transaction.id} className={`transition-colors ${theme === 'dark' ? 'hover:bg-slate-800/30' : 'hover:bg-slate-50'}`}>
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-3">
                                <div className={`p-2 rounded-lg border ${typeColor}`}>
                                  <TypeIcon className="w-4 h-4" />
                                </div>
                                <div>
                                  <p className={`font-medium ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>{transaction.name}</p>
                                  <p className={`text-xs ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>{transaction.transactionNumber}</p>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-2">
                                <AccountIcon className={`w-4 h-4 ${account ? getAccountIconColor(account.type) : 'text-slate-400'}`} />
                                <span className={`text-sm ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>{account?.name || 'Unknown'}</span>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${typeColor}`}>
                                {transaction.type.charAt(0).toUpperCase() + transaction.type.slice(1)}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              {transaction.category ? (
                                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${theme === 'dark' ? 'bg-slate-700/50 text-slate-300' : 'bg-slate-100 text-slate-600'}`}>
                                  <Tag className="w-3 h-3" />
                                  {transaction.category}
                                </span>
                              ) : (
                                <span className={`text-xs ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>-</span>
                              )}
                            </td>
                            <td className="px-6 py-4 text-right">
                              <span className={`text-lg font-semibold ${
                                transaction.type === 'income' ? 'text-emerald-500' : transaction.type === 'expense' ? 'text-red-500' : 'text-blue-500'
                              }`}>
                                {transaction.type === 'income' ? '+' : transaction.type === 'expense' ? '-' : '↔'}{formatCurrency(transaction.amount)}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex flex-col">
                                <span className={`text-sm ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>{date}</span>
                                <span className={`text-xs ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>{time}</span>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex items-center justify-end gap-1">
                                <button onClick={() => handleEditTransaction(transaction)} className={`p-2 rounded-lg transition-colors ${theme === 'dark' ? 'hover:bg-slate-700 text-slate-400' : 'hover:bg-slate-100 text-slate-600'}`}>
                                  <Edit className="w-4 h-4" />
                                </button>
                                <button onClick={() => handleDeleteClick(transaction)} className="p-2 rounded-lg text-red-500 hover:bg-red-500/10 transition-colors">
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )
          ) : (
            <div className={`rounded-2xl border p-12 text-center ${theme === 'dark' ? 'bg-slate-800/30 border-slate-700/50' : 'bg-white border-slate-200'}`}>
              <div className={`w-16 h-16 mx-auto rounded-full flex items-center justify-center ${theme === 'dark' ? 'bg-slate-700' : 'bg-slate-100'}`}>
                <FileText className={`w-8 h-8 ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`} />
              </div>
              <h3 className={`mt-4 text-lg font-semibold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>No transactions found</h3>
              <p className={`mt-2 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                {hasActiveFilters ? 'Try adjusting your filters' : 'Add your first transaction to get started'}
              </p>
              {!hasActiveFilters && (
                <button onClick={handleAddTransaction} className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-xl font-medium">
                  <Plus className="w-4 h-4" />
                  Add Transaction
                </button>
              )}
            </div>
          )}

          {/* Pagination */}
          {totalPages >= 1 && (
            <div className={`p-4 rounded-2xl border ${theme === 'dark' ? 'bg-slate-800/30 border-slate-700/50' : 'bg-white border-slate-200'}`}>
              <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                <div className="flex items-center gap-4">
                  <p className={`text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                    Showing <span className="font-medium">{startIndex + 1}</span> - <span className="font-medium">{Math.min(startIndex + itemsPerPage, sortedTransactions.length)}</span> of <span className="font-medium">{sortedTransactions.length}</span> transactions
                  </p>
                  
                  {/* Items Per Page Selector - Creative Pill Buttons */}
                  <div className="flex items-center gap-2">
                    <span className={`text-sm ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>Show:</span>
                    <div className={`flex items-center rounded-full p-0.5 ${
                      theme === 'dark' ? 'bg-slate-800' : 'bg-slate-100'
                    }`}>
                      {(viewMode === 'table' ? [10, 20] : [9, 15]).map((num) => (
                        <button
                          key={num}
                          onClick={() => {
                            setItemsPerPage(num);
                            setCurrentPage(1);
                          }}
                          className={`px-3 py-1 rounded-full text-sm font-medium transition-all ${
                            itemsPerPage === num
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
                
                {/* Pagination Controls */}
                {totalPages > 1 && (
                  <div className="flex items-center gap-1">
                    <button onClick={() => setCurrentPage(1)} disabled={currentPage === 1} className={`p-2 rounded-lg ${currentPage === 1 ? 'text-slate-400' : theme === 'dark' ? 'hover:bg-slate-700 text-slate-300' : 'hover:bg-slate-100 text-slate-600'}`}>
                      <ChevronsLeft className="w-4 h-4" />
                    </button>
                    <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className={`p-2 rounded-lg ${currentPage === 1 ? 'text-slate-400' : theme === 'dark' ? 'hover:bg-slate-700 text-slate-300' : 'hover:bg-slate-100 text-slate-600'}`}>
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    {getPageNumbers.map((page, idx) => (
                      page === '...' ? (
                        <span key={`dots-${idx}`} className={`px-2 ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>...</span>
                      ) : (
                        <button key={page} onClick={() => setCurrentPage(page as number)} className={`w-9 h-9 rounded-lg text-sm font-medium ${currentPage === page ? 'bg-emerald-500 text-white' : theme === 'dark' ? 'hover:bg-slate-700 text-slate-300' : 'hover:bg-slate-100 text-slate-700'}`}>
                          {page}
                        </button>
                      )
                    ))}
                    <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className={`p-2 rounded-lg ${currentPage === totalPages ? 'text-slate-400' : theme === 'dark' ? 'hover:bg-slate-700 text-slate-300' : 'hover:bg-slate-100 text-slate-600'}`}>
                      <ChevronRight className="w-4 h-4" />
                    </button>
                    <button onClick={() => setCurrentPage(totalPages)} disabled={currentPage === totalPages} className={`p-2 rounded-lg ${currentPage === totalPages ? 'text-slate-400' : theme === 'dark' ? 'hover:bg-slate-700 text-slate-300' : 'hover:bg-slate-100 text-slate-600'}`}>
                      <ChevronsRight className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}

      {/* Accounts Tab - Manage Money Accounts */}
      {activeTab === 'accounts' && (
        <>
          {/* Search and Filters */}
          <div className={`p-3 sm:p-4 rounded-2xl border ${theme === 'dark' ? 'bg-slate-800/30 border-slate-700/50' : 'bg-white border-slate-200'}`}>
            <div className="flex flex-col lg:flex-row gap-3">
              {/* Search */}
              <div className={`flex items-center gap-2 px-3 sm:px-4 py-2 rounded-xl border flex-1 ${theme === 'dark' ? 'bg-slate-800/50 border-slate-700/50' : 'bg-slate-50 border-slate-200'}`}>
                <Search className={`w-5 h-5 flex-shrink-0 ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`} />
                <input
                  type="text"
                  placeholder="Search accounts..."
                  value={accountSearchQuery}
                  onChange={(e) => setAccountSearchQuery(e.target.value)}
                  className={`bg-transparent border-none outline-none flex-1 min-w-0 text-sm ${theme === 'dark' ? 'text-white placeholder-slate-500' : 'text-slate-900 placeholder-slate-400'}`}
                />
              </div>

              {/* Filters Row */}
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => setShowAccountFilters(!showAccountFilters)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-xl transition-colors ${
                    showAccountFilters || hasActiveAccountFilters
                      ? 'bg-emerald-500 text-white'
                      : theme === 'dark'
                        ? 'bg-slate-700 hover:bg-slate-600 text-slate-300'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                  }`}
                >
                  <Filter className="w-4 h-4" />
                  <span className="text-sm hidden sm:inline">Filters</span>
                  {hasActiveAccountFilters && (
                    <span className="px-1.5 py-0.5 text-xs bg-white/20 rounded-full">
                      {[accountTypeFilter !== 'all', accountStatusFilter !== 'all'].filter(Boolean).length}
                    </span>
                  )}
                </button>

                <button
                  onClick={() => setAccountSortOrder(accountSortOrder === 'asc' ? 'desc' : 'asc')}
                  className={`p-2 rounded-xl border transition-colors ${theme === 'dark' ? 'border-slate-700 hover:bg-slate-800 text-slate-400' : 'border-slate-200 hover:bg-slate-50 text-slate-600'}`}
                  title={accountSortOrder === 'asc' ? 'Balance: Low to High' : 'Balance: High to Low'}
                >
                  {accountSortOrder === 'asc' ? <SortAsc className="w-4 h-4" /> : <SortDesc className="w-4 h-4" />}
                </button>

                <div className={`flex items-center rounded-xl overflow-hidden border ${theme === 'dark' ? 'border-slate-700' : 'border-slate-200'}`}>
                  <button
                    onClick={() => setAccountViewMode('table')}
                    className={`p-2 transition-colors ${
                      accountViewMode === 'table'
                        ? 'bg-emerald-500 text-white'
                        : theme === 'dark'
                          ? 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                          : 'bg-white hover:bg-slate-100 text-slate-700'
                    }`}
                  >
                    <List className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setAccountViewMode('grid')}
                    className={`p-2 transition-colors ${
                      accountViewMode === 'grid'
                        ? 'bg-emerald-500 text-white'
                        : theme === 'dark'
                          ? 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                          : 'bg-white hover:bg-slate-100 text-slate-700'
                    }`}
                  >
                    <LayoutGrid className="w-4 h-4" />
                  </button>
                </div>

                {hasActiveAccountFilters && (
                  <button
                    onClick={clearAccountFilters}
                    className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-xl transition-colors ${theme === 'dark' ? 'text-slate-400 hover:text-white hover:bg-slate-700' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100'}`}
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    Clear
                  </button>
                )}

                <button
                  onClick={handleAddAccount}
                  className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-emerald-500 to-blue-500 text-white rounded-xl font-medium shadow-lg hover:shadow-emerald-500/25 transition-all"
                >
                  <Plus className="w-4 h-4" />
                  <span className="hidden sm:inline">Add Account</span>
                </button>
              </div>
            </div>

            {showAccountFilters && (
              <div className={`pt-3 sm:pt-4 mt-3 border-t ${theme === 'dark' ? 'border-slate-700/50' : 'border-slate-200'}`}>
                <div className="flex flex-wrap items-center gap-3">
                  {/* Account Type Filter */}
                  <div className="w-full sm:w-48">
                    <SearchableSelect
                      value={accountTypeFilter}
                      onValueChange={(value) => setAccountTypeFilter(value)}
                      placeholder="All Types"
                      searchPlaceholder="Search..."
                      emptyMessage="No options"
                      theme={theme}
                      options={[
                        { value: 'all', label: 'All Types', icon: <Wallet className="w-4 h-4" /> },
                        { value: 'drawer', label: 'Cash Drawer', icon: <Banknote className="w-4 h-4 text-amber-500" /> },
                        { value: 'cash_in_hand', label: 'Cash in Hand', icon: <HandCoins className="w-4 h-4 text-emerald-500" /> },
                        { value: 'business', label: 'Business Fund', icon: <Building2 className="w-4 h-4 text-blue-500" /> },
                        { value: 'bank', label: 'Bank Account', icon: <Landmark className="w-4 h-4 text-indigo-500" /> },
                        { value: 'mobile_wallet', label: 'Mobile Wallet', icon: <Wallet className="w-4 h-4 text-purple-500" /> },
                        { value: 'credit_card', label: 'Credit Card', icon: <CreditCard className="w-4 h-4 text-rose-500" /> },
                        { value: 'savings', label: 'Savings', icon: <PiggyBank className="w-4 h-4 text-teal-500" /> },
                        { value: 'investment', label: 'Investment', icon: <CircleDollarSign className="w-4 h-4 text-cyan-500" /> },
                        { value: 'other', label: 'Other', icon: <Coins className="w-4 h-4 text-slate-500" /> },
                      ]}
                    />
                  </div>
                  {/* Status Filter */}
                  <div className="w-full sm:w-40">
                    <SearchableSelect
                      value={accountStatusFilter}
                      onValueChange={(value) => setAccountStatusFilter(value)}
                      placeholder="All Status"
                      searchPlaceholder="Search..."
                      emptyMessage="No options"
                      theme={theme}
                      options={[
                        { value: 'all', label: 'All Status', icon: <Filter className="w-4 h-4" /> },
                        { value: 'active', label: 'Active', icon: <CheckCircle2 className="w-4 h-4 text-emerald-500" /> },
                        { value: 'inactive', label: 'Inactive', icon: <AlertTriangle className="w-4 h-4 text-slate-400" /> },
                      ]}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Account Type Summary Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {[
              { type: 'drawer' as CashAccountType, label: 'Drawers' },
              { type: 'cash_in_hand' as CashAccountType, label: 'Cash in Hand' },
              { type: 'bank' as CashAccountType, label: 'Banks' },
              { type: 'mobile_wallet' as CashAccountType, label: 'Wallets' },
              { type: 'business' as CashAccountType, label: 'Business' },
              { type: 'savings' as CashAccountType, label: 'Savings' },
            ].map(({ type, label }) => {
              const typeAccounts = accounts.filter(a => a.type === type);
              const totalBalance = typeAccounts.reduce((sum, a) => sum + a.balance, 0);
              const Icon = getAccountIcon(type);
              const iconColor = getAccountIconColor(type);
              const isSelected = accountTypeFilter === type;
              return (
                <button
                  key={type}
                  onClick={() => setAccountTypeFilter(isSelected ? 'all' : type)}
                  className={`p-3 rounded-xl border transition-all text-left ${
                    isSelected
                      ? 'border-emerald-500 bg-emerald-500/10'
                      : theme === 'dark'
                        ? 'bg-slate-800/30 border-slate-700/50 hover:border-slate-600'
                        : 'bg-white border-slate-200 shadow-sm hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <Icon className={`w-4 h-4 ${iconColor}`} />
                    <span className={`text-xs font-medium truncate ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                      {label}
                    </span>
                  </div>
                  <p className={`text-sm font-bold truncate ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                    {formatCurrency(totalBalance)}
                  </p>
                  <p className={`text-xs ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>
                    {typeAccounts.length} acc
                  </p>
                </button>
              );
            })}
          </div>

          {/* Table View */}
          {accountViewMode === 'table' && (
            <div className={`rounded-2xl border overflow-hidden ${theme === 'dark' ? 'border-slate-700/50' : 'border-slate-200'}`}>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className={theme === 'dark' ? 'bg-slate-800/50' : 'bg-slate-50'}>
                    <tr>
                      <th className={`px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>Account</th>
                      <th className={`px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>Type</th>
                      <th className={`px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider hidden md:table-cell ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>Bank/Details</th>
                      <th className={`px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>Balance</th>
                      <th className={`px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider hidden sm:table-cell ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>Status</th>
                      <th className={`px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>Actions</th>
                    </tr>
                  </thead>
                  <tbody className={`divide-y ${theme === 'dark' ? 'divide-slate-700/50' : 'divide-slate-200'}`}>
                    {paginatedAccounts.map((account) => {
                      const Icon = getAccountIcon(account.type);
                      const iconColor = getAccountIconColor(account.type);
                      const accountTxnCount = transactions.filter(t => t.accountId === account.id).length;
                      return (
                        <tr key={account.id} className={`transition-colors ${theme === 'dark' ? 'hover:bg-slate-800/30' : 'hover:bg-slate-50'}`}>
                          <td className="px-4 py-4">
                            <div className="flex items-center gap-3">
                              <div className={`p-2 rounded-lg ${theme === 'dark' ? 'bg-slate-800' : 'bg-slate-100'}`}>
                                <Icon className={`w-4 h-4 ${iconColor}`} />
                              </div>
                              <div>
                                <button 
                                  onClick={() => handleViewAccount(account)}
                                  className={`font-medium text-left hover:underline ${theme === 'dark' ? 'text-white hover:text-emerald-400' : 'text-slate-900 hover:text-emerald-600'}`}
                                >
                                  {account.name}
                                </button>
                                <p className={`text-xs ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>{accountTxnCount} transactions</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-4">
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${
                              theme === 'dark' 
                                ? 'bg-slate-800/50 border-slate-700 text-slate-300' 
                                : 'bg-slate-100 border-slate-200 text-slate-600'
                            }`}>
                              {getAccountTypeLabel(account.type)}
                            </span>
                          </td>
                          <td className={`px-4 py-4 hidden md:table-cell ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                            {account.type === 'bank' && account.bankName ? (
                              <div>
                                <p className="text-sm">{account.bankName}</p>
                                {account.accountNumber && (
                                  <p className={`text-xs ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>•••• {account.accountNumber.slice(-4)}</p>
                                )}
                              </div>
                            ) : (
                              <span className={`text-sm ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>-</span>
                            )}
                          </td>
                          <td className="px-4 py-4 text-right">
                            <span className={`text-lg font-bold ${account.balance >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                              {formatCurrency(account.balance)}
                            </span>
                          </td>
                          <td className="px-4 py-4 text-center hidden sm:table-cell">
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                              account.isActive
                                ? theme === 'dark' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-emerald-100 text-emerald-600'
                                : theme === 'dark' ? 'bg-slate-500/20 text-slate-400' : 'bg-slate-100 text-slate-500'
                            }`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${account.isActive ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                              {account.isActive ? 'Active' : 'Inactive'}
                            </span>
                          </td>
                          <td className="px-4 py-4">
                            <div className="flex items-center justify-center gap-1">
                              <button
                                onClick={() => handleViewAccount(account)}
                                className={`p-2 rounded-lg transition-colors ${theme === 'dark' ? 'hover:bg-emerald-500/20 text-slate-400 hover:text-emerald-400' : 'hover:bg-emerald-50 text-slate-500 hover:text-emerald-600'}`}
                                title="View Details"
                              >
                                <Eye className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleEditAccount(account)}
                                className={`p-2 rounded-lg transition-colors ${theme === 'dark' ? 'hover:bg-slate-700 text-slate-400 hover:text-white' : 'hover:bg-slate-100 text-slate-500 hover:text-slate-700'}`}
                                title="Edit Account"
                              >
                                <Edit className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDeleteAccountClick(account)}
                                className={`p-2 rounded-lg transition-colors ${theme === 'dark' ? 'hover:bg-red-500/20 text-slate-400 hover:text-red-400' : 'hover:bg-red-50 text-slate-500 hover:text-red-500'}`}
                                title="Delete Account"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              
              {paginatedAccounts.length === 0 && (
                <div className={`p-12 text-center ${theme === 'dark' ? 'bg-slate-800/20' : 'bg-slate-50'}`}>
                  <Wallet className={`w-12 h-12 mx-auto ${theme === 'dark' ? 'text-slate-600' : 'text-slate-300'}`} />
                  <h3 className={`mt-4 text-lg font-semibold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>No accounts found</h3>
                  <p className={`mt-2 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                    {hasActiveAccountFilters ? 'Try adjusting your filters' : 'Add your first account to get started'}
                  </p>
                  {!hasActiveAccountFilters && (
                    <button onClick={handleAddAccount} className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-xl font-medium">
                      <Plus className="w-4 h-4" />
                      Add Account
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Grid View */}
          {accountViewMode === 'grid' && (
            <>
              {paginatedAccounts.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {paginatedAccounts.map((account) => {
                    const Icon = getAccountIcon(account.type);
                    const colorClass = getAccountColor(account.type, theme);
                    const iconColor = getAccountIconColor(account.type);
                    const accountTransactions = transactions.filter(t => t.accountId === account.id);
                    const recentTransactions = accountTransactions.slice(0, 3);
                    
                    return (
                      <div
                        key={account.id}
                        onClick={() => handleViewAccount(account)}
                        className={`relative overflow-hidden rounded-2xl border bg-gradient-to-br ${colorClass} transition-all hover:scale-[1.01] cursor-pointer`}
                      >
                        {/* Decorative blur */}
                        <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-white/10 to-transparent rounded-full blur-2xl -translate-y-1/2 translate-x-1/2" />
                        
                        {/* Card Content */}
                        <div className="relative p-5">
                          {/* Header */}
                          <div className="flex items-start justify-between mb-4">
                            <div className="flex items-center gap-3">
                              <div className={`p-2.5 rounded-xl ${theme === 'dark' ? 'bg-white/10' : 'bg-white/80'}`}>
                                <Icon className={`w-5 h-5 ${iconColor}`} />
                              </div>
                              <div>
                                <h3 className={`font-semibold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                                  {account.name}
                                </h3>
                                <p className={`text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                                  {getAccountTypeLabel(account.type)}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                              <button
                                onClick={() => handleEditAccount(account)}
                                className={`p-2 rounded-lg transition-colors ${theme === 'dark' ? 'hover:bg-white/10 text-slate-400 hover:text-white' : 'hover:bg-black/5 text-slate-500 hover:text-slate-700'}`}
                              >
                                <Edit className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDeleteAccountClick(account)}
                                className={`p-2 rounded-lg transition-colors ${theme === 'dark' ? 'hover:bg-red-500/20 text-slate-400 hover:text-red-400' : 'hover:bg-red-50 text-slate-500 hover:text-red-500'}`}
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>

                          {/* Balance */}
                          <div className="mb-4">
                            <p className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                              {formatCurrency(account.balance)}
                            </p>
                            <p className={`text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                              Current Balance
                            </p>
                          </div>

                          {/* Bank Details (if applicable) */}
                          {account.type === 'bank' && account.bankName && (
                            <div className={`mb-4 p-3 rounded-xl ${theme === 'dark' ? 'bg-white/5' : 'bg-black/5'}`}>
                              <div className="flex items-center gap-2 mb-1">
                                <Landmark className={`w-3.5 h-3.5 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`} />
                                <span className={`text-xs font-medium ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                                  {account.bankName}
                                </span>
                              </div>
                              {account.accountNumber && (
                                <p className={`text-xs ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>
                                  •••• {account.accountNumber.slice(-4)}
                                </p>
                              )}
                            </div>
                          )}

                          {/* Description */}
                          {account.description && (
                            <p className={`text-sm mb-4 line-clamp-2 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                              {account.description}
                            </p>
                          )}

                          {/* Recent Transactions Preview */}
                          {recentTransactions.length > 0 && (
                            <div className={`pt-4 border-t ${theme === 'dark' ? 'border-white/10' : 'border-black/10'}`}>
                              <p className={`text-xs font-medium mb-2 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                                Recent Activity
                              </p>
                              <div className="space-y-2">
                                {recentTransactions.map((txn) => (
                                  <div key={txn.id} className="flex items-center justify-between">
                                    <span className={`text-xs truncate max-w-[120px] ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                                      {txn.name}
                                    </span>
                                    <span className={`text-xs font-medium ${
                                      txn.type === 'income' ? 'text-emerald-500' : txn.type === 'expense' ? 'text-red-500' : 'text-blue-500'
                                    }`}>
                                      {txn.type === 'income' ? '+' : '-'}{formatCurrency(txn.amount)}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Status & Stats Footer */}
                          <div className={`mt-4 pt-4 border-t flex items-center justify-between ${theme === 'dark' ? 'border-white/10' : 'border-black/10'}`}>
                            <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium ${
                              account.isActive
                                ? theme === 'dark' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-emerald-100 text-emerald-600'
                                : theme === 'dark' ? 'bg-slate-500/20 text-slate-400' : 'bg-slate-100 text-slate-500'
                            }`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${account.isActive ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                              {account.isActive ? 'Active' : 'Inactive'}
                            </span>
                            <span className={`text-xs ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>
                              {accountTransactions.length} transactions
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  {/* Add Account Card */}
                  <button
                    onClick={handleAddAccount}
                    className={`relative overflow-hidden rounded-2xl border-2 border-dashed p-8 transition-all hover:scale-[1.01] flex flex-col items-center justify-center gap-3 min-h-[280px] ${
                      theme === 'dark'
                        ? 'border-slate-700 hover:border-emerald-500/50 hover:bg-emerald-500/5'
                        : 'border-slate-200 hover:border-emerald-500 hover:bg-emerald-50'
                    }`}
                  >
                    <div className={`p-4 rounded-2xl ${theme === 'dark' ? 'bg-slate-800' : 'bg-slate-100'}`}>
                      <Plus className={`w-8 h-8 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`} />
                    </div>
                    <div className="text-center">
                      <p className={`font-semibold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                        Add New Account
                      </p>
                      <p className={`text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                        Bank, Wallet, or Custom
                      </p>
                    </div>
                  </button>
                </div>
              ) : (
                <div className={`p-12 text-center rounded-2xl border ${theme === 'dark' ? 'bg-slate-800/20 border-slate-700/50' : 'bg-slate-50 border-slate-200'}`}>
                  <Wallet className={`w-12 h-12 mx-auto ${theme === 'dark' ? 'text-slate-600' : 'text-slate-300'}`} />
                  <h3 className={`mt-4 text-lg font-semibold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>No accounts found</h3>
                  <p className={`mt-2 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                    {hasActiveAccountFilters ? 'Try adjusting your filters' : 'Add your first account to get started'}
                  </p>
                  {!hasActiveAccountFilters && (
                    <button onClick={handleAddAccount} className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-xl font-medium">
                      <Plus className="w-4 h-4" />
                      Add Account
                    </button>
                  )}
                </div>
              )}
            </>
          )}

          {/* Pagination */}
          {accountTotalPages >= 1 && sortedAccounts.length > 0 && (
            <div className={`p-4 rounded-2xl border ${theme === 'dark' ? 'bg-slate-800/30 border-slate-700/50' : 'bg-white border-slate-200'}`}>
              <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                <div className="flex items-center gap-4">
                  <p className={`text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                    Showing <span className="font-medium">{accountStartIndex + 1}</span> - <span className="font-medium">{Math.min(accountStartIndex + accountItemsPerPage, sortedAccounts.length)}</span> of <span className="font-medium">{sortedAccounts.length}</span> accounts
                  </p>
                  
                  {/* Items Per Page Selector */}
                  <div className="flex items-center gap-2">
                    <span className={`text-sm ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>Show:</span>
                    <div className={`flex items-center rounded-full p-0.5 ${theme === 'dark' ? 'bg-slate-800' : 'bg-slate-100'}`}>
                      {(accountViewMode === 'table' ? [10, 20] : [9, 15]).map((num) => (
                        <button
                          key={num}
                          onClick={() => {
                            setAccountItemsPerPage(num);
                            setAccountCurrentPage(1);
                          }}
                          className={`px-3 py-1 rounded-full text-sm font-medium transition-all ${
                            accountItemsPerPage === num
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
                
                {/* Pagination Controls */}
                {accountTotalPages > 1 && (
                  <div className="flex items-center gap-1">
                    <button onClick={() => setAccountCurrentPage(1)} disabled={accountCurrentPage === 1} className={`p-2 rounded-lg ${accountCurrentPage === 1 ? 'text-slate-400' : theme === 'dark' ? 'hover:bg-slate-700 text-slate-300' : 'hover:bg-slate-100 text-slate-600'}`}>
                      <ChevronsLeft className="w-4 h-4" />
                    </button>
                    <button onClick={() => setAccountCurrentPage(p => Math.max(1, p - 1))} disabled={accountCurrentPage === 1} className={`p-2 rounded-lg ${accountCurrentPage === 1 ? 'text-slate-400' : theme === 'dark' ? 'hover:bg-slate-700 text-slate-300' : 'hover:bg-slate-100 text-slate-600'}`}>
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    {getAccountPageNumbers.map((page, idx) => (
                      page === '...' ? (
                        <span key={`dots-${idx}`} className={`px-2 ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>...</span>
                      ) : (
                        <button key={page} onClick={() => setAccountCurrentPage(page as number)} className={`w-9 h-9 rounded-lg text-sm font-medium ${accountCurrentPage === page ? 'bg-emerald-500 text-white' : theme === 'dark' ? 'hover:bg-slate-700 text-slate-300' : 'hover:bg-slate-100 text-slate-700'}`}>
                          {page}
                        </button>
                      )
                    ))}
                    <button onClick={() => setAccountCurrentPage(p => Math.min(accountTotalPages, p + 1))} disabled={accountCurrentPage === accountTotalPages} className={`p-2 rounded-lg ${accountCurrentPage === accountTotalPages ? 'text-slate-400' : theme === 'dark' ? 'hover:bg-slate-700 text-slate-300' : 'hover:bg-slate-100 text-slate-600'}`}>
                      <ChevronRight className="w-4 h-4" />
                    </button>
                    <button onClick={() => setAccountCurrentPage(accountTotalPages)} disabled={accountCurrentPage === accountTotalPages} className={`p-2 rounded-lg ${accountCurrentPage === accountTotalPages ? 'text-slate-400' : theme === 'dark' ? 'hover:bg-slate-700 text-slate-300' : 'hover:bg-slate-100 text-slate-600'}`}>
                      <ChevronsRight className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Quick Tips */}
          <div className={`p-5 rounded-2xl border ${
            theme === 'dark' 
              ? 'bg-gradient-to-r from-blue-500/10 to-purple-500/10 border-blue-500/20' 
              : 'bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200'
          }`}>
            <div className="flex items-start gap-4">
              <div className={`p-2.5 rounded-xl ${theme === 'dark' ? 'bg-blue-500/20' : 'bg-blue-100'}`}>
                <Settings className="w-5 h-5 text-blue-500" />
              </div>
              <div>
                <h3 className={`font-semibold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                  Account Management Tips
                </h3>
                <ul className={`mt-2 space-y-1 text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                  <li>• Create separate accounts for different purposes (Drawer, Bank, Petty Cash)</li>
                  <li>• Track bank accounts with account numbers for easy reconciliation</li>
                  <li>• Use transfers to move money between accounts</li>
                  <li>• Inactive accounts won't appear in transaction forms but retain their history</li>
                </ul>
              </div>
            </div>
          </div>
        </>
      )}
      {/* Modals */}
      <CashTransactionModal
        isOpen={isTransactionModalOpen}
        transaction={selectedTransaction}
        accounts={accounts}
        onClose={() => { setIsTransactionModalOpen(false); setSelectedTransaction(null); }}
        onSave={handleSaveTransaction}
      />

      <AccountFormModal
        isOpen={isAccountModalOpen}
        onClose={() => { setIsAccountModalOpen(false); setSelectedAccountForEdit(null); }}
        onSave={handleSaveAccount}
        account={selectedAccountForEdit}
        existingAccounts={accounts}
      />

      <AccountDetailModal
        isOpen={isAccountDetailModalOpen}
        onClose={() => { setIsAccountDetailModalOpen(false); setSelectedAccountForView(null); }}
        account={selectedAccountForView}
        transactions={transactions}
        onEdit={handleEditAccount}
      />

      <DeleteConfirmationModal
        isOpen={isDeleteModalOpen}
        title="Delete Transaction"
        message={`Are you sure you want to delete "${transactionToDelete?.name}"? This action cannot be undone.`}
        onCancel={() => { setIsDeleteModalOpen(false); setTransactionToDelete(null); }}
        onConfirm={handleDeleteConfirm}
      />

      <DeleteConfirmationModal
        isOpen={isDeleteAccountModalOpen}
        title="Delete Account"
        message={`Are you sure you want to delete "${accountToDelete?.name}"? This will permanently remove the account. Make sure there are no transactions linked to this account.`}
        onCancel={() => { setIsDeleteAccountModalOpen(false); setAccountToDelete(null); }}
        onConfirm={handleDeleteAccountConfirm}
      />
    </div>
  );
};
