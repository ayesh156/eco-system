import React, { useState } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { useWhatsAppSettings } from '../contexts/WhatsAppSettingsContext';
import { useTaxSettings } from '../contexts/TaxSettingsContext';
import { 
  Bell, Palette, MessageCircle, Info, Copy, Check, 
  Globe, Moon, Sun, Sparkles,
  Mail, Phone, Building2, Save,
  RefreshCw, Eye, EyeOff, CheckCircle2, AlertCircle, Clock,
  Smartphone, Laptop, SendHorizontal, Settings2
} from 'lucide-react';

interface ReminderPreview {
  customerName: string;
  invoiceId: string;
  totalAmount: string;
  paidAmount: string;
  dueAmount: string;
  dueDate: string;
  daysOverdue: string;
}

export const Settings: React.FC = () => {
  const { theme, toggleTheme } = useTheme();
  const { user, isViewingShop, viewingShop } = useAuth();
  const { settings: whatsAppSettings, updateSettings, saveSettings } = useWhatsAppSettings();
  const { settings: taxSettings, updateSettings: updateTaxSettings, saveSettings: saveTaxSettings } = useTaxSettings();
  
  // Check if user is Super Admin - hide business-specific settings unless viewing a shop
  const isSuperAdmin = user?.role === 'SUPER_ADMIN';
  const canViewBusinessSettings = !isSuperAdmin || (isSuperAdmin && isViewingShop);
  
  // Get the effective shop (either viewed shop for SUPER_ADMIN or user's own shop)
  const effectiveShop = isViewingShop && viewingShop ? viewingShop : user?.shop;
  
  const [copiedPlaceholder, setCopiedPlaceholder] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'appearance' | 'profile' | 'notifications' | 'whatsapp'>('appearance');
  const [showPreview, setShowPreview] = useState(false);
  const [previewType, setPreviewType] = useState<'payment' | 'overdue'>('payment');
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  
  // Profile form states - initialize with effective shop data
  const [businessName, setBusinessName] = useState(effectiveShop?.name || 'Shop Name');
  const [email, setEmail] = useState(effectiveShop?.email || '');
  const [phone, setPhone] = useState(effectiveShop?.phone || '');
  const [address, setAddress] = useState(effectiveShop?.address || '');
  const [website, setWebsite] = useState(effectiveShop?.website || '');

  // Update form when effective shop changes (e.g., SUPER_ADMIN switches shops)
  React.useEffect(() => {
    if (effectiveShop) {
      console.log('📋 Settings: Loading shop details for:', effectiveShop.name, effectiveShop.id);
      setBusinessName(effectiveShop.name || 'Shop Name');
      setEmail(effectiveShop.email || '');
      setPhone(effectiveShop.phone || '');
      setAddress(effectiveShop.address || '');
      setWebsite(effectiveShop.website || '');
    }
  }, [effectiveShop?.id, effectiveShop?.name, effectiveShop?.email, effectiveShop?.phone, effectiveShop?.address, effectiveShop?.website]);

  const placeholders = [
    { key: '{{customerName}}', desc: 'Customer name', example: 'John Doe' },
    { key: '{{invoiceId}}', desc: 'Invoice number', example: 'INV-10260019' },
    { key: '{{totalAmount}}', desc: 'Total invoice amount', example: '25,500' },
    { key: '{{paidAmount}}', desc: 'Amount already paid', example: '10,000' },
    { key: '{{dueAmount}}', desc: 'Balance to pay', example: '15,500' },
    { key: '{{dueDate}}', desc: 'Payment due date', example: '25/01/2026' },
    { key: '{{daysOverdue}}', desc: 'Days past due date', example: '5' },
  ];

  const previewData: ReminderPreview = {
    customerName: 'John Doe',
    invoiceId: 'INV-10260019',
    totalAmount: '25,500',
    paidAmount: '10,000',
    dueAmount: '15,500',
    dueDate: '25/01/2026',
    daysOverdue: '5',
  };

  const copyPlaceholder = (key: string) => {
    navigator.clipboard.writeText(key);
    setCopiedPlaceholder(key);
    setTimeout(() => setCopiedPlaceholder(null), 1500);
  };

  const generatePreview = (template: string) => {
    return template
      .replace(/\{\{customerName\}\}/g, previewData.customerName)
      .replace(/\{\{invoiceId\}\}/g, previewData.invoiceId)
      .replace(/\{\{totalAmount\}\}/g, previewData.totalAmount)
      .replace(/\{\{paidAmount\}\}/g, previewData.paidAmount)
      .replace(/\{\{dueAmount\}\}/g, previewData.dueAmount)
      .replace(/\{\{dueDate\}\}/g, previewData.dueDate)
      .replace(/\{\{daysOverdue\}\}/g, previewData.daysOverdue);
  };

  const handleSave = async () => {
    setIsSaving(true);
    // Simulate API call for other settings
    await new Promise(resolve => setTimeout(resolve, 500));
    setIsSaving(false);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  const handleWhatsAppSave = async () => {
    setIsSaving(true);
    await saveSettings();
    setIsSaving(false);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  // All available tabs
  const allTabs = [
    { id: 'appearance' as const, label: 'Appearance', icon: Palette, color: 'emerald' },
    { id: 'profile' as const, label: 'Business Profile', icon: Building2, color: 'purple', businessOnly: true },
    { id: 'notifications' as const, label: 'Notifications', icon: Bell, color: 'amber', businessOnly: true },
    { id: 'whatsapp' as const, label: 'WhatsApp Reminders', icon: MessageCircle, color: 'green', businessOnly: true },
  ];

  // Filter tabs - hide business-specific tabs for Super Admin unless viewing a shop
  const tabs = canViewBusinessSettings 
    ? allTabs
    : allTabs.filter(tab => !tab.businessOnly);

  return (
    <div className="min-h-screen pb-8">
      {/* Hero Header with Gradient */}
      <div className="relative overflow-hidden mb-8">
        <div className={`absolute inset-0 ${
          theme === 'dark' 
            ? 'bg-gradient-to-br from-slate-900 via-purple-900/20 to-slate-900' 
            : 'bg-gradient-to-br from-slate-50 via-purple-50 to-slate-50'
        }`} />
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-full blur-3xl" />
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-br from-emerald-500/20 to-cyan-500/20 rounded-full blur-3xl" />
        </div>
        
        <div className="relative p-6 md:p-8">
          <div className="flex items-center gap-4 mb-2">
            <div className="w-14 h-14 bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl flex items-center justify-center shadow-lg shadow-purple-500/30">
              <Settings2 className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className={`text-3xl font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                Settings
              </h1>
              <p className={`${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                Customize your experience and preferences
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4">
        {/* Shop Viewing Banner for SUPER_ADMIN */}
        {isSuperAdmin && isViewingShop && viewingShop && (
          <div className={`mb-6 rounded-2xl border p-4 ${
            theme === 'dark' 
              ? 'bg-amber-500/10 border-amber-500/30' 
              : 'bg-amber-50 border-amber-200'
          }`}>
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-xl ${
                theme === 'dark' ? 'bg-amber-500/20' : 'bg-amber-100'
              }`}>
                <Building2 className="w-5 h-5 text-amber-500" />
              </div>
              <div>
                <p className={`font-medium ${theme === 'dark' ? 'text-amber-400' : 'text-amber-700'}`}>
                  Viewing Settings for: {viewingShop.name}
                </p>
                <p className={`text-sm ${theme === 'dark' ? 'text-amber-400/70' : 'text-amber-600'}`}>
                  You are viewing this shop's settings as Super Admin
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Modern Tab Navigation */}
        <div className={`rounded-2xl p-1.5 mb-8 ${
          theme === 'dark' ? 'bg-slate-800/50 backdrop-blur-sm' : 'bg-white shadow-lg shadow-slate-200/50'
        }`}>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`relative flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-medium transition-all duration-300 ${
                    isActive
                      ? `${tab.color === 'emerald' ? 'bg-gradient-to-r from-emerald-500 to-teal-500' : 
                          tab.color === 'purple' ? 'bg-gradient-to-r from-purple-500 to-pink-500' :
                          tab.color === 'amber' ? 'bg-gradient-to-r from-amber-500 to-orange-500' :
                          'bg-gradient-to-r from-green-500 to-emerald-500'} text-white shadow-lg`
                      : theme === 'dark' 
                        ? 'text-slate-400 hover:text-white hover:bg-slate-700/50' 
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                  style={isActive ? {
                    boxShadow: tab.color === 'emerald' ? '0 10px 30px -10px rgba(16, 185, 129, 0.5)' :
                               tab.color === 'purple' ? '0 10px 30px -10px rgba(139, 92, 246, 0.5)' :
                               tab.color === 'amber' ? '0 10px 30px -10px rgba(245, 158, 11, 0.5)' :
                               '0 10px 30px -10px rgba(34, 197, 94, 0.5)'
                  } : {}}
                >
                  <Icon className="w-5 h-5" />
                  <span className="hidden sm:inline">{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Appearance Tab */}
        {activeTab === 'appearance' && (
          <div className="space-y-6 animate-in fade-in duration-300">
            {/* Theme Toggle Card */}
            <div className={`rounded-3xl border overflow-hidden ${
              theme === 'dark' 
                ? 'bg-gradient-to-br from-slate-800/80 to-slate-900/80 border-slate-700/50 backdrop-blur-xl' 
                : 'bg-white border-slate-200 shadow-xl shadow-slate-200/50'
            }`}>
              <div className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className={`w-16 h-16 rounded-2xl flex items-center justify-center transition-all duration-500 ${
                      theme === 'dark' 
                        ? 'bg-gradient-to-br from-indigo-500/20 to-purple-500/20' 
                        : 'bg-gradient-to-br from-amber-100 to-orange-100'
                    }`}>
                      {theme === 'dark' ? (
                        <Moon className="w-8 h-8 text-indigo-400" />
                      ) : (
                        <Sun className="w-8 h-8 text-amber-500" />
                      )}
                    </div>
                    <div>
                      <h2 className={`text-xl font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                        {theme === 'dark' ? 'Dark Mode' : 'Light Mode'}
                      </h2>
                      <p className={`text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                        {theme === 'dark' ? 'Easier on the eyes in low light' : 'Clean and bright interface'}
                      </p>
                    </div>
                  </div>
                  
                  {/* Modern Toggle Switch */}
                  <button
                    onClick={toggleTheme}
                    className={`relative w-20 h-10 rounded-full transition-all duration-500 ${
                      theme === 'dark' 
                        ? 'bg-gradient-to-r from-indigo-600 to-purple-600' 
                        : 'bg-gradient-to-r from-amber-400 to-orange-400'
                    }`}
                    style={{
                      boxShadow: theme === 'dark' 
                        ? '0 0 20px rgba(99, 102, 241, 0.4)' 
                        : '0 0 20px rgba(245, 158, 11, 0.4)'
                    }}
                  >
                    <div className={`absolute top-1 w-8 h-8 rounded-full bg-white flex items-center justify-center transition-all duration-500 ${
                      theme === 'dark' ? 'translate-x-11' : 'translate-x-1'
                    }`}
                    style={{ boxShadow: '0 2px 10px rgba(0,0,0,0.2)' }}
                    >
                      {theme === 'dark' ? (
                        <Moon className="w-5 h-5 text-indigo-600" />
                      ) : (
                        <Sun className="w-5 h-5 text-amber-500" />
                      )}
                    </div>
                  </button>
                </div>
              </div>
              
              {/* Preview Cards */}
              <div className={`p-6 border-t ${theme === 'dark' ? 'border-slate-700/50' : 'border-slate-200'}`}>
                <p className={`text-sm font-medium mb-4 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                  Preview
                </p>
                <div className="grid grid-cols-3 gap-4">
                  {['Primary', 'Secondary', 'Accent'].map((color, i) => (
                    <div
                      key={color}
                      className={`h-20 rounded-xl flex items-center justify-center font-medium text-sm ${
                        i === 0 ? 'bg-gradient-to-br from-emerald-500 to-teal-500 text-white' :
                        i === 1 ? (theme === 'dark' ? 'bg-slate-700/50 text-slate-300' : 'bg-slate-100 text-slate-700') :
                        'bg-gradient-to-br from-purple-500 to-pink-500 text-white'
                      }`}
                    >
                      {color}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Accent Colors */}
            <div className={`rounded-3xl border p-6 ${
              theme === 'dark' 
                ? 'bg-gradient-to-br from-slate-800/80 to-slate-900/80 border-slate-700/50 backdrop-blur-xl' 
                : 'bg-white border-slate-200 shadow-xl shadow-slate-200/50'
            }`}>
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 bg-gradient-to-br from-pink-500/20 to-rose-500/20 rounded-xl flex items-center justify-center">
                  <Sparkles className="w-6 h-6 text-pink-500" />
                </div>
                <div>
                  <h3 className={`font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                    Accent Color
                  </h3>
                  <p className={`text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                    Choose your primary accent color
                  </p>
                </div>
              </div>
              
              <div className="flex flex-wrap gap-3">
                {[
                  { name: 'Emerald', colors: 'from-emerald-500 to-teal-500' },
                  { name: 'Blue', colors: 'from-blue-500 to-cyan-500' },
                  { name: 'Purple', colors: 'from-purple-500 to-pink-500' },
                  { name: 'Rose', colors: 'from-rose-500 to-pink-500' },
                  { name: 'Amber', colors: 'from-amber-500 to-orange-500' },
                  { name: 'Indigo', colors: 'from-indigo-500 to-purple-500' },
                ].map((accent) => (
                  <button
                    key={accent.name}
                    className={`relative w-14 h-14 rounded-xl bg-gradient-to-br ${accent.colors} transition-all hover:scale-110 ${
                      accent.name === 'Emerald' 
                        ? `ring-2 ring-offset-2 ring-emerald-500 ${theme === 'dark' ? 'ring-offset-slate-900' : 'ring-offset-white'}` 
                        : ''
                    }`}
                    style={{
                      boxShadow: accent.name === 'Emerald' ? '0 0 20px rgba(16, 185, 129, 0.4)' : undefined,
                    }}
                    title={accent.name}
                  >
                    {accent.name === 'Emerald' && (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <Check className="w-6 h-6 text-white" />
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Tax Configuration Card - Hidden for Super Admin */}
            {!isSuperAdmin && (
              <div className={`rounded-3xl border overflow-hidden ${
                theme === 'dark' 
                  ? 'bg-gradient-to-br from-slate-800/80 to-slate-900/80 border-slate-700/50 backdrop-blur-xl' 
                  : 'bg-white border-slate-200 shadow-xl shadow-slate-200/50'
              }`}>
                <div className="p-6">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-12 h-12 bg-gradient-to-br from-emerald-500/20 to-green-500/20 rounded-xl flex items-center justify-center">
                      <Settings2 className="w-6 h-6 text-emerald-500" />
                    </div>
                    <div>
                      <h3 className={`font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                        Tax Configuration
                      </h3>
                      <p className={`text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                        Set default tax settings for invoices
                      </p>
                    </div>
                  </div>

                  <div className="space-y-6">
                    {/* Tax Enable/Disable Toggle */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all duration-500 ${
                          taxSettings.enabled
                            ? 'bg-gradient-to-br from-emerald-500/20 to-green-500/20' 
                            : 'bg-gradient-to-br from-slate-500/20 to-slate-600/20'
                        }`}>
                          <CheckCircle2 className={`w-7 h-7 transition-colors ${
                            taxSettings.enabled ? 'text-emerald-500' : 'text-slate-500'
                          }`} />
                        </div>
                        <div>
                          <p className={`font-semibold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                            Enable Tax by Default
                          </p>
                          <p className={`text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                            {taxSettings.enabled ? 'Tax will be added to all new invoices' : 'Tax disabled for new invoices'}
                          </p>
                        </div>
                      </div>
                      
                      {/* Modern Toggle Switch */}
                      <button
                        onClick={() => {
                          updateTaxSettings({ enabled: !taxSettings.enabled });
                          saveTaxSettings();
                        }}
                        className={`relative w-20 h-10 rounded-full transition-all duration-500 ${
                          taxSettings.enabled
                            ? 'bg-gradient-to-r from-emerald-600 to-green-600' 
                            : 'bg-gradient-to-r from-slate-400 to-slate-500'
                        }`}
                        style={{
                          boxShadow: taxSettings.enabled
                            ? '0 0 20px rgba(16, 185, 129, 0.4)' 
                            : '0 0 10px rgba(100, 116, 139, 0.2)'
                        }}
                      >
                        <div className={`absolute top-1 w-8 h-8 rounded-full bg-white flex items-center justify-center transition-all duration-500 ${
                          taxSettings.enabled ? 'translate-x-11' : 'translate-x-1'
                        }`}
                        style={{ boxShadow: '0 2px 10px rgba(0,0,0,0.2)' }}
                        >
                          {taxSettings.enabled ? (
                            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                          ) : (
                            <AlertCircle className="w-5 h-5 text-slate-500" />
                          )}
                        </div>
                      </button>
                    </div>

                    {/* Default Tax Percentage */}
                    <div className={`p-4 rounded-2xl border transition-all ${
                      taxSettings.enabled
                        ? theme === 'dark' ? 'bg-emerald-500/5 border-emerald-500/30' : 'bg-emerald-50 border-emerald-200'
                        : theme === 'dark' ? 'bg-slate-800/30 border-slate-700/50 opacity-50' : 'bg-slate-50 border-slate-200 opacity-50'
                    }`}>
                      <label className={`block text-sm font-semibold mb-3 ${
                        taxSettings.enabled
                          ? theme === 'dark' ? 'text-emerald-400' : 'text-emerald-700'
                          : theme === 'dark' ? 'text-slate-500' : 'text-slate-600'
                      }`}>
                        Default Tax Percentage (%)
                      </label>
                      <div className="flex items-center gap-4">
                        <input
                          type="range"
                          min="0"
                          max="30"
                          step="0.5"
                          value={taxSettings.defaultPercentage}
                          onChange={(e) => {
                            updateTaxSettings({ defaultPercentage: parseFloat(e.target.value) });
                            saveTaxSettings();
                          }}
                          disabled={!taxSettings.enabled}
                          className={`flex-1 h-3 rounded-full appearance-none cursor-pointer ${
                            taxSettings.enabled
                              ? 'accent-emerald-500'
                              : 'opacity-50 cursor-not-allowed'
                          }`}
                        />
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            min="0"
                            max="30"
                            step="0.5"
                            value={taxSettings.defaultPercentage}
                            onChange={(e) => {
                              const value = Math.min(30, Math.max(0, parseFloat(e.target.value) || 0));
                              updateTaxSettings({ defaultPercentage: value });
                              saveTaxSettings();
                            }}
                            disabled={!taxSettings.enabled}
                            className={`w-20 px-3 py-2 rounded-xl border text-center font-bold transition-all ${
                              taxSettings.enabled
                                ? theme === 'dark' 
                                  ? 'bg-slate-800 border-emerald-500/50 text-emerald-400 focus:ring-2 focus:ring-emerald-500/30' 
                                  : 'bg-white border-emerald-300 text-emerald-700 focus:ring-2 focus:ring-emerald-500/30'
                                : theme === 'dark'
                                  ? 'bg-slate-800/50 border-slate-700 text-slate-500 cursor-not-allowed'
                                  : 'bg-slate-100 border-slate-300 text-slate-500 cursor-not-allowed'
                            }`}
                          />
                          <span className={`font-bold text-2xl ${
                            taxSettings.enabled
                              ? theme === 'dark' ? 'text-emerald-400' : 'text-emerald-600'
                              : theme === 'dark' ? 'text-slate-600' : 'text-slate-400'
                          }`}>%</span>
                        </div>
                      </div>
                      
                      {/* Quick Preset Buttons */}
                      <div className="flex gap-2 mt-4">
                        {[5, 8, 12, 15, 18].map(percentage => (
                          <button
                            key={percentage}
                            onClick={() => {
                              updateTaxSettings({ defaultPercentage: percentage });
                              saveTaxSettings();
                            }}
                            disabled={!taxSettings.enabled}
                            className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                              taxSettings.enabled
                                ? taxSettings.defaultPercentage === percentage
                                  ? 'bg-gradient-to-r from-emerald-500 to-green-500 text-white shadow-lg shadow-emerald-500/30'
                                  : theme === 'dark'
                                    ? 'bg-slate-700/50 text-slate-300 hover:bg-slate-700 border border-slate-600'
                                    : 'bg-white text-slate-700 hover:bg-slate-50 border border-slate-200'
                                : 'bg-slate-700/20 text-slate-500 cursor-not-allowed border border-slate-600/30'
                            }`}
                          >
                            {percentage}%
                          </button>
                        ))}
                      </div>

                      {/* Info Box */}
                      {taxSettings.enabled && (
                        <div className={`mt-4 p-3 rounded-xl flex items-start gap-3 ${
                          theme === 'dark' ? 'bg-emerald-500/10 border border-emerald-500/30' : 'bg-emerald-50 border border-emerald-200'
                        }`}>
                          <Info className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" />
                          <p className={`text-xs ${
                            theme === 'dark' ? 'text-emerald-400/90' : 'text-emerald-700'
                          }`}>
                            This will be the default tax rate for all new invoices. You can still adjust the tax for individual invoices during creation.
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Profile Tab */}
        {activeTab === 'profile' && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div className={`rounded-3xl border overflow-hidden ${
              theme === 'dark' 
                ? 'bg-gradient-to-br from-slate-800/80 to-slate-900/80 border-slate-700/50 backdrop-blur-xl' 
                : 'bg-white border-slate-200 shadow-xl shadow-slate-200/50'
            }`}>
              {/* Profile Header */}
              <div className="relative h-32 bg-gradient-to-r from-purple-600 via-pink-600 to-rose-600">
                <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZGVmcz48cGF0dGVybiBpZD0iZ3JpZCIgd2lkdGg9IjEwIiBoZWlnaHQ9IjEwIiBwYXR0ZXJuVW5pdHM9InVzZXJTcGFjZU9uVXNlIj48cGF0aCBkPSJNIDEwIDAgTCAwIDAgMCAxMCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJyZ2JhKDI1NSwyNTUsMjU1LDAuMSkiIHN0cm9rZS13aWR0aD0iMSIvPjwvcGF0dGVybj48L2RlZnM+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsbD0idXJsKCNncmlkKSIvPjwvc3ZnPg==')] opacity-30" />
              </div>
              
              <div className="relative px-6 pb-6">
                <div className="absolute -top-12 left-6">
                  <div className="w-24 h-24 bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl flex items-center justify-center text-white text-3xl font-bold shadow-xl shadow-purple-500/30 border-4 border-white dark:border-slate-900">
                    {businessName?.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() || 'SH'}
                  </div>
                </div>
                
                <div className="pt-16 space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                        <Building2 className="w-4 h-4 inline mr-2" />
                        Business Name
                      </label>
                      <input
                        type="text"
                        value={businessName}
                        onChange={(e) => setBusinessName(e.target.value)}
                        className={`w-full px-4 py-3 rounded-xl border transition-all ${
                          theme === 'dark' 
                            ? 'bg-slate-800/50 border-slate-700 text-white focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20' 
                            : 'bg-white border-slate-200 text-slate-900 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20'
                        }`}
                      />
                    </div>
                    <div>
                      <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                        <Mail className="w-4 h-4 inline mr-2" />
                        Email Address
                      </label>
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className={`w-full px-4 py-3 rounded-xl border transition-all ${
                          theme === 'dark' 
                            ? 'bg-slate-800/50 border-slate-700 text-white focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20' 
                            : 'bg-white border-slate-200 text-slate-900 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20'
                        }`}
                      />
                    </div>
                    <div>
                      <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                        <Phone className="w-4 h-4 inline mr-2" />
                        Phone Number
                      </label>
                      <input
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        className={`w-full px-4 py-3 rounded-xl border transition-all ${
                          theme === 'dark' 
                            ? 'bg-slate-800/50 border-slate-700 text-white focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20' 
                            : 'bg-white border-slate-200 text-slate-900 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20'
                        }`}
                      />
                    </div>
                    <div>
                      <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                        <Globe className="w-4 h-4 inline mr-2" />
                        Website
                      </label>
                      <input
                        type="text"
                        value={website}
                        onChange={(e) => setWebsite(e.target.value)}
                        className={`w-full px-4 py-3 rounded-xl border transition-all ${
                          theme === 'dark' 
                            ? 'bg-slate-800/50 border-slate-700 text-white focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20' 
                            : 'bg-white border-slate-200 text-slate-900 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20'
                        }`}
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                      Address
                    </label>
                    <textarea
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      rows={3}
                      className={`w-full px-4 py-3 rounded-xl border transition-all ${
                        theme === 'dark' 
                          ? 'bg-slate-800/50 border-slate-700 text-white focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20' 
                          : 'bg-white border-slate-200 text-slate-900 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20'
                      }`}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Notifications Tab */}
        {activeTab === 'notifications' && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div className={`rounded-3xl border p-6 ${
              theme === 'dark' 
                ? 'bg-gradient-to-br from-slate-800/80 to-slate-900/80 border-slate-700/50 backdrop-blur-xl' 
                : 'bg-white border-slate-200 shadow-xl shadow-slate-200/50'
            }`}>
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 bg-gradient-to-br from-amber-500/20 to-orange-500/20 rounded-xl flex items-center justify-center">
                  <Bell className="w-6 h-6 text-amber-500" />
                </div>
                <div>
                  <h3 className={`font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                    Notification Preferences
                  </h3>
                  <p className={`text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                    Control how you receive notifications
                  </p>
                </div>
              </div>
              
              <div className="space-y-4">
                {[
                  { label: 'Email Notifications', desc: 'Receive updates via email', icon: Mail, enabled: true },
                  { label: 'Low Stock Alerts', desc: 'Get notified when stock is low', icon: AlertCircle, enabled: true },
                  { label: 'Invoice Reminders', desc: 'Automatic payment reminders', icon: Clock, enabled: true },
                  { label: 'Desktop Notifications', desc: 'Browser push notifications', icon: Laptop, enabled: false },
                  { label: 'Mobile Notifications', desc: 'Push notifications on mobile', icon: Smartphone, enabled: false },
                ].map((item) => {
                  const Icon = item.icon;
                  return (
                    <div 
                      key={item.label}
                      className={`flex items-center justify-between p-4 rounded-xl transition-all ${
                        theme === 'dark' ? 'bg-slate-800/50 hover:bg-slate-800' : 'bg-slate-50 hover:bg-slate-100'
                      }`}
                    >
                      <div className="flex items-center gap-4">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                          theme === 'dark' ? 'bg-slate-700' : 'bg-white shadow'
                        }`}>
                          <Icon className={`w-5 h-5 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`} />
                        </div>
                        <div>
                          <p className={`font-medium ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                            {item.label}
                          </p>
                          <p className={`text-sm ${theme === 'dark' ? 'text-slate-500' : 'text-slate-500'}`}>
                            {item.desc}
                          </p>
                        </div>
                      </div>
                      <button className={`relative w-14 h-8 rounded-full transition-all duration-300 ${
                        item.enabled 
                          ? 'bg-gradient-to-r from-amber-500 to-orange-500' 
                          : theme === 'dark' ? 'bg-slate-700' : 'bg-slate-300'
                      }`}>
                        <div className={`absolute top-1 w-6 h-6 rounded-full bg-white transition-all duration-300 ${
                          item.enabled ? 'translate-x-7' : 'translate-x-1'
                        }`} />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* WhatsApp Tab */}
        {activeTab === 'whatsapp' && (
          <div className="space-y-6 animate-in fade-in duration-300">
            {/* Enable/Disable Card */}
            <div className={`rounded-3xl border overflow-hidden ${
              theme === 'dark' 
                ? 'bg-gradient-to-br from-slate-800/80 to-slate-900/80 border-slate-700/50 backdrop-blur-xl' 
                : 'bg-white border-slate-200 shadow-xl shadow-slate-200/50'
            }`}>
              <div className="relative h-24 bg-gradient-to-r from-green-600 via-emerald-600 to-teal-600">
                <div className="absolute inset-0 flex items-center px-6">
                  <div className="flex items-center gap-4 flex-1">
                    <div className="w-14 h-14 bg-white/20 backdrop-blur rounded-2xl flex items-center justify-center">
                      <MessageCircle className="w-8 h-8 text-white" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-white">WhatsApp Payment Reminders</h2>
                      <p className="text-green-100 text-sm">Send automated payment reminders via WhatsApp</p>
                    </div>
                  </div>
                  <button
                    onClick={() => updateSettings({ enabled: !whatsAppSettings.enabled })}
                    className={`relative w-20 h-10 rounded-full transition-all duration-300 ${
                      whatsAppSettings.enabled 
                        ? 'bg-white/30' 
                        : 'bg-black/20'
                    }`}
                  >
                    <div className={`absolute top-1 w-8 h-8 rounded-full transition-all duration-300 flex items-center justify-center ${
                      whatsAppSettings.enabled 
                        ? 'translate-x-11 bg-white' 
                        : 'translate-x-1 bg-white/60'
                    }`}>
                      {whatsAppSettings.enabled ? (
                        <Check className="w-5 h-5 text-green-600" />
                      ) : (
                        <span className="w-5 h-5" />
                      )}
                    </div>
                  </button>
                </div>
              </div>

              {whatsAppSettings.enabled && (
                <div className="p-6 space-y-6">
                  {/* Placeholders Card */}
                  <div className={`rounded-2xl p-4 ${
                    theme === 'dark' ? 'bg-slate-800/50' : 'bg-gradient-to-r from-green-50 to-emerald-50'
                  }`}>
                    <div className="flex items-center gap-2 mb-4">
                      <Info className="w-5 h-5 text-green-500" />
                      <span className={`font-semibold ${theme === 'dark' ? 'text-white' : 'text-slate-800'}`}>
                        Available Placeholders
                      </span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        theme === 'dark' ? 'bg-green-500/20 text-green-400' : 'bg-green-100 text-green-700'
                      }`}>
                        Click to copy
                      </span>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                      {placeholders.map(({ key, desc }) => (
                        <button
                          key={key}
                          onClick={() => copyPlaceholder(key)}
                          className={`group relative flex flex-col items-start px-3 py-2 rounded-xl text-sm font-mono transition-all ${
                            copiedPlaceholder === key
                              ? 'bg-green-500 text-white scale-95'
                              : theme === 'dark' 
                                ? 'bg-slate-700/50 text-emerald-400 hover:bg-slate-700 hover:scale-[1.02]' 
                                : 'bg-white text-green-600 hover:shadow-md hover:scale-[1.02] border border-green-200'
                          }`}
                        >
                          <div className="flex items-center gap-1.5 w-full">
                            {copiedPlaceholder === key ? (
                              <>
                                <Check className="w-3.5 h-3.5" /> 
                                <span className="text-xs">Copied!</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-3.5 h-3.5 opacity-50 group-hover:opacity-100" />
                                <span className="text-xs truncate">{key}</span>
                              </>
                            )}
                          </div>
                          <span className={`text-[10px] mt-0.5 ${
                            copiedPlaceholder === key ? 'text-green-100' : 'text-slate-500'
                          }`}>
                            {desc}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Template Tabs */}
                  <div className="flex gap-2 p-1 rounded-xl bg-slate-100 dark:bg-slate-800/50">
                    <button
                      onClick={() => setPreviewType('payment')}
                      className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg font-medium transition-all ${
                        previewType === 'payment'
                          ? 'bg-white dark:bg-slate-700 shadow-sm text-green-600 dark:text-green-400'
                          : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                      }`}
                    >
                      💳 Payment Reminder
                    </button>
                    <button
                      onClick={() => setPreviewType('overdue')}
                      className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg font-medium transition-all ${
                        previewType === 'overdue'
                          ? 'bg-white dark:bg-slate-700 shadow-sm text-amber-600 dark:text-amber-400'
                          : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                      }`}
                    >
                      ⚠️ Overdue Reminder
                    </button>
                  </div>

                  {/* Template Editor with Preview */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Editor */}
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <label className={`font-medium ${theme === 'dark' ? 'text-white' : 'text-slate-800'}`}>
                          {previewType === 'payment' ? '💳 Payment Reminder Template' : '⚠️ Overdue Reminder Template'}
                        </label>
                        <button
                          onClick={() => setShowPreview(!showPreview)}
                          className={`flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg transition-all lg:hidden ${
                            theme === 'dark' ? 'bg-slate-700 text-slate-300 hover:bg-slate-600' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                          }`}
                        >
                          {showPreview ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          {showPreview ? 'Hide' : 'Show'} Preview
                        </button>
                      </div>
                      <textarea
                        value={previewType === 'payment' ? whatsAppSettings.paymentReminderTemplate : whatsAppSettings.overdueReminderTemplate}
                        onChange={(e) => updateSettings(previewType === 'payment' ? { paymentReminderTemplate: e.target.value } : { overdueReminderTemplate: e.target.value })}
                        rows={16}
                        className={`w-full px-4 py-3 rounded-xl border font-mono text-sm leading-relaxed transition-all resize-none ${
                          theme === 'dark' 
                            ? 'bg-slate-800/50 border-slate-700 text-white focus:border-green-500 focus:ring-2 focus:ring-green-500/20' 
                            : 'bg-white border-slate-200 text-slate-900 focus:border-green-500 focus:ring-2 focus:ring-green-500/20'
                        }`}
                        placeholder="Enter your reminder message template..."
                      />
                    </div>

                    {/* Live Preview */}
                    <div className={`${showPreview ? 'block' : 'hidden'} lg:block`}>
                      <div className="flex items-center gap-2 mb-3">
                        <Eye className={`w-4 h-4 ${theme === 'dark' ? 'text-green-400' : 'text-green-600'}`} />
                        <span className={`font-medium ${theme === 'dark' ? 'text-white' : 'text-slate-800'}`}>
                          Live Preview
                        </span>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          theme === 'dark' ? 'bg-green-500/20 text-green-400' : 'bg-green-100 text-green-700'
                        }`}>
                          Auto-filled
                        </span>
                      </div>
                      
                      {/* WhatsApp Style Preview */}
                      <div className="bg-[#0B141A] rounded-2xl overflow-hidden shadow-2xl">
                        {/* WhatsApp Header */}
                        <div className="bg-[#202C33] px-4 py-3 flex items-center gap-3">
                          <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-green-600 rounded-full flex items-center justify-center text-white font-bold text-sm">
                            JD
                          </div>
                          <div className="flex-1">
                            <p className="text-white font-medium text-sm">John Doe</p>
                            <p className="text-green-400 text-xs">online</p>
                          </div>
                        </div>
                        
                        {/* Chat Background */}
                        <div className="p-4 min-h-[300px] max-h-[400px] overflow-y-auto" style={{
                          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.03'%3E%3Ccircle cx='30' cy='30' r='2'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
                          backgroundColor: '#0B141A'
                        }}>
                          {/* Message Bubble */}
                          <div className="max-w-[85%] ml-auto">
                            <div className="bg-[#005C4B] rounded-xl rounded-tr-sm px-3 py-2 text-white text-sm whitespace-pre-wrap leading-relaxed">
                              {generatePreview(previewType === 'payment' ? whatsAppSettings.paymentReminderTemplate : whatsAppSettings.overdueReminderTemplate)}
                              <div className="flex items-center justify-end gap-1 mt-1">
                                <span className="text-[10px] text-green-200/70">
                                  {new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                                </span>
                                <CheckCircle2 className="w-3.5 h-3.5 text-blue-400" />
                              </div>
                            </div>
                          </div>
                        </div>
                        
                        {/* Input Bar */}
                        <div className="bg-[#202C33] px-4 py-3 flex items-center gap-3">
                          <div className="flex-1 bg-[#2A3942] rounded-full px-4 py-2.5 text-slate-400 text-sm">
                            Type a message
                          </div>
                          <div className="w-10 h-10 bg-[#00A884] rounded-full flex items-center justify-center">
                            <SendHorizontal className="w-5 h-5 text-white" />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Save Button */}
                  <div className="flex justify-end pt-4">
                    <button
                      onClick={handleWhatsAppSave}
                      disabled={isSaving}
                      className={`relative px-8 py-3 rounded-xl font-semibold text-white transition-all overflow-hidden ${
                        saveSuccess 
                          ? 'bg-green-500' 
                          : 'bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 hover:shadow-lg hover:shadow-green-500/30'
                      }`}
                    >
                      {isSaving ? (
                        <span className="flex items-center gap-2">
                          <RefreshCw className="w-5 h-5 animate-spin" />
                          Saving...
                        </span>
                      ) : saveSuccess ? (
                        <span className="flex items-center gap-2">
                          <CheckCircle2 className="w-5 h-5" />
                          Saved Successfully!
                        </span>
                      ) : (
                        <span className="flex items-center gap-2">
                          <Save className="w-5 h-5" />
                          Save Templates
                        </span>
                      )}
                    </button>
                  </div>
                </div>
              )}

              {!whatsAppSettings.enabled && (
                <div className="p-8 text-center">
                  <div className={`w-20 h-20 mx-auto mb-4 rounded-2xl flex items-center justify-center ${
                    theme === 'dark' ? 'bg-slate-800' : 'bg-slate-100'
                  }`}>
                    <MessageCircle className={`w-10 h-10 ${theme === 'dark' ? 'text-slate-600' : 'text-slate-400'}`} />
                  </div>
                  <h3 className={`text-lg font-semibold mb-2 ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                    WhatsApp Reminders Disabled
                  </h3>
                  <p className={`text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                    Enable WhatsApp integration to send payment reminders to customers automatically.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Global Save Button */}
        {activeTab !== 'whatsapp' && (
          <div className="flex justify-end mt-8">
            <button
              onClick={handleSave}
              disabled={isSaving}
              className={`relative px-8 py-3 rounded-xl font-semibold text-white transition-all overflow-hidden ${
                saveSuccess 
                  ? 'bg-green-500' 
                  : 'bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 hover:shadow-lg hover:shadow-purple-500/30'
              }`}
            >
              {isSaving ? (
                <span className="flex items-center gap-2">
                  <RefreshCw className="w-5 h-5 animate-spin" />
                  Saving...
                </span>
              ) : saveSuccess ? (
                <span className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5" />
                  Saved Successfully!
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <Save className="w-5 h-5" />
                  Save Changes
                </span>
              )}
            </button>
          </div>
        )}

      </div>
    </div>
  );
};
