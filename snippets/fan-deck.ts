/**
 * Fanned card deck: one card in front, its neighbours tilted out either side,
 * the rest waiting behind. It rotates on a timer while on screen, and dots,
 * arrows or a click on a peeking card bring that card forward.
 *
 * Layout lives in CSS (see fan-deck.css): this only writes `data-pos` on each
 * card, the signed distance from the front card (0, 1, -1, 2 for four cards).
 *
 * Lessons baked in:
 * - No pause on hover. The deck sits where the cursor rests while scrolling, and
 *   content scrolling under a still cursor never fires `pointerleave`, so a hover
 *   pause can get stuck on for good.
 * - Replaying a CSS transition needs a real reset: snap the card back with
 *   transitions off, force a reflow, then re-add the class. Removing and re-adding
 *   it in one frame does nothing.
 */
export function fanDeck(
  deck: HTMLElement,
  { interval = 4000, onFront }: { interval?: number; onFront?: (card: HTMLElement) => void } = {},
) {
  const cards = [...deck.querySelectorAll<HTMLElement>('[data-card]')];
  const dots = [...deck.parentElement!.querySelectorAll<HTMLElement>('[data-dot]')];
  const calm = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let active = 0;
  let timer = 0;
  let inView = false;

  const layout = () => {
    const n = cards.length;
    cards.forEach((card, i) => {
      let d = (i - active + n) % n;
      if (d > n / 2) d -= n; // nearest way round, so cards fan to both sides
      card.dataset.pos = String(d);
    });
    dots.forEach((dot, i) => dot.setAttribute('aria-current', String(i === active)));
  };

  const go = (i: number) => {
    active = (i + cards.length) % cards.length;
    layout();
    const front = cards[active];
    // replay the card's draw-in: snap to its start state, then animate in again
    front.classList.add('is-resetting');
    front.classList.remove('is-in');
    void front.offsetWidth;
    front.classList.remove('is-resetting');
    void front.offsetWidth;
    front.classList.add('is-in');
    onFront?.(front);
  };

  const schedule = () => {
    clearInterval(timer);
    if (!calm && inView) timer = window.setInterval(() => go(active + 1), interval);
  };
  const pick = (i: number) => {
    go(i);
    schedule(); // a manual pick restarts the countdown
  };

  cards.forEach((card, i) => card.addEventListener('click', () => i !== active && pick(i)));
  dots.forEach((dot, i) => dot.addEventListener('click', () => pick(i)));
  deck.parentElement!.querySelector('[data-prev]')?.addEventListener('click', () => pick(active - 1));
  deck.parentElement!.querySelector('[data-next]')?.addEventListener('click', () => pick(active + 1));

  // only rotate while someone can see it
  new IntersectionObserver(([entry]) => {
    inView = entry.isIntersecting;
    schedule();
  }, { threshold: 0.3 }).observe(deck);

  layout();
  return { go: pick };
}
