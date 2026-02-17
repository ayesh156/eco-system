/**
 * Supplier API Service
 * World-Class CRUD operations for supplier management
 * Handles all supplier-related API calls to the backend
 */

import { fetchWithAuth, getAuthHeaders } from '../lib/fetchWithAuth';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api/v1';

// ===================================
// Type Definitions
// ===================================

export interface APISupplier {
  id: string;
  name: string;
  contactPerson?: string;
  email?: string;
  phone: string;
  address?: string;
  isActive: boolean;
  shopId: string;
  createdAt: string;
  updatedAt: string;
  _count?: {
    grns?: number;
  };
  // Calculated fields from backend
  totalPurchases?: number;
  totalOrders?: number;
  lastOrder?: string;
}

export interface CreateSupplierDTO {
  name: string;
  phone: string;
  contactPerson?: string;
  email?: string;
  address?: string;
}

export interface UpdateSupplierDTO extends Partial<CreateSupplierDTO> {
  isActive?: boolean;
}

// Frontend Supplier interface (extended with local fields for UI)
export interface FrontendSupplier {
  id: string;
  name: string;
  company: string; // Maps to name for display
  contactPerson?: string;
  email: string;
  phone: string;
  address?: string;
  totalPurchases: number;
  totalOrders: number;
  lastOrder?: string;
  creditBalance: number;
  creditLimit: number;
  creditDueDate?: string;
  creditStatus: 'clear' | 'active' | 'overdue';
  bankDetails?: string;
  notes?: string;
  rating: number;
  categories: string[];
  isActive: boolean;
  // API reference
  apiId?: string;
}

// ===================================
// Helper Functions
// ===================================

// Convert API response to frontend format
export const convertAPISupplierToFrontend = (apiSupplier: APISupplier): FrontendSupplier => {
  return {
    id: apiSupplier.id,
    apiId: apiSupplier.id,
    name: apiSupplier.contactPerson || apiSupplier.name,
    company: apiSupplier.name,
    contactPerson: apiSupplier.contactPerson,
    email: apiSupplier.email || '',
    phone: apiSupplier.phone,
    address: apiSupplier.address,
    totalPurchases: apiSupplier.totalPurchases || 0, // From backend calculation
    totalOrders: apiSupplier.totalOrders || apiSupplier._count?.grns || 0,
    lastOrder: apiSupplier.lastOrder,
    creditBalance: 0, // Not tracked in API yet
    creditLimit: 0,
    creditStatus: 'clear',
    rating: 5,
    categories: [],
    isActive: apiSupplier.isActive,
  };
};

// Convert frontend format to API format for create/update
export const convertFrontendToAPISupplier = (frontendSupplier: Partial<FrontendSupplier>): CreateSupplierDTO => {
  return {
    name: frontendSupplier.company || frontendSupplier.name || '',
    contactPerson: frontendSupplier.contactPerson || frontendSupplier.name,
    email: frontendSupplier.email,
    phone: frontendSupplier.phone || '',
    address: frontendSupplier.address,
  };
};

// ===================================
// API Functions
// ===================================

/**
 * Get all suppliers for the current shop or specified shop (SUPER_ADMIN)
 */
export const getSuppliers = async (shopId?: string): Promise<{ success: boolean; data?: FrontendSupplier[]; error?: string }> => {
  try {
    const queryParams = new URLSearchParams();
    if (shopId) queryParams.append('shopId', shopId);
    const url = `${API_BASE_URL}/suppliers${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    
    const response = await fetchWithAuth(url, {
      method: 'GET',
      headers: getAuthHeaders(),
      credentials: 'include',
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.message || result.error || 'Failed to fetch suppliers');
    }

    const suppliers = (result.data || []).map(convertAPISupplierToFrontend);
    return { success: true, data: suppliers };
  } catch (error) {
    console.error('Error fetching suppliers:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to fetch suppliers' 
    };
  }
};

/**
 * Get a single supplier by ID
 */
export const getSupplierById = async (id: string, shopId?: string): Promise<{ success: boolean; data?: FrontendSupplier; error?: string }> => {
  try {
    const queryParams = new URLSearchParams();
    if (shopId) queryParams.append('shopId', shopId);
    const url = `${API_BASE_URL}/suppliers/${id}${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    
    const response = await fetchWithAuth(url, {
      method: 'GET',
      headers: getAuthHeaders(),
      credentials: 'include',
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.message || result.error || 'Failed to fetch supplier');
    }

    const supplier = convertAPISupplierToFrontend(result.data);
    return { success: true, data: supplier };
  } catch (error) {
    console.error('Error fetching supplier:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to fetch supplier' 
    };
  }
};

/**
 * Create a new supplier
 */
export const createSupplier = async (supplierData: Partial<FrontendSupplier>, shopId?: string): Promise<{ success: boolean; data?: FrontendSupplier; error?: string }> => {
  try {
    const apiData = convertFrontendToAPISupplier(supplierData);
    const queryParams = new URLSearchParams();
    if (shopId) queryParams.append('shopId', shopId);
    const url = `${API_BASE_URL}/suppliers${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;

    const response = await fetchWithAuth(url, {
      method: 'POST',
      headers: getAuthHeaders(),
      credentials: 'include',
      body: JSON.stringify(apiData),
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.message || result.error || 'Failed to create supplier');
    }

    const supplier = convertAPISupplierToFrontend(result.data);
    return { success: true, data: supplier };
  } catch (error) {
    console.error('Error creating supplier:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to create supplier' 
    };
  }
};

/**
 * Update an existing supplier
 */
export const updateSupplier = async (id: string, supplierData: Partial<FrontendSupplier>, shopId?: string): Promise<{ success: boolean; data?: FrontendSupplier; error?: string }> => {
  try {
    const apiData: UpdateSupplierDTO = {
      ...convertFrontendToAPISupplier(supplierData),
      isActive: supplierData.isActive,
    };
    const queryParams = new URLSearchParams();
    if (shopId) queryParams.append('shopId', shopId);
    const url = `${API_BASE_URL}/suppliers/${id}${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;

    const response = await fetchWithAuth(url, {
      method: 'PUT',
      headers: getAuthHeaders(),
      credentials: 'include',
      body: JSON.stringify(apiData),
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.message || result.error || 'Failed to update supplier');
    }

    const supplier = convertAPISupplierToFrontend(result.data);
    return { success: true, data: supplier };
  } catch (error) {
    console.error('Error updating supplier:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to update supplier' 
    };
  }
};

/**
 * Delete a supplier
 */
export const deleteSupplier = async (id: string, shopId?: string): Promise<{ success: boolean; message?: string; error?: string }> => {
  try {
    const queryParams = new URLSearchParams();
    if (shopId) queryParams.append('shopId', shopId);
    const url = `${API_BASE_URL}/suppliers/${id}${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    
    const response = await fetchWithAuth(url, {
      method: 'DELETE',
      headers: getAuthHeaders(),
      credentials: 'include',
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.message || result.error || 'Failed to delete supplier');
    }

    return { success: true, message: result.message };
  } catch (error) {
    console.error('Error deleting supplier:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to delete supplier' 
    };
  }
};

export default {
  getSuppliers,
  getSupplierById,
  createSupplier,
  updateSupplier,
  deleteSupplier,
};
