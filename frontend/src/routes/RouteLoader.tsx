export const RouteLoader = () => (
  <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-indigo-500/15 via-purple-500/15 to-pink-500/15 px-6 py-10 text-slate-900">
    <div className="flex flex-col items-center gap-4 rounded-[28px] border border-white/60 bg-white/90 px-10 py-8 text-center shadow-[0_20px_80px_rgba(15,23,42,0.3)]">
      <p className="text-xs font-semibold uppercase tracking-[0.4em] text-slate-400">livewire</p>
      <p className="text-lg font-semibold text-slate-700">Loading your workspace…</p>
      <div className="h-2 w-48 overflow-hidden rounded-full bg-slate-200">
        <div className="h-full w-1/2 animate-pulse rounded-full bg-gradient-to-r from-indigo-500 to-purple-500" />
      </div>
    </div>
  </div>
)
