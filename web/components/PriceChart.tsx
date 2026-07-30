'use client';

import { formatBRL } from '@/lib/api';

export function PriceChart({
  points,
}: {
  points: Array<{ priceMin: number; recordedAt: string }>;
}) {
  if (!points.length) {
    return <p className="hint">Sem dados para o gráfico.</p>;
  }

  const prices = points.map((p) => p.priceMin);
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const range = Math.max(max - min, 1);
  const w = 640;
  const h = 180;
  const pad = 16;

  const coords = points.map((p, i) => {
    const x = pad + (i / Math.max(points.length - 1, 1)) * (w - pad * 2);
    const y = h - pad - ((p.priceMin - min) / range) * (h - pad * 2);
    return `${x},${y}`;
  });

  return (
    <div>
      <svg viewBox={`0 0 ${w} ${h}`} width="100%" height="180" role="img" aria-label="Gráfico de preços">
        <polyline
          fill="none"
          stroke="#ee4d2d"
          strokeWidth="3"
          points={coords.join(' ')}
        />
        {points.map((p, i) => {
          const [x, y] = coords[i]!.split(',').map(Number);
          return <circle key={i} cx={x} cy={y} r="4" fill="#ee4d2d" />;
        })}
      </svg>
      <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--muted)', fontSize: 12 }}>
        <span>{formatBRL(min)}</span>
        <span>{formatBRL(max)}</span>
      </div>
    </div>
  );
}
