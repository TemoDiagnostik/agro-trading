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
  const gradeOptions = document.getElementById('rfqGradeOptions');
  const prefilled = new Map();

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

  function updateGradeOptions() {
    if (!gradeOptions) return;
    gradeOptions.replaceChildren();
    const option = product.options[product.selectedIndex];
    (option?.dataset.grades || '').split('|').filter(Boolean).forEach(value => {
      const suggestion = document.createElement('option');
      suggestion.value = value;
      gradeOptions.append(suggestion);
    });
  }

  function chooseProduct(topic) {
    const normalize = value => String(value || '').normalize('NFKC').toLowerCase().trim();
    // Never use substring matching: urea phosphate and granular urea are different products.
    const matchingOption = Array.from(product.options).find(option =>
      option.value && normalize(option.value) === normalize(topic)
    );
    product.value = matchingOption ? matchingOption.value : '';
    updateGradeOptions();
  }

  function clearPrefilledDetails() {
    prefilled.forEach((value, field) => {
      if (field.value === value) field.value = '';
    });
    prefilled.clear();
    // A grade belongs to the selected product, even if the visitor edited it.
    if (grade) grade.value = '';
  }

  function fill(field, value) {
    if (field && value) {
      field.value = value.slice(0, field.maxLength > 0 ? field.maxLength : 1800);
      prefilled.set(field, field.value);
    }
  }

  function applyContext(context) {
    clearPrefilledDetails();
    selectedContext.value = String(context.topic || '').slice(0, 220);
    chooseProduct(context.category || context.topic);
    requestType.value = ['Product Specification Request', 'Shipment Documentation Request'].includes(context.request)
      ? context.request : 'Buyer Commercial RFQ';
    fill(grade, context.grade);
    fill(packaging, context.packaging);
    fill(technical, context.technical);
  }

  function applyQueryPrefill() {
    const params = new URLSearchParams(location.search);
    const topic = params.get('rfqProduct') || '';

    if (!topic && !params.get('rfqRequest')) {
      return;
    }

    applyContext({topic, category: params.get('rfqCategory'), request: params.get('rfqRequest'),
      grade: params.get('rfqGrade'), packaging: params.get('rfqPackaging'), technical: params.get('rfqTechnical')});
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
    clearPrefilledDetails();
    selectedContext.value = product.value;
    updateGradeOptions();
    const values = (product.options[product.selectedIndex]?.dataset.grades || '').split('|').filter(Boolean);
    if (values.length === 1) fill(grade, values[0]);
    // Do not restore an earlier product if the visitor later reloads this URL.
    const url = new URL(location.href);
    ['rfqProduct', 'rfqCategory', 'rfqGrade', 'rfqPackaging', 'rfqTechnical'].forEach(key => url.searchParams.delete(key));
    history.replaceState({}, '', url.pathname + url.search + url.hash);
  });

  requestType.addEventListener('change', () => {
    const url = new URL(location.href);
    if (url.searchParams.has('rfqRequest')) {
      url.searchParams.set('rfqRequest', requestType.value);
      history.replaceState({}, '', url.pathname + url.search + url.hash);
    }
  });

  document.addEventListener('click', event => {
    const button = event.target.closest('[data-rfq-topic]');

    if (!button) {
      return;
    }

    applyContext({topic: button.dataset.rfqTopic, category: button.dataset.rfqCategory,
      request: button.dataset.rfqRequest, grade: button.dataset.rfqGrade,
      packaging: button.dataset.rfqPacking, technical: button.dataset.rfqDocs});
  });

  document.addEventListener('euroagri:languagechange', event => {
    const dictionary = event.detail && event.detail.dictionary;
    updateDictionary(dictionary);
    languageInput.value = document.documentElement.lang || 'en';
  });

  updateDictionary(window.EuroAgriCurrentDictionary);
  applyQueryPrefill();
  applyConfirmedSubmission();

  form.addEventListener('submit', async event => {
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

    try {
      await window.EuroAgriSubmitForm(form);
    } catch (error) {
      setSubmitting(false);
      showStatus('error', dictionaryValue('errorMessage', 'Receipt could not be confirmed. Please contact info@euroagritrading.eu before submitting again.'));
    }
  });
})();
