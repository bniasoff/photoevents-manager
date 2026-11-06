import { useMemo } from 'react';
import { Download, Printer } from 'lucide-react';
import type { Event } from '../types/Event';
import { generatePaymentSummary, downloadCSV } from '../lib/reports';
import { parseAmount, getEventStatus, formatDate } from '../lib/eventHelpers';

interface ReportsViewProps {
  events: Event[];
}

function SummaryCard({ label, value, tone }: { label: string; value: string; tone: 'positive' | 'negative' | 'neutral' }) {
  const toneClass = tone === 'positive' ? 'text-success' : tone === 'negative' ? 'text-danger' : 'text-primary';
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-text-tertiary">{label}</div>
      <div className={`text-2xl font-bold ${toneClass}`}>{value}</div>
    </div>
  );
}

export function ReportsView({ events }: ReportsViewProps) {
  const summary = useMemo(() => generatePaymentSummary(events), [events]);

  const byCategory = useMemo(() => {
    const map: Record<string, { count: number; charge: number; paid: number }> = {};
    events.forEach((e) => {
      const cat = e.Category || 'Other';
      if (!map[cat]) map[cat] = { count: 0, charge: 0, paid: 0 };
      map[cat].count += 1;
      map[cat].charge += parseAmount(e.Charge);
      map[cat].paid += parseAmount(e.Payment);
    });
    return Object.entries(map).sort((a, b) => b[1].charge - a[1].charge);
  }, [events]);

  return (
    <div className="h-full overflow-y-auto pr-1">
      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        <SummaryCard label="Total Events" value={String(summary.totalEvents)} tone="neutral" />
        <SummaryCard label="Total Revenue" value={`$${summary.totalCharge.toFixed(2)}`} tone="neutral" />
        <SummaryCard label="Collected" value={`$${summary.totalPaid.toFixed(2)}`} tone="positive" />
        <SummaryCard
          label="Balance"
          value={`$${summary.totalBalance.toFixed(2)}`}
          tone={summary.totalBalance > 0 ? 'negative' : 'positive'}
        />
        <SummaryCard label="Paid Events" value={String(summary.paidEvents)} tone="positive" />
        <SummaryCard label="Unpaid Events" value={String(summary.unpaidEvents)} tone="negative" />
        <SummaryCard label="Avg Charge" value={`$${summary.averageCharge.toFixed(2)}`} tone="neutral" />
        <SummaryCard label="Avg Payment" value={`$${summary.averagePayment.toFixed(2)}`} tone="neutral" />
      </div>

      <div className="mb-6 flex gap-3">
        <button
          onClick={() => downloadCSV(events)}
          className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary-light"
        >
          <Download size={16} /> Export CSV
        </button>
        <button
          onClick={() => window.print()}
          className="flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2.5 text-sm font-semibold text-text-primary hover:bg-card-alt"
        >
          <Printer size={16} /> Print / Save as PDF
        </button>
      </div>

      <div className="mb-6 overflow-hidden rounded-xl border border-border">
        <div className="border-b border-border bg-bg-secondary px-4 py-2 text-sm font-semibold text-text-primary">
          By Category
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs text-text-tertiary">
              <th className="px-4 py-2 font-medium">Category</th>
              <th className="px-4 py-2 font-medium">Events</th>
              <th className="px-4 py-2 font-medium">Charged</th>
              <th className="px-4 py-2 font-medium">Collected</th>
            </tr>
          </thead>
          <tbody>
            {byCategory.map(([cat, stats]) => (
              <tr key={cat} className="border-b border-border last:border-0">
                <td className="px-4 py-2 text-text-primary">{cat}</td>
                <td className="px-4 py-2 text-text-secondary">{stats.count}</td>
                <td className="px-4 py-2 text-text-secondary">${stats.charge.toFixed(2)}</td>
                <td className="px-4 py-2 text-text-secondary">${stats.paid.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Hidden on screen; shown only when printing */}
      <div className="print-area hidden print:block">
        <h1 style={{ fontSize: 20, fontWeight: 700, marginBottom: 12 }}>Photo Events Report</h1>
        <p style={{ marginBottom: 16 }}>
          {summary.totalEvents} events · ${summary.totalCharge.toFixed(2)} charged · $
          {summary.totalPaid.toFixed(2)} collected · ${summary.totalBalance.toFixed(2)} balance
        </p>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <thead>
            <tr>
              {['Name', 'Category', 'Date', 'Place', 'Charge', 'Payment', 'Balance', 'Paid', 'Ready', 'Sent'].map((h) => (
                <th key={h} style={{ border: '1px solid #ccc', padding: 4, textAlign: 'left' }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {events.map((e) => {
              const status = getEventStatus(e);
              const charge = parseAmount(e.Charge);
              const payment = parseAmount(e.Payment);
              return (
                <tr key={e.id}>
                  <td style={{ border: '1px solid #ccc', padding: 4 }}>{e.Name}</td>
                  <td style={{ border: '1px solid #ccc', padding: 4 }}>{e.Category}</td>
                  <td style={{ border: '1px solid #ccc', padding: 4 }}>{formatDate(e.EventDate)}</td>
                  <td style={{ border: '1px solid #ccc', padding: 4 }}>{e.Place}</td>
                  <td style={{ border: '1px solid #ccc', padding: 4 }}>${charge.toFixed(2)}</td>
                  <td style={{ border: '1px solid #ccc', padding: 4 }}>${payment.toFixed(2)}</td>
                  <td style={{ border: '1px solid #ccc', padding: 4 }}>${(charge - payment).toFixed(2)}</td>
                  <td style={{ border: '1px solid #ccc', padding: 4 }}>{status.isPaid ? 'Yes' : 'No'}</td>
                  <td style={{ border: '1px solid #ccc', padding: 4 }}>{status.isReady ? 'Yes' : 'No'}</td>
                  <td style={{ border: '1px solid #ccc', padding: 4 }}>{status.isSent ? 'Yes' : 'No'}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
