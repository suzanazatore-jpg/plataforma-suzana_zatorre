import Link from 'next/link';
import { User, Info } from 'lucide-react';
import './acesso.css';

// MODO DE CONSTRUÇÃO: tela de acesso aos cursos de uma aluna (exemplo).
// As chavinhas e o "Salvar acessos" ainda não gravam — ligamos com o Supabase depois.
const cursos = [
  { nome: 'EVS — Equipe que Vende Sozinha', sub: 'Curso principal', thumb: 't-pk', label: 'EVS · Vende Sozinha', on: true },
  { nome: 'Mentoria Acelerador de Vendas', sub: '22 aulas', thumb: 't-gd', label: 'Acelerador de Vendas', on: true },
  { nome: 'Lucrando com WhatsApp', sub: '8 aulas', thumb: 't-gn', label: 'Lucrando WhatsApp', on: false },
  { nome: 'Instagram para Lojistas', sub: '10 aulas', thumb: 't-nt', label: 'Instagram p/ Lojistas', on: false },
  { nome: 'Desafio: Zerando o Estoque em 7 dias', sub: '7 aulas', thumb: 't-nt', label: 'Zerando o Estoque', on: false }
];

export default function AcessoCursosPage() {
  const liberados = cursos.filter((c) => c.on).length;

  return (
    <>
      <div className="crumb">⚙ Administrador › Usuários › Ana Carolina › Acesso aos Cursos</div>

      <div className="pad">
        <div className="stu-head">
          <span className="ava">
            <User size={26} />
          </span>
          <div>
            <h1>Ana Carolina</h1>
            <small>carolinaolvr1996@gmail.com</small>
          </div>
          <div className="st">
            Cursos liberados
            <b>{liberados} de {cursos.length}</b>
          </div>
        </div>

        <div className="tabs">
          <Link href="#">Dados</Link>
          <Link className="on" href="#">Acesso aos Cursos</Link>
          <Link href="#">Histórico</Link>
        </div>

        <div className="acc-head">
          <div>
            <h2>Liberar acesso aos cursos</h2>
            <p>Ligue o acesso de cada curso individualmente. Só os cursos ligados aparecem na área de membros desta aluna.</p>
          </div>
          <div className="bulk">
            <button className="btn-ghost">Liberar todos</button>
            <button className="btn-ghost">Bloquear todos</button>
          </div>
        </div>

        <div className="courses">
          {cursos.map((c) => (
            <div className="crow" key={c.nome}>
              <div className={`thumb ${c.thumb}`}>
                <span>{c.label}</span>
              </div>
              <div className="info">
                <h3>{c.nome}</h3>
                <small>{c.sub}</small>
              </div>
              <span className={`state ${c.on ? 'lib' : 'blo'}`}>{c.on ? 'Liberado' : 'Bloqueado'}</span>
              <span className={`toggle ${c.on ? 'on' : 'off'}`} />
            </div>
          ))}
        </div>

        <div className="foot">
          <div className="summary">
            <b>{liberados}</b> de <b>{cursos.length}</b> cursos liberados para Ana Carolina
          </div>
          <button className="btn-pink-sq">Salvar acessos</button>
        </div>

        <div className="ac-note">
          <Info size={16} />
          Quando a compra vem pelo checkout, o acesso ao curso é liberado automaticamente. Esta tela é para liberar ou bloquear na mão — cortesia, suporte ou reembolso.
        </div>
      </div>
    </>
  );
}
