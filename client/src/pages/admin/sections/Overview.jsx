import { Users, UserCheck, Trophy, Clock } from 'lucide-react';

export default function Overview({ data }) {
  const { overview, event, joinedCount } = data || {};
  const stats = [
    { label: 'Total Volunteers', value: overview?.totalVolunteers || 0, icon: Users, color: 'text-brand-blue' },
    { label: 'Joined', value: joinedCount || 0, icon: UserCheck, color: 'text-brand-orange' },
    { label: 'Playing', value: overview?.playing || 0, icon: Clock, color: 'text-yellow-600' },
    { label: 'Completed', value: overview?.completed || 0, icon: Trophy, color: 'text-green-600' },
  ];

  const statusLabels = {
    setup: { text: 'Setup', color: 'bg-gray-100 text-gray-700' },
    active: { text: 'Active', color: 'bg-green-100 text-green-700' },
    paused: { text: 'Paused', color: 'bg-yellow-100 text-yellow-700' },
    revealed: { text: 'Teams Revealed', color: 'bg-purple-100 text-purple-700' },
  };

  const status = statusLabels[event?.status] || statusLabels.setup;

  return (
    <div>
      <h2 className="mb-4 text-2xl font-bold">Overview</h2>

      <div className="card mb-4">
        <p className="text-sm text-gray-500">Event Status</p>
        <span className={`mt-1 inline-block rounded-full px-3 py-1 text-sm font-semibold ${status.color}`}>
          {status.text}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {stats.map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="card">
            <Icon className={`mb-2 h-6 w-6 ${color}`} />
            <p className="text-2xl font-bold">{value}</p>
            <p className="text-sm text-gray-500">{label}</p>
          </div>
        ))}
      </div>

      {overview?.joinedLetters && overview.joinedLetters.length > 0 && (
        <div className="card mt-4">
          <h3 className="text-lg font-bold mb-1 text-gray-800">Joined Initials Pool</h3>
          <p className="text-xs text-gray-500 mb-3">
            These are the first letters of all currently joined volunteers. Board generation pulls randomly from this list.
          </p>
          <div className="flex flex-wrap gap-2">
            {overview.joinedLetters.map((letter, idx) => (
              <div key={idx} className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-50 text-orange-600 font-bold text-lg border border-orange-200 shadow-xs">
                {letter}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
