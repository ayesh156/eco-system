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
  host: string;
  port: number;
  secure: boolean;
  auth: {
    user: string;
    pass: string;
  };
}

const getEmailConfig = (): EmailConfig => {
  const host = process.env.SMTP_HOST || 'smtp.gmail.com';
  const port = parseInt(process.env.SMTP_PORT || '587');
  const secure = process.env.SMTP_SECURE === 'true';
  const user = process.env.SMTP_USER || '';
  const pass = process.env.SMTP_PASS || '';

  if (!user || !pass) {
    console.warn('⚠️  WARNING: SMTP credentials not configured. Email sending will fail.');
  }

  return { host, port, secure, auth: { user, pass } };
};

// Create reusable transporter
let transporter: Transporter | null = null;

const getTransporter = (): Transporter => {
  if (!transporter) {
    const config = getEmailConfig();
    
    // Add TLS options for better compatibility with Gmail and other providers
    const transportOptions: any = {
      host: config.host,
      port: config.port,
      secure: config.secure,
      auth: config.auth,
      tls: {
        // Reject unauthorized certificates only in production
        rejectUnauthorized: process.env.NODE_ENV === 'production',
      },
    };

    transporter = nodemailer.createTransport(transportOptions);
  }
  return transporter;
};

// ===================================
// Email Templates
// ===================================

interface OTPEmailData {
  email: string;
  otp: string;
  userName?: string;
}

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
    if (!config.auth.user || !config.auth.pass) {
      console.error('❌ SMTP not configured. Cannot send email.');
      // In development, log the OTP to console
      if (process.env.NODE_ENV !== 'production') {
        console.log('📧 [DEV MODE] Password Reset OTP for', data.email, ':', data.otp);
        return { success: true, messageId: 'dev-mode-no-email-sent' };
      }
      return { success: false, error: 'Email service not configured' };
    }

    const transport = getTransporter();
    const fromName = process.env.SMTP_FROM_NAME || 'ECOTEC System';
    const fromEmail = process.env.SMTP_FROM_EMAIL || config.auth.user;

    console.log(`📤 Attempting to send OTP email to: ${data.email}`);

    const mailOptions = {
      from: `"${fromName}" <${fromEmail}>`,
      to: data.email,
      subject: '🔐 Password Reset Code - ECOTEC System',
      text: generateOTPEmailText(data),
      html: generateOTPEmailHTML(data),
    };

    const result = await transport.sendMail(mailOptions);
    console.log('✅ OTP email sent successfully to:', data.email);
    
    return { success: true, messageId: result.messageId };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown email error';
    console.error('❌ Failed to send OTP email:', errorMessage);
    
    // In development, still log the OTP and return success for testing
    if (process.env.NODE_ENV !== 'production') {
      console.log('📧 [DEV MODE - FALLBACK] Password Reset OTP for', data.email, ':', data.otp);
      return { success: true, messageId: 'dev-fallback-otp-logged' };
    }
    
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
    if (!config.auth.user || !config.auth.pass) {
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

export default {
  sendPasswordResetOTP,
  generateOTP,
  verifyEmailConnection,
};
