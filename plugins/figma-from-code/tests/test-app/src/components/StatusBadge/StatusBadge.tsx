import { CheckCircle, AlertTriangle, XCircle } from 'lucide-react'

type Status = 'success' | 'warning' | 'error'

interface StatusBadgeProps {
  status: Status
  label: string
}

const iconMap = {
  success: CheckCircle,
  warning: AlertTriangle,
  error: XCircle,
} as const

const colorMap = {
  success: 'bg-status-success/10 text-status-success',
  warning: 'bg-status-warning/10 text-status-warning',
  error: 'bg-status-error/10 text-status-error',
} as const

export function StatusBadge({ status, label }: StatusBadgeProps) {
  const Icon = iconMap[status]

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full text-xs font-medium ${colorMap[status]}`}
      style={{ padding: 'var(--spacing-badge)', borderRadius: 'var(--radius-badge)' }}
    >
      <Icon size={14} />
      {label}
    </span>
  )
}
