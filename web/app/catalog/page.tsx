import Link from 'next/link';
import { fetchPublicCatalog, formatBRL } from '@/lib/api';

export const dynamic = 'force-dynamic';

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function one(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return value[0] ?? '';
  return value ?? '';
}

function num(value: string): number | undefined {
  if (!value.trim()) return undefined;
  const n = Number(value);
  return Number.isFinite(n) ? n : undefined;
}

function buildHref(
  base: Record<string, string>,
  patch: Record<string, string | undefined>,
): string {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries({ ...base, ...patch })) {
    if (v != null && v !== '') qs.set(k, v);
  }
  const s = qs.toString();
  return s ? `/catalog?${s}` : '/catalog';
}

export default async function CatalogPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const sp = await searchParams;
  const q = one(sp.q);
  const sort = one(sp.sort) || 'relevance';
  const page = Math.max(1, num(one(sp.page)) ?? 1);
  const minPrice = one(sp.minPrice);
  const maxPrice = one(sp.maxPrice);
  const minRating = one(sp.minRating);
  const minDiscount = one(sp.minDiscount);
  const categoryId = one(sp.categoryId);

  const filterState = {
    q,
    sort,
    minPrice,
    maxPrice,
    minRating,
    minDiscount,
    categoryId,
  };

  let data: Awaited<ReturnType<typeof fetchPublicCatalog>> | null = null;
  let error: string | null = null;

  try {
    data = await fetchPublicCatalog({
      q: q || undefined,
      page,
      limit: 24,
      sort,
      minPrice: num(minPrice),
      maxPrice: num(maxPrice),
      minRating: num(minRating),
      minDiscount: num(minDiscount),
      categoryId: num(categoryId),
    });
  } catch (e) {
    error = e instanceof Error ? e.message : 'Não foi possível carregar o catálogo';
  }

  const items = data?.items ?? [];

  return (
    <div className="catalog">
      <header className="catalog-hero">
        <div className="catalog-hero-inner">
          <p className="catalog-brand">Shoppe</p>
          <h1>Ofertas com link de afiliado</h1>
          <p className="catalog-lead">
            Explore produtos da Shopee. Ao clicar, você vai direto com o nosso link.
          </p>
        </div>
      </header>

      <div className="catalog-body">
        <form className="catalog-filters" method="get" action="/catalog">
          <input
            name="q"
            defaultValue={q}
            placeholder="Buscar produto…"
            aria-label="Buscar"
          />
          <input
            name="minPrice"
            type="number"
            min={0}
            step="0.01"
            defaultValue={minPrice}
            placeholder="Preço mín."
            aria-label="Preço mínimo"
          />
          <input
            name="maxPrice"
            type="number"
            min={0}
            step="0.01"
            defaultValue={maxPrice}
            placeholder="Preço máx."
            aria-label="Preço máximo"
          />
          <select name="minRating" defaultValue={minRating} aria-label="Avaliação mínima">
            <option value="">Avaliação</option>
            <option value="4.5">4.5+</option>
            <option value="4">4.0+</option>
            <option value="3.5">3.5+</option>
          </select>
          <select name="minDiscount" defaultValue={minDiscount} aria-label="Desconto mínimo">
            <option value="">Desconto</option>
            <option value="10">10%+</option>
            <option value="20">20%+</option>
            <option value="40">40%+</option>
            <option value="50">50%+</option>
          </select>
          <input
            name="categoryId"
            type="number"
            min={1}
            defaultValue={categoryId}
            placeholder="ID categoria"
            aria-label="ID da categoria Shopee"
          />
          <select name="sort" defaultValue={sort} aria-label="Ordenar">
            <option value="relevance">Relevância</option>
            <option value="sales">Mais vendidos</option>
            <option value="price_asc">Menor preço</option>
            <option value="price_desc">Maior preço</option>
            <option value="rating">Melhor avaliação</option>
            <option value="commission">Maior comissão</option>
          </select>
          <button className="catalog-btn" type="submit">
            Filtrar
          </button>
        </form>

        {error && (
          <div className="catalog-empty">
            <p>{error}</p>
            <p className="catalog-muted">Tente novamente em instantes.</p>
          </div>
        )}

        {!error && items.length === 0 && (
          <div className="catalog-empty">
            <p>Nenhum produto encontrado com esses filtros.</p>
            <Link href="/catalog" className="catalog-btn secondary">
              Limpar filtros
            </Link>
          </div>
        )}

        {items.length > 0 && (
          <div className="catalog-grid">
            {items.map((p) => (
              <a
                key={p.itemId}
                className="catalog-card"
                href={p.offerLink}
                target="_blank"
                rel="noopener noreferrer"
              >
                <div className="catalog-card-media">
                  {p.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={p.imageUrl} alt="" />
                  ) : (
                    <div className="catalog-card-placeholder" />
                  )}
                  {p.priceDiscountRate != null && p.priceDiscountRate > 0 && (
                    <span className="catalog-badge">-{p.priceDiscountRate}%</span>
                  )}
                </div>
                <div className="catalog-card-body">
                  <h2>{p.name}</h2>
                  {p.shopName && <p className="catalog-shop">{p.shopName}</p>}
                  <div className="catalog-meta">
                    <strong>{formatBRL(p.priceMin)}</strong>
                    {p.ratingStar != null && (
                      <span>★ {Number(p.ratingStar).toFixed(1)}</span>
                    )}
                    {p.sales != null && p.sales > 0 && (
                      <span>{p.sales.toLocaleString('pt-BR')} vendidos</span>
                    )}
                  </div>
                  <span className="catalog-cta">Ver na Shopee</span>
                </div>
              </a>
            ))}
          </div>
        )}

        {data && (page > 1 || data.hasNextPage) && (
          <nav className="catalog-pager" aria-label="Paginação">
            {page > 1 ? (
              <Link
                className="catalog-btn secondary"
                href={buildHref(filterState, { page: String(page - 1) })}
              >
                Anterior
              </Link>
            ) : (
              <span />
            )}
            <span className="catalog-muted">Página {page}</span>
            {data.hasNextPage ? (
              <Link
                className="catalog-btn secondary"
                href={buildHref(filterState, { page: String(page + 1) })}
              >
                Próxima
              </Link>
            ) : (
              <span />
            )}
          </nav>
        )}
      </div>
    </div>
  );
}
