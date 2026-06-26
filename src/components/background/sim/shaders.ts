// GLSL shaders for the blob background — a 2D Eulerian (Stam "stable fluids")
// solver whose velocity + dye fields are sourced by flocking boids, then
// composited through a smooth metaball threshold into soft beige blobs.
//
// All passes share one fullscreen vertex shader that writes clip-space
// positions directly, so the camera is irrelevant (geometry is a 2×2 plane
// spanning -1..1).

export const MAX_BOIDS = 12;

export const fullscreenVert = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`;

// Semi-Lagrangian advection: backtrace along the velocity field.
export const advectFrag = /* glsl */ `
  precision highp float;
  varying vec2 vUv;
  uniform sampler2D uVelocity;
  uniform sampler2D uSource;
  uniform float uDt;
  uniform float uDissipation;
  void main() {
    vec2 vel = texture2D(uVelocity, vUv).xy;
    vec2 coord = vUv - uDt * vel;
    vec4 result = texture2D(uSource, coord);
    gl_FragColor = result / (1.0 + uDissipation * uDt);
  }
`;

// Add gaussian splats from every boid in a single pass (velocity or dye).
// uValues holds the per-boid contribution (velocity vector, or scalar dye in .x).
export const splatFrag = /* glsl */ `
  precision highp float;
  varying vec2 vUv;
  uniform sampler2D uTarget;
  uniform int uCount;
  uniform vec2 uPoints[${MAX_BOIDS}];
  uniform vec3 uValues[${MAX_BOIDS}];
  uniform float uRadius;
  uniform float uAspect;
  void main() {
    vec3 base = texture2D(uTarget, vUv).xyz;
    vec3 sum = vec3(0.0);
    for (int i = 0; i < ${MAX_BOIDS}; i++) {
      float enabled = step(float(i), float(uCount) - 0.5);
      vec2 d = vUv - uPoints[i];
      d.x *= uAspect;
      float g = exp(-dot(d, d) / uRadius);
      sum += enabled * uValues[i] * g;
    }
    gl_FragColor = vec4(base + sum, 1.0);
  }
`;

export const divergenceFrag = /* glsl */ `
  precision highp float;
  varying vec2 vUv;
  uniform sampler2D uVelocity;
  uniform vec2 uTexel;
  void main() {
    float l = texture2D(uVelocity, vUv - vec2(uTexel.x, 0.0)).x;
    float r = texture2D(uVelocity, vUv + vec2(uTexel.x, 0.0)).x;
    float b = texture2D(uVelocity, vUv - vec2(0.0, uTexel.y)).y;
    float t = texture2D(uVelocity, vUv + vec2(0.0, uTexel.y)).y;
    float div = 0.5 * ((r - l) + (t - b));
    gl_FragColor = vec4(div, 0.0, 0.0, 1.0);
  }
`;

// One Jacobi iteration of the pressure Poisson solve.
export const pressureFrag = /* glsl */ `
  precision highp float;
  varying vec2 vUv;
  uniform sampler2D uPressure;
  uniform sampler2D uDivergence;
  uniform vec2 uTexel;
  void main() {
    float l = texture2D(uPressure, vUv - vec2(uTexel.x, 0.0)).x;
    float r = texture2D(uPressure, vUv + vec2(uTexel.x, 0.0)).x;
    float b = texture2D(uPressure, vUv - vec2(0.0, uTexel.y)).x;
    float t = texture2D(uPressure, vUv + vec2(0.0, uTexel.y)).x;
    float div = texture2D(uDivergence, vUv).x;
    gl_FragColor = vec4((l + r + b + t - div) * 0.25, 0.0, 0.0, 1.0);
  }
`;

// Make the velocity field divergence-free by subtracting the pressure gradient.
export const gradientSubtractFrag = /* glsl */ `
  precision highp float;
  varying vec2 vUv;
  uniform sampler2D uPressure;
  uniform sampler2D uVelocity;
  uniform vec2 uTexel;
  void main() {
    float l = texture2D(uPressure, vUv - vec2(uTexel.x, 0.0)).x;
    float r = texture2D(uPressure, vUv + vec2(uTexel.x, 0.0)).x;
    float b = texture2D(uPressure, vUv - vec2(0.0, uTexel.y)).x;
    float t = texture2D(uPressure, vUv + vec2(0.0, uTexel.y)).x;
    vec2 vel = texture2D(uVelocity, vUv).xy;
    vel -= 0.5 * vec2(r - l, t - b);
    gl_FragColor = vec4(vel, 0.0, 1.0);
  }
`;

// Final visible pass: threshold the advected dye into soft metaball blobs and
// map to the beige palette. Colours sit close together so the effect stays
// quiet — a faint tonal drift rather than something in-your-face.
export const compositeFrag = /* glsl */ `
  precision highp float;
  varying vec2 vUv;
  uniform sampler2D uDye;
  uniform vec3 uColorBg;
  uniform vec3 uColorA;
  uniform vec3 uColorB;
  uniform float uThreshold;
  uniform float uSoftness;
  uniform float uGrain;   // 0 = off (sand mode uses a small value)
  uniform float uTime;
  float chash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
  }
  void main() {
    float d = texture2D(uDye, vUv).x;
    // Optional fine grain for the "sand" mode; vanishes when uGrain == 0.
    d += (chash(floor(vUv * 480.0) + floor(uTime * 6.0)) - 0.5) * uGrain;
    float m = smoothstep(uThreshold - uSoftness, uThreshold + uSoftness, d);
    vec3 blob = mix(uColorA, uColorB, smoothstep(uThreshold, uThreshold + 0.6, d));
    vec3 col = mix(uColorBg, blob, m);
    gl_FragColor = vec4(col, 1.0);
  }
`;

// ---------------------------------------------------------------------------
// Mode passes (used by specific blob modes; see modes.ts)
// ---------------------------------------------------------------------------

// 2D simplex noise (Ashima / Stefan Gustavson) — used by the curl-flow mode.
const snoise = /* glsl */ `
  vec3 mod289(vec3 x){ return x - floor(x * (1.0/289.0)) * 289.0; }
  vec2 mod289(vec2 x){ return x - floor(x * (1.0/289.0)) * 289.0; }
  vec3 permute(vec3 x){ return mod289(((x*34.0)+1.0)*x); }
  float snoise(vec2 v){
    const vec4 C = vec4(0.211324865405187, 0.366025403784439,
                       -0.577350269189626, 0.024390243902439);
    vec2 i  = floor(v + dot(v, C.yy));
    vec2 x0 = v -   i + dot(i, C.xx);
    vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
    vec4 x12 = x0.xyxy + C.xxzz;
    x12.xy -= i1;
    i = mod289(i);
    vec3 p = permute( permute( i.y + vec3(0.0, i1.y, 1.0))
                              + i.x + vec3(0.0, i1.x, 1.0));
    vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy), dot(x12.zw,x12.zw)), 0.0);
    m = m*m; m = m*m;
    vec3 x = 2.0 * fract(p * C.www) - 1.0;
    vec3 h = abs(x) - 0.5;
    vec3 ox = floor(x + 0.5);
    vec3 a0 = x - ox;
    m *= 1.79284291400159 - 0.85373472095314 * (a0*a0 + h*h);
    vec3 g;
    g.x  = a0.x * x0.x + h.x * x0.y;
    g.yz = a0.yz * x12.xz + h.yz * x12.yw;
    return 130.0 * dot(m, g);
  }
`;

// Overwrite the velocity field with the curl of a simplex-noise potential —
// a divergence-free flow field (so the curl-flow mode skips the pressure solve).
export const curlNoiseFrag = /* glsl */ `
  precision highp float;
  varying vec2 vUv;
  uniform float uScale;
  uniform float uSpeed;
  uniform float uTime;
  ${snoise}
  void main() {
    vec2 p = vUv * uScale + vec2(0.0, uTime * 0.06);
    float e = 0.02;
    float n1 = snoise(p + vec2(0.0, e));
    float n2 = snoise(p - vec2(0.0, e));
    float n3 = snoise(p + vec2(e, 0.0));
    float n4 = snoise(p - vec2(e, 0.0));
    vec2 vel = vec2(n1 - n2, -(n3 - n4)) / (2.0 * e);
    gl_FragColor = vec4(vel * uSpeed, 0.0, 1.0);
  }
`;

// Add a constant force (gravity) to the velocity field. Used by drip / sand.
export const addForceFrag = /* glsl */ `
  precision highp float;
  varying vec2 vUv;
  uniform sampler2D uVelocity;
  uniform vec2 uForce;
  uniform float uDt;
  void main() {
    vec2 v = texture2D(uVelocity, vUv).xy;
    v += uForce * uDt;
    gl_FragColor = vec4(v, 0.0, 1.0);
  }
`;

// One diffusion (viscosity) iteration on the velocity field. Used by ink mode.
export const viscosityFrag = /* glsl */ `
  precision highp float;
  varying vec2 vUv;
  uniform sampler2D uVelocity;
  uniform vec2 uTexel;
  uniform float uAmount;
  void main() {
    vec2 c = texture2D(uVelocity, vUv).xy;
    vec2 l = texture2D(uVelocity, vUv - vec2(uTexel.x, 0.0)).xy;
    vec2 r = texture2D(uVelocity, vUv + vec2(uTexel.x, 0.0)).xy;
    vec2 b = texture2D(uVelocity, vUv - vec2(0.0, uTexel.y)).xy;
    vec2 t = texture2D(uVelocity, vUv + vec2(0.0, uTexel.y)).xy;
    vec2 avg = (l + r + b + t) * 0.25;
    gl_FragColor = vec4(mix(c, avg, uAmount), 0.0, 1.0);
  }
`;

// Add dye wherever a mask texture is non-zero. Used by the letter "Z" mode.
export const maskSourceFrag = /* glsl */ `
  precision highp float;
  varying vec2 vUv;
  uniform sampler2D uTarget;
  uniform sampler2D uMask;
  uniform float uAmount;
  void main() {
    float base = texture2D(uTarget, vUv).x;
    float m = texture2D(uMask, vUv).r;
    gl_FragColor = vec4(base + m * uAmount, 0.0, 0.0, 1.0);
  }
`;
