import { Request, Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma';
import { AppError } from '../middleware/errorHandler';
import { Prisma, InvoiceStatus, PaymentMethod, SalesChannel } from '@prisma/client';

// Helper function to generate invoice number
const generateInvoiceNumber = async (): Promise<string> => {
  const year = new Date().getFullYear();
  const prefix = `INV-${year}-`;
  
  // Get the last invoice number for this year
  const lastInvoice = await prisma.invoice.findFirst({
    where: {
      invoiceNumber: { startsWith: prefix }
    },
    orderBy: { invoiceNumber: 'desc' }
  });

  let nextNumber = 1;
  if (lastInvoice) {
    const lastNumber = parseInt(lastInvoice.invoiceNumber.replace(prefix, ''));
    nextNumber = lastNumber + 1;
  }

  return `${prefix}${nextNumber.toString().padStart(4, '0')}`;
};

// Helper function to calculate invoice status
const calculateInvoiceStatus = (total: number, paidAmount: number): InvoiceStatus => {
  if (paidAmount >= total) return 'FULLPAID';
  if (paidAmount > 0) return 'HALFPAY';
  return 'UNPAID';
};

// @desc    Get all invoices with filtering and pagination
// @route   GET /api/v1/invoices
// @access  Public (will be protected)
export const getAllInvoices = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const {
      page = '1',
      limit = '10',
      status,
      customerId,
      startDate,
      endDate,
      search,
      sortBy = 'date',
      sortOrder = 'desc',
    } = req.query;

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    // Build filter conditions
    const where: Prisma.InvoiceWhereInput = {};

    if (status && status !== 'all') {
      where.status = status as InvoiceStatus;
    }

    if (customerId && customerId !== 'all') {
      where.customerId = customerId as string;
    }

    if (startDate || endDate) {
      where.date = {};
      if (startDate) {
        where.date.gte = new Date(startDate as string);
      }
      if (endDate) {
        where.date.lte = new Date(endDate as string);
      }
    }

    if (search) {
      where.OR = [
        { invoiceNumber: { contains: search as string, mode: 'insensitive' } },
        { customerName: { contains: search as string, mode: 'insensitive' } },
      ];
    }

    // Build sort options
    const orderBy: Prisma.InvoiceOrderByWithRelationInput = {};
    const sortField = sortBy as string;
    orderBy[sortField as keyof Prisma.InvoiceOrderByWithRelationInput] = 
      sortOrder as Prisma.SortOrder;

    // Execute queries
    const [invoices, total] = await Promise.all([
      prisma.invoice.findMany({
        where,
        include: {
          customer: {
            select: { id: true, name: true, email: true, phone: true }
          },
          items: {
            include: {
              product: {
                select: { id: true, name: true, price: true }
              }
            }
          },
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
    next(error);
  }
};

// @desc    Get invoice by ID
// @route   GET /api/v1/invoices/:id
// @access  Public (will be protected)
export const getInvoiceById = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    
    // Try to find by ID first, then by invoice number
    let invoice = await prisma.invoice.findUnique({
      where: { id },
      include: {
        customer: true,
        items: {
          include: {
            product: true
          }
        },
        payments: {
          orderBy: { paymentDate: 'desc' }
        },
        createdBy: {
          select: { id: true, name: true, email: true }
        },
        updatedBy: {
          select: { id: true, name: true, email: true }
        },
      },
    });

    // If not found by ID, try by invoice number
    if (!invoice) {
      invoice = await prisma.invoice.findFirst({
        where: { 
          OR: [
            { invoiceNumber: id },
            { invoiceNumber: { contains: id } }
          ]
        },
        include: {
          customer: true,
          items: {
            include: {
              product: true
            }
          },
          payments: {
            orderBy: { paymentDate: 'desc' }
          },
          createdBy: {
            select: { id: true, name: true, email: true }
          },
          updatedBy: {
            select: { id: true, name: true, email: true }
          },
        },
      });
    }

    if (!invoice) {
      throw new AppError(`Invoice not found with ID or number: ${id}`, 404);
    }

    res.json({
      success: true,
      data: invoice,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create new invoice
// @route   POST /api/v1/invoices
// @access  Public (will be protected)
export const createInvoice = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const {
      customerId,
      items,
      tax = 0,
      discount = 0,
      dueDate,
      paymentMethod,
      salesChannel = 'ON_SITE',
      paidAmount = 0,
      notes,
      shopId, // Can be provided in request body
    } = req.body;

    console.log('📝 Creating invoice:', { customerId, itemCount: items?.length, tax, discount, dueDate, paymentMethod, salesChannel, paidAmount });

    // Validate customer exists
    const customer = await prisma.customer.findUnique({
      where: { id: customerId },
    });

    if (!customer) {
      throw new AppError(`Customer not found with ID: ${customerId}`, 404);
    }

    // Use customer's shopId if not provided in request
    const invoiceShopId = shopId || customer.shopId;
    if (!invoiceShopId) {
      throw new AppError('Shop ID is required. Customer does not have a shop assigned.', 400);
    }

    // Validate items
    if (!items || items.length === 0) {
      throw new AppError('At least one item is required', 400);
    }

    // Validate all product IDs exist
    for (const item of items) {
      const product = await prisma.product.findUnique({
        where: { id: item.productId }
      });
      if (!product) {
        console.log(`⚠️ Product not found: ${item.productId} (${item.productName})`);
        // Don't fail, just log - product might be a quick-add item
      }
    }

    // Calculate totals
    const subtotal = items.reduce((sum: number, item: { quantity: number; unitPrice: number }) => {
      return sum + (item.quantity * item.unitPrice);
    }, 0);

    const total = subtotal + tax - discount;
    const dueAmount = total - paidAmount;
    const status = calculateInvoiceStatus(total, paidAmount);

    // Generate invoice number
    const invoiceNumber = await generateInvoiceNumber();

    // Create invoice with items in a transaction
    const invoice = await prisma.$transaction(async (tx) => {
      const newInvoice = await tx.invoice.create({
        data: {
          invoiceNumber,
          customerId,
          customerName: customer.name,
          subtotal,
          tax,
          discount,
          total,
          paidAmount,
          dueAmount,
          status,
          dueDate: new Date(dueDate),
          paymentMethod: paymentMethod as PaymentMethod,
          salesChannel: salesChannel as SalesChannel,
          notes,
          shopId: invoiceShopId,
          items: {
            create: items.map((item: {
              productId: string;
              productName: string;
              quantity: number;
              unitPrice: number;
              originalPrice?: number;
              discount?: number;
              warrantyDueDate?: string;
            }) => ({
              productId: item.productId,
              productName: item.productName,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              originalPrice: item.originalPrice || item.unitPrice,
              discount: item.discount || 0,
              total: item.quantity * item.unitPrice,
              warrantyDueDate: item.warrantyDueDate ? new Date(item.warrantyDueDate) : null,
            })),
          },
        },
        include: {
          customer: true,
          items: true,
        },
      });

      // Create initial payment record if paidAmount > 0
      if (paidAmount > 0 && paymentMethod) {
        await tx.invoicePayment.create({
          data: {
            invoiceId: newInvoice.id,
            amount: paidAmount,
            paymentMethod: paymentMethod as PaymentMethod,
          },
        });
      }

      // Update customer stats
      await tx.customer.update({
        where: { id: customerId },
        data: {
          totalOrders: { increment: 1 },
          totalSpent: { increment: paidAmount },
          lastPurchase: new Date(),
          creditBalance: status !== 'FULLPAID' ? { increment: dueAmount } : undefined,
          creditStatus: status !== 'FULLPAID' ? 'ACTIVE' : undefined,
        },
      });

      // Update product stock
      for (const item of items) {
        await tx.product.update({
          where: { id: item.productId },
          data: {
            stock: { decrement: item.quantity },
          },
        });
      }

      return newInvoice;
    });

    res.status(201).json({
      success: true,
      message: 'Invoice created successfully',
      data: invoice,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update invoice
// @route   PUT /api/v1/invoices/:id
// @access  Public (will be protected)
export const updateInvoice = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const {
      customerId,
      items,
      tax,
      discount,
      dueDate,
      paymentMethod,
      salesChannel,
      paidAmount,
      notes,
      status: manualStatus,
    } = req.body;

    // Check if invoice exists - try by ID first, then by invoiceNumber
    let existingInvoice = await prisma.invoice.findUnique({
      where: { id },
      include: { items: true },
    });

    // If not found by ID, try by invoice number (for legacy/display ID support)
    if (!existingInvoice) {
      existingInvoice = await prisma.invoice.findFirst({
        where: { 
          OR: [
            { invoiceNumber: id },
            { invoiceNumber: { contains: id } }
          ]
        },
        include: { items: true },
      });
    }

    if (!existingInvoice) {
      throw new AppError(`Invoice not found with ID or number: ${id}`, 404);
    }

    // Use the actual database ID for updates
    const invoiceId = existingInvoice.id;

    // Calculate new totals if items are provided
    let subtotal = existingInvoice.subtotal;
    let newTax = tax !== undefined ? tax : existingInvoice.tax;
    let newDiscount = discount !== undefined ? discount : existingInvoice.discount;
    let newPaidAmount = paidAmount !== undefined ? paidAmount : existingInvoice.paidAmount;

    if (items && items.length > 0) {
      subtotal = items.reduce((sum: number, item: { quantity: number; unitPrice: number }) => {
        return sum + (item.quantity * item.unitPrice);
      }, 0);
    }

    const total = subtotal + newTax - newDiscount;
    const dueAmount = total - newPaidAmount;
    const status = manualStatus || calculateInvoiceStatus(total, newPaidAmount);

    // Update in transaction
    const invoice = await prisma.$transaction(async (tx) => {
      // Delete existing items if new items provided
      if (items && items.length > 0) {
        await tx.invoiceItem.deleteMany({
          where: { invoiceId: invoiceId },
        });
      }

      // Update invoice
      const updatedInvoice = await tx.invoice.update({
        where: { id: invoiceId },
        data: {
          ...(customerId && { customerId }),
          subtotal,
          tax: newTax,
          discount: newDiscount,
          total,
          paidAmount: newPaidAmount,
          dueAmount,
          status: status as InvoiceStatus,
          ...(dueDate && { dueDate: new Date(dueDate) }),
          ...(paymentMethod && { paymentMethod: paymentMethod as PaymentMethod }),
          ...(salesChannel && { salesChannel: salesChannel as SalesChannel }),
          ...(notes !== undefined && { notes }),
          ...(items && items.length > 0 && {
            items: {
              create: items.map((item: {
                productId: string;
                productName: string;
                quantity: number;
                unitPrice: number;
                originalPrice?: number;
                discount?: number;
                warrantyDueDate?: string;
              }) => ({
                productId: item.productId,
                productName: item.productName,
                quantity: item.quantity,
                unitPrice: item.unitPrice,
                originalPrice: item.originalPrice || item.unitPrice,
                discount: item.discount || 0,
                total: item.quantity * item.unitPrice,
                warrantyDueDate: item.warrantyDueDate ? new Date(item.warrantyDueDate) : null,
              })),
            },
          }),
        },
        include: {
          customer: true,
          items: true,
          payments: true,
        },
      });

      return updatedInvoice;
    });

    res.json({
      success: true,
      message: 'Invoice updated successfully',
      data: invoice,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete invoice
// @route   DELETE /api/v1/invoices/:id
// @access  Public (will be protected)
export const deleteInvoice = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;

    // Check if invoice exists - try by ID first, then by invoiceNumber
    let invoice = await prisma.invoice.findUnique({
      where: { id },
      include: { items: true },
    });

    // If not found by ID, try by invoice number
    if (!invoice) {
      invoice = await prisma.invoice.findFirst({
        where: { 
          OR: [
            { invoiceNumber: id },
            { invoiceNumber: { contains: id } }
          ]
        },
        include: { items: true },
      });
    }

    if (!invoice) {
      throw new AppError(`Invoice not found with ID or number: ${id}`, 404);
    }

    // Use actual database ID
    const invoiceId = invoice.id;

    // Delete in transaction (restore stock)
    await prisma.$transaction(async (tx) => {
      // Restore product stock
      for (const item of invoice.items) {
        await tx.product.update({
          where: { id: item.productId },
          data: {
            stock: { increment: item.quantity },
          },
        });
      }

      // Update customer stats
      await tx.customer.update({
        where: { id: invoice.customerId },
        data: {
          totalOrders: { decrement: 1 },
          totalSpent: { decrement: invoice.paidAmount },
          creditBalance: { decrement: invoice.dueAmount },
        },
      });

      // Delete invoice (cascade deletes items and payments)
      await tx.invoice.delete({
        where: { id: invoiceId },
      });
    });

    res.json({
      success: true,
      message: 'Invoice deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Add payment to invoice
// @route   POST /api/v1/invoices/:id/payments
// @access  Public (will be protected)
export const addPayment = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const { amount, paymentMethod, notes, reference } = req.body;

    // Get invoice - try by ID first, then by invoiceNumber
    let invoice = await prisma.invoice.findUnique({
      where: { id },
    });

    // If not found by ID, try by invoice number
    if (!invoice) {
      invoice = await prisma.invoice.findFirst({
        where: { 
          OR: [
            { invoiceNumber: id },
            { invoiceNumber: { contains: id } }
          ]
        },
      });
    }

    if (!invoice) {
      throw new AppError(`Invoice not found with ID or number: ${id}`, 404);
    }

    // Use actual database ID
    const invoiceId = invoice.id;

    if (invoice.status === 'FULLPAID') {
      throw new AppError('Invoice is already fully paid', 400);
    }

    const maxPayment = invoice.dueAmount;
    if (amount > maxPayment) {
      throw new AppError(`Payment amount cannot exceed due amount of ${maxPayment}`, 400);
    }

    // Calculate new amounts
    const newPaidAmount = invoice.paidAmount + amount;
    const newDueAmount = invoice.total - newPaidAmount;
    const newStatus = calculateInvoiceStatus(invoice.total, newPaidAmount);

    // Create payment and update invoice in transaction
    const [payment, updatedInvoice] = await prisma.$transaction(async (tx) => {
      const newPayment = await tx.invoicePayment.create({
        data: {
          invoiceId: invoiceId,
          amount,
          paymentMethod: paymentMethod as PaymentMethod,
          notes,
          reference,
        },
      });

      const updated = await tx.invoice.update({
        where: { id: invoiceId },
        data: {
          paidAmount: newPaidAmount,
          dueAmount: newDueAmount,
          status: newStatus,
        },
        include: {
          customer: true,
          items: true,
          payments: {
            orderBy: { paymentDate: 'desc' }
          },
        },
      });

      // Update customer stats
      await tx.customer.update({
        where: { id: invoice.customerId },
        data: {
          totalSpent: { increment: amount },
          creditBalance: { decrement: amount },
          creditStatus: newStatus === 'FULLPAID' ? 'CLEAR' : undefined,
        },
      });

      return [newPayment, updated];
    });

    res.status(201).json({
      success: true,
      message: 'Payment recorded successfully',
      data: {
        payment,
        invoice: updatedInvoice,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get invoice statistics
// @route   GET /api/v1/invoices/stats
// @access  Public (will be protected)
export const getInvoiceStats = async (
  _req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const [
      totalInvoices,
      statusCounts,
      revenueStats,
      recentInvoices,
    ] = await Promise.all([
      // Total invoices count
      prisma.invoice.count(),
      
      // Count by status
      prisma.invoice.groupBy({
        by: ['status'],
        _count: { status: true },
        _sum: { total: true, paidAmount: true, dueAmount: true },
      }),
      
      // Revenue statistics
      prisma.invoice.aggregate({
        _sum: {
          total: true,
          paidAmount: true,
          dueAmount: true,
          tax: true,
          discount: true,
        },
        _avg: {
          total: true,
        },
      }),
      
      // Recent invoices
      prisma.invoice.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: {
          customer: {
            select: { name: true }
          }
        },
      }),
    ]);

    // Format status counts
    const statusStats = statusCounts.reduce((acc, curr) => {
      acc[curr.status.toLowerCase()] = {
        count: curr._count.status,
        total: curr._sum.total || 0,
        paid: curr._sum.paidAmount || 0,
        due: curr._sum.dueAmount || 0,
      };
      return acc;
    }, {} as Record<string, { count: number; total: number; paid: number; due: number }>);

    res.json({
      success: true,
      data: {
        totalInvoices,
        statusStats,
        revenue: {
          total: revenueStats._sum.total || 0,
          paid: revenueStats._sum.paidAmount || 0,
          due: revenueStats._sum.dueAmount || 0,
          tax: revenueStats._sum.tax || 0,
          discount: revenueStats._sum.discount || 0,
          average: revenueStats._avg.total || 0,
        },
        recentInvoices,
      },
    });
  } catch (error) {
    next(error);
  }
};
