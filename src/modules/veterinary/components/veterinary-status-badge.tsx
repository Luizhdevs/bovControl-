import { cn } from '@/lib/utils'
import { REPORT_STATUS_LABELS } from '../constants'
import type { VeterinaryReportStatus } from '@prisma/client'

const STATUS_COLORS: Record<VeterinaryReportStatus, string> = {
  DRAFT:              'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300',
  IMPORTED:           'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  PARTIALLY_IMPORTED: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  FAILED:             'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
}

interface Props {
  status:    VeterinaryReportStatus
  className?: string
}

export function VeterinaryStatusBadge({ status, className }: Props) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
        STATUS_COLORS[status],
        className,
      )}
    >
      {REPORT_STATUS_LABELS[status]}
    </span>
  )
}
