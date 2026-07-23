import Link from 'next/link';
import { ArrowRight, Download, MessageCircle, PlayCircle } from 'lucide-react';
import { Logo } from '@/components/Logo';
import { bonuses, lessons, supportUrl } from '@/lib/course';
import './area.css';

export default function MemberAreaPage() {
  const completed = 1;
  const progress = Math.round((completed / lessons.length) * 100);

  return (
    <main className="member-page">
      <header className="member-header">
        <div className="wrap header-inner">
          <Logo compact />
          <nav>
            <a href="#aulas">Aulas</a>
            <a href="#bonus">Bônus</a>
            <a href={supportUrl} target="_blank" rel="noopener noreferrer">
              Suporte
            </a>
          </nav>
        </div>
      </header>

      <section className="hero-member">
        <div className="wrap hero-grid">
          <div>
            <span className="welcome">→ seja bem-vinda</span>
            <h1>EVS: Equipe que Vende Sozinha</h1>
            <p>
              Sua área de membros para implantar padrão comercial, organizar a rotina da equipe e vender
              sem depender de você o tempo todo.
            </p>
            <div className="hero-actions">
              <a className="btn" href="#aulas">
                Começar agora <ArrowRight size={18} />
              </a>
              <a className="btn whatsapp" href={supportUrl} target="_blank" rel="noopener noreferrer">
                <MessageCircle size={18} /> Suporte
              </a>
            </div>
          </div>
          <aside className="progress-card">
            <span>Seu progresso</span>
            <strong>{progress}%</strong>
            <div className="progress-bar">
              <i style={{ width: `${progress}%` }} />
            </div>
            <p>{completed} de {lessons.length} etapas iniciadas</p>
          </aside>
        </div>
      </section>

      <section className="wrap course-section" id="aulas">
        <div className="section-title">
          <span>(I) Curso principal</span>
          <h2>Comece pelo EVS</h2>
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
          <span>(II) Materiais complementares</span>
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
    </main>
  );
}
