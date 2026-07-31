import Link from 'next/link';
import { Plus, Pencil, Trash2, Play, Image } from 'lucide-react';
import '../cursos.css';

// MODO DE CONSTRUÇÃO: editar curso com módulos e aulas de exemplo.
// Adicionar/editar/salvar ainda não gravam — ligamos com o Supabase depois.
const modulos = [
  {
    nome: 'Módulo 1 — Fundamentos',
    aulas: [
      { titulo: 'Aula 1 — Boas-vindas', sub: 'Vídeo · Youtube', dur: '08:24', estado: 'pub' },
      { titulo: 'Aula 2 — O método na prática', sub: 'Vídeo · Vimeo · 2 materiais', dur: '15:10', estado: 'pub' },
      { titulo: 'Aula 3 — Exercício', sub: 'Sem vídeo ainda', dur: '—', estado: 'dr' }
    ]
  },
  {
    nome: 'Módulo 2 — Montando a equipe',
    aulas: [
      { titulo: 'Aula 1 — Quem contratar', sub: 'Vídeo · Bunny', dur: '12:03', estado: 'pub' }
    ]
  }
];

export default function EditarCursoPage() {
  return (
    <>
      <div className="crumb">
        ⚙ Administrador › <Link href="/admin/cursos" style={{ color: 'inherit', textDecoration: 'underline' }}>Cursos</Link> › EVS — Equipe que Vende Sozinha
      </div>

      <div className="pad">
        <div className="course-head">
          <div className="cthumb t-pk">
            <span>EVS · Vende Sozinha</span>
          </div>
          <div>
            <h2>EVS — Equipe que Vende Sozinha</h2>
            <p>Curso principal da Academia. Método para a lojista montar uma equipe que vende sem depender só dela.</p>
          </div>
          <div className="hactions">
            <button className="btn-ghost">
              <Pencil size={14} /> Editar curso
            </button>
            <button className="btn-ghost">
              <Image size={14} /> Capa
            </button>
          </div>
        </div>

        <div className="mods-head">
          <h3>Módulos e Aulas</h3>
          <button className="btn-pink">
            <Plus size={16} /> Adicionar módulo
          </button>
        </div>

        {modulos.map((m) => (
          <div className="module" key={m.nome}>
            <div className="mtop">
              <span className="grip">⠿</span>
              <span className="mname">{m.nome}</span>
              <span className="mcount">{m.aulas.length} aula{m.aulas.length > 1 ? 's' : ''}</span>
              <span className="mact">
                <span className="iconbtn" title="Editar">
                  <Pencil size={14} />
                </span>
                <span className="iconbtn" title="Remover">
                  <Trash2 size={14} />
                </span>
              </span>
            </div>

            {m.aulas.map((a) => (
              <div className="lesson" key={a.titulo}>
                <span className="play">
                  <Play size={15} />
                </span>
                <div className="lname">
                  <b>{a.titulo}</b>
                  <small>{a.sub}</small>
                </div>
                <span className="ldur">{a.dur}</span>
                <span className={`lstate ${a.estado}`}>{a.estado === 'pub' ? 'Publicada' : 'Rascunho'}</span>
                <span className="iconbtn">
                  <Pencil size={14} />
                </span>
              </div>
            ))}

            <div className="addlesson">
              <button>
                <Plus size={14} /> Adicionar aula neste módulo
              </button>
            </div>
          </div>
        ))}

        <button className="btn-ghost addmod">
          <Plus size={14} /> Adicionar módulo
        </button>

        <div className="modal">
          <div className="mh">
            <h3>Nova aula</h3>
            <p>Preencha os dados e conecte o vídeo da aula.</p>
          </div>
          <div className="mtabs">
            <a className="on">Vídeo</a>
            <a>Materiais</a>
            <a>Liberação</a>
          </div>
          <div className="mbody">
            <div className="field-lbl">Título da aula</div>
            <div className="inp">Ex.: Como abordar o cliente</div>
            <div className="field-lbl">De onde vem o vídeo?</div>
            <div className="providers">
              <span className="prov on">Youtube</span>
              <span className="prov">Vimeo</span>
              <span className="prov">Bunny</span>
              <span className="prov">PandaVideo</span>
            </div>
            <div className="field-lbl" style={{ marginTop: '14px' }}>Link ou ID do vídeo</div>
            <div className="inp">https://youtube.com/watch?v=...</div>
            <button className="btn-pink">
              <Plus size={16} /> Salvar aula
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
