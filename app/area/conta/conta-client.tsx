'use client';

import Link from 'next/link';
import { useRef, useState } from 'react';
import { ArrowLeft, Camera, Eye, EyeOff, LockKeyhole } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

type AlterarFoto = (formData: FormData) => Promise<{ ok: boolean; mensagem: string; url?: string }>;

const ACCENT = '#ff2e63';
const CARD = '#141416';
const BORDER = '#2b2b31';
const MUTED = '#a1a1aa';

export default function ContaClient({
  nome,
  email,
  avatarUrl,
  alterarFoto
}: {
  nome: string;
  email: string;
  avatarUrl: string | null;
  alterarFoto: AlterarFoto;
}) {
  const inicial = (nome || 'A').trim().charAt(0).toUpperCase();
  const fileRef = useRef<HTMLInputElement>(null);

  const [foto, setFoto] = useState<string | null>(avatarUrl);
  const [enviandoFoto, setEnviandoFoto] = useState(false);
  const [msgFoto, setMsgFoto] = useState<{ ok: boolean; texto: string } | null>(null);

  const [novaSenha, setNovaSenha] = useState('');
  const [confirmar, setConfirmar] = useState('');
  const [verSenha, setVerSenha] = useState(false);
  const [salvandoSenha, setSalvandoSenha] = useState(false);
  const [msgSenha, setMsgSenha] = useState<{ ok: boolean; texto: string } | null>(null);

  async function aoEscolherFoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 3 * 1024 * 1024) {
      setMsgFoto({ ok: false, texto: 'A imagem deve ter até 3 MB.' });
      return;
    }
    setEnviandoFoto(true);
    setMsgFoto(null);
    try {
      const fd = new FormData();
      fd.append('foto', file);
      const r = await alterarFoto(fd);
      if (r.ok && r.url) setFoto(r.url);
      setMsgFoto({ ok: r.ok, texto: r.mensagem });
    } catch {
      setMsgFoto({ ok: false, texto: 'Não foi possível enviar a foto. Tente novamente.' });
    } finally {
      setEnviandoFoto(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  }

  async function salvarSenha() {
    setMsgSenha(null);
    if (novaSenha.length < 6) {
      setMsgSenha({ ok: false, texto: 'A senha precisa ter pelo menos 6 caracteres.' });
      return;
    }
    if (novaSenha !== confirmar) {
      setMsgSenha({ ok: false, texto: 'As senhas não são iguais.' });
      return;
    }
    const supabase = createClient();
    if (!supabase) {
      setMsgSenha({ ok: false, texto: 'Conexão indisponível. Tente novamente.' });
      return;
    }
    setSalvandoSenha(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: novaSenha });
      if (error) {
        setMsgSenha({ ok: false, texto: 'Não foi possível alterar a senha. Tente novamente.' });
      } else {
        setMsgSenha({ ok: true, texto: 'Senha alterada com sucesso!' });
        setNovaSenha('');
        setConfirmar('');
      }
    } finally {
      setSalvandoSenha(false);
    }
  }

  const inputStyle: React.CSSProperties = {
    width: '100%',
    height: 46,
    background: '#0f0f12',
    color: '#fff',
    border: `1px solid ${BORDER}`,
    borderRadius: 10,
    padding: '0 44px 0 42px',
    fontSize: 15,
    boxSizing: 'border-box',
    outline: 'none'
  };

  return (
    <main style={{ minHeight: '100dvh', background: '#050506', color: '#fff', fontFamily: 'Archivo,Arial,sans-serif', padding: '28px 18px 60px' }}>
      <div style={{ maxWidth: 480, margin: '0 auto' }}>
        <Link href="/area" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: MUTED, textDecoration: 'none', fontSize: 14, marginBottom: 22 }}>
          <ArrowLeft size={16} /> Voltar para a área
        </Link>

        <h1 style={{ fontSize: 24, fontWeight: 800, margin: '0 0 4px' }}>Minha conta</h1>
        <p style={{ color: MUTED, fontSize: 14, margin: '0 0 24px' }}>Altere sua foto e sua senha de acesso.</p>

        {/* FOTO */}
        <section style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 16, padding: '22px', marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
            <div style={{ position: 'relative', width: 84, height: 84, flexShrink: 0 }}>
              {foto ? (
                <img src={foto} alt="Sua foto" style={{ width: 84, height: 84, borderRadius: '50%', objectFit: 'cover', border: `2px solid ${ACCENT}` }} />
              ) : (
                <div style={{ width: 84, height: 84, borderRadius: '50%', background: 'rgba(255,46,99,.15)', color: ACCENT, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 34, fontWeight: 800, border: `2px solid ${ACCENT}` }}>{inicial}</div>
              )}
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={enviandoFoto}
                aria-label="Trocar foto"
                style={{ position: 'absolute', right: -2, bottom: -2, width: 30, height: 30, borderRadius: '50%', background: ACCENT, border: '2px solid #050506', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: enviandoFoto ? 'default' : 'pointer' }}
              >
                <Camera size={15} />
              </button>
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 16 }}>{nome}</div>
              <div style={{ color: MUTED, fontSize: 13 }}>{email}</div>
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={enviandoFoto}
                style={{ marginTop: 10, background: 'transparent', color: '#fff', border: `1px solid ${BORDER}`, borderRadius: 8, padding: '7px 14px', fontSize: 13, cursor: enviandoFoto ? 'default' : 'pointer', fontFamily: 'inherit' }}
              >
                {enviandoFoto ? 'Enviando…' : 'Trocar foto'}
              </button>
            </div>
          </div>
          <input ref={fileRef} type="file" accept="image/*" onChange={aoEscolherFoto} style={{ display: 'none' }} />
          {msgFoto ? (
            <p style={{ margin: '14px 0 0', fontSize: 13, color: msgFoto.ok ? '#4ade80' : '#f87171' }}>{msgFoto.texto}</p>
          ) : null}
        </section>

        {/* SENHA */}
        <section style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 16, padding: '22px' }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, margin: '0 0 4px' }}>Alterar senha</h2>
          <p style={{ color: MUTED, fontSize: 13, margin: '0 0 16px' }}>Crie uma nova senha de acesso.</p>

          <div style={{ position: 'relative', marginBottom: 12 }}>
            <LockKeyhole size={17} style={{ position: 'absolute', left: 14, top: 15, color: MUTED }} />
            <input
              type={verSenha ? 'text' : 'password'}
              value={novaSenha}
              onChange={(e) => setNovaSenha(e.target.value)}
              placeholder="Nova senha"
              style={inputStyle}
            />
            <button type="button" onClick={() => setVerSenha((v) => !v)} aria-label="Ver senha" style={{ position: 'absolute', right: 12, top: 12, background: 'none', border: 'none', color: MUTED, cursor: 'pointer' }}>
              {verSenha ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>

          <div style={{ position: 'relative', marginBottom: 16 }}>
            <LockKeyhole size={17} style={{ position: 'absolute', left: 14, top: 15, color: MUTED }} />
            <input
              type={verSenha ? 'text' : 'password'}
              value={confirmar}
              onChange={(e) => setConfirmar(e.target.value)}
              placeholder="Confirmar nova senha"
              style={inputStyle}
            />
          </div>

          <button
            type="button"
            onClick={salvarSenha}
            disabled={salvandoSenha}
            style={{ width: '100%', height: 46, background: ACCENT, color: '#fff', border: 'none', borderRadius: 10, fontWeight: 700, fontSize: 15, cursor: salvandoSenha ? 'default' : 'pointer', opacity: salvandoSenha ? 0.7 : 1, fontFamily: 'inherit' }}
          >
            {salvandoSenha ? 'Salvando…' : 'Salvar nova senha'}
          </button>

          {msgSenha ? (
            <p style={{ margin: '14px 0 0', fontSize: 13, color: msgSenha.ok ? '#4ade80' : '#f87171' }}>{msgSenha.texto}</p>
          ) : null}
        </section>
      </div>
    </main>
  );
}
