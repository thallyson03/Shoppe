'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { syncPromos } from '@/lib/api';

export function SyncPromosButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function onClick() {
    setLoading(true);
    setMsg(null);
    try {
      const r = await syncPromos();
      setMsg(`Sync OK · ${r.upserted} novas/atualizadas · ${r.skippedExpired} expiradas`);
      router.refresh();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'Falha no sync');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <button className="btn" type="button" disabled={loading} onClick={onClick}>
        {loading ? 'Sincronizando…' : 'Sync Shopee'}
      </button>
      {msg && <p className="hint" style={{ marginTop: 8 }}>{msg}</p>}
    </div>
  );
}
