import React, { useState, useEffect, useMemo } from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { grnReminderService, type GRNReminder } from '../../services/reminderService';
import { 
  Clock, 
  AlertTriangle, 
  CreditCard, 
  Phone,
  RefreshCw,
  History,
  Package,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

interface GRNReminderHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  grnId?: string;
  grnNumber?: string;
  supplierName?: string;
}

export const GRNReminderHistoryModal: React.FC<GRNReminderHistoryModalProps> = ({
  isOpen,
  onClose,
  grnId,
  grnNumber,
  supplierName,
}) => {
  const { theme } = useTheme();
  const { isViewingShop, viewingShop, user } = useAuth();
  const [reminders, setReminders] = useState<GRNReminder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  const effectiveShopId = isViewingShop && viewingShop?.id ? viewingShop.id : user?.shop?.id;

  useEffect(() => {
    if (isOpen && grnId) {
      loadReminders();
      setCurrentPage(1); // Reset to first page when modal opens
    }
  }, [isOpen, grnId, effectiveShopId]);

  const loadReminders = async () => {
    if (!grnId) return;
    
    setIsLoading(true);
    setError(null);
    try {
      console.log('🔍 Loading reminders for GRN:', grnId);
      
      const result = await grnReminderService.getByGRN(grnId, effectiveShopId);
      setReminders(result.reminders || []);
    } catch (err) {
      console.error('Failed to load GRN reminders:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to load reminder history';
      if (errorMessage.includes('Not Found') || errorMessage.includes('not found')) {
        setError('No reminder history available');
      } else {
        setError(errorMessage);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  };

  const getReminderTypeInfo = (type: string) => {
    if (type === 'OVERDUE') {
      return {
        icon: AlertTriangle,
        color: 'text-amber-500',
        bgColor: theme === 'dark' ? 'bg-amber-500/20' : 'bg-amber-100',
        label: 'Overdue Reminder',
      };
    }
    return {
      icon: CreditCard,
      color: 'text-teal-500',
      bgColor: theme === 'dark' ? 'bg-teal-500/20' : 'bg-teal-100',
      label: 'Payment Reminder',
    };
  };

  // Pagination calculations
  const totalPages = Math.ceil(reminders.length / itemsPerPage);
  const paginatedReminders = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return reminders.slice(startIndex, endIndex);
  }, [reminders, currentPage, itemsPerPage]);

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className={`max-w-2xl max-h-[85vh] overflow-hidden p-0 ${
        theme === 'dark' ? 'bg-slate-900 border-slate-700/50' : 'bg-white border-slate-200'
      }`}>
        <DialogHeader className="sr-only">
          <DialogTitle>GRN Reminder History</DialogTitle>
        </DialogHeader>

        {/* Header */}
        <div className="relative h-20 bg-gradient-to-r from-teal-600 via-emerald-600 to-green-600">
          <div className="absolute inset-0 flex items-center px-6">
            <div className="flex items-center gap-4 flex-1">
              <div className="w-12 h-12 bg-white/20 backdrop-blur rounded-xl flex items-center justify-center">
                <History className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">GRN Reminder History</h2>
                <p className="text-emerald-100 text-sm">
                  {grnNumber}{supplierName ? ` • ${supplierName}` : ''}
                </p>
              </div>
            </div>
            <button
              onClick={loadReminders}
              disabled={isLoading}
              className="p-2 bg-white/20 rounded-lg hover:bg-white/30 transition-colors"
            >
              <RefreshCw className={`w-5 h-5 text-white ${isLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(85vh-80px)]">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-12 gap-4">
              <RefreshCw className={`w-8 h-8 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'} animate-spin`} />
              <p className={`${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                Loading reminder history...
              </p>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-12 gap-4">
              <AlertTriangle className="w-12 h-12 text-red-500" />
              <p className="text-red-500 text-center">{error}</p>
              <button
                onClick={loadReminders}
                className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors"
              >
                Try Again
              </button>
            </div>
          ) : reminders.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 gap-4">
              <div className={`w-20 h-20 rounded-2xl flex items-center justify-center ${
                theme === 'dark' ? 'bg-slate-800' : 'bg-slate-100'
              }`}>
                <Package className={`w-10 h-10 ${theme === 'dark' ? 'text-slate-600' : 'text-slate-400'}`} />
              </div>
              <h3 className={`text-lg font-semibold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                No Reminders Sent Yet
              </h3>
              <p className={`text-center ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                When you send WhatsApp reminders for this GRN,<br />they will appear here.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Summary */}
              <div className={`flex items-center gap-4 p-4 rounded-xl ${
                theme === 'dark' ? 'bg-slate-800/50' : 'bg-slate-50'
              }`}>
                <div className="flex-1">
                  <p className={`font-medium ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                    Total Reminders Sent
                  </p>
                  <p className={`text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                    Last reminder: {formatDate(reminders[0]?.sentAt || '')}
                  </p>
                </div>
                <div className="text-3xl font-bold text-teal-500">
                  {reminders.length}
                </div>
              </div>

              {/* Reminder List */}
              <div className="space-y-3">
                {paginatedReminders.map((reminder, index) => {
                  const typeInfo = getReminderTypeInfo(reminder.type);
                  const TypeIcon = typeInfo.icon;
                  // Calculate global index for numbering
                  const globalIndex = (currentPage - 1) * itemsPerPage + index;

                  return (
                    <div 
                      key={reminder.id}
                      className={`rounded-xl border transition-all ${
                        theme === 'dark' 
                          ? 'bg-slate-800/50 border-slate-700/50 hover:bg-slate-800' 
                          : 'bg-white border-slate-200 hover:shadow-md'
                      }`}
                    >
                      <div className="p-4">
                        <div className="flex items-start gap-4">
                          {/* Type Icon */}
                          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${typeInfo.bgColor}`}>
                            <TypeIcon className={`w-5 h-5 ${typeInfo.color}`} />
                          </div>

                          {/* Content */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-1">
                              <span className={`font-medium ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                                {typeInfo.label}
                              </span>
                              <span className={`text-xs px-2 py-1 rounded-full ${
                                theme === 'dark' ? 'bg-teal-500/20 text-teal-400' : 'bg-teal-100 text-teal-700'
                              }`}>
                                #{reminders.length - globalIndex}
                              </span>
                            </div>

                            <div className="flex flex-wrap items-center gap-3 text-sm mb-2">
                              <span className={`flex items-center gap-1 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                                <Clock className="w-3.5 h-3.5" />
                                {formatDate(reminder.sentAt)}
                              </span>
                              {reminder.supplierPhone && (
                                <span className={`flex items-center gap-1 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                                  <Phone className="w-3.5 h-3.5" />
                                  {reminder.supplierPhone}
                                </span>
                              )}
                            </div>

                            {/* Message Preview */}
                            {reminder.message && (
                              <div className={`text-sm p-3 rounded-lg mt-2 ${
                                theme === 'dark' ? 'bg-slate-700/50' : 'bg-slate-50'
                              }`}>
                                <p className={`line-clamp-3 whitespace-pre-wrap ${
                                  theme === 'dark' ? 'text-slate-300' : 'text-slate-700'
                                }`}>
                                  {reminder.message}
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Pagination */}
              {reminders.length > itemsPerPage && (
                <div className={`flex items-center justify-between mt-6 pt-4 border-t ${
                  theme === 'dark' ? 'border-slate-700/50' : 'border-slate-200'
                }`}>
                  {/* Page Info */}
                  <p className={`text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                    Showing {((currentPage - 1) * itemsPerPage) + 1} - {Math.min(currentPage * itemsPerPage, reminders.length)} of {reminders.length}
                  </p>

                  {/* Pagination Controls */}
                  <div className="flex items-center gap-2">
                    {/* Previous Button */}
                    <button
                      onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                      disabled={currentPage === 1}
                      className={`p-2 rounded-lg transition-all ${
                        currentPage === 1
                          ? theme === 'dark'
                            ? 'text-slate-600 cursor-not-allowed'
                            : 'text-slate-300 cursor-not-allowed'
                          : theme === 'dark'
                            ? 'text-slate-400 hover:bg-slate-800 hover:text-white'
                            : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                      }`}
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>

                    {/* Page Numbers */}
                    <div className="flex items-center gap-1">
                      {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
                        // Show: first page, last page, current page, and pages around current
                        const showPage = 
                          page === 1 || 
                          page === totalPages || 
                          Math.abs(page - currentPage) <= 1;
                        
                        // Show ellipsis
                        const showEllipsisBefore = page === currentPage - 2 && currentPage > 3;
                        const showEllipsisAfter = page === currentPage + 2 && currentPage < totalPages - 2;

                        if (showEllipsisBefore || showEllipsisAfter) {
                          return (
                            <span
                              key={`ellipsis-${page}`}
                              className={`px-2 ${theme === 'dark' ? 'text-slate-600' : 'text-slate-400'}`}
                            >
                              ...
                            </span>
                          );
                        }

                        if (!showPage) return null;

                        return (
                          <button
                            key={page}
                            onClick={() => setCurrentPage(page)}
                            className={`min-w-[36px] h-9 px-3 rounded-lg text-sm font-medium transition-all ${
                              currentPage === page
                                ? 'bg-gradient-to-r from-teal-500 to-emerald-500 text-white shadow-lg'
                                : theme === 'dark'
                                  ? 'text-slate-400 hover:bg-slate-800 hover:text-white'
                                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                            }`}
                          >
                            {page}
                          </button>
                        );
                      })}
                    </div>

                    {/* Next Button */}
                    <button
                      onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                      disabled={currentPage === totalPages}
                      className={`p-2 rounded-lg transition-all ${
                        currentPage === totalPages
                          ? theme === 'dark'
                            ? 'text-slate-600 cursor-not-allowed'
                            : 'text-slate-300 cursor-not-allowed'
                          : theme === 'dark'
                            ? 'text-slate-400 hover:bg-slate-800 hover:text-white'
                            : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                      }`}
                    >
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className={`px-6 py-4 border-t ${
          theme === 'dark' ? 'border-slate-700/50 bg-slate-800/50' : 'border-slate-200 bg-slate-50'
        }`}>
          <button
            onClick={onClose}
            className={`w-full py-3 rounded-xl font-medium transition-all ${
              theme === 'dark'
                ? 'bg-slate-700 text-white hover:bg-slate-600'
                : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
            }`}
          >
            Close
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default GRNReminderHistoryModal;
