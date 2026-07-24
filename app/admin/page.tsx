import Link from 'next/link';
import {
  BookOpen,
  FileText,
  FolderKanban,
  Home,
  Layers3,
  LockKeyhole,
  LogOut,
  Plus,
  Save,
  ShieldCheck,
  User,
  Video
} from 'lucide-react';
import { Logo } from '@/components/Logo';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { loginAdmin, logoutAdmin, saveCourse, saveLesson, saveMaterial, saveModule } from './actions';
import { isAdminLoggedIn } from './session';
import './admin.css';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

type SearchParams = {
  curso?: string;
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

type Module = {
  id: string;
  course_id: string;
  title: string;
  description: string | null;
  sort_order: number;
  is_published: boolean;
};

type Lesson = {
  id: string;
  course_id: string;
  module_id: string | null;
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
      modules: [] as Module[],
      lessons: [] as Lesson[],
      materials: [] as Material[],
      setupMissing: true,
      modulesMissing: false
    };
  }

  const [coursesResult, modulesResult, lessonsResult, materialsResult] = await Promise.all([
    supabase.from('courses').select('*').order('sort_order', { ascending: true }),
    supabase.from('modules').select('*').order('sort_order', { ascending: true }),
    supabase.from('lessons').select('*').order('sort_order', { ascending: true }),
    supabase.from('materials').select('*').order('sort_order', { ascending: true })
  ]);

  return {
    courses: (coursesResult.data || []) as Course[],
    modules: (modulesResult.data || []) as Module[],
    lessons: (lessonsResult.data || []) as Lesson[],
    materials: (materialsResult.data || []) as Material[],
    setupMissing: false,
    modulesMissing: Boolean(modulesResult.error)
  };
}

function moduleOptions(modules: Module[]) {
  return modules.map((module) => (
    <option key={module.id} value={module.id}>
      {module.title}
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
            <p>Use a senha administrativa para cadastrar cursos, modulos, aulas e materiais.</p>
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

  const { courses, modules, lessons, materials, setupMissing, modulesMissing } = await getAdminData();
  const selectedCourse = courses.find((course) => course.slug === searchParams.curso) || courses[0];
  const selectedCourseId = selectedCourse?.id || '';
  const selectedCourseSlug = selectedCourse?.slug || '';
  const courseModules = modules.filter((module) => module.course_id === selectedCourseId);
  const courseLessons = lessons.filter((lesson) => lesson.course_id === selectedCourseId);
  const looseLessons = courseLessons.filter((lesson) => !lesson.module_id);
  const courseMaterials = materials.filter(
    (material) => material.course_id === selectedCourseId && !material.lesson_id
  );
  const materialsByLesson = courseLessons.reduce<Record<string, Material[]>>((acc, lesson) => {
    acc[lesson.id] = materials.filter((material) => material.lesson_id === lesson.id);
    return acc;
  }, {});

  return (
    <main className="admin-page">
      <aside className="admin-sidebar">
        <div className="admin-profile">
          <div className="admin-avatar">
            <User size={26} />
          </div>
          <strong>Suzana Zatorre</strong>
          <span>Administrador</span>
          <div className="admin-progress">
            <i />
          </div>
        </div>

        <nav className="admin-side-nav">
          <Link href="/area">
            <Home size={18} /> Inicio
          </Link>
          <Link href="/area">
            <BookOpen size={18} /> Area de Membros
          </Link>
          <a href="#conta">
            <User size={18} /> Minha Conta
          </a>
          <Link className="active" href="/admin">
            <ShieldCheck size={18} /> Administrador
          </Link>
        </nav>

        <form action={logoutAdmin} className="admin-logout">
          <button type="submit">
            <LogOut size={16} /> Sair
          </button>
        </form>
      </aside>

      <div className="admin-content">
        <header className="admin-header">
          <Logo />
          <nav>
            <Link href="/area">Area de membros</Link>
            <Link href="/area/evs">Ver EVS</Link>
          </nav>
        </header>

        <section className="admin-hero">
          <span className="admin-kicker">Area administrativa</span>
          <h1>Cursos, modulos, aulas e materiais no mesmo lugar.</h1>
          <p>Fluxo estilo Astron: escolha o curso, organize os modulos, cadastre aulas e coloque materiais abaixo da aula certa.</p>
        </section>

        {searchParams.salvo ? <p className="admin-success">Salvo com sucesso.</p> : null}
        {setupMissing ? (
          <p className="admin-alert">
            Falta configurar <strong>SUPABASE_SERVICE_ROLE_KEY</strong> na Vercel para a area admin gravar dados.
          </p>
        ) : null}
        {modulesMissing ? (
          <p className="admin-alert">
            Falta rodar a atualizacao SQL da V14 no Supabase para criar <strong>modules</strong> e liberar aulas por modulo.
          </p>
        ) : null}

        <section className="admin-section" id="cursos">
          <div className="admin-section-title">
            <div>
              <span>1. Cursos</span>
              <h2>Meus cursos</h2>
            </div>
          </div>

          <div className="admin-course-cards">
            {courses.map((course) => (
              <Link
                className={course.id === selectedCourseId ? 'admin-course-card active' : 'admin-course-card'}
                href={`/admin?curso=${course.slug}`}
                key={course.id}
              >
                <FolderKanban size={22} />
                <div>
                  <strong>{course.title}</strong>
                  <span>{course.is_published ? 'Publicado' : 'Oculto'} • {lessons.filter((lesson) => lesson.course_id === course.id).length} aulas</span>
                </div>
              </Link>
            ))}
          </div>

          <details className="admin-create-box">
            <summary>
              <Plus size={16} /> Criar novo curso
            </summary>
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
          </details>
        </section>

        {selectedCourse ? (
          <section className="admin-section">
            <div className="admin-section-title">
              <div>
                <span>2. Curso selecionado</span>
                <h2>{selectedCourse.title}</h2>
              </div>
            </div>

            <form action={saveCourse} className="admin-row admin-course-edit">
              <input name="id" type="hidden" value={selectedCourse.id} />
              <input name="title" defaultValue={selectedCourse.title} required />
              <input name="slug" defaultValue={selectedCourse.slug} required />
              <input name="subtitle" defaultValue={selectedCourse.subtitle || ''} />
              <input name="sort_order" type="number" defaultValue={selectedCourse.sort_order} />
              <textarea name="description" defaultValue={selectedCourse.description || ''} />
              <input name="cover_image_url" defaultValue={selectedCourse.cover_image_url || ''} />
              <label className="admin-check">
                <input name="is_published" type="checkbox" defaultChecked={selectedCourse.is_published} /> Publicado
              </label>
              <button type="submit">
                <Save size={16} /> Salvar curso
              </button>
            </form>
          </section>
        ) : null}

        {selectedCourse ? (
          <section className="admin-section">
            <div className="admin-section-title">
              <div>
                <span>3. Modulos e aulas</span>
                <h2>Estrutura do curso</h2>
              </div>
            </div>

            <form action={saveModule} className="admin-form admin-module-create">
              <input name="course_id" type="hidden" value={selectedCourseId} />
              <input name="course_slug" type="hidden" value={selectedCourseSlug} />
              <input name="title" placeholder="Nome do modulo. Ex: Modulo 1 - Fundamentos" required />
              <input name="sort_order" type="number" placeholder="Ordem" defaultValue={courseModules.length + 1} />
              <textarea name="description" placeholder="Descricao curta do modulo" />
              <label className="admin-check">
                <input name="is_published" type="checkbox" defaultChecked /> Publicado
              </label>
              <button type="submit">
                <Plus size={16} /> Criar modulo
              </button>
            </form>

            <div className="admin-module-list">
              {courseModules.map((module) => {
                const moduleLessons = courseLessons.filter((lesson) => lesson.module_id === module.id);
                return (
                  <article className="admin-module-card" key={module.id}>
                    <form action={saveModule} className="admin-module-head">
                      <input name="id" type="hidden" value={module.id} />
                      <input name="course_id" type="hidden" value={selectedCourseId} />
                      <input name="course_slug" type="hidden" value={selectedCourseSlug} />
                      <Layers3 size={20} />
                      <input name="title" defaultValue={module.title} required />
                      <input name="sort_order" type="number" defaultValue={module.sort_order} />
                      <textarea name="description" defaultValue={module.description || ''} />
                      <label className="admin-check">
                        <input name="is_published" type="checkbox" defaultChecked={module.is_published} /> Publicado
                      </label>
                      <button type="submit">
                        <Save size={16} /> Salvar modulo
                      </button>
                    </form>

                    <form action={saveLesson} className="admin-form admin-lesson-create">
                      <input name="course_id" type="hidden" value={selectedCourseId} />
                      <input name="course_slug" type="hidden" value={selectedCourseSlug} />
                      <input name="module_id" type="hidden" value={module.id} />
                      <input name="title" placeholder="Titulo da aula" required />
                      <input name="slug" placeholder="slug. Ex: aula-1" required />
                      <input name="duration_label" placeholder="Duracao" />
                      <input name="sort_order" type="number" placeholder="Ordem" defaultValue={moduleLessons.length + 1} />
                      <input name="video_url" placeholder="Link/embed do video" />
                      <textarea name="description" placeholder="Descricao da aula" />
                      <label className="admin-check">
                        <input name="is_published" type="checkbox" defaultChecked /> Publicada
                      </label>
                      <button type="submit">
                        <Plus size={16} /> Criar aula
                      </button>
                    </form>

                    <div className="admin-lesson-stack">
                      {moduleLessons.length ? (
                        moduleLessons.map((lesson) => (
                          <LessonEditor
                            courseId={selectedCourseId}
                            courseSlug={selectedCourseSlug}
                            key={lesson.id}
                            lesson={lesson}
                            modules={courseModules}
                            materials={materialsByLesson[lesson.id] || []}
                          />
                        ))
                      ) : (
                        <p className="admin-empty">Nenhuma aula neste modulo ainda.</p>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>

            {looseLessons.length ? (
              <article className="admin-module-card">
                <div className="admin-orphan-head">
                  <Layers3 size={20} />
                  <strong>Aulas sem modulo</strong>
                  <span>Escolha um modulo dentro da aula para organizar.</span>
                </div>
                <div className="admin-lesson-stack">
                  {looseLessons.map((lesson) => (
                    <LessonEditor
                      courseId={selectedCourseId}
                      courseSlug={selectedCourseSlug}
                      key={lesson.id}
                      lesson={lesson}
                      modules={courseModules}
                      materials={materialsByLesson[lesson.id] || []}
                    />
                  ))}
                </div>
              </article>
            ) : null}
          </section>
        ) : null}

        {selectedCourse ? (
          <section className="admin-section">
            <div className="admin-section-title">
              <div>
                <span>4. Materiais gerais</span>
                <h2>Materiais do curso inteiro</h2>
              </div>
            </div>

            <form action={saveMaterial} className="admin-form admin-material-create">
              <input name="course_id" type="hidden" value={selectedCourseId} />
              <input name="course_slug" type="hidden" value={selectedCourseSlug} />
              <input name="lesson_id" type="hidden" value="" />
              <input name="title" placeholder="Nome do material" required />
              <input name="file_url" placeholder="Link do PDF/arquivo ou deixe vazio se subir arquivo" />
              <input name="material_file" type="file" />
              <input name="sort_order" type="number" placeholder="Ordem" defaultValue={courseMaterials.length + 1} />
              <textarea name="description" placeholder="Descricao do material" />
              <label className="admin-check">
                <input name="is_published" type="checkbox" defaultChecked /> Publicado
              </label>
              <button type="submit">
                <Plus size={16} /> Adicionar material
              </button>
            </form>

            <div className="admin-material-list">
              {courseMaterials.length ? (
                courseMaterials.map((material) => (
                  <MaterialEditor
                    courseId={selectedCourseId}
                    courseSlug={selectedCourseSlug}
                    key={material.id}
                    material={material}
                  />
                ))
              ) : (
                <p className="admin-empty">Nenhum material geral neste curso ainda.</p>
              )}
            </div>
          </section>
        ) : null}
      </div>
    </main>
  );
}

function LessonEditor({
  courseId,
  courseSlug,
  lesson,
  materials,
  modules
}: {
  courseId: string;
  courseSlug: string;
  lesson: Lesson;
  materials: Material[];
  modules: Module[];
}) {
  return (
    <article className="admin-lesson-card">
      <details open>
        <summary>
          <Video size={18} />
          <strong>{lesson.title}</strong>
          <span>{lesson.is_published ? 'Publicada' : 'Oculta'}</span>
        </summary>

        <form action={saveLesson} className="admin-row">
          <input name="id" type="hidden" value={lesson.id} />
          <input name="course_id" type="hidden" value={courseId} />
          <input name="course_slug" type="hidden" value={courseSlug} />
          <select name="module_id" defaultValue={lesson.module_id || ''}>
            <option value="">Sem modulo</option>
            {moduleOptions(modules)}
          </select>
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
            <Save size={16} /> Salvar aula
          </button>
        </form>

        <div className="admin-material-nest">
          <div className="admin-nest-title">
            <FileText size={17} />
            <strong>Materiais desta aula</strong>
          </div>

          <form action={saveMaterial} className="admin-form admin-material-create">
            <input name="course_id" type="hidden" value={courseId} />
            <input name="course_slug" type="hidden" value={courseSlug} />
            <input name="lesson_id" type="hidden" value={lesson.id} />
            <input name="title" placeholder="Nome do material" required />
            <input name="file_url" placeholder="Link do PDF/arquivo ou deixe vazio se subir arquivo" />
            <input name="material_file" type="file" />
            <input name="sort_order" type="number" placeholder="Ordem" defaultValue={materials.length + 1} />
            <textarea name="description" placeholder="Descricao curta" />
            <label className="admin-check">
              <input name="is_published" type="checkbox" defaultChecked /> Publicado
            </label>
            <button type="submit">
              <Plus size={16} /> Adicionar material
            </button>
          </form>

          <div className="admin-material-list">
            {materials.length ? (
              materials.map((material) => (
                <MaterialEditor
                  courseId={courseId}
                  courseSlug={courseSlug}
                  key={material.id}
                  lessonId={lesson.id}
                  material={material}
                />
              ))
            ) : (
              <p className="admin-empty">Nenhum material nesta aula ainda.</p>
            )}
          </div>
        </div>
      </details>
    </article>
  );
}

function MaterialEditor({
  courseId,
  courseSlug,
  lessonId,
  material
}: {
  courseId: string;
  courseSlug: string;
  lessonId?: string;
  material: Material;
}) {
  return (
    <form action={saveMaterial} className="admin-material-row">
      <input name="id" type="hidden" value={material.id} />
      <input name="course_id" type="hidden" value={courseId} />
      <input name="course_slug" type="hidden" value={courseSlug} />
      <input name="lesson_id" type="hidden" value={lessonId || ''} />
      <input name="title" defaultValue={material.title} required />
      <input name="file_url" defaultValue={material.file_url} required />
      <input name="material_file" type="file" />
      <input name="sort_order" type="number" defaultValue={material.sort_order} />
      <textarea name="description" defaultValue={material.description || ''} />
      <label className="admin-check">
        <input name="is_published" type="checkbox" defaultChecked={material.is_published} /> Publicado
      </label>
      <button type="submit">
        <Save size={16} /> Salvar
      </button>
    </form>
  );
}
