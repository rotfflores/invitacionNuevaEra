(() => {
  'use strict';
  const section = document.getElementById('dress-code');
  if (!section) return;

  const reveal = section.querySelector('#reveal-dress-code');
  const content = section.querySelector('#reputation-reveal');
  const stage = section.querySelector('.reputation__stage');
  const swatches = [...section.querySelectorAll('.reputation__swatch')];
  const description = section.querySelector('#palette-description');
  const track = section.querySelector('.reputation__look-track');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  if (!reveal || !content || !stage || !description || !track || !swatches.length) return;

  let opened = false;
  let expansion;
  const releaseStage = () => {
    stage.style.removeProperty('overflow');
    expansion = null;
  };

  reveal.addEventListener('click', () => {
    if (opened) return;
    opened = true;
    const closedHeight = stage.getBoundingClientRect().height;
    reveal.setAttribute('aria-expanded', 'true');
    section.classList.add('is-revealed');
    content.inert = false;
    content.removeAttribute('aria-hidden');

    // All photographs reserve their space. Measure once, expand in place, and
    // let the stage return to natural height when the animation is finished.
    if (!reducedMotion.matches && typeof stage.animate === 'function') {
      const naturalHeight = stage.getBoundingClientRect().height;
      stage.style.overflow = 'hidden';
      expansion = stage.animate([
        { height: `${closedHeight}px` },
        { height: `${naturalHeight}px` },
      ], { duration: 950, easing: 'cubic-bezier(.25,.1,.25,1)' });
      expansion.onfinish = releaseStage;
      expansion.oncancel = releaseStage;
    }

    // Transfer keyboard focus without moving the reader away from the cover.
    swatches[0].focus({ preventScroll: true });
    reveal.disabled = true;
    window.setTimeout(() => {
      reveal.remove();
      section.querySelector('.reputation__doors')?.remove();
    }, 1000);
  });

  swatches.forEach(button => {
    button.addEventListener('click', () => {
      swatches.forEach(item => {
        const selected = item === button;
        item.classList.toggle('is-selected', selected);
        item.setAttribute('aria-pressed', String(selected));
      });
      description.textContent = `${button.querySelector('b').textContent}: ${button.dataset.description}`;
    });
  });

  // The native scroll region also works with touch, a trackpad, and without JS.
  track.addEventListener('keydown', event => {
    if (track.scrollWidth <= track.clientWidth) return;
    const step = track.querySelector('.reputation__look').getBoundingClientRect().width + parseFloat(getComputedStyle(track).columnGap);
    let destination;
    if (event.key === 'ArrowRight') destination = track.scrollLeft + step;
    else if (event.key === 'ArrowLeft') destination = track.scrollLeft - step;
    else if (event.key === 'Home') destination = 0;
    else if (event.key === 'End') destination = track.scrollWidth;
    else return;
    event.preventDefault();
    track.scrollTo({ left: destination, behavior: reducedMotion.matches ? 'instant' : 'smooth' });
  });

  reducedMotion.addEventListener('change', () => {
    if (reducedMotion.matches && expansion) expansion.cancel();
  });

  // Progressive enhancement: the entire chapter remains readable if this
  // script is unavailable; only a successfully initialized chapter is closed.
  content.inert = true;
  content.setAttribute('aria-hidden', 'true');
  section.classList.add('has-js');
})();
