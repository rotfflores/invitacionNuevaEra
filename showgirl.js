(() => {
  const section = document.querySelector('#showgirl-itinerary');
  if (!section || !window.SHOWGIRL_PROGRAM) return;
  const config = window.SHOWGIRL_PROGRAM;
  const program = section.querySelector('.showgirl__program');
  const list = section.querySelector('.showgirl__acts');
  const interlude = section.querySelector('.showgirl__interlude');
  const finale = section.querySelector('.showgirl__finale');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');

  // Acts come from showgirl-config.js; the photo stays between Act II and Act III.
  list.replaceChildren();
  config.acts.forEach((act, index) => {
    const item = document.createElement('li'); item.className = 'showgirl__act';
    const lamp = document.createElement('span'); lamp.className = 'showgirl__lamp'; lamp.setAttribute('aria-hidden', 'true');
    const line = document.createElement('div'); line.className = 'showgirl__act-meta';
    const label = document.createElement('span'); label.textContent = act.act;
    const time = document.createElement('span'); time.textContent = act.time || '[HORA]';
    line.append(label, time);
    const title = document.createElement('h3'); title.textContent = act.title;
    item.append(lamp, line, title);
    if (act.description) { const text = document.createElement('p'); text.textContent = act.description; item.append(text); }
    list.append(item);
    if (index === 1) list.append(interlude);
  });
  section.querySelectorAll('[data-showgirl-photo]').forEach((button, index) => {
    button.querySelector('img').style.objectPosition = config.photoPositions[index] || 'center';
  });
  const acts = [...list.querySelectorAll('.showgirl__act')];

  // Golden stage cable: a curved path through every lamp and behind the photo.
  const svgNS = 'http://www.w3.org/2000/svg';
  const cable = document.createElementNS(svgNS, 'svg');
  cable.setAttribute('class', 'showgirl__cable'); cable.setAttribute('aria-hidden', 'true'); cable.setAttribute('focusable', 'false');
  const paths = ['is-base', 'is-glow', 'is-lit'].map(name => { const p = document.createElementNS(svgNS, 'path'); p.setAttribute('class', name); cable.append(p); return p; });
  program.insertBefore(cable, list);
  let length = 0, progress = 0, lampAt = [];
  // Layout offsets (ignore reveal/scale transforms) relative to the program.
  const centre = el => { let x = el.offsetWidth / 2, y = el.offsetHeight / 2, n = el; while (n && n !== program) { x += n.offsetLeft; y += n.offsetTop; n = n.offsetParent; } return { x, y }; };
  const drawCable = () => {
    const origin = { width: program.offsetWidth, height: program.offsetHeight };
    cable.setAttribute('width', origin.width); cable.setAttribute('height', origin.height);
    cable.setAttribute('viewBox', `0 0 ${origin.width} ${origin.height}`);
    const listTop = list.offsetTop;
    const points = [{ x: origin.width * 0.5, y: listTop - 14 }];
    lampAt = [];
    list.childNodes.forEach(node => {
      if (node === interlude) { const c = centre(interlude.querySelector('.showgirl__photo')); points.push({ x: c.x + origin.width * 0.08, y: c.y }); return; }
      const c = centre(node.querySelector('.showgirl__lamp')); points.push(c); lampAt.push(c.y);
    });
    points.push({ x: origin.width * 0.5, y: origin.height });
    let d = `M${points[0].x.toFixed(1)} ${points[0].y.toFixed(1)}`;
    for (let i = 1; i < points.length; i++) {
      const a = points[i - 1], b = points[i], dy = b.y - a.y, sway = (i % 2 ? 1 : -1) * Math.min(38, origin.width * 0.09);
      d += ` C${(a.x + sway).toFixed(1)} ${(a.y + dy * 0.55).toFixed(1)} ${(b.x - sway).toFixed(1)} ${(b.y - dy * 0.55).toFixed(1)} ${b.x.toFixed(1)} ${b.y.toFixed(1)}`;
    }
    paths.forEach(p => p.setAttribute('d', d));
    length = paths[2].getTotalLength();
    paths.slice(1).forEach(p => { p.style.strokeDasharray = `${length} ${length}`; });
    paint();
  };
  const paint = () => { paths.slice(1).forEach(p => { p.style.strokeDashoffset = (length * (1 - progress)).toFixed(1); }); };

  // Scroll state: the lit cable follows the reader; the nearest act takes the spotlight.
  let frame = 0, active = -1;
  const setActive = index => {
    if (index === active) return;
    active = index;
    acts.forEach((act, i) => { act.classList.toggle('is-active', i === index); act.classList.toggle('is-past', i < index); });
    program.classList.toggle('has-active', index >= 0);
    if (index >= 0) program.style.setProperty('--glow-y', `${acts[index].offsetTop + list.offsetTop + acts[index].offsetHeight / 2}px`);
  };
  const update = () => {
    frame = 0;
    const rect = program.getBoundingClientRect();
    const focus = innerHeight * 0.55 - rect.top;
    progress = Math.max(progress, Math.min(1, Math.max(0, focus / rect.height)));
    paint();
    let index = -1;
    lampAt.forEach((y, i) => { if (focus >= y - 40) index = i; });
    if (rect.bottom < innerHeight * 0.2) index = acts.length - 1;
    setActive(index);
  };
  const schedule = () => { if (!frame) frame = requestAnimationFrame(update); };

  const reveal = (elements, options, onReveal) => {
    elements.forEach(el => el.classList.add('will-reveal'));
    const observer = new IntersectionObserver(entries => entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('is-revealed');
      entry.target.classList.remove('will-reveal');
      observer.unobserve(entry.target);
      onReveal?.(entry.target);
    }), options);
    elements.forEach(el => observer.observe(el));
  };

  if ('IntersectionObserver' in window) {
    reveal(acts, { rootMargin: '0px 0px -12% 0px', threshold: 0.15 });
    reveal([interlude], { rootMargin: '0px 0px -10% 0px', threshold: 0.12 });
    reveal([finale], { threshold: 0.45 });
    new IntersectionObserver(entries => {
      if (entries[0].isIntersecting) { addEventListener('scroll', schedule, { passive: true }); schedule(); }
      else { removeEventListener('scroll', schedule); cancelAnimationFrame(frame); frame = 0; }
    }).observe(section);
  } else { progress = 1; acts.forEach(act => act.classList.add('is-past')); }
  if (reduced.matches) { acts.forEach(act => act.classList.remove('will-reveal')); }
  drawCable();
  if ('ResizeObserver' in window) new ResizeObserver(() => requestAnimationFrame(drawCable)).observe(program);
  else addEventListener('resize', drawCable);

  // Lightbox (unchanged behaviour).
  const dialog = document.querySelector('#showgirl-lightbox');
  const image = dialog.querySelector('img'); let trigger;
  section.querySelectorAll('[data-showgirl-photo]').forEach(button => button.addEventListener('click', () => {
    trigger = button; image.src = button.querySelector('img').src; image.alt = button.querySelector('img').alt;
    dialog.showModal(); dialog.querySelector('button').focus();
  }));
  const close = () => dialog.close();
  dialog.querySelector('button').addEventListener('click', close);
  dialog.addEventListener('click', event => { if (event.target === dialog) close(); });
  dialog.addEventListener('close', () => { image.removeAttribute('src'); trigger?.focus({ preventScroll: true }); });

  // Gold arrow: links to the next section when one is configured.
  const next = section.querySelector('.showgirl__next');
  const target = config.nextSection && document.getElementById(config.nextSection);
  if (target) next.href = `#${target.id}`;
})();
