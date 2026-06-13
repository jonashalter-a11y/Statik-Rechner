const fs = require('fs');
const path = require('path');

const LIBRARY_ROOT = path.join(__dirname, 'block-library');

function slugify(value) {
  const slug = String(value || 'vorlage')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 80);
  return slug || 'vorlage';
}

function ensureRoot() {
  fs.mkdirSync(LIBRARY_ROOT, { recursive: true });
}

function templatePath(id) {
  return path.join(LIBRARY_ROOT, `${slugify(id)}.json`);
}

function readTemplate(id) {
  const filePath = templatePath(id);
  if (!fs.existsSync(filePath)) return null;
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function listTemplates() {
  ensureRoot();
  return fs.readdirSync(LIBRARY_ROOT)
    .filter(file => file.endsWith('.json'))
    .map(file => {
      const payload = JSON.parse(fs.readFileSync(path.join(LIBRARY_ROOT, file), 'utf8'));
      return {
        id: payload.id,
        name: payload.name,
        description: payload.description || '',
        node_count: payload.graph?.nodes?.length || 0,
        edge_count: payload.graph?.edges?.length || 0,
        updated_at: payload.updated_at || payload.created_at || '',
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name, 'de'));
}

function saveTemplate(input) {
  ensureRoot();
  const now = new Date().toISOString();
  const id = slugify(input.id || input.name);
  if (!id) throw new Error('Vorlagen-ID ist ungültig');
  if (!input.graph || !Array.isArray(input.graph.nodes) || !Array.isArray(input.graph.edges)) {
    throw new Error('Vorlage braucht einen Graph mit nodes und edges');
  }

  const existing = readTemplate(id);
  const payload = {
    version: 1,
    id,
    name: input.name || id,
    description: input.description || '',
    graph: input.graph,
    created_at: existing?.created_at || now,
    updated_at: now,
  };
  fs.writeFileSync(templatePath(id), `${JSON.stringify(payload, null, 2)}\n`);
  return payload;
}

function deleteTemplate(id) {
  const filePath = templatePath(id);
  if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
}

module.exports = {
  LIBRARY_ROOT,
  deleteTemplate,
  listTemplates,
  readTemplate,
  saveTemplate,
};
