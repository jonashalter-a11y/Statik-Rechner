import React from 'react';
import katex from 'katex';
import 'katex/dist/katex.min.css';

interface Props {
  latex: string;
  display?: boolean;
  style?: React.CSSProperties;
}

export default function MathDisplay({ latex, display = false, style }: Props) {
  let html = '';
  try {
    html = katex.renderToString(latex, {
      displayMode: display,
      throwOnError: false,
      output: 'html',
    });
  } catch {
    html = `<span style="color:red">${latex}</span>`;
  }

  return (
    <span
      style={style}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
