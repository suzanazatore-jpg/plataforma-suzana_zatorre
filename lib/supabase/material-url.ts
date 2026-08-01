import type { SupabaseClient } from '@supabase/supabase-js';

export async function resolveMaterialUrl(db: SupabaseClient, value: string) {
  if (!value.startsWith('storage://')) return value;
  const match = value.match(/^storage:\/\/([^/]+)\/(.+)$/);
  if (!match) return '#';
  const [, bucket, path] = match;
  const { data, error } = await db.storage.from(bucket).createSignedUrl(path, 60 * 60);
  return error ? '#' : data.signedUrl;
}
