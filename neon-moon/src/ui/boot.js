// Écran de démarrage : quelques lignes de journal, retiré à la première image.
const MIN_VISIBLE = 900; // ms : assez pour lire, pas assez pour attendre
const MAX_VISIBLE = 6000; // ms : filet de sécurité si quelque chose bloque

export function createBoot() {
  const el = document.getElementById('boot');
  const list = document.getElementById('boot-log');
  const shownAt = performance.now();
  let closed = false;

  const close = () => {
    if (closed || !el) return;
    closed = true;
    el.classList.add('is-done');
    setTimeout(() => el.remove(), 800);
  };
  const safety = setTimeout(close, MAX_VISIBLE);

  const line = (text, cls) => {
    if (!list) return;
    const li = document.createElement('li');
    li.textContent = text;
    if (cls) li.className = cls;
    list.appendChild(li);
  };

  return {
    log(label, status) {
      line(`> ${label} ${'.'.repeat(Math.max(2, 28 - label.length))} ${status}`);
    },
    done() {
      line('> liaison neurale ............ établie');
      const wait = Math.max(0, MIN_VISIBLE - (performance.now() - shownAt));
      clearTimeout(safety);
      setTimeout(close, wait);
    },
    fail(message) {
      line(`> ${message}`, 'is-warn');
      clearTimeout(safety);
      setTimeout(close, 1800);
    },
  };
}
