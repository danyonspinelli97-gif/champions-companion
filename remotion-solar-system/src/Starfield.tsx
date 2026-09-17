import React, { useMemo } from "react";
import { random, useCurrentFrame, useVideoConfig } from "remotion";

type Star = {
  x: number;
  y: number;
  size: number;
  baseOpacity: number;
  twinkleSpeed: number;
  phase: number;
};

// A deterministic starfield. `random(seed)` from Remotion returns the same value
// for the same seed on every render, so the stars never flicker between frames
// except for their intentional twinkle.
export const Starfield: React.FC<{ count?: number }> = ({ count = 260 }) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();

  const stars = useMemo<Star[]>(() => {
    return new Array(count).fill(0).map((_, i) => ({
      x: random(`x-${i}`) * width,
      y: random(`y-${i}`) * height,
      size: 0.6 + random(`s-${i}`) * 1.9,
      baseOpacity: 0.25 + random(`o-${i}`) * 0.6,
      twinkleSpeed: 0.02 + random(`t-${i}`) * 0.06,
      phase: random(`p-${i}`) * Math.PI * 2,
    }));
  }, [count, width, height]);

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        overflow: "hidden",
      }}
    >
      {stars.map((star, i) => {
        const twinkle =
          0.55 + 0.45 * Math.sin(frame * star.twinkleSpeed + star.phase);
        const opacity = Math.min(1, star.baseOpacity * twinkle);
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: star.x,
              top: star.y,
              width: star.size,
              height: star.size,
              borderRadius: "50%",
              backgroundColor: "#ffffff",
              opacity,
              boxShadow:
                star.size > 1.9 ? "0 0 4px rgba(255,255,255,0.8)" : undefined,
            }}
          />
        );
      })}
    </div>
  );
};
