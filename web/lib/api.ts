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

/** Cliente e SSR: URL pública da API; no browser, fallback /backend (proxy Next). */
const API_BASE =
  (process.env.NEXT_PUBLIC_API_URL ?? '').replace(/\/$/, '') ||
  (typeof window === 'undefined' ? 'http://localhost:3000' : '/backend');

function authHeaders(): HeadersInit {
  if (typeof window === 'undefined') return {};
  const token = localStorage.getItem('shoppe_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function parseError(res: Response): Promise<string> {
  const body = await res.json().catch(() => ({}));
  return (body as { message?: string }).message ?? `HTTP ${res.status}`;
}

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

export async function fetchProductPrices(id: string) {
  const res = await fetch(`${API_BASE}/api/products/${id}/prices`, {
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(await parseError(res));
  return res.json();
}

export async function fetchGroups() {
  const res = await fetch(`${API_BASE}/api/groups`, { cache: 'no-store' });
  if (!res.ok) throw new Error('Falha ao carregar grupos');
  return res.json();
}

export async function createGroup(input: {
  name: string;
  groupJid: string;
  categories?: string[];
}) {
  const res = await fetch(`${API_BASE}/api/groups`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error(await parseError(res));
  return res.json();
}

export async function updateGroup(id: string, data: { isActive?: boolean }) {
  const res = await fetch(`${API_BASE}/api/groups/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(await parseError(res));
  return res.json();
}

export async function fetchCampaigns() {
  const res = await fetch(`${API_BASE}/api/campaigns`, { cache: 'no-store' });
  if (!res.ok) throw new Error('Falha ao carregar campanhas');
  return res.json();
}

export async function createCampaign(input: {
  name: string;
  startsAt: string;
  endsAt: string;
  commissionGoal?: number;
  groupId?: string;
}) {
  const res = await fetch(`${API_BASE}/api/campaigns`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error(await parseError(res));
  return res.json();
}

export async function fetchAutomations() {
  const res = await fetch(`${API_BASE}/api/automations`, { cache: 'no-store' });
  if (!res.ok) throw new Error('Falha ao carregar automações');
  return res.json();
}

export async function createAutomation(input: {
  name: string;
  logic?: string;
  conditions: Array<{ field: string; op: string; value: number }>;
  action?: string;
  priority?: number;
}) {
  const res = await fetch(`${API_BASE}/api/automations`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error(await parseError(res));
  return res.json();
}

export async function updateAutomation(id: string, data: { isActive?: boolean }) {
  const res = await fetch(`${API_BASE}/api/automations/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(await parseError(res));
  return res.json();
}

export async function fetchSchedule(from?: string, to?: string) {
  const qs = new URLSearchParams();
  if (from) qs.set('from', from);
  if (to) qs.set('to', to);
  const res = await fetch(`${API_BASE}/api/schedule?${qs}`, { cache: 'no-store' });
  if (!res.ok) throw new Error('Falha ao carregar agenda');
  return res.json();
}

export async function createScheduledPost(input: {
  title: string;
  scheduledAt: string;
  productId?: string;
  groupId?: string;
  messageText?: string;
  offerLink?: string;
}) {
  const res = await fetch(`${API_BASE}/api/schedule`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error(await parseError(res));
  return res.json();
}

export async function triggerPipeline() {
  const res = await fetch(`${API_BASE}/offers/run`, {
    method: 'POST',
    headers: { ...authHeaders() },
  });
  if (!res.ok) throw new Error('Falha ao disparar pipeline');
  return res.json();
}

export async function fetchTemplates(channel?: string) {
  const qs = channel ? `?channel=${encodeURIComponent(channel)}` : '';
  const res = await fetch(`${API_BASE}/api/templates${qs}`, { cache: 'no-store' });
  if (!res.ok) throw new Error('Falha ao carregar templates');
  return res.json();
}

export async function createTemplate(input: {
  name: string;
  channel?: string;
  body: string;
  isDefault?: boolean;
}) {
  const res = await fetch(`${API_BASE}/api/templates`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error(await parseError(res));
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
