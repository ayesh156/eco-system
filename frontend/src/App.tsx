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
import { AdminLayout } from './components/AdminLayout';
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
                              <Route path="/invoices" element={<Invoices />} />
                              <Route path="/invoices/create" element={<CreateInvoice />} />
                              <Route path="/invoices/:id" element={<ViewInvoice />} />
                              <Route path="/products" element={<Products />} />
                              <Route path="/products/add" element={<ProductForm />} />
                              <Route path="/products/edit/:id" element={<ProductForm />} />
                              <Route path="/products/labels" element={<ProductLabels />} />
                              <Route path="/categories" element={<Categories />} />
                              <Route path="/brands" element={<Brands />} />
                              <Route path="/customers" element={<Customers />} />
                              <Route path="/suppliers" element={<Suppliers />} />
                              <Route path="/grn" element={<GoodsReceived />} />
                              <Route path="/grn/create" element={<CreateGRN />} />
                              <Route path="/warranties" element={<Warranties />} />
                              <Route path="/estimates" element={<Estimates />} />
                              <Route path="/estimates/create" element={<EstimateForm />} />
                              <Route path="/estimates/edit/:id" element={<EstimateForm />} />
                              <Route path="/quotations" element={<Quotations />} />
                              <Route path="/quotations/create" element={<QuotationForm />} />
                              <Route path="/quotations/edit/:id" element={<QuotationForm />} />
                              <Route path="/services" element={<Services />} />
                              <Route path="/services/add" element={<ServiceForm />} />
                              <Route path="/services/edit/:id" element={<ServiceForm />} />
                              <Route path="/service-categories" element={<ServiceCategories />} />
                              <Route path="/job-notes" element={<JobNotes />} />
                              <Route path="/job-notes/create" element={<JobNoteForm />} />
                              <Route path="/job-notes/edit/:id" element={<JobNoteForm />} />
                              <Route path="/reports" element={<Reports />} />
                              <Route path="/cash-management" element={<CashManagement />} />
                              <Route path="/cash-management/transactions" element={<CashManagement />} />
                              <Route path="/cash-management/insights" element={<CashManagement />} />
                              <Route path="/cash-management/accounts" element={<CashManagement />} />
                              <Route path="/settings" element={<Settings />} />
                              <Route path="/help" element={<Help />} />
                              <Route path="/ai-chat" element={<AIChat />} />
                              <Route path="/notes" element={<Notes />} />
                              <Route path="/calendar" element={<Calendar />} />
                              <Route path="/data-export" element={<DataExport />} />
                              <Route path="/admin" element={<AdminDashboard />} />
                              <Route path="/admin/shops" element={<AdminDashboard />} />
                              <Route path="/admin/users" element={<AdminDashboard />} />
                              <Route path="/shop-admin" element={<ShopAdminPanel />} />
                              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                              <Route path="*" element={<NotFound />} />
                            </Routes>
                          </Suspense>
                        </AdminLayout>
                      </ProtectedRoute>
                    } />
                  </Routes>
                </BrowserRouter>
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
