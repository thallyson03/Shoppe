'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { deleteGroup } from '@/lib/api';

export function GroupDeleteButton({ id, name }: { id: string; name: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function onDelete() {
    if (!confirm(`Excluir o grupo "${name}"?`)) return;
    setLoading(true);
    try {
      await deleteGroup(id);
      router.refresh();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Erro ao excluir');
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      className="btn danger"
      type="button"
      onClick={onDelete}
      disabled={loading}
      style={{ padding: '6px 10px', fontSize: '0.85rem' }}
    >
      {loading ? '…' : 'Excluir'}
    </button>
  );
}
