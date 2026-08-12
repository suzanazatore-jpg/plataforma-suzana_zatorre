import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { getCurrentStudent } from '@/lib/supabase/session';
import ContaClient from './conta-client';

export const dynamic = 'force-dynamic';

export default async function ContaPage() {
  const student = await getCurrentStudent();
  if (!student) redirect('/');

  const admin = createSupabaseAdminClient();
  let avatarUrl: string | null = null;
  if (admin) {
    const { data } = await admin.from('profiles').select('avatar_url').eq('id', student.userId).maybeSingle();
    avatarUrl = data?.avatar_url || null;
  }

  async function alterarFoto(formData: FormData): Promise<{ ok: boolean; mensagem: string; url?: string }> {
    'use server';
    const atual = await getCurrentStudent();
    if (!atual) return { ok: false, mensagem: 'Faça login novamente.' };

    const file = formData.get('foto');
    if (!(file instanceof File) || file.size === 0) return { ok: false, mensagem: 'Escolha uma imagem.' };
    if (file.size > 3 * 1024 * 1024) return { ok: false, mensagem: 'A imagem deve ter até 3 MB.' };
    if (!file.type.startsWith('image/')) return { ok: false, mensagem: 'O arquivo precisa ser uma imagem.' };

    const adminClient = createSupabaseAdminClient();
    if (!adminClient) return { ok: false, mensagem: 'Configuração indisponível.' };

    const ext = (file.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg';
    const path = `${atual.userId}/avatar-${Date.now()}.${ext}`;
    const buffer = Buffer.from(await file.arrayBuffer());

    const { error: upErro } = await adminClient.storage
      .from('avatars')
      .upload(path, buffer, { contentType: file.type || 'image/jpeg', upsert: true });
    if (upErro) return { ok: false, mensagem: 'Não foi possível enviar a foto. Tente outra imagem.' };

    const { data: pub } = adminClient.storage.from('avatars').getPublicUrl(path);
    const url = pub.publicUrl;

    const { error: updErro } = await adminClient
      .from('profiles')
      .update({ avatar_url: url, updated_at: new Date().toISOString() })
      .eq('id', atual.userId);
    if (updErro) return { ok: false, mensagem: 'A foto subiu, mas não salvou no perfil. Tente novamente.' };

    revalidatePath('/area/conta');
    revalidatePath('/area');
    return { ok: true, mensagem: 'Foto atualizada!', url };
  }

  return (
    <ContaClient
      nome={student.displayName}
      email={student.email}
      avatarUrl={avatarUrl}
      alterarFoto={alterarFoto}
    />
  );
}
