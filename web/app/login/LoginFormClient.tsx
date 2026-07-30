'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useState, type FormEvent } from 'react';

/** Prefere URL pública da API (build); fallback same-origin /backend */
const API_BASE =
  (process.env.NEXT_PUBLIC_API_URL ?? '').replace(/\/$/, '') || '/backend';

const TOKEN_MAX_AGE = 60 * 60 * 24 * 7;

function LoginFormInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
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
      document.cookie = `shoppe_token=${encodeURIComponent(data.token)}; path=/; max-age=${TOKEN_MAX_AGE}; SameSite=Lax`;

      const next = searchParams.get('next') || '/';
      router.push(next.startsWith('/') ? next : '/');
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
      <p className="hint">Acesso restrito. Admin seed: admin@shoppe.local / admin123</p>
      <div className="filters" style={{ flexDirection: 'column' }}>
        <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="E-mail" />
        <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Senha" />
        <button className="btn" type="submit" disabled={loading}>{loading ? 'Entrando…' : 'Entrar'}</button>
      </div>
      {error && <p className="hint" style={{ color: 'var(--danger)' }}>{error}</p>}
    </form>
  );
}

export function LoginFormClient() {
  return (
    <Suspense fallback={<p className="hint" style={{ textAlign: 'center', marginTop: 40 }}>Carregando…</p>}>
      <LoginFormInner />
    </Suspense>
  );
}
