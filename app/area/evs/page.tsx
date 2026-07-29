import Link from 'next/link';
import { redirect } from 'next/navigation';
import {
  ArrowLeft,
  CheckCircle2,
  Download,
  Heart,
  Home,
  LogOut,
  MessageCircle,
  Play,
  PlayCircle,
  Search,
  ShieldCheck,
  Star,
  User
} from 'lucide-react';
import { Logo } from '@/components/Logo';
import { supportUrl } from '@/lib/course';
import { getEvsLessonMaterials, getEvsLessons, getEvsMaterials } from '@/lib/supabase/data';
import { getCurrentStudent, hasActiveEnrollment } from '@/lib/supabase/session';
import { logoutStudent } from '@/app/actions/auth';
import '../area.css';
import './evs.css';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

export default async function EvsCoursePage() {
  const student = await getCurrentStudent();
  if (!student) {
    redirect('/?erro=login');
  }

  const enrolled = await hasActiveEnrollment('evs');
  if (!enrolled) {
    redirect('/acesso-negado');
  }

  const isAdmin = student.profile?.role === 'admin';

  const lessons = await getEvsLessons();
  const bonuses = await getEvsMaterials();
  const completed = 1;
  const progress = Math.round((completed / lessons.length) * 100);
  const currentLesson = lessons[0];
  const lessonMaterials = await getEvsLessonMaterials(currentLesson.id);

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
              <Home size={18} /> Inicio
            </Link>
            <Link href="/area">
              <ArrowLeft size={18} /> Area de Membros
            </Link>
            <a className="active" href="#aulas">
              <PlayCircle size={18} /> EVS
            </a>
            <a href="#perfil">
              <User size={18} /> Minha Conta
            </a>
            {isAdmin ? (
              <Link href="/admin">
                <ShieldCheck size={18} /> Administrador
              </Link>
            ) : null}
            <a href={supportUrl} target="_blank" rel="noopener noreferrer">
              <MessageCircle size={18} /> Suporte
            </a>
          </nav>
        </div>
        <div className="student-panel">
          <img src="/brand/suzana-com-logo.png" alt={student.displayName} />
          <div>
            <strong>{student.displayName}</strong>
            <span>Aluna da Academia</span>
          </div>
        </div>
        <form action={logoutStudent} className="sidebar-nav account-nav">
          <button type="submit" className="logout-button">
            <LogOut size={17} /> Sair
          </button>
        </form>
      </aside>

      <div className="member-content">
        <header className="watch-topbar">
          <Link href="/area" aria-label="Voltar para meus cursos">
            <ArrowLeft size={20} />
          </Link>
          <div>
            <Logo compact />
            <h1>{currentLesson.title}</h1>
            <div className="watch-progress">
              <i style={{ width: `${progress}%` }} />
              <strong>{progress}%</strong>
            </div>
          </div>
          <span>Ola, Suzana Zatorre</span>
        </header>

        <section className="course-player-section">
          <div className="video-shell">
            <div className="video-placeholder">
              <button aria-label="Assistir aula">
                <Play size={36} fill="currentColor" />
              </button>
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
                  <span>{index + 1}</span>
                  <div>
                    <strong>{lesson.title}</strong>
                    <small>{lesson.duration}</small>
                  </div>
                </li>
              ))}
            </ol>
          </aside>
        </section>

        <section className="lesson-toolbar">
          <h2>{currentLesson.title}</h2>
          <div className="lesson-actions">
            <button type="button">
              <CheckCircle2 size={18} /> Concluido
            </button>
            <button type="button">
              <Heart size={18} /> Favoritar
            </button>
            <button type="button">
              <Star size={18} /> Avaliar
            </button>
          </div>
        </section>

        <section className="course-detail-grid">
          <article className="lesson-info">
            <div className="lesson-tabs">
              <span>Informacoes</span>
              <span>Comentarios</span>
            </div>
            <p>{currentLesson.description}</p>
            <div className="lesson-materials">
              <h3>Materiais desta aula</h3>
              {lessonMaterials.length ? (
                <div className="material-list">
                  {lessonMaterials.map((material) => (
                    <a href={material.url} key={material.title}>
                      <Download size={17} />
                      <span>{material.title}</span>
                    </a>
                  ))}
                </div>
              ) : (
                <p>Nenhum material de apoio cadastrado para esta aula.</p>
              )}
            </div>
          </article>

          <aside className="support-note">
            <h3>Anotacoes</h3>
            <label className="notes-box">
              <span>Escreva suas anotacoes aqui</span>
              <textarea aria-label="Anotacoes da aula" />
            </label>
            <button type="button" className="notes-save">Salvar</button>
          </aside>

          <aside className="support-note materials-panel">
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
