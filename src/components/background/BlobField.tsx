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

  // Rebuild the solver when the viewport size changes so the field tracks the
  // aspect (no stretch on resize / rotate).
  const sizeKey = `${size.width}x${size.height}`;
  const sim = useMemo(
    () => new FluidSimulation(gl, size.width, size.height),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [gl, sizeKey]
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
