import React, { useMemo } from "react";
import * as THREE from "three";
import { useThree } from "@react-three/fiber";
import { random, useCurrentFrame, useVideoConfig } from "remotion";
import {
  PLANETS,
  PlanetSpec,
  SUN_MAP,
  SUN_SIZE,
  orbitalPosition,
} from "./planets";
import { TextureMap } from "./useTextures";
import { cameraStateAtFrame } from "./camera";
import {
  makeGlowTexture,
  makeNebulaTexture,
  makeStarSprite,
} from "./canvasTextures";

const deg = (d: number) => (d * Math.PI) / 180;

// --- Fresnel atmosphere shell -------------------------------------------------
const atmosphereVertex = /* glsl */ `
  varying vec3 vNormal;
  varying vec3 vView;
  void main() {
    vNormal = normalize(normalMatrix * normal);
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    vView = normalize(-mv.xyz);
    gl_Position = projectionMatrix * mv;
  }
`;
const atmosphereFragment = /* glsl */ `
  uniform vec3 uColor;
  uniform float uPower;
  uniform float uIntensity;
  varying vec3 vNormal;
  varying vec3 vView;
  void main() {
    float rim = pow(1.0 - max(dot(vNormal, vView), 0.0), uPower);
    gl_FragColor = vec4(uColor, rim * uIntensity);
  }
`;

const Atmosphere: React.FC<{ radius: number; color: string; power?: number; intensity?: number }> = ({
  radius,
  color,
  power = 3.0,
  intensity = 1.0,
}) => {
  const uniforms = useMemo(
    () => ({
      uColor: { value: new THREE.Color(color) },
      uPower: { value: power },
      uIntensity: { value: intensity },
    }),
    [color, power, intensity],
  );
  return (
    <mesh scale={radius}>
      <sphereGeometry args={[1, 48, 48]} />
      <shaderMaterial
        vertexShader={atmosphereVertex}
        fragmentShader={atmosphereFragment}
        uniforms={uniforms}
        transparent
        blending={THREE.AdditiveBlending}
        depthWrite={false}
        side={THREE.FrontSide}
      />
    </mesh>
  );
};

// --- Saturn-style ring with radial UVs ---------------------------------------
const makeRingGeometry = (inner: number, outer: number): THREE.RingGeometry => {
  const g = new THREE.RingGeometry(inner, outer, 160, 1);
  const pos = g.attributes.position;
  const uv = g.attributes.uv;
  const v = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    const r = v.length();
    uv.setXY(i, (r - inner) / (outer - inner), 0.5);
  }
  g.rotateX(-Math.PI / 2);
  return g;
};

const Ring: React.FC<{ planet: PlanetSpec; textures: TextureMap }> = ({
  planet,
  textures,
}) => {
  const geo = useMemo(
    () =>
      makeRingGeometry(
        planet.size * planet.ring!.innerScale,
        planet.size * planet.ring!.outerScale,
      ),
    [planet],
  );
  const map = textures[planet.ring!.map];
  return (
    <mesh geometry={geo} castShadow receiveShadow>
      <meshStandardMaterial
        map={map}
        alphaMap={map}
        transparent
        alphaTest={0.02}
        opacity={1}
        roughness={1}
        metalness={0}
        side={THREE.DoubleSide}
        depthWrite={false}
      />
    </mesh>
  );
};

// --- A single planet ----------------------------------------------------------
const Planet: React.FC<{
  planet: PlanetSpec;
  textures: TextureMap;
  seconds: number;
}> = ({ planet, textures, seconds }) => {
  const pos = orbitalPosition(planet, seconds);
  const spin = (seconds / planet.spinSeconds) * Math.PI * 2;

  return (
    <group position={pos}>
      {/* axial tilt */}
      <group rotation={[0, 0, deg(planet.axialTilt)]}>
        {/* surface */}
        <mesh rotation={[0, spin, 0]}>
          <sphereGeometry args={[planet.size, 96, 96]} />
          <meshStandardMaterial
            map={textures[planet.map]}
            bumpMap={planet.bumpMap ? textures[planet.bumpMap] : undefined}
            bumpScale={planet.bumpScale ?? 0.01}
            roughnessMap={
              planet.specularMap ? textures[planet.specularMap] : undefined
            }
            metalnessMap={
              planet.specularMap ? textures[planet.specularMap] : undefined
            }
            metalness={planet.specularMap ? 0.35 : 0}
            roughness={planet.roughness ?? 1}
          />
        </mesh>

        {/* clouds (Earth) */}
        {planet.cloudMap ? (
          <mesh rotation={[0, spin * 1.15, 0]} scale={1.012}>
            <sphereGeometry args={[planet.size, 64, 64]} />
            <meshStandardMaterial
              alphaMap={textures[planet.cloudMap]}
              color="#ffffff"
              transparent
              opacity={0.9}
              depthWrite={false}
              roughness={1}
            />
          </mesh>
        ) : null}

        {/* rings (Saturn) */}
        {planet.ring ? <Ring planet={planet} textures={textures} /> : null}
      </group>

      {/* atmosphere rim */}
      {planet.atmosphere ? (
        <Atmosphere
          radius={planet.size * 1.06}
          color={planet.atmosphere}
          power={planet.cloudMap ? 3.2 : 4.5}
          intensity={planet.cloudMap ? 1.15 : 0.7}
        />
      ) : null}
    </group>
  );
};

// --- The Sun ------------------------------------------------------------------
const Sun: React.FC<{ textures: TextureMap; seconds: number }> = ({
  textures,
  seconds,
}) => {
  const glow = useMemo(() => makeGlowTexture(), []);
  const pulse = 1 + 0.03 * Math.sin(seconds * Math.PI * 2 * 0.25);

  return (
    <group>
      <mesh rotation={[0, seconds * 0.05, 0]}>
        <sphereGeometry args={[SUN_SIZE, 96, 96]} />
        <meshBasicMaterial map={textures[SUN_MAP]} toneMapped={false} />
      </mesh>
      {/* additive corona layers stand in for bloom */}
      <sprite scale={[SUN_SIZE * 5 * pulse, SUN_SIZE * 5 * pulse, 1]}>
        <spriteMaterial
          map={glow}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          transparent
          opacity={0.9}
        />
      </sprite>
      <sprite scale={[SUN_SIZE * 9 * pulse, SUN_SIZE * 9 * pulse, 1]}>
        <spriteMaterial
          map={glow}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          transparent
          opacity={0.45}
        />
      </sprite>
      <pointLight position={[0, 0, 0]} intensity={2.6} decay={0} color="#fff4e0" />
    </group>
  );
};

// --- Faint circular orbit paths ----------------------------------------------
const OrbitLine: React.FC<{ radius: number }> = ({ radius }) => {
  const geo = useMemo(() => {
    const pts: THREE.Vector3[] = [];
    for (let i = 0; i <= 256; i++) {
      const a = (i / 256) * Math.PI * 2;
      pts.push(new THREE.Vector3(Math.cos(a) * radius, 0, Math.sin(a) * radius));
    }
    return new THREE.BufferGeometry().setFromPoints(pts);
  }, [radius]);
  return (
    // eslint-disable-next-line react/no-unknown-property
    <lineLoop geometry={geo}>
      <lineBasicMaterial
        color="#9fb6ff"
        transparent
        opacity={0.13}
        depthWrite={false}
      />
    </lineLoop>
  );
};

const OrbitPaths: React.FC = () => (
  <>
    {PLANETS.map((p) => (
      <OrbitLine key={p.name} radius={p.orbitRadius} />
    ))}
  </>
);

// --- Background: nebula sky + star field -------------------------------------
const Sky: React.FC = () => {
  const nebula = useMemo(() => makeNebulaTexture(), []);
  return (
    <mesh scale={2000}>
      <sphereGeometry args={[1, 48, 48]} />
      <meshBasicMaterial map={nebula} side={THREE.BackSide} toneMapped={false} />
    </mesh>
  );
};

const Stars: React.FC<{ count?: number }> = ({ count = 2600 }) => {
  const sprite = useMemo(() => makeStarSprite(), []);
  const { geometry } = useMemo(() => {
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      // uniform on a large sphere — deterministic so parallel render workers
      // all produce the identical star field (no flicker between frames).
      const u = random(`su-${i}`);
      const v = random(`sv-${i}`);
      const theta = 2 * Math.PI * u;
      const phi = Math.acos(2 * v - 1);
      const r = 1400 + random(`sr-${i}`) * 200;
      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = r * Math.cos(phi);
      positions[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
      const warm = 0.7 + random(`sw-${i}`) * 0.3;
      colors[i * 3] = warm;
      colors[i * 3 + 1] = warm * (0.85 + random(`sg-${i}`) * 0.15);
      colors[i * 3 + 2] = 0.9 + random(`sb-${i}`) * 0.1;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    return { geometry: geo };
  }, [count]);

  return (
    <points geometry={geometry}>
      <pointsMaterial
        size={4.2}
        map={sprite}
        vertexColors
        transparent
        depthWrite={false}
        sizeAttenuation
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
};

// --- Camera driven by the shared camera model --------------------------------
const CameraRig: React.FC = () => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const camera = useThree((s) => s.camera);

  const state = cameraStateAtFrame(frame, durationInFrames);
  camera.position.set(state.position[0], state.position[1], state.position[2]);
  (camera as THREE.PerspectiveCamera).fov = state.fov;
  camera.lookAt(0, 0, 0);
  (camera as THREE.PerspectiveCamera).updateProjectionMatrix();

  return null;
};

// --- Whole scene --------------------------------------------------------------
export const Scene3D: React.FC<{ textures: TextureMap }> = ({ textures }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const seconds = frame / fps;

  return (
    <>
      <CameraRig />
      <ambientLight intensity={0.14} />
      <Sky />
      <Stars />
      <OrbitPaths />
      <Sun textures={textures} seconds={seconds} />
      {PLANETS.map((p) => (
        <Planet key={p.name} planet={p} textures={textures} seconds={seconds} />
      ))}
    </>
  );
};
