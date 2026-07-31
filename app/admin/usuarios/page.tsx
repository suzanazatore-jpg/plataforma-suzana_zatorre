import Link from 'next/link';
import {
  Users,
  Filter,
  Plus,
  MessageSquare,
  Pencil,
  Trash2
} from 'lucide-react';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import './usuarios.css';

export const dynamic = 'force-dynamic';

function formatarData(data?: string | null) {
  if (!data) return '—';

  return new Intl.DateTimeFormat('pt-BR', {
    timeZone: 'America/Fortaleza'
  }).format(new Date(data));
}

function formatarUltimoAcesso(data?: string | null) {
  if (!data) {
    return {
      acesso: 'nunca acessou',
      acessoSub: '—'
    };
  }

  const valor = new Date(data);

  return {
    acesso: new Intl.DateTimeFormat('pt-BR', {
      timeZone: 'America/Fortaleza'
    }).format(valor),

    acessoSub: `às ${new Intl.DateTimeFormat('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'America/Fortaleza'
    }).format(valor)}`
  };
}

function criarIniciais(nome: string) {
  const partes = nome.trim().split(/\s+/).filter(Boolean);

  if (partes.length === 0) return 'AL';
  if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase();

  return `${partes[0][0]}${partes[partes.length - 1][0]}`.toUpperCase();
}

export default async function UsuariosPage() {
  const supabase = createSupabaseAdminClient();

  let alunas: any[] = [];
  let erroConexao = false;

  if (!supabase) {
    erroConexao = true;
  } else {
    const [
      { data: profiles, error: profilesError },
      { data: enrollments, error: enrollmentsError },
      { data: authData, error: authError }
    ] = await Promise.all([
      supabase
        .from('profiles')
        .select('id, name, email, status, created_at')
        .order('created_at', { ascending: false }),

      supabase
        .from('enrollments')
        .select('profile_id, status, expires_at'),

      supabase.auth.admin.listUsers({
        page: 1,
        perPage: 1000
      })
    ]);

    if (profilesError || enrollmentsError || authError) {
      erroConexao = true;

      console.error('Erro ao carregar usuários:', {
        profilesError,
        enrollmentsError,
        authError
      });
    } else {
      alunas = (profiles || []).map((profile) => {
        const matriculas = (enrollments || []).filter(
          (item) => item.profile_id === profile.id
        );

        const usuarioAuth = authData?.users?.find(
          (usuario) => usuario.id === profile.id
        );

        const ultimoAcesso = formatarUltimoAcesso(
          usuarioAuth?.last_sign_in_at
        );

        const vencimentos = matriculas
          .map((item) => item.expires_at)
          .filter(Boolean)
          .sort();

        const vencimentoMaisProximo = vencimentos[0] || null;

        const venceu = vencimentoMaisProximo
          ? new Date(vencimentoMaisProximo).getTime() < Date.now()
          : false;

        const faltamTrintaDias = vencimentoMaisProximo
          ? new Date(vencimentoMaisProximo).getTime() - Date.now() <=
              30 * 24 * 60 * 60 * 1000 && !venceu
          : false;

        const matriculasAtivas = matriculas.filter(
          (item) => item.status === 'active'
        );

        const ativo =
          profile.status === 'active' &&
          matriculasAtivas.length > 0 &&
          !venceu;

        return {
          id: profile.id,
          ini: criarIniciais(profile.name || profile.email || 'Aluna'),
          nome: profile.name || 'Aluna sem nome',
          email: profile.email || '',
          cadastradaEm: formatarData(profile.created_at),
          acesso: ultimoAcesso.acesso,
          acessoSub: ultimoAcesso.acessoSub,
          vencLabel: venceu ? 'venceu em' : 'acesso até',
          vencData: formatarData(vencimentoMaisProximo),
          vencTom: venceu ? 'exp' : faltamTrintaDias ? 'warn' : '',
          cursos:
            matriculas.length === 0
              ? 'Sem acesso'
              : matriculas.length === 1
                ? '1 curso'
                : `${matriculas.length} cursos`,
          ativo
        };
      });
    }
  }

  return (
    <>
      <div className="crumb">⚙ Administrador › Usuários</div>

      <div className="pad">
        <div className="blk-title">Usuários</div>

        <p className="blk-sub">
          Cadastre alunas, acompanhe o acesso e libere os cursos de cada uma.
        </p>

        <div className="u-summary">
          <div className="ic">
            <Users size={26} />
          </div>

          <div className="t">
            Total de alunas cadastradas
            <b>
              {alunas.length} {alunas.length === 1 ? 'aluna' : 'alunas'}
            </b>
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

        {erroConexao ? (
          <div className="u-panel" style={{ padding: 24 }}>
            Não foi possível carregar os usuários do Supabase.
          </div>
        ) : (
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
                {alunas.length === 0 ? (
                  <tr>
                    <td
                      colSpan={7}
                      style={{ padding: 28, textAlign: 'center' }}
                    >
                      Nenhuma aluna cadastrada.
                    </td>
                  </tr>
                ) : (
                  alunas.map((a) => (
                    <tr key={a.id}>
                      <td>
                        <Link
                          href={`/admin/usuarios/acesso?id=${a.id}`}
                          style={{
                            color: 'inherit',
                            textDecoration: 'none'
                          }}
                        >
                          <div className="uinfo">
                            <span className="ava">{a.ini}</span>

                            <div>
                              <strong>{a.nome}</strong>
                              <small>{a.email}</small>
                            </div>
                          </div>
                        </Link>
                      </td>

                      <td className="hide dt">{a.cadastradaEm}</td>

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
                        <span
                          className={a.ativo ? 'toggle on' : 'toggle off'}
                        />
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
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
