// Cartelli che spiegano senza animare: badge del giorno, contatore, tabellone, notifica sul telefono,
// cartellino col nome, scelta A/B finale. Entrano a molla e restano fermi e leggibili.
import React from "react";
import { interpolate, spring } from "remotion";
import { INTER, OSWALD } from "./font";
import { GIALLO } from "./Scritte";

const ROSSO = "#D7372C";
const ombraTesto = "0 4px 0 rgba(0,0,0,.45), 0 0 18px rgba(0,0,0,.45)";
const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

const molla = (tl: number, fps: number, ritardo = 0) =>
  spring({ frame: Math.round((tl - ritardo) * fps), fps, config: { damping: 13, stiffness: 170, mass: 0.7 } });

/** badge del giorno: grande al centro nei primi 2 secondi, poi piccolo in alto per tutta la puntata */
export const Badge: React.FC<{ testo: string; t: number; fps: number }> = ({ testo, t, fps }) => {
  const [giorno, ...resto] = testo.split("·").map((s) => s.trim());
  const titolo = resto.join(" · ");
  const m = interpolate(t, [2.0, 2.45], [0, 1], clamp);
  const entra = molla(t, fps, 0.05);
  if (m < 1) {
    return (
      <div style={{ position: "absolute", left: 0, right: 0, top: interpolate(m, [0, 1], [430, 170]), display: "flex", flexDirection: "column",
        alignItems: "center", gap: 6, transform: `scale(${interpolate(m, [0, 1], [1, 0.5]) * entra})`, opacity: 1 - m }}>
        {titolo && <div style={{ background: ROSSO, color: "#fff", fontFamily: OSWALD, fontWeight: 700, fontSize: 52, letterSpacing: 3,
          padding: "8px 26px", borderRadius: 8, boxShadow: "0 8px 24px rgba(0,0,0,.35)" }}>{titolo}</div>}
        <div style={{ color: "#fff", fontFamily: OSWALD, fontWeight: 700, fontSize: 190, lineHeight: 1, letterSpacing: 2, textShadow: ombraTesto }}>{giorno}</div>
      </div>
    );
  }
  return (
    <div style={{ position: "absolute", left: 0, right: 0, top: 170, display: "flex", justifyContent: "center" }}>
      <div style={{ background: ROSSO, color: "#fff", fontFamily: OSWALD, fontWeight: 700, fontSize: 40, letterSpacing: 2,
        padding: "6px 20px", borderRadius: 7, boxShadow: "0 6px 18px rgba(0,0,0,.35)" }}>{testo}</div>
    </div>
  );
};

/** il numero sale da 0 al valore, se è un numero */
const conta = (valore: string, tl: number) => {
  const n = Number(valore.replace(",", "."));
  if (!Number.isFinite(n) || n === 0 || !/^\d+([.,]\d+)?$/.test(valore.trim())) return valore;
  return String(Math.round(n * interpolate(tl, [0.25, 0.9], [0, 1], clamp)));
};

export const Contatore: React.FC<{ testo: string; valore: string; tl: number; fps: number }> = ({ testo, valore, tl, fps }) => {
  const k = molla(tl, fps, 0.1);
  return (
    <div style={{ position: "absolute", left: 0, right: 0, top: 360, display: "flex", justifyContent: "center", transform: `scale(${k})`, opacity: k }}>
      <div style={{ background: "#F4F1EA", borderRadius: 26, padding: "26px 54px 18px", minWidth: 420, display: "flex", flexDirection: "column",
        alignItems: "center", boxShadow: "0 18px 44px rgba(0,0,0,.4)", borderTop: `10px solid ${ROSSO}` }}>
        <div style={{ fontFamily: OSWALD, fontWeight: 500, fontSize: 44, letterSpacing: 4, color: "#4A4F57", textTransform: "uppercase" }}>{testo}</div>
        <div style={{ fontFamily: OSWALD, fontWeight: 700, fontSize: 200, lineHeight: 1.02, color: "#16191E", fontVariantNumeric: "tabular-nums" }}>{conta(valore, tl)}</div>
      </div>
    </div>
  );
};

export const Tabellone: React.FC<{ testo: string; valore: string; tl: number; fps: number }> = ({ testo, valore, tl, fps }) => {
  const k = molla(tl, fps, 0.08);
  const tutto = `${testo} ${valore}`;
  const minuto = /(\d{1,3})\s*['’°]/.exec(tutto)?.[1] ?? /\b(\d{1,3})\s*(?:minuto|min)\b/i.exec(tutto)?.[1];
  const ris = /(\d+)\s*[-–:]\s*(\d+)/.exec(valore) ?? /(\d+)\s*[-–:]\s*(\d+)/.exec(testo);
  let squadre = testo.replace(/(\d{1,3})\s*['’°]/, "").replace(/(\d+)\s*[-–:]\s*(\d+)/, "").replace(/minuto|min\b/i, "").trim();
  const nomi = squadre.split(/\s+(?:vs|-|–)\s+/i).map((s) => s.trim()).filter(Boolean);
  const [casa, ospiti] = nomi.length === 2 ? nomi : ["CASA", "OSPITI"];
  squadre = "";
  return (
    <div style={{ position: "absolute", left: 0, right: 0, top: 360, display: "flex", justifyContent: "center", transform: `scale(${k})`, opacity: k }}>
      <div style={{ background: "#12161D", borderRadius: 22, padding: "22px 34px", display: "flex", alignItems: "center", gap: 30,
        boxShadow: "0 18px 44px rgba(0,0,0,.5)", border: "4px solid #2A313C" }}>
        <div style={{ fontFamily: OSWALD, fontWeight: 700, fontSize: 50, color: "#E8ECF2", letterSpacing: 2, width: 190, textAlign: "right", textTransform: "uppercase" }}>{casa.slice(0, 9)}</div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
          <div style={{ fontFamily: OSWALD, fontWeight: 700, fontSize: 150, lineHeight: 1, color: GIALLO, fontVariantNumeric: "tabular-nums", letterSpacing: 6 }}>
            {ris ? `${ris[1]}-${ris[2]}` : valore}
          </div>
          {minuto && <div style={{ background: "#2DAA5A", color: "#08130C", fontFamily: OSWALD, fontWeight: 700, fontSize: 44, padding: "2px 18px", borderRadius: 8 }}>{minuto}'</div>}
        </div>
        <div style={{ fontFamily: OSWALD, fontWeight: 700, fontSize: 50, color: "#E8ECF2", letterSpacing: 2, width: 190, textTransform: "uppercase" }}>{ospiti.slice(0, 9)}</div>
      </div>
    </div>
  );
};

export const Notifica: React.FC<{ testo: string; valore: string; tl: number; fps: number; pelle: string }> = ({ testo, valore, tl, fps, pelle }) => {
  const k = molla(tl, fps, 0.05);
  const y = interpolate(k, [0, 1], [1300, 0]);
  const bolla = molla(tl, fps, 0.45);
  return (
    <div style={{ position: "absolute", left: 0, right: 0, top: 520, height: 1400, display: "flex", justifyContent: "center", transform: `translateY(${y}px) rotate(-4deg)` }}>
      <div style={{ position: "relative", width: 520, height: 1000 }}>
        <div style={{ position: "absolute", inset: 0, background: "#121418", borderRadius: 64, boxShadow: "0 30px 60px rgba(0,0,0,.5)" }} />
        <div style={{ position: "absolute", inset: "22px 20px", borderRadius: 48, background: "linear-gradient(180deg, #2B3A55, #12192A)", overflow: "hidden" }}>
          <div style={{ fontFamily: INTER, fontWeight: 700, color: "#fff", fontSize: 92, textAlign: "center", marginTop: 90, letterSpacing: -2 }}>21:47</div>
          <div style={{ margin: "60px 22px 0", background: "rgba(245,245,247,.95)", borderRadius: 30, padding: "22px 24px", transform: `scale(${bolla})`, transformOrigin: "50% 0",
            display: "flex", gap: 18, alignItems: "flex-start" }}>
            <div style={{ width: 70, height: 70, borderRadius: 18, background: "#2DAA5A", flexShrink: 0 }} />
            <div style={{ display: "flex", flexDirection: "column", gap: 6, minWidth: 0 }}>
              <div style={{ fontFamily: INTER, fontWeight: 800, fontSize: 34, color: "#111" }}>{testo}</div>
              <div style={{ fontFamily: INTER, fontWeight: 500, fontSize: 32, color: "#333", lineHeight: 1.25 }}>{valore}</div>
            </div>
          </div>
        </div>
        {/* pollice e mano che lo tengono */}
        <div style={{ position: "absolute", left: -70, bottom: -40, width: 180, height: 330, borderRadius: 90, background: pelle, transform: "rotate(18deg)" }} />
        <div style={{ position: "absolute", right: -50, bottom: 160, width: 120, height: 60, borderRadius: 30, background: pelle, transform: "rotate(-20deg)" }} />
      </div>
    </div>
  );
};

export const NomeTag: React.FC<{ testo: string; valore: string; tl: number; fps: number }> = ({ testo, valore, tl, fps }) => {
  const k = molla(tl, fps, 0.15);
  return (
    <div style={{ position: "absolute", left: 70, top: 300, transform: `translateX(${interpolate(k, [0, 1], [-500, 0])}px)`,
      display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 4 }}>
      <div style={{ background: "#F4F1EA", color: "#16191E", fontFamily: OSWALD, fontWeight: 700, fontSize: 62, letterSpacing: 2,
        padding: "4px 24px", borderRadius: 6, textTransform: "uppercase", boxShadow: "0 10px 26px rgba(0,0,0,.35)" }}>{testo}</div>
      {valore && <div style={{ background: ROSSO, color: "#fff", fontFamily: OSWALD, fontWeight: 500, fontSize: 38, letterSpacing: 2,
        padding: "2px 18px", borderRadius: 6, textTransform: "uppercase" }}>{valore}</div>}
    </div>
  );
};

export const BadgeScena: React.FC<{ testo: string; tl: number; fps: number }> = ({ testo, tl, fps }) => {
  const k = molla(tl, fps, 0.05);
  return (
    <div style={{ position: "absolute", left: 60, right: 60, top: 520, display: "flex", justifyContent: "center", transform: `scale(${k})` }}>
      <div style={{ background: ROSSO, color: "#fff", fontFamily: OSWALD, fontWeight: 700, fontSize: 96, letterSpacing: 3, textAlign: "center",
        padding: "14px 40px", borderRadius: 14, boxShadow: "0 18px 40px rgba(0,0,0,.4)", textTransform: "uppercase", lineHeight: 1.05 }}>{testo}</div>
    </div>
  );
};

export const Scelta: React.FC<{ A: string; B: string; tl: number; fps: number }> = ({ A, B, tl, fps }) => {
  const scuro = interpolate(tl, [0, 0.3], [0, 1], clamp);
  const kA = molla(tl, fps, 0.15), kB = molla(tl, fps, 0.4), kC = molla(tl, fps, 0.75);
  const pulsa = 1 + 0.04 * Math.sin(tl * 7);
  const carta = (lettera: string, testo: string, colore: string, k: number) => (
    <div style={{ background: colore, borderRadius: 26, padding: "28px 34px", display: "flex", alignItems: "center", gap: 28,
      boxShadow: "0 18px 40px rgba(0,0,0,.45)", transform: `translateX(${interpolate(k, [0, 1], [lettera === "A" ? -900 : 900, 0])}px)` }}>
      <div style={{ background: "#fff", color: "#14171C", fontFamily: OSWALD, fontWeight: 700, fontSize: 100, width: 130, height: 130, borderRadius: 20,
        display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{lettera}</div>
      <div style={{ color: "#fff", fontFamily: OSWALD, fontWeight: 700, fontSize: 64, lineHeight: 1.08, textTransform: "uppercase", minWidth: 0 }}>{testo}</div>
    </div>
  );
  return (
    <div style={{ position: "absolute", inset: 0 }}>
      <div style={{ position: "absolute", inset: 0, background: `rgba(8,10,14,${0.62 * scuro})` }} />
      <div style={{ position: "absolute", left: 80, right: 80, top: 430, display: "flex", flexDirection: "column", gap: 40 }}>
        <div style={{ color: "#fff", fontFamily: OSWALD, fontWeight: 700, fontSize: 104, textAlign: "center", letterSpacing: 3, textShadow: ombraTesto, opacity: scuro }}>COSA FAI?</div>
        {carta("A", A, "#2F66D8", kA)}
        {carta("B", B, "#E2552E", kB)}
        <div style={{ marginTop: 30, alignSelf: "center", background: GIALLO, color: "#14171C", fontFamily: OSWALD, fontWeight: 700, fontSize: 70,
          padding: "10px 40px", borderRadius: 14, transform: `scale(${kC * pulsa})`, letterSpacing: 2 }}>COMMENTA A O B</div>
      </div>
    </div>
  );
};
