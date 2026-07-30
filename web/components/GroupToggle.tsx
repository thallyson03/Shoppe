'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { updateGroup } from '@/lib/api';

export function GroupToggle({ id, isActive }: { id: string; isActive: boolean }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function toggle() {
    setLoading(true);
    try {
      await updateGroup(id, { isActive: !isActive });
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      className={`badge ${isActive ? 'ok' : 'muted'}`}
      onClick={toggle}
      disabled={loading}
      style={{ cursor: 'pointer', border: 0 }}
      type="button"
    >
      {loading ? '…' : isActive ? 'ativo' : 'inativo'}
    </button>
  );
}
