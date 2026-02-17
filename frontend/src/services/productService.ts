/**
 * Product API Service
 * World-Class CRUD operations for product management
 * Handles all product-related API calls to the backend
 */

import { fetchWithAuth, handleAuthResponse, getAuthHeaders } from '../lib/fetchWithAuth';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api/v1';

// ===================================
// Type Definitions
// ===================================

export interface APIProduct {
  id: string;
  name: string;
  description?: string;
  price: number;
  costPrice?: number;
  lastCostPrice?: number;
  profitMargin?: number;
  stock: number;
  reservedStock: number;
  lowStockThreshold: number;
  serialNumber?: string;
  barcode?: string;
  warranty?: string;
  warrantyMonths?: number;
  image?: string;
  lastGRNId?: string;
  lastGRNDate?: string;
  totalPurchased: number;
  totalSold: number;
  categoryId?: string;
  brandId?: string;
  category?: {
    id: string;
    name: string;
  };
  brand?: {
    id: string;
    name: string;
  };
  stockMovements?: StockMovement[];
  priceHistory?: PriceHistoryRecord[];
  shopId: string;
  createdAt: string;
  updatedAt: string;
  _count?: {
    invoiceItems?: number;
    stockMovements?: number;
  };
}

export interface StockMovement {
  id: string;
  productId: string;
  type: 'GRN_IN' | 'INVOICE_OUT' | 'ADJUSTMENT' | 'RETURN' | 'DAMAGED' | 'TRANSFER';
  quantity: number;
  previousStock: number;
  newStock: number;
  referenceId?: string;
  referenceNumber?: string;
  referenceType?: string;
  unitPrice?: number;
  notes?: string;
  createdBy?: string;
  createdAt: string;
}

export interface PriceHistoryRecord {
  id: string;
  productId: string;
  changeType: 'COST_UPDATE' | 'SELLING_UPDATE' | 'BOTH';
  previousCostPrice?: number;
  newCostPrice?: number;
  previousSellingPrice?: number;
  newSellingPrice?: number;
  reason?: string;
  referenceId?: string;
  createdBy?: string;
  createdAt: string;
}

export interface SalesHistoryItem {
  id: string;
  invoiceId: string;
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  originalPrice?: number;
  discount: number;
  total: number;
  warrantyDueDate?: string;
  createdAt: string;
  invoice: {
    id: string;
    invoiceNumber: string;
    customerName: string;
    date: string;
    status: string;
    total: number;
    paidAmount: number;
  };
}

export interface SalesStats {
  totalUnitsSold: number;
  totalRevenue: number;
  averageSellingPrice: number;
  totalTransactions: number;
}

export interface SalesHistoryResponse {
  items: SalesHistoryItem[];
  stats: SalesStats;
  pagination: PaginationInfo;
}

export interface CreateProductDTO {
  name: string;
  price: number;
  description?: string;
  costPrice?: number;
  stock?: number;
  lowStockThreshold?: number;
  serialNumber?: string;
  barcode?: string;
  warranty?: string;
  warrantyMonths?: number;
  image?: string;
  categoryId?: string;
  brandId?: string;
}

export interface UpdateProductDTO extends Partial<CreateProductDTO> {
  profitMargin?: number;
}

export interface ProductStats {
  totalProducts: number;
  lowStockCount: number;
  outOfStockCount: number;
  inStockCount: number;
  totalStock: number;
  totalStockValue: number;
  totalCostValue: number;
  potentialProfit: number;
}

// Product suggestion from database (for avoiding duplicates)
export interface ProductSuggestion {
  name: string;
  description?: string;
  price: number;
  costPrice?: number;
  image?: string;
  warranty?: string;
  categoryId?: string;
  categoryName?: string;
  brandId?: string;
  brandName?: string;
  existsInYourShop: boolean;
  isFromOtherShop: boolean;
  // Full brand/category details for auto-creation
  brand?: {
    name: string;
    description?: string;
    image?: string;
    website?: string;
    contactEmail?: string;
    contactPhone?: string;
  };
  category?: {
    name: string;
    description?: string;
    image?: string;
  };
}

export interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface ProductListParams {
  page?: number;
  limit?: number;
  search?: string;
  categoryId?: string;
  brandId?: string;
  lowStock?: boolean;
  minPrice?: number;
  maxPrice?: number;
  sortBy?: 'name' | 'price' | 'stock' | 'createdAt' | 'updatedAt';
  sortOrder?: 'asc' | 'desc';
  shopId?: string;
}

interface APIResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  pagination?: PaginationInfo;
}

// ===================================
// Helper Functions
// ===================================

const handleResponse = async <T>(response: Response): Promise<T> => {
  return handleAuthResponse<T>(response);
};

// ===================================
// Product Service API Functions
// ===================================

export const productService = {
  /**
   * Get all products with optional filtering and pagination
   */
  async getAll(params: ProductListParams = {}): Promise<{ products: APIProduct[]; pagination: PaginationInfo }> {
    const queryParams = new URLSearchParams();
    
    if (params.page) queryParams.append('page', params.page.toString());
    if (params.limit) queryParams.append('limit', params.limit.toString());
    if (params.search) queryParams.append('search', params.search);
    if (params.categoryId) queryParams.append('categoryId', params.categoryId);
    if (params.brandId) queryParams.append('brandId', params.brandId);
    if (params.lowStock) queryParams.append('lowStock', 'true');
    if (params.minPrice) queryParams.append('minPrice', params.minPrice.toString());
    if (params.maxPrice) queryParams.append('maxPrice', params.maxPrice.toString());
    if (params.sortBy) queryParams.append('sortBy', params.sortBy);
    if (params.sortOrder) queryParams.append('sortOrder', params.sortOrder);
    if (params.shopId) queryParams.append('shopId', params.shopId);

    const url = `${API_BASE_URL}/products?${queryParams.toString()}`;
    console.log('📝 Fetching products from:', url);
    const response = await fetchWithAuth(url, {
      headers: getAuthHeaders(),
    });
    const result = await handleResponse<APIResponse<APIProduct[]>>(response);
    
    console.log('✅ Loaded products from API:', result.data.length);
    return {
      products: result.data,
      pagination: result.pagination || { page: 1, limit: 10, total: result.data.length, totalPages: 1 }
    };
  },

  /**
   * Get product statistics
   */
  async getStats(shopId?: string): Promise<ProductStats> {
    const queryParams = new URLSearchParams();
    if (shopId) queryParams.append('shopId', shopId);
    
    const url = `${API_BASE_URL}/products/stats${shopId ? `?${queryParams.toString()}` : ''}`;
    const response = await fetchWithAuth(url, {
      headers: getAuthHeaders(),
    });
    const result = await handleResponse<APIResponse<ProductStats>>(response);
    return result.data;
  },

  /**
   * Get low stock products
   */
  async getLowStock(shopId?: string): Promise<APIProduct[]> {
    const queryParams = new URLSearchParams();
    if (shopId) queryParams.append('shopId', shopId);
    
    const url = `${API_BASE_URL}/products/low-stock${shopId ? `?${queryParams.toString()}` : ''}`;
    const response = await fetchWithAuth(url, {
      headers: getAuthHeaders(),
    });
    const result = await handleResponse<APIResponse<APIProduct[]>>(response);
    return result.data;
  },

  /**
   * Get product suggestions from database (for avoiding duplicates)
   * Returns products from ALL shops that match the search query
   */
  async getSuggestions(search: string): Promise<ProductSuggestion[]> {
    if (!search || search.length < 2) return [];
    
    const queryParams = new URLSearchParams();
    queryParams.append('search', search);
    
    const url = `${API_BASE_URL}/products/suggestions?${queryParams.toString()}`;
    const response = await fetchWithAuth(url, {
      headers: getAuthHeaders(),
    });
    const result = await handleResponse<APIResponse<ProductSuggestion[]>>(response);
    return result.data;
  },

  /**
   * Get a single product by ID
   */
  async getById(id: string, shopId?: string): Promise<APIProduct> {
    const queryParams = new URLSearchParams();
    if (shopId) queryParams.append('shopId', shopId);
    const url = `${API_BASE_URL}/products/${id}${shopId ? `?${queryParams.toString()}` : ''}`;
    const response = await fetchWithAuth(url, {
      headers: getAuthHeaders(),
    });
    const result = await handleResponse<APIResponse<APIProduct>>(response);
    return result.data;
  },

  /**
   * Create a new product
   */
  async create(data: CreateProductDTO, shopId?: string): Promise<APIProduct> {
    console.log('📝 Creating product:', data.name);
    const queryParams = shopId ? `?shopId=${shopId}` : '';
    const response = await fetchWithAuth(`${API_BASE_URL}/products${queryParams}`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    const result = await handleResponse<APIResponse<APIProduct>>(response);
    console.log('✅ Product created:', result.data.id);
    return result.data;
  },

  /**
   * Update an existing product
   */
  async update(id: string, data: UpdateProductDTO, shopId?: string): Promise<APIProduct> {
    console.log('📝 Updating product:', id);
    const queryParams = shopId ? `?shopId=${shopId}` : '';
    const response = await fetchWithAuth(`${API_BASE_URL}/products/${id}${queryParams}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    const result = await handleResponse<APIResponse<APIProduct>>(response);
    console.log('✅ Product updated:', result.data.id);
    return result.data;
  },

  /**
   * Adjust product stock
   */
  async adjustStock(id: string, quantity: number, operation: 'add' | 'subtract' | 'set', options?: {
    type?: 'GRN_IN' | 'INVOICE_OUT' | 'ADJUSTMENT' | 'RETURN' | 'DAMAGED' | 'TRANSFER';
    notes?: string;
    referenceId?: string;
    referenceNumber?: string;
  }): Promise<APIProduct> {
    console.log('📝 Adjusting product stock:', id, operation, quantity);
    const response = await fetchWithAuth(`${API_BASE_URL}/products/${id}/stock`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify({
        quantity,
        operation,
        ...options,
      }),
    });
    const result = await handleResponse<APIResponse<APIProduct>>(response);
    console.log('✅ Product stock adjusted:', result.data.stock);
    return result.data;
  },

  /**
   * Get product stock movements
   */
  async getStockMovements(id: string): Promise<StockMovement[]> {
    const response = await fetchWithAuth(`${API_BASE_URL}/products/${id}/stock-movements`, {
      headers: getAuthHeaders(),
    });
    const result = await handleResponse<APIResponse<StockMovement[]>>(response);
    return result.data;
  },

  /**
   * Get product price history
   */
  async getPriceHistory(id: string): Promise<PriceHistoryRecord[]> {
    const response = await fetchWithAuth(`${API_BASE_URL}/products/${id}/price-history`, {
      headers: getAuthHeaders(),
    });
    const result = await handleResponse<APIResponse<PriceHistoryRecord[]>>(response);
    return result.data;
  },

  /**
   * Get product sales history (invoices containing this product)
   */
  async getSalesHistory(id: string, page: number = 1, limit: number = 20): Promise<SalesHistoryResponse> {
    const queryParams = new URLSearchParams();
    queryParams.append('page', page.toString());
    queryParams.append('limit', limit.toString());
    
    const response = await fetchWithAuth(`${API_BASE_URL}/products/${id}/sales-history?${queryParams.toString()}`, {
      headers: getAuthHeaders(),
    });
    const result = await handleResponse<{
      success: boolean;
      data: SalesHistoryItem[];
      stats: SalesStats;
      pagination: PaginationInfo;
    }>(response);
    
    return {
      items: result.data,
      stats: result.stats,
      pagination: result.pagination
    };
  },

  /**
   * Delete a product (Admin only)
   */
  async delete(id: string, shopId?: string): Promise<void> {
    console.log('🗑️ Deleting product:', id);
    const queryParams = shopId ? `?shopId=${shopId}` : '';
    const response = await fetchWithAuth(`${API_BASE_URL}/products/${id}${queryParams}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    await handleResponse<APIResponse<null>>(response);
    console.log('✅ Product deleted');
  },
};

// ===================================
// Utility: Convert API Product to Frontend Format
// ===================================

import type { Product } from '../data/mockData';

export const convertAPIProductToFrontend = (apiProduct: APIProduct): Product => {
  return {
    id: apiProduct.id,
    name: apiProduct.name,
    description: apiProduct.description || '',
    serialNumber: apiProduct.serialNumber || '',
    barcode: apiProduct.barcode,
    price: apiProduct.price,
    sellingPrice: apiProduct.price,
    costPrice: apiProduct.costPrice,
    lastCostPrice: apiProduct.lastCostPrice,
    profitMargin: apiProduct.profitMargin,
    stock: apiProduct.stock,
    reservedStock: apiProduct.reservedStock,
    availableStock: apiProduct.stock - apiProduct.reservedStock,
    lowStockThreshold: apiProduct.lowStockThreshold,
    warranty: apiProduct.warranty,
    image: apiProduct.image,
    category: apiProduct.category?.name || 'Uncategorized',
    brand: apiProduct.brand?.name || 'Unknown',
    lastGRNId: apiProduct.lastGRNId,
    lastGRNDate: apiProduct.lastGRNDate,
    totalPurchased: apiProduct.totalPurchased,
    totalSold: apiProduct.totalSold,
    createdAt: apiProduct.createdAt,
    updatedAt: apiProduct.updatedAt,
  };
};

export const convertFrontendToAPIProduct = (product: Partial<Product>, categoryId?: string, brandId?: string): CreateProductDTO | UpdateProductDTO => {
  const data: CreateProductDTO = {
    name: product.name || '',
    price: product.price || product.sellingPrice || 0,
    description: product.description || undefined,
    costPrice: product.costPrice,
    stock: product.stock,
    lowStockThreshold: product.lowStockThreshold,
    serialNumber: product.serialNumber || undefined,
    barcode: product.barcode || undefined,
    warranty: product.warranty || undefined,
    image: product.image || undefined,
    categoryId,
    brandId,
  };
  
  // Remove undefined values
  Object.keys(data).forEach(key => {
    if (data[key as keyof CreateProductDTO] === undefined) {
      delete data[key as keyof CreateProductDTO];
    }
  });
  
  return data;
};

export default productService;
