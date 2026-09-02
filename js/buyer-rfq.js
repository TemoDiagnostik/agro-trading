(function () {
  'use strict';

  const form = document.getElementById('contactForm');
  const status = document.getElementById('rfqFormStatus');
  const languageInput = document.getElementById('rfqLanguage');
  const startedAt = document.getElementById('rfqStartedAt');
  const requestType = document.getElementById('rfqRequestType');
  const selectedContext = document.getElementById('rfqSelectedContext');
  const responseToken = document.getElementById('rfqResponseToken');
  const product = document.getElementById('rfqProduct');
  const grade = document.getElementById('rfqGrade');
  const packaging = document.getElementById('rfqPackaging');
  const technical = document.getElementById('rfqTechnical');

  if (!form || !status || !languageInput || !startedAt || !requestType || !selectedContext || !responseToken || !product) {
    return;
  }

  let confirmationTimer = 0;

  startedAt.value = String(Date.now());
  languageInput.value = document.documentElement.lang || 'en';

  function dictionaryValue(key, fallback) {
    return form.dataset[key] || fallback;
  }

  function updateDictionary(dictionary) {
    if (!dictionary) {
      return;
    }

    form.dataset.requiredMessage = dictionary['rfq.validation.required'] || '';
    form.dataset.sendingMessage = dictionary['rfq.sending'] || '';
    form.dataset.successMessage = dictionary['rfq.success'] || '';
    form.dataset.errorMessage = dictionary['rfq.error'] || '';
  }

  function showStatus(type, message) {
    status.className = `buyer-rfq-status is-${type}`;
    status.textContent = message;
  }

  function setSubmitting(isSubmitting) {
    const button = form.querySelector('button[type="submit"]');
    button.disabled = isSubmitting;
    button.setAttribute('aria-busy', String(isSubmitting));
  }

  function createResponseToken() {
    if (window.crypto && typeof window.crypto.randomUUID === 'function') {
      return window.crypto.randomUUID();
    }

    const values = new Uint32Array(4);
    window.crypto.getRandomValues(values);
    return Array.from(values, value => value.toString(16).padStart(8, '0')).join('-');
  }

  function isAppsScriptOrigin(origin) {
    if (origin === 'null' || origin === 'https://script.google.com') {
      return true;
    }

    try {
      const hostname = new URL(origin).hostname;
      return hostname === 'script.googleusercontent.com' || hostname.endsWith('-script.googleusercontent.com');
    } catch (error) {
      return false;
    }
  }

  function parseSubmissionMessage(value) {
    if (typeof value === 'string') {
      try {
        return JSON.parse(value);
      } catch (error) {
        return null;
      }
    }

    return value && typeof value === 'object' ? value : null;
  }

  function finishWithError() {
    window.clearTimeout(confirmationTimer);
    setSubmitting(false);
    showStatus('error', dictionaryValue('errorMessage', 'The submission was not confirmed. Please try again or contact info@euroagritrading.eu.'));
  }

  window.addEventListener('message', event => {
    if (!isAppsScriptOrigin(event.origin)) {
      return;
    }

    const result = parseSubmissionMessage(event.data);

    if (!result || result.type !== 'euro-agri-form-result' || result.formType !== 'buyer-rfq' || result.responseToken !== responseToken.value) {
      return;
    }

    if (result.ok !== true || !/^EAT-RFQ-[A-Z0-9-]+$/i.test(result.submission || '')) {
      finishWithError();
      return;
    }

    window.clearTimeout(confirmationTimer);
    const confirmationUrl = new URL('buyer-rfq-thankyou.html', location.href);
    confirmationUrl.searchParams.set('submission', result.submission);
    confirmationUrl.searchParams.set('lang', document.documentElement.lang || 'en');
    location.assign(confirmationUrl.href);
  });

  function setRequiredMessages() {
    form.querySelectorAll('[required]').forEach(field => {
      field.setCustomValidity('');

      if (field.validity.valueMissing) {
        field.setCustomValidity(dictionaryValue('requiredMessage', 'Please complete this required field.'));
      }
    });
  }

  function chooseProduct(topic) {
    const exactOption = Array.from(product.options).find(option => option.value === topic);

    if (exactOption) {
      product.value = exactOption.value;
      return;
    }

    const normalizedTopic = String(topic || '').toLowerCase();
    const matchingOption = Array.from(product.options).find(option => {
      const normalizedValue = option.value.toLowerCase();
      return normalizedValue && (
        normalizedTopic.includes(normalizedValue) ||
        normalizedValue.includes(normalizedTopic)
      );
    });

    if (matchingOption) {
      product.value = matchingOption.value;
    }
  }

  function applyQueryPrefill() {
    const params = new URLSearchParams(location.search);
    const topic = params.get('rfqProduct') || '';

    if (!topic) {
      return;
    }

    selectedContext.value = topic;
    chooseProduct(params.get('rfqCategory') || topic);
    requestType.value = params.get('rfqRequest') || 'Buyer Commercial RFQ';

    if (grade && params.get('rfqGrade')) {
      grade.value = params.get('rfqGrade');
    }

    if (packaging && params.get('rfqPackaging')) {
      packaging.value = params.get('rfqPackaging');
    }

    if (technical && params.get('rfqTechnical')) {
      technical.value = params.get('rfqTechnical');
    }
  }

  function applyConfirmedSubmission() {
    const params = new URLSearchParams(location.search);
    const submissionId = params.get('submission') || '';

    if (params.get('rfq') !== 'received' || !/^EAT-RFQ-[A-Z0-9-]+$/i.test(submissionId)) {
      return;
    }

    const confirmationUrl = new URL('buyer-rfq-thankyou.html', location.href);
    confirmationUrl.searchParams.set('submission', submissionId);
    confirmationUrl.searchParams.set('lang', params.get('lang') || document.documentElement.lang || 'en');
    location.replace(confirmationUrl.href);
  }

  form.querySelectorAll('input, select, textarea').forEach(field => {
    field.addEventListener('input', () => field.setCustomValidity(''));
    field.addEventListener('change', () => field.setCustomValidity(''));
  });

  product.addEventListener('change', () => {
    selectedContext.value = product.value;
  });

  document.addEventListener('click', event => {
    const button = event.target.closest('[data-rfq-topic]');

    if (!button) {
      return;
    }

    const topic = button.dataset.rfqTopic || '';
    selectedContext.value = topic;
    chooseProduct(button.dataset.rfqCategory || topic);

    if (grade && button.dataset.rfqGrade) {
      grade.value = button.dataset.rfqGrade;
    }

    if (packaging && button.dataset.rfqPacking) {
      packaging.value = button.dataset.rfqPacking;
    }

    if (technical && button.dataset.rfqDocs) {
      technical.value = button.dataset.rfqDocs;
    }

    requestType.value = button.dataset.rfqRequest || 'Buyer Commercial RFQ';
  });

  document.addEventListener('euroagri:languagechange', event => {
    const dictionary = event.detail && event.detail.dictionary;
    updateDictionary(dictionary);
    languageInput.value = document.documentElement.lang || 'en';
  });

  updateDictionary(window.EuroAgriCurrentDictionary);
  applyQueryPrefill();
  applyConfirmedSubmission();

  form.addEventListener('submit', event => {
    event.preventDefault();
    form.classList.add('was-validated');
    status.textContent = '';
    status.className = 'buyer-rfq-status';

    const honeypot = form.elements.namedItem('Website Confirmation');

    if (honeypot && honeypot.value) {
      showStatus('error', dictionaryValue('errorMessage', 'The submission could not be completed. Please try again or contact info@euroagritrading.eu.'));
      return;
    }

    setRequiredMessages();

    if (!form.reportValidity()) {
      return;
    }

    setSubmitting(true);
    showStatus('sending', dictionaryValue('sendingMessage', 'Submitting your RFQ securely…'));
    languageInput.value = document.documentElement.lang || 'en';
    responseToken.value = createResponseToken();

    window.clearTimeout(confirmationTimer);
    confirmationTimer = window.setTimeout(finishWithError, 30000);

    // The response is loaded in a hidden frame. Apps Script confirms the saved
    // row and returns the reference through a token-bound postMessage response.
    form.submit();
  });
})();
