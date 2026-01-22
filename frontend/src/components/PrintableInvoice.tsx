import { forwardRef } from 'react';
import type { Invoice, Customer } from '../data/mockData';
import logo from '../assets/logo.jpg';

interface InvoiceItemWithWarranty {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  originalPrice?: number;
  total: number;
  warrantyDueDate?: string;
}

interface PrintableInvoiceProps {
  invoice: Invoice & {
    buyingDate?: string;
    items: InvoiceItemWithWarranty[];
  };
  customer?: Customer | null;
}

export const PrintableInvoice = forwardRef<HTMLDivElement, PrintableInvoiceProps>(
  ({ invoice, customer }, ref) => {
    const formatCurrency = (amount: number) => {
      return `LKR ${amount.toLocaleString('en-LK', { minimumFractionDigits: 2 })}`;
    };

    const formatDate = (dateString: string) => {
      return new Date(dateString).toLocaleDateString('en-GB', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      }).split('/').reverse().join('-');
    };

    return (
      <div ref={ref} className="print-invoice">
        <style>{`
          /* ═══════════════════════════════════════════════════════════════
             INK-EFFICIENT B&W PRINT OPTIMIZED - ECOTEC INVOICE
             Designed for black laser/inkjet printers to minimize ink usage
             ═══════════════════════════════════════════════════════════════ */
          
          @media print {
            @page {
              size: A4 portrait;
              margin: 10mm 12mm;
            }
            
            html, body {
              margin: 0 !important;
              padding: 0 !important;
              width: 210mm !important;
              background: white !important;
            }
            
            .print-invoice {
              width: 100% !important;
              max-width: none !important;
              min-height: auto !important;
              padding: 0 !important;
              margin: 0 !important;
              background: white !important;
              color: #000 !important;
              font-family: 'Segoe UI', 'Arial', sans-serif !important;
              font-size: 10pt !important;
            }
            
            .no-print {
              display: none !important;
            }

            table {
              page-break-inside: avoid;
            }
          }
          
          /* A4 Portrait - 210mm x 297mm */
          .print-invoice {
            width: 210mm;
            min-height: 297mm;
            padding: 12mm 15mm;
            margin: 0 auto;
            background: white;
            color: #000;
            font-family: 'Segoe UI', 'Arial', sans-serif;
            font-size: 10pt;
            line-height: 1.4;
            box-sizing: border-box;
          }

          /* HEADER - Company Info - INK EFFICIENT */
          .invoice-header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom: 20px;
            padding-bottom: 15px;
            border-bottom: 2px solid #000;
          }

          .company-section {
            display: flex;
            align-items: flex-start;
            gap: 12px;
          }

          .company-logo {
            width: 50px;
            height: 50px;
            border: 2px solid #000;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            background: white;
            flex-shrink: 0;
          }

          .company-logo svg {
            width: 28px;
            height: 28px;
          }

          .company-info h1 {
            font-size: 16pt;
            font-weight: 700;
            color: #000;
            margin: 0 0 1px 0;
            letter-spacing: -0.3px;
          }

          .company-info .sub-name {
            font-size: 9pt;
            font-weight: 600;
            color: #000;
            margin-bottom: 6px;
          }

          .company-info .details {
            font-size: 8pt;
            color: #000;
            line-height: 1.4;
          }

          .contact-box {
            text-align: right;
          }

          .contact-box h3 {
            font-size: 9pt;
            font-weight: 600;
            color: #000;
            margin: 0 0 4px 0;
            text-decoration: underline;
          }

          .contact-box .info {
            font-size: 8pt;
            color: #000;
            line-height: 1.5;
          }

          /* TITLE SECTION - NO BACKGROUND FILL */
          .invoice-title-section {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            padding: 15px 18px;
            margin-bottom: 15px;
            background: white;
            border: 2px solid #000;
          }

          .invoice-title h2 {
            font-size: 18pt;
            font-weight: 700;
            color: #000;
            margin: 0 0 2px 0;
            text-transform: uppercase;
            letter-spacing: 1px;
          }

          .invoice-title .company-label {
            font-size: 8pt;
            color: #000;
            font-weight: 500;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }

          .amount-due {
            text-align: right;
          }

          .amount-due label {
            font-size: 8pt;
            color: #000;
            font-weight: 600;
            text-decoration: underline;
          }

          .amount-due .amount {
            font-size: 20pt;
            font-weight: 700;
            color: #000;
            font-family: 'Consolas', 'Monaco', monospace;
          }

          /* INVOICE META - Bill To & Details */
          .invoice-meta {
            display: flex;
            justify-content: space-between;
            margin-bottom: 18px;
            gap: 20px;
          }

          .bill-to {
            flex: 1;
            padding: 10px;
            border: 1px solid #000;
          }

          .bill-to label {
            font-size: 7pt;
            color: #000;
            display: block;
            margin-bottom: 2px;
            font-weight: 600;
            text-transform: uppercase;
          }

          .bill-to .name {
            font-size: 11pt;
            font-weight: 700;
            color: #000;
            margin-bottom: 2px;
          }

          .bill-to .info {
            font-size: 8pt;
            color: #000;
            line-height: 1.4;
          }

          .invoice-details {
            text-align: right;
          }

          .invoice-details .row {
            display: flex;
            justify-content: flex-end;
            gap: 12px;
            margin-bottom: 4px;
            font-size: 8pt;
          }

          .invoice-details .row label {
            color: #000;
            font-weight: 500;
          }

          .invoice-details .row .value {
            color: #000;
            font-weight: 600;
            min-width: 90px;
            text-align: right;
          }

          /* ITEMS TABLE - MINIMAL INK */
          .items-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 15px;
          }

          .items-table thead th {
            background: white;
            color: #000;
            font-size: 8pt;
            font-weight: 700;
            padding: 8px 10px;
            text-align: left;
            border: 1px solid #000;
            border-bottom: 2px solid #000;
            text-transform: uppercase;
          }

          .items-table thead th:first-child {
            width: 50%;
          }

          .items-table thead th:nth-child(2) {
            width: 15%;
            text-align: center;
          }

          .items-table thead th:nth-child(3),
          .items-table thead th:nth-child(4) {
            width: 17.5%;
            text-align: right;
          }

          .items-table tbody tr {
            border-bottom: 1px solid #000;
          }

          .items-table tbody td {
            padding: 10px;
            font-size: 9pt;
            color: #000;
            vertical-align: top;
            border-left: 1px solid #000;
            border-right: 1px solid #000;
          }

          .items-table tbody td:first-child .product-name {
            font-weight: 600;
            color: #000;
            margin-bottom: 2px;
          }

          .items-table tbody td:first-child .product-desc {
            font-size: 7pt;
            color: #000;
            line-height: 1.3;
            font-style: italic;
          }

          .items-table tbody td:nth-child(2) {
            text-align: center;
            font-weight: 600;
          }

          .items-table tbody td:nth-child(3),
          .items-table tbody td:nth-child(4) {
            text-align: right;
            font-family: 'Consolas', 'Monaco', monospace;
            font-size: 8pt;
          }

          .items-table tbody td:nth-child(4) {
            font-weight: 700;
            color: #000;
          }

          /* TOTALS SECTION */
          .totals-section {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom: 18px;
            gap: 25px;
          }

          .payment-info {
            flex: 1;
          }

          .payment-info h4 {
            font-size: 8pt;
            font-weight: 700;
            color: #000;
            margin: 0 0 4px 0;
            text-decoration: underline;
          }

          .payment-info p {
            font-size: 8pt;
            color: #000;
            margin: 0;
          }

          .totals-box {
            width: 220px;
            border: 1px solid #000;
            padding: 10px;
          }

          .totals-row {
            display: flex;
            justify-content: space-between;
            padding: 5px 0;
            font-size: 8pt;
            border-bottom: 1px dotted #000;
          }

          .totals-row .label {
            color: #000;
          }

          .totals-row .value {
            font-family: 'Consolas', 'Monaco', monospace;
            color: #000;
            font-weight: 500;
          }

          .totals-row.total {
            border-bottom: none;
            padding-top: 8px;
            margin-top: 4px;
            border-top: 2px solid #000;
          }

          .totals-row.total .label {
            font-weight: 700;
            color: #000;
            text-transform: uppercase;
          }

          .totals-row.total .value {
            font-size: 11pt;
            font-weight: 700;
            color: #000;
          }

          /* NOTES SECTION - NO BACKGROUND */
          .notes-section {
            background: white;
            border: 1px solid #000;
            padding: 10px 12px;
            margin-bottom: 15px;
          }

          .notes-section h4 {
            font-size: 8pt;
            font-weight: 700;
            color: #000;
            margin: 0 0 6px 0;
            text-transform: uppercase;
            border-bottom: 1px solid #000;
            padding-bottom: 4px;
          }

          .notes-section p {
            font-size: 7pt;
            color: #000;
            margin: 0;
            line-height: 1.5;
          }

          /* FOOTER */
          .footer-section {
            border-top: 2px solid #000;
            padding-top: 12px;
          }

          .footer-section h4 {
            font-size: 7pt;
            font-weight: 700;
            color: #000;
            margin: 0 0 3px 0;
          }

          .footer-section p {
            font-size: 7pt;
            color: #000;
            margin: 0;
            line-height: 1.5;
          }

          .footer-thank-you {
            text-align: center;
            margin-top: 15px;
            padding-top: 12px;
            border-top: 1px dashed #000;
            font-size: 9pt;
            font-weight: 600;
            color: #000;
          }
        `}</style>

        {/* Header */}
        <div className="invoice-header">
          <div className="company-section">
            <div className="company-logo">
              <img src={logo} alt="ECOTEC Logo" style={{ width: 40, height: 40, borderRadius: '50%' }} />
            </div>
            <div className="company-info">
              <h1>ECOTEC COMPUTER</h1>
              <div className="sub-name">SOLUTIONS</div>
              <div className="details">
                No.14, Mulatiyana junction,<br />
                Mulatiyana, Matara.
              </div>
            </div>
          </div>
          <div className="contact-box">
            <h3>Contact information</h3>
            <div className="info">
              ecoteccomputersolutions@gmail.com<br />
              0711453111
            </div>
          </div>
        </div>

        {/* Invoice Title Section */}
        <div className="invoice-title-section">
          <div className="invoice-title">
            <h2>ECOTEC INVOICE</h2>
            <div className="company-label">ECOTEC COMPUTER SOLUTIONS</div>
          </div>
          <div className="amount-due">
            <label>Amount Due (LKR)</label>
            <div className="amount">{invoice.total.toLocaleString('en-LK', { minimumFractionDigits: 2 })}</div>
          </div>
        </div>

        {/* Bill To & Invoice Details */}
        <div className="invoice-meta">
          <div className="bill-to">
            <label>Bill to:</label>
            <div className="name">{invoice.customerName}</div>
            {customer && customer.email && (
              <div className="info">
                Email: {customer.email}<br />
                Phone: {customer.phone}
              </div>
            )}
          </div>
          <div className="invoice-details">
            <div className="row">
              <label>Invoice Number:</label>
              <span className="value">{invoice.id.replace('INV-', '')}</span>
            </div>
            <div className="row">
              <label>Invoice Date:</label>
              <span className="value">{formatDate(invoice.date)}</span>
            </div>
            <div className="row">
              <label>Payment Due:</label>
              <span className="value">{formatDate(invoice.dueDate)}</span>
            </div>
          </div>
        </div>

        {/* Items Table */}
        <table className="items-table">
          <thead>
            <tr>
              <th>Items</th>
              <th>Quantity</th>
              <th>Price</th>
              <th>Amount</th>
            </tr>
          </thead>
          <tbody>
            {invoice.items.map((item, index) => (
              <tr key={index}>
                <td>
                  <div className="product-name">{item.productName}</div>
                  <div className="product-desc">A large, high-resolution monitor for immersive viewing experience.</div>
                </td>
                <td>{item.quantity}</td>
                <td>
                  {item.originalPrice && item.originalPrice !== item.unitPrice ? (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                      <span style={{ textDecoration: 'line-through', fontSize: '7pt' }}>
                        {formatCurrency(item.originalPrice)}
                      </span>
                      <span style={{ fontWeight: '600' }}>
                        {formatCurrency(item.unitPrice)}
                      </span>
                    </div>
                  ) : (
                    formatCurrency(item.unitPrice)
                  )}
                </td>
                <td>{formatCurrency(item.total)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Payment Info & Totals */}
        <div className="totals-section">
          <div className="payment-info">
            <h4>Payment Instruction</h4>
            <p>Payment</p>
          </div>
          <div className="totals-box">
            <div className="totals-row">
              <span className="label">Sub Total:</span>
              <span className="value">{formatCurrency(invoice.subtotal)}</span>
            </div>
            {invoice.tax > 0 && (
              <div className="totals-row">
                <span className="label">Total tax:</span>
                <span className="value">{formatCurrency(invoice.tax)}</span>
              </div>
            )}
            <div className="totals-row total">
              <span className="label">Grand total:</span>
              <span className="value">{formatCurrency(invoice.total)}</span>
            </div>
          </div>
        </div>

        {/* Notes / Terms */}
        <div className="notes-section">
          <h4>Notes / Terms</h4>
          <p>
            PLEASE PRODUCE THE INVOICE FOR WARRANTY. NO WARRANTY FOR CHIP BURNS, PHYSICAL DAMAGE OR CORROSION. 
            Warranty covers only manufacturer's defects. Damage or defect due to other causes such as negligence, 
            misuses, improper operation, power fluctuation, lightening, or other natural disasters, sabotage, or accident etc. 
            (01M) = 30 Days, (03M) = 90 Days, (06M) = 180 Days, (01Y) = 350 Days, (02Y) = 700 Days, (03Y) = 1050 Days, 
            (05Y) = 1750 Days, (10Y) = 3500 Days, (L/W) = Lifetime Warranty. (N/W) = No Warranty).
          </p>
          <p>Notes</p>
        </div>

        {/* Footer */}
        <div className="footer-section">
          <h4>Footer:</h4>
          <p>Footer</p>
          <p>We know the world is full of choices. Thank you for selecting us.</p>
        </div>

        <div className="footer-thank-you">
          Thank you for your business!
        </div>
      </div>
    );
  }
);

PrintableInvoice.displayName = 'PrintableInvoice';

export default PrintableInvoice;
