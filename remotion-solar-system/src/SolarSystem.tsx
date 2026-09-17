import React, { useMemo } from "react";
import * as THREE from "three";
import { ThreeCanvas } from "@remotion/three";
import { AbsoluteFill, useVideoConfig } from "remotion";
import { PLANETS, SUN_MAP } from "./planets";
import { useTextures } from "./useTextures";
import { Scene3D } from "./Scene3D";
import { Labels } from "./Labels";
import { CAMERA_FAR, CAMERA_NEAR, CAMERA_FOV } from "./camera";

export const SolarSystem: React.FC = () => {
  const { width, height } = useVideoConfig();

  // Gather every texture and note which ones are colour (sRGB) maps.
  const { urls, srgb } = useMemo(() => {
    const u: string[] = [SUN_MAP];
    const s: string[] = [SUN_MAP];
    for (const p of PLANETS) {
      u.push(p.map);
      s.push(p.map);
      if (p.bumpMap) u.push(p.bumpMap);
      if (p.specularMap) u.push(p.specularMap);
      if (p.cloudMap) {
        u.push(p.cloudMap);
        s.push(p.cloudMap);
      }
      if (p.ring) {
        u.push(p.ring.map);
        s.push(p.ring.map);
      }
    }
    return { urls: Array.from(new Set(u)), srgb: s };
  }, []);

  const textures = useTextures(urls, srgb);

  return (
    <AbsoluteFill style={{ backgroundColor: "#02030a" }}>
      <ThreeCanvas
        width={width}
        height={height}
        camera={{
          fov: CAMERA_FOV,
          near: CAMERA_NEAR,
          far: CAMERA_FAR,
          position: [0, 40, 120],
        }}
        gl={{
          antialias: true,
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 1.05,
        }}
        style={{ position: "absolute", inset: 0 }}
      >
        {textures ? <Scene3D textures={textures} /> : null}
      </ThreeCanvas>

      {/* Labels track the planets in screen space. */}
      <Labels />

      {/* Cinematic vignette. */}
      <AbsoluteFill
        style={{
          pointerEvents: "none",
          background:
            "radial-gradient(ellipse at 50% 50%, rgba(0,0,0,0) 55%, rgba(0,0,0,0.55) 100%)",
        }}
      />
    </AbsoluteFill>
  );
};
