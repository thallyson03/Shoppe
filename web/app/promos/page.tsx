import { fetchPromos, formatDateTime, formatPercent } from '@/lib/api';
import { PublishPromoButton } from '@/components/PublishPromoButton';
import { SyncPromosButton } from '@/components/SyncPromosButton';

export const dynamic = 'force-dynamic';

export default async function PromosPage() {
  let promos: Awaited<ReturnType<typeof fetchPromos>> = [];
  let error: string | null = null;

  try {
    promos = await fetchPromos();
  } catch (e) {
    error = e instanceof Error ? e.message : 'Erro';
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Promoções Shopee</h1>
          <p>Campanhas e coleções da plataforma (shopeeOfferV2)</p>
        </div>
        <SyncPromosButton />
      </div>

      {error && <div className="card">{error}</div>}

      <div className="panel">
        <div className="panel-header">
          <h2>{promos.length} promoções</h2>
        </div>
        <table className="table">
          <thead>
            <tr>
              <th>Campanha</th>
              <th>Comissão</th>
              <th>Período</th>
              <th>Status</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {promos.map((p) => (
              <tr key={p.id}>
                <td>
                  <div className="product-cell">
                    {p.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img className="thumb" src={p.imageUrl} alt="" />
                    ) : (
                      <div className="thumb" />
                    )}
                    <div>
                      <div>{p.offerName}</div>
                      <a
                        className="hint"
                        href={p.offerLink}
                        target="_blank"
                        rel="noreferrer"
                        style={{ color: 'var(--muted)' }}
                      >
                        link afiliado
                      </a>
                    </div>
                  </div>
                </td>
                <td>{formatPercent(p.commissionRate != null ? Number(p.commissionRate) : null)}</td>
                <td>
                  <div className="hint">
                    {formatDateTime(p.periodStartTime)}
                    <br />
                    {formatDateTime(p.periodEndTime)}
                  </div>
                </td>
                <td>
                  <span className={`badge ${p.published ? 'ok' : 'muted'}`}>
                    {p.published ? 'enviada' : 'pendente'}
                  </span>
                </td>
                <td>
                  <PublishPromoButton id={p.id} disabled={p.published} />
                </td>
              </tr>
            ))}
            {promos.length === 0 && !error && (
              <tr>
                <td colSpan={5}>Nenhuma promoção — clique em Sync Shopee.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
