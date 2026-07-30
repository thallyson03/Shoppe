'use client';

import { useState } from 'react';
import { triggerPipeline } from '@/lib/api';

export function RunButton() {
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function onClick() {
    setLoading(true);
    setMsg(null);
    try {
      const result = await triggerPipeline();
      setMsg(
        `OK · publicados: ${result.result?.publishedCount ?? 0} · novos: ${result.result?.newOffersCount ?? 0}`,
      );
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'Erro');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ textAlign: 'right' }}>
      <button className="btn" onClick={onClick} disabled={loading}>
        {loading ? 'Executando…' : 'Rodar pipeline'}
      </button>
      {msg && <div className="hint" style={{ marginTop: 8 }}>{msg}</div>}
    </div>
  );
}
