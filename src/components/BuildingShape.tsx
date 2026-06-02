import React from 'react';

// Einfache SVG-Skizzen für Gebäudeformen (Wind Anhang C SIA 261)
// Zeigt Windrichtung θ=0° mit beschrifteten Flächen A (Luv), B (Lee), C (Seite), Dach

const shapes: Record<string, React.ReactNode> = {
  flachdach_niedrig: (
    <svg viewBox="0 0 220 130" style={{ width: '100%', maxWidth: 260 }}>
      {/* Gebäude */}
      <rect x="40" y="40" width="140" height="60" fill="#dbeafe" stroke="#1d4ed8" strokeWidth="1.5"/>
      {/* Dach (Flachdach) */}
      <rect x="40" y="30" width="140" height="10" fill="#bfdbfe" stroke="#1d4ed8" strokeWidth="1.5"/>
      {/* Flächen-Labels */}
      <text x="55" y="75" fontSize="11" fontWeight="bold" fill="#1e40af">A</text>
      <text x="148" y="75" fontSize="11" fontWeight="bold" fill="#1e40af">B</text>
      <text x="104" y="25" fontSize="11" fontWeight="bold" fill="#7c3aed">Dach</text>
      {/* Wind-Pfeil */}
      <defs>
        <marker id="arr" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
          <path d="M0,0 L0,6 L8,3 z" fill="#2563eb"/>
        </marker>
      </defs>
      <line x1="5" y1="70" x2="38" y2="70" stroke="#2563eb" strokeWidth="2" markerEnd="url(#arr)"/>
      <text x="2" y="60" fontSize="9" fill="#2563eb">Wind</text>
      <text x="2" y="68" fontSize="9" fill="#2563eb">θ=0°</text>
      {/* Abmessungen */}
      <text x="90" y="120" fontSize="9" fill="#6b7280">h/b ≤ 0.3</text>
      <line x1="40" y1="110" x2="180" y2="110" stroke="#9ca3af" strokeWidth="0.8"/>
      <text x="100" y="118" fontSize="8" fill="#9ca3af">b</text>
    </svg>
  ),

  flachdach_mitte: (
    <svg viewBox="0 0 220 160" style={{ width: '100%', maxWidth: 260 }}>
      <rect x="60" y="30" width="100" height="100" fill="#dbeafe" stroke="#1d4ed8" strokeWidth="1.5"/>
      <rect x="60" y="20" width="100" height="10" fill="#bfdbfe" stroke="#1d4ed8" strokeWidth="1.5"/>
      <text x="70" y="85" fontSize="11" fontWeight="bold" fill="#1e40af">A</text>
      <text x="142" y="85" fontSize="11" fontWeight="bold" fill="#1e40af">B</text>
      <text x="100" y="15" fontSize="11" fontWeight="bold" fill="#7c3aed">Dach</text>
      <defs><marker id="arr2" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0,0 L0,6 L8,3 z" fill="#2563eb"/></marker></defs>
      <line x1="5" y1="80" x2="58" y2="80" stroke="#2563eb" strokeWidth="2" markerEnd="url(#arr2)"/>
      <text x="2" y="70" fontSize="9" fill="#2563eb">Wind</text>
      <text x="2" y="78" fontSize="9" fill="#2563eb">θ=0°</text>
      <text x="85" y="148" fontSize="9" fill="#6b7280">h/b = 1</text>
    </svg>
  ),

  flachdach_hoch: (
    <svg viewBox="0 0 220 200" style={{ width: '100%', maxWidth: 260 }}>
      <rect x="80" y="20" width="60" height="150" fill="#dbeafe" stroke="#1d4ed8" strokeWidth="1.5"/>
      <rect x="80" y="10" width="60" height="10" fill="#bfdbfe" stroke="#1d4ed8" strokeWidth="1.5"/>
      <text x="88" y="100" fontSize="11" fontWeight="bold" fill="#1e40af">A</text>
      <text x="122" y="100" fontSize="11" fontWeight="bold" fill="#1e40af">B</text>
      <text x="95" y="8" fontSize="11" fontWeight="bold" fill="#7c3aed">Dach</text>
      <defs><marker id="arr3" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0,0 L0,6 L8,3 z" fill="#2563eb"/></marker></defs>
      <line x1="5" y1="95" x2="78" y2="95" stroke="#2563eb" strokeWidth="2" markerEnd="url(#arr3)"/>
      <text x="2" y="85" fontSize="9" fill="#2563eb">Wind</text>
      <text x="2" y="93" fontSize="9" fill="#2563eb">θ=0°</text>
      <text x="85" y="185" fontSize="9" fill="#6b7280">h/b = 3</text>
    </svg>
  ),

  satteldach: (
    <svg viewBox="0 0 240 150" style={{ width: '100%', maxWidth: 280 }}>
      {/* Wände */}
      <rect x="40" y="70" width="160" height="60" fill="#dbeafe" stroke="#1d4ed8" strokeWidth="1.5"/>
      {/* Dach */}
      <polygon points="40,70 120,25 200,70" fill="#bfdbfe" stroke="#1d4ed8" strokeWidth="1.5"/>
      {/* Firstlinie */}
      <line x1="120" y1="25" x2="120" y2="70" stroke="#1d4ed8" strokeWidth="0.8" strokeDasharray="3,3"/>
      {/* Labels */}
      <text x="52" y="105" fontSize="11" fontWeight="bold" fill="#1e40af">A</text>
      <text x="168" y="105" fontSize="11" fontWeight="bold" fill="#1e40af">B</text>
      <text x="72" y="52" fontSize="10" fontWeight="bold" fill="#7c3aed">D (luv)</text>
      <text x="130" y="52" fontSize="10" fontWeight="bold" fill="#7c3aed">E (lee)</text>
      {/* Wind */}
      <defs><marker id="arr4" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0,0 L0,6 L8,3 z" fill="#2563eb"/></marker></defs>
      <line x1="5" y1="100" x2="38" y2="100" stroke="#2563eb" strokeWidth="2" markerEnd="url(#arr4)"/>
      <text x="2" y="90" fontSize="9" fill="#2563eb">Wind</text>
      <text x="2" y="98" fontSize="9" fill="#2563eb">θ=0°</text>
      {/* Neigungswinkel */}
      <text x="50" y="68" fontSize="9" fill="#6b7280">α=30°</text>
    </svg>
  ),

  satteldach_hoch: (
    <svg viewBox="0 0 240 180" style={{ width: '100%', maxWidth: 280 }}>
      <rect x="70" y="80" width="100" height="80" fill="#dbeafe" stroke="#1d4ed8" strokeWidth="1.5"/>
      <polygon points="70,80 120,30 170,80" fill="#bfdbfe" stroke="#1d4ed8" strokeWidth="1.5"/>
      <text x="80" y="125" fontSize="11" fontWeight="bold" fill="#1e40af">A</text>
      <text x="148" y="125" fontSize="11" fontWeight="bold" fill="#1e40af">B</text>
      <text x="88" y="58" fontSize="10" fontWeight="bold" fill="#7c3aed">Dach</text>
      <defs><marker id="arr5" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0,0 L0,6 L8,3 z" fill="#2563eb"/></marker></defs>
      <line x1="5" y1="120" x2="68" y2="120" stroke="#2563eb" strokeWidth="2" markerEnd="url(#arr5)"/>
      <text x="2" y="110" fontSize="9" fill="#2563eb">Wind</text>
      <text x="2" y="118" fontSize="9" fill="#2563eb">θ=0°</text>
      <text x="80" y="170" fontSize="9" fill="#6b7280">h/b = 2, α=30°</text>
    </svg>
  ),

  pultdach: (
    <svg viewBox="0 0 240 150" style={{ width: '100%', maxWidth: 280 }}>
      {/* Wände */}
      <rect x="40" y="80" width="160" height="50" fill="#dbeafe" stroke="#1d4ed8" strokeWidth="1.5"/>
      {/* Pultdach */}
      <polygon points="40,80 40,45 200,80" fill="#bfdbfe" stroke="#1d4ed8" strokeWidth="1.5"/>
      {/* Dachfläche F */}
      <text x="90" y="68" fontSize="10" fontWeight="bold" fill="#7c3aed">F Dach</text>
      <text x="52" y="108" fontSize="11" fontWeight="bold" fill="#1e40af">A (hoch)</text>
      <text x="162" y="108" fontSize="11" fontWeight="bold" fill="#1e40af">B</text>
      <defs><marker id="arr6" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0,0 L0,6 L8,3 z" fill="#2563eb"/></marker></defs>
      <line x1="5" y1="100" x2="38" y2="100" stroke="#2563eb" strokeWidth="2" markerEnd="url(#arr6)"/>
      <text x="2" y="90" fontSize="9" fill="#2563eb">Wind</text>
      <text x="2" y="98" fontSize="9" fill="#2563eb">θ=0°</text>
      <text x="50" y="80" fontSize="9" fill="#6b7280">α=30°</text>
    </svg>
  ),
};

export default function BuildingShape({ shapeKey }: { shapeKey: string }) {
  const shape = shapes[shapeKey];
  if (!shape) return null;
  return (
    <div style={{
      background: '#f8fafc', border: '1px solid #e5e7eb',
      borderRadius: 8, padding: 12, marginBottom: 12,
    }}>
      <div style={{ fontSize: 10, color: '#6b7280', fontWeight: 600, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        Gebäudeskizze (SIA 261 Anh. C)
      </div>
      {shape}
    </div>
  );
}
