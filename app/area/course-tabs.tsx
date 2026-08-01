'use client';

import { useState, type ReactNode } from 'react';

export function CourseTabs({
  information,
  comments,
  initiallyOpen = false
}: {
  information: ReactNode;
  comments: ReactNode;
  initiallyOpen?: boolean;
}) {
  const [commentsOpen, setCommentsOpen] = useState(initiallyOpen);

  return (
    <>
      <div className="ep-tabs" role="tablist" aria-label="Conteúdo da aula">
        <button
          className={!commentsOpen ? 'on' : ''}
          type="button"
          role="tab"
          aria-selected={!commentsOpen}
          onClick={() => setCommentsOpen(false)}
        >
          Informações
        </button>
        <button
          className={commentsOpen ? 'on' : ''}
          type="button"
          role="tab"
          aria-selected={commentsOpen}
          onClick={() => setCommentsOpen(true)}
        >
          Comentários
        </button>
      </div>
      <div role="tabpanel">{commentsOpen ? comments : information}</div>
    </>
  );
}
