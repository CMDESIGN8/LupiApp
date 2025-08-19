import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// Debug: monitorear todas las requests
supabase.auth.onAuthStateChange((event, session) => {
  console.log('Auth event:', event, session);
});

// Monitorear errores de supabase
supabase.getSubscriptions().forEach(subscription => {
  subscription.on('error', (error) => {
    console.error('Supabase error:', error);
  });
});

export const supabase = createClient(supabaseUrl, supabaseAnonKey)