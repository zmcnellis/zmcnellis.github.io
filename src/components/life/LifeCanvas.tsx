import { useEffect, useRef, useState } from "react";

/**
 * Conway's Game of Life rendered as a glowing neon grid.
 *
 * A standard toroidal Conway grid stepped at a fixed rate. Each living cell
 * owns an animated radius that springs up on birth and melts down on death, and
 * is drawn as a neon dot with a white-hot core over a colored glow. Rather than
 * clearing the canvas each frame, we fade it toward black — so moving structures
 * (gliders, spaceships) leave phosphor motion trails. Cell age maps onto a cool
 * aurora→magenta palette, and the board seeds with a Gosper glider gun so there's
 * always a stream of gliders flying across the field.
 */

const CELL = 16; // CSS px per cell
const MAX_DT = 0.05; // clamp frame delta (s)
const FADE = 0.11; // per-frame fade toward bg (lower = longer comet trails)
const BG = "7,6,26"; // canvas backdrop (matches the stage), as "r,g,b"
// A cohesive neon gradient — aurora/synthwave cool tones sweeping into magenta.
// Newborn cells glow aqua and drift through the spectrum as a colony ages.
const PALETTE: [number, number, number][] = [
  [0x3a, 0xf5, 0xe0], // aqua
  [0x2c, 0xc5, 0xff], // cyan
  [0x6d, 0x8b, 0xff], // periwinkle
  [0xb1, 0x6a, 0xff], // violet
  [0xff, 0x5b, 0xc8], // magenta
];

// Gosper glider gun (canonical cell coordinates) — emits a glider every 30 gens.
const GLIDER_GUN: [number, number][] = [
  [0, 4], [0, 5], [1, 4], [1, 5],
  [10, 4], [10, 5], [10, 6], [11, 3], [11, 7], [12, 2], [12, 8], [13, 2], [13, 8],
  [14, 5], [15, 3], [15, 7], [16, 4], [16, 5], [16, 6], [17, 5],
  [20, 2], [20, 3], [20, 4], [21, 2], [21, 3], [21, 4], [22, 1], [22, 5],
  [24, 0], [24, 1], [24, 5], [24, 6], [34, 2], [34, 3], [35, 2], [35, 3],
];

function ageColor(age: number): string {
  // Loop through the palette as a cell survives; ~16 generations per full pass.
  const t = ((age * 0.55) / PALETTE.length) % 1;
  const scaled = t * PALETTE.length;
  const i = Math.floor(scaled);
  const f = scaled - i;
  const a = PALETTE[i % PALETTE.length];
  const b = PALETTE[(i + 1) % PALETTE.length];
  const r = Math.round(a[0] + (b[0] - a[0]) * f);
  const g = Math.round(a[1] + (b[1] - a[1]) * f);
  const bl = Math.round(a[2] + (b[2] - a[2]) * f);
  return `${r},${g},${bl}`;
}

export default function LifeCanvas() {
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(11); // generations per second
  const [reduced, setReduced] = useState(false);

  // Live values the rAF loop reads without re-subscribing.
  const playingRef = useRef(playing);
  const speedRef = useRef(speed);
  const reducedRef = useRef(reduced);
  playingRef.current = playing;
  speedRef.current = speed;
  reducedRef.current = reduced;

  useEffect(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const applyReduced = () => setReduced(mq.matches);
    applyReduced();
    mq.addEventListener("change", applyReduced);

    let cols = 0;
    let rows = 0;
    let alive = new Uint8Array(0);
    let age = new Float32Array(0); // generations survived (living cells)
    let radius = new Float32Array(0); // animated fill 0..~1.2
    let vel = new Float32Array(0); // spring velocity
    let dpr = Math.min(window.devicePixelRatio || 1, 1.5);

    const idx = (c: number, r: number) => r * cols + c;

    function randomize() {
      for (let i = 0; i < alive.length; i++) {
        alive[i] = Math.random() < 0.32 ? 1 : 0;
        age[i] = 0;
      }
    }

    function clear() {
      alive.fill(0);
      age.fill(0);
    }

    // Stamp a Gosper glider gun near the top-left so gliders stream diagonally.
    function seedGliderGun() {
      const ox = 2;
      const oy = 2;
      for (const [x, y] of GLIDER_GUN) {
        const c = ox + x;
        const r = oy + y;
        if (c < cols && r < rows) alive[idx(c, r)] = 1;
      }
    }

    // Initial pattern: a glider gun if it fits, otherwise a random soup.
    function seedInitial() {
      clear();
      if (cols >= 40 && rows >= 14) seedGliderGun();
      else randomize();
    }

    // (Re)allocate the grid to fit the wrapper, preserving overlap region.
    function resize() {
      const w = wrap!.clientWidth;
      const h = wrap!.clientHeight;
      if (w === 0 || h === 0) return;
      dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      const nextCols = Math.max(4, Math.floor(w / CELL));
      const nextRows = Math.max(4, Math.floor(h / CELL));

      canvas!.width = Math.floor(w * dpr);
      canvas!.height = Math.floor(h * dpr);
      canvas!.style.width = `${w}px`;
      canvas!.style.height = `${h}px`;

      if (nextCols === cols && nextRows === rows) return;
      const wasEmpty = alive.length === 0;
      cols = nextCols;
      rows = nextRows;
      alive = new Uint8Array(cols * rows);
      age = new Float32Array(cols * rows);
      radius = new Float32Array(cols * rows);
      vel = new Float32Array(cols * rows);
      if (wasEmpty) seedInitial();
    }

    function step() {
      const next = new Uint8Array(cols * rows);
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          let n = 0;
          // Dead (non-toroidal) borders: cells off the edge count as dead. This
          // lets the glider gun fire cleanly — gliders fly off-screen instead of
          // wrapping around and colliding with the gun.
          for (let dr = -1; dr <= 1; dr++) {
            for (let dc = -1; dc <= 1; dc++) {
              if (dr === 0 && dc === 0) continue;
              const rr = r + dr;
              const cc = c + dc;
              if (rr < 0 || cc < 0 || rr >= rows || cc >= cols) continue;
              n += alive[idx(cc, rr)];
            }
          }
          const i = idx(c, r);
          const live = alive[i] === 1;
          if (live && (n === 2 || n === 3)) {
            next[i] = 1;
            age[i] += 1;
          } else if (!live && n === 3) {
            next[i] = 1;
            age[i] = 0;
          } else {
            next[i] = 0;
            // keep age until the cell finishes melting; reset when reborn
          }
        }
      }
      alive = next;
    }

    function render(trails: boolean) {
      const cw = canvas!.width;
      const ch = canvas!.height;
      // Phosphor persistence: fade toward the backdrop instead of clearing, so
      // moving structures leave trails. When paused/reduced, clear outright.
      if (trails) {
        ctx!.fillStyle = `rgba(${BG},${FADE})`;
        ctx!.fillRect(0, 0, cw, ch);
      } else {
        ctx!.fillStyle = `rgb(${BG})`;
        ctx!.fillRect(0, 0, cw, ch);
      }

      const cell = CELL * dpr;
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const i = idx(c, r);
          const rad = radius[i];
          if (rad <= 0.02) continue;
          const x = (c + 0.5) * cell;
          const y = (r + 0.5) * cell;
          const rgb = ageColor(age[i]);
          const k = Math.min(rad, 1.2);

          // Outer colored glow (soft, larger than the cell).
          const gr = k * cell * 1.15;
          const glow = ctx!.createRadialGradient(x, y, 0, x, y, gr);
          glow.addColorStop(0, `rgba(${rgb},0.9)`);
          glow.addColorStop(0.5, `rgba(${rgb},0.35)`);
          glow.addColorStop(1, `rgba(${rgb},0)`);
          ctx!.fillStyle = glow;
          ctx!.beginPath();
          ctx!.arc(x, y, gr, 0, Math.PI * 2);
          ctx!.fill();

          // White-hot core so individual cells stay crisp and legible.
          const cr = k * cell * 0.42;
          const core = ctx!.createRadialGradient(x, y, 0, x, y, cr);
          core.addColorStop(0, "rgba(255,255,255,0.95)");
          core.addColorStop(0.6, `rgba(${rgb},0.95)`);
          core.addColorStop(1, `rgba(${rgb},0)`);
          ctx!.fillStyle = core;
          ctx!.beginPath();
          ctx!.arc(x, y, cr, 0, Math.PI * 2);
          ctx!.fill();
        }
      }
    }

    // Spring the animated radius toward its target (1 alive, 0 dead).
    function ease(dt: number) {
      const k = 120; // stiffness
      const d = 16; // damping
      for (let i = 0; i < alive.length; i++) {
        const target = alive[i];
        if (reducedRef.current) {
          radius[i] = target;
          vel[i] = 0;
          continue;
        }
        const a = k * (target - radius[i]) - d * vel[i];
        vel[i] += a * dt;
        radius[i] += vel[i] * dt;
        if (radius[i] < 0) {
          radius[i] = 0;
          vel[i] = 0;
        }
      }
    }

    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(wrap);

    let raf = 0;
    let last = performance.now();
    let acc = 0;
    function frame(now: number) {
      raf = requestAnimationFrame(frame);
      if (document.hidden) {
        last = now;
        return;
      }
      const dt = Math.min((now - last) / 1000, MAX_DT);
      last = now;

      if (playingRef.current) {
        acc += dt;
        const interval = 1 / speedRef.current;
        let guard = 0;
        while (acc >= interval && guard < 4) {
          step();
          acc -= interval;
          guard++;
        }
      }
      ease(dt);
      render(playingRef.current && !reducedRef.current);
    }
    raf = requestAnimationFrame(frame);

    // --- painting ---
    let painting = false;
    let paintVal = 1;
    function cellAt(e: PointerEvent): number | null {
      const rect = canvas!.getBoundingClientRect();
      const c = Math.floor(((e.clientX - rect.left) / rect.width) * cols);
      const r = Math.floor(((e.clientY - rect.top) / rect.height) * rows);
      if (c < 0 || r < 0 || c >= cols || r >= rows) return null;
      return idx(c, r);
    }
    function onDown(e: PointerEvent) {
      const i = cellAt(e);
      if (i == null) return;
      painting = true;
      paintVal = alive[i] ? 0 : 1;
      alive[i] = paintVal;
      if (paintVal) age[i] = 0;
      canvas!.setPointerCapture(e.pointerId);
    }
    function onMove(e: PointerEvent) {
      if (!painting) return;
      const i = cellAt(e);
      if (i == null) return;
      alive[i] = paintVal;
      if (paintVal) age[i] = 0;
    }
    function onUp() {
      painting = false;
    }
    canvas.addEventListener("pointerdown", onDown);
    canvas.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);

    // Expose actions to the React controls via the wrapper element.
    const api = {
      randomize,
      clear,
      step: () => {
        step();
        if (reducedRef.current) ease(0);
      },
    };
    (wrap as unknown as { __life?: typeof api }).__life = api;

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      mq.removeEventListener("change", applyReduced);
      canvas.removeEventListener("pointerdown", onDown);
      canvas.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  }, []);

  const callApi = (name: "randomize" | "clear" | "step") => {
    const wrap = wrapRef.current as unknown as {
      __life?: Record<string, () => void>;
    } | null;
    wrap?.__life?.[name]?.();
  };

  return (
    <div className="life">
      <div className="life-stage" ref={wrapRef}>
        <canvas ref={canvasRef} aria-label="Conway's Game of Life — metaball renderer" />
      </div>
      <div className="life-controls" role="group" aria-label="Simulation controls">
        <button type="button" onClick={() => setPlaying((p) => !p)}>
          {playing ? "Pause" : "Play"}
        </button>
        <button type="button" onClick={() => callApi("step")} disabled={playing}>
          Step
        </button>
        <button type="button" onClick={() => callApi("randomize")}>
          Randomize
        </button>
        <button type="button" onClick={() => callApi("clear")}>
          Clear
        </button>
        <label className="speed">
          Speed
          <input
            type="range"
            min={1}
            max={20}
            value={speed}
            onChange={(e) => setSpeed(Number(e.target.value))}
          />
        </label>
      </div>
      {reduced && (
        <p className="life-note">
          Reduced-motion is on, so the animation starts paused — press Play or
          Step to advance.
        </p>
      )}
    </div>
  );
}
