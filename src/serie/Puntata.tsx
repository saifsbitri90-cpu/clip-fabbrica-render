// Puntata della serie 2D. Regia sul modello di Stickocalypse parte 1: un'inquadratura nuova a ogni
// pezzo di frase (circa ogni 1-2 secondi), primi piani con lo sfondo sfocato, cartelli che spiegano,
// scritta a pezzi con la parola chiave colorata, scelta A/B alla fine.
// Tutto dipende dal fotogramma: niente stato, niente casualità, render ripetibile.
import React from "react";
import { AbsoluteFill, Audio, Sequence, interpolate, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { ALTEZZA_TESTA, ISTANTE_CALCIO, ISTANTE_LANCIO, Omino, spessore } from "./Omino";
import { ANTRACITE, BIANCO, ORO } from "./palette";
import { OSWALD } from "./font";
import { Sfondo, type Camera } from "./Sfondo";
import { Scritte } from "./Scritte";
import { Badge, BadgeScena, Contatore, NomeTag, Notifica, Scelta, Tabellone } from "./Cartelli";
import { Lavagna } from "./Lavagna";
import type { Espressione, Personaggio, Posa, Posizione, PropsPuntata, Scena, Vista } from "./tipi";

const TERRA = 1580; // linea dei piedi nel mondo 1080x1920
const XPOS: Record<Posizione, number> = { sinistra: 300, centro: 540, destra: 780 };
const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const TAU = Math.PI * 2;
// una tinta leggera per luogo, sopra fondale e personaggi: li mette nella stessa luce
const TINTE: Record<string, string> = {
  stadio: "rgba(255,150,80,0.07)", panchina: "rgba(255,185,120,0.05)", corridoio: "rgba(70,100,170,0.10)", spogliatoio: "rgba(255,220,170,0.05)",
};

type Quadro = "largo" | "medio" | "primo";
type Ripresa = { da: number; a: number; quadro: Quadro; fuoco: number };
type Attore = { p: Personaggio; id: string; posa: Posa; espr: Espressione; x: number; xs: number;
  verso: 1 | -1; seme: number; tl: number; parlando: number; vista: Vista };
/** pose con un braccio teso in avanti: in primo piano la telecamera lascia spazio al gesto */
const GESTI: Posa[] = ["blocca", "indica", "parla", "si_gira", "lancia"];

/** un taglio a ogni pezzo di frase, alternando due inquadrature; mai riprese più corte di 0,75 s */
function riprese(s: Scena, ids: string[], parlante: string | null): Ripresa[] {
  const nAttori = ids.length;
  // il protagonista sei tu: le riprese strette senza battuta vanno sulla tua reazione (la v2 stava sul 10
  // in 5 scene su 12 e chi l'ha guardata ha creduto che il protagonista fosse lui)
  const iTu = ids.indexOf("tu");
  const reazione = iTu >= 0 && nAttori > 1 ? iTu : 0;
  const altro = Math.max(0, ids.findIndex((id) => id !== "tu"));
  const schema: { quadro: Quadro; fuoco: number }[] =
    s.inquadratura === "campo_largo" ? [{ quadro: "largo", fuoco: 0 }, { quadro: "medio", fuoco: 0 }]
    : s.inquadratura === "piano_medio" ? [{ quadro: "medio", fuoco: 0 }, { quadro: "primo", fuoco: reazione }]
    : nAttori > 1 ? [{ quadro: "primo", fuoco: altro }, { quadro: "primo", fuoco: reazione }]
    : [{ quadro: "primo", fuoco: 0 }, { quadro: "medio", fuoco: 0 }];
  const inizi = [s.da];
  for (const p of s.pezzi.slice(1)) {
    if (p.da - inizi[inizi.length - 1] >= 0.75 && s.a - p.da >= 0.6) inizi.push(p.da);
  }
  // durante una battuta la telecamera va su chi parla
  return inizi.map((da, i) => {
    const base = schema[i % 2];
    const pz = s.pezzi.find((p) => p.da >= da - 0.01);
    const chi = parlante && pz?.parole.some((w) => w.q) ? ids.indexOf(parlante) : -1;
    return { da, a: inizi[i + 1] ?? s.a, quadro: chi >= 0 && base.quadro === "largo" ? "medio" : base.quadro, fuoco: chi >= 0 ? chi : base.fuoco };
  });
}

/** quanto si abbassa la testa rispetto all'in piedi */
const abbassa = (posa: Posa, tl: number) => (posa === "seduto" ? 110 : posa === "a_terra" ? 300 : posa === "cade" ? 300 * Math.min(1, Math.max(0, (tl - 0.15) / 0.7)) : 0);

function camere(r: Ripresa, attori: Attore[], t: number, tl: number, corre: boolean): { ch: Camera; bg: Camera } {
  const k = interpolate(t, [r.da, r.a], [0, 1], clamp);
  const spinta = 1 + 0.045 * k;
  const deriva = (r.da * 37) % 2 > 1 ? 1 : -1; // verso della deriva, diverso da ripresa a ripresa
  const f = attori[Math.min(r.fuoco, attori.length - 1)];
  let scala = 1, fx = 540, fy = 990;
  if (r.quadro === "largo" || !f) {
    // un po' piu' vicino e piu' in basso: la testa (anche di chi e' seduto) resta sopra la scritta, che sta a y 1190
    scala = 1.12 * spinta; fx = 540 + deriva * 14 * k;
    fy = attori.some((a) => a.posa === "seduto" || a.posa === "cade" || a.posa === "a_terra") ? 1160 : 1050;
  }
  else if (r.quadro === "medio") {
    scala = 1.72 * spinta;
    fx = attori.length > 1 && r.fuoco === 0 ? attori.reduce((n, a) => n + a.xs, 0) / attori.length : f.xs;
    fy = TERRA - 320 + abbassa(f.posa, f.tl) * 0.6 + deriva * 8 * k;
  } else {
    // primo piano: testa e spalle, testa a y ~780 cosi' il numero di maglia resta sopra la scritta (fondo a 1420).
    // Con un braccio teso la telecamera si allarga e si sposta verso il gesto: la mano resta nel quadro
    const gesto = GESTI.includes(f.posa) && f.vista === "tre_quarti";
    scala = (gesto ? 2.35 : 2.9) * spinta;
    const altezza = (f.p.stile.altezza ?? 1);
    fx = f.xs + f.verso * (gesto ? 75 : 18) + deriva * 6 * k;
    fy = TERRA - ALTEZZA_TESTA * altezza + abbassa(f.posa, f.tl) + 62;
  }
  fx = Math.min(Math.max(fx, 540 / scala), 1080 - 540 / scala); // mai fuori dal mondo
  const bgScala = (1 + (scala - 1) * 0.3) * (corre ? 1.18 : 1);
  return {
    ch: { scala, fx, fy, blur: 0, panX: 0 },
    bg: { scala: bgScala, fx: 540 + (fx - 540) * 0.35, fy: 960 + (fy - 960) * 0.3, blur: (scala - 1) * 2.6, panX: corre ? -((tl * 150) % 300) + 150 : 0 },
  };
}

function versi(s: Scena): (1 | -1)[] {
  return s.personaggi.map((p) => {
    if (p.posizione === "sinistra") return 1;
    if (p.posizione === "destra") return -1;
    if (s.personaggi.some((q) => q.posizione === "destra")) return 1;
    if (s.personaggi.some((q) => q.posizione === "sinistra")) return -1;
    return 1;
  });
}

const Panchina: React.FC<{ da: number; a: number; lw: number }> = ({ da, a, lw }) => (
  <g stroke={ANTRACITE} strokeWidth={lw} strokeLinejoin="round">
    {[da + 30, a - 30, (da + a) / 2].map((x, i) => <rect key={i} x={x - 9} y={TERRA - 110} width={18} height={110} fill="#2E3742" />)}
    <rect x={da} y={TERRA - 132} width={a - da} height={26} rx={8} fill="#5C6E82" />
    <rect x={da} y={TERRA - 240} width={a - da} height={84} rx={14} fill="#4A5B6E" />
  </g>
);

const Pallone: React.FC<{ x: number; y: number; giro: number }> = ({ x, y, giro }) => (
  <g transform={`translate(${x} ${y}) rotate(${giro})`}>
    <circle r={19} fill="#F6F6F2" />
    {[0, 72, 144, 216, 288].map((g) => <circle key={g} cx={Math.cos((g * Math.PI) / 180) * 11} cy={Math.sin((g * Math.PI) / 180) * 11} r={4.5} fill="#23262B" />)}
  </g>
);

/** «TU · GIÒ 22» con la punta verso la testa del protagonista */
const TuEtichetta: React.FC<{ x: number; y: number; k: number; nome: string; numero?: string }> = ({ x, y, k, nome, numero }) => {
  const cx = Math.min(Math.max(x, 220), 630);
  return (
    <div style={{ position: "absolute", left: cx - 200, width: 400, top: y - 124, display: "flex", flexDirection: "column", alignItems: "center",
      opacity: k, transform: `translateY(${(1 - k) * 20}px)` }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 14, background: BIANCO, border: `5px solid ${ANTRACITE}`, borderRadius: 14, padding: "0 22px",
        fontFamily: OSWALD, fontWeight: 700, color: ANTRACITE, textTransform: "uppercase" }}>
        <span style={{ fontSize: 72, lineHeight: 1.15 }}>TU</span>
        <span style={{ fontSize: 38, letterSpacing: 2 }}>{nome}{numero ? ` · ${numero}` : ""}</span>
      </div>
      <div style={{ width: 0, height: 0, borderLeft: "20px solid transparent", borderRight: "20px solid transparent", borderTop: `24px solid ${ANTRACITE}`,
        marginLeft: (x - cx) * 2 }} />
    </div>
  );
};

export const Puntata: React.FC<PropsPuntata> = (props) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  const { scene } = props;
  if (!scene.length) return <AbsoluteFill style={{ background: "#111" }} />;

  const s = scene.find((x) => t >= x.da && t < x.a) ?? scene[scene.length - 1];
  const tl = t - s.da;
  const cast = new Map(props.personaggi.map((p) => [p.id, p]));
  const vv = versi(s);
  const prima = scene[scene.indexOf(s) - 1];
  const giaCaduto = (id: string) => !!prima?.personaggi.some((q) => q.id === id && q.posa === "cade");
  const parole = s.pezzi.flatMap((p) => p.parole);
  const quando = (re: RegExp) => parole.find((w) => re.test(w.w.toLowerCase()))?.t;
  /** l'azione parte sulla parola che la racconta (cade sulla parola chiave, si gira su «gira»...) */
  const ritardo = (posa: Posa) => {
    const tc = s.chiave_t ?? s.da;
    const tt = posa === "cade" ? tc - 0.35
      : posa === "si_gira" ? quando(/gir|volt/) ?? s.da
      : posa === "alzati" ? quando(/pied|alz/) ?? tc
      : posa === "blocca" ? quando(/blocc|ferm/) ?? s.da
      : s.da + 0.1;
    return Math.min(Math.max(0, tt - s.da - 0.15), Math.max(0, s.a - s.da - 1.0));
  };
  // bocca: si muove solo durante le parole tra virgolette, e solo a chi le dice
  const battuta = parole.filter((w) => w.q);
  const parlante = !battuta.length ? null : s.parlante
    ?? s.personaggi.find((p) => p.id !== "tu" && ["parla", "si_gira", "blocca", "indica"].includes(p.posa))?.id ?? s.personaggi[0]?.id ?? null;
  const iq = battuta.findIndex((w, k) => t >= w.t && t < (battuta[k + 1]?.t ?? w.t + 0.45));
  const bocca = iq < 0 ? 0 : 0.3 + 0.55 * Math.abs(Math.sin(TAU * 6.5 * (t - battuta[iq].t)));
  const attori: Attore[] = s.personaggi.flatMap((pr, i) => {
    const p = cast.get(pr.id);
    if (!p) return [];
    const x = XPOS[pr.posizione] ?? 540, verso = vv[i];
    let posa: Posa = pr.posa;
    let tlA = pr.posa === "cade" && giaCaduto(pr.id) ? tl + 3 : tl - ritardo(pr.posa); // chi e' gia' caduto resta a terra
    // la faccia di dolore arriva col colpo (a 0,5 s dall'inizio della caduta), non prima
    const espr: Espressione = pr.posa === "cade" && pr.espressione === "dolore" && !giaCaduto(pr.id) && tlA < 0.5 ? "determinata" : pr.espressione;
    let xs = x;
    if (pr.posa === "cammina" || pr.posa === "zoppica" || pr.posa === "corre") {
      // chi non c'era entra da fuori campo; chi c'era fa qualche passo; poi si ferma (niente camminata sul posto)
      const entra = !prima?.personaggi.some((q) => q.id === pr.id);
      const dur = pr.posa === "zoppica" ? 1.9 : pr.posa === "corre" ? 0.8 : 1.3;
      const k = Math.min(1, Math.max(0, tl / dur)), kk = k * k * (3 - 2 * k);
      xs = x - verso * (entra ? 620 : 100) * (1 - kk);
      if (k >= 1 && pr.posa !== "corre") { posa = "fermo"; tlA = tl; }
    }
    if (pr.posa === "blocca") xs = x + verso * 40 * Math.min(1, Math.max(0, tlA / 0.3));
    // «si gira»: di schiena (numero e nome sulla maglia) fino alla parola, poi di tre quarti verso di te
    const vista: Vista = pr.vista ?? (pr.posa === "si_gira" && tlA < 0.15 ? "schiena" : "tre_quarti");
    return [{ p, id: pr.id, posa, espr, x, xs, verso, seme: i + s.n, tl: tlA, parlando: pr.id === parlante ? bocca : 0, vista }];
  });
  const lista = riprese(s, attori.map((a) => a.id), parlante);
  const r = lista.find((x) => t >= x.da && t < x.a) ?? lista[lista.length - 1];
  const corre = attori.some((a) => a.posa === "corre");
  const scelta = s.cartello?.tipo === "scelta" || t >= props.scelta.da;
  // nel finale A/B i personaggi scendono nella meta' bassa: sopra ci sono domanda e opzioni, nessuno coperto
  const { ch, bg } = scelta
    ? { ch: { scala: 1, fx: 540, fy: 861, blur: 0, panX: 0 }, bg: { scala: 1, fx: 540, fy: 930, blur: 0, panX: 0 } }
    : camere(r, attori, t, tl, corre);
  const tipo = s.cartello?.tipo;
  const tlc = s === scene[0] ? tl - 2.5 : tl; // nella prima scena il cartello entra dopo il badge grande
  const lavagna = s.inquadratura === "dall_alto" || tipo === "lavagna";
  const pezzo = s.pezzi.find((p) => t >= p.da && t < p.a) ?? (t < s.pezzi[0]?.da ? undefined : s.pezzi[s.pezzi.length - 1]);
  const tu = cast.get("tu");
  const notifica = tipo === "notifica";
  const bgCam = notifica ? { ...bg, blur: Math.max(bg.blur, 6) } : bg;

  // oggetti di scena
  const seduti = attori.filter((a) => a.posa === "seduto" || a.posa === "alzati");
  const calciatore = attori.find((a) => a.posa === "calcia");
  const lanciatore = attori.find((a) => a.posa === "lancia");
  const bersaglio = lanciatore ? attori.find((a) => a !== lanciatore) : undefined;

  const mondo = (
    <svg viewBox="0 0 1080 1920" width="1080" height="1920" style={{ position: "absolute", inset: 0 }}>
      <g transform={`translate(540 960) scale(${ch.scala}) translate(${-ch.fx} ${-ch.fy})`}>
        {seduti.length > 0 && <Panchina lw={spessore(ch.scala)} da={Math.min(...seduti.map((a) => a.x)) - 170} a={Math.max(...seduti.map((a) => a.x)) + 170} />}
        {corre && [0, 1, 2, 3, 4].map((i) => {
          const y = TERRA - 120 - i * 80, sp = ((tl * 900 + i * 230) % 1200);
          return <rect key={i} x={1180 - sp} y={y} width={160 + (i % 2) * 90} height={6} rx={3} fill="#FFFFFF" opacity={0.28} />;
        })}
        {attori.map((a, i) => (
          <g key={i} transform={`translate(${a.xs} ${TERRA}) scale(${a.verso * (a.p.stile.altezza ?? 1)} ${a.p.stile.altezza ?? 1})`}>
            <Omino p={a.p} posa={a.posa} espr={a.espr} t={t} tl={a.tl} seme={a.seme} verso={a.verso} parlando={a.parlando}
              zoom={ch.scala * (a.p.stile.altezza ?? 1)} vista={a.vista} />
          </g>
        ))}
        {/* lampo d'impatto quando il ginocchio cede (la caduta parte a 0,15 s, il contatto e' a ~0,5 s) */}
        {attori.filter((a) => a.posa === "cade").map((a, i) => {
          const d = a.tl - 0.5;
          if (d < 0 || d > 0.35) return null;
          const k = d / 0.35, sc = 0.6 + 0.8 * Math.sin(Math.PI * Math.min(1, k * 1.4));
          const punte = Array.from({ length: 16 }, (_, j) => {
            const rr = j % 2 ? 26 : 62, g = (j / 16) * TAU;
            return `${Math.cos(g) * rr},${Math.sin(g) * rr}`;
          }).join(" ");
          return (
            <g key={`b${i}`} transform={`translate(${a.xs + a.verso * 34} ${TERRA - 150}) scale(${sc})`} opacity={1 - k * 0.6}>
              <polygon points={punte} fill={ORO} stroke={ANTRACITE} strokeWidth={6} strokeLinejoin="round" />
            </g>
          );
        })}
        {calciatore && (() => {
          const d = tl - ISTANTE_CALCIO;
          const x0 = calciatore.x + calciatore.verso * 62;
          if (d < 0) return <Pallone x={x0} y={TERRA - 19} giro={0} />;
          return <Pallone x={x0 + calciatore.verso * 1500 * d} y={TERRA - 19 - 900 * d + 600 * d * d} giro={d * 900} />;
        })()}
        {lanciatore && bersaglio && tl > ISTANTE_LANCIO && (() => {
          const d = Math.min(1, (tl - ISTANTE_LANCIO) / 0.45);
          const x = interpolate(d, [0, 1], [lanciatore.x + lanciatore.verso * 70, bersaglio.x]);
          const y = interpolate(d, [0, 1], [TERRA - 430, TERRA - 330]) - Math.sin(d * Math.PI) * 160;
          return <rect x={x - 40} y={y - 48} width={80} height={96} rx={14} fill="#CDF73A" transform={`rotate(${d * 300 * lanciatore.verso} ${x} ${y})`} />;
        })()}
      </g>
    </svg>
  );

  return (
    <AbsoluteFill style={{ background: "#11151B" }}>
      {lavagna ? (
        <Lavagna testo={s.cartello?.testo ?? ""} valore={s.cartello?.valore ?? ""} tl={tl} durata={s.a - s.da} maglia={tu?.colori.maglia ?? "#2F5FA8"} />
      ) : (<>
        <Sfondo luogo={props.luoghi[s.luogo]} cam={bgCam} />
        {mondo}
        <div style={{ position: "absolute", inset: 0, background: TINTE[props.luoghi[s.luogo]?.tipo ?? ""] ?? "transparent" }} />
        {notifica && <div style={{ position: "absolute", inset: 0, background: "rgba(8,10,14,.35)" }} />}
      </>)}

      {/* prima scena: un'etichetta indica chi sei, prima che entri il contatore */}
      {s === scene[0] && tl > 0.4 && tl < 2.3 && (() => {
        const a = attori.find((x) => x.id === "tu");
        if (!a) return null;
        const alt = a.p.stile.altezza ?? 1;
        const hx = 540 + (a.xs + a.verso * 20 * alt - ch.fx) * ch.scala;
        const hy = 960 + (TERRA - ALTEZZA_TESTA * alt + abbassa(a.posa, a.tl) - ch.fy) * ch.scala - 82 * alt * ch.scala;
        const k = Math.min(1, (tl - 0.4) / 0.2) * Math.min(1, (2.3 - tl) / 0.2);
        return <TuEtichetta x={hx} y={hy} k={k} nome={a.p.nome} numero={a.p.stile.numero} />;
      })()}
      {tipo === "contatore" && s.cartello && <Contatore testo={s.cartello.testo} valore={s.cartello.valore} tl={tlc} fps={fps} />}
      {tipo === "tabellone" && s.cartello && <Tabellone testo={s.cartello.testo} valore={s.cartello.valore} tl={tlc} fps={fps} />}
      {tipo === "notifica" && s.cartello && <Notifica testo={s.cartello.testo} valore={s.cartello.valore} tl={tlc} fps={fps} pelle={tu?.colori.pelle ?? "#C68B62"} />}
      {tipo === "nome" && s.cartello && <NomeTag testo={s.cartello.testo} valore={s.cartello.valore} tl={tlc} fps={fps} />}
      {tipo === "badge" && s.cartello && s.n > 1 && <BadgeScena testo={s.cartello.testo || s.cartello.valore} tl={tl} fps={fps} />}

      {scelta
        ? <Scelta A={props.scelta.A} B={props.scelta.B} tl={t - props.scelta.da} fps={fps} />
        : <>
            <Badge testo={props.badge} t={t} fps={fps} />
            <Scritte pezzo={pezzo} t={t} />
          </>}

      {/* suono */}
      {props.voce && <Audio src={staticFile(props.voce)} />}
      {/* musica sempre presente e bassa: «silenzio» vuol dire solo nessun effetto */}
      <Audio src={staticFile("suoni/musica.mp3")} volume={(f) => {
        const ft = f / fps;
        return 0.075 * Math.min(1, ft / 1.2) * Math.min(1, Math.max(0, props.durata - ft) / 1.2);
      }} />
      {scene.map((x, i) => {
        const da = Math.round(x.da * fps), lungo = Math.max(1, Math.round((x.a - x.da) * fps));
        const calcia = x.personaggi.some((p) => p.posa === "calcia");
        const file: Record<string, string> = { fischio: "fischio", notifica: "ding", whoosh: "whoosh", calcio_pallone: "calcio_pallone" };
        return (
          <React.Fragment key={i}>
            {i > 0 && <Sequence from={Math.max(0, da - 3)} durationInFrames={20} layout="none"><Audio src={staticFile("suoni/whoosh.mp3")} volume={0.16} /></Sequence>}
            {x.cartello && x.cartello.tipo !== "scelta" && <Sequence from={da + (i === 0 ? Math.round(2.5 * fps) : 3)} durationInFrames={15} layout="none"><Audio src={staticFile("suoni/pop.mp3")} volume={0.3} /></Sequence>}
            {file[x.suono] && (
              <Sequence from={da + Math.round((x.suono === "calcio_pallone" && calcia ? ISTANTE_CALCIO : 0.1) * fps)} durationInFrames={Math.round(3.5 * fps)} layout="none">
                <Audio src={staticFile(`suoni/${file[x.suono]}.mp3`)} volume={0.4} />
              </Sequence>
            )}
            {x.personaggi.some((p) => p.posa === "cade") && !(scene[i - 1]?.personaggi.some((q) => q.posa === "cade")) && (
              <Sequence from={Math.round((x.chiave_t ?? x.da + 0.5) * fps)} durationInFrames={Math.round(2 * fps)} layout="none">
                <Audio src={staticFile("suoni/colpo.mp3")} volume={0.45} />
                <Audio src={staticFile("suoni/calcio_pallone.mp3")} volume={0.35} />
              </Sequence>
            )}
            {calcia && x.suono !== "calcio_pallone" && (
              <Sequence from={da + Math.round(ISTANTE_CALCIO * fps)} durationInFrames={20} layout="none"><Audio src={staticFile("suoni/calcio_pallone.mp3")} volume={0.45} /></Sequence>
            )}
          </React.Fragment>
        );
      })}
      <Sequence from={Math.round(props.scelta.da * fps)} layout="none"><Audio src={staticFile("suoni/crescendo.mp3")} volume={0.3} /></Sequence>
    </AbsoluteFill>
  );
};
