// Vercel Serverless API Handler - Complete CRUD with all features
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

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCorsHeaders(res);

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { path, query } = parseUrl(req.url || '/');
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

    // ==================== INVOICE STATS ====================
    if (path === '/api/v1/invoices/stats' && method === 'GET') {
      const invoices = await db.invoice.findMany({
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
      const page = parseInt(query.page || '1');
      const limit = parseInt(query.limit || '100');
      const status = query.status;
      const customerId = query.customerId;
      const search = query.search;
      const sortBy = query.sortBy || 'date';
      const sortOrder = (query.sortOrder || 'desc') as 'asc' | 'desc';

      const where: any = {};
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
          },
          orderBy,
          skip: (page - 1) * limit,
          take: limit,
        }),
        db.invoice.count({ where }),
      ]);

      return res.status(200).json({
        success: true,
        data: invoices,
        pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
      });
    }

    // ==================== GET SINGLE INVOICE ====================
    const invoiceGetMatch = path.match(/^\/api\/v1\/invoices\/([^/]+)$/);
    if (invoiceGetMatch && method === 'GET') {
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
      return res.status(200).json({ success: true, data: invoice });
    }

    // ==================== CREATE INVOICE ====================
    if (path === '/api/v1/invoices' && method === 'POST') {
      const { customerId, items, subtotal, tax, discount, total, paidAmount, status, date, dueDate, paymentMethod, salesChannel, notes } = body;
      
      // Get customer name
      const customer = await db.customer.findUnique({ where: { id: customerId } });
      const customerName = customer?.name || 'Unknown Customer';
      
      // Generate invoice number
      const lastInvoice = await db.invoice.findFirst({ orderBy: { invoiceNumber: 'desc' } });
      const lastNum = lastInvoice ? parseInt(lastInvoice.invoiceNumber.replace(/\D/g, '')) : 10260000;
      const invoiceNumber = `INV-${lastNum + 1}`;

      const calculatedTotal = total || (subtotal || 0) + (tax || 0) - (discount || 0);
      const calculatedPaid = paidAmount || 0;
      const calculatedDue = calculatedTotal - calculatedPaid;
      
      let invoiceStatus = status || 'UNPAID';
      if (!status) {
        if (calculatedPaid >= calculatedTotal) invoiceStatus = 'FULLPAID';
        else if (calculatedPaid > 0) invoiceStatus = 'HALFPAY';
      }

      const invoice = await db.invoice.create({
        data: {
          invoiceNumber,
          customerId,
          customerName,
          subtotal: subtotal || 0,
          tax: tax || 0,
          discount: discount || 0,
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
              return {
                productId: validProductId,
                productName: item.productName || item.name,
                quantity: item.quantity,
                unitPrice: item.unitPrice || item.price,
                originalPrice: item.originalPrice,
                discount: item.discount || 0,
                total: item.total || (item.quantity * (item.unitPrice || item.price)),
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
      
      const { status, paidAmount, notes, customerName, discount, tax, total, dueAmount, items } = body;
      
      const updateData: any = {};
      if (status !== undefined && status !== null) updateData.status = String(status).toUpperCase();
      if (paidAmount !== undefined) updateData.paidAmount = paidAmount;
      if (notes !== undefined) updateData.notes = notes;
      if (customerName !== undefined) updateData.customerName = customerName;
      if (discount !== undefined) updateData.discount = discount;
      if (tax !== undefined) updateData.tax = tax;
      if (total !== undefined) updateData.total = total;
      if (dueAmount !== undefined) updateData.dueAmount = dueAmount;
      
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
      
      // Delete related items and payments first
      await db.invoiceItem.deleteMany({ where: { invoiceId: existingInvoice.id } });
      await db.invoicePayment.deleteMany({ where: { invoiceId: existingInvoice.id } });
      await db.invoice.delete({ where: { id: existingInvoice.id } });
      
      return res.status(200).json({ success: true, message: 'Invoice deleted' });
    }

    // ==================== ADD PAYMENT ====================
    const paymentMatch = path.match(/^\/api\/v1\/invoices\/([^/]+)\/payments$/);
    if (paymentMatch && method === 'POST') {
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
      
      let status = 'UNPAID';
      if (totalPaid >= existingInvoice.total) status = 'FULLPAID';
      else if (totalPaid > 0) status = 'HALFPAY';
      
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

    // ==================== CUSTOMERS ====================
    if (path === '/api/v1/customers' && method === 'GET') {
      const customers = await db.customer.findMany({ orderBy: { name: 'asc' } });
      return res.status(200).json({ success: true, data: customers });
    }

    if (path === '/api/v1/customers' && method === 'POST') {
      const customer = await db.customer.create({ data: body });
      return res.status(201).json({ success: true, data: customer });
    }

    const customerMatch = path.match(/^\/api\/v1\/customers\/([^/]+)$/);
    if (customerMatch && method === 'GET') {
      const customer = await db.customer.findUnique({ where: { id: customerMatch[1] } });
      if (!customer) {
        return res.status(404).json({ success: false, error: 'Customer not found' });
      }
      return res.status(200).json({ success: true, data: customer });
    }

    if (customerMatch && (method === 'PUT' || method === 'PATCH')) {
      const customer = await db.customer.update({
        where: { id: customerMatch[1] },
        data: body,
      });
      return res.status(200).json({ success: true, data: customer });
    }

    if (customerMatch && method === 'DELETE') {
      await db.customer.delete({ where: { id: customerMatch[1] } });
      return res.status(200).json({ success: true, message: 'Customer deleted' });
    }

    // ==================== PRODUCTS ====================
    if (path === '/api/v1/products' && method === 'GET') {
      const products = await db.product.findMany({
        include: { category: true, brand: true },
        orderBy: { name: 'asc' },
      });
      return res.status(200).json({ success: true, data: products });
    }

    if (path === '/api/v1/products' && method === 'POST') {
      const product = await db.product.create({ 
        data: body,
        include: { category: true, brand: true },
      });
      return res.status(201).json({ success: true, data: product });
    }

    const productMatch = path.match(/^\/api\/v1\/products\/([^/]+)$/);
    if (productMatch && method === 'GET') {
      const product = await db.product.findUnique({ 
        where: { id: productMatch[1] },
        include: { category: true, brand: true },
      });
      if (!product) {
        return res.status(404).json({ success: false, error: 'Product not found' });
      }
      return res.status(200).json({ success: true, data: product });
    }

    if (productMatch && (method === 'PUT' || method === 'PATCH')) {
      const product = await db.product.update({
        where: { id: productMatch[1] },
        data: body,
        include: { category: true, brand: true },
      });
      return res.status(200).json({ success: true, data: product });
    }

    if (productMatch && method === 'DELETE') {
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
