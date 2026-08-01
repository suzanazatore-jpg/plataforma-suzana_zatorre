'use client';

import { useState } from 'react';
import { Download } from 'lucide-react';

export function MaterialDownload({ href, title }: { href: string; title: string }) {
  const [downloading, setDownloading] = useState(false);

  async function downloadMaterial() {
    if (downloading) return;
    setDownloading(true);
    try {
      const response = await fetch(href, { credentials: 'same-origin' });
      if (!response.ok) throw new Error(await response.text());

      const blob = await response.blob();
      const disposition = response.headers.get('content-disposition') || '';
      const encodedName = disposition.match(/filename\*=UTF-8''([^;]+)/i)?.[1];
      const plainName = disposition.match(/filename="([^"]+)"/i)?.[1];
      const fileName = encodedName ? decodeURIComponent(encodedName) : plainName || `${title}.pdf`;
      const objectUrl = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = objectUrl;
      anchor.download = fileName;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(objectUrl);
    } catch (error) {
      window.alert(error instanceof Error && error.message ? error.message : 'Não foi possível baixar o material.');
    } finally {
      setDownloading(false);
    }
  }

  return (
    <button type="button" onClick={downloadMaterial} disabled={downloading}>
      <Download size={16} />
      <span>{downloading ? 'Baixando…' : title}</span>
    </button>
  );
}
