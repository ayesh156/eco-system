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
  reminderCount: number;
}

export const reminderService = {
  /**
   * Get all reminders for an invoice
   */
  async getByInvoice(invoiceId: string): Promise<InvoiceReminder[]> {
    const url = `${API_BASE_URL}/api/v1/invoices/${invoiceId}/reminders`;
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
   * Create a new reminder for an invoice
   */
  async create(invoiceId: string, reminder: CreateReminderRequest): Promise<{ reminder: InvoiceReminder; reminderCount: number }> {
    const response = await fetch(`${API_BASE_URL}/api/v1/invoices/${invoiceId}/reminders`, {
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
    
    return {
      reminder: data.data,
      reminderCount: data.reminderCount,
    };
  },
};

export default reminderService;
