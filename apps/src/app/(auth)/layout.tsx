'use client'
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-screen bg-surface overflow-hidden flex items-center justify-center">
      {/* 배경 애니메이션 블롭 */}
      <div className="absolute inset-0 pointer-events-none">
        {/* 블롭 1 — 파란 */}
        <div
          className="absolute w-[600px] h-[600px] rounded-full opacity-20 animate-pulse-slow"
          style={{
            background: 'radial-gradient(circle, #3b82f6 0%, transparent 70%)',
            top: '-10%',
            left: '-10%',
            animation: 'float 8s ease-in-out infinite',
          }}
        />
        {/* 블롭 2 — 보라 */}
        <div
          className="absolute w-[500px] h-[500px] rounded-full opacity-15"
          style={{
            background: 'radial-gradient(circle, #8b5cf6 0%, transparent 70%)',
            bottom: '-15%',
            right: '-10%',
            animation: 'float 10s ease-in-out infinite reverse',
          }}
        />
        {/* 블롭 3 — 시안 */}
        <div
          className="absolute w-[400px] h-[400px] rounded-full opacity-10"
          style={{
            background: 'radial-gradient(circle, #06b6d4 0%, transparent 70%)',
            top: '40%',
            right: '20%',
            animation: 'float 12s ease-in-out infinite 2s',
          }}
        />
        {/* 그리드 오버레이 */}
        <div
          className="absolute inset-0 opacity-5"
          style={{
            backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)',
            backgroundSize: '40px 40px',
          }}
        />
      </div>
      {/* keyframes 인라인 정의 */}
      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px) scale(1); }
          50%       { transform: translateY(-30px) scale(1.05); }
        }
      `}</style>
      {/* 콘텐츠 */}
      <div className="relative z-10 w-full flex items-center justify-center p-4">
        {children}
      </div>
    </div>
  )
}
