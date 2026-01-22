import React, { useState, useRef } from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import type { GoodsReceivedNote, GRNStatus, GRNItemStatus } from '../../data/mockData';
import { mockSuppliers } from '../../data/mockData';
import PrintableGRN from '../PrintableGRN';
import {
  X,
  Package,
  Truck,
  ClipboardCheck,
  CheckCircle,
  XCircle,
  AlertTriangle,
  FileText,
  Clock,
  ShieldCheck,
  Printer,
  Edit,
  Building2,
  CreditCard,
  Banknote,
  Receipt,
  Wallet,
  Tag,
  Percent,
  BadgePercent,
} from 'lucide-react';

interface GRNViewModalProps {
  isOpen: boolean;
  grn: GoodsReceivedNote | null;
  onClose: () => void;
  onEdit?: (grn: GoodsReceivedNote) => void;
}

const statusConfig: Record<GRNStatus, { label: string; color: string; bgColor: string; borderColor: string; icon: React.ElementType }> = {
  pending: { label: 'Pending Delivery', color: 'text-amber-500', bgColor: 'bg-amber-500/10', borderColor: 'border-amber-500/30', icon: Clock },
  inspecting: { label: 'Quality Inspection', color: 'text-blue-500', bgColor: 'bg-blue-500/10', borderColor: 'border-blue-500/30', icon: ShieldCheck },
  partial: { label: 'Partial Received', color: 'text-orange-500', bgColor: 'bg-orange-500/10', borderColor: 'border-orange-500/30', icon: AlertTriangle },
  completed: { label: 'Completed', color: 'text-emerald-500', bgColor: 'bg-emerald-500/10', borderColor: 'border-emerald-500/30', icon: CheckCircle },
  rejected: { label: 'Rejected', color: 'text-red-500', bgColor: 'bg-red-500/10', borderColor: 'border-red-500/30', icon: XCircle },
};

const itemStatusConfig: Record<GRNItemStatus, { label: string; color: string; bgColor: string }> = {
  pending: { label: 'Pending', color: 'text-amber-500', bgColor: 'bg-amber-500/10' },
  accepted: { label: 'Accepted', color: 'text-emerald-500', bgColor: 'bg-emerald-500/10' },
  rejected: { label: 'Rejected', color: 'text-red-500', bgColor: 'bg-red-500/10' },
  partial: { label: 'Partial', color: 'text-orange-500', bgColor: 'bg-orange-500/10' },
};

// Payment method config
const paymentMethodConfig: Record<string, { label: string; icon: React.ElementType; color: string; bgColor: string }> = {
  cash: { label: 'Cash', icon: Banknote, color: 'text-emerald-500', bgColor: 'bg-emerald-500/10' },
  bank: { label: 'Bank Transfer', icon: Building2, color: 'text-blue-500', bgColor: 'bg-blue-500/10' },
  card: { label: 'Card', icon: CreditCard, color: 'text-purple-500', bgColor: 'bg-purple-500/10' },
  credit: { label: 'Credit', icon: Wallet, color: 'text-orange-500', bgColor: 'bg-orange-500/10' },
  cheque: { label: 'Cheque', icon: Receipt, color: 'text-cyan-500', bgColor: 'bg-cyan-500/10' },
};

// Payment status config
const paymentStatusConfig: Record<string, { label: string; color: string; bgColor: string; borderColor: string }> = {
  paid: { label: 'Paid', color: 'text-emerald-500', bgColor: 'bg-emerald-500/10', borderColor: 'border-emerald-500/30' },
  partial: { label: 'Partial', color: 'text-amber-500', bgColor: 'bg-amber-500/10', borderColor: 'border-amber-500/30' },
  unpaid: { label: 'Unpaid', color: 'text-red-500', bgColor: 'bg-red-500/10', borderColor: 'border-red-500/30' },
};

export const GRNViewModal: React.FC<GRNViewModalProps> = ({
  isOpen,
  grn,
  onClose,
  onEdit,
}) => {
  const { theme } = useTheme();
  const [showPrintPreview, setShowPrintPreview] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  if (!isOpen || !grn) return null;

  const statusInfo = statusConfig[grn.status];
  const StatusIcon = statusInfo.icon;

  // Get supplier for print
  const supplier = mockSuppliers.find(s => s.id === grn.supplierId);

  const handlePrint = () => {
    setShowPrintPreview(true);
  };

  const handlePrintDocument = () => {
    const printContent = printRef.current;
    if (!printContent) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>GRN - ${grn.grnNumber}</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { font-family: 'Segoe UI', Arial, sans-serif; }
          </style>
        </head>
        <body>
          ${printContent.innerHTML}
        </body>
      </html>
    `);

    printWindow.document.close();
    printWindow.focus();
    
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 250);
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  // Calculate acceptance rate
  const acceptanceRate = grn.totalReceivedQuantity > 0 
    ? ((grn.totalAcceptedQuantity / grn.totalReceivedQuantity) * 100).toFixed(1)
    : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className={`w-full max-w-4xl max-h-[95vh] rounded-2xl border shadow-2xl overflow-hidden flex flex-col ${
        theme === 'dark' 
          ? 'bg-slate-900 border-slate-700' 
          : 'bg-white border-slate-200'
      }`}>
        {/* Header */}
        <div className={`px-6 py-4 border-b flex items-center justify-between flex-shrink-0 ${
          theme === 'dark' 
            ? 'bg-gradient-to-r from-emerald-900/30 to-teal-900/30 border-slate-700' 
            : 'bg-gradient-to-r from-emerald-50 to-teal-50 border-slate-200'
        }`}>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/25">
              <ClipboardCheck className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className={`text-xl font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                {grn.grnNumber}
              </h2>
              <p className={`text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                Goods Received Note
              </p>
            </div>
            <span className={`ml-4 px-4 py-1.5 rounded-full text-sm font-medium flex items-center gap-2 ${statusInfo.bgColor} ${statusInfo.color} border ${statusInfo.borderColor}`}>
              <StatusIcon className="w-4 h-4" />
              {statusInfo.label}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {onEdit && (
              <button
                onClick={() => onEdit(grn)}
                className={`p-2 rounded-lg transition-colors ${
                  theme === 'dark' ? 'hover:bg-slate-700 text-slate-400' : 'hover:bg-slate-100 text-slate-600'
                }`}
                title="Edit GRN"
              >
                <Edit className="w-5 h-5" />
              </button>
            )}
            <button
              onClick={handlePrint}
              className={`p-2 rounded-lg transition-colors ${
                theme === 'dark' ? 'hover:bg-slate-700 text-slate-400' : 'hover:bg-slate-100 text-slate-600'
              }`}
              title="Print GRN"
            >
              <Printer className="w-5 h-5" />
            </button>
            <button
              onClick={onClose}
              className={`p-2 rounded-lg transition-colors ${
                theme === 'dark' ? 'hover:bg-slate-700 text-slate-400' : 'hover:bg-slate-100 text-slate-600'
              }`}
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Summary Stats */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className={`p-4 rounded-xl ${theme === 'dark' ? 'bg-slate-800/50' : 'bg-slate-50'}`}>
              <p className={`text-xs ${theme === 'dark' ? 'text-slate-500' : 'text-slate-500'}`}>Ordered</p>
              <p className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                {grn.totalOrderedQuantity}
              </p>
            </div>
            <div className={`p-4 rounded-xl ${theme === 'dark' ? 'bg-slate-800/50' : 'bg-slate-50'}`}>
              <p className={`text-xs ${theme === 'dark' ? 'text-slate-500' : 'text-slate-500'}`}>Received</p>
              <p className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                {grn.totalReceivedQuantity}
              </p>
            </div>
            <div className={`p-4 rounded-xl ${theme === 'dark' ? 'bg-emerald-500/10' : 'bg-emerald-50'}`}>
              <p className={`text-xs ${theme === 'dark' ? 'text-emerald-400' : 'text-emerald-600'}`}>Accepted</p>
              <p className="text-2xl font-bold text-emerald-500">{grn.totalAcceptedQuantity}</p>
            </div>
            <div className={`p-4 rounded-xl ${theme === 'dark' ? 'bg-red-500/10' : 'bg-red-50'}`}>
              <p className={`text-xs ${theme === 'dark' ? 'text-red-400' : 'text-red-600'}`}>Rejected</p>
              <p className="text-2xl font-bold text-red-500">{grn.totalRejectedQuantity}</p>
            </div>
            <div className={`p-4 rounded-xl ${theme === 'dark' ? 'bg-blue-500/10' : 'bg-blue-50'}`}>
              <p className={`text-xs ${theme === 'dark' ? 'text-blue-400' : 'text-blue-600'}`}>Accept Rate</p>
              <p className="text-2xl font-bold text-blue-500">{acceptanceRate}%</p>
            </div>
          </div>

          {/* Supplier & Delivery Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Supplier Info */}
            <div className={`p-4 rounded-xl border ${theme === 'dark' ? 'bg-slate-800/30 border-slate-700' : 'bg-white border-slate-200'}`}>
              <h3 className={`text-sm font-semibold mb-3 flex items-center gap-2 ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                <Building2 className="w-4 h-4" />
                Supplier Information
              </h3>
              <div className="space-y-2">
                <p className={`font-medium ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                  {grn.supplierName}
                </p>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className={theme === 'dark' ? 'text-slate-500' : 'text-slate-500'}>Order Date:</span>
                    <p className={theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}>{formatDate(grn.orderDate)}</p>
                  </div>
                  <div>
                    <span className={theme === 'dark' ? 'text-slate-500' : 'text-slate-500'}>Expected:</span>
                    <p className={theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}>{formatDate(grn.expectedDeliveryDate)}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Delivery Info */}
            <div className={`p-4 rounded-xl border ${theme === 'dark' ? 'bg-slate-800/30 border-slate-700' : 'bg-white border-slate-200'}`}>
              <h3 className={`text-sm font-semibold mb-3 flex items-center gap-2 ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                <Truck className="w-4 h-4" />
                Delivery Information
              </h3>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className={theme === 'dark' ? 'text-slate-500' : 'text-slate-500'}>Received Date:</span>
                  <p className={theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}>{formatDate(grn.receivedDate)}</p>
                </div>
                <div>
                  <span className={theme === 'dark' ? 'text-slate-500' : 'text-slate-500'}>Received By:</span>
                  <p className={theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}>{grn.receivedBy || '-'}</p>
                </div>
                <div>
                  <span className={theme === 'dark' ? 'text-slate-500' : 'text-slate-500'}>Delivery Note:</span>
                  <p className={theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}>{grn.deliveryNote || '-'}</p>
                </div>
                <div>
                  <span className={theme === 'dark' ? 'text-slate-500' : 'text-slate-500'}>Vehicle:</span>
                  <p className={theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}>{grn.vehicleNumber || '-'}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Payment & Discount Summary */}
          {(grn.paymentMethod || grn.totalDiscount || grn.discountAmount) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Payment Info */}
              {grn.paymentMethod && (
                <div className={`p-4 rounded-xl border ${theme === 'dark' ? 'bg-slate-800/30 border-slate-700' : 'bg-white border-slate-200'}`}>
                  <h3 className={`text-sm font-semibold mb-3 flex items-center gap-2 ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                    <CreditCard className="w-4 h-4" />
                    Payment Information
                  </h3>
                  <div className="space-y-3">
                    {/* Payment Method */}
                    <div className="flex items-center justify-between">
                      <span className={`text-sm ${theme === 'dark' ? 'text-slate-500' : 'text-slate-500'}`}>Method:</span>
                      <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg ${paymentMethodConfig[grn.paymentMethod]?.bgColor || 'bg-slate-500/10'}`}>
                        {(() => {
                          const config = paymentMethodConfig[grn.paymentMethod];
                          const Icon = config?.icon || CreditCard;
                          return <Icon className={`w-4 h-4 ${config?.color || 'text-slate-500'}`} />;
                        })()}
                        <span className={`text-sm font-medium ${paymentMethodConfig[grn.paymentMethod]?.color || 'text-slate-500'}`}>
                          {paymentMethodConfig[grn.paymentMethod]?.label || grn.paymentMethod}
                        </span>
                      </div>
                    </div>
                    {/* Payment Status */}
                    {grn.paymentStatus && (
                      <div className="flex items-center justify-between">
                        <span className={`text-sm ${theme === 'dark' ? 'text-slate-500' : 'text-slate-500'}`}>Status:</span>
                        <span className={`px-3 py-1.5 rounded-lg text-sm font-medium border ${paymentStatusConfig[grn.paymentStatus]?.bgColor || 'bg-slate-500/10'} ${paymentStatusConfig[grn.paymentStatus]?.color || 'text-slate-500'} ${paymentStatusConfig[grn.paymentStatus]?.borderColor || 'border-slate-500/30'}`}>
                          {paymentStatusConfig[grn.paymentStatus]?.label || grn.paymentStatus}
                        </span>
                      </div>
                    )}
                    {/* Paid Amount */}
                    {grn.paidAmount !== undefined && grn.paymentStatus !== 'unpaid' && (
                      <div className="flex items-center justify-between">
                        <span className={`text-sm ${theme === 'dark' ? 'text-slate-500' : 'text-slate-500'}`}>Paid:</span>
                        <span className={`text-sm font-bold ${theme === 'dark' ? 'text-emerald-400' : 'text-emerald-600'}`}>
                          Rs.{grn.paidAmount.toLocaleString()}
                        </span>
                      </div>
                    )}
                    {/* Balance */}
                    {grn.paymentStatus === 'partial' && grn.paidAmount !== undefined && (
                      <div className="flex items-center justify-between pt-2 border-t border-slate-700/30">
                        <span className={`text-sm ${theme === 'dark' ? 'text-slate-500' : 'text-slate-500'}`}>Balance:</span>
                        <span className={`text-sm font-bold ${theme === 'dark' ? 'text-amber-400' : 'text-amber-600'}`}>
                          Rs.{(grn.totalAmount - grn.paidAmount).toLocaleString()}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Discount Info */}
              {(grn.totalDiscount || grn.discountAmount) && (
                <div className={`p-4 rounded-xl border ${theme === 'dark' ? 'bg-gradient-to-br from-orange-900/20 to-amber-900/20 border-orange-500/30' : 'bg-gradient-to-br from-orange-50 to-amber-50 border-orange-200'}`}>
                  <h3 className={`text-sm font-semibold mb-3 flex items-center gap-2 ${theme === 'dark' ? 'text-orange-400' : 'text-orange-700'}`}>
                    <BadgePercent className="w-4 h-4" />
                    Discount Summary
                  </h3>
                  <div className="space-y-3">
                    {/* Item Discounts */}
                    {grn.totalDiscount && grn.totalDiscount > 0 && (
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Tag className={`w-3.5 h-3.5 ${theme === 'dark' ? 'text-orange-400' : 'text-orange-600'}`} />
                          <span className={`text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>Item Discounts:</span>
                        </div>
                        <span className={`text-sm font-semibold ${theme === 'dark' ? 'text-orange-400' : 'text-orange-600'}`}>
                          -Rs.{grn.totalDiscount.toLocaleString()}
                        </span>
                      </div>
                    )}
                    {/* Overall Discount */}
                    {grn.discountAmount > 0 && (
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Percent className={`w-3.5 h-3.5 ${theme === 'dark' ? 'text-orange-400' : 'text-orange-600'}`} />
                          <span className={`text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>Overall Discount:</span>
                        </div>
                        <span className={`text-sm font-semibold ${theme === 'dark' ? 'text-orange-400' : 'text-orange-600'}`}>
                          -Rs.{grn.discountAmount.toLocaleString()}
                        </span>
                      </div>
                    )}
                    {/* Total Savings */}
                    {((grn.totalDiscount || 0) + (grn.discountAmount || 0)) > 0 && (
                      <div className="flex items-center justify-between pt-2 border-t border-orange-500/20">
                        <span className={`text-sm font-medium ${theme === 'dark' ? 'text-orange-300' : 'text-orange-700'}`}>Total Savings:</span>
                        <span className={`text-lg font-bold ${theme === 'dark' ? 'text-orange-400' : 'text-orange-600'}`}>
                          Rs.{((grn.totalDiscount || 0) + grn.discountAmount).toLocaleString()}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Items Table */}
          <div className={`rounded-xl border overflow-hidden ${theme === 'dark' ? 'border-slate-700' : 'border-slate-200'}`}>
            <div className={`px-4 py-3 border-b ${theme === 'dark' ? 'bg-slate-800/50 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
              <h3 className={`font-semibold flex items-center gap-2 ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                <Package className="w-4 h-4" />
                Items ({grn.items.length})
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className={theme === 'dark' ? 'bg-slate-800/30' : 'bg-slate-50'}>
                    <th className={`px-4 py-3 text-left text-xs font-medium ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>Product</th>
                    <th className={`px-4 py-3 text-center text-xs font-medium ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>Ordered</th>
                    <th className={`px-4 py-3 text-center text-xs font-medium ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>Received</th>
                    <th className={`px-4 py-3 text-center text-xs font-medium ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>Accepted</th>
                    <th className={`px-4 py-3 text-center text-xs font-medium ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>Rejected</th>
                    <th className={`px-4 py-3 text-right text-xs font-medium ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>Unit Price</th>
                    <th className={`px-4 py-3 text-right text-xs font-medium ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>Total</th>
                    <th className={`px-4 py-3 text-center text-xs font-medium ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700/50">
                  {grn.items.map((item) => (
                    <tr key={item.id} className={theme === 'dark' ? 'hover:bg-slate-800/30' : 'hover:bg-slate-50'}>
                      <td className="px-4 py-3">
                        <div>
                          <p className={`font-medium ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>{item.productName}</p>
                          <p className={`text-xs ${theme === 'dark' ? 'text-slate-500' : 'text-slate-500'}`}>{item.category}</p>
                          {item.batchNumber && (
                            <p className={`text-xs ${theme === 'dark' ? 'text-slate-500' : 'text-slate-500'}`}>
                              Batch: {item.batchNumber}
                            </p>
                          )}
                        </div>
                      </td>
                      <td className={`px-4 py-3 text-center ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                        {item.orderedQuantity}
                      </td>
                      <td className={`px-4 py-3 text-center ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                        {item.receivedQuantity}
                      </td>
                      <td className="px-4 py-3 text-center text-emerald-500 font-medium">
                        {item.acceptedQuantity}
                      </td>
                      <td className="px-4 py-3 text-center text-red-500 font-medium">
                        {item.rejectedQuantity}
                      </td>
                      <td className={`px-4 py-3 text-right`}>
                        <div className="flex flex-col items-end">
                          {item.originalUnitPrice && item.originalUnitPrice !== item.unitPrice ? (
                            <>
                              <span className={`text-xs line-through ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>
                                Rs.{item.originalUnitPrice.toLocaleString()}
                              </span>
                              <span className={`font-medium ${theme === 'dark' ? 'text-emerald-400' : 'text-emerald-600'}`}>
                                Rs.{item.unitPrice.toLocaleString()}
                              </span>
                              <span className={`text-xs px-1.5 py-0.5 rounded mt-0.5 ${theme === 'dark' ? 'bg-orange-500/20 text-orange-400' : 'bg-orange-100 text-orange-600'}`}>
                                {item.discountType === 'percentage' ? `${item.discountValue}% off` : `-Rs.${item.discountValue?.toLocaleString()}`}
                              </span>
                            </>
                          ) : (
                            <span className={theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}>
                              Rs.{item.unitPrice.toLocaleString()}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className={`px-4 py-3 text-right font-medium ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                        Rs.{item.totalAmount.toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${itemStatusConfig[item.status].bgColor} ${itemStatusConfig[item.status].color}`}>
                          {itemStatusConfig[item.status].label}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Notes & Quality Info */}
          {(grn.notes || grn.inspectedBy) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {grn.notes && (
                <div className={`p-4 rounded-xl border ${theme === 'dark' ? 'bg-slate-800/30 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
                  <h3 className={`text-sm font-semibold mb-2 flex items-center gap-2 ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                    <FileText className="w-4 h-4" />
                    Notes
                  </h3>
                  <p className={`text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                    {grn.notes}
                  </p>
                </div>
              )}
              {grn.inspectedBy && (
                <div className={`p-4 rounded-xl border ${theme === 'dark' ? 'bg-blue-500/10 border-blue-500/30' : 'bg-blue-50 border-blue-200'}`}>
                  <h3 className={`text-sm font-semibold mb-2 flex items-center gap-2 ${theme === 'dark' ? 'text-blue-400' : 'text-blue-700'}`}>
                    <ShieldCheck className="w-4 h-4" />
                    Quality Inspection
                  </h3>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className={theme === 'dark' ? 'text-blue-400/60' : 'text-blue-600/60'}>Inspected By:</span>
                      <p className={theme === 'dark' ? 'text-blue-300' : 'text-blue-700'}>{grn.inspectedBy}</p>
                    </div>
                    <div>
                      <span className={theme === 'dark' ? 'text-blue-400/60' : 'text-blue-600/60'}>Date:</span>
                      <p className={theme === 'dark' ? 'text-blue-300' : 'text-blue-700'}>{formatDate(grn.inspectionDate || '')}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer - Total */}
        <div className={`px-6 py-4 border-t ${
          theme === 'dark' 
            ? 'bg-gradient-to-r from-emerald-900/30 to-teal-900/30 border-slate-700' 
            : 'bg-gradient-to-r from-emerald-50 to-teal-50 border-slate-200'
        }`}>
          <div className="flex items-center justify-between">
            <div className={`text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
              Created: {formatDate(grn.createdAt)}
              {grn.updatedAt !== grn.createdAt && ` • Updated: ${formatDate(grn.updatedAt)}`}
            </div>
            <div className="flex items-center gap-4">
              {grn.discountAmount > 0 && (
                <div className="text-right">
                  <span className={`text-sm ${theme === 'dark' ? 'text-slate-500' : 'text-slate-500'}`}>Discount:</span>
                  <span className={`ml-2 font-medium ${theme === 'dark' ? 'text-orange-400' : 'text-orange-600'}`}>
                    -Rs.{grn.discountAmount.toLocaleString()}
                  </span>
                </div>
              )}
              <div className="text-right">
                <span className={`text-sm ${theme === 'dark' ? 'text-slate-500' : 'text-slate-500'}`}>Total Value:</span>
                <span className={`ml-2 text-2xl font-bold ${theme === 'dark' ? 'text-emerald-400' : 'text-emerald-600'}`}>
                  Rs.{grn.totalAmount.toLocaleString()}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Print Preview Modal */}
      {showPrintPreview && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className={`w-full max-w-5xl max-h-[95vh] rounded-2xl border shadow-2xl overflow-hidden flex flex-col ${
            theme === 'dark' ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-200'
          }`}>
            {/* Print Preview Header */}
            <div className={`px-6 py-4 border-b flex items-center justify-between ${
              theme === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'
            }`}>
              <h3 className={`text-lg font-semibold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                Print Preview - {grn.grnNumber}
              </h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={handlePrintDocument}
                  className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-xl font-medium hover:opacity-90 transition-opacity"
                >
                  <Printer className="w-4 h-4" />
                  Print
                </button>
                <button
                  onClick={() => setShowPrintPreview(false)}
                  className={`p-2 rounded-lg transition-colors ${
                    theme === 'dark' ? 'hover:bg-slate-700 text-slate-400' : 'hover:bg-slate-200 text-slate-600'
                  }`}
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            
            {/* Print Content */}
            <div className="flex-1 overflow-auto p-6 bg-slate-600">
              <div className="mx-auto shadow-2xl">
                <PrintableGRN ref={printRef} grn={grn} supplier={supplier} />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
