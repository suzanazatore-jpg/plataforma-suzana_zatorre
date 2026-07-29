import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';

type CookieToSet = { name: string; value: string; options: CookieOptions };

/**
 * Cliente Supabase para uso no servidor (Server Components, Server Actions e
 * Route Handlers). Ele lê e grava a sessão do aluno nos cookies, então as
 * consultas rodam autenticadas e passam pela RLS (o aluno enxerga o que a
 * matrícula dele permite).
 */
export function createSupabaseServerClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();

  if (!supabaseUrl || !supabaseAnonKey) {
    return null;
  }

  const cookieStore = cookies();

  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet: CookieToSet[]) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        } catch {
          // Chamado de dentro de um Server Component (onde não é possível
          // gravar cookie). Tudo bem: o middleware cuida da renovação da sessão.
        }
      }
    }
  });
}
