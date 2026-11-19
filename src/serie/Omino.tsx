// Personaggio a omino per la serie 2D, stile A «cartone professionale» (guida del 18/11): testa tonda,
// arti a linee spesse, colori pieni, contorno scuro di spessore costante a schermo. Uno scheletro a 10
// angoli: ogni posa è una funzione del tempo, quindi il render è ripetibile fotogramma per fotogramma.
// Viste: tre quarti rivolto a destra (verso = 1, quella delle scene), fronte e schiena (OminoDritto).
import React from "react";
import type { Espressione, Personaggio, Posa, Vista } from "./tipi";
import { BIANCO, CONTORNO_SCHERMO } from "./palette";

const COSCIA = 120, STINCO = 118, PIEDE_H = 12, BUSTO = 185, COLLO = 64, R_TESTA = 60;
const OMERO = 98, AVAMBRACCIO = 92;
export const ANCA_Y = -(COSCIA + STINCO + PIEDE_H); // -250
export const ALTEZZA_TESTA = -ANCA_Y + BUSTO + COLLO; // centro della testa sopra i piedi, circa 499
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
      return { ...a, anca: -140, cA: 88, kA: -88, cP: 84, kP: -86, busto: -2 + r, bA: 34, gA: 50, bP: 28, gP: 54 };
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
      const sed: Angoli = { ...a, anca: -140, cA: 88, kA: -88, cP: 84, kP: -86, busto: -2, bA: 34, gA: 50, bP: 28, gP: 54 };
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

export function scurisci(hex: string, k: number): string {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return hex;
  const n = parseInt(m[1], 16);
  const c = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => Math.round(v * (1 - k)));
  return `rgb(${c[0]},${c[1]},${c[2]})`;
}

const Linea: React.FC<{ a: P; b: P; w: number; c: string }> = ({ a, b, w, c }) => (
  <line x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]} stroke={c} strokeWidth={w} strokeLinecap="round" />
);
// contorno: ogni pezzo ha un bordo piu scuro del suo colore, cosi gli omini si staccano dagli sfondi.
// Lo spessore (lw, in unita' del disegno) arriva da chi disegna: CONTORNO_SCHERMO / zoom della telecamera,
// cosi' a schermo e' uguale in campo largo e in primo piano (prima ingrassava nei primi piani).
const bordo = (c: string) => scurisci(c, 0.55);
export const spessore = (zoom: number) => clamp(CONTORNO_SCHERMO / Math.max(0.3, zoom), 2.5, 9);
type Tratto = [P, P, number, string];
/** prima tutti i contorni, poi tutti i riempimenti: i pezzi di uno stesso arto si fondono senza linee in mezzo */
const Arto: React.FC<{ tratti: Tratto[]; lw: number }> = ({ tratti, lw }) => (<>
  {tratti.map(([a, b, w, c], i) => <Linea key={`o${i}`} a={a} b={b} w={w + lw} c={bordo(c)} />)}
  {tratti.map(([a, b, w, c], i) => <Linea key={`f${i}`} a={a} b={b} w={w} c={c} />)}
</>);

// ------------------------------------------------------------------ testa

/** sagoma a riccioli regolari lungo un arco della testa (da a0 ad a1 gradi, y verso il basso), poi
 *  l'attaccatura dei capelli per chiudere. Riccioli piccoli e tutti uguali: i vecchi cerchi grandi e
 *  sporgenti «sembravano un tumore» (committente, 18/11). */
function riccioli(a0: number, a1: number, n: number, chiusura: string, R = 64, r = 8.6): string {
  const pt = (g: number): P => [Math.cos(rad(g)) * R, Math.sin(rad(g)) * R];
  const [x0, y0] = pt(a0);
  let d = `M ${x0.toFixed(1)} ${y0.toFixed(1)}`;
  for (let i = 1; i <= n; i++) {
    const [x, y] = pt(a0 + ((a1 - a0) * i) / n);
    d += ` A ${r} ${r} 0 0 1 ${x.toFixed(1)} ${y.toFixed(1)}`;
  }
  return `${d} ${chiusura} Z`;
}
/** segni di riccio dentro la capigliatura, piu' scuri: danno la trama senza cambiare la sagoma */
const TrattiRicci: React.FC<{ colore: string; punti: P[]; lw: number }> = ({ colore, punti, lw }) => (
  <g fill="none" stroke={scurisci(colore, 0.45)} strokeWidth={Math.max(2.5, lw * 0.7)} strokeLinecap="round">
    {punti.map(([x, y], i) => <path key={i} d={`M ${x - 7} ${y + 2} q 4 -9 11 -3 q 3 4 -1 7`} />)}
  </g>
);

type PropsCapelli = { stile: Personaggio["stile"]; colore: string; berretto: string; lw: number };
const Capelli: React.FC<PropsCapelli> = (props) => (
  <g stroke={bordo(props.colore)} strokeWidth={props.lw / 1.1} strokeLinejoin="round"><CapelliForma {...props} /></g>
);
const CapelliForma: React.FC<PropsCapelli> = ({ stile, colore, berretto, lw }) => {
  const corti = "M -58 8 C -66 -40 -30 -70 6 -66 C 40 -64 58 -42 60 -18 C 46 -30 30 -34 14 -32 C -6 -30 -30 -24 -42 -6 C -46 2 -50 10 -58 8 Z";
  switch (stile.capelli) {
    case "rasati": return <path d={corti} fill={colore} opacity={0.5} />;
    case "ciuffo": return (<>
      <path d={corti} fill={colore} />
      <path d="M -6 -60 C 14 -98 70 -88 66 -38 C 56 -58 34 -62 16 -50 Z" fill={colore} />
    </>);
    case "ricci": return (<>
      <path fill={colore} d={riccioli(158, 336, 12, "C 44 -36 24 -40 6 -36 C -16 -32 -34 -20 -42 0 C -46 10 -50 18 -59 22")} />
      <TrattiRicci colore={colore} lw={lw} punti={[[-34, -38], [-8, -50], [18, -50], [-46, -12]]} />
    </>);
    case "coda": return (<>
      <path d="M -52 -18 C -94 -6 -98 44 -74 76 C -70 44 -62 16 -46 2 Z" fill={colore} />
      <path d={corti} fill={colore} />
    </>);
    case "calvo": return <path d="M -60 6 C -63 -12 -58 -26 -50 -32 L -46 -10 C -50 -2 -53 6 -60 6 Z" fill={colore} opacity={0.85} />;
    case "cappellino": return (<>
      <path d="M -61 -4 C -62 -62 52 -70 60 -12 Z" fill={berretto} />
      <path d="M 38 -16 C 70 -20 94 -12 99 -3 C 78 -5 56 -6 36 -5 Z" fill={scurisci(berretto, 0.25)} />
    </>);
    default: return <path d={corti} fill={colore} />;
  }
};

const Faccia: React.FC<{ e: Espressione; bocca: number; aperti: number; pelle: string; sguardo: number }> = ({ e, bocca, aperti, pelle, sguardo }) => {
  const occhio = "#1C1613";
  const grandi = e === "sorpresa" || e === "spaventata";
  const giu = e === "delusa"; // occhi socchiusi che guardano in basso
  const rx = grandi ? 10 : 8.5, ry = rx * 1.12 * Math.max(0.08, aperti * (giu ? 0.62 : 1));
  const pupilla = grandi ? 3.6 : 4.6, px = 1.5 + 2 * sguardo;
  const occhi = e === "dolore"
    ? <g stroke={occhio} strokeWidth={4.5} strokeLinecap="round" fill="none"><path d="M 2 -3 Q 10 -11 18 -3" /><path d="M 26 -3 Q 34 -11 42 -3" /></g>
    : <g>
        {[10, 34].map((cx) => (
          <g key={cx}>
            <ellipse cx={cx} cy={-4} rx={rx} ry={ry} fill="#FBFAF6" stroke={scurisci(pelle, 0.55)} strokeWidth={2} />
            {aperti > 0.3 && <circle cx={cx + px} cy={giu ? -1 : -3} r={giu ? 3.8 : pupilla} fill={occhio} />}
            {e === "determinata" && aperti > 0.3 && <rect x={cx - rx - 1} y={-4 - ry - 1} width={rx * 2 + 2} height={ry * 0.85} fill={pelle} />}
          </g>
        ))}
      </g>;
  // sopracciglia: [x1, y1, x2, y2] per sinistra e destra (x cresce verso il naso a destra)
  const s: Record<Espressione, [number[], number[]]> = {
    neutra: [[2, -20, 16, -21], [28, -21, 42, -20]],
    felice: [[2, -23, 16, -25], [28, -25, 42, -23]],
    arrabbiata: [[2, -24, 17, -15], [27, -15, 42, -24]],
    triste: [[2, -18, 16, -27], [28, -27, 42, -18]],
    sorpresa: [[2, -30, 16, -32], [28, -32, 42, -30]],
    spaventata: [[2, -24, 16, -32], [28, -32, 42, -24]],
    sprezzante: [[2, -19, 16, -18], [28, -30, 42, -28]],
    dolore: [[2, -16, 16, -28], [28, -28, 42, -16]],
    determinata: [[2, -22, 17, -17], [27, -17, 42, -22]],
    delusa: [[2, -18, 16, -23], [28, -23, 42, -18]],
  };
  const [b1, b2] = s[e];
  const bocche: Record<Espressione, React.ReactNode> = {
    neutra: <path d="M 15 27 Q 24 29 33 27" />,
    felice: <path d="M 11 22 Q 24 36 37 22" />,
    arrabbiata: <path d="M 14 30 L 34 27" />,
    triste: <path d="M 14 32 Q 24 23 34 32" />,
    sorpresa: <ellipse cx="24" cy="29" rx="6" ry="8" fill="#5A2620" stroke="none" />,
    spaventata: <path d="M 13 29 Q 18 24 23 29 T 34 29" />,
    sprezzante: <path d="M 14 29 Q 27 31 37 20" />,
    dolore: <g><rect x="12" y="22" width="26" height="12" rx="4" fill="#F4F1EA" stroke="#5A2620" strokeWidth={4} /><line x1="12" y1="28" x2="38" y2="28" /></g>,
    determinata: <path d="M 15 28 L 34 28" strokeWidth={6} />,
    delusa: <path d="M 14 31 Q 24 26 34 31" />,
  };
  return (
    <g>
      {occhi}
      <g stroke="#2A1E18" strokeWidth={6.5} strokeLinecap="round" transform="translate(0 -5)">
        <line x1={b1[0]} y1={b1[1]} x2={b1[2]} y2={b1[3]} />
        <line x1={b2[0]} y1={b2[1]} x2={b2[2]} y2={b2[3]} />
      </g>
      {bocca > 0.08
        ? <ellipse cx="24" cy="28" rx={9 + bocca * 3} ry={2 + bocca * 12} fill="#5A2620" />
        : <g stroke="#5A2620" strokeWidth={5} strokeLinecap="round" fill="none">{bocche[e]}</g>}
    </g>
  );
};

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

  // gambe nel sistema dell'anca, poi si appoggia il piede più basso a terra
  const anP: P = [-10, 0], anA: P = [10, 0];
  const ginP = segmento(anP, A.cP, COSCIA), cavP = segmento(ginP, A.cP + A.kP, STINCO);
  const ginA = segmento(anA, A.cA, COSCIA), cavA = segmento(ginA, A.cA + A.kA, STINCO);
  const ancaY = (A.anca ?? -(Math.max(cavP[1], cavA[1]) + PIEDE_H)) - A.salto;

  const b = A.busto;
  const collo: P = [Math.sin(rad(b)) * BUSTO, -Math.cos(rad(b)) * BUSTO];
  const u: P = [Math.sin(rad(b)), -Math.cos(rad(b))]; // asse del busto verso l'alto
  const v: P = [Math.cos(rad(b)), Math.sin(rad(b))]; // perpendicolare, in avanti
  const spalla: P = [collo[0] - u[0] * 26, collo[1] - u[1] * 26];
  const spA: P = [spalla[0] + 12, spalla[1]], spP: P = [spalla[0] - 14, spalla[1]];
  const gomA = segmento(spA, A.bA + b, OMERO), manoA = segmento(gomA, A.bA + b + A.gA, AVAMBRACCIO);
  const gomP = segmento(spP, A.bP + b, OMERO), manoP = segmento(gomP, A.bP + b + A.gP, AVAMBRACCIO);
  const testaC: P = [collo[0] + Math.sin(rad(b + A.testa)) * COLLO, collo[1] - Math.cos(rad(b + A.testa)) * COLLO];

  const lampeggio = ((t + seme * 1.3) % 3.7) < 0.11 ? 0.1 : 1;
  const aperti = Math.min(A.palpebre, lampeggio);
  // la bocca si apre solo a chi sta dicendo la battuta (o a chi ride ed esulta)
  const bocca = posa === "ride" || posa === "esulta" ? A.bocca : parlando;

  const gamba = (an: P, gi: P, ca: P, dietro: boolean) => {
    const k = dietro ? 0.22 : 0;
    const pelle = scurisci(c.pelle, k), pant = scurisci(c.pantaloni, k), calza = scurisci(c.maglia, k + 0.08), scarpa = scurisci(c.scarpe, k);
    const angPiede = Math.atan2(ca[1] - gi[1], ca[0] - gi[0]) - Math.PI / 2; // la scarpa segue lo stinco
    return (
      <g>
        <Arto lw={lw} tratti={lunghe ? [[an, gi, 30, pant], [gi, ca, 26, pant]]
          : [[an, gi, 25, pelle], [gi, ca, 22, pelle], [lungo(gi, ca, 0.38), ca, 25, calza], [an, lungo(an, gi, 0.55), 33, pant]]} />
        <g transform={`translate(${ca[0]} ${ca[1]}) rotate(${(angPiede * 180) / Math.PI})`}>
          <rect x={-12} y={-2} width={50} height={PIEDE_H + 8} rx={9} fill={scarpa} stroke={bordo(scarpa)} strokeWidth={lw} />
          {!lunghe && <rect x={-12} y={PIEDE_H + 2} width={50} height={4} rx={2} fill={scurisci(scarpa, 0.35)} />}
        </g>
      </g>
    );
  };

  const braccio = (sp: P, go: P, ma: P, dietro: boolean) => {
    const k = dietro ? 0.22 : 0;
    const pelle = scurisci(c.pelle, k), manica = scurisci(c.maglia, k);
    return (
      <g>
        <Arto lw={lw} tratti={lunghe ? [[sp, go, 25, manica], [go, ma, 22, manica]]
          : [[sp, go, 21, pelle], [go, ma, 19, pelle], [sp, lungo(sp, go, 0.45), 27, manica]]} />
        {!dietro && st.fascia && <Linea a={lungo(sp, go, 0.16)} b={lungo(sp, go, 0.3)} w={29} c="#F2C230" />}
        <circle cx={ma[0]} cy={ma[1]} r={14.5} fill={pelle} stroke={bordo(pelle)} strokeWidth={lw} />
      </g>
    );
  };

  // busto: trapezio arrotondato dall'anca alle spalle
  const pt = (o: P, du: number, dv: number): P => [o[0] + u[0] * du + v[0] * dv, o[1] + u[1] * du + v[1] * dv];
  const zero: P = [0, 0];
  const Hb = pt(zero, -6, -31), Hf = pt(zero, -6, 33), Cf = pt(collo, -30, 44), Cb = pt(collo, -30, -40);
  const Sf = pt(collo, -4, 30), Sb = pt(collo, -4, -26), Nf = pt(collo, 0, 12), Nb = pt(collo, 0, -12);
  const busto = `M ${Hb} L ${Hf} L ${Cf} Q ${Sf} ${Nf} L ${Nb} Q ${Sb} ${Cb} Z`;
  const ombra = `M ${Hb} L ${pt(zero, -6, -14)} L ${pt(collo, -30, -24)} L ${Cb} Z`;
  const petto = pt(zero, BUSTO * 0.62, 6);
  const pettorina = `M ${pt(zero, 4, -27)} L ${pt(zero, 4, 29)} L ${pt(collo, -34, 38)} L ${pt(collo, -14, 18)} L ${pt(collo, -14, -16)} L ${pt(collo, -34, -34)} Z`;

  return (
    <g>
      <ellipse cx={A.dx} cy={2} rx={68} ry={11} fill="#000" opacity={0.22 * (1 - A.salto / 110)} />
      <g transform={`translate(${A.dx} ${ancaY})`}>
        {braccio(spP, gomP, manoP, true)}
        {gamba(anP, ginP, cavP, true)}
        {gamba(anA, ginA, cavA, false)}
        {/* bacino: pantaloncini o pantaloni */}
        <path d={`M ${pt(zero, 10, -30)} L ${pt(zero, 10, 32)} L ${pt(zero, -26, 30)} L ${pt(zero, -26, -28)} Z`}
          fill={c.pantaloni} stroke={bordo(c.pantaloni)} strokeWidth={10 + lw} strokeLinejoin="round" />
        <path d={`M ${pt(zero, 10, -30)} L ${pt(zero, 10, 32)} L ${pt(zero, -26, 30)} L ${pt(zero, -26, -28)} Z`}
          fill={c.pantaloni} stroke={c.pantaloni} strokeWidth={10} strokeLinejoin="round" />
        <path d={busto} fill={c.maglia} stroke={bordo(c.maglia)} strokeWidth={12 + lw} strokeLinejoin="round" />
        <path d={busto} fill={c.maglia} stroke={c.maglia} strokeWidth={12} strokeLinejoin="round" />
        <path d={ombra} fill="#000" opacity={0.14} />
        {st.pettorina && <path d={pettorina} fill="#CDF73A" stroke="#CDF73A" strokeWidth={6} strokeLinejoin="round" opacity={0.96} />}
        {(st.vestito === "giacca" || st.vestito === "camicia") && (
          <path d={`M ${pt(collo, -2, -11)} L ${pt(collo, -48, 2)} L ${pt(collo, -2, 13)} Z`} fill={st.vestito === "giacca" ? "#F2F2EE" : scurisci(c.maglia, 0.15)} />
        )}
        {st.numero && !st.pettorina && (
          <g transform={`translate(${petto[0]} ${petto[1]}) rotate(${b}) scale(${verso} 1)`}>
            <text x={0} y={16} textAnchor="middle" fontFamily="Oswald, 'Arial Narrow', sans-serif" fontWeight={700} fontSize={46}
              fill={st.numeroColore ?? BIANCO} stroke={scurisci(c.maglia, 0.5)} strokeWidth={lw * 0.6} paintOrder="stroke">{st.numero}</text>
          </g>
        )}
        {/* collo e testa */}
        <Arto lw={lw} tratti={[[pt(collo, -6, 0), lungo(collo, testaC, 0.55), 26, scurisci(c.pelle, 0.12)]]} />
        <g transform={`translate(${testaC[0]} ${testaC[1]}) rotate(${b + A.testa}) scale(1.1)`}>
          <circle cx={-40} cy={6} r={11} fill={scurisci(c.pelle, 0.12)} stroke={bordo(c.pelle)} strokeWidth={lw / 1.1} />
          <circle cx={0} cy={0} r={R_TESTA - 1.5 + lw / 2.2} fill={bordo(c.pelle)} />
          <circle cx={0} cy={0} r={R_TESTA - 1.5} fill={scurisci(c.pelle, 0.12)} />
          <circle cx={5} cy={-4} r={R_TESTA - 6} fill={c.pelle} />
          {st.barba && <path d="M -42 18 C -32 58 30 66 52 22 C 42 36 12 42 -10 38 C -24 34 -34 28 -42 18 Z" fill={c.capelli} opacity={0.92} />}
          <Capelli stile={st} colore={c.capelli} berretto={c.maglia} lw={lw} />
          <Faccia e={espr} bocca={bocca} aperti={aperti} pelle={c.pelle} sguardo={sguardo} />
          {st.baffi && <path d="M 12 17 C 20 10 34 10 42 17 C 34 21 20 21 12 17 Z" fill={c.capelli} />}
          {st.occhiali && <g fill="none" stroke="#1F1F22" strokeWidth={4}><circle cx="10" cy="-4" r="12" /><circle cx="35" cy="-4" r="12" /><path d="M 22 -4 L 23 -4 M -2 -6 L -30 -2" /></g>}
        </g>
        {braccio(spA, gomA, manoA, false)}
        {st.oggetto === "microfono" && (<g>
          <Linea a={manoA} b={segmento(manoA, A.bA + b + A.gA + 150, 50)} w={9} c="#1E1E22" />
          <circle cx={segmento(manoA, A.bA + b + A.gA + 150, 58)[0]} cy={segmento(manoA, A.bA + b + A.gA + 150, 58)[1]} r={13} fill="#3A3A40" />
        </g>)}
        {st.oggetto === "telefono" && (
          <rect x={manoA[0] - 4} y={manoA[1] - 40} width={24} height={44} rx={5} fill="#18181C" />
        )}
        {st.oggetto === "cartellina" && (
          <rect x={manoA[0] - 6} y={manoA[1] - 56} width={44} height={60} rx={4} fill="#C9A66B" />
        )}
      </g>
    </g>
  );
};

// ------------------------------------------------------------------ vista di fronte e di schiena
// Corpo simmetrico: per la scheda personaggi (fronte, schiena) e per le scene in cui qualcuno guarda in
// camera o volta le spalle («si gira»). Solo pose dritte; le altre restano di tre quarti.

const CapelliDritti: React.FC<PropsCapelli & { dietro: boolean }> = ({ stile, colore, berretto, lw, dietro }) => {
  const corti = dietro
    ? "M -60 12 C -66 -46 -30 -70 0 -70 C 30 -70 66 -46 60 12 C 46 34 -46 34 -60 12 Z"
    : "M -60 4 C -66 -46 -30 -70 0 -70 C 30 -70 66 -46 60 4 C 52 -14 40 -28 22 -32 C 8 -35 -8 -35 -22 -32 C -40 -28 -52 -14 -60 4 Z";
  let forma: React.ReactNode;
  switch (stile.capelli) {
    case "rasati": forma = <path d={corti} fill={colore} opacity={0.5} />; break;
    case "ciuffo": forma = (<>
      <path d={corti} fill={colore} />
      {!dietro && <path d="M -14 -62 C 2 -100 62 -94 58 -46 C 46 -64 22 -68 4 -56 Z" fill={colore} />}
    </>); break;
    case "ricci": forma = dietro
      ? (<><path fill={colore} d={riccioli(128, 412, 20, "Q 0 34 -39.4 50.4")} />
          <TrattiRicci colore={colore} lw={lw} punti={[[-30, -30], [0, -44], [28, -28], [-22, 4], [18, 8]]} /></>)
      : (<><path fill={colore} d={riccioli(152, 388, 17, "C 48 -4 30 -36 0 -38 C -30 -36 -48 -4 -56.5 30")} />
          <TrattiRicci colore={colore} lw={lw} punti={[[-30, -46], [0, -55], [28, -46]]} /></>);
      break;
    case "coda": forma = (<>
      {dietro && <path d="M -16 20 C -24 60 -10 90 0 96 C 10 90 24 60 16 20 Z" fill={colore} />}
      <path d={corti} fill={colore} />
    </>); break;
    case "calvo": forma = dietro
      ? <path d="M -60 4 C -50 34 50 34 60 4 L 54 -10 C 36 12 -36 12 -54 -10 Z" fill={colore} opacity={0.85} />
      : (<g fill={colore} opacity={0.85}>
          <path d="M -60 6 C -63 -12 -58 -26 -50 -32 L -46 -10 C -50 -2 -53 6 -60 6 Z" />
          <path d="M 60 6 C 63 -12 58 -26 50 -32 L 46 -10 C 50 -2 53 6 60 6 Z" />
        </g>); break;
    case "cappellino": forma = (<>
      <path d="M -62 -2 C -62 -66 62 -66 62 -2 Z" fill={berretto} />
      {!dietro && <ellipse cx={0} cy={-2} rx={66} ry={12} fill={scurisci(berretto, 0.25)} />}
    </>); break;
    default: forma = <path d={corti} fill={colore} />;
  }
  return <g stroke={bordo(colore)} strokeWidth={lw / 1.1} strokeLinejoin="round">{forma}</g>;
};

const OminoDritto: React.FC<Props & { dietro: boolean }> = ({ p, posa, espr, t, tl, seme, verso, parlando = 0, zoom = 1.7, dietro }) => {
  const A = angoli(posa, t + seme * 0.37, tl);
  const c = p.colori, st = p.stile, lunghe = st.vestito !== "divisa";
  const lw = spessore(zoom);
  const hipY = ANCA_Y - A.salto; // anca: tutto il corpo e' disegnato da qui, con y verso l'alto negativa
  const lampeggio = ((t + seme * 1.3) % 3.7) < 0.11 ? 0.1 : 1;
  const aperti = Math.min(A.palpebre, lampeggio);
  const bocca = posa === "ride" || posa === "esulta" ? A.bocca : parlando;
  const testaY = -BUSTO - COLLO + 4;

  const gamba = (s: -1 | 1) => {
    const an: P = [s * 17, 0], ca: P = [s * 26, -hipY - PIEDE_H], gi: P = lungo(an, ca, 0.5);
    const calza = scurisci(c.maglia, 0.08);
    return (
      <g key={`g${s}`}>
        <Arto lw={lw} tratti={lunghe ? [[an, gi, 30, c.pantaloni], [gi, ca, 26, c.pantaloni]]
          : [[an, gi, 25, c.pelle], [gi, ca, 22, c.pelle], [lungo(gi, ca, 0.38), ca, 25, calza], [an, lungo(an, gi, 0.55), 33, c.pantaloni]]} />
        <rect x={ca[0] - 20 + s * 5} y={ca[1] - 4} width={40} height={PIEDE_H + 10} rx={10} fill={c.scarpe} stroke={bordo(c.scarpe)} strokeWidth={lw} />
      </g>
    );
  };
  // gli angoli della posa di tre quarti diventano apertura laterale del braccio e piega del gomito verso il centro
  const mani: Record<string, P> = {};
  const braccio = (s: -1 | 1, b: number, g: number) => {
    const sp: P = [s * 44, -BUSTO + 28];
    const apre = b > 120 ? 150 : 8 + Math.max(0, b - 4) * 0.4;
    const go: P = [sp[0] + s * Math.sin(rad(apre)) * OMERO, sp[1] + Math.cos(rad(apre)) * OMERO];
    const piega = apre - g * 0.9;
    const ma: P = [go[0] + s * Math.sin(rad(piega)) * AVAMBRACCIO, go[1] + Math.cos(rad(piega)) * AVAMBRACCIO];
    mani[s] = ma;
    return (
      <g key={`b${s}`}>
        <Arto lw={lw} tratti={lunghe ? [[sp, go, 25, c.maglia], [go, ma, 22, c.maglia]]
          : [[sp, go, 21, c.pelle], [go, ma, 19, c.pelle], [sp, lungo(sp, go, 0.45), 27, c.maglia]]} />
        <circle cx={ma[0]} cy={ma[1]} r={14.5} fill={c.pelle} stroke={bordo(c.pelle)} strokeWidth={lw} />
      </g>
    );
  };
  const busto = `M -33 6 L 33 6 L 46 ${-BUSTO + 30} Q 44 ${-BUSTO + 2} 14 ${-BUSTO} L -14 ${-BUSTO} Q -44 ${-BUSTO + 2} -46 ${-BUSTO + 30} Z`;
  const bacino = "M -32 -10 L 32 -10 L 30 26 L -30 26 Z";
  const testoMaglia = (y: number, size: number, testo: string, k = 0.6) => (
    <g transform={`translate(0 ${y}) scale(${verso} 1)`}>
      <text x={0} y={size * 0.35} textAnchor="middle" fontFamily="Oswald, 'Arial Narrow', sans-serif" fontWeight={700} fontSize={size}
        fill={st.numeroColore ?? BIANCO} stroke={scurisci(c.maglia, 0.5)} strokeWidth={lw * k} paintOrder="stroke">{testo}</text>
    </g>
  );

  return (
    <g>
      <ellipse cx={0} cy={2} rx={70} ry={11} fill="#000" opacity={0.22 * (1 - A.salto / 110)} />
      <g transform={`translate(0 ${hipY})`}>
        {gamba(-1)}
        {gamba(1)}
        <path d={bacino} fill={c.pantaloni} stroke={bordo(c.pantaloni)} strokeWidth={10 + lw} strokeLinejoin="round" />
        <path d={bacino} fill={c.pantaloni} stroke={c.pantaloni} strokeWidth={10} strokeLinejoin="round" />
        <path d={busto} fill={c.maglia} stroke={bordo(c.maglia)} strokeWidth={12 + lw} strokeLinejoin="round" />
        <path d={busto} fill={c.maglia} stroke={c.maglia} strokeWidth={12} strokeLinejoin="round" />
        <path d={`M -33 6 L -12 6 L -16 ${-BUSTO + 4} L -46 ${-BUSTO + 30} Z`} fill="#000" opacity={0.12} />
        {st.pettorina && <path d={busto} fill="#CDF73A" opacity={0.96} />}
        {!dietro && <path d={`M -14 ${-BUSTO} L 0 ${-BUSTO + 18} L 14 ${-BUSTO}`} fill="none" stroke={scurisci(c.maglia, 0.4)} strokeWidth={lw} strokeLinejoin="round" />}
        {st.numero && !st.pettorina && (dietro
          ? (<>{testoMaglia(-BUSTO + 46, 26, (p.nome || "").toUpperCase(), 0.4)}{testoMaglia(-BUSTO + 118, 96, st.numero, 0.8)}</>)
          : testoMaglia(-BUSTO * 0.5, 40, st.numero))}
        {st.vestito === "tuta" && !dietro && <path d={`M 0 ${-BUSTO + 18} L 0 0`} stroke={scurisci(c.maglia, 0.35)} strokeWidth={lw * 0.8} />}
        <Arto lw={lw} tratti={[[[0, -BUSTO + 6], [0, testaY + 34], 26, scurisci(c.pelle, 0.12)]]} />
        <g transform={`translate(0 ${testaY}) scale(1.1)`}>
          {[-1, 1].map((s) => <circle key={s} cx={s * 58} cy={6} r={11} fill={scurisci(c.pelle, 0.12)} stroke={bordo(c.pelle)} strokeWidth={lw / 1.1} />)}
          <circle cx={0} cy={0} r={R_TESTA - 1.5 + lw / 2.2} fill={bordo(c.pelle)} />
          <circle cx={0} cy={0} r={R_TESTA - 1.5} fill={scurisci(c.pelle, 0.12)} />
          <circle cx={0} cy={-4} r={R_TESTA - 6} fill={c.pelle} />
          {!dietro && st.barba && <path d="M -46 16 C -36 60 36 60 46 16 C 30 34 -30 34 -46 16 Z" fill={c.capelli} opacity={0.92} />}
          <CapelliDritti stile={st} colore={c.capelli} berretto={c.maglia} lw={lw} dietro={dietro} />
          {!dietro && (
            <g transform="translate(-22 0)">
              <Faccia e={espr} bocca={bocca} aperti={aperti} pelle={c.pelle} sguardo={-0.75} />
              {st.baffi && <path d="M 12 17 C 20 10 34 10 42 17 C 34 21 20 21 12 17 Z" fill={c.capelli} />}
              {st.occhiali && <g fill="none" stroke="#1F1F22" strokeWidth={4}><circle cx="10" cy="-4" r="12" /><circle cx="34" cy="-4" r="12" /></g>}
            </g>
          )}
        </g>
        {braccio(-1, A.bP, A.gP)}
        {braccio(1, A.bA, A.gA)}
        {st.oggetto === "cartellina" && mani[1] && <rect x={mani[1][0] - 22} y={mani[1][1] - 58} width={44} height={60} rx={4} fill="#C9A66B" stroke={bordo("#C9A66B")} strokeWidth={lw} />}
      </g>
    </g>
  );
};
