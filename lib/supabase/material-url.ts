import type { SupabaseClient } from '@supabase/supabase-js';

export async function resolveMaterialUrl(db: SupabaseClient, value: string, downloadName?: string) {
  if (!value.startsWith('storage://')) return value;
  const match = value.match(/^storage:\/\/([^/]+)\/(.+)$/);
  if (!match) return '#';
  const [, bucket, path] = match;
  const { data, error } = await db.storage.from(bucket).createSignedUrl(path, 60 * 60, downloadName ? { download: downloadName } : undefined);
  return error ? '#' : data.signedUrl;
}
