// Point d'entrée : crée le moteur, assemble la scène, lance la boucle.
import * as THREE from 'three';
import { CHAPTERS, QUALITY, WORLD, PALETTE, REDUCED_MOTION } from './config.js';
import { createSky } from './world/sky.js';
import { createCity } from './world/city.js';
import { createGround } from './world/ground.js';
import { createSigns } from './world/signs.js';
import { createTraffic } from './world/traffic.js';
import { createRain } from './world/rain.js';
import { createMoon } from './world/moon.js';
import { createCore, createNeonEnvironment } from './world/core.js';
import { createPostFX } from './fx/postfx.js';
import { createTimeDilation } from './fx/timeDilation.js';
import { createScrollRig } from './rig/scrollRig.js';
import { createHUD } from './ui/hud.js';
import { createBoot } from './ui/boot.js';

const boot = createBoot();

function webglAvailable() {
  try {
    const c = document.createElement('canvas');
    return !!(c.getContext('webgl2') || c.getContext('webgl'));
  } catch {
    return false;
  }
}

// Les enseignes dessinent du texte japonais sur canvas : on attend la police (1,5 s max).
async function fontsReady() {
  if (!document.fonts?.load) return;
  const wait = Promise.all([
    document.fonts.load('64px "DotGothic16"', 'ネオン夜城'),
    document.fonts.load('32px "Share Tech Mono"'),
  ]).catch(() => {});
  await Promise.race([wait, new Promise((r) => setTimeout(r, 1500))]);
}

async function start() {
  if (!webglAvailable()) {
    document.body.classList.add('no-webgl');
    boot.fail('WebGL indisponible sur cet appareil : version texte affichée.');
    return;
  }

  boot.log('initialisation du moteur', 'ok');
  const canvas = document.getElementById('scene');
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' });
  let pixelRatio = QUALITY.pixelRatio;
  renderer.setPixelRatio(pixelRatio);
  renderer.setSize(innerWidth, innerHeight);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.1;

  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(PALETTE.fog, WORLD.fogDensity);

  const camera = new THREE.PerspectiveCamera(50, innerWidth / innerHeight, 0.5, 6000);

  await fontsReady();

  // --- Monde ---
  const sky = createSky();
  const city = createCity();
  boot.log(`génération de la ville`, `${city.towerCount} tours`);
  const ground = createGround();
  const signs = createSigns(city.avenueLots);
  const traffic = createTraffic();
  const rain = createRain();
  const moon = createMoon();
  const core = createCore(createNeonEnvironment(renderer));
  boot.log('implant de chrome', 'en ligne');
  scene.add(sky.object, moon.object, ground.object, city.object, signs.object, traffic.object, rain.object, core.object);

  const towersStat = document.querySelector('[data-stat="towers"]');
  if (towersStat) towersStat.textContent = new Intl.NumberFormat('fr-FR').format(city.towerCount);

  // --- Effets, caméra, interface ---
  const post = createPostFX(renderer, scene, camera);
  const dilation = createTimeDilation(scene, core.object);
  const rig = createScrollRig(camera, CHAPTERS);
  const hud = createHUD({ onChapterChange: () => post.triggerGlitch(0.8) });

  // --- Taille de l'écran ---
  let aspect = 1;
  function resize() {
    const w = innerWidth, h = innerHeight;
    aspect = w / h;
    camera.aspect = aspect;
    camera.fov = aspect < 1 ? 64 : 50;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
    post.setSize(w, h);
  }
  addEventListener('resize', resize);
  resize();

  // Place de l'implant : décalée sur le côté en paysage, au-dessus du texte en portrait.
  const coreTarget = new THREE.Vector3();
  function placeCore(offset, t, dashAmount) {
    let { x, y } = offset;
    if (aspect < 1) {
      x *= 0.15;
      y += 3.6;
    } else {
      x *= Math.min(1, aspect / 1.6);
    }
    // pendant le ralenti, l'implant « fonce » sur une courbe et laisse ses images
    if (dashAmount > 0) {
      x += Math.sin(t * 2.3) * 5.5 * dashAmount * (aspect < 1 ? 0.45 : 1);
      y += Math.sin(t * 3.7) * 2.2 * dashAmount;
    }
    y += REDUCED_MOTION ? 0 : Math.sin(t * 1.1) * 0.35;
    // fixé dans le repère caméra : l'implant reste cadré même pendant un défilement rapide
    rig.cameraSpaceToWorld(x, y, offset.dist, coreTarget);
    core.object.position.copy(coreTarget);
    const s = offset.scale * (aspect < 1 ? 0.8 : 1);
    core.object.scale.setScalar(s);
  }

  // --- Qualité adaptative : baisse la résolution si l'appareil peine ---
  let perfClock = 0, perfFrames = 0, perfChecks = 0;
  function adaptQuality(dtReal) {
    if (perfChecks >= 2) return;
    perfClock += dtReal;
    perfFrames++;
    if (perfClock < 2.5) return;
    const fps = perfFrames / perfClock;
    perfClock = 0;
    perfFrames = 0;
    perfChecks++;
    if (fps < 40 && pixelRatio > 0.8) {
      pixelRatio = Math.max(0.75, pixelRatio * 0.72);
      renderer.setPixelRatio(pixelRatio);
      post.setPixelRatio(pixelRatio);
      resize();
    }
  }

  // Accès console pour régler les images clés : ouvrir la page avec ?debug
  if (new URLSearchParams(location.search).has('debug')) {
    window.__NEON__ = { THREE, camera, core: core.object, rig, scene };
  }

  // --- Boucle ---
  const clock = new THREE.Clock();
  let simTime = 0;
  let realTime = 0;
  let first = true;
  // première pose : l'implant démarre à sa place, sans glisser depuis l'origine
  rig.update(0.016);
  rig.cameraSpaceToWorld(rig.coreOffset.x, rig.coreOffset.y, rig.coreOffset.dist, core.object.position);

  function frame() {
    const dtReal = Math.min(clock.getDelta(), 0.05);
    realTime += dtReal;
    dilation.update(dtReal);
    const dt = dtReal * dilation.timeScale;
    simTime += dt;

    const offset = rig.update(dtReal);
    placeCore(offset, realTime, dilation.amount);

    sky.update(realTime, camera);
    city.update(simTime, camera);
    ground.update(simTime, camera);
    signs.update(simTime);
    traffic.update(dt);
    rain.update(simTime, camera);
    moon.update(realTime, rig.progress);
    core.update(dt, dtReal, realTime, dilation.amount);

    post.render(realTime, dtReal, { speed: rig.speed, dilation: dilation.amount });

    hud.update(dtReal, {
      progress: rig.progress,
      chapter: rig.chapter,
      altitude: camera.position.y * 2.4,
      dilation: dilation.amount,
      timeScale: dilation.timeScale,
    });

    adaptQuality(dtReal);

    if (first) {
      first = false;
      boot.done();
    }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}

start().catch((err) => {
  console.error(err);
  document.body.classList.add('no-webgl');
  boot.fail('La scène 3D n\'a pas pu démarrer : version texte affichée.');
});
