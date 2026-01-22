import { forwardRef } from 'react';
import type { GoodsReceivedNote, Supplier } from '../data/mockData';
import logo from '../assets/logo.jpg';

interface PrintableGRNProps {
  grn: GoodsReceivedNote;
  supplier?: Supplier | null;
}

export const PrintableGRN = forwardRef<HTMLDivElement, PrintableGRNProps>(
  ({ grn, supplier }, ref) => {
    const formatCurrency = (amount: number) => {
      return `LKR ${amount.toLocaleString('en-LK', { minimumFractionDigits: 2 })}`;
    };

    const formatDate = (dateString: string) => {
      if (!dateString) return '-';
      return new Date(dateString).toLocaleDateString('en-GB', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      }).split('/').reverse().join('-');
    };

    const getStatusLabel = (status: string) => {
      switch (status) {
        case 'completed': return 'COMPLETED';
        case 'partial': return 'PARTIAL RECEIVED';
        case 'pending': return 'PENDING';
        case 'rejected': return 'REJECTED';
        default: return status.toUpperCase();
      }
    };

    return (
      <div ref={ref} className="print-grn">
        <style>{`
          /* ═══════════════════════════════════════════════════════════════
             INK-EFFICIENT B&W PRINT OPTIMIZED - ECOTEC GRN
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
            
            .print-grn {
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
          .print-grn {
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
          .grn-header {
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

          /* TITLE SECTION - NO BACKGROUND */
          .grn-title-section {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            padding: 15px 18px;
            margin-bottom: 15px;
            background: white;
            border: 2px solid #000;
          }

          .grn-title h2 {
            font-size: 18pt;
            font-weight: 700;
            color: #000;
            margin: 0 0 2px 0;
            text-transform: uppercase;
            letter-spacing: 1px;
          }

          .grn-title .company-label {
            font-size: 8pt;
            color: #000;
            font-weight: 500;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }

          .grn-status {
            text-align: right;
          }

          .grn-status .status-badge {
            display: inline-block;
            padding: 6px 12px;
            border-radius: 4px;
            font-size: 9pt;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            background: white;
            color: #000;
            border: 2px solid #000;
          }

          .grn-status .status-badge.completed {
            background: white;
            color: #000;
            border: 2px solid #000;
          }

          .grn-status .status-badge.pending {
            background: white;
            color: #000;
            border: 2px dashed #000;
          }

          .grn-status .status-badge.partial {
            background: white;
            color: #000;
            border: 2px dotted #000;
          }

          .grn-status .status-badge.rejected {
            background: white;
            color: #000;
            border: 2px double #000;
          }

          .grn-status .total-amount {
            margin-top: 8px;
            font-size: 16pt;
            font-weight: 700;
            color: #000;
            font-family: 'Consolas', 'Monaco', monospace;
          }

          /* GRN META - Supplier & Details */
          .grn-meta {
            display: flex;
            justify-content: space-between;
            margin-bottom: 18px;
            gap: 20px;
          }

          .supplier-info {
            flex: 1;
            padding: 12px;
            background: white;
            border: 1px solid #000;
          }

          .supplier-info label {
            font-size: 7pt;
            color: #000;
            font-weight: 700;
            display: block;
            margin-bottom: 4px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            border-bottom: 1px solid #000;
            padding-bottom: 2px;
          }

          .supplier-info .name {
            font-size: 11pt;
            font-weight: 700;
            color: #000;
            margin-bottom: 2px;
          }

          .supplier-info .info {
            font-size: 8pt;
            color: #000;
            line-height: 1.4;
          }

          .grn-details {
            text-align: right;
          }

          .grn-details .row {
            display: flex;
            justify-content: flex-end;
            gap: 12px;
            margin-bottom: 4px;
            font-size: 8pt;
          }

          .grn-details .row label {
            color: #000;
            font-weight: 500;
          }

          .grn-details .row .value {
            color: #000;
            font-weight: 600;
            min-width: 100px;
            text-align: right;
          }

          .grn-details .row .value.highlight {
            color: #000;
            font-weight: 700;
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
            width: 35%;
          }

          .items-table tbody tr {
            border-bottom: 1px solid #000;
          }

          .items-table tbody tr:nth-child(even) {
            background: white;
          }

          .items-table tbody td {
            padding: 10px;
            font-size: 9pt;
            color: #000;
            vertical-align: top;
            border-left: 1px solid #000;
            border-right: 1px solid #000;
          }

          .items-table tbody td .product-name {
            font-weight: 600;
            color: #000;
            margin-bottom: 2px;
          }

          .items-table tbody td .product-category {
            font-size: 7pt;
            color: #000;
            font-style: italic;
          }

          .items-table tbody td.text-center {
            text-align: center;
          }

          .items-table tbody td.text-right {
            text-align: right;
            font-family: 'Consolas', 'Monaco', monospace;
            font-size: 8pt;
          }

          .items-table tbody td .qty-accepted {
            color: #000;
            font-weight: 700;
          }

          .items-table tbody td .qty-rejected {
            color: #000;
            font-weight: 700;
            text-decoration: underline;
          }

          .items-table tbody td .price-original {
            text-decoration: line-through;
            color: #000;
            font-size: 7pt;
            margin-right: 4px;
          }

          .items-table tbody td .price-discounted {
            color: #000;
            font-weight: 700;
          }

          .items-table tbody td .discount-badge {
            display: inline-block;
            background: white;
            color: #000;
            padding: 1px 4px;
            border-radius: 3px;
            font-size: 6pt;
            font-weight: 700;
            margin-left: 4px;
            border: 1px solid #000;
          }

          .items-table tbody td .selling-price-info {
            font-size: 7pt;
            color: #000;
            margin-top: 2px;
            font-style: italic;
          }

          /* Payment Info - NO BACKGROUND */
          .payment-info {
            margin-top: 8px;
            padding: 8px 10px;
            background: white;
            border: 2px solid #000;
            border-radius: 4px;
          }

          .payment-info .payment-label {
            font-size: 7pt;
            color: #000;
            font-weight: 700;
            text-transform: uppercase;
            margin-bottom: 4px;
          }

          .payment-info .payment-detail {
            font-size: 9pt;
            color: #000;
            font-weight: 600;
          }

          .payment-info .payment-status {
            display: inline-block;
            padding: 2px 8px;
            border-radius: 4px;
            font-size: 8pt;
            font-weight: 700;
            margin-left: 8px;
            border: 1px solid #000;
            background: white;
            color: #000;
          }

          .payment-info .payment-status.paid {
            background: white;
            color: #000;
            border: 2px solid #000;
          }

          .payment-info .payment-status.unpaid {
            background: white;
            color: #000;
            border: 2px dashed #000;
          }

          .payment-info .payment-status.partial {
            background: white;
            color: #000;
            border: 2px dotted #000;
          }

          /* SUMMARY SECTION */
          .summary-section {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom: 18px;
            gap: 25px;
          }

          .quantity-summary {
            flex: 1;
            display: flex;
            gap: 15px;
          }

          .qty-box {
            padding: 10px 15px;
            text-align: center;
            min-width: 80px;
            border: 1px solid #ccc;
            background: #f5f5f5;
          }

          .qty-box.ordered {
            background: #f5f5f5;
            border: 1px solid #ccc;
          }

          .qty-box.received {
            background: #f5f5f5;
            border: 1px solid #ccc;
          }

          .qty-box.accepted {
            background: #f5f5f5;
            border: 1px solid #ccc;
          }

          .qty-box.rejected {
            background: #f5f5f5;
            border: 1px solid #ccc;
          }

          .qty-box .label {
            font-size: 7pt;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin-bottom: 2px;
            color: #555;
          }

          .qty-box .value {
            font-size: 14pt;
            font-weight: 700;
            color: #000;
          }

          .qty-box.ordered .label { color: #555; }
          .qty-box.ordered .value { color: #000; }
          .qty-box.received .label { color: #555; }
          .qty-box.received .value { color: #000; }
          .qty-box.accepted .label { color: #555; }
          .qty-box.accepted .value { color: #000; }
          .qty-box.rejected .label { color: #555; }
          .qty-box.rejected .value { color: #000; }

          .totals-box {
            width: 220px;
          }

          .totals-row {
            display: flex;
            justify-content: space-between;
            padding: 5px 0;
            font-size: 8pt;
            border-bottom: 1px solid #eee;
          }

          .totals-row .label {
            color: #555;
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
            font-weight: 600;
            color: #000;
          }

          .totals-row.total .value {
            font-size: 11pt;
            font-weight: 700;
            color: #000;
          }

          /* NOTES SECTION */
          .notes-section {
            background: #fafafa;
            border: 1px solid #ddd;
            padding: 10px 12px;
            margin-bottom: 15px;
          }

          .notes-section h4 {
            font-size: 8pt;
            font-weight: 600;
            color: #000;
            margin: 0 0 6px 0;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }

          .notes-section p {
            font-size: 8pt;
            color: #444;
            margin: 0;
            line-height: 1.5;
          }

          /* SIGNATURES */
          .signatures-section {
            display: flex;
            justify-content: space-between;
            margin-top: 30px;
            padding-top: 15px;
          }

          .signature-box {
            text-align: center;
            width: 30%;
          }

          .signature-box .line {
            border-top: 1px solid #000;
            margin-bottom: 5px;
          }

          .signature-box .label {
            font-size: 8pt;
            color: #555;
          }

          /* FOOTER */
          .footer-section {
            border-top: 1px solid #ccc;
            padding-top: 12px;
            margin-top: 20px;
          }

          .footer-section h4 {
            font-size: 7pt;
            font-weight: 600;
            color: #000;
            margin: 0 0 3px 0;
          }

          .footer-section p {
            font-size: 7pt;
            color: #555;
            margin: 0;
            line-height: 1.5;
          }

          .footer-thank-you {
            text-align: center;
            margin-top: 15px;
            padding-top: 12px;
            border-top: 1px solid #333;
            font-size: 9pt;
            color: #000;
            font-weight: 600;
          }
        `}</style>

        {/* Header */}
        <div className="grn-header">
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

        {/* GRN Title Section */}
        <div className="grn-title-section">
          <div className="grn-title">
            <h2>GOODS RECEIVED NOTE</h2>
            <div className="company-label">ECOTEC COMPUTER SOLUTIONS</div>
          </div>
          <div className="grn-status">
            <span className={`status-badge ${grn.status}`}>
              {getStatusLabel(grn.status)}
            </span>
            <div className="total-amount">{formatCurrency(grn.totalAmount)}</div>
          </div>
        </div>

        {/* Supplier Info & GRN Details */}
        <div className="grn-meta">
          <div className="supplier-info">
            <label>Supplier:</label>
            <div className="name">{grn.supplierName}</div>
            {supplier && (
              <div className="info">
                {supplier.email && <>Email: {supplier.email}<br /></>}
                {supplier.phone && <>Phone: {supplier.phone}<br /></>}
                {supplier.address && <>Address: {supplier.address}</>}
              </div>
            )}
          </div>
          <div className="grn-details">
            <div className="row">
              <label>GRN Number:</label>
              <span className="value highlight">{grn.grnNumber}</span>
            </div>
            <div className="row">
              <label>Delivery Note:</label>
              <span className="value">{grn.deliveryNote || '-'}</span>
            </div>
            <div className="row">
              <label>Order Date:</label>
              <span className="value">{formatDate(grn.orderDate)}</span>
            </div>
            <div className="row">
              <label>Expected Delivery:</label>
              <span className="value">{formatDate(grn.expectedDeliveryDate)}</span>
            </div>
            <div className="row">
              <label>Received Date:</label>
              <span className="value">{formatDate(grn.receivedDate)}</span>
            </div>
            <div className="row">
              <label>Received By:</label>
              <span className="value">{grn.receivedBy || '-'}</span>
            </div>
            {grn.vehicleNumber && (
              <div className="row">
                <label>Vehicle No:</label>
                <span className="value">{grn.vehicleNumber}</span>
              </div>
            )}
          </div>
        </div>

        {/* Items Table */}
        <table className="items-table">
          <thead>
            <tr>
              <th style={{ width: '30%' }}>Product</th>
              <th style={{ width: '12%', textAlign: 'right' }}>Unit Price</th>
              <th style={{ width: '10%', textAlign: 'center' }}>Ordered</th>
              <th style={{ width: '10%', textAlign: 'center' }}>Received</th>
              <th style={{ width: '10%', textAlign: 'center' }}>Accepted</th>
              <th style={{ width: '10%', textAlign: 'center' }}>Rejected</th>
              <th style={{ width: '18%', textAlign: 'right' }}>Amount</th>
            </tr>
          </thead>
          <tbody>
            {grn.items.map((item, index) => {
              const hasDiscount = (item.discountValue || 0) > 0;
              const originalPrice = item.originalUnitPrice || item.unitPrice;
              
              return (
                <tr key={index}>
                  <td>
                    <div className="product-name">{item.productName}</div>
                    <div className="product-category">{item.category}</div>
                    {item.sellingPrice && (
                      <div className="selling-price-info">
                        Sell @ {formatCurrency(item.sellingPrice)}
                      </div>
                    )}
                  </td>
                  <td className="text-right">
                    {hasDiscount ? (
                      <div>
                        <span className="price-original">{formatCurrency(originalPrice)}</span>
                        <span className="price-discounted">{formatCurrency(item.unitPrice)}</span>
                        <span className="discount-badge">
                          -{item.discountType === 'percentage' ? `${item.discountValue}%` : formatCurrency(item.discountValue || 0)}
                        </span>
                      </div>
                    ) : (
                      formatCurrency(item.unitPrice)
                    )}
                  </td>
                  <td className="text-center">{item.orderedQuantity}</td>
                  <td className="text-center">{item.receivedQuantity}</td>
                  <td className="text-center">
                    <span className="qty-accepted">{item.acceptedQuantity}</span>
                  </td>
                  <td className="text-center">
                    <span className="qty-rejected">{item.rejectedQuantity}</span>
                  </td>
                  <td className="text-right">{formatCurrency(item.totalAmount)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {/* Summary Section */}
        <div className="summary-section">
          <div className="quantity-summary">
            <div className="qty-box ordered">
              <div className="label">Ordered</div>
              <div className="value">{grn.totalOrderedQuantity}</div>
            </div>
            <div className="qty-box received">
              <div className="label">Received</div>
              <div className="value">{grn.totalReceivedQuantity}</div>
            </div>
            <div className="qty-box accepted">
              <div className="label">Accepted</div>
              <div className="value">{grn.totalAcceptedQuantity}</div>
            </div>
            <div className="qty-box rejected">
              <div className="label">Rejected</div>
              <div className="value">{grn.totalRejectedQuantity}</div>
            </div>
          </div>
          <div className="totals-box">
            <div className="totals-row">
              <span className="label">Sub Total:</span>
              <span className="value">{formatCurrency(grn.subtotal)}</span>
            </div>
            {(grn.totalDiscount || 0) > 0 && (
              <div className="totals-row">
                <span className="label">Total Discount:</span>
                <span className="value">-{formatCurrency(grn.totalDiscount || 0)}</span>
              </div>
            )}
            {grn.discountAmount > 0 && !(grn.totalDiscount) && (
              <div className="totals-row">
                <span className="label">Discount:</span>
                <span className="value">-{formatCurrency(grn.discountAmount)}</span>
              </div>
            )}
            {grn.taxAmount > 0 && (
              <div className="totals-row">
                <span className="label">Tax:</span>
                <span className="value">{formatCurrency(grn.taxAmount)}</span>
              </div>
            )}
            <div className="totals-row total">
              <span className="label">Grand Total:</span>
              <span className="value">{formatCurrency(grn.totalAmount)}</span>
            </div>
            
            {/* Payment Info */}
            {grn.paymentMethod && (
              <div className="payment-info">
                <div className="payment-label">Payment Details</div>
                <div className="payment-detail">
                  {grn.paymentMethod.charAt(0).toUpperCase() + grn.paymentMethod.slice(1)}
                  <span className={`payment-status ${grn.paymentStatus || 'unpaid'}`}>
                    {grn.paymentStatus === 'paid' ? 'PAID' : grn.paymentStatus === 'partial' ? 'PARTIAL' : 'UNPAID'}
                  </span>
                </div>
                {grn.paymentStatus === 'partial' && grn.paidAmount && (
                  <div style={{ fontSize: '8pt', marginTop: '4px', color: '#666' }}>
                    Paid: {formatCurrency(grn.paidAmount)} | 
                    Balance: {formatCurrency(grn.totalAmount - grn.paidAmount)}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Notes */}
        {grn.notes && (
          <div className="notes-section">
            <h4>Notes / Remarks</h4>
            <p>{grn.notes}</p>
          </div>
        )}

        {/* Signatures */}
        <div className="signatures-section">
          <div className="signature-box">
            <div className="line"></div>
            <div className="label">Received By</div>
          </div>
          <div className="signature-box">
            <div className="line"></div>
            <div className="label">Inspected By</div>
          </div>
          <div className="signature-box">
            <div className="line"></div>
            <div className="label">Approved By</div>
          </div>
        </div>

        {/* Footer */}
        <div className="footer-section">
          <h4>Terms & Conditions:</h4>
          <p>
            All goods received are subject to quality inspection. Rejected items will be returned to the supplier. 
            Any discrepancy must be reported within 24 hours of receipt. This document serves as proof of goods received 
            and must be retained for records and future reference.
          </p>
        </div>

        <div className="footer-thank-you">
          Thank you for your business partnership!
        </div>
      </div>
    );
  }
);

PrintableGRN.displayName = 'PrintableGRN';

export default PrintableGRN;
