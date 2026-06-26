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
  curlNoiseFrag,
  addForceFrag,
  viscosityFrag,
  maskSourceFrag,
  particleVert,
  particleFrag,
} from "./shaders";

const MAX_PARTICLES = 220;
import type { BlobMode, SimParams } from "./modes";

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

// Neutral defaults; replaced by the active mode's params in setMode().
const DEFAULT_PARAMS: SimParams = {
  velDissipation: 0.8,
  dyeDissipation: 1.7,
  threshold: 0.16,
  softness: 0.13,
  colorA: "#f0ebdd",
  colorB: "#e9e1cf",
  gravity: [0, 0],
  pressureIters: 18,
  useProjection: true,
  viscosity: 0,
  grain: 0,
};

/**
 * Stam stable-fluids solver on half-float FBOs. The solver core (advect →
 * project → advect dye → composite) is shared; a pluggable BlobMode injects
 * velocity/dye each step and supplies tuning params. See modes.ts.
 */
export class FluidSimulation {
  private gl: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera = new THREE.Camera();
  private quad: THREE.Mesh;

  private width: number;
  private height: number;
  private texel: THREE.Vector2;
  /** width / height of the simulation field; modes use it to stay isotropic. */
  readonly aspect: number;

  private velocity: DoubleFBO;
  private dye: DoubleFBO;
  private divergence: THREE.WebGLRenderTarget;
  private pressure: DoubleFBO;

  private mAdvect: THREE.ShaderMaterial;
  private mSplat: THREE.ShaderMaterial;
  private mDivergence: THREE.ShaderMaterial;
  private mPressure: THREE.ShaderMaterial;
  private mGradient: THREE.ShaderMaterial;
  private mCurl: THREE.ShaderMaterial;
  private mAddForce: THREE.ShaderMaterial;
  private mViscosity: THREE.ShaderMaterial;
  private mMaskSource: THREE.ShaderMaterial;
  composite: THREE.ShaderMaterial;

  // Particle (SPH) metaball pass (instanced quads).
  private particleGeo: THREE.InstancedBufferGeometry;
  private particleOffsets: THREE.InstancedBufferAttribute;
  private particleMat: THREE.ShaderMaterial;
  private particleScene = new THREE.Scene();

  // Shared scratch arrays for point-based injection (filled by modes).
  readonly points: THREE.Vector2[];
  readonly forces: THREE.Vector3[];
  readonly dyeVals: THREE.Vector3[];

  private params: SimParams = DEFAULT_PARAMS;
  private mode: BlobMode | null = null;

  constructor(gl: THREE.WebGLRenderer, viewW: number, viewH: number) {
    this.gl = gl;

    const base = 192;
    this.aspect = viewW / Math.max(1, viewH);
    this.height = base;
    this.width = Math.max(1, Math.round(base * this.aspect));
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
      uAspect: { value: this.aspect },
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

    this.mCurl = baseMat(curlNoiseFrag, {
      uScale: { value: 3.0 },
      uSpeed: { value: 0.03 },
      uTime: { value: 0 },
    });

    this.mAddForce = baseMat(addForceFrag, {
      uVelocity: { value: null },
      uForce: { value: new THREE.Vector2() },
      uDt: { value: 0 },
    });

    this.mViscosity = baseMat(viscosityFrag, {
      uVelocity: { value: null },
      uTexel: { value: this.texel },
      uAmount: { value: 0.5 },
    });

    this.mMaskSource = baseMat(maskSourceFrag, {
      uTarget: { value: null },
      uMask: { value: null },
      uAmount: { value: 0.1 },
    });

    this.composite = baseMat(compositeFrag, {
      uDye: { value: this.dye.read.texture },
      uColorBg: { value: new THREE.Color("#f6f1e7") },
      uColorA: { value: new THREE.Color(DEFAULT_PARAMS.colorA) },
      uColorB: { value: new THREE.Color(DEFAULT_PARAMS.colorB) },
      uThreshold: { value: DEFAULT_PARAMS.threshold },
      uSoftness: { value: DEFAULT_PARAMS.softness },
      uGrain: { value: 0 },
      uTime: { value: 0 },
    });

    this.quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2));
    this.scene.add(this.quad);

    // Particle metaball pass (additive instanced quads → dye field).
    this.particleGeo = new THREE.InstancedBufferGeometry();
    // Quad corners in [-1,1] as a 3-component `position` (ShaderMaterial needs
    // a `position` attribute to derive the draw count).
    this.particleGeo.setAttribute(
      "position",
      new THREE.BufferAttribute(
        new Float32Array([-1, -1, 0, 1, -1, 0, -1, 1, 0, 1, 1, 0]),
        3
      )
    );
    this.particleGeo.setIndex([0, 1, 2, 2, 1, 3]);
    this.particleOffsets = new THREE.InstancedBufferAttribute(
      new Float32Array(MAX_PARTICLES * 2),
      2
    );
    this.particleOffsets.setUsage(THREE.DynamicDrawUsage);
    this.particleGeo.setAttribute("aOffset", this.particleOffsets);
    this.particleGeo.instanceCount = 0;
    this.particleMat = new THREE.ShaderMaterial({
      vertexShader: particleVert,
      fragmentShader: particleFrag,
      uniforms: {
        uRadius: { value: 0.1 },
        uAspect: { value: this.aspect },
        uAmount: { value: 0.5 },
      },
      depthTest: false,
      depthWrite: false,
      blending: THREE.CustomBlending,
      blendEquation: THREE.AddEquation,
      blendSrc: THREE.OneFactor,
      blendDst: THREE.OneFactor,
    });
    const particleMesh = new THREE.Mesh(this.particleGeo, this.particleMat);
    particleMesh.frustumCulled = false;
    this.particleScene.add(particleMesh);
  }

  private runPass(material: THREE.ShaderMaterial, target: THREE.WebGLRenderTarget | null) {
    this.quad.material = material;
    this.gl.setRenderTarget(target);
    this.gl.render(this.scene, this.camera);
  }

  private applyParams() {
    const p = this.params;
    (this.composite.uniforms.uColorA.value as THREE.Color).set(p.colorA);
    (this.composite.uniforms.uColorB.value as THREE.Color).set(p.colorB);
    this.composite.uniforms.uThreshold.value = p.threshold;
    this.composite.uniforms.uSoftness.value = p.softness;
    this.composite.uniforms.uGrain.value = p.grain;
  }

  private advect(fbo: DoubleFBO, sourceTex: THREE.Texture, dissipation: number, dt: number) {
    this.mAdvect.uniforms.uVelocity.value = this.velocity.read.texture;
    this.mAdvect.uniforms.uSource.value = sourceTex;
    this.mAdvect.uniforms.uDt.value = dt;
    this.mAdvect.uniforms.uDissipation.value = dissipation;
    this.runPass(this.mAdvect, fbo.write);
    fbo.swap();
  }

  private project() {
    this.mDivergence.uniforms.uVelocity.value = this.velocity.read.texture;
    this.runPass(this.mDivergence, this.divergence);

    this.mPressure.uniforms.uDivergence.value = this.divergence.texture;
    for (let i = 0; i < this.params.pressureIters; i++) {
      this.mPressure.uniforms.uPressure.value = this.pressure.read.texture;
      this.runPass(this.mPressure, this.pressure.write);
      this.pressure.swap();
    }

    this.mGradient.uniforms.uPressure.value = this.pressure.read.texture;
    this.mGradient.uniforms.uVelocity.value = this.velocity.read.texture;
    this.runPass(this.mGradient, this.velocity.write);
    this.velocity.swap();
  }

  // ---- mode-facing helpers --------------------------------------------------

  /** Splat the first `count` boid forces (this.points + this.forces) into velocity. */
  splatVelocity(count: number, radius: number) {
    this.mSplat.uniforms.uTarget.value = this.velocity.read.texture;
    this.mSplat.uniforms.uCount.value = count;
    this.mSplat.uniforms.uValues.value = this.forces;
    this.mSplat.uniforms.uRadius.value = radius;
    this.runPass(this.mSplat, this.velocity.write);
    this.velocity.swap();
  }

  /** Splat the first `count` dye values (this.points + this.dyeVals) into dye. */
  splatDye(count: number, radius: number) {
    this.mSplat.uniforms.uTarget.value = this.dye.read.texture;
    this.mSplat.uniforms.uCount.value = count;
    this.mSplat.uniforms.uValues.value = this.dyeVals;
    this.mSplat.uniforms.uRadius.value = radius;
    this.runPass(this.mSplat, this.dye.write);
    this.dye.swap();
  }

  /** Overwrite velocity with a divergence-free curl-noise field. */
  writeCurlNoise(scale: number, speed: number, t: number) {
    this.mCurl.uniforms.uScale.value = scale;
    this.mCurl.uniforms.uSpeed.value = speed;
    this.mCurl.uniforms.uTime.value = t;
    this.runPass(this.mCurl, this.velocity.write);
    this.velocity.swap();
  }

  /** Add a constant force (e.g. gravity) to the velocity field. */
  addForce(fx: number, fy: number, dt: number) {
    this.mAddForce.uniforms.uVelocity.value = this.velocity.read.texture;
    (this.mAddForce.uniforms.uForce.value as THREE.Vector2).set(fx, fy);
    this.mAddForce.uniforms.uDt.value = dt;
    this.runPass(this.mAddForce, this.velocity.write);
    this.velocity.swap();
  }

  /** Diffuse the velocity field (viscosity) with a few Jacobi iterations. */
  diffuseVelocity(amount: number, iters: number) {
    this.mViscosity.uniforms.uAmount.value = amount;
    for (let i = 0; i < iters; i++) {
      this.mViscosity.uniforms.uVelocity.value = this.velocity.read.texture;
      this.runPass(this.mViscosity, this.velocity.write);
      this.velocity.swap();
    }
  }

  /** Add dye wherever a mask texture is non-zero. */
  sourceDyeFromMask(mask: THREE.Texture, amount: number) {
    this.mMaskSource.uniforms.uTarget.value = this.dye.read.texture;
    this.mMaskSource.uniforms.uMask.value = mask;
    this.mMaskSource.uniforms.uAmount.value = amount;
    this.runPass(this.mMaskSource, this.dye.write);
    this.dye.swap();
  }

  /**
   * Render `count` particles (clip-space xyz, packed stride 3) as additive
   * gaussian metaballs into the dye field — used by the SPH mode. `radius` is
   * in clip-space (y) units. Replaces the dye contents each call.
   */
  renderParticlesToDye(clip: Float32Array, count: number, radius: number, amount: number) {
    const off = this.particleOffsets.array as Float32Array;
    for (let i = 0; i < count; i++) {
      off[i * 2] = clip[i * 3];
      off[i * 2 + 1] = clip[i * 3 + 1];
    }
    this.particleOffsets.needsUpdate = true;
    this.particleGeo.instanceCount = count;
    this.particleMat.uniforms.uRadius.value = radius;
    this.particleMat.uniforms.uAmount.value = amount;

    const prev = this.gl.getClearColor(new THREE.Color()).clone();
    const prevAlpha = this.gl.getClearAlpha();
    this.gl.setClearColor(0x000000, 0);
    this.gl.setRenderTarget(this.dye.write); // autoClear wipes to 0, then quads add
    this.gl.render(this.particleScene, this.camera);
    this.gl.setRenderTarget(null);
    this.gl.setClearColor(prev, prevAlpha);

    this.composite.uniforms.uDye.value = this.dye.write.texture;
  }

  // ---- lifecycle ------------------------------------------------------------

  /** Clear velocity / dye / pressure fields to zero. */
  private reset() {
    const prev = this.gl.getClearColor(new THREE.Color()).clone();
    const prevAlpha = this.gl.getClearAlpha();
    this.gl.setClearColor(0x000000, 0);
    for (const rt of [
      this.velocity.read, this.velocity.write,
      this.dye.read, this.dye.write,
      this.pressure.read, this.pressure.write,
      this.divergence,
    ]) {
      this.gl.setRenderTarget(rt);
      this.gl.clear();
    }
    this.gl.setRenderTarget(null);
    this.gl.setClearColor(prev, prevAlpha);
  }

  /** Switch the active mode: reset the fields, apply params, init, and pre-warm. */
  setMode(mode: BlobMode) {
    this.mode?.dispose?.();
    this.mode = mode;
    this.params = mode.params;
    this.applyParams();
    this.reset();
    mode.init(this);
    this.warmup(110, 1 / 30);
  }

  /** Advance one tick: shared solver core + the active mode's injections. */
  step(dt: number, t: number) {
    if (!this.mode) return;

    // Modes with their own simulation (e.g. SPH) bypass the Eulerian pipeline.
    if (this.mode.customStep) {
      this.mode.customStep(this, t, dt);
      this.composite.uniforms.uTime.value = t;
      this.gl.setRenderTarget(null);
      return;
    }

    // 1. advect velocity through itself
    this.advect(this.velocity, this.velocity.read.texture, this.params.velDissipation, dt);

    // 2. mode injects velocity (boids / curl field / gravity / impulses)
    this.mode.forceVelocity(this, t, dt);

    // 3. make incompressible (skipped for analytic divergence-free fields)
    if (this.params.useProjection) this.project();

    // 4. advect dye through the velocity field
    this.advect(this.dye, this.dye.read.texture, this.params.dyeDissipation, dt);

    // 5. mode sources dye (boids / emitters / mask)
    this.mode.sourceDye(this, t, dt);

    // 6. publish to composite + restore default target
    this.composite.uniforms.uDye.value = this.dye.read.texture;
    this.composite.uniforms.uTime.value = t;
    this.gl.setRenderTarget(null);
  }

  /** Run several ticks without animating (initial / reduced-motion / post-switch). */
  warmup(ticks: number, dt: number) {
    let t = 0;
    for (let i = 0; i < ticks; i++) {
      t += dt;
      this.step(dt, t);
    }
  }

  dispose() {
    this.mode?.dispose?.();
    this.velocity.read.dispose();
    this.velocity.write.dispose();
    this.dye.read.dispose();
    this.dye.write.dispose();
    this.pressure.read.dispose();
    this.pressure.write.dispose();
    this.divergence.dispose();
    this.quad.geometry.dispose();
    this.particleGeo.dispose();
    [
      this.mAdvect, this.mSplat, this.mDivergence, this.mPressure, this.mGradient,
      this.mCurl, this.mAddForce, this.mViscosity, this.mMaskSource, this.composite,
      this.particleMat,
    ].forEach((m) => m.dispose());
  }
}
