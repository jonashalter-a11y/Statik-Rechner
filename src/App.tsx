import React, { useState, useEffect, useCallback, useRef } from 'react';
import Header from './components/Header';
import LeftSidebar from './components/LeftSidebar';
import VerificationPanel from './components/VerificationPanel';
import PrintPanel from './components/PrintPanel';
import AdminPage from './components/admin/AdminPage';
import Splitter from './components/Splitter';
import { api } from './api';
import { useStore } from './store/useStore';

const MIN_SIDEBAR  = 160;
const MIN_MIDDLE   = 300;
const MIN_PRINT    = 260;
const DEFAULT_SIDEBAR = 270;
const DEFAULT_PRINT   = 360;

export default function App() {
  const [showPrint, setShowPrint] = useState(false);
  const [showAdmin, setShowAdmin] = useState(false);
  const { setVerificationsFromApi, setChaptersFromApi, setWoodTypesFromApi, normId, setNormId } = useStore();

  const [sidebarW, setSidebarW] = useState(DEFAULT_SIDEBAR);
  const [printW,   setPrintW]   = useState(DEFAULT_PRINT);

  const onResizeSidebar = useCallback((delta: number) => setSidebarW(w => Math.max(MIN_SIDEBAR, w + delta)), []);
  const onResizePrint   = useCallback((delta: number) => setPrintW(w => Math.max(MIN_PRINT, w - delta)), []);

  // Normdaten (Kapitel + Nachweise) laden und direkt aktiv setzen
  const loadNormData = useCallback(async (nId: string) => {
    try {
      const [verifs, chaps] = await Promise.all([
        api.getVerifications(nId),
        api.getChapters(nId),
      ]);
      if (Array.isArray(verifs)) setVerificationsFromApi(verifs, nId);
      if (Array.isArray(chaps))  setChaptersFromApi(chaps, nId);
    } catch (e) {
      console.warn('Backend nicht erreichbar für Norm', nId, e);
    }
  }, []);

  // Beim Start: SIA 265 + Holzklassen laden
  useEffect(() => {
    (async () => {
      try {
        const [woodTypes, woodClasses] = await Promise.all([
          api.getWoodTypes(), api.getWoodClasses(),
        ]);
        if (Array.isArray(woodTypes) && Array.isArray(woodClasses))
          setWoodTypesFromApi(woodTypes, woodClasses);
      } catch {}
      await loadNormData('sia265');
    })();
  }, [showAdmin]);

  // Bei Norm-Wechsel: normId setzen und Daten direkt laden
  const handleNormChange = useCallback(async (nId: string) => {
    setNormId(nId);          // Sofort normId + Verifikationen aus Cache
    await loadNormData(nId); // Dann Kapitel + Nachweise aus API aktualisieren
  }, [loadNormData, setNormId]);

  const colHeader: React.CSSProperties = {
    padding: '7px 12px',
    borderBottom: '1px solid #e5e7eb',
    fontWeight: 600, fontSize: 11, color: '#6b7280',
    letterSpacing: '0.06em', textTransform: 'uppercase',
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    background: '#fafafa', flexShrink: 0,
  };

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', height: '100vh',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      background: '#f1f5f9', overflow: 'hidden',
    }}>
      {showAdmin && <AdminPage onClose={() => setShowAdmin(false)} />}

      <Header onAdminClick={() => setShowAdmin(true)} onNormChange={handleNormChange} />

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden', minHeight: 0 }}>

        {/* Sidebar */}
        <div style={{ width: sidebarW, minWidth: MIN_SIDEBAR, display: 'flex', flexDirection: 'column', background: '#fff', overflow: 'hidden', borderRight: '1px solid #e5e7eb', flexShrink: 0 }}>
          <LeftSidebar />
        </div>
        <Splitter onResize={onResizeSidebar} />

        {/* Nachweis-Panel */}
        <div style={{ flex: 1, minWidth: MIN_MIDDLE, display: 'flex', flexDirection: 'column', background: '#fff', overflow: 'hidden' }}>
          <div style={colHeader}><span>Nachweis</span></div>
          <VerificationPanel />
        </div>

        {/* Ausdruck */}
        {showPrint && <Splitter onResize={onResizePrint} />}
        <div style={{
          width: showPrint ? printW : 0, minWidth: showPrint ? MIN_PRINT : 0,
          display: 'flex', flexDirection: 'column', background: '#f8fafc',
          overflow: 'hidden', borderLeft: showPrint ? '1px solid #e5e7eb' : 'none',
          flexShrink: 0, transition: 'min-width 0.2s',
        }}>
          {showPrint && <>
            <div style={colHeader}>
              <span>Ausdruckprotokoll</span>
              <button onClick={() => setShowPrint(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', fontSize: 16, lineHeight: 1 }}>×</button>
            </div>
            <PrintPanel />
          </>}
        </div>

        {!showPrint && (
          <button onClick={() => setShowPrint(true)} style={{
            position: 'absolute', right: 0, top: '50%', transform: 'translateY(-50%)',
            background: '#1e3a5f', color: '#fff', border: 'none',
            borderRadius: '6px 0 0 6px', padding: '12px 7px',
            cursor: 'pointer', fontSize: 10, writingMode: 'vertical-rl',
            letterSpacing: '0.04em', boxShadow: '-2px 0 8px rgba(0,0,0,0.15)',
          }}>📄 Ausdruck</button>
        )}
      </div>

      <style>{`
        * { box-sizing: border-box; }
        select option { background: #1e3a5f; color: #fff; }
        ::-webkit-scrollbar { width: 5px; height: 5px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #d1d5db; border-radius: 3px; }
        ::-webkit-scrollbar-thumb:hover { background: #9ca3af; }
      `}</style>
    </div>
  );
}
