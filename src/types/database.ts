export type EventStatus = 'setup' | 'active' | 'paused' | 'revealed';

export interface EventState {
  id: number;
  status: EventStatus;
  timer_enabled: boolean;
  timer_seconds: number;
  spreadsheet_url?: string | null;
  last_synced_at?: string | null;
  started_at?: string | null;
  revealed_at?: string | null;
  updated_at: string;
}

export interface Volunteer {
  id: number;
  name: string;
  centre: string;
  code: string;
  joined: boolean;
  is_active: boolean;
  is_seed: boolean;
  assigned_color?: string | null;
  completed_at?: string | null;
  completion_position?: number | null;
  spreadsheet_source_id?: string | null;
  created_at: string;
  updated_at: string;
}

export interface VolunteerPublic {
  id: number;
  name: string;
  centre: string;
  code: string;
  joined: boolean;
  progress: number;
  status: 'waiting' | 'playing' | 'completed';
  board?: string[] | null;
  entries?: CellEntry[] | null;
  assignedColor?: string | null;
  completionPosition?: number | null;
}

export interface GameBoard {
  id: number;
  volunteer_id: number;
  cells: string[];
  created_at: string;
  updated_at: string;
}

export interface CellEntry {
  id: number;
  volunteer_id: number;
  cell_index: number;
  partner_id: number;
  created_at: string;
}

export interface Database {
  public: {
    Tables: {
      event_state: {
        Row: EventState;
        Insert: Partial<EventState>;
        Update: Partial<EventState>;
      };
      volunteers: {
        Row: Volunteer;
        Insert: Omit<Volunteer, 'id' | 'created_at' | 'updated_at'> & { id?: number };
        Update: Partial<Volunteer>;
      };
      game_boards: {
        Row: GameBoard;
        Insert: Omit<GameBoard, 'id' | 'created_at' | 'updated_at'> & { id?: number };
        Update: Partial<GameBoard>;
      };
      cell_entries: {
        Row: CellEntry;
        Insert: Omit<CellEntry, 'id' | 'created_at'> & { id?: number };
        Update: Partial<CellEntry>;
      };
    };
  };
}
