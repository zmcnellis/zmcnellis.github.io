import { useEffect, useRef, useState } from "react";

/**
 * Soft-body "jelly" blobs — a mass-spring physics toy.
 *
 * Each blob is a ring of point masses joined by perimeter springs, with an
 * internal gas-pressure model that pushes the edges outward to preserve area.
 * Together those give the squishy, shape-restoring wobble of jelly. Blobs fall
 * under gravity, bounce off the walls, and can be grabbed and flung with the
 * pointer. Rendering draws a smooth closed curve through the ring with a soft
 * gradient fill and a glossy highlight.
 */

const POINTS = 16; // masses per blob
const SUBSTEPS = 8; // physics iterations per frame (stability)
const MAX_DT = 1 / 30; // clamp frame delta (s)
const GRAVITY = 1200; // px/s^2
const SPRING_K = 520; // perimeter spring stiffness
const SPRING_D = 20; // perimeter spring damping
// Tuned so per-point pressure ≈ GAS/(r·POINTS) comfortably exceeds gravity,
// keeping blobs round and springy instead of pancaking on the floor.
const GAS = 1_700_000; // internal pressure constant
const VEL_DAMP = 0.996; // global velocity damping per substep
const RESTITUTION = 0.4; // wall bounciness
const COLORS = [
  { fill: "#e08a5f", glow: "#f0b48f" }, // terracotta
  { fill: "#5aa9b9", glow: "#8fd6e0" }, // teal
  { fill: "#8c7ad6", glow: "#b9a8f0" }, // periwinkle
  { fill: "#d3739a", glow: "#f0a8c8" }, // rose
];

interface Pt {
  x: number;
  y: number;
  vx: number;
  vy: number;
  fx: number;
  fy: number;
}
interface Blob {
  pts: Pt[];
  restLen: number;
  restArea: number;
  color: { fill: string; glow: string };
}

export default function JellyCanvas() {
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [reduced, setReduced] = useState(false);
  const reducedRef = useRef(reduced);
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

    let W = 0;
    let H = 0;
    let dpr = Math.min(window.devicePixelRatio || 1, 2);
    const blobs: Blob[] = [];
    let colorIdx = 0;

    function polygonArea(pts: Pt[]): number {
      let a = 0;
      for (let i = 0; i < pts.length; i++) {
        const j = (i + 1) % pts.length;
        a += pts[i].x * pts[j].y - pts[j].x * pts[i].y;
      }
      return Math.abs(a) / 2;
    }

    function makeBlob(cx: number, cy: number, r: number): Blob {
      const pts: Pt[] = [];
      for (let i = 0; i < POINTS; i++) {
        const ang = (i / POINTS) * Math.PI * 2;
        pts.push({
          x: cx + Math.cos(ang) * r,
          y: cy + Math.sin(ang) * r,
          vx: 0,
          vy: 0,
          fx: 0,
          fy: 0,
        });
      }
      const restLen = (2 * Math.PI * r) / POINTS;
      const restArea = Math.PI * r * r;
      const color = COLORS[colorIdx % COLORS.length];
      colorIdx++;
      return { pts, restLen, restArea, color };
    }

    function addBlob() {
      if (W === 0) return;
      const r = Math.min(70, W * 0.09);
      const cx = r + Math.random() * (W - 2 * r);
      const cy = r + Math.random() * (H * 0.4);
      if (blobs.length >= 6) blobs.shift();
      blobs.push(makeBlob(cx, cy, r));
    }

    function reset() {
      blobs.length = 0;
      colorIdx = 0;
      const n = W < 520 ? 2 : 3;
      for (let i = 0; i < n; i++) addBlob();
    }

    function resize() {
      const w = wrap!.clientWidth;
      const h = wrap!.clientHeight;
      if (w === 0 || h === 0) return;
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = w;
      H = h;
      canvas!.width = Math.floor(w * dpr);
      canvas!.height = Math.floor(h * dpr);
      canvas!.style.width = `${w}px`;
      canvas!.style.height = `${h}px`;
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (blobs.length === 0) reset();
    }

    let grabbed: { blob: Blob; i: number } | null = null;
    let pointer = { x: 0, y: 0, px: 0, py: 0, down: false };

    function physics(dt: number) {
      const g = reducedRef.current ? 0 : GRAVITY;
      for (const b of blobs) {
        const pts = b.pts;
        // forces: gravity
        for (const p of pts) {
          p.fx = 0;
          p.fy = g;
        }
        // perimeter springs (with damping along the edge)
        for (let i = 0; i < pts.length; i++) {
          const j = (i + 1) % pts.length;
          const a = pts[i];
          const c = pts[j];
          let dx = c.x - a.x;
          let dy = c.y - a.y;
          const dist = Math.hypot(dx, dy) || 1e-4;
          dx /= dist;
          dy /= dist;
          const ext = dist - b.restLen;
          const relVel = (c.vx - a.vx) * dx + (c.vy - a.vy) * dy;
          const f = SPRING_K * ext + SPRING_D * relVel;
          a.fx += f * dx;
          a.fy += f * dy;
          c.fx -= f * dx;
          c.fy -= f * dy;
        }
        // internal gas pressure: push each edge outward to preserve area
        const area = polygonArea(pts) || 1e-4;
        let ccx = 0;
        let ccy = 0;
        for (const p of pts) {
          ccx += p.x;
          ccy += p.y;
        }
        ccx /= pts.length;
        ccy /= pts.length;
        const pressure = (GAS / area) * 0.5;
        for (let i = 0; i < pts.length; i++) {
          const j = (i + 1) % pts.length;
          const a = pts[i];
          const c = pts[j];
          const dx = c.x - a.x;
          const dy = c.y - a.y;
          const len = Math.hypot(dx, dy) || 1e-4;
          let nx = dy / len;
          let ny = -dx / len;
          const mx = (a.x + c.x) / 2;
          const my = (a.y + c.y) / 2;
          if ((mx - ccx) * nx + (my - ccy) * ny < 0) {
            nx = -nx;
            ny = -ny;
          }
          const force = pressure * len;
          a.fx += nx * force;
          a.fy += ny * force;
          c.fx += nx * force;
          c.fy += ny * force;
        }
        // integrate + wall collisions
        for (const p of pts) {
          p.vx = (p.vx + p.fx * dt) * VEL_DAMP;
          p.vy = (p.vy + p.fy * dt) * VEL_DAMP;
          p.x += p.vx * dt;
          p.y += p.vy * dt;
          if (p.x < 0) {
            p.x = 0;
            p.vx = -p.vx * RESTITUTION;
          } else if (p.x > W) {
            p.x = W;
            p.vx = -p.vx * RESTITUTION;
          }
          if (p.y < 0) {
            p.y = 0;
            p.vy = -p.vy * RESTITUTION;
          } else if (p.y > H) {
            p.y = H;
            p.vy = -p.vy * RESTITUTION;
          }
        }
      }
      // dragged point follows the pointer
      if (grabbed && pointer.down) {
        const p = grabbed.blob.pts[grabbed.i];
        p.x = pointer.x;
        p.y = pointer.y;
        p.vx = (pointer.x - pointer.px) / dt;
        p.vy = (pointer.y - pointer.py) / dt;
      }
    }

    function drawBlob(b: Blob) {
      const pts = b.pts;
      ctx!.beginPath();
      // smooth closed curve through the ring via midpoint quadratics
      const last = pts[pts.length - 1];
      let mx = (last.x + pts[0].x) / 2;
      let my = (last.y + pts[0].y) / 2;
      ctx!.moveTo(mx, my);
      for (let i = 0; i < pts.length; i++) {
        const cur = pts[i];
        const next = pts[(i + 1) % pts.length];
        const nmx = (cur.x + next.x) / 2;
        const nmy = (cur.y + next.y) / 2;
        ctx!.quadraticCurveTo(cur.x, cur.y, nmx, nmy);
      }
      ctx!.closePath();

      let cx = 0;
      let cy = 0;
      for (const p of pts) {
        cx += p.x;
        cy += p.y;
      }
      cx /= pts.length;
      cy /= pts.length;

      const grad = ctx!.createRadialGradient(
        cx - 14,
        cy - 16,
        4,
        cx,
        cy,
        80
      );
      grad.addColorStop(0, b.color.glow);
      grad.addColorStop(1, b.color.fill);
      ctx!.fillStyle = grad;
      ctx!.shadowColor = "rgba(0,0,0,0.12)";
      ctx!.shadowBlur = 14;
      ctx!.shadowOffsetY = 6;
      ctx!.fill();
      ctx!.shadowColor = "transparent";
      ctx!.shadowBlur = 0;
      ctx!.shadowOffsetY = 0;

      // glossy highlight
      ctx!.beginPath();
      ctx!.ellipse(cx - 12, cy - 18, 14, 9, -0.5, 0, Math.PI * 2);
      ctx!.fillStyle = "rgba(255,255,255,0.35)";
      ctx!.fill();
    }

    function render() {
      ctx!.clearRect(0, 0, W, H);
      for (const b of blobs) drawBlob(b);
    }

    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(wrap);

    let raf = 0;
    let last = performance.now();
    function frame(now: number) {
      raf = requestAnimationFrame(frame);
      if (document.hidden) {
        last = now;
        return;
      }
      const dt = Math.min((now - last) / 1000, MAX_DT);
      last = now;
      const sub = dt / SUBSTEPS;
      for (let s = 0; s < SUBSTEPS; s++) physics(sub);
      pointer.px = pointer.x;
      pointer.py = pointer.y;
      render();
    }
    raf = requestAnimationFrame(frame);

    function posFromEvent(e: PointerEvent) {
      const rect = canvas!.getBoundingClientRect();
      return { x: e.clientX - rect.left, y: e.clientY - rect.top };
    }
    function onDown(e: PointerEvent) {
      const { x, y } = posFromEvent(e);
      pointer = { x, y, px: x, py: y, down: true };
      // grab the nearest point within reach
      let best: { blob: Blob; i: number } | null = null;
      let bestD = 48 * 48;
      for (const b of blobs) {
        for (let i = 0; i < b.pts.length; i++) {
          const dx = b.pts[i].x - x;
          const dy = b.pts[i].y - y;
          const d = dx * dx + dy * dy;
          if (d < bestD) {
            bestD = d;
            best = { blob: b, i };
          }
        }
      }
      grabbed = best;
      canvas!.setPointerCapture(e.pointerId);
    }
    function onMove(e: PointerEvent) {
      if (!pointer.down) return;
      const { x, y } = posFromEvent(e);
      pointer.x = x;
      pointer.y = y;
    }
    function onUp() {
      pointer.down = false;
      grabbed = null;
    }
    canvas.addEventListener("pointerdown", onDown);
    canvas.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);

    const api = {
      add: addBlob,
      reset,
      shake: () => {
        for (const b of blobs)
          for (const p of b.pts) {
            p.vx += (Math.random() - 0.5) * 900;
            p.vy -= Math.random() * 900;
          }
      },
    };
    (wrap as unknown as { __jelly?: typeof api }).__jelly = api;

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      mq.removeEventListener("change", applyReduced);
      canvas.removeEventListener("pointerdown", onDown);
      canvas.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  }, []);

  const callApi = (name: "add" | "reset" | "shake") => {
    const wrap = wrapRef.current as unknown as {
      __jelly?: Record<string, () => void>;
    } | null;
    wrap?.__jelly?.[name]?.();
  };

  return (
    <div className="jelly">
      <div className="jelly-stage" ref={wrapRef}>
        <canvas ref={canvasRef} aria-label="Soft-body jelly physics playground" />
      </div>
      <div className="jelly-controls" role="group" aria-label="Jelly controls">
        <button type="button" onClick={() => callApi("add")}>Add jelly</button>
        <button type="button" onClick={() => callApi("shake")}>Shake</button>
        <button type="button" onClick={() => callApi("reset")}>Reset</button>
      </div>
      {reduced && (
        <p className="jelly-note">
          Reduced-motion is on, so gravity is off — drag a blob to give it a
          wobble.
        </p>
      )}
    </div>
  );
}
