(() => {
  if (!document.body.classList.contains('catalogue-home')) return;

  const header = document.querySelector('body > header');
  const links = Array.from(header?.querySelectorAll('.navbar-nav a') || []);
  const sections = links
    .filter(link => link.dataset.homeSection)
    .map(link => ({ link, section: document.getElementById(link.dataset.homeSection) }))
    .filter(item => item.section);

  if (!sections.length) return;

  let activeLink = null;
  let scheduled = false;

  function updateActiveSection() {
    scheduled = false;
    const headerHeight = header.getBoundingClientRect().height;
    // Select the section near the top of the readable area, below the sticky header.
    const readingLine = headerHeight + Math.min(120, Math.max(0, innerHeight - headerHeight) * 0.2);
    let current = sections[0];

    for (const item of sections) {
      if (item.section.getBoundingClientRect().top <= readingLine) current = item;
    }

    if (scrollY > 0 && scrollY + innerHeight >= document.documentElement.scrollHeight - 2) {
      current = sections[sections.length - 1];
    }

    if (current.link === activeLink) return;
    activeLink = current.link;
    for (const link of links) {
      const active = link === activeLink;
      link.classList.toggle('active', active);
      if (active) link.setAttribute('aria-current', 'location');
      else link.removeAttribute('aria-current');
    }
  }

  function scheduleUpdate() {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(updateActiveSection);
  }

  window.addEventListener('scroll', scheduleUpdate, { passive: true });
  window.addEventListener('resize', scheduleUpdate, { passive: true });
  window.addEventListener('hashchange', scheduleUpdate);
  window.addEventListener('pageshow', scheduleUpdate);
  window.addEventListener('load', scheduleUpdate);
  document.addEventListener('euroagri:languagechange', scheduleUpdate);

  if ('ResizeObserver' in window) {
    const observer = new ResizeObserver(scheduleUpdate);
    observer.observe(header);
    observer.observe(document.body);
    document.querySelectorAll('body > section').forEach(section => observer.observe(section));
  }
  if (document.fonts) document.fonts.ready.then(scheduleUpdate);
  scheduleUpdate();
})();
