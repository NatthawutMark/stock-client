'use client';

import { useI18n, useTheme, useAuth } from '@/app/providers';
import { type Lang } from '@/lib/i18n/translations';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui';
import { LogOut, Menu } from 'lucide-react';

interface HeaderProps {
    mobileMenuOpen?: boolean;
    onMenuToggle?: () => void;
}

export function Header({ mobileMenuOpen = false, onMenuToggle }: HeaderProps) {
    const { t, lang, setLang } = useI18n();
    const { theme, toggleTheme } = useTheme();
    const { user, logout } = useAuth();

    return (
        <header
            className="flex items-center justify-between gap-2 sm:gap-4 px-3 sm:px-4 lg:px-6 pb-2.5 sm:pb-3 pt-[max(0.625rem,env(safe-area-inset-top))] shrink-0 z-10"
            style={{
                background: 'var(--bg-card)',
                borderBottom: '1px solid var(--border)',
                boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
            }}
        >
            {/* ปุ่มเปิดเมนูมือถือ + ชื่อระบบ */}
            <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                {onMenuToggle && (
                    <button
                        type="button"
                        onClick={onMenuToggle}
                        aria-label={lang === 'th' ? 'เปิดเมนูนำทาง' : 'Open navigation menu'}
                        aria-expanded={mobileMenuOpen}
                        aria-controls="mobile-sidebar-drawer"
                        className="lg:hidden inline-flex items-center justify-center w-10 h-10 rounded-xl border transition-colors shrink-0 cursor-pointer hover:opacity-80"
                        style={{
                            background: 'var(--bg)',
                            borderColor: 'var(--border)',
                            color: 'var(--text-primary)',
                        }}
                    >
                        <Menu className="w-5 h-5" />
                    </button>
                )}

                <p className="text-xs sm:text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>
                    {t.auth.systemName}
                </p>
            </div>

            {/* ปุ่มควบคุมด้านขวา */}
            <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
                {/* สลับภาษา */}
                <div className="flex rounded-lg overflow-hidden border shrink-0" style={{ borderColor: 'var(--border)' }}>
                    {(['th', 'en'] as Lang[]).map((l) => (
                        <Button
                            key={l}
                            type="button"
                            size="xs"
                            data-compact="true"
                            onClick={() => setLang(l)}
                            className="h-8 sm:h-7 px-2.5 sm:px-3 rounded-none text-xs font-medium transition-colors"
                            style={{
                                background: lang === l ? 'var(--accent)' : 'var(--bg-card)',
                                color: lang === l ? 'var(--foreground)' : 'var(--text-secondary)',
                            }}
                        >
                            {l.toUpperCase()}
                        </Button>
                    ))}
                </div>

                {/* สลับธีม มืด/สว่าง */}
                <button
                    type="button"
                    onClick={toggleTheme}
                    className="w-9 h-9 sm:w-8 sm:h-8 flex items-center justify-center rounded-lg transition-colors text-base shrink-0 cursor-pointer"
                    style={{ background: 'var(--bg)', color: 'var(--text-primary)' }}
                    title={theme === 'dark' ? 'Light mode' : 'Dark mode'}
                    aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
                >
                    {theme === 'dark' ? '☀️' : '🌙'}
                </button>

                {/* ข้อมูลผู้ใช้งาน */}
                {user && (
                    <div className="flex items-center gap-2 shrink-0">
                        <div className="hidden md:block text-right">
                            <Label className="text-xs font-medium" style={{ color: 'var(--text-primary)' }}>
                                {user.fName} {user.lName}
                            </Label>
                            <Label className="block text-xs text-right w-full" style={{ color: 'var(--text-secondary)' }}>
                                {user.role?.roleTh}
                            </Label>
                        </div>
                        <div className="hidden sm:flex w-8 h-8 rounded-full bg-blue-500 items-center justify-center text-white text-sm font-bold shrink-0">
                            {user.fName?.charAt(0)}
                        </div>
                        <Button
                            type="button"
                            onClick={logout}
                            variant="secRed"
                            size="sm"
                            data-compact="true"
                            aria-label={t.auth.logout}
                            className="h-9 sm:h-8 px-2.5 sm:px-3 w-auto gap-1.5 cursor-pointer"
                        >
                            <LogOut className="w-4 h-4 shrink-0" />
                            <span className="hidden sm:inline">{t.auth.logout}</span>
                        </Button>
                    </div>
                )}
            </div>
        </header>
    );
}
