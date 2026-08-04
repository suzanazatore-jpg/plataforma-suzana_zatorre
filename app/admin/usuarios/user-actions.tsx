'use client';

import { ChangeEvent, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Pencil, Trash2, Download, Upload } from 'lucide-react';

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
  const [processando, setProcessando] = useState(false);

  async function selecionarArquivo(event: ChangeEvent<HTMLInputElement>) {
    const arquivo = event.target.files?.[0];
    event.target.value = '';
    if (!arquivo) return;
    if (!arquivo.name.toLowerCase().endsWith('.csv')) {
      window.alert('Escolha uma planilha no formato CSV.');
      return;
    }

    const alunas = lerCsv(await arquivo.text());
    if (!alunas.length) {
      window.alert('Não encontrei as colunas Nome e Email. Baixe a lista modelo e salve como CSV.');
      return;
    }
    if (!window.confirm(`Encontrei ${alunas.length} linha(s). Criar as contas sem senha, sem mensagens e sem liberar cursos?`)) return;

    setProcessando(true);
    try {
      const resultado = await importarUsuarios(alunas);
      mostrarResultado(resultado);
      router.refresh();
    } finally {
      setProcessando(false);
    }
  }

  return (
    <>
      <a className="btn-ghost" href="/api/admin/alunas-export" download>
        <Download size={15} /> Baixar lista
      </a>
      <button className="btn-ghost" type="button" onClick={() => inputRef.current?.click()} disabled={processando}>
        <Upload size={15} /> {processando ? 'Subindo...' : 'Subir lista'}
      </button>
      <input ref={inputRef} type="file" accept=".csv,text/csv" hidden onChange={selecionarArquivo} />
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
      <Plus size={16} /> {processando ? 'Cadastrando...' : 'Novo usuário'}
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
