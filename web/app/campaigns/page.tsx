import { fetchCampaigns } from '@/lib/api';

export const dynamic = 'force-dynamic';

export default async function CampaignsPage() {
  let campaigns: Array<{
    id: string;
    name: string;
    startsAt: string;
    endsAt: string;
    isActive: boolean;
    commissionGoal: unknown;
    group?: { name: string } | null;
    channel?: { name: string; type: string } | null;
  }> = [];
  let error: string | null = null;

  try {
    campaigns = await fetchCampaigns();
  } catch (e) {
    error = e instanceof Error ? e.message : 'Erro';
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Campanhas</h1>
          <p>Cadastro básico (esqueleto Fase 1)</p>
        </div>
      </div>

      {error && <div className="card">{error}</div>}

      <div className="panel">
        <div className="panel-header">
          <h2>{campaigns.length} campanhas</h2>
        </div>
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
                <td>{c.channel ? `${c.channel.name} (${c.channel.type})` : '—'}</td>
                <td>{c.group?.name ?? '—'}</td>
                <td>{new Date(c.startsAt).toLocaleDateString('pt-BR')}</td>
                <td>{new Date(c.endsAt).toLocaleDateString('pt-BR')}</td>
                <td>
                  <span className={`badge ${c.isActive ? 'ok' : 'muted'}`}>
                    {c.isActive ? 'ativa' : 'inativa'}
                  </span>
                </td>
              </tr>
            ))}
            {campaigns.length === 0 && !error && (
              <tr>
                <td colSpan={6}>
                  Nenhuma campanha. Crie via <code>POST /api/campaigns</code>.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
