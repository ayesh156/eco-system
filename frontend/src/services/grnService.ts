/**
 * GRN (Goods Received Note) API Service
 * World-Class CRUD operations for GRN management
 * Handles all GRN-related API calls to the backend with stock integration
 */

import { getAccessToken } from './authService';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api/v1';

// ===================================
// Type Definitions
// ===================================

export interface APIGRNItem {
  id: string;
  grnId: string;
  productId: string;
  quantity: number;
  costPrice: number;
  sellingPrice?: number;
  totalCost: number;
  createdAt: string;
  product?: {
    name: string;
    barcode?: string;
    serialNumber?: string;
  };
}

export interface APIGRN {
  id: string;
  grnNumber: string;
  supplierId: string;
  shopId: string;
  referenceNo?: string;
  date: string;
  expectedDate?: string;
  deliveryNote?: string;
  vehicleNumber?: string;
  receivedBy?: string;
  receivedDate?: string;
  subtotal: number;
  tax: number;
  discount: number;
  totalAmount: number;
  paidAmount: number;
  status: 'DRAFT' | 'PENDING' | 'COMPLETED' | 'CANCELLED';
  paymentStatus: 'UNPAID' | 'PARTIAL' | 'PAID';
  notes?: string;
  createdById?: string;
  createdAt: string;
  updatedAt: string;
  supplier?: {
    id: string;
    name: string;
    company?: string;
    email?: string;
    phone?: string;
  };
  items?: APIGRNItem[];
  createdBy?: {
    name: string;
  };
  _count?: {
    items?: number;
    reminders?: number;
  };
  // Calculated totals from backend
  totalOrderedQuantity?: number;
  totalAcceptedQuantity?: number;
  totalRejectedQuantity?: number;
  // Reminder count (flattened)
  reminderCount?: number;
}

export interface CreateGRNItemDTO {
  productId: string;
  quantity: number;
  costPrice: number;
  sellingPrice?: number;
}

export interface CreateGRNDTO {
  supplierId: string;
  referenceNo?: string;
  date?: string;
  expectedDate?: string;
  deliveryNote?: string;
  vehicleNumber?: string;
  receivedBy?: string;
  receivedDate?: string;
  items: CreateGRNItemDTO[];
  discount?: number;
  tax?: number;
  notes?: string;
  paymentStatus?: 'UNPAID' | 'PARTIAL' | 'PAID';
  paidAmount?: number;
}

// Frontend GRN interface for UI compatibility
export interface FrontendGRNItem {
  id: string;
  productId: string;
  productName: string;
  category: string;
  orderedQuantity: number;
  receivedQuantity: number;
  acceptedQuantity: number;
  rejectedQuantity: number;
  unitPrice: number;
  originalUnitPrice?: number;
  discountType?: 'percentage' | 'fixed';
  discountValue?: number;
  sellingPrice?: number;
  totalAmount: number;
  status: 'pending' | 'accepted' | 'rejected' | 'partial';
  rejectionReason?: string;
  qualityNotes?: string;
  batchNumber?: string;
  expiryDate?: string;
  serialNumbers?: string[];
}

export interface FrontendGRN {
  id: string;
  grnNumber: string;
  supplierId: string;
  supplierName: string;
  supplierEmail?: string;
  supplierPhone?: string;
  supplierCompany?: string;
  purchaseOrderId?: string;
  orderDate: string;
  expectedDeliveryDate: string;
  receivedDate: string;
  items: FrontendGRNItem[];
  totalOrderedQuantity: number;
  totalReceivedQuantity: number;
  totalAcceptedQuantity: number;
  totalRejectedQuantity: number;
  subtotal: number;
  totalDiscount?: number;
  discountAmount: number;
  taxAmount: number;
  totalAmount: number;
  paymentMethod?: 'cash' | 'bank' | 'card' | 'credit' | 'cheque';
  paymentStatus?: 'paid' | 'unpaid' | 'partial';
  paidAmount?: number;
  status: 'pending' | 'inspecting' | 'partial' | 'completed' | 'rejected';
  inspectedBy?: string;
  inspectionDate?: string;
  approvedBy?: string;
  approvalDate?: string;
  receivedBy: string;
  deliveryNote?: string;
  vehicleNumber?: string;
  driverName?: string;
  linkedPurchaseId?: string;
  notes?: string;
  internalNotes?: string;
  createdAt: string;
  updatedAt: string;
  // API reference
  apiId?: string;
  // Reminder count
  reminderCount?: number;
}

// ===================================
// Helper Functions
// ===================================

const getAuthHeaders = () => {
  const token = getAccessToken();
  return {
    'Content-Type': 'application/json',
    'Authorization': token ? `Bearer ${token}` : '',
  };
};

// Map API status to frontend status
const mapAPIStatusToFrontend = (status: string): FrontendGRN['status'] => {
  const statusMap: Record<string, FrontendGRN['status']> = {
    'DRAFT': 'pending',
    'PENDING': 'pending',
    'COMPLETED': 'completed',
    'CANCELLED': 'rejected',
  };
  return statusMap[status] || 'pending';
};

// Map API payment status to frontend
const mapAPIPaymentStatusToFrontend = (status: string): FrontendGRN['paymentStatus'] => {
  const statusMap: Record<string, NonNullable<FrontendGRN['paymentStatus']>> = {
    'UNPAID': 'unpaid',
    'PARTIAL': 'partial',
    'PAID': 'paid',
  };
  return statusMap[status] || 'unpaid';
};

// Convert API response to frontend format
export const convertAPIGRNToFrontend = (apiGRN: APIGRN): FrontendGRN => {
  const items: FrontendGRNItem[] = (apiGRN.items || []).map(item => ({
    id: item.id,
    productId: item.productId,
    productName: item.product?.name || 'Unknown Product',
    category: '',
    orderedQuantity: item.quantity,
    receivedQuantity: item.quantity,
    acceptedQuantity: item.quantity,
    rejectedQuantity: 0,
    unitPrice: item.costPrice,
    sellingPrice: item.sellingPrice,
    totalAmount: item.totalCost,
    status: 'accepted' as const,
  }));

  // Use pre-calculated totals from backend if available, otherwise calculate from items
  const calculatedTotalQuantity = items.reduce((sum, item) => sum + item.acceptedQuantity, 0);
  const totalOrderedQuantity = apiGRN.totalOrderedQuantity ?? calculatedTotalQuantity;
  const totalAcceptedQuantity = apiGRN.totalAcceptedQuantity ?? calculatedTotalQuantity;
  const totalRejectedQuantity = apiGRN.totalRejectedQuantity ?? 0;

  return {
    id: apiGRN.grnNumber, // Use grnNumber as display ID
    apiId: apiGRN.id, // Store actual UUID for API calls
    grnNumber: apiGRN.grnNumber,
    supplierId: apiGRN.supplierId,
    supplierName: apiGRN.supplier?.company || apiGRN.supplier?.name || 'Unknown Supplier',
    supplierEmail: apiGRN.supplier?.email || '',
    supplierPhone: apiGRN.supplier?.phone || '',
    supplierCompany: apiGRN.supplier?.company || '',
    orderDate: apiGRN.date?.split('T')[0] || '',
    expectedDeliveryDate: apiGRN.expectedDate?.split('T')[0] || '',
    receivedDate: apiGRN.receivedDate?.split('T')[0] || apiGRN.date?.split('T')[0] || '',
    items,
    totalOrderedQuantity,
    totalReceivedQuantity: totalOrderedQuantity,
    totalAcceptedQuantity,
    totalRejectedQuantity,
    subtotal: apiGRN.subtotal,
    discountAmount: apiGRN.discount,
    taxAmount: apiGRN.tax,
    totalAmount: apiGRN.totalAmount,
    paymentStatus: mapAPIPaymentStatusToFrontend(apiGRN.paymentStatus),
    paidAmount: apiGRN.paidAmount,
    status: mapAPIStatusToFrontend(apiGRN.status),
    receivedBy: apiGRN.receivedBy || apiGRN.createdBy?.name || '',
    deliveryNote: apiGRN.deliveryNote,
    vehicleNumber: apiGRN.vehicleNumber,
    notes: apiGRN.notes,
    createdAt: apiGRN.createdAt,
    updatedAt: apiGRN.updatedAt,
    reminderCount: apiGRN.reminderCount || apiGRN._count?.reminders || 0,
  };
};

// Convert frontend format to API format for create
export const convertFrontendToAPIGRN = (frontendGRN: Partial<FrontendGRN>): CreateGRNDTO => {
  return {
    supplierId: frontendGRN.supplierId || '',
    referenceNo: frontendGRN.purchaseOrderId,
    date: frontendGRN.receivedDate || frontendGRN.orderDate,
    expectedDate: frontendGRN.expectedDeliveryDate,
    deliveryNote: frontendGRN.deliveryNote,
    vehicleNumber: frontendGRN.vehicleNumber,
    receivedBy: frontendGRN.receivedBy,
    receivedDate: frontendGRN.receivedDate,
    items: (frontendGRN.items || []).map(item => ({
      productId: item.productId,
      quantity: item.acceptedQuantity || item.receivedQuantity || item.orderedQuantity,
      costPrice: item.unitPrice,
      sellingPrice: item.sellingPrice,
    })),
    discount: frontendGRN.discountAmount || 0,
    tax: frontendGRN.taxAmount || 0,
    notes: frontendGRN.notes,
    paymentStatus: frontendGRN.paymentStatus?.toUpperCase() as CreateGRNDTO['paymentStatus'],
    paidAmount: frontendGRN.paidAmount,
  };
};

// ===================================
// API Functions
// ===================================

/**
 * Get all GRNs for the current shop or specified shop (SUPER_ADMIN)
 */
export const getGRNs = async (params?: { status?: string; supplierId?: string; shopId?: string }): Promise<{ success: boolean; data?: FrontendGRN[]; error?: string }> => {
  try {
    const queryParams = new URLSearchParams();
    if (params?.status) queryParams.append('status', params.status);
    if (params?.supplierId) queryParams.append('supplierId', params.supplierId);
    if (params?.shopId) queryParams.append('shopId', params.shopId);

    const url = `${API_BASE_URL}/grns${queryParams.toString() ? `?${queryParams}` : ''}`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: getAuthHeaders(),
      credentials: 'include',
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.message || result.error || 'Failed to fetch GRNs');
    }

    const grns = (result.data || []).map(convertAPIGRNToFrontend);
    return { success: true, data: grns };
  } catch (error) {
    console.error('Error fetching GRNs:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to fetch GRNs' 
    };
  }
};

/**
 * Get a single GRN by ID
 */
export const getGRNById = async (id: string, shopId?: string): Promise<{ success: boolean; data?: FrontendGRN; error?: string }> => {
  try {
    const queryParams = new URLSearchParams();
    if (shopId) queryParams.append('shopId', shopId);
    const url = `${API_BASE_URL}/grns/${id}${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: getAuthHeaders(),
      credentials: 'include',
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.message || result.error || 'Failed to fetch GRN');
    }

    const grn = convertAPIGRNToFrontend(result.data);
    return { success: true, data: grn };
  } catch (error) {
    console.error('Error fetching GRN:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to fetch GRN' 
    };
  }
};

/**
 * Create a new GRN with automatic stock updates
 */
export const createGRN = async (grnData: Partial<FrontendGRN>, shopId?: string): Promise<{ success: boolean; data?: FrontendGRN; error?: string }> => {
  try {
    const apiData = convertFrontendToAPIGRN(grnData);
    
    // Debug log to see what's being sent
    console.log('📦 Creating GRN with data:', JSON.stringify(apiData, null, 2));
    console.log('📦 Supplier ID:', apiData.supplierId);
    console.log('📦 Items count:', apiData.items?.length);
    console.log('📦 First item:', apiData.items?.[0]);
    
    const queryParams = new URLSearchParams();
    if (shopId) queryParams.append('shopId', shopId);
    const url = `${API_BASE_URL}/grns${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: getAuthHeaders(),
      credentials: 'include',
      body: JSON.stringify(apiData),
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.message || result.error || 'Failed to create GRN');
    }

    // Re-fetch the full GRN to get complete data including items
    const fullGRN = await getGRNById(result.data.id, shopId);
    if (fullGRN.success && fullGRN.data) {
      return { success: true, data: fullGRN.data };
    }

    return { success: true, data: convertAPIGRNToFrontend(result.data) };
  } catch (error) {
    console.error('Error creating GRN:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to create GRN' 
    };
  }
};

/**
 * Get GRN statistics
 */
export const getGRNStats = async (): Promise<{ 
  success: boolean; 
  data?: {
    total: number;
    pending: number;
    completed: number;
    totalValue: number;
    unpaidValue: number;
  }; 
  error?: string 
}> => {
  try {
    const result = await getGRNs();
    
    if (!result.success || !result.data) {
      throw new Error(result.error || 'Failed to fetch GRN stats');
    }

    const grns = result.data;
    const stats = {
      total: grns.length,
      pending: grns.filter(g => g.status === 'pending').length,
      completed: grns.filter(g => g.status === 'completed').length,
      totalValue: grns.reduce((sum, g) => sum + g.totalAmount, 0),
      unpaidValue: grns.filter(g => g.paymentStatus !== 'paid').reduce((sum, g) => sum + (g.totalAmount - (g.paidAmount || 0)), 0),
    };

    return { success: true, data: stats };
  } catch (error) {
    console.error('Error fetching GRN stats:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to fetch GRN stats' 
    };
  }
};

/**
 * Delete a GRN by ID
 * Note: This should be used carefully as it may affect stock records
 */
export const deleteGRN = async (id: string, shopId?: string): Promise<{ success: boolean; error?: string }> => {
  try {
    const queryParams = new URLSearchParams();
    if (shopId) queryParams.append('shopId', shopId);
    const url = `${API_BASE_URL}/grns/${id}${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    
    const response = await fetch(url, {
      method: 'DELETE',
      headers: getAuthHeaders(),
      credentials: 'include',
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.message || result.error || 'Failed to delete GRN');
    }

    return { success: true };
  } catch (error) {
    console.error('Error deleting GRN:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to delete GRN' 
    };
  }
};

/**
 * Update an existing GRN
 */
export const updateGRN = async (id: string, grnData: Partial<FrontendGRN>, shopId?: string): Promise<{ success: boolean; data?: FrontendGRN; error?: string }> => {
  try {
    const apiData = convertFrontendToAPIGRN(grnData);
    const queryParams = new URLSearchParams();
    if (shopId) queryParams.append('shopId', shopId);
    const url = `${API_BASE_URL}/grns/${id}${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;

    const response = await fetch(url, {
      method: 'PUT',
      headers: getAuthHeaders(),
      credentials: 'include',
      body: JSON.stringify(apiData),
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.message || result.error || 'Failed to update GRN');
    }

    return { success: true, data: convertAPIGRNToFrontend(result.data) };
  } catch (error) {
    console.error('Error updating GRN:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to update GRN' 
    };
  }
};

/**
 * Record a payment for a GRN
 * Updates paidAmount and paymentStatus
 */
export const recordGRNPayment = async (
  id: string, 
  paymentData: { 
    amount: number; 
    paymentMethod: string; 
    notes?: string 
  }, 
  shopId?: string
): Promise<{ success: boolean; data?: FrontendGRN; error?: string }> => {
  try {
    const queryParams = new URLSearchParams();
    if (shopId) queryParams.append('shopId', shopId);
    const url = `${API_BASE_URL}/grns/${id}/payment${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: getAuthHeaders(),
      credentials: 'include',
      body: JSON.stringify(paymentData),
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.message || result.error || 'Failed to record payment');
    }

    return { success: true, data: convertAPIGRNToFrontend(result.data) };
  } catch (error) {
    console.error('Error recording GRN payment:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to record payment' 
    };
  }
};

// ===================================
// Send GRN Email with PDF
// ===================================

export interface SendGRNEmailResult {
  success: boolean;
  sentTo: string;
  hasPdfAttachment: boolean;
}

/**
 * Send GRN email to supplier with optional PDF attachment
 * @param grnId - The GRN ID (UUID preferred) to send
 * @param pdfBase64 - Base64 encoded PDF data (optional, if client-side generated)
 * @param accessToken - Optional access token
 * @param shopId - Optional shopId for SUPER_ADMIN context
 * @returns Email send result
 */
export const sendEmailWithPDF = async (
  grnId: string,
  pdfBase64?: string,
  accessToken?: string | null,
  shopId?: string
): Promise<SendGRNEmailResult> => {
  try {
    const queryParams = new URLSearchParams();
    if (shopId) queryParams.append('shopId', shopId);
    const url = `${API_BASE_URL}/grns/${grnId}/send-email${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    
    // Use provided token or fallback to module token
    const token = accessToken || getAccessToken();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    // 180s timeout for email sending (SMTP can be very slow on Render.com free tier cold starts)
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 180000);

    const response = await fetch(url, {
      method: 'POST',
      headers,
      credentials: 'include',
      signal: controller.signal,
      body: JSON.stringify({
        pdfBase64,
        includeAttachment: !!pdfBase64,
      }),
    });

    clearTimeout(timeoutId);

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.message || result.error || 'Failed to send email');
    }

    return {
      success: true,
      sentTo: result.data?.sentTo || result.sentTo || 'Unknown',
      hasPdfAttachment: result.data?.hasPdfAttachment || result.hasPdfAttachment || false,
    };
  } catch (error) {
    console.error('Error sending GRN email:', error);
    // Handle AbortError (timeout) with a user-friendly message
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new Error('Connection timeout - the server took too long to respond. Please try again.');
    }
    throw error;
  }
};

export default {
  getGRNs,
  getGRNById,
  createGRN,
  getGRNStats,
  deleteGRN,
  updateGRN,
  recordGRNPayment,
  sendEmailWithPDF,
};
