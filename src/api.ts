const BASE = '/api';

const parse = async (r: Response) => {
  const text = await r.text();
  let data: any = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { error: text.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim() };
  }
  if (!r.ok) throw new Error(data?.error || `HTTP ${r.status}`);
  return data;
};
const get  = (path: string) => fetch(BASE + path).then(parse);
const post = (path: string, body: object) => fetch(BASE + path, { method: 'POST',   headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }).then(parse);
const put  = (path: string, body: object) => fetch(BASE + path, { method: 'PUT',    headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }).then(parse);
const del  = (path: string)               => fetch(BASE + path, { method: 'DELETE' }).then(parse);

export const api = {
  // Normen
  getNorms: () => get('/norms'),
  createNorm: (data: object) => post('/norms', data),

  // Kapitel (norm-gefiltert)
  getChapters:    (norm = 'sia265') => get(`/chapters?norm=${norm}`),
  createChapter:  (data: object) => post('/chapters', data),
  updateChapter:  (id: string, data: object) => put(`/chapters/${id}`, data),
  deleteChapter:  (id: string) => del(`/chapters/${id}`),

  // Nachweise (norm-gefiltert)
  getVerifications:    (norm = 'sia265') => get(`/verifications?norm=${norm}`),
  getVerification:     (id: string) => get(`/verifications/${id}`),
  createVerification:  (data: object) => post('/verifications', data),
  updateVerification:  (id: string, data: object) => put(`/verifications/${id}`, data),
  deleteVerification:  (id: string) => del(`/verifications/${id}`),

  // Variablen
  getVariables:    (vid: string) => get(`/verifications/${vid}/variables`),
  createVariable:  (vid: string, data: object) => post(`/verifications/${vid}/variables`, data),
  updateVariable:  (id: string, data: object) => put(`/variables/${id}`, data),
  deleteVariable:  (id: string) => del(`/variables/${id}`),

  // Holzarten/-klassen
  getWoodTypes:    () => get('/wood-types'),
  createWoodType:  (data: object) => post('/wood-types', data),
  updateWoodType:  (id: string, data: object) => put(`/wood-types/${id}`, data),
  deleteWoodType:  (id: string) => del(`/wood-types/${id}`),

  getWoodClasses:  () => get('/wood-classes'),
  createWoodClass: (data: object) => post('/wood-classes', data),
  updateWoodClass: (id: string, data: object) => put(`/wood-classes/${id}`, data),
  deleteWoodClass: (id: string) => del(`/wood-classes/${id}`),

  // Datenbank-Tabellen (norm-gefiltert)
  getDbTables:     (norm?: string) => get(`/db-tables${norm ? `?norm=${norm}` : ''}`),
  getDbTableFull:  (id: string) => get(`/db-tables/${id}`),
  createDbTable:   (data: object) => post('/db-tables', data),
  updateDbTable:   (id: string, data: object) => put(`/db-tables/${id}`, data),
  deleteDbTable:   (id: string) => del(`/db-tables/${id}`),

  // Einheiten (global)
  getUnits:    () => get('/units'),
  createUnit:  (data: object) => post('/units', data),
  updateUnit:  (id: number, data: object) => put(`/units/${id}`, data),
  deleteUnit:  (id: number) => del(`/units/${id}`),

};
