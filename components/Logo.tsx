export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <div
      className={compact ? 'logo compact' : 'logo'}
      aria-label="Academia de Vendas Suzana Zatorre"
    >
      <span className="logo-mark">SZ</span>
      {!compact && (
        <span className="logo-copy">
          <strong>Academia</strong>
          <small>de Vendas Suzana Zatorre</small>
        </span>
      )}
    </div>
  );
}
