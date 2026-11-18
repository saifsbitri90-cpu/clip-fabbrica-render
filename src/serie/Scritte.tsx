// Scritta a pezzi: compare una frase breve alla volta, in maiuscolo, nel terzo basso dello schermo,
// con la parola chiave colorata. Sta lontana dai pulsanti di TikTok (destra) e dalla didascalia (basso).
import React from "react";
import { interpolate } from "remotion";
import { OSWALD } from "./font";
import type { Pezzo } from "./tipi";

export const GIALLO = "#FFC53D";

export const Scritte: React.FC<{ pezzo: Pezzo | undefined; t: number }> = ({ pezzo, t }) => {
  if (!pezzo) return null;
  const k = interpolate(t, [pezzo.da, pezzo.da + 0.12], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const lunghe = pezzo.parole.reduce((n, p) => n + p.w.length, 0) > 22;
  return (
    <div style={{
      position: "absolute", left: 120, right: 140, top: 1250, display: "flex", flexWrap: "wrap", justifyContent: "center",
      gap: "0 22px", transform: `scale(${0.9 + 0.1 * k})`, opacity: k, transformOrigin: "50% 50%",
    }}>
      {pezzo.parole.map((p, i) => (
        <span key={i} style={{
          fontFamily: OSWALD, fontWeight: 700, fontSize: lunghe ? 76 : 90, lineHeight: 1.08, letterSpacing: 1,
          textTransform: "uppercase", color: p.chiave ? GIALLO : "#FFFFFF",
          textShadow: "0 5px 0 rgba(0,0,0,.55), 0 0 22px rgba(0,0,0,.55), 0 0 4px rgba(0,0,0,.8)",
        }}>{p.w}</span>
      ))}
    </div>
  );
};
