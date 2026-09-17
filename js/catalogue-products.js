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
  const allGallery = document.getElementById('allProductsGallery');
  if (!search || !cards.length || !status || !empty) return;
  let family = 'all';
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
    sections.forEach(section => { section.hidden = !Array.from(section.querySelectorAll('[data-product-id]')).some(card => !card.hidden); });
    filters.forEach(button => {
      const active = button.dataset.filter === family;
      button.classList.toggle('is-active', active);
      if (button.tagName === 'BUTTON') button.setAttribute('aria-pressed', String(active));
      else if (active) button.setAttribute('aria-current', 'true');
      else button.removeAttribute('aria-current');
    });
    if (browser) browser.dataset.activeFamily = family;
    if (allGallery) allGallery.hidden = family !== 'all' || terms.length > 0;
    const dictionary = window.EuroAgriCurrentDictionary || {};
    if (rangeTitle) {
      const key = family === 'all' ? 'catalogue.filter.all' : `catalogue.family.${family}`;
      rangeTitle.textContent = dictionary[key] || filters.find(filter => filter.dataset.filter === family)?.textContent.trim() || 'All products';
    }
    search.placeholder = dictionary['catalogue.filter.placeholder'] || 'e.g. MAP, 20-20-20, iron';
    status.textContent = `${count} ${dictionary['catalogue.filter.count'] || 'products and formulations'}`;
    empty.hidden = count > 0;
  }

  function applyHash() {
    const id = location.hash.slice(1);
    const targetCard = cards.find(card => card.id === id);
    const targetFamily = sections.find(section => section.id === id);
    family = targetCard ? targetCard.dataset.productFamily : targetFamily ? targetFamily.id : 'all';
    search.value = '';
    render();
    // Unhide the target before scrolling, including links to individual formulas.
    if (targetCard || targetFamily) requestAnimationFrame(() => (targetCard || targetFamily).scrollIntoView({ block: 'start' }));
  }

  filters.forEach(button => button.addEventListener('click', event => {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    family = button.dataset.filter;
    search.value = '';
    const url = new URL(location.href);
    url.hash = family === 'all' ? '' : family;
    history.replaceState({}, '', url.pathname + url.search + url.hash);
    render();
    const target = family === 'all' ? browser : document.getElementById(family);
    requestAnimationFrame(() => {
      if (!target) return;
      target.setAttribute('tabindex', '-1');
      target.focus({ preventScroll: true });
      target.scrollIntoView({ block: 'start' });
    });
  }));
  search.addEventListener('input', render);
  document.addEventListener('euroagri:languagechange', render);
  window.addEventListener('hashchange', applyHash);
  applyHash();
})();
