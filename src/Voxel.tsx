// Scena 3D a blocchi nello stile dei reel "fatti con Claude" (personaggio arancione a cubi,
// stanza notturna, scritte su strisce di carta). Tutto e' guidato dal numero del fotogramma:
// niente useFrame(), cosi' il render e' identico a ogni esecuzione (regola di Remotion).
import React from "react";
import { AbsoluteFill, Audio, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { ThreeCanvas } from "@remotion/three";

export type Parola = { t: number; d: number; w: string };
export type Scena = { da: number; a: number; titolo: string };
export type PropsVoxel = {
  durata: number;          // secondi di voce
  parole: Parola[];        // tempi di ogni parola (edge-tts)
  scene: Scena[];          // titoli sulle strisce di carta
  colore: string;          // colore del personaggio
  audio: string;           // file in public/
};

export const propsVuote: PropsVoxel = { durata: 5, parole: [], scene: [], colore: "#E8743B", audio: "" };

const Blocco: React.FC<{ pos: [number, number, number]; dim: [number, number, number]; colore: string }> = ({ pos, dim, colore }) => (
  <mesh position={pos}>
    <boxGeometry args={dim} />
    <meshStandardMaterial color={colore} roughness={0.55} />
  </mesh>
);

const Personaggio: React.FC<{ colore: string; parla: boolean; t: number }> = ({ colore, parla, t }) => {
  const salto = Math.abs(Math.sin(t * 2.2)) * 0.06;
  const braccio = parla ? Math.sin(t * 9) * 0.5 : Math.sin(t * 1.5) * 0.12;
  const bocca = parla ? 0.08 + Math.abs(Math.sin(t * 14)) * 0.12 : 0.05;
  return (
    <group position={[0, -0.6 + salto, 0]} rotation={[0, Math.sin(t * 0.7) * 0.25, 0]}>
      <Blocco pos={[0, 0.6, 0]} dim={[1.4, 1.1, 0.9]} colore={colore} />
      <Blocco pos={[-0.32, 0.78, 0.46]} dim={[0.16, 0.06, 0.02]} colore="#2B1B12" />
      <Blocco pos={[0.32, 0.78, 0.46]} dim={[0.16, 0.06, 0.02]} colore="#2B1B12" />
      <Blocco pos={[0, 0.45, 0.46]} dim={[0.3, bocca, 0.02]} colore="#2B1B12" />
      <group position={[-0.85, 0.55, 0]} rotation={[0, 0, 0.4 + braccio]}>
        <Blocco pos={[0, -0.25, 0]} dim={[0.25, 0.6, 0.3]} colore={colore} />
      </group>
      <group position={[0.85, 0.55, 0]} rotation={[0, 0, -0.4 - braccio]}>
        <Blocco pos={[0, -0.25, 0]} dim={[0.25, 0.6, 0.3]} colore={colore} />
      </group>
      <Blocco pos={[-0.3, -0.15, 0]} dim={[0.3, 0.45, 0.35]} colore={colore} />
      <Blocco pos={[0.3, -0.15, 0]} dim={[0.3, 0.45, 0.35]} colore={colore} />
    </group>
  );
};

const Striscia: React.FC<{ testo: string; entrata: number }> = ({ testo, entrata }) => (
  <div style={{
    position: "absolute", top: 260, left: "50%", maxWidth: 900,
    transform: `translateX(-50%) rotate(-2deg) scale(${entrata})`,
    background: "#F4ECD8", color: "#1E1A16", padding: "22px 38px",
    fontFamily: "Arial Black, Arial, sans-serif", fontSize: 64, letterSpacing: 1, textAlign: "center",
    boxShadow: "0 10px 30px rgba(0,0,0,.45)", textTransform: "uppercase",
  }}>{testo}</div>
);

export const Voxel: React.FC<PropsVoxel> = ({ parole, scene, colore, audio }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  const parlaOra = parole.some((p) => t >= p.t && t <= p.t + p.d);
  const scena = scene.find((s) => t >= s.da && t < s.a);
  const entrata = scena ? spring({ frame: frame - Math.round(scena.da * fps), fps, config: { damping: 12 } }) : 0;
  // sottotitoli: gruppi di 3 parole, quella detta in arancione
  const i = parole.findIndex((p) => t >= p.t && t < p.t + Math.max(p.d, 0.25));
  const inizioGruppo = i >= 0 ? i - (i % 3) : -1;
  const gruppo = inizioGruppo >= 0 ? parole.slice(inizioGruppo, inizioGruppo + 3) : [];
  const zoom = interpolate(t, [0, 30], [6.2, 5.2], { extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ background: "linear-gradient(#141833, #2A2350)" }}>
      <ThreeCanvas width={1080} height={1920} camera={{ position: [0, 0.6, zoom], fov: 45 }}>
        <ambientLight intensity={0.55} />
        <directionalLight position={[3, 5, 4]} intensity={1.4} />
        <pointLight position={[-3, 2, 2]} intensity={6} color="#FFB36B" />
        <Personaggio colore={colore} parla={parlaOra} t={t} />
        <Blocco pos={[0, -1.15, 0]} dim={[6, 0.3, 4]} colore="#3B2F2A" />
        <Blocco pos={[1.7, -0.75, 0.6]} dim={[0.45, 0.5, 0.45]} colore="#EDE6DA" />
      </ThreeCanvas>
      {scena ? <Striscia testo={scena.titolo} entrata={entrata} /> : null}
      <div style={{
        position: "absolute", bottom: 420, width: "100%", textAlign: "center",
        fontFamily: "Arial Black, Arial, sans-serif", fontSize: 78, color: "white",
        textShadow: "0 0 12px #000, 0 4px 0 #000", textTransform: "uppercase",
      }}>
        {gruppo.map((p, k) => (
          <span key={k} style={{ color: inizioGruppo + k === i ? "#FF8A3D" : "white", margin: "0 12px" }}>{p.w}</span>
        ))}
      </div>
      {audio ? <Audio src={staticFile(audio)} /> : null}
    </AbsoluteFill>
  );
};
