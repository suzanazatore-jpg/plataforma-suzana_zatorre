'use client';

import { useEffect, useRef, useState } from 'react';
import { MessageCircle, X, Send, Clock, Plus } from 'lucide-react';

// URL exata pedida no escopo (o backend guarda uma variação; aqui usamos a solicitada).
const WHATSAPP_URL =
  'https://api.whatsapp.com/send?phone=558499814124&text=Sou%20aluna%20do%20EVS%20e%20quero%20ajuda';

const SAUDACAO =
  'Olá! Eu sou a Assistente EVS. Posso ajudar você a entender as aulas e aplicar as atividades na sua loja. Qual é a sua dúvida?';

type Msg = {
  id?: string;
  role: 'user' | 'assistant';
  content: string;
  needs_human_support?: boolean;
};
type Conversa = { id: string; title: string | null; updated_at?: string };

const CSS = `
.ev-fab{position:fixed;right:20px;bottom:20px;z-index:9998;display:inline-flex;align-items:center;gap:9px;
  background:#ff2e63;color:#fff;border:none;border-radius:999px;padding:13px 18px;font-family:'Archivo',system-ui,sans-serif;
  font-size:14px;font-weight:700;cursor:pointer;box-shadow:0 10px 28px rgba(255,46,99,.45)}
.ev-fab:hover{filter:brightness(1.06)}
.ev-fab svg{width:19px;height:19px}

.ev-panel{position:fixed;right:20px;bottom:20px;z-index:9999;width:380px;max-width:calc(100vw - 32px);height:600px;
  max-height:calc(100vh - 40px);background:#0d0d0f;border:1px solid rgba(255,255,255,.09);border-radius:18px;
  display:flex;flex-direction:column;overflow:hidden;box-shadow:0 24px 60px rgba(0,0,0,.6);
  font-family:'Archivo',system-ui,sans-serif;color:#f5f5f7}

.ev-head{display:flex;align-items:center;gap:11px;padding:14px 16px;background:#141416;border-bottom:1px solid rgba(255,255,255,.08)}
.ev-badge{width:34px;height:34px;border-radius:50%;background:#ff2e63;display:grid;place-items:center;flex:none}
.ev-badge svg{width:18px;height:18px;color:#fff}
.ev-head .ti{flex:1;min-width:0}
.ev-head .ti b{font-size:14.5px;font-weight:800;display:block}
.ev-head .ti span{font-size:11px;color:#3ecf8e;font-weight:600}
.ev-hbtn{width:32px;height:32px;border-radius:9px;border:1px solid rgba(255,255,255,.12);background:#1c1c20;color:#9a9aa2;
  display:grid;place-items:center;cursor:pointer;flex:none}
.ev-hbtn:hover{color:#fff}
.ev-hbtn svg{width:16px;height:16px}

.ev-body{flex:1;overflow-y:auto;padding:16px;display:flex;flex-direction:column;gap:12px}
.ev-row{display:flex;gap:9px;max-width:100%}
.ev-row.user{flex-direction:row-reverse}
.ev-av{width:28px;height:28px;border-radius:50%;flex:none;display:grid;place-items:center;font-size:11px;font-weight:800}
.ev-av.a{background:#ff2e63;color:#fff}
.ev-av.u{background:#2b2b31;color:#c9c9cf}
.ev-av svg{width:15px;height:15px}
.ev-bubble{padding:11px 13px;border-radius:14px;font-size:13.5px;line-height:1.5;white-space:pre-wrap;word-break:break-word;max-width:78%}
.ev-row.assistant .ev-bubble{background:#1c1c20;border:1px solid rgba(255,255,255,.06);border-top-left-radius:5px}
.ev-row.user .ev-bubble{background:#ff2e63;color:#fff;border-top-right-radius:5px}

.ev-support{display:flex;flex-direction:column;gap:8px;margin-top:4px;margin-left:37px}
.ev-sbtn{display:inline-flex;align-items:center;justify-content:center;gap:8px;padding:10px 13px;border-radius:11px;
  font-family:inherit;font-size:12.5px;font-weight:700;cursor:pointer;text-decoration:none;border:1px solid transparent}
.ev-sbtn.wa{background:#25d366;color:#06301a}
.ev-sbtn.reg{background:#1c1c20;border-color:rgba(255,255,255,.14);color:#f5f5f7}
.ev-sbtn.reg:hover{border-color:#ff2e63;color:#ff2e63}
.ev-ok{margin-left:37px;font-size:12px;color:#3ecf8e;font-weight:600}

.ev-typing{display:inline-flex;gap:4px;padding:13px 14px;background:#1c1c20;border:1px solid rgba(255,255,255,.06);border-radius:14px;border-top-left-radius:5px}
.ev-typing i{width:7px;height:7px;border-radius:50%;background:#6f6f77;animation:evb 1s infinite}
.ev-typing i:nth-child(2){animation-delay:.15s}.ev-typing i:nth-child(3){animation-delay:.3s}
@keyframes evb{0%,60%,100%{opacity:.3;transform:translateY(0)}30%{opacity:1;transform:translateY(-3px)}}

.ev-erro{margin:0 16px 8px;background:rgba(255,46,99,.1);border:1px solid rgba(255,46,99,.3);color:#ff9db6;
  font-size:12px;border-radius:10px;padding:9px 12px;text-align:center}

.ev-foot{padding:12px 14px;border-top:1px solid rgba(255,255,255,.08);background:#141416}
.ev-input-wrap{display:flex;align-items:flex-end;gap:8px;background:#232327;border:1px solid transparent;border-radius:13px;padding:6px 6px 6px 12px}
.ev-input-wrap:focus-within{border-color:#ff2e63;box-shadow:0 0 0 3px rgba(255,46,99,.14)}
.ev-input{flex:1;background:none;border:none;outline:none;color:#f5f5f7;font-family:inherit;font-size:13.5px;resize:none;
  max-height:110px;line-height:1.45;padding:6px 0}
.ev-input::placeholder{color:#6f6f77}
.ev-send{width:38px;height:38px;flex:none;border-radius:10px;border:none;background:#ff2e63;color:#fff;cursor:pointer;display:grid;place-items:center}
.ev-send:disabled{opacity:.45;cursor:default}
.ev-send svg{width:17px;height:17px}

/* histórico */
.ev-hist{position:absolute;inset:0;background:#0d0d0f;z-index:5;display:flex;flex-direction:column}
.ev-hist .hh{display:flex;align-items:center;gap:11px;padding:14px 16px;background:#141416;border-bottom:1px solid rgba(255,255,255,.08);font-weight:800;font-size:14px}
.ev-hist .hl{flex:1;overflow-y:auto;padding:8px}
.ev-hitem{width:100%;text-align:left;background:none;border:none;border-radius:10px;padding:12px 12px;color:#f5f5f7;
  font-family:inherit;font-size:13px;cursor:pointer;display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.ev-hitem:hover{background:#1c1c20}
.ev-hitem small{display:block;color:#6f6f77;font-size:11px;margin-top:2px}
.ev-hnew{margin:8px;display:inline-flex;align-items:center;justify-content:center;gap:8px;background:#ff2e63;color:#fff;border:none;
  border-radius:11px;padding:11px;font-family:inherit;font-size:13px;font-weight:700;cursor:pointer}
.ev-hempty{color:#6f6f77;font-size:12.5px;text-align:center;padding:20px}

@media (max-width:560px){
  .ev-panel{right:0;left:0;bottom:0;top:0;width:100%;max-width:100%;height:100%;max-height:100%;border-radius:0;border:none}
  .ev-fab{right:16px;bottom:16px}
}
`;

export function AssistenteEvs() {
  const [open, setOpen] = useState(false);
  const [conversas, setConversas] = useState<Conversa[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [showHist, setShowHist] = useState(false);
  const [registrados, setRegistrados] = useState<number[]>([]);

  const bodyRef = useRef<HTMLDivElement>(null);
  const carregouRef = useRef(false);

  useEffect(() => {
    if (open && !carregouRef.current) {
      carregouRef.current = true;
      carregarConversas();
    }
  }, [open]);

  useEffect(() => {
    const el = bodyRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
  }, [messages, loading, open]);

  async function carregarConversas() {
    try {
      const res = await fetch('/api/assistente-evs', { credentials: 'same-origin' });
      if (!res.ok) return;
      const data = await res.json();
      setConversas(Array.isArray(data.conversations) ? data.conversations : []);
    } catch {
      /* silencioso — o chat continua funcionando pra novas perguntas */
    }
  }

  async function abrirConversa(id: string) {
    setShowHist(false);
    setErro(null);
    try {
      const res = await fetch(`/api/assistente-evs?conversationId=${encodeURIComponent(id)}`, { credentials: 'same-origin' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setErro('Não foi possível abrir essa conversa.'); return; }
      setConversationId(id);
      setRegistrados([]);
      if (Array.isArray(data.conversations)) setConversas(data.conversations);
      setMessages(
        (Array.isArray(data.messages) ? data.messages : []).map((m: any) => ({
          id: m.id,
          role: m.role === 'user' ? 'user' : 'assistant',
          content: String(m.content ?? ''),
          needs_human_support: Boolean(m.needs_human_support)
        }))
      );
    } catch {
      setErro('Não foi possível abrir essa conversa.');
    }
  }

  function novaConversa() {
    setConversationId(null);
    setMessages([]);
    setRegistrados([]);
    setErro(null);
    setShowHist(false);
  }

  async function enviar() {
    const q = input.trim();
    if (!q || loading) return;
    setErro(null);
    setInput('');
    setMessages((prev) => [...prev, { role: 'user', content: q }]);
    setLoading(true);
    try {
      const res = await fetch('/api/assistente-evs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ question: q, conversationId: conversationId || undefined })
      });
      const data = await res.json().catch(() => ({} as any));
      if (!res.ok) {
        setErro(typeof data?.error === 'string' ? data.error : 'Não consegui responder agora. Tente novamente em instantes.');
        return;
      }
      if (data.conversationId) setConversationId(data.conversationId);
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: String(data.answer ?? ''), needs_human_support: Boolean(data.needsHumanSupport) }
      ]);
      carregarConversas();
    } catch {
      setErro('Não consegui responder agora. Tente novamente em instantes.');
    } finally {
      setLoading(false);
    }
  }

  function onKey(e: any) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      enviar();
    }
  }

  if (!open) {
    return (
      <>
        <style dangerouslySetInnerHTML={{ __html: CSS }} />
        <button className="ev-fab" onClick={() => setOpen(true)} aria-label="Abrir Assistente EVS">
          <MessageCircle /> Assistente EVS
        </button>
      </>
    );
  }

  const semMensagens = messages.length === 0;

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <div className="ev-panel" role="dialog" aria-label="Assistente EVS">
        <div className="ev-head">
          <div className="ev-badge"><MessageCircle /></div>
          <div className="ti"><b>Assistente EVS</b><span>● Online</span></div>
          <button className="ev-hbtn" title="Conversas anteriores" onClick={() => { setShowHist(true); carregarConversas(); }}><Clock /></button>
          <button className="ev-hbtn" title="Fechar" onClick={() => setOpen(false)}><X /></button>
        </div>

        <div className="ev-body" ref={bodyRef}>
          {semMensagens && (
            <div className="ev-row assistant">
              <div className="ev-av a"><MessageCircle /></div>
              <div className="ev-bubble">{SAUDACAO}</div>
            </div>
          )}

          {messages.map((m, i) => (
            <div key={m.id || i}>
              <div className={`ev-row ${m.role}`}>
                <div className={`ev-av ${m.role === 'user' ? 'u' : 'a'}`}>
                  {m.role === 'user' ? 'Você' : <MessageCircle />}
                </div>
                <div className="ev-bubble">{m.content}</div>
              </div>

              {m.role === 'assistant' && m.needs_human_support && (
                registrados.includes(i) ? (
                  <div className="ev-ok">✓ Dúvida registrada — nossa equipe vai te responder.</div>
                ) : (
                  <div className="ev-support">
                    <a className="ev-sbtn wa" href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer">
                      Falar com o suporte pelo WhatsApp
                    </a>
                    <button className="ev-sbtn reg" onClick={() => setRegistrados((prev) => [...prev, i])}>
                      Registrar minha dúvida para a equipe
                    </button>
                  </div>
                )
              )}
            </div>
          ))}

          {loading && (
            <div className="ev-row assistant">
              <div className="ev-av a"><MessageCircle /></div>
              <div className="ev-typing"><i></i><i></i><i></i></div>
            </div>
          )}
        </div>

        {erro && <div className="ev-erro">{erro}</div>}

        <div className="ev-foot">
          <div className="ev-input-wrap">
            <textarea
              className="ev-input"
              rows={1}
              placeholder="Escreva sua dúvida…"
              value={input}
              disabled={loading}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={onKey}
            />
            <button className="ev-send" onClick={enviar} disabled={loading || !input.trim()} aria-label="Enviar">
              <Send />
            </button>
          </div>
        </div>

        {showHist && (
          <div className="ev-hist">
            <div className="hh">
              <button className="ev-hbtn" onClick={() => setShowHist(false)} aria-label="Voltar"><X /></button>
              Conversas anteriores
            </div>
            <button className="ev-hnew" onClick={novaConversa}><Plus size={15} /> Nova conversa</button>
            <div className="hl">
              {conversas.length === 0 ? (
                <div className="ev-hempty">Você ainda não tem conversas salvas.</div>
              ) : (
                conversas.map((c) => (
                  <button className="ev-hitem" key={c.id} onClick={() => abrirConversa(c.id)}>
                    {c.title || 'Conversa'}
                  </button>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
