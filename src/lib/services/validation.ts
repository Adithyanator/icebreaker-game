import { z } from 'zod';
import { createAdminClient } from '../supabase/admin';
import { getEventState, getVolunteerById, updateVolunteer } from './volunteers';
import { EVENT_STATES } from '../constants';
import type { CellEntry } from '@/types/database';

export const CellEntrySchema = z.object({
  cellIndex: z.number().int().min(0).max(24),
  name: z.string().min(1, 'Name is required'),
  centre: z.string().min(1, 'Centre is required'),
  code: z.string().min(1, 'Verification code is required'),
});

export const BINGO_LINES = [
  // Rows
  [0, 1, 2, 3, 4],
  [5, 6, 7, 8, 9],
  [10, 11, 12, 13, 14],
  [15, 16, 17, 18, 19],
  [20, 21, 22, 23, 24],
  // Columns
  [0, 5, 10, 15, 20],
  [1, 6, 11, 16, 21],
  [2, 7, 12, 17, 22],
  [3, 8, 13, 18, 23],
  [4, 9, 14, 19, 24],
  // Diagonals
  [0, 6, 12, 18, 24],
  [4, 8, 12, 16, 20],
];

export function countBingoLines(completedIndices: number[]): number {
  const completedSet = new Set(completedIndices);
  let count = 0;
  for (const line of BINGO_LINES) {
    if (line.every((idx) => completedSet.has(idx))) {
      count++;
    }
  }
  return count;
}

export function checkBingo(completedIndices: number[]): boolean {
  // Game ONLY completes when at least 5 distinct lines (rows/columns/diagonals) are completed!
  return countBingoLines(completedIndices) >= 5;
}

export async function validateCellEntry(
  playerId: number,
  cellIndex: number,
  data: { name: string; centre: string; code: string }
): Promise<{ ok: boolean; message?: string; partner?: any }> {
  const trimmedName = (data.name || '').trim();
  const trimmedCode = (data.code || '').trim();
  const centre = (data.centre || '').trim();

  if (!trimmedName || !centre || !trimmedCode) {
    return { ok: false, message: 'Please fill all fields.' };
  }

  const player = await getVolunteerById(playerId);
  if (!player) return { ok: false, message: 'Player not found.' };

  const supabase = createAdminClient() as any;

  // Get board
  const { data: boardRecord } = await supabase
    .from('game_boards')
    .select('cells')
    .eq('volunteer_id', playerId)
    .single();

  const board = (boardRecord?.cells as string[]) || null;
  if (!board || cellIndex < 0 || cellIndex >= 25) {
    return { ok: false, message: 'Invalid cell.' };
  }

  const cellLetter = board[cellIndex]?.toUpperCase();
  const nameFirstLetter = trimmedName[0]?.toUpperCase();

  if (nameFirstLetter !== cellLetter) {
    return { ok: false, message: `The name must start with the letter ${cellLetter}.` };
  }

  // Find partner volunteer in database
  const { data: matches } = await supabase
    .from('volunteers')
    .select('*')
    .eq('is_active', true);

  const partner = (matches || []).find(
    (v: any) =>
      v.name.trim().toLowerCase() === trimmedName.toLowerCase() &&
      v.centre.trim().toLowerCase() === centre.toLowerCase()
  );

  if (!partner) {
    return { ok: false, message: 'No matching volunteer found with that name and centre.' };
  }

  if (partner.code.trim() !== trimmedCode) {
    return { ok: false, message: 'Incorrect verification code for this volunteer.' };
  }

  if (partner.id === playerId) {
    return { ok: false, message: 'You cannot enter yourself.' };
  }

  // Check duplicate partner usage on this board
  const { data: existingEntries } = await supabase
    .from('cell_entries')
    .select('*')
    .eq('volunteer_id', playerId);

  const entries = (existingEntries || []) as CellEntry[];
  if (entries.some((e) => e.partner_id === partner.id)) {
    return { ok: false, message: 'You have already matched with this volunteer on your board.' };
  }

  if (entries.some((e) => e.cell_index === cellIndex)) {
    return { ok: false, message: 'This cell is already completed.' };
  }

  return { ok: true, partner };
}

export async function saveCellEntry(
  playerId: number,
  cellIndex: number,
  partnerId: number
): Promise<{ ok: boolean; entry?: CellEntry; isBingo?: boolean; completionPosition?: number }> {
  const supabase = createAdminClient() as any;

  const { data: entry, error } = await supabase
    .from('cell_entries')
    .insert({
      volunteer_id: playerId,
      cell_index: cellIndex,
      partner_id: partnerId,
    } as any)
    .select()
    .single();

  if (error || !entry) {
    return { ok: false };
  }

  // Check if BINGO achieved
  const { data: allEntries } = await supabase
    .from('cell_entries')
    .select('cell_index')
    .eq('volunteer_id', playerId);

  const completedIndices = (allEntries || []).map((e: any) => e.cell_index);
  const isBingo = checkBingo(completedIndices);

  let completionPosition: number | undefined;

  if (isBingo) {
    const player = await getVolunteerById(playerId);
    if (!player?.completed_at) {
      const { count } = await supabase
        .from('volunteers')
        .select('*', { count: 'exact', head: true })
        .not('completed_at', 'is', null);

      completionPosition = (count || 0) + 1;
      await updateVolunteer(playerId, {
        completed_at: new Date().toISOString(),
        completion_position: completionPosition,
      });
    }
  }

  return {
    ok: true,
    entry: entry as CellEntry,
    isBingo,
    completionPosition,
  };
}
