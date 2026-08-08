'use client';

import { useState } from 'react';
import { RefreshCw, Link as LinkIcon, UserPlus, Search, Edit2, Trash2, Key, Grid, RotateCcw } from 'lucide-react';
import {
  updateVolunteerAction,
  deleteVolunteerAction,
  regenerateCodeAction,
  generateBoardAction,
  resetVolunteerProgressAction,
} from '@/actions/admin-actions';
import type { Volunteer } from '@/types/database';

interface VolunteerManagementSectionProps {
  volunteers: Volunteer[];
  spreadsheetUrl: string;
  lastSyncedAt?: string | null;
  onRefresh: () => void;
}

export default function VolunteerManagementSection({
  volunteers,
  spreadsheetUrl: initialUrl,
  lastSyncedAt,
  onRefresh,
}: VolunteerManagementSectionProps) {
  const [spreadsheetUrl, setSpreadsheetUrl] = useState(initialUrl || '');
  const [syncing, setSyncing] = useState(false);
  const [syncMsg, setSyncMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [search, setSearch] = useState('');
  const [addName, setAddName] = useState('');
  const [addCentre, setAddCentre] = useState('');
  const [adding, setAdding] = useState(false);

  const [editId, setEditId] = useState<number | null>(null);
  const [editName, setEditName] = useState('');
  const [editCentre, setEditCentre] = useState('');

  async function handleSync(e: React.FormEvent) {
    e.preventDefault();
    if (!spreadsheetUrl.trim()) return;

    setSyncing(true);
    setSyncMsg(null);

    try {
      const res = await fetch('/api/spreadsheet/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ spreadsheetUrl }),
      });
      const data = await res.json();
      if (!res.ok) {
        setSyncMsg({ type: 'error', text: data.error || 'Sync failed' });
      } else {
        setSyncMsg({
          type: 'success',
          text: `Synced ${data.syncedCount} rows (${data.addedCount} added, ${data.updatedCount} updated, ${data.deactivatedCount} deactivated)`,
        });
        onRefresh();
      }
    } catch (err: any) {
      setSyncMsg({ type: 'error', text: err.message || 'Error syncing spreadsheet' });
    } finally {
      setSyncing(false);
    }
  }

  async function handleAddVolunteer(e: React.FormEvent) {
    e.preventDefault();
    if (!addName.trim() || !addCentre.trim()) return;

    setAdding(true);
    try {
      const res = await fetch('/api/admin/volunteers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: addName, centre: addCentre }),
      });
      if (res.ok) {
        setAddName('');
        setAddCentre('');
        onRefresh();
      }
    } catch {
      // Ignore
    } finally {
      setAdding(false);
    }
  }

  async function handleUpdate(id: number) {
    await updateVolunteerAction(id, { name: editName, centre: editCentre });
    setEditId(null);
    onRefresh();
  }

  async function handleDelete(id: number) {
    if (typeof window !== 'undefined' && window.confirm && !window.confirm('Delete this volunteer?')) return;
    try {
      await Promise.all([
        deleteVolunteerAction(id),
        fetch(`/api/admin/volunteers?id=${id}`, { method: 'DELETE' }).catch(() => {}),
      ]);
    } catch {
      // Ignore
    } finally {
      onRefresh();
    }
  }

  const filtered = volunteers.filter(
    (v) =>
      v.name.toLowerCase().includes(search.toLowerCase()) ||
      v.centre.toLowerCase().includes(search.toLowerCase()) ||
      v.code.includes(search)
  );

  return (
    <div className="space-y-6">
      {/* 1. Google Spreadsheet Sync Card */}
      <div className="card border border-gray-100">
        <h3 className="text-lg font-bold text-gray-900 mb-1">Google Spreadsheet Sync</h3>
        <p className="text-xs text-gray-500 mb-4">
          Synchronize the official volunteer list directly from a Google Sheet CSV export.
        </p>

        {syncMsg && (
          <div
            className={`mb-4 rounded-xl p-3 text-xs font-semibold ${
              syncMsg.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'
            }`}
          >
            {syncMsg.text}
          </div>
        )}

        <form onSubmit={handleSync} className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <LinkIcon className="absolute left-3.5 top-3.5 h-4 w-4 text-gray-400" />
            <input
              type="text"
              required
              value={spreadsheetUrl}
              onChange={(e) => setSpreadsheetUrl(e.target.value)}
              placeholder="Paste Google Sheet URL or CSV export link"
              className="input-field pl-10 text-sm py-2.5"
            />
          </div>
          <button
            type="submit"
            disabled={syncing}
            className="btn-primary sm:w-auto px-6 py-2.5 text-sm flex items-center justify-center gap-2 bg-brand-blue hover:bg-blue-700"
          >
            <RefreshCw className={`h-4 w-4 ${syncing ? 'animate-spin' : ''}`} />
            {syncing ? 'Syncing...' : 'Sync Registry'}
          </button>
        </form>

        {lastSyncedAt && (
          <p className="mt-2 text-xs text-gray-400">
            Last Synced: {new Date(lastSyncedAt).toLocaleString()}
          </p>
        )}
      </div>

      {/* 2. Add Volunteer Card */}
      <div className="card border border-gray-100">
        <h3 className="text-lg font-bold text-gray-900 mb-3">Add Manual Volunteer</h3>
        <form onSubmit={handleAddVolunteer} className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <input
            type="text"
            required
            value={addName}
            onChange={(e) => setAddName(e.target.value)}
            placeholder="Volunteer Full Name"
            className="input-field text-sm py-2.5"
          />
          <select
            required
            value={addCentre}
            onChange={(e) => setAddCentre(e.target.value)}
            className="input-field text-sm py-2.5 bg-white"
          >
            <option value="">Select Centre</option>
            {['KP English', 'KP Tution', 'PB', 'VB', 'EJ'].map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <button
            type="submit"
            disabled={adding}
            className="btn-primary py-2.5 text-sm flex items-center justify-center gap-2"
          >
            <UserPlus className="h-4 w-4" />
            {adding ? 'Adding...' : 'Add Volunteer'}
          </button>
        </form>
      </div>

      {/* 3. Volunteer Table & Search */}
      <div className="card border border-gray-100 space-y-4">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <h3 className="text-lg font-bold text-gray-900">
            Volunteer Registry ({volunteers.length})
          </h3>
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3.5 top-3.5 h-4 w-4 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name, centre, code..."
              className="input-field pl-10 text-sm py-2"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-gray-600">
            <thead className="bg-gray-50 text-gray-700 uppercase tracking-wider text-[10px] font-bold">
              <tr>
                <th className="p-3">ID</th>
                <th className="p-3">Name</th>
                <th className="p-3">Centre</th>
                <th className="p-3">Code</th>
                <th className="p-3">Status</th>
                <th className="p-3">Team</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map((v) => (
                <tr key={v.id} className="hover:bg-gray-50/50">
                  <td className="p-3 font-mono">{v.id}</td>
                  <td className="p-3 font-semibold text-gray-900">
                    {editId === v.id ? (
                      <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="input-field py-1 px-2 text-xs"
                      />
                    ) : (
                      v.name
                    )}
                  </td>
                  <td className="p-3">
                    {editId === v.id ? (
                      <select
                        value={editCentre}
                        onChange={(e) => setEditCentre(e.target.value)}
                        className="input-field py-1 px-2 text-xs bg-white"
                      >
                        {['KP English', 'KP Tution', 'PB', 'VB', 'EJ'].map((c) => (
                          <option key={c} value={c}>
                            {c}
                          </option>
                        ))}
                      </select>
                    ) : (
                      v.centre
                    )}
                  </td>
                  <td className="p-3 font-mono font-bold text-gray-800">{v.code}</td>
                  <td className="p-3">
                    {v.completed_at ? (
                      <span className="inline-block rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-bold text-green-700">
                        Completed
                      </span>
                    ) : v.joined ? (
                      <span className="inline-block rounded-full bg-orange-100 px-2 py-0.5 text-[10px] font-bold text-orange-700">
                        Joined
                      </span>
                    ) : (
                      <span className="inline-block rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-bold text-gray-500">
                        Not Joined
                      </span>
                    )}
                  </td>
                  <td className="p-3 font-medium">{v.assigned_color || '—'}</td>
                  <td className="p-3 text-right">
                    {editId === v.id ? (
                      <button
                        onClick={() => handleUpdate(v.id)}
                        className="rounded bg-green-600 px-2 py-1 text-white font-bold"
                      >
                        Save
                      </button>
                    ) : (
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => {
                            setEditId(v.id);
                            setEditName(v.name);
                            setEditCentre(v.centre);
                          }}
                          title="Edit"
                          className="p-1 text-gray-400 hover:text-gray-600"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => regenerateCodeAction(v.id).then(onRefresh)}
                          title="New Code"
                          className="p-1 text-gray-400 hover:text-indigo-600"
                        >
                          <Key className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => generateBoardAction(v.id).then(onRefresh)}
                          title="Generate Board"
                          className="p-1 text-gray-400 hover:text-blue-600"
                        >
                          <Grid className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => resetVolunteerProgressAction(v.id).then(onRefresh)}
                          title="Reset Progress"
                          className="p-1 text-gray-400 hover:text-orange-600"
                        >
                          <RotateCcw className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(v.id)}
                          title="Delete"
                          className="p-1 text-gray-400 hover:text-red-600"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
