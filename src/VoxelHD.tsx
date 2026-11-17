// Voxel HD: dialogo fra "tu" e il blocco arancione di Claude, nello stile dei reel di riferimento
// (morrow.studio3d, viralspymedia, withhammad). Regole prese da mromidev/claude-animated-shorts:
// telecamera mai ferma (avvicinamento 0,15-0,35% a fotogramma), spostamenti morbidi di 18-40
// fotogrammi, inclinazioni di 3-5 gradi, scossone sugli attacchi, battito di ciglia ogni 0,5-2,3 s,
// reazioni qualche fotogramma prima della parola. Tutto dipende dal fotogramma: niente useFrame.
import React, { useMemo } from "react";
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { useThree } from "@react-three/fiber";
import { AbsoluteFill, Audio, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { ThreeCanvas } from "@remotion/three";
import { loadFont } from "@remotion/google-fonts/Poppins";

const { fontFamily } = loadFont("normal", { weights: ["800"], subsets: ["latin"] });

export type ParolaHD = { t: number; d: number; w: string; chi: string };
export type ScenaHD = { da: number; a: number; chi: string; inquadratura?: "largo" | "medio" | "primo"; card?: { titolo: string; valore: string } };
export type PropsVoxelHD = { durata: number; parole: ParolaHD[]; scene: ScenaHD[]; etichetta: string; audio: string; evidenzia: string[] };
export const propsVoxelHDVuote: PropsVoxelHD = { durata: 5, parole: [], scene: [], etichetta: "", audio: "", evidenzia: [] };

// ------------------------------------------------------------ strumenti

const smootherstep = (x: number) => { const t = Math.min(1, Math.max(0, x)); return t * t * t * (t * (t * 6 - 15) + 10); };
const hash = (n: number) => { const s = Math.sin(n * 127.1) * 43758.5453; return s - Math.floor(s); };

/** chiuso (0-1) per il battito di ciglia: 4 fotogrammi, intervalli fra 0,5 e 2,3 s, diversi per personaggio */
function ciglia(frame: number, fps: number, seme: number): number {
  let inizio = 0, k = 0;
  while (inizio <= frame) {
    const prossimo = inizio + Math.round((0.5 + hash(seme * 31 + k) * 1.8) * fps);
    if (frame >= prossimo && frame < prossimo + 4) return 1 - Math.abs(frame - prossimo - 1.5) / 2;
    inizio = prossimo; k++;
    if (k > 400) break;
  }
  return 0;
}

const geometrie = new Map<string, THREE.BufferGeometry>();
function cubo(w: number, h: number, d: number, r = 0.06): THREE.BufferGeometry {
  const chiave = `${w}|${h}|${d}|${r}`;
  if (!geometrie.has(chiave)) geometrie.set(chiave, new RoundedBoxGeometry(w, h, d, 3, Math.min(r, w / 2, h / 2, d / 2)));
  return geometrie.get(chiave)!;
}

const Blocco: React.FC<{ p: [number, number, number]; s: [number, number, number]; c: string; r?: number; e?: number; rot?: [number, number, number] }> = ({ p, s, c, r, e = 0, rot }) => (
  <mesh geometry={cubo(s[0], s[1], s[2], r)} position={p} rotation={rot} castShadow receiveShadow>
    <meshStandardMaterial color={c} roughness={0.62} metalness={0.02} emissive={c} emissiveIntensity={e} />
  </mesh>
);

// ------------------------------------------------------------ personaggi

type Stato = { parla: boolean; apertura: number; spinta: number; chiusi: number; salto: number; gesto: number; guarda: number };

function stato(chi: string, parole: ParolaHD[], scene: ScenaHD[], t: number, frame: number, fps: number, seme: number): Stato {
  const anticipo = 2 / fps; // la reazione arriva 2 fotogrammi prima della parola
  const mie = parole.filter((p) => p.chi === chi);
  const attiva = mie.find((p) => t + anticipo >= p.t && t + anticipo <= p.t + p.d);
  const indice = attiva ? mie.indexOf(attiva) : -1;
  const apertura = attiva ? 0.35 + 0.65 * Math.abs(Math.sin((t - attiva.t) * Math.PI / Math.max(attiva.d, 0.12) * 1.5)) : 0;
  const ultimaParola = [...mie].reverse().find((p) => p.t <= t + anticipo);
  const spinta = ultimaParola ? Math.exp(-((t + anticipo - ultimaParola.t) * 9)) : 0; // la testa segue l'attacco di ogni parola
  const scena = scene.find((s) => t >= s.da && t < s.a);
  const inizioMia = scena && scena.chi === chi ? t - scena.da : 99;
  const salto = inizioMia < 0.6 ? Math.sin(inizioMia / 0.6 * Math.PI) : 0;
  const gesto = attiva && indice % 3 === 0 ? Math.sin(Math.min(1, (t - attiva.t) / 0.35) * Math.PI) : 0;
  const altro = scena && scena.chi !== chi ? 1 : 0;
  return { parla: !!attiva, apertura, spinta, chiusi: ciglia(frame, fps, seme), salto, gesto, guarda: altro };
}

const Claude: React.FC<{ x: number; st: Stato; t: number }> = ({ x, st, t }) => {
  const schiaccia = 1 - st.salto * 0.12 + Math.sin(t * 2.6) * 0.012;
  const y = st.salto * 0.45 + Math.abs(Math.sin(t * 2.6)) * 0.02;
  const occhio = 0.07 * (1 - st.chiusi) + 0.012;
  return (
    <group position={[x, y, 0]} rotation={[0, -0.35 + st.guarda * 0.25 + st.spinta * 0.05, st.spinta * 0.04]} scale={[1 / Math.sqrt(schiaccia), schiaccia, 1 / Math.sqrt(schiaccia)]}>
      <Blocco p={[0, 0.78, 0]} s={[1.25, 0.95, 0.95]} c="#E8743B" r={0.12} />
      {/* occhi a "^ ^" quando parla, puntini quando ascolta */}
      {st.parla ? (<>
        <Blocco p={[-0.25, 0.92, 0.48]} s={[0.2, 0.05, 0.03]} c="#2B1B12" r={0.02} rot={[0, 0, 0.5]} />
        <Blocco p={[-0.15, 0.92, 0.48]} s={[0.2, 0.05, 0.03]} c="#2B1B12" r={0.02} rot={[0, 0, -0.5]} />
        <Blocco p={[0.15, 0.92, 0.48]} s={[0.2, 0.05, 0.03]} c="#2B1B12" r={0.02} rot={[0, 0, 0.5]} />
        <Blocco p={[0.25, 0.92, 0.48]} s={[0.2, 0.05, 0.03]} c="#2B1B12" r={0.02} rot={[0, 0, -0.5]} />
      </>) : (<>
        <Blocco p={[-0.22, 0.9, 0.48]} s={[0.1, occhio * 2, 0.03]} c="#2B1B12" r={0.02} />
        <Blocco p={[0.22, 0.9, 0.48]} s={[0.1, occhio * 2, 0.03]} c="#2B1B12" r={0.02} />
      </>)}
      <Blocco p={[0, 0.62, 0.48]} s={[0.26, 0.04 + st.apertura * 0.12, 0.03]} c="#3A1F18" r={0.015} />
      <group position={[-0.72, 0.72, 0]} rotation={[0, 0, 0.5 + st.gesto * 1.1 + Math.sin(t * 1.7) * 0.06]}>
        <Blocco p={[0, -0.18, 0]} s={[0.18, 0.42, 0.24]} c="#E8743B" r={0.07} />
      </group>
      <group position={[0.72, 0.72, 0]} rotation={[0, 0, -0.5 - Math.sin(t * 1.9) * 0.06]}>
        <Blocco p={[0, -0.18, 0]} s={[0.18, 0.42, 0.24]} c="#E8743B" r={0.07} />
      </group>
      <Blocco p={[-0.28, 0.12, 0]} s={[0.24, 0.3, 0.3]} c="#D9652E" r={0.07} />
      <Blocco p={[0.28, 0.12, 0]} s={[0.24, 0.3, 0.3]} c="#D9652E" r={0.07} />
    </group>
  );
};

const Tu: React.FC<{ x: number; st: Stato; t: number }> = ({ x, st, t }) => {
  const respiro = 1 + Math.sin(t * 2.2) * 0.01;
  const y = st.salto * 0.3;
  const occhio = 0.06 * (1 - st.chiusi) + 0.01;
  const braccio = -0.15 - st.gesto * 1.4;
  return (
    <group position={[x, y, 0]} rotation={[0, 0.35 - st.guarda * 0.25 - st.spinta * 0.05, -st.spinta * 0.04]}>
      {/* gambe e scarpe */}
      <Blocco p={[-0.17, 0.42, 0]} s={[0.26, 0.84, 0.3]} c="#2D3142" r={0.06} />
      <Blocco p={[0.17, 0.42, 0]} s={[0.26, 0.84, 0.3]} c="#2D3142" r={0.06} />
      <Blocco p={[-0.17, 0.05, 0.05]} s={[0.3, 0.12, 0.4]} c="#F1F1F1" r={0.04} />
      <Blocco p={[0.17, 0.05, 0.05]} s={[0.3, 0.12, 0.4]} c="#F1F1F1" r={0.04} />
      {/* maglietta nera */}
      <group scale={[1, respiro, 1]}>
        <Blocco p={[0, 1.22, 0]} s={[0.78, 0.82, 0.42]} c="#141414" r={0.08} />
      </group>
      <group position={[-0.5, 1.55, 0]} rotation={[0, 0, -braccio * 0.3 + Math.sin(t * 1.6) * 0.05]}>
        <Blocco p={[0, -0.32, 0]} s={[0.2, 0.7, 0.24]} c="#141414" r={0.07} />
        <Blocco p={[0, -0.72, 0]} s={[0.2, 0.18, 0.22]} c="#E0AC86" r={0.06} />
      </group>
      <group position={[0.5, 1.55, 0]} rotation={[st.gesto * -0.6, 0, braccio * -0.6]}>
        <Blocco p={[0, -0.32, 0]} s={[0.2, 0.7, 0.24]} c="#141414" r={0.07} />
        <Blocco p={[0, -0.72, 0]} s={[0.2, 0.18, 0.22]} c="#E0AC86" r={0.06} />
      </group>
      {/* testa: segue l'attacco delle parole */}
      <group position={[0, 1.98, 0]} rotation={[-st.spinta * 0.12, 0, Math.sin(t * 1.3) * 0.03]}>
        <Blocco p={[0, 0.06, 0]} s={[0.66, 0.7, 0.6]} c="#E0AC86" r={0.1} />
        <Blocco p={[0, 0.43, -0.04]} s={[0.72, 0.18, 0.66]} c="#1E1A18" r={0.07} />
        <Blocco p={[0.12, 0.36, 0.26]} s={[0.5, 0.12, 0.18]} c="#1E1A18" r={0.05} rot={[0, 0, -0.2]} />
        <Blocco p={[0, -0.18, 0.27]} s={[0.56, 0.24, 0.1]} c="#2A211D" r={0.06} />
        <Blocco p={[-0.15, 0.1, 0.31]} s={[0.09, occhio * 2, 0.03]} c="#1A1310" r={0.02} />
        <Blocco p={[0.15, 0.1, 0.31]} s={[0.09, occhio * 2, 0.03]} c="#1A1310" r={0.02} />
        <Blocco p={[0, -0.13, 0.33]} s={[0.18, 0.03 + st.apertura * 0.09, 0.02]} c="#3A1F18" r={0.01} />
      </group>
    </group>
  );
};

// ------------------------------------------------------------ palco e telecamera

const Palco: React.FC<{ t: number }> = ({ t }) => {
  const piastrelle = useMemo(() => {
    const out: { x: number; z: number; c: string }[] = [];
    for (let i = -3; i <= 3; i++) for (let j = -2; j <= 2; j++) out.push({ x: i * 0.62, z: j * 0.62, c: (i + j) % 2 === 0 ? "#3B4A6B" : "#33415F" });
    return out;
  }, []);
  return (
    <group>
      {piastrelle.map((p, k) => <Blocco key={k} p={[p.x, -0.08, p.z]} s={[0.6, 0.16, 0.6]} c={p.c} r={0.04} />)}
      <gridHelper args={[60, 60, "#5B6CFF", "#2B3A8C"]} position={[0, -0.5, 0]} />
      <Blocco p={[1.95, 0.3, -0.9]} s={[0.36, 0.6, 0.36]} c="#F2EBDD" r={0.05} />
      <Blocco p={[-2.0, 0.25, -1.0]} s={[0.5, 0.5, 0.5]} c="#7C5CFF" r={0.06} e={0.25 + 0.1 * Math.sin(t * 2)} />
    </group>
  );
};

type Inq = { pos: THREE.Vector3; look: THREE.Vector3; fov: number };
// In verticale l'angolo orizzontale e' stretto (fov 36 -> circa 21 gradi in larghezza): i due
// personaggi stanno vicini e la ripresa larga sta lontana. Claude e' piu' basso di "tu":
// ogni personaggio ha la sua altezza degli occhi e del busto (correzione del 17/11, v2 tagliava).
const POSIZIONI = { claude: 0.8, tu: -0.8 } as Record<string, number>;
const OCCHI = { claude: 0.92, tu: 2.08 } as Record<string, number>;
const BUSTO = { claude: 0.75, tu: 1.35 } as Record<string, number>;

function inquadratura(s: ScenaHD | undefined): Inq {
  const chi = s?.chi ?? "tu";
  const x = POSIZIONI[chi] ?? 0;
  const tipo = s?.inquadratura ?? "medio";
  if (tipo === "largo") return { pos: new THREE.Vector3(0, 1.9, 9.0), look: new THREE.Vector3(0, 1.0, 0), fov: 38 };
  if (tipo === "primo") return { pos: new THREE.Vector3(x * 0.7, OCCHI[chi] + 0.12, chi === "claude" ? 3.0 : 3.4),
    look: new THREE.Vector3(x, OCCHI[chi] - 0.08, 0), fov: 34 };
  return { pos: new THREE.Vector3(x * 0.5, BUSTO[chi] + 0.45, 5.6), look: new THREE.Vector3(x, BUSTO[chi] + 0.15, 0), fov: 36 };
}

const Telecamera: React.FC<{ scene: ScenaHD[]; t: number; fps: number }> = ({ scene, t, fps }) => {
  const { camera } = useThree();
  const i = Math.max(0, scene.findIndex((s) => t >= s.da && t < s.a));
  const ora = scene[i], prima = scene[i - 1];
  const dentro = ora ? t - ora.da : 0;
  const durataMossa = 30 / fps; // spostamento morbido di 30 fotogrammi
  const k = smootherstep(dentro / durataMossa);
  const a = inquadratura(prima ?? ora), b = inquadratura(ora);
  const pos = a.pos.clone().lerp(b.pos, k);
  const look = a.look.clone().lerp(b.look, k);
  const avvicina = 1 - Math.min(0.12, dentro * fps * 0.0025); // 0,25% a fotogramma, mai fermo
  pos.sub(look).multiplyScalar(avvicina).add(look);
  const scossone = Math.exp(-dentro * 9) * Math.sin(dentro * 60) * 0.035; // impatto sull'attacco della battuta
  pos.x += scossone;
  camera.position.copy(pos);
  camera.lookAt(look);
  camera.rotateZ(((i % 2 ? 1 : -1) * 3.5 * Math.PI) / 180 * k); // inclinazione 3,5 gradi alternata
  (camera as THREE.PerspectiveCamera).fov = a.fov + (b.fov - a.fov) * k;
  (camera as THREE.PerspectiveCamera).updateProjectionMatrix();
  return null;
};

// ------------------------------------------------------------ composizione

export const VoxelHD: React.FC<PropsVoxelHD> = ({ parole, scene, etichetta, audio, evidenzia }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  const scena = scene.find((s) => t >= s.da && t < s.a);
  const stClaude = stato("claude", parole, scene, t, frame, fps, 7);
  const stTu = stato("tu", parole, scene, t, frame, fps, 3);
  const i = parole.findIndex((p) => t >= p.t && t < p.t + Math.max(p.d, 0.22));
  const g0 = i >= 0 ? i - (i % 3) : -1;
  const gruppo = g0 >= 0 ? parole.slice(g0, g0 + 3) : [];
  const chiave = new Set(evidenzia.map((w) => w.toLowerCase()));
  const entrataCard = scena?.card ? spring({ frame: frame - Math.round(scena.da * fps) - 6, fps, config: { damping: 13 } }) : 0;

  return (
    <AbsoluteFill style={{ background: "radial-gradient(120% 80% at 50% 35%, #1B2A6B 0%, #0B1033 55%, #05071A 100%)" }}>
      {/* luci sfocate dietro la scena: il "bokeh" degli esempi, senza costo di render 3D */}
      {[...Array(14)].map((_, k) => (
        <div key={k} style={{ position: "absolute", left: `${hash(k) * 100}%`, top: `${8 + hash(k + 40) * 45}%`, width: 60 + hash(k + 9) * 120, height: 60 + hash(k + 9) * 120,
          borderRadius: "50%", background: ["#5B6CFF", "#FF7AD9", "#47E6FF", "#FFB36B"][k % 4], opacity: 0.18 + 0.12 * Math.sin(t * 0.8 + k), filter: "blur(22px)",
          transform: `translateX(${Math.sin(t * 0.3 + k) * 20}px)` }} />
      ))}
      <ThreeCanvas width={1080} height={1920} dpr={2} shadows gl={{ antialias: true, alpha: true }} camera={{ fov: 40, position: [0, 2, 6] }}>
        <Telecamera scene={scene} t={t} fps={fps} />
        <fog attach="fog" args={["#0B1033", 9, 22]} />
        <hemisphereLight args={["#AFC3FF", "#2A1E3A", 0.55]} />
        <directionalLight position={[3.5, 6, 4]} intensity={2.2} color="#FFE2BF" castShadow
          shadow-mapSize-width={2048} shadow-mapSize-height={2048} shadow-camera-left={-5} shadow-camera-right={5}
          shadow-camera-top={5} shadow-camera-bottom={-5} shadow-bias={-0.0004} shadow-radius={6} />
        <pointLight position={[-3, 2.5, -2]} intensity={18} distance={10} color="#6E7BFF" />
        <pointLight position={[2.5, 1.2, 3]} intensity={6} distance={8} color="#FFB36B" />
        <Palco t={t} />
        <Tu x={POSIZIONI.tu} st={stTu} t={t} />
        <Claude x={POSIZIONI.claude} st={stClaude} t={t + 0.4} />
      </ThreeCanvas>
      {etichetta ? (
        <div style={{ position: "absolute", top: 170, width: "100%", display: "flex", justifyContent: "center" }}>
          <div style={{ fontFamily, fontWeight: 800, fontSize: 38, color: "#0B1033", background: "#F4ECD8", padding: "10px 26px", borderRadius: 999,
            boxShadow: "0 10px 30px rgba(0,0,0,.4)", letterSpacing: 1, textTransform: "uppercase" }}>{etichetta}</div>
        </div>) : null}
      {scena?.card ? (
        <div style={{ position: "absolute", top: 300, left: "50%", transform: `translateX(-50%) scale(${entrataCard}) rotate(-2deg)`, background: "rgba(14,18,48,.82)",
          border: "2px solid #5B6CFF", borderRadius: 26, padding: "26px 44px", textAlign: "center", fontFamily, color: "#fff", boxShadow: "0 18px 50px rgba(0,0,0,.5)" }}>
          <div style={{ fontSize: 34, fontWeight: 800, opacity: 0.8, letterSpacing: 2 }}>{scena.card.titolo}</div>
          <div style={{ fontSize: 96, fontWeight: 800, color: "#FFD400", lineHeight: 1.05 }}>{scena.card.valore}</div>
        </div>) : null}
      <div style={{ position: "absolute", bottom: 400, width: "100%", textAlign: "center", fontFamily, fontWeight: 800, fontSize: 86,
        color: "#fff", textTransform: "uppercase", WebkitTextStroke: "10px #000", paintOrder: "stroke fill", padding: "0 50px" }}>
        {gruppo.map((p, k) => {
          const pulita = p.w.toLowerCase().replace(/[^a-zà-ù0-9]/g, "");
          const colore = g0 + k === i ? (chiave.has(pulita) ? "#FFD400" : "#FFFFFF") : "rgba(255,255,255,.55)";
          const sc = g0 + k === i ? interpolate(t - p.t, [0, 0.08], [1.18, 1], { extrapolateRight: "clamp" }) : 1;
          return <span key={k} style={{ color: colore, display: "inline-block", margin: "0 14px", transform: `scale(${sc})` }}>{p.w}</span>;
        })}
      </div>
      {audio ? <Audio src={staticFile(audio)} /> : null}
    </AbsoluteFill>
  );
};
