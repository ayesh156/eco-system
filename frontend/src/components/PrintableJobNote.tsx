import { forwardRef } from 'react';
import type { JobNote } from '../data/mockData';
import logo from '../assets/logo.jpg';

interface PrintableJobNoteProps {
  jobNote: JobNote;
}

export const PrintableJobNote = forwardRef<HTMLDivElement, PrintableJobNoteProps>(
  ({ jobNote }, ref) => {
    const formatDate = (dateString: string) => {
      return new Date(dateString).toLocaleDateString('en-GB', {
        year: 'numeric',
        month: 'short',
        day: '2-digit',
      });
    };

    const formatDateTime = (dateString: string) => {
      return new Date(dateString).toLocaleString('en-GB', {
        year: 'numeric',
        month: 'short',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      });
    };

    const formatCurrency = (amount: number) => {
      return `LKR ${amount.toLocaleString('en-LK', { minimumFractionDigits: 2 })}`;
    };

    const getStatusLabel = (status: string) => {
      const labels: Record<string, string> = {
        'received': 'Received',
        'diagnosing': 'Diagnosing',
        'waiting-parts': 'Waiting for Parts',
        'in-progress': 'In Progress',
        'testing': 'Testing',
        'completed': 'Completed',
        'delivered': 'Delivered',
        'cancelled': 'Cancelled',
      };
      return labels[status] || status;
    };

    const getPriorityLabel = (priority: string) => {
      const labels: Record<string, string> = {
        'low': 'Low',
        'normal': 'Normal',
        'high': 'High',
        'urgent': 'Urgent',
      };
      return labels[priority] || priority;
    };

    const getDeviceTypeLabel = (type: string) => {
      const labels: Record<string, string> = {
        'laptop': 'Laptop',
        'desktop': 'Desktop PC',
        'printer': 'Printer',
        'monitor': 'Monitor',
        'phone': 'Mobile Phone',
        'tablet': 'Tablet',
        'other': 'Other Device',
      };
      return labels[type] || type;
    };

    return (
      <div ref={ref} className="print-job-note">
        <style>{`
          /* ═══════════════════════════════════════════════════════════════
             INK-EFFICIENT B&W PRINT OPTIMIZED - ECOTEC JOB NOTE
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
            
            .print-job-note {
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
          
          .print-job-note {
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
          .job-header {
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

          .company-info h1 span {
            color: #000;
          }

          .company-info .tagline {
            font-size: 8pt;
            color: #000;
            margin-top: 2px;
          }

          .company-info .contact {
            font-size: 7pt;
            color: #000;
            margin-top: 4px;
          }

          .job-number-box {
            text-align: right;
            background: white;
            color: #000;
            padding: 12px 20px;
            border: 2px solid #000;
            border-radius: 4px;
          }

          .job-number-box .label {
            font-size: 7pt;
            color: #000;
            text-transform: uppercase;
            letter-spacing: 1px;
            font-weight: 700;
          }

          .job-number-box .number {
            font-size: 16pt;
            font-weight: 700;
            font-family: 'Consolas', monospace;
          }

          .job-number-box .date {
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

          .status-priority {
            display: flex;
            gap: 8px;
          }

          .status-badge {
            padding: 4px 12px;
            border-radius: 4px;
            font-size: 8pt;
            font-weight: 700;
            text-transform: uppercase;
            background: white;
            color: #000;
            border: 1px solid #000;
          }

          /* All status badges use border styles instead of fills */
          .status-received { border-style: solid; }
          .status-diagnosing { border-style: dashed; }
          .status-waiting-parts { border-style: dotted; }
          .status-in-progress { border-style: dashed; }
          .status-testing { border-style: dotted; }
          .status-completed { border-width: 2px; font-weight: 700; }
          .status-delivered { border-width: 2px; font-weight: 700; }
          .status-cancelled { border-style: double; }

          .priority-low { border-style: solid; }
          .priority-normal { border-style: solid; }
          .priority-high { border-style: dashed; }
          .priority-urgent { border-width: 2px; font-weight: 700; }

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

          .section-header.green { background: white; color: #000; }
          .section-header.blue { background: white; color: #000; }
          .section-header.purple { background: white; color: #000; }
          .section-header.orange { background: white; color: #000; }

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
            width: 100px;
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

          /* ACCESSORIES LIST - NO BACKGROUNDS */
          .accessories-list {
            display: flex;
            flex-wrap: wrap;
            gap: 4px;
          }

          .accessory-tag {
            background: white;
            color: #000;
            padding: 2px 8px;
            border-radius: 4px;
            font-size: 7pt;
            font-weight: 600;
            border: 1px solid #000;
          }

          /* ISSUE BOX - NO BACKGROUND */
          .issue-box {
            background: white;
            border: 1px solid #000;
            border-radius: 4px;
            padding: 10px;
            margin-bottom: 8px;
          }

          .issue-box .label {
            font-size: 7pt;
            color: #000;
            font-weight: 700;
            text-transform: uppercase;
            margin-bottom: 4px;
            border-bottom: 1px solid #000;
            padding-bottom: 2px;
          }

          .issue-box .content {
            color: #000;
            font-size: 9pt;
            line-height: 1.5;
          }

          .diagnosis-box {
            background: white;
            border: 1px solid #000;
            border-radius: 4px;
            padding: 10px;
          }

          .diagnosis-box .label {
            font-size: 7pt;
            color: #000;
            font-weight: 700;
            text-transform: uppercase;
            margin-bottom: 4px;
            border-bottom: 1px solid #000;
            padding-bottom: 2px;
          }

          .diagnosis-box .content {
            color: #000;
            font-size: 9pt;
            line-height: 1.5;
          }

          /* COST TABLE */
          .cost-table {
            width: 100%;
            border-collapse: collapse;
          }

          .cost-table td {
            padding: 6px 0;
            font-size: 8.5pt;
            color: #000;
            border-bottom: 1px dotted #000;
          }

          .cost-table td:first-child {
            color: #000;
          }

          .cost-table td:last-child {
            text-align: right;
            font-family: 'Consolas', monospace;
            font-weight: 600;
          }

          .cost-table .total-row td {
            border-top: 2px solid #000;
            border-bottom: none;
            padding-top: 8px;
            font-weight: 700;
            color: #000;
          }

          .cost-table .total-row td:last-child {
            font-size: 11pt;
            color: #000;
          }

          /* TIMELINE - MINIMAL INK */
          .timeline {
            padding: 0;
            margin: 0;
          }

          .timeline-item {
            display: flex;
            gap: 10px;
            margin-bottom: 8px;
            font-size: 8pt;
          }

          .timeline-item:last-child {
            margin-bottom: 0;
          }

          .timeline-dot {
            width: 8px;
            height: 8px;
            background: white;
            border: 2px solid #000;
            border-radius: 50%;
            margin-top: 4px;
            flex-shrink: 0;
          }

          .timeline-content {
            flex: 1;
          }

          .timeline-status {
            font-weight: 700;
            color: #000;
          }

          .timeline-date {
            color: #000;
            font-size: 7pt;
          }

          .timeline-notes {
            color: #000;
            font-size: 7pt;
            margin-top: 2px;
            font-style: italic;
          }

          /* SIGNATURE SECTION */
          .signature-section {
            display: flex;
            justify-content: space-between;
            margin-top: 20px;
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
            margin-top: 30px;
          }

          .signature-label {
            font-size: 8pt;
            color: #000;
          }

          /* TERMS - NO BACKGROUND */
          .terms-section {
            margin-top: 15px;
            padding: 10px 12px;
            background: white;
            border: 1px solid #000;
            border-radius: 4px;
          }

          .terms-section h4 {
            font-size: 8pt;
            font-weight: 700;
            color: #000;
            margin: 0 0 6px 0;
            text-transform: uppercase;
          }

          .terms-section ul {
            margin: 0;
            padding-left: 16px;
            font-size: 7pt;
            color: #000;
            line-height: 1.6;
          }

          /* CUSTOMER COPY LABEL - BORDER ONLY */
          .copy-label {
            position: absolute;
            top: 8mm;
            right: 10mm;
            background: white;
            color: #000;
            padding: 2px 10px;
            font-size: 7pt;
            font-weight: 700;
            border: 1px solid #000;
            border-radius: 0 0 4px 4px;
            text-transform: uppercase;
          }

          /* FOOTER */
          .job-footer {
            margin-top: 15px;
            padding-top: 10px;
            border-top: 2px solid #000;
            text-align: center;
          }

          .job-footer p {
            font-size: 8pt;
            color: #000;
            margin: 2px 0;
          }

          .job-footer .thanks {
            font-size: 10pt;
            font-weight: 700;
            color: #000;
            margin-top: 6px;
          }
        `}</style>

        {/* Header */}
        <div className="job-header">
          <div className="company-section">
            <img src={logo} alt="Logo" className="company-logo" />
            <div className="company-info">
              <h1>ECO<span>TEC</span></h1>
              <div className="tagline">Computer Solutions</div>
              <div className="contact">011-2345678 | 077-1234567 | info@ecotec.lk</div>
            </div>
          </div>
          <div className="job-number-box">
            <div className="label">Job Number</div>
            <div className="number">{jobNote.jobNumber}</div>
            <div className="date">Received: {formatDate(jobNote.receivedDate)}</div>
          </div>
        </div>

        {/* Title Section */}
        <div className="title-section">
          <h2>SERVICE JOB NOTE</h2>
          <div className="status-priority">
            <span className={`status-badge status-${jobNote.status}`}>
              {getStatusLabel(jobNote.status)}
            </span>
            <span className={`status-badge priority-${jobNote.priority}`}>
              {getPriorityLabel(jobNote.priority)} Priority
            </span>
          </div>
        </div>

        {/* Two Column Layout */}
        <div className="two-columns">
          {/* Left Column - Customer Info */}
          <div className="column">
            <div className="section-box">
              <div className="section-header green">
                Customer Information
              </div>
              <div className="section-content">
                <div className="info-row">
                  <span className="info-label">Name</span>
                  <span className="info-value highlight">{jobNote.customerName}</span>
                </div>
                <div className="info-row">
                  <span className="info-label">Phone</span>
                  <span className="info-value">{jobNote.customerPhone}</span>
                </div>
                {jobNote.customerEmail && (
                  <div className="info-row">
                    <span className="info-label">Email</span>
                    <span className="info-value">{jobNote.customerEmail}</span>
                  </div>
                )}
                {jobNote.customerAddress && (
                  <div className="info-row">
                    <span className="info-label">Address</span>
                    <span className="info-value">{jobNote.customerAddress}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Device Info */}
            <div className="section-box">
              <div className="section-header blue">
                Device Information
              </div>
              <div className="section-content">
                <div className="info-row">
                  <span className="info-label">Device Type</span>
                  <span className="info-value">{getDeviceTypeLabel(jobNote.deviceType)}</span>
                </div>
                <div className="info-row">
                  <span className="info-label">Brand</span>
                  <span className="info-value">{jobNote.deviceBrand}</span>
                </div>
                <div className="info-row">
                  <span className="info-label">Model</span>
                  <span className="info-value">{jobNote.deviceModel}</span>
                </div>
                {jobNote.serialNumber && (
                  <div className="info-row">
                    <span className="info-label">Serial No.</span>
                    <span className="info-value">{jobNote.serialNumber}</span>
                  </div>
                )}
                <div className="info-row">
                  <span className="info-label">Condition</span>
                  <span className="info-value">{jobNote.deviceCondition}</span>
                </div>
                {jobNote.accessories.length > 0 && (
                  <div className="info-row">
                    <span className="info-label">Accessories</span>
                    <div className="info-value">
                      <div className="accessories-list">
                        {jobNote.accessories.map((acc, idx) => (
                          <span key={idx} className="accessory-tag">{acc}</span>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right Column - Service Details */}
          <div className="column">
            <div className="section-box">
              <div className="section-header purple">
                Problem & Service
              </div>
              <div className="section-content">
                <div className="issue-box">
                  <div className="label">Reported Issue</div>
                  <div className="content">{jobNote.reportedIssue}</div>
                </div>
                {jobNote.diagnosisNotes && (
                  <div className="diagnosis-box">
                    <div className="label">Diagnosis</div>
                    <div className="content">{jobNote.diagnosisNotes}</div>
                  </div>
                )}
                {jobNote.serviceRequired && (
                  <div style={{ marginTop: '8px' }}>
                    <div className="info-row">
                      <span className="info-label">Service Req.</span>
                      <span className="info-value">{jobNote.serviceRequired}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Cost & Timeline */}
            <div className="section-box">
              <div className="section-header orange">
                Cost & Timeline
              </div>
              <div className="section-content">
                <table className="cost-table">
                  <tbody>
                    <tr>
                      <td>Estimated Cost</td>
                      <td>{jobNote.estimatedCost ? formatCurrency(jobNote.estimatedCost) : '-'}</td>
                    </tr>
                    {jobNote.actualCost && (
                      <tr>
                        <td>Actual Cost</td>
                        <td>{formatCurrency(jobNote.actualCost)}</td>
                      </tr>
                    )}
                    <tr>
                      <td>Advance Paid</td>
                      <td>{jobNote.advancePayment ? formatCurrency(jobNote.advancePayment) : 'None'}</td>
                    </tr>
                    {(jobNote.estimatedCost || jobNote.actualCost) && (
                      <tr className="total-row">
                        <td>Balance Due</td>
                        <td>{formatCurrency((jobNote.actualCost || jobNote.estimatedCost || 0) - (jobNote.advancePayment || 0))}</td>
                      </tr>
                    )}
                  </tbody>
                </table>
                <div style={{ marginTop: '10px', paddingTop: '10px', borderTop: '1px dashed #e2e8f0' }}>
                  <div className="info-row">
                    <span className="info-label">Expected</span>
                    <span className="info-value">
                      {jobNote.expectedCompletionDate ? formatDate(jobNote.expectedCompletionDate) : 'TBD'}
                    </span>
                  </div>
                  {jobNote.assignedTechnician && (
                    <div className="info-row">
                      <span className="info-label">Technician</span>
                      <span className="info-value">{jobNote.assignedTechnician}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Status Timeline */}
        {jobNote.statusHistory.length > 0 && (
          <div className="section-box">
            <div className="section-header">
              Status Timeline
            </div>
            <div className="section-content">
              <div className="timeline">
                {jobNote.statusHistory.map((entry, idx) => (
                  <div key={idx} className="timeline-item">
                    <div className="timeline-dot"></div>
                    <div className="timeline-content">
                      <span className="timeline-status">{getStatusLabel(entry.status)}</span>
                      <span className="timeline-date"> - {formatDateTime(entry.date)}</span>
                      {entry.notes && <div className="timeline-notes">{entry.notes}</div>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
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

        {/* Terms */}
        <div className="terms-section">
          <h4>Terms & Conditions</h4>
          <ul>
            <li>Devices not collected within 30 days may be disposed of without notice.</li>
            <li>We are not responsible for data loss. Please backup your data before service.</li>
            <li>Estimated costs may change based on diagnosis findings.</li>
            <li>All repairs carry a 7-day warranty unless otherwise specified.</li>
            <li>Please bring this receipt when collecting your device.</li>
          </ul>
        </div>

        {/* Footer */}
        <div className="job-footer">
          <p>No. 123, Main Street, Colombo 05, Sri Lanka</p>
          <p>www.ecotec.lk | support@ecotec.lk</p>
          <p className="thanks">Thank you for choosing ECOTEC!</p>
        </div>
      </div>
    );
  }
);

PrintableJobNote.displayName = 'PrintableJobNote';

export default PrintableJobNote;
