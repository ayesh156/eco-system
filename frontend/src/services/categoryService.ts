/**
 * Category API Service
 * World-Class CRUD operations for category management
 * Handles all category-related API calls to the backend
 */

import { getAccessToken } from './authService';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api/v1';

// ===================================
// Type Definitions
// ===================================

export interface APICategory {
  id: string;
  name: string;
  description?: string;
  image?: string;
  shopId: string;
  createdAt: string;
  updatedAt: string;
  _count?: {
    products?: number;
  };
}

export interface CreateCategoryDTO {
  name: string;
  description?: string;
  image?: string;
}

export interface UpdateCategoryDTO extends Partial<CreateCategoryDTO> {}

export interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface CategoryListParams {
  page?: number;
  limit?: number;
  search?: string;
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
// Category Service API Functions
// ===================================

export const categoryService = {
  /**
   * Get all categories with optional filtering and pagination
   */
  async getAll(params: CategoryListParams = {}): Promise<{ categories: APICategory[]; pagination: PaginationInfo }> {
    const queryParams = new URLSearchParams();
    
    if (params.page) queryParams.append('page', params.page.toString());
    if (params.limit) queryParams.append('limit', params.limit.toString());
    if (params.search) queryParams.append('search', params.search);
    if (params.shopId) queryParams.append('shopId', params.shopId);

    const url = `${API_BASE_URL}/categories?${queryParams.toString()}`;
    console.log('📝 Fetching categories from:', url);
    const response = await fetch(url, {
      headers: getAuthHeaders(),
    });
    const result = await handleResponse<APIResponse<APICategory[]>>(response);
    
    console.log('✅ Loaded categories from API:', result.data.length);
    return {
      categories: result.data,
      pagination: result.pagination || { page: 1, limit: 50, total: result.data.length, totalPages: 1 }
    };
  },

  /**
   * Get a single category by ID
   */
  async getById(id: string, shopId?: string): Promise<APICategory> {
    const queryParams = new URLSearchParams();
    if (shopId) queryParams.append('shopId', shopId);
    const url = `${API_BASE_URL}/categories/${id}${shopId ? `?${queryParams.toString()}` : ''}`;
    const response = await fetch(url, {
      headers: getAuthHeaders(),
    });
    const result = await handleResponse<APIResponse<APICategory>>(response);
    return result.data;
  },

  /**
   * Create a new category
   */
  async create(data: CreateCategoryDTO, shopId?: string): Promise<APICategory> {
    console.log('📝 Creating category:', data.name);
    const queryParams = shopId ? `?shopId=${shopId}` : '';
    const response = await fetch(`${API_BASE_URL}/categories${queryParams}`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    const result = await handleResponse<APIResponse<APICategory>>(response);
    console.log('✅ Category created:', result.data.id);
    return result.data;
  },

  /**
   * Update an existing category
   */
  async update(id: string, data: UpdateCategoryDTO, shopId?: string): Promise<APICategory> {
    console.log('📝 Updating category:', id);
    const queryParams = shopId ? `?shopId=${shopId}` : '';
    const response = await fetch(`${API_BASE_URL}/categories/${id}${queryParams}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    const result = await handleResponse<APIResponse<APICategory>>(response);
    console.log('✅ Category updated:', result.data.id);
    return result.data;
  },

  /**
   * Delete a category (Admin only)
   */
  async delete(id: string, shopId?: string): Promise<void> {
    console.log('🗑️ Deleting category:', id);
    const queryParams = shopId ? `?shopId=${shopId}` : '';
    const response = await fetch(`${API_BASE_URL}/categories/${id}${queryParams}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    await handleResponse<APIResponse<null>>(response);
    console.log('✅ Category deleted');
  },

  /**
   * Get category suggestions from all shops (for typeahead)
   */
  async getSuggestions(search?: string): Promise<CategorySuggestion[]> {
    const queryParams = new URLSearchParams();
    if (search) queryParams.append('search', search);
    const url = `${API_BASE_URL}/categories/suggestions?${queryParams.toString()}`;
    const response = await fetch(url, {
      headers: getAuthHeaders(),
    });
    const result = await handleResponse<APIResponse<CategorySuggestion[]>>(response);
    return result.data;
  },
};

// Category suggestion interface
export interface CategorySuggestion {
  name: string;
  description?: string;
  image?: string;
  existsInYourShop: boolean;
  isFromOtherShop: boolean;
}
export default categoryService;
