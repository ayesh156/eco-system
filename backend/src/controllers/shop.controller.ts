import { Request, Response, NextFunction } from 'express';
import { PrismaClient, UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

// Helper to generate slug from shop name
function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

// Register a new shop with admin user
export const registerShop = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const {
      // Shop details
      shopName,
      shopDescription,
      address,
      phone,
      shopEmail,
      website,
      businessRegNo,
      taxId,
      currency = 'LKR',
      taxRate = 15,
      // Admin user details
      adminName,
      adminEmail,
      adminPassword,
    } = req.body;

    // Validate required fields
    if (!shopName || !adminName || !adminEmail || !adminPassword) {
      return res.status(400).json({
        success: false,
        error: 'Shop name, admin name, email and password are required',
      });
    }

    // Check if admin email already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: adminEmail },
    });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        error: 'A user with this email already exists',
      });
    }

    // Generate unique slug for shop
    let slug = generateSlug(shopName);
    let slugExists = await prisma.shop.findUnique({ where: { slug } });
    let counter = 1;
    while (slugExists) {
      slug = `${generateSlug(shopName)}-${counter}`;
      slugExists = await prisma.shop.findUnique({ where: { slug } });
      counter++;
    }

    // Check if shop email already exists (if provided)
    if (shopEmail) {
      const existingShopEmail = await prisma.shop.findFirst({
        where: { email: shopEmail },
      });
      if (existingShopEmail) {
        return res.status(400).json({
          success: false,
          error: 'A shop with this email already exists',
        });
      }
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(adminPassword, 10);

    // Create shop and admin user in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create shop
      const shop = await tx.shop.create({
        data: {
          name: shopName,
          slug,
          description: shopDescription,
          address,
          phone,
          email: shopEmail,
          website,
          businessRegNo,
          taxId,
          currency,
          taxRate,
          isActive: true,
        },
      });

      // Create admin user for this shop
      const admin = await tx.user.create({
        data: {
          email: adminEmail,
          password: hashedPassword,
          name: adminName,
          role: UserRole.ADMIN,
          isActive: true,
          shopId: shop.id,
        },
      });

      return { shop, admin };
    });

    // Don't return password
    const { password: _, ...adminWithoutPassword } = result.admin;

    res.status(201).json({
      success: true,
      message: 'Shop registered successfully',
      data: {
        shop: result.shop,
        admin: adminWithoutPassword,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Get shop by slug (public)
export const getShopBySlug = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { slug } = req.params;

    const shop = await prisma.shop.findUnique({
      where: { slug },
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        logo: true,
        address: true,
        phone: true,
        email: true,
        website: true,
        currency: true,
        taxRate: true,
        isActive: true,
      },
    });

    if (!shop) {
      return res.status(404).json({
        success: false,
        error: 'Shop not found',
      });
    }

    if (!shop.isActive) {
      return res.status(403).json({
        success: false,
        error: 'This shop is currently inactive',
      });
    }

    res.json({
      success: true,
      data: shop,
    });
  } catch (error) {
    next(error);
  }
};

// Get shop by ID (for authenticated users)
export const getShopById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const shop = await prisma.shop.findUnique({
      where: { id },
    });

    if (!shop) {
      return res.status(404).json({
        success: false,
        error: 'Shop not found',
      });
    }

    res.json({
      success: true,
      data: shop,
    });
  } catch (error) {
    next(error);
  }
};

// Update shop settings (admin only)
export const updateShop = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const {
      name,
      subName,
      tagline,
      description,
      logo,
      address,
      phone,
      email,
      website,
      businessRegNo,
      taxId,
      currency,
      taxRate,
    } = req.body;

    // Check if shop exists
    const existingShop = await prisma.shop.findUnique({
      where: { id },
    });

    if (!existingShop) {
      return res.status(404).json({
        success: false,
        error: 'Shop not found',
      });
    }

    // Update shop
    const updatedShop = await prisma.shop.update({
      where: { id },
      data: {
        name: name ?? undefined,
        subName: subName ?? undefined,
        tagline: tagline ?? undefined,
        description: description ?? undefined,
        logo: logo ?? undefined,
        address: address ?? undefined,
        phone: phone ?? undefined,
        email: email ?? undefined,
        website: website ?? undefined,
        businessRegNo: businessRegNo ?? undefined,
        taxId: taxId ?? undefined,
        currency: currency ?? undefined,
        taxRate: taxRate ?? undefined,
      },
    });

    res.json({
      success: true,
      message: 'Shop updated successfully',
      data: updatedShop,
    });
  } catch (error) {
    next(error);
  }
};

// Get all users for a shop (admin only)
export const getShopUsers = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const users = await prisma.user.findMany({
      where: { shopId: id },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        lastLogin: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'asc' },
    });

    res.json({
      success: true,
      data: users,
    });
  } catch (error) {
    next(error);
  }
};

// Add a new user to shop (admin only)
export const addShopUser = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id: shopId } = req.params;
    const { email, name, password, role } = req.body;

    // Validate required fields
    if (!email || !name || !password) {
      return res.status(400).json({
        success: false,
        error: 'Email, name, and password are required',
      });
    }

    // Check if email already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        error: 'A user with this email already exists',
      });
    }

    // Validate role
    const validRoles = [UserRole.ADMIN, UserRole.MANAGER, UserRole.STAFF];
    const userRole = role && validRoles.includes(role) ? role : UserRole.STAFF;

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const user = await prisma.user.create({
      data: {
        email,
        name,
        password: hashedPassword,
        role: userRole,
        shopId,
        isActive: true,
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        createdAt: true,
      },
    });

    res.status(201).json({
      success: true,
      message: 'User added successfully',
      data: user,
    });
  } catch (error) {
    next(error);
  }
};

// Update user role (admin only)
export const updateUserRole = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id: shopId, userId } = req.params;
    const { role, isActive } = req.body;

    // Check if user exists and belongs to this shop
    const user = await prisma.user.findFirst({
      where: { id: userId, shopId },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found in this shop',
      });
    }

    // Validate role if provided
    const validRoles = [UserRole.ADMIN, UserRole.MANAGER, UserRole.STAFF];
    if (role && !validRoles.includes(role)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid role. Must be ADMIN, MANAGER, or STAFF',
      });
    }

    // Update user
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        role: role ?? undefined,
        isActive: isActive ?? undefined,
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        updatedAt: true,
      },
    });

    res.json({
      success: true,
      message: 'User updated successfully',
      data: updatedUser,
    });
  } catch (error) {
    next(error);
  }
};

// Get shop statistics (admin only)
export const getShopStats = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id: shopId } = req.params;

    const [
      usersCount,
      customersCount,
      productsCount,
      categoriesCount,
      brandsCount,
      invoicesCount,
      totalRevenue,
    ] = await Promise.all([
      prisma.user.count({ where: { shopId } }),
      prisma.customer.count({ where: { shopId } }),
      prisma.product.count({ where: { shopId } }),
      prisma.category.count({ where: { shopId } }),
      prisma.brand.count({ where: { shopId } }),
      prisma.invoice.count({ where: { shopId } }),
      prisma.invoice.aggregate({
        where: { shopId },
        _sum: { paidAmount: true },
      }),
    ]);

    res.json({
      success: true,
      data: {
        users: usersCount,
        customers: customersCount,
        products: productsCount,
        categories: categoriesCount,
        brands: brandsCount,
        invoices: invoicesCount,
        totalRevenue: totalRevenue._sum.paidAmount || 0,
      },
    });
  } catch (error) {
    next(error);
  }
};

// List all shops (super admin only)
export const listAllShops = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const shops = await prisma.shop.findMany({
      select: {
        id: true,
        name: true,
        slug: true,
        email: true,
        phone: true,
        isActive: true,
        createdAt: true,
        _count: {
          select: {
            users: true,
            customers: true,
            products: true,
            invoices: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({
      success: true,
      data: shops,
    });
  } catch (error) {
    next(error);
  }
};

// Toggle shop active status (super admin only)
export const toggleShopStatus = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const shop = await prisma.shop.findUnique({
      where: { id },
    });

    if (!shop) {
      return res.status(404).json({
        success: false,
        error: 'Shop not found',
      });
    }

    const updatedShop = await prisma.shop.update({
      where: { id },
      data: { isActive: !shop.isActive },
    });

    res.json({
      success: true,
      message: `Shop ${updatedShop.isActive ? 'activated' : 'deactivated'} successfully`,
      data: updatedShop,
    });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// CREATE SHOP FOR EXISTING USER (Protected)
// ==========================================

/**
 * Create a new shop for an already registered user who doesn't have a shop
 * This makes the user an ADMIN of the newly created shop
 */
export const createShopForUser = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Get user ID from authenticated request
    const authReq = req as any;
    const userId = authReq.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'User not authenticated',
      });
    }

    // Check if user exists and doesn't already have a shop
    const existingUser = await prisma.user.findUnique({
      where: { id: userId },
      include: { shop: true },
    });

    if (!existingUser) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
      });
    }

    if (existingUser.shopId) {
      return res.status(400).json({
        success: false,
        error: 'User is already associated with a shop',
      });
    }

    const {
      shopName,
      shopDescription,
      address,
      phone,
      shopEmail,
      website,
      businessRegNo,
      taxId,
      currency = 'LKR',
      taxRate = 0,
    } = req.body;

    // Validate required fields
    if (!shopName) {
      return res.status(400).json({
        success: false,
        error: 'Shop name is required',
      });
    }

    // Generate unique slug for shop
    let slug = generateSlug(shopName);
    let slugExists = await prisma.shop.findUnique({ where: { slug } });
    let counter = 1;
    while (slugExists) {
      slug = `${generateSlug(shopName)}-${counter}`;
      slugExists = await prisma.shop.findUnique({ where: { slug } });
      counter++;
    }

    // Check if shop email already exists (if provided)
    if (shopEmail) {
      const existingShopEmail = await prisma.shop.findFirst({
        where: { email: shopEmail },
      });
      if (existingShopEmail) {
        return res.status(400).json({
          success: false,
          error: 'A shop with this email already exists',
        });
      }
    }

    // Create shop and update user in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create the shop
      const shop = await tx.shop.create({
        data: {
          name: shopName,
          slug,
          description: shopDescription,
          address,
          phone,
          email: shopEmail,
          website,
          businessRegNo,
          taxId,
          currency,
          taxRate,
          isActive: true,
        },
      });

      // Update the user to be ADMIN of this shop
      const updatedUser = await tx.user.update({
        where: { id: userId },
        data: {
          shopId: shop.id,
          role: 'ADMIN', // Make them admin of their own shop
        },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          isActive: true,
          shopId: true,
        },
      });

      return { shop, user: updatedUser };
    });

    res.status(201).json({
      success: true,
      message: 'Shop created successfully! You are now the admin.',
      data: {
        shop: result.shop,
        user: result.user,
      },
    });
  } catch (error) {
    next(error);
  }
};
