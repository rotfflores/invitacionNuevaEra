(() => {
  const section = document.querySelector('#speak-now-rsvp');
  if (!section) return;
  const c = window.SPEAK_NOW_RSVP;
  const $ = selector => section.querySelector(selector);
  const form = $('form'), name = $('#speak-name'), message = $('#speak-message'), song = $('#speak-song');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const maximum = Math.max(1, Math.min(100, Math.floor(Number(c.maxGuests) || 1)));
  const storageKey = `speak-now-rsvp:${c.eventName}`;
  $('[data-open="button"]').setAttribute('aria-expanded', 'false');
  let guests = 1, preparedMessage = '', saved = null, sparkleTimer;
  let focusingForm = false;
  const toggleButton = $('.speak-rsvp__toggle');
  $('.speak-rsvp__deadline').textContent = c.deadline ? `Confirma antes del ${c.deadline}.` : 'Fecha límite de confirmación por definir.';
  message.placeholder = `Escribe un mensaje para ${c.celebrant}…`;
  $('.speak-rsvp__song').hidden = !c.showSong;
  const choice = () => form.querySelector('input[name="attendance"]:checked')?.value;
  const updateCount = () => {
    $('#speak-count').textContent = guests;
    $('[data-count="minus"]').disabled = guests <= 1;
    $('[data-count="plus"]').disabled = guests >= maximum;
    $('[data-count="minus"]').hidden = $('[data-count="plus"]').hidden = maximum === 1;
  };
  updateCount();
  const curtain = createCurtain();
  const open = ({ focus = false } = {}) => {
    section.classList.add('is-open');
    $('.speak-rsvp__stage').setAttribute('aria-expanded', 'true');
    toggleButton.setAttribute('aria-expanded', 'true');
    toggleButton.setAttribute('aria-label', 'Cerrar el telón');
    $('[data-open="button"]').setAttribute('aria-expanded', 'true');
    $('[data-open="button"]').hidden = true;
    $('.speak-rsvp__return').hidden = true;
    $('.speak-rsvp__preview').hidden = true;
    curtain.open(() => {
      form.hidden = false;
      if (focus) { focusingForm = true; name.focus({ preventScroll: true }); focusingForm = false; }
    });
  };
  const showThanks = (data, note = '') => {
    const first = data.name.split(/\s+/)[0];
    $('.speak-rsvp__thanks').textContent = data.choice === 'yes' ? `¡Gracias por confirmar, ${first}!` : `Gracias por avisarnos, ${first}.`;
    $('.speak-rsvp__thanks-note').textContent = note;
    $('.speak-rsvp__return').hidden = false;
  };
  const close = () => {
    section.classList.remove('is-sparkling');
    form.hidden = true;
    $('.speak-rsvp__stage').setAttribute('aria-expanded', 'false');
    toggleButton.setAttribute('aria-expanded', 'false');
    toggleButton.setAttribute('aria-label', 'Abrir el telón');
    $('[data-open="button"]').setAttribute('aria-expanded', 'false');
    $('[data-open="button"]').hidden = Boolean(saved);
    if (saved) $('.speak-rsvp__return').hidden = false;
    curtain.close(() => section.classList.remove('is-open'));
  };
  toggleButton.addEventListener('click', () => { if (curtain.busy()) return; section.classList.contains('is-open') ? close() : open(); });
  $('[data-open="button"]').addEventListener('click', () => open({ focus: true }));
  section.querySelectorAll('[data-count]').forEach(button => button.addEventListener('click', () => {
    guests = Math.max(1, Math.min(maximum, guests + (button.dataset.count === 'plus' ? 1 : -1))); updateCount();
  }));
  const updateChoice = (animate = true) => {
    const yes = choice() === 'yes';
    $('.speak-rsvp__guests').hidden = !yes;
    $('.speak-rsvp__response-note').textContent = choice() ? c.texts[choice()] : '';
    $('#speak-choice-error').textContent = '';
    section.classList.remove('is-sparkling');
    clearTimeout(sparkleTimer);
    if (yes && animate && !reduced.matches) {
      requestAnimationFrame(() => section.classList.add('is-sparkling'));
      sparkleTimer = setTimeout(() => section.classList.remove('is-sparkling'), 850);
    }
  };
  form.querySelectorAll('[name="attendance"]').forEach(input => input.addEventListener('change', () => updateChoice()));
  message.addEventListener('input', () => { $('#speak-message-count').textContent = `${message.value.length} / 250`; });
  name.addEventListener('input', () => { $('#speak-name-error').textContent = ''; name.removeAttribute('aria-invalid'); });
  const buildMessage = () => {
    $('#speak-name-error').textContent = name.value.trim() ? '' : 'Escribe tu nombre para preparar la respuesta.';
    $('#speak-choice-error').textContent = choice() ? '' : 'Selecciona si podrás asistir.';
    if (!name.value.trim()) { name.setAttribute('aria-invalid', 'true'); name.focus(); return null; }
    if (!choice()) { form.querySelector('[name="attendance"]').focus(); return null; }
    const parts = [`Hola, soy ${name.value.trim()}.`];
    if (choice() === 'yes') {
      parts.push(`Confirmo que sí asistiré al ${c.eventName} 💜`, `Número de asistentes: ${guests}`);
      if (c.showSong && song.value.trim()) parts.push(`Canción sugerida: ${song.value.trim()}`);
    } else parts.push(`Gracias por la invitación al ${c.eventName}. En esta ocasión no podré asistir.`);
    if (message.value.trim()) parts.push(`Mensaje: ${message.value.trim()}`);
    return parts.join('\n\n');
  };
  form.addEventListener('submit', event => {
    event.preventDefault();
    const text = buildMessage();
    if (!text) return;
    const phone = String(c.whatsapp).replace(/\D/g, '');
    if (!/^\d{8,15}$/.test(phone)) { $('.speak-rsvp__status').textContent = 'El número de WhatsApp aún no está disponible. Puedes copiar tu respuesta.'; return; }
    preparedMessage = text;
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(text)}`, '_blank', 'noopener,noreferrer');
    $('.speak-rsvp__status').textContent = '';
    saved = { completed: true, choice: choice(), name: name.value.trim() };
    try { localStorage.setItem(storageKey, JSON.stringify(saved)); } catch {}
    $('.speak-rsvp__preview').hidden = true;
    close();
    showThanks(saved, `${saved.choice === 'yes' ? c.texts.yes : c.texts.no} ${c.texts.ready}`);
    requestAnimationFrame(() => { const done = $('.speak-rsvp__return'); done.focus({ preventScroll: true }); done.scrollIntoView({ behavior: reduced.matches ? 'instant' : 'smooth', block: 'center' }); });
  });
  $('[data-copy]').addEventListener('click', async () => {
    const text = buildMessage();
    if (!text) return;
    try { await navigator.clipboard.writeText(text); $('.speak-rsvp__status').textContent = 'Respuesta copiada.'; }
    catch { $('.speak-rsvp__preview').hidden = false; $('.speak-rsvp__preview').textContent = text; $('.speak-rsvp__status').textContent = 'Selecciona el texto para copiarlo manualmente.'; }
  });
  try { const data = JSON.parse(localStorage.getItem(storageKey)); if (data?.completed === true && ['yes', 'no'].includes(data.choice) && typeof data.name === 'string') saved = data; } catch {}
  if (saved) {
    name.value = saved.name.slice(0, 100);
    form.querySelector(`[value="${saved.choice}"]`).checked = true;
    updateChoice(false);
    $('[data-open="button"]').hidden = true;
    showThanks(saved);
  }
  $('[data-view]').addEventListener('click', () => {
    $('.speak-rsvp__preview').hidden = false;
    $('.speak-rsvp__preview').textContent = preparedMessage || `${saved.name}\n${saved.choice === 'yes' ? 'Sí asistiré.' : 'No podré asistir.'}\n\nSolo se guardaron tu nombre y elección. Puedes cambiar la respuesta y completar de nuevo los detalles.`;
  });
  $('[data-change]').addEventListener('click', () => { $('.speak-rsvp__preview').hidden = true; $('.speak-rsvp__return').hidden = true; open({ focus: true }); });
  form.addEventListener('focusin', event => { if (!focusingForm && matchMedia('(max-width: 700px)').matches) event.target.scrollIntoView({ block: 'nearest', behavior: reduced.matches ? 'instant' : 'smooth' }); });
  if ('IntersectionObserver' in window) new IntersectionObserver(entries => section.classList.toggle('is-visible', entries[0].isIntersecting)).observe(section);

  function createCurtain() {
    const stage = $('.speak-rsvp__stage');
    const left = stage.querySelector('.speak-rsvp__curtain--left'), right = stage.querySelector('.speak-rsvp__curtain--right');
    const curtains = [left, right], drapes = curtains.map(c => c.querySelector('.speak-rsvp__drape'));
    const foldsL = left.querySelectorAll('.speak-rsvp__fold'), foldsR = right.querySelectorAll('.speak-rsvp__fold');
    const props = [stage.querySelector('.speak-rsvp__hint')];
    const seam = stage.querySelector('.speak-rsvp__seam'), light = stage.querySelector('.speak-rsvp__light');
    const g = window.gsap;
    let revealForm = () => {}, afterClose = () => {}, settle, tl, revealAt = 1;
    const setProps = visible => props.forEach(el => { el.style.visibility = visible ? '' : 'hidden'; });
    if (!g) {
      // Sin GSAP: cambio directo, telones recogidos y visibles.
      return {
        busy: () => false,
        open(onReveal) { curtains.forEach((c, i) => { c.style.transformOrigin = i ? '100% 0' : '0 0'; c.style.transform = 'scaleX(.24)'; }); seam.style.opacity = 0; light.style.opacity = 1; setProps(false); onReveal(); },
        close(done) { curtains.forEach(c => { c.style.transform = ''; }); seam.style.opacity = ''; light.style.opacity = ''; setProps(true); done(); },
      };
    }
    const willChange = on => g.set([...curtains, ...drapes], { willChange: on ? 'transform' : 'auto' });
    const build = () => {
      if (tl) tl.kill();
      tl = g.timeline({
        paused: true,
        onStart: () => { section.classList.add('is-animating'); willChange(true); },
        onComplete: () => {
          section.classList.remove('is-animating'); willChange(false); setProps(false);
          if (!reduced.matches) settle = g.timeline()
            .to(drapes[0], { rotation: -0.35, duration: 0.45, ease: 'sine.out' }).to(drapes[1], { rotation: 0.35, duration: 0.45, ease: 'sine.out' }, '<')
            .to(drapes[0], { rotation: 0.18, duration: 0.5, ease: 'sine.inOut' }).to(drapes[1], { rotation: -0.18, duration: 0.5, ease: 'sine.inOut' }, '<')
            .to(drapes, { rotation: 0, duration: 0.6, ease: 'sine.out' });
        },
        onReverseComplete: () => { section.classList.remove('is-animating'); willChange(false); afterClose(); },
      });
      revealAt = reduced.matches ? 0.3 : 1;
      if (reduced.matches) {
        tl.to(props, { opacity: 0, duration: 0.2 }, 0)
          .to(curtains, { opacity: 0.25, duration: 0.18, ease: 'sine.out' }, 0)
          .set(curtains, { scaleX: 0.24 }, 0.18)
          .set(seam, { opacity: 0 }, 0.18)
          .to(curtains, { opacity: 1, duration: 0.22, ease: 'sine.out' }, 0.2)
          .to(light, { opacity: 1, duration: 0.3 }, 0.15)
          .call(() => { if (!tl.reversed()) revealForm(); }, null, 0.3);
        return;
      }
      tl.to(props, { opacity: 0, duration: 0.4, ease: 'sine.out' }, 0)
        // 1. Tensión: la tela se tensa ~2% hacia el centro.
        .to(left, { xPercent: 2, duration: 0.2, ease: 'sine.inOut' }, 0)
        .to(right, { xPercent: -2, duration: 0.2, ease: 'sine.inOut' }, 0)
        // 2-7. Apertura: se recoge hacia cada lado, arriba firme y abajo con inercia.
        .to(left, { xPercent: -3, scaleX: 0.24, rotation: -0.8, duration: 1.15, ease: 'power3.inOut' }, 0.2)
        .to(right, { xPercent: 3, scaleX: 0.24, rotation: 0.8, duration: 1.15, ease: 'power3.inOut' }, 0.2)
        .to(left, { rotation: -0.25, duration: 0.25, ease: 'sine.out' }, 1.35)
        .to(right, { rotation: 0.25, duration: 0.25, ease: 'sine.out' }, 1.35)
        .to(drapes[0], { skewX: 2.2, duration: 0.7, ease: 'sine.out' }, 0.32)
        .to(drapes[1], { skewX: -2.2, duration: 0.7, ease: 'sine.out' }, 0.32)
        .to(drapes[0], { skewX: 0.6, duration: 0.55, ease: 'sine.out' }, 1.02)
        .to(drapes[1], { skewX: -0.6, duration: 0.55, ease: 'sine.out' }, 1.02)
        // Pliegues: pequeñas variaciones escalonadas y sombras que se intensifican al recogerse.
        .to(foldsL, { xPercent: i => -4 - i * 3, scaleX: 1.08, opacity: 0.85, duration: 1, ease: 'power3.inOut', stagger: 0.04 }, 0.24)
        .to(foldsR, { xPercent: i => 4 + (4 - i) * 3, scaleX: 1.08, opacity: 0.85, duration: 1, ease: 'power3.inOut', stagger: { each: 0.04, from: 'end' } }, 0.24)
        // 8. Se desvanece la sombra central y aumenta la luz del escenario.
        .to(seam, { opacity: 0, duration: 0.5, ease: 'sine.out' }, 0.25)
        .to(light, { opacity: 1, duration: 1, ease: 'sine.out' }, 0.4)
        // El formulario aparece a ~70% de la apertura.
        .call(() => { if (!tl.reversed()) revealForm(); }, null, 1.0)
        .to({}, { duration: 0.01 }, 1.6);
    };
    build();
    reduced.addEventListener?.('change', build);
    return {
      busy: () => tl.isActive(),
      open(onReveal) {
        revealForm = onReveal;
        if (settle) settle.kill();
        g.set(props, { visibility: '' });
        tl.timeScale(1).play();
        if (tl.time() >= revealAt) onReveal();
      },
      close(done) {
        afterClose = done;
        if (settle) { settle.kill(); g.set(drapes, { rotation: 0 }); }
        setProps(true);
        section.classList.add('is-animating'); willChange(true);
        tl.timeScale(1.15).reverse();
      },
    };
  }
})();
