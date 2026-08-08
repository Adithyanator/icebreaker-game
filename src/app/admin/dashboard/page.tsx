'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  Users,
  Gamepad2,
  Activity,
  HeartPulse,
  Download,
  LogOut,
  Menu,
  X,
} from 'lucide-react';
import OverviewSection from '@/components/admin/OverviewSection';
import GameControlsSection from '@/components/admin/GameControlsSection';
import VolunteerManagementSection from '@/components/admin/VolunteerManagementSection';
import LiveProgressSection from '@/components/admin/LiveProgressSection';
import SystemHealthSection from '@/components/admin/SystemHealthSection';
import ExportBackupSection from '@/components/admin/ExportBackupSection';
import { createClient } from '@/lib/supabase/client';
import { adminLogoutAction } from '@/actions/admin-actions';
import type { Volunteer } from '@/types/database';

const SECTIONS = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'volunteers', label: 'Volunteers', icon: Users },
  { id: 'controls', label: 'Game Controls', icon: Gamepad2 },
  { id: 'progress', label: 'Live Progress', icon: Activity },
  { id: 'health', label: 'System Health', icon: HeartPulse },
  { id: 'export', label: 'Export / Backup', icon: Download },
];

export default function AdminDashboardPage() {
  const router = useRouter();
  const [section, setSection] = useState('overview');
  const [data, setData] = useState<any>(null);
  const [volunteers, setVolunteers] = useState<Volunteer[]>([]);
  const [loading, setLoading] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const [overviewRes, volsRes] = await Promise.all([
        fetch('/api/admin/overview'),
        fetch('/api/admin/volunteers'),
      ]);

      if (overviewRes.status === 401 || volsRes.status === 401) {
        router.push('/admin/login');
        return;
      }

      const overviewData = await overviewRes.json();
      const volsData = await volsRes.json();

      setData(overviewData);
      if (volsData.volunteers) setVolunteers(volsData.volunteers);
    } catch {
      // Ignore
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    refresh();
    const timer = setInterval(refresh, 2000);

    // Supabase Realtime subscription for admin live updates
    const supabase = createClient();
    const channel = supabase
      .channel('admin-dashboard-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'volunteers' },
        () => refresh()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'event_state' },
        () => refresh()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'cell_entries' },
        () => refresh()
      )
      .subscribe();

    return () => {
      clearInterval(timer);
      supabase.removeChannel(channel);
    };
  }, [refresh]);

  async function handleLogout() {
    await adminLogoutAction();
    window.location.href = '/admin/login';
  }

  const isLocked = ['active', 'paused', 'revealed'].includes(data?.event?.status);

  return (
    <div className="flex min-h-screen bg-gray-100">
      {/* Sidebar - desktop */}
      <aside className="hidden w-64 flex-shrink-0 flex-col border-r bg-white lg:flex">
        <div className="border-b p-5">
          <h1 className="text-lg font-bold text-brand-blue">U&I Moderator</h1>
          {isLocked && (
            <span className="mt-1 inline-block rounded-full bg-orange-100 px-2 py-0.5 text-xs font-medium text-orange-700">
              Event Locked
            </span>
          )}
        </div>
        <nav className="flex-1 p-3">
          {SECTIONS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setSection(id)}
              className={`mb-1 flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-sm font-medium transition ${
                section === id
                  ? 'bg-brand-blue text-white'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <Icon className="h-5 w-5" />
              {label}
            </button>
          ))}
        </nav>
        <button
          onClick={handleLogout}
          className="m-3 flex items-center gap-2 rounded-xl px-4 py-3 text-sm text-red-600 hover:bg-red-50"
        >
          <LogOut className="h-4 w-4" /> Logout
        </button>
      </aside>

      {/* Mobile header */}
      <div className="flex flex-1 flex-col">
        <header className="flex items-center justify-between border-b bg-white px-4 py-3 lg:hidden">
          <h1 className="font-bold text-brand-blue">Moderator</h1>
          <button onClick={() => setMenuOpen(!menuOpen)} className="rounded-lg p-2">
            {menuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </header>

        {menuOpen && (
          <div className="border-b bg-white p-3 lg:hidden">
            {SECTIONS.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => {
                  setSection(id);
                  setMenuOpen(false);
                }}
                className={`mb-1 flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium ${
                  section === id ? 'bg-brand-blue text-white' : 'text-gray-600'
                }`}
              >
                <Icon className="h-5 w-5" /> {label}
              </button>
            ))}
            <button onClick={handleLogout} className="flex w-full items-center gap-2 px-4 py-3 text-sm text-red-600">
              <LogOut className="h-4 w-4" /> Logout
            </button>
          </div>
        )}

        <main className="flex-1 overflow-auto p-4 lg:p-6">
          {loading ? (
            <div className="flex h-64 items-center justify-center">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-blue border-t-transparent" />
            </div>
          ) : (
            <>
              {section === 'overview' && <OverviewSection overview={data} />}
              {section === 'volunteers' && (
                <VolunteerManagementSection
                  volunteers={volunteers}
                  spreadsheetUrl={data?.event?.spreadsheet_url || ''}
                  lastSyncedAt={data?.event?.last_synced_at}
                  onRefresh={refresh}
                />
              )}
              {section === 'controls' && (
                <GameControlsSection
                  status={data?.event?.status || 'setup'}
                  onRefresh={refresh}
                />
              )}
              {section === 'progress' && <LiveProgressSection volunteers={volunteers} />}
              {section === 'health' && <SystemHealthSection />}
              {section === 'export' && <ExportBackupSection />}
            </>
          )}
        </main>
      </div>
    </div>
  );
}
