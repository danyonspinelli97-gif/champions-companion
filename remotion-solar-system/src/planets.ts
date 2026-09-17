// Stylised solar-system layout. Real astronomical scales are impossible to show
// on a single screen, so sizes, orbit radii and orbital periods are all
// artistic approximations chosen so that everything fits inside 1920x1080 while
// keeping the *correct ordering* (Mercury -> Neptune) and the correct qualitative
// behaviour (inner planets orbit faster than outer ones).

export type Planet = {
  name: string;
  /** Orbit radius in px from the Sun at the reference (scale 1) zoom level. */
  orbitRadius: number;
  /** Rendered planet radius in px. */
  radius: number;
  /** CSS colour for the planet body. */
  color: string;
  /** A lighter highlight colour used for the radial shading. */
  highlight: string;
  /** Seconds for one full orbit. Smaller = faster (inner planets are smaller). */
  periodSeconds: number;
  /** Starting angle in degrees, so the planets don't all line up. */
  startAngle: number;
  /** Saturn is the only ringed planet in this scene. */
  hasRings?: boolean;
};

// Order matters: this array is Mercury -> Neptune.
export const PLANETS: Planet[] = [
  {
    name: "Mercury",
    orbitRadius: 115,
    radius: 6,
    color: "#9a8f86",
    highlight: "#cfc6bd",
    periodSeconds: 5,
    startAngle: 20,
  },
  {
    name: "Venus",
    orbitRadius: 152,
    radius: 11,
    color: "#d8a95f",
    highlight: "#f6dca0",
    periodSeconds: 8,
    startAngle: 200,
  },
  {
    name: "Earth",
    orbitRadius: 192,
    radius: 12,
    color: "#3d7fd0",
    highlight: "#8fc6f2",
    periodSeconds: 11,
    startAngle: 110,
  },
  {
    name: "Mars",
    orbitRadius: 232,
    radius: 9,
    color: "#c1502e",
    highlight: "#e88a63",
    periodSeconds: 14,
    startAngle: 310,
  },
  {
    name: "Jupiter",
    orbitRadius: 300,
    radius: 26,
    color: "#c39a6b",
    highlight: "#e7c79a",
    periodSeconds: 19,
    startAngle: 60,
  },
  {
    name: "Saturn",
    orbitRadius: 358,
    radius: 21,
    color: "#d9bd7f",
    highlight: "#f2dda8",
    periodSeconds: 24,
    startAngle: 250,
    hasRings: true,
  },
  {
    name: "Uranus",
    orbitRadius: 400,
    radius: 15,
    color: "#8fd3d8",
    highlight: "#c4eef0",
    periodSeconds: 29,
    startAngle: 150,
  },
  {
    name: "Neptune",
    orbitRadius: 438,
    radius: 14,
    color: "#3f5fd6",
    highlight: "#7f96ef",
    periodSeconds: 34,
    startAngle: 20,
  },
];
