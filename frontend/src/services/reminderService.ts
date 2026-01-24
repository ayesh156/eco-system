// Reminder Service - API calls for invoice reminders

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

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
  meta: { count: number };
}

export interface CreateReminderResponse {
  success: boolean;
  data: InvoiceReminder;
  meta: { reminderCount: number };
}

export const reminderService = {
  /**
   * Get all reminders for an invoice
   */
  async getByInvoice(invoiceId: string): Promise<InvoiceReminder[]> {
    const response = await fetch(`${API_BASE_URL}/api/v1/invoices/${invoiceId}/reminders`);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch reminders: ${response.statusText}`);
    }
    
    const data: ReminderListResponse = await response.json();
    
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
      headers: {
        'Content-Type': 'application/json',
      },
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
      reminderCount: data.meta.reminderCount,
    };
  },
};

export default reminderService;
