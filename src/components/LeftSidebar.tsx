import React from 'react';
import TableOfContents from './TableOfContents';

interface Props { onToggle?: () => void; }

export default function LeftSidebar({ onToggle }: Props) {
  return (
    <div style={{ width: '100%', height: '100%', background: '#f8fafc', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* TOC Header */}
      <div style={{
        padding: '7px 10px 7px 12px',
        borderBottom: '1px solid #e5e7eb',
        fontWeight: 600, fontSize: 12, color: '#374151',
        background: '#fff', letterSpacing: '0.05em', textTransform: 'uppercase',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0,
      }}>
        <span>Inhaltsverzeichnis</span>
        <button onClick={onToggle} title="Ausblenden"
          style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, color: '#9ca3af', lineHeight: 1, padding: '2px 4px', borderRadius: 4 }}
          onMouseEnter={e => (e.currentTarget.style.color = '#2563eb')}
          onMouseLeave={e => (e.currentTarget.style.color = '#9ca3af')}>
          👁
        </button>
      </div>

      {/* TOC */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        <TableOfContents />
      </div>
    </div>
  );
}
