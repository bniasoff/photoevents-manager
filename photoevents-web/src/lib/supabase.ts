import { createClient } from '@supabase/supabase-js';

// Same Supabase project the mobile app uses — this app reads/writes the same data.
const SUPABASE_URL = 'https://wkdjsvciamugtiidqafa.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_VhNtFhqmUJxE2Lxxyl9GmA_FW7hMbA4';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
