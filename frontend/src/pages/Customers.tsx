import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { 
  mockCustomers, 
  mockWhatsAppSettings, 
  mockInvoices
} from '../data/mockData';
import type { Customer, Invoice, CustomerPayment } from '../data/mockData';
import { CustomerFormModal } from '../components/modals/CustomerFormModal';
import { DeleteConfirmationModal } from '../components/modals/DeleteConfirmationModal';
import { CustomerStatementModal } from '../components/modals/CustomerStatementModal';
import { 
  Search, Plus, Edit, Trash2, Mail, Phone, AlertTriangle, CheckCircle, 
  Clock, CreditCard, Calendar, MessageCircle, Package, FileText,
  X, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, SlidersHorizontal,
  List, LayoutGrid, ArrowDownUp, SortAsc, SortDesc, Zap
} from 'lucide-react';

export const Customers: React.FC = () => {
  const { theme } = useTheme();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  
  // View mode and pagination
  const [viewMode, setViewMode] = useState<'card' | 'list'>('card');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(6);
  
  // Sorting
  const [sortBy, setSortBy] = useState<'name' | 'credit' | 'lastPurchase'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  
  // Advanced filters
  const [showFilters, setShowFilters] = useState(false);
  const [minCreditBalance, setMinCreditBalance] = useState('');
  const [maxCreditBalance, setMaxCreditBalance] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  
  // Calendar state
  const [showStartCalendar, setShowStartCalendar] = useState(false);
  const [showEndCalendar, setShowEndCalendar] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState(new Date());
  const startCalendarRef = useRef<HTMLDivElement>(null);
  const endCalendarRef = useRef<HTMLDivElement>(null);
  
  // Modal states
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isStatementModalOpen, setIsStatementModalOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | undefined>(undefined);
  const [customerToDelete, setCustomerToDelete] = useState<Customer | null>(null);
  const [customerForStatement, setCustomerForStatement] = useState<Customer | null>(null);
  
  // Local customers state for demo
  const [customers, setCustomers] = useState<Customer[]>(mockCustomers);
  
  // Invoices state for tracking payments
  const [invoices, setInvoices] = useState<Invoice[]>(mockInvoices);

  // WhatsApp settings
  const whatsAppSettings = mockWhatsAppSettings;

  // Update itemsPerPage when view mode changes
  useEffect(() => {
    if (viewMode === 'card') {
      setItemsPerPage(6);
    } else {
      setItemsPerPage(10);
    }
    setCurrentPage(1);
  }, [viewMode]);

  // Close calendar when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (startCalendarRef.current && !startCalendarRef.current.contains(event.target as Node)) {
        setShowStartCalendar(false);
      }
      if (endCalendarRef.current && !endCalendarRef.current.contains(event.target as Node)) {
        setShowEndCalendar(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filter and sort customers
  const filteredCustomers = useMemo(() => {
    let result = customers.filter(customer => {
      const matchesSearch = 
        customer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        customer.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        customer.phone.includes(searchQuery);
      
      const matchesStatus = statusFilter === 'all' || customer.creditStatus === statusFilter;
      
      const matchesMinCredit = !minCreditBalance || customer.creditBalance >= parseFloat(minCreditBalance);
      const matchesMaxCredit = !maxCreditBalance || customer.creditBalance <= parseFloat(maxCreditBalance);
      
      const lastPurchaseDate = customer.lastPurchase ? new Date(customer.lastPurchase) : null;
      const matchesStartDate = !startDate || (lastPurchaseDate && lastPurchaseDate >= new Date(startDate));
      const matchesEndDate = !endDate || (lastPurchaseDate && lastPurchaseDate <= new Date(endDate));
      
      return matchesSearch && matchesStatus && matchesMinCredit && matchesMaxCredit && matchesStartDate && matchesEndDate;
    });

    // Sort results
    result.sort((a, b) => {
      let comparison = 0;
      switch (sortBy) {
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'credit':
          comparison = a.creditBalance - b.creditBalance;
          break;
        case 'lastPurchase':
          comparison = new Date(a.lastPurchase || 0).getTime() - new Date(b.lastPurchase || 0).getTime();
          break;
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });

    return result;
  }, [customers, searchQuery, statusFilter, minCreditBalance, maxCreditBalance, startDate, endDate, sortBy, sortOrder]);

  // Pagination calculations
  const totalPages = Math.ceil(filteredCustomers.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedCustomers = filteredCustomers.slice(startIndex, endIndex);

  // Generate page numbers for pagination (like Suppliers)
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

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter, minCreditBalance, maxCreditBalance, startDate, endDate, itemsPerPage]);

  // Advanced filters count
  const advancedFiltersCount = [minCreditBalance, maxCreditBalance, startDate, endDate].filter(Boolean).length;

  // Clear advanced filters
  const clearAdvancedFilters = () => {
    setMinCreditBalance('');
    setMaxCreditBalance('');
    setStartDate('');
    setEndDate('');
  };

  // Statistics
  const stats = useMemo(() => {
    const totalCredit = customers.reduce((sum, c) => sum + (c.creditBalance || 0), 0);
    const overdueCount = customers.filter(c => c.creditStatus === 'overdue').length;
    const activeCount = customers.filter(c => c.creditStatus === 'active').length;
    const clearCount = customers.filter(c => c.creditStatus === 'clear').length;
    return { totalCredit, overdueCount, activeCount, clearCount };
  }, [customers]);

  const formatCurrency = (amount: number) => `Rs. ${amount.toLocaleString('en-LK')}`;

  const formatDateDisplay = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  // Calendar helper functions
  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    return {
      daysInMonth: lastDay.getDate(),
      startingDay: firstDay.getDay()
    };
  };

  const renderCalendar = (selectedDate: string, setDate: (date: string) => void, setShow: (show: boolean) => void) => {
    const { daysInMonth, startingDay } = getDaysInMonth(calendarMonth);
    const days = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    for (let i = 0; i < startingDay; i++) {
      days.push(<div key={`empty-${i}`} className="w-8 h-8" />);
    }
    
    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${calendarMonth.getFullYear()}-${String(calendarMonth.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const isSelected = selectedDate === dateStr;
      const currentDate = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth(), day);
      const isToday = currentDate.getTime() === today.getTime();
      
      days.push(
        <button
          key={day}
          onClick={() => {
            setDate(dateStr);
            setShow(false);
          }}
          className={`w-8 h-8 rounded-lg text-sm font-medium transition-all ${
            isSelected
              ? 'bg-emerald-500 text-white'
              : isToday
                ? theme === 'dark' 
                  ? 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30' 
                  : 'bg-emerald-100 text-emerald-600 hover:bg-emerald-200'
                : theme === 'dark'
                  ? 'hover:bg-slate-700 text-slate-300'
                  : 'hover:bg-slate-100 text-slate-700'
          }`}
        >
          {day}
        </button>
      );
    }
    
    return (
      <div className={`absolute top-full left-0 mt-2 p-3 rounded-xl shadow-xl border z-50 w-max ${
        theme === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'
      }`}>
        <div className="flex items-center justify-between mb-3">
          <button
            onClick={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() - 1))}
            className={`p-1 rounded-lg ${theme === 'dark' ? 'hover:bg-slate-700' : 'hover:bg-slate-100'}`}
          >
            <ChevronLeft className="w-4 h-4 text-white" />
          </button>
          <span className={`text-sm font-semibold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
            {calendarMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
          </span>
          <button
            onClick={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1))}
            className={`p-1 rounded-lg ${theme === 'dark' ? 'hover:bg-slate-700' : 'hover:bg-slate-100'}`}
          >
            <ChevronRight className="w-4 h-4 text-white" />
          </button>
        </div>
        <div className="grid grid-cols-7 gap-1 mb-2">
          {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(d => (
            <div key={d} className={`w-8 h-6 flex items-center justify-center text-xs font-medium ${
              theme === 'dark' ? 'text-slate-500' : 'text-slate-400'
            }`}>
              {d}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">{days}</div>
      </div>
    );
  };

  // WhatsApp reminder functions
  const sendFriendlyReminder = (customer: Customer) => {
    if (!whatsAppSettings.enabled) {
      alert('WhatsApp reminders are disabled. Please enable them in settings.');
      return;
    }

    const message = whatsAppSettings.paymentReminderTemplate
      .replace(/{{customerName}}/g, customer.name)
      .replace(/{{dueAmount}}/g, formatCurrency(customer.creditBalance))
      .replace(/{{dueDate}}/g, customer.creditDueDate ? new Date(customer.creditDueDate).toLocaleDateString('en-GB') : 'N/A')
      .replace(/{{totalAmount}}/g, formatCurrency(customer.creditBalance))
      .replace(/{{paidAmount}}/g, 'Rs. 0')
      .replace(/{{invoiceId}}/g, 'N/A');

    const phone = customer.phone.replace(/[^0-9]/g, '');
    const formattedPhone = phone.startsWith('0') ? '94' + phone.substring(1) : phone;
    const whatsappUrl = `whatsapp://send?phone=${formattedPhone}&text=${encodeURIComponent(message)}`;
    window.location.href = whatsappUrl;
  };

  const sendUrgentReminder = (customer: Customer) => {
    if (!whatsAppSettings.enabled) {
      alert('WhatsApp reminders are disabled. Please enable them in settings.');
      return;
    }

    const daysOverdue = customer.creditDueDate 
      ? Math.max(0, Math.ceil((new Date().getTime() - new Date(customer.creditDueDate).getTime()) / (1000 * 60 * 60 * 24)))
      : 0;

    const message = whatsAppSettings.overdueReminderTemplate
      .replace(/{{customerName}}/g, customer.name)
      .replace(/{{dueAmount}}/g, formatCurrency(customer.creditBalance))
      .replace(/{{dueDate}}/g, customer.creditDueDate ? new Date(customer.creditDueDate).toLocaleDateString('en-GB') : 'N/A')
      .replace(/{{daysOverdue}}/g, String(daysOverdue))
      .replace(/{{invoiceId}}/g, 'N/A');

    const phone = customer.phone.replace(/[^0-9]/g, '');
    const formattedPhone = phone.startsWith('0') ? '94' + phone.substring(1) : phone;
    const whatsappUrl = `whatsapp://send?phone=${formattedPhone}&text=${encodeURIComponent(message)}`;
    window.location.href = whatsappUrl;
  };

  const getDaysUntilDue = (dueDate?: string) => {
    if (!dueDate) return null;
    const today = new Date();
    const due = new Date(dueDate);
    const diff = Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return diff;
  };

  const getCreditStatusStyle = (status?: string) => {
    switch (status) {
      case 'clear':
        return theme === 'dark' 
          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
          : 'bg-emerald-50 text-emerald-600 border-emerald-200';
      case 'active':
        return theme === 'dark' 
          ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' 
          : 'bg-blue-50 text-blue-600 border-blue-200';
      case 'overdue':
        return theme === 'dark' 
          ? 'bg-red-500/10 text-red-400 border-red-500/20' 
          : 'bg-red-50 text-red-600 border-red-200';
      default:
        return theme === 'dark' 
          ? 'bg-slate-500/10 text-slate-400 border-slate-500/20' 
          : 'bg-slate-50 text-slate-600 border-slate-200';
    }
  };

  const getCreditStatusIcon = (status?: string) => {
    switch (status) {
      case 'clear': return <CheckCircle className="w-4 h-4" />;
      case 'active': return <Clock className="w-4 h-4" />;
      case 'overdue': return <AlertTriangle className="w-4 h-4" />;
      default: return null;
    }
  };

  const getProgressColor = (percentage: number) => {
    if (percentage >= 90) return 'from-red-500 to-red-600';
    if (percentage >= 70) return 'from-amber-500 to-orange-500';
    return 'from-emerald-500 to-teal-500';
  };

  // Handlers
  const handleAddCustomer = () => {
    setSelectedCustomer(undefined);
    setIsFormModalOpen(true);
  };

  const handleEditCustomer = (customer: Customer) => {
    setSelectedCustomer(customer);
    setIsFormModalOpen(true);
  };

  const handleDeleteClick = (customer: Customer) => {
    setCustomerToDelete(customer);
    setIsDeleteModalOpen(true);
  };

  const handleSaveCustomer = (customer: Customer) => {
    if (selectedCustomer) {
      setCustomers(prev => prev.map(c => c.id === customer.id ? customer : c));
    } else {
      setCustomers(prev => [...prev, customer]);
    }
  };

  const handleConfirmDelete = () => {
    if (customerToDelete) {
      setCustomers(prev => prev.filter(c => c.id !== customerToDelete.id));
      setIsDeleteModalOpen(false);
      setCustomerToDelete(null);
    }
  };

  // Statement modal handlers
  const handleViewStatement = (customer: Customer) => {
    setCustomerForStatement(customer);
    setIsStatementModalOpen(true);
  };

  type PaymentMethod = 'cash' | 'bank' | 'card' | 'cheque';

  /**
   * Handle payment from invoice - Updates both invoice and customer credit
   * This creates a bi-directional sync between invoice payments and customer credit
   */
  const handleMarkInvoiceAsPaid = (invoiceId: string, amount: number, paymentMethod: PaymentMethod = 'cash', notes?: string) => {
    const invoice = invoices.find(inv => inv.id === invoiceId);
    if (!invoice) return;

    // Create payment entry with source tracking
    const paymentEntry: CustomerPayment = {
      id: `PAY-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      invoiceId,
      amount,
      paymentDate: new Date().toISOString(),
      paymentMethod,
      notes,
      source: 'invoice', // Payment initiated from invoice
      appliedToInvoices: [{ invoiceId, amount }]
    };

    // Update invoice with payment
    setInvoices(prev => prev.map(inv => {
      if (inv.id === invoiceId) {
        const newPaidAmount = Math.min((inv.paidAmount || 0) + amount, inv.total);
        const newStatus = newPaidAmount >= inv.total ? 'fullpaid' : newPaidAmount > 0 ? 'halfpay' : 'unpaid';
        
        return { 
          ...inv, 
          paidAmount: newPaidAmount, 
          status: newStatus,
          lastPaymentDate: new Date().toISOString(),
          payments: [...(inv.payments || []), {
            id: paymentEntry.id,
            invoiceId,
            amount,
            paymentDate: new Date().toISOString(),
            paymentMethod,
            notes
          }],
          // Track credit settlement
          creditSettlements: [...(inv.creditSettlements || []), {
            paymentId: paymentEntry.id,
            amount,
            date: new Date().toISOString()
          }]
        };
      }
      return inv;
    }));

    // Bi-directional sync: Update customer credit balance
    if (customerForStatement) {
      setCustomers(prev => prev.map(c => {
        if (c.id === customerForStatement.id) {
          const newCreditBalance = Math.max(0, c.creditBalance - amount);
          
          // Determine new credit status
          let newStatus: 'clear' | 'active' | 'overdue' = c.creditStatus;
          if (newCreditBalance === 0) {
            newStatus = 'clear';
          }
          
          // Update creditInvoices - remove if fully paid
          const updatedInvoice = invoices.find(inv => inv.id === invoiceId);
          const isNowFullyPaid = updatedInvoice && ((updatedInvoice.paidAmount || 0) + amount >= updatedInvoice.total);
          const newCreditInvoices = isNowFullyPaid 
            ? (c.creditInvoices || []).filter(id => id !== invoiceId)
            : c.creditInvoices || [];
          
          return { 
            ...c, 
            creditBalance: newCreditBalance, 
            creditStatus: newStatus,
            creditInvoices: newCreditInvoices,
            paymentHistory: [...(c.paymentHistory || []), paymentEntry]
          };
        }
        return c;
      }));

      // Update customerForStatement for immediate UI update
      setCustomerForStatement(prev => {
        if (!prev) return prev;
        const newCreditBalance = Math.max(0, prev.creditBalance - amount);
        const updatedInvoice = invoices.find(inv => inv.id === invoiceId);
        const isNowFullyPaid = updatedInvoice && ((updatedInvoice.paidAmount || 0) + amount >= updatedInvoice.total);
        
        return {
          ...prev,
          creditBalance: newCreditBalance,
          creditStatus: newCreditBalance === 0 ? 'clear' : prev.creditStatus,
          creditInvoices: isNowFullyPaid 
            ? (prev.creditInvoices || []).filter(id => id !== invoiceId)
            : prev.creditInvoices || [],
          paymentHistory: [...(prev.paymentHistory || []), paymentEntry]
        };
      });
    }
  };

  /**
   * Handle bulk credit payment from customer side
   * Distributes payment across unpaid invoices (oldest first)
   * @reserved - Available for future multi-invoice payment UI
   */
  // @ts-expect-error Reserved for future use
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const _handleCustomerCreditPayment = useCallback((customerId: string, totalAmount: number, paymentMethod: PaymentMethod, notes?: string) => {
    const customer = customers.find(c => c.id === customerId);
    if (!customer) return;

    // Apply payment to invoices using helper function logic
    const customerCreditInvoices = invoices
      .filter(inv => inv.customerId === customerId && inv.status !== 'fullpaid')
      .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()); // Pay oldest first

    let remainingPayment = totalAmount;
    const paymentDistribution: { invoiceId: string; amount: number }[] = [];
    const updatedInvoices = [...invoices];

    for (const invoice of customerCreditInvoices) {
      if (remainingPayment <= 0) break;

      const invoiceBalance = invoice.total - (invoice.paidAmount || 0);
      const paymentForThisInvoice = Math.min(remainingPayment, invoiceBalance);

      if (paymentForThisInvoice > 0) {
        paymentDistribution.push({ invoiceId: invoice.id, amount: paymentForThisInvoice });
        remainingPayment -= paymentForThisInvoice;

        // Update invoice in array
        const idx = updatedInvoices.findIndex(i => i.id === invoice.id);
        if (idx >= 0) {
          const newPaidAmount = (updatedInvoices[idx].paidAmount || 0) + paymentForThisInvoice;
          const newStatus = newPaidAmount >= updatedInvoices[idx].total ? 'fullpaid' : 'halfpay';

          updatedInvoices[idx] = {
            ...updatedInvoices[idx],
            paidAmount: newPaidAmount,
            status: newStatus,
            lastPaymentDate: new Date().toISOString(),
            payments: [...(updatedInvoices[idx].payments || []), {
              id: `pay-${Date.now()}-${invoice.id}`,
              invoiceId: invoice.id,
              amount: paymentForThisInvoice,
              paymentDate: new Date().toISOString(),
              paymentMethod,
              notes: `Part of bulk payment: ${notes || ''}`
            }],
            creditSettlements: [...(updatedInvoices[idx].creditSettlements || []), {
              paymentId: `pay-${Date.now()}-${invoice.id}`,
              amount: paymentForThisInvoice,
              date: new Date().toISOString()
            }]
          };
        }
      }
    }

    // Update invoices state
    setInvoices(updatedInvoices);

    // Create customer payment entry
    const paymentEntry: CustomerPayment = {
      id: `CP-${Date.now()}`,
      invoiceId: paymentDistribution.length === 1 ? paymentDistribution[0].invoiceId : 'BULK',
      amount: totalAmount,
      paymentDate: new Date().toISOString(),
      paymentMethod,
      notes: notes || `Payment distributed to ${paymentDistribution.length} invoice(s)`,
      source: 'customer',
      appliedToInvoices: paymentDistribution
    };

    // Update customer
    const newCreditBalance = Math.max(0, customer.creditBalance - totalAmount);
    const fullyPaidInvoiceIds = paymentDistribution
      .filter(pd => {
        const inv = updatedInvoices.find(i => i.id === pd.invoiceId);
        return inv && inv.status === 'fullpaid';
      })
      .map(pd => pd.invoiceId);

    setCustomers(prev => prev.map(c => {
      if (c.id === customerId) {
        return {
          ...c,
          creditBalance: newCreditBalance,
          creditStatus: newCreditBalance === 0 ? 'clear' : c.creditStatus,
          creditInvoices: (c.creditInvoices || []).filter(id => !fullyPaidInvoiceIds.includes(id)),
          paymentHistory: [...(c.paymentHistory || []), paymentEntry]
        };
      }
      return c;
    }));

    // Update customerForStatement if it matches
    if (customerForStatement?.id === customerId) {
      setCustomerForStatement(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          creditBalance: newCreditBalance,
          creditStatus: newCreditBalance === 0 ? 'clear' : prev.creditStatus,
          creditInvoices: (prev.creditInvoices || []).filter(id => !fullyPaidInvoiceIds.includes(id)),
          paymentHistory: [...(prev.paymentHistory || []), paymentEntry]
        };
      });
    }

    return paymentDistribution;
  }, [customers, invoices, customerForStatement]);

  const handleSendInvoiceReminder = (invoice: Invoice, type: 'friendly' | 'urgent') => {
    if (!whatsAppSettings.enabled) {
      alert('WhatsApp reminders are disabled. Please enable them in settings.');
      return;
    }

    const customer = customers.find(c => c.id === invoice.customerId);
    if (!customer) return;

    const outstanding = invoice.total - (invoice.paidAmount || 0);
    const daysOverdue = Math.max(0, Math.ceil((new Date().getTime() - new Date(invoice.dueDate).getTime()) / (1000 * 60 * 60 * 24)));

    const template = type === 'friendly' 
      ? whatsAppSettings.paymentReminderTemplate 
      : whatsAppSettings.overdueReminderTemplate;

    const message = template
      .replace(/{{customerName}}/g, customer.name)
      .replace(/{{invoiceId}}/g, invoice.id)
      .replace(/{{totalAmount}}/g, formatCurrency(invoice.total))
      .replace(/{{paidAmount}}/g, formatCurrency(invoice.paidAmount || 0))
      .replace(/{{dueAmount}}/g, formatCurrency(outstanding))
      .replace(/{{dueDate}}/g, new Date(invoice.dueDate).toLocaleDateString('en-GB'))
      .replace(/{{daysOverdue}}/g, String(daysOverdue));

    const phone = customer.phone.replace(/[^0-9]/g, '');
    const formattedPhone = phone.startsWith('0') ? '94' + phone.substring(1) : phone;
    const whatsappUrl = `whatsapp://send?phone=${formattedPhone}&text=${encodeURIComponent(message)}`;
    window.location.href = whatsappUrl;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className={`text-2xl lg:text-3xl font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
            Customers
          </h1>
          <p className={`mt-1 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
            Manage customer relationships and credit accounts
          </p>
        </div>
        <button 
          onClick={handleAddCustomer}
          className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-xl font-medium hover:opacity-90 transition-opacity shadow-lg shadow-emerald-500/20"
        >
          <Plus className="w-5 h-5" />
          Add Customer
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className={`rounded-2xl border p-4 ${
          theme === 'dark' ? 'bg-slate-800/30 border-slate-700/50' : 'bg-white border-slate-200'
        }`}>
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-xl ${theme === 'dark' ? 'bg-red-500/10' : 'bg-red-50'}`}>
              <CreditCard className="w-5 h-5 text-red-500" />
            </div>
            <div>
              <p className={`text-xs font-medium ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>Total Credit</p>
              <p className="text-lg font-bold text-red-500">{formatCurrency(stats.totalCredit)}</p>
            </div>
          </div>
        </div>

        <div className={`rounded-2xl border p-4 ${
          theme === 'dark' ? 'bg-slate-800/30 border-slate-700/50' : 'bg-white border-slate-200'
        }`}>
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-xl ${theme === 'dark' ? 'bg-amber-500/10' : 'bg-amber-50'}`}>
              <AlertTriangle className="w-5 h-5 text-amber-500" />
            </div>
            <div>
              <p className={`text-xs font-medium ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>Overdue</p>
              <p className="text-lg font-bold text-amber-500">{stats.overdueCount} Customers</p>
            </div>
          </div>
        </div>

        <div className={`rounded-2xl border p-4 ${
          theme === 'dark' ? 'bg-slate-800/30 border-slate-700/50' : 'bg-white border-slate-200'
        }`}>
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-xl ${theme === 'dark' ? 'bg-blue-500/10' : 'bg-blue-50'}`}>
              <Clock className="w-5 h-5 text-blue-500" />
            </div>
            <div>
              <p className={`text-xs font-medium ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>Active Credit</p>
              <p className="text-lg font-bold text-blue-500">{stats.activeCount} Customers</p>
            </div>
          </div>
        </div>

        <div className={`rounded-2xl border p-4 ${
          theme === 'dark' ? 'bg-slate-800/30 border-slate-700/50' : 'bg-white border-slate-200'
        }`}>
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-xl ${theme === 'dark' ? 'bg-emerald-500/10' : 'bg-emerald-50'}`}>
              <CheckCircle className="w-5 h-5 text-emerald-500" />
            </div>
            <div>
              <p className={`text-xs font-medium ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>Clear</p>
              <p className="text-lg font-bold text-emerald-500">{stats.clearCount} Customers</p>
            </div>
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className={`p-3 sm:p-4 rounded-2xl border ${
        theme === 'dark' 
          ? 'bg-slate-800/30 border-slate-700/50' 
          : 'bg-white border-slate-200'
      }`}>
        <div className="flex flex-col lg:flex-row gap-3">
          {/* Search Input */}
          <div className={`flex items-center gap-2 px-3 sm:px-4 py-2 rounded-xl border flex-1 ${
            theme === 'dark' 
              ? 'bg-slate-800/50 border-slate-700/50' 
              : 'bg-slate-50 border-slate-200'
          }`}>
            <Search className={`w-5 h-5 flex-shrink-0 ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`} />
            <input
              type="text"
              placeholder="Search customers by name, email or phone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`bg-transparent border-none outline-none flex-1 min-w-0 text-sm ${
                theme === 'dark' ? 'text-white placeholder-slate-500' : 'text-slate-900 placeholder-slate-400'
              }`}
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Filters Row */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Filter Toggle Button */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-2 px-3 py-2 rounded-xl transition-colors ${
                showFilters || advancedFiltersCount > 0
                  ? 'bg-emerald-500 text-white'
                  : theme === 'dark'
                    ? 'bg-slate-700 hover:bg-slate-600 text-slate-300'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
              }`}
            >
              <SlidersHorizontal className="w-4 h-4" />
              <span className="text-sm hidden sm:inline">Filters</span>
              {advancedFiltersCount > 0 && (
                <span className="px-1.5 py-0.5 text-xs bg-white/20 rounded-full">
                  {advancedFiltersCount}
                </span>
              )}
            </button>

            {/* Sort Button */}
            <button
              onClick={() => {
                const nextSort = sortBy === 'name' ? 'credit' : sortBy === 'credit' ? 'lastPurchase' : 'name';
                setSortBy(nextSort);
              }}
              className={`flex items-center gap-2 px-3 py-2 rounded-xl border transition-colors ${
                theme === 'dark' 
                  ? 'border-slate-700 hover:bg-slate-800 text-slate-300' 
                  : 'border-slate-200 hover:bg-slate-50 text-slate-700'
              }`}
              title="Sort by"
            >
              <ArrowDownUp className="w-4 h-4" />
              <span className="text-sm hidden sm:inline capitalize">{sortBy}</span>
            </button>

            {/* Sort Order Toggle */}
            <button
              onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
              className={`p-2 rounded-xl border transition-colors ${
                theme === 'dark' ? 'border-slate-700 hover:bg-slate-800 text-slate-400' : 'border-slate-200 hover:bg-slate-50 text-slate-600'
              }`}
              title={sortOrder === 'asc' ? 'Ascending' : 'Descending'}
            >
              {sortOrder === 'asc' ? <SortAsc className="w-4 h-4" /> : <SortDesc className="w-4 h-4" />}
            </button>

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
                title="Card view"
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 transition-colors ${
                  viewMode === 'list'
                    ? 'bg-emerald-500 text-white'
                    : theme === 'dark'
                      ? 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                      : 'bg-white hover:bg-slate-100 text-slate-700'
                }`}
                title="List view"
              >
                <List className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Status Filter Buttons */}
        <div className="flex flex-wrap gap-2 mt-4">
          {[
            { value: 'all', label: 'All', icon: Package, count: customers.length },
            { value: 'overdue', label: 'Overdue', icon: AlertTriangle, count: customers.filter(c => c.creditStatus === 'overdue').length },
            { value: 'active', label: 'Active', icon: Clock, count: customers.filter(c => c.creditStatus === 'active').length },
            { value: 'clear', label: 'Clear', icon: CheckCircle, count: customers.filter(c => c.creditStatus === 'clear').length },
          ].map(({ value, label, icon: Icon, count }) => (
            <button
              key={value}
              onClick={() => setStatusFilter(value)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                statusFilter === value
                  ? value === 'overdue' 
                    ? 'bg-gradient-to-r from-red-500 to-rose-500 text-white shadow-lg'
                    : value === 'active'
                      ? 'bg-gradient-to-r from-blue-500 to-indigo-500 text-white shadow-lg'
                      : value === 'clear'
                        ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-lg'
                        : 'bg-gradient-to-r from-violet-500 to-purple-500 text-white shadow-lg'
                  : theme === 'dark' 
                    ? 'bg-slate-800/50 text-slate-400 hover:text-white hover:bg-slate-700/50' 
                    : 'bg-slate-100 text-slate-600 hover:text-slate-900 hover:bg-slate-200'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{label}</span>
              <span className={`px-1.5 py-0.5 text-xs rounded-full ${
                statusFilter === value ? 'bg-white/20' : theme === 'dark' ? 'bg-slate-700' : 'bg-slate-200'
              }`}>
                {count}
              </span>
            </button>
          ))}
        </div>

        {/* Advanced Filters (Collapsible) */}
        {showFilters && (
          <div className={`pt-4 mt-4 border-t ${theme === 'dark' ? 'border-slate-700/50' : 'border-slate-200'}`}>
            <div className="flex flex-wrap items-center gap-4">
              {/* Credit Balance Range */}
              <div className="flex items-center gap-2">
                <CreditCard className={`w-4 h-4 flex-shrink-0 ${theme === 'dark' ? 'text-emerald-500' : 'text-emerald-600'}`} />
                <span className={`text-sm font-medium ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>Credit:</span>
                <input
                  type="number"
                  placeholder="Min"
                  value={minCreditBalance}
                  onChange={(e) => setMinCreditBalance(e.target.value)}
                  className={`w-28 px-3 py-1.5 rounded-xl border text-sm ${
                    theme === 'dark' 
                      ? 'bg-slate-800/50 border-slate-700/50 text-white placeholder-slate-500' 
                      : 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400'
                  }`}
                />
                <span className={`${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>-</span>
                <input
                  type="number"
                  placeholder="Max"
                  value={maxCreditBalance}
                  onChange={(e) => setMaxCreditBalance(e.target.value)}
                  className={`w-28 px-3 py-1.5 rounded-xl border text-sm ${
                    theme === 'dark' 
                      ? 'bg-slate-800/50 border-slate-700/50 text-white placeholder-slate-500' 
                      : 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400'
                  }`}
                />
              </div>

              {/* Date Range with Calendar */}
              <div className="flex items-center gap-2">
                <Calendar className={`w-4 h-4 flex-shrink-0 ${theme === 'dark' ? 'text-emerald-500' : 'text-emerald-600'}`} />
                <span className={`text-sm font-medium ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>Last Purchase:</span>
                {/* Start Date */}
                <div className="relative overflow-visible" ref={startCalendarRef}>
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
                
                {/* End Date */}
                <div className="relative overflow-visible" ref={endCalendarRef}>
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

              {/* Clear Filters Button */}
              {advancedFiltersCount > 0 && (
                <button
                  onClick={clearAdvancedFilters}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-sm font-medium transition-colors ${
                    theme === 'dark'
                      ? 'bg-red-500/10 hover:bg-red-500/20 text-red-400'
                      : 'bg-red-50 hover:bg-red-100 text-red-600'
                  }`}
                >
                  <X className="w-4 h-4" />
                  <span>Clear Filters</span>
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Customers Display */}
      {viewMode === 'list' ? (
        /* Table View */
        <div className={`rounded-2xl border overflow-hidden ${
          theme === 'dark' 
            ? 'bg-slate-800/30 border-slate-700/50' 
            : 'bg-white border-slate-200'
        }`}>
          {/* Desktop Table */}
          <div className="hidden md:block">
            <table className="w-full table-fixed">
              <thead>
                <tr className={`border-b ${theme === 'dark' ? 'border-slate-700/50' : 'border-slate-200'}`}>
                  <th className={`text-left px-3 py-3 text-xs font-semibold w-[22%] ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                    Customer
                  </th>
                  <th className={`text-left px-3 py-3 text-xs font-semibold w-[18%] ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                    Contact
                  </th>
                  <th className={`text-right px-3 py-3 text-xs font-semibold w-[14%] ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                    Credit Balance
                  </th>
                  <th className={`text-center px-3 py-3 text-xs font-semibold w-[12%] ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                    Status
                  </th>
                  <th className={`text-left px-3 py-3 text-xs font-semibold w-[14%] ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                    Last Purchase
                  </th>
                  <th className={`text-right px-3 py-3 text-xs font-semibold w-[20%] ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {paginatedCustomers.map((customer) => {
                  const isOverdue = customer.creditStatus === 'overdue';
                  const hasCredit = customer.creditBalance > 0;
                  return (
                    <tr 
                      key={customer.id}
                      className={`border-b transition-colors ${
                        isOverdue
                          ? theme === 'dark'
                            ? 'border-red-900/30 bg-red-950/20 hover:bg-red-950/30'
                            : 'border-red-100 bg-red-50/50 hover:bg-red-50'
                          : theme === 'dark' 
                            ? 'border-slate-700/30 hover:bg-slate-800/30' 
                            : 'border-slate-100 hover:bg-slate-50'
                      }`}
                    >
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold text-sm flex-shrink-0 ${
                            isOverdue 
                              ? 'bg-gradient-to-br from-red-500 to-rose-600' 
                              : 'bg-gradient-to-br from-emerald-500 to-teal-600'
                          }`}>
                            {customer.name.charAt(0)}
                          </div>
                          <div>
                            <p className={`font-medium truncate ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                              {customer.name}
                            </p>
                            <p className={`text-xs truncate ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>
                              {customer.totalOrders} orders
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className={`px-3 py-3 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                        <div className="text-xs space-y-1">
                          <div className="flex items-center gap-1 truncate">
                            <Mail className="w-3 h-3 flex-shrink-0" />
                            <span className="truncate">{customer.email}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Phone className="w-3 h-3 flex-shrink-0" />
                            {customer.phone}
                          </div>
                        </div>
                      </td>
                      <td className={`px-3 py-3 text-right font-medium text-sm ${isOverdue ? 'text-red-500' : theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                        {formatCurrency(customer.creditBalance)}
                      </td>
                      <td className="px-3 py-3 text-center">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full ${getCreditStatusStyle(customer.creditStatus)}`}>
                          {getCreditStatusIcon(customer.creditStatus)}
                          <span className="hidden sm:inline">{customer.creditStatus === 'clear' ? 'Clear' : customer.creditStatus === 'active' ? 'Active' : 'Overdue'}</span>
                        </span>
                      </td>
                      <td className={`px-3 py-3 text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                        {customer.lastPurchase ? new Date(customer.lastPurchase).toLocaleDateString('en-GB', {
                          day: '2-digit',
                          month: 'short',
                          year: '2-digit'
                        }) : 'N/A'}
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex items-center justify-end gap-1">
                          {/* Statement Button */}
                          <button
                            onClick={() => handleViewStatement(customer)}
                            className={`p-1.5 rounded-lg transition-colors ${
                              theme === 'dark' ? 'hover:bg-blue-500/10 text-blue-400' : 'hover:bg-blue-50 text-blue-500'
                            }`}
                            title="View Statement"
                          >
                            <FileText className="w-4 h-4" />
                          </button>
                          {/* WhatsApp Reminders - only show if has credit */}
                          {hasCredit && (
                            <>
                              <button
                                onClick={() => sendUrgentReminder(customer)}
                                className={`p-1.5 rounded-lg transition-colors ${
                                  theme === 'dark' ? 'hover:bg-red-500/10 text-red-400' : 'hover:bg-red-50 text-red-500'
                                }`}
                                title="Send Urgent Reminder (WhatsApp)"
                              >
                                <Zap className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => sendFriendlyReminder(customer)}
                                className={`p-1.5 rounded-lg transition-colors ${
                                  theme === 'dark' ? 'hover:bg-green-500/10 text-green-400' : 'hover:bg-green-50 text-green-500'
                                }`}
                                title="Send Friendly Reminder (WhatsApp)"
                              >
                                <MessageCircle className="w-4 h-4" />
                              </button>
                            </>
                          )}
                          <button
                            onClick={() => handleEditCustomer(customer)}
                            className={`p-1.5 rounded-lg transition-colors ${
                              theme === 'dark' ? 'hover:bg-slate-700 text-slate-400' : 'hover:bg-slate-100 text-slate-600'
                            }`}
                            title="Edit"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteClick(customer)}
                            className={`p-1.5 rounded-lg transition-colors ${
                              theme === 'dark' ? 'hover:bg-red-500/10 text-red-400' : 'hover:bg-red-50 text-red-500'
                            }`}
                            title="Delete"
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

          {/* Mobile List View (for table mode on mobile) */}
          <div className="md:hidden divide-y divide-slate-200 dark:divide-slate-700/50">
            {paginatedCustomers.map((customer) => {
              const isOverdue = customer.creditStatus === 'overdue';
              const hasCredit = customer.creditBalance > 0;
              return (
                <div 
                  key={customer.id}
                  className={`p-4 ${
                    isOverdue
                      ? theme === 'dark'
                        ? 'bg-red-950/20 hover:bg-red-950/30'
                        : 'bg-red-50/50 hover:bg-red-50'
                      : theme === 'dark' ? 'hover:bg-slate-800/30' : 'hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`w-12 h-12 rounded-lg flex items-center justify-center text-white font-bold text-sm flex-shrink-0 ${
                      isOverdue 
                        ? 'bg-gradient-to-br from-red-500 to-rose-600' 
                        : 'bg-gradient-to-br from-emerald-500 to-teal-600'
                    }`}>
                      {customer.name.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className={`font-medium ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                            {customer.name}
                          </p>
                          <p className={`text-xs ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>
                            {customer.email}
                          </p>
                        </div>
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full ${getCreditStatusStyle(customer.creditStatus)}`}>
                          {getCreditStatusIcon(customer.creditStatus)}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-2">
                        <Phone className={`w-3 h-3 ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`} />
                        <span className={`text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>{customer.phone}</span>
                      </div>
                      <div className="flex items-center justify-between mt-3">
                        <span className={`font-medium text-sm ${isOverdue ? 'text-red-500' : theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                          {formatCurrency(customer.creditBalance)}
                        </span>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleViewStatement(customer)}
                            className={`p-1.5 rounded-lg ${theme === 'dark' ? 'bg-blue-500/10 text-blue-400' : 'bg-blue-50 text-blue-500'}`}
                          >
                            <FileText className="w-4 h-4" />
                          </button>
                          {hasCredit && (
                            <>
                              <button
                                onClick={() => sendUrgentReminder(customer)}
                                className={`p-1.5 rounded-lg ${theme === 'dark' ? 'bg-red-500/10 text-red-400' : 'bg-red-50 text-red-500'}`}
                              >
                                <Zap className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => sendFriendlyReminder(customer)}
                                className={`p-1.5 rounded-lg ${theme === 'dark' ? 'bg-green-500/10 text-green-400' : 'bg-green-50 text-green-500'}`}
                              >
                                <MessageCircle className="w-4 h-4" />
                              </button>
                            </>
                          )}
                          <button
                            onClick={() => handleEditCustomer(customer)}
                            className={`p-1.5 rounded-lg ${theme === 'dark' ? 'bg-slate-700 text-slate-300' : 'bg-slate-100 text-slate-600'}`}
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteClick(customer)}
                            className={`p-1.5 rounded-lg ${theme === 'dark' ? 'bg-red-500/10 text-red-400' : 'bg-red-50 text-red-500'}`}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* Card View */
        <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
          {paginatedCustomers.map((customer) => {
            const daysUntilDue = getDaysUntilDue(customer.creditDueDate);
            const creditPercentage = customer.creditLimit ? (customer.creditBalance || 0) / customer.creditLimit * 100 : 0;
            const isOverdue = customer.creditStatus === 'overdue';
            const isDueSoon = daysUntilDue !== null && daysUntilDue <= 7 && daysUntilDue > 0;
            const hasCredit = (customer.creditBalance || 0) > 0;

            return (
              <div 
                key={customer.id}
                className={`rounded-2xl border overflow-hidden transition-all hover:shadow-lg ${
                  isOverdue
                    ? theme === 'dark' 
                      ? 'bg-slate-800/30 border-red-500/50 shadow-red-500/10' 
                      : 'bg-white border-red-300 shadow-red-100'
                    : theme === 'dark' 
                      ? 'bg-slate-800/30 border-slate-700/50 hover:border-emerald-500/30' 
                      : 'bg-white border-slate-200 hover:border-emerald-500/50'
                }`}
              >
                {/* Overdue Warning Banner */}
              {isOverdue && (
                <div className="bg-gradient-to-r from-red-500 to-rose-500 px-4 py-2 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-white" />
                  <span className="text-white text-sm font-medium">
                    ⚠️ Payment Overdue!
                  </span>
                </div>
              )}

              {/* Due Soon Warning */}
              {isDueSoon && !isOverdue && (
                <div className="bg-gradient-to-r from-amber-500 to-orange-500 px-4 py-2 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-white" />
                  <span className="text-white text-sm font-medium">
                    ⏰ Due in {daysUntilDue} days
                  </span>
                </div>
              )}

              <div className="p-5">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold text-lg ${
                      isOverdue 
                        ? 'bg-gradient-to-br from-red-500 to-rose-600' 
                        : 'bg-gradient-to-br from-emerald-500 to-teal-600'
                    }`}>
                      {customer.name.charAt(0)}
                    </div>
                    <div>
                      <h3 className={`font-semibold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                        {customer.name}
                      </h3>
                      <p className={`text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                        {customer.totalOrders} orders
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full border ${getCreditStatusStyle(customer.creditStatus)}`}>
                      {getCreditStatusIcon(customer.creditStatus)}
                      {customer.creditStatus === 'clear' ? 'Clear' : customer.creditStatus === 'active' ? 'Active' : customer.creditStatus === 'overdue' ? 'Overdue' : 'N/A'}
                    </span>
                    <div className="flex items-center gap-1">
                      <button 
                        onClick={() => handleViewStatement(customer)}
                        className={`p-1.5 rounded-lg transition-colors ${
                          theme === 'dark' ? 'hover:bg-blue-500/10 text-blue-400' : 'hover:bg-blue-50 text-blue-500'
                        }`}
                        title="View Statement"
                      >
                        <FileText className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => handleEditCustomer(customer)}
                        className={`p-1.5 rounded-lg transition-colors ${
                          theme === 'dark' ? 'hover:bg-slate-700 text-slate-400' : 'hover:bg-slate-100 text-slate-600'
                        }`}
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => handleDeleteClick(customer)}
                        className={`p-1.5 rounded-lg transition-colors ${
                          theme === 'dark' ? 'hover:bg-red-500/10 text-red-400' : 'hover:bg-red-50 text-red-500'
                        }`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>

                <div className="space-y-2 mb-4">
                  <div className="flex items-center gap-2">
                    <Mail className={`w-4 h-4 ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`} />
                    <span className={`text-sm truncate ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                      {customer.email}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone className={`w-4 h-4 ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`} />
                    <span className={`text-sm ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                      {customer.phone}
                    </span>
                  </div>
                </div>

                {/* Credit Section */}
                {hasCredit && (
                  <div className={`p-3 rounded-xl mb-4 ${
                    isOverdue
                      ? theme === 'dark' ? 'bg-red-500/10 border border-red-500/30' : 'bg-red-50 border border-red-200'
                      : theme === 'dark' ? 'bg-slate-800/50 border border-slate-700/50' : 'bg-slate-50 border border-slate-200'
                  }`}>
                    <div className="flex items-center justify-between mb-2">
                      <span className={`text-xs font-medium ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                        Credit (Naya)
                      </span>
                      <span className={`text-sm font-bold ${isOverdue ? 'text-red-500' : 'text-blue-500'}`}>
                        {formatCurrency(customer.creditBalance || 0)}
                      </span>
                    </div>
                    
                    {/* Credit Limit Progress Bar */}
                    {customer.creditLimit && (
                      <div className="mb-2">
                        <div className="flex justify-between text-xs mb-1">
                          <span className={theme === 'dark' ? 'text-slate-500' : 'text-slate-500'}>Limit Used</span>
                          <span className={theme === 'dark' ? 'text-slate-500' : 'text-slate-500'}>
                            {creditPercentage.toFixed(0)}%
                          </span>
                        </div>
                        <div className={`h-1.5 rounded-full overflow-hidden ${theme === 'dark' ? 'bg-slate-700' : 'bg-slate-200'}`}>
                          <div 
                            className={`h-full rounded-full bg-gradient-to-r ${getProgressColor(creditPercentage)} transition-all`}
                            style={{ width: `${Math.min(creditPercentage, 100)}%` }}
                          />
                        </div>
                        <p className={`text-xs mt-1 ${theme === 'dark' ? 'text-slate-500' : 'text-slate-500'}`}>
                          Max: {formatCurrency(customer.creditLimit)}
                        </p>
                      </div>
                    )}

                    {/* Due Date */}
                    {customer.creditDueDate && (
                      <div className="flex items-center justify-between pt-2 border-t border-dashed ${theme === 'dark' ? 'border-slate-700' : 'border-slate-300'}">
                        <span className={`text-xs ${theme === 'dark' ? 'text-slate-500' : 'text-slate-500'}`}>
                          <Calendar className="w-3 h-3 inline mr-1" />
                          Due
                        </span>
                        <span className={`text-xs font-medium ${
                          isOverdue ? 'text-red-500' : isDueSoon ? 'text-amber-500' : theme === 'dark' ? 'text-slate-300' : 'text-slate-700'
                        }`}>
                          {new Date(customer.creditDueDate).toLocaleDateString('en-GB')}
                        </span>
                      </div>
                    )}
                  </div>
                )}

                <div className={`pt-4 border-t ${theme === 'dark' ? 'border-slate-700/50' : 'border-slate-200'}`}>
                  <div className="flex items-center justify-between mb-3">
                    <span className={`text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                      Total Spent
                    </span>
                    <span className={`font-semibold ${theme === 'dark' ? 'text-emerald-400' : 'text-emerald-600'}`}>
                      {formatCurrency(customer.totalSpent)}
                    </span>
                  </div>
                  
                  {/* Quick Actions */}
                  {hasCredit && (
                    <div className="flex gap-2">
                      <button 
                        onClick={() => sendFriendlyReminder(customer)}
                        className={`flex-1 flex items-center justify-center gap-1 py-2 rounded-lg text-xs font-medium ${
                          theme === 'dark' ? 'bg-green-500/10 text-green-400 hover:bg-green-500/20' : 'bg-green-50 text-green-600 hover:bg-green-100'
                        }`}
                      >
                        <MessageCircle className="w-3.5 h-3.5" /> Remind
                      </button>
                      <button 
                        onClick={() => sendUrgentReminder(customer)}
                        className={`flex-1 flex items-center justify-center gap-1 py-2 rounded-lg text-xs font-medium ${
                          isOverdue
                            ? 'bg-gradient-to-r from-red-500 to-orange-500 text-white'
                            : 'bg-gradient-to-r from-amber-500 to-orange-500 text-white'
                        }`}
                      >
                        <Zap className="w-3.5 h-3.5" /> 
                        Urgent!
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
        </div>
      )}

      {/* Pagination */}
      {filteredCustomers.length > 0 && (
        <div className={`p-4 rounded-2xl border ${
          theme === 'dark' 
            ? 'bg-slate-800/30 border-slate-700/50' 
            : 'bg-white border-slate-200'
        }`}>
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            {/* Results Info */}
            <div className="flex items-center gap-4">
              <p className={`text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                Showing <span className="font-medium">{startIndex + 1}</span> - <span className="font-medium">{Math.min(endIndex, filteredCustomers.length)}</span> of <span className="font-medium">{filteredCustomers.length}</span> customers
              </p>
              
              {/* Items Per Page Selector - Creative Pill Buttons */}
              <div className="flex items-center gap-2">
                <span className={`text-sm ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>Show:</span>
                <div className={`flex items-center rounded-full p-0.5 ${
                  theme === 'dark' ? 'bg-slate-800' : 'bg-slate-100'
                }`}>
                  {(viewMode === 'list' ? [10, 20] : [6, 12]).map((num) => (
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
                {/* First Page */}
                <button
                  onClick={() => setCurrentPage(1)}
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
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
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
                  {getPageNumbers.map((page, index) => (
                    page === '...' ? (
                      <span key={`ellipsis-${index}`} className={`px-2 ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>
                        ...
                      </span>
                    ) : (
                      <button
                        key={page}
                        onClick={() => setCurrentPage(page as number)}
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
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
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
                  onClick={() => setCurrentPage(totalPages)}
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
          </div>
        </div>
      )}

      {/* Modals */}
      <CustomerFormModal
        isOpen={isFormModalOpen}
        customer={selectedCustomer}
        onClose={() => setIsFormModalOpen(false)}
        onSave={handleSaveCustomer}
      />

      <DeleteConfirmationModal
        isOpen={isDeleteModalOpen}
        title="Delete Customer"
        message="Are you sure you want to delete this customer? This action cannot be undone."
        itemName={customerToDelete?.name}
        onConfirm={handleConfirmDelete}
        onCancel={() => setIsDeleteModalOpen(false)}
      />

      <CustomerStatementModal
        isOpen={isStatementModalOpen}
        customer={customerForStatement}
        invoices={invoices}
        onClose={() => {
          setIsStatementModalOpen(false);
          setCustomerForStatement(null);
        }}
        onMarkAsPaid={handleMarkInvoiceAsPaid}
        onSendReminder={handleSendInvoiceReminder}
      />
    </div>
  );
};
