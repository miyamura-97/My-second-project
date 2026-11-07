// La Lune : sphère à texture procédurale (cratères, mers) et halo additif.
// Elle reste sous l'horizon pendant les chapitres 1 à 4 et se lève au défilement
// vers le dernier chapitre : vue depuis l'avenue, elle n'apparaîtrait sinon
// qu'en mince lamelle entre les tours.
import * as THREE from 'three';
import { WORLD } from '../config.js';
import { createRng } from '../utils/random.js';
import { makeCanvas, toTexture, glowTexture } from '../utils/canvas.js';

const RISE_START = 0.74; // progression du défilement où elle commence à monter
const RISE_DEPTH = 700; // de combien elle est enfoncée sous sa position finale

function moonTexture() {
  const r = createRng(384400);
  const w = 1024, h = 512;
  const { canvas, ctx } = makeCanvas(w, h);
  ctx.fillStyle = '#c9cfdb';
  ctx.fillRect(0, 0, w, h);

  // mers sombres
  for (let i = 0; i < 14; i++) {
    const x = r() * w, y = h * 0.2 + r() * h * 0.6, rad = 40 + r() * 120;
    const g = ctx.createRadialGradient(x, y, 0, x, y, rad);
    g.addColorStop(0, 'rgba(70,78,98,0.55)');
    g.addColorStop(1, 'rgba(70,78,98,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.ellipse(x, y, rad * 1.4, rad, r() * 3, 0, Math.PI * 2);
    ctx.fill();
  }
  // cratères
  for (let i = 0; i < 420; i++) {
    const x = r() * w, y = r() * h, rad = Math.pow(r(), 3) * 26 + 1.5;
    ctx.fillStyle = `rgba(60,66,84,${0.25 + r() * 0.3})`;
    ctx.beginPath();
    ctx.arc(x, y, rad, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = `rgba(235,240,250,${0.25 + r() * 0.35})`;
    ctx.lineWidth = Math.max(1, rad * 0.18);
    ctx.beginPath();
    ctx.arc(x - rad * 0.12, y - rad * 0.12, rad, Math.PI * 0.9, Math.PI * 1.9);
    ctx.stroke();
  }
  // grain
  const img = ctx.getImageData(0, 0, w, h);
  for (let i = 0; i < img.data.length; i += 4) {
    const n = (r() - 0.5) * 18;
    img.data[i] += n; img.data[i + 1] += n; img.data[i + 2] += n;
  }
  ctx.putImageData(img, 0, 0);
  return toTexture(canvas);
}

const smooth = (a, b, x) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

export function createMoon() {
  const { position, radius } = WORLD.moon;
  const group = new THREE.Group();
  group.position.set(...position);

  const material = new THREE.MeshBasicMaterial({ map: moonTexture(), fog: false });
  material.color.setRGB(0.95, 0.97, 1.05);
  const sphere = new THREE.Mesh(new THREE.SphereGeometry(radius, 64, 32), material);
  sphere.rotation.set(0.3, -1.2, 0.1);
  sphere.renderOrder = -5;

  const haloMaterial = new THREE.SpriteMaterial({
    map: glowTexture(256, [
      [0, 'rgba(255,255,255,0.0)'],
      [0.5, 'rgba(255,255,255,0.0)'],
      [0.56, 'rgba(210,235,255,0.5)'],
      [0.7, 'rgba(255,90,170,0.16)'],
      [1, 'rgba(255,42,109,0)'],
    ]),
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    fog: false,
  });
  const halo = new THREE.Sprite(haloMaterial);
  halo.scale.setScalar(radius * 3.6);
  halo.renderOrder = -4;

  group.add(halo, sphere);

  return {
    object: group,
    update(time, progress) {
      const rise = smooth(RISE_START, 1, progress);
      group.position.y = position[1] - RISE_DEPTH * (1 - rise);
      group.visible = rise > 0.001;
      haloMaterial.opacity = rise * rise * (0.9 + Math.sin(time * 0.5) * 0.08);
      sphere.rotation.y += 0.00004;
    },
  };
}
