import Link from 'next/link';
import { MessageCircle } from 'lucide-react';
import { Logo } from '@/components/Logo';
import { supportUrl } from '@/lib/course';
import '../login.css';

export default function AccessDeniedPage() {
  return (
    <main className="login-page">
      <div className="login-bg" />
      <section className="login-card">
        <Logo />
        <p className="login-kicker">Acesso não encontrado</p>
        <p className="access-copy">
          Não encontramos uma compra ativa para este e-mail. Se você acabou de comprar, aguarde alguns
          minutos ou fale com o suporte.
        </p>
        <a className="btn whatsapp login-submit" href={supportUrl} target="_blank" rel="noopener noreferrer">
          <MessageCircle size={18} /> Falar com suporte
        </a>
        <Link className="forgot" href="/">
          Voltar ao login
        </Link>
      </section>
    </main>
  );
}
