'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useI18n } from '@/app/providers';
import Swal from 'sweetalert2';

interface NavItem {
  href?: string;
  labelKey: string;
  icon: string;
  children?: NavItem[];
}

const NAV: NavItem[] = [
  { href: '/dashboard', labelKey: 'dashboard', icon: '⊞' },
  {
    labelKey: 'master', icon: '☰',
    children: [
      { href: '/master/items', labelKey: 'items', icon: '📦' },
      { href: '/master/brands', labelKey: 'brands', icon: '🏷️' },
      { href: '/master/warehouses', labelKey: 'warehouses', icon: '🏭' },
      { href: '/master/locations', labelKey: 'locations', icon: '📍' },
      { href: '/master/vendors', labelKey: 'vendors', icon: '🚚' },
      { href: '/master/customers', labelKey: 'customers', icon: '👤' },
    ],
  },
  {
    labelKey: 'transactions', icon: '📄',
    children: [
      { href: '/transactions/receive', labelKey: 'receive', icon: '📥' },
      { href: '/transactions/issue', labelKey: 'issue', icon: '📤' },
      { href: '/transactions/request', labelKey: 'request', icon: '📋' },
      { href: '/transactions/transfer', labelKey: 'transfer', icon: '🔀' },
      { href: '/transactions/disposal', labelKey: 'disposal', icon: '🗑️' },
    ],
  },
  { href: '/inventory', labelKey: 'inventory', icon: '🗃️' },
];

function getLabel(key: string, t: ReturnType<typeof useI18n>['t']) {
  return (t.nav as Record<string, string>)[key] ?? key;
  Swal.fire({
    icon: 'error',
    title: 'Oops...',
    text: `Missing translation for key: ${key}`,
  });
}

export function Sidebar() {
  const { t } = useI18n();
  const pathname = usePathname();
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({
    master: true,
    transactions: false,
  });
  const [collapsed, setCollapsed] = useState(false);

  const toggle = (key: string) =>
    setOpenGroups(prev => ({ ...prev, [key]: !prev[key] }));

  return (
    <aside
      className="flex flex-col transition-all duration-300 h-full shrink-0"
      style={{
        width: collapsed ? 64 : 240,
        background: 'var(--bg-sidebar)',
        borderRight: '1px solid rgba(255,255,255,0.05)',
      }}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 py-5 shrink-0">
        <span className="text-2xl">📦</span>
        {!collapsed && (
          <span className="text-white font-bold text-sm leading-tight">
            WMS<br />
            <span className="text-blue-400 font-normal text-xs">Warehouse Mgmt</span>
          </span>
        )}
        <button
          onClick={() => setCollapsed(c => !c)}
          className="ml-auto text-slate-400 hover:text-white transition-colors text-lg"
          aria-label="Toggle sidebar"
        >
          {collapsed ? '›' : '‹'}
        </button>
      </div>

      {/* Nav items */}
      <nav className="flex-1 overflow-y-auto py-2">
        {NAV.map(item => {
          if (item.children) {
            const isOpen = openGroups[item.labelKey] ?? false;
            const anyActive = item.children.some(c => c.href && pathname.startsWith(c.href));
            return (
              <div key={item.labelKey}>
                <button
                  onClick={() => toggle(item.labelKey)}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors
                    ${anyActive ? 'text-blue-400' : 'text-slate-400 hover:text-white'}`}
                  style={{ background: anyActive ? 'rgba(59,130,246,0.1)' : undefined }}
                >
                  <span className="text-base shrink-0">{item.icon}</span>
                  {!collapsed && (
                    <>
                      <span className="flex-1 text-left font-medium">
                        {getLabel(item.labelKey, t)}
                      </span>
                      <span className="text-xs">{isOpen ? '▾' : '▸'}</span>
                    </>
                  )}
                </button>
                {!collapsed && isOpen && (
                  <div className="pl-4">
                    {item.children.map(child => {
                      const active = child.href ? pathname === child.href : false;
                      return (
                        <Link
                          key={child.href}
                          href={child.href!}
                          className={`flex items-center gap-3 px-4 py-2 text-sm rounded-lg mx-2 mb-0.5 transition-colors
                            ${active
                              ? 'bg-blue-600 text-white'
                              : 'text-slate-400 hover:text-white hover:bg-white/5'
                            }`}
                        >
                          <span className="text-sm">{child.icon}</span>
                          <span>{getLabel(child.labelKey, t)}</span>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          }

          const active = item.href ? pathname === item.href : false;
          return (
            <Link
              key={item.href}
              href={item.href!}
              className={`flex items-center gap-3 px-4 py-2.5 mx-2 mb-0.5 rounded-lg text-sm transition-colors
                ${active
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}
            >
              <span className="text-base shrink-0">{item.icon}</span>
              {!collapsed && (
                <span className="font-medium">{getLabel(item.labelKey, t)}</span>
              )}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}

