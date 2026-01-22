import React, { useState, useRef, useEffect } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  X, Send, Sparkles, Trash2, Bot, User, 
  Loader2, AlertCircle, Settings, ChevronDown, Minimize2, Maximize2, Languages
} from 'lucide-react';
import { geminiService } from '../services/geminiService';
import type { ChatMessage } from '../services/geminiService';
// Import REAL system data for AI analysis - ALL SECTIONS
import { 
  mockProducts, 
  mockCustomers, 
  mockInvoices, 
  mockServices, 
  mockJobNotes, 
  mockSuppliers,
  mockWarrantyClaims,
  mockGRNs,
  mockCashTransactions,
  mockCashAccounts,
  mockSupplierPurchases
} from '../data/mockData';

type ResponseLanguage = 'auto' | 'english' | 'sinhala';

interface Message extends ChatMessage {
  id: string;
  isError?: boolean;
}

export const AIAssistant: React.FC = () => {
  const { theme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showApiKeyInput, setShowApiKeyInput] = useState(false);
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [hasApiKey, setHasApiKey] = useState(geminiService.hasApiKey());
  const [hasEnvKey, setHasEnvKey] = useState(geminiService.hasEnvApiKey());
  const [responseLanguage, setResponseLanguage] = useState<ResponseLanguage>('auto');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  // Hide on AI Chat page
  const isOnAIChatPage = location.pathname === '/ai-chat';

  // Check API key on mount
  useEffect(() => {
    setHasApiKey(geminiService.hasApiKey());
    setHasEnvKey(geminiService.hasEnvApiKey());
  }, []);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Always focus input when chat opens or becomes visible
  useEffect(() => {
    if (isOpen && !isMinimized && hasApiKey) {
      // Use a short delay to ensure the DOM is ready
      const timer = setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isOpen, isMinimized, hasApiKey]);

  // Re-focus input when messages change (after sending/receiving)
  useEffect(() => {
    if (isOpen && !isMinimized && hasApiKey && !isLoading) {
      inputRef.current?.focus();
    }
  }, [messages, isOpen, isMinimized, hasApiKey, isLoading]);

  // Add welcome message when first opened
  useEffect(() => {
    if (isOpen && messages.length === 0 && hasApiKey) {
      setMessages([{
        id: 'welcome',
        role: 'assistant',
        content: `Ayubowan! 🙏 Welcome to ECOTEC AI Assistant!

🔥 **Real-Time Data Access Enabled!**
I can analyze your **actual system data** including:
• 📦 Products, Stock & Inventory
• 👥 Customers & Credit Balances
• 📄 Invoices & Sales Data
• 🔧 Services & Job Notes
• 👔 Suppliers & Overdue Payments
• 📥 GRN (Goods Received Notes)
• 💰 Cash & Expenses
• 🛡️ Warranty Claims

**Try asking:**
• "Pending GRN monawada?"
• "Cash drawer balance keeya?"
• "Overdue suppliers kauda?"
• "Show me invoice 10260012"
• "Low stock products?"
• "Today expenses list denna"

ඕනෑම භාෂාවකින් (English, සිංහල, Singlish) ඔබට ප්‍රශ්න අහන්න පුළුවන්!

How can I help you today? 😊`,
        timestamp: new Date()
      }]);
    }
  }, [isOpen, hasApiKey]);

  const generateId = () => Math.random().toString(36).substring(2, 9);

  const handleSaveApiKey = () => {
    if (apiKeyInput.trim()) {
      geminiService.setApiKey(apiKeyInput.trim());
      setHasApiKey(true);
      setShowApiKeyInput(false);
      setApiKeyInput('');
    }
  };

  const handleRemoveApiKey = () => {
    // Don't allow removing if using env key
    if (hasEnvKey) return;
    
    geminiService.removeApiKey();
    setHasApiKey(false);
    setMessages([]);
    geminiService.clearHistory();
  };

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isLoading) return;

    const userMessage: Message = {
      id: generateId(),
      role: 'user',
      content: inputValue.trim(),
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);

    try {
      let response: string;
      
      // Check if user is asking about system data
      if (geminiService.isDataQuery(userMessage.content)) {
        // Prepare COMPLETE system data for AI analysis - ALL fields included
        const systemData = {
          products: mockProducts.map(p => ({
            id: p.id,
            name: p.name,
            category: p.category,
            brand: p.brand,
            price: p.price,
            sellingPrice: p.sellingPrice || p.price,
            costPrice: p.costPrice,
            stock: p.stock,
            serialNumber: p.serialNumber,
            barcode: p.barcode,
            description: p.description,
            warranty: p.warranty,
            lowStockThreshold: p.lowStockThreshold || 10,
            totalPurchased: p.totalPurchased,
            totalSold: p.totalSold,
            createdAt: p.createdAt
          })),
          customers: mockCustomers.map(c => ({
            id: c.id,
            name: c.name,
            email: c.email,
            phone: c.phone,
            address: c.address,
            totalSpent: c.totalSpent,
            totalOrders: c.totalOrders,
            lastPurchase: c.lastPurchase,
            creditBalance: c.creditBalance,
            creditLimit: c.creditLimit,
            creditDueDate: c.creditDueDate,
            creditStatus: c.creditStatus
          })),
          invoices: mockInvoices.map(inv => ({
            id: inv.id,
            invoiceNumber: inv.id,
            customerId: inv.customerId,
            customerName: inv.customerName,
            subtotal: inv.subtotal,
            tax: inv.tax,
            total: inv.total,
            status: inv.status,
            paidAmount: inv.paidAmount || 0,
            balanceDue: inv.total - (inv.paidAmount || 0),
            date: inv.date,
            dueDate: inv.dueDate,
            paymentMethod: inv.paymentMethod,
            salesChannel: inv.salesChannel,
            lastPaymentDate: inv.lastPaymentDate,
            items: inv.items?.map(item => ({
              productId: item.productId,
              productName: item.productName,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              total: item.total,
              warrantyDueDate: item.warrantyDueDate
            }))
          })),
          services: mockServices.map(s => ({
            id: s.id,
            name: s.name,
            category: s.category,
            description: s.description,
            basePrice: s.basePrice,
            minPrice: s.minPrice,
            maxPrice: s.maxPrice,
            priceType: s.priceType,
            estimatedDuration: s.estimatedDuration,
            status: s.status,
            isPopular: s.isPopular,
            warranty: s.warranty,
            totalCompleted: s.totalCompleted,
            totalRevenue: s.totalRevenue,
            lastPerformed: s.lastPerformed
          })),
          jobNotes: mockJobNotes.map(j => ({
            id: j.id,
            jobNumber: j.jobNumber,
            customerId: j.customerId,
            customerName: j.customerName,
            customerPhone: j.customerPhone,
            deviceType: j.deviceType,
            deviceBrand: j.deviceBrand,
            deviceModel: j.deviceModel,
            serialNumber: j.serialNumber,
            accessories: j.accessories,
            deviceCondition: j.deviceCondition,
            reportedIssue: j.reportedIssue,
            diagnosisNotes: j.diagnosisNotes,
            serviceRequired: j.serviceRequired,
            estimatedCost: j.estimatedCost,
            actualCost: j.actualCost,
            advancePayment: j.advancePayment,
            status: j.status,
            priority: j.priority,
            receivedDate: j.receivedDate,
            expectedCompletionDate: j.expectedCompletionDate,
            completedDate: j.completedDate,
            deliveredDate: j.deliveredDate,
            assignedTechnician: j.assignedTechnician,
            createdAt: j.createdAt
          })),
          suppliers: mockSuppliers.map(s => ({
            id: s.id,
            name: s.name,
            company: s.company,
            email: s.email,
            phone: s.phone,
            address: s.address,
            totalPurchases: s.totalPurchases,
            totalOrders: s.totalOrders,
            lastOrder: s.lastOrder,
            creditBalance: s.creditBalance,
            creditLimit: s.creditLimit,
            creditDueDate: s.creditDueDate,
            creditStatus: s.creditStatus,
            rating: s.rating,
            categories: s.categories
          })),
          warranties: mockWarrantyClaims.map(w => ({
            id: w.id,
            invoiceId: w.invoiceId,
            productId: w.productId,
            productName: w.productName,
            productSerialNumber: w.productSerialNumber,
            customerId: w.customerId,
            customerName: w.customerName,
            customerPhone: w.customerPhone,
            claimDate: w.claimDate,
            warrantyExpiryDate: w.warrantyExpiryDate,
            status: w.status,
            issueDescription: w.issueDescription,
            issueCategory: w.issueCategory,
            resolution: w.resolution,
            resolutionDate: w.resolutionDate,
            isReplacement: w.isReplacement,
            replacementProductName: w.replacementProductName,
            handledBy: w.handledBy
          })),
          // GRN - Goods Received Notes
          grns: mockGRNs.map(g => ({
            id: g.id,
            grnNumber: g.grnNumber,
            supplierId: g.supplierId,
            supplierName: g.supplierName,
            orderDate: g.orderDate,
            expectedDeliveryDate: g.expectedDeliveryDate,
            receivedDate: g.receivedDate,
            totalOrderedQuantity: g.totalOrderedQuantity,
            totalReceivedQuantity: g.totalReceivedQuantity,
            totalAcceptedQuantity: g.totalAcceptedQuantity,
            totalRejectedQuantity: g.totalRejectedQuantity,
            subtotal: g.subtotal,
            discountAmount: g.discountAmount,
            totalAmount: g.totalAmount,
            paymentStatus: g.paymentStatus,
            paidAmount: g.paidAmount,
            status: g.status,
            receivedBy: g.receivedBy,
            notes: g.notes,
            items: g.items?.map(item => ({
              productId: item.productId,
              productName: item.productName,
              category: item.category,
              orderedQuantity: item.orderedQuantity,
              receivedQuantity: item.receivedQuantity,
              acceptedQuantity: item.acceptedQuantity,
              rejectedQuantity: item.rejectedQuantity,
              unitPrice: item.unitPrice,
              totalAmount: item.totalAmount,
              status: item.status,
              rejectionReason: item.rejectionReason
            }))
          })),
          // Cash Management
          cashAccounts: mockCashAccounts.map(acc => ({
            id: acc.id,
            name: acc.name,
            type: acc.type,
            balance: acc.balance,
            description: acc.description,
            bankName: acc.bankName,
            accountNumber: acc.accountNumber,
            isActive: acc.isActive,
            createdAt: acc.createdAt
          })),
          cashTransactions: mockCashTransactions.map(txn => ({
            id: txn.id,
            transactionNumber: txn.transactionNumber,
            type: txn.type,
            accountType: txn.accountType,
            amount: txn.amount,
            name: txn.name,
            description: txn.description,
            category: txn.category,
            balanceBefore: txn.balanceBefore,
            balanceAfter: txn.balanceAfter,
            transactionDate: txn.transactionDate,
            referenceType: txn.referenceType
          })),
          // Supplier Purchases with Payment History
          supplierPurchases: mockSupplierPurchases.map(sp => ({
            id: sp.id,
            supplierId: sp.supplierId,
            supplierName: sp.supplierName,
            productName: sp.productName,
            category: sp.category,
            quantity: sp.quantity,
            unitPrice: sp.unitPrice,
            totalAmount: sp.totalAmount,
            paidAmount: sp.paidAmount,
            paymentPercentage: sp.paymentPercentage,
            paymentStatus: sp.paymentStatus,
            purchaseDate: sp.purchaseDate,
            lastPaymentDate: sp.lastPaymentDate,
            soldQuantity: sp.soldQuantity,
            inStock: sp.inStock,
            notes: sp.notes,
            // All payments made for this purchase
            payments: sp.payments?.map(p => ({
              id: p.id,
              amount: p.amount,
              paymentDate: p.paymentDate,
              paymentMethod: p.paymentMethod,
              notes: p.notes
            }))
          }))
        };
        
        // Use data analysis for system queries
        response = await geminiService.analyzeSystemData(userMessage.content, systemData, responseLanguage);
      } else {
        // Use regular chat for non-data queries
        response = await geminiService.sendMessage(userMessage.content, responseLanguage);
      }
      
      const assistantMessage: Message = {
        id: generateId(),
        role: 'assistant',
        content: response,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      const errorMessage: Message = {
        id: generateId(),
        role: 'assistant',
        content: error instanceof Error ? error.message : 'An error occurred. Please try again.',
        timestamp: new Date(),
        isError: true
      };

      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleClearChat = () => {
    setMessages([]);
    geminiService.clearHistory();
    // Re-add welcome message
    setMessages([{
      id: 'welcome',
      role: 'assistant',
      content: `Chat cleared! 🔄

How can I help you today? 😊`,
      timestamp: new Date()
    }]);
  };

  // World-class message formatter with proper markdown rendering
  const formatMessage = (content: string) => {
    // Process the content line by line with proper formatting
    const lines = content.split('\n');
    const elements: React.ReactNode[] = [];
    let listItems: React.ReactNode[] = [];
    let inList = false;
    let listType: 'ul' | 'ol' = 'ul';

    const processInlineFormatting = (text: string): string => {
      // Bold: **text** or __text__
      let result = text.replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold">$1</strong>');
      result = result.replace(/__(.*?)__/g, '<strong class="font-semibold">$1</strong>');
      // Italic: *text* or _text_
      result = result.replace(/\*([^*]+)\*/g, '<em>$1</em>');
      result = result.replace(/_([^_]+)_/g, '<em>$1</em>');
      // Code: `text`
      result = result.replace(/`([^`]+)`/g, '<code class="px-1.5 py-0.5 rounded bg-slate-700/50 text-emerald-400 text-xs font-mono">$1</code>');
      // Arrows and special formatting
      result = result.replace(/→/g, '<span class="text-emerald-400">→</span>');
      result = result.replace(/➔/g, '<span class="text-emerald-400">➔</span>');
      result = result.replace(/✅/g, '<span class="text-green-400">✅</span>');
      result = result.replace(/❌/g, '<span class="text-red-400">❌</span>');
      result = result.replace(/⚠️/g, '<span class="text-amber-400">⚠️</span>');
      // Currency formatting highlight
      result = result.replace(/(Rs\.\s?[\d,]+(?:\.\d{2})?)/g, '<span class="text-emerald-400 font-medium">$1</span>');
      return result;
    };

    const flushList = () => {
      if (listItems.length > 0) {
        if (listType === 'ol') {
          elements.push(
            <ol key={`list-${elements.length}`} className="list-decimal list-inside space-y-1 my-2 ml-2">
              {listItems}
            </ol>
          );
        } else {
          elements.push(
            <ul key={`list-${elements.length}`} className="space-y-1 my-2">
              {listItems}
            </ul>
          );
        }
        listItems = [];
        inList = false;
      }
    };

    lines.forEach((line, index) => {
      const trimmedLine = line.trim();

      // Empty line
      if (trimmedLine === '') {
        flushList();
        elements.push(<div key={`empty-${index}`} className="h-2" />);
        return;
      }

      // Horizontal rule (━━━ or --- or ___)
      if (/^[━─\-_]{3,}$/.test(trimmedLine)) {
        flushList();
        elements.push(
          <hr key={`hr-${index}`} className="my-2 border-t border-slate-600/50" />
        );
        return;
      }

      // Headers with emojis (like 🔍 **INVOICE #10260011**)
      if (/^[🔍📦📄👤💰🛒📋🔧👔🛡️💳📊📅✅⏳⚠️🎯💡🔥✨🚀📈📉🏷️🆔🏢]/.test(trimmedLine)) {
        flushList();
        const processed = processInlineFormatting(trimmedLine);
        elements.push(
          <div 
            key={`header-${index}`} 
            className="font-semibold text-sm py-1"
            dangerouslySetInnerHTML={{ __html: processed }} 
          />
        );
        return;
      }

      // Bullet points (• or - or *)
      if (/^[•\-\*]\s/.test(trimmedLine)) {
        if (!inList || listType !== 'ul') {
          flushList();
          inList = true;
          listType = 'ul';
        }
        const content = trimmedLine.replace(/^[•\-\*]\s/, '');
        const processed = processInlineFormatting(content);
        listItems.push(
          <li 
            key={`li-${index}`} 
            className="flex items-start gap-2 text-sm"
          >
            <span className="text-emerald-400 mt-0.5">•</span>
            <span dangerouslySetInnerHTML={{ __html: processed }} />
          </li>
        );
        return;
      }

      // Numbered lists
      if (/^\d+\.\s/.test(trimmedLine)) {
        if (!inList || listType !== 'ol') {
          flushList();
          inList = true;
          listType = 'ol';
        }
        const content = trimmedLine.replace(/^\d+\.\s/, '');
        const processed = processInlineFormatting(content);
        listItems.push(
          <li 
            key={`li-${index}`} 
            className="text-sm ml-4"
            dangerouslySetInnerHTML={{ __html: processed }}
          />
        );
        return;
      }

      // Arrow lines (→ or ➔ at start - sub-items)
      if (/^[→➔]\s/.test(trimmedLine)) {
        const content = trimmedLine.replace(/^[→➔]\s/, '');
        const processed = processInlineFormatting(content);
        // Add to current list if in one, otherwise as standalone
        if (inList) {
          listItems.push(
            <li 
              key={`arrow-${index}`} 
              className="flex items-start gap-2 text-sm ml-4 text-slate-300"
            >
              <span className="text-emerald-400">→</span>
              <span dangerouslySetInnerHTML={{ __html: processed }} />
            </li>
          );
        } else {
          elements.push(
            <div 
              key={`arrow-${index}`} 
              className="flex items-start gap-2 text-sm ml-4 text-slate-300"
            >
              <span className="text-emerald-400">→</span>
              <span dangerouslySetInnerHTML={{ __html: processed }} />
            </div>
          );
        }
        return;
      }

      // Regular paragraph
      flushList();
      const processed = processInlineFormatting(trimmedLine);
      elements.push(
        <p 
          key={`p-${index}`} 
          className="text-sm leading-relaxed"
          dangerouslySetInnerHTML={{ __html: processed }} 
        />
      );
    });

    // Flush any remaining list items
    flushList();

    return <div className="space-y-1">{elements}</div>;
  };

  // Hide completely on AI Chat page
  if (isOnAIChatPage) {
    return null;
  }

  // Floating button when chat is closed
  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-50 group"
        aria-label="Open AI Assistant"
      >
        <div className="relative">
          {/* Animated glow effect */}
          <div className="absolute inset-0 bg-gradient-to-r from-emerald-500 to-blue-500 rounded-full blur-lg opacity-50 group-hover:opacity-75 animate-pulse" />
          
          {/* Button */}
          <div className="relative flex items-center justify-center w-14 h-14 bg-gradient-to-r from-emerald-500 to-blue-600 rounded-full shadow-2xl hover:shadow-emerald-500/50 transition-all duration-300 hover:scale-110">
            <Sparkles className="w-6 h-6 text-white" />
          </div>

          {/* Notification badge */}
          <div className="absolute -top-1 -right-1 w-5 h-5 bg-gradient-to-r from-pink-500 to-rose-500 rounded-full flex items-center justify-center shadow-lg">
            <span className="text-[10px] font-bold text-white">AI</span>
          </div>
        </div>

        {/* Tooltip */}
        <div className={`absolute bottom-full right-0 mb-2 px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity ${
          theme === 'dark' 
            ? 'bg-slate-800 text-white' 
            : 'bg-white text-slate-900 shadow-lg'
        }`}>
          ECOTEC AI Assistant
        </div>
      </button>
    );
  }

  // Chat window
  return (
    <div 
      className={`fixed z-50 transition-all duration-300 ease-out ${
        isMinimized 
          ? 'bottom-4 right-4 w-64 sm:w-72' 
          : 'bottom-0 right-0 sm:bottom-4 sm:right-4 w-full sm:w-[420px] h-[100dvh] sm:h-[85vh] sm:max-h-[720px] sm:rounded-2xl'
      }`}
    >
      <div className={`h-full flex flex-col shadow-2xl border overflow-hidden ${
        isMinimized ? 'rounded-2xl' : 'sm:rounded-2xl'
      } ${
        theme === 'dark' 
          ? 'bg-slate-900 border-slate-700/50' 
          : 'bg-white border-slate-200'
      }`}>
        {/* Compact Header */}
        <div className="relative overflow-hidden flex-shrink-0">
          <div className="absolute inset-0 bg-gradient-to-r from-emerald-500 to-blue-600" />
          
          <div className="relative flex items-center justify-between px-3 py-2">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-white/20 backdrop-blur-sm flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-white" />
              </div>
              <div>
                <h3 className="text-white font-semibold text-sm">ECOTEC AI</h3>
                <p className="text-emerald-100 text-[10px]">Ask anything</p>
              </div>
            </div>

            <div className="flex items-center">
              {hasApiKey && (
                <>
                  <button
                    onClick={handleClearChat}
                    className="p-1.5 rounded-lg hover:bg-white/20 transition-colors"
                    title="Clear chat"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-white/80" />
                  </button>
                  {!hasEnvKey && (
                    <button
                      onClick={() => setShowApiKeyInput(!showApiKeyInput)}
                      className="p-1.5 rounded-lg hover:bg-white/20 transition-colors"
                      title="API Settings"
                    >
                      <Settings className="w-3.5 h-3.5 text-white/80" />
                    </button>
                  )}
                  <button
                    onClick={() => {
                      setIsOpen(false);
                      navigate('/ai-chat');
                    }}
                    className="p-1.5 rounded-lg hover:bg-white/20 transition-colors"
                    title="Open full screen"
                  >
                    <Maximize2 className="w-3.5 h-3.5 text-white/80" />
                  </button>
                </>
              )}
              <button
                onClick={() => setIsMinimized(!isMinimized)}
                className="p-1.5 rounded-lg hover:bg-white/20 transition-colors"
                title={isMinimized ? 'Expand' : 'Minimize'}
              >
                {isMinimized ? (
                  <ChevronDown className="w-3.5 h-3.5 text-white/80 rotate-180" />
                ) : (
                  <Minimize2 className="w-3.5 h-3.5 text-white/80" />
                )}
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 rounded-lg hover:bg-white/20 transition-colors"
                title="Close"
              >
                <X className="w-3.5 h-3.5 text-white/80" />
              </button>
            </div>
          </div>

          {/* API Key Settings Dropdown */}
          {showApiKeyInput && hasApiKey && (
            <div className={`relative px-3 py-2 border-t ${
              theme === 'dark' ? 'bg-slate-800/50 border-white/10' : 'bg-white/10 border-white/20'
            }`}>
              <button
                onClick={handleRemoveApiKey}
                className="w-full px-3 py-1.5 rounded-lg bg-red-500/20 text-red-100 hover:bg-red-500/30 text-xs transition-colors"
              >
                Remove API Key
              </button>
            </div>
          )}
        </div>

        {/* Content */}
        {!isMinimized && (
          <>
            {/* API Key Setup */}
            {!hasApiKey ? (
              <div className="flex-1 flex flex-col items-center justify-center p-4 text-center">
                <div className={`w-14 h-14 rounded-xl mb-3 flex items-center justify-center ${
                  theme === 'dark' ? 'bg-slate-800' : 'bg-slate-100'
                }`}>
                  <Bot className={`w-7 h-7 ${theme === 'dark' ? 'text-emerald-400' : 'text-emerald-600'}`} />
                </div>
                
                <h3 className={`text-base font-semibold mb-1 ${
                  theme === 'dark' ? 'text-white' : 'text-slate-900'
                }`}>
                  Setup AI Assistant
                </h3>
                
                <p className={`text-xs mb-4 ${
                  theme === 'dark' ? 'text-slate-400' : 'text-slate-600'
                }`}>
                  Enter your Gemini API key from{' '}
                  <a 
                    href="https://makersuite.google.com/app/apikey" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-emerald-500 hover:underline"
                  >
                    Google AI Studio
                  </a>
                </p>

                <div className="w-full space-y-2">
                  <input
                    type="password"
                    value={apiKeyInput}
                    onChange={(e) => setApiKeyInput(e.target.value)}
                    placeholder="Enter your Gemini API key"
                    className={`w-full px-3 py-2.5 rounded-xl border text-sm ${
                      theme === 'dark'
                        ? 'bg-slate-800 border-slate-700 text-white placeholder-slate-500'
                        : 'bg-white border-slate-200 text-slate-900 placeholder-slate-400'
                    } focus:outline-none focus:ring-2 focus:ring-emerald-500/50`}
                  />
                  <button
                    onClick={handleSaveApiKey}
                    disabled={!apiKeyInput.trim()}
                    className="w-full px-4 py-2.5 bg-gradient-to-r from-emerald-500 to-blue-600 text-white rounded-xl font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-lg hover:shadow-emerald-500/25 transition-all"
                  >
                    Connect AI
                  </button>
                </div>

                <p className={`text-xs mt-4 ${
                  theme === 'dark' ? 'text-slate-500' : 'text-slate-400'
                }`}>
                  🔒 Your API key is stored locally and never sent to our servers
                </p>
              </div>
            ) : (
              <>
                {/* Messages */}
                <div 
                  ref={chatContainerRef}
                  className={`flex-1 overflow-y-auto p-4 space-y-4 ${
                    theme === 'dark' ? 'bg-slate-900/50' : 'bg-slate-50/50'
                  }`}
                >
                  {messages.map((message) => (
                    <div
                      key={message.id}
                      className={`flex gap-3 ${
                        message.role === 'user' ? 'flex-row-reverse' : 'flex-row'
                      }`}
                    >
                      {/* Avatar */}
                      <div className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center ${
                        message.role === 'user'
                          ? 'bg-gradient-to-br from-blue-500 to-purple-600'
                          : message.isError
                          ? 'bg-gradient-to-br from-red-500 to-rose-600'
                          : 'bg-gradient-to-br from-emerald-500 to-teal-600'
                      }`}>
                        {message.role === 'user' ? (
                          <User className="w-4 h-4 text-white" />
                        ) : message.isError ? (
                          <AlertCircle className="w-4 h-4 text-white" />
                        ) : (
                          <Bot className="w-4 h-4 text-white" />
                        )}
                      </div>

                      {/* Message bubble */}
                      <div className={`rounded-2xl px-4 py-3 overflow-hidden ${
                        message.role === 'user'
                          ? `max-w-[80%] ${theme === 'dark'
                            ? 'bg-blue-600 text-white'
                            : 'bg-blue-500 text-white'}`
                          : message.isError
                          ? `max-w-[85%] ${theme === 'dark'
                            ? 'bg-red-900/50 text-red-200 border border-red-700/50'
                            : 'bg-red-50 text-red-700 border border-red-200'}`
                          : `max-w-[90%] ${theme === 'dark'
                          ? 'bg-slate-800/80 text-slate-100 border border-slate-700/50'
                          : 'bg-white text-slate-800 shadow-sm border border-slate-200'}`
                      }`}>
                        <div className="text-sm leading-relaxed overflow-x-auto">
                          {formatMessage(message.content)}
                        </div>
                        <p className={`text-[10px] mt-2 ${
                          message.role === 'user'
                            ? 'text-blue-200'
                            : message.isError
                            ? theme === 'dark' ? 'text-red-400' : 'text-red-400'
                            : theme === 'dark' ? 'text-slate-500' : 'text-slate-400'
                        }`}>
                          {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>
                  ))}

                  {/* Loading indicator */}
                  {isLoading && (
                    <div className="flex gap-2">
                      <div className="flex-shrink-0 w-7 h-7 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
                        <Bot className="w-3.5 h-3.5 text-white" />
                      </div>
                      <div className={`rounded-xl px-3 py-2 ${
                        theme === 'dark' ? 'bg-slate-800' : 'bg-white shadow-sm'
                      }`}>
                        <div className="flex items-center gap-2">
                          <Loader2 className={`w-3.5 h-3.5 animate-spin ${
                            theme === 'dark' ? 'text-emerald-400' : 'text-emerald-600'
                          }`} />
                          <span className={`text-xs ${
                            theme === 'dark' ? 'text-slate-400' : 'text-slate-500'
                          }`}>
                            Thinking...
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  <div ref={messagesEndRef} />
                </div>

                {/* Compact Input Area */}
                <div className={`p-2 sm:p-3 border-t flex-shrink-0 ${
                  theme === 'dark' ? 'border-slate-800 bg-slate-900/80' : 'border-slate-200 bg-white'
                }`}>
                  {/* Language Selector */}
                  <div className="flex items-center gap-1 mb-1.5">
                    <Languages className={`w-3 h-3 ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`} />
                    <div className={`flex rounded-md p-0.5 ${theme === 'dark' ? 'bg-slate-800/80' : 'bg-slate-100'}`}>
                      <button
                        onClick={() => setResponseLanguage('auto')}
                        className={`px-1.5 py-0.5 rounded text-[9px] font-medium transition-all ${
                          responseLanguage === 'auto'
                            ? 'bg-gradient-to-r from-emerald-500 to-cyan-500 text-white'
                            : theme === 'dark' 
                              ? 'text-slate-400 hover:text-white' 
                              : 'text-slate-500 hover:text-slate-900'
                        }`}
                      >
                        Auto
                      </button>
                      <button
                        onClick={() => setResponseLanguage('english')}
                        className={`px-1.5 py-0.5 rounded text-[9px] font-medium transition-all ${
                          responseLanguage === 'english'
                            ? 'bg-gradient-to-r from-blue-500 to-indigo-500 text-white'
                            : theme === 'dark' 
                              ? 'text-slate-400 hover:text-white' 
                              : 'text-slate-500 hover:text-slate-900'
                        }`}
                      >
                        En
                      </button>
                      <button
                        onClick={() => setResponseLanguage('sinhala')}
                        className={`px-1.5 py-0.5 rounded text-[9px] font-medium transition-all ${
                          responseLanguage === 'sinhala'
                            ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white'
                            : theme === 'dark' 
                              ? 'text-slate-400 hover:text-white' 
                              : 'text-slate-500 hover:text-slate-900'
                        }`}
                      >
                        සිං
                      </button>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <input
                      ref={inputRef}
                      type="text"
                      value={inputValue}
                      onChange={(e) => setInputValue(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder="Message... (En/සිං/Sing)"
                      disabled={isLoading}
                      className={`flex-1 px-3 py-2 rounded-xl border text-sm ${
                        theme === 'dark'
                          ? 'bg-slate-800 border-slate-700 text-white placeholder-slate-500'
                          : 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400'
                      } focus:outline-none focus:ring-2 focus:ring-emerald-500/50 disabled:opacity-50`}
                    />
                    <button
                      onClick={handleSendMessage}
                      disabled={!inputValue.trim() || isLoading}
                      className="relative group w-9 h-9 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 rounded-xl overflow-hidden"
                    >
                      {/* Radiant glow effect */}
                      <div className="absolute inset-0 bg-gradient-to-br from-emerald-400 via-cyan-500 to-blue-600 rounded-xl opacity-80 group-hover:opacity-100 transition-opacity" />
                      <div className="absolute inset-0 bg-gradient-to-br from-emerald-400 via-cyan-500 to-blue-600 rounded-xl blur-md opacity-40 group-hover:opacity-60 transition-all" />
                      <div className="absolute inset-[2px] bg-gradient-to-br from-emerald-500 to-blue-600 rounded-[9px]" />
                      <Send className="relative w-3.5 h-3.5 text-white transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                    </button>
                  </div>
                </div>
              </>
            )}
          </>
        )}

        {/* Minimized view - Creative compact design */}
        {isMinimized && (
          <button 
            onClick={() => setIsMinimized(false)}
            className="w-full px-3 py-2 flex items-center gap-2 hover:bg-white/5 transition-colors cursor-pointer"
          >
            <div className="relative">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-emerald-500/20 to-blue-500/20 flex items-center justify-center">
                <Bot className={`w-3.5 h-3.5 ${theme === 'dark' ? 'text-emerald-400' : 'text-emerald-600'}`} />
              </div>
              <div className="absolute -bottom-0.5 -right-0.5 w-2 h-2 bg-emerald-500 rounded-full border border-slate-900 animate-pulse" />
            </div>
            <div className="flex-1 text-left">
              <p className={`text-xs font-medium ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                AI Ready
              </p>
              <p className={`text-[10px] ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>
                Tap to chat
              </p>
            </div>
            <ChevronDown className={`w-3.5 h-3.5 rotate-180 ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`} />
          </button>
        )}
      </div>
    </div>
  );
};
