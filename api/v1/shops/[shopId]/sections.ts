// Dedicated Serverless Function for Shop Section Visibility
// File-based routing: /api/v1/shops/[shopId]/sections
// VERSION: 2026-02-03-sections-v1
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';

// Global Prisma instance
const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };
const prisma = globalForPrisma.prisma || new PrismaClient({
  log: process.env.NODE_ENV === 'production' ? ['error'] : ['query', 'error'],
});
globalForPrisma.prisma = prisma;

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-production';

// CORS Headers
function setCorsHeaders(req: VercelRequest, res: VercelResponse) {
  const origin = req.headers.origin || '';
  const allowedOrigins = [
    'http://localhost:5173',
    'http://localhost:3000',
    'https://eco-system-6jj4.vercel.app',
    /\.vercel\.app$/,
  ];

  const isAllowed = allowedOrigins.some(allowed => 
    typeof allowed === 'string' ? origin === allowed : allowed.test(origin)
  );

  if (isAllowed || !origin) {
    res.setHeader('Access-Control-Allow-Origin', origin || '*');
  }

  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Request-ID');
}

// Get user role from JWT
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

// Get shop ID from JWT
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

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCorsHeaders(req, res);

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { shopId } = req.query;
  const method = req.method || 'GET';
  const body = req.body || {};

  console.log('🔧 Sections API called:', { shopId, method, timestamp: new Date().toISOString() });

  // Validate shopId
  if (!shopId || typeof shopId !== 'string') {
    return res.status(400).json({ success: false, error: 'Shop ID is required' });
  }

  try {
    // GET - Fetch hidden sections
    if (method === 'GET') {
      console.log('📦 Fetching sections for shop:', shopId);
      
      const shop = await prisma.shop.findUnique({
        where: { id: shopId },
        select: {
          id: true,
          hiddenSections: true,
          adminHiddenSections: true,
        },
      });

      if (!shop) {
        console.log('❌ Shop not found:', shopId);
        return res.status(404).json({ success: false, error: 'Shop not found' });
      }

      console.log('✅ Sections loaded:', { 
        hiddenSections: shop.hiddenSections?.length || 0,
        adminHiddenSections: shop.adminHiddenSections?.length || 0
      });

      return res.status(200).json({
        success: true,
        hiddenSections: shop.hiddenSections || [],
        adminHiddenSections: shop.adminHiddenSections || [],
      });
    }

    // PUT/PATCH - Update hidden sections
    if (method === 'PUT' || method === 'PATCH') {
      const userRole = getUserRoleFromToken(req);
      const userShopId = getShopIdFromToken(req);
      
      console.log('🔐 Update sections auth:', { userRole, userShopId, targetShopId: shopId });

      if (!userRole) {
        return res.status(401).json({ success: false, message: 'Authentication required' });
      }

      // Check authorization
      if (userRole !== 'SUPER_ADMIN' && userRole !== 'ADMIN') {
        return res.status(403).json({ success: false, message: 'Insufficient permissions' });
      }

      // ADMIN can only update their own shop
      if (userRole === 'ADMIN' && userShopId !== shopId) {
        return res.status(403).json({ success: false, message: 'Cannot update sections for another shop' });
      }

      // Check if shop exists
      const existingShop = await prisma.shop.findUnique({
        where: { id: shopId },
      });

      if (!existingShop) {
        return res.status(404).json({ success: false, error: 'Shop not found' });
      }

      const { hiddenSections, adminHiddenSections } = body;
      const updateData: { hiddenSections?: string[]; adminHiddenSections?: string[] } = {};

      // SuperAdmin can update hiddenSections (affects ADMIN + USER)
      if (userRole === 'SUPER_ADMIN' && hiddenSections !== undefined) {
        if (!Array.isArray(hiddenSections)) {
          return res.status(400).json({ success: false, error: 'hiddenSections must be an array of strings' });
        }
        updateData.hiddenSections = hiddenSections;
        console.log('🔒 SuperAdmin updating hiddenSections:', hiddenSections);
      }

      // Shop ADMIN or SUPER_ADMIN can update adminHiddenSections (affects USER only)
      if ((userRole === 'ADMIN' || userRole === 'SUPER_ADMIN') && adminHiddenSections !== undefined) {
        if (!Array.isArray(adminHiddenSections)) {
          return res.status(400).json({ success: false, error: 'adminHiddenSections must be an array of strings' });
        }
        updateData.adminHiddenSections = adminHiddenSections;
        console.log('🔒 Admin updating adminHiddenSections:', adminHiddenSections);
      }

      // If no valid update data, return error
      if (Object.keys(updateData).length === 0) {
        return res.status(400).json({ success: false, error: 'No valid section data to update' });
      }

      const updatedShop = await prisma.shop.update({
        where: { id: shopId },
        data: updateData,
        select: {
          id: true,
          hiddenSections: true,
          adminHiddenSections: true,
        },
      });

      console.log('✅ Sections updated successfully:', {
        hiddenSections: updatedShop.hiddenSections?.length || 0,
        adminHiddenSections: updatedShop.adminHiddenSections?.length || 0
      });

      return res.status(200).json({
        success: true,
        message: 'Section visibility updated successfully',
        hiddenSections: updatedShop.hiddenSections,
        adminHiddenSections: updatedShop.adminHiddenSections,
      });
    }

    // Method not allowed
    return res.status(405).json({ success: false, error: 'Method not allowed' });

  } catch (error) {
    console.error('❌ Sections API Error:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error',
    });
  }
}
