import Link from 'next/link';
import {
  BookOpen,
  LogOut,
  MessageCircle,
  PlayCircle,
  Search,
  User
} from 'lucide-react';
import { Logo } from '@/components/Logo';
import { lessons, supportUrl } from '@/lib/course';
import { getPublishedCourses } from '@/lib/supabase/data';
import './area.css';

export default async function MemberAreaPage() {
  const courses = await getPublishedCourses();
  const completed = 1;
  const progress = Math.round((completed / lessons.length) * 100);

  return (
    <main className="member-page">
      <aside className="member-sidebar">
        <div className="sidebar-top">
          <Logo />
          <div className="search-box">
            <Search size={16} />
            <span>Pesquisar...</span>
          </div>
          <nav className="sidebar-nav">
            <a className="active" href="#cursos">
              <BookOpen size={18} /> Meus Cursos
            </a>
            <a href={supportUrl} target="_blank" rel="noopener noreferrer">
              <MessageCircle size={18} /> Suporte
            </a>
          </nav>
        </div>
        <div className="student-panel">
          <img
            src="https://suzanazatorre.com.br/wp-content/uploads/2026/01/chatgpt-image-31-de-jan-de-2026-22-15-51.jpg"
            alt="Suzana Zatorre"
          />
          <div>
            <strong>Nome da Aluna</strong>
            <span>Aluna da Academia</span>
          </div>
        </div>
        <nav className="sidebar-nav account-nav">
          <a href="#perfil">
            <User size={17} /> Meu perfil
          </a>
          <a href="/">
            <LogOut size={17} /> Sair
          </a>
        </nav>
      </aside>

      <div className="member-content">
        <header className="mobile-header">
          <Logo compact />
          <a href={supportUrl} target="_blank" rel="noopener noreferrer">
            Suporte
          </a>
        </header>

        <section className="hero-member">
          <div className="wrap hero-grid">
          <div>
            <span className="welcome">→ seja bem-vinda</span>
            <h1>Academia de Vendas Suzana Zatorre</h1>
            <p>
              Sua area de membros para acessar cursos, aulas, materiais de apoio e treinamentos
              comerciais para fazer sua loja vender com mais processo.
            </p>
          </div>
          <aside className="hero-photo-card">
            <img
              src="https://suzanazatorre.com.br/wp-content/uploads/2026/01/chatgpt-image-31-de-jan-de-2026-22-15-51.jpg"
              alt="Suzana Zatorre"
            />
            <div className="photo-overlay">
              <span>Academia de Vendas</span>
              <strong>Suzana Zatorre</strong>
            </div>
          </aside>
        </div>
      </section>

      <section className="wrap course-section" id="cursos">
        <div className="section-title">
          <span>(I) Area de membros</span>
          <h2>Meus Cursos</h2>
        </div>
        <div className="lesson-grid course-home-grid">
          {courses.map((course) => {
            const Icon = course.icon;
            return (
              <article className="course-cover-card" key={course.id}>
                <div className="card-glow" style={{ background: course.accent }} />
                <div className="lesson-top">
                  <span>{course.eyebrow}</span>
                  <Icon size={28} />
                </div>
                <h3>{course.title}</h3>
                <div className="course-progress">
                  <span>{progress}% concluido</span>
                  <div className="progress-bar">
                    <i style={{ width: `${progress}%` }} />
                  </div>
                </div>
                <div className="lesson-footer">
                  <small>{course.duration}</small>
                  <Link href={course.href}>
                    <PlayCircle size={18} /> Acessar
                  </Link>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <footer className="member-footer">© 2026 Suzana Zatorre. Todos os direitos reservados.</footer>
      </div>
    </main>
  );
}
