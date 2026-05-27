export default function HealthEventsLoading() {
  return (
    <div className="space-y-5 pb-10 animate-pulse">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1.5">
          <div className="h-6 w-32 rounded-md bg-muted" />
          <div className="h-4 w-20 rounded-md bg-muted" />
        </div>
        <div className="h-9 w-24 rounded-lg bg-muted" />
      </div>

      {/* Filtros */}
      <div className="flex gap-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-7 w-20 rounded-full bg-muted shrink-0" />
        ))}
      </div>

      {/* Cards */}
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="rounded-xl border border-border bg-card p-4 space-y-2.5">
          <div className="flex justify-between">
            <div className="h-4 w-32 rounded bg-muted" />
            <div className="h-4 w-20 rounded bg-muted" />
          </div>
          <div className="h-4 w-64 rounded bg-muted" />
          <div className="h-4 w-40 rounded bg-muted" />
        </div>
      ))}
    </div>
  )
}
