// Vercel Serverless Handler - All routes go through Express app
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Import Prisma
import { PrismaClient } from '@prisma/client';

// Create Express app
const app = express();

// Prisma client singleton
const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined };
export const prisma = globalForPrisma.prisma ?? new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['error'] : ['error'],
});
if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

// Security middleware
app.use(helmet());

// CORS configuration
const allowedOrigins: (string | RegExp)[] = [
  'http://localhost:5173',
  'http://localhost:3000',
  /\.vercel\.app$/
];
if (process.env.FRONTEND_URL) {
  allowedOrigins.push(process.env.FRONTEND_URL);
}
app.use(cors({
  origin: allowedOrigins,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health check
app.get('/health', (_req, res) => {
  res.status(200).json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV 
  });
});

// API Routes
const API_PREFIX = '/api/v1';

// ============== INVOICES ==============
app.get(`${API_PREFIX}/invoices`, async (req, res) => {
  try {
    const { page = '1', limit = '10', status, customerId, search, sortBy = 'date', sortOrder = 'desc' } = req.query;
    
    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    const where: any = {};
    if (status && status !== 'all') {
      where.status = (status as string).toUpperCase();
    }
    if (customerId && customerId !== 'all') {
      where.customerId = customerId;
    }
    if (search) {
      where.OR = [
        { invoiceNumber: { contains: search as string, mode: 'insensitive' } },
        { customerName: { contains: search as string, mode: 'insensitive' } },
      ];
    }

    const orderBy: any = {};
    if (sortBy === 'date') {
      orderBy.date = sortOrder;
    } else if (sortBy === 'total') {
      orderBy.total = sortOrder;
    } else if (sortBy === 'invoiceNumber') {
      orderBy.invoiceNumber = sortOrder;
    }

    const [invoices, total] = await Promise.all([
      prisma.invoice.findMany({
        where,
        include: {
          customer: true,
          items: { include: { product: true } },
          payments: true,
        },
        orderBy,
        skip,
        take: limitNum,
      }),
      prisma.invoice.count({ where }),
    ]);

    res.json({
      success: true,
      data: invoices,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    console.error('Error fetching invoices:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch invoices' });
  }
});

app.get(`${API_PREFIX}/invoices/:id`, async (req, res) => {
  try {
    const invoice = await prisma.invoice.findUnique({
      where: { id: req.params.id },
      include: {
        customer: true,
        items: { include: { product: true } },
        payments: true,
      },
    });
    
    if (!invoice) {
      return res.status(404).json({ success: false, error: 'Invoice not found' });
    }
    
    res.json({ success: true, data: invoice });
  } catch (error) {
    console.error('Error fetching invoice:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch invoice' });
  }
});

// ============== CUSTOMERS ==============
app.get(`${API_PREFIX}/customers`, async (_req, res) => {
  try {
    const customers = await prisma.customer.findMany({
      orderBy: { name: 'asc' },
    });
    res.json({ success: true, data: customers });
  } catch (error) {
    console.error('Error fetching customers:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch customers' });
  }
});

// ============== PRODUCTS ==============
app.get(`${API_PREFIX}/products`, async (_req, res) => {
  try {
    const products = await prisma.product.findMany({
      include: { category: true, brand: true },
      orderBy: { name: 'asc' },
    });
    res.json({ success: true, data: products });
  } catch (error) {
    console.error('Error fetching products:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch products' });
  }
});

// 404 handler
app.use((_req, res) => {
  res.status(404).json({ success: false, error: 'Route not found' });
});

// Error handler
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Error:', err);
  res.status(500).json({ success: false, error: err.message || 'Internal server error' });
});

export default app;
