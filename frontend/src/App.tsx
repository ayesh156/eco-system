import './index.css';

import { Suspense, lazy } from 'react';
import { TooltipProvider } from '@/components/ui/tooltip';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ThemeProvider, useTheme } from './contexts/ThemeContext';
import { AuthProvider, ProtectedRoute } from './contexts/AuthContext';
import { WhatsAppSettingsProvider } from './contexts/WhatsAppSettingsContext';
import { TaxSettingsProvider } from './contexts/TaxSettingsContext';
import { DataCacheProvider } from './contexts/DataCacheContext';
import { ShopBrandingProvider } from './contexts/ShopBrandingContext';
import { ShopSectionsProvider } from './contexts/ShopSectionsContext';
import { AdminLayout } from './components/AdminLayout';
import { SectionGuard } from './components/SectionGuard';
import { Toaster } from 'sonner';

// Eager load Dashboard (landing page) and Auth pages
import { Dashboard } from './pages/Dashboard';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { ShopSetup } from './pages/ShopSetup';
import { ForgotPassword } from './pages/ForgotPassword';

// Lazy load all other pages
const Invoices = lazy(() => import('./pages/Invoices').then(m => ({ default: m.Invoices })));
const CreateInvoice = lazy(() => import('./pages/CreateInvoice').then(m => ({ default: m.CreateInvoice })));
const ViewInvoice = lazy(() => import('./pages/ViewInvoice').then(m => ({ default: m.ViewInvoice })));
const Products = lazy(() => import('./pages/Products').then(m => ({ default: m.Products })));
const ProductForm = lazy(() => import('./pages/ProductForm').then(m => ({ default: m.ProductForm })));
const ProductLabels = lazy(() => import('./pages/ProductLabels').then(m => ({ default: m.ProductLabels })));
const Categories = lazy(() => import('./pages/Categories').then(m => ({ default: m.Categories })));
const Brands = lazy(() => import('./pages/Brands').then(m => ({ default: m.Brands })));
const Customers = lazy(() => import('./pages/Customers').then(m => ({ default: m.Customers })));
const Suppliers = lazy(() => import('./pages/Suppliers').then(m => ({ default: m.Suppliers })));
const Reports = lazy(() => import('./pages/Reports').then(m => ({ default: m.Reports })));
const Warranties = lazy(() => import('./pages/Warranties').then(m => ({ default: m.Warranties })));
const GoodsReceived = lazy(() => import('./pages/GoodsReceived').then(m => ({ default: m.GoodsReceived })));
const CreateGRN = lazy(() => import('./pages/CreateGRN').then(m => ({ default: m.CreateGRN })));
const Services = lazy(() => import('./pages/Services').then(m => ({ default: m.Services })));
const ServiceForm = lazy(() => import('./pages/ServiceForm').then(m => ({ default: m.ServiceForm })));
const ServiceCategories = lazy(() => import('./pages/ServiceCategories').then(m => ({ default: m.ServiceCategories })));
const Estimates = lazy(() => import('./pages/Estimates').then(m => ({ default: m.Estimates })));
const EstimateForm = lazy(() => import('./pages/EstimateForm').then(m => ({ default: m.EstimateForm })));
const Quotations = lazy(() => import('./pages/Quotations').then(m => ({ default: m.Quotations })));
const QuotationForm = lazy(() => import('./pages/QuotationForm').then(m => ({ default: m.QuotationForm })));
const JobNotes = lazy(() => import('./pages/JobNotes').then(m => ({ default: m.JobNotes })));
const JobNoteForm = lazy(() => import('./pages/JobNoteForm').then(m => ({ default: m.JobNoteForm })));
const Settings = lazy(() => import('./pages/Settings').then(m => ({ default: m.Settings })));
const Help = lazy(() => import('./pages/Help').then(m => ({ default: m.Help })));
const CashManagement = lazy(() => import('./pages/CashManagement').then(m => ({ default: m.CashManagement })));
const AIChat = lazy(() => import('./pages/AIChat').then(m => ({ default: m.AIChat })));
const Notes = lazy(() => import('./pages/Notes').then(m => ({ default: m.Notes })));
const Calendar = lazy(() => import('./pages/Calendar').then(m => ({ default: m.Calendar })));
const DataExport = lazy(() => import('./pages/DataExport').then(m => ({ default: m.DataExport })));
const AdminDashboard = lazy(() => import('./pages/admin').then(m => ({ default: m.AdminDashboard })));
const ShopAdminPanel = lazy(() => import('./pages/admin').then(m => ({ default: m.ShopAdminPanel })));
const NotFound = lazy(() => import('./pages/NotFound'));

const queryClient = new QueryClient();

// Toast provider with theme support
function ThemedToaster() {
  const { theme } = useTheme();
  return (
    <Toaster
      theme={theme}
      position="top-right"
      richColors
      closeButton
      toastOptions={{
        style: {
          background: theme === 'dark' ? '#1e293b' : '#ffffff',
          border: theme === 'dark' ? '1px solid #334155' : '1px solid #e2e8f0',
          color: theme === 'dark' ? '#f1f5f9' : '#1e293b',
        },
      }}
    />
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <ThemeProvider>
          <AuthProvider>
            <WhatsAppSettingsProvider>
              <TaxSettingsProvider>
                <DataCacheProvider>
                <ShopBrandingProvider>
                <ShopSectionsProvider>
                <ThemedToaster />
                <BrowserRouter
                  future={{
                    v7_startTransition: true,
                    v7_relativeSplatPath: true
                  }}
                >
                  <Routes>
                    {/* Public Auth Routes - No Layout */}
                    <Route path="/login" element={<Login />} />
                    <Route path="/register" element={<Register />} />
                    <Route path="/forgot-password" element={<ForgotPassword />} />
                    
                    {/* Shop Setup Route - Protected but no AdminLayout */}
                    <Route path="/shop-setup" element={<ShopSetup />} />
                    
                    {/* Protected Routes - With Admin Layout */}
                    <Route path="/*" element={
                      <ProtectedRoute>
                        <AdminLayout>
                          <Suspense fallback={
                            <div className="flex items-center justify-center h-screen">
                              <div className="text-emerald-500">Loading...</div>
                            </div>
                          }>
                            <Routes>
                              <Route path="/" element={<Dashboard />} />
                              <Route path="/dashboard" element={<Dashboard />} />
                              <Route path="/invoices" element={<SectionGuard path="/invoices"><Invoices /></SectionGuard>} />
                              <Route path="/invoices/create" element={<SectionGuard path="/invoices"><CreateInvoice /></SectionGuard>} />
                              <Route path="/invoices/:id" element={<SectionGuard path="/invoices"><ViewInvoice /></SectionGuard>} />
                              <Route path="/products" element={<SectionGuard path="/products"><Products /></SectionGuard>} />
                              <Route path="/products/add" element={<SectionGuard path="/products"><ProductForm /></SectionGuard>} />
                              <Route path="/products/edit/:id" element={<SectionGuard path="/products"><ProductForm /></SectionGuard>} />
                              <Route path="/products/labels" element={<SectionGuard path="/products"><ProductLabels /></SectionGuard>} />
                              <Route path="/categories" element={<SectionGuard path="/products"><Categories /></SectionGuard>} />
                              <Route path="/brands" element={<SectionGuard path="/products"><Brands /></SectionGuard>} />
                              <Route path="/customers" element={<SectionGuard path="/customers"><Customers /></SectionGuard>} />
                              <Route path="/suppliers" element={<SectionGuard path="/suppliers"><Suppliers /></SectionGuard>} />
                              <Route path="/grn" element={<SectionGuard path="/grn"><GoodsReceived /></SectionGuard>} />
                              <Route path="/grn/create" element={<SectionGuard path="/grn"><CreateGRN /></SectionGuard>} />
                              <Route path="/warranties" element={<SectionGuard path="/warranties"><Warranties /></SectionGuard>} />
                              <Route path="/estimates" element={<SectionGuard path="/estimates"><Estimates /></SectionGuard>} />
                              <Route path="/estimates/create" element={<SectionGuard path="/estimates"><EstimateForm /></SectionGuard>} />
                              <Route path="/estimates/edit/:id" element={<SectionGuard path="/estimates"><EstimateForm /></SectionGuard>} />
                              <Route path="/quotations" element={<SectionGuard path="/quotations"><Quotations /></SectionGuard>} />
                              <Route path="/quotations/create" element={<SectionGuard path="/quotations"><QuotationForm /></SectionGuard>} />
                              <Route path="/quotations/edit/:id" element={<SectionGuard path="/quotations"><QuotationForm /></SectionGuard>} />
                              <Route path="/services" element={<SectionGuard path="/services"><Services /></SectionGuard>} />
                              <Route path="/services/add" element={<SectionGuard path="/services"><ServiceForm /></SectionGuard>} />
                              <Route path="/services/edit/:id" element={<SectionGuard path="/services"><ServiceForm /></SectionGuard>} />
                              <Route path="/service-categories" element={<SectionGuard path="/services"><ServiceCategories /></SectionGuard>} />
                              <Route path="/job-notes" element={<SectionGuard path="/job-notes"><JobNotes /></SectionGuard>} />
                              <Route path="/job-notes/create" element={<SectionGuard path="/job-notes"><JobNoteForm /></SectionGuard>} />
                              <Route path="/job-notes/edit/:id" element={<SectionGuard path="/job-notes"><JobNoteForm /></SectionGuard>} />
                              <Route path="/reports" element={<SectionGuard path="/reports"><Reports /></SectionGuard>} />
                              <Route path="/cash-management" element={<SectionGuard path="/cash-management"><CashManagement /></SectionGuard>} />
                              <Route path="/cash-management/transactions" element={<SectionGuard path="/cash-management"><CashManagement /></SectionGuard>} />
                              <Route path="/cash-management/insights" element={<SectionGuard path="/cash-management"><CashManagement /></SectionGuard>} />
                              <Route path="/cash-management/accounts" element={<SectionGuard path="/cash-management"><CashManagement /></SectionGuard>} />
                              <Route path="/settings" element={<Settings />} />
                              <Route path="/help" element={<Help />} />
                              <Route path="/ai-chat" element={<AIChat />} />
                              <Route path="/notes" element={<SectionGuard path="/notes"><Notes /></SectionGuard>} />
                              <Route path="/calendar" element={<SectionGuard path="/calendar"><Calendar /></SectionGuard>} />
                              <Route path="/data-export" element={<SectionGuard path="/data-export"><DataExport /></SectionGuard>} />
                              <Route path="/admin" element={<AdminDashboard />} />
                              <Route path="/admin/shops" element={<AdminDashboard />} />
                              <Route path="/admin/users" element={<AdminDashboard />} />
                              <Route path="/admin/activity" element={<AdminDashboard />} />
                              <Route path="/shop-admin" element={<ShopAdminPanel />} />
                              <Route path="/shop-admin/users" element={<ShopAdminPanel />} />
                              <Route path="/shop-admin/branding" element={<ShopAdminPanel />} />
                              <Route path="/shop-admin/sections" element={<ShopAdminPanel />} />
                              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                              <Route path="*" element={<NotFound />} />
                            </Routes>
                          </Suspense>
                        </AdminLayout>
                      </ProtectedRoute>
                    } />
                  </Routes>
                </BrowserRouter>
                </ShopSectionsProvider>
                </ShopBrandingProvider>
                </DataCacheProvider>
              </TaxSettingsProvider>
            </WhatsAppSettingsProvider>
          </AuthProvider>
        </ThemeProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
