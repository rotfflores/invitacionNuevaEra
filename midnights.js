(() => {
  'use strict';

  const section = document.getElementById('midnights');
  const portrait = document.getElementById('midnights-video');
  const backdrop = document.getElementById('midnights-blur');
  const videos = [portrait, backdrop];
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const wideScreen = matchMedia('(min-aspect-ratio: 1/1)');
  let opened = false;
  let visible = false;
  let pageActive = true;

  const shouldPlay = video => opened && visible && pageActive && !document.hidden &&
    !reducedMotion.matches && (video === portrait || wideScreen.matches);

  const syncPlayback = () => {
    for (const video of videos) {
      if (!shouldPlay(video)) {
        video.pause();
        if (reducedMotion.matches) video.classList.remove('is-playing');
        continue;
      }
      // No src is assigned before opening, preventing hidden autoplay/downloads.
      const source = video.querySelector('source');
      if (!source.hasAttribute('src')) {
        source.src = source.dataset.src;
        video.load();
      }
      video.muted = true;
      if (video === backdrop && video.readyState >= 1 && Math.abs(video.currentTime - portrait.currentTime) > .25) {
        video.currentTime = portrait.currentTime;
      }
      video.play()?.catch(() => video.classList.remove('is-playing'));
    }
  };

  for (const video of videos) {
    video.defaultMuted = true;
    video.muted = true;
    video.playsInline = true;
    video.addEventListener('playing', () => {
      if (!shouldPlay(video)) video.pause();
      else video.classList.add('is-playing');
    });
    video.addEventListener('error', () => video.classList.remove('is-playing'));
  }
  backdrop.addEventListener('loadedmetadata', () => {
    backdrop.currentTime = portrait.currentTime;
  });

  const observer = new IntersectionObserver(entries => {
    visible = entries[0].isIntersecting && entries[0].intersectionRatio > 0;
    section.classList.toggle('is-visible', visible && opened);
    syncPlayback();
  }, { threshold: [0, 0.001] });
  observer.observe(section);

  document.addEventListener('invitation:opened', () => {
    opened = true;
    section.classList.add('is-active');
    // Observer handles actual visibility, including restored scroll positions.
    const rect = section.getBoundingClientRect();
    visible = rect.bottom > 0 && rect.top < innerHeight;
    section.classList.toggle('is-visible', visible);
    syncPlayback();
  }, { once: true });

  section.querySelector('.midnights__discover').addEventListener('click', event => {
    event.preventDefault();
    const target = document.getElementById('event-details');
    target.focus({ preventScroll: true });
    target.scrollIntoView({ behavior: reducedMotion.matches ? 'instant' : 'smooth', block: 'start' });
  });
  reducedMotion.addEventListener('change', syncPlayback);
  wideScreen.addEventListener('change', syncPlayback);
  document.addEventListener('visibilitychange', syncPlayback);
  window.addEventListener('pagehide', () => { pageActive = false; syncPlayback(); });
  window.addEventListener('pageshow', () => { pageActive = true; syncPlayback(); });
})();
