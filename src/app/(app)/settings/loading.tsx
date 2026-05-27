export default function SettingsLoading() {
  return (
    <div className="space-y-6">
      <div className="h-8 w-44 bg-muted rounded-lg animate-pulse" />
      {[1, 2, 3].map((i) => (
        <div key={i} className="rounded-xl border border-border bg-card p-4 space-y-3">
          <div className="h-4 w-28 bg-muted rounded animate-pulse" />
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, j) => (
              <div key={j} className="h-4 bg-muted rounded animate-pulse" />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
