// Post-traitement : bloom néon, puis une passe « écran » maison
// (aberration chromatique, glitch, lignes de balayage, grain, vignette, teinte du ralenti).
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { QUALITY, REDUCED_MOTION } from '../config.js';

const ScreenShader = {
  uniforms: {
    tDiffuse: { value: null },
    uTime: { value: 0 },
    uAberration: { value: 0.0015 },
    uGlitch: { value: 0 },
    uDilate: { value: 0 },
    uResolution: { value: new THREE.Vector2(1, 1) },
  },
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse;
    uniform float uTime, uAberration, uGlitch, uDilate;
    uniform vec2 uResolution;
    varying vec2 vUv;

    float hash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }

    void main() {
      vec2 uv = vUv;

      // glitch : bandes horizontales décalées
      float tick = floor(uTime * 24.0);
      float band = floor(uv.y * 28.0);
      float on = step(1.0 - uGlitch * 0.4, hash(vec2(band, tick)));
      uv.x += (hash(vec2(band * 1.7, tick)) - 0.5) * 0.09 * on * uGlitch;

      // aberration chromatique radiale
      vec2 dir = uv - 0.5;
      float amount = uAberration * (0.4 + dot(dir, dir) * 3.0) + uGlitch * 0.004 + uDilate * 0.003;
      vec2 off = dir * amount;
      vec3 col;
      col.r = texture2D(tDiffuse, uv + off).r;
      col.g = texture2D(tDiffuse, uv).g;
      col.b = texture2D(tDiffuse, uv - off).b;

      // ralenti : teinte verte désaturée (sans éclaircir) + liseré sur les bords
      float lum = dot(col, vec3(0.299, 0.587, 0.114));
      col = mix(col, vec3(lum) * vec3(0.5, 1.05, 0.8), uDilate * 0.5);
      float edge = smoothstep(0.45, 0.8, length(dir));
      col += vec3(0.02, 0.16, 0.09) * edge * uDilate;

      // lignes de balayage + grain
      float scan = 0.5 + 0.5 * sin(vUv.y * uResolution.y * 1.4);
      col *= 1.0 - 0.06 * scan;
      col += (hash(vUv * uResolution + uTime) - 0.5) * 0.035;

      // vignette
      col *= 1.0 - smoothstep(0.45, 0.95, length(dir * vec2(1.0, 0.85))) * 0.55;

      gl_FragColor = vec4(col, 1.0);
    }
  `,
};

export function createPostFX(renderer, scene, camera) {
  const size = renderer.getSize(new THREE.Vector2());
  const target = new THREE.WebGLRenderTarget(size.x, size.y, {
    type: THREE.HalfFloatType,
    samples: QUALITY.msaa,
  });
  const composer = new EffectComposer(renderer, target);
  composer.setPixelRatio(renderer.getPixelRatio());
  composer.setSize(size.x, size.y);

  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(new THREE.Vector2(size.x, size.y), QUALITY.bloom, 0.45, 0.6);
  composer.addPass(bloom);
  const screen = new ShaderPass(ScreenShader);
  composer.addPass(screen);
  composer.addPass(new OutputPass());

  let glitch = 0;

  return {
    composer,
    bloom,
    triggerGlitch(strength = 1) {
      if (!REDUCED_MOTION) glitch = Math.max(glitch, strength);
    },
    setSize(w, h) {
      composer.setSize(w, h);
      const pr = renderer.getPixelRatio();
      screen.uniforms.uResolution.value.set(w * pr, h * pr);
    },
    setPixelRatio(pr) {
      composer.setPixelRatio(pr);
    },
    render(time, dtReal, { speed = 0, dilation = 0 } = {}) {
      glitch = Math.max(0, glitch - dtReal * 2.2);
      const u = screen.uniforms;
      u.uTime.value = time;
      u.uGlitch.value = glitch;
      u.uDilate.value = dilation;
      u.uAberration.value = REDUCED_MOTION ? 0.0008 : 0.0016 + Math.min(speed, 1.5) * 0.006;
      bloom.strength = QUALITY.bloom;
      composer.render();
    },
  };
}
