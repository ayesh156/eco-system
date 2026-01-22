import React from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { HelpCircle, MessageCircle, Book, Mail } from 'lucide-react';

export const Help: React.FC = () => {
  const { theme } = useTheme();

  const faqs = [
    { q: 'How do I create a new invoice?', a: 'Go to Invoices page and click "Create Invoice" button.' },
    { q: 'How to add new products?', a: 'Navigate to Products page and click "Add Product" button.' },
    { q: 'Can I export reports?', a: 'Yes, export options will be available in the Reports page.' },
    { q: 'How to manage stock levels?', a: 'Edit product quantities directly from the Products page.' },
  ];

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div>
        <h1 className={`text-2xl lg:text-3xl font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
          Help Center
        </h1>
        <p className={`mt-1 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
          Get help and support for ECOTEC system
        </p>
      </div>

      {/* Quick Links */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className={`rounded-2xl border p-6 text-center ${
          theme === 'dark' 
            ? 'bg-slate-800/30 border-slate-700/50' 
            : 'bg-white border-slate-200'
        }`}>
          <div className={`w-12 h-12 mx-auto mb-3 rounded-xl flex items-center justify-center ${
            theme === 'dark' ? 'bg-emerald-500/10' : 'bg-emerald-50'
          }`}>
            <Book className="w-6 h-6 text-emerald-500" />
          </div>
          <h3 className={`font-semibold mb-1 ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
            Documentation
          </h3>
          <p className={`text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
            Read user guides
          </p>
        </div>

        <div className={`rounded-2xl border p-6 text-center ${
          theme === 'dark' 
            ? 'bg-slate-800/30 border-slate-700/50' 
            : 'bg-white border-slate-200'
        }`}>
          <div className={`w-12 h-12 mx-auto mb-3 rounded-xl flex items-center justify-center ${
            theme === 'dark' ? 'bg-purple-500/10' : 'bg-purple-50'
          }`}>
            <MessageCircle className="w-6 h-6 text-purple-500" />
          </div>
          <h3 className={`font-semibold mb-1 ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
            Live Chat
          </h3>
          <p className={`text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
            Chat with support
          </p>
        </div>

        <div className={`rounded-2xl border p-6 text-center ${
          theme === 'dark' 
            ? 'bg-slate-800/30 border-slate-700/50' 
            : 'bg-white border-slate-200'
        }`}>
          <div className={`w-12 h-12 mx-auto mb-3 rounded-xl flex items-center justify-center ${
            theme === 'dark' ? 'bg-emerald-500/10' : 'bg-emerald-50'
          }`}>
            <Mail className="w-6 h-6 text-emerald-500" />
          </div>
          <h3 className={`font-semibold mb-1 ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
            Email Support
          </h3>
          <p className={`text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
            support@ecotec.lk
          </p>
        </div>
      </div>

      {/* FAQs */}
      <div className={`rounded-2xl border p-6 ${
        theme === 'dark' 
          ? 'bg-slate-800/30 border-slate-700/50' 
          : 'bg-white border-slate-200'
      }`}>
        <div className="flex items-center gap-3 mb-6">
          <div className={`p-2 rounded-lg ${theme === 'dark' ? 'bg-emerald-500/10' : 'bg-emerald-50'}`}>
            <HelpCircle className="w-5 h-5 text-emerald-500" />
          </div>
          <h2 className={`text-lg font-semibold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
            Frequently Asked Questions
          </h2>
        </div>
        
        <div className="space-y-4">
          {faqs.map((faq, index) => (
            <div 
              key={index}
              className={`p-4 rounded-xl ${theme === 'dark' ? 'bg-slate-800/50' : 'bg-slate-50'}`}
            >
              <h3 className={`font-medium mb-2 ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                {faq.q}
              </h3>
              <p className={`text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                {faq.a}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
