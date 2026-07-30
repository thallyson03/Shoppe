import { fetchGroups } from '@/lib/api';

export const dynamic = 'force-dynamic';

export default async function GroupsPage() {
  let groups: Array<{
    id: string;
    name: string;
    groupJid: string;
    categories: string[];
    isActive: boolean;
  }> = [];
  let error: string | null = null;

  try {
    groups = await fetchGroups();
  } catch (e) {
    error = e instanceof Error ? e.message : 'Erro';
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>WhatsApp</h1>
          <p>Grupos cadastrados para envio automático</p>
        </div>
      </div>

      {error && <div className="card">{error}</div>}

      <div className="panel">
        <div className="panel-header">
          <h2>{groups.length} grupos</h2>
        </div>
        <table className="table">
          <thead>
            <tr>
              <th>Nome</th>
              <th>JID</th>
              <th>Categorias</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {groups.map((g) => (
              <tr key={g.id}>
                <td>{g.name}</td>
                <td>
                  <code>{g.groupJid}</code>
                </td>
                <td>{g.categories?.join(', ') || '—'}</td>
                <td>
                  <span className={`badge ${g.isActive ? 'ok' : 'muted'}`}>
                    {g.isActive ? 'ativo' : 'inativo'}
                  </span>
                </td>
              </tr>
            ))}
            {groups.length === 0 && !error && (
              <tr>
                <td colSpan={4}>
                  Nenhum grupo. Cadastre via <code>POST /api/groups</code> ou seed.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
