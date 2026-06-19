import { latexToJs } from './utils/latexToJs';

type AnyRecord = Record<string, any>;

const normUrls = import.meta.glob('../data/norms.json', { eager: true, query: '?url', import: 'default' }) as Record<string, string>;
const chapterUrls = import.meta.glob('../data/chapters/*.json', { eager: true, query: '?url', import: 'default' }) as Record<string, string>;
const tableUrls = import.meta.glob('../data/tables/*.json', { eager: true, query: '?url', import: 'default' }) as Record<string, string>;
const unitUrls = import.meta.glob('../data/units.json', { eager: true, query: '?url', import: 'default' }) as Record<string, string>;
const woodUrls = import.meta.glob('../data/wood.json', { eager: true, query: '?url', import: 'default' }) as Record<string, string>;
const verificationUrls = import.meta.glob('../nachweise/*/*.json', { eager: true, query: '?url', import: 'default' }) as Record<string, string>;

const STORAGE_KEY = 'statik-rechner-json-api-state-v1';
const JSON_WRITE_ENDPOINT = '/__statik-rechner/write-json';

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value));

const fileStem = (path: string) => {
  const file = path.split('/').pop() || '';
  return file.replace(/\.json$/i, '');
};

const slugify = (value: string) => value
  .trim()
  .toLowerCase()
  .replace(/[ä]/g, 'ae')
  .replace(/[ö]/g, 'oe')
  .replace(/[ü]/g, 'ue')
  .replace(/[ß]/g, 'ss')
  .replace(/[^a-z0-9]+/g, '_')
  .replace(/^_+|_+$/g, '') || `id_${Date.now()}`;

interface LocalState {
  norms: AnyRecord[];
  chaptersByNorm: Record<string, AnyRecord[]>;
  tablesByNorm: Record<string, AnyRecord[]>;
  units: AnyRecord[];
  woodTypes: AnyRecord[];
  woodClasses: AnyRecord[];
  verifications: AnyRecord[];
}

async function loadJson(url: string) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`JSON konnte nicht geladen werden: ${url}`);
  return response.json();
}

// Resilientes Laden: ein einzelner Fehlschlag (Timeout bei grossen Dateien,
// Dev-Server-Neustart mitten im Request) darf NICHT alle anderen Daten mitreissen.
async function loadJsonSafe(url: string): Promise<any | null> {
  try {
    return await loadJson(url);
  } catch (err) {
    console.warn('[api] Datei konnte nicht geladen werden, wird übersprungen:', url, err);
    return null;
  }
}

async function buildInitialState(): Promise<LocalState> {
  const [norms, units, wood] = await Promise.all([
    loadJsonSafe(Object.values(normUrls)[0]),
    loadJsonSafe(Object.values(unitUrls)[0]),
    loadJsonSafe(Object.values(woodUrls)[0]),
  ]);

  const chaptersByNorm: Record<string, AnyRecord[]> = {};
  await Promise.all(Object.entries(chapterUrls).map(async ([path, url]) => {
    const data = await loadJsonSafe(url);
    if (data) chaptersByNorm[fileStem(path)] = data;
  }));

  const tablesByNorm: Record<string, AnyRecord[]> = {};
  await Promise.all(Object.entries(tableUrls).map(async ([path, url]) => {
    const data = await loadJsonSafe(url);
    if (data) tablesByNorm[fileStem(path)] = data;
  }));

  const verificationPayloads = await Promise.all(Object.values(verificationUrls).map(loadJsonSafe));
  const verifications = verificationPayloads
    .filter(Boolean)
    .map(payload => {
      try {
        return normalizeVerificationPayload(payload);
      } catch (err) {
        console.warn('[api] Nachweis konnte nicht verarbeitet werden, wird übersprungen:', err);
        return null;
      }
    })
    .filter(Boolean) as AnyRecord[];

  return {
    norms: clone(norms || []),
    chaptersByNorm,
    tablesByNorm,
    units: clone(units || []),
    woodTypes: clone(wood?.wood_types || []),
    woodClasses: clone(wood?.wood_classes || []),
    verifications,
  };
}

function readOverlay(): Partial<LocalState> | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

const verifId = (v: AnyRecord) => v?.verification?.id ?? v?.id;

// Datei-Nachweise sind die Quelle der Wahrheit. Der localStorage-Overlay darf
// NUR Nachweise hinzufügen, die (noch) keine Datei haben (z.B. im Admin neu
// erstellt). Datei-Nachweise dürfen NICHT vom Overlay überschattet werden —
// sonst verschwinden neu hinzugefügte Dateien oder direkte Datei-Änderungen
// werden von veralteten localStorage-Kopien überschrieben.
function mergeVerifications(base: AnyRecord[], overlay?: AnyRecord[]): AnyRecord[] {
  if (!Array.isArray(overlay) || !overlay.length) return base;
  const baseIds = new Set(base.map(verifId));
  const overlayOnly = overlay.filter(v => !baseIds.has(verifId(v)));
  return [...base, ...overlayOnly];
}

function mergeState(base: LocalState, overlay: Partial<LocalState> | null): LocalState {
  if (!overlay) return base;
  return {
    ...base,
    ...overlay,
    chaptersByNorm: { ...base.chaptersByNorm, ...(overlay.chaptersByNorm || {}) },
    tablesByNorm: { ...base.tablesByNorm, ...(overlay.tablesByNorm || {}) },
    verifications: mergeVerifications(base.verifications, overlay.verifications),
  };
}

// Selbstheilung: alte/korrupte expr-Felder (z.B. "Math.sinMath.pow(...)") aus
// einer früheren, fehlerhaften latexToJs-Version werden aus dem latex neu generiert.
const BROKEN_EXPR_RE = /(?:sin|cos|tan|asin|acos|atan|sqrt|log|exp|abs)Math\.|Math\.[a-z]+Math\./;

function healGraphExprs(graph: any): boolean {
  if (!graph || !Array.isArray(graph.nodes)) return false;
  let changed = false;
  for (const node of graph.nodes) {
    const data = node?.data;
    if (!data || typeof data.expr !== 'string' || !data.latex) continue;
    if (BROKEN_EXPR_RE.test(data.expr)) {
      try {
        data.expr = latexToJs(data.latex);
        changed = true;
      } catch {
        // latexToJs robust halten; defekte expr lieber stehen lassen als crashen
      }
    }
  }
  return changed;
}

function healVerifications(verifications: AnyRecord[] | undefined) {
  if (!Array.isArray(verifications)) return;
  for (const v of verifications) {
    const graph = v.graph || safeJson(v.graph_json) || safeJson(v.verification?.graph_json);
    if (!graph) continue;
    if (healGraphExprs(graph)) {
      const json = JSON.stringify(graph);
      v.graph = graph;
      v.graph_json = json;
      if (v.verification) v.verification.graph_json = json;
    }
  }
}

// Sicherheitsnetz: Jeder Nachweis, dessen chapter_id im Kapitelbaum fehlt (z.B.
// weil das im Admin erstellte Kapitel nur im localStorage lag und verloren ging),
// bekommt ein automatisch erzeugtes Platzhalter-Kapitel. So kann ein verwaister
// Nachweis NIE mehr unsichtbar verschwinden.
function ensureReferencedChapters(st: LocalState) {
  for (const v of st.verifications) {
    const norm = v.verification?.norm_id || v.norm_id || 'sia265';
    const chId = v.verification?.chapter_id || v.chapter_id;
    if (!chId) continue;
    const list = st.chaptersByNorm[norm] || (st.chaptersByNorm[norm] = []);
    if (list.some(c => c.id === chId)) continue;
    // Nummer aus der ID ableiten: Norm-Präfix und zufälligen Suffix entfernen.
    let num = String(chId);
    if (num.startsWith(norm + '_')) num = num.slice(norm.length + 1);
    num = num.replace(/_[a-z0-9]{6,}$/i, '').replace(/_/g, '.');
    // Falls ein Eltern-Kapitel mit passender Nummer existiert, dort einhängen.
    const parentNum = num.includes('.') ? num.slice(0, num.lastIndexOf('.')) : null;
    const parent = parentNum ? list.find(c => c.number === parentNum) : null;
    list.push({
      id: chId,
      norm_id: norm,
      parent_id: parent ? parent.id : null,
      number: num,
      title: `Kapitel ${num}`,
      sort_order: 9000 + list.length,
    });
  }
}

let state: LocalState | null = null;
let statePromise: Promise<LocalState> | null = null;

async function getState() {
  if (state) return state;
  if (!statePromise) {
    statePromise = buildInitialState()
      .then(base => {
        state = mergeState(base, readOverlay());
        try {
          healVerifications((state as any).verifications);
          ensureReferencedChapters(state);
        } catch (err) {
          console.warn('[api] Selbstheilung der Daten fehlgeschlagen:', err);
        }
        return state;
      })
      .catch(err => {
        // Fehlschlag NICHT cachen — sonst bleibt die App nach einem einzigen
        // flaky Request dauerhaft leer. Nächster Aufruf darf neu versuchen.
        statePromise = null;
        throw err;
      });
  }
  return statePromise;
}

async function writeJsonFiles(current: LocalState) {
  if (typeof window === 'undefined') return;
  try {
    const response = await fetch(JSON_WRITE_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(current),
    });
    if (!response.ok) {
      const detail = await response.text();
      throw new Error(detail || `HTTP ${response.status}`);
    }
  } catch (error: any) {
    // In einem statischen Build gibt es keinen lokalen Schreib-Endpunkt.
    if (error instanceof TypeError) return;
    throw new Error(`JSON-Dateien konnten nicht geschrieben werden: ${error?.message || error}`);
  }
}

async function persist() {
  try {
    if (!state) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Die App bleibt auch dann benutzbar, wenn der Browser Storage blockiert.
  }
  if (state) await writeJsonFiles(state);
}

function normalizeVerificationPayload(payload: AnyRecord | null | undefined) {
  if (!payload) return null;
  if (payload.verification) {
    const verification = { ...payload.verification };
    if (payload.id) verification.id = payload.id;
    if (payload.norm_id) verification.norm_id = payload.norm_id;
    if (payload.chapter_id) verification.chapter_id = payload.chapter_id;
    if (payload.graph) verification.graph_json = JSON.stringify(payload.graph);
    return {
      ...payload,
      id: verification.id,
      verification,
      variables: payload.variables || [],
      tables: payload.tables || [],
      graph: payload.graph || safeJson(verification.graph_json) || null,
    };
  }

  const id = payload.id || slugify(payload.title || 'nachweis');
  const graph = payload.graph || safeJson(payload.graph_json) || null;
  return {
    version: 1,
    exported_at: new Date().toISOString(),
    verification: {
      ...payload,
      id,
      graph_json: graph ? JSON.stringify(graph) : (payload.graph_json || null),
      active: payload.active ?? 1,
    },
    variables: payload.variables || [],
    tables: payload.tables || [],
    graph,
  };
}

function safeJson(text: unknown) {
  if (typeof text !== 'string' || !text.trim()) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function makeVerificationRow(payload: AnyRecord) {
  const verification = payload.verification || payload;
  const graph = payload.graph || safeJson(verification.graph_json);
  const graph_json = graph ? JSON.stringify(graph) : (verification.graph_json || null);
  const variables = clone(payload.variables || verification.variables || []).map((variable: AnyRecord) => {
    const next = { ...variable };
    if (next.type === 'table_column' && next.table_ref && next.table_col !== undefined) {
      const table = findTable(next.table_ref);
      if (table) {
        const values = uniqueColumnValues(table, Number(next.table_col));
        next.options = values.map(value => ({ label: String(value), value }));
      }
    }
    return next;
  });

  return {
    ...clone(verification),
    graph_json,
    variables,
  };
}

function findTable(id: string) {
  if (!state) return null;
  for (const tables of Object.values(state.tablesByNorm)) {
    const found = tables.find((table: AnyRecord) => table.id === id);
    if (found) return found;
  }
  for (const payload of state.verifications) {
    const found = (payload.tables || []).find((table: AnyRecord) => table.id === id);
    if (found) return found;
  }
  return null;
}

function uniqueColumnValues(table: AnyRecord, col: number) {
  const values = new Set<any>();
  const rows = Array.isArray(table.rows) ? table.rows : [];
  rows.forEach((row: any) => {
    const value = Array.isArray(row) ? row[col] : row?.[col] ?? row?.[String(col)];
    if (value !== undefined && value !== null && value !== '') values.add(value);
  });
  return Array.from(values);
}

function bySort(a: AnyRecord, b: AnyRecord) {
  return (Number(a.sort_order ?? 0) - Number(b.sort_order ?? 0)) || String(a.number || a.title || a.id).localeCompare(String(b.number || b.title || b.id), 'de');
}

function getNormOfVerification(payload: AnyRecord) {
  return payload.verification?.norm_id || payload.norm_id || 'sia265';
}

function getChapterOfVerification(payload: AnyRecord) {
  return payload.verification?.chapter_id || payload.chapter_id || null;
}

function nextSort(items: AnyRecord[]) {
  return Math.max(0, ...items.map(item => Number(item.sort_order || 0))) + 1;
}

function toVerificationPayload(data: AnyRecord, existing?: AnyRecord) {
  const verification = {
    ...(existing?.verification || {}),
    ...data,
    id: data.id || existing?.verification?.id || slugify(data.title || 'nachweis'),
    active: data.active ?? existing?.verification?.active ?? 1,
  };
  const graph = safeJson(data.graph_json) || data.graph || existing?.graph || safeJson(verification.graph_json);
  if (graph) verification.graph_json = JSON.stringify(graph);
  const payload = normalizeVerificationPayload({
    ...(existing || {}),
    id: verification.id,
    verification,
    variables: data.variables || existing?.variables || [],
    tables: data.tables || existing?.tables || [],
    graph,
  })! as AnyRecord;
  payload.verification.id = verification.id;
  payload.id = verification.id;
  return payload;
}

async function ok(value: any): Promise<any> {
  return clone(value);
}

export const api = {
  getNorms: async () => {
    const current = await getState();
    return ok(current.norms.sort(bySort));
  },
  createNorm: async (data: AnyRecord) => {
    const state = await getState();
    const norm = { id: data.id || slugify(data.name || data.label || 'norm'), ...data };
    state.norms = [...state.norms.filter(n => n.id !== norm.id), norm];
    state.chaptersByNorm[norm.id] ||= [];
    state.tablesByNorm[norm.id] ||= [];
    await persist();
    return ok(norm);
  },

  getChapters: async (norm = 'sia265') => {
    const state = await getState();
    return ok((state.chaptersByNorm[norm] || []).sort(bySort));
  },
  createChapter: async (data: AnyRecord) => {
    const state = await getState();
    const norm = data.norm_id || 'sia265';
    const chapters = state.chaptersByNorm[norm] || [];
    const chapter = { id: data.id || `${norm}_${slugify(data.number || data.title || 'kapitel')}`, sort_order: nextSort(chapters), ...data, norm_id: norm };
    state.chaptersByNorm[norm] = [...chapters.filter(c => c.id !== chapter.id), chapter].sort(bySort);
    await persist();
    return ok(chapter);
  },
  updateChapter: async (id: string, data: AnyRecord) => {
    const state = await getState();
    let updated: AnyRecord | null = null;
    Object.keys(state.chaptersByNorm).forEach(norm => {
      state.chaptersByNorm[norm] = state.chaptersByNorm[norm].map(chapter => {
        if (chapter.id !== id) return chapter;
        updated = { ...chapter, ...data };
        return updated;
      });
    });
    await persist();
    return ok(updated || { id, ...data });
  },
  deleteChapter: async (id: string) => {
    const state = await getState();
    Object.keys(state.chaptersByNorm).forEach(norm => {
      state.chaptersByNorm[norm] = state.chaptersByNorm[norm].filter(chapter => chapter.id !== id && chapter.parent_id !== id);
    });
    state.verifications = state.verifications.filter(payload => getChapterOfVerification(payload) !== id);
    await persist();
    return ok({ ok: true });
  },

  getVerifications: async (norm = 'sia265') => {
    const state = await getState();
    return ok(state.verifications
      .filter(payload => getNormOfVerification(payload) === norm && (payload.verification?.active ?? 1) !== 0)
      .map(makeVerificationRow)
      .sort(bySort));
  },
  getVerification: async (id: string) => {
    const state = await getState();
    const payload = state.verifications.find(item => item.verification?.id === id);
    if (!payload) throw new Error(`Nachweis nicht gefunden: ${id}`);
    return ok(makeVerificationRow(payload));
  },
  createVerification: async (data: AnyRecord) => {
    const state = await getState();
    const payload = toVerificationPayload(data);
    state.verifications = [...state.verifications.filter(item => item.verification?.id !== payload.verification.id), payload];
    await persist();
    return ok(makeVerificationRow(payload));
  },
  updateVerification: async (id: string, data: AnyRecord) => {
    const state = await getState();
    const index = state.verifications.findIndex(item => item.verification?.id === id);
    const existing = index >= 0 ? state.verifications[index] : undefined;
    const payload = toVerificationPayload(data, existing);
    state.verifications = state.verifications.filter(item =>
      item.verification?.id !== id && item.verification?.id !== payload.verification.id
    );
    state.verifications.push(payload);
    await persist();
    return ok(makeVerificationRow(payload));
  },
  deleteVerification: async (id: string) => {
    const state = await getState();
    state.verifications = state.verifications.filter(item => item.verification?.id !== id);
    await persist();
    return ok({ ok: true });
  },
  importVerification: async (data: AnyRecord) => {
    const state = await getState();
    const raw = data.payload || data;
    const payload = normalizeVerificationPayload(raw)!;
    if (data.norm_id) payload.verification.norm_id = data.norm_id;
    if (data.chapter_id) payload.verification.chapter_id = data.chapter_id;
    state.verifications = [...state.verifications.filter(item => item.verification?.id !== payload.verification.id), payload];
    await persist();
    return ok({ ok: true, id: payload.verification.id, verification: makeVerificationRow(payload) });
  },
  exportVerification: async (id: string) => {
    const state = await getState();
    const payload = state.verifications.find(item => item.verification?.id === id);
    if (!payload) throw new Error(`Nachweis nicht gefunden: ${id}`);
    return ok(payload);
  },

  getVariables: async (vid: string) => {
    const state = await getState();
    const payload = state.verifications.find(item => item.verification?.id === vid);
    return ok(payload?.variables || []);
  },
  createVariable: async (vid: string, data: AnyRecord) => {
    const state = await getState();
    const payload = state.verifications.find(item => item.verification?.id === vid);
    if (!payload) throw new Error(`Nachweis nicht gefunden: ${vid}`);
    const variable = { id: data.id || `${vid}_${slugify(data.name || 'variable')}`, ...data };
    payload.variables = [...(payload.variables || []).filter((v: AnyRecord) => v.id !== variable.id), variable];
    await persist();
    return ok(variable);
  },
  updateVariable: async (id: string, data: AnyRecord) => {
    const state = await getState();
    let updated = null;
    state.verifications.forEach(payload => {
      payload.variables = (payload.variables || []).map((variable: AnyRecord) => {
        if (variable.id !== id) return variable;
        updated = { ...variable, ...data };
        return updated;
      });
    });
    await persist();
    return ok(updated || { id, ...data });
  },
  deleteVariable: async (id: string) => {
    const state = await getState();
    state.verifications.forEach(payload => {
      payload.variables = (payload.variables || []).filter((variable: AnyRecord) => variable.id !== id);
    });
    await persist();
    return ok({ ok: true });
  },

  getWoodTypes: async () => {
    const state = await getState();
    return ok(state.woodTypes.sort(bySort));
  },
  createWoodType: async (data: AnyRecord) => {
    const state = await getState();
    const item = { id: data.id || slugify(data.name || data.label || 'holzart'), sort_order: nextSort(state.woodTypes), ...data };
    state.woodTypes = [...state.woodTypes.filter(x => x.id !== item.id), item];
    await persist();
    return ok(item);
  },
  updateWoodType: async (id: string, data: AnyRecord) => {
    const state = await getState();
    state.woodTypes = state.woodTypes.map(item => item.id === id ? { ...item, ...data } : item);
    await persist();
    return ok(state.woodTypes.find(item => item.id === id) || { id, ...data });
  },
  deleteWoodType: async (id: string) => {
    const state = await getState();
    state.woodTypes = state.woodTypes.filter(item => item.id !== id);
    state.woodClasses = state.woodClasses.filter(item => item.wood_type_id !== id);
    await persist();
    return ok({ ok: true });
  },

  getWoodClasses: async () => {
    const state = await getState();
    return ok(state.woodClasses.sort(bySort));
  },
  createWoodClass: async (data: AnyRecord) => {
    const state = await getState();
    const item = { id: data.id || slugify(data.name || data.label || 'holzklasse'), sort_order: nextSort(state.woodClasses), properties: [], ...data };
    state.woodClasses = [...state.woodClasses.filter(x => x.id !== item.id), item];
    await persist();
    return ok(item);
  },
  updateWoodClass: async (id: string, data: AnyRecord) => {
    const state = await getState();
    state.woodClasses = state.woodClasses.map(item => item.id === id ? { ...item, ...data } : item);
    await persist();
    return ok(state.woodClasses.find(item => item.id === id) || { id, ...data });
  },
  deleteWoodClass: async (id: string) => {
    const state = await getState();
    state.woodClasses = state.woodClasses.filter(item => item.id !== id);
    await persist();
    return ok({ ok: true });
  },

  getTables: async (norm?: string) => {
    const state = await getState();
    const tables = norm ? (state.tablesByNorm[norm] || []) : Object.values(state.tablesByNorm).flat();
    return ok(tables.sort(bySort));
  },
  getTableFull: async (id: string) => {
    await getState();
    const table = findTable(id);
    if (!table) throw new Error(`Tabelle nicht gefunden: ${id}`);
    return ok(table);
  },
  createTable: async (data: AnyRecord) => {
    const state = await getState();
    const norm = data.norm_id || 'sia265';
    const tables = state.tablesByNorm[norm] || [];
    const table = { id: data.id || `${norm}_${slugify(data.title || 'tabelle')}`, sort_order: nextSort(tables), ...data, norm_id: norm };
    state.tablesByNorm[norm] = [...tables.filter(item => item.id !== table.id), table].sort(bySort);
    await persist();
    return ok(table);
  },
  updateTable: async (id: string, data: AnyRecord) => {
    const state = await getState();
    let updated: AnyRecord | null = null;
    Object.keys(state.tablesByNorm).forEach(norm => {
      state.tablesByNorm[norm] = state.tablesByNorm[norm].map(table => {
        if (table.id !== id) return table;
        updated = { ...table, ...data };
        return updated;
      });
    });
    await persist();
    return ok(updated || { id, ...data });
  },
  deleteTable: async (id: string) => {
    const state = await getState();
    Object.keys(state.tablesByNorm).forEach(norm => {
      state.tablesByNorm[norm] = state.tablesByNorm[norm].filter(table => table.id !== id);
    });
    await persist();
    return ok({ ok: true });
  },

  getUnits: async () => {
    const state = await getState();
    return ok(state.units.sort(bySort));
  },
  createUnit: async (data: AnyRecord) => {
    const state = await getState();
    const id = data.id ?? Math.max(0, ...state.units.map(unit => Number(unit.id || 0))) + 1;
    const unit = { id, sort_order: nextSort(state.units), ...data };
    state.units = [...state.units.filter(item => item.id !== id), unit].sort(bySort);
    await persist();
    return ok(unit);
  },
  updateUnit: async (id: number, data: AnyRecord) => {
    const state = await getState();
    state.units = state.units.map(unit => Number(unit.id) === Number(id) ? { ...unit, ...data } : unit);
    await persist();
    return ok(state.units.find(unit => Number(unit.id) === Number(id)) || { id, ...data });
  },
  deleteUnit: async (id: number) => {
    const state = await getState();
    state.units = state.units.filter(unit => Number(unit.id) !== Number(id));
    await persist();
    return ok({ ok: true });
  },

  reloadVerifications: async () => {
    try {
      const response = await fetch('/__statik-rechner/load-verifications');
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      if (!data.ok) throw new Error(data.error || 'Fehler beim Laden');

      const current = await getState();
      const normalized = (data.verifications || [])
        .map((payload: AnyRecord) => normalizeVerificationPayload(payload))
        .filter(Boolean) as AnyRecord[];

      current.verifications = normalized;
      await persist();
      return ok({ ok: true, count: normalized.length });
    } catch (error: any) {
      throw new Error(`Verifikationen konnte nicht neu geladen werden: ${error?.message || error}`);
    }
  },
};
