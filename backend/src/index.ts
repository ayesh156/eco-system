import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import crypto from 'crypto';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

// Load environment variables FIRST (before any security config)
// Try multiple paths for tsx compatibility
const envPaths = [
  path.join(process.cwd(), '.env'),
  path.join(process.cwd(), 'backend', '.env'),
  path.resolve(__dirname, '../.env'),
];

for (const envPath of envPaths) {
  if (fs.existsSync(envPath)) {
    console.log(`📁 Loading .env from: ${envPath}`);
    dotenv.config({ path: envPath });
    break;
  }
}

import { errorHandler } from './middleware/errorHandler';
import { notFound } from './middleware/notFound';
import { apiRateLimiter } from './middleware/rateLimiter';
import { sanitizeRequestBody } from './middleware/validation';
import { corsConfig } from './config/security';

// Route imports
import authRoutes from './routes/auth.routes';
import invoiceRoutes from './routes/invoice.routes';
import customerRoutes from './routes/customer.routes';
import productRoutes from './routes/product.routes';
import shopRoutes from './routes/shop.routes';

const app = express();
const PORT = process.env.PORT || 5000;
const isProduction = process.env.NODE_ENV === 'production';

// ===================================
// SECURITY MIDDLEWARE - Order matters!
// ===================================

// 1. Request ID for tracing (NIST AU-3)
app.use((req, _res, next) => {
  (req as any).requestId = req.headers['x-request-id'] || crypto.randomUUID();
  next();
});

// 2. Security headers (Helmet with custom config)
app.use(helmet({
  contentSecurityPolicy: isProduction ? {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"], // For HTML test page
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"],
    },
  } : false,
  crossOriginEmbedderPolicy: false, // Allow embedding for HTML test page
  hsts: isProduction ? { maxAge: 31536000, includeSubDomains: true, preload: true } : false,
}));

// 3. Cookie parser - Required for refresh token cookies
app.use(cookieParser());

// 4. CORS configuration - Using secure config module
app.use(cors({
  origin: corsConfig.validateOrigin,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID'],
  exposedHeaders: ['set-cookie', 'X-Request-ID', 'RateLimit-Limit', 'RateLimit-Remaining', 'RateLimit-Reset'],
  maxAge: 86400, // Cache preflight for 24 hours
}));

// 5. Body parsing with size limits
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// 6. Input sanitization - Prevents XSS and prototype pollution
app.use(sanitizeRequestBody);

// 7. Global rate limiting (applies to all routes)
app.use(apiRateLimiter);

// 8. Logging with request ID
morgan.token('request-id', (req) => (req as any).requestId);
if (!isProduction) {
  app.use(morgan(':method :url :status :response-time ms - :request-id'));
} else {
  app.use(morgan(':remote-addr - :remote-user [:date[clf]] ":method :url HTTP/:http-version" :status :res[content-length] ":referrer" ":user-agent" :request-id'));
}

// 9. Add security response headers
app.use((_req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  if (isProduction) {
    res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
  }
  next();
});

// Health check
app.get('/health', (_req, res) => {
  res.status(200).json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV 
  });
});

// API version prefix
const API_PREFIX = '/api/v1';

// API Test endpoint - Modern HTML response
app.get(`${API_PREFIX}/test`, async (_req, res) => {
  const currentTime = new Date().toLocaleString('en-US', { 
    dateStyle: 'full', 
    timeStyle: 'medium' 
  });

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>ECOTEC API - Online</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
      background: linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #0f172a 100%);
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #e2e8f0;
      overflow: hidden;
    }

    .bg-glow {
      position: fixed;
      width: 500px;
      height: 500px;
      border-radius: 50%;
      filter: blur(120px);
      opacity: 0.4;
      pointer-events: none;
      z-index: 0;
    }

    .glow-1 {
      background: linear-gradient(135deg, #10b981, #06b6d4);
      top: -150px;
      right: -150px;
    }

    .glow-2 {
      background: linear-gradient(135deg, #8b5cf6, #ec4899);
      bottom: -200px;
      left: -150px;
    }

    .container {
      text-align: center;
      z-index: 1;
      padding: 2rem;
      animation: fadeInUp 0.8s ease-out;
    }

    @keyframes fadeInUp {
      from {
        opacity: 0;
        transform: translateY(30px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    @keyframes pulse {
      0%, 100% { 
        transform: scale(1);
        box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.4);
      }
      50% { 
        transform: scale(1.05);
        box-shadow: 0 0 0 20px rgba(16, 185, 129, 0);
      }
    }

    @keyframes float {
      0%, 100% { transform: translateY(0); }
      50% { transform: translateY(-10px); }
    }

    @keyframes spin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }

    .logo-container {
      position: relative;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 120px;
      height: 120px;
      background: linear-gradient(135deg, #10b981, #06b6d4);
      border-radius: 32px;
      margin-bottom: 2rem;
      box-shadow: 0 25px 60px -15px rgba(16, 185, 129, 0.5);
      animation: float 3s ease-in-out infinite;
    }

    .logo-container::before {
      content: '';
      position: absolute;
      inset: -4px;
      background: linear-gradient(135deg, #10b981, #06b6d4, #8b5cf6, #10b981);
      border-radius: 36px;
      z-index: -1;
      animation: spin 4s linear infinite;
      opacity: 0.6;
    }

    .logo {
      font-size: 4rem;
    }

    h1 {
      font-size: 3rem;
      font-weight: 800;
      background: linear-gradient(135deg, #fff 0%, #10b981 50%, #06b6d4 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
      margin-bottom: 0.5rem;
    }

    .subtitle {
      font-size: 1.25rem;
      color: #94a3b8;
      margin-bottom: 2rem;
    }

    .status-card {
      display: inline-flex;
      align-items: center;
      gap: 1rem;
      padding: 1.25rem 2.5rem;
      background: rgba(16, 185, 129, 0.1);
      border: 2px solid rgba(16, 185, 129, 0.3);
      border-radius: 20px;
      margin-bottom: 2rem;
      backdrop-filter: blur(10px);
    }

    .status-dot {
      position: relative;
      width: 16px;
      height: 16px;
      background: #10b981;
      border-radius: 50%;
      animation: pulse 2s ease-in-out infinite;
    }

    .status-dot::before {
      content: '';
      position: absolute;
      inset: -4px;
      background: rgba(16, 185, 129, 0.3);
      border-radius: 50%;
      animation: pulse 2s ease-in-out infinite;
    }

    .status-text {
      font-size: 1.5rem;
      font-weight: 700;
      color: #10b981;
    }

    .version {
      display: inline-block;
      background: rgba(139, 92, 246, 0.2);
      color: #a78bfa;
      padding: 0.5rem 1rem;
      border-radius: 12px;
      font-size: 0.9rem;
      font-weight: 600;
      margin-bottom: 1.5rem;
    }

    .timestamp {
      color: #64748b;
      font-size: 0.875rem;
    }

    .footer {
      margin-top: 2.5rem;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
      color: #64748b;
      font-size: 0.875rem;
    }

    @media (max-width: 640px) {
      h1 {
        font-size: 2rem;
      }
      
      .logo-container {
        width: 100px;
        height: 100px;
      }
      
      .logo {
        font-size: 3rem;
      }
      
      .status-card {
        padding: 1rem 1.5rem;
      }
      
      .status-text {
        font-size: 1.25rem;
      }
    }
  </style>
</head>
<body>
  <div class="bg-glow glow-1"></div>
  <div class="bg-glow glow-2"></div>
  
  <div class="container">
    <div class="logo-container">
      <span class="logo">🚀</span>
    </div>
    
    <h1>ECOTEC API</h1>
    <p class="subtitle">Enterprise Shop Management System</p>
    
    <div class="status-card">
      <span class="status-dot"></span>
      <span class="status-text">API is Working!</span>
    </div>
    
    <div class="version">v1.0.0 • ${process.env.NODE_ENV || 'development'}</div>
    
    <p class="timestamp">${currentTime}</p>
    
    <div class="footer">
      ✨ Powered by Express.js + Prisma + Supabase
    </div>
  </div>
</body>
</html>
  `;

  res.setHeader('Content-Type', 'text/html');
  res.status(200).send(html);
});

// Routes
app.use(`${API_PREFIX}/auth`, authRoutes);
app.use(`${API_PREFIX}/invoices`, invoiceRoutes);
app.use(`${API_PREFIX}/customers`, customerRoutes);
app.use(`${API_PREFIX}/products`, productRoutes);
app.use(`${API_PREFIX}/shops`, shopRoutes);

// Error handling
app.use(notFound);
app.use(errorHandler);

// Start server only if not in serverless environment
if (process.env.VERCEL !== '1') {
  app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`📡 API available at http://localhost:${PORT}${API_PREFIX}`);
  });
}

export default app;
