const greekMap: Record<string, string> = {
  alpha: '\\alpha', beta: '\\beta', gamma: '\\gamma', delta: '\\delta',
  epsilon: '\\epsilon', zeta: '\\zeta', eta: '\\eta', theta: '\\theta',
  iota: '\\iota', kappa: '\\kappa', lambda: '\\lambda', mu: '\\mu',
  nu: '\\nu', xi: '\\xi', pi: '\\pi', rho: '\\rho',
  sigma: '\\sigma', tau: '\\tau', upsilon: '\\upsilon', phi: '\\phi',
  chi: '\\chi', psi: '\\psi', omega: '\\omega',
  Alpha: '\\Alpha', Beta: '\\Beta', Gamma: '\\Gamma', Delta: '\\Delta',
  Sigma: '\\Sigma', Omega: '\\Omega', Phi: '\\Phi', Psi: '\\Psi',
};

// Convert variable name like "f_m_k" -> LaTeX "f_{m,k}"
// Handles greek letters: "gamma_M" -> "\gamma_{M}"
export function nameToLatex(name: string): string {
  const parts = name.split('_');
  if (parts.length === 0) return name;

  let base = parts[0];
  const subs = parts.slice(1);

  // Replace greek in base
  base = greekMap[base] ?? base;

  // Replace greek in subscripts
  const subLatex = subs
    .map(s => greekMap[s] ?? s)
    .join(',');

  if (subLatex) return `${base}_{${subLatex}}`;
  return base;
}

// Format for display (HTML version - simple)
export function nameToDisplay(name: string): string {
  return nameToLatex(name);
}
