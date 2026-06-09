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
const SPLITTER_W   = 5;
const DEFAULT_SIDEBAR = 270;
const DEFAULT_PRINT   = 360;

export default function App() {
  const [showPrint, setShowPrint] = useState(false);
  const [pathname, setPathname] = useState(window.location.pathname);
  const { setVerificationsFromApi, setChaptersFromApi, setWoodTypesFromApi, normId, setNormId, setGlobalUnits } = useStore();

  const [sidebarW, setSidebarW] = useState(DEFAULT_SIDEBAR);
  const [printW,   setPrintW]   = useState(DEFAULT_PRINT);
  const [showSidebar, setShowSidebar] = useState(() => localStorage.getItem('sia-sidebar') !== 'false');
  const toggleSidebar = useCallback(() => setShowSidebar(v => { localStorage.setItem('sia-sidebar', String(!v)); return !v; }), []);
  const [containerW, setContainerW] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  // Containerbreite live tracken — alle Panels haben dann explizite Breiten
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const obs = new ResizeObserver(() => setContainerW(el.clientWidth));
    obs.observe(el);
    setContainerW(el.clientWidth);
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    const handlePopState = () => setPathname(window.location.pathname);
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const navigateTo = useCallback((path: string) => {
    if (window.location.pathname !== path) {
      window.history.pushState({}, '', path);
    }
    setPathname(path);
  }, []);

  const splitterCount = showPrint ? 2 : 1;
  const currentPrintW = showPrint ? printW : 0;
  // Explizite Mitte-Breite sobald containerW bekannt; vorher flex:1 als Fallback
  const middleW = containerW > 0
    ? Math.max(MIN_MIDDLE, containerW - sidebarW - splitterCount * SPLITTER_W - currentPrintW)
    : undefined;

  // Sidebar-Splitter: Sidebar wächst/schrumpft, Mitte folgt sofort (middleW abgeleitet)
  const onResizeSidebar = useCallback((delta: number) => {
    const totalW = containerRef.current?.clientWidth || containerW;
    if (totalW > 0) {
      const splCount = showPrint ? 2 : 1;
      const curPrintW = showPrint ? printW : 0;
      const maxSidebar = totalW - curPrintW - splCount * SPLITTER_W - MIN_MIDDLE;
      setSidebarW(w => Math.max(MIN_SIDEBAR, Math.min(maxSidebar, w + delta)));
    } else {
      setSidebarW(w => Math.max(MIN_SIDEBAR, w + delta));
    }
  }, [showPrint, printW, containerW]);

  // Print-Splitter: Maus nach links → Print wächst, Mitte schrumpft (und umgekehrt)
  const onResizePrint = useCallback((delta: number) => {
    const totalW = containerRef.current?.clientWidth || containerW;
    if (totalW > 0) {
      const maxPrint = totalW - sidebarW - 2 * SPLITTER_W - MIN_MIDDLE;
      setPrintW(pw => Math.max(MIN_PRINT, Math.min(maxPrint, pw - delta)));
    } else {
      setPrintW(pw => Math.max(MIN_PRINT, pw - delta));
    }
  }, [sidebarW, containerW]);

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
        const [woodTypes, woodClasses, units] = await Promise.all([
          api.getWoodTypes(), api.getWoodClasses(), api.getUnits(),
        ]);
        if (Array.isArray(woodTypes) && Array.isArray(woodClasses))
          setWoodTypesFromApi(woodTypes, woodClasses);
        if (Array.isArray(units))
          setGlobalUnits(units.map((u: any) => u.latex));
      } catch {}
      await loadNormData(normId);
    })();
  }, []);

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

  const showAdmin = pathname === '/admin';

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', height: '100vh',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      background: '#f1f5f9', overflow: 'hidden',
    }}>
      {showAdmin && <AdminPage onClose={() => navigateTo('/')} />}

      <Header onAdminClick={() => navigateTo('/admin')} onNormChange={handleNormChange} />

      <div ref={containerRef} style={{ display: 'flex', flex: 1, overflow: 'hidden', minHeight: 0 }}>

        {/* Sidebar */}
        {showSidebar ? (
          <>
            <div style={{ width: sidebarW, minWidth: MIN_SIDEBAR, display: 'flex', flexDirection: 'column', background: '#fff', overflow: 'hidden', borderRight: '1px solid #e5e7eb', flexShrink: 0 }}>
              <LeftSidebar onToggle={toggleSidebar} />
            </div>
            <Splitter onResize={onResizeSidebar} />
          </>
        ) : (
          <button onClick={toggleSidebar} title="Inhaltsverzeichnis einblenden"
            style={{ width: 22, background: '#f8fafc', border: 'none', borderRight: '1px solid #e5e7eb', cursor: 'pointer', fontSize: 13, color: '#94a3b8', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'color 0.15s' }}
            onMouseEnter={e => (e.currentTarget.style.color = '#2563eb')}
            onMouseLeave={e => (e.currentTarget.style.color = '#94a3b8')}>
            ☰
          </button>
        )}

        {/* Nachweis-Panel — explizite Breite (wenn containerW bekannt), sonst flex:1 */}
        <div style={{ ...(middleW !== undefined ? { width: middleW, flexShrink: 0 } : { flex: 1 }), minWidth: MIN_MIDDLE, display: 'flex', flexDirection: 'column', background: '#fff', overflow: 'hidden' }}>
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
