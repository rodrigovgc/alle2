import { createClient } from '@supabase/supabase-js';
import { demoClient } from './demoClient.js';

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
const demo = import.meta.env.VITE_DEMO === 'true';

export const isDemo = demo && !(url && key);
export const isConfigured = Boolean(url && key) || isDemo;

export const supabase = url && key
  ? createClient(url, key, { auth: { persistSession: true, autoRefreshToken: true } })
  : isDemo ? demoClient : null;
