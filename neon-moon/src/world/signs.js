// Enseignes holographiques : textures dessinées sur canvas (kanji/katakana + latin),
// posées sur les façades qui donnent sur l'avenue, plus trois bannières suspendues.
import * as THREE from 'three';
import { PALETTE, SIGNS, WORLD } from '../config.js';
import { createRng } from '../utils/random.js';
import { makeCanvas, toTexture, css } from '../utils/canvas.js';

const NEONS = [PALETTE.magenta, PALETTE.cyan, PALETTE.yellow, PALETTE.red, PALETTE.violet, PALETTE.acid];
const JP_FONT = '"DotGothic16", "Hiragino Sans", "Yu Gothic", "Noto Sans JP", sans-serif';
const LATIN_FONT = '"Share Tech Mono", monospace';

function neonText(ctx, text, x, y, color, blur) {
  ctx.shadowColor = color;
  ctx.shadowBlur = blur;
  ctx.fillStyle = color;
  ctx.fillText(text, x, y);
  ctx.shadowBlur = blur * 0.4;
  ctx.fillStyle = '#ffffff';
  ctx.globalAlpha = 0.55;
  ctx.fillText(text, x, y);
  ctx.globalAlpha = 1;
}

function frame(ctx, w, h, color) {
  ctx.shadowColor = color;
  ctx.shadowBlur = 14;
  ctx.strokeStyle = color;
  ctx.lineWidth = 6;
  ctx.strokeRect(10, 10, w - 20, h - 20);
  ctx.lineWidth = 2;
  ctx.strokeRect(22, 22, w - 44, h - 44);
  ctx.shadowBlur = 0;
}

function scanlines(ctx, w, h) {
  ctx.globalCompositeOperation = 'destination-out';
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  for (let y = 0; y < h; y += 4) ctx.fillRect(0, y, w, 1.5);
  ctx.globalCompositeOperation = 'source-over';
}

// Enseigne verticale : caractères empilés
function verticalSign(sign, colorHex) {
  const w = 192, h = 640;
  const { canvas, ctx } = makeCanvas(w, h);
  const color = css(colorHex);
  frame(ctx, w, h, color);
  const chars = [...sign.jp];
  const size = Math.min(120, 470 / chars.length);
  ctx.font = `${size}px ${JP_FONT}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const top = 70 + (470 - size * chars.length) / 2;
  chars.forEach((ch, i) => neonText(ctx, ch, w / 2, top + size * (i + 0.5), color, 22));
  ctx.font = `22px ${LATIN_FONT}`;
  ctx.save();
  ctx.translate(w / 2, h - 50);
  neonText(ctx, sign.latin.slice(0, 12), 0, 0, '#ffffff', 8);
  ctx.restore();
  scanlines(ctx, w, h);
  return toTexture(canvas);
}

// Enseigne horizontale : mot japonais + ligne latine
function horizontalSign(sign, colorHex, accentHex) {
  const w = 768, h = 256;
  const { canvas, ctx } = makeCanvas(w, h);
  const color = css(colorHex);
  const accent = css(accentHex);
  frame(ctx, w, h, color);
  ctx.textBaseline = 'middle';
  ctx.font = `120px ${JP_FONT}`;
  ctx.textAlign = 'left';
  neonText(ctx, sign.jp, 50, 118, color, 26);
  ctx.font = `34px ${LATIN_FONT}`;
  ctx.textAlign = 'right';
  neonText(ctx, sign.latin, w - 50, 70, accent, 12);
  ctx.fillStyle = accent;
  ctx.shadowColor = accent;
  ctx.shadowBlur = 10;
  ctx.fillRect(w - 260, 104, 210, 6);
  ctx.shadowBlur = 0;
  ctx.font = `22px ${LATIN_FONT}`;
  neonText(ctx, 'OPEN 24/7  ▮▮▮▯', w - 50, 160, '#ffffff', 6);
  scanlines(ctx, w, h);
  return toTexture(canvas);
}

export function createSigns(avenueLots) {
  const r = createRng(WORLD.seed + 7);
  const group = new THREE.Group();
  const items = [];

  const vTextures = SIGNS.map((s, i) => verticalSign(s, NEONS[i % NEONS.length]));
  const hTextures = SIGNS.map((s, i) => horizontalSign(s, NEONS[(i + 2) % NEONS.length], NEONS[(i + 4) % NEONS.length]));

  const addSign = (texture, width, height, position, rotationY, intensity) => {
    const material = new THREE.MeshBasicMaterial({
      map: texture,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      fog: true,
    });
    material.color.setScalar(intensity);
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(width, height), material);
    mesh.position.copy(position);
    mesh.rotation.y = rotationY;
    mesh.renderOrder = 2;
    group.add(mesh);
    items.push({
      material,
      base: intensity,
      flicker: r() < 0.25,
      phase: r() * 100,
    });
  };

  // Façades sur l'avenue
  avenueLots.forEach((lot) => {
    if (lot.h < 26 || r() > 0.55) return;
    const side = Math.sign(lot.x);
    const faceX = lot.x - side * (lot.w / 2 + 0.25);
    const vertical = r() < 0.6;
    const idx = r.int(0, SIGNS.length - 1);
    if (vertical) {
      const width = Math.min(lot.d * 0.35, 5.5);
      const height = width * 3.33;
      const maxY = Math.min(lot.h - height / 2 - 2, 70);
      if (maxY < height / 2 + 6) return;
      const y = r.range(height / 2 + 6, maxY);
      addSign(vTextures[idx], width, height, new THREE.Vector3(faceX, y, lot.z + r.range(-lot.d * 0.25, lot.d * 0.25)), -side * Math.PI / 2, r.range(1.2, 1.9));
    } else {
      const width = Math.min(lot.d * 0.8, 16);
      const height = width / 3;
      const maxY = Math.min(lot.h - height / 2 - 2, 60);
      if (maxY < 10) return;
      const y = r.range(8, maxY);
      addSign(hTextures[idx], width, height, new THREE.Vector3(faceX, y, lot.z), -side * Math.PI / 2, r.range(1.1, 1.7));
    }
  });

  // Bannières suspendues au-dessus de l'avenue, face à la caméra qui arrive
  [
    { z: -110, y: 24, i: 1 },
    { z: -345, y: 58, i: 2 },
    { z: -615, y: 34, i: 6 },
  ].forEach(({ z, y, i }) => {
    addSign(hTextures[i], 21, 7, new THREE.Vector3(0, y, z), 0, 1.6);
  });

  return {
    object: group,
    update(time) {
      for (const it of items) {
        let k = it.base;
        if (it.flicker) {
          const t = time * 1.7 + it.phase;
          const blink = Math.sin(t * 13.0) > 0.92 || (Math.sin(t * 0.7) > 0.97 && Math.sin(t * 40) > 0);
          if (blink) k *= 0.15;
        }
        it.material.color.setScalar(k);
      }
    },
  };
}
