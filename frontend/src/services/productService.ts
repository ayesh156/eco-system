/**
 * Product API Service
 * Handles all product-related API calls to the backend
 */

import { getAccessToken } from './authService';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api/v1';

// ===================================
// Type Definitions
// ===================================

export interface APIProduct {
  id: string;
  name: string;
  description?: string;
  serialNumber: string;
  barcode?: string;
  price: number;
  cost: number;
  stock: number;
  minStock: number;
  categoryId: string;
  brandId?: string;
  category?: {
    id: string;
    name: string;
  };
  brand?: {
    id: string;
    name: string;
  };
  shopId: string;
  createdAt: string;
  updatedAt: string;
}

export interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
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

// Helper to get authorization headers
const getAuthHeaders = (): Record<string, string> => {
  const token = getAccessToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
};

const handleResponse = async <T>(response: Response): Promise<T> => {
  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Network error' }));
    throw new Error(error.message || `HTTP error! status: ${response.status}`);
  }
  return response.json();
};

// ===================================
// Product Service API Functions
// ===================================

export const productService = {
  /**
   * Get all products with optional filtering and pagination
   */
  async getAll(params: { page?: number; limit?: number; search?: string; categoryId?: string; shopId?: string } = {}): Promise<{ products: APIProduct[]; pagination: PaginationInfo }> {
    const queryParams = new URLSearchParams();
    
    if (params.page) queryParams.append('page', params.page.toString());
    if (params.limit) queryParams.append('limit', params.limit.toString());
    if (params.search) queryParams.append('search', params.search);
    if (params.categoryId) queryParams.append('categoryId', params.categoryId);
    if (params.shopId) queryParams.append('shopId', params.shopId);

    const url = `${API_BASE_URL}/products?${queryParams.toString()}`;
    console.log('📝 Fetching products from:', url);
    const response = await fetch(url, {
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
   * Get a single product by ID
   */
  async getById(id: string, shopId?: string): Promise<APIProduct> {
    const queryParams = new URLSearchParams();
    if (shopId) queryParams.append('shopId', shopId);
    const url = `${API_BASE_URL}/products/${id}${shopId ? `?${queryParams.toString()}` : ''}`;
    const response = await fetch(url, {
      headers: getAuthHeaders(),
    });
    const result = await handleResponse<APIResponse<APIProduct>>(response);
    return result.data;
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
    serialNumber: apiProduct.serialNumber,
    barcode: apiProduct.barcode,
    price: apiProduct.price,
    costPrice: apiProduct.cost,
    stock: apiProduct.stock,
    lowStockThreshold: apiProduct.minStock,
    category: apiProduct.category?.name || 'Uncategorized',
    brand: apiProduct.brand?.name || 'Unknown',
    totalSold: 0,
    createdAt: apiProduct.createdAt,
    updatedAt: apiProduct.updatedAt,
  };
};

export default productService;
