// CSV Export Service for MySQL Import
// This service converts mock data to CSV format compatible with MySQL import

export interface CSVExportConfig {
  tableName: string;
  displayName: string;
  description: string;
  icon: string;
  columns: {
    field: string;
    header: string;
    type: 'string' | 'number' | 'date' | 'datetime' | 'boolean' | 'json';
  }[];
}

// Escape CSV values properly for MySQL compatibility
const escapeCSVValue = (value: unknown, type: string): string => {
  if (value === null || value === undefined) {
    return 'NULL';
  }

  if (type === 'json') {
    // For JSON/array data, stringify and escape
    const jsonStr = JSON.stringify(value);
    return `"${jsonStr.replace(/"/g, '""')}"`;
  }

  if (type === 'boolean') {
    return value ? '1' : '0';
  }

  if (type === 'number') {
    return String(value);
  }

  if (type === 'date' || type === 'datetime') {
    if (!value) return 'NULL';
    const date = new Date(value as string);
    if (isNaN(date.getTime())) return 'NULL';
    if (type === 'date') {
      return `"${date.toISOString().split('T')[0]}"`;
    }
    return `"${date.toISOString().replace('T', ' ').replace('Z', '')}"`;
  }

  // String type - escape quotes and wrap in quotes
  const strValue = String(value);
  return `"${strValue.replace(/"/g, '""').replace(/\n/g, '\\n').replace(/\r/g, '\\r')}"`;
};

// Generate CSV content from data
export const generateCSV = <T extends Record<string, unknown>>(
  data: T[],
  config: CSVExportConfig
): string => {
  // Header row
  const headers = config.columns.map(col => col.header).join(',');
  
  // Data rows
  const rows = data.map(item => {
    return config.columns.map(col => {
      const value = getNestedValue(item, col.field);
      return escapeCSVValue(value, col.type);
    }).join(',');
  });

  return [headers, ...rows].join('\n');
};

// Get nested object value using dot notation
const getNestedValue = (obj: Record<string, unknown>, path: string): unknown => {
  return path.split('.').reduce((current: unknown, key) => {
    if (current && typeof current === 'object' && key in (current as Record<string, unknown>)) {
      return (current as Record<string, unknown>)[key];
    }
    return undefined;
  }, obj);
};

// Generate MySQL CREATE TABLE statement
export const generateMySQLSchema = (config: CSVExportConfig): string => {
  const columnDefs = config.columns.map(col => {
    let mysqlType = 'VARCHAR(255)';
    switch (col.type) {
      case 'number':
        mysqlType = 'DECIMAL(15,2)';
        break;
      case 'date':
        mysqlType = 'DATE';
        break;
      case 'datetime':
        mysqlType = 'DATETIME';
        break;
      case 'boolean':
        mysqlType = 'TINYINT(1)';
        break;
      case 'json':
        mysqlType = 'JSON';
        break;
      case 'string':
      default:
        if (col.field === 'id') {
          mysqlType = 'VARCHAR(50) PRIMARY KEY';
        } else if (col.field.includes('description') || col.field.includes('notes') || col.field.includes('address')) {
          mysqlType = 'TEXT';
        } else if (col.field.includes('email')) {
          mysqlType = 'VARCHAR(100)';
        } else if (col.field.includes('phone')) {
          mysqlType = 'VARCHAR(20)';
        }
    }
    return `  \`${col.header}\` ${mysqlType}`;
  });

  return `CREATE TABLE IF NOT EXISTS \`${config.tableName}\` (\n${columnDefs.join(',\n')}\n) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`;
};

// Generate MySQL LOAD DATA statement
export const generateMySQLLoadStatement = (config: CSVExportConfig, filename: string): string => {
  return `LOAD DATA LOCAL INFILE '${filename}'
INTO TABLE \`${config.tableName}\`
FIELDS TERMINATED BY ','
ENCLOSED BY '"'
LINES TERMINATED BY '\\n'
IGNORE 1 ROWS;`;
};

// Escape SQL string values
const escapeSQLValue = (value: unknown, type: string): string => {
  if (value === null || value === undefined) {
    return 'NULL';
  }

  if (type === 'json') {
    const jsonStr = JSON.stringify(value);
    return `'${jsonStr.replace(/'/g, "''")}'`;
  }

  if (type === 'boolean') {
    return value ? '1' : '0';
  }

  if (type === 'number') {
    const num = Number(value);
    return isNaN(num) ? 'NULL' : String(num);
  }

  if (type === 'date' || type === 'datetime') {
    if (!value) return 'NULL';
    const date = new Date(value as string);
    if (isNaN(date.getTime())) return 'NULL';
    if (type === 'date') {
      return `'${date.toISOString().split('T')[0]}'`;
    }
    return `'${date.toISOString().replace('T', ' ').replace('Z', '').substring(0, 19)}'`;
  }

  // String type - escape single quotes
  const strValue = String(value);
  return `'${strValue.replace(/'/g, "''").replace(/\\/g, '\\\\')}'`;
};

// Generate MySQL INSERT statements for data
export const generateMySQLInsertStatements = <T extends Record<string, unknown>>(
  data: T[],
  config: CSVExportConfig
): string => {
  if (data.length === 0) return '';

  const columnNames = config.columns.map(col => `\`${col.header}\``).join(', ');
  
  // Generate INSERT statements in batches of 50 for better performance
  const batchSize = 50;
  const statements: string[] = [];
  
  for (let i = 0; i < data.length; i += batchSize) {
    const batch = data.slice(i, i + batchSize);
    const values = batch.map(item => {
      const rowValues = config.columns.map(col => {
        const value = getNestedValue(item, col.field);
        return escapeSQLValue(value, col.type);
      });
      return `(${rowValues.join(', ')})`;
    });
    
    statements.push(`INSERT INTO \`${config.tableName}\` (${columnNames}) VALUES\n${values.join(',\n')};`);
  }
  
  return statements.join('\n\n');
};

// Generate complete SQL file with CREATE TABLE + INSERT statements
export const generateCompleteTableSQL = <T extends Record<string, unknown>>(
  data: T[],
  config: CSVExportConfig
): string => {
  let sql = `-- ${config.displayName}\n`;
  sql += `-- Generated on: ${new Date().toISOString()}\n`;
  sql += `-- Records: ${data.length}\n\n`;
  
  // Add DROP TABLE IF EXISTS for clean import
  sql += `DROP TABLE IF EXISTS \`${config.tableName}\`;\n\n`;
  
  // Add CREATE TABLE
  sql += generateMySQLSchema(config);
  sql += '\n\n';
  
  // Add INSERT statements
  if (data.length > 0) {
    sql += generateMySQLInsertStatements(data, config);
  }
  
  return sql;
};

// Generate combined CSV with table separator
export const generateCombinedCSV = (
  datasets: { key: string; data: Record<string, unknown>[]; config: CSVExportConfig }[]
): string => {
  const sections: string[] = [];
  
  datasets.forEach(({ config, data }) => {
    // Add table header section
    sections.push(`\n# TABLE: ${config.tableName}`);
    sections.push(`# Display Name: ${config.displayName}`);
    sections.push(`# Records: ${data.length}`);
    sections.push(`# Columns: ${config.columns.length}`);
    sections.push('');
    
    // Add CSV content for this table
    const headers = config.columns.map(col => col.header).join(',');
    sections.push(headers);
    
    data.forEach(item => {
      const row = config.columns.map(col => {
        const value = getNestedValue(item, col.field);
        return escapeCSVValue(value, col.type);
      }).join(',');
      sections.push(row);
    });
    
    sections.push('');
  });
  
  // Add header info
  const header = [
    '# ECOTEC Computer Shop - Combined Data Export',
    `# Generated: ${new Date().toISOString()}`,
    `# Total Tables: ${datasets.length}`,
    `# Total Records: ${datasets.reduce((sum, d) => sum + d.data.length, 0)}`,
    '#',
    '# Note: Each table section starts with "# TABLE: table_name"',
    '# Import each section separately into MySQL',
    ''
  ];
  
  return header.join('\n') + sections.join('\n');
};

// Download CSV file
export const downloadCSV = (content: string, filename: string): void => {
  const blob = new Blob(['\ufeff' + content], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

// Download SQL file
export const downloadSQL = (content: string, filename: string): void => {
  const blob = new Blob([content], { type: 'text/sql;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

// ==========================================
// DATA EXPORT CONFIGURATIONS
// ==========================================

export const dataExportConfigs: Record<string, CSVExportConfig> = {
  products: {
    tableName: 'products',
    displayName: 'Products',
    description: 'Product inventory with pricing and stock information',
    icon: '📦',
    columns: [
      { field: 'id', header: 'id', type: 'string' },
      { field: 'name', header: 'name', type: 'string' },
      { field: 'category', header: 'category', type: 'string' },
      { field: 'brand', header: 'brand', type: 'string' },
      { field: 'price', header: 'selling_price', type: 'number' },
      { field: 'costPrice', header: 'cost_price', type: 'number' },
      { field: 'profitMargin', header: 'profit_margin', type: 'number' },
      { field: 'stock', header: 'stock', type: 'number' },
      { field: 'serialNumber', header: 'serial_number', type: 'string' },
      { field: 'barcode', header: 'barcode', type: 'string' },
      { field: 'description', header: 'description', type: 'string' },
      { field: 'warranty', header: 'warranty', type: 'string' },
      { field: 'lowStockThreshold', header: 'low_stock_threshold', type: 'number' },
      { field: 'totalPurchased', header: 'total_purchased', type: 'number' },
      { field: 'totalSold', header: 'total_sold', type: 'number' },
      { field: 'createdAt', header: 'created_at', type: 'datetime' },
      { field: 'updatedAt', header: 'updated_at', type: 'datetime' },
    ],
  },

  customers: {
    tableName: 'customers',
    displayName: 'Customers',
    description: 'Customer records with credit management',
    icon: '👥',
    columns: [
      { field: 'id', header: 'id', type: 'string' },
      { field: 'name', header: 'name', type: 'string' },
      { field: 'email', header: 'email', type: 'string' },
      { field: 'phone', header: 'phone', type: 'string' },
      { field: 'address', header: 'address', type: 'string' },
      { field: 'totalSpent', header: 'total_spent', type: 'number' },
      { field: 'totalOrders', header: 'total_orders', type: 'number' },
      { field: 'lastPurchase', header: 'last_purchase', type: 'date' },
      { field: 'creditBalance', header: 'credit_balance', type: 'number' },
      { field: 'creditLimit', header: 'credit_limit', type: 'number' },
      { field: 'creditDueDate', header: 'credit_due_date', type: 'date' },
      { field: 'creditStatus', header: 'credit_status', type: 'string' },
    ],
  },

  suppliers: {
    tableName: 'suppliers',
    displayName: 'Suppliers',
    description: 'Supplier information with payment details',
    icon: '🏭',
    columns: [
      { field: 'id', header: 'id', type: 'string' },
      { field: 'name', header: 'contact_name', type: 'string' },
      { field: 'company', header: 'company', type: 'string' },
      { field: 'email', header: 'email', type: 'string' },
      { field: 'phone', header: 'phone', type: 'string' },
      { field: 'address', header: 'address', type: 'string' },
      { field: 'totalPurchases', header: 'total_purchases', type: 'number' },
      { field: 'totalOrders', header: 'total_orders', type: 'number' },
      { field: 'lastOrder', header: 'last_order', type: 'date' },
      { field: 'creditBalance', header: 'credit_balance', type: 'number' },
      { field: 'paymentTerms', header: 'payment_terms', type: 'string' },
      { field: 'isActive', header: 'is_active', type: 'boolean' },
    ],
  },

  invoices: {
    tableName: 'invoices',
    displayName: 'Invoices',
    description: 'Sales invoices with payment status',
    icon: '🧾',
    columns: [
      { field: 'id', header: 'id', type: 'string' },
      { field: 'invoiceNumber', header: 'invoice_number', type: 'string' },
      { field: 'customerId', header: 'customer_id', type: 'string' },
      { field: 'customerName', header: 'customer_name', type: 'string' },
      { field: 'customerPhone', header: 'customer_phone', type: 'string' },
      { field: 'customerEmail', header: 'customer_email', type: 'string' },
      { field: 'subtotal', header: 'subtotal', type: 'number' },
      { field: 'discount', header: 'discount', type: 'number' },
      { field: 'discountType', header: 'discount_type', type: 'string' },
      { field: 'tax', header: 'tax', type: 'number' },
      { field: 'total', header: 'total', type: 'number' },
      { field: 'paidAmount', header: 'paid_amount', type: 'number' },
      { field: 'dueAmount', header: 'due_amount', type: 'number' },
      { field: 'status', header: 'status', type: 'string' },
      { field: 'paymentMethod', header: 'payment_method', type: 'string' },
      { field: 'dueDate', header: 'due_date', type: 'date' },
      { field: 'createdAt', header: 'created_at', type: 'datetime' },
      { field: 'notes', header: 'notes', type: 'string' },
    ],
  },

  invoice_items: {
    tableName: 'invoice_items',
    displayName: 'Invoice Items',
    description: 'Line items for each invoice',
    icon: '📋',
    columns: [
      { field: 'invoiceId', header: 'invoice_id', type: 'string' },
      { field: 'productId', header: 'product_id', type: 'string' },
      { field: 'productName', header: 'product_name', type: 'string' },
      { field: 'quantity', header: 'quantity', type: 'number' },
      { field: 'unitPrice', header: 'unit_price', type: 'number' },
      { field: 'discount', header: 'discount', type: 'number' },
      { field: 'total', header: 'total', type: 'number' },
      { field: 'serialNumber', header: 'serial_number', type: 'string' },
      { field: 'warranty', header: 'warranty', type: 'string' },
    ],
  },

  grns: {
    tableName: 'goods_received_notes',
    displayName: 'Goods Received Notes',
    description: 'GRN records for inventory purchases',
    icon: '📥',
    columns: [
      { field: 'id', header: 'id', type: 'string' },
      { field: 'grnNumber', header: 'grn_number', type: 'string' },
      { field: 'supplierId', header: 'supplier_id', type: 'string' },
      { field: 'supplierName', header: 'supplier_name', type: 'string' },
      { field: 'subtotal', header: 'subtotal', type: 'number' },
      { field: 'discount', header: 'discount', type: 'number' },
      { field: 'tax', header: 'tax', type: 'number' },
      { field: 'total', header: 'total', type: 'number' },
      { field: 'paidAmount', header: 'paid_amount', type: 'number' },
      { field: 'dueAmount', header: 'due_amount', type: 'number' },
      { field: 'status', header: 'status', type: 'string' },
      { field: 'paymentStatus', header: 'payment_status', type: 'string' },
      { field: 'receivedDate', header: 'received_date', type: 'datetime' },
      { field: 'invoiceNumber', header: 'supplier_invoice_number', type: 'string' },
      { field: 'notes', header: 'notes', type: 'string' },
    ],
  },

  services: {
    tableName: 'services',
    displayName: 'Services',
    description: 'Service offerings with pricing',
    icon: '🔧',
    columns: [
      { field: 'id', header: 'id', type: 'string' },
      { field: 'name', header: 'name', type: 'string' },
      { field: 'category', header: 'category', type: 'string' },
      { field: 'description', header: 'description', type: 'string' },
      { field: 'basePrice', header: 'base_price', type: 'number' },
      { field: 'minPrice', header: 'min_price', type: 'number' },
      { field: 'maxPrice', header: 'max_price', type: 'number' },
      { field: 'priceType', header: 'price_type', type: 'string' },
      { field: 'hourlyRate', header: 'hourly_rate', type: 'number' },
      { field: 'estimatedDuration', header: 'estimated_duration', type: 'string' },
      { field: 'status', header: 'status', type: 'string' },
      { field: 'isPopular', header: 'is_popular', type: 'boolean' },
      { field: 'warranty', header: 'warranty', type: 'string' },
      { field: 'totalCompleted', header: 'total_completed', type: 'number' },
      { field: 'totalRevenue', header: 'total_revenue', type: 'number' },
      { field: 'createdAt', header: 'created_at', type: 'datetime' },
    ],
  },

  job_notes: {
    tableName: 'job_notes',
    displayName: 'Job Notes',
    description: 'Repair and service job records',
    icon: '📝',
    columns: [
      { field: 'id', header: 'id', type: 'string' },
      { field: 'jobNumber', header: 'job_number', type: 'string' },
      { field: 'customerName', header: 'customer_name', type: 'string' },
      { field: 'customerPhone', header: 'customer_phone', type: 'string' },
      { field: 'customerEmail', header: 'customer_email', type: 'string' },
      { field: 'customerAddress', header: 'customer_address', type: 'string' },
      { field: 'deviceType', header: 'device_type', type: 'string' },
      { field: 'deviceBrand', header: 'device_brand', type: 'string' },
      { field: 'deviceModel', header: 'device_model', type: 'string' },
      { field: 'serialNumber', header: 'serial_number', type: 'string' },
      { field: 'deviceCondition', header: 'device_condition', type: 'string' },
      { field: 'reportedIssue', header: 'reported_issue', type: 'string' },
      { field: 'diagnosisNotes', header: 'diagnosis_notes', type: 'string' },
      { field: 'estimatedCost', header: 'estimated_cost', type: 'number' },
      { field: 'actualCost', header: 'actual_cost', type: 'number' },
      { field: 'advancePayment', header: 'advance_payment', type: 'number' },
      { field: 'status', header: 'status', type: 'string' },
      { field: 'priority', header: 'priority', type: 'string' },
      { field: 'assignedTechnician', header: 'assigned_technician', type: 'string' },
      { field: 'receivedDate', header: 'received_date', type: 'datetime' },
      { field: 'expectedCompletionDate', header: 'expected_completion_date', type: 'datetime' },
      { field: 'completedDate', header: 'completed_date', type: 'datetime' },
      { field: 'deliveredDate', header: 'delivered_date', type: 'datetime' },
    ],
  },

  warranty_claims: {
    tableName: 'warranty_claims',
    displayName: 'Warranty Claims',
    description: 'Warranty claim records',
    icon: '🛡️',
    columns: [
      { field: 'id', header: 'id', type: 'string' },
      { field: 'claimNumber', header: 'claim_number', type: 'string' },
      { field: 'invoiceId', header: 'invoice_id', type: 'string' },
      { field: 'invoiceNumber', header: 'invoice_number', type: 'string' },
      { field: 'productId', header: 'product_id', type: 'string' },
      { field: 'productName', header: 'product_name', type: 'string' },
      { field: 'serialNumber', header: 'serial_number', type: 'string' },
      { field: 'customerId', header: 'customer_id', type: 'string' },
      { field: 'customerName', header: 'customer_name', type: 'string' },
      { field: 'customerPhone', header: 'customer_phone', type: 'string' },
      { field: 'claimDate', header: 'claim_date', type: 'datetime' },
      { field: 'warrantyExpiryDate', header: 'warranty_expiry_date', type: 'date' },
      { field: 'status', header: 'status', type: 'string' },
      { field: 'issueDescription', header: 'issue_description', type: 'string' },
      { field: 'issueCategory', header: 'issue_category', type: 'string' },
      { field: 'resolution', header: 'resolution', type: 'string' },
      { field: 'resolutionDate', header: 'resolution_date', type: 'datetime' },
      { field: 'isReplacement', header: 'is_replacement', type: 'boolean' },
      { field: 'replacementProductId', header: 'replacement_product_id', type: 'string' },
      { field: 'replacementProductName', header: 'replacement_product_name', type: 'string' },
      { field: 'handledBy', header: 'handled_by', type: 'string' },
      { field: 'notes', header: 'notes', type: 'string' },
    ],
  },

  cash_accounts: {
    tableName: 'cash_accounts',
    displayName: 'Cash Accounts',
    description: 'Business cash and bank accounts',
    icon: '🏦',
    columns: [
      { field: 'id', header: 'id', type: 'string' },
      { field: 'name', header: 'name', type: 'string' },
      { field: 'type', header: 'type', type: 'string' },
      { field: 'balance', header: 'balance', type: 'number' },
      { field: 'description', header: 'description', type: 'string' },
      { field: 'bankName', header: 'bank_name', type: 'string' },
      { field: 'accountNumber', header: 'account_number', type: 'string' },
      { field: 'isActive', header: 'is_active', type: 'boolean' },
      { field: 'createdAt', header: 'created_at', type: 'datetime' },
      { field: 'updatedAt', header: 'updated_at', type: 'datetime' },
    ],
  },

  cash_transactions: {
    tableName: 'cash_transactions',
    displayName: 'Cash Transactions',
    description: 'Income and expense transactions',
    icon: '💰',
    columns: [
      { field: 'id', header: 'id', type: 'string' },
      { field: 'transactionNumber', header: 'transaction_number', type: 'string' },
      { field: 'type', header: 'type', type: 'string' },
      { field: 'accountId', header: 'account_id', type: 'string' },
      { field: 'accountType', header: 'account_type', type: 'string' },
      { field: 'amount', header: 'amount', type: 'number' },
      { field: 'name', header: 'name', type: 'string' },
      { field: 'description', header: 'description', type: 'string' },
      { field: 'category', header: 'category', type: 'string' },
      { field: 'transferToAccountId', header: 'transfer_to_account_id', type: 'string' },
      { field: 'balanceBefore', header: 'balance_before', type: 'number' },
      { field: 'balanceAfter', header: 'balance_after', type: 'number' },
      { field: 'transactionDate', header: 'transaction_date', type: 'datetime' },
      { field: 'referenceType', header: 'reference_type', type: 'string' },
      { field: 'referenceId', header: 'reference_id', type: 'string' },
      { field: 'notes', header: 'notes', type: 'string' },
    ],
  },

  estimates: {
    tableName: 'estimates',
    displayName: 'Estimates',
    description: 'Customer estimates/proposals',
    icon: '📊',
    columns: [
      { field: 'id', header: 'id', type: 'string' },
      { field: 'estimateNumber', header: 'estimate_number', type: 'string' },
      { field: 'customerId', header: 'customer_id', type: 'string' },
      { field: 'customerName', header: 'customer_name', type: 'string' },
      { field: 'customerPhone', header: 'customer_phone', type: 'string' },
      { field: 'customerEmail', header: 'customer_email', type: 'string' },
      { field: 'subtotal', header: 'subtotal', type: 'number' },
      { field: 'discount', header: 'discount', type: 'number' },
      { field: 'tax', header: 'tax', type: 'number' },
      { field: 'total', header: 'total', type: 'number' },
      { field: 'status', header: 'status', type: 'string' },
      { field: 'validUntil', header: 'valid_until', type: 'date' },
      { field: 'createdAt', header: 'created_at', type: 'datetime' },
      { field: 'notes', header: 'notes', type: 'string' },
    ],
  },

  quotations: {
    tableName: 'quotations',
    displayName: 'Quotations',
    description: 'Customer quotations',
    icon: '📄',
    columns: [
      { field: 'id', header: 'id', type: 'string' },
      { field: 'quotationNumber', header: 'quotation_number', type: 'string' },
      { field: 'customerId', header: 'customer_id', type: 'string' },
      { field: 'customerName', header: 'customer_name', type: 'string' },
      { field: 'customerPhone', header: 'customer_phone', type: 'string' },
      { field: 'customerEmail', header: 'customer_email', type: 'string' },
      { field: 'subtotal', header: 'subtotal', type: 'number' },
      { field: 'discount', header: 'discount', type: 'number' },
      { field: 'tax', header: 'tax', type: 'number' },
      { field: 'total', header: 'total', type: 'number' },
      { field: 'status', header: 'status', type: 'string' },
      { field: 'validUntil', header: 'valid_until', type: 'date' },
      { field: 'createdAt', header: 'created_at', type: 'datetime' },
      { field: 'notes', header: 'notes', type: 'string' },
    ],
  },
};

// Get all available data types for export
export const getAvailableExports = (): { key: string; config: CSVExportConfig }[] => {
  return Object.entries(dataExportConfigs).map(([key, config]) => ({
    key,
    config,
  }));
};
