// Classic Reynolds flocking (separation / alignment / cohesion) in normalized
// [0,1]² space. The boids move slowly — they're the "lava lamp" pacing — and
// their positions/velocities drive the fluid solver's splats each frame.

export interface Boid {
  x: number;
  y: number;
  vx: number;
  vy: number;
}

export interface BoidConfig {
  count: number;
  maxSpeed: number;       // uv units / second
  perception: number;     // neighbour radius (uv)
  separation: number;     // min comfortable distance (uv)
  sepWeight: number;
  alignWeight: number;
  cohWeight: number;
  centerPull: number;     // gentle bias toward the middle so blobs stay framed
  aspect: number;         // width / height, to keep motion visually uniform
}

export const defaultBoidConfig: BoidConfig = {
  count: 9,
  maxSpeed: 0.028,
  perception: 0.30,
  separation: 0.24,
  sepWeight: 0.032,
  alignWeight: 0.008,
  cohWeight: 0.002,
  centerPull: 0.006,
  aspect: 1,
};

export class Flock {
  boids: Boid[] = [];
  cfg: BoidConfig;

  constructor(cfg: Partial<BoidConfig> = {}) {
    this.cfg = { ...defaultBoidConfig, ...cfg };
    this.seed();
  }

  // Deterministic-ish spread so we don't need Math.random at module scope.
  private seed() {
    const n = this.cfg.count;
    this.boids = [];
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      const r = 0.18 + 0.12 * ((i % 3) / 2);
      this.boids.push({
        x: 0.5 + Math.cos(a) * r,
        y: 0.5 + Math.sin(a) * r,
        vx: Math.cos(a + 1.6) * this.cfg.maxSpeed * 0.5,
        vy: Math.sin(a + 1.6) * this.cfg.maxSpeed * 0.5,
      });
    }
  }

  setAspect(aspect: number) {
    this.cfg.aspect = aspect;
  }

  update(dt: number) {
    const c = this.cfg;
    const ax = c.aspect; // scale x-distance so "circular" perception holds on wide screens

    for (const b of this.boids) {
      let sepX = 0, sepY = 0;
      let aliX = 0, aliY = 0;
      let cohX = 0, cohY = 0;
      let neighbors = 0;

      for (const o of this.boids) {
        if (o === b) continue;
        const dx = (b.x - o.x) * ax;
        const dy = b.y - o.y;
        const dist = Math.hypot(dx, dy);
        if (dist > 0 && dist < c.perception) {
          if (dist < c.separation) {
            sepX += dx / dist;
            sepY += dy / dist;
          }
          aliX += o.vx;
          aliY += o.vy;
          cohX += o.x;
          cohY += o.y;
          neighbors++;
        }
      }

      if (neighbors > 0) {
        aliX /= neighbors;
        aliY /= neighbors;
        cohX = cohX / neighbors - b.x;
        cohY = cohY / neighbors - b.y;
      }

      b.vx += sepX * c.sepWeight + aliX * c.alignWeight + cohX * c.cohWeight;
      b.vy += sepY * c.sepWeight + aliY * c.alignWeight + cohY * c.cohWeight;

      // gentle pull toward center
      b.vx += (0.5 - b.x) * c.centerPull;
      b.vy += (0.5 - b.y) * c.centerPull;

      // clamp speed
      const sp = Math.hypot(b.vx, b.vy);
      if (sp > c.maxSpeed) {
        b.vx = (b.vx / sp) * c.maxSpeed;
        b.vy = (b.vy / sp) * c.maxSpeed;
      }

      b.x += b.vx * dt;
      b.y += b.vy * dt;

      // soft wrap so they never pile on an edge
      if (b.x < -0.05) b.x = 1.05;
      if (b.x > 1.05) b.x = -0.05;
      if (b.y < -0.05) b.y = 1.05;
      if (b.y > 1.05) b.y = -0.05;
    }
  }
}
