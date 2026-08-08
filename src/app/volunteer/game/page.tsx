'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { LogOut, Loader2 } from 'lucide-react';
import GameBoard from '@/components/game/GameBoard';
import PausedOverlay from '@/components/game/PausedOverlay';
import { createClient } from '@/lib/supabase/client';
import { volunteerLogoutAction } from '@/actions/volunteer-actions';
import type { VolunteerPublic, EventStatus } from '@/types/database';

export default function VolunteerGamePage() {
  const router = useRouter();
  const [volunteer, setVolunteer] = useState<VolunteerPublic | null>(null);
  const [eventStatus, setEventStatus] = useState<EventStatus>('active');
  const [loading, setLoading] = useState(true);

  const fetchState = useCallback(async () => {
    try {
      // 1. Get current event state
      const eventRes = await fetch('/api/event');
      const eventData = await eventRes.json();
      if (eventData.status) {
        setEventStatus(eventData.status);
        if (eventData.status === 'setup') {
          router.push('/volunteer/lobby');
          return;
        } else if (eventData.status === 'revealed') {
          router.push('/volunteer/result');
          return;
        }
      }

      // 2. Get current volunteer state from session using custom header for multi-tab isolation
      const volId =
        typeof window !== 'undefined'
          ? sessionStorage.getItem('volunteer_id') || localStorage.getItem('volunteer_id')
          : null;
      const volRes = await fetch('/api/volunteers/me', {
        headers: volId ? { 'x-volunteer-id': volId } : {},
      });
      if (!volRes.ok) {
        router.push('/volunteer/login');
        return;
      }
      const volData = await volRes.json();
      if (volData.volunteer) {
        setVolunteer(volData.volunteer);
        if (volData.volunteer.status === 'completed') {
          router.push('/volunteer/completed');
          return;
        }
      }
    } catch {
      // Ignore
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    fetchState();
    const timer = setInterval(fetchState, 1000);

    // Setup Supabase Realtime subscriptions
    const supabase = createClient();
    const channel = supabase
      .channel('volunteer-game-realtime')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'event_state', filter: 'id=eq.1' },
        (payload) => {
          const newStatus = payload.new.status as EventStatus;
          setEventStatus(newStatus);
          if (newStatus === 'setup') {
            router.push('/volunteer/lobby');
          } else if (newStatus === 'revealed') {
            router.push('/volunteer/result');
          }
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'cell_entries' },
        () => {
          fetchState();
        }
      )
      .subscribe();

    return () => {
      clearInterval(timer);
      supabase.removeChannel(channel);
    };
  }, [fetchState, router]);

  async function handleExit() {
    if (volunteer?.id) {
      await volunteerLogoutAction(volunteer.id);
    } else {
      await volunteerLogoutAction();
    }
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem('volunteer_id');
      localStorage.removeItem('volunteer_id');
    }
    router.push('/volunteer/login');
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-brand-orange" />
      </div>
    );
  }

  if (!volunteer) return null;

  return (
    <div className="min-h-screen bg-gray-50 pb-12">
      {/* Header */}
      <header className="sticky top-0 z-40 flex items-center justify-between border-b bg-white px-4 py-3 shadow-sm">
        <div>
          <h1 className="font-bold text-gray-900">{volunteer.name}</h1>
          <p className="text-xs text-gray-500">{volunteer.centre} Centre</p>
        </div>
        <button
          onClick={handleExit}
          className="flex items-center gap-1 text-xs font-medium text-gray-500 hover:text-red-600"
        >
          <LogOut className="h-4 w-4" />
          <span>Exit</span>
        </button>
      </header>

      {/* Main Board */}
      <main className="mx-auto max-w-md p-4">
        <GameBoard
          volunteer={volunteer}
          onUpdate={fetchState}
          onBingo={fetchState}
        />
      </main>

      {/* Paused Overlay */}
      {eventStatus === 'paused' && <PausedOverlay />}
    </div>
  );
}
