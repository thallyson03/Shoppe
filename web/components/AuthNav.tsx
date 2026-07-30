'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';

const TOKEN_COOKIE = 'shoppe_token';

export function clearSession() {
  localStorage.removeItem('shoppe_token');
  localStorage.removeItem('shoppe_user');
  document.cookie = `${TOKEN_COOKIE}=; path=/; max-age=0; SameSite=Lax`;
}

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
    clearSession();
    setLabel(null);
    router.push('/login');
    router.refresh();
  }

  if (!label) return null;

  return (
    <div style={{ marginTop: 16, fontSize: 12, opacity: 0.85 }}>
      <div style={{ marginBottom: 6 }}>{label}</div>
      <button type="button" className="btn" style={{ fontSize: 12, padding: '6px 10px' }} onClick={logout}>
        Sair
      </button>
    </div>
  );
}
