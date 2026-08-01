import { Download } from 'lucide-react';

export function MaterialDownload({ href, title }: { href: string; title: string }) {
  return (
    <a href={href} download>
      <Download size={16} />
      <span>{title}</span>
    </a>
  );
}
