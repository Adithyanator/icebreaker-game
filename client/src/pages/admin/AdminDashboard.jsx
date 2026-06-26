import { useCallback, useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
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
import { api } from '../../api';
import { ADMIN_PASSWORD_KEY } from '../../constants';
import { useSocket, joinAdminRoom } from '../../hooks/useSocket';
import Overview from './sections/Overview';
import VolunteerManagement from './sections/VolunteerManagement';
import GameControls from './sections/GameControls';
import LiveProgress from './sections/LiveProgress';
import SystemHealth from './sections/SystemHealth';
import ExportBackup from './sections/ExportBackup';

const SECTIONS = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'volunteers', label: 'Volunteers', icon: Users },
  { id: 'controls', label: 'Game Controls', icon: Gamepad2 },
  { id: 'progress', label: 'Live Progress', icon: Activity },
  { id: 'health', label: 'System Health', icon: HeartPulse },
  { id: 'export', label: 'Export / Backup', icon: Download },
];

export default function AdminDashboard() {
  const password = sessionStorage.getItem(ADMIN_PASSWORD_KEY);
  const [section, setSection] = useState('overview');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);

  const refresh = useCallback(async () => {
    if (!password) return;
    try {
      const [volData, overview] = await Promise.all([
        api.adminRequest('/admin/volunteers', {}, password),
        api.adminRequest('/admin/overview', {}, password),
      ]);
      setData({ ...volData, overview });
    } catch {
      sessionStorage.removeItem(ADMIN_PASSWORD_KEY);
    } finally {
      setLoading(false);
    }
  }, [password]);

  useEffect(() => {
    joinAdminRoom();
    refresh();
  }, [refresh]);

  useSocket('admin:update', refresh);
  useSocket('progress:update', refresh);
  useSocket('joined:update', refresh);
  useSocket('event:update', refresh);
  useSocket('teams:revealed', refresh);

  if (!password) return <Navigate to="/admin" replace />;

  function logout() {
    sessionStorage.removeItem(ADMIN_PASSWORD_KEY);
    window.location.href = '/admin';
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
          onClick={logout}
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
                onClick={() => { setSection(id); setMenuOpen(false); }}
                className={`mb-1 flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium ${
                  section === id ? 'bg-brand-blue text-white' : 'text-gray-600'
                }`}
              >
                <Icon className="h-5 w-5" /> {label}
              </button>
            ))}
            <button onClick={logout} className="flex w-full items-center gap-2 px-4 py-3 text-sm text-red-600">
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
              {section === 'overview' && <Overview data={data} />}
              {section === 'volunteers' && (
                <VolunteerManagement data={data} password={password} onRefresh={refresh} isLocked={isLocked} />
              )}
              {section === 'controls' && (
                <GameControls data={data} password={password} onRefresh={refresh} />
              )}
              {section === 'progress' && <LiveProgress volunteers={data?.volunteers || []} />}
              {section === 'health' && <SystemHealth password={password} />}
              {section === 'export' && <ExportBackup password={password} />}
            </>
          )}
        </main>
      </div>
    </div>
  );
}
