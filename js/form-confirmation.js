(function () {
  'use strict';

  const routes = {
    'buyer-rfq': { page: 'buyer-rfq-thankyou.html', prefix: 'RFQ' },
    'supplier-qualification': { page: 'thankyou.html', prefix: 'KYC' },
    'commercial-partnership': { page: 'commercial-partnership-thankyou.html', prefix: 'CP' }
  };
  const messageType = 'euroagri:submission-confirmed';
  const trustedOrigins = new Set([location.origin, 'https://euroagritrading.eu', 'https://www.euroagritrading.eu']);
  const pending = new WeakMap();

  function validReference(reference, prefix) {
    return typeof reference === 'string' &&
      new RegExp(`^EAT-${prefix}-[0-9]{8}-[0-9]{6}-[A-F0-9]{6}$`).test(reference);
  }

  // The server redirects its response to one of these same-site receipt pages.
  // Notify the submitting page even when Google adds intermediate sandbox frames.
  const receipt = Object.entries(routes).find(([, route]) => location.pathname.endsWith('/' + route.page));
  const reference = new URLSearchParams(location.search).get('submission');
  if (receipt && window.top !== window && validReference(reference, receipt[1].prefix)) {
    const message = { type: messageType, formType: receipt[0], submission: reference };
    trustedOrigins.forEach(origin => window.top.postMessage(message, origin));
  }

  function belongsToFrame(source, frame) {
    // Window.parent is accessible across origins; document/location are not.
    try {
      for (let depth = 0; source && depth < 8; depth += 1) {
        if (source === frame.contentWindow) return true;
        if (source === source.parent) break;
        source = source.parent;
      }
    } catch (_) { /* Ignore unrelated or detached frames. */ }
    return false;
  }

  function submit(form, onUnconfirmed) {
    if (pending.has(form)) return;
    const formType = form.elements.namedItem('formType')?.value;
    const route = routes[formType];
    if (!route) throw new Error('Unknown submission form');

    const frame = document.createElement('iframe');
    frame.name = 'euroagri-submit-' + crypto.randomUUID();
    frame.title = 'Secure form submission';
    frame.hidden = true;
    frame.setAttribute('aria-hidden', 'true');
    const previousTarget = form.getAttribute('target');
    let timer;
    let confirmed = false;

    function cleanup() {
      clearTimeout(timer);
      window.removeEventListener('message', receive);
      window.removeEventListener('pageshow', restore);
      frame.remove();
      if (previousTarget === null) form.removeAttribute('target');
      else form.setAttribute('target', previousTarget);
      pending.delete(form);
    }

    function restore(event) {
      if (!event.persisted) return;
      cleanup();
      form.dispatchEvent(new Event('euroagri:submission-restored'));
    }

    function receive(event) {
      const data = event.data;
      if (confirmed || !trustedOrigins.has(event.origin) || !data || data.type !== messageType ||
          data.formType !== formType || !validReference(data.submission, route.prefix) ||
          !belongsToFrame(event.source, frame)) return;

      confirmed = true;
      clearTimeout(timer);
      const url = new URL(route.page, location.href);
      url.searchParams.set('submission', data.submission);
      url.searchParams.set('lang', form.elements.namedItem('Language')?.value || document.documentElement.lang || 'en');
      // Only a receipt from this submission can trigger the top-level success page.
      location.assign(url.href);
    }

    pending.set(form, frame);
    window.addEventListener('message', receive);
    window.addEventListener('pageshow', restore);
    document.body.append(frame);
    form.target = frame.name;
    // A load event, elapsed timer or opaque fetch response is NOT confirmation.
    // Keep listening after a slow response, and keep Send disabled to avoid duplicates.
    timer = window.setTimeout(onUnconfirmed, 60000);
    try {
      HTMLFormElement.prototype.submit.call(form);
    } catch (_) {
      cleanup();
      onUnconfirmed();
    }
  }

  window.EuroAgriSubmission = { submit };
})();
