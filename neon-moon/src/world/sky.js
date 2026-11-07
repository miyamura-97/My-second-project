// Ciel : dégradé nuit → violet → horizon rose, avec étoiles qui scintillent.
import * as THREE from 'three';
import { PALETTE } from '../config.js';

export function createSky() {
  const material = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    uniforms: {
      uTime: { value: 0 },
      uTop: { value: new THREE.Color(PALETTE.skyTop) },
      uMid: { value: new THREE.Color(PALETTE.skyMid) },
      uHorizon: { value: new THREE.Color(PALETTE.skyHorizon) },
      uGlow: { value: new THREE.Color(PALETTE.magenta) },
    },
    vertexShader: /* glsl */ `
      varying vec3 vDir;
      void main() {
        vDir = normalize(position);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform float uTime;
      uniform vec3 uTop, uMid, uHorizon, uGlow;
      varying vec3 vDir;

      float hash13(vec3 p) {
        p = fract(p * 0.1031);
        p += dot(p, p.zyx + 31.32);
        return fract((p.x + p.y) * p.z);
      }

      void main() {
        vec3 d = normalize(vDir);
        float h = d.y;
        vec3 col = mix(uHorizon, uMid, smoothstep(0.0, 0.22, h));
        col = mix(col, uTop, smoothstep(0.22, 0.75, h));
        col += uGlow * 0.22 * exp(-abs(h) * 12.0);
        col = mix(col, uHorizon * 0.5, 1.0 - smoothstep(-0.05, 0.0, h));

        vec3 cell = floor(d * 420.0);
        float s = hash13(cell);
        float star = step(0.9972, s) * smoothstep(0.1, 0.35, h);
        float twinkle = 0.55 + 0.45 * sin(uTime * (1.5 + s * 3.0) + s * 80.0);
        col += vec3(0.75, 0.85, 1.0) * star * twinkle;

        gl_FragColor = vec4(col, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }
    `,
  });

  const mesh = new THREE.Mesh(new THREE.SphereGeometry(3800, 48, 24), material);
  mesh.frustumCulled = false;
  mesh.renderOrder = -10;

  return {
    object: mesh,
    update(time, camera) {
      material.uniforms.uTime.value = time;
      mesh.position.copy(camera.position);
    },
  };
}
