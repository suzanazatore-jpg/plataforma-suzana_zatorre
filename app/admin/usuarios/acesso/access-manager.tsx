'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Clock, Mail, Info, Check, Copy, MessageCircle } from 'lucide-react';

export type CursoAcesso = {
  id: string;
  titulo: string;
  subtitulo: string;
  capa: string | null;
  ativo: boolean;
  expiresAt?: string | null;
};

type Resultado = { ok: boolean; mensagem: string };
type ResultadoSenha = Resultado & { senha?: string; whatsappUrl?: string | null };
type DadosAluna = { nome: string; email: string; telefone: string };

type Props = {
  alunaId: string;
  alunaNome: string;
  cursos: CursoAcesso[];
  salvarAcessos: (alunaId: string, cursosAtivos: string[]) => Promise<Resultado>;
  dados?: DadosAluna;
  salvarDados?: (dados: { id: string; nome: string; email: string; telefone: string }) => Promise<Resultado>;
  definirNovaSenha?: (dados: { alunaId: string; senha?: string }) => Promise<ResultadoSenha>;
  enviarAcessoEmail?: (dados: { alunaId: string; senha: string }) => Promise<Resultado>;
  definirPrazo?: (dados: { alunaId: string; cursoId: string; tempo: string; dataFim?: string }) => Promise<Resultado>;
};

const ATALHOS: [string, string][] = [
  ['30d', '30 dias'],
  ['3m', '3 meses'],
  ['6m', '6 meses'],
  ['12m', '12 meses'],
  ['custom', 'Data exata…']
];

function formatarData(iso?: string | null) {
  if (!iso) return null;
  return new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Fortaleza' }).format(new Date(iso));
}

export default function AccessManager({
  alunaId,
  alunaNome,
  cursos,
  salvarAcessos,
  dados,
  salvarDados,
  definirNovaSenha,
  enviarAcessoEmail,
  definirPrazo
}: Props) {
  const router = useRouter();
  const [aba, setAba] = useState<'dados' | 'acesso'>('dados');

  // Acessos (liga/desliga)
  const [ativos, setAtivos] = useState(
    () => new Set(cursos.filter((curso) => curso.ativo).map((curso) => curso.id))
  );
  const [retornoAcesso, setRetornoAcesso] = useState<Resultado | null>(null);
  const [salvandoAcesso, iniciarAcesso] = useTransition();

  // Editor de prazo (por curso)
  const [editando, setEditando] = useState<string | null>(null);
  const [tempo, setTempo] = useState('12m');
  const [dataFim, setDataFim] = useState('');
  const [retornoPrazo, setRetornoPrazo] = useState<Resultado | null>(null);
  const [salvandoPrazo, iniciarPrazo] = useTransition();

  // Dados da aluna
  const [nome, setNome] = useState(dados?.nome || '');
  const [email, setEmail] = useState(dados?.email || '');
  const [telefone, setTelefone] = useState(dados?.telefone || '');
  const [retornoDados, setRetornoDados] = useState<Resultado | null>(null);
  const [salvandoDados, iniciarDados] = useTransition();

  // Reenviar acesso (definir senha + enviar por WhatsApp/e-mail)
  const [modoSenha, setModoSenha] = useState<'auto' | 'custom'>('auto');
  const [senhaCustom, setSenhaCustom] = useState('');
  const [acessoDefinido, setAcessoDefinido] = useState<{ senha: string; whatsappUrl: string | null } | null>(null);
  const [copiado, setCopiado] = useState(false);
  const [retornoSenha, setRetornoSenha] = useState<Resultado | null>(null);
  const [definindoSenha, iniciarSenha] = useTransition();
  const [retornoEmail, setRetornoEmail] = useState<Resultado | null>(null);
  const [enviandoEmail, iniciarEmail] = useTransition();

  function alternarCurso(cursoId: string) {
    setRetornoAcesso(null);
    setAtivos((atuais) => {
      const proximos = new Set(atuais);
      proximos.has(cursoId) ? proximos.delete(cursoId) : proximos.add(cursoId);
      return proximos;
    });
  }

  function salvar() {
    setRetornoAcesso(null);
    iniciarAcesso(async () => {
      const resultado = await salvarAcessos(alunaId, Array.from(ativos));
      setRetornoAcesso(resultado);
      if (resultado.ok) router.refresh();
    });
  }

  function abrirEditor(cursoId: string, expiresAt?: string | null) {
    setRetornoPrazo(null);
    if (editando === cursoId) {
      setEditando(null);
      return;
    }
    setEditando(cursoId);
    setTempo('12m');
    setDataFim(expiresAt ? new Date(expiresAt).toISOString().slice(0, 10) : '');
  }

  function aplicarPrazo(cursoId: string) {
    if (!definirPrazo) return;
    if (tempo === 'custom' && !dataFim) {
      setRetornoPrazo({ ok: false, mensagem: 'Escolha a data em que o acesso deve terminar.' });
      return;
    }
    setRetornoPrazo(null);
    iniciarPrazo(async () => {
      const resultado = await definirPrazo({
        alunaId,
        cursoId,
        tempo,
        dataFim: tempo === 'custom' ? dataFim : undefined
      });
      setRetornoPrazo(resultado);
      if (resultado.ok) {
        setEditando(null);
        router.refresh();
      }
    });
  }

  function salvarDadosAluna() {
    if (!salvarDados) return;
    if (!nome.trim() || !/^\S+@\S+\.\S+$/.test(email.trim())) {
      setRetornoDados({ ok: false, mensagem: 'Preencha o nome completo e um e-mail válido.' });
      return;
    }
    setRetornoDados(null);
    iniciarDados(async () => {
      const resultado = await salvarDados({
        id: alunaId,
        nome: nome.trim(),
        email: email.trim().toLowerCase(),
        telefone
      });
      setRetornoDados(resultado);
      if (resultado.ok) router.refresh();
    });
  }

  function definirSenha() {
    if (!definirNovaSenha) return;
    if (modoSenha === 'custom' && senhaCustom.trim().length < 6) {
      setRetornoSenha({ ok: false, mensagem: 'A senha precisa ter pelo menos 6 caracteres.' });
      return;
    }
    if (!window.confirm('Isso define uma senha nova para a aluna. A senha atual dela deixa de funcionar. Continuar?')) return;
    setRetornoSenha(null);
    setRetornoEmail(null);
    iniciarSenha(async () => {
      const resultado = await definirNovaSenha({
        alunaId,
        senha: modoSenha === 'custom' ? senhaCustom.trim() : undefined
      });
      if (resultado.ok && resultado.senha) {
        setAcessoDefinido({ senha: resultado.senha, whatsappUrl: resultado.whatsappUrl ?? null });
      } else {
        setRetornoSenha({ ok: false, mensagem: resultado.mensagem });
      }
    });
  }

  function copiarSenha() {
    if (!acessoDefinido) return;
    void navigator.clipboard?.writeText(acessoDefinido.senha);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 1500);
  }

  function abrirWhatsapp() {
    if (acessoDefinido?.whatsappUrl) window.open(acessoDefinido.whatsappUrl, '_blank', 'noopener');
  }

  function enviarEmail() {
    if (!enviarAcessoEmail || !acessoDefinido) return;
    setRetornoEmail(null);
    iniciarEmail(async () => {
      const resultado = await enviarAcessoEmail({ alunaId, senha: acessoDefinido.senha });
      setRetornoEmail(resultado);
    });
  }

  function novaSenha() {
    setAcessoDefinido(null);
    setSenhaCustom('');
    setModoSenha('auto');
    setRetornoSenha(null);
    setRetornoEmail(null);
    setCopiado(false);
  }

  return (
    <>
      <div className="tabs">
        <button type="button" className={aba === 'dados' ? 'on' : ''} onClick={() => setAba('dados')}>Dados</button>
        <button type="button" className={aba === 'acesso' ? 'on' : ''} onClick={() => setAba('acesso')}>Acesso aos cursos</button>
      </div>

      {aba === 'dados' ? (
        <div className="dados-grid">
          <div className="dcard">
            <h2>Dados da aluna</h2>
            <p className="dsub">Nome, e-mail e WhatsApp. Edite direto aqui.</p>
            <label className="dfield"><span>Nome completo</span><input value={nome} onChange={(e) => setNome(e.target.value)} autoComplete="name" /></label>
            <label className="dfield"><span>E-mail</span><input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" /></label>
            <label className="dfield"><span>Celular / WhatsApp</span><input value={telefone} onChange={(e) => setTelefone(e.target.value)} placeholder="(84) 99999-9999" inputMode="tel" /></label>
            <button className="btn-pink-sq" type="button" onClick={salvarDadosAluna} disabled={salvandoDados || !salvarDados}>{salvandoDados ? 'Salvando...' : 'Salvar dados'}</button>
            {retornoDados && <div className={`dmsg ${retornoDados.ok ? 'ok' : 'err'}`}>{retornoDados.mensagem}</div>}
          </div>

          <div className="dcard">
            <h2><Mail size={16} /> Reenviar acesso</h2>
            <p className="dsub">Defina uma senha nova e envie por WhatsApp ou e-mail. Use quando a aluna perdeu o e-mail ou não consegue entrar.</p>

            {!acessoDefinido ? (
              <>
                <div className="ra-seg">
                  <button type="button" className={modoSenha === 'auto' ? 'on' : ''} onClick={() => setModoSenha('auto')}>Gerar automática</button>
                  <button type="button" className={modoSenha === 'custom' ? 'on' : ''} onClick={() => setModoSenha('custom')}>Escolher senha</button>
                </div>
                {modoSenha === 'custom' && (
                  <label className="ra-field">
                    <span>Nova senha (mín. 6 caracteres)</span>
                    <input value={senhaCustom} onChange={(e) => { setSenhaCustom(e.target.value); setRetornoSenha(null); }} placeholder="Ex.: Loja2026" autoComplete="off" />
                  </label>
                )}
                <button className="btn-pink-sq" type="button" onClick={definirSenha} disabled={definindoSenha || !definirNovaSenha}>{definindoSenha ? 'Definindo...' : 'Definir senha'}</button>
                {retornoSenha && <div className={`dmsg ${retornoSenha.ok ? 'ok' : 'err'}`}>{retornoSenha.mensagem}</div>}
              </>
            ) : (
              <div className="ra-result">
                <div className="ra-ok"><Check size={15} /> Senha definida — pronta pra enviar</div>
                <div className="ra-pass">
                  <code>{acessoDefinido.senha}</code>
                  <button type="button" onClick={copiarSenha}><Copy size={13} /> {copiado ? 'Copiado' : 'Copiar'}</button>
                </div>
                <div className="ra-send">
                  {acessoDefinido.whatsappUrl ? (
                    <button type="button" className="ra-wpp" onClick={abrirWhatsapp}><MessageCircle size={16} /> Enviar por WhatsApp</button>
                  ) : (
                    <div className="ra-nowpp">Sem WhatsApp no cadastro. Salve o número na aba “Dados” pra habilitar o envio.</div>
                  )}
                  <button type="button" className="ra-mail" onClick={enviarEmail} disabled={enviandoEmail || !enviarAcessoEmail}><Mail size={16} /> {enviandoEmail ? 'Enviando...' : 'Enviar por e-mail'}</button>
                </div>
                {retornoEmail && <div className={`dmsg ${retornoEmail.ok ? 'ok' : 'err'}`}>{retornoEmail.mensagem}</div>}
                <button type="button" className="ra-again" onClick={novaSenha}>Definir outra senha</button>
              </div>
            )}

            <style>{`
              .ra-seg{display:flex;gap:8px;margin:2px 0 12px}
              .ra-seg button{flex:1;font:inherit;font-size:12.5px;font-weight:600;color:#c9c9d2;background:#1b1b1f;border:1px solid #34343a;border-radius:9px;padding:9px;cursor:pointer;transition:.15s}
              .ra-seg button:hover{border-color:#5a5a63}
              .ra-seg button.on{background:rgba(255,46,99,.14);border-color:#ff2e63;color:#fff}
              .ra-field{display:grid;gap:6px;margin-bottom:12px}
              .ra-field>span{font-size:12px;font-weight:700;color:#ddd}
              .ra-field input{width:100%;box-sizing:border-box;background:#1b1b1f;color:#fff;border:1px solid #35353b;border-radius:9px;padding:11px 12px;outline:none;font:500 14px Archivo,Arial,sans-serif;letter-spacing:.3px}
              .ra-field input:focus{border-color:#ff2e63;box-shadow:0 0 0 3px rgba(255,46,99,.12)}
              .ra-result{display:grid;gap:12px}
              .ra-ok{display:flex;align-items:center;gap:6px;font-size:12.5px;font-weight:600;color:#8ce3aa}
              .ra-pass{display:flex;align-items:center;justify-content:space-between;gap:10px;background:#0f0f12;border:1px solid #2b2b31;border-radius:9px;padding:10px 12px}
              .ra-pass code{font:600 15px ui-monospace,'SFMono-Regular',Menlo,monospace;color:#fff;letter-spacing:.5px;word-break:break-all}
              .ra-pass button{display:inline-flex;align-items:center;gap:5px;flex:none;font:inherit;font-size:12px;color:#c9c9d2;background:transparent;border:1px solid #34343a;border-radius:7px;padding:6px 10px;cursor:pointer;transition:.15s}
              .ra-pass button:hover{border-color:#5a5a63;color:#fff}
              .ra-send{display:flex;flex-wrap:wrap;gap:8px}
              .ra-send button{display:inline-flex;align-items:center;justify-content:center;gap:6px;flex:1;min-width:150px;font:inherit;font-size:13.5px;font-weight:700;border-radius:9px;padding:11px;cursor:pointer;transition:.15s;border:1px solid transparent}
              .ra-send button:disabled{opacity:.55;cursor:not-allowed}
              .ra-wpp{background:#25D366;color:#08351b}
              .ra-wpp:hover{background:#1fbe59}
              .ra-mail{background:transparent;color:#e6e6ea;border-color:#3a3a42 !important}
              .ra-mail:hover{border-color:#5a5a63 !important}
              .ra-nowpp{flex:1;min-width:150px;display:flex;align-items:center;font-size:11.5px;color:#c98aa0;line-height:1.45}
              .ra-again{justify-self:start;background:transparent;border:none;color:#8a8a93;font:inherit;font-size:12px;text-decoration:underline;cursor:pointer;padding:0}
              .ra-again:hover{color:#c9c9d2}
            `}</style>
          </div>
        </div>
      ) : (
        <>
          <div className="acc-head">
            <div>
              <h2>Liberar acesso aos cursos</h2>
              <p>Ligue o curso para liberar e defina até quando a aluna terá acesso. Só os cursos ligados aparecem na área dela.</p>
            </div>
            <div className="bulk">
              <button className="btn-ghost" type="button" onClick={() => { setAtivos(new Set(cursos.map((c) => c.id))); setRetornoAcesso(null); }}>Liberar todos</button>
              <button className="btn-ghost" type="button" onClick={() => { setAtivos(new Set()); setRetornoAcesso(null); }}>Bloquear todos</button>
            </div>
          </div>

          <div className="courses">
            {cursos.length === 0 ? (
              <div className="crow">
                <div className="info">
                  <h3>Nenhum curso cadastrado</h3>
                  <small>Cadastre o primeiro curso no painel administrativo.</small>
                </div>
              </div>
            ) : (
              cursos.map((curso) => {
                const ativo = ativos.has(curso.id);
                const venceu = curso.expiresAt ? new Date(curso.expiresAt).getTime() < Date.now() : false;
                const dataLabel = formatarData(curso.expiresAt);
                return (
                  <div className="crow" key={curso.id}>
                    <div
                      className="thumb t-pk"
                      style={curso.capa ? { backgroundImage: `url(${curso.capa})`, backgroundSize: 'cover', backgroundPosition: 'center' } : undefined}
                    >
                      {!curso.capa && <span>{curso.titulo}</span>}
                    </div>
                    <div className="info">
                      <h3>{curso.titulo}</h3>
                      <small>{curso.subtitulo || 'Curso da Academia de Vendas'}</small>
                      {ativo && (
                        <button type="button" className={`venc-chip${venceu ? ' exp' : ''}`} onClick={() => abrirEditor(curso.id, curso.expiresAt)}>
                          <Clock size={13} />
                          {dataLabel ? (venceu ? `venceu em ${dataLabel}` : `acesso até ${dataLabel}`) : 'sem prazo definido'}
                          <span className="edit">{venceu ? 'renovar' : 'alterar tempo'}</span>
                        </button>
                      )}
                    </div>
                    <span className={`state ${ativo ? 'lib' : 'blo'}`}>{ativo ? 'Liberado' : 'Bloqueado'}</span>
                    <button
                      type="button"
                      className={`toggle ${ativo ? 'on' : 'off'}`}
                      aria-label={`${ativo ? 'Bloquear' : 'Liberar'} ${curso.titulo}`}
                      aria-pressed={ativo}
                      onClick={() => alternarCurso(curso.id)}
                      style={{ border: 0, padding: 0 }}
                    />

                    {editando === curso.id && (
                      <div className="pz-editor">
                        <div className="pz-lbl">{venceu ? 'Renovar o acesso' : 'Novo tempo de acesso'} — {curso.titulo}</div>
                        <div className="pz-chips">
                          {ATALHOS.map(([valor, rotulo]) => (
                            <button key={valor} type="button" className={`pz-chip${tempo === valor ? ' on' : ''}`} onClick={() => setTempo(valor)}>
                              {valor === 'custom' ? rotulo : `+${rotulo}`}
                            </button>
                          ))}
                        </div>
                        {tempo === 'custom' && (
                          <input type="date" className="pz-date" value={dataFim} min={new Date().toISOString().slice(0, 10)} onChange={(e) => setDataFim(e.target.value)} />
                        )}
                        <div className="pz-bar">
                          <button className="btn-ghost" type="button" onClick={() => setEditando(null)}>Cancelar</button>
                          <button className="btn-pink-sq" type="button" onClick={() => aplicarPrazo(curso.id)} disabled={salvandoPrazo || !definirPrazo}>{salvandoPrazo ? 'Aplicando...' : 'Aplicar'}</button>
                        </div>
                        {retornoPrazo && <div className={`dmsg ${retornoPrazo.ok ? 'ok' : 'err'}`}>{retornoPrazo.mensagem}</div>}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>

          <div className="foot">
            <div className="summary">
              <b>{ativos.size}</b> de <b>{cursos.length}</b> cursos liberados para {alunaNome}
            </div>
            <button className="btn-pink-sq" type="button" onClick={salvar} disabled={salvandoAcesso || cursos.length === 0}>{salvandoAcesso ? 'Salvando...' : 'Salvar acessos'}</button>
          </div>

          {retornoAcesso && (
            <div className="ac-note" style={retornoAcesso.ok ? { color: '#8ce3aa', borderColor: 'rgba(55,194,106,.45)' } : { color: '#ff9d9d', borderColor: 'rgba(224,64,63,.45)' }}>
              {retornoAcesso.mensagem}
            </div>
          )}

          <div className="ac-note">
            <Info size={16} />
            Quando a compra vem pelo checkout, o acesso é liberado automaticamente. Esta tela é para liberar, bloquear e ajustar o prazo na mão — cortesia, suporte ou renovação.
          </div>
        </>
      )}
    </>
  );
}
