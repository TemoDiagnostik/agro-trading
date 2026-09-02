(function () {
  'use strict';

  const form = document.getElementById('contactForm');
  const status = document.getElementById('rfqFormStatus');
  const languageInput = document.getElementById('rfqLanguage');
  const startedAt = document.getElementById('rfqStartedAt');
  const requestType = document.getElementById('rfqRequestType');
  const selectedContext = document.getElementById('rfqSelectedContext');
  const product = document.getElementById('rfqProduct');
  const grade = document.getElementById('rfqGrade');
  const packaging = document.getElementById('rfqPackaging');
  const technical = document.getElementById('rfqTechnical');

  if (!form || !status || !languageInput || !startedAt || !requestType || !selectedContext || !product) {
    return;
  }

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

    // Use the browser's normal form navigation so the Apps Script response is
    // visible and a success state is never inferred from an opaque no-cors request.
    form.submit();
  });
})();
