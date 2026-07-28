import Link from 'next/link';
import {
  BookOpen,
  ChevronRight,
  Home,
  LogOut,
  MessageCircle,
  PlayCircle,
  Search,
  ShieldCheck,
  User
} from 'lucide-react';
import { Logo } from '@/components/Logo';
import { lessons, supportUrl } from '@/lib/course';
import { getPublishedCourses } from '@/lib/supabase/data';
import './area.css';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

export default async function MemberAreaPage() {
  const courses = await getPublishedCourses();
  const completed = 1;
  const progress = Math.round((completed / lessons.length) * 100);
  const firstCourse = courses[0];

  return (
    <main className="member-page">
      <aside className="member-sidebar">
        <div>
          <Logo />
          <nav className="sidebar-nav" aria-label="Menu principal">
            <Link href="/area" className="active">
              <Home size={18} /> Inicio
            </Link>
            <a href="#cursos">
              <BookOpen size={18} /> Meus Cursos
            </a>
            <a href="#perfil">
              <User size={18} /> Minha Conta
            </a>
            <Link href="/admin">
              <ShieldCheck size={18} /> Admin
            </Link>
          </nav>
        </div>

        <div className="sidebar-bottom">
          <a className="support-link" href={supportUrl} target="_blank" rel="noopener noreferrer">
            <MessageCircle size={18} /> Suporte
          </a>
          <a className="logout-link" href="/">
            <LogOut size={17} /> Sair
          </a>
        </div>
      </aside>

      <div className="member-content">
        <header className="member-topbar">
          <div>
            <span>Area de membros</span>
            <strong>Academia de Vendas Suzana Zatorre</strong>
          </div>
          <div className="topbar-actions">
            <div className="search-box">
              <Search size={16} />
              <span>Pesquisar curso ou aula</span>
            </div>
            <div className="student-chip" id="perfil">
              <img src="/brand/sz-mark.png" alt="" />
              <div>
                <strong>Nome da Aluna</strong>
                <span>{progress}% concluido</span>
              </div>
            </div>
          </div>
        </header>

        <header className="mobile-header">
          <Logo compact />
          <a href={supportUrl} target="_blank" rel="noopener noreferrer">
            Suporte
          </a>
        </header>

        <section className="platform-hero">
          <div className="hero-panel">
            <div className="hero-copy">
              <span className="welcome">Continue estudando</span>
              <h1>Academia de Vendas</h1>
              <p>
                Seus cursos, aulas e materiais organizados para implantar rotina
                comercial e fazer sua equipe vender com mais processo.
              </p>
              {firstCourse ? (
                <Link className="primary-action" href={firstCourse.href}>
                  Continuar curso <ChevronRight size={18} />
                </Link>
              ) : null}
            </div>
          </div>
        </section>

        <section className="course-section" id="cursos">
          <div className="section-title">
            <div>
              <span>Biblioteca</span>
              <h2>Meus Cursos</h2>
            </div>
            <small>{courses.length} curso disponível</small>
          </div>

          <div className="course-home-grid">
            {courses.map((course) => {
              const Icon = course.icon;
              return (
                <article className="course-cover-card" key={course.id}>
                  <div className="course-cover-art">
                    <div className="card-glow" style={{ background: course.accent }} />
                    <div className="lesson-top">
                      <span>{course.eyebrow}</span>
                      <Icon size={26} />
                    </div>
                    <h3>{course.title}</h3>
                  </div>
                  <div className="course-card-body">
                    <p>{course.description}</p>
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
