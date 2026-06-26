// 2D particle fluid using Clavet et al.'s "Particle-based Viscoelastic Fluid
// Simulation" (double-density relaxation). It's stable at large time steps and
// gives a nice blobby liquid — rendered as metaballs it reads as water sloshing.
//
// Simulation space: x ∈ [0, W] (W = aspect), y ∈ [0, 1], gravity pulls toward
// y = 0 (bottom of the screen). Positions are exposed in clip space for the
// metaball point pass.

const MAX = 220;

export class Sph {
  readonly W: number;
  count: number;

  private px = new Float32Array(MAX);
  private py = new Float32Array(MAX);
  private vx = new Float32Array(MAX);
  private vy = new Float32Array(MAX);
  private oldx = new Float32Array(MAX);
  private oldy = new Float32Array(MAX);

  /** Packed clip-space positions [x,y,0, …] for rendering. */
  readonly clip = new Float32Array(MAX * 3);

  // tuning
  private h = 0.115; // interaction radius
  private k = 0.06; // pressure stiffness
  private kNear = 0.18; // near-pressure stiffness
  private rho0 = 6.5; // rest density
  private gx = 0; // gravity x (set per-frame for sloshing)
  private gy = -1.0; // gravity y (downward)
  private sigma = 0.06; // viscosity (linear)
  private substeps = 2;

  // uniform grid
  private cols: number;
  private rows: number;
  private cell: number;
  private heads: Int32Array;
  private next = new Int32Array(MAX);

  constructor(aspect: number) {
    this.W = aspect;
    this.cell = this.h;
    this.cols = Math.max(1, Math.ceil(this.W / this.cell));
    this.rows = Math.max(1, Math.ceil(1 / this.cell));
    this.heads = new Int32Array(this.cols * this.rows);

    // Seed a packed block in the lower-middle; gravity settles it into a pool.
    const spacing = 0.055;
    const cols = Math.floor((this.W * 0.7) / spacing);
    const x0 = (this.W - cols * spacing) / 2;
    let n = 0;
    let row = 0;
    while (n < MAX - cols && row < 40) {
      for (let c = 0; c < cols && n < MAX; c++) {
        // small deterministic jitter (no Math.random needed, but allowed here)
        const jx = (((n * 13) % 7) / 7 - 0.5) * spacing * 0.3;
        const jy = (((n * 7) % 5) / 5 - 0.5) * spacing * 0.3;
        this.px[n] = x0 + c * spacing + jx;
        this.py[n] = 0.12 + row * spacing + jy;
        this.vx[n] = 0;
        this.vy[n] = 0;
        n++;
      }
      row++;
      if (0.12 + row * spacing > 0.6) break;
    }
    this.count = n;
  }

  private buildGrid() {
    this.heads.fill(-1);
    const { cols, rows, cell } = this;
    for (let i = 0; i < this.count; i++) {
      let cx = Math.floor(this.px[i] / cell);
      let cy = Math.floor(this.py[i] / cell);
      cx = cx < 0 ? 0 : cx >= cols ? cols - 1 : cx;
      cy = cy < 0 ? 0 : cy >= rows ? rows - 1 : cy;
      const cellIdx = cy * cols + cx;
      this.next[i] = this.heads[cellIdx];
      this.heads[cellIdx] = i;
    }
  }

  /** Set the gravity vector (used for sloshing). */
  setGravity(gx: number, gy: number) {
    this.gx = gx;
    this.gy = gy;
  }

  /** Run one frame (with internal substeps). dt is seconds. */
  step(dt: number) {
    const sub = dt / this.substeps;
    for (let s = 0; s < this.substeps; s++) this.substep(sub);
    // publish clip-space positions
    for (let i = 0; i < this.count; i++) {
      this.clip[i * 3] = (this.px[i] / this.W) * 2 - 1;
      this.clip[i * 3 + 1] = this.py[i] * 2 - 1;
      this.clip[i * 3 + 2] = 0;
    }
  }

  private substep(dt: number) {
    const { h, cols, rows, cell } = this;
    const n = this.count;

    // 1. gravity
    for (let i = 0; i < n; i++) {
      this.vx[i] += this.gx * dt;
      this.vy[i] += this.gy * dt;
    }

    this.buildGrid();

    // 2. viscosity impulses between near pairs
    for (let i = 0; i < n; i++) {
      const cx = clampi(Math.floor(this.px[i] / cell), cols);
      const cy = clampi(Math.floor(this.py[i] / cell), rows);
      for (let gy = cy - 1; gy <= cy + 1; gy++) {
        if (gy < 0 || gy >= rows) continue;
        for (let gx = cx - 1; gx <= cx + 1; gx++) {
          if (gx < 0 || gx >= cols) continue;
          for (let j = this.heads[gy * cols + gx]; j !== -1; j = this.next[j]) {
            if (j <= i) continue;
            const dx = this.px[j] - this.px[i];
            const dy = this.py[j] - this.py[i];
            const r2 = dx * dx + dy * dy;
            if (r2 >= h * h || r2 < 1e-9) continue;
            const r = Math.sqrt(r2);
            const q = r / h;
            const nx = dx / r;
            const ny = dy / r;
            const u = (this.vx[i] - this.vx[j]) * nx + (this.vy[i] - this.vy[j]) * ny;
            if (u > 0) {
              const imp = dt * (1 - q) * this.sigma * u;
              const ix = imp * nx;
              const iy = imp * ny;
              this.vx[i] -= ix * 0.5;
              this.vy[i] -= iy * 0.5;
              this.vx[j] += ix * 0.5;
              this.vy[j] += iy * 0.5;
            }
          }
        }
      }
    }

    // 3. advance + remember previous
    for (let i = 0; i < n; i++) {
      this.oldx[i] = this.px[i];
      this.oldy[i] = this.py[i];
      this.px[i] += this.vx[i] * dt;
      this.py[i] += this.vy[i] * dt;
    }

    this.buildGrid();

    // 4. double density relaxation
    for (let i = 0; i < n; i++) {
      const cx = clampi(Math.floor(this.px[i] / cell), cols);
      const cy = clampi(Math.floor(this.py[i] / cell), rows);
      let rho = 0;
      let rhoNear = 0;
      // first pass: densities
      for (let gy = cy - 1; gy <= cy + 1; gy++) {
        if (gy < 0 || gy >= rows) continue;
        for (let gx = cx - 1; gx <= cx + 1; gx++) {
          if (gx < 0 || gx >= cols) continue;
          for (let j = this.heads[gy * cols + gx]; j !== -1; j = this.next[j]) {
            if (j === i) continue;
            const dx = this.px[j] - this.px[i];
            const dy = this.py[j] - this.py[i];
            const r2 = dx * dx + dy * dy;
            if (r2 >= h * h) continue;
            const q = 1 - Math.sqrt(r2) / h;
            rho += q * q;
            rhoNear += q * q * q;
          }
        }
      }
      const P = this.k * (rho - this.rho0);
      const Pnear = this.kNear * rhoNear;
      let dxi = 0;
      let dyi = 0;
      // second pass: apply displacements
      for (let gy = cy - 1; gy <= cy + 1; gy++) {
        if (gy < 0 || gy >= rows) continue;
        for (let gx = cx - 1; gx <= cx + 1; gx++) {
          if (gx < 0 || gx >= cols) continue;
          for (let j = this.heads[gy * cols + gx]; j !== -1; j = this.next[j]) {
            if (j === i) continue;
            const dx = this.px[j] - this.px[i];
            const dy = this.py[j] - this.py[i];
            const r2 = dx * dx + dy * dy;
            if (r2 >= h * h || r2 < 1e-9) continue;
            const r = Math.sqrt(r2);
            const q = 1 - r / h;
            const mag = dt * dt * (P * q + Pnear * q * q);
            const ax = (dx / r) * mag * 0.5;
            const ay = (dy / r) * mag * 0.5;
            this.px[j] += ax;
            this.py[j] += ay;
            dxi -= ax;
            dyi -= ay;
          }
        }
      }
      this.px[i] += dxi;
      this.py[i] += dyi;
    }

    // 5. boundaries (soft walls)
    const m = 0.004;
    for (let i = 0; i < n; i++) {
      if (this.px[i] < m) this.px[i] = m;
      else if (this.px[i] > this.W - m) this.px[i] = this.W - m;
      if (this.py[i] < m) this.py[i] = m;
      else if (this.py[i] > 1 - m) this.py[i] = 1 - m;
    }

    // 6. derive velocity from movement
    const inv = 1 / dt;
    for (let i = 0; i < n; i++) {
      this.vx[i] = (this.px[i] - this.oldx[i]) * inv;
      this.vy[i] = (this.py[i] - this.oldy[i]) * inv;
    }
  }
}

function clampi(v: number, n: number) {
  return v < 0 ? 0 : v >= n ? n - 1 : v;
}
