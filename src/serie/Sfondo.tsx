// Fondale della scena: l'illustrazione generata (public/serie/sfondi/<luogo>.jpg) oppure, finché non
// c'è, un fondale disegnato in codice per tipo di luogo. Sopra: nebbia, vignetta e grana, come nei
// video che imitiamo. La telecamera lo muove meno dei personaggi (parallasse) e lo sfoca nei primi piani.
import React from "react";
import { Img, staticFile } from "remotion";
import type { Luogo } from "./tipi";

export type Camera = { scala: number; fx: number; fy: number; blur: number; panX: number };

const Stadio: React.FC<{ panchina?: boolean }> = ({ panchina }) => (
  <svg viewBox="0 0 1080 1920" width="1080" height="1920">
    <defs>
      <linearGradient id="cielo" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#141C29" /><stop offset="0.55" stopColor="#2C3B50" /><stop offset="1" stopColor="#46566A" />
      </linearGradient>
      <radialGradient id="faro" cx="0.5" cy="0.5" r="0.5">
        <stop offset="0" stopColor="#FFF6DC" stopOpacity="0.95" /><stop offset="0.25" stopColor="#FFE9B8" stopOpacity="0.35" /><stop offset="1" stopColor="#FFE9B8" stopOpacity="0" />
      </radialGradient>
      <pattern id="folla" width="26" height="22" patternUnits="userSpaceOnUse">
        <rect width="26" height="22" fill="#232B38" />
        <circle cx="7" cy="8" r="5" fill="#5B6577" /><circle cx="20" cy="15" r="5" fill="#46506A" /><circle cx="20" cy="4" r="3" fill="#7A6E66" />
      </pattern>
      <linearGradient id="nebbia" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#C9D3DE" stopOpacity="0" /><stop offset="0.5" stopColor="#C9D3DE" stopOpacity="0.16" /><stop offset="1" stopColor="#C9D3DE" stopOpacity="0" />
      </linearGradient>
    </defs>
    <rect width="1080" height="1920" fill="url(#cielo)" />
    {[150, 930].map((x) => (
      <g key={x}>
        <rect x={x - 6} y={380} width={12} height={480} fill="#1A212C" />
        <rect x={x - 70} y={300} width={140} height={86} rx={6} fill="#2A3240" />
        <circle cx={x} cy={343} r={260} fill="url(#faro)" />
      </g>
    ))}
    <path d="M -40 820 L 1120 760 L 1120 1190 L -40 1190 Z" fill="url(#folla)" />
    <path d="M -40 820 L 1120 760 L 1120 800 L -40 860 Z" fill="#1B222D" />
    <rect x="-40" y="1170" width="1160" height="70" fill="#1E2631" />
    {[0, 1, 2, 3, 4, 5].map((i) => <rect key={i} x={i * 190 - 20} y={1180} width={170} height={50} rx={3} fill={["#3B4F66", "#5A3E45", "#3E5A4B"][i % 3]} opacity={0.75} />)}
    <rect x="-40" y="1240" width="1160" height="700" fill="#3C6640" />
    {[0, 1, 2, 3, 4, 5, 6].map((i) => (
      <path key={i} d={`M ${-260 + i * 240} 1240 L ${-140 + i * 240} 1240 L ${-500 + i * 360} 1920 L ${-680 + i * 360} 1920 Z`} fill="#467247" opacity={0.7} />
    ))}
    <path d="M -40 1300 L 1120 1290" stroke="#E9EEE6" strokeWidth={8} opacity={0.75} />
    {panchina && (<g>
      <rect x="-40" y="1250" width="1160" height="260" fill="#2B333F" />
      <path d="M -40 1250 Q 540 1150 1120 1250 L 1120 1280 Q 540 1185 -40 1280 Z" fill="#9FB6C8" opacity={0.55} />
      <rect x="-40" y="1500" width="1160" height="420" fill="#53504A" />
    </g>)}
    <rect x="0" y="980" width="1080" height="420" fill="url(#nebbia)" />
  </svg>
);

const Spogliatoio: React.FC = () => (
  <svg viewBox="0 0 1080 1920" width="1080" height="1920">
    <rect width="1080" height="1920" fill="#BDB6A6" />
    {Array.from({ length: 22 }).map((_, i) => <line key={`o${i}`} x1="0" x2="1080" y1={200 + i * 60} y2={200 + i * 60} stroke="#A9A292" strokeWidth={3} />)}
    {Array.from({ length: 12 }).map((_, i) => <line key={`v${i}`} y1="200" y2="1500" x1={i * 96} x2={i * 96} stroke="#A9A292" strokeWidth={3} />)}
    {[0, 1, 2, 3, 4, 5].map((i) => (
      <g key={i}>
        <rect x={20 + i * 176} y={640} width={160} height={820} rx={6} fill="#4F6A78" />
        <rect x={20 + i * 176} y={640} width={160} height={820} rx={6} fill="none" stroke="#3E5663" strokeWidth={6} />
        {[0, 1, 2, 3].map((k) => <rect key={k} x={50 + i * 176} y={690 + k * 22} width={100} height={8} rx={4} fill="#3E5663" />)}
        <circle cx={150 + i * 176} cy={1050} r={8} fill="#C9CFD2" />
      </g>
    ))}
    <rect x="0" y="1460" width="1080" height="460" fill="#8A8273" />
    <rect x="60" y="1400" width="960" height="40" rx={8} fill="#9C7A55" />
    <rect x="0" y="0" width="1080" height="200" fill="#9E9788" />
    <ellipse cx="540" cy="200" rx="420" ry="60" fill="#FFF5DD" opacity={0.25} />
  </svg>
);

const Corridoio: React.FC = () => (
  <svg viewBox="0 0 1080 1920" width="1080" height="1920">
    <rect width="1080" height="1920" fill="#4A4F55" />
    <path d="M 0 0 L 360 700 L 360 1300 L 0 1920 Z" fill="#3A3F45" />
    <path d="M 1080 0 L 720 700 L 720 1300 L 1080 1920 Z" fill="#3A3F45" />
    <path d="M 0 1920 L 360 1300 L 720 1300 L 1080 1920 Z" fill="#5C5953" />
    <rect x="360" y="700" width="360" height="600" fill="#E9EFD9" />
    <rect x="360" y="1100" width="360" height="200" fill="#6F9A5E" />
    {[0, 1, 2].map((i) => <rect key={i} x={430 - i * 70} y={120 + i * 170} width={220 + i * 140} height={18} rx={9} fill="#FFF3D1" opacity={0.7} />)}
    <rect x="360" y="700" width="360" height="600" fill="#FFFFFF" opacity={0.25} />
  </svg>
);

const SalaStampa: React.FC = () => (
  <svg viewBox="0 0 1080 1920" width="1080" height="1920">
    <rect width="1080" height="1920" fill="#25303D" />
    {Array.from({ length: 8 }).map((_, r) => Array.from({ length: 5 }).map((_, c) => (
      <rect key={`${r}-${c}`} x={c * 230 - 40} y={420 + r * 150} width={200} height={130} rx={6} fill={(r + c) % 2 ? "#2F3C4C" : "#34455A"} />
    )))}
    <rect x="0" y="1460" width="1080" height="460" fill="#3B3A3E" />
    <ellipse cx="540" cy="700" rx="460" ry="420" fill="#FFFFFF" opacity={0.06} />
  </svg>
);

const DIPINTI: Record<string, React.FC> = {
  stadio: () => <Stadio />, panchina: () => <Stadio panchina />, spogliatoio: Spogliatoio,
  corridoio: Corridoio, sala_stampa: SalaStampa,
};

export const Sfondo: React.FC<{ luogo: Luogo | undefined; cam: Camera }> = ({ luogo, cam }) => {
  const Dipinto = DIPINTI[luogo?.tipo ?? "stadio"] ?? DIPINTI.stadio;
  return (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden", background: "#1A1F26" }}>
      <div style={{
        position: "absolute", left: 0, top: 0, width: 1080, height: 1920, transformOrigin: "0 0",
        transform: `translate(${540 + cam.panX}px, 960px) scale(${cam.scala}) translate(${-cam.fx}px, ${-cam.fy}px)`,
        // con l'illustrazione si usa la copia gia' sfocata (fatta una volta con ffmpeg): il blur del browser
        // a ogni fotogramma rallentava il render; il filtro resta solo per i fondali disegnati in codice
        filter: cam.blur > 0.3 && !luogo?.img ? `blur(${cam.blur}px)` : undefined,
      }}>
        {luogo?.img
          ? <Img src={staticFile(cam.blur > 0.3 && luogo.sfocata ? luogo.sfocata : luogo.img)}
              style={{ position: "absolute", left: -420, top: 0, width: 1920, height: 1920, objectFit: "cover" }} />
          : <Dipinto />}
      </div>
      {/* nebbia bassa, vignetta, grana */}
      <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, rgba(10,14,20,.28) 0%, rgba(10,14,20,0) 22%, rgba(10,14,20,0) 58%, rgba(10,14,20,.38) 100%)" }} />
      <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse at 50% 46%, rgba(0,0,0,0) 52%, rgba(0,0,0,.42) 100%)" }} />
      {/* grana tolta il 18/11: quasi invisibile e uno dei livelli che rallentavano il render */}
    </div>
  );
};
