'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Clock, Mail, Info } from 'lucide-react';

export type CursoAcesso = {
  id: string;
  titulo: string;
  subtitulo: string;
  capa: string | null;
  ativo: boolean;
  expiresAt?: string | null;
};

type Resultado = { ok: boolean; mensagem: string };
type DadosAluna = { nome: string; email: string; telefone: string };

type Props = {
  alunaId: string;
  alunaNome: string;
  cursos: CursoAcesso[];
  salvarAcessos: (alunaId: string, cursosAtivos: string[]) => Promise<Resultado>;
  dados?: DadosAluna;
  salvarDados?: (dados: { id: string; nome: string; email: string; telefone: string }) => Promise<Resultado>;
  reenviarAcesso?: (alunaId: string) => Promise<Resultado>;
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
  reenviarAcesso,
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

  // Reenviar acesso
  const [retornoReenvio, setRetornoReenvio] = useState<Resultado | null>(null);
  const [reenviando, iniciarReenvio] = useTransition();

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

  function reenviar() {
    if (!reenviarAcesso) return;
    if (!window.confirm('Isso gera uma senha nova e reenvia o e-mail de acesso. A senha atual da aluna deixa de funcionar. Continuar?')) return;
    setRetornoReenvio(null);
    iniciarReenvio(async () => {
      const resultado = await reenviarAcesso(alunaId);
      setRetornoReenvio(resultado);
    });
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
            <p className="dsub">Gera uma nova senha provisória de 6 dígitos e reenvia o e-mail de boas-vindas com o link de acesso. Use quando a aluna perdeu o e-mail ou não consegue entrar.</p>
            <button className="btn-pink-sq" type="button" onClick={reenviar} disabled={reenviando || !reenviarAcesso}>{reenviando ? 'Reenviando...' : 'Reenviar e-mail com nova senha'}</button>
            {retornoReenvio && <div className={`dmsg ${retornoReenvio.ok ? 'ok' : 'err'}`}>{retornoReenvio.mensagem}</div>}
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
