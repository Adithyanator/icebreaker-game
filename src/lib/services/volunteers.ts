import { createAdminClient } from '../supabase/admin';
import { CENTRES, SEED_VOLUNTEERS, TEAM_COLORS, EVENT_STATES } from '../constants';
import type { EventState, Volunteer, VolunteerPublic } from '@/types/database';

function getSupabase() {
  return createAdminClient() as any;
}

// ----------------------------------------------------
// Event State
// ----------------------------------------------------
export async function getEventState(): Promise<EventState> {
  const supabase = getSupabase();
  const { data } = await supabase.from('event_state').select('*').eq('id', 1).single();

  if (data) return data as EventState;

  // Fallback default state if row doesn't exist
  const defaultState: EventState = {
    id: 1,
    status: 'setup',
    timer_enabled: false,
    timer_seconds: 0,
    spreadsheet_url: '',
    updated_at: new Date().toISOString(),
  };

  await supabase.from('event_state').insert(defaultState as any);
  return defaultState;
}

export async function updateEventState(fields: Partial<EventState>): Promise<EventState> {
  const supabase = getSupabase();
  const updates = { ...fields, updated_at: new Date().toISOString() };

  const { data, error } = await supabase
    .from('event_state')
    .update(updates as any)
    .eq('id', 1)
    .select()
    .single();

  if (error || !data) {
    // Attempt upsert
    const { data: upserted } = await supabase
      .from('event_state')
      .upsert({ id: 1, ...updates } as any)
      .select()
      .single();
    return (upserted || updates) as EventState;
  }

  return data as EventState;
}

// ----------------------------------------------------
// Seed Data Initializer
// ----------------------------------------------------
export async function ensureSeedVolunteers(): Promise<void> {
  const supabase = getSupabase();
  const { count } = await supabase.from('volunteers').select('*', { count: 'exact', head: true });

  if (count === 0) {
    const seedRecords = SEED_VOLUNTEERS.map((v) => ({
      name: v.name,
      centre: v.centre,
      code: v.code,
      is_seed: true,
      joined: false,
      is_active: true,
    }));
    await supabase.from('volunteers').insert(seedRecords as any);
  }
}

// ----------------------------------------------------
// Volunteer Queries & Actions
// ----------------------------------------------------
export async function getAllVolunteers(): Promise<Volunteer[]> {
  await ensureSeedVolunteers();
  const supabase = getSupabase();
  const { data } = await supabase.from('volunteers').select('*').order('id', { ascending: true });
  return (data || []) as Volunteer[];
}

export async function getVolunteerById(id: number): Promise<Volunteer | null> {
  const supabase = getSupabase();
  const { data } = await supabase.from('volunteers').select('*').eq('id', id).single();
  return (data as unknown as Volunteer) || null;
}

export async function findVolunteersByNameCentre(name: string, centre: string): Promise<Volunteer[]> {
  await ensureSeedVolunteers();
  const supabase = getSupabase();
  const n = name.trim().toLowerCase();
  const c = (centre || '').trim().toLowerCase();

  const { data } = await supabase.from('volunteers').select('*').eq('is_active', true);
  if (!data) return [];

  return (data as Volunteer[]).filter((v) => {
    const vName = v.name.trim().toLowerCase();
    const vCentre = (v.centre || '').trim().toLowerCase();
    const nameMatches = vName === n;

    const centreMatches =
      !c ||
      vCentre === c ||
      vCentre.startsWith(c) ||
      c.startsWith(vCentre) ||
      vCentre.slice(0, 2) === c.slice(0, 2);

    return nameMatches && centreMatches;
  });
}

export async function addVolunteer(name: string, centre: string, code: string): Promise<Volunteer> {
  const supabase = getSupabase();
  const record = {
    name: name.trim(),
    centre,
    code,
    is_seed: false,
    joined: false,
    is_active: true,
  };

  const { data, error } = await supabase
    .from('volunteers')
    .insert(record as any)
    .select()
    .single();

  if (error || !data) {
    throw new Error(error?.message || 'Failed to add volunteer');
  }

  return data as Volunteer;
}

export async function updateVolunteer(id: number, updates: Partial<Volunteer>): Promise<Volunteer | null> {
  const supabase = getSupabase();
  const { data } = await supabase
    .from('volunteers')
    .update({ ...updates, updated_at: new Date().toISOString() } as any)
    .eq('id', id)
    .select()
    .single();

  return (data as unknown as Volunteer) || null;
}

export async function deleteVolunteer(id: number): Promise<void> {
  const supabase = getSupabase();
  await supabase.from('cell_entries').delete().or(`volunteer_id.eq.${id},partner_id.eq.${id}`);
  await supabase.from('game_boards').delete().eq('volunteer_id', id);
  await supabase.from('volunteers').delete().eq('id', id);
}

export async function setVolunteerJoined(id: number, joined = true): Promise<Volunteer | null> {
  return updateVolunteer(id, { joined });
}

export async function regenerateCode(id: number): Promise<{ volunteer: Volunteer | null; newCode: string }> {
  const allVols = await getAllVolunteers();
  const usedCodes = new Set(allVols.map((v) => v.code));

  let newCode = '';
  do {
    newCode = String(Math.floor(100 + Math.random() * 900));
  } while (usedCodes.has(newCode));

  const updated = await updateVolunteer(id, { code: newCode });
  return { volunteer: updated, newCode };
}

export async function resetVolunteerProgress(id: number): Promise<Volunteer | null> {
  const supabase = getSupabase();
  await supabase.from('cell_entries').delete().eq('volunteer_id', id);
  return updateVolunteer(id, { completed_at: null, completion_position: null });
}

export async function resetAllProgress(): Promise<void> {
  const supabase = getSupabase();
  await supabase.from('cell_entries').delete().neq('id', 0);
  await supabase.from('volunteers').update({
    joined: false,
    assigned_color: null,
    completed_at: null,
    completion_position: null,
  } as any).neq('id', 0);
}

export async function splitTeams(): Promise<{ volunteerId: number; color: string }[]> {
  const volunteers = await getAllVolunteers();
  const participants = volunteers.filter((v) => v.is_active);
  if (participants.length === 0) return [];

  // Fisher-Yates shuffle participants for fair team distribution
  const shuffled = [...participants];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  const assignments: { volunteerId: number; color: string }[] = [];

  for (let i = 0; i < shuffled.length; i++) {
    const color = TEAM_COLORS[i % TEAM_COLORS.length];
    await updateVolunteer(shuffled[i].id, { assigned_color: color });
    assignments.push({ volunteerId: shuffled[i].id, color });
  }

  return assignments;
}

export async function getVolunteerPublic(id: number): Promise<VolunteerPublic | null> {
  const v = await getVolunteerById(id);
  if (!v) return null;

  const supabase = getSupabase();
  const { data: boardData } = await supabase
    .from('game_boards')
    .select('cells')
    .eq('volunteer_id', id)
    .single();

  const { data: entriesData } = await supabase
    .from('cell_entries')
    .select('*')
    .eq('volunteer_id', id)
    .order('cell_index', { ascending: true });

  const boardCells = (boardData?.cells as string[]) || null;
  const entries = (entriesData || []) as any[];

  let status: 'waiting' | 'playing' | 'completed' = 'waiting';
  if (v.completed_at) {
    status = 'completed';
  } else if (boardCells && boardCells.length > 0) {
    status = 'playing';
  }

  return {
    id: v.id,
    name: v.name,
    centre: v.centre,
    code: v.code,
    joined: v.joined,
    progress: entries.length,
    status,
    board: boardCells,
    entries,
    assignedColor: v.assigned_color || (v as any).assignedColor || null,
    completionPosition: v.completion_position,
  };
}

export async function getJoinedCount(): Promise<number> {
  const supabase = getSupabase();
  const { count } = await supabase
    .from('volunteers')
    .select('*', { count: 'exact', head: true })
    .eq('joined', true);
  return count || 0;
}

export async function getCentres(): Promise<string[]> {
  const volunteers = await getAllVolunteers();
  const dbCentres = volunteers.map((v) => v.centre).filter(Boolean);
  const allCentres = new Set([...CENTRES, ...dbCentres]);
  return Array.from(allCentres).sort();
}
