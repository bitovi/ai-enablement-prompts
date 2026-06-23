import { StatusBadge } from '../StatusBadge'

type Status = 'success' | 'warning' | 'error'
type Variant = 'default' | 'compact'

interface InfoCardProps {
  title: string
  description: string
  status: Status
  variant?: Variant
}

export function InfoCard({ title, description, status, variant = 'default' }: InfoCardProps) {
  const isCompact = variant === 'compact'

  return (
    <div
      className="border border-[var(--color-border)] bg-[var(--color-surface)]"
      style={{
        padding: isCompact ? '0.75rem' : 'var(--spacing-card)',
        borderRadius: 'var(--radius-card)',
      }}
    >
      <div className="flex items-center justify-between mb-2">
        <h3 className={`font-semibold text-[var(--color-text-primary)] ${isCompact ? 'text-sm' : 'text-base'}`}>
          {title}
        </h3>
        <StatusBadge status={status} label={status} />
      </div>
      {!isCompact && (
        <p className="text-sm text-[var(--color-text-secondary)] m-0">
          {description}
        </p>
      )}
    </div>
  )
}
