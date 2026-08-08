import { createAdminClient } from '../supabase/admin';
import { getAllVolunteers, getVolunteerById } from './volunteers';

function shuffle<T>(arr: T[]): T[] {
  const result = [...arr];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export async function generateBoardForVolunteer(volunteerId: number): Promise<string[]> {
  const supabase = createAdminClient() as any;

  // Check if board already exists
  const { data: existing } = await supabase
    .from('game_boards')
    .select('cells')
    .eq('volunteer_id', volunteerId)
    .single();

  if (existing?.cells && Array.isArray(existing.cells) && existing.cells.length === 25) {
    return existing.cells as string[];
  }

  const player = await getVolunteerById(volunteerId);
  if (!player) throw new Error('Volunteer not found');

  const allVolunteers = await getAllVolunteers();
  let otherVolunteers = allVolunteers.filter((v) => v.id !== player.id && v.joined && v.is_active);

  if (otherVolunteers.length === 0) {
    otherVolunteers = allVolunteers.filter((v) => v.id !== player.id && v.is_active);
  }

  const otherLetters = otherVolunteers
    .map((v) => v.name.trim()[0]?.toUpperCase())
    .filter(Boolean);

  if (otherLetters.length === 0) {
    throw new Error('No other volunteers available for board generation. Add more volunteers first.');
  }

  // Calculate frequency per letter
  const freq: Record<string, number> = {};
  otherLetters.forEach((l) => {
    freq[l] = (freq[l] || 0) + 1;
  });

  const uniqueLetters = Object.keys(freq);
  const totalPlayable = 25; // 25 playable cells
  const pool: string[] = [];

  if (uniqueLetters.length > 0) {
    const baseQuota = Math.floor(totalPlayable / uniqueLetters.length);
    const remainder = totalPlayable % uniqueLetters.length;

    uniqueLetters.forEach((letter) => {
      for (let i = 0; i < baseQuota; i++) {
        pool.push(letter);
      }
    });

    if (remainder > 0) {
      const sortedByFreq = [...uniqueLetters].sort((a, b) => freq[b] - freq[a]);
      for (let i = 0; i < remainder; i++) {
        pool.push(sortedByFreq[i % sortedByFreq.length]);
      }
    }
  }

  const shuffledPool = shuffle(pool);
  const cells: (string | null)[] = new Array(25).fill(null);
  const remainingPool = [...shuffledPool];

  const getRowCounts = (rowIndex: number): Record<string, number> => {
    const counts: Record<string, number> = {};
    for (let c = 0; c < 5; c++) {
      const idx = rowIndex * 5 + c;
      if (cells[idx]) {
        counts[cells[idx]!] = (counts[cells[idx]!] || 0) + 1;
      }
    }
    return counts;
  };

  for (let i = 0; i < 25; i++) {
    const rowIndex = Math.floor(i / 5);
    const rowCounts = getRowCounts(rowIndex);

    const topIdx = i >= 5 ? i - 5 : -1;
    const leftIdx = i % 5 !== 0 ? i - 1 : -1;

    const topVal = topIdx >= 0 ? cells[topIdx] : null;
    const leftVal = leftIdx >= 0 ? cells[leftIdx] : null;

    let validCandidates = remainingPool.filter((letter) => {
      const notAdjacent = letter !== topVal && letter !== leftVal;
      const rowCount = rowCounts[letter] || 0;
      const underRowCap = rowCount < (freq[letter] || 1);
      return notAdjacent && underRowCap;
    });

    if (validCandidates.length === 0) {
      validCandidates = remainingPool.filter((letter) => {
        const rowCount = rowCounts[letter] || 0;
        return rowCount < (freq[letter] || 1);
      });
    }

    if (validCandidates.length === 0) {
      validCandidates = remainingPool.filter(
        (letter) => letter !== topVal && letter !== leftVal
      );
    }

    if (validCandidates.length === 0) {
      validCandidates = [...remainingPool];
    }

    const chosenLetter = validCandidates[Math.floor(Math.random() * validCandidates.length)];
    cells[i] = chosenLetter;

    const removeIdx = remainingPool.indexOf(chosenLetter);
    if (removeIdx !== -1) {
      remainingPool.splice(removeIdx, 1);
    }
  }

  const finalCells = cells as string[];

  // Save board in Supabase
  await supabase
    .from('game_boards')
    .upsert(
      {
        volunteer_id: volunteerId,
        cells: finalCells,
        updated_at: new Date().toISOString(),
      } as any,
      { onConflict: 'volunteer_id' }
    );

  return finalCells;
}

export async function generateAllBoards(): Promise<{ volunteerId: number; cells: string[] }[]> {
  const supabase = createAdminClient() as any;
  await supabase.from('game_boards').delete().neq('id', 0);

  const volunteers = await getAllVolunteers();
  const results: { volunteerId: number; cells: string[] }[] = [];

  for (const v of volunteers) {
    if (v.is_active) {
      const cells = await generateBoardForVolunteer(v.id);
      results.push({ volunteerId: v.id, cells });
    }
  }

  return results;
}

export async function clearAllBoards(): Promise<void> {
  const supabase = createAdminClient() as any;
  await supabase.from('game_boards').delete().neq('id', 0);
}
