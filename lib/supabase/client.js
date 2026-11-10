// lib/supabase/client.js
// Safe browser Supabase client with graceful lazy-loading

let browserClient = null;

export async function getSupabaseBrowserClient() {
  if (typeof window === 'undefined') {
    return null;
  }

  if (browserClient) {
    return browserClient;
  }

  const supabaseUrl = typeof process !== 'undefined' ? process.env?.NEXT_PUBLIC_SUPABASE_URL : null;
  const supabaseAnonKey = typeof process !== 'undefined' ? process.env?.NEXT_PUBLIC_SUPABASE_ANON_KEY : null;

  if (!supabaseUrl || !supabaseAnonKey || supabaseUrl.includes('your-project')) {
    return null;
  }

  try {
    const { createBrowserClient } = await import('@supabase/ssr');
    browserClient = createBrowserClient(supabaseUrl, supabaseAnonKey);
    return browserClient;
  } catch (err) {
    console.warn('[Supabase Client] Note: @supabase/ssr package or connection not ready:', err.message);
    return null;
  }
}
