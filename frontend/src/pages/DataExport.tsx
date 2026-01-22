import React, { useState, useMemo } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { 
  Database, 
  Download, 
  FileCode2, 
  Package, 
  Info,
  ArrowRight,
  FileSpreadsheet,
  Check,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  CheckCircle2,
  Circle
} from 'lucide-react';
import {
  dataExportConfigs,
  generateCSV,
  generateMySQLSchema,
  generateCompleteTableSQL,
  generateCombinedCSV,
  downloadCSV,
  downloadSQL,
  getAvailableExports,
  type CSVExportConfig
} from '../services/csvExportService';
import {
  mockProducts,
  mockCustomers,
  mockSuppliers,
  mockInvoices,
  mockGRNs,
  mockServices,
  mockJobNotes,
  mockWarrantyClaims,
  mockCashAccounts,
  mockCashTransactions,
  mockEstimates,
  mockQuotations
} from '../data/mockData';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyRecord = Record<string, any>;

// Map config keys to actual mock data
const getDataForExport = (key: string): AnyRecord[] => {
  switch (key) {
    case 'products':
      return mockProducts as AnyRecord[];
    case 'customers':
      return mockCustomers as AnyRecord[];
    case 'suppliers':
      return mockSuppliers as AnyRecord[];
    case 'invoices':
      return mockInvoices as AnyRecord[];
    case 'invoice_items':
      // Flatten invoice items with invoice reference
      return mockInvoices.flatMap(inv => 
        (inv.items || []).map(item => ({
          invoiceId: inv.id,
          ...item
        }))
      ) as AnyRecord[];
    case 'grns':
      return mockGRNs as AnyRecord[];
    case 'services':
      return mockServices as AnyRecord[];
    case 'job_notes':
      return mockJobNotes as AnyRecord[];
    case 'warranty_claims':
      return mockWarrantyClaims as AnyRecord[];
    case 'cash_accounts':
      return mockCashAccounts as AnyRecord[];
    case 'cash_transactions':
      return mockCashTransactions as AnyRecord[];
    case 'estimates':
      return mockEstimates as AnyRecord[];
    case 'quotations':
      return mockQuotations as AnyRecord[];
    default:
      return [];
  }
};

export const DataExport: React.FC = () => {
  const { theme } = useTheme();
  const [selectedTables, setSelectedTables] = useState<Set<string>>(new Set());
  const [expandedTable, setExpandedTable] = useState<string | null>(null);
  const [exportStatus, setExportStatus] = useState<{ table: string; success: boolean }[]>([]);

  const availableExports = useMemo(() => getAvailableExports(), []);

  const toggleTableSelection = (key: string) => {
    const newSet = new Set(selectedTables);
    if (newSet.has(key)) {
      newSet.delete(key);
    } else {
      newSet.add(key);
    }
    setSelectedTables(newSet);
  };

  const selectAll = () => {
    if (selectedTables.size === availableExports.length) {
      setSelectedTables(new Set());
    } else {
      setSelectedTables(new Set(availableExports.map(e => e.key)));
    }
  };

  const handleExportCSV = (key: string, config: CSVExportConfig) => {
    try {
      const data = getDataForExport(key);
      const csvContent = generateCSV(data, config);
      downloadCSV(csvContent, `ecotec_${config.tableName}.csv`);
      setExportStatus(prev => [...prev.filter(s => s.table !== key), { table: key, success: true }]);
    } catch (error) {
      console.error(`Error exporting ${key}:`, error);
      setExportStatus(prev => [...prev.filter(s => s.table !== key), { table: key, success: false }]);
    }
  };

  // Export all selected tables into a single combined CSV file
  const handleExportAllCSV = () => {
    try {
      const datasets = Array.from(selectedTables).map(key => {
        const config = dataExportConfigs[key];
        const data = getDataForExport(key);
        return { key, data, config };
      });
      
      const combinedCSV = generateCombinedCSV(datasets);
      downloadCSV(combinedCSV, 'ecotec_all_data.csv');
      
      // Mark all as successful
      selectedTables.forEach(key => {
        setExportStatus(prev => [...prev.filter(s => s.table !== key), { table: key, success: true }]);
      });
    } catch (error) {
      console.error('Error exporting combined CSV:', error);
    }
  };

  // Download schema SQL file for a single table
  const handleDownloadSchemaSQL = (key: string, config: CSVExportConfig) => {
    try {
      let schemaContent = `-- ECOTEC Computer Shop - ${config.displayName} Schema\n`;
      schemaContent += `-- Generated on: ${new Date().toISOString()}\n`;
      schemaContent += `-- Table: ${config.tableName}\n\n`;
      schemaContent += `SET NAMES utf8mb4;\n\n`;
      schemaContent += `DROP TABLE IF EXISTS \`${config.tableName}\`;\n\n`;
      schemaContent += generateMySQLSchema(config);
      schemaContent += '\n';
      
      downloadSQL(schemaContent, `ecotec_${config.tableName}_schema.sql`);
    } catch (error) {
      console.error(`Error downloading schema for ${key}:`, error);
    }
  };

  // Download complete SQL file with CREATE TABLE + INSERT statements for a single table
  const handleDownloadTableSQL = (key: string, config: CSVExportConfig) => {
    try {
      const data = getDataForExport(key);
      const sqlContent = generateCompleteTableSQL(data, config);
      downloadSQL(sqlContent, `ecotec_${config.tableName}_complete.sql`);
      setExportStatus(prev => [...prev.filter(s => s.table !== key), { table: key, success: true }]);
    } catch (error) {
      console.error(`Error exporting ${key}:`, error);
      setExportStatus(prev => [...prev.filter(s => s.table !== key), { table: key, success: false }]);
    }
  };

  const handleExportSchema = () => {
    let schemaContent = `-- ECOTEC Computer Shop Database Schema\n`;
    schemaContent += `-- Generated on: ${new Date().toISOString()}\n`;
    schemaContent += `-- This schema is designed for MySQL 8.0+\n\n`;
    schemaContent += `SET NAMES utf8mb4;\nSET FOREIGN_KEY_CHECKS = 0;\n\n`;

    selectedTables.forEach(key => {
      const config = dataExportConfigs[key];
      if (config) {
        schemaContent += `-- Table: ${config.displayName}\n`;
        schemaContent += `DROP TABLE IF EXISTS \`${config.tableName}\`;\n`;
        schemaContent += generateMySQLSchema(config);
        schemaContent += `\n\n`;
      }
    });

    schemaContent += `SET FOREIGN_KEY_CHECKS = 1;\n`;
    downloadSQL(schemaContent, 'ecotec_schema.sql');
  };

  // Download complete SQL with all selected tables (CREATE TABLE + INSERT statements)
  const handleExportCompleteSQL = () => {
    let sqlContent = `-- ECOTEC Computer Shop - Complete Database Export\n`;
    sqlContent += `-- Generated on: ${new Date().toISOString()}\n`;
    sqlContent += `-- This file contains CREATE TABLE and INSERT statements\n`;
    sqlContent += `-- Tables included: ${selectedTables.size}\n\n`;
    sqlContent += `SET NAMES utf8mb4;\n`;
    sqlContent += `SET FOREIGN_KEY_CHECKS = 0;\n\n`;

    selectedTables.forEach(key => {
      const config = dataExportConfigs[key];
      if (config) {
        const data = getDataForExport(key);
        sqlContent += generateCompleteTableSQL(data, config);
        sqlContent += `\n\n`;
      }
    });

    sqlContent += `SET FOREIGN_KEY_CHECKS = 1;\n`;
    sqlContent += `\n-- Import completed successfully!\n`;
    downloadSQL(sqlContent, 'ecotec_complete_import.sql');
    
    // Mark all as successful
    selectedTables.forEach(key => {
      setExportStatus(prev => [...prev.filter(s => s.table !== key), { table: key, success: true }]);
    });
  };

  const getRecordCount = (key: string): number => {
    return getDataForExport(key).length;
  };

  return (
    <div className="space-y-6 pb-8">
      {/* Page Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className={`text-2xl lg:text-3xl font-bold ${
            theme === 'dark' ? 'text-white' : 'text-slate-900'
          }`}>
            Data Export for MySQL
          </h1>
          <p className={`mt-1 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
            Export mock data as CSV files compatible with MySQL import
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={selectAll}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border transition-all ${
              theme === 'dark'
                ? 'bg-slate-800/50 border-slate-700/50 hover:bg-slate-700/50 text-slate-300'
                : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-700'
            }`}
          >
            {selectedTables.size === availableExports.length ? (
              <>
                <Circle className="w-4 h-4" />
                Deselect All
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4" />
                Select All
              </>
            )}
          </button>
        </div>
      </div>

      {/* Info Banner */}
      <div className={`rounded-2xl border p-4 ${
        theme === 'dark' 
          ? 'bg-blue-500/10 border-blue-500/30' 
          : 'bg-blue-50 border-blue-200'
      }`}>
        <div className="flex gap-3">
          <Info className={`w-5 h-5 flex-shrink-0 mt-0.5 ${
            theme === 'dark' ? 'text-blue-400' : 'text-blue-600'
          }`} />
          <div>
            <h3 className={`font-semibold ${theme === 'dark' ? 'text-blue-300' : 'text-blue-800'}`}>
              How to Use This Feature
            </h3>
            <p className={`text-sm mt-1 ${theme === 'dark' ? 'text-blue-300/80' : 'text-blue-700'}`}>
              Since this is a frontend-only demo, the data comes from mock data (src/data/mockData.ts). 
              You can export this data as CSV files and import them into MySQL using the provided schema and import statements.
            </p>
            <div className="flex flex-wrap gap-4 mt-3 text-sm">
              <div className="flex items-center gap-2">
                <span className={`font-medium ${theme === 'dark' ? 'text-blue-200' : 'text-blue-700'}`}>Step 1:</span>
                <span className={theme === 'dark' ? 'text-blue-300/80' : 'text-blue-600'}>Download Schema SQL</span>
              </div>
              <ArrowRight className={`w-4 h-4 ${theme === 'dark' ? 'text-blue-400' : 'text-blue-500'}`} />
              <div className="flex items-center gap-2">
                <span className={`font-medium ${theme === 'dark' ? 'text-blue-200' : 'text-blue-700'}`}>Step 2:</span>
                <span className={theme === 'dark' ? 'text-blue-300/80' : 'text-blue-600'}>Download CSV Files</span>
              </div>
              <ArrowRight className={`w-4 h-4 ${theme === 'dark' ? 'text-blue-400' : 'text-blue-500'}`} />
              <div className="flex items-center gap-2">
                <span className={`font-medium ${theme === 'dark' ? 'text-blue-200' : 'text-blue-700'}`}>Step 3:</span>
                <span className={theme === 'dark' ? 'text-blue-300/80' : 'text-blue-600'}>Run SQL in MySQL</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Export Actions */}
      {selectedTables.size > 0 && (
        <div className={`rounded-2xl border p-4 ${
          theme === 'dark' 
            ? 'bg-gradient-to-br from-emerald-500/10 to-blue-500/10 border-emerald-500/30' 
            : 'bg-gradient-to-br from-emerald-50 to-blue-50 border-emerald-200'
        }`}>
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <h3 className={`font-semibold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                {selectedTables.size} table{selectedTables.size > 1 ? 's' : ''} selected
              </h3>
              <p className={`text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                Choose an export action below
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <button
                onClick={handleExportSchema}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border transition-all ${
                  theme === 'dark'
                    ? 'bg-slate-800/70 border-slate-700/50 hover:bg-slate-700/70 text-slate-300'
                    : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-700'
                }`}
              >
                <FileCode2 className="w-4 h-4" />
                Download Schema SQL
              </button>
              <button
                onClick={handleExportCompleteSQL}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border transition-all ${
                  theme === 'dark'
                    ? 'bg-purple-500/20 border-purple-500/30 hover:bg-purple-500/30 text-purple-300'
                    : 'bg-purple-50 border-purple-200 hover:bg-purple-100 text-purple-700'
                }`}
              >
                <Database className="w-4 h-4" />
                Download Complete SQL
              </button>
              <button
                onClick={handleExportAllCSV}
                className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-emerald-500 to-blue-500 text-white rounded-xl font-medium shadow-lg hover:shadow-emerald-500/25 transition-all"
              >
                <Download className="w-4 h-4" />
                Export All as CSV
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Data Tables Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {availableExports.map(({ key, config }) => {
          const isSelected = selectedTables.has(key);
          const isExpanded = expandedTable === key;
          const recordCount = getRecordCount(key);
          const exportResult = exportStatus.find(s => s.table === key);

          return (
            <div
              key={key}
              className={`relative overflow-hidden rounded-2xl border transition-all ${
                isSelected
                  ? theme === 'dark'
                    ? 'bg-gradient-to-br from-emerald-500/10 to-blue-500/10 border-emerald-500/50'
                    : 'bg-gradient-to-br from-emerald-50 to-blue-50 border-emerald-300'
                  : theme === 'dark'
                    ? 'bg-slate-800/50 border-slate-700/50 hover:border-slate-600/50'
                    : 'bg-white border-slate-200 hover:border-slate-300'
              }`}
            >
              {/* Card Header - Clickable for selection */}
              <div
                onClick={() => toggleTableSelection(key)}
                className="p-4 cursor-pointer"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{config.icon}</span>
                    <div>
                      <h3 className={`font-semibold ${
                        theme === 'dark' ? 'text-white' : 'text-slate-900'
                      }`}>
                        {config.displayName}
                      </h3>
                      <p className={`text-sm ${
                        theme === 'dark' ? 'text-slate-400' : 'text-slate-600'
                      }`}>
                        {config.description}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {exportResult && (
                      exportResult.success ? (
                        <CheckCircle2 className="w-5 h-5 text-green-500" />
                      ) : (
                        <AlertCircle className="w-5 h-5 text-red-500" />
                      )
                    )}
                    <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                      isSelected
                        ? 'bg-emerald-500 border-emerald-500'
                        : theme === 'dark'
                          ? 'border-slate-600'
                          : 'border-slate-300'
                    }`}>
                      {isSelected && <Check className="w-4 h-4 text-white" />}
                    </div>
                  </div>
                </div>

                {/* Stats */}
                <div className="flex items-center gap-4 mt-3">
                  <div className={`flex items-center gap-1.5 text-sm ${
                    theme === 'dark' ? 'text-slate-400' : 'text-slate-600'
                  }`}>
                    <Package className="w-4 h-4" />
                    <span>{recordCount} records</span>
                  </div>
                  <div className={`flex items-center gap-1.5 text-sm ${
                    theme === 'dark' ? 'text-slate-400' : 'text-slate-600'
                  }`}>
                    <Database className="w-4 h-4" />
                    <span>{config.columns.length} columns</span>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className={`flex items-center gap-2 px-4 py-3 border-t ${
                theme === 'dark' ? 'border-slate-700/50' : 'border-slate-200'
              }`}>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleExportCSV(key, config);
                  }}
                  className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-all ${
                    theme === 'dark'
                      ? 'bg-slate-700/50 hover:bg-slate-700 text-slate-300'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                  }`}
                  title="Download CSV file"
                >
                  <FileSpreadsheet className="w-4 h-4" />
                  CSV
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDownloadSchemaSQL(key, config);
                  }}
                  className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-all ${
                    theme === 'dark'
                      ? 'bg-slate-700/50 hover:bg-slate-700 text-slate-300'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                  }`}
                  title="Download CREATE TABLE SQL"
                >
                  <FileCode2 className="w-4 h-4" />
                  Schema
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDownloadTableSQL(key, config);
                  }}
                  className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-all ${
                    theme === 'dark'
                      ? 'bg-purple-500/20 hover:bg-purple-500/30 text-purple-300'
                      : 'bg-purple-50 hover:bg-purple-100 text-purple-700'
                  }`}
                  title="Download CREATE TABLE + INSERT SQL"
                >
                  <Database className="w-4 h-4" />
                  SQL
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setExpandedTable(isExpanded ? null : key);
                  }}
                  className={`p-2 rounded-xl transition-all ${
                    theme === 'dark'
                      ? 'bg-slate-700/50 hover:bg-slate-700 text-slate-300'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                  }`}
                >
                  {isExpanded ? (
                    <ChevronUp className="w-4 h-4" />
                  ) : (
                    <ChevronDown className="w-4 h-4" />
                  )}
                </button>
              </div>

              {/* Expanded Column Details */}
              {isExpanded && (
                <div className={`px-4 pb-4 pt-2 border-t ${
                  theme === 'dark' ? 'border-slate-700/50' : 'border-slate-200'
                }`}>
                  <h4 className={`text-xs font-semibold uppercase tracking-wider mb-2 ${
                    theme === 'dark' ? 'text-slate-500' : 'text-slate-400'
                  }`}>
                    Columns ({config.columns.length})
                  </h4>
                  <div className="space-y-1 max-h-48 overflow-y-auto">
                    {config.columns.map((col, idx) => (
                      <div
                        key={idx}
                        className={`flex items-center justify-between py-1 px-2 rounded text-sm ${
                          theme === 'dark' ? 'hover:bg-slate-700/30' : 'hover:bg-slate-50'
                        }`}
                      >
                        <span className={theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}>
                          {col.header}
                        </span>
                        <span className={`text-xs px-2 py-0.5 rounded ${
                          col.type === 'number'
                            ? 'bg-blue-500/20 text-blue-400'
                            : col.type === 'date' || col.type === 'datetime'
                              ? 'bg-purple-500/20 text-purple-400'
                              : col.type === 'boolean'
                                ? 'bg-amber-500/20 text-amber-400'
                                : col.type === 'json'
                                  ? 'bg-orange-500/20 text-orange-400'
                                  : 'bg-slate-500/20 text-slate-400'
                        }`}>
                          {col.type}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* MySQL Import Instructions */}
      <div className={`relative overflow-hidden rounded-2xl border p-6 ${
        theme === 'dark' 
          ? 'bg-gradient-to-br from-slate-800/50 to-slate-900/50 border-slate-700/50' 
          : 'bg-white border-slate-200 shadow-sm'
      }`}>
        <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-emerald-500/10 to-blue-500/5 rounded-full blur-3xl" />
        <div className="relative">
          <h2 className={`text-xl font-bold mb-4 flex items-center gap-2 ${
            theme === 'dark' ? 'text-white' : 'text-slate-900'
          }`}>
            <Database className="w-5 h-5 text-emerald-500" />
            MySQL Import Instructions
          </h2>

          <div className="space-y-4">
            <div className={`rounded-xl p-4 ${
              theme === 'dark' ? 'bg-slate-800/50' : 'bg-slate-50'
            }`}>
              <h3 className={`font-semibold mb-2 ${
                theme === 'dark' ? 'text-emerald-400' : 'text-emerald-600'
              }`}>
                1. Create the Database
              </h3>
              <pre className={`text-sm overflow-x-auto p-3 rounded-lg ${
                theme === 'dark' ? 'bg-slate-900 text-slate-300' : 'bg-white text-slate-700 border'
              }`}>
{`CREATE DATABASE IF NOT EXISTS ecotec_db
CHARACTER SET utf8mb4
COLLATE utf8mb4_unicode_ci;

USE ecotec_db;`}
              </pre>
            </div>

            <div className={`rounded-xl p-4 ${
              theme === 'dark' ? 'bg-slate-800/50' : 'bg-slate-50'
            }`}>
              <h3 className={`font-semibold mb-2 ${
                theme === 'dark' ? 'text-emerald-400' : 'text-emerald-600'
              }`}>
                2. Run the Schema SQL
              </h3>
              <pre className={`text-sm overflow-x-auto p-3 rounded-lg ${
                theme === 'dark' ? 'bg-slate-900 text-slate-300' : 'bg-white text-slate-700 border'
              }`}>
{`-- In MySQL command line or workbench
SOURCE ecotec_schema.sql;`}
              </pre>
            </div>

            <div className={`rounded-xl p-4 ${
              theme === 'dark' ? 'bg-slate-800/50' : 'bg-slate-50'
            }`}>
              <h3 className={`font-semibold mb-2 ${
                theme === 'dark' ? 'text-emerald-400' : 'text-emerald-600'
              }`}>
                3. Import CSV Files (Option A - MySQL Workbench)
              </h3>
              <p className={`text-sm mb-2 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                Right-click on the table → Table Data Import Wizard → Select CSV file
              </p>
            </div>

            <div className={`rounded-xl p-4 ${
              theme === 'dark' ? 'bg-slate-800/50' : 'bg-slate-50'
            }`}>
              <h3 className={`font-semibold mb-2 ${
                theme === 'dark' ? 'text-emerald-400' : 'text-emerald-600'
              }`}>
                3. Import CSV Files (Option B - Command Line)
              </h3>
              <pre className={`text-sm overflow-x-auto p-3 rounded-lg ${
                theme === 'dark' ? 'bg-slate-900 text-slate-300' : 'bg-white text-slate-700 border'
              }`}>
{`mysql --local-infile=1 -u root -p ecotec_db

-- Then run:
SOURCE ecotec_import.sql;`}
              </pre>
            </div>

            <div className={`rounded-xl p-4 border ${
              theme === 'dark' 
                ? 'bg-amber-500/10 border-amber-500/30' 
                : 'bg-amber-50 border-amber-200'
            }`}>
              <h3 className={`font-semibold mb-2 flex items-center gap-2 ${
                theme === 'dark' ? 'text-amber-400' : 'text-amber-700'
              }`}>
                <AlertCircle className="w-4 h-4" />
                Note
              </h3>
              <p className={`text-sm ${theme === 'dark' ? 'text-amber-300/80' : 'text-amber-700'}`}>
                This export is for demonstration purposes only. The data comes from mock data in the frontend. 
                In a production environment, you would export directly from your actual database.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DataExport;
