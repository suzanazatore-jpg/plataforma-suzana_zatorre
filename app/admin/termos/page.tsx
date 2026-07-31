import { FileText, Save } from 'lucide-react';
import './termos.css';

// MODO DE CONSTRUÇÃO: editor dos Termos de Uso. Salvar ainda não grava — liga com o Supabase depois.
const textoPadrao = `TERMOS DE USO — ACADEMIA DE VENDAS SUZANA ZATORRE

1. Sobre o acesso
Ao entrar na plataforma, você concorda com estes termos. O acesso é pessoal e intransferível — não compartilhe seu login com terceiros.

2. Conteúdo
Todo o conteúdo (vídeos, materiais e aulas) é protegido por direitos autorais. É proibido copiar, gravar, redistribuir ou revender qualquer material.

3. Prazo de acesso
O acesso a cada curso tem validade conforme o plano adquirido. Após o vencimento, o conteúdo pode deixar de ficar disponível.

4. Reembolso
Você tem até 7 dias corridos, a partir da compra, para solicitar reembolso, conforme o Código de Defesa do Consumidor.

5. Suporte
Em caso de dúvidas, fale com nosso suporte pelos canais oficiais informados na plataforma.`;

export default function TermosPage() {
  return (
    <>
      <div className="crumb">⚙ Administrador › Termos de Uso</div>

      <div className="pad">
        <div className="blk-title">Termos de Uso</div>
        <p className="blk-sub">O texto que a aluna aceita no primeiro acesso à plataforma.</p>

        <div className="termos-card">
          <div className="termos-top">
            <div className="tt-left">
              <span className="tt-ic">
                <FileText size={20} />
              </span>
              <div>
                <strong>Texto dos termos</strong>
                <span>Última atualização: 31/07/2026</span>
              </div>
            </div>
            <label className="tt-toggle">
              <span className="toggle on" />
              Exigir aceite no primeiro acesso
            </label>
          </div>

          <textarea className="termos-editor" defaultValue={textoPadrao} rows={16} />

          <div className="termos-actions">
            <button className="btn-pink">
              <Save size={16} /> Salvar termos
            </button>
          </div>
        </div>

        <div className="termos-note">
          As alunas veem este texto ao entrar pela primeira vez e precisam marcar "Li e aceito" para acessar a plataforma.
        </div>
      </div>
    </>
  );
}
