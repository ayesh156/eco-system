/**
 * Brand API Service
 * World-Class CRUD operations for brand management
 * Handles all brand-related API calls to the backend
 */

import { fetchWithAuth, handleAuthResponse, getAuthHeaders } from '../lib/fetchWithAuth';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api/v1';

// ===================================
// Type Definitions
// ===================================

export interface APIBrand {
  id: string;
  name: string;
  description?: string;
  image?: string;
  website?: string;
  contactEmail?: string;
  contactPhone?: string;
  shopId: string;
  createdAt: string;
  updatedAt: string;
  _count?: {
    products?: number;
  };
}

export interface CreateBrandDTO {
  name: string;
  description?: string;
  image?: string;
  website?: string;
  contactEmail?: string;
  contactPhone?: string;
}

export interface UpdateBrandDTO extends Partial<CreateBrandDTO> {}

export interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface BrandListParams {
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

const handleResponse = async <T>(response: Response): Promise<T> => {
  return handleAuthResponse<T>(response);
};

// ===================================
// Brand Service API Functions
// ===================================

export const brandService = {
  /**
   * Get all brands with optional filtering and pagination
   */
  async getAll(params: BrandListParams = {}): Promise<{ brands: APIBrand[]; pagination: PaginationInfo }> {
    const queryParams = new URLSearchParams();
    
    if (params.page) queryParams.append('page', params.page.toString());
    if (params.limit) queryParams.append('limit', params.limit.toString());
    if (params.search) queryParams.append('search', params.search);
    if (params.shopId) queryParams.append('shopId', params.shopId);

    const url = `${API_BASE_URL}/brands?${queryParams.toString()}`;
    console.log('📝 Fetching brands from:', url);
    const response = await fetchWithAuth(url, {
      headers: getAuthHeaders(),
    });
    const result = await handleResponse<APIResponse<APIBrand[]>>(response);
    
    console.log('✅ Loaded brands from API:', result.data.length);
    return {
      brands: result.data,
      pagination: result.pagination || { page: 1, limit: 50, total: result.data.length, totalPages: 1 }
    };
  },

  /**
   * Get a single brand by ID
   */
  async getById(id: string, shopId?: string): Promise<APIBrand> {
    const queryParams = new URLSearchParams();
    if (shopId) queryParams.append('shopId', shopId);
    const url = `${API_BASE_URL}/brands/${id}${shopId ? `?${queryParams.toString()}` : ''}`;
    const response = await fetchWithAuth(url, {
      headers: getAuthHeaders(),
    });
    const result = await handleResponse<APIResponse<APIBrand>>(response);
    return result.data;
  },

  /**
   * Create a new brand
   */
  async create(data: CreateBrandDTO, shopId?: string): Promise<APIBrand> {
    console.log('📝 Creating brand:', data.name);
    const queryParams = shopId ? `?shopId=${shopId}` : '';
    const response = await fetchWithAuth(`${API_BASE_URL}/brands${queryParams}`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    const result = await handleResponse<APIResponse<APIBrand>>(response);
    console.log('✅ Brand created:', result.data.id);
    return result.data;
  },

  /**
   * Update an existing brand
   */
  async update(id: string, data: UpdateBrandDTO, shopId?: string): Promise<APIBrand> {
    console.log('📝 Updating brand:', id);
    const queryParams = shopId ? `?shopId=${shopId}` : '';
    const response = await fetchWithAuth(`${API_BASE_URL}/brands/${id}${queryParams}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    const result = await handleResponse<APIResponse<APIBrand>>(response);
    console.log('✅ Brand updated:', result.data.id);
    return result.data;
  },

  /**
   * Delete a brand (Admin only)
   */
  async delete(id: string, shopId?: string): Promise<void> {
    console.log('🗑️ Deleting brand:', id);
    const queryParams = shopId ? `?shopId=${shopId}` : '';
    const response = await fetchWithAuth(`${API_BASE_URL}/brands/${id}${queryParams}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    await handleResponse<APIResponse<null>>(response);
    console.log('✅ Brand deleted');
  },

  /**
   * Get brand suggestions from all shops (for typeahead)
   */
  async getSuggestions(search?: string): Promise<BrandSuggestion[]> {
    const queryParams = new URLSearchParams();
    if (search) queryParams.append('search', search);
    const url = `${API_BASE_URL}/brands/suggestions?${queryParams.toString()}`;
    const response = await fetchWithAuth(url, {
      headers: getAuthHeaders(),
    });
    const result = await handleResponse<APIResponse<BrandSuggestion[]>>(response);
    return result.data;
  },
};

// Brand suggestion interface
export interface BrandSuggestion {
  name: string;
  description?: string;
  image?: string;
  website?: string;
  contactEmail?: string;
  contactPhone?: string;
  existsInYourShop: boolean;
  isFromOtherShop: boolean;
}
export default brandService;
