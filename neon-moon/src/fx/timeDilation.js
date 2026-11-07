// Ralenti : tant qu'on maintient ESPACE, le bouton dédié ou un appui long,
// le temps du monde descend à ×0,12 et l'implant laisse des images rémanentes
// aux couleurs de l'arc-en-ciel.
import * as THREE from 'three';
import { REDUCED_MOTION } from '../config.js';

const MIN_SCALE = 0.12;
const HOLD_DELAY = 280; // ms avant qu'un appui long déclenche le ralenti
const GHOST_EVERY = 0.06; // s (temps réel) entre deux images rémanentes
const GHOST_LIFE = 0.9; // s

export function createTimeDilation(scene, coreObject) {
  let holding = false;
  let amount = 0;
  let spawnClock = 0;
  let hue = 0.33;

  // --- Entrées ---
  const isInteractive = (el) => el && el.closest && el.closest('a, button, input, textarea, select, kbd');

  addEventListener('keydown', (e) => {
    if (e.code !== 'Space' || isInteractive(document.activeElement) && document.activeElement.tagName !== 'BODY') return;
    e.preventDefault();
    holding = true;
  });
  addEventListener('keyup', (e) => {
    if (e.code === 'Space') holding = false;
  });
  addEventListener('blur', () => { holding = false; });

  let timer = null;
  let start = null;
  addEventListener('pointerdown', (e) => {
    if (e.button !== 0 || isInteractive(e.target)) return;
    start = { x: e.clientX, y: e.clientY };
    clearTimeout(timer);
    timer = setTimeout(() => { holding = true; }, HOLD_DELAY);
  });
  addEventListener('pointermove', (e) => {
    if (!start || holding) return;
    if (Math.hypot(e.clientX - start.x, e.clientY - start.y) > 12) {
      clearTimeout(timer);
      start = null;
    }
  });
  const release = () => {
    clearTimeout(timer);
    start = null;
    holding = false;
  };
  addEventListener('pointerup', release);
  addEventListener('pointercancel', release);

  const button = document.getElementById('dilate-btn');
  if (button) {
    button.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      button.setPointerCapture?.(e.pointerId);
      holding = true;
    });
    button.addEventListener('pointerup', release);
    button.addEventListener('pointercancel', release);
    button.addEventListener('keydown', (e) => {
      if (e.code === 'Enter' || e.code === 'Space') { e.preventDefault(); holding = true; }
    });
    button.addEventListener('keyup', release);
    button.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  // --- Images rémanentes ---
  const ghostGeo = new THREE.IcosahedronGeometry(3.3, 0);
  const ghostEdges = new THREE.EdgesGeometry(ghostGeo);
  const pool = [];
  for (let i = 0; i < 18; i++) {
    const fill = new THREE.MeshBasicMaterial({
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      opacity: 0,
    });
    const line = new THREE.LineBasicMaterial({
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      opacity: 0,
    });
    const g = new THREE.Group();
    g.add(new THREE.Mesh(ghostGeo, fill), new THREE.LineSegments(ghostEdges, line));
    g.visible = false;
    scene.add(g);
    pool.push({ group: g, fill, line, life: 0 });
  }
  let next = 0;

  function spawn() {
    const ghost = pool[next];
    next = (next + 1) % pool.length;
    coreObject.updateMatrixWorld();
    coreObject.matrixWorld.decompose(ghost.group.position, ghost.group.quaternion, ghost.group.scale);
    // la coque tourne dans un sous-groupe : on reprend sa rotation
    const spin = coreObject.children[0];
    if (spin) ghost.group.quaternion.multiply(spin.quaternion);
    hue = (hue + 0.045) % 1;
    const color = new THREE.Color().setHSL(hue, 1, 0.5);
    ghost.fill.color.copy(color);
    ghost.line.color.copy(color);
    ghost.life = GHOST_LIFE;
    ghost.group.visible = true;
  }

  return {
    get amount() { return amount; },
    get timeScale() { return 1 - amount * (1 - MIN_SCALE); },
    update(dtReal) {
      const goal = holding ? 1 : 0;
      amount += (goal - amount) * (1 - Math.exp(-dtReal * (holding ? 7 : 4)));
      if (amount < 0.001) amount = 0;

      if (amount > 0.35 && !REDUCED_MOTION) {
        spawnClock += dtReal;
        while (spawnClock > GHOST_EVERY) {
          spawnClock -= GHOST_EVERY;
          spawn();
        }
      } else {
        spawnClock = 0;
      }

      for (const g of pool) {
        if (g.life <= 0) continue;
        g.life -= dtReal;
        const k = Math.max(0, g.life / GHOST_LIFE);
        g.fill.opacity = k * k * 0.035;
        g.line.opacity = k * 0.7;
        if (g.life <= 0) g.group.visible = false;
      }
    },
  };
}
