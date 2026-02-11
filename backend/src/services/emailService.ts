/**
 * Email Service for Password Reset OTP
 * Uses nodemailer with modern HTML email templates
 */

import nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';

// ===================================
// Email Configuration
// ===================================

interface EmailConfig {
  user: string;
  pass: string;
}

const getEmailConfig = (): EmailConfig => {
  const user = process.env.SMTP_USER || '';
  const pass = process.env.SMTP_PASS || '';

  if (!user || !pass) {
    console.warn('⚠️  WARNING: SMTP credentials not configured. Email sending will fail.');
  }

  return { user, pass };
};

// Create reusable transporter
let transporter: Transporter | null = null;

/**
 * Create Gmail transporter using built-in 'service: gmail' setting.
 * This is more reliable on cloud platforms like Render.com because:
 * 1. Nodemailer handles all the Gmail-specific settings automatically
 * 2. No need to manually configure host, port, or secure settings
 * 3. Better compatibility with Gmail's OAuth and App Password auth
 *
 * RENDER.COM OPTIMIZATIONS:
 * - IPv4 forced to avoid Render's IPv6 routing issues
 * - Extended timeouts for high-latency cloud connections
 * - TLS settings for proxy compatibility
 */
const createGmailTransporter = (): Transporter => {
  const config = getEmailConfig();
  
  const transportOptions: any = {
    // ─── Use Gmail Service ────────────────────────────────────────────
    service: 'gmail',
    
    // ─── Authentication ───────────────────────────────────────────────
    auth: {
      user: config.user,
      pass: config.pass,
    },

    // ─── FIX #1: Force IPv4 (CRITICAL for Render.com) ─────────────────
    // Render's outbound IPv6 routing to Google is misconfigured/firewalled,
    // causing TCP SYN to hang until OS-level timeout (~75-120s).
    // `family: 4` forces dns.lookup() to return only the A (IPv4) record.
    family: 4,

    // ─── FIX #2: Connection Pooling ───────────────────────────────────
    // Reuse SMTP connections instead of opening new ones each time.
    // maxConnections: 1 prevents hitting Gmail rate limits.
    pool: true,
    maxConnections: 1,
    rateDelta: 20000,
    rateLimit: 5,

    // ─── FIX #3: Cloud-friendly timeouts ──────────────────────────────
    connectionTimeout: 30000,  // 30s to establish TCP + TLS connection
    greetingTimeout: 20000,    // 20s for SMTP EHLO/greeting exchange
    socketTimeout: 60000,      // 60s for socket inactivity (large PDF attachments)

    // ─── FIX #4: TLS options ──────────────────────────────────────────
    tls: {
      rejectUnauthorized: false,
      minVersion: 'TLSv1.2',
      ciphers: 'HIGH:!aNULL:!MD5',
    },

    // ─── FIX #5: Debug logging (ALWAYS ON for Render diagnostics) ─────
    logger: true,
    debug: true,
  };

  console.log(`📧 Creating Gmail transporter (service: gmail, user: ${config.user || 'NOT SET'}, IPv4-only, pool: true, connTimeout: 30s)`);
  return nodemailer.createTransport(transportOptions);
};

const getTransporter = (): Transporter => {
  if (!transporter) {
    transporter = createGmailTransporter();
  }
  return transporter;
};

// Reset transporter on connection errors (stale connections)
const resetTransporter = () => {
  if (transporter) {
    try {
      (transporter as any).close?.();
    } catch (e) {
      // ignore close errors
    }
    transporter = null;
  }
};

/**
 * Wrap a promise with a timeout
 */
const withTimeout = <T>(promise: Promise<T>, ms: number, label: string): Promise<T> => {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`${label} timed out after ${ms / 1000}s`));
    }, ms);
    promise
      .then((result) => { clearTimeout(timer); resolve(result); })
      .catch((err) => { clearTimeout(timer); reject(err); });
  });
};

/**
 * Send email with automatic retry on connection failures.
 * Uses `service: 'gmail'` which handles host/port automatically.
 * 
 * Retry strategy (3 attempts):
 * - Attempt 1: Use cached transporter
 * - Attempt 2: Fresh transporter after 3s delay (handles stale connections)
 * - Attempt 3: Fresh transporter after 5s delay (handles transient network issues)
 * 
 * Each attempt has a 60s hard timeout.
 */
const sendMailWithRetry = async (mailOptions: any): Promise<{ messageId: string }> => {
  const SEND_TIMEOUT = 60000; // 60s hard timeout per attempt
  const config = getEmailConfig();
  
  // Attempt 1: Use cached transporter
  try {
    console.log(`📧 [Attempt 1/3] Sending via Gmail service...`);
    const transport = getTransporter();
    const result = await withTimeout(
      transport.sendMail(mailOptions),
      SEND_TIMEOUT,
      `Gmail service (attempt 1)`
    );
    console.log('✅ [Attempt 1/3] Email sent, messageId:', result.messageId);
    return result;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown';
    console.warn(`⚠️ [Attempt 1/3] Failed: ${errorMessage}`);
    resetTransporter();
  }
    
  // Attempt 2: Fresh transporter after delay
  console.log(`📧 [Attempt 2/3] Retrying with fresh transporter after 3s delay...`);
  await new Promise(resolve => setTimeout(resolve, 3000));
  
  try {
    const freshTransport = createGmailTransporter();
    const result = await withTimeout(
      freshTransport.sendMail(mailOptions),
      SEND_TIMEOUT,
      `Gmail service (attempt 2 - fresh)`
    );
    console.log(`✅ [Attempt 2/3] Email sent via fresh transporter, messageId:`, result.messageId);
    transporter = freshTransport; // Update cache
    return result;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown';
    console.warn(`⚠️ [Attempt 2/3] Failed: ${errorMessage}`);
    resetTransporter();
  }

  // Attempt 3: Final retry with longer delay
  console.log(`📧 [Attempt 3/3] Final attempt with fresh transporter after 5s...`);
  await new Promise(resolve => setTimeout(resolve, 5000));
  
  try {
    const freshTransport = createGmailTransporter();
    const result = await withTimeout(
      freshTransport.sendMail(mailOptions),
      SEND_TIMEOUT,
      `Gmail service (attempt 3 - final)`
    );
    console.log(`✅ [Attempt 3/3] Email sent via fresh transporter, messageId:`, result.messageId);
    transporter = freshTransport; // Update cache
    return result;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown';
    console.error(`❌ [Attempt 3/3] All attempts failed. Last error: ${errorMessage}`);
    console.error(`🚨 SMTP Diagnostics: service=gmail, user=${config.user || 'NOT SET'}`);
    console.error(`🚨 Make sure SMTP_USER and SMTP_PASS env vars are set on Render.`);
    console.error(`🚨 IMPORTANT: Use a Gmail App Password, NOT your regular password!`);
    console.error(`🚨 Generate App Password at: https://myaccount.google.com/apppasswords`);
    resetTransporter();
    throw new Error(`Failed to send email: Connection timeout (all 3 attempts failed). Check SMTP configuration.`);
  }
};

// ===================================
// Email Templates
// ===================================

interface OTPEmailData {
  email: string;
  otp: string;
  userName?: string;
}

// Invoice Email Data Interface
interface InvoiceEmailData {
  email: string;
  customerName: string;
  invoiceNumber: string;
  invoiceDate: string;
  dueDate: string;
  items: Array<{
    productName: string;
    quantity: number;
    unitPrice: number;
    total: number;
    warranty?: string; // Product warranty (e.g., "1 year", "6 months")
  }>;
  subtotal: number;
  tax: number;
  discount: number;
  total: number;
  paidAmount: number;
  dueAmount: number;
  status: string;
  shopName: string;
  shopSubName?: string;
  shopPhone?: string;
  shopEmail?: string;
  shopAddress?: string;
  shopWebsite?: string;
  shopLogo?: string;
  notes?: string;
}

// Format warranty into short code (e.g., "1 year" -> "[1Y]", "6 months" -> "[6M]")
const formatWarrantyCode = (warranty?: string): string => {
  if (!warranty) return '';
  const w = warranty.toLowerCase().trim();
  if (w.includes('lifetime') || w.includes('life time')) return '[L/W]';
  if (w.includes('no warranty') || w === 'n/w' || w === 'none') return '[N/W]';
  const yearMatch = w.match(/(\d+)\s*y(ear)?s?/i);
  if (yearMatch) return `[${yearMatch[1]}Y]`;
  const monthMatch = w.match(/(\d+)\s*m(onth)?s?/i);
  if (monthMatch) return `[${monthMatch[1]}M]`;
  const weekMatch = w.match(/(\d+)\s*w(eek)?s?/i);
  if (weekMatch) return `[${weekMatch[1]}W]`;
  const dayMatch = w.match(/(\d+)\s*d(ay)?s?/i);
  if (dayMatch) return `[${dayMatch[1]}D]`;
  return warranty.length > 5 ? `[${warranty.substring(0, 5)}]` : `[${warranty}]`;
};

// Generate modern invoice email HTML - styled like forgot password theme with shop branding
const generateInvoiceEmailHTML = (data: InvoiceEmailData): string => {
  const currentYear = new Date().getFullYear();
  const statusColor = data.status === 'FULLPAID' ? '#10b981' : data.status === 'HALFPAY' ? '#f59e0b' : '#ef4444';
  const statusText = data.status === 'FULLPAID' ? 'Paid' : data.status === 'HALFPAY' ? 'Partially Paid' : 'Unpaid';
  const shopInitial = data.shopName.charAt(0).toUpperCase();
  
  const itemRows = data.items.map(item => {
    const warrantyBadge = item.warranty ? `<span style="margin-left: 6px; font-size: 11px; font-weight: 700; color: #10b981; background: rgba(16, 185, 129, 0.1); padding: 2px 6px; border-radius: 4px;">${formatWarrantyCode(item.warranty)}</span>` : '';
    return `
    <tr>
      <td style="padding: 14px 16px; border-bottom: 1px solid #e2e8f0; color: #334155; font-size: 14px;">${item.productName}${warrantyBadge}</td>
      <td style="padding: 14px 16px; border-bottom: 1px solid #e2e8f0; color: #64748b; font-size: 14px; text-align: center;">${item.quantity}</td>
      <td style="padding: 14px 16px; border-bottom: 1px solid #e2e8f0; color: #64748b; font-size: 14px; text-align: right;">Rs. ${item.unitPrice.toLocaleString()}</td>
      <td style="padding: 14px 16px; border-bottom: 1px solid #e2e8f0; color: #334155; font-size: 14px; text-align: right; font-weight: 600;">Rs. ${item.total.toLocaleString()}</td>
    </tr>
  `;
  }).join('');

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Invoice #${data.invoiceNumber} - ${data.shopName}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background: linear-gradient(180deg, #f8fafc 0%, #ffffff 100%);">
    <tr>
      <td style="padding: 40px 20px;">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="max-width: 600px; margin: 0 auto;">
          
          <!-- Shop Logo & Name Section (Like Forgot Password Theme) -->
          <tr>
            <td style="text-align: center; padding-bottom: 32px;">
              ${data.shopLogo 
                ? `<img src="${data.shopLogo}" alt="${data.shopName}" style="max-width: 100px; max-height: 80px; margin-bottom: 16px;" />`
                : `<div style="display: inline-block; width: 72px; height: 72px; background: linear-gradient(135deg, #10b981 0%, #3b82f6 100%); border-radius: 18px; line-height: 72px; font-size: 32px; font-weight: bold; color: white; box-shadow: 0 12px 35px rgba(16, 185, 129, 0.25);">
                    ${shopInitial}
                  </div>`
              }
              <h1 style="margin: 16px 0 4px 0; color: #1e293b; font-size: 26px; font-weight: 700;">
                ${data.shopName}
              </h1>
              ${data.shopSubName ? `<p style="margin: 0 0 8px 0; color: #64748b; font-size: 15px; font-weight: 500;">${data.shopSubName}</p>` : ''}
              ${data.shopAddress ? `<p style="margin: 4px 0 0 0; color: #94a3b8; font-size: 13px;">📍 ${data.shopAddress}</p>` : ''}
              <div style="margin-top: 8px; color: #64748b; font-size: 13px;">
                ${data.shopPhone ? `<span style="margin-right: 16px;">📞 ${data.shopPhone}</span>` : ''}
                ${data.shopEmail ? `<span>✉️ ${data.shopEmail}</span>` : ''}
              </div>
            </td>
          </tr>
          
          <!-- Main Card (Like Forgot Password Theme) -->
          <tr>
            <td>
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background: linear-gradient(145deg, #ffffff 0%, #f1f5f9 100%); border: 2px solid #e2e8f0; border-radius: 24px; overflow: hidden; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);">
                
                <!-- Gradient Header Line -->
                <tr>
                  <td style="height: 5px; background: linear-gradient(90deg, #10b981 0%, #3b82f6 100%);"></td>
                </tr>
                
                <!-- Invoice Header -->
                <tr>
                  <td style="padding: 32px 32px 24px 32px;">
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                      <tr>
                        <td>
                          <div style="display: inline-block; width: 56px; height: 56px; background: linear-gradient(135deg, rgba(16, 185, 129, 0.15) 0%, rgba(59, 130, 246, 0.15) 100%); border-radius: 50%; line-height: 56px; text-align: center; margin-bottom: 12px;">
                            <span style="font-size: 26px;">📄</span>
                          </div>
                          <h2 style="margin: 0; color: #1e293b; font-size: 26px; font-weight: 700;">
                            Invoice
                          </h2>
                          <p style="margin: 6px 0 0 0; color: #64748b; font-size: 15px; font-weight: 500;">
                            #${data.invoiceNumber}
                          </p>
                        </td>
                        <td style="text-align: right; vertical-align: top;">
                          <div style="display: inline-block; background: ${statusColor}15; color: ${statusColor}; padding: 10px 20px; border-radius: 25px; font-size: 14px; font-weight: 700; border: 2px solid ${statusColor}30;">
                            ${statusText}
                          </div>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                
                <!-- Customer & Date Info Box (Styled like OTP box) -->
                <tr>
                  <td style="padding: 0 32px 24px 32px;">
                    <div style="background: linear-gradient(145deg, #f0fdf4 0%, #f0f9ff 100%); border: 2px solid rgba(16, 185, 129, 0.2); border-radius: 16px; padding: 20px;">
                      <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                        <tr>
                          <td style="width: 50%; vertical-align: top;">
                            <p style="margin: 0 0 4px 0; color: #10b981; font-size: 11px; text-transform: uppercase; letter-spacing: 1.5px; font-weight: 700;">Bill To</p>
                            <p style="margin: 0; color: #1e293b; font-size: 18px; font-weight: 700;">${data.customerName}</p>
                          </td>
                          <td style="width: 50%; vertical-align: top; text-align: right;">
                            <p style="margin: 0 0 6px 0; color: #64748b; font-size: 13px;">
                              📅 Invoice: <strong style="color: #334155;">${data.invoiceDate}</strong>
                            </p>
                            <p style="margin: 0; color: #64748b; font-size: 13px;">
                              ⏰ Due: <strong style="color: #334155;">${data.dueDate}</strong>
                            </p>
                          </td>
                        </tr>
                      </table>
                    </div>
                  </td>
                </tr>
                
                <!-- Items Table -->
                <tr>
                  <td style="padding: 0 32px 24px 32px;">
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden;">
                      <thead>
                        <tr style="background: linear-gradient(145deg, #f8fafc 0%, #f1f5f9 100%);">
                          <th style="padding: 14px 16px; color: #64748b; font-size: 11px; text-transform: uppercase; letter-spacing: 0.8px; text-align: left; border-bottom: 2px solid #e2e8f0; font-weight: 700;">Item</th>
                          <th style="padding: 14px 16px; color: #64748b; font-size: 11px; text-transform: uppercase; letter-spacing: 0.8px; text-align: center; border-bottom: 2px solid #e2e8f0; font-weight: 700;">Qty</th>
                          <th style="padding: 14px 16px; color: #64748b; font-size: 11px; text-transform: uppercase; letter-spacing: 0.8px; text-align: right; border-bottom: 2px solid #e2e8f0; font-weight: 700;">Price</th>
                          <th style="padding: 14px 16px; color: #64748b; font-size: 11px; text-transform: uppercase; letter-spacing: 0.8px; text-align: right; border-bottom: 2px solid #e2e8f0; font-weight: 700;">Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        ${itemRows}
                      </tbody>
                    </table>
                  </td>
                </tr>
                
                <!-- Totals (Styled like amount display) -->
                <tr>
                  <td style="padding: 0 32px 32px 32px;">
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                      <tr>
                        <td style="width: 50%;"></td>
                        <td style="width: 50%;">
                          <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background: #f8fafc; border-radius: 12px; padding: 4px;">
                            <tr>
                              <td style="padding: 10px 16px; color: #64748b; font-size: 14px;">Subtotal</td>
                              <td style="padding: 10px 16px; color: #334155; font-size: 14px; text-align: right; font-weight: 600;">Rs. ${data.subtotal.toLocaleString()}</td>
                            </tr>
                            ${data.tax > 0 ? `
                            <tr>
                              <td style="padding: 10px 16px; color: #64748b; font-size: 14px;">Tax</td>
                              <td style="padding: 10px 16px; color: #334155; font-size: 14px; text-align: right; font-weight: 600;">Rs. ${data.tax.toLocaleString()}</td>
                            </tr>
                            ` : ''}
                            ${data.discount > 0 ? `
                            <tr>
                              <td style="padding: 10px 16px; color: #10b981; font-size: 14px;">Discount</td>
                              <td style="padding: 10px 16px; color: #10b981; font-size: 14px; text-align: right; font-weight: 600;">- Rs. ${data.discount.toLocaleString()}</td>
                            </tr>
                            ` : ''}
                            <tr>
                              <td colspan="2" style="padding: 0;"><div style="height: 2px; background: linear-gradient(90deg, #10b981 0%, #3b82f6 100%); margin: 8px 0;"></div></td>
                            </tr>
                            <tr>
                              <td style="padding: 12px 16px; color: #1e293b; font-size: 18px; font-weight: 800;">Total</td>
                              <td style="padding: 12px 16px; color: #1e293b; font-size: 18px; font-weight: 800; text-align: right;">Rs. ${data.total.toLocaleString()}</td>
                            </tr>
                            ${data.paidAmount > 0 ? `
                            <tr>
                              <td style="padding: 10px 16px; color: #10b981; font-size: 14px;">✓ Paid</td>
                              <td style="padding: 10px 16px; color: #10b981; font-size: 14px; text-align: right; font-weight: 600;">Rs. ${data.paidAmount.toLocaleString()}</td>
                            </tr>
                            ` : ''}
                            ${data.dueAmount > 0 ? `
                            <tr>
                              <td colspan="2" style="padding: 0;">
                                <div style="margin-top: 8px; background: linear-gradient(145deg, #fef2f2 0%, #fee2e2 100%); border: 2px solid rgba(239, 68, 68, 0.2); border-radius: 10px; padding: 14px 16px; text-align: center;">
                                  <span style="color: #ef4444; font-size: 13px; font-weight: 600;">Balance Due: </span>
                                  <span style="color: #ef4444; font-size: 20px; font-weight: 800;">Rs. ${data.dueAmount.toLocaleString()}</span>
                                </div>
                              </td>
                            </tr>
                            ` : ''}
                          </table>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                
                ${data.notes ? `
                <!-- Notes Section -->
                <tr>
                  <td style="padding: 0 32px 32px 32px;">
                    <div style="background: linear-gradient(145deg, rgba(245, 158, 11, 0.05) 0%, rgba(251, 191, 36, 0.05) 100%); border: 2px solid rgba(245, 158, 11, 0.2); border-radius: 12px; padding: 16px;">
                      <p style="margin: 0 0 6px 0; color: #b45309; font-size: 11px; text-transform: uppercase; letter-spacing: 1px; font-weight: 700;">📝 Notes</p>
                      <p style="margin: 0; color: #78350f; font-size: 14px; line-height: 1.6;">${data.notes}</p>
                    </div>
                  </td>
                </tr>
                ` : ''}
                
                <!-- Thank You Message -->
                <tr>
                  <td style="padding: 0 32px 32px 32px; text-align: center;">
                    <div style="background: linear-gradient(145deg, rgba(16, 185, 129, 0.08) 0%, rgba(59, 130, 246, 0.08) 100%); border-radius: 16px; padding: 28px;">
                      <p style="margin: 0; color: #10b981; font-size: 20px; font-weight: 700;">
                        🙏 Thank you for your business!
                      </p>
                      <p style="margin: 10px 0 0 0; color: #64748b; font-size: 14px;">
                        We appreciate your trust in ${data.shopName}.
                      </p>
                      <p style="margin: 6px 0 0 0; color: #94a3b8; font-size: 12px;">
                        For any queries, please contact us at ${data.shopPhone || data.shopEmail || 'our store'}.
                      </p>
                    </div>
                  </td>
                </tr>
                
                <!-- PDF Attachment Notice -->
                <tr>
                  <td style="padding: 0 32px 32px 32px; text-align: center;">
                    <div style="background: #f1f5f9; border-radius: 10px; padding: 14px;">
                      <p style="margin: 0; color: #64748b; font-size: 13px;">
                        📎 <strong>Invoice PDF attached</strong> - Please keep for your records and warranty claims.
                      </p>
                    </div>
                  </td>
                </tr>
                
              </table>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="padding: 32px 20px; text-align: center;">
              <p style="margin: 0 0 8px 0; color: #64748b; font-size: 13px; font-weight: 600;">
                ${data.shopName}${data.shopSubName ? ' ' + data.shopSubName : ''}
              </p>
              ${data.shopAddress ? `<p style="margin: 4px 0; color: #94a3b8; font-size: 12px;">📍 ${data.shopAddress}</p>` : ''}
              ${data.shopWebsite ? `<p style="margin: 4px 0; color: #64748b; font-size: 12px;">🌐 ${data.shopWebsite}</p>` : ''}
              <p style="margin: 12px 0 0 0; color: #94a3b8; font-size: 11px;">
                © ${currentYear} ${data.shopName}. All rights reserved.
              </p>
              <p style="margin: 4px 0 0 0; color: #cbd5e1; font-size: 11px;">
                This is an automated invoice email from our billing system.
              </p>
            </td>
          </tr>
          
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;
};

// Generate plain text version of invoice email
const generateInvoiceEmailText = (data: InvoiceEmailData): string => {
  const itemLines = data.items.map(item => 
    `  - ${item.productName} x${item.quantity} @ Rs.${item.unitPrice.toLocaleString()} = Rs.${item.total.toLocaleString()}`
  ).join('\n');

  return `
=====================================
INVOICE #${data.invoiceNumber}
=====================================

${data.shopName}
${data.shopAddress || ''}
${data.shopPhone ? 'Phone: ' + data.shopPhone : ''}

-------------------------------------
Bill To: ${data.customerName}
Invoice Date: ${data.invoiceDate}
Due Date: ${data.dueDate}
Status: ${data.status === 'FULLPAID' ? 'Paid' : data.status === 'HALFPAY' ? 'Partially Paid' : 'Unpaid'}
-------------------------------------

ITEMS:
${itemLines}

-------------------------------------
Subtotal:     Rs. ${data.subtotal.toLocaleString()}
${data.tax > 0 ? 'Tax:          Rs. ' + data.tax.toLocaleString() : ''}
${data.discount > 0 ? 'Discount:     -Rs. ' + data.discount.toLocaleString() : ''}
-------------------------------------
TOTAL:        Rs. ${data.total.toLocaleString()}
${data.paidAmount > 0 ? 'Paid:         Rs. ' + data.paidAmount.toLocaleString() : ''}
${data.dueAmount > 0 ? 'BALANCE DUE:  Rs. ' + data.dueAmount.toLocaleString() : ''}
-------------------------------------

${data.notes ? 'Notes: ' + data.notes : ''}

Thank you for your business!

© ${new Date().getFullYear()} ${data.shopName}
${data.shopWebsite || ''}
  `.trim();
};

/**
 * Send Invoice Email
 */
export const sendInvoiceEmail = async (data: InvoiceEmailData): Promise<{ success: boolean; messageId?: string; error?: string }> => {
  try {
    const config = getEmailConfig();
    
    // Check if SMTP is configured
    if (!config.user || !config.pass) {
      console.error('❌ SMTP not configured. Cannot send invoice email.');
      if (process.env.NODE_ENV !== 'production') {
        console.log('📧 [DEV MODE] Invoice email would be sent to:', data.email);
        return { success: true, messageId: 'dev-mode-no-email-sent' };
      }
      return { success: false, error: 'Email service not configured' };
    }

    const fromName = process.env.SMTP_FROM_NAME || data.shopName;
    const fromEmail = process.env.SMTP_FROM_EMAIL || config.user;

    console.log(`📤 Sending invoice email to: ${data.email}`);

    const mailOptions = {
      from: `"${fromName}" <${fromEmail}>`,
      to: data.email,
      subject: `📄 Invoice #${data.invoiceNumber} from ${data.shopName}`,
      text: generateInvoiceEmailText(data),
      html: generateInvoiceEmailHTML(data),
    };

    const result = await sendMailWithRetry(mailOptions);
    console.log('✅ Invoice email sent successfully to:', data.email);
    
    return { success: true, messageId: result.messageId };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown email error';
    console.error('❌ Failed to send invoice email:', errorMessage);
    resetTransporter();
    return { success: false, error: errorMessage };
  }
};

/**
 * Send Invoice Email with PDF Attachment
 */
export const sendInvoiceWithPDF = async (
  data: InvoiceEmailData,
  pdfBuffer: Buffer
): Promise<{ success: boolean; messageId?: string; error?: string }> => {
  try {
    const config = getEmailConfig();
    
    // Check if SMTP is configured
    if (!config.user || !config.pass) {
      console.error('❌ SMTP not configured. Cannot send invoice email with PDF.');
      if (process.env.NODE_ENV !== 'production') {
        console.log('📧 [DEV MODE] Invoice email with PDF would be sent to:', data.email);
        return { success: true, messageId: 'dev-mode-no-email-sent' };
      }
      return { success: false, error: 'Email service not configured' };
    }

    const fromName = process.env.SMTP_FROM_NAME || data.shopName;
    const fromEmail = process.env.SMTP_FROM_EMAIL || config.user;

    console.log(`📤 Sending invoice email with PDF attachment to: ${data.email}`);

    const mailOptions = {
      from: `"${fromName}" <${fromEmail}>`,
      to: data.email,
      subject: `📄 Invoice #${data.invoiceNumber} from ${data.shopName}`,
      text: generateInvoiceEmailText(data),
      html: generateInvoiceEmailHTML(data),
      attachments: [
        {
          filename: `Invoice-${data.invoiceNumber}.pdf`,
          content: pdfBuffer,
          contentType: 'application/pdf',
        },
      ],
    };

    const result = await sendMailWithRetry(mailOptions);
    console.log('✅ Invoice email with PDF sent successfully to:', data.email);
    
    return { success: true, messageId: result.messageId };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown email error';
    console.error('❌ Failed to send invoice email with PDF:', errorMessage);
    resetTransporter();
    return { success: false, error: errorMessage };
  }
};

const generateOTPEmailHTML = (data: OTPEmailData): string => {
  const { otp, userName } = data;
  const otpDigits = otp.split('');
  const currentYear = new Date().getFullYear();

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Password Reset OTP - ECOTEC</title>
  <style>
    @media (prefers-color-scheme: light) {
      body { background-color: #f8fafc !important; }
      .main-bg { background: linear-gradient(145deg, #ffffff 0%, #f1f5f9 100%) !important; border-color: #e2e8f0 !important; }
      .gradient-top { background: linear-gradient(90deg, #10b981 0%, #06b6d4 100%); }
      .text-heading { color: #1e293b !important; }
      .text-body { color: #64748b !important; }
      .otp-box { background: linear-gradient(145deg, #f0fdf4 0%, #f0f9ff 100%) !important; border-color: rgba(16, 185, 129, 0.3) !important; }
      .otp-digit { background: linear-gradient(145deg, #ffffff 0%, #f8fafc 100%) !important; border-color: rgba(16, 185, 129, 0.4) !important; color: #10b981 !important; }
      .warning-box { background: linear-gradient(145deg, rgba(245, 158, 11, 0.05) 0%, rgba(251, 191, 36, 0.05) 100%) !important; border-color: rgba(245, 158, 11, 0.3) !important; }
      .warning-text { color: #ca8a04 !important; }
      .footer-text { color: #94a3b8 !important; }
      .footer-link-text { color: #64748b !important; }
    }
    
    @media (prefers-color-scheme: dark) {
      body { background-color: #0f172a !important; }
      .main-bg { background: linear-gradient(145deg, rgba(30, 41, 59, 0.8) 0%, rgba(15, 23, 42, 0.9) 100%) !important; border-color: rgba(51, 65, 85, 0.5) !important; }
      .gradient-top { background: linear-gradient(90deg, #10b981 0%, #06b6d4 100%); }
      .text-heading { color: #ffffff !important; }
      .text-body { color: #cbd5e1 !important; }
      .otp-box { background: linear-gradient(145deg, rgba(16, 185, 129, 0.1) 0%, rgba(59, 130, 246, 0.1) 100%) !important; border-color: rgba(16, 185, 129, 0.3) !important; }
      .otp-digit { background: linear-gradient(145deg, #1e293b 0%, #0f172a 100%) !important; border-color: rgba(16, 185, 129, 0.4) !important; color: #10b981 !important; }
      .warning-box { background: linear-gradient(145deg, rgba(245, 158, 11, 0.1) 0%, rgba(234, 179, 8, 0.05) 100%) !important; border-color: rgba(245, 158, 11, 0.2) !important; }
      .warning-text { color: #fbbf24 !important; }
      .footer-text { color: #64748b !important; }
      .footer-link-text { color: #94a3b8 !important; }
    }
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background: linear-gradient(180deg, #f8fafc 0%, #ffffff 100%);">
    <tr>
      <td style="padding: 40px 20px;">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="max-width: 480px; margin: 0 auto;">
          
          <!-- Logo Section -->
          <tr>
            <td style="text-align: center; padding-bottom: 32px;">
              <div style="display: inline-block; width: 64px; height: 64px; background: linear-gradient(135deg, #10b981 0%, #3b82f6 100%); border-radius: 16px; line-height: 64px; font-size: 28px; font-weight: bold; color: white; box-shadow: 0 10px 30px rgba(16, 185, 129, 0.2);">
                E
              </div>
              <h1 style="margin: 16px 0 0 0; color: #1e293b; font-size: 24px; font-weight: 600;" class="text-heading">
                ECOTEC System
              </h1>
            </td>
          </tr>
          
          <!-- Main Card -->
          <tr>
            <td>
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background: linear-gradient(145deg, #ffffff 0%, #f1f5f9 100%); border: 2px solid #e2e8f0; border-radius: 24px; overflow: hidden; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);" class="main-bg">
                
                <!-- Decorative gradient overlay -->
                <tr>
                  <td style="height: 4px; background: linear-gradient(90deg, #10b981 0%, #3b82f6 100%);"></td>
                </tr>
                
                <!-- Content -->
                <tr>
                  <td style="padding: 40px 32px;">
                    
                    <!-- Icon -->
                    <div style="text-align: center; margin-bottom: 24px;">
                      <div style="display: inline-block; width: 56px; height: 56px; background: linear-gradient(135deg, rgba(16, 185, 129, 0.15) 0%, rgba(59, 130, 246, 0.15) 100%); border-radius: 50%; line-height: 56px;">
                        <span style="font-size: 28px;">🔐</span>
                      </div>
                    </div>
                    
                    <!-- Greeting -->
                    <h2 style="margin: 0 0 8px 0; color: #1e293b; font-size: 22px; font-weight: 600; text-align: center;" class="text-heading">
                      Password Reset Request
                    </h2>
                    <p style="margin: 0 0 32px 0; color: #64748b; font-size: 15px; line-height: 1.6; text-align: center;" class="text-body">
                      ${userName ? `Hi ${userName}, we` : 'We'} received a request to reset your password. Use the OTP code below to proceed.
                    </p>
                    
                    <!-- OTP Code -->
                    <div style="text-align: center; margin-bottom: 32px;">
                      <p style="margin: 0 0 12px 0; color: #7c8fa0; font-size: 13px; text-transform: uppercase; letter-spacing: 1px;" class="text-body">
                        Your Verification Code
                      </p>
                      <div style="display: inline-block; background: linear-gradient(145deg, #f0fdf4 0%, #f0f9ff 100%); border: 2px solid rgba(16, 185, 129, 0.3); border-radius: 16px; padding: 20px 32px;" class="otp-box">
                        <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin: 0 auto;">
                          <tr>
                            ${otpDigits.map(digit => `
                              <td style="padding: 0 6px;">
                                <div style="width: 44px; height: 56px; background: linear-gradient(145deg, #ffffff 0%, #f8fafc 100%); border: 2px solid rgba(16, 185, 129, 0.4); border-radius: 12px; line-height: 56px; text-align: center;" class="otp-digit">
                                  <span style="font-size: 28px; font-weight: 700; color: #10b981; font-family: 'Courier New', monospace;">${digit}</span>
                                </div>
                              </td>
                            `).join('')}
                          </tr>
                        </table>
                      </div>
                    </div>
                    
                    <!-- Expiry Warning -->
                    <div style="background: linear-gradient(145deg, rgba(245, 158, 11, 0.05) 0%, rgba(251, 191, 36, 0.05) 100%); border: 2px solid rgba(245, 158, 11, 0.3); border-radius: 12px; padding: 16px; margin-bottom: 24px;" class="warning-box">
                      <p style="margin: 0; color: #ca8a04; font-size: 14px; text-align: center; font-weight: 600;" class="warning-text">
                        ⏰ This code expires in <strong>10 minutes</strong>
                      </p>
                    </div>
                    
                    <!-- Security Notice -->
                    <div style="border-top: 2px solid #e2e8f0; padding-top: 24px;">
                      <p style="margin: 0 0 12px 0; color: #64748b; font-size: 13px; text-align: center; font-weight: 600;" class="text-body">
                        🛡️ Security Tips
                      </p>
                      <ul style="margin: 0; padding: 0 0 0 20px; color: #64748b; font-size: 13px; line-height: 1.8;" class="text-body">
                        <li>Never share this code with anyone</li>
                        <li>ECOTEC will never ask for your password</li>
                        <li>If you didn't request this, ignore this email</li>
                      </ul>
                    </div>
                    
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="padding: 32px 20px; text-align: center;">
              <p style="margin: 0 0 8px 0; color: #94a3b8; font-size: 13px;" class="footer-text">
                © ${currentYear} ECOTEC System. All rights reserved.
              </p>
              <p style="margin: 0; color: #cbd5e1; font-size: 12px;" class="footer-link-text">
                This is an automated email. Please do not reply.
              </p>
            </td>
          </tr>
          
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;
};

const generateOTPEmailText = (data: OTPEmailData): string => {
  const { otp, userName } = data;
  return `
ECOTEC System - Password Reset

${userName ? `Hi ${userName},` : 'Hello,'}

We received a request to reset your password.

Your verification code is: ${otp}

This code will expire in 10 minutes.

Security Tips:
- Never share this code with anyone
- ECOTEC will never ask for your password
- If you didn't request this, please ignore this email

© ${new Date().getFullYear()} ECOTEC System. All rights reserved.
  `.trim();
};

// ===================================
// Email Service Functions
// ===================================

interface SendOTPResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

/**
 * Send OTP email for password reset
 */
export const sendPasswordResetOTP = async (data: OTPEmailData): Promise<SendOTPResult> => {
  try {
    const config = getEmailConfig();
    
    // Check if SMTP is configured
    if (!config.user || !config.pass) {
      console.error('❌ SMTP not configured. Cannot send email.');
      // In development, log the OTP to console
      if (process.env.NODE_ENV !== 'production') {
        console.log('📧 [DEV MODE] Password Reset OTP for', data.email, ':', data.otp);
        return { success: true, messageId: 'dev-mode-no-email-sent' };
      }
      return { success: false, error: 'Email service not configured' };
    }

    const fromName = process.env.SMTP_FROM_NAME || 'ECOTEC System';
    const fromEmail = process.env.SMTP_FROM_EMAIL || config.user;

    console.log(`📤 Attempting to send OTP email to: ${data.email}`);

    const mailOptions = {
      from: `"${fromName}" <${fromEmail}>`,
      to: data.email,
      subject: '🔐 Password Reset Code - ECOTEC System',
      text: generateOTPEmailText(data),
      html: generateOTPEmailHTML(data),
    };

    const result = await sendMailWithRetry(mailOptions);
    console.log('✅ OTP email sent successfully to:', data.email);
    
    return { success: true, messageId: result.messageId };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown email error';
    console.error('❌ Failed to send OTP email:', errorMessage);
    resetTransporter();
    return { success: false, error: errorMessage };
  }
};

/**
 * Generate a random 6-digit OTP
 */
export const generateOTP = (): string => {
  const otp = Math.floor(100000 + Math.random() * 900000);
  return otp.toString();
};

/**
 * Verify SMTP connection
 */
export const verifyEmailConnection = async (): Promise<boolean> => {
  try {
    const config = getEmailConfig();
    if (!config.user || !config.pass) {
      console.warn('⚠️  SMTP credentials not set. Email verification skipped.');
      return false;
    }

    const transport = getTransporter();
    await transport.verify();
    console.log('✅ Email service connected successfully');
    return true;
  } catch (error) {
    console.error('❌ Email service connection failed:', error);
    return false;
  }
};

// ===================================
// GRN EMAIL FUNCTIONS
// ===================================

export interface GRNEmailData {
  email: string;
  supplierName: string;
  grnNumber: string;
  date: string;
  items: Array<{
    productName: string;
    quantity: number;
    costPrice: number;
    total: number;
  }>;
  subtotal: number;
  tax: number;
  discount: number;
  totalAmount: number;
  paidAmount: number;
  balanceDue: number;
  paymentStatus: string;
  shopName: string;
  shopSubName?: string;
  shopAddress?: string;
  shopPhone?: string;
  shopEmail?: string;
  shopWebsite?: string;
  shopLogo?: string;
  notes?: string;
}

/**
 * Generate GRN Email HTML - Clean B&W Professional Design
 * Matches the PrintableGRN frontend component design
 * @param data - GRN email data
 * @param includePdfAttachment - Whether PDF is attached (shows notice if true)
 */
const generateGRNEmailHTML = (data: GRNEmailData, includePdfAttachment: boolean = false): string => {
  const currentYear = new Date().getFullYear();
  const statusColor = data.paymentStatus === 'PAID' ? '#10b981' : data.paymentStatus === 'PARTIAL' ? '#f59e0b' : '#ef4444';
  const statusText = data.paymentStatus === 'PAID' ? 'Paid' : data.paymentStatus === 'PARTIAL' ? 'Partially Paid' : 'Unpaid';
  const shopInitial = data.shopName.charAt(0).toUpperCase();
  
  const itemRows = data.items.map(item => `
    <tr>
      <td style="padding: 14px 16px; border-bottom: 1px solid #e2e8f0; color: #334155; font-size: 14px;">
        <div style="font-weight: 600;">${item.productName}</div>
      </td>
      <td style="padding: 14px 16px; border-bottom: 1px solid #e2e8f0; color: #64748b; font-size: 14px; text-align: center;">${item.quantity}</td>
      <td style="padding: 14px 16px; border-bottom: 1px solid #e2e8f0; color: #64748b; font-size: 14px; text-align: right;">Rs. ${item.costPrice.toLocaleString()}</td>
      <td style="padding: 14px 16px; border-bottom: 1px solid #e2e8f0; color: #334155; font-size: 14px; text-align: right; font-weight: 600;">Rs. ${item.total.toLocaleString()}</td>
    </tr>
  `).join('');

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>GRN #${data.grnNumber} - ${data.shopName}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background: linear-gradient(180deg, #f8fafc 0%, #ffffff 100%);">
    <tr>
      <td style="padding: 40px 20px;">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="max-width: 600px; margin: 0 auto;">
          
          <!-- Shop Logo & Name Section -->
          <tr>
            <td style="text-align: center; padding-bottom: 32px;">
              ${data.shopLogo 
                ? `<img src="${data.shopLogo}" alt="${data.shopName}" style="max-width: 100px; max-height: 80px; margin-bottom: 16px;" />`
                : `<div style="display: inline-block; width: 72px; height: 72px; background: linear-gradient(135deg, #10b981 0%, #3b82f6 100%); border-radius: 18px; line-height: 72px; font-size: 32px; font-weight: bold; color: white; box-shadow: 0 12px 35px rgba(16, 185, 129, 0.25);">
                    ${shopInitial}
                  </div>`
              }
              <h1 style="margin: 16px 0 4px 0; color: #1e293b; font-size: 26px; font-weight: 700;">
                ${data.shopName}
              </h1>
              ${data.shopSubName ? `<p style="margin: 0 0 8px 0; color: #64748b; font-size: 15px; font-weight: 500;">${data.shopSubName}</p>` : ''}
              ${data.shopAddress ? `<p style="margin: 4px 0 0 0; color: #94a3b8; font-size: 13px;">📍 ${data.shopAddress}</p>` : ''}
              <div style="margin-top: 8px; color: #64748b; font-size: 13px;">
                ${data.shopPhone ? `<span style="margin-right: 16px;">📞 ${data.shopPhone}</span>` : ''}
                ${data.shopEmail ? `<span>✉️ ${data.shopEmail}</span>` : ''}
              </div>
            </td>
          </tr>
          
          <!-- Main Card -->
          <tr>
            <td>
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background: linear-gradient(145deg, #ffffff 0%, #f1f5f9 100%); border: 2px solid #e2e8f0; border-radius: 24px; overflow: hidden; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);">
                
                <!-- Gradient Header Line -->
                <tr>
                  <td style="height: 5px; background: linear-gradient(90deg, #10b981 0%, #3b82f6 100%);"></td>
                </tr>
                
                <!-- GRN Header -->
                <tr>
                  <td style="padding: 32px 32px 24px 32px;">
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                      <tr>
                        <td>
                          <div style="display: inline-block; width: 56px; height: 56px; background: linear-gradient(135deg, rgba(16, 185, 129, 0.15) 0%, rgba(59, 130, 246, 0.15) 100%); border-radius: 50%; line-height: 56px; text-align: center; margin-bottom: 12px;">
                            <span style="font-size: 26px;">📦</span>
                          </div>
                          <h2 style="margin: 0; color: #1e293b; font-size: 26px; font-weight: 700;">
                            Goods Received Note
                          </h2>
                          <p style="margin: 6px 0 0 0; color: #64748b; font-size: 15px; font-weight: 500;">
                            #${data.grnNumber}
                          </p>
                        </td>
                        <td style="text-align: right; vertical-align: top;">
                          <div style="display: inline-block; background: ${statusColor}15; color: ${statusColor}; padding: 10px 20px; border-radius: 25px; font-size: 14px; font-weight: 700; border: 2px solid ${statusColor}30;">
                            ${statusText}
                          </div>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                
                <!-- Supplier & Date Info Box -->
                <tr>
                  <td style="padding: 0 32px 24px 32px;">
                    <div style="background: linear-gradient(145deg, #f0fdf4 0%, #f0f9ff 100%); border: 2px solid rgba(16, 185, 129, 0.2); border-radius: 16px; padding: 20px;">
                      <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                        <tr>
                          <td style="width: 50%; vertical-align: top;">
                            <p style="margin: 0 0 4px 0; color: #10b981; font-size: 11px; text-transform: uppercase; letter-spacing: 1.5px; font-weight: 700;">Supplier</p>
                            <p style="margin: 0; color: #1e293b; font-size: 18px; font-weight: 700;">🏭 ${data.supplierName}</p>
                          </td>
                          <td style="width: 50%; vertical-align: top; text-align: right;">
                            <p style="margin: 0 0 6px 0; color: #64748b; font-size: 13px;">
                              📅 Date: <strong style="color: #334155;">${data.date}</strong>
                            </p>
                            <p style="margin: 0; color: #64748b; font-size: 13px;">
                              📋 GRN: <strong style="color: #334155;">${data.grnNumber}</strong>
                            </p>
                          </td>
                        </tr>
                      </table>
                    </div>
                  </td>
                </tr>
                
                <!-- Items Table -->
                <tr>
                  <td style="padding: 0 32px 24px 32px;">
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden;">
                      <thead>
                        <tr style="background: linear-gradient(145deg, #f8fafc 0%, #f1f5f9 100%);">
                          <th style="padding: 14px 16px; color: #64748b; font-size: 11px; text-transform: uppercase; letter-spacing: 0.8px; text-align: left; border-bottom: 2px solid #e2e8f0; font-weight: 700;">Item</th>
                          <th style="padding: 14px 16px; color: #64748b; font-size: 11px; text-transform: uppercase; letter-spacing: 0.8px; text-align: center; border-bottom: 2px solid #e2e8f0; font-weight: 700;">Qty</th>
                          <th style="padding: 14px 16px; color: #64748b; font-size: 11px; text-transform: uppercase; letter-spacing: 0.8px; text-align: right; border-bottom: 2px solid #e2e8f0; font-weight: 700;">Price</th>
                          <th style="padding: 14px 16px; color: #64748b; font-size: 11px; text-transform: uppercase; letter-spacing: 0.8px; text-align: right; border-bottom: 2px solid #e2e8f0; font-weight: 700;">Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        ${itemRows}
                      </tbody>
                    </table>
                  </td>
                </tr>
                
                <!-- Totals Section -->
                <tr>
                  <td style="padding: 0 32px 32px 32px;">
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                      <tr>
                        <td style="width: 50%;"></td>
                        <td style="width: 50%;">
                          <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background: #f8fafc; border-radius: 12px; padding: 4px;">
                            <tr>
                              <td style="padding: 10px 16px; color: #64748b; font-size: 14px;">Subtotal</td>
                              <td style="padding: 10px 16px; color: #334155; font-size: 14px; text-align: right; font-weight: 600;">Rs. ${data.subtotal.toLocaleString()}</td>
                            </tr>
                            ${data.tax > 0 ? `
                            <tr>
                              <td style="padding: 10px 16px; color: #64748b; font-size: 14px;">Tax</td>
                              <td style="padding: 10px 16px; color: #334155; font-size: 14px; text-align: right; font-weight: 600;">Rs. ${data.tax.toLocaleString()}</td>
                            </tr>
                            ` : ''}
                            ${data.discount > 0 ? `
                            <tr>
                              <td style="padding: 10px 16px; color: #10b981; font-size: 14px;">Discount</td>
                              <td style="padding: 10px 16px; color: #10b981; font-size: 14px; text-align: right; font-weight: 600;">- Rs. ${data.discount.toLocaleString()}</td>
                            </tr>
                            ` : ''}
                            <tr>
                              <td colspan="2" style="padding: 0;"><div style="height: 2px; background: linear-gradient(90deg, #10b981 0%, #3b82f6 100%); margin: 8px 0;"></div></td>
                            </tr>
                            <tr>
                              <td style="padding: 12px 16px; color: #1e293b; font-size: 18px; font-weight: 800;">Total</td>
                              <td style="padding: 12px 16px; color: #1e293b; font-size: 18px; font-weight: 800; text-align: right;">Rs. ${data.totalAmount.toLocaleString()}</td>
                            </tr>
                            ${data.paidAmount > 0 ? `
                            <tr>
                              <td style="padding: 10px 16px; color: #10b981; font-size: 14px;">✓ Paid</td>
                              <td style="padding: 10px 16px; color: #10b981; font-size: 14px; text-align: right; font-weight: 600;">Rs. ${data.paidAmount.toLocaleString()}</td>
                            </tr>
                            ` : ''}
                            ${data.balanceDue > 0 ? `
                            <tr>
                              <td colspan="2" style="padding: 0;">
                                <div style="margin-top: 8px; background: linear-gradient(145deg, #fef3c7 0%, #fef08a 100%); border: 2px solid rgba(245, 158, 11, 0.3); border-radius: 10px; padding: 14px 16px; text-align: center;">
                                  <span style="color: #b45309; font-size: 13px; font-weight: 600;">⚠️ Balance Due: </span>
                                  <span style="color: #b45309; font-size: 20px; font-weight: 800;">Rs. ${data.balanceDue.toLocaleString()}</span>
                                </div>
                              </td>
                            </tr>
                            ` : ''}
                          </table>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                
                ${data.notes ? `
                <!-- Notes Section -->
                <tr>
                  <td style="padding: 0 32px 32px 32px;">
                    <div style="background: linear-gradient(145deg, rgba(245, 158, 11, 0.05) 0%, rgba(251, 191, 36, 0.05) 100%); border: 2px solid rgba(245, 158, 11, 0.2); border-radius: 12px; padding: 16px;">
                      <p style="margin: 0 0 6px 0; color: #b45309; font-size: 11px; text-transform: uppercase; letter-spacing: 1px; font-weight: 700;">📝 Notes</p>
                      <p style="margin: 0; color: #78350f; font-size: 14px; line-height: 1.6;">${data.notes}</p>
                    </div>
                  </td>
                </tr>
                ` : ''}
                
                <!-- Thank You Message -->
                <tr>
                  <td style="padding: 0 32px 32px 32px; text-align: center;">
                    <div style="background: linear-gradient(145deg, rgba(16, 185, 129, 0.08) 0%, rgba(59, 130, 246, 0.08) 100%); border-radius: 16px; padding: 28px;">
                      <p style="margin: 0; color: #10b981; font-size: 20px; font-weight: 700;">
                        🙏 Thank you for your service!
                      </p>
                      <p style="margin: 10px 0 0 0; color: #64748b; font-size: 14px;">
                        We appreciate your partnership with ${data.shopName}.
                      </p>
                      <p style="margin: 6px 0 0 0; color: #94a3b8; font-size: 12px;">
                        For any queries, please contact us at ${data.shopPhone || data.shopEmail || 'our store'}.
                      </p>
                    </div>
                  </td>
                </tr>
                
                <!-- PDF Attachment Notice (conditional) -->
                ${includePdfAttachment ? `
                <tr>
                  <td style="padding: 0 32px 32px 32px; text-align: center;">
                    <div style="background: #f1f5f9; border-radius: 10px; padding: 14px;">
                      <p style="margin: 0; color: #64748b; font-size: 13px;">
                        📎 <strong>GRN PDF attached</strong> - Please keep for your records.
                      </p>
                    </div>
                  </td>
                </tr>
                ` : ''}
                
              </table>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="text-align: center; padding: 32px 20px;">
              <p style="margin: 0 0 8px 0; color: #94a3b8; font-size: 12px;">
                This is an automated email from ${data.shopName}
              </p>
              <p style="margin: 0; color: #cbd5e1; font-size: 11px;">
                © ${currentYear} ${data.shopName}. All rights reserved.
              </p>
            </td>
          </tr>
          
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;
};

/**
 * Generate GRN Email Plain Text
 */
const generateGRNEmailText = (data: GRNEmailData): string => {
  const itemsList = data.items.map(item => 
    `• ${item.productName} - Qty: ${item.quantity} x Rs.${item.costPrice.toLocaleString()} = Rs.${item.total.toLocaleString()}`
  ).join('\n');

  return `
GOODS RECEIVED NOTE - ${data.grnNumber}
==========================================

From: ${data.shopName}
${data.shopAddress || ''}
${data.shopPhone ? 'Phone: ' + data.shopPhone : ''}

Supplier: ${data.supplierName}
Date: ${data.date}
Payment Status: ${data.paymentStatus}

ITEMS
-----
${itemsList}

-------------------------------------
Subtotal:     Rs. ${data.subtotal.toLocaleString()}
${data.tax > 0 ? 'Tax:          Rs. ' + data.tax.toLocaleString() : ''}
${data.discount > 0 ? 'Discount:     -Rs. ' + data.discount.toLocaleString() : ''}
-------------------------------------
TOTAL:        Rs. ${data.totalAmount.toLocaleString()}
${data.paidAmount > 0 ? 'Paid:         Rs. ' + data.paidAmount.toLocaleString() : ''}
${data.balanceDue > 0 ? 'Balance Due:  Rs. ' + data.balanceDue.toLocaleString() : ''}
-------------------------------------

${data.notes ? 'Notes: ' + data.notes : ''}

Thank you for your service!

© ${new Date().getFullYear()} ${data.shopName}
  `.trim();
};

/**
 * Send GRN Email with PDF attachment
 */
export const sendGRNWithPDF = async (
  data: GRNEmailData,
  pdfBase64?: string
): Promise<{ success: boolean; messageId?: string; error?: string; hasPdfAttachment?: boolean }> => {
  try {
    const config = getEmailConfig();
    
    // Check if SMTP is configured
    if (!config.user || !config.pass) {
      console.error('❌ SMTP not configured. Cannot send GRN email.');
      if (process.env.NODE_ENV !== 'production') {
        console.log('📧 [DEV MODE] GRN email would be sent to:', data.email);
        return { success: true, messageId: 'dev-mode-no-email-sent', hasPdfAttachment: !!pdfBase64 };
      }
      return { success: false, error: 'Email service not configured' };
    }

    const fromName = process.env.SMTP_FROM_NAME || data.shopName;
    const fromEmail = process.env.SMTP_FROM_EMAIL || config.user;

    console.log(`📤 Sending GRN email to: ${data.email}`);

    const hasPdfAttachment = !!pdfBase64;

    const mailOptions: {
      from: string;
      to: string;
      subject: string;
      text: string;
      html: string;
      attachments?: Array<{
        filename: string;
        content: Buffer;
        contentType: string;
      }>;
    } = {
      from: `"${fromName}" <${fromEmail}>`,
      to: data.email,
      subject: `📦 GRN #${data.grnNumber} from ${data.shopName}`,
      text: generateGRNEmailText(data),
      html: generateGRNEmailHTML(data, hasPdfAttachment),
    };

    // Add PDF attachment if provided
    if (pdfBase64) {
      // Remove data URL prefix if present
      const base64Data = pdfBase64.replace(/^data:application\/pdf;base64,/, '');
      const pdfBuffer = Buffer.from(base64Data, 'base64');
      
      mailOptions.attachments = [
        {
          filename: `GRN-${data.grnNumber}.pdf`,
          content: pdfBuffer,
          contentType: 'application/pdf',
        },
      ];
    }

    const result = await sendMailWithRetry(mailOptions);
    console.log('✅ GRN email sent successfully to:', data.email);
    
    return { success: true, messageId: result.messageId, hasPdfAttachment: !!pdfBase64 };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown email error';
    console.error('❌ Failed to send GRN email:', errorMessage);
    resetTransporter();
    return { success: false, error: errorMessage };
  }
};

export default {
  sendPasswordResetOTP,
  generateOTP,
  verifyEmailConnection,
  sendGRNWithPDF,
};
