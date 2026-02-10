/**
 * Unified WhatsApp Service
 * 
 * Handles all WhatsApp messaging functionality across the application.
 * Uses WhatsApp Desktop protocol (whatsapp://) when available, 
 * falls back to WhatsApp Web (https://web.whatsapp.com) for browsers.
 * 
 * This service provides a single source of truth for:
 * - Invoice reminders
 * - GRN payment reminders
 * - General WhatsApp messaging
 */

// ============================================
// TYPES & INTERFACES
// ============================================

export interface WhatsAppMessage {
  phoneNumber: string;
  message: string;
}

export interface InvoiceReminderData {
  invoiceNumber: string;
  customerName: string;
  totalAmount: number;
  paidAmount: number;
  dueAmount: number;
  dueDate: string;
  isOverdue?: boolean;
  shopName: string;
  shopPhone?: string;
  shopAddress?: string;
}

export interface GRNReminderData {
  grnNumber: string;
  supplierName: string;
  totalAmount: number;
  paidAmount: number;
  balanceDue: number;
  receivedDate: string;
  dueDate?: string;
  isOverdue?: boolean;
  shopName: string;
  shopPhone?: string;
}

export interface QuotationReminderData {
  quotationNumber: string;
  customerName: string;
  totalAmount: number;
  validUntil: string;
  shopName: string;
  shopPhone?: string;
}

// ============================================
// PHONE NUMBER FORMATTING
// ============================================

/**
 * Format phone number for WhatsApp
 * Handles Sri Lankan phone numbers by default
 */
export function formatPhoneNumber(phoneNumber: string): string {
  // Remove spaces, dashes, parentheses
  let formatted = phoneNumber.replace(/[\s\-\(\)]/g, '');
  
  // Add country code if not present (default to Sri Lanka +94)
  if (!formatted.startsWith('+')) {
    if (formatted.startsWith('0')) {
      formatted = '+94' + formatted.substring(1);
    } else if (formatted.startsWith('94')) {
      formatted = '+' + formatted;
    } else {
      formatted = '+94' + formatted;
    }
  }
  
  return formatted;
}

// ============================================
// WHATSAPP URL GENERATION
// ============================================

/**
 * Detect if WhatsApp Desktop is likely available
 * This is a best-effort detection based on platform
 */
function isDesktopPlatform(): boolean {
  if (typeof navigator === 'undefined') return false;
  
  const userAgent = navigator.userAgent.toLowerCase();
  const isMobile = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent);
  
  return !isMobile;
}

/**
 * Generate WhatsApp URL with message
 * Uses whatsapp:// protocol for desktop, web.whatsapp.com for mobile
 */
export function generateWhatsAppURL(phoneNumber: string, message: string, preferDesktop: boolean = true): string {
  const formattedPhone = formatPhoneNumber(phoneNumber);
  const phoneWithoutPlus = formattedPhone.replace('+', '');
  const encodedMessage = encodeURIComponent(message);
  
  // Use WhatsApp Desktop protocol if on desktop and preferred
  if (preferDesktop && isDesktopPlatform()) {
    return `whatsapp://send?phone=${phoneWithoutPlus}&text=${encodedMessage}`;
  }
  
  // Use WhatsApp Web for mobile or when desktop is not preferred
  return `https://web.whatsapp.com/send?phone=${phoneWithoutPlus}&text=${encodedMessage}`;
}

/**
 * Open WhatsApp with message
 * Tries desktop app first, falls back to web
 */
export function openWhatsApp(phoneNumber: string, message: string): void {
  const url = generateWhatsAppURL(phoneNumber, message, true);
  window.open(url, '_blank');
}

// ============================================
// MESSAGE TEMPLATES
// ============================================

/**
 * Generate invoice payment reminder message
 */
export function generateInvoiceReminderMessage(
  data: InvoiceReminderData,
  template?: string
): string {
  const defaultTemplate = data.isOverdue 
    ? `🔴 *OVERDUE PAYMENT REMINDER*

Dear {{customerName}},

Your invoice #{{invoiceNumber}} from *{{shopName}}* is now OVERDUE.

📋 Invoice Details:
• Invoice #: {{invoiceNumber}}
• Total Amount: Rs.{{totalAmount}}
• Paid: Rs.{{paidAmount}}
• *Balance Due: Rs.{{dueAmount}}*
• Due Date: {{dueDate}}

⚠️ This payment is overdue. Please settle the balance at your earliest convenience to avoid any inconvenience.

📞 Contact: {{shopPhone}}

Thank you for your prompt attention! 🙏`
    : `📄 *PAYMENT REMINDER*

Dear {{customerName}},

This is a friendly reminder about your pending payment:

📋 Invoice Details:
• Invoice #: {{invoiceNumber}}
• Total Amount: Rs.{{totalAmount}}
• Paid: Rs.{{paidAmount}}
• *Balance Due: Rs.{{dueAmount}}*
• Due Date: {{dueDate}}

Please settle the outstanding balance by the due date.

📞 Contact: {{shopPhone}}

Thank you for your business! 🙏`;

  const messageTemplate = template || defaultTemplate;
  
  return messageTemplate
    .replace(/\{\{customerName\}\}/g, data.customerName)
    .replace(/\{\{invoiceNumber\}\}/g, data.invoiceNumber)
    .replace(/\{\{totalAmount\}\}/g, data.totalAmount.toLocaleString())
    .replace(/\{\{paidAmount\}\}/g, data.paidAmount.toLocaleString())
    .replace(/\{\{dueAmount\}\}/g, data.dueAmount.toLocaleString())
    .replace(/\{\{dueDate\}\}/g, data.dueDate)
    .replace(/\{\{shopName\}\}/g, data.shopName)
    .replace(/\{\{shopPhone\}\}/g, data.shopPhone || 'N/A')
    .replace(/\{\{shopAddress\}\}/g, data.shopAddress || 'N/A');
}

/**
 * Generate GRN payment reminder message
 */
export function generateGRNReminderMessage(
  data: GRNReminderData,
  template?: string
): string {
  const defaultTemplate = data.isOverdue
    ? `🔴 *OVERDUE GRN PAYMENT*

Dear {{supplierName}},

This is regarding the overdue payment for GRN #{{grnNumber}} from *{{shopName}}*.

📋 GRN Details:
• GRN #: {{grnNumber}}
• Total Amount: Rs.{{totalAmount}}
• Paid: Rs.{{paidAmount}}
• *Balance Due: Rs.{{balanceDue}}*
• Received Date: {{receivedDate}}

⚠️ Please note that this payment is overdue. Kindly arrange for settlement.

📞 Contact: {{shopPhone}}

Thank you! 🙏`
    : `📦 *GRN PAYMENT REMINDER*

Dear {{supplierName}},

This is a reminder about the pending payment for:

📋 GRN Details:
• GRN #: {{grnNumber}}
• Total Amount: Rs.{{totalAmount}}
• Paid: Rs.{{paidAmount}}
• *Balance Due: Rs.{{balanceDue}}*
• Received Date: {{receivedDate}}

Please arrange for the payment at your earliest convenience.

📞 Contact: {{shopPhone}}

Thank you for your partnership! 🙏`;

  const messageTemplate = template || defaultTemplate;
  
  return messageTemplate
    .replace(/\{\{supplierName\}\}/g, data.supplierName)
    .replace(/\{\{grnNumber\}\}/g, data.grnNumber)
    .replace(/\{\{totalAmount\}\}/g, data.totalAmount.toLocaleString())
    .replace(/\{\{paidAmount\}\}/g, data.paidAmount.toLocaleString())
    .replace(/\{\{balanceDue\}\}/g, data.balanceDue.toLocaleString())
    .replace(/\{\{receivedDate\}\}/g, data.receivedDate)
    .replace(/\{\{dueDate\}\}/g, data.dueDate || 'N/A')
    .replace(/\{\{shopName\}\}/g, data.shopName)
    .replace(/\{\{shopPhone\}\}/g, data.shopPhone || 'N/A');
}

/**
 * Generate quotation follow-up message
 */
export function generateQuotationMessage(
  data: QuotationReminderData,
  template?: string
): string {
  const defaultTemplate = `📝 *QUOTATION FOLLOW-UP*

Dear {{customerName}},

We hope this message finds you well! We wanted to follow up on our quotation:

📋 Quotation Details:
• Quotation #: {{quotationNumber}}
• Total Amount: Rs.{{totalAmount}}
• Valid Until: {{validUntil}}

Please let us know if you have any questions or would like to proceed with the order.

📞 Contact: {{shopPhone}}

Thank you for considering *{{shopName}}*! 🙏`;

  const messageTemplate = template || defaultTemplate;
  
  return messageTemplate
    .replace(/\{\{customerName\}\}/g, data.customerName)
    .replace(/\{\{quotationNumber\}\}/g, data.quotationNumber)
    .replace(/\{\{totalAmount\}\}/g, data.totalAmount.toLocaleString())
    .replace(/\{\{validUntil\}\}/g, data.validUntil)
    .replace(/\{\{shopName\}\}/g, data.shopName)
    .replace(/\{\{shopPhone\}\}/g, data.shopPhone || 'N/A');
}

// ============================================
// SEND FUNCTIONS
// ============================================

/**
 * Send invoice payment reminder via WhatsApp
 */
export function sendInvoiceReminder(
  phoneNumber: string,
  data: InvoiceReminderData,
  template?: string
): void {
  const message = generateInvoiceReminderMessage(data, template);
  openWhatsApp(phoneNumber, message);
}

/**
 * Send GRN payment reminder via WhatsApp
 */
export function sendGRNReminder(
  phoneNumber: string,
  data: GRNReminderData,
  template?: string
): void {
  const message = generateGRNReminderMessage(data, template);
  openWhatsApp(phoneNumber, message);
}

/**
 * Send quotation follow-up via WhatsApp
 */
export function sendQuotationReminder(
  phoneNumber: string,
  data: QuotationReminderData,
  template?: string
): void {
  const message = generateQuotationMessage(data, template);
  openWhatsApp(phoneNumber, message);
}

/**
 * Send custom message via WhatsApp
 */
export function sendCustomMessage(phoneNumber: string, message: string): void {
  openWhatsApp(phoneNumber, message);
}

// ============================================
// EXPORT SERVICE OBJECT
// ============================================

export const whatsappService = {
  // URL generation
  formatPhoneNumber,
  generateWhatsAppURL,
  openWhatsApp,
  
  // Message generation
  generateInvoiceReminderMessage,
  generateGRNReminderMessage,
  generateQuotationMessage,
  
  // Send functions
  sendInvoiceReminder,
  sendGRNReminder,
  sendQuotationReminder,
  sendCustomMessage,
};

export default whatsappService;
