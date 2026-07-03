import { cn } from '@/lib/utils'
import { VETERINARY_GROUP_LABELS } from '../constants'
import type { VeterinaryReportGroup } from '@prisma/client'

const GROUP_COLORS: Record<VeterinaryReportGroup, string> = {
  CLOSE_UP:            'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300',
  EMPTY_LATE:          'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
  TO_DRY:              'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  DRY_EMPTY:           'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
  INSEMINATED_OVER_30D:'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300',
  LACTATING_PREGNANT:  'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
  DRY_PREGNANT:        'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300',
  PREGNANT_HEIFER:     'bg-lime-100 text-lime-700 dark:bg-lime-900/30 dark:text-lime-300',
  EMPTY_NORMAL_45D:    'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
  UNKNOWN:             'bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400',
}

interface Props {
  group:     VeterinaryReportGroup
  size?:     'sm' | 'default'
  className?: string
}

export function VeterinaryGroupBadge({ group, size = 'default', className }: Props) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full font-medium whitespace-nowrap',
        size === 'sm'
          ? 'px-1.5 py-0.5 text-[10px]'
          : 'px-2 py-0.5 text-xs',
        GROUP_COLORS[group],
        className,
      )}
    >
      {VETERINARY_GROUP_LABELS[group]}
    </span>
  )
}
