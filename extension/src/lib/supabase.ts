import { createClient } from '@supabase/supabase-js';

// Supabase configuration
const supabaseUrl = 'https://homyshxwdbtrkopuxtws.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhvbXlzaHh3ZGJ0cmtvcHV4dHdzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI1ODkxNTksImV4cCI6MjA3ODE2NTE1OX0.bNPMElWTX8GSsrv-zDOkhboh8gAFh7lItlBCKw7a1pQ';

// Create Supabase client
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Database types
export interface MemoryRow {
  id: string;
  url: string;
  title: string;
  note: string | null;
  tags: string[];
  category: string;
  platform: string;
  timestamp: number;
  created_at: string;
  favicon: string | null;
  thumbnail: string | null;
  selected_text: string | null;
  metadata: any;
}

