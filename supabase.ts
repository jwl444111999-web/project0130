
import { createClient } from '@supabase/supabase-js';

// Using the provided Supabase credentials
const supabaseUrl = 'https://hhkmmthyrmrmywdbdnrf.supabase.co';
const supabaseAnonKey = 'sb_publishable_Peo7dprUCyjK1n6Q-iziGQ_XCGapi9o';

export const isSupabaseConfigured = true;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
