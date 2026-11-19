// Scheda personaggio (guida grafica del 18/11, prompt 2): figura intera di fronte, di tre quarti e di
// schiena, e sei espressioni in primo piano. Un fotogramma per personaggio, nell'ordine del copione:
// e' il riferimento obbligatorio, disegnato dallo stesso codice delle puntate (non puo' divergere).
import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ALTEZZA_TESTA, Omino } from "./Omino";
import { ANTRACITE, BIANCO, ORO, ROSSO, VERDE } from "./palette";
import { OSWALD } from "./font";
import type { Espressione, PropsPuntata, Vista } from "./tipi";

const ESPRESSIONI: [Espressione, string][] = [
  ["neutra", "NEUTRA"], ["felice", "FELICE"], ["arrabbiata", "ARRABBIATA"],
  ["determinata", "CONCENTRATA"], ["sorpresa", "SORPRESA"], ["delusa", "DELUSA"],
];
const VISTE: [Vista, string][] = [["fronte", "FRONTE"], ["tre_quarti", "TRE QUARTI"], ["schiena", "SCHIENA"]];
const PALETTE: [string, string][] = [[VERDE, "#176B43"], [ANTRACITE, "#111827"], [ORO, "#F5C542"], [BIANCO, "#F5F5F4"], [ROSSO, "#E53935"]];
const FONDO = "#E7E4DC";

const Etichetta: React.FC<{ x: number; y: number; testo: string; size?: number }> = ({ x, y, testo, size = 34 }) => (
  <div style={{ position: "absolute", left: x - 170, width: 340, top: y, textAlign: "center", fontFamily: OSWALD, fontWeight: 700,
    fontSize: size, letterSpacing: 3, color: ANTRACITE }}>{testo}</div>
);

export const Scheda: React.FC<PropsPuntata> = ({ personaggi }) => {
  const frame = useCurrentFrame();
  const p = personaggi[frame % Math.max(1, personaggi.length)];
  if (!p) return <AbsoluteFill style={{ background: FONDO }} />;
  const alt = p.stile.altezza ?? 1;
  const S = 1.3; // figure intere
  const Z = 1.4; // primi piani delle espressioni: testa intera coi capelli e un po' di collo
  const testaX = 7 * alt, testaY = -ALTEZZA_TESTA * alt; // centro della testa nella posa ferma di tre quarti
  const cella = (i: number) => ({ cx: 190 + (i % 3) * 350, cy: 1200 + Math.floor(i / 3) * 385 });
  return (
    <AbsoluteFill style={{ background: FONDO }}>
      <div style={{ position: "absolute", left: 60, right: 60, top: 56, display: "flex", alignItems: "flex-end", justifyContent: "space-between" }}>
        <div>
          <div style={{ fontFamily: OSWALD, fontWeight: 700, fontSize: 96, color: ANTRACITE, lineHeight: 1, textTransform: "uppercase" }}>
            {p.nome}{p.stile.numero ? <span style={{ color: VERDE }}>{` · ${p.stile.numero}`}</span> : null}
          </div>
          <div style={{ fontFamily: OSWALD, fontWeight: 500, fontSize: 38, color: ANTRACITE, opacity: 0.75, letterSpacing: 2, textTransform: "uppercase", marginTop: 8 }}>{p.ruolo}</div>
        </div>
        <div style={{ textAlign: "right", fontFamily: OSWALD, fontWeight: 700, fontSize: 30, color: ANTRACITE, letterSpacing: 2, lineHeight: 1.3 }}>
          STRADA PER LA <span style={{ color: ROSSO }}>10</span><br />SCHEDA PERSONAGGIO
        </div>
      </div>

      <svg viewBox="0 0 1080 1920" width={1080} height={1920} style={{ position: "absolute", inset: 0 }}>
        <line x1={60} y1={935} x2={1020} y2={935} stroke={ANTRACITE} strokeWidth={3} opacity={0.2} />
        {VISTE.map(([v], i) => (
          <g key={v} transform={`translate(${190 + i * 350} 930) scale(${S * alt})`}>
            <Omino p={p} posa="fermo" espr="neutra" t={1.7} tl={0} seme={0} verso={1} zoom={S * alt} vista={v} />
          </g>
        ))}
        {ESPRESSIONI.map(([e], i) => {
          const { cx, cy } = cella(i);
          const w = 320, h = 320;
          return (
            <g key={e}>
              <rect x={cx - w / 2} y={cy - 165} width={w} height={h} rx={24} fill={BIANCO} stroke={ANTRACITE} strokeWidth={4} />
              <svg x={cx - w / 2} y={cy - 165} width={w} height={h - 50}
                viewBox={`${testaX - w / 2 / Z} ${testaY - 110} ${w / Z} ${(h - 50) / Z}`} overflow="hidden">
                <g transform={`scale(${alt})`}>
                  <Omino p={p} posa="fermo" espr={e} t={1.7} tl={0} seme={0} verso={1} zoom={Z * alt} />
                </g>
              </svg>
            </g>
          );
        })}
      </svg>

      {VISTE.map(([v, nome], i) => <Etichetta key={v} x={190 + i * 350} y={950} testo={nome} />)}
      {ESPRESSIONI.map(([e, nome], i) => { const { cx, cy } = cella(i); return <Etichetta key={e} x={cx} y={cy + 106} testo={nome} size={30} />; })}

      <div style={{ position: "absolute", left: 60, right: 60, top: 1790, display: "flex", gap: 14 }}>
        {PALETTE.map(([c, codice]) => (
          <div key={codice} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
            <div style={{ width: "100%", height: 52, background: c, borderRadius: 10, border: `3px solid ${ANTRACITE}` }} />
            <div style={{ fontFamily: OSWALD, fontWeight: 500, fontSize: 24, color: ANTRACITE, letterSpacing: 1 }}>{codice}</div>
          </div>
        ))}
      </div>
    </AbsoluteFill>
  );
};
