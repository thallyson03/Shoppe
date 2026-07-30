import { fetchProducts, formatBRL, formatPercent } from '@/lib/api';

export const dynamic = 'force-dynamic';

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const sp = await searchParams;
  let data: Awaited<ReturnType<typeof fetchProducts>> | null = null;
  let error: string | null = null;

  try {
    data = await fetchProducts({ q: sp.q });
  } catch (e) {
    error = e instanceof Error ? e.message : 'Erro';
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Produtos</h1>
          <p>Catálogo sincronizado da Open API Shopee</p>
        </div>
      </div>

      <form className="filters" method="get">
        <input
          name="q"
          defaultValue={sp.q ?? ''}
          placeholder="Buscar por nome…"
        />
        <button className="btn secondary" type="submit">
          Filtrar
        </button>
      </form>

      {error && <div className="card">{error}</div>}

      {data && (
        <div className="panel">
          <div className="panel-header">
            <h2>{data.total} produtos</h2>
          </div>
          <table className="table">
            <thead>
              <tr>
                <th>Produto</th>
                <th>Preço</th>
                <th>Desconto</th>
                <th>Comissão</th>
                <th>Avaliação</th>
                <th>Vendas</th>
                <th>Link</th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((p) => (
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
                        <div>{p.name}</div>
                        <div className="hint">{p.shopName ?? '—'}</div>
                      </div>
                    </div>
                  </td>
                  <td>{formatBRL(p.priceMin)}</td>
                  <td>{p.priceDiscountRate != null ? `${p.priceDiscountRate}%` : '—'}</td>
                  <td>{formatPercent(p.commissionRate)}</td>
                  <td>{p.ratingStar?.toFixed(1) ?? '—'}</td>
                  <td>{p.sales?.toLocaleString('pt-BR') ?? '—'}</td>
                  <td>
                    <a href={p.offerLink} target="_blank" rel="noreferrer">
                      Abrir
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
