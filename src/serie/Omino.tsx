// Personaggio a omino per la serie 2D: testa tonda, arti a linee spesse, colori pieni senza contorni
// (lo stile di Stickocalypse). Uno scheletro a 10 angoli: ogni posa è una funzione del tempo, quindi
// il render è ripetibile fotogramma per fotogramma. Vista di tre quarti, rivolto a destra (verso = 1).
import React from "react";
import type { Espressione, Personaggio, Posa } from "./tipi";

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
        kP: -38 * Math.max(0, -Math.cos(ph)), bA: -20 * Math.sin(ph), bP: 20 * Math.sin(ph), gA: 16, gP: 16, dx: Math.min(70 * tl, 120) };
    }
    case "zoppica": {
      // passo lento e storto: la gamba davanti (quella ferita) si piega poco e il corpo ci cade sopra
      const ph = (TAU * t) / 1.35;
      const appoggio = Math.max(0, Math.sin(ph)); // quando carica la gamba ferita
      return { ...a, busto: 8 + 6 * appoggio, testa: 10, cA: 14 * Math.sin(ph), cP: -26 * Math.sin(ph), kA: -6,
        kP: -42 * Math.max(0, -Math.cos(ph)), bA: 30 + 10 * appoggio, gA: 70, bP: -10 * Math.sin(ph), gP: 14,
        dx: Math.min(45 * tl, 90) };
    }
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

// ------------------------------------------------------------------ testa

const Capelli: React.FC<{ stile: Personaggio["stile"]; colore: string; berretto: string }> = ({ stile, colore, berretto }) => {
  const corti = "M -58 8 C -66 -40 -30 -70 6 -66 C 40 -64 58 -42 60 -18 C 46 -30 30 -34 14 -32 C -6 -30 -30 -24 -42 -6 C -46 2 -50 10 -58 8 Z";
  switch (stile.capelli) {
    case "rasati": return <path d={corti} fill={colore} opacity={0.5} />;
    case "ciuffo": return (<>
      <path d={corti} fill={colore} />
      <path d="M -6 -60 C 14 -98 70 -88 66 -38 C 56 -58 34 -62 16 -50 Z" fill={colore} />
    </>);
    case "ricci": return (<g fill={colore}>
      <path d={corti} />
      {[200, 222, 244, 266, 288, 310, 332, 354].map((g, i) => (
        <circle key={i} cx={Math.cos(rad(g)) * 52 - 4} cy={Math.sin(rad(g)) * 52 - 6} r={17 - (i % 2) * 3} />
      ))}
    </g>);
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

const Faccia: React.FC<{ e: Espressione; bocca: number; aperti: number }> = ({ e, bocca, aperti }) => {
  const occhio = "#1C1613";
  const grandi = e === "sorpresa" || e === "spaventata";
  const ry = (grandi ? 7 : 5.6) * aperti * (e === "dolore" ? 0.25 : e === "determinata" ? 0.7 : 1);
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
  };
  return (
    <g>
      <g stroke="#2A1E18" strokeWidth={6} strokeLinecap="round">
        <line x1={b1[0]} y1={b1[1]} x2={b1[2]} y2={b1[3]} />
        <line x1={b2[0]} y1={b2[1]} x2={b2[2]} y2={b2[3]} />
      </g>
      {e === "spaventata" && <><circle cx="10" cy="-4" r="9" fill="#fff" /><circle cx="34" cy="-4" r="9" fill="#fff" /></>}
      <ellipse cx="10" cy="-4" rx={grandi ? 6 : 5.4} ry={Math.max(0.8, ry)} fill={occhio} />
      <ellipse cx="34" cy="-4" rx={grandi ? 6 : 5.4} ry={Math.max(0.8, ry)} fill={occhio} />
      {bocca > 0.08
        ? <ellipse cx="24" cy="28" rx={9 + bocca * 3} ry={2 + bocca * 12} fill="#5A2620" />
        : <g stroke="#5A2620" strokeWidth={5} strokeLinecap="round" fill="none">{bocche[e]}</g>}
    </g>
  );
};

// ------------------------------------------------------------------ personaggio

type Props = { p: Personaggio; posa: Posa; espr: Espressione; t: number; tl: number; seme: number; verso: 1 | -1 };

/** disegnato con i piedi in (0, 0) e rivolto a destra: chi lo usa applica posizione, scala e verso
 *  (verso serve solo a non scrivere il numero di maglia allo specchio) */
export const Omino: React.FC<Props> = ({ p, posa, espr, t, tl, seme, verso }) => {
  const A = angoli(posa, t + seme * 0.37, tl);
  const c = p.colori;
  const st = p.stile;
  const lunghe = st.vestito !== "divisa";

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

  const gamba = (an: P, gi: P, ca: P, dietro: boolean) => {
    const k = dietro ? 0.22 : 0;
    const pelle = scurisci(c.pelle, k), pant = scurisci(c.pantaloni, k), calza = scurisci(c.maglia, k + 0.08), scarpa = scurisci(c.scarpe, k);
    const angPiede = Math.atan2(ca[1] - gi[1], ca[0] - gi[0]) - Math.PI / 2; // la scarpa segue lo stinco
    return (
      <g>
        {lunghe ? (<>
          <Linea a={an} b={gi} w={30} c={pant} /><Linea a={gi} b={ca} w={26} c={pant} />
        </>) : (<>
          <Linea a={an} b={gi} w={25} c={pelle} /><Linea a={gi} b={ca} w={22} c={pelle} />
          <Linea a={lungo(gi, ca, 0.38)} b={ca} w={25} c={calza} />
          <Linea a={an} b={lungo(an, gi, 0.55)} w={33} c={pant} />
        </>)}
        <g transform={`translate(${ca[0]} ${ca[1]}) rotate(${(angPiede * 180) / Math.PI})`}>
          <rect x={-12} y={-2} width={50} height={PIEDE_H + 8} rx={9} fill={scarpa} />
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
        {lunghe ? (<>
          <Linea a={sp} b={go} w={25} c={manica} /><Linea a={go} b={ma} w={22} c={manica} />
        </>) : (<>
          <Linea a={sp} b={go} w={21} c={pelle} /><Linea a={go} b={ma} w={19} c={pelle} />
          <Linea a={sp} b={lungo(sp, go, 0.45)} w={27} c={manica} />
        </>)}
        {!dietro && st.fascia && <Linea a={lungo(sp, go, 0.16)} b={lungo(sp, go, 0.3)} w={29} c="#F2C230" />}
        <circle cx={ma[0]} cy={ma[1]} r={13.5} fill={pelle} />
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
          fill={c.pantaloni} stroke={c.pantaloni} strokeWidth={10} strokeLinejoin="round" />
        <path d={busto} fill={c.maglia} stroke={c.maglia} strokeWidth={12} strokeLinejoin="round" />
        <path d={ombra} fill="#000" opacity={0.14} />
        {st.pettorina && <path d={pettorina} fill="#CDF73A" stroke="#CDF73A" strokeWidth={6} strokeLinejoin="round" opacity={0.96} />}
        {(st.vestito === "giacca" || st.vestito === "camicia") && (
          <path d={`M ${pt(collo, -2, -11)} L ${pt(collo, -48, 2)} L ${pt(collo, -2, 13)} Z`} fill={st.vestito === "giacca" ? "#F2F2EE" : scurisci(c.maglia, 0.15)} />
        )}
        {st.numero && !st.pettorina && (
          <g transform={`translate(${petto[0]} ${petto[1]}) rotate(${b}) scale(${verso} 1)`}>
            <text x={0} y={16} textAnchor="middle" fontFamily="Oswald, 'Arial Narrow', sans-serif" fontWeight={700} fontSize={46}
              fill="#FFFFFF" opacity={0.92}>{st.numero}</text>
          </g>
        )}
        {/* collo e testa */}
        <Linea a={pt(collo, -6, 0)} b={lungo(collo, testaC, 0.55)} w={26} c={scurisci(c.pelle, 0.12)} />
        <g transform={`translate(${testaC[0]} ${testaC[1]}) rotate(${b + A.testa})`}>
          <circle cx={-40} cy={6} r={11} fill={scurisci(c.pelle, 0.12)} />
          <circle cx={0} cy={0} r={R_TESTA} fill={c.pelle} />
          {st.barba && <path d="M -42 18 C -32 58 30 66 52 22 C 42 36 12 42 -10 38 C -24 34 -34 28 -42 18 Z" fill={c.capelli} opacity={0.92} />}
          <Capelli stile={st} colore={c.capelli} berretto={c.maglia} />
          <Faccia e={espr} bocca={A.bocca} aperti={aperti} />
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
