import React, { useMemo, useState, useRef, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTheme } from '../contexts/ThemeContext';
import { useWhatsAppSettings } from '../contexts/WhatsAppSettingsContext';
import { useDataCache } from '../contexts/DataCacheContext';
import { toast } from 'sonner';
import type { Invoice, InvoicePayment, Customer } from '../data/mockData';
import PrintableInvoice from '../components/PrintableInvoice';
import { InvoicePaymentModal } from '../components/modals/InvoicePaymentModal';
import {
  invoiceService,
  convertAPIInvoiceToFrontend,
  denormalizePaymentMethod,
} from '../services/invoiceService';
import {
  FileText, ArrowLeft, Printer, Edit3, User, Phone,
  Package, CheckCircle, Clock,
  XCircle, Mail, MapPin,
  Copy, Download, Share2, MoreVertical, TrendingUp, Monitor, X, CircleDollarSign,
  AlertTriangle, Store, Globe, Shield, MessageCircle, Wallet
} from 'lucide-react';

export const ViewInvoice: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { theme } = useTheme();
  const { settings: whatsAppSettings } = useWhatsAppSettings();
  const { customers: cachedCustomers, loadCustomers, products: cachedProducts } = useDataCache();
  
  const [showActions, setShowActions] = useState(false);
  const [showPrintPreview, setShowPrintPreview] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const printRef = useRef<HTMLDivElement>(null);
  
  // API states
  const [isLoading, setIsLoading] = useState(true);
  const [isUsingAPI, setIsUsingAPI] = useState(false);
  const [apiInvoiceId, setApiInvoiceId] = useState<string | null>(null); // Store actual API ID

  // Fetch invoice from API
  const fetchInvoice = useCallback(async () => {
    if (!id) return;
    
    setIsLoading(true);
    try {
      // First try to fetch by invoice number (the id param is usually the invoice number)
      const [{ invoices: apiInvoices }, loadedCustomers] = await Promise.all([
        invoiceService.getAll({ search: id, limit: 1 }),
        loadCustomers()
      ]);
      
      setCustomers(loadedCustomers);
      
      if (apiInvoices.length > 0) {
        const apiInvoice = apiInvoices[0];
        const convertedInvoice = convertAPIInvoiceToFrontend(apiInvoice);
        setInvoices([convertedInvoice]);
        setApiInvoiceId(apiInvoice.id); // Store actual API ID
        setIsUsingAPI(true);
        console.log('✅ Loaded invoice from API:', convertedInvoice.id);
      } else {
        // Invoice not found
        setIsUsingAPI(false);
        console.log('⚠️ Invoice not found in API');
      }
    } catch (error) {
      console.warn('⚠️ API not available:', error);
      setIsUsingAPI(false);
    } finally {
      setIsLoading(false);
    }
  }, [id, loadCustomers]);

  useEffect(() => {
    fetchInvoice();
  }, [fetchInvoice]);
  
  // Sync with cached customers
  useEffect(() => {
    if (cachedCustomers.length > 0) {
      setCustomers(cachedCustomers);
    }
  }, [cachedCustomers]);

  // Find the invoice
  const invoice = useMemo(() => {
    return invoices.find(inv => inv.id === id) || null;
  }, [id, invoices]);

  // Find the customer
  const customer = useMemo(() => {
    if (!invoice) return null;
    if (invoice.customerId === 'walk-in') {
      return {
        id: 'walk-in',
        name: 'Walk-in Customer',
        email: '',
        phone: '',
        totalSpent: 0,
        totalOrders: 0,
        creditBalance: 0,
        creditLimit: 0,
        creditStatus: 'clear' as const
      };
    }
    // Try to find from cached customers first, then from invoice's embedded customer data
    const cachedCustomer = customers.find(c => c.id === invoice.customerId);
    if (cachedCustomer) return cachedCustomer;
    
    // Fallback to invoice's embedded customer data if available
    const invoiceWithCustomer = invoice as Invoice & { customer?: { id: string; name: string; email?: string; phone?: string } };
    if (invoiceWithCustomer.customer) {
      return {
        id: invoiceWithCustomer.customer.id,
        name: invoiceWithCustomer.customer.name,
        email: invoiceWithCustomer.customer.email || '',
        phone: invoiceWithCustomer.customer.phone || '',
        totalSpent: 0,
        totalOrders: 0,
        creditBalance: 0,
        creditLimit: 0,
        creditStatus: 'clear' as const
      };
    }
    return null;
  }, [invoice, customers]);

  // Get product details for items
  const getProductDetails = (productId: string) => {
    return cachedProducts.find(p => p.id === productId);
  };
  
  // Check warranty status
  const getWarrantyStatus = (warrantyDueDate?: string) => {
    if (!warrantyDueDate) return null;
    const today = new Date();
    const dueDate = new Date(warrantyDueDate);
    const daysRemaining = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysRemaining < 0) {
      return { status: 'expired', message: `Warranty expired ${Math.abs(daysRemaining)} days ago`, color: 'red' };
    } else if (daysRemaining <= 30) {
      return { status: 'expiring', message: `Warranty expires in ${daysRemaining} days`, color: 'amber' };
    } else {
      return { status: 'active', message: `Warranty valid until ${dueDate.toLocaleDateString('en-GB')}`, color: 'emerald' };
    }
  };
  
  // Check if any items have expired or expiring warranty
  const warrantyAlerts = useMemo(() => {
    if (!invoice) return [];
    return invoice.items
      .map(item => {
        const warrantyStatus = getWarrantyStatus(item.warrantyDueDate);
        if (warrantyStatus && (warrantyStatus.status === 'expired' || warrantyStatus.status === 'expiring')) {
          return { ...item, warrantyStatus };
        }
        return null;
      })
      .filter(Boolean);
  }, [invoice]);

  const handleCopyInvoiceNumber = () => {
    if (invoice) {
      navigator.clipboard.writeText(invoice.id);
    }
  };

  const handlePrint = () => {
    setShowPrintPreview(true);
  };

  const handleActualPrint = () => {
    window.print();
  };

  // WhatsApp payment reminder function
  const sendWhatsAppReminder = () => {
    if (!invoice || !customer?.phone) {
      toast.error('Customer phone number not found! Please add a phone number to the customer profile.');
      return;
    }

    // Check if WhatsApp reminders are enabled
    if (!whatsAppSettings.enabled) {
      toast.error('WhatsApp reminders are disabled. Enable them in Settings.');
      return;
    }

    // Calculate amounts
    const dueAmount = invoice.total - (invoice.paidAmount || 0);
    const dueDate = new Date(invoice.dueDate);
    const today = new Date();
    const isOverdue = dueDate < today && invoice.status !== 'fullpaid';
    const daysOverdue = isOverdue ? Math.floor((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24)) : 0;

    // Choose template based on overdue status - USE CONTEXT SETTINGS
    let message = isOverdue 
      ? whatsAppSettings.overdueReminderTemplate 
      : whatsAppSettings.paymentReminderTemplate;

    // Replace placeholders
    message = message
      .replace(/\{\{customerName\}\}/g, invoice.customerName)
      .replace(/\{\{invoiceId\}\}/g, invoice.id)
      .replace(/\{\{totalAmount\}\}/g, invoice.total.toLocaleString())
      .replace(/\{\{paidAmount\}\}/g, (invoice.paidAmount || 0).toLocaleString())
      .replace(/\{\{dueAmount\}\}/g, dueAmount.toLocaleString())
      .replace(/\{\{dueDate\}\}/g, dueDate.toLocaleDateString('en-GB'))
      .replace(/\{\{daysOverdue\}\}/g, daysOverdue.toString());

    // Format phone number (remove dashes and ensure country code)
    let phone = customer.phone.replace(/[-\s]/g, '');
    if (phone.startsWith('0')) {
      phone = '94' + phone.substring(1);
    }
    if (!phone.startsWith('94') && !phone.startsWith('+94')) {
      phone = '94' + phone;
    }
    phone = phone.replace('+', '');

    // Open WhatsApp with the message using wa.me format
    const whatsappUrl = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
    
    toast.success('WhatsApp reminder opened', {
      description: `Reminder for invoice #${invoice.id} prepared for ${invoice.customerName}`,
    });
  };

  // Handle payment for invoice
  const handlePayment = async (invoiceId: string, amount: number, paymentMethod: string, notes?: string, paymentDateTime?: string) => {
    const paymentDate = paymentDateTime || new Date().toISOString();
    
    // If using API, add payment via API
    if (isUsingAPI && apiInvoiceId) {
      try {
        const { invoice: updatedInvoice } = await invoiceService.addPayment(apiInvoiceId, {
          amount,
          paymentMethod: denormalizePaymentMethod(paymentMethod),
          notes,
          paymentDate,
        });
        
        // Convert and update local state - this updates the invoice prop for the modal
        const convertedInvoice = convertAPIInvoiceToFrontend(updatedInvoice);
        setInvoices([convertedInvoice]);
        
        toast.success('Payment recorded successfully', {
          description: `Rs. ${amount.toLocaleString()} payment added to invoice #${invoiceId}.`,
        });
        console.log('✅ Payment recorded via API');
        // Don't close modal here - let success animation play
        return;
      } catch (error) {
        console.error('❌ Failed to record payment via API:', error);
        toast.error('Failed to record payment', {
          description: error instanceof Error ? error.message : 'Please try again.',
        });
        throw error;
      }
    }

    // Local update (fallback or when not using API)
    setInvoices(prevInvoices => 
      prevInvoices.map(inv => {
        if (inv.id === invoiceId) {
          const newPaidAmount = (inv.paidAmount || 0) + amount;
          const newPayment: InvoicePayment = {
            id: `pay-${Date.now()}`,
            invoiceId: invoiceId,
            amount: amount,
            paymentDate: paymentDate,
            paymentMethod: paymentMethod as 'cash' | 'card' | 'bank' | 'cheque',
            notes: notes
          };
          
          // Determine new status
          let newStatus: 'unpaid' | 'fullpaid' | 'halfpay' = 'halfpay';
          if (newPaidAmount >= inv.total) {
            newStatus = 'fullpaid';
          } else if (newPaidAmount <= 0) {
            newStatus = 'unpaid';
          }
          
          return {
            ...inv,
            paidAmount: Math.min(newPaidAmount, inv.total),
            status: newStatus,
            payments: [...(inv.payments || []), newPayment],
            lastPaymentDate: new Date().toISOString()
          };
        }
        return inv;
      })
    );
    toast.success('Payment recorded locally', {
      description: `Rs. ${amount.toLocaleString()} payment added to invoice #${invoiceId}.`,
    });
    setShowPaymentModal(false);
  };

  // Format currency
  const formatCurrency = (amount: number) => `Rs. ${amount.toLocaleString('en-LK')}`;

  // Check if invoice needs reminder
  const needsReminder = invoice && invoice.status !== 'fullpaid';
  const isInvoiceOverdue = invoice && new Date(invoice.dueDate) < new Date() && invoice.status !== 'fullpaid';

  // Loading state
  if (isLoading) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${
        theme === 'dark' ? 'bg-slate-900' : 'bg-slate-50'
      }`}>
        <div className="text-center">
          <div className={`w-16 h-16 mx-auto mb-4 ${theme === 'dark' ? 'text-emerald-400' : 'text-emerald-500'}`}>
            <svg className="animate-spin" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          </div>
          <p className={theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}>Loading invoice...</p>
        </div>
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${
        theme === 'dark' ? 'bg-slate-900' : 'bg-slate-50'
      }`}>
        <div className="text-center">
          <div className={`w-20 h-20 mx-auto mb-4 rounded-full flex items-center justify-center ${
            theme === 'dark' ? 'bg-red-500/20' : 'bg-red-100'
          }`}>
            <XCircle className="w-10 h-10 text-red-500" />
          </div>
          <h2 className={`text-2xl font-bold mb-2 ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
            Invoice Not Found
          </h2>
          <p className={`mb-6 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
            The invoice you're looking for doesn't exist or has been deleted.
          </p>
          <button
            onClick={() => navigate('/invoices')}
            className="px-6 py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-medium transition-all"
          >
            Back to Invoices
          </button>
        </div>
      </div>
    );
  }

  const statusConfig = {
    fullpaid: { 
      label: 'Full Paid', 
      icon: CheckCircle, 
      color: 'emerald',
      bgClass: 'bg-emerald-500/10 border-emerald-500/30',
      textClass: 'text-emerald-400'
    },
    halfpay: { 
      label: 'Half Pay', 
      icon: CircleDollarSign, 
      color: 'amber',
      bgClass: 'bg-amber-500/10 border-amber-500/30',
      textClass: 'text-amber-400'
    },
    unpaid: { 
      label: 'Unpaid', 
      icon: XCircle, 
      color: 'red',
      bgClass: 'bg-red-500/10 border-red-500/30',
      textClass: 'text-red-400'
    },
  };

  const status = statusConfig[invoice.status];
  const StatusIcon = status.icon;

  return (
    <div className={`min-h-screen p-6 ${theme === 'dark' ? 'bg-slate-900' : 'bg-slate-50'}`}>
      {/* Header */}
      <div className="max-w-6xl mx-auto mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/invoices')}
              className={`p-2.5 rounded-xl border transition-all ${
                theme === 'dark'
                  ? 'border-slate-700 hover:bg-slate-800 text-slate-400'
                  : 'border-slate-200 hover:bg-slate-100 text-slate-600'
              }`}
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <div className="flex items-center gap-3">
                <h1 className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                  {invoice.id}
                </h1>
                <button
                  onClick={handleCopyInvoiceNumber}
                  className={`p-1.5 rounded-lg transition-all ${
                    theme === 'dark' ? 'hover:bg-slate-800 text-slate-500' : 'hover:bg-slate-200 text-slate-400'
                  }`}
                  title="Copy invoice number"
                >
                  <Copy className="w-4 h-4" />
                </button>
              </div>
              <p className={`text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                Created on {new Date(invoice.date).toLocaleDateString('en-GB', { 
                  weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' 
                })}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Status Badge */}
            <div className={`px-4 py-2 rounded-xl border ${status.bgClass}`}>
              <div className="flex items-center gap-2">
                <StatusIcon className={`w-4 h-4 ${status.textClass}`} />
                <span className={`font-semibold ${status.textClass}`}>{status.label}</span>
              </div>
            </div>

            {/* Action Buttons */}
            <button
              onClick={handlePrint}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium transition-all ${
                theme === 'dark'
                  ? 'bg-slate-800 hover:bg-slate-700 text-white border border-slate-700'
                  : 'bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 shadow-sm'
              }`}
            >
              <Printer className="w-4 h-4" />
              Print
            </button>

            <button
              onClick={() => navigate(`/invoices/${id}/edit`)}
              className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white rounded-xl font-medium transition-all shadow-lg shadow-emerald-500/20"
            >
              <Edit3 className="w-4 h-4" />
              Edit Invoice
            </button>

            {/* WhatsApp Reminder Button - Only show when enabled in settings */}
            {needsReminder && whatsAppSettings.enabled && (
              <button
                onClick={sendWhatsAppReminder}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium transition-all shadow-lg ${
                  isInvoiceOverdue
                    ? 'bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 text-white shadow-red-500/20'
                    : 'bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white shadow-green-500/20'
                }`}
                title={isInvoiceOverdue ? 'Send Overdue Reminder via WhatsApp' : 'Send Payment Reminder via WhatsApp'}
              >
                <MessageCircle className="w-4 h-4" />
                {isInvoiceOverdue ? 'Overdue Reminder' : 'WhatsApp Reminder'}
              </button>
            )}

            {/* More Actions */}
            <div className="relative">
              <button
                onClick={() => setShowActions(!showActions)}
                className={`p-2.5 rounded-xl border transition-all ${
                  theme === 'dark'
                    ? 'border-slate-700 hover:bg-slate-800 text-slate-400'
                    : 'border-slate-200 hover:bg-slate-100 text-slate-600'
                }`}
              >
                <MoreVertical className="w-5 h-5" />
              </button>
              {showActions && (
                <div className={`absolute right-0 mt-2 w-48 rounded-xl border shadow-xl z-10 ${
                  theme === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'
                }`}>
                  <button className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-all ${
                    theme === 'dark' ? 'hover:bg-slate-700 text-slate-300' : 'hover:bg-slate-50 text-slate-700'
                  }`}>
                    <Download className="w-4 h-4" /> Download PDF
                  </button>
                  <button className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-all ${
                    theme === 'dark' ? 'hover:bg-slate-700 text-slate-300' : 'hover:bg-slate-50 text-slate-700'
                  }`}>
                    <Share2 className="w-4 h-4" /> Share Invoice
                  </button>
                  <button className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-all ${
                    theme === 'dark' ? 'hover:bg-slate-700 text-slate-300' : 'hover:bg-slate-50 text-slate-700'
                  }`}>
                    <Copy className="w-4 h-4" /> Duplicate
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Main Invoice Preview */}
        <div className="xl:col-span-2">
          <div className={`rounded-2xl overflow-hidden shadow-2xl ${
            theme === 'dark' ? 'shadow-black/50' : 'shadow-slate-300/50'
          }`}>
            {/* Invoice Header */}
            <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 p-8 text-white">
              <div className="flex justify-between items-start">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <Monitor className="w-8 h-8" />
                    <h2 className="text-3xl font-bold tracking-tight">ECOTEC</h2>
                  </div>
                  <p className="text-emerald-200 text-sm mt-1 tracking-widest">COMPUTER SOLUTIONS</p>
                  <div className="mt-4 text-emerald-100 text-sm space-y-1">
                    <p className="flex items-center gap-2"><MapPin className="w-4 h-4" /> Main Street, Colombo 03</p>
                    <p className="flex items-center gap-2"><Phone className="w-4 h-4" /> 011-2345678 • 077-1234567</p>
                    <p className="flex items-center gap-2"><Mail className="w-4 h-4" /> info@ecotec.lk</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-4xl font-bold tracking-wider">INVOICE</p>
                  <p className="text-emerald-200 text-lg mt-2">{invoice.id}</p>
                  <div className={`inline-flex items-center gap-2 mt-3 px-4 py-2 rounded-full ${
                    invoice.status === 'fullpaid' ? 'bg-emerald-500' :
                    invoice.status === 'halfpay' ? 'bg-amber-500' : 'bg-red-500'
                  }`}>
                    <StatusIcon className="w-4 h-4" />
                    <span className="font-semibold">{status.label.toUpperCase()}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Invoice Body */}
            <div className={`p-8 ${theme === 'dark' ? 'bg-slate-900' : 'bg-white'}`}>
              {/* Customer & Date Row */}
              <div className="grid grid-cols-2 gap-6 mb-6">
                <div className={`p-5 rounded-xl border-l-4 border-emerald-500 ${
                  theme === 'dark' ? 'bg-slate-800/50' : 'bg-slate-50'
                }`}>
                  <p className={`text-xs font-bold uppercase tracking-wider mb-2 ${
                    theme === 'dark' ? 'text-emerald-400' : 'text-emerald-600'
                  }`}>Bill To</p>
                  <p className={`text-lg font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                    {invoice.customerName}
                  </p>
                  {customer && customer.id !== 'walk-in' && (
                    <>
                      <p className={`text-sm ${theme === 'dark' ? 'text-slate-500' : 'text-slate-500'}`}>
                        📞 {customer.phone}
                      </p>
                      <p className={`text-sm ${theme === 'dark' ? 'text-slate-500' : 'text-slate-500'}`}>
                        ✉️ {customer.email}
                      </p>
                    </>
                  )}
                </div>

                <div className={`p-5 rounded-xl border-l-4 border-teal-500 ${
                  theme === 'dark' ? 'bg-slate-800/50' : 'bg-slate-50'
                }`}>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className={`text-xs font-bold uppercase tracking-wider mb-1 ${
                        theme === 'dark' ? 'text-teal-400' : 'text-teal-600'
                      }`}>Issue Date</p>
                      <p className={`font-semibold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                        {new Date(invoice.date).toLocaleDateString('en-GB', { 
                          day: '2-digit', month: 'short', year: 'numeric' 
                        })}
                      </p>
                    </div>
                    <div>
                      <p className={`text-xs font-bold uppercase tracking-wider mb-1 ${
                        theme === 'dark' ? 'text-teal-400' : 'text-teal-600'
                      }`}>Due Date</p>
                      <p className={`font-semibold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                        {new Date(invoice.dueDate).toLocaleDateString('en-GB', { 
                          day: '2-digit', month: 'short', year: 'numeric' 
                        })}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Payment Method & Sales Channel */}
              <div className="grid grid-cols-2 gap-6 mb-8">
                <div className={`p-4 rounded-xl flex items-center gap-3 ${
                  theme === 'dark' ? 'bg-slate-800/50' : 'bg-slate-50'
                }`}>
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                    theme === 'dark' ? 'bg-cyan-500/20' : 'bg-cyan-100'
                  }`}>
                    <CircleDollarSign className="w-5 h-5 text-cyan-500" />
                  </div>
                  <div>
                    <p className={`text-xs font-bold uppercase tracking-wider ${
                      theme === 'dark' ? 'text-slate-400' : 'text-slate-500'
                    }`}>Payment Method</p>
                    <p className={`font-semibold capitalize ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                      {invoice.paymentMethod ? invoice.paymentMethod.replace('_', ' ') : 'Cash'}
                    </p>
                  </div>
                </div>
                
                <div className={`p-4 rounded-xl flex items-center gap-3 ${
                  theme === 'dark' ? 'bg-slate-800/50' : 'bg-slate-50'
                }`}>
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                    invoice.salesChannel === 'online' 
                      ? (theme === 'dark' ? 'bg-purple-500/20' : 'bg-purple-100')
                      : (theme === 'dark' ? 'bg-amber-500/20' : 'bg-amber-100')
                  }`}>
                    {invoice.salesChannel === 'online' 
                      ? <Globe className="w-5 h-5 text-purple-500" />
                      : <Store className="w-5 h-5 text-amber-500" />
                    }
                  </div>
                  <div>
                    <p className={`text-xs font-bold uppercase tracking-wider ${
                      theme === 'dark' ? 'text-slate-400' : 'text-slate-500'
                    }`}>Sales Channel</p>
                    <p className={`font-semibold capitalize ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                      {invoice.salesChannel === 'online' ? 'Online' : 'On Site'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Warranty Alerts Banner */}
              {warrantyAlerts.length > 0 && (
                <div className={`mb-6 p-4 rounded-xl border ${
                  theme === 'dark' ? 'bg-amber-500/10 border-amber-500/30' : 'bg-amber-50 border-amber-200'
                }`}>
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <h4 className={`font-semibold mb-2 ${theme === 'dark' ? 'text-amber-400' : 'text-amber-700'}`}>
                        Warranty Alerts
                      </h4>
                      <div className="space-y-1">
                        {warrantyAlerts.map((item: any) => (
                          <div key={item.productId} className="flex items-center gap-2 text-sm">
                            <Shield className={`w-4 h-4 ${item.warrantyStatus.color === 'red' ? 'text-red-500' : 'text-amber-500'}`} />
                            <span className={theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}>
                              <strong>{item.productName}</strong>: {item.warrantyStatus.message}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Items Table */}
              <div className="mb-8">
                <div className={`rounded-xl overflow-hidden border ${
                  theme === 'dark' ? 'border-slate-700' : 'border-slate-200'
                }`}>
                  <table className="w-full">
                    <thead>
                      <tr className={theme === 'dark' ? 'bg-slate-800' : 'bg-slate-100'}>
                        <th className={`py-4 px-4 text-left text-xs font-bold uppercase tracking-wider ${
                          theme === 'dark' ? 'text-slate-400' : 'text-slate-500'
                        }`}>#</th>
                        <th className={`py-4 px-4 text-left text-xs font-bold uppercase tracking-wider ${
                          theme === 'dark' ? 'text-slate-400' : 'text-slate-500'
                        }`}>Item Description</th>
                        <th className={`py-4 px-4 text-center text-xs font-bold uppercase tracking-wider ${
                          theme === 'dark' ? 'text-slate-400' : 'text-slate-500'
                        }`}>Qty</th>
                        <th className={`py-4 px-4 text-right text-xs font-bold uppercase tracking-wider ${
                          theme === 'dark' ? 'text-slate-400' : 'text-slate-500'
                        }`}>Unit Price</th>
                        <th className={`py-4 px-4 text-right text-xs font-bold uppercase tracking-wider ${
                          theme === 'dark' ? 'text-slate-400' : 'text-slate-500'
                        }`}>Total</th>
                      </tr>
                    </thead>
                    <tbody className={`divide-y ${theme === 'dark' ? 'divide-slate-700' : 'divide-slate-200'}`}>
                      {invoice.items.map((item, index) => {
                        const product = getProductDetails(item.productId);
                        const warrantyStatus = getWarrantyStatus(item.warrantyDueDate);
                        return (
                          <tr key={item.productId + index} className={
                            index % 2 === 1 ? (theme === 'dark' ? 'bg-slate-800/30' : 'bg-slate-50/50') : ''
                          }>
                            <td className={`py-4 px-4 ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>
                              {index + 1}
                            </td>
                            <td className="py-4 px-4">
                              <div className="flex items-center gap-3">
                                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                                  theme === 'dark' ? 'bg-emerald-500/20' : 'bg-emerald-100'
                                }`}>
                                  <Package className="w-5 h-5 text-emerald-500" />
                                </div>
                                <div>
                                  <p className={`font-semibold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                                    {item.productName}
                                  </p>
                                  <div className="flex items-center gap-2 flex-wrap">
                                    {product && (
                                      <span className={`text-xs ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>
                                        S/N: {product.serialNumber}
                                      </span>
                                    )}
                                    {warrantyStatus && (
                                      <span className={`text-xs px-2 py-0.5 rounded-full flex items-center gap-1 ${
                                        warrantyStatus.status === 'expired' 
                                          ? 'bg-red-500/20 text-red-400'
                                          : warrantyStatus.status === 'expiring'
                                            ? 'bg-amber-500/20 text-amber-400'
                                            : 'bg-emerald-500/20 text-emerald-400'
                                      }`}>
                                        <Shield className="w-3 h-3" />
                                        {warrantyStatus.status === 'expired' ? 'Expired' : 
                                         warrantyStatus.status === 'expiring' ? 'Expiring Soon' : 'Active'}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className={`py-4 px-4 text-center font-medium ${
                              theme === 'dark' ? 'text-slate-300' : 'text-slate-700'
                            }`}>
                              {item.quantity}
                            </td>
                            <td className={`py-4 px-4 text-right font-mono ${
                              theme === 'dark' ? 'text-slate-400' : 'text-slate-600'
                            }`}>
                              {item.originalPrice && item.originalPrice !== item.unitPrice ? (
                                <div className="flex flex-col items-end">
                                  <span className="line-through text-red-400 text-xs">
                                    Rs. {item.originalPrice.toLocaleString()}
                                  </span>
                                  <span className="text-emerald-400">
                                    Rs. {item.unitPrice.toLocaleString()}
                                  </span>
                                </div>
                              ) : (
                                <>Rs. {item.unitPrice.toLocaleString()}</>
                              )}
                            </td>
                            <td className={`py-4 px-4 text-right font-mono font-bold ${
                              theme === 'dark' ? 'text-white' : 'text-slate-900'
                            }`}>
                              Rs. {item.total.toLocaleString()}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Totals */}
              <div className="flex justify-end">
                <div className="w-80">
                  <div className={`space-y-3 p-5 rounded-xl ${
                    theme === 'dark' ? 'bg-slate-800/50' : 'bg-slate-50'
                  }`}>
                    <div className="flex justify-between">
                      <span className={theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}>Subtotal</span>
                      <span className={`font-mono ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                        Rs. {invoice.subtotal.toLocaleString()}
                      </span>
                    </div>
                    {invoice.tax > 0 && (
                      <div className="flex justify-between">
                        <span className={theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}>
                          Tax (15%)
                        </span>
                        <span className={`font-mono ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                          Rs. {invoice.tax.toLocaleString()}
                        </span>
                      </div>
                    )}
                    <div className={`flex justify-between pt-4 mt-2 border-t ${
                      theme === 'dark' ? 'border-slate-700' : 'border-slate-200'
                    }`}>
                      <span className={`text-lg font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                        Total
                      </span>
                      <span className="text-2xl font-bold text-emerald-500">
                        Rs. {invoice.total.toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Invoice Footer */}
            <div className={`px-8 py-6 ${
              theme === 'dark' ? 'bg-slate-800/50 border-t border-slate-700' : 'bg-slate-50 border-t border-slate-200'
            }`}>
              <p className={`text-center text-sm font-medium ${
                theme === 'dark' ? 'text-emerald-400' : 'text-emerald-600'
              }`}>
                Thank you for your business!
              </p>
              <p className={`text-center text-xs mt-1 ${theme === 'dark' ? 'text-slate-500' : 'text-slate-500'}`}>
                ECOTEC Computer Solutions • Main Street, Colombo 03 • 📞 011-2345678 / 077-1234567 • info@ecotec.lk
              </p>
              <p className={`text-center text-[10px] mt-2 ${theme === 'dark' ? 'text-slate-600' : 'text-slate-400'}`}>
                © 2025 Powered by <span className="font-semibold">ECOTEC</span>
              </p>
            </div>
          </div>
        </div>

        {/* Right Sidebar */}
        <div className="space-y-6">
          {/* Quick Stats */}
          <div className={`p-6 rounded-2xl border ${
            theme === 'dark' ? 'bg-slate-800/30 border-slate-700' : 'bg-white border-slate-200 shadow-sm'
          }`}>
            <h3 className={`font-bold mb-4 flex items-center gap-2 ${
              theme === 'dark' ? 'text-white' : 'text-slate-900'
            }`}>
              <TrendingUp className="w-5 h-5 text-emerald-500" />
              Invoice Summary
            </h3>
            
            <div className="space-y-4">
              <div className={`p-4 rounded-xl ${theme === 'dark' ? 'bg-slate-800' : 'bg-slate-50'}`}>
                <p className={`text-xs font-medium mb-1 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                  Total Amount
                </p>
                <p className="text-2xl font-bold text-emerald-500">
                  Rs. {invoice.total.toLocaleString()}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className={`p-3 rounded-xl ${theme === 'dark' ? 'bg-slate-800' : 'bg-slate-50'}`}>
                  <p className={`text-xs font-medium mb-1 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                    Items
                  </p>
                  <p className={`text-lg font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                    {invoice.items.length}
                  </p>
                </div>
                <div className={`p-3 rounded-xl ${theme === 'dark' ? 'bg-slate-800' : 'bg-slate-50'}`}>
                  <p className={`text-xs font-medium mb-1 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                    Quantity
                  </p>
                  <p className={`text-lg font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                    {invoice.items.reduce((sum, item) => sum + item.quantity, 0)}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Customer Card */}
          {customer && (
            <div className={`p-6 rounded-2xl border ${
              theme === 'dark' ? 'bg-slate-800/30 border-slate-700' : 'bg-white border-slate-200 shadow-sm'
            }`}>
              <h3 className={`font-bold mb-4 flex items-center gap-2 ${
                theme === 'dark' ? 'text-white' : 'text-slate-900'
              }`}>
                <User className="w-5 h-5 text-teal-500" />
                Customer Details
              </h3>
              
              <div className="flex items-center gap-4 mb-4">
                <div className={`w-14 h-14 rounded-xl flex items-center justify-center text-xl font-bold ${
                  theme === 'dark' ? 'bg-teal-500/20 text-teal-400' : 'bg-teal-100 text-teal-600'
                }`}>
                  {customer.name.charAt(0)}
                </div>
                <div>
                  <p className={`font-semibold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                    {customer.name}
                  </p>
                  {customer.id !== 'walk-in' && (
                    <p className={`text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                      {customer.email}
                    </p>
                  )}
                </div>
              </div>

              {customer.id !== 'walk-in' && (
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <Phone className={`w-4 h-4 ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`} />
                    <span className={theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}>{customer.phone}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Mail className={`w-4 h-4 ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`} />
                    <span className={theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}>{customer.email}</span>
                  </div>
                  <div className={`mt-3 p-3 rounded-lg ${theme === 'dark' ? 'bg-slate-800' : 'bg-slate-50'}`}>
                    <div className="flex justify-between text-sm">
                      <span className={theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}>Total Spent</span>
                      <span className="font-semibold text-emerald-500">Rs. {customer.totalSpent.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-sm mt-1">
                      <span className={theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}>Total Orders</span>
                      <span className={`font-semibold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>{customer.totalOrders}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Payment Management Section */}
          <div className={`p-6 rounded-2xl border ${
            theme === 'dark' ? 'bg-slate-800/30 border-slate-700' : 'bg-white border-slate-200 shadow-sm'
          }`}>
            <h3 className={`font-bold mb-4 flex items-center gap-2 ${
              theme === 'dark' ? 'text-white' : 'text-slate-900'
            }`}>
              <Wallet className="w-5 h-5 text-purple-500" />
              Payment Details
            </h3>

            {/* Payment Summary */}
            <div className={`p-4 rounded-xl mb-4 ${
              invoice.status === 'fullpaid'
                ? theme === 'dark' ? 'bg-emerald-500/10 border border-emerald-500/20' : 'bg-emerald-50 border border-emerald-200'
                : invoice.status === 'halfpay'
                  ? theme === 'dark' ? 'bg-amber-500/10 border border-amber-500/20' : 'bg-amber-50 border border-amber-200'
                  : theme === 'dark' ? 'bg-red-500/10 border border-red-500/20' : 'bg-red-50 border border-red-200'
            }`}>
              <div className="flex items-center justify-between mb-3">
                <span className={`text-sm font-medium ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>Total Amount</span>
                <span className={`text-lg font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                  {formatCurrency(invoice.total)}
                </span>
              </div>
              <div className="flex items-center justify-between mb-3">
                <span className={`text-sm font-medium ${theme === 'dark' ? 'text-emerald-400' : 'text-emerald-600'}`}>✓ Paid</span>
                <span className={`text-lg font-bold text-emerald-500`}>
                  {formatCurrency(invoice.paidAmount || 0)}
                </span>
              </div>
              <div className={`flex items-center justify-between pt-3 border-t ${
                theme === 'dark' ? 'border-slate-700' : 'border-slate-200'
              }`}>
                <span className={`text-sm font-medium ${
                  invoice.status === 'fullpaid' 
                    ? theme === 'dark' ? 'text-emerald-400' : 'text-emerald-600'
                    : theme === 'dark' ? 'text-amber-400' : 'text-amber-600'
                }`}>⏳ Balance Due</span>
                <span className={`text-xl font-bold ${
                  invoice.status === 'fullpaid' ? 'text-emerald-500' : 'text-amber-500'
                }`}>
                  {formatCurrency(invoice.total - (invoice.paidAmount || 0))}
                </span>
              </div>
              
              {/* Progress Bar */}
              <div className="mt-3">
                <div className="flex justify-between text-xs mb-1">
                  <span className={theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}>Payment Progress</span>
                  <span className={theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}>
                    {((invoice.paidAmount || 0) / invoice.total * 100).toFixed(1)}%
                  </span>
                </div>
                <div className={`h-2 rounded-full overflow-hidden ${theme === 'dark' ? 'bg-slate-700' : 'bg-slate-200'}`}>
                  <div 
                    className={`h-full rounded-full transition-all ${
                      invoice.status === 'fullpaid' 
                        ? 'bg-gradient-to-r from-emerald-400 to-teal-400' 
                        : 'bg-gradient-to-r from-amber-400 to-orange-400'
                    }`}
                    style={{ width: `${((invoice.paidAmount || 0) / invoice.total) * 100}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Record Payment Button */}
            {invoice.status !== 'fullpaid' && (
              <button
                onClick={() => setShowPaymentModal(true)}
                className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm transition-all ${
                  theme === 'dark' 
                    ? 'bg-gradient-to-r from-violet-600 to-purple-600 text-white hover:from-violet-700 hover:to-purple-700 shadow-lg shadow-purple-500/25' 
                    : 'bg-gradient-to-r from-violet-500 to-purple-500 text-white hover:from-violet-600 hover:to-purple-600 shadow-lg shadow-purple-500/25'
                }`}
              >
                <Wallet className="w-4 h-4" />
                💰 Record Payment
              </button>
            )}

            {/* Fully Paid Badge */}
            {invoice.status === 'fullpaid' && (
              <div className={`flex items-center justify-center gap-2 py-3 rounded-xl ${
                theme === 'dark' 
                  ? 'bg-gradient-to-br from-emerald-500/10 via-teal-500/10 to-cyan-500/10 border border-emerald-500/20' 
                  : 'bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50 border border-emerald-200'
              }`}>
                <CheckCircle className="w-5 h-5 text-emerald-500" />
                <span className={`font-bold ${theme === 'dark' ? 'text-emerald-400' : 'text-emerald-600'}`}>
                  ✨ Fully Paid
                </span>
              </div>
            )}

            {/* Payment History - Now shown in payment modal only */}
          </div>

          {/* Timeline / Activity */}
          <div className={`p-6 rounded-2xl border ${
            theme === 'dark' ? 'bg-slate-800/30 border-slate-700' : 'bg-white border-slate-200 shadow-sm'
          }`}>
            <h3 className={`font-bold mb-4 flex items-center gap-2 ${
              theme === 'dark' ? 'text-white' : 'text-slate-900'
            }`}>
              <Clock className="w-5 h-5 text-cyan-500" />
              Activity
            </h3>
            
            <div className="space-y-4">
              <div className="flex gap-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                  theme === 'dark' ? 'bg-emerald-500/20' : 'bg-emerald-100'
                }`}>
                  <FileText className="w-4 h-4 text-emerald-500" />
                </div>
                <div>
                  <p className={`text-sm font-medium ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                    Invoice Created
                  </p>
                  <p className={`text-xs ${theme === 'dark' ? 'text-slate-500' : 'text-slate-500'}`}>
                    {new Date(invoice.date).toLocaleDateString('en-GB', { 
                      day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
                    })}
                  </p>
                </div>
              </div>

              {invoice.status === 'fullpaid' && (
                <div className="flex gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                    theme === 'dark' ? 'bg-emerald-500/20' : 'bg-emerald-100'
                  }`}>
                    <CheckCircle className="w-4 h-4 text-emerald-500" />
                  </div>
                  <div>
                    <p className={`text-sm font-medium ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                      Payment Received
                    </p>
                    <p className={`text-xs ${theme === 'dark' ? 'text-slate-500' : 'text-slate-500'}`}>
                      Paid in full
                    </p>
                  </div>
                </div>
              )}

              {invoice.status === 'halfpay' && (
                <div className="flex gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                    theme === 'dark' ? 'bg-amber-500/20' : 'bg-amber-100'
                  }`}>
                    <CircleDollarSign className="w-4 h-4 text-amber-500" />
                  </div>
                  <div>
                    <p className={`text-sm font-medium ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                      Partial Payment
                    </p>
                    <p className={`text-xs ${theme === 'dark' ? 'text-slate-500' : 'text-slate-500'}`}>
                      Due by {new Date(invoice.dueDate).toLocaleDateString('en-GB')}
                    </p>
                  </div>
                </div>
              )}

              {invoice.status === 'unpaid' && (
                <div className="flex gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                    theme === 'dark' ? 'bg-red-500/20' : 'bg-red-100'
                  }`}>
                    <XCircle className="w-4 h-4 text-red-500" />
                  </div>
                  <div>
                    <p className={`text-sm font-medium ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                      Payment Pending
                    </p>
                    <p className={`text-xs text-red-400`}>
                      Due by {new Date(invoice.dueDate).toLocaleDateString('en-GB')}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Print Preview Modal */}
      {showPrintPreview && invoice && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className={`w-full max-w-4xl max-h-[95vh] overflow-hidden rounded-2xl ${
            theme === 'dark' ? 'bg-slate-900' : 'bg-white'
          }`}>
            {/* Modal Header */}
            <div className={`flex items-center justify-between px-6 py-4 border-b ${
              theme === 'dark' ? 'border-slate-700' : 'border-slate-200'
            }`}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-emerald-500/20 rounded-xl flex items-center justify-center">
                  <Printer className="w-5 h-5 text-emerald-500" />
                </div>
                <div>
                  <h2 className={`text-lg font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                    Print Invoice
                  </h2>
                  <p className={`text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                    {invoice.id}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleActualPrint}
                  className="flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg font-medium transition-colors"
                >
                  <Printer className="w-4 h-4" />
                  Print
                </button>
                <button
                  onClick={() => setShowPrintPreview(false)}
                  className={`p-2 rounded-lg transition-colors ${
                    theme === 'dark' ? 'hover:bg-slate-800 text-slate-400' : 'hover:bg-slate-100 text-slate-600'
                  }`}
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            
            {/* Print Preview */}
            <div className="overflow-auto max-h-[calc(95vh-80px)] bg-gray-100 p-4">
              <div ref={printRef} className="print-area">
                <PrintableInvoice invoice={invoice} customer={customer} />
              </div>
            </div>
          </div>

          {/* Print Styles */}
          <style>{`
            @media print {
              body * { visibility: hidden; }
              .print-area, .print-area * { visibility: visible; }
              .print-area { position: absolute; left: 0; top: 0; }
            }
          `}</style>
        </div>
      )}

      {/* Invoice Payment Modal */}
      <InvoicePaymentModal
        isOpen={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        invoice={invoice}
        onPayment={handlePayment}
      />
    </div>
  );
};
