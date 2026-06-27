export default function LiveProgress({ volunteers }) {
  const sorted = [...volunteers].sort((a, b) => {
    const aComp = a.status === 'completed';
    const bComp = b.status === 'completed';
    if (aComp && bComp) {
      return (a.completionPosition || 999) - (b.completionPosition || 999);
    }
    if (aComp) return -1;
    if (bComp) return 1;
    return b.progress - a.progress;
  });

  return (
    <div>
      <h2 className="mb-4 text-2xl font-bold">Live Progress</h2>

      <div className="space-y-2">
        {sorted.map((v) => (
          <div key={v.id} className="card flex items-center gap-4 py-3">
            {v.status === 'completed' && v.completionPosition && (
              <div className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full font-bold text-sm ${
                v.completionPosition === 1 ? 'bg-yellow-400 text-yellow-950 shadow-sm' :
                v.completionPosition === 2 ? 'bg-slate-300 text-slate-800 shadow-sm' :
                v.completionPosition === 3 ? 'bg-amber-600 text-white shadow-sm' :
                'bg-blue-50 text-blue-800 border border-blue-200'
              }`}>
                {v.completionPosition}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="truncate font-medium">{v.name}</p>
              <p className="text-xs text-gray-500">{v.centre} · {v.code}</p>
            </div>
            <div className="w-32">
              <div className="mb-1 flex justify-between text-xs">
                <span>{v.progress}/24</span>
                <span>{Math.round((v.progress / 24) * 100)}%</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-gray-200">
                <div
                  className={`h-full rounded-full transition-all ${
                    v.status === 'completed' ? 'bg-green-500' : 'bg-brand-orange'
                  }`}
                  style={{ width: `${(v.progress / 24) * 100}%` }}
                />
              </div>
            </div>
            <span className={`hidden w-20 text-right text-xs font-medium sm:block ${
              v.status === 'completed' ? 'text-green-600' : 'text-gray-500'
            }`}>
              {v.status.replace('_', ' ')}
            </span>
          </div>
        ))}

        {sorted.length === 0 && (
          <p className="text-center text-gray-500">No volunteers yet</p>
        )}
      </div>
    </div>
  );
}
