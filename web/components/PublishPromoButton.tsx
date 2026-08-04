'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { publishPromo } from '@/lib/api';

export function PublishPromoButton({
  id,
  disabled,
}: {
  id: string;
  disabled?: boolean;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function onClick() {
    if (!confirm('Enviar esta promoção para os grupos ativos?')) return;
    setLoading(true);
    try {
      const r = await publishPromo(id);
      alert(`Enviado para ${r.groups} grupo(s)`);
      router.refresh();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Falha ao enviar');
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      className="btn secondary"
      type="button"
      disabled={disabled || loading}
      onClick={onClick}
      style={{ padding: '6px 10px', fontSize: '0.85rem' }}
    >
      {loading ? '…' : 'Enviar'}
    </button>
  );
}
