import React from 'react';
import type { WarrantyClaim } from '../../data/mockData';
import { useTheme } from '../../contexts/ThemeContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../ui/dialog';
import {
  Shield,
  User,
  Package,
  FileText,
  Phone,
  Hash,
  Calendar,
  AlertCircle,
  MessageSquare,
  Wrench,
  RefreshCw,
  CheckCircle,
  Clock,
  XCircle,
  Search,
  Tag,
} from 'lucide-react';

interface WarrantyClaimViewModalProps {
  isOpen: boolean;
  claim: WarrantyClaim | null;
  onClose: () => void;
}

const statusConfig: Record<
  WarrantyClaim['status'],
  { label: string; color: string; bgColor: string; borderColor: string; icon: React.ElementType }
> = {
  pending: {
    label: 'Pending',
    color: 'text-yellow-500',
    bgColor: 'bg-yellow-500/10',
    borderColor: 'border-yellow-500/20',
    icon: Clock,
  },
  'under-review': {
    label: 'Under Review',
    color: 'text-blue-500',
    bgColor: 'bg-blue-500/10',
    borderColor: 'border-blue-500/20',
    icon: Search,
  },
  approved: {
    label: 'Approved',
    color: 'text-emerald-500',
    bgColor: 'bg-emerald-500/10',
    borderColor: 'border-emerald-500/20',
    icon: CheckCircle,
  },
  rejected: {
    label: 'Rejected',
    color: 'text-red-500',
    bgColor: 'bg-red-500/10',
    borderColor: 'border-red-500/20',
    icon: XCircle,
  },
  replaced: {
    label: 'Replaced',
    color: 'text-purple-500',
    bgColor: 'bg-purple-500/10',
    borderColor: 'border-purple-500/20',
    icon: RefreshCw,
  },
  repaired: {
    label: 'Repaired',
    color: 'text-cyan-500',
    bgColor: 'bg-cyan-500/10',
    borderColor: 'border-cyan-500/20',
    icon: Wrench,
  },
};

const issueCategoryConfig: Record<WarrantyClaim['issueCategory'], { label: string; color: string }> = {
  defective: { label: 'Defective', color: 'text-red-500' },
  damaged: { label: 'Damaged', color: 'text-orange-500' },
  'not-working': { label: 'Not Working', color: 'text-yellow-500' },
  performance: { label: 'Performance Issue', color: 'text-blue-500' },
  other: { label: 'Other', color: 'text-slate-500' },
};

export const WarrantyClaimViewModal: React.FC<WarrantyClaimViewModalProps> = ({ isOpen, claim, onClose }) => {
  const { theme } = useTheme();

  if (!claim) return null;

  const statusInfo = statusConfig[claim.status];
  const categoryInfo = issueCategoryConfig[claim.issueCategory];
  const StatusIcon = statusInfo.icon;

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return {
      date: date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
      time: date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }),
    };
  };

  const { date: claimDate, time: claimTime } = formatDateTime(claim.claimDate);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent
        className={`max-w-4xl max-h-[90vh] overflow-y-auto p-0 ${
          theme === 'dark' ? 'bg-slate-900 border-slate-700/50' : 'bg-white border-slate-200'
        }`}
      >
        <DialogHeader className="sr-only">
          <DialogTitle>Warranty Claim Details</DialogTitle>
          <DialogDescription>View complete warranty claim information</DialogDescription>
        </DialogHeader>

        {/* Gradient Header with Claim ID and Status */}
        <div
          className={`relative p-6 pr-16 text-white bg-gradient-to-br ${
            claim.status === 'approved' || claim.status === 'replaced' || claim.status === 'repaired'
              ? 'from-emerald-600 via-teal-600 to-cyan-600'
              : claim.status === 'rejected'
              ? 'from-red-600 via-rose-600 to-pink-600'
              : claim.status === 'under-review'
              ? 'from-blue-600 via-indigo-600 to-purple-600'
              : 'from-amber-600 via-orange-600 to-yellow-600'
          }`}
        >

          <div className="flex items-start gap-4">
            <div className="w-16 h-16 bg-white/20 backdrop-blur rounded-2xl flex items-center justify-center shrink-0">
              <Shield className="w-8 h-8" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h2 className="text-2xl font-bold">{claim.id}</h2>
                <div
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium backdrop-blur ${
                    theme === 'dark' ? 'bg-white/20' : 'bg-white/30'
                  }`}
                >
                  <StatusIcon className="w-4 h-4" />
                  {statusInfo.label}
                </div>
              </div>
              <p className="text-white/90 text-sm mb-3">{claim.productName}</p>
              <div className="flex items-center gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-white/70" />
                  <span className="text-white/90">
                    Filed: {claimDate} at {claimTime}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Tag className="w-4 h-4 text-white/70" />
                  <span className={`font-medium ${categoryInfo.color.replace('text-', 'text-white/')}`}>
                    {categoryInfo.label}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Content Grid */}
        <div className="p-6 space-y-6">
          {/* Customer & Invoice Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Customer Info */}
            <div
              className={`p-5 rounded-xl border ${
                theme === 'dark' ? 'bg-slate-800/50 border-slate-700/50' : 'bg-slate-50 border-slate-200'
              }`}
            >
              <div className="flex items-center gap-2 mb-4">
                <div className={`p-2 rounded-lg ${theme === 'dark' ? 'bg-blue-500/20' : 'bg-blue-100'}`}>
                  <User className="w-5 h-5 text-blue-500" />
                </div>
                <h3 className={`font-semibold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                  Customer Information
                </h3>
              </div>
              <div className="space-y-3">
                <div>
                  <p className={`text-xs uppercase tracking-wider mb-1 ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>
                    Name
                  </p>
                  <p className={`text-sm font-medium ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                    {claim.customerName}
                  </p>
                </div>
                {claim.customerPhone && (
                  <div>
                    <p className={`text-xs uppercase tracking-wider mb-1 ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>
                      Phone
                    </p>
                    <div className="flex items-center gap-2">
                      <Phone className="w-4 h-4 text-emerald-500" />
                      <p className={`text-sm ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                        {claim.customerPhone}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Invoice & Product Info */}
            <div
              className={`p-5 rounded-xl border ${
                theme === 'dark' ? 'bg-slate-800/50 border-slate-700/50' : 'bg-slate-50 border-slate-200'
              }`}
            >
              <div className="flex items-center gap-2 mb-4">
                <div className={`p-2 rounded-lg ${theme === 'dark' ? 'bg-purple-500/20' : 'bg-purple-100'}`}>
                  <Package className="w-5 h-5 text-purple-500" />
                </div>
                <h3 className={`font-semibold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                  Product Information
                </h3>
              </div>
              <div className="space-y-3">
                <div>
                  <p className={`text-xs uppercase tracking-wider mb-1 ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>
                    Invoice ID
                  </p>
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-emerald-500" />
                    <p className={`text-sm font-mono ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                      {claim.invoiceId}
                    </p>
                  </div>
                </div>
                {claim.productSerialNumber && (
                  <div>
                    <p className={`text-xs uppercase tracking-wider mb-1 ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>
                      Serial Number
                    </p>
                    <div className="flex items-center gap-2">
                      <Hash className="w-4 h-4 text-purple-500" />
                      <p className={`text-sm font-mono ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                        {claim.productSerialNumber}
                      </p>
                    </div>
                  </div>
                )}
                <div>
                  <p className={`text-xs uppercase tracking-wider mb-1 ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>
                    Warranty Expiry
                  </p>
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-amber-500" />
                    <p className={`text-sm ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                      {new Date(claim.warrantyExpiryDate).toLocaleDateString('en-GB', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Issue Description */}
          <div
            className={`p-5 rounded-xl border ${
              theme === 'dark' ? 'bg-red-900/10 border-red-800/30' : 'bg-red-50 border-red-200'
            }`}
          >
            <div className="flex items-center gap-2 mb-3">
              <AlertCircle className="w-5 h-5 text-red-500" />
              <h3 className={`font-semibold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                Issue Description
              </h3>
            </div>
            <p className={`text-sm leading-relaxed ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
              {claim.issueDescription}
            </p>
          </div>

          {/* Resolution */}
          {claim.resolution && (
            <div
              className={`p-5 rounded-xl border ${
                theme === 'dark' ? 'bg-emerald-900/10 border-emerald-800/30' : 'bg-emerald-50 border-emerald-200'
              }`}
            >
              <div className="flex items-center gap-2 mb-3">
                <CheckCircle className="w-5 h-5 text-emerald-500" />
                <h3 className={`font-semibold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>Resolution</h3>
              </div>
              <p className={`text-sm leading-relaxed mb-2 ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                {claim.resolution}
              </p>
              {claim.resolutionDate && (
                <div className={`flex items-center gap-2 text-xs ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>
                  <Calendar className="w-3.5 h-3.5" />
                  <span>
                    Resolved: {formatDateTime(claim.resolutionDate).date} at {formatDateTime(claim.resolutionDate).time}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Replacement Details */}
          {claim.isReplacement && claim.replacementProductName && (
            <div
              className={`p-5 rounded-xl border ${
                theme === 'dark' ? 'bg-purple-900/10 border-purple-800/30' : 'bg-purple-50 border-purple-200'
              }`}
            >
              <div className="flex items-center gap-2 mb-4">
                <RefreshCw className="w-5 h-5 text-purple-500" />
                <h3 className={`font-semibold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                  Replacement Details
                </h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className={`text-xs uppercase tracking-wider mb-1 ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>
                    Product
                  </p>
                  <div className="flex items-center gap-2">
                    <Package className="w-4 h-4 text-purple-500" />
                    <p className={`text-sm font-medium ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                      {claim.replacementProductName}
                    </p>
                  </div>
                </div>
                {claim.replacementSerialNumber && (
                  <div>
                    <p className={`text-xs uppercase tracking-wider mb-1 ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>
                      New Serial Number
                    </p>
                    <div className="flex items-center gap-2">
                      <Hash className="w-4 h-4 text-purple-500" />
                      <p className={`text-sm font-mono ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                        {claim.replacementSerialNumber}
                      </p>
                    </div>
                  </div>
                )}
                {claim.replacementDate && (
                  <div className="md:col-span-2">
                    <p className={`text-xs uppercase tracking-wider mb-1 ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>
                      Replacement Date
                    </p>
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-purple-500" />
                      <p className={`text-sm ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                        {formatDateTime(claim.replacementDate).date} at {formatDateTime(claim.replacementDate).time}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Notes & Additional Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {claim.notes && (
              <div
                className={`p-4 rounded-xl border ${
                  theme === 'dark' ? 'bg-slate-800/50 border-slate-700/50' : 'bg-slate-50 border-slate-200'
                }`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <MessageSquare className="w-4 h-4 text-amber-500" />
                  <h4 className={`text-sm font-semibold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>Notes</h4>
                </div>
                <p className={`text-sm italic ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>{claim.notes}</p>
              </div>
            )}

            {claim.handledBy && (
              <div
                className={`p-4 rounded-xl border ${
                  theme === 'dark' ? 'bg-slate-800/50 border-slate-700/50' : 'bg-slate-50 border-slate-200'
                }`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <User className="w-4 h-4 text-blue-500" />
                  <h4 className={`text-sm font-semibold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                    Handled By
                  </h4>
                </div>
                <p className={`text-sm ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>{claim.handledBy}</p>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
