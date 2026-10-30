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
    if (open && window.matchMedia('(min-width: 1101px)').matches) {
      const container = group.closest('.container.nav');
      const bounds = container.getBoundingClientRect();
      const anchor = trigger.getBoundingClientRect();
      const rtl = getComputedStyle(trigger).direction === 'rtl';
      const desired = rtl ? anchor.right - bounds.left - panel.offsetWidth : anchor.left - bounds.left;
      const left = Math.max(0, Math.min(desired, bounds.width - panel.offsetWidth));
      panel.style.left = `${left}px`;
    } else {
      panel.style.removeProperty('left');
    }
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
  }, true);
  document.addEventListener('keydown', event => {
    if (event.key !== 'Escape') return;
    const open = groups.find(group => group.classList.contains('is-open'));
    if (open) {
      event.preventDefault();
      event.stopPropagation();
      setOpen(open, false, true);
    }
  }, true);
  window.addEventListener('pageshow', () => closeAll());
  window.addEventListener('hashchange', () => closeAll());
  window.addEventListener('resize', () => closeAll());
})();
