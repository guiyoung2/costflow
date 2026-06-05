interface EmptyStateProps {
  message: string
  icon?: string
}

export default function EmptyState({ message, icon }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-slate-500 animate-fade-in">
      {icon ? <span className="text-3xl mb-3">{icon}</span> : null}
      <p>{message}</p>
    </div>
  )
}
