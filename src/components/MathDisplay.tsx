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
      // Display-Math ist ein Block-Element (.katex-display). In einem inline <span>
      // reserviert es seine Höhe nicht → es überläuft die Box und überlappt Nachbarn.
      // Darum im Display-Modus selbst Block werden.
      style={display ? { display: 'block', ...style } : style}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
