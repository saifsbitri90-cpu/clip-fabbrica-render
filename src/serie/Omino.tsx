// Personaggio della serie 2D «Strada per la 10», disegnato sul riferimento del committente (scheda di
// Giò ridisegnata, 19/11/2026): circa tre teste e mezza, gambe corte e piene, maglia larga con maniche e
// filo oro, pugni grandi, scarpini da calcio, capelli a due toni, contorno d'inchiostro unico (antracite),
// ombre a due toni con la luce dall'alto e davanti. Uno scheletro a 10 angoli: ogni posa e' una funzione
// del tempo, quindi il render e' ripetibile fotogramma per fotogramma.
// Viste: tre quarti rivolto a destra (verso = 1, quella delle scene), fronte e schiena (OminoDritto).
import React from "react";
import type { Espressione, Personaggio, Posa, Vista } from "./tipi";
import { ANTRACITE, BIANCO, CONTORNO_SCHERMO, ORO } from "./palette";

const COSCIA = 88, STINCO = 90, PIEDE_H = 14, BUSTO = 132, COLLO = 74, R_TESTA = 60;
const OMERO = 70, AVAMBRACCIO = 66;
export const ANCA_Y = -(COSCIA + STINCO + PIEDE_H); // -192
export const ALTEZZA_TESTA = -ANCA_Y + BUSTO + COLLO; // centro della testa sopra i piedi: 398
/** seduto: stinco dritto e piede a terra, l'anca sta all'altezza dello stinco */
export const ANCA_SEDUTO = -(STINCO + PIEDE_H); // -104
/** quanto scende la testa rispetto all'in piedi, per la telecamera */
export const ABBASSA = { seduto: COSCIA, terra: -ANCA_Y - 44 + 10 };
export const ISTANTE_CALCIO = 0.25 + 0.45 * 0.9; // secondi dall'inizio della scena al contatto col pallone
export const ISTANTE_LANCIO = 0.25 + 0.5 * 0.8;

type Angoli = {
  busto: number; testa: number;
  bP: number; gP: number; bA: number; gA: number; // braccio e gomito, P = dietro, A = davanti
  cP: number; kP: number; cA: number; kA: number; // coscia e ginocchio
  anca: number | null; salto: number; bocca: number; palpebre: number; dx: number;
};

const clamp = (x: number, a: number, b: number) => Math.min(b, Math.max(a, x));
const lerp = (a: number, b: number, k: number) => a + (b - a) * k;
const morbido = (k: number) => k * k * (3 - 2 * k);
const uscita = (k: number) => 1 - Math.pow(1 - k, 3);
const TAU = Math.PI * 2;

function mescola(a: Angoli, b: Angoli, k: number): Angoli {
  const r = { ...a };
  (Object.keys(a) as (keyof Angoli)[]).forEach((c) => {
    const va = a[c] ?? ANCA_Y, vb = b[c] ?? ANCA_Y;
    (r as Record<string, number | null>)[c] = lerp(va as number, vb as number, k);
  });
  return r;
}

const BASE: Angoli = { busto: 2, testa: 0, bP: -4, gP: 10, bA: 4, gA: 12, cP: -3, kP: 0, cA: 4, kA: 0, anca: null, salto: 0, bocca: 0, palpebre: 1, dx: 0 };

export function angoli(posa: Posa, t: number, tl: number): Angoli {
  const r = Math.sin((TAU * t) / 3.4); // respiro
  const a: Angoli = { ...BASE, busto: BASE.busto + r * 1.2, bA: BASE.bA + r * 1.6, bP: BASE.bP - r * 1.6, testa: r * 0.8 };
  switch (posa) {
    case "seduto":
      return { ...a, anca: ANCA_SEDUTO, cA: 88, kA: -88, cP: 84, kP: -86, busto: -2 + r, bA: 34, gA: 50, bP: 28, gP: 54 };
    case "cammina": {
      const ph = (TAU * t) / 1.05;
      return { ...a, busto: 4, cA: 24 * Math.sin(ph), cP: -24 * Math.sin(ph), kA: -38 * Math.max(0, Math.cos(ph)),
        kP: -38 * Math.max(0, -Math.cos(ph)), bA: -20 * Math.sin(ph), bP: 20 * Math.sin(ph), gA: 16, gP: 16 };
    }
    case "zoppica": {
      // passo lento e storto: la gamba davanti (quella ferita) si piega poco e il corpo ci cade sopra
      const ph = (TAU * t) / 1.35;
      const appoggio = Math.max(0, Math.sin(ph)); // quando carica la gamba ferita
      return { ...a, busto: 8 + 6 * appoggio, testa: 10, cA: 14 * Math.sin(ph), cP: -26 * Math.sin(ph), kA: -6,
        kP: -42 * Math.max(0, -Math.cos(ph)), bA: 30 + 10 * appoggio, gA: 70, bP: -10 * Math.sin(ph), gP: 14,
      };
    }
    case "alzati": {
      // da seduto a in piedi, sporgendosi in avanti a meta movimento
      const k = morbido(clamp((tl - 0.05) / 0.7, 0, 1));
      const sed: Angoli = { ...a, anca: ANCA_SEDUTO, cA: 88, kA: -88, cP: 84, kP: -86, busto: -2, bA: 34, gA: 50, bP: 28, gP: 54 };
      const m = mescola(sed, { ...a, anca: ANCA_Y }, k);
      m.busto += 22 * Math.sin(Math.PI * k);
      if (k >= 1) m.anca = null;
      return m;
    }
    case "blocca": {
      // mezzo passo e braccio alzato a palmo aperto davanti a se
      const k = uscita(clamp((tl - 0.05) / 0.3, 0, 1));
      return { ...a, busto: 2 + 8 * k, testa: -2, bA: lerp(4, 84, k), gA: lerp(12, -4, k), bP: lerp(-4, 20, k), gP: lerp(10, 40, k),
        cA: lerp(4, 16, k), cP: lerp(-3, -10, k) };
    }
    case "si_gira":
      return angoli("parla", t, tl);
    case "a_terra": {
      // gia' a terra, si tiene il ginocchio e dondola dal dolore
      const d = Math.sin((TAU * t) / 1.1);
      return { ...a, anca: -44, busto: -14 + 4 * d, testa: 12 + 3 * d, cA: 76, kA: -100, cP: 86, kP: -6, bA: 64 + 3 * d, gA: 46, bP: -26, gP: 18 };
    }
    case "corre": {
      const ph = (TAU * t) / 0.56;
      return { ...a, busto: 14, testa: -4, cA: 42 * Math.sin(ph), cP: -42 * Math.sin(ph),
        kA: -15 - 75 * Math.max(0, Math.cos(ph)), kP: -15 - 75 * Math.max(0, -Math.cos(ph)),
        bA: -48 * Math.sin(ph), bP: 48 * Math.sin(ph), gA: 88, gP: 88 };
    }
    case "calcia": {
      const k = clamp((tl - 0.25) / 0.9, 0, 1);
      let cA: number, kA: number, busto: number, bA: number, bP: number;
      if (k < 0.35) { const u = morbido(k / 0.35); cA = lerp(4, -38, u); kA = lerp(0, -95, u); busto = lerp(2, -6, u); bA = lerp(4, 40, u); bP = lerp(-4, -45, u); }
      else if (k < 0.5) { const u = uscita((k - 0.35) / 0.15); cA = lerp(-38, 82, u); kA = lerp(-95, -6, u); busto = lerp(-6, -15, u); bA = lerp(40, -30, u); bP = lerp(-45, 50, u); }
      else { const u = morbido((k - 0.5) / 0.5); cA = lerp(82, 6, u); kA = lerp(-6, 0, u); busto = lerp(-15, 2, u); bA = lerp(-30, 4, u); bP = lerp(50, -4, u); }
      return { ...a, cA, kA, busto, bA, bP, gA: 22, gP: 22, cP: -4 };
    }
    case "cade": {
      const k = morbido(clamp((tl - 0.15) / 0.7, 0, 1));
      const fine: Angoli = { ...a, anca: -44, busto: -14, testa: 10, cA: 76, kA: -100, cP: 86, kP: -6, bA: 64, gA: 46, bP: -26, gP: 18 };
      const m = mescola({ ...a, anca: ANCA_Y }, fine, k);
      const atterra = clamp((tl - 0.85) / 0.25, 0, 1);
      m.anca = (m.anca ?? -44) - Math.sin(atterra * Math.PI) * 10;
      return m;
    }
    case "esulta": {
      const ph = (TAU * t) / 0.62;
      const s = Math.max(0, Math.sin(ph));
      return { ...a, busto: -4, testa: -8, bA: 160 + 8 * Math.sin(ph * 2), gA: 14, bP: 150 - 8 * Math.sin(ph * 2), gP: 14,
        cA: 8, cP: -6, kA: -28 * s, kP: -28 * s, salto: 55 * s, bocca: 0.85 };
    }
    case "indica":
      return { ...a, bA: 86 + r * 2, gA: 2, busto: 5 };
    case "braccia_conserte":
      return { ...a, bA: 26, gA: 116, bP: 16, gP: 122, busto: -3, testa: -4, cA: 7, cP: -7 };
    case "ride": {
      const s = Math.sin((TAU * t) / 0.28);
      return { ...a, busto: -8 + 3 * s, testa: -14 + 4 * s, bA: 22, gA: 100, bP: -12, gP: 30, bocca: 0.75 + 0.2 * s };
    }
    case "parla":
      return { ...a, bA: 30 + 14 * Math.sin((TAU * t) / 1.3), gA: 72 + 25 * Math.sin((TAU * t) / 0.9),
        testa: 3 * Math.sin((TAU * t) / 1.7), bocca: Math.abs(Math.sin(TAU * t * 4.3)) * 0.55 };
    case "fissa":
      return { ...a, busto: 7 + r * 0.4, testa: 6, bA: 2, gA: 6, bP: -2, gP: 6, palpebre: 0.45 };
    case "lancia": {
      const k = clamp((tl - 0.25) / 0.8, 0, 1);
      let bA: number, gA: number, busto: number;
      if (k < 0.4) { const u = morbido(k / 0.4); bA = lerp(4, -70, u); gA = lerp(12, 70, u); busto = lerp(2, -10, u); }
      else if (k < 0.55) { const u = uscita((k - 0.4) / 0.15); bA = lerp(-70, 125, u); gA = lerp(70, 6, u); busto = lerp(-10, 12, u); }
      else { const u = morbido((k - 0.55) / 0.45); bA = lerp(125, 20, u); gA = lerp(6, 14, u); busto = lerp(12, 3, u); }
      return { ...a, bA, gA, busto, cA: 10, cP: -8 };
    }
    default:
      return a;
  }
}

// ------------------------------------------------------------------ geometria e colori

type P = [number, number];
const rad = (g: number) => (g * Math.PI) / 180;
/** angolo 0 = verso il basso, positivo = in avanti (verso +x) */
const segmento = (o: P, ang: number, l: number): P => [o[0] + Math.sin(rad(ang)) * l, o[1] + Math.cos(rad(ang)) * l];
const lungo = (a: P, b: P, k: number): P => [lerp(a[0], b[0], k), lerp(a[1], b[1], k)];

function rgb(c: string): number[] | null {
  const h = /^#?([0-9a-f]{6})$/i.exec(c.trim());
  if (h) { const n = parseInt(h[1], 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
  const r = /^rgb\((\d+),\s*(\d+),\s*(\d+)\)$/i.exec(c.trim());
  return r ? [Number(r[1]), Number(r[2]), Number(r[3])] : null;
}
const comeRgb = (c: number[]) => `rgb(${c.map((v) => Math.round(clamp(v, 0, 255))).join(",")})`;
export function scurisci(colore: string, k: number): string {
  const c = rgb(colore);
  return c ? comeRgb(c.map((v) => v * (1 - k))) : colore;
}
/** verso il bianco */
export function schiarisci(colore: string, k: number): string {
  const c = rgb(colore);
  return c ? comeRgb(c.map((v) => v + (255 - v) * k)) : colore;
}
/** piu' luminoso tenendo la tinta (riflessi dei capelli: un castano resta castano, non diventa grigio) */
function ravviva(colore: string, k: number): string {
  const c = rgb(colore);
  if (!c) return colore;
  const luce = (0.3 * c[0] + 0.59 * c[1] + 0.11 * c[2]) / 255;
  const f = 1 + k * (1 - luce);
  const base = Math.max(14, Math.min(...c)) ;
  return comeRgb(c.map((v) => Math.max(v, base) * f + 10 * k));
}

const Linea: React.FC<{ a: P; b: P; w: number; c: string; testa?: "round" | "butt" }> = ({ a, b, w, c, testa = "round" }) => (
  <line x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]} stroke={c} strokeWidth={w} strokeLinecap={testa} />
);
// tratto: un solo inchiostro, l'antracite della palette (riferimento del committente, 19/11). Lo spessore
// (lw, in unita' del disegno) e' CONTORNO_SCHERMO / zoom della telecamera: a schermo resta uguale.
const INK = ANTRACITE;
const CAVIGLIERA = "#F28C28"; // arancione della cavigliera di Santoro
export const spessore = (zoom: number) => clamp(CONTORNO_SCHERMO / Math.max(0.3, zoom), 2.5, 9);
/** luce dall'alto e davanti (nel disegno rivolto a destra) */
const LUCE: P = [0.6, -0.8];
function fasciaOmbra(a: P, b: P, w: number): [P, P] {
  const dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1;
  let n: P = [-dy / l, dx / l];
  if (n[0] * LUCE[0] + n[1] * LUCE[1] > 0) n = [-n[0], -n[1]];
  const s = w * 0.27;
  return [[a[0] + n[0] * s, a[1] + n[1] * s], [b[0] + n[0] * s, b[1] + n[1] * s]];
}
type Tratto = [P, P, number, string];
/** contorni d'inchiostro, poi per ogni pezzo riempimento e fascia d'ombra (due toni, come nel riferimento) */
const Arto: React.FC<{ tratti: Tratto[]; lw: number; ombra?: boolean }> = ({ tratti, lw, ombra = true }) => (<>
  {tratti.map(([a, b, w], i) => <Linea key={`o${i}`} a={a} b={b} w={w + lw} c={INK} />)}
  {tratti.map(([a, b, w, c], i) => {
    const [oa, ob] = fasciaOmbra(a, b, w);
    return (
      <React.Fragment key={`f${i}`}>
        <Linea a={a} b={b} w={w} c={c} />
        {ombra && <Linea a={oa} b={ob} w={w * 0.42} c={scurisci(c, 0.2)} />}
      </React.Fragment>
    );
  })}
</>);

// ------------------------------------------------------------------ capelli

/** capigliatura a riccioli: arco esterno attorno a (cx, cy) da a0 ad a1 gradi (y verso il basso), poi
 *  l'attaccatura, anche lei a riccioli che sporgono verso la faccia. Riccioli piccoli e regolari:
 *  quelli grandi e sporgenti «sembravano un tumore» (18/11); il volume e' quello del riferimento (19/11). */
function cespuglio(cx: number, cy: number, R: number, a0: number, a1: number, attaccatura: P[], passo = 15, passoA = 11): string {
  const pt = (g: number): P => [cx + Math.cos(rad(g)) * R, cy + Math.sin(rad(g)) * R];
  const n = Math.max(3, Math.round((Math.abs(a1 - a0) * Math.PI * R) / 180 / passo));
  const rA = ((Math.PI * R * Math.abs(a1 - a0)) / 180 / n) * 0.55;
  let [x, y] = pt(a0);
  let d = `M ${x.toFixed(1)} ${y.toFixed(1)}`;
  for (let i = 1; i <= n; i++) {
    [x, y] = pt(a0 + ((a1 - a0) * i) / n);
    d += ` A ${rA.toFixed(1)} ${rA.toFixed(1)} 0 0 1 ${x.toFixed(1)} ${y.toFixed(1)}`;
  }
  for (const q of attaccatura) {
    const l = Math.hypot(q[0] - x, q[1] - y), m = Math.max(1, Math.round(l / passoA)), r = (l / m) * 0.58;
    const x0 = x, y0 = y;
    for (let j = 1; j <= m; j++) {
      x = x0 + ((q[0] - x0) * j) / m; y = y0 + ((q[1] - y0) * j) / m;
      d += ` A ${r.toFixed(1)} ${r.toFixed(1)} 0 0 1 ${x.toFixed(1)} ${y.toFixed(1)}`;
    }
  }
  return `${d} Z`;
}

type VistaCapelli = "tq" | "fronte" | "schiena";
type Forma = { tracciati: string[]; centro: P; segni: P[]; luci: P[]; piatta?: boolean; opacita?: number };
const CORTI = {
  tq: "M -58 8 C -66 -40 -30 -70 6 -66 C 40 -64 58 -42 60 -18 L 52 -30 L 48 -24 L 42 -34 L 36 -28 L 30 -37 L 24 -30 L 16 -38 L 10 -31 L 2 -38 L -6 -30 L -14 -34 L -22 -22 L -28 -26 L -36 -10 L -42 -12 L -48 4 L -58 8 Z",
  fronte: "M -60 4 C -66 -46 -30 -70 0 -70 C 30 -70 66 -46 60 4 L 52 -16 L 46 -10 L 40 -30 L 32 -26 L 24 -37 L 16 -31 L 8 -38 L 0 -32 L -8 -38 L -16 -31 L -24 -37 L -32 -26 L -40 -30 L -46 -10 L -52 -16 L -60 4 Z",
  schiena: "M -60 12 C -66 -46 -30 -70 0 -70 C 30 -70 66 -46 60 12 L 50 22 L 44 14 L 34 26 L 26 18 L 16 28 L 8 20 L 0 30 L -8 20 L -16 28 L -26 18 L -34 26 L -44 14 L -50 22 L -60 12 Z",
};
const CIUFFO = {
  tq: "M -6 -60 C 14 -102 74 -92 68 -36 C 58 -58 34 -62 16 -50 Z",
  fronte: "M -14 -62 C 2 -102 62 -96 58 -46 C 46 -64 22 -68 4 -56 Z",
};

function formeCapelli(stile: Personaggio["stile"], v: VistaCapelli): Forma | null {
  switch (stile.capelli) {
    case "ricci":
      if (v === "tq") return {
        tracciati: [cespuglio(-8, -14, 76, 150, 340, [[50, -36], [34, -31], [18, -33], [2, -30], [-12, -25], [-22, -14], [-26, 0], [-30, 14], [-42, 22], [-58, 26], [-73.8, 24]])],
        centro: [-8, -14],
        segni: [[-50, -40], [-30, -60], [-6, -70], [18, -66], [40, -54], [-62, -14], [-40, -30], [-16, -48], [8, -52], [30, -44], [-56, 8], [-38, 4]],
        luci: [[0, -80], [24, -76], [46, -62]],
      };
      if (v === "fronte") return {
        tracciati: [cespuglio(0, -14, 78, 145, 395, [[56, 8], [50, -14], [36, -30], [18, -36], [0, -34], [-18, -36], [-36, -30], [-50, -14], [-56, 8], [-63.9, 30.7]])],
        centro: [0, -14],
        segni: [[-50, -48], [-26, -68], [0, -72], [26, -68], [50, -48], [-66, -12], [66, -12], [-38, -52], [38, -52]],
        luci: [[14, -84], [38, -72]],
      };
      return {
        tracciati: [cespuglio(0, -12, 80, 120, 420, [[28, 50], [14, 55], [0, 52], [-14, 55], [-28, 50], [-40, 57.3]])],
        centro: [0, -12],
        segni: [[-50, -50], [-24, -70], [4, -74], [30, -66], [54, -46], [-66, -12], [-40, -28], [-12, -40], [16, -38], [42, -24], [66, -10], [-54, 20], [-26, 8], [4, 4], [32, 14], [56, 24], [-30, 40], [0, 32], [28, 40]],
        luci: [[10, -82], [36, -72]],
      };
    case "ciuffo":
      return { tracciati: v === "schiena" ? [CORTI.schiena] : [CORTI[v], CIUFFO[v]], centro: [0, -30], segni: [], luci: v === "schiena" ? [] : [[20, -76], [42, -64]] };
    case "rasati":
      return { tracciati: [CORTI[v]], centro: [0, -30], segni: [], luci: [], piatta: true, opacita: 0.5 };
    case "coda":
      return { tracciati: [v === "tq" ? "M -52 -18 C -94 -6 -98 44 -74 76 C -70 44 -62 16 -46 2 Z" : "M -16 20 C -24 60 -10 90 0 96 C 10 90 24 60 16 20 Z", CORTI[v]], centro: [0, -30], segni: [], luci: [] };
    case "calvo":
      return {
        tracciati: v === "tq" ? ["M -60 6 C -63 -12 -58 -26 -50 -32 L -46 -10 C -50 -2 -53 6 -60 6 Z"]
          : v === "fronte" ? ["M -60 6 C -63 -12 -58 -26 -50 -32 L -46 -10 C -50 -2 -53 6 -60 6 Z", "M 60 6 C 63 -12 58 -26 50 -32 L 46 -10 C 50 -2 53 6 60 6 Z"]
          : ["M -60 4 C -50 34 50 34 60 4 L 54 -10 C 36 12 -36 12 -54 -10 Z"],
        centro: [0, 0], segni: [], luci: [], piatta: true, opacita: 0.85,
      };
    case "cappellino":
      return null;
    default:
      return { tracciati: [CORTI[v]], centro: [0, -30], segni: [], luci: v === "schiena" ? [] : [[-12, -56], [12, -58]] };
  }
}

/** segni dei ricci: archetto scuro sotto ogni riccio, archetto chiaro sopra (luce dall'alto) */
const Segni: React.FC<{ punti: P[]; colore: string; lw: number; chiaro?: boolean }> = ({ punti, colore, lw, chiaro }) => (
  <g fill="none" stroke={colore} strokeWidth={Math.max(2.5, lw * 0.6)} strokeLinecap="round">
    {punti.map(([x, y], i) => <path key={i} d={chiaro ? `M ${x - 5} ${y + 2} q 5 -6 10 0` : `M ${x - 6} ${y - 2} q 6 7 12 0`} />)}
  </g>
);

/** capelli a due toni: sagoma piena col contorno, poi la stessa piu' chiara spostata verso la luce
 *  (resta una fascia scura dietro, in basso e sotto l'attaccatura), poi i segni */
const Capelli: React.FC<{ stile: Personaggio["stile"]; colore: string; berretto: string; lw: number; vista: VistaCapelli }> = ({ stile, colore, berretto, lw, vista }) => {
  if (stile.capelli === "cappellino") {
    return vista === "tq"
      ? (<g stroke={INK} strokeWidth={lw / 1.1} strokeLinejoin="round">
          <path d="M -61 -4 C -62 -62 52 -70 60 -12 Z" fill={berretto} />
          <path d="M 38 -16 C 70 -20 94 -12 99 -3 C 78 -5 56 -6 36 -5 Z" fill={scurisci(berretto, 0.25)} />
        </g>)
      : (<g stroke={INK} strokeWidth={lw / 1.1} strokeLinejoin="round">
          <path d="M -62 -2 C -62 -66 62 -66 62 -2 Z" fill={berretto} />
          {vista === "fronte" && <ellipse cx={0} cy={-2} rx={66} ry={12} fill={scurisci(berretto, 0.25)} />}
        </g>);
  }
  const f = formeCapelli(stile, vista);
  if (!f) return null;
  const lum = (() => { const c = rgb(colore) ?? [80, 80, 80]; return (0.3 * c[0] + 0.59 * c[1] + 0.11 * c[2]) / 255; })();
  const chiaro = ravviva(colore, 0.45 * (1 - lum) + 0.08);
  const [cx, cy] = f.centro;
  return (
    <g opacity={f.opacita ?? 1}>
      <g stroke={INK} strokeWidth={lw / 1.1} strokeLinejoin="round">{f.tracciati.map((d, i) => <path key={i} d={d} fill={colore} />)}</g>
      {!f.piatta && (
        <g transform={`translate(${cx + 4} ${cy - 6}) scale(0.9) translate(${-cx} ${-cy})`}>
          {f.tracciati.map((d, i) => <path key={i} d={d} fill={chiaro} />)}
        </g>
      )}
      {f.segni.length > 0 && <Segni punti={f.segni} colore={scurisci(colore, 0.35)} lw={lw} />}
      {f.luci.length > 0 && <Segni punti={f.luci} colore={ravviva(chiaro, 0.6)} lw={lw} chiaro />}
    </g>
  );
};

/** ombra dei capelli sulla fronte: fascia sotto l'attaccatura, gia' dentro la testa */
const ATTACCATURA: Record<"ricci" | "corti", { tq: P[]; fronte: P[]; giu: number }> = {
  ricci: {
    tq: [[44, -34], [34, -31], [18, -33], [2, -30], [-12, -25], [-22, -14]],
    fronte: [[50, -14], [36, -30], [18, -36], [0, -34], [-18, -36], [-36, -30], [-50, -14]],
    giu: 12,
  },
  corti: {
    tq: [[48, -24], [42, -34], [36, -28], [30, -37], [24, -30], [16, -38], [10, -31], [2, -38], [-6, -30], [-14, -34], [-22, -22], [-28, -26], [-36, -10], [-42, -12]],
    fronte: [[52, -16], [46, -10], [40, -30], [32, -26], [24, -37], [16, -31], [8, -38], [0, -32], [-8, -38], [-16, -31], [-24, -37], [-32, -26], [-40, -30], [-46, -10], [-52, -16]],
    giu: 8,
  },
};
const OmbraCapelli: React.FC<{ capelli: string; vista: "tq" | "fronte"; colore: string }> = ({ capelli, vista, colore }) => {
  const chiave = capelli === "ricci" ? "ricci" : ["corti", "ciuffo", "coda", "rasati"].includes(capelli) ? "corti" : null;
  if (!chiave) return null;
  const a = ATTACCATURA[chiave];
  const sopra = a[vista];
  const dx = vista === "tq" ? -3 : 0;
  const sotto = sopra.map(([x, y]) => [x + dx, y + a.giu] as P).reverse();
  return <path d={`M ${[...sopra, ...sotto].map((q) => `${q[0]} ${q[1]}`).join(" L ")} Z`} fill={colore} opacity={capelli === "rasati" ? 0.5 : 1} />;
};

// ------------------------------------------------------------------ faccia

const Faccia: React.FC<{ e: Espressione; bocca: number; aperti: number; pelle: string; sguardo: number }> = ({ e, bocca, aperti, pelle, sguardo }) => {
  const occhio = "#1C1613";
  const grandi = e === "sorpresa" || e === "spaventata";
  const giu = e === "delusa";
  const rx = grandi ? 13 : 11.5, ry = rx * 1.12 * Math.max(0.08, aperti * (giu ? 0.62 : 1));
  const pupilla = grandi ? 4.5 : 5.5, px = 1.5 + 2.2 * sguardo;
  const occhi = e === "dolore"
    ? <g stroke={INK} strokeWidth={4.5} strokeLinecap="round" fill="none"><path d="M -2 -3 Q 8 -13 18 -3" /><path d="M 27 -3 Q 37 -13 47 -3" /></g>
    : <g>
        {[8, 37].map((cx) => (
          <g key={cx}>
            <ellipse cx={cx} cy={-4} rx={rx} ry={ry} fill="#FBFAF6" stroke={INK} strokeWidth={2.8} />
            {aperti > 0.3 && <circle cx={cx + px} cy={giu ? -1 : -3} r={giu ? 4 : pupilla} fill={occhio} />}
            {aperti > 0.3 && <circle cx={cx + px + 1.7} cy={(giu ? -1 : -3) - 2} r={1.8} fill="#FFFFFF" />}
            {e === "determinata" && aperti > 0.3 && <path d={`M ${cx - rx - 2} ${-4 - ry * 0.25} L ${cx + rx + 2} ${-4 - ry * 0.25} L ${cx + rx + 2} ${-4 - ry - 3} L ${cx - rx - 2} ${-4 - ry - 3} Z`} fill={pelle} />}
          </g>
        ))}
      </g>;
  // sopracciglia: [x1, y1, x2, y2], disegnate come archi pieni (sinistra, destra; x cresce verso il naso)
  const s: Record<Espressione, [number[], number[]]> = {
    neutra: [[-2, -24, 16, -25], [29, -25, 47, -24]],
    felice: [[-2, -27, 16, -29], [29, -29, 47, -27]],
    arrabbiata: [[-2, -28, 17, -17], [28, -17, 47, -28]],
    triste: [[-2, -20, 16, -31], [29, -31, 47, -20]],
    sorpresa: [[-2, -34, 16, -37], [29, -37, 47, -34]],
    spaventata: [[-2, -28, 16, -36], [29, -36, 47, -28]],
    sprezzante: [[-2, -23, 16, -22], [29, -34, 47, -32]],
    dolore: [[-2, -18, 16, -32], [29, -32, 47, -18]],
    determinata: [[-2, -26, 17, -19], [28, -19, 47, -26]],
    delusa: [[-2, -20, 16, -27], [29, -27, 47, -20]],
  };
  const arco = ([x1, y1, x2, y2]: number[]) => `M ${x1} ${y1} Q ${(x1 + x2) / 2} ${Math.min(y1, y2) - 4} ${x2} ${y2}`;
  const [b1, b2] = s[e];
  const bocche: Record<Espressione, React.ReactNode> = {
    neutra: <path d="M 16 27 Q 25 29 34 27" />,
    felice: <path d="M 12 22 Q 25 37 38 22" />,
    arrabbiata: <g><path d="M 13 31 Q 25 24 37 31 Z" fill="#F4F1EA" stroke={INK} strokeWidth={3} /></g>,
    triste: <path d="M 15 32 Q 25 23 35 32" />,
    sorpresa: <ellipse cx="25" cy="29" rx="6.5" ry="8.5" fill="#5A2620" stroke={INK} strokeWidth={2.5} />,
    spaventata: <path d="M 14 29 Q 19 24 24 29 T 35 29" />,
    sprezzante: <path d="M 15 29 Q 28 31 38 20" />,
    dolore: <g><rect x="12" y="22" width="27" height="12" rx="4" fill="#F4F1EA" stroke="#5A2620" strokeWidth={4} /><line x1="12" y1="28" x2="39" y2="28" /></g>,
    determinata: <path d="M 16 28 L 35 28" strokeWidth={6} />,
    delusa: <path d="M 15 31 Q 25 26 35 31" />,
  };
  return (
    <g>
      {occhi}
      <g stroke="#2A1E18" strokeWidth={8} strokeLinecap="round" fill="none" transform="translate(0 -5)">
        <path d={arco(b1)} />
        <path d={arco(b2)} />
      </g>
      {bocca > 0.08
        ? <ellipse cx="25" cy="28" rx={9 + bocca * 3} ry={2 + bocca * 12} fill="#5A2620" stroke={INK} strokeWidth={2.5} />
        : <g stroke="#5A2620" strokeWidth={5} strokeLinecap="round" fill="none">{bocche[e]}</g>}
    </g>
  );
};

/** testa a due toni: anello d'inchiostro, mezzaluna d'ombra dietro e sotto, faccia nella luce */
const Testa: React.FC<{ pelle: string; lw: number; luce: P }> = ({ pelle, lw, luce }) => (<>
  <circle cx={0} cy={0} r={R_TESTA - 1.5 + lw / 2.2} fill={INK} />
  <circle cx={0} cy={0} r={R_TESTA - 1.5} fill={scurisci(pelle, 0.2)} />
  <circle cx={luce[0]} cy={luce[1]} r={R_TESTA - 7} fill={pelle} />
</>);
const Orecchio: React.FC<{ x: number; pelle: string; lw: number; specchio?: boolean }> = ({ x, pelle, lw, specchio }) => (
  <g transform={`translate(${x} 8) scale(${specchio ? -1 : 1} 1)`}>
    <circle cx={0} cy={0} r={10.5} fill={scurisci(pelle, 0.1)} stroke={INK} strokeWidth={lw / 1.1} />
    <path d="M -3 -5 q 6 5 0 10" fill="none" stroke={INK} strokeWidth={Math.max(2, lw * 0.45)} strokeLinecap="round" />
  </g>
);

/** pugno: tondo grande con l'ombra, il pollice e la piega delle dita */
const Pugno: React.FC<{ c: P; pelle: string; lw: number; verso?: number }> = ({ c, pelle, lw, verso = 1 }) => (
  <g>
    <circle cx={c[0]} cy={c[1]} r={18.5} fill={pelle} stroke={INK} strokeWidth={lw} />
    <circle cx={c[0] - 4 * verso} cy={c[1] + 4} r={10.5} fill={scurisci(pelle, 0.16)} />
    <path d={`M ${c[0] - 8} ${c[1] - 2} q 8 6 16 0`} fill="none" stroke={INK} strokeWidth={Math.max(2, lw * 0.4)} strokeLinecap="round" />
  </g>
);

/** scarpino da calcio visto di lato: tomaia, suola scura, lacci, tacchetti (caviglia in 0,0) */
const Scarpino: React.FC<{ colore: string; lw: number; calcio: boolean }> = ({ colore, lw, calcio }) => (
  <g>
    <path d="M -15 -7 L 20 -7 Q 30 -7 38 -1 Q 48 5 47 12 L 47 15 L -15 15 Z" fill={colore} stroke={INK} strokeWidth={lw} strokeLinejoin="round" />
    <path d="M -15 9 L 47 9 L 47 15 L -15 15 Z" fill={scurisci(colore, 0.4)} />
    <path d="M -15 9 L 47 9" stroke={INK} strokeWidth={Math.max(2, lw * 0.5)} />
    {calcio && [10, 18, 26].map((x) => <path key={x} d={`M ${x} -5 l 5 6`} stroke={INK} strokeWidth={Math.max(1.8, lw * 0.4)} strokeLinecap="round" />)}
    {calcio && [-8, 8, 26, 40].map((x) => <rect key={x} x={x} y={14} width={6} height={4} rx={1} fill={INK} />)}
  </g>
);
/** scarpino visto di fronte o da dietro */
const ScarpinoDritto: React.FC<{ colore: string; lw: number; calcio: boolean }> = ({ colore, lw, calcio }) => (
  <g>
    <path d="M -21 -8 L 21 -8 Q 27 -8 27 2 L 27 16 L -21 16 Q -27 16 -27 8 L -27 2 Q -27 -8 -21 -8 Z" fill={colore} stroke={INK} strokeWidth={lw} strokeLinejoin="round" />
    <path d="M -27 10 L 27 10 L 27 16 L -27 16 Z" fill={scurisci(colore, 0.4)} />
    {calcio && <path d="M -6 -4 l 12 0 M -6 1 l 12 0" stroke={INK} strokeWidth={Math.max(1.8, lw * 0.4)} strokeLinecap="round" />}
  </g>
);

// ------------------------------------------------------------------ personaggio

type Props = { p: Personaggio; posa: Posa; espr: Espressione; t: number; tl: number; seme: number; verso: 1 | -1;
  parlando?: number; sguardo?: number; zoom?: number; vista?: Vista };

/** pose in cui il corpo sta dritto: solo queste si possono disegnare di fronte o di schiena */
const DRITTE: Posa[] = ["fermo", "parla", "fissa", "braccia_conserte", "si_gira", "esulta", "ride", "blocca", "indica"];

/** disegnato con i piedi in (0, 0) e rivolto a destra: chi lo usa applica posizione, scala e verso
 *  (verso serve solo a non scrivere il numero di maglia allo specchio). zoom = scala a schermo, per il contorno */
export const Omino: React.FC<Props> = (props) => {
  const { vista = "tre_quarti", posa } = props;
  if (vista !== "tre_quarti" && DRITTE.includes(posa)) return <OminoDritto {...props} dietro={vista === "schiena"} />;
  return <OminoTreQuarti {...props} />;
};

const OminoTreQuarti: React.FC<Props> = ({ p, posa, espr, t, tl, seme, verso, parlando = 0, sguardo = 1, zoom = 1.7 }) => {
  const A = angoli(posa, t + seme * 0.37, tl);
  const c = p.colori;
  const st = p.stile;
  const lunghe = st.vestito !== "divisa";
  const lw = spessore(zoom);

  // gambe nel sistema dell'anca, poi si appoggia il piede piu' basso a terra
  const anP: P = [-14, 0], anA: P = [14, 0];
  const ginP = segmento(anP, A.cP, COSCIA), cavP = segmento(ginP, A.cP + A.kP, STINCO);
  const ginA = segmento(anA, A.cA, COSCIA), cavA = segmento(ginA, A.cA + A.kA, STINCO);
  const ancaY = (A.anca ?? -(Math.max(cavP[1], cavA[1]) + PIEDE_H)) - A.salto;

  const b = A.busto;
  const collo: P = [Math.sin(rad(b)) * BUSTO, -Math.cos(rad(b)) * BUSTO];
  const u: P = [Math.sin(rad(b)), -Math.cos(rad(b))]; // asse del busto verso l'alto
  const v: P = [Math.cos(rad(b)), Math.sin(rad(b))]; // perpendicolare, in avanti
  const pt = (o: P, du: number, dv: number): P => [o[0] + u[0] * du + v[0] * dv, o[1] + u[1] * du + v[1] * dv];
  const spA = pt(collo, -24, 18), spP = pt(collo, -24, -22);
  const gomA = segmento(spA, A.bA + b, OMERO), manoA = segmento(gomA, A.bA + b + A.gA, AVAMBRACCIO);
  const gomP = segmento(spP, A.bP + b, OMERO), manoP = segmento(gomP, A.bP + b + A.gP, AVAMBRACCIO);
  const testaC: P = [collo[0] + Math.sin(rad(b + A.testa)) * COLLO, collo[1] - Math.cos(rad(b + A.testa)) * COLLO];

  const lampeggio = ((t + seme * 1.3) % 3.7) < 0.11 ? 0.1 : 1;
  const aperti = Math.min(A.palpebre, lampeggio);
  const bocca = posa === "ride" || posa === "esulta" ? A.bocca : parlando;

  const gamba = (an: P, gi: P, ca: P, dietro: boolean) => {
    const k = dietro ? 0.18 : 0;
    const pelle = scurisci(c.pelle, k), pant = scurisci(c.pantaloni, k * 0.45), calza = scurisci(c.maglia, k + 0.05), scarpa = scurisci(c.scarpe, k * 0.6);
    const angPiede = Math.atan2(ca[1] - gi[1], ca[0] - gi[0]) - Math.PI / 2; // lo scarpino segue lo stinco
    const bordoCalza: [P, P] = [lungo(gi, ca, 0.2), lungo(gi, ca, 0.3)];
    return (
      <g>
        <Arto lw={lw} tratti={lunghe ? [[an, gi, 34, pant], [gi, ca, 30, pant]]
          : [[an, gi, 30, pelle], [gi, ca, 28, pelle], [lungo(gi, ca, 0.2), ca, 31, calza], [an, lungo(an, gi, 0.62), 46, pant]]} />
        {!lunghe && <Linea a={bordoCalza[0]} b={bordoCalza[1]} w={31} c={scurisci(calza, 0.25)} testa="butt" />}
        {st.cavigliera && !dietro && <Linea a={lungo(gi, ca, 0.8)} b={lungo(gi, ca, 0.92)} w={34} c={CAVIGLIERA} testa="butt" />}
        <g transform={`translate(${ca[0]} ${ca[1]}) rotate(${(angPiede * 180) / Math.PI})`}>
          <Scarpino colore={scarpa} lw={lw} calcio={!lunghe} />
        </g>
      </g>
    );
  };

  const braccio = (sp: P, go: P, ma: P, dietro: boolean) => {
    const k = dietro ? 0.18 : 0;
    const pelle = scurisci(c.pelle, k), manica = scurisci(c.maglia, k);
    return (
      <g>
        <Arto lw={lw} tratti={lunghe ? [[sp, go, 30, manica], [go, ma, 27, manica]]
          : [[sp, go, 26, pelle], [go, ma, 24, pelle], [sp, lungo(sp, go, 0.55), 40, manica]]} />
        {!dietro && st.fascia && <Linea a={lungo(sp, go, 0.16)} b={lungo(sp, go, 0.3)} w={41} c="#F2C230" testa="butt" />}
        <Pugno c={ma} pelle={pelle} lw={lw} />
      </g>
    );
  };

  // maglia larga: dal fianco (sotto l'anca, copre l'elastico) alle spalle
  const zero: P = [0, 0];
  const Hb = pt(zero, -10, -40), Hf = pt(zero, -10, 44), Cf = pt(collo, -22, 52), Cb = pt(collo, -22, -46);
  const Sf = pt(collo, -2, 38), Sb = pt(collo, -2, -34), Nf = pt(collo, 0, 13), Nb = pt(collo, 0, -13);
  const maglia = `M ${Hb} L ${Hf} L ${Cf} Q ${Sf} ${Nf} L ${Nb} Q ${Sb} ${Cb} Z`;
  const ombra = `M ${Hb} L ${pt(zero, -10, -16)} L ${pt(collo, -22, -22)} L ${Cb} Z`;
  const scollo = `M ${pt(collo, -1, -10)} L ${pt(collo, -24, 6)} L ${pt(collo, -1, 16)}`;
  const petto = pt(zero, BUSTO * 0.55, -14); // verso la schiena: il braccio davanti non copre il numero
  const pettorina = `M ${pt(zero, 4, -34)} L ${pt(zero, 4, 38)} L ${pt(collo, -30, 46)} L ${pt(collo, -12, 22)} L ${pt(collo, -12, -18)} L ${pt(collo, -30, -40)} Z`;
  const bacino = `M ${pt(zero, 10, -38)} L ${pt(zero, 10, 42)} L ${pt(zero, -30, 40)} L ${pt(zero, -30, -36)} Z`;

  return (
    <g>
      <ellipse cx={A.dx} cy={2} rx={74} ry={12} fill="#000" opacity={0.2 * (1 - A.salto / 110)} />
      <g transform={`translate(${A.dx} ${ancaY})`}>
        {braccio(spP, gomP, manoP, true)}
        {gamba(anP, ginP, cavP, true)}
        {gamba(anA, ginA, cavA, false)}
        <path d={bacino} fill={c.pantaloni} stroke={INK} strokeWidth={10 + lw} strokeLinejoin="round" />
        <path d={bacino} fill={c.pantaloni} stroke={c.pantaloni} strokeWidth={10} strokeLinejoin="round" />
        <path d={`M ${pt(zero, -4, -42)} L ${pt(zero, -4, 46)} L ${pt(zero, -22, 44)} L ${pt(zero, -22, -40)} Z`} fill={scurisci(c.pantaloni, 0.2)} />
        <path d={maglia} fill={c.maglia} stroke={INK} strokeWidth={12 + lw} strokeLinejoin="round" />
        <path d={maglia} fill={c.maglia} stroke={c.maglia} strokeWidth={12} strokeLinejoin="round" />
        <path d={ombra} fill={scurisci(c.maglia, 0.22)} />
        {st.pettorina && <path d={pettorina} fill="#CDF73A" stroke="#CDF73A" strokeWidth={6} strokeLinejoin="round" opacity={0.96} />}
        {st.vestito === "divisa" && (<>
          {/* filo oro dal colletto alla spalla e colletto a V bordato d'oro (riferimento del 19/11) */}
          <path d={`M ${pt(collo, 0, 12)} L ${pt(collo, -16, 50)}`} stroke={ORO} strokeWidth={Math.max(3.5, lw)} strokeLinecap="round" />
          <path d={scollo} fill={scurisci(c.maglia, 0.35)} stroke={ORO} strokeWidth={Math.max(3, lw * 0.8)} strokeLinejoin="round" />
        </>)}
        {st.vestito === "tuta" && <path d={`M ${pt(collo, -2, 12)} L ${pt(zero, -8, 30)}`} stroke={scurisci(c.maglia, 0.4)} strokeWidth={Math.max(2.5, lw * 0.7)} />}
        {(st.vestito === "giacca" || st.vestito === "camicia") && (
          <path d={`M ${pt(collo, -2, -11)} L ${pt(collo, -48, 2)} L ${pt(collo, -2, 13)} Z`} fill={st.vestito === "giacca" ? "#F2F2EE" : scurisci(c.maglia, 0.15)} />
        )}
        {st.numero && !st.pettorina && (
          <g transform={`translate(${petto[0]} ${petto[1]}) rotate(${b}) scale(${verso} 1)`}>
            <text x={0} y={15} textAnchor="middle" fontFamily="Oswald, 'Arial Narrow', sans-serif" fontWeight={700} fontSize={42}
              fill={st.numeroColore ?? BIANCO} stroke={INK} strokeWidth={lw * 0.55} paintOrder="stroke">{st.numero}</text>
          </g>
        )}
        {/* collo e testa */}
        <Arto lw={lw} tratti={[[pt(collo, -8, 0), lungo(collo, testaC, 0.5), 30, scurisci(c.pelle, 0.18)]]} ombra={false} />
        {st.fischietto && (<g>
          <path d={`M ${pt(collo, -2, -10)} L ${pt(collo, -40, 10)} L ${pt(collo, -2, 13)}`} fill="none" stroke="#C9CDD2" strokeWidth={Math.max(2.5, lw * 0.6)} />
          <rect x={pt(collo, -44, 10)[0] - 7} y={pt(collo, -44, 10)[1] - 5} width={16} height={10} rx={3} fill="#C9CDD2" stroke={INK} strokeWidth={Math.max(2, lw * 0.5)} />
        </g>)}
        <g transform={`translate(${testaC[0]} ${testaC[1]}) rotate(${b + A.testa}) scale(1.1)`}>
          <Testa pelle={c.pelle} lw={lw} luce={[6, -5]} />
          <OmbraCapelli capelli={st.capelli} vista="tq" colore={scurisci(c.pelle, 0.24)} />
          {st.barba && <path d="M -42 18 C -32 58 30 66 52 22 C 42 36 12 42 -10 38 C -24 34 -34 28 -42 18 Z" fill={c.capelli} opacity={0.92} />}
          <Capelli stile={st} colore={c.capelli} berretto={c.maglia} lw={lw} vista="tq" />
          <Orecchio x={-33} pelle={c.pelle} lw={lw} />
          <Faccia e={espr} bocca={bocca} aperti={aperti} pelle={c.pelle} sguardo={sguardo} />
          {st.baffi && <path d="M 13 17 C 21 10 35 10 43 17 C 35 21 21 21 13 17 Z" fill={c.capelli} />}
          {st.occhiali && <g fill="none" stroke="#1F1F22" strokeWidth={4}><circle cx="10" cy="-4" r="13" /><circle cx="35" cy="-4" r="13" /><path d="M 23 -4 L 22 -4 M -3 -6 L -30 -2" /></g>}
        </g>
        {braccio(spA, gomA, manoA, false)}
        {st.oggetto === "microfono" && (<g>
          <Linea a={manoA} b={segmento(manoA, A.bA + b + A.gA + 150, 50)} w={9} c="#1E1E22" />
          <circle cx={segmento(manoA, A.bA + b + A.gA + 150, 58)[0]} cy={segmento(manoA, A.bA + b + A.gA + 150, 58)[1]} r={13} fill="#3A3A40" />
        </g>)}
        {st.oggetto === "telefono" && <rect x={manoA[0] - 4} y={manoA[1] - 44} width={24} height={44} rx={5} fill="#18181C" />}
        {st.oggetto === "cartellina" && <rect x={manoA[0] - 4} y={manoA[1] - 62} width={46} height={62} rx={4} fill="#C9A66B" stroke={INK} strokeWidth={lw} />}
      </g>
    </g>
  );
};

// ------------------------------------------------------------------ vista di fronte e di schiena
// Corpo simmetrico: per la scheda personaggi e per le scene in cui qualcuno guarda in camera o volta
// le spalle («si gira»). Solo pose dritte; le altre restano di tre quarti.

const OminoDritto: React.FC<Props & { dietro: boolean }> = ({ p, posa, espr, t, tl, seme, verso, parlando = 0, zoom = 1.7, dietro }) => {
  const A = angoli(posa, t + seme * 0.37, tl);
  const c = p.colori, st = p.stile, lunghe = st.vestito !== "divisa";
  const lw = spessore(zoom);
  const hipY = ANCA_Y - A.salto; // tutto il corpo si disegna dall'anca, y verso l'alto negativa
  const lampeggio = ((t + seme * 1.3) % 3.7) < 0.11 ? 0.1 : 1;
  const aperti = Math.min(A.palpebre, lampeggio);
  const bocca = posa === "ride" || posa === "esulta" ? A.bocca : parlando;
  const testaY = -BUSTO - COLLO + 4;

  const gamba = (s: -1 | 1) => {
    const an: P = [s * 19, 0], ca: P = [s * 24, -hipY - PIEDE_H], gi: P = lungo(an, ca, 0.5);
    const calza = scurisci(c.maglia, 0.05);
    return (
      <g key={`g${s}`}>
        <Arto lw={lw} tratti={lunghe ? [[an, gi, 34, c.pantaloni], [gi, ca, 30, c.pantaloni]]
          : [[an, gi, 30, c.pelle], [gi, ca, 28, c.pelle], [lungo(gi, ca, 0.2), ca, 31, calza], [an, lungo(an, gi, 0.62), 46, c.pantaloni]]} />
        {!lunghe && <Linea a={lungo(gi, ca, 0.2)} b={lungo(gi, ca, 0.3)} w={31} c={scurisci(calza, 0.25)} testa="butt" />}
        {st.cavigliera && s === 1 && <Linea a={lungo(gi, ca, 0.8)} b={lungo(gi, ca, 0.92)} w={34} c={CAVIGLIERA} testa="butt" />}
        <g transform={`translate(${ca[0] + s * 3} ${ca[1]})`}><ScarpinoDritto colore={c.scarpe} lw={lw} calcio={!lunghe} /></g>
      </g>
    );
  };
  // gli angoli della posa di tre quarti diventano apertura laterale del braccio e piega del gomito verso il centro
  const mani: Record<string, P> = {};
  const braccio = (s: -1 | 1, b: number, g: number) => {
    const sp: P = [s * 50, -BUSTO + 26];
    const apre = b > 120 ? 150 : 10 + Math.max(0, b - 4) * 0.4;
    const go: P = [sp[0] + s * Math.sin(rad(apre)) * OMERO, sp[1] + Math.cos(rad(apre)) * OMERO];
    const piega = apre - g * 0.9;
    const ma: P = [go[0] + s * Math.sin(rad(piega)) * AVAMBRACCIO, go[1] + Math.cos(rad(piega)) * AVAMBRACCIO];
    mani[s] = ma;
    return (
      <g key={`b${s}`}>
        <Arto lw={lw} tratti={lunghe ? [[sp, go, 30, c.maglia], [go, ma, 27, c.maglia]]
          : [[sp, go, 26, c.pelle], [go, ma, 24, c.pelle], [sp, lungo(sp, go, 0.55), 40, c.maglia]]} />
        <Pugno c={ma} pelle={c.pelle} lw={lw} verso={s} />
      </g>
    );
  };
  const maglia = `M -40 10 L 40 10 L 52 ${-BUSTO + 26} Q 50 ${-BUSTO + 2} 14 ${-BUSTO} L -14 ${-BUSTO} Q -50 ${-BUSTO + 2} -52 ${-BUSTO + 26} Z`;
  const bacino = "M -40 -10 L 40 -10 L 38 28 L -38 28 Z";
  const testoMaglia = (y: number, size: number, testo: string, k = 0.6) => (
    <g transform={`translate(0 ${y}) scale(${verso} 1)`}>
      <text x={0} y={size * 0.35} textAnchor="middle" fontFamily="Oswald, 'Arial Narrow', sans-serif" fontWeight={700} fontSize={size}
        fill={st.numeroColore ?? BIANCO} stroke={INK} strokeWidth={lw * k} paintOrder="stroke">{testo}</text>
    </g>
  );

  return (
    <g>
      <ellipse cx={0} cy={2} rx={76} ry={12} fill="#000" opacity={0.2 * (1 - A.salto / 110)} />
      <g transform={`translate(0 ${hipY})`}>
        {gamba(-1)}
        {gamba(1)}
        <path d={bacino} fill={c.pantaloni} stroke={INK} strokeWidth={10 + lw} strokeLinejoin="round" />
        <path d={bacino} fill={c.pantaloni} stroke={c.pantaloni} strokeWidth={10} strokeLinejoin="round" />
        <path d="M -40 10 L 40 10 L 39 24 L -39 24 Z" fill={scurisci(c.pantaloni, 0.2)} />
        <path d={maglia} fill={c.maglia} stroke={INK} strokeWidth={12 + lw} strokeLinejoin="round" />
        <path d={maglia} fill={c.maglia} stroke={c.maglia} strokeWidth={12} strokeLinejoin="round" />
        <path d={`M -40 10 L -16 10 L -20 ${-BUSTO + 4} L -52 ${-BUSTO + 26} Z`} fill={scurisci(c.maglia, 0.22)} />
        {st.pettorina && <path d={maglia} fill="#CDF73A" opacity={0.96} />}
        {st.vestito === "divisa" && (<>
          {[-1, 1].map((s) => <path key={s} d={`M ${s * 13} ${-BUSTO + 1} L ${s * 50} ${-BUSTO + 22}`} stroke={ORO} strokeWidth={Math.max(3.5, lw)} strokeLinecap="round" />)}
          {!dietro && <path d={`M -14 ${-BUSTO} L 0 ${-BUSTO + 20} L 14 ${-BUSTO}`} fill={scurisci(c.maglia, 0.35)} stroke={ORO} strokeWidth={Math.max(3, lw * 0.8)} strokeLinejoin="round" />}
        </>)}
        {st.vestito === "tuta" && !dietro && <path d={`M 0 ${-BUSTO + 18} L 0 8`} stroke={scurisci(c.maglia, 0.4)} strokeWidth={Math.max(2.5, lw * 0.7)} />}
        {st.numero && !st.pettorina && (dietro
          ? (<>{testoMaglia(-BUSTO + 34, Math.min(24, 108 / Math.max(1, (p.nome || "").length)), (p.nome || "").toUpperCase(), 0.4)}{testoMaglia(-BUSTO + 88, 74, st.numero, 0.8)}</>)
          : testoMaglia(-BUSTO * 0.48, 38, st.numero))}
        <Arto lw={lw} tratti={[[[0, -BUSTO + 6], [0, testaY + 34], 30, scurisci(c.pelle, 0.18)]]} ombra={false} />
        {st.fischietto && !dietro && (<g>
          <path d={`M -13 ${-BUSTO + 2} L 0 ${-BUSTO + 38} L 13 ${-BUSTO + 2}`} fill="none" stroke="#C9CDD2" strokeWidth={Math.max(2.5, lw * 0.6)} />
          <rect x={-8} y={-BUSTO + 36} width={16} height={11} rx={3} fill="#C9CDD2" stroke={INK} strokeWidth={Math.max(2, lw * 0.5)} />
        </g>)}
        <g transform={`translate(0 ${testaY}) scale(1.1)`}>
          <Testa pelle={c.pelle} lw={lw} luce={[5, -5]} />
          {!dietro && <OmbraCapelli capelli={st.capelli} vista="fronte" colore={scurisci(c.pelle, 0.24)} />}
          {!dietro && st.barba && <path d="M -46 16 C -36 60 36 60 46 16 C 30 34 -30 34 -46 16 Z" fill={c.capelli} opacity={0.92} />}
          <Capelli stile={st} colore={c.capelli} berretto={c.maglia} lw={lw} vista={dietro ? "schiena" : "fronte"} />
          <Orecchio x={-60} pelle={c.pelle} lw={lw} specchio />
          <Orecchio x={60} pelle={c.pelle} lw={lw} />
          {!dietro && (
            <g transform="translate(-22.5 0)">
              <Faccia e={espr} bocca={bocca} aperti={aperti} pelle={c.pelle} sguardo={-0.75} />
              {st.baffi && <path d="M 13 17 C 21 10 35 10 43 17 C 35 21 21 21 13 17 Z" fill={c.capelli} />}
              {st.occhiali && <g fill="none" stroke="#1F1F22" strokeWidth={4}><circle cx="10" cy="-4" r="13" /><circle cx="35" cy="-4" r="13" /></g>}
            </g>
          )}
        </g>
        {braccio(-1, A.bP, A.gP)}
        {braccio(1, A.bA, A.gA)}
        {st.oggetto === "cartellina" && mani[1] && <rect x={mani[1][0] - 23} y={mani[1][1] - 62} width={46} height={62} rx={4} fill="#C9A66B" stroke={INK} strokeWidth={lw} />}
      </g>
    </g>
  );
};
