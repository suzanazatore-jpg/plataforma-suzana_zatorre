import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Home, User, Settings, Search, Bell } from 'lucide-react';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import './admin.css';

export const dynamic = 'force-dynamic';

// Este layout (menu lateral + barra de topo) vale para todas as páginas do Admin.
// PROTEÇÃO: só administradora logada e ativa acessa o painel; senão, redireciona.
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const sessao = createSupabaseServerClient();
  if (!sessao) redirect('/?erro=login');
  const { data: auth } = await sessao.auth.getUser();
  if (!auth?.user) redirect('/?erro=login');

  const db = createSupabaseAdminClient();
  const { data: perfil } = db
    ? await db.from('profiles').select('role,status').eq('id', auth.user.id).maybeSingle()
    : { data: null };
  if (!perfil || perfil.role !== 'admin' || perfil.status !== 'active') redirect('/acesso-negado');

  return (
    <div className="admin-shell">
      <div className="app">
        <aside className="sidebar">
          <div className="side-brand">
            <img src="/brand/logo-dark.png" alt="Academia de Vendas Suzana Zatorre" />
          </div>

          <div className="uava">
            <User size={26} />
          </div>
          <div className="pw">
            <div className="u">Suzana Zatorre</div>
            <div className="lbl">Administradora</div>
            <div className="bar">
              <i />
            </div>
          </div>

          <nav className="nav">
            <Link href="/area">
              <Home size={18} /> Início
            </Link>
            <Link href="/area">
              <User size={18} /> Minha Conta
            </Link>
            <Link className="active" href="/admin">
              <Settings size={18} /> Administrador
            </Link>
          </nav>

          <div className="side-links">
            <a href="#">Pesquisar</a>
            <a href="#">Suporte para Alunos</a>
            <a href="#">Termos de Uso</a>
            <a href="#">Políticas de Privacidade</a>
          </div>
        </aside>

        <main className="main">
          <div className="topbar">
            <div className="search">
              <Search size={15} /> Pesquisar cursos e aulas...
            </div>
            <div className="right">
              <Link className="to-area" href="/area">
                <Home size={16} /> Área de aulas
              </Link>
              <Bell size={19} />
              <span className="usr">Suzana ▾</span>
            </div>
          </div>

          {children}
        </main>
      </div>
    </div>
  );
}
