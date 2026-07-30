'use client';

import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';

const API_BASE = '/backend';

export function LoginFormClient() {
  const router = useRouter();
  const [email, setEmail] = useState('admin@shoppe.local');
  const [password, setPassword] = useState('admin123');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const msg =
          res.status === 404
            ? 'API sem /api/auth/login — faça redeploy da API (Fase 2).'
            : ((data as { message?: string }).message ?? 'Falha no login');
        throw new Error(msg);
      }
      localStorage.setItem('shoppe_token', data.token);
      localStorage.setItem('shoppe_user', JSON.stringify(data.user));
      router.push('/');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className="card" onSubmit={onSubmit} style={{ maxWidth: 420, margin: '40px auto' }}>
      <h1 style={{ marginTop: 0 }}>Entrar</h1>
      <p className="hint">Admin seed: admin@shoppe.local / admin123</p>
      <div className="filters" style={{ flexDirection: 'column' }}>
        <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="E-mail" />
        <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Senha" />
        <button className="btn" type="submit" disabled={loading}>{loading ? 'Entrando…' : 'Entrar'}</button>
      </div>
      {error && <p className="hint" style={{ color: 'var(--danger)' }}>{error}</p>}
    </form>
  );
}
