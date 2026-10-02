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
import type { CurrentUser, Token } from '@/lib/types';

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
    token: Token | null;
    setToken: (t: Token | null) => void;
    logout: () => void;
}

const AuthContext = createContext<AuthContextValue>({
    user: null,
    setUser: () => { },
    token: null,
    setToken: () => { },
    logout: () => { },
});

export const useAuth = () => useContext(AuthContext);

// ─── PageTitleLayout ───────────────────────────────────────────────────

interface LayoutContextValue {
    pageTitle: string;
    setPageTitle: (title: string) => void;
}

const LayoutContext = createContext<LayoutContextValue>({
    pageTitle: '',
    setPageTitle: () => { },
});

export const useLayout = () => useContext(LayoutContext);
// ─── Providers ────────────────────────────────────────────────

export function Providers({ children }: { children: ReactNode }) {
    const [theme, setTheme] = useState<'light' | 'dark'>('light');
    const [lang, setLangState] = useState<Lang>('th');
    const [user, setUser] = useState<CurrentUser | null>(null);
    const [token, setToken] = useState<Token | null>(null);
    const [mounted, setMounted] = useState(false);
    const router = useRouter();
    const pathname = usePathname();
    const [pageTitle, setPageTitle] = useState<string>('');

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
        if (!user && !token && pathname !== '/login') {
            router.replace('/login');
        } else if (user && token && pathname === '/login') {
            router.replace('/dashboard');
        }
    }, [user, token, pathname, mounted, router]);

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
        localStorage.removeItem('wms-token');
        router.replace('/login');
    }, [router]);

    const handleSetUser = useCallback((u: CurrentUser | null) => {
        setUser(u);
        if (u) localStorage.setItem('wms-user', JSON.stringify(u));
        else localStorage.removeItem('wms-user');
    }, []);

    const handleSetToken = useCallback((t: Token | null) => {
        setToken(t);
        if (t) localStorage.setItem('wms-token', JSON.stringify(t));
        else localStorage.removeItem('wms-token');
    }, []);

    // Prevent SSR flash and hide content until route protection resolves
    if (!mounted) return null;
    if (!user && pathname !== '/login') return null; // wait for redirect

    return (
        <ThemeContext.Provider value={{ theme, toggleTheme }}>
            <I18nContext.Provider value={{ lang, t: translations[lang], setLang }}>
                <AuthContext.Provider value={{ user, setUser: handleSetUser, token, setToken: handleSetToken, logout }}>
                    <LayoutContext.Provider value={{ pageTitle, setPageTitle }}>
                        {children}
                    </LayoutContext.Provider>
                </AuthContext.Provider>
            </I18nContext.Provider>
        </ThemeContext.Provider>
    );
}

