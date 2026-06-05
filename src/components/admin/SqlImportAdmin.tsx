import React, { useRef, useState } from 'react';
import { api } from '../../api';

type Status = { type: 'success' | 'error'; message: string } | null;

export default function SqlImportAdmin() {
  const [sql, setSql] = useState('');
  const [status, setStatus] = useState<Status>(null);
  const [running, setRunning] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const loadFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => setSql(String(ev.target?.result ?? ''));
    reader.readAsText(file, 'utf-8');
    setStatus(null);
  };

  const execute = async () => {
    if (!sql.trim()) return;
    setRunning(true);
    setStatus(null);
    try {
      const res = await api.sqlImport(sql);
      if (res.ok) setStatus({ type: 'success', message: res.message || 'Erfolgreich ausgeführt' });
      else setStatus({ type: 'error', message: res.error || 'Unbekannter Fehler' });
    } catch (e: any) {
      setStatus({ type: 'error', message: String(e?.message ?? e) });
    } finally {
      setRunning(false);
    }
  };

  const btn: React.CSSProperties = {
    border: 'none', borderRadius: 6, padding: '7px 16px',
    cursor: 'pointer', fontSize: 13, fontWeight: 600,
  };

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: 24, maxWidth: 800 }}>
      <h2 style={{ marginTop: 0, fontSize: 16, color: '#1e40af' }}>SQL-Import</h2>
      <p style={{ fontSize: 13, color: '#6b7280', marginBottom: 20 }}>
        SQL-Datei hochladen oder SQL direkt eingeben und auf die Datenbank anwenden.
        Alle Statements werden in einer Transaktion ausgeführt.
      </p>

      {/* Datei-Upload */}
      <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 10 }}>
        <input
          ref={fileRef}
          type="file"
          accept=".sql,.txt"
          onChange={loadFile}
          style={{ display: 'none' }}
        />
        <button
          onClick={() => fileRef.current?.click()}
          style={{ ...btn, background: '#e0e7ff', color: '#3730a3' }}
        >
          📂 SQL-Datei laden
        </button>
        {sql && (
          <button
            onClick={() => { setSql(''); setStatus(null); if (fileRef.current) fileRef.current.value = ''; }}
            style={{ ...btn, background: '#fee2e2', color: '#991b1b' }}
          >
            ✕ Leeren
          </button>
        )}
        <span style={{ fontSize: 12, color: '#9ca3af' }}>
          {sql ? `${sql.split('\n').length} Zeilen` : 'Keine Datei geladen'}
        </span>
      </div>

      {/* SQL-Editor */}
      <textarea
        value={sql}
        onChange={e => { setSql(e.target.value); setStatus(null); }}
        placeholder="-- SQL hier eingeben oder Datei laden&#10;INSERT INTO ...&#10;UPDATE ..."
        spellCheck={false}
        style={{
          width: '100%', minHeight: 320, fontFamily: 'monospace', fontSize: 13,
          border: '1px solid #d1d5db', borderRadius: 8, padding: 12,
          resize: 'vertical', boxSizing: 'border-box', background: '#f8fafc',
          color: '#1e293b', lineHeight: 1.5,
        }}
      />

      {/* Ausführen */}
      <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 12 }}>
        <button
          onClick={execute}
          disabled={!sql.trim() || running}
          style={{
            ...btn,
            background: sql.trim() && !running ? '#2563eb' : '#93c5fd',
            color: '#fff',
            cursor: sql.trim() && !running ? 'pointer' : 'not-allowed',
          }}
        >
          {running ? '⏳ Wird ausgeführt…' : '▶ SQL ausführen'}
        </button>
        <span style={{ fontSize: 12, color: '#9ca3af' }}>
          Achtung: Änderungen an der DB sind sofort aktiv und nicht rückgängig zu machen.
        </span>
      </div>

      {/* Status */}
      {status && (
        <div style={{
          marginTop: 16, padding: '10px 14px', borderRadius: 8,
          background: status.type === 'success' ? '#d1fae5' : '#fee2e2',
          border: `1px solid ${status.type === 'success' ? '#6ee7b7' : '#fca5a5'}`,
          color: status.type === 'success' ? '#065f46' : '#991b1b',
          fontSize: 13, fontFamily: 'monospace',
        }}>
          {status.type === 'success' ? '✅ ' : '❌ '}{status.message}
        </div>
      )}
    </div>
  );
}
