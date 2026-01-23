/**
 * Customer API Service
 * Handles all customer-related API calls to the backend
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1';

// ===================================
// Type Definitions
// ===================================

export interface APICustomer {
  id: string;
  name: string;
  email?: string;
  phone: string;
  address?: string;
  totalSpent: number;
  totalOrders: number;
  lastPurchase?: string;
  creditBalance: number;
  creditLimit: number;
  creditDueDate?: string;
  creditStatus: 'CLEAR' | 'ACTIVE' | 'OVERDUE';
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

const handleResponse = async <T>(response: Response): Promise<T> => {
  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Network error' }));
    throw new Error(error.message || `HTTP error! status: ${response.status}`);
  }
  return response.json();
};

// ===================================
// Customer Service API Functions
// ===================================

export const customerService = {
  /**
   * Get all customers with optional filtering and pagination
   */
  async getAll(params: { page?: number; limit?: number; search?: string } = {}): Promise<{ customers: APICustomer[]; pagination: PaginationInfo }> {
    const queryParams = new URLSearchParams();
    
    if (params.page) queryParams.append('page', params.page.toString());
    if (params.limit) queryParams.append('limit', params.limit.toString());
    if (params.search) queryParams.append('search', params.search);

    const url = `${API_BASE_URL}/customers?${queryParams.toString()}`;
    console.log('📝 Fetching customers from:', url);
    const response = await fetch(url);
    const result = await handleResponse<APIResponse<APICustomer[]>>(response);
    
    console.log('✅ Loaded customers from API:', result.data.length);
    return {
      customers: result.data,
      pagination: result.pagination || { page: 1, limit: 10, total: result.data.length, totalPages: 1 }
    };
  },

  /**
   * Get a single customer by ID
   */
  async getById(id: string): Promise<APICustomer> {
    const response = await fetch(`${API_BASE_URL}/customers/${id}`);
    const result = await handleResponse<APIResponse<APICustomer>>(response);
    return result.data;
  },
};

// ===================================
// Utility: Convert API Customer to Frontend Format
// ===================================

import type { Customer } from '../data/mockData';

export const convertAPICustomerToFrontend = (apiCustomer: APICustomer): Customer => {
  return {
    id: apiCustomer.id,
    name: apiCustomer.name,
    email: apiCustomer.email || '',
    phone: apiCustomer.phone,
    address: apiCustomer.address,
    totalSpent: apiCustomer.totalSpent,
    totalOrders: apiCustomer.totalOrders,
    lastPurchase: apiCustomer.lastPurchase,
    creditBalance: apiCustomer.creditBalance,
    creditLimit: apiCustomer.creditLimit,
    creditDueDate: apiCustomer.creditDueDate,
    creditStatus: apiCustomer.creditStatus.toLowerCase() as 'clear' | 'active' | 'overdue',
    creditInvoices: [],
  };
};

export default customerService;
