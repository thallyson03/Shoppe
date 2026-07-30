import { fetchTemplates } from '@/lib/api';
import { TemplateForm } from '@/components/TemplateForm';

export const dynamic = 'force-dynamic';

export default async function TemplatesPage() {
  const templates = (await fetchTemplates()) as Array<{
    id: string;
    name: string;
    channel: string;
    body: string;
    isDefault: boolean;
    isActive: boolean;
    updatedAt: string;
  }>;

  return (
    <div>
      <header className="page-header">
        <div>
          <h1>Templates</h1>
          <p className="hint">Biblioteca de posts por canal. O default do WhatsApp alimenta o envio automático.</p>
        </div>
      </header>

      <TemplateForm />

      <div className="card">
        <h3 style={{ marginTop: 0 }}>Biblioteca ({templates.length})</h3>
        {templates.length === 0 ? (
          <p className="hint">Nenhum template ainda — o seed cria o padrão no deploy.</p>
        ) : (
          <div style={{ display: 'grid', gap: 12 }}>
            {templates.map((t) => (
              <div
                key={t.id}
                style={{
                  borderTop: '1px solid var(--border)',
                  paddingTop: 12,
                }}
              >
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'baseline' }}>
                  <strong>{t.name}</strong>
                  <span className="hint">{t.channel}</span>
                  {t.isDefault && <span className="badge">default</span>}
                </div>
                <pre
                  style={{
                    whiteSpace: 'pre-wrap',
                    fontSize: 13,
                    margin: '8px 0 0',
                    opacity: 0.9,
                  }}
                >
                  {t.body}
                </pre>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
