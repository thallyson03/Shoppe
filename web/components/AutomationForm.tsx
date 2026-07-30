'use client';

import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { createAutomation, updateAutomation } from '@/lib/api';

const FIELDS = [
  { value: 'discount', label: 'Desconto (%)' },
  { value: 'rating', label: 'Avaliação' },
  { value: 'commission', label: 'Comissão (%)' },
  { value: 'sales', label: 'Vendas' },
  { value: 'price', label: 'Preço (R$)' },
];

const OPS = [
  { value: 'gt', label: '>' },
  { value: 'gte', label: '≥' },
  { value: 'lt', label: '<' },
  { value: 'lte', label: '≤' },
  { value: 'eq', label: '=' },
];

export function AutomationForm() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [field, setField] = useState('discount');
  const [op, setOp] = useState('gt');
  const [value, setValue] = useState('50');
  const [field2, setField2] = useState('rating');
  const [op2, setOp2] = useState('gt');
  const [value2, setValue2] = useState('4.8');
  const [useSecond, setUseSecond] = useState(true);
  const [logic, setLogic] = useState('and');
  const [action, setAction] = useState('send_whatsapp');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const conditions = [
        { field, op, value: Number(value) },
      ];
      if (useSecond) {
        conditions.push({ field: field2, op: op2, value: Number(value2) });
      }
      await createAutomation({
        name: name.trim(),
        logic,
        conditions,
        action,
        priority: 10,
      });
      setName('');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className="card" onSubmit={onSubmit} style={{ marginBottom: 16 }}>
      <h3 style={{ marginTop: 0 }}>Nova regra (SE / ENTÃO)</h3>
      <div className="filters" style={{ flexDirection: 'column' }}>
        <input required value={name} onChange={(e) => setName(e.target.value)} placeholder="Nome da regra" />
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <span style={{ alignSelf: 'center' }}>SE</span>
          <select value={field} onChange={(e) => setField(e.target.value)}>{FIELDS.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}</select>
          <select value={op} onChange={(e) => setOp(e.target.value)}>{OPS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</select>
          <input type="number" step="any" value={value} onChange={(e) => setValue(e.target.value)} style={{ width: 100 }} />
        </div>
        <label style={{ display: 'flex', gap: 8, alignItems: 'center', color: 'var(--muted)' }}>
          <input type="checkbox" checked={useSecond} onChange={(e) => setUseSecond(e.target.checked)} />
          Segunda condição
        </label>
        {useSecond && (
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <select value={logic} onChange={(e) => setLogic(e.target.value)}>
              <option value="and">E</option>
              <option value="or">OU</option>
            </select>
            <select value={field2} onChange={(e) => setField2(e.target.value)}>{FIELDS.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}</select>
            <select value={op2} onChange={(e) => setOp2(e.target.value)}>{OPS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</select>
            <input type="number" step="any" value={value2} onChange={(e) => setValue2(e.target.value)} style={{ width: 100 }} />
          </div>
        )}
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <span>ENTÃO</span>
          <select value={action} onChange={(e) => setAction(e.target.value)}>
            <option value="send_whatsapp">Enviar no WhatsApp</option>
            <option value="boost">Priorizar na fila</option>
            <option value="skip">Ignorar produto</option>
          </select>
        </div>
        <button className="btn" type="submit" disabled={loading}>{loading ? 'Salvando…' : 'Criar automação'}</button>
      </div>
      {error && <p className="hint" style={{ color: 'var(--danger)' }}>{error}</p>}
    </form>
  );
}

export function AutomationToggle({ id, isActive }: { id: string; isActive: boolean }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function toggle() {
    setLoading(true);
    try {
      await updateAutomation(id, { isActive: !isActive });
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <button type="button" className={`badge ${isActive ? 'ok' : 'muted'}`} onClick={toggle} disabled={loading} style={{ border: 0, cursor: 'pointer' }}>
      {loading ? '…' : isActive ? 'ativa' : 'inativa'}
    </button>
  );
}
