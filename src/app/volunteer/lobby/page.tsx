'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Users } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import type { VolunteerPublic } from '@/types/database';

export default function VolunteerLobbyPage() {
  const router = useRouter();
  const [volunteer, setVolunteer] = useState<VolunteerPublic | null>(null);
  const [joinedCount, setJoinedCount] = useState<number>(0);

  useEffect(() => {
    // Check event status every 1s for instant real-time navigation
    const checkEvent = () => {
      fetch('/api/event')
        .then((res) => res.json())
        .then((data) => {
          if (data.joinedCount !== undefined) setJoinedCount(data.joinedCount);
          if (data.status === 'active' || data.status === 'paused') {
            router.push('/volunteer/game');
          } else if (data.status === 'revealed') {
            router.push('/volunteer/result');
          }
        })
        .catch(() => {});
    };

    checkEvent();
    const timer = setInterval(checkEvent, 1000);

    const volId =
      typeof window !== 'undefined'
        ? sessionStorage.getItem('volunteer_id') || localStorage.getItem('volunteer_id')
        : null;
    fetch('/api/volunteers/me', {
      headers: volId ? { 'x-volunteer-id': volId } : {},
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.volunteer) {
          setVolunteer(data.volunteer);
        } else {
          router.push('/volunteer/login');
        }
      })
      .catch(() => {});

    // Supabase Realtime Subscription
    const supabase = createClient();
    const channel = supabase
      .channel('lobby-realtime')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'event_state', filter: 'id=eq.1' },
        (payload) => {
          const newStatus = payload.new.status;
          if (newStatus === 'active' || newStatus === 'paused') {
            router.push('/volunteer/game');
          } else if (newStatus === 'revealed') {
            router.push('/volunteer/result');
          }
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'volunteers' },
        () => {
          fetch('/api/event')
            .then((res) => res.json())
            .then((data) => {
              if (data.joinedCount !== undefined) setJoinedCount(data.joinedCount);
            })
            .catch(() => {});
        }
      )
      .subscribe();

    return () => {
      clearInterval(timer);
      supabase.removeChannel(channel);
    };
  }, [router]);

  if (!volunteer) return null;

  return (
    <div className="min-h-screen bg-gradient-to-b from-brand-orange-light to-white px-6 py-8">
      <div className="mx-auto max-w-sm">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-orange">
            <Users className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold">Welcome, {volunteer.name}!</h1>
          <p className="mt-1 text-gray-600">{volunteer.centre} Centre</p>
        </div>

        <div className="card mb-4 text-center">
          <p className="text-sm text-gray-500">Your Unique Code</p>
          <p className="mt-1 text-4xl font-bold tracking-widest text-brand-blue">
            {volunteer.code}
          </p>
          <p className="mt-2 text-xs text-gray-400">
            Share this code when others find you!
          </p>
        </div>

        <div className="card mb-4 flex items-center justify-between">
          <span className="text-gray-600">Volunteers joined</span>
          <span className="text-2xl font-bold text-brand-orange">{joinedCount}</span>
        </div>

        <div className="rounded-2xl bg-brand-blue-light p-5 text-center">
          <p className="animate-pulse font-medium text-brand-blue">
            Waiting for the moderator to start the game...
          </p>
        </div>
      </div>
    </div>
  );
}
