import type { ReactNode } from 'react';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: string;
  sub?: string;
  accent?: 'blue' | 'green' | 'yellow' | 'red' | 'purple';
  trend?: 'up' | 'down' | 'neutral';
}

const accents = {
  blue: { bg: 'bg-blue-500/10', icon: 'text-blue-500', border: 'border-blue-500/20' },
  green: { bg: 'bg-green-500/10', icon: 'text-green-500', border: 'border-green-500/20' },
  yellow: { bg: 'bg-yellow-500/10', icon: 'text-yellow-500', border: 'border-yellow-500/20' },
  red: { bg: 'bg-red-500/10', icon: 'text-red-500', border: 'border-red-500/20' },
  purple: { bg: 'bg-purple-500/10', icon: 'text-purple-500', border: 'border-purple-500/20' },
};

export function StatCard({ title, value, icon, sub, accent = 'blue', trend }: StatCardProps) {
  const a = accents[accent];
  return (
    <div
      className={`rounded-2xl p-5 border flex items-start gap-4 transition-shadow hover:shadow-md ${a.border}`}
      style={{ background: 'var(--bg-card)' }}
    >
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl shrink-0 ${a.bg}`}>
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium mb-1 truncate" style={{ color: 'var(--text-secondary)' }}>
          {title}
        </p>
        <p className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
          {typeof value === 'number' ? value.toLocaleString('th-TH') : value}
        </p>
        {sub && (
          <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
            {trend === 'up' && <span className="text-green-500">↑ </span>}
            {trend === 'down' && <span className="text-red-500">↓ </span>}
            {sub}
          </p>
        )}
      </div>
    </div>
  );
}

