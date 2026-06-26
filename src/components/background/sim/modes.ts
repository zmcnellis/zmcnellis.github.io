import * as THREE from "three";
import type { FluidSimulation } from "./FluidSimulation";
import { Flock } from "./boids";
import { makeZMask } from "./zmask";
import { Sph } from "./sph";

export interface SimParams {
  velDissipation: number;
  dyeDissipation: number;
  threshold: number;
  softness: number;
  colorA: string;
  colorB: string;
  gravity: [number, number];
  pressureIters: number;
  useProjection: boolean;
  viscosity: number;
  grain: number;
}

export interface BlobMode {
  id: string;
  name: string;
  description: string;
  params: SimParams;
  init(sim: FluidSimulation): void;
  forceVelocity(sim: FluidSimulation, t: number, dt: number): void;
  sourceDye(sim: FluidSimulation, t: number, dt: number): void;
  // If present, fully replaces the Eulerian pipeline for this mode (e.g. SPH).
  customStep?(sim: FluidSimulation, t: number, dt: number): void;
  dispose?(): void;
}

// Shared muted palette; modes that want a different feel override these.
const BEIGE_A = "#f0ebdd";
const BEIGE_B = "#e9e1cf";

// A ring of fixed emitter positions (uv) used by several modes.
function ring(n: number, cx: number, cy: number, r: number, ry = r): THREE.Vector2[] {
  return Array.from({ length: n }, (_, i) => {
    const a = (i / n) * Math.PI * 2;
    return new THREE.Vector2(cx + Math.cos(a) * r, cy + Math.sin(a) * ry);
  });
}

// A row of emitters across the top (uv) used by drip / sand.
function topRow(n: number, y: number): THREE.Vector2[] {
  return Array.from({ length: n }, (_, i) =>
    new THREE.Vector2((i + 0.5) / n, y)
  );
}

// ---------------------------------------------------------------------------

function flockingMode(): BlobMode {
  let flock: Flock;
  let count = 0;
  const speed = 1.6;
  return {
    id: "flocking",
    name: "Flocking",
    description: "Boids flock and swirl the fluid.",
    params: {
      velDissipation: 0.8, dyeDissipation: 1.7, threshold: 0.16, softness: 0.13,
      colorA: BEIGE_A, colorB: BEIGE_B, gravity: [0, 0], pressureIters: 18,
      useProjection: true, viscosity: 0, grain: 0,
    },
    init(sim) {
      flock = new Flock({ aspect: sim.aspect });
      count = flock.boids.length;
    },
    forceVelocity(sim, _t, dt) {
      flock.update(dt);
      const b = flock.boids;
      for (let i = 0; i < b.length; i++) {
        sim.points[i].set(b[i].x, b[i].y);
        sim.forces[i].set(b[i].vx * speed, b[i].vy * speed, 0);
      }
      count = b.length;
      sim.splatVelocity(count, 0.0009);
    },
    sourceDye(sim) {
      for (let i = 0; i < count; i++) sim.dyeVals[i].set(0.6, 0, 0);
      sim.splatDye(count, 0.0016);
    },
  };
}

function curlMode(): BlobMode {
  let emitters: THREE.Vector2[] = [];
  return {
    id: "curl",
    name: "Curl flow",
    description: "A Perlin-noise flow field carries the dye.",
    params: {
      velDissipation: 0.6, dyeDissipation: 0.5, threshold: 0.15, softness: 0.14,
      colorA: BEIGE_A, colorB: BEIGE_B, gravity: [0, 0], pressureIters: 0,
      useProjection: false, viscosity: 0, grain: 0,
    },
    init(sim) {
      emitters = ring(6, 0.5, 0.5, 0.32, 0.32 / sim.aspect);
    },
    forceVelocity(sim, t) {
      sim.writeCurlNoise(3.0, 0.05, t);
    },
    sourceDye(sim) {
      for (let i = 0; i < emitters.length; i++) {
        sim.points[i].copy(emitters[i]);
        sim.dyeVals[i].set(0.22, 0, 0);
      }
      sim.splatDye(emitters.length, 0.0022);
    },
  };
}

function dripMode(): BlobMode {
  const xs = [0.32, 0.5, 0.68];
  const g = -0.5;
  return {
    id: "drip",
    name: "Drip",
    description: "Heavy blobs detach and fall, lava-lamp style.",
    params: {
      velDissipation: 0.85, dyeDissipation: 0.55, threshold: 0.18, softness: 0.13,
      colorA: BEIGE_A, colorB: BEIGE_B, gravity: [0, g], pressureIters: 18,
      useProjection: true, viscosity: 0, grain: 0,
    },
    init() {},
    forceVelocity(sim, _t, dt) {
      sim.addForce(0, g, dt);
    },
    sourceDye(sim, t) {
      // 3 emitters dripping out of phase → discrete drips, not a curtain
      for (let i = 0; i < xs.length; i++) {
        const x = xs[i] + 0.03 * Math.sin(t * 0.7 + i * 2.0);
        sim.points[i].set(x, 0.9);
        const phase = Math.sin(t * 0.9 + i * 2.1);
        sim.dyeVals[i].set(phase > 0.55 ? 0.85 : 0.0, 0, 0);
      }
      sim.splatDye(xs.length, 0.0035);
    },
  };
}

function sphMode(): BlobMode {
  let sph: Sph;
  return {
    id: "sph",
    name: "Liquid (SPH)",
    description: "A smoothed-particle fluid sloshes and settles.",
    params: {
      // low threshold + wide soft edge so overlapping particles fuse into one
      // smooth iso-surface instead of separate bumps
      velDissipation: 0, dyeDissipation: 0, threshold: 0.16, softness: 0.26,
      colorA: "#ece4d3", colorB: "#ddccaf", gravity: [0, 0], pressureIters: 0,
      useProjection: false, viscosity: 0, grain: 0,
    },
    init(sim) {
      sph = new Sph(sim.aspect);
    },
    customStep(sim, t, dt) {
      // very gentle, slow tilt so the body stays spread along the bottom and
      // just undulates rather than pooling into a corner
      sph.setGravity(Math.sin(t * 0.35) * 0.1, -0.7);
      // periodic splashes: erupt a column from the pool at a varying spot
      const interval = 3.2;
      if (Math.floor(t / interval) !== Math.floor((t - dt) / interval)) {
        const idx = Math.floor(t / interval);
        const r = Math.abs(Math.sin(idx * 12.9898) * 43758.5453);
        sph.splash((r - Math.floor(r)) * sph.W, 1.1, 0.14);
      }
      sph.step(dt);
      // wide, soft, low-amount metaballs: neighbours overlap heavily so the
      // surface fuses smoothly (a thin layer still reads as a thick ribbon),
      // while the low per-particle amount keeps the interior from clipping flat
      sim.renderParticlesToDye(sph.clip, sph.count, 0.17, 0.34);
    },
    forceVelocity() {},
    sourceDye() {},
  };
}

function inkMode(): BlobMode {
  let emitters: THREE.Vector2[] = [];
  const mag = 1.1;
  return {
    id: "ink",
    name: "Ink",
    description: "Thick, viscous billows drift slowly.",
    params: {
      velDissipation: 0.4, dyeDissipation: 0.45, threshold: 0.15, softness: 0.17,
      colorA: BEIGE_A, colorB: BEIGE_B, gravity: [0, 0], pressureIters: 24,
      useProjection: true, viscosity: 0.35, grain: 0,
    },
    init(sim) {
      emitters = ring(3, 0.5, 0.5, 0.26, 0.26 / sim.aspect);
    },
    forceVelocity(sim, t) {
      for (let i = 0; i < emitters.length; i++) {
        const ang = t * 0.3 + i * 2.1;
        sim.points[i].copy(emitters[i]);
        sim.forces[i].set(Math.cos(ang) * mag, Math.sin(ang) * mag, 0);
      }
      sim.splatVelocity(emitters.length, 0.0015);
      sim.diffuseVelocity(0.35, 2);
    },
    sourceDye(sim) {
      for (let i = 0; i < emitters.length; i++) sim.dyeVals[i].set(0.3, 0, 0);
      sim.splatDye(emitters.length, 0.004);
    },
  };
}

function letterZMode(): BlobMode {
  let mask: THREE.CanvasTexture | null = null;
  return {
    id: "z",
    name: 'Letter "Z"',
    description: "Dye gathers into a softly breathing Z.",
    params: {
      velDissipation: 0.6, dyeDissipation: 1.2, threshold: 0.15, softness: 0.12,
      colorA: BEIGE_A, colorB: BEIGE_B, gravity: [0, 0], pressureIters: 0,
      useProjection: false, viscosity: 0, grain: 0,
    },
    init(sim) {
      mask = makeZMask(sim.aspect);
    },
    forceVelocity(sim, t) {
      // faint wobble so the edges breathe without losing the shape
      sim.writeCurlNoise(4.0, 0.008, t);
    },
    sourceDye(sim) {
      if (mask) sim.sourceDyeFromMask(mask, 0.18);
    },
    dispose() {
      mask?.dispose();
      mask = null;
    },
  };
}

// Factories, so each sim lifecycle gets a fresh instance (no shared closure
// state / double-dispose across resize rebuilds or mode switches).
const FACTORIES: Record<string, () => BlobMode> = {
  flocking: flockingMode,
  curl: curlMode,
  drip: dripMode,
  sph: sphMode,
  ink: inkMode,
  z: letterZMode,
};

export interface ModeMeta {
  id: string;
  name: string;
  description: string;
}

// Lightweight catalog for the switcher UI (preserves insertion order above).
export const MODE_LIST: ModeMeta[] = Object.keys(FACTORIES).map((id) => {
  const m = FACTORIES[id]();
  return { id: m.id, name: m.name, description: m.description };
});

export function createMode(id: string): BlobMode {
  return (FACTORIES[id] ?? flockingMode)();
}

export function randomModeId(): string {
  const ids = MODE_LIST.map((m) => m.id);
  return ids[Math.floor(Math.random() * ids.length)];
}
