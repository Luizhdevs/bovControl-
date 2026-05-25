// Skeleton da página principal de leite

export default function MilkLoading() {
  return (
    <div className="space-y-4 pb-32">
      {/* Header */}
      <div className="space-y-2 pb-2">
        <div className="h-7 w-40 bg-muted rounded-lg animate-pulse" />
        <div className="h-4 w-28 bg-muted rounded animate-pulse" />
      </div>

      {/* Summary card */}
      <div className="rounded-xl border border-border bg-card p-4 space-y-4">
        <div className="flex flex-col items-center gap-2">
          <div className="h-12 w-36 bg-muted rounded-lg animate-pulse" />
          <div className="h-4 w-24 bg-muted rounded animate-pulse" />
        </div>
        <div className="grid grid-cols-3 gap-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-20 rounded-xl bg-muted animate-pulse" />
          ))}
        </div>
      </div>

      {/* Quick register button */}
      <div className="h-13 rounded-xl bg-muted animate-pulse" />

      {/* Ranking */}
      <div className="rounded-xl border border-border bg-card p-4 space-y-3">
        <div className="h-5 w-40 bg-muted rounded animate-pulse" />
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3">
            <div className="size-6 rounded-full bg-muted animate-pulse" />
            <div className="flex-1 space-y-1">
              <div className="h-4 w-28 bg-muted rounded animate-pulse" />
              <div className="h-1.5 rounded-full bg-muted animate-pulse" />
            </div>
            <div className="h-4 w-14 bg-muted rounded animate-pulse" />
          </div>
        ))}
      </div>
    </div>
  )
}
