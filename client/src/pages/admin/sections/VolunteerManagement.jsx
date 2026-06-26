import { useState, useMemo } from 'react';
import { Plus, Search, Pencil, Trash2, RefreshCw, Grid3x3 } from 'lucide-react';
import { api } from '../../../api';
import { CENTRES } from '../../../constants';

export default function VolunteerManagement({ data, password, onRefresh, isLocked }) {
  const [search, setSearch] = useState('');
  const [centreFilter, setCentreFilter] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState({ name: '', centre: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showCustomCentre, setShowCustomCentre] = useState(false);

  const volunteers = useMemo(() => {
    let list = data?.volunteers || [];
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(
        (v) => v.name.toLowerCase().includes(q) || v.code.includes(q)
      );
    }
    if (centreFilter) list = list.filter((v) => v.centre === centreFilter);
    return list;
  }, [data?.volunteers, search, centreFilter]);

  const dynamicCentres = useMemo(() => {
    const list = data?.volunteers || [];
    const set = new Set(list.map((v) => v.centre).filter(Boolean));
    CENTRES.forEach((c) => set.add(c));
    return Array.from(set).sort();
  }, [data?.volunteers]);

  async function handleAdd(e) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await api.adminRequest('/admin/volunteers', {
        method: 'POST',
        body: JSON.stringify(form),
      }, password);
      setShowAdd(false);
      setForm({ name: '', centre: '' });
      setShowCustomCentre(false);
      onRefresh();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleEdit(e) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await api.adminRequest(`/admin/volunteers/${editId}`, {
        method: 'PUT',
        body: JSON.stringify(form),
      }, password);
      setEditId(null);
      setForm({ name: '', centre: '' });
      setShowCustomCentre(false);
      onRefresh();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id) {
    if (!confirm('Delete this volunteer?')) return;
    try {
      await api.adminRequest(`/admin/volunteers/${id}`, { method: 'DELETE' }, password);
      onRefresh();
    } catch (err) {
      alert(err.message);
    }
  }

  async function handleRegenCode(id) {
    if (!confirm('Regenerate code for this volunteer?')) return;
    try {
      await api.adminRequest(`/admin/volunteers/${id}/regenerate-code`, { method: 'POST' }, password);
      onRefresh();
    } catch (err) {
      alert(err.message);
    }
  }

  async function handleGenBoard(id) {
    try {
      await api.adminRequest(`/admin/volunteers/${id}/generate-board`, { method: 'POST' }, password);
      onRefresh();
    } catch (err) {
      alert(err.message);
    }
  }

  async function handleResetProgress(id) {
    if (!confirm('Reset progress for this volunteer?')) return;
    try {
      await api.adminRequest(`/admin/volunteers/${id}/reset-progress`, { method: 'POST' }, password);
      onRefresh();
    } catch (err) {
      alert(err.message);
    }
  }

  function startEdit(v) {
    setEditId(v.id);
    setForm({ name: v.name, centre: v.centre });
    setShowAdd(false);
    setShowCustomCentre(false);
  }

  const statusBadge = {
    not_joined: 'bg-gray-100 text-gray-600',
    waiting: 'bg-blue-100 text-blue-700',
    playing: 'bg-yellow-100 text-yellow-700',
    completed: 'bg-green-100 text-green-700',
  };

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-2xl font-bold">Volunteer Management</h2>
        <button
          onClick={() => { setShowAdd(true); setEditId(null); setForm({ name: '', centre: '' }); setShowCustomCentre(false); }}
          className="flex items-center gap-2 rounded-xl bg-brand-orange px-4 py-2.5 text-sm font-semibold text-white"
        >
          <Plus className="h-4 w-4" /> Add Volunteer
        </button>
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            className="input-field pl-10"
            placeholder="Search by name or code..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select
          className="input-field w-auto"
          value={centreFilter}
          onChange={(e) => setCentreFilter(e.target.value)}
        >
          <option value="">All centres</option>
          {dynamicCentres.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      {(showAdd || editId) && (
        <div className="card mb-4">
          <h3 className="mb-3 font-semibold">{editId ? 'Edit Volunteer' : 'Add Volunteer'}</h3>
          <form onSubmit={editId ? handleEdit : handleAdd} className="flex flex-wrap gap-3">
            <input
              className="input-field flex-1 min-w-[150px]"
              placeholder="Name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
            />
            {!showCustomCentre ? (
              <select
                className="input-field w-auto min-w-[120px]"
                value={form.centre}
                onChange={(e) => {
                  if (e.target.value === '__new__') {
                    setShowCustomCentre(true);
                    setForm({ ...form, centre: '' });
                  } else {
                    setForm({ ...form, centre: e.target.value });
                  }
                }}
                required
              >
                <option value="">Centre</option>
                {dynamicCentres.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
                <option value="__new__" className="text-orange-500 font-semibold">+ Add New...</option>
              </select>
            ) : (
              <div className="flex items-center gap-1.5 border border-gray-200 rounded-xl px-2 bg-gray-50">
                <input
                  className="bg-transparent border-0 outline-none py-2 text-sm w-28 uppercase font-semibold placeholder:normal-case placeholder:font-normal"
                  placeholder="New Centre"
                  value={form.centre}
                  onChange={(e) => setForm({ ...form, centre: e.target.value.toUpperCase().trim() })}
                  required
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => {
                    setShowCustomCentre(false);
                    setForm({ ...form, centre: '' });
                  }}
                  className="text-xs text-brand-blue hover:underline px-1 py-1"
                >
                  Choose
                </button>
              </div>
            )}
            <button type="submit" disabled={loading} className="rounded-xl bg-brand-blue px-5 py-3 text-sm font-semibold text-white">
              {editId ? 'Save' : 'Add'}
            </button>
            <button type="button" onClick={() => { setShowAdd(false); setEditId(null); setShowCustomCentre(false); }} className="rounded-xl border px-5 py-3 text-sm">
              Cancel
            </button>
          </form>
          {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
        </div>
      )}

      <div className="overflow-x-auto rounded-2xl bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="border-b bg-gray-50 text-xs uppercase text-gray-500">
            <tr>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Centre</th>
              <th className="px-4 py-3">Code</th>
              <th className="px-4 py-3">Joined</th>
              <th className="px-4 py-3">Progress</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Color</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {volunteers.map((v) => (
              <tr key={v.id} className="border-b last:border-0">
                <td className="px-4 py-3 font-medium">{v.name}{v.is_seed ? ' *' : ''}</td>
                <td className="px-4 py-3">{v.centre}</td>
                <td className="px-4 py-3 font-mono">{v.code}</td>
                <td className="px-4 py-3">{v.joined ? '✓' : '—'}</td>
                <td className="px-4 py-3">{v.progress}/9</td>
                <td className="px-4 py-3">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusBadge[v.status]}`}>
                    {v.status.replace('_', ' ')}
                  </span>
                </td>
                <td className="px-4 py-3">{v.assigned_color || '—'}</td>
                <td className="px-4 py-3">
                  <div className="flex gap-1">
                        <button onClick={() => startEdit(v)} title="Edit" className="rounded p-1.5 hover:bg-gray-100">
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button onClick={() => handleRegenCode(v.id)} title="Regenerate code" className="rounded p-1.5 hover:bg-gray-100">
                          <RefreshCw className="h-4 w-4" />
                        </button>
                        <button onClick={() => handleGenBoard(v.id)} title="Generate board" className="rounded p-1.5 hover:bg-gray-100">
                          <Grid3x3 className="h-4 w-4" />
                        </button>
                        <button onClick={() => handleDelete(v.id)} title="Delete" className="rounded p-1.5 hover:bg-red-50 text-red-600">
                          <Trash2 className="h-4 w-4" />
                        </button>
                    <button onClick={() => handleResetProgress(v.id)} title="Reset progress" className="rounded p-1.5 hover:bg-gray-100">
                      ↺
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-xs text-gray-400">* = trial seed data</p>
    </div>
  );
}
