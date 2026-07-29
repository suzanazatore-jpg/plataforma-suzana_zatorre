import Link from 'next/link';
import { redirect } from 'next/navigation';
import {
  BookOpen,
  Home,
  LogOut,
  MessageCircle,
  PlayCircle,
  Search,
  ShieldCheck,
  User
} from 'lucide-react';
import { Logo } from '@/components/Logo';
import { supportUrl } from '@/lib/course';
import { getEnrolledCourses } from '@/lib/supabase/data';
import { getCurrentStudent } from '@/lib/supabase/session';
import { logoutStudent } from '@/app/actions/auth';
import './area.css';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

export default async function MemberAreaPage() {
  const student = await getCurrentStudent();
  if (!student) {
    redirect('/?erro=login');
  }

  const courses = await getEnrolledCourses();
  const isAdmin = student.profile?.role === 'admin';

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
            <a className="active" href="#cursos">
              <BookOpen size={18} /> Area de Membros
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
          <img src="/brand/suzana-com-logo.png" alt="Suzana Zatorre" />
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
        <header className="mobile-header">
          <Logo compact />
          <a href={supportUrl} target="_blank" rel="noopener noreferrer">
            Suporte
          </a>
        </header>

        <section className="hero-member">
          <div className="wrap hero-grid">
            <div className="hero-copy">
              <span className="welcome">→ seja bem-vinda, {student.displayName}</span>
              <Logo />
              <h1>Area de membros</h1>
              <p>
                Acesse seus cursos, aulas, materiais de apoio e treinamentos comerciais
                para fazer sua loja vender com mais processo.
              </p>
            </div>
            <aside className="hero-photo-card">
              <img src="/brand/suzana-com-logo.png" alt="Suzana Zatorre" />
            </aside>
          </div>
        </section>

        <section className="wrap course-section" id="cursos">
          <div className="section-title">
            <span>(I) Area de membros</span>
            <h2>Meus Cursos</h2>
          </div>
          {courses.length === 0 ? (
            <div className="empty-courses">
              <p>
                Você ainda não tem cursos liberados nesta conta. Se acabou de comprar,
                aguarde alguns minutos ou fale com o suporte.
              </p>
              <a className="btn" href={supportUrl} target="_blank" rel="noopener noreferrer">
                <MessageCircle size={18} /> Falar com o suporte
              </a>
            </div>
          ) : (
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
          )}
        </section>

        <footer className="member-footer">© 2026 Suzana Zatorre. Todos os direitos reservados.</footer>
      </div>
    </main>
  );
}
