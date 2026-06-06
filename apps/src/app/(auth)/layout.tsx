export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-surface flex items-center justify-center p-4"
         style={{
           backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(34,211,238,0.07) 1px, transparent 0)',
           backgroundSize: '32px 32px',
         }}
    >
      {children}
    </div>
  )
}
