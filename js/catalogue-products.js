(function () {
  'use strict';
  const search = document.getElementById('productSearch');
  const cards = Array.from(document.querySelectorAll('[data-product-id]'));
  const sections = Array.from(document.querySelectorAll('[data-family]'));
  const filters = Array.from(document.querySelectorAll('[data-filter]'));
  const status = document.getElementById('productResultStatus');
  const empty = document.getElementById('noProductResults');
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
      button.setAttribute('aria-pressed', String(active));
    });
    const dictionary = window.EuroAgriCurrentDictionary || {};
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

  filters.forEach(button => button.addEventListener('click', () => {
    family = button.dataset.filter;
    const url = new URL(location.href);
    url.hash = family === 'all' ? '' : family;
    history.replaceState({}, '', url.pathname + url.search + url.hash);
    render();
  }));
  search.addEventListener('input', render);
  document.addEventListener('euroagri:languagechange', render);
  window.addEventListener('hashchange', applyHash);
  applyHash();
})();
