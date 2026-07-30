'use client';

import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { createScheduledPost } from '@/lib/api';

export function ScheduleForm({
  products,
  groups,
}: {
  products: Array<{ id: string; name: string }>;
  groups: Array<{ id: string; name: string }>;
}) {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [scheduledAt, setScheduledAt] = useState('');
  const [productId, setProductId] = useState('');
  const [groupId, setGroupId] = useState('');
  const [messageText, setMessageText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await createScheduledPost({
        title: title.trim(),
        scheduledAt: new Date(scheduledAt).toISOString(),
        productId: productId || undefined,
        groupId: groupId || undefined,
        messageText: messageText || undefined,
      });
      setTitle('');
      setScheduledAt('');
      setMessageText('');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className="card" onSubmit={onSubmit} style={{ marginBottom: 16 }}>
      <h3 style={{ marginTop: 0 }}>Agendar post</h3>
      <div className="filters" style={{ flexDirection: 'column' }}>
        <input required value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Título (ex: Notebook 08:00)" />
        <input required type="datetime-local" value={scheduledAt} onChange={(e) => setScheduledAt(e.target.value)} />
        <select value={productId} onChange={(e) => setProductId(e.target.value)} style={{ padding: 10, borderRadius: 10, background: 'var(--bg-elevated)', color: 'var(--text)', border: '1px solid var(--border)' }}>
          <option value="">Produto (opcional)</option>
          {products.map((p) => (
            <option key={p.id} value={p.id}>{p.name.slice(0, 80)}</option>
          ))}
        </select>
        <select value={groupId} onChange={(e) => setGroupId(e.target.value)} style={{ padding: 10, borderRadius: 10, background: 'var(--bg-elevated)', color: 'var(--text)', border: '1px solid var(--border)' }}>
          <option value="">Grupo (opcional = padrão)</option>
          {groups.map((g) => (
            <option key={g.id} value={g.id}>{g.name}</option>
          ))}
        </select>
        <textarea
          value={messageText}
          onChange={(e) => setMessageText(e.target.value)}
          placeholder="Mensagem (opcional)"
          rows={3}
          style={{ padding: 10, borderRadius: 10, background: 'var(--bg-elevated)', color: 'var(--text)', border: '1px solid var(--border)' }}
        />
        <button className="btn" type="submit" disabled={loading}>{loading ? 'Salvando…' : 'Agendar'}</button>
      </div>
      {error && <p className="hint" style={{ color: 'var(--danger)' }}>{error}</p>}
    </form>
  );
}
