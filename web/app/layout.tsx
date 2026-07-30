import type { ReactNode } from 'react';
import { AppShell } from '@/components/AppShell';
import './globals.css';

export const metadata = {
  title: 'Shoppe · Dashboard',
  description: 'Plataforma de afiliados Shopee — Fase 2',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
