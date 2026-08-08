import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import type { Database, Volunteer, GameBoard, CellEntry, EventState } from '@/types/database';
import { SEED_VOLUNTEERS, DEFAULT_SPREADSHEET_URL } from '../constants';

// In-Memory Database Store for testing without live Supabase connection
const globalMemory = (globalThis as any).__UI_ICEBREAKER_MEMORY_STORE__ || {
  eventState: {
    id: 1,
    status: 'setup' as const,
    timer_enabled: false,
    timer_seconds: 0,
    spreadsheet_url: DEFAULT_SPREADSHEET_URL,
    updated_at: new Date().toISOString(),
  } as EventState,
  volunteers: SEED_VOLUNTEERS.map((v, i) => ({
    id: i + 1,
    name: v.name,
    centre: v.centre,
    code: v.code,
    joined: false,
    is_active: true,
    is_seed: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  })) as Volunteer[],
  gameBoards: [] as GameBoard[],
  cellEntries: [] as CellEntry[],
};

(globalThis as any).__UI_ICEBREAKER_MEMORY_STORE__ = globalMemory;
const memoryStore = globalMemory;

function createMemoryClient() {
  return {
    from(table: string) {
      let items: any[] = [];
      if (table === 'event_state') items = [memoryStore.eventState];
      if (table === 'volunteers') items = memoryStore.volunteers;
      if (table === 'game_boards') items = memoryStore.gameBoards;
      if (table === 'cell_entries') items = memoryStore.cellEntries;

      const filters: Array<(item: any) => boolean> = [];
      let selectOpts: any = null;

      const builder = {
        select(cols = '*', opts?: any) {
          selectOpts = opts;
          return builder;
        },
        eq(col: string, val: any) {
          filters.push((item) => {
            const v1 = item[col];
            const v2 =
              col === 'volunteer_id'
                ? item['volunteerId']
                : col === 'volunteerId'
                ? item['volunteer_id']
                : undefined;
            return String(v1) === String(val) || (v2 !== undefined && String(v2) === String(val));
          });
          return builder;
        },
        neq(col: string, val: any) {
          filters.push((item) => String(item[col]) !== String(val));
          return builder;
        },
        not(col: string, op: string, val: any) {
          if (op === 'is' && val === null) {
            filters.push((item) => item[col] !== null && item[col] !== undefined);
          }
          return builder;
        },
        or(condition: string) {
          const parts = condition.split(',');
          filters.push((item) => {
            return parts.some((p) => {
              const [c, op, v] = p.split('.');
              if (op === 'eq') return String(item[c]) === String(v);
              return false;
            });
          });
          return builder;
        },
        order(col: string, opts?: any) {
          return builder;
        },
        single() {
          let filtered = items;
          for (const f of filters) {
            filtered = filtered.filter(f);
          }
          return Promise.resolve({ data: filtered[filtered.length - 1] || null, error: null });
        },
        then(resolve: any) {
          let filtered = items;
          for (const f of filters) {
            filtered = filtered.filter(f);
          }
          if (selectOpts?.count === 'exact' && selectOpts?.head) {
            resolve({ data: null, count: filtered.length, error: null });
          } else {
            resolve({ data: filtered, count: filtered.length, error: null });
          }
        },
      };

      return {
        select(cols = '*', opts?: any) {
          return builder.select(cols, opts);
        },
        insert(records: any) {
          const arr = Array.isArray(records) ? records : [records];
          const created: any[] = [];

          arr.forEach((r) => {
            const id = r.id || Math.floor(1000 + Math.random() * 90000);
            const item = { id, created_at: new Date().toISOString(), ...r };
            if (table === 'volunteers') memoryStore.volunteers.push(item);
            if (table === 'game_boards') memoryStore.gameBoards.push(item);
            if (table === 'cell_entries') memoryStore.cellEntries.push(item);
            created.push(item);
          });

          return {
            select() {
              return {
                single() {
                  return Promise.resolve({ data: created[0] || null, error: null });
                },
                then(resolve: any) {
                  resolve({ data: created, error: null });
                },
              };
            },
            then(resolve: any) {
              resolve({ data: created, error: null });
            },
          };
        },
        update(updates: any) {
          let targetCol = '';
          let targetVal: any = null;

          return {
            eq(col: string, val: any) {
              targetCol = col;
              targetVal = val;

              if (table === 'event_state') {
                memoryStore.eventState = { ...memoryStore.eventState, ...updates };
              }
              if (table === 'volunteers') {
                memoryStore.volunteers.forEach((v: any) => {
                  if (String((v as any)[col]) === String(val)) Object.assign(v, updates);
                });
              }
              return this;
            },
            neq(col: string, val: any) {
              if (table === 'volunteers') {
                memoryStore.volunteers.forEach((v: any) => {
                  if (String((v as any)[col]) !== String(val)) Object.assign(v, updates);
                });
              }
              return this;
            },
            select() {
              return {
                single() {
                  let found = null;
                  if (table === 'event_state') found = memoryStore.eventState;
                  if (table === 'volunteers') {
                    found = memoryStore.volunteers.find(
                      (v: any) => String((v as any)[targetCol]) === String(targetVal)
                    );
                  }
                  return Promise.resolve({ data: found || null, error: null });
                },
                then(resolve: any) {
                  let found: any[] = [];
                  if (table === 'event_state') found = [memoryStore.eventState];
                  if (table === 'volunteers') {
                    found = memoryStore.volunteers.filter(
                      (v: any) => String((v as any)[targetCol]) === String(targetVal)
                    );
                  }
                  resolve({ data: found, error: null });
                },
              };
            },
            then(resolve: any) {
              resolve({ data: null, error: null });
            },
          };
        },
        upsert(data: any) {
          if (table === 'event_state') {
            memoryStore.eventState = { ...memoryStore.eventState, ...data };
          }
          if (table === 'game_boards') {
            const existingIdx = memoryStore.gameBoards.findIndex(
              (b: any) => String(b.volunteer_id) === String(data.volunteer_id)
            );
            if (existingIdx !== -1) {
              memoryStore.gameBoards[existingIdx] = {
                ...memoryStore.gameBoards[existingIdx],
                ...data,
              };
            } else {
              memoryStore.gameBoards.push({ id: Date.now(), ...data });
            }
          }
          return {
            select() {
              return {
                single() {
                  return Promise.resolve({ data, error: null });
                },
              };
            },
            then(resolve: any) {
              resolve({ data: null, error: null });
            },
          };
        },
        delete() {
          return {
            eq(col: string, val: any) {
              if (table === 'cell_entries') {
                memoryStore.cellEntries = memoryStore.cellEntries.filter(
                  (e: any) => String((e as any)[col]) !== String(val)
                );
              }
              if (table === 'game_boards') {
                memoryStore.gameBoards = memoryStore.gameBoards.filter(
                  (b: any) => String((b as any)[col]) !== String(val)
                );
              }
              if (table === 'volunteers') {
                memoryStore.volunteers = memoryStore.volunteers.filter(
                  (v: any) => String((v as any)[col]) !== String(val)
                );
              }
              return this;
            },
            neq(col: string, val: any) {
              if (table === 'cell_entries') memoryStore.cellEntries = [];
              if (table === 'game_boards') memoryStore.gameBoards = [];
              return this;
            },
            or(condition: string) {
              if (table === 'cell_entries') {
                const parts = condition.split(',');
                memoryStore.cellEntries = memoryStore.cellEntries.filter((item: any) => {
                  return !parts.some((p) => {
                    const [c, op, v] = p.split('.');
                    if (op === 'eq') return String((item as any)[c]) === String(v);
                    return false;
                  });
                });
              }
              return this;
            },
            then(resolve: any) {
              resolve({ data: null, error: null });
            },
          };
        },
      };
    },
  };
}

export function createAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
  const supabaseKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    'placeholder-key';

  if (supabaseUrl.includes('placeholder')) {
    return createMemoryClient() as any;
  }

  return createSupabaseClient<Database>(supabaseUrl, supabaseKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}
