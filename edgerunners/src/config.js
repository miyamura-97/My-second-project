// Réglages centraux : palette, qualité selon l'appareil, monde et caméra.
// Tout ce qu'on veut retoucher sans fouiller le code se trouve ici.

export const PALETTE = {
  yellow: 0xf3e600,
  cyan: 0x00f0ff,
  magenta: 0xff2a6d,
  red: 0xff003c,
  acid: 0x39ff9c,
  violet: 0x9d4dff,
  warm: 0xffc46b,
  white: 0xf4f1ff,
  fog: 0x1a0826,
  skyTop: 0x030209,
  skyMid: 0x150630,
  skyHorizon: 0x4c0e40,
};

const coarse = matchMedia('(pointer: coarse)').matches;
const small = Math.min(innerWidth, innerHeight) < 700;

export const IS_MOBILE = coarse || small;
export const REDUCED_MOTION = matchMedia('(prefers-reduced-motion: reduce)').matches;

export const QUALITY = IS_MOBILE
  ? { pixelRatio: Math.min(devicePixelRatio, 1.25), msaa: 0, density: 0.6, rain: 2200, traffic: 120, bloom: 0.7 }
  : { pixelRatio: Math.min(devicePixelRatio, 1.6), msaa: 4, density: 1, rain: 6000, traffic: 260, bloom: 0.8 };

export const WORLD = {
  seed: 1997,
  avenueHalf: 12, // demi-largeur de l'avenue centrale, laissée libre pour la caméra
  block: 34, // côté d'un pâté de maisons
  street: 10, // largeur d'une rue transversale
  xMax: 300,
  zMin: -1150,
  zMax: 110,
  fogDensity: 0.0021,
  moon: { position: [0, 470, -1800], radius: 165 },
  // Tour Arasaka : au bout de l'avenue, un peu à droite. Visible dans l'axe depuis le
  // héros, elle encadre la Lune au dernier chapitre sans la masquer.
  arasaka: { x: 74, z: -1000, w: 48, d: 48, h: 340 },
};

// Une image clé de caméra par chapitre (même ordre que les <section> du HTML).
// pos / look : position et cible de la caméra, en unités du monde (1 u ≈ 2,4 m).
// core : place de l'implant dans le repère de la caméra
//   x = droite, y = haut, dist = profondeur devant l'objectif, scale = taille.
export const CHAPTERS = [
  { name: 'Night City', pos: [0, 74, 160], look: [0, 60, 20], core: { x: 6.2, y: 0.6, dist: 24, scale: 0.62 } },
  { name: 'Arasaka', pos: [-5, 32, -10], look: [3, 31, -170], core: { x: -6.4, y: 0.2, dist: 24, scale: 0.52 } },
  { name: 'Sandevistan', pos: [4, 44, -235], look: [1, 43, -320], core: { x: 4.8, y: 0.0, dist: 18, scale: 0.66 } },
  { name: "L'équipe", pos: [1.5, 23, -430], look: [0, 25, -580], core: { x: 6.6, y: 1.6, dist: 27, scale: 0.46 } },
  { name: 'La Lune', pos: [0, 150, -770], look: [0, 300, -1800], core: { x: -12, y: 1.5, dist: 34, scale: 0.4 } },
];

// Enseignes holographiques de Night City (japonais + petite ligne latine).
export const SIGNS = [
  { jp: 'ミリテック', latin: 'MILITECH' },
  { jp: 'ナイトシティ', latin: 'NIGHT CITY' },
  { jp: '月へ', latin: 'TO THE MOON' },
  { jp: 'アフターライフ', latin: 'AFTERLIFE' },
  { jp: '電脳', latin: 'CYBERDECK' },
  { jp: 'ラーメン', latin: 'RAMEN 03:00' },
  { jp: 'リジー', latin: "LIZZIE'S BAR" },
  { jp: 'カンタオ', latin: 'KANG TAO' },
  { jp: '救急', latin: 'TRAUMA TEAM' },
  { jp: '夢', latin: 'BRAINDANCE' },
  { jp: '危険', latin: 'NCPD ZONE' },
  { jp: '義体', latin: 'RIPPERDOC' },
];

// Enseignes de la tour Arasaka
export const ARASAKA_SIGNS = {
  vertical: { jp: '荒坂', latin: 'ARASAKA' },
  crown: { jp: '荒坂', latin: 'ARASAKA CORP.' },
};
