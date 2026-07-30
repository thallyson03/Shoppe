'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';

export function AuthNav() {
  const router = useRouter();
  const pathname = usePathname();
  const [label, setLabel] = useState<string | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem('shoppe_user');
      if (!raw) {
        setLabel(null);
        return;
      }
      const user = JSON.parse(raw) as { email?: string; name?: string };
      setLabel(user.name ?? user.email ?? 'Conta');
    } catch {
      setLabel(null);
    }
  }, [pathname]);

  function logout() {
    localStorage.removeItem('shoppe_token');
    localStorage.removeItem('shoppe_user');
    setLabel(null);
    router.push('/login');
  }

  if (!label) {
    return (
      <Link href="/login" style={{ marginTop: 12, fontSize: 13, opacity: 0.85 }}>
        Entrar
      </Link>
    );
  }

  return (
    <div style={{ marginTop: 16, fontSize: 12, opacity: 0.85 }}>
      <div style={{ marginBottom: 6 }}>{label}</div>
      <button type="button" className="btn" style={{ fontSize: 12, padding: '6px 10px' }} onClick={logout}>
        Sair
      </button>
    </div>
  );
}
