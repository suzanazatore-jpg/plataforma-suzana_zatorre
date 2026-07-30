import Link from 'next/link';
import {
  BookOpen,
  Headphones,
  Home,
  LogOut,
  PlayCircle,
  Search,
  Settings,
  ShieldCheck
} from 'lucide-react';
import { supportUrl } from '@/lib/course';
import './area-home.css';

// MODO DE CONSTRUÇÃO: área aberta, sem login e sem Supabase.
// A aluna e os cursos abaixo são apenas exemplos, para você ver e ajustar o visual.
// Quando a plataforma estiver pronta, restauramos a versão com login de verdade.
export const dynamic = 'force-dynamic';

export default function MemberAreaPage() {
  const student = {
    displayName: 'Suzana',
    profile: { role: 'admin' as const }
  };
  const isAdmin = student.profile?.role === 'admin';
  const initial = student.displayName.charAt(0).toUpperCase();

  // Cursos de exemplo — ainda não levam a lugar nenhum. Ligamos os reais no próximo passo.
  const courses = [
    { id: '1', icon: BookOpen, href: '#', eyebrow: 'Curso', title: 'Curso de Vendas', duration: '12 aulas' },
    { id: '2', icon: PlayCircle, href: '#', eyebrow: 'Curso', title: 'Aulas Extras', duration: 'Em breve' }
  ];

  return (
    <div className="member-home">
      <aside className="mh-sidebar">
        <img
          className="mh-logo"
          src="/brand/logo-dark.png"
          alt="Academia de Vendas Suzana Zatorre"
        />

        <div className="mh-search">
          <Search size={16} />
          <span>Pesquisar...</span>
        </div>

        <nav className="mh-nav">
          <Link className="active" href="/area">
            <Home size={18} /> Início
          </Link>
          <a href="#cursos">
            <BookOpen size={18} /> Meus Cursos
          </a>
          <a href="#cursos">
            <PlayCircle size={18} /> Aulas Extras
          </a>
          {isAdmin ? (
            <Link href="/admin">
              <ShieldCheck size={18} /> Administrador
            </Link>
          ) : null}
          <a href={supportUrl} target="_blank" rel="noopener noreferrer">
            <Headphones size={18} /> Suporte
          </a>
        </nav>

        <div className="mh-foot">
          <div className="mh-profile">
            <span className="mh-avatar">{initial}</span>
            <div className="mh-who">
              <strong>{student.displayName}</strong>
              <span>Aluna da Academia</span>
            </div>
          </div>
          <div className="mh-account-links">
            <a href="#" className="mh-account-link">
              <Settings size={15} /> Minha Conta
            </a>
            <Link href="/" className="mh-account-link mh-logout">
              <LogOut size={15} /> Sair
            </Link>
          </div>
        </div>
      </aside>

      <main className="mh-main">
        <section className="mh-hero">
          <div className="mh-hero-copy">
            <span className="mh-welcome">→ seja bem-vinda, {student.displayName}!</span>
            <h1>
              ACADEMIA DE VENDAS
              <br />
              <span className="pink">SUZANA ZATORRE</span>
            </h1>
          </div>
          <div className="mh-mark">
            <img src="/brand/hero-suzana.jpg" alt="Suzana Zatorre" />
          </div>
        </section>

        <section className="mh-courses" id="cursos">
          <div className="mh-section">
            <span>(I)</span> Meus Cursos
          </div>

          <div className="mh-grid">
            {courses.map((course) => {
              const Icon = course.icon;
              return (
                <a className="mh-card" key={course.id} href={course.href}>
                  <span className="play">
                    <PlayCircle size={18} />
                  </span>
                  <span className="eyebrow">{course.eyebrow}</span>
                  <h3>{course.title}</h3>
                  <span className="ic">
                    <Icon size={44} />
                  </span>
                  <span className="foot">{course.duration}</span>
                </a>
              );
            })}
          </div>
        </section>

        <footer className="mh-footer">
          © 2026 Suzana Zatorre. Todos os direitos reservados.
        </footer>
      </main>
    </div>
  );
}
