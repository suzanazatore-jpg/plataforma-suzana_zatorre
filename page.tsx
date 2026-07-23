import Link from 'next/link';
import { ArrowLeft, Mail } from 'lucide-react';
import { Logo } from '@/components/Logo';
import '../login.css';

export default function RecoverPasswordPage() {
  return (
    <main className="login-page">
      <div className="login-bg" />
      <section className="login-card">
        <Logo />
        <p className="login-kicker">Recupere seu acesso</p>
        <form className="login-form">
          <label>
            <span>E-mail usado na compra</span>
            <div className="field">
              <Mail size={18} />
              <input type="email" placeholder="seunome@email.com" autoComplete="email" />
            </div>
          </label>
          <button className="btn login-submit" type="button">
            Enviar link de acesso
          </button>
          <Link className="forgot" href="/">
            <ArrowLeft size={14} /> Voltar ao login
          </Link>
        </form>
      </section>
    </main>
  );
}
