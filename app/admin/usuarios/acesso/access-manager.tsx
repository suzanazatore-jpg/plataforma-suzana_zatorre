'use client';

import { useState, useTransition } from 'react';

export type CursoAcesso = {
  id: string;
  titulo: string;
  subtitulo: string;
  capa: string | null;
  ativo: boolean;
};

type Props = {
  alunaId: string;
  alunaNome: string;
  cursos: CursoAcesso[];
  salvarAcessos: (
    alunaId: string,
    cursosAtivos: string[]
  ) => Promise<{ ok: boolean; mensagem: string }>;
};

export default function AccessManager({
  alunaId,
  alunaNome,
  cursos,
  salvarAcessos
}: Props) {
  const [ativos, setAtivos] = useState(
    () => new Set(cursos.filter((curso) => curso.ativo).map((curso) => curso.id))
  );
  const [retorno, setRetorno] = useState<{
    tipo: 'sucesso' | 'erro';
    texto: string;
  } | null>(null);
  const [salvando, iniciarSalvamento] = useTransition();

  function alternarCurso(cursoId: string) {
    setRetorno(null);
    setAtivos((atuais) => {
      const proximos = new Set(atuais);
      proximos.has(cursoId)
        ? proximos.delete(cursoId)
        : proximos.add(cursoId);
      return proximos;
    });
  }

  function salvar() {
    setRetorno(null);
    iniciarSalvamento(async () => {
      const resultado = await salvarAcessos(alunaId, Array.from(ativos));
      setRetorno({
        tipo: resultado.ok ? 'sucesso' : 'erro',
        texto: resultado.mensagem
      });
    });
  }

  return (
    <>
      <div className="acc-head">
        <div>
          <h2>Liberar acesso aos cursos</h2>
          <p>
            Ligue o acesso de cada curso individualmente. Só os cursos ligados
            aparecem na área de membros desta aluna.
          </p>
        </div>
        <div className="bulk">
          <button
            className="btn-ghost"
            type="button"
            onClick={() => {
              setAtivos(new Set(cursos.map((curso) => curso.id)));
              setRetorno(null);
            }}
          >
            Liberar todos
          </button>
          <button
            className="btn-ghost"
            type="button"
            onClick={() => {
              setAtivos(new Set());
              setRetorno(null);
            }}
          >
            Bloquear todos
          </button>
        </div>
      </div>

      <div className="courses">
        {cursos.length === 0 ? (
          <div className="crow">
            <div className="info">
              <h3>Nenhum curso cadastrado</h3>
              <small>Cadastre o primeiro curso no painel administrativo.</small>
            </div>
          </div>
        ) : (
          cursos.map((curso) => {
            const ativo = ativos.has(curso.id);
            return (
              <div className="crow" key={curso.id}>
                <div
                  className="thumb t-pk"
                  style={
                    curso.capa
                      ? {
                          backgroundImage: `url(${curso.capa})`,
                          backgroundSize: 'cover',
                          backgroundPosition: 'center'
                        }
                      : undefined
                  }
                >
                  {!curso.capa && <span>{curso.titulo}</span>}
                </div>
                <div className="info">
                  <h3>{curso.titulo}</h3>
                  <small>{curso.subtitulo || 'Curso da Academia de Vendas'}</small>
                </div>
                <span className={`state ${ativo ? 'lib' : 'blo'}`}>
                  {ativo ? 'Liberado' : 'Bloqueado'}
                </span>
                <button
                  type="button"
                  className={`toggle ${ativo ? 'on' : 'off'}`}
                  aria-label={`${ativo ? 'Bloquear' : 'Liberar'} ${curso.titulo}`}
                  aria-pressed={ativo}
                  onClick={() => alternarCurso(curso.id)}
                  style={{ border: 0, padding: 0 }}
                />
              </div>
            );
          })
        )}
      </div>

      <div className="foot">
        <div className="summary">
          <b>{ativos.size}</b> de <b>{cursos.length}</b> cursos liberados para{' '}
          {alunaNome}
        </div>
        <button
          className="btn-pink-sq"
          type="button"
          onClick={salvar}
          disabled={salvando || cursos.length === 0}
        >
          {salvando ? 'Salvando...' : 'Salvar acessos'}
        </button>
      </div>

      {retorno && (
        <div
          className="ac-note"
          style={
            retorno.tipo === 'erro'
              ? { color: '#ff9d9d', borderColor: 'rgba(224,64,63,.45)' }
              : { color: '#8ce3aa', borderColor: 'rgba(55,194,106,.45)' }
          }
        >
          {retorno.texto}
        </div>
      )}
    </>
  );
}
