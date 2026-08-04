'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';
import { AuthNav } from '@/components/AuthNav';

const links = [
  { href: '/', label: 'Dashboard' },
  { href: '/analytics', label: 'Analytics' },
  { href: '/products', label: 'Produtos' },
  { href: '/promos', label: 'Promoções' },
  { href: '/groups', label: 'WhatsApp' },
  { href: '/campaigns', label: 'Campanhas' },
  { href: '/automations', label: 'Automações' },
  { href: '/calendar', label: 'Calendário' },
  { href: '/templates', label: 'Templates' },
];

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const isLogin = pathname === '/login' || pathname.startsWith('/login/');

  if (isLogin) {
    return <div className="main" style={{ minHeight: '100vh' }}>{children}</div>;
  }

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand">
          <strong>Shoppe</strong>
          <span>Fase 3 · Afiliados</span>
        </div>
        <nav className="nav">
          {links.map((l) => (
            <Link key={l.href} href={l.href}>
              {l.label}
            </Link>
          ))}
        </nav>
        <AuthNav />
      </aside>
      <main className="main">{children}</main>
    </div>
  );
}
