// Lavagna tattica vista dall'alto: il nostro equivalente delle mappe di Stickocalypse. Campo verticale
// (entra intero nel 9:16), due squadre a pallini, "TU" evidenziato che corre lungo una freccia che si
// disegna, il pallone che lo segue. Il cartello dà il titolo (testo) e l'etichetta della freccia (valore).
import React from "react";
import { interpolate } from "remotion";
import { OSWALD } from "./font";
import { GIALLO } from "./Scritte";

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const CASA: [number, number][] = [[540, 1690], [250, 1520], [420, 1550], [660, 1550], [830, 1520], [230, 1280], [430, 1320], [650, 1320], [850, 1280], [430, 1080], [650, 1080]];
const OSPITI: [number, number][] = [[540, 330], [250, 500], [420, 470], [660, 470], [830, 500], [250, 720], [440, 690], [640, 690], [830, 720], [440, 900], [640, 900]];

export const Lavagna: React.FC<{ testo: string; valore: string; tl: number; durata: number; maglia: string }> = ({ testo, valore, tl, durata, maglia }) => {
  const fine = Math.max(1.2, durata - 0.4);
  const k = interpolate(tl, [0.25, fine], [0, 1], clamp);
  const ease = k * k * (3 - 2 * k);
  // freccia di "TU": dalla panchina (bordo destro) verso l'area avversaria
  const p0 = [1010, 1200], p1 = [760, 1000], p2 = [560, 560];
  const q = (s: number) => [
    (1 - s) * (1 - s) * p0[0] + 2 * (1 - s) * s * p1[0] + s * s * p2[0],
    (1 - s) * (1 - s) * p0[1] + 2 * (1 - s) * s * p1[1] + s * s * p2[1],
  ];
  const [tx, ty] = q(ease);
  const lunghezza = 900;
  const ondeggia = (i: number) => Math.sin(tl * 2 + i) * 6;
  return (
    <div style={{ position: "absolute", inset: 0, background: "#1F3A25" }}>
      <svg viewBox="0 0 1080 1920" width="1080" height="1920" style={{ position: "absolute", inset: 0 }}>
        <defs>
          <marker id="punta" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
            <path d="M 0 0 L 10 5 L 0 10 z" fill={GIALLO} />
          </marker>
        </defs>
        {Array.from({ length: 10 }).map((_, i) => <rect key={i} x={60} y={160 + i * 165} width={960} height={82} fill="#25442B" />)}
        <g fill="none" stroke="#D9E6DA" strokeWidth={6} opacity={0.85}>
          <rect x={60} y={160} width={960} height={1650} rx={4} />
          <line x1={60} y1={985} x2={1020} y2={985} />
          <circle cx={540} cy={985} r={130} />
          <rect x={270} y={160} width={540} height={250} />
          <rect x={410} y={160} width={260} height={90} />
          <rect x={270} y={1560} width={540} height={250} />
          <rect x={410} y={1720} width={260} height={90} />
        </g>
        <rect x={470} y={130} width={140} height={32} fill="#D9E6DA" opacity={0.85} />
        {OSPITI.map(([x, y], i) => <circle key={`o${i}`} cx={x + ondeggia(i)} cy={y} r={30} fill="#C9443A" stroke="#F3E3E0" strokeWidth={6} />)}
        {CASA.map(([x, y], i) => <circle key={`c${i}`} cx={x - ondeggia(i)} cy={y - 380 * ease * (i > 4 ? 0.25 : 0.1)} r={30} fill={maglia} stroke="#E6ECF5" strokeWidth={6} />)}
        <path d={`M ${p0[0]} ${p0[1]} Q ${p1[0]} ${p1[1]} ${p2[0]} ${p2[1]}`} fill="none" stroke={GIALLO} strokeWidth={14} strokeLinecap="round"
          strokeDasharray={lunghezza} strokeDashoffset={lunghezza * (1 - ease)} markerEnd={ease > 0.95 ? "url(#punta)" : undefined} opacity={0.95} />
        <circle cx={tx} cy={ty} r={42} fill={GIALLO} stroke="#14171C" strokeWidth={7} />
        <text x={tx} y={ty + 14} textAnchor="middle" fontFamily={OSWALD} fontWeight={700} fontSize={40} fill="#14171C">TU</text>
        <circle cx={tx + 46} cy={ty - 30} r={16} fill="#fff" stroke="#14171C" strokeWidth={4} />
      </svg>
      {testo && <div style={{ position: "absolute", left: 0, right: 0, top: 210, display: "flex", justifyContent: "center" }}>
        <div style={{ background: "#12161D", color: "#fff", fontFamily: OSWALD, fontWeight: 700, fontSize: 56, letterSpacing: 3, padding: "6px 26px",
          borderRadius: 10, textTransform: "uppercase" }}>{testo}</div>
      </div>}
      {valore && <div style={{ position: "absolute", left: Math.min(tx + 70, 700), top: ty - 30, background: GIALLO, color: "#14171C",
        fontFamily: OSWALD, fontWeight: 700, fontSize: 42, padding: "2px 14px", borderRadius: 8, opacity: ease > 0.2 ? 1 : 0, textTransform: "uppercase" }}>{valore}</div>}
    </div>
  );
};
