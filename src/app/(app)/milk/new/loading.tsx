// Skeleton da página de registro de leite

export default function MilkNewLoading() {
  return (
    <div className="space-y-5 pb-32">
      {/* Header */}
      <div className="space-y-2 pb-2">
        <div className="h-5 w-24 bg-muted rounded animate-pulse" />
        <div className="h-7 w-48 bg-muted rounded-lg animate-pulse" />
      </div>

      {/* Animal selector */}
      <div className="space-y-2">
        <div className="h-4 w-16 bg-muted rounded animate-pulse" />
        <div className="h-11 rounded-xl bg-muted animate-pulse" />
        <div className="h-40 rounded-xl bg-muted animate-pulse" />
      </div>

      {/* Shift tabs */}
      <div className="space-y-2">
        <div className="h-4 w-12 bg-muted rounded animate-pulse" />
        <div className="grid grid-cols-3 gap-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-[68px] rounded-xl bg-muted animate-pulse" />
          ))}
        </div>
      </div>

      {/* Liters input */}
      <div className="space-y-2">
        <div className="h-4 w-28 bg-muted rounded animate-pulse" />
        <div className="h-20 rounded-xl bg-muted animate-pulse" />
      </div>

      {/* Footer */}
      <div className="h-13 rounded-xl bg-muted animate-pulse" />
    </div>
  )
}
