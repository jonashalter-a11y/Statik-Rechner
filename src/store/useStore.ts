import { create } from 'zustand';
import { chapters as staticChapters } from '../data/sia265';
import { defaultVerifications } from '../data/verifications';
import { Chapter, Discipline, Standard, Verification, WoodType } from '../types';
import { evalFormula } from '../utils/evalFormula';

const LS_ACTIVE_CHAPTER = 'sia-active-chapter-id';
const LS_ACTIVE_VERIFICATION = 'sia-active-verification-id';
const LS_GRAPH_INPUTS = 'sia-graph-inputs-v1';
const LS_VERIFICATION_DRAFTS = 'sia-verification-drafts-v1';

// ─── Typen ───────────────────────────────────────────────────────────────────
export interface ApiWoodType  { id: string; name: string; label: string; sort_order: number; }
export interface ApiWoodClass { id: string; wood_type_id: string; name: string; label: string; properties: ApiProperty[]; }
export interface ApiProperty  { id: number; wood_class_id: string; key: string; label: string; value: number; unit: string; }

interface AppState {
  discipline: Discipline;
  standard: Standard;
  normId: string;                   // 'sia265' | 'sia261'
  woodType: WoodType;
  woodClassId: string;
  chapters: Chapter[];
  activeChapterId: string | null;
  activeVerificationId: string | null;
  verifications: Verification[];
  // Jedes Print-Item ist ein eigener eingefrorener Snapshot mit eindeutigem key
  printItems: Array<{ key: string; snapshot: Verification; graphInputs: Record<string, string> }>;
  // Graph-Eingaben je Nachweis (Node-ID → Wert); wird beim Snapshot mitkapturiert
  graphInputsByVerif: Record<string, Record<string, string>>;
  // Hochgezählt bei jedem restoreFromPrint → erzwingt Re-mount von GraphVerificationView
  restoreNonce: number;

  // Vom Backend geladene Holzdaten
  apiWoodTypes:    ApiWoodType[];
  apiWoodClasses:  ApiWoodClass[];
  rawChapterData:  any[];
  rawChapterDataByNorm: Record<string, any[]>;
  _verifsByNorm:   Record<string, Verification[]>; // Verifikationen-Cache pro Norm

  setDiscipline:   (d: Discipline) => void;
  setStandard:     (s: Standard)   => void;
  setNormId:       (id: string)    => void;
  setWoodType:     (w: WoodType)   => void;
  setWoodClassId:  (id: string)    => void;
  toggleChapter:   (id: string)    => void;
  setActiveChapter:(id: string | null) => void;
  setActiveVerification:(id: string | null) => void;
  updateVariableValue:(verificationId: string, variableId: string, value: number | string) => void;
  updateComment:   (verificationId: string, comment: string) => void;
  addVerificationToPrint:      (id: string) => void;  // fügt immer eine neue Instanz hinzu
  removeVerificationFromPrint: (key: string) => void; // entfernt genau diese Instanz
  updatePrintItemInputs: (key: string, inputs: Record<string, string>) => void;
  restoreFromPrint: (key: string) => void; // Werte aus Print-Item ins Frontend übernehmen
  setGraphInputs: (verifId: string, inputs: Record<string, string>) => void;
  addVerification: (v: Verification) => void;
  globalUnits: string[];             // LaTeX-Einheiten aus der DB
  setGlobalUnits: (units: string[]) => void;
  computeResult:   (verificationId: string) => void;
  setVerificationsFromApi: (data: any[], normId?: string) => void;
  setChaptersFromApi:      (data: any[], normId?: string) => void;
  setWoodTypesFromApi:     (types: ApiWoodType[], classes: ApiWoodClass[]) => void;
}

// ─── Hilfsfunktionen ─────────────────────────────────────────────────────────
function toggleChapterInTree(chapters: Chapter[], id: string): Chapter[] {
  return chapters.map(c => {
    if (c.id === id) return { ...c, expanded: !c.expanded };
    if (c.children) return { ...c, children: toggleChapterInTree(c.children, id) };
    return c;
  });
}

function expandChapterInTree(chapters: Chapter[], id: string): Chapter[] {
  return chapters.map(c => {
    if (c.id === id) return { ...c, expanded: true };
    if (c.children) return { ...c, children: expandChapterInTree(c.children, id) };
    return c;
  });
}

function readJsonStorage<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) as T : fallback;
  } catch {
    return fallback;
  }
}

function writeJsonStorage(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // localStorage kann voll oder blockiert sein; die App soll trotzdem weiterlaufen.
  }
}

function patchVerificationDraft(verificationId: string, patch: Record<string, unknown>) {
  const drafts = readJsonStorage<Record<string, any>>(LS_VERIFICATION_DRAFTS, {});
  const next = { ...drafts, [verificationId]: { ...(drafts[verificationId] || {}), ...patch } };
  writeJsonStorage(LS_VERIFICATION_DRAFTS, next);
}

function buildChapterTree(data: any[], verifications: Verification[], standard: Standard, state: any) {
  if (!data || data.length === 0) return { standard, chapters: state.chapters };
  const map = new Map<string, Chapter>();
  data.forEach((c: any) => map.set(c.id, { id: c.id, number: c.number, title: c.title, children: [], verifications: [], expanded: false }));
  const roots: Chapter[] = [];
  data.forEach((c: any) => {
    const node = map.get(c.id)!;
    if (c.parent_id && map.has(c.parent_id)) map.get(c.parent_id)!.children!.push(node);
    else roots.push(node);
  });
  const vIdsByChapter = new Map<string, string[]>();
  verifications.forEach(v => {
    if (!vIdsByChapter.has(v.chapterId)) vIdsByChapter.set(v.chapterId, []);
    vIdsByChapter.get(v.chapterId)!.push(v.id);
  });
  const countAndAnnotate = (ch: Chapter): { node: Chapter; count: number } => {
    const ownVs = vIdsByChapter.get(ch.id) || [];
    const childResults = (ch.children || []).map(countAndAnnotate);
    const totalCount = ownVs.length + childResults.reduce((s, r) => s + r.count, 0);
    return { node: { ...ch, verifications: ownVs, children: childResults.filter(r => r.count > 0).map(r => r.node), expanded: totalCount > 0 }, count: totalCount };
  };
  return { standard, chapters: roots.map(r => countAndAnnotate(r)).filter(r => r.count > 0).map(r => r.node) };
}

function computeVerification(v: Verification): Verification {
  if (!v.computeExpr) return v;
  const vars: Record<string, number> = {};
  for (const variable of v.variables) vars[variable.name] = Number(variable.value) || 0;
  const eta = evalFormula(v.computeExpr, vars);
  if (eta === null) return v;
  return { ...v, result: Math.round(eta * 1000) / 1000, passed: eta <= 1.0 };
}

/**
 * Füllt Materialkennwerte einer Holzklasse in alle Verifikations-Variablen ein,
 * sofern der Variablenname mit einem property-key übereinstimmt (z.B. f_m_k, f_v_k …).
 */
function applyWoodClassToVerifications(
  verifications: Verification[],
  woodClass: ApiWoodClass | undefined
): Verification[] {
  if (!woodClass) return verifications;
  const propMap = new Map<string, number>();
  for (const p of woodClass.properties) propMap.set(p.key, p.value);

  return verifications.map(v => {
    let changed = false;
    const newVars = v.variables.map(vr => {
      if (propMap.has(vr.name)) {
        changed = true;
        return { ...vr, value: propMap.get(vr.name)! };
      }
      return vr;
    });
    if (!changed) return v;
    return computeVerification({ ...v, variables: newVars });
  });
}

// ─── Store ───────────────────────────────────────────────────────────────────
export const useStore = create<AppState>((set, get) => ({
  discipline: 'Statik',
  standard:   'SIA',
  normId:     (localStorage.getItem('sia-norm-id') || 'sia265') as string,
  woodType:   'Vollholz',
  woodClassId: 'C24',
  chapters: staticChapters,
  activeChapterId: localStorage.getItem(LS_ACTIVE_CHAPTER),
  activeVerificationId: localStorage.getItem(LS_ACTIVE_VERIFICATION),
  verifications: defaultVerifications.map(v => computeVerification(v)),
  printItems: [],
  graphInputsByVerif: readJsonStorage<Record<string, Record<string, string>>>(LS_GRAPH_INPUTS, {}),
  restoreNonce: 0,
  apiWoodTypes:   [],
  apiWoodClasses: [],
  rawChapterData: [],
  rawChapterDataByNorm: {},
  _verifsByNorm: {},
  globalUnits: [],
  setGlobalUnits: (units) => set({ globalUnits: units }),

  setDiscipline: (d) => set({ discipline: d }),

  setStandard: (s) => {
    if (s === 'Eurocode') { set({ standard: s, chapters: [] }); return; }
    set(state => buildChapterTree(state.rawChapterData, state.verifications, s, state));
  },

  // Norm innerhalb SIA wechseln — setzt normId sofort; API-Daten kommen via loadNormData
  setNormId: (id) => {
    localStorage.setItem('sia-norm-id', id);
    set(state => {
      const chapData = state.rawChapterDataByNorm[id] || [];
      const normVerifs = state._verifsByNorm[id] || [];
      const chapters = chapData.length > 0
        ? buildChapterTree(chapData, normVerifs, 'SIA', state).chapters
        : [];
      localStorage.removeItem(LS_ACTIVE_CHAPTER);
      localStorage.removeItem(LS_ACTIVE_VERIFICATION);
      return {
        normId: id,
        standard: 'SIA',
        chapters,
        verifications: normVerifs.length > 0 ? normVerifs : state.verifications,
        activeChapterId: null,
        activeVerificationId: null,
      };
    });
  },

  // Holzart wechseln: passende Klassen filtern, zweite (mittlere) automatisch wählen + Werte einfüllen
  setWoodType: (w) => set(state => {
    const typeId = woodTypeToId(w);
    const matching = state.apiWoodClasses.filter(c => c.wood_type_id === typeId);
    // Bevorzuge zweite Klasse (C24 bei Vollholz, GL24h bei BSH) — ansonsten erste
    const preferredClass = matching[1] ?? matching[0];
    const newClassId = preferredClass ? preferredClass.id : state.woodClassId;
    const verifications = applyWoodClassToVerifications(state.verifications, preferredClass);
    return { woodType: w, woodClassId: newClassId, verifications };
  }),

  // Holzklasse wechseln: Materialkennwerte automatisch in Variablen einfüllen
  setWoodClassId: (id) => set(state => {
    const woodClass = state.apiWoodClasses.find(c => c.id === id);
    const verifications = applyWoodClassToVerifications(state.verifications, woodClass);
    return { woodClassId: id, verifications };
  }),

  toggleChapter: (id) =>
    set(state => ({ chapters: toggleChapterInTree(state.chapters, id) })),

  setActiveChapter: (id) => {
    if (id) localStorage.setItem(LS_ACTIVE_CHAPTER, id);
    else localStorage.removeItem(LS_ACTIVE_CHAPTER);
    set({ activeChapterId: id });
  },
  setActiveVerification: (id) => {
    const state = get();
    const verification = id ? state.verifications.find(v => v.id === id) : null;
    if (id) localStorage.setItem(LS_ACTIVE_VERIFICATION, id);
    else localStorage.removeItem(LS_ACTIVE_VERIFICATION);
    if (verification?.chapterId) localStorage.setItem(LS_ACTIVE_CHAPTER, verification.chapterId);
    set({
      activeVerificationId: id,
      activeChapterId: verification?.chapterId ?? state.activeChapterId,
      chapters: verification?.chapterId ? expandChapterInTree(state.chapters, verification.chapterId) : state.chapters,
    });
  },

  updateVariableValue: (verificationId, variableId, value) =>
    set(state => {
      const current = state.verifications.find(v => v.id === verificationId);
      if (current) {
        const variables = {
          ...(readJsonStorage<Record<string, any>>(LS_VERIFICATION_DRAFTS, {})[verificationId]?.variables || {}),
          [variableId]: value,
        };
        patchVerificationDraft(verificationId, { variables });
      }
      return {
        verifications: state.verifications.map(v => {
        if (v.id !== verificationId) return v;
        const updated = {
          ...v,
          variables: v.variables.map(vr =>
            vr.id === variableId ? { ...vr, value } : vr
          ),
        };
        return computeVerification(updated);
      }),
      };
    }),

  updateComment: (verificationId, comment) =>
    set(state => {
      patchVerificationDraft(verificationId, { comment });
      return {
        verifications: state.verifications.map(v =>
          v.id === verificationId ? { ...v, comment } : v
        ),
      };
    }),

  // Immer neue Instanz mit eindeutigem key — beliebig viele des gleichen Nachweises möglich
  addVerificationToPrint: (id) =>
    set(state => {
      const v = state.verifications.find(x => x.id === id);
      if (!v) return state;
      const key = `${id}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
      const snapshot: Verification = JSON.parse(JSON.stringify(v));
      const graphInputs = { ...(state.graphInputsByVerif[id] || {}) };
      return { printItems: [...state.printItems, { key, snapshot, graphInputs }] };
    }),

  removeVerificationFromPrint: (key) =>
    set(state => ({ printItems: state.printItems.filter(item => item.key !== key) })),

  updatePrintItemInputs: (key, inputs) =>
    set(state => ({
      printItems: state.printItems.map(item =>
        item.key === key ? { ...item, graphInputs: inputs } : item
      ),
    })),

  restoreFromPrint: (key) =>
    set(state => {
      const item = state.printItems.find(x => x.key === key);
      if (!item) return state;
      const chapterId = item.snapshot.chapterId ?? null;
      const chapters = chapterId
        ? expandChapterInTree(state.chapters, chapterId)
        : state.chapters;
      localStorage.setItem(LS_ACTIVE_VERIFICATION, item.snapshot.id);
      if (chapterId) localStorage.setItem(LS_ACTIVE_CHAPTER, chapterId);
      writeJsonStorage(LS_GRAPH_INPUTS, { ...state.graphInputsByVerif, [item.snapshot.id]: item.graphInputs });
      return {
        activeVerificationId: item.snapshot.id,
        activeChapterId: chapterId,
        chapters,
        graphInputsByVerif: { ...state.graphInputsByVerif, [item.snapshot.id]: item.graphInputs },
        restoreNonce: state.restoreNonce + 1,
      };
    }),

  setGraphInputs: (verifId, inputs) =>
    set(state => {
      const graphInputsByVerif = { ...state.graphInputsByVerif, [verifId]: inputs };
      writeJsonStorage(LS_GRAPH_INPUTS, graphInputsByVerif);
      return { graphInputsByVerif };
    }),

  addVerification: (v) =>
    set(state => ({ verifications: [...state.verifications, computeVerification(v)] })),

  computeResult: (verificationId) =>
    set(state => ({
      verifications: state.verifications.map(v =>
        v.id === verificationId ? computeVerification(v) : v
      ),
    })),

  // Kapitelstruktur vom Backend laden
  setChaptersFromApi: (data, normId = 'sia265') => {
    set(state => {
      const newByNorm = { ...state.rawChapterDataByNorm, [normId]: data };
      // Nur in die UI übernehmen wenn diese Norm gerade aktiv ist
      if (normId !== state.normId) return { rawChapterDataByNorm: newByNorm };

      // Baum aufbauen
      const map = new Map<string, Chapter>();
      data.forEach((c: any) => map.set(c.id, { id: c.id, number: c.number, title: c.title, children: [], verifications: [], expanded: false }));
      const roots: Chapter[] = [];
      data.forEach((c: any) => {
        const node = map.get(c.id)!;
        if (c.parent_id && map.has(c.parent_id)) map.get(c.parent_id)!.children!.push(node);
        else roots.push(node);
      });
      const vIdsByChapter = new Map<string, string[]>();
      state.verifications.forEach(v => {
        if (!vIdsByChapter.has(v.chapterId)) vIdsByChapter.set(v.chapterId, []);
        vIdsByChapter.get(v.chapterId)!.push(v.id);
      });
      const countAndAnnotate = (ch: Chapter): { node: Chapter; count: number } => {
        const ownVs = vIdsByChapter.get(ch.id) || [];
        const childResults = (ch.children || []).map(countAndAnnotate);
        const totalCount = ownVs.length + childResults.reduce((s, r) => s + r.count, 0);
        return { node: { ...ch, verifications: ownVs, children: childResults.filter(r => r.count > 0).map(r => r.node), expanded: totalCount > 0 }, count: totalCount };
      };
      let chapters = roots.map(r => countAndAnnotate(r)).filter(r => r.count > 0).map(r => r.node);
      if (state.activeChapterId) chapters = expandChapterInTree(chapters, state.activeChapterId);
      return { rawChapterData: data, rawChapterDataByNorm: newByNorm, chapters };
    });
  },

  // Nachweise vom Backend laden — bestehende User-Werte bleiben erhalten
  setVerificationsFromApi: (data, normId = 'sia265') => {
    set(state => {
      // Vorhandene Werte aus Cache oder aktiver Norm holen
      const existingVerifs = normId === state.normId
        ? state.verifications
        : (state._verifsByNorm[normId] || []);

      const woodClass = state.apiWoodClasses.find(c => c.id === state.woodClassId);
      const woodProps = new Map(woodClass?.properties.map(p => [p.key, p.value]) ?? []);
      const drafts = readJsonStorage<Record<string, any>>(LS_VERIFICATION_DRAFTS, {});

      const mapped: Verification[] = (data || []).map((v: any) => {
        const existingV = existingVerifs.find(ev => ev.id === v.id);
        const draft = drafts[v.id] || {};
        const draftVars = draft.variables || {};
        return {
          id: v.id,
          chapterId: v.chapter_id,
          title: v.title,
          computeExpr: v.compute_expr,
          graph_json: v.graph_json ?? null,
          comment: draft.comment ?? existingV?.comment ?? '',
          variables: (v.variables || []).map((vr: any) => {
            // Holzklassen-Kennwerte immer aus aktueller Klasse
            if (woodProps.has(vr.name)) {
              return {
                id: vr.id, name: vr.name, label: vr.label, unit: vr.unit,
                type: vr.type as any, value: woodProps.get(vr.name)!,
                description: vr.description,
                options: (vr.options || []).map((o: any) => ({
                  label: o.label,
                  value: isNaN(Number(o.value)) ? o.value : Number(o.value),
                })),
              };
            }
            // Für alle anderen Variablen: vom User eingegebenen Wert erhalten
            const existingVar = existingV?.variables.find(ev => ev.id === vr.id);
            // table_column: Optionen kommen als Strings aus der DB-Tabelle (nicht als Zahlen konvertieren)
            const isTableCol = vr.type === 'table_column';
            const opts = (vr.options || []).map((o: any) => ({
              label: o.label,
              value: isTableCol ? String(o.value) : (isNaN(Number(o.value)) ? o.value : Number(o.value)),
            }));
            const defaultVal = isTableCol
              ? (opts[0]?.value ?? vr.default_value ?? '')
              : (isNaN(Number(vr.default_value)) ? vr.default_value : Number(vr.default_value));
            return {
              id: vr.id, name: vr.name, label: vr.label, unit: vr.unit,
              type: vr.type as any,
              table_ref: vr.table_ref ?? undefined,
              table_col: vr.table_col != null ? Number(vr.table_col) : undefined,
              value: draftVars[vr.id] ?? (existingVar !== undefined ? existingVar.value : defaultVal),
              description: vr.description,
              options: opts,
            };
          }),
          formula: {
            id: v.id,
            latex: v.formula_latex,
            description: v.formula_description || '',
            variables: (v.variables || []).map((vr: any) => vr.id),
            resultVariableId: 'eta',
          },
        };
      });

      const computed = mapped.map(v => computeVerification(v));
      const _verifsByNorm = { ...state._verifsByNorm, [normId]: computed };
      if (normId !== state.normId) return { _verifsByNorm };
      const storedActive = localStorage.getItem(LS_ACTIVE_VERIFICATION);
      const activeVerificationId = computed.some(v => v.id === state.activeVerificationId)
        ? state.activeVerificationId
        : (storedActive && computed.some(v => v.id === storedActive) ? storedActive : state.activeVerificationId);
      const activeChapterId = activeVerificationId
        ? computed.find(v => v.id === activeVerificationId)?.chapterId ?? state.activeChapterId
        : state.activeChapterId;
      if (activeVerificationId) localStorage.setItem(LS_ACTIVE_VERIFICATION, activeVerificationId);
      if (activeChapterId) localStorage.setItem(LS_ACTIVE_CHAPTER, activeChapterId);
      const chapters = activeChapterId ? expandChapterInTree(state.chapters, activeChapterId) : state.chapters;
      return { verifications: computed, _verifsByNorm, activeVerificationId, activeChapterId, chapters };
    });
  },

  // Holzarten + Holzklassen speichern und sofort einfüllen
  setWoodTypesFromApi: (types, classes) => {
    set(state => {
      const woodClass = classes.find(c => c.id === state.woodClassId);
      const verifications = applyWoodClassToVerifications(state.verifications, woodClass);
      return { apiWoodTypes: types, apiWoodClasses: classes, verifications };
    });
  },
}));

// Hilfsfunktion: WoodType-Label → DB-ID
export function woodTypeToId(w: WoodType): string {
  switch (w) {
    case 'Vollholz':          return 'vollholz';
    case 'Brettschichtholz':  return 'bsh';
    case 'Brettsperrholz':    return 'clt';
    default: return String(w).toLowerCase();
  }
}
