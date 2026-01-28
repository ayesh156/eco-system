import React, { useState, useEffect, useMemo } from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { reminderService, type InvoiceReminder } from '../../services/reminderService';
import { 
  MessageCircle, 
  Clock, 
  AlertTriangle, 
  CreditCard, 
  Phone,
  RefreshCw,
  History,
  FileText,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

interface ReminderHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoiceId?: string;
  invoiceNumber?: string;
  customerName?: string;
  customerId?: string;
  title?: string;
}

export const ReminderHistoryModal: React.FC<ReminderHistoryModalProps> = ({
  isOpen,
  onClose,
  invoiceId,
  invoiceNumber,
  customerName,
  customerId,
  title,
}) => {
  const { theme } = useTheme();
  const { isViewingShop, viewingShop, user } = useAuth();
  const [reminders, setReminders] = useState<InvoiceReminder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  const effectiveShopId = isViewingShop && viewingShop?.id ? viewingShop.id : user?.shop?.id;

  useEffect(() => {
    if (isOpen && (invoiceId || customerId)) {
      loadReminders();
      setCurrentPage(1); // Reset to first page when modal opens
    }
  }, [isOpen, invoiceId, customerId, effectiveShopId]);

  const loadReminders = async () => {
    setIsLoading(true);
    setError(null);
    try {
      console.log('🔍 Loading reminders for:', invoiceId ? `invoice ${invoiceId}` : `customer ${customerId}`);
      
      let data: InvoiceReminder[];
      if (invoiceId) {
        data = await reminderService.getByInvoice(invoiceId, effectiveShopId);
      } else if (customerId) {
        data = await reminderService.getByCustomer(customerId, effectiveShopId);
      } else {
        data = [];
      }
      
      setReminders(data);
    } catch (err) {
      console.error('Failed to load reminders:', err);
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

  const getModalTitle = () => {
    if (title) return title;
    if (invoiceNumber) return `${invoiceNumber}`;
    if (customerName) return `${customerName}`;
    return 'Reminder History';
  };

  const getSubtitle = () => {
    if (invoiceNumber && customerName) return customerName;
    if (customerId) return 'All invoices';
    return '';
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
      color: 'text-blue-500',
      bgColor: theme === 'dark' ? 'bg-blue-500/20' : 'bg-blue-100',
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
          <DialogTitle>Reminder History</DialogTitle>
        </DialogHeader>

        {/* Header */}
        <div className="relative h-20 bg-gradient-to-r from-green-600 via-emerald-600 to-teal-600">
          <div className="absolute inset-0 flex items-center px-6">
            <div className="flex items-center gap-4 flex-1">
              <div className="w-12 h-12 bg-white/20 backdrop-blur rounded-xl flex items-center justify-center">
                <History className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">Reminder History</h2>
                <p className="text-green-100 text-sm">
                  {getModalTitle()}{getSubtitle() ? ` • ${getSubtitle()}` : ''}
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
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                Try Again
              </button>
            </div>
          ) : reminders.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 gap-4">
              <div className={`w-20 h-20 rounded-2xl flex items-center justify-center ${
                theme === 'dark' ? 'bg-slate-800' : 'bg-slate-100'
              }`}>
                <MessageCircle className={`w-10 h-10 ${theme === 'dark' ? 'text-slate-600' : 'text-slate-400'}`} />
              </div>
              <h3 className={`text-lg font-semibold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                No Reminders Sent Yet
              </h3>
              <p className={`text-center ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                When you send WhatsApp reminders for this invoice,<br />they will appear here.
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
                <div className="text-3xl font-bold text-green-500">
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
                                theme === 'dark' ? 'bg-green-500/20 text-green-400' : 'bg-green-100 text-green-700'
                              }`}>
                                #{reminders.length - globalIndex}
                              </span>
                            </div>

                            <div className="flex flex-wrap items-center gap-3 text-sm mb-2">
                              <span className={`flex items-center gap-1 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                                <Clock className="w-3.5 h-3.5" />
                                {formatDate(reminder.sentAt)}
                              </span>
                              {reminder.customerPhone && (
                                <span className={`flex items-center gap-1 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                                  <Phone className="w-3.5 h-3.5" />
                                  {reminder.customerPhone}
                                </span>
                              )}
                              {/* Show invoice number when viewing customer reminders */}
                              {customerId && (reminder as any).invoice?.invoiceNumber && (
                                <span className={`flex items-center gap-1 px-2 py-0.5 rounded-md ${
                                  theme === 'dark' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-emerald-50 text-emerald-600'
                                }`}>
                                  <FileText className="w-3.5 h-3.5" />
                                  {(reminder as any).invoice.invoiceNumber}
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
                                ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-lg'
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

export default ReminderHistoryModal;
