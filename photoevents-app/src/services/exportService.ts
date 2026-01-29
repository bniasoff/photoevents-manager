import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { printToFileAsync } from 'expo-print';
import { Event } from '../types/Event';
import { formatEventDateTime } from '../utils/dateHelpers';
import { parseAmount, getEventStatus, getCategoryIcon } from '../utils/eventHelpers';
import { format } from 'date-fns';

// CSV Export
export const generateCSV = (events: Event[]): string => {
  const headers = [
    'Name',
    'Category',
    'Event Date',
    'Time',
    'Place',
    'Address',
    'Phone',
    'Charge',
    'Payment',
    'Balance',
    'Paid',
    'Ready',
    'Sent',
    'Referral',
    'Info',
  ].join(',');

  const rows = events.map((event) => {
    const charge = parseAmount(event.Charge);
    const payment = parseAmount(event.Payment);
    const balance = charge - payment;
    const status = getEventStatus(event);

    return [
      `"${event.Name}"`,
      `"${event.Category}"`,
      event.EventDate,
      `"${event.Start}${event.End ? ' - ' + event.End : ''}"`,
      `"${event.Place || ''}"`,
      `"${event.Address || ''}"`,
      `"${event.Phone || ''}"`,
      charge.toFixed(2),
      payment.toFixed(2),
      balance.toFixed(2),
      status.isPaid ? 'Yes' : 'No',
      status.isReady ? 'Yes' : 'No',
      status.isSent ? 'Yes' : 'No',
      `"${event.Referral || ''}"`,
      `"${event.Info || ''}"`,
    ].join(',');
  });

  return [headers, ...rows].join('\n');
};

export const exportToCSV = async (events: Event[], filename: string = 'photoevents'): Promise<void> => {
  try {
    const csvContent = generateCSV(events);
    const timestamp = format(new Date(), 'yyyyMMdd_HHmmss');
    const fileUri = `${FileSystem.documentDirectory}${filename}_${timestamp}.csv`;

    await FileSystem.writeAsStringAsync(fileUri, csvContent, {
      encoding: FileSystem.EncodingType.UTF8,
    });

    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(fileUri, {
        mimeType: 'text/csv',
        dialogTitle: 'Export Events to CSV',
      });
    } else {
      throw new Error('Sharing is not available on this device');
    }
  } catch (error) {
    console.error('Error exporting to CSV:', error);
    throw error;
  }
};

// PDF Export
export const generateEventListHTML = (events: Event[], title: string = 'Photo Events Report'): string => {
  const eventsHTML = events
    .map((event) => {
      const charge = parseAmount(event.Charge);
      const payment = parseAmount(event.Payment);
      const balance = charge - payment;
      const status = getEventStatus(event);

      return `
        <div class="event-card">
          <div class="event-header">
            <span class="icon">${getCategoryIcon(event.Category)}</span>
            <div>
              <h3>${event.Name}</h3>
              <p class="category">${event.Category}</p>
            </div>
          </div>
          <div class="event-details">
            <p><strong>📅 Date:</strong> ${formatEventDateTime(event)}</p>
            ${event.Start ? `<p><strong>⏱️ Time:</strong> ${event.Start}${event.End ? ' - ' + event.End : ''}</p>` : ''}
            ${event.Place ? `<p><strong>📍 Place:</strong> ${event.Place}</p>` : ''}
            ${event.Address ? `<p><strong>🗺️ Address:</strong> ${event.Address}</p>` : ''}
            ${event.Phone ? `<p><strong>📞 Phone:</strong> ${event.Phone}</p>` : ''}
          </div>
          <div class="financial">
            <p><strong>Charge:</strong> $${charge.toFixed(2)}</p>
            <p><strong>Paid:</strong> $${payment.toFixed(2)}</p>
            ${balance > 0 ? `<p class="balance"><strong>Balance:</strong> $${balance.toFixed(2)}</p>` : ''}
          </div>
          <div class="status">
            <span class="badge ${status.isPaid ? 'paid' : 'unpaid'}">
              ${status.isPaid ? '✓ Paid' : '✗ Unpaid'}
            </span>
            <span class="badge ${status.isReady ? 'ready' : 'not-ready'}">
              ${status.isReady ? '✓ Ready' : '⏳ Not Ready'}
            </span>
            <span class="badge ${status.isSent ? 'sent' : 'not-sent'}">
              ${status.isSent ? '✓ Sent' : '📤 Not Sent'}
            </span>
          </div>
          ${event.Info ? `<p class="info"><strong>Notes:</strong> ${event.Info}</p>` : ''}
          ${event.Referral ? `<p class="info"><strong>Referral:</strong> ${event.Referral}</p>` : ''}
        </div>
      `;
    })
    .join('');

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          padding: 20px;
          background: #f5f5f5;
        }
        h1 {
          color: #1e293b;
          border-bottom: 3px solid #3b82f6;
          padding-bottom: 10px;
          margin-bottom: 20px;
        }
        .report-date {
          color: #64748b;
          margin-bottom: 30px;
        }
        .event-card {
          background: white;
          border-radius: 8px;
          padding: 16px;
          margin-bottom: 16px;
          box-shadow: 0 1px 3px rgba(0,0,0,0.1);
          page-break-inside: avoid;
        }
        .event-header {
          display: flex;
          align-items: center;
          margin-bottom: 12px;
        }
        .icon {
          font-size: 32px;
          margin-right: 12px;
        }
        h3 {
          margin: 0 0 4px 0;
          color: #0f172a;
        }
        .category {
          margin: 0;
          color: #64748b;
          font-size: 14px;
        }
        .event-details p, .financial p, .info {
          margin: 6px 0;
          color: #334155;
        }
        .financial {
          background: #f8fafc;
          padding: 12px;
          border-radius: 6px;
          margin: 12px 0;
        }
        .balance {
          color: #ef4444;
          font-weight: bold;
        }
        .status {
          display: flex;
          gap: 8px;
          margin-top: 12px;
        }
        .badge {
          padding: 4px 12px;
          border-radius: 12px;
          font-size: 12px;
          font-weight: 600;
        }
        .paid { background: #dcfce7; color: #16a34a; }
        .unpaid { background: #fef2f2; color: #dc2626; }
        .ready { background: #dbeafe; color: #2563eb; }
        .not-ready { background: #fef3c7; color: #d97706; }
        .sent { background: #e0e7ff; color: #4f46e5; }
        .not-sent { background: #fee2e2; color: #dc2626; }
      </style>
    </head>
    <body>
      <h1>${title}</h1>
      <p class="report-date">Generated on ${format(new Date(), 'MMMM dd, yyyy - hh:mm a')}</p>
      ${eventsHTML}
    </body>
    </html>
  `;
};

export const exportToPDF = async (events: Event[], filename: string = 'photoevents'): Promise<void> => {
  try {
    const html = generateEventListHTML(events);
    const timestamp = format(new Date(), 'yyyyMMdd_HHmmss');

    const { uri } = await printToFileAsync({
      html,
      base64: false,
    });

    // Move to a permanent location with proper filename
    const newUri = `${FileSystem.documentDirectory}${filename}_${timestamp}.pdf`;
    await FileSystem.moveAsync({
      from: uri,
      to: newUri,
    });

    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(newUri, {
        mimeType: 'application/pdf',
        dialogTitle: 'Export Events to PDF',
      });
    } else {
      throw new Error('Sharing is not available on this device');
    }
  } catch (error) {
    console.error('Error exporting to PDF:', error);
    throw error;
  }
};

// Payment Summary
export interface PaymentSummary {
  totalEvents: number;
  totalCharge: number;
  totalPaid: number;
  totalBalance: number;
  paidEvents: number;
  unpaidEvents: number;
  averageCharge: number;
  averagePayment: number;
}

export const generatePaymentSummary = (events: Event[]): PaymentSummary => {
  const summary = events.reduce(
    (acc, event) => {
      const charge = parseAmount(event.Charge);
      const payment = parseAmount(event.Payment);
      const balance = charge - payment;
      const status = getEventStatus(event);

      // Check if phone contains 'Weinman' (treat as paid for counting)
      const isWeinman = event.Phone?.toLowerCase().includes('weinman') ?? false;

      // Check if event date is in the future
      const eventDate = new Date(event.EventDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const isFutureEvent = eventDate >= today;

      acc.totalCharge += charge;
      acc.totalPaid += payment;
      acc.totalBalance += balance;
      acc.paidEvents += status.isPaid || isWeinman || isFutureEvent ? 1 : 0;
      acc.unpaidEvents += !status.isPaid && !isWeinman && !isFutureEvent ? 1 : 0;

      return acc;
    },
    {
      totalEvents: events.length,
      totalCharge: 0,
      totalPaid: 0,
      totalBalance: 0,
      paidEvents: 0,
      unpaidEvents: 0,
      averageCharge: 0,
      averagePayment: 0,
    }
  );

  summary.averageCharge = summary.totalEvents > 0 ? summary.totalCharge / summary.totalEvents : 0;
  summary.averagePayment = summary.totalEvents > 0 ? summary.totalPaid / summary.totalEvents : 0;

  return summary;
};

export const generatePaymentSummaryHTML = (summary: PaymentSummary): string => {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          padding: 20px;
          background: #f5f5f5;
        }
        h1 {
          color: #1e293b;
          border-bottom: 3px solid #3b82f6;
          padding-bottom: 10px;
          margin-bottom: 20px;
        }
        .report-date {
          color: #64748b;
          margin-bottom: 30px;
        }
        .summary-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 16px;
          margin-bottom: 20px;
        }
        .summary-card {
          background: white;
          padding: 20px;
          border-radius: 8px;
          box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        }
        .summary-card h3 {
          margin: 0 0 8px 0;
          color: #64748b;
          font-size: 14px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .summary-card .value {
          font-size: 32px;
          font-weight: bold;
          color: #0f172a;
        }
        .positive { color: #16a34a; }
        .negative { color: #dc2626; }
        .neutral { color: #3b82f6; }
      </style>
    </head>
    <body>
      <h1>Payment Summary Report</h1>
      <p class="report-date">Generated on ${format(new Date(), 'MMMM dd, yyyy - hh:mm a')}</p>

      <div class="summary-grid">
        <div class="summary-card">
          <h3>Total Events</h3>
          <div class="value neutral">${summary.totalEvents}</div>
        </div>

        <div class="summary-card">
          <h3>Total Revenue</h3>
          <div class="value neutral">$${summary.totalCharge.toFixed(2)}</div>
        </div>

        <div class="summary-card">
          <h3>Total Collected</h3>
          <div class="value positive">$${summary.totalPaid.toFixed(2)}</div>
        </div>

        <div class="summary-card">
          <h3>Outstanding Balance</h3>
          <div class="value ${summary.totalBalance > 0 ? 'negative' : 'positive'}">$${summary.totalBalance.toFixed(2)}</div>
        </div>

        <div class="summary-card">
          <h3>Paid Events</h3>
          <div class="value positive">${summary.paidEvents}</div>
        </div>

        <div class="summary-card">
          <h3>Unpaid Events</h3>
          <div class="value negative">${summary.unpaidEvents}</div>
        </div>

        <div class="summary-card">
          <h3>Average Charge</h3>
          <div class="value neutral">$${summary.averageCharge.toFixed(2)}</div>
        </div>

        <div class="summary-card">
          <h3>Average Payment</h3>
          <div class="value neutral">$${summary.averagePayment.toFixed(2)}</div>
        </div>
      </div>
    </body>
    </html>
  `;
};

export const exportPaymentSummaryPDF = async (events: Event[]): Promise<void> => {
  try {
    const summary = generatePaymentSummary(events);
    const html = generatePaymentSummaryHTML(summary);
    const timestamp = format(new Date(), 'yyyyMMdd_HHmmss');

    const { uri } = await printToFileAsync({
      html,
      base64: false,
    });

    const newUri = `${FileSystem.documentDirectory}payment_summary_${timestamp}.pdf`;
    await FileSystem.moveAsync({
      from: uri,
      to: newUri,
    });

    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(newUri, {
        mimeType: 'application/pdf',
        dialogTitle: 'Payment Summary Report',
      });
    }
  } catch (error) {
    console.error('Error exporting payment summary:', error);
    throw error;
  }
};

// Monthly/Weekly Summaries
export interface PeriodSummary {
  period: string;
  events: number;
  revenue: number;
  collected: number;
  balance: number;
}

export const generateMonthlySummary = (events: Event[]): PeriodSummary[] => {
  const monthlyData: Record<string, PeriodSummary> = {};

  events.forEach((event) => {
    const date = new Date(event.EventDate);
    const monthKey = format(date, 'yyyy-MM');
    const monthLabel = format(date, 'MMMM yyyy');

    if (!monthlyData[monthKey]) {
      monthlyData[monthKey] = {
        period: monthLabel,
        events: 0,
        revenue: 0,
        collected: 0,
        balance: 0,
      };
    }

    const charge = parseAmount(event.Charge);
    const payment = parseAmount(event.Payment);

    monthlyData[monthKey].events++;
    monthlyData[monthKey].revenue += charge;
    monthlyData[monthKey].collected += payment;
    monthlyData[monthKey].balance += charge - payment;
  });

  return Object.values(monthlyData).sort((a, b) => b.period.localeCompare(a.period));
};

export const generateMonthlySummaryHTML = (summaries: PeriodSummary[]): string => {
  const summariesHTML = summaries
    .map(
      (summary) => `
    <tr>
      <td>${summary.period}</td>
      <td>${summary.events}</td>
      <td>$${summary.revenue.toFixed(2)}</td>
      <td>$${summary.collected.toFixed(2)}</td>
      <td class="${summary.balance > 0 ? 'negative' : 'positive'}">$${summary.balance.toFixed(2)}</td>
    </tr>
  `
    )
    .join('');

  const totals = summaries.reduce(
    (acc, s) => ({
      events: acc.events + s.events,
      revenue: acc.revenue + s.revenue,
      collected: acc.collected + s.collected,
      balance: acc.balance + s.balance,
    }),
    { events: 0, revenue: 0, collected: 0, balance: 0 }
  );

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          padding: 20px;
          background: #f5f5f5;
        }
        h1 {
          color: #1e293b;
          border-bottom: 3px solid #3b82f6;
          padding-bottom: 10px;
          margin-bottom: 20px;
        }
        .report-date {
          color: #64748b;
          margin-bottom: 30px;
        }
        table {
          width: 100%;
          background: white;
          border-radius: 8px;
          overflow: hidden;
          box-shadow: 0 1px 3px rgba(0,0,0,0.1);
          border-collapse: collapse;
        }
        th {
          background: #3b82f6;
          color: white;
          padding: 12px;
          text-align: left;
          font-weight: 600;
        }
        td {
          padding: 12px;
          border-bottom: 1px solid #e2e8f0;
        }
        tr:last-child td {
          border-bottom: none;
        }
        .totals {
          background: #f1f5f9;
          font-weight: bold;
        }
        .positive { color: #16a34a; }
        .negative { color: #dc2626; }
      </style>
    </head>
    <body>
      <h1>Monthly Summary Report</h1>
      <p class="report-date">Generated on ${format(new Date(), 'MMMM dd, yyyy - hh:mm a')}</p>

      <table>
        <thead>
          <tr>
            <th>Month</th>
            <th>Events</th>
            <th>Revenue</th>
            <th>Collected</th>
            <th>Balance</th>
          </tr>
        </thead>
        <tbody>
          ${summariesHTML}
          <tr class="totals">
            <td>TOTAL</td>
            <td>${totals.events}</td>
            <td>$${totals.revenue.toFixed(2)}</td>
            <td>$${totals.collected.toFixed(2)}</td>
            <td class="${totals.balance > 0 ? 'negative' : 'positive'}">$${totals.balance.toFixed(2)}</td>
          </tr>
        </tbody>
      </table>
    </body>
    </html>
  `;
};

export const exportMonthlySummaryPDF = async (events: Event[]): Promise<void> => {
  try {
    const summaries = generateMonthlySummary(events);
    const html = generateMonthlySummaryHTML(summaries);
    const timestamp = format(new Date(), 'yyyyMMdd_HHmmss');

    const { uri } = await printToFileAsync({
      html,
      base64: false,
    });

    const newUri = `${FileSystem.documentDirectory}monthly_summary_${timestamp}.pdf`;
    await FileSystem.moveAsync({
      from: uri,
      to: newUri,
    });

    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(newUri, {
        mimeType: 'application/pdf',
        dialogTitle: 'Monthly Summary Report',
      });
    }
  } catch (error) {
    console.error('Error exporting monthly summary:', error);
    throw error;
  }
};
