// Cartelli che spiegano senza animare (guida grafica del 18/11): titolo della serie, intestazione fissa,
// contatore, tabellone, notifica sul telefono, cartellino col nome, badge di scena, scelta A/B finale.
// Entrano a molla e restano fermi e leggibili. Colori solo dalla palette ufficiale.
// Posizioni fisse, tutte dentro la zona sicura (y 230-1440, destra 230 px libera):
//   intestazione y 240-300 · cartellini e badge di scena da y 340 · tabellone e contatore da y 360.
import React from "react";
import { interpolate, spring } from "remotion";
import { INTER, OSWALD } from "./font";
import { ANTRACITE, BIANCO, ORO, ROSSO, VERDE } from "./palette";
import { ConContorno } from "./Scritte";

const ombraPannello = "0 16px 40px rgba(0,0,0,.45)";
const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

const molla = (tl: number, fps: number, ritardo = 0) =>
  spring({ frame: Math.round((tl - ritardo) * fps), fps, config: { damping: 13, stiffness: 170, mass: 0.7 } });

/** «STRADA PER LA 10» domina, «GIORNO N» e' un'etichetta secondaria; dopo 2,4 s il titolo si ritira
 *  nell'intestazione fissa, sempre uguale per misura e posizione in tutta la puntata */
export const Badge: React.FC<{ testo: string; t: number; fps: number }> = ({ testo, t, fps }) => {
  const parti = testo.split("·").map((s) => s.trim()).filter(Boolean);
  const giorno = parti.find((s) => /^giorno\b/i.test(s)) ?? parti[0] ?? "";
  const serie = parti.find((s) => s !== giorno) ?? "STRADA PER LA 10";
  const m = interpolate(t, [2.0, 2.45], [0, 1], clamp);
  const entra = molla(t, fps, 0.05);
  if (m < 1) {
    // «10» in oro: e' il numero del titolo e della maglia che si sogna
    const [prima, dieci] = /^(.*?)(\d+)\s*$/.exec(serie)?.slice(1) ?? [serie, ""];
    return (
      <div style={{ position: "absolute", left: 60, right: 230, top: 270, display: "flex", flexDirection: "column", alignItems: "center", gap: 14,
        transform: `scale(${interpolate(m, [0, 1], [1, 0.55]) * entra})`, transformOrigin: "50% 0", opacity: 1 - m }}>
        <div style={{ fontFamily: OSWALD, fontWeight: 700, fontSize: 92, lineHeight: 1, letterSpacing: 2, textTransform: "uppercase", whiteSpace: "nowrap" }}>
          <ConContorno testo={prima.trim()} colore={BIANCO} spessore={8} />{" "}
          {dieci && <ConContorno testo={dieci} colore={ORO} spessore={8} />}
        </div>
        <div style={{ background: ROSSO, color: BIANCO, fontFamily: OSWALD, fontWeight: 700, fontSize: 48, letterSpacing: 4,
          padding: "6px 26px", borderRadius: 8, border: `4px solid ${ANTRACITE}`, textTransform: "uppercase" }}>{giorno}</div>
      </div>
    );
  }
  return (
    <div style={{ position: "absolute", left: 60, right: 230, top: 240, display: "flex", justifyContent: "center" }}>
      <div style={{ display: "flex", alignItems: "stretch", borderRadius: 8, overflow: "hidden", border: `3px solid ${ANTRACITE}`, boxShadow: "0 6px 18px rgba(0,0,0,.35)",
        fontFamily: OSWALD, fontWeight: 700, fontSize: 36, letterSpacing: 2, textTransform: "uppercase", lineHeight: 1.25 }}>
        <div style={{ background: ROSSO, color: BIANCO, padding: "4px 16px" }}>{giorno}</div>
        <div style={{ background: ANTRACITE, color: BIANCO, padding: "4px 16px" }}>{serie}</div>
      </div>
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
    <div style={{ position: "absolute", left: 60, right: 230, top: 360, display: "flex", justifyContent: "center", transform: `scale(${k})`, opacity: k }}>
      <div style={{ background: ANTRACITE, borderRadius: 24, padding: "22px 54px 14px", minWidth: 400, display: "flex", flexDirection: "column",
        alignItems: "center", boxShadow: ombraPannello, border: `4px solid ${ORO}` }}>
        <div style={{ fontFamily: OSWALD, fontWeight: 500, fontSize: 42, letterSpacing: 4, color: BIANCO, textTransform: "uppercase" }}>{testo}</div>
        <div style={{ fontFamily: OSWALD, fontWeight: 700, fontSize: 190, lineHeight: 1.02, color: ORO, fontVariantNumeric: "tabular-nums" }}>{conta(valore, tl)}</div>
      </div>
    </div>
  );
};

/** pannello antracite, punteggio oro grande al centro, nomi delle squadre ai lati, minuto in un badge
 *  verde separato sotto. I dati sono quelli del copione, mai cambiati. */
export const Tabellone: React.FC<{ testo: string; valore: string; tl: number; fps: number }> = ({ testo, valore, tl, fps }) => {
  const k = molla(tl, fps, 0.08);
  const kMin = molla(tl, fps, 0.35);
  const tutto = `${testo} ${valore}`;
  const minuto = /(\d{1,3})\s*['’°]/.exec(tutto)?.[1] ?? /\b(\d{1,3})\s*(?:minuto|min)\b/i.exec(tutto)?.[1];
  const ris = /(\d+)\s*[-–:]\s*(\d+)/.exec(valore) ?? /(\d+)\s*[-–:]\s*(\d+)/.exec(testo);
  const squadre = testo.replace(/(\d{1,3})\s*['’°]/, "").replace(/(\d+)\s*[-–:]\s*(\d+)/, "").replace(/minuto|min\b/i, "").trim();
  const nomi = squadre.split(/\s+(?:vs|-|–)\s+/i).map((s) => s.trim()).filter(Boolean);
  const [casa, ospiti] = nomi.length === 2 ? nomi : ["CASA", "OSPITI"];
  const nome = (s: string, lato: "left" | "right") => (
    <div style={{ fontFamily: OSWALD, fontWeight: 700, fontSize: 52, color: BIANCO, letterSpacing: 1, width: 210, textAlign: lato, textTransform: "uppercase", lineHeight: 1.05 }}>{s.slice(0, 10)}</div>
  );
  return (
    <div style={{ position: "absolute", left: 50, right: 230, top: 360, display: "flex", flexDirection: "column", alignItems: "center", gap: 14 }}>
      <div style={{ background: ANTRACITE, borderRadius: 22, padding: "18px 28px", display: "flex", alignItems: "center", gap: 22,
        boxShadow: ombraPannello, border: `4px solid ${BIANCO}`, transform: `scale(${k})`, opacity: k }}>
        {nome(casa, "right")}
        <div style={{ fontFamily: OSWALD, fontWeight: 700, fontSize: 150, lineHeight: 1, color: ORO, fontVariantNumeric: "tabular-nums", letterSpacing: 4 }}>
          {ris ? `${ris[1]}-${ris[2]}` : valore}
        </div>
        {nome(ospiti, "left")}
      </div>
      {minuto && <div style={{ background: VERDE, color: BIANCO, fontFamily: OSWALD, fontWeight: 700, fontSize: 52, padding: "2px 24px", borderRadius: 10,
        border: `4px solid ${ANTRACITE}`, transform: `scale(${kMin})`, letterSpacing: 2 }}>{minuto}'</div>}
    </div>
  );
};

export const Notifica: React.FC<{ testo: string; valore: string; tl: number; fps: number; pelle: string }> = ({ testo, valore, tl, fps, pelle }) => {
  const k = molla(tl, fps, 0.05);
  const y = interpolate(k, [0, 1], [1300, 0]);
  const bolla = molla(tl, fps, 0.45);
  return (
    <div style={{ position: "absolute", left: 60, right: 230, top: 470, height: 1400, display: "flex", justifyContent: "center", transform: `translateY(${y}px) rotate(-4deg)` }}>
      <div style={{ position: "relative", width: 520, height: 1000 }}>
        <div style={{ position: "absolute", inset: 0, background: ANTRACITE, borderRadius: 64, boxShadow: "0 30px 60px rgba(0,0,0,.5)" }} />
        <div style={{ position: "absolute", inset: "22px 20px", borderRadius: 48, background: "linear-gradient(180deg, #2B3A55, #12192A)", overflow: "hidden" }}>
          <div style={{ fontFamily: INTER, fontWeight: 700, color: BIANCO, fontSize: 92, textAlign: "center", marginTop: 90, letterSpacing: -2 }}>21:47</div>
          <div style={{ margin: "60px 22px 0", background: "rgba(245,245,244,.95)", borderRadius: 30, padding: "22px 24px", transform: `scale(${bolla})`, transformOrigin: "50% 0",
            display: "flex", gap: 18, alignItems: "flex-start" }}>
            <div style={{ width: 70, height: 70, borderRadius: 18, background: VERDE, flexShrink: 0 }} />
            <div style={{ display: "flex", flexDirection: "column", gap: 6, minWidth: 0 }}>
              <div style={{ fontFamily: INTER, fontWeight: 800, fontSize: 34, color: ANTRACITE }}>{testo}</div>
              <div style={{ fontFamily: INTER, fontWeight: 500, fontSize: 32, color: "#333", lineHeight: 1.25 }}>{valore}</div>
            </div>
          </div>
        </div>
        <div style={{ position: "absolute", left: -70, bottom: -40, width: 180, height: 330, borderRadius: 90, background: pelle, transform: "rotate(18deg)" }} />
        <div style={{ position: "absolute", right: -50, bottom: 160, width: 120, height: 60, borderRadius: 30, background: pelle, transform: "rotate(-20deg)" }} />
      </div>
    </div>
  );
};

/** cartellino col nome: sotto l'intestazione, a sinistra, mai sopra le teste */
export const NomeTag: React.FC<{ testo: string; valore: string; tl: number; fps: number }> = ({ testo, valore, tl, fps }) => {
  const k = molla(tl, fps, 0.15);
  return (
    <div style={{ position: "absolute", left: 70, top: 340, transform: `translateX(${interpolate(k, [0, 1], [-500, 0])}px)`,
      display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 6 }}>
      <div style={{ background: BIANCO, color: ANTRACITE, fontFamily: OSWALD, fontWeight: 700, fontSize: 60, letterSpacing: 2,
        padding: "2px 24px", borderRadius: 6, textTransform: "uppercase", border: `4px solid ${ANTRACITE}`, boxShadow: "0 10px 26px rgba(0,0,0,.35)" }}>{testo}</div>
      {valore && <div style={{ background: VERDE, color: BIANCO, fontFamily: OSWALD, fontWeight: 500, fontSize: 36, letterSpacing: 2,
        padding: "2px 18px", borderRadius: 6, textTransform: "uppercase", border: `3px solid ${ANTRACITE}` }}>{valore}</div>}
    </div>
  );
};

/** badge di scena («DECIDI TU»): subito sotto l'intestazione; prima stava a y 520 e copriva la testa di Villani */
export const BadgeScena: React.FC<{ testo: string; tl: number; fps: number }> = ({ testo, tl, fps }) => {
  const k = molla(tl, fps, 0.05);
  return (
    <div style={{ position: "absolute", left: 60, right: 230, top: 340, display: "flex", justifyContent: "center", transform: `scale(${k})` }}>
      <div style={{ background: ROSSO, color: BIANCO, fontFamily: OSWALD, fontWeight: 700, fontSize: 84, letterSpacing: 3, textAlign: "center",
        padding: "6px 36px", borderRadius: 14, border: `5px solid ${ANTRACITE}`, boxShadow: ombraPannello, textTransform: "uppercase", lineHeight: 1.1 }}>{testo}</div>
    </div>
  );
};

/** finale A/B in tre livelli: domanda grande in alto, due opzioni grandi e separate, invito a commentare.
 *  Tutto sopra y 1080: sotto restano visibili i personaggi (la telecamera li porta in basso). */
export const Scelta: React.FC<{ A: string; B: string; tl: number; fps: number }> = ({ A, B, tl, fps }) => {
  const scuro = interpolate(tl, [0, 0.3], [0, 1], clamp);
  const kQ = molla(tl, fps, 0), kA = molla(tl, fps, 0.2), kB = molla(tl, fps, 0.45), kC = molla(tl, fps, 0.8);
  const pulsa = 1 + 0.035 * Math.sin(tl * 7);
  const pulito = (s: string) => s.replace(/^[AB]\)\s*/i, "").replace(/[.]+$/, "");
  const opzione = (lettera: string, testo: string, colore: string, k: number) => (
    <div style={{ background: colore, borderRadius: 24, padding: "20px 28px", display: "flex", alignItems: "center", gap: 26, minHeight: 150,
      border: `5px solid ${ANTRACITE}`, boxShadow: ombraPannello, transform: `translateX(${interpolate(k, [0, 1], [lettera === "A" ? -900 : 900, 0])}px)` }}>
      <div style={{ background: BIANCO, color: ANTRACITE, fontFamily: OSWALD, fontWeight: 700, fontSize: 96, width: 120, height: 120, borderRadius: 18,
        display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, border: `4px solid ${ANTRACITE}` }}>{lettera}</div>
      <div style={{ color: BIANCO, fontFamily: OSWALD, fontWeight: 700, fontSize: 56, lineHeight: 1.06, textTransform: "uppercase", minWidth: 0 }}>{pulito(testo)}</div>
    </div>
  );
  return (
    <div style={{ position: "absolute", inset: 0 }}>
      <div style={{ position: "absolute", inset: 0, background: `linear-gradient(180deg, rgba(17,24,39,${0.78 * scuro}) 0%, rgba(17,24,39,${0.7 * scuro}) 52%, rgba(17,24,39,${0.15 * scuro}) 66%, rgba(17,24,39,0) 100%)` }} />
      <div style={{ position: "absolute", left: 70, right: 240, top: 270, display: "flex", flexDirection: "column", gap: 30 }}>
        <div style={{ textAlign: "center", fontFamily: OSWALD, fontWeight: 700, fontSize: 132, lineHeight: 1, letterSpacing: 3, transform: `scale(${kQ})` }}>
          <ConContorno testo="COSA FAI?" colore={BIANCO} spessore={8} />
        </div>
        {opzione("A", A, VERDE, kA)}
        {opzione("B", B, ROSSO, kB)}
        <div style={{ alignSelf: "center", background: ORO, color: ANTRACITE, fontFamily: OSWALD, fontWeight: 700, fontSize: 68,
          padding: "6px 40px", borderRadius: 14, border: `5px solid ${ANTRACITE}`, transform: `scale(${kC * pulsa})`, letterSpacing: 2 }}>COMMENTA A O B</div>
      </div>
    </div>
  );
};
