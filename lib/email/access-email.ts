const LOGIN_URL = (process.env.ACADEMY_URL || 'https://membros.suzanazatorre.com.br').replace(/\/$/, '');
const SENDER = { name: 'Suzana Zatorre', email: 'suporte@suzanazatorre.com.br' };

function primeiroNome(nome: string | null) {
  return (nome || '').trim().split(/\s+/)[0] || 'Aluna';
}

// Monta o HTML do e-mail de acesso (primeiro acesso / boas-vindas com a senha).
export function buildAccessEmailHtml(params: {
  name: string | null;
  email: string;
  tempPassword: string;
  courseName?: string | null;
}) {
  const nome = primeiroNome(params.name);
  const loginLink = `${LOGIN_URL}/?email=${encodeURIComponent(params.email)}`;
  const linhaCurso = params.courseName
    ? `Seu acesso ao <strong>${params.courseName}</strong> já está liberado.`
    : `Seu acesso à Academia de Vendas já está liberado.`;

  return `<!DOCTYPE html><html lang="pt-BR"><body style="margin:0;padding:0;background:#f4f4f5;font-family:Arial,Helvetica,sans-serif;color:#1f2937;">
  <div style="max-width:520px;margin:0 auto;padding:24px;">
    <div style="background:#111114;border-radius:14px;padding:30px 24px;text-align:center;">
      <div style="color:#ffffff;font-size:22px;font-weight:bold;letter-spacing:.5px;line-height:1.2;">ACADEMIA <span style="color:#ff2e63;">DE VENDAS</span></div>
      <div style="color:#a1a1aa;font-size:12px;margin-top:6px;letter-spacing:2px;">SUZANA ZATORRE</div>
    </div>
    <div style="background:#ffffff;border-radius:14px;padding:30px 26px;margin-top:12px;">
      <p style="font-size:19px;font-weight:bold;margin:0 0 14px;">Seu acesso está liberado! 🎉</p>
      <p style="font-size:15px;line-height:1.6;margin:0 0 20px;">Olá, <strong>${nome}</strong>! Que alegria ter você aqui. ${linhaCurso} Use os dados abaixo para entrar:</p>
      <div style="background:#f4f4f5;border-radius:12px;padding:18px 20px;margin:0 0 22px;">
        <p style="font-size:14px;margin:0 0 10px;color:#374151;"><strong>Login (seu e-mail):</strong><br>${params.email}</p>
        <p style="font-size:14px;margin:0;color:#374151;"><strong>Sua senha de acesso:</strong><br><span style="display:inline-block;margin-top:6px;font-size:26px;letter-spacing:4px;color:#ff2e63;font-weight:bold;">${params.tempPassword}</span></p>
      </div>
      <div style="text-align:center;margin:0 0 22px;">
        <a href="${loginLink}" style="background:#ff2e63;color:#ffffff;text-decoration:none;font-weight:bold;font-size:16px;padding:15px 34px;border-radius:10px;display:inline-block;">Acessar a plataforma</a>
      </div>
      <p style="font-size:13px;line-height:1.6;color:#6b7280;margin:0;border-top:1px solid #eee;padding-top:16px;">Dica: no primeiro acesso, você pode trocar essa senha por uma de sua preferência, lá dentro da plataforma. Qualquer dúvida, é só responder este e-mail que a gente te ajuda. 💗</p>
    </div>
    <p style="text-align:center;font-size:12px;color:#9ca3af;margin:18px 0 0;">Academia de Vendas · Suzana Zatorre</p>
  </div>
</body></html>`;
}

// Envia o e-mail de acesso via API do Brevo. Retorna { ok, error }.
export async function sendAccessEmail(params: {
  email: string;
  name: string | null;
  tempPassword: string;
  courseName?: string | null;
}): Promise<{ ok: boolean; error: string | null }> {
  const apiKey = process.env.BREVO_API_KEY?.trim();
  if (!apiKey) return { ok: false, error: 'BREVO_API_KEY ausente no projeto.' };

  try {
    const res = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'api-key': apiKey,
        'Content-Type': 'application/json',
        accept: 'application/json'
      },
      body: JSON.stringify({
        sender: SENDER,
        to: [{ email: params.email, name: params.name || undefined }],
        subject: 'Seu acesso à Academia de Vendas está liberado 🎉',
        htmlContent: buildAccessEmailHtml(params)
      })
    });
    if (!res.ok) {
      const text = await res.text();
      return { ok: false, error: `Brevo ${res.status}: ${text.slice(0, 180)}` };
    }
    return { ok: true, error: null };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : 'Falha no envio do e-mail.' };
  }
}
