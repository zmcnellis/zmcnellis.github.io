import { useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { FluidSimulation } from "./sim/FluidSimulation";

const STEP = 1 / 30; // throttle the solver to ~30Hz

function FluidScene({ reduced }: { reduced: boolean }) {
  const gl = useThree((s) => s.gl);
  const size = useThree((s) => s.size);
  const invalidate = useThree((s) => s.invalidate);

  // Rebuild the solver when the viewport size changes so the field aspect
  // tracks the screen (otherwise blobs stretch on resize / rotate). Pre-warm
  // every build so the first painted frame already shows formed, moving blobs
  // rather than static circles growing in.
  const sizeKey = `${size.width}x${size.height}`;
  const sim = useMemo(() => {
    const s = new FluidSimulation(gl, size.width, size.height);
    s.warmup(reduced ? 240 : 130, STEP);
    invalidate();
    return s;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gl, sizeKey, reduced]);

  // Dispose the previous solver whenever a new one replaces it (or on unmount).
  useEffect(() => () => sim.dispose(), [sim]);

  const acc = useRef(0);
  useFrame((_, delta) => {
    if (reduced || document.hidden) return;
    acc.current += Math.min(delta, 0.1);
    // step at a fixed cadence, at most twice per frame to bound cost
    let steps = 0;
    while (acc.current >= STEP && steps < 2) {
      sim.step(STEP);
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

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const onChange = (e: MediaQueryListEvent) => setReduced(e.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  return (
    <Canvas
      gl={{ antialias: false, alpha: false, powerPreference: "low-power" }}
      dpr={[1, 1.5]}
      frameloop={reduced ? "demand" : "always"}
      style={{ width: "100%", height: "100%" }}
    >
      <FluidScene reduced={reduced} />
    </Canvas>
  );
}
