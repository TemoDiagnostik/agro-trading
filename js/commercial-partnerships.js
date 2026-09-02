(function () {
  'use strict';

  const form = document.getElementById('commercialPartnerForm');
  const startedAt = document.getElementById('cpStartedAt');
  const challengeInput = document.getElementById('cpChallenge');
  const challengeLabel = document.getElementById('cpChallengeLabel');
  const languageInput = document.getElementById('cpLanguage');
  const responseToken = document.getElementById('cpResponseToken');
  const status = document.getElementById('cpFormStatus');
  const professionalSummary = document.getElementById('cpProfessionalSummary');
  const summaryCounter = document.getElementById('cpSummaryCounter');

  if (!form || !startedAt || !challengeInput || !challengeLabel || !languageInput || !responseToken || !status) {
    return;
  }

  const firstNumber = Math.floor(Math.random() * 6) + 3;
  const secondNumber = Math.floor(Math.random() * 5) + 2;
  const expectedAnswer = firstNumber + secondNumber;
  const openedAt = Date.now();
  let confirmationTimer = 0;
  startedAt.value = String(openedAt);
  languageInput.value = document.documentElement.lang || 'en';

  function dictionaryValue(key, fallback) {
    return form.dataset[key] || fallback;
  }

  function updateChallengeLabel() {
    const language = document.documentElement.lang || 'en';
    const prompt = language === 'ar' ? 'فحص أمني' : 'Security check';
    challengeLabel.textContent = `${prompt}: ${firstNumber} + ${secondNumber} =`;
  }

  function updateSummaryCounter() {
    if (!professionalSummary || !summaryCounter) {
      return;
    }

    const minimum = Number(professionalSummary.minLength) || 40;
    const maximum = Number(professionalSummary.maxLength) || 1600;
    const current = professionalSummary.value.length;
    const remaining = Math.max(0, minimum - current);

    if (remaining > 0) {
      const template = dictionaryValue('summaryRemaining', '{count} more characters required.');
      summaryCounter.textContent = template.replace('{count}', String(remaining));
      summaryCounter.classList.remove('is-complete');
      return;
    }

    const template = dictionaryValue('summaryComplete', 'Minimum met · {current}/{maximum} characters.');
    summaryCounter.textContent = template
      .replace('{current}', String(current))
      .replace('{maximum}', maximum.toLocaleString(document.documentElement.lang || 'en'));
    summaryCounter.classList.add('is-complete');
  }

  function showStatus(type, message) {
    status.className = `cp-form-status is-${type}`;
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

    if (!result || result.type !== 'euro-agri-form-result' || result.formType !== 'commercial-partnership' || result.responseToken !== responseToken.value) {
      return;
    }

    if (result.ok !== true || !/^EAT-CP-[A-Z0-9-]+$/i.test(result.submission || '')) {
      finishWithError();
      return;
    }

    window.clearTimeout(confirmationTimer);
    const confirmationUrl = new URL('commercial-partnership-thankyou.html', location.href);
    confirmationUrl.searchParams.set('submission', result.submission);
    confirmationUrl.searchParams.set('lang', document.documentElement.lang || 'en');
    location.assign(confirmationUrl.href);
  });

  function setValidationMessage(field, key, fallback) {
    if (!field.validity.valid) {
      field.setCustomValidity(dictionaryValue(key, fallback));
    }
  }

  form.querySelectorAll('input, textarea').forEach(field => {
    field.addEventListener('input', () => {
      field.setCustomValidity('');
      if (field === professionalSummary) {
        updateSummaryCounter();
      }
    });
    field.addEventListener('change', () => field.setCustomValidity(''));
  });

  document.addEventListener('euroagri:languagechange', event => {
    const dictionary = event.detail && event.detail.dictionary;

    if (dictionary) {
      form.dataset.requiredMessage = dictionary['cp.form.validation.required'] || '';
      form.dataset.challengeMessage = dictionary['cp.form.validation.challenge'] || '';
      form.dataset.fastMessage = dictionary['cp.form.validation.fast'] || '';
      form.dataset.rateMessage = dictionary['cp.form.validation.rate'] || '';
      form.dataset.sendingMessage = dictionary['cp.form.sending'] || '';
      form.dataset.successMessage = dictionary['cp.form.success'] || '';
      form.dataset.errorMessage = dictionary['cp.form.error'] || '';
      form.dataset.summaryRemaining = dictionary['cp.form.summaryCounterRemaining'] || '';
      form.dataset.summaryComplete = dictionary['cp.form.summaryCounterComplete'] || '';
    }

    languageInput.value = document.documentElement.lang || 'en';
    updateChallengeLabel();
    updateSummaryCounter();
  });

  updateChallengeLabel();
  updateSummaryCounter();

  form.addEventListener('submit', event => {
    event.preventDefault();
    form.classList.add('was-validated');
    status.textContent = '';
    status.className = 'cp-form-status';

    const honeypot = form.elements.namedItem('Website Confirmation');
    if (honeypot && honeypot.value) {
      showStatus('error', dictionaryValue('errorMessage', 'The submission could not be completed. Please try again or contact info@euroagritrading.eu.'));
      return;
    }

    form.querySelectorAll('[required]').forEach(field => {
      setValidationMessage(field, 'requiredMessage', 'Please complete this required field.');
    });

    if (Number(challengeInput.value) !== expectedAnswer) {
      challengeInput.setCustomValidity(dictionaryValue('challengeMessage', 'Please enter the correct security-check answer.'));
    }

    if (!form.reportValidity()) {
      return;
    }

    if (Date.now() - openedAt < 6000) {
      showStatus('error', dictionaryValue('fastMessage', 'Please review the form before submitting.'));
      return;
    }

    setSubmitting(true);
    showStatus('sending', dictionaryValue('sendingMessage', 'Submitting your application securely…'));
    languageInput.value = document.documentElement.lang || 'en';
    responseToken.value = createResponseToken();

    window.clearTimeout(confirmationTimer);
    confirmationTimer = window.setTimeout(finishWithError, 30000);

    form.submit();
  });

})();
