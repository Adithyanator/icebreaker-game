'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Trophy, Sparkles, LogOut } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { volunteerLogoutAction } from '@/actions/volunteer-actions';
import type { VolunteerPublic } from '@/types/database';

export default function VolunteerCompletedPage() {
  const router = useRouter();
  const [volunteer, setVolunteer] = useState<VolunteerPublic | null>(null);

  useEffect(() => {
    fetch('/api/volunteers/me')
      .then((res) => res.json())
      .then((data) => {
        if (data.volunteer) {
          setVolunteer(data.volunteer);
        }
      })
      .catch(() => {});

    // Realtime subscription for team reveal
    const supabase = createClient();
    const channel = supabase
      .channel('volunteer-completed-realtime')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'event_state', filter: 'id=eq.1' },
        (payload) => {
          if (payload.new.status === 'revealed') {
            router.push('/volunteer/result');
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [router]);

  async function handleExit() {
    await volunteerLogoutAction();
    router.push('/volunteer/login');
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-between p-6">
      <div className="w-full max-w-sm flex items-center justify-between">
        <span className="text-xs font-bold uppercase tracking-wider text-green-600">
          BINGO Complete!
        </span>
        <button
          onClick={handleExit}
          className="flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-50 active:scale-95"
        >
          <LogOut className="h-3.5 w-3.5" />
          Exit Game
        </button>
      </div>

      <div className="my-auto flex w-full max-w-sm flex-col items-center text-center">
        <div className="mb-6 flex h-24 w-24 items-center justify-center rounded-3xl bg-amber-100 text-amber-500 shadow-inner">
          <Trophy className="h-12 w-12" />
        </div>

        <h1 className="mb-2 text-3xl font-extrabold text-gray-900 flex items-center justify-center gap-2">
          BINGO! <Sparkles className="h-6 w-6 text-amber-500" />
        </h1>
        <p className="mb-6 text-sm text-gray-500">
          Awesome job! You completed your 5×5 BINGO board.
        </p>

        {volunteer?.completionPosition && (
          <div className="card w-full mb-6 border border-amber-200 bg-amber-50/50 py-4">
            <p className="text-xs uppercase font-bold tracking-wider text-amber-700">
              Completion Rank
            </p>
            <p className="text-4xl font-extrabold text-amber-600">
              #{volunteer.completionPosition}
            </p>
          </div>
        )}

        <div className="rounded-2xl bg-white p-6 shadow-sm w-full border border-gray-100">
          <p className="text-sm font-semibold text-gray-800 mb-1">
            Waiting for Team Reveal...
          </p>
          <p className="text-xs text-gray-500">
            The moderator will reveal team color assignments shortly.
          </p>
        </div>
      </div>

      <p className="pb-4 text-center text-xs text-gray-400">
        Stay on this screen to see your team assignment.
      </p>
    </div>
  );
}
