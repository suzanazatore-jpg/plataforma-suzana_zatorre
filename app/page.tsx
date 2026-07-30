import Link from 'next/link';
import { ArrowRight, LockKeyhole, Mail } from 'lucide-react';
import './login.css';

// MODO DE CONSTRUÇÃO: o login está temporariamente desligado.
// O botão "Entrar" leva direto para /area, sem checar e-mail/senha nem Supabase.
// Quando a plataforma estiver pronta, basta restaurar a versão com login real.
export default function LoginPage() {
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

        <div className="login-form">
          <label className="field-label">
            <div className="field">
              <Mail size={18} />
              <input
                type="email"
                placeholder="Digite seu e-mail"
                autoComplete="email"
              />
            </div>
          </label>

          <label className="field-label">
            <div className="field">
              <LockKeyhole size={18} />
              <input
                type="password"
                placeholder="Digite sua senha"
                autoComplete="current-password"
              />
            </div>
          </label>

          <Link className="forgot" href="/recuperar-senha">
            Esqueci minha senha
          </Link>

          <Link className="login-submit" href="/area">
            Entrar <ArrowRight size={18} />
          </Link>
        </div>
      </section>
    </main>
  );
}
