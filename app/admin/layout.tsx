import Link from 'next/link';
import { Home, User, Settings, Search, Bell } from 'lucide-react';
import './admin.css';

// MODO DE CONSTRUÇÃO: Admin aberto, sem login e sem Supabase.
// Este layout (menu lateral + barra de topo) vale para todas as páginas do Admin.
// Quando a plataforma estiver pronta, entra a checagem de admin de verdade.
export default function AdminLayout({ children }: { children: React.ReactNode }) {
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
