export default function AlertsLoading() {
  return (
    <div className="space-y-5">
      <div className="h-8 w-40 bg-muted rounded-lg animate-pulse" />
      <div className="h-10 bg-muted rounded-xl animate-pulse" />
      <div className="space-y-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-24 bg-muted rounded-xl animate-pulse" />
        ))}
      </div>
    </div>
  )
}
