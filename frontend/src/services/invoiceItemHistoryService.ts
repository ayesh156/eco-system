/**
 * Invoice Item History Service
 * Track all changes to invoice items (add, remove, qty change)
 */

import { getAccessToken } from './authService';

// Get base URL and ensure we don't duplicate /api/v1
const getApiBaseUrl = (): string => {
  const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';
  // Remove trailing /api/v1 if present (since we add it in the endpoint paths)
  return baseUrl.replace(/\/api\/v1\/?$/, '');
};

const API_BASE_URL = getApiBaseUrl();

// Helper to get auth headers (using same pattern as invoiceService)
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

// Types
export type ItemHistoryAction = 'ADDED' | 'REMOVED' | 'QTY_INCREASED' | 'QTY_DECREASED' | 'PRICE_CHANGED';

export interface InvoiceItemHistoryRecord {
  id: string;
  invoiceId: string;
  action: ItemHistoryAction;
  productId?: string;
  productName: string;
  oldQuantity?: number;
  newQuantity?: number;
  unitPrice: number;
  amountChange: number;
  changedById?: string;
  changedByName?: string;
  reason?: string;
  notes?: string;
  shopId: string;
  createdAt: string;
}

export interface CreateHistoryRequest {
  action: ItemHistoryAction;
  productId?: string;
  productName: string;
  oldQuantity?: number;
  newQuantity?: number;
  unitPrice: number;
  amountChange: number;
  reason?: string;
  notes?: string;
  changedByName?: string;
}

interface HistoryResponse {
  success: boolean;
  data: InvoiceItemHistoryRecord[];
  meta?: {
    count?: number;
    created?: number;
    invoiceNumber?: string;
  };
  error?: string;
}

/**
 * Invoice Item History Service
 */
export const invoiceItemHistoryService = {
  /**
   * Get item change history for an invoice
   */
  async getHistory(invoiceId: string, shopId?: string): Promise<InvoiceItemHistoryRecord[]> {
    let url = `${API_BASE_URL}/api/v1/invoices/${invoiceId}/item-history`;
    if (shopId) {
      url += `?shopId=${shopId}`;
    }
    
    console.log('📡 [HistoryService] GET request to:', url);
    
    const response = await fetch(url, {
      method: 'GET',
      headers: getAuthHeaders(),
    });
    
    console.log('📡 [HistoryService] GET response status:', response.status, response.statusText);
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('📡 [HistoryService] GET failed:', errorData);
      throw new Error(errorData.error || `Failed to fetch item history: ${response.statusText}`);
    }
    
    const data: HistoryResponse = await response.json();
    console.log('📡 [HistoryService] GET success:', data);
    
    if (!data.success) {
      throw new Error(data.error || 'Failed to fetch item history');
    }
    
    return data.data;
  },

  /**
   * Create item change history record(s) for an invoice
   * Supports batch creation for multiple changes at once
   */
  async createHistory(
    invoiceId: string, 
    changes: CreateHistoryRequest | CreateHistoryRequest[],
    shopId?: string
  ): Promise<{ records: InvoiceItemHistoryRecord[]; created: number }> {
    let url = `${API_BASE_URL}/api/v1/invoices/${invoiceId}/item-history`;
    if (shopId) {
      url += `?shopId=${shopId}`;
    }
    
    console.log('📡 [HistoryService] POST request to:', url);
    console.log('📡 [HistoryService] POST body:', JSON.stringify(changes, null, 2));
    
    const response = await fetch(url, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(changes),
    });
    
    console.log('📡 [HistoryService] POST response status:', response.status, response.statusText);
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('📡 [HistoryService] POST failed:', errorData);
      throw new Error(errorData.error || `Failed to create item history: ${response.statusText}`);
    }
    
    const data: HistoryResponse = await response.json();
    console.log('📡 [HistoryService] POST success:', data);
    
    if (!data.success) {
      throw new Error(data.error || 'Failed to create item history');
    }
    
    return {
      records: data.data,
      created: data.meta?.created || data.data.length,
    };
  },

  /**
   * Helper to determine action type from old and new quantities
   */
  getActionType(oldQty: number | undefined, newQty: number | undefined): ItemHistoryAction {
    if (oldQty === undefined || oldQty === 0) {
      return 'ADDED';
    }
    if (newQty === undefined || newQty === 0) {
      return 'REMOVED';
    }
    if (newQty > oldQty) {
      return 'QTY_INCREASED';
    }
    if (newQty < oldQty) {
      return 'QTY_DECREASED';
    }
    return 'PRICE_CHANGED';
  },

  /**
   * Calculate amount change based on action
   */
  calculateAmountChange(
    action: ItemHistoryAction,
    unitPrice: number,
    oldQty?: number,
    newQty?: number
  ): number {
    switch (action) {
      case 'ADDED':
        return (newQty || 0) * unitPrice;
      case 'REMOVED':
        return -((oldQty || 0) * unitPrice);
      case 'QTY_INCREASED':
        return ((newQty || 0) - (oldQty || 0)) * unitPrice;
      case 'QTY_DECREASED':
        return ((newQty || 0) - (oldQty || 0)) * unitPrice; // Will be negative
      default:
        return 0;
    }
  },

  /**
   * Format action for display
   */
  formatAction(action: ItemHistoryAction): string {
    const labels: Record<ItemHistoryAction, string> = {
      ADDED: '➕ Added',
      REMOVED: '➖ Removed',
      QTY_INCREASED: '📈 Quantity Increased',
      QTY_DECREASED: '📉 Quantity Decreased',
      PRICE_CHANGED: '💰 Price Changed',
    };
    return labels[action] || action;
  },

  /**
   * Get action badge color - returns Tailwind classes
   * For REMOVED action, returns theme-aware classes
   */
  getActionColor(action: ItemHistoryAction, theme?: 'dark' | 'light'): string {
    const isDark = theme === 'dark';
    
    const colors: Record<ItemHistoryAction, string> = {
      ADDED: 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/30',
      REMOVED: isDark 
        ? 'bg-rose-500/10 text-rose-400 border border-rose-500/30' 
        : 'bg-rose-100 text-rose-600 border border-rose-300',
      QTY_INCREASED: 'bg-blue-500/10 text-blue-500 border border-blue-500/30',
      QTY_DECREASED: isDark
        ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
        : 'bg-amber-100 text-amber-600 border border-amber-300',
      PRICE_CHANGED: 'bg-purple-500/10 text-purple-500 border border-purple-500/30',
    };
    return colors[action] || 'bg-slate-500/10 text-slate-500 border border-slate-500/30';
  },
};

export default invoiceItemHistoryService;
