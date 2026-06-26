import { useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { FluidSimulation } from "./sim/FluidSimulation";
import { MODE_LIST, createMode, randomModeId } from "./sim/modes";
import ModeControl from "./ModeControl";

const STEP = 1 / 30; // throttle the solver to ~30Hz

function FluidScene({ reduced, modeId }: { reduced: boolean; modeId: string }) {
  const gl = useThree((s) => s.gl);
  const size = useThree((s) => s.size);
  const invalidate = useThree((s) => s.invalidate);

  // Only rebuild the solver on a *significant* size change (orientation), and
  // debounced. iOS Safari shows/hides the address bar on scroll, which changes
  // the height every frame — rebuilding (a synchronous 110-step warmup) on each
  // of those is what froze/jittered scrolling. Small height changes are ignored;
  // the canvas still fills the viewport, blobs just stretch imperceptibly.
  const [built, setBuilt] = useState({ w: size.width, h: size.height });
  useEffect(() => {
    const a0 = built.w / Math.max(1, built.h);
    const a1 = size.width / Math.max(1, size.height);
    const widthChanged = Math.abs(size.width - built.w) > Math.max(80, built.w * 0.15);
    const aspectChanged = Math.abs(a1 - a0) / a0 > 0.2;
    if (!widthChanged && !aspectChanged) return;
    const id = setTimeout(() => setBuilt({ w: size.width, h: size.height }), 250);
    return () => clearTimeout(id);
  }, [size.width, size.height, built]);

  const sim = useMemo(
    () => new FluidSimulation(gl, built.w, built.h),
    [gl, built.w, built.h]
  );
  useEffect(() => () => sim.dispose(), [sim]);

  // Apply (and pre-warm) the active mode on mount, on mode change, and after a
  // rebuild. setMode() warms ~110 ticks so the field is already developed.
  useEffect(() => {
    sim.setMode(createMode(modeId));
    invalidate();
  }, [sim, modeId, invalidate]);

  const acc = useRef(0);
  const clock = useRef(0);
  useFrame((_, delta) => {
    if (reduced || document.hidden) return;
    acc.current += Math.min(delta, 0.1);
    let steps = 0;
    while (acc.current >= STEP && steps < 2) {
      clock.current += STEP;
      sim.step(STEP, clock.current);
      acc.current -= STEP;
      steps++;
    }
  });

  return (
    <mesh frustumCulled={false} material={sim.composite}>
      <planeGeometry args={[2, 2]} />
    </mesh>
  );
}

export default function BlobField() {
  const [reduced, setReduced] = useState(false);
  // Random mode on each load / refresh (per requirement).
  const [modeId, setModeId] = useState(() => randomModeId());

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const onChange = (e: MediaQueryListEvent) => setReduced(e.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  return (
    <>
      <div className="blob-canvas" aria-hidden="true">
        <Canvas
          gl={{ antialias: false, alpha: false, powerPreference: "low-power" }}
          dpr={[1, 1.5]}
          frameloop={reduced ? "demand" : "always"}
          style={{ width: "100%", height: "100%" }}
        >
          <FluidScene reduced={reduced} modeId={modeId} />
        </Canvas>
      </div>
      <ModeControl modes={MODE_LIST} currentId={modeId} onSelect={setModeId} />
    </>
  );
}
