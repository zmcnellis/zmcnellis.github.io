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
  void main() {
    float d = texture2D(uDye, vUv).x;
    float m = smoothstep(uThreshold - uSoftness, uThreshold + uSoftness, d);
    vec3 blob = mix(uColorA, uColorB, smoothstep(uThreshold, uThreshold + 0.6, d));
    vec3 col = mix(uColorBg, blob, m);
    gl_FragColor = vec4(col, 1.0);
  }
`;
