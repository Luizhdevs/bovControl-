// Skeleton da página de detalhe do lote

export default function LotDetailLoading() {
  return (
    <div className="space-y-4 pb-40">
      {/* Header */}
      <div className="space-y-2 pb-4">
        <div className="h-8 w-24 bg-muted rounded animate-pulse" />
        <div className="h-7 w-48 bg-muted rounded-lg animate-pulse" />
        <div className="h-4 w-32 bg-muted rounded animate-pulse" />
      </div>

      {/* Capacity indicator */}
      <div className="h-16 rounded-xl bg-muted animate-pulse" />

      {/* Stats grid */}
      <div className="grid grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-20 rounded-xl bg-muted animate-pulse" />
        ))}
      </div>

      {/* Animals list */}
      <div className="space-y-2">
        <div className="h-5 w-32 bg-muted rounded animate-pulse" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-[120px] rounded-xl bg-muted animate-pulse" />
          ))}
        </div>
      </div>
    </div>
  )
}
