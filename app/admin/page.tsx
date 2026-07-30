import Link from 'next/link';
import {
  ArrowLeft,
  Users,
  BookOpen,
  FileText,
  CreditCard,
  UsersRound,
  Award,
  ShieldCheck,
  MessageSquare,
  Fingerprint,
  Settings
} from 'lucide-react';
import './admin.css';

// MODO DE CONSTRUÇÃO: hub do Admin aberto, sem login e sem Supabase.
// Os cards da Fase 1 ainda não levam a lugar nenhum — construímos Alunos,
// Cursos e Termos nas próximas etapas. Quando a plataforma estiver pronta,
// entra a checagem de admin de verdade.
const fase2 = [
  { icon: CreditCard, label: 'Planos e ofertas' },
  { icon: UsersRound, label: 'Mentores' },
  { icon: Award, label: 'Certificados' },
  { icon: ShieldCheck, label: 'Proteção DRM' },
  { icon: MessageSquare, label: 'SMS' },
  { icon: Fingerprint, label: 'Autenticação' },
  { icon: Settings, label: 'Administradores' }
];

export default function AdminHubPage() {
  return (
    <div className="admin-hub">
      <div className="ah-glow" aria-hidden />
      <div className="ah-glow ah-glow-2" aria-hidden />

      <div className="ah-wrap">
        <header className="ah-top">
          <div className="ah-brand">
            <img
              className="ah-logo"
              src="/brand/logo-dark.png"
              alt="Academia de Vendas Suzana Zatorre"
            />
            <span className="ah-title">Painel administrativo</span>
          </div>
          <Link className="ah-back" href="/area">
            <ArrowLeft size={16} /> Voltar para a área
          </Link>
        </header>

        <div className="ah-phase">
          <span className="ah-tag">Fase 1</span>
          <span className="ah-sub">O essencial para colocar alunos e cursos no ar</span>
        </div>

        <div className="ah-grid">
          <Link className="ah-card" href="#">
            <span className="ah-ico">
              <Users size={26} />
            </span>
            <h3>Alunos</h3>
            <p>Cadastrar alunas, liberar acesso a cada curso e gerenciar quem entra.</p>
            <span className="ah-go">Gerenciar →</span>
          </Link>

          <Link className="ah-card" href="#">
            <span className="ah-ico">
              <BookOpen size={26} />
            </span>
            <h3>Cursos</h3>
            <p>Criar e editar cursos, módulos e aulas, com vídeos e materiais.</p>
            <span className="ah-go">Gerenciar →</span>
          </Link>

          <Link className="ah-card" href="#">
            <span className="ah-ico">
              <FileText size={26} />
            </span>
            <h3>Termos de uso</h3>
            <p>Editar o texto dos termos que a aluna aceita ao entrar na plataforma.</p>
            <span className="ah-go">Editar →</span>
          </Link>
        </div>

        <div className="ah-phase">
          <span className="ah-tag later">Fase 2</span>
          <span className="ah-sub">Recursos avançados que entram numa segunda leva</span>
        </div>

        <div className="ah-grid later">
          {fase2.map((item) => {
            const Icon = item.icon;
            return (
              <div className="ah-card" key={item.label}>
                <span className="ah-later-pill">depois</span>
                <span className="ah-ico">
                  <Icon size={24} />
                </span>
                <h3>{item.label}</h3>
              </div>
            );
          })}
        </div>

        <footer className="ah-foot">
          © 2026 Suzana Zatorre. Todos os direitos reservados. · Painel administrativo — Fase 1
        </footer>
      </div>
    </div>
  );
}
