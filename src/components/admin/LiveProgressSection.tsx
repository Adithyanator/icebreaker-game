'use client';

import { Trophy, Medal, Award } from 'lucide-react';
import type { Volunteer } from '@/types/database';

interface LiveProgressSectionProps {
  volunteers: Volunteer[];
}

export default function LiveProgressSection({ volunteers }: LiveProgressSectionProps) {
  const playing = volunteers.filter((v) => v.joined && v.is_active);

  // Leaderboard of finishers sorted by completion position (1st, 2nd, 3rd...)
  const leaderboard = playing
    .filter((v) => !!v.completed_at)
    .sort((a, b) => (a.completion_position || 9999) - (b.completion_position || 9999));

  // Active players sorted by status
  const sortedVolunteers = [...playing].sort((a, b) => {
    if (a.completion_position && b.completion_position) {
      return a.completion_position - b.completion_position;
    }
    if (a.completion_position) return -1;
    if (b.completion_position) return 1;
    return a.name.localeCompare(b.name);
  });

  const getRankBadge = (pos?: number | null) => {
    if (!pos) return null;
    if (pos === 1) {
      return (
        <span className="flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-bold text-amber-800 border border-amber-300">
          <Trophy className="h-3.5 w-3.5 text-amber-500" />
          <span>1st Place (Winner)</span>
        </span>
      );
    }
    if (pos === 2) {
      return (
        <span className="flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-bold text-slate-800 border border-slate-300">
          <Medal className="h-3.5 w-3.5 text-slate-400" />
          <span>2nd Place</span>
        </span>
      );
    }
    if (pos === 3) {
      return (
        <span className="flex items-center gap-1 rounded-full bg-amber-900/10 px-2.5 py-0.5 text-xs font-bold text-amber-900 border border-amber-800/20">
          <Award className="h-3.5 w-3.5 text-amber-700" />
          <span>3rd Place</span>
        </span>
      );
    }
    return (
      <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-bold text-gray-700">
        #{pos} Place
      </span>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-900">Live Leaderboard & Progress</h2>
        <span className="text-xs font-medium text-gray-500">
          {leaderboard.length} / {playing.length} Completed
        </span>
      </div>

      {/* Official Leaderboard Table */}
      <div className="card space-y-4 border border-amber-200 bg-gradient-to-br from-amber-50/50 via-white to-orange-50/30">
        <div className="flex items-center justify-between border-b border-amber-100 pb-3">
          <div className="flex items-center gap-2 text-amber-900 font-bold text-base">
            <Trophy className="h-5 w-5 text-amber-500 animate-bounce" />
            <span>Official BINGO Leaderboard</span>
          </div>
          <span className="text-xs font-semibold text-amber-700 bg-amber-100 px-2.5 py-1 rounded-full">
            {leaderboard.length} Finishers
          </span>
        </div>

        {leaderboard.length === 0 ? (
          <div className="py-6 text-center text-sm text-gray-500">
            No BINGO completions yet. Volunteers are currently playing!
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-amber-100/60 text-amber-900 uppercase tracking-wider text-[10px] font-bold">
                <tr>
                  <th className="p-3">Rank</th>
                  <th className="p-3">Volunteer Name</th>
                  <th className="p-3">Centre</th>
                  <th className="p-3">Team</th>
                  <th className="p-3">Completed At</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-amber-100/60">
                {leaderboard.map((v) => (
                  <tr key={v.id} className="bg-white/80 hover:bg-amber-50/40 transition">
                    <td className="p-3">{getRankBadge(v.completion_position)}</td>
                    <td className="p-3 font-bold text-gray-900">{v.name}</td>
                    <td className="p-3 text-gray-600">{v.centre}</td>
                    <td className="p-3 font-medium text-gray-700">{v.assigned_color || '—'}</td>
                    <td className="p-3 text-gray-500 font-mono text-[11px]">
                      {v.completed_at ? new Date(v.completed_at).toLocaleTimeString() : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Joined Volunteers Live Status Table */}
      <div className="card space-y-3 border border-gray-100">
        <h3 className="text-sm font-bold text-gray-900">Joined Volunteers Live Status</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-gray-600">
            <thead className="bg-gray-50 text-gray-700 uppercase tracking-wider text-[10px] font-bold">
              <tr>
                <th className="p-3">Rank / ID</th>
                <th className="p-3">Name</th>
                <th className="p-3">Centre</th>
                <th className="p-3">Status</th>
                <th className="p-3">Team</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {sortedVolunteers.map((v) => (
                <tr key={v.id}>
                  <td className="p-3 font-mono font-bold text-gray-700">
                    {v.completion_position ? `#${v.completion_position}` : v.id}
                  </td>
                  <td className="p-3 font-semibold text-gray-900">{v.name}</td>
                  <td className="p-3">{v.centre}</td>
                  <td className="p-3">
                    {v.completed_at ? (
                      <span className="rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-bold text-green-700">
                        Completed (#{v.completion_position})
                      </span>
                    ) : (
                      <span className="rounded-full bg-orange-100 px-2 py-0.5 text-[10px] font-bold text-orange-700">
                        Playing
                      </span>
                    )}
                  </td>
                  <td className="p-3 font-medium">{v.assigned_color || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
