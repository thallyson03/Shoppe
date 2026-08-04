import { fetchCampaigns, fetchGroups, formatDateTime } from '@/lib/api';
import { CampaignForm } from '@/components/CampaignForm';

export const dynamic = 'force-dynamic';

export default async function CampaignsPage() {
  let campaigns: Array<{
    id: string;
    name: string;
    startsAt: string;
    endsAt: string;
    isActive: boolean;
    group?: { name: string } | null;
    channel?: { name: string; type: string } | null;
  }> = [];
  let groups: Array<{ id: string; name: string }> = [];
  let error: string | null = null;

  try {
    [campaigns, groups] = await Promise.all([fetchCampaigns(), fetchGroups()]);
  } catch (e) {
    error = e instanceof Error ? e.message : 'Erro';
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Campanhas</h1>
          <p>Cadastro e acompanhamento de campanhas</p>
        </div>
      </div>

      {error && <div className="card">{error}</div>}
      <CampaignForm groups={groups.map((g: { id: string; name: string }) => ({ id: g.id, name: g.name }))} />

      <div className="panel">
        <div className="panel-header"><h2>{campaigns.length} campanhas</h2></div>
        <table className="table">
          <thead>
            <tr>
              <th>Nome</th>
              <th>Canal</th>
              <th>Grupo</th>
              <th>Início</th>
              <th>Fim</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {campaigns.map((c) => (
              <tr key={c.id}>
                <td>{c.name}</td>
                <td>{c.channel ? `${c.channel.name}` : '—'}</td>
                <td>{c.group?.name ?? '—'}</td>
                <td>{formatDateTime(c.startsAt)}</td>
                <td>{formatDateTime(c.endsAt)}</td>
                <td><span className={`badge ${c.isActive ? 'ok' : 'muted'}`}>{c.isActive ? 'ativa' : 'inativa'}</span></td>
              </tr>
            ))}
            {campaigns.length === 0 && !error && (
              <tr><td colSpan={6}>Nenhuma campanha.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
