// Skeleton da página de leite por animal

export default function MilkAnimalLoading() {
  return (
    <div className="space-y-4 pb-32">
      {/* Header */}
      <div className="space-y-2 pb-2">
        <div className="h-5 w-24 bg-muted rounded animate-pulse" />
        <div className="h-7 w-44 bg-muted rounded-lg animate-pulse" />
        <div className="h-4 w-28 bg-muted rounded animate-pulse" />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-20 rounded-xl bg-muted animate-pulse" />
        ))}
      </div>

      {/* Records list */}
      <div className="rounded-xl border border-border bg-card divide-y divide-border/50">
        <div className="px-4 py-3">
          <div className="h-5 w-28 bg-muted rounded animate-pulse" />
        </div>
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 px-4 py-3">
            <div className="size-10 rounded-xl bg-muted animate-pulse" />
            <div className="flex-1 space-y-1.5">
              <div className="h-4 w-24 bg-muted rounded animate-pulse" />
              <div className="h-3 w-32 bg-muted rounded animate-pulse" />
            </div>
            <div className="h-5 w-14 bg-muted rounded animate-pulse" />
          </div>
        ))}
      </div>
    </div>
  )
}
