// Vercel Serverless API Handler with Prisma
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { PrismaClient } from '@prisma/client';

// Prisma client singleton for serverless
const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined };
const prisma = globalForPrisma.prisma ?? new PrismaClient();
if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

// CORS headers
function setCorsHeaders(res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCorsHeaders(res);

  // Handle preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const url = req.url || '/';
  const method = req.method || 'GET';

  try {
    // Health check
    if (url === '/health' || url === '/') {
      return res.status(200).json({ 
        status: 'ok', 
        timestamp: new Date().toISOString(),
        message: 'EcoSystem API running on Vercel'
      });
    }

    // ============== GET /api/v1/invoices ==============
    if (url.startsWith('/api/v1/invoices') && method === 'GET') {
      // Check if it's a single invoice request
      const idMatch = url.match(/\/api\/v1\/invoices\/([^?/]+)/);
      
      if (idMatch) {
        // Single invoice
        const id = idMatch[1];
        const invoice = await prisma.invoice.findUnique({
          where: { id },
          include: {
            customer: true,
            items: { include: { product: true } },
            payments: true,
          },
        });
        
        if (!invoice) {
          return res.status(404).json({ success: false, error: 'Invoice not found' });
        }
        
        return res.status(200).json({ success: true, data: invoice });
      }

      // List invoices
      const urlObj = new URL(url, 'http://localhost');
      const page = parseInt(urlObj.searchParams.get('page') || '1');
      const limit = parseInt(urlObj.searchParams.get('limit') || '100');
      const status = urlObj.searchParams.get('status');
      const sortOrder = urlObj.searchParams.get('sortOrder') || 'desc';

      const where: any = {};
      if (status && status !== 'all') {
        where.status = status.toUpperCase();
      }

      const [invoices, total] = await Promise.all([
        prisma.invoice.findMany({
          where,
          include: {
            customer: true,
            items: { include: { product: true } },
            payments: true,
          },
          orderBy: { date: sortOrder as 'asc' | 'desc' },
          skip: (page - 1) * limit,
          take: limit,
        }),
        prisma.invoice.count({ where }),
      ]);

      return res.status(200).json({
        success: true,
        data: invoices,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      });
    }

    // ============== GET /api/v1/customers ==============
    if (url.startsWith('/api/v1/customers') && method === 'GET') {
      const customers = await prisma.customer.findMany({
        orderBy: { name: 'asc' },
      });
      return res.status(200).json({ success: true, data: customers });
    }

    // ============== GET /api/v1/products ==============
    if (url.startsWith('/api/v1/products') && method === 'GET') {
      const products = await prisma.product.findMany({
        include: { category: true, brand: true },
        orderBy: { name: 'asc' },
      });
      return res.status(200).json({ success: true, data: products });
    }

    // ============== GET /api/v1/categories ==============
    if (url.startsWith('/api/v1/categories') && method === 'GET') {
      const categories = await prisma.category.findMany({
        orderBy: { name: 'asc' },
      });
      return res.status(200).json({ success: true, data: categories });
    }

    // ============== GET /api/v1/brands ==============
    if (url.startsWith('/api/v1/brands') && method === 'GET') {
      const brands = await prisma.brand.findMany({
        orderBy: { name: 'asc' },
      });
      return res.status(200).json({ success: true, data: brands });
    }

    // 404 for unmatched routes
    return res.status(404).json({ 
      success: false, 
      error: 'Route not found',
      path: url,
      method 
    });

  } catch (error) {
    console.error('API Error:', error);
    return res.status(500).json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Internal server error'
    });
  }
}
