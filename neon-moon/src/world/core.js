// L'implant : le « module 3D » central qui suit la caméra d'un chapitre à l'autre.
// Coque de 20 plaques de chrome qui s'écartent pour laisser voir un cœur d'énergie,
// cage filaire, anneaux et bande de texte holographique.
import * as THREE from 'three';
import { PALETTE } from '../config.js';
import { makeCanvas, toTexture, css } from '../utils/canvas.js';

// Environnement réfléchi par le chrome : panneaux néon autour d'une pièce noire.
export function createNeonEnvironment(renderer) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x050308);
  const panel = (color, intensity, w, h, pos, look) => {
    const mat = new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(intensity), side: THREE.DoubleSide });
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
    mesh.position.set(...pos);
    mesh.lookAt(...look);
    scene.add(mesh);
  };
  panel(PALETTE.magenta, 3, 6, 10, [-6, 1, 1], [0, 0, 0]);
  panel(PALETTE.cyan, 3, 6, 10, [6, 0, -1], [0, 0, 0]);
  panel(PALETTE.yellow, 2.2, 12, 1.2, [0, 6, 0], [0, 0, 0]);
  panel(PALETTE.violet, 1.6, 10, 10, [0, -6, 0], [0, 0, 0]);
  panel(0xffffff, 4, 1.2, 8, [2, 0, 6], [0, 0, 0]);
  panel(PALETTE.red, 2, 3, 3, [-3, -2, -6], [0, 0, 0]);

  const pmrem = new THREE.PMREMGenerator(renderer);
  const env = pmrem.fromScene(scene, 0.03).texture;
  pmrem.dispose();
  return env;
}

// Coque en plaques épaisses (prismes) construite à partir d'un icosaèdre.
function buildShell(radius) {
  const ico = new THREE.IcosahedronGeometry(radius, 0); // déjà non indexée
  const p = ico.attributes.position;
  const faces = [];
  const shrink = 0.84;
  const thickness = radius * 0.12;

  for (let f = 0; f < p.count; f += 3) {
    const a = new THREE.Vector3().fromBufferAttribute(p, f);
    const b = new THREE.Vector3().fromBufferAttribute(p, f + 1);
    const c = new THREE.Vector3().fromBufferAttribute(p, f + 2);
    const centroid = a.clone().add(b).add(c).divideScalar(3);
    const normal = centroid.clone().normalize();
    const top = [a, b, c].map((v) => v.clone().sub(centroid).multiplyScalar(shrink));
    const bottom = top.map((v) => v.clone().multiplyScalar(0.8).addScaledVector(normal, -thickness));
    const tris = [
      [top[0], top[1], top[2]],
      [bottom[0], bottom[2], bottom[1]],
    ];
    for (let i = 0; i < 3; i++) {
      const j = (i + 1) % 3;
      tris.push([top[i], bottom[i], bottom[j]], [top[i], bottom[j], top[j]]);
    }
    // orientation : chaque triangle doit regarder vers l'extérieur de la plaque
    const mid = normal.clone().multiplyScalar(-thickness * 0.5);
    const local = [];
    for (const [u, v, w] of tris) {
      const n = new THREE.Vector3().subVectors(v, u).cross(new THREE.Vector3().subVectors(w, u));
      const tc = u.clone().add(v).add(w).divideScalar(3).sub(mid);
      if (n.dot(tc) < 0) local.push(u, w, v);
      else local.push(u, v, w);
    }
    faces.push({ centroid, normal, local });
  }

  const vertCount = faces.length * faces[0].local.length;
  const positions = new Float32Array(vertCount * 3);
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

  const setExplode = (amount) => {
    let k = 0;
    for (const face of faces) {
      const ox = face.centroid.x + face.normal.x * amount;
      const oy = face.centroid.y + face.normal.y * amount;
      const oz = face.centroid.z + face.normal.z * amount;
      for (const v of face.local) {
        positions[k++] = v.x + ox;
        positions[k++] = v.y + oy;
        positions[k++] = v.z + oz;
      }
    }
    geometry.attributes.position.needsUpdate = true;
  };
  setExplode(0);
  geometry.computeVertexNormals();
  geometry.computeBoundingSphere();
  geometry.boundingSphere.radius *= 2;
  return { geometry, setExplode };
}

function textBandTexture() {
  const w = 2048, h = 64;
  const { canvas, ctx } = makeCanvas(w, h);
  const text = 'ネオン・ムーン // NEURAL CORE MK-03 // 時間減速 // OVERCLOCK 87% // 電脳 // ';
  ctx.font = '34px "Share Tech Mono", "DotGothic16", monospace';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = css(PALETTE.cyan);
  ctx.shadowColor = css(PALETTE.cyan);
  ctx.shadowBlur = 8;
  let x = 0;
  const step = ctx.measureText(text).width;
  while (x < w) {
    ctx.fillText(text, x, h / 2);
    x += step;
  }
  return toTexture(canvas, { repeat: true });
}

export function createCore(envMap) {
  const group = new THREE.Group();
  const spin = new THREE.Group();
  group.add(spin);

  // Coque de chrome
  const shell = buildShell(3);
  const chrome = new THREE.MeshStandardMaterial({
    color: 0xdfe3ee,
    metalness: 1,
    roughness: 0.16,
    envMap,
    envMapIntensity: 1.5,
    // pas de flatShading : il recalcule la normale par dérivées d'écran, ce qui donne
    // un NaN sur les faces vues par la tranche, et le bloom étend ce NaN à tout l'écran.
    // La géométrie n'étant pas indexée, les normales calculées sont déjà par face.
  });
  const shellMesh = new THREE.Mesh(shell.geometry, chrome);
  spin.add(shellMesh);

  // Cœur d'énergie visible entre les plaques
  const energyMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(PALETTE.magenta).multiplyScalar(1.6) });
  const energy = new THREE.Mesh(new THREE.IcosahedronGeometry(2.05, 3), energyMat);
  const hotMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(PALETTE.yellow).multiplyScalar(1.8) });
  const hot = new THREE.Mesh(new THREE.IcosahedronGeometry(1.1, 2), hotMat);
  spin.add(energy, hot);

  // Cage filaire
  const cageMat = new THREE.LineBasicMaterial({
    color: new THREE.Color(PALETTE.cyan).multiplyScalar(1.4),
    transparent: true,
    opacity: 0.35,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const cage = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.IcosahedronGeometry(4.4, 1)), cageMat);
  group.add(cage);

  // Anneaux
  const ringA = new THREE.Mesh(
    new THREE.TorusGeometry(5.4, 0.05, 6, 200),
    new THREE.MeshBasicMaterial({ color: new THREE.Color(PALETTE.yellow).multiplyScalar(2.2) }),
  );
  const ringB = new THREE.Mesh(
    new THREE.TorusGeometry(6.5, 0.028, 6, 220),
    new THREE.MeshBasicMaterial({ color: new THREE.Color(PALETTE.magenta).multiplyScalar(2.2) }),
  );
  ringA.rotation.x = Math.PI / 2.4;
  ringB.rotation.set(Math.PI / 3, 0.4, 0);
  group.add(ringA, ringB);

  // Graduations
  const tickCount = 48;
  const ticks = new THREE.InstancedMesh(
    new THREE.BoxGeometry(0.07, 0.4, 0.07),
    new THREE.MeshBasicMaterial({ color: new THREE.Color(PALETTE.cyan).multiplyScalar(1.3) }),
    tickCount,
  );
  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  for (let i = 0; i < tickCount; i++) {
    const a = (i / tickCount) * Math.PI * 2;
    const long = i % 4 === 0 ? 1.8 : 1;
    q.setFromAxisAngle(new THREE.Vector3(0, 0, 1), a);
    m.compose(new THREE.Vector3(Math.cos(a + Math.PI / 2) * 6.0, Math.sin(a + Math.PI / 2) * 6.0, 0), q, new THREE.Vector3(1, long, 1));
    ticks.setMatrixAt(i, m);
  }
  const tickRing = new THREE.Group();
  tickRing.add(ticks);
  tickRing.rotation.x = -0.25;
  group.add(tickRing);

  // Bande de texte holographique
  const bandTex = textBandTexture();
  bandTex.repeat.set(2, 1);
  const band = new THREE.Mesh(
    new THREE.CylinderGeometry(7.0, 7.0, 0.7, 128, 1, true),
    new THREE.MeshBasicMaterial({
      map: bandTex,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
      color: new THREE.Color(1.1, 1.1, 1.1),
    }),
  );
  band.rotation.x = 0.18;
  group.add(band);

  let explode = 0.15;
  const MAGENTA = new THREE.Color(PALETTE.magenta);
  const ACID = new THREE.Color(PALETTE.acid);

  return {
    object: group,
    get explode() { return explode; },
    // dt = temps simulé (ralenti compris), dtReal = temps réel, t = temps réel cumulé, dilation 0..1
    update(dt, dtReal, t, dilation) {
      spin.rotation.y += dt * 0.35;
      spin.rotation.x += dt * 0.12;
      cage.rotation.y -= dt * 0.18;
      cage.rotation.z += dt * 0.07;
      ringA.rotation.z += dt * 0.6;
      ringB.rotation.z -= dt * 0.45;
      tickRing.rotation.z += dt * 0.25;
      bandTex.offset.x -= dt * 0.04;

      const breathe = 0.12 + Math.sin(t * 1.6) * 0.06;
      const target = breathe + dilation * 1.5;
      explode += (target - explode) * (1 - Math.exp(-dtReal * 5));
      shell.setExplode(explode);

      const pulse = 1 + Math.sin(t * 3.2) * 0.05 + dilation * 0.15;
      energy.scale.setScalar(pulse);
      hot.scale.setScalar(1 + Math.sin(t * 5.1) * 0.08);
      energyMat.color.copy(MAGENTA).lerp(ACID, dilation).multiplyScalar(1.6);
    },
  };
}
