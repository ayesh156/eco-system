// Vercel Serverless API Handler - Complete CRUD with all features
// Optimized for Vercel Pro with caching and connection pooling
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { PrismaClient, InvoiceStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

// Global Prisma instance to reuse across requests (prevents cold start issues)
const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

const prisma = globalForPrisma.prisma || new PrismaClient({
  log: process.env.NODE_ENV === 'production' ? ['error'] : ['query', 'error'],
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
});

// Always reuse prisma instance in production (Vercel Pro)
globalForPrisma.prisma = prisma;

// JWT Configuration
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-production';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'dev-refresh-secret-change-in-production';
const ACCESS_TOKEN_EXPIRES_IN = '15m';
const REFRESH_TOKEN_EXPIRES_IN = '7d';

// Cache headers for Vercel Edge Network (Pro feature)
function setCacheHeaders(res: VercelResponse, maxAge: number = 10, staleWhileRevalidate: number = 59) {
  // Cache-Control: public responses can be cached by Vercel Edge
  // s-maxage: cache on Vercel Edge for maxAge seconds
  // stale-while-revalidate: serve stale content while revalidating in background
  res.setHeader('Cache-Control', `public, s-maxage=${maxAge}, stale-while-revalidate=${staleWhileRevalidate}`);
}

// CORS headers - Must use specific origin for credentials
function setCorsHeaders(req: VercelRequest, res: VercelResponse) {
  const origin = req.headers.origin || '';
  
  // Allowed origins - add your Vercel frontend URLs here
  const allowedOrigins = [
    process.env.FRONTEND_URL,
    'https://eco-system-brown.vercel.app',  // Main production frontend
    'https://eco-system-hdt8.vercel.app',  // Legacy frontend
    'http://localhost:5173',
    'http://localhost:5174',
    'http://localhost:3000',
  ].filter(Boolean);

  // Also allow any vercel.app subdomain for preview deployments
  const isVercelPreview = origin.endsWith('.vercel.app');
  
  if (allowedOrigins.includes(origin) || isVercelPreview) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  } else if (process.env.FRONTEND_URL) {
    res.setHeader('Access-Control-Allow-Origin', process.env.FRONTEND_URL);
  }
  
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Request-ID');
  res.setHeader('Access-Control-Expose-Headers', 'set-cookie, X-Request-ID');
}

// Parse URL
function parseUrl(url: string) {
  const [path, queryString] = url.split('?');
  const query: Record<string, string> = {};
  if (queryString) {
    queryString.split('&').forEach(param => {
      const [key, value] = param.split('=');
      query[key] = decodeURIComponent(value || '');
    });
  }
  return { path, query };
}

// Extract shopId from JWT token - CRITICAL for multi-tenant isolation
function getShopIdFromToken(req: VercelRequest): string | null {
  const authHeader = req.headers.authorization;
  if (!authHeader || typeof authHeader !== 'string' || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  
  const token = authHeader.substring(7);
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { shopId?: string };
    return decoded.shopId || null;
  } catch {
    return null;
  }
}

// Get user role from JWT token
function getUserRoleFromToken(req: VercelRequest): string | null {
  const authHeader = req.headers.authorization;
  if (!authHeader || typeof authHeader !== 'string' || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  
  const token = authHeader.substring(7);
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { role?: string };
    return decoded.role || null;
  } catch {
    return null;
  }
}

// Get effective shopId for SuperAdmin shop viewing
// SuperAdmin can view any shop by passing shopId query parameter
function getEffectiveShopId(req: VercelRequest, query: Record<string, string>): string | null {
  const userRole = getUserRoleFromToken(req);
  const userShopId = getShopIdFromToken(req);
  const queryShopId = query.shopId;
  
  // Debug logging for production troubleshooting
  console.log('🔍 getEffectiveShopId:', { userRole, userShopId, queryShopId });
  
  // SuperAdmin can view any shop by passing shopId query parameter
  if (userRole === 'SUPER_ADMIN' && queryShopId) {
    console.log('✅ SuperAdmin viewing shop:', queryShopId);
    return queryShopId;
  }
  
  return userShopId;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCorsHeaders(req, res);

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { path, query: parsedQuery } = parseUrl(req.url || '/');
  const method = req.method || 'GET';
  const body = req.body || {};
  
  // Merge Vercel's req.query with parsed query for compatibility
  // Vercel provides query params in req.query as string | string[] | undefined
  const query: Record<string, string> = { ...parsedQuery };
  if (req.query) {
    Object.entries(req.query).forEach(([key, value]) => {
      if (typeof value === 'string') {
        query[key] = value;
      } else if (Array.isArray(value) && value.length > 0) {
        query[key] = value[0];
      }
    });
  }
  
  // Get shopId from authenticated user's token
  const shopId = getShopIdFromToken(req);

  try {
    // Health check
    if (path === '/health' || path === '/') {
      return res.status(200).json({ 
        status: 'ok', 
        timestamp: new Date().toISOString(),
        message: 'EcoSystem API running'
      });
    }

    // Use global prisma instance (no await needed)
    const db = prisma;

    // ==================== AUTH ROUTES ====================
    
    // Login
    if (path === '/api/v1/auth/login' && method === 'POST') {
      const { email, password } = body;

      if (!email || !password) {
        return res.status(400).json({ success: false, message: 'Email and password are required' });
      }

      const user = await db.user.findUnique({
        where: { email: email.toLowerCase() },
        include: { shop: { select: { id: true, name: true, slug: true } } },
      });

      if (!user) {
        return res.status(401).json({ success: false, message: 'Invalid credentials' });
      }

      const isValidPassword = await bcrypt.compare(password, user.password);
      if (!isValidPassword) {
        return res.status(401).json({ success: false, message: 'Invalid credentials' });
      }

      const tokenPayload = {
        id: user.id,
        email: user.email,
        role: user.role,
        shopId: user.shopId,
      };

      const accessToken = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: ACCESS_TOKEN_EXPIRES_IN });
      const refreshToken = jwt.sign({ id: user.id }, JWT_REFRESH_SECRET, { expiresIn: REFRESH_TOKEN_EXPIRES_IN });

      // Set refresh token cookie
      res.setHeader('Set-Cookie', `refreshToken=${refreshToken}; HttpOnly; Secure; SameSite=None; Path=/; Max-Age=${7 * 24 * 60 * 60}`);

      return res.status(200).json({
        success: true,
        message: 'Login successful',
        data: {
          user: {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
            shop: user.shop,
          },
          accessToken,
        },
      });
    }

    // Register
    if (path === '/api/v1/auth/register' && method === 'POST') {
      const { email, password, name, shopSlug } = body;

      if (!email || !password || !name) {
        return res.status(400).json({ success: false, message: 'Email, password, and name are required' });
      }

      const existingUser = await db.user.findUnique({
        where: { email: email.toLowerCase() },
      });

      if (existingUser) {
        return res.status(409).json({ success: false, message: 'User with this email already exists' });
      }

      let shopId: string | null = null;
      if (shopSlug) {
        const shop = await db.shop.findUnique({ where: { slug: shopSlug } });
        if (!shop) {
          return res.status(404).json({ success: false, message: 'Shop not found' });
        }
        shopId = shop.id;
      }

      const hashedPassword = await bcrypt.hash(password, 12);

      const user = await db.user.create({
        data: {
          email: email.toLowerCase(),
          password: hashedPassword,
          name,
          shopId,
          role: 'STAFF',
        },
        include: { shop: { select: { id: true, name: true, slug: true } } },
      });

      const tokenPayload = {
        id: user.id,
        email: user.email,
        role: user.role,
        shopId: user.shopId,
      };

      const accessToken = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: ACCESS_TOKEN_EXPIRES_IN });
      const refreshToken = jwt.sign({ id: user.id }, JWT_REFRESH_SECRET, { expiresIn: REFRESH_TOKEN_EXPIRES_IN });

      res.setHeader('Set-Cookie', `refreshToken=${refreshToken}; HttpOnly; Secure; SameSite=None; Path=/; Max-Age=${7 * 24 * 60 * 60}`);

      return res.status(201).json({
        success: true,
        message: 'User registered successfully',
        data: {
          user: {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
            shop: user.shop,
          },
          accessToken,
        },
      });
    }

    // Refresh Token
    if (path === '/api/v1/auth/refresh' && method === 'POST') {
      const cookies = req.headers.cookie || '';
      const refreshToken = cookies.split(';').find(c => c.trim().startsWith('refreshToken='))?.split('=')[1];

      if (!refreshToken) {
        return res.status(401).json({ success: false, message: 'No refresh token provided' });
      }

      try {
        const decoded = jwt.verify(refreshToken, JWT_REFRESH_SECRET) as { id: string };
        
        const user = await db.user.findUnique({
          where: { id: decoded.id },
          include: { shop: { select: { id: true, name: true, slug: true } } },
        });

        if (!user) {
          return res.status(401).json({ success: false, message: 'User not found' });
        }

        const tokenPayload = {
          id: user.id,
          email: user.email,
          role: user.role,
          shopId: user.shopId,
        };

        const newAccessToken = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: ACCESS_TOKEN_EXPIRES_IN });
        const newRefreshToken = jwt.sign({ id: user.id }, JWT_REFRESH_SECRET, { expiresIn: REFRESH_TOKEN_EXPIRES_IN });

        res.setHeader('Set-Cookie', `refreshToken=${newRefreshToken}; HttpOnly; Secure; SameSite=None; Path=/; Max-Age=${7 * 24 * 60 * 60}`);

        return res.status(200).json({
          success: true,
          data: {
            user: {
              id: user.id,
              email: user.email,
              name: user.name,
              role: user.role,
              shop: user.shop,
            },
            accessToken: newAccessToken,
          },
        });
      } catch (err) {
        return res.status(401).json({ success: false, message: 'Invalid refresh token' });
      }
    }

    // Logout
    if (path === '/api/v1/auth/logout' && method === 'POST') {
      res.setHeader('Set-Cookie', `refreshToken=; HttpOnly; Secure; SameSite=None; Path=/; Max-Age=0`);
      return res.status(200).json({ success: true, message: 'Logged out successfully' });
    }

    // Get current user
    if (path === '/api/v1/auth/me' && method === 'GET') {
      const authHeader = req.headers.authorization;
      if (!authHeader?.startsWith('Bearer ')) {
        return res.status(401).json({ success: false, message: 'No token provided' });
      }

      const token = authHeader.substring(7);
      try {
        const decoded = jwt.verify(token, JWT_SECRET) as { id: string };
        const user = await db.user.findUnique({
          where: { id: decoded.id },
          include: { shop: { select: { id: true, name: true, slug: true } } },
        });

        if (!user) {
          return res.status(404).json({ success: false, message: 'User not found' });
        }

        return res.status(200).json({
          success: true,
          data: {
            user: {
              id: user.id,
              email: user.email,
              name: user.name,
              role: user.role,
              shop: user.shop,
            },
          },
        });
      } catch (err) {
        return res.status(401).json({ success: false, message: 'Invalid token' });
      }
    }

    // ==================== INVOICE STATS (cached for 30 seconds) ====================
    if (path === '/api/v1/invoices/stats' && method === 'GET') {
      // Get effective shopId (supports SuperAdmin shop viewing)
      const effectiveShopId = getEffectiveShopId(req, query);
      if (!effectiveShopId) {
        return res.status(401).json({ success: false, message: 'Authentication required' });
      }
      
      // Enable edge caching for stats (Pro feature)
      setCacheHeaders(res, 30, 60);
      
      const invoices = await db.invoice.findMany({
        where: { shopId: effectiveShopId }, // CRITICAL: Filter by effectiveShopId
        include: { payments: true },
      });
      
      const statusStats: Record<string, { count: number; total: number; paid: number; due: number }> = {};
      let totalRevenue = 0, totalPaid = 0, totalDue = 0, totalTax = 0, totalDiscount = 0;
      
      invoices.forEach((inv: any) => {
        if (!statusStats[inv.status]) {
          statusStats[inv.status] = { count: 0, total: 0, paid: 0, due: 0 };
        }
        statusStats[inv.status].count++;
        statusStats[inv.status].total += inv.total;
        statusStats[inv.status].paid += inv.paidAmount;
        statusStats[inv.status].due += inv.dueAmount;
        
        totalRevenue += inv.total;
        totalPaid += inv.paidAmount;
        totalDue += inv.dueAmount;
        totalTax += inv.tax;
        totalDiscount += inv.discount;
      });
      
      return res.status(200).json({
        success: true,
        data: {
          totalInvoices: invoices.length,
          statusStats,
          revenue: {
            total: totalRevenue,
            paid: totalPaid,
            due: totalDue,
            tax: totalTax,
            discount: totalDiscount,
            average: invoices.length > 0 ? totalRevenue / invoices.length : 0,
          },
          recentInvoices: invoices.slice(0, 5),
        },
      });
    }

    // ==================== INVOICES LIST ====================
    if (path === '/api/v1/invoices' && method === 'GET') {
      // Get effective shopId (supports SuperAdmin shop viewing)
      const effectiveShopId = getEffectiveShopId(req, query);
      if (!effectiveShopId) {
        return res.status(401).json({ success: false, message: 'Authentication required' });
      }
      
      const page = parseInt(query.page || '1');
      const limit = parseInt(query.limit || '100');
      const status = query.status;
      const customerId = query.customerId;
      const search = query.search;
      const sortBy = query.sortBy || 'date';
      const sortOrder = (query.sortOrder || 'desc') as 'asc' | 'desc';

      const where: any = { shopId: effectiveShopId }; // CRITICAL: Always filter by effectiveShopId
      if (status && status !== 'all') {
        where.status = status.toUpperCase();
      }
      if (customerId && customerId !== 'all') {
        where.customerId = customerId;
      }
      if (search) {
        where.OR = [
          { invoiceNumber: { contains: search, mode: 'insensitive' } },
          { customerName: { contains: search, mode: 'insensitive' } },
        ];
      }

      const orderBy: any = {};
      orderBy[sortBy === 'invoiceNumber' ? 'invoiceNumber' : sortBy === 'total' ? 'total' : 'date'] = sortOrder;

      const [invoices, total] = await Promise.all([
        db.invoice.findMany({
          where,
          include: {
            customer: true,
            items: { include: { product: true } },
            payments: { orderBy: { paymentDate: 'desc' } },
            _count: { select: { reminders: true } },
          },
          orderBy,
          skip: (page - 1) * limit,
          take: limit,
        }),
        db.invoice.count({ where }),
      ]);

      // Map invoices to include reminderCount at top level
      const invoicesWithReminderCount = invoices.map((inv: any) => ({
        ...inv,
        reminderCount: inv._count?.reminders || 0,
      }));

      return res.status(200).json({
        success: true,
        data: invoicesWithReminderCount,
        pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
      });
    }

    // ==================== GET SINGLE INVOICE (with caching) ====================
    const invoiceGetMatch = path.match(/^\/api\/v1\/invoices\/([^/]+)$/);
    if (invoiceGetMatch && method === 'GET') {
      // Get effective shopId (supports SuperAdmin shop viewing)
      const effectiveShopId = getEffectiveShopId(req, query);
      if (!effectiveShopId) {
        return res.status(401).json({ success: false, message: 'Authentication required' });
      }
      
      const id = invoiceGetMatch[1];
      
      // Try finding by ID first, then by invoice number
      let invoice = await db.invoice.findUnique({
        where: { id },
        include: {
          customer: true,
          items: { include: { product: true } },
          payments: { orderBy: { paymentDate: 'desc' } },
        },
      });
      
      // If not found by ID, try by invoice number
      if (!invoice) {
        invoice = await db.invoice.findFirst({
          where: { invoiceNumber: id },
          include: {
            customer: true,
            items: { include: { product: true } },
            payments: { orderBy: { paymentDate: 'desc' } },
          },
        });
      }
      
      // Try with INV- prefix
      if (!invoice) {
        const invoiceNum = id.startsWith('INV-') ? id : `INV-${id}`;
        invoice = await db.invoice.findFirst({
          where: { invoiceNumber: invoiceNum },
          include: {
            customer: true,
            items: { include: { product: true } },
            payments: { orderBy: { paymentDate: 'desc' } },
          },
        });
      }
      
      if (!invoice) {
        return res.status(404).json({ success: false, error: 'Invoice not found' });
      }
      
      // CRITICAL: Verify ownership before returning data (use effectiveShopId for SuperAdmin viewing)
      if (invoice.shopId !== effectiveShopId) {
        return res.status(403).json({ success: false, error: 'Access denied - invoice does not belong to your shop' });
      }
      
      return res.status(200).json({ success: true, data: invoice });
    }

    // ==================== CREATE INVOICE ====================
    if (path === '/api/v1/invoices' && method === 'POST') {
      // Require shopId for multi-tenant isolation
      if (!shopId) {
        return res.status(401).json({ success: false, message: 'Authentication required' });
      }
      
      const { customerId, items, subtotal, tax, discount, total, paidAmount, status, date, dueDate, paymentMethod, salesChannel, notes } = body;
      
      // Get customer name from customer
      const customer = await db.customer.findUnique({ where: { id: customerId } });
      const customerName = customer?.name || 'Unknown Customer';
      
      // Verify customer belongs to same shop
      if (customer && customer.shopId !== shopId) {
        return res.status(403).json({ success: false, error: 'Customer does not belong to your shop' });
      }
      
      // Use authenticated user's shopId - NEVER trust shopId from request body
      const invoiceShopId = shopId;
      
      // Generate invoice number for this shop
      const lastInvoice = await db.invoice.findFirst({ orderBy: { invoiceNumber: 'desc' } });
      const lastNum = lastInvoice ? parseInt(lastInvoice.invoiceNumber.replace(/\D/g, '')) : 10260000;
      const invoiceNumber = `INV-${lastNum + 1}`;

      // Calculate subtotal from items if not provided
      const calculatedSubtotal = subtotal || (items || []).reduce((sum: number, item: any) => {
        const qty = item.quantity || 1;
        const price = item.unitPrice || item.price || 0;
        return sum + (qty * price);
      }, 0);
      
      const calculatedTax = tax || 0;
      const calculatedDiscount = discount || 0;
      const calculatedTotal = total || (calculatedSubtotal + calculatedTax - calculatedDiscount);
      const calculatedPaid = paidAmount || 0;
      const calculatedDue = calculatedTotal - calculatedPaid;
      
      let invoiceStatus: InvoiceStatus = (status as InvoiceStatus) || InvoiceStatus.UNPAID;
      if (!status) {
        if (calculatedPaid >= calculatedTotal) invoiceStatus = InvoiceStatus.FULLPAID;
        else if (calculatedPaid > 0) invoiceStatus = InvoiceStatus.HALFPAY;
      }

      const invoice = await db.invoice.create({
        data: {
          invoiceNumber,
          customerId,
          customerName,
          shopId: invoiceShopId,
          subtotal: calculatedSubtotal,
          tax: calculatedTax,
          discount: calculatedDiscount,
          total: calculatedTotal,
          paidAmount: calculatedPaid,
          dueAmount: calculatedDue,
          status: invoiceStatus,
          date: date ? new Date(date) : new Date(),
          dueDate: dueDate ? new Date(dueDate) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          paymentMethod: paymentMethod || 'CASH',
          salesChannel: salesChannel || 'ON_SITE',
          notes,
          items: {
            create: await Promise.all((items || []).map(async (item: any) => {
              // Validate productId - set to null if product doesn't exist
              let validProductId = null;
              if (item.productId) {
                const product = await db.product.findUnique({ where: { id: item.productId } });
                if (product) validProductId = item.productId;
              }
              const itemPrice = item.unitPrice || item.price || 0;
              return {
                productId: validProductId,
                productName: item.productName || item.name || 'Unknown Product',
                quantity: item.quantity || 1,
                unitPrice: itemPrice,
                originalPrice: item.originalPrice || itemPrice,
                discount: item.discount || 0,
                total: item.total || (item.quantity * itemPrice),
                warrantyDueDate: item.warrantyDueDate ? new Date(item.warrantyDueDate) : null,
              };
            })),
          },
        },
        include: {
          customer: true,
          items: { include: { product: true } },
          payments: true,
        },
      });
      
      return res.status(201).json({ success: true, data: invoice });
    }

    // ==================== UPDATE INVOICE ====================
    const invoiceUpdateMatch = path.match(/^\/api\/v1\/invoices\/([^/]+)$/);
    if (invoiceUpdateMatch && (method === 'PUT' || method === 'PATCH')) {
      // Require shopId for multi-tenant isolation
      if (!shopId) {
        return res.status(401).json({ success: false, message: 'Authentication required' });
      }
      
      const id = invoiceUpdateMatch[1];
      
      // Find invoice by ID or invoice number (with or without INV- prefix)
      let existingInvoice = await db.invoice.findUnique({ where: { id } });
      if (!existingInvoice) {
        existingInvoice = await db.invoice.findFirst({ where: { invoiceNumber: id } });
      }
      if (!existingInvoice) {
        // Try with INV- prefix
        const invoiceNum = id.startsWith('INV-') ? id : `INV-${id}`;
        existingInvoice = await db.invoice.findFirst({ where: { invoiceNumber: invoiceNum } });
      }
      if (!existingInvoice) {
        return res.status(404).json({ success: false, error: 'Invoice not found' });
      }
      
      // CRITICAL: Verify ownership before update
      if (existingInvoice.shopId !== shopId) {
        return res.status(403).json({ success: false, error: 'Access denied - invoice does not belong to your shop' });
      }
      
      const { status, paidAmount, notes, customerName, discount, tax, total, dueAmount, items, subtotal, dueDate } = body;
      
      // Calculate subtotal from items if items are provided
      let calculatedSubtotal = subtotal;
      if (items && items.length > 0) {
        calculatedSubtotal = items.reduce((sum: number, item: any) => {
          const qty = item.quantity || 1;
          const price = item.unitPrice || item.price || 0;
          return sum + (qty * price);
        }, 0);
      }
      
      const updateData: any = {};
      if (status !== undefined && status !== null) updateData.status = String(status).toUpperCase();
      if (paidAmount !== undefined) updateData.paidAmount = paidAmount;
      if (notes !== undefined) updateData.notes = notes;
      if (customerName !== undefined) updateData.customerName = customerName;
      if (discount !== undefined) updateData.discount = discount;
      if (tax !== undefined) updateData.tax = tax;
      if (dueDate !== undefined) updateData.dueDate = new Date(dueDate);
      if (calculatedSubtotal !== undefined) updateData.subtotal = calculatedSubtotal;
      
      // Recalculate total if subtotal, tax or discount changed
      if (calculatedSubtotal !== undefined || tax !== undefined || discount !== undefined) {
        const newSubtotal = calculatedSubtotal !== undefined ? calculatedSubtotal : existingInvoice.subtotal;
        const newTax = tax !== undefined ? tax : existingInvoice.tax;
        const newDiscount = discount !== undefined ? discount : existingInvoice.discount;
        updateData.total = newSubtotal + newTax - newDiscount;
        
        // Recalculate dueAmount
        const newPaidAmount = paidAmount !== undefined ? paidAmount : existingInvoice.paidAmount;
        updateData.dueAmount = updateData.total - newPaidAmount;
      } else if (total !== undefined) {
        updateData.total = total;
      }
      
      if (dueAmount !== undefined && !updateData.dueAmount) updateData.dueAmount = dueAmount;
      
      // Update items if provided
      if (items && items.length > 0) {
        await db.invoiceItem.deleteMany({ where: { invoiceId: existingInvoice.id } });
        
        // Validate productIds for each item
        const validatedItems = await Promise.all(items.map(async (item: any) => {
          let validProductId = null;
          if (item.productId) {
            const product = await db.product.findUnique({ where: { id: item.productId } });
            if (product) validProductId = item.productId;
          }
          return {
            invoiceId: existingInvoice.id,
            productId: validProductId,
            productName: item.productName,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            originalPrice: item.originalPrice || item.unitPrice,
            discount: item.discount || 0,
            total: item.total || (item.quantity * item.unitPrice),
          };
        }));
        
        await db.invoiceItem.createMany({ data: validatedItems });
      }
      
      const invoice = await db.invoice.update({
        where: { id: existingInvoice.id },
        data: updateData,
        include: {
          customer: true,
          items: { include: { product: true } },
          payments: { orderBy: { paymentDate: 'desc' } },
        },
      });
      
      return res.status(200).json({ success: true, data: invoice });
    }

    // ==================== DELETE INVOICE ====================
    const invoiceDeleteMatch = path.match(/^\/api\/v1\/invoices\/([^/]+)$/);
    if (invoiceDeleteMatch && method === 'DELETE') {
      // Require shopId for multi-tenant isolation
      if (!shopId) {
        return res.status(401).json({ success: false, message: 'Authentication required' });
      }
      
      const id = invoiceDeleteMatch[1];
      
      // Find invoice by ID or invoice number (with or without INV- prefix)
      let existingInvoice = await db.invoice.findUnique({ where: { id } });
      if (!existingInvoice) {
        existingInvoice = await db.invoice.findFirst({ where: { invoiceNumber: id } });
      }
      if (!existingInvoice) {
        const invoiceNum = id.startsWith('INV-') ? id : `INV-${id}`;
        existingInvoice = await db.invoice.findFirst({ where: { invoiceNumber: invoiceNum } });
      }
      if (!existingInvoice) {
        return res.status(404).json({ success: false, error: 'Invoice not found' });
      }
      
      // CRITICAL: Verify ownership before deleting
      if (existingInvoice.shopId !== shopId) {
        return res.status(403).json({ success: false, error: 'Access denied - invoice does not belong to your shop' });
      }
      
      // Delete related items and payments first
      await db.invoiceItem.deleteMany({ where: { invoiceId: existingInvoice.id } });
      await db.invoicePayment.deleteMany({ where: { invoiceId: existingInvoice.id } });
      await db.invoice.delete({ where: { id: existingInvoice.id } });
      
      return res.status(200).json({ success: true, message: 'Invoice deleted' });
    }

    // ==================== ADD PAYMENT ====================
    const paymentMatch = path.match(/^\/api\/v1\/invoices\/([^/]+)\/payments$/);
    if (paymentMatch && method === 'POST') {
      // Require shopId for multi-tenant isolation
      if (!shopId) {
        return res.status(401).json({ success: false, message: 'Authentication required' });
      }
      
      const invoiceId = paymentMatch[1];
      const { amount, paymentMethod, paymentDate, notes, reference } = body;
      
      // Find invoice by ID or invoice number (with or without INV- prefix)
      let existingInvoice = await db.invoice.findUnique({ 
        where: { id: invoiceId },
        include: { payments: true },
      });
      if (!existingInvoice) {
        existingInvoice = await db.invoice.findFirst({ 
          where: { invoiceNumber: invoiceId },
          include: { payments: true },
        });
      }
      if (!existingInvoice) {
        const invoiceNum = invoiceId.startsWith('INV-') ? invoiceId : `INV-${invoiceId}`;
        existingInvoice = await db.invoice.findFirst({ 
          where: { invoiceNumber: invoiceNum },
          include: { payments: true },
        });
      }
      if (!existingInvoice) {
        return res.status(404).json({ success: false, error: 'Invoice not found' });
      }
      
      // CRITICAL: Verify ownership before adding payment
      if (existingInvoice.shopId !== shopId) {
        return res.status(403).json({ success: false, error: 'Access denied - invoice does not belong to your shop' });
      }
      
      const payment = await db.invoicePayment.create({
        data: {
          invoiceId: existingInvoice.id,
          amount: parseFloat(amount),
          paymentMethod: paymentMethod?.toUpperCase() || 'CASH',
          paymentDate: paymentDate ? new Date(paymentDate) : new Date(),
          notes,
          reference,
        },
      });
      
      // Calculate new totals
      const currentPaid = existingInvoice.payments.reduce((sum: number, p: any) => sum + p.amount, 0);
      const totalPaid = currentPaid + parseFloat(amount);
      const dueAmount = existingInvoice.total - totalPaid;
      
      let status: InvoiceStatus = InvoiceStatus.UNPAID;
      if (totalPaid >= existingInvoice.total) status = InvoiceStatus.FULLPAID;
      else if (totalPaid > 0) status = InvoiceStatus.HALFPAY;
      
      const updatedInvoice = await db.invoice.update({
        where: { id: existingInvoice.id },
        data: { paidAmount: totalPaid, dueAmount: Math.max(0, dueAmount), status },
        include: {
          customer: true,
          items: { include: { product: true } },
          payments: { orderBy: { paymentDate: 'desc' } },
        },
      });
      
      // Return both payment and updated invoice
      return res.status(201).json({ 
        success: true, 
        data: { payment, invoice: updatedInvoice }
      });
    }

    // ==================== INVOICE REMINDERS ====================
    // GET reminders for an invoice
    const reminderGetMatch = path.match(/^\/api\/v1\/invoices\/([^/]+)\/reminders$/);
    if (reminderGetMatch && method === 'GET') {
      // Require shopId for multi-tenant isolation
      if (!shopId) {
        return res.status(401).json({ success: false, message: 'Authentication required' });
      }
      
      const invoiceId = reminderGetMatch[1];
      
      // Find invoice by ID or invoice number
      let existingInvoice = await db.invoice.findUnique({ where: { id: invoiceId } });
      if (!existingInvoice) {
        existingInvoice = await db.invoice.findFirst({ where: { invoiceNumber: invoiceId } });
      }
      if (!existingInvoice) {
        const invoiceNum = invoiceId.startsWith('INV-') ? invoiceId : `INV-${invoiceId}`;
        existingInvoice = await db.invoice.findFirst({ where: { invoiceNumber: invoiceNum } });
      }
      if (!existingInvoice) {
        return res.status(404).json({ success: false, error: 'Invoice not found' });
      }
      
      // CRITICAL: Verify ownership before returning reminders
      if (existingInvoice.shopId !== shopId) {
        return res.status(403).json({ success: false, error: 'Access denied - invoice does not belong to your shop' });
      }
      
      const reminders = await db.invoiceReminder.findMany({
        where: { invoiceId: existingInvoice.id },
        orderBy: { sentAt: 'desc' },
      });
      
      return res.status(200).json({ 
        success: true, 
        data: reminders,
        meta: { count: reminders.length }
      });
    }

    // POST - Create a new reminder for an invoice
    const reminderPostMatch = path.match(/^\/api\/v1\/invoices\/([^/]+)\/reminders$/);
    if (reminderPostMatch && method === 'POST') {
      // Require shopId for multi-tenant isolation
      if (!shopId) {
        return res.status(401).json({ success: false, message: 'Authentication required' });
      }
      
      const invoiceId = reminderPostMatch[1];
      // NOTE: Don't destructure shopId from body - use authenticated shopId
      const { type, channel, message, customerPhone, customerName } = body;
      
      // Find invoice by ID or invoice number
      let existingInvoice = await db.invoice.findUnique({ 
        where: { id: invoiceId },
        include: { customer: true },
      });
      if (!existingInvoice) {
        existingInvoice = await db.invoice.findFirst({ 
          where: { invoiceNumber: invoiceId },
          include: { customer: true },
        });
      }
      if (!existingInvoice) {
        const invoiceNum = invoiceId.startsWith('INV-') ? invoiceId : `INV-${invoiceId}`;
        existingInvoice = await db.invoice.findFirst({ 
          where: { invoiceNumber: invoiceNum },
          include: { customer: true },
        });
      }
      if (!existingInvoice) {
        return res.status(404).json({ success: false, error: 'Invoice not found' });
      }
      
      // CRITICAL: Verify ownership before creating reminder
      if (existingInvoice.shopId !== shopId) {
        return res.status(403).json({ success: false, error: 'Access denied - invoice does not belong to your shop' });
      }
      
      // Create the reminder - use authenticated shopId, not from request body
      const reminder = await db.invoiceReminder.create({
        data: {
          invoiceId: existingInvoice.id,
          shopId: shopId, // CRITICAL: Always use authenticated shopId
          type: type?.toUpperCase() === 'OVERDUE' ? 'OVERDUE' : 'PAYMENT',
          channel: channel || 'whatsapp',
          message: message || '',
          customerPhone: customerPhone || (existingInvoice.customer as any)?.phone || '',
          customerName: customerName || existingInvoice.customerName,
        },
      });
      
      // Get updated reminder count for the invoice
      const reminderCount = await db.invoiceReminder.count({
        where: { invoiceId: existingInvoice.id },
      });
      
      return res.status(201).json({ 
        success: true, 
        data: reminder,
        meta: { reminderCount }
      });
    }

    // ==================== CUSTOMERS (cached for 30 seconds) ====================
    if (path === '/api/v1/customers' && method === 'GET') {
      // Get effective shopId (supports SuperAdmin shop viewing)
      const effectiveShopId = getEffectiveShopId(req, query);
      if (!effectiveShopId) {
        return res.status(401).json({ success: false, message: 'Authentication required' });
      }
      setCacheHeaders(res, 30, 60);
      const customers = await db.customer.findMany({ 
        where: { shopId: effectiveShopId }, // CRITICAL: Filter by effectiveShopId
        orderBy: { name: 'asc' } 
      });
      return res.status(200).json({ success: true, data: customers });
    }

    if (path === '/api/v1/customers' && method === 'POST') {
      if (!shopId) {
        return res.status(401).json({ success: false, message: 'Authentication required' });
      }
      const customer = await db.customer.create({ 
        data: { ...body, shopId } // CRITICAL: Set shopId from token (not query)
      });
      return res.status(201).json({ success: true, data: customer });
    }

    const customerMatch = path.match(/^\/api\/v1\/customers\/([^/]+)$/);
    if (customerMatch && method === 'GET') {
      const effectiveShopId = getEffectiveShopId(req, query);
      if (!effectiveShopId) {
        return res.status(401).json({ success: false, message: 'Authentication required' });
      }
      const customer = await db.customer.findUnique({ where: { id: customerMatch[1] } });
      if (!customer) {
        return res.status(404).json({ success: false, error: 'Customer not found' });
      }
      // Verify ownership
      if (customer.shopId !== shopId) {
        return res.status(403).json({ success: false, error: 'Access denied' });
      }
      return res.status(200).json({ success: true, data: customer });
    }

    if (customerMatch && (method === 'PUT' || method === 'PATCH')) {
      if (!shopId) {
        return res.status(401).json({ success: false, message: 'Authentication required' });
      }
      // Verify ownership before update
      const existing = await db.customer.findUnique({ where: { id: customerMatch[1] } });
      if (!existing || existing.shopId !== shopId) {
        return res.status(403).json({ success: false, error: 'Access denied' });
      }
      const { shopId: _, ...safeData } = body; // Prevent shopId tampering
      const customer = await db.customer.update({
        where: { id: customerMatch[1] },
        data: safeData,
      });
      return res.status(200).json({ success: true, data: customer });
    }

    if (customerMatch && method === 'DELETE') {
      if (!shopId) {
        return res.status(401).json({ success: false, message: 'Authentication required' });
      }
      // Verify ownership before delete
      const existing = await db.customer.findUnique({ where: { id: customerMatch[1] } });
      if (!existing || existing.shopId !== shopId) {
        return res.status(403).json({ success: false, error: 'Access denied' });
      }
      await db.customer.delete({ where: { id: customerMatch[1] } });
      return res.status(200).json({ success: true, message: 'Customer deleted' });
    }

    // ==================== PRODUCTS (cached for 60 seconds) ====================
    if (path === '/api/v1/products' && method === 'GET') {
      // Get effective shopId (supports SuperAdmin shop viewing)
      const effectiveShopId = getEffectiveShopId(req, query);
      if (!effectiveShopId) {
        return res.status(401).json({ success: false, message: 'Authentication required' });
      }
      setCacheHeaders(res, 60, 120); // Products don't change often
      const products = await db.product.findMany({
        where: { shopId: effectiveShopId }, // CRITICAL: Filter by effectiveShopId
        include: { category: true, brand: true },
        orderBy: { name: 'asc' },
      });
      return res.status(200).json({ success: true, data: products });
    }

    if (path === '/api/v1/products' && method === 'POST') {
      if (!shopId) {
        return res.status(401).json({ success: false, message: 'Authentication required' });
      }
      const product = await db.product.create({ 
        data: { ...body, shopId }, // CRITICAL: Set shopId from token (not query)
        include: { category: true, brand: true },
      });
      return res.status(201).json({ success: true, data: product });
    }

    const productMatch = path.match(/^\/api\/v1\/products\/([^/]+)$/);
    if (productMatch && method === 'GET') {
      const effectiveShopId = getEffectiveShopId(req, query);
      if (!effectiveShopId) {
        return res.status(401).json({ success: false, message: 'Authentication required' });
      }
      const product = await db.product.findUnique({ 
        where: { id: productMatch[1] },
        include: { category: true, brand: true },
      });
      if (!product) {
        return res.status(404).json({ success: false, error: 'Product not found' });
      }
      // Verify ownership
      if (product.shopId !== shopId) {
        return res.status(403).json({ success: false, error: 'Access denied' });
      }
      return res.status(200).json({ success: true, data: product });
    }

    if (productMatch && (method === 'PUT' || method === 'PATCH')) {
      if (!shopId) {
        return res.status(401).json({ success: false, message: 'Authentication required' });
      }
      // Verify ownership before update
      const existing = await db.product.findUnique({ where: { id: productMatch[1] } });
      if (!existing || existing.shopId !== shopId) {
        return res.status(403).json({ success: false, error: 'Access denied' });
      }
      const { shopId: _, ...safeData } = body;
      const product = await db.product.update({
        where: { id: productMatch[1] },
        data: safeData,
        include: { category: true, brand: true },
      });
      return res.status(200).json({ success: true, data: product });
    }

    if (productMatch && method === 'DELETE') {
      if (!shopId) {
        return res.status(401).json({ success: false, message: 'Authentication required' });
      }
      // Verify ownership before delete
      const existing = await db.product.findUnique({ where: { id: productMatch[1] } });
      if (!existing || existing.shopId !== shopId) {
        return res.status(403).json({ success: false, error: 'Access denied' });
      }
      await db.product.delete({ where: { id: productMatch[1] } });
      return res.status(200).json({ success: true, message: 'Product deleted' });
    }

    // ==================== CATEGORIES ====================
    if (path === '/api/v1/categories' && method === 'GET') {
      const categories = await db.category.findMany({ orderBy: { name: 'asc' } });
      return res.status(200).json({ success: true, data: categories });
    }

    // ==================== BRANDS ====================
    if (path === '/api/v1/brands' && method === 'GET') {
      const brands = await db.brand.findMany({ orderBy: { name: 'asc' } });
      return res.status(200).json({ success: true, data: brands });
    }

    // ==================== ADMIN ROUTES (Super Admin Only) ====================
    
    // Helper to verify SUPER_ADMIN role
    const verifySuperAdmin = async (): Promise<{ user: any; error?: string }> => {
      const authHeader = req.headers.authorization;
      if (!authHeader || typeof authHeader !== 'string' || !authHeader.startsWith('Bearer ')) {
        return { user: null, error: 'No token provided' };
      }
      const token = authHeader.substring(7);
      try {
        const decoded = jwt.verify(token, JWT_SECRET) as { id: string; role: string };
        if (decoded.role !== 'SUPER_ADMIN') {
          return { user: null, error: 'Super Admin access required' };
        }
        const user = await db.user.findUnique({ where: { id: decoded.id } });
        if (!user || !user.isActive) {
          return { user: null, error: 'User not found or inactive' };
        }
        return { user };
      } catch {
        return { user: null, error: 'Invalid token' };
      }
    };

    // Admin Stats
    if (path === '/api/v1/admin/stats' && method === 'GET') {
      const { user, error } = await verifySuperAdmin();
      if (error) return res.status(403).json({ success: false, message: error });

      const [totalShops, totalUsers, activeShops, totalInvoices, totalCustomers, totalProducts] = await Promise.all([
        db.shop.count(),
        db.user.count(),
        db.shop.count({ where: { isActive: true } }),
        db.invoice.count(),
        db.customer.count(),
        db.product.count(),
      ]);

      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const [recentShops, recentUsers] = await Promise.all([
        db.shop.count({ where: { createdAt: { gte: sevenDaysAgo } } }),
        db.user.count({ where: { createdAt: { gte: sevenDaysAgo } } }),
      ]);

      return res.status(200).json({
        success: true,
        data: {
          totalShops,
          totalUsers,
          activeShops,
          inactiveShops: totalShops - activeShops,
          totalInvoices,
          totalCustomers,
          totalProducts,
          recentShops,
          recentUsers,
        },
      });
    }

    // Admin Shops List
    if (path === '/api/v1/admin/shops' && method === 'GET') {
      const { user, error } = await verifySuperAdmin();
      if (error) return res.status(403).json({ success: false, message: error });

      const shops = await db.shop.findMany({
        orderBy: { createdAt: 'desc' },
        include: {
          _count: {
            select: { users: true, customers: true, products: true, invoices: true },
          },
        },
      });

      return res.status(200).json({
        success: true,
        data: shops.map(shop => ({
          id: shop.id,
          name: shop.name,
          slug: shop.slug,
          email: shop.email,
          phone: shop.phone,
          address: shop.address,
          logo: shop.logo,
          isActive: shop.isActive,
          currency: shop.currency,
          taxRate: shop.taxRate,
          businessRegNo: shop.businessRegNo,
          createdAt: shop.createdAt,
          updatedAt: shop.updatedAt,
          userCount: shop._count.users,
          customerCount: shop._count.customers,
          productCount: shop._count.products,
          invoiceCount: shop._count.invoices,
        })),
      });
    }

    // Admin Users List
    if (path === '/api/v1/admin/users' && method === 'GET') {
      const { user, error } = await verifySuperAdmin();
      if (error) return res.status(403).json({ success: false, message: error });

      const users = await db.user.findMany({
        orderBy: { createdAt: 'desc' },
        include: { shop: { select: { id: true, name: true, slug: true } } },
      });

      return res.status(200).json({
        success: true,
        data: users.map(u => ({
          id: u.id,
          email: u.email,
          name: u.name,
          role: u.role,
          isActive: u.isActive,
          createdAt: u.createdAt,
          updatedAt: u.updatedAt,
          lastLogin: u.lastLogin,
          shopId: u.shopId,
          shop: u.shop,
        })),
      });
    }

    // Admin Update User
    const adminUserMatch = path.match(/^\/api\/v1\/admin\/users\/([^/]+)$/);
    if (adminUserMatch && method === 'PUT') {
      const { user, error } = await verifySuperAdmin();
      if (error) return res.status(403).json({ success: false, message: error });

      const userId = adminUserMatch[1];
      const { name, email, role, isActive, shopId: newShopId } = body;

      const updatedUser = await db.user.update({
        where: { id: userId },
        data: {
          ...(name && { name }),
          ...(email && { email: email.toLowerCase() }),
          ...(role && { role }),
          ...(typeof isActive === 'boolean' && { isActive }),
          ...(newShopId !== undefined && { shopId: newShopId || null }),
        },
        include: { shop: { select: { id: true, name: true, slug: true } } },
      });

      return res.status(200).json({ success: true, data: updatedUser });
    }

    // Admin Delete User
    if (adminUserMatch && method === 'DELETE') {
      const { user, error } = await verifySuperAdmin();
      if (error) return res.status(403).json({ success: false, message: error });

      const userId = adminUserMatch[1];
      await db.user.delete({ where: { id: userId } });

      return res.status(200).json({ success: true, message: 'User deleted successfully' });
    }

    // Admin Create User
    if (path === '/api/v1/admin/users' && method === 'POST') {
      const { user, error } = await verifySuperAdmin();
      if (error) return res.status(403).json({ success: false, message: error });

      const { email, password, name, role, shopId: userShopId, isActive = true } = body;

      if (!email || !password || !name) {
        return res.status(400).json({ success: false, message: 'Email, password, and name are required' });
      }

      const existingUser = await db.user.findUnique({ where: { email: email.toLowerCase() } });
      if (existingUser) {
        return res.status(409).json({ success: false, message: 'Email already in use' });
      }

      const hashedPassword = await bcrypt.hash(password, 12);

      const newUser = await db.user.create({
        data: {
          email: email.toLowerCase(),
          password: hashedPassword,
          name,
          role: role || 'STAFF',
          isActive,
          shopId: userShopId || null,
        },
        include: { shop: { select: { id: true, name: true, slug: true } } },
      });

      return res.status(201).json({
        success: true,
        data: {
          id: newUser.id,
          email: newUser.email,
          name: newUser.name,
          role: newUser.role,
          isActive: newUser.isActive,
          shopId: newUser.shopId,
          shop: newUser.shop,
        },
      });
    }

    // Admin Reset User Password
    const adminResetPwMatch = path.match(/^\/api\/v1\/admin\/users\/([^/]+)\/reset-password$/);
    if (adminResetPwMatch && method === 'POST') {
      const { user, error } = await verifySuperAdmin();
      if (error) return res.status(403).json({ success: false, message: error });

      const userId = adminResetPwMatch[1];
      const { newPassword } = body;

      if (!newPassword || newPassword.length < 8) {
        return res.status(400).json({ success: false, message: 'Password must be at least 8 characters' });
      }

      const hashedPassword = await bcrypt.hash(newPassword, 12);
      await db.user.update({
        where: { id: userId },
        data: { password: hashedPassword },
      });

      return res.status(200).json({ success: true, message: 'Password reset successfully' });
    }

    // ========================================
    // SHOP ROUTES (for branding, etc.)
    // ========================================
    
    // Get Shop by ID (for branding)
    const shopByIdMatch = path.match(/^\/api\/v1\/shops\/([^/]+)$/);
    if (shopByIdMatch && method === 'GET') {
      const shopIdParam = shopByIdMatch[1];
      
      const shop = await prisma.shop.findUnique({
        where: { id: shopIdParam },
        select: {
          id: true,
          name: true,
          subName: true,
          tagline: true,
          slug: true,
          logo: true,
          address: true,
          phone: true,
          email: true,
          website: true,
          isActive: true,
        },
      });

      if (!shop) {
        return res.status(404).json({ success: false, message: 'Shop not found' });
      }

      return res.status(200).json({ success: true, data: shop });
    }

    // Update Shop (branding)
    if (shopByIdMatch && (method === 'PUT' || method === 'PATCH')) {
      const shopId = getShopIdFromToken(req);
      const shopIdParam = shopByIdMatch[1];
      
      // Verify user owns this shop or is SUPER_ADMIN
      const userRole = getUserRoleFromToken(req);
      if (shopId !== shopIdParam && userRole !== 'SUPER_ADMIN') {
        return res.status(403).json({ success: false, message: 'Unauthorized' });
      }

      const { name, subName, tagline, logo, address, phone, email, website } = body;

      const updatedShop = await prisma.shop.update({
        where: { id: shopIdParam },
        data: {
          ...(name && { name }),
          ...(subName !== undefined && { subName }),
          ...(tagline !== undefined && { tagline }),
          ...(logo !== undefined && { logo }),
          ...(address !== undefined && { address }),
          ...(phone !== undefined && { phone }),
          ...(email !== undefined && { email }),
          ...(website !== undefined && { website }),
        },
      });

      return res.status(200).json({ success: true, data: updatedShop });
    }

    // ========================================
    // SHOP ADMIN ROUTES
    // ========================================

    // Shop Admin Stats
    if (path === '/api/v1/shop-admin/stats' && method === 'GET') {
      const shopId = getShopIdFromToken(req);
      if (!shopId) {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
      }

      const [totalUsers, totalInvoices, totalCustomers, totalProducts] = await Promise.all([
        prisma.user.count({ where: { shopId } }),
        prisma.invoice.count({ where: { shopId } }),
        prisma.customer.count({ where: { shopId } }),
        prisma.product.count({ where: { shopId } }),
      ]);

      return res.status(200).json({
        success: true,
        data: {
          totalUsers,
          totalInvoices,
          totalCustomers,
          totalProducts,
        },
      });
    }

    // Shop Admin Users List
    if (path === '/api/v1/shop-admin/users' && method === 'GET') {
      const shopId = getShopIdFromToken(req);
      if (!shopId) {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
      }

      const users = await prisma.user.findMany({
        where: { shopId },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          createdAt: true,
          updatedAt: true,
        },
        orderBy: { createdAt: 'desc' },
      });

      return res.status(200).json({ success: true, data: users });
    }

    // Shop Admin Create User
    if (path === '/api/v1/shop-admin/users' && method === 'POST') {
      const shopId = getShopIdFromToken(req);
      if (!shopId) {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
      }

      const { email, password, name, role } = body;

      // Check if email already exists
      const existingUser = await prisma.user.findUnique({ where: { email } });
      if (existingUser) {
        return res.status(400).json({ success: false, message: 'Email already exists' });
      }

      const hashedPassword = await bcrypt.hash(password, 12);
      const newUser = await prisma.user.create({
        data: {
          email,
          password: hashedPassword,
          name,
          role: role || 'STAFF',
          shopId,
        },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          createdAt: true,
        },
      });

      return res.status(201).json({ success: true, data: newUser });
    }

    // Shop Admin Update/Delete User
    const shopAdminUserMatch = path.match(/^\/api\/v1\/shop-admin\/users\/([^/]+)$/);
    if (shopAdminUserMatch && (method === 'PUT' || method === 'PATCH')) {
      const shopId = getShopIdFromToken(req);
      if (!shopId) {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
      }

      const userId = shopAdminUserMatch[1];
      const { name, email, role, password } = body;

      // Verify user belongs to this shop
      const existingUser = await prisma.user.findFirst({
        where: { id: userId, shopId },
      });
      if (!existingUser) {
        return res.status(404).json({ success: false, message: 'User not found' });
      }

      const updateData: Record<string, unknown> = {};
      if (name) updateData.name = name;
      if (email) updateData.email = email;
      if (role) updateData.role = role;
      if (password) updateData.password = await bcrypt.hash(password, 12);

      const updatedUser = await prisma.user.update({
        where: { id: userId },
        data: updateData,
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      return res.status(200).json({ success: true, data: updatedUser });
    }

    if (shopAdminUserMatch && method === 'DELETE') {
      const shopId = getShopIdFromToken(req);
      if (!shopId) {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
      }

      const userId = shopAdminUserMatch[1];

      // Verify user belongs to this shop
      const existingUser = await prisma.user.findFirst({
        where: { id: userId, shopId },
      });
      if (!existingUser) {
        return res.status(404).json({ success: false, message: 'User not found' });
      }

      await prisma.user.delete({ where: { id: userId } });

      return res.status(200).json({ success: true, message: 'User deleted successfully' });
    }

    // Admin Toggle Shop Status
    const shopToggleMatch = path.match(/^\/api\/v1\/admin\/shops\/([^/]+)$/);
    if (shopToggleMatch && method === 'PUT') {
      const { user, error } = await verifySuperAdmin();
      if (error) return res.status(403).json({ success: false, message: error });

      const shopIdParam = shopToggleMatch[1];
      const { isActive } = body;

      const shop = await db.shop.update({
        where: { id: shopIdParam },
        data: { isActive },
      });

      return res.status(200).json({ success: true, data: shop });
    }

    // 404
    return res.status(404).json({ success: false, error: 'Route not found', path, method });

  } catch (error) {
    console.error('API Error:', error);
    return res.status(500).json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Internal server error'
    });
  }
}
