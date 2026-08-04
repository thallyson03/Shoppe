import { fetchGroups, fetchProducts, fetchSchedule, formatDateTime } from '@/lib/api';
import { ScheduleForm } from '@/components/ScheduleForm';

export const dynamic = 'force-dynamic';

export default async function CalendarPage() {
  const now = new Date();
  const from = new Date(now);
  from.setDate(from.getDate() - 1);
  const to = new Date(now);
  to.setDate(to.getDate() + 14);

  let posts: Array<{
    id: string;
    title: string;
    scheduledAt: string;
    status: string;
    product?: { name: string } | null;
    group?: { name: string } | null;
  }> = [];
  let products: Array<{ id: string; name: string }> = [];
  let groups: Array<{ id: string; name: string }> = [];
  let error: string | null = null;

  try {
    const [schedule, productList, groupList] = await Promise.all([
      fetchSchedule(from.toISOString(), to.toISOString()),
      fetchProducts(),
      fetchGroups(),
    ]);
    posts = schedule;
    products = productList.items.map((p: { id: string; name: string }) => ({
      id: p.id,
      name: p.name,
    }));
    groups = groupList.map((g: { id: string; name: string }) => ({
      id: g.id,
      name: g.name,
    }));
  } catch (e) {
    error = e instanceof Error ? e.message : 'Erro';
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Calendário</h1>
          <p>Agende posts por horário (próximos 14 dias)</p>
        </div>
      </div>

      {error && <div className="card">{error}</div>}
      <ScheduleForm products={products} groups={groups} />

      <div className="panel">
        <div className="panel-header"><h2>{posts.length} posts</h2></div>
        <table className="table">
          <thead>
            <tr>
              <th>Quando</th>
              <th>Título</th>
              <th>Produto</th>
              <th>Grupo</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {posts.map((p) => (
              <tr key={p.id}>
                <td>{formatDateTime(p.scheduledAt)}</td>
                <td>{p.title}</td>
                <td>{p.product?.name ?? '—'}</td>
                <td>{p.group?.name ?? '—'}</td>
                <td>
                  <span className={`badge ${p.status === 'sent' ? 'ok' : p.status === 'failed' ? 'warn' : 'muted'}`}>
                    {p.status}
                  </span>
                </td>
              </tr>
            ))}
            {posts.length === 0 && !error && (
              <tr><td colSpan={5}>Nada agendado.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
