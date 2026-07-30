'use client';

import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { createTemplate } from '@/lib/api';

export function TemplateForm() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [channel, setChannel] = useState('whatsapp');
  const [body, setBody] = useState(
    `🔥 *Oferta*\n\n📦 *{{name}}*\n💰 {{price}} | {{discount}}\n👉 {{link}}`,
  );
  const [isDefault, setIsDefault] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await createTemplate({
        name: name.trim(),
        channel,
        body,
        isDefault,
      });
      setName('');
      setIsDefault(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className="card" onSubmit={onSubmit} style={{ marginBottom: 16 }}>
      <h3 style={{ marginTop: 0 }}>Novo template</h3>
      <p className="hint">
        Placeholders: {'{{name}}'} {'{{price}}'} {'{{discount}}'} {'{{rating}}'} {'{{sales}}'}{' '}
        {'{{shop}}'} {'{{link}}'}
      </p>
      <div className="filters" style={{ flexDirection: 'column' }}>
        <input
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nome do template"
        />
        <select
          value={channel}
          onChange={(e) => setChannel(e.target.value)}
          style={{
            padding: 10,
            borderRadius: 10,
            background: 'var(--bg-elevated)',
            color: 'var(--text)',
            border: '1px solid var(--border)',
          }}
        >
          <option value="whatsapp">WhatsApp</option>
          <option value="telegram">Telegram</option>
          <option value="instagram">Instagram</option>
          <option value="facebook">Facebook</option>
          <option value="twitter">Twitter/X</option>
        </select>
        <textarea
          required
          rows={8}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          style={{
            width: '100%',
            padding: 10,
            borderRadius: 10,
            background: 'var(--bg-elevated)',
            color: 'var(--text)',
            border: '1px solid var(--border)',
            fontFamily: 'inherit',
          }}
        />
        <label style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 14 }}>
          <input
            type="checkbox"
            checked={isDefault}
            onChange={(e) => setIsDefault(e.target.checked)}
          />
          Usar como padrão deste canal
        </label>
        <button className="btn" type="submit" disabled={loading}>
          {loading ? 'Salvando…' : 'Criar template'}
        </button>
      </div>
      {error && (
        <p className="hint" style={{ color: 'var(--danger)' }}>
          {error}
        </p>
      )}
    </form>
  );
}
