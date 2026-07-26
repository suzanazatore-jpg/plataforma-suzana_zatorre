export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <figure
      className={compact ? 'logo compact' : 'logo'}
      aria-label="Academia de Vendas Suzana Zatorre"
    >
      <img src="/brand/academia-vendas-logo.png" alt="Academia de Vendas Suzana Zatorre" />
    </figure>
  );
}
