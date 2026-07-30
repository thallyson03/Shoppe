import { fetchAutomations } from '@/lib/api';
import { AutomationForm, AutomationToggle } from '@/components/AutomationForm';

export const dynamic = 'force-dynamic';

export default async function AutomationsPage() {
  let rules: Array<{
    id: string;
    name: string;
    logic: string;
    conditions: Array<{ field: string; op: string; value: number }>;
    action: string;
    isActive: boolean;
    priority: number;
  }> = [];
  let error: string | null = null;

  try {
    rules = await fetchAutomations();
  } catch (e) {
    error = e instanceof Error ? e.message : 'Erro';
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Automações</h1>
          <p>Regras SE / ENTÃO sem programação</p>
        </div>
      </div>

      {error && <div className="card">{error}</div>}
      <AutomationForm />

      <div className="panel">
        <div className="panel-header"><h2>{rules.length} regras</h2></div>
        <table className="table">
          <thead>
            <tr>
              <th>Nome</th>
              <th>Condições</th>
              <th>Ação</th>
              <th>Prioridade</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {rules.map((r) => (
              <tr key={r.id}>
                <td>{r.name}</td>
                <td>
                  {(Array.isArray(r.conditions) ? r.conditions : [])
                    .map((c) => `${c.field} ${c.op} ${c.value}`)
                    .join(` ${r.logic} `) || '—'}
                </td>
                <td>{r.action}</td>
                <td>{r.priority}</td>
                <td><AutomationToggle id={r.id} isActive={r.isActive} /></td>
              </tr>
            ))}
            {rules.length === 0 && !error && (
              <tr><td colSpan={5}>Nenhuma regra — crie acima (ex: desconto &gt; 50 e rating &gt; 4.8).</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
