// Reminder Service - API calls for invoice reminders

import { getAccessToken } from './authService';

// Remove /api/v1 suffix if present since we add it in the endpoints
const rawApiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';
const API_BASE_URL = rawApiUrl.replace(/\/api\/v1\/?$/, '');

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

export interface InvoiceReminder {
  id: string;
  invoiceId: string;
  shopId: string;
  type: 'PAYMENT' | 'OVERDUE';
  channel: string;
  sentAt: string;
  message: string | null;
  customerPhone: string | null;
  customerName: string | null;
  createdAt: string;
}

export interface CreateReminderRequest {
  type: 'payment' | 'overdue';
  channel?: string;
  message?: string;
  customerPhone?: string;
  customerName?: string;
  shopId?: string;
}

export interface ReminderListResponse {
  success: boolean;
  data: InvoiceReminder[];
}

export interface CreateReminderResponse {
  success: boolean;
  data: InvoiceReminder;
  reminderCount?: number;
  friendlyReminderCount?: number;
  urgentReminderCount?: number;
  meta?: { reminderCount: number; friendlyReminderCount?: number; urgentReminderCount?: number };
}

export const reminderService = {
  /**
   * Get all reminders for an invoice
   */
  async getByInvoice(invoiceId: string, shopId?: string): Promise<InvoiceReminder[]> {
    let url = `${API_BASE_URL}/api/v1/invoices/${invoiceId}/reminders`;
    if (shopId) {
      url += `?shopId=${shopId}`;
    }
    console.log('🔍 Fetching reminders from:', url);
    
    const response = await fetch(url, {
      method: 'GET',
      headers: getAuthHeaders(),
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('❌ Failed to fetch reminders:', response.status, errorData);
      throw new Error(errorData.error || `Failed to fetch reminders: ${response.statusText}`);
    }
    
    const data: ReminderListResponse = await response.json();
    console.log('✅ Reminders loaded:', data);
    
    if (!data.success) {
      throw new Error('Failed to fetch reminders');
    }
    
    return data.data;
  },

  /**
   * Get all reminders for a customer (across all their invoices)
   */
  async getByCustomer(customerId: string, shopId?: string): Promise<InvoiceReminder[]> {
    let url = `${API_BASE_URL}/api/v1/customers/reminders?customerId=${customerId}`;
    if (shopId) {
      url += `&shopId=${shopId}`;
    }
    console.log('🔍 Fetching customer reminders from:', url);
    
    const response = await fetch(url, {
      method: 'GET',
      headers: getAuthHeaders(),
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('❌ Failed to fetch customer reminders:', response.status, errorData);
      throw new Error(errorData.error || `Failed to fetch reminders: ${response.statusText}`);
    }
    
    const data: ReminderListResponse = await response.json();
    console.log('✅ Customer reminders loaded:', data);
    
    if (!data.success) {
      throw new Error('Failed to fetch reminders');
    }
    
    return data.data;
  },

  /**
   * Create a new reminder for an invoice
   */
  async create(invoiceId: string, reminder: CreateReminderRequest): Promise<{ reminder: InvoiceReminder; reminderCount: number; friendlyReminderCount: number; urgentReminderCount: number }> {
    // Build URL with optional shopId query param (for SUPER_ADMIN viewing shops)
    let url = `${API_BASE_URL}/api/v1/invoices/${invoiceId}/reminders`;
    if (reminder.shopId) {
      url += `?shopId=${reminder.shopId}`;
    }
    
    const response = await fetch(url, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(reminder),
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `Failed to create reminder: ${response.statusText}`);
    }
    
    const data: CreateReminderResponse = await response.json();
    
    if (!data.success) {
      throw new Error('Failed to create reminder');
    }
    
    // Handle both response formats (root level or meta object)
    const count = data.reminderCount ?? data.meta?.reminderCount ?? 1;
    const friendlyCount = data.friendlyReminderCount ?? data.meta?.friendlyReminderCount ?? 0;
    const urgentCount = data.urgentReminderCount ?? data.meta?.urgentReminderCount ?? 0;
    
    return {
      reminder: data.data,
      reminderCount: count,
      friendlyReminderCount: friendlyCount,
      urgentReminderCount: urgentCount,
    };
  },
};

// ==========================================
// GRN REMINDER SERVICE
// ==========================================

export interface GRNReminder {
  id: string;
  grnId: string;
  shopId: string;
  type: 'PAYMENT' | 'OVERDUE';
  channel: string;
  sentAt: string;
  message: string | null;
  supplierPhone: string | null;
  supplierName: string | null;
  createdAt: string;
}

export interface CreateGRNReminderRequest {
  type: 'PAYMENT' | 'OVERDUE';
  channel?: string;
  message?: string;
  supplierPhone?: string;
  supplierName?: string;
  shopId?: string;
}

export interface GRNReminderListResponse {
  success: boolean;
  data: GRNReminder[];
  reminderCount?: number;
}

export interface CreateGRNReminderResponse {
  success: boolean;
  data: GRNReminder;
  reminderCount?: number;
  message?: string;
}

export const grnReminderService = {
  /**
   * Get all reminders for a GRN
   */
  async getByGRN(grnId: string, shopId?: string): Promise<{ reminders: GRNReminder[]; reminderCount: number }> {
    let url = `${API_BASE_URL}/api/v1/grns/${grnId}/reminders`;
    if (shopId) {
      url += `?shopId=${shopId}`;
    }
    console.log('🔍 Fetching GRN reminders from:', url);
    
    const response = await fetch(url, {
      method: 'GET',
      headers: getAuthHeaders(),
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('❌ Failed to fetch GRN reminders:', response.status, errorData);
      throw new Error(errorData.error || `Failed to fetch reminders: ${response.statusText}`);
    }
    
    const data: GRNReminderListResponse = await response.json();
    console.log('✅ GRN Reminders loaded:', data);
    
    if (!data.success) {
      throw new Error('Failed to fetch GRN reminders');
    }
    
    return {
      reminders: data.data,
      reminderCount: data.reminderCount ?? data.data.length,
    };
  },

  /**
   * Create a new reminder for a GRN
   */
  async create(grnId: string, reminder: CreateGRNReminderRequest): Promise<{ reminder: GRNReminder; reminderCount: number }> {
    let url = `${API_BASE_URL}/api/v1/grns/${grnId}/reminders`;
    if (reminder.shopId) {
      url += `?shopId=${reminder.shopId}`;
    }
    console.log('📤 Creating GRN reminder:', url, reminder);
    
    const response = await fetch(url, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(reminder),
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `Failed to create GRN reminder: ${response.statusText}`);
    }
    
    const data: CreateGRNReminderResponse = await response.json();
    console.log('✅ GRN Reminder created:', data);
    
    if (!data.success) {
      throw new Error('Failed to create GRN reminder');
    }
    
    return {
      reminder: data.data,
      reminderCount: data.reminderCount ?? 1,
    };
  },
};

export default reminderService;
