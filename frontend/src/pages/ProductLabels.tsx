import React, { useState, useRef, useMemo, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../contexts/ThemeContext';
import { mockProducts } from '../data/mockData';
import type { Product } from '../data/mockData';
import { SearchableSelect } from '../components/ui/searchable-select';
import {
  ArrowLeft,
  Printer,
  Search,
  Package,
  Check,
  X,
  Plus,
  Minus,
  Barcode,
  Tag,
  Trash2,
  Settings2,
  Copy,
  CheckCircle,
  GripVertical,
} from 'lucide-react';
import JsBarcode from 'jsbarcode';

// Barcode component using JsBarcode
const BarcodeDisplay: React.FC<{
  value: string;
  width?: number;
  height?: number;
  displayValue?: boolean;
  fontSize?: number;
}> = ({ value, width = 2, height = 50, displayValue = false, fontSize = 12 }) => {
  const barcodeRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (barcodeRef.current && value) {
      try {
        JsBarcode(barcodeRef.current, value, {
          format: 'CODE128',
          width,
          height,
          displayValue,
          fontSize,
          margin: 0,
          background: 'transparent',
        });
      } catch (error) {
        console.error('Barcode generation error:', error);
      }
    }
  }, [value, width, height, displayValue, fontSize]);

  return <svg ref={barcodeRef} />;
};

// Label sizes configuration
const labelSizes = {
  small: { width: 180, height: 80, name: 'Small (45x20mm)' },
  medium: { width: 240, height: 100, name: 'Medium (60x25mm)' },
  large: { width: 300, height: 130, name: 'Large (75x32mm)' },
  xlarge: { width: 380, height: 160, name: 'X-Large (95x40mm)' },
};

type LabelSize = keyof typeof labelSizes;

interface SelectedProduct {
  product: Product;
  quantity: number;
}

export const ProductLabels: React.FC = () => {
  const { theme } = useTheme();
  const navigate = useNavigate();
  const printRef = useRef<HTMLDivElement>(null);
  const mainContainerRef = useRef<HTMLDivElement>(null);

  // States
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProducts, setSelectedProducts] = useState<SelectedProduct[]>([]);
  const [labelSize, setLabelSize] = useState<LabelSize>('medium');
  const [showSettings, setShowSettings] = useState(false);
  const [showProductName, setShowProductName] = useState(true);
  const [showSku, setShowSku] = useState(true);
  const [showBarcode, setShowBarcode] = useState(true);
  const [showPrice, setShowPrice] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Resizable panels state
  const [leftPanelWidth, setLeftPanelWidth] = useState(35); // percentage
  const [isResizing, setIsResizing] = useState(false);

  // Handle resizing
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
  }, []);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isResizing || !mainContainerRef.current) return;
    const containerRect = mainContainerRef.current.getBoundingClientRect();
    const newWidth = ((e.clientX - containerRect.left) / containerRect.width) * 100;
    setLeftPanelWidth(Math.min(Math.max(newWidth, 25), 50)); // Clamp between 25% and 50%
  }, [isResizing]);

  const handleMouseUp = useCallback(() => {
    setIsResizing(false);
  }, []);

  useEffect(() => {
    if (isResizing) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isResizing, handleMouseMove, handleMouseUp]);

  // Filter products based on search
  const filteredProducts = useMemo(() => {
    if (!searchQuery) return mockProducts;
    const query = searchQuery.toLowerCase();
    return mockProducts.filter(
      (p) =>
        p.name.toLowerCase().includes(query) ||
        p.serialNumber.toLowerCase().includes(query) ||
        (p.barcode && p.barcode.toLowerCase().includes(query))
    );
  }, [searchQuery]);

  // Product options for searchable select
  const productOptions = mockProducts.map((p) => ({
    value: p.id,
    label: `${p.name} (${p.serialNumber})`,
  }));

  // Handlers
  const handleAddProduct = (productId: string) => {
    const product = mockProducts.find((p) => p.id === productId);
    if (!product) return;

    const existing = selectedProducts.find((sp) => sp.product.id === productId);
    if (existing) {
      setSelectedProducts((prev) =>
        prev.map((sp) =>
          sp.product.id === productId ? { ...sp, quantity: sp.quantity + 1 } : sp
        )
      );
    } else {
      setSelectedProducts((prev) => [...prev, { product, quantity: 1 }]);
    }
  };

  const handleRemoveProduct = (productId: string) => {
    setSelectedProducts((prev) => prev.filter((sp) => sp.product.id !== productId));
  };

  const handleQuantityChange = (productId: string, delta: number) => {
    setSelectedProducts((prev) =>
      prev.map((sp) => {
        if (sp.product.id === productId) {
          const newQty = Math.max(1, sp.quantity + delta);
          return { ...sp, quantity: newQty };
        }
        return sp;
      })
    );
  };

  const handleCopyBarcode = (barcode: string) => {
    navigator.clipboard.writeText(barcode);
    setCopiedId(barcode);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Calculate total labels
  const totalLabels = selectedProducts.reduce((sum, sp) => sum + sp.quantity, 0);

  // Print handler
  const handlePrint = () => {
    if (!printRef.current || selectedProducts.length === 0) return;

    const printContent = printRef.current.innerHTML;
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Product Labels - Print</title>
          <style>
            @page {
              size: A4;
              margin: 8mm;
            }
            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
            }
            body {
              font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
              background: white;
              padding: 0;
            }
            .labels-container {
              display: grid;
              grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
              gap: 8px;
              width: 100%;
            }
            .label {
              border: 1px dashed #ccc;
              border-radius: 8px;
              padding: 8px;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              background: white;
              page-break-inside: avoid;
              min-width: 0;
            }
            .product-name {
              font-weight: 600;
              text-align: center;
              color: #1e293b;
              margin-bottom: 4px;
              line-height: 1.2;
              overflow: hidden;
              display: -webkit-box;
              -webkit-line-clamp: 2;
              -webkit-box-orient: vertical;
              word-break: break-word;
            }
            .sku-number {
              font-family: 'Courier New', monospace;
              color: #64748b;
              text-align: center;
              margin-bottom: 6px;
              font-size: 10px;
            }
            .barcode-wrapper {
              display: flex;
              justify-content: center;
              align-items: center;
              width: 100%;
            }
            .barcode-wrapper svg {
              max-width: 100%;
              height: auto;
            }
            .price-tag {
              font-weight: 700;
              color: #059669;
              margin-top: 4px;
              font-size: 11px;
            }
            @media print {
              @page {
                size: A4;
                margin: 8mm;
              }
              body {
                margin: 0;
                padding: 0;
              }
              .labels-container {
                gap: 6px;
              }
              .label {
                border: 1px dashed #666;
                width: 100%;
              }
              .sku-number {
                font-size: 9px;
              }
              .price-tag {
                font-size: 10px;
              }
            }
          </style>
        </head>
        <body>
          ${printContent}
        </body>
      </html>
    `);

    printWindow.document.close();
    printWindow.onload = () => {
      printWindow.focus();
      printWindow.print();
      printWindow.close();
    };
  };

  // Get label dimensions
  const labelDimensions = labelSizes[labelSize];

  // Font sizes based on label size
  const getFontSizes = () => {
    switch (labelSize) {
      case 'small':
        return { name: 10, sku: 8, price: 9, barcodeHeight: 30, barcodeWidth: 1.2 };
      case 'medium':
        return { name: 12, sku: 10, price: 11, barcodeHeight: 40, barcodeWidth: 1.5 };
      case 'large':
        return { name: 14, sku: 11, price: 13, barcodeHeight: 50, barcodeWidth: 1.8 };
      case 'xlarge':
        return { name: 16, sku: 12, price: 15, barcodeHeight: 60, barcodeWidth: 2 };
    }
  };

  const fontSizes = getFontSizes();

  return (
    <div className="h-[calc(100vh-7rem)] flex flex-col gap-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 flex-shrink-0">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/products')}
            className={`p-2 rounded-xl transition-colors ${
              theme === 'dark'
                ? 'hover:bg-slate-800 text-slate-400 hover:text-white'
                : 'hover:bg-slate-100 text-slate-600 hover:text-slate-900'
            }`}
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1
              className={`text-2xl lg:text-3xl font-bold ${
                theme === 'dark' ? 'text-white' : 'text-slate-900'
              }`}
            >
              Print Product Labels
            </h1>
            <p className={`mt-1 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
              Generate and print barcode labels for your products
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowSettings(!showSettings)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium transition-all ${
              showSettings
                ? 'bg-emerald-500 text-white'
                : theme === 'dark'
                ? 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <Settings2 className="w-5 h-5" />
            <span className="hidden sm:inline">Settings</span>
          </button>
          <button
            onClick={handlePrint}
            disabled={selectedProducts.length === 0}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-medium transition-all ${
              selectedProducts.length === 0
                ? 'bg-slate-300 text-slate-500 cursor-not-allowed'
                : 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white hover:opacity-90'
            }`}
          >
            <Printer className="w-5 h-5" />
            Print Labels
          </button>
        </div>
      </div>

      {/* Settings Panel */}
      {showSettings && (
        <div
          className={`p-4 rounded-2xl border flex-shrink-0 ${
            theme === 'dark'
              ? 'bg-slate-800/50 border-slate-700/50'
              : 'bg-white border-slate-200'
          }`}
        >
          <h3
            className={`text-lg font-semibold mb-4 ${
              theme === 'dark' ? 'text-white' : 'text-slate-900'
            }`}
          >
            Label Settings
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Label Size */}
            <div>
              <label
                className={`block text-sm font-medium mb-2 ${
                  theme === 'dark' ? 'text-slate-300' : 'text-slate-700'
                }`}
              >
                Label Size
              </label>
              <div className="grid grid-cols-2 gap-2">
                {Object.entries(labelSizes).map(([key, value]) => (
                  <button
                    key={key}
                    onClick={() => setLabelSize(key as LabelSize)}
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                      labelSize === key
                        ? 'bg-emerald-500 text-white'
                        : theme === 'dark'
                        ? 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    {value.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Display Options */}
            <div className="md:col-span-2 lg:col-span-3">
              <label
                className={`block text-sm font-medium mb-2 ${
                  theme === 'dark' ? 'text-slate-300' : 'text-slate-700'
                }`}
              >
                Display Options
              </label>
              <div className="flex flex-wrap gap-3">
                <label
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg cursor-pointer transition-all ${
                    showProductName
                      ? theme === 'dark'
                        ? 'bg-emerald-500/20 border-emerald-500/50 border'
                        : 'bg-emerald-50 border-emerald-500 border'
                      : theme === 'dark'
                      ? 'bg-slate-700/50 border-slate-600 border'
                      : 'bg-slate-50 border-slate-300 border'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={showProductName}
                    onChange={(e) => setShowProductName(e.target.checked)}
                    className="sr-only"
                  />
                  <div
                    className={`w-5 h-5 rounded flex items-center justify-center ${
                      showProductName
                        ? 'bg-emerald-500 text-white'
                        : theme === 'dark'
                        ? 'bg-slate-600'
                        : 'bg-slate-200'
                    }`}
                  >
                    {showProductName && <Check className="w-3 h-3" />}
                  </div>
                  <span
                    className={`text-sm font-medium ${
                      theme === 'dark' ? 'text-slate-300' : 'text-slate-700'
                    }`}
                  >
                    Product Name
                  </span>
                </label>

                <label
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg cursor-pointer transition-all ${
                    showSku
                      ? theme === 'dark'
                        ? 'bg-emerald-500/20 border-emerald-500/50 border'
                        : 'bg-emerald-50 border-emerald-500 border'
                      : theme === 'dark'
                      ? 'bg-slate-700/50 border-slate-600 border'
                      : 'bg-slate-50 border-slate-300 border'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={showSku}
                    onChange={(e) => setShowSku(e.target.checked)}
                    className="sr-only"
                  />
                  <div
                    className={`w-5 h-5 rounded flex items-center justify-center ${
                      showSku
                        ? 'bg-emerald-500 text-white'
                        : theme === 'dark'
                        ? 'bg-slate-600'
                        : 'bg-slate-200'
                    }`}
                  >
                    {showSku && <Check className="w-3 h-3" />}
                  </div>
                  <span
                    className={`text-sm font-medium ${
                      theme === 'dark' ? 'text-slate-300' : 'text-slate-700'
                    }`}
                  >
                    SKU Number
                  </span>
                </label>

                <label
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg cursor-pointer transition-all ${
                    showBarcode
                      ? theme === 'dark'
                        ? 'bg-emerald-500/20 border-emerald-500/50 border'
                        : 'bg-emerald-50 border-emerald-500 border'
                      : theme === 'dark'
                      ? 'bg-slate-700/50 border-slate-600 border'
                      : 'bg-slate-50 border-slate-300 border'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={showBarcode}
                    onChange={(e) => setShowBarcode(e.target.checked)}
                    className="sr-only"
                  />
                  <div
                    className={`w-5 h-5 rounded flex items-center justify-center ${
                      showBarcode
                        ? 'bg-emerald-500 text-white'
                        : theme === 'dark'
                        ? 'bg-slate-600'
                        : 'bg-slate-200'
                    }`}
                  >
                    {showBarcode && <Check className="w-3 h-3" />}
                  </div>
                  <span
                    className={`text-sm font-medium ${
                      theme === 'dark' ? 'text-slate-300' : 'text-slate-700'
                    }`}
                  >
                    Barcode
                  </span>
                </label>

                <label
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg cursor-pointer transition-all ${
                    showPrice
                      ? theme === 'dark'
                        ? 'bg-emerald-500/20 border-emerald-500/50 border'
                        : 'bg-emerald-50 border-emerald-500 border'
                      : theme === 'dark'
                      ? 'bg-slate-700/50 border-slate-600 border'
                      : 'bg-slate-50 border-slate-300 border'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={showPrice}
                    onChange={(e) => setShowPrice(e.target.checked)}
                    className="sr-only"
                  />
                  <div
                    className={`w-5 h-5 rounded flex items-center justify-center ${
                      showPrice
                        ? 'bg-emerald-500 text-white'
                        : theme === 'dark'
                        ? 'bg-slate-600'
                        : 'bg-slate-200'
                    }`}
                  >
                    {showPrice && <Check className="w-3 h-3" />}
                  </div>
                  <span
                    className={`text-sm font-medium ${
                      theme === 'dark' ? 'text-slate-300' : 'text-slate-700'
                    }`}
                  >
                    Price
                  </span>
                </label>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Content - Resizable Split Panel */}
      <div 
        ref={mainContainerRef}
        className={`flex-1 flex min-h-0 ${isResizing ? 'select-none' : ''}`}
      >
        {/* Left Panel - Product Selection */}
        <div
          className={`rounded-2xl border flex flex-col overflow-hidden ${
            theme === 'dark'
              ? 'bg-slate-800/30 border-slate-700/50'
              : 'bg-white border-slate-200'
          }`}
          style={{ width: `${leftPanelWidth}%` }}
        >
          <div className={`p-4 border-b flex-shrink-0 ${theme === 'dark' ? 'border-slate-700/50' : 'border-slate-200'}`}>
            <h3
              className={`text-lg font-semibold mb-4 flex items-center gap-2 ${
                theme === 'dark' ? 'text-white' : 'text-slate-900'
              }`}
            >
              <Package className="w-5 h-5 text-emerald-500" />
              Select Products
            </h3>

            {/* Search Products */}
            <div
              className={`flex items-center gap-2 px-3 py-2 rounded-xl border mb-4 ${
                theme === 'dark'
                  ? 'bg-slate-800/50 border-slate-700/50'
                  : 'bg-slate-50 border-slate-200'
              }`}
            >
              <Search
                className={`w-4 h-4 ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}
              />
              <input
                type="text"
                placeholder="Search products..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={`bg-transparent border-none outline-none flex-1 text-sm ${
                  theme === 'dark'
                    ? 'text-white placeholder-slate-500'
                    : 'text-slate-900 placeholder-slate-400'
                }`}
              />
            </div>

            {/* Quick Add */}
            <div className="w-full">
              <SearchableSelect
                options={productOptions}
                value=""
                onValueChange={(value) => {
                  if (value) handleAddProduct(value);
                }}
                placeholder="Quick add product..."
                searchPlaceholder="Search products..."
                emptyMessage="No products found"
                theme={theme}
              />
            </div>
          </div>

          {/* Product List */}
          <div className="flex-1 overflow-y-auto">
            {filteredProducts.map((product) => {
              const isSelected = selectedProducts.some((sp) => sp.product.id === product.id);
              const selectedItem = selectedProducts.find((sp) => sp.product.id === product.id);

              return (
                <div
                  key={product.id}
                  className={`p-3 border-b transition-colors ${
                    theme === 'dark'
                      ? 'border-slate-700/50 hover:bg-slate-800/50'
                      : 'border-slate-100 hover:bg-slate-50'
                  } ${isSelected ? (theme === 'dark' ? 'bg-emerald-500/10' : 'bg-emerald-50') : ''}`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p
                        className={`font-medium truncate ${
                          theme === 'dark' ? 'text-white' : 'text-slate-900'
                        }`}
                      >
                        {product.name}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <span
                          className={`text-xs font-mono ${
                            theme === 'dark' ? 'text-slate-500' : 'text-slate-400'
                          }`}
                        >
                          {product.serialNumber}
                        </span>
                        {product.barcode && (
                          <button
                            onClick={() => handleCopyBarcode(product.barcode!)}
                            className={`flex items-center gap-1 text-xs px-1.5 py-0.5 rounded ${
                              copiedId === product.barcode
                                ? 'bg-emerald-500/20 text-emerald-500'
                                : theme === 'dark'
                                ? 'bg-slate-700/50 text-slate-400 hover:text-white'
                                : 'bg-slate-100 text-slate-500 hover:text-slate-700'
                            }`}
                            title="Copy barcode"
                          >
                            {copiedId === product.barcode ? (
                              <CheckCircle className="w-3 h-3" />
                            ) : (
                              <Copy className="w-3 h-3" />
                            )}
                            <span className="font-mono">{product.barcode}</span>
                          </button>
                        )}
                      </div>
                    </div>

                    {isSelected ? (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleQuantityChange(product.id, -1)}
                          className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                            theme === 'dark'
                              ? 'bg-slate-700 hover:bg-slate-600 text-white'
                              : 'bg-slate-200 hover:bg-slate-300 text-slate-700'
                          }`}
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span
                          className={`w-8 text-center font-semibold ${
                            theme === 'dark' ? 'text-white' : 'text-slate-900'
                          }`}
                        >
                          {selectedItem?.quantity || 0}
                        </span>
                        <button
                          onClick={() => handleQuantityChange(product.id, 1)}
                          className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                            theme === 'dark'
                              ? 'bg-slate-700 hover:bg-slate-600 text-white'
                              : 'bg-slate-200 hover:bg-slate-300 text-slate-700'
                          }`}
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                        <button
                          onClick={() => handleRemoveProduct(product.id)}
                          className="w-7 h-7 rounded-lg flex items-center justify-center bg-red-500/10 text-red-500 hover:bg-red-500/20"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => handleAddProduct(product.id)}
                        className="px-3 py-1.5 rounded-lg text-sm font-medium bg-emerald-500 text-white hover:bg-emerald-600 transition-colors"
                      >
                        Add
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Resizer Handle */}
        <div
          onMouseDown={handleMouseDown}
          className={`w-3 cursor-col-resize flex items-center justify-center transition-colors flex-shrink-0 mx-1 rounded-full ${
            isResizing
              ? 'bg-emerald-500'
              : theme === 'dark' ? 'bg-slate-700 hover:bg-emerald-500/50' : 'bg-slate-200 hover:bg-emerald-500/50'
          }`}
        >
          <GripVertical className={`w-4 h-4 ${isResizing ? 'text-white' : 'text-slate-400'}`} />
        </div>

        {/* Right Panel - Label Preview */}
        <div
          className={`rounded-2xl border flex flex-col overflow-hidden ${
            theme === 'dark'
              ? 'bg-slate-800/30 border-slate-700/50'
              : 'bg-white border-slate-200'
          }`}
          style={{ width: `${100 - leftPanelWidth}%` }}
        >
          <div
            className={`p-4 border-b flex items-center justify-between flex-shrink-0 ${
              theme === 'dark' ? 'border-slate-700/50' : 'border-slate-200'
            }`}
          >
            <h3
              className={`text-lg font-semibold flex items-center gap-2 ${
                theme === 'dark' ? 'text-white' : 'text-slate-900'
              }`}
            >
              <Tag className="w-5 h-5 text-emerald-500" />
              Label Preview
            </h3>
            {totalLabels > 0 && (
              <span
                className={`px-3 py-1 rounded-full text-sm font-medium ${
                  theme === 'dark' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-emerald-100 text-emerald-600'
                }`}
              >
                {totalLabels} {totalLabels === 1 ? 'Label' : 'Labels'}
              </span>
            )}
          </div>

          {selectedProducts.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center p-8">
              <div
                className={`w-20 h-20 rounded-2xl flex items-center justify-center mb-4 ${
                  theme === 'dark' ? 'bg-slate-800' : 'bg-slate-100'
                }`}
              >
                <Barcode
                  className={`w-10 h-10 ${theme === 'dark' ? 'text-slate-600' : 'text-slate-400'}`}
                />
              </div>
              <p
                className={`text-lg font-medium ${
                  theme === 'dark' ? 'text-slate-400' : 'text-slate-600'
                }`}
              >
                No products selected
              </p>
              <p
                className={`text-sm mt-1 ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}
              >
                Select products from the list to generate labels
              </p>
            </div>
          ) : (
            <div className="flex-1 flex flex-col p-4 overflow-hidden">
              {/* Preview Area */}
              <div
                className={`flex-1 p-6 rounded-xl overflow-auto ${
                  theme === 'dark' ? 'bg-slate-900/50' : 'bg-slate-50'
                }`}
              >
                <div ref={printRef}>
                  <div 
                    className="labels-container grid gap-3"
                    style={{
                      gridTemplateColumns: `repeat(auto-fill, minmax(${labelDimensions.width}px, 1fr))`,
                    }}
                  >
                    {selectedProducts.flatMap((sp) =>
                      Array.from({ length: sp.quantity }).map((_, idx) => (
                        <div
                          key={`${sp.product.id}-${idx}`}
                          className="label bg-white rounded-lg border border-dashed border-slate-300 flex flex-col items-center justify-center p-2"
                          style={{
                            width: labelDimensions.width,
                            height: labelDimensions.height,
                          }}
                        >
                          {showProductName && (
                            <div
                              className="product-name text-slate-900 text-center font-semibold leading-tight mb-1"
                              style={{
                                fontSize: fontSizes.name,
                                maxWidth: '100%',
                                overflow: 'hidden',
                                display: '-webkit-box',
                                WebkitLineClamp: 2,
                                WebkitBoxOrient: 'vertical',
                              }}
                            >
                              {sp.product.name}
                            </div>
                          )}
                          {showSku && (
                            <div
                              className="sku-number text-slate-500 font-mono mb-1"
                              style={{ fontSize: fontSizes.sku }}
                            >
                              SKU: {sp.product.serialNumber}
                            </div>
                          )}
                          {showBarcode && sp.product.barcode && (
                            <div className="barcode-wrapper">
                              <BarcodeDisplay
                                value={sp.product.barcode}
                                width={fontSizes.barcodeWidth}
                                height={fontSizes.barcodeHeight}
                              />
                            </div>
                          )}
                          {showPrice && (
                            <div
                              className="price-tag text-emerald-600 font-bold mt-1"
                              style={{ fontSize: fontSizes.price }}
                            >
                              Rs. {sp.product.price.toLocaleString('en-LK')}
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>

              {/* Selected Products Summary */}
              <div className={`mt-4 pt-4 space-y-2 flex-shrink-0 border-t ${theme === 'dark' ? 'border-slate-700/50' : 'border-slate-200'}`}>
                <h4
                  className={`text-sm font-medium ${
                    theme === 'dark' ? 'text-slate-400' : 'text-slate-600'
                  }`}
                >
                  Selected Products ({selectedProducts.length})
                </h4>
                <div className="flex flex-wrap gap-2 max-h-24 overflow-y-auto">
                  {selectedProducts.map((sp) => (
                    <div
                      key={sp.product.id}
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-lg ${
                        theme === 'dark' ? 'bg-slate-800' : 'bg-slate-100'
                      }`}
                    >
                      <span
                        className={`text-sm font-medium ${
                          theme === 'dark' ? 'text-white' : 'text-slate-900'
                        }`}
                      >
                        {sp.product.name}
                      </span>
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full ${
                          theme === 'dark'
                            ? 'bg-emerald-500/20 text-emerald-400'
                            : 'bg-emerald-100 text-emerald-600'
                        }`}
                      >
                        ×{sp.quantity}
                      </span>
                      <button
                        onClick={() => handleRemoveProduct(sp.product.id)}
                        className={`p-1 rounded hover:bg-red-500/20 text-red-500`}
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProductLabels;
