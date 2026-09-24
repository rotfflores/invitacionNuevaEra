(() => {
  const section = document.querySelector('#lover-gifts');
  if (!section) return;
  const config = window.LOVER_GIFTS || {};
  const valid = value => typeof value === 'string' && value.trim() && !/\[.*\]/.test(value);
  const toggle = section.querySelector('.lover-gifts__toggle');
  const panel = section.querySelector('#lover-gift-options');
  const registry = section.querySelector('[data-gift="registry"]');
  const digital = section.querySelector('[data-gift="digital"]');
  section.querySelector('[data-gift="presence"]').hidden = config.presence?.enabled === false;
  let registryURL;
  try { const url = new URL(config.registry?.url); if (/^https?:$/.test(url.protocol)) registryURL = url.href; } catch {}
  registry.hidden = !(config.registry?.enabled && registryURL);
  if (!registry.hidden) registry.querySelector('a').href = registryURL;
  const bank = config.digital || {};
  digital.hidden = !(bank.enabled && valid(bank.account));
  const depositCard = section.querySelector('[data-gift="deposit"]');
  const deposit = config.deposit || {};
  depositCard.hidden = !(deposit.enabled && valid(deposit.card));
  section.querySelector('[data-gift="envelope"]').hidden = !config.envelope?.enabled;
  section.querySelector('.lover-gifts__cards').dataset.count = section.querySelectorAll('.lover-gifts__card:not([hidden])').length;
  const status = section.querySelector('.lover-gifts__status');
  const detailPanels = [];
  const setupDetails = (card, fields, copyValue) => {
    const reveal = card.querySelector('.lover-gifts__reveal');
    const details = card.querySelector('.lover-gifts__bank');
    const list = details.querySelector('dl');
    const close = () => { details.hidden = true; list.replaceChildren(); reveal.setAttribute('aria-expanded', 'false'); };
    detailPanels.push(close);
    reveal.addEventListener('click', () => {
      const open = details.hidden;
      details.hidden = !open;
      reveal.setAttribute('aria-expanded', String(open));
      list.replaceChildren();
      if (open) for (const [label, value] of fields) {
        if (!valid(value)) continue;
        const term = document.createElement('dt'), description = document.createElement('dd');
        term.textContent = label; description.textContent = value.trim(); list.append(term, description);
      }
    });
    const copy = details.querySelector('.lover-gifts__copy');
    let copyTimer;
    copy.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(copyValue.trim());
        copy.querySelector('span').textContent = 'COPIADO';
        copy.querySelector('svg').hidden = false;
        status.textContent = 'Datos copiados correctamente.';
        clearTimeout(copyTimer);
        copyTimer = setTimeout(() => { copy.querySelector('span').textContent = 'COPIAR'; copy.querySelector('svg').hidden = true; status.textContent = ''; }, 2400);
      } catch { status.textContent = 'No se pudo copiar. Selecciona y copia el número mostrado.'; }
    });
  };
  if (!digital.hidden) setupDetails(digital, [['Titular', bank.holder], ['Banco', bank.bank], ['CLABE o cuenta', bank.account]], bank.account);
  if (!depositCard.hidden) setupDetails(depositCard, [['Titular', deposit.holder], ['Banco', deposit.bank], ['Número de tarjeta', deposit.card]], deposit.card);
  toggle.hidden = false;
  panel.classList.add('is-collapsed');
  panel.inert = true;
  panel.setAttribute('aria-hidden', 'true');
  toggle.addEventListener('click', () => {
    const open = toggle.getAttribute('aria-expanded') !== 'true';
    toggle.setAttribute('aria-expanded', String(open));
    toggle.querySelector('.lover-gifts__toggle-label').textContent = open ? 'OCULTAR OPCIONES' : 'DESCUBRIR OPCIONES DE REGALO';
    section.classList.toggle('is-open', open);
    panel.classList.toggle('is-collapsed', !open);
    panel.inert = !open;
    panel.setAttribute('aria-hidden', String(!open));
    if (!open) detailPanels.forEach(close => close());
  });
  section.querySelectorAll('.lover-gifts__card').forEach(card => {
    let timer;
    card.addEventListener('click', () => { card.classList.add('is-touched'); clearTimeout(timer); timer = setTimeout(() => card.classList.remove('is-touched'), 650); });
  });
  if ('IntersectionObserver' in window) new IntersectionObserver(entries => {
    section.classList.toggle('is-visible', entries[0].isIntersecting);
  }).observe(section);
})();
