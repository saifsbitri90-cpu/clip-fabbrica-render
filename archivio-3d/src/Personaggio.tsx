// Prova del 18/11/2026: un personaggio con ossatura vera (Quaternius, CC0) dentro la catena Remotion.
// Modelli in public/modelli: corpo "Superhero_Male" (unico uomo della versione gratuita), capelli,
// 43 animazioni della Universal Animation Library (stessa ossatura a 65 ossa: si applicano per nome).
// I vestiti non esistono nel pacchetto gratuito: si dipingono sul corpo per osso (giacca, felpa,
// pantaloni, scarpe) con i colori del concept di Saif; ricci, catena, borsa e tasche sono geometrie
// agganciate alle ossa. Regia alla bob.figures.it.out: stacchi netti, inquadrature fisse con un lento
// avvicinamento. Tutto dipende dal fotogramma: l'animazione si posa con action.time, niente useFrame.
import React, { useEffect, useMemo, useState } from "react";
import * as THREE from "three";
import { GLTFLoader, type GLTF } from "three/examples/jsm/loaders/GLTFLoader.js";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { useThree } from "@react-three/fiber";
import { AbsoluteFill, Audio, Sequence, cancelRender, continueRender, delayRender, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { ThreeCanvas } from "@remotion/three";

export const DURATA_PERSONAGGIO = 13.5;

// ------------------------------------------------------------ colori del concept
const COLORI = {
  giacca: "#6B1E2A", // bordeaux dei pannelli della giacca
  nero: "#161618", // felpa e maniche
  pantaloni: "#1E1E22", // cargo neri
  scarpa: "#7A1F2B",
  punta: "#141414",
  suola: "#EDEDED",
  capelli: "#1C1411",
  argento: "#E4E4E4",
  borsa: "#2B2B30",
};

// ------------------------------------------------------------ inquadrature (regia alla Bob)
type Inq = { pos: [number, number, number]; look: [number, number, number]; fov: number };
type Colpo = { da: number; a: number; clip: string; dove: [number, number, number]; giro: number; inq: Inq; tempoGlobale?: boolean };

const IN_PIEDI: [number, number, number] = [-0.85, 0, 0.55];
const SEDUTO: [number, number, number] = [0.3, 0, -0.5];
const BALLO: [number, number, number] = [0, 0, 1.35];

const COLPI: Colpo[] = [
  { da: 0, a: 3.5, clip: "Idle_Talking_Loop", dove: IN_PIEDI, giro: 0.18, tempoGlobale: true,
    inq: { pos: [-0.55, 1.2, 5.1], look: [-0.7, 0.95, 0.3], fov: 34 } },
  { da: 3.5, a: 6.5, clip: "Idle_Talking_Loop", dove: IN_PIEDI, giro: 0.18, tempoGlobale: true,
    inq: { pos: [-0.62, 1.66, 1.75], look: [-0.83, 1.6, 0.55], fov: 30 } },
  { da: 6.5, a: 10, clip: "Sitting_Talking_Loop", dove: SEDUTO, giro: 0,
    inq: { pos: [0.15, 1.15, 4.3], look: [0.2, 0.72, -0.6], fov: 37 } },
  { da: 10, a: DURATA_PERSONAGGIO, clip: "Dance_Loop", dove: BALLO, giro: 0,
    inq: { pos: [0, 1.15, 4.7], look: [0, 0.92, 1.35], fov: 36 } },
];

// ------------------------------------------------------------ caricamento
type Modelli = { corpo: GLTF; capelli: GLTF; clip: THREE.AnimationClip[] };

function useModelli(): Modelli | null {
  const [attesa] = useState(() => delayRender("Carico i modelli Quaternius", { timeoutInMilliseconds: 120000 }));
  const [modelli, setModelli] = useState<Modelli | null>(null);
  useEffect(() => {
    const l = new GLTFLoader();
    Promise.all([
      l.loadAsync(staticFile("modelli/Superhero_Male_FullBody.gltf")),
      l.loadAsync(staticFile("modelli/Hair_SimpleParted.gltf")),
      l.loadAsync(staticFile("modelli/animazioni.glb")),
    ])
      .then(([corpo, capelli, anim]) => {
        setModelli({ corpo, capelli, clip: anim.animations });
        continueRender(attesa);
      })
      .catch((e) => cancelRender(e));
  }, [attesa]);
  return modelli;
}

// ------------------------------------------------------------ costruzione del personaggio
const hash = (n: number) => { const s = Math.sin(n * 127.1) * 43758.5453; return s - Math.floor(s); };

/** regione del corpo dall'osso che pesa di piu' sul vertice (posizione in posa di riposo, Y in alto) */
function regione(osso: string, y: number): keyof typeof COLORI | "pelle" {
  if (/^(index|middle|pinky|ring|thumb)_|^hand_/.test(osso)) return "pelle";
  if (osso === "Head") return "pelle";
  if (osso === "neck_01") return y < 1.53 ? "nero" : "pelle"; // collo della felpa
  if (/^(spine_03|clavicle_|upperarm_)/.test(osso)) return "giacca";
  if (/^(spine_01|spine_02|lowerarm_)/.test(osso)) return "nero";
  if (/^(pelvis|thigh_|calf_)/.test(osso)) return "pantaloni";
  if (/^foot_/.test(osso)) return y < 0.035 ? "suola" : "scarpa";
  if (/^ball_/.test(osso)) return y < 0.035 ? "suola" : "punta";
  return "nero";
}

/** divide il corpo in due gruppi di triangoli: pelle (texture originale) e vestiti (colori per vertice) */
function vesti(corpo: THREE.SkinnedMesh) {
  const g = corpo.geometry;
  const pos = g.getAttribute("position");
  const si = g.getAttribute("skinIndex");
  const sw = g.getAttribute("skinWeight");
  const ossa = corpo.skeleton.bones.map((b) => b.name);
  const n = pos.count;
  const colori = new Float32Array(n * 3);
  const pelle = new Uint8Array(n);
  const c = new THREE.Color();
  for (let v = 0; v < n; v++) {
    let migliore = 0, peso = -1;
    for (let k = 0; k < 4; k++) {
      const w = sw.getComponent(v, k);
      if (w > peso) { peso = w; migliore = si.getComponent(v, k); }
    }
    const r = regione(ossa[migliore] ?? "", pos.getY(v));
    if (r === "pelle") { pelle[v] = 1; c.set("#FFFFFF"); } else c.set(COLORI[r]);
    colori[v * 3] = c.r; colori[v * 3 + 1] = c.g; colori[v * 3 + 2] = c.b;
  }
  g.setAttribute("color", new THREE.BufferAttribute(colori, 3));
  const indice = g.getIndex();
  if (indice) {
    const a = indice.array;
    const tPelle: number[] = [], tVesti: number[] = [];
    for (let t = 0; t < a.length; t += 3) {
      const tri = [a[t], a[t + 1], a[t + 2]];
      (tri.every((i) => pelle[i]) ? tPelle : tVesti).push(...tri);
    }
    g.setIndex([...tPelle, ...tVesti]);
    g.clearGroups();
    g.addGroup(0, tPelle.length, 0);
    g.addGroup(tPelle.length, tVesti.length, 1);
  }
  const pelleMat = (corpo.material as THREE.MeshStandardMaterial).clone();
  pelleMat.vertexColors = false; // COLOR_0 del file e' una maschera, non un colore
  const vestiMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.82, metalness: 0 });
  corpo.material = [pelleMat, vestiMat];
}

function materiale(colore: string, ruvido = 0.8, metallo = 0) {
  return new THREE.MeshStandardMaterial({ color: colore, roughness: ruvido, metalness: metallo });
}

type Personaggio3D = { radice: THREE.Group; mixer: THREE.AnimationMixer[]; clip: Map<string, THREE.AnimationClip> };

function costruisci(m: Modelli): Personaggio3D {
  const radice = new THREE.Group();
  const corpo = m.corpo.scene;
  const capelli = m.capelli.scene;
  radice.add(corpo, capelli);

  corpo.traverse((o) => {
    const mesh = o as THREE.SkinnedMesh;
    if (!mesh.isMesh) return;
    mesh.castShadow = true; mesh.receiveShadow = true; mesh.frustumCulled = false;
    if (mesh.name === "SuperHero_Male") vesti(mesh);
    else {
      const mat = (mesh.material as THREE.MeshStandardMaterial).clone();
      mat.vertexColors = false;
      if (mesh.name === "Eyebrows") {
        mat.color.set(COLORI.capelli);
        // sopracciglia piu' spesse, come nel concept
        const p = mesh.geometry.getAttribute("position");
        for (let v = 0; v < p.count; v++) { p.setY(v, 1.712 + (p.getY(v) - 1.712) * 1.7); p.setZ(v, p.getZ(v) + 0.002); }
        p.needsUpdate = true;
      }
      mesh.material = mat;
    }
  });
  capelli.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (!mesh.isMesh) return;
    mesh.castShadow = true; mesh.frustumCulled = false;
    const mat = (mesh.material as THREE.MeshStandardMaterial).clone();
    mat.color.set(COLORI.capelli);
    mesh.material = mat;
  });

  // accessori: posizionati in posa di riposo e agganciati alle ossa con attach() (tiene la posizione)
  radice.updateMatrixWorld(true);
  const osso = (nome: string) => corpo.getObjectByName(nome)!;
  const aggancia = (mesh: THREE.Object3D, nome: string) => { radice.add(mesh); mesh.updateMatrixWorld(true); osso(nome).attach(mesh); };

  // ricci: sfere sulla calotta della testa (il pacchetto gratuito non ha capelli ricci)
  const centro = new THREE.Vector3(0, 1.75, -0.015);
  const punti: { p: THREE.Vector3; r: number }[] = [];
  const N = 220;
  for (let k = 0; k < N; k++) {
    const y = 1 - (2 * (k + 0.5)) / N, rr = Math.sqrt(1 - y * y), phi = k * 2.399963;
    const d = new THREE.Vector3(Math.cos(phi) * rr, y, Math.sin(phi) * rr);
    const sopra = d.y > -0.05;
    const nuca = d.z < -0.25 && d.y > -0.55;
    const ciuffo = d.z > 0.55 && d.y > 0.12; // frangia sulla fronte
    const lato = Math.abs(d.x) > 0.75 && d.y > -0.35 && d.z < 0.35;
    if (!(sopra || nuca || lato) || (d.z > 0.62 && d.y < 0.12 && !ciuffo)) continue;
    const raggio = 0.027 + hash(k) * 0.013;
    punti.push({ p: centro.clone().add(new THREE.Vector3(d.x * 0.094, d.y * 0.094, d.z * 0.1)), r: raggio });
  }
  const ricci = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 14, 10), materiale(COLORI.capelli, 0.72), punti.length);
  const mtx = new THREE.Matrix4();
  punti.forEach((q, k) => { mtx.compose(q.p, new THREE.Quaternion(), new THREE.Vector3(q.r, q.r * 0.9, q.r)); ricci.setMatrixAt(k, mtx); });
  ricci.castShadow = true; ricci.frustumCulled = false;
  aggancia(ricci, "Head");

  // catena d'argento al collo
  const catena = new THREE.Mesh(new THREE.TorusGeometry(0.083, 0.0045, 8, 48), materiale(COLORI.argento, 0.3, 0.7));
  catena.position.set(0, 1.5, 0.018);
  catena.rotation.set(Math.PI / 2 - 0.42, 0, 0);
  aggancia(catena, "spine_03");

  // borsa a tracolla: cinghia dalla spalla destra al fianco sinistro, borsa scura senza marchi
  const curva = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-0.15, 1.49, 0.0), new THREE.Vector3(-0.07, 1.36, 0.16),
    new THREE.Vector3(0.06, 1.17, 0.155), new THREE.Vector3(0.16, 1.0, 0.165),
  ]);
  const cinghia = new THREE.Mesh(new THREE.TubeGeometry(curva, 40, 0.011, 6, false), materiale("#151515", 0.6));
  cinghia.castShadow = true;
  aggancia(cinghia, "spine_02");
  const borsa = new THREE.Mesh(new RoundedBoxGeometry(0.21, 0.15, 0.07, 3, 0.02), materiale(COLORI.borsa, 0.55));
  borsa.position.set(0.17, 0.95, 0.18);
  borsa.castShadow = true;
  aggancia(borsa, "spine_02");

  // tasche cargo sulle cosce
  for (const lato of [1, -1]) {
    const tasca = new THREE.Mesh(new RoundedBoxGeometry(0.05, 0.17, 0.15, 2, 0.015), materiale("#26262B", 0.85));
    tasca.position.set(lato * 0.165, 0.6, 0.0);
    tasca.castShadow = true;
    aggancia(tasca, lato > 0 ? "thigh_l" : "thigh_r");
  }

  // il fisico da supereroe e' largo: lo si stringe un po' per avvicinarsi al ragazzo del concept
  radice.scale.set(0.9, 1, 0.9);

  return {
    radice,
    mixer: [new THREE.AnimationMixer(corpo), new THREE.AnimationMixer(capelli)],
    clip: new Map(m.clip.map((c) => [c.name, c])),
  };
}

/** posa deterministica: un solo clip attivo, al tempo esatto del fotogramma */
function posa(p: Personaggio3D, nome: string, tempo: number) {
  const clip = p.clip.get(nome);
  if (!clip) return;
  const locale = ((tempo % clip.duration) + clip.duration) % clip.duration;
  for (const mx of p.mixer) {
    mx.stopAllAction();
    const azione = mx.clipAction(clip);
    azione.reset();
    azione.play();
    azione.time = locale;
    mx.update(0);
  }
}

// ------------------------------------------------------------ salotto
const geo = new Map<string, THREE.BufferGeometry>();
function scatola(l: number, a: number, p: number, r: number) {
  const k = `${l}|${a}|${p}|${r}`;
  if (!geo.has(k)) geo.set(k, new RoundedBoxGeometry(l, a, p, 3, r));
  return geo.get(k)!;
}
const B: React.FC<{ p: [number, number, number]; s: [number, number, number]; c: string; r?: number; e?: number; ruvido?: number }> = ({ p, s, c, r = 0.03, e = 0, ruvido = 0.8 }) => (
  <mesh position={p} geometry={scatola(s[0], s[1], s[2], Math.min(r, s[0] / 2.1, s[1] / 2.1, s[2] / 2.1))} castShadow receiveShadow>
    <meshStandardMaterial color={c} roughness={ruvido} emissive={c} emissiveIntensity={e} />
  </mesh>
);

const Salotto: React.FC = () => (
  <group>
    <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow><planeGeometry args={[14, 14]} /><meshStandardMaterial color="#9A6B45" roughness={0.7} /></mesh>
    <mesh position={[0, 2.5, -1.45]} receiveShadow><planeGeometry args={[14, 5]} /><meshStandardMaterial color="#D8C8AE" roughness={0.95} /></mesh>
    <B p={[0, 0.06, -1.44]} s={[14, 0.12, 0.03]} c="#F1E8D8" r={0.005} />
    {/* divano: seduta a 0,44 m, dove arriva il bacino dell'animazione da seduto (0,54 m) */}
    <B p={[0.15, 0.15, -0.82]} s={[2.3, 0.3, 0.9]} c="#3F5D7D" r={0.05} />
    <B p={[-0.38, 0.37, -0.76]} s={[1.02, 0.15, 0.74]} c="#46668A" r={0.06} />
    <B p={[0.68, 0.37, -0.76]} s={[1.02, 0.15, 0.74]} c="#46668A" r={0.06} />
    <B p={[0.15, 0.68, -1.17]} s={[2.3, 0.62, 0.22]} c="#3F5D7D" r={0.07} />
    <B p={[-1.08, 0.48, -0.82]} s={[0.2, 0.42, 0.9]} c="#3A5674" r={0.07} />
    <B p={[1.38, 0.48, -0.82]} s={[0.2, 0.42, 0.9]} c="#3A5674" r={0.07} />
    {/* tavolino e tappeto */}
    <B p={[0.2, 0.012, 0.35]} s={[2.4, 0.024, 1.5]} c="#E9E1D2" r={0.01} />
    <B p={[0.35, 0.36, 0.42]} s={[1.0, 0.05, 0.5]} c="#B07A4C" r={0.02} ruvido={0.5} />
    {[[-0.1, 0.22], [0.8, 0.22], [-0.1, 0.62], [0.8, 0.62]].map(([x, z], k) => <B key={k} p={[x, 0.17, z]} s={[0.05, 0.34, 0.05]} c="#8A5D38" r={0.01} />)}
    <B p={[0.55, 0.42, 0.45]} s={[0.12, 0.07, 0.12]} c="#F3F0EA" r={0.02} />
    {/* lampada, quadro, pianta */}
    <B p={[-1.55, 0.3, -1.05]} s={[0.4, 0.6, 0.4]} c="#8A5D38" r={0.03} />
    <B p={[-1.55, 0.78, -1.05]} s={[0.05, 0.36, 0.05]} c="#2A2A2A" r={0.01} />
    <B p={[-1.55, 1.08, -1.05]} s={[0.34, 0.26, 0.34]} c="#FFE2B0" r={0.04} e={0.9} />
    <B p={[0.15, 1.75, -1.42]} s={[1.2, 0.72, 0.04]} c="#5A3B26" r={0.01} />
    <B p={[0.15, 1.75, -1.395]} s={[1.08, 0.6, 0.01]} c="#7FA7C9" r={0.002} />
    <B p={[0.0, 1.68, -1.385]} s={[0.7, 0.22, 0.008]} c="#4F7A5B" r={0.002} />
    <B p={[0.4, 1.86, -1.385]} s={[0.12, 0.12, 0.008]} c="#F6D27A" r={0.002} e={0.4} />
    <B p={[1.7, 0.22, -1.0]} s={[0.32, 0.44, 0.32]} c="#C9B79C" r={0.05} />
    {[0, 1, 2, 3, 4].map((k) => (
      <mesh key={k} position={[1.7 + Math.cos(k * 1.3) * 0.12, 0.62 + k * 0.09, -1.0 + Math.sin(k * 1.3) * 0.12]} castShadow>
        <sphereGeometry args={[0.17 - k * 0.018, 14, 10]} /><meshStandardMaterial color={["#3E7A47", "#4A8A52", "#36703F"][k % 3]} roughness={0.8} />
      </mesh>
    ))}
  </group>
);

// ------------------------------------------------------------ telecamera e personaggio per fotogramma
const Telecamera: React.FC<{ t: number }> = ({ t }) => {
  const { camera } = useThree();
  const colpo = COLPI.find((c) => t >= c.da && t < c.a) ?? COLPI[COLPI.length - 1];
  const dentro = t - colpo.da;
  const pos = new THREE.Vector3(...colpo.inq.pos);
  const look = new THREE.Vector3(...colpo.inq.look);
  const avvicina = 1 - Math.min(0.1, dentro * 30 * 0.002); // lento avvicinamento: mai un fermo immagine
  pos.sub(look).multiplyScalar(avvicina).add(look);
  camera.position.copy(pos);
  camera.lookAt(look);
  (camera as THREE.PerspectiveCamera).fov = colpo.inq.fov;
  (camera as THREE.PerspectiveCamera).updateProjectionMatrix();
  return null;
};

const Attore: React.FC<{ p: Personaggio3D; t: number }> = ({ p, t }) => {
  const colpo = COLPI.find((c) => t >= c.da && t < c.a) ?? COLPI[COLPI.length - 1];
  p.radice.position.set(...colpo.dove);
  p.radice.rotation.set(0, colpo.giro, 0);
  posa(p, colpo.clip, colpo.tempoGlobale ? t : t - colpo.da);
  return <primitive object={p.radice} />;
};

// ------------------------------------------------------------ composizione
export const Personaggio: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  const modelli = useModelli();
  const attore = useMemo(() => (modelli ? costruisci(modelli) : null), [modelli]);

  return (
    <AbsoluteFill style={{ background: "#D8C8AE" }}>
      <ThreeCanvas width={1080} height={1920} dpr={2} shadows gl={{ antialias: true }} camera={{ fov: 34, position: [0, 1.2, 5] }}>
        <Telecamera t={t} />
        <hemisphereLight args={["#FFF3E0", "#6B4A33", 0.75]} />
        <directionalLight position={[-2.5, 4.5, 4]} intensity={2.3} color="#FFE6C7" castShadow
          shadow-mapSize-width={2048} shadow-mapSize-height={2048} shadow-camera-left={-3} shadow-camera-right={3}
          shadow-camera-top={3} shadow-camera-bottom={-3} shadow-bias={-0.0004} shadow-radius={5} />
        <pointLight position={[2.2, 1.8, 2.5]} intensity={5} distance={9} color="#BFD4FF" />
        <pointLight position={[-1.55, 1.15, -0.85]} intensity={2.5} distance={3.5} color="#FFC37A" />
        <Salotto />
        {attore ? <Attore p={attore} t={t} /> : null}
      </ThreeCanvas>
      <Audio src={staticFile("suoni/musica.mp3")} volume={(f) => 0.22 * Math.min(1, f / 15) * Math.min(1, (DURATA_PERSONAGGIO * fps - f) / 30)} />
      {COLPI.slice(1).map((c, k) => (
        <Sequence key={k} from={Math.max(0, Math.round((c.da - 0.1) * fps))} layout="none">
          <Audio src={staticFile("suoni/whoosh.mp3")} volume={0.35} />
        </Sequence>
      ))}
    </AbsoluteFill>
  );
};
