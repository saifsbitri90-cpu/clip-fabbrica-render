// Personaggi a pezzi: le immagini disegnate dal committente (corpi senza testa, teste senza bocca, bocche),
// preparate da lavoro/pezzi/strumenti/prepara_pezzi.py in public/serie/pezzi/<id>/ con un rig.json.
// Si muovono come pupazzi di carta: pose scambiate secondo il copione, testa sul suo perno (il mento),
// battito di ciglia, respiro, bocca guidata da Rhubarb sulla voce. Niente specchiatura: ogni verso ha i suoi
// disegni («dx» guarda a destra, «sx» a sinistra), cosi' il numero di maglia resta dritto.
import React from "react";
import { Img, staticFile } from "remotion";
import rigTu from "../../public/serie/pezzi/tu/rig.json";
import rigSantoro from "../../public/serie/pezzi/santoro/rig.json";
import type { Espressione, Posa, Vista } from "./tipi";

type Pezzo = { f: string; w: number; h: number; s: number };
type Corpo = Pezzo & { collo: number[] };
type Testa = Pezzo & { bocca: number[] };
type Insieme = { corpi: Record<string, Corpo>; teste: Record<string, Testa>; bocche: Record<string, Pezzo> };
type Spostamento = { dx: number; dy: number; rot: number };
export type Rig = {
  id: string; overlap: number; testa_dx: number; centro_testa: number;
  rhubarb: Record<string, string>; riposo: Record<string, string>; pose: Record<string, Spostamento>; set: Record<string, Insieme>;
};

/** personaggi che hanno i pezzi: gli altri restano disegnati in codice (Omino) */
export const RIGS: Record<string, Rig> = { tu: rigTu as unknown as Rig, santoro: rigSantoro as unknown as Rig };

const TAU = Math.PI * 2;

/** Quale corpo, quale testa e quale bocca in questo istante. tl = tempo dall'inizio dell'azione (puo' essere negativo). */
export function scegli(rig: Rig, verso: 1 | -1, o: {
  posa: Posa; espr: Espressione; tl: number; t: number; vista: Vista; seme: number; parlando: number; forma: string | null;
}): { insieme: string; corpo: string; testa: string; bocca: string } {
  const insieme = verso === 1 ? (rig.set.dx ? "dx" : "sx") : (rig.set.sx ? "sx" : "dx");
  const st = rig.set[insieme];
  const c = (n: string) => (n in st.corpi ? n : "in_piedi");
  let corpo = "in_piedi";
  if (o.vista === "fronte" && "fronte" in st.corpi) corpo = "fronte";
  else if (o.vista === "schiena" && "schiena" in st.corpi) corpo = "schiena";
  else switch (o.posa) {
    case "seduto": corpo = c("seduto"); break;
    case "alzati": corpo = o.tl < 0 ? c("seduto") : o.tl < 0.3 ? c("si_alza") : "in_piedi"; break;
    case "cade": corpo = o.tl < 0.15 ? "in_piedi" : o.tl < 0.75 ? c("cade") : c("a_terra"); break;
    case "a_terra": corpo = c("a_terra"); break;
    case "zoppica": case "cammina": corpo = c(`zoppica_${(Math.floor(Math.max(0, o.tl) / 0.2) % 4) + 1}`); break;
    case "blocca": corpo = o.tl < 0 ? "in_piedi" : c("blocca"); break;
    case "indica": corpo = o.tl < 0 ? "in_piedi" : c("indica"); break;
    case "parla": corpo = c("parla"); break;
    default: corpo = "in_piedi";
  }
  const fronte = corpo === "fronte";
  const t = (n: string) => (n in st.teste ? n : null);
  // battito di ciglia: 0,1 s ogni 3-4 s, sfasato per personaggio
  const periodo = 3.4 + (o.seme % 3) * 0.35;
  const chiusi = (o.t + o.seme * 0.77) % periodo < 0.1;
  let testa = fronte
    ? (chiusi && t("fronte_occhi_chiusi")) || t(`fronte_${o.espr}`) || t("fronte_neutra") || "neutra"
    : (chiusi && t("occhi_chiusi")) || t(o.espr) || "neutra";
  if (corpo === "schiena") testa = t("schiena") ?? testa;
  // bocca: forma di Rhubarb mentre parla; altrimenti quella a riposo dell'espressione
  let bocca = rig.riposo[o.espr] ?? rig.riposo.neutra;
  if (o.forma) bocca = rig.rhubarb[o.forma] ?? bocca;
  else if (o.parlando > 0) bocca = rig.rhubarb[o.parlando > 0.6 ? "D" : o.parlando > 0.4 ? "C" : "B"] ?? bocca;
  if (!(bocca in st.bocche)) bocca = rig.riposo.neutra;
  return { insieme, corpo, testa, bocca };
}

/** Un personaggio a pezzi, in coordinate del mondo (piedi in x, terra). Va dentro lo strato HTML della telecamera. */
export const Pupazzo: React.FC<{
  rig: Rig; x: number; terra: number; alt: number; verso: 1 | -1; t: number; seme: number; parla: boolean;
  scelta: { insieme: string; corpo: string; testa: string; bocca: string }; altezzaTesta: number;
}> = ({ rig, x, terra, alt, verso, t, seme, parla, scelta, altezzaTesta }) => {
  const st = rig.set[scelta.insieme];
  const f = scelta.insieme === "dx" ? 1 : -1; // verso del disegno
  const gira = f !== verso; // nessun disegno nel verso giusto: si specchia (solo come riserva)
  const k = (altezzaTesta * alt) / rig.centro_testa;
  const c = st.corpi[scelta.corpo], tt = st.teste[scelta.testa], b = st.bocche[scelta.bocca];
  const po = rig.pose[scelta.corpo] ?? { dx: 0, dy: 0, rot: 0 };
  const respiro = 0.008 * Math.sin(TAU * (t / 2.6) + seme);
  const cw = c.w * c.s * k, ch = c.h * c.s * k;
  const colloY = -(c.h - c.collo[1]) * c.s * k * (1 + respiro);
  const W = tt.w * tt.s * k, H = tt.h * tt.s * k;
  const cx = f * (rig.testa_dx + po.dx) * W;
  const fondo = colloY + (rig.overlap + po.dy) * H;
  // la testa ondeggia appena; mentre parla annuisce un poco (azione secondaria, piccola)
  const rot = f * po.rot + 1.1 * Math.sin(TAU * (t / 2.9) + seme * 1.3) + (parla ? 1.6 * Math.sin(TAU * 2.1 * t) : 0);
  const bw = b.w * b.s * k, bh = b.h * b.s * k;
  const src = (p: Pezzo) => staticFile(`serie/pezzi/${rig.id}/${p.f.split("/").slice(-2).join("/")}`);
  return (
    <div style={{ position: "absolute", left: x, top: terra, width: 0, height: 0, transform: gira ? "scaleX(-1)" : undefined }}>
      {/* ombra per terra */}
      <div style={{ position: "absolute", left: -cw * 0.38, top: -12, width: cw * 0.76, height: 24, borderRadius: "50%",
        background: "radial-gradient(ellipse at center, rgba(10,12,16,0.32) 0%, rgba(10,12,16,0) 72%)" }} />
      <Img src={src(c)} style={{ position: "absolute", left: -c.collo[0] * c.s * k, top: -ch, width: cw, height: ch,
        transformOrigin: "50% 100%", transform: `scaleY(${1 + respiro})` }} />
      <div style={{ position: "absolute", left: cx - W / 2, top: fondo - H, width: W, height: H,
        transformOrigin: "50% 100%", transform: `rotate(${rot}deg)` }}>
        <Img src={src(tt)} style={{ position: "absolute", left: 0, top: 0, width: W, height: H }} />
        <Img src={src(b)} style={{ position: "absolute", left: tt.bocca[0] * W - bw / 2, top: tt.bocca[1] * H - bh / 2, width: bw, height: bh }} />
      </div>
    </div>
  );
};
