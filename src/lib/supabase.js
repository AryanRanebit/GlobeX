import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://vahziwepehzbzatxdmcq.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_SXfSsFpuhdU7An-Mpc_Olw_0DNxTz6m';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
