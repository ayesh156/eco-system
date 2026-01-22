import React, { useState, useCallback } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { geminiService } from '../services/geminiService';
import {
  mockInvoices,
  mockProducts,
  mockCustomers,
  mockSuppliers,
  mockGRNs,
  mockJobNotes,
  mockCashTransactions,
  mockWarrantyClaims,
} from '../data/mockData';
import {
  Sparkles,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  RefreshCw,
  Brain,
  Target,
  Lightbulb,
  BarChart3,
  DollarSign,
  ShoppingCart,
  Package,
  ChevronDown,
  ChevronUp,
  Zap,
  Clock,
  Languages,
} from 'lucide-react';

type LanguageOption = 'english' | 'sinhala' | 'singlish';

interface LanguageConfig {
  id: LanguageOption;
  label: string;
  nativeLabel: string;
  flag: string;
}

const LANGUAGES: LanguageConfig[] = [
  { id: 'english', label: 'English', nativeLabel: 'English', flag: '🇬🇧' },
  { id: 'sinhala', label: 'Sinhala', nativeLabel: 'සිංහල', flag: '🇱🇰' },
  { id: 'singlish', label: 'Singlish', nativeLabel: 'Singlish', flag: '🌐' },
];

interface AnalysisSection {
  title: string;
  icon: React.ReactNode;
  content: string;
  type: 'positive' | 'negative' | 'neutral' | 'warning';
}

interface MonthlyMetrics {
  totalRevenue: number;
  totalOrders: number;
  paidInvoices: number;
  unpaidAmount: number;
  newCustomers: number;
  topSellingProducts: { name: string; quantity: number; revenue: number }[];
  lowStockItems: { name: string; stock: number }[];
  pendingGRNs: number;
  activeJobs: number;
  completedJobs: number;
  totalExpenses: number;
  cashInflow: number;
  supplierPayablesDue: number;
  warrantyClaims: number;
  avgOrderValue: number;
  profitMargin: number;
}

export const AIMonthlyAnalysis: React.FC = () => {
  const { theme } = useTheme();
  const [isLoading, setIsLoading] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [analysis, setAnalysis] = useState<string>('');
  const [parsedSections, setParsedSections] = useState<AnalysisSection[]>([]);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [error, setError] = useState<string>('');
  const [metrics, setMetrics] = useState<MonthlyMetrics | null>(null);
  const [selectedLanguage, setSelectedLanguage] = useState<LanguageOption>('english');
  const [isLanguageDropdownOpen, setIsLanguageDropdownOpen] = useState(false);

  // Calculate metrics from mock data
  const calculateMetrics = useCallback((): MonthlyMetrics => {
    // Filter invoices for current month (January 2026)
    const monthInvoices = mockInvoices.filter(inv => {
      const invDate = new Date(inv.date);
      return invDate.getMonth() === 0 && invDate.getFullYear() === 2026; // January 2026
    });

    const totalRevenue = monthInvoices.reduce((sum, inv) => sum + (inv.paidAmount || 0), 0);
    const totalOrders = monthInvoices.length;
    const paidInvoices = monthInvoices.filter(inv => inv.status === 'fullpaid').length;
    const unpaidAmount = monthInvoices.reduce((sum, inv) => sum + (inv.total - (inv.paidAmount || 0)), 0);

    // Calculate new customers (simplified - customers with recent last purchase)
    const newCustomers = mockCustomers.filter(c => {
      if (!c.lastPurchase) return false;
      const purchaseDate = new Date(c.lastPurchase);
      return purchaseDate.getMonth() === 0 && purchaseDate.getFullYear() === 2026;
    }).length;

    // Top selling products (from invoice items)
    const productSales: Record<string, { name: string; quantity: number; revenue: number }> = {};
    monthInvoices.forEach(inv => {
      inv.items.forEach(item => {
        if (!productSales[item.productId]) {
          productSales[item.productId] = { name: item.productName, quantity: 0, revenue: 0 };
        }
        productSales[item.productId].quantity += item.quantity;
        productSales[item.productId].revenue += item.total;
      });
    });
    const topSellingProducts = Object.values(productSales)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);

    // Low stock items
    const lowStockItems = mockProducts
      .filter(p => p.stock < (p.lowStockThreshold || 10))
      .map(p => ({ name: p.name, stock: p.stock }))
      .slice(0, 5);

    // GRN & Jobs
    const pendingGRNs = mockGRNs.filter(grn => grn.status === 'pending' || grn.status === 'inspecting').length;
    const activeJobs = mockJobNotes.filter(job => !['completed', 'delivered', 'cancelled'].includes(job.status)).length;
    const completedJobs = mockJobNotes.filter(job => job.status === 'completed' || job.status === 'delivered').length;

    // Cash transactions
    const monthTransactions = mockCashTransactions.filter(txn => {
      const txnDate = new Date(txn.transactionDate);
      return txnDate.getMonth() === 0 && txnDate.getFullYear() === 2026;
    });
    const totalExpenses = monthTransactions
      .filter(txn => txn.type === 'expense')
      .reduce((sum, txn) => sum + txn.amount, 0);
    const cashInflow = monthTransactions
      .filter(txn => txn.type === 'income')
      .reduce((sum, txn) => sum + txn.amount, 0);

    // Supplier payables
    const supplierPayablesDue = mockSuppliers
      .filter(s => s.creditStatus === 'overdue' || s.creditStatus === 'active')
      .reduce((sum, s) => sum + s.creditBalance, 0);

    // Warranty claims
    const warrantyClaims = mockWarrantyClaims.filter(wc => {
      const claimDate = new Date(wc.claimDate);
      return claimDate.getMonth() === 0 && claimDate.getFullYear() === 2026;
    }).length;

    const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;
    
    // Simplified profit margin calculation
    const estimatedCost = totalRevenue * 0.75; // Assuming 25% margin
    const profitMargin = totalRevenue > 0 ? ((totalRevenue - estimatedCost) / totalRevenue) * 100 : 0;

    return {
      totalRevenue,
      totalOrders,
      paidInvoices,
      unpaidAmount,
      newCustomers,
      topSellingProducts,
      lowStockItems,
      pendingGRNs,
      activeJobs,
      completedJobs,
      totalExpenses,
      cashInflow,
      supplierPayablesDue,
      warrantyClaims,
      avgOrderValue,
      profitMargin,
    };
  }, []);

  // Generate AI Analysis
  const generateAnalysis = async () => {
    // Debug: Check API key status
    const apiKey = geminiService.getApiKey();
    console.log('API Key Status:', {
      hasKey: !!apiKey,
      keyLength: apiKey?.length || 0,
      keyPrefix: apiKey?.substring(0, 10) + '...',
    });
    
    if (!geminiService.hasApiKey()) {
      setError('Please configure your Gemini API key in Settings to use AI analysis.');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const calculatedMetrics = calculateMetrics();
      setMetrics(calculatedMetrics);

      // Language-specific instructions
      const languageInstructions: Record<LanguageOption, string> = {
        english: 'Respond ONLY in English. Use clear, professional English language.',
        sinhala: 'Respond ONLY in Sinhala (සිංහල) using proper Sinhala Unicode script. Do NOT use English or transliterated text. Write everything in සිංහල.',
        singlish: 'Respond in Singlish (Sinhala words written in English letters mixed with English). Example: "Revenue eka hondai, Rs. 6.9 million wage tiyenawa". Use casual, friendly Sri Lankan style.',
      };

      const prompt = `You are a world-class business analyst for ECOTEC Computer Shop in Sri Lanka. Analyze the following January 2026 business metrics and provide actionable insights.

MONTHLY BUSINESS METRICS (January 2026):
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 SALES PERFORMANCE:
- Total Revenue Collected: Rs. ${calculatedMetrics.totalRevenue.toLocaleString()}
- Total Orders: ${calculatedMetrics.totalOrders}
- Paid Invoices: ${calculatedMetrics.paidInvoices}
- Unpaid Amount: Rs. ${calculatedMetrics.unpaidAmount.toLocaleString()}
- Average Order Value: Rs. ${Math.round(calculatedMetrics.avgOrderValue).toLocaleString()}
- Estimated Profit Margin: ${calculatedMetrics.profitMargin.toFixed(1)}%

👥 CUSTOMERS:
- Active Customers This Month: ${calculatedMetrics.newCustomers}
- Total Customer Base: ${mockCustomers.length}

📦 INVENTORY:
- Low Stock Items: ${calculatedMetrics.lowStockItems.length}
${calculatedMetrics.lowStockItems.map(item => `  • ${item.name}: ${item.stock} units`).join('\n')}

🏆 TOP SELLING PRODUCTS:
${calculatedMetrics.topSellingProducts.map((p, i) => `  ${i + 1}. ${p.name} - ${p.quantity} units (Rs. ${p.revenue.toLocaleString()})`).join('\n')}

🔧 SERVICE DEPARTMENT:
- Active Repair Jobs: ${calculatedMetrics.activeJobs}
- Completed Jobs: ${calculatedMetrics.completedJobs}
- Warranty Claims: ${calculatedMetrics.warrantyClaims}

💰 CASH FLOW:
- Cash Inflow: Rs. ${calculatedMetrics.cashInflow.toLocaleString()}
- Total Expenses: Rs. ${calculatedMetrics.totalExpenses.toLocaleString()}
- Supplier Payables Due: Rs. ${calculatedMetrics.supplierPayablesDue.toLocaleString()}

📥 PROCUREMENT:
- Pending GRNs: ${calculatedMetrics.pendingGRNs}

Please provide a comprehensive yet concise analysis with:
1. 📈 SALES INSIGHTS: Key observations about revenue and sales trends
2. ⚠️ ALERTS & CONCERNS: Critical issues that need immediate attention  
3. ✅ POSITIVE HIGHLIGHTS: Things going well
4. 💡 RECOMMENDATIONS: 3-5 actionable recommendations to improve business
5. 🎯 FOCUS AREAS: Top 3 priorities for next week

Format your response in clear sections with emojis. Be specific with numbers and percentages. Keep the language professional but friendly.

IMPORTANT LANGUAGE INSTRUCTION: ${languageInstructions[selectedLanguage]}`;

      const response = await geminiService.sendMessage(prompt, selectedLanguage);
      setAnalysis(response);
      parseAnalysisSections(response);
      setLastUpdated(new Date());
      setIsExpanded(true);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to generate analysis. Please try again.';
      console.error('AI Analysis Error:', err);
      
      // Provide more helpful error message for common issues
      if (errorMessage.includes('403') || errorMessage.includes('Forbidden')) {
        setError('API key is invalid or expired. Please get a new key from https://aistudio.google.com/app/apikey');
      } else if (errorMessage.includes('401')) {
        setError('API key authentication failed. Please check your API key.');
      } else {
        setError(errorMessage);
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Parse analysis into sections for better UI display
  const parseAnalysisSections = (text: string) => {
    const sections: AnalysisSection[] = [];
    
    // Simple parsing based on common section headers
    const patterns = [
      { regex: /📈\s*SALES INSIGHTS?:?/i, title: 'Sales Insights', icon: <TrendingUp className="w-5 h-5" />, type: 'neutral' as const },
      { regex: /⚠️\s*ALERTS?.*CONCERNS?:?/i, title: 'Alerts & Concerns', icon: <AlertTriangle className="w-5 h-5" />, type: 'warning' as const },
      { regex: /✅\s*POSITIVE.*HIGHLIGHTS?:?/i, title: 'Positive Highlights', icon: <CheckCircle className="w-5 h-5" />, type: 'positive' as const },
      { regex: /💡\s*RECOMMENDATIONS?:?/i, title: 'Recommendations', icon: <Lightbulb className="w-5 h-5" />, type: 'neutral' as const },
      { regex: /🎯\s*FOCUS\s*AREAS?:?/i, title: 'Focus Areas', icon: <Target className="w-5 h-5" />, type: 'neutral' as const },
    ];

    const sectionTexts = text.split(/(?=📈|⚠️|✅|💡|🎯)/);
    
    sectionTexts.forEach(sectionText => {
      const trimmed = sectionText.trim();
      if (!trimmed) return;

      for (const pattern of patterns) {
        if (pattern.regex.test(trimmed)) {
          sections.push({
            title: pattern.title,
            icon: pattern.icon,
            content: trimmed.replace(pattern.regex, '').trim(),
            type: pattern.type,
          });
          break;
        }
      }
    });

    setParsedSections(sections);
  };

  // Format currency
  const formatCurrency = (amount: number) => `Rs. ${amount.toLocaleString('en-LK')}`;

  return (
    <div className={`relative overflow-hidden rounded-2xl border ${
      theme === 'dark' 
        ? 'bg-gradient-to-br from-slate-800/50 to-slate-900/50 border-slate-700/50' 
        : 'bg-white border-slate-200 shadow-sm'
    }`}>
      {/* Decorative gradient blob */}
      <div className="absolute -top-20 -right-20 w-64 h-64 bg-gradient-to-br from-purple-500/20 via-blue-500/15 to-emerald-500/10 rounded-full blur-3xl" />
      <div className="absolute -bottom-20 -left-20 w-64 h-64 bg-gradient-to-br from-emerald-500/15 via-blue-500/10 to-purple-500/5 rounded-full blur-3xl" />
      
      <div className="relative p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className={`p-3 rounded-xl bg-gradient-to-br from-purple-500 to-blue-500 shadow-lg shadow-purple-500/25`}>
              <Brain className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className={`text-lg font-semibold flex items-center gap-2 ${
                theme === 'dark' ? 'text-white' : 'text-slate-900'
              }`}>
                AI Monthly Analysis
                <Sparkles className="w-4 h-4 text-amber-500" />
              </h3>
              <p className={`text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                Powered by Gemini AI • January 2026
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2 flex-wrap justify-end">
            {lastUpdated && (
              <span className={`text-xs ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>
                Updated {lastUpdated.toLocaleTimeString()}
              </span>
            )}
            
            {/* Language Selector */}
            <div className="relative">
              <button
                onClick={() => setIsLanguageDropdownOpen(!isLanguageDropdownOpen)}
                className={`flex items-center gap-2 px-3 py-2 rounded-xl border transition-all ${
                  theme === 'dark'
                    ? 'bg-slate-800/50 border-slate-700/50 hover:bg-slate-700/50 text-slate-300'
                    : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-700'
                }`}
              >
                <Languages className="w-4 h-4" />
                <span className="text-sm font-medium">
                  {LANGUAGES.find(l => l.id === selectedLanguage)?.flag}{' '}
                  {LANGUAGES.find(l => l.id === selectedLanguage)?.label}
                </span>
                <ChevronDown className={`w-4 h-4 transition-transform ${isLanguageDropdownOpen ? 'rotate-180' : ''}`} />
              </button>
              
              {/* Dropdown Menu */}
              {isLanguageDropdownOpen && (
                <div className={`absolute right-0 top-full mt-2 w-48 rounded-xl border shadow-xl z-50 overflow-hidden ${
                  theme === 'dark'
                    ? 'bg-slate-800 border-slate-700'
                    : 'bg-white border-slate-200'
                }`}>
                  {LANGUAGES.map((lang) => (
                    <button
                      key={lang.id}
                      onClick={() => {
                        setSelectedLanguage(lang.id);
                        setIsLanguageDropdownOpen(false);
                      }}
                      className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-all ${
                        selectedLanguage === lang.id
                          ? theme === 'dark'
                            ? 'bg-purple-500/20 text-purple-400'
                            : 'bg-purple-50 text-purple-600'
                          : theme === 'dark'
                            ? 'hover:bg-slate-700/50 text-slate-300'
                            : 'hover:bg-slate-50 text-slate-700'
                      }`}
                    >
                      <span className="text-xl">{lang.flag}</span>
                      <div>
                        <p className="text-sm font-medium">{lang.label}</p>
                        <p className={`text-xs ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>
                          {lang.nativeLabel}
                        </p>
                      </div>
                      {selectedLanguage === lang.id && (
                        <CheckCircle className="w-4 h-4 ml-auto text-purple-500" />
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
            
            <button
              onClick={generateAnalysis}
              disabled={isLoading}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition-all ${
                isLoading
                  ? 'bg-slate-500/50 cursor-not-allowed'
                  : 'bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 shadow-lg hover:shadow-purple-500/25'
              } text-white`}
            >
              {isLoading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4" />
                  Generate Analysis
                </>
              )}
            </button>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className={`p-4 rounded-xl mb-4 ${
            theme === 'dark' 
              ? 'bg-red-500/10 border border-red-500/20' 
              : 'bg-red-50 border border-red-200'
          }`}>
            <p className="text-red-500 text-sm">{error}</p>
          </div>
        )}

        {/* Quick Metrics Summary */}
        {metrics && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
            <div className={`p-4 rounded-xl ${
              theme === 'dark' ? 'bg-slate-800/50' : 'bg-slate-50'
            }`}>
              <div className="flex items-center gap-2 mb-1">
                <DollarSign className="w-4 h-4 text-emerald-500" />
                <span className={`text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>Revenue</span>
              </div>
              <p className={`text-lg font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                {formatCurrency(metrics.totalRevenue)}
              </p>
            </div>
            <div className={`p-4 rounded-xl ${
              theme === 'dark' ? 'bg-slate-800/50' : 'bg-slate-50'
            }`}>
              <div className="flex items-center gap-2 mb-1">
                <ShoppingCart className="w-4 h-4 text-blue-500" />
                <span className={`text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>Orders</span>
              </div>
              <p className={`text-lg font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                {metrics.totalOrders}
              </p>
            </div>
            <div className={`p-4 rounded-xl ${
              theme === 'dark' ? 'bg-slate-800/50' : 'bg-slate-50'
            }`}>
              <div className="flex items-center gap-2 mb-1">
                <Package className="w-4 h-4 text-amber-500" />
                <span className={`text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>Low Stock</span>
              </div>
              <p className={`text-lg font-bold ${metrics.lowStockItems.length > 3 ? 'text-amber-500' : theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                {metrics.lowStockItems.length} items
              </p>
            </div>
            <div className={`p-4 rounded-xl ${
              theme === 'dark' ? 'bg-slate-800/50' : 'bg-slate-50'
            }`}>
              <div className="flex items-center gap-2 mb-1">
                <Clock className="w-4 h-4 text-purple-500" />
                <span className={`text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>Active Jobs</span>
              </div>
              <p className={`text-lg font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                {metrics.activeJobs}
              </p>
            </div>
          </div>
        )}

        {/* Analysis Content */}
        {analysis && (
          <div className="space-y-4">
            {/* Expandable Toggle */}
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className={`w-full flex items-center justify-between p-4 rounded-xl transition-all ${
                theme === 'dark' 
                  ? 'bg-slate-800/30 hover:bg-slate-800/50' 
                  : 'bg-slate-50 hover:bg-slate-100'
              }`}
            >
              <span className={`font-medium ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                {isExpanded ? 'Hide Detailed Analysis' : 'Show Detailed Analysis'}
              </span>
              {isExpanded ? (
                <ChevronUp className={`w-5 h-5 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`} />
              ) : (
                <ChevronDown className={`w-5 h-5 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`} />
              )}
            </button>

            {/* Expanded Analysis Sections */}
            {isExpanded && (
              <div className="space-y-4 animate-in slide-in-from-top-2 duration-300">
                {parsedSections.length > 0 ? (
                  parsedSections.map((section, index) => (
                    <div
                      key={index}
                      className={`p-4 rounded-xl border ${
                        section.type === 'positive'
                          ? theme === 'dark'
                            ? 'bg-emerald-500/10 border-emerald-500/20'
                            : 'bg-emerald-50 border-emerald-200'
                          : section.type === 'warning'
                          ? theme === 'dark'
                            ? 'bg-amber-500/10 border-amber-500/20'
                            : 'bg-amber-50 border-amber-200'
                          : section.type === 'negative'
                          ? theme === 'dark'
                            ? 'bg-red-500/10 border-red-500/20'
                            : 'bg-red-50 border-red-200'
                          : theme === 'dark'
                          ? 'bg-slate-800/30 border-slate-700/50'
                          : 'bg-slate-50 border-slate-200'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-3">
                        <div className={`p-2 rounded-lg ${
                          section.type === 'positive'
                            ? 'bg-emerald-500/20 text-emerald-500'
                            : section.type === 'warning'
                            ? 'bg-amber-500/20 text-amber-500'
                            : section.type === 'negative'
                            ? 'bg-red-500/20 text-red-500'
                            : theme === 'dark'
                            ? 'bg-slate-700/50 text-slate-400'
                            : 'bg-slate-200 text-slate-600'
                        }`}>
                          {section.icon}
                        </div>
                        <h4 className={`font-semibold ${
                          section.type === 'positive'
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : section.type === 'warning'
                            ? 'text-amber-600 dark:text-amber-400'
                            : section.type === 'negative'
                            ? 'text-red-600 dark:text-red-400'
                            : theme === 'dark' ? 'text-white' : 'text-slate-900'
                        }`}>
                          {section.title}
                        </h4>
                      </div>
                      <div className={`text-sm leading-relaxed whitespace-pre-line ${
                        theme === 'dark' ? 'text-slate-300' : 'text-slate-700'
                      }`}>
                        {section.content}
                      </div>
                    </div>
                  ))
                ) : (
                  // Fallback: Show raw analysis if parsing fails
                  <div className={`p-4 rounded-xl ${
                    theme === 'dark' ? 'bg-slate-800/30' : 'bg-slate-50'
                  }`}>
                    <div className={`text-sm leading-relaxed whitespace-pre-line ${
                      theme === 'dark' ? 'text-slate-300' : 'text-slate-700'
                    }`}>
                      {analysis}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Empty State */}
        {!analysis && !isLoading && !error && (
          <div className="text-center py-8">
            <div className={`w-16 h-16 mx-auto mb-4 rounded-2xl flex items-center justify-center ${
              theme === 'dark' ? 'bg-slate-800/50' : 'bg-slate-100'
            }`}>
              <BarChart3 className={`w-8 h-8 ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`} />
            </div>
            <h4 className={`font-medium mb-2 ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
              Get AI-Powered Business Insights
            </h4>
            <p className={`text-sm mb-4 max-w-md mx-auto ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
              Click "Generate Analysis" to get a comprehensive monthly business review with actionable recommendations powered by Gemini AI.
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              {['Sales Trends', 'Stock Alerts', 'Revenue Analysis', 'Action Items'].map((tag) => (
                <span
                  key={tag}
                  className={`px-3 py-1 rounded-full text-xs font-medium ${
                    theme === 'dark'
                      ? 'bg-slate-800/50 text-slate-400 border border-slate-700/50'
                      : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Loading Animation */}
        {isLoading && (
          <div className="flex flex-col items-center justify-center py-12">
            <div className="relative">
              <div className="w-16 h-16 rounded-full border-4 border-purple-500/20 border-t-purple-500 animate-spin" />
              <Brain className="w-6 h-6 text-purple-500 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
            </div>
            <p className={`mt-4 font-medium ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
              Analyzing your business data...
            </p>
            <p className={`text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
              This may take a few seconds
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
