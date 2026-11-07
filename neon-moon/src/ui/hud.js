// HUD : horloge, altitude, i/s, chapitre actif, barre de progression,
// facteur de ralenti. Lit l'état de la scène, ne pilote rien.
import { CHAPTERS } from '../config.js';

const $ = (id) => document.getElementById(id);
const pad = (n) => String(n).padStart(2, '0');
const nf = new Intl.NumberFormat('fr-FR');

export function createHUD({ onChapterChange } = {}) {
  const clock = $('t-clock');
  const alt = $('t-alt');
  const fps = $('t-fps');
  const bar = $('p-bar');
  const label = $('p-label');
  const factor = $('d-factor');
  const ticks = [...document.querySelectorAll('.rail__tick')];
  const sections = [...document.querySelectorAll('#story > .chapter')];
  const total = pad(CHAPTERS.length);

  let active = -1;
  let frames = 0;
  let fpsClock = 0;
  let lastAlt = '';
  let lastFactor = '';
  let dilating = false;

  const tickClock = () => {
    const d = new Date();
    clock.textContent = `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
  };
  tickClock();
  setInterval(tickClock, 1000);

  const setChapter = (i) => {
    if (i === active) return;
    active = i;
    ticks.forEach((t, k) => t.classList.toggle('is-active', k === i));
    sections.forEach((s, k) => s.classList.toggle('is-active', k === i));
    label.textContent = `${pad(i + 1)} / ${total} — ${CHAPTERS[i].name}`;
    onChapterChange?.(i);
  };

  return {
    update(dtReal, { progress, chapter, altitude, dilation, timeScale }) {
      setChapter(chapter);
      bar.style.width = `${(progress * 100).toFixed(2)}%`;

      const a = `${nf.format(Math.round(altitude))} m`;
      if (a !== lastAlt) { alt.textContent = a; lastAlt = a; }

      const f = `×${timeScale.toFixed(2).replace('.', ',')}`;
      if (f !== lastFactor) { factor.textContent = f; lastFactor = f; }

      const isDilating = dilation > 0.5;
      if (isDilating !== dilating) {
        dilating = isDilating;
        document.body.classList.toggle('is-dilating', dilating);
      }

      frames++;
      fpsClock += dtReal;
      if (fpsClock >= 0.5) {
        fps.textContent = Math.round(frames / fpsClock);
        frames = 0;
        fpsClock = 0;
      }
    },
  };
}
