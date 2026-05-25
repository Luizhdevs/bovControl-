export default function ReproductionAnimalLoading() {
  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <div className="h-7 w-40 bg-muted rounded-lg animate-pulse" />
        <div className="h-4 w-32 bg-muted rounded animate-pulse" />
      </div>
      <div className="rounded-xl border border-border bg-card p-4 space-y-3">
        <div className="flex justify-between items-center">
          <div className="h-4 w-32 bg-muted rounded animate-pulse" />
          <div className="h-6 w-20 bg-muted rounded-full animate-pulse" />
        </div>
        <div className="flex justify-between">
          <div className="h-4 w-28 bg-muted rounded animate-pulse" />
          <div className="h-4 w-20 bg-muted rounded animate-pulse" />
        </div>
      </div>
      <div className="h-12 w-full bg-muted rounded-xl animate-pulse" />
      <div className="rounded-xl border border-border bg-card divide-y divide-border/40">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex gap-3 px-4 py-3">
            <div className="size-9 rounded-full bg-muted animate-pulse shrink-0" />
            <div className="flex-1 space-y-1.5">
              <div className="h-4 w-36 bg-muted rounded animate-pulse" />
              <div className="h-3 w-24 bg-muted rounded animate-pulse" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
