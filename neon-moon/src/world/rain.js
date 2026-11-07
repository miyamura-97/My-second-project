// Pluie : segments animés entièrement sur le GPU, dans une boîte qui suit la caméra.
import * as THREE from 'three';
import { QUALITY, PALETTE, REDUCED_MOTION } from '../config.js';
import { createRng } from '../utils/random.js';

export function createRain() {
  const r = createRng(42);
  const count = QUALITY.rain;
  const box = new THREE.Vector3(140, 110, 140);

  const offsets = new Float32Array(count * 2 * 3);
  const ends = new Float32Array(count * 2);
  for (let i = 0; i < count; i++) {
    const x = r() * box.x, y = r() * box.y, z = r() * box.z;
    for (let k = 0; k < 2; k++) {
      offsets.set([x, y, z], (i * 2 + k) * 3);
      ends[i * 2 + k] = k;
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(offsets, 3));
  geometry.setAttribute('aEnd', new THREE.BufferAttribute(ends, 1));

  const material = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    uniforms: {
      uTime: { value: 0 },
      uCam: { value: new THREE.Vector3() },
      uBox: { value: box },
      uColor: { value: new THREE.Color(PALETTE.cyan).lerp(new THREE.Color(0xffffff), 0.5) },
      uSpeed: { value: REDUCED_MOTION ? 35 : 90 },
    },
    vertexShader: /* glsl */ `
      attribute float aEnd;
      uniform float uTime, uSpeed;
      uniform vec3 uCam, uBox;
      varying float vAlpha;
      void main() {
        vec3 p = position;
        p.y = mod(p.y - uTime * uSpeed, uBox.y);
        p.xz = mod(p.xz - uCam.xz, uBox.xz);
        vec3 world = vec3(p.x + uCam.x - uBox.x * 0.5, p.y + uCam.y - uBox.y * 0.5, p.z + uCam.z - uBox.z * 0.5);
        world += vec3(0.35, -1.6, 0.0) * aEnd; // longueur + léger vent
        vec4 mv = viewMatrix * vec4(world, 1.0);
        float d = length(mv.xyz);
        vAlpha = (1.0 - aEnd * 0.8) * (1.0 - smoothstep(8.0, 70.0, d));
        gl_Position = projectionMatrix * mv;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 uColor;
      varying float vAlpha;
      void main() {
        gl_FragColor = vec4(uColor * vAlpha * 0.55, 1.0);
      }
    `,
  });

  const lines = new THREE.LineSegments(geometry, material);
  lines.frustumCulled = false;
  lines.renderOrder = 5;

  return {
    object: lines,
    update(time, camera) {
      material.uniforms.uTime.value = time;
      material.uniforms.uCam.value.copy(camera.position);
    },
  };
}
