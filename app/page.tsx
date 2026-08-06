'use client';

import Link from 'next/link';
import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, Eye, EyeOff, LockKeyhole, Mail } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import './login.css';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [mensagem, setMensagem] = useState('');
  const [entrando, setEntrando] = useState(false);
  const [verSenha, setVerSenha] = useState(false);

  async function entrar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setMensagem('');

    const supabase = createClient();
    if (!supabase) {
      setMensagem('A conexão da plataforma não está configurada.');
      return;
    }

    setEntrando(true);

    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password: senha
    });

    if (error || !data.user) {
      setMensagem('E-mail ou senha incorretos. Confira e tente novamente.');
      setEntrando(false);
      return;
    }

    const { data: perfil } = await supabase
      .from('profiles')
      .select('role, status')
      .eq('id', data.user.id)
      .maybeSingle();

    if (perfil?.status && perfil.status !== 'active') {
      await supabase.auth.signOut();
      setMensagem('Seu acesso está bloqueado. Fale com o suporte.');
      setEntrando(false);
      return;
    }

    router.replace(perfil?.role === 'admin' ? '/admin' : '/area');
    router.refresh();
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
        <p className="login-kicker">Acesse sua área de membros</p>

        {mensagem && (
          <p className="login-alert" role="alert">
            {mensagem}
          </p>
        )}

        <form className="login-form" onSubmit={entrar}>
          <label className="field-label">
            <div className="field">
              <Mail size={18} />
              <input
                type="email"
                placeholder="Digite seu e-mail"
                autoComplete="email"
                value={email}
                onChange={(evento) => setEmail(evento.target.value)}
                required
              />
            </div>
          </label>

          <label className="field-label">
            <div className="field">
              <LockKeyhole size={18} />
              <input
                type={verSenha ? 'text' : 'password'}
                placeholder="Digite sua senha"
                autoComplete="current-password"
                value={senha}
                onChange={(evento) => setSenha(evento.target.value)}
                required
              />
              <button
                type="button"
                onClick={() => setVerSenha((valor) => !valor)}
                aria-label={verSenha ? 'Ocultar senha' : 'Mostrar senha'}
                title={verSenha ? 'Ocultar senha' : 'Mostrar senha'}
                style={{ background: 'none', border: 0, padding: 4, margin: 0, cursor: 'pointer', display: 'grid', placeItems: 'center', flex: 'none' }}
              >
                {verSenha ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </label>

          <Link className="forgot" href="/recuperar-senha">
            Esqueci minha senha
          </Link>

          <button className="login-submit" type="submit" disabled={entrando}>
            {entrando ? 'Entrando...' : 'Entrar'} <ArrowRight size={18} />
          </button>
        </form>
      </section>
    </main>
  );
}
