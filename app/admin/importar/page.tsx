import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import ImportClient from './import-client';

export const dynamic = 'force-dynamic';

// Esta página fica dentro de /admin, então já é protegida pelo gate do admin/layout.tsx.
export default async function ImportarPage() {
  const admin = createSupabaseAdminClient();
  const { data: courses } = admin
    ? await admin.from('courses').select('id, title, slug').order('title', { ascending: true })
    : { data: [] };

  return <ImportClient courses={courses || []} />;
}
