// Vercel Serverless API Handler - Full CRUD Operations
import type { VercelRequest, VercelResponse } from '@vercel/node';

// Lazy load Prisma
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

// Parse URL to get path and query
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

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCorsHeaders(res);

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { path } = parseUrl(req.url || '/');
  const method = req.method || 'GET';
  const body = req.body || {};

  try {
    // Health check
    if (path === '/health' || path === '/') {
      return res.status(200).json({ 
        status: 'ok', 
        timestamp: new Date().toISOString(),
        message: 'EcoSystem API running'
      });
    }

    const db = await getPrisma();

    // ==================== INVOICES ====================
    
    // GET /api/v1/invoices - List all
    if (path === '/api/v1/invoices' && method === 'GET') {
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

    // GET /api/v1/invoices/:id - Get single
    const invoiceGetMatch = path.match(/^\/api\/v1\/invoices\/([^/]+)$/);
    if (invoiceGetMatch && method === 'GET') {
      const invoice = await db.invoice.findUnique({
        where: { id: invoiceGetMatch[1] },
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

    // POST /api/v1/invoices - Create
    if (path === '/api/v1/invoices' && method === 'POST') {
      const { customerId, customerName, items, subtotal, tax, discount, total, status, date, dueDate, paymentMethod, salesChannel, notes } = body;
      
      // Generate invoice number
      const lastInvoice = await db.invoice.findFirst({ orderBy: { invoiceNumber: 'desc' } });
      const lastNum = lastInvoice ? parseInt(lastInvoice.invoiceNumber.replace('INV-', '')) : 10260000;
      const invoiceNumber = `INV-${lastNum + 1}`;

      const invoice = await db.invoice.create({
        data: {
          invoiceNumber,
          customerId,
          customerName,
          subtotal: subtotal || 0,
          tax: tax || 0,
          discount: discount || 0,
          total: total || 0,
          paidAmount: 0,
          dueAmount: total || 0,
          status: status || 'UNPAID',
          date: date ? new Date(date) : new Date(),
          dueDate: dueDate ? new Date(dueDate) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          paymentMethod: paymentMethod || 'CASH',
          salesChannel: salesChannel || 'ON_SITE',
          notes,
          items: {
            create: (items || []).map((item: any) => ({
              productId: item.productId,
              productName: item.productName || item.name,
              quantity: item.quantity,
              unitPrice: item.unitPrice || item.price,
              originalPrice: item.originalPrice,
              discount: item.discount || 0,
              total: item.total || (item.quantity * (item.unitPrice || item.price)),
              warrantyDueDate: item.warrantyDueDate ? new Date(item.warrantyDueDate) : null,
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

    // PUT/PATCH /api/v1/invoices/:id - Update
    const invoiceUpdateMatch = path.match(/^\/api\/v1\/invoices\/([^/]+)$/);
    if (invoiceUpdateMatch && (method === 'PUT' || method === 'PATCH')) {
      const id = invoiceUpdateMatch[1];
      const { status, paidAmount, notes, customerName, discount, tax, total, dueAmount } = body;
      
      const updateData: any = {};
      if (status !== undefined) updateData.status = status;
      if (paidAmount !== undefined) updateData.paidAmount = paidAmount;
      if (notes !== undefined) updateData.notes = notes;
      if (customerName !== undefined) updateData.customerName = customerName;
      if (discount !== undefined) updateData.discount = discount;
      if (tax !== undefined) updateData.tax = tax;
      if (total !== undefined) updateData.total = total;
      if (dueAmount !== undefined) updateData.dueAmount = dueAmount;
      
      const invoice = await db.invoice.update({
        where: { id },
        data: updateData,
        include: {
          customer: true,
          items: { include: { product: true } },
          payments: true,
        },
      });
      return res.status(200).json({ success: true, data: invoice });
    }

    // DELETE /api/v1/invoices/:id - Delete
    const invoiceDeleteMatch = path.match(/^\/api\/v1\/invoices\/([^/]+)$/);
    if (invoiceDeleteMatch && method === 'DELETE') {
      const id = invoiceDeleteMatch[1];
      
      // Delete related items and payments first
      await db.invoiceItem.deleteMany({ where: { invoiceId: id } });
      await db.invoicePayment.deleteMany({ where: { invoiceId: id } });
      await db.invoice.delete({ where: { id } });
      
      return res.status(200).json({ success: true, message: 'Invoice deleted' });
    }

    // POST /api/v1/invoices/:id/payments - Add payment
    const paymentMatch = path.match(/^\/api\/v1\/invoices\/([^/]+)\/payments$/);
    if (paymentMatch && method === 'POST') {
      const invoiceId = paymentMatch[1];
      const { amount, paymentMethod, paymentDate, notes, reference } = body;
      
      const payment = await db.invoicePayment.create({
        data: {
          invoiceId,
          amount,
          paymentMethod: paymentMethod || 'CASH',
          paymentDate: paymentDate ? new Date(paymentDate) : new Date(),
          notes,
          reference,
        },
      });
      
      // Update invoice paid amount and status
      const invoice = await db.invoice.findUnique({
        where: { id: invoiceId },
        include: { payments: true },
      });
      
      if (invoice) {
        const totalPaid = invoice.payments.reduce((sum: number, p: any) => sum + p.amount, 0) + amount;
        const dueAmount = invoice.total - totalPaid;
        let status = 'UNPAID';
        if (totalPaid >= invoice.total) status = 'FULLPAID';
        else if (totalPaid > 0) status = 'HALFPAY';
        
        await db.invoice.update({
          where: { id: invoiceId },
          data: { paidAmount: totalPaid, dueAmount, status },
        });
      }
      
      return res.status(201).json({ success: true, data: payment });
    }

    // ==================== CUSTOMERS ====================
    if (path === '/api/v1/customers' && method === 'GET') {
      const customers = await db.customer.findMany({ orderBy: { name: 'asc' } });
      return res.status(200).json({ success: true, data: customers });
    }

    if (path === '/api/v1/customers' && method === 'POST') {
      const customer = await db.customer.create({ data: body });
      return res.status(201).json({ success: true, data: customer });
    }

    // ==================== PRODUCTS ====================
    if (path === '/api/v1/products' && method === 'GET') {
      const products = await db.product.findMany({
        include: { category: true, brand: true },
        orderBy: { name: 'asc' },
      });
      return res.status(200).json({ success: true, data: products });
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
