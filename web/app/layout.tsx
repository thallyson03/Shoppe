import type { ReactNode } from 'react';
import Link from 'next/link';
import './globals.css';

export const metadata = {
  title: 'Shoppe · Dashboard',
  description: 'Plataforma de afiliados Shopee — Fase 2',
};

const links = [
  { href: '/', label: 'Dashboard' },
  { href: '/products', label: 'Produtos' },
  { href: '/groups', label: 'WhatsApp' },
  { href: '/campaigns', label: 'Campanhas' },
  { href: '/automations', label: 'Automações' },
  { href: '/calendar', label: 'Calendário' },
];

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>
        <div className="shell">
          <aside className="sidebar">
            <div className="brand">
              <strong>Shoppe</strong>
              <span>Fase 2 · Afiliados</span>
            </div>
            <nav className="nav">
              {links.map((l) => (
                <Link key={l.href} href={l.href}>
                  {l.label}
                </Link>
              ))}
            </nav>
          </aside>
          <main className="main">{children}</main>
        </div>
      </body>
    </html>
  );
}
