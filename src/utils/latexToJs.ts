// ─── LaTeX → JavaScript-Ausdruck (best effort) ─────────────────────────────────
// Wandelt eine Anzeige-Formel in einen rechenbaren JS-Ausdruck um, damit der Nutzer
// die Rechnung nur einmal (als LaTeX) eingeben muss.
//
// Unterstützt: = (nimmt die rechte Seite), \leq/\geq-Schwanz wird entfernt,
// \cdot/\times → *, \frac{a}{b} → ((a)/(b)), \sqrt{x} → Math.sqrt(x),
// x^{n} / x^n → Math.pow(x,n), Indizes f_{m,k} → f_m_k, griechische Buchstaben.
//
// Grenzen: implizite Multiplikation (z.B. "2\alpha") wird NICHT erkannt — dort
// \cdot schreiben. Das JS-Feld bleibt editierbar für Sonderfälle.

const GREEK = ['alpha','beta','gamma','delta','epsilon','zeta','eta','theta','iota','kappa','lambda','mu','nu','xi','pi','rho','sigma','tau','upsilon','phi','chi','psi','omega'];

function readBrace(s: string, open: number): { inner: string; end: number } {
  let depth = 0;
  for (let i = open; i < s.length; i++) {
    if (s[i] === '{') depth++;
    else if (s[i] === '}') { depth--; if (depth === 0) return { inner: s.slice(open + 1, i), end: i }; }
  }
  return { inner: s.slice(open + 1), end: s.length };
}

function replaceFrac(s: string): string {
  let out = ''; let i = 0;
  while (i < s.length) {
    if (s.startsWith('\\frac', i)) {
      let j = i + 5; while (s[j] === ' ') j++;
      if (s[j] === '{') {
        const a = readBrace(s, j);
        let k = a.end + 1; while (s[k] === ' ') k++;
        if (s[k] === '{') {
          const b = readBrace(s, k);
          out += '((' + replaceFrac(a.inner) + ')/(' + replaceFrac(b.inner) + '))';
          i = b.end + 1; continue;
        }
      }
    }
    out += s[i]; i++;
  }
  return out;
}

function replaceCmdBrace(s: string, cmd: string, js: string): string {
  let out = ''; let i = 0; const tag = '\\' + cmd;
  while (i < s.length) {
    if (s.startsWith(tag, i)) {
      let j = i + tag.length; while (s[j] === ' ') j++;
      if (s[j] === '{') { const a = readBrace(s, j); out += js + '(' + a.inner + ')'; i = a.end + 1; continue; }
    }
    out += s[i]; i++;
  }
  return out;
}

function replaceCmdParen(s: string, cmd: string, js: string): string {
  let out = '';
  let i = 0;
  const tag = '\\' + cmd;
  while (i < s.length) {
    if (s.startsWith(tag, i)) {
      let j = i + tag.length;
      let power = ''; // Speichern von ^{...} oder ^n
      while (s[j] === ' ') j++;
      // Überspringen von ^{...} oder ^n (z.B. \sin^2 oder \sin^{2})
      if (s[j] === '^') {
        j++;
        while (s[j] === ' ') j++;
        let powerVal = '';
        if (s[j] === '{') {
          const b = readBrace(s, j);
          powerVal = b.inner;
          j = b.end + 1;
        } else {
          let k = j;
          while (k < s.length && /[\w.]/.test(s[k])) k++;
          powerVal = s.slice(j, k);
          j = k;
        }
        power = '**(' + powerVal + ')';
        while (s[j] === ' ') j++;
      }
      if (s[j] === '(') {
        let depth = 0;
        let replaced = false;
        for (let k = j; k < s.length; k++) {
          if (s[k] === '(') depth++;
          else if (s[k] === ')') {
            depth--;
            if (depth === 0) {
              out += '(' + js + '(' + s.slice(j + 1, k) + ')' + power + ')';
              i = k + 1;
              replaced = true;
              break;
            }
          }
        }
        if (replaced) continue;
      }
    }
    out += s[i];
    i++;
  }
  return out;
}

function convertSubscripts(s: string): string {
  // f_{m,k} → f_m_k ; q_{p0} → q_p0
  return s.replace(/_\{([^{}]*)\}/g, (_m, p1: string) => '_' + p1.trim().replace(/[,\s]+/g, '_'));
}

function convertPowers(s: string): string {
  let guard = 0;
  while (s.indexOf('^') >= 0 && guard++ < 200) {
    const idx = s.indexOf('^');
    // rechte Seite
    let r = idx + 1; while (s[r] === ' ') r++;
    let right: string; let rEnd: number;
    if (s[r] === '{') { const b = readBrace(s, r); right = b.inner; rEnd = b.end + 1; }
    else { let k = r; while (k < s.length && /[\w.]/.test(s[k])) k++; right = s.slice(r, k); rEnd = k; }
    // linke Seite
    let l = idx - 1; while (s[l] === ' ') l--;
    let left: string; let lStart: number;
    if (s[l] === ')' || s[l] === ']') {
      const close = s[l]; const open = close === ')' ? '(' : '[';
      let depth = 0; let k = l;
      for (; k >= 0; k--) { if (s[k] === close) depth++; else if (s[k] === open) { depth--; if (depth === 0) break; } }
      lStart = k;
      // eckige Klammern → runde, damit Math.pow-Argument gültiges JS ist
      left = close === ']' ? '(' + s.slice(k + 1, l) + ')' : s.slice(k, l + 1);
    } else {
      let k = l; while (k >= 0 && /[\w.]/.test(s[k])) k--; lStart = k + 1; left = s.slice(k + 1, l + 1);
    }
    s = s.slice(0, lStart) + '(' + left.trim() + ')**(' + right.trim() + ')' + s.slice(rEnd);
  }
  return s;
}

// Wandelt eine LaTeX-Ungleichung in einen JS-Ausdruck um, der 1 (wahr) oder 0 (falsch) zurückgibt.
// z.B. "\lambda_{\text{rel},m} \leq 0{,}75" → "(lambda_rel_m) <= (0.75) ? 1 : 0"
// Gibt '' zurück wenn keine Ungleichung erkannt.
function latexExprToJs(tex: string): string {
  if (!tex || !tex.trim()) return '';
  let s = tex;
  s = s.replace(/\\left|\\right/g, '');
  s = s.replace(/\\text\s*\{([^{}]*)\}/g, '$1');
  s = s.replace(/\{,\}/g, '.');
  s = s.replace(/(\d),(\d)/g, '$1.$2');        // 0,4 → 0.4 (deutsches Dezimalkomma)
  s = s.replace(/\\,|\\;|\\!|\\quad|\\qquad/g, ' ');
  s = s.replace(/\\cdot|\\times|\\ast/g, '*');
  s = s.replace(/\\pm\b/g, '±'); // ± bleibt erhalten → evalFormulaPM rechnet beide Vorzeichen
  s = replaceFrac(s);
  s = replaceCmdBrace(s, 'sqrt', 'Math.sqrt');
  s = replaceCmdBrace(s, 'log', 'Math.log10');
  s = replaceCmdParen(s, 'log', 'Math.log10');
  s = replaceCmdBrace(s, 'arcsin', 'Math.asin');
  s = replaceCmdParen(s, 'arcsin', 'Math.asin');
  s = replaceCmdBrace(s, 'arccos', 'Math.acos');
  s = replaceCmdParen(s, 'arccos', 'Math.acos');
  s = replaceCmdBrace(s, 'arctan', 'Math.atan');
  s = replaceCmdParen(s, 'arctan', 'Math.atan');
  s = replaceCmdBrace(s, 'atan', 'Math.atan');
  s = replaceCmdParen(s, 'atan', 'Math.atan');
  s = replaceCmdBrace(s, 'sin', 'Math.sin');
  s = replaceCmdParen(s, 'sin', 'Math.sin');
  s = replaceCmdBrace(s, 'cos', 'Math.cos');
  s = replaceCmdParen(s, 'cos', 'Math.cos');
  s = replaceCmdBrace(s, 'tan', 'Math.tan');
  s = replaceCmdParen(s, 'tan', 'Math.tan');
  for (const g of GREEK) {
    s = s.replace(new RegExp('\\\\' + g + '(?=\\b|_|\\{|$)', 'g'), g);
    s = s.replace(new RegExp('\\\\' + g[0].toUpperCase() + g.slice(1) + '(?=\\b|_|\\{|$)', 'g'), g);
  }
  s = convertSubscripts(s);
  s = s.replace(/([A-Za-z][A-Za-z0-9_]*)_([A-Za-z0-9]+)\.([A-Za-z0-9_]+)/g, '$1_$2_$3');
  s = convertPowers(s);
  s = s.replace(/\\[a-zA-Z]+/g, '');
  s = s.replace(/[{}]/g, '');
  // Primes (q' → q, q'' → q) — Apostroph ist kein gültiger JS-Identifier-Bestandteil
  s = s.replace(/([A-Za-z0-9_])'+/g, '$1');
  s = s.replace(/\s+/g, ' ').trim();
  return s;
}

const INEQ_OPS = [
  { re: /\\leqslant\b|\\leq\b|\\le\b/, js: '<=' },
  { re: /\\geqslant\b|\\geq\b|\\ge\b/, js: '>=' },
  { re: /<(?!=)/, js: '<' },
  { re: />(?!=)/, js: '>' },
];

export function latexCondToJs(tex: string): string {
  if (!tex?.trim()) return '';
  let s = tex.trim()
    .replace(/\\text\s*\{([^{}]*)\}/g, '$1')
    .replace(/\\left|\\right/g, '');

  // Alle Ungleichungs-Operatoren + ihre Positionen finden
  type IneqMatch = { idx: number; len: number; op: string };
  const found: IneqMatch[] = [];
  for (const { re, js: jsOp } of INEQ_OPS) {
    const globalRe = new RegExp(re.source, 'g');
    let m: RegExpExecArray | null;
    while ((m = globalRe.exec(s)) !== null) {
      found.push({ idx: m.index, len: m[0].length, op: jsOp });
    }
  }
  if (found.length === 0) return '';
  found.sort((a, b) => a.idx - b.idx);

  // Verkettete Ungleichung: a < b < c → (a) < (b) && (b) < (c)
  if (found.length >= 2) {
    const parts: string[] = [];
    const boundaries = [0, ...found.map(f => f.idx), ...found.map(f => f.idx + f.len), s.length];
    // Segmente extrahieren: vor Op1, zwischen Op1 und Op2, nach Op2
    let prev = 0;
    const segments: string[] = [];
    for (const f of found) {
      segments.push(s.slice(prev, f.idx).trim());
      prev = f.idx + f.len;
    }
    segments.push(s.slice(prev).trim());
    for (let i = 0; i < found.length; i++) {
      const lhsJs = latexExprToJs(segments[i]);
      const rhsJs = latexExprToJs(segments[i + 1]);
      if (lhsJs && rhsJs) parts.push(`(${lhsJs}) ${found[i].op} (${rhsJs})`);
    }
    if (parts.length > 0) return parts.join(' && ') + ' ? 1 : 0';
  }

  // Einzelne Ungleichung
  const f = found[0];
  const lhsJs = latexExprToJs(s.slice(0, f.idx).trim());
  const rhsJs = latexExprToJs(s.slice(f.idx + f.len).trim());
  if (!lhsJs || !rhsJs) return '';
  return `(${lhsJs}) ${f.op} (${rhsJs}) ? 1 : 0`;
}

// Erkennt ob ein LaTeX-String eine Ungleichung enthält
export function latexHasIneq(tex: string): boolean {
  if (!tex?.trim()) return false;
  return /\\leq|\\leqslant|\\le\b|\\geq|\\geqslant|\\ge\b|<|>/.test(tex);
}

export function latexToJs(tex: string): string {
  if (!tex || !tex.trim()) return '';
  let s = tex;
  // rechte Seite der letzten Gleichung zuerst nehmen
  if (s.includes('=')) { const parts = s.split('='); s = parts[parts.length - 1]; }
  // \geq minExpr am Ende → Math.max(convert(minExpr), result) — Untergrenze (Mindestwert)
  // \leq maxExpr am Ende → Math.min(convert(maxExpr), result) — Obergrenze (Kappung)
  let geqLatex = '';
  let leqLatex = '';
  {
    // Reihenfolge: erst \geq suchen (kann vor \leq stehen), dann \leq
    const geqM = s.match(/\\(?:geq|geqslant|ge)\b\s*([\s\S]+?)(?=\\leq|\\leqslant|\\le\b|\\geq|\\approx|\s*$)/);
    if (geqM) geqLatex = geqM[1].trim();
    const leqM = s.match(/\\(?:leq|leqslant|le)\b\s*([\s\S]+?)(?=\\geq|\\geqslant|\\ge\b|\\approx|\s*$)/);
    if (leqM) leqLatex = leqM[1].trim();
    // Rückwärts-Kompatibilität: alte numerische \geq-Behandlung beibehalten
    if (!geqLatex) {
      const old = s.match(/\\(?:geq|geqslant|ge)\b\s*([\s\S]+?)(?:\\leq|\\geq|\\approx|\s*$)/);
      if (old) {
        let t = old[1].trim().replace(/\\,|\\;|\\!/g, '').replace(/\{,\}/g, '.').replace(/,(?=\d)/g, '.');
        t = t.replace(/\\[a-zA-Z]+/g, '').replace(/[{}]/g, '').trim();
        if (/^[\d.]+$/.test(t)) geqLatex = t;
      }
    }
  }
  // Ungleichungs-Schwanz entfernen
  s = s.replace(/\\(leq|geq|le|ge|approx|neq|leqslant|geqslant)\b[\s\S]*$/, '');
  s = s.replace(/\\left|\\right/g, '');
  s = s.replace(/\\text\s*\{([^{}]*)\}/g, '$1'); // \text{crit} → crit (reiner Anzeige-Befehl)
  s = s.replace(/\{,\}/g, '.');                 // 1{,}6 → 1.6
  s = s.replace(/(\d),(\d)/g, '$1.$2');        // 0,4 → 0.4 (deutsches Dezimalkomma ohne Klammern)
  s = s.replace(/\\,|\\;|\\!|\\quad|\\qquad/g, ' ');
  s = s.replace(/\\cdot|\\times|\\ast/g, '*');
  s = s.replace(/\\pm\b/g, '±'); // ± bleibt erhalten → evalFormulaPM rechnet beide Vorzeichen
  s = replaceFrac(s);
  s = replaceCmdBrace(s, 'sqrt', 'Math.sqrt');
  s = replaceCmdBrace(s, 'log', 'Math.log10');
  s = replaceCmdParen(s, 'log', 'Math.log10');
  s = replaceCmdBrace(s, 'arcsin', 'Math.asin');
  s = replaceCmdParen(s, 'arcsin', 'Math.asin');
  s = replaceCmdBrace(s, 'arccos', 'Math.acos');
  s = replaceCmdParen(s, 'arccos', 'Math.acos');
  s = replaceCmdBrace(s, 'arctan', 'Math.atan');
  s = replaceCmdParen(s, 'arctan', 'Math.atan');
  s = replaceCmdBrace(s, 'atan', 'Math.atan');
  s = replaceCmdParen(s, 'atan', 'Math.atan');
  s = replaceCmdBrace(s, 'sin', 'Math.sin');
  s = replaceCmdParen(s, 'sin', 'Math.sin');
  s = replaceCmdBrace(s, 'cos', 'Math.cos');
  s = replaceCmdParen(s, 'cos', 'Math.cos');
  s = replaceCmdBrace(s, 'tan', 'Math.tan');
  s = replaceCmdParen(s, 'tan', 'Math.tan');
  for (const g of GREEK) {
    s = s.replace(new RegExp('\\\\' + g + '(?=\\b|_|\\{|$)', 'g'), g);
    s = s.replace(new RegExp('\\\\' + g[0].toUpperCase() + g.slice(1) + '(?=\\b|_|\\{|$)', 'g'), g);
  }
  s = convertSubscripts(s);
  // Variable names like E_0.05 can appear when a decimal comma was used in a
  // subscript. JavaScript would read that as property access, so keep it a name.
  s = s.replace(/([A-Za-z][A-Za-z0-9_]*)_([A-Za-z0-9]+)\.([A-Za-z0-9_]+)/g, '$1_$2_$3');
  s = convertPowers(s);
  // \min/\max mit \begin{cases}...\end{cases}: Fälle durch \\ getrennt → Math.min(a, b, c)
  s = s.replace(/\\(min|max)\s*\\begin\{cases\}([\s\S]*?)\\end\{cases\}/g, (_m, fn: string, body: string) => {
    const args = body.split(/\\\\/).map((a: string) => a.trim()).filter(Boolean);
    return `Math.${fn}(${args.join(', ')})`;
  });
  // \min(...) / \max(...) → Math.min(...) / Math.max(...)
  s = s.replace(/\\(min|max)\b/g, 'Math.$1');
  s = s.replace(/\\[a-zA-Z]+/g, '');            // übrige Befehle
  s = s.replace(/[{}]/g, '');
  s = s.replace(/([A-Za-z0-9_])'+/g, '$1');    // q' → q (Prime kein gültiger JS-Identifier)
  // Umlaute transliterieren damit JS-Bezeichner ASCII-clean bleiben (ö→oe, ä→ae, ü→ue)
  s = s.replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue')
       .replace(/Ä/g, 'Ae').replace(/Ö/g, 'Oe').replace(/Ü/g, 'Ue')
       .replace(/ß/g, 'ss');
  s = s.replace(/\s+/g, ' ').trim();
  // \geq → Math.max(minJs, result) — Untergrenze
  if (geqLatex) {
    const minJs = latexExprToJs(geqLatex);
    if (minJs) s = `Math.max(${minJs}, ${s})`;
  }
  // \leq → Math.min(maxJs, result) — Obergrenze (Kappung)
  if (leqLatex) {
    const maxJs = latexExprToJs(leqLatex);
    if (maxJs) s = `Math.min(${maxJs}, ${s})`;
  }
  return s;
}
