interface TableSkeletonProps {
  rows?: number
  cols?: number
}

export default function TableSkeleton({ rows = 5, cols = 5 }: TableSkeletonProps) {
  return (
    <div className="card rounded-lg overflow-hidden">
      <div className="px-4 py-3 flex gap-3 bg-surface-raised">
        {Array.from({ length: cols }).map((_, i) => (
          <div key={i} className="h-2.5 bg-surface-border rounded flex-1 animate-pulse" />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="px-4 py-3 flex gap-3 border-t border-surface-border">
          {Array.from({ length: cols }).map((_, j) => (
            <div key={j} className="h-2.5 bg-surface-raised rounded flex-1 animate-pulse" />
          ))}
        </div>
      ))}
    </div>
  )
}
