import { create } from 'zustand';
import { chapters as staticChapters } from '../data/sia265';
import { defaultVerifications } from '../data/verifications';
import { Chapter, Discipline, Standard, Verification, WoodType } from '../types';
import { evalFormula } from '../utils/evalFormula';

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
  printItems: Array<{ key: string; snapshot: Verification }>;

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
  addVerification: (v: Verification) => void;
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
    return { node: { ...ch, verifications: ownVs, children: childResults.map(r => r.node), expanded: totalCount > 0 }, count: totalCount };
  };
  return { standard, chapters: roots.map(r => countAndAnnotate(r).node) };
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
  normId:     'sia265',
  woodType:   'Vollholz',
  woodClassId: 'C24',
  chapters: staticChapters,
  activeChapterId: null,
  activeVerificationId: null,
  verifications: defaultVerifications.map(v => computeVerification(v)),
  printItems: [],
  apiWoodTypes:   [],
  apiWoodClasses: [],
  rawChapterData: [],
  rawChapterDataByNorm: {},
  _verifsByNorm: {},

  setDiscipline: (d) => set({ discipline: d }),

  setStandard: (s) => {
    if (s === 'Eurocode') { set({ standard: s, chapters: [] }); return; }
    set(state => buildChapterTree(state.rawChapterData, state.verifications, s, state));
  },

  // Norm innerhalb SIA wechseln — setzt normId sofort; API-Daten kommen via loadNormData
  setNormId: (id) => set(state => {
    // Wenn Daten gecacht: sofort anzeigen, sonst leer lassen (API-Reload folgt)
    const chapData = state.rawChapterDataByNorm[id] || [];
    const normVerifs = state._verifsByNorm[id] || [];
    const chapters = chapData.length > 0
      ? buildChapterTree(chapData, normVerifs, 'SIA', state).chapters
      : [];
    return {
      normId: id,
      standard: 'SIA',
      chapters,
      verifications: normVerifs.length > 0 ? normVerifs : state.verifications,
    };
  }),

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

  setActiveChapter: (id) => set({ activeChapterId: id }),
  setActiveVerification: (id) => set({ activeVerificationId: id }),

  updateVariableValue: (verificationId, variableId, value) =>
    set(state => ({
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
    })),

  updateComment: (verificationId, comment) =>
    set(state => ({
      verifications: state.verifications.map(v =>
        v.id === verificationId ? { ...v, comment } : v
      ),
    })),

  // Immer neue Instanz mit eindeutigem key — beliebig viele des gleichen Nachweises möglich
  addVerificationToPrint: (id) =>
    set(state => {
      const v = state.verifications.find(x => x.id === id);
      if (!v) return state;
      const key = `${id}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
      const snapshot: Verification = JSON.parse(JSON.stringify(v));
      return { printItems: [...state.printItems, { key, snapshot }] };
    }),

  removeVerificationFromPrint: (key) =>
    set(state => ({ printItems: state.printItems.filter(item => item.key !== key) })),

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
        return { node: { ...ch, verifications: ownVs, children: childResults.map(r => r.node), expanded: totalCount > 0 }, count: totalCount };
      };
      return { rawChapterData: data, rawChapterDataByNorm: newByNorm, chapters: roots.map(r => countAndAnnotate(r).node) };
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

      const mapped: Verification[] = (data || []).map((v: any) => {
        const existingV = existingVerifs.find(ev => ev.id === v.id);
        return {
          id: v.id,
          chapterId: v.chapter_id,
          title: v.title,
          computeExpr: v.compute_expr,
          graph_json: v.graph_json ?? null,
          comment: existingV?.comment || '',
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
              value: existingVar !== undefined ? existingVar.value : defaultVal,
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
      return { verifications: computed, _verifsByNorm };
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
