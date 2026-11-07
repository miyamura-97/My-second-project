/* ---------- scène 3D, mode anime : un toit de Night City (Cyberpunk: Edgerunners) ----------
   Le QG est posé sur le toit d'une mégatour de Night City, la nuit, sous la pluie : un grand toit rond bordé de néons,
   des gradins en arc qui montent vers le fond (trois niveaux), des antennes, des blocs de clim, des voitures volantes en
   vol stationnaire, et toute la ville autour, des centaines de tours aux fenêtres allumées jusqu'à l'horizon rose, la Lune
   au loin. Chaque équipe se tient sur son estrade, à son niveau, et chaque agent y travaille sous les traits d'un homme de
   l'univers d'Edgerunners (David, Pilar, Falco, Faraday, Adam Smasher…) : seulement des hommes, règle des clips de Salah.
   Le cerveau est un Sandevistan géant qui flotte au-dessus du fond du toit ; le chef de cabinet est Maine, le chef de
   l'équipe, sur sa plateforme volante (demande de Salah du 07/11/2026, à la place de l'arène du Tournoi du Pouvoir).
   Tout est modelé ici en volumes simples : aucune image, aucun logo de la série. Page privée.
   Rendu « cel » : trois tons francs, trait d'encre par coque inversée (épaisseur fixe en pixels), aucun post-traitement.
   Chaque agent se tient dans un halo holographique à la couleur de son état ; au travail, son implant s'allume en vert
   Sandevistan ; chaque départ du jour part en faisceau de données cyan. */
async function init3DAnime() {
  const [THREE, { OrbitControls }, { RoundedBoxGeometry }, { mergeVertices, mergeGeometries }] = await Promise.all([
    import('three'),
    import('three/addons/controls/OrbitControls.js'),
    import('three/addons/geometries/RoundedBoxGeometry.js'),
    import('three/addons/utils/BufferGeometryUtils.js')
  ]);
  try {
    await Promise.race([
      Promise.all(['900 60px "Big Shoulders Display"', '60px "DotGothic16"', '600 40px Figtree', '500 40px Figtree', '500 30px "IBM Plex Mono"'].map(f => document.fonts.load(f))),
      new Promise(r => setTimeout(r, 3500))
    ]);
  } catch (e) { /* polices de secours */ }

  const canvas = $('#scene');
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, telephone() ? 1.75 : 2));
  renderer.setSize(innerWidth, innerHeight, false);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  const ANISO = renderer.capabilities.getMaxAnisotropy();
  const DPR = renderer.getPixelRatio();

  // la palette de Night City : encre presque noire, jaune, rose et cyan des néons, vert du Sandevistan
  const ENCRE = '#07060f', JAUNE = '#f3e600', MAGENTA = '#ff2a6d', CYAN = '#00f0ff', VERT_S = '#39ff9c', ROUGE = '#ff1f3d';
  const HORIZON = new THREE.Color('#1a0826');
  const scene = new THREE.Scene();
  scene.background = HORIZON.clone();
  scene.fog = new THREE.Fog(HORIZON.clone(), 140, 600);

  const camera = new THREE.PerspectiveCamera(38, innerWidth / innerHeight, 0.1, 1400);
  camera.position.set(0, 40, 90);
  const controls = new OrbitControls(camera, canvas);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.minDistance = 5;
  controls.maxDistance = 230;
  controls.maxPolarAngle = 1.5;
  controls.rotateSpeed = 0.6;
  controls.zoomSpeed = 0.8;
  controls.target.set(0, 3, -4);
  const horloge = new THREE.Clock();

  /* le ciel de Night City : nuit d'encre en haut, horizon rose de la ville, et le rougeoiement des rues dessous ; il suit la caméra */
  const ciel = new THREE.Mesh(new THREE.SphereGeometry(1000, 32, 16), new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, depthTest: false, fog: false,
    uniforms: { cHaut: { value: new THREE.Color('#030209') }, cMi: { value: new THREE.Color('#170732') }, cBas: { value: new THREE.Color('#5a1048') }, cAbime: { value: new THREE.Color('#12061c') } },
    vertexShader: 'varying vec3 vDir;\nvoid main() { vDir = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: `uniform vec3 cHaut, cMi, cBas, cAbime;
varying vec3 vDir;
void main() {
  float y = normalize(vDir).y;
  vec3 c = mix(cBas, cMi, smoothstep(0.0, 0.22, y));
  c = mix(c, cHaut, smoothstep(0.22, 0.75, y));
  c = mix(c, cAbime, 1.0 - smoothstep(-0.3, -0.01, y));
  gl_FragColor = vec4(c, 1.0);
  #include <colorspace_fragment>
}`
  }));
  ciel.renderOrder = -10;
  ciel.frustumCulled = false;
  scene.add(ciel);
  {
    const NE = 360, p = new Float32Array(NE * 3), v = new THREE.Vector3();
    for (let k = 0; k < NE; k++) { v.randomDirection(); v.y = Math.abs(v.y) * 0.85 + 0.15; v.normalize().multiplyScalar(900); p.set([v.x, v.y, v.z], k * 3); }
    const etoiles = new THREE.Points(new THREE.BufferGeometry().setAttribute('position', new THREE.BufferAttribute(p, 3)),
      new THREE.PointsMaterial({ color: '#dfe8ff', size: 1.6 * DPR, sizeAttenuation: false, transparent: true, opacity: 0.6, depthWrite: false, fog: false }));
    etoiles.renderOrder = -9; etoiles.frustumCulled = false;
    ciel.add(etoiles);
  }

  // la nuit : un clair de lune froid, un ciel violet, et deux néons du toit (rose à gauche, cyan à droite) qui découpent les silhouettes
  const lune = new THREE.DirectionalLight('#c9d2ff', 2.3);
  lune.position.set(-40, 70, 22);
  scene.add(lune);
  scene.add(new THREE.HemisphereLight('#9486dc', '#3a1844', 1.7));
  for (const [c, x] of [[MAGENTA, -24], [CYAN, 24]]) { const l = new THREE.PointLight(c, 100, 80, 1.5); l.position.set(x, 9, 14); scene.add(l); }

  /* rendu cel : trois tons (ombre, demi-teinte, lumière), et le trait d'encre */
  const rampe = new THREE.DataTexture(new Uint8Array([64, 64, 64, 64, 160, 160, 255, 255].flatMap(v => [v, v, v, 255])), 8, 1);
  rampe.minFilter = rampe.magFilter = THREE.NearestFilter;
  rampe.generateMipmaps = false;
  rampe.needsUpdate = true;
  const mats = new Map();
  function toon(hex, o = {}) {
    const k = `${hex}|${o.vc ? 1 : 0}|${o.em || ''}|${o.ei ?? ''}`;
    if (!mats.has(k)) mats.set(k, new THREE.MeshToonMaterial({ color: hex, gradientMap: rampe, vertexColors: !!o.vc, emissive: o.em || '#000000', emissiveIntensity: o.ei ?? 1 }));
    return mats.get(k);
  }
  const plat = hex => new THREE.MeshBasicMaterial({ color: hex });
  // les néons : des couleurs franches qui ne prennent ni ombre ni trait
  const matNeon = new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.DoubleSide });
  // Le trait : la même forme, vue de dos, poussée vers l'extérieur à l'écran. Épaisseur en pixels, plafonnée par une
  // épaisseur dans le monde pour que les objets lointains ne deviennent pas des taches d'encre.
  const resTrait = { value: new THREE.Vector2() };
  const majResTrait = () => renderer.getDrawingBufferSize(resTrait.value);
  majResTrait();
  const traits = new Map();
  function matTrait(px = 2.4, monde = 0.09) {
    const k = `${px}|${monde}`;
    if (!traits.has(k)) {
      const m = new THREE.MeshBasicMaterial({ color: ENCRE, side: THREE.BackSide });
      m.onBeforeCompile = sh => {
        sh.uniforms.uRes = resTrait;
        sh.uniforms.uPx = { value: px * DPR };
        sh.uniforms.uMonde = { value: monde };
        sh.uniforms.uMin = { value: 0.8 * DPR };
        sh.vertexShader = 'uniform vec2 uRes;\nuniform float uPx, uMonde, uMin;\n' + sh.vertexShader.replace('#include <project_vertex>', `#include <project_vertex>
  vec2 nTrait = (normalMatrix * normal).xy;
  float lTrait = length(nTrait);
  float pxTrait = max(uMin, min(uPx, uMonde * projectionMatrix[1][1] * uRes.y * 0.5 / gl_Position.w));
  if (lTrait > 1e-4) gl_Position.xy += nTrait / lTrait * pxTrait * 2.0 / uRes * gl_Position.w;`);
      };
      m.customProgramCacheKey = () => 'trait-anime';
      traits.set(k, m);
    }
    return traits.get(k);
  }
  // normales lissées pour la coque : sans elles, le trait s'ouvre aux arêtes vives
  const lisses = new WeakMap();
  function lisse(geo) {
    let g = lisses.get(geo);
    if (!g) {
      const p = new THREE.BufferGeometry();
      p.setAttribute('position', geo.getAttribute('position'));
      if (geo.index) p.setIndex(geo.index);
      g = mergeVertices(p, 1e-3);
      g.computeVertexNormals();
      lisses.set(geo, g);
    }
    return g;
  }
  function trait(m, px = 2.4, monde = 0.09) {
    const o = m.isInstancedMesh ? new THREE.InstancedMesh(lisse(m.geometry), matTrait(px, monde), m.count) : new THREE.Mesh(lisse(m.geometry), matTrait(px, monde));
    if (m.isInstancedMesh) { o.instanceMatrix = m.instanceMatrix; o.frustumCulled = m.frustumCulled; }
    o.matrixAutoUpdate = false;
    m.add(o);
    return m;
  }
  const maille = (geo, mat, px = 2.4, monde = 0.09) => { const m = new THREE.Mesh(geo, mat); return px ? trait(m, px, monde) : m; };
  const hasard3 = (x, y, z, s) => { const v = Math.sin(x * 12.9898 + y * 78.233 + z * 37.719 + s * 4.581) * 43758.5453; return v - Math.floor(v); };

  /* outils de dessin */
  function texCanvas(w, h, dessin) {
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    const g = c.getContext('2d');
    dessin(g, w, h);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = ANISO;
    return t;
  }
  const BANG = '900 {t}px "Big Shoulders Display", Figtree, sans-serif';
  function police(g, texte, max, taille, modele) {
    let t = taille;
    g.font = modele.replace('{t}', t);
    while (g.measureText(texte).width > max && t > 12) { t -= 2; g.font = modele.replace('{t}', t); }
    return t;
  }
  // Enseigne néon au-dessus de chaque île : plaque sombre penchée, cadre rose, titre jaune dédoublé cyan et rose.
  function bandeau(titre, sur, larg = 6.6) {
    const W = 1024, H = 300, P = 48, T = titre.toUpperCase();
    const forme = (g, x0, y0, x1, y1) => { g.beginPath(); g.moveTo(x0 + P, y0); g.lineTo(x1, y0); g.lineTo(x1 - P, y1); g.lineTo(x0, y1); g.closePath(); };
    const tex = texCanvas(W, H, g => {
      g.fillStyle = '#000000'; forme(g, 30, 34, W - 6, H - 6); g.fill();
      g.fillStyle = '#130d24'; forme(g, 10, 12, W - 26, H - 28); g.fill();
      g.save(); forme(g, 10, 12, W - 26, H - 28); g.clip();
      g.fillStyle = 'rgba(0,240,255,0.07)';
      for (let y = 16; y < H; y += 6) g.fillRect(0, y, W, 2);   // lignes de balayage
      g.fillStyle = MAGENTA; g.fillRect(0, H - 28 - 16, W, 16);
      g.fillStyle = JAUNE; g.fillRect(P + 10, H - 28 - 26, W * 0.3, 6);
      g.restore();
      g.lineWidth = 7; g.strokeStyle = MAGENTA; forme(g, 10, 12, W - 26, H - 28); g.stroke();
      const x = 88;
      if (sur) { g.font = '500 32px "IBM Plex Mono", monospace'; g.fillStyle = CYAN; g.fillText(sur.toUpperCase(), x, 70); }
      const y = sur ? 204 : 184;
      police(g, T, W - 2 * x - 40, 150, BANG);
      g.fillStyle = MAGENTA; g.fillText(T, x + 6, y + 2);
      g.fillStyle = CYAN; g.fillText(T, x - 5, y - 2);
      g.fillStyle = JAUNE; g.fillText(T, x, y);
    });
    return new THREE.Mesh(new THREE.PlaneGeometry(larg, larg * H / W), new THREE.MeshBasicMaterial({ map: tex, alphaTest: 0.5 }));
  }

  // Un écran cerclé de néon, avec un bandeau à la couleur du compte.
  async function affiche(nom, { larg, teinte = JAUNE, legende, sous }) {
    const img = await charger(vignette(nom));
    const iw = img ? img.naturalWidth : 270, ih = img ? img.naturalHeight : 480;
    const pad = Math.round(iw * 0.045);
    const bande = legende ? Math.round(iw * (sous ? 0.3 : 0.2)) : 0;
    const W = iw + pad * 2, H = ih + pad * 2 + bande;
    const tex = texCanvas(W, H, g => {
      g.fillStyle = '#0b0914'; g.fillRect(0, 0, W, H);
      if (img) g.drawImage(img, pad, pad, iw, ih); else { g.fillStyle = '#1d1830'; g.fillRect(pad, pad, iw, ih); }
      g.fillStyle = 'rgba(0,0,0,0.14)'; for (let y = pad; y < pad + ih; y += 4) g.fillRect(pad, y, iw, 1.5);   // trame d'écran
      g.lineWidth = Math.max(3, pad * 0.3); g.strokeStyle = teinte; g.strokeRect(pad, pad, iw, ih);
      if (legende) {
        const yb = ih + pad * 1.5, hb = bande - pad;
        g.fillStyle = teinte; g.fillRect(pad, yb, iw, hb);
        g.fillStyle = ENCRE;
        ajuster(g, legende, pad * 1.8, yb + hb * (sous ? 0.48 : 0.74), iw - pad * 1.6, Math.round(hb * (sous ? 0.4 : 0.62)), BANG);
        if (sous) ajuster(g, sous, pad * 1.8, yb + hb * 0.86, iw - pad * 1.6, Math.round(hb * 0.24), '600 {t}px Figtree, sans-serif');
      }
      g.lineWidth = pad * 0.5; g.strokeStyle = teinte; g.strokeRect(pad * 0.3, pad * 0.3, W - pad * 0.6, H - pad * 0.6);
    });
    const haut = larg * H / W;
    const m = new THREE.Mesh(new THREE.PlaneGeometry(larg, haut), new THREE.MeshBasicMaterial({ map: tex }));
    m.userData.haut = haut;
    return m;
  }

  // Un terminal : bandeau de couleur, titre en lettres de néon, lignes du tableau.
  function panneauTexte(titre, lignes, teinte, larg = 3.6) {
    const W = 900, lh = 60, H = 132 + lignes.length * lh + 30;
    const tex = texCanvas(W, H, g => {
      g.fillStyle = '#0d0a18'; g.fillRect(0, 0, W, H);
      g.fillStyle = 'rgba(0,240,255,0.05)'; for (let y = 112; y < H; y += 5) g.fillRect(0, y, W, 2);
      g.fillStyle = teinte; g.fillRect(0, 0, W, 104);
      g.fillStyle = MAGENTA; g.fillRect(0, 100, W, 7);
      g.fillStyle = ENCRE;
      ajuster(g, titre.toUpperCase(), 40, 80, W - 80, 62, BANG);
      g.fillStyle = '#ece8ff';
      lignes.forEach((l, i) => ajuster(g, '› ' + l, 40, 132 + 40 + i * lh, W - 80, 38, '600 {t}px Figtree, sans-serif'));
      g.lineWidth = 10; g.strokeStyle = teinte; g.strokeRect(5, 5, W - 10, H - 10);
    });
    return new THREE.Mesh(new THREE.PlaneGeometry(larg, larg * H / W), new THREE.MeshBasicMaterial({ map: tex }));
  }

  // Un afficheur d'optique (le chef) : titre jaune, puis des lignes.
  function panneauVert(titre, lignes, larg) {
    const W = 760, lh = 54, H = 118 + lignes.length * lh + 26;
    const tex = texCanvas(W, H, g => {
      rr(g, 6, 6, W - 12, H - 12, 10); g.fillStyle = 'rgba(12,9,24,0.92)'; g.fill(); g.lineWidth = 6; g.strokeStyle = '#000000'; g.stroke();
      rr(g, 14, 14, W - 28, H - 28, 6); g.lineWidth = 2.5; g.strokeStyle = 'rgba(243,230,0,0.7)'; g.stroke();
      g.fillStyle = 'rgba(243,230,0,0.06)'; for (let y = 18; y < H - 18; y += 5) g.fillRect(18, y, W - 36, 2);
      g.fillStyle = JAUNE; ajuster(g, titre.toUpperCase(), 40, 80, W - 80, 46, '500 {t}px "IBM Plex Mono", monospace');
      g.fillStyle = '#f2eeff'; lignes.forEach((l, i) => ajuster(g, l, 40, 118 + 38 + i * lh, W - 80, 36, '600 {t}px Figtree, sans-serif'));
    });
    return new THREE.Mesh(new THREE.PlaneGeometry(larg, larg * H / W), new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false }));
  }

  /* étiquettes d'optique au-dessus des agents : nom, cadence (passes par semaine), état, retard ou prochaine passe.
     Elles se dévoilent de haut en bas, comme un scan, à l'arrivée et à chaque entrée dans une île. */
  const scans = [];
  const offPC = decalage(D.releve.iso);
  function etiquette(a, idSalle) {
    const W = 512, H = 236, e = ETATS[a.etat] || ETATS.demande, p = puissance(a), r = retardDe(a);
    const tex = texCanvas(W, H, g => {
      rr(g, 5, 5, W - 10, H - 10, 10); g.fillStyle = 'rgba(10,8,22,0.92)'; g.fill(); g.lineWidth = 6; g.strokeStyle = '#000000'; g.stroke();
      rr(g, 13, 13, W - 26, H - 26, 6); g.lineWidth = 2.5; g.strokeStyle = 'rgba(243,230,0,0.6)'; g.stroke();
      g.fillStyle = 'rgba(0,240,255,0.05)'; for (let y = 18; y < H - 18; y += 5) g.fillRect(18, y, W - 36, 2);
      g.strokeStyle = JAUNE; g.lineWidth = 4;
      for (const [x, y, sx, sy] of [[24, 24, 1, 1], [W - 24, 24, -1, 1], [24, H - 24, 1, -1], [W - 24, H - 24, -1, -1]]) { g.beginPath(); g.moveTo(x, y + 16 * sy); g.lineTo(x, y); g.lineTo(x + 16 * sx, y); g.stroke(); }
      g.fillStyle = '#f2eeff'; ajuster(g, a.nom, 38, 64, W - 76, 34, '600 {t}px Figtree, sans-serif');
      g.fillStyle = CYAN; g.font = '500 19px "IBM Plex Mono", monospace'; g.fillText('CADENCE', 38, 98);
      const n = p === null ? '—' : String(p);
      g.fillStyle = JAUNE; g.font = '500 58px "IBM Plex Mono", monospace'; g.fillText(n, 36, 156);
      const wn = g.measureText(n).width;
      g.fillStyle = '#c9c2e6';
      ajuster(g, p === null ? 'sans heure fixe' : a.type === 'unique' ? (a.fait ? 'passe faite' : 'passe prévue') : 'passes / semaine', 36 + wn + 14, 152, W - 76 - wn - 14, 22, '500 {t}px "IBM Plex Mono", monospace');
      g.fillStyle = e.couleur; g.font = '600 25px "IBM Plex Mono", monospace'; g.fillText(e.txt.toUpperCase(), 38, 204);
      const droite = r ? `RETARD ${r}` : a.prochaine ? `PROCH. ${sansAujourdhui(a.prochaine, offPC)}` : '';
      if (droite) { g.textAlign = 'right'; g.fillStyle = r ? '#ffb43b' : '#c9c2e6'; ajuster(g, droite, W - 38, 204, 226, 22, '500 {t}px "IBM Plex Mono", monospace'); g.textAlign = 'left'; }
    });
    const u = { value: reduit ? 1 : 0 };
    const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false });
    mat.onBeforeCompile = sh => {
      sh.uniforms.uScan = u;
      sh.fragmentShader = 'uniform float uScan;\n' + sh.fragmentShader.replace('#include <map_fragment>', `#include <map_fragment>
  float ligneScan = 1.0 - uScan;
  if (vMapUv.y < ligneScan) discard;
  diffuseColor.rgb += vec3(1.0, 0.95, 0.2) * smoothstep(0.07, 0.0, vMapUv.y - ligneScan) * step(uScan, 0.999);`);
    };
    mat.customProgramCacheKey = () => 'scan-anime';
    scans.push({ u, salle: idSalle, debut: 1.4 + scans.length * 0.06 });
    return new THREE.Mesh(new THREE.PlaneGeometry(2.05, 2.05 * H / W), mat);
  }

  /* agents de Night City, chacun dans son halo holographique */
  const GEO = {
    ombre: new THREE.CircleGeometry(0.62, 28).rotateX(-Math.PI / 2),
    aura: new THREE.PlaneGeometry(2.6, 4.1).translate(0, 1.85, 0)
  };
  const tAura = { value: 0 };
  const VS_AURA = `uniform float uRecul;
uniform vec2 uTaille;
varying vec2 vUv;
void main() {
  vUv = uv;
  vec3 centre = (modelMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
  vec3 versCam = cameraPosition - centre;
  versCam.y = 0.0;
  float l = length(versCam);
  versCam = l > 1e-4 ? versCam / l : vec3(0.0, 0.0, 1.0);
  vec3 droite = vec3(versCam.z, 0.0, -versCam.x);
  vec3 p = centre + droite * position.x * uTaille.x + vec3(0.0, position.y * uTaille.y, 0.0) - versCam * uRecul;
  gl_Position = projectionMatrix * viewMatrix * vec4(p, 1.0);
}`;
  // Le halo : une colonne d'hologramme, bords vifs, lignes de balayage qui montent, tranches qui sautent (glitch).
  const FS_AURA = `uniform float uT, uForce, uVite, uAlpha, uGraine;
uniform vec3 uCoul, uCoeur;
varying vec2 vUv;
float h21(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
void main() {
  vec2 p = vUv;
  float y = clamp(p.y, 0.0, 1.0);
  float t = uT * uVite;
  float cran = floor(t * 7.0);
  float tranche = floor(y * 26.0);
  float saut = step(0.86 - 0.12 * uForce, h21(vec2(tranche + uGraine, cran)));
  float x = p.x - 0.5 + (h21(vec2(tranche, cran + uGraine)) - 0.5) * 0.14 * saut;
  float larg = mix(0.4, 0.3, y) * (0.85 + 0.15 * uForce);
  float d = abs(x) / larg;
  float bord = (1.0 - smoothstep(0.9, 1.0, d)) * smoothstep(0.72, 0.9, d);
  float corps = 1.0 - smoothstep(0.3, 1.0, d);
  float lignes = 0.78 + 0.22 * step(0.5, fract(y * 42.0 - t * 1.4));
  float a = (corps * 0.2 + bord * 0.8) * lignes;
  a *= smoothstep(0.0, 0.08, y) * (1.0 - smoothstep(0.62, 1.0, y)) * uAlpha;
  if (a < 0.01) discard;
  vec3 c = mix(uCoul, uCoeur, bord * 0.55 + 0.15 * saut);
  gl_FragColor = vec4(c, a);
  #include <colorspace_fragment>
}`;
  const AURA = {   // couleur, cœur, force, vitesse, opacité
    travaille: [JAUNE, '#fffbd6', 1.0, 1.6, 0.9],
    bloque: ['#ff003c', '#ffd0da', 0.9, 2.3, 0.9],
    attention: ['#ff9a3c', '#ffe6cc', 0.75, 1.3, 0.82],
    ok: [VERT_S, '#e6fff2', 0.45, 0.75, 0.55],
    attente: ['#5aa9ff', '#e6f2ff', 0.4, 0.65, 0.5],
    demande: ['#b9b0d6', '#ffffff', 0.3, 0.5, 0.3]
  };
  // en départ, le halo passe au cyan du faisceau de données
  const DEPART_AURA = { coul: new THREE.Color(CYAN), coeur: new THREE.Color('#e6feff') };
  function aura(etat) {
    const [c, k, f, v, al] = AURA[etat] || AURA.demande;
    const base = { coul: new THREE.Color(c), coeur: new THREE.Color(k), force: f, vite: v, alpha: al };
    const m = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, side: THREE.DoubleSide,
      uniforms: {
        uT: tAura, uCoul: { value: base.coul.clone() }, uCoeur: { value: base.coeur.clone() }, uForce: { value: f }, uVite: { value: v }, uAlpha: { value: al },
        uRecul: { value: 0.55 }, uTaille: { value: new THREE.Vector2(1, 1) }, uGraine: { value: Math.random() * 9 }
      },
      vertexShader: VS_AURA, fragmentShader: FS_AURA
    });
    const me = new THREE.Mesh(GEO.aura, m);
    me.renderOrder = 1;
    return { me, base };
  }
  /* Les agents : des volumes simples (sphères, blocs arrondis, cônes, capsules) colorés par sommet, fusionnés par partie
     (corps, bras, tête, cheveux, yeux, implant) et partagés entre les agents qui ont le même personnage. Grosse tête,
     trois têtes et quart de haut : le visage reste lisible sur un téléphone. Tenues d'après la série, simplifiées. */
  const PEAU = '#f0c49c', NOIR = '#16151d', BLANC_P = '#e9e6f2', OR = JAUNE;
  const HAUTV = new THREE.Vector3(0, 1, 0), qPic = new THREE.Quaternion();
  function teinte(g0, hex) {
    const g = g0.index ? g0.toNonIndexed() : g0;
    if (g.getAttribute('uv')) g.deleteAttribute('uv');
    const c = new THREE.Color(hex), n = g.getAttribute('position').count, a = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) { a[i * 3] = c.r; a[i * 3 + 1] = c.g; a[i * 3 + 2] = c.b; }
    g.setAttribute('color', new THREE.BufferAttribute(a, 3));
    return g;
  }
  const boule = (r, hex, x, y, z, s = [1, 1, 1], seg = 14) => teinte(new THREE.SphereGeometry(r, seg, Math.max(6, Math.round(seg * 0.7))).scale(...s).translate(x, y, z), hex);
  const bloc = (w, h, d, hex, x, y, z, r = 0.06) => teinte(new RoundedBoxGeometry(w, h, d, 2, r).translate(x, y, z), hex);
  const fut = (r1, r2, h, hex, x, y, z, seg = 12) => teinte(new THREE.CylinderGeometry(r1, r2, h, seg).translate(x, y, z), hex);
  const anneau = (r, e, hex, x, y, z) => teinte(new THREE.TorusGeometry(r, e, 8, 32).rotateX(Math.PI / 2).translate(x, y, z), hex);
  function pic(x, y, z, dir, r, h, hex, seg = 6) {
    const g = new THREE.ConeGeometry(r, h, seg).translate(0, h / 2, 0);
    g.applyQuaternion(qPic.setFromUnitVectors(HAUTV, new THREE.Vector3(...dir).normalize()));
    return teinte(g.translate(x, y, z), hex);
  }
  const calotte = (r, ouv, hex, rx = 0) => teinte(new THREE.SphereGeometry(r, 20, 10, 0, Math.PI * 2, 0, ouv).rotateX(rx), hex);
  // le devant du visage (sphère de rayon 0,4 étirée par s) : où poser les yeux, les sourcils, la bouche
  const surface = (x, y, s) => 0.4 * s[2] * Math.sqrt(Math.max(0, 1 - (x / (0.4 * s[0])) ** 2 - (y / (0.4 * s[1])) ** 2));
  // un buste en V : cylindre plus large aux épaules, aplati d'avant en arrière
  const tronc = (rh, rb, h, hex, y, ep = 0.62, z = 0) => teinte(new THREE.CylinderGeometry(rh, rb, h, 16).scale(1, 1, ep).translate(0, y, z), hex);
  const fusion = l => mergeGeometries(l);

  // Corps commun : pieds à y = 0, bassin vers 0,9, pivot des bras à 1,42 ; la tête (modelée au rayon 0,4) se pose à 1,9.
  const EPAULE = 1.42, TETE = 1.9, K_TETE = 0.9;
  function corpsDe(o) {
    const p = [], L = o.large || 1, J = o.jambes || 1;
    if (o.robe) p.push(fut(0.32 * L, 0.6 * L, 1.06, o.robe, 0, 0.53, 0, 20));
    else {
      const r = (o.ample ? 0.19 : 0.145) * J;   // un pantalon large, ou une jambe ajustée
      for (const s of [-1, 1]) {
        const x = s * 0.17 * L;
        p.push(bloc(0.24 * J, 0.2, 0.36, o.bottes || NOIR, x, 0.1, 0.04, 0.08));
        p.push(fut(0.13 * J, 0.14 * J, 0.26, o.tige || o.bottes || NOIR, x, 0.3, 0, 12));
        p.push(fut(r * 0.92, r * 0.84, 0.3, o.bas, x, 0.55, 0, 12), fut(r, r * 0.93, 0.32, o.bas, x, 0.8, 0, 12));
      }
      p.push(bloc(0.6 * L, 0.26, 0.38 * J, o.bas, 0, 0.92, 0, 0.1));
    }
    p.push(tronc(0.37 * L, 0.27 * L, 0.52, o.haut, 1.26));
    if (o.ceinture) p.push(bloc(0.58 * L + 0.06, 0.11, 0.42 * J, o.ceinture, 0, 1.02, 0, 0.05));
    if (o.col) p.push(teinte(new THREE.BoxGeometry(0.21, 0.21, 0.04).rotateZ(Math.PI / 4).translate(0, 1.45, 0.215), o.col));
    p.push(fut(0.115, 0.13, 0.18, o.cou || o.peau, 0, 1.58, 0, 10));
    if (o.corps) p.push(...o.corps());
    return p;
  }
  function brasDe(o) {
    const p = [], e = o.epaule || 0.42, g = o.costaud || 1;
    for (const s of [-1, 1]) {
      p.push(boule(0.15 * g, o.manche || o.haut, s * (e - 0.02), -0.02, 0));
      p.push(teinte(new THREE.CapsuleGeometry(0.095 * g, 0.2, 4, 10).translate(s * e, -0.22, 0), o.bras || o.peau));
      // l'avant-bras, coude plié vers l'avant : prêt à bondir, les poings devant le corps
      p.push(teinte(new THREE.CapsuleGeometry(0.088 * g, 0.18, 4, 10).rotateX(-0.5).translate(s * e, -0.5, 0.08), o.avantBras || o.bras || o.peau));
      if (o.poignets) p.push(teinte(new THREE.CylinderGeometry(0.102 * g, 0.102 * g, 0.1, 12).rotateX(-0.5).translate(s * e, -0.6, 0.135), o.poignets));
      p.push(boule(0.112 * g, o.mains || o.peau, s * e, -0.7, 0.18, [1, 1, 1], 12));
    }
    if (o.bras2) p.push(...o.bras2(e, g));
    return p;
  }
  function teteDe(o) {
    const s = o.crane || [1, 0.97, 0.95], p = [boule(0.4, o.peau, 0, 0, 0, s, 20)];
    if (o.oreilles !== false) for (const k of [-1, 1]) p.push(boule(0.075, o.peau, k * 0.39 * s[0], -0.03, 0, [0.7, 1, 1], 8));
    if (o.sourcils !== false) for (const k of [-1, 1]) p.push(teinte(new THREE.BoxGeometry(0.15, o.sourcilsEp || 0.035, 0.04).rotateZ(-k * (o.regard === 'dur' ? 0.42 : 0.3)).translate(k * 0.13, 0.12, surface(0.13, 0.12, s) + 0.012), o.sourcils || NOIR));
    if (o.sourire) p.push(teinte(new THREE.TorusGeometry(0.075, 0.016, 4, 14, Math.PI).rotateZ(Math.PI).translate(0, -0.13, surface(0, -0.17, s) + 0.01), o.bouche || '#7a2b2b'));
    else p.push(teinte(new THREE.BoxGeometry(o.bouchL || 0.09, 0.018, 0.02).translate(0, -0.18, surface(0, -0.18, s) + 0.012), o.bouche || '#7a2b2b'));
    if (o.tete) p.push(...o.tete(s));
    return p;
  }
  // Les yeux à l'encre, sans trait autour (ils clignent) : blanc, iris, reflet, paupière ; le nez en petit trait d'ombre.
  function yeuxDe(o) {
    const s = o.crane || [1, 0.97, 0.95], p = [];
    if (o.nez !== false) p.push(teinte(new THREE.BoxGeometry(0.014, 0.05, 0.01).rotateZ(0.35).translate(0.012, -0.075, surface(0.012, -0.075, s) + 0.008), o.nez || '#d69a7a'));
    if (o.lunettes) return p;
    const y = o.yeuxY || 0, z = surface(0.13, y, s), l = o.petitsYeux ? 0.72 : 1, dur = o.regard === 'dur';
    for (const k of [-1, 1]) {
      p.push(teinte(new THREE.CircleGeometry(0.078 * l, 16).scale(1, dur ? 0.78 : 0.95, 1).translate(k * 0.13, y, z + 0.004), o.blanc || '#ffffff'));
      p.push(teinte(new THREE.CircleGeometry(0.045 * l, 12).translate(k * 0.118, y - 0.006, z + 0.008), o.iris || NOIR));
      p.push(teinte(new THREE.CircleGeometry(0.014, 8).translate(k * 0.118 + 0.016, y + 0.02, z + 0.011), '#ffffff'));
      // la paupière d'encre : le regard décidé des edgerunners
      p.push(teinte(new THREE.BoxGeometry(0.17 * l, 0.026, 0.02).rotateZ(-k * (dur ? 0.3 : 0.14)).translate(k * 0.13, y + (dur ? 0.052 : 0.066) * l, z + 0.012), NOIR));
    }
    return p;
  }

  // Cheveux : une calotte sur le crâne, puis les mèches en cônes (base, direction, rayon, longueur).
  // David : rasé sur les côtés, le dessus en épis qui partent vers le haut et l'arrière, une mèche sur le front
  const cheveuxDavid = c => [
    calotte(0.425, 1.05, c, -0.5),
    pic(-0.14, 0.34, 0.06, [-0.35, 1, 0.25], 0.12, 0.34, c),
    pic(0.02, 0.38, 0.08, [0.05, 1, 0.35], 0.13, 0.38, c),
    pic(0.16, 0.33, 0.04, [0.45, 0.95, 0.2], 0.12, 0.32, c),
    pic(-0.05, 0.36, -0.12, [-0.1, 1, -0.4], 0.13, 0.36, c),
    pic(0.12, 0.3, -0.2, [0.3, 0.8, -0.6], 0.12, 0.3, c),
    pic(-0.16, 0.28, -0.2, [-0.4, 0.75, -0.6], 0.12, 0.3, c),
    pic(0.06, 0.33, 0.24, [0.25, -0.5, 0.85], 0.07, 0.24, c)
  ];
  // plaqués en arrière : la calotte, des mèches couchées vers la nuque
  const cheveuxPlaques = coul => () => [
    calotte(0.432, 1.18, coul, -0.42),
    pic(-0.16, 0.3, 0.12, [-0.25, 0.35, -1], 0.14, 0.42, coul),
    pic(0, 0.34, 0.14, [0, 0.4, -1], 0.15, 0.46, coul),
    pic(0.16, 0.3, 0.12, [0.25, 0.35, -1], 0.14, 0.42, coul),
    pic(-0.26, 0.14, -0.1, [-0.4, 0.1, -1], 0.12, 0.34, coul),
    pic(0.26, 0.14, -0.1, [0.4, 0.1, -1], 0.12, 0.34, coul)
  ];
  const cheveuxRas = coul => () => [calotte(0.418, 1.12, coul, -0.3)];
  const cheveuxFrange = coul => () => [calotte(0.435, 1.28, coul, -0.22),
    pic(-0.16, 0.26, 0.26, [-0.15, -0.95, 0.35], 0.09, 0.22, coul), pic(0, 0.28, 0.28, [0, -0.95, 0.35], 0.09, 0.22, coul), pic(0.16, 0.26, 0.26, [0.15, -0.95, 0.35], 0.09, 0.22, coul)];
  // Un trait lumineux le long de l'avant-bras (repère du groupe des bras), pour les implants des bras.
  const bandeBras = (e, coul) => [-1, 1].map(s => teinte(new THREE.BoxGeometry(0.035, 0.26, 0.03).rotateX(-0.5).translate(s * e, -0.5, 0.17), coul));
  const devant = (w, h, coul, y = 1.3, x = 0, z = 0.25) => teinte(new THREE.BoxGeometry(w, h, 0.03).translate(x, y, z), coul);
  const lunettesNoires = (s, coul = '#0d0c12') => bloc(0.36, 0.09, 0.05, coul, 0, 0.02, surface(0, 0.02, s) + 0.02, 0.03);

  // Les personnages (seulement des hommes, règle des clips de Salah). « implant » : ce qui s'allume au travail
  // (corps : repère du corps ; bras : repère des bras, il suit leurs gestes).
  const IMPLANT_SANDE = () => ({ corps: [0, 1, 2, 3, 4].map(i => bloc(0.12, 0.07, 0.05, VERT_S, 0, 1.08 + i * 0.1, -0.215, 0.02)).concat([devant(0.05, 0.12, VERT_S, 1.6, 0.13, 0.13)]), bras: bandeBras(0.42, VERT_S) });
  const PERSOS = {
    // David Martinez : la veste jaune ouverte sur un tee-shirt noir, le Sandevistan dans le dos
    david: { peau: '#e9b48e', haut: '#f2c81f', manche: '#f2c81f', bras: '#f2c81f', avantBras: '#f2c81f', poignets: NOIR, mains: '#e9b48e',
      bas: '#2a2833', bottes: '#121116', tige: '#121116', ceinture: '#121116', regard: 'dur', iris: '#3a2a1e',
      corps: () => [devant(0.17, 0.46, NOIR, 1.27), bloc(0.62, 0.1, 0.44, '#d9b018', 0, 1.0, 0, 0.04), teinte(new THREE.BoxGeometry(0.3, 0.14, 0.05).translate(0, 1.5, -0.2), NOIR)],
      cheveux: cheveuxDavid, implant: IMPLANT_SANDE },
    // Pilar : grand et sec, bras de chrome, veste turquoise sur un haut rose, toujours le sourire
    pilar: { echelle: 1.05, large: 0.9, jambes: 0.95, costaud: 0.95, peau: '#eac09a', haut: '#1fa79b', manche: '#1fa79b', bras: '#8b93a8', avantBras: '#8b93a8', mains: '#6f778c',
      bas: '#3b2f5c', bottes: '#18161f', tige: '#18161f', ceinture: '#c33a55', regard: 'dur', iris: '#2b4a2e', sourire: true,
      corps: () => [devant(0.18, 0.44, MAGENTA, 1.27)],
      cheveux: cheveuxPlaques('#b8923e'), implant: () => ({ bras: bandeBras(0.42, VERT_S) }) },
    // Falco : le pilote, blouson de cuir, lunettes noires, barbe courte
    falco: { peau: '#d9a27c', haut: '#5a2a24', manche: '#5a2a24', bras: '#5a2a24', avantBras: '#5a2a24', mains: '#d9a27c',
      bas: '#1d1c24', bottes: '#3a2418', tige: '#3a2418', ceinture: '#141318', lunettes: true, sourcils: '#3a3a40',
      corps: () => [devant(0.18, 0.46, '#d8d4e0', 1.27)],
      tete: s => [lunettesNoires(s), bloc(0.22, 0.07, 0.03, '#4a4a52', 0, -0.25, surface(0, -0.25, s) + 0.005, 0.02)],
      cheveux: cheveuxPlaques('#3a3a42'), implant: () => ({ corps: [devant(0.3, 0.035, VERT_S, 1.6, 0, 0.12)] }) },
    // Faraday : le fixer, costume sombre, chemise blanche, cravate rouge, barbe grise taillée
    faraday: { peau: '#e3b089', haut: '#1c2131', manche: '#1c2131', bras: '#1c2131', avantBras: '#1c2131', poignets: '#e8e6ef', mains: '#e3b089',
      bas: '#1c2131', bottes: '#0f0f14', tige: '#0f0f14', regard: 'dur', iris: '#3b3b46', sourcils: '#77777f', sourcilsEp: 0.045,
      corps: () => [devant(0.16, 0.36, '#e8e6ef', 1.33, 0, 0.245), devant(0.06, 0.28, '#9c1b2c', 1.3, 0, 0.262)],
      tete: s => [boule(0.21, '#77777f', 0, -0.2, surface(0, -0.2, s) - 0.1, [1.15, 0.85, 0.75], 12)],
      cheveux: cheveuxPlaques('#77777f'), implant: () => ({ corps: [devant(0.04, 0.12, VERT_S, 1.6, 0.16, 0.13)] }) },
    // Adam Smasher : le colosse de chrome d'Arasaka, épaulières, visière rouge, mâchoire en grille
    smasher: { echelle: 1.22, large: 1.35, jambes: 1.25, epaule: 0.56, costaud: 1.45, kTete: 0.92, peau: '#4a4f5c', crane: [0.95, 1.05, 1.0],
      haut: '#3a3e4a', manche: '#2a2d36', bras: '#4a4f5c', avantBras: '#3a3e4a', mains: '#2a2d36', bas: '#2a2d36', bottes: '#1b1d24', tige: '#2a2d36', ceinture: '#1b1d24',
      oreilles: false, sourcils: false, nez: false, lunettes: true, bouche: '#14151b', bouchL: 0.16,
      corps: () => [-1, 1].map(s => teinte(new RoundedBoxGeometry(0.28, 0.3, 0.52, 2, 0.06).translate(s * 0.44, 1.48, 0), '#2a2d36')),
      tete: s => [bloc(0.42, 0.075, 0.06, ROUGE, 0, 0.05, surface(0, 0.05, s) + 0.02, 0.02), bloc(0.3, 0.16, 0.06, '#23252d', 0, -0.2, surface(0, -0.2, s) + 0.02, 0.03)],
      implant: () => ({ corps: [0, 1, 2].map(i => devant(0.36, 0.035, ROUGE, 1.12 + i * 0.12, 0, 0.26)) }) },
    // le ripperdoc : blouse claire, lunettes-loupes, crâne dégarni
    doc: { echelle: 0.96, peau: '#e8bd98', haut: '#e9e8f2', manche: '#e9e8f2', bras: '#e9e8f2', avantBras: '#e9e8f2', mains: '#bfe9df',
      bas: '#2e3140', bottes: '#16151d', tige: '#16151d', sourcils: '#9a9aa2', lunettes: true,
      corps: () => [fut(0.4, 0.5, 0.6, '#e9e8f2', 0, 0.74, 0, 16), devant(0.16, 0.38, '#3a7f7a', 1.3, 0, 0.245)],
      tete: s => [lunettesNoires(s, '#7fd3ff')],
      cheveux: () => [teinte(new THREE.SphereGeometry(0.445, 20, 12, Math.PI / 2 + 0.9, Math.PI * 2 - 1.8, 1.05, 0.85), '#a8a8b0')],
      implant: () => ({ corps: [devant(0.05, 0.05, VERT_S, 1.4, -0.16)] }) },
    // Jimmy Kurosaki : le producteur de braindance, costume noir, chemise violette
    jimmy: { peau: '#efc9a4', haut: '#26222f', manche: '#26222f', bras: '#26222f', avantBras: '#26222f', poignets: '#7a3cff', mains: '#efc9a4',
      bas: '#26222f', bottes: '#101015', tige: '#101015', iris: '#2a2030',
      corps: () => [devant(0.16, 0.36, '#7a3cff', 1.33, 0, 0.245)],
      cheveux: cheveuxPlaques(NOIR), implant: () => ({ corps: [devant(0.04, 0.16, VERT_S, 1.58, -0.17, 0.1)] }) },
    // Katsuo : l'élève de l'Arasaka Academy, uniforme sombre, cravate rouge, écusson jaune
    katsuo: { echelle: 0.94, peau: '#f1cfae', haut: '#1a1d2b', manche: '#1a1d2b', bras: '#1a1d2b', avantBras: '#1a1d2b', mains: '#f1cfae',
      bas: '#3a3d48', bottes: '#121218', tige: '#121218',
      corps: () => [devant(0.16, 0.36, '#f3f1f7', 1.33, 0, 0.245), devant(0.06, 0.28, '#c8102e', 1.3, 0, 0.262), bloc(0.08, 0.08, 0.02, JAUNE, 0.16, 1.36, 0.25, 0.01)],
      cheveux: cheveuxFrange(NOIR) },
    // un opérateur de la Trauma Team : armure blanche et bleue, casque à visière cyan
    trauma: { large: 1.08, peau: '#d8a07c', haut: '#e8ecf4', manche: '#1f6fff', bras: '#e8ecf4', avantBras: '#e8ecf4', poignets: '#1f6fff', mains: '#2a2d36',
      bas: '#2a2d36', bottes: '#e8ecf4', tige: '#2a2d36', ceinture: '#1f6fff', oreilles: false, lunettes: true, sourcils: false,
      corps: () => [bloc(0.5, 0.42, 0.06, '#d6dcea', 0, 1.28, 0.24, 0.05), bloc(0.14, 0.14, 0.03, '#1f6fff', 0, 1.33, 0.28, 0.02)],
      tete: s => [bloc(0.46, 0.13, 0.08, '#38e0ff', 0, 0.04, surface(0, 0.04, s) + 0.03, 0.04)],
      cheveux: () => [calotte(0.45, 1.6, '#e8ecf4', -0.1), anneau(0.43, 0.04, '#1f6fff', 0, 0.02, 0)] },
    // un agent du MaxTac : armure noire, visière rouge
    maxtac: { large: 1.1, costaud: 1.15, peau: '#c99470', haut: '#17181f', manche: '#23252e', bras: '#17181f', avantBras: '#23252e', mains: '#101015',
      bas: '#17181f', bottes: '#0c0c10', tige: '#17181f', ceinture: '#2b2d36', oreilles: false, lunettes: true, sourcils: false,
      corps: () => [bloc(0.52, 0.44, 0.07, '#23252e', 0, 1.28, 0.24, 0.05), ...[-1, 1].map(s => bloc(0.22, 0.12, 0.46, '#2b2d36', s * 0.36, 1.5, 0, 0.04))],
      tete: s => [bloc(0.44, 0.06, 0.06, '#ff003c', 0, 0.05, surface(0, 0.05, s) + 0.03, 0.02)],
      cheveux: () => [calotte(0.45, 1.65, '#17181f', -0.05)] },
    // un garde d'Arasaka : costume gris anthracite, liseré rouge, lunettes noires
    arasaka: { peau: '#e2b48c', haut: '#2b2b33', manche: '#2b2b33', bras: '#2b2b33', avantBras: '#2b2b33', poignets: '#c8102e', mains: '#101015',
      bas: '#2b2b33', bottes: '#101015', tige: '#101015', ceinture: '#c8102e', lunettes: true,
      corps: () => [devant(0.04, 0.4, '#c8102e', 1.3, 0.12)],
      tete: s => [lunettesNoires(s)],
      cheveux: cheveuxRas(NOIR) },
    // Maine, le chef de l'équipe (chef de cabinet) : carrure énorme, bras et épaules de chrome, crâne rasé, bouc
    maine: { echelle: 1.12, large: 1.22, jambes: 1.1, epaule: 0.52, costaud: 1.32, peau: '#b9825e', haut: '#1d1c23', manche: '#8e95a8', bras: '#8e95a8', avantBras: '#7b8296', mains: '#5d6375',
      bas: '#4b5130', bottes: '#16151b', tige: '#16151b', ceinture: '#2d2a22', regard: 'dur', iris: '#2a1d16', sourcilsEp: 0.05,
      corps: () => [-1, 1].map(s => bloc(0.2, 0.16, 0.48, '#596073', s * 0.4, 1.5, 0, 0.05)),
      tete: s => [bloc(0.2, 0.1, 0.06, '#2a1f19', 0, -0.27, surface(0, -0.27, s) - 0.01, 0.03)],
      cheveux: cheveuxRas('#2a1f19'), implant: () => ({ bras: bandeBras(0.52, VERT_S) }) }
  };
  // Chaque agent reçoit le personnage suivant de la liste, dans l'ordre des salles : jamais deux fois le même dans une salle.
  const ROSTER = ['david', 'pilar', 'falco', 'faraday', 'smasher', 'doc', 'jimmy', 'katsuo', 'trauma', 'maxtac', 'arasaka'];
  let rang = 0;
  const persoSuivant = () => ROSTER[rang++ % ROSTER.length];
  const MOULES = {};
  function moule(type) {
    if (!MOULES[type]) {
      const o = PERSOS[type], y = yeuxDe(o), im = o.implant ? o.implant() : {};
      MOULES[type] = { o, corps: fusion(corpsDe(o)), bras: fusion(brasDe(o)), tete: fusion(teteDe(o)), yeux: y.length ? fusion(y) : null,
        cheveux: o.cheveux ? fusion(o.cheveux(NOIR)) : null,
        implantCorps: im.corps?.length ? fusion(im.corps) : null, implantBras: im.bras?.length ? fusion(im.bras) : null };
    }
    return MOULES[type];
  }

  const matPerso = toon('#ffffff', { vc: true }), matYeux = new THREE.MeshBasicMaterial({ vertexColors: true });
  const matImplant = new THREE.MeshBasicMaterial({ vertexColors: true });   // l'implant brille : ni ombre ni trait
  const matOmbre = new THREE.MeshBasicMaterial({ color: ENCRE, transparent: true, opacity: 0.4, depthWrite: false });
  const ROB = [];   // { r : le groupe, a : l'agent, salle }
  function robot(a, idSalle, type) {
    const m = moule(type), k = m.o.echelle || 1;
    const g = new THREE.Group();
    const ombre = new THREE.Mesh(GEO.ombre, matOmbre); ombre.position.y = 0.02; ombre.scale.setScalar(k * (m.o.large || 1)); g.add(ombre);
    const corps = new THREE.Group(); corps.scale.setScalar(k); g.add(corps);
    corps.add(maille(m.corps, matPerso, 2.6, 0.06));
    const bras = new THREE.Group(); bras.position.y = EPAULE; corps.add(bras);
    bras.add(maille(m.bras, matPerso, 2.4, 0.05));
    const tete = new THREE.Group(); tete.position.y = TETE; tete.scale.setScalar(K_TETE * (m.o.kTete || 1)); corps.add(tete);
    tete.add(maille(m.tete, matPerso, 2.6, 0.06));
    if (m.cheveux) tete.add(maille(m.cheveux, matPerso, 2.6, 0.06));
    const yeux = m.yeux ? new THREE.Mesh(m.yeux, matYeux) : null;
    if (yeux) tete.add(yeux);
    const implants = [];
    if (m.implantCorps) { const im = new THREE.Mesh(m.implantCorps, matImplant); im.visible = false; corps.add(im); implants.push(im); }
    if (m.implantBras) { const im = new THREE.Mesh(m.implantBras, matImplant); im.visible = false; bras.add(im); implants.push(im); }
    const au = aura(a.etat); g.add(au.me);
    g.userData = { tete, yeux, bras, implants, etat: a.etat, phase: Math.random() * 6.28, y0: 0, x0: 0, aura: au.me.material.uniforms, base: au.base, charge: 0 };
    ROB.push({ r: g, a, salle: idSalle });
    return g;
  }
  function animerRobot(r, t) {
    const u = r.userData, p = u.phase, c = u.charge;
    const vite = u.etat === 'travaille' ? 2.6 : 1;
    r.position.y = u.y0 + Math.sin(t * 1.6 * vite + p) * 0.035 + c * 0.14;
    r.position.x = u.x0 + (u.etat === 'bloque' ? Math.sin(t * 43 + p) * 0.016 : 0) + (c > 0 ? Math.sin(t * 61 + p) * 0.03 * c : 0);
    u.tete.rotation.y = c > 0.2 ? 0 : Math.sin(t * 0.5 + p) * 0.22;
    u.tete.rotation.x = u.etat === 'travaille' ? Math.sin(t * 6 + p) * 0.05 : 0;
    // les bras : prêts au repos, levés au travail, tendus vers l'avant pour lancer le faisceau
    const garde = u.etat === 'travaille' ? -0.45 + Math.sin(t * 6 + p) * 0.08 : u.etat === 'bloque' ? 0.05 : -0.12 + Math.sin(t * 1.6 + p) * 0.03;
    u.bras.rotation.x = garde + (-1.45 - garde) * Math.min(1, c * 1.5);
    // Sandevistan : l'implant s'allume au travail et pendant la charge, et grésille à pleine charge
    const allume = c > 0.3 || u.etat === 'travaille';
    for (const im of u.implants) im.visible = allume && (c < 0.6 || Math.sin(t * 38 + p) > -0.5);
    if (u.yeux) u.yeux.scale.y = ((t + p * 3) % 4.3) < 0.13 ? 0.12 : 1;
    const a = u.aura, b = u.base;
    a.uCoul.value.copy(b.coul).lerp(DEPART_AURA.coul, c);
    a.uCoeur.value.copy(b.coeur).lerp(DEPART_AURA.coeur, c);
    a.uForce.value = b.force + (1.15 - b.force) * c;
    a.uVite.value = b.vite + (1.9 - b.vite) * c;
    a.uAlpha.value = b.alpha + (0.96 - b.alpha) * c;
    a.uTaille.value.set(1 + 0.22 * c, 1 + 0.25 * c);
  }

  /* le toit : béton sombre, néons, blocs de clim, antennes */
  const BETON = '#2a2537', FLANC = '#1c1828', PROFOND = '#121019', ACIER = '#3a3648', MARINE = '#1d1830';
  const NEONS = [MAGENTA, CYAN, JAUNE];
  const matRoche = toon('#ffffff', { vc: true });
  // le dessus d'une couleur, les flancs d'une autre (une marche, une estrade)
  function deux(g0, dessus, cote) {
    const g = g0.index ? g0.toNonIndexed() : g0;
    if (g.getAttribute('uv')) g.deleteAttribute('uv');
    g.computeVertexNormals();
    const n = g.getAttribute('normal'), a = new Float32Array(n.count * 3), c1 = new THREE.Color(dessus), c2 = new THREE.Color(cote);
    for (let i = 0; i < n.count; i++) { const c = n.getY(i) > 0.6 ? c1 : c2; a[i * 3] = c.r; a[i * 3 + 1] = c.g; a[i * 3 + 2] = c.b; }
    g.setAttribute('color', new THREE.BufferAttribute(a, 3));
    return g;
  }
  // un grand anneau couché (bord du toit, d'une estrade), et le même en arc, de l'angle a0 à a1
  const cercle = (r, e, hex, y, seg = 96) => teinte(new THREE.TorusGeometry(r, e, 6, seg).rotateX(Math.PI / 2).translate(0, y, 0), hex);
  const arc = (r, e, a0, a1, y, hex) => teinte(new THREE.TorusGeometry(r, e, 6, Math.ceil((a1 - a0) * 20), a1 - a0).rotateX(Math.PI / 2).rotateY(-a0).translate(0, y, 0), hex);
  // une marche en arc de cercle : de l'angle a0 à a1 (le fond du toit est à -90°), du rayon r0 à r1, du niveau y0 à y1
  function croissant(r0, r1, a0, a1, y0, y1) {
    const s = new THREE.Shape();
    s.absarc(0, 0, r1, -a0, -a1, true);
    s.absarc(0, 0, r0, -a1, -a0, false);
    s.closePath();
    return new THREE.ExtrudeGeometry(s, { depth: y1 - y0, bevelEnabled: false, curveSegments: 32 }).rotateX(-Math.PI / 2).translate(0, y0, 0);
  }
  const deco = [];   // tout le béton immobile du toit, fusionné en une seule maille à la fin
  const neon = [];   // tous les tubes de néon, fusionnés en une seule maille qui brille
  // Une antenne : un mât d'acier cerclé de bagues de néon sur un socle, un feu rouge au sommet. « place » la pose dans le monde.
  function pilier(h, r, place, graine = 1) {
    const e = Math.max(0.3, r * 0.55), l = r * 2.7;
    deco.push(place(teinte(new THREE.BoxGeometry(l, e, l).translate(0, e / 2, 0), ACIER)));
    deco.push(place(teinte(new THREE.CylinderGeometry(r * 0.5, r * 0.75, h - e, 8).translate(0, e + (h - e) / 2, 0), ACIER)));
    for (let y = e + 1.3, k = 0; y < h - 0.5; y += 2.3, k++) neon.push(place(teinte(new THREE.CylinderGeometry(r * 0.82, r * 0.82, 0.14, 8).translate(0, y, 0), NEONS[(graine + k) % 3])));
    neon.push(place(teinte(new THREE.SphereGeometry(r * 0.45, 10, 8).translate(0, h + r * 0.3, 0), ROUGE)));
  }
  // Un bloc de clim sur le toit : un caisson, un ventilateur, parfois un second caisson empilé.
  function clim(x, y, z, t, graine) {
    const h1 = hasard3(graine, 1, 2, 3), a = h1 * Math.PI;
    const geos = [bloc(1.8 * t, 1.1 * t, 1.3 * t, ACIER, 0, 0.55 * t, 0, 0.06),
      teinte(new THREE.CylinderGeometry(0.42 * t, 0.42 * t, 0.06, 18).translate(0, 1.13 * t, 0), '#16141e'),
      teinte(new THREE.TorusGeometry(0.42 * t, 0.05, 6, 18).rotateX(Math.PI / 2).translate(0, 1.14 * t, 0), '#5a566a')];
    if (h1 > 0.5) geos.push(bloc(1.2 * t, 0.7 * t, 1.0 * t, '#433e55', 0.2 * t, 1.45 * t, 0.1 * t, 0.05));
    return geos.map(g => g.rotateY(a).translate(x, y, z));
  }
  const D2R = Math.PI / 180;
  const surArene = (deg, r, y) => new THREE.Vector3(Math.cos(deg * D2R) * r, y, Math.sin(deg * D2R) * r);

  /* le toit de la mégatour : un grand disque de béton bordé de néons, des gradins en arc qui montent vers le fond
     (trois niveaux), une estrade au centre, des blocs de clim et des antennes */
  const RA = 30, NIV = [0, 2.6, 5.2];
  const arene = new THREE.Group(); scene.add(arene);
  // le dessus : béton sombre, bande de danger au bord, cercles de néon peints, l'inscription « Night City » en katakana
  const texSol = texCanvas(1024, 1024, (g, w) => {
    const c = w / 2, k = c / RA, T = Math.PI * 2;
    g.fillStyle = '#26212f'; g.fillRect(0, 0, w, w);
    for (let i = 0; i < 2600; i++) { const x = (i * 97.13) % w, y = (i * 57.71 + (i % 13) * 31) % w; g.fillStyle = i % 3 ? 'rgba(255,255,255,0.025)' : 'rgba(0,0,0,0.09)'; g.fillRect(x, y, 3, 3); }
    g.save(); g.beginPath(); g.arc(c, c, 29.35 * k, 0, T); g.arc(c, c, 27.9 * k, 0, T, true); g.clip();
    g.fillStyle = JAUNE; g.fillRect(0, 0, w, w);
    g.fillStyle = '#121016'; g.translate(c, c);
    for (let i = 0; i < 96; i++) { g.rotate(T / 96); g.beginPath(); g.moveTo(27.8 * k, -4); g.lineTo(29.5 * k, 8); g.lineTo(29.5 * k, 22); g.lineTo(27.8 * k, 10); g.fill(); }
    g.restore();
    const rond = (r, lw, col) => { g.beginPath(); g.arc(c, c, r * k, 0, T); g.lineWidth = lw; g.strokeStyle = col; g.stroke(); };
    rond(25.7, 5, 'rgba(255,42,109,0.85)'); rond(19.3, 3, 'rgba(0,240,255,0.6)'); rond(13.4, 4, 'rgba(243,230,0,0.5)'); rond(8.0, 2, 'rgba(255,255,255,0.2)');
    g.strokeStyle = 'rgba(255,255,255,0.07)'; g.lineWidth = 2;
    for (let i = 0; i < 24; i++) { const a = i / 24 * T; g.beginPath(); g.moveTo(c + Math.cos(a) * 13.4 * k, c + Math.sin(a) * 13.4 * k); g.lineTo(c + Math.cos(a) * 25.2 * k, c + Math.sin(a) * 25.2 * k); g.stroke(); }
    g.fillStyle = 'rgba(243,230,0,0.28)'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.font = `${Math.round(2.6 * k)}px "DotGothic16", sans-serif`; g.fillText('ナイトシティ', c, c + 10.4 * k);
  });
  // la peinture du sol luit un peu (réfléchissante) : elle garde ses couleurs sous les néons
  arene.add(new THREE.Mesh(new THREE.CircleGeometry(RA, 128).rotateX(-Math.PI / 2), new THREE.MeshToonMaterial({ map: texSol, gradientMap: rampe, emissive: '#ffffff', emissiveMap: texSol, emissiveIntensity: 0.35 })));
  // la tranche du toit en deux plateaux, bordée de néons ; la tour elle-même descend dans la ville (plus bas)
  deco.push(teinte(new THREE.CylinderGeometry(RA, RA - 0.4, 1.4, 112).translate(0, -0.72, 0), FLANC),
    teinte(new THREE.CylinderGeometry(RA - 0.6, RA - 1.4, 1.8, 96).translate(0, -2.3, 0), PROFOND));
  neon.push(cercle(RA - 0.05, 0.12, MAGENTA, -0.02, 160), cercle(RA - 0.8, 0.07, CYAN, -1.5, 160));
  // l'estrade ronde du centre, à deux étages cerclés de néon
  deco.push(deux(new THREE.CylinderGeometry(6.6, 7.0, 0.9, 64).translate(0, 0.45, 0), BETON, FLANC),
    deux(new THREE.CylinderGeometry(3.4, 3.7, 0.55, 48).translate(0, 1.17, 0), BETON, FLANC));
  neon.push(cercle(6.6, 0.07, JAUNE, 0.9), cercle(3.4, 0.07, CYAN, 1.45, 64));
  // les gradins : un grand arc à mi-hauteur sur le fond et les côtés, un plus haut au fond, chacun monté par trois marches
  for (const [r0, a0, a1, y0, y1] of [[15, 160, 380, NIV[0], NIV[1]], [18.6, 214, 326, NIV[1], NIV[2]]]) {
    for (let m = 0; m < 3; m++) deco.push(deux(croissant(r0 - (2 - m) * 0.7, RA - 0.2, a0 * D2R, a1 * D2R, y0 - 0.01, y0 + (y1 - y0) * (m + 1) / 3), BETON, FLANC));
    neon.push(arc(r0, 0.07, a0 * D2R, a1 * D2R, y1, MAGENTA));
  }
  // les blocs de clim et les antennes, là où ils ne cachent aucune équipe
  [[125, 14.6, 0, 0.9], [55, 14.6, 0, 0.85], [200, 12.3, 0, 0.75], [340, 12.3, 0, 0.75], [270, 12.4, 0, 0.9], [90, 27.6, 0, 0.75]]
    .forEach(([deg, r, y, t], k) => { const v = surArene(deg, r, y); deco.push(...clim(v.x, v.y, v.z, t, k + 11)); });
  [[204, 28.4, NIV[1], 15], [229, 28.6, NIV[2], 12.5], [311, 28.6, NIV[2], 12.5], [336, 28.4, NIV[1], 15],
    [172, 27, NIV[1], 5.2], [8, 27, NIV[1], 4.4], [104, 28.6, 0, 3.6], [76, 28.6, 0, 3.0]]
    .forEach(([deg, r, y, h], k) => { const v = surArene(deg, r, y); pilier(h, 0.62, g => g.translate(v.x, v.y, v.z), k); });

  /* salles : chaque équipe travaille sur son niveau, le long du fer à cheval des gradins ; l'ordre des étapes fait le tour
     du toit, des deux équipes du bas, devant, jusqu'aux deux du haut, sous le Sandevistan */
  const PLACES = [[145, 21, 0, 0.6], [190, 22, 1, 0.85], [242, 23.2, 2, 0.3], [298, 23.2, 2, -0.3], [350, 22, 1, -0.85], [35, 21, 0, -0.6]];   // angle, rayon, niveau, orientation
  const LARG = 10, PROF = 8.4, HAUT = 0, MURH = 5.6, ZA = 1.9, YA = 0.24;   // écran ; rangée des agents (z) et hauteur de leur estrade
  const salles3d = {};
  const cibles = [];
  const decor = {};
  const geoFeuille = new THREE.BoxGeometry(0.5, 0.012, 0.68);
  const surMur = (t, c, marge = 0.35) => {   // un terminal plaqué en haut de l'écran, réduit s'il est trop haut
    const h = t.geometry.parameters.height, k = Math.min(1, (c.MURH - 0.6) / h);
    t.scale.setScalar(k);
    t.position.set(0, c.HAUT + c.MURH - marge - h * k / 2, c.zMur + 0.17);
    return t;
  };

  decor.veille = async (grp, s, c) => {
    const b = s.blocs.find(x => x.type === 'mur');
    if (!b) return;
    const lw = 2.6, gx = 0.28;
    const ps = await Promise.all(b.images.slice(0, 6).map(n => affiche(n, { larg: lw, teinte: CYAN })));
    ps.forEach((p, k) => {
      const col = k % 3, row = Math.floor(k / 3), h = p.userData.haut;
      p.position.set((col - 1) * (lw + gx), c.HAUT + c.MURH - 0.32 - h / 2 - row * (h + 0.22), c.zMur + 0.17);
      grp.add(p);
    });
  };
  decor.ecriture = async (grp, s, c) => {
    const b = s.blocs.find(x => x.type === 'tableau');
    if (b) grp.add(surMur(panneauTexte(b.titre, b.lignes, JAUNE, 7.4), c));
    const table = maille(new RoundedBoxGeometry(5.2, 0.16, 1.3, 2, 0.05), toon('#2e2a3d')); table.position.set(0, c.HAUT + 0.85, -1.3); grp.add(table);
    for (const x of [-2.3, 2.3]) { const pied = maille(new THREE.BoxGeometry(0.14, 0.85, 1.0), toon(MARINE), 2); pied.position.set(x, c.HAUT + 0.42, -1.3); grp.add(pied); }
    const feuille = toon('#bfe6ff', { em: '#2fa8ff', ei: 0.6 });   // des tablettes allumées
    for (let k = 0; k < 7; k++) { const f = new THREE.Mesh(geoFeuille, feuille); f.position.set(-2 + k * 0.65, c.HAUT + 0.94 + (k % 2) * 0.01, -1.3 + (k % 3 - 1) * 0.12); f.rotation.y = (k % 3 - 1) * 0.25; grp.add(f); }
  };
  decor.rushes = async (grp, s, c) => {
    const anneau = maille(new THREE.TorusGeometry(1.05, 0.13, 12, 48), toon(CYAN, { em: CYAN, ei: 0.7 }), 2.2); anneau.position.set(-3.1, c.HAUT + 3.25, -1.6); grp.add(anneau);
    const pied = maille(new THREE.CylinderGeometry(0.05, 0.06, 2.2, 8), toon(MARINE), 1.8); pied.position.set(-3.1, c.HAUT + 1.1, -1.6); grp.add(pied);
    const cam = new THREE.Group(); cam.position.set(3.1, c.HAUT, -1.4); grp.add(cam);
    const boitier = maille(new RoundedBoxGeometry(0.95, 0.58, 0.5, 3, 0.08), toon('#2a2f45')); boitier.position.y = 2.05; cam.add(boitier);
    const obj = maille(new THREE.CylinderGeometry(0.2, 0.25, 0.5, 16), toon('#2a2f45')); obj.rotation.x = Math.PI / 2; obj.position.set(0, 2.05, 0.48); cam.add(obj);
    const voyant = new THREE.Mesh(new THREE.SphereGeometry(0.06, 10, 8), plat(ROUGE)); voyant.position.set(0.34, 2.25, 0.26); cam.add(voyant);
    const haut = new THREE.Vector3(0, 1.8, 0), axe = new THREE.Vector3(0, 1, 0);
    for (let k = 0; k < 3; k++) {
      const ang = k * 2.094 + 0.5, pied3 = new THREE.Vector3(Math.cos(ang) * 0.6, 0, Math.sin(ang) * 0.6);
      const dir = haut.clone().sub(pied3), L = dir.length();
      const j = maille(new THREE.CylinderGeometry(0.035, 0.035, L, 6), toon(MARINE), 1.6);
      j.position.copy(pied3).addScaledVector(dir, 0.5); j.quaternion.setFromUnitVectors(axe, dir.normalize()); cam.add(j);
    }
    const b = s.blocs.find(x => x.type === 'tableau');
    if (b) grp.add(surMur(panneauTexte(b.titre, b.lignes, CYAN, 4.6), c));
    const geoBoite = new RoundedBoxGeometry(0.62, 0.62, 0.62, 2, 0.06);
    ['#ffc04d', '#b98cff', '#47d1c1', '#b98cff', '#ffc04d', '#47d1c1'].forEach((h, k) => { const bt = maille(geoBoite, toon(h), 2); bt.position.set(-1.7 + (k % 3) * 0.75, c.HAUT + 0.31 + Math.floor(k / 3) * 0.64, -3.0); grp.add(bt); });
  };
  decor.montage = async (grp, s, c) => {
    const b = s.blocs.find(x => x.type === 'prets');
    if (!b) return;
    const ps = await Promise.all(b.videos.map(id => affiche(id, { larg: 1.75, teinte: couleur(D.videos[id]?.compte), legende: 'PRÊT', sous: D.videos[id]?.etat || '' })));
    const pas = Math.min(2.85, (c.LARG - 1.3 - 1.75) / Math.max(1, ps.length - 1));
    ps.forEach((p, k) => { p.position.set((k - (ps.length - 1) / 2) * pas, c.HAUT + c.MURH - 0.32 - p.userData.haut / 2, c.zMur + 0.17); grp.add(p); });
  };
  decor.expedition = async (grp, s, c) => {
    const b = s.blocs.find(x => x.type === 'videos');
    if (!b) return;
    const lw = 1.1, parRang = 7;
    const ps = await Promise.all(b.videos.map(id => affiche(id, { larg: lw, teinte: couleur(D.videos[id]?.compte), legende: D.videos[id]?.etat || '' })));
    ps.forEach((p, k) => {
      const row = Math.floor(k / parRang), col = k % parRang;
      const n = row === 0 ? Math.min(parRang, ps.length) : ps.length - parRang;
      p.position.set((col - (n - 1) / 2) * (lw + 0.2), c.HAUT + c.MURH - 0.28 - p.userData.haut / 2 - row * (p.userData.haut + 0.16), c.zMur + 0.17);
      grp.add(p);
    });
  };
  decor.courrier = async (grp, s, c) => {
    const cols = 7, rows = 4, cw = 1.2, ch = 0.82;
    const y0 = c.HAUT + c.MURH - 0.4 - (rows * ch) / 2;
    const fond = maille(new THREE.BoxGeometry(cols * cw + 0.24, rows * ch + 0.24, 0.5), toon(MARINE)); fond.position.set(0, y0, c.zMur + 0.4); grp.add(fond);
    const barres = [];
    for (let i = 0; i <= cols; i++) barres.push(new THREE.BoxGeometry(0.07, rows * ch, 0.07).translate(-cols * cw / 2 + i * cw, 0, 0));
    for (let j = 0; j <= rows; j++) barres.push(new THREE.BoxGeometry(cols * cw, 0.07, 0.07).translate(0, -rows * ch / 2 + j * ch, 0));
    const grille = new THREE.Mesh(mergeGeometries(barres), plat(MAGENTA)); grille.position.set(0, y0, c.zMur + 0.67); grp.add(grille);
    const env = new THREE.InstancedMesh(new THREE.BoxGeometry(0.74, 0.46, 0.04), toon('#ffffff'), cols * rows);
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), eu = new THREE.Euler(), v = new THREE.Vector3(), un = new THREE.Vector3(1, 1, 1), col = new THREE.Color();
    let k = 0, n = 0;
    for (let i = 0; i < cols; i++) for (let j = 0; j < rows; j++) {
      k++;
      if ((i * 7 + j * 3) % 5 === 0) continue;
      eu.set(0, 0, ((k * 37) % 11 - 5) * 0.02); q.setFromEuler(eu);
      v.set(-cols * cw / 2 + (i + 0.5) * cw, y0 - rows * ch / 2 + (j + 0.5) * ch - 0.05, c.zMur + 0.7);
      env.setMatrixAt(n, m4.compose(v, q, un));
      env.setColorAt(n, col.set((i + j * 2) % 9 === 0 ? CYAN : '#e8e3ff'));
      n++;
    }
    env.count = n; grp.add(env);
  };

  for (const [i, s] of D.salles.entries()) {
    const [deg, ray, niv, rot] = PLACES[i % PLACES.length];
    const grp = new THREE.Group();
    grp.position.copy(surArene(deg, ray, NIV[niv])); grp.rotation.y = rot;
    scene.add(grp);
    grp.updateMatrixWorld();
    const enMonde = g => g.applyMatrix4(grp.matrixWorld);
    const zMur = -PROF / 2 + 0.3;
    // l'écran de l'équipe, tendu entre deux antennes sous une barre de néon ; devant, l'estrade ovale où elle travaille
    const mur = maille(new THREE.BoxGeometry(LARG - 0.8, MURH, 0.3), toon('#100c1c')); mur.position.set(0, HAUT + MURH / 2, zMur); grp.add(mur);
    for (const x of [-(LARG - 0.8) / 2 - 0.32, (LARG - 0.8) / 2 + 0.32]) pilier(MURH + 1.1, 0.3, g => enMonde(g.translate(x, HAUT, zMur)), i);
    neon.push(enMonde(bloc(LARG - 0.3, 0.12, 0.2, NEONS[i % 3], 0, HAUT + MURH + 0.18, zMur, 0.04)),
      enMonde(teinte(new THREE.RingGeometry(0.955, 0.985, 64).rotateX(-Math.PI / 2).scale(5.1, 1, 2.0).translate(0, YA + 0.012, ZA), CYAN)));
    deco.push(enMonde(deux(new THREE.CylinderGeometry(1, 1.03, YA, 48).scale(5.1, 1, 2.0).translate(0, YA / 2, ZA), BETON, FLANC)));
    const ens = bandeau(s.nom, `Étape ${s.etape}`, 6.6);
    const yEns = HAUT + MURH + 1.35;
    ens.position.set(0, yEns, zMur + 0.1); grp.add(ens);
    // les agents en arc de cercle, les bouts un peu en retrait et tournés vers l'extérieur
    const n = s.agents.length, ecart = Math.min(2.3, (LARG - 0.9) / n), serre = ecart < 2.1;
    s.agents.forEach((a, j) => {
      const u = (j - (n - 1) / 2) * ecart, z = ZA + 0.25 - 0.045 * u * u;
      const r = robot(a, s.id, persoSuivant());
      r.position.set(u, YA, z); r.rotation.y = -u * 0.05; r.userData.y0 = YA; r.userData.x0 = u; grp.add(r);
      // trop d'agents pour une seule rangée d'étiquettes : une sur deux monte d'un cran
      const e = etiquette(a, s.id); e.position.set(u, YA + 3.75 + (serre && j % 2 ? 1.05 : 0), z); grp.add(e);
    });
    const hit = new THREE.Mesh(new THREE.BoxGeometry(LARG, 9.5, PROF + 2), new THREE.MeshBasicMaterial({ visible: false }));
    hit.position.set(0, 4.75, 0.6); hit.userData.id = s.id; grp.add(hit); cibles.push(hit);
    salles3d[s.id] = { centre: grp.position.clone(), rot, ancre: new THREE.Vector3(0, yEns + 1.0, zMur + 0.1).applyMatrix4(grp.matrixWorld) };
    if (decor[s.id]) await decor[s.id](grp, s, { zMur, HAUT, MURH, LARG });
  }
  arene.add(maille(mergeGeometries(deco), matRoche, 2.6, 0.12));
  arene.add(new THREE.Mesh(mergeGeometries(neon), matNeon));

  /* Night City : des centaines de tours autour du toit, de la rue (250 m plus bas) jusqu'à l'horizon ; fenêtres, bandeaux
     de néon et arêtes lumineuses sont calculés dans le shader, en coordonnées du monde (une seule maille instanciée).
     Devant, côté caméra, les tours restent sous le niveau du toit : on plonge sur la ville sans qu'elle cache le QG. */
  const RUE = -250;
  // la Lune, et la trouée qu'on lui laisse dans la ligne des tours (vue depuis le cerveau)
  const POS_LUNE = new THREE.Vector3(195, 100, -860), DIR_LUNE = new THREE.Vector2(POS_LUNE.x, POS_LUNE.z).normalize();
  const matVille = new THREE.ShaderMaterial({
    fog: true,
    uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.fog, {
      uChaud: { value: new THREE.Color('#ffc46b') }, uFroid: { value: new THREE.Color(CYAN) }, uRose: { value: new THREE.Color(MAGENTA) }, uJaune: { value: new THREE.Color(JAUNE) }
    }]),
    vertexShader: `varying vec3 vMonde;
varying vec3 vN;
varying vec2 vUv;
varying vec3 vGraine;
varying float vHaut;
#include <fog_pars_vertex>
void main() {
  vec4 wp = modelMatrix * instanceMatrix * vec4(position, 1.0);
  vMonde = wp.xyz;
  vN = normalize(mat3(instanceMatrix) * normal);
  vUv = uv;
  vGraine = instanceColor;
  vHaut = instanceMatrix[3][1] + instanceMatrix[1][1];
  vec4 mvPosition = viewMatrix * wp;
  gl_Position = projectionMatrix * mvPosition;
  #include <fog_vertex>
}`,
    fragmentShader: `uniform vec3 uChaud, uFroid, uRose, uJaune;
varying vec3 vMonde;
varying vec3 vN;
varying vec2 vUv;
varying vec3 vGraine;
varying float vHaut;
#include <fog_pars_fragment>
float h12(vec2 p) { vec3 p3 = fract(vec3(p.xyx) * 0.1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
void main() {
  vec3 n = normalize(vN);
  vec3 c = vec3(0.04, 0.032, 0.07);
  if (abs(n.y) < 0.5) {
    float u = abs(n.x) > 0.5 ? vMonde.z : vMonde.x;
    vec2 g = vec2(u / 0.95, vMonde.y / 1.35), id = floor(g), f = fract(g);
    float fen = step(0.16, f.x) * step(f.x, 0.84) * step(0.28, f.y) * step(f.y, 0.78);
    float r = h12(id + vGraine.xy * 91.0);
    float allume = step(r, mix(0.1, 0.5, vGraine.z));
    float r2 = h12(id * 1.7 + vGraine.yx * 13.0);
    vec3 w = r2 < 0.68 ? uChaud : (r2 < 0.9 ? uFroid : uRose);
    c += w * fen * allume * (0.4 + 0.6 * r2);
    vec3 ne = vGraine.y < 0.33 ? uRose : (vGraine.y < 0.66 ? uFroid : uJaune);
    float couronne = step(0.72, vGraine.x) * smoothstep(vHaut - 3.0, vHaut - 2.6, vMonde.y) * (1.0 - smoothstep(vHaut - 1.6, vHaut - 1.2, vMonde.y));
    c += ne * couronne * 1.3;
    float arete = step(0.9, vGraine.x) * (1.0 - smoothstep(0.0, 0.015, min(vUv.x, 1.0 - vUv.x)));
    c += ne * arete;
  } else if (n.y > 0.5) {
    c = vec3(0.05, 0.04, 0.08);
  }
  gl_FragColor = vec4(c, 1.0);
  #include <colorspace_fragment>
  #include <fog_fragment>
}`
  });
  {
    const tours = [];
    // la mégatour qui porte le toit : un carré inscrit sous le disque, jusqu'à la rue
    tours.push({ x: 0, z: 0, w: 42, d: 42, y: RUE, h: -2.6 - RUE, g: [0.5, 0.5, 0.35] });
    const nb = telephone() ? 380 : 720;
    for (let k = 0; k < nb; k++) {
      const a = hasard3(k, 1, 2, 5) * Math.PI * 2, R = 58 + Math.pow(hasard3(k, 3, 4, 5), 0.8) * 420;
      const x = Math.cos(a) * R, z = Math.sin(a) * R;
      const w = 10 + hasard3(k, 5, 6, 5) * 22, d = 10 + hasard3(k, 7, 8, 5) * 22;
      // côté caméra (z > 0), les toits restent bien plus bas que le QG ; au fond, la ligne des tours monte au-dessus
      const devantCam = Math.max(0, z / R);
      const sommetMax = 95 - 175 * Math.min(1, devantCam * 1.6) - (R < 110 ? 40 * devantCam : 0);
      const sommet = Math.min(sommetMax, -70 + hasard3(k, 9, 10, 5) * 190 + (R > 240 ? 30 : 0));
      const versLune = (x * DIR_LUNE.x + z * DIR_LUNE.y) / R;
      const sommetFinal = versLune > 0.96 ? Math.min(sommet, 12) : sommet;
      if (sommetFinal - RUE < 30) continue;
      tours.push({ x, z, w, d, y: RUE, h: sommetFinal - RUE, g: [hasard3(k, 11, 12, 5), hasard3(k, 13, 14, 5), hasard3(k, 15, 16, 5)] });
    }
    const geoTour = new THREE.BoxGeometry(1, 1, 1).translate(0, 0.5, 0);
    const ville = new THREE.InstancedMesh(geoTour, matVille, tours.length);
    const m4 = new THREE.Matrix4(), col = new THREE.Color();
    tours.forEach((t, i) => { m4.makeScale(t.w, t.h, t.d); m4.setPosition(t.x, t.y, t.z); ville.setMatrixAt(i, m4); ville.setColorAt(i, col.setRGB(...t.g)); });
    ville.instanceMatrix.needsUpdate = true;
    ville.instanceColor.needsUpdate = true;
    ville.frustumCulled = false;
    scene.add(ville);
  }

  /* la pluie : des traits qui tombent autour de la caméra, animés sur la carte graphique */
  const pluie = (() => {
    const N = telephone() ? 1600 : 4200, pos = new Float32Array(N * 6), bout = new Float32Array(N * 2);
    for (let i = 0; i < N; i++) { const x = Math.random() * 120, y = Math.random() * 90, z = Math.random() * 120; pos.set([x, y, z, x, y, z], i * 6); bout[i * 2 + 1] = 1; }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('aBout', new THREE.BufferAttribute(bout, 1));
    const m = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      uniforms: { uT: { value: 0 }, uCam: { value: new THREE.Vector3() } },
      vertexShader: `attribute float aBout;
uniform float uT;
uniform vec3 uCam;
varying float vA;
void main() {
  vec3 b = vec3(120.0, 90.0, 120.0), p = position;
  p.y = mod(p.y - uT * 70.0, b.y);
  p.xz = mod(p.xz - uCam.xz, b.xz);
  vec3 w = p + uCam - b * 0.5 + vec3(0.25, -1.3, 0.0) * aBout;
  vec4 mv = viewMatrix * vec4(w, 1.0);
  vA = (1.0 - aBout * 0.8) * (1.0 - smoothstep(10.0, 60.0, length(mv.xyz)));
  gl_Position = projectionMatrix * mv;
}`,
      fragmentShader: 'varying float vA;\nvoid main() { gl_FragColor = vec4(vec3(0.62, 0.8, 1.0) * vA * 0.5, 1.0); }'
    });
    const l = new THREE.LineSegments(geo, m);
    l.frustumCulled = false; l.renderOrder = 6;
    scene.add(l);
    return m.uniforms;
  })();

  /* la Lune, très loin derrière le cerveau : le rêve de Lucy */
  {
    const texLune = texCanvas(512, 256, (g, w, h) => {
      g.fillStyle = '#cdd3df'; g.fillRect(0, 0, w, h);
      for (let i = 0; i < 9; i++) { const x = hasard3(i, 1, 1, 9) * w, y = h * (0.2 + hasard3(i, 2, 1, 9) * 0.6), r = 20 + hasard3(i, 3, 1, 9) * 60, gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, 'rgba(78,86,108,0.55)'); gr.addColorStop(1, 'rgba(78,86,108,0)'); g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2); }
      for (let i = 0; i < 160; i++) { const x = hasard3(i, 4, 2, 9) * w, y = hasard3(i, 5, 2, 9) * h, r = Math.pow(hasard3(i, 6, 2, 9), 3) * 14 + 1.2; g.fillStyle = 'rgba(70,76,96,0.45)'; g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill(); g.strokeStyle = 'rgba(240,244,252,0.45)'; g.lineWidth = Math.max(1, r * 0.2); g.beginPath(); g.arc(x - r * 0.15, y - r * 0.15, r, Math.PI * 0.9, Math.PI * 1.9); g.stroke(); }
    });
    const lune3d = new THREE.Mesh(new THREE.SphereGeometry(70, 48, 24), new THREE.MeshBasicMaterial({ map: texLune, fog: false }));
    lune3d.position.copy(POS_LUNE); lune3d.rotation.y = -1.2; lune3d.renderOrder = -8;
    scene.add(lune3d);
    const texHaloLune = texCanvas(256, 256, (g, w) => { const gr = g.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2); gr.addColorStop(0, 'rgba(255,255,255,0)'); gr.addColorStop(0.5, 'rgba(255,255,255,0)'); gr.addColorStop(0.56, 'rgba(220,235,255,0.55)'); gr.addColorStop(0.7, 'rgba(255,90,170,0.18)'); gr.addColorStop(1, 'rgba(255,42,109,0)'); g.fillStyle = gr; g.fillRect(0, 0, w, w); });
    const haloLune = new THREE.Sprite(new THREE.SpriteMaterial({ map: texHaloLune, transparent: true, opacity: 0.85, depthWrite: false, fog: false }));
    haloLune.position.copy(lune3d.position); haloLune.scale.setScalar(70 * 3.6); haloLune.renderOrder = -7;
    scene.add(haloLune);
  }

  // des drones de surveillance qui tournent autour de la tour, sous le niveau du toit
  const geoDrone = fusion([bloc(1.1, 0.24, 1.1, '#2a2637', 0, 0, 0, 0.08), ...[-1, 1].flatMap(sx => [-1, 1].map(sz => fut(0.32, 0.32, 0.05, '#14121b', sx * 0.62, 0.1, sz * 0.62, 14)))]);
  const debris = Array.from({ length: 14 }, (_, k) => {
    const a = (k / 14) * Math.PI * 2 + 0.3 * Math.sin(k * 2.1), R = 34 + (k % 3) * 2.5, y = -9 + (k % 4) * 2.6;
    const c = maille(geoDrone, matRoche, 2.2, 0.1);
    const feu = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 6), plat(k % 2 ? ROUGE : CYAN)); feu.position.y = -0.18; c.add(feu);
    c.position.set(Math.cos(a) * R, y, Math.sin(a) * R); c.scale.setScalar(1 + (k % 3) * 0.3);
    c.userData = { y0: y, ph: k * 1.37, a, R };
    arene.add(c);
    return c;
  });

  /* des voitures volantes (AV) en vol stationnaire autour du toit, phares, feux et réacteurs allumés */
  const geoAV = fusion([
    bloc(4.6, 0.9, 2.0, '#2d2a3a', 0, 0, 0, 0.3),
    bloc(2.3, 0.75, 1.65, '#1b1826', -0.3, 0.72, 0, 0.25),
    bloc(1.6, 0.5, 1.7, '#3c6f9e', 0.35, 0.74, 0, 0.18),
    ...[-1, 1].flatMap(sx => [-1, 1].map(sz => fut(0.42, 0.42, 0.22, '#16141e', sx * 1.7, -0.5, sz * 1.05, 16)))
  ]);
  const geoAVNeon = fusion([
    ...[-1, 1].flatMap(sx => [-1, 1].map(sz => teinte(new THREE.CircleGeometry(0.34, 16).rotateX(Math.PI / 2).translate(sx * 1.7, -0.62, sz * 1.05), CYAN))),
    teinte(new THREE.BoxGeometry(0.1, 0.18, 1.6).translate(2.32, 0.05, 0), '#fff4d6'),
    teinte(new THREE.BoxGeometry(0.1, 0.16, 1.6).translate(-2.32, 0.05, 0), ROUGE),
    teinte(new THREE.BoxGeometry(3.6, 0.05, 0.05).translate(0, -0.2, 1.02), MAGENTA), teinte(new THREE.BoxGeometry(3.6, 0.05, 0.05).translate(0, -0.2, -1.02), MAGENTA)
  ]);
  const tribunes = [160, 186, 212, 238, 302, 328, 354, 20].map((deg, k) => {
    const v = surArene(deg, 40, k % 2 ? 16.5 : 12.5), c = maille(geoAV, matRoche, 2.4, 0.12);
    c.add(new THREE.Mesh(geoAVNeon, matNeon));
    c.position.copy(v); c.rotation.y = -deg * D2R - Math.PI / 2;   // le nez dans le sens du tour
    c.userData = { y0: v.y, ph: k * 0.9, ry: c.rotation.y };
    scene.add(c);
    return c;
  });

  /* la chaîne : une piste en anneau autour de l'estrade, les colis aux couleurs des comptes */
  const RT = 10.2, NC = 26;
  scene.add(maille(new THREE.TorusGeometry(RT, 0.85, 8, 128).rotateX(Math.PI / 2).scale(1, 0.34, 1).translate(0, 0.1, 0), toon('#241f33'), 2.6, 0.12));
  scene.add(new THREE.Mesh(mergeGeometries(Array.from({ length: 48 }, (_, k) => new THREE.BoxGeometry(1.5, 0.02, 0.06).translate(RT, 0.395, 0).rotateY(k * Math.PI / 24))), plat(JAUNE)));
  const colis = new THREE.InstancedMesh(new RoundedBoxGeometry(0.62, 0.42, 0.62, 2, 0.08), toon('#ffffff'), NC);
  colis.frustumCulled = false;
  ['#ffc04d', '#b98cff', '#47d1c1'].map(h => new THREE.Color(h)).forEach((c, k, l) => { for (let j = k; j < NC; j += l.length) colis.setColorAt(j, c); });
  trait(colis, 2, 0.06);
  scene.add(colis);
  const mColis = new THREE.Matrix4();

  /* le cerveau : un Sandevistan géant sur une plateforme volante, au-dessus du fond du toit (le shader d'orbe sert au
     fragment de données du prochain départ) */
  const VS_ORBE = `varying vec3 vN; varying vec3 vV; varying vec3 vP;
void main() { vec4 mv = modelViewMatrix * vec4(position, 1.0); vN = normalize(normalMatrix * normal); vV = normalize(-mv.xyz); vP = position; gl_Position = projectionMatrix * mv; }`;
  const FS_ORBE = `uniform float uT; varying vec3 vN; varying vec3 vV; varying vec3 vP;
void main() {
  float f = 1.0 - max(dot(normalize(vN), normalize(vV)), 0.0);
  f += 0.08 * sin(uT * 2.6 + vP.y * 5.0 + vP.x * 3.0);
  vec3 c = f < 0.38 ? vec3(0.9, 1.0, 1.0) : f < 0.66 ? vec3(0.0, 0.94, 1.0) : vec3(1.0, 0.16, 0.43);
  gl_FragColor = vec4(c, 1.0);
  #include <colorspace_fragment>
}`;
  const matOrbe = new THREE.ShaderMaterial({ uniforms: { uT: tAura }, vertexShader: VS_ORBE, fragmentShader: FS_ORBE });
  const CERVEAU = new THREE.Vector3(0, 21.5, -31);
  const cerveau = new THREE.Group(); cerveau.position.copy(CERVEAU); scene.add(cerveau);
  const texHalo = texCanvas(256, 256, (g, w) => { const gr = g.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.25, 'rgba(255,255,255,0.4)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, w, w); });
  const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: texHalo, color: MAGENTA, transparent: true, opacity: 0.5, depthWrite: false }));
  halo.position.set(0, 0.8, -2.4); halo.scale.set(11, 11, 1); cerveau.add(halo);
  // la plateforme : un hexagone d'acier sur quatre réacteurs, bordé de néon
  cerveau.add(maille(fusion([
    teinte(new THREE.CylinderGeometry(3.6, 3.2, 0.6, 6).translate(0, -2.3, 0), '#2a2537'),
    teinte(new THREE.CylinderGeometry(2.4, 1.1, 1.5, 6).translate(0, -3.35, 0), '#1c1828'),
    ...[0, 1, 2, 3].map(k => fut(0.45, 0.6, 0.6, '#16141e', Math.cos(k * Math.PI / 2 + 0.78) * 2.3, -2.9, Math.sin(k * Math.PI / 2 + 0.78) * 2.3, 14))
  ]), matPerso, 3, 0.1));
  cerveau.add(new THREE.Mesh(fusion([
    cercle(3.45, 0.08, MAGENTA, -2.0, 48),
    ...[0, 1, 2, 3].map(k => teinte(new THREE.CircleGeometry(0.42, 16).rotateX(Math.PI / 2).translate(Math.cos(k * Math.PI / 2 + 0.78) * 2.3, -3.22, Math.sin(k * Math.PI / 2 + 0.78) * 2.3), CYAN))
  ]), matNeon));
  // le Sandevistan : vingt plaques d'acier écartées autour d'un cœur rose, deux anneaux de néon, une bande de texte qui tourne
  const coeur = new THREE.Group(); coeur.position.set(0, 1.5, -0.6); cerveau.add(coeur);
  const plaques = new THREE.Group(); coeur.add(plaques);
  {
    const ico = new THREE.IcosahedronGeometry(2.0, 0), p = ico.getAttribute('position'), geos = [];
    for (let f = 0; f < p.count; f += 3) {
      const tri = [0, 1, 2].map(j => new THREE.Vector3().fromBufferAttribute(p, f + j));
      const m = tri[0].clone().add(tri[1]).add(tri[2]).divideScalar(3), n = m.clone().normalize();
      const g = new THREE.BufferGeometry().setFromPoints(tri.map(v => v.sub(m).multiplyScalar(0.66).add(m).addScaledVector(n, 0.55)));
      g.computeVertexNormals();
      geos.push(teinte(g, (f / 3) % 2 ? '#c9cfdc' : '#9aa2b6'));
    }
    plaques.add(new THREE.Mesh(fusion(geos), toon('#ffffff', { vc: true })));
  }
  const noyau = new THREE.Mesh(new THREE.IcosahedronGeometry(1.35, 2), plat(MAGENTA)); coeur.add(noyau);
  const noyau2 = new THREE.Mesh(new THREE.IcosahedronGeometry(0.75, 2), plat('#ffe0ef')); coeur.add(noyau2);
  const anneauA = new THREE.Mesh(new THREE.TorusGeometry(3.0, 0.07, 6, 120), plat(JAUNE)); anneauA.rotation.x = Math.PI / 2.4; coeur.add(anneauA);
  const anneauB = new THREE.Mesh(new THREE.TorusGeometry(3.6, 0.045, 6, 140), plat(CYAN)); anneauB.rotation.set(Math.PI / 3, 0.4, 0); coeur.add(anneauB);
  const texBande = texCanvas(2048, 64, (g, w, h) => {
    const txt = 'SANDEVISTAN // 時間減速 // MÉMOIRE ET SKILLS // サンデヴィスタン // ';
    g.font = '34px "IBM Plex Mono", "DotGothic16", monospace'; g.textBaseline = 'middle'; g.fillStyle = CYAN;
    const pas = g.measureText(txt).width;
    for (let x = 0; x < w; x += pas) g.fillText(txt, x, h / 2);
  });
  texBande.wrapS = THREE.RepeatWrapping; texBande.repeat.set(2, 1);
  const bande = new THREE.Mesh(new THREE.CylinderGeometry(4.3, 4.3, 0.55, 96, 1, true), new THREE.MeshBasicMaterial({ map: texBande, transparent: true, side: THREE.DoubleSide, depthWrite: false }));
  bande.rotation.x = 0.16; coeur.add(bande);
  const NP = 380, posP = new Float32Array(NP * 3);
  for (let k = 0; k < NP; k++) { const v = new THREE.Vector3().randomDirection().multiplyScalar(2.6 + Math.random() * 2.8); posP.set([v.x, v.y, v.z], k * 3); }
  const poussiere = new THREE.Points(new THREE.BufferGeometry().setAttribute('position', new THREE.BufferAttribute(posP, 3)), new THREE.PointsMaterial({ color: '#8ff8ff', size: 0.09, transparent: true, opacity: 0.85, depthWrite: false }));
  coeur.add(poussiere);
  const ensC = bandeau('Cerveau', 'Mémoire et skills', 4.6); ensC.position.set(-6.8, CERVEAU.y + 0.8, CERVEAU.z + 0.4); scene.add(ensC);
  const hitC = new THREE.Mesh(new THREE.SphereGeometry(5, 16, 12), new THREE.MeshBasicMaterial({ visible: false })); hitC.position.copy(CERVEAU); hitC.userData.id = 'cerveau'; scene.add(hitC); cibles.push(hitC);

  /* le chef de cabinet : Maine, le chef de l'équipe, debout sur sa petite plateforme volante à côté du Sandevistan */
  const CHEF = new THREE.Vector3(10.5, 18.2, -28.5);
  const chef = new THREE.Group(); chef.position.copy(CHEF); chef.rotation.y = -0.3; scene.add(chef);
  chef.add(maille(fusion([
    teinte(new THREE.CylinderGeometry(2.6, 2.3, 0.45, 6), '#2a2537'),
    teinte(new THREE.CylinderGeometry(1.6, 0.8, 1.1, 6).translate(0, -0.78, 0), '#1c1828')
  ]), matPerso, 2.8, 0.1));
  chef.add(new THREE.Mesh(fusion([cercle(2.5, 0.07, MAGENTA, 0.23, 48), teinte(new THREE.CircleGeometry(0.7, 20).rotateX(Math.PI / 2).translate(0, -1.34, 0), CYAN)]), matNeon));
  const enPoste = D.chef.etat === 'actif';
  if (enPoste) {
    const r = robot({ nom: D.chef.nom, compte: 'TOUS', etat: (D.chef.signale || []).length ? 'attention' : 'ok' }, 'chef', 'maine');
    r.position.set(0, 0.23, 0.2); r.userData.y0 = 0.23; chef.add(r);
  }
  const holo = panneauVert(enPoste ? 'En poste' : 'Poste à créer', ['Chef de cabinet', enPoste ? (D.chef.horaire || 'Relit les passes, te fait un point') : 'Relit les passes, te fait un point'], 3.4);
  holo.position.set(0, enPoste ? 4.3 : 2.2, 0.6); chef.add(holo);
  const ensChef = bandeau('Chef de cabinet', 'Supervision', 5.2); ensChef.position.set(0, 6.4, 0.2); chef.add(ensChef);
  const hitChef = new THREE.Mesh(new THREE.BoxGeometry(7, 9, 7), new THREE.MeshBasicMaterial({ visible: false })); hitChef.position.set(0, 3, 0); hitChef.userData.id = 'chef'; chef.add(hitChef); cibles.push(hitChef);

  /* câbles de données : du dessous de la plateforme du Sandevistan vers chaque équipe et vers Maine */
  const liens = [];
  const ancres = [...Object.values(salles3d).map(s => s.ancre), CHEF.clone().add(new THREE.Vector3(0, 7.5, 0))];
  const tubes = [];
  const geoImp = new THREE.SphereGeometry(0.14, 12, 8), matImp = plat('#ffffff');
  const SOURCE = CERVEAU.clone().add(new THREE.Vector3(0, -4.1, 0));
  ancres.forEach((b, k) => {
    const a = SOURCE.clone(), mid = a.clone().lerp(b, 0.5); mid.y += 3.2;
    const courbe = new THREE.QuadraticBezierCurve3(a, mid, b);
    tubes.push(new THREE.TubeGeometry(courbe, 48, 0.04, 6, false));
    const imp = new THREE.Mesh(geoImp, matImp); scene.add(imp);
    liens.push({ courbe, imp, d: k / ancres.length });
  });
  scene.add(new THREE.Mesh(mergeGeometries(tubes), new THREE.MeshBasicMaterial({ color: CYAN, transparent: true, opacity: 0.5, depthWrite: false })));

  /* ---------- les départs du jour en faisceaux de données ---------- */
  function texCri(mot, teinte) {
    return texCanvas(512, 200, g => {
      g.translate(256, 104); g.rotate(-0.04);
      g.textAlign = 'center'; g.textBaseline = 'middle';
      police(g, mot, 430, 132, BANG);
      g.fillStyle = '#000000'; g.fillText(mot, 5, 7);
      g.fillStyle = MAGENTA; g.fillText(mot, 6, 2);
      g.fillStyle = CYAN; g.fillText(mot, -6, -2);
      g.fillStyle = teinte; g.fillText(mot, 0, 0);
      g.globalCompositeOperation = 'destination-out';   // les tranches du glitch
      for (let i = 0; i < 4; i++) g.fillRect(-256, -52 + i * 31, 512, 3);
      g.globalCompositeOperation = 'source-over';
    });
  }
  const texParti = texCri('PARTI !', JAUNE), texBloque = texCri('BLOQUÉ !', '#ff3b5c');
  const texEclat = texCanvas(256, 256, (g, w) => {   // l'impact : des hexagones de néon qui éclatent
    const c = w / 2;
    g.translate(c, c);
    const hexa = r => { g.beginPath(); for (let i = 0; i < 6; i++) { const a = i * Math.PI / 3 + Math.PI / 6; g.lineTo(Math.cos(a) * r, Math.sin(a) * r); } g.closePath(); };
    g.lineWidth = 10; g.strokeStyle = CYAN; hexa(100); g.stroke();
    g.lineWidth = 6; g.strokeStyle = JAUNE; hexa(70); g.stroke();
    g.fillStyle = '#ffffff'; hexa(30); g.fill();
    g.strokeStyle = MAGENTA; g.lineWidth = 4;
    for (let i = 0; i < 12; i++) { const a = i * Math.PI / 6; g.beginPath(); g.moveTo(Math.cos(a) * 108, Math.sin(a) * 108); g.lineTo(Math.cos(a) * 124, Math.sin(a) * 124); g.stroke(); }
  });
  const texOnde = texCanvas(256, 256, (g, w) => {
    const c = w / 2;
    g.lineWidth = 12; g.strokeStyle = '#ffffff'; g.beginPath(); g.arc(c, c, 104, 0, Math.PI * 2); g.stroke();
    g.lineWidth = 4; g.strokeStyle = CYAN; g.beginPath(); g.arc(c, c, 116, 0, Math.PI * 2); g.stroke();
  });
  const transp = (hex, op) => new THREE.MeshBasicMaterial({ color: hex, transparent: true, opacity: op, depthWrite: false });
  const MAT_OR = [transp(CYAN, 0.45), plat('#7df9ff'), plat('#ffffff')];
  const MAT_ROUGE = [transp('#b3122c', 0.55), plat('#ff2d4a'), plat('#ffd6dc')];
  const geoTete = new THREE.SphereGeometry(0.42, 16, 12);
  const NT = 56, RS = 8;

  // Un départ revient à l'agent qui le fait : son nom dans le texte du départ (même compte), sinon l'expédition du compte.
  const robotsSalles = ROB.filter(x => x.salle !== 'chef');
  const motCle = nom => { const m = sansAccents(nom).match(/[a-z]{4,}/); return m ? m[0].replace(/s$/, '') : null; };
  const mots = s => (sansAccents(s).match(/[a-z]+/g) || []).map(w => w.replace(/s$/, ''));
  function robotDuDepart(d) {
    const q = mots(d.quoi);
    const parNom = robotsSalles.filter(x => (x.a.compte === d.compte || x.a.compte === 'TOUS') && q.includes(motCle(x.a.nom)))
      .sort((x, y) => (y.a.compte === d.compte) - (x.a.compte === d.compte) || (y.a.type === 'quotidienne') - (x.a.type === 'quotidienne'));
    return parNom[0]
      || robotsSalles.find(x => x.salle === 'expedition' && x.a.compte === d.compte && x.a.type === 'quotidienne')
      || robotsSalles.find(x => x.a.compte === d.compte && x.a.type === 'quotidienne')
      || robotsSalles.find(x => x.a.compte === d.compte) || null;
  }
  // Un départ « bloqué » : son agent est bloqué, et sa passe bloquée tombe à l'heure de ce départ.
  const estBloque = (a, t) => a.etat === 'bloque' && !!a.passe_iso && Math.abs(Date.parse(a.passe_iso) - t) <= 90 * 60000;
  const vus = new Set(), file = [], rayons = [], eclats = [], cris = [];
  let partis = [], prochain = null, tirPrec = -10, rejeuK = 0;
  function suivreDeparts(init) {
    const l = departs().filter(x => !x.jour), now = maintenant();
    partis = [];
    for (const x of l) {
      const rob = x.passe ? robotDuDepart(x.d) : null;
      if (!rob) continue;
      const it = { d: x.d, t: x.t, rob, bloque: estBloque(rob.a, x.t) };
      partis.push(it);
      const k = `${x.d.heure}|${x.d.quoi}`;
      if (!vus.has(k)) { vus.add(k); if (!init && now - x.t < 90000) file.unshift({ ...it, vivant: true }); }
    }
    const p = l.find(x => !x.passe);
    prochain = p ? robotDuDepart(p.d) : null;
  }
  // Rejeu : au démarrage, les derniers départs du jour ; ensuite un toutes les 9 s (ceux de l'île ouverte seulement).
  function planifierTirs(t) {
    if (t < 2.2) return;
    if (file.length && t - tirPrec > 1.8) { tirer(file.shift(), t); tirPrec = t; return; }
    if (!file.length && t - tirPrec > 9) {
      const l = salles3d[courant] ? partis.filter(x => x.rob.salle === courant) : partis;
      if (l.length) file.push({ ...l[rejeuK++ % l.length], vivant: false });
      else tirPrec = t;
    }
  }
  function tirer(x, t) {
    const R = x.rob.r;
    R.updateMatrixWorld();
    const S = new THREE.Vector3(0, 1.52, 0.85).applyMatrix4(R.matrixWorld);
    const E = new THREE.Vector3(S.x * 0.8 + (Math.random() - 0.5) * 16, 27 + Math.random() * 6, -44 - Math.random() * 12);
    const C = new THREE.Vector3(S.x, Math.max(S.y + 9, E.y + 2), S.z + 2);
    const courbe = new THREE.QuadraticBezierCurve3(S, C, E);
    const m = x.bloque ? MAT_ROUGE : MAT_OR;
    const grp = new THREE.Group();
    const geos = [0.36, 0.22, 0.1].map((rad, k) => {
      const g = new THREE.TubeGeometry(courbe, NT, rad, RS, false);
      g.setDrawRange(0, 0);
      const me = new THREE.Mesh(g, m[k]); me.frustumCulled = false; me.renderOrder = 3 + k; grp.add(me);
      return g;
    });
    const tete = new THREE.Mesh(geoTete, m[2]); tete.visible = false; grp.add(tete);
    const lueur = new THREE.Sprite(new THREE.SpriteMaterial({ map: texHalo, color: x.bloque ? '#ff5a6e' : CYAN, transparent: true, opacity: 0.9, depthWrite: false }));
    lueur.scale.set(2.6, 2.6, 1); tete.add(lueur);
    scene.add(grp);
    rayons.push({ x, t0: t, grp, geos, courbe, tete, S, E, lance: false, impact: false });
  }
  function lancer(b, t) {
    const x = b.x, h = x.d.heure.replace(':', 'h');
    filDetecteur(x.vivant ? `${x.d.quoi} · ${x.bloque ? 'bloqué' : 'part maintenant'}` : `${x.d.quoi} · ${x.bloque ? 'bloqué' : 'parti'} à ${h}`, x.bloque ? 'rouge' : 'chaud');
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: x.bloque ? texBloque : texParti, transparent: true, depthTest: false, depthWrite: false, sizeAttenuation: false }));
    sp.renderOrder = 20; sp.position.copy(b.S).add(new THREE.Vector3(0.5, 2.9, 0)); sp.scale.set(0, 0, 1);
    scene.add(sp);
    cris.push({ sp, t0: t });
    const v = b.S.clone().project(camera);
    if (Math.abs(v.x) < 1.1 && Math.abs(v.y) < 1.1 && v.z < 1) lignes = { t0: t, cx: (v.x + 1) / 2, cy: (1 - v.y) / 2, force: x.vivant ? 0.8 : 0.42, graine: 1 + Math.floor(Math.random() * 1e6) };
    if (x.vivant) secousse = { t0: t, f: 0.35 };
  }
  function impact(b, t) {
    const P = b.x.bloque ? b.courbe.getPoint(0.45) : b.E;
    const ec = new THREE.Sprite(new THREE.SpriteMaterial({ map: texEclat, color: b.x.bloque ? '#ff7b8b' : '#ffffff', transparent: true, depthWrite: false, sizeAttenuation: false }));
    ec.position.copy(P); ec.renderOrder = 15; ec.scale.set(0, 0, 1); scene.add(ec);
    const on = new THREE.Sprite(new THREE.SpriteMaterial({ map: texOnde, color: b.x.bloque ? '#ff9aa6' : '#ffffff', transparent: true, depthWrite: false }));
    on.position.copy(P); on.renderOrder = 14; on.scale.set(0, 0, 1); scene.add(on);
    eclats.push({ ec, on, t0: t });
  }
  const borne = (v, a, b) => Math.min(b, Math.max(a, v));
  function majRayons(t) {
    for (let i = rayons.length - 1; i >= 0; i--) {
      const b = rayons[i], e = t - b.t0, u = b.x.rob.r.userData;
      u.charge = Math.max(u.charge, e < 0.7 ? e / 0.7 : e < 1.5 ? 1 : Math.max(0, 1 - (e - 1.5) / 0.8));
      const k = borne((e - 0.7) / 0.42, 0, 1), front = (1 - Math.pow(1 - k, 3)) * (b.x.bloque ? 0.45 : 1);
      const ret = borne((e - (b.x.bloque ? 1.0 : 1.2)) / 0.55, 0, 1), debut = Math.pow(ret, 1.4) * front;
      b.geos.forEach(g => { const a = Math.floor(debut * NT) * RS * 6, z = Math.ceil(front * NT) * RS * 6; g.setDrawRange(a, Math.max(0, z - a)); });
      b.tete.visible = k > 0 && ret < 1;
      if (b.tete.visible) { b.courbe.getPoint(front, b.tete.position); b.tete.scale.setScalar(1 + 0.25 * Math.sin(e * 40)); }
      if (!b.lance && e >= 0.7) { b.lance = true; lancer(b, t); }
      if (!b.impact && e >= (b.x.bloque ? 0.95 : 1.12)) { b.impact = true; impact(b, t); }
      if (e > 2.5) { scene.remove(b.grp); b.geos.forEach(g => g.dispose()); b.tete.children[0].material.dispose(); rayons.splice(i, 1); }
    }
  }
  const sortir = x => 1 + 2.70158 * Math.pow(x - 1, 3) + 1.70158 * Math.pow(x - 1, 2);   // léger dépassement
  function majEffets(t) {
    for (let i = cris.length - 1; i >= 0; i--) {
      const c = cris[i], e = t - c.t0, h = 0.075 * (e < 0.2 ? sortir(e / 0.2) : 1);
      c.sp.scale.set(h * 2.56, h, 1);
      c.sp.material.opacity = 1 - borne((e - 1.5) / 0.5, 0, 1);
      if (e > 2.0) { scene.remove(c.sp); c.sp.material.dispose(); cris.splice(i, 1); }
    }
    for (let i = eclats.length - 1; i >= 0; i--) {
      const c = eclats[i], e = t - c.t0;
      const s = 0.1 * (e < 0.12 ? e / 0.12 : 1 + (e - 0.12) * 0.5);
      c.ec.scale.set(s, s, 1); c.ec.material.opacity = 1 - borne((e - 0.25) / 0.35, 0, 1);
      const o = 1 + e * 18; c.on.scale.set(o, o, 1); c.on.material.opacity = 0.9 * (1 - borne(e / 0.7, 0, 1));
      if (e > 0.72) { scene.remove(c.ec, c.on); c.ec.material.dispose(); c.on.material.dispose(); eclats.splice(i, 1); }
    }
  }
  // Le prochain départ : un fragment de données qui grossit dans les mains de son agent.
  const orbeProchain = new THREE.Group();
  orbeProchain.add(maille(new THREE.IcosahedronGeometry(0.26, 1), matOrbe, 2, 0.04));
  const lueurP = new THREE.Sprite(new THREE.SpriteMaterial({ map: texHalo, color: CYAN, transparent: true, opacity: 0.75, depthWrite: false }));
  lueurP.scale.set(1.6, 1.6, 1); orbeProchain.add(lueurP);
  orbeProchain.visible = false; scene.add(orbeProchain);

  /* glitch : des bandes décalées rose, cyan et jaune autour de l'agent qui tire, sur une toile posée au-dessus de la 3D */
  const fx = $('#fx-vitesse'), gfx = fx.getContext('2d');
  let lignes = null, lignesVisibles = false, secousse = null;
  function tailleFx() { const k = Math.min(devicePixelRatio || 1, 2); fx.width = Math.round(innerWidth * k); fx.height = Math.round(innerHeight * k); lignes = null; lignesVisibles = false; }
  tailleFx();
  function dessinerLignes(t) {
    if (!lignes) { if (lignesVisibles) { gfx.clearRect(0, 0, fx.width, fx.height); lignesVisibles = false; } return; }
    const e = t - lignes.t0, W = fx.width, H = fx.height;
    gfx.clearRect(0, 0, W, H);
    if (e > 0.6) { lignes = null; lignesVisibles = false; return; }
    lignesVisibles = true;
    const a = Math.min(1, e / 0.06) * (1 - e / 0.6) * lignes.force;
    let s = lignes.graine;
    const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
    const cx = lignes.cx * W, cy = lignes.cy * H, teintes = [`255,42,109`, `0,240,255`, `243,230,0`];
    for (let i = 0; i < 28; i++) {
      const y = cy + (rnd() - 0.5) * H * 0.75, h = (2 + rnd() * 14) * H / 900, x0 = cx - W * (0.1 + rnd() * 0.5), lw = W * (0.15 + rnd() * 0.6);
      gfx.fillStyle = `rgba(${teintes[i % 3]},${(a * (0.75 - (i % 3) * 0.15)).toFixed(3)})`;
      gfx.fillRect(x0 + (rnd() - 0.5) * 60 * e, y, lw, h);
    }
  }

  /* caméra */
  let off = { x: 0, y: 0 };
  function appliquerOffset(o) {
    off = o;
    if (Math.abs(o.x) < 0.5 && Math.abs(o.y) < 0.5) camera.clearViewOffset();
    else camera.setViewOffset(innerWidth, innerHeight, o.x, o.y, innerWidth, innerHeight);
  }
  function vue(id) {
    let cible, dir, largeur, hauteur;
    if (id === 'cerveau') { cible = CERVEAU.clone().add(new THREE.Vector3(-1.4, -0.6, 0)); dir = new THREE.Vector3(-0.1, 0.18, 1); largeur = 16; hauteur = 11; }
    // Maine se regarde un peu de son côté gauche, celui vers lequel il est tourné
    else if (id === 'chef') { cible = CHEF.clone().add(new THREE.Vector3(0, 3.0, 0)); dir = new THREE.Vector3(-0.15, 0.16, 1); largeur = 10.5; hauteur = 10; }
    // chaque estrade se regarde de face ; celles des côtés, un peu plus depuis le centre, pour que l'estrade voisine ne cache personne
    else if (salles3d[id]) { const s = salles3d[id], r = s.rot * (Math.abs(s.rot) > 0.7 ? 1.35 : 1); cible = s.centre.clone().add(new THREE.Vector3(0, 3.1, -0.5).applyAxisAngle(HAUTV, r)); dir = new THREE.Vector3(0, 0.26, 1).applyAxisAngle(HAUTV, r); largeur = 11.4; hauteur = 10.4; }
    else { cible = new THREE.Vector3(0, 8, -8); dir = new THREE.Vector3(0, 0.55, 1); largeur = 68; hauteur = 50; }
    dir.normalize();
    const a = aire(id), H = innerHeight, tv = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    // vue d'ensemble sur PC : le toit glisse à droite du cadre « QG de Salah », posé en haut à gauche
    if (id === 'vue' && !telephone()) { const g = document.querySelector('.marque').getBoundingClientRect().right * 0.55; a.l =Math.max(160, a.l - g); a.ox -= g / 2; }
    const d = Math.max((hauteur * H) / (2 * a.h * tv), (largeur * H) / (2 * a.l * tv)) * 1.04;
    return { pos: cible.clone().addScaledVector(dir, d), cible, off: { x: a.ox, y: a.oy } };
  }
  let anim = null;
  const lisseK = k => (k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2);
  function aller(id, instant = false) {
    const v = vue(id);
    if (salles3d[id] && !reduit) {   // les étiquettes de l'île se rallument en balayage
      const t = horloge.getElapsedTime();
      scans.filter(s => s.salle === id).forEach((s, k) => { s.u.value = 0; s.debut = t + (instant ? 0 : 0.6) + k * 0.08; });
    }
    if (instant || reduit) {
      anim = null; camera.position.copy(v.pos); controls.target.copy(v.cible); appliquerOffset(v.off); controls.enabled = true; controls.update(); return;
    }
    anim = { t0: performance.now(), dur: 1350, de: { pos: camera.position.clone(), cible: controls.target.clone(), off: { ...off } }, a: v };
    controls.enabled = false;
  }

  /* clics */
  const ray = new THREE.Raycaster(), souris = new THREE.Vector2();
  let appui = null;
  function viser(e) {
    const r = canvas.getBoundingClientRect();
    souris.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(souris, camera);
    const h = ray.intersectObjects(cibles, false)[0];
    return h ? h.object.userData.id : null;
  }
  canvas.addEventListener('pointerdown', e => { appui = [e.clientX, e.clientY]; });
  canvas.addEventListener('pointerup', e => {
    if (!appui) return;
    const dx = e.clientX - appui[0], dy = e.clientY - appui[1];
    appui = null;
    if (dx * dx + dy * dy > 49) return;
    const id = viser(e);
    if (id && id !== courant) choisir(id);
  });
  canvas.addEventListener('pointermove', e => { if (e.pointerType === 'mouse' && !e.buttons) canvas.style.cursor = viser(e) ? 'pointer' : 'grab'; });
  controls.addEventListener('start', () => { anim = null; controls.enabled = true; });

  const surResize = () => {
    renderer.setSize(innerWidth, innerHeight, false);
    camera.aspect = innerWidth / innerHeight;
    camera.updateProjectionMatrix();
    majResTrait();
    tailleFx();
    aller(courant, true);
  };
  addEventListener('resize', surResize);

  /* boucle */
  let premier = true, vivant = true, dernierSuivi = 0;
  const dec = new THREE.Vector3();
  function boucle() {
    if (!vivant) return;
    requestAnimationFrame(boucle);
    if (document.hidden || pointOuvert) return;
    const t = reduit ? 0 : horloge.getElapsedTime();
    tAura.value = t;
    if (!reduit) {
      const now = performance.now();
      if (now - dernierSuivi > 1000) { dernierSuivi = now; suivreDeparts(false); }
      planifierTirs(t);
    }
    ROB.forEach(x => { x.r.userData.charge = 0; });
    majRayons(t);
    ROB.forEach(x => animerRobot(x.r, t));
    majEffets(t);
    orbeProchain.visible = !!prochain && !rayons.some(b => b.x.rob === prochain);
    if (orbeProchain.visible) { orbeProchain.position.set(0, 0.95, 0.5).applyMatrix4(prochain.r.matrixWorld); orbeProchain.scale.setScalar(0.9 + 0.12 * Math.sin(t * 4)); orbeProchain.rotation.y = t * 1.5; }
    // les plateformes du Sandevistan et de Maine flottent ; le Sandevistan tourne et palpite ; les AV tanguent
    cerveau.position.y = CERVEAU.y + Math.sin(t * 0.7) * 0.22;
    chef.position.y = CHEF.y + Math.sin(t * 0.7 + 1.3) * 0.18;
    tribunes.forEach(c => { c.position.y = c.userData.y0 + Math.sin(t * 0.5 + c.userData.ph) * 0.3; c.rotation.z = Math.sin(t * 0.4 + c.userData.ph) * 0.04; c.rotation.y = c.userData.ry + Math.sin(t * 0.2 + c.userData.ph) * 0.05; });
    plaques.rotation.y = t * 0.35; plaques.rotation.x = t * 0.12;
    anneauA.rotation.z = t * 0.6; anneauB.rotation.z = -t * 0.45;
    texBande.offset.x = -t * 0.03;
    noyau.scale.setScalar(1 + Math.sin(t * 3.2) * 0.06);
    poussiere.rotation.y = -t * 0.05;
    halo.material.opacity = 0.45 + 0.08 * Math.sin(t * 1.4);
    for (let k = 0; k < NC; k++) { const a = t * 0.12 + k * Math.PI * 2 / NC; colis.setMatrixAt(k, mColis.makeRotationY(-a).setPosition(Math.cos(a) * RT, 0.6, Math.sin(a) * RT)); }
    colis.instanceMatrix.needsUpdate = true;
    liens.forEach(l => { l.courbe.getPoint((t * 0.22 + l.d) % 1, l.imp.position); });
    // les drones tournent autour de la tour
    debris.forEach(c => { const u = c.userData, a = u.a + t * 0.05; c.position.set(Math.cos(a) * u.R, u.y0 + Math.sin(t * 0.6 + u.ph) * 0.35, Math.sin(a) * u.R); c.rotation.y = -a; });
    for (const s of scans) if (s.u.value < 1) s.u.value = borne((t - s.debut) / 0.55, 0, 1);
    if (anim) {
      const k = Math.min(1, (performance.now() - anim.t0) / anim.dur), e = lisseK(k);
      camera.position.lerpVectors(anim.de.pos, anim.a.pos, e);
      camera.position.y += Math.sin(Math.PI * e) * 2.2;
      controls.target.lerpVectors(anim.de.cible, anim.a.cible, e);
      appliquerOffset({ x: anim.de.off.x + (anim.a.off.x - anim.de.off.x) * e, y: anim.de.off.y + (anim.a.off.y - anim.de.off.y) * e });
      if (k >= 1) { anim = null; controls.enabled = true; }
    }
    const dist = camera.position.distanceTo(controls.target);
    scene.fog.near = dist * 1.2 + 20;
    scene.fog.far = dist * 3.4 + 260;
    controls.update();
    ciel.position.copy(camera.position);
    pluie.uT.value = t;
    pluie.uCam.value.copy(camera.position);
    let secoue = false;
    if (secousse) {
      const e = t - secousse.t0;
      if (e > 0.35) secousse = null;
      else { const f = secousse.f * (1 - e / 0.35); dec.set(Math.sin(e * 70) * f, Math.cos(e * 83) * f * 0.7, 0); camera.position.add(dec); secoue = true; }
    }
    renderer.render(scene, camera);
    if (secoue) camera.position.sub(dec);
    dessinerLignes(t);
    if (premier) { premier = false; $('#chargement').hidden = true; }
  }

  // arrivée : de loin vers la vue d'ensemble, puis les derniers départs du jour rejoués
  const depart = vue('vue');
  camera.position.copy(depart.pos.clone().sub(depart.cible).multiplyScalar(1.35).add(depart.cible).add(new THREE.Vector3(-14, 6, 0)));
  controls.target.copy(depart.cible);
  appliquerOffset(depart.off);
  suivreDeparts(true);
  file.push(...partis.slice(-4).map(x => ({ ...x, vivant: false })));
  boucle();
  aller(courant, false);
  function arreter() {
    vivant = false;
    removeEventListener('resize', surResize);
    controls.dispose();
    gfx.clearRect(0, 0, fx.width, fx.height);
    renderer.dispose();
    renderer.forceContextLoss();
  }
  return { aller, arreter };
}
