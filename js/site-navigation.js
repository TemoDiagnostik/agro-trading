(function () {
  'use strict';
  const groups = Array.from(document.querySelectorAll('header [data-nav-dropdown]'));
  if (!groups.length) return;

  function setOpen(group, open, focusTrigger = false) {
    const trigger = group.querySelector('.nav-dropdown-trigger');
    const panel = group.querySelector('.nav-dropdown-panel');
    trigger.setAttribute('aria-expanded', String(open));
    panel.hidden = !open;
    group.classList.toggle('is-open', open);
    if (focusTrigger) trigger.focus();
  }

  function closeAll(except) {
    groups.forEach(group => { if (group !== except) setOpen(group, false); });
  }

  groups.forEach(group => {
    const trigger = group.querySelector('.nav-dropdown-trigger');
    const panel = group.querySelector('.nav-dropdown-panel');
    // Without JavaScript the link still opens the overview page.
    trigger.setAttribute('role', 'button');
    trigger.addEventListener('click', event => {
      if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
      event.preventDefault();
      const open = trigger.getAttribute('aria-expanded') !== 'true';
      closeAll(group);
      setOpen(group, open);
    });
    trigger.addEventListener('keydown', event => {
      if (event.key !== ' ' && event.key !== 'ArrowDown') return;
      event.preventDefault();
      closeAll(group);
      setOpen(group, true);
      panel.querySelector('a')?.focus();
    });
    panel.addEventListener('click', event => {
      if (event.target.closest('a')) closeAll();
    });
    group.addEventListener('focusout', event => {
      if (event.relatedTarget && !group.contains(event.relatedTarget)) setOpen(group, false);
    });
  });

  document.addEventListener('click', event => {
    if (!event.target.closest('[data-nav-dropdown]')) closeAll();
  });
  document.addEventListener('keydown', event => {
    if (event.key !== 'Escape') return;
    const open = groups.find(group => group.classList.contains('is-open'));
    if (open) { event.preventDefault(); setOpen(open, false, true); }
  });
  window.addEventListener('pageshow', () => closeAll());
  window.addEventListener('hashchange', () => closeAll());
})();
