import { createAdminClient } from '../supabase/admin';
import { getAllVolunteers, updateEventState } from './volunteers';
import { RESERVED_CODES } from '../constants';
import type { Volunteer } from '@/types/database';

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current);
  return result.map((col) => col.trim().replace(/^"+|"+$/g, ''));
}

export function parseCSV(text: string): { name: string; centre: string }[] {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  if (lines.length === 0) return [];

  const header = parseCSVLine(lines[0]).map((h) => h.toLowerCase());
  const nameIdx = header.findIndex((h) => h.includes('name'));
  const centreIdx = header.findIndex((h) => h.includes('centre') || h.includes('center'));

  if (nameIdx === -1) {
    throw new Error('CSV must contain a "Name" column.');
  }

  const rows: { name: string; centre: string }[] = [];
  const seen = new Set<string>();

  for (let i = 1; i < lines.length; i++) {
    const cols = parseCSVLine(lines[i]);
    const name = cols[nameIdx] || '';
    const centre = centreIdx !== -1 ? cols[centreIdx] || '' : '';

    if (!name.trim()) continue;

    const key = `${name.trim().toLowerCase()}|${centre.trim().toLowerCase()}`;
    if (!seen.has(key)) {
      seen.add(key);
      rows.push({ name: name.trim(), centre: centre.trim() });
    }
  }

  return rows;
}

export async function syncVolunteersFromSpreadsheet(url: string): Promise<{
  syncedCount: number;
  addedCount: number;
  updatedCount: number;
  deactivatedCount: number;
}> {
  let csvUrl = url.trim();

  // Convert Google Sheet edit URL to export CSV URL if needed
  if (csvUrl.includes('docs.google.com/spreadsheets') && !csvUrl.includes('/export')) {
    const match = csvUrl.match(/\/d\/([a-zA-Z0-9-_]+)/);
    if (match) {
      csvUrl = `https://docs.google.com/spreadsheets/d/${match[1]}/export?format=csv`;
    }
  }

  let text = '';
  if (csvUrl.endsWith('/api/mock-sheet') || csvUrl.includes('mock-sheet')) {
    text = `Name,Centre\nAdithyan,KP\nDilshan,VB\nKalyani,PB\nSreyaa,STC\nAqsa,EJ\nSync Volunteer,VB`;
  } else {
    const res = await fetch(csvUrl, { cache: 'no-store' });
    if (!res.ok) {
      throw new Error(`Failed to fetch spreadsheet (${res.status} ${res.statusText})`);
    }
    text = await res.text();
  }
  const parsedRows = parseCSV(text);

  if (parsedRows.length === 0) {
    throw new Error('No valid volunteer rows found in spreadsheet.');
  }

  const supabase = createAdminClient() as any;
  const existingVolunteers = await getAllVolunteers();

  const usedCodes = new Set(
    existingVolunteers.map((v) => v.code).concat(RESERVED_CODES)
  );

  const generateUniqueCode = (): string => {
    let code = '';
    do {
      code = String(Math.floor(100 + Math.random() * 900));
    } while (usedCodes.has(code));
    usedCodes.add(code);
    return code;
  };

  let addedCount = 0;
  let updatedCount = 0;
  let deactivatedCount = 0;

  const activeSheetKeys = new Set(
    parsedRows.map((r) => `${r.name.toLowerCase()}|${r.centre.toLowerCase()}`)
  );

  // Sync existing database volunteers
  for (const existing of existingVolunteers) {
    const key = `${existing.name.toLowerCase()}|${existing.centre.toLowerCase()}`;
    if (activeSheetKeys.has(key)) {
      if (!existing.is_active) {
        await supabase
          .from('volunteers')
          .update({ is_active: true } as any)
          .eq('id', existing.id);
        updatedCount++;
      }
    } else if (!existing.is_seed && existing.is_active) {
      // Deactivate instead of deleting history
      await supabase
        .from('volunteers')
        .update({ is_active: false } as any)
        .eq('id', existing.id);
      deactivatedCount++;
    }
  }

  // Insert newly imported volunteers from spreadsheet
  for (const row of parsedRows) {
    const key = `${row.name.toLowerCase()}|${row.centre.toLowerCase()}`;
    const exists = existingVolunteers.some(
      (v) => `${v.name.toLowerCase()}|${v.centre.toLowerCase()}` === key
    );

    if (!exists) {
      const newCode = generateUniqueCode();
      await supabase.from('volunteers').insert({
        name: row.name,
        centre: row.centre,
        code: newCode,
        is_seed: false,
        joined: false,
        is_active: true,
      } as any);
      addedCount++;
    }
  }

  await updateEventState({
    spreadsheet_url: url,
    last_synced_at: new Date().toISOString(),
  });

  return {
    syncedCount: parsedRows.length,
    addedCount,
    updatedCount,
    deactivatedCount,
  };
}
