import React from "react";
import {
  AbsoluteFill,
  Easing,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { Starfield } from "./Starfield";
import { PLANETS, Planet } from "./planets";

// ---------------------------------------------------------------------------
// The Sun sits at the centre and glows with a gentle pulse.
// ---------------------------------------------------------------------------
const Sun: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Slow breathing pulse of the glow.
  const pulse = 1 + 0.04 * Math.sin((frame / fps) * Math.PI * 2 * 0.5);
  const glow = 60 + 18 * Math.sin((frame / fps) * Math.PI * 2 * 0.5);
  const radius = 46;

  return (
    <div
      style={{
        position: "absolute",
        left: -radius,
        top: -radius,
        width: radius * 2,
        height: radius * 2,
        borderRadius: "50%",
        scale: String(pulse),
        background:
          "radial-gradient(circle at 50% 50%, #fff6d5 0%, #ffe28a 35%, #ffb43d 70%, #ff8a1f 100%)",
        boxShadow: `0 0 ${glow}px ${glow * 0.5}px rgba(255,180,60,0.75), 0 0 ${
          glow * 2.4
        }px ${glow}px rgba(255,120,20,0.35)`,
      }}
    />
  );
};

// ---------------------------------------------------------------------------
// A faint circular orbit path.
// ---------------------------------------------------------------------------
const OrbitPath: React.FC<{ radius: number }> = ({ radius }) => {
  return (
    <div
      style={{
        position: "absolute",
        left: -radius,
        top: -radius,
        width: radius * 2,
        height: radius * 2,
        borderRadius: "50%",
        border: "1px solid rgba(255,255,255,0.09)",
      }}
    />
  );
};

// ---------------------------------------------------------------------------
// Saturn's tilted rings, drawn as two flattened, rotated ellipses.
// ---------------------------------------------------------------------------
const Rings: React.FC<{ planetRadius: number; color: string }> = ({
  planetRadius,
  color,
}) => {
  const outer = planetRadius * 2.2;
  const inner = planetRadius * 1.35;
  return (
    <div
      style={{
        position: "absolute",
        left: 0,
        top: 0,
        transform: "translate(-50%, -50%) rotate(-22deg)",
        width: outer * 2,
        height: outer * 2 * 0.34,
        borderRadius: "50%",
        border: `${Math.max(3, planetRadius * 0.35)}px solid ${color}`,
        boxSizing: "border-box",
        // A second, thinner ring gap via inset shadow.
        boxShadow: `inset 0 0 0 ${inner * 0.5}px rgba(0,0,0,0)`,
        opacity: 0.85,
      }}
    />
  );
};

// ---------------------------------------------------------------------------
// A single planet: it is positioned on its orbit for the current frame, then
// its own dot (and label, and rings) are drawn at that point.
// ---------------------------------------------------------------------------
const OrbitingPlanet: React.FC<{
  planet: Planet;
  index: number;
  labelDelayFrames: number;
}> = ({ planet, index, labelDelayFrames }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const seconds = frame / fps;
  const angleDeg =
    planet.startAngle + (seconds / planet.periodSeconds) * 360;
  const angleRad = (angleDeg * Math.PI) / 180;

  const x = Math.cos(angleRad) * planet.orbitRadius;
  const y = Math.sin(angleRad) * planet.orbitRadius;

  // Labels fade in one by one.
  const labelOpacity = interpolate(
    frame,
    [labelDelayFrames, labelDelayFrames + fps * 0.8],
    [0, 1],
    {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
      easing: Easing.bezier(0.16, 1, 0.3, 1),
    },
  );

  const d = planet.radius * 2;

  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        transform: "translate(-50%, -50%)",
        // keep zoom-independent sizing of label text relative to the scene
      }}
    >
      {/* Rings sit behind the planet body for Saturn. */}
      {planet.hasRings ? (
        <Rings planetRadius={planet.radius} color={planet.highlight} />
      ) : null}

      {/* Planet body. */}
      <div
        style={{
          position: "absolute",
          left: -planet.radius,
          top: -planet.radius,
          width: d,
          height: d,
          borderRadius: "50%",
          background: `radial-gradient(circle at 32% 30%, ${planet.highlight} 0%, ${planet.color} 60%, ${planet.color} 100%)`,
          boxShadow: `0 0 ${planet.radius * 0.9}px rgba(255,255,255,0.12)`,
        }}
      />

      {/* Name label, offset above the planet, fading in one by one. */}
      <div
        style={{
          position: "absolute",
          left: 0,
          top: -(planet.radius + 14),
          transform: "translate(-50%, -100%)",
          opacity: labelOpacity,
          color: "rgba(255,255,255,0.92)",
          fontFamily:
            "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
          fontSize: 18,
          fontWeight: 600,
          letterSpacing: 1.5,
          textTransform: "uppercase",
          whiteSpace: "nowrap",
          textShadow: "0 0 8px rgba(0,0,0,0.9)",
        }}
        data-planet-index={index}
      >
        {planet.name}
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// The whole scene, wrapped in a container that slowly zooms out.
// ---------------------------------------------------------------------------
export const SolarSystem: React.FC = () => {
  const frame = useCurrentFrame();
  const { width, height, durationInFrames, fps } = useVideoConfig();

  const cx = width / 2;
  const cy = height / 2;

  // Slow zoom-out across the entire duration.
  const zoom = interpolate(frame, [0, durationInFrames - 1], [1.15, 0.72], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.inOut(Easing.ease),
  });

  // Stagger the label fade-ins: first one starts at ~1s, then one every ~1.4s.
  const firstLabelFrame = Math.round(fps * 1.0);
  const labelStagger = Math.round(fps * 1.4);

  return (
    <AbsoluteFill style={{ backgroundColor: "#03050d" }}>
      {/* Deep-space gradient so the corners aren't pure black. */}
      <AbsoluteFill
        style={{
          background:
            "radial-gradient(circle at 50% 50%, #0a1024 0%, #05060f 55%, #02030a 100%)",
        }}
      />

      {/* Starfield stays fixed (very distant background). */}
      <Starfield count={280} />

      {/* The solar system, centred and zooming out. */}
      <div
        style={{
          position: "absolute",
          left: cx,
          top: cy,
          scale: String(zoom),
        }}
      >
        {/* Orbit paths (drawn first, behind everything). */}
        {PLANETS.map((p) => (
          <OrbitPath key={`orbit-${p.name}`} radius={p.orbitRadius} />
        ))}

        {/* The Sun. */}
        <Sun />

        {/* Planets. */}
        {PLANETS.map((p, i) => (
          <OrbitingPlanet
            key={p.name}
            planet={p}
            index={i}
            labelDelayFrames={firstLabelFrame + i * labelStagger}
          />
        ))}
      </div>
    </AbsoluteFill>
  );
};
