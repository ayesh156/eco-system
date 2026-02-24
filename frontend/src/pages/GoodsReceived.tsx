import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { useWhatsAppSettings } from '../contexts/WhatsAppSettingsContext';
import { useShopBranding } from '../contexts/ShopBrandingContext';
import type { GoodsReceivedNote, GRNStatus } from '../data/mockData';
import { GRNFormModal } from '../components/modals/GRNFormModal';
import { GRNWizardModal } from '../components/modals/GRNWizardModal';
import { GRNViewModal } from '../components/modals/GRNViewModal';
import { GRNPaymentModal } from '../components/modals/GRNPaymentModal';
import { DeleteConfirmationModal } from '../components/modals/DeleteConfirmationModal';
import { GRNReminderHistoryModal } from '../components/modals/GRNReminderHistoryModal';
import { SearchableSelect } from '../components/ui/searchable-select';
import * as grnService from '../services/grnService';
import * as supplierService from '../services/supplierService';
import { grnReminderService } from '../services/reminderService';
import { openWhatsAppWithMessage } from '../services/clientPdfService';
import type { FrontendGRN } from '../services/grnService';
import type { FrontendSupplier } from '../services/supplierService';
import { toast } from 'sonner';
import { 
  Search, Plus, Edit, Eye, Calendar, ClipboardCheck,
  CheckCircle, XCircle, Clock, AlertTriangle,
  ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight,
  FileText, Filter, RefreshCw, List, LayoutGrid,
  SortAsc, SortDesc, Building2, DollarSign,
  Trash2,
  CreditCard, Banknote, Wallet, Receipt, BadgePercent,
  MessageCircle, Loader2
} from 'lucide-react';

// GRN Status config for badges (removed 'inspecting')
const grnStatusConfig: Record<GRNStatus, { label: string; color: string; bgColor: string; borderColor: string; icon: React.ElementType }> = {
  pending: { label: 'Pending', color: 'text-amber-500', bgColor: 'bg-amber-500/10', borderColor: 'border-amber-500/30', icon: Clock },
  inspecting: { label: 'Inspecting', color: 'text-blue-500', bgColor: 'bg-blue-500/10', borderColor: 'border-blue-500/30', icon: Clock },
  partial: { label: 'Partial', color: 'text-orange-500', bgColor: 'bg-orange-500/10', borderColor: 'border-orange-500/30', icon: AlertTriangle },
  completed: { label: 'Completed', color: 'text-emerald-500', bgColor: 'bg-emerald-500/10', borderColor: 'border-emerald-500/30', icon: CheckCircle },
  rejected: { label: 'Rejected', color: 'text-red-500', bgColor: 'bg-red-500/10', borderColor: 'border-red-500/30', icon: XCircle },
};

// Payment method config for icons
const paymentMethodIcons: Record<string, { icon: React.ElementType; color: string; bgColor: string }> = {
  cash: { icon: Banknote, color: 'text-emerald-500', bgColor: 'bg-emerald-500/10' },
  bank: { icon: Building2, color: 'text-blue-500', bgColor: 'bg-blue-500/10' },
  card: { icon: CreditCard, color: 'text-purple-500', bgColor: 'bg-purple-500/10' },
  credit: { icon: Wallet, color: 'text-orange-500', bgColor: 'bg-orange-500/10' },
  cheque: { icon: Receipt, color: 'text-cyan-500', bgColor: 'bg-cyan-500/10' },
};

// Payment status config
const paymentStatusConfig: Record<string, { label: string; color: string; bgColor: string }> = {
  paid: { label: 'Paid', color: 'text-emerald-500', bgColor: 'bg-emerald-500/10' },
  partial: { label: 'Partial', color: 'text-amber-500', bgColor: 'bg-amber-500/10' },
  unpaid: { label: 'Unpaid', color: 'text-red-500', bgColor: 'bg-red-500/10' },
};

type ViewMode = 'grid' | 'table';

export const GoodsReceived: React.FC = () => {
  const { theme } = useTheme();
  const { isViewingShop, viewingShop } = useAuth();
  const { settings: whatsAppSettings } = useWhatsAppSettings();
  const { branding } = useShopBranding();
  
  // Get effective shopId for SUPER_ADMIN viewing a shop
  const effectiveShopId = isViewingShop && viewingShop ? viewingShop.id : undefined;
  
  // State
  const [grns, setGRNs] = useState<GoodsReceivedNote[]>([]);
  const [suppliers, setSuppliers] = useState<FrontendSupplier[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [supplierFilter, setSupplierFilter] = useState<string>('all');
  const [sendingReminderId, setSendingReminderId] = useState<string | null>(null);
  const [showReminderHistoryModal, setShowReminderHistoryModal] = useState(false);
  const [reminderHistoryGRN, setReminderHistoryGRN] = useState<GoodsReceivedNote | null>(null);
  
  // Date range filter states
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  
  // Price filter states
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  
  // View and sort
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [showFilters, setShowFilters] = useState(false);
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(9);
  
  // Calendar states
  const [showStartCalendar, setShowStartCalendar] = useState(false);
  const [showEndCalendar, setShowEndCalendar] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState(new Date());
  const startCalendarRef = useRef<HTMLDivElement>(null);
  const endCalendarRef = useRef<HTMLDivElement>(null);
  
  // Modal states
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [selectedGRN, setSelectedGRN] = useState<GoodsReceivedNote | null>(null);
  const [grnToDelete, setGrnToDelete] = useState<GoodsReceivedNote | null>(null);
  const [grnForPayment, setGrnForPayment] = useState<GoodsReceivedNote | null>(null);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);

  // Load GRNs and Suppliers from API
  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [grnsResult, suppliersResult] = await Promise.all([
        grnService.getGRNs({ shopId: effectiveShopId }),
        supplierService.getSuppliers(effectiveShopId)
      ]);
      
      if (grnsResult.success && grnsResult.data) {
        // Map API GRNs to frontend format with apiId
        const mappedGRNs: GoodsReceivedNote[] = grnsResult.data.map((grn: FrontendGRN) => ({
          ...grn,
          id: grn.grnNumber, // Use GRN number as display ID
          apiId: grn.apiId || grn.id, // Store actual UUID
        } as unknown as GoodsReceivedNote));
        setGRNs(mappedGRNs);
      } else {
        // No fallback - show empty state
        setGRNs([]);
        toast.error('Failed to load GRNs from server');
      }
      
      if (suppliersResult.success && suppliersResult.data) {
        setSuppliers(suppliersResult.data);
      } else {
        // No fallback - show empty state
        setSuppliers([]);
      }
    } catch (err) {
      console.error('Error loading data:', err);
      setError('Failed to load data');
      // No fallback - show empty state
      setGRNs([]);
      setSuppliers([]);
      toast.error('Failed to connect to server');
    } finally {
      setIsLoading(false);
    }
  }, [effectiveShopId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

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

  // Supplier options for SearchableSelect
  const supplierOptions = useMemo(() => [
    { value: 'all', label: 'All Suppliers' },
    ...suppliers.map(s => ({ value: s.id, label: s.company }))
  ], [suppliers]);

  // Status options for SearchableSelect
  const statusOptions = useMemo(() => [
    { value: 'all', label: 'All Status' },
    { value: 'pending', label: 'Pending' },
    { value: 'partial', label: 'Partial Received' },
    { value: 'completed', label: 'Completed' },
    { value: 'rejected', label: 'Rejected' },
  ], []);

  // Statistics
  const stats = useMemo(() => {
    const totalGRNs = grns.length;
    const pendingGRNs = grns.filter(g => g.status === 'pending' || g.status === 'inspecting').length;
    const completedGRNs = grns.filter(g => g.status === 'completed').length;
    const partialGRNs = grns.filter(g => g.status === 'partial').length;
    const rejectedGRNs = grns.filter(g => g.status === 'rejected').length;
    const totalValue = grns.reduce((sum, g) => sum + g.totalAmount, 0);
    const totalAccepted = grns.reduce((sum, g) => sum + g.totalAcceptedQuantity, 0);
    const totalRejected = grns.reduce((sum, g) => sum + g.totalRejectedQuantity, 0);
    const totalOrdered = grns.reduce((sum, g) => sum + g.totalOrderedQuantity, 0);
    const acceptanceRate = totalOrdered > 0 ? ((totalAccepted / totalOrdered) * 100).toFixed(1) : '0';
    // Paid vs unpaid amounts
    const totalPaid = grns.reduce((sum, g) => sum + (g.paidAmount || 0), 0);
    const totalUnpaid = totalValue - totalPaid;
    return { totalGRNs, pendingGRNs, completedGRNs, partialGRNs, rejectedGRNs, totalValue, totalAccepted, totalRejected, acceptanceRate, totalPaid, totalUnpaid };
  }, [grns]);

  // Filter GRNs
  const filteredGRNs = useMemo(() => {
    const filtered = grns.filter(grn => {
      const matchesSearch = 
        grn.grnNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        grn.supplierName.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesStatus = statusFilter === 'all' || grn.status === statusFilter || 
        (statusFilter === 'pending' && grn.status === 'inspecting'); // Treat inspecting as pending
      
      const matchesSupplier = supplierFilter === 'all' || grn.supplierId === supplierFilter;
      
      // Date range filter
      let matchesDate = true;
      if (startDate || endDate) {
        const grnDate = new Date(grn.orderDate);
        if (startDate) {
          const start = new Date(startDate);
          start.setHours(0, 0, 0, 0);
          matchesDate = matchesDate && grnDate >= start;
        }
        if (endDate) {
          const end = new Date(endDate);
          end.setHours(23, 59, 59, 999);
          matchesDate = matchesDate && grnDate <= end;
        }
      }
      
      // Price filter
      const minPriceNum = minPrice ? parseFloat(minPrice) : 0;
      const maxPriceNum = maxPrice ? parseFloat(maxPrice) : Infinity;
      const matchesPrice = grn.totalAmount >= minPriceNum && grn.totalAmount <= maxPriceNum;
      
      return matchesSearch && matchesStatus && matchesSupplier && matchesDate && matchesPrice;
    });

    // Apply sorting by date
    return filtered.sort((a, b) => {
      const dateA = new Date(a.orderDate).getTime();
      const dateB = new Date(b.orderDate).getTime();
      return sortOrder === 'asc' ? dateA - dateB : dateB - dateA;
    });
  }, [grns, searchQuery, statusFilter, supplierFilter, startDate, endDate, minPrice, maxPrice, sortOrder]);

  // Pagination
  const totalPages = Math.ceil(filteredGRNs.length / itemsPerPage);
  const paginatedGRNs = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredGRNs.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredGRNs, currentPage, itemsPerPage]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter, supplierFilter, startDate, endDate, minPrice, maxPrice]);

  // Reset items per page when view mode changes
  useEffect(() => {
    if (viewMode === 'table') {
      setItemsPerPage(10);
    } else {
      setItemsPerPage(9);
    }
    setCurrentPage(1);
  }, [viewMode]);

  // Generate page numbers for pagination
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

  const hasActiveFilters = searchQuery || statusFilter !== 'all' || supplierFilter !== 'all' || startDate || endDate || minPrice || maxPrice;

  const clearFilters = () => {
    setSearchQuery('');
    setStatusFilter('all');
    setSupplierFilter('all');
    setStartDate('');
    setEndDate('');
    setMinPrice('');
    setMaxPrice('');
  };

  // Wizard modal state
  const [isWizardOpen, setIsWizardOpen] = useState(false);

  // Handlers
  const handleCreateGRN = () => {
    setSelectedGRN(null);
    setIsWizardOpen(true);
  };

  const handleEditGRN = async (grn: GoodsReceivedNote) => {
    // Fetch full GRN with items if it's from API
    const apiId = (grn as FrontendGRN).apiId;
    if (apiId) {
      try {
        const result = await grnService.getGRNById(apiId, effectiveShopId);
        if (result.success && result.data) {
          // Use the full GRN data with items
          setSelectedGRN(result.data as unknown as GoodsReceivedNote);
          setIsFormModalOpen(true);
          return;
        }
      } catch (err) {
        console.error('Error fetching full GRN:', err);
      }
    }
    // Fallback to existing data
    setSelectedGRN(grn);
    setIsFormModalOpen(true);
  };

  const handleViewGRN = async (grn: GoodsReceivedNote) => {
    // Fetch full GRN with items if it's from API
    const apiId = (grn as FrontendGRN).apiId;
    if (apiId) {
      try {
        const result = await grnService.getGRNById(apiId, effectiveShopId);
        if (result.success && result.data) {
          setSelectedGRN(result.data as unknown as GoodsReceivedNote);
          setIsViewModalOpen(true);
          return;
        }
      } catch (err) {
        console.error('Error fetching full GRN:', err);
      }
    }
    setSelectedGRN(grn);
    setIsViewModalOpen(true);
  };

  const handleSaveGRN = async (grn: GoodsReceivedNote) => {
    setIsLoading(true);
    try {
      const grnApiId = (selectedGRN as FrontendGRN)?.apiId || (grn as unknown as FrontendGRN).apiId;
      
      if (selectedGRN && grnApiId) {
        // Update existing GRN via API
        const result = await grnService.updateGRN(grnApiId, grn as unknown as FrontendGRN, effectiveShopId);
        if (result.success && result.data) {
          // Reload data to get fresh state from server
          await loadData();
          toast.success('GRN Updated Successfully! ✅', {
            description: `GRN ${grn.grnNumber} has been updated`,
            duration: 3000,
          });
        } else {
          throw new Error(result.error || 'Failed to update GRN');
        }
      } else {
        // Create new GRN via API
        const result = await grnService.createGRN(grn as unknown as FrontendGRN);
        if (result.success && result.data) {
          // Reload data to get fresh state from server
          await loadData();
          toast.success('GRN Created Successfully! 🎉', {
            description: `GRN ${grn.grnNumber} has been created`,
            duration: 3000,
          });
        } else {
          throw new Error(result.error || 'Failed to create GRN');
        }
      }
    } catch (err) {
      console.error('Error saving GRN:', err);
      toast.error('Failed to save GRN', {
        description: err instanceof Error ? err.message : 'Please try again',
        duration: 4000,
      });
    } finally {
      setIsLoading(false);
      setIsFormModalOpen(false);
    }
  };

  const handleDeleteGRN = (grn: GoodsReceivedNote) => {
    setGrnToDelete(grn);
    setIsDeleteModalOpen(true);
  };

  const confirmDeleteGRN = async () => {
    if (grnToDelete) {
      setIsLoading(true);
      try {
        const apiId = (grnToDelete as FrontendGRN).apiId;
        if (apiId) {
          const result = await grnService.deleteGRN(apiId, effectiveShopId);
          if (result.success) {
            // Reload data from server
            await loadData();
            toast.success('GRN Deleted Successfully! 🗑️', {
              description: `GRN ${grnToDelete.grnNumber} has been removed`,
              duration: 3000,
            });
          } else {
            throw new Error(result.error || 'Failed to delete GRN');
          }
        } else {
          throw new Error('Cannot delete: GRN not saved to database');
        }
      } catch (err) {
        console.error('Error deleting GRN:', err);
        toast.error('Failed to delete GRN', {
          description: err instanceof Error ? err.message : 'Please try again',
          duration: 4000,
        });
      } finally {
        setIsLoading(false);
        setIsDeleteModalOpen(false);
        setGrnToDelete(null);
      }
    }
  };

  // Payment Handlers
  const handlePayGRN = (grn: GoodsReceivedNote) => {
    setGrnForPayment(grn);
    setIsPaymentModalOpen(true);
  };

  const handleGRNPayment = async (grnId: string, amount: number, paymentMethod: string, notes?: string) => {
    if (!grnForPayment) return;
    
    setIsProcessingPayment(true);
    try {
      // Use the API ID for the request
      const apiId = (grnForPayment as FrontendGRN).apiId || grnId;
      
      const result = await grnService.recordGRNPayment(apiId, {
        amount,
        paymentMethod,
        notes
      }, effectiveShopId);
      
      if (result.success && result.data) {
        // Update local state with new payment info
        setGRNs(prev => prev.map(grn => {
          const thisApiId = (grn as FrontendGRN).apiId;
          if (thisApiId === apiId || grn.id === grnId || grn.grnNumber === grnId) {
            return {
              ...grn,
              paidAmount: result.data!.paidAmount || (grn.paidAmount || 0) + amount,
              paymentStatus: result.data!.paymentStatus as 'paid' | 'partial' | 'unpaid' || grn.paymentStatus,
              paymentMethod: (result.data!.paymentMethod || paymentMethod) as 'cash' | 'bank' | 'card' | 'cheque' | 'credit',
              notes: result.data!.notes || grn.notes,
            };
          }
          return grn;
        }));
        
        toast.success('Payment Recorded! 💰', {
          description: `Rs. ${amount.toLocaleString()} paid for ${grnForPayment.grnNumber}`,
          duration: 3000,
        });
        
        setIsPaymentModalOpen(false);
        setGrnForPayment(null);
      } else {
        throw new Error(result.error || 'Failed to record payment');
      }
    } catch (err) {
      console.error('Error recording GRN payment:', err);
      toast.error('Failed to record payment', {
        description: err instanceof Error ? err.message : 'Please try again',
        duration: 4000,
      });
    } finally {
      setIsProcessingPayment(false);
    }
  };

  // Send WhatsApp reminder for GRN payment
  const sendWhatsAppReminder = async (grn: GoodsReceivedNote) => {
    // Check if GRN reminders are enabled
    if (!whatsAppSettings?.grnReminderEnabled) {
      toast.error('GRN reminders not enabled', {
        description: 'Please enable GRN reminders in Settings',
      });
      return;
    }

    // Find supplier to get phone number
    const supplier = suppliers.find(s => s.id === grn.supplierId);
    const supplierPhone = grn.supplierPhone?.replace(/[^0-9]/g, '') || supplier?.phone?.replace(/[^0-9]/g, '') || '';
    
    if (!supplierPhone) {
      toast.error('Supplier phone number not found!', {
        description: 'Please add a phone number to the supplier profile.',
      });
      return;
    }

    const grnIdentifier = (grn as FrontendGRN).apiId || grn.id;
    setSendingReminderId(grnIdentifier);

    try {
      // Get template based on payment status
      const balanceDue = grn.totalAmount - (grn.paidAmount || 0);
      const template = whatsAppSettings.grnPaymentReminderTemplate || '';

      // Format date
      const grnDate = new Date(grn.receivedDate || grn.orderDate).toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });

      // Replace placeholders in template with actual shop details from database
      const message = template
        .replace(/\{\{grnNumber\}\}/g, grn.grnNumber)
        .replace(/\{\{supplierName\}\}/g, grn.supplierName)
        .replace(/\{\{totalAmount\}\}/g, `Rs. ${grn.totalAmount.toLocaleString()}`)
        .replace(/\{\{balanceDue\}\}/g, `Rs. ${balanceDue.toLocaleString()}`)
        .replace(/\{\{paidAmount\}\}/g, `Rs. ${(grn.paidAmount || 0).toLocaleString()}`)
        .replace(/\{\{grnDate\}\}/g, grnDate)
        .replace(/\{\{shopName\}\}/g, branding?.name || 'Your Shop')
        .replace(/\{\{shopPhone\}\}/g, branding?.phone || '')
        .replace(/\{\{shopAddress\}\}/g, branding?.address || '');

      // Open WhatsApp with the message
      openWhatsAppWithMessage(supplierPhone, message);

      // Save reminder to database
      let reminderCount = (grn.reminderCount || 0) + 1;
      
      try {
        const result = await grnReminderService.create(grnIdentifier, {
          type: 'PAYMENT',
          channel: 'whatsapp',
          message,
          supplierPhone,
          supplierName: grn.supplierName,
          shopId: effectiveShopId,
        });
        
        if (result.reminderCount) {
          reminderCount = result.reminderCount;
        }
      } catch (saveError) {
        console.warn('Could not save reminder to database:', saveError);
      }

      // Update local GRN state with new reminder count
      setGRNs(prev => prev.map(g => {
        if ((g as FrontendGRN).apiId === grnIdentifier || g.id === grnIdentifier) {
          return { ...g, reminderCount };
        }
        return g;
      }));

      toast.success('Reminder sent! 💬', {
        description: `Reminder #${reminderCount} sent via WhatsApp`,
        duration: 3000,
      });
    } catch (error) {
      console.error('Failed to send reminder:', error);
      toast.error('Failed to send reminder', {
        description: error instanceof Error ? error.message : 'Please try again',
      });
    } finally {
      setSendingReminderId(null);
    }
  };

  // Open reminder history modal
  const handleOpenReminderHistory = (grn: GoodsReceivedNote) => {
    setReminderHistoryGRN(grn);
    setShowReminderHistoryModal(true);
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  const formatDateDisplay = (dateStr: string) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const formatCurrency = (amount: number) => `Rs. ${amount.toLocaleString('en-LK')}`;

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

  // Calendar Component
  const CalendarPopup = ({ 
    selectedDate, 
    onSelectDate, 
    onClose 
  }: { 
    selectedDate: string; 
    onSelectDate: (date: string) => void; 
    onClose: () => void;
  }) => {
    const { daysInMonth, startingDay } = getDaysInMonth(calendarMonth);
    const days = [];
    const weekDays = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
    
    // Empty cells for days before the month starts
    for (let i = 0; i < startingDay; i++) {
      days.push(<div key={`empty-${i}`} className="h-8" />);
    }
    
    // Days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth(), day);
      const dateStr = date.toISOString().split('T')[0];
      const isSelected = dateStr === selectedDate;
      const isToday = dateStr === new Date().toISOString().split('T')[0];
      
      days.push(
        <button
          key={day}
          onClick={() => {
            onSelectDate(dateStr);
            onClose();
          }}
          className={`h-8 w-8 rounded-lg text-sm font-medium transition-all flex items-center justify-center ${
            isSelected
              ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white'
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
      <>
      <div className="fixed inset-0 bg-black/40 z-[59] sm:hidden" onClick={() => onClose()} />
      <div className={`fixed sm:absolute bottom-0 sm:bottom-auto left-0 sm:left-0 right-0 sm:right-auto sm:top-full sm:mt-2 p-4 pt-3 rounded-t-3xl sm:rounded-2xl border-t sm:border shadow-2xl z-[60] w-full sm:w-[280px] ${
        theme === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'
      }`}>
        <div className="w-10 h-1 bg-slate-600 rounded-full mx-auto mb-3 sm:hidden" />
        {/* Month Navigation */}
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() - 1))}
            className={`p-1.5 rounded-lg transition-colors ${
              theme === 'dark' ? 'hover:bg-slate-700' : 'hover:bg-slate-100'
            }`}
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className={`font-semibold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
            {calendarMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
          </span>
          <button
            onClick={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1))}
            className={`p-1.5 rounded-lg transition-colors ${
              theme === 'dark' ? 'hover:bg-slate-700' : 'hover:bg-slate-100'
            }`}
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
        
        {/* Week Days */}
        <div className="grid grid-cols-7 gap-1 mb-2">
          {weekDays.map(day => (
            <div key={day} className={`h-8 flex items-center justify-center text-xs font-medium ${
              theme === 'dark' ? 'text-slate-500' : 'text-slate-400'
            }`}>
              {day}
            </div>
          ))}
        </div>
        
        {/* Days Grid */}
        <div className="grid grid-cols-7 gap-1">
          {days}
        </div>
        
        {/* Quick Actions */}
        <div className="flex gap-2 mt-4 pt-4 border-t border-slate-700/30">
          <button
            onClick={() => {
              onSelectDate(new Date().toISOString().split('T')[0]);
              onClose();
            }}
            className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              theme === 'dark' ? 'bg-slate-700 hover:bg-slate-600 text-slate-300' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
            }`}
          >
            Today
          </button>
          <button
            onClick={() => {
              onSelectDate('');
              onClose();
            }}
            className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              theme === 'dark' ? 'bg-slate-700 hover:bg-slate-600 text-slate-300' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
            }`}
          >
            Clear
          </button>
        </div>
      </div>
      </>
    );
  };

  // Skeleton Loading Component
  const SkeletonLoader = () => (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header Skeleton */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className={`text-2xl lg:text-3xl font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
            Goods Received
          </h1>
          <p className={`mt-1 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
            Loading GRNs...
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className={`w-10 h-10 rounded-xl animate-pulse ${theme === 'dark' ? 'bg-slate-700' : 'bg-slate-200'}`}></div>
          <div className={`w-32 h-10 rounded-xl animate-pulse ${theme === 'dark' ? 'bg-slate-700' : 'bg-slate-200'}`}></div>
        </div>
      </div>

      {/* Stats Skeleton - 2x2 grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className={`p-3 sm:p-4 rounded-xl border ${theme === 'dark' ? 'bg-slate-800/30 border-slate-700/50' : 'bg-white border-slate-200'}`}>
            <div className="flex items-center gap-2.5 sm:gap-3">
              <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-lg animate-pulse ${theme === 'dark' ? 'bg-slate-700' : 'bg-slate-200'}`}></div>
              <div className="flex-1 space-y-2">
                <div className={`h-6 w-16 rounded animate-pulse ${theme === 'dark' ? 'bg-slate-700' : 'bg-slate-200'}`}></div>
                <div className={`h-3 w-20 rounded animate-pulse ${theme === 'dark' ? 'bg-slate-700' : 'bg-slate-200'}`}></div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Filter Bar Skeleton */}
      <div className={`p-4 rounded-2xl border ${theme === 'dark' ? 'bg-slate-800/30 border-slate-700/50' : 'bg-white border-slate-200'}`}>
        <div className="flex flex-wrap items-center gap-3">
          <div className={`h-10 flex-1 min-w-[200px] rounded-xl animate-pulse ${theme === 'dark' ? 'bg-slate-700' : 'bg-slate-200'}`}></div>
          <div className={`h-10 w-32 rounded-xl animate-pulse ${theme === 'dark' ? 'bg-slate-700' : 'bg-slate-200'}`}></div>
          <div className={`h-10 w-10 rounded-xl animate-pulse ${theme === 'dark' ? 'bg-slate-700' : 'bg-slate-200'}`}></div>
        </div>
      </div>

      {/* Cards Skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className={`relative rounded-2xl border p-4 sm:p-5 overflow-hidden ${theme === 'dark' ? 'bg-slate-800/30 border-slate-700/50' : 'bg-white border-slate-200'}`}>
            {/* Shimmer Effect */}
            <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/10 to-transparent"></div>

            {/* Card Header */}
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl animate-pulse ${theme === 'dark' ? 'bg-slate-700' : 'bg-slate-200'}`}></div>
                <div className="space-y-2">
                  <div className={`h-5 w-24 sm:w-28 rounded animate-pulse ${theme === 'dark' ? 'bg-slate-700' : 'bg-slate-200'}`}></div>
                  <div className={`h-3 w-16 sm:w-20 rounded animate-pulse ${theme === 'dark' ? 'bg-slate-700' : 'bg-slate-200'}`}></div>
                </div>
              </div>
              <div className={`h-6 w-16 sm:w-20 rounded-full animate-pulse ${theme === 'dark' ? 'bg-slate-700' : 'bg-slate-200'}`}></div>
            </div>

            {/* Card Body */}
            <div className="space-y-3 mb-4">
              <div className="flex justify-between">
                <div className={`h-4 w-20 rounded animate-pulse ${theme === 'dark' ? 'bg-slate-700' : 'bg-slate-200'}`}></div>
                <div className={`h-4 w-16 rounded animate-pulse ${theme === 'dark' ? 'bg-slate-700' : 'bg-slate-200'}`}></div>
              </div>
              <div className="flex justify-between">
                <div className={`h-4 w-16 rounded animate-pulse ${theme === 'dark' ? 'bg-slate-700' : 'bg-slate-200'}`}></div>
                <div className={`h-4 w-24 rounded animate-pulse ${theme === 'dark' ? 'bg-slate-700' : 'bg-slate-200'}`}></div>
              </div>
              <div className="flex justify-between">
                <div className={`h-4 w-24 rounded animate-pulse ${theme === 'dark' ? 'bg-slate-700' : 'bg-slate-200'}`}></div>
                <div className={`h-4 w-20 rounded animate-pulse ${theme === 'dark' ? 'bg-slate-700' : 'bg-slate-200'}`}></div>
              </div>
            </div>

            {/* Card Footer */}
            <div className={`flex gap-2 pt-4 border-t ${theme === 'dark' ? 'border-slate-700/50' : 'border-slate-200'}`}>
              <div className={`h-8 w-24 rounded-lg animate-pulse ${theme === 'dark' ? 'bg-slate-700' : 'bg-slate-200'}`}></div>
              <div className="flex gap-2 ml-auto">
                <div className={`h-8 w-8 rounded-lg animate-pulse ${theme === 'dark' ? 'bg-slate-700' : 'bg-slate-200'}`}></div>
                <div className={`h-8 w-8 rounded-lg animate-pulse ${theme === 'dark' ? 'bg-slate-700' : 'bg-slate-200'}`}></div>
                <div className={`h-8 w-8 rounded-lg animate-pulse ${theme === 'dark' ? 'bg-slate-700' : 'bg-slate-200'}`}></div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Loading Indicator */}
      <div className="flex items-center justify-center py-4">
        <div className="flex items-center gap-3">
          <RefreshCw className={`w-5 h-5 animate-spin ${theme === 'dark' ? 'text-emerald-400' : 'text-emerald-500'}`} />
          <span className={`text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
            Fetching GRNs from server...
          </span>
        </div>
      </div>
    </div>
  );

  // Show skeleton while loading
  if (isLoading) {
    return <SkeletonLoader />;
  }

  return (
    <div className="space-y-3 sm:space-y-4 lg:space-y-6 pb-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className={`text-2xl lg:text-3xl font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
            Goods Received
          </h1>
          <p className={`mt-1 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
            Track and manage goods received from suppliers
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={() => loadData()}
            className={`p-2.5 rounded-xl transition-colors ${
              theme === 'dark' 
                ? 'bg-slate-800 hover:bg-slate-700 text-slate-400' 
                : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
            }`}
            title="Refresh GRNs"
          >
            <RefreshCw className="w-5 h-5" />
          </button>
          <button 
            onClick={handleCreateGRN}
            className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-xl font-medium hover:opacity-90 transition-opacity"
          >
            <Plus className="w-5 h-5" />
            Create GRN
          </button>
        </div>
      </div>

      {/* Stats Cards - 2x2 grid like Invoice page */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        {/* Total GRNs */}
        <div className={`p-3 sm:p-4 rounded-xl border ${theme === 'dark' ? 'bg-slate-800/30 border-slate-700/50' : 'bg-white border-slate-200 shadow-sm'}`}>
          <div className="flex items-center gap-2.5 sm:gap-3">
            <div className="w-9 h-9 sm:w-10 sm:h-10 bg-blue-500/10 rounded-lg flex items-center justify-center shrink-0">
              <FileText className="w-4 h-4 sm:w-5 sm:h-5 text-blue-400" />
            </div>
            <div className="min-w-0">
              <p className={`text-xl sm:text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>{stats.totalGRNs}</p>
              <p className={`text-[10px] sm:text-xs ${theme === 'dark' ? 'text-slate-500' : 'text-slate-500'}`}>Total GRNs</p>
            </div>
          </div>
        </div>

        {/* Completed Value */}
        <div className={`p-3 sm:p-4 rounded-xl border ${theme === 'dark' ? 'bg-slate-800/30 border-slate-700/50' : 'bg-white border-slate-200 shadow-sm'}`}>
          <div className="flex items-center gap-2.5 sm:gap-3">
            <div className="w-9 h-9 sm:w-10 sm:h-10 bg-emerald-500/10 rounded-lg flex items-center justify-center shrink-0">
              <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-400" />
            </div>
            <div className="min-w-0">
              <p className={`text-lg sm:text-xl font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                Rs. {stats.totalPaid >= 1000 ? `${(stats.totalPaid / 1000).toFixed(0)}K` : stats.totalPaid.toLocaleString()}
              </p>
              <p className={`text-[10px] sm:text-xs ${theme === 'dark' ? 'text-slate-500' : 'text-slate-500'}`}>{stats.completedGRNs} Completed</p>
            </div>
          </div>
        </div>

        {/* Pending */}
        <div className={`p-3 sm:p-4 rounded-xl border ${theme === 'dark' ? 'bg-slate-800/30 border-slate-700/50' : 'bg-white border-slate-200 shadow-sm'}`}>
          <div className="flex items-center gap-2.5 sm:gap-3">
            <div className="w-9 h-9 sm:w-10 sm:h-10 bg-amber-500/10 rounded-lg flex items-center justify-center shrink-0">
              <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-amber-400" />
            </div>
            <div className="min-w-0">
              <p className={`text-lg sm:text-xl font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>{stats.pendingGRNs + stats.partialGRNs}</p>
              <p className={`text-[10px] sm:text-xs ${theme === 'dark' ? 'text-slate-500' : 'text-slate-500'}`}>{stats.pendingGRNs} Pending · {stats.partialGRNs} Partial</p>
            </div>
          </div>
        </div>

        {/* Unpaid Amount */}
        <div className={`p-3 sm:p-4 rounded-xl border ${theme === 'dark' ? 'bg-slate-800/30 border-slate-700/50' : 'bg-white border-slate-200 shadow-sm'}`}>
          <div className="flex items-center gap-2.5 sm:gap-3">
            <div className="w-9 h-9 sm:w-10 sm:h-10 bg-red-500/10 rounded-lg flex items-center justify-center shrink-0">
              <XCircle className="w-4 h-4 sm:w-5 sm:h-5 text-red-400" />
            </div>
            <div className="min-w-0">
              <p className={`text-lg sm:text-xl font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                Rs. {stats.totalUnpaid >= 1000 ? `${(stats.totalUnpaid / 1000).toFixed(0)}K` : stats.totalUnpaid.toLocaleString()}
              </p>
              <p className={`text-[10px] sm:text-xs ${theme === 'dark' ? 'text-slate-500' : 'text-slate-500'}`}>Unpaid Balance</p>
            </div>
          </div>
        </div>
      </div>

      {/* Search, Filters & View Controls */}
      <div className={`p-2.5 sm:p-4 rounded-xl sm:rounded-2xl border space-y-3 sm:space-y-4 ${theme === 'dark' ? 'bg-slate-800/30 border-slate-700/50' : 'bg-white border-slate-200'}`}>
        {/* Top Row - Search and Controls */}
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-4">
          {/* Search */}
          <div className={`flex items-center gap-2 px-3 py-2 rounded-xl border flex-1 ${
            theme === 'dark' ? 'bg-slate-800/50 border-slate-700/50' : 'bg-slate-50 border-slate-200'
          }`}>
            <Search className={`w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0 ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`} />
            <input
              type="text"
              placeholder="Search GRNs..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`bg-transparent border-none outline-none flex-1 min-w-0 text-xs sm:text-sm ${
                theme === 'dark' ? 'text-white placeholder-slate-500' : 'text-slate-900 placeholder-slate-400'
              }`}
            />
          </div>

          {/* Controls */}
          <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
            {/* Filter Toggle */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-2 rounded-xl transition-colors text-xs sm:text-sm ${
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
                  {[statusFilter !== 'all', supplierFilter !== 'all', startDate, endDate, minPrice, maxPrice].filter(Boolean).length}
                </span>
              )}
            </button>

            {/* Sort Order */}
            <button
              onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
              className={`p-2 rounded-xl border transition-colors ${
                theme === 'dark'
                  ? 'border-slate-700 hover:bg-slate-800 text-slate-400'
                  : 'border-slate-200 hover:bg-slate-50 text-slate-600'
              }`}
              title={sortOrder === 'asc' ? 'Sort Descending' : 'Sort Ascending'}
            >
              {sortOrder === 'desc' ? <SortDesc className="w-4 h-4" /> : <SortAsc className="w-4 h-4" />}
            </button>

            {/* View Mode Toggle */}
            <div className={`flex items-center rounded-xl overflow-hidden border ${
              theme === 'dark' ? 'border-slate-700' : 'border-slate-200'
            }`}>
              <button
                onClick={() => setViewMode('table')}
                className={`p-2 transition-colors ${
                  viewMode === 'table'
                    ? 'bg-emerald-500 text-white'
                    : theme === 'dark' ? 'bg-slate-800 hover:bg-slate-700 text-slate-300' : 'bg-white hover:bg-slate-100 text-slate-700'
                }`}
                title="Table view"
              >
                <List className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 transition-colors ${
                  viewMode === 'grid'
                    ? 'bg-emerald-500 text-white'
                    : theme === 'dark' ? 'bg-slate-800 hover:bg-slate-700 text-slate-300' : 'bg-white hover:bg-slate-100 text-slate-700'
                }`}
                title="Card view"
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
            </div>

            {/* Clear Filters */}
            {hasActiveFilters && (
              <button
                onClick={clearFilters}
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
          </div>
        </div>

        {/* Expanded Filters */}
        {showFilters && (
          <div className={`pt-3 sm:pt-4 border-t grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 ${
            theme === 'dark' ? 'border-slate-700/50' : 'border-slate-200'
          }`}>
            {/* Status Filter */}
            <div>
              <label className={`block text-xs font-medium mb-2 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                Status
              </label>
              <SearchableSelect
                value={statusFilter}
                onValueChange={setStatusFilter}
                options={statusOptions}
                placeholder="All Status"
                theme={theme}
              />
            </div>

            {/* Supplier Filter */}
            <div>
              <label className={`block text-xs font-medium mb-2 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                Supplier
              </label>
              <SearchableSelect
                value={supplierFilter}
                onValueChange={setSupplierFilter}
                options={supplierOptions}
                placeholder="All Suppliers"
                theme={theme}
              />
            </div>

            {/* Date Range */}
            <div>
              <label className={`block text-xs font-medium mb-2 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                Date Range
              </label>
              <div className="flex gap-2">
                <div className="relative flex-1" ref={startCalendarRef}>
                  <button
                    onClick={() => {
                      setShowStartCalendar(!showStartCalendar);
                      setShowEndCalendar(false);
                      setCalendarMonth(startDate ? new Date(startDate) : new Date());
                    }}
                    className={`w-full flex items-center gap-2 px-3 py-2.5 rounded-xl border text-sm ${
                      theme === 'dark'
                        ? 'bg-slate-800/50 border-slate-700 text-white'
                        : 'bg-white border-slate-200 text-slate-900'
                    }`}
                  >
                    <Calendar className="w-4 h-4 text-slate-400" />
                    <span className={startDate ? '' : 'text-slate-400'}>
                      {startDate ? formatDateDisplay(startDate) : 'From'}
                    </span>
                  </button>
                  {showStartCalendar && (
                    <CalendarPopup
                      selectedDate={startDate}
                      onSelectDate={setStartDate}
                      onClose={() => setShowStartCalendar(false)}
                    />
                  )}
                </div>
                <div className="relative flex-1" ref={endCalendarRef}>
                  <button
                    onClick={() => {
                      setShowEndCalendar(!showEndCalendar);
                      setShowStartCalendar(false);
                      setCalendarMonth(endDate ? new Date(endDate) : new Date());
                    }}
                    className={`w-full flex items-center gap-2 px-3 py-2.5 rounded-xl border text-sm ${
                      theme === 'dark'
                        ? 'bg-slate-800/50 border-slate-700 text-white'
                        : 'bg-white border-slate-200 text-slate-900'
                    }`}
                  >
                    <Calendar className="w-4 h-4 text-slate-400" />
                    <span className={endDate ? '' : 'text-slate-400'}>
                      {endDate ? formatDateDisplay(endDate) : 'To'}
                    </span>
                  </button>
                  {showEndCalendar && (
                    <CalendarPopup
                      selectedDate={endDate}
                      onSelectDate={setEndDate}
                      onClose={() => setShowEndCalendar(false)}
                    />
                  )}
                </div>
              </div>
            </div>

            {/* Price Range */}
            <div>
              <label className={`block text-xs font-medium mb-2 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                Amount Range
              </label>
              <div className="flex gap-2">
                <div className={`flex items-center gap-1 px-3 py-2.5 rounded-xl border flex-1 ${
                  theme === 'dark' ? 'bg-slate-800/50 border-slate-700' : 'bg-white border-slate-200'
                }`}>
                  <DollarSign className="w-3 h-3 text-slate-400" />
                  <input
                    type="number"
                    value={minPrice}
                    onChange={(e) => setMinPrice(e.target.value)}
                    placeholder="Min"
                    className={`w-full bg-transparent border-none outline-none text-sm ${
                      theme === 'dark' ? 'text-white placeholder-slate-500' : 'text-slate-900 placeholder-slate-400'
                    }`}
                  />
                </div>
                <div className={`flex items-center gap-1 px-3 py-2.5 rounded-xl border flex-1 ${
                  theme === 'dark' ? 'bg-slate-800/50 border-slate-700' : 'bg-white border-slate-200'
                }`}>
                  <DollarSign className="w-3 h-3 text-slate-400" />
                  <input
                    type="number"
                    value={maxPrice}
                    onChange={(e) => setMaxPrice(e.target.value)}
                    placeholder="Max"
                    className={`w-full bg-transparent border-none outline-none text-sm ${
                      theme === 'dark' ? 'text-white placeholder-slate-500' : 'text-slate-900 placeholder-slate-400'
                    }`}
                  />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Grid View */}
      {viewMode === 'grid' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {paginatedGRNs.map(grn => {
            const StatusIcon = grnStatusConfig[grn.status].icon;
            const paymentPercentage = grn.totalAmount > 0 
              ? (((grn.paidAmount || 0) / grn.totalAmount) * 100).toFixed(0)
              : 0;
            const isPaid = grn.paymentStatus === 'paid';
            const balanceDue = grn.totalAmount - (grn.paidAmount || 0);
            
            return (
              <div
                key={grn.id}
                className={`group rounded-2xl border overflow-hidden transition-all duration-300 cursor-pointer ${
                  theme === 'dark' 
                    ? 'bg-slate-800/30 border-slate-700/50 hover:border-slate-600' 
                    : 'bg-white border-slate-200 hover:border-slate-300 shadow-sm'
                }`}
                onClick={() => handleViewGRN(grn)}
              >
                {/* Status gradient bar */}
                <div className={`h-1 ${
                  grn.status === 'completed' ? 'bg-gradient-to-r from-emerald-500 to-teal-500' 
                    : grn.status === 'pending' || grn.status === 'inspecting' ? 'bg-gradient-to-r from-amber-500 to-orange-500'
                    : grn.status === 'partial' ? 'bg-gradient-to-r from-blue-500 to-indigo-500'
                    : 'bg-gradient-to-r from-red-500 to-rose-500'
                }`} />
                <div className="p-3 sm:p-4">
                  {/* Header */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="min-w-0 flex-1">
                      <p className={`text-sm sm:text-base font-bold ${theme === 'dark' ? 'text-emerald-400' : 'text-emerald-600'}`}>
                        {grn.grnNumber}
                      </p>
                      <div className={`flex items-center gap-1.5 mt-0.5 text-xs sm:text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                        <Building2 className="w-3.5 h-3.5 shrink-0" />
                        <span className="truncate">{grn.supplierName}</span>
                      </div>
                    </div>
                    <span className={`px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-full text-[10px] sm:text-xs font-semibold flex items-center gap-1 sm:gap-1.5 flex-shrink-0 border ${grnStatusConfig[grn.status].bgColor} ${grnStatusConfig[grn.status].color} ${grnStatusConfig[grn.status].borderColor}`}>
                      <StatusIcon className="w-3 h-3" />
                      {grnStatusConfig[grn.status].label}
                    </span>
                  </div>

                  {/* Dates Grid */}
                  <div className="grid grid-cols-2 gap-2 mb-3">
                    <div className={`p-2 rounded-lg ${theme === 'dark' ? 'bg-slate-800/80' : 'bg-slate-50'}`}>
                      <p className={`text-[10px] sm:text-xs ${theme === 'dark' ? 'text-slate-500' : 'text-slate-500'}`}>Order</p>
                      <p className={`text-xs sm:text-sm font-medium ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                        {formatDate(grn.orderDate)}
                      </p>
                    </div>
                    <div className={`p-2 rounded-lg ${theme === 'dark' ? 'bg-slate-800/80' : 'bg-slate-50'}`}>
                      <p className={`text-[10px] sm:text-xs ${theme === 'dark' ? 'text-slate-500' : 'text-slate-500'}`}>{grn.receivedDate ? 'Received' : 'Expected'}</p>
                      <p className={`text-xs sm:text-sm font-medium ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                        {formatDate(grn.receivedDate || grn.expectedDeliveryDate || grn.orderDate)}
                      </p>
                    </div>
                  </div>

                  {/* Amount Section with Payment Progress */}
                  <div className={`p-2.5 sm:p-3 rounded-xl mb-3 ${
                    isPaid
                      ? theme === 'dark' ? 'bg-emerald-500/10 border border-emerald-500/20' : 'bg-emerald-50 border border-emerald-200'
                      : grn.paymentStatus === 'partial'
                        ? theme === 'dark' ? 'bg-amber-500/10 border border-amber-500/20' : 'bg-amber-50 border border-amber-200'
                        : theme === 'dark' ? 'bg-red-500/10 border border-red-500/20' : 'bg-red-50 border border-red-200'
                  }`}>
                    <div className="flex items-center justify-between mb-1">
                      <span className={`text-xs sm:text-sm ${theme === 'dark' ? 'text-slate-300' : 'text-slate-600'}`}>Total</span>
                      <span className={`text-base sm:text-lg font-bold ${
                        isPaid ? 'text-emerald-500' : grn.paymentStatus === 'partial' ? 'text-amber-500' : 'text-red-500'
                      }`}>{formatCurrency(grn.totalAmount)}</span>
                    </div>
                    {!isPaid ? (
                      <>
                        <div className="flex items-center justify-between text-[10px] sm:text-xs mt-1.5">
                          <span className={theme === 'dark' ? 'text-emerald-400' : 'text-emerald-600'}>
                            ✓ Paid: {formatCurrency(grn.paidAmount || 0)}
                          </span>
                          <span className={theme === 'dark' ? 'text-amber-400' : 'text-amber-600'}>
                            ⏳ Due: {formatCurrency(balanceDue)}
                          </span>
                        </div>
                        <div className={`h-1.5 rounded-full mt-1.5 overflow-hidden ${theme === 'dark' ? 'bg-slate-700' : 'bg-slate-200'}`}>
                          <div 
                            className={`h-full rounded-full transition-all duration-500 ${
                              grn.paymentStatus === 'partial'
                                ? 'bg-gradient-to-r from-amber-400 to-orange-400'
                                : 'bg-gradient-to-r from-red-400 to-rose-400'
                            }`}
                            style={{ width: `${Math.min(Number(paymentPercentage), 100)}%` }}
                          />
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="flex items-center justify-between text-[10px] sm:text-xs mt-1.5">
                          <span className={theme === 'dark' ? 'text-emerald-400' : 'text-emerald-600'}>
                            ✓ Paid: {formatCurrency(grn.totalAmount)}
                          </span>
                          <span className={theme === 'dark' ? 'text-emerald-400' : 'text-emerald-600'}>
                            ⏳ Due: Rs. 0
                          </span>
                        </div>
                        <div className={`h-1.5 rounded-full mt-1.5 overflow-hidden ${theme === 'dark' ? 'bg-slate-700' : 'bg-slate-200'}`}>
                          <div className="h-full w-full rounded-full bg-gradient-to-r from-emerald-400 to-teal-400" />
                        </div>
                      </>
                    )}
                  </div>

                  {/* Quantity Tags + Payment Info */}
                  <div className="flex flex-wrap items-center gap-1.5 mb-3">
                    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] sm:text-xs font-medium ${
                      theme === 'dark' ? 'bg-slate-700/50 text-slate-300' : 'bg-slate-100 text-slate-700'
                    }`}>
                      📦 {grn.totalOrderedQuantity} ordered
                    </span>
                    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] sm:text-xs font-medium ${
                      theme === 'dark' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-emerald-50 text-emerald-600'
                    }`}>
                      ✅ {grn.totalAcceptedQuantity} accepted
                    </span>
                    {grn.totalRejectedQuantity > 0 && (
                      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] sm:text-xs font-medium ${
                        theme === 'dark' ? 'bg-red-500/10 text-red-400' : 'bg-red-50 text-red-600'
                      }`}>
                        ❌ {grn.totalRejectedQuantity}
                      </span>
                    )}
                    {grn.paymentMethod && (() => {
                      const config = paymentMethodIcons[grn.paymentMethod];
                      const Icon = config?.icon || CreditCard;
                      return (
                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] sm:text-xs font-medium ${config?.bgColor || 'bg-slate-500/10'} ${config?.color || 'text-slate-500'}`}>
                          <Icon className="w-3 h-3" />
                          <span className="capitalize">{grn.paymentMethod}</span>
                        </span>
                      );
                    })()}
                    {(() => {
                      const totalDiscount = (grn.totalDiscount || 0) + (grn.discountAmount || 0);
                      if (totalDiscount > 0) {
                        return (
                          <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] sm:text-xs font-medium ${
                            theme === 'dark' ? 'bg-orange-500/10 text-orange-400' : 'bg-orange-50 text-orange-600'
                          }`}>
                            <BadgePercent className="w-3 h-3" />
                            -{formatCurrency(totalDiscount)}
                          </span>
                        );
                      }
                      return null;
                    })()}
                  </div>

                  {/* Actions */}
                  <div className={`flex flex-col gap-2 pt-3 border-t ${theme === 'dark' ? 'border-slate-700/50' : 'border-slate-200'}`}>
                    {/* Primary Action Row */}
                    <div className="flex gap-2">
                      <button
                        onClick={(e) => { e.stopPropagation(); handleViewGRN(grn); }}
                        className={`flex-1 flex items-center justify-center gap-1 py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors ${
                          theme === 'dark' ? 'bg-blue-500/10 text-blue-400 hover:bg-blue-500/20' : 'bg-blue-50 text-blue-600 hover:bg-blue-100'
                        }`}
                      >
                        <Eye className="w-4 h-4" /> View
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleEditGRN(grn); }}
                        className={`flex-1 flex items-center justify-center gap-1 py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors ${
                          theme === 'dark' ? 'bg-amber-500/10 text-amber-400 hover:bg-amber-500/20' : 'bg-amber-50 text-amber-600 hover:bg-amber-100'
                        }`}
                      >
                        <Edit className="w-4 h-4" /> Edit
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDeleteGRN(grn); }}
                        className={`flex-1 flex items-center justify-center gap-1 py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors ${
                          theme === 'dark' ? 'bg-red-500/10 text-red-400 hover:bg-red-500/20' : 'bg-red-50 text-red-600 hover:bg-red-100'
                        }`}
                      >
                        <Trash2 className="w-4 h-4" /> Delete
                      </button>
                    </div>

                    {/* Payment/Reminder Section */}
                    {!isPaid && balanceDue > 0 ? (
                      <div className="flex gap-2">
                        <button
                          onClick={(e) => { e.stopPropagation(); handlePayGRN(grn); }}
                          className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all bg-gradient-to-r from-blue-500 to-indigo-500 text-white hover:from-blue-600 hover:to-indigo-600 shadow-lg shadow-blue-500/25"
                        >
                          <DollarSign className="w-4 h-4" />
                          💰 Record Payment
                        </button>
                        {whatsAppSettings?.grnReminderEnabled && (
                          <button
                            onClick={(e) => { e.stopPropagation(); sendWhatsAppReminder(grn); }}
                            disabled={sendingReminderId === ((grn as FrontendGRN).apiId || grn.id)}
                            className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all relative bg-gradient-to-r from-green-500 to-emerald-500 text-white shadow-lg shadow-emerald-500/25 ${
                              sendingReminderId === ((grn as FrontendGRN).apiId || grn.id) ? 'opacity-70 cursor-wait' : 'hover:from-green-600 hover:to-emerald-600'
                            }`}
                          >
                            {sendingReminderId === ((grn as FrontendGRN).apiId || grn.id) ? (
                              <><Loader2 className="w-4 h-4 animate-spin" /> Sending...</>
                            ) : (
                              <><MessageCircle className="w-4 h-4" /> 💬 Remind</>
                            )}
                            {grn.reminderCount !== undefined && grn.reminderCount > 0 && (
                              <span 
                                onClick={(e) => { e.stopPropagation(); handleOpenReminderHistory(grn); }}
                                className="absolute -top-2 -right-2 bg-green-700 text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center shadow-lg hover:bg-green-800 cursor-pointer hover:scale-110 transition-all"
                                title="View reminder history"
                              >
                                {grn.reminderCount}
                              </span>
                            )}
                          </button>
                        )}
                      </div>
                    ) : isPaid ? (
                      <div className={`flex items-center justify-center gap-2 py-3 rounded-xl ${
                        theme === 'dark' 
                          ? 'bg-gradient-to-br from-emerald-500/10 via-teal-500/10 to-teal-500/10 border border-emerald-500/20' 
                          : 'bg-gradient-to-br from-emerald-50 via-teal-50 to-teal-50 border border-emerald-200'
                      }`}>
                        <div className={`w-7 h-7 rounded-full flex items-center justify-center ${
                          theme === 'dark' ? 'bg-emerald-500/20' : 'bg-emerald-100'
                        }`}>
                          <CheckCircle className="w-4 h-4 text-emerald-500" />
                        </div>
                        <span className={`text-sm font-bold ${theme === 'dark' ? 'text-emerald-400' : 'text-emerald-600'}`}>
                          Fully Paid 🎉
                        </span>
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Table View */}
      {viewMode === 'table' && (
        <div className={`rounded-xl sm:rounded-2xl border overflow-hidden ${theme === 'dark' ? 'border-slate-700/50' : 'border-slate-200'}`}>
          <div className="overflow-x-auto -mx-px">
            <table className="w-full">
              <thead className={theme === 'dark' ? 'bg-slate-800/50' : 'bg-slate-50'}>
                <tr>
                  <th className={`text-left px-3 sm:px-4 py-2.5 sm:py-3 text-[10px] sm:text-xs font-semibold uppercase tracking-wider whitespace-nowrap ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>GRN Number</th>
                  <th className={`text-left px-3 sm:px-4 py-2.5 sm:py-3 text-[10px] sm:text-xs font-semibold uppercase tracking-wider whitespace-nowrap ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>Supplier</th>
                  <th className={`text-left px-3 sm:px-4 py-2.5 sm:py-3 text-[10px] sm:text-xs font-semibold uppercase tracking-wider whitespace-nowrap hidden md:table-cell ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>Order Date</th>
                  <th className={`text-center px-2 sm:px-4 py-2.5 sm:py-3 text-[10px] sm:text-xs font-semibold uppercase tracking-wider whitespace-nowrap hidden sm:table-cell ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>Qty</th>
                  <th className={`text-center px-2 sm:px-4 py-2.5 sm:py-3 text-[10px] sm:text-xs font-semibold uppercase tracking-wider whitespace-nowrap hidden lg:table-cell ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>Payment</th>
                  <th className={`text-center px-2 sm:px-4 py-2.5 sm:py-3 text-[10px] sm:text-xs font-semibold uppercase tracking-wider whitespace-nowrap hidden xl:table-cell ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>Discount</th>
                  <th className={`text-left px-3 sm:px-4 py-2.5 sm:py-3 text-[10px] sm:text-xs font-semibold uppercase tracking-wider whitespace-nowrap ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>Status</th>
                  <th className={`text-right px-3 sm:px-4 py-2.5 sm:py-3 text-[10px] sm:text-xs font-semibold uppercase tracking-wider whitespace-nowrap ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>Amount</th>
                  <th className={`text-center px-2 sm:px-4 py-2.5 sm:py-3 text-[10px] sm:text-xs font-semibold uppercase tracking-wider whitespace-nowrap ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/30">
                {paginatedGRNs.map(grn => {
                  const StatusIcon = grnStatusConfig[grn.status].icon;
                  return (
                    <tr 
                      key={grn.id} 
                      className={`transition-colors cursor-pointer ${
                        theme === 'dark' ? 'hover:bg-slate-800/50' : 'hover:bg-slate-50'
                      }`}
                      onClick={() => handleViewGRN(grn)}
                    >
                      <td className="px-3 sm:px-4 py-2.5 sm:py-3">
                        <div className="flex items-center gap-2 sm:gap-3">
                          <div className={`w-7 h-7 sm:w-9 sm:h-9 rounded-lg flex items-center justify-center ${grnStatusConfig[grn.status].bgColor}`}>
                            <ClipboardCheck className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${grnStatusConfig[grn.status].color}`} />
                          </div>
                          <span className={`text-xs sm:text-sm font-medium ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                            {grn.grnNumber}
                          </span>
                        </div>
                      </td>
                      <td className={`px-3 sm:px-4 py-2.5 sm:py-3 text-xs sm:text-sm ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                        <div className="flex items-center gap-1.5 sm:gap-2">
                          <Building2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-400 flex-shrink-0" />
                          <span className="truncate max-w-[100px] sm:max-w-none">{grn.supplierName}</span>
                        </div>
                      </td>
                      <td className={`px-3 sm:px-4 py-2.5 sm:py-3 text-xs sm:text-sm hidden md:table-cell ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                        {formatDate(grn.orderDate)}
                      </td>
                      <td className="px-2 sm:px-4 py-2.5 sm:py-3 text-center hidden sm:table-cell">
                        <div className="flex flex-col items-center gap-0.5">
                          <span className={`font-medium ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                            {grn.totalOrderedQuantity}
                          </span>
                          <span className="text-xs text-emerald-500">
                            {grn.totalAcceptedQuantity} acc
                          </span>
                        </div>
                      </td>
                      <td className="px-2 sm:px-4 py-2.5 sm:py-3 text-center hidden lg:table-cell">
                        {grn.paymentMethod ? (
                          <div className="flex flex-col items-center gap-1">
                            {(() => {
                              const config = paymentMethodIcons[grn.paymentMethod];
                              const Icon = config?.icon || CreditCard;
                              return (
                                <div className={`flex items-center gap-1 px-2 py-1 rounded-lg ${config?.bgColor || 'bg-slate-500/10'}`}>
                                  <Icon className={`w-3.5 h-3.5 ${config?.color || 'text-slate-500'}`} />
                                  <span className={`text-xs font-medium capitalize ${config?.color || 'text-slate-500'}`}>
                                    {grn.paymentMethod}
                                  </span>
                                </div>
                              );
                            })()}
                            {grn.paymentStatus && (
                              <span className={`text-xs px-2 py-0.5 rounded font-medium ${paymentStatusConfig[grn.paymentStatus]?.bgColor || 'bg-slate-500/10'} ${paymentStatusConfig[grn.paymentStatus]?.color || 'text-slate-500'}`}>
                                {paymentStatusConfig[grn.paymentStatus]?.label || grn.paymentStatus}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className={`text-xs ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>-</span>
                        )}
                      </td>
                      <td className="px-2 sm:px-4 py-2.5 sm:py-3 text-center hidden xl:table-cell">
                        {(() => {
                          const totalDiscount = (grn.totalDiscount || 0) + (grn.discountAmount || 0);
                          const hasDiscount = totalDiscount > 0;
                          return (
                            <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg ${
                              hasDiscount 
                                ? (theme === 'dark' ? 'bg-orange-500/10' : 'bg-orange-50')
                                : (theme === 'dark' ? 'bg-slate-700/50' : 'bg-slate-100')
                            }`}>
                              <BadgePercent className={`w-3.5 h-3.5 ${
                                hasDiscount ? 'text-orange-500' : (theme === 'dark' ? 'text-slate-500' : 'text-slate-400')
                              }`} />
                              <span className={`text-xs font-medium ${
                                hasDiscount ? 'text-orange-500' : (theme === 'dark' ? 'text-slate-500' : 'text-slate-400')
                              }`}>
                                {hasDiscount ? formatCurrency(totalDiscount) : 'Rs. 0'}
                              </span>
                            </div>
                          );
                        })()}
                      </td>
                      <td className="px-3 sm:px-4 py-2.5 sm:py-3">
                        <span className={`inline-flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-lg text-[10px] sm:text-xs font-medium ${grnStatusConfig[grn.status].bgColor} ${grnStatusConfig[grn.status].color}`}>
                          <StatusIcon className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                          {grnStatusConfig[grn.status].label}
                        </span>
                      </td>
                      <td className={`px-3 sm:px-4 py-2.5 sm:py-3 text-right text-xs sm:text-sm font-bold ${theme === 'dark' ? 'text-emerald-400' : 'text-emerald-600'}`}>
                        {formatCurrency(grn.totalAmount)}
                      </td>
                      <td className="px-2 sm:px-4 py-2.5 sm:py-3">
                        <div className="flex items-center justify-center gap-1 sm:gap-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleViewGRN(grn);
                            }}
                            className={`p-1.5 sm:p-2 rounded-lg transition-colors ${
                              theme === 'dark' ? 'hover:bg-slate-700 text-slate-400' : 'hover:bg-slate-100 text-slate-600'
                            }`}
                            title="View GRN"
                          >
                            <Eye className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                          </button>
                          {/* Pay Button - Table View */}
                          {grn.paymentStatus !== 'paid' && (grn.paidAmount || 0) < grn.totalAmount && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handlePayGRN(grn);
                              }}
                              className={`p-1.5 sm:p-2 rounded-lg transition-colors ${
                                theme === 'dark' ? 'hover:bg-blue-500/20 text-blue-400' : 'hover:bg-blue-100 text-blue-600'
                              }`}
                              title="Record Payment"
                            >
                              <DollarSign className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                            </button>
                          )}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEditGRN(grn);
                            }}
                            className={`p-1.5 sm:p-2 rounded-lg transition-colors ${
                              theme === 'dark' ? 'hover:bg-emerald-500/20 text-emerald-400' : 'hover:bg-emerald-100 text-emerald-600'
                            }`}
                            title="Edit GRN"
                          >
                            <Edit className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
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
      )}

      {/* Empty State */}
      {filteredGRNs.length === 0 && (
        <div className={`text-center py-10 sm:py-16 rounded-xl sm:rounded-2xl border ${theme === 'dark' ? 'bg-slate-800/30 border-slate-700/50' : 'bg-white border-slate-200'}`}>
          <div className={`w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-3 sm:mb-4 rounded-xl sm:rounded-2xl flex items-center justify-center ${theme === 'dark' ? 'bg-slate-700' : 'bg-slate-100'}`}>
            <ClipboardCheck className={`w-6 h-6 sm:w-8 sm:h-8 ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`} />
          </div>
          <p className={`font-medium text-sm sm:text-lg ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>No GRNs found</p>
          <p className={`text-xs sm:text-sm mt-1 px-4 ${theme === 'dark' ? 'text-slate-500' : 'text-slate-500'}`}>
            {hasActiveFilters ? 'Try adjusting your filters' : 'Create a new GRN to track goods received from suppliers'}
          </p>
          {hasActiveFilters ? (
            <button
              onClick={clearFilters}
              className="mt-4 px-5 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-xl text-sm font-medium hover:opacity-90 transition-opacity shadow-lg shadow-emerald-500/25"
            >
              <RefreshCw className="w-4 h-4 inline mr-2" />
              Clear Filters
            </button>
          ) : (
            <button
              onClick={handleCreateGRN}
              className="mt-4 px-5 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-xl text-sm font-medium hover:opacity-90 transition-opacity shadow-lg shadow-emerald-500/25"
            >
              <Plus className="w-4 h-4 inline mr-2" />
              Create GRN
            </button>
          )}
        </div>
      )}

      {/* Pagination */}
      <div className={`mt-3 sm:mt-4 p-2.5 sm:p-4 rounded-xl sm:rounded-2xl border ${
        theme === 'dark' ? 'bg-slate-800/30 border-slate-700/50' : 'bg-white border-slate-200'
      }`}>
        <div className="flex flex-col sm:flex-row justify-between items-center gap-3 sm:gap-4">
          {/* Left side - Info and Items Per Page */}
          <div className="flex flex-wrap items-center gap-2 sm:gap-4 justify-center sm:justify-start">
            {/* Result Info */}
            <p className={`text-xs sm:text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
              {filteredGRNs.length > 0 ? ((currentPage - 1) * itemsPerPage) + 1 : 0}-{Math.min(currentPage * itemsPerPage, filteredGRNs.length)} of {filteredGRNs.length}
            </p>
            
            {/* Items Per Page Selector */}
            <div className="flex items-center gap-1.5 sm:gap-2">
              <span className={`text-xs sm:text-sm hidden sm:inline ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>Show:</span>
              <div className={`flex items-center rounded-full p-0.5 ${
                theme === 'dark' ? 'bg-slate-800' : 'bg-slate-100'
              }`}>
                {[6, 9, 12, 18].map((num) => (
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

          {/* Right side - Pagination Controls */}
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
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
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

      {/* Modals */}
      <GRNWizardModal
        isOpen={isWizardOpen}
        suppliers={suppliers}
        onClose={() => setIsWizardOpen(false)}
        onSave={handleSaveGRN}
        isLoading={isLoading}
      />

      <GRNFormModal
        isOpen={isFormModalOpen}
        grn={selectedGRN || undefined}
        suppliers={suppliers}
        onClose={() => setIsFormModalOpen(false)}
        onSave={handleSaveGRN}
        isLoading={isLoading}
        isLoadingSuppliers={isLoading && suppliers.length === 0}
        isLoadingProducts={false}
      />

      <GRNViewModal
        isOpen={isViewModalOpen}
        grn={selectedGRN}
        onClose={() => setIsViewModalOpen(false)}
        onEdit={(grn) => {
          setIsViewModalOpen(false);
          handleEditGRN(grn);
        }}
        onPay={(grn) => {
          setIsViewModalOpen(false);
          handlePayGRN(grn);
        }}
      />

      <DeleteConfirmationModal
        isOpen={isDeleteModalOpen}
        title="Delete GRN"
        message="Are you sure you want to delete this GRN? This action cannot be undone."
        itemName={grnToDelete?.grnNumber}
        onConfirm={confirmDeleteGRN}
        onCancel={() => {
          setIsDeleteModalOpen(false);
          setGrnToDelete(null);
        }}
        isLoading={isLoading}
      />

      <GRNPaymentModal
        isOpen={isPaymentModalOpen}
        grn={grnForPayment}
        onClose={() => {
          setIsPaymentModalOpen(false);
          setGrnForPayment(null);
        }}
        onPayment={handleGRNPayment}
        isProcessing={isProcessingPayment}
      />

      {/* GRN Reminder History Modal */}
      {reminderHistoryGRN && (
        <GRNReminderHistoryModal
          isOpen={showReminderHistoryModal}
          onClose={() => {
            setShowReminderHistoryModal(false);
            setReminderHistoryGRN(null);
          }}
          grnId={(reminderHistoryGRN as FrontendGRN).apiId || reminderHistoryGRN.id}
          grnNumber={reminderHistoryGRN.grnNumber}
          supplierName={reminderHistoryGRN.supplierName}
        />
      )}
    </div>
  );
};
