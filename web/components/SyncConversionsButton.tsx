'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { syncConversions } from '@/lib/api';

export function SyncConversionsButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function onClick() {
    setLoading(true);
    setMsg(null);
    try {
      const r = await syncConversions();
      setMsg(`Sync OK · ${r.upserted ?? 0} conversões`);
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
