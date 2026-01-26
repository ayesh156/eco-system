import React, { createContext, useContext, useState, useCallback, useRef, useEffect, useMemo, type ReactNode } from 'react';
import type { Customer, Product, Invoice } from '../data/mockData';
import { customerService, convertAPICustomerToFrontend } from '../services/customerService';
import { productService, convertAPIProductToFrontend } from '../services/productService';
import { invoiceService, convertAPIInvoiceToFrontend } from '../services/invoiceService';
import { useAuth } from './AuthContext';

interface DataCacheContextType {
  // Customers
  customers: Customer[];
  customersLoading: boolean;
  customersLoaded: boolean;
  loadCustomers: (forceRefresh?: boolean) => Promise<Customer[]>;
  
  // Products
  products: Product[];
  productsLoading: boolean;
  productsLoaded: boolean;
  loadProducts: (forceRefresh?: boolean) => Promise<Product[]>;
  
  // Invoices
  invoices: Invoice[];
  invoicesLoading: boolean;
  invoicesLoaded: boolean;
  loadInvoices: (forceRefresh?: boolean) => Promise<Invoice[]>;
  setInvoices: React.Dispatch<React.SetStateAction<Invoice[]>>;
  
  // Combined loading
  isUsingAPI: boolean;
  
  // Convenience loading flags
  isLoadingCustomers: boolean;
  isLoadingProducts: boolean;
  isLoadingInvoices: boolean;
  
  // Last updated timestamps
  lastCustomersUpdate: number | null;
  lastProductsUpdate: number | null;
  lastInvoicesUpdate: number | null;
  
  // Current shop being viewed (for debugging)
  currentShopId: string | null;
}

const DataCacheContext = createContext<DataCacheContextType | undefined>(undefined);

// Cache expiry time in milliseconds (5 minutes)
const CACHE_EXPIRY = 5 * 60 * 1000;

export const DataCacheProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // Get viewing shop context for SUPER_ADMIN
  const { viewingShop, isViewingShop, user } = useAuth();
  
  // Track the current shop ID for cache invalidation
  const currentShopIdRef = useRef<string | null>(null);
  
  // Request version counter to prevent stale data (race condition fix)
  const requestVersionRef = useRef<{
    customers: number;
    products: number;
    invoices: number;
  }>({ customers: 0, products: 0, invoices: 0 });
  
  // Track if we're transitioning shops (prevents flickering)
  const [isTransitioning, setIsTransitioning] = useState(false);
  
  // Customers state
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [customersLoading, setCustomersLoading] = useState(false);
  const [customersLoaded, setCustomersLoaded] = useState(false);
  const lastCustomersUpdateRef = useRef<number | null>(null);
  
  // Products state
  const [products, setProducts] = useState<Product[]>([]);
  const [productsLoading, setProductsLoading] = useState(false);
  const [productsLoaded, setProductsLoaded] = useState(false);
  const lastProductsUpdateRef = useRef<number | null>(null);
  
  // Invoices state
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [invoicesLoading, setInvoicesLoading] = useState(false);
  const [invoicesLoaded, setInvoicesLoaded] = useState(false);
  const lastInvoicesUpdateRef = useRef<number | null>(null);
  
  const [isUsingAPI, setIsUsingAPI] = useState(false);
  
  // Get the effective shop ID (viewing shop for SUPER_ADMIN, own shop otherwise)
  // Memoize to prevent unnecessary re-renders
  const effectiveShopId = useMemo(() => {
    return isViewingShop && viewingShop ? viewingShop.id : user?.shop?.id || null;
  }, [isViewingShop, viewingShop, user?.shop?.id]);
  
  // Clear cache when switching shops (SUPER_ADMIN viewing different shops)
  useEffect(() => {
    const newShopId = effectiveShopId || null;
    const previousShopId = currentShopIdRef.current;
    
    if (previousShopId !== null && previousShopId !== newShopId) {
      console.log('🔄 Shop changed from', previousShopId, 'to', newShopId, '- clearing data cache');
      
      // Start transition - prevents showing stale data
      setIsTransitioning(true);
      
      // Increment request versions to invalidate any in-flight requests
      requestVersionRef.current = {
        customers: requestVersionRef.current.customers + 1,
        products: requestVersionRef.current.products + 1,
        invoices: requestVersionRef.current.invoices + 1,
      };
      
      // Clear all cached data atomically
      setCustomers([]);
      setCustomersLoaded(false);
      lastCustomersUpdateRef.current = null;
      
      setProducts([]);
      setProductsLoaded(false);
      lastProductsUpdateRef.current = null;
      
      setInvoices([]);
      setInvoicesLoaded(false);
      lastInvoicesUpdateRef.current = null;
      
      // End transition after a brief delay to let React batch updates
      setTimeout(() => setIsTransitioning(false), 50);
    }
    
    currentShopIdRef.current = newShopId;
  }, [effectiveShopId]);

  // Load customers with caching and race condition protection
  const loadCustomers = useCallback(async (forceRefresh = false): Promise<Customer[]> => {
    const now = Date.now();
    const cacheValid = lastCustomersUpdateRef.current && 
                       (now - lastCustomersUpdateRef.current) < CACHE_EXPIRY;
    
    // Get current shop ID for this request
    const shopIdParam = effectiveShopId || undefined;
    
    // Skip if already loaded and cache is valid (unless force refresh)
    if (customersLoaded && cacheValid && !forceRefresh && !isTransitioning) {
      console.log('📦 Using cached customers for shop:', shopIdParam || 'own');
      return customers;
    }
    
    // Capture the request version at start
    const requestVersion = ++requestVersionRef.current.customers;
    
    setCustomersLoading(true);
    try {
      console.log('📡 Fetching customers for shop:', shopIdParam || 'own');
      const { customers: apiCustomers } = await customerService.getAll({ limit: 1000, shopId: shopIdParam });
      
      // Check if this request is still valid (shop hasn't changed)
      if (requestVersion !== requestVersionRef.current.customers) {
        console.log('⏭️ Customers request outdated (shop changed), ignoring results');
        return customers;
      }
      
      const converted = apiCustomers.map(convertAPICustomerToFrontend);
      if (converted.length > 0 || forceRefresh) {
        setCustomers(converted);
        setIsUsingAPI(true);
        console.log('✅ Loaded customers from API:', converted.length, shopIdParam ? `(shop: ${shopIdParam})` : '(own shop)');
        setCustomersLoaded(true);
        lastCustomersUpdateRef.current = now;
        return converted;
      }
      return customers;
    } catch (error) {
      console.warn('⚠️ Failed to load customers from API:', error);
      throw error;
    } finally {
      // Only clear loading if this is still the current request
      if (requestVersion === requestVersionRef.current.customers) {
        setCustomersLoading(false);
      }
    }
  }, [customersLoaded, customers, effectiveShopId, isTransitioning]);

  // Load products with caching and race condition protection
  const loadProducts = useCallback(async (forceRefresh = false): Promise<Product[]> => {
    const now = Date.now();
    const cacheValid = lastProductsUpdateRef.current && 
                       (now - lastProductsUpdateRef.current) < CACHE_EXPIRY;
    
    // Get current shop ID for this request
    const shopIdParam = effectiveShopId || undefined;
    
    // Skip if already loaded and cache is valid (unless force refresh)
    if (productsLoaded && cacheValid && !forceRefresh && !isTransitioning) {
      console.log('📦 Using cached products for shop:', shopIdParam || 'own');
      return products;
    }
    
    // Capture the request version at start
    const requestVersion = ++requestVersionRef.current.products;
    
    setProductsLoading(true);
    try {
      console.log('📡 Fetching products for shop:', shopIdParam || 'own');
      const { products: apiProducts } = await productService.getAll({ limit: 1000, shopId: shopIdParam });
      
      // Check if this request is still valid (shop hasn't changed)
      if (requestVersion !== requestVersionRef.current.products) {
        console.log('⏭️ Products request outdated (shop changed), ignoring results');
        return products;
      }
      
      const converted = apiProducts.map(convertAPIProductToFrontend);
      if (converted.length > 0 || forceRefresh) {
        setProducts(converted);
        setIsUsingAPI(true);
        console.log('✅ Loaded products from API:', converted.length, shopIdParam ? `(shop: ${shopIdParam})` : '(own shop)');
        setProductsLoaded(true);
        lastProductsUpdateRef.current = now;
        return converted;
      }
      return products;
    } catch (error) {
      console.warn('⚠️ Failed to load products from API:', error);
      throw error;
    } finally {
      // Only clear loading if this is still the current request
      if (requestVersion === requestVersionRef.current.products) {
        setProductsLoading(false);
      }
    }
  }, [productsLoaded, products, effectiveShopId, isTransitioning]);

  // Load invoices with caching and race condition protection
  const loadInvoices = useCallback(async (forceRefresh = false): Promise<Invoice[]> => {
    const now = Date.now();
    const cacheValid = lastInvoicesUpdateRef.current && 
                       (now - lastInvoicesUpdateRef.current) < CACHE_EXPIRY;
    
    // Get current shop ID for this request
    const shopIdParam = effectiveShopId || undefined;
    
    // Skip if already loaded and cache is valid (unless force refresh)
    if (invoicesLoaded && cacheValid && !forceRefresh && !isTransitioning) {
      console.log('📦 Using cached invoices for shop:', shopIdParam || 'own');
      return invoices;
    }
    
    // Capture the request version at start
    const requestVersion = ++requestVersionRef.current.invoices;
    
    setInvoicesLoading(true);
    try {
      console.log('📡 Fetching invoices for shop:', shopIdParam || 'own');
      const { invoices: apiInvoices } = await invoiceService.getAll({
        page: 1,
        limit: 1000,
        sortBy: 'date',
        sortOrder: 'desc',
        shopId: shopIdParam,
      });
      
      // Check if this request is still valid (shop hasn't changed)
      if (requestVersion !== requestVersionRef.current.invoices) {
        console.log('⏭️ Invoices request outdated (shop changed), ignoring results');
        return invoices;
      }
      
      const converted = apiInvoices.map(convertAPIInvoiceToFrontend);
      setInvoices(converted);
      setIsUsingAPI(true);
      console.log('✅ Loaded invoices from API:', converted.length, shopIdParam ? `(shop: ${shopIdParam})` : '(own shop)');
      setInvoicesLoaded(true);
      lastInvoicesUpdateRef.current = now;
      return converted;
    } catch (error) {
      console.warn('⚠️ Failed to load invoices from API:', error);
      throw error;
    } finally {
      // Only clear loading if this is still the current request
      if (requestVersion === requestVersionRef.current.invoices) {
        setInvoicesLoading(false);
      }
    }
  }, [invoicesLoaded, invoices, effectiveShopId, isTransitioning]);

  return (
    <DataCacheContext.Provider value={{
      customers,
      customersLoading,
      customersLoaded,
      loadCustomers,
      products,
      productsLoading,
      productsLoaded,
      loadProducts,
      invoices,
      invoicesLoading,
      invoicesLoaded,
      loadInvoices,
      setInvoices,
      isUsingAPI,
      isLoadingCustomers: customersLoading,
      isLoadingProducts: productsLoading,
      isLoadingInvoices: invoicesLoading,
      lastCustomersUpdate: lastCustomersUpdateRef.current,
      lastProductsUpdate: lastProductsUpdateRef.current,
      lastInvoicesUpdate: lastInvoicesUpdateRef.current,
      currentShopId: effectiveShopId,
    }}>
      {children}
    </DataCacheContext.Provider>
  );
};

export const useDataCache = () => {
  const context = useContext(DataCacheContext);
  if (!context) {
    throw new Error('useDataCache must be used within DataCacheProvider');
  }
  return context;
};
