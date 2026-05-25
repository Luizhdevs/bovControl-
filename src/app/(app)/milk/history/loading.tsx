// Skeleton da página de histórico de leite

export default function MilkHistoryLoading() {
  return (
    <div className="space-y-4 pb-8">
      {/* Header */}
      <div className="space-y-2 pb-2">
        <div className="h-5 w-24 bg-muted rounded animate-pulse" />
        <div className="h-7 w-40 bg-muted rounded-lg animate-pulse" />
      </div>

      {/* Filtros */}
      <div className="space-y-3">
        <div className="flex gap-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-8 w-20 bg-muted rounded-lg animate-pulse" />
          ))}
        </div>
        <div className="flex gap-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-8 w-16 bg-muted rounded-lg animate-pulse" />
          ))}
        </div>
      </div>

      {/* Gráfico */}
      <div className="rounded-xl border border-border bg-card p-4 space-y-3">
        <div className="h-5 w-36 bg-muted rounded animate-pulse" />
        <div className="flex items-end gap-1 h-24">
          {Array.from({ length: 14 }).map((_, i) => (
            <div
              key={i}
              className="flex-1 bg-muted rounded-t animate-pulse"
              style={{ height: `${30 + Math.random() * 60}%` }}
            />
          ))}
        </div>
      </div>

      {/* Tabela */}
      <div className="rounded-xl border border-border bg-card divide-y divide-border/50">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center justify-between px-4 py-3 gap-3">
            <div className="h-4 w-24 bg-muted rounded animate-pulse" />
            <div className="h-4 w-16 bg-muted rounded animate-pulse" />
          </div>
        ))}
      </div>
    </div>
  )
}
