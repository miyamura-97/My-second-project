// Ville procédurale : toutes les tours en un seul InstancedMesh (1 appel de dessin).
// Les fenêtres, bandeaux néon et arêtes lumineuses sont calculés dans le shader,
// en coordonnées du monde, donc la taille des fenêtres reste la même sur chaque tour.
import * as THREE from 'three';
import { WORLD, QUALITY, PALETTE } from '../config.js';
import { createRng } from '../utils/random.js';
import { HASH, FOG } from '../utils/shaderChunks.js';
import { glowTexture } from '../utils/canvas.js';

const vertexShader = /* glsl */ `
  varying vec3 vWorld;
  varying vec3 vNormalW;
  varying vec2 vUv;
  varying vec3 vSeed;
  varying float vTop;

  void main() {
    vec4 wp = modelMatrix * instanceMatrix * vec4(position, 1.0);
    vWorld = wp.xyz;
    vNormalW = normalize(mat3(modelMatrix) * mat3(instanceMatrix) * normal);
    vUv = uv;
    vSeed = instanceColor;
    vTop = instanceMatrix[3][1] + instanceMatrix[1][1];
    gl_Position = projectionMatrix * viewMatrix * wp;
  }
`;

const fragmentShader = /* glsl */ `
  uniform float uTime;
  uniform vec3 uCamPos;
  uniform vec3 uWinWarm, uWinCool, uWinPink;
  uniform vec3 uNeonA, uNeonB, uNeonC;
  varying vec3 vWorld;
  varying vec3 vNormalW;
  varying vec2 vUv;
  varying vec3 vSeed;
  varying float vTop;
  ${HASH}
  ${FOG}

  void main() {
    vec3 n = normalize(vNormalW);
    vec3 col = vec3(0.016, 0.014, 0.03);

    if (abs(n.y) < 0.5) {
      float u = abs(n.x) > 0.5 ? vWorld.z : vWorld.x;
      float v = vWorld.y;
      vec2 cellSize = vec2(1.5, 2.1);
      vec2 g = vec2(u, v) / cellSize;
      vec2 id = floor(g);
      vec2 f = fract(g);

      // fenêtre = rectangle au centre de la cellule
      float win = step(0.1, f.x) * step(f.x, 0.9) * step(0.32, f.y) * step(f.y, 0.74);
      float r = hash12(id + vSeed.xy * 97.0);
      float litProb = vSeed.z < 0.0 ? 0.0 : mix(0.06, 0.42, vSeed.z);
      float lit = step(r, litProb);

      // quelques fenêtres qui grésillent
      float flick = step(0.992, hash12(id * 1.31 + 7.0));
      lit *= 1.0 - flick * step(0.5, fract(uTime * 3.0 + r * 13.0));

      float r2 = hash12(id * 1.7 + vSeed.yx * 13.0);
      vec3 wc = r2 < 0.72 ? uWinWarm : (r2 < 0.93 ? uWinCool : uWinPink);
      col += wc * win * lit * (0.3 + 0.55 * r2);

      // dalles de façade : légère variation par étage
      col += vec3(0.02, 0.015, 0.045) * step(0.94, f.y);

      // néons atténués tout près de la caméra : sinon un bandeau devient un faisceau géant
      float nearFade = smoothstep(14.0, 50.0, length(vWorld - uCamPos));

      // bandeau néon au sommet des tours marquées
      vec3 neon = vSeed.y < 0.33 ? uNeonA : (vSeed.y < 0.66 ? uNeonB : uNeonC);
      float crown = step(0.7, vSeed.x);
      float band = smoothstep(vTop - 2.2, vTop - 1.9, v) * (1.0 - smoothstep(vTop - 1.2, vTop - 0.9, v));
      col += neon * band * crown * 2.4 * nearFade;

      // arêtes verticales lumineuses
      float edge = min(vUv.x, 1.0 - vUv.x);
      float stripe = step(0.9, vSeed.x) * (1.0 - smoothstep(0.0, 0.018, edge));
      col += neon * stripe * 1.8 * nearFade;

      // reflet des rues sur le bas des façades
      col += vec3(0.22, 0.03, 0.16) * exp(-max(v, 0.0) * 0.07) * 0.5;
    } else if (n.y > 0.5) {
      col = vec3(0.022, 0.018, 0.04);
    }

    col = applyFog(col, length(vWorld - uCamPos));
    gl_FragColor = vec4(col, 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

// Hauteur d'une tour selon sa position : plus haut près de l'avenue et du centre.
function towerHeight(r, x, z) {
  const downtown = Math.exp(-((z + 420) ** 2) / (2 * 280 ** 2));
  const nearAvenue = Math.abs(x) < 70 ? 1 : 0;
  let h = 10 + r() * 28 + downtown * 55 * r() + nearAvenue * 22 * r();
  if (r() < 0.05 + downtown * 0.14) h = 110 + r() * 160;
  // garder la vue sur la Lune dégagée au bout de l'avenue
  if (z < -820 && Math.abs(x) < 140) h = Math.min(h, 95);
  return h;
}

export function createCity() {
  const r = createRng(WORLD.seed);
  const instances = []; // { x, z, w, d, h, y, seed: [a, b, c] }
  const avenueLots = []; // tours dont une façade donne sur l'avenue (pour les enseignes)
  const beacons = []; // sommets d'antennes (feux rouges clignotants)
  const { avenueHalf, block, street, xMax, zMin, zMax, arasaka } = WORLD;
  const pitch = block + street;

  // emprise réservée à la tour Arasaka (avec une marge pour la dégager)
  const reserved = {
    x0: arasaka.x - arasaka.w / 2 - 8, x1: arasaka.x + arasaka.w / 2 + 8,
    z0: arasaka.z - arasaka.d / 2 - 8, z1: arasaka.z + arasaka.d / 2 + 8,
  };
  const overlapsReserved = (x, z, w, d) =>
    x + w / 2 > reserved.x0 && x - w / 2 < reserved.x1 && z + d / 2 > reserved.z0 && z - d / 2 < reserved.z1;

  const addTower = (x, z, w, d, h, isAvenue) => {
    const seed = [r(), r(), r()];
    instances.push({ x, z, w, d, h, y: 0, seed });
    if (isAvenue) avenueLots.push({ x, z, w, d, h });

    // étage en retrait sur les grandes tours
    if (h > 80 && r() < 0.55) {
      const h2 = h * r.range(0.15, 0.3);
      instances.push({ x, z, w: w * 0.62, d: d * 0.62, h: h2, y: h, seed: [seed[0], seed[1], seed[2] * 0.7] });
      h += h2;
    }
    // antenne
    if (h > 70 && r() < 0.6) {
      const ah = r.range(8, 26);
      instances.push({ x, z, w: 0.5, d: 0.5, h: ah, y: h, seed: [0, 0, -1] });
      beacons.push(new THREE.Vector3(x, h + ah + 0.4, z));
    }
  };

  // Grille principale, de part et d'autre de l'avenue
  for (let z0 = zMax; z0 > zMin; z0 -= pitch) {
    for (const side of [-1, 1]) {
      for (let xi = 0; ; xi++) {
        const inner = avenueHalf + 2 + xi * pitch;
        if (inner > xMax) break;
        if (xi > 1 && r() > QUALITY.density) continue;

        const split = r() < 0.45 ? 1 : 2; // 1 ou 2 lots par axe
        const lot = block / split;
        for (let i = 0; i < split; i++) {
          for (let j = 0; j < split; j++) {
            const gap = 1.6;
            const w = lot - gap * 2 - r() * 3;
            const d = lot - gap * 2 - r() * 3;
            const cxAbs = inner + i * lot + lot / 2;
            const cz = z0 - j * lot - lot / 2;
            const x = side * cxAbs;
            const h = towerHeight(r, x, cz);
            const facesAvenue = xi === 0 && i === 0;
            // bord intérieur aligné sur l'avenue pour les tours de première ligne
            const xAligned = facesAvenue ? side * (inner + w / 2) : x;
            if (overlapsReserved(xAligned, cz, w, d)) continue;
            addTower(xAligned, cz, w, d, h, facesAvenue);
          }
        }
      }
    }
  }

  // Tour Arasaka : socle massif, deux retraits, flèche avec feu rouge
  {
    const { x, z, w, d, h } = arasaka;
    const corp = [0.95, 0.1, 0.18]; // arêtes + bandeau magenta-rouge, peu de fenêtres
    instances.push({ x, z, w, d, h, y: 0, seed: corp });
    instances.push({ x, z, w: w * 0.72, d: d * 0.72, h: 70, y: h, seed: corp });
    instances.push({ x, z, w: w * 0.4, d: d * 0.4, h: 40, y: h + 70, seed: corp });
    instances.push({ x, z, w: 1.4, d: 1.4, h: 45, y: h + 110, seed: [0, 0, -1] });
    beacons.push(new THREE.Vector3(x, h + 156, z));
  }

  // Horizon lointain : grands volumes peu détaillés, noyés dans le brouillard
  const farCount = Math.round(380 * QUALITY.density);
  for (let i = 0; i < farCount; i++) {
    const side = r() < 0.5 ? -1 : 1;
    const x = side * r.range(xMax + 20, 950);
    const z = r.range(-1900, 250);
    const w = r.range(18, 40);
    const d = r.range(18, 40);
    const h = r() < 0.15 ? r.range(140, 320) : r.range(30, 120);
    instances.push({ x, z, w, d, h, y: 0, seed: [r(), r(), r() * 0.8] });
  }
  // Fond derrière la Lune
  for (let i = 0; i < farCount * 0.5; i++) {
    const x = r.range(-900, 900);
    const z = r.range(-2100, -1250);
    const h = Math.abs(x) < 220 ? r.range(20, 70) : r.range(40, 200);
    instances.push({ x, z, w: r.range(20, 45), d: r.range(20, 45), h, y: 0, seed: [r(), r(), r() * 0.8] });
  }

  // --- Mesh instancié ---
  const geometry = new THREE.BoxGeometry(1, 1, 1);
  geometry.translate(0, 0.5, 0);

  const material = new THREE.ShaderMaterial({
    vertexShader,
    fragmentShader,
    uniforms: {
      uTime: { value: 0 },
      uCamPos: { value: new THREE.Vector3() },
      uFogColor: { value: new THREE.Color(PALETTE.fog) },
      uFogDensity: { value: WORLD.fogDensity },
      uWinWarm: { value: new THREE.Color(PALETTE.warm).multiplyScalar(0.75) },
      uWinCool: { value: new THREE.Color(PALETTE.cyan).multiplyScalar(0.55) },
      uWinPink: { value: new THREE.Color(PALETTE.magenta).multiplyScalar(0.6) },
      uNeonA: { value: new THREE.Color(PALETTE.magenta) },
      uNeonB: { value: new THREE.Color(PALETTE.cyan) },
      uNeonC: { value: new THREE.Color(PALETTE.yellow) },
    },
  });

  const mesh = new THREE.InstancedMesh(geometry, material, instances.length);
  mesh.frustumCulled = false;
  const m = new THREE.Matrix4();
  const c = new THREE.Color();
  instances.forEach((b, i) => {
    m.makeScale(b.w, b.h, b.d);
    m.setPosition(b.x, b.y, b.z);
    mesh.setMatrixAt(i, m);
    mesh.setColorAt(i, c.setRGB(b.seed[0], b.seed[1], b.seed[2]));
  });
  mesh.instanceMatrix.needsUpdate = true;
  mesh.instanceColor.needsUpdate = true;

  // --- Feux d'antennes ---
  const beaconGeo = new THREE.BufferGeometry().setFromPoints(beacons);
  const phases = new Float32Array(beacons.length).map(() => r() * 6.28);
  beaconGeo.setAttribute('aPhase', new THREE.BufferAttribute(phases, 1));
  const beaconMat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    uniforms: {
      uTime: { value: 0 },
      uMap: { value: glowTexture(64) },
      uColor: { value: new THREE.Color(PALETTE.red).multiplyScalar(3) },
      uScale: { value: 900 },
    },
    vertexShader: /* glsl */ `
      attribute float aPhase;
      uniform float uTime;
      uniform float uScale;
      varying float vOn;
      void main() {
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        vOn = step(0.0, sin(uTime * 2.2 + aPhase));
        gl_PointSize = clamp(uScale / -mv.z, 2.0, 18.0);
        gl_Position = projectionMatrix * mv;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform sampler2D uMap;
      uniform vec3 uColor;
      varying float vOn;
      void main() {
        float a = texture2D(uMap, gl_PointCoord).r;
        gl_FragColor = vec4(uColor * a * vOn, 1.0);
      }
    `,
  });
  const beaconPoints = new THREE.Points(beaconGeo, beaconMat);
  beaconPoints.frustumCulled = false;

  const group = new THREE.Group();
  group.add(mesh, beaconPoints);

  const towerCount = instances.filter((b) => b.y === 0).length;

  return {
    object: group,
    avenueLots,
    towerCount,
    update(time, camera) {
      material.uniforms.uTime.value = time;
      material.uniforms.uCamPos.value.copy(camera.position);
      beaconMat.uniforms.uTime.value = time;
    },
  };
}
