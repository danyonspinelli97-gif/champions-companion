import React, { useMemo } from "react";
import * as THREE from "three";
import {
  Easing,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { PLANETS, SUN_SIZE, orbitalPosition } from "./planets";
import {
  CAMERA_FAR,
  CAMERA_NEAR,
  cameraStateAtFrame,
} from "./camera";

// A 2D overlay that projects each planet's 3D position to the screen using a
// camera identical to the scene's, then places a name label above it. The
// labels fade in one by one and track the moving planets.
export const Labels: React.FC = () => {
  const frame = useCurrentFrame();
  const { width, height, fps, durationInFrames } = useVideoConfig();
  const seconds = frame / fps;

  const camera = useMemo(
    () =>
      new THREE.PerspectiveCamera(
        38,
        width / height,
        CAMERA_NEAR,
        CAMERA_FAR,
      ),
    [width, height],
  );

  const cam = cameraStateAtFrame(frame, durationInFrames);
  camera.position.set(cam.position[0], cam.position[1], cam.position[2]);
  camera.fov = cam.fov;
  camera.lookAt(0, 0, 0);
  camera.updateProjectionMatrix();
  camera.updateMatrixWorld();

  const camPos = new THREE.Vector3(
    cam.position[0],
    cam.position[1],
    cam.position[2],
  );
  const sunPos = new THREE.Vector3(0, 0, 0);

  const firstLabel = fps * 1.0;
  const stagger = fps * 1.2;

  const items = PLANETS.map((planet, i) => {
    const [x, y, z] = orbitalPosition(planet, seconds);
    const world = new THREE.Vector3(x, y + planet.size + 0.4, z);
    const ndc = world.clone().project(camera);

    const behindCamera = ndc.z > 1;
    const sx = (ndc.x * 0.5 + 0.5) * width;
    const sy = (-ndc.y * 0.5 + 0.5) * height;

    // Occlusion: hide the label if the planet sits behind the Sun's disc.
    const planetCentre = new THREE.Vector3(x, y, z);
    const dPlanet = camPos.distanceTo(planetCentre);
    const dSun = camPos.distanceTo(sunPos);
    let occluded = false;
    if (dPlanet > dSun) {
      const sunNdc = sunPos.clone().project(camera);
      const sunSx = (sunNdc.x * 0.5 + 0.5) * width;
      const sunSy = (-sunNdc.y * 0.5 + 0.5) * height;
      // approximate sun screen radius
      const edge = new THREE.Vector3(SUN_SIZE, 0, 0).project(camera);
      const edgeSx = (edge.x * 0.5 + 0.5) * width;
      const sunR = Math.abs(edgeSx - sunSx) + 40;
      const dist = Math.hypot(sx - sunSx, sy - sunSy);
      occluded = dist < sunR;
    }

    const appear = interpolate(
      frame,
      [firstLabel + i * stagger, firstLabel + i * stagger + fps * 0.7],
      [0, 1],
      {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
        easing: Easing.bezier(0.16, 1, 0.3, 1),
      },
    );

    const opacity = behindCamera || occluded ? 0 : appear;

    return { name: planet.name, sx, sy, opacity };
  });

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        pointerEvents: "none",
        fontFamily:
          "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      }}
    >
      {items.map((it) => (
        <div
          key={it.name}
          style={{
            position: "absolute",
            left: it.sx,
            top: it.sy,
            transform: "translate(-50%, -100%)",
            opacity: it.opacity,
          }}
        >
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 6,
            }}
          >
            <span
              style={{
                color: "rgba(255,255,255,0.95)",
                fontSize: 19,
                fontWeight: 600,
                letterSpacing: 3,
                textTransform: "uppercase",
                whiteSpace: "nowrap",
                textShadow: "0 0 10px rgba(0,0,0,0.9), 0 1px 2px rgba(0,0,0,0.8)",
              }}
            >
              {it.name}
            </span>
            <span
              style={{
                width: 1,
                height: 16,
                background:
                  "linear-gradient(to bottom, rgba(255,255,255,0.7), rgba(255,255,255,0))",
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
};
