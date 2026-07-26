import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Academia de Vendas Suzana Zatorre',
  description: 'Area de membros da Academia de Vendas Suzana Zatorre.'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
