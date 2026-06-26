import { useCallback, useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { api, getStoredVolunteer, setStoredVolunteer } from '../api';
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
        prev ? { ...prev, progress: data.progress, status: data.status } : prev
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

  if (isRevealed) {
    return <ResultPage volunteer={volunteer} />;
  }

  if (isComplete) {
    return <CompletionWaiting volunteer={volunteer} />;
  }

  if (eventStatus === EVENT_STATES.ACTIVE || eventStatus === EVENT_STATES.PAUSED) {
    return (
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
  }

  return <WaitingLobby volunteer={volunteer} event={event} onRefresh={refresh} />;
}
