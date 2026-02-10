/**
 * Client-Side PDF Generation Service
 * 
 * Uses html2canvas + jsPDF to generate PDFs directly in the browser.
 */

import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

export interface PDFGenerationOptions {
  filename?: string;
  quality?: number; // 0.0 to 1.0, default 0.95
  scale?: number; // Canvas scale, default 2 for high quality
  margin?: number; // Margin in mm, default 10
}

/**
 * Generate PDF from an HTML element
 * @param element - The HTML element to convert to PDF
 * @param options - PDF generation options
 * @returns Promise<Blob> - The PDF as a Blob
 */
export async function generatePDFFromElement(
  element: HTMLElement,
  options: PDFGenerationOptions = {}
): Promise<Blob> {
  const {
    quality = 0.95,
    scale = 2,
    margin = 5,
  } = options;

  // Create canvas from HTML element
  const canvas = await html2canvas(element, {
    scale: scale,
    useCORS: true,
    logging: false,
    backgroundColor: '#ffffff',
    // Ensure fonts and images are loaded
    onclone: (document) => {
      // Ensure all elements are visible
      const clonedElement = document.body.querySelector('[data-pdf-content]');
      if (clonedElement) {
        (clonedElement as HTMLElement).style.display = 'block';
      }
    },
  });

  // Calculate dimensions
  const imgWidth = 210 - (margin * 2); // A4 width in mm minus margins
  const imgHeight = (canvas.height * imgWidth) / canvas.width;
  
  // Create PDF
  const pdf = new jsPDF({
    orientation: imgHeight > 297 ? 'portrait' : 'portrait', // Always portrait for invoices
    unit: 'mm',
    format: 'a4',
  });

  // Add image to PDF
  const imgData = canvas.toDataURL('image/jpeg', quality);
  
  // Handle multi-page PDFs if content is taller than A4
  const pageHeight = 297 - (margin * 2); // A4 height minus margins
  let heightLeft = imgHeight;
  let position = margin;

  // First page
  pdf.addImage(imgData, 'JPEG', margin, position, imgWidth, imgHeight);
  heightLeft -= pageHeight;

  // Add additional pages if needed
  while (heightLeft > 0) {
    position = heightLeft - imgHeight + margin;
    pdf.addPage();
    pdf.addImage(imgData, 'JPEG', margin, position, imgWidth, imgHeight);
    heightLeft -= pageHeight;
  }

  // Return as Blob
  return pdf.output('blob');
}

/**
 * Download PDF from an HTML element
 * @param element - The HTML element to convert to PDF
 * @param filename - The filename for the downloaded PDF
 * @param options - PDF generation options
 */
export async function downloadPDFFromElement(
  element: HTMLElement,
  filename: string,
  options: PDFGenerationOptions = {}
): Promise<void> {
  const blob = await generatePDFFromElement(element, options);
  
  // Create download link
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename.endsWith('.pdf') ? filename : `${filename}.pdf`;
  
  // Trigger download
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  // Cleanup
  URL.revokeObjectURL(url);
}

/**
 * Generate PDF and return as base64 data URL
 * Useful for embedding or sharing
 */
export async function generatePDFAsDataURL(
  element: HTMLElement,
  options: PDFGenerationOptions = {}
): Promise<string> {
  const blob = await generatePDFFromElement(element, options);
  
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/**
 * Open WhatsApp with a pre-filled message
 * Uses WhatsApp Desktop protocol (whatsapp://) on desktop,
 * falls back to WhatsApp Web for mobile browsers.
 * 
 * @param phoneNumber - Customer's phone number (with country code)
 * @param message - Pre-filled message text
 */
export function openWhatsAppWithMessage(
  phoneNumber: string,
  message: string
): void {
  // Format phone number (remove spaces, dashes, etc.)
  let formattedPhone = phoneNumber.replace(/[\s\-\(\)]/g, '');
  
  // Add country code if not present (default to Sri Lanka +94)
  if (!formattedPhone.startsWith('+')) {
    if (formattedPhone.startsWith('0')) {
      formattedPhone = '+94' + formattedPhone.substring(1);
    } else if (formattedPhone.startsWith('94')) {
      formattedPhone = '+' + formattedPhone;
    } else {
      formattedPhone = '+94' + formattedPhone;
    }
  }

  // Encode message for URL
  const encodedMessage = encodeURIComponent(message);
  const phoneWithoutPlus = formattedPhone.replace('+', '');
  
  // Detect if on mobile device
  const userAgent = navigator.userAgent.toLowerCase();
  const isMobile = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent);
  
  // Use WhatsApp Desktop protocol on desktop, WhatsApp Web on mobile
  const whatsappUrl = isMobile 
    ? `https://web.whatsapp.com/send?phone=${phoneWithoutPlus}&text=${encodedMessage}`
    : `whatsapp://send?phone=${phoneWithoutPlus}&text=${encodedMessage}`;
  
  window.open(whatsappUrl, '_blank');
}

export const clientPdfService = {
  generatePDFFromElement,
  downloadPDFFromElement,
  generatePDFAsDataURL,
  openWhatsAppWithMessage,
};

export default clientPdfService;
