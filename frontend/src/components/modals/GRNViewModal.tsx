import React, { useState, useRef, useEffect } from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { useShopBranding } from '../../contexts/ShopBrandingContext';
import { useAuth } from '../../contexts/AuthContext';
// import { useWhatsAppSettings } from '../../contexts/WhatsAppSettingsContext'; // Uncomment when enabling handleSendReminder
import type { GoodsReceivedNote, GRNStatus, GRNItemStatus, Supplier } from '../../data/mockData';
import { mockSuppliers } from '../../data/mockData';
import PrintableGRN from '../PrintableGRN';
import { downloadPDFFromElement, openWhatsAppWithMessage, generatePDFAsDataURL } from '../../services/clientPdfService';
import grnService from '../../services/grnService';
// import { grnReminderService } from '../../services/reminderService'; // Uncomment when enabling handleSendReminder
import { GRNReminderHistoryModal } from './GRNReminderHistoryModal';
import {
  X,
  Package,
  Truck,
  ClipboardCheck,
  CheckCircle,
  XCircle,
  AlertTriangle,
  FileText,
  Clock,
  ShieldCheck,
  Printer,
  Edit,
  Building2,
  CreditCard,
  Banknote,
  Receipt,
  Wallet,
  Tag,
  Percent,
  BadgePercent,
  DollarSign,
  MoreVertical,
  Download,
  MessageCircle,
  Copy,
  Mail,
  Bell,
} from 'lucide-react';
import { toast } from 'sonner';

interface GRNViewModalProps {
  isOpen: boolean;
  grn: GoodsReceivedNote | null;
  onClose: () => void;
  onEdit?: (grn: GoodsReceivedNote) => void;
  onPay?: (grn: GoodsReceivedNote) => void;
}

const statusConfig: Record<GRNStatus, { label: string; color: string; bgColor: string; borderColor: string; icon: React.ElementType }> = {
  pending: { label: 'Pending Delivery', color: 'text-amber-500', bgColor: 'bg-amber-500/10', borderColor: 'border-amber-500/30', icon: Clock },
  inspecting: { label: 'Quality Inspection', color: 'text-blue-500', bgColor: 'bg-blue-500/10', borderColor: 'border-blue-500/30', icon: ShieldCheck },
  partial: { label: 'Partial Received', color: 'text-orange-500', bgColor: 'bg-orange-500/10', borderColor: 'border-orange-500/30', icon: AlertTriangle },
  completed: { label: 'Completed', color: 'text-emerald-500', bgColor: 'bg-emerald-500/10', borderColor: 'border-emerald-500/30', icon: CheckCircle },
  rejected: { label: 'Rejected', color: 'text-red-500', bgColor: 'bg-red-500/10', borderColor: 'border-red-500/30', icon: XCircle },
};

const itemStatusConfig: Record<GRNItemStatus, { label: string; color: string; bgColor: string }> = {
  pending: { label: 'Pending', color: 'text-amber-500', bgColor: 'bg-amber-500/10' },
  accepted: { label: 'Accepted', color: 'text-emerald-500', bgColor: 'bg-emerald-500/10' },
  rejected: { label: 'Rejected', color: 'text-red-500', bgColor: 'bg-red-500/10' },
  partial: { label: 'Partial', color: 'text-orange-500', bgColor: 'bg-orange-500/10' },
};

// Payment method config
const paymentMethodConfig: Record<string, { label: string; icon: React.ElementType; color: string; bgColor: string }> = {
  cash: { label: 'Cash', icon: Banknote, color: 'text-emerald-500', bgColor: 'bg-emerald-500/10' },
  bank: { label: 'Bank Transfer', icon: Building2, color: 'text-blue-500', bgColor: 'bg-blue-500/10' },
  card: { label: 'Card', icon: CreditCard, color: 'text-purple-500', bgColor: 'bg-purple-500/10' },
  credit: { label: 'Credit', icon: Wallet, color: 'text-orange-500', bgColor: 'bg-orange-500/10' },
  cheque: { label: 'Cheque', icon: Receipt, color: 'text-cyan-500', bgColor: 'bg-cyan-500/10' },
};

// Payment status config
const paymentStatusConfig: Record<string, { label: string; color: string; bgColor: string; borderColor: string }> = {
  paid: { label: 'Paid', color: 'text-emerald-500', bgColor: 'bg-emerald-500/10', borderColor: 'border-emerald-500/30' },
  partial: { label: 'Partial', color: 'text-amber-500', bgColor: 'bg-amber-500/10', borderColor: 'border-amber-500/30' },
  unpaid: { label: 'Unpaid', color: 'text-red-500', bgColor: 'bg-red-500/10', borderColor: 'border-red-500/30' },
};

export const GRNViewModal: React.FC<GRNViewModalProps> = ({
  isOpen,
  grn,
  onClose,
  onEdit,
  onPay,
}) => {
  const { theme } = useTheme();
  const { branding } = useShopBranding();
  const { getAccessToken, isViewingShop, viewingShop } = useAuth();
  // const { settings: whatsAppSettings } = useWhatsAppSettings(); // Uncomment when enabling handleSendReminder
  const effectiveShopId = isViewingShop && viewingShop ? viewingShop.id : undefined;
  const [showPrintPreview, setShowPrintPreview] = useState(false);
  const [showActions, setShowActions] = useState(false);
  const [supplier, setSupplier] = useState<Supplier | null>(null);
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  // const [isSendingReminder, setIsSendingReminder] = useState(false); // Uncomment when enabling handleSendReminder
  const [reminderCount, setReminderCount] = useState(0);
  const [showReminderHistoryModal, setShowReminderHistoryModal] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);
  const hiddenPrintRef = useRef<HTMLDivElement>(null); // Hidden ref for direct PDF generation
  
  // Find supplier for print when modal opens
  useEffect(() => {
    if (isOpen && grn) {
      // Set reminder count from GRN
      setReminderCount(grn.reminderCount || 0);
      
      // Try to find supplier from mock data first
      const found = mockSuppliers.find(s => s.id === grn.supplierId);
      if (found) {
        // Even if found in mock, override email/phone with GRN data if available
        setSupplier({
          ...found,
          email: grn.supplierEmail || found.email || '',
          phone: grn.supplierPhone || found.phone || '',
          company: grn.supplierCompany || found.company || grn.supplierName,
        });
      } else {
        // Create a supplier object from GRN data (includes email/phone from API)
        setSupplier({
          id: grn.supplierId,
          company: grn.supplierCompany || grn.supplierName,
          name: grn.supplierName,
          email: grn.supplierEmail || '',
          phone: grn.supplierPhone || '',
          address: '',
          totalOrders: 0,
          totalPurchases: 0,
          lastOrder: '',
          creditBalance: 0,
          creditLimit: 0,
          creditStatus: 'clear',
          rating: 0,
          categories: [],
        });
      }
    }
  }, [isOpen, grn]);

  // Close actions menu on outside click
  useEffect(() => {
    if (!showActions) return;
    
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      // Get the actions menu container
      const actionsMenu = document.querySelector('[data-grn-actions-menu]');
      if (actionsMenu && !actionsMenu.contains(target)) {
        setShowActions(false);
      }
    };
    
    setTimeout(() => {
      document.addEventListener('click', handleClickOutside);
    }, 0);
    
    return () => document.removeEventListener('click', handleClickOutside);
  }, [showActions]);

  if (!isOpen || !grn) return null;

  const statusInfo = statusConfig[grn.status];
  const StatusIcon = statusInfo.icon;

  const handlePrint = () => {
    setShowPrintPreview(true);
  };

  const handlePrintDocument = () => {
    const printContent = printRef.current;
    if (!printContent) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>GRN - ${grn.grnNumber}</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { font-family: 'Segoe UI', Arial, sans-serif; }
          </style>
        </head>
        <body>
          ${printContent.innerHTML}
        </body>
      </html>
    `);

    printWindow.document.close();
    printWindow.focus();
    
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 250);
  };

  // Download PDF using html2canvas (client-side generation)
  const handleDownloadPDF = async () => {
    // Ensure print preview is shown first for the content to render
    if (!showPrintPreview) {
      setShowPrintPreview(true);
      // Wait for render then retry
      setTimeout(async () => {
        const content = printRef.current;
        if (content) {
          await downloadPDFActual(content);
        }
      }, 300);
      return;
    }
    
    const printContent = printRef.current;
    if (!printContent) {
      toast.error('Cannot generate PDF', {
        description: 'Print area not found',
      });
      return;
    }
    await downloadPDFActual(printContent);
  };

  const downloadPDFActual = async (content: HTMLDivElement) => {
    try {
      toast.loading('Generating PDF...', { id: 'grn-pdf-download' });
      await downloadPDFFromElement(content, `GRN-${grn.grnNumber}.pdf`);
      toast.success('PDF Downloaded!', {
        id: 'grn-pdf-download',
        description: `GRN ${grn.grnNumber} saved successfully`,
      });
      setShowActions(false);
    } catch (error) {
      console.error('Failed to download PDF:', error);
      toast.error('Failed to download PDF', {
        id: 'grn-pdf-download',
        description: error instanceof Error ? error.message : 'Please try again',
      });
    }
  };

  // Send PDF via WhatsApp - Direct download without print preview
  const handleWhatsAppPDF = async () => {
    // Check for supplier phone
    const supplierPhone = supplier?.phone?.replace(/[^0-9]/g, '') || '';
    if (!supplierPhone) {
      toast.error('Supplier phone number not found!', {
        description: 'Please add a phone number to the supplier profile.',
      });
      return; // Don't proceed if no phone number
    }

    // Use hidden print ref for direct PDF generation (no preview needed)
    const printElement = hiddenPrintRef.current;
    if (!printElement) {
      toast.error('Cannot generate PDF', {
        description: 'Print area not found',
      });
      return;
    }

    try {
      // Step 1: Download the PDF first (client-side generation)
      toast.loading('Generating PDF...', { id: 'grn-whatsapp-pdf' });
      await downloadPDFFromElement(printElement, `GRN-${grn.grnNumber}.pdf`);

      // Step 2: Build WhatsApp message with actual shop details from database
      const balanceDue = grn.totalAmount - (grn.paidAmount || 0);
      const paymentStatusText = grn.paymentStatus === 'paid' ? '✅ PAID' :
                                grn.paymentStatus === 'partial' ? '⚠️ PARTIALLY PAID' :
                                '❌ UNPAID';

      const shopName = branding?.name || 'Your Shop';
      const shopAddress = branding?.address || '';
      const shopPhone = branding?.phone || '';

      const message = `📦 *GRN #${grn.grnNumber}*

🏪 *${shopName}*
${shopAddress ? `📍 ${shopAddress}` : ''}
${shopPhone ? `📞 ${shopPhone}` : ''}

🏭 *Supplier:* ${grn.supplierName}
📅 *Date:* ${formatDate(grn.receivedDate || grn.orderDate)}
💵 *Total:* Rs.${grn.totalAmount.toLocaleString()}
${balanceDue > 0 ? `⚠️ *Balance Due:* Rs.${balanceDue.toLocaleString()}` : ''}
📋 *Status:* ${paymentStatusText}

📎 *Please find the GRN PDF attached.*

Thank you for your service! 🙏`;

      // Step 3: Open WhatsApp Web with message
      openWhatsAppWithMessage(supplierPhone, message);

      toast.success('PDF Downloaded! WhatsApp opened.', {
        id: 'grn-whatsapp-pdf',
        description: 'Please attach the downloaded PDF in WhatsApp',
        duration: 5000,
      });
      setShowActions(false);
    } catch (error) {
      console.error('❌ Failed to send via WhatsApp:', error);
      toast.error('Failed to prepare WhatsApp', {
        id: 'grn-whatsapp-pdf',
        description: error instanceof Error ? error.message : 'Please try again.',
      });
    }
  };

  // Send GRN via email to supplier - Direct send without print preview
  const handleSendEmail = async () => {
    // Check for supplier email
    const supplierEmail = supplier?.email;
    if (!supplierEmail) {
      toast.error('Supplier email not found!', {
        description: 'Please add an email address to the supplier profile.',
      });
      return;
    }

    // Use hidden print ref for direct PDF generation (no preview needed)
    const printElement = hiddenPrintRef.current;
    if (!printElement) {
      toast.error('Cannot generate PDF', {
        description: 'Print area not found',
      });
      return;
    }

    setIsSendingEmail(true);

    try {
      // Step 1: Generate PDF client-side as base64
      toast.loading('Generating PDF...', { id: 'grn-email-pdf' });
      let pdfBase64: string | undefined;

      try {
        pdfBase64 = await generatePDFAsDataURL(printElement, {
          quality: 0.8,
          scale: 1.5,
          margin: 5,
        });
        console.log('📧 GRN PDF generated, size:', pdfBase64?.length || 0, 'bytes');
      } catch (pdfError) {
        console.warn('⚠️ PDF generation failed, will send email without PDF:', pdfError);
        pdfBase64 = undefined;
      }

      toast.loading('Sending email...', { id: 'grn-email-pdf' });

      // Step 2: Send email via backend with fresh token (use apiId - the database UUID)
      const grnId = grn.apiId || grn.id;
      console.log('📧 Sending GRN email, grnId:', grnId, 'apiId:', grn.apiId, 'id:', grn.id);
      const token = getAccessToken();
      const result = await grnService.sendEmailWithPDF(grnId, pdfBase64, token, effectiveShopId);

      const successMessage = result.hasPdfAttachment
        ? 'GRN sent with PDF attachment!'
        : 'GRN sent (PDF available to download)';

      toast.success(successMessage, {
        id: 'grn-email-pdf',
        description: `GRN #${grn.grnNumber} emailed to ${result.sentTo}`,
      });
      setShowActions(false);
    } catch (error) {
      console.error('❌ Failed to send GRN email:', error);
      toast.error('Failed to send email', {
        id: 'grn-email-pdf',
        description: error instanceof Error ? error.message : 'Please try again.',
      });
    } finally {
      setIsSendingEmail(false);
    }
  };

  /* Send payment reminder via WhatsApp - DISABLED for now
  // To enable, uncomment this function and add UI buttons that call it
  const handleSendReminder = async (type: 'PAYMENT' | 'OVERDUE') => {
    // Check if GRN reminders are enabled
    if (!whatsAppSettings?.grnReminderEnabled) {
      toast.error('GRN reminders not enabled', {
        description: 'Please enable GRN reminders in Settings',
      });
      return;
    }

    // Check for supplier phone
    const supplierPhone = supplier?.phone?.replace(/[^0-9]/g, '') || '';
    if (!supplierPhone) {
      toast.error('Supplier phone number not found!', {
        description: 'Please add a phone number to the supplier profile.',
      });
      return;
    }

    // Get the appropriate template
    const template = type === 'PAYMENT' 
      ? whatsAppSettings.grnPaymentReminderTemplate 
      : whatsAppSettings.grnOverdueReminderTemplate;

    if (!template) {
      toast.error('Reminder template not found', {
        description: 'Please configure reminder templates in Settings',
      });
      return;
    }

    setIsSendingReminder(true);

    try {
      // Build message from template
      const dueDateStr = grn.dueDate ? new Date(grn.dueDate).toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      }) : 'N/A';

      // Replace placeholders in template with actual shop details from database
      const message = template
        .replace(/\{\{grnNumber\}\}/g, grn.grnNumber)
        .replace(/\{\{supplierName\}\}/g, grn.supplierName)
        .replace(/\{\{totalAmount\}\}/g, `Rs. ${grn.totalAmount.toLocaleString()}`)
        .replace(/\{\{balanceDue\}\}/g, `Rs. ${balanceDue.toLocaleString()}`)
        .replace(/\{\{paidAmount\}\}/g, `Rs. ${(grn.paidAmount || 0).toLocaleString()}`)
        .replace(/\{\{dueDate\}\}/g, dueDateStr)
        .replace(/\{\{grnDate\}\}/g, formatDate(grn.receivedDate || grn.orderDate))
        .replace(/\{\{receivedDate\}\}/g, formatDate(grn.receivedDate || grn.orderDate))
        .replace(/\{\{shopName\}\}/g, branding?.name || 'Your Shop')
        .replace(/\{\{shopPhone\}\}/g, branding?.phone || '')
        .replace(/\{\{shopAddress\}\}/g, branding?.address || '');

      // Open WhatsApp with message
      openWhatsAppWithMessage(supplierPhone, message);

      // Save reminder to database
      const grnId = grn.apiId || grn.id;
      await grnReminderService.create(grnId, {
        type,
        channel: 'whatsapp',
        message,
        supplierPhone,
        supplierName: grn.supplierName,
        shopId: effectiveShopId,
      });

      // Update local count
      setReminderCount(prev => prev + 1);

      toast.success(`${type === 'PAYMENT' ? 'Payment' : 'Overdue'} reminder sent!`, {
        description: `WhatsApp opened for ${grn.supplierName}`,
      });
      setShowActions(false);
    } catch (error) {
      console.error('❌ Failed to send reminder:', error);
      toast.error('Failed to send reminder', {
        description: error instanceof Error ? error.message : 'Please try again',
      });
    } finally {
      setIsSendingReminder(false);
    }
  };
  // End of handleSendReminder - uncomment to enable */

  // Copy GRN number
  const handleCopyGRNNumber = () => {
    navigator.clipboard.writeText(grn.grnNumber);
    toast.success('GRN number copied!');
    setShowActions(false);
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  // Calculate balance due
  const balanceDue = grn.totalAmount - (grn.paidAmount || 0);

  // Calculate acceptance rate
  const acceptanceRate = grn.totalReceivedQuantity > 0 
    ? ((grn.totalAcceptedQuantity / grn.totalReceivedQuantity) * 100).toFixed(1)
    : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className={`w-full max-w-4xl max-h-[95vh] rounded-2xl border shadow-2xl overflow-hidden flex flex-col ${
        theme === 'dark' 
          ? 'bg-slate-900 border-slate-700' 
          : 'bg-white border-slate-200'
      }`}>
        {/* Header - Two Row Layout */}
        <div className={`px-6 py-4 border-b flex-shrink-0 ${
          theme === 'dark' 
            ? 'bg-gradient-to-r from-emerald-900/30 to-teal-900/30 border-slate-700' 
            : 'bg-gradient-to-r from-emerald-50 to-teal-50 border-slate-200'
        }`}>
          {/* Row 1: Title + Action Buttons */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/25">
                <ClipboardCheck className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className={`text-xl font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                  {grn.grnNumber}
                </h2>
                <p className={`text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                  Goods Received Note
                </p>
              </div>
            </div>
            
            {/* Action Buttons - Right Side */}
            <div className="flex items-center gap-2">
              {/* Pay Button - Show when not fully paid with animation highlight */}
              {onPay && grn.paymentStatus !== 'paid' && (grn.paidAmount || 0) < grn.totalAmount && (
                <button
                  onClick={() => onPay(grn)}
                  className={`relative flex items-center gap-1.5 px-4 py-2 rounded-xl font-medium shadow-lg transition-all transform hover:scale-105 ${
                    theme === 'dark' 
                      ? 'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-white shadow-amber-500/30' 
                      : 'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-white shadow-amber-500/30'
                  }`}
                  title="Record Payment"
                >
                  {/* Pulse animation - pointer-events-none to prevent blocking clicks */}
                  <span className="absolute inset-0 rounded-xl bg-white/20 animate-ping opacity-75 pointer-events-none" />
                  <DollarSign className="w-4 h-4 relative z-10" />
                  <span className="text-sm font-semibold relative z-10">Pay Now</span>
                </button>
              )}
              {onEdit && (
                <button
                  onClick={() => onEdit(grn)}
                  className={`p-2 rounded-lg transition-colors ${
                    theme === 'dark' ? 'hover:bg-slate-700 text-slate-400' : 'hover:bg-slate-100 text-slate-600'
                  }`}
                  title="Edit GRN"
                >
                  <Edit className="w-5 h-5" />
                </button>
              )}
              <button
                onClick={handlePrint}
              className={`p-2 rounded-lg transition-colors ${
                theme === 'dark' ? 'hover:bg-slate-700 text-slate-400' : 'hover:bg-slate-100 text-slate-600'
              }`}
              title="Print GRN"
            >
              <Printer className="w-5 h-5" />
            </button>
            
            {/* More Actions - 3-dot menu */}
            <div className="relative" data-grn-actions-menu>
              <button
                onClick={() => setShowActions(!showActions)}
                className={`p-2 rounded-lg transition-colors ${
                  theme === 'dark' ? 'hover:bg-slate-700 text-slate-400' : 'hover:bg-slate-100 text-slate-600'
                }`}
                title="More Actions"
              >
                <MoreVertical className="w-5 h-5" />
              </button>
              {showActions && (
                <div className={`absolute right-0 mt-2 w-56 rounded-xl border shadow-xl z-20 overflow-hidden ${
                  theme === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'
                }`}>
                  {/* Download PDF */}
                  <button 
                    onClick={() => {
                      handleDownloadPDF();
                      setShowActions(false);
                    }}
                    className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-all ${
                      theme === 'dark' ? 'hover:bg-slate-700 text-slate-300' : 'hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <Download className="w-4 h-4 text-blue-500" />
                    <span>Download PDF</span>
                  </button>

                  {/* Send PDF via WhatsApp */}
                  <button 
                    onClick={() => {
                      handleWhatsAppPDF();
                      setShowActions(false);
                    }}
                    className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-all ${
                      theme === 'dark' ? 'hover:bg-slate-700 text-slate-300' : 'hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <MessageCircle className="w-4 h-4 text-green-500" />
                    <span>Send PDF via WhatsApp</span>
                  </button>

                  {/* Email PDF to Supplier */}
                  <button 
                    onClick={() => {
                      handleSendEmail();
                    }}
                    disabled={isSendingEmail}
                    className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-all ${
                      isSendingEmail ? 'opacity-50 cursor-not-allowed' : ''
                    } ${
                      theme === 'dark' ? 'hover:bg-slate-700 text-slate-300' : 'hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <Mail className="w-4 h-4 text-purple-500" />
                    <span>{isSendingEmail ? 'Sending...' : 'Email PDF to Supplier'}</span>
                  </button>

                  {/* Divider */}
                  <div className={`border-t ${theme === 'dark' ? 'border-slate-700' : 'border-slate-200'}`} />

                  {/* Copy GRN Number */}
                  <button 
                    onClick={handleCopyGRNNumber}
                    className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-all ${
                      theme === 'dark' ? 'hover:bg-slate-700 text-slate-300' : 'hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <Copy className="w-4 h-4 text-slate-500" />
                    <span>Copy GRN Number</span>
                  </button>
                </div>
              )}
            </div>
            
            <button
              onClick={onClose}
              className={`p-2 rounded-lg transition-colors ${
                theme === 'dark' ? 'hover:bg-slate-700 text-slate-400' : 'hover:bg-slate-100 text-slate-600'
              }`}
            >
              <X className="w-5 h-5" />
            </button>
            </div>
          </div>

          {/* Row 2: Status Badges */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Receipt Status Badge */}
            <span className={`px-3 py-1.5 rounded-full text-sm font-medium flex items-center gap-1.5 ${statusInfo.bgColor} ${statusInfo.color} border ${statusInfo.borderColor}`}>
              <StatusIcon className="w-4 h-4" />
              {statusInfo.label}
            </span>
            
            {/* Payment Status Badge */}
            <span className={`px-3 py-1.5 rounded-full text-sm font-medium flex items-center gap-1.5 ${
              grn.paymentStatus === 'paid' 
                ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/30'
                : grn.paymentStatus === 'partial'
                ? 'bg-amber-500/10 text-amber-500 border border-amber-500/30'
                : 'bg-red-500/10 text-red-500 border border-red-500/30'
            }`}>
              {grn.paymentStatus === 'paid' 
                ? '✓ Paid' 
                : grn.paymentStatus === 'partial'
                ? '◐ Partial'
                : '○ Unpaid'}
            </span>
            
            {/* Reminder Count Badge - Clickable for history */}
            {reminderCount > 0 && (
              <button
                onClick={() => setShowReminderHistoryModal(true)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium flex items-center gap-1.5 cursor-pointer transition-all hover:scale-105 ${
                  theme === 'dark'
                    ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30 hover:bg-amber-500/20'
                    : 'bg-amber-100 text-amber-700 border border-amber-300 hover:bg-amber-200'
                }`}
                title="View reminder history"
              >
                <Bell className="w-3.5 h-3.5" />
                {reminderCount} {reminderCount === 1 ? 'reminder' : 'reminders'}
              </button>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Summary Stats */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className={`p-4 rounded-xl ${theme === 'dark' ? 'bg-slate-800/50' : 'bg-slate-50'}`}>
              <p className={`text-xs ${theme === 'dark' ? 'text-slate-500' : 'text-slate-500'}`}>Ordered</p>
              <p className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                {grn.totalOrderedQuantity}
              </p>
            </div>
            <div className={`p-4 rounded-xl ${theme === 'dark' ? 'bg-slate-800/50' : 'bg-slate-50'}`}>
              <p className={`text-xs ${theme === 'dark' ? 'text-slate-500' : 'text-slate-500'}`}>Received</p>
              <p className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                {grn.totalReceivedQuantity}
              </p>
            </div>
            <div className={`p-4 rounded-xl ${theme === 'dark' ? 'bg-emerald-500/10' : 'bg-emerald-50'}`}>
              <p className={`text-xs ${theme === 'dark' ? 'text-emerald-400' : 'text-emerald-600'}`}>Accepted</p>
              <p className="text-2xl font-bold text-emerald-500">{grn.totalAcceptedQuantity}</p>
            </div>
            <div className={`p-4 rounded-xl ${theme === 'dark' ? 'bg-red-500/10' : 'bg-red-50'}`}>
              <p className={`text-xs ${theme === 'dark' ? 'text-red-400' : 'text-red-600'}`}>Rejected</p>
              <p className="text-2xl font-bold text-red-500">{grn.totalRejectedQuantity}</p>
            </div>
            <div className={`p-4 rounded-xl ${theme === 'dark' ? 'bg-blue-500/10' : 'bg-blue-50'}`}>
              <p className={`text-xs ${theme === 'dark' ? 'text-blue-400' : 'text-blue-600'}`}>Accept Rate</p>
              <p className="text-2xl font-bold text-blue-500">{acceptanceRate}%</p>
            </div>
          </div>

          {/* Supplier & Delivery Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Supplier Info */}
            <div className={`p-4 rounded-xl border ${theme === 'dark' ? 'bg-slate-800/30 border-slate-700' : 'bg-white border-slate-200'}`}>
              <h3 className={`text-sm font-semibold mb-3 flex items-center gap-2 ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                <Building2 className="w-4 h-4" />
                Supplier Information
              </h3>
              <div className="space-y-2">
                <p className={`font-medium ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                  {grn.supplierName}
                </p>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className={theme === 'dark' ? 'text-slate-500' : 'text-slate-500'}>Order Date:</span>
                    <p className={theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}>{formatDate(grn.orderDate)}</p>
                  </div>
                  <div>
                    <span className={theme === 'dark' ? 'text-slate-500' : 'text-slate-500'}>Expected:</span>
                    <p className={theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}>{formatDate(grn.expectedDeliveryDate)}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Delivery Info */}
            <div className={`p-4 rounded-xl border ${theme === 'dark' ? 'bg-slate-800/30 border-slate-700' : 'bg-white border-slate-200'}`}>
              <h3 className={`text-sm font-semibold mb-3 flex items-center gap-2 ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                <Truck className="w-4 h-4" />
                Delivery Information
              </h3>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className={theme === 'dark' ? 'text-slate-500' : 'text-slate-500'}>Received Date:</span>
                  <p className={theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}>{formatDate(grn.receivedDate)}</p>
                </div>
                <div>
                  <span className={theme === 'dark' ? 'text-slate-500' : 'text-slate-500'}>Received By:</span>
                  <p className={theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}>{grn.receivedBy || '-'}</p>
                </div>
                <div>
                  <span className={theme === 'dark' ? 'text-slate-500' : 'text-slate-500'}>Delivery Note:</span>
                  <p className={theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}>{grn.deliveryNote || '-'}</p>
                </div>
                <div>
                  <span className={theme === 'dark' ? 'text-slate-500' : 'text-slate-500'}>Vehicle:</span>
                  <p className={theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}>{grn.vehicleNumber || '-'}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Payment & Discount Summary */}
          {(grn.paymentMethod || grn.totalDiscount || grn.discountAmount) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Payment Info */}
              {grn.paymentMethod && (
                <div className={`p-4 rounded-xl border ${theme === 'dark' ? 'bg-slate-800/30 border-slate-700' : 'bg-white border-slate-200'}`}>
                  <h3 className={`text-sm font-semibold mb-3 flex items-center gap-2 ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                    <CreditCard className="w-4 h-4" />
                    Payment Information
                  </h3>
                  <div className="space-y-3">
                    {/* Payment Method */}
                    <div className="flex items-center justify-between">
                      <span className={`text-sm ${theme === 'dark' ? 'text-slate-500' : 'text-slate-500'}`}>Method:</span>
                      <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg ${paymentMethodConfig[grn.paymentMethod]?.bgColor || 'bg-slate-500/10'}`}>
                        {(() => {
                          const config = paymentMethodConfig[grn.paymentMethod];
                          const Icon = config?.icon || CreditCard;
                          return <Icon className={`w-4 h-4 ${config?.color || 'text-slate-500'}`} />;
                        })()}
                        <span className={`text-sm font-medium ${paymentMethodConfig[grn.paymentMethod]?.color || 'text-slate-500'}`}>
                          {paymentMethodConfig[grn.paymentMethod]?.label || grn.paymentMethod}
                        </span>
                      </div>
                    </div>
                    {/* Payment Status */}
                    {grn.paymentStatus && (
                      <div className="flex items-center justify-between">
                        <span className={`text-sm ${theme === 'dark' ? 'text-slate-500' : 'text-slate-500'}`}>Status:</span>
                        <span className={`px-3 py-1.5 rounded-lg text-sm font-medium border ${paymentStatusConfig[grn.paymentStatus]?.bgColor || 'bg-slate-500/10'} ${paymentStatusConfig[grn.paymentStatus]?.color || 'text-slate-500'} ${paymentStatusConfig[grn.paymentStatus]?.borderColor || 'border-slate-500/30'}`}>
                          {paymentStatusConfig[grn.paymentStatus]?.label || grn.paymentStatus}
                        </span>
                      </div>
                    )}
                    {/* Paid Amount */}
                    {grn.paidAmount !== undefined && grn.paymentStatus !== 'unpaid' && (
                      <div className="flex items-center justify-between">
                        <span className={`text-sm ${theme === 'dark' ? 'text-slate-500' : 'text-slate-500'}`}>Paid:</span>
                        <span className={`text-sm font-bold ${theme === 'dark' ? 'text-emerald-400' : 'text-emerald-600'}`}>
                          Rs.{grn.paidAmount.toLocaleString()}
                        </span>
                      </div>
                    )}
                    {/* Balance */}
                    {grn.paymentStatus === 'partial' && grn.paidAmount !== undefined && (
                      <div className="flex items-center justify-between pt-2 border-t border-slate-700/30">
                        <span className={`text-sm ${theme === 'dark' ? 'text-slate-500' : 'text-slate-500'}`}>Balance:</span>
                        <span className={`text-sm font-bold ${theme === 'dark' ? 'text-amber-400' : 'text-amber-600'}`}>
                          Rs.{(grn.totalAmount - grn.paidAmount).toLocaleString()}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Discount Info */}
              {(grn.totalDiscount || grn.discountAmount) && (
                <div className={`p-4 rounded-xl border ${theme === 'dark' ? 'bg-gradient-to-br from-orange-900/20 to-amber-900/20 border-orange-500/30' : 'bg-gradient-to-br from-orange-50 to-amber-50 border-orange-200'}`}>
                  <h3 className={`text-sm font-semibold mb-3 flex items-center gap-2 ${theme === 'dark' ? 'text-orange-400' : 'text-orange-700'}`}>
                    <BadgePercent className="w-4 h-4" />
                    Discount Summary
                  </h3>
                  <div className="space-y-3">
                    {/* Item Discounts */}
                    {grn.totalDiscount && grn.totalDiscount > 0 && (
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Tag className={`w-3.5 h-3.5 ${theme === 'dark' ? 'text-orange-400' : 'text-orange-600'}`} />
                          <span className={`text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>Item Discounts:</span>
                        </div>
                        <span className={`text-sm font-semibold ${theme === 'dark' ? 'text-orange-400' : 'text-orange-600'}`}>
                          -Rs.{grn.totalDiscount.toLocaleString()}
                        </span>
                      </div>
                    )}
                    {/* Overall Discount */}
                    {grn.discountAmount > 0 && (
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Percent className={`w-3.5 h-3.5 ${theme === 'dark' ? 'text-orange-400' : 'text-orange-600'}`} />
                          <span className={`text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>Overall Discount:</span>
                        </div>
                        <span className={`text-sm font-semibold ${theme === 'dark' ? 'text-orange-400' : 'text-orange-600'}`}>
                          -Rs.{grn.discountAmount.toLocaleString()}
                        </span>
                      </div>
                    )}
                    {/* Total Savings */}
                    {((grn.totalDiscount || 0) + (grn.discountAmount || 0)) > 0 && (
                      <div className="flex items-center justify-between pt-2 border-t border-orange-500/20">
                        <span className={`text-sm font-medium ${theme === 'dark' ? 'text-orange-300' : 'text-orange-700'}`}>Total Savings:</span>
                        <span className={`text-lg font-bold ${theme === 'dark' ? 'text-orange-400' : 'text-orange-600'}`}>
                          Rs.{((grn.totalDiscount || 0) + grn.discountAmount).toLocaleString()}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Items Table */}
          <div className={`rounded-xl border overflow-hidden ${theme === 'dark' ? 'border-slate-700' : 'border-slate-200'}`}>
            <div className={`px-4 py-3 border-b ${theme === 'dark' ? 'bg-slate-800/50 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
              <h3 className={`font-semibold flex items-center gap-2 ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                <Package className="w-4 h-4" />
                Items ({grn.items.length})
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className={theme === 'dark' ? 'bg-slate-800/30' : 'bg-slate-50'}>
                    <th className={`px-4 py-3 text-left text-xs font-medium ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>Product</th>
                    <th className={`px-4 py-3 text-center text-xs font-medium ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>Ordered</th>
                    <th className={`px-4 py-3 text-center text-xs font-medium ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>Received</th>
                    <th className={`px-4 py-3 text-center text-xs font-medium ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>Accepted</th>
                    <th className={`px-4 py-3 text-center text-xs font-medium ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>Rejected</th>
                    <th className={`px-4 py-3 text-right text-xs font-medium ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>Unit Price</th>
                    <th className={`px-4 py-3 text-right text-xs font-medium ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>Total</th>
                    <th className={`px-4 py-3 text-center text-xs font-medium ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700/50">
                  {grn.items.map((item) => (
                    <tr key={item.id} className={theme === 'dark' ? 'hover:bg-slate-800/30' : 'hover:bg-slate-50'}>
                      <td className="px-4 py-3">
                        <div>
                          <p className={`font-medium ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>{item.productName}</p>
                          <p className={`text-xs ${theme === 'dark' ? 'text-slate-500' : 'text-slate-500'}`}>{item.category}</p>
                          {item.batchNumber && (
                            <p className={`text-xs ${theme === 'dark' ? 'text-slate-500' : 'text-slate-500'}`}>
                              Batch: {item.batchNumber}
                            </p>
                          )}
                        </div>
                      </td>
                      <td className={`px-4 py-3 text-center ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                        {item.orderedQuantity}
                      </td>
                      <td className={`px-4 py-3 text-center ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                        {item.receivedQuantity}
                      </td>
                      <td className="px-4 py-3 text-center text-emerald-500 font-medium">
                        {item.acceptedQuantity}
                      </td>
                      <td className="px-4 py-3 text-center text-red-500 font-medium">
                        {item.rejectedQuantity}
                      </td>
                      <td className={`px-4 py-3 text-right`}>
                        <div className="flex flex-col items-end">
                          {item.originalUnitPrice && item.originalUnitPrice !== item.unitPrice ? (
                            <>
                              <span className={`text-xs line-through ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>
                                Rs.{item.originalUnitPrice.toLocaleString()}
                              </span>
                              <span className={`font-medium ${theme === 'dark' ? 'text-emerald-400' : 'text-emerald-600'}`}>
                                Rs.{item.unitPrice.toLocaleString()}
                              </span>
                              <span className={`text-xs px-1.5 py-0.5 rounded mt-0.5 ${theme === 'dark' ? 'bg-orange-500/20 text-orange-400' : 'bg-orange-100 text-orange-600'}`}>
                                {item.discountType === 'percentage' ? `${item.discountValue}% off` : `-Rs.${item.discountValue?.toLocaleString()}`}
                              </span>
                            </>
                          ) : (
                            <span className={theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}>
                              Rs.{item.unitPrice.toLocaleString()}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className={`px-4 py-3 text-right font-medium ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                        Rs.{item.totalAmount.toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${itemStatusConfig[item.status].bgColor} ${itemStatusConfig[item.status].color}`}>
                          {itemStatusConfig[item.status].label}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Notes & Quality Info */}
          {(grn.notes || grn.inspectedBy) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {grn.notes && (
                <div className={`p-4 rounded-xl border ${theme === 'dark' ? 'bg-slate-800/30 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
                  <h3 className={`text-sm font-semibold mb-2 flex items-center gap-2 ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                    <FileText className="w-4 h-4" />
                    Notes
                  </h3>
                  <p className={`text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                    {grn.notes}
                  </p>
                </div>
              )}
              {grn.inspectedBy && (
                <div className={`p-4 rounded-xl border ${theme === 'dark' ? 'bg-blue-500/10 border-blue-500/30' : 'bg-blue-50 border-blue-200'}`}>
                  <h3 className={`text-sm font-semibold mb-2 flex items-center gap-2 ${theme === 'dark' ? 'text-blue-400' : 'text-blue-700'}`}>
                    <ShieldCheck className="w-4 h-4" />
                    Quality Inspection
                  </h3>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className={theme === 'dark' ? 'text-blue-400/60' : 'text-blue-600/60'}>Inspected By:</span>
                      <p className={theme === 'dark' ? 'text-blue-300' : 'text-blue-700'}>{grn.inspectedBy}</p>
                    </div>
                    <div>
                      <span className={theme === 'dark' ? 'text-blue-400/60' : 'text-blue-600/60'}>Date:</span>
                      <p className={theme === 'dark' ? 'text-blue-300' : 'text-blue-700'}>{formatDate(grn.inspectionDate || '')}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer - Total & Balance */}
        <div className={`px-6 py-4 border-t ${
          theme === 'dark' 
            ? 'bg-gradient-to-r from-emerald-900/30 to-teal-900/30 border-slate-700' 
            : 'bg-gradient-to-r from-emerald-50 to-teal-50 border-slate-200'
        }`}>
          <div className="flex items-center justify-between">
            <div className={`text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
              Created: {formatDate(grn.createdAt)}
              {grn.updatedAt !== grn.createdAt && ` • Updated: ${formatDate(grn.updatedAt)}`}
            </div>
            <div className="flex items-center gap-6">
              {grn.discountAmount > 0 && (
                <div className="text-right">
                  <span className={`text-sm ${theme === 'dark' ? 'text-slate-500' : 'text-slate-500'}`}>Discount:</span>
                  <span className={`ml-2 font-medium ${theme === 'dark' ? 'text-orange-400' : 'text-orange-600'}`}>
                    -Rs.{grn.discountAmount.toLocaleString()}
                  </span>
                </div>
              )}
              <div className="text-right">
                <span className={`text-sm ${theme === 'dark' ? 'text-slate-500' : 'text-slate-500'}`}>Total:</span>
                <span className={`ml-2 font-semibold ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                  Rs.{grn.totalAmount.toLocaleString()}
                </span>
              </div>
              {(grn.paidAmount || 0) > 0 && (
                <div className="text-right">
                  <span className={`text-sm ${theme === 'dark' ? 'text-slate-500' : 'text-slate-500'}`}>Paid:</span>
                  <span className={`ml-2 font-semibold ${theme === 'dark' ? 'text-emerald-400' : 'text-emerald-600'}`}>
                    Rs.{(grn.paidAmount || 0).toLocaleString()}
                  </span>
                </div>
              )}
              {balanceDue > 0 && (
                <div className={`text-right px-4 py-2 rounded-xl ${
                  theme === 'dark' 
                    ? 'bg-red-500/10 border border-red-500/30' 
                    : 'bg-red-50 border border-red-200'
                }`}>
                  <span className={`text-sm font-medium ${theme === 'dark' ? 'text-red-400' : 'text-red-600'}`}>Balance Due:</span>
                  <span className={`ml-2 text-xl font-bold ${theme === 'dark' ? 'text-red-400' : 'text-red-600'}`}>
                    Rs.{balanceDue.toLocaleString()}
                  </span>
                </div>
              )}
              {balanceDue === 0 && grn.totalAmount > 0 && (
                <div className={`text-right px-4 py-2 rounded-xl ${
                  theme === 'dark' 
                    ? 'bg-emerald-500/10 border border-emerald-500/30' 
                    : 'bg-emerald-50 border border-emerald-200'
                }`}>
                  <span className={`text-sm font-bold ${theme === 'dark' ? 'text-emerald-400' : 'text-emerald-600'}`}>
                    ✓ FULLY PAID
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Print Preview Modal */}
      {showPrintPreview && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className={`w-full max-w-5xl max-h-[95vh] rounded-2xl border shadow-2xl overflow-hidden flex flex-col ${
            theme === 'dark' ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-200'
          }`}>
            {/* Print Preview Header */}
            <div className={`px-6 py-4 border-b flex items-center justify-between ${
              theme === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'
            }`}>
              <h3 className={`text-lg font-semibold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                Print Preview - {grn.grnNumber}
              </h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={handlePrintDocument}
                  className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-xl font-medium hover:opacity-90 transition-opacity"
                >
                  <Printer className="w-4 h-4" />
                  Print
                </button>
                <button
                  onClick={() => setShowPrintPreview(false)}
                  className={`p-2 rounded-lg transition-colors ${
                    theme === 'dark' ? 'hover:bg-slate-700 text-slate-400' : 'hover:bg-slate-200 text-slate-600'
                  }`}
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            
            {/* Print Content */}
            <div className="flex-1 overflow-auto p-6 bg-slate-600">
              <div className="mx-auto shadow-2xl">
                <PrintableGRN ref={printRef} grn={grn} supplier={supplier} branding={branding} />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Hidden PrintableGRN for direct PDF generation (WhatsApp/Email) - always in DOM */}
      <div className="fixed -left-[9999px] top-0 opacity-0 pointer-events-none">
        <PrintableGRN ref={hiddenPrintRef} grn={grn} supplier={supplier} branding={branding} />
      </div>

      {/* GRN Reminder History Modal */}
      <GRNReminderHistoryModal
        isOpen={showReminderHistoryModal}
        onClose={() => setShowReminderHistoryModal(false)}
        grnId={(grn as any)?.apiId || grn?.id}
        grnNumber={grn?.grnNumber}
        supplierName={grn?.supplierName}
      />
    </div>
  );
};
