// Skeleton da listagem de lotes
// Renderizado pelo Next.js enquanto a page.tsx faz fetch

export default function LotsLoading() {
  return (
    <div className="space-y-5 pb-6">
      {/* Header skeleton */}
      <div className="flex items-center justify-between pb-4">
        <div className="h-8 w-32 bg-muted rounded-lg animate-pulse" />
        <div className="h-9 w-20 bg-muted rounded-lg animate-pulse" />
      </div>

      {/* Filtros skeleton */}
      <div className="space-y-3">
        <div className="h-11 w-full bg-muted rounded-lg animate-pulse" />
        <div className="flex gap-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-9 w-20 bg-muted rounded-full animate-pulse shrink-0" />
          ))}
        </div>
      </div>

      {/* Stats skeleton */}
      <div className="flex gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="text-center shrink-0">
            <div className="h-7 w-8 bg-muted rounded animate-pulse mx-auto" />
            <div className="h-3 w-12 bg-muted rounded animate-pulse mt-1" />
          </div>
        ))}
      </div>

      {/* Grid de cards skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="h-[140px] rounded-xl bg-muted animate-pulse"
          />
        ))}
      </div>
    </div>
  )
}
