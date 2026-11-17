'use client';
import { useState, type ReactNode } from 'react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';

export function AppLayout({ children }: { children: ReactNode }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="flex h-dvh overflow-hidden">
      <Sidebar
        mobileOpen={mobileMenuOpen}
        onMobileClose={() => setMobileMenuOpen(false)}
      />
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <Header
          mobileMenuOpen={mobileMenuOpen}
          onMenuToggle={() => setMobileMenuOpen((prev) => !prev)}
        />
        <main
          className="flex-1 overflow-auto p-3 sm:p-4 lg:p-6 pb-[calc(1rem+env(safe-area-inset-bottom))] lg:pb-[calc(1.5rem+env(safe-area-inset-bottom))]"
          style={{ background: 'var(--bg)' }}
        >
          {children}
        </main>
      </div>
    </div>
  );
}

