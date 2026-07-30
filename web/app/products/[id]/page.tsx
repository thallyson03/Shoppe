import Link from 'next/link';
import { fetchProductPrices, formatBRL } from '@/lib/api';
import { PriceChart } from '@/components/PriceChart';

export const dynamic = 'force-dynamic';

export default async function ProductPricePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  let data: Awaited<ReturnType<typeof fetchProductPrices>> | null = null;
  let error: string | null = null;

  try {
    data = await fetchProductPrices(id);
  } catch (e) {
    error = e instanceof Error ? e.message : 'Erro';
  }

  if (error || !data) {
    return (
      <div>
        <div className="page-header">
          <div>
            <h1>Histórico de preços</h1>
            <p>{error ?? 'Produto não encontrado'}</p>
          </div>
        </div>
        <Link href="/products">← Voltar</Link>
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Histórico de preços</h1>
          <p>{data.name}</p>
        </div>
        <Link className="btn secondary" href="/products">Voltar</Link>
      </div>

      <div className="grid kpis">
        <div className="card">
          <h3>Preço atual</h3>
          <div className="value">{formatBRL(data.priceMin)}</div>
        </div>
        <div className="card">
          <h3>Menor registrado</h3>
          <div className="value">
            {formatBRL(
              data.history.length
                ? Math.min(...data.history.map((h: { priceMin: number }) => h.priceMin))
                : data.priceMin,
            )}
          </div>
        </div>
        <div className="card">
          <h3>Pontos no histórico</h3>
          <div className="value">{data.history.length}</div>
        </div>
      </div>

      <div className="panel" style={{ marginTop: 16, padding: 16 }}>
        <PriceChart points={data.history} />
      </div>

      <div className="panel" style={{ marginTop: 14 }}>
        <div className="panel-header"><h2>Registros</h2></div>
        <table className="table">
          <thead>
            <tr>
              <th>Data</th>
              <th>Preço</th>
            </tr>
          </thead>
          <tbody>
            {[...data.history].reverse().map((h: { id: string; priceMin: number; recordedAt: string }) => (
              <tr key={h.id}>
                <td>{new Date(h.recordedAt).toLocaleString('pt-BR')}</td>
                <td>{formatBRL(h.priceMin)}</td>
              </tr>
            ))}
            {data.history.length === 0 && (
              <tr><td colSpan={2}>Sem histórico ainda — rode o sync.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
