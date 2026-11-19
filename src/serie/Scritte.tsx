// Scritta a pezzi (guida grafica del 18/11): Oswald bold maiuscolo, bianco caldo con contorno nero
// netto, parole chiave in oro, al massimo due righe, sempre nella stessa posizione. Il fondo della
// scritta e' fisso a y=1420, appena dentro la zona sicura (sotto y=1440 c'e' l'interfaccia): cosi' nei
// primi piani resta sotto il numero di maglia (prima «SIEDITI» sopra il 10 si leggeva «SIEDIT10»).
import React from "react";
import { interpolate } from "remotion";
import { OSWALD } from "./font";
import { ANTRACITE, BIANCO, ORO } from "./palette";
import type { Pezzo } from "./tipi";

export const GIALLO = ORO;

/** testo con contorno esterno: sotto una copia col tratto spesso, sopra il riempimento pulito
 *  (il tratto del browser e' centrato e assottiglierebbe le lettere) */
export const ConContorno: React.FC<{ testo: string; colore: string; spessore: number; ombra?: boolean; style?: React.CSSProperties }> = ({ testo, colore, spessore, ombra = true, style }) => (
  <span style={{ position: "relative", display: "inline-block", ...style }}>
    <span aria-hidden style={{ position: "absolute", left: 0, top: 0, color: ANTRACITE, WebkitTextStroke: `${spessore * 2}px ${ANTRACITE}`,
      textShadow: ombra ? `0 ${spessore * 0.9}px 0 rgba(0,0,0,.45)` : undefined }}>{testo}</span>
    <span style={{ position: "relative", color: colore }}>{testo}</span>
  </span>
);

export const Scritte: React.FC<{ pezzo: Pezzo | undefined; t: number }> = ({ pezzo, t }) => {
  if (!pezzo) return null;
  const k = interpolate(t, [pezzo.da, pezzo.da + 0.12], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const lunghe = pezzo.parole.reduce((n, p) => n + p.w.length, 0) > 20;
  return (
    <div style={{
      position: "absolute", left: 90, right: 240, bottom: 1920 - 1420, display: "flex", flexWrap: "wrap", justifyContent: "center",
      alignContent: "flex-end", gap: "0 24px", transform: `scale(${0.92 + 0.08 * k})`, opacity: k, transformOrigin: "50% 100%",
    }}>
      {pezzo.parole.map((p, i) => (
        <ConContorno key={i} testo={p.w} colore={p.chiave ? ORO : BIANCO} spessore={7} style={{
          fontFamily: OSWALD, fontWeight: 700, fontSize: lunghe ? 74 : 86, lineHeight: 1.12, letterSpacing: 1.5, textTransform: "uppercase",
        }} />
      ))}
    </div>
  );
};
