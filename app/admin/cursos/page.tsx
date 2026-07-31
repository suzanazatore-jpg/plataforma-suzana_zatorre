import Link from 'next/link';
import { Plus } from 'lucide-react';
import './cursos.css';

// MODO DE CONSTRUÇÃO: lista de cursos com dados de exemplo.
// Clicar num curso abre a tela de editar (módulos e aulas). Dados reais entram com o Supabase.
const cursos = [
  { nome: 'EVS — Equipe que Vende Sozinha', thumb: 't-pk', label: 'EVS — Equipe que Vende Sozinha', mods: 4, aulas: 18, pub: true },
  { nome: 'Mentoria Acelerador de Vendas', thumb: 't-gd', label: 'Acelerador de Vendas', mods: 3, aulas: 22, pub: true },
  { nome: 'Lucrando com WhatsApp', thumb: 't-gn', label: 'Lucrando com WhatsApp', mods: 2, aulas: 8, pub: false },
  { nome: 'Instagram para Lojistas', thumb: 't-bl', label: 'Instagram para Lojistas', mods: 2, aulas: 10, pub: true }
];

export default function CursosPage() {
  return (
    <>
      <div className="crumb">⚙ Administrador › Cursos</div>

      <div className="pad">
        <div className="head-row">
          <div>
            <div className="blk-title">Cursos e Aulas</div>
            <p className="blk-sub">Crie e organize seus cursos, módulos e aulas.</p>
          </div>
          <Link className="btn-pink" href="/admin/cursos/editar">
            <Plus size={16} /> Novo curso
          </Link>
        </div>

        <div className="cgrid">
          {cursos.map((c) => (
            <Link className="ccard" href="/admin/cursos/editar" key={c.nome}>
              <div className={`cthumb ${c.thumb}`}>
                <span>{c.label}</span>
              </div>
              <div className="cbody">
                <h3>{c.nome}</h3>
                <div className="meta">{c.mods} módulos · {c.aulas} aulas</div>
                <div className="cfoot">
                  <span className={`badge ${c.pub ? 'on' : 'off'}`}>{c.pub ? 'Publicado' : 'Rascunho'}</span>
                  <span className="edit-link">Editar →</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </>
  );
}
