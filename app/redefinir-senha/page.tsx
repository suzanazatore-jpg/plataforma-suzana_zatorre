'use client';

import Link from 'next/link';
import { FormEvent, useEffect, useState } from 'react';
import { ArrowLeft, Eye, EyeOff, LockKeyhole } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import '../login.css';

export default function RedefinirSenhaPage() {
  const [senha, setSenha] = useState('');
  const [confirmacao, setConfirmacao] = useState('');
  const [mensagem, setMensagem] = useState('Validando seu link...');
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [linkValido, setLinkValido] = useState(false);
  const [concluido, setConcluido] = useState(false);
  const [verSenha, setVerSenha] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    if (!supabase) {
      setMensagem('A conexão da plataforma não está configurada.');
      setCarregando(false);
      return;
    }

    let ativo = true;

    async function validar() {
      const { data } = await supabase.auth.getSession();
      if (!ativo) return;

      if (data.session) {
        setLinkValido(true);
        setMensagem('');
      } else {
        setMensagem('Este link é inválido ou expirou. Solicite um novo link.');
      }
      setCarregando(false);
    }

    validar();

    const { data: listener } = supabase.auth.onAuthStateChange((evento, sessao) => {
      if (!ativo) return;
      if ((evento === 'PASSWORD_RECOVERY' || evento === 'SIGNED_IN') && sessao) {
        setLinkValido(true);
        setMensagem('');
        setCarregando(false);
      }
    });

    return () => {
      ativo = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  async function salvarSenha(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setMensagem('');

    if (senha.length < 8) {
      setMensagem('Crie uma senha com pelo menos 8 caracteres.');
      return;
    }

    if (senha !== confirmacao) {
      setMensagem('As duas senhas precisam ser iguais.');
      return;
    }

    const supabase = createClient();
    if (!supabase) {
      setMensagem('A conexão da plataforma não está configurada.');
      return;
    }

    setSalvando(true);
    const { error } = await supabase.auth.updateUser({ password: senha });
    setSalvando(false);

    if (error) {
      setMensagem('Não foi possível salvar a nova senha. Solicite outro link e tente novamente.');
      return;
    }

    await supabase.auth.signOut();
    setConcluido(true);
    setLinkValido(false);
    setMensagem('Senha atualizada. Agora você já pode entrar normalmente.');
  }

  return (
    <main className="login-page">
      <div className="login-bg" aria-hidden />
      <section className="login-card">
        <img
          className="login-logo"
          src="/brand/logo-dark.png"
          alt="Academia de Vendas Suzana Zatorre"
        />
        <p className="login-kicker">Crie sua nova senha</p>

        {mensagem && (
          <p className="login-alert" role="status">
            {mensagem}
          </p>
        )}

        {!carregando && linkValido && !concluido && (
          <form className="login-form" onSubmit={salvarSenha}>
            <label className="field-label">
              <div className="field">
                <LockKeyhole size={18} />
                <input
                  type={verSenha ? 'text' : 'password'}
                  placeholder="Nova senha"
                  autoComplete="new-password"
                  value={senha}
                  onChange={(evento) => setSenha(evento.target.value)}
                  minLength={8}
                  required
                />
                <button
                  type="button"
                  onClick={() => setVerSenha((valor) => !valor)}
                  aria-label={verSenha ? 'Ocultar senha' : 'Mostrar senha'}
                  style={{ background: 'none', border: 0, padding: 4, cursor: 'pointer', color: '#a99f9a' }}
                >
                  {verSenha ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </label>

            <label className="field-label">
              <div className="field">
                <LockKeyhole size={18} />
                <input
                  type={verSenha ? 'text' : 'password'}
                  placeholder="Confirme a nova senha"
                  autoComplete="new-password"
                  value={confirmacao}
                  onChange={(evento) => setConfirmacao(evento.target.value)}
                  minLength={8}
                  required
                />
              </div>
            </label>

            <button className="login-submit" type="submit" disabled={salvando}>
              {salvando ? 'Salvando...' : 'Salvar nova senha'}
            </button>
          </form>
        )}

        {!carregando && !linkValido && !concluido && (
          <Link className="login-submit" href="/recuperar-senha" style={{ textDecoration: 'none' }}>
            Solicitar novo link
          </Link>
        )}

        <Link className="forgot" href="/" style={{ marginTop: 20, textAlign: 'center' }}>
          <ArrowLeft size={14} style={{ verticalAlign: 'middle' }} /> Voltar ao login
        </Link>
      </section>
    </main>
  );
}
