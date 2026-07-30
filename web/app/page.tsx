import { fetchDashboard, formatBRL, formatPercent } from '@/lib/api';
import { RunButton } from '@/components/RunButton';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  let data: Awaited<ReturnType<typeof fetchDashboard>> | null = null;
  let error: string | null = null;

  try {
    data = await fetchDashboard();
  } catch (e) {
    error = e instanceof Error ? e.message : 'Erro ao carregar';
  }

  if (error || !data) {
    return (
      <div>
        <div className="page-header">
          <div>
            <h1>Dashboard</h1>
            <p>Não foi possível conectar na API.</p>
          </div>
        </div>
        <div className="card">
          <p>{error}</p>
          <p className="hint">
            Suba a API em <code>:3000</code> e defina <code>NEXT_PUBLIC_API_URL</code>.
          </p>
        </div>
      </div>
    );
  }

  const { kpis, quota, recentSends, topProducts, recentJobs } = data;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Dashboard</h1>
          <p>
            Período atual: <strong>{quota.period}</strong> · enviados hoje{' '}
            {quota.publishedToday}/{quota.dailyLimit}
          </p>
        </div>
        <RunButton />
      </div>

      <div className="grid kpis">
        <div className="card">
          <h3>Enviados hoje</h3>
          <div className="value">{kpis.productsSentToday}</div>
          <div className="hint">Mês: {kpis.productsSentMonth}</div>
        </div>
        <div className="card">
          <h3>Produtos no catálogo</h3>
          <div className="value">{kpis.productsTotal}</div>
          <div className="hint">Sync hoje: {kpis.productsSyncedToday}</div>
        </div>
        <div className="card">
          <h3>Fila pendente</h3>
          <div className="value">{kpis.pendingQueue}</div>
          <div className="hint">{quota.allowed ? 'Cota liberada' : quota.reason}</div>
        </div>
        <div className="card">
          <h3>Campanhas ativas</h3>
          <div className="value">{kpis.activeCampaigns}</div>
          <div className="hint">Grupos ativos: {kpis.activeGroups}</div>
        </div>
      </div>

      <div className="grid kpis">
        <div className="card">
          <h3>Comissão hoje</h3>
          <div className="value">—</div>
          <div className="hint">Fase 3 · conversionReport</div>
        </div>
        <div className="card">
          <h3>Comissão do mês</h3>
          <div className="value">—</div>
          <div className="hint">Fase 3 · conversionReport</div>
        </div>
        <div className="card">
          <h3>Cliques</h3>
          <div className="value">—</div>
          <div className="hint">Fase 3</div>
        </div>
        <div className="card">
          <h3>Conversões</h3>
          <div className="value">—</div>
          <div className="hint">Fase 3</div>
        </div>
      </div>

      <p className="note">{kpis.note}</p>

      <div className="split" style={{ marginTop: 18 }}>
        <div className="panel">
          <div className="panel-header">
            <h2>Envios recentes</h2>
          </div>
          <table className="table">
            <thead>
              <tr>
                <th>Produto</th>
                <th>Status</th>
                <th>Grupo</th>
                <th>Preço</th>
              </tr>
            </thead>
            <tbody>
              {recentSends.map((s) => (
                <tr key={s.id}>
                  <td>
                    <div className="product-cell">
                      {s.imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img className="thumb" src={s.imageUrl} alt="" />
                      ) : (
                        <div className="thumb" />
                      )}
                      <span>{s.productName}</span>
                    </div>
                  </td>
                  <td>
                    <span className={`badge ${s.status === 'sent' ? 'ok' : 'warn'}`}>
                      {s.status}
                    </span>
                  </td>
                  <td>{s.groupName ?? s.groupJid}</td>
                  <td>{formatBRL(s.priceMin)}</td>
                </tr>
              ))}
              {recentSends.length === 0 && (
                <tr>
                  <td colSpan={4}>Nenhum envio ainda.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="panel">
          <div className="panel-header">
            <h2>Mais vendidos (catálogo)</h2>
          </div>
          <table className="table">
            <thead>
              <tr>
                <th>Produto</th>
                <th>Vendas</th>
                <th>Comissão</th>
              </tr>
            </thead>
            <tbody>
              {topProducts.map((p) => (
                <tr key={p.id}>
                  <td>
                    <div className="product-cell">
                      {p.imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img className="thumb" src={p.imageUrl} alt="" />
                      ) : (
                        <div className="thumb" />
                      )}
                      <span>{p.name}</span>
                    </div>
                  </td>
                  <td>{p.sales?.toLocaleString('pt-BR') ?? '—'}</td>
                  <td>{formatPercent(p.commissionRate)}</td>
                </tr>
              ))}
              {topProducts.length === 0 && (
                <tr>
                  <td colSpan={3}>Catálogo vazio — rode o pipeline.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="panel" style={{ marginTop: 14 }}>
        <div className="panel-header">
          <h2>Jobs do cron</h2>
        </div>
        <table className="table">
          <thead>
            <tr>
              <th>Início</th>
              <th>Status</th>
              <th>Fetched</th>
              <th>Published</th>
            </tr>
          </thead>
          <tbody>
            {recentJobs.map((j) => (
              <tr key={j.id}>
                <td>{new Date(j.startedAt).toLocaleString('pt-BR')}</td>
                <td>
                  <span className={`badge ${j.status === 'success' ? 'ok' : 'muted'}`}>
                    {j.status}
                  </span>
                </td>
                <td>{j.fetchedCount}</td>
                <td>{j.publishedCount}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
