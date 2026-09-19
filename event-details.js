(() => {
  'use strict';
  const config = window.EVENT_DETAILS || {};
  const section = document.getElementById('event-details');
  const clock = document.getElementById('event-clock');
  const note = document.getElementById('countdown-note');
  const begun = document.getElementById('chapter-begun');
  const cells = ['days', 'hours', 'minutes', 'seconds'].map(unit => document.getElementById(`countdown-${unit}`));
  let timer;
  let visible = false;

  const photo = document.getElementById('alison-photo');
  if (config.photoSrc) {
    photo.addEventListener('load', () => {
      photo.hidden = false;
      document.getElementById('alison-photo-placeholder').hidden = true;
      photo.parentElement.classList.add('has-photo');
    });
    photo.addEventListener('error', () => {
      photo.hidden = true;
      document.getElementById('alison-photo-placeholder').hidden = false;
      photo.parentElement.classList.remove('has-photo');
    });
    photo.src = config.photoSrc;
  }

  // Require an explicit offset AND its matching venue time zone. Never infer
  // the event time from the visitor's device or from an unconfirmed location.
  const parseEventTime = () => {
    if (!config.startsAt || !config.timeZone) return null;
    const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(Z|[+-]\d{2}:\d{2})$/.exec(config.startsAt);
    const timestamp = Date.parse(config.startsAt);
    if (!match || !Number.isFinite(timestamp)) return null;
    try {
      const parts = new Intl.DateTimeFormat('en-CA', {
        timeZone: config.timeZone, year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23',
      }).formatToParts(timestamp);
      const local = Object.fromEntries(parts.map(part => [part.type, part.value]));
      if (['year', 'month', 'day', 'hour', 'minute', 'second'].some((key, i) => local[key] !== match[i + 1])) return null;
      return timestamp;
    } catch { return null; }
  };
  const eventTime = parseEventTime();

  if (config.venue) document.getElementById('event-venue').textContent = config.venue;
  if (config.address) {
    document.getElementById('event-address').textContent = config.address;
    const map = document.getElementById('event-map');
    const url = new URL('https://www.google.com/maps/search/');
    url.searchParams.set('api', '1');
    url.searchParams.set('query', [config.venue, config.address].filter(Boolean).join(', '));
    map.href = url.href;
    map.removeAttribute('aria-disabled');
    document.getElementById('event-map-note').textContent = 'La ubicación se abrirá en Google Maps.';
  }
  if (eventTime !== null) {
    document.getElementById('event-date').textContent = new Intl.DateTimeFormat('es-MX', { timeZone: config.timeZone, day: 'numeric', month: 'long', year: 'numeric' }).format(eventTime);
    document.getElementById('event-hour').textContent = new Intl.DateTimeFormat('es-MX', { timeZone: config.timeZone, hour: '2-digit', minute: '2-digit', hour12: true }).format(eventTime);
    note.textContent = `Hora local del evento · ${config.timeZone.replaceAll('_', ' ')}`;
  }

  const updateCountdown = () => {
    if (eventTime === null) return;
    const seconds = Math.max(0, Math.ceil((eventTime - Date.now()) / 1000));
    if (seconds === 0) {
      clock.hidden = true;
      begun.hidden = false;
      if (note.textContent !== 'El nuevo capítulo ha comenzado.') note.textContent = 'El nuevo capítulo ha comenzado.';
      clearInterval(timer);
      timer = undefined;
      return;
    }
    const values = [Math.floor(seconds / 86400), Math.floor(seconds / 3600) % 24, Math.floor(seconds / 60) % 60, seconds % 60];
    values.forEach((value, i) => {
      const text = String(value).padStart(2, '0');
      if (cells[i].textContent !== text) cells[i].textContent = text;
    });
  };
  const syncCountdown = () => {
    clearInterval(timer);
    timer = undefined;
    if (!visible || document.hidden || eventTime === null) return;
    updateCountdown();
    if (Date.now() < eventTime) timer = setInterval(updateCountdown, 1000);
  };

  const observer = new IntersectionObserver(entries => {
    for (const entry of entries) {
      if (entry.target === section) {
        visible = entry.isIntersecting && entry.intersectionRatio > 0;
        if (visible) section.classList.add('is-revealed');
        syncCountdown();
      } else if (entry.isIntersecting && entry.target.classList.contains('poets__photo')) {
        entry.target.classList.add('is-placed');
        observer.unobserve(entry.target);
      } else if (entry.isIntersecting) {
        section.classList.add('is-stamped');
        observer.unobserve(entry.target);
      }
    }
  }, { threshold: [0, .01] });
  observer.observe(section);
  observer.observe(section.querySelector('.poets__footer'));
  observer.observe(section.querySelector('.poets__photo'));
  document.addEventListener('visibilitychange', syncCountdown);
  window.addEventListener('pagehide', () => { clearInterval(timer); timer = undefined; });
  window.addEventListener('pageshow', syncCountdown);
  updateCountdown();
})();
