# Solar System — Remotion animation (photoreal 3D)

A 30-second, 1920×1080 (30 fps) animation of the solar system, rendered in real
3D with [Remotion](https://www.remotion.dev/) + [React Three Fiber](https://r3f.docs.pmnd.rs/)
(`@remotion/three` / three.js).

## What's in the scene

- A glowing **Sun** with real surface texture (sunspots), a warm corona /
  bloom, and a point light that lights the whole system.
- The **eight planets in correct order** (Mercury → Neptune), each a real lit
  sphere wrapped in a **NASA-derived surface map**:
  - **Earth** — true continents, a separately-rotating **cloud layer**,
    specular oceans and a blue **atmosphere rim**.
  - **Jupiter** — cloud bands and the Great Red Spot.
  - **Saturn** — banded surface plus a real, radially-mapped **ring system**.
  - **Mars** (rust + polar tones), **Mercury**, **Venus** (with a hazy
    atmosphere), **Uranus** and **Neptune** in their true colours.
- Correct **axial tilts** (Uranus rolls on its side, Venus is flipped) and
  per-planet **axial rotation**.
- Realistic lighting: each planet shows a **day/night terminator** lit from the
  Sun.
- **Inner planets orbit faster** than outer ones, on faint **circular orbit
  paths** (seen in perspective as ellipses).
- A **starfield** plus a subtle nebula / Milky-Way sky.
- Planet **name labels that fade in one by one** and track each planet in
  screen space.
- A slow, cinematic **camera zoom-out** over the full 30 seconds.

Sizes, orbit distances and periods are deliberately **stylised** (compressed) so
all eight planets share one screen — see [`src/planets.ts`](src/planets.ts).
The *ordering*, relative size ranking, axial tilts, rings and surface textures
are kept faithful to the real planets.

This project is self-contained: it has its own `package.json` / `node_modules`
and is **not** part of the repository's npm workspaces, so it does not affect the
main Champions Companion app.

## Getting started

```bash
cd remotion-solar-system
npm install
```

### Preview in Remotion Studio

```bash
npm run studio        # http://localhost:3000
```

### Render the video

```bash
npm run render        # writes out/solar-system.mp4 (uses --gl=angle for 3D)
```

### Render a single still

```bash
npm run still -- --frame=450
```

> **Rendering 3D:** the scene uses WebGL, so Remotion needs an OpenGL backend.
> The scripts pass `--gl=angle`, which works on most machines with a GPU. On a
> headless Linux box with no GPU, use software rendering instead:
> `--gl=swangle`. In a sandbox where Remotion can't download its own Chrome,
> also point it at a local Chromium with
> `--browser-executable=/path/to/chrome-headless-shell`.

## Structure

| File | Purpose |
| --- | --- |
| `src/index.ts` | Remotion entry point (`registerRoot`). |
| `src/Root.tsx` | Registers the `SolarSystem` composition (1920×1080, 30 fps, 900 frames). |
| `src/SolarSystem.tsx` | Loads textures, mounts the `ThreeCanvas`, labels and vignette. |
| `src/Scene3D.tsx` | The 3D scene: Sun, planets, rings, atmospheres, orbit paths, stars, lights, camera rig. |
| `src/Labels.tsx` | 2D label overlay that projects 3D planet positions to the screen. |
| `src/planets.ts` | Per-planet data (order, size, orbit, period, tilt, texture maps) + orbital math. |
| `src/camera.ts` | Shared camera-move model (kept in sync between the scene and the labels). |
| `src/useTextures.ts` | Loads all texture maps up front and blocks rendering until ready. |
| `src/canvasTextures.ts` | Procedural canvas textures for the Sun glow, star sprites and nebula. |
| `public/textures/` | Planet / Sun / ring surface maps. |

## Texture credits

Surface maps are the widely-used public planetary texture set by **James
Hastings-Trew (Planet Pixel Emporium)**, mirrored via the
[`threex.planets`](https://github.com/jeromeetienne/threex.planets) repo, plus
the high-resolution Earth maps bundled with
[three.js](https://github.com/mrdoob/three.js) examples. They are used here for
an educational/illustrative animation.
