import React, { useState } from 'react';
import { StiffnesscenterData } from '../types/graph';
import { StiffnesscenterPanel } from './StiffnesscenterPanel';

interface StiffnesscenterModalProps {
  open: boolean;
  data: StiffnesscenterData;
  savedState: string;
  readOnly: boolean;
  onClose: () => void;
  onStateChange: (state: string) => void;
  onDataChange?: (patch: Partial<StiffnesscenterData>) => void;
}

export function StiffnesscenterModal({
  open,
  data,
  savedState,
  readOnly,
  onClose,
  onStateChange,
  onDataChange,
}: StiffnesscenterModalProps) {
  if (!open) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: '100vw',
        height: '100vh',
        background: '#ffffff',
        zIndex: 50,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '14px 18px',
          background: '#f0f9ff',
          borderBottom: '2px solid #0284c7',
          flexShrink: 0,
          minHeight: 52,
        }}
      >
        <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#0284c7' }}>
          🏛️ {data.label || 'Steifigkeitszentrum & Torsion'}
        </h2>
        <button
          onClick={onClose}
          style={{
            background: 'none',
            border: 'none',
            fontSize: 28,
            cursor: 'pointer',
            color: '#dc2626',
            padding: '0 8px',
            lineHeight: 1,
            fontWeight: 700,
          }}
        >
          ✕
        </button>
      </div>

      {/* Content - nutzt gesamte verbleibende Höhe, kein Scrollen */}
      <div style={{ flex: 1, minHeight: 0, overflow: 'hidden', padding: '16px', background: '#ffffff' }}>
        <StiffnesscenterPanel
          data={data}
          savedState={savedState}
          readOnly={readOnly}
          onStateChange={onStateChange}
          onDataChange={onDataChange}
        />
      </div>
    </div>
  );
}
