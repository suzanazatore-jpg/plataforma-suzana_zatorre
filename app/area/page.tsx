import Link from 'next/link';
import { ArrowRight, LockKeyhole, Mail } from 'lucide-react';
import { loginStudent } from '@/app/actions/auth';
import './login.css';

const ERROS: Record<string, string> = {
  credenciais: 'E-mail ou senha incorretos. Tente novamente.',
  campos: 'Preencha e-mail e senha para entrar.',
  login: 'Faça login para acessar sua área de membros.',
  bloqueado: 'Seu acesso está suspenso. Fale com o suporte.',
  config: 'Plataforma em manutenção. Tente novamente em instantes.'
};

export default function LoginPage({
  searchParams
}: {
  searchParams: { erro?: string };
}) {
  const erro = searchParams.erro ? ERROS[searchParams.erro] : null;

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

        {erro ? <p className="login-alert">{erro}</p> : null}

        <form className="login-form" action={loginStudent}>
          <label className="field-label">
            <div className="field">
              <Mail size={18} />
              <input
                name="email"
                type="email"
                placeholder="Digite seu e-mail"
                autoComplete="email"
                required
              />
            </div>
          </label>
          <label className="field-label">
            <div className="field">
              <LockKeyhole size={18} />
              <input
                name="password"
                type="password"
                placeholder="Digite sua senha"
                autoComplete="current-password"
                required
              />
            </div>
          </label>

          <Link className="forgot" href="/recuperar-senha">
            Esqueci minha senha
          </Link>

          <button className="login-submit" type="submit">
            Entrar <ArrowRight size={18} />
          </button>
        </form>
      </section>
    </main>
  );
}
