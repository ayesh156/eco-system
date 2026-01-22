// Vercel Serverless API Handler - Lazy Prisma Loading
import type { VercelRequest, VercelResponse } from '@vercel/node';

// Lazy load Prisma to avoid cold start issues
let prisma: any = null;

async function getPrisma() {
  if (!prisma) {
    const { PrismaClient } = await import('@prisma/client');
    prisma = new PrismaClient();
  }
  return prisma;
}

// CORS headers
function setCorsHeaders(res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCorsHeaders(res);

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const url = req.url || '/';
  const method = req.method || 'GET';

  try {
    // Health check - no DB needed
    if (url === '/health' || url === '/') {
      return res.status(200).json({ 
        status: 'ok', 
        timestamp: new Date().toISOString(),
        message: 'EcoSystem API running'
      });
    }

    // Get Prisma client for DB operations
    const db = await getPrisma();

    // ============== GET /api/v1/invoices ==============
    if (url.startsWith('/api/v1/invoices') && method === 'GET') {
      const idMatch = url.match(/\/api\/v1\/invoices\/([^?/]+)/);
      
      if (idMatch) {
        const invoice = await db.invoice.findUnique({
          where: { id: idMatch[1] },
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
      const invoices = await db.invoice.findMany({
        include: {
          customer: true,
          items: { include: { product: true } },
          payments: true,
        },
        orderBy: { date: 'desc' },
        take: 100,
      });

      return res.status(200).json({
        success: true,
        data: invoices,
        pagination: { page: 1, limit: 100, total: invoices.length, totalPages: 1 },
      });
    }

    // ============== GET /api/v1/customers ==============
    if (url.startsWith('/api/v1/customers') && method === 'GET') {
      const customers = await db.customer.findMany({ orderBy: { name: 'asc' } });
      return res.status(200).json({ success: true, data: customers });
    }

    // ============== GET /api/v1/products ==============
    if (url.startsWith('/api/v1/products') && method === 'GET') {
      const products = await db.product.findMany({
        include: { category: true, brand: true },
        orderBy: { name: 'asc' },
      });
      return res.status(200).json({ success: true, data: products });
    }

    // 404
    return res.status(404).json({ success: false, error: 'Route not found', path: url });

  } catch (error) {
    console.error('API Error:', error);
    return res.status(500).json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Internal server error'
    });
  }
}
