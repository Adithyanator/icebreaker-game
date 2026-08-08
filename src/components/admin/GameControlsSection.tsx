'use client';

import { useState } from 'react';
import { Play, Pause, Eye, RotateCcw, Grid3x3 } from 'lucide-react';
import {
  generateAllBoardsAction,
  startEventAction,
  pauseEventAction,
  resumeEventAction,
  revealTeamsAction,
  resetEventAction,
} from '@/actions/admin-actions';

interface GameControlsSectionProps {
  status: string;
  onRefresh: () => void;
}

export default function GameControlsSection({ status, onRefresh }: GameControlsSectionProps) {
  const [loading, setLoading] = useState('');
  const [error, setError] = useState('');

  async function handleAction(name: string, actionFn: () => Promise<any>, confirmMsg?: string) {
    if (confirmMsg && !window.confirm(confirmMsg)) return;
    setLoading(name);
    setError('');
    try {
      const res = await actionFn();
      if (!res.ok) {
        setError(res.error || 'Action failed');
      } else {
        onRefresh();
      }
    } catch (err: any) {
      setError(err.message || 'Error occurred');
    } finally {
      setLoading('');
    }
  }

  const buttons = [
    {
      id: 'boards',
      label: 'Generate All Boards',
      icon: Grid3x3,
      disabled: status !== 'setup',
      confirm: 'Generate boards for all volunteers?',
      color: 'bg-brand-blue',
      action: generateAllBoardsAction,
    },
    {
      id: 'start',
      label: 'Start Event',
      icon: Play,
      disabled: status !== 'setup',
      color: 'bg-green-600',
      action: startEventAction,
    },
    {
      id: 'pause',
      label: 'Pause Event',
      icon: Pause,
      disabled: status !== 'active',
      color: 'bg-yellow-500',
      action: pauseEventAction,
    },
    {
      id: 'resume',
      label: 'Resume Event',
      icon: Play,
      disabled: status !== 'paused',
      color: 'bg-green-600',
      action: resumeEventAction,
    },
    {
      id: 'reveal',
      label: 'Reveal Teams',
      icon: Eye,
      disabled: status === 'setup' || status === 'revealed',
      confirm: 'Reveal team colors to all volunteers?',
      color: 'bg-purple-600',
      action: revealTeamsAction,
    },
    {
      id: 'reset',
      label: 'Reset Event',
      icon: RotateCcw,
      disabled: false,
      confirm: 'EMERGENCY RESET: This will clear all progress, boards, and reset the event. Are you sure?',
      color: 'bg-red-600',
      action: resetEventAction,
    },
  ];

  return (
    <div>
      <h2 className="mb-4 text-2xl font-bold">Game Controls</h2>

      <div className="card mb-4">
        <p className="text-sm text-gray-500">Current Status</p>
        <p className="text-xl font-bold capitalize">{status}</p>
      </div>

      {error && (
        <div className="mb-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</div>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        {buttons.map(({ id, label, icon: Icon, disabled, confirm, color, action }) => (
          <button
            key={id}
            onClick={() => handleAction(id, action, confirm)}
            disabled={disabled || loading === id}
            className={`flex items-center justify-center gap-2 rounded-2xl px-5 py-4 text-sm font-semibold text-white transition disabled:opacity-40 ${color}`}
          >
            <Icon className="h-5 w-5" />
            {loading === id ? 'Working...' : label}
          </button>
        ))}
      </div>

      <div className="mt-6 card text-sm text-gray-600">
        <p className="font-medium text-gray-800">Flow Guide</p>
        <ol className="mt-2 list-decimal space-y-1 pl-5">
          <li>Add and verify all volunteers</li>
          <li>Generate boards for everyone</li>
          <li>Run pre-event validation</li>
          <li>Start the event</li>
          <li>Monitor live progress</li>
          <li>Reveal teams whenever moderator wants to</li>
        </ol>
      </div>
    </div>
  );
}
