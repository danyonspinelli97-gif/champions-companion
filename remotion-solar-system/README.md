# Solar System — Remotion animation

A 30-second, 1920×1080 (30 fps) stylised animation of the solar system, built
with [Remotion](https://www.remotion.dev/).

## What's in the scene

- A glowing, gently pulsing **Sun** at the centre.
- The **eight planets in correct order** (Mercury → Neptune) on circular orbit
  paths.
- **Inner planets orbit faster** than outer ones.
- A twinkling **starfield** background.
- **Saturn with rings** (tilted).
- Planet **name labels that fade in one by one**.
- A **slow zoom-out** across the full 30 seconds.

Sizes, orbit distances and orbital periods are deliberately *stylised* (not to
real scale) so that all eight planets fit on screen at once — see
[`src/planets.ts`](src/planets.ts).

This project is intentionally self-contained: it has its own `package.json` and
`node_modules` and is **not** part of the repository's npm workspaces, so it
does not affect the main Champions Companion app.

## Getting started

```bash
cd remotion-solar-system
npm install
```

### Preview in Remotion Studio

```bash
npm run studio
# opens http://localhost:3000
```

### Render the video

```bash
npm run render
# writes out/solar-system.mp4
```

### Render a single still (quick sanity check)

```bash
npm run still -- --frame=450   # the 15-second mark (0-based, 30 fps)
```

## Structure

| File | Purpose |
| --- | --- |
| `src/index.ts` | Remotion entry point (`registerRoot`). |
| `src/Root.tsx` | Registers the `SolarSystem` composition (1920×1080, 30 fps, 900 frames). |
| `src/SolarSystem.tsx` | The scene: Sun, orbits, planets, rings, labels and zoom-out. |
| `src/Starfield.tsx` | Deterministic twinkling starfield. |
| `src/planets.ts` | Stylised per-planet data (order, size, orbit, period, colour). |
