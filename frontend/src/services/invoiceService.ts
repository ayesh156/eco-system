/**
 * Invoice API Service
 * Handles all invoice-related API calls to the backend
 */

import { getAccessToken } from './authService';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api/v1';

// ===================================
// Type Definitions (matching backend)
// ===================================

export type InvoiceStatus = 'UNPAID' | 'HALFPAY' | 'FULLPAID' | 'CANCELLED' | 'REFUNDED';
export type PaymentMethod = 'CASH' | 'CARD' | 'BANK_TRANSFER' | 'CHEQUE' | 'CREDIT';
export type SalesChannel = 'ON_SITE' | 'ONLINE';

export interface APIInvoiceItem {
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
  product?: {
    id: string;
    name: string;
    price: number;
  };
}

export interface APIInvoicePayment {
  id: string;
  invoiceId: string;
  amount: number;
  paymentMethod: PaymentMethod;
  paymentDate: string;
  notes?: string;
  reference?: string;
}

export interface APIInvoice {
  id: string;
  invoiceNumber: string;
  customerId: string;
  customerName: string;
  subtotal: number;
  tax: number;
  discount: number;
  total: number;
  paidAmount: number;
  dueAmount: number;
  status: InvoiceStatus;
  date: string;
  dueDate: string;
  paymentMethod?: PaymentMethod;
  salesChannel: SalesChannel;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  reminderCount?: number;
  customer?: {
    id: string;
    name: string;
    email?: string;
    phone: string;
  };
  items: APIInvoiceItem[];
  payments: APIInvoicePayment[];
}

export interface APIInvoiceStats {
  totalInvoices: number;
  statusStats: Record<string, {
    count: number;
    total: number;
    paid: number;
    due: number;
  }>;
  revenue: {
    total: number;
    paid: number;
    due: number;
    tax: number;
    discount: number;
    average: number;
  };
  recentInvoices: APIInvoice[];
}

export interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface GetInvoicesParams {
  page?: number;
  limit?: number;
  status?: string;
  customerId?: string;
  startDate?: string;
  endDate?: string;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  shopId?: string; // For SUPER_ADMIN viewing a specific shop
}

export interface CreateInvoiceData {
  customerId?: string; // Optional for walk-in customers
  items: {
    productId?: string; // Optional for quick-add items
    productName: string;
    quantity: number;
    unitPrice: number;
    originalPrice?: number;
    discount?: number;
    total?: number;
    warrantyDueDate?: string;
  }[];
  subtotal?: number;
  tax?: number;
  discount?: number;
  total?: number;
  dueDate: string;
  paymentMethod?: PaymentMethod;
  salesChannel?: SalesChannel;
  paidAmount?: number;
  notes?: string;
}

export interface UpdateInvoiceData extends Partial<CreateInvoiceData> {
  status?: InvoiceStatus;
}

export interface AddPaymentData {
  amount: number;
  paymentMethod: PaymentMethod;
  notes?: string;
  reference?: string;
  paymentDate?: string;
}

// ===================================
// API Response Types
// ===================================

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

// Convert backend status to frontend status (lowercase)
export const normalizeStatus = (status: InvoiceStatus): 'unpaid' | 'fullpaid' | 'halfpay' => {
  switch (status) {
    case 'FULLPAID': return 'fullpaid';
    case 'HALFPAY': return 'halfpay';
    case 'UNPAID':
    case 'CANCELLED':
    case 'REFUNDED':
    default: return 'unpaid';
  }
};

// Convert frontend status to backend status (uppercase)
export const denormalizeStatus = (status: string): InvoiceStatus => {
  switch (status.toLowerCase()) {
    case 'fullpaid': return 'FULLPAID';
    case 'halfpay': return 'HALFPAY';
    case 'unpaid':
    default: return 'UNPAID';
  }
};

// Convert payment method from backend to frontend format
export const normalizePaymentMethod = (method?: PaymentMethod): 'cash' | 'card' | 'bank_transfer' | 'credit' | undefined => {
  if (!method) return undefined;
  switch (method) {
    case 'CASH': return 'cash';
    case 'CARD': return 'card';
    case 'BANK_TRANSFER': return 'bank_transfer';
    case 'CREDIT': return 'credit';
    case 'CHEQUE': return 'bank_transfer'; // Map cheque to bank_transfer
    default: return 'cash';
  }
};

// Convert payment method from frontend to backend format
export const denormalizePaymentMethod = (method?: string): PaymentMethod => {
  if (!method) return 'CASH';
  switch (method.toLowerCase()) {
    case 'cash': return 'CASH';
    case 'card': return 'CARD';
    case 'bank_transfer':
    case 'bank': return 'BANK_TRANSFER';
    case 'credit': return 'CREDIT';
    case 'cheque': return 'CHEQUE';
    default: return 'CASH';
  }
};

// Convert sales channel
export const normalizeSalesChannel = (channel?: SalesChannel): 'on-site' | 'online' => {
  return channel === 'ONLINE' ? 'online' : 'on-site';
};

export const denormalizeSalesChannel = (channel?: string): SalesChannel => {
  return channel === 'online' ? 'ONLINE' : 'ON_SITE';
};

// ===================================
// Invoice Service API Functions
// ===================================

export const invoiceService = {
  /**
   * Get all invoices with optional filtering and pagination
   */
  async getAll(params: GetInvoicesParams = {}): Promise<{ invoices: APIInvoice[]; pagination: PaginationInfo }> {
    const queryParams = new URLSearchParams();
    
    if (params.page) queryParams.append('page', params.page.toString());
    if (params.limit) queryParams.append('limit', params.limit.toString());
    if (params.status && params.status !== 'all') queryParams.append('status', params.status.toUpperCase());
    if (params.customerId && params.customerId !== 'all') queryParams.append('customerId', params.customerId);
    if (params.startDate) queryParams.append('startDate', params.startDate);
    if (params.endDate) queryParams.append('endDate', params.endDate);
    if (params.search) queryParams.append('search', params.search);
    if (params.sortBy) queryParams.append('sortBy', params.sortBy);
    if (params.sortOrder) queryParams.append('sortOrder', params.sortOrder);
    if (params.shopId) queryParams.append('shopId', params.shopId);

    const url = `${API_BASE_URL}/invoices?${queryParams.toString()}`;
    const response = await fetch(url, {
      headers: getAuthHeaders(),
    });
    const result = await handleResponse<APIResponse<APIInvoice[]>>(response);
    
    return {
      invoices: result.data,
      pagination: result.pagination || { page: 1, limit: 10, total: result.data.length, totalPages: 1 }
    };
  },

  /**
   * Get a single invoice by ID
   */
  async getById(id: string): Promise<APIInvoice> {
    const response = await fetch(`${API_BASE_URL}/invoices/${id}`, {
      headers: getAuthHeaders(),
    });
    const result = await handleResponse<APIResponse<APIInvoice>>(response);
    return result.data;
  },

  /**
   * Create a new invoice
   */
  async create(data: CreateInvoiceData, shopId?: string): Promise<APIInvoice> {
    console.log('📝 Creating invoice with data:', data);
    const queryParams = shopId ? `?shopId=${shopId}` : '';
    const response = await fetch(`${API_BASE_URL}/invoices${queryParams}`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    const result = await handleResponse<APIResponse<APIInvoice>>(response);
    console.log('✅ Invoice created - DB ID:', result.data.id, 'Invoice Number:', result.data.invoiceNumber);
    return result.data;
  },

  /**
   * Update an existing invoice
   */
  async update(id: string, data: UpdateInvoiceData, shopId?: string): Promise<APIInvoice> {
    console.log('📝 Updating invoice with ID:', id, 'Data:', data);
    const queryParams = shopId ? `?shopId=${shopId}` : '';
    const response = await fetch(`${API_BASE_URL}/invoices/${id}${queryParams}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    const result = await handleResponse<APIResponse<APIInvoice>>(response);
    return result.data;
  },

  /**
   * Delete an invoice
   */
  async delete(id: string, shopId?: string): Promise<void> {
    const queryParams = shopId ? `?shopId=${shopId}` : '';
    const response = await fetch(`${API_BASE_URL}/invoices/${id}${queryParams}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    await handleResponse<APIResponse<null>>(response);
  },

  /**
   * Add a payment to an invoice
   */
  async addPayment(invoiceId: string, data: AddPaymentData, shopId?: string): Promise<{ payment: APIInvoicePayment; invoice: APIInvoice }> {
    const queryParams = shopId ? `?shopId=${shopId}` : '';
    const response = await fetch(`${API_BASE_URL}/invoices/${invoiceId}/payments${queryParams}`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    const result = await handleResponse<APIResponse<{ payment: APIInvoicePayment; invoice: APIInvoice }>>(response);
    return result.data;
  },

  /**
   * Get invoice statistics
   */
  async getStats(): Promise<APIInvoiceStats> {
    const response = await fetch(`${API_BASE_URL}/invoices/stats`, {
      headers: getAuthHeaders(),
    });
    const result = await handleResponse<APIResponse<APIInvoiceStats>>(response);
    return result.data;
  },
};

// ===================================
// Utility: Convert API Invoice to Frontend Format
// ===================================

import type { Invoice, InvoiceItem, InvoicePayment } from '../data/mockData';

export const convertAPIInvoiceToFrontend = (apiInvoice: APIInvoice): Invoice => {
  console.log('🔄 Converting invoice - DB ID:', apiInvoice.id, 'Invoice Number:', apiInvoice.invoiceNumber);
  return {
    id: apiInvoice.invoiceNumber || apiInvoice.id,
    apiId: apiInvoice.id, // Store actual database UUID for API operations
    customerId: apiInvoice.customerId,
    customerName: apiInvoice.customerName,
    items: apiInvoice.items.map((item): InvoiceItem => ({
      productId: item.productId,
      productName: item.productName,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      originalPrice: item.originalPrice,
      total: item.total,
      warrantyDueDate: item.warrantyDueDate,
    })),
    subtotal: apiInvoice.subtotal,
    tax: apiInvoice.tax,
    total: apiInvoice.total,
    status: normalizeStatus(apiInvoice.status),
    paidAmount: apiInvoice.paidAmount,
    date: apiInvoice.date,
    dueDate: apiInvoice.dueDate,
    paymentMethod: normalizePaymentMethod(apiInvoice.paymentMethod),
    salesChannel: normalizeSalesChannel(apiInvoice.salesChannel),
    payments: apiInvoice.payments?.map((payment): InvoicePayment => {
      // Normalize payment method from API format to frontend format
      let method: 'cash' | 'card' | 'bank' | 'cheque' = 'cash';
      const pm = payment.paymentMethod?.toLowerCase() || 'cash';
      if (pm === 'cash') method = 'cash';
      else if (pm === 'card') method = 'card';
      else if (pm === 'bank_transfer' || pm === 'bank' || pm === 'banktransfer') method = 'bank';
      else if (pm === 'cheque' || pm === 'check') method = 'cheque';
      
      return {
        id: payment.id,
        invoiceId: payment.invoiceId,
        amount: payment.amount,
        paymentDate: payment.paymentDate,
        paymentMethod: method,
        notes: payment.notes,
      };
    }),
    lastPaymentDate: apiInvoice.payments?.length 
      ? apiInvoice.payments[0].paymentDate 
      : undefined,
    reminderCount: apiInvoice.reminderCount || 0,
    customer: apiInvoice.customer,
  };
};

export const convertFrontendInvoiceToAPI = (invoice: Partial<Invoice> & { items?: InvoiceItem[] }): CreateInvoiceData => {
  return {
    customerId: invoice.customerId!,
    items: (invoice.items || []).map(item => ({
      productId: item.productId,
      productName: item.productName,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      originalPrice: item.originalPrice,
      discount: item.originalPrice ? item.originalPrice - item.unitPrice : 0,
      warrantyDueDate: item.warrantyDueDate,
    })),
    tax: invoice.tax,
    discount: 0, // Invoice-level discount
    dueDate: invoice.dueDate!,
    paymentMethod: denormalizePaymentMethod(invoice.paymentMethod),
    salesChannel: denormalizeSalesChannel(invoice.salesChannel),
    paidAmount: invoice.paidAmount,
    notes: undefined,
  };
};

export default invoiceService;
