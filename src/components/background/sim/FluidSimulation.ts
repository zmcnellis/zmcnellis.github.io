import * as THREE from "three";
import {
  MAX_BOIDS,
  fullscreenVert,
  advectFrag,
  splatFrag,
  divergenceFrag,
  pressureFrag,
  gradientSubtractFrag,
  compositeFrag,
} from "./shaders";
import { Flock } from "./boids";

interface DoubleFBO {
  read: THREE.WebGLRenderTarget;
  write: THREE.WebGLRenderTarget;
  swap: () => void;
}

function makeTarget(w: number, h: number): THREE.WebGLRenderTarget {
  return new THREE.WebGLRenderTarget(w, h, {
    type: THREE.HalfFloatType,
    format: THREE.RGBAFormat,
    minFilter: THREE.LinearFilter,
    magFilter: THREE.LinearFilter,
    wrapS: THREE.ClampToEdgeWrapping,
    wrapT: THREE.ClampToEdgeWrapping,
    depthBuffer: false,
    stencilBuffer: false,
  });
}

function makeDoubleFBO(w: number, h: number): DoubleFBO {
  const fbo: DoubleFBO = {
    read: makeTarget(w, h),
    write: makeTarget(w, h),
    swap() {
      const t = this.read;
      this.read = this.write;
      this.write = t;
    },
  };
  return fbo;
}

/**
 * Stable-fluids solver rendered to half-float FBOs, sourced by a flock of
 * boids. step() runs one simulation tick; `dyeTexture` is the field the
 * composite material thresholds into blobs.
 */
export class FluidSimulation {
  private gl: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera = new THREE.Camera();
  private quad: THREE.Mesh;

  private width: number;
  private height: number;
  private texel: THREE.Vector2;

  private velocity: DoubleFBO;
  private dye: DoubleFBO;
  private divergence: THREE.WebGLRenderTarget;
  private pressure: DoubleFBO;

  private mAdvect: THREE.ShaderMaterial;
  private mSplat: THREE.ShaderMaterial;
  private mDivergence: THREE.ShaderMaterial;
  private mPressure: THREE.ShaderMaterial;
  private mGradient: THREE.ShaderMaterial;
  composite: THREE.ShaderMaterial;

  private flock: Flock;
  private points: THREE.Vector2[];
  private forces: THREE.Vector3[];
  private dyeVals: THREE.Vector3[];

  // tuning
  private pressureIters = 18;
  private velDissipation = 0.8;
  private dyeDissipation = 1.7;
  private forceScale = 1.6;
  private dyeAmount = 0.6;

  constructor(gl: THREE.WebGLRenderer, viewW: number, viewH: number) {
    this.gl = gl;

    // Fixed simulation resolution (independent of canvas DPR). Keep it small
    // for performance — the blobs are soft, so detail isn't needed.
    const base = 192;
    const aspect = viewW / Math.max(1, viewH);
    this.height = base;
    this.width = Math.round(base * aspect);
    this.texel = new THREE.Vector2(1 / this.width, 1 / this.height);

    this.velocity = makeDoubleFBO(this.width, this.height);
    this.dye = makeDoubleFBO(this.width, this.height);
    this.pressure = makeDoubleFBO(this.width, this.height);
    this.divergence = makeTarget(this.width, this.height);

    const baseMat = (fragmentShader: string, uniforms: Record<string, THREE.IUniform>) =>
      new THREE.ShaderMaterial({
        vertexShader: fullscreenVert,
        fragmentShader,
        uniforms,
        depthTest: false,
        depthWrite: false,
      });

    this.mAdvect = baseMat(advectFrag, {
      uVelocity: { value: null },
      uSource: { value: null },
      uDt: { value: 0 },
      uDissipation: { value: 0 },
    });

    this.points = Array.from({ length: MAX_BOIDS }, () => new THREE.Vector2());
    this.forces = Array.from({ length: MAX_BOIDS }, () => new THREE.Vector3());
    this.dyeVals = Array.from({ length: MAX_BOIDS }, () => new THREE.Vector3());

    this.mSplat = baseMat(splatFrag, {
      uTarget: { value: null },
      uCount: { value: 0 },
      uPoints: { value: this.points },
      uValues: { value: this.forces },
      uRadius: { value: 0.0008 },
      uAspect: { value: aspect },
    });

    this.mDivergence = baseMat(divergenceFrag, {
      uVelocity: { value: null },
      uTexel: { value: this.texel },
    });

    this.mPressure = baseMat(pressureFrag, {
      uPressure: { value: null },
      uDivergence: { value: null },
      uTexel: { value: this.texel },
    });

    this.mGradient = baseMat(gradientSubtractFrag, {
      uPressure: { value: null },
      uVelocity: { value: null },
      uTexel: { value: this.texel },
    });

    this.composite = baseMat(compositeFrag, {
      uDye: { value: this.dye.read.texture },
      uColorBg: { value: new THREE.Color("#f6f1e7") },
      // Blob tones sit very close to the background so the effect stays quiet.
      uColorA: { value: new THREE.Color("#f0ebdd") },
      uColorB: { value: new THREE.Color("#e9e1cf") },
      uThreshold: { value: 0.16 },
      uSoftness: { value: 0.13 },
    });

    this.quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2));
    this.scene.add(this.quad);

    this.flock = new Flock({ aspect });
  }

  private runPass(material: THREE.ShaderMaterial, target: THREE.WebGLRenderTarget | null) {
    this.quad.material = material;
    this.gl.setRenderTarget(target);
    this.gl.render(this.scene, this.camera);
  }

  /** Advance the flock and run one fluid solve. dt is clamped upstream. */
  step(dt: number) {
    this.flock.update(dt);

    // Push boid state into the splat uniform arrays.
    const boids = this.flock.boids;
    const count = boids.length;
    for (let i = 0; i < count; i++) {
      const b = boids[i];
      this.points[i].set(b.x, b.y);
      this.forces[i].set(b.vx * this.forceScale, b.vy * this.forceScale, 0);
      this.dyeVals[i].set(this.dyeAmount, 0, 0);
    }

    // 1. advect velocity
    this.mAdvect.uniforms.uVelocity.value = this.velocity.read.texture;
    this.mAdvect.uniforms.uSource.value = this.velocity.read.texture;
    this.mAdvect.uniforms.uDt.value = dt;
    this.mAdvect.uniforms.uDissipation.value = this.velDissipation;
    this.runPass(this.mAdvect, this.velocity.write);
    this.velocity.swap();

    // 2. inject boid velocities as forces
    this.mSplat.uniforms.uTarget.value = this.velocity.read.texture;
    this.mSplat.uniforms.uCount.value = count;
    this.mSplat.uniforms.uValues.value = this.forces;
    this.mSplat.uniforms.uRadius.value = 0.0009;
    this.runPass(this.mSplat, this.velocity.write);
    this.velocity.swap();

    // 3. divergence of the velocity field
    this.mDivergence.uniforms.uVelocity.value = this.velocity.read.texture;
    this.runPass(this.mDivergence, this.divergence);

    // 4. pressure solve (Jacobi)
    this.mPressure.uniforms.uDivergence.value = this.divergence.texture;
    for (let i = 0; i < this.pressureIters; i++) {
      this.mPressure.uniforms.uPressure.value = this.pressure.read.texture;
      this.runPass(this.mPressure, this.pressure.write);
      this.pressure.swap();
    }

    // 5. subtract pressure gradient → divergence-free velocity
    this.mGradient.uniforms.uPressure.value = this.pressure.read.texture;
    this.mGradient.uniforms.uVelocity.value = this.velocity.read.texture;
    this.runPass(this.mGradient, this.velocity.write);
    this.velocity.swap();

    // 6. advect dye through the velocity field
    this.mAdvect.uniforms.uVelocity.value = this.velocity.read.texture;
    this.mAdvect.uniforms.uSource.value = this.dye.read.texture;
    this.mAdvect.uniforms.uDissipation.value = this.dyeDissipation;
    this.runPass(this.mAdvect, this.dye.write);
    this.dye.swap();

    // 7. inject dye at the boids
    this.mSplat.uniforms.uTarget.value = this.dye.read.texture;
    this.mSplat.uniforms.uValues.value = this.dyeVals;
    this.mSplat.uniforms.uRadius.value = 0.0016;
    this.runPass(this.mSplat, this.dye.write);
    this.dye.swap();

    // hand the freshest dye to the composite + restore default target
    this.composite.uniforms.uDye.value = this.dye.read.texture;
    this.gl.setRenderTarget(null);
  }

  /** Run several ticks without animating — used for reduced-motion static frame. */
  warmup(ticks: number, dt: number) {
    for (let i = 0; i < ticks; i++) this.step(dt);
  }

  dispose() {
    this.velocity.read.dispose();
    this.velocity.write.dispose();
    this.dye.read.dispose();
    this.dye.write.dispose();
    this.pressure.read.dispose();
    this.pressure.write.dispose();
    this.divergence.dispose();
    this.quad.geometry.dispose();
    [this.mAdvect, this.mSplat, this.mDivergence, this.mPressure, this.mGradient, this.composite].forEach(
      (m) => m.dispose()
    );
  }
}
