import { Easing, interpolate } from "remotion";

export const CAMERA_FOV = 38;
export const CAMERA_NEAR = 0.1;
export const CAMERA_FAR = 4000;

const deg = (d: number) => (d * Math.PI) / 180;

export type CameraState = {
  position: [number, number, number];
  fov: number;
};

// A slow cinematic move: pull back (radius grows), tilt a little higher, and
// drift in azimuth so the whole system is slowly revealed over 30 seconds.
export const cameraStateAtFrame = (
  frame: number,
  durationInFrames: number,
): CameraState => {
  const p = interpolate(frame, [0, durationInFrames - 1], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.inOut(Easing.ease),
  });

  const radius = interpolate(p, [0, 1], [118, 232]);
  const elevation = deg(interpolate(p, [0, 1], [18, 33]));
  const azimuth = deg(interpolate(p, [0, 1], [8, 34]));

  const position: [number, number, number] = [
    radius * Math.cos(elevation) * Math.sin(azimuth),
    radius * Math.sin(elevation),
    radius * Math.cos(elevation) * Math.cos(azimuth),
  ];

  return { position, fov: CAMERA_FOV };
};
