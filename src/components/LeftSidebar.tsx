import React from 'react';
import TableOfContents from './TableOfContents';
import { useStore } from '../store/useStore';

export default function LeftSidebar() {
  const { verifications, setActiveVerification, activeVerificationId } = useStore();

  return (
    <div style={{
      width: 240,
      minWidth: 200,
      background: '#f8fafc',
      borderRight: '1px solid #e5e7eb',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
    }}>
      {/* TOC Header */}
      <div style={{
        padding: '10px 12px',
        borderBottom: '1px solid #e5e7eb',
        fontWeight: 600,
        fontSize: 12,
        color: '#374151',
        background: '#fff',
        letterSpacing: '0.05em',
        textTransform: 'uppercase',
      }}>
        Inhaltsverzeichnis
      </div>

      {/* TOC */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        <TableOfContents />
      </div>

    </div>
  );
}
