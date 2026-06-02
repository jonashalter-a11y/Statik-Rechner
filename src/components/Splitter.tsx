import React, { useCallback, useRef } from 'react';

interface Props {
  onResize: (delta: number) => void;
  direction?: 'horizontal' | 'vertical';
}

export default function Splitter({ onResize, direction = 'horizontal' }: Props) {
  const dragging = useRef(false);
  const last = useRef(0);

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    dragging.current = true;
    last.current = direction === 'horizontal' ? e.clientX : e.clientY;

    const onMove = (ev: MouseEvent) => {
      if (!dragging.current) return;
      const cur = direction === 'horizontal' ? ev.clientX : ev.clientY;
      onResize(cur - last.current);
      last.current = cur;
    };
    const onUp = () => {
      dragging.current = false;
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };

    document.body.style.cursor = direction === 'horizontal' ? 'col-resize' : 'row-resize';
    document.body.style.userSelect = 'none';
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }, [onResize, direction]);

  const isH = direction === 'horizontal';

  return (
    <div
      onMouseDown={onMouseDown}
      style={{
        flexShrink: 0,
        width:  isH ? 5 : '100%',
        height: isH ? '100%' : 5,
        cursor: isH ? 'col-resize' : 'row-resize',
        background: 'transparent',
        position: 'relative',
        zIndex: 10,
      }}
    >
      {/* Visible handle line */}
      <div style={{
        position: 'absolute',
        top:    isH ? '50%' : '50%',
        left:   isH ? '50%' : 0,
        transform: isH ? 'translate(-50%, -50%)' : 'translate(0, -50%)',
        width:  isH ? 1 : '100%',
        height: isH ? 32 : 1,
        background: '#d1d5db',
        borderRadius: 2,
        transition: 'background 0.15s',
      }} />
      <style>{`
        div[data-splitter]:hover > div { background: #2563eb !important; }
      `}</style>
    </div>
  );
}
