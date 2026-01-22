import React, { useState, useMemo, useRef } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import * as XLSX from 'xlsx';
import { 
  TrendingUp, DollarSign, ShoppingCart, Users, ArrowUpRight, ArrowDownRight,
  Calendar, CreditCard, Banknote, Building2, Clock, Package,
  BarChart3, Activity, Wallet, Receipt, CircleDollarSign,
  ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Store, Globe,
  Award, Target, Zap, AlertCircle, CheckCircle2, XCircle,
  Download, FileSpreadsheet, FileText, FileDown, CalendarDays,
  Wrench, FileCheck, ClipboardList, TruckIcon, Box,
  UserCheck, BadgeDollarSign, ShieldCheck, Boxes, Calculator
} from 'lucide-react';
import { 
  mockInvoices as originalMockInvoices, 
  mockProducts, 
  mockSalesHistory as originalMockSalesHistory, 
  mockWarrantyClaims,
  mockGRNs,
  mockJobNotes,
  mockEstimates,
  mockQuotations,
  mockServices,
  mockCashAccounts,
  mockCashTransactions,
  mockCustomers,
  mockSuppliers
} from '../data/mockData';
import type { Invoice, SaleRecord } from '../data/mockData';

type PeriodFilter = 'daily' | 'weekly' | 'monthly' | 'yearly';
type ReportTab = 'sales' | 'purchases' | 'inventory' | 'services' | 'cashflow' | 'customers' | 'suppliers';

// Generate demo invoices for 2026 to show data in all periods
const generateDemoInvoices = (): Invoice[] => {
  const demoInvoices: Invoice[] = [...originalMockInvoices];
  
  // Current date is January 13, 2026 - add invoices for demo
  const customers = [
    { id: '1', name: 'Kasun Perera' },
    { id: '2', name: 'Nimali Fernando' },
    { id: '3', name: 'Tech Solutions Ltd' },
    { id: '4', name: 'Dilshan Silva' },
    { id: '5', name: 'GameZone Café' },
    { id: '6', name: 'Priya Jayawardena' },
    { id: '7', name: 'Creative Studios' },
    { id: '8', name: 'Sanjay Mendis' },
  ];
  
  const products = [
    { id: '1', name: 'AMD Ryzen 9 7950X', price: 185000 },
    { id: '2', name: 'Intel Core i9-14900K', price: 195000 },
    { id: '3', name: 'NVIDIA GeForce RTX 4090', price: 620000 },
    { id: '4', name: 'NVIDIA GeForce RTX 4070 Ti', price: 280000 },
    { id: '6', name: 'Samsung 990 Pro 2TB NVMe SSD', price: 75000 },
    { id: '8', name: 'Corsair Vengeance DDR5 32GB', price: 48000 },
    { id: '15', name: 'LG UltraGear 27GP950-B 4K Monitor', price: 195000 },
    { id: '17', name: 'Logitech G Pro X Superlight 2', price: 52000 },
  ];
  
  const statuses: ('fullpaid' | 'halfpay' | 'unpaid')[] = ['fullpaid', 'fullpaid', 'fullpaid', 'halfpay', 'unpaid'];
  const paymentMethods: ('cash' | 'card' | 'bank_transfer' | 'credit')[] = ['cash', 'card', 'bank_transfer', 'credit'];
  const salesChannels: ('on-site' | 'online')[] = ['on-site', 'on-site', 'online'];
  
  // Generate invoices for January 2026 (current month)
  for (let day = 1; day <= 13; day++) {
    const numInvoices = day === 13 ? 5 : Math.floor(Math.random() * 3) + 1; // More for today
    
    for (let i = 0; i < numInvoices; i++) {
      const customer = customers[Math.floor(Math.random() * customers.length)];
      const product1 = products[Math.floor(Math.random() * products.length)];
      const product2 = products[Math.floor(Math.random() * products.length)];
      const qty1 = Math.floor(Math.random() * 3) + 1;
      const qty2 = Math.floor(Math.random() * 2) + 1;
      const status = statuses[Math.floor(Math.random() * statuses.length)];
      const paymentMethod = paymentMethods[Math.floor(Math.random() * paymentMethods.length)];
      const salesChannel = salesChannels[Math.floor(Math.random() * salesChannels.length)];
      
      const items = [
        { productId: product1.id, productName: product1.name, quantity: qty1, unitPrice: product1.price, total: product1.price * qty1 },
        ...(Math.random() > 0.5 ? [{ productId: product2.id, productName: product2.name, quantity: qty2, unitPrice: product2.price, total: product2.price * qty2 }] : [])
      ];
      
      const subtotal = items.reduce((sum, item) => sum + item.total, 0);
      const tax = subtotal * 0.15;
      const total = subtotal + tax;
      const paidAmount = status === 'fullpaid' ? total : status === 'halfpay' ? total * 0.5 : 0;
      
      const date = `2026-01-${day.toString().padStart(2, '0')}`;
      
      demoInvoices.push({
        id: `2026${day.toString().padStart(2, '0')}${(i + 1).toString().padStart(3, '0')}`,
        customerId: customer.id,
        customerName: customer.name,
        items,
        subtotal,
        tax,
        total,
        status,
        paidAmount,
        date,
        dueDate: `2026-01-${Math.min(day + 14, 31).toString().padStart(2, '0')}`,
        paymentMethod,
        salesChannel,
      });
    }
  }
  
  return demoInvoices;
};

// Generate demo sales history for 2026
const generateDemoSalesHistory = (): SaleRecord[] => {
  const demoSales: SaleRecord[] = [...originalMockSalesHistory];
  
  const customers = [
    { id: '1', name: 'Kasun Perera' },
    { id: '2', name: 'Nimali Fernando' },
    { id: '3', name: 'Tech Solutions Ltd' },
    { id: '5', name: 'GameZone Café' },
    { id: '7', name: 'Creative Studios' },
    { id: '8', name: 'Sanjay Mendis' },
  ];
  
  const products = [
    { id: '1', name: 'AMD Ryzen 9 7950X', price: 185000 },
    { id: '3', name: 'NVIDIA GeForce RTX 4090', price: 620000 },
    { id: '4', name: 'NVIDIA GeForce RTX 4070 Ti', price: 280000 },
    { id: '6', name: 'Samsung 990 Pro 2TB NVMe SSD', price: 75000 },
    { id: '8', name: 'Corsair Vengeance DDR5 32GB', price: 48000 },
    { id: '15', name: 'LG UltraGear 27GP950-B 4K Monitor', price: 195000 },
    { id: '17', name: 'Logitech G Pro X Superlight 2', price: 52000 },
    { id: '18', name: 'Razer Huntsman V3 Pro', price: 68000 },
  ];
  
  // Generate sales for January 2026
  for (let day = 1; day <= 13; day++) {
    const numSales = day === 13 ? 8 : Math.floor(Math.random() * 5) + 2;
    
    for (let i = 0; i < numSales; i++) {
      const customer = customers[Math.floor(Math.random() * customers.length)];
      const product = products[Math.floor(Math.random() * products.length)];
      const quantity = Math.floor(Math.random() * 3) + 1;
      const discount = Math.random() > 0.6 ? Math.floor(Math.random() * 15) + 1 : 0;
      const discountAmount = (product.price * discount / 100) * quantity;
      const finalPrice = product.price - (product.price * discount / 100);
      const total = finalPrice * quantity;
      const hour = 8 + Math.floor(Math.random() * 10);
      const minute = Math.floor(Math.random() * 60);
      
      demoSales.push({
        id: `SALE-2026-${day.toString().padStart(2, '0')}${(i + 1).toString().padStart(2, '0')}`,
        productId: product.id,
        productName: product.name,
        customerId: customer.id,
        customerName: customer.name,
        invoiceId: `INV-2026-${day.toString().padStart(2, '0')}${i}`,
        quantity,
        unitPrice: product.price,
        discount,
        discountAmount,
        finalPrice,
        total,
        saleDate: `2026-01-${day.toString().padStart(2, '0')}T${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}:00`,
      });
    }
  }
  
  // Sort by date descending
  return demoSales.sort((a, b) => new Date(b.saleDate).getTime() - new Date(a.saleDate).getTime());
};

const mockInvoices = generateDemoInvoices();
const mockSalesHistory = generateDemoSalesHistory();
const allInvoices = mockInvoices;

export const Reports: React.FC = () => {
  const { theme } = useTheme();
  const [activeTab, setActiveTab] = useState<ReportTab>('sales');
  const [selectedPeriod, setSelectedPeriod] = useState<PeriodFilter>('yearly');
  const [currentPage, setCurrentPage] = useState(1);
  const [salesPage, setSalesPage] = useState(1);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const datePickerRef = useRef<HTMLDivElement>(null);
  const exportMenuRef = useRef<HTMLDivElement>(null);
  const itemsPerPage = 8;
  const salesPerPage = 10;

  // Get current date info - use selectedDate for filtering
  const today = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate());
  
  // Filter functions based on period
  const getDateRange = (period: PeriodFilter) => {
    const start = new Date(today);
    const end = new Date(today);
    end.setHours(23, 59, 59, 999);
    
    switch (period) {
      case 'daily':
        // Today only
        break;
      case 'weekly':
        // Start of current week (Monday)
        const dayOfWeek = start.getDay();
        const diff = start.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
        start.setDate(diff);
        break;
      case 'monthly':
        // Start of current month
        start.setDate(1);
        break;
      case 'yearly':
        // Start of current year
        start.setMonth(0, 1);
        break;
    }
    start.setHours(0, 0, 0, 0);
    return { start, end };
  };

  // Get previous period for comparison
  const getPreviousDateRange = (period: PeriodFilter) => {
    const { start: currentStart, end: currentEnd } = getDateRange(period);
    const prevStart = new Date(currentStart);
    const prevEnd = new Date(currentEnd);
    
    switch (period) {
      case 'daily':
        prevStart.setDate(prevStart.getDate() - 1);
        prevEnd.setDate(prevEnd.getDate() - 1);
        break;
      case 'weekly':
        prevStart.setDate(prevStart.getDate() - 7);
        prevEnd.setDate(prevEnd.getDate() - 7);
        break;
      case 'monthly':
        prevStart.setMonth(prevStart.getMonth() - 1);
        prevEnd.setMonth(prevEnd.getMonth() - 1);
        break;
      case 'yearly':
        prevStart.setFullYear(prevStart.getFullYear() - 1);
        prevEnd.setFullYear(prevEnd.getFullYear() - 1);
        break;
    }
    return { start: prevStart, end: prevEnd };
  };

  // Filter invoices by date range
  const filterInvoicesByDateRange = (invoices: typeof mockInvoices, start: Date, end: Date) => {
    return invoices.filter(inv => {
      const invDate = new Date(inv.date);
      return invDate >= start && invDate <= end;
    });
  };

  // Get filtered data for current and previous periods
  const { start: currentStart, end: currentEnd } = getDateRange(selectedPeriod);
  const { start: prevStart, end: prevEnd } = getPreviousDateRange(selectedPeriod);
  
  const currentInvoices = useMemo(() => 
    filterInvoicesByDateRange(mockInvoices, currentStart, currentEnd), 
    [selectedPeriod]
  );
  
  const previousInvoices = useMemo(() => 
    filterInvoicesByDateRange(mockInvoices, prevStart, prevEnd), 
    [selectedPeriod]
  );

  // Calculate stats for current period
  const currentRevenue = currentInvoices.filter(inv => inv.status === 'fullpaid').reduce((sum, inv) => sum + inv.total, 0);
  const previousRevenue = previousInvoices.filter(inv => inv.status === 'fullpaid').reduce((sum, inv) => sum + inv.total, 0);
  
  const currentPendingRevenue = currentInvoices.filter(inv => inv.status === 'halfpay' || inv.status === 'unpaid')
    .reduce((sum, inv) => sum + inv.total - (inv.paidAmount || 0), 0);
  const previousPendingRevenue = previousInvoices.filter(inv => inv.status === 'halfpay' || inv.status === 'unpaid')
    .reduce((sum, inv) => sum + inv.total - (inv.paidAmount || 0), 0);
  
  const currentOrders = currentInvoices.length;
  const previousOrders = previousInvoices.length;
  
  const currentPaidAmount = currentInvoices.reduce((sum, inv) => sum + (inv.paidAmount || 0), 0);
  const previousPaidAmount = previousInvoices.reduce((sum, inv) => sum + (inv.paidAmount || 0), 0);

  // Calculate percentage change
  const calculateChange = (current: number, previous: number): { value: string; positive: boolean } => {
    if (previous === 0) {
      return current > 0 ? { value: '+100%', positive: true } : { value: '0%', positive: true };
    }
    const change = ((current - previous) / previous) * 100;
    return {
      value: `${change >= 0 ? '+' : ''}${change.toFixed(1)}%`,
      positive: change >= 0
    };
  };

  const formatCurrency = (amount: number) => `Rs. ${amount.toLocaleString('en-LK')}`;
  const formatCompactCurrency = (amount: number) => {
    if (amount >= 1000000) return `Rs. ${(amount / 1000000).toFixed(1)}M`;
    if (amount >= 1000) return `Rs. ${(amount / 1000).toFixed(0)}K`;
    return `Rs. ${amount.toLocaleString('en-LK')}`;
  };

  // Payment method breakdown
  const paymentBreakdown = useMemo(() => {
    const breakdown = {
      cash: { count: 0, amount: 0 },
      card: { count: 0, amount: 0 },
      bank_transfer: { count: 0, amount: 0 },
      credit: { count: 0, amount: 0 },
    };
    
    currentInvoices.forEach(inv => {
      const method = inv.paymentMethod || 'cash';
      breakdown[method].count += 1;
      breakdown[method].amount += inv.paidAmount || 0;
    });
    
    return breakdown;
  }, [currentInvoices]);

  // Invoice status breakdown
  const statusBreakdown = useMemo(() => {
    return {
      fullpaid: currentInvoices.filter(inv => inv.status === 'fullpaid').length,
      halfpay: currentInvoices.filter(inv => inv.status === 'halfpay').length,
      unpaid: currentInvoices.filter(inv => inv.status === 'unpaid').length,
    };
  }, [currentInvoices]);

  // Top selling products for current period
  const topProducts = useMemo(() => {
    const productSales: Record<string, { name: string; quantity: number; revenue: number }> = {};
    
    currentInvoices.forEach(inv => {
      inv.items.forEach(item => {
        if (!productSales[item.productId]) {
          productSales[item.productId] = { name: item.productName, quantity: 0, revenue: 0 };
        }
        productSales[item.productId].quantity += item.quantity;
        productSales[item.productId].revenue += item.total;
      });
    });
    
    return Object.entries(productSales)
      .map(([id, data]) => ({ id, ...data }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);
  }, [currentInvoices]);

  // Revenue chart data based on period
  const chartData = useMemo(() => {
    const data: { label: string; value: number }[] = [];
    
    switch (selectedPeriod) {
      case 'daily':
        // Hours of the day
        for (let i = 8; i <= 20; i++) {
          const hourInvoices = currentInvoices.filter(inv => {
            const invDate = new Date(inv.date);
            return invDate.getHours() === i;
          });
          const revenue = hourInvoices.reduce((sum, inv) => sum + (inv.paidAmount || 0), 0);
          data.push({ label: `${i}:00`, value: revenue });
        }
        break;
      case 'weekly':
        // Days of the week
        const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
        for (let i = 0; i < 7; i++) {
          const dayDate = new Date(currentStart);
          dayDate.setDate(dayDate.getDate() + i);
          const dayInvoices = currentInvoices.filter(inv => {
            const invDate = new Date(inv.date);
            return invDate.toDateString() === dayDate.toDateString();
          });
          const revenue = dayInvoices.reduce((sum, inv) => sum + (inv.paidAmount || 0), 0);
          data.push({ label: days[i], value: revenue });
        }
        break;
      case 'monthly':
        // Weeks of the month
        const weeksInMonth = Math.ceil((new Date(currentStart.getFullYear(), currentStart.getMonth() + 1, 0).getDate()) / 7);
        for (let i = 0; i < weeksInMonth; i++) {
          const weekStart = new Date(currentStart);
          weekStart.setDate(weekStart.getDate() + (i * 7));
          const weekEnd = new Date(weekStart);
          weekEnd.setDate(weekEnd.getDate() + 6);
          
          const weekInvoices = currentInvoices.filter(inv => {
            const invDate = new Date(inv.date);
            return invDate >= weekStart && invDate <= weekEnd;
          });
          const revenue = weekInvoices.reduce((sum, inv) => sum + (inv.paidAmount || 0), 0);
          data.push({ label: `Week ${i + 1}`, value: revenue });
        }
        break;
      case 'yearly':
        // Months of the year
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        for (let i = 0; i < 12; i++) {
          const monthInvoices = currentInvoices.filter(inv => {
            const invDate = new Date(inv.date);
            return invDate.getMonth() === i;
          });
          const revenue = monthInvoices.reduce((sum, inv) => sum + (inv.paidAmount || 0), 0);
          data.push({ label: months[i], value: revenue });
        }
        break;
    }
    
    return data;
  }, [selectedPeriod, currentInvoices]);

  const maxChartValue = Math.max(...chartData.map(d => d.value), 1);

  // Period labels
  const periodLabels = {
    daily: 'Today',
    weekly: 'This Week',
    monthly: 'This Month',
    yearly: 'This Year'
  };

  const periodIcons = {
    daily: Clock,
    weekly: Calendar,
    monthly: BarChart3,
    yearly: Activity
  };

  // Sales channel breakdown (On-site vs Online)
  const salesChannelBreakdown = useMemo(() => {
    const onSite = currentInvoices.filter(inv => inv.salesChannel === 'on-site');
    const online = currentInvoices.filter(inv => inv.salesChannel === 'online');
    return {
      onSite: { count: onSite.length, amount: onSite.reduce((sum, inv) => sum + (inv.paidAmount || 0), 0) },
      online: { count: online.length, amount: online.reduce((sum, inv) => sum + (inv.paidAmount || 0), 0) },
    };
  }, [currentInvoices]);

  // Top customers analysis
  const topCustomers = useMemo(() => {
    const customerSpending: Record<string, { name: string; orders: number; total: number }> = {};
    
    currentInvoices.forEach(inv => {
      if (!customerSpending[inv.customerId]) {
        customerSpending[inv.customerId] = { name: inv.customerName, orders: 0, total: 0 };
      }
      customerSpending[inv.customerId].orders += 1;
      customerSpending[inv.customerId].total += inv.paidAmount || 0;
    });
    
    return Object.entries(customerSpending)
      .map(([id, data]) => ({ id, ...data }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 5);
  }, [currentInvoices]);

  // Category performance
  const categoryPerformance = useMemo(() => {
    const categories: Record<string, { sales: number; revenue: number }> = {};
    
    currentInvoices.forEach(inv => {
      inv.items.forEach(item => {
        const product = mockProducts.find(p => p.id === item.productId);
        const category = product?.category || 'Other';
        if (!categories[category]) {
          categories[category] = { sales: 0, revenue: 0 };
        }
        categories[category].sales += item.quantity;
        categories[category].revenue += item.total;
      });
    });
    
    return Object.entries(categories)
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.revenue - a.revenue);
  }, [currentInvoices]);

  // Warranty claims stats
  const warrantyStats = useMemo(() => {
    const claims = mockWarrantyClaims || [];
    return {
      total: claims.length,
      pending: claims.filter(c => c.status === 'pending' || c.status === 'under-review').length,
      resolved: claims.filter(c => c.status === 'replaced' || c.status === 'repaired' || c.status === 'approved').length,
      rejected: claims.filter(c => c.status === 'rejected').length,
    };
  }, []);

  // ==========================================
  // PURCHASES / GRN STATISTICS
  // ==========================================
  const purchaseStats = useMemo(() => {
    const grns = mockGRNs || [];
    const totalPurchases = grns.reduce((sum, grn) => sum + (grn.totalAmount || 0), 0);
    const totalPaid = grns.filter(g => g.paymentStatus === 'paid').reduce((sum, grn) => sum + (grn.totalAmount || 0), 0);
    const partialPaid = grns.filter(g => g.paymentStatus === 'partial').reduce((sum, grn) => sum + (grn.paidAmount || 0), 0);
    const pending = totalPurchases - totalPaid - partialPaid;
    
    return {
      totalGRNs: grns.length,
      totalPurchases,
      totalPaid: totalPaid + partialPaid,
      pending,
      completed: grns.filter(g => g.status === 'completed').length,
      inspecting: grns.filter(g => g.status === 'inspecting' || g.status === 'pending').length,
      topSuppliers: Object.entries(
        grns.reduce((acc, grn) => {
          const supplier = grn.supplierName || 'Unknown';
          if (!acc[supplier]) acc[supplier] = { orders: 0, total: 0 };
          acc[supplier].orders += 1;
          acc[supplier].total += grn.totalAmount || 0;
          return acc;
        }, {} as Record<string, { orders: number; total: number }>)
      ).map(([name, data]) => ({ name, ...data })).sort((a, b) => b.total - a.total).slice(0, 5)
    };
  }, []);

  // ==========================================
  // JOB NOTES / REPAIR STATISTICS
  // ==========================================
  const jobNotesStats = useMemo(() => {
    const jobs = mockJobNotes || [];
    const totalRevenue = jobs.reduce((sum, job) => sum + (job.actualCost || job.estimatedCost || 0), 0);
    
    const statusCounts = jobs.reduce((acc, job) => {
      acc[job.status] = (acc[job.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    const priorityCounts = jobs.reduce((acc, job) => {
      acc[job.priority] = (acc[job.priority] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    const deviceTypeCounts = jobs.reduce((acc, job) => {
      acc[job.deviceType] = (acc[job.deviceType] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    return {
      total: jobs.length,
      totalRevenue,
      completed: statusCounts['completed'] || 0,
      delivered: statusCounts['delivered'] || 0,
      inProgress: statusCounts['in-progress'] || 0,
      waitingParts: statusCounts['waiting-parts'] || 0,
      diagnosing: statusCounts['diagnosing'] || 0,
      received: statusCounts['received'] || 0,
      urgent: priorityCounts['urgent'] || 0,
      high: priorityCounts['high'] || 0,
      deviceTypes: Object.entries(deviceTypeCounts).map(([type, count]) => ({ type, count })).sort((a, b) => b.count - a.count).slice(0, 5)
    };
  }, []);

  // ==========================================
  // ESTIMATES & QUOTATIONS STATISTICS
  // ==========================================
  const estimatesStats = useMemo(() => {
    const estimates = mockEstimates || [];
    const quotations = mockQuotations || [];
    
    const totalEstimatesValue = estimates.reduce((sum, e) => sum + (e.total || 0), 0);
    const totalQuotationsValue = quotations.reduce((sum, q) => sum + (q.total || 0), 0);
    
    const acceptedEstimates = estimates.filter(e => e.status === 'accepted');
    const acceptedQuotations = quotations.filter(q => q.status === 'accepted' || q.status === 'converted');
    
    return {
      estimates: {
        total: estimates.length,
        totalValue: totalEstimatesValue,
        accepted: acceptedEstimates.length,
        acceptedValue: acceptedEstimates.reduce((sum, e) => sum + (e.total || 0), 0),
        pending: estimates.filter(e => e.status === 'sent' || e.status === 'draft').length,
        expired: estimates.filter(e => e.status === 'expired').length,
        rejected: estimates.filter(e => e.status === 'rejected').length,
        conversionRate: estimates.length > 0 ? (acceptedEstimates.length / estimates.length * 100).toFixed(1) : '0'
      },
      quotations: {
        total: quotations.length,
        totalValue: totalQuotationsValue,
        accepted: acceptedQuotations.length,
        acceptedValue: acceptedQuotations.reduce((sum, q) => sum + (q.total || 0), 0),
        pending: quotations.filter(q => q.status === 'pending_approval' || q.status === 'sent' || q.status === 'viewed' || q.status === 'negotiating').length,
        expired: quotations.filter(q => q.status === 'expired').length,
        rejected: quotations.filter(q => q.status === 'rejected').length,
        conversionRate: quotations.length > 0 ? (acceptedQuotations.length / quotations.length * 100).toFixed(1) : '0'
      }
    };
  }, []);

  // ==========================================
  // SERVICES STATISTICS
  // ==========================================
  const servicesStats = useMemo(() => {
    const services = mockServices || [];
    const activeServices = services.filter(s => s.status === 'active');
    const totalMinRevenue = activeServices.reduce((sum, s) => sum + (s.minPrice || 0), 0);
    const totalMaxRevenue = activeServices.reduce((sum, s) => sum + (s.maxPrice || 0), 0);
    
    const categoryBreakdown = services.reduce((acc, s) => {
      const cat = s.category || 'Other';
      if (!acc[cat]) acc[cat] = { count: 0, avgPrice: 0, totalPrice: 0 };
      acc[cat].count += 1;
      const avgPrice = ((s.minPrice || 0) + (s.maxPrice || 0)) / 2;
      acc[cat].totalPrice += avgPrice;
      return acc;
    }, {} as Record<string, { count: number; avgPrice: number; totalPrice: number }>);
    
    Object.keys(categoryBreakdown).forEach(k => {
      categoryBreakdown[k].avgPrice = categoryBreakdown[k].totalPrice / categoryBreakdown[k].count;
    });
    
    return {
      total: services.length,
      active: activeServices.length,
      inactive: services.filter(s => s.status === 'inactive').length,
      discontinued: services.filter(s => s.status === 'discontinued').length,
      popular: services.filter(s => s.isPopular).length,
      avgPriceRange: { min: totalMinRevenue / (activeServices.length || 1), max: totalMaxRevenue / (activeServices.length || 1) },
      categories: Object.entries(categoryBreakdown).map(([name, data]) => ({ name, ...data })).sort((a, b) => b.count - a.count)
    };
  }, []);

  // ==========================================
  // CASH FLOW STATISTICS
  // ==========================================
  const cashFlowStats = useMemo(() => {
    const accounts = mockCashAccounts || [];
    const transactions = mockCashTransactions || [];
    
    const totalBalance = accounts.reduce((sum, a) => sum + (a.balance || 0), 0);
    const income = transactions.filter(t => t.type === 'income').reduce((sum, t) => sum + (t.amount || 0), 0);
    const expense = transactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + (t.amount || 0), 0);
    const transfers = transactions.filter(t => t.type === 'transfer').reduce((sum, t) => sum + (t.amount || 0), 0);
    
    const accountBreakdown = accounts.map(a => ({
      name: a.name,
      type: a.type,
      balance: a.balance || 0
    }));
    
    const expenseByCategory = transactions.filter(t => t.type === 'expense').reduce((acc, t) => {
      const cat = t.category || 'Other';
      acc[cat] = (acc[cat] || 0) + (t.amount || 0);
      return acc;
    }, {} as Record<string, number>);
    
    return {
      totalBalance,
      totalIncome: income,
      totalExpense: expense,
      totalTransfers: transfers,
      netCashFlow: income - expense,
      accountCount: accounts.length,
      activeAccounts: accounts.filter(a => a.isActive).length,
      accounts: accountBreakdown.sort((a, b) => b.balance - a.balance),
      expenseCategories: Object.entries(expenseByCategory).map(([name, amount]) => ({ name, amount })).sort((a, b) => b.amount - a.amount).slice(0, 6)
    };
  }, []);

  // ==========================================
  // CUSTOMER CREDIT STATISTICS
  // ==========================================
  const customerCreditStats = useMemo(() => {
    const customers = mockCustomers || [];
    const withCredit = customers.filter(c => (c.creditBalance || 0) > 0);
    const totalOutstanding = withCredit.reduce((sum, c) => sum + (c.creditBalance || 0), 0);
    const overdue = customers.filter(c => c.creditStatus === 'overdue');
    const overdueAmount = overdue.reduce((sum, c) => sum + (c.creditBalance || 0), 0);
    
    return {
      totalCustomers: customers.length,
      withCredit: withCredit.length,
      totalOutstanding,
      overdueCustomers: overdue.length,
      overdueAmount,
      activeCredit: customers.filter(c => c.creditStatus === 'active').length,
      clearCredit: customers.filter(c => c.creditStatus === 'clear' || !c.creditStatus).length,
      topDebtors: withCredit.sort((a, b) => (b.creditBalance || 0) - (a.creditBalance || 0)).slice(0, 5).map(c => ({
        name: c.name,
        balance: c.creditBalance || 0,
        status: c.creditStatus || 'clear',
        dueDate: c.creditDueDate
      }))
    };
  }, []);

  // ==========================================
  // SUPPLIER PAYABLES STATISTICS
  // ==========================================
  const supplierStats = useMemo(() => {
    const suppliers = mockSuppliers || [];
    const activeSuppliers = suppliers.filter(s => (s as any).isActive !== false);
    const totalPayables = suppliers.reduce((sum, s) => sum + ((s as any).creditBalance || 0), 0);
    const totalPurchases = suppliers.reduce((sum, s) => sum + ((s as any).totalPurchases || 0), 0);
    
    return {
      totalSuppliers: suppliers.length,
      activeSuppliers: activeSuppliers.length,
      totalPayables,
      totalPurchases,
      topSuppliersByPurchase: suppliers.sort((a, b) => (b.totalPurchases || 0) - (a.totalPurchases || 0)).slice(0, 5).map(s => ({
        name: s.company || s.name,
        purchases: s.totalPurchases || 0,
        orders: s.totalOrders || 0
      })),
      suppliersWithPayables: suppliers.filter(s => ((s as any).creditBalance || 0) > 0).sort((a, b) => ((b as any).creditBalance || 0) - ((a as any).creditBalance || 0)).slice(0, 5).map(s => ({
        name: s.company || s.name,
        payable: (s as any).creditBalance || 0,
        terms: 'Net 30'
      }))
    };
  }, []);

  // ==========================================
  // INVENTORY STATISTICS
  // ==========================================
  const inventoryStats = useMemo(() => {
    const products = mockProducts || [];
    const totalStock = products.reduce((sum, p) => sum + (p.stock || 0), 0);
    const totalValue = products.reduce((sum, p) => sum + ((p.costPrice || p.price) * (p.stock || 0)), 0);
    const retailValue = products.reduce((sum, p) => sum + (p.price * (p.stock || 0)), 0);
    
    const lowStock = products.filter(p => (p.stock || 0) <= (p.lowStockThreshold || 10) && (p.stock || 0) > 0);
    const outOfStock = products.filter(p => (p.stock || 0) === 0);
    
    const categoryStock = products.reduce((acc, p) => {
      const cat = p.category || 'Other';
      if (!acc[cat]) acc[cat] = { count: 0, stock: 0, value: 0 };
      acc[cat].count += 1;
      acc[cat].stock += p.stock || 0;
      acc[cat].value += (p.costPrice || p.price) * (p.stock || 0);
      return acc;
    }, {} as Record<string, { count: number; stock: number; value: number }>);
    
    const brandStock = products.reduce((acc, p) => {
      const brand = p.brand || 'Other';
      if (!acc[brand]) acc[brand] = { count: 0, stock: 0 };
      acc[brand].count += 1;
      acc[brand].stock += p.stock || 0;
      return acc;
    }, {} as Record<string, { count: number; stock: number }>);
    
    return {
      totalProducts: products.length,
      totalStock,
      totalCostValue: totalValue,
      totalRetailValue: retailValue,
      potentialProfit: retailValue - totalValue,
      lowStockCount: lowStock.length,
      outOfStockCount: outOfStock.length,
      lowStockItems: lowStock.slice(0, 5).map(p => ({ name: p.name, stock: p.stock, threshold: p.lowStockThreshold || 10 })),
      categories: Object.entries(categoryStock).map(([name, data]) => ({ name, ...data })).sort((a, b) => b.value - a.value).slice(0, 6),
      brands: Object.entries(brandStock).map(([name, data]) => ({ name, ...data })).sort((a, b) => b.stock - a.stock).slice(0, 6)
    };
  }, []);

  // Report tabs configuration
  const reportTabs = [
    { id: 'sales' as ReportTab, label: 'Sales', icon: TrendingUp, color: 'emerald' },
    { id: 'purchases' as ReportTab, label: 'Purchases', icon: TruckIcon, color: 'blue' },
    { id: 'inventory' as ReportTab, label: 'Inventory', icon: Box, color: 'purple' },
    { id: 'services' as ReportTab, label: 'Services', icon: Wrench, color: 'amber' },
    { id: 'cashflow' as ReportTab, label: 'Cash Flow', icon: Wallet, color: 'cyan' },
    { id: 'customers' as ReportTab, label: 'Customers', icon: Users, color: 'pink' },
    { id: 'suppliers' as ReportTab, label: 'Suppliers', icon: Building2, color: 'orange' },
  ];

  // Sales history with pagination
  const paginatedSales = useMemo(() => {
    const sortedSales = [...mockSalesHistory].sort((a, b) => 
      new Date(b.saleDate).getTime() - new Date(a.saleDate).getTime()
    );
    const startIndex = (salesPage - 1) * salesPerPage;
    return sortedSales.slice(startIndex, startIndex + salesPerPage);
  }, [salesPage]);

  const totalSalesPages = Math.ceil(mockSalesHistory.length / salesPerPage);

  // Paginated invoices for transactions table
  const paginatedInvoices = useMemo(() => {
    // Use all invoices for yearly, or filtered for other periods
    const invoicesToShow = selectedPeriod === 'yearly' ? allInvoices : currentInvoices;
    const startIndex = (currentPage - 1) * itemsPerPage;
    return invoicesToShow.slice(startIndex, startIndex + itemsPerPage);
  }, [currentPage, currentInvoices, selectedPeriod]);

  const totalInvoicePages = Math.ceil(
    (selectedPeriod === 'yearly' ? allInvoices.length : currentInvoices.length) / itemsPerPage
  );

  // Reset pagination when period changes
  React.useEffect(() => {
    setCurrentPage(1);
    setSalesPage(1);
  }, [selectedPeriod]);

  // Click outside handler for dropdowns
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (datePickerRef.current && !datePickerRef.current.contains(event.target as Node)) {
        setShowDatePicker(false);
      }
      if (exportMenuRef.current && !exportMenuRef.current.contains(event.target as Node)) {
        setShowExportMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Pagination component
  const Pagination = ({ 
    currentPage, 
    totalPages, 
    onPageChange,
    totalItems,
    itemsPerPage: perPage
  }: { 
    currentPage: number; 
    totalPages: number; 
    onPageChange: (page: number) => void;
    totalItems: number;
    itemsPerPage: number;
  }) => {
    const startItem = (currentPage - 1) * perPage + 1;
    const endItem = Math.min(currentPage * perPage, totalItems);
    
    const getPageNumbers = () => {
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
      return pages;
    };

    if (totalPages <= 1) return null;

    return (
      <div className={`flex flex-col sm:flex-row items-center justify-between gap-4 px-6 py-4 border-t ${
        theme === 'dark' ? 'border-slate-700/50' : 'border-slate-200'
      }`}>
        <p className={`text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
          Showing <span className="font-medium">{startItem}</span> to <span className="font-medium">{endItem}</span> of{' '}
          <span className="font-medium">{totalItems}</span> results
        </p>
        
        <div className="flex items-center gap-1">
          {/* First page */}
          <button
            onClick={() => onPageChange(1)}
            disabled={currentPage === 1}
            className={`p-2 rounded-lg transition-all ${
              currentPage === 1
                ? theme === 'dark' ? 'text-slate-600 cursor-not-allowed' : 'text-slate-300 cursor-not-allowed'
                : theme === 'dark' ? 'text-slate-400 hover:text-white hover:bg-slate-700' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <ChevronsLeft className="w-4 h-4" />
          </button>
          
          {/* Previous page */}
          <button
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className={`p-2 rounded-lg transition-all ${
              currentPage === 1
                ? theme === 'dark' ? 'text-slate-600 cursor-not-allowed' : 'text-slate-300 cursor-not-allowed'
                : theme === 'dark' ? 'text-slate-400 hover:text-white hover:bg-slate-700' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          
          {/* Page numbers */}
          <div className="flex items-center gap-1 mx-2">
            {getPageNumbers().map((page, index) => (
              <button
                key={index}
                onClick={() => typeof page === 'number' && onPageChange(page)}
                disabled={page === '...'}
                className={`min-w-[36px] h-9 px-3 rounded-lg text-sm font-medium transition-all ${
                  page === currentPage
                    ? 'bg-gradient-to-r from-emerald-500 to-blue-500 text-white shadow-lg'
                    : page === '...'
                      ? theme === 'dark' ? 'text-slate-500 cursor-default' : 'text-slate-400 cursor-default'
                      : theme === 'dark' 
                        ? 'text-slate-400 hover:text-white hover:bg-slate-700' 
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                {page}
              </button>
            ))}
          </div>
          
          {/* Next page */}
          <button
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            className={`p-2 rounded-lg transition-all ${
              currentPage === totalPages
                ? theme === 'dark' ? 'text-slate-600 cursor-not-allowed' : 'text-slate-300 cursor-not-allowed'
                : theme === 'dark' ? 'text-slate-400 hover:text-white hover:bg-slate-700' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <ChevronRight className="w-4 h-4" />
          </button>
          
          {/* Last page */}
          <button
            onClick={() => onPageChange(totalPages)}
            disabled={currentPage === totalPages}
            className={`p-2 rounded-lg transition-all ${
              currentPage === totalPages
                ? theme === 'dark' ? 'text-slate-600 cursor-not-allowed' : 'text-slate-300 cursor-not-allowed'
                : theme === 'dark' ? 'text-slate-400 hover:text-white hover:bg-slate-700' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <ChevronsRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  };

  // Export helper functions
  const formatDateForExport = (date: Date) => {
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  };

  const getReportTitle = () => {
    const dateStr = formatDateForExport(selectedDate);
    switch (selectedPeriod) {
      case 'daily': return `Daily Report - ${dateStr}`;
      case 'weekly': return `Weekly Report - Week of ${dateStr}`;
      case 'monthly': return `Monthly Report - ${selectedDate.toLocaleDateString('en-US', { year: 'numeric', month: 'long' })}`;
      case 'yearly': return `Yearly Report - ${selectedDate.getFullYear()}`;
    }
  };

  // CSV Export - ALL DATA without pagination
  const exportToCSV = () => {
    setIsExporting(true);
    try {
      const invoicesToExport = allInvoices;
      const allSales = [...mockSalesHistory].sort((a, b) => 
        new Date(b.saleDate).getTime() - new Date(a.saleDate).getTime()
      );
      
      const totalRevenue = invoicesToExport.reduce((sum, inv) => sum + inv.total, 0);
      const totalPaid = invoicesToExport.reduce((sum, inv) => sum + (inv.paidAmount || 0), 0);
      const pendingAmount = totalRevenue - totalPaid;
      
      let csv = '';
      
      // Header
      csv += `ECOTEC COMPUTER SHOP - ${getReportTitle().toUpperCase()}\n`;
      csv += `Generated,${formatDateForExport(new Date())}\n`;
      csv += `Period,${periodLabels[selectedPeriod]}\n\n`;
      
      // Summary Row
      csv += `SUMMARY,Revenue,Collected,Pending,Invoices,Paid,Partial,Unpaid\n`;
      csv += `,${totalRevenue},${totalPaid},${pendingAmount},${invoicesToExport.length},${statusBreakdown.fullpaid},${statusBreakdown.halfpay},${statusBreakdown.unpaid}\n\n`;
      
      // Invoice Details
      csv += `INVOICES\n`;
      csv += `ID,Customer,Date,Items,Subtotal,Tax,Total,Paid,Balance,Status,Payment,Channel\n`;
      invoicesToExport.forEach(inv => {
        const balance = inv.total - (inv.paidAmount || 0);
        const invDate = inv.date ? new Date(inv.date).toLocaleDateString('en-GB') : '-';
        csv += `${inv.id},"${inv.customerName}",${invDate},${inv.items.length},${inv.subtotal},${inv.tax},${inv.total},${inv.paidAmount || 0},${balance},${inv.status},${inv.paymentMethod || '-'},${inv.salesChannel || '-'}\n`;
      });
      
      // Sales History
      csv += `\n\nSALES HISTORY\n`;
      csv += `Product,Category,Brand,Qty,Unit Price,Total,Date,Customer\n`;
      allSales.forEach(sale => {
        const product = mockProducts.find(p => p.id === sale.productId);
        const category = product?.category || '-';
        const brand = product?.brand || '-';
        const saleDate = sale.saleDate ? new Date(sale.saleDate).toLocaleDateString('en-GB') : '-';
        csv += `"${sale.productName}","${category}","${brand}",${sale.quantity},${sale.unitPrice},${sale.total},${saleDate},"${sale.customerName}"\n`;
      });
      
      // Top Products & Customers (side by side conceptually)
      csv += `\n\nTOP PRODUCTS,,,,TOP CUSTOMERS\n`;
      csv += `#,Product,Qty,Revenue,#,Customer,Orders,Spent\n`;
      const maxRows = Math.max(topProducts.length, topCustomers.length);
      for (let i = 0; i < maxRows; i++) {
        const prod = topProducts[i];
        const cust = topCustomers[i];
        csv += `${prod ? i + 1 : ''},${prod ? `"${prod.name}"` : ''},${prod?.quantity || ''},${prod?.revenue || ''},${cust ? i + 1 : ''},${cust ? `"${cust.name}"` : ''},${cust?.orders || ''},${cust?.total || ''}\n`;
      }
      
      // Payment & Category Breakdown
      csv += `\n\nPAYMENT METHODS,,CATEGORY PERFORMANCE\n`;
      csv += `Method,Count,Amount,Category,Units,Revenue\n`;
      const paymentEntries = Object.entries(paymentBreakdown);
      const maxBreakdown = Math.max(paymentEntries.length, categoryPerformance.length);
      for (let i = 0; i < maxBreakdown; i++) {
        const pay = paymentEntries[i];
        const cat = categoryPerformance[i];
        csv += `${pay ? pay[0].replace('_', ' ') : ''},${pay ? pay[1].count : ''},${pay ? pay[1].amount : ''},${cat ? `"${cat.name}"` : ''},${cat?.sales || ''},${cat?.revenue || ''}\n`;
      }
      
      // Warranty
      csv += `\n\nWARRANTY CLAIMS,Total,Pending,Resolved,Rejected\n`;
      csv += `,${warrantyStats.total},${warrantyStats.pending},${warrantyStats.resolved},${warrantyStats.rejected}\n`;
      
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `ECOTEC_${getReportTitle().replace(/\s+/g, '_')}.csv`;
      link.click();
      URL.revokeObjectURL(link.href);
    } finally {
      setIsExporting(false);
      setShowExportMenu(false);
    }
  };

  // Excel Export - ALL DATA without pagination (.xlsx format)
  const exportToExcel = () => {
    setIsExporting(true);
    try {
      const invoicesToExport = allInvoices;
      const allSales = [...mockSalesHistory].sort((a, b) => 
        new Date(b.saleDate).getTime() - new Date(a.saleDate).getTime()
      );
      
      const totalRevenue = invoicesToExport.reduce((sum, inv) => sum + inv.total, 0);
      const totalPaid = invoicesToExport.reduce((sum, inv) => sum + (inv.paidAmount || 0), 0);
      const pendingAmount = totalRevenue - totalPaid;
      const collectionRate = totalRevenue > 0 ? ((totalPaid / totalRevenue) * 100).toFixed(1) : '0';
      
      // Create workbook
      const wb = XLSX.utils.book_new();
      
      // === SUMMARY SHEET ===
      const summaryData = [
        ['ECOTEC COMPUTER SHOP'],
        [getReportTitle()],
        [`Generated: ${formatDateForExport(new Date())}`],
        [],
        ['📊 REVENUE SUMMARY', ''],
        ['Total Revenue', totalRevenue],
        ['Cash Collected', totalPaid],
        ['Pending Amount', pendingAmount],
        ['Collection Rate', `${collectionRate}%`],
        [],
        ['📋 INVOICE STATUS', ''],
        ['Total Invoices', invoicesToExport.length],
        ['Full Paid', statusBreakdown.fullpaid],
        ['Partial Paid', statusBreakdown.halfpay],
        ['Unpaid', statusBreakdown.unpaid],
        [],
        ['💳 PAYMENT METHODS', 'Count', 'Amount'],
        ...Object.entries(paymentBreakdown).map(([method, data]) => [
          method.replace('_', ' ').toUpperCase(),
          data.count,
          data.amount
        ]),
        [],
        ['📦 CATEGORY PERFORMANCE', 'Units Sold', 'Revenue'],
        ...categoryPerformance.map(cat => [cat.name, cat.sales, cat.revenue]),
        [],
        ['🏆 TOP PRODUCTS', 'Quantity', 'Revenue'],
        ...topProducts.map((p, i) => [`${i + 1}. ${p.name}`, p.quantity, p.revenue]),
        [],
        ['👥 TOP CUSTOMERS', 'Orders', 'Total Spent'],
        ...topCustomers.map((c, i) => [`${i + 1}. ${c.name}`, c.orders, c.total]),
        [],
        ['🛡️ WARRANTY CLAIMS', ''],
        ['Total Claims', warrantyStats.total],
        ['Pending', warrantyStats.pending],
        ['Resolved', warrantyStats.resolved],
        ['Rejected', warrantyStats.rejected],
      ];
      
      const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
      wsSummary['!cols'] = [{ wch: 35 }, { wch: 15 }, { wch: 15 }];
      wsSummary['!merges'] = [
        { s: { r: 0, c: 0 }, e: { r: 0, c: 2 } },
        { s: { r: 1, c: 0 }, e: { r: 1, c: 2 } },
        { s: { r: 2, c: 0 }, e: { r: 2, c: 2 } },
      ];
      XLSX.utils.book_append_sheet(wb, wsSummary, 'Summary');
      
      // === INVOICES SHEET ===
      const invoiceHeaders = ['Invoice ID', 'Customer', 'Date', 'Items', 'Subtotal', 'Tax', 'Total', 'Paid', 'Balance', 'Status', 'Payment', 'Channel'];
      const invoiceRows = invoicesToExport.map(inv => {
        const balance = inv.total - (inv.paidAmount || 0);
        const invDate = inv.date ? new Date(inv.date).toLocaleDateString('en-GB') : '-';
        return [inv.id, inv.customerName, invDate, inv.items.length, inv.subtotal, inv.tax, inv.total, inv.paidAmount || 0, balance, inv.status, inv.paymentMethod || '-', inv.salesChannel || '-'];
      });
      
      const wsInvoices = XLSX.utils.aoa_to_sheet([invoiceHeaders, ...invoiceRows]);
      wsInvoices['!cols'] = [
        { wch: 12 }, { wch: 25 }, { wch: 12 }, { wch: 8 },
        { wch: 12 }, { wch: 10 }, { wch: 12 }, { wch: 12 },
        { wch: 12 }, { wch: 10 }, { wch: 15 }, { wch: 10 }
      ];
      XLSX.utils.book_append_sheet(wb, wsInvoices, 'Invoices');
      
      // === SALES HISTORY SHEET ===
      const salesHeaders = ['Product', 'Category', 'Brand', 'Qty', 'Unit Price', 'Total', 'Date', 'Customer'];
      const salesRows = allSales.map(sale => {
        const product = mockProducts.find(p => p.id === sale.productId);
        const saleDate = sale.saleDate ? new Date(sale.saleDate).toLocaleDateString('en-GB') : '-';
        return [sale.productName, product?.category || '-', product?.brand || '-', sale.quantity, sale.unitPrice, sale.total, saleDate, sale.customerName];
      });
      
      const wsSales = XLSX.utils.aoa_to_sheet([salesHeaders, ...salesRows]);
      wsSales['!cols'] = [
        { wch: 30 }, { wch: 20 }, { wch: 15 }, { wch: 8 },
        { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 25 }
      ];
      XLSX.utils.book_append_sheet(wb, wsSales, 'Sales History');
      
      // Generate and download the file
      XLSX.writeFile(wb, `ECOTEC_${getReportTitle().replace(/\s+/g, '_')}.xlsx`);
      
    } finally {
      setIsExporting(false);
      setShowExportMenu(false);
    }
  };

  // PDF Export - ALL DATA without pagination
  const exportToPDF = () => {
    setIsExporting(true);
    try {
      // Get ALL invoices for the selected period (not paginated)
      const invoicesToExport = allInvoices;
      const allSales = [...mockSalesHistory].sort((a, b) => 
        new Date(b.saleDate).getTime() - new Date(a.saleDate).getTime()
      );
      
      const totalRevenue = invoicesToExport.reduce((sum, inv) => sum + inv.total, 0);
      const totalPaid = invoicesToExport.reduce((sum, inv) => sum + (inv.paidAmount || 0), 0);
      const pendingAmount = totalRevenue - totalPaid;
      const collectionRate = totalRevenue > 0 ? ((totalPaid / totalRevenue) * 100).toFixed(1) : '0';
      
      // Safe formatter to avoid calling toLocaleString on undefined
      const fmt = (v: any) => Number(v || 0).toLocaleString();
      const fmtCurrency = (v: any) => `Rs. ${fmt(v)}`;
      
      // Create printable HTML content with ALL data
      const printContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>${getReportTitle()}</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 20px; color: #1e293b; font-size: 10px; line-height: 1.3; }
            .header { text-align: center; margin-bottom: 15px; padding-bottom: 10px; border-bottom: 2px solid #10b981; }
            .header h1 { font-size: 20px; color: #10b981; margin-bottom: 3px; }
            .header p { color: #64748b; font-size: 11px; }
            .header .badge { display: inline-block; background: linear-gradient(135deg, #10b981, #3b82f6); color: white; padding: 3px 10px; border-radius: 15px; font-size: 9px; margin-top: 5px; }
            .summary-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin-bottom: 15px; }
            .summary-card { background: linear-gradient(135deg, #f0fdf4, #ecfdf5); padding: 10px; border-radius: 8px; text-align: center; border: 1px solid #d1fae5; }
            .summary-card.warning { background: linear-gradient(135deg, #fffbeb, #fef3c7); border-color: #fde68a; }
            .summary-card.danger { background: linear-gradient(135deg, #fef2f2, #fee2e2); border-color: #fecaca; }
            .summary-card.info { background: linear-gradient(135deg, #eff6ff, #dbeafe); border-color: #bfdbfe; }
            .summary-card h3 { font-size: 16px; color: #059669; margin-bottom: 2px; }
            .summary-card.warning h3 { color: #d97706; }
            .summary-card.danger h3 { color: #dc2626; }
            .summary-card.info h3 { color: #2563eb; }
            .summary-card p { color: #64748b; font-size: 9px; text-transform: uppercase; letter-spacing: 0.3px; }
            .section { margin-bottom: 12px; }
            .section h2 { font-size: 12px; color: #334155; margin-bottom: 6px; padding: 5px 10px; background: linear-gradient(90deg, #f1f5f9, transparent); border-left: 3px solid #10b981; border-radius: 0 6px 6px 0; }
            table { width: 100%; border-collapse: collapse; font-size: 9px; margin-bottom: 5px; }
            th { background: linear-gradient(135deg, #1e293b, #334155); color: white; padding: 6px 4px; text-align: left; font-weight: 600; font-size: 8px; text-transform: uppercase; letter-spacing: 0.3px; }
            td { padding: 5px 4px; border-bottom: 1px solid #f1f5f9; }
            tr:nth-child(even) { background: #f8fafc; }
            .status { padding: 2px 6px; border-radius: 10px; font-size: 8px; font-weight: 600; }
            .status.paid { background: #d1fae5; color: #059669; }
            .status.partial { background: #fef3c7; color: #d97706; }
            .status.unpaid { background: #fee2e2; color: #dc2626; }
            .amount { font-weight: 600; color: #059669; }
            .amount.negative { color: #dc2626; }
            .footer { margin-top: 15px; padding-top: 10px; border-top: 1px solid #e2e8f0; text-align: center; color: #94a3b8; font-size: 9px; }
            .footer .logo { font-weight: bold; color: #10b981; font-size: 12px; }
            .two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 12px; }
            .three-col { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px; }
            .rank { display: inline-flex; align-items: center; justify-content: center; width: 18px; height: 18px; border-radius: 50%; font-weight: bold; font-size: 9px; }
            .rank.gold { background: linear-gradient(135deg, #fbbf24, #f59e0b); color: white; }
            .rank.silver { background: linear-gradient(135deg, #9ca3af, #6b7280); color: white; }
            .rank.bronze { background: linear-gradient(135deg, #d97706, #b45309); color: white; }
            .rank.normal { background: #e2e8f0; color: #64748b; }
            .stats-row { display: flex; gap: 6px; margin-bottom: 12px; }
            .mini-stat { flex: 1; background: #f8fafc; padding: 8px; border-radius: 6px; text-align: center; border: 1px solid #e2e8f0; }
            .mini-stat .value { font-size: 14px; font-weight: bold; color: #1e293b; }
            .mini-stat .label { font-size: 8px; color: #64748b; text-transform: uppercase; }
            @media print { 
              body { padding: 10px; -webkit-print-color-adjust: exact; print-color-adjust: exact; } 
              .summary-grid { grid-template-columns: repeat(4, 1fr); }
              table { page-break-inside: auto; }
              tr { page-break-inside: avoid; }
              .section { page-break-inside: auto; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>📊 ${getReportTitle()}</h1>
            <p>ECOTEC Computer Shop • Complete Business Report</p>
            <span class="badge">Generated: ${formatDateForExport(new Date())} | ${invoicesToExport.length} Invoices | ${allSales.length} Sales</span>
          </div>
          
            <div class="summary-grid">
            <div class="summary-card">
              <h3>${fmtCurrency(totalRevenue)}</h3>
              <p>Total Revenue</p>
            </div>
            <div class="summary-card info">
              <h3>${fmtCurrency(totalPaid)}</h3>
              <p>Collected (${collectionRate}%)</p>
            </div>
            <div class="summary-card warning">
              <h3>${fmtCurrency(pendingAmount)}</h3>
              <p>Pending Amount</p>
            </div>
            <div class="summary-card">
              <h3>${invoicesToExport.length}</h3>
              <p>Total Invoices</p>
            </div>
          </div>
          
          <div class="stats-row">
            <div class="mini-stat"><div class="value" style="color: #059669;">${statusBreakdown.fullpaid}</div><div class="label">Full Paid</div></div>
            <div class="mini-stat"><div class="value" style="color: #d97706;">${statusBreakdown.halfpay}</div><div class="label">Partial</div></div>
            <div class="mini-stat"><div class="value" style="color: #dc2626;">${statusBreakdown.unpaid}</div><div class="label">Unpaid</div></div>
            <div class="mini-stat"><div class="value" style="color: #2563eb;">${salesChannelBreakdown.onSite.count}</div><div class="label">On-site</div></div>
            <div class="mini-stat"><div class="value" style="color: #8b5cf6;">${salesChannelBreakdown.online.count}</div><div class="label">Online</div></div>
          </div>
          
          <div class="two-col">
            <div class="section">
              <h2>🏆 Top Selling Products</h2>
              <table>
                <tr><th>Rank</th><th>Product</th><th>Qty</th><th>Revenue</th></tr>
                ${topProducts.map((product, index) => `<tr><td><span class="rank ${index === 0 ? 'gold' : index === 1 ? 'silver' : index === 2 ? 'bronze' : 'normal'}">${index + 1}</span></td><td>${product.name}</td><td>${product.quantity}</td><td class="amount">${fmtCurrency(product.revenue)}</td></tr>`).join('')}
              </table>
            </div>
            
            <div class="section">
              <h2>👥 Top Customers</h2>
              <table>
                <tr><th>Rank</th><th>Customer</th><th>Orders</th><th>Total Spent</th></tr>
                ${topCustomers.map((customer, index) => `<tr><td><span class="rank ${index === 0 ? 'gold' : index === 1 ? 'silver' : index === 2 ? 'bronze' : 'normal'}">${index + 1}</span></td><td>${customer.name}</td><td>${customer.orders}</td><td class="amount">${fmtCurrency(customer.total)}</td></tr>`).join('')}
              </table>
            </div>
          </div>
          
          <div class="two-col">
            <div class="section">
              <h2>💳 Payment Methods</h2>
              <table>
                <tr><th>Method</th><th>Count</th><th>Amount</th></tr>
                ${Object.entries(paymentBreakdown).map(([method, data]) => `<tr><td>${method.replace('_', ' ').toUpperCase()}</td><td>${data.count}</td><td class="amount">${fmtCurrency(data.amount)}</td></tr>`).join('')}
              </table>
            </div>
            
            <div class="section">
              <h2>📁 Category Performance</h2>
              <table>
                <tr><th>Category</th><th>Units</th><th>Revenue</th></tr>
                ${categoryPerformance.slice(0, 6).map(cat => `<tr><td>${cat.name}</td><td>${cat.sales}</td><td class="amount">${fmtCurrency(cat.revenue)}</td></tr>`).join('')}
              </table>
            </div>
          </div>
          
          <div class="section">
            <h2>📋 Complete Invoice List (${invoicesToExport.length} Records)</h2>
            <table>
              <tr><th>Invoice</th><th>Customer</th><th>Date</th><th>Items</th><th>Total</th><th>Paid</th><th>Balance</th><th>Status</th><th>Channel</th></tr>
              ${invoicesToExport.map(inv => {
                const balance = inv.total - (inv.paidAmount || 0);
                const invDate = inv.date ? new Date(inv.date).toLocaleDateString('en-GB') : '-';
                return `<tr><td><strong>#${inv.id}</strong></td><td>${inv.customerName}</td><td>${invDate}</td><td>${inv.items.length}</td><td>${fmtCurrency(inv.total)}</td><td class="amount">${fmtCurrency(inv.paidAmount)}</td><td class="${balance > 0 ? 'amount negative' : ''}">${fmtCurrency(balance)}</td><td><span class="status ${inv.status === 'fullpaid' ? 'paid' : inv.status === 'halfpay' ? 'partial' : 'unpaid'}">${inv.status === 'fullpaid' ? 'Paid' : inv.status === 'halfpay' ? 'Partial' : 'Unpaid'}</span></td><td>${inv.salesChannel || '-'}</td></tr>`;
              }).join('')}
            </table>
          </div>
          
          <div class="section">
            <h2>📦 Sales History (${allSales.length} Records)</h2>
            <table>
              <tr><th>Product</th><th>Category</th><th>Brand</th><th>Qty</th><th>Unit Price</th><th>Total</th><th>Date</th><th>Customer</th></tr>
              ${allSales.map(sale => {
                const product = mockProducts.find(p => p.id === sale.productId);
                const category = product?.category || '-';
                const brand = product?.brand || '-';
                const saleDate = sale.saleDate ? new Date(sale.saleDate).toLocaleDateString('en-GB') : '-';
                return `<tr><td>${sale.productName}</td><td>${category}</td><td>${brand}</td><td>${sale.quantity}</td><td>${fmtCurrency(sale.unitPrice)}</td><td class="amount">${fmtCurrency(sale.total)}</td><td>${saleDate}</td><td>${sale.customerName}</td></tr>`;
              }).join('')}
            </table>
          </div>
          
          <div class="section">
            <h2>🛡️ Warranty Claims Summary</h2>
            <div class="three-col">
              <div class="mini-stat"><div class="value">${warrantyStats.total}</div><div class="label">Total Claims</div></div>
              <div class="mini-stat"><div class="value" style="color: #d97706;">${warrantyStats.pending}</div><div class="label">Pending</div></div>
              <div class="mini-stat"><div class="value" style="color: #059669;">${warrantyStats.resolved}</div><div class="label">Resolved</div></div>
            </div>
          </div>
          
          <div class="footer">
            <p class="logo">🖥️ ECOTEC Computer Shop</p>
            <p>Generated by ECOTEC Management System</p>
            <p>© ${new Date().getFullYear()} ECOTEC | Report ID: RPT-${Date.now()}</p>
          </div>
        </body>
        </html>
      `;
      
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(printContent);
        printWindow.document.close();
        printWindow.onload = () => {
          printWindow.print();
        };
      }
    } finally {
      setIsExporting(false);
      setShowExportMenu(false);
    }
  };

  // Date picker helper functions
  const getDaysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
  const getFirstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();
  
  const calendarMonth = selectedDate.getMonth();
  const calendarYear = selectedDate.getFullYear();
  const daysInMonth = getDaysInMonth(calendarYear, calendarMonth);
  const firstDay = getFirstDayOfMonth(calendarYear, calendarMonth);
  
  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const dayNames = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

  const handleDateSelect = (day: number) => {
    const newDate = new Date(calendarYear, calendarMonth, day);
    setSelectedDate(newDate);
    setShowDatePicker(false);
    setCurrentPage(1);
    setSalesPage(1);
  };

  const navigateMonth = (direction: number) => {
    const newDate = new Date(calendarYear, calendarMonth + direction, 1);
    setSelectedDate(newDate);
  };

  // Stats configuration
  const stats = [
    { 
      label: 'Total Revenue', 
      value: formatCurrency(currentRevenue), 
      change: calculateChange(currentRevenue, previousRevenue),
      icon: DollarSign, 
      gradient: 'from-emerald-500 to-teal-600',
      bgGradient: 'from-emerald-500/20 to-teal-500/10'
    },
    { 
      label: 'Pending Revenue', 
      value: formatCurrency(currentPendingRevenue), 
      change: calculateChange(currentPendingRevenue, previousPendingRevenue),
      icon: Wallet, 
      gradient: 'from-amber-500 to-orange-600',
      bgGradient: 'from-amber-500/20 to-orange-500/10'
    },
    { 
      label: 'Total Orders', 
      value: currentOrders.toString(), 
      change: calculateChange(currentOrders, previousOrders),
      icon: ShoppingCart, 
      gradient: 'from-purple-500 to-pink-600',
      bgGradient: 'from-purple-500/20 to-pink-500/10'
    },
    { 
      label: 'Amount Collected', 
      value: formatCurrency(currentPaidAmount), 
      change: calculateChange(currentPaidAmount, previousPaidAmount),
      icon: CircleDollarSign, 
      gradient: 'from-blue-500 to-cyan-600',
      bgGradient: 'from-blue-500/20 to-cyan-500/10'
    },
  ];

  return (
    <div className="space-y-6 pb-8">
      {/* Header with Period Filter */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className={`text-2xl lg:text-3xl font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
            Reports & Analytics
          </h1>
          <p className={`mt-1 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
            {periodLabels[selectedPeriod]} • Comprehensive business insights
          </p>
        </div>
        
        {/* Controls Row */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Period Filter */}
          <div className={`flex items-center p-1.5 rounded-2xl border ${
            theme === 'dark' ? 'bg-slate-800/50 border-slate-700/50' : 'bg-white border-slate-200 shadow-sm'
          }`}>
            {(['daily', 'weekly', 'monthly', 'yearly'] as PeriodFilter[]).map((period) => {
              const Icon = periodIcons[period];
              return (
                <button
                  key={period}
                  onClick={() => setSelectedPeriod(period)}
                  className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-xl transition-all duration-300 ${
                    selectedPeriod === period
                      ? 'bg-gradient-to-r from-emerald-500 to-blue-500 text-white shadow-lg shadow-emerald-500/25'
                      : theme === 'dark' 
                        ? 'text-slate-400 hover:text-white hover:bg-slate-700/50' 
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span className="hidden sm:inline capitalize">{period}</span>
                </button>
              );
            })}
          </div>

          {/* Date Picker Button */}
          <div className="relative" ref={datePickerRef}>
            <button
              onClick={() => setShowDatePicker(!showDatePicker)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border transition-all duration-300 ${
                theme === 'dark'
                  ? 'bg-slate-800/50 border-slate-700/50 text-slate-300 hover:bg-slate-700/50 hover:text-white'
                  : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50 shadow-sm'
              }`}
            >
              <CalendarDays className="w-4 h-4 text-emerald-500" />
              <span className="text-sm font-medium">
                {selectedDate.toLocaleDateString('en-US', { 
                  month: 'short', 
                  day: 'numeric',
                  year: 'numeric'
                })}
              </span>
            </button>

            {/* Date Picker Dropdown */}
            {showDatePicker && (
              <div className={`absolute top-full mt-2 right-0 z-50 p-4 rounded-2xl border shadow-2xl ${
                theme === 'dark' 
                  ? 'bg-slate-800 border-slate-700' 
                  : 'bg-white border-slate-200'
              }`} style={{ minWidth: '280px' }}>
                {/* Month/Year Header */}
                <div className="flex items-center justify-between mb-4">
                  <button
                    onClick={() => navigateMonth(-1)}
                    className={`p-2 rounded-lg transition-colors ${
                      theme === 'dark' ? 'hover:bg-slate-700 text-slate-400' : 'hover:bg-slate-100 text-slate-600'
                    }`}
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className={`font-semibold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                    {monthNames[calendarMonth]} {calendarYear}
                  </span>
                  <button
                    onClick={() => navigateMonth(1)}
                    className={`p-2 rounded-lg transition-colors ${
                      theme === 'dark' ? 'hover:bg-slate-700 text-slate-400' : 'hover:bg-slate-100 text-slate-600'
                    }`}
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>

                {/* Day Names */}
                <div className="grid grid-cols-7 gap-1 mb-2">
                  {dayNames.map((day) => (
                    <div
                      key={day}
                      className={`text-center text-xs font-medium py-1 ${
                        theme === 'dark' ? 'text-slate-500' : 'text-slate-400'
                      }`}
                    >
                      {day}
                    </div>
                  ))}
                </div>

                {/* Calendar Grid */}
                <div className="grid grid-cols-7 gap-1">
                  {/* Empty cells for days before first day of month */}
                  {Array.from({ length: firstDay }).map((_, index) => (
                    <div key={`empty-${index}`} className="aspect-square" />
                  ))}
                  
                  {/* Day cells */}
                  {Array.from({ length: daysInMonth }).map((_, index) => {
                    const day = index + 1;
                    const isSelected = 
                      selectedDate.getDate() === day && 
                      selectedDate.getMonth() === calendarMonth && 
                      selectedDate.getFullYear() === calendarYear;
                    const isToday = 
                      new Date().getDate() === day && 
                      new Date().getMonth() === calendarMonth && 
                      new Date().getFullYear() === calendarYear;
                    
                    return (
                      <button
                        key={day}
                        onClick={() => handleDateSelect(day)}
                        className={`aspect-square flex items-center justify-center rounded-lg text-sm font-medium transition-all ${
                          isSelected
                            ? 'bg-gradient-to-br from-emerald-500 to-blue-500 text-white shadow-lg'
                            : isToday
                              ? theme === 'dark'
                                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/50'
                                : 'bg-emerald-100 text-emerald-600 border border-emerald-300'
                              : theme === 'dark'
                                ? 'hover:bg-slate-700 text-slate-300'
                                : 'hover:bg-slate-100 text-slate-700'
                        }`}
                      >
                        {day}
                      </button>
                    );
                  })}
                </div>

                {/* Quick Select Buttons */}
                <div className={`mt-4 pt-4 border-t grid grid-cols-2 gap-2 ${theme === 'dark' ? 'border-slate-700' : 'border-slate-200'}`}>
                  <button
                    onClick={() => {
                      setSelectedDate(new Date());
                      setShowDatePicker(false);
                    }}
                    className={`py-2 px-3 rounded-lg text-sm font-medium transition-all ${
                      theme === 'dark' 
                        ? 'bg-slate-700 text-slate-300 hover:bg-slate-600' 
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    Today
                  </button>
                  <button
                    onClick={() => {
                      const yesterday = new Date();
                      yesterday.setDate(yesterday.getDate() - 1);
                      setSelectedDate(yesterday);
                      setShowDatePicker(false);
                    }}
                    className={`py-2 px-3 rounded-lg text-sm font-medium transition-all ${
                      theme === 'dark' 
                        ? 'bg-slate-700 text-slate-300 hover:bg-slate-600' 
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    Yesterday
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Export Button */}
          <div className="relative" ref={exportMenuRef}>
            <button
              onClick={() => setShowExportMenu(!showExportMenu)}
              disabled={isExporting}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all duration-300 ${
                isExporting
                  ? 'opacity-50 cursor-not-allowed'
                  : 'bg-gradient-to-r from-emerald-500 to-blue-500 hover:from-emerald-600 hover:to-blue-600 shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/40'
              } text-white font-medium`}
            >
              {isExporting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span className="text-sm">Exporting...</span>
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  <span className="text-sm hidden sm:inline">Export</span>
                </>
              )}
            </button>

            {/* Export Menu Dropdown */}
            {showExportMenu && !isExporting && (
              <div className={`absolute top-full mt-2 right-0 z-50 py-2 rounded-xl border shadow-2xl min-w-[200px] ${
                theme === 'dark' 
                  ? 'bg-slate-800 border-slate-700' 
                  : 'bg-white border-slate-200'
              }`}>
                <div className={`px-4 py-2 border-b ${theme === 'dark' ? 'border-slate-700' : 'border-slate-100'}`}>
                  <p className={`text-xs font-semibold uppercase tracking-wide ${
                    theme === 'dark' ? 'text-slate-400' : 'text-slate-500'
                  }`}>
                    Export Report As
                  </p>
                </div>
                
                <button
                  onClick={exportToCSV}
                  className={`w-full flex items-center gap-3 px-4 py-3 transition-colors ${
                    theme === 'dark' 
                      ? 'hover:bg-slate-700/50 text-slate-300' 
                      : 'hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  <div className="p-2 rounded-lg bg-green-500/10">
                    <FileText className="w-4 h-4 text-green-500" />
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-medium">CSV File</p>
                    <p className={`text-xs ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>
                      Comma-separated values
                    </p>
                  </div>
                </button>
                
                <button
                  onClick={exportToExcel}
                  className={`w-full flex items-center gap-3 px-4 py-3 transition-colors ${
                    theme === 'dark' 
                      ? 'hover:bg-slate-700/50 text-slate-300' 
                      : 'hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  <div className="p-2 rounded-lg bg-emerald-500/10">
                    <FileSpreadsheet className="w-4 h-4 text-emerald-500" />
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-medium">Excel File</p>
                    <p className={`text-xs ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>
                      Microsoft Excel format
                    </p>
                  </div>
                </button>
                
                <button
                  onClick={exportToPDF}
                  className={`w-full flex items-center gap-3 px-4 py-3 transition-colors ${
                    theme === 'dark' 
                      ? 'hover:bg-slate-700/50 text-slate-300' 
                      : 'hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  <div className="p-2 rounded-lg bg-red-500/10">
                    <FileDown className="w-4 h-4 text-red-500" />
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-medium">PDF Document</p>
                    <p className={`text-xs ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>
                      Print-ready format
                    </p>
                  </div>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Report Type Tabs - Modern Centered Design */}
      <div className={`rounded-2xl border backdrop-blur-md ${
        theme === 'dark' 
          ? 'bg-slate-800/40 border-slate-700/50' 
          : 'bg-white/60 border-slate-200 shadow-sm'
      }`}>
        <div className="flex flex-wrap items-center justify-center gap-2 p-3 lg:gap-3">
          {reportTabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            const gradientMap: Record<string, string> = {
              'emerald': 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
              'blue': 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
              'purple': 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
              'amber': 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
              'cyan': 'linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)',
              'pink': 'linear-gradient(135deg, #ec4899 0%, #db2777 100%)',
              'orange': 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)',
            };
            
            return (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id);
                  setCurrentPage(1);
                  setSalesPage(1);
                }}
                className={`flex items-center gap-2.5 px-5 py-3 rounded-xl text-sm font-semibold transition-all duration-300 transform ${
                  isActive
                    ? 'text-white shadow-lg scale-100'
                    : theme === 'dark'
                      ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/40'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/60'
                }`}
                style={isActive ? {
                  background: gradientMap[tab.color as keyof typeof gradientMap] || gradientMap['emerald'],
                  boxShadow: `0 10px 25px -5px ${
                    tab.color === 'emerald' ? 'rgba(16, 185, 129, 0.3)' :
                    tab.color === 'blue' ? 'rgba(59, 130, 246, 0.3)' :
                    tab.color === 'purple' ? 'rgba(139, 92, 246, 0.3)' :
                    tab.color === 'amber' ? 'rgba(245, 158, 11, 0.3)' :
                    tab.color === 'cyan' ? 'rgba(6, 182, 212, 0.3)' :
                    tab.color === 'pink' ? 'rgba(236, 72, 153, 0.3)' :
                    'rgba(249, 115, 22, 0.3)'
                }`
                } : {}}
              >
                <Icon className={`w-5 h-5 transition-transform ${isActive ? 'scale-110' : 'scale-100'}`} />
                <span className="hidden sm:inline">{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ==================== SALES TAB CONTENT ==================== */}
      {activeTab === 'sales' && (
        <>
          {/* Stats Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
            {stats.map((stat) => {
              const Icon = stat.icon;
              return (
                <div 
                  key={stat.label}
                  className={`relative overflow-hidden rounded-2xl border p-6 transition-all duration-300 hover:scale-[1.02] ${
                    theme === 'dark' 
                      ? 'bg-gradient-to-br from-slate-800/50 to-slate-900/50 border-slate-700/50' 
                      : 'bg-white border-slate-200 shadow-sm hover:shadow-md'
                  }`}
                >
                  <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br ${stat.bgGradient} rounded-full blur-3xl`} />
                  <div className="relative">
                    <div className="flex items-center justify-between mb-4">
                      <div className={`p-3 rounded-xl bg-gradient-to-br ${stat.gradient} shadow-lg`}>
                        <Icon className="w-5 h-5 text-white" />
                      </div>
                      <span className={`flex items-center gap-1 text-sm font-medium ${
                        stat.change.positive ? 'text-green-500' : 'text-red-500'
                      }`}>
                        {stat.change.positive ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
                        {stat.change.value}
                      </span>
                    </div>
                    <p className={`text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                      {stat.label}
                    </p>
                <p className={`text-2xl font-bold mt-1 ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                  {stat.value}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Charts and Analytics Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Revenue Chart */}
        <div className={`lg:col-span-2 rounded-2xl border p-6 ${
          theme === 'dark' 
            ? 'bg-gradient-to-br from-slate-800/50 to-slate-900/50 border-slate-700/50' 
            : 'bg-white border-slate-200 shadow-sm'
        }`}>
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className={`text-lg font-semibold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                Revenue Overview
              </h3>
              <p className={`text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                {periodLabels[selectedPeriod]}'s revenue breakdown
              </p>
            </div>
            <div className={`px-3 py-1.5 rounded-lg text-sm font-medium ${
              theme === 'dark' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-emerald-50 text-emerald-600'
            }`}>
              {formatCompactCurrency(currentPaidAmount)}
            </div>
          </div>
          
          {/* Bar Chart */}
          <div className="flex items-end justify-between gap-1 sm:gap-2 h-48">
            {chartData.map((data, index) => (
              <div key={index} className="flex-1 flex flex-col items-center gap-2">
                <div className="w-full relative flex flex-col items-center group">
                  {/* Tooltip */}
                  <div className={`absolute -top-10 opacity-0 group-hover:opacity-100 transition-opacity duration-200 px-2 py-1 rounded text-xs font-medium whitespace-nowrap z-10 ${
                    theme === 'dark' ? 'bg-slate-700 text-white' : 'bg-slate-800 text-white'
                  }`}>
                    {formatCompactCurrency(data.value)}
                  </div>
                  <div 
                    className="w-full max-w-[40px] rounded-t-lg bg-gradient-to-t from-emerald-500 to-blue-500 transition-all duration-500 hover:from-emerald-400 hover:to-blue-400 cursor-pointer"
                    style={{ 
                      height: `${Math.max((data.value / maxChartValue) * 160, 4)}px`,
                      opacity: data.value > 0 ? 1 : 0.3
                    }}
                  />
                </div>
                <span className={`text-xs ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>
                  {data.label}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Payment Methods */}
        <div className={`rounded-2xl border p-6 ${
          theme === 'dark' 
            ? 'bg-gradient-to-br from-slate-800/50 to-slate-900/50 border-slate-700/50' 
            : 'bg-white border-slate-200 shadow-sm'
        }`}>
          <h3 className={`text-lg font-semibold mb-4 ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
            Payment Methods
          </h3>
          <div className="space-y-4">
            {[
              { key: 'cash', label: 'Cash', icon: Banknote, color: 'emerald' },
              { key: 'card', label: 'Card', icon: CreditCard, color: 'blue' },
              { key: 'bank_transfer', label: 'Bank Transfer', icon: Building2, color: 'purple' },
              { key: 'credit', label: 'Credit', icon: Receipt, color: 'amber' },
            ].map((method) => {
              const Icon = method.icon;
              const data = paymentBreakdown[method.key as keyof typeof paymentBreakdown];
              const totalPayments = Object.values(paymentBreakdown).reduce((sum, p) => sum + p.count, 0);
              const percentage = totalPayments > 0 ? (data.count / totalPayments) * 100 : 0;
              
              return (
                <div key={method.key} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${theme === 'dark' ? 'bg-slate-700/50' : 'bg-slate-100'}`}>
                        <Icon className={`w-4 h-4 text-${method.color}-500`} />
                      </div>
                      <div>
                        <p className={`text-sm font-medium ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                          {method.label}
                        </p>
                        <p className={`text-xs ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>
                          {data.count} transactions
                        </p>
                      </div>
                    </div>
                    <p className={`text-sm font-semibold ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                      {formatCompactCurrency(data.amount)}
                    </p>
                  </div>
                  {/* Progress bar */}
                  <div className={`h-1.5 rounded-full overflow-hidden ${theme === 'dark' ? 'bg-slate-700' : 'bg-slate-200'}`}>
                    <div 
                      className={`h-full rounded-full bg-${method.color}-500 transition-all duration-500`}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Invoice Status & Top Products */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Invoice Status */}
        <div className={`rounded-2xl border p-6 ${
          theme === 'dark' 
            ? 'bg-gradient-to-br from-slate-800/50 to-slate-900/50 border-slate-700/50' 
            : 'bg-white border-slate-200 shadow-sm'
        }`}>
          <h3 className={`text-lg font-semibold mb-6 ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
            Invoice Status
          </h3>
          <div className="grid grid-cols-3 gap-4">
            <div className={`p-4 rounded-xl text-center ${theme === 'dark' ? 'bg-green-500/10' : 'bg-green-50'}`}>
              <div className="flex justify-center mb-2">
                <div className="p-2 rounded-lg bg-green-500/20">
                  <TrendingUp className="w-5 h-5 text-green-500" />
                </div>
              </div>
              <p className={`text-2xl font-bold text-green-500`}>{statusBreakdown.fullpaid}</p>
              <p className={`text-xs mt-1 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>Full Paid</p>
            </div>
            <div className={`p-4 rounded-xl text-center ${theme === 'dark' ? 'bg-amber-500/10' : 'bg-amber-50'}`}>
              <div className="flex justify-center mb-2">
                <div className="p-2 rounded-lg bg-amber-500/20">
                  <Clock className="w-5 h-5 text-amber-500" />
                </div>
              </div>
              <p className={`text-2xl font-bold text-amber-500`}>{statusBreakdown.halfpay}</p>
              <p className={`text-xs mt-1 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>Half Pay</p>
            </div>
            <div className={`p-4 rounded-xl text-center ${theme === 'dark' ? 'bg-red-500/10' : 'bg-red-50'}`}>
              <div className="flex justify-center mb-2">
                <div className="p-2 rounded-lg bg-red-500/20">
                  <ArrowDownRight className="w-5 h-5 text-red-500" />
                </div>
              </div>
              <p className={`text-2xl font-bold text-red-500`}>{statusBreakdown.unpaid}</p>
              <p className={`text-xs mt-1 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>Unpaid</p>
            </div>
          </div>
          
          {/* Summary bar */}
          <div className="mt-6">
            <div className={`h-3 rounded-full overflow-hidden flex ${theme === 'dark' ? 'bg-slate-700' : 'bg-slate-200'}`}>
              {currentOrders > 0 && (
                <>
                  <div 
                    className="h-full bg-green-500 transition-all duration-500"
                    style={{ width: `${(statusBreakdown.fullpaid / currentOrders) * 100}%` }}
                  />
                  <div 
                    className="h-full bg-amber-500 transition-all duration-500"
                    style={{ width: `${(statusBreakdown.halfpay / currentOrders) * 100}%` }}
                  />
                  <div 
                    className="h-full bg-red-500 transition-all duration-500"
                    style={{ width: `${(statusBreakdown.unpaid / currentOrders) * 100}%` }}
                  />
                </>
              )}
            </div>
          </div>
        </div>

        {/* Top Selling Products */}
        <div className={`rounded-2xl border p-6 ${
          theme === 'dark' 
            ? 'bg-gradient-to-br from-slate-800/50 to-slate-900/50 border-slate-700/50' 
            : 'bg-white border-slate-200 shadow-sm'
        }`}>
          <h3 className={`text-lg font-semibold mb-4 ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
            Top Selling Products
          </h3>
          {topProducts.length > 0 ? (
            <div className="space-y-3">
              {topProducts.map((product, index) => (
                <div 
                  key={product.id}
                  className={`flex items-center gap-4 p-3 rounded-xl transition-all ${
                    theme === 'dark' ? 'hover:bg-slate-700/30' : 'hover:bg-slate-50'
                  }`}
                >
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm ${
                    index === 0 ? 'bg-gradient-to-br from-amber-400 to-amber-600 text-white' :
                    index === 1 ? 'bg-gradient-to-br from-slate-300 to-slate-400 text-white' :
                    index === 2 ? 'bg-gradient-to-br from-orange-400 to-orange-600 text-white' :
                    theme === 'dark' ? 'bg-slate-700 text-slate-300' : 'bg-slate-200 text-slate-600'
                  }`}>
                    {index + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium truncate ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                      {product.name}
                    </p>
                    <p className={`text-xs ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>
                      {product.quantity} sold
                    </p>
                  </div>
                  <p className={`text-sm font-semibold ${theme === 'dark' ? 'text-emerald-400' : 'text-emerald-600'}`}>
                    {formatCompactCurrency(product.revenue)}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <div className={`text-center py-8 ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>
              <Package className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>No sales data for {periodLabels[selectedPeriod].toLowerCase()}</p>
            </div>
          )}
        </div>
      </div>

      {/* Sales Channel & Top Customers & Category Performance */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Sales Channel Breakdown */}
        <div className={`rounded-2xl border p-6 ${
          theme === 'dark' 
            ? 'bg-gradient-to-br from-slate-800/50 to-slate-900/50 border-slate-700/50' 
            : 'bg-white border-slate-200 shadow-sm'
        }`}>
          <h3 className={`text-lg font-semibold mb-4 ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
            Sales Channels
          </h3>
          <div className="space-y-4">
            {/* On-site sales */}
            <div className={`p-4 rounded-xl ${theme === 'dark' ? 'bg-slate-700/30' : 'bg-slate-50'}`}>
              <div className="flex items-center gap-3 mb-2">
                <div className={`p-2 rounded-lg ${theme === 'dark' ? 'bg-blue-500/20' : 'bg-blue-100'}`}>
                  <Store className="w-5 h-5 text-blue-500" />
                </div>
                <div className="flex-1">
                  <p className={`text-sm font-medium ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>On-site</p>
                  <p className={`text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                    {salesChannelBreakdown.onSite.count} orders
                  </p>
                </div>
                <p className={`text-lg font-bold ${theme === 'dark' ? 'text-blue-400' : 'text-blue-600'}`}>
                  {formatCompactCurrency(salesChannelBreakdown.onSite.amount)}
                </p>
              </div>
            </div>
            {/* Online sales */}
            <div className={`p-4 rounded-xl ${theme === 'dark' ? 'bg-slate-700/30' : 'bg-slate-50'}`}>
              <div className="flex items-center gap-3 mb-2">
                <div className={`p-2 rounded-lg ${theme === 'dark' ? 'bg-purple-500/20' : 'bg-purple-100'}`}>
                  <Globe className="w-5 h-5 text-purple-500" />
                </div>
                <div className="flex-1">
                  <p className={`text-sm font-medium ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>Online</p>
                  <p className={`text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                    {salesChannelBreakdown.online.count} orders
                  </p>
                </div>
                <p className={`text-lg font-bold ${theme === 'dark' ? 'text-purple-400' : 'text-purple-600'}`}>
                  {formatCompactCurrency(salesChannelBreakdown.online.amount)}
                </p>
              </div>
            </div>
            {/* Total comparison bar */}
            <div className="pt-2">
              <div className="flex justify-between text-xs mb-1">
                <span className={theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}>Distribution</span>
                <span className={theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}>
                  {((salesChannelBreakdown.onSite.count / Math.max(salesChannelBreakdown.onSite.count + salesChannelBreakdown.online.count, 1)) * 100).toFixed(0)}% / {((salesChannelBreakdown.online.count / Math.max(salesChannelBreakdown.onSite.count + salesChannelBreakdown.online.count, 1)) * 100).toFixed(0)}%
                </span>
              </div>
              <div className={`h-2.5 rounded-full overflow-hidden flex ${theme === 'dark' ? 'bg-slate-700' : 'bg-slate-200'}`}>
                <div 
                  className="h-full bg-blue-500 transition-all duration-500"
                  style={{ width: `${(salesChannelBreakdown.onSite.count / Math.max(salesChannelBreakdown.onSite.count + salesChannelBreakdown.online.count, 1)) * 100}%` }}
                />
                <div 
                  className="h-full bg-purple-500 transition-all duration-500"
                  style={{ width: `${(salesChannelBreakdown.online.count / Math.max(salesChannelBreakdown.onSite.count + salesChannelBreakdown.online.count, 1)) * 100}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Top Customers */}
        <div className={`rounded-2xl border p-6 ${
          theme === 'dark' 
            ? 'bg-gradient-to-br from-slate-800/50 to-slate-900/50 border-slate-700/50' 
            : 'bg-white border-slate-200 shadow-sm'
        }`}>
          <h3 className={`text-lg font-semibold mb-4 ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
            Top Customers
          </h3>
          {topCustomers.length > 0 ? (
            <div className="space-y-3">
              {topCustomers.map((customer, index) => (
                <div 
                  key={customer.id}
                  className={`flex items-center gap-3 p-2 rounded-lg transition-all ${
                    theme === 'dark' ? 'hover:bg-slate-700/30' : 'hover:bg-slate-50'
                  }`}
                >
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                    index === 0 ? 'bg-gradient-to-br from-amber-400 to-amber-600 text-white' :
                    index === 1 ? 'bg-gradient-to-br from-slate-300 to-slate-400 text-white' :
                    index === 2 ? 'bg-gradient-to-br from-orange-400 to-orange-600 text-white' :
                    theme === 'dark' ? 'bg-slate-700 text-slate-300' : 'bg-slate-200 text-slate-600'
                  }`}>
                    {customer.name.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium truncate ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                      {customer.name}
                    </p>
                    <p className={`text-xs ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>
                      {customer.orders} orders
                    </p>
                  </div>
                  <p className={`text-sm font-semibold ${theme === 'dark' ? 'text-emerald-400' : 'text-emerald-600'}`}>
                    {formatCompactCurrency(customer.total)}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <div className={`text-center py-6 ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>
              <Users className="w-10 h-10 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No customer data</p>
            </div>
          )}
        </div>

        {/* Warranty Claims Overview */}
        <div className={`rounded-2xl border p-6 ${
          theme === 'dark' 
            ? 'bg-gradient-to-br from-slate-800/50 to-slate-900/50 border-slate-700/50' 
            : 'bg-white border-slate-200 shadow-sm'
        }`}>
          <h3 className={`text-lg font-semibold mb-4 ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
            Warranty Claims
          </h3>
          <div className="grid grid-cols-2 gap-3">
            <div className={`p-3 rounded-xl text-center ${theme === 'dark' ? 'bg-slate-700/30' : 'bg-slate-50'}`}>
              <AlertCircle className="w-5 h-5 mx-auto mb-1 text-amber-500" />
              <p className={`text-xl font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>{warrantyStats.pending}</p>
              <p className={`text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>Pending</p>
            </div>
            <div className={`p-3 rounded-xl text-center ${theme === 'dark' ? 'bg-slate-700/30' : 'bg-slate-50'}`}>
              <CheckCircle2 className="w-5 h-5 mx-auto mb-1 text-green-500" />
              <p className={`text-xl font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>{warrantyStats.resolved}</p>
              <p className={`text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>Resolved</p>
            </div>
            <div className={`p-3 rounded-xl text-center ${theme === 'dark' ? 'bg-slate-700/30' : 'bg-slate-50'}`}>
              <XCircle className="w-5 h-5 mx-auto mb-1 text-red-500" />
              <p className={`text-xl font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>{warrantyStats.rejected}</p>
              <p className={`text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>Rejected</p>
            </div>
            <div className={`p-3 rounded-xl text-center ${theme === 'dark' ? 'bg-slate-700/30' : 'bg-slate-50'}`}>
              <Award className="w-5 h-5 mx-auto mb-1 text-blue-500" />
              <p className={`text-xl font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>{warrantyStats.total}</p>
              <p className={`text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>Total</p>
            </div>
          </div>
          <div className="mt-4 pt-3 border-t ${theme === 'dark' ? 'border-slate-700' : 'border-slate-200'}">
            <div className="flex justify-between items-center">
              <span className={`text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>Resolution Rate</span>
              <span className={`text-sm font-bold ${theme === 'dark' ? 'text-emerald-400' : 'text-emerald-600'}`}>
                {warrantyStats.total > 0 ? ((warrantyStats.resolved / warrantyStats.total) * 100).toFixed(0) : 0}%
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Category Performance */}
      {categoryPerformance.length > 0 && (
        <div className={`rounded-2xl border p-6 ${
          theme === 'dark' 
            ? 'bg-gradient-to-br from-slate-800/50 to-slate-900/50 border-slate-700/50' 
            : 'bg-white border-slate-200 shadow-sm'
        }`}>
          <h3 className={`text-lg font-semibold mb-4 ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
            Category Performance
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {categoryPerformance.slice(0, 6).map((category, index) => {
              const maxRevenue = categoryPerformance[0]?.revenue || 1;
              const percentage = (category.revenue / maxRevenue) * 100;
              const colors = ['emerald', 'blue', 'purple', 'amber', 'pink', 'cyan'];
              const color = colors[index % colors.length];
              
              return (
                <div 
                  key={category.name}
                  className={`p-4 rounded-xl text-center transition-all hover:scale-105 ${
                    theme === 'dark' ? 'bg-slate-700/30 hover:bg-slate-700/50' : 'bg-slate-50 hover:bg-slate-100'
                  }`}
                >
                  <div className={`w-12 h-12 mx-auto mb-2 rounded-xl flex items-center justify-center bg-${color}-500/20`}>
                    <Target className={`w-6 h-6 text-${color}-500`} />
                  </div>
                  <p className={`text-sm font-medium mb-1 ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                    {category.name}
                  </p>
                  <p className={`text-lg font-bold ${theme === 'dark' ? `text-${color}-400` : `text-${color}-600`}`}>
                    {formatCompactCurrency(category.revenue)}
                  </p>
                  <p className={`text-xs ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>
                    {category.sales} items sold
                  </p>
                  {/* Mini progress bar */}
                  <div className={`mt-2 h-1 rounded-full overflow-hidden ${theme === 'dark' ? 'bg-slate-600' : 'bg-slate-200'}`}>
                    <div 
                      className={`h-full rounded-full bg-${color}-500 transition-all duration-500`}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Sales History Table with Pagination */}
      <div className={`rounded-2xl border overflow-hidden ${
        theme === 'dark' 
          ? 'bg-gradient-to-br from-slate-800/50 to-slate-900/50 border-slate-700/50' 
          : 'bg-white border-slate-200 shadow-sm'
      }`}>
        <div className={`p-6 border-b ${theme === 'dark' ? 'border-slate-700/50' : 'border-slate-200'}`}>
          <div className="flex items-center justify-between">
            <div>
              <h3 className={`text-lg font-semibold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                Sales History
              </h3>
              <p className={`text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                {mockSalesHistory.length} total sales records
              </p>
            </div>
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg ${
              theme === 'dark' ? 'bg-emerald-500/10' : 'bg-emerald-50'
            }`}>
              <Zap className="w-4 h-4 text-emerald-500" />
              <span className={`text-sm font-medium ${theme === 'dark' ? 'text-emerald-400' : 'text-emerald-600'}`}>
                {formatCompactCurrency(mockSalesHistory.reduce((sum, s) => sum + s.total, 0))} Total
              </span>
            </div>
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className={`${theme === 'dark' ? 'bg-slate-800/50' : 'bg-slate-50'}`}>
              <tr>
                <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                  Sale ID
                </th>
                <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                  Product
                </th>
                <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                  Customer
                </th>
                <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                  Qty
                </th>
                <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                  Unit Price
                </th>
                <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                  Discount
                </th>
                <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                  Total
                </th>
                <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                  Date
                </th>
              </tr>
            </thead>
            <tbody className={`divide-y ${theme === 'dark' ? 'divide-slate-700/50' : 'divide-slate-200'}`}>
              {paginatedSales.map((sale) => (
                <tr key={sale.id} className={`transition-colors ${theme === 'dark' ? 'hover:bg-slate-700/20' : 'hover:bg-slate-50'}`}>
                  <td className={`px-6 py-4 whitespace-nowrap text-sm font-mono ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                    {sale.id}
                  </td>
                  <td className={`px-6 py-4 text-sm ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                    <div className="max-w-[200px] truncate font-medium">{sale.productName}</div>
                  </td>
                  <td className={`px-6 py-4 whitespace-nowrap text-sm ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                    {sale.customerName}
                  </td>
                  <td className={`px-6 py-4 whitespace-nowrap text-sm text-center ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                    {sale.quantity}
                  </td>
                  <td className={`px-6 py-4 whitespace-nowrap text-sm ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                    {formatCompactCurrency(sale.unitPrice)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {sale.discount > 0 ? (
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                        theme === 'dark' ? 'bg-green-500/20 text-green-400' : 'bg-green-100 text-green-700'
                      }`}>
                        -{sale.discount}%
                      </span>
                    ) : (
                      <span className={`text-sm ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>—</span>
                    )}
                  </td>
                  <td className={`px-6 py-4 whitespace-nowrap text-sm font-semibold ${theme === 'dark' ? 'text-emerald-400' : 'text-emerald-600'}`}>
                    {formatCompactCurrency(sale.total)}
                  </td>
                  <td className={`px-6 py-4 whitespace-nowrap text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                    {new Date(sale.saleDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {/* Pagination */}
        <Pagination
          currentPage={salesPage}
          totalPages={totalSalesPages}
          onPageChange={setSalesPage}
          totalItems={mockSalesHistory.length}
          itemsPerPage={salesPerPage}
        />
      </div>

      {/* Transactions Table with Pagination */}
      <div className={`rounded-2xl border overflow-hidden ${
        theme === 'dark' 
          ? 'bg-gradient-to-br from-slate-800/50 to-slate-900/50 border-slate-700/50' 
          : 'bg-white border-slate-200 shadow-sm'
      }`}>
        <div className={`p-6 border-b ${theme === 'dark' ? 'border-slate-700/50' : 'border-slate-200'}`}>
          <h3 className={`text-lg font-semibold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
            Invoice Transactions
          </h3>
          <p className={`text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
            {selectedPeriod === 'yearly' ? allInvoices.length : currentInvoices.length} transactions {selectedPeriod === 'yearly' ? 'total' : `in ${periodLabels[selectedPeriod].toLowerCase()}`}
          </p>
        </div>
        
        {(selectedPeriod === 'yearly' ? allInvoices.length : currentInvoices.length) > 0 ? (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className={`${theme === 'dark' ? 'bg-slate-800/50' : 'bg-slate-50'}`}>
                  <tr>
                    <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                      Invoice
                    </th>
                    <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                      Customer
                    </th>
                    <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                      Date
                    </th>
                    <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                      Items
                    </th>
                    <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                      Amount
                    </th>
                    <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                      Paid
                    </th>
                    <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                      Status
                    </th>
                    <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                      Channel
                    </th>
                  </tr>
                </thead>
                <tbody className={`divide-y ${theme === 'dark' ? 'divide-slate-700/50' : 'divide-slate-200'}`}>
                  {paginatedInvoices.map((invoice) => (
                    <tr key={invoice.id} className={`transition-colors ${theme === 'dark' ? 'hover:bg-slate-700/20' : 'hover:bg-slate-50'}`}>
                      <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                        #{invoice.id}
                      </td>
                      <td className={`px-6 py-4 whitespace-nowrap text-sm ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                        {invoice.customerName}
                      </td>
                      <td className={`px-6 py-4 whitespace-nowrap text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                        {new Date(invoice.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </td>
                      <td className={`px-6 py-4 whitespace-nowrap text-sm text-center ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                        {invoice.items.length}
                      </td>
                      <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                        {formatCurrency(invoice.total)}
                      </td>
                      <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium ${theme === 'dark' ? 'text-emerald-400' : 'text-emerald-600'}`}>
                        {formatCurrency(invoice.paidAmount || 0)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          invoice.status === 'fullpaid' 
                            ? theme === 'dark' ? 'bg-green-500/20 text-green-400' : 'bg-green-100 text-green-800'
                            : invoice.status === 'halfpay'
                              ? theme === 'dark' ? 'bg-amber-500/20 text-amber-400' : 'bg-amber-100 text-amber-800'
                              : theme === 'dark' ? 'bg-red-500/20 text-red-400' : 'bg-red-100 text-red-800'
                        }`}>
                          {invoice.status === 'fullpaid' ? 'Paid' : invoice.status === 'halfpay' ? 'Partial' : 'Unpaid'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1 text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                          {invoice.salesChannel === 'online' ? (
                            <><Globe className="w-3 h-3" /> Online</>
                          ) : (
                            <><Store className="w-3 h-3" /> On-site</>
                          )}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            {/* Pagination */}
            <Pagination
              currentPage={currentPage}
              totalPages={totalInvoicePages}
              onPageChange={setCurrentPage}
              totalItems={selectedPeriod === 'yearly' ? allInvoices.length : currentInvoices.length}
              itemsPerPage={itemsPerPage}
            />
          </>
        ) : (
          <div className={`text-center py-12 ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>
            <Receipt className="w-16 h-16 mx-auto mb-3 opacity-50" />
            <p className="text-lg font-medium">No transactions found</p>
            <p className="text-sm mt-1">There are no transactions for {periodLabels[selectedPeriod].toLowerCase()}</p>
          </div>
        )}
      </div>
        </>
      )}

      {/* ==================== PURCHASES TAB CONTENT ==================== */}
      {activeTab === 'purchases' && (
        <>
          {/* Purchases Stats Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
            {[
              { label: 'Total Purchases', value: formatCurrency(purchaseStats.totalPurchases), icon: TruckIcon, gradient: 'from-blue-500 to-cyan-600', bgGradient: 'from-blue-500/20 to-cyan-500/10' },
              { label: 'Amount Paid', value: formatCurrency(purchaseStats.totalPaid), icon: CheckCircle2, gradient: 'from-emerald-500 to-teal-600', bgGradient: 'from-emerald-500/20 to-teal-500/10' },
              { label: 'Pending Payment', value: formatCurrency(purchaseStats.pending), icon: Clock, gradient: 'from-amber-500 to-orange-600', bgGradient: 'from-amber-500/20 to-orange-500/10' },
              { label: 'Total GRNs', value: purchaseStats.totalGRNs.toString(), icon: ClipboardList, gradient: 'from-purple-500 to-pink-600', bgGradient: 'from-purple-500/20 to-pink-500/10' },
            ].map((stat) => {
              const Icon = stat.icon;
              return (
                <div key={stat.label} className={`relative overflow-hidden rounded-2xl border p-6 transition-all duration-300 hover:scale-[1.02] ${
                  theme === 'dark' ? 'bg-gradient-to-br from-slate-800/50 to-slate-900/50 border-slate-700/50' : 'bg-white border-slate-200 shadow-sm hover:shadow-md'
                }`}>
                  <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br ${stat.bgGradient} rounded-full blur-3xl`} />
                  <div className="relative">
                    <div className={`p-3 rounded-xl bg-gradient-to-br ${stat.gradient} shadow-lg w-fit mb-4`}>
                      <Icon className="w-5 h-5 text-white" />
                    </div>
                    <p className={`text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>{stat.label}</p>
                    <p className={`text-2xl font-bold mt-1 ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>{stat.value}</p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* GRN Status & Top Suppliers */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className={`rounded-2xl border p-6 ${theme === 'dark' ? 'bg-gradient-to-br from-slate-800/50 to-slate-900/50 border-slate-700/50' : 'bg-white border-slate-200 shadow-sm'}`}>
              <h3 className={`text-lg font-semibold mb-4 ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>GRN Status</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className={`p-4 rounded-xl text-center ${theme === 'dark' ? 'bg-green-500/10' : 'bg-green-50'}`}>
                  <CheckCircle2 className="w-6 h-6 mx-auto mb-2 text-green-500" />
                  <p className="text-2xl font-bold text-green-500">{purchaseStats.completed}</p>
                  <p className={`text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>Completed</p>
                </div>
                <div className={`p-4 rounded-xl text-center ${theme === 'dark' ? 'bg-amber-500/10' : 'bg-amber-50'}`}>
                  <Clock className="w-6 h-6 mx-auto mb-2 text-amber-500" />
                  <p className="text-2xl font-bold text-amber-500">{purchaseStats.inspecting}</p>
                  <p className={`text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>Pending/Inspecting</p>
                </div>
              </div>
            </div>

            <div className={`rounded-2xl border p-6 ${theme === 'dark' ? 'bg-gradient-to-br from-slate-800/50 to-slate-900/50 border-slate-700/50' : 'bg-white border-slate-200 shadow-sm'}`}>
              <h3 className={`text-lg font-semibold mb-4 ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>Top Suppliers by Purchase</h3>
              <div className="space-y-3">
                {purchaseStats.topSuppliers.map((supplier, index) => (
                  <div key={supplier.name} className={`flex items-center gap-3 p-2 rounded-lg ${theme === 'dark' ? 'hover:bg-slate-700/30' : 'hover:bg-slate-50'}`}>
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm ${
                      index === 0 ? 'bg-gradient-to-br from-amber-400 to-amber-600 text-white' :
                      index === 1 ? 'bg-gradient-to-br from-slate-300 to-slate-400 text-white' :
                      index === 2 ? 'bg-gradient-to-br from-orange-400 to-orange-600 text-white' :
                      theme === 'dark' ? 'bg-slate-700 text-slate-300' : 'bg-slate-200 text-slate-600'
                    }`}>{index + 1}</div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium truncate ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>{supplier.name}</p>
                      <p className={`text-xs ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>{supplier.orders} orders</p>
                    </div>
                    <p className={`text-sm font-semibold ${theme === 'dark' ? 'text-blue-400' : 'text-blue-600'}`}>{formatCompactCurrency(supplier.total)}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}

      {/* ==================== INVENTORY TAB CONTENT ==================== */}
      {activeTab === 'inventory' && (
        <>
          {/* Inventory Stats Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
            {[
              { label: 'Total Products', value: inventoryStats.totalProducts.toString(), icon: Package, gradient: 'from-purple-500 to-pink-600', bgGradient: 'from-purple-500/20 to-pink-500/10' },
              { label: 'Total Stock', value: inventoryStats.totalStock.toLocaleString(), icon: Boxes, gradient: 'from-blue-500 to-cyan-600', bgGradient: 'from-blue-500/20 to-cyan-500/10' },
              { label: 'Stock Value (Cost)', value: formatCompactCurrency(inventoryStats.totalCostValue), icon: Calculator, gradient: 'from-emerald-500 to-teal-600', bgGradient: 'from-emerald-500/20 to-teal-500/10' },
              { label: 'Potential Profit', value: formatCompactCurrency(inventoryStats.potentialProfit), icon: TrendingUp, gradient: 'from-amber-500 to-orange-600', bgGradient: 'from-amber-500/20 to-orange-500/10' },
            ].map((stat) => {
              const Icon = stat.icon;
              return (
                <div key={stat.label} className={`relative overflow-hidden rounded-2xl border p-6 transition-all duration-300 hover:scale-[1.02] ${
                  theme === 'dark' ? 'bg-gradient-to-br from-slate-800/50 to-slate-900/50 border-slate-700/50' : 'bg-white border-slate-200 shadow-sm hover:shadow-md'
                }`}>
                  <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br ${stat.bgGradient} rounded-full blur-3xl`} />
                  <div className="relative">
                    <div className={`p-3 rounded-xl bg-gradient-to-br ${stat.gradient} shadow-lg w-fit mb-4`}>
                      <Icon className="w-5 h-5 text-white" />
                    </div>
                    <p className={`text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>{stat.label}</p>
                    <p className={`text-2xl font-bold mt-1 ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>{stat.value}</p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Stock Alerts & Categories */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className={`rounded-2xl border p-6 ${theme === 'dark' ? 'bg-gradient-to-br from-slate-800/50 to-slate-900/50 border-slate-700/50' : 'bg-white border-slate-200 shadow-sm'}`}>
              <h3 className={`text-lg font-semibold mb-4 flex items-center gap-2 ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                <AlertCircle className="w-5 h-5 text-amber-500" /> Stock Alerts
              </h3>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className={`p-4 rounded-xl text-center ${theme === 'dark' ? 'bg-amber-500/10' : 'bg-amber-50'}`}>
                  <p className="text-2xl font-bold text-amber-500">{inventoryStats.lowStockCount}</p>
                  <p className={`text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>Low Stock</p>
                </div>
                <div className={`p-4 rounded-xl text-center ${theme === 'dark' ? 'bg-red-500/10' : 'bg-red-50'}`}>
                  <p className="text-2xl font-bold text-red-500">{inventoryStats.outOfStockCount}</p>
                  <p className={`text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>Out of Stock</p>
                </div>
              </div>
              {inventoryStats.lowStockItems.length > 0 && (
                <div className="space-y-2">
                  <p className={`text-xs font-semibold uppercase ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>Low Stock Items</p>
                  {inventoryStats.lowStockItems.map((item, i) => (
                    <div key={i} className={`flex items-center justify-between p-2 rounded-lg ${theme === 'dark' ? 'bg-slate-700/30' : 'bg-slate-50'}`}>
                      <span className={`text-sm truncate ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>{item.name}</span>
                      <span className="text-sm font-medium text-amber-500">{item.stock}/{item.threshold}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className={`rounded-2xl border p-6 ${theme === 'dark' ? 'bg-gradient-to-br from-slate-800/50 to-slate-900/50 border-slate-700/50' : 'bg-white border-slate-200 shadow-sm'}`}>
              <h3 className={`text-lg font-semibold mb-4 ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>Stock by Category</h3>
              <div className="space-y-3">
                {inventoryStats.categories.map((cat) => (
                  <div key={cat.name} className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className={theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}>{cat.name}</span>
                      <span className={theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}>{cat.stock} units • {formatCompactCurrency(cat.value)}</span>
                    </div>
                    <div className={`h-2 rounded-full overflow-hidden ${theme === 'dark' ? 'bg-slate-700' : 'bg-slate-200'}`}>
                      <div 
                        className="h-full rounded-full bg-gradient-to-r from-purple-500 to-pink-500" 
                        style={{ width: `${(cat.value / (inventoryStats.categories[0]?.value || 1)) * 100}%` }} 
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}

      {/* ==================== SERVICES TAB CONTENT ==================== */}
      {activeTab === 'services' && (
        <>
          {/* Services Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
            {[
              { label: 'Total Services', value: servicesStats.total.toString(), icon: Wrench, gradient: 'from-amber-500 to-orange-600', bgGradient: 'from-amber-500/20 to-orange-500/10' },
              { label: 'Active Services', value: servicesStats.active.toString(), icon: CheckCircle2, gradient: 'from-emerald-500 to-teal-600', bgGradient: 'from-emerald-500/20 to-teal-500/10' },
              { label: 'Popular Services', value: servicesStats.popular.toString(), icon: Zap, gradient: 'from-purple-500 to-pink-600', bgGradient: 'from-purple-500/20 to-pink-500/10' },
              { label: 'Avg Price Range', value: `${formatCompactCurrency(servicesStats.avgPriceRange.min)} - ${formatCompactCurrency(servicesStats.avgPriceRange.max)}`, icon: DollarSign, gradient: 'from-blue-500 to-cyan-600', bgGradient: 'from-blue-500/20 to-cyan-500/10' },
            ].map((stat) => {
              const Icon = stat.icon;
              return (
                <div key={stat.label} className={`relative overflow-hidden rounded-2xl border p-6 ${
                  theme === 'dark' ? 'bg-gradient-to-br from-slate-800/50 to-slate-900/50 border-slate-700/50' : 'bg-white border-slate-200 shadow-sm'
                }`}>
                  <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br ${stat.bgGradient} rounded-full blur-3xl`} />
                  <div className="relative">
                    <div className={`p-3 rounded-xl bg-gradient-to-br ${stat.gradient} shadow-lg w-fit mb-4`}>
                      <Icon className="w-5 h-5 text-white" />
                    </div>
                    <p className={`text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>{stat.label}</p>
                    <p className={`text-xl font-bold mt-1 ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>{stat.value}</p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Job Notes Stats */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className={`rounded-2xl border p-6 ${theme === 'dark' ? 'bg-gradient-to-br from-slate-800/50 to-slate-900/50 border-slate-700/50' : 'bg-white border-slate-200 shadow-sm'}`}>
              <h3 className={`text-lg font-semibold mb-4 ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>Job Notes Status</h3>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: 'Total Jobs', value: jobNotesStats.total, color: 'blue' },
                  { label: 'Completed', value: jobNotesStats.completed, color: 'green' },
                  { label: 'Delivered', value: jobNotesStats.delivered, color: 'emerald' },
                  { label: 'In Progress', value: jobNotesStats.inProgress, color: 'amber' },
                  { label: 'Waiting Parts', value: jobNotesStats.waitingParts, color: 'orange' },
                  { label: 'Urgent', value: jobNotesStats.urgent, color: 'red' },
                ].map((item) => (
                  <div key={item.label} className={`p-3 rounded-xl text-center ${theme === 'dark' ? `bg-${item.color}-500/10` : `bg-${item.color}-50`}`}>
                    <p className={`text-xl font-bold text-${item.color}-500`}>{item.value}</p>
                    <p className={`text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>{item.label}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className={`rounded-2xl border p-6 ${theme === 'dark' ? 'bg-gradient-to-br from-slate-800/50 to-slate-900/50 border-slate-700/50' : 'bg-white border-slate-200 shadow-sm'}`}>
              <h3 className={`text-lg font-semibold mb-4 ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>Device Types</h3>
              <div className="space-y-3">
                {jobNotesStats.deviceTypes.map((device) => (
                  <div key={device.type} className="flex items-center gap-3">
                    <div className={`flex-1 h-2 rounded-full overflow-hidden ${theme === 'dark' ? 'bg-slate-700' : 'bg-slate-200'}`}>
                      <div className="h-full rounded-full bg-gradient-to-r from-amber-500 to-orange-500" style={{ width: `${(device.count / (jobNotesStats.deviceTypes[0]?.count || 1)) * 100}%` }} />
                    </div>
                    <span className={`text-sm capitalize ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>{device.type}</span>
                    <span className={`text-sm font-medium ${theme === 'dark' ? 'text-amber-400' : 'text-amber-600'}`}>{device.count}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Estimates & Quotations */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className={`rounded-2xl border p-6 ${theme === 'dark' ? 'bg-gradient-to-br from-slate-800/50 to-slate-900/50 border-slate-700/50' : 'bg-white border-slate-200 shadow-sm'}`}>
              <h3 className={`text-lg font-semibold mb-4 flex items-center gap-2 ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                <FileCheck className="w-5 h-5 text-blue-500" /> Estimates
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div className={`p-4 rounded-xl ${theme === 'dark' ? 'bg-slate-700/30' : 'bg-slate-50'}`}>
                  <p className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>{estimatesStats.estimates.total}</p>
                  <p className={`text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>Total</p>
                </div>
                <div className={`p-4 rounded-xl ${theme === 'dark' ? 'bg-emerald-500/10' : 'bg-emerald-50'}`}>
                  <p className="text-2xl font-bold text-emerald-500">{estimatesStats.estimates.accepted}</p>
                  <p className={`text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>Accepted</p>
                </div>
                <div className={`p-4 rounded-xl ${theme === 'dark' ? 'bg-amber-500/10' : 'bg-amber-50'}`}>
                  <p className="text-2xl font-bold text-amber-500">{estimatesStats.estimates.pending}</p>
                  <p className={`text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>Pending</p>
                </div>
                <div className={`p-4 rounded-xl ${theme === 'dark' ? 'bg-blue-500/10' : 'bg-blue-50'}`}>
                  <p className="text-2xl font-bold text-blue-500">{estimatesStats.estimates.conversionRate}%</p>
                  <p className={`text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>Conversion Rate</p>
                </div>
              </div>
            </div>

            <div className={`rounded-2xl border p-6 ${theme === 'dark' ? 'bg-gradient-to-br from-slate-800/50 to-slate-900/50 border-slate-700/50' : 'bg-white border-slate-200 shadow-sm'}`}>
              <h3 className={`text-lg font-semibold mb-4 flex items-center gap-2 ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                <ClipboardList className="w-5 h-5 text-purple-500" /> Quotations
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div className={`p-4 rounded-xl ${theme === 'dark' ? 'bg-slate-700/30' : 'bg-slate-50'}`}>
                  <p className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>{estimatesStats.quotations.total}</p>
                  <p className={`text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>Total</p>
                </div>
                <div className={`p-4 rounded-xl ${theme === 'dark' ? 'bg-emerald-500/10' : 'bg-emerald-50'}`}>
                  <p className="text-2xl font-bold text-emerald-500">{estimatesStats.quotations.accepted}</p>
                  <p className={`text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>Accepted</p>
                </div>
                <div className={`p-4 rounded-xl ${theme === 'dark' ? 'bg-amber-500/10' : 'bg-amber-50'}`}>
                  <p className="text-2xl font-bold text-amber-500">{estimatesStats.quotations.pending}</p>
                  <p className={`text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>Pending</p>
                </div>
                <div className={`p-4 rounded-xl ${theme === 'dark' ? 'bg-purple-500/10' : 'bg-purple-50'}`}>
                  <p className="text-2xl font-bold text-purple-500">{estimatesStats.quotations.conversionRate}%</p>
                  <p className={`text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>Conversion Rate</p>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* ==================== CASH FLOW TAB CONTENT ==================== */}
      {activeTab === 'cashflow' && (
        <>
          {/* Cash Flow Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
            {[
              { label: 'Total Balance', value: formatCurrency(cashFlowStats.totalBalance), icon: Wallet, gradient: 'from-cyan-500 to-blue-600', bgGradient: 'from-cyan-500/20 to-blue-500/10' },
              { label: 'Total Income', value: formatCurrency(cashFlowStats.totalIncome), icon: ArrowUpRight, gradient: 'from-emerald-500 to-teal-600', bgGradient: 'from-emerald-500/20 to-teal-500/10' },
              { label: 'Total Expense', value: formatCurrency(cashFlowStats.totalExpense), icon: ArrowDownRight, gradient: 'from-red-500 to-rose-600', bgGradient: 'from-red-500/20 to-rose-500/10' },
              { label: 'Net Cash Flow', value: formatCurrency(cashFlowStats.netCashFlow), icon: Activity, gradient: cashFlowStats.netCashFlow >= 0 ? 'from-emerald-500 to-teal-600' : 'from-red-500 to-rose-600', bgGradient: cashFlowStats.netCashFlow >= 0 ? 'from-emerald-500/20 to-teal-500/10' : 'from-red-500/20 to-rose-500/10' },
            ].map((stat) => {
              const Icon = stat.icon;
              return (
                <div key={stat.label} className={`relative overflow-hidden rounded-2xl border p-6 ${
                  theme === 'dark' ? 'bg-gradient-to-br from-slate-800/50 to-slate-900/50 border-slate-700/50' : 'bg-white border-slate-200 shadow-sm'
                }`}>
                  <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br ${stat.bgGradient} rounded-full blur-3xl`} />
                  <div className="relative">
                    <div className={`p-3 rounded-xl bg-gradient-to-br ${stat.gradient} shadow-lg w-fit mb-4`}>
                      <Icon className="w-5 h-5 text-white" />
                    </div>
                    <p className={`text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>{stat.label}</p>
                    <p className={`text-2xl font-bold mt-1 ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>{stat.value}</p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Accounts & Expenses */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className={`rounded-2xl border p-6 ${theme === 'dark' ? 'bg-gradient-to-br from-slate-800/50 to-slate-900/50 border-slate-700/50' : 'bg-white border-slate-200 shadow-sm'}`}>
              <h3 className={`text-lg font-semibold mb-4 ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>Account Balances</h3>
              <div className="space-y-3">
                {cashFlowStats.accounts.slice(0, 6).map((account) => (
                  <div key={account.name} className={`flex items-center justify-between p-3 rounded-xl ${theme === 'dark' ? 'bg-slate-700/30' : 'bg-slate-50'}`}>
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${theme === 'dark' ? 'bg-cyan-500/20' : 'bg-cyan-100'}`}>
                        <Wallet className="w-4 h-4 text-cyan-500" />
                      </div>
                      <div>
                        <p className={`text-sm font-medium ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>{account.name}</p>
                        <p className={`text-xs capitalize ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>{account.type.replace('_', ' ')}</p>
                      </div>
                    </div>
                    <p className={`text-sm font-semibold ${account.balance >= 0 ? (theme === 'dark' ? 'text-emerald-400' : 'text-emerald-600') : (theme === 'dark' ? 'text-red-400' : 'text-red-600')}`}>
                      {formatCompactCurrency(account.balance)}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <div className={`rounded-2xl border p-6 ${theme === 'dark' ? 'bg-gradient-to-br from-slate-800/50 to-slate-900/50 border-slate-700/50' : 'bg-white border-slate-200 shadow-sm'}`}>
              <h3 className={`text-lg font-semibold mb-4 ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>Expense Categories</h3>
              <div className="space-y-3">
                {cashFlowStats.expenseCategories.map((cat, index) => {
                  const colors = ['red', 'orange', 'amber', 'yellow', 'lime', 'green'];
                  const color = colors[index % colors.length];
                  return (
                    <div key={cat.name} className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span className={theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}>{cat.name}</span>
                        <span className={`text-${color}-500 font-medium`}>{formatCompactCurrency(cat.amount)}</span>
                      </div>
                      <div className={`h-2 rounded-full overflow-hidden ${theme === 'dark' ? 'bg-slate-700' : 'bg-slate-200'}`}>
                        <div className={`h-full rounded-full bg-${color}-500`} style={{ width: `${(cat.amount / (cashFlowStats.expenseCategories[0]?.amount || 1)) * 100}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </>
      )}

      {/* ==================== CUSTOMERS TAB CONTENT ==================== */}
      {activeTab === 'customers' && (
        <>
          {/* Customer Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
            {[
              { label: 'Total Customers', value: customerCreditStats.totalCustomers.toString(), icon: Users, gradient: 'from-pink-500 to-rose-600', bgGradient: 'from-pink-500/20 to-rose-500/10' },
              { label: 'With Credit Balance', value: customerCreditStats.withCredit.toString(), icon: CreditCard, gradient: 'from-amber-500 to-orange-600', bgGradient: 'from-amber-500/20 to-orange-500/10' },
              { label: 'Total Outstanding', value: formatCurrency(customerCreditStats.totalOutstanding), icon: BadgeDollarSign, gradient: 'from-blue-500 to-cyan-600', bgGradient: 'from-blue-500/20 to-cyan-500/10' },
              { label: 'Overdue Amount', value: formatCurrency(customerCreditStats.overdueAmount), icon: AlertCircle, gradient: 'from-red-500 to-rose-600', bgGradient: 'from-red-500/20 to-rose-500/10' },
            ].map((stat) => {
              const Icon = stat.icon;
              return (
                <div key={stat.label} className={`relative overflow-hidden rounded-2xl border p-6 ${
                  theme === 'dark' ? 'bg-gradient-to-br from-slate-800/50 to-slate-900/50 border-slate-700/50' : 'bg-white border-slate-200 shadow-sm'
                }`}>
                  <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br ${stat.bgGradient} rounded-full blur-3xl`} />
                  <div className="relative">
                    <div className={`p-3 rounded-xl bg-gradient-to-br ${stat.gradient} shadow-lg w-fit mb-4`}>
                      <Icon className="w-5 h-5 text-white" />
                    </div>
                    <p className={`text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>{stat.label}</p>
                    <p className={`text-2xl font-bold mt-1 ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>{stat.value}</p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Credit Status & Top Debtors */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className={`rounded-2xl border p-6 ${theme === 'dark' ? 'bg-gradient-to-br from-slate-800/50 to-slate-900/50 border-slate-700/50' : 'bg-white border-slate-200 shadow-sm'}`}>
              <h3 className={`text-lg font-semibold mb-4 ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>Credit Status Breakdown</h3>
              <div className="grid grid-cols-3 gap-4">
                <div className={`p-4 rounded-xl text-center ${theme === 'dark' ? 'bg-emerald-500/10' : 'bg-emerald-50'}`}>
                  <UserCheck className="w-6 h-6 mx-auto mb-2 text-emerald-500" />
                  <p className="text-2xl font-bold text-emerald-500">{customerCreditStats.clearCredit}</p>
                  <p className={`text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>Clear</p>
                </div>
                <div className={`p-4 rounded-xl text-center ${theme === 'dark' ? 'bg-amber-500/10' : 'bg-amber-50'}`}>
                  <Clock className="w-6 h-6 mx-auto mb-2 text-amber-500" />
                  <p className="text-2xl font-bold text-amber-500">{customerCreditStats.activeCredit}</p>
                  <p className={`text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>Active</p>
                </div>
                <div className={`p-4 rounded-xl text-center ${theme === 'dark' ? 'bg-red-500/10' : 'bg-red-50'}`}>
                  <AlertCircle className="w-6 h-6 mx-auto mb-2 text-red-500" />
                  <p className="text-2xl font-bold text-red-500">{customerCreditStats.overdueCustomers}</p>
                  <p className={`text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>Overdue</p>
                </div>
              </div>
            </div>

            <div className={`rounded-2xl border p-6 ${theme === 'dark' ? 'bg-gradient-to-br from-slate-800/50 to-slate-900/50 border-slate-700/50' : 'bg-white border-slate-200 shadow-sm'}`}>
              <h3 className={`text-lg font-semibold mb-4 ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>Top Outstanding Balances</h3>
              <div className="space-y-3">
                {customerCreditStats.topDebtors.map((debtor, index) => (
                  <div key={index} className={`flex items-center gap-3 p-2 rounded-lg ${theme === 'dark' ? 'hover:bg-slate-700/30' : 'hover:bg-slate-50'}`}>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                      debtor.status === 'overdue' ? 'bg-red-500/20 text-red-500' : 'bg-amber-500/20 text-amber-500'
                    }`}>{debtor.name.charAt(0)}</div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium truncate ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>{debtor.name}</p>
                      <p className={`text-xs capitalize ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>{debtor.status}</p>
                    </div>
                    <p className={`text-sm font-semibold ${debtor.status === 'overdue' ? 'text-red-500' : 'text-amber-500'}`}>{formatCompactCurrency(debtor.balance)}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}

      {/* ==================== SUPPLIERS TAB CONTENT ==================== */}
      {activeTab === 'suppliers' && (
        <>
          {/* Supplier Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
            {[
              { label: 'Total Suppliers', value: supplierStats.totalSuppliers.toString(), icon: Building2, gradient: 'from-orange-500 to-red-600', bgGradient: 'from-orange-500/20 to-red-500/10' },
              { label: 'Active Suppliers', value: supplierStats.activeSuppliers.toString(), icon: CheckCircle2, gradient: 'from-emerald-500 to-teal-600', bgGradient: 'from-emerald-500/20 to-teal-500/10' },
              { label: 'Total Purchases', value: formatCurrency(supplierStats.totalPurchases), icon: ShoppingCart, gradient: 'from-blue-500 to-cyan-600', bgGradient: 'from-blue-500/20 to-cyan-500/10' },
              { label: 'Total Payables', value: formatCurrency(supplierStats.totalPayables), icon: Wallet, gradient: 'from-amber-500 to-orange-600', bgGradient: 'from-amber-500/20 to-orange-500/10' },
            ].map((stat) => {
              const Icon = stat.icon;
              return (
                <div key={stat.label} className={`relative overflow-hidden rounded-2xl border p-6 ${
                  theme === 'dark' ? 'bg-gradient-to-br from-slate-800/50 to-slate-900/50 border-slate-700/50' : 'bg-white border-slate-200 shadow-sm'
                }`}>
                  <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br ${stat.bgGradient} rounded-full blur-3xl`} />
                  <div className="relative">
                    <div className={`p-3 rounded-xl bg-gradient-to-br ${stat.gradient} shadow-lg w-fit mb-4`}>
                      <Icon className="w-5 h-5 text-white" />
                    </div>
                    <p className={`text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>{stat.label}</p>
                    <p className={`text-2xl font-bold mt-1 ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>{stat.value}</p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Top Suppliers & Payables */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className={`rounded-2xl border p-6 ${theme === 'dark' ? 'bg-gradient-to-br from-slate-800/50 to-slate-900/50 border-slate-700/50' : 'bg-white border-slate-200 shadow-sm'}`}>
              <h3 className={`text-lg font-semibold mb-4 ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>Top Suppliers by Purchase</h3>
              <div className="space-y-3">
                {supplierStats.topSuppliersByPurchase.map((supplier, index) => (
                  <div key={supplier.name} className={`flex items-center gap-3 p-2 rounded-lg ${theme === 'dark' ? 'hover:bg-slate-700/30' : 'hover:bg-slate-50'}`}>
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm ${
                      index === 0 ? 'bg-gradient-to-br from-amber-400 to-amber-600 text-white' :
                      index === 1 ? 'bg-gradient-to-br from-slate-300 to-slate-400 text-white' :
                      index === 2 ? 'bg-gradient-to-br from-orange-400 to-orange-600 text-white' :
                      theme === 'dark' ? 'bg-slate-700 text-slate-300' : 'bg-slate-200 text-slate-600'
                    }`}>{index + 1}</div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium truncate ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>{supplier.name}</p>
                      <p className={`text-xs ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>{supplier.orders} orders</p>
                    </div>
                    <p className={`text-sm font-semibold ${theme === 'dark' ? 'text-orange-400' : 'text-orange-600'}`}>{formatCompactCurrency(supplier.purchases)}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className={`rounded-2xl border p-6 ${theme === 'dark' ? 'bg-gradient-to-br from-slate-800/50 to-slate-900/50 border-slate-700/50' : 'bg-white border-slate-200 shadow-sm'}`}>
              <h3 className={`text-lg font-semibold mb-4 flex items-center gap-2 ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                <AlertCircle className="w-5 h-5 text-amber-500" /> Outstanding Payables
              </h3>
              {supplierStats.suppliersWithPayables.length > 0 ? (
                <div className="space-y-3">
                  {supplierStats.suppliersWithPayables.map((supplier, index) => (
                    <div key={index} className={`flex items-center justify-between p-3 rounded-xl ${theme === 'dark' ? 'bg-slate-700/30' : 'bg-slate-50'}`}>
                      <div>
                        <p className={`text-sm font-medium ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>{supplier.name}</p>
                        <p className={`text-xs ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>{supplier.terms}</p>
                      </div>
                      <p className="text-sm font-semibold text-amber-500">{formatCompactCurrency(supplier.payable)}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className={`text-center py-8 ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>
                  <ShieldCheck className="w-12 h-12 mx-auto mb-2 text-emerald-500" />
                  <p>No outstanding payables!</p>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};
