import type { ReactNode } from 'react';

export function CourseTabs({
  information,
  comments,
  initiallyOpen = false,
  informationHref,
  commentsHref
}: {
  information: ReactNode;
  comments: ReactNode;
  initiallyOpen?: boolean;
  informationHref: string;
  commentsHref: string;
}) {
  return (
    <>
      <div className="ep-tabs" role="tablist" aria-label="Conteúdo da aula">
        <a
          className={!initiallyOpen ? 'on' : ''}
          href={informationHref}
          role="tab"
          aria-selected={!initiallyOpen}
        >
          Informações
        </a>
        <a
          className={initiallyOpen ? 'on' : ''}
          href={commentsHref}
          role="tab"
          aria-selected={initiallyOpen}
        >
          Comentários
        </a>
      </div>
      <div role="tabpanel">{initiallyOpen ? comments : information}</div>
    </>
  );
}
