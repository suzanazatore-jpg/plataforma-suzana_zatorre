import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

export default async function DebugSupabasePage() {
  const rawSupabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const rawSupabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const supabaseUrl = rawSupabaseUrl?.trim();
  const supabaseAnonKey = rawSupabaseAnonKey?.trim();

  let result: {
    ok: boolean;
    message: string;
    firstLesson?: string;
    rows?: number;
    error?: string;
    directFetchStatus?: number;
    directFetchError?: string;
  } = {
    ok: false,
    message: 'Ainda nao testado'
  };

  if (!supabaseUrl || !supabaseAnonKey) {
    result = {
      ok: false,
      message: 'Variaveis ausentes na Vercel'
    };
  } else {
    try {
      const directResponse = await fetch(
        `${supabaseUrl}/rest/v1/lessons?select=title,sort_order&is_published=eq.true&order=sort_order.asc`,
        {
          cache: 'no-store',
          headers: {
            apikey: supabaseAnonKey,
            Authorization: `Bearer ${supabaseAnonKey}`
          }
        }
      );
      const directData = await directResponse.json();

      const supabase = createClient(supabaseUrl, supabaseAnonKey, {
        auth: {
          persistSession: false
        }
      });

      const { data, error } = await supabase
        .from('lessons')
        .select('title, sort_order')
        .eq('is_published', true)
        .order('sort_order', { ascending: true });

      result = {
        ok: !error && !!data?.length,
        message: error ? 'Erro na consulta' : 'Consulta realizada',
        firstLesson: data?.[0]?.title || directData?.[0]?.title,
        rows: data?.length || (Array.isArray(directData) ? directData.length : 0),
        directFetchStatus: directResponse.status,
        error: error ? `${error.code || ''} ${error.message}`.trim() : undefined
      };
    } catch (error) {
      result = {
        ok: false,
        message: 'Fetch falhou antes da resposta do Supabase',
        rows: 0,
        directFetchError: error instanceof Error ? error.message : String(error)
      };
    }
  }

  return (
    <main style={{ background: '#0b0b0b', color: '#fff', minHeight: '100vh', padding: 32 }}>
      <h1>Debug Supabase</h1>
      <pre
        style={{
          background: '#181818',
          border: '1px solid #333',
          borderRadius: 8,
          lineHeight: 1.6,
          overflow: 'auto',
          padding: 20
        }}
      >
        {JSON.stringify(
          {
            hasUrl: !!supabaseUrl,
            urlLooksRight: supabaseUrl?.startsWith('https://') && supabaseUrl?.endsWith('.supabase.co'),
            urlLength: supabaseUrl?.length,
            urlWasTrimmed: rawSupabaseUrl !== supabaseUrl,
            hasAnonKey: !!supabaseAnonKey,
            keyPrefix: supabaseAnonKey?.slice(0, 12),
            keyLength: supabaseAnonKey?.length,
            keyWasTrimmed: rawSupabaseAnonKey !== supabaseAnonKey,
            result
          },
          null,
          2
        )}
      </pre>
      <p style={{ color: '#ff4b7a', marginTop: 16 }}>debug-version: v10-no-cache</p>
    </main>
  );
}
