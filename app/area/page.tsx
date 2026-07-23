import Link from 'next/link';
import { ArrowRight, Download, MessageCircle, PlayCircle } from 'lucide-react';
import { Logo } from '@/components/Logo';
import { bonuses, lessons, platformCourses, supportUrl } from '@/lib/course';
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
            <a href="#cursos">Cursos</a>
            <a href="#evs">EVS</a>
            <a href="#admin">Admin</a>
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
          <aside className="progress-card">
            <span>Academia</span>
            <strong>{progress}%</strong>
            <div className="progress-bar">
              <i style={{ width: `${progress}%` }} />
            </div>
            <p>{completed} de {lessons.length} etapas iniciadas no EVS</p>
          </aside>
        </div>
      </section>

      <section className="wrap course-section" id="cursos">
        <div className="section-title">
          <span>(I) Area de membros</span>
          <h2>Escolha por onde comecar</h2>
        </div>
        <div className="lesson-grid course-home-grid">
          {platformCourses.map((course, index) => {
            const Icon = course.icon;
            return (
              <article className={index === 0 ? 'lesson-card start' : 'lesson-card'} key={course.id}>
                <div className="card-glow" style={{ background: course.accent }} />
                <div className="lesson-top">
                  <span>{course.eyebrow}</span>
                  <Icon size={28} />
                </div>
                <h3>{course.title}</h3>
                <p>{course.description}</p>
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

      <section className="wrap admin-section" id="admin">
        <div className="section-title">
          <span>(IV) Proxima etapa</span>
          <h2>Area administrativa</h2>
        </div>
        <div className="admin-card">
          <div>
            <h3>Subir aulas e materiais sem mexer no codigo</h3>
            <p>
              Esta area sera conectada ao Supabase para cadastrar cursos, colar links da Smart Video,
              anexar PDFs e liberar acesso para alunas.
            </p>
          </div>
          <a className="btn secondary" href="#cursos">
            Em construcao
          </a>
        </div>
      </section>

      <footer className="member-footer">© 2026 Suzana Zatorre. Todos os direitos reservados.</footer>
    </main>
  );
}
