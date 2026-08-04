'use client';

import { useEffect, useRef, useState } from 'react';

export function CarrosselMais() {
  const btnRef = useRef<HTMLButtonElement>(null);
  const [fim, setFim] = useState(false);

  useEffect(() => {
    const scroll = btnRef.current?.closest('.mh-scroll') as HTMLElement | null;
    const grid = scroll?.querySelector('.mh-grid') as HTMLElement | null;
    if (!scroll || !grid) return;

    const check = () => {
      const noFim = grid.scrollLeft + grid.clientWidth >= grid.scrollWidth - 8;
      setFim(noFim);
      scroll.classList.toggle('mh-scroll-end', noFim);
    };

    check();
    grid.addEventListener('scroll', check, { passive: true });
    window.addEventListener('resize', check);
    return () => {
      grid.removeEventListener('scroll', check);
      window.removeEventListener('resize', check);
    };
  }, []);

  function avancar() {
    const grid = btnRef.current?.closest('.mh-scroll')?.querySelector('.mh-grid') as HTMLElement | null;
    if (!grid) return;
    grid.scrollBy({ left: Math.round(grid.clientWidth * 0.85), behavior: 'smooth' });
  }

  return (
    <button
      ref={btnRef}
      type="button"
      className={`mh-more${fim ? ' mh-more-hide' : ''}`}
      aria-label="Ver mais cursos"
      onClick={avancar}
    >
      ›
    </button>
  );
}
