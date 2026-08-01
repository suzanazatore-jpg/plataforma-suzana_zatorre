'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Pencil, Trash2 } from 'lucide-react';

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
type ApagarUsuario = (id: string) => Promise<Resultado>;

function mostrarResultado(resultado: Resultado) {
  window.alert(resultado.mensagem);
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

    setProcessando(true);
    try {
      const resultado = await apagarUsuario(id);
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
