import { Users, Filter, Plus, MessageSquare, Pencil, Trash2 } from 'lucide-react';
import './usuarios.css';

// MODO DE CONSTRUÇÃO: lista de alunas com dados de exemplo.
// Quando ligarmos o Supabase, trocamos este array pela lista real,
// e "último acesso" / "vencimento" passam a vir dos dados de verdade.
const alunas = [
  {
    ini: 'MA',
    nome: 'Mariana Zatorre',
    email: 'marianozatorre45@gmail.com',
    acesso: 'hoje',
    acessoSub: 'às 09:12',
    vencLabel: 'acesso até',
    vencData: '28/07/2027',
    vencTom: '',
    cursos: '2 cursos',
    ativo: true
  },
  {
    ini: 'CR',
    nome: 'Camila Rocha',
    email: 'camila.rocha@email.com',
    acesso: 'ontem',
    acessoSub: 'às 21:40',
    vencLabel: 'acesso até',
    vencData: '10/08/2026',
    vencTom: 'warn',
    cursos: '1 curso',
    ativo: true
  },
  {
    ini: 'JS',
    nome: 'Juliana Souza',
    email: 'ju.souza@email.com',
    acesso: '12/07/2026',
    acessoSub: 'às 08:05',
    vencLabel: 'venceu em',
    vencData: '15/07/2026',
    vencTom: 'exp',
    cursos: '1 curso',
    ativo: false
  },
  {
    ini: 'KF',
    nome: 'Klisse Feitosa',
    email: 'jklisse25@gmail.com',
    acesso: 'nunca acessou',
    acessoSub: '—',
    vencLabel: 'acesso até',
    vencData: '25/06/2027',
    vencTom: '',
    cursos: 'Sem acesso',
    ativo: true
  }
];

export default function UsuariosPage() {
  return (
    <>
      <div className="crumb">⚙ Administrador › Usuários</div>

      <div className="pad">
        <div className="blk-title">Usuários</div>
        <p className="blk-sub">Cadastre alunas, acompanhe o acesso e libere os cursos de cada uma.</p>

        <div className="u-summary">
          <div className="ic">
            <Users size={26} />
          </div>
          <div className="t">
            Total de alunas cadastradas
            <b>{alunas.length} alunas</b>
          </div>
        </div>

        <div className="utitle">
          <div>
            <h2>Lista de alunas</h2>
            <p>Clique numa aluna para gerenciar o acesso aos cursos.</p>
          </div>
          <div className="tools">
            <button className="btn-ghost">
              <Filter size={15} /> Filtrar
            </button>
            <button className="btn-pink">
              <Plus size={16} /> Novo usuário
            </button>
          </div>
        </div>

        <div className="u-panel">
          <table className="utable">
            <thead>
              <tr>
                <th>Aluna</th>
                <th className="hide">Cadastrada em</th>
                <th>Último acesso</th>
                <th>Vencimento</th>
                <th className="hide">Cursos</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {alunas.map((a) => (
                <tr key={a.email}>
                  <td>
                    <div className="uinfo">
                      <span className="ava">{a.ini}</span>
                      <div>
                        <strong>{a.nome}</strong>
                        <small>{a.email}</small>
                      </div>
                    </div>
                  </td>
                  <td className="hide dt">
                    —
                  </td>
                  <td className="dt">
                    {a.acesso}
                    <small>{a.acessoSub}</small>
                  </td>
                  <td className={`venc ${a.vencTom}`}>
                    {a.vencLabel}
                    <small>{a.vencData}</small>
                  </td>
                  <td className="hide cursos">{a.cursos}</td>
                  <td>
                    <span className={a.ativo ? 'toggle on' : 'toggle off'} />
                  </td>
                  <td>
                    <div className="acts">
                      <span className="iconbtn" title="Mensagem">
                        <MessageSquare size={14} />
                      </span>
                      <span className="iconbtn" title="Editar">
                        <Pencil size={14} />
                      </span>
                      <span className="iconbtn" title="Remover">
                        <Trash2 size={14} />
                      </span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
