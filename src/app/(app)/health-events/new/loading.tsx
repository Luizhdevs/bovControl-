export default function NewHealthEventLoading() {
  return (
    <div className="space-y-5 pb-10 animate-pulse">
      {/* Header skeleton */}
      <div className="h-8 w-56 rounded-lg bg-muted" />

      {/* Form skeleton */}
      <div className="space-y-4">
        {/* Animal select */}
        <div className="space-y-1.5">
          <div className="h-4 w-20 rounded bg-muted" />
          <div className="h-10 rounded-lg bg-muted" />
        </div>

        {/* Type pills */}
        <div className="space-y-1.5">
          <div className="h-4 w-12 rounded bg-muted" />
          <div className="grid grid-cols-3 gap-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-10 rounded-lg bg-muted" />
            ))}
          </div>
        </div>

        {/* Other fields */}
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="space-y-1.5">
            <div className="h-4 w-24 rounded bg-muted" />
            <div className="h-10 rounded-lg bg-muted" />
          </div>
        ))}

        {/* Submit button */}
        <div className="h-11 rounded-lg bg-muted" />
      </div>
    </div>
  )
}
