import React from "react";
import { Composition } from "remotion";
import { Voxel, PropsVoxel, propsVuote } from "./Voxel";
import { VoxelHD, PropsVoxelHD, propsVoxelHDVuote } from "./VoxelHD";

const FPS = 30;

// La durata arriva dalla voce: props.json contiene i tempi di ogni parola (strumenti/voce*.py).
export const Radice: React.FC = () => (
  <>
    <Composition
      id="Voxel"
      component={Voxel}
      width={1080}
      height={1920}
      fps={FPS}
      durationInFrames={FPS * 10}
      defaultProps={propsVuote}
      calculateMetadata={({ props }: { props: PropsVoxel }) => ({
        durationInFrames: Math.max(FPS * 3, Math.ceil((props.durata + 0.8) * FPS)),
      })}
    />
    <Composition
      id="VoxelHD"
      component={VoxelHD}
      width={1080}
      height={1920}
      fps={FPS}
      durationInFrames={FPS * 10}
      defaultProps={propsVoxelHDVuote}
      calculateMetadata={({ props }: { props: PropsVoxelHD }) => ({
        durationInFrames: Math.max(FPS * 3, Math.ceil((props.durata + 0.6) * FPS)),
      })}
    />
  </>
);
