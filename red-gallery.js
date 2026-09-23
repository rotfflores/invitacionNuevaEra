(() => {
  'use strict';

  const section = document.getElementById('red-memory-archive');
  const archive = window.RED_MEMORY_ARCHIVE;
  const experience = section?.querySelector('.red-memory__flip-experience');
  const host = section?.querySelector('#red-flip-host');
  if (!section || !experience || !host || !archive || !Array.isArray(archive.memories)) return;

  const memories = archive.memories.slice(0, 10);
  const photographs = [...memories, archive.special].filter(memory => memory?.src);
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const prev = section.querySelector('#red-flip-prev');
  const next = section.querySelector('#red-flip-next');
  const counter = section.querySelector('#red-flip-counter');
  const closeBook = section.querySelector('#red-flip-close');
  const error = section.querySelector('#red-flip-error');
  const dialog = document.querySelector('#red-memory-dialog');
  const dialogImage = dialog.querySelector('#red-dialog-image');
  const dialogPlaceholder = dialog.querySelector('#red-dialog-placeholder');
  const dialogCounter = dialog.querySelector('#red-dialog-counter');
  const dialogTitle = dialog.querySelector('#red-dialog-title');
  const dialogDate = dialog.querySelector('#red-dialog-date');
  const dialogNote = dialog.querySelector('#red-dialog-note');
  const themeColor = document.querySelector('meta[name="theme-color"]');
  let flip = null;
  let pages = [];
  let opened = false;
  let currentPhoto = 0;
  let scrollBeforeDialog = 0;
  let lastDrag = 0;
  let dragStart = null;
  let geometry = null;
  const contentCount = memories.length + 3;
  const PAGE_RATIO = 1.5;
  const PHONE_GUTTER = 10;
  const PHONE_PEEK = .23;
  const PHONE_RATIO = 1.62;

  const create = (tag, className, text) => {
    const node = document.createElement(tag);
    node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  };

  // The book is always a two-page spread. Only the whole spread is positioned:
  // centered on the cover or back when closed, centered when both pages fit,
  // and on phones anchored to the current (right) page so the previous page
  // peeks in from the left edge of the screen.
  const bookState = () => {
    if (!flip) return 'cover';
    const index = flip.getCurrentPageIndex();
    return index === 0 ? 'cover' : index === flip.getPageCount() - 1 ? 'back' : 'open';
  };

  const positionBook = () => {
    if (!geometry) return;
    const { viewport, offset, pageWidth: w, spread } = geometry;
    const state = bookState();
    const center = viewport / 2 - offset;
    const left = state === 'cover' ? center - 1.5 * w
      : state === 'back' ? center - w / 2
        : spread ? center - w : viewport - offset - PHONE_GUTTER - 2 * w;
    host.style.transform = `translate3d(${Math.round(left)}px, 0, 0)`;
    host.dataset.bookState = state;
  };

  const measureBook = () => {
    const width = experience.clientWidth;
    if (!width) return;
    // Phones anchor the current page to the screen edge, not to the text column.
    const viewport = document.documentElement.clientWidth;
    const offset = experience.getBoundingClientRect().left;
    const viewportHeight = innerHeight;
    const spreadHeight = Math.max(330, Math.min(viewportHeight * .68, 645));
    const phoneHeight = Math.max(300, Math.min(viewportHeight * .66, 610));
    const fullWidth = Math.min(430, spreadHeight / PAGE_RATIO, (viewport - 32) / 2);
    const peekWidth = Math.min(430, phoneHeight / PAGE_RATIO, (viewport - PHONE_GUTTER) / (1 + PHONE_PEEK));
    // Two complete pages whenever they fit at a readable size (tablet, desktop,
    // landscape phones); otherwise the phone layout with the left page peeking.
    const spread = fullWidth >= 260 || fullWidth >= peekWidth * .85;
    const pageWidth = Math.floor(spread ? fullWidth : peekWidth);
    // Phones keep roughly the previous single-page height: the page is a little
    // taller than on desktop so it stays readable next to the peeking left page.
    const phoneBookHeight = Math.max(315, Math.min(viewportHeight * .66, viewport * 1.5 - 39, 610));
    const pageHeight = spread ? Math.round(pageWidth * PAGE_RATIO)
      : Math.round(Math.max(pageWidth * PAGE_RATIO, Math.min(phoneBookHeight, pageWidth * PHONE_RATIO)));
    geometry = { width, viewport, offset, pageWidth, pageHeight, spread };
    if (flip) Object.assign(flip.getSettings(), { width: pageWidth, height: pageHeight });
    experience.style.setProperty('--red-page-width', `${pageWidth}px`);
    experience.style.setProperty('--red-page-height', `${pageHeight}px`);
    experience.style.setProperty('--red-page-scale', (pageWidth / 340).toFixed(4));
    experience.dataset.bookLayout = spread ? 'spread' : 'peek';
    positionBook();
  };

  const onResize = () => {
    host.classList.add('is-resizing');
    measureBook();
    requestAnimationFrame(() => host.classList.remove('is-resizing'));
  };

  const page = (kind, hard = false) => {
    const node = create('article', `red-memory__page red-memory__page--${kind}`);
    if (hard) node.dataset.density = 'hard';
    node.setAttribute('aria-label', kind === 'cover' ? 'Portada de THE RED MEMORY BOOK' : `Página ${kind} del libro`);
    return node;
  };

  const wrapPage = node => {
    const inner = create('div', 'red-memory__page-inner');
    inner.append(...node.childNodes);
    node.append(inner);
    return node;
  };

  const makePhoto = (memory, index, variation = '') => {
    const button = create('button', `red-memory__page-polaroid ${variation}`);
    button.type = 'button';
    button.dataset.photoIndex = String(index);
    button.setAttribute('aria-label', `Ampliar fotografía: ${memory.title || 'Recuerdo de Alison'}`);
    const frame = create('span', 'red-memory__page-photo');
    frame.style.setProperty('--photo-position', memory.position || 'center');
    const image = document.createElement('img');
    image.src = memory.thumbnailSrc || memory.src;
    image.alt = memory.alt || `Recuerdo de Alison: ${memory.title || index + 1}`;
    image.loading = index < 2 ? 'eager' : 'lazy';
    image.decoding = 'async';
    image.draggable = false;
    frame.append(image);
    button.append(frame, create('strong', 'red-memory__page-photo-title', memory.title || 'Un recuerdo de Alison'), create('small', 'red-memory__page-photo-date', memory.date || 'ADD DATE'));
    return button;
  };

  const buildPages = () => {
    const pages = [];
    const cover = page('cover', true);
    cover.innerHTML = '<span class="red-memory__cover-ribbon" aria-hidden="true"></span><span class="red-memory__cover-rule" aria-hidden="true"></span><span class="red-memory__cover-kicker">ALISON’S MEMORIES</span><h3>THE RED<br>MEMORY BOOK</h3><p>Alison’s memories</p><small>Una colección de momentos que nunca queremos olvidar.</small><span class="red-memory__cover-number" aria-hidden="true">13</span>';
    const open = create('button', 'red-memory__cover-open', 'TOCA PARA ABRIR');
    open.type = 'button';
    open.setAttribute('aria-label', 'Abrir el libro de recuerdos de Alison');
    cover.append(open);
    pages.push(wrapPage(cover));

    const intro = page('intro');
    intro.innerHTML = '<span class="red-memory__page-topline">RED MEMORY ARCHIVE</span><span class="red-memory__intro-ornament" aria-hidden="true">13</span><h3>All too well,<br><em>we remember.</em></h3><p>Estas páginas guardan pequeñas historias de Alison: las tardes que quisiéramos repetir, las risas inesperadas y todo lo que todavía está por venir.</p><span class="red-memory__page-hand">Para Alison, con cariño.</span><span class="red-memory__page-footer">A COLLECTION OF MOMENTS</span>';
    pages.push(wrapPage(intro));

    memories.forEach((memory, index) => {
      const types = ['feature', 'note', 'duo', 'diary', 'tape', 'film', 'portrait', 'letter', 'wide', 'keepsake'];
      const interior = page(`photo-${types[index]}`);
      interior.append(create('span', 'red-memory__page-topline', 'RED MEMORY ARCHIVE'));
      const content = create('div', 'red-memory__page-content');
      if (index === 5) {
        const film = create('div', 'red-memory__page-film');
        film.append(makePhoto(memory, index, 'red-memory__page-polaroid--film'));
        film.append(makePhoto(memories[6], 6, 'red-memory__page-polaroid--film'));
        content.append(film);
      } else {
        content.append(makePhoto(memory, index));
        if (index === 2 || index === 4) content.append(makePhoto(memories[index + 1], index + 1, 'red-memory__page-polaroid--small'));
      }
      content.append(create('p', 'red-memory__page-note', memory.note || 'Una historia para recordar.'));
      interior.append(content, create('span', 'red-memory__page-footer', 'ALISON’S MEMORY BOOK'));
      pages.push(wrapPage(interior));
    });

    const secret = page('secret');
    secret.append(create('span', 'red-memory__page-topline', 'UN RECUERDO MÁS'));
    secret.append(create('span', 'red-memory__secret-number', '13'));
    secret.append(create('h3', 'red-memory__secret-title', 'ONE MORE MEMORY'));
    const envelope = create('button', 'red-memory__envelope');
    envelope.type = 'button';
    envelope.setAttribute('aria-expanded', 'false');
    envelope.setAttribute('aria-label', 'Abrir sobre del recuerdo secreto número 13');
    envelope.innerHTML = '<span class="red-memory__envelope-flap" aria-hidden="true"></span><span class="red-memory__envelope-seal" aria-hidden="true">13</span><span class="red-memory__envelope-hint">TOCA PARA ABRIR</span>';
    secret.append(envelope);
    const reveal = create('div', 'red-memory__secret-reveal');
    reveal.append(makePhoto(archive.special, memories.length));
    reveal.append(create('p', 'red-memory__page-note', 'Los mejores recuerdos todavía están por escribirse.'));
    secret.append(reveal, create('span', 'red-memory__page-footer', 'THE NEXT MEMORY'));
    pages.push(wrapPage(secret));

    const farewell = page('farewell');
    farewell.innerHTML = '<span class="red-memory__page-topline">UNA ÚLTIMA NOTA</span><h3>And in the end,<br><em>all we are is written down.</em></h3><p>Los mejores recuerdos todavía están por escribirse.</p><span class="red-memory__page-hand">Love, always.</span><span class="red-memory__page-footer">FIN · O TAL VEZ EL COMIENZO</span>';
    pages.push(wrapPage(farewell));

    const back = page('back', true);
    back.innerHTML = '<span class="red-memory__cover-ribbon" aria-hidden="true"></span><span class="red-memory__back-mark">ALISON’S MEMORY BOOK</span><span class="red-memory__back-number">13</span>';
    const replay = create('button', 'red-memory__back-replay', 'TOCA PARA VOLVER A VER');
    replay.type = 'button';
    replay.setAttribute('aria-label', 'Volver al inicio del libro de recuerdos de Alison');
    back.append(replay);
    pages.push(wrapPage(back));
    return spreadPages(pages);
  };

  // A turned leaf settles on the left and keeps showing the page that was just
  // read: every content page is followed by its left-hand copy. The inside of
  // the cover board sits on the left of the first spread.
  const leftCopy = source => {
    const copy = source.cloneNode(true);
    copy.classList.add('red-memory__page--verso');
    copy.setAttribute('aria-hidden', 'true');
    // Plain elements instead of buttons: StPageFlip does not start a drag on a
    // button, and on phones this visible strip is where the finger grabs the page.
    copy.querySelectorAll('button').forEach(button => {
      const plain = document.createElement('div');
      [...button.attributes].forEach(({ name, value }) => { if (!/^(type|aria-label|aria-expanded)$/.test(name)) plain.setAttribute(name, value); });
      plain.append(...button.childNodes);
      button.replaceWith(plain);
    });
    copy.querySelectorAll('img').forEach(image => { image.loading = 'eager'; });
    return copy;
  };

  const spreadPages = built => {
    const [cover, ...rest] = built;
    const back = rest.pop();
    const endpaper = create('article', 'red-memory__page red-memory__page--endpaper');
    endpaper.dataset.density = 'hard';
    endpaper.setAttribute('aria-hidden', 'true');
    endpaper.append(create('span', 'red-memory__endpaper-lining'));
    const result = [cover];
    rest.forEach((content, index) => {
      result.push(index === 0 ? endpaper : leftCopy(rest[index - 1]), content);
    });
    result.push(back);
    return result;
  };

  const updateControls = () => {
    if (!flip) return;
    const index = flip.getCurrentPageIndex();
    const count = flip.getPageCount();
    const state = bookState();
    host.dataset.orientation = flip.getOrientation();
    prev.disabled = index === 0;
    next.disabled = index >= count - 1;
    next.setAttribute('aria-label', index === 0 ? 'Abrir libro' : 'Página siguiente');
    // The counter follows the right-hand page; its copy on the left is not counted.
    const current = (index + 1) / 2;
    counter.textContent = state === 'cover' ? 'Portada' : state === 'back' ? 'Contraportada'
      : '';
    closeBook.hidden = state !== 'open' || current < contentCount - 1;
    experience.classList.toggle('has-opened', opened);
    positionBook();
  };

  const turnPage = direction => {
    if (!flip) return;
    // Restrict taps to corners, while allowing the explicit buttons to turn a page.
    const settings = flip.getSettings();
    settings.disableFlipByClick = false;
    try { direction > 0 ? flip.flipNext() : flip.flipPrev(); }
    finally { settings.disableFlipByClick = true; }
  };

  // From the back cover, return to the closed front cover to read the book again.
  const restartBook = () => {
    opened = false;
    host.querySelectorAll('.red-memory__page--secret').forEach(secret => {
      secret.classList.remove('is-revealed');
      secret.querySelector('button.red-memory__envelope')?.setAttribute('aria-expanded', 'false');
    });
    flip.turnToPage(0);
    updateControls();
    host.focus({ preventScroll: true });
  };

  const showPhoto = index => {
    const memory = photographs[index];
    if (!memory || performance.now() - lastDrag < 520) return;
    currentPhoto = index;
    dialogImage.src = memory.src;
    dialogImage.alt = memory.alt || `Recuerdo de Alison: ${memory.title || index + 1}`;
    dialogImage.hidden = false;
    dialogPlaceholder.hidden = true;
    dialogCounter.textContent = `${String(index + 1).padStart(2, '0')} / ${String(photographs.length).padStart(2, '0')}`;
    dialogTitle.textContent = memory.title || 'Un recuerdo de Alison';
    dialogDate.textContent = memory.date || 'ADD DATE';
    dialogNote.textContent = memory.note || (index === memories.length ? 'Los mejores recuerdos todavía están por escribirse.' : '');
    scrollBeforeDialog = scrollY;
    dialog.hidden = false;
    document.body.classList.add('red-memory-dialog-open');
    document.body.style.position = 'fixed';
    document.body.style.top = `-${scrollBeforeDialog}px`;
    document.body.style.width = '100%';
    document.querySelector('#invitation-content').inert = true;
    dialog.querySelector('.red-memory__dialog-close').focus({ preventScroll: true });
  };

  const hidePhoto = () => {
    if (dialog.hidden) return;
    dialog.hidden = true;
    dialogImage.src = '';
    document.querySelector('#invitation-content').inert = false;
    document.body.classList.remove('red-memory-dialog-open');
    document.body.style.position = '';
    document.body.style.top = '';
    document.body.style.width = '';
    scrollTo({ top: scrollBeforeDialog, behavior: 'instant' });
    host.focus({ preventScroll: true });
  };

  dialog.querySelectorAll('[data-red-close]').forEach(button => button.addEventListener('click', hidePhoto));
  dialog.querySelector('[data-red-prev]').addEventListener('click', () => showPhoto((currentPhoto + photographs.length - 1) % photographs.length));
  dialog.querySelector('[data-red-next]').addEventListener('click', () => showPhoto((currentPhoto + 1) % photographs.length));

  host.addEventListener('pointerdown', event => { dragStart = { id: event.pointerId, x: event.clientX, y: event.clientY, moved: false }; }, { capture: true, passive: true });
  host.addEventListener('pointermove', event => {
    if (dragStart?.id === event.pointerId && Math.hypot(event.clientX - dragStart.x, event.clientY - dragStart.y) > 9) dragStart.moved = true;
  }, { capture: true, passive: true });
  host.addEventListener('pointerup', () => { if (dragStart?.moved) lastDrag = performance.now(); dragStart = null; }, { capture: true, passive: true });
  host.addEventListener('pointercancel', () => { if (dragStart?.moved) lastDrag = performance.now(); dragStart = null; }, { capture: true, passive: true });
  host.addEventListener('click', event => {
    if (performance.now() - lastDrag < 520) { event.preventDefault(); event.stopPropagation(); return; }
    const open = event.target.closest('.red-memory__cover-open');
    if (open && !opened) { event.preventDefault(); turnPage(1); return; }
    const replay = event.target.closest('.red-memory__back-replay');
    if (replay && bookState() === 'back') { event.preventDefault(); event.stopPropagation(); restartBook(); return; }
    const envelope = event.target.closest('.red-memory__envelope');
    if (envelope) {
      event.preventDefault();
      event.stopPropagation();
      const expanded = !envelope.closest('.red-memory__page--secret').classList.contains('is-revealed');
      host.querySelectorAll('.red-memory__page--secret').forEach(secret => {
        secret.classList.toggle('is-revealed', expanded);
        const button = secret.querySelector('button.red-memory__envelope');
        if (button) button.setAttribute('aria-expanded', String(expanded));
      });
      return;
    }
    const photo = event.target.closest('[data-photo-index]');
    if (photo) { event.preventDefault(); event.stopPropagation(); showPhoto(Number(photo.dataset.photoIndex)); }
  }, true);

  prev.addEventListener('click', () => turnPage(-1));
  next.addEventListener('click', () => turnPage(1));
  closeBook.addEventListener('click', () => turnPage(1));
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && !dialog.hidden) { hidePhoto(); return; }
    if (!dialog.hidden || !flip || section.getBoundingClientRect().bottom < 0 || section.getBoundingClientRect().top > innerHeight || /INPUT|TEXTAREA|SELECT/.test(document.activeElement?.tagName || '')) return;
    if (event.key === 'ArrowRight') { event.preventDefault(); turnPage(1); }
    if (event.key === 'ArrowLeft') { event.preventDefault(); turnPage(-1); }
  });

  const init = () => {
    if (flip) return;
    if (!window.St?.PageFlip || memories.length < 8) {
      experience.hidden = true;
      error.hidden = false;
      return;
    }
    try {
      pages = buildPages();
      host.replaceChildren(...pages);
      host.tabIndex = 0;
      measureBook();
      addEventListener('resize', onResize);
      flip = new St.PageFlip(host, {
        width: geometry?.pageWidth || 400, height: geometry?.pageHeight || 600, minWidth: 120, maxWidth: 430,
        minHeight: 180, maxHeight: 645, size: 'stretch',
        // Keep the open-book spread at every width; phones crop the left page instead.
        usePortrait: false, showCover: true, drawShadow: true,
        useMouseEvents: true, showPageCorners: true, disableFlipByClick: true,
        autoSize: false, maxShadowOpacity: .36,
        flippingTime: reducedMotion.matches ? 180 : 800,
        mobileScrollSupport: true, clickEventForward: true,
      });
      flip.on('flip', event => {
        if (event.data > 0) opened = true;
        updateControls();
      });
      flip.on('changeState', event => { host.dataset.flipState = event.data; });
      flip.on('init', updateControls);
      flip.loadFromHTML(pages);
      // This pinned StPageFlip build delays touch folding by 250 ms by default.
      // A short delay lets the page follow the finger during an ordinary drag.
      flip.getUI().swipeTimeout = 40;
      host.removeAttribute('aria-busy');
      section.classList.add('is-flip-ready');
      updateControls();
    } catch (cause) {
      console.error('Red memory book could not initialize', cause);
      flip?.destroy();
      flip = null;
      experience.hidden = true;
      error.hidden = false;
    }
  };

  if ('IntersectionObserver' in window) {
    const near = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting) { near.disconnect(); init(); }
    }, { rootMargin: '650px 0px' });
    near.observe(experience);
    const theme = new IntersectionObserver(entries => {
      if (themeColor) themeColor.content = entries[0].isIntersecting ? '#4b1719' : '#a5d4e8';
    });
    theme.observe(section);
  } else init();
})();
