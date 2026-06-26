import { useCallback, useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { api, getStoredVolunteer, setStoredVolunteer, clearStoredVolunteer } from '../api';
import { useSocket, joinVolunteerRoom } from '../hooks/useSocket';
import { EVENT_STATES } from '../constants';
import WaitingLobby from '../components/WaitingLobby';
import GameBoard from '../components/GameBoard';
import CompletionWaiting from '../components/CompletionWaiting';
import ResultPage from '../components/ResultPage';
import PausedOverlay from '../components/PausedOverlay';

export default function VolunteerFlow() {
  const stored = getStoredVolunteer();
  const [volunteer, setVolunteer] = useState(stored);
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  async function handleLogout() {
    if (!volunteer?.id) return;
    try {
      await api.volunteerLogout(volunteer.id);
    } catch (err) {
      console.error('Logout error:', err);
    }
    clearStoredVolunteer();
    setVolunteer(null);
  }

  const refresh = useCallback(async () => {
    if (!stored?.id) return;
    try {
      const data = await api.getVolunteer(stored.id);
      setVolunteer(data.volunteer);
      setStoredVolunteer(data.volunteer);
      setEvent(data.event);
      setError('');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [stored?.id]);

  useEffect(() => {
    refresh();
    if (stored?.id) joinVolunteerRoom(stored.id);
  }, [refresh, stored?.id]);

  useSocket('event:update', (data) => {
    setEvent((prev) => ({ ...prev, status: data.status }));
  });

  useSocket('teams:revealed', () => {
    refresh();
  });

  useSocket('progress:update', (data) => {
    if (data.volunteerId === stored?.id) {
      setVolunteer((prev) =>
        prev
          ? {
              ...prev,
              progress: data.progress,
              status: data.status,
              completionPosition: data.completionPosition,
            }
          : prev
      );
    }
  });

  if (!stored) return <Navigate to="/login" replace />;

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-blue border-t-transparent" />
      </div>
    );
  }

  if (error && !volunteer) {
    return (
      <div className="flex min-h-screen items-center justify-center px-6">
        <p className="text-red-600">{error}</p>
      </div>
    );
  }

  const eventStatus = event?.status || EVENT_STATES.SETUP;
  const isComplete = volunteer?.progress >= 9;
  const isRevealed = eventStatus === EVENT_STATES.REVEALED && volunteer?.assignedColor;

  let content;
  if (isRevealed) {
    content = <ResultPage volunteer={volunteer} />;
  } else if (isComplete) {
    content = <CompletionWaiting />;
  } else if (eventStatus === EVENT_STATES.ACTIVE || eventStatus === EVENT_STATES.PAUSED) {
    content = (
      <>
        {eventStatus === EVENT_STATES.PAUSED && <PausedOverlay />}
        <GameBoard
          volunteer={volunteer}
          onUpdate={(v) => {
            setVolunteer(v);
            setStoredVolunteer(v);
          }}
        />
      </>
    );
  } else {
    content = <WaitingLobby volunteer={volunteer} event={event} onRefresh={refresh} />;
  }

  return (
    <div className="relative min-h-screen">
      <button
        onClick={handleLogout}
        className="absolute top-4 right-4 z-40 rounded-xl bg-white/80 backdrop-blur-xs px-3 py-1.5 text-xs font-semibold text-gray-600 border border-gray-200/50 shadow-xs hover:bg-gray-50 active:scale-95 transition"
      >
        Exit Game
      </button>
      {content}
    </div>
  );
}
