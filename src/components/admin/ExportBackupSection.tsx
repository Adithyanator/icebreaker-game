'use client';

import { Download, FileSpreadsheet, FileJson, Database } from 'lucide-react';

export default function ExportBackupSection() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-900">Export & Backup</h2>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {/* CSV Export */}
        <div className="card border border-gray-100 space-y-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-green-50 text-green-600">
            <FileSpreadsheet className="h-6 w-6" />
          </div>
          <div>
            <h3 className="font-bold text-sm text-gray-900">CSV Export</h3>
            <p className="text-xs text-gray-500 mt-1">
              Download volunteer completion rankings and assigned team colors as CSV.
            </p>
          </div>
          <a
            href="/api/export/csv"
            download
            className="btn-primary py-2.5 text-xs flex items-center justify-center gap-1.5 bg-green-600 hover:bg-green-700 w-full"
          >
            <Download className="h-4 w-4" />
            Download CSV
          </a>
        </div>

        {/* JSON Export */}
        <div className="card border border-gray-100 space-y-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
            <FileJson className="h-6 w-6" />
          </div>
          <div>
            <h3 className="font-bold text-sm text-gray-900">JSON Export</h3>
            <p className="text-xs text-gray-500 mt-1">
              Export event results and statistics as a structured JSON object.
            </p>
          </div>
          <a
            href="/api/export/json"
            download
            className="btn-primary py-2.5 text-xs flex items-center justify-center gap-1.5 bg-brand-blue hover:bg-blue-700 w-full"
          >
            <Download className="h-4 w-4" />
            Download JSON
          </a>
        </div>

        {/* Full Database Backup */}
        <div className="card border border-gray-100 space-y-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-purple-50 text-purple-600">
            <Database className="h-6 w-6" />
          </div>
          <div>
            <h3 className="font-bold text-sm text-gray-900">Database Backup</h3>
            <p className="text-xs text-gray-500 mt-1">
              Download a complete snapshot of all volunteers, boards, and cell entries.
            </p>
          </div>
          <a
            href="/api/backup"
            download
            className="btn-primary py-2.5 text-xs flex items-center justify-center gap-1.5 bg-purple-600 hover:bg-purple-700 w-full"
          >
            <Download className="h-4 w-4" />
            Download Backup
          </a>
        </div>
      </div>
    </div>
  );
}
