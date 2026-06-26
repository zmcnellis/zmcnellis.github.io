import { useEffect, useRef, useState } from "react";

/**
 * Conway's Game of Life rendered as soft-body metaballs.
 *
 * The simulation is a standard toroidal Conway grid stepped at a fixed rate.
 * Rendering is the twist: each living cell owns an animated radius that springs
 * up on birth and melts down on death, drawn as a soft alpha-gradient circle.
 * A CSS `blur() contrast()` filter on the canvas thresholds those overlapping
 * alphas into merged, gooey metaball silhouettes — the same family of look as
 * the fluid-blob background elsewhere on the site. Cell age maps onto the
 * site's rainbow palette so long-lived colonies drift through the spectrum.
 */

const CELL = 24; // CSS px per cell
const MAX_DT = 0.05; // clamp frame delta (s)
// A cohesive neon gradient — aurora/synthwave cool tones sweeping into magenta.
// Newborn cells glow aqua and drift through the spectrum as a colony ages, which
// reads as merged plasma against the dark stage.
const PALETTE: [number, number, number][] = [
  [0x00, 0xf5, 0xd4], // aqua
  [0x00, 0xbb, 0xf9], // cyan
  [0x5d, 0x8b, 0xff], // periwinkle
  [0x9b, 0x5d, 0xe5], // violet
  [0xf1, 0x5b, 0xb5], // magenta
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
  const [speed, setSpeed] = useState(8); // generations per second
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
      if (wasEmpty) randomize();
    }

    function step() {
      const next = new Uint8Array(cols * rows);
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          let n = 0;
          for (let dr = -1; dr <= 1; dr++) {
            for (let dc = -1; dc <= 1; dc++) {
              if (dr === 0 && dc === 0) continue;
              const rr = (r + dr + rows) % rows;
              const cc = (c + dc + cols) % cols;
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

    function render() {
      const cw = canvas!.width;
      const ch = canvas!.height;
      ctx!.clearRect(0, 0, cw, ch);
      const cell = CELL * dpr;
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const i = idx(c, r);
          const rad = radius[i];
          if (rad <= 0.02) continue;
          const x = (c + 0.5) * cell;
          const y = (r + 0.5) * cell;
          const rr = Math.min(rad, 1.25) * cell * 0.92;
          const rgb = ageColor(age[i]);
          const grad = ctx!.createRadialGradient(x, y, 0, x, y, rr);
          grad.addColorStop(0, `rgba(${rgb},1)`);
          grad.addColorStop(0.55, `rgba(${rgb},1)`);
          grad.addColorStop(1, `rgba(${rgb},0)`);
          ctx!.fillStyle = grad;
          ctx!.beginPath();
          ctx!.arc(x, y, rr, 0, Math.PI * 2);
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
      render();
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
