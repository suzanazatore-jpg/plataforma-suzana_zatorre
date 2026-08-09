'use client';

import Link from 'next/link';
import { FormEvent, useState } from 'react';
import { ArrowLeft, Mail } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import '../login.css';

export default function RecoverPasswordPage() {
  const [email, setEmail] = useState('');
  const [mensagem, setMensagem] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [enviado, setEnviado] = useState(false);

  async function enviarLink(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setMensagem('');

    const supabase = createClient();
    if (!supabase) {
      setMensagem('A conexão da plataforma não está configurada.');
      return;
    }

    setEnviando(true);

    const redirectTo = `${window.location.origin}/redefinir-senha`;
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo
    });

    setEnviando(false);

    if (error) {
      setMensagem('Não foi possível enviar o link agora. Tente novamente em alguns minutos.');
      return;
    }

    setEnviado(true);
    setMensagem(
      'Se esse e-mail estiver cadastrado, você receberá um link para criar uma nova senha. Confira também o spam.'
    );
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
        <p className="login-kicker">Recupere seu acesso</p>

        {mensagem && (
          <p className="login-alert" role="status">
            {mensagem}
          </p>
        )}

        {!enviado && (
          <form className="login-form" onSubmit={enviarLink}>
            <label className="field-label">
              <div className="field">
                <Mail size={18} />
                <input
                  type="email"
                  placeholder="E-mail usado na compra"
                  autoComplete="email"
                  value={email}
                  onChange={(evento) => setEmail(evento.target.value)}
                  required
                />
              </div>
            </label>

            <button className="login-submit" type="submit" disabled={enviando}>
              {enviando ? 'Enviando...' : 'Enviar link de acesso'}
            </button>
          </form>
        )}

        <Link className="forgot" href="/" style={{ marginTop: 20, textAlign: 'center' }}>
          <ArrowLeft size={14} style={{ verticalAlign: 'middle' }} /> Voltar ao login
        </Link>
      </section>
    </main>
  );
}
