/**
 * PDF Generation Service
 * Generates invoice PDFs using Puppeteer - MATCHES FRONTEND PrintableInvoice EXACTLY
 */

import puppeteer from 'puppeteer';

// Invoice item interface
interface InvoiceItem {
  productName: string;
  quantity: number;
  unitPrice: number;
  originalPrice?: number;
  total: number;
  warranty?: string; // Product warranty period (e.g., "1 year", "6 months")
}

// Invoice data interface for PDF generation
export interface InvoicePDFData {
  invoiceNumber: string;
  customerName: string;
  customerPhone?: string;
  customerEmail?: string;
  customerAddress?: string;
  date: string;
  dueDate: string;
  items: InvoiceItem[];
  subtotal: number;
  tax: number;
  discount: number;
  total: number;
  paidAmount: number;
  dueAmount: number;
  status: string;
  notes?: string;
  // Shop branding
  shopName: string;
  shopSubName?: string;
  shopAddress?: string;
  shopPhone?: string;
  shopEmail?: string;
  shopLogo?: string; // Base64 encoded logo or URL
}

// Format currency for Sri Lanka
const formatCurrency = (amount: number): string => {
  return `LKR ${amount.toLocaleString('en-LK', { minimumFractionDigits: 2 })}`;
};

// Format date to YYYY-MM-DD
const formatDate = (dateString: string): string => {
  return new Date(dateString).toLocaleDateString('en-GB', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).split('/').reverse().join('-');
};

// Format warranty into short code (e.g., "1 year" -> "[1Y]", "6 months" -> "[6M]")
const formatWarrantyCode = (warranty?: string): string => {
  if (!warranty) return '[N/W]';
  const w = warranty.toLowerCase().trim();
  if (w.includes('lifetime') || w.includes('life time')) return '[L/W]';
  if (w.includes('no warranty') || w === 'n/w' || w === 'none') return '[N/W]';
  // Match patterns like "1 year", "2 years", "6 months", "3 month"
  const yearMatch = w.match(/(\d+)\s*y(ear)?s?/i);
  if (yearMatch) return `[${yearMatch[1]}Y]`;
  const monthMatch = w.match(/(\d+)\s*m(onth)?s?/i);
  if (monthMatch) return `[${monthMatch[1]}M]`;
  const weekMatch = w.match(/(\d+)\s*w(eek)?s?/i);
  if (weekMatch) return `[${weekMatch[1]}W]`;
  const dayMatch = w.match(/(\d+)\s*d(ay)?s?/i);
  if (dayMatch) return `[${dayMatch[1]}D]`;
  // If can't parse, return abbreviated version
  return warranty.length > 5 ? `[${warranty.substring(0, 5)}]` : `[${warranty}]`;
};

// Default building icon SVG for shops without logo
const getDefaultLogoSVG = (): string => {
  return `
    <div style="width: 70px; height: 70px; display: flex; align-items: center; justify-content: center; background: linear-gradient(135deg, #10b981 0%, #3b82f6 100%); border-radius: 12px;">
      <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <rect x="4" y="2" width="16" height="20" rx="2" ry="2"></rect>
        <path d="M9 22v-4h6v4"></path>
        <path d="M8 6h.01"></path>
        <path d="M16 6h.01"></path>
        <path d="M12 6h.01"></path>
        <path d="M12 10h.01"></path>
        <path d="M12 14h.01"></path>
        <path d="M16 10h.01"></path>
        <path d="M16 14h.01"></path>
        <path d="M8 10h.01"></path>
        <path d="M8 14h.01"></path>
      </svg>
    </div>
  `;
};

// Generate the HTML template for the invoice (MATCHES FRONTEND PrintableInvoice EXACTLY)
const generateInvoiceHTML = (data: InvoicePDFData): string => {
  const isWalkIn = data.customerName?.toLowerCase().includes('walk-in') || 
                   data.customerName?.toLowerCase().includes('walkin');

  // Generate items rows
  const itemRows = data.items.map((item) => {
    const warrantyBadge = item.warranty 
      ? `<span style="margin-left: 8px; font-size: 7pt; font-weight: 600; color: #333; background: #f0f0f0; padding: 1px 4px; border-radius: 3px;">${formatWarrantyCode(item.warranty)}</span>`
      : '';
    
    const priceCell = item.originalPrice && item.originalPrice !== item.unitPrice
      ? `<div style="display: flex; flex-direction: column; align-items: flex-end;">
           <span style="text-decoration: line-through; font-size: 7pt;">${formatCurrency(item.originalPrice)}</span>
           <span style="font-weight: 600;">${formatCurrency(item.unitPrice)}</span>
         </div>`
      : formatCurrency(item.unitPrice);
    
    return `
      <tr>
        <td>
          <div class="product-name">${item.productName}${warrantyBadge}</div>
        </td>
        <td style="text-align: center; font-weight: 600;">${item.quantity}</td>
        <td style="text-align: right; font-family: 'Consolas', monospace; font-size: 8pt;">${priceCell}</td>
        <td style="text-align: right; font-weight: 700; font-family: 'Consolas', monospace; font-size: 8pt;">${formatCurrency(item.total)}</td>
      </tr>
    `;
  }).join('');

  // Shop logo section
  const logoSection = data.shopLogo
    ? `<img src="${data.shopLogo}" alt="Shop Logo" style="max-width: 120px; max-height: 80px; object-fit: contain;" />`
    : getDefaultLogoSVG();

  // Address formatted with line breaks
  const formattedAddress = data.shopAddress 
    ? data.shopAddress.split(',').map(line => line.trim()).join('<br>')
    : 'N/A';

  // First word of shop name for invoice title
  const shopFirstWord = data.shopName.split(' ')[0];

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Invoice ${data.invoiceNumber}</title>
  <style>
    /* ═══════════════════════════════════════════════════════════════
       INK-EFFICIENT B&W PRINT OPTIMIZED - MATCHES FRONTEND EXACTLY
       ═══════════════════════════════════════════════════════════════ */
    
    @page {
      size: A4 portrait;
      margin: 10mm 12mm;
    }
    
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: 'Segoe UI', 'Arial', sans-serif;
      font-size: 10pt;
      line-height: 1.4;
      color: #000;
      background: white;
      padding: 12mm 15mm;
    }

    /* HEADER - Company Info */
    .invoice-header {
      display: flex;
      justify-content: space-between;
      align-items: stretch;
      margin-bottom: 8px;
      padding-bottom: 15px;
      border-bottom: 2px solid #000;
    }

    .company-section {
      display: flex;
      align-items: stretch;
      gap: 12px;
    }

    .company-logo {
      width: auto;
      height: auto;
      max-width: 120px;
      max-height: 80px;
      align-self: center;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    .company-info h1 {
      font-size: 16pt;
      font-weight: 700;
      color: #000;
      margin: 0 0 1px 0;
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

    /* TITLE SECTION */
    .invoice-title-section {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      padding: 15px 18px;
      margin-bottom: 15px;
      background: white;
      border: 2px solid #000;
    }

    .invoice-title h2 {
      font-size: 18pt;
      font-weight: 700;
      color: #000;
      margin: 0 0 2px 0;
      text-transform: uppercase;
      letter-spacing: 1px;
    }

    .invoice-title .company-label {
      font-size: 8pt;
      color: #000;
      font-weight: 500;
      text-transform: uppercase;
    }

    .amount-due {
      text-align: right;
    }

    .amount-due label {
      font-size: 8pt;
      color: #000;
      font-weight: 600;
      text-decoration: underline;
    }

    .amount-due .amount {
      font-size: 20pt;
      font-weight: 700;
      color: #000;
      font-family: 'Consolas', 'Monaco', monospace;
    }

    /* INVOICE META */
    .invoice-meta {
      display: flex;
      justify-content: space-between;
      margin-bottom: 18px;
      gap: 20px;
    }

    .bill-to {
      flex: 1;
      padding: 10px;
      border: 1px solid #000;
    }

    .bill-to label {
      font-size: 7pt;
      color: #000;
      display: block;
      margin-bottom: 2px;
      font-weight: 600;
      text-transform: uppercase;
    }

    .bill-to .name {
      font-size: 11pt;
      font-weight: 700;
      color: #000;
      margin-bottom: 2px;
    }

    .bill-to .info {
      font-size: 8pt;
      color: #000;
      line-height: 1.4;
    }

    .invoice-details {
      text-align: right;
    }

    .invoice-details .row {
      display: flex;
      justify-content: flex-end;
      gap: 12px;
      margin-bottom: 4px;
      font-size: 8pt;
    }

    .invoice-details .row label {
      color: #000;
      font-weight: 500;
    }

    .invoice-details .row .value {
      color: #000;
      font-weight: 600;
      min-width: 90px;
      text-align: right;
    }

    /* ITEMS TABLE */
    .items-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 15px;
    }

    .items-table thead th {
      background: white;
      color: #000;
      font-size: 8pt;
      font-weight: 700;
      padding: 8px 10px;
      text-align: left;
      border: 1px solid #000;
      border-bottom: 2px solid #000;
      text-transform: uppercase;
    }

    .items-table thead th:first-child { width: 50%; }
    .items-table thead th:nth-child(2) { width: 10%; text-align: center; }
    .items-table thead th:nth-child(3),
    .items-table thead th:nth-child(4) { width: 20%; text-align: right; }

    .items-table tbody tr {
      border-bottom: 1px solid #000;
    }

    .items-table tbody td {
      padding: 10px;
      font-size: 9pt;
      color: #000;
      vertical-align: top;
      border-left: 1px solid #000;
      border-right: 1px solid #000;
    }

    .items-table tbody td .product-name {
      font-weight: 600;
      color: #000;
    }

    /* TOTALS SECTION */
    .totals-section {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 18px;
      gap: 25px;
    }

    .payment-info {
      flex: 1;
    }

    .payment-info h4 {
      font-size: 8pt;
      font-weight: 700;
      color: #000;
      margin: 0 0 4px 0;
      text-decoration: underline;
    }

    .payment-info p {
      font-size: 8pt;
      color: #000;
      margin: 0;
    }

    .totals-box {
      width: 220px;
      border: 1px solid #000;
      padding: 10px;
    }

    .totals-row {
      display: flex;
      justify-content: space-between;
      padding: 5px 0;
      font-size: 8pt;
      border-bottom: 1px dotted #000;
    }

    .totals-row .label { color: #000; }
    .totals-row .value {
      font-family: 'Consolas', 'Monaco', monospace;
      color: #000;
      font-weight: 500;
    }

    .totals-row.total {
      border-bottom: none;
      padding-top: 8px;
      margin-top: 4px;
      border-top: 2px solid #000;
    }

    .totals-row.total .label {
      font-weight: 700;
      color: #000;
      text-transform: uppercase;
    }

    .totals-row.total .value {
      font-size: 11pt;
      font-weight: 700;
      color: #000;
    }

    /* BALANCE DUE BOX - INK EFFICIENT STYLING */
    .balance-due-box {
      background: #fff;
      border: 2px solid #000;
      padding: 12px 15px;
      margin-top: 12px;
      margin-bottom: 15px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .balance-due-box .label {
      font-size: 10pt;
      font-weight: 800;
      color: #000;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .balance-due-box .value {
      font-size: 13pt;
      font-weight: 900;
      color: #000;
      font-family: 'Consolas', 'Monaco', monospace;
    }

    .balance-due-note {
      text-align: center;
      font-size: 7pt;
      color: #666;
      margin-bottom: 12px;
      font-style: italic;
    }

    /* NOTES SECTION */
    .notes-section {
      background: white;
      border: 1px solid #000;
      padding: 10px 12px;
      margin-bottom: 15px;
    }

    .notes-section h4 {
      font-size: 8pt;
      font-weight: 700;
      color: #000;
      margin: 0 0 6px 0;
      text-transform: uppercase;
      border-bottom: 1px solid #000;
      padding-bottom: 4px;
    }

    .notes-section p {
      font-size: 7pt;
      color: #000;
      margin: 0;
      line-height: 1.5;
    }

    /* FOOTER */
    .footer-section {
      border-top: 2px solid #000;
      padding-top: 12px;
    }

    .footer-section h4 {
      font-size: 7pt;
      font-weight: 700;
      color: #000;
      margin: 0 0 3px 0;
    }

    .footer-section p {
      font-size: 7pt;
      color: #000;
      margin: 0;
      line-height: 1.5;
    }

    .footer-thank-you {
      text-align: center;
      margin-top: 15px;
      padding-top: 12px;
      border-top: 1px dashed #000;
      font-size: 9pt;
      font-weight: 600;
      color: #000;
    }
  </style>
</head>
<body>
  <!-- Header -->
  <div class="invoice-header">
    <div class="company-section">
      <div class="company-logo">
        ${logoSection}
      </div>
      <div class="company-info">
        <h1>${data.shopName}</h1>
        ${data.shopSubName ? `<div class="sub-name">${data.shopSubName}</div>` : ''}
        <div class="details">${formattedAddress}</div>
      </div>
    </div>
    <div class="contact-box">
      <h3>Contact information</h3>
      <div class="info">
        ${data.shopEmail || ''}<br>
        ${data.shopPhone || ''}
      </div>
    </div>
  </div>

  <!-- Invoice Title Section -->
  <div class="invoice-title-section">
    <div class="invoice-title">
      <h2>${shopFirstWord} INVOICE</h2>
      <div class="company-label">${data.shopName} ${data.shopSubName || ''}</div>
    </div>
    <div class="amount-due">
      <label>Amount Due (LKR)</label>
      <div class="amount">${data.dueAmount.toLocaleString('en-LK', { minimumFractionDigits: 2 })}</div>
    </div>
  </div>

  <!-- Bill To & Invoice Details -->
  <div class="invoice-meta">
    <div class="bill-to">
      <label>Bill to:</label>
      ${isWalkIn ? `
        <div class="name">Walk-in Customer</div>
        <div class="info" style="font-style: italic; color: #666;">Cash Sale</div>
      ` : `
        <div class="name">${data.customerName}</div>
        ${data.customerEmail || data.customerPhone ? `
          <div class="info">
            ${data.customerEmail ? `Email: ${data.customerEmail}<br>` : ''}
            ${data.customerPhone ? `Phone: ${data.customerPhone}` : ''}
          </div>
        ` : ''}
      `}
    </div>
    <div class="invoice-details">
      <div class="row">
        <label>Invoice Number:</label>
        <span class="value">${data.invoiceNumber}</span>
      </div>
      <div class="row">
        <label>Invoice Date:</label>
        <span class="value">${formatDate(data.date)}</span>
      </div>
      <div class="row">
        <label>Payment Due:</label>
        <span class="value">${formatDate(data.dueDate)}</span>
      </div>
    </div>
  </div>

  <!-- Items Table -->
  <table class="items-table">
    <thead>
      <tr>
        <th>Items</th>
        <th>Qty</th>
        <th>Price</th>
        <th>Amount</th>
      </tr>
    </thead>
    <tbody>
      ${itemRows}
    </tbody>
  </table>

  <!-- Payment Info & Totals -->
  <div class="totals-section">
    <div class="payment-info">
      <h4>Payment Instruction</h4>
      <p>Payment</p>
    </div>
    <div class="totals-box">
      <div class="totals-row">
        <span class="label">Sub Total:</span>
        <span class="value">${formatCurrency(data.subtotal)}</span>
      </div>
      ${data.tax > 0 ? `
        <div class="totals-row">
          <span class="label">Total tax:</span>
          <span class="value">${formatCurrency(data.tax)}</span>
        </div>
      ` : ''}
      ${data.discount > 0 ? `
        <div class="totals-row">
          <span class="label">Discount:</span>
          <span class="value">-${formatCurrency(data.discount)}</span>
        </div>
      ` : ''}
      <div class="totals-row total">
        <span class="label">Grand total:</span>
        <span class="value">${formatCurrency(data.total)}</span>
      </div>
      ${data.paidAmount > 0 && data.paidAmount < data.total ? `
        <div class="totals-row" style="border-bottom: none; padding-top: 6px;">
          <span class="label">Paid Amount:</span>
          <span class="value" style="color: #000000; font-weight: 600;">${formatCurrency(data.paidAmount)}</span>
        </div>
      ` : ''}
    </div>
  </div>

  <!-- Balance Due Box - Only show if there's a balance -->
  ${data.dueAmount > 0 ? `
    <div class="balance-due-box">
      <span class="label">⚠ BALANCE DUE:</span>
      <span class="value">${formatCurrency(data.dueAmount)}</span>
    </div>
    <p class="balance-due-note">Please settle the outstanding balance at your earliest convenience</p>
  ` : ''}

  <!-- Notes / Terms -->
  <div class="notes-section">
    <h4>Notes / Terms</h4>
    <p>
      PLEASE PRODUCE THE INVOICE FOR WARRANTY. NO WARRANTY FOR CHIP BURNS, PHYSICAL DAMAGE OR CORROSION. 
      Warranty covers only manufacturer's defects. Damage or defect due to other causes such as negligence, 
      misuses, improper operation, power fluctuation, lightening, or other natural disasters, sabotage, or accident etc. 
      (01M) = 30 Days, (03M) = 90 Days, (06M) = 180 Days, (01Y) = 350 Days, (02Y) = 700 Days, (03Y) = 1050 Days, 
      (05Y) = 1750 Days, (10Y) = 3500 Days, (L/W) = Lifetime Warranty. (N/W) = No Warranty).
    </p>
    ${data.notes ? `<p style="margin-top: 8px; padding-top: 4px; border-top: 1px dotted #000;">${data.notes}</p>` : ''}
  </div>

  <!-- Footer -->
  <div class="footer-section">
    <p>We know the world is full of choices. Thank you for selecting us.</p>
  </div>

  <div class="footer-thank-you">
    Thank you for your business!
  </div>
</body>
</html>
  `;
};

/**
 * Generate PDF from invoice data
 * Returns a Buffer containing the PDF
 */
export const generateInvoicePDF = async (data: InvoicePDFData): Promise<Buffer> => {
  let browser = null;
  
  try {
    // Launch headless browser
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
    });
    
    const page = await browser.newPage();
    
    // Set the HTML content
    const html = generateInvoiceHTML(data);
    await page.setContent(html, { waitUntil: 'networkidle0' });
    
    // Generate PDF
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: {
        top: '10mm',
        right: '12mm',
        bottom: '10mm',
        left: '12mm',
      },
    });
    
    return Buffer.from(pdfBuffer);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
};

/**
 * Generate PDF and save to file
 */
export const generateInvoicePDFToFile = async (data: InvoicePDFData, filePath: string): Promise<string> => {
  const fs = await import('fs').then(m => m.promises);
  const pdfBuffer = await generateInvoicePDF(data);
  await fs.writeFile(filePath, pdfBuffer);
  return filePath;
};
