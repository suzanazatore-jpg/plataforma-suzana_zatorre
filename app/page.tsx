import Link from 'next/link';
import { ArrowRight, LockKeyhole, Mail, MessageCircle } from 'lucide-react';
import { Logo } from '@/components/Logo';
import { supportUrl } from '@/lib/course';
import './login.css';

export default function LoginPage() {
  return (
    <main className="login-page">
      <div className="login-bg" />
      <section className="login-card">
        <Logo />
        <p className="login-kicker">Acesse sua área de membros</p>
        <form className="login-form">
          <label>
            <span>E-mail</span>
            <div className="field">
              <Mail size={18} />
              <input type="email" placeholder="seunome@email.com" autoComplete="email" />
            </div>
          </label>
          <label>
            <span>Senha</span>
            <div className="field">
              <LockKeyhole size={18} />
              <input type="password" placeholder="Sua senha de acesso" autoComplete="current-password" />
            </div>
          </label>
          <Link className="forgot" href="/recuperar-senha">
            Esqueci minha senha
          </Link>
          <Link className="btn login-submit" href="/area">
            Entrar <ArrowRight size={18} />
          </Link>
        </form>
        <a className="login-support" href={supportUrl} target="_blank" rel="noopener noreferrer">
          <MessageCircle size={17} /> Dúvidas? Fale com o suporte
        </a>
      </section>
    </main>
  );
}
