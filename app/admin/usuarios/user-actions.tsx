'use client';

import { ChangeEvent, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Pencil, Trash2, Download, Upload, X, Filter } from 'lucide-react';

type Resultado = { ok: boolean; mensagem: string };
type CriarUsuario = (dados: {
  nome: string;
  email: string;
  senha: string;
}) => Promise<Resultado>;
type EditarUsuario = (dados: {
  id: string;
  nome: string;
  email: string;
}) => Promise<Resultado>;
type ApagarUsuario = (dados: { id: string; emailConfirmacao: string }) => Promise<Resultado>;
type AlunaImportada = { nome: string; email: string; telefone?: string };
type ImportarUsuarios = (dados: AlunaImportada[]) => Promise<Resultado>;

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
  if (indiceNome < 0 || indiceEmail < 0) return [];

  return linhas.slice(1).map((linha) => {
    const colunas = linha.split(separador).map((item) => item.trim().replace(/^"|"$/g, '').replace(/""/g, '"'));
    return {
      nome: colunas[indiceNome] || '',
      email: colunas[indiceEmail] || '',
      telefone: indiceTelefone >= 0 ? colunas[indiceTelefone] || '' : ''
    };
  }).filter((item) => item.nome || item.email);
}

export function ListaUsuariosButtons({ importarUsuarios }: { importarUsuarios: ImportarUsuarios }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [aberto, setAberto] = useState(false);
  const [processando, setProcessando] = useState(false);
  const [arquivoNome, setArquivoNome] = useState('');
  const [alunas, setAlunas] = useState<AlunaImportada[]>([]);
  const [erro, setErro] = useState('');

  function fechar() {
    if (processando) return;
    setAberto(false);
    setArquivoNome('');
    setAlunas([]);
    setErro('');
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
      const resultado = await importarUsuarios(alunas);
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
                <span>🔕</span>
                <p><b>Modo silencioso:</b> cria as contas sem enviar e-mail, WhatsApp nem senha. As alunas não recebem nenhuma mensagem. Você libera os cursos depois, na mão, quando quiser.</p>
              </div>

              <p className="import-help">A planilha precisa ter as colunas <code>Nome</code>, <code>Email</code> e <code>Telefone</code> — uma aluna por linha. No Excel, salve como <code>CSV</code>.</p>

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

export function NovoUsuarioButton({ criarUsuario }: { criarUsuario: CriarUsuario }) {
  const router = useRouter();
  const [processando, setProcessando] = useState(false);

  async function abrirCadastro() {
    const nome = window.prompt('Nome completo da nova aluna:')?.trim();
    if (!nome) return;

    const email = window.prompt('E-mail da nova aluna:')?.trim().toLowerCase();
    if (!email) return;

    const senha = window.prompt('Crie uma senha provisória com pelo menos 6 caracteres:');
    if (!senha) return;

    setProcessando(true);
    try {
      const resultado = await criarUsuario({ nome, email, senha });
      mostrarResultado(resultado);
      if (resultado.ok) router.refresh();
    } finally {
      setProcessando(false);
    }
  }

  return (
    <button className="btn-pink" onClick={abrirCadastro} disabled={processando}>
      <Plus size={16} /> {processando ? 'Cadastrando...' : 'Cadastrar aluna'}
    </button>
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

  async function apagar() {
    const confirmou = window.confirm(
      `Tem certeza que deseja apagar ${nome}?\n\nO login e os acessos aos cursos serão removidos. Esta ação não pode ser desfeita.`
    );
    if (!confirmou) return;

    const emailConfirmacao = window.prompt(
      `Para confirmar, digite o e-mail da aluna:\n${email}`
    )?.trim().toLowerCase();
    if (!emailConfirmacao) return;

    setProcessando(true);
    try {
      const resultado = await apagarUsuario({ id, emailConfirmacao });
      mostrarResultado(resultado);
      if (resultado.ok) router.refresh();
    } finally {
      setProcessando(false);
    }
  }

  return (
    <>
      <span className="iconbtn" title="Editar" onClick={processando ? undefined : editar}>
        <Pencil size={14} />
      </span>
      <span className="iconbtn" title="Remover" onClick={processando ? undefined : apagar}>
        <Trash2 size={14} />
      </span>
    </>
  );
}
