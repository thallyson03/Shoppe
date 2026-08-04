import { fetchAnalytics, formatBRL, formatDate, formatDateTime } from '@/lib/api';
import { SyncConversionsButton } from '@/components/SyncConversionsButton';

export const dynamic = 'force-dynamic';

export default async function AnalyticsPage() {
  let data: Awaited<ReturnType<typeof fetchAnalytics>> | null = null;
  let error: string | null = null;

  try {
    data = await fetchAnalytics();
  } catch (e) {
    error = e instanceof Error ? e.message : 'Erro';
  }

  if (error || !data) {
    return (
      <div>
        <div className="page-header">
          <div>
            <h1>Analytics</h1>
            <p>Não foi possível carregar.</p>
          </div>
        </div>
        <div className="card"><p>{error}</p></div>
      </div>
    );
  }

  const maxCommission = Math.max(...data.daily.map((d: { commission: number }) => d.commission), 1);

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Analytics</h1>
          <p>
            {formatDate(data.from)} → {formatDate(data.to)}
          </p>
        </div>
        <SyncConversionsButton />
      </div>

      <div className="grid kpis">
        <div className="card">
          <h3>Comissão (período)</h3>
          <div className="value">{formatBRL(data.totals.commission)}</div>
        </div>
        <div className="card">
          <h3>Conversões</h3>
          <div className="value">{data.totals.conversions}</div>
        </div>
        <div className="card">
          <h3>Status</h3>
          <div className="hint" style={{ marginTop: 8 }}>
            {data.byStatus.map((s: { status: string; count: number }) => (
              <div key={s.status}>{s.status}: {s.count}</div>
            ))}
            {data.byStatus.length === 0 && 'Sem dados — rode o Sync'}
          </div>
        </div>
      </div>

      <div className="panel" style={{ marginTop: 16 }}>
        <div className="panel-header"><h2>Comissão por dia</h2></div>
        {data.daily.length === 0 ? (
          <p className="hint" style={{ padding: 16 }}>Sem conversões no período.</p>
        ) : (
          <div style={{ padding: 16, display: 'flex', alignItems: 'flex-end', gap: 6, minHeight: 160 }}>
            {data.daily.map((d: { date: string; commission: number; conversions: number }) => (
              <div key={d.date} title={`${d.date}: ${formatBRL(d.commission)} · ${d.conversions} conv.`} style={{ flex: 1, textAlign: 'center' }}>
                <div
                  style={{
                    height: `${Math.max(4, (d.commission / maxCommission) * 120)}px`,
                    background: 'var(--accent, #e85d04)',
                    borderRadius: 4,
                    opacity: 0.85,
                  }}
                />
                <div className="hint" style={{ fontSize: 10, marginTop: 4 }}>{d.date.slice(5)}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="split" style={{ marginTop: 16 }}>
        <div className="panel">
          <div className="panel-header"><h2>Top produtos (comissão)</h2></div>
          <table className="table">
            <thead>
              <tr>
                <th>Produto</th>
                <th>Qtd</th>
                <th>Comissão</th>
              </tr>
            </thead>
            <tbody>
              {data.topProducts.map((p: { itemId: string; name: string; qty: number; commission: number }) => (
                <tr key={p.itemId}>
                  <td>{p.name}</td>
                  <td>{p.qty}</td>
                  <td>{formatBRL(p.commission)}</td>
                </tr>
              ))}
              {data.topProducts.length === 0 && (
                <tr><td colSpan={3}>Sem itens.</td></tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="panel">
          <div className="panel-header"><h2>Conversões recentes</h2></div>
          <table className="table">
            <thead>
              <tr>
                <th>Data</th>
                <th>Status</th>
                <th>Comissão</th>
              </tr>
            </thead>
            <tbody>
              {data.recent.map((c: { id: string; purchaseTime: string; orderStatus: string | null; totalCommission: number }) => (
                <tr key={c.id}>
                  <td>{formatDateTime(c.purchaseTime)}</td>
                  <td>{c.orderStatus ?? '—'}</td>
                  <td>{formatBRL(c.totalCommission)}</td>
                </tr>
              ))}
              {data.recent.length === 0 && (
                <tr><td colSpan={3}>Nenhuma conversão.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
