import Link from 'next/link';
import {
  ArrowRight,
  Bell,
  BookOpen,
  Download,
  LogOut,
  MessageCircle,
  PlayCircle,
  Search,
  User
} from 'lucide-react';
import { Logo } from '@/components/Logo';
import { bonuses, lessons, platformCourses, supportUrl } from '@/lib/course';
import './area.css';

export default function MemberAreaPage() {
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
              <BookOpen size={18} /> Cursos
            </a>
            <a href="#evs">
              <PlayCircle size={18} /> EVS
            </a>
            <a href="#bonus">
              <Download size={18} /> Materiais
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
            <strong>Suzana Zatorre</strong>
            <span>Academia de Vendas</span>
          </div>
        </div>
        <nav className="sidebar-nav account-nav">
          <a href="#perfil">
            <User size={17} /> Meu perfil
          </a>
          <a href="#notificacoes">
            <Bell size={17} /> Notificacoes
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
            <div className="hero-actions">
              <a className="btn" href="#cursos">
                Ver cursos <ArrowRight size={18} />
              </a>
              <a className="btn whatsapp" href={supportUrl} target="_blank" rel="noopener noreferrer">
                <MessageCircle size={18} /> Suporte
              </a>
            </div>
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
          <h2>Seu curso disponível</h2>
        </div>
        <div className="lesson-grid course-home-grid">
          {platformCourses.map((course) => {
            const Icon = course.icon;
            return (
              <article className="course-cover-card" key={course.id}>
                <div className="card-glow" style={{ background: course.accent }} />
                <div className="lesson-top">
                  <span>{course.eyebrow}</span>
                  <Icon size={28} />
                </div>
                <h3>{course.title}</h3>
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
              </article>
            );
          })}
        </div>
      </section>

      <section className="wrap course-section" id="evs">
        <div className="section-title">
          <span>(II) Curso</span>
          <h2>EVS - Equipe que Vende Sozinha</h2>
        </div>
        <div className="lesson-grid">
          {lessons.map((lesson, index) => {
            const Icon = lesson.icon;
            return (
              <article className={index === 0 ? 'lesson-card start' : 'lesson-card'} key={lesson.id}>
                <div className="card-glow" style={{ background: lesson.accent }} />
                <div className="lesson-top">
                  <span>{lesson.eyebrow}</span>
                  <Icon size={28} />
                </div>
                <h3>{lesson.title}</h3>
                <p>{lesson.description}</p>
                <div className="lesson-footer">
                  <small>{lesson.duration}</small>
                  <Link href={lesson.videoUrl}>
                    <PlayCircle size={18} /> Assistir aula
                  </Link>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <section className="wrap bonus-section" id="bonus">
        <div className="section-title">
          <span>(III) Materiais complementares</span>
          <h2>Bônus do EVS</h2>
        </div>
        <div className="bonus-grid">
          {bonuses.map((bonus) => {
            const Icon = bonus.icon;
            return (
              <article className="bonus-card" key={bonus.title}>
                <Icon size={26} />
                <div>
                  <h3>{bonus.title}</h3>
                  <p>{bonus.description}</p>
                </div>
                <Link href={bonus.url}>
                  <Download size={17} /> Baixar material
                </Link>
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
