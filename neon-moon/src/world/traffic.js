// Trafic aérien : traînées lumineuses sur des couloirs empilés.
// Vers la caméra = phares blancs/chauds, vers le fond = feux rouges.
import * as THREE from 'three';
import { QUALITY, WORLD, PALETTE } from '../config.js';
import { createRng } from '../utils/random.js';

export function createTraffic() {
  const r = createRng(WORLD.seed + 3);
  const count = QUALITY.traffic;
  const { zMin, zMax, xMax, block, street } = WORLD;
  const pitch = block + street;
  const zSpan = [zMin - 150, zMax + 220];

  const head = new THREE.Color(PALETTE.white).multiplyScalar(2.6);
  const warm = new THREE.Color(PALETTE.warm).multiplyScalar(2.4);
  const tail = new THREE.Color(PALETTE.red).multiplyScalar(2.6);
  const cross = [new THREE.Color(PALETTE.cyan).multiplyScalar(2.2), new THREE.Color(PALETTE.magenta).multiplyScalar(2.2)];
  // couloirs aériens (les caméras des chapitres sont placées entre deux couloirs)
  const heights = [12, 19, 27, 38, 52, 68];

  const cars = [];
  for (let i = 0; i < count; i++) {
    const alongAvenue = r() < 0.72;
    if (alongAvenue) {
      const towardCamera = r() < 0.5;
      const laneX = (towardCamera ? -1 : 1) * r.pick([2.5, 6, 9.5]);
      cars.push({
        axis: 'z',
        dir: towardCamera ? 1 : -1,
        x: laneX + r.range(-0.4, 0.4),
        y: r.pick(heights) + r.range(-1, 1),
        z: r.range(zSpan[0], zSpan[1]),
        speed: r.range(45, 90),
        len: r.range(2.5, 6),
        color: towardCamera ? (r() < 0.6 ? head : warm) : tail,
      });
    } else {
      const k = r.int(0, Math.floor((zMax - zMin) / pitch));
      cars.push({
        axis: 'x',
        dir: r() < 0.5 ? 1 : -1,
        x: r.range(-xMax, xMax),
        y: r.pick(heights) + r.range(4, 10),
        z: zMax - block - street * 0.5 - k * pitch + r.range(-2, 2),
        speed: r.range(35, 70),
        len: r.range(3, 7),
        color: r.pick(cross),
      });
    }
  }

  const geometry = new THREE.BoxGeometry(1, 1, 1);
  const material = new THREE.MeshBasicMaterial({ color: 0xffffff, fog: true });
  const mesh = new THREE.InstancedMesh(geometry, material, count);
  mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  mesh.frustumCulled = false;
  cars.forEach((c, i) => mesh.setColorAt(i, c.color));
  mesh.instanceColor.needsUpdate = true;

  const m = new THREE.Matrix4();

  function update(dt) {
    for (let i = 0; i < cars.length; i++) {
      const c = cars[i];
      if (c.axis === 'z') {
        c.z += c.dir * c.speed * dt;
        if (c.z > zSpan[1]) c.z = zSpan[0];
        if (c.z < zSpan[0]) c.z = zSpan[1];
        m.makeScale(0.7, 0.3, c.len);
      } else {
        c.x += c.dir * c.speed * dt;
        if (c.x > xMax) c.x = -xMax;
        if (c.x < -xMax) c.x = xMax;
        m.makeScale(c.len, 0.3, 0.7);
      }
      m.setPosition(c.x, c.y, c.z);
      mesh.setMatrixAt(i, m);
    }
    mesh.instanceMatrix.needsUpdate = true;
  }

  update(0);
  return { object: mesh, update };
}
