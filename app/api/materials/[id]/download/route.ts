import { NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

const UUID = /^[0-9a-f]{8}-[0-9a-f-]{27}$/i;

function safeFileName(title: string, source: string) {
  const sourceName = source.split('/').pop()?.split('?')[0] || '';
  const sourceExtension = sourceName.match(/\.[a-z0-9]{1,8}$/i)?.[0] || '.pdf';
  const cleanTitle = title.replace(/[\\/:*?"<>|\r\n]+/g, '-').trim() || 'material';
  return cleanTitle.toLowerCase().endsWith(sourceExtension.toLowerCase())
    ? cleanTitle
    : `${cleanTitle}${sourceExtension}`;
}

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  if (!UUID.test(params.id)) return new NextResponse('Material inválido.', { status: 400 });

  const session = createSupabaseServerClient();
  const admin = createSupabaseAdminClient();
  if (!session || !admin) return new NextResponse('Serviço indisponível.', { status: 503 });

  const { data: auth } = await session.auth.getUser();
  if (!auth.user) return new NextResponse('Faça login para baixar.', { status: 401 });

  const { data: material } = await admin
    .from('materials')
    .select('id,title,file_url,course_id,lesson_id,is_published')
    .eq('id', params.id)
    .eq('is_published', true)
    .maybeSingle();
  if (!material) return new NextResponse('Material não encontrado.', { status: 404 });

  let courseId = material.course_id as string | null;
  if (!courseId && material.lesson_id) {
    const { data: lesson } = await admin
      .from('lessons')
      .select('course_id')
      .eq('id', material.lesson_id)
      .eq('is_published', true)
      .maybeSingle();
    courseId = lesson?.course_id || null;
  }
  if (!courseId) return new NextResponse('Curso do material não encontrado.', { status: 404 });

  const { data: profile } = await admin
    .from('profiles')
    .select('role,status')
    .eq('id', auth.user.id)
    .maybeSingle();
  const isAdmin = profile?.role === 'admin' && profile.status === 'active';
  if (!isAdmin) {
    const { data: enrollment } = await admin
      .from('enrollments')
      .select('id')
      .eq('profile_id', auth.user.id)
      .eq('course_id', courseId)
      .eq('status', 'active')
      .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`)
      .maybeSingle();
    if (!enrollment) return new NextResponse('Você não tem acesso a este material.', { status: 403 });
  }

  const fileName = safeFileName(material.title, material.file_url);
  let fileResponse: Response;
  if (material.file_url.startsWith('storage://')) {
    const match = material.file_url.match(/^storage:\/\/([^/]+)\/(.+)$/);
    if (!match) return new NextResponse('Arquivo inválido.', { status: 404 });
    const [, bucket, path] = match;
    const { data, error } = await admin.storage.from(bucket).download(path);
    if (error || !data) return new NextResponse('Não foi possível baixar o arquivo.', { status: 502 });
    fileResponse = new Response(data);
  } else {
    fileResponse = await fetch(material.file_url, { cache: 'no-store' });
    if (!fileResponse.ok || !fileResponse.body) return new NextResponse('Não foi possível baixar o arquivo.', { status: 502 });
  }

  return new NextResponse(fileResponse.body, {
    headers: {
      'Content-Type': fileResponse.headers.get('content-type') || 'application/octet-stream',
      'Content-Disposition': `attachment; filename="${fileName}"; filename*=UTF-8''${encodeURIComponent(fileName)}`,
      'Cache-Control': 'private, no-store'
    }
  });
}
