import type { Event } from '../types/Event';
import { parseAmount, getEventStatus, isUnpaid } from './eventHelpers';

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
      acc.totalCharge += charge;
      acc.totalPaid += payment;
      acc.totalBalance += charge - payment;
      acc.unpaidEvents += isUnpaid(event) ? 1 : 0;
      acc.paidEvents += isUnpaid(event) ? 0 : 1;
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

const csvEscape = (v: string | number | undefined | null): string => `"${String(v ?? '').replace(/"/g, '""')}"`;

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
    const status = getEventStatus(event);
    return [
      csvEscape(event.Name),
      csvEscape(event.Category),
      event.EventDate,
      csvEscape(`${event.Start}${event.End ? ' - ' + event.End : ''}`),
      csvEscape(event.Place),
      csvEscape(event.Address),
      csvEscape(event.Phone),
      charge.toFixed(2),
      payment.toFixed(2),
      (charge - payment).toFixed(2),
      status.isPaid ? 'Yes' : 'No',
      status.isReady ? 'Yes' : 'No',
      status.isSent ? 'Yes' : 'No',
      csvEscape(event.Referral),
      csvEscape(event.Info),
    ].join(',');
  });

  return [headers, ...rows].join('\n');
};

export const downloadCSV = (events: Event[]): void => {
  const csv = generateCSV(events);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  a.href = url;
  a.download = `photoevents_${timestamp}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
};
