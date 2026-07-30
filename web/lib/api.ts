export type DashboardOverview = {
  kpis: {
    commissionToday: number | null;
    commissionMonth: number | null;
    clicks: number | null;
    conversions: number | null;
    productsSentToday: number;
    productsSentMonth: number;
    productsTotal: number;
    productsSyncedToday: number;
    pendingQueue: number;
    activeCampaigns: number;
    activeGroups: number;
    note: string;
  };
  quota: {
    allowed: boolean;
    reason: string;
    period: string;
    publishedToday: number;
    publishedInPeriod: number;
    periodLimit: number;
    dailyLimit: number;
  };
  recentSends: Array<{
    id: string;
    status: string;
    groupJid: string;
    groupName: string | null;
    createdAt: string;
    productName: string;
    imageUrl: string | null;
    priceMin: number | null;
    commissionRate: number | null;
    offerLink: string;
  }>;
  topProducts: Array<{
    id: string;
    itemId: string;
    name: string;
    imageUrl: string | null;
    priceMin: number | null;
    sales: number | null;
    commissionRate: number | null;
    ratingStar: number | null;
    offerLink: string;
  }>;
  recentJobs: Array<{
    id: string;
    status: string;
    startedAt: string;
    finishedAt: string | null;
    fetchedCount: number;
    publishedCount: number;
  }>;
};

export type ProductListResponse = {
  page: number;
  limit: number;
  total: number;
  items: Array<{
    id: string;
    itemId: string;
    name: string;
    imageUrl: string | null;
    offerLink: string;
    priceMin: number | null;
    priceDiscountRate: number | null;
    sales: number | null;
    ratingStar: number | null;
    commissionRate: number | null;
    shopName: string | null;
  }>;
};

const API_BASE =
  typeof window === 'undefined'
    ? process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000'
    : '/backend';

export async function fetchDashboard(): Promise<DashboardOverview> {
  const res = await fetch(`${API_BASE}/api/dashboard`, { cache: 'no-store' });
  if (!res.ok) throw new Error('Falha ao carregar dashboard');
  return res.json();
}

export async function fetchProducts(params?: {
  q?: string;
}): Promise<ProductListResponse> {
  const qs = new URLSearchParams();
  if (params?.q) qs.set('q', params.q);
  const res = await fetch(`${API_BASE}/api/products?${qs.toString()}`, {
    cache: 'no-store',
  });
  if (!res.ok) throw new Error('Falha ao carregar produtos');
  return res.json();
}

export async function fetchGroups() {
  const res = await fetch(`${API_BASE}/api/groups`, { cache: 'no-store' });
  if (!res.ok) throw new Error('Falha ao carregar grupos');
  return res.json();
}

export async function fetchCampaigns() {
  const res = await fetch(`${API_BASE}/api/campaigns`, { cache: 'no-store' });
  if (!res.ok) throw new Error('Falha ao carregar campanhas');
  return res.json();
}

export async function triggerPipeline() {
  const res = await fetch(`${API_BASE}/offers/run`, { method: 'POST' });
  if (!res.ok) throw new Error('Falha ao disparar pipeline');
  return res.json();
}

export function formatBRL(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return '—';
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

export function formatPercent(rate: number | null | undefined): string {
  if (rate == null || Number.isNaN(rate)) return '—';
  return `${(rate * 100).toFixed(1)}%`;
}
