import React, { createContext, useContext, useState, useCallback, useRef, type ReactNode } from 'react';
import type { Customer, Product, Invoice } from '../data/mockData';
import { customerService, convertAPICustomerToFrontend } from '../services/customerService';
import { productService, convertAPIProductToFrontend } from '../services/productService';
import { invoiceService, convertAPIInvoiceToFrontend } from '../services/invoiceService';

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
}

const DataCacheContext = createContext<DataCacheContextType | undefined>(undefined);

// Cache expiry time in milliseconds (5 minutes)
const CACHE_EXPIRY = 5 * 60 * 1000;

export const DataCacheProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
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

  // Load customers with caching
  const loadCustomers = useCallback(async (forceRefresh = false): Promise<Customer[]> => {
    const now = Date.now();
    const cacheValid = lastCustomersUpdateRef.current && 
                       (now - lastCustomersUpdateRef.current) < CACHE_EXPIRY;
    
    // Skip if already loaded and cache is valid (unless force refresh)
    if (customersLoaded && cacheValid && !forceRefresh) {
      console.log('📦 Using cached customers');
      return customers;
    }
    
    setCustomersLoading(true);
    try {
      const { customers: apiCustomers } = await customerService.getAll({ limit: 1000 });
      const converted = apiCustomers.map(convertAPICustomerToFrontend);
      if (converted.length > 0) {
        setCustomers(converted);
        setIsUsingAPI(true);
        console.log('✅ Loaded customers from API:', converted.length);
        setCustomersLoaded(true);
        lastCustomersUpdateRef.current = now;
        return converted;
      }
      return customers;
    } catch (error) {
      console.warn('⚠️ Failed to load customers from API:', error);
      throw error; // Re-throw so caller can handle
    } finally {
      setCustomersLoading(false);
    }
  }, [customersLoaded, customers]);

  // Load products with caching
  const loadProducts = useCallback(async (forceRefresh = false): Promise<Product[]> => {
    const now = Date.now();
    const cacheValid = lastProductsUpdateRef.current && 
                       (now - lastProductsUpdateRef.current) < CACHE_EXPIRY;
    
    // Skip if already loaded and cache is valid (unless force refresh)
    if (productsLoaded && cacheValid && !forceRefresh) {
      console.log('📦 Using cached products');
      return products;
    }
    
    setProductsLoading(true);
    try {
      const { products: apiProducts } = await productService.getAll({ limit: 1000 });
      const converted = apiProducts.map(convertAPIProductToFrontend);
      if (converted.length > 0) {
        setProducts(converted);
        setIsUsingAPI(true);
        console.log('✅ Loaded products from API:', converted.length);
        setProductsLoaded(true);
        lastProductsUpdateRef.current = now;
        return converted;
      }
      return products;
    } catch (error) {
      console.warn('⚠️ Failed to load products from API:', error);
      throw error; // Re-throw so caller can handle
    } finally {
      setProductsLoading(false);
    }
  }, [productsLoaded, products]);

  // Load invoices with caching
  const loadInvoices = useCallback(async (forceRefresh = false): Promise<Invoice[]> => {
    const now = Date.now();
    const cacheValid = lastInvoicesUpdateRef.current && 
                       (now - lastInvoicesUpdateRef.current) < CACHE_EXPIRY;
    
    // Skip if already loaded and cache is valid (unless force refresh)
    if (invoicesLoaded && cacheValid && !forceRefresh) {
      console.log('📦 Using cached invoices');
      return invoices;
    }
    
    setInvoicesLoading(true);
    try {
      const { invoices: apiInvoices } = await invoiceService.getAll({
        page: 1,
        limit: 1000,
        sortBy: 'date',
        sortOrder: 'desc',
      });
      const converted = apiInvoices.map(convertAPIInvoiceToFrontend);
      setInvoices(converted);
      setIsUsingAPI(true);
      console.log('✅ Loaded invoices from API:', converted.length);
      setInvoicesLoaded(true);
      lastInvoicesUpdateRef.current = now;
      return converted;
    } catch (error) {
      console.warn('⚠️ Failed to load invoices from API:', error);
      throw error; // Re-throw so caller can handle
    } finally {
      setInvoicesLoading(false);
    }
  }, [invoicesLoaded, invoices]);

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
