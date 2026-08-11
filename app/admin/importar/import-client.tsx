'use client';

import { useState } from 'react';

type Course = { id: string; title: string; slug: string };

type PreviewRow = {
  rowNumber: number;
  nome: string | null;
  email: string;
  telefone: string | null;
  expiresLabel: string | null;
  status: 'new' | 'exists' | 'error';
  error: string | null;
};

type Summary = { total: number; novas: number; existem: number; erros: number };

type CommitResult = { email: string; status: string; emailed: boolean; error: string | null };

const ACCENT = '#ff2e63';
const BORDER = 'rgba(255,255,255,.12)';
const CARD = '#17171b';
const MUTED = '#a1a1aa';
const TEXT = '#f4f4f5';

const BATCH = 8;

export default function ImportClient({ courses }: { courses: Course[] }) {
  const [courseId, setCourseId] = useState('');
  const [csv, setCsv] = useState('');
  const [sendEmail, setSendEmail] = useState(true);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [summary, setSummary] = useState<Summary | null>(null);
  const [rows, setRows] = useState<PreviewRow[]>([]);

  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [finalResults, setFinalResults] = useState<CommitResult[] | null>(null);

  async function handleFile(file: File | null) {
    if (!file) return;
    const text = await file.text();
    setCsv(text);
    resetPreview();
  }

  function resetPreview() {
    setSummary(null);
    setRows([]);
    setFinalResults(null);
    setError(null);
  }

  async function handlePreview() {
    setError(null);
    setFinalResults(null);
    if (!courseId) {
      setError('Escolha o curso deste lote.');
      return;
    }
    if (!csv.trim()) {
      setError('Cole a planilha ou suba o arquivo CSV.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/admin/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'preview', courseId, csv })
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setError(data.error || 'Não consegui pré-visualizar.');
        setSummary(null);
        setRows([]);
      } else {
        setSummary(data.summary);
        setRows(data.rows);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Falha na pré-visualização.');
    } finally {
      setLoading(false);
    }
  }

  async function handleImport() {
    if (!summary) return;
    const total = summary.total;
    const willImport = summary.novas + summary.existem;
    if (!willImport) {
      setError('Não há linhas válidas para importar.');
      return;
    }

    setImporting(true);
    setError(null);
    setProgress({ done: 0, total });
    const collected: CommitResult[] = [];

    try {
      let offset = 0;
      while (offset < total) {
        const res = await fetch('/api/admin/import', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ mode: 'commit', courseId, csv, sendEmail, offset, limit: BATCH })
        });
        const data = await res.json();
        if (!res.ok || !data.ok) {
          setError(data.error || 'Falha durante a importação.');
          break;
        }
        collected.push(...(data.results || []));
        offset = data.processed;
        setProgress({ done: offset, total });
        if (data.done) break;
      }
      setFinalResults(collected);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Falha durante a importação.');
      setFinalResults(collected);
    } finally {
      setImporting(false);
    }
  }

  const badge = (status: string) => {
    const map: Record<string, { bg: string; fg: string; label: string }> = {
      new: { bg: 'rgba(34,197,94,.15)', fg: '#4ade80', label: 'nova' },
      exists: { bg: 'rgba(255,255,255,.08)', fg: MUTED, label: 'já existe' },
      error: { bg: 'rgba(239,68,68,.15)', fg: '#f87171', label: 'erro' },
      created: { bg: 'rgba(34,197,94,.15)', fg: '#4ade80', label: 'criada' }
    };
    const b = map[status] || map.error;
    return (
      <span style={{ background: b.bg, color: b.fg, fontSize: 12, padding: '3px 8px', borderRadius: 6, whiteSpace: 'nowrap' }}>
        {b.label}
      </span>
    );
  };

  const card: React.CSSProperties = {
    background: CARD,
    border: `1px solid ${BORDER}`,
    borderRadius: 12,
    padding: '18px 20px',
    marginBottom: 16
  };
  const label: React.CSSProperties = { fontSize: 13, color: MUTED, margin: '0 0 8px' };

  const commitSummary = finalResults
    ? {
        criadas: finalResults.filter((r) => r.status === 'created').length,
        existem: finalResults.filter((r) => r.status === 'exists').length,
        enviados: finalResults.filter((r) => r.emailed).length,
        erros: finalResults.filter((r) => r.status === 'error').length
      }
    : null;

  return (
    <div style={{ maxWidth: 900, color: TEXT, padding: '8px 0 40px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <div style={{ width: 36, height: 36, borderRadius: 8, background: ACCENT, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: 13 }}>SZ</div>
        <div>
          <div style={{ fontWeight: 600, fontSize: 18 }}>Importar alunas em lote</div>
          <div style={{ fontSize: 13, color: MUTED }}>Cria as contas, matricula no curso e envia o e-mail de acesso</div>
        </div>
      </div>

      <div style={card}>
        <p style={label}>1 · Curso deste lote</p>
        <select
          value={courseId}
          onChange={(e) => {
            setCourseId(e.target.value);
            resetPreview();
          }}
          style={{ width: '100%', height: 40, background: '#0f0f12', color: TEXT, border: `1px solid ${BORDER}`, borderRadius: 8, padding: '0 12px', fontSize: 14 }}
        >
          <option value="">Selecione o curso…</option>
          {courses.map((c) => (
            <option key={c.id} value={c.id}>
              {c.title}
            </option>
          ))}
        </select>

        <p style={{ ...label, marginTop: 16 }}>2 · Cole a planilha (CSV) ou suba o arquivo</p>
        <textarea
          value={csv}
          onChange={(e) => {
            setCsv(e.target.value);
            resetPreview();
          }}
          placeholder={'Nome Completo, Email, Telefone, Data da compra, Data de expiração\nSara Balbinot, sara@email.com, +5548999470525, 19/07/2026 - 08:57, 15/01/2027 - 08:57'}
          rows={6}
          style={{ width: '100%', background: '#0f0f12', color: TEXT, border: `1px solid ${BORDER}`, borderRadius: 8, padding: 12, fontSize: 13, fontFamily: 'monospace', resize: 'vertical' }}
        />
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginTop: 12, flexWrap: 'wrap' }}>
          <label style={{ fontSize: 13, color: MUTED, cursor: 'pointer' }}>
            <input type="file" accept=".csv,text/csv" onChange={(e) => handleFile(e.target.files?.[0] || null)} style={{ display: 'none' }} />
            <span style={{ border: `1px solid ${BORDER}`, borderRadius: 8, padding: '8px 14px', display: 'inline-block' }}>Escolher arquivo CSV…</span>
          </label>
          <button
            onClick={handlePreview}
            disabled={loading || importing}
            style={{ background: 'transparent', color: TEXT, border: `1px solid ${BORDER}`, borderRadius: 8, padding: '9px 16px', fontSize: 14, cursor: 'pointer', opacity: loading || importing ? 0.5 : 1 }}
          >
            {loading ? 'Lendo…' : 'Pré-visualizar'}
          </button>
        </div>
      </div>

      {error ? (
        <div style={{ background: 'rgba(239,68,68,.12)', color: '#f87171', border: '1px solid rgba(239,68,68,.3)', borderRadius: 10, padding: '12px 16px', marginBottom: 16, fontSize: 14 }}>
          {error}
        </div>
      ) : null}

      {summary ? (
        <div style={card}>
          <p style={label}>3 · Confira antes de importar</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10, marginBottom: 16 }}>
            {[
              { k: 'Linhas', v: summary.total, c: TEXT },
              { k: 'Novas', v: summary.novas, c: '#4ade80' },
              { k: 'Já existem', v: summary.existem, c: TEXT },
              { k: 'Com erro', v: summary.erros, c: '#f87171' }
            ].map((m) => (
              <div key={m.k} style={{ background: '#0f0f12', borderRadius: 8, padding: '10px 12px' }}>
                <div style={{ fontSize: 12, color: MUTED }}>{m.k}</div>
                <div style={{ fontSize: 22, fontWeight: 600, color: m.c }}>{m.v}</div>
              </div>
            ))}
          </div>

          <div style={{ maxHeight: 320, overflowY: 'auto', border: `1px solid ${BORDER}`, borderRadius: 8 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ textAlign: 'left', color: MUTED, position: 'sticky', top: 0, background: CARD }}>
                  <th style={{ padding: '8px 10px', fontWeight: 500 }}>Nome</th>
                  <th style={{ padding: '8px 10px', fontWeight: 500 }}>E-mail</th>
                  <th style={{ padding: '8px 10px', fontWeight: 500 }}>Validade</th>
                  <th style={{ padding: '8px 10px', fontWeight: 500 }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.rowNumber} style={{ borderTop: `1px solid ${BORDER}` }}>
                    <td style={{ padding: '8px 10px' }}>{r.nome || <span style={{ color: MUTED }}>—</span>}</td>
                    <td style={{ padding: '8px 10px' }}>{r.email || <span style={{ color: MUTED }}>(em branco)</span>}</td>
                    <td style={{ padding: '8px 10px' }}>{r.expiresLabel || <span style={{ color: MUTED }}>—</span>}</td>
                    <td style={{ padding: '8px 10px' }}>
                      {badge(r.status)}
                      {r.error ? <div style={{ color: '#f87171', fontSize: 11, marginTop: 3 }}>{r.error}</div> : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 18, paddingTop: 14, borderTop: `1px solid ${BORDER}`, gap: 12, flexWrap: 'wrap' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: MUTED, cursor: 'pointer' }}>
              <input type="checkbox" checked={sendEmail} onChange={(e) => setSendEmail(e.target.checked)} style={{ width: 16, height: 16, accentColor: ACCENT }} />
              Enviar e-mail de acesso (login + senha + link)
            </label>
            <button
              onClick={handleImport}
              disabled={importing || summary.novas + summary.existem === 0}
              style={{ background: ACCENT, color: '#fff', border: 'none', fontWeight: 600, fontSize: 15, padding: '0 20px', height: 40, borderRadius: 8, cursor: 'pointer', opacity: importing || summary.novas + summary.existem === 0 ? 0.6 : 1 }}
            >
              {importing ? `Importando… ${progress.done}/${progress.total}` : `Importar ${summary.novas + summary.existem} alunas`}
            </button>
          </div>

          {summary.erros > 0 ? (
            <p style={{ fontSize: 12, color: MUTED, margin: '10px 0 0' }}>As {summary.erros} linha(s) com erro serão puladas automaticamente.</p>
          ) : null}
        </div>
      ) : null}

      {commitSummary ? (
        <div style={{ ...card, borderColor: 'rgba(74,222,128,.35)' }}>
          <p style={{ fontWeight: 600, fontSize: 15, margin: '0 0 12px' }}>Importação concluída</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10, marginBottom: commitSummary.erros ? 14 : 0 }}>
            {[
              { k: 'Criadas', v: commitSummary.criadas, c: '#4ade80' },
              { k: 'Já existiam', v: commitSummary.existem, c: TEXT },
              { k: 'E-mails enviados', v: commitSummary.enviados, c: TEXT },
              { k: 'Erros', v: commitSummary.erros, c: commitSummary.erros ? '#f87171' : TEXT }
            ].map((m) => (
              <div key={m.k} style={{ background: '#0f0f12', borderRadius: 8, padding: '10px 12px' }}>
                <div style={{ fontSize: 12, color: MUTED }}>{m.k}</div>
                <div style={{ fontSize: 22, fontWeight: 600, color: m.c }}>{m.v}</div>
              </div>
            ))}
          </div>
          {commitSummary.erros > 0 ? (
            <div style={{ fontSize: 12, color: MUTED }}>
              {finalResults!
                .filter((r) => r.status === 'error' || (r.error && !r.emailed))
                .map((r, i) => (
                  <div key={i} style={{ color: '#f87171', marginTop: 4 }}>
                    {r.email}: {r.error}
                  </div>
                ))}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
