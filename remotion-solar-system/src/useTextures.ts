import { useEffect, useMemo, useState } from "react";
import * as THREE from "three";
import { cancelRender, continueRender, delayRender } from "remotion";

export type TextureMap = Record<string, THREE.Texture>;

// Loads every texture URL up front and blocks Remotion's render (via
// delayRender) until they are all decoded, so no frame renders with missing
// maps. `srgb` names the colour maps that must be tagged sRGB; the rest
// (bump/spec/height data) stay linear.
export const useTextures = (urls: string[], srgb: string[]): TextureMap | null => {
  const [textures, setTextures] = useState<TextureMap | null>(null);
  const key = useMemo(() => urls.join("|"), [urls]);
  const srgbSet = useMemo(() => new Set(srgb), [srgb]);

  useEffect(() => {
    const handle = delayRender(`Loading ${urls.length} textures`);
    const loader = new THREE.TextureLoader();
    let cancelled = false;

    Promise.all(urls.map((u) => loader.loadAsync(u)))
      .then((loaded) => {
        if (cancelled) return;
        const map: TextureMap = {};
        loaded.forEach((t, i) => {
          const url = urls[i];
          t.colorSpace = srgbSet.has(url)
            ? THREE.SRGBColorSpace
            : THREE.NoColorSpace;
          t.anisotropy = 8;
          map[url] = t;
        });
        setTextures(map);
        continueRender(handle);
      })
      .catch((err) => cancelRender(err));

    return () => {
      cancelled = true;
      continueRender(handle);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return textures;
};
