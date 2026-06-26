import * as THREE from "three";

/**
 * Build a mask texture with a serif "Z" — white glyph on black. The canvas is
 * sized to the field aspect so that, sampled over the fullscreen UV, the Z keeps
 * sensible proportions. The dye-from-mask pass paints dye wherever red > 0.
 */
export function makeZMask(aspect: number): THREE.CanvasTexture {
  const h = 256;
  const w = Math.max(64, Math.round(h * aspect));
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;

  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, w, h);

  ctx.fillStyle = "#fff";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  // Start from a height-based size (serif, to match the LaTeX wordmark)...
  let fontSize = Math.round(h * 0.78);
  ctx.font = `700 ${fontSize}px Georgia, "Times New Roman", serif`;
  // ...then shrink if the glyph would be too wide for the canvas, so it keeps a
  // side margin on narrow (portrait / mobile) aspects instead of bleeding to
  // both edges. On wide desktop canvases this cap never triggers.
  const maxGlyphW = w * 0.72; // ~14% breathing room each side
  const measuredW = ctx.measureText("Z").width;
  if (measuredW > maxGlyphW) {
    fontSize = Math.max(24, Math.floor(fontSize * (maxGlyphW / measuredW)));
    ctx.font = `700 ${fontSize}px Georgia, "Times New Roman", serif`;
  }
  ctx.fillText("Z", w / 2, h / 2 + h * 0.02);

  const tex = new THREE.CanvasTexture(canvas);
  tex.minFilter = THREE.LinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.generateMipmaps = false;
  tex.wrapS = THREE.ClampToEdgeWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.needsUpdate = true;
  return tex;
}
