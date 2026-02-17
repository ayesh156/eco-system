/**
 * Customer API Service
 * World-Class CRUD operations for customer management
 * Handles all customer-related API calls to the backend
 */

import { fetchWithAuth, handleAuthResponse, getAuthHeaders } from '../lib/fetchWithAuth';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api/v1';

// ===================================
// Type Definitions
// ===================================

export interface APICustomer {
  id: string;
  name: string;
  email?: string;
  phone: string;
  address?: string;
  nic?: string;
  notes?: string;
  customerType: 'REGULAR' | 'WHOLESALE' | 'DEALER' | 'CORPORATE' | 'VIP';
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
  _count?: {
    invoices?: number;
    payments?: number;
  };
}

export interface CreateCustomerDTO {
  name: string;
  phone: string;
  email?: string;
  address?: string;
  nic?: string;
  notes?: string;
  customerType?: 'REGULAR' | 'WHOLESALE' | 'DEALER' | 'CORPORATE' | 'VIP';
  creditLimit?: number;
  creditBalance?: number;
  creditStatus?: 'CLEAR' | 'ACTIVE' | 'OVERDUE';
  creditDueDate?: string;
}

export interface UpdateCustomerDTO extends Partial<CreateCustomerDTO> {
  totalSpent?: number;
  totalOrders?: number;
  lastPurchase?: string;
}

export interface CustomerStats {
  totalCustomers: number;
  byStatus: {
    clear: number;
    active: number;
    overdue: number;
  };
  totals: {
    creditBalance: number;
    totalSpent: number;
  };
}

export interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface CustomerListParams {
  page?: number;
  limit?: number;
  search?: string;
  creditStatus?: string;
  customerType?: string;
  sortBy?: 'name' | 'creditBalance' | 'totalSpent' | 'lastPurchase' | 'createdAt';
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
// Customer Service API Functions
// ===================================

export const customerService = {
  /**
   * Get all customers with optional filtering and pagination
   */
  async getAll(params: CustomerListParams = {}): Promise<{ customers: APICustomer[]; pagination: PaginationInfo }> {
    const queryParams = new URLSearchParams();
    
    if (params.page) queryParams.append('page', params.page.toString());
    if (params.limit) queryParams.append('limit', params.limit.toString());
    if (params.search) queryParams.append('search', params.search);
    if (params.creditStatus) queryParams.append('creditStatus', params.creditStatus);
    if (params.customerType) queryParams.append('customerType', params.customerType);
    if (params.sortBy) queryParams.append('sortBy', params.sortBy);
    if (params.sortOrder) queryParams.append('sortOrder', params.sortOrder);
    if (params.shopId) queryParams.append('shopId', params.shopId);

    const url = `${API_BASE_URL}/customers?${queryParams.toString()}`;
    console.log('📝 Fetching customers from:', url);
    const response = await fetchWithAuth(url, {
      headers: getAuthHeaders(),
    });
    const result = await handleResponse<APIResponse<APICustomer[]>>(response);
    
    console.log('✅ Loaded customers from API:', result.data.length);
    return {
      customers: result.data,
      pagination: result.pagination || { page: 1, limit: 10, total: result.data.length, totalPages: 1 }
    };
  },

  /**
   * Get customer statistics
   */
  async getStats(shopId?: string): Promise<CustomerStats> {
    const queryParams = new URLSearchParams();
    if (shopId) queryParams.append('shopId', shopId);
    
    const url = `${API_BASE_URL}/customers/stats${shopId ? `?${queryParams.toString()}` : ''}`;
    const response = await fetchWithAuth(url, {
      headers: getAuthHeaders(),
    });
    const result = await handleResponse<APIResponse<CustomerStats>>(response);
    return result.data;
  },

  /**
   * Get a single customer by ID
   */
  async getById(id: string, shopId?: string): Promise<APICustomer> {
    const queryParams = new URLSearchParams();
    if (shopId) queryParams.append('shopId', shopId);
    const url = `${API_BASE_URL}/customers/${id}${shopId ? `?${queryParams.toString()}` : ''}`;
    const response = await fetchWithAuth(url, {
      headers: getAuthHeaders(),
    });
    const result = await handleResponse<APIResponse<APICustomer>>(response);
    return result.data;
  },

  /**
   * Create a new customer
   */
  async create(data: CreateCustomerDTO, shopId?: string): Promise<APICustomer> {
    console.log('📝 Creating customer:', data.name);
    const queryParams = shopId ? `?shopId=${shopId}` : '';
    const response = await fetchWithAuth(`${API_BASE_URL}/customers${queryParams}`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    const result = await handleResponse<APIResponse<APICustomer>>(response);
    console.log('✅ Customer created:', result.data.id);
    return result.data;
  },

  /**
   * Update an existing customer
   */
  async update(id: string, data: UpdateCustomerDTO, shopId?: string): Promise<APICustomer> {
    console.log('📝 Updating customer:', id);
    const queryParams = shopId ? `?shopId=${shopId}` : '';
    const response = await fetchWithAuth(`${API_BASE_URL}/customers/${id}${queryParams}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    const result = await handleResponse<APIResponse<APICustomer>>(response);
    console.log('✅ Customer updated:', result.data.id);
    return result.data;
  },

  /**
   * Update customer credit balance
   */
  async updateCredit(id: string, amount: number, operation: 'add' | 'subtract' | 'set', options?: {
    invoiceId?: string;
    notes?: string;
    paymentMethod?: 'CASH' | 'CARD' | 'BANK_TRANSFER' | 'CHEQUE';
  }): Promise<APICustomer> {
    console.log('📝 Updating customer credit:', id, operation, amount);
    const response = await fetchWithAuth(`${API_BASE_URL}/customers/${id}/credit`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify({
        amount,
        operation,
        ...options,
      }),
    });
    const result = await handleResponse<APIResponse<APICustomer>>(response);
    console.log('✅ Customer credit updated:', result.data.creditBalance);
    return result.data;
  },

  /**
   * Get customer payment history
   */
  async getPayments(id: string): Promise<any[]> {
    const response = await fetchWithAuth(`${API_BASE_URL}/customers/${id}/payments`, {
      headers: getAuthHeaders(),
    });
    const result = await handleResponse<APIResponse<any[]>>(response);
    return result.data;
  },

  /**
   * Delete a customer (Admin only)
   */
  async delete(id: string, shopId?: string): Promise<void> {
    console.log('🗑️ Deleting customer:', id);
    const queryParams = shopId ? `?shopId=${shopId}` : '';
    const response = await fetchWithAuth(`${API_BASE_URL}/customers/${id}${queryParams}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    await handleResponse<APIResponse<null>>(response);
    console.log('✅ Customer deleted');
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
    nic: apiCustomer.nic,
    notes: apiCustomer.notes,
    customerType: apiCustomer.customerType,
    totalSpent: apiCustomer.totalSpent,
    totalOrders: apiCustomer.totalOrders,
    lastPurchase: apiCustomer.lastPurchase,
    creditBalance: apiCustomer.creditBalance,
    creditLimit: apiCustomer.creditLimit,
    creditDueDate: apiCustomer.creditDueDate,
    creditStatus: apiCustomer.creditStatus.toLowerCase() as 'clear' | 'active' | 'overdue',
    creditInvoices: [],
    createdAt: apiCustomer.createdAt,
    updatedAt: apiCustomer.updatedAt,
  };
};

export const convertFrontendToAPICustomer = (customer: Partial<Customer>): CreateCustomerDTO | UpdateCustomerDTO => {
  const data: CreateCustomerDTO = {
    name: customer.name || '',
    phone: customer.phone || '',
    email: customer.email || undefined,
    address: customer.address || undefined,
    creditLimit: customer.creditLimit,
    creditBalance: customer.creditBalance,
    creditStatus: customer.creditStatus?.toUpperCase() as 'CLEAR' | 'ACTIVE' | 'OVERDUE',
    creditDueDate: customer.creditDueDate,
  };
  
  // Remove undefined values
  Object.keys(data).forEach(key => {
    if (data[key as keyof CreateCustomerDTO] === undefined) {
      delete data[key as keyof CreateCustomerDTO];
    }
  });
  
  return data;
};

export default customerService;
