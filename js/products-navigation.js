(function () {
  'use strict';
  const item = document.querySelector('.products-nav-item');
  const toggle = item?.querySelector('.products-nav-toggle');
  const menu = item?.querySelector('.products-nav-menu');
  if (!toggle || !menu) return;

  function setOpen(open, restoreFocus = false) {
    toggle.setAttribute('aria-expanded', String(open));
    menu.hidden = !open;
    if (restoreFocus) toggle.focus();
  }

  toggle.addEventListener('click', () => setOpen(menu.hidden));
  toggle.addEventListener('keydown', event => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setOpen(true);
      menu.querySelector('a').focus();
    }
  });
  item.addEventListener('keydown', event => {
    if (event.key === 'Escape' && !menu.hidden) {
      event.preventDefault();
      event.stopPropagation();
      setOpen(false, true);
    }
  });
  menu.addEventListener('click', event => {
    if (event.target.closest('a')) setOpen(false);
  });
  document.addEventListener('click', event => {
    if (!item.contains(event.target)) setOpen(false);
  });
  document.addEventListener('focusin', event => {
    if (!item.contains(event.target)) setOpen(false);
  });
  document.querySelector('.lang-btn')?.addEventListener('click', () => setOpen(false));
  // Reset the nested disclosure whenever the outer mobile menu closes.
  const navigation = item.closest('nav');
  new MutationObserver(() => {
    if (!navigation.classList.contains('is-open')) setOpen(false);
  }).observe(navigation, { attributes: true, attributeFilter: ['class'] });
  window.matchMedia('(min-width: 1101px)').addEventListener('change', () => setOpen(false));
})();
