(function () {
  'use strict';
  const search = document.getElementById('productSearch');
  const cards = Array.from(document.querySelectorAll('[data-product-id]'));
  const sections = Array.from(document.querySelectorAll('[data-family]'));
  const filters = Array.from(document.querySelectorAll('[data-filter]'));
  const status = document.getElementById('productResultStatus');
  const rangeTitle = document.getElementById('currentProductRange');
  const empty = document.getElementById('noProductResults');
  const browser = document.querySelector('.range-browser');
  const hero = document.querySelector('.range-hero');
  const allGallery = document.getElementById('allProductsGallery');
  const note = document.querySelector('.range-note');
  if (!search || !cards.length || !status || !empty) return;
  let family = 'all';
  let targetCard = null;
  let pendingAlignment = true;
  let alignmentFrame;
  const normalize = value => String(value).normalize('NFKC').toLowerCase().replace(/[–—]/g, '-').trim();

  function render() {
    const terms = normalize(search.value).split(/\s+/).filter(Boolean);
    let count = 0;
    cards.forEach(card => {
      const haystack = normalize(card.textContent + ' ' + card.id);
      const matches = (family === 'all' || card.dataset.productFamily === family) && terms.every(term => haystack.includes(term));
      card.hidden = !matches;
      if (matches) count += 1;
    });
    sections.forEach(section => {
      section.hidden = !Array.from(section.querySelectorAll('[data-product-id]')).some(card => !card.hidden);
      const heading = section.querySelector('h2');
      if (family !== 'all' && section.id === family) {
        heading.setAttribute('role', 'heading');
        heading.setAttribute('aria-level', '1');
      } else {
        heading.removeAttribute('role');
        heading.removeAttribute('aria-level');
      }
    });
    filters.forEach(link => {
      const active = link.dataset.filter === family;
      link.classList.toggle('is-active', active);
      if (active) link.setAttribute('aria-current', 'true');
      else link.removeAttribute('aria-current');
    });
    document.body.dataset.view = family === 'all' ? 'all' : 'family';
    browser.dataset.activeFamily = family;
    hero.hidden = family !== 'all';
    if (allGallery) allGallery.hidden = family !== 'all' || terms.length > 0;
    if (note) {
      if (family === 'all') document.querySelector('.range-tools').after(note);
      else browser.append(note);
    }
    const dictionary = window.EuroAgriCurrentDictionary || {};
    const key = family === 'all' ? 'catalogue.filter.all' : `catalogue.family.${family}`;
    const title = dictionary[key] || filters.find(link => link.dataset.filter === family)?.textContent.trim() || 'All products';
    if (rangeTitle) rangeTitle.textContent = title;
    document.title = `${title} | Euro Agri Trading s.r.o.`;
    search.placeholder = dictionary['catalogue.filter.placeholder'] || 'e.g. MAP, 20-20-20, iron';
    status.textContent = `${count} ${dictionary['catalogue.filter.count'] || 'products and formulations'}`;
    empty.hidden = count > 0;
  }

  function alignView() {
    cancelAnimationFrame(alignmentFrame);
    alignmentFrame = requestAnimationFrame(() => {
      alignmentFrame = requestAnimationFrame(() => {
        if (!pendingAlignment) return;
        // Category links open a complete category view at the top. Individual
        // product links use one measured header offset, without stacking CSS offsets.
        const headerHeight = document.querySelector('header').getBoundingClientRect().height;
        const top = targetCard ? targetCard.getBoundingClientRect().top + scrollY - headerHeight - 20 : 0;
        window.scrollTo({ top: Math.max(0, top), behavior: 'instant' });
      });
    });
  }

  function applyLocation(moveFocus = false) {
    const id = location.hash.slice(1);
    targetCard = cards.find(card => card.id === id) || null;
    const targetFamily = sections.find(section => section.id === id);
    family = targetCard ? targetCard.dataset.productFamily : targetFamily ? targetFamily.id : 'all';
    search.value = '';
    pendingAlignment = true;
    render();
    if (moveFocus) {
      const target = targetCard || (family === 'all' ? hero.querySelector('h1') : document.getElementById(`heading-${family}`));
      target.setAttribute('tabindex', '-1');
      target.focus({ preventScroll: true });
    }
    alignView();
  }

  filters.forEach(link => link.addEventListener('click', event => {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    const url = new URL(location.href);
    url.hash = link.dataset.filter === 'all' ? '' : link.dataset.filter;
    if (url.href !== location.href) history.pushState({}, '', url.pathname + url.search + url.hash);
    applyLocation(true);
  }));
  search.addEventListener('input', () => { pendingAlignment = false; render(); });
  document.addEventListener('euroagri:languagechange', () => { render(); alignView(); });
  window.addEventListener('hashchange', () => applyLocation());
  window.addEventListener('popstate', () => applyLocation());
  // Translation, fonts and initial resource loading can change the target's position.
  // Re-align while opening a route, but never pull the visitor back after interaction.
  window.addEventListener('load', alignView, { once: true });
  document.fonts?.ready.then(alignView);
  ['wheel', 'touchstart', 'pointerdown', 'keydown'].forEach(type =>
    window.addEventListener(type, () => { pendingAlignment = false; }, { passive: true })
  );
  applyLocation();
})();
