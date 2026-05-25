export default function ReproductionNewLoading() {
  return (
    <div className="space-y-5">
      <div className="space-y-1">
        <div className="h-7 w-40 bg-muted rounded-lg animate-pulse" />
        <div className="h-4 w-28 bg-muted rounded animate-pulse" />
      </div>
      <div className="h-10 w-full bg-muted rounded-lg animate-pulse" />
      <div className="space-y-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-14 w-full bg-muted rounded-xl animate-pulse" />
        ))}
      </div>
      <div className="h-10 w-full bg-muted rounded-lg animate-pulse" />
      <div className="h-24 w-full bg-muted rounded-lg animate-pulse" />
    </div>
  )
}
