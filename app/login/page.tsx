'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth, useI18n, useTheme } from '../providers';
import { authService } from '@/lib/api/services/auth';

export default function LoginPage() {
    const router = useRouter();
    const { t, lang, setLang } = useI18n();
    const { theme, toggleTheme } = useTheme();
    const { setUser } = useAuth();

    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const res = await authService.login({ username, password });
            if (res.success && res.data) {
                setUser(res.data.user);
                router.push('/');
            } else {
                setError(res.message || t.auth.loginFailed);
            }
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : t.auth.loginFailed);
        } finally {
            setLoading(false);
        }
    };

    // Quick helper for mock credentials
    const fillMock = (role: 'admin' | 'staff') => {
        setUsername(role);
        setPassword(role + '1234');
    };

    return (
        <div className="min-h-screen flex items-center justify-center p-4 transition-colors" style={{ background: 'var(--bg)' }}>
            {/* Settings toggles */}
            <div className="absolute top-4 right-4 flex gap-2">
                <div className="flex rounded-lg overflow-hidden border" style={{ borderColor: 'var(--border)' }}>
                    {(['th', 'en'] as const).map(l => (
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
                <button
                    onClick={toggleTheme}
                    className="w-8 h-8 flex items-center justify-center rounded-lg border transition-colors"
                    style={{ background: 'var(--bg-card)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                >
                    {theme === 'dark' ? '☀️' : '🌙'}
                </button>
            </div>

            <div className="w-full max-w-md rounded-2xl shadow-xl overflow-hidden border" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
                <div className="p-8">
                    <div className="text-center mb-8">
                        <div className="text-5xl mb-4">📦</div>
                        <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>WMS</h1>
                        <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>{t.auth.systemName}</p>
                    </div>

                    <form onSubmit={handleLogin} className="space-y-5">
                        <div>
                            <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-primary)' }}>
                                {t.auth.username}
                            </label>
                            <input
                                type="text"
                                value={username}
                                onChange={e => setUsername(e.target.value)}
                                className="w-full px-4 py-2.5 rounded-xl border focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-shadow"
                                style={{ background: 'var(--bg)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-primary)' }}>
                                {t.auth.password}
                            </label>
                            <input
                                type="password"
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                                className="w-full px-4 py-2.5 rounded-xl border focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-shadow"
                                style={{ background: 'var(--bg)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                                required
                            />
                        </div>

                        {error && (
                            <div className="p-3 text-sm rounded-lg bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400">
                                {error}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-2.5 rounded-xl text-white font-medium transition-colors"
                            style={{ background: 'var(--accent)' }}
                        >
                            {loading ? t.common.loading : t.auth.loginButton}
                        </button>
                    </form>
                </div>

                {/* Helper for demo */}
                <div className="p-4 border-t flex justify-center gap-4 text-sm" style={{ borderColor: 'var(--border)', background: 'var(--bg)' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Demo:</span>
                    <button onClick={() => fillMock('admin')} className="text-blue-500 hover:underline">Admin</button>
                    <button onClick={() => fillMock('staff')} className="text-blue-500 hover:underline">Staff</button>
                </div>
            </div>
        </div>
    );
}
