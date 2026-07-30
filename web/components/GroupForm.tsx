'use client';

import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { createGroup } from '@/lib/api';

export function GroupForm() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [groupJid, setGroupJid] = useState('');
  const [categories, setCategories] = useState('geral');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setOk(null);
    try {
      await createGroup({
        name: name.trim(),
        groupJid: groupJid.trim(),
        categories: categories
          .split(',')
          .map((c) => c.trim())
          .filter(Boolean),
      });
      setName('');
      setGroupJid('');
      setCategories('geral');
      setOk('Grupo cadastrado');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className="card" onSubmit={onSubmit} style={{ marginBottom: 16 }}>
      <h3 style={{ marginTop: 0, marginBottom: 12, color: 'var(--text)' }}>
        Cadastrar grupo
      </h3>
      <div className="filters" style={{ flexDirection: 'column' }}>
        <input
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nome (ex: Promoções Tech)"
        />
        <input
          required
          value={groupJid}
          onChange={(e) => setGroupJid(e.target.value)}
          placeholder="JID (ex: 1203630...@g.us)"
        />
        <input
          value={categories}
          onChange={(e) => setCategories(e.target.value)}
          placeholder="Categorias (separadas por vírgula)"
        />
        <button className="btn" type="submit" disabled={loading}>
          {loading ? 'Salvando…' : 'Salvar grupo'}
        </button>
      </div>
      {error && <p className="hint" style={{ color: 'var(--danger)' }}>{error}</p>}
      {ok && <p className="hint" style={{ color: 'var(--ok)' }}>{ok}</p>}
    </form>
  );
}
