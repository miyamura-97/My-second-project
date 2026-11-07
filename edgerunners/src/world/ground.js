// Sol mouillé : asphalte sombre, marquages, bordures néon de l'avenue,
// rues transversales éclairées.
import * as THREE from 'three';
import { WORLD, PALETTE } from '../config.js';
import { HASH, FOG } from '../utils/shaderChunks.js';

export function createGround() {
  const { avenueHalf, block, street, zMax } = WORLD;
  const material = new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uCamPos: { value: new THREE.Vector3() },
      uFogColor: { value: new THREE.Color(PALETTE.fog) },
      uFogDensity: { value: WORLD.fogDensity },
      uEdgeL: { value: new THREE.Color(PALETTE.magenta) },
      uEdgeR: { value: new THREE.Color(PALETTE.cyan) },
      uLane: { value: new THREE.Color(PALETTE.yellow) },
      uStreet: { value: new THREE.Color(PALETTE.warm) },
      uAvenue: { value: avenueHalf },
      uPitch: { value: block + street },
      uStreet0: { value: zMax - block - street * 0.5 },
    },
    vertexShader: /* glsl */ `
      varying vec3 vWorld;
      void main() {
        vec4 wp = modelMatrix * vec4(position, 1.0);
        vWorld = wp.xyz;
        gl_Position = projectionMatrix * viewMatrix * wp;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform float uTime;
      uniform vec3 uCamPos, uEdgeL, uEdgeR, uLane, uStreet;
      uniform float uAvenue, uPitch, uStreet0;
      varying vec3 vWorld;
      ${HASH}
      ${FOG}

      void main() {
        float ax = abs(vWorld.x);
        vec3 col = vec3(0.012, 0.01, 0.022);

        // flaques : zones plus brillantes, bruit à grande échelle
        float puddle = hash12(floor(vWorld.xz * 0.12));
        col += vec3(0.03, 0.012, 0.05) * step(0.7, puddle);

        float onAve = 1.0 - step(uAvenue, ax);
        // pointillés de voies
        float lane = (1.0 - smoothstep(0.06, 0.16, abs(ax - 4.5))) * step(0.55, fract(vWorld.z * 0.05));
        col += uLane * lane * 0.55 * onAve;
        // bordures néon de l'avenue
        float edge = 1.0 - smoothstep(0.0, 0.3, abs(ax - uAvenue));
        col += mix(uEdgeL, uEdgeR, step(0.0, vWorld.x)) * edge * 2.4;
        // halo diffus autour des bordures (sol mouillé)
        col += mix(uEdgeL, uEdgeR, step(0.0, vWorld.x)) * exp(-abs(ax - uAvenue) * 0.6) * 0.12;

        // rues transversales
        float t = (vWorld.z - uStreet0) / uPitch;
        float dz = abs(fract(t + 0.5) - 0.5) * uPitch;
        float cross = (1.0 - smoothstep(0.0, 0.25, dz)) * step(uAvenue + 1.0, ax);
        col += uStreet * cross * 0.9;

        col = applyFog(col, length(vWorld - uCamPos));
        gl_FragColor = vec4(col, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }
    `,
  });

  const geometry = new THREE.PlaneGeometry(5000, 5000);
  geometry.rotateX(-Math.PI / 2);
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.z = -700;
  mesh.frustumCulled = false;

  return {
    object: mesh,
    update(time, camera) {
      material.uniforms.uTime.value = time;
      material.uniforms.uCamPos.value.copy(camera.position);
    },
  };
}
