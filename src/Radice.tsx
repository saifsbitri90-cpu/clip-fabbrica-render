import React from "react";
import { Composition } from "remotion";
import { Puntata } from "./serie/Puntata";
import { Scheda } from "./serie/Scheda";
import { propsPuntataVuote, type PropsPuntata } from "./serie/tipi";

// 18/11/2026: il 3D (Voxel, VoxelHD, Personaggio Quaternius) è in archivio-3d/, fuori dal render.
// Serie a puntate in 2D: la durata arriva da public/props.json (strumenti/serie_voce.py).
const FPS = 30;

export const Radice: React.FC = () => (
  <>
    <Composition
      id="Puntata"
      component={Puntata}
      width={1080}
      height={1920}
      fps={FPS}
      durationInFrames={FPS * 10}
      defaultProps={propsPuntataVuote}
      calculateMetadata={({ props }: { props: PropsPuntata }) => ({
        durationInFrames: Math.max(FPS * 3, Math.ceil(props.durata * FPS)),
      })}
    />
    {/* scheda personaggi: un fotogramma per personaggio del copione (stessi props della puntata) */}
    <Composition
      id="Scheda"
      component={Scheda}
      width={1080}
      height={1920}
      fps={FPS}
      durationInFrames={1}
      defaultProps={propsPuntataVuote}
      calculateMetadata={({ props }: { props: PropsPuntata }) => ({
        durationInFrames: Math.max(1, props.personaggi.length),
      })}
    />
  </>
);
