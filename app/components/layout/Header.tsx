'use client';

import { usePathname } from 'next/navigation';
import { useI18n, useTheme, useAuth } from '@/app/providers';
import { type Lang } from '@/lib/i18n/translations';

export function Header() {
  const { t, lang, setLang } = useI18n();
  const { theme, toggleTheme } = useTheme();
  const { user, logout } = useAuth();
  const pathname = usePathname();

  const breadcrumb = pathname
    .split('/')
    .filter(Boolean)
    .map(seg => seg.charAt(0).toUpperCase() + seg.slice(1))
    .join(' / ');

  return (
    <header
      className="flex items-center justify-between px-6 py-3 shrink-0 z-10"
      style={{
        background: 'var(--bg-card)',
        borderBottom: '1px solid var(--border)',
        boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
      }}
    >
      {/* Breadcrumb */}
      <div>
        <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
          {t.auth.systemName}
        </p>
        <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
          {breadcrumb || t.nav.dashboard}
        </p>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-3">
        {/* Lang toggle */}
        <div className="flex rounded-lg overflow-hidden border" style={{ borderColor: 'var(--border)' }}>
          {(['th', 'en'] as Lang[]).map(l => (
            <button
              key={l}
              onClick={() => setLang(l)}
              className="px-3 py-1 text-xs font-medium transition-colors"
              style={{
                background: lang === l ? 'var(--accent)' : 'var(--bg-card)',
                color: lang === l ? '#fff' : 'var(--text-secondary)',
              }}
            >
              {l.toUpperCase()}
            </button>
          ))}
        </div>

        {/* Theme toggle */}
        <button
          onClick={toggleTheme}
          className="w-8 h-8 flex items-center justify-center rounded-lg transition-colors text-base"
          style={{ background: 'var(--bg)', color: 'var(--text-primary)' }}
          title={theme === 'dark' ? 'Light mode' : 'Dark mode'}
        >
          {theme === 'dark' ? '☀️' : '🌙'}
        </button>

        {/* User menu */}
        {user && (
          <div className="flex items-center gap-2">
            <div className="text-right">
              <p className="text-xs font-medium" style={{ color: 'var(--text-primary)' }}>
                {user.fName} {user.lName}
              </p>
              <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                {user.role}
              </p>
            </div>
            <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white text-sm font-bold">
              {user.fName.charAt(0)}
            </div>
            <button
              onClick={logout}
              className="text-xs px-3 py-1.5 rounded-lg transition-colors"
              style={{ background: 'var(--bg)', color: 'var(--text-secondary)' }}
            >
              {t.auth.logout}
            </button>
          </div>
        )}
      </div>
    </header>
  );
}

