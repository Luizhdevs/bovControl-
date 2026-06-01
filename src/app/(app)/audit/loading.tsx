export default function AuditLoading() {
  return (
    <div className="space-y-5 pb-10 animate-pulse">
      {/* Header skeleton */}
      <div className="flex items-center justify-between">
        <div className="space-y-1.5">
          <div className="h-6 w-32 rounded-lg bg-muted" />
          <div className="h-4 w-24 rounded bg-muted" />
        </div>
        <div className="h-8 w-20 rounded-lg bg-muted" />
      </div>

      {/* Filtros skeleton */}
      <div className="space-y-2">
        <div className="flex gap-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-8 w-20 rounded-full bg-muted" />
          ))}
        </div>
        <div className="flex gap-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-8 w-16 rounded-full bg-muted" />
          ))}
        </div>
      </div>

      {/* Lista skeleton */}
      <div className="rounded-xl border border-border bg-card divide-y divide-border/40">
        {Array.from({ length: 10 }).map((_, i) => (
          <div key={i} className="flex items-start gap-3 px-4 py-3">
            <div className="size-8 rounded-full bg-muted shrink-0" />
            <div className="flex-1 space-y-1.5">
              <div className="flex gap-2">
                <div className="h-5 w-16 rounded-full bg-muted" />
                <div className="h-5 w-20 rounded bg-muted" />
              </div>
              <div className="h-3 w-32 rounded bg-muted" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
