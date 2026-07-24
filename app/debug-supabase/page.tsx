import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

export default async function DebugSupabasePage() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  let result: {
    ok: boolean;
    message: string;
    firstLesson?: string;
    rows?: number;
    error?: string;
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
      firstLesson: data?.[0]?.title,
      rows: data?.length || 0,
      error: error ? `${error.code || ''} ${error.message}`.trim() : undefined
    };
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
            hasAnonKey: !!supabaseAnonKey,
            keyPrefix: supabaseAnonKey?.slice(0, 12),
            result
          },
          null,
          2
        )}
      </pre>
    </main>
  );
}
