type BadgeVariant = 'success' | 'warning' | 'danger' | 'info' | 'secondary' | 'primary' | 'purple';

const variants: Record<BadgeVariant, string> = {
  success: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  warning: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  danger: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  info: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  secondary: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
  primary: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400',
  purple: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
};

interface BadgeProps {
  label: string;
  variant?: BadgeVariant;
  dot?: boolean;
}

export function Badge({ label, variant = 'secondary', dot = false }: BadgeProps) {
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${variants[variant]}`}>
      {dot && <span className="w-1.5 h-1.5 rounded-full bg-current" />}
      {label}
    </span>
  );
}

/** Map status string → Badge variant */
export function StatusBadge({ status }: { status: string }) {
  const map: Record<string, BadgeVariant> = {
    Draft: 'secondary', ร่าง: 'secondary',
    Pending: 'warning', รอดำเนินการ: 'warning', รอรับ: 'warning', รอจ่าย: 'warning',
    Completed: 'success', รับแล้ว: 'success', จ่ายแล้ว: 'success', โอนแล้ว: 'success', เสร็จสิ้น: 'success',
    Approved: 'success', อนุมัติ: 'success',
    Rejected: 'danger', ปฏิเสธ: 'danger',
    Cancelled: 'danger', ยกเลิก: 'danger',
    'In Progress': 'info', กำลังดำเนินการ: 'info',
  };
  return <Badge label={status} variant={map[status] ?? 'secondary'} dot />;
}

