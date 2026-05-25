import { cn } from '@/lib/utils'

// ─── Skeleton base ─────────────────────────────────────────

function Skeleton({ className }: { className?: string }) {
  return (
    <div className={cn('animate-pulse rounded-md bg-muted', className)} />
  )
}

// ─── Card de loading (animal list) ────────────────────────

/**
 * Skeleton de um AnimalCard.
 * Mesma altura e estrutura do card real.
 */
export function AnimalCardSkeleton() {
  return (
    <div className="rounded-xl border border-border bg-card p-3 min-h-[120px]">
      <div className="flex items-center gap-3">
        <Skeleton className="size-14 rounded-lg shrink-0" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-3 w-32" />
          <Skeleton className="h-3 w-20" />
        </div>
      </div>
    </div>
  )
}

/**
 * Grid de skeletons para a listagem de animais.
 */
export function AnimalListSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
      {Array.from({ length: count }).map((_, i) => (
        <AnimalCardSkeleton key={i} />
      ))}
    </div>
  )
}

// ─── Skeleton de seção ─────────────────────────────────────

/**
 * Skeleton de um SectionCard com linhas de info.
 */
export function SectionCardSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="rounded-xl border border-border bg-card">
      <div className="px-4 pt-4 pb-3">
        <Skeleton className="h-4 w-28" />
      </div>
      <div className="border-t border-border/50" />
      <div className="p-4 space-y-1">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex justify-between py-2.5">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-3 w-28" />
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Skeleton de detalhe do animal ────────────────────────

/**
 * Skeleton da página de detalhes do animal.
 */
export function AnimalDetailSkeleton() {
  return (
    <div className="space-y-4 pb-32">
      {/* Foto de capa */}
      <Skeleton className="h-52 -mx-4 rounded-none" />

      {/* Badges */}
      <div className="flex gap-2">
        <Skeleton className="h-6 w-16 rounded-full" />
        <Skeleton className="h-6 w-20 rounded-full" />
        <Skeleton className="h-6 w-14 rounded-full" />
      </div>

      {/* Seções */}
      <SectionCardSkeleton rows={5} />
      <SectionCardSkeleton rows={2} />

      {/* Timeline fotos */}
      <div className="rounded-xl border border-border bg-card p-4">
        <Skeleton className="h-4 w-24 mb-3" />
        <div className="grid grid-cols-3 gap-1.5">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="aspect-square rounded-lg" />
          ))}
        </div>
      </div>
    </div>
  )
}
