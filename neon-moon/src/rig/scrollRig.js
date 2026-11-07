// Caméra pilotée par le défilement : une image clé par chapitre, chemin lissé
// (Catmull-Rom), petit palier sur chaque chapitre pour lire le texte sans que
// la vue bouge, et parallaxe légère à la souris.
import * as THREE from 'three';
import { REDUCED_MOTION } from '../config.js';

const HOLD = 0.2; // part de chaque intervalle où la caméra reste posée

function plateau(x) {
  if (x <= HOLD) return 0;
  if (x >= 1 - HOLD) return 1;
  const t = (x - HOLD) / (1 - 2 * HOLD);
  return t * t * (3 - 2 * t);
}

const lerp = (a, b, t) => a + (b - a) * t;

export function createScrollRig(camera, chapters) {
  const posCurve = new THREE.CatmullRomCurve3(chapters.map((c) => new THREE.Vector3(...c.pos)), false, 'centripetal');
  const looks = chapters.map((c) => new THREE.Vector3(...c.look));
  const n = chapters.length - 1;

  let target = 0;
  let current = 0;
  let speed = 0;
  const pointer = new THREE.Vector2();
  const pointerSmooth = new THREE.Vector2();

  const read = () => {
    const max = document.documentElement.scrollHeight - innerHeight;
    target = max > 0 ? Math.min(1, Math.max(0, scrollY / max)) : 0;
  };
  addEventListener('scroll', read, { passive: true });
  addEventListener('resize', read);
  read();
  current = target;

  addEventListener('pointermove', (e) => {
    pointer.set((e.clientX / innerWidth) * 2 - 1, -((e.clientY / innerHeight) * 2 - 1));
  });

  const pos = new THREE.Vector3();
  const look = new THREE.Vector3();
  const right = new THREE.Vector3();
  const up = new THREE.Vector3();
  const forward = new THREE.Vector3();
  const coreOffset = { x: 0, y: 0, dist: 20, scale: 1 };

  return {
    coreOffset,
    get progress() { return current; },
    get speed() { return speed; },
    get chapter() { return Math.round(current * n); },
    update(dtReal) {
      const prev = current;
      current += (target - current) * (1 - Math.exp(-dtReal * (REDUCED_MOTION ? 10 : 3.4)));
      if (Math.abs(target - current) < 1e-5) current = target;
      speed = Math.abs(current - prev) / Math.max(dtReal, 1e-4) * n;

      const s = current * n;
      const k = Math.min(Math.floor(s), n - 1);
      const f = plateau(s - k);
      const eased = (k + f) / n;

      posCurve.getPoint(eased, pos);
      look.lerpVectors(looks[k], looks[k + 1], f);

      // parallaxe souris
      if (!REDUCED_MOTION) pointerSmooth.lerp(pointer, 1 - Math.exp(-dtReal * 2.5));
      camera.position.copy(pos);
      camera.lookAt(look);
      right.set(1, 0, 0).applyQuaternion(camera.quaternion);
      up.set(0, 1, 0).applyQuaternion(camera.quaternion);
      camera.position.addScaledVector(right, pointerSmooth.x * 2.2).addScaledVector(up, pointerSmooth.y * 1.2);
      camera.lookAt(look);

      const a = chapters[k].core;
      const b = chapters[k + 1].core;
      coreOffset.x = lerp(a.x, b.x, f);
      coreOffset.y = lerp(a.y, b.y, f);
      coreOffset.dist = lerp(a.dist, b.dist, f);
      coreOffset.scale = lerp(a.scale, b.scale, f);
      return coreOffset;
    },
    // Position monde d'un point exprimé dans le repère caméra
    cameraSpaceToWorld(x, y, dist, out) {
      right.set(1, 0, 0).applyQuaternion(camera.quaternion);
      up.set(0, 1, 0).applyQuaternion(camera.quaternion);
      forward.set(0, 0, -1).applyQuaternion(camera.quaternion);
      return out.copy(camera.position).addScaledVector(right, x).addScaledVector(up, y).addScaledVector(forward, dist);
    },
  };
}
