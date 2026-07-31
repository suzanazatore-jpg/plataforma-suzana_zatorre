import Link from 'next/link';
import {
  Users,
  BookOpen,
  FileText,
  Layers,
  UsersRound,
  GraduationCap,
  Image,
  GalleryHorizontal,
  MessageSquare,
  Mail,
  Send,
  Palette,
  ShieldCheck,
  Smartphone,
  Fingerprint,
  UserCog
} from 'lucide-react';

// MODO DE CONSTRUÇÃO: painel do Admin. Os cards em cinza (dim) são da Fase 2.
const fase2 = [
  { icon: CreditCard, label: 'Planos e ofertas' }
];

export default function AdminPage() {
  return (
    <>
      <div className="crumb">⚙ Administrador</div>

      <div className="pad">
        <div className="group">
          <h2>Gerenciamento de Conteúdo e Usuários</h2>
          <p>Gerencie o conteúdo e os alunos da sua área de membros.</p>
          <div className="grid">
            <Link className="acard" href="/admin/usuarios">
              <span className="ic"><Users size={24} /></span>
              <div>
                <h3>Usuários</h3>
                <p>Cadastre alunos, libere acesso aos cursos e gerencie status.</p>
              </div>
            </Link>
            <Link className="acard" href="/admin/cursos">
              <span className="ic"><BookOpen size={24} /></span>
              <div>
                <h3>Cursos e Aulas</h3>
                <p>Crie cursos, módulos e aulas com vídeo e materiais.</p>
              </div>
            </Link>
            <Link className="acard" href="#">
              <span className="ic"><FileText size={24} /></span>
              <div>
                <h3>Termos de Uso</h3>
                <p>O texto que o aluno aceita no primeiro acesso (reembolso, regras).</p>
              </div>
            </Link>
            <div className="acard dim">
              <span className="ic"><Layers size={24} /></span>
              <div>
                <h3>Planos e Ofertas <span className="tag">depois</span></h3>
                <p>Gerencie planos e ofertas de acesso aos cursos.</p>
              </div>
            </div>
            <div className="acard dim">
              <span className="ic"><UsersRound size={24} /></span>
              <div>
                <h3>Mentores <span className="tag">depois</span></h3>
                <p>Associe mentores às aulas do seu clube.</p>
              </div>
            </div>
            <div className="acard dim">
              <span className="ic"><GraduationCap size={24} /></span>
              <div>
                <h3>Certificados <span className="tag">depois</span></h3>
                <p>Certificados de conclusão para os alunos.</p>
              </div>
            </div>
          </div>
        </div>

        <div className="group">
          <h2>Dashboard da Área de Membros</h2>
          <p>Configure a página inicial que o aluno vê.</p>
          <div className="grid">
            <Link className="acard" href="#">
              <span className="ic"><Image size={24} /></span>
              <div>
                <h3>Banners da Dashboard</h3>
                <p>Insira banners de novidades no topo da área de membros.</p>
              </div>
            </Link>
            <Link className="acard" href="#">
              <span className="ic"><GalleryHorizontal size={24} /></span>
              <div>
                <h3>Carrosséis de Cursos</h3>
                <p>Organize os cursos em seções e carrosséis na dashboard.</p>
              </div>
