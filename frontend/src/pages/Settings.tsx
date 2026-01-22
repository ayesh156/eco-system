import React, { useState } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { User, Bell, Palette, MessageCircle, Info, Copy, Check } from 'lucide-react';
import { mockWhatsAppSettings } from '../data/mockData';

export const Settings: React.FC = () => {
  const { theme, toggleTheme } = useTheme();
  const [whatsappEnabled, setWhatsappEnabled] = useState(mockWhatsAppSettings.enabled);
  const [paymentTemplate, setPaymentTemplate] = useState(mockWhatsAppSettings.paymentReminderTemplate);
  const [overdueTemplate, setOverdueTemplate] = useState(mockWhatsAppSettings.overdueReminderTemplate);
  const [copiedPlaceholder, setCopiedPlaceholder] = useState<string | null>(null);

  const placeholders = [
    { key: '{{customerName}}', desc: 'Customer name' },
    { key: '{{invoiceId}}', desc: 'Invoice number' },
    { key: '{{totalAmount}}', desc: 'Total invoice amount' },
    { key: '{{paidAmount}}', desc: 'Amount already paid' },
    { key: '{{dueAmount}}', desc: 'Balance to pay' },
    { key: '{{dueDate}}', desc: 'Payment due date' },
    { key: '{{daysOverdue}}', desc: 'Days past due date' },
  ];

  const copyPlaceholder = (key: string) => {
    navigator.clipboard.writeText(key);
    setCopiedPlaceholder(key);
    setTimeout(() => setCopiedPlaceholder(null), 1500);
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div>
        <h1 className={`text-2xl lg:text-3xl font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
          Settings
        </h1>
        <p className={`mt-1 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
          Manage your account and preferences
        </p>
      </div>

      {/* Settings Sections */}
      <div className="space-y-4">
        {/* Appearance */}
        <div className={`rounded-2xl border p-6 ${
          theme === 'dark' 
            ? 'bg-slate-800/30 border-slate-700/50' 
            : 'bg-white border-slate-200'
        }`}>
          <div className="flex items-center gap-3 mb-4">
            <div className={`p-2 rounded-lg ${theme === 'dark' ? 'bg-emerald-500/10' : 'bg-emerald-50'}`}>
              <Palette className="w-5 h-5 text-emerald-500" />
            </div>
            <h2 className={`text-lg font-semibold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
              Appearance
            </h2>
          </div>
          
          <div className="flex items-center justify-between py-3">
            <div>
              <p className={`font-medium ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                Dark Mode
              </p>
              <p className={`text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                Toggle dark/light theme
              </p>
            </div>
            <button
              onClick={toggleTheme}
              className={`relative w-14 h-8 rounded-full transition-colors ${
                theme === 'dark' ? 'bg-emerald-500' : 'bg-slate-300'
              }`}
            >
              <div className={`absolute top-1 w-6 h-6 rounded-full bg-white transition-transform ${
                theme === 'dark' ? 'translate-x-7' : 'translate-x-1'
              }`} />
            </button>
          </div>
        </div>

        {/* Profile */}
        <div className={`rounded-2xl border p-6 ${
          theme === 'dark' 
            ? 'bg-slate-800/30 border-slate-700/50' 
            : 'bg-white border-slate-200'
        }`}>
          <div className="flex items-center gap-3 mb-4">
            <div className={`p-2 rounded-lg ${theme === 'dark' ? 'bg-purple-500/10' : 'bg-purple-50'}`}>
              <User className="w-5 h-5 text-purple-500" />
            </div>
            <h2 className={`text-lg font-semibold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
              Profile
            </h2>
          </div>
          
          <div className="space-y-4">
            <div>
              <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                Business Name
              </label>
              <input
                type="text"
                defaultValue="ECOTEC Computer Solutions"
                className={`w-full px-4 py-2.5 rounded-xl border ${
                  theme === 'dark' 
                    ? 'bg-slate-800/50 border-slate-700 text-white' 
                    : 'bg-white border-slate-200 text-slate-900'
                }`}
              />
            </div>
            <div>
              <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                Email
              </label>
              <input
                type="email"
                defaultValue="admin@ecotec.lk"
                className={`w-full px-4 py-2.5 rounded-xl border ${
                  theme === 'dark' 
                    ? 'bg-slate-800/50 border-slate-700 text-white' 
                    : 'bg-white border-slate-200 text-slate-900'
                }`}
              />
            </div>
          </div>
        </div>

        {/* Notifications */}
        <div className={`rounded-2xl border p-6 ${
          theme === 'dark' 
            ? 'bg-slate-800/30 border-slate-700/50' 
            : 'bg-white border-slate-200'
        }`}>
          <div className="flex items-center gap-3 mb-4">
            <div className={`p-2 rounded-lg ${theme === 'dark' ? 'bg-amber-500/10' : 'bg-amber-50'}`}>
              <Bell className="w-5 h-5 text-amber-500" />
            </div>
            <h2 className={`text-lg font-semibold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
              Notifications
            </h2>
          </div>
          
          <div className="space-y-3">
            {['Email notifications', 'Low stock alerts', 'Invoice reminders'].map((item) => (
              <div key={item} className="flex items-center justify-between py-2">
                <span className={theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}>{item}</span>
                <button className={`relative w-12 h-6 rounded-full transition-colors bg-emerald-500`}>
                  <div className="absolute top-0.5 right-0.5 w-5 h-5 rounded-full bg-white" />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* WhatsApp Integration */}
        <div className={`rounded-2xl border p-6 ${
          theme === 'dark' 
            ? 'bg-slate-800/30 border-slate-700/50' 
            : 'bg-white border-slate-200'
        }`}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg bg-green-500/10`}>
                <MessageCircle className="w-5 h-5 text-green-500" />
              </div>
              <div>
                <h2 className={`text-lg font-semibold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                  WhatsApp Payment Reminders
                </h2>
                <p className={`text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                  Send payment reminders via WhatsApp Desktop
                </p>
              </div>
            </div>
            <button
              onClick={() => setWhatsappEnabled(!whatsappEnabled)}
              className={`relative w-14 h-8 rounded-full transition-colors ${
                whatsappEnabled ? 'bg-green-500' : 'bg-slate-300'
              }`}
            >
              <div className={`absolute top-1 w-6 h-6 rounded-full bg-white transition-transform ${
                whatsappEnabled ? 'translate-x-7' : 'translate-x-1'
              }`} />
            </button>
          </div>

          {whatsappEnabled && (
            <div className="space-y-5">
              {/* Placeholders Info */}
              <div className={`p-4 rounded-xl ${theme === 'dark' ? 'bg-slate-800/50' : 'bg-slate-50'}`}>
                <div className="flex items-center gap-2 mb-3">
                  <Info className="w-4 h-4 text-blue-500" />
                  <span className={`text-sm font-medium ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                    Available Placeholders (Click to copy)
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {placeholders.map(({ key, desc }) => (
                    <button
                      key={key}
                      onClick={() => copyPlaceholder(key)}
                      className={`group flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono transition-all ${
                        copiedPlaceholder === key
                          ? 'bg-green-500 text-white'
                          : theme === 'dark' 
                            ? 'bg-slate-700 text-emerald-400 hover:bg-slate-600' 
                            : 'bg-white text-emerald-600 hover:bg-emerald-50 border border-slate-200'
                      }`}
                      title={desc}
                    >
                      {copiedPlaceholder === key ? (
                        <>
                          <Check className="w-3 h-3" /> Copied!
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3 opacity-50 group-hover:opacity-100" />
                          {key}
                        </>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Payment Reminder Template */}
              <div>
                <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                  💳 Payment Reminder Message
                </label>
                <textarea
                  value={paymentTemplate}
                  onChange={(e) => setPaymentTemplate(e.target.value)}
                  rows={10}
                  className={`w-full px-4 py-3 rounded-xl border font-mono text-sm ${
                    theme === 'dark' 
                      ? 'bg-slate-800/50 border-slate-700 text-white' 
                      : 'bg-white border-slate-200 text-slate-900'
                  }`}
                  placeholder="Enter your payment reminder message template..."
                />
              </div>

              {/* Overdue Reminder Template */}
              <div>
                <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                  ⚠️ Overdue Payment Message
                </label>
                <textarea
                  value={overdueTemplate}
                  onChange={(e) => setOverdueTemplate(e.target.value)}
                  rows={8}
                  className={`w-full px-4 py-3 rounded-xl border font-mono text-sm ${
                    theme === 'dark' 
                      ? 'bg-slate-800/50 border-slate-700 text-white' 
                      : 'bg-white border-slate-200 text-slate-900'
                  }`}
                  placeholder="Enter your overdue reminder message template..."
                />
              </div>

              {/* Save Button */}
              <button
                className="w-full py-3 rounded-xl bg-gradient-to-r from-green-500 to-emerald-600 text-white font-semibold hover:from-green-600 hover:to-emerald-700 transition-all shadow-lg hover:shadow-xl"
              >
                💾 Save WhatsApp Templates
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
