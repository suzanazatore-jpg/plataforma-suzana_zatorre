import { Fragment } from 'react';

const URL_SPLIT = /(https?:\/\/[^\s<]+)/gi;
const URL_PEEL = /^(https?:\/\/[^\s<]*?)([.,;:!)\]}]*)$/i;

function renderPart(part: string, key: number) {
  if (!/^https?:\/\//i.test(part)) {
    return <Fragment key={key}>{part}</Fragment>;
  }

  const match = part.match(URL_PEEL);
  const url = match?.[1] || part;
  const trailing = match?.[2] || '';

  return (
    <Fragment key={key}>
      <a
        className="ep-desc-link"
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        style={{
          color: '#ff2e63',
          textDecoration: 'underline',
          textUnderlineOffset: '2px',
          overflowWrap: 'anywhere',
          fontWeight: 500
        }}
      >
        {url}
      </a>
      {trailing}
    </Fragment>
  );
}

export function LessonDescription({ text }: { text?: string | null }) {
  const value = (text || '').trim();

  if (!value) {
    return <p className="ep-desc">Curso sem descrição.</p>;
  }

  const lines = value.split(/\r?\n/);

  return (
    <p className="ep-desc">
      {lines.map((line, lineIndex) => (
        <Fragment key={lineIndex}>
          {lineIndex > 0 && <br />}
          {line.split(URL_SPLIT).map((part, partIndex) => renderPart(part, partIndex))}
        </Fragment>
      ))}
    </p>
  );
}
