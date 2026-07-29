import Link from 'next/link';
import { redirect } from 'next/navigation';
import {
  ArrowLeft,
  CheckCircle2,
  Download,
  Headphones,
  Maximize,
  Pause,
  Play,
  Settings,
  SkipBack,
  SkipForward,
  Volume2
} from 'lucide-react';
import { supportUrl } from '@/lib/course';
import { getEvsLessonMaterials, getEvsLessons, getEvsMaterials } from '@/lib/supabase/data';
import { getCurrentStudent, hasActiveEnrollment } from '@/lib/supabase/session';
import { logoutStudent } from '@/app/actions/auth';
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

  const lessons = await getEvsLessons();
  const bonuses = await getEvsMaterials();
  const completed = 1;
  const progress = Math.round((completed / lessons.length) * 100);
  const currentLesson = lessons[0];
  const lessonMaterials = await getEvsLessonMaterials(currentLesson.id);
  const initial = student.displayName.charAt(0).toUpperCase();
  const hasRealVideo = Boolean(currentLesson.videoUrl && currentLesson.videoUrl !== '#');

  return (
    <div className="ep-page">
      <header className="ep-bar">
        <Link className="ep-back" href="/area" aria-label="Voltar para meus cursos">
          <ArrowLeft size={16} />
        </Link>
        <img className="ep-logo" src="/brand/logo-dark.png" alt="Academia de Vendas Suzana Zatorre" />
        <div className="ep-title">
          <small>{progress}% concluído · {lessons.length} aulas</small>
          <h1>{currentLesson.title}</h1>
        </div>
        <div className="ep-who">
          <span className="ep-dashes">
            {lessons.map((_, i) => (
              <i key={i} className={i === 0 ? 'on' : ''} />
            ))}
          </span>
          <span>Olá, {student.displayName}</span>
          <span className="ep-avatar">{initial}</span>
        </div>
      </header>

      <div className="ep-grid">
        <div>
          <div className="ep-video">
            {hasRealVideo ? (
              <iframe
                src={currentLesson.videoUrl}
                title={currentLesson.title}
                allow="autoplay; fullscreen; picture-in-picture"
                allowFullScreen
              />
            ) : (
              <>
                <span className="ep-presenter">
                  <span className="ep-presenter-mark">↗</span> Suzana Zatorre
                </span>
                <button type="button" className="ep-play" aria-label="Assistir aula">
                  <Play size={28} fill="currentColor" />
                </button>
                <div className="ep-vctrl-overlay">
                  <div className="ep-vctrl-row">
                    <SkipBack size={16} />
                    <Play size={16} />
                    <SkipForward size={16} />
                    <div className="ep-vctrl-bar">
                      <i style={{ width: '4%' }} />
                    </div>
                    <span className="ep-vctrl-time">00:00 / 00:00</span>
                    <Volume2 size={16} />
                    <div className="ep-vctrl-vol">
                      <i style={{ width: '70%' }} />
                    </div>
                    <Settings size={16} />
                    <Maximize size={16} />
                  </div>
                </div>
              </>
            )}
          </div>

          <div className="ep-tabs">
            <span className="on">Informações</span>
            <span>Comentários</span>
          </div>
          <p className="ep-desc">{currentLesson.description}</p>

          <div className="ep-materials">
            <h3>Materiais desta aula</h3>
            {lessonMaterials.length ? (
              <div className="ep-mlist">
                {lessonMaterials.map((material) => (
                  <a href={material.url} key={material.title}>
                    <Download size={16} />
                    <span>{material.title}</span>
                  </a>
                ))}
              </div>
            ) : (
              <p className="ep-empty-note">Nenhum material de apoio cadastrado para esta aula.</p>
            )}
          </div>
        </div>

        <aside>
          <div className="ep-side-card">
            <div className="ep-side-head">
              <span className="ep-chk">
                <CheckCircle2 size={16} />
              </span>
              EVS — Equipe que Vende Sozinha
            </div>
            <div className="ep-lessonlist">
              {lessons.map((lesson, index) => (
                <div className={`ep-li ${index === 0 ? 'current' : ''}`} key={lesson.id}>
                  <span className="ep-dot">
                    <CheckCircle2 size={13} />
                  </span>
                  <span>
                    {index + 1}. {lesson.title}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="ep-notes">
            <div className="ep-notes-head">Anotações</div>
            <textarea placeholder="Escreva suas anotações aqui" />
            <div className="ep-notes-foot">
              <span />
              <button type="button">Salvar</button>
            </div>
          </div>

          {bonuses.length ? (
            <div className="ep-side-card ep-materials-panel">
              <div className="ep-side-head">
                <span className="ep-chk">
                  <Download size={16} />
                </span>
                Materiais do EVS
              </div>
              <div className="ep-mlist ep-mlist-panel">
                {bonuses.map((bonus) => (
                  <a href={bonus.url} key={bonus.title}>
                    <Download size={16} />
                    <span>{bonus.title}</span>
                  </a>
                ))}
              </div>
            </div>
          ) : null}
        </aside>
      </div>

      <div className="ep-supportbar">
        <a href={supportUrl} target="_blank" rel="noopener noreferrer">
          <Headphones size={15} /> Dúvidas sobre esta aula? Fale com o suporte
        </a>
        <form action={logoutStudent}>
          <button type="submit">Sair</button>
        </form>
      </div>
    </div>
  );
}
