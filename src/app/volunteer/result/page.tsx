'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import type { VolunteerPublic } from '@/types/database';

const COLOR_STYLES: Record<string, { bg: string; text: string }> = {
  Red: { bg: 'bg-red-500', text: 'text-white' },
  Blue: { bg: 'bg-blue-600', text: 'text-white' },
  Green: { bg: 'bg-emerald-600', text: 'text-white' },
  Purple: { bg: 'bg-purple-600', text: 'text-white' },
  Pink: { bg: 'bg-pink-500', text: 'text-white' },
  Grey: { bg: 'bg-gray-600', text: 'text-white' },
  Yellow: { bg: 'bg-amber-400', text: 'text-gray-900' },
};

export default function VolunteerResultPage() {
  const router = useRouter();
  const [volunteer, setVolunteer] = useState<VolunteerPublic | null>(null);

  useEffect(() => {
    const fetchVolunteer = () => {
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
    };

    const checkEvent = () => {
      fetch('/api/event')
        .then((res) => res.json())
        .then((data) => {
          if (data.status === 'setup') {
            router.push('/volunteer/lobby');
          } else if (data.status === 'active' || data.status === 'paused') {
            router.push('/volunteer/game');
          }
        })
        .catch(() => {});

      fetchVolunteer();
    };

    checkEvent();
    const timer = setInterval(checkEvent, 1000);

    return () => {
      clearInterval(timer);
    };
  }, [router]);

  if (!volunteer) return null;

  const rawColor = volunteer.assignedColor || 'Red';
  const formattedColor = rawColor.charAt(0).toUpperCase() + rawColor.slice(1).toLowerCase();
  const colorStyle = COLOR_STYLES[formattedColor] || COLOR_STYLES[rawColor] || COLOR_STYLES.Red;

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-6 py-12">
      <div
        className={`w-full max-w-sm rounded-3xl p-10 text-center shadow-xl ${colorStyle.bg} ${colorStyle.text}`}
      >
        <p className="mb-2 text-4xl">🎉</p>
        <h1 className="mb-4 text-2xl font-bold">Congratulations!</h1>
        <p className="text-lg leading-relaxed">
          You are in <span className="font-bold uppercase">{formattedColor} TEAM</span>.
        </p>
        <p className="mt-4 text-base opacity-90">
          Please move to the {formattedColor.toUpperCase()} group.
        </p>
      </div>

      <div className="mt-8 text-center text-sm text-gray-500">
        <p>
          {volunteer.name} · {volunteer.centre} · Code {volunteer.code}
        </p>
      </div>
    </div>
  );
}
