export default function AnimalDetailLoading() {
  return (
    <div className="space-y-4 pb-6 animate-pulse">
      {/* Header skeleton */}
      <div className="h-8 w-40 rounded-lg bg-muted" />

      {/* Photo skeleton */}
      <div className="h-56 -mx-4 bg-muted" />

      {/* Badges skeleton */}
      <div className="flex gap-2">
        {[64, 80, 72, 56].map((w) => (
          <div key={w} className="h-6 rounded-full bg-muted" style={{ width: w }} />
        ))}
      </div>

      {/* Quick actions skeleton */}
      <div className="grid grid-cols-4 gap-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-16 rounded-xl bg-muted" />
        ))}
      </div>

      {/* Section cards skeleton */}
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="rounded-xl border border-border bg-card p-4 space-y-3">
          <div className="h-4 w-32 rounded bg-muted" />
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, j) => (
              <div key={j} className="h-3 rounded bg-muted" />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
