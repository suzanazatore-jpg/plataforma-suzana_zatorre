import { NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

const UUID = /^[0-9a-f]{8}-[0-9a-f-]{27}$/i;

function safeFileName(title: string, source: string, detectedExtension?: string) {
  const sourceName = source.split('/').pop()?.split('?')[0] || '';
  const sourceExtension = detectedExtension || sourceName.match(/\.[a-z0-9]{1,8}$/i)?.[0] || '.pdf';
  const cleanTitle = title.replace(/[\\/:*?"<>|\r\n]+/g, '-').trim() || 'material';
  const titleWithoutWrongExtension = cleanTitle.replace(/\.(pdf|xlsx|xls|csv)$/i, '');
  return `${titleWithoutWrongExtension}${sourceExtension}`;
}

function detectFileType(bytes: Uint8Array, declaredType: string | null, fileName: string) {
  const isPdf = bytes.length >= 4
    && bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46;
  if (isPdf) return { extension: '.pdf', contentType: 'application/pdf' };

  const isLegacyExcel = bytes.length >= 8
    && bytes[0] === 0xd0 && bytes[1] === 0xcf && bytes[2] === 0x11 && bytes[3] === 0xe0;
  if (isLegacyExcel) return { extension: '.xls', contentType: 'application/vnd.ms-excel' };

  const isZip = bytes.length >= 4
    && bytes[0] === 0x50 && bytes[1] === 0x4b
    && ((bytes[2] === 0x03 && bytes[3] === 0x04)
      || (bytes[2] === 0x05 && bytes[3] === 0x06)
      || (bytes[2] === 0x07 && bytes[3] === 0x08));
  if (isZip && /planilha|excel|precifica/i.test(fileName)) {
    return {
      extension: '.xlsx',
      contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    };
  }

  const extension = fileName.match(/\.(pdf|xlsx|xls|csv)$/i)?.[0]?.toLowerCase();
  const byExtension: Record<string, string> = {
    '.pdf': 'application/pdf',
    '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    '.xls': 'application/vnd.ms-excel',
    '.csv': 'text/csv'
  };
  return {
    extension: extension || '',
    contentType: (extension && byExtension[extension]) || declaredType || 'application/octet-stream'
  };
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

  const fileBytes = new Uint8Array(await fileResponse.arrayBuffer());
  const detected = detectFileType(
    fileBytes,
    fileResponse.headers.get('content-type'),
    `${material.title} ${material.file_url}`
  );
  const fileName = safeFileName(material.title, material.file_url, detected.extension || undefined);

  return new NextResponse(fileBytes, {
    headers: {
      'Content-Type': detected.contentType,
      'Content-Disposition': `attachment; filename="${fileName}"; filename*=UTF-8''${encodeURIComponent(fileName)}`,
      'Cache-Control': 'private, no-store'
    }
  });
}
