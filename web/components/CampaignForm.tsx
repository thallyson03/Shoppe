'use client';

import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { createCampaign } from '@/lib/api';

export function CampaignForm({
  groups,
}: {
  groups: Array<{ id: string; name: string }>;
}) {
  const router = useRouter();
  const [name, setName] = useState('');
  const [startsAt, setStartsAt] = useState('');
  const [endsAt, setEndsAt] = useState('');
  const [goal, setGoal] = useState('');
  const [groupId, setGroupId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await createCampaign({
        name: name.trim(),
        startsAt: new Date(startsAt).toISOString(),
        endsAt: new Date(endsAt).toISOString(),
        commissionGoal: goal ? Number(goal) : undefined,
        groupId: groupId || undefined,
      });
      setName('');
      setStartsAt('');
      setEndsAt('');
      setGoal('');
      setGroupId('');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className="card" onSubmit={onSubmit} style={{ marginBottom: 16 }}>
      <h3 style={{ marginTop: 0 }}>Nova campanha</h3>
      <div className="filters" style={{ flexDirection: 'column' }}>
        <input required value={name} onChange={(e) => setName(e.target.value)} placeholder="Nome (ex: Black Friday)" />
        <input required type="datetime-local" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} />
        <input required type="datetime-local" value={endsAt} onChange={(e) => setEndsAt(e.target.value)} />
        <input type="number" step="0.01" value={goal} onChange={(e) => setGoal(e.target.value)} placeholder="Meta de comissão (R$)" />
        <select value={groupId} onChange={(e) => setGroupId(e.target.value)} style={{ padding: 10, borderRadius: 10, background: 'var(--bg-elevated)', color: 'var(--text)', border: '1px solid var(--border)' }}>
          <option value="">Grupo (opcional)</option>
          {groups.map((g) => (
            <option key={g.id} value={g.id}>{g.name}</option>
          ))}
        </select>
        <button className="btn" type="submit" disabled={loading}>{loading ? 'Salvando…' : 'Criar campanha'}</button>
      </div>
      {error && <p className="hint" style={{ color: 'var(--danger)' }}>{error}</p>}
    </form>
  );
}
