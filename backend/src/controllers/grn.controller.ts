import { Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma';
import type { AuthRequest } from '../types/express';
import { StockMovementType, GRNStatus, PaymentStatus, PriceChangeType } from '@prisma/client';

// Helper function to get effective shopId for SuperAdmin shop viewing
const getEffectiveShopId = (req: AuthRequest): string | null => {
  const { shopId: queryShopId } = req.query;
  const userRole = req.user?.role;
  const userShopId = req.user?.shopId;
  
  // SuperAdmin can view any shop by passing shopId query parameter
  if (userRole === 'SUPER_ADMIN' && queryShopId && typeof queryShopId === 'string') {
    return queryShopId;
  }
  
  return userShopId || null;
};

// Helper to generate GRN Number
const generateGRNNumber = async (shopId: string): Promise<string> => {
  const count = await prisma.gRN.count({ where: { shopId } });
  const dateStr = new Date().getFullYear().toString();
  // Format: GRN-2024-001
  return `GRN-${dateStr}-${(count + 1).toString().padStart(4, '0')}`;
};

// Create a new GRN with full stock/price effects
export const createGRN = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const shopId = getEffectiveShopId(req);
    const userId = req.user?.id;
    
    if (!shopId) {
      return res.status(403).json({ success: false, message: 'Shop access required' });
    }

    const {
      supplierId,
      referenceNo,
      date,
      expectedDate,
      items, // Array of { productId, quantity, costPrice, sellingPrice? }
      discount = 0,
      tax = 0,
      notes,
      paymentStatus = 'UNPAID',
      paidAmount = 0
    } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, message: 'GRN must have at least one item' });
    }

    // Calculate totals
    const subtotal = items.reduce((sum: number, item: any) => sum + (item.quantity * item.costPrice), 0);
    const totalAmount = subtotal + tax - discount;

    const grnNumber = await generateGRNNumber(shopId);

    // Perform everything in a transaction
    const grn = await prisma.$transaction(async (tx) => {
      // 1. Create GRN Header
      const newGRN = await tx.gRN.create({
        data: {
          shopId,
          grnNumber,
          supplierId,
          referenceNo,
          date: date ? new Date(date) : new Date(),
          expectedDate: expectedDate ? new Date(expectedDate) : null,
          subtotal,
          tax,
          discount,
          totalAmount,
          paidAmount,
          status: 'COMPLETED', // Direct to completed for now, or could be DRAFT
          paymentStatus: paymentStatus as PaymentStatus,
          notes,
          createdById: userId,
        }
      });

      // 2. Process Items
      for (const item of items) {
        // Fetch current product state
        const product = await tx.product.findUnique({
          where: { id: item.productId }
        });

        if (!product || product.shopId !== shopId) {
          throw new Error(`Product not found or access denied: ${item.productId}`);
        }

        // a. Create GRN Item
        await tx.gRNItem.create({
          data: {
            grnId: newGRN.id,
            productId: item.productId,
            quantity: item.quantity,
            costPrice: item.costPrice,
            sellingPrice: item.sellingPrice, // Optional new selling price
            totalCost: item.quantity * item.costPrice
          }
        });

        // b. Update Product Stock & Price
        const newStock = product.stock + item.quantity;
        const totalPurchased = product.totalPurchased + item.quantity;
        
        // Update product data
        await tx.product.update({
          where: { id: item.productId },
          data: {
            stock: newStock,
            totalPurchased,
            costPrice: item.costPrice, // Update to latest cost
            lastCostPrice: product.costPrice, // Archive old cost
            // Update selling price ONLY if provided
            price: item.sellingPrice ? item.sellingPrice : product.price,
            lastGRNId: newGRN.id,
            lastGRNDate: new Date()
          }
        });

        // c. Create Stock Movement
        await tx.stockMovement.create({
          data: {
            shopId,
            productId: item.productId,
            type: StockMovementType.GRN_IN,
            quantity: item.quantity,
            previousStock: product.stock,
            newStock: newStock,
            referenceId: newGRN.id,
            referenceNumber: grnNumber,
            referenceType: 'grn',
            unitPrice: item.costPrice, // Cost price for GRN
            createdBy: userId,
            notes: `GRN Received from Supplier`
          }
        });

        // d. Price History (Track Changes)
        const costChanged = product.costPrice !== item.costPrice;
        const sellingChanged = item.sellingPrice && product.price !== item.sellingPrice;

        if (costChanged || sellingChanged) {
          let changeType: PriceChangeType = PriceChangeType.COST_UPDATE;
          if (costChanged && sellingChanged) changeType = PriceChangeType.BOTH;
          else if (sellingChanged) changeType = PriceChangeType.SELLING_UPDATE;

          await tx.priceHistory.create({
            data: {
              shopId,
              productId: item.productId,
              product: { connect: { id: item.productId } },
              changeType,
              previousCostPrice: product.costPrice || 0,
              newCostPrice: item.costPrice,
              previousSellingPrice: product.price,
              newSellingPrice: item.sellingPrice || product.price,
              reason: `GRN ${grnNumber}`,
              referenceId: newGRN.id,
              createdBy: userId
            }
          });
        }
      }

      return newGRN;
    });

    res.status(201).json({ success: true, data: grn });
  } catch (error: any) {
    next(error);
  }
};

// Get all GRNs
export const getGRNs = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const shopId = getEffectiveShopId(req);
    if (!shopId) {
      return res.status(403).json({ success: false, message: 'Shop access required' });
    }

    const { status, supplierId } = req.query;

    const where: any = { shopId };
    if (status) where.status = status;
    if (supplierId) where.supplierId = supplierId;

    const grns = await prisma.gRN.findMany({
      where,
      include: {
        supplier: {
          select: { name: true }
        },
        _count: {
          select: { items: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json({ success: true, data: grns });
  } catch (error) {
    next(error);
  }
};

// Get GRN Details
export const getGRNById = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const shopId = getEffectiveShopId(req);
    const { id } = req.params;

    const grn = await prisma.gRN.findUnique({
      where: { id },
      include: {
        supplier: true,
        items: {
          include: {
            product: {
              select: { name: true, barcode: true, serialNumber: true }
            }
          }
        },
        createdBy: {
          select: { name: true }
        }
      }
    });

    if (!grn) {
      return res.status(404).json({ success: false, message: 'GRN not found' });
    }

    if (grn.shopId !== shopId) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    res.json({ success: true, data: grn });
  } catch (error) {
    next(error);
  }
};

// Delete GRN with stock reversal
export const deleteGRN = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const shopId = getEffectiveShopId(req);
    const userId = req.user?.id;
    const { id } = req.params;

    if (!shopId) {
      return res.status(403).json({ success: false, message: 'Shop access required' });
    }

    const grn = await prisma.gRN.findUnique({
      where: { id },
      include: {
        items: true
      }
    });

    if (!grn) {
      return res.status(404).json({ success: false, message: 'GRN not found' });
    }

    if (grn.shopId !== shopId) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    // Reverse stock changes in a transaction
    await prisma.$transaction(async (tx) => {
      // Reverse each item's stock
      for (const item of grn.items) {
        const product = await tx.product.findUnique({
          where: { id: item.productId }
        });

        if (product) {
          const newStock = Math.max(0, product.stock - item.quantity);
          const newTotalPurchased = Math.max(0, product.totalPurchased - item.quantity);

          await tx.product.update({
            where: { id: item.productId },
            data: {
              stock: newStock,
              totalPurchased: newTotalPurchased
            }
          });

          // Create reversal stock movement
          await tx.stockMovement.create({
            data: {
              shopId,
              productId: item.productId,
              type: StockMovementType.ADJUSTMENT,
              quantity: -item.quantity,
              previousStock: product.stock,
              newStock: newStock,
              referenceId: grn.id,
              referenceNumber: grn.grnNumber,
              referenceType: 'grn_delete',
              unitPrice: item.costPrice,
              createdBy: userId,
              notes: `GRN Deleted - Stock Reversed`
            }
          });
        }
      }

      // Delete GRN items first (due to foreign key)
      await tx.gRNItem.deleteMany({
        where: { grnId: id }
      });

      // Delete the GRN
      await tx.gRN.delete({
        where: { id }
      });
    });

    res.json({ success: true, message: 'GRN deleted and stock reversed' });
  } catch (error) {
    next(error);
  }
};

// Update GRN (limited fields - not items)
export const updateGRN = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const shopId = getEffectiveShopId(req);
    const { id } = req.params;

    if (!shopId) {
      return res.status(403).json({ success: false, message: 'Shop access required' });
    }

    const grn = await prisma.gRN.findUnique({
      where: { id }
    });

    if (!grn) {
      return res.status(404).json({ success: false, message: 'GRN not found' });
    }

    if (grn.shopId !== shopId) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const { notes, paymentStatus, paidAmount, status } = req.body;

    const updated = await prisma.gRN.update({
      where: { id },
      data: {
        notes: notes !== undefined ? notes : grn.notes,
        paymentStatus: paymentStatus ? paymentStatus as PaymentStatus : grn.paymentStatus,
        paidAmount: paidAmount !== undefined ? paidAmount : grn.paidAmount,
        status: status ? status as GRNStatus : grn.status
      },
      include: {
        supplier: true,
        items: {
          include: {
            product: {
              select: { name: true }
            }
          }
        }
      }
    });

    res.json({ success: true, data: updated });
  } catch (error) {
    next(error);
  }
};
