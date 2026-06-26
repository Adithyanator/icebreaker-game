import { useState } from 'react';
import { Download, FileJson, FileSpreadsheet } from 'lucide-react';
import { api } from '../../../api';

export default function ExportBackup({ password }) {
  const [loading, setLoading] = useState('');

  async function download(type) {
    setLoading(type);
    try {
      let res;
      if (type === 'backup') {
        res = await api.downloadBackup(password);
      } else {
        res = await api.downloadExport(type, password);
      }
      const blob = await res.blob();
      const disposition = res.headers.get('Content-Disposition');
      const filename = disposition?.match(/filename="(.+)"/)?.[1] || `export.${type}`;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      alert('Export failed: ' + err.message);
    } finally {
      setLoading('');
    }
  }

  const buttons = [
    { id: 'json', label: 'Export Results (JSON)', icon: FileJson },
    { id: 'csv', label: 'Export Results (CSV)', icon: FileSpreadsheet },
    { id: 'backup', label: 'Download Full Backup', icon: Download },
  ];

  return (
    <div>
      <h2 className="mb-4 text-2xl font-bold">Export / Backup</h2>

      <div className="space-y-3">
        {buttons.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => download(id)}
            disabled={loading === id}
            className="card flex w-full items-center gap-3 text-left transition hover:shadow-md"
          >
            <Icon className="h-6 w-6 text-brand-blue" />
            <div>
              <p className="font-semibold">{label}</p>
              <p className="text-sm text-gray-500">
                {loading === id ? 'Downloading...' : 'Click to download'}
              </p>
            </div>
          </button>
        ))}
      </div>

      <div className="card mt-6 text-sm text-gray-600">
        <p className="font-medium text-gray-800">Export includes:</p>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          <li>Volunteer name, centre, and code</li>
          <li>Progress and completed cells</li>
          <li>Assigned team color and status</li>
        </ul>
      </div>
    </div>
  );
}
