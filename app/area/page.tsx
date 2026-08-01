import Link from 'next/link';
import { redirect } from 'next/navigation';
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
import { getEnrolledCourses, getPublishedCourses } from '@/lib/supabase/data';
import { getCurrentStudent } from '@/lib/supabase/session';
import './area-home.css';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

export default async function MemberAreaPage() {
  const student = await getCurrentStudent();
  if (!student) redirect('/?erro=login');

  const isAdmin = student.profile?.role === 'admin';
  const initial = student.displayName.charAt(0).toUpperCase();
  const courses = isAdmin
    ? await getPublishedCourses()
    : await getEnrolledCourses();

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
                <a
                  className="mh-card"
                  key={course.id}
                  href={
                    isAdmin && 'dbId' in course
                      ? `/preview/curso?id=${course.dbId}`
                      : course.href
                  }
                >
                  <span className="play">
                    <PlayCircle size={18} />
                  </span>
                  {'coverImageUrl' in course && typeof course.coverImageUrl === 'string' && course.coverImageUrl ? (
                    <img className="mh-cover" src={course.coverImageUrl} alt={`Capa do curso ${course.title}`} />
                  ) : null}
                  <span className="mh-card-copy">
                  <span className="eyebrow">{course.eyebrow}</span>
                  <h3>{course.title}</h3>
                  <span className="ic">
                    <Icon size={44} />
                  </span>
                  <span className="foot">{course.duration}</span>
                  </span>
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
