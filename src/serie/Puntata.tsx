// Puntata della serie 2D. Regia sul modello di Stickocalypse parte 1: un'inquadratura nuova a ogni
// pezzo di frase (circa ogni 1-2 secondi), primi piani con lo sfondo sfocato, cartelli che spiegano,
// scritta a pezzi con la parola chiave colorata, scelta A/B alla fine.
// Tutto dipende dal fotogramma: niente stato, niente casualità, render ripetibile.
import React from "react";
import { AbsoluteFill, Audio, Sequence, interpolate, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { ALTEZZA_TESTA, ISTANTE_CALCIO, ISTANTE_LANCIO, Omino } from "./Omino";
import { Sfondo, type Camera } from "./Sfondo";
import { Scritte } from "./Scritte";
import { Badge, BadgeScena, Contatore, NomeTag, Notifica, Scelta, Tabellone } from "./Cartelli";
import { Lavagna } from "./Lavagna";
import type { Personaggio, Posa, Posizione, PropsPuntata, Scena } from "./tipi";

const TERRA = 1580; // linea dei piedi nel mondo 1080x1920
const XPOS: Record<Posizione, number> = { sinistra: 300, centro: 540, destra: 780 };
const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

type Quadro = "largo" | "medio" | "primo";
type Ripresa = { da: number; a: number; quadro: Quadro; fuoco: number };
type Attore = { p: Personaggio; posa: Posa; espr: Scena["personaggi"][number]["espressione"]; x: number; verso: 1 | -1; seme: number; tl: number };

/** un taglio a ogni pezzo di frase, alternando due inquadrature; mai riprese più corte di 0,75 s */
function riprese(s: Scena, nAttori: number): Ripresa[] {
  const schema: { quadro: Quadro; fuoco: number }[] =
    s.inquadratura === "campo_largo" ? [{ quadro: "largo", fuoco: 0 }, { quadro: "medio", fuoco: 0 }]
    : s.inquadratura === "piano_medio" ? [{ quadro: "medio", fuoco: 0 }, { quadro: "primo", fuoco: 0 }]
    : nAttori > 1 ? [{ quadro: "primo", fuoco: 0 }, { quadro: "primo", fuoco: 1 }]
    : [{ quadro: "primo", fuoco: 0 }, { quadro: "medio", fuoco: 0 }];
  const inizi = [s.da];
  for (const p of s.pezzi.slice(1)) {
    if (p.da - inizi[inizi.length - 1] >= 0.75 && s.a - p.da >= 0.6) inizi.push(p.da);
  }
  return inizi.map((da, i) => ({ da, a: inizi[i + 1] ?? s.a, ...schema[i % 2] }));
}

/** quanto si abbassa la testa rispetto all'in piedi */
const abbassa = (posa: Posa, tl: number) => (posa === "seduto" ? 110 : posa === "cade" ? 300 * Math.min(1, Math.max(0, (tl - 0.15) / 0.7)) : 0);

function camere(r: Ripresa, attori: Attore[], t: number, tl: number, corre: boolean): { ch: Camera; bg: Camera } {
  const k = interpolate(t, [r.da, r.a], [0, 1], clamp);
  const spinta = 1 + 0.045 * k;
  const deriva = (r.da * 37) % 2 > 1 ? 1 : -1; // verso della deriva, diverso da ripresa a ripresa
  const f = attori[Math.min(r.fuoco, attori.length - 1)];
  let scala = 1, fx = 540, fy = 990;
  if (r.quadro === "largo" || !f) {
    // un po' piu' vicino e piu' in basso: la testa (anche di chi e' seduto) resta sopra la scritta, che sta a y 1190
    scala = 1.12 * spinta; fx = 540 + deriva * 14 * k;
    fy = attori.some((a) => a.posa === "seduto" || a.posa === "cade") ? 1160 : 1050;
  }
  else if (r.quadro === "medio") {
    scala = 1.72 * spinta;
    fx = attori.length > 1 && r.fuoco === 0 ? attori.reduce((n, a) => n + a.x, 0) / attori.length : f.x;
    fy = TERRA - 320 + abbassa(f.posa, f.tl) * 0.6 + deriva * 8 * k;
  } else {
    scala = 2.9 * spinta;
    const altezza = (f.p.stile.altezza ?? 1);
    fx = f.x + f.verso * 18 + deriva * 6 * k;
    fy = TERRA - ALTEZZA_TESTA * altezza + abbassa(f.posa, f.tl) + 48;
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

const Panchina: React.FC<{ da: number; a: number }> = ({ da, a }) => (
  <g>
    <rect x={da} y={TERRA - 132} width={a - da} height={26} rx={8} fill="#5C6E82" />
    <rect x={da} y={TERRA - 240} width={a - da} height={84} rx={14} fill="#4A5B6E" />
    {[da + 30, a - 30, (da + a) / 2].map((x, i) => <rect key={i} x={x - 9} y={TERRA - 110} width={18} height={110} fill="#2E3742" />)}
  </g>
);

const Pallone: React.FC<{ x: number; y: number; giro: number }> = ({ x, y, giro }) => (
  <g transform={`translate(${x} ${y}) rotate(${giro})`}>
    <circle r={19} fill="#F6F6F2" />
    {[0, 72, 144, 216, 288].map((g) => <circle key={g} cx={Math.cos((g * Math.PI) / 180) * 11} cy={Math.sin((g * Math.PI) / 180) * 11} r={4.5} fill="#23262B" />)}
  </g>
);

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
  const attori: Attore[] = s.personaggi.flatMap((pr, i) => {
    const p = cast.get(pr.id);
    const tlA = pr.posa === "cade" && giaCaduto(pr.id) ? tl + 3 : tl; // resta a terra, non ricade
    return p ? [{ p, posa: pr.posa, espr: pr.espressione, x: XPOS[pr.posizione] ?? 540, verso: vv[i], seme: i + s.n, tl: tlA }] : [];
  });
  const lista = riprese(s, attori.length);
  const r = lista.find((x) => t >= x.da && t < x.a) ?? lista[lista.length - 1];
  const corre = attori.some((a) => a.posa === "corre");
  const { ch, bg } = camere(r, attori, t, tl, corre);
  const tipo = s.cartello?.tipo;
  const tlc = s === scene[0] ? tl - 2.5 : tl; // nella prima scena il cartello entra dopo il badge grande
  const lavagna = s.inquadratura === "dall_alto" || tipo === "lavagna";
  const scelta = tipo === "scelta" || t >= props.scelta.da;
  const pezzo = s.pezzi.find((p) => t >= p.da && t < p.a) ?? (t < s.pezzi[0]?.da ? undefined : s.pezzi[s.pezzi.length - 1]);
  const tu = cast.get("tu");
  const notifica = tipo === "notifica";
  const bgCam = notifica ? { ...bg, blur: Math.max(bg.blur, 6) } : bg;

  // oggetti di scena
  const seduti = attori.filter((a) => a.posa === "seduto");
  const calciatore = attori.find((a) => a.posa === "calcia");
  const lanciatore = attori.find((a) => a.posa === "lancia");
  const bersaglio = lanciatore ? attori.find((a) => a !== lanciatore) : undefined;

  const mondo = (
    <svg viewBox="0 0 1080 1920" width="1080" height="1920" style={{ position: "absolute", inset: 0 }}>
      <g transform={`translate(540 960) scale(${ch.scala}) translate(${-ch.fx} ${-ch.fy})`}>
        {seduti.length > 0 && <Panchina da={Math.min(...seduti.map((a) => a.x)) - 170} a={Math.max(...seduti.map((a) => a.x)) + 170} />}
        {corre && [0, 1, 2, 3, 4].map((i) => {
          const y = TERRA - 120 - i * 80, sp = ((tl * 900 + i * 230) % 1200);
          return <rect key={i} x={1180 - sp} y={y} width={160 + (i % 2) * 90} height={6} rx={3} fill="#FFFFFF" opacity={0.28} />;
        })}
        {attori.map((a, i) => (
          <g key={i} transform={`translate(${a.x} ${TERRA}) scale(${a.verso * (a.p.stile.altezza ?? 1)} ${a.p.stile.altezza ?? 1})`}>
            <Omino p={a.p} posa={a.posa} espr={a.espr} t={t} tl={a.tl} seme={a.seme} verso={a.verso} />
          </g>
        ))}
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
        {notifica && <div style={{ position: "absolute", inset: 0, background: "rgba(8,10,14,.35)" }} />}
      </>)}

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
      <Audio src={staticFile("suoni/musica.mp3")} volume={(f) => {
        const ft = f / fps;
        const silenzio = scene.find((x) => ft >= x.da && ft < x.a)?.suono === "silenzio";
        return silenzio ? 0.02 : 0.085 * Math.min(1, ft / 1.2) * Math.min(1, (props.durata - ft) / 1.2);
      }} />
      {scene.map((x, i) => {
        const da = Math.round(x.da * fps), lungo = Math.max(1, Math.round((x.a - x.da) * fps));
        const stadio = ["stadio", "panchina"].includes(props.luoghi[x.luogo]?.tipo ?? "");
        const calcia = x.personaggi.some((p) => p.posa === "calcia");
        const file: Record<string, string> = { fischio: "fischio", boato: "boato", fischi_stadio: "fischi_stadio", notifica: "ding", whoosh: "whoosh", calcio_pallone: "calcio_pallone" };
        return (
          <React.Fragment key={i}>
            {i > 0 && <Sequence from={Math.max(0, da - 3)} durationInFrames={20} layout="none"><Audio src={staticFile("suoni/whoosh.mp3")} volume={0.16} /></Sequence>}
            {x.cartello && x.cartello.tipo !== "scelta" && <Sequence from={da + (i === 0 ? Math.round(2.5 * fps) : 3)} durationInFrames={15} layout="none"><Audio src={staticFile("suoni/pop.mp3")} volume={0.3} /></Sequence>}
            {(stadio || x.suono === "folla") && x.suono !== "silenzio" && (
              <Sequence from={da} durationInFrames={lungo} layout="none"><Audio src={staticFile("suoni/folla.mp3")} loop volume={x.suono === "folla" ? 0.32 : 0.12} /></Sequence>
            )}
            {file[x.suono] && (
              <Sequence from={da + Math.round((x.suono === "calcio_pallone" && calcia ? ISTANTE_CALCIO : 0.1) * fps)} durationInFrames={Math.round(3.5 * fps)} layout="none">
                <Audio src={staticFile(`suoni/${file[x.suono]}.mp3`)} volume={x.suono === "boato" ? 0.55 : 0.45} />
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
