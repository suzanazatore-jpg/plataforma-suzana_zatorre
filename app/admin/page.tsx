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
            <Link className="acard" href="/admin/termos">
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
            </Link>
          </div>
        </div>

        <div className="group">
          <h2>Marketing e Comunicação</h2>
          <p>Ações que comunicam e engajam seus alunos.</p>
          <div className="grid">
            <Link className="acard" href="/admin/comentarios">
              <span className="ic"><MessageSquare size={24} /></span>
              <div>
                <h3>Comentários</h3>
                <p>Veja e modere o feedback dos alunos nas aulas.</p>
              </div>
            </Link>
            <Link className="acard" href="#">
              <span className="ic"><Mail size={24} /></span>
              <div>
                <h3>Suporte</h3>
                <p>Mensagens de suporte recebidas pela plataforma.</p>
              </div>
            </Link>
            <Link className="acard" href="#">
              <span className="ic"><Send size={24} /></span>
              <div>
                <h3>Campanhas e Mensagens <span className="tag new">novo</span></h3>
                <p>Envie comunicados e e-mails para seus alunos.</p>
              </div>
            </Link>
          </div>
        </div>

        <div className="group">
          <h2>Configurações</h2>
          <p>Cores, preferências e segurança da área de membros.</p>
          <div className="grid">
            <Link className="acard" href="#">
              <span className="ic"><Palette size={24} /></span>
              <div>
                <h3>Preferências e Cores</h3>
                <p>Ajuste o visual da área de membros com o seu estilo.</p>
              </div>
            </Link>
            <Link className="acard" href="/admin/termos">
              <span className="ic"><FileText size={24} /></span>
              <div>
                <h3>Termos de Uso</h3>
                <p>Solicite aos alunos que aceitem os termos do seu conteúdo.</p>
              </div>
            </Link>
            <div className="acard dim">
              <span className="ic"><ShieldCheck size={24} /></span>
              <div>
                <h3>Proteção DRM <span className="tag">depois</span></h3>
                <p>Marca d'água e proteção do conteúdo.</p>
              </div>
            </div>
            <div className="acard dim">
              <span className="ic"><Smartphone size={24} /></span>
              <div>
                <h3>Notificações SMS <span className="tag">depois</span></h3>
                <p>Envio de notificações por SMS.</p>
              </div>
            </div>
            <div className="acard dim">
              <span className="ic"><Fingerprint size={24} /></span>
              <div>
                <h3>Autenticação e Segurança <span className="tag">depois</span></h3>
                <p>Regras de login e acesso à área de membros.</p>
              </div>
            </div>
            <div className="acard dim">
              <span className="ic"><UserCog size={24} /></span>
              <div>
                <h3>Administradores <span className="tag">depois</span></h3>
                <p>Atribua permissões administrativas a outras pessoas.</p>
              </div>
            </div>
          </div>
        </div>

        <div className="legend">
          <div className="k"><span className="dot" style={{ background: 'var(--hot)' }} /> <b>Fase 1</b> — construímos primeiro (o essencial pra usar)</div>
          <div className="k"><span className="dot" style={{ background: '#3a3335' }} /> Fase 2 — recursos avançados, entram depois</div>
        </div>
      </div>
    </>
  );
}
