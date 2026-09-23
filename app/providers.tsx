'use client';

import {
    createContext,
    useContext,
    useState,
    useEffect,
    useCallback,
    type ReactNode,
} from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { translations, type Lang, type Translations } from '@/lib/i18n/translations';
import type { CurrentUser } from '@/lib/types';

// ─── Theme ────────────────────────────────────────────────────

interface ThemeContextValue {
    theme: 'light' | 'dark';
    toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue>({
    theme: 'light',
    toggleTheme: () => { },
});

export const useTheme = () => useContext(ThemeContext);

// ─── I18n ─────────────────────────────────────────────────────

interface I18nContextValue {
    lang: Lang;
    t: Translations;
    setLang: (l: Lang) => void;
}

const I18nContext = createContext<I18nContextValue>({
    lang: 'th',
    t: translations.th,
    setLang: () => { },
});

export const useI18n = () => useContext(I18nContext);

// ─── Auth ─────────────────────────────────────────────────────

interface AuthContextValue {
    user: CurrentUser | null;
    setUser: (u: CurrentUser | null) => void;
    logout: () => void;
}

const AuthContext = createContext<AuthContextValue>({
    user: null,
    setUser: () => { },
    logout: () => { },
});

export const useAuth = () => useContext(AuthContext);

// ─── Providers ────────────────────────────────────────────────

export function Providers({ children }: { children: ReactNode }) {
    const [theme, setTheme] = useState<'light' | 'dark'>('light');
    const [lang, setLangState] = useState<Lang>('th');
    const [user, setUser] = useState<CurrentUser | null>(null);
    const [mounted, setMounted] = useState(false);
    const router = useRouter();
    const pathname = usePathname();

    // Load from localStorage after mount
    useEffect(() => {
        const savedTheme = (localStorage.getItem('wms-theme') as 'light' | 'dark') ?? 'light';
        const savedLang = (localStorage.getItem('wms-lang') as Lang) ?? 'th';
        const savedUser = localStorage.getItem('wms-user');
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setTheme(savedTheme);
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setLangState(savedLang);
        if (savedUser) {
            try { setUser(JSON.parse(savedUser)); } catch { /* ignore */ }
        }
        setMounted(true);
    }, []);

    // Sync theme class on <html>
    useEffect(() => {
        if (!mounted) return;
        const root = document.documentElement;
        root.classList.toggle('dark', theme === 'dark');
        localStorage.setItem('wms-theme', theme);
    }, [theme, mounted]);

    // Route Protection
    useEffect(() => {
        if (!mounted) return;
        if (!user && pathname !== '/login') {
            router.replace('/login');
        } else if (user && pathname === '/login') {
            router.replace('/dashboard');
        }
    }, [user, pathname, mounted, router]);

    const toggleTheme = useCallback(() => {
        setTheme(prev => (prev === 'light' ? 'dark' : 'light'));
    }, []);

    const setLang = useCallback((l: Lang) => {
        setLangState(l);
        localStorage.setItem('wms-lang', l);
    }, []);

    const logout = useCallback(() => {
        setUser(null);
        localStorage.removeItem('wms-user');
        router.replace('/login');
    }, [router]);

    const handleSetUser = useCallback((u: CurrentUser | null) => {
        setUser(u);
        if (u) localStorage.setItem('wms-user', JSON.stringify(u));
        else localStorage.removeItem('wms-user');
    }, []);

    // Prevent SSR flash and hide content until route protection resolves
    if (!mounted) return null;
    if (!user && pathname !== '/login') return null; // wait for redirect

    return (
        <ThemeContext.Provider value={{ theme, toggleTheme }}>
            <I18nContext.Provider value={{ lang, t: translations[lang], setLang }}>
                <AuthContext.Provider value={{ user, setUser: handleSetUser, logout }}>
                    {children}
                </AuthContext.Provider>
            </I18nContext.Provider>
        </ThemeContext.Provider>
    );
}

