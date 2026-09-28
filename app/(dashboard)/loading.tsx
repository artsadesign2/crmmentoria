export default function DashboardLoading() {
  return (
    <div className="space-y-6 animate-pulse p-1 sm:p-2">
      {/* Top Banner / Header Skeleton */}
      <div className="h-24 sm:h-28 rounded-3xl bg-slate-800/40 border border-slate-700/30 backdrop-blur-xl flex items-center justify-between p-6">
        <div className="space-y-2.5 max-w-sm w-full">
          <div className="h-5 w-48 bg-slate-700/50 rounded-lg" />
          <div className="h-3.5 w-64 bg-slate-700/30 rounded-lg" />
        </div>
        <div className="hidden sm:flex gap-3">
          <div className="h-10 w-28 bg-slate-700/40 rounded-xl" />
          <div className="h-10 w-32 bg-slate-700/40 rounded-xl" />
        </div>
      </div>

      {/* KPI Cards Skeleton */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="h-28 rounded-2xl bg-slate-800/30 border border-slate-700/20 p-4 flex flex-col justify-between"
          >
            <div className="flex items-center justify-between">
              <div className="h-3.5 w-20 bg-slate-700/40 rounded" />
              <div className="w-8 h-8 rounded-xl bg-slate-700/30" />
            </div>
            <div className="h-7 w-24 bg-slate-700/60 rounded-lg" />
          </div>
        ))}
      </div>

      {/* Main Grid Skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 h-96 rounded-3xl bg-slate-800/20 border border-slate-700/20 p-6 space-y-4">
          <div className="h-5 w-40 bg-slate-700/40 rounded" />
          <div className="h-64 bg-slate-700/10 rounded-2xl" />
        </div>
        <div className="h-96 rounded-3xl bg-slate-800/20 border border-slate-700/20 p-6 space-y-4">
          <div className="h-5 w-32 bg-slate-700/40 rounded" />
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((j) => (
              <div key={j} className="h-12 rounded-xl bg-slate-700/20 flex items-center px-4" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
