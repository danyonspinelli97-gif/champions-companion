import { staticFile } from "remotion";

// ---------------------------------------------------------------------------
// Realistic 3D solar-system model.
//
// Everything is in abstract "world units". Real astronomical sizes and
// distances cannot share a screen, so sizes/orbits are *stylised* (compressed)
// while the important qualities are kept faithful:
//   - correct order Mercury -> Neptune
//   - correct relative size ranking (gas giants >> terrestrials)
//   - inner planets orbit faster than outer ones
//   - real NASA-derived surface texture maps, axial tilts, ring systems
// ---------------------------------------------------------------------------

export type PlanetSpec = {
  name: string;
  /** Equirectangular colour map (public/textures/*). */
  map: string;
  /** Optional bump/height map for surface relief. */
  bumpMap?: string;
  bumpScale?: number;
  /** Rendered sphere radius in world units. */
  size: number;
  /** Orbit radius in world units. */
  orbitRadius: number;
  /** Seconds for one full revolution around the Sun. Smaller = faster. */
  periodSeconds: number;
  /** Seconds for one axial spin. */
  spinSeconds: number;
  /** Axial tilt in degrees. */
  axialTilt: number;
  /** Starting orbital angle in degrees (so planets are spread out). */
  startAngle: number;
  /** Base material roughness. */
  roughness?: number;
  /** Earth-only extras. */
  cloudMap?: string;
  specularMap?: string;
  /** Rim atmosphere colour, if any. */
  atmosphere?: string;
  /** Saturn ring system. */
  ring?: {
    map: string;
    innerScale: number; // × planet size
    outerScale: number; // × planet size
  };
};

const tex = (f: string) => staticFile(`textures/${f}`);

export const PLANETS: PlanetSpec[] = [
  {
    name: "Mercury",
    map: tex("mercurymap.jpg"),
    bumpMap: tex("mercurybump.jpg"),
    bumpScale: 0.006,
    size: 0.95,
    orbitRadius: 16,
    periodSeconds: 6,
    spinSeconds: 14,
    axialTilt: 0.03,
    startAngle: 20,
    roughness: 1,
  },
  {
    name: "Venus",
    map: tex("venusmap.jpg"),
    bumpMap: tex("venusbump.jpg"),
    bumpScale: 0.005,
    size: 1.5,
    orbitRadius: 23,
    periodSeconds: 9,
    spinSeconds: 26, // Venus spins very slowly (and retrograde)
    axialTilt: 177.4,
    startAngle: 200,
    roughness: 1,
    atmosphere: "#e8c88a",
  },
  {
    name: "Earth",
    map: tex("earth_atmos_2048.jpg"),
    bumpMap: tex("earthbump1k.jpg"),
    bumpScale: 0.02,
    specularMap: tex("earth_specular_2048.jpg"),
    cloudMap: tex("earthcloudmap.jpg"),
    size: 1.6,
    orbitRadius: 30,
    periodSeconds: 12,
    spinSeconds: 10,
    axialTilt: 23.4,
    startAngle: 110,
    roughness: 0.85,
    atmosphere: "#5b8fd6",
  },
  {
    name: "Mars",
    map: tex("marsmap1k.jpg"),
    bumpMap: tex("marsbump1k.jpg"),
    bumpScale: 0.02,
    size: 1.15,
    orbitRadius: 37,
    periodSeconds: 15,
    spinSeconds: 10.3,
    axialTilt: 25.2,
    startAngle: 310,
    roughness: 1,
    atmosphere: "#d98a5a",
  },
  {
    name: "Jupiter",
    map: tex("jupitermap.jpg"),
    size: 4.3,
    orbitRadius: 48,
    periodSeconds: 22,
    spinSeconds: 4.5, // fastest spinner
    axialTilt: 3.1,
    startAngle: 60,
    roughness: 0.9,
  },
  {
    name: "Saturn",
    map: tex("saturnmap.jpg"),
    size: 3.6,
    orbitRadius: 59,
    periodSeconds: 28,
    spinSeconds: 5,
    axialTilt: 26.7,
    startAngle: 250,
    roughness: 0.9,
    ring: {
      map: tex("saturnringcolor.jpg"),
      innerScale: 1.28,
      outerScale: 2.3,
    },
  },
  {
    name: "Uranus",
    map: tex("uranusmap.jpg"),
    size: 2.5,
    orbitRadius: 67,
    periodSeconds: 34,
    spinSeconds: 7,
    axialTilt: 97.8, // rolls on its side
    startAngle: 150,
    roughness: 0.7,
    atmosphere: "#a7e0e6",
  },
  {
    name: "Neptune",
    map: tex("neptunemap.jpg"),
    size: 2.4,
    orbitRadius: 74,
    periodSeconds: 40,
    spinSeconds: 7.5,
    axialTilt: 28.3,
    startAngle: 20,
    roughness: 0.7,
    atmosphere: "#4a6cf0",
  },
];

export const SUN_SIZE = 8;
export const SUN_MAP = tex("sunmap.jpg");

/** World-space position of a planet's centre at a given time. */
export const orbitalPosition = (
  planet: PlanetSpec,
  seconds: number,
): [number, number, number] => {
  const angle =
    (planet.startAngle * Math.PI) / 180 +
    (seconds / planet.periodSeconds) * Math.PI * 2;
  return [
    Math.cos(angle) * planet.orbitRadius,
    0,
    Math.sin(angle) * planet.orbitRadius,
  ];
};
