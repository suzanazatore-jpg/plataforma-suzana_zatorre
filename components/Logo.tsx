export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <div className={compact ? 'logo compact' : 'logo'} aria-label="EVS - Equipe que Vende Sozinha">
      <span className="logo-mark">EVS</span>
      {!compact && (
        <span className="logo-copy">
          <strong>EVS</strong>
          <small>Equipe que Vende Sozinha</small>
        </span>
      )}
    </div>
  );
}
