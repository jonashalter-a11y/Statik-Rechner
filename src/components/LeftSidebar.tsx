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

      {/* Status footer */}
      <div style={{ borderTop: '1px solid #e5e7eb', background: '#fff', padding: '8px 12px', fontSize: 11, color: '#6b7280' }}>
        {verifications.length} Nachweise insgesamt
        <span style={{ color: '#10b981', marginLeft: 8 }}>
          ● {verifications.filter(v => v.passed).length} erfüllt
        </span>
        <span style={{ color: '#ef4444', marginLeft: 6 }}>
          ● {verifications.filter(v => v.passed === false).length} versagt
        </span>
      </div>
    </div>
  );
}
