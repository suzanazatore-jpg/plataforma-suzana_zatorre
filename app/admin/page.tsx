import Link from 'next/link';
import { LockKeyhole, LogOut, Plus, Save } from 'lucide-react';
import { Logo } from '@/components/Logo';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { loginAdmin, logoutAdmin, saveCourse, saveLesson, saveMaterial } from './actions';
import { isAdminLoggedIn } from './session';
import './admin.css';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

type SearchParams = {
  erro?: string;
  salvo?: string;
};

type Course = {
  id: string;
  slug: string;
  title: string;
  subtitle: string | null;
  description: string | null;
  cover_image_url: string | null;
  sort_order: number;
  is_published: boolean;
};

type Lesson = {
  id: string;
  course_id: string;
  slug: string;
  title: string;
  description: string | null;
  video_url: string | null;
  duration_label: string | null;
  sort_order: number;
  is_published: boolean;
};

type Material = {
  id: string;
  course_id: string | null;
  lesson_id: string | null;
  title: string;
  description: string | null;
  file_url: string;
  sort_order: number;
  is_published: boolean;
};

async function getAdminData() {
  const supabase = createSupabaseAdminClient();

  if (!supabase) {
    return {
      courses: [] as Course[],
      lessons: [] as Lesson[],
      materials: [] as Material[],
      setupMissing: true
    };
  }

  const [coursesResult, lessonsResult, materialsResult] = await Promise.all([
    supabase.from('courses').select('*').order('sort_order', { ascending: true }),
    supabase.from('lessons').select('*').order('sort_order', { ascending: true }),
    supabase.from('materials').select('*').order('sort_order', { ascending: true })
  ]);

  return {
    courses: (coursesResult.data || []) as Course[],
    lessons: (lessonsResult.data || []) as Lesson[],
    materials: (materialsResult.data || []) as Material[],
    setupMissing: false
  };
}

function courseOptions(courses: Course[]) {
  return courses.map((course) => (
    <option key={course.id} value={course.id}>
      {course.title}
    </option>
  ));
}

function lessonOptions(lessons: Lesson[]) {
  return lessons.map((lesson) => (
    <option key={lesson.id} value={lesson.id}>
      {lesson.title}
    </option>
  ));
}

export default async function AdminPage({ searchParams }: { searchParams: SearchParams }) {
  const loggedIn = isAdminLoggedIn();

  if (!loggedIn) {
    return (
      <main className="admin-login-page">
        <section className="admin-login-card">
          <Logo />
          <div>
            <span className="admin-kicker">Administrativo</span>
            <h1>Entrar na gestao da plataforma</h1>
            <p>Use a senha administrativa para cadastrar cursos, aulas e materiais.</p>
          </div>
          {searchParams.erro === 'senha' ? <p className="admin-alert">Senha incorreta. Tente de novo.</p> : null}
          <form action={loginAdmin} className="admin-login-form">
            <label>
              <span>Senha</span>
              <div className="admin-field">
                <LockKeyhole size={18} />
                <input name="password" type="password" placeholder="Senha administrativa" required />
              </div>
            </label>
            <button type="submit">Entrar</button>
          </form>
        </section>
      </main>
    );
  }

  const { courses, lessons, materials, setupMissing } = await getAdminData();
  const defaultCourseId = courses[0]?.id || '';

  return (
    <main className="admin-page">
      <header className="admin-header">
        <Logo />
        <nav>
          <Link href="/area/evs">Ver plataforma</Link>
          <form action={logoutAdmin}>
            <button type="submit">
              <LogOut size={16} /> Sair
            </button>
          </form>
        </nav>
      </header>

      <section className="admin-hero">
        <span className="admin-kicker">Area administrativa</span>
        <h1>Controle seus cursos sem mexer no Supabase.</h1>
        <p>Cadastre aulas, links de video, materiais de apoio e controle o que aparece para as alunas.</p>
      </section>

      {searchParams.salvo ? <p className="admin-success">Salvo com sucesso.</p> : null}
      {setupMissing ? (
        <p className="admin-alert">
          Falta configurar <strong>SUPABASE_SERVICE_ROLE_KEY</strong> na Vercel para a area admin gravar dados.
        </p>
      ) : null}

      <section className="admin-section">
        <div className="admin-section-title">
          <div>
            <span>Cursos</span>
            <h2>Cadastrar curso</h2>
          </div>
        </div>

        <form action={saveCourse} className="admin-form admin-form-grid">
          <input name="title" placeholder="Nome do curso" required />
          <input name="slug" placeholder="slug. Ex: evs" required />
          <input name="subtitle" placeholder="Subtitulo" />
          <input name="sort_order" type="number" placeholder="Ordem" defaultValue={courses.length + 1} />
          <textarea name="description" placeholder="Descricao" />
          <input name="cover_image_url" placeholder="URL da capa" />
          <label className="admin-check">
            <input name="is_published" type="checkbox" defaultChecked /> Publicado
          </label>
          <button type="submit">
            <Plus size={16} /> Criar curso
          </button>
        </form>

        <div className="admin-list">
          {courses.map((course) => (
            <form action={saveCourse} className="admin-row" key={course.id}>
              <input name="id" type="hidden" value={course.id} />
              <input name="title" defaultValue={course.title} required />
              <input name="slug" defaultValue={course.slug} required />
              <input name="subtitle" defaultValue={course.subtitle || ''} />
              <input name="sort_order" type="number" defaultValue={course.sort_order} />
              <textarea name="description" defaultValue={course.description || ''} />
              <input name="cover_image_url" defaultValue={course.cover_image_url || ''} />
              <label className="admin-check">
                <input name="is_published" type="checkbox" defaultChecked={course.is_published} /> Publicado
              </label>
              <button type="submit">
                <Save size={16} /> Salvar
              </button>
            </form>
          ))}
        </div>
      </section>

      <section className="admin-section">
        <div className="admin-section-title">
          <div>
            <span>Aulas</span>
            <h2>Cadastrar aula</h2>
          </div>
        </div>

        <form action={saveLesson} className="admin-form admin-form-grid">
          <select name="course_id" defaultValue={defaultCourseId} required>{courseOptions(courses)}</select>
          <input name="title" placeholder="Titulo da aula" required />
          <input name="slug" placeholder="slug. Ex: aula-1" required />
          <input name="duration_label" placeholder="Duracao. Ex: 18 min" />
          <input name="sort_order" type="number" placeholder="Ordem" defaultValue={lessons.length + 1} />
          <input name="video_url" placeholder="Link/embed do video" />
          <textarea name="description" placeholder="Descricao da aula" />
          <label className="admin-check">
            <input name="is_published" type="checkbox" defaultChecked /> Publicada
          </label>
          <button type="submit">
            <Plus size={16} /> Criar aula
          </button>
        </form>

        <div className="admin-list">
          {lessons.map((lesson) => (
            <form action={saveLesson} className="admin-row" key={lesson.id}>
              <input name="id" type="hidden" value={lesson.id} />
              <select name="course_id" defaultValue={lesson.course_id} required>{courseOptions(courses)}</select>
              <input name="title" defaultValue={lesson.title} required />
              <input name="slug" defaultValue={lesson.slug} required />
              <input name="duration_label" defaultValue={lesson.duration_label || ''} />
              <input name="sort_order" type="number" defaultValue={lesson.sort_order} />
              <input name="video_url" defaultValue={lesson.video_url || ''} />
              <textarea name="description" defaultValue={lesson.description || ''} />
              <label className="admin-check">
                <input name="is_published" type="checkbox" defaultChecked={lesson.is_published} /> Publicada
              </label>
              <button type="submit">
                <Save size={16} /> Salvar
              </button>
            </form>
          ))}
        </div>
      </section>

      <section className="admin-section">
        <div className="admin-section-title">
          <div>
            <span>Materiais</span>
            <h2>Cadastrar material</h2>
          </div>
        </div>

        <form action={saveMaterial} className="admin-form admin-form-grid">
          <select name="course_id" defaultValue={defaultCourseId} required>{courseOptions(courses)}</select>
          <select name="lesson_id" defaultValue="">
            <option value="">Material geral do curso</option>
            {lessonOptions(lessons)}
          </select>
          <input name="title" placeholder="Nome do material" required />
          <input name="file_url" placeholder="Link do PDF/arquivo" required />
          <input name="sort_order" type="number" placeholder="Ordem" defaultValue={materials.length + 1} />
          <textarea name="description" placeholder="Descricao do material" />
          <label className="admin-check">
            <input name="is_published" type="checkbox" defaultChecked /> Publicado
          </label>
          <button type="submit">
            <Plus size={16} /> Criar material
          </button>
        </form>

        <div className="admin-list">
          {materials.map((material) => (
            <form action={saveMaterial} className="admin-row" key={material.id}>
              <input name="id" type="hidden" value={material.id} />
              <select name="course_id" defaultValue={material.course_id || defaultCourseId} required>
                {courseOptions(courses)}
              </select>
              <select name="lesson_id" defaultValue={material.lesson_id || ''}>
                <option value="">Material geral do curso</option>
                {lessonOptions(lessons)}
              </select>
              <input name="title" defaultValue={material.title} required />
              <input name="file_url" defaultValue={material.file_url} required />
              <input name="sort_order" type="number" defaultValue={material.sort_order} />
              <textarea name="description" defaultValue={material.description || ''} />
              <label className="admin-check">
                <input name="is_published" type="checkbox" defaultChecked={material.is_published} /> Publicado
              </label>
              <button type="submit">
                <Save size={16} /> Salvar
              </button>
            </form>
          ))}
        </div>
      </section>
    </main>
  );
}
