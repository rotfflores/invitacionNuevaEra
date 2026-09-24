(() => {
  'use strict';

  const cover = document.getElementById('invitation-cover');
  const video = document.getElementById('cover-video');
  const audio = document.getElementById('invitation-audio');
  const button = document.getElementById('open-invitation');
  const content = document.getElementById('invitation-content');
  const soundToggle = document.getElementById('sound-toggle');
  const soundLabel = document.getElementById('sound-label');
  const soundStatus = document.getElementById('sound-status');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  let opening = false;
  let finished = false;
  let exitTimer;
  let soundEnabled = false;
  let soundInteracted = false;
  let soundRequest = 0;

  const updateSound = () => {
    audio.muted = !soundEnabled;
    soundToggle.setAttribute('aria-pressed', String(soundEnabled));
    soundLabel.textContent = soundEnabled ? 'SILENCIAR AUDIO' : 'ACTIVAR AUDIO';
  };

  // Set the DOM properties as well as the HTML attributes before requesting play.
  video.defaultMuted = true;
  video.muted = true;
  video.playsInline = true;

  const playBackground = () => {
    if (opening || reducedMotion.matches || document.hidden) return;
    // Autoplay can be blocked by OS power/data-saving policies. Keep the poster.
    video.play()?.catch(() => cover.classList.remove('is-playing'));
  };

  video.addEventListener('playing', () => {
    if (opening || reducedMotion.matches || document.hidden) {
      video.pause();
      return;
    }
    if (!reducedMotion.matches) cover.classList.add('is-playing');
  });
  video.addEventListener('error', () => cover.classList.remove('is-playing'));

  const syncMotion = () => {
    video.autoplay = !reducedMotion.matches;
    if (reducedMotion.matches) {
      cover.classList.remove('is-playing');
      video.pause();
    } else {
      playBackground();
    }
  };

  const pauseMusic = () => {
    soundRequest += 1;
    audio.pause();
  };

  const playMusic = async () => {
    if (!soundEnabled || document.hidden) return;
    const request = ++soundRequest;
    try {
      if (audio.error) audio.load();
      await audio.play();
    } catch {
      if (request !== soundRequest) return;
      soundEnabled = false;
      updateSound();
      soundStatus.textContent = 'No se pudo reproducir el audio. Toca para volver a intentarlo.';
    }
  };

  const setSound = (enabled) => {
    soundInteracted = true;
    soundEnabled = enabled;
    soundStatus.textContent = '';
    updateSound();
    // Keep this play request inside the tap, including when opening directly.
    if (soundEnabled) playMusic();
    else pauseMusic();
  };

  audio.addEventListener('playing', () => {
    if (!soundEnabled || document.hidden) pauseMusic();
  });

  soundToggle.addEventListener('click', () => setSound(!soundEnabled));
  cover.addEventListener('click', (event) => {
    // Controls keep their own action; never override a deliberate mute later.
    if (opening || soundInteracted || event.target.closest('button, a')) return;
    setSound(true);
  });

  const finishOpening = () => {
    if (finished) return;
    finished = true;
    window.clearTimeout(exitTimer);
    video.pause();
    cover.hidden = true;
    content.hidden = false;
    document.body.classList.remove('cover-open');
    content.focus({ preventScroll: true });
    document.dispatchEvent(new CustomEvent('invitation:opened'));
  };

  button.addEventListener('click', () => {
    if (opening) return;
    if (!soundInteracted) setSound(true);
    opening = true;
    button.disabled = true;
    video.pause();
    cover.classList.add('is-leaving');
    if (reducedMotion.matches) {
      finishOpening();
      return;
    }
    cover.addEventListener('transitionend', (event) => {
      if (event.target === cover && event.propertyName === 'opacity') finishOpening();
    });
    // Also complete if the tab is backgrounded or transitionend is not emitted.
    exitTimer = window.setTimeout(finishOpening, 1050);
  });

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      video.pause();
      pauseMusic();
    } else {
      playBackground();
      playMusic();
    }
  });
  window.addEventListener('pagehide', () => {
    video.pause();
    pauseMusic();
  });
  window.addEventListener('pageshow', () => {
    playBackground();
    playMusic();
  });
  reducedMotion.addEventListener('change', syncMotion);
  updateSound();
  syncMotion();
})();
