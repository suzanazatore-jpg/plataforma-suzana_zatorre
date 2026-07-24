import Link from 'next/link';
import {
  ArrowLeft,
  CheckCircle2,
  Download,
  FileText,
  LogOut,
  MessageCircle,
  Play,
  PlayCircle,
  Search,
  User
} from 'lucide-react';
import { Logo } from '@/components/Logo';
import { supportUrl } from '@/lib/course';
import { getEvsLessons, getEvsMaterials } from '@/lib/supabase/data';
import '../area.css';
import './evs.css';

export default async function EvsCoursePage() {
  const lessons = await getEvsLessons();
  const bonuses = await getEvsMaterials();
  const completed = 1;
  const progress = Math.round((completed / lessons.length) * 100);
  const currentLesson = lessons[0];

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
            <Link href="/area">
              <ArrowLeft size={18} /> Meus Cursos
            </Link>
            <a className="active" href="#aulas">
              <PlayCircle size={18} /> EVS
            </a>
            <a href={supportUrl} target="_blank" rel="noopener noreferrer">
              <MessageCircle size={18} /> Suporte
            </a>
          </nav>
        </div>
        <div className="student-panel">
          <img
            src="https://suzanazatorre.com.br/wp-content/uploads/2026/01/chatgpt-image-31-de-jan-de-2026-22-15-51.jpg"
            alt="Nome da aluna"
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
          <Link href="/">
            <LogOut size={17} /> Sair
          </Link>
        </nav>
      </aside>

      <div className="member-content">
        <header className="course-topbar">
          <Link href="/area" aria-label="Voltar para meus cursos">
            <ArrowLeft size={20} />
          </Link>
          <div>
            <span>Curso principal</span>
            <h1>EVS - Equipe que Vende Sozinha</h1>
          </div>
          <strong>{progress}%</strong>
        </header>

        <section className="course-player-section wrap">
          <div className="video-shell">
            <div className="video-placeholder">
              <button aria-label="Assistir aula">
                <Play size={36} fill="currentColor" />
              </button>
              <span>{currentLesson.eyebrow}</span>
              <h2>{currentLesson.title}</h2>
            </div>
          </div>

          <aside className="course-playlist" id="aulas">
            <div className="playlist-head">
              <CheckCircle2 size={22} />
              <div>
                <strong>EVS</strong>
                <span>{completed} de {lessons.length} aulas iniciadas</span>
              </div>
            </div>
            <div className="playlist-progress">
              <i style={{ width: `${progress}%` }} />
            </div>
            <ol>
              {lessons.map((lesson, index) => (
                <li className={index === 0 ? 'active' : ''} key={lesson.id}>
                  <span>{String(index + 1).padStart(2, '0')}</span>
                  <div>
                    <strong>{lesson.title}</strong>
                    <small>{lesson.duration}</small>
                  </div>
                </li>
              ))}
            </ol>
          </aside>
        </section>

        <section className="course-detail-grid wrap">
          <article className="lesson-info">
            <span>Comece por aqui</span>
            <h2>{currentLesson.title}</h2>
            <p>{currentLesson.description}</p>
            <div className="lesson-actions">
              <button type="button">
                <CheckCircle2 size={18} /> Marcar como concluida
              </button>
              <button type="button">
                <FileText size={18} /> Anotacoes
              </button>
            </div>
          </article>

          <aside className="support-note">
            <h3>Materiais do EVS</h3>
            <div className="material-list">
              {bonuses.map((bonus) => (
                <a href={bonus.url} key={bonus.title}>
                  <Download size={17} />
                  <span>{bonus.title}</span>
                </a>
              ))}
            </div>
          </aside>
        </section>

        <footer className="member-footer">© 2026 Suzana Zatorre. Todos os direitos reservados.</footer>
      </div>
    </main>
  );
}
