(function () {
  'use strict';
  const routes = {
    'buyer-rfq': ['RFQ', 'buyer-rfq-thankyou.html'],
    'supplier-qualification': ['KYC', 'thankyou.html'],
    'commercial-partnership': ['CP', 'commercial-partnership-thankyou.html']
  };
  window.EuroAgriSubmitForm = async function (form) {
    const data = new FormData(form);
    const type = data.get('formType');
    const route = routes[type];
    if (!route) throw new Error('Unknown form');
    data.set('responseFormat', 'json');
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 90000);
    try {
      // A simple CORS POST preserves repeated fields without preflight or opaque responses.
      const response = await fetch(form.action, {
        method: 'POST', body: new URLSearchParams(data),
        mode: 'cors', credentials: 'omit', redirect: 'follow', signal: controller.signal
      });
      if (!response.ok || response.type === 'opaque') throw new Error('Unconfirmed response');
      const receipt = await response.json();
      const reference = new RegExp('^EAT-' + route[0] + '-[0-9]{8}-[0-9]{6}-[A-F0-9]{6}$');
      if (receipt.version !== 1 || receipt.accepted !== true || receipt.formType !== type ||
          typeof receipt.submissionId !== 'string' || !reference.test(receipt.submissionId)) {
        throw new Error('Submission not confirmed');
      }
      const destination = new URL(route[1], location.href);
      destination.searchParams.set('submission', receipt.submissionId);
      destination.searchParams.set('lang', data.get('Language') || document.documentElement.lang || 'en');
      location.assign(destination.href);
    } finally {
      clearTimeout(timeout);
    }
  };
})();
