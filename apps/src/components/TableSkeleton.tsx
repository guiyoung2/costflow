interface TableSkeletonProps {
  rows?: number
  cols?: number
}

export default function TableSkeleton({ rows = 5, cols = 5 }: TableSkeletonProps) {
  return (
    <div className="bg-surface-card border border-white/10 rounded-xl overflow-hidden">
      <div className="px-4 py-3 flex gap-3 bg-surface-card">
        {Array.from({ length: cols }).map((_, i) => (
          <div key={i} className="h-3 bg-white/10 rounded-md flex-1 animate-pulse" />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="px-4 py-3 flex gap-3 border-t border-white/5">
          {Array.from({ length: cols }).map((_, j) => (
            <div key={j} className="h-3 bg-white/5 rounded-md flex-1 animate-pulse" />
          ))}
        </div>
      ))}
    </div>
  )
}
