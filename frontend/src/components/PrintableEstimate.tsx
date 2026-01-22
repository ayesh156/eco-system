import { forwardRef } from 'react';
import logo from '../assets/logo.jpg';

interface EstimateItem {
  id: string;
  productId: string;
  productName: string;
  description: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  total: number;
}

interface EstimateData {
  estimateNumber: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  customerAddress?: string;
  estimateDate: string;
  expiryDate: string;
  items: EstimateItem[];
  subtotal: number;
  discountPercent: number;
  discountAmount: number;
  taxPercent: number;
  taxAmount: number;
  total: number;
  notes?: string;
  terms?: string;
}

interface PrintableEstimateProps {
  estimate: EstimateData;
}

export const PrintableEstimate = forwardRef<HTMLDivElement, PrintableEstimateProps>(
  ({ estimate }, ref) => {
    const formatDate = (dateString: string) => {
      return new Date(dateString).toLocaleDateString('en-GB', {
        year: 'numeric',
        month: 'short',
        day: '2-digit',
      });
    };

    const formatCurrency = (amount: number) => {
      return `LKR ${amount.toLocaleString('en-LK', { minimumFractionDigits: 2 })}`;
    };

    return (
      <div ref={ref} className="print-estimate">
        <style>{`
          /* ═══════════════════════════════════════════════════════════════
             INK-EFFICIENT B&W PRINT OPTIMIZED - ECOTEC ESTIMATE
             Designed for black laser/inkjet printers to minimize ink usage
             ═══════════════════════════════════════════════════════════════ */
          
          @media print {
            @page {
              size: A4 portrait;
              margin: 8mm 10mm;
            }
            
            html, body {
              margin: 0 !important;
              padding: 0 !important;
              background: white !important;
            }
            
            .print-estimate {
              width: 100% !important;
              max-width: none !important;
              padding: 0 !important;
              margin: 0 !important;
              background: white !important;
              color: #000 !important;
              font-family: 'Segoe UI', 'Arial', sans-serif !important;
              font-size: 9pt !important;
            }
            
            .no-print {
              display: none !important;
            }
          }
          
          .print-estimate {
            width: 210mm;
            min-height: 297mm;
            padding: 8mm 10mm;
            margin: 0 auto;
            background: white;
            color: #000;
            font-family: 'Segoe UI', 'Arial', sans-serif;
            font-size: 9pt;
            line-height: 1.4;
            box-sizing: border-box;
          }

          /* HEADER - INK EFFICIENT */
          .estimate-header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            padding-bottom: 12px;
            border-bottom: 2px solid #000;
            margin-bottom: 15px;
          }

          .company-section {
            display: flex;
            align-items: center;
            gap: 12px;
          }

          .company-logo {
            width: 55px;
            height: 55px;
            border-radius: 8px;
            object-fit: cover;
            border: 2px solid #000;
          }

          .company-info h1 {
            font-size: 18pt;
            font-weight: 700;
            color: #000;
            margin: 0;
          }

          .company-info .tagline {
            font-size: 8pt;
            color: #000;
            margin-top: 2px;
            text-transform: uppercase;
            letter-spacing: 1px;
          }

          .company-info .contact {
            font-size: 7pt;
            color: #000;
            margin-top: 4px;
          }

          .estimate-number-box {
            text-align: right;
            background: white;
            color: #000;
            padding: 12px 20px;
            border: 2px solid #000;
            border-radius: 4px;
          }

          .estimate-number-box .label {
            font-size: 7pt;
            color: #000;
            text-transform: uppercase;
            letter-spacing: 1px;
            font-weight: 700;
          }

          .estimate-number-box .number {
            font-size: 16pt;
            font-weight: 700;
            font-family: 'Consolas', monospace;
            color: #000;
          }

          .estimate-number-box .date {
            font-size: 8pt;
            color: #000;
            margin-top: 4px;
          }

          /* TITLE SECTION - NO BACKGROUND */
          .title-section {
            background: white;
            border: 2px solid #000;
            border-radius: 4px;
            padding: 12px 16px;
            margin-bottom: 15px;
            display: flex;
            justify-content: space-between;
            align-items: center;
          }

          .title-section h2 {
            font-size: 14pt;
            font-weight: 700;
            color: #000;
            margin: 0;
            text-transform: uppercase;
            letter-spacing: 1px;
          }

          .validity-badge {
            padding: 4px 12px;
            border-radius: 4px;
            font-size: 8pt;
            font-weight: 700;
            background: white;
            color: #000;
            border: 1px solid #000;
          }

          /* TWO COLUMN LAYOUT */
          .two-columns {
            display: flex;
            gap: 15px;
            margin-bottom: 15px;
          }

          .column {
            flex: 1;
          }

          /* SECTION BOX - NO FILLED HEADERS */
          .section-box {
            border: 1px solid #000;
            border-radius: 4px;
            margin-bottom: 12px;
            overflow: hidden;
          }

          .section-header {
            background: white;
            color: #000;
            padding: 8px 12px;
            font-size: 9pt;
            font-weight: 700;
            display: flex;
            align-items: center;
            gap: 6px;
            border-bottom: 2px solid #000;
            text-transform: uppercase;
          }

          .section-content {
            padding: 10px 12px;
            background: white;
          }

          /* INFO ROW */
          .info-row {
            display: flex;
            margin-bottom: 6px;
            font-size: 8.5pt;
          }

          .info-row:last-child {
            margin-bottom: 0;
          }

          .info-label {
            width: 80px;
            color: #000;
            font-weight: 500;
            flex-shrink: 0;
          }

          .info-value {
            color: #000;
            font-weight: 500;
            flex: 1;
          }

          .info-value.highlight {
            color: #000;
            font-weight: 700;
          }

          /* ITEMS TABLE - MINIMAL INK */
          .items-section {
            margin-bottom: 15px;
          }

          .items-table {
            width: 100%;
            border-collapse: collapse;
            border: 1px solid #000;
            border-radius: 4px;
            overflow: hidden;
          }

          .items-table thead {
            background: white;
          }

          .items-table th {
            padding: 10px 12px;
            text-align: left;
            font-size: 8pt;
            font-weight: 700;
            color: #000;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            border-bottom: 2px solid #000;
            border-right: 1px solid #000;
          }

          .items-table th:last-child {
            border-right: none;
          }

          .items-table th:nth-child(2),
          .items-table th:nth-child(3),
          .items-table th:nth-child(4) {
            text-align: center;
          }

          .items-table th:last-child {
            text-align: right;
          }

          .items-table td {
            padding: 10px 12px;
            font-size: 8.5pt;
            border-bottom: 1px solid #000;
            border-right: 1px solid #000;
            vertical-align: top;
            color: #000;
          }

          .items-table td:last-child {
            border-right: none;
          }

          .items-table td:nth-child(2),
          .items-table td:nth-child(3),
          .items-table td:nth-child(4) {
            text-align: center;
          }

          .items-table td:last-child {
            text-align: right;
            font-family: 'Consolas', monospace;
            font-weight: 700;
            color: #000;
          }

          .items-table tbody tr:last-child td {
            border-bottom: none;
          }

          .item-name {
            font-weight: 600;
            color: #000;
          }

          .item-desc {
            font-size: 7pt;
            color: #000;
            margin-top: 2px;
            font-style: italic;
          }

          .item-number {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            width: 20px;
            height: 20px;
            background: white;
            border: 1px solid #000;
            border-radius: 50%;
            font-size: 7pt;
            font-weight: 700;
            color: #000;
            margin-right: 8px;
          }

          /* SUMMARY SECTION - NO FILLED BACKGROUNDS */
          .summary-section {
            display: flex;
            justify-content: flex-end;
            margin-bottom: 15px;
          }

          .summary-box {
            width: 250px;
            border: 2px solid #000;
            border-radius: 4px;
            overflow: hidden;
          }

          .summary-row {
            display: flex;
            justify-content: space-between;
            padding: 8px 12px;
            font-size: 9pt;
            border-bottom: 1px dotted #000;
            background: white;
          }

          .summary-row:last-child {
            border-bottom: none;
          }

          .summary-row .label {
            color: #000;
          }

          .summary-row .value {
            font-family: 'Consolas', monospace;
            font-weight: 600;
            color: #000;
          }

          .summary-row.discount .value {
            color: #000;
            font-style: italic;
          }

          .summary-row.tax .value {
            color: #000;
          }

          .summary-row.total {
            background: white;
            padding: 12px;
            border-top: 2px solid #000;
          }

          .summary-row.total .label {
            font-size: 11pt;
            font-weight: 700;
            color: #000;
            text-transform: uppercase;
          }

          .summary-row.total .value {
            font-size: 13pt;
            font-weight: 700;
            color: #000;
          }

          /* NOTES & TERMS - NO BACKGROUNDS */
          .notes-terms {
            display: flex;
            gap: 15px;
            margin-bottom: 15px;
          }

          .notes-box, .terms-box {
            flex: 1;
            border: 1px solid #000;
            border-radius: 4px;
            overflow: hidden;
          }

          .notes-box .box-header, .terms-box .box-header {
            background: white;
            padding: 8px 12px;
            font-size: 8pt;
            font-weight: 700;
            color: #000;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            border-bottom: 1px solid #000;
          }

          .notes-box .box-content, .terms-box .box-content {
            padding: 10px 12px;
            font-size: 8pt;
            color: #000;
            line-height: 1.6;
            white-space: pre-line;
          }

          /* SIGNATURE SECTION */
          .signature-section {
            display: flex;
            justify-content: space-between;
            margin-top: 25px;
            padding-top: 15px;
            border-top: 1px dashed #000;
          }

          .signature-box {
            width: 45%;
            text-align: center;
          }

          .signature-line {
            border-top: 1px solid #000;
            margin-bottom: 4px;
            margin-top: 35px;
          }

          .signature-label {
            font-size: 8pt;
            color: #000;
          }

          /* FOOTER */
          .estimate-footer {
            margin-top: 20px;
            padding-top: 12px;
            border-top: 2px solid #000;
            text-align: center;
          }

          .footer-message {
            font-size: 10pt;
            font-weight: 700;
            color: #000;
            margin-bottom: 4px;
          }

          .footer-contact {
            font-size: 8pt;
            color: #000;
          }

          .footer-disclaimer {
            font-size: 7pt;
            color: #000;
            margin-top: 8px;
            padding-top: 8px;
            border-top: 1px dashed #000;
            font-style: italic;
          }
        `}</style>

        {/* Header */}
        <div className="estimate-header">
          <div className="company-section">
            <img src={logo} alt="Logo" className="company-logo" />
            <div className="company-info">
              <h1>ECOTEC</h1>
              <div className="tagline">Computer Solutions</div>
              <div className="contact">Tel: 011-2345678 | 077-1234567 | Email: info@ecotec.lk</div>
            </div>
          </div>
          <div className="estimate-number-box">
            <div className="label">Estimate No</div>
            <div className="number">{estimate.estimateNumber}</div>
            <div className="date">Date: {formatDate(estimate.estimateDate)}</div>
          </div>
        </div>

        {/* Title Section */}
        <div className="title-section">
          <h2>PRICE ESTIMATE</h2>
          <div className="validity-badge">
            Valid Until: {formatDate(estimate.expiryDate)}
          </div>
        </div>

        {/* Customer & Estimate Info */}
        <div className="two-columns">
          <div className="column">
            <div className="section-box">
              <div className="section-header">
                Customer Information
              </div>
              <div className="section-content">
                <div className="info-row">
                  <span className="info-label">Name</span>
                  <span className="info-value highlight">{estimate.customerName}</span>
                </div>
                <div className="info-row">
                  <span className="info-label">Phone</span>
                  <span className="info-value">{estimate.customerPhone}</span>
                </div>
                {estimate.customerEmail && (
                  <div className="info-row">
                    <span className="info-label">Email</span>
                    <span className="info-value">{estimate.customerEmail}</span>
                  </div>
                )}
                {estimate.customerAddress && (
                  <div className="info-row">
                    <span className="info-label">Address</span>
                    <span className="info-value">{estimate.customerAddress}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
          <div className="column">
            <div className="section-box">
              <div className="section-header">
                Estimate Details
              </div>
              <div className="section-content">
                <div className="info-row">
                  <span className="info-label">Issue Date</span>
                  <span className="info-value">{formatDate(estimate.estimateDate)}</span>
                </div>
                <div className="info-row">
                  <span className="info-label">Valid Until</span>
                  <span className="info-value highlight">{formatDate(estimate.expiryDate)}</span>
                </div>
                <div className="info-row">
                  <span className="info-label">Total Items</span>
                  <span className="info-value">{estimate.items.length}</span>
                </div>
                <div className="info-row">
                  <span className="info-label">Status</span>
                  <span className="info-value highlight">Pending Review</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Items Table */}
        <div className="items-section">
          <table className="items-table">
            <thead>
              <tr>
                <th style={{ width: '45%' }}>Item Description</th>
                <th style={{ width: '10%' }}>Qty</th>
                <th style={{ width: '17%' }}>Unit Price</th>
                <th style={{ width: '10%' }}>Disc %</th>
                <th style={{ width: '18%' }}>Total</th>
              </tr>
            </thead>
            <tbody>
              {estimate.items.map((item, index) => (
                <tr key={item.id || index}>
                  <td>
                    <span className="item-number">{index + 1}</span>
                    <span className="item-name">{item.productName}</span>
                    {item.description && <div className="item-desc">{item.description}</div>}
                  </td>
                  <td>{item.quantity}</td>
                  <td>{formatCurrency(item.unitPrice)}</td>
                  <td>{item.discount > 0 ? `${item.discount}%` : '-'}</td>
                  <td>{formatCurrency(item.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Summary */}
        <div className="summary-section">
          <div className="summary-box">
            <div className="summary-row">
              <span className="label">Subtotal</span>
              <span className="value">{formatCurrency(estimate.subtotal)}</span>
            </div>
            {estimate.discountAmount > 0 && (
              <div className="summary-row discount">
                <span className="label">Discount ({estimate.discountPercent}%)</span>
                <span className="value">-{formatCurrency(estimate.discountAmount)}</span>
              </div>
            )}
            {estimate.taxAmount > 0 && (
              <div className="summary-row tax">
                <span className="label">Tax ({estimate.taxPercent}%)</span>
                <span className="value">+{formatCurrency(estimate.taxAmount)}</span>
              </div>
            )}
            <div className="summary-row total">
              <span className="label">Grand Total</span>
              <span className="value">{formatCurrency(estimate.total)}</span>
            </div>
          </div>
        </div>

        {/* Notes & Terms */}
        {(estimate.notes || estimate.terms) && (
          <div className="notes-terms">
            {estimate.notes && (
              <div className="notes-box">
                <div className="box-header">Notes</div>
                <div className="box-content">{estimate.notes}</div>
              </div>
            )}
            {estimate.terms && (
              <div className="terms-box">
                <div className="box-header">Terms & Conditions</div>
                <div className="box-content">{estimate.terms}</div>
              </div>
            )}
          </div>
        )}

        {/* Signature Section */}
        <div className="signature-section">
          <div className="signature-box">
            <div className="signature-line"></div>
            <div className="signature-label">Customer Signature</div>
          </div>
          <div className="signature-box">
            <div className="signature-line"></div>
            <div className="signature-label">Authorized Signature</div>
          </div>
        </div>

        {/* Footer */}
        <div className="estimate-footer">
          <div className="footer-message">Thank you for considering ECOTEC!</div>
          <div className="footer-contact">
            No. 123, Galle Road, Colombo 03 | www.ecotec.lk
          </div>
          <div className="footer-disclaimer">
            This is a price estimate only. Final prices may vary based on availability and market conditions. 
            Please confirm with our sales team before placing an order.
          </div>
        </div>
      </div>
    );
  }
);

PrintableEstimate.displayName = 'PrintableEstimate';
