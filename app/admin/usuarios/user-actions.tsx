'use client';

import { ChangeEvent, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Pencil, Trash2, Download, Upload, X, Filter, Mail, BookOpen, UserRound, Clock } from 'lucide-react';

type Resultado = { ok: boolean; mensagem: string };
type CriarUsuario = (dados: {
  nome: string;
  email: string;
  telefone?: string;
  cursoId?: string;
  tempoAcesso?: string;
  dataFim?: string;
  enviarBoasVindas: boolean;
}) => Promise<Resultado>;
type CursoOpcao = { id: string; title: string; slug: string };
type EditarUsuario = (dados: {
  id: string;
  nome: string;
  email: string;
}) => Promise<Resultado>;
type ApagarUsuario = (dados: { id: string; confirmacao: string }) => Promise<Resultado>;
type AlunaImportada = { nome: string; email: string; telefone?: string; dataExpiracao?: string; dataCompra?: string };
type PlanoOpcao = { id: string; name: string };
type ImportarUsuarios = (dados: AlunaImportada[], opcoes?: { enviarBoasVindas?: boolean; cursoIds?: string[]; planoIds?: string[] }) => Promise<Resultado>;

function mostrarResultado(resultado: Resultado) {
  window.alert(resultado.mensagem);
}


function normalizarCabecalho(valor: string) {
  return valor.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function lerCsv(conteudo: string): AlunaImportada[] {
  const linhas = conteudo.replace(/^\uFEFF/, '').split(/\r?\n/).filter((linha) => linha.trim());
  if (linhas.length < 2) return [];
  const separador = (linhas[0].match(/;/g) || []).length >= (linhas[0].match(/,/g) || []).length ? ';' : ',';
  const cabecalhos = linhas[0].split(separador).map(normalizarCabecalho);
  const indiceNome = cabecalhos.findIndex((item) => ['nome', 'name', 'nome completo'].includes(item));
  const indiceEmail = cabecalhos.findIndex((item) => ['email', 'e-mail'].includes(item));
  const indiceTelefone = cabecalhos.findIndex((item) => ['telefone', 'phone', 'whatsapp', 'celular'].includes(item));
  const indiceExpira = cabecalhos.findIndex((item) => ['data de expiracao', 'expiracao', 'validade', 'data de validade', 'acesso ate', 'expira em'].includes(item));
  const indiceCompra = cabecalhos.findIndex((item) => ['data da compra', 'data de compra', 'compra', 'comprado em'].includes(item));
  if (indiceNome < 0 || indiceEmail < 0) return [];

  return linhas.slice(1).map((linha) => {
    const colunas = linha.split(separador).map((item) => item.trim().replace(/^"|"$/g, '').replace(/""/g, '"'));
    return {
      nome: colunas[indiceNome] || '',
      email: colunas[indiceEmail] || '',
      telefone: indiceTelefone >= 0 ? colunas[indiceTelefone] || '' : '',
      dataExpiracao: indiceExpira >= 0 ? colunas[indiceExpira] || '' : '',
      dataCompra: indiceCompra >= 0 ? colunas[indiceCompra] || '' : ''
    };
  }).filter((item) => item.nome || item.email);
}

export function ListaUsuariosButtons({ importarUsuarios, cursos = [], planos = [] }: { importarUsuarios: ImportarUsuarios; cursos?: CursoOpcao[]; planos?: PlanoOpcao[] }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [aberto, setAberto] = useState(false);
  const [processando, setProcessando] = useState(false);
  const [arquivoNome, setArquivoNome] = useState('');
  const [alunas, setAlunas] = useState<AlunaImportada[]>([]);
  const [erro, setErro] = useState('');
  const [enviarBoasVindas, setEnviarBoasVindas] = useState(false);
  const [cursoIds, setCursoIds] = useState<string[]>([]);
  const [planoIds, setPlanoIds] = useState<string[]>([]);

  const alternarCurso = (id: string) =>
    setCursoIds((atual) => (atual.includes(id) ? atual.filter((x) => x !== id) : [...atual, id]));
  const alternarPlano = (id: string) =>
    setPlanoIds((atual) => (atual.includes(id) ? atual.filter((x) => x !== id) : [...atual, id]));

  function fechar() {
    if (processando) return;
    setAberto(false);
    setArquivoNome('');
    setAlunas([]);
    setErro('');
    setEnviarBoasVindas(false);
    setCursoIds([]);
    setPlanoIds([]);
  }

  async function carregarArquivo(arquivo?: File) {
    if (!arquivo) return;
    setErro('');
    if (!arquivo.name.toLowerCase().endsWith('.csv')) {
      setErro('Escolha um arquivo CSV. No Excel, use “Salvar como” e selecione CSV.');
      return;
    }
    const linhas = lerCsv(await arquivo.text());
    if (!linhas.length) {
      setErro('Não encontrei as colunas Nome e Email. Confira o cabeçalho da planilha.');
      return;
    }
    setArquivoNome(arquivo.name);
    setAlunas(linhas);
  }

  async function selecionarArquivo(event: ChangeEvent<HTMLInputElement>) {
    const arquivo = event.target.files?.[0];
    event.target.value = '';
    await carregarArquivo(arquivo);
  }

  async function criarAlunas() {
    if (!alunas.length) return;
    setProcessando(true);
    setErro('');
    try {
      const resultado = await importarUsuarios(alunas, { enviarBoasVindas, cursoIds, planoIds });
      if (!resultado.ok) {
        setErro(resultado.mensagem);
        return;
      }
      window.alert(resultado.mensagem);
      setProcessando(false);
      fechar();
      router.refresh();
    } catch {
      setErro('Não foi possível concluir a importação. Tente novamente.');
    } finally {
      setProcessando(false);
    }
  }

  return (
    <>
      <a className="btn-ghost" href="/api/admin/alunas-export" download>
        <Download size={15} /> Baixar
      </a>
      <button className="btn-ghost" type="button"><Filter size={15} /> Filtrar</button>
      <button className="btn-pink" type="button" onClick={() => setAberto(true)}>
        <Plus size={15} /> Subir planilha
      </button>

      {aberto && (
        <div className="import-overlay" role="dialog" aria-modal="true" aria-labelledby="import-title">
          <div className="import-modal">
            <div className="import-head">
              <div>
                <h3 id="import-title">Subir alunas por planilha</h3>
                <p>Cria as contas em massa a partir de um arquivo.</p>
              </div>
              <button className="import-close" type="button" onClick={fechar} aria-label="Fechar"><X size={18} /></button>
            </div>

            <div className="import-body">
              <div className="import-notice">
                <span>{enviarBoasVindas ? '📧' : '🔕'}</span>
                <p>{enviarBoasVindas
                  ? <><b>Com envio de e-mail:</b> cada aluna recebe login, senha provisória de 6 dígitos e link de acesso{cursoIds.length ? ' — já com o(s) curso(s) liberado(s)' : ''}.</>
                  : <><b>Modo silencioso:</b> cria as contas sem enviar e-mail, WhatsApp nem senha.{cursoIds.length ? ' Os cursos escolhidos já ficam liberados.' : ' Você libera os cursos depois, na mão.'}</>}</p>
              </div>

              <p className="import-help">A planilha precisa ter <code>Nome</code>, <code>Email</code> e <code>Telefone</code> — uma aluna por linha. Opcional: <code>Data de expiração</code> e <code>Data da compra</code> (DD/MM/AAAA), pra cada aluna manter a validade dela. No Excel, salve como <code>CSV</code>.</p>

              <div
                className="import-drop"
                onClick={() => inputRef.current?.click()}
                onDragOver={(event) => event.preventDefault()}
                onDrop={(event) => {
                  event.preventDefault();
                  void carregarArquivo(event.dataTransfer.files?.[0]);
                }}
              >
                <Upload size={24} />
                <strong>{arquivoNome || 'Arraste o CSV aqui'}</strong>
                <span>{arquivoNome ? `${alunas.length} aluna(s) encontrada(s)` : 'ou clique para escolher — só CSV'}</span>
              </div>
              <input ref={inputRef} type="file" accept=".csv,text/csv" hidden onChange={selecionarArquivo} />

              {erro && <div className="import-error">{erro}</div>}
              {alunas.length > 0 && (
                <div className="import-preview">
                  <b>Prévia: {alunas.length} aluna(s)</b>
                  <span>{alunas.slice(0, 3).map((a) => a.nome).join(' • ')}{alunas.length > 3 ? '…' : ''}</span>
                </div>
              )}

              <div className="iu-opts">
                {planos.length > 0 && (
                  <div className="iu-block">
                    <div className="iu-lbl">Liberar por plano <small>(opcional — libera os cursos do plano e usa a validade dele)</small></div>
                    <div className="iu-chips">
                      {planos.map((plano) => (
                        <button
                          key={plano.id}
                          type="button"
                          className={`iu-chip${planoIds.includes(plano.id) ? ' on' : ''}`}
                          onClick={() => alternarPlano(plano.id)}
                        >
                          {planoIds.includes(plano.id) ? '✓ ' : ''}{plano.name}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {cursos.length > 0 && (
                  <div className="iu-block">
                    <div className="iu-lbl">Liberar acesso aos cursos <small>(opcional — vale para todas)</small></div>
                    <div className="iu-chips">
                      {cursos.map((curso) => (
                        <button
                          key={curso.id}
                          type="button"
                          className={`iu-chip${cursoIds.includes(curso.id) ? ' on' : ''}`}
                          onClick={() => alternarCurso(curso.id)}
                        >
                          {cursoIds.includes(curso.id) ? '✓ ' : ''}{curso.title}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <label className="iu-switch-row">
                  <span className="iu-switch-copy">
                    <strong>Enviar e-mail de boas-vindas com a senha</strong>
                    <small>Manda login, senha provisória de 6 dígitos e link de acesso para cada aluna.</small>
                  </span>
                  <input type="checkbox" checked={enviarBoasVindas} onChange={(e) => setEnviarBoasVindas(e.target.checked)} />
                  <span className="iu-switch" aria-hidden="true" />
                </label>
                {enviarBoasVindas && <div className="iu-hint">Com e-mail ligado, importe até <b>100</b> por vez pra não estourar o tempo do servidor. Acima disso, faça em levas.</div>}
              </div>

              <style>{`
                .iu-opts{display:grid;gap:14px;margin-top:16px}
                .iu-block{display:grid;gap:9px}
                .iu-lbl{font-size:12.5px;font-weight:700;color:#f5f5f7}
                .iu-lbl small{font-weight:500;color:#92929d}
                .iu-chips{display:flex;flex-wrap:wrap;gap:8px}
                .iu-chip{font:inherit;font-size:12.5px;font-weight:600;color:#c9c9d2;background:#1c1c20;border:1px solid #34343a;border-radius:999px;padding:8px 13px;cursor:pointer;transition:.15s}
                .iu-chip:hover{border-color:#5a5a63}
                .iu-chip.on{background:rgba(255,46,99,.16);border-color:#ff2e63;color:#fff}
                .iu-switch-row{position:relative;display:flex;align-items:center;gap:11px;background:#1a1719;border:1px solid #40232c;border-radius:12px;padding:13px;cursor:pointer}
                .iu-switch-copy{display:grid;gap:3px;flex:1}
                .iu-switch-copy strong{font-size:12.5px}
                .iu-switch-copy small{font-size:10.5px;color:#92929d;line-height:1.4}
                .iu-switch-row input{position:absolute;opacity:0}
                .iu-switch{width:42px;height:23px;border-radius:20px;background:#3a3a40;position:relative;flex:none;transition:.2s}
                .iu-switch:after{content:'';position:absolute;width:19px;height:19px;left:2px;top:2px;border-radius:50%;background:#fff;transition:.2s}
                .iu-switch-row input:checked + .iu-switch{background:#ff2e63}
                .iu-switch-row input:checked + .iu-switch:after{transform:translateX(19px)}
                .iu-hint{font-size:11px;color:#c98aa0;line-height:1.5}
              `}</style>
            </div>

            <div className="import-foot">
              <span>{alunas.length ? `${arquivoNome} pronto para importar.` : 'Escolha um arquivo pra ver a prévia.'}</span>
              <div>
                <button className="btn-ghost" type="button" onClick={fechar} disabled={processando}>Cancelar</button>
                <button className="btn-pink" type="button" onClick={criarAlunas} disabled={!alunas.length || processando}>
                  {processando ? 'Criando...' : 'Criar alunas'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export function NovoUsuarioButton({ criarUsuario, cursos }: { criarUsuario: CriarUsuario; cursos: CursoOpcao[] }) {
  const router = useRouter();
  const [aberto, setAberto] = useState(false);
  const [processando, setProcessando] = useState(false);
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [telefone, setTelefone] = useState('');
  const [cursoId, setCursoId] = useState('');
  const [tempo, setTempo] = useState('12m');
  const [dataFim, setDataFim] = useState('');
  const [enviarBoasVindas, setEnviarBoasVindas] = useState(true);
  const [erro, setErro] = useState('');
  const [sucesso, setSucesso] = useState('');

  function fechar() {
    if (processando) return;
    setAberto(false);
    setNome('');
    setEmail('');
    setTelefone('');
    setCursoId('');
    setTempo('12m');
    setDataFim('');
    setEnviarBoasVindas(true);
    setErro('');
    setSucesso('');
  }

  function dataVencimento(): Date | null {
    const alvo = new Date();
    if (tempo === '30d') alvo.setDate(alvo.getDate() + 30);
    else if (tempo === '3m') alvo.setMonth(alvo.getMonth() + 3);
    else if (tempo === '6m') alvo.setMonth(alvo.getMonth() + 6);
    else if (tempo === '12m') alvo.setFullYear(alvo.getFullYear() + 1);
    else if (tempo === 'custom') {
      if (!dataFim) return null;
      const fim = new Date(`${dataFim}T23:59:59`);
      return Number.isNaN(fim.getTime()) ? null : fim;
    } else return null;
    return alvo;
  }

  async function cadastrar(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErro('');
    setSucesso('');
    if (!nome.trim() || !/^\S+@\S+\.\S+$/.test(email.trim())) {
      setErro('Preencha o nome completo e um e-mail válido.');
      return;
    }
    if (cursoId && tempo === 'custom' && !dataFim) {
      setErro('Escolha a data em que o acesso deve terminar.');
      return;
    }
    setProcessando(true);
    try {
      const resultado = await criarUsuario({
        nome: nome.trim(),
        email: email.trim().toLowerCase(),
        telefone,
        cursoId: cursoId || undefined,
        tempoAcesso: cursoId ? tempo : undefined,
        dataFim: cursoId && tempo === 'custom' ? dataFim : undefined,
        enviarBoasVindas
      });
      if (!resultado.ok) {
        setErro(resultado.mensagem);
        return;
      }
      setSucesso(resultado.mensagem);
      router.refresh();
    } catch {
      setErro('Não foi possível concluir o cadastro. Tente novamente.');
    } finally {
      setProcessando(false);
    }
  }

  return (
    <>
      <button className="btn-pink" type="button" onClick={() => setAberto(true)} disabled={processando}>
        <Plus size={16} /> Cadastrar aluna
      </button>

      {aberto && (
        <div className="new-user-overlay" role="dialog" aria-modal="true" aria-labelledby="new-user-title">
          <form className="new-user-modal" onSubmit={cadastrar}>
            <div className="new-user-head">
              <div className="new-user-title-wrap">
                <span className="new-user-icon"><UserRound size={22} /></span>
                <div><h3 id="new-user-title">Cadastrar nova aluna</h3><p>Crie a conta e, se quiser, já libere um curso.</p></div>
              </div>
              <button className="new-user-close" type="button" onClick={fechar} aria-label="Fechar"><X size={18} /></button>
            </div>

            <div className="new-user-body">
              <label className="new-user-field"><span>Nome completo <b>*</b></span><input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex.: Maria da Silva" autoComplete="name" required /></label>
              <label className="new-user-field"><span>E-mail <b>*</b></span><input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="maria@email.com" autoComplete="email" required /></label>
              <label className="new-user-field"><span>Celular / WhatsApp <small>(opcional)</small></span><input value={telefone} onChange={(e) => setTelefone(e.target.value)} placeholder="(84) 99999-9999" inputMode="tel" autoComplete="tel" /></label>
              <label className="new-user-field"><span>Curso a liberar <small>(opcional)</small></span><div className="new-user-select"><BookOpen size={16} /><select value={cursoId} onChange={(e) => setCursoId(e.target.value)}><option value="">Criar sem liberar curso</option>{cursos.map((curso) => <option key={curso.id} value={curso.id}>{curso.title}</option>)}</select></div><em>Você pode criar a conta sem curso e liberar o acesso depois.</em></label>

              {cursoId && (
                <div className="new-user-tempo">
                  <div className="nu-tempo-lbl"><Clock size={15} /> Tempo de acesso</div>
                  <div className="nu-chips">
                    {([['30d', '30 dias'], ['3m', '3 meses'], ['6m', '6 meses'], ['12m', '12 meses'], ['custom', 'Data exata…']] as const).map(([valor, rotulo]) => (
                      <button key={valor} type="button" className={`nu-chip${tempo === valor ? ' on' : ''}`} onClick={() => setTempo(valor)}>{rotulo}</button>
                    ))}
                  </div>
                  {tempo === 'custom' && (
                    <input type="date" className="nu-date" value={dataFim} min={new Date().toISOString().slice(0, 10)} onChange={(e) => setDataFim(e.target.value)} />
                  )}
                  <div className="nu-tempo-foot">
                    {dataVencimento()
                      ? <>Acesso liberado até <b>{new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Fortaleza' }).format(dataVencimento() as Date)}</b>. Depois disso a aluna deixa de ver o curso automaticamente.</>
                      : 'Escolha a data em que o acesso deve terminar.'}
                  </div>
                </div>
              )}

              <label className="new-user-switch-row">
                <span className="new-user-mail"><Mail size={17} /></span>
                <span className="new-user-switch-copy"><strong>Enviar e-mail de boas-vindas com a senha</strong><small>Envia login, senha provisória de 6 dígitos e link de acesso.</small></span>
                <input type="checkbox" checked={enviarBoasVindas} onChange={(e) => setEnviarBoasVindas(e.target.checked)} />
                <span className="new-user-switch" aria-hidden="true" />
              </label>
              {!enviarBoasVindas && <div className="new-user-silent">🔕 A conta será criada em silêncio. Nenhum e-mail ou WhatsApp será enviado.</div>}
              {erro && <div className="new-user-error">{erro}</div>}
              {sucesso && <div className="new-user-success">{sucesso}</div>}
            </div>

            <div className="new-user-foot">
              <button className="btn-ghost" type="button" onClick={fechar} disabled={processando}>{sucesso ? 'Fechar' : 'Cancelar'}</button>
              {!sucesso && <button className="btn-pink" type="submit" disabled={processando}>{processando ? 'Cadastrando...' : 'Cadastrar aluna'}</button>}
            </div>
          </form>
          <style>{`
            .new-user-overlay{position:fixed;inset:0;z-index:1100;background:rgba(3,3,5,.86);display:grid;place-items:center;padding:18px;font-family:Archivo,Arial,sans-serif}
            .new-user-modal{width:min(570px,100%);max-height:calc(100dvh - 36px);overflow:auto;background:#111113;border:1px solid #2b2b31;border-radius:18px;box-shadow:0 28px 90px rgba(0,0,0,.65);color:#fff}
            .new-user-head,.new-user-foot{display:flex;align-items:center;justify-content:space-between;gap:16px;padding:19px 21px}.new-user-head{border-bottom:1px solid #25252a}.new-user-title-wrap{display:flex;align-items:center;gap:12px}.new-user-icon,.new-user-mail{display:grid;place-items:center;color:#ff2e63;background:#26151b;border-radius:10px}.new-user-icon{width:42px;height:42px}.new-user-head h3{font-size:19px;margin:0 0 3px}.new-user-head p{font-size:12px;color:#92929d;margin:0}.new-user-close{width:32px;height:32px;display:grid;place-items:center;background:#1c1c20;color:#aaa;border:1px solid #34343a;border-radius:8px;cursor:pointer}
            .new-user-body{display:grid;gap:15px;padding:20px 21px}.new-user-field{display:grid;gap:7px}.new-user-field>span{font-size:12px;font-weight:700;color:#ddd}.new-user-field b{color:#ff2e63}.new-user-field small,.new-user-field em{color:#858590;font-size:11px;font-weight:400;font-style:normal}.new-user-field input,.new-user-field select{width:100%;box-sizing:border-box;background:#1b1b1f;color:#fff;border:1px solid #35353b;border-radius:10px;padding:12px 13px;outline:none;font:500 14px Archivo,Arial,sans-serif}.new-user-field input:focus,.new-user-field select:focus{border-color:#ff2e63;box-shadow:0 0 0 3px rgba(255,46,99,.12)}.new-user-select{position:relative}.new-user-select svg{position:absolute;left:12px;top:13px;color:#ff2e63;pointer-events:none}.new-user-select select{padding-left:38px;appearance:none}.new-user-select option{background:#18181b}
            .new-user-tempo{display:grid;gap:9px;background:#141013;border:1px solid #2a2023;border-radius:12px;padding:13px}.nu-tempo-lbl{display:flex;align-items:center;gap:7px;font-size:12px;font-weight:700;color:#ddd}.nu-tempo-lbl svg{color:#ff2e63}.nu-chips{display:flex;flex-wrap:wrap;gap:7px}.nu-chip{font:inherit;font-size:12.5px;font-weight:700;color:#c9c9d2;background:#1c1c20;border:1px solid #34343a;border-radius:999px;padding:8px 14px;cursor:pointer;transition:.15s}.nu-chip:hover{border-color:#5a5a63}.nu-chip.on{background:rgba(255,46,99,.16);border-color:#ff2e63;color:#fff}.nu-date{width:auto;background:#1b1b1f;color:#fff;border:1px solid #35353b;border-radius:10px;padding:10px 12px;outline:none;font:500 13px Archivo,Arial,sans-serif;color-scheme:dark}.nu-date:focus{border-color:#ff2e63}.nu-tempo-foot{font-size:11px;color:#8a8a93;line-height:1.5}.nu-tempo-foot b{color:#cbb9bd;font-weight:700}
            .new-user-switch-row{position:relative;display:flex;align-items:center;gap:11px;background:#1a1719;border:1px solid #40232c;border-radius:12px;padding:13px;cursor:pointer}.new-user-mail{width:34px;height:34px;flex:none}.new-user-switch-copy{display:grid;gap:3px;flex:1}.new-user-switch-copy strong{font-size:12px}.new-user-switch-copy small{font-size:10.5px;color:#92929d;line-height:1.4}.new-user-switch-row input{position:absolute;opacity:0}.new-user-switch{width:42px;height:23px;border-radius:20px;background:#3a3a40;position:relative;flex:none;transition:.2s}.new-user-switch:after{content:'';position:absolute;width:19px;height:19px;left:2px;top:2px;border-radius:50%;background:#fff;transition:.2s}.new-user-switch-row input:checked+.new-user-switch{background:#ff2e63}.new-user-switch-row input:checked+.new-user-switch:after{transform:translateX(19px)}
            .new-user-silent,.new-user-error,.new-user-success{padding:11px 12px;border-radius:9px;font-size:12px;line-height:1.45}.new-user-silent{background:#181d25;border:1px solid #2d486c;color:#cbdaf1}.new-user-error{background:#2b151b;border:1px solid #7f293d;color:#ff9bb2}.new-user-success{background:#14241a;border:1px solid #286c3d;color:#9de8b3}.new-user-foot{border-top:1px solid #25252a;justify-content:flex-end}.new-user-foot button:disabled{opacity:.5;cursor:not-allowed}
            @media(max-width:620px){.new-user-overlay{padding:0;align-items:end}.new-user-modal{width:100%;max-height:94dvh;border-radius:18px 18px 0 0}.new-user-head,.new-user-foot{padding:16px}.new-user-body{padding:17px 16px}.new-user-switch-row{align-items:flex-start}.new-user-switch{margin-top:5px}.new-user-head p{max-width:230px}}
          `}</style>
        </div>
      )}
    </>
  );
}

export function AcoesUsuario({
  id,
  nome,
  email,
  editarUsuario,
  apagarUsuario
}: {
  id: string;
  nome: string;
  email: string;
  editarUsuario: EditarUsuario;
  apagarUsuario: ApagarUsuario;
}) {
  const router = useRouter();
  const [processando, setProcessando] = useState(false);
  const [modalAberto, setModalAberto] = useState(false);
  const [confirmacao, setConfirmacao] = useState('');
  const [erroModal, setErroModal] = useState('');

  async function editar() {
    const novoNome = window.prompt('Nome completo:', nome)?.trim();
    if (!novoNome) return;

    const novoEmail = window.prompt('E-mail:', email)?.trim().toLowerCase();
    if (!novoEmail) return;

    setProcessando(true);
    try {
      const resultado = await editarUsuario({ id, nome: novoNome, email: novoEmail });
      mostrarResultado(resultado);
      if (resultado.ok) router.refresh();
    } finally {
      setProcessando(false);
    }
  }

  function abrirApagar() {
    setConfirmacao('');
    setErroModal('');
    setModalAberto(true);
  }

  function fecharApagar() {
    if (processando) return;
    setModalAberto(false);
  }

  const podeApagar = confirmacao.trim().toUpperCase() === 'CANCELAR';

  async function confirmarApagar() {
    if (!podeApagar) return;
    setProcessando(true);
    setErroModal('');
    try {
      const resultado = await apagarUsuario({ id, confirmacao: confirmacao.trim() });
      if (resultado.ok) {
        setModalAberto(false);
        router.refresh();
      } else {
        setErroModal(resultado.mensagem);
      }
    } finally {
      setProcessando(false);
    }
  }

  return (
    <>
      <span className="iconbtn" title="Editar" onClick={processando ? undefined : editar}>
        <Pencil size={14} />
      </span>
      <span className="iconbtn" title="Remover" onClick={processando ? undefined : abrirApagar}>
        <Trash2 size={14} />
      </span>

      {modalAberto ? (
        <div
          role="dialog"
          aria-modal="true"
          onClick={fecharApagar}
          style={{ position: 'fixed', inset: 0, zIndex: 1200, background: 'rgba(3,3,5,.86)', display: 'grid', placeItems: 'center', padding: 18, fontFamily: 'Archivo,Arial,sans-serif' }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{ width: 'min(460px,100%)', background: '#111113', border: '1px solid #2b2b31', borderRadius: 18, boxShadow: '0 28px 90px rgba(0,0,0,.65)', color: '#fff', overflow: 'hidden' }}
          >
            <div style={{ padding: '20px 22px', borderBottom: '1px solid #2b2b31', display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(255,46,99,.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ff2e63' }}>
                <Trash2 size={18} />
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: 16 }}>Apagar aluna</div>
                <div style={{ fontSize: 12.5, color: '#a1a1aa' }}>Esta ação não pode ser desfeita.</div>
              </div>
            </div>

            <div style={{ padding: '20px 22px' }}>
              <p style={{ fontSize: 14, lineHeight: 1.6, margin: '0 0 12px', color: '#d4d4d8' }}>
                Você vai apagar <strong style={{ color: '#fff' }}>{nome}</strong> ({email}). O login e todos os acessos aos cursos serão removidos.
              </p>
              <p style={{ fontSize: 13, color: '#a1a1aa', margin: '0 0 8px' }}>
                Para confirmar, digite <strong style={{ color: '#ff2e63', letterSpacing: 1 }}>CANCELAR</strong> abaixo:
              </p>
              <input
                value={confirmacao}
                onChange={(e) => { setConfirmacao(e.target.value); setErroModal(''); }}
                placeholder="CANCELAR"
                autoFocus
                style={{ width: '100%', height: 42, background: '#0f0f12', color: '#fff', border: `1px solid ${podeApagar ? '#ff2e63' : '#2b2b31'}`, borderRadius: 10, padding: '0 12px', fontSize: 15, letterSpacing: 1, boxSizing: 'border-box', outline: 'none' }}
              />
              {erroModal ? <p style={{ color: '#f87171', fontSize: 12.5, margin: '10px 0 0' }}>{erroModal}</p> : null}
            </div>

            <div style={{ padding: '16px 22px', borderTop: '1px solid #2b2b31', display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button
                type="button"
                onClick={fecharApagar}
                disabled={processando}
                style={{ background: 'transparent', color: '#d4d4d8', border: '1px solid #2b2b31', borderRadius: 10, padding: '9px 16px', fontSize: 14, cursor: processando ? 'not-allowed' : 'pointer', fontFamily: 'inherit' }}
              >
                Voltar
              </button>
              <button
                type="button"
                onClick={confirmarApagar}
                disabled={!podeApagar || processando}
                style={{ background: '#ff2e63', color: '#fff', border: 'none', borderRadius: 10, padding: '9px 18px', fontSize: 14, fontWeight: 700, cursor: podeApagar && !processando ? 'pointer' : 'not-allowed', opacity: podeApagar && !processando ? 1 : 0.5, fontFamily: 'inherit' }}
              >
                {processando ? 'Apagando…' : 'Apagar aluna'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
