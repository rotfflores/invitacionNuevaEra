(() => {
  'use strict';

  const section = document.getElementById('red-memory-archive');
  const invitationContent = document.getElementById('invitation-content');
  const archive = window.RED_MEMORY_ARCHIVE;
  if (!section || !archive || !Array.isArray(archive.memories)) return;

  const memories = archive.memories.slice(0, 12);
  if (memories.length < 8) return;

  const gallery = section.querySelector('#red-memory-grid');
  const filmstrip = section.querySelector('#red-memory-filmstrip');
  const dialog = document.querySelector('#red-memory-dialog');
  const dialogImage = document.querySelector('#red-dialog-image');
  const dialogPlaceholder = document.querySelector('#red-dialog-placeholder');
  const dialogCounter = document.querySelector('#red-dialog-counter');
  const dialogTitle = document.querySelector('#red-dialog-title');
  const dialogDate = document.querySelector('#red-dialog-date');
  const dialogNote = document.querySelector('#red-dialog-note');
  const dialogFigure = document.querySelector('.red-memory__dialog-figure');
  const closeButton = document.querySelector('.red-memory__dialog-close');
  const finalCard = section.querySelector('#red-one-more');
  const finalBack = section.querySelector('#red-one-more-image');
  const finalMessage = section.querySelector('#red-one-more-message');
  const ribbon = section.querySelector('#red-ribbon-line');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  let selectedIndex = 0;
  let opener = null;
  let savedScrollY = 0;
  let pointerStart = null;
  let sectionVisible = false;
  let ribbonFrame = 0;
  let ribbonLength = 0;

  const makeText = (tag, text, className) => {
    const node = document.createElement(tag);
    if (className) node.className = className;
    node.textContent = text || '';
    return node;
  };

  const makePhotoSurface = (memory, className = '') => {
    const surface = document.createElement('div');
    surface.className = `red-memory__photo ${className}`.trim();
    surface.style.setProperty('--memory-position', memory.position || 'center');
    if (memory.src) {
      const image = document.createElement('img');
      image.src = memory.thumbnailSrc || memory.src;
      image.alt = memory.alt || memory.title || 'Recuerdo de Alison';
      image.loading = 'lazy';
      image.decoding = 'async';
      surface.append(image);
    } else {
      surface.append(makeText('span', 'FOTOGRAFÍA PENDIENTE', 'red-memory__placeholder'));
    }
    return surface;
  };

  const createPolaroid = (memory, index) => {
    const card = document.createElement('button');
    card.type = 'button';
    card.className = `red-memory__polaroid red-memory__polaroid--${index} is-revealing`;
    card.dataset.memoryIndex = String(index);
    card.style.setProperty('--memory-tilt', `${[-2, 3, -2.5, 2, -1, 3, -3, 1.5, -1.5, 2, -2, 1][index % 12]}deg`);
    card.setAttribute('aria-label', `Abrir recuerdo: ${memory.title || `fotografía ${index + 1}`}`);
    const figure = document.createElement('figure');
    figure.append(makePhotoSurface(memory));
    const caption = document.createElement('figcaption');
    caption.append(makeText('strong', memory.title || 'Un recuerdo por añadir'));
    caption.append(makeText('span', memory.date || 'ADD DATE'));
    if (memory.note) caption.append(makeText('small', memory.note));
    figure.append(caption);
    card.append(figure);
    return card;
  };

  const createFilmFrame = (memory, index) => {
    const frame = document.createElement('button');
    frame.type = 'button';
    frame.className = 'red-memory__film-button';
    frame.dataset.memoryIndex = String(index);
    frame.setAttribute('aria-label', `Abrir recuerdo: ${memory.title || `fotografía ${index + 1}`}`);
    frame.append(makeText('span', '', 'red-memory__film-hole'));
    frame.append(makePhotoSurface(memory));
    frame.append(makeText('small', memory.date || 'ADD DATE'));
    return frame;
  };

  memories.forEach((memory, index) => gallery.append(createPolaroid(memory, index)));
  [1, 3, 6, 8].filter(index => memories[index]).forEach(index => filmstrip.append(createFilmFrame(memories[index], index)));

  const photoButtons = [...section.querySelectorAll('[data-memory-index]')];
  const developingObserver = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('is-developed');
      entry.target.classList.remove('is-revealing');
      developingObserver.unobserve(entry.target);
    });
  }, { threshold: 0.18 });
  gallery.querySelectorAll('.red-memory__polaroid').forEach(card => developingObserver.observe(card));

  const updateDialog = index => {
    selectedIndex = (index + memories.length) % memories.length;
    const memory = memories[selectedIndex];
    dialogCounter.textContent = `${String(selectedIndex + 1).padStart(2, '0')} / ${String(memories.length).padStart(2, '0')}`;
    dialogTitle.textContent = memory.title || 'Un recuerdo por añadir';
    dialogDate.textContent = memory.date || '';
    dialogNote.textContent = memory.note || '';
    dialogImage.style.setProperty('--dialog-position', memory.position || 'center');
    if (memory.src) {
      dialogImage.alt = memory.alt || memory.title || 'Recuerdo de Alison';
      dialogImage.src = memory.src;
      dialogImage.hidden = false;
      dialogPlaceholder.hidden = true;
    } else {
      dialogImage.removeAttribute('src');
      dialogImage.alt = '';
      dialogImage.hidden = true;
      dialogPlaceholder.hidden = false;
    }
  };

  const lockBackground = () => {
    savedScrollY = window.scrollY;
    document.body.classList.add('red-memory-dialog-open');
    document.body.style.position = 'fixed';
    document.body.style.top = `-${savedScrollY}px`;
    document.body.style.width = '100%';
  };

  const unlockBackground = () => {
    document.body.classList.remove('red-memory-dialog-open');
    document.body.style.removeProperty('position');
    document.body.style.removeProperty('top');
    document.body.style.removeProperty('width');
    window.scrollTo(0, savedScrollY);
  };

  const openMemory = (index, trigger) => {
    opener = trigger || document.activeElement;
    updateDialog(index);
    dialog.hidden = false;
    invitationContent.inert = true;
    invitationContent.setAttribute('aria-hidden', 'true');
    lockBackground();
    closeButton.focus({ preventScroll: true });
  };

  const closeMemory = () => {
    if (dialog.hidden) return;
    dialog.hidden = true;
    invitationContent.inert = false;
    invitationContent.removeAttribute('aria-hidden');
    unlockBackground();
    opener?.focus?.({ preventScroll: true });
  };

  photoButtons.forEach(button => button.addEventListener('click', () => openMemory(Number(button.dataset.memoryIndex), button)));
  dialog.querySelectorAll('[data-red-close]').forEach(button => button.addEventListener('click', closeMemory));
  dialog.querySelector('[data-red-prev]').addEventListener('click', () => updateDialog(selectedIndex - 1));
  dialog.querySelector('[data-red-next]').addEventListener('click', () => updateDialog(selectedIndex + 1));

  document.addEventListener('keydown', event => {
    if (dialog.hidden) return;
    if (event.key === 'Escape') {
      event.preventDefault();
      closeMemory();
    } else if (event.key === 'ArrowLeft') {
      event.preventDefault();
      updateDialog(selectedIndex - 1);
    } else if (event.key === 'ArrowRight') {
      event.preventDefault();
      updateDialog(selectedIndex + 1);
    } else if (event.key === 'Tab') {
      const focusables = [...dialog.querySelectorAll('button:not([disabled])')];
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }
  });

  dialogFigure.addEventListener('pointerdown', event => {
    pointerStart = { x: event.clientX, y: event.clientY };
  }, { passive: true });
  dialogFigure.addEventListener('pointerup', event => {
    if (!pointerStart) return;
    const deltaX = event.clientX - pointerStart.x;
    const deltaY = event.clientY - pointerStart.y;
    pointerStart = null;
    if (Math.abs(deltaX) < 46 || Math.abs(deltaX) < Math.abs(deltaY)) return;
    updateDialog(selectedIndex + (deltaX < 0 ? 1 : -1));
  }, { passive: true });

  filmstrip.addEventListener('keydown', event => {
    const buttons = [...filmstrip.querySelectorAll('[data-memory-index]')];
    const current = buttons.indexOf(document.activeElement);
    if (current < 0) return;
    let target = -1;
    if (event.key === 'ArrowRight') target = Math.min(buttons.length - 1, current + 1);
    if (event.key === 'ArrowLeft') target = Math.max(0, current - 1);
    if (event.key === 'Home') target = 0;
    if (event.key === 'End') target = buttons.length - 1;
    if (target >= 0) {
      event.preventDefault();
      buttons[target].focus({ preventScroll: false });
    }
  });

  const special = archive.special || {};
  if (special.src) {
    const specialImage = document.createElement('img');
    specialImage.src = special.src;
    specialImage.alt = special.alt || 'Fotografía especial de recuerdos';
    specialImage.loading = 'lazy';
    specialImage.decoding = 'async';
    finalBack.style.setProperty('--special-position', special.position || 'center');
    finalBack.replaceChildren(specialImage);
  } else {
    finalBack.textContent = 'FOTOGRAFÍA ESPECIAL PENDIENTE';
  }
  finalCard.addEventListener('click', () => {
    const flipped = finalCard.classList.toggle('is-flipped');
    finalCard.setAttribute('aria-pressed', String(flipped));
    finalMessage.hidden = !flipped;
  });

  const drawRibbon = () => {
    ribbonFrame = 0;
    if (!ribbonLength) return;
    if (reducedMotion.matches) {
      ribbon.style.strokeDashoffset = '0';
      return;
    }
    const rect = section.getBoundingClientRect();
    const progress = Math.max(0, Math.min(1, (window.innerHeight - rect.top) / (rect.height + window.innerHeight * .28)));
    ribbon.style.strokeDashoffset = String(ribbonLength * (1 - progress));
  };
  const queueRibbon = () => {
    if (!sectionVisible || ribbonFrame) return;
    ribbonFrame = requestAnimationFrame(drawRibbon);
  };
  if (ribbon) {
    ribbonLength = ribbon.getTotalLength();
    ribbon.style.strokeDasharray = String(ribbonLength);
    ribbon.style.strokeDashoffset = reducedMotion.matches ? '0' : String(ribbonLength);
    new IntersectionObserver(entries => {
      sectionVisible = entries[0].isIntersecting;
      if (sectionVisible) queueRibbon();
    }, { threshold: 0 }).observe(section);
    window.addEventListener('scroll', queueRibbon, { passive: true });
    window.addEventListener('resize', queueRibbon, { passive: true });
    reducedMotion.addEventListener('change', queueRibbon);
  }
})();
