/**
 * Odometer numbers: each digit rolls up to its value like a mechanical counter.
 *
 * Used for the outcome stats ("<5 min", "8 → 1", "10+ hrs"). Non-digits stay static,
 * every digit gets its own rolling column, and widths are set in `em` so the
 * window keeps fitting as the fluid font size changes with the viewport.
 *
 * Returns `roll()` and `reset()` so a scroll trigger can replay it every time
 * the stat comes back into view, not just the first time.
 *
 *   const odo = buildOdometer(document.querySelector('[data-odometer]')!);
 *   onEnter(() => requestAnimationFrame(odo.roll));
 *   onLeave(odo.reset);
 *
 * Expected CSS (line height and window height must match the 0.9em step):
 *   .odo      { display: inline-block; height: 0.9em; overflow: hidden; vertical-align: top; }
 *   .odo__col { display: flex; flex-direction: column; transition: transform 1.8s cubic-bezier(0.22, 1, 0.36, 1); }
 *   .odo__col span { height: 0.9em; line-height: 0.9; }
 */
export function buildOdometer(el: HTMLElement) {
  const value = el.dataset.odometer ?? el.textContent ?? '';
  el.textContent = '';
  el.setAttribute('aria-label', value); // screen readers get the final value, not twenty digits

  const cols: { col: HTMLElement; idx: number }[] = [];

  [...value].forEach((ch, k) => {
    if (!/\d/.test(ch)) {
      const s = document.createElement('span');
      s.setAttribute('aria-hidden', 'true');
      s.style.whiteSpace = 'pre';
      s.textContent = ch;
      el.appendChild(s);
      return;
    }

    const wrap = document.createElement('span');
    wrap.className = 'odo';
    wrap.setAttribute('aria-hidden', 'true');

    // two full runs of 0 to 9, so the roll always travels upward and lands in the second run
    const col = document.createElement('span');
    col.className = 'odo__col';
    for (let n = 0; n < 20; n++) {
      const s = document.createElement('span');
      s.textContent = String(n % 10);
      col.appendChild(s);
    }
    col.style.transitionDelay = `${0.25 + k * 0.14}s`; // digits land left to right
    wrap.appendChild(col);
    el.appendChild(wrap);

    // size the window to the final digit, in em so it scales with the font
    const probe = document.createElement('span');
    probe.textContent = ch;
    probe.style.cssText = 'position:absolute;visibility:hidden;white-space:pre';
    el.appendChild(probe);
    const fs = parseFloat(getComputedStyle(el).fontSize) || 16;
    wrap.style.width = `${probe.getBoundingClientRect().width / fs}em`;
    probe.remove();

    cols.push({ col, idx: 10 + Number(ch) });
  });

  const roll = () => cols.forEach(({ col, idx }) => (col.style.transform = `translateY(-${idx * 0.9}em)`));

  // snap back to zero without animating, so the next roll starts fresh
  const reset = () =>
    cols.forEach(({ col }) => {
      col.style.transition = 'none';
      col.style.transform = 'translateY(0)';
      void col.offsetHeight; // commit the jump before transitions come back
      col.style.transition = '';
    });

  return { roll, reset };
}
